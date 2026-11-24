"use client";

import type { ReactNode } from "react";
import {
  ChevronRight,
  CircleDollarSign,
} from "lucide-react";

import type { PortalGroup } from "../model/portal-types";

const salesMarginNavigationItems = [
  ["summary", "Consolidado"],
  ["channel", "Canal"],
  ["brand", "Marca"],
  ["brandChannel", "Marca × Canal"],
  ["brandClass", "Marca × Clase"],
  ["chainBrand", "Cadena × Marca"],
] as const;

type SalesMarginTargetView =
  (typeof salesMarginNavigationItems)[number][0];

type PortalHomeProps = {
  canViewSalesMargin: boolean;
  visiblePortalGroups: readonly PortalGroup[];
  economicIndicators: ReactNode;

  onOpenSalesMargin: (
    targetView: SalesMarginTargetView,
  ) => void;

  onOpenPortalSection: (
    groupId: string,
    itemId: string,
  ) => void;
};

export function PortalHome({
  canViewSalesMargin,
  visiblePortalGroups,
  economicIndicators,
  onOpenSalesMargin,
  onOpenPortalSection,
}: PortalHomeProps) {
  return (
    <section className="portal-home-page">
      <div className="portal-home-heading">
        <div className="portal-home-copy">
          <label>
            INTELIGENCIA FINANCIERA · 2027
          </label>

          <h1>
            Decisiones que avanzan.
            <br />
            <em>Resultados más fuertes.</em>
          </h1>

          <p>
            Un punto de encuentro para explorar la
            rentabilidad, anticipar escenarios y convertir
            datos del negocio en acciones.
          </p>

          <button
            type="button"
            onClick={() =>
              onOpenSalesMargin("summary")
            }
          >
            Explora el objetivo 2027
            <ChevronRight />
          </button>
        </div>

        {economicIndicators}
      </div>

      <div className="portal-section-heading">
        <div>
          <label>EXPLORA EL PORTAL</label>
          <h2>
            Todo lo que necesitas, en un solo lugar
          </h2>
        </div>

        <p>
          Accede a los informes disponibles y conoce
          los próximos desarrollos.
        </p>
      </div>

      <div className="portal-legend-grid">
        {canViewSalesMargin && (
          <article className="portal-legend-card sales-margin-home-card">
            <div className="portal-legend-head">
              <span>
                <CircleDollarSign />
              </span>

              <div>
                <small>
                  PLANIFICACIÓN FINANCIERA
                </small>
                <h2>Venta &amp; Margen</h2>
                <p>
                  Ventas, margen y variaciones por
                  período, canal, marca y clase.
                </p>
              </div>
            </div>

            <div className="portal-legend-links">
              {salesMarginNavigationItems.map(
                ([targetView, label]) => (
                  <button
                    type="button"
                    className="available"
                    key={targetView}
                    onClick={() =>
                      onOpenSalesMargin(targetView)
                    }
                  >
                    <span>
                      <b>{label}</b>
                      <small>Disponible</small>
                    </span>

                    <ChevronRight />
                  </button>
                ),
              )}
            </div>
          </article>
        )}

        {visiblePortalGroups.map((group) => {
          const GroupIcon = group.icon;

          return (
            <article
              className={
                `portal-legend-card` +
                (group.id === "forbox"
                  ? " forbox-home-card"
                  : "")
              }
              key={group.id}
            >
              <div className="portal-legend-head">
                <span>
                  <GroupIcon />
                </span>

                <div>
                  <small>ÁREA DE ANÁLISIS</small>
                  <h2>{group.label}</h2>
                  <p>{group.description}</p>
                </div>
              </div>

              <div className="portal-legend-links">
                {group.items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={
                      item.enabled
                        ? "available"
                        : ""
                    }
                    onClick={() =>
                      onOpenPortalSection(
                        group.id,
                        item.id,
                      )
                    }
                  >
                    <span>
                      <b>{item.label}</b>
                      <small>
                        {item.enabled
                          ? "Disponible"
                          : "En construcción"}
                      </small>
                    </span>

                    <ChevronRight />
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}