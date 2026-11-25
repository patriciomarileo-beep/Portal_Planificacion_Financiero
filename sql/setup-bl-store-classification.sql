-- Preparacion manual de la dimension mensual de clasificacion de tiendas B&L.
--
-- IMPORTANTE:
-- 1. Ejecutar una sola vez en BigQuery, ubicacion us-east4.
-- 2. La identidad que ejecute la sincronizacion debe tener acceso de lector al
--    Google Sheet usado por la tabla externa.
-- 3. Este archivo solo crea estructuras; no publica datos.

CREATE OR REPLACE EXTERNAL TABLE
  `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EXT_CLASIFICACION_TIENDA`
(
  FECHA STRING,
  ANO STRING,
  MES STRING,
  CC STRING,
  TIENDA STRING,
  TIPO STRING,
  MOVIMIENTO STRING,
  FECHA_FIN STRING,
  MESES_CIERRE STRING,
  VENTA_MES STRING,
  ARCHIVO_FUENTE STRING,
  REGLA_APLICADA STRING,
  TIPO_FUENTE STRING,
  PRIORIDAD STRING,
  ESTADO_FUENTE STRING,
  CADENA STRING,
  HOJA_ORIGEN STRING
)
OPTIONS (
  format = 'GOOGLE_SHEETS',
  uris = ['https://docs.google.com/spreadsheets/d/1bucFNNPZeLg33XT8LWLg0gBG4Ih6Y4wxmfwszKn5stM'],
  sheet_range = "'Movimiento tiendas'!A:Q",
  skip_leading_rows = 15,
  description = 'Puente de solo lectura hacia Movimiento tiendas para clasificar SSS, NS y remodelaciones por mes y CC.'
);

CREATE TABLE IF NOT EXISTS
  `forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_CLASIFICACION_TIENDA`
(
  PERIODO DATE NOT NULL,
  ANO INT64 NOT NULL,
  MES INT64 NOT NULL,
  CC STRING NOT NULL,
  TIENDA STRING,
  CADENA STRING,
  CLASIFICACION_RAW STRING NOT NULL,
  CLASIFICACION STRING NOT NULL,
  MOVIMIENTO STRING,
  TIPO_FUENTE STRING,
  PRIORIDAD INT64 NOT NULL,
  ESTADO_FUENTE STRING,
  ARCHIVO_FUENTE STRING,
  HOJA_ORIGEN STRING,
  SYNCED_AT TIMESTAMP NOT NULL
)
PARTITION BY DATE_TRUNC(PERIODO, YEAR)
CLUSTER BY ANO, MES, CC, CLASIFICACION
OPTIONS (
  description = 'Clasificacion mensual normalizada de tiendas B&L. Grano: periodo y centro de costo.'
);
