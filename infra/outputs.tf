output "url" {
  description = "Origen HTTPS del portal. Usar como APP_ORIGIN y como origen autorizado del cliente OAuth."
  value       = "https://${var.hostname}"
}

output "ip_address" {
  description = "IP interna del balanceador (registro A del hostname)."
  value       = google_compute_address.vip.address
}

output "dns_authorization_record" {
  description = "Registro que debe existir en la zona pública para emitir el certificado."
  value = {
    name = local.dns_auth_record.name
    type = local.dns_auth_record.type
    data = local.dns_auth_record.data
  }
}

output "certificate" {
  description = "Certificado administrado (revisar estado con gcloud certificate-manager certificates describe)."
  value       = google_certificate_manager_certificate.app.id
}
