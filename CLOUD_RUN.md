# Despliegue en Cloud Run

Este proyecto puede ejecutarse en Cloud Run como una app Next.js standalone.

## Build local

```bash
npm ci
npm run build:cloudrun
```

## Deploy sin Docker local

No necesitas tener Docker instalado en esta maquina. El comando siguiente usa
`gcloud run deploy --source .` para que Cloud Build construya la imagen en
Google Cloud usando el `Dockerfile` del proyecto.

Crea un archivo `.env.cloudrun` con tus valores reales, usando
`cloudrun.env.example` como referencia, y ejecuta:

```bash
npm run deploy:cloudrun
```

Si es primera vez usando la carpeta local de configuracion de gcloud:

```bash
set CLOUDSDK_CONFIG=%CD%\.gcloud
gcloud auth login
gcloud auth application-default login
```

## Imagen Docker local opcional

```bash
docker build -t rentabilidad-tiendas-2027 .
docker run --rm -p 8080:8080 --env-file cloudrun.env.example rentabilidad-tiendas-2027
```

## Deploy manual

Reemplaza `PROJECT_ID`, `REGION` y el service account por los valores reales:

```bash
gcloud run deploy rentabilidad-tiendas-2027 \
  --source . \
  --project PROJECT_ID \
  --region REGION \
  --allow-unauthenticated \
  --service-account SERVICE_ACCOUNT_EMAIL \
  --set-env-vars BIGQUERY_AUTH_MODE=adc,BIGQUERY_PROJECT_ID=forus-cl-planificacion,BIGQUERY_TABLE=forus-cl-planificacion.Planificacion.ft_cl_planificacion_TB_STG_CL_TALANA_PERSONA,GOOGLE_OAUTH_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID \
  --set-secrets AUTH_SESSION_SECRET=AUTH_SESSION_SECRET:latest
```

La cuenta de servicio de Cloud Run debe tener permisos para consultar BigQuery, por ejemplo `BigQuery Job User` en el proyecto y acceso de lectura/escritura sobre la tabla según las rutas que uses.
