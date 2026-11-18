import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(new URL("../sql/refresh-profitability-forecast.sql", import.meta.url), "utf8");
const deployScript = readFileSync(new URL("../scripts/deploy-profitability-forecast-refresh.mjs", import.meta.url), "utf8");

test("the forecast refresh validates a temporary snapshot before atomically replacing the native rows", () => {
  assert.match(sql, /TB_EXT_FORECAST_ANUAL_MARCA_CANAL/);
  assert.match(sql, /CREATE TEMP TABLE source_snapshot AS/);
  assert.doesNotMatch(sql, /TB_FORECAST_ANUAL_MARCA_CANAL_STAGING/);
  assert.doesNotMatch(sql, /TB_FORECAST_ANUAL_MARCA_CANAL_AUDIT/);
  assert.match(sql, /v_duplicate_rows/);
  assert.match(sql, /v_null_dimension_rows/);
  assert.match(sql, /v_invalid_period_rows/);
  assert.match(sql, /v_invalid_measure_rows/);
  assert.match(sql, /v_invalid_consolidated_rows/);
  assert.match(sql, /v_consolidated_tolerance FLOAT64 DEFAULT 0\.01/);
  assert.match(sql, /WHERE COALESCE\([\s\S]*UTILIDAD_NETA AS STRING[\s\S]*\) IS NOT NULL;/);
  assert.match(sql, /ARRAY_AGG\(DISTINCT ANO_2 IGNORE NULLS ORDER BY ANO_2\)/);
  assert.match(sql, /ARRAY_AGG\(DISTINCT NEGOCIO_DETALLE IGNORE NULLS ORDER BY NEGOCIO_DETALLE\)/);
  assert.match(sql, /WHERE UPPER\(TRIM\(MARCA\)\) != 'CONSOLIDADO'/);
  assert.match(sql, /ABS\(consolidated_sales - channel_sales\) > v_consolidated_tolerance/);
  assert.match(sql, /ABS\(consolidated_margin - channel_margin\) > v_consolidated_tolerance/);
  assert.match(sql, /ABS\(consolidated_operating_cost - channel_operating_cost\) > v_consolidated_tolerance/);
  assert.match(sql, /ABS\(consolidated_operating_result - channel_operating_result\) > v_consolidated_tolerance/);
  assert.match(sql, /limite de seguridad de 20%%/);
  assert.match(sql, /BEGIN TRANSACTION;[\s\S]*TRUNCATE TABLE[\s\S]*INSERT INTO[\s\S]*COMMIT TRANSACTION;/);
});

test("the deployment creates an idempotent scheduled query with selectable credentials", () => {
  assert.match(deployScript, /every 5 minutes/);
  assert.match(deployScript, /--data_source=scheduled_query/);
  assert.match(deployScript, /FORECAST_REFRESH_AUTH_MODE/);
  assert.match(deployScript, /authMode === "service-account"/);
  assert.match(deployScript, /--service_account_name=/);
  assert.match(deployScript, /--update_credentials=true/);
  assert.match(deployScript, /credentialUpdateArgs = authMode === "service-account"/);
  assert.match(deployScript, /transfers\.find\(\(transfer\) => transfer\.displayName === displayName\)/);
  assert.match(deployScript, /--dry-run/);
  assert.match(deployScript, /--run-now/);
  assert.match(deployScript, /const isNewSchedule = !existing\?\.name/);
  assert.match(deployScript, /runNow && !isNewSchedule/);
  assert.match(deployScript, /se omite una segunda ejecucion concurrente/);
  assert.match(deployScript, /emailPreferences: \{ enableFailureEmail: true \}/);
  assert.match(deployScript, /updateMask=email_preferences/);
});
