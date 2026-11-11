"use client";

import { useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Filter,
  Download,
  Globe2,
  Landmark,
  LogOut,
  Menu,
  PackageCheck,
  RefreshCw,
  Save,
  Search,
  Store,
  Waves,
  Users,
} from "lucide-react";
import { parseMarketIndicators, indicatorDateLabel, type MarketIndicator } from "./market/indicator-data";
import type { DollarHistoryPayload } from "./market/dollar-history-data";
import type { BaseRow } from "./base-consolidada";
import { PrivateDataContext, usePrivateData, type PrivateData } from "./private-data-context";
import { storeClassification, type StoreClassification } from "./store-classification";
import { canAccessMenu, type PortalMenu } from "./menu-access";
import { clearSalesMarginData, loadSalesMargin } from "./sales-margin/sales-margin-data";
const reportLoading = () => <div className="portal-data-status" role="status"><RefreshCw className="spin" /><p>Cargando informe…</p></div>;
const NationalBenchmark = dynamic(() => import("./market/NationalBenchmark"), { loading: reportLoading });
const InternationalBenchmark = dynamic(() => import("./market/InternationalBenchmark"), { loading: reportLoading });
const ImportacionesIndustria = dynamic(() => import("./market/ImportacionesIndustria"), { loading: reportLoading });
const MacroeconomicsMarket = dynamic(() => import("./market/MacroeconomicsMarket"), { loading: reportLoading });
const RetailCncMarket = dynamic(() => import("./market/RetailCncMarket"), { loading: reportLoading });
const ChannelProfitability = dynamic(() => import("./profitability/ChannelProfitability"), { loading: reportLoading });
const CountryProfitability = dynamic(() => import("./profitability/CountryProfitability"), { loading: reportLoading });
const ToolboxPlanning = dynamic(() => import("./toolbox/ToolboxPlanning"), { loading: reportLoading });
const StoreSensitivity = dynamic(() => import("./profitability/StoreSensitivity"), { loading: reportLoading });
const SalesMargin = dynamic(() => import("./sales-margin/SalesMargin"), { loading: reportLoading });

type Year = 2024 | 2025 | 2026 | 2027;
type FwBand = "negative" | "low" | "high" | null;
type ProfitMetric = "fourWalls" | "utility";
type Quarter = "ANUAL" | "Q1" | "Q2" | "Q3" | "Q4";
type ReportPeriod = Quarter | "MES";
type ClassificationFilter = "TOTAL" | StoreClassification;
type MonitorFilter = "TOTAL" | "CHAIN_OTHER" | "DUPLICATE" | "ACTIVE_YEAR" | "NO_CONTRACT" | "NO_M2" | "SSS_YEAR" | "NS_YEAR" | "REMODELED";
type PortalSection = {
  id: string;
  label: string;
  enabled?: boolean;
};
type Metric = {
  sales: number;
  margin: number;
  payroll: number;
  rent: number;
  general: number;
  operatingCost: number;
  operatingResult: number;
  nonOperating: number;
  utility: number;
  ebitda: number;
  fourWalls: number | null;
  fwAvailable: number;
};
type StoreRow = {
  code: string;
  chain: string;
  name: string;
  annual: Record<Year, Metric>;
  monthly: Record<2026 | 2027, Record<string, Metric>>;
};
type UserCell = string | number | boolean | null;
type UserRow = {
  id: string;
  data: Record<string, UserCell>;
};
type UsersPayload = {
  columns: string[];
  rows: UserRow[];
  keyColumn: string | null;
  roleColumn: string;
  roleOptions: string[];
  activeColumn: string;
  totalRows: number;
  rowLimit?: number;
  capped?: boolean;
  error?: string;
};
type UserDraft = {
  rol: string;
  activo: boolean;
};
type AuthUser = {
  email: string;
  name: string;
  role: string;
  personId: string;
};
type GoogleCredentialResponse = {
  credential?: string;
};
type TipPayloadItem = {
  dataKey: string;
  name: string;
  value: number;
  payload?: { name?: string };
};
type ScatterPointClick = {
  payload?: { store?: StoreRow };
  store?: StoreRow;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            hosted_domain?: string;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: { theme: string; size: string; width?: number; text?: string },
          ) => void;
        };
      };
    };
  }
}

const years: Year[] = [2024, 2025, 2026, 2027];
const yearLabel = (year: Year) =>
  ({ 2024: "2024R", 2025: "2025R", 2026: "2026E", 2027: "2027P" })[year];
const monthOrder = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];
const monthShort: Record<string, string> = {
  ENERO: "Ene", FEBRERO: "Feb", MARZO: "Mar", ABRIL: "Abr",
  MAYO: "May", JUNIO: "Jun", JULIO: "Jul", AGOSTO: "Ago",
  SEPTIEMBRE: "Sep", OCTUBRE: "Oct", NOVIEMBRE: "Nov", DICIEMBRE: "Dic",
};
const portalGroups: { id: PortalMenu; label: string; description: string; icon: typeof BarChart3; items: PortalSection[] }[] = [
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
];
const menuForSection = (section: string): PortalMenu | undefined => {
  if (section === "home" || section === "sales-margin" || section === "toolbox" || section === "users") return section;
  return portalGroups.find(group => group.items.some(item => item.id === section))?.id;
};
const hiddenUserColumns = new Set([
  "fecha_creacion",
  "sexo",
  "fecha_nacimiento",
  "nacionalidad",
  "username",
  "email_personal",
  "celular",
]);
const quarterMonths: Record<Exclude<Quarter, "ANUAL">, string[]> = {
  Q1: ["ENERO", "FEBRERO", "MARZO"],
  Q2: ["ABRIL", "MAYO", "JUNIO"],
  Q3: ["JULIO", "AGOSTO", "SEPTIEMBRE"],
  Q4: ["OCTUBRE", "NOVIEMBRE", "DICIEMBRE"],
};
const chainNames: Record<string, string> = {
  HP: "Hush Puppies", DH: "D.House", HPK: "Hush Puppies Kids", RK: "Rockford",
  COL: "Columbia", MHW: "Mountain Hardwear", MER: "Merrell",
  FUN: "Funsport", BSOUL: "Bsoul", CAT: "Caterpillar", SE: "Shoe Express",
  AZ: "Azaleia", "7V": "7Veinte", VANS: "Vans", LOP: "LOP",
  CROCS: "Crocs", UA: "Under Armour", PRF: "Parfois", BIL: "Billabong", BLL: "Billabong",
};
const chains = [
  "Hush Puppies", "D.House", "Hush Puppies Kids", "Rockford", "Columbia",
  "Mountain Hardwear", "Merrell", "Funsport", "Bsoul", "Caterpillar",
  "Shoe Express", "Azaleia", "7Veinte", "Vans", "LOP", "Crocs",
  "Under Armour", "Parfois", "Billabong", "OTROS",
];
const emptyMetric = (): Metric => ({
  sales: 0, margin: 0, payroll: 0, rent: 0, general: 0,
  operatingCost: 0, operatingResult: 0, nonOperating: 0, utility: 0,
  ebitda: 0,
  fourWalls: null, fwAvailable: 0,
});
const metricFrom = (r: BaseRow): Metric => {
  const officialFourWalls = r[17];
  const operatingCost = -Math.abs(r[14]);
  // Respaldo controlado: V presenta errores #N/A en parte de 2026/2027.
  // Se conserva V cuando es numérico; si falla, se aplica la fórmula de negocio
  // con los componentes de la misma fila (los gastos vienen con signo negativo).
  const fourWalls = officialFourWalls ?? (r[16] - (r[11] + r[12] + r[13]));
  return {
    sales: r[6], margin: r[7], payroll: -Math.abs(r[8]), rent: -Math.abs(r[9]), general: r[10],
    operatingCost, operatingResult: r[7] + operatingCost,
    nonOperating: r[15], utility: r[16],
    // RESULTADO NO OPERACIONAL se usa como proxy conjunto de intereses e impuestos;
    // la fuente no expone una columna separada de amortización.
    ebitda: r[16] - r[15] + Math.abs(r[11]),
    fourWalls,
    fwAvailable: officialFourWalls === null ? 0 : 1,
  };
};
const addMetric = (a: Metric, b: Metric): Metric => ({
  sales: a.sales + b.sales,
  margin: a.margin + b.margin,
  payroll: a.payroll + b.payroll,
  rent: a.rent + b.rent,
  general: a.general + b.general,
  operatingCost: a.operatingCost + b.operatingCost,
  operatingResult: a.operatingResult + b.operatingResult,
  nonOperating: a.nonOperating + b.nonOperating,
  utility: a.utility + b.utility,
  ebitda: a.ebitda + b.ebitda,
  fourWalls:
    a.fourWalls === null && b.fourWalls === null
      ? null
      : (a.fourWalls ?? 0) + (b.fourWalls ?? 0),
  fwAvailable: a.fwAvailable + b.fwAvailable,
});
const chainLabel = (raw: string, storeName = "") => {
  const normalizedRaw = raw.trim().toUpperCase();
  if (normalizedRaw === "WLS" || normalizedRaw === "WE LOVE SHOES") return "OTROS";
  const mapped = chainNames[normalizedRaw];
  if (mapped) return mapped;
  const name = storeName.trim().toUpperCase();
  if (name.startsWith("MERRELL")) return "Merrell";
  if (name.startsWith("BSOUL")) return "Bsoul";
  if (name.startsWith("KIDS")) return "Hush Puppies Kids";
  if (name.startsWith("HPK")) return "Hush Puppies Kids";
  if (name.startsWith("PARFOIS")) return "Parfois";
  if (name.startsWith("FUNSPORT")) return "Funsport";
  if (name.startsWith("FS")) return "Funsport";
  if (name.startsWith("AZA")) return "Azaleia";
  if (name.startsWith("7VEINTE")) return "7Veinte";
  if (name.startsWith("BIL") || name.startsWith("BLL")) return "Billabong";
  if (name.startsWith("CAR") || name.startsWith("CAT")) return "Caterpillar";
  if (name.startsWith("WLS")) return "OTROS";
  if (name.startsWith("VANS")) return "Vans";
  if (name.startsWith("COLUMBIA")) return "Columbia";
  return "OTROS";
};
const invalidSourceValue = (value: unknown) => {
  const text = String(value ?? "").trim().toUpperCase();
  return !text || text.includes("#N/A") || text.includes("#REF") || text.includes("#VALUE") || text.includes("ARRAY RESULT") || text.includes("ERROR");
};

const buildStores = (baseConsolidada: BaseRow[]): StoreRow[] => {
  const map = new Map<string, StoreRow>();
  for (const r of baseConsolidada) {
    const year = r[0] as Year;
    const code = r[3];
    if (invalidSourceValue(code) || invalidSourceValue(r[5])) continue;
    if (!map.has(code)) {
      map.set(code, {
        code,
        chain: chainLabel(r[4], r[5]),
        name: r[5] || `Tienda ${code}`,
        annual: { 2024: emptyMetric(), 2025: emptyMetric(), 2026: emptyMetric(), 2027: emptyMetric() },
        monthly: { 2026: {}, 2027: {} },
      });
    }
    const store = map.get(code)!;
    if (store.chain === "OTROS" && chainLabel(r[4], r[5]) !== "OTROS") store.chain = chainLabel(r[4], r[5]);
    if (r[2] === "ANUAL" || r[1] === "TOTAL") {
      store.annual[year] = addMetric(store.annual[year], metricFrom(r));
    } else if ((year === 2026 || year === 2027) && r[2] === "MENSUAL") {
      const month = r[1].toUpperCase();
      store.monthly[year][month] = addMetric(store.monthly[year][month] ?? emptyMetric(), metricFrom(r));
    }
  }
  return [...map.values()];
};

