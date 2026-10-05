"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
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
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  ChevronDown,
  Filter,
  Globe2,
  Menu,
  PackageCheck,
  PanelLeftClose,
  RefreshCw,
  Save,
  Search,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import NationalBenchmark from "./market/NationalBenchmark";
import ImportacionesIndustria from "./market/ImportacionesIndustria";
import { baseConsolidada, baseSnapshotAt, type BaseRow } from "./base-consolidada";
import { storeClassification, type StoreClassification } from "./store-classification";

type Year = 2024 | 2025 | 2026 | 2027;
type FwBand = "negative" | "low" | "high" | null;
type ProfitMetric = "fourWalls" | "utility";
type Quarter = "ANUAL" | "Q1" | "Q2" | "Q3" | "Q4";
type ReportPeriod = Quarter | "MES";
type ClassificationFilter = "TOTAL" | StoreClassification;
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
const snapshotLabel = `${baseSnapshotAt.slice(8, 10)}-${baseSnapshotAt.slice(5, 7)}-${baseSnapshotAt.slice(0, 4)} · ${baseSnapshotAt.slice(11, 16)}`;
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
const userRoleOptions = ["ADMINISTRADOR", "ANALISTA FINANCIERO"];
const portalGroups: { id: string; label: string; description: string; icon: typeof BarChart3; items: PortalSection[] }[] = [
  {
    id: "forecast",
    label: "Rentabilidad Forecast",
    description: "Rentabilidad, resultados y desempeño por canal, país y consolidado.",
    icon: BarChart3,
    items: [
      { id: "bl", label: "B&L", enabled: true },
      { id: "ecommerce", label: "Ecommerce" },
      { id: "marketplace", label: "Marketplace" },
      { id: "wholesale", label: "Wholesale" },
      { id: "consolidada", label: "Consolidada" },
      { id: "paises", label: "Países" },
    ],
  },
  {
    id: "mercado",
    label: "Mercado",
    description: "Benchmarks, contexto macroeconómico, retail e importaciones.",
    icon: Globe2,
    items: [
      { id: "benchmark-nacional", label: "Benchmark Nacional", enabled: true },
      { id: "benchmark-internacional", label: "Benchmark Internacional" },
      { id: "macroeconomia-ipom", label: "Macroeconomía e IPoM" },
      { id: "mercado-retail-cnc", label: "Mercado Retail · CNC" },
      { id: "importaciones-retail", label: "Importaciones Industria Retail", enabled: true },
      { id: "importaciones-cosmeticos", label: "Importaciones Cosméticos" },
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
    items: [{ id: "kpi-consolidado", label: "KPI Consolidado" }],
  },
];
const isAdminRole = (role: string) => role.trim().toUpperCase() === "ADMINISTRADOR";
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

const stores: StoreRow[] = (() => {
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
})();

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
  useEffect(() => {
    const closeMonthFilter = (event: PointerEvent) => {
      if (monthFilterRef.current && !monthFilterRef.current.contains(event.target as Node)) {
        monthFilterRef.current.removeAttribute("open");
      }
    };
    document.addEventListener("pointerdown", closeMonthFilter);
    return () => document.removeEventListener("pointerdown", closeMonthFilter);
  }, []);
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
              <details className={`month-period-filter ${period === "MES" ? "active" : ""}`} ref={monthFilterRef}>
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

function BreakEven({ selection }: { selection: StoreRow[] }) {
  const overallSales = selection.reduce((a, s) => a + Math.max(0, s.annual[2027].sales), 0);
  const overallMargin = selection.reduce((a, s) => a + Math.max(0, s.annual[2027].margin), 0);
  const overallRate = overallSales ? overallMargin / overallSales : 0;
  const chainRate = (chain: string) => {
    const peers = selection.filter((s) => s.chain === chain && s.annual[2027].sales > 0 && s.annual[2027].margin > 0);
    const sales = peers.reduce((a, s) => a + s.annual[2027].sales, 0);
    return sales ? peers.reduce((a, s) => a + s.annual[2027].margin, 0) / sales : overallRate;
  };
  const rows = selection
    .filter((s) => s.annual[2027].utility < 0)
    .map((s) => {
      const current = s.annual[2027];
      const ownRate = current.sales > 0 && current.margin > 0 ? current.margin / current.sales : 0;
      const rate = ownRate || chainRate(s.chain);
      const targetMargin = current.margin - current.utility;
      const targetSales = rate > 0 ? Math.max(current.sales, targetMargin / rate) : 0;
      return {
        ...s,
        current,
        rate,
        rateSource: ownRate ? "Margen tienda 2027P" : "Margen promedio cadena",
        targetMargin,
        targetSales,
        salesGap: targetSales - current.sales,
        growth: variation(targetSales, current.sales),
      };
    })
    .sort((a, b) => b.salesGap - a.salesGap);
  const totalLoss = rows.reduce((a, s) => a + s.current.utility, 0);
  const totalCurrentSales = rows.reduce((a, s) => a + s.current.sales, 0);
  const totalTargetSales = rows.reduce((a, s) => a + s.targetSales, 0);
  const totalTargetMargin = rows.reduce((a, s) => a + s.targetMargin, 0);
  const exportBreakEven = () => downloadExcel(
    "break-even-2027S",
    ["CC", "TIENDA", "CADENA", ...years.flatMap((y) => [`VENTA ${yearLabel(y)}`, `MARGEN % ${yearLabel(y)}`, `UTILIDAD ${yearLabel(y)}`]), "VENTA 2027S", "MARGEN 2027S", "MARGEN % 2027S", "BRECHA VENTA", "UTILIDAD 2027S"],
    rows.map((s) => [
      s.code, s.name, s.chain,
      ...years.flatMap((y) => [Math.round(s.annual[y].sales / 1000), pct(s.annual[y].margin, s.annual[y].sales).toFixed(2), Math.round(s.annual[y].utility / 1000)]),
      Math.round(s.targetSales / 1000), Math.round(s.targetMargin / 1000), (s.rate * 100).toFixed(2), Math.round(s.salesGap / 1000), 0,
    ]),
  );
  return (
    <>
      <div className="title"><div><i>05</i><span><h2>Break-Even</h2><p>Simulación de punto cero para tiendas con utilidad negativa en 2027P</p></span></div><div className="title-actions"><strong className="neg">{rows.length} tiendas bajo punto de equilibrio</strong><button className="export-button" onClick={exportBreakEven}>EXPORTAR A EXCEL</button></div></div>
      <section className="be-kpis">
        <article><label>PÉRDIDA 2027P</label><strong className="neg">{money(totalLoss)}</strong><span>universo simulado</span></article>
        <article><label>VENTA ACTUAL 2027P</label><strong>{money(totalCurrentSales)}</strong><span>tiendas con pérdida</span></article>
        <article><label>VENTA REQUERIDA 2027S</label><strong>{money(totalTargetSales)}</strong><span>punto de equilibrio</span></article>
        <article><label>BRECHA DE VENTA</label><strong className="pos">{money(totalTargetSales - totalCurrentSales)}</strong><span>incremento requerido</span></article>
      </section>
      <div className="be-method">
        <b>Metodología 2027S:</b> costos y tasa de margen 2027P constantes. Margen requerido = margen 2027P − utilidad 2027P; venta requerida = margen requerido / tasa de margen. Si la tienda no tiene una tasa válida, se usa el promedio ponderado de su cadena.
      </div>
      <section className="panel be-panel">
        <div className="monitor-head"><div><label>SIMULACIÓN BREAK-EVEN</label><h3>Historia y escenario 2027S</h3></div><span>Ordenado por mayor brecha de venta</span></div>
        <div className="scroll be-scroll">
          <table className="compact-table break-even-table">
            <thead>
              <tr>
                <th rowSpan={2}>TIENDA</th><th rowSpan={2}>CADENA</th>
                {years.map((y) => <th key={y} colSpan={3}>{yearLabel(y)}</th>)}
                <th colSpan={5} className="sim-head">2027S · PUNTO CERO</th>
              </tr>
              <tr>
                {years.flatMap((y) => [<th key={`${y}-v`}>VENTA</th>,<th key={`${y}-m`}>MARGEN %</th>,<th key={`${y}-u`}>UTILIDAD</th>])}
                <th>VENTA</th><th>MARGEN</th><th>MARGEN %</th><th>BRECHA VENTA</th><th>UTILIDAD</th>
              </tr>
            </thead>
            <tbody>{rows.map((s) => <tr key={s.code}>
              <td><b>{s.name}</b><small>#{s.code} · {s.rateSource}</small></td><td>{s.chain}</td>
              {years.flatMap((y) => {
                const m = s.annual[y];
                return [
                  <td key={`${y}-v`}>{money(m.sales)}</td>,
                  <td key={`${y}-m`}>{pct(m.margin,m.sales).toFixed(2)}%</td>,
                  <td key={`${y}-u`} className={m.utility < 0 ? "neg" : "pos"}>{money(m.utility)}</td>,
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
  const [classificationFilter, setClassificationFilter] = useState<ClassificationFilter>("TOTAL");
  const duplicateNames = new Set(
    selection
      .filter((s, _, all) => all.filter((x) => x.name.trim().toUpperCase() === s.name.trim().toUpperCase()).length > 1)
      .map((s) => s.name.trim().toUpperCase()),
  );
  const rows = selection.map((s) => {
    const active = years.filter((y) => Math.abs(s.annual[y].sales) > 0);
    const issues = [
      s.chain === "OTROS" ? "Revisar cadena" : "",
      mallOf(s.name) === "Pendiente" ? "Completar mall" : "",
      duplicateNames.has(s.name.trim().toUpperCase()) ? "Nombre duplicado" : "",
      !active.length ? "Sin ventas" : "",
    ].filter(Boolean);
    return { ...s, mall: mallOf(s.name), active, issues };
  });
  const hasNsInYear = (store: StoreRow, year: 2026 | 2027) =>
    monthOrder.some((month) => openingType(store, year, month) === "NS");
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
  const visibleRows = classificationFilter === "TOTAL"
    ? rows
    : rows.filter((store) => classificationFilter === "NS" ? hasAnyNsMonth(store) : !hasAnyNsMonth(store));
  return (
    <>
      <div className="title"><div><i>04</i><span><h2>Monitor maestro de tiendas</h2><p>Control preliminar para cuadratura de tiendas, cadenas y mall / ubicación</p></span></div><strong>{pending.length} registros por revisar</strong></div>
      <section className="monitor-kpis">
        <article><label>TIENDAS / CC</label><strong>{rows.length}</strong><span>registros únicos</span></article>
        <article><label>CADENA OTROS</label><strong>{rows.filter((r) => r.chain === "OTROS").length}</strong><span>requieren clasificación</span></article>
        <article><label>NOMBRES DUPLICADOS</label><strong>{duplicateNames.size}</strong><span>posibles homologaciones</span></article>
        <article><label>ACTIVAS 2027P</label><strong>{rows.filter((r) => r.annual[2027].sales !== 0).length}</strong><span>con venta anual</span></article>
        <article className="classification-kpi sss"><label>SSS 2026E</label><strong>{classificationCounts[2026].sss}</strong><span>SSS los 12 meses</span></article>
        <article className="classification-kpi ns"><label>NS 2026E</label><strong>{classificationCounts[2026].ns}</strong><span>al menos un mes NS</span></article>
        <article className="classification-kpi sss"><label>SSS 2027P</label><strong>{classificationCounts[2027].sss}</strong><span>SSS los 12 meses</span></article>
        <article className="classification-kpi ns"><label>NS 2027P</label><strong>{classificationCounts[2027].ns}</strong><span>al menos un mes NS</span></article>
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
              <tr><th rowSpan={2}>CC REPORTE</th><th rowSpan={2}>TIENDA HOMOLOGADA</th><th rowSpan={2}>CADENA</th><th rowSpan={2}>MALL / UBICACIÓN</th><th colSpan={12}>CLASIFICACIÓN 2026E</th><th colSpan={12}>CLASIFICACIÓN 2027P</th><th rowSpan={2}>ESTADO CONTROL</th></tr>
              <tr>{([2026, 2027] as const).flatMap((year) => monthOrder.map((month) => <th key={`${year}-${month}`}>{monthShort[month]}</th>))}</tr>
            </thead>
            <tbody>{visibleRows.map((s) => <tr key={s.code}>
              <td><b>{s.code}</b></td><td><b>{s.name}</b></td><td className={s.chain === "OTROS" ? "neg bold" : ""}>{s.chain}</td><td>{s.mall}</td>
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
                              <option value="">SIN ROL</option>
                              {userRoleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
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

function LoginForm({ onLogin }: { onLogin: (user: AuthUser) => void | Promise<void> }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [configLoaded, setConfigLoaded] = useState(true);

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

  const loginWithActiveEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const authResponse = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await authResponse.json() as { user?: AuthUser; error?: string };
      if (!authResponse.ok || !payload.user) throw new Error(payload.error || "No se pudo iniciar sesion.");
      await onLogin(payload.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion.");
    } finally {
      setLoading(false);
    }
  };

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
          {googleClientId && <div className="login-divider"><span>o ingresa con tu correo corporativo</span></div>}
          <form className="email-login" onSubmit={loginWithActiveEmail}>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@forus.cl" type="email" />
            <button type="submit" disabled={loading}>INGRESAR</button>
          </form>
          {loading && <span className="login-status">Validando usuario...</span>}
          {configLoaded && !googleClientId && <span className="login-status">Acceso local · valida que el correo esté activo en BigQuery.</span>}
          {error && <div className="data-warning login-error"><AlertTriangle /><span>{error}</span></div>}
        </div>
        <div className="login-security"><i>01</i><span><b>ACCESO PROTEGIDO</b>Disponible para colaboradores @forus.cl habilitados.</span></div>
        <small className="login-legal">Planificación Financiera · Forus Chile</small>
      </section>
      <aside className="login-visual" aria-label="Inteligencia financiera y de mercado">
        <div className="finance-board" aria-hidden="true">
          <header><div><i><BarChart3 /></i><span><b>FINANCIAL OUTLOOK</b><small>Planificación Financiera · Forus</small></span></div><em>FORECAST 2027</em></header>
          <div className="finance-signals">
            <article><span>RENTABILIDAD</span><i><b /><b /><b /><b /></i><small>TENDENCIA</small></article>
            <article><span>MARGEN</span><i><b /><b /><b /><b /><b /></i><small>EFICIENCIA</small></article>
            <article><span>EBITDA</span><i><b /><b /><b /></i><small>CONVERSIÓN</small></article>
          </div>
          <div className="finance-chart">
            <div className="finance-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
            <div className="finance-grid-lines"><i /><i /><i /><i /><i /></div>
            <div className="finance-columns"><i style={{ height: "28%" }} /><i style={{ height: "38%" }} /><i style={{ height: "34%" }} /><i style={{ height: "49%" }} /><i style={{ height: "57%" }} /><i style={{ height: "64%" }} /><i style={{ height: "76%" }} /><i style={{ height: "86%" }} /></div>
            <svg viewBox="0 0 620 220" preserveAspectRatio="none">
              <defs><linearGradient id="financeArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1d75bd" stopOpacity=".25" /><stop offset="100%" stopColor="#1d75bd" stopOpacity="0" /></linearGradient></defs>
              <path className="finance-area" d="M0 182 C55 170 83 151 132 158 S220 125 272 132 S356 88 405 97 S510 52 620 29 L620 220 L0 220 Z" />
              <path className="finance-line" d="M0 182 C55 170 83 151 132 158 S220 125 272 132 S356 88 405 97 S510 52 620 29" />
              <circle cx="132" cy="158" r="5" /><circle cx="272" cy="132" r="5" /><circle cx="405" cy="97" r="5" /><circle cx="620" cy="29" r="5" />
            </svg>
            <div className="finance-quarters"><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span></div>
          </div>
          <footer><span><i />ESCENARIO BASE</span><span>RETAIL</span><span>BENCHMARK</span><span>MACROECONOMÍA</span></footer>
        </div>
        <div className="login-intelligence-cards">
          <article><TrendingUp /><span>RENTABILIDAD</span><b>Forecast &amp; B&amp;L</b></article>
          <article><Globe2 /><span>MERCADO</span><b>Industria &amp; economía</b></article>
          <article><Building2 /><span>GESTIÓN</span><b>KPI consolidados</b></article>
        </div>
      </aside>
    </main>
  );
}

export default function Home() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [view, setView] = useState<"annual" | "detail" | "monitor" | "break-even" | "users">("annual");
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [quadrantYear, setQuadrantYear] = useState<Year>(2027);
  const [fwBand, setFwBand] = useState<FwBand>(null);
  const [analysisMetric, setAnalysisMetric] = useState<ProfitMetric>("fourWalls");
  const [refreshing, setRefreshing] = useState(false);
  const [portalSection, setPortalSection] = useState("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedPortalGroups, setExpandedPortalGroups] = useState<string[]>([]);
  const chainFilterRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const payload = await response.json() as { user?: AuthUser | null };
        if (active && payload.user) setAuthUser(payload.user);
      } catch {
        if (active) setAuthUser(null);
      } finally {
        if (active) setCheckingAuth(false);
      }
    };
    void checkSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const closeChainFilter = (event: PointerEvent) => {
      if (chainFilterRef.current && !chainFilterRef.current.contains(event.target as Node)) {
        chainFilterRef.current.removeAttribute("open");
      }
    };
    document.addEventListener("pointerdown", closeChainFilter);
    return () => document.removeEventListener("pointerdown", closeChainFilter);
  }, []);
  const refreshView = () => {
    setRefreshing(true);
    window.setTimeout(() => window.location.reload(), 120);
  };
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
  }), [selectedChains, query]);
  const selection = useMemo(
    () => fwBand ? universe.filter((s) => fwBandOf(s, quadrantYear, analysisMetric) === fwBand) : universe,
    [universe, fwBand, quadrantYear, analysisMetric],
  );
  const toggleChain = (chain: string) => setSelectedChains((current) =>
    current.includes(chain) ? current.filter((item) => item !== chain) : [...current, chain]
  );

  if (checkingAuth && authUser) {
    return (
      <main className="login-shell login-validating-shell">
        <section className="login-panel">
          <div className="brand login-brand"><img src="/forus.png" alt="Forus" /><b>PLANIFICACION <span>FINANCIERA</span><small>Acceso corporativo</small></b></div>
          <span className="login-status">Validando sesion...</span>
        </section>
      </main>
    );
  }

  const validateLoginSession = async () => {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const payload = await response.json() as { user?: AuthUser | null };
    if (!response.ok || !payload.user) {
      throw new Error("La sesion no pudo validarse. Intenta nuevamente.");
    }
    setAuthUser(payload.user);
  };

  if (!authUser) return <LoginForm onLogin={validateLoginSession} />;
  const canManageUsers = isAdminRole(authUser.role);
  const activeView = !canManageUsers && view === "users" ? "annual" : view;
  const selectedPortalItem = portalSection === "home"
    ? { id: "home", label: "Portada", enabled: true }
    : portalGroups.flatMap((group) => group.items).find((item) => item.id === portalSection) ?? portalGroups[0].items[0];
  const selectedPortalGroup = portalGroups.find((group) => group.items.some((item) => item.id === portalSection)) ?? portalGroups[0];
  const blActive = portalSection === "bl";
  const openPortalSection = (groupId: string, itemId: string) => {
    setPortalSection(itemId);
    setExpandedPortalGroups((current) => current.includes(groupId) ? current : [...current, groupId]);
  };
  const togglePortalGroup = (groupId: string) => setExpandedPortalGroups((current) =>
    current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]
  );

  return (
    <div className={`portal-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <img src="/forus.png" alt="Forus" />
          {!sidebarCollapsed && <span><b>Portal Financiero</b><small>Planificación · Forus</small></span>}
          <button type="button" onClick={() => setSidebarCollapsed((current) => !current)} aria-label={sidebarCollapsed ? "Abrir menú" : "Cerrar menú"}>{sidebarCollapsed ? <Menu /> : <PanelLeftClose />}</button>
        </div>
        <nav className="portal-nav" aria-label="Informes financieros">
          <button type="button" title="Portada" className={`portal-home-link ${portalSection === "home" ? "active" : ""}`} onClick={() => setPortalSection("home")}>
            <Building2 />{!sidebarCollapsed && <span>Portada</span>}
          </button>
          {portalGroups.map((group) => {
            const GroupIcon = group.icon;
            const expanded = expandedPortalGroups.includes(group.id);
            return <section className="portal-nav-group" key={group.id}>
              <button type="button" className={`portal-nav-title ${expanded ? "expanded" : ""}`} title={group.label} onClick={() => togglePortalGroup(group.id)} aria-expanded={expanded}>
                <GroupIcon />{!sidebarCollapsed && <><span>{group.label}</span><ChevronDown /></>}
              </button>
              {expanded && <div className="portal-nav-items">
                {group.items.map((item) => <button
                  type="button"
                  key={item.id}
                  title={item.label}
                  className={`${portalSection === item.id ? "active" : ""} ${item.enabled ? "available" : "construction"}`}
                  onClick={() => openPortalSection(group.id, item.id)}
                >
                  <i>{item.enabled ? "●" : "○"}</i>
                  {!sidebarCollapsed && <span>{item.label}{!item.enabled && <small>Próximamente</small>}</span>}
                </button>)}
              </div>}
            </section>;
          })}
        </nav>
        {!sidebarCollapsed && <div className="portal-sidebar-foot"><span className="avatar">PF</span><div><b>{authUser.name}</b><small>{authUser.role}</small></div></div>}
      </aside>
      <main className="portal-workspace">
      <header>
        <div className="portal-context"><small>{portalSection === "home" ? "Portal Financiero" : selectedPortalGroup.label}</small><b>{selectedPortalItem.label}</b></div>
        {blActive && <nav>
          <button className={activeView === "annual" ? "active" : ""} onClick={() => setView("annual")}>Comparativa anual</button>
          <button className={activeView === "detail" ? "active" : ""} onClick={() => setView("detail")}>Detalle tiendas</button>
          <button className={activeView === "break-even" ? "active" : ""} onClick={() => setView("break-even")}>Break-Even</button>
          <button className={activeView === "monitor" ? "active" : ""} onClick={() => setView("monitor")}>Monitor tiendas</button>
          {canManageUsers && <button className={activeView === "users" ? "active" : ""} onClick={() => setView("users")}><Users /> Usuarios</button>}
        </nav>}
        {blActive && <button className="refresh-button" onClick={refreshView} disabled={refreshing} title="Recargar la última versión disponible"><RefreshCw className={refreshing ? "spin" : ""} /> {refreshing ? "ACTUALIZANDO…" : "ACTUALIZAR"}</button>}
      </header>
      {portalSection === "home" ? <section className="portal-home-page">
        <div className="portal-home-heading">
          <label>PLANIFICACIÓN FINANCIERA · FORUS</label>
          <h1>Portal de Informes</h1>
          <p>Selecciona un área para consultar sus informes disponibles o revisar los próximos desarrollos.</p>
        </div>
        <div className="portal-legend-grid">
            {portalGroups.map((group) => {
              const GroupIcon = group.icon;
              return <article className="portal-legend-card" key={group.id}>
                <div className="portal-legend-head"><GroupIcon /><div><h2>{group.label}</h2><p>{group.description}</p></div></div>
                <div className="portal-legend-links">{group.items.map((item) => <button type="button" key={item.id} className={item.enabled ? "available" : ""} onClick={() => openPortalSection(group.id, item.id)}><span>{item.label}</span><small>{item.enabled ? "ABRIR" : "EN CONSTRUCCIÓN"}</small></button>)}</div>
              </article>;
            })}
        </div>
      </section> : blActive ? <><section className="hero">
        <div><label>PLANIFICACIÓN FINANCIERA · PRESUPUESTO 2027P</label><h1>Rentabilidad de tiendas <em>2027P</em></h1><p>EERR Retail y riesgo Four Walls por tienda.</p></div>
        <span className="unit-badge"><b>INFORME EN MM$</b><small>ACTUALIZADO {snapshotLabel}</small></span>
      </section>
      {activeView !== "users" && <section className="filters">
        <b><Filter /> Segmentar vista</b>
        <details className="chain-multiselect" ref={chainFilterRef}>
          <summary><span>CADENA<strong>{selectedChains.length === 0 ? "TODAS" : selectedChains.length === 1 ? selectedChains[0] : `${selectedChains.length} CADENAS`}</strong></span><ChevronDown /></summary>
          <div className="chain-options">
            <button type="button" className={selectedChains.length === 0 ? "active" : ""} onClick={() => setSelectedChains([])}>TODAS</button>
            {chains.map((chain) => <label key={chain}><input type="checkbox" checked={selectedChains.includes(chain)} onChange={() => toggleChain(chain)} />{chain}</label>)}
          </div>
        </details>
        <div><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="BUSCAR UNO O VARIOS CC / TIENDAS, SEPARADOS POR COMA..." /></div>
        {fwBand && <i className={`filter-chip band-${fwBand}`}>{analysisMetric === "utility" ? "Utilidad" : "Four Walls"} {yearLabel(quadrantYear)} · {fwBand === "negative" ? "Pérdida" : fwBand === "low" ? "Baja" : "Saludable"}</i>}
        <button onClick={() => { setSelectedChains([]); setQuery(""); setFwBand(null); }}>Limpiar filtros</button>
      </section>}
      <div className="content">
        {activeView === "annual" ? <Executive selection={selection} universe={universe} quadrantYear={quadrantYear} setQuadrantYear={setQuadrantYear} fwBand={fwBand} setFwBand={setFwBand} analysisMetric={analysisMetric} setAnalysisMetric={setAnalysisMetric} /> : activeView === "detail" ? <Detail selection={selection} /> : activeView === "break-even" ? <BreakEven selection={selection} /> : activeView === "users" ? <UsuariosAdmin /> : <StoreMonitor selection={selection} />}
      </div>
      <footer>Planificación Financiera · Forus <span>INFORME EN MM$</span></footer>
      </> : portalSection === "benchmark-nacional" ? <NationalBenchmark /> : portalSection === "importaciones-retail" ? <ImportacionesIndustria /> : <section className="construction-page">
        <div className="construction-card">
          <i><Building2 /></i>
          <label>{selectedPortalGroup.label}</label>
          <h1>{selectedPortalItem.label}</h1>
          <strong>EN CONSTRUCCIÓN</strong>
          <p>Este informe formará parte del Portal Financiero. Su estructura y fuentes de datos todavía están en preparación.</p>
          <button type="button" onClick={() => setPortalSection("home")}>VOLVER A LA PORTADA</button>
        </div>
      </section>}
      </main>
    </div>
  );
}

// Para refrescar el dashboard, reemplazar este snapshot mediante el mismo mapper
// conectado a Google Sheets API y mantener los índices definidos en BaseRow.
