-- Consolida las fuentes nativas de B&L sin incorporar 2026P.
--
-- Escenarios publicados dinamicamente:
-- - YYYR: todos los anos reales disponibles.
-- - YYYYE: ano calendario activo; REAL hasta el ultimo mes disponible y
--   FORECAST para los meses restantes.
-- - YYYYP: siguiente ano mensual disponible en TB_RENTABILIDAD_BL.
--
-- No crea staging ni auditoria persistente. Un error revierte la publicacion.

CREATE OR REPLACE PROCEDURE
  `forus-analitica-test-datalake.silver.sp_refresh_rentabilidad_bl_consolidada`()
OPTIONS (strict_mode = false)
BEGIN
  DECLARE v_previous_rows INT64 DEFAULT 0;
  DECLARE v_source_rows INT64 DEFAULT 0;
  DECLARE v_estimated_year INT64 DEFAULT EXTRACT(YEAR FROM CURRENT_DATE('America/Santiago'));
  DECLARE v_actual_cutoff_month INT64 DEFAULT 0;
  DECLARE v_projection_year INT64 DEFAULT NULL;
  DECLARE v_duplicate_rows INT64 DEFAULT 0;
  DECLARE v_invalid_rows INT64 DEFAULT 0;
  DECLARE v_invalid_month_coverage INT64 DEFAULT 0;
  DECLARE v_invalid_estimate_split INT64 DEFAULT 0;
  DECLARE v_validation_message STRING DEFAULT '';

  SET v_previous_rows = (
    SELECT COUNT(*)
    FROM `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL_CONSOLIDADA`
  );

  -- El corte real se obtiene desde la fuente contable. Si el ano acaba de
  -- comenzar y aun no existe un mes real, el valor queda en cero y el
  -- escenario estimado se construye completamente con Forecast.
  SET v_actual_cutoff_month = (
    SELECT COALESCE(MAX(SAFE_CAST(MES AS INT64)), 0)
    FROM `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EST_RE_HISTORICO_TIENDA`
    WHERE SAFE_CAST(ANO AS INT64) = v_estimated_year
      AND UPPER(TRIM(PPTO)) = CONCAT('REAL ', RIGHT(CAST(v_estimated_year AS STRING), 2))
      AND SAFE_CAST(MES AS INT64) BETWEEN 1 AND 12
  );

  -- Se utiliza el primer ano mensual posterior al ano activo. Si aun no fue
  -- publicado, el modelo mantiene R y E sin inventar una proyeccion.
  SET v_projection_year = (
    SELECT MIN(ANO)
    FROM `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL`
    WHERE TIPO_PERIODO = 'MENSUAL'
      AND ANO > v_estimated_year
  );

  CREATE TEMP FUNCTION month_number(month_name STRING)
  RETURNS INT64
  AS (
    CASE UPPER(TRIM(month_name))
      WHEN 'ENERO' THEN 1
      WHEN 'FEBRERO' THEN 2
      WHEN 'MARZO' THEN 3
      WHEN 'ABRIL' THEN 4
      WHEN 'MAYO' THEN 5
      WHEN 'JUNIO' THEN 6
      WHEN 'JULIO' THEN 7
      WHEN 'AGOSTO' THEN 8
      WHEN 'SEPTIEMBRE' THEN 9
      WHEN 'OCTUBRE' THEN 10
      WHEN 'NOVIEMBRE' THEN 11
      WHEN 'DICIEMBRE' THEN 12
    END
  );

  -- El mapeo de la tabla B&L permite conservar el CC de origen y reportar con
  -- la homologacion vigente, incluso para los periodos historicos.
  CREATE TEMP TABLE cc_mapping AS
  SELECT
    CC_ORIGEN,
    mapping.CC_BASE_REPORTE,
    mapping.CADENA,
    mapping.TIENDA_HOMOLOGADA
  FROM (
    SELECT
      NULLIF(TRIM(CC_ORIGEN), '') AS CC_ORIGEN,
      ARRAY_AGG(
        STRUCT(
          NULLIF(TRIM(CC_BASE_REPORTE), '') AS CC_BASE_REPORTE,
          NULLIF(TRIM(CADENA), '') AS CADENA,
          COALESCE(NULLIF(TRIM(TIENDA_HOMOLOGADA), ''), NULLIF(TRIM(TIENDA_ORIGEN), '')) AS TIENDA_HOMOLOGADA
        )
        ORDER BY ANO DESC, SYNCED_AT DESC
        LIMIT 1
      )[OFFSET(0)] AS mapping
    FROM `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL`
    WHERE NULLIF(TRIM(CC_ORIGEN), '') IS NOT NULL
    GROUP BY CC_ORIGEN
  );

  CREATE TEMP TABLE historical_real AS
  SELECT
    DATE(SAFE_CAST(h.ANO AS INT64), SAFE_CAST(h.MES AS INT64), 1) AS PERIODO,
    SAFE_CAST(h.ANO AS INT64) AS ANO,
    SAFE_CAST(h.MES AS INT64) AS MES,
    CAST(h.CC AS STRING) AS CC_ORIGEN,
    COALESCE(m.CC_BASE_REPORTE, CAST(h.CC AS STRING)) AS CC_REPORTE,
    COALESCE(m.CADENA, NULLIF(TRIM(h.CADENA), '')) AS CADENA,
    NULLIF(TRIM(h.TIENDA), '') AS TIENDA_ORIGEN,
    COALESCE(m.TIENDA_HOMOLOGADA, NULLIF(TRIM(h.TIENDA), '')) AS TIENDA_REPORTE,
    COALESCE(h.VENTA, 0) AS VENTAS,
    COALESCE(h.MARGEN, 0) AS MARGEN,
    COALESCE(h.REM_TOTAL, 0) AS REMUNERACIONES,
    COALESCE(h.ARRIENDOS, 0) AS ARRIENDOS,
    COALESCE(h.GASTOS_GENERALES, 0) AS GASTOS_GRAL,
    COALESCE(h.TOTAL_DEPRECIACION, 0) AS DEPRECIACION,
    COALESCE(h.FEE_COM, 0) AS FEE_COMERCIAL,
    COALESCE(h.FEE_ADM, 0) AS FEE_ADM,
    COALESCE(h.COSTO_OPERACIONAL, 0) AS COSTO_OPERACIONAL,
    COALESCE(h.RNOP, 0) AS RESULTADO_NO_OPERACIONAL,
    COALESCE(h.UTILIDAD_FINAL, 0) AS UTILIDAD_FINAL,
    h.FOUR_WALL AS FOUR_WALLS,
    'forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EST_RE_HISTORICO_TIENDA' AS FUENTE,
    TIMESTAMP(h.FECHA_EJECUCION) AS SOURCE_SYNCED_AT
  FROM `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EST_RE_HISTORICO_TIENDA` h
  LEFT JOIN cc_mapping m
    ON m.CC_ORIGEN = CAST(h.CC AS STRING)
  WHERE SAFE_CAST(h.ANO AS INT64) <= v_estimated_year
    AND SAFE_CAST(h.ANO AS INT64) >= 2000
    AND SAFE_CAST(h.MES AS INT64) BETWEEN 1 AND 12
    AND UPPER(TRIM(h.PPTO)) = CONCAT('REAL ', RIGHT(TRIM(h.ANO), 2))
    AND (
      SAFE_CAST(h.ANO AS INT64) < v_estimated_year OR
      SAFE_CAST(h.MES AS INT64) <= v_actual_cutoff_month
    );

  CREATE TEMP TABLE raw_union AS
  SELECT
    *, CONCAT(CAST(ANO AS STRING), 'R') AS ESCENARIO, 'REAL' AS TIPO_DATO
  FROM historical_real

  UNION ALL

  SELECT
    *, CONCAT(CAST(v_estimated_year AS STRING), 'E') AS ESCENARIO, 'REAL' AS TIPO_DATO
  FROM historical_real
  WHERE ANO = v_estimated_year
    AND MES <= v_actual_cutoff_month

  UNION ALL

  SELECT
    DATE(bl.ANO, month_number(bl.MES), 1) AS PERIODO,
    bl.ANO,
    month_number(bl.MES) AS MES,
    COALESCE(NULLIF(TRIM(bl.CC_ORIGEN), ''), NULLIF(TRIM(bl.CC_BASE_REPORTE), '')) AS CC_ORIGEN,
    COALESCE(NULLIF(TRIM(bl.CC_BASE_REPORTE), ''), NULLIF(TRIM(bl.CC_ORIGEN), '')) AS CC_REPORTE,
    NULLIF(TRIM(bl.CADENA), '') AS CADENA,
    NULLIF(TRIM(bl.TIENDA_ORIGEN), '') AS TIENDA_ORIGEN,
    COALESCE(NULLIF(TRIM(bl.TIENDA_HOMOLOGADA), ''), NULLIF(TRIM(bl.TIENDA_ORIGEN), '')) AS TIENDA_REPORTE,
    bl.VENTAS,
    bl.MARGEN,
    bl.REMUNERACIONES,
    bl.ARRIENDOS,
    bl.GASTOS_GRAL,
    bl.DEPRECIACION,
    bl.FEE_COMERCIAL,
    bl.FEE_ADM,
    bl.COSTO_OPERACIONAL,
    bl.RESULTADO_NO_OPERACIONAL,
    bl.UTILIDAD_FINAL,
    bl.FOUR_WALLS,
    'forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL' AS FUENTE,
    bl.SYNCED_AT AS SOURCE_SYNCED_AT,
    IF(
      bl.ANO = v_estimated_year,
      CONCAT(CAST(v_estimated_year AS STRING), 'E'),
      CONCAT(CAST(bl.ANO AS STRING), 'P')
    ) AS ESCENARIO,
    IF(bl.ANO = v_estimated_year, 'FORECAST', 'PROYECCION') AS TIPO_DATO
  FROM `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL` bl
  WHERE bl.TIPO_PERIODO = 'MENSUAL'
    AND (
      (
        bl.ANO = v_estimated_year AND
        month_number(bl.MES) BETWEEN v_actual_cutoff_month + 1 AND 12
      ) OR
      (
        v_projection_year IS NOT NULL AND
        bl.ANO = v_projection_year AND
        month_number(bl.MES) BETWEEN 1 AND 12
      )
    );

  SET v_source_rows = (SELECT COUNT(*) FROM raw_union);

  -- Se agrega despues de homologar CC para que una migracion de centro de
  -- costo no produzca dos filas del mismo escenario, mes y tienda reportada.
  CREATE TEMP TABLE bl_consolidated_source_snapshot AS
  SELECT
    r.PERIODO,
    r.ANO,
    r.MES,
    r.ESCENARIO,
    STRING_AGG(DISTINCT r.TIPO_DATO, ' / ' ORDER BY r.TIPO_DATO) AS TIPO_DATO,
    STRING_AGG(DISTINCT r.CC_ORIGEN, ' / ' ORDER BY r.CC_ORIGEN) AS CC_ORIGEN,
    r.CC_REPORTE,
    ARRAY_AGG(r.CADENA IGNORE NULLS ORDER BY r.SOURCE_SYNCED_AT DESC LIMIT 1)[SAFE_OFFSET(0)] AS CADENA,
    ARRAY_AGG(r.TIENDA_ORIGEN IGNORE NULLS ORDER BY r.SOURCE_SYNCED_AT DESC LIMIT 1)[SAFE_OFFSET(0)] AS TIENDA_ORIGEN,
    ARRAY_AGG(r.TIENDA_REPORTE IGNORE NULLS ORDER BY r.SOURCE_SYNCED_AT DESC LIMIT 1)[SAFE_OFFSET(0)] AS TIENDA_REPORTE,
    SUM(r.VENTAS) AS VENTAS,
    SUM(r.MARGEN) AS MARGEN,
    SUM(r.REMUNERACIONES) AS REMUNERACIONES,
    SUM(r.ARRIENDOS) AS ARRIENDOS,
    SUM(r.GASTOS_GRAL) AS GASTOS_GRAL,
    SUM(r.DEPRECIACION) AS DEPRECIACION,
    SUM(r.FEE_COMERCIAL) AS FEE_COMERCIAL,
    SUM(r.FEE_ADM) AS FEE_ADM,
    SUM(r.COSTO_OPERACIONAL) AS COSTO_OPERACIONAL,
    SUM(r.RESULTADO_NO_OPERACIONAL) AS RESULTADO_NO_OPERACIONAL,
    SUM(r.UTILIDAD_FINAL) AS UTILIDAD_FINAL,
    IF(COUNTIF(r.FOUR_WALLS IS NOT NULL) = 0, NULL, SUM(COALESCE(r.FOUR_WALLS, 0))) AS FOUR_WALLS,
    STRING_AGG(DISTINCT d.CLASIFICACION_RAW, ' / ' ORDER BY d.CLASIFICACION_RAW) AS CLASIFICACION_RAW,
    CASE
      WHEN COUNTIF(d.CLASIFICACION = 'REMODELACION') > 0 THEN 'REMODELACION'
      WHEN COUNTIF(d.CLASIFICACION = 'SSS') > 0 THEN 'SSS'
      WHEN COUNTIF(d.CLASIFICACION = 'NS') > 0 THEN 'NS'
      ELSE 'SIN CLASIFICAR'
    END AS CLASIFICACION,
    STRING_AGG(DISTINCT r.FUENTE, ' / ' ORDER BY r.FUENTE) AS FUENTE,
    MAX(r.SOURCE_SYNCED_AT) AS SOURCE_SYNCED_AT
  FROM raw_union r
  LEFT JOIN `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_CLASIFICACION_TIENDA` d
    ON d.PERIODO = r.PERIODO
   AND d.CC = r.CC_ORIGEN
  GROUP BY r.PERIODO, r.ANO, r.MES, r.ESCENARIO, r.CC_REPORTE;

  SET v_duplicate_rows = (
    SELECT COALESCE(SUM(key_rows - 1), 0)
    FROM (
      SELECT COUNT(*) AS key_rows
      FROM bl_consolidated_source_snapshot
      GROUP BY ESCENARIO, PERIODO, CC_REPORTE
      HAVING COUNT(*) > 1
    )
  );

  SET v_invalid_rows = (
    SELECT COUNTIF(
      PERIODO IS NULL OR
      ANO IS NULL OR
      MES NOT BETWEEN 1 AND 12 OR
      NOT REGEXP_CONTAINS(ESCENARIO, r'^\d{4}[REP]$') OR
      CC_REPORTE IS NULL OR
      TIENDA_REPORTE IS NULL OR
      VENTAS IS NULL OR IS_NAN(VENTAS) OR IS_INF(VENTAS) OR
      MARGEN IS NULL OR IS_NAN(MARGEN) OR IS_INF(MARGEN)
    )
    FROM bl_consolidated_source_snapshot
  );

  SET v_invalid_month_coverage = (
    WITH expected AS (
      SELECT
        CONCAT(CAST(ANO AS STRING), 'R') AS escenario,
        IF(ANO < v_estimated_year, 12, v_actual_cutoff_month) AS months
      FROM (SELECT DISTINCT ANO FROM historical_real)

      UNION ALL

      SELECT CONCAT(CAST(v_estimated_year AS STRING), 'E'), 12

      UNION ALL

      SELECT CONCAT(CAST(v_projection_year AS STRING), 'P'), 12
      FROM (SELECT 1)
      WHERE v_projection_year IS NOT NULL
    ), actual AS (
      SELECT ESCENARIO, COUNT(DISTINCT MES) months
      FROM bl_consolidated_source_snapshot
      GROUP BY ESCENARIO
    )
    SELECT COUNTIF(actual.months IS DISTINCT FROM expected.months)
    FROM expected
    LEFT JOIN actual USING (escenario)
  );

  SET v_invalid_estimate_split = (
    SELECT COUNTIF(
      ESCENARIO = CONCAT(CAST(v_estimated_year AS STRING), 'E') AND
      (
        (MES <= v_actual_cutoff_month AND TIPO_DATO != 'REAL') OR
        (MES > v_actual_cutoff_month AND TIPO_DATO != 'FORECAST')
      )
    )
    FROM bl_consolidated_source_snapshot
  );

  SET v_validation_message = CONCAT(
    IF(v_source_rows = 0, 'La consolidacion B&L no genero registros. ', ''),
    IF(v_duplicate_rows > 0, FORMAT('Se detectaron %d claves duplicadas. ', v_duplicate_rows), ''),
    IF(v_invalid_rows > 0, FORMAT('Se detectaron %d filas invalidas. ', v_invalid_rows), ''),
    IF(v_invalid_month_coverage > 0, FORMAT('Se detectaron %d escenarios con cobertura mensual incompleta. ', v_invalid_month_coverage), ''),
    IF(
      v_invalid_estimate_split > 0,
      FORMAT(
        'Se detectaron %d filas que rompen el corte REAL/FORECAST del escenario %dE. ',
        v_invalid_estimate_split,
        v_estimated_year
      ),
      ''
    ),
    IF(
      v_previous_rows > 0 AND
      (SELECT COUNT(*) FROM bl_consolidated_source_snapshot) < CAST(FLOOR(v_previous_rows * 0.8) AS INT64),
      'La consolidacion disminuyo mas de 20% respecto de la carga anterior. ',
      ''
    )
  );

  IF v_validation_message != '' THEN
    RAISE USING MESSAGE = v_validation_message;
  END IF;

  BEGIN
    BEGIN TRANSACTION;

    TRUNCATE TABLE
      `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL_CONSOLIDADA`;

    INSERT INTO
      `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL_CONSOLIDADA`
    SELECT
      PERIODO, ANO, MES, ESCENARIO, TIPO_DATO, CC_ORIGEN, CC_REPORTE,
      CADENA, TIENDA_ORIGEN, TIENDA_REPORTE, VENTAS, MARGEN,
      REMUNERACIONES, ARRIENDOS, GASTOS_GRAL, DEPRECIACION,
      FEE_COMERCIAL, FEE_ADM, COSTO_OPERACIONAL,
      RESULTADO_NO_OPERACIONAL, UTILIDAD_FINAL, FOUR_WALLS,
      CLASIFICACION_RAW, CLASIFICACION, FUENTE, SOURCE_SYNCED_AT,
      CURRENT_TIMESTAMP()
    FROM bl_consolidated_source_snapshot;

    COMMIT TRANSACTION;
  EXCEPTION WHEN ERROR THEN
    ROLLBACK TRANSACTION;
    RAISE;
  END;
END;

-- Punto unico recomendado para la consulta programada. Actualiza primero la
-- fuente nativa de forecast, luego la dimension mensual y finalmente publica
-- el hecho consolidado. El orden evita que el consolidado use datos obsoletos.
CREATE OR REPLACE PROCEDURE
  `forus-analitica-test-datalake.silver.sp_refresh_modelo_rentabilidad_bl`()
OPTIONS (strict_mode = false)
BEGIN
  CALL `forus-analitica-test-datalake.silver.sp_refresh_rentabilidad_bl`();
  CALL `forus-analitica-test-datalake.silver.sp_refresh_clasificacion_tienda_bl`();
  CALL `forus-analitica-test-datalake.silver.sp_refresh_rentabilidad_bl_consolidada`();
END;