const money = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.round(Math.abs(n) / 1000).toLocaleString("es-CL")}`;
const pct = (n: number, d: number) => (d ? (n / d) * 100 : 0);
const variation = (current: number, prior: number) =>
  prior ? ((current - prior) / Math.abs(prior)) * 100 : null;
const displayCell = (value: UserCell) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Si" : "No";
  return String(value);
};
const isActiveValue = (value: UserCell) => {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "si", "s", "yes", "y", "activo", "activa"].includes(normalized);
};
const downloadExcel = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escape = (value: string | number) =>
    String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<html><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
  const url = URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};
const openingType = (store: StoreRow, year: 2026 | 2027, month = "DICIEMBRE") =>
  storeClassification(store.code, year, month);
const fwBandOf = (store: StoreRow, year: Year, metric: ProfitMetric): FwBand => {
  if (store.annual[year].sales === 0) return null;
  const value = metric === "utility" ? store.annual[year].utility : (store.annual[year].fourWalls ?? 0);
  return value < 0 ? "negative" : value < 6000 ? "low" : "high";
};

function YoY({ current, prior }: { current: number; prior: number }) {
  const value = variation(current, prior);
  if (value === null || !Number.isFinite(value)) return <small>YoY —</small>;
  const improved = current > prior;
  return (
    <small className={improved ? "pos" : "neutral"}>
      {improved ? <ArrowUpRight /> : <ArrowDownRight />} YoY {Math.abs(value).toFixed(1)}%
    </small>
  );
}

function Tip({ active, payload, label }: { active?: boolean; payload?: TipPayloadItem[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      <b>{payload[0]?.payload?.name || label}</b>
      {payload.map((p) => (
        <span key={p.dataKey}>
          {p.name}: <strong>{p.dataKey === "variation" ? `${p.value.toFixed(1)}%` : money(p.value)}</strong>
        </span>
      ))}
    </div>
  );
}

function Executive({
  selection,
  universe,
  quadrantYear,
  setQuadrantYear,
  fwBand,
  setFwBand,
  analysisMetric,
  setAnalysisMetric,
}: {
  selection: StoreRow[];
  universe: StoreRow[];
  quadrantYear: Year;
  setQuadrantYear: (year: Year) => void;
  fwBand: FwBand;
  setFwBand: (band: FwBand) => void;
  analysisMetric: ProfitMetric;
  setAnalysisMetric: (metric: ProfitMetric) => void;
}) {
  const [chainMetric, setChainMetric] = useState<keyof Metric | "marginPct">("utility");
  const [period, setPeriod] = useState<ReportPeriod>("ANUAL");
  const [classification, setClassification] = useState<ClassificationFilter>("TOTAL");
  const [selectedMonths, setSelectedMonths] = useState<string[]>(monthOrder);
  const monthFilterRef = useRef<HTMLDetailsElement>(null);

  const displayedYears: Year[] = period === "ANUAL" && classification === "TOTAL" ? years : [2026, 2027];
  const activeMonths = period === "ANUAL"
    ? classification === "TOTAL" ? [] : monthOrder
    : period === "MES" ? selectedMonths : quarterMonths[period];
  const metricForMonths = (store: StoreRow, year: 2026 | 2027, months: string[]) =>
    months.reduce(
      (sum, month) => classification === "TOTAL" || openingType(store, year, month) === classification
        ? addMetric(sum, store.monthly[year][month] ?? emptyMetric())
        : sum,
      emptyMetric(),
    );
  const storeMetric = (store: StoreRow, year: Year) => {
    if (period === "ANUAL" && classification === "TOTAL") return store.annual[year];
    if (year !== 2026 && year !== 2027) return emptyMetric();
    return metricForMonths(store, year, activeMonths);
  };
  const toggleMonth = (month: string) => {
    setPeriod("MES");
    setSelectedMonths((current) => current.includes(month)
      ? current.filter((item) => item !== month)
      : [...current, month]);
  };
  const total = (ss: StoreRow[], y: Year) =>
    ss.reduce((a, s) => addMetric(a, storeMetric(s, y)), emptyMetric());
  const totals = displayedYears.map((y) => total(selection, y));
  const rows: { label: string; key: keyof Metric; percent?: boolean }[] = [
    { label: "Ventas", key: "sales" },
    { label: "Margen", key: "margin" },
    { label: "Margen / venta", key: "margin", percent: true },
    { label: "Arriendos", key: "rent" },
    { label: "Remuneraciones", key: "payroll" },
    { label: "Costo operacional", key: "operatingCost" },
    { label: "Resultado operacional", key: "operatingResult" },
    { label: "Utilidad", key: "utility" },
    { label: "EBITDA", key: "ebitda" },
  ];
  const chainMetricOptions: { value: keyof Metric | "marginPct"; label: string }[] = [
    { value: "sales", label: "Ventas" },
    { value: "margin", label: "Margen" },
    { value: "marginPct", label: "Margen / venta" },
    { value: "rent", label: "Arriendos" },
    { value: "payroll", label: "Remuneraciones" },
    { value: "operatingCost", label: "Costo operacional" },
    { value: "operatingResult", label: "Resultado operacional" },
    { value: "utility", label: "Utilidad" },
    { value: "ebitda", label: "EBITDA" },
    { value: "fourWalls", label: "Four Walls" },
  ];
  const selectedMetricLabel = chainMetricOptions.find((x) => x.value === chainMetric)?.label ?? "Utilidad";
  const metricValue = (metric: Metric) =>
    chainMetric === "marginPct"
      ? pct(metric.margin, metric.sales)
      : Number(metric[chainMetric] ?? 0);
  const breakdownPeriods = period === "ANUAL"
    ? []
    : [
        ...activeMonths.map((month) => ({ id: month, label: monthShort[month], months: [month] })),
        ...(activeMonths.length > 1 ? [{ id: "TOTAL", label: "TOTAL", months: activeMonths }] : []),
      ];
  const breakdownTotals = ([2026, 2027] as const).map((year) =>
    breakdownPeriods.map((item) =>
      selection.reduce((sum, store) => addMetric(sum, metricForMonths(store, year, item.months)), emptyMetric())
    )
  );
  const metricContent = (
    row: { key: keyof Metric; percent?: boolean },
    metric: Metric,
    prior?: Metric,
  ) => {
    const value = metric[row.key] as number;
    const displayedValue = row.percent ? pct(metric.margin, metric.sales) : value;
    const rawSalesWeight = row.percent ? displayedValue : pct(value, metric.sales);
    const salesWeight = (["rent", "payroll", "operatingCost"] as (keyof Metric)[]).includes(row.key)
      ? Math.abs(rawSalesWeight)
      : rawSalesWeight;
    const priorValue = prior
      ? row.percent ? pct(prior.margin, prior.sales) : (prior[row.key] as number)
      : null;
    const dollarVariation = priorValue !== null && !row.percent
      ? displayedValue - priorValue
      : null;
    return (
      <div className="metric-cell-layout">
        <div className="metric-value-stack">
          <b>{row.percent ? `${displayedValue.toFixed(2)}%` : money(value)}</b>
          {priorValue !== null && <div className="metric-change-line">
            <YoY current={displayedValue} prior={priorValue} />
            {dollarVariation !== null && <small className={dollarVariation >= 0 ? "pos metric-dollar-change" : "neg metric-dollar-change"}>{money(dollarVariation)}</small>}
          </div>}
        </div>
        <small className="sales-weight">{salesWeight.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</small>
      </div>
    );
  };
  return (
    <>
      <section className="executive-matrix panel">
        <div className="matrix-title">
          <div>
            <label>RESUMEN EJECUTIVO</label>
            <h2>Estado de resultados B&amp;L</h2>
          </div>
          <div className="matrix-actions">
            <div className="classification-filter" aria-label="Clasificación mensual de tiendas">
              {(["TOTAL", "SSS", "NS"] as ClassificationFilter[]).map((item) => (
                <button key={item} className={classification === item ? "active" : ""} onClick={() => setClassification(item)}>{item}</button>
              ))}
            </div>
            <div className="quarter-filter" aria-label="Periodo del informe">
              {(["ANUAL", "Q1", "Q2", "Q3", "Q4"] as Quarter[]).map((item) => (
                <button key={item} className={period === item ? "active" : ""} onClick={() => { setPeriod(item); monthFilterRef.current?.removeAttribute("open"); }}>{item}</button>
              ))}
              <details data-dropdown name="portal-dropdown" className={`month-period-filter ${period === "MES" ? "active" : ""}`} ref={monthFilterRef}>
                <summary onClick={() => setPeriod("MES")}>MES</summary>
                <div className="month-options">
                  <div className="month-options-head">
                    <b>{selectedMonths.length} MESES</b>
                    <button type="button" onClick={() => setSelectedMonths(selectedMonths.length === monthOrder.length ? [] : monthOrder)}>{selectedMonths.length === monthOrder.length ? "LIMPIAR" : "TODOS"}</button>
                  </div>
                  {monthOrder.map((month) => (
                    <label key={month}><input type="checkbox" checked={selectedMonths.includes(month)} onChange={() => toggleMonth(month)} />{month}</label>
                  ))}
                </div>
              </details>
            </div>
            <strong><Store /> {selection.filter((s) => storeMetric(s, 2027).sales !== 0).length} tiendas</strong>
          </div>
        </div>
        <div className="scroll matrix-scroll">
          {period === "ANUAL" ? (
            <table>
              <thead><tr><th>CONCEPTO</th>{displayedYears.map((y) => <th key={y}><span className="year-weight-heading"><b>{yearLabel(y)}</b><span className="weight-heading">PESO %</span></span></th>)}</tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.label} className={row.percent ? "margin-rate-row" : row.key === "utility" ? "total-row" : row.key === "ebitda" ? "ebitda-row" : ""}>
                  <td>{row.label}</td>
                  {totals.map((metric, index) => <td key={displayedYears[index]} className="metric-cell">{metricContent(row, metric, index ? totals[index - 1] : undefined)}</td>)}
                </tr>
              ))}</tbody>
            </table>
          ) : activeMonths.length === 0 ? (
            <div className="empty-period">SELECCIONA AL MENOS UN MES PARA GENERAR EL INFORME.</div>
          ) : (
            <table className="period-breakdown-table">
              <thead>
                <tr><th rowSpan={2}>CONCEPTO</th><th colSpan={breakdownPeriods.length}>{yearLabel(2026)}</th><th colSpan={breakdownPeriods.length}>{yearLabel(2027)}</th></tr>
                <tr>{([2026, 2027] as const).flatMap((year) => breakdownPeriods.map((item) => <th key={`${year}-${item.id}`} className={item.id === "TOTAL" ? "period-total-head" : ""}>{item.label}</th>))}</tr>
              </thead>
              <tbody>{rows.map((row) => (
                <tr key={row.label} className={row.percent ? "margin-rate-row" : row.key === "utility" ? "total-row" : row.key === "ebitda" ? "ebitda-row" : ""}>
                  <td>{row.label}</td>
                  {breakdownTotals.flatMap((yearMetrics, yearIndex) => yearMetrics.map((metric, periodIndex) => (
                    <td key={`${yearIndex}-${breakdownPeriods[periodIndex].id}`} className={`metric-cell ${breakdownPeriods[periodIndex].id === "TOTAL" ? "period-total-cell" : ""}`}>
                      {metricContent(row, metric, yearIndex === 1 ? breakdownTotals[0][periodIndex] : undefined)}
                    </td>
                  )))}
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div className="chain-divider">
          <div><h3>APERTURA POR CADENA</h3><span>Totales por cadena reconciliados con el resumen ejecutivo</span></div>
          <label className="metric-select">ÍTEM A MEDIR<select value={chainMetric} onChange={(e) => setChainMetric(e.target.value as keyof Metric | "marginPct")}>{chainMetricOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><ChevronDown /></label>
        </div>
        <div className="scroll matrix-scroll">
          <table>
            <thead><tr><th>CADENA</th>{displayedYears.map((y) => <th key={y}>{yearLabel(y)}</th>)}</tr></thead>
            <tbody>
              {chains.filter((chain) => selection.some((store) => store.chain === chain)).map((chain) => {
                const chainStores = selection.filter((s) => s.chain === chain);
                return (
                  <tr key={chain}>
                    <td>{chain}</td>
                    {displayedYears.map((y, i) => {
                      const t = total(chainStores, y);
                      const prev = i ? total(chainStores, displayedYears[i - 1]) : null;
                      const value = metricValue(t);
                      return (
                        <td key={y}>
                          <b>{chainMetric === "marginPct" ? `${value.toFixed(2)}%` : money(value)}</b>
                          <small>{selectedMetricLabel}</small>
                          {prev && <YoY current={value} prior={metricValue(prev)} />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr className="grand-total">
                <td>TOTAL</td>
                {totals.map((t, i) => {
                  const value = metricValue(t);
                  return <td key={displayedYears[i]}><b>{chainMetric === "marginPct" ? `${value.toFixed(2)}%` : money(value)}</b><small>{selectedMetricLabel}</small></td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <FourWalls universe={universe} period={period} classification={classification} periodMetric={storeMetric} quadrantYear={quadrantYear} setQuadrantYear={setQuadrantYear} fwBand={fwBand} setFwBand={setFwBand} analysisMetric={analysisMetric} setAnalysisMetric={setAnalysisMetric} />
    </>
  );
}

function FourWalls({
  universe,
  period,
  classification,
  periodMetric,
  quadrantYear,
  setQuadrantYear,
  fwBand,
  setFwBand,
  analysisMetric,
  setAnalysisMetric,
}: {
  universe: StoreRow[];
  period: ReportPeriod;
  classification: ClassificationFilter;
  periodMetric: (store: StoreRow, year: Year) => Metric;
  quadrantYear: Year;
  setQuadrantYear: (year: Year) => void;
  fwBand: FwBand;
  setFwBand: (band: FwBand) => void;
  analysisMetric: ProfitMetric;
  setAnalysisMetric: (metric: ProfitMetric) => void;
}) {
  const [selected, setSelected] = useState<StoreRow | null>(null);
  const analysisLabel = analysisMetric === "utility" ? "Utilidad" : "Four Walls";
  const sectionTitle = analysisMetric === "utility" ? "Análisis de Utilidad" : "Rentabilidad Four Walls";
  const analysisYears: Year[] = period === "ANUAL" && classification === "TOTAL" ? years : [2026, 2027];
  const activeQuadrantYear = analysisYears.includes(quadrantYear) ? quadrantYear : 2027;
  const periodLabel = period === "MES" ? "meses seleccionados" : period === "ANUAL" ? "año" : period;
  const analysisValue = (store: StoreRow, year: Year) =>
    analysisMetric === "utility" ? periodMetric(store, year).utility : (periodMetric(store, year).fourWalls ?? 0);
  const bandForStore = (store: StoreRow, year: Year): FwBand => {
    const metric = periodMetric(store, year);
    if (metric.sales === 0) return null;
    const value = analysisMetric === "utility" ? metric.utility : (metric.fourWalls ?? 0);
    return value < 0 ? "negative" : value < 6000 ? "low" : "high";
  };
  const analyzedStores = fwBand ? universe.filter((store) => bandForStore(store, activeQuadrantYear) === fwBand) : universe;
  const points = analyzedStores.filter((s) => periodMetric(s, activeQuadrantYear).sales !== 0).map((s) => ({
      name: s.name,
      code: s.code,
      x: periodMetric(s, activeQuadrantYear).sales,
      y: analysisValue(s, activeQuadrantYear),
      store: s,
      official: periodMetric(s, activeQuadrantYear).fwAvailable > 0,
    }));
  const risk = analyzedStores
    .filter((s) => analysisYears.some((y) => periodMetric(s, y).sales !== 0 && analysisValue(s, y) < 0))
    .sort((a, b) => analysisValue(a, activeQuadrantYear) - analysisValue(b, activeQuadrantYear));
  const derived = analyzedStores.filter((s) => periodMetric(s, activeQuadrantYear).sales !== 0 && periodMetric(s, activeQuadrantYear).fwAvailable === 0).length;
  const bands = [
    { id: "negative" as const, label: "Pérdida estructural", help: `${analysisLabel} menor a 0`, color: "red", count: universe.filter((s) => bandForStore(s, activeQuadrantYear) === "negative").length },
    { id: "low" as const, label: "Rentabilidad baja", help: `${analysisLabel} entre 0 y < 6`, color: "amber", count: universe.filter((s) => bandForStore(s, activeQuadrantYear) === "low").length },
    { id: "high" as const, label: "Rentabilidad saludable", help: `${analysisLabel} desde 6`, color: "green", count: universe.filter((s) => bandForStore(s, activeQuadrantYear) === "high").length },
  ];
  const exportFourWalls = () => downloadExcel(
    `${analysisMetric}-${period}-${yearLabel(activeQuadrantYear)}`,
    ["CC", "TIENDA", "CADENA", ...analysisYears.map((y) => `${analysisLabel.toUpperCase()} ${yearLabel(y)}`), `VENTAS ${yearLabel(activeQuadrantYear)}`],
    analyzedStores
      .filter((s) => periodMetric(s, activeQuadrantYear).sales !== 0)
      .map((s) => [s.code, s.name, s.chain, ...analysisYears.map((y) => Math.round(analysisValue(s, y) / 1000)), Math.round(periodMetric(s, activeQuadrantYear).sales / 1000)]),
  );
  return (
    <>
      <div className="title">
        <div><i className="red">02</i><span><h2>{sectionTitle}</h2></span></div>
        <div className="title-actions"><strong className="neg">{risk.length} tiendas con alerta · {periodLabel}</strong><button className="export-button" onClick={exportFourWalls}>EXPORTAR A EXCEL</button></div>
      </div>
      {analysisMetric === "fourWalls" && derived > 0 && (
        <div className="data-warning compact-warning"><AlertTriangle /><span><b>{derived} tiendas usan respaldo en {yearLabel(activeQuadrantYear)} · {periodLabel}.</b> Se aplica la fórmula de negocio sólo cuando V devuelve error o vacío.</span></div>
      )}
      <section className="two">
        <section className="panel risk">
          <label>TIENDA CON {analysisLabel.toUpperCase()} NEGATIVA</label>
          <h3>Alertas críticas de {analysisLabel} · {periodLabel}</h3>
          <div className="scroll fw-scroll">
            <table className="compact-table">
              <thead><tr><th>TIENDA</th><th>CADENA</th>{analysisYears.map((y) => <th key={y}>{analysisMetric === "fourWalls" ? "FW" : "UTILIDAD"} {yearLabel(y)}</th>)}</tr></thead>
              <tbody>
                {risk.map((s) => (
                  <tr key={s.code} onClick={() => setSelected(s)} className="clickable-row">
                    <td><b>{s.name}</b><small>#{s.code}</small></td><td>{s.chain}</td>
                    {analysisYears.map((y) => {
                      const value = analysisValue(s, y);
                      return <td key={y} className={value < 0 ? "neg bold" : "pos"}>{money(value)}</td>;
                    })}
                  </tr>
                ))}
                {!risk.length && <tr><td colSpan={analysisYears.length + 2}>No hay alertas de {analysisLabel} en la selección.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel quadrant-panel">
          <div className="panel-toolbar">
            <div><label>CUADRANTE {yearLabel(activeQuadrantYear)} · {periodLabel}</label><h3>Ventas vs {analysisLabel}</h3></div>
            <div className="quadrant-controls">
              <div className="profit-toggle" aria-label="Métrica de rentabilidad">
                <button className={analysisMetric === "fourWalls" ? "active" : ""} onClick={() => { setAnalysisMetric("fourWalls"); setFwBand(null); }}>FOUR WALLS</button>
                <button className={analysisMetric === "utility" ? "active" : ""} onClick={() => { setAnalysisMetric("utility"); setFwBand(null); }}>UTILIDAD</button>
              </div>
              <label className="year-select">AÑO<select value={activeQuadrantYear} onChange={(e) => setQuadrantYear(Number(e.target.value) as Year)}>{analysisYears.map((y) => <option key={y} value={y}>{yearLabel(y)}</option>)}</select><ChevronDown /></label>
            </div>
          </div>
          <div className="chart compact-chart">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke="#e7ebf1" />
                <XAxis type="number" dataKey="x" tickFormatter={(v) => Math.round(v / 1000).toLocaleString("es-CL")} />
                <YAxis type="number" dataKey="y" tickFormatter={(v) => Math.round(v / 1000).toLocaleString("es-CL")} />
                <ReferenceLine y={0} stroke="#d92d42" strokeDasharray="4 4" />
                <Tooltip content={<Tip />} />
                <Scatter
                  data={points}
                  cursor="pointer"
                  onClick={(point: ScatterPointClick) => {
                    const store = point.payload?.store ?? point.store;
                    if (store) setSelected(store);
                  }}
                >
                  {points.map((p) => <Cell key={p.code} fill={p.y < 0 ? "#d92d42" : p.y < p.x * .03 ? "#e0a22f" : "#168a57"} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-help">Selecciona un punto para abrir el detalle financiero de la tienda.</p>
          <div className="quadrant-summary">
            {bands.map((band) => (
              <button
                key={band.id}
                className={`summary-band ${band.color} ${fwBand === band.id ? "active" : ""}`}
                onClick={() => setFwBand(fwBand === band.id ? null : band.id)}
                aria-pressed={fwBand === band.id}
              >
                <i>●</i><span><b>{band.count} tiendas</b><strong>{band.label}</strong><small>{band.help}</small></span>
              </button>
            ))}
          </div>
          {fwBand && <button className="clear-band" onClick={() => setFwBand(null)}>Quitar filtro de rentabilidad</button>}
        </section>
      </section>
      {selected && <StoreModal store={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function StoreModal({ store, onClose }: { store: StoreRow; onClose: () => void }) {
  const a26 = store.annual[2026], a27 = store.annual[2027];
  const rows: { label: string; key: keyof Metric; pct?: boolean }[] = [
    { label: "Ventas", key: "sales" },
    { label: "Margen", key: "margin" },
    { label: "Margen / venta", key: "margin", pct: true },
    { label: "Arriendos", key: "rent" },
    { label: "Remuneraciones", key: "payroll" },
    { label: "Costo operacional", key: "operatingCost" },
    { label: "Resultado operacional", key: "operatingResult" },
    { label: "Utilidad", key: "utility" },
    { label: "Four Walls", key: "fourWalls" },
  ];
  const monthly = monthOrder.map((month) => ({
    month: monthShort[month],
    sales26: store.monthly[2026][month]?.sales ?? 0,
    sales27: store.monthly[2027][month]?.sales ?? 0,
  }));
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="store-modal" role="dialog" aria-modal="true" aria-label={`Detalle de ${store.name}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><label>DETALLE FOUR WALLS</label><h2>{store.name}</h2><p>#{store.code} · {store.chain} · <b>{openingType(store, 2027)} 2027P</b></p></div>
          <button onClick={onClose} aria-label="Cerrar detalle">×</button>
        </div>
        <div className="modal-grid">
          <div className="modal-table">
            <table>
              <thead><tr><th>CONCEPTO</th><th>2026E</th><th>2027P</th><th>VAR.</th></tr></thead>
              <tbody>{rows.map((row) => {
                const v26 = a26[row.key] as number | null;
                const v27 = a27[row.key] as number | null;
                const n26 = v26 ?? 0, n27 = v27 ?? 0;
                return <tr key={row.label} className={row.key === "fourWalls" ? "total-row" : ""}>
                  <td>{row.label}</td>
                  <td>{row.pct ? `${pct(a26.margin,a26.sales).toFixed(2)}%` : money(n26)}</td>
                  <td className={!row.pct && n27 < 0 ? "neg bold" : ""}>{row.pct ? `${pct(a27.margin,a27.sales).toFixed(2)}%` : money(n27)}</td>
                  <td><YoY current={row.pct ? pct(a27.margin,a27.sales) : n27} prior={row.pct ? pct(a26.margin,a26.sales) : n26} /></td>
                </tr>;
              })}</tbody>
            </table>
            <p className="fw-origin">{a27.fwAvailable ? "Four Walls oficial de columna V." : "Four Walls de respaldo por error/vacío en columna V."}</p>
          </div>
          <div>
            <label>VENTAS MENSUALES</label>
            <div className="modal-chart"><ResponsiveContainer><BarChart data={monthly}>
              <CartesianGrid stroke="#e7ebf1" vertical={false}/><XAxis dataKey="month"/><YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}`}/>
              <Tooltip content={<Tip/>}/><Legend/><Bar dataKey="sales26" name="2026E" fill="#9aabc3"/><Bar dataKey="sales27" name="2027P" fill="#285eb2"/>
            </BarChart></ResponsiveContainer></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Monthly({ selection }: { selection: StoreRow[] }) {
  const monthly = monthOrder.map((month) => {
    const sum = (year: 2026 | 2027) => selection.reduce((a, s) => addMetric(a, s.monthly[year][month] ?? emptyMetric()), emptyMetric());
    const y26 = sum(2026), y27 = sum(2027);
    return { month: monthShort[month], sales26: y26.sales, sales27: y27.sales, variation: variation(y27.sales, y26.sales) ?? 0, margin26: pct(y26.margin, y26.sales), margin27: pct(y27.margin, y27.sales) };
  });
  const total26 = monthly.reduce((a, x) => a + x.sales26, 0);
  const total27 = monthly.reduce((a, x) => a + x.sales27, 0);
  return (
    <>
      <div className="title"><div><i>01</i><span><h2>Comparativa mensual</h2><p>BASE 2027P vs BASE 2026E · apertura mensual real de BASE_CONSOLIDADA</p></span></div></div>
      <section className="panel">
        <label>VENTAS Y VARIACIÓN INTERANUAL</label><h3>Evolución mensual</h3>
        <div className="chart monthly">
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid stroke="#e7ebf1" vertical={false} />
              <XAxis dataKey="month" /><YAxis tickFormatter={(v) => Math.round(v / 1000).toLocaleString("es-CL")} />
              <YAxis yAxisId="pct" orientation="right" tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<Tip />} /><Legend />
              <Bar dataKey="sales26" name="BASE 2026E" fill="#9aabc3" radius={[4,4,0,0]} />
              <Bar dataKey="sales27" name="BASE 2027P" fill="#285eb2" radius={[4,4,0,0]} />
              <Line yAxisId="pct" type="monotone" dataKey="variation" name="Variación" stroke="#16a36a" strokeWidth={3} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="monthly-kpis">
        <article><label>VENTA 2026E</label><strong>{money(total26)}</strong></article>
        <article><label>VENTA 2027P</label><strong>{money(total27)}</strong></article>
        <article><label>VARIACIÓN</label><strong className={(variation(total27,total26) ?? 0) >= 0 ? "pos" : "neg"}>{variation(total27,total26)?.toFixed(1) ?? "—"}%</strong></article>
      </div>
      <section className="panel">
        <label>DETALLE MENSUAL</label><h3>Ventas y margen / venta</h3>
        <div className="scroll">
          <table>
            <thead><tr><th>MES</th><th>VENTA 2026E</th><th>MARGEN 2026E</th><th>VENTA 2027P</th><th>MARGEN 2027P</th><th>VAR. VENTA</th></tr></thead>
            <tbody>{monthly.map((m) => <tr key={m.month}><td><b>{m.month}</b></td><td>{money(m.sales26)}</td><td>{m.margin26.toFixed(2)}%</td><td>{money(m.sales27)}</td><td>{m.margin27.toFixed(2)}%</td><td className={m.variation >= 0 ? "pos" : "neg"}>{m.variation.toFixed(1)}%</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Detail({ selection }: { selection: StoreRow[] }) {
  const rows = selection.map((s) => {
    const m = s.annual[2027];
    const profitability = pct(m.utility, m.sales);
    const group = profitability >= 6 ? "Alta" : profitability >= 2 ? "Media" : "Baja";
    return { ...s, metric: m, profitability, group };
  }).sort((a, b) => b.profitability - a.profitability);
  return (
    <>
      {(["Alta","Media","Baja"] as const).map((group) => {
        const list = rows.filter((r) => r.group === group);
        return (
          <section className={`detail-group group-${group.toLowerCase()}`} key={group}>
            <div className="group-head"><div><h2>Rentabilidad {group}</h2><p>{group === "Alta" ? "Utilidad / venta ≥ 6%" : group === "Media" ? "Utilidad / venta entre 2% y 6%" : "Utilidad / venta < 2%"}</p></div><strong>{list.length} tiendas</strong></div>
            <div className="panel scroll">
              <table className="detail-table">
                <thead><tr><th>TIENDA</th><th>CADENA</th><th>APERTURA</th><th>VENTAS</th><th>MARGEN</th><th>MARGEN / VENTA</th><th>ARRIENDOS</th><th>REMUNERACIONES</th><th>COSTO OPERACIONAL</th><th>RESULTADO OPERACIONAL</th><th>UTILIDAD</th><th>VAR. UTILIDAD</th></tr></thead>
                <tbody>{list.map((s) => <tr key={s.code}>
                  <td><b>{s.name}</b><small>#{s.code}</small></td><td>{s.chain}</td><td><i className="tag">{openingType(s, 2027)}</i></td>
                  <td>{money(s.metric.sales)}</td><td>{money(s.metric.margin)}</td><td><b>{pct(s.metric.margin,s.metric.sales).toFixed(2)}%</b></td>
                  <td>{money(s.metric.rent)}</td><td>{money(s.metric.payroll)}</td><td>{money(s.metric.operatingCost)}</td>
                  <td className={s.metric.operatingResult >= 0 ? "pos" : "neg"}>{money(s.metric.operatingResult)}</td><td className={s.metric.utility >= 0 ? "pos bold" : "neg bold"}>{money(s.metric.utility)}</td>
                  <td><YoY current={s.metric.utility} prior={s.annual[2026].utility} /></td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}

const normalizeStoreKey = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^A-Z0-9]/gi, "")
  .toUpperCase();

function M2Analysis({ selection }: { selection: StoreRow[] }) {
  const { storeM2, catM2SnapshotStores, catM2SnapshotTotals } = usePrivateData();
  const [m2Year, setM2Year] = useState<Year>(2027);
  const [m2Period, setM2Period] = useState<ReportPeriod>("ANUAL");
  const [m2Months, setM2Months] = useState<string[]>(monthOrder);
  const m2MonthFilterRef = useRef<HTMLDetailsElement>(null);

  const activeM2Months = m2Period === "ANUAL" ? [] : m2Period === "MES" ? m2Months : quarterMonths[m2Period];
  const m2PeriodLabel = m2Period === "ANUAL"
    ? yearLabel(m2Year)
    : m2Period === "MES"
      ? `${yearLabel(m2Year)} · ${m2Months.length === 1 ? monthShort[m2Months[0]] : `${m2Months.length} meses`}`
      : `${yearLabel(m2Year)} · ${m2Period}`;
  const metricForM2Period = (store: StoreRow) => {
    if (m2Period === "ANUAL") return store.annual[m2Year];
    if (m2Year !== 2026 && m2Year !== 2027) return emptyMetric();
    return activeM2Months.reduce((sum, month) => addMetric(sum, store.monthly[m2Year][month] ?? emptyMetric()), emptyMetric());
  };
  const selectM2Period = (period: ReportPeriod) => {
    setM2Period(period);
    if (period !== "ANUAL" && m2Year !== 2026 && m2Year !== 2027) setM2Year(2027);
    if (period !== "MES") m2MonthFilterRef.current?.removeAttribute("open");
  };
  const toggleM2Month = (month: string) => {
    setM2Period("MES");
    if (m2Year !== 2026 && m2Year !== 2027) setM2Year(2027);
    setM2Months((current) => current.includes(month) ? current.filter((item) => item !== month) : [...current, month]);
  };
  const m2ByCode = useMemo(() => new Map(storeM2.map((row) => [normalizeStoreKey(row.code), row])), [storeM2]);
  const m2ByName = useMemo(() => new Map(storeM2.map((row) => [normalizeStoreKey(row.name), row])), [storeM2]);
  const rows = selection.map((store) => {
    const source = m2ByCode.get(normalizeStoreKey(store.code)) ?? m2ByName.get(normalizeStoreKey(store.name));
    const squareMeters = source?.squareMeters ?? 0;
    return { ...store, metric: metricForM2Period(store), squareMeters };
  });
  const matched = rows.filter((row) => row.squareMeters > 0);
  const missing = rows.filter((row) => row.squareMeters <= 0);
  const totalM2 = matched.reduce((sum, row) => sum + row.squareMeters, 0);
  const totals = matched.reduce((sum, row) => addMetric(sum, row.metric), emptyMetric());
  const perM2 = (value: number, squareMeters: number) => squareMeters ? value / squareMeters : 0;
  const m2Money = (value: number) => `${value < 0 ? "-" : ""}$${(Math.abs(value) / 1000).toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  const exportM2 = () => downloadExcel(
    `analisis-m2-tiendas-${yearLabel(m2Year)}-${m2Period.toLowerCase()}`,
    ["CC", "TIENDA", "CADENA", "M2", "VENTA", "VENTA / M2", "MARGEN", "MARGEN / M2", "MARGEN %", "ARRIENDO", "ARRIENDO / M2", "REMUNERACIONES", "REMUNERACIONES / M2", "GASTOS GENERALES", "GASTOS GENERALES / M2", "COSTO OPERACIONAL", "COSTO OPERACIONAL / M2", "RESULTADO OPERACIONAL", "RESULTADO OPERACIONAL / M2", "RESULTADO NO OPERACIONAL", "RESULTADO NO OPERACIONAL / M2", "EBITDA", "EBITDA / M2", "UTILIDAD", "UTILIDAD / M2", "FOUR WALLS", "FOUR WALLS / M2"],
    matched.map((row) => [
      row.code, row.name, row.chain, row.squareMeters,
      row.metric.sales, perM2(row.metric.sales, row.squareMeters),
      row.metric.margin, perM2(row.metric.margin, row.squareMeters), pct(row.metric.margin, row.metric.sales).toFixed(2),
      row.metric.rent, perM2(row.metric.rent, row.squareMeters),
      row.metric.payroll, perM2(row.metric.payroll, row.squareMeters),
      row.metric.general, perM2(row.metric.general, row.squareMeters),
      row.metric.operatingCost, perM2(row.metric.operatingCost, row.squareMeters),
      row.metric.operatingResult, perM2(row.metric.operatingResult, row.squareMeters),
      row.metric.nonOperating, perM2(row.metric.nonOperating, row.squareMeters),
      row.metric.ebitda, perM2(row.metric.ebitda, row.squareMeters),
      row.metric.utility, perM2(row.metric.utility, row.squareMeters),
      row.metric.fourWalls ?? 0, perM2(row.metric.fourWalls ?? 0, row.squareMeters),
    ]),
  );
  const chartRows = [...matched]
    .filter((row) => row.metric.sales !== 0)
    .sort((a, b) => perM2(b.metric.sales, b.squareMeters) - perM2(a.metric.sales, a.squareMeters))
    .slice(0, 12)
    .map((row) => ({ name: row.name, sales: perM2(row.metric.sales, row.squareMeters) / 1000, margin: perM2(row.metric.margin, row.squareMeters) / 1000 }));
  const catSnapshotVisible = selection.some((store) => store.chain === "Caterpillar");
  const catActiveStores = catM2SnapshotStores.filter((store) => store.sales > 0);
  const catSalesPerM2Benchmark = catM2SnapshotTotals.sales * 1000 / catM2SnapshotTotals.squareMeters;
  const correlation = (xValues: number[], yValues: number[]) => {
    const xMean = xValues.reduce((sum, value) => sum + value, 0) / xValues.length;
    const yMean = yValues.reduce((sum, value) => sum + value, 0) / yValues.length;
    const numerator = xValues.reduce((sum, value, index) => sum + (value - xMean) * (yValues[index] - yMean), 0);
    const xVariance = xValues.reduce((sum, value) => sum + (value - xMean) ** 2, 0);
    const yVariance = yValues.reduce((sum, value) => sum + (value - yMean) ** 2, 0);
    return xVariance && yVariance ? numerator / Math.sqrt(xVariance * yVariance) : 0;
  };
  const catAreaResultCorrelation = correlation(
    catActiveStores.map((store) => store.squareMeters),
    catActiveStores.map((store) => store.operatingResult),
  );
  const catAreaSalesDensityCorrelation = correlation(
    catActiveStores.map((store) => store.squareMeters),
    catActiveStores.map((store) => store.salesPerM2),
  );
  const catClusterForStore = (store: (typeof catM2SnapshotStores)[number]) => {
    if (store.sales === 0) return "S";
    if (store.operatingResult > 0) return store.salesPerM2 >= catSalesPerM2Benchmark ? "A" : "B";
    return store.salesPerM2 >= catSalesPerM2Benchmark ? "C" : "D";
  };
  const catClusterOrder = ["A", "B", "C", "D"];
  const catClusters = catClusterOrder.map((cluster) => {
    const storesInCluster = catM2SnapshotStores.filter((store) => catClusterForStore(store) === cluster);
    const clusterArea = storesInCluster.reduce((sum, store) => sum + store.squareMeters, 0);
    const clusterSales = storesInCluster.reduce((sum, store) => sum + store.sales, 0);
    const clusterResult = storesInCluster.reduce((sum, store) => sum + store.operatingResult, 0);
    const mixStores = storesInCluster.filter((store) => store.productMix !== null);
    const averageMix = [0, 1, 2].map((index) => mixStores.length
      ? mixStores.reduce((sum, store) => sum + (store.productMix?.[index] ?? 0), 0) / mixStores.length
      : 0);
    return {
      id: cluster,
      stores: storesInCluster,
      count: storesInCluster.length,
      area: clusterArea,
      salesPerM2: clusterArea ? clusterSales * 1000 / clusterArea : 0,
      operatingResult: clusterResult,
      mix: averageMix,
    };
  });
  const catInactiveStore = catM2SnapshotStores.find((store) => store.sales === 0);
  const catFormatNumber = (value: number) => Math.round(value).toLocaleString("es-CL");
  const exportCatM2 = () => downloadExcel(
    "cat-analisis-m2-2025",
    ["TIENDA", "CLUSTER", "M2", "VENTA", "VENTA / M2", "RESULTADO OPERACIONAL", "RESULTADO OPERACIONAL / M2", "CALZADO %", "VESTUARIO %", "ACCESORIOS %"],
    catM2SnapshotStores.map((store) => [
      store.name,
      catClusterForStore(store),
      store.squareMeters,
      store.sales,
      store.salesPerM2,
      store.operatingResult,
      store.operatingResultPerM2,
      ...(store.productMix ?? ["", "", ""]),
    ]),
  );
  return (
    <>
      <div className="title m2-title"><div><i>M2</i><span><h2>Productividad por metro cuadrado</h2><p>Venta, margen, arriendo y estructura completa del resultado normalizada por superficie</p></span></div><div className="title-actions m2-title-actions"><label className="year-select">AÑO<select value={m2Year} onChange={(e) => setM2Year(Number(e.target.value) as Year)}>{(m2Period === "ANUAL" ? years : ([2026, 2027] as Year[])).map((year) => <option key={year} value={year}>{yearLabel(year)}</option>)}</select><ChevronDown /></label><div className="quarter-filter" aria-label="Periodo del análisis M2">{(["ANUAL", "Q1", "Q2", "Q3", "Q4"] as Quarter[]).map((item) => <button key={item} className={m2Period === item ? "active" : ""} onClick={() => selectM2Period(item)}>{item}</button>)}<details data-dropdown name="portal-dropdown" className={`month-period-filter ${m2Period === "MES" ? "active" : ""}`} ref={m2MonthFilterRef}><summary onClick={() => selectM2Period("MES")}>MES</summary><div className="month-options"><div className="month-options-head"><b>{m2Months.length} MESES</b><button type="button" onClick={() => setM2Months(m2Months.length === monthOrder.length ? [] : monthOrder)}>{m2Months.length === monthOrder.length ? "LIMPIAR" : "TODOS"}</button></div>{monthOrder.map((month) => <label key={month}><input type="checkbox" checked={m2Months.includes(month)} onChange={() => toggleM2Month(month)} />{month}</label>)}</div></details></div><button className="export-button" onClick={exportM2} disabled={!matched.length}><Download /> EXPORTAR DETALLE EXCEL</button></div></div>
      <section className="m2-kpis">
        <article><label>SUPERFICIE ANALIZADA</label><strong>{totalM2.toLocaleString("es-CL", { maximumFractionDigits: 1 })} m²</strong><span>{matched.length} tiendas con superficie</span></article>
        <article><label>VENTA / M²</label><strong>{m2Money(perM2(totals.sales, totalM2))}</strong><span>MM$ por m² · {m2PeriodLabel}</span></article>
        <article><label>MARGEN / M²</label><strong>{m2Money(perM2(totals.margin, totalM2))}</strong><span>{pct(totals.margin, totals.sales).toFixed(1)}% sobre venta</span></article>
        <article><label>ARRIENDO / M²</label><strong className="neg">{m2Money(perM2(totals.rent, totalM2))}</strong><span>costo del período por m²</span></article>
        <article><label>UTILIDAD / M²</label><strong className={totals.utility >= 0 ? "pos" : "neg"}>{m2Money(perM2(totals.utility, totalM2))}</strong><span>resultado final por m²</span></article>
      </section>
      {catSnapshotVisible && <section className="m2-cat-analysis">
        <div className="m2-cat-heading"><div><label>DECISIÓN COMERCIAL · B&L</label><h3>CAT · desempeño por m² y mix de producto</h3><p>Corte 2025 del archivo recibido · unidades informadas por la fuente · el mix no cambia con el período del filtro superior</p></div><div className="m2-cat-heading-actions"><details className="m2-cat-decision"><summary>¿Conviene aumentar los m²?<ChevronDown /></summary><div><b>Respuesta ejecutiva: no como regla general.</b><p>La correlación entre superficie y ROP total es {catAreaResultCorrelation.toFixed(2)}; entre superficie y venta/m² es {catAreaSalesDensityCorrelation.toFixed(2)}. El corte no demuestra que una tienda de mayor tamaño sea más rentable. Una ampliación solo debiera aprobarse cuando el margen incremental esperado cubra el arriendo y los demás costos adicionales del espacio.</p><small>Validar por local: venta incremental/m² · margen incremental · arriendo/m² · ROP posterior a la ampliación.</small></div></details><button className="export-button" onClick={exportCatM2}><Download /> EXPORTAR CAT 2025</button></div></div>
        <div className="m2-cat-kpis">
          <div><label>TIENDAS RENTABLES</label><strong>27 / 35</strong><span>8 tiendas con ROP negativo</span></div>
          <div><label>VENTA / M² DE RED</label><strong>{catFormatNumber(catSalesPerM2Benchmark)}</strong><span>referencia ponderada 2025</span></div>
          <div><label>ROP / M² DE RED</label><strong>{catFormatNumber(catM2SnapshotTotals.operatingResult * 1000 / catM2SnapshotTotals.squareMeters)}</strong><span>resultado operacional ponderado</span></div>
          <div><label>TIENDA SIN VENTA</label><strong>{catInactiveStore?.name.replace("CAT ", "") ?? "—"}</strong><span>mix no informado en la fuente</span></div>
        </div>
        <div className="m2-cat-section-head"><div><label>SEGMENTACIÓN DE LA RED</label><h4>Clústeres por productividad y ROP</h4></div><span>Referencia de venta/m²: {catFormatNumber(catSalesPerM2Benchmark)} · ROP positivo/negativo</span></div>
        <div className="scroll m2-cat-scroll"><table className="detail-table compact-table m2-cat-clusters"><thead><tr><th>GRUPO</th><th>CRITERIO</th><th>TIENDAS</th><th>VENTA / M²</th><th>ROP AGREGADO</th><th>CALZADO</th><th>VESTUARIO</th><th>ACCESORIOS</th></tr></thead><tbody>{catClusters.map((cluster) => <tr key={cluster.id}><td><b className={`m2-cat-badge cluster-${cluster.id}`}>{cluster.id}</b></td><td>{({ A: "Rentable · productividad sobre red", B: "Rentable · productividad bajo red", C: "Pérdida · productividad sobre red", D: "Pérdida · productividad bajo red" })[cluster.id as "A" | "B" | "C" | "D"]}</td><td>{cluster.count}</td><td>{cluster.count ? catFormatNumber(cluster.salesPerM2) : "—"}</td><td className={cluster.operatingResult >= 0 ? "pos" : "neg"}>{cluster.count ? catFormatNumber(cluster.operatingResult) : "—"}</td><td>{cluster.count ? `${(cluster.mix[0] ?? 0).toFixed(1)}%` : "—"}</td><td>{cluster.count ? `${(cluster.mix[1] ?? 0).toFixed(1)}%` : "—"}</td><td>{cluster.count ? `${(cluster.mix[2] ?? 0).toFixed(1)}%` : "—"}</td></tr>)}</tbody></table></div>
        <p className="m2-cat-mix-note">El mix por sí solo no explica el resultado: en este corte la participación promedio de calzado varía poco entre grupos rentables y deficitarios. Contrastar cada categoría con margen, rotación y venta/m² antes de cambiar surtido o espacio.</p>
        <div className="m2-cat-section-head"><div><label>TIENDAS CAT · 2025</label><h4>Detalle y clasificación</h4></div><span>Promedio de red ponderado · fuente: análisis CAT m² 2025</span></div>
        <div className="scroll m2-cat-scroll"><table className="detail-table compact-table m2-cat-table"><thead><tr><th>TIENDA</th><th>GRUPO</th><th>M²</th><th>VENTA / M²</th><th>ROP</th><th>ROP / M²</th><th>CALZADO</th><th>VESTUARIO</th><th>ACCESORIOS</th></tr></thead><tbody>{[...catM2SnapshotStores].sort((a, b) => b.salesPerM2 - a.salesPerM2).map((store) => <tr key={store.name}><td><b>{store.name}</b></td><td><b className={`m2-cat-badge cluster-${catClusterForStore(store)}`}>{catClusterForStore(store)}</b></td><td>{store.squareMeters}</td><td>{catFormatNumber(store.salesPerM2)}</td><td className={store.operatingResult >= 0 ? "pos" : "neg"}>{catFormatNumber(store.operatingResult)}</td><td className={store.operatingResultPerM2 >= 0 ? "pos" : "neg"}>{catFormatNumber(store.operatingResultPerM2)}</td>{store.productMix ? store.productMix.map((share, index) => <td key={`${store.name}-${index}`}>{share}%</td>) : <td colSpan={3}>Sin mix informado</td>}</tr>)}</tbody></table></div>
      </section>}
      {missing.length > 0 && <div className="data-warning compact-warning"><AlertTriangle /><span><b>{missing.length} tiendas sin M2 homologado.</b> Se excluyen de los indicadores por superficie hasta completar el cruce en la hoja maestra.</span></div>}
      <section className="panel m2-chart-panel"><div className="monitor-head"><div><label>PRODUCTIVIDAD COMERCIAL</label><h3>Top tiendas por venta / m²</h3></div><span>Valores en MM$ por m² · {m2PeriodLabel}</span></div><div className="m2-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} layout="vertical" margin={{ left: 36, right: 24 }}><CartesianGrid stroke="#e7ebf1" horizontal={false} /><XAxis type="number" /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 9 }} /><Tooltip formatter={(value) => [`$${Number(value).toFixed(1)}`, "MM$ / m²"]} /><Legend /><Bar dataKey="sales" name="Venta / m²" fill="#285eb2" radius={[0, 4, 4, 0]} /><Bar dataKey="margin" name="Margen / m²" fill="#18a06b" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></section>
      <section className="panel m2-table-panel"><div className="monitor-head"><div><label>DETALLE POR TIENDA</label><h3>EERR normalizado por superficie</h3></div><span>{matched.length} tiendas · usa scroll horizontal para ver todos los ítems</span></div><div className="scroll m2-scroll"><table className="detail-table compact-table"><thead><tr><th>TIENDA</th><th>CADENA</th><th>M²</th><th>VENTA / M²</th><th>MARGEN / M²</th><th>MARGEN %</th><th>ARRIENDO / M²</th><th>REMUN. / M²</th><th>G. GENERALES / M²</th><th>COSTO OP. / M²</th><th>RESULTADO OP. / M²</th><th>EBITDA / M²</th><th>UTILIDAD / M²</th><th>FOUR WALLS / M²</th></tr></thead><tbody>{matched.sort((a, b) => perM2(b.metric.sales, b.squareMeters) - perM2(a.metric.sales, a.squareMeters)).map((row) => <tr key={row.code}><td><b>{row.name}</b><small>#{row.code}</small></td><td>{row.chain}</td><td><b>{row.squareMeters.toLocaleString("es-CL", { maximumFractionDigits: 1 })}</b></td><td>{m2Money(perM2(row.metric.sales, row.squareMeters))}</td><td>{m2Money(perM2(row.metric.margin, row.squareMeters))}</td><td>{pct(row.metric.margin, row.metric.sales).toFixed(1)}%</td><td className="neg">{m2Money(perM2(row.metric.rent, row.squareMeters))}</td><td className="neg">{m2Money(perM2(row.metric.payroll, row.squareMeters))}</td><td>{m2Money(perM2(row.metric.general, row.squareMeters))}</td><td className="neg">{m2Money(perM2(row.metric.operatingCost, row.squareMeters))}</td><td className={row.metric.operatingResult >= 0 ? "pos" : "neg"}>{m2Money(perM2(row.metric.operatingResult, row.squareMeters))}</td><td className={row.metric.ebitda >= 0 ? "pos" : "neg"}>{m2Money(perM2(row.metric.ebitda, row.squareMeters))}</td><td className={row.metric.utility >= 0 ? "pos bold" : "neg bold"}>{m2Money(perM2(row.metric.utility, row.squareMeters))}</td><td className={(row.metric.fourWalls ?? 0) >= 0 ? "pos" : "neg"}>{m2Money(perM2(row.metric.fourWalls ?? 0, row.squareMeters))}</td></tr>)}</tbody></table></div></section>
    </>
  );
}

function BreakEven({ selection }: { selection: StoreRow[] }) {
  const [breakEvenMetric, setBreakEvenMetric] = useState<ProfitMetric>("fourWalls");
  const [breakEvenYear, setBreakEvenYear] = useState<Year>(2027);
  const metricValue = (store: StoreRow, year: Year) => breakEvenMetric === "utility" ? store.annual[year].utility : store.annual[year].fourWalls;
  const metricLabel = breakEvenMetric === "utility" ? "Utilidad" : "Four Walls";
  const scenarioLabel = `${breakEvenYear}S`;
  const overallSales = selection.reduce((a, s) => a + Math.max(0, s.annual[breakEvenYear].sales), 0);
  const overallMargin = selection.reduce((a, s) => a + Math.max(0, s.annual[breakEvenYear].margin), 0);
  const overallRate = overallSales ? overallMargin / overallSales : 0;
  const chainRate = (chain: string) => {
    const peers = selection.filter((s) => s.chain === chain && s.annual[breakEvenYear].sales > 0 && s.annual[breakEvenYear].margin > 0);
    const sales = peers.reduce((a, s) => a + s.annual[breakEvenYear].sales, 0);
    return sales ? peers.reduce((a, s) => a + s.annual[breakEvenYear].margin, 0) / sales : overallRate;
  };
  const rows = selection
    .filter((s) => (metricValue(s, breakEvenYear) ?? 0) < 0)
    .map((s) => {
      const current = s.annual[breakEvenYear];
      const currentResult = metricValue(s, breakEvenYear) ?? 0;
      const ownRate = current.sales > 0 && current.margin > 0 ? current.margin / current.sales : 0;
      const rate = ownRate || chainRate(s.chain);
      const targetMargin = current.margin - currentResult;
      const targetSales = rate > 0 ? Math.max(current.sales, targetMargin / rate) : 0;
      return {
        ...s,
        current,
        currentResult,
        rate,
        rateSource: ownRate ? "Margen tienda 2027P" : "Margen promedio cadena",
        targetMargin,
        targetSales,
        salesGap: targetSales - current.sales,
        growth: variation(targetSales, current.sales),
      };
    })
    .sort((a, b) => b.salesGap - a.salesGap);
  const totalLoss = rows.reduce((a, s) => a + s.currentResult, 0);
  const totalCurrentSales = rows.reduce((a, s) => a + s.current.sales, 0);
  const totalTargetSales = rows.reduce((a, s) => a + s.targetSales, 0);
  const totalTargetMargin = rows.reduce((a, s) => a + s.targetMargin, 0);
  const exportBreakEven = () => downloadExcel(
    `break-even-${breakEvenMetric}-${scenarioLabel}`,
    ["CC", "TIENDA", "CADENA", ...years.flatMap((y) => [`VENTA ${yearLabel(y)}`, `MARGEN % ${yearLabel(y)}`, `${metricLabel.toUpperCase()} ${yearLabel(y)}`]), `VENTA ${scenarioLabel}`, `MARGEN ${scenarioLabel}`, `MARGEN % ${scenarioLabel}`, "BRECHA VENTA", `${metricLabel.toUpperCase()} ${scenarioLabel}`],
    rows.map((s) => [
      s.code, s.name, s.chain,
      ...years.flatMap((y) => [Math.round(s.annual[y].sales / 1000), pct(s.annual[y].margin, s.annual[y].sales).toFixed(2), Math.round((metricValue(s, y) ?? 0) / 1000)]),
      Math.round(s.targetSales / 1000), Math.round(s.targetMargin / 1000), (s.rate * 100).toFixed(2), Math.round(s.salesGap / 1000), 0,
    ]),
  );
  return (
    <>
      <div className="title"><div><i>05</i><span><h2>Break-Even</h2><p>Simulación de punto cero para tiendas con {metricLabel.toLowerCase()} negativo en {yearLabel(breakEvenYear)}</p></span></div><div className="title-actions"><div className="quadrant-controls be-controls"><div className="profit-toggle"><button className={breakEvenMetric === "fourWalls" ? "active" : ""} onClick={() => setBreakEvenMetric("fourWalls")}>FOUR WALLS</button><button className={breakEvenMetric === "utility" ? "active" : ""} onClick={() => setBreakEvenMetric("utility")}>UTILIDAD</button></div><label className="year-select">AÑO<select value={breakEvenYear} onChange={(e) => setBreakEvenYear(Number(e.target.value) as Year)}>{years.map((y) => <option key={y} value={y}>{yearLabel(y)}</option>)}</select><ChevronDown /></label></div><strong className="neg">{rows.length} tiendas bajo punto de equilibrio</strong><button className="export-button" onClick={exportBreakEven}>EXPORTAR A EXCEL</button></div></div>
      <section className="be-kpis">
        <article><label>{metricLabel.toUpperCase()} NEGATIVO · {yearLabel(breakEvenYear)}</label><strong className="neg">{money(totalLoss)}</strong><span>universo simulado</span></article>
        <article><label>VENTA ACTUAL · {yearLabel(breakEvenYear)}</label><strong>{money(totalCurrentSales)}</strong><span>tiendas con pérdida</span></article>
        <article><label>VENTA REQUERIDA · {scenarioLabel}</label><strong>{money(totalTargetSales)}</strong><span>punto de equilibrio {metricLabel}</span></article>
        <article><label>BRECHA DE VENTA</label><strong className="pos">{money(totalTargetSales - totalCurrentSales)}</strong><span>incremento requerido</span></article>
      </section>
      <div className="be-method">
        <b>Metodología {scenarioLabel} · {metricLabel}:</b> costos y tasa de margen de {yearLabel(breakEvenYear)} constantes. Margen requerido = margen actual − {metricLabel.toLowerCase()} actual; venta requerida = margen requerido / tasa de margen. Si la tienda no tiene una tasa válida, se usa el promedio ponderado de su cadena.
      </div>
      <section className="panel be-panel">
        <div className="monitor-head"><div><label>SIMULACIÓN BREAK-EVEN · {metricLabel.toUpperCase()}</label><h3>Historia y escenario {scenarioLabel}</h3></div><span>Ordenado por mayor brecha de venta</span></div>
        <div className="scroll be-scroll">
          <table className="compact-table break-even-table">
            <thead>
              <tr>
                <th rowSpan={2}>TIENDA</th><th rowSpan={2}>CADENA</th>
                {years.map((y) => <th key={y} colSpan={3}>{yearLabel(y)}</th>)}
                <th colSpan={5} className="sim-head">{scenarioLabel} · PUNTO CERO {metricLabel.toUpperCase()}</th>
              </tr>
              <tr>
                {years.flatMap((y) => [<th key={`${y}-v`}>VENTA</th>,<th key={`${y}-m`}>MARGEN %</th>,<th key={`${y}-u`}>{metricLabel.toUpperCase()}</th>])}
                <th>VENTA</th><th>MARGEN</th><th>MARGEN %</th><th>BRECHA VENTA</th><th>{metricLabel.toUpperCase()}</th>
              </tr>
            </thead>
            <tbody>{rows.map((s) => <tr key={s.code}>
              <td><b>{s.name}</b><small>#{s.code} · {s.rateSource}</small></td><td>{s.chain}</td>
              {years.flatMap((y) => {
                const m = s.annual[y];
                return [
                  <td key={`${y}-v`}>{money(m.sales)}</td>,
                  <td key={`${y}-m`}>{pct(m.margin,m.sales).toFixed(2)}%</td>,
                  <td key={`${y}-u`} className={(metricValue(s, y) ?? 0) < 0 ? "neg" : "pos"}>{money(metricValue(s, y) ?? 0)}</td>,
                ];
              })}
              <td className="sim-cell"><b>{money(s.targetSales)}</b></td>
              <td className="sim-cell">{money(s.targetMargin)}</td>
              <td className="sim-cell">{(s.rate * 100).toFixed(2)}%</td>
              <td className="sim-cell"><b>{money(s.salesGap)}</b><small>{s.growth === null ? "Base sin venta" : `+${s.growth.toFixed(1)}%`}</small></td>
              <td className="sim-cell pos bold">{money(0)}</td>
            </tr>)}</tbody>
            <tfoot><tr className="grand-total"><td>TOTAL</td><td>{rows.length} tiendas</td><td colSpan={12}></td><td>{money(totalTargetSales)}</td><td>{money(totalTargetMargin)}</td><td>{pct(totalTargetMargin,totalTargetSales).toFixed(2)}%</td><td>{money(totalTargetSales-totalCurrentSales)}</td><td>{money(0)}</td></tr></tfoot>
          </table>
        </div>
      </section>
    </>
  );
}

const mallOf = (name: string) => {
  const cleaned = name
    .replace(/^(H\.P\.|HUSH PUPPIES|HPK|D\.HOUSE|DH|RKF|ROCKFORD|MERRELL|COLUMBIA|VANS|CROCS|LOP|SE|SHOE EXPRESS|7VEINTE|BSOUL|CATERPILLAR|CAT)\s*/i, "")
    .trim();
  return cleaned || "Pendiente";
};

function StoreMonitor({ selection }: { selection: StoreRow[] }) {
  const { storeM2, storeContractEnd } = usePrivateData();
  const [classificationFilter, setClassificationFilter] = useState<ClassificationFilter>("TOTAL");
  const [monitorFilter, setMonitorFilter] = useState<MonitorFilter>("TOTAL");
  const [monitorYear, setMonitorYear] = useState<2026 | 2027>(2027);
  const m2ByCode = useMemo(() => new Map(storeM2.map((row) => [normalizeStoreKey(row.code), row])), [storeM2]);
  const m2ByName = useMemo(() => new Map(storeM2.map((row) => [normalizeStoreKey(row.name), row])), [storeM2]);
  const duplicateNames = new Set(
    selection
      .filter((s, _, all) => all.filter((x) => x.name.trim().toUpperCase() === s.name.trim().toUpperCase()).length > 1)
      .map((s) => s.name.trim().toUpperCase()),
  );
  const rows = selection.map((s) => {
    const active = years.filter((y) => Math.abs(s.annual[y].sales) > 0);
    const contractEnd = storeContractEnd[s.code] ?? null;
    const m2Source = m2ByCode.get(normalizeStoreKey(s.code)) ?? m2ByName.get(normalizeStoreKey(s.name));
    const squareMeters = m2Source?.squareMeters ?? 0;
    const issues = [
      s.chain === "OTROS" ? "Revisar cadena" : "",
      mallOf(s.name) === "Pendiente" ? "Completar mall" : "",
      duplicateNames.has(s.name.trim().toUpperCase()) ? "Nombre duplicado" : "",
      !active.length ? "Sin ventas" : "",
      !contractEnd && s.annual[monitorYear].sales !== 0 ? "Falta fecha contrato" : "",
    ].filter(Boolean);
    return { ...s, mall: mallOf(s.name), contractEnd, active, issues, squareMeters };
  });
  const hasNsInYear = (store: StoreRow, year: 2026 | 2027) =>
    monthOrder.some((month) => openingType(store, year, month) === "NS");
  const nsMonthsInYear = (store: StoreRow, year: 2026 | 2027) =>
    monthOrder.filter((month) => openingType(store, year, month) === "NS");
  const isRemodeled = (store: StoreRow, year: 2026 | 2027) => {
    const nsMonths = nsMonthsInYear(store, year).length;
    return nsMonths >= 1 && nsMonths <= 3;
  };
  const classificationCounts = {
    2026: {
      ns: rows.filter((store) => hasNsInYear(store, 2026)).length,
      sss: rows.filter((store) => !hasNsInYear(store, 2026)).length,
    },
    2027: {
      ns: rows.filter((store) => hasNsInYear(store, 2027)).length,
      sss: rows.filter((store) => !hasNsInYear(store, 2027)).length,
    },
  };
  const pending = rows.filter((r) => r.issues.length);
  const hasAnyNsMonth = (store: StoreRow) => ([2026, 2027] as const).some((year) => hasNsInYear(store, year));
  const monitorRows = rows.filter((store) => {
    if (monitorFilter === "TOTAL") return true;
    if (monitorFilter === "CHAIN_OTHER") return store.chain === "OTROS";
    if (monitorFilter === "DUPLICATE") return duplicateNames.has(store.name.trim().toUpperCase());
    if (monitorFilter === "ACTIVE_YEAR") return store.annual[monitorYear].sales !== 0;
    if (monitorFilter === "NO_CONTRACT") return !store.contractEnd && store.annual[monitorYear].sales !== 0;
    if (monitorFilter === "NO_M2") return store.squareMeters <= 0;
    if (monitorFilter === "SSS_YEAR") return !hasNsInYear(store, monitorYear);
    if (monitorFilter === "NS_YEAR") return hasNsInYear(store, monitorYear);
    return isRemodeled(store, monitorYear);
  });
  const visibleRows = classificationFilter === "TOTAL"
    ? monitorRows
    : monitorRows.filter((store) => classificationFilter === "NS" ? hasAnyNsMonth(store) : !hasAnyNsMonth(store));
  const selectMonitorFilter = (filter: MonitorFilter) => {
    setMonitorFilter((current) => current === filter && filter !== "TOTAL" ? "TOTAL" : filter);
    setClassificationFilter("TOTAL");
  };
  return (
    <>
      <div className="title"><div><i>04</i><span><h2>Monitor maestro de tiendas</h2><p>Control preliminar para cuadratura de tiendas, cadenas y mall / ubicación</p></span></div><div className="monitor-year-control"><div className="classification-filter" aria-label="Año del monitor">{([2026, 2027] as const).map((year) => <button type="button" key={year} className={monitorYear === year ? "active" : ""} onClick={() => { setMonitorYear(year); setMonitorFilter("TOTAL"); setClassificationFilter("TOTAL"); }}>{year === 2026 ? "2026E" : "2027P"}</button>)}</div><strong>{pending.length} registros por revisar</strong></div></div>
      <section className="monitor-kpis">
        <button type="button" className={`monitor-kpi ${monitorFilter === "TOTAL" ? "active" : ""}`} onClick={() => selectMonitorFilter("TOTAL")}><label>TIENDAS / CC</label><strong>{rows.length}</strong><span>registros únicos</span></button>
        <button type="button" className={`monitor-kpi ${monitorFilter === "CHAIN_OTHER" ? "active" : ""}`} onClick={() => selectMonitorFilter("CHAIN_OTHER")}><label>CADENA OTROS</label><strong>{rows.filter((r) => r.chain === "OTROS").length}</strong><span>requieren clasificación</span></button>
        <button type="button" className={`monitor-kpi ${monitorFilter === "DUPLICATE" ? "active" : ""}`} onClick={() => selectMonitorFilter("DUPLICATE")}><label>NOMBRES DUPLICADOS</label><strong>{duplicateNames.size}</strong><span>posibles homologaciones</span></button>
        <button type="button" className={`monitor-kpi ${monitorFilter === "ACTIVE_YEAR" ? "active" : ""}`} onClick={() => selectMonitorFilter("ACTIVE_YEAR")}><label>ACTIVAS {monitorYear === 2026 ? "2026E" : "2027P"}</label><strong>{rows.filter((r) => r.annual[monitorYear].sales !== 0).length}</strong><span>con venta anual</span></button>
        <button type="button" className={`monitor-kpi ${monitorFilter === "NO_CONTRACT" ? "active" : ""}`} onClick={() => selectMonitorFilter("NO_CONTRACT")}><label>SIN FECHA CONTRATO</label><strong>{rows.filter((r) => !r.contractEnd && r.annual[monitorYear].sales !== 0).length}</strong><span>activas en el año seleccionado</span></button>
        <button type="button" className={`monitor-kpi missing-m2 ${monitorFilter === "NO_M2" ? "active" : ""}`} onClick={() => selectMonitorFilter("NO_M2")}><label>TIENDAS SIN M²</label><strong>{rows.filter((r) => r.squareMeters <= 0).length}</strong><span>requieren completar superficie</span></button>
        <button type="button" className={`monitor-kpi classification-kpi sss ${monitorFilter === "SSS_YEAR" ? "active" : ""}`} onClick={() => selectMonitorFilter("SSS_YEAR")}><label>SSS {monitorYear === 2026 ? "2026E" : "2027P"}</label><strong>{classificationCounts[monitorYear].sss}</strong><span>SSS los 12 meses</span></button>
        <button type="button" className={`monitor-kpi classification-kpi ns ${monitorFilter === "NS_YEAR" ? "active" : ""}`} onClick={() => selectMonitorFilter("NS_YEAR")}><label>NS {monitorYear === 2026 ? "2026E" : "2027P"}</label><strong>{classificationCounts[monitorYear].ns}</strong><span>al menos un mes NS</span></button>
        <button type="button" className={`monitor-kpi remodeled ${monitorFilter === "REMODELED" ? "active" : ""}`} onClick={() => selectMonitorFilter("REMODELED")}><label>REMODELADAS {monitorYear === 2026 ? "2026E" : "2027P"}</label><strong>{rows.filter((r) => isRemodeled(r, monitorYear)).length}</strong><span>entre 1 y 3 meses NS</span></button>
      </section>
      <section className="panel monitor-panel">
        <div className="monitor-head">
          <div><label>BASE DE CONTROL</label><h3>Listado de tiendas</h3></div>
          <div className="monitor-head-actions">
            <div className="classification-filter" aria-label="Filtrar clasificación del monitor">
              {(["TOTAL", "SSS", "NS"] as ClassificationFilter[]).map((item) => (
                <button key={item} className={classificationFilter === item ? "active" : ""} onClick={() => setClassificationFilter(item)}>{item}</button>
              ))}
            </div>
            <span>{visibleRows.length} tiendas · clasificación mensual 2026–2027</span>
          </div>
        </div>
        <div className="scroll monitor-scroll">
          <table className="detail-table compact-table">
            <thead>
              <tr><th rowSpan={2}>CC REPORTE</th><th rowSpan={2}>TIENDA HOMOLOGADA</th><th rowSpan={2}>CADENA</th><th rowSpan={2}>MALL / UBICACIÓN</th><th rowSpan={2}>M²</th><th rowSpan={2}>MESES NS {monitorYear}</th><th rowSpan={2}>FIN CONTRATO</th><th colSpan={12}>CLASIFICACIÓN 2026E</th><th colSpan={12}>CLASIFICACIÓN 2027P</th><th rowSpan={2}>ESTADO CONTROL</th></tr>
              <tr>{([2026, 2027] as const).flatMap((year) => monthOrder.map((month) => <th key={`${year}-${month}`}>{monthShort[month]}</th>))}</tr>
            </thead>
            <tbody>{visibleRows.map((s) => <tr key={s.code}>
              <td><b>{s.code}</b></td><td><b>{s.name}</b></td><td className={s.chain === "OTROS" ? "neg bold" : ""}>{s.chain}</td><td>{s.mall}</td><td className={s.squareMeters <= 0 ? "missing-m2" : ""}>{s.squareMeters > 0 ? s.squareMeters.toLocaleString("es-CL", { maximumFractionDigits: 1 }) : "SIN M²"}</td><td>{nsMonthsInYear(s, monitorYear).length ? nsMonthsInYear(s, monitorYear).map((month) => monthShort[month]).join(" · ") : "—"}</td><td className={!s.contractEnd && s.annual[monitorYear].sales !== 0 ? "missing-contract" : ""}>{s.contractEnd ?? (s.annual[monitorYear].sales !== 0 ? "FALTA FECHA" : "NO REQUERIDA")}</td>
              {([2026, 2027] as const).flatMap((year) => monthOrder.map((month) => {
                const classification = openingType(s, year, month);
                return <td key={`${year}-${month}`}><i className={`tag classification-${classification.toLowerCase()}`}>{classification}</i></td>;
              }))}
              <td>{s.issues.length ? <i className="status low">● {s.issues.join(" · ")}</i> : <i className="status good">● Cuadrada</i>}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function UsuariosAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [keyColumn, setKeyColumn] = useState<string | null>(null);
  const [roleColumn, setRoleColumn] = useState("Rol");
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [activeColumn, setActiveColumn] = useState("Activo");
  const [totalRows, setTotalRows] = useState(0);
  const [usersCapped, setUsersCapped] = useState(false);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/usuarios?limit=all", { cache: "no-store" });
      const payload = await response.json() as UsersPayload;
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar usuarios.");
      setUsers(payload.rows);
      setColumns(payload.columns);
      setKeyColumn(payload.keyColumn);
      setRoleColumn(payload.roleColumn);
      setRoleOptions(payload.roleOptions);
      setActiveColumn(payload.activeColumn);
      setTotalRows(payload.totalRows);
      setUsersCapped(Boolean(payload.capped));
      setDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsers(), 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const visibleRows = useMemo(() => {
    const needles = query
      .split(/[,;\n\r]+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (!needles.length) return users;
    return users.filter((row) => {
      const haystack = columns.map((column) => displayCell(row.data[column]).toLowerCase()).join(" ");
      return needles.some((needle) => haystack.includes(needle));
    });
  }, [columns, query, users]);
  const visibleColumns = useMemo(
    () => columns.filter((column) => !hiddenUserColumns.has(column.toLowerCase())),
    [columns],
  );

  const editableValue = (row: UserRow): UserDraft => drafts[row.id] ?? {
    rol: displayCell(row.data[roleColumn]),
    activo: isActiveValue(row.data[activeColumn]),
  };
  const setDraft = (row: UserRow, patch: Partial<UserDraft>) =>
    setDrafts((current) => ({
      ...current,
      [row.id]: { ...editableValue(row), ...patch },
    }));
  const saveRow = async (row: UserRow) => {
    if (!keyColumn) {
      setError("No hay una columna llave confiable para guardar cambios.");
      return;
    }
    const draft = editableValue(row);
    setSaving((current) => ({ ...current, [row.id]: true }));
    setError("");
    try {
      const response = await fetch("/api/usuarios", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          keyColumn,
          keyValue: row.data[keyColumn],
          rol: draft.rol,
          activo: draft.activo,
        }),
      });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar el usuario.");
      setUsers((current) => current.map((item) => item.id === row.id
        ? { ...item, data: { ...item.data, [roleColumn]: draft.rol, [activeColumn]: draft.activo } }
        : item));
      setDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el usuario.");
    } finally {
      setSaving((current) => ({ ...current, [row.id]: false }));
    }
  };

  const activeCount = users.filter((row) => isActiveValue(row.data[activeColumn])).length;
  const pendingCount = Object.keys(drafts).length;

  return (
    <>
      <div className="title">
        <div><i>06</i><span><h2>Usuarios</h2><p>Registros de Personas</p></span></div>
        <div className="title-actions">
          <strong>{pendingCount} cambios pendientes</strong>
          <button className="export-button" onClick={loadUsers} disabled={loading}><RefreshCw className={loading ? "spin" : ""} /> SINCRONIZAR</button>
        </div>
      </div>
      <section className="users-kpis">
        <article><label>REGISTROS CARGADOS</label><strong>{users.length}</strong><span>{usersCapped ? `tope alcanzado: ${totalRows}` : `${totalRows} filas cargadas`}</span></article>
        <article><label>USUARIOS ACTIVOS</label><strong>{activeCount}</strong><span>{users.length ? ((activeCount / users.length) * 100).toFixed(1) : "0.0"}% de la vista</span></article>
      </section>
      {error && <div className="data-warning"><AlertTriangle /><span>{error}</span></div>}
      <section className="panel users-panel">
        <div className="monitor-head">
          <div><label>ADMINISTRACION</label><h3>Roles y estado de acceso</h3></div>
          <div className="users-search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="BUSCAR USUARIO, RUT, EMAIL O ROL..." /></div>
        </div>
        <div className="scroll users-scroll">
          <table className="detail-table compact-table users-table">
            <thead>
              <tr>
                {visibleColumns.map((column) => <th key={column}>{column}</th>)}
                <th>ACCION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={visibleColumns.length + 1}>Cargando usuarios...</td></tr>
              ) : visibleRows.length ? visibleRows.map((row) => {
                const draft = editableValue(row);
                const changed = Boolean(drafts[row.id]);
                return (
                  <tr key={row.id}>
                    {visibleColumns.map((column) => {
                      if (column === roleColumn) {
                        return (
                          <td key={column}>
                            <select className="user-role-input" value={draft.rol} onChange={(e) => setDraft(row, { rol: e.target.value })}>
                              <option value="">Selecciona un rol</option>
                              {draft.rol && !roleOptions.includes(draft.rol) && <option value={draft.rol} disabled>{draft.rol} (no disponible)</option>}
                              {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                            </select>
                          </td>
                        );
                      }
                      if (column === activeColumn) {
                        return (
                          <td key={column}>
                            <label className="active-toggle">
                              <input type="checkbox" checked={draft.activo} onChange={(e) => setDraft(row, { activo: e.target.checked })} />
                              <span>{draft.activo ? "Activo" : "Inactivo"}</span>
                            </label>
                          </td>
                        );
                      }
                      return <td key={column}>{displayCell(row.data[column])}</td>;
                    })}
                    <td>
                      <button className="save-user-button" onClick={() => void saveRow(row)} disabled={!changed || saving[row.id] || !keyColumn}>
                        <Save /> {saving[row.id] ? "GUARDANDO" : "GUARDAR"}
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={visibleColumns.length + 1}>No hay usuarios para la busqueda actual.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function EconomicIndicators() {
  const [indicators, setIndicators] = useState<MarketIndicator[]>([]);
  const [indicatorError, setIndicatorError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/market-indicators", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Indicadores no disponibles");
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        const valid = parseMarketIndicators(payload);
        setIndicators(valid);
        setIndicatorError(valid.length < 4);
      })
      .catch((error) => { if (error.name !== "AbortError") setIndicatorError(true); });
    return () => controller.abort();
  }, []);

  const icons = {
    dolar: CircleDollarSign,
    uf: Landmark,
    petroleo: Waves,
    cobre: Activity,
  };
  const numberFormat = (indicator: MarketIndicator) => new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: indicator.id === "uf" ? 2 : 2,
    maximumFractionDigits: 2,
  }).format(indicator.value);
  const chartPoints = (history: number[]) => {
    if (!history.length) return "";
    const low = Math.min(...history);
    const high = Math.max(...history);
    const range = high - low || 1;
    return history.map((value, index) => `${(index / Math.max(history.length - 1, 1)) * 100},${34 - ((value - low) / range) * 30}`).join(" ");
  };

  return <div className="economic-panel">
    <div className="economic-panel-head"><div><small>PULSO ECONÓMICO</small><h2>Indicadores diarios</h2></div><span><i /> Datos actualizados</span></div>
    <div className="economic-grid">
      {indicators.length ? [...indicators].sort((a, b) => ["dolar", "uf", "petroleo", "cobre"].indexOf(a.id) - ["dolar", "uf", "petroleo", "cobre"].indexOf(b.id)).map((indicator) => {
        const Icon = icons[indicator.id];
        const hasTrend = indicator.history.length > 1;
        const direction = indicator.change > 0.001 ? "up" : indicator.change < -0.001 ? "down" : "flat";
        return <article className={`economic-card ${direction}`} key={indicator.id}>
          <div className="economic-card-title"><i><Icon /></i><span><b>{indicator.label}</b><small>{indicator.unit}</small></span></div>
          <strong>{indicator.id === "dolar" || indicator.id === "uf" ? "$" : "US$"} {numberFormat(indicator)}</strong>
          <div className="economic-trend"><span>{hasTrend ? `${indicator.change >= 0 ? "+" : ""}${indicator.change.toFixed(2)}%` : "Último dato"}</span><small>{hasTrend ? "vs. dato anterior" : "disponible"}</small></div>
          <svg viewBox="0 0 100 38" preserveAspectRatio="none" aria-hidden="true"><polyline points={chartPoints(indicator.history)} /></svg>
          <time dateTime={indicator.date}>{indicatorDateLabel(indicator.date)}</time>
        </article>;
      }) : Array.from({ length: 4 }, (_, index) => <article className="economic-card loading" key={index}><span /><b /><i /></article>)}
    </div>
    <div className="economic-source"><span>{indicatorError ? "Algunos indicadores no están disponibles temporalmente." : "Valores referenciales · última observación disponible"}</span><a href="https://www.bcentral.cl/es/areas/estadisticas" target="_blank" rel="noreferrer">BCCh</a><a href="https://fred.stlouisfed.org/series/DCOILBRENTEU" target="_blank" rel="noreferrer">FRED</a></div>
  </div>;
}

function DollarLoginPanel() {
  const [dollarData, setDollarData] = useState<DollarHistoryPayload | null>(null);
  const [dollarError, setDollarError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/dollar-history", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as DollarHistoryPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error || "No fue posible cargar el dólar observado.");
        if (!Array.isArray(payload.points) || !payload.points.length || !Array.isArray(payload.months) || !payload.months.length) throw new Error("No hay observaciones disponibles para este período.");
        return payload;
      })
      .then(setDollarData)
      .catch((error) => { if (error.name !== "AbortError") setDollarError(error instanceof Error ? error.message : "Fuente no disponible"); });
    return () => controller.abort();
  }, [loadAttempt]);

  const peso = (value: number) => `$${new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  const shortDate = (date: string) => new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const latest = dollarData?.points.at(-1);

  return <div className="finance-board dollar-board">
    <header><div><i><BarChart3 /></i><span><b>DÓLAR OBSERVADO</b><small>Comportamiento diario · Chile</small></span></div>{latest && <em>{peso(latest.value)} · {shortDate(latest.date)}</em>}</header>
    {dollarData ? <>
      <div className="dollar-months">{dollarData.months.map((month) => <article key={month.key} className={month.closed ? "closed" : "current"}><span>{month.label}</span><strong>{peso(month.average)}</strong><small>Promedio mensual · {month.observations} días</small><i>{month.closed ? "MES CERRADO" : "MES ACTUAL"}</i></article>)}</div>
      <div className="dollar-chart-head"><div><label>EVOLUCIÓN DIARIA</label><h2>Dos meses cerrados + mes actual</h2></div><span><i className="daily" />Valor diario <i className="average" />Promedio del mes</span></div>
      <div className="dollar-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={dollarData.points} margin={{ top: 16, right: 14, left: 4, bottom: 4 }}><CartesianGrid stroke="#e4e9ef" vertical={false} /><XAxis dataKey="date" tickFormatter={shortDate} minTickGap={34} tick={{ fontSize: 9, fill: "#748196" }} axisLine={{ stroke: "#ccd5df" }} tickLine={false} /><YAxis domain={["dataMin - 5", "dataMax + 5"]} tickFormatter={(value) => `$${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Number(value))}`} tick={{ fontSize: 9, fill: "#748196" }} axisLine={false} tickLine={false} width={52} /><Tooltip labelFormatter={(label) => shortDate(String(label))} formatter={(value, name) => [peso(Number(value)), name === "value" ? "Dólar observado" : "Promedio mensual"]} contentStyle={{ border: "1px solid #dce2e9", borderRadius: 3, fontSize: 11 }} /><Line type="stepAfter" dataKey="average" name="average" stroke="#23a3cb" strokeWidth={1.7} strokeDasharray="5 5" dot={false} activeDot={false} /><Line type="monotone" dataKey="value" name="value" stroke="#173b70" strokeWidth={3} dot={{ r: 2, fill: "#fff", stroke: "#173b70", strokeWidth: 1.5 }} activeDot={{ r: 5, fill: "#173b70" }} /></LineChart></ResponsiveContainer></div>
      <p className="dollar-observation">Última observación publicada: {new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${latest!.date}T12:00:00Z`))}. Promedios calculados con las observaciones disponibles.</p>
      <footer className="dollar-source"><span><i />FUENTE DE INFORMACIÓN</span><b>{dollarData.source}</b><a href={dollarData.sourceUrl} target="_blank" rel="noreferrer">Ver fuente de datos</a></footer>
    </> : <div className={`dollar-loading ${dollarError ? "error" : ""}`} aria-live="polite">{dollarError ? <><AlertTriangle /><strong>{dollarError}</strong><button type="button" onClick={() => { setDollarError(""); setLoadAttempt(current => current + 1); }}>Reintentar</button></> : <><RefreshCw className="spin" /><strong>Cargando historia del dólar…</strong></>}</div>}
  </div>;
}

