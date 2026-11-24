"use client";

import { useState } from "react";
import {
  ChevronDown,
  LogOut,
} from "lucide-react";

import type { AuthUser } from "../domain/auth-user";

type UserMenuProps = {
  user: AuthUser;
  onLogout: () => Promise<void>;
};

export function UserMenu({
  user,
  onLogout,
}: UserMenuProps) {
  const [signingOut, setSigningOut] =
    useState(false);

  const [error, setError] = useState("");

  const signOut = async () => {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    setError("");

    try {
      await onLogout();
    } catch {
      setError(
        "No fue posible cerrar sesión. Intenta nuevamente.",
      );

      setSigningOut(false);
    }
  };

  return (
    <details
      data-dropdown
      name="portal-dropdown"
      className="portal-user"
    >
      <summary
        aria-label={`Menú de usuario: ${user.name}`}
      >
        <span className="avatar">
          {user.name.slice(0, 1).toUpperCase()}
        </span>

        <span className="portal-user-name">
          <b>{user.name}</b>
          <small>{user.role}</small>
        </span>

        <ChevronDown
          className="portal-user-chevron"
          aria-hidden="true"
        />
      </summary>

      <div className="portal-user-dropdown">
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
        >
          <LogOut aria-hidden="true" />

          {signingOut
            ? "Cerrando sesión…"
            : "Cerrar sesión"}
        </button>

        {error && (
          <p role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}