#!/usr/bin/env bash
# =============================================================================
# Setup ÚNICO para que el pipeline aplique infra/ (LB interno). Lo ejecuta una
# persona con permisos de IAM en forus-cl-planificacion y forus-vpc-host-prod
# (equipo DevOps/redes). Es idempotente: se puede volver a correr.
#
# Usa una SA dedicada en vez de gitlab-deployer: gitlab-deployer lo puede
# impersonar cualquier repo del grupo planificacion-comercial, y esta SA
# necesita permisos sobre la red compartida y el DNS.
# =============================================================================
set -euo pipefail

PROJECT="forus-cl-planificacion"
HOST_PROJECT="forus-vpc-host-prod"
REGION="us-east4"
SUBNET="prod-useast4"
PUBLIC_ZONE="pub-prod-priv-forus-sistemas"
PRIVATE_ZONE="priv-prod-priv-forus-sistemas"
SA_NAME="planificacion-financiera-infra"
SA="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
WIF_POOL="projects/399232061720/locations/global/workloadIdentityPools/gitlab-ci-cd"
GITLAB_PROJECT_PATH="forus-corp/planificacion-comercial/plataforma_planificacion_financiera"

echo "1. API de Certificate Manager"
gcloud services enable certificatemanager.googleapis.com --project "$PROJECT"

echo "2. Service account del pipeline de infra"
gcloud iam service-accounts describe "$SA" --project "$PROJECT" >/dev/null 2>&1 ||
  gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT" \
    --display-name="Terraform LB interno plataforma_planificacion_financiera (GitLab CI)"

echo "3. Roles en ${PROJECT}"
#   compute.loadBalancerAdmin          : NEG, backend, URL map, proxies, SSL policy, IP y forwarding rules
#   certificatemanager.editor          : autorización DNS y certificado administrado
#   run.viewer                         : leer el servicio Cloud Run (data source y NEG)
#   serviceusage.serviceUsageConsumer  : imprescindible con WIF/impersonación
for ROLE in \
  roles/compute.loadBalancerAdmin \
  roles/certificatemanager.editor \
  roles/run.viewer \
  roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT" --condition=None \
    --member="serviceAccount:${SA}" --role="$ROLE" >/dev/null
done

echo "4. Uso de la subnet compartida ${SUBNET} (solo esa subnet)"
gcloud compute networks subnets add-iam-policy-binding "$SUBNET" \
  --region "$REGION" --project "$HOST_PROJECT" \
  --member="serviceAccount:${SA}" --role="roles/compute.networkUser" >/dev/null

echo "5. Registros DNS (solo en las dos zonas de prod.priv.forus-sistemas.com)"
for ZONE in "$PUBLIC_ZONE" "$PRIVATE_ZONE"; do
  gcloud dns managed-zones add-iam-policy-binding "$ZONE" --project "$HOST_PROJECT" \
    --member="serviceAccount:${SA}" --role="roles/dns.admin" >/dev/null
done

echo "6. Workload Identity: solo este repo de GitLab puede impersonar la SA"
gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROJECT" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_POOL}/attribute.project_path/${GITLAB_PROJECT_PATH}" >/dev/null

echo "Listo. SA: ${SA}"
