data "google_cloud_run_v2_service" "adicional" {
  for_each = var.servicios_adicionales
  name     = each.value.cloud_run_service
  location = var.region
}

check "servicios_adicionales_solo_trafico_interno" {
  assert {
    condition     = alltrue([for s in data.google_cloud_run_v2_service.adicional : s.ingress == "INGRESS_TRAFFIC_INTERNAL_ONLY"])
    error_message = "Hay servicios adicionales con ingress distinto de 'internal'. Tras validar el LB interno, cambiarlos a 'internal' (docs/lb-interno.md, paso de corte)."
  }
}

resource "google_compute_region_network_endpoint_group" "adicional" {
  for_each              = var.servicios_adicionales
  name                  = "${each.key}-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = data.google_cloud_run_v2_service.adicional[each.key].name
  }
}

resource "google_compute_region_backend_service" "adicional" {
  for_each              = var.servicios_adicionales
  name                  = "${each.key}-backend"
  region                = var.region
  load_balancing_scheme = "INTERNAL_MANAGED"
  protocol              = "HTTP"

  backend {
    group           = google_compute_region_network_endpoint_group.adicional[each.key].id
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

resource "google_certificate_manager_dns_authorization" "adicional" {
  for_each = var.servicios_adicionales
  name     = "${each.key}-dnsauth"
  location = var.region
  domain   = each.value.hostname
  type     = "PER_PROJECT_RECORD"
}

resource "google_certificate_manager_certificate" "adicional" {
  for_each = var.servicios_adicionales
  name     = "${each.key}-cert"
  location = var.region

  managed {
    domains            = [each.value.hostname]
    dns_authorizations = [google_certificate_manager_dns_authorization.adicional[each.key].id]
  }

  lifecycle {
    precondition {
      condition     = endswith(each.value.hostname, ".${var.dns_domain}")
      error_message = "hostname (${each.value.hostname}) debe pertenecer al dominio ${var.dns_domain}."
    }
  }
}

resource "google_dns_record_set" "cert_authorization_adicional" {
  for_each     = var.manage_dns_records ? var.servicios_adicionales : {}
  project      = var.dns_project_id
  managed_zone = var.public_dns_zone
  name         = google_certificate_manager_dns_authorization.adicional[each.key].dns_resource_record[0].name
  type         = google_certificate_manager_dns_authorization.adicional[each.key].dns_resource_record[0].type
  ttl          = 300
  rrdatas      = [google_certificate_manager_dns_authorization.adicional[each.key].dns_resource_record[0].data]
}

resource "google_dns_record_set" "app_adicional" {
  for_each     = var.manage_dns_records ? var.servicios_adicionales : {}
  project      = var.dns_project_id
  managed_zone = var.private_dns_zone
  name         = "${each.value.hostname}."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_address.vip.address]
}
