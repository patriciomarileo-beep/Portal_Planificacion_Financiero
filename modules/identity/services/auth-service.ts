import type { AuthUser } from "../domain/auth-user";

type AuthConfigResponse = {
  googleClientId?: string;
  error?: string;
};

type AuthUserResponse = {
  user?: AuthUser | null;
  error?: string;
};

type LogoutResponse = {
  ok?: boolean;
  error?: string;
};

async function readJson<T>(
  response: Response,
): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    return {} as T;
  }
}

export async function loadAuthConfig(
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch("/api/config", {
    cache: "no-store",
    signal,
  });

  const payload =
    await readJson<AuthConfigResponse>(response);

  if (!response.ok) {
    throw new Error(
      payload.error ||
        "No fue posible cargar la configuración de acceso.",
    );
  }

  return payload.googleClientId?.trim() ?? "";
}

export async function authenticateWithGoogle(
  credential: string,
  signal?: AbortSignal,
): Promise<AuthUser> {
  const response = await fetch("/api/auth/google", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ credential }),
    signal,
  });

  const payload =
    await readJson<AuthUserResponse>(response);

  if (!response.ok || !payload.user) {
    throw new Error(
      payload.error || "No se pudo iniciar sesión.",
    );
  }

  return payload.user;
}

export async function loadAuthSession(
  signal?: AbortSignal,
): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/session", {
    cache: "no-store",
    signal,
  });

  const payload =
    await readJson<AuthUserResponse>(response);

  if (!response.ok) {
    throw new Error(
      payload.error ||
        "No fue posible validar el acceso.",
    );
  }

  return payload.user ?? null;
}

export async function closeAuthSession(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    cache: "no-store",
  });

  const payload =
    await readJson<LogoutResponse>(response);

  if (!response.ok) {
    throw new Error(
      payload.error ||
        "No fue posible cerrar sesión.",
    );
  }
}