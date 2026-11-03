"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  Globe2,
  Layers3,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MetricRow = { metric: string; actual: number | string; budget: number | string; prior: number | string };
type BreakdownRow = MetricRow & { business: string };
type RankingRow = MetricRow & { brand: string };
type PresentationRow = MetricRow & { cut: "MENSUAL" | "ACUMULADO"; business?: string };
type KpiPayload = {
  selection: { year: number; month: number; cut: string; business: string; brand: string };
  metrics: MetricRow[];
  trend: ({ month: number } & Omit<MetricRow, "metric">)[];
  breakdown: BreakdownRow[];
  ranking: RankingRow[];
  presentation: { summary: PresentationRow[]; businesses: PresentationRow[] };
  options: { years: number[]; brands: string[]; latestMonth: number; latestYear: number };
  source: string;
  operationalSource?: string;
  operationalSources?: { brick?: string; ecommerce?: string; marketplace?: string; productivity?: string; uf?: string };
  operationalWarnings?: { productivity?: string | null };
  inventorySource?: string;
  inventoryBudgetSource?: string;
  refreshedAt: string | null;
  unit: string;
  error?: string;
};

type Selection = { year: number; month: number; cut: "MENSUAL" | "ACUMULADO"; brand: string };
type Values = { actual: number; budget: number; prior: number };
type MetricMap = Record<string, Values>;
type PresentationSection = {
  key: string;
  slide: string;
  eyebrow: string;
  title: string;
  business?: string;
  metrics: { key: string; label: string; available: boolean; format?: "money" | "integer" | "decimal" | "percentage"; budget?: boolean }[];
};

