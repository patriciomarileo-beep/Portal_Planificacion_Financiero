import { createSessionCookie } from "../../_shared/session";
import { parameter, runQuery, tablePath } from "../../_shared/bigquery";

export const runtime = "nodejs";

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string;
  hd?: string;
  name?: string;
  error_description?: string;
};

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
    const { credential } = await request.json() as { credential?: string };
    if (!credential) return json({ error: "Falta credencial de Google." }, { status: 400 });

    const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const token = await tokenResponse.json() as GoogleTokenInfo;
    if (!tokenResponse.ok) {
      return json({ error: token.error_description || "Google no pudo validar la credencial." }, { status: 401 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (clientId && token.aud !== clientId) {
      return json({ error: "La credencial de Google no corresponde a esta aplicacion." }, { status: 401 });
    }

    const email = String(token.email ?? "").toLowerCase();
    const verified = token.email_verified === "true" || token.email_verified === "1";
    if (!verified || !email.endsWith("@forus.cl")) {
      return json({ error: "Debes acceder con un correo corporativo @forus.cl verificado." }, { status: 403 });
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
    if (!row) {
      return json({ error: "El correo no esta activo en la tabla de usuarios." }, { status: 403 });
    }

    const name = [
      cellText(row.f[1]),
      cellText(row.f[2]),
      cellText(row.f[3]),
    ].filter(Boolean).join(" ").trim() || token.name || email;
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
