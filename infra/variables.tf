variable "project_id" {
  description = "Proyecto donde viven el servicio Cloud Run y el balanceador."
  type        = string
  default     = "forus-cl-planificacion"
}

variable "region" {
  description = "Región del servicio Cloud Run y del balanceador interno regional."
  type        = string
  default     = "us-east4"
}

variable "cloud_run_service" {
  description = "Nombre del servicio Cloud Run (debe existir; lo actualiza el pipeline de la app)."
  type        = string
  default     = "plataforma-planificacion-financiera"
}

variable "servicios_adicionales" {
  description = "Otros servicios Cloud Run publicados por el mismo LB, cada uno con su hostname. La clave es el prefijo de sus recursos y el nombre de su path matcher."
  type = map(object({
    cloud_run_service = string
    hostname          = string
  }))
  default = {
    flujo-inventario = {
      cloud_run_service = "plan-flujo-financiero"
      hostname          = "flujo-inventario.prod.priv.forus-sistemas.com"
    }
  }
}

variable "name_prefix" {
  description = "Prefijo de nombre para los recursos del balanceador."
  type        = string
  default     = "planificacion-financiera"
}

# --- Shared VPC ---------------------------------------------------------------
# forus-cl-planificacion es proyecto de servicio de forus-vpc-host-prod. La VPC
# prod-shared-vpc está peerada con el hub (forus-vpc-host-hub), donde terminan
# las VPN a on-premises; los routers del hub anuncian 10.140.0.0/16 por BGP.

variable "host_project_id" {
  description = "Proyecto host de la Shared VPC."
  type        = string
  default     = "forus-vpc-host-prod"
}

variable "host_network" {
  description = "VPC compartida donde se publica la IP interna del balanceador."
  type        = string
  default     = "prod-shared-vpc"
}

variable "host_subnetwork" {
  description = "Subnet (no proxy-only) de la región donde se reserva la IP interna."
  type        = string
  default     = "prod-useast4"
}

variable "ip_address" {
  description = "IP interna fija dentro de host_subnetwork. null = asignación automática."
  type        = string
  default     = null
}

variable "enable_http_redirect" {
  description = "Publica también el puerto 80 con redirección a HTTPS en la misma IP."
  type        = bool
  default     = true
}

# --- DNS y certificado --------------------------------------------------------
# Patrón existente en Forus: zona privada para resolver la IP interna (visible
# desde hub/prod/test y, vía inbound forwarding del hub, desde on-premises) y
# zona pública homónima solo para validar certificados.

variable "hostname" {
  description = "FQDN con que se accede al portal desde on-premises (sin punto final)."
  type        = string
  default     = "planificacion-financiera.prod.priv.forus-sistemas.com"
}

variable "dns_domain" {
  description = "Dominio de las zonas DNS donde se crean los registros (sin punto final)."
  type        = string
  default     = "prod.priv.forus-sistemas.com"
}

variable "manage_dns_records" {
  description = "Crea los registros DNS (A privado y CNAME de validación). false = los crea redes a mano con los outputs."
  type        = bool
  default     = true
}

variable "dns_project_id" {
  description = "Proyecto que aloja las zonas DNS."
  type        = string
  default     = "forus-vpc-host-prod"
}

variable "private_dns_zone" {
  description = "Zona privada donde va el registro A hacia la IP interna."
  type        = string
  default     = "priv-prod-priv-forus-sistemas"
}

variable "public_dns_zone" {
  description = "Zona pública donde va el CNAME de autorización del certificado administrado."
  type        = string
  default     = "pub-prod-priv-forus-sistemas"
}
