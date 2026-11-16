# Actualización de Rentabilidad Forecast

## Resumen del estado actual

El portal consulta exclusivamente la tabla nativa:

`forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_FORECAST_ANUAL_MARCA_CANAL`

La tabla contiene 5.760 registros y fue materializada el 10 de noviembre de 2026 a las 09:38, hora de Santiago. Su descripción en BigQuery indica que el origen funcional es la tabla externa de Google Sheets.

No existe en este repositorio un proceso programado que vuelva a materializar la tabla nativa. En el historial visible para la cuenta actual, su creación corresponde a una carga puntual mediante `CREATE TABLE AS SELECT`. Por lo tanto, no se puede afirmar que exista una periodicidad automática activa.

La revisión de trabajos de todos los usuarios del proyecto requiere el permiso `bigquery.jobs.listAll`, que la cuenta actual no posee. Un administrador de BigQuery debe confirmar si existe una transferencia programada administrada fuera de este repositorio.

## Origen de los datos

La tabla externa es:

`forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EXT_FORECAST_ANUAL_MARCA_CANAL`

Configuración observada:

- Tipo: tabla externa de Google Sheets.
- Hoja y rango: `base!C:L`.
- Encabezado omitido: una fila.
- Columnas: `ANO_2`, `QUARTER`, `MES`, `NEGOCIO_DETALLE`, `MARCA`, `VENTA_NETA`, `MARGEN`, `COSTO_OPERACIONAL`, `ROP` y `UTILIDAD_NETA`.
- La tabla externa sólo funciona como origen; el portal no la consulta directamente.

## Materialización nativa observada

La carga registrada creó la tabla nativa desde una tabla intermedia fechada:

`ft_cl_planificacion_TB_FORECAST_ANUAL_MARCA_CANAL_STAGING_20261110`

La sentencia copió las diez columnas sin cálculos adicionales. Antes de crear la tabla definitiva se validaron:

- cantidad total de registros;
- unicidad de la llave `ANO_2 | MES | NEGOCIO_DETALLE | MARCA`;
- dimensiones nulas;
- escenarios disponibles;
- canales disponibles.

El flujo observado fue:

```text
Google Sheets, rango base!C:L
        ↓
Tabla externa TB_EXT_FORECAST_ANUAL_MARCA_CANAL
        ↓
Tabla staging fechada y validaciones
        ↓
Tabla nativa TB_FORECAST_ANUAL_MARCA_CANAL
        ↓
API /api/profitability-forecast
        ↓
Ecommerce, Marketplace, Wholesale y Consolidado
```

## Lectura realizada por el portal

La API ejecuta una consulta paginada sobre la tabla nativa y limita los resultados a:

- escenarios `2025`, `2026E`, `2026P` y `2027P`;
- canales `Brick&Life`, `Ecommerce`, `Marketplace`, `Wholesale` y `Consolidado`.

Los campos financieros se convierten a `FLOAT64`. Luego, el servidor valida escenarios, canales, meses, trimestres, dimensiones obligatorias y duplicados antes de responder a la interfaz.

La respuesta queda en una caché de memoria durante cinco minutos. El botón **Actualizar** agrega el parámetro `refresh` para omitir esa caché y volver a consultar la tabla nativa.

Importante: esta actualización del portal **no sincroniza Google Sheets con BigQuery**. Si la tabla nativa no fue materializada nuevamente, el usuario recibirá los mismos registros.

## Periodicidad actual

| Etapa | Periodicidad comprobada |
| --- | --- |
| Edición de Google Sheets | Depende del propietario de la hoja |
| Lectura de la tabla externa | Bajo demanda cuando una consulta accede a ella |
| Copia externa → staging → nativa | Sin programación comprobada; última carga puntual observada el 10-11-2026 |
| Caché del portal | Cinco minutos |
| Botón Actualizar | Bajo demanda; sólo vuelve a consultar la tabla nativa |

## Recomendación para automatizar

Crear una consulta programada de BigQuery en `us-east4` que:

1. copie la tabla externa a una tabla staging;
2. ejecute las validaciones de llave, dimensiones y escenarios;
3. reemplace la tabla nativa sólo cuando las validaciones sean correctas;
4. registre fecha, cantidad de filas y resultado de la ejecución;
5. mantenga la tabla nativa anterior cuando la hoja o la validación fallen.

Una ejecución diaria, posterior a la actualización funcional de la hoja, es suficiente mientras el forecast no requiera disponibilidad intradía. La periodicidad definitiva debe ser acordada con el dueño de la fuente.