function LoginForm({ onLogin }: { onLogin: (user: AuthUser) => void | Promise<void> }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/config")
      .then(async (response) => {
        const payload = await response.json() as { googleClientId?: string };
        if (active && response.ok) setGoogleClientId(payload.googleClientId ?? "");
      })
      .finally(() => {
        if (active) setConfigLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!configLoaded || !googleClientId) return;

    const initializeGoogle = () => {
      if (!window.google || !buttonRef.current) return;
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        hosted_domain: "forus.cl",
        ux_mode: "popup",
        callback: async (response) => {
          if (!response.credential) {
            setError("Google no devolvio una credencial valida.");
            return;
          }
          setLoading(true);
          setError("");
          try {
            const authResponse = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
            });
            const payload = await authResponse.json() as { user?: AuthUser; error?: string };
            if (!authResponse.ok || !payload.user) throw new Error(payload.error || "No se pudo iniciar sesion.");
            await onLogin(payload.user);
          } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo iniciar sesion.");
          } finally {
            setLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 360,
        text: "signin_with",
      });
    };

    if (window.google) {
      initializeGoogle();
      return;
    }

    const existing = document.getElementById("google-identity");
    if (existing) {
      existing.addEventListener("load", initializeGoogle, { once: true });
      return () => existing.removeEventListener("load", initializeGoogle);
    }

    const script = document.createElement("script");
    script.id = "google-identity";
    script.src = "https://accounts.google.com/gsi/client";
    script.nonce = document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content ?? "";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => setError("No se pudo cargar Google Identity Services.");
    document.head.appendChild(script);
  }, [configLoaded, googleClientId, onLogin]);

  return (
    <main className="login-shell">
      <section className="login-panel login-access-panel">
        <div className="brand login-brand"><img src="/forus.png" alt="Forus" /><b>PLANIFICACIÓN <span>FINANCIERA</span><small>Intelligence portal</small></b></div>
        <div className="login-copy">
          <label>PORTAL FINANCIERO · ACCESO CORPORATIVO</label>
          <h1>Del desempeño interno al pulso de la industria.</h1>
          <p>Rentabilidad, forecast y señales de la macroindustria para apoyar decisiones con una mirada integral.</p>
        </div>
        <div className="login-access">
          {googleClientId && <div ref={buttonRef} className={loading ? "login-button loading" : "login-button"} />}
          {loading && <span className="login-status">Validando usuario...</span>}
          {configLoaded && !googleClientId && <span className="login-status">El acceso corporativo no está disponible. Contacta al administrador.</span>}
          {error && <div className="data-warning login-error"><AlertTriangle /><span>{error}</span></div>}
        </div>
        <div className="login-security"><i>01</i><span><b>ACCESO PROTEGIDO</b>Disponible para colaboradores @forus.cl habilitados.</span></div>
        <small className="login-legal">Planificación Financiera · Forus Chile</small>
      </section>
      <aside className="login-visual" aria-label="Inteligencia financiera y de mercado">
        <DollarLoginPanel />
      </aside>
    </main>
  );
}

