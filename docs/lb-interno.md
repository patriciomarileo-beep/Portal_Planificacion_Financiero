# Acceso desde on-premises por LB interno

El portal se publica solo en la red interna. Los usuarios entran desde on-premises por las VPN del hub con `https://planificacion-financiera.prod.priv.forus-sistemas.com`.

```
on-prem ──VPN──> hub (forus-vpc-host-hub) ──peering──> prod-shared-vpc (forus-vpc-host-prod)
   └─> IP interna :443 (us-east4, global access) ─> HTTPS proxy (cert. administrado)
         ─> backend ─> serverless NEG ─> Cloud Run plataforma-planificacion-financiera (ingress internal, IAP)
```

Lo que ya existía y no hay que crear:

- `forus-cl-planificacion` es proyecto de servicio de `forus-vpc-host-prod`. La VPC `prod-shared-vpc` ya tiene la subnet `prod-useast4` (10.140.0.0/24) y la proxy-only `prod-useast4-proxyonly`.
- El peering `production-hub` exporta e importa rutas. Los Cloud Router de las VPN (Chile, Perú, Colombia, Uruguay) anuncian `10.140.0.0/16` a on-premises.
- Las zonas `prod.priv.forus-sistemas.com` están en `forus-vpc-host-prod`. La privada es visible desde el hub y on-premises la consulta por el inbound forwarding del hub (10.141.1.5). La pública es la misma zona, pero solo sirve para validar certificados.

La VPN de Chile termina en `southamerica-west1` y el LB está en `us-east4`. Por eso la forwarding rule tiene global access.

## Responsabilidades

| Qué | Quién lo gestiona |
|---|---|
| Imagen del servicio | Pipeline (`build` + `deploy`, plantilla `ci-templates`) |
| LB, IP, certificado y DNS | Pipeline (`infra-plan` / `infra-apply`, Terraform en `infra/`) |
| Ingress, env, IAP, SA y secreto del servicio | Estado del servicio. Se configura una vez (pasos 4 y 6). |

## 1. Setup único de GCP

Una persona con permisos de IAM en `forus-cl-planificacion` y `forus-vpc-host-prod` ejecuta lo siguiente antes de mergear el MR, porque `infra-plan` ya necesita la SA:

```bash
./infra/bootstrap.sh
```

El script habilita Certificate Manager y crea la SA `planificacion-financiera-infra`. Le da permisos solo sobre la subnet `prod-useast4` y las dos zonas DNS, y permite que solo este repo la impersone por WIF.

## 2. Crear el LB

Al mergear a `main` corre `infra-plan`. Revisa el plan y ejecuta el job manual `infra-apply`. El estado queda en *Operate > Terraform states* (`lb-interno-production`).

El certificado tarda unos minutos en emitirse:

```bash
gcloud certificate-manager certificates describe planificacion-financiera-cert \
  --location us-east4 --project forus-cl-planificacion --format="value(managed.state)"   # ACTIVE
```

## 3. Requisitos en on-premises (redes)

- El DNS corporativo debe reenviar `prod.priv.forus-sistemas.com` a `10.141.1.5`. Probablemente ya lo hace, porque otros servicios usan esa zona. Para comprobarlo: `nslookup planificacion-financiera.prod.priv.forus-sistemas.com` debe devolver la IP del output `ip_address`.
- Los Fortinet deben permitir el tráfico hacia esa IP en los puertos 443 y 80.

## 4. Configurar el servicio para el nuevo origen

`APP_ORIGIN` valida el origen de los POST y debe coincidir con la URL nueva. Cambiarlo deja de funcionar el login por la URL `run.app`, así que hazlo en la ventana de corte:

```bash
gcloud run services update plataforma-planificacion-financiera \
  --region us-east4 --project forus-cl-planificacion \
  --update-env-vars APP_ORIGIN=https://planificacion-financiera.prod.priv.forus-sistemas.com
```

Usa `--update-env-vars`. `--set-env-vars` borra las demás variables.

En *APIs y servicios > Credenciales*, agrega `https://planificacion-financiera.prod.priv.forus-sistemas.com` a los orígenes JavaScript autorizados del cliente OAuth de `GOOGLE_OAUTH_CLIENT_ID`.

IAP sigue activo directamente en Cloud Run y protege también el tráfico que entra por el LB. No actives IAP en el backend del LB, porque GCP no permite tenerlo en ambos lugares.

## 5. Probar desde on-premises

1. `nslookup` resuelve a la IP interna.
2. `curl -I http://planificacion-financiera.prod.priv.forus-sistemas.com` responde con un 301 a https.
3. En el navegador, IAP pide la cuenta `forus.cl`, después aparece el login del portal y finalmente un guardado (POST) funciona. Esta prueba del flujo de IAP con el dominio propio detrás del LB interno es obligatoria.

## 6. Corte: cerrar el acceso público

```bash
gcloud run services update plataforma-planificacion-financiera \
  --region us-east4 --project forus-cl-planificacion --ingress internal
```

- Desde internet, la URL `run.app` debe responder 404.
- En `.gitlab-ci.yml`, cambia `PRIVATE_INGRESS_ENFORCED` a `"true"`. A partir de ahí, el job `verify-private-access` hace fallar `main` si el servicio vuelve a quedar expuesto o sin IAP.

## 7. Otro servicio por el mismo LB

El LB publica más de un servicio en la misma IP, cada uno con su hostname. Se agregan en `servicios_adicionales` (`infra/variables.tf`): la clave es el prefijo de sus recursos. Por cada uno se crean un NEG serverless, un backend, una regla por host en el URL map, su certificado administrado y sus registros DNS. El servicio de Cloud Run tiene que existir antes del `infra-plan`. La regla de Redes no cambia, porque la IP es la misma.

Hoy: `flujo-inventario` publica `plan-flujo-financiero` en `https://flujo-inventario.prod.priv.forus-sistemas.com`.

## Reversa

```bash
gcloud run services update plataforma-planificacion-financiera --region us-east4 \
  --project forus-cl-planificacion --ingress all \
  --update-env-vars APP_ORIGIN=https://plataforma-planificacion-financiera-276495805166.us-east4.run.app
```

El LB puede quedar creado, porque no afecta el acceso por `run.app`.
