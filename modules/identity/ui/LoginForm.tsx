"use client";

import type { ReactNode } from "react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import Image from "next/image";
import { AlertTriangle } from "lucide-react";

import type { AuthUser } from "../domain/auth-user";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (
              response: GoogleCredentialResponse,
            ) => void;
            hosted_domain?: string;
            ux_mode?: "popup" | "redirect";
          }) => void;

          renderButton: (
            element: HTMLElement,
            options: {
              theme: string;
              size: string;
              width?: number;
              text?: string;
            },
          ) => void;
        };
      };
    };
  }
}

type LoginFormProps = {
  onLogin: (
    user: AuthUser,
  ) => void | Promise<void>;

  visual: ReactNode;
};

export function LoginForm({
  onLogin,
  visual,
}: LoginFormProps) {
  const buttonRef =
    useRef<HTMLDivElement>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [googleClientId, setGoogleClientId] =
    useState("");

  const [configLoaded, setConfigLoaded] =
    useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/config")
      .then(async (response) => {
        const payload = await response.json() as {
          googleClientId?: string;
        };

        if (active && response.ok) {
          setGoogleClientId(
            payload.googleClientId ?? "",
          );
        }
      })
      .finally(() => {
        if (active) {
          setConfigLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!configLoaded || !googleClientId) {
      return;
    }

    const initializeGoogle = () => {
      if (
        !window.google ||
        !buttonRef.current
      ) {
        return;
      }

      buttonRef.current.innerHTML = "";

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        hosted_domain: "forus.cl",
        ux_mode: "popup",

        callback: async (response) => {
          if (!response.credential) {
            setError(
              "Google no devolvió una credencial válida.",
            );

            return;
          }

          setLoading(true);
          setError("");

          try {
            const authResponse = await fetch(
              "/api/auth/google",
              {
                method: "POST",
                headers: {
                  "content-type":
                    "application/json",
                },
                body: JSON.stringify({
                  credential:
                    response.credential,
                }),
              },
            );

            const payload =
              await authResponse.json() as {
                user?: AuthUser;
                error?: string;
              };

            if (
              !authResponse.ok ||
              !payload.user
            ) {
              throw new Error(
                payload.error ||
                  "No se pudo iniciar sesión.",
              );
            }

            await onLogin(payload.user);
          } catch (authenticationError) {
            setError(
              authenticationError instanceof Error
                ? authenticationError.message
                : "No se pudo iniciar sesión.",
            );
          } finally {
            setLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(
        buttonRef.current,
        {
          theme: "outline",
          size: "large",
          width: 360,
          text: "signin_with",
        },
      );
    };

    if (window.google) {
      initializeGoogle();
      return;
    }

    const existingScript =
      document.getElementById(
        "google-identity",
      );

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        initializeGoogle,
        { once: true },
      );

      return () => {
        existingScript.removeEventListener(
          "load",
          initializeGoogle,
        );
      };
    }

    const script =
      document.createElement("script");

    script.id = "google-identity";
    script.src =
      "https://accounts.google.com/gsi/client";

    script.nonce =
      document.querySelector<HTMLMetaElement>(
        'meta[name="csp-nonce"]',
      )?.content ?? "";

    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;

    script.onerror = () => {
      setError(
        "No se pudo cargar Google Identity Services.",
      );
    };

    document.head.appendChild(script);
  }, [
    configLoaded,
    googleClientId,
    onLogin,
  ]);

  return (
    <main className="login-shell">
      <section className="login-panel login-access-panel">
        <div className="brand login-brand">
          <Image
            src="/forus.png"
            alt="Forus"
            width={68}
            height={34}
            preload
          />

          <b>
            PLANIFICACIÓN <span>FINANCIERA</span>
            <small>Intelligence portal</small>
          </b>
        </div>

        <div className="login-copy">
          <label>
            ACCOUNTABILITY PORTAL · ACCESO CORPORATIVO
          </label>

          <h1>
            Del desempeño interno al pulso de la
            industria.
          </h1>

          <p>
            Rentabilidad, forecast y señales de la
            macroindustria para apoyar decisiones con
            una mirada integral.
          </p>
        </div>

        <div className="login-access">
          {googleClientId && (
            <div
              ref={buttonRef}
              className={
                loading
                  ? "login-button loading"
                  : "login-button"
              }
            />
          )}

          {loading && (
            <span className="login-status">
              Validando usuario...
            </span>
          )}

          {configLoaded && !googleClientId && (
            <span className="login-status">
              El acceso corporativo no está disponible.
              Contacta al administrador.
            </span>
          )}

          {error && (
            <div className="data-warning login-error">
              <AlertTriangle />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="login-security">
          <i>01</i>

          <span>
            <b>ACCESO PROTEGIDO</b>
            Disponible para colaboradores @forus.cl
            habilitados.
          </span>
        </div>

        <small className="login-legal">
          Planificación Financiera · Forus Chile
        </small>
      </section>

      <aside
        className="login-visual"
        aria-label="Inteligencia financiera y de mercado"
      >
        {visual}
      </aside>
    </main>
  );
}