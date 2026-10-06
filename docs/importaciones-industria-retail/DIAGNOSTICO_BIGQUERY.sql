-- EJECUTAR POR BLOQUES. Reemplazar PROJECT_ID después de confirmarlo.
-- Fuente candidata: `PROJECT_ID.silver.ft_cl_planificacion_importaciones_industria`

-- 1) Confirmación de tabla y metadatos.
SELECT table_catalog, table_schema, table_name, row_count, size_bytes, creation_time, last_modified_time
FROM `PROJECT_ID.silver.INFORMATION_SCHEMA.TABLE_STORAGE`
WHERE table_name = 'ft_cl_planificacion_importaciones_industria';

SELECT ordinal_position, column_name, data_type, is_nullable
FROM `PROJECT_ID.silver.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'ft_cl_planificacion_importaciones_industria'
ORDER BY ordinal_position;

-- 2) Frecuencias para descubrir valores reales antes de fijar filtros.
SELECT UPPER(TRIM(CAST(CLASE AS STRING))) clase, COUNT(*) filas
FROM `PROJECT_ID.silver.ft_cl_planificacion_importaciones_industria`
GROUP BY 1 ORDER BY 2 DESC;

SELECT UPPER(TRIM(CAST(UNIDAD AS STRING))) unidad, COUNT(*) filas
FROM `PROJECT_ID.silver.ft_cl_planificacion_importaciones_industria`
GROUP BY 1 ORDER BY 2 DESC;

-- 3) Base de conciliación. Sustituir FECHA y CANTIDAD solo después de revisar el esquema.
WITH base AS (
  SELECT
    FECHA,
    UPPER(TRIM(CAST(CLASE AS STRING))) AS clase,
    UPPER(TRIM(CAST(UNIDAD AS STRING))) AS unidad,
    SAFE_CAST(CANTIDAD AS NUMERIC) AS cantidad,
    SAFE_CAST(US_FOB AS NUMERIC) AS us_fob
  FROM `PROJECT_ID.silver.ft_cl_planificacion_importaciones_industria`
), universo AS (
  SELECT * FROM base
  WHERE EXTRACT(YEAR FROM FECHA) >= 2023
    AND clase IN ('CALZADO', 'VESTUARIO', 'ACCESORIOS')
    AND unidad IN ('PARES', 'UNIDADES')
)
SELECT
  COUNT(*) filas,
  MIN(FECHA) fecha_min,
  MAX(FECHA) fecha_max,
  COUNTIF(cantidad IS NULL) cantidad_nula,
  COUNTIF(us_fob IS NULL) fob_nulo,
  SUM(cantidad) cantidad,
  SUM(us_fob) us_fob,
  SAFE_DIVIDE(SUM(us_fob), SUM(cantidad)) fob_unitario_ponderado
FROM universo;

-- 4) Perfil anual/trimestral para contrastar con Power BI.
WITH universo AS (
  SELECT FECHA, UPPER(TRIM(CAST(CLASE AS STRING))) clase,
         UPPER(TRIM(CAST(UNIDAD AS STRING))) unidad,
         SAFE_CAST(CANTIDAD AS NUMERIC) cantidad, SAFE_CAST(US_FOB AS NUMERIC) us_fob
  FROM `PROJECT_ID.silver.ft_cl_planificacion_importaciones_industria`
  WHERE UPPER(TRIM(CAST(CLASE AS STRING))) IN ('CALZADO','VESTUARIO','ACCESORIOS')
    AND UPPER(TRIM(CAST(UNIDAD AS STRING))) IN ('PARES','UNIDADES')
)
SELECT EXTRACT(YEAR FROM FECHA) anio, EXTRACT(QUARTER FROM FECHA) trimestre,
       SUM(cantidad) cantidad, SUM(us_fob) us_fob,
       SAFE_DIVIDE(SUM(us_fob), SUM(cantidad)) fob_unitario
FROM universo GROUP BY 1,2 ORDER BY 1,2;

-- 5) Valores sin mapear: ejecutar tras implementar las CASE o UDF de reglas.
-- Debe repetirse para SEGMENTO, IMPORTADOR_HOMOLOGADO, GENERO_HOMOLOGADO,
-- TIPO_HOMOLOGADO, TIPO_ACCESORIOS, MARCAS_PROPIAS y GRUPO.
SELECT UPPER(TRIM(CAST(MARCA_HOMOLOGADA AS STRING))) marca, COUNT(*) filas,
       SUM(SAFE_CAST(US_FOB AS NUMERIC)) us_fob
FROM `PROJECT_ID.silver.ft_cl_planificacion_importaciones_industria`
WHERE UPPER(TRIM(CAST(CLASE AS STRING))) IN ('CALZADO','VESTUARIO','ACCESORIOS')
  AND UPPER(TRIM(CAST(UNIDAD AS STRING))) IN ('PARES','UNIDADES')
GROUP BY 1 ORDER BY 3 DESC;

-- 6) Duplicados potenciales. Definir la llave natural al revisar el esquema.
-- SELECT <llave>, COUNT(*) repeticiones
-- FROM `PROJECT_ID.silver.ft_cl_planificacion_importaciones_industria`
-- GROUP BY <llave> HAVING COUNT(*) > 1 ORDER BY repeticiones DESC;
