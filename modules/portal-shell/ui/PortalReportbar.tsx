"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";

import type {
  PortalGroup,
  PortalSection,
} from "../model/portal-types";

type PortalReportbarProps = {
  portalSection: string;
  selectedPortalGroup: PortalGroup;
  selectedPortalItem: PortalSection;
  navigation?: ReactNode;
  showRefresh: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

export function PortalReportbar({
  portalSection,
  selectedPortalGroup,
  selectedPortalItem,
  navigation,
  showRefresh,
  refreshing,
  onRefresh,
}: PortalReportbarProps) {
  const contextLabel =
    portalSection === "home"
      ? "Accountability Portal"
      : portalSection === "users"
        ? "Administración"
        : portalSection === "sales-margin"
          ? "Planificación Financiera"
          : selectedPortalGroup.label;

  return (
    <header
      className={`portal-reportbar ${
        portalSection === "home" ? "home" : ""
      }`}
    >
      <div className="portal-context">
        <small>{contextLabel}</small>
        <b>{selectedPortalItem.label}</b>
      </div>

      {navigation}

      {showRefresh && (
        <button
          className="refresh-button"
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          title="Recargar la última versión disponible"
        >
          <RefreshCw
            className={refreshing ? "spin" : ""}
          />

          {refreshing
            ? "ACTUALIZANDO…"
            : "ACTUALIZAR"}
        </button>
      )}
    </header>
  );
}