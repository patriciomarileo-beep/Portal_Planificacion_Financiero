# =============================================================================
# Balanceador de aplicaciones INTERNO regional (INTERNAL_MANAGED) delante del
# servicio Cloud Run, para acceso desde on-premises vía las VPN del hub.
#
#   on-prem --VPN--> hub (forus-vpc-host-hub) --peering--> prod-shared-vpc
#     --> forwarding rule 443 (IP interna, global access) --> HTTPS proxy
#     --> URL map --> backend service --> serverless NEG --> Cloud Run
#
# Este stack NO gestiona el servicio Cloud Run (imagen, env, IAP, ingress): eso
# sigue siendo estado del servicio y la imagen la actualiza el pipeline.
# =============================================================================

locals {
  host_network    = "projects/${var.host_project_id}/global/networks/${var.host_network}"
  host_subnetwork = "projects/${var.host_project_id}/regions/${var.region}/subnetworks/${var.host_subnetwork}"
}

data "google_cloud_run_v2_service" "app" {
  name     = var.cloud_run_service
  location = var.region
}

# Advertencia (no bloquea): mientras el ingress siga en "all", el servicio
# sigue alcanzable por su URL run.app desde internet. Ver docs/lb-interno.md.
check "cloud_run_solo_trafico_interno" {
  assert {
    condition     = data.google_cloud_run_v2_service.app.ingress == "INGRESS_TRAFFIC_INTERNAL_ONLY"
    error_message = "El servicio ${var.cloud_run_service} tiene ingress ${data.google_cloud_run_v2_service.app.ingress}. Tras validar el LB interno, cámbialo a 'internal' (docs/lb-interno.md, paso de corte)."
  }
}

# --- Backend ------------------------------------------------------------------

resource "google_compute_region_network_endpoint_group" "app" {
  name                  = "${var.name_prefix}-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = data.google_cloud_run_v2_service.app.name
  }
}

resource "google_compute_region_backend_service" "app" {
  name                  = "${var.name_prefix}-backend"
  region                = var.region
  load_balancing_scheme = "INTERNAL_MANAGED"
  protocol              = "HTTP"

  backend {
    group           = google_compute_region_network_endpoint_group.app.id
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

resource "google_compute_region_url_map" "https" {
  name            = "${var.name_prefix}-https"
  region          = var.region
  default_service = google_compute_region_backend_service.app.id
}

# --- TLS ----------------------------------------------------------------------
# Certificado administrado por Google (Certificate Manager, regional) validado
# por DNS: se renueva solo, sin certbot ni subir llaves.

resource "google_certificate_manager_dns_authorization" "app" {
  name     = "${var.name_prefix}-dnsauth"
  location = var.region
  domain   = var.hostname
  type     = "PER_PROJECT_RECORD"
}

resource "google_certificate_manager_certificate" "app" {
  name     = "${var.name_prefix}-cert"
  location = var.region

  managed {
    domains            = [var.hostname]
    dns_authorizations = [google_certificate_manager_dns_authorization.app.id]
  }

  lifecycle {
    precondition {
      condition     = endswith(var.hostname, ".${var.dns_domain}")
      error_message = "hostname (${var.hostname}) debe pertenecer al dominio ${var.dns_domain}."
    }
  }
}

resource "google_compute_region_ssl_policy" "app" {
  name            = "${var.name_prefix}-tls12"
  region          = var.region
  profile         = "MODERN"
  min_tls_version = "TLS_1_2"
}

resource "google_compute_region_target_https_proxy" "app" {
  name                             = "${var.name_prefix}-https"
  region                           = var.region
  url_map                          = google_compute_region_url_map.https.id
  certificate_manager_certificates = [google_certificate_manager_certificate.app.id]
  ssl_policy                       = google_compute_region_ssl_policy.app.id
}

# --- Frontend (IP interna en la Shared VPC) -----------------------------------

resource "google_compute_address" "vip" {
  name         = "${var.name_prefix}-ilb-vip"
  region       = var.region
  subnetwork   = local.host_subnetwork
  address_type = "INTERNAL"
  address      = var.ip_address
  # 443 y 80 comparten la IP solo si la dirección es SHARED_LOADBALANCER_VIP.
  purpose = var.enable_http_redirect ? "SHARED_LOADBALANCER_VIP" : "GCE_ENDPOINT"
}

resource "google_compute_forwarding_rule" "https" {
  name                  = "${var.name_prefix}-https"
  region                = var.region
  load_balancing_scheme = "INTERNAL_MANAGED"
  ip_protocol           = "TCP"
  port_range            = "443"
  ip_address            = google_compute_address.vip.id
  target                = google_compute_region_target_https_proxy.app.id
  network               = local.host_network
  subnetwork            = local.host_subnetwork

  # La VPN de Chile (forus-cl) termina en southamerica-west1 y el LB está en
  # us-east4: sin global access los clientes de otra región no llegan a la IP.
  allow_global_access = true
}

# --- Redirección HTTP -> HTTPS (opcional) -------------------------------------

resource "google_compute_region_url_map" "http_redirect" {
  count  = var.enable_http_redirect ? 1 : 0
  name   = "${var.name_prefix}-http-redirect"
  region = var.region

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_region_target_http_proxy" "http_redirect" {
  count   = var.enable_http_redirect ? 1 : 0
  name    = "${var.name_prefix}-http-redirect"
  region  = var.region
  url_map = google_compute_region_url_map.http_redirect[0].id
}

resource "google_compute_forwarding_rule" "http_redirect" {
  count                 = var.enable_http_redirect ? 1 : 0
  name                  = "${var.name_prefix}-http-redirect"
  region                = var.region
  load_balancing_scheme = "INTERNAL_MANAGED"
  ip_protocol           = "TCP"
  port_range            = "80"
  ip_address            = google_compute_address.vip.id
  target                = google_compute_region_target_http_proxy.http_redirect[0].id
  network               = local.host_network
  subnetwork            = local.host_subnetwork
  allow_global_access   = true
}
