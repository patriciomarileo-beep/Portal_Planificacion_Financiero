import { parameter, runQuery, tablePath } from "../../_shared/bigquery";
import { createSessionCookie } from "../../_shared/session";

export const runtime = "nodejs";

type BigQueryUserPayload = {
  rows?: { f: { v: unknown }[] }[];
};

const json = (body: unknown, init?: ResponseInit) =>
  Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  });

const cellText = (cell: { v: unknown } | undefined) => String(cell?.v ?? "");

export async function POST(request: Request) {
  try {
    const { email: rawEmail } = await request.json() as { email?: string };
    const email = String(rawEmail ?? "").trim().toLowerCase();
    if (!email.endsWith("@forus.cl")) {
      return json({ error: "Debes usar un correo corporativo @forus.cl." }, { status: 403 });
    }

    const userPayload = await runQuery<BigQueryUserPayload>(
      `SELECT id_persona, nombre, apellido_paterno, apellido_materno, rol, activo
       FROM \`${tablePath()}\`
       WHERE LOWER(mail) = @email
         AND CAST(activo AS STRING) IN ('1', 'true', 'TRUE', 'Activo', 'ACTIVO', 'activa', 'ACTIVA')
       LIMIT 1`,
      [parameter("email", "STRING", email)],
    );

    const row = userPayload.rows?.[0];
    if (!row) return json({ error: "El correo no esta activo en la tabla de usuarios." }, { status: 403 });

    const name = [
      cellText(row.f[1]),
      cellText(row.f[2]),
      cellText(row.f[3]),
    ].filter(Boolean).join(" ").trim() || email;
    const role = cellText(row.f[4]);
    const personId = cellText(row.f[0]);
    const cookie = await createSessionCookie({ email, name, role, personId });

    return json(
      { user: { email, name, role, personId } },
      { headers: { "set-cookie": cookie } },
    );
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error desconocido al iniciar sesion." }, { status: 500 });
  }
}
