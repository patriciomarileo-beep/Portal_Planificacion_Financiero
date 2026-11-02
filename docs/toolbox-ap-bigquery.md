# Toolbox AP - configuración BigQuery

El endpoint `POST /api/ingesta-bigquery` exige una sesión válida del Portal Financiero y valida el payload con Zod antes de ejecutar un Streaming Insert.

Variables de entorno:

- `PROJECT_ID`: proyecto de Google Cloud.
- `DATASET_ID`: dataset de destino.
- `TABLE_ID`: tabla de captura.
- `GOOGLE_APPLICATION_CREDENTIALS`: ruta local a la credencial ADC, solo para desarrollo. En Cloud Run se usa la Service Account asociada al servicio.

Esquema mínimo sugerido:

- `jerarquia` STRING
- `canal` STRING
- `periodo` STRING
- `valorProyectado` FLOAT64
- `comentarios` STRING
- `creadoPor` STRING
- `creadoEn` TIMESTAMP
- `origen` STRING

La Service Account de ejecución necesita `roles/bigquery.dataEditor` sobre el dataset. Para consultas o validaciones adicionales puede requerir `roles/bigquery.jobUser` en el proyecto.
