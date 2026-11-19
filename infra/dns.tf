# Registros en las zonas del proyecto host (gestionadas por infra-gcp/network).
# google_dns_record_set no es autoritativo sobre la zona: solo administra estos
# dos registros. Con manage_dns_records = false, redes los crea con los outputs.

locals {
  dns_auth_record = google_certificate_manager_dns_authorization.app.dns_resource_record[0]
}

# CNAME _acme-challenge... -> ...authorize.certificatemanager.goog en la zona
# PÚBLICA: Google valida el dominio por DNS público para emitir el certificado.
resource "google_dns_record_set" "cert_authorization" {
  count        = var.manage_dns_records ? 1 : 0
  project      = var.dns_project_id
  managed_zone = var.public_dns_zone
  name         = local.dns_auth_record.name
  type         = local.dns_auth_record.type
  ttl          = 300
  rrdatas      = [local.dns_auth_record.data]
}

# A <hostname> -> IP interna del LB en la zona PRIVADA (hub/prod/test y on-prem
# vía la política de inbound forwarding del hub).
resource "google_dns_record_set" "app" {
  count        = var.manage_dns_records ? 1 : 0
  project      = var.dns_project_id
  managed_zone = var.private_dns_zone
  name         = "${var.hostname}."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_address.vip.address]
}
