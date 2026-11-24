import {
  BarChart3,
  Building2,
  Globe2,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";

import type { PortalMenu } from "@/modules/identity/domain/menu-access";
import type { PortalGroup } from "./portal-types";

export const portalGroups: PortalGroup[] = [
  {
    id: "forbox",
    label: "Forbox",
    description: "Planificación financiera, carga de bases y herramientas operativas del área.",
    icon: PackageCheck,
    items: [
      { id: "forbox", label: "Forbox" },
    ],
  },
  {
    id: "forecast",
    label: "Rentabilidad Forecast",
    description: "Rentabilidad, resultados y desempeño por canal, país y consolidado.",
    icon: BarChart3,
    items: [
      { id: "bl", label: "B&L", enabled: true },
      { id: "ecommerce", label: "Ecommerce", enabled: true },
      { id: "marketplace", label: "Marketplace", enabled: true },
      { id: "wholesale", label: "Wholesale", enabled: true },
      { id: "consolidada", label: "Consolidada", enabled: true },
      { id: "paises", label: "Países", enabled: true },
    ],
  },
  {
    id: "mercado",
    label: "Mercado",
    description: "Benchmarks, contexto macroeconómico, retail e importaciones.",
    icon: Globe2,
    items: [
      { id: "benchmark-nacional", label: "Benchmark Nacional", enabled: true },
      { id: "benchmark-internacional", label: "Benchmark Internacional", enabled: true },
      { id: "macroeconomia-ipom", label: "Macroeconomía e IPoM", enabled: true },
      { id: "mercado-retail-cnc", label: "Mercado Retail · CNC", enabled: true },
      { id: "importaciones-retail", label: "Importaciones Industria Retail", enabled: true },
      { id: "importaciones-cosmeticos", label: "Importaciones Cosméticos", enabled: true },
    ],
  },
  {
    id: "comex",
    label: "Comex",
    description: "Seguimiento de compras, embarques, pagos, proveedores e importaciones.",
    icon: PackageCheck,
    items: [
      { id: "programacion", label: "Programación" },
      { id: "email-no-emb-marca", label: "Email No Emb x Marca" },
      { id: "oc-s-originales", label: "OC S/Originales" },
      { id: "seguimiento-fpago", label: "Seguimiento FPago" },
      { id: "oc-sin-originales-etd", label: "OC Sin Originales Por ETD" },
      { id: "responsables-comex", label: "Responsables Comex" },
      { id: "otb-oc-sin-originales-etd", label: "OTB - OC Sin Originales Por ETD" },
      { id: "proveedores-extranjeros", label: "Proveedores - Extranjeros" },
      { id: "seg-importaciones-invoice", label: "Seg Importaciones Invoice" },
    ],
  },
  {
    id: "kpi",
    label: "KPI Consolidado",
    description: "Indicadores clave de gestión financiera y operacional.",
    icon: Building2,
    items: [
      { id: "kpi-consolidado", label: "KPI Consolidado" },
    ],
  },
  {
    id: "risk-matrix",
    label: "Matriz Riesgo",
    description: "Evaluación y seguimiento de los riesgos financieros y operacionales.",
    icon: ShieldAlert,
    items: [
      { id: "risk-matrix", label: "Matriz Riesgo" },
    ],
  },
];
export const menuForSection = (
  section: string,
): PortalMenu | undefined => {
  if (
    section === "home" ||
    section === "sales-margin" ||
    section === "users"
  ) {
    return section;
  }

  return portalGroups.find((group) =>
    group.items.some((item) => item.id === section),
  )?.id;
};
