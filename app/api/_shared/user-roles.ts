import { runQuery, validatedTablePath, type BigQueryRowsPayload } from "./bigquery";

const defaultRolesTable = "forus-cl-planificacion.Planificacion.ft_cl_planificacion_TB_ROLES_PLT_FINAN";

export const getUserRoles = async (): Promise<string[]> => {
  const table = validatedTablePath(process.env.BIGQUERY_ROLES_TABLE || defaultRolesTable);
  const payload = await runQuery<BigQueryRowsPayload>(
    `SELECT UPPER(TRIM(NOMBRE)) AS nombre FROM \`${table}\`
     WHERE NOMBRE IS NOT NULL AND TRIM(NOMBRE) != '' ORDER BY ID`,
  );
  return [...new Set((payload.rows ?? []).map(row => String(row.f[0]?.v ?? "").trim()).filter(Boolean))];
};

export const normalizedUserRole = (value: unknown, allowedRoles: readonly string[]) => {
  if (typeof value !== "string") return null;
  const role = value.trim().toUpperCase();
  return allowedRoles.find(allowed => allowed === role) ?? null;
};
