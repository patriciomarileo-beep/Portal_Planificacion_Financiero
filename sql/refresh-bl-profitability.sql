-- Sincroniza la tabla externa de Google Sheets con la tabla nativa de B&L.
-- No crea tablas persistentes de staging ni auditoria.
-- Si una validacion falla, la tabla nativa conserva la ultima carga valida.

CREATE OR REPLACE PROCEDURE
  `forus-analitica-test-datalake.silver.sp_refresh_rentabilidad_bl`()
BEGIN
  DECLARE v_previous_rows INT64 DEFAULT 0;
  DECLARE v_source_rows INT64 DEFAULT 0;
  DECLARE v_unique_keys INT64 DEFAULT 0;
  DECLARE v_duplicate_rows INT64 DEFAULT 0;
  DECLARE v_invalid_dimension_rows INT64 DEFAULT 0;
  DECLARE v_invalid_period_rows INT64 DEFAULT 0;
  DECLARE v_invalid_measure_rows INT64 DEFAULT 0;
  DECLARE v_missing_annual_years ARRAY<INT64> DEFAULT [];
  DECLARE v_missing_monthly_years ARRAY<INT64> DEFAULT [];
  DECLARE v_validation_message STRING DEFAULT '';

  -- Google Sheets expone como STRING los decimales segun la configuracion
  -- regional de la hoja. BASE_CONSOLIDADA mezcla enteros (552005), decimales
  -- con punto y decimales chilenos con coma (26885,91502). Esta funcion
  -- normaliza los tres formatos antes de validar o publicar las medidas.
  CREATE TEMP FUNCTION parse_bl_float(value STRING)
  RETURNS FLOAT64
  AS (
    CASE
      WHEN value IS NULL OR TRIM(value) = '' THEN NULL
      WHEN STRPOS(TRIM(value), ',') > 0 AND STRPOS(TRIM(value), '.') > 0 THEN
        SAFE_CAST(REPLACE(REPLACE(TRIM(value), '.', ''), ',', '.') AS FLOAT64)
      WHEN STRPOS(TRIM(value), ',') > 0 THEN
        SAFE_CAST(REPLACE(TRIM(value), ',', '.') AS FLOAT64)
      ELSE SAFE_CAST(TRIM(value) AS FLOAT64)
    END
  );

  SET v_previous_rows = (
    SELECT COUNT(*)
    FROM `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL`
  );

  -- Se conservan los valores como STRING para poder detectar errores de la
  -- hoja antes de convertir medidas y publicar la nueva instantanea.
  CREATE TEMP TABLE raw_snapshot AS
  SELECT
    TRIM(ANO) AS ANO_RAW,
    UPPER(TRIM(MES)) AS MES,
    UPPER(TRIM(TIPO_PERIODO)) AS TIPO_PERIODO,
    TRIM(CC_ORIGEN) AS CC_ORIGEN,
    TRIM(CC_BASE_REPORTE) AS CC_BASE_REPORTE,
    TRIM(CADENA) AS CADENA,
    TRIM(TIENDA_ORIGEN) AS TIENDA_ORIGEN,
    TRIM(TIENDA_HOMOLOGADA) AS TIENDA_HOMOLOGADA,
    TRIM(ESTADO_HOMOLOGACION) AS ESTADO_HOMOLOGACION,
    TRIM(FUENTE) AS FUENTE,
    TRIM(VENTAS) AS VENTAS_RAW,
    TRIM(MARGEN) AS MARGEN_RAW,
    TRIM(REMUNERACIONES) AS REMUNERACIONES_RAW,
    TRIM(ARRIENDOS) AS ARRIENDOS_RAW,
    TRIM(GASTOS_GRAL) AS GASTOS_GRAL_RAW,
    TRIM(DEPRECIACION) AS DEPRECIACION_RAW,
    TRIM(FEE_COMERCIAL) AS FEE_COMERCIAL_RAW,
    TRIM(FEE_ADM) AS FEE_ADM_RAW,
    TRIM(COSTO_OPERACIONAL) AS COSTO_OPERACIONAL_RAW,
    TRIM(RESULTADO_NO_OPERACIONAL) AS RESULTADO_NO_OPERACIONAL_RAW,
    TRIM(UTILIDAD_FINAL) AS UTILIDAD_FINAL_RAW,
    TRIM(FOUR_WALLS) AS FOUR_WALLS_RAW
  FROM
    `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EXT_RENTABILIDAD_BL`
  -- Las filas completamente vacias que Google Sheets conserva en su rango
  -- fisico no forman parte de la fuente. Una fila parcial si se valida.
  WHERE COALESCE(
    NULLIF(TRIM(ANO), ''),
    NULLIF(TRIM(MES), ''),
    NULLIF(TRIM(TIPO_PERIODO), ''),
    NULLIF(TRIM(CC_ORIGEN), ''),
    NULLIF(TRIM(CC_BASE_REPORTE), ''),
    NULLIF(TRIM(TIENDA_ORIGEN), ''),
    NULLIF(TRIM(TIENDA_HOMOLOGADA), ''),
    NULLIF(TRIM(VENTAS), '')
  ) IS NOT NULL;

  SET v_source_rows = (SELECT COUNT(*) FROM raw_snapshot);

  SET v_unique_keys = (
    SELECT COUNT(DISTINCT CONCAT(
      ANO_RAW, '|', TIPO_PERIODO, '|', MES, '|',
      COALESCE(NULLIF(CC_BASE_REPORTE, ''), NULLIF(CC_ORIGEN, ''), '')
    ))
    FROM raw_snapshot
  );

  SET v_duplicate_rows = (
    SELECT COALESCE(SUM(key_rows - 1), 0)
    FROM (
      SELECT COUNT(*) AS key_rows
      FROM raw_snapshot
      GROUP BY
        ANO_RAW,
        TIPO_PERIODO,
        MES,
        COALESCE(NULLIF(CC_BASE_REPORTE, ''), NULLIF(CC_ORIGEN, ''))
      HAVING COUNT(*) > 1
    )
  );

  SET v_invalid_dimension_rows = (
    SELECT COUNTIF(
      SAFE_CAST(ANO_RAW AS INT64) IS NULL OR
      COALESCE(NULLIF(CC_BASE_REPORTE, ''), NULLIF(CC_ORIGEN, '')) IS NULL OR
      COALESCE(NULLIF(TIENDA_HOMOLOGADA, ''), NULLIF(TIENDA_ORIGEN, '')) IS NULL OR
      REGEXP_CONTAINS(UPPER(CONCAT(
        COALESCE(CC_ORIGEN, ''), '|', COALESCE(CC_BASE_REPORTE, ''), '|',
        COALESCE(TIENDA_ORIGEN, ''), '|', COALESCE(TIENDA_HOMOLOGADA, '')
      )), r'#N/A|#REF|#VALUE|ARRAY RESULT|ERROR')
    )
    FROM raw_snapshot
  );

  SET v_invalid_period_rows = (
    SELECT COUNTIF(
      SAFE_CAST(ANO_RAW AS INT64) NOT IN (2024, 2025, 2026, 2027) OR
      TIPO_PERIODO NOT IN ('ANUAL', 'MENSUAL') OR
      (TIPO_PERIODO = 'ANUAL' AND MES != 'TOTAL') OR
      (TIPO_PERIODO = 'MENSUAL' AND MES NOT IN (
        'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
        'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
      ))
    )
    FROM raw_snapshot
  );

  SET v_invalid_measure_rows = (
    SELECT COUNTIF(
      (VENTAS_RAW != '' AND parse_bl_float(VENTAS_RAW) IS NULL) OR
      (MARGEN_RAW != '' AND parse_bl_float(MARGEN_RAW) IS NULL) OR
      (REMUNERACIONES_RAW != '' AND parse_bl_float(REMUNERACIONES_RAW) IS NULL) OR
      (ARRIENDOS_RAW != '' AND parse_bl_float(ARRIENDOS_RAW) IS NULL) OR
      (GASTOS_GRAL_RAW != '' AND parse_bl_float(GASTOS_GRAL_RAW) IS NULL) OR
      (DEPRECIACION_RAW != '' AND parse_bl_float(DEPRECIACION_RAW) IS NULL) OR
      (FEE_COMERCIAL_RAW != '' AND parse_bl_float(FEE_COMERCIAL_RAW) IS NULL) OR
      (FEE_ADM_RAW != '' AND parse_bl_float(FEE_ADM_RAW) IS NULL) OR
      (COSTO_OPERACIONAL_RAW != '' AND parse_bl_float(COSTO_OPERACIONAL_RAW) IS NULL) OR
      (RESULTADO_NO_OPERACIONAL_RAW != '' AND parse_bl_float(RESULTADO_NO_OPERACIONAL_RAW) IS NULL) OR
      (UTILIDAD_FINAL_RAW != '' AND parse_bl_float(UTILIDAD_FINAL_RAW) IS NULL) OR
      (FOUR_WALLS_RAW != '' AND parse_bl_float(FOUR_WALLS_RAW) IS NULL)
    )
    FROM raw_snapshot
  );

  SET v_missing_annual_years = ARRAY(
    SELECT required_year
    FROM UNNEST([2024, 2025, 2026, 2027]) AS required_year
    WHERE NOT EXISTS (
      SELECT 1
      FROM raw_snapshot
      WHERE SAFE_CAST(ANO_RAW AS INT64) = required_year
        AND TIPO_PERIODO = 'ANUAL'
        AND MES = 'TOTAL'
    )
  );

  SET v_missing_monthly_years = ARRAY(
    SELECT required_year
    FROM UNNEST([2026, 2027]) AS required_year
    WHERE NOT EXISTS (
      SELECT 1
      FROM raw_snapshot
      WHERE SAFE_CAST(ANO_RAW AS INT64) = required_year
        AND TIPO_PERIODO = 'MENSUAL'
    )
  );

  SET v_validation_message = CONCAT(
    IF(v_source_rows = 0, 'La fuente B&L no contiene registros. ', ''),
    IF(v_duplicate_rows > 0, FORMAT('Se detectaron %d claves duplicadas. ', v_duplicate_rows), ''),
    IF(v_invalid_dimension_rows > 0, FORMAT('Se detectaron %d filas con dimensiones invalidas. ', v_invalid_dimension_rows), ''),
    IF(v_invalid_period_rows > 0, FORMAT('Se detectaron %d filas con periodos invalidos. ', v_invalid_period_rows), ''),
    IF(v_invalid_measure_rows > 0, FORMAT('Se detectaron %d filas con medidas invalidas. ', v_invalid_measure_rows), ''),
    IF(
      v_previous_rows > 0 AND v_source_rows < CAST(FLOOR(v_previous_rows * 0.8) AS INT64),
      FORMAT('La fuente disminuyo de %d a %d filas y supera el limite de seguridad de 20%%. ', v_previous_rows, v_source_rows),
      ''
    ),
    IF(
      ARRAY_LENGTH(v_missing_annual_years) > 0,
      FORMAT(
        'Faltan periodos anuales: %s. ',
        (SELECT STRING_AGG(CAST(year AS STRING), ', ' ORDER BY year) FROM UNNEST(v_missing_annual_years) AS year)
      ),
      ''
    ),
    IF(
      ARRAY_LENGTH(v_missing_monthly_years) > 0,
      FORMAT(
        'Faltan aperturas mensuales: %s. ',
        (SELECT STRING_AGG(CAST(year AS STRING), ', ' ORDER BY year) FROM UNNEST(v_missing_monthly_years) AS year)
      ),
      ''
    )
  );

  IF v_validation_message != '' THEN
    RAISE USING MESSAGE = v_validation_message;
  END IF;

  CREATE TEMP TABLE bl_profitability_source_snapshot AS
  SELECT
    SAFE_CAST(ANO_RAW AS INT64) AS ANO,
    MES,
    TIPO_PERIODO,
    NULLIF(CC_ORIGEN, '') AS CC_ORIGEN,
    NULLIF(CC_BASE_REPORTE, '') AS CC_BASE_REPORTE,
    NULLIF(CADENA, '') AS CADENA,
    NULLIF(TIENDA_ORIGEN, '') AS TIENDA_ORIGEN,
    NULLIF(TIENDA_HOMOLOGADA, '') AS TIENDA_HOMOLOGADA,
    NULLIF(ESTADO_HOMOLOGACION, '') AS ESTADO_HOMOLOGACION,
    NULLIF(FUENTE, '') AS FUENTE,
    COALESCE(parse_bl_float(VENTAS_RAW), 0) AS VENTAS,
    COALESCE(parse_bl_float(MARGEN_RAW), 0) AS MARGEN,
    COALESCE(parse_bl_float(REMUNERACIONES_RAW), 0) AS REMUNERACIONES,
    COALESCE(parse_bl_float(ARRIENDOS_RAW), 0) AS ARRIENDOS,
    COALESCE(parse_bl_float(GASTOS_GRAL_RAW), 0) AS GASTOS_GRAL,
    COALESCE(parse_bl_float(DEPRECIACION_RAW), 0) AS DEPRECIACION,
    COALESCE(parse_bl_float(FEE_COMERCIAL_RAW), 0) AS FEE_COMERCIAL,
    COALESCE(parse_bl_float(FEE_ADM_RAW), 0) AS FEE_ADM,
    COALESCE(parse_bl_float(COSTO_OPERACIONAL_RAW), 0) AS COSTO_OPERACIONAL,
    COALESCE(parse_bl_float(RESULTADO_NO_OPERACIONAL_RAW), 0) AS RESULTADO_NO_OPERACIONAL,
    COALESCE(parse_bl_float(UTILIDAD_FINAL_RAW), 0) AS UTILIDAD_FINAL,
    parse_bl_float(FOUR_WALLS_RAW) AS FOUR_WALLS
  FROM raw_snapshot;

  -- TRUNCATE e INSERT forman una unica publicacion atomica. Un error revierte
  -- ambos pasos y deja disponible la instantanea anterior.
  BEGIN
    BEGIN TRANSACTION;

    TRUNCATE TABLE
      `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL`;

    INSERT INTO
      `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL`
    (
      ANO, MES, TIPO_PERIODO, CC_ORIGEN, CC_BASE_REPORTE, CADENA,
      TIENDA_ORIGEN, TIENDA_HOMOLOGADA, ESTADO_HOMOLOGACION, FUENTE,
      VENTAS, MARGEN, REMUNERACIONES, ARRIENDOS, GASTOS_GRAL,
      DEPRECIACION, FEE_COMERCIAL, FEE_ADM, COSTO_OPERACIONAL,
      RESULTADO_NO_OPERACIONAL, UTILIDAD_FINAL, FOUR_WALLS, SYNCED_AT
    )
    SELECT
      ANO, MES, TIPO_PERIODO, CC_ORIGEN, CC_BASE_REPORTE, CADENA,
      TIENDA_ORIGEN, TIENDA_HOMOLOGADA, ESTADO_HOMOLOGACION, FUENTE,
      VENTAS, MARGEN, REMUNERACIONES, ARRIENDOS, GASTOS_GRAL,
      DEPRECIACION, FEE_COMERCIAL, FEE_ADM, COSTO_OPERACIONAL,
      RESULTADO_NO_OPERACIONAL, UTILIDAD_FINAL, FOUR_WALLS,
      CURRENT_TIMESTAMP()
    FROM bl_profitability_source_snapshot;

    COMMIT TRANSACTION;
  EXCEPTION WHEN ERROR THEN
    ROLLBACK TRANSACTION;
    RAISE;
  END;
END;
