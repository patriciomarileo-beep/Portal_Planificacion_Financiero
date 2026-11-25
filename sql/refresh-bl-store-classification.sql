-- Sincroniza Movimiento tiendas con la dimension mensual de clasificacion.
-- No crea tablas persistentes de staging ni auditoria.
-- Si una validacion falla, conserva la ultima publicacion valida.

CREATE OR REPLACE PROCEDURE
  `forus-analitica-test-datalake.silver.sp_refresh_clasificacion_tienda_bl`()
OPTIONS (strict_mode = false)
BEGIN
  DECLARE v_previous_rows INT64 DEFAULT 0;
  DECLARE v_source_rows INT64 DEFAULT 0;
  DECLARE v_invalid_rows INT64 DEFAULT 0;
  DECLARE v_duplicate_rows INT64 DEFAULT 0;
  DECLARE v_validation_message STRING DEFAULT '';

  SET v_previous_rows = (
    SELECT COUNT(*)
    FROM `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_CLASIFICACION_TIENDA`
  );

  CREATE TEMP TABLE raw_source AS
  SELECT
    SAFE.PARSE_DATE('%Y-%m', TRIM(FECHA)) AS PERIODO,
    SAFE_CAST(TRIM(ANO) AS INT64) AS ANO,
    SAFE_CAST(TRIM(MES) AS INT64) AS MES,
    NULLIF(TRIM(CC), '') AS CC,
    NULLIF(TRIM(TIENDA), '') AS TIENDA,
    REGEXP_REPLACE(
      NORMALIZE(UPPER(NULLIF(TRIM(TIPO), '')), NFD),
      r'\pM',
      ''
    ) AS TIPO,
    NULLIF(TRIM(MOVIMIENTO), '') AS MOVIMIENTO,
    NULLIF(TRIM(ARCHIVO_FUENTE), '') AS ARCHIVO_FUENTE,
    UPPER(NULLIF(TRIM(TIPO_FUENTE), '')) AS TIPO_FUENTE,
    SAFE_CAST(TRIM(PRIORIDAD) AS INT64) AS PRIORIDAD,
    NULLIF(TRIM(ESTADO_FUENTE), '') AS ESTADO_FUENTE,
    NULLIF(TRIM(CADENA), '') AS CADENA,
    NULLIF(TRIM(HOJA_ORIGEN), '') AS HOJA_ORIGEN
  FROM
    `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EXT_CLASIFICACION_TIENDA`
  WHERE COALESCE(
    NULLIF(TRIM(FECHA), ''),
    NULLIF(TRIM(CC), ''),
    NULLIF(TRIM(TIPO), '')
  ) IS NOT NULL;

  SET v_source_rows = (SELECT COUNT(*) FROM raw_source);

  SET v_invalid_rows = (
    SELECT COUNTIF(
      PERIODO IS NULL OR
      ANO IS NULL OR
      MES NOT BETWEEN 1 AND 12 OR
      CC IS NULL OR
      TIPO IS NULL OR
      PRIORIDAD IS NULL OR
      TIPO NOT IN ('SSS', 'NS', 'REMODELACION', 'REAPERTURA')
    )
    FROM raw_source
  );

  CREATE TEMP TABLE selected_priority AS
  SELECT * EXCEPT (MIN_PRIORITY)
  FROM (
    SELECT
      raw_source.*,
      MIN(PRIORIDAD) OVER (PARTITION BY PERIODO, CC) AS MIN_PRIORITY
    FROM raw_source
    WHERE PERIODO IS NOT NULL
      AND CC IS NOT NULL
      AND TIPO IS NOT NULL
      AND PRIORIDAD IS NOT NULL
  )
  WHERE PRIORIDAD = MIN_PRIORITY;

  -- Puede haber dos movimientos validos para el mismo CC y mes, por ejemplo
  -- REAPERTURA y SSS. La agregacion conserva el detalle y publica una unica
  -- clasificacion canonica para evitar duplicar las medidas del EERR.
  CREATE TEMP TABLE bl_classification_source_snapshot AS
  SELECT
    PERIODO,
    EXTRACT(YEAR FROM PERIODO) AS ANO,
    EXTRACT(MONTH FROM PERIODO) AS MES,
    CC,
    ARRAY_AGG(TIENDA IGNORE NULLS ORDER BY PRIORIDAD LIMIT 1)[SAFE_OFFSET(0)] AS TIENDA,
    ARRAY_AGG(CADENA IGNORE NULLS ORDER BY PRIORIDAD LIMIT 1)[SAFE_OFFSET(0)] AS CADENA,
    STRING_AGG(DISTINCT TIPO, ' / ' ORDER BY TIPO) AS CLASIFICACION_RAW,
    CASE
      WHEN COUNTIF(TIPO = 'REMODELACION') > 0 THEN 'REMODELACION'
      WHEN COUNTIF(TIPO = 'SSS') > 0 THEN 'SSS'
      WHEN COUNTIF(TIPO = 'NS') > 0 THEN 'NS'
      -- Una reapertura sin SSS simultaneo continua como tienda nueva.
      WHEN COUNTIF(TIPO = 'REAPERTURA') > 0 THEN 'NS'
      ELSE 'SIN CLASIFICAR'
    END AS CLASIFICACION,
    STRING_AGG(DISTINCT MOVIMIENTO, ' / ' ORDER BY MOVIMIENTO) AS MOVIMIENTO,
    STRING_AGG(DISTINCT TIPO_FUENTE, ' / ' ORDER BY TIPO_FUENTE) AS TIPO_FUENTE,
    MIN(PRIORIDAD) AS PRIORIDAD,
    STRING_AGG(DISTINCT ESTADO_FUENTE, ' / ' ORDER BY ESTADO_FUENTE) AS ESTADO_FUENTE,
    STRING_AGG(DISTINCT ARCHIVO_FUENTE, ' / ' ORDER BY ARCHIVO_FUENTE) AS ARCHIVO_FUENTE,
    STRING_AGG(DISTINCT HOJA_ORIGEN, ' / ' ORDER BY HOJA_ORIGEN) AS HOJA_ORIGEN
  FROM selected_priority
  GROUP BY PERIODO, CC;

  SET v_duplicate_rows = (
    SELECT COALESCE(SUM(key_rows - 1), 0)
    FROM (
      SELECT COUNT(*) AS key_rows
      FROM bl_classification_source_snapshot
      GROUP BY PERIODO, CC
      HAVING COUNT(*) > 1
    )
  );

  SET v_validation_message = CONCAT(
    IF(v_source_rows = 0, 'La fuente de clasificacion no contiene registros. ', ''),
    IF(v_invalid_rows > 0, FORMAT('Se detectaron %d filas invalidas en la clasificacion. ', v_invalid_rows), ''),
    IF(v_duplicate_rows > 0, FORMAT('Se detectaron %d claves duplicadas despues de normalizar. ', v_duplicate_rows), ''),
    IF(
      v_previous_rows > 0 AND
      (SELECT COUNT(*) FROM bl_classification_source_snapshot) < CAST(FLOOR(v_previous_rows * 0.8) AS INT64),
      'La dimension disminuyo mas de 20% respecto de la carga anterior. ',
      ''
    )
  );

  IF v_validation_message != '' THEN
    RAISE USING MESSAGE = v_validation_message;
  END IF;

  BEGIN
    BEGIN TRANSACTION;

    TRUNCATE TABLE
      `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_CLASIFICACION_TIENDA`;

    INSERT INTO
      `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_CLASIFICACION_TIENDA`
    SELECT
      PERIODO, ANO, MES, CC, TIENDA, CADENA, CLASIFICACION_RAW,
      CLASIFICACION, MOVIMIENTO, TIPO_FUENTE, PRIORIDAD, ESTADO_FUENTE,
      ARCHIVO_FUENTE, HOJA_ORIGEN, CURRENT_TIMESTAMP()
    FROM bl_classification_source_snapshot;

    COMMIT TRANSACTION;
  EXCEPTION WHEN ERROR THEN
    ROLLBACK TRANSACTION;
    RAISE;
  END;
END;
