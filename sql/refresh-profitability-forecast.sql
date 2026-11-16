-- Sincroniza Google Sheets con la tabla nativa de Rentabilidad Forecast.
-- La validacion usa una tabla TEMPORAL, limitada a la ejecucion actual.
-- No crea ni utiliza tablas persistentes de staging o auditoria.
-- Cualquier error se propaga para que BigQuery envie la notificacion de fallo.
CREATE OR REPLACE PROCEDURE
  `forus-analitica-test-datalake.silver.sp_refresh_forecast_anual_marca_canal`()
BEGIN
  DECLARE v_previous_rows INT64 DEFAULT 0;
  DECLARE v_source_rows INT64 DEFAULT 0;
  DECLARE v_unique_keys INT64 DEFAULT 0;
  DECLARE v_duplicate_rows INT64 DEFAULT 0;
  DECLARE v_null_dimension_rows INT64 DEFAULT 0;
  DECLARE v_invalid_period_rows INT64 DEFAULT 0;
  DECLARE v_invalid_measure_rows INT64 DEFAULT 0;
  DECLARE v_scenarios ARRAY<STRING> DEFAULT [];
  DECLARE v_channels ARRAY<STRING> DEFAULT [];
  DECLARE v_missing_scenarios ARRAY<STRING> DEFAULT [];
  DECLARE v_missing_channels ARRAY<STRING> DEFAULT [];
  DECLARE v_validation_message STRING DEFAULT '';

  SET v_previous_rows = (
    SELECT COUNT(*)
    FROM `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_FORECAST_ANUAL_MARCA_CANAL`
  );

  -- La instantanea temporal evita consultar repetidamente Google Sheets y
  -- desaparece automaticamente cuando termina esta ejecucion.
  CREATE TEMP TABLE source_snapshot AS
  SELECT
    TRIM(CAST(ANO_2 AS STRING)) AS ANO_2,
    UPPER(TRIM(CAST(QUARTER AS STRING))) AS QUARTER,
    CAST(MES AS INT64) AS MES,
    TRIM(CAST(NEGOCIO_DETALLE AS STRING)) AS NEGOCIO_DETALLE,
    TRIM(CAST(MARCA AS STRING)) AS MARCA,
    CAST(VENTA_NETA AS FLOAT64) AS VENTA_NETA,
    CAST(MARGEN AS FLOAT64) AS MARGEN,
    CAST(COSTO_OPERACIONAL AS FLOAT64) AS COSTO_OPERACIONAL,
    CAST(ROP AS FLOAT64) AS ROP,
    CAST(UTILIDAD_NETA AS FLOAT64) AS UTILIDAD_NETA
  FROM
    `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EXT_FORECAST_ANUAL_MARCA_CANAL`;

  SET v_source_rows = (SELECT COUNT(*) FROM source_snapshot);

  SET v_unique_keys = (
    SELECT COUNT(DISTINCT CONCAT(ANO_2, '|', CAST(MES AS STRING), '|', NEGOCIO_DETALLE, '|', MARCA))
    FROM source_snapshot
  );

  SET v_duplicate_rows = (
    SELECT COALESCE(SUM(key_rows - 1), 0)
    FROM (
      SELECT COUNT(*) AS key_rows
      FROM source_snapshot
      GROUP BY ANO_2, MES, NEGOCIO_DETALLE, MARCA
      HAVING COUNT(*) > 1
    )
  );

  SET v_null_dimension_rows = (
    SELECT COUNTIF(
      ANO_2 IS NULL OR ANO_2 = '' OR
      QUARTER IS NULL OR QUARTER = '' OR
      MES IS NULL OR
      NEGOCIO_DETALLE IS NULL OR NEGOCIO_DETALLE = '' OR
      MARCA IS NULL OR MARCA = ''
    )
    FROM source_snapshot
  );

  SET v_invalid_period_rows = (
    SELECT COUNTIF(
      MES NOT BETWEEN 1 AND 12 OR
      QUARTER != CONCAT('Q', CAST(DIV(MES - 1, 3) + 1 AS STRING))
    )
    FROM source_snapshot
  );

  SET v_invalid_measure_rows = (
    SELECT COUNTIF(
      VENTA_NETA IS NULL OR IS_NAN(VENTA_NETA) OR IS_INF(VENTA_NETA) OR
      MARGEN IS NULL OR IS_NAN(MARGEN) OR IS_INF(MARGEN) OR
      COSTO_OPERACIONAL IS NULL OR IS_NAN(COSTO_OPERACIONAL) OR IS_INF(COSTO_OPERACIONAL) OR
      ROP IS NULL OR IS_NAN(ROP) OR IS_INF(ROP) OR
      UTILIDAD_NETA IS NULL OR IS_NAN(UTILIDAD_NETA) OR IS_INF(UTILIDAD_NETA)
    )
    FROM source_snapshot
  );

  SET v_scenarios = COALESCE((
    SELECT ARRAY_AGG(DISTINCT ANO_2 ORDER BY ANO_2)
    FROM source_snapshot
  ), []);

  SET v_channels = COALESCE((
    SELECT ARRAY_AGG(DISTINCT NEGOCIO_DETALLE ORDER BY NEGOCIO_DETALLE)
    FROM source_snapshot
  ), []);

  SET v_missing_scenarios = ARRAY(
    SELECT scenario
    FROM UNNEST(['2025', '2026E', '2026P', '2027P']) AS scenario
    WHERE scenario NOT IN UNNEST(v_scenarios)
  );

  SET v_missing_channels = ARRAY(
    SELECT channel
    FROM UNNEST(['Brick&Life', 'Ecommerce', 'Marketplace', 'Wholesale', 'Consolidado']) AS channel
    WHERE channel NOT IN UNNEST(v_channels)
  );

  SET v_validation_message = CONCAT(
    IF(v_source_rows = 0, 'La fuente no contiene registros. ', ''),
    IF(v_duplicate_rows > 0, FORMAT('Se detectaron %d registros duplicados. ', v_duplicate_rows), ''),
    IF(v_null_dimension_rows > 0, FORMAT('Se detectaron %d filas con dimensiones vacias. ', v_null_dimension_rows), ''),
    IF(v_invalid_period_rows > 0, FORMAT('Se detectaron %d periodos invalidos. ', v_invalid_period_rows), ''),
    IF(v_invalid_measure_rows > 0, FORMAT('Se detectaron %d filas con medidas invalidas. ', v_invalid_measure_rows), ''),
    IF(
      v_previous_rows > 0 AND v_source_rows < CAST(FLOOR(v_previous_rows * 0.8) AS INT64),
      FORMAT('La fuente disminuyo de %d a %d filas, superando el limite de seguridad de 20%%. ', v_previous_rows, v_source_rows),
      ''
    ),
    IF(ARRAY_LENGTH(v_missing_scenarios) > 0, FORMAT('Faltan escenarios: %s. ', ARRAY_TO_STRING(v_missing_scenarios, ', ')), ''),
    IF(ARRAY_LENGTH(v_missing_channels) > 0, FORMAT('Faltan canales: %s. ', ARRAY_TO_STRING(v_missing_channels, ', ')), '')
  );

  IF v_validation_message != '' THEN
    RAISE USING MESSAGE = v_validation_message;
  END IF;

  -- La tabla nativa nunca queda parcialmente actualizada.
  BEGIN
    BEGIN TRANSACTION;

    TRUNCATE TABLE
      `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_FORECAST_ANUAL_MARCA_CANAL`;

    INSERT INTO
      `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_FORECAST_ANUAL_MARCA_CANAL`
    (
      ANO_2,
      QUARTER,
      MES,
      NEGOCIO_DETALLE,
      MARCA,
      VENTA_NETA,
      MARGEN,
      COSTO_OPERACIONAL,
      ROP,
      UTILIDAD_NETA
    )
    SELECT
      ANO_2,
      QUARTER,
      MES,
      NEGOCIO_DETALLE,
      MARCA,
      VENTA_NETA,
      MARGEN,
      COSTO_OPERACIONAL,
      ROP,
      UTILIDAD_NETA
    FROM source_snapshot;

    COMMIT TRANSACTION;
  EXCEPTION WHEN ERROR THEN
    ROLLBACK TRANSACTION;
    RAISE;
  END;
END;
