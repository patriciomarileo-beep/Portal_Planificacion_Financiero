# Actualización de Rentabilidad Forecast

## Arquitectura

El portal consulta exclusivamente la tabla nativa:

`forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_FORECAST_ANUAL_MARCA_CANAL`

La sincronización implementada mantiene separada la lectura de Google Sheets de la ejecución del portal:

```text
Google Sheets, rango base!C:L
        ↓
Tabla externa TB_EXT_FORECAST_ANUAL_MARCA_CANAL
        ↓
Procedimiento sp_refresh_forecast_anual_marca_canal
        ↓
Instantánea temporal + validaciones
        ↓ transacción atómica
Tabla nativa TB_FORECAST_ANUAL_MARCA_CANAL
        ↓
API /api/profitability-forecast
        ↓
Ecommerce, Marketplace, Wholesale y Consolidado
```

El procedimiento se encuentra en [`sql/refresh-profitability-forecast.sql`](../sql/refresh-profitability-forecast.sql) y la instalación idempotente de la consulta programada en [`scripts/deploy-profitability-forecast-refresh.mjs`](../scripts/deploy-profitability-forecast-refresh.mjs).

## Fuente externa

La tabla externa es:

`forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EXT_FORECAST_ANUAL_MARCA_CANAL`

Configuración comprobada el 12 de noviembre de 2026:

- tipo: tabla externa de Google Sheets;
- hoja y rango: `base!C:L`;
- encabezado omitido: una fila;
- ubicación: `us-east4`;
- columnas: `ANO_2`, `QUARTER`, `MES`, `NEGOCIO_DETALLE`, `MARCA`, `VENTA_NETA`, `MARGEN`, `COSTO_OPERACIONAL`, `ROP` y `UTILIDAD_NETA`.

## Controles antes de publicar

Cada ejecución crea una tabla temporal `source_snapshot`, visible únicamente durante el trabajo actual, y valida:

1. que la fuente no esté vacía;
2. la unicidad de `ANO_2 | MES | NEGOCIO_DETALLE | MARCA`;
3. dimensiones nulas o vacías;
4. meses entre 1 y 12 y coherencia entre mes y trimestre;
5. medidas nulas, infinitas o `NaN`;
6. presencia de los escenarios `2025`, `2026E`, `2026P` y `2027P`;
7. presencia de `Brick&Life`, `Ecommerce`, `Marketplace`, `Wholesale` y `Consolidado`;
8. que la cantidad de filas no disminuya más de 20% respecto de la tabla publicada.

Si una validación falla, la tabla nativa conserva todos sus registros anteriores. Cuando las validaciones son correctas, `TRUNCATE` e `INSERT` se ejecutan dentro de una transacción de BigQuery, evitando estados parciales.

No se mantienen tablas persistentes de staging ni auditoría. Cualquier error de lectura, validación o publicación hace fallar la ejecución programada. BigQuery Data Transfer Service envía entonces un correo al propietario de esa configuración; el destinatario no se configura de forma independiente.

## Programación

La configuración predeterminada ejecuta la sincronización cada cinco minutos, que es el intervalo mínimo permitido por las Scheduled Queries de BigQuery. BigQuery no permite programarla cada un minuto.

Variables disponibles:

```dotenv
FORECAST_REFRESH_PROJECT=forus-analitica-test-datalake
FORECAST_REFRESH_LOCATION=us-east4
FORECAST_REFRESH_AUTH_MODE=user
FORECAST_REFRESH_SCHEDULE=every 5 minutes
FORECAST_REFRESH_DISPLAY_NAME=Portal financiero - Carga directa Forecast anual marca canal
```

Para modificar la frecuencia, cambia solamente `FORECAST_REFRESH_SCHEDULE`. Algunos ejemplos válidos son:

