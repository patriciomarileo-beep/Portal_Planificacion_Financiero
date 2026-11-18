terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }

  # Estado gestionado por GitLab (Terraform state del proyecto). La dirección y
  # las credenciales llegan por variables TF_HTTP_* desde el pipeline.
  backend "http" {}
}

provider "google" {
  project = var.project_id
  region  = var.region

  default_labels = {
    app        = "plataforma-planificacion-financiera"
    managed-by = "terraform"
  }
}