function UserMenu({ user, onLogout }: { user: AuthUser; onLogout: () => Promise<void> }) {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setError("");
    try {
      await onLogout();
    } catch {
      setError("No fue posible cerrar sesión. Intenta nuevamente.");
      setSigningOut(false);
    }
  };

  return <details data-dropdown name="portal-dropdown" className="portal-user">
    <summary aria-label={`Menú de usuario: ${user.name}`}>
      <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
      <span className="portal-user-name"><b>{user.name}</b><small>{user.role}</small></span>
      <ChevronDown className="portal-user-chevron" aria-hidden="true" />
    </summary>
    <div className="portal-user-dropdown">
      <button type="button" onClick={() => void signOut()} disabled={signingOut}>
        <LogOut aria-hidden="true" />{signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  </details>;
}

function Portal({ authUser, onLogout, reportsError, onRetryReports }: {
  authUser: AuthUser; onLogout: () => Promise<void>; reportsError: string; onRetryReports: () => void;
}) {
  const privateData = useContext(PrivateDataContext);
  const baseSnapshotAt = privateData?.baseSnapshotAt ?? "";
  const snapshotLabel = baseSnapshotAt
    ? new Intl.DateTimeFormat("es-CL", {
        timeZone: "America/Santiago",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(baseSnapshotAt))
    : "—";
  const [view, setView] = useState<"annual" | "detail" | "m2" | "monitor" | "break-even" | "sensitivity">("annual");
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [quadrantYear, setQuadrantYear] = useState<Year>(2027);
  const [fwBand, setFwBand] = useState<FwBand>(null);
  const [analysisMetric, setAnalysisMetric] = useState<ProfitMetric>("fourWalls");
  const [refreshing, setRefreshing] = useState(false);
  const [salesMarginRefreshKey, setSalesMarginRefreshKey] = useState(0);
  const [profitabilityRefreshKey, setProfitabilityRefreshKey] = useState(0);
  const visiblePortalGroups = portalGroups.filter(group => canAccessMenu(authUser.role, group.id));
  const canViewHome = canAccessMenu(authUser.role, "home");
  const canViewSalesMargin = canAccessMenu(authUser.role, "sales-margin");
  const salesMarginScope = `${authUser.personId}:${authUser.email}:${authUser.role}`;
  useEffect(() => {
    if (canViewSalesMargin) void loadSalesMargin(salesMarginScope).catch(() => { /* Retry when the report is opened. */ });
  }, [canViewSalesMargin, salesMarginScope]);
  const canUseToolbox = canAccessMenu(authUser.role, "toolbox");
  const defaultSection = canViewHome ? "home" : visiblePortalGroups[0]?.items[0]?.id ?? "";
  const [requestedPortalSection, setPortalSection] = useState("home");
  const requestedMenu = menuForSection(requestedPortalSection);
  const portalSection = requestedMenu && canAccessMenu(authUser.role, requestedMenu) ? requestedPortalSection : defaultSection;
  const blActive = portalSection === "bl";
  const profitabilityForecastActive = ["ecommerce", "marketplace", "wholesale", "consolidada"].includes(portalSection);
  const needsPrivateData = blActive;
  const stores = useMemo(() => blActive && privateData ? buildStores(privateData.baseConsolidada) : [], [blActive, privateData]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openTopnavGroup, setOpenTopnavGroup] = useState<PortalMenu | null>(null);
  const workspaceRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      workspaceRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [portalSection]);


  const refreshView = () => {
    setRefreshing(true);
    if (portalSection === "sales-margin") {
      setSalesMarginRefreshKey((current) => current + 1);
      return;
    }
    if (profitabilityForecastActive) {
      setProfitabilityRefreshKey((current) => current + 1);
      return;
    }
    window.setTimeout(() => window.location.reload(), 120);
  };
  const completeSalesMarginRefresh = useCallback(() => setRefreshing(false), []);
  const completeProfitabilityRefresh = useCallback(() => setRefreshing(false), []);
  const universe = useMemo(() => stores.filter((s) => {
    const matchesChain = selectedChains.length === 0 || selectedChains.includes(s.chain);
    const needles = query
      .split(/[,;\n\r]+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const matchesQuery = needles.length === 0 || needles.some((needle) =>
      s.name.toLowerCase().includes(needle) || s.code.toLowerCase().includes(needle)
    );
    return matchesChain && matchesQuery;
  }), [stores, selectedChains, query]);
  const selection = useMemo(
    () => fwBand ? universe.filter((s) => fwBandOf(s, quadrantYear, analysisMetric) === fwBand) : universe,
    [universe, fwBand, quadrantYear, analysisMetric],
  );
  const toggleChain = (chain: string) => setSelectedChains((current) =>
    current.includes(chain) ? current.filter((item) => item !== chain) : [...current, chain]
  );

  const canManageUsers = canAccessMenu(authUser.role, "users");
  const activeView = view;
  const selectedPortalItem = portalSection === "home"
    ? { id: "home", label: "Portada", enabled: true }
    : portalSection === "sales-margin"
      ? { id: "sales-margin", label: "Venta & Margen", enabled: true }
    : portalSection === "users"
      ? { id: "users", label: "Usuarios", enabled: true }
    : portalSection === "toolbox"
      ? { id: "toolbox", label: "Toolbox AP", enabled: true }
    : portalGroups.flatMap((group) => group.items).find((item) => item.id === portalSection) ?? portalGroups[0].items[0];
  const selectedPortalGroup = portalGroups.find((group) => group.items.some((item) => item.id === portalSection)) ?? portalGroups[0];
  const openPortalSection = (groupId: string, itemId: string) => {
    const group = visiblePortalGroups.find(group => group.id === groupId);
    if (group?.items.some(item => item.id === itemId)) {
      setPortalSection(itemId);
      setOpenTopnavGroup(null);
    }
  };

  return (
    <div className="portal-shell microsoft-shell">
      <header className="portal-topbar">
        <button className="portal-brand" type="button" onClick={() => { setPortalSection(defaultSection); setOpenTopnavGroup(null); setMobileNavOpen(false); }} aria-label={canViewHome ? "Ir a la portada" : "Ir a Comex"}>
          <img src="/forus.png" alt="Forus" />
          <span><b>Portal Financiero</b><small>Planificación · Forus</small></span>
        </button>
        <button className="portal-mobile-toggle" type="button" onClick={() => { setMobileNavOpen((current) => !current); setOpenTopnavGroup(null); }} aria-expanded={mobileNavOpen} aria-label="Abrir menú"><Menu /></button>
        <nav className={`portal-topnav ${mobileNavOpen ? "open" : ""}`} aria-label="Informes financieros">
          {canViewHome && <button type="button" className={portalSection === "home" ? "active" : ""} onMouseEnter={() => setOpenTopnavGroup(null)} onClick={() => { setPortalSection("home"); setOpenTopnavGroup(null); setMobileNavOpen(false); }}>Inicio</button>}
          {canViewSalesMargin && <button type="button" className={portalSection === "sales-margin" ? "active" : ""} onMouseEnter={() => setOpenTopnavGroup(null)} onClick={() => { setPortalSection("sales-margin"); setOpenTopnavGroup(null); setMobileNavOpen(false); }}>Venta & Margen</button>}
          {canUseToolbox && <button type="button" className={portalSection === "toolbox" ? "active" : ""} onMouseEnter={() => setOpenTopnavGroup(null)} onClick={() => { setPortalSection("toolbox"); setOpenTopnavGroup(null); setMobileNavOpen(false); }}>Toolbox AP</button>}
          {visiblePortalGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupOpen = openTopnavGroup === group.id;
            return <div
              className={`portal-topnav-group ${groupOpen ? "open" : ""}`}
              key={group.id}
              onMouseEnter={() => setOpenTopnavGroup(group.id)}
              onMouseLeave={() => setOpenTopnavGroup((current) => current === group.id ? null : current)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setOpenTopnavGroup((current) => current === group.id ? null : current);
                }
              }}
            >
              <button type="button" className={group.items.some((item) => item.id === portalSection) ? "active" : ""} aria-haspopup="true" aria-expanded={groupOpen} onClick={() => setOpenTopnavGroup(group.id)}>
                <GroupIcon /><span>{group.label}</span><ChevronDown />
              </button>
              <div className="portal-mega-menu">
                <div className="portal-mega-intro"><GroupIcon /><small>ÁREA</small><strong>{group.label}</strong><p>{group.description}</p></div>
                <div className="portal-mega-links">
                  {group.items.map((item) => <button type="button" key={item.id} className={item.enabled ? "available" : ""} onClick={() => { openPortalSection(group.id, item.id); setMobileNavOpen(false); }}>
                    <span><b>{item.label}</b><small>{item.enabled ? "Disponible" : "Próximamente"}</small></span><ChevronRight />
                  </button>)}
                </div>
              </div>
            </div>;
          })}
          {canManageUsers && <button type="button" className={portalSection === "users" ? "active" : ""} aria-current={portalSection === "users" ? "page" : undefined} onMouseEnter={() => setOpenTopnavGroup(null)} onClick={() => { setPortalSection("users"); setOpenTopnavGroup(null); setMobileNavOpen(false); }}><Users /> Usuarios</button>}
        </nav>
        <UserMenu user={authUser} onLogout={onLogout} />
      </header>
      <main ref={workspaceRef} className="portal-workspace">
      <header className={`portal-reportbar ${portalSection === "home" ? "home" : ""}`}>
        <div className="portal-context"><small>{portalSection === "home" ? "Portal Financiero" : portalSection === "users" ? "Administración" : portalSection === "toolbox" || portalSection === "sales-margin" ? "Planificación Financiera" : selectedPortalGroup.label}</small><b>{selectedPortalItem.label}</b></div>
        {blActive && <nav>
          <button className={activeView === "annual" ? "active" : ""} onClick={() => setView("annual")}>Comparativa anual</button>
          <button className={activeView === "detail" ? "active" : ""} onClick={() => setView("detail")}>Detalle tiendas</button>
          <button className={activeView === "break-even" ? "active" : ""} onClick={() => setView("break-even")}>Break-Even</button>
          <button className={activeView === "m2" ? "active" : ""} onClick={() => setView("m2")}>m2</button>
          <button className={activeView === "sensitivity" ? "active" : ""} onClick={() => setView("sensitivity")}>Sensibilidad tiendas</button>
          <button className={activeView === "monitor" ? "active" : ""} onClick={() => setView("monitor")}>Monitor tiendas</button>
        </nav>}
        {(blActive || portalSection === "sales-margin" || profitabilityForecastActive) && <button className="refresh-button" onClick={refreshView} disabled={refreshing} title="Recargar la última versión disponible"><RefreshCw className={refreshing ? "spin" : ""} /> {refreshing ? "ACTUALIZANDO…" : "ACTUALIZAR"}</button>}
      </header>
      {portalSection === "home" ? <section className="portal-home-page">
        <div className="portal-home-heading">
          <div className="portal-home-copy"><label>INTELIGENCIA FINANCIERA · 2027</label><h1>Decisiones más claras.<br /><em>Resultados más fuertes.</em></h1><p>Un punto de encuentro para explorar la rentabilidad, anticipar escenarios y convertir datos del negocio en acciones.</p><button type="button" onClick={() => { openPortalSection("forecast", "bl"); setView("break-even"); }}>Explora el Break-Even de las tiendas <ChevronRight /></button></div>
          <EconomicIndicators />
        </div>
        <div className="portal-section-heading"><div><label>EXPLORA EL PORTAL</label><h2>Todo lo que necesitas, en un solo lugar</h2></div><p>Accede a los informes disponibles y conoce los próximos desarrollos.</p></div>
        <div className="portal-legend-grid">
            {canViewSalesMargin && <article className="portal-legend-card sales-margin-home-card">
              <div className="portal-legend-head"><span><CircleDollarSign /></span><div><small>PLANIFICACIÓN FINANCIERA</small><h2>Venta &amp; Margen</h2><p>Ventas, margen y variaciones por período, canal, marca y clase.</p></div></div>
              <div className="portal-legend-links"><button type="button" className="available" onClick={() => setPortalSection("sales-margin")}><span><b>Abrir Venta &amp; Margen</b><small>Disponible</small></span><ChevronRight /></button></div>
            </article>}
            {canUseToolbox && <article className="portal-legend-card toolbox-home-card">
              <div className="portal-legend-head"><span><PackageCheck /></span><div><small>HERRAMIENTA DE PLANIFICACIÓN</small><h2>Toolbox AP</h2><p>Planificación financiera, carga de bases y herramientas operativas del área.</p></div></div>
              <div className="portal-legend-links"><button type="button" className="available" onClick={() => setPortalSection("toolbox")}><span><b>Abrir Toolbox AP</b><small>Disponible</small></span><ChevronRight /></button></div>
            </article>}
            {visiblePortalGroups.map((group) => {
              const GroupIcon = group.icon;
              return <article className="portal-legend-card" key={group.id}>
                <div className="portal-legend-head"><span><GroupIcon /></span><div><small>ÁREA DE ANÁLISIS</small><h2>{group.label}</h2><p>{group.description}</p></div></div>
                <div className="portal-legend-links">{group.items.map((item) => <button type="button" key={item.id} className={item.enabled ? "available" : ""} onClick={() => openPortalSection(group.id, item.id)}><span><b>{item.label}</b><small>{item.enabled ? "Disponible" : "En construcción"}</small></span><ChevronRight /></button>)}</div>
              </article>;
            })}
        </div>
      </section> : portalSection === "sales-margin" ? <SalesMargin key={salesMarginScope} sessionScope={salesMarginScope} refreshKey={salesMarginRefreshKey} onRefreshComplete={completeSalesMarginRefresh} /> : needsPrivateData && !privateData ? <section className="portal-data-status" aria-live="polite">
        {reportsError ? <><AlertTriangle /><h2>No pudimos cargar este informe</h2><p>{reportsError}</p><button type="button" onClick={onRetryReports}>Reintentar</button></> : <><RefreshCw className="spin" /><h2>Preparando tu informe</h2><p>Puedes seguir navegando mientras termina la carga.</p></>}
      </section> : portalSection === "users" && canManageUsers ? <div className="content"><UsuariosAdmin /></div> : portalSection === "toolbox" ? <ToolboxPlanning /> : blActive ? <><section className="hero">
        <div><label>PLANIFICACIÓN FINANCIERA · PRESUPUESTO 2027P</label><h1>Rentabilidad de tiendas.</h1><p>EERR Retail y riesgo Four Walls por tienda.</p></div>
        <span className="unit-badge"><b>INFORME EN MM$</b><small>CONSULTADO  {snapshotLabel}</small></span>
      </section>
      <section className="filters">
        <b><Filter /> Segmentar vista</b>
        <details data-dropdown name="portal-dropdown" className="chain-multiselect">
          <summary><span>CADENA<strong>{selectedChains.length === 0 ? "TODAS" : selectedChains.length === 1 ? selectedChains[0] : `${selectedChains.length} CADENAS`}</strong></span><ChevronDown /></summary>
          <div className="chain-options">
            <button type="button" className={selectedChains.length === 0 ? "active" : ""} onClick={() => setSelectedChains([])}>TODAS</button>
            {chains.map((chain) => <label key={chain}><input type="checkbox" checked={selectedChains.includes(chain)} onChange={() => toggleChain(chain)} />{chain}</label>)}
          </div>
        </details>
        <div><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="BUSCAR UNO O VARIOS CC / TIENDAS, SEPARADOS POR COMA..." /></div>
        {fwBand && <i className={`filter-chip band-${fwBand}`}>{analysisMetric === "utility" ? "Utilidad" : "Four Walls"} {yearLabel(quadrantYear)} · {fwBand === "negative" ? "Pérdida" : fwBand === "low" ? "Baja" : "Saludable"}</i>}
        <button onClick={() => { setSelectedChains([]); setQuery(""); setFwBand(null); }}>Limpiar filtros</button>
      </section>
      <div className="content">
        {activeView === "annual" ? <Executive selection={selection} universe={universe} quadrantYear={quadrantYear} setQuadrantYear={setQuadrantYear} fwBand={fwBand} setFwBand={setFwBand} analysisMetric={analysisMetric} setAnalysisMetric={setAnalysisMetric} /> : activeView === "detail" ? <Detail selection={selection} /> : activeView === "break-even" ? <BreakEven selection={selection} /> : activeView === "m2" ? <M2Analysis selection={selection} /> : activeView === "sensitivity" ? <StoreSensitivity /> : <StoreMonitor selection={selection} />}
      </div>
      <footer>Planificación Financiera · Forus <span>INFORME EN MM$</span></footer>
      </> : portalSection === "ecommerce" ? <ChannelProfitability channel="Ecommerce" refreshKey={profitabilityRefreshKey} onRefreshComplete={completeProfitabilityRefresh} /> : portalSection === "marketplace" ? <ChannelProfitability channel="Marketplace" refreshKey={profitabilityRefreshKey} onRefreshComplete={completeProfitabilityRefresh} /> : portalSection === "wholesale" ? <ChannelProfitability channel="Wholesale" refreshKey={profitabilityRefreshKey} onRefreshComplete={completeProfitabilityRefresh} /> : portalSection === "consolidada" ? <ChannelProfitability channel="Consolidado" refreshKey={profitabilityRefreshKey} onRefreshComplete={completeProfitabilityRefresh} /> : portalSection === "paises" ? <CountryProfitability /> : portalSection === "benchmark-nacional" ? <NationalBenchmark /> : portalSection === "benchmark-internacional" ? <InternationalBenchmark /> : portalSection === "macroeconomia-ipom" ? <MacroeconomicsMarket /> : portalSection === "mercado-retail-cnc" ? <RetailCncMarket /> : portalSection === "importaciones-retail" ? <ImportacionesIndustria key="retail" /> : portalSection === "importaciones-cosmeticos" ? <ImportacionesIndustria key="cosmetics" variant="cosmetics" /> : <section className="construction-page">
        <div className="construction-card">
          <i><Building2 /></i>
          <label>{selectedPortalGroup.label}</label>
          <h1>{selectedPortalItem.label}</h1>
          <strong>EN CONSTRUCCIÓN</strong>
          <p>Este informe formará parte del Portal Financiero. Su estructura y fuentes de datos todavía están en preparación.</p>
          {canViewHome && <button type="button" onClick={() => setPortalSection("home")}>VOLVER A LA PORTADA</button>}
        </div>
      </section>}
      </main>
    </div>
  );
}