const metricDefinitions = [
  { key: "VENTAS NETAS", label: "Ventas netas", hint: "Ingresos del período" },
  { key: "MARGEN", label: "Margen", hint: "Margen sobre ventas" },
  { key: "COSTO OPERACIONAL", label: "Costo operacional", hint: "Estructura operacional" },
  { key: "RESULTADO OPERACIONAL", label: "Resultado operacional", hint: "Resultado del negocio" },
  { key: "UTILIDAD NETA", label: "Utilidad neta", hint: "Resultado final" },
] as const;
const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const businessOptions = [
  ["CONSOLIDADO", "Consolidado"],
  ["BRICK & LIFE", "Brick&Life"],
  ["ECOMMERCE", "Ecommerce"],
  ["MARKETPLACE", "Marketplace"],
  ["WHOLESALE", "Wholesale"],
] as const;
const hiddenFilterBrands = new Set([
  "ACCESORIOS HP", "BILLABONG", "BROOKS", "BSOUL / BROOKS", "BURTON",
  "CALPANY", "JANSPORT", "KEDS", "OTROS",
]);
const presentationSections: PresentationSection[] = [
  { key: "consolidado", slide: "09", eyebrow: "Seguimiento de resultados", title: "Consolidado", metrics: [
    { key: "VENTAS NETAS", label: "Venta MM$", available: true },
    { key: "MARGEN", label: "Margen MM$", available: true },
    { key: "UTILIDAD NETA", label: "Utilidad MM$", available: true },
    { key: "INVENTARIO", label: "Inventario MM$", available: true },
  ] },
  { key: "brick", slide: "11", eyebrow: "Brick & Life · Parte I", title: "Cadena", business: "BRICK & LIFE", metrics: [
    { key: "VENTAS NETAS", label: "Venta MM$", available: true },
    { key: "TICKET", label: "Ticket prom. $", available: true, format: "integer", budget: false },
    { key: "ITEM", label: "Item x boleta", available: true, format: "decimal", budget: false },
    { key: "CONVERSION", label: "Conversión", available: false },
    { key: "TRAFICO", label: "Tráfico S.S.S.", available: false },
  ] },
  { key: "brick-ii", slide: "12", eyebrow: "Brick & Life · Parte II", title: "Productividad tiendas", business: "BRICK & LIFE", metrics: [
    { key: "VENTA SSS", label: "Venta MM$ S.S.S.", available: true, budget: false },
    { key: "VENTA UF M2", label: "Venta UF/m²", available: true, format: "decimal" },
    { key: "MARGEN UF M2", label: "Margen UF/m²", available: true, format: "decimal" },
    { key: "RENTABILIDAD UF M2", label: "Rentabilidad UF/m²", available: true, format: "decimal" },
  ] },
  { key: "ecommerce", slide: "14", eyebrow: "Seguimiento de resultados", title: "Ecommerce", business: "ECOMMERCE", metrics: [
    { key: "VENTAS NETAS", label: "Venta contable MM$", available: true },
    { key: "VENTA TRANSACCIONAL", label: "Venta transaccional MM$", available: true, budget: false },
    { key: "SESIONES", label: "Sesiones", available: true, format: "integer", budget: false },
    { key: "CONVERSION", label: "Conversión", available: true, format: "percentage", budget: false },
    { key: "TICKET", label: "Ticket", available: true, format: "integer", budget: false },
    { key: "ITEM", label: "Item", available: true, format: "decimal", budget: false },
  ] },
  { key: "marketplace", slide: "16", eyebrow: "Seguimiento de resultados", title: "Marketplace", business: "MARKETPLACE", metrics: [
    { key: "VENTAS NETAS", label: "Venta MM$", available: true },
    { key: "MARGEN", label: "Margen MM$", available: true },
    { key: "ORDENES", label: "Órdenes", available: true, format: "integer", budget: false },
    { key: "TICKET", label: "Ticket", available: true, format: "integer", budget: false },
    { key: "ITEM", label: "Item", available: true, format: "decimal", budget: false },
  ] },
  { key: "wholesale", slide: "18", eyebrow: "Seguimiento de resultados", title: "Wholesale", business: "WHOLESALE", metrics: [
    { key: "VENTAS NETAS", label: "Venta Sell In MM$", available: true },
    { key: "MARGEN", label: "Margen MM$", available: true },
    { key: "RESULTADO OPERACIONAL", label: "ROP MM$", available: true },
  ] },
];
const number = (value: unknown) => Number(value || 0);
const money = (value: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value);
const decimal = (value: number) => new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const percent = (value: number) => `${new Intl.NumberFormat("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
const percentage = (value: number) => new Intl.NumberFormat("es-CL", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const brandLabel = (brand: string) => brand === "CATERPILLAR" ? "CATERPILLAR" : ["SAFETY", "NORSEG", "NORSEG SAFETY"].includes(brand.trim().toUpperCase()) ? "NORSEG (SAFETY)" : brand;
const brandColors: Record<string, string> = {
  TODAS: "#1f3864ff",
  AZALEIA: "#ff5aa5ff",
  BSOUL: "#8e7cc3ff",
  CATERPILLAR: "#eabb27ff",
  COLUMBIA: "#1486c7ff",
  CROCS: "#74b700ff",
  "HUSH PUPPIES": "#a86d46ff",
  "HUSH PUPPIES KIDS": "#905324ff",
  LOP: "#3d2b2cff",
  MERRELL: "#ea8122ff",
  "MOUNTAIN HARDWEAR": "#434343ff",
  PARFOIS: "#0c343dff",
  ROCKFORD: "#004519ff",
  NORSEG: "#cc4125ff",
  SAFETY: "#cc4125ff",
  "UNDER ARMOUR": "#000000ff",
  VANS: "#000000ff",
};
const brandLogos: Record<string, string> = {
  TODAS: "/brand-logos/todas.png",
  AZALEIA: "/brand-logos/azaleia.png",
  BSOUL: "/brand-logos/bsoul.png",
  CATERPILLAR: "/brand-logos/caterpillar.png",
  COLUMBIA: "/brand-logos/columbia.png",
  CROCS: "/brand-logos/crocs.png",
  "HUSH PUPPIES": "/brand-logos/hush-puppies.png",
  "HUSH PUPPIES KIDS": "/brand-logos/hush-puppies-kids.png",
  LOP: "/brand-logos/lop.png",
  MERRELL: "/brand-logos/merrell.png",
  "MOUNTAIN HARDWEAR": "/brand-logos/mountain-hardwear.png",
  PARFOIS: "/brand-logos/parfois.png",
  ROCKFORD: "/brand-logos/rockford.png",
  NORSEG: "/brand-logos/norseg.png",
  SAFETY: "/brand-logos/norseg.png",
  "UNDER ARMOUR": "/brand-logos/under-armour.png",
  VANS: "/brand-logos/vans.png",
};
const contrastColor = (hex: string) => {
  const channels = hex.slice(1, 7).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16) / 255) ?? [0, 0, 0];
  const luminance = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.18 ? "#111827" : "#ffffff";
};
const variation = (current: number, base: number) => base === 0 ? null : ((current / base) - 1) * 100;
const values = (row?: MetricRow): Values => ({ actual: number(row?.actual), budget: number(row?.budget), prior: number(row?.prior) });
const metricMap = (rows: MetricRow[]): MetricMap => Object.fromEntries(rows.map((row) => [row.metric, values(row)]));
const formatDate = (value: string | null) => {
  if (!value) return "Corte disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
};

function Delta({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="channel-var neutral">Sin base</span>;
  const positive = value >= 0;
  return <span className={`channel-var ${positive ? "positive" : "negative"}`}>
    {positive ? <TrendingUp /> : <TrendingDown />}{positive ? "+" : ""}{percent(value)} {label}
  </span>;
}

export default function KpiConsolidado() {
  const [selection, setSelection] = useState<Selection>({ year: 2026, month: 8, cut: "MENSUAL", brand: "TODAS" });
  const [payload, setPayload] = useState<KpiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("consolidado");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      year: String(selection.year), month: String(selection.month), cut: selection.cut,
      business: "CONSOLIDADO", brand: selection.brand,
    });
    fetch(`/api/kpi-consolidado?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as KpiPayload;
        if (!response.ok || result.error) throw new Error(result.error || "No fue posible cargar los KPI.");
        return result;
      })
      .then((result) => {
        setPayload(result);
        if (selection.year === 2026 && selection.month === 8 && result.options.latestYear !== 2026) {
          setSelection((current) => ({ ...current, year: result.options.latestYear, month: result.options.latestMonth }));
        }
      })
      .catch((reason: unknown) => {
        if ((reason as { name?: string }).name !== "AbortError") setError(reason instanceof Error ? reason.message : "No fue posible cargar los KPI.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [selection.year, selection.month, selection.cut, selection.brand]);

  const metrics = useMemo(() => metricMap(payload?.metrics ?? []), [payload]);
  const groupedBusiness = useMemo(() => {
    const groups = new Map<string, MetricMap>();
    (payload?.breakdown ?? []).forEach((row) => groups.set(row.business, { ...(groups.get(row.business) ?? {}), [row.metric]: values(row) }));
    return businessOptions.slice(1).map(([key, label]) => ({ key, label, metrics: groups.get(key) ?? {} }));
  }, [payload]);
  const ranking = useMemo(() => {
    const groups = new Map<string, MetricMap>();
    (payload?.ranking ?? []).forEach((row) => groups.set(row.brand, { ...(groups.get(row.brand) ?? {}), [row.metric]: values(row) }));
    return [...groups.entries()].map(([brand, rows]) => ({ brand, rows }))
      .filter((item) => item.brand.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")))
      .sort((a, b) => (b.rows["VENTAS NETAS"]?.actual ?? 0) - (a.rows["VENTAS NETAS"]?.actual ?? 0));
  }, [payload, search]);
  const trend = useMemo(() => (payload?.trend ?? []).map((row) => ({
    name: months[number(row.month) - 1], actual: number(row.actual), budget: number(row.budget), prior: number(row.prior),
  })), [payload]);
  const presentation = useMemo(() => {
    const summary = new Map<string, MetricMap>();
    const businesses = new Map<string, MetricMap>();
    (payload?.presentation?.summary ?? []).forEach((row) => summary.set(row.cut, { ...(summary.get(row.cut) ?? {}), [row.metric]: values(row) }));
    (payload?.presentation?.businesses ?? []).forEach((row) => {
      const key = `${row.business}:${row.cut}`;
      businesses.set(key, { ...(businesses.get(key) ?? {}), [row.metric]: values(row) });
    });
    return { summary, businesses };
  }, [payload]);
  const selectedBrandLabel = selection.brand === "TODAS" ? "Todas las marcas" : brandLabel(selection.brand);
  const selectedBrandKey = selection.brand.trim().toUpperCase();
  const selectedBrandColor = brandColors[selectedBrandKey] ?? brandColors.TODAS;
  const selectedBrandLogo = brandLogos[selectedBrandKey] ?? brandLogos.TODAS;
  const deckStyle = {
    "--kpi-brand-color": selectedBrandColor,
    "--kpi-brand-nav-contrast": contrastColor(selectedBrandColor),
  } as CSSProperties;
  const selectedPresentation = presentationSections.find((section) => section.key === activeSection) ?? presentationSections[0];
  const sales = metrics["VENTAS NETAS"] ?? values();
  const presentationRows = (cut: "MENSUAL" | "ACUMULADO") => selectedPresentation.business
    ? presentation.businesses.get(`${selectedPresentation.business}:${cut}`) ?? {}
    : presentation.summary.get(cut) ?? {};
  const presentationValue = (value: number, format: "money" | "integer" | "decimal" | "percentage" = "money") => format === "percentage" ? percentage(value) : format === "decimal" ? decimal(value) : money(value);

  const update = <K extends keyof Selection>(key: K, value: Selection[K]) => {
    setLoading(true);
    setError("");
    setSelection((current) => ({ ...current, [key]: value }));
  };
  const filter = (label: string, value: string | number, onChange: (value: string) => void, options: readonly (readonly [string | number, string, boolean?])[]) =>
    <label>{label}<div><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([key, text, disabled]) => <option key={key} value={key} disabled={disabled}>{text}</option>)}</select><ChevronDown /></div></label>;
  const cellDelta = (current: number, base: number) => {
    const change = variation(current, base);
    return <span className={change !== null && change < 0 ? "negative" : "positive"}>{change === null ? "—" : `${change >= 0 ? "+" : ""}${percent(change)}`}</span>;
  };
  return <section className="channel-profitability kpi-consolidated">
    <header className="channel-hero kpi-hero">
      <div><label>INDICADORES POR NEGOCIO · FUENTE BIGQUERY</label><h1>KPI <em>Consolidado</em></h1><p>Resultados financieros consolidados y apertura por marca, con la misma lectura de las presentaciones KPI.</p></div>
      <span><b>INFORME EN MM$</b><small>{selectedBrandLabel.toUpperCase()} · {selection.cut}</small></span>
    </header>

    <section className="channel-filters kpi-filters">
      {filter("AÑO", selection.year, (value) => update("year", Number(value)), (payload?.options.years ?? [2024, 2025, 2026]).map((year) => [year, String(year)]))}
      {filter("MES", selection.month, (value) => update("month", Number(value)), months.map((name, index) => [index + 1, name]))}
      {filter("MARCA", selection.brand, (value) => update("brand", value), [["TODAS", "Todas las marcas"], ...(payload?.options.brands ?? []).filter((brand) => !hiddenFilterBrands.has(brand.trim().toUpperCase())).map((brand) => [brand, brandLabel(brand)] as const)])}
      <div className="channel-filter-note"><CircleDollarSign /><span><small>LECTURA ACTUAL</small><b>{months[selection.month - 1]} {selection.year} · {selectedBrandLabel}</b></span></div>
    </section>

    {loading && !payload ? <div className="channel-state"><RefreshCw className="spin" /> Consultando indicadores financieros…</div>
      : error && !payload ? <div className="channel-state error"><BarChart3 /><b>No se pudieron cargar los KPI</b><span>{error}</span></div>
      : <>
        {error && <div className="kpi-warning">No fue posible actualizar el último filtro: {error}</div>}
        <section className="kpi-deck-view" aria-label="Vista de presentación KPI" style={deckStyle}>
          <nav className="kpi-deck-tabs" aria-label="Diapositivas 8 a 18">
            {presentationSections.map((section) => {
              const Icon = section.key === "consolidado" ? Layers3 : section.key.startsWith("brick") ? Store : section.key === "ecommerce" ? Globe2 : section.key === "marketplace" ? ShoppingBag : Warehouse;
              return <button key={section.key} type="button" className={activeSection === section.key ? "active" : ""} onClick={() => setActiveSection(section.key)}>
                <Icon /><span><small>Diap. {section.slide}</small><b>{section.title}</b></span>
              </button>;
            })}
          </nav>
          <article className="kpi-deck-slide">
            <header>
              <div className="kpi-deck-heading">
                
                <div><label>{selectedPresentation.eyebrow}</label><h2>{selectedPresentation.title} <em>{selectedBrandLabel}</em></h2></div>
              </div>
              <span>Mes de <b>{months[selection.month - 1]}</b><small>Cifras financieras en MM$</small></span>
            </header>
            <div className="kpi-deck-periods">
              {(["MENSUAL", "ACUMULADO"] as const).map((cut) => {
                const rows = presentationRows(cut);
                return <section key={cut}>
                  <h3>{cut === "MENSUAL" ? `Mes de ${months[selection.month - 1]}` : `Acumulado a ${months[selection.month - 1]}`}</h3>
                  <div className="kpi-deck-metrics">
                    {selectedPresentation.metrics.map((definition) => {
                      const item = rows[definition.key] ?? values();
                      const available = definition.available && definition.key in rows;
                      return <article key={definition.key} className={!available ? "pending" : ""}>
                        <h4>{definition.label}</h4>
                        {available ? <>
                          <div className="kpi-deck-values"><span><small>{selection.year - 1}</small><b>{presentationValue(item.prior, definition.format)}</b></span><span><small>{definition.budget === false ? "Fuente" : "Ppto."}</small><b>{definition.budget === false ? "Operacional" : presentationValue(item.budget, definition.format)}</b></span><span className="actual"><small>{selection.year}</small><b>{presentationValue(item.actual, definition.format)}</b></span></div>
                          <div className="kpi-deck-deltas"><Delta value={variation(item.actual, item.prior)} label={`${String(selection.year).slice(-2)}/${String(selection.year - 1).slice(-2)}`} />{definition.budget !== false && <Delta value={variation(item.actual, item.budget)} label="vs. ppto." />}</div>
                        </> : <div className="kpi-source-pending"><b>Fuente operativa pendiente</b><span>{definition.key.includes("UF M2") ? payload?.operationalWarnings?.productivity ?? "No hay cobertura UF suficiente para este período." : "El EERR de BigQuery no contiene este indicador."}</span></div>}
                      </article>;
                    })}
                  </div>
                </section>;
              })}
            </div>
            <footer><span>Vista equivalente a diapositivas 8–18</span><b>Diapositiva {selectedPresentation.slide}</b></footer>
          </article>
        </section>
        <section className={`channel-kpis kpi-cards ${loading ? "is-loading" : ""}`}>
          {metricDefinitions.map((definition) => {
            const item = metrics[definition.key] ?? values();
            const marginHint = definition.key !== "VENTAS NETAS" && sales.actual ? `${percent(item.actual / sales.actual * 100)} sobre ventas` : definition.hint;
            return <article key={definition.key}><div><small>{definition.label}</small><BarChart3 /></div><strong>{money(item.actual)}</strong><Delta value={variation(item.actual, item.budget)} label="vs. ppto." /><p>{marginHint}</p></article>;
          })}
        </section>

        <section className="channel-grid kpi-main-grid">
          <article className="channel-panel channel-eerr">
            <header><div><label>RESUMEN EJECUTIVO</label><h2>Real, presupuesto y año anterior</h2></div><span>{selection.cut}</span></header>
            <div className="channel-table-wrap"><table><thead><tr><th>Concepto</th><th>{selection.year} Real</th><th>{selection.year} Ppto.</th><th>Var. ppto.</th><th>{selection.year - 1} Real</th><th>Var. A.A.</th></tr></thead><tbody>
              {metricDefinitions.map((definition) => {
                const item = metrics[definition.key] ?? values();
                return <tr key={definition.key}><td><b>{definition.label}</b></td><td>{money(item.actual)}</td><td>{money(item.budget)}</td><td>{cellDelta(item.actual, item.budget)}</td><td>{money(item.prior)}</td><td>{cellDelta(item.actual, item.prior)}</td></tr>;
              })}
            </tbody></table></div>
          </article>

          <article className="channel-panel channel-trend">
            <header><div><label>EVOLUCIÓN MENSUAL</label><h2>Ventas netas</h2></div><span>{selection.year}</span></header>
            <div className="channel-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ top: 12, right: 14, left: 4, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe4ef" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => money(Number(value))} tickLine={false} axisLine={false} width={65} /><Tooltip formatter={(value) => [`${money(Number(value))} MM$`, ""]} /><Legend /><Line name={`${selection.year} Real`} dataKey="actual" stroke="#153b72" strokeWidth={3} dot={{ r: 3 }} /><Line name={`${selection.year} Ppto.`} dataKey="budget" stroke="#d78b20" strokeWidth={2} strokeDasharray="5 4" dot={false} /><Line name={`${selection.year - 1} Real`} dataKey="prior" stroke="#9cacc0" strokeWidth={2} strokeDasharray="3 5" dot={false} /></LineChart></ResponsiveContainer></div>
          </article>
        </section>

        <article className="channel-panel channel-channel-view">
          <header><div><label>COMPORTAMIENTO POR NEGOCIO</label><h2>Cuadro consolidado</h2></div><span>{selectedBrandLabel.toUpperCase()}</span></header>
          <div className="channel-table-wrap"><table><thead><tr><th>Negocio</th><th>Ventas netas</th><th>Var. ppto.</th><th>Margen</th><th>Margen %</th><th>Resultado operacional</th><th>Var. ppto.</th><th>Utilidad neta</th></tr></thead><tbody>
            {groupedBusiness.map((business) => {
              const businessSales = business.metrics["VENTAS NETAS"] ?? values();
              const margin = business.metrics.MARGEN ?? values();
              const result = business.metrics["RESULTADO OPERACIONAL"] ?? values();
              const utility = business.metrics["UTILIDAD NETA"] ?? values();
              return <tr key={business.key}><td><b>{business.label}</b></td><td>{money(businessSales.actual)}</td><td>{cellDelta(businessSales.actual, businessSales.budget)}</td><td>{money(margin.actual)}</td><td>{businessSales.actual ? percent(margin.actual / businessSales.actual * 100) : "—"}</td><td className={result.actual < 0 ? "negative" : "positive"}>{money(result.actual)}</td><td>{cellDelta(result.actual, result.budget)}</td><td className={utility.actual < 0 ? "negative" : "positive"}>{money(utility.actual)}</td></tr>;
            })}
          </tbody></table></div>
        </article>

        <article className="channel-panel channel-ranking kpi-brand-ranking">
          <header><div><label>APERTURA POR MARCA</label><h2>Contribución al resultado</h2></div><div className="channel-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar marca…" /></div></header>
          <div className="channel-table-wrap"><table className="channel-ranking-table"><thead><tr><th>Marca</th><th>Ventas netas</th><th>Var. A.A.</th><th>Var. ppto.</th><th>Margen</th><th>Margen %</th><th>Inventario</th><th>Resultado operacional</th><th>Var. ppto.</th><th>Utilidad neta</th><th>Var. ppto.</th></tr></thead><tbody>
            {ranking.map((item) => {
              const itemSales = item.rows["VENTAS NETAS"] ?? values();
              const margin = item.rows.MARGEN ?? values();
              const result = item.rows["RESULTADO OPERACIONAL"] ?? values();
              const utility = item.rows["UTILIDAD NETA"] ?? values();
              const inventory = item.rows.INVENTARIO ?? values();
              return <tr key={item.brand} className={item.brand === selection.brand ? "kpi-selected-brand" : ""} onClick={() => update("brand", item.brand)}><td><b>{brandLabel(item.brand)}</b></td><td>{money(itemSales.actual)}</td><td>{cellDelta(itemSales.actual, itemSales.prior)}</td><td>{cellDelta(itemSales.actual, itemSales.budget)}</td><td>{money(margin.actual)}</td><td>{itemSales.actual ? percent(margin.actual / itemSales.actual * 100) : "—"}</td><td>{money(inventory.actual)}</td><td className={result.actual < 0 ? "negative" : "positive"}>{money(result.actual)}</td><td>{cellDelta(result.actual, result.budget)}</td><td className={utility.actual < 0 ? "negative" : "positive"}>{money(utility.actual)}</td><td>{cellDelta(utility.actual, utility.budget)}</td></tr>;
            })}
          </tbody></table></div>
        </article>

        <footer className="kpi-source"><span>Fuente financiera: {payload?.source}</span><span>Fuente inventario real: {payload?.inventorySource ?? "No disponible"}</span><span>Fuente PPTO inventario: {payload?.inventoryBudgetSource ?? "No disponible"}</span><span>Fuente Brick & Life: {payload?.operationalSources?.brick ?? "No disponible"}</span><span>Fuente Productividad: {payload?.operationalSources?.productivity ?? "No disponible"}</span><span>Fuente UF: {payload?.operationalSources?.uf ?? "No disponible"}</span><span>Fuente Ecommerce: {payload?.operationalSources?.ecommerce ?? "No disponible"}</span><span>Fuente Marketplace: {payload?.operationalSources?.marketplace ?? payload?.operationalSource ?? "No disponible"}</span><span>Actualización: {formatDate(payload?.refreshedAt ?? null)}</span></footer>
      </>}
  </section>;
}

