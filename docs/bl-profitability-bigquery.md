# Migracion controlada de B&L a BigQuery

## Estado del frontend

La vista B&L no se perdio. La version actual conserva:

- Comparativa anual;
- Detalle tiendas;
- Break-Even;
- analisis por m2;
- Sensibilidad tiendas;
- Monitor tiendas.

La interfaz permanece en `app/page.tsx`. El corte del backend no modifica sus
calculos ni su presentacion. `/api/portal-data` consume ahora exclusivamente la
tabla nativa validada de BigQuery.

## Arquitectura propuesta

```text
Google Sheets / BASE_CONSOLIDADA!A:V
                |
                v
ft_cl_planificacion_TB_EXT_RENTABILIDAD_BL        (tabla externa)
                |
                v
sp_refresh_rentabilidad_bl                        (validacion + publicacion atomica)
                |
                v
ft_cl_planificacion_TB_RENTABILIDAD_BL            (tabla nativa)
                |
                v
/api/portal-data -> B&L                             (origen activo)
```

Solo la identidad que crea o ejecuta la consulta programada necesita permiso de
lector sobre Google Sheets. La cuenta de Cloud Run necesitara exclusivamente
lectura de BigQuery cuando se realice el corte del backend.

## Objetos que se prepararan

| Tipo | Nombre |
| --- | --- |
| Tabla externa | `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EXT_RENTABILIDAD_BL` |
| Tabla nativa | `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL` |
| Procedimiento | `forus-analitica-test-datalake.silver.sp_refresh_rentabilidad_bl` |

No se crean tablas persistentes de `STAGING` ni `AUDIT`.

## Ejecucion manual paso a paso

### 1. Preparar permisos

1. Confirma que el dataset `silver` esta en `us-east4`.
2. Comparte la hoja en modo **lector** con la cuenta que administrara la
   consulta programada.
3. Esa cuenta debe poder crear tablas, rutinas y trabajos en BigQuery, y escribir
   en el dataset `silver`.
4. No otorgues acceso a Drive a la cuenta de Cloud Run por este proceso.

### 2. Crear las tablas

1. Abre `sql/setup-bl-profitability-tables.sql`.
2. Reemplaza `REEMPLAZAR_SPREADSHEET_ID` por el ID ubicado entre `/d/` y `/edit`
   en la URL de Google Sheets.
3. En BigQuery Studio, selecciona el proyecto
   `forus-analitica-test-datalake` y la ubicacion `us-east4`.
4. Ejecuta el script completo.
5. No continues hasta poder previsualizar la tabla externa.

### 3. Validar la fuente externa

Ejecuta `sql/validate-bl-profitability-source.sql`. El resultado debe cumplir:

- `source_rows > 0`;
- `source_rows = unique_keys`;
- `invalid_year_rows = 0`;
- `invalid_period_rows = 0`;
- `missing_store_rows = 0`;
- `invalid_measure_rows = 0`;
- `available_years` contiene 2024, 2025, 2026 y 2027;
- aparecen los tipos `ANUAL` y `MENSUAL`.

Si una condicion no se cumple, corrige primero la hoja. No elimines las
validaciones para forzar la publicacion.

### 4. Instalar el procedimiento

Ejecuta completo `sql/refresh-bl-profitability.sql`. Este paso crea o reemplaza
solamente el procedimiento; aun no carga registros.

### 5. Ejecutar la primera sincronizacion

Ejecuta manualmente:

```sql
CALL `forus-analitica-test-datalake.silver.sp_refresh_rentabilidad_bl`();
```

Luego valida la tabla nativa:

```sql
SELECT
  COUNT(*) AS rows,
  COUNT(DISTINCT CONCAT(
    CAST(ANO AS STRING), '|', TIPO_PERIODO, '|', MES, '|',
    COALESCE(CC_BASE_REPORTE, CC_ORIGEN, '')
  )) AS unique_keys,
  MIN(SYNCED_AT) AS synced_at,
  ARRAY_AGG(DISTINCT ANO ORDER BY ANO) AS years
FROM `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL`;
```

Los conteos deben coincidir con la validacion de la tabla externa.

### 6. Crear la consulta programada bajo control manual

En BigQuery Studio:

1. Crea una **Scheduled query** con el siguiente texto:

   ```sql
   CALL `forus-analitica-test-datalake.silver.sp_refresh_rentabilidad_bl`();
   ```

2. Nombre sugerido: `Accountability Portal - Sincronizacion Rentabilidad B&L`.
3. Ubicacion: `us-east4`.
4. Frecuencia recomendada: `every 5 minutes`. Es el intervalo minimo admitido
   por Scheduled Queries; no se puede ejecutar cada minuto con este servicio.
5. Usa las credenciales de la cuenta que tiene lectura de la hoja.
6. Activa **email notification on failure**.
7. No configures una tabla destino: el procedimiento publica en la tabla nativa.
8. Revisa manualmente la primera ejecucion y confirma que termine en
   `SUCCEEDED`.

## Controles incluidos

Antes de reemplazar la tabla nativa, el procedimiento comprueba:

1. fuente no vacia;
2. claves unicas por ano, tipo, periodo y tienda;
3. codigos y nombres de tienda validos;
4. anos y periodos permitidos;
5. medidas numericas validas;
6. presencia anual de 2024 a 2027;
7. apertura mensual de 2026 y 2027;
8. que la cantidad de filas no disminuya mas de 20% respecto de la ultima carga.

La carga utiliza `TRUNCATE` e `INSERT` dentro de una transaccion. Si cualquier
paso falla, se ejecuta `ROLLBACK` y la ultima instantanea valida permanece
disponible. El correo de fallo de la consulta programada reemplaza la necesidad
de una tabla de auditoria persistente.

Las medidas se normalizan antes de validarse porque Google Sheets puede exponer
en la misma tabla enteros, decimales con punto y decimales con coma segun la
configuracion regional de cada hoja de origen. Por ejemplo, `26885,91502` se
publica como `26885.91502`; no se redondea ni se multiplica el monto.

## Corte del portal completado

El backend de B&L consulta la tabla nativa mediante `BIGQUERY_BL_TABLE`. La
lectura pagina todos los resultados (la instantanea validada contiene 12.885
filas), conserva exactamente el contrato `BaseRow` consumido por el frontend y
publica `MAX(SYNCED_AT)` como fecha de actualizacion del informe.

`BL_SHEET_ID` y los permisos de Google Sheets/Drive fueron retirados de Cloud
Run. La identidad del portal solo necesita ejecutar trabajos y leer la tabla
nativa en BigQuery. La identidad de la consulta programada conserva por
separado el acceso de lector a la hoja que alimenta la tabla externa.