// Para refrescar el dashboard, reemplazar este snapshot mediante el mismo mapper
// conectado a Google Sheets API y mantener los índices definidos en BaseRow.

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<PrivateData | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [reportsError, setReportsError] = useState("");
  const dataRequestRef = useRef<AbortController | null>(null);
  const loadPortalData = useCallback(async () => {
    dataRequestRef.current?.abort();
    const controller = new AbortController();
    dataRequestRef.current = controller;
    setReportsError("");
    try {
      const response = await fetch("/api/portal-data", { cache: "no-store", signal: controller.signal });
      if (response.status === 401) {
        if (!controller.signal.aborted) {
          clearSalesMarginData();
          setData(null);
          setUser(null);
          setError("Tu sesión ya no está disponible. Ingresa nuevamente.");
        }
        return;
      }
      if (!response.ok) throw new Error("No fue posible cargar los informes. Intenta nuevamente.");
      const payload = await response.json() as PrivateData;
      if (!controller.signal.aborted) setData(payload);
    } catch (error) {
      if (!controller.signal.aborted) setReportsError(error instanceof Error ? error.message : "No fue posible cargar los informes.");
    }
  }, []);
  const acceptUser = useCallback((authenticatedUser: AuthUser) => {
    dataRequestRef.current?.abort();
    clearSalesMarginData();
    setError("");
    setReportsError("");
    setData(null);
    setUser(authenticatedUser);
    if (canAccessMenu(authenticatedUser.role, "forecast")) void loadPortalData();
  }, [loadPortalData]);
  const loadSession = useCallback(async (signal: AbortSignal) => {
    const response = await fetch("/api/auth/session", { cache: "no-store", signal });
    if (!response.ok) throw new Error("No fue posible validar el acceso.");
    const payload = await response.json() as { user: AuthUser | null };
    if (signal.aborted) return;
    if (!payload.user) { clearSalesMarginData(); setUser(null); setData(null); return; }
    acceptUser(payload.user);
  }, [acceptUser]);
  const logout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    if (!response.ok) throw new Error("No fue posible cerrar sesión.");
    dataRequestRef.current?.abort();
    clearSalesMarginData();
    setError("");
    setReportsError("");
    setData(null);
    setUser(null);
  };
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadSession(controller.signal)).catch(() => { if (!controller.signal.aborted) setError("No fue posible validar el acceso. Intenta nuevamente."); }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => { controller.abort(); dataRequestRef.current?.abort(); };
  }, [loadSession]);
  if (checking) return <main className="login-shell"><span className="login-status">Validando acceso...</span></main>;
  if (!user) return <>{error && <p role="alert">{error}</p>}<LoginForm onLogin={acceptUser} /></>;
  return <PrivateDataContext.Provider value={data}><Portal authUser={user} onLogout={logout} reportsError={reportsError} onRetryReports={() => void loadPortalData()} /></PrivateDataContext.Provider>;
}