```dotenv
# Cada 5 minutos, mínimo admitido
FORECAST_REFRESH_SCHEDULE=every 5 minutes

# Cada 15 minutos
FORECAST_REFRESH_SCHEDULE=every 15 minutes

# Cada hora
FORECAST_REFRESH_SCHEDULE=every 60 minutes

# Una vez al día a las 10:07 UTC
FORECAST_REFRESH_SCHEDULE=every day 10:07
```

El valor puede definirse en `.env.cloudrun`. Después de modificarlo, vuelve a ejecutar `npm run deploy:profitability-forecast-refresh`; el instalador actualizará la programación existente sin crear otra.

## Credenciales temporales del usuario

Con `FORECAST_REFRESH_AUTH_MODE=user`, la consulta programada se crea con las credenciales de la persona que ejecuta el instalador. No se requiere una cuenta de servicio, pero el usuario debe conservar acceso a la hoja y a BigQuery.

Esta modalidad es temporal: si la cuenta se deshabilita, pierde permisos o requiere renovar sus credenciales, la sincronización puede detenerse.

## Permisos requeridos

El usuario que ejecutará temporalmente la consulta programada debe tener:

- acceso de lector a la hoja de Google Sheets;
- `bigquery.jobs.create` en el proyecto de ejecución;
- lectura de la tabla externa;
- lectura de la tabla externa y escritura sobre la tabla nativa;
- acceso de lectura/ejecución al procedimiento;
- permisos para administrar Scheduled Queries de BigQuery.

La tabla temporal se administra dentro del trabajo de BigQuery y desaparece al terminar. El procedimiento se crea o reemplaza durante la instalación.

BigQuery Data Transfer Service debe estar habilitado.

## Instalación

Primero se puede revisar la configuración sin modificar Google Cloud:

```powershell
npm run deploy:profitability-forecast-refresh -- --dry-run
```

Después de autenticar `gcloud`/`bq` con una cuenta administradora en la configuración aislada del proyecto:

```powershell
$env:CLOUDSDK_CONFIG = (Resolve-Path -LiteralPath .gcloud).Path
gcloud.cmd auth login --enable-gdrive-access
npm run deploy:profitability-forecast-refresh
```

Para instalar y además ejecutar una sincronización inicial con las credenciales del instalador:

```powershell
npm run deploy:profitability-forecast-refresh -- --run-now
```

Al crear una programación nueva, BigQuery dispara por sí mismo la primera ejecución. En ese caso, `--run-now` no genera una segunda ejecución para evitar escrituras concurrentes. Si la programación ya existía, `--run-now` sí ejecuta una sincronización inmediata.

El instalador actualiza la consulta programada existente cuando encuentra el mismo nombre, evitando crear programaciones duplicadas.

El instalador también activa `emailPreferences.enableFailureEmail`. El correo se envía únicamente cuando una ejecución falla y llega a la cuenta propietaria de la consulta programada.

Cuando exista una cuenta de servicio definitiva, cambia la configuración a:

```dotenv
FORECAST_REFRESH_AUTH_MODE=service-account
FORECAST_REFRESH_SERVICE_ACCOUNT=CUENTA_CONFIRMADA
```

## Lectura del portal

La API consulta la tabla nativa y mantiene una caché de cinco minutos. El botón **Actualizar** omite esa caché y vuelve a consultar BigQuery, pero no ejecuta el procedimiento de sincronización.

## Estado de despliegue

La consulta programada anterior, `Portal financiero - Forecast anual marca canal`, fue eliminada el 12 de noviembre de 2026. También se retiró del código la dependencia de las tablas persistentes `STAGING` y `AUDIT`.

La reemplaza `Portal financiero - Carga directa Forecast anual marca canal`, identificada como `projects/625822889440/locations/us-east4/transferConfigs/6b091f10-0000-20e7-b9b6-14223bb2841a`. Se ejecuta cada cinco minutos y tiene habilitado `emailPreferences.enableFailureEmail`.

La primera ejecución directa terminó en estado `SUCCEEDED`. Las tablas auxiliares ya no existen y la tabla nativa conserva 5.760 filas y 5.760 claves únicas.
