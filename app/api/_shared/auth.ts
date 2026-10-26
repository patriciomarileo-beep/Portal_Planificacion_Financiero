import { parameter, runQuery, tablePath, type BigQueryRowsPayload } from "./bigquery";
import { readSession } from "./session";
import { HttpError } from "./http";
import { normalizedUserRole } from "./user-roles";

export const activeUser = async (email: string) => {
  const payload = await runQuery<BigQueryRowsPayload>(
    `SELECT id_persona, nombre, apellido_paterno, apellido_materno, rol FROM \`${tablePath()}\`
     WHERE LOWER(mail) = @email AND LOWER(CAST(activo AS STRING)) IN ('1', 'true', 'activo', 'activa') LIMIT 2`,
    [parameter("email", "STRING", email)],
  );
  if (payload.rows?.length !== 1) return null;
  const values = payload.rows[0].f.map((cell) => String(cell.v ?? ""));
  const role = normalizedUserRole(values[4]);
  if (!values[0] || !role) return null;
  return { email, personId: values[0], name: values.slice(1, 4).filter(Boolean).join(" ").trim() || email, role };
};

export const requireAuth = async (request: Request, admin = false) => {
  const session = await readSession(request.headers.get("cookie"));
  if (!session) throw new HttpError(401, "Sesión requerida.");
  // Re-read permissions so deactivation and role changes apply to existing sessions.
  const user = await activeUser(session.email);
  if (!user || user.personId !== session.personId) throw new HttpError(401, "Sesión no válida.");
  if (admin && user.role.trim().toUpperCase() !== "ADMINISTRADOR") throw new HttpError(403, "Acceso restringido a administradores.");
  return user;
};
