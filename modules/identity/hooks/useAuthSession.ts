"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { AuthUser } from "../domain/auth-user";
import {
  closeAuthSession,
  loadAuthSession,
} from "../services/auth-service";

type UseAuthSessionResult = {
  user: AuthUser | null;
  checking: boolean;
  error: string;
  acceptUser: (user: AuthUser) => void;
  invalidateSession: (message?: string) => void;
  logout: () => Promise<void>;
};

export function useAuthSession(): UseAuthSessionResult {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const acceptUser = useCallback(
    (authenticatedUser: AuthUser) => {
      setError("");
      setUser(authenticatedUser);
    },
    [],
  );

  const invalidateSession = useCallback(
    (message = "") => {
      setError(message);
      setUser(null);
    },
    [],
  );

  const logout = useCallback(async () => {
    await closeAuthSession();
    invalidateSession();
  }, [invalidateSession]);

  useEffect(() => {
    const controller = new AbortController();

    void loadAuthSession(controller.signal)
      .then((authenticatedUser) => {
        if (controller.signal.aborted) {
          return;
        }

        if (authenticatedUser) {
          acceptUser(authenticatedUser);
          return;
        }

        invalidateSession();
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          invalidateSession(
            "No fue posible validar el acceso. Intenta nuevamente.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setChecking(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [acceptUser, invalidateSession]);

  return {
    user,
    checking,
    error,
    acceptUser,
    invalidateSession,
    logout,
  };
}