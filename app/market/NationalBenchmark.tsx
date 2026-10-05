"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Building2, ChevronDown, CircleDollarSign, TrendingUp } from "lucide-react";

type CsvRow = Record<string, string>;
type Scope = "Consolidado" | "Retail";
type MetricKey = "revenue" | "ebitda" | "operating" | "net" | "gav" | "ebitdaMargin" | "gavMargin";
type Metrics = Record<MetricKey, number | null> & { growth: number | null; previous: Partial<Record<MetricKey, number>> };

const companies = ["Cencosud", "Falabella", "Ripley", "FORUS", "Tricot", "Hites"];
const periods = ["2T25", "2T26", "6M25", "6M26"];
const metricMap: Record<string, MetricKey> = {
  Ingresos: "revenue",
  "EBITDA reportado (IFRS)": "ebitda",
  "Resultado Operacional": "operating",
  "Utilidad Neta": "net",
  GAV: "gav",
  "EBITDA Margen": "ebitdaMargin",
  "GAV / Venta %": "gavMargin",
};

function parseCsv(text: string) {
  const output: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && (char === "," || char === "\n")) {
      row.push(cell.replace(/\r$/, ""));
      cell = "";
      if (char === "\n") { output.push(row); row = []; }
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); output.push(row); }
  const [headers, ...values] = output;
  return values.map((valuesRow) => Object.fromEntries(headers.map((header, index) => [header, valuesRow[index] ?? ""])));
}

function numeric(value = "") {
  const clean = value.replace(/,/g, "").replace(/%/g, "").trim();
  return clean && Number.isFinite(Number(clean)) ? Number(clean) : null;
}

function canonicalCompany(value: string) {
  const clean = value.toUpperCase().replace(/[.]/g, "").trim();
  if (clean.startsWith("RIPLEY")) return "RIPLEY";
  return clean;
}

function metricsFor(rows: CsvRow[], company: string, period: string, scope: Scope): Metrics {
  const metrics: Metrics = {
    revenue: null, ebitda: null, operating: null, net: null, gav: null,
    ebitdaMargin: null, gavMargin: null, growth: null, previous: {},
  };
  for (const [sourceMetric, key] of Object.entries(metricMap)) {
    const candidates = rows.filter((row) =>
      canonicalCompany(row.EMPRESA) === canonicalCompany(company)
      && row.PERIODO_ORIGEN === period
      && row.METRICA_ORIGEN === sourceMetric
      && !/Perú|PerÃº|Colombia|Uruguay/i.test(row.TITULO_HOJA_ORIGEN),
    );
    const selected = scope === "Consolidado"
      ? candidates.find((row) => /Total Empresa/i.test(row.TITULO_HOJA_ORIGEN)) ?? candidates[0]
      : candidates.find((row) => /Chile Retail/i.test(row.TITULO_HOJA_ORIGEN)) ?? candidates[1];
    if (!selected) continue;
    metrics[key] = numeric(selected.VALOR);
    const previous = numeric(selected.VALOR_PERIODO_ANT);
    if (previous !== null) metrics.previous[key] = previous;
    if (key === "revenue") metrics.growth = numeric(selected.VAR_PCT_AA_BD);
  }
  return metrics;
}

const money = (value: number | null) => value === null ? "N/D" : `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value)} MM$`;
const percent = (value: number | null, sign = false) => value === null ? "N/D" : `${sign && value > 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")}%`;
const valueOrZero = (value: number | null) => value ?? 0;

export default function NationalBenchmark() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("6M26");
  const [scope, setScope] = useState<Scope>("Consolidado");
  const [company, setCompany] = useState("Todas");

  useEffect(() => {
    fetch("/data/market/national-source.csv")
      .then((response) => { if (!response.ok) throw new Error("No fue posible cargar la fuente nacional."); return response.text(); })
      .then((text) => setRows(parseCsv(text)))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const companyData = useMemo(() => companies.map((name) => ({ name, metrics: metricsFor(rows, name, period, scope) })), [rows, period, scope]);
  const visible = company === "Todas" ? companyData : companyData.filter((item) => item.name === company);
  const totals = useMemo(() => visible.reduce((sum, item) => ({
    revenue: sum.revenue + valueOrZero(item.metrics.revenue),
    ebitda: sum.ebitda + valueOrZero(item.metrics.ebitda),
    operating: sum.operating + valueOrZero(item.metrics.operating),
    net: sum.net + valueOrZero(item.metrics.net),
  }), { revenue: 0, ebitda: 0, operating: 0, net: 0 }), [visible]);
  const ranked = useMemo(() => [...companyData].sort((a, b) => valueOrZero(b.metrics.growth) - valueOrZero(a.metrics.growth)), [companyData]);
  const maxRevenue = Math.max(1, ...companyData.map((item) => valueOrZero(item.metrics.revenue)));

  if (loading) return <section className="market-state"><span>Cargando Benchmark Nacional…</span></section>;
  if (error) return <section className="market-state error"><strong>No se pudo abrir el Benchmark Nacional</strong><span>{error}</span></section>;

  return <section className="market-page">
    <div className="market-title-row">
      <div><label>MERCADO · BENCHMARK NACIONAL</label><h1>Resultados financieros comparables</h1><p>Desempeño de las principales compañías de retail en Chile.</p></div>
      <span className="market-source">FUENTE <b>BD NACIONAL · MM$ CLP</b></span>
    </div>

    <div className="market-filters">
      <div><span>PERÍODO</span><div className="market-segments">{periods.map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div></div>
      <div><span>APERTURA</span><div className="market-segments">{(["Consolidado", "Retail"] as Scope[]).map((item) => <button key={item} className={scope === item ? "active" : ""} onClick={() => setScope(item)}>{item === "Retail" ? "RETAIL (TxD)" : item.toUpperCase()}</button>)}</div></div>
      <label><span>EMPRESA</span><div className="market-select"><select value={company} onChange={(event) => setCompany(event.target.value)}><option>Todas</option>{companies.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown /></div></label>
    </div>

    <div className="market-kpis">
      <article><i><TrendingUp /></i><span>INGRESOS</span><strong>{money(totals.revenue)}</strong><small>{company === "Todas" ? "Suma de compañías" : company}</small></article>
      <article><i><BarChart3 /></i><span>EBITDA</span><strong>{money(totals.ebitda)}</strong><small>Margen {percent(totals.revenue ? totals.ebitda / totals.revenue * 100 : null)}</small></article>
      <article><i><Building2 /></i><span>RESULTADO OPERACIONAL</span><strong>{money(totals.operating)}</strong><small className={totals.operating >= 0 ? "positive" : "negative"}>{totals.operating >= 0 ? "Resultado positivo" : "Resultado negativo"}</small></article>
      <article><i><CircleDollarSign /></i><span>UTILIDAD NETA</span><strong>{money(totals.net)}</strong><small className={totals.net >= 0 ? "positive" : "negative"}>Última línea</small></article>
    </div>

    <div className="market-grid">
      <article className="market-panel">
        <header><div><label>MAPA COMPETITIVO</label><h2>Crecimiento de ingresos</h2></div><span>{period} · {scope}</span></header>
        <div className="growth-ranking">{ranked.map((item, index) => <div key={item.name}><b>{String(index + 1).padStart(2, "0")}</b><span>{item.name}</span><i><em style={{ width: `${Math.max(3, Math.min(100, 45 + valueOrZero(item.metrics.growth) * 4))}%` }} /></i><strong className={valueOrZero(item.metrics.growth) < 0 ? "negative" : "positive"}>{percent(item.metrics.growth, true)}</strong></div>)}</div>
      </article>
      <article className="market-panel">
        <header><div><label>ESCALA COMPARABLE</label><h2>Ingresos por compañía</h2></div><span>MM$ CLP</span></header>
        <div className="revenue-bars">{companyData.map((item) => <div key={item.name}><span>{item.name}</span><i><em style={{ width: `${valueOrZero(item.metrics.revenue) / maxRevenue * 100}%` }} /></i><strong>{money(item.metrics.revenue)}</strong></div>)}</div>
      </article>
    </div>

    <article className="market-table-panel">
      <header><div><label>DETALLE DE COMPAÑÍAS</label><h2>Vista comparativa</h2></div><span>{period} · {scope}</span></header>
      <div className="market-table-wrap"><table><thead><tr><th>COMPAÑÍA</th><th>INGRESOS</th><th>CREC. A/A</th><th>EBITDA</th><th>MARGEN EBITDA</th><th>RESULTADO OPERACIONAL</th><th>UTILIDAD NETA</th><th>GAV / VENTA</th></tr></thead><tbody>{visible.map((item) => <tr key={item.name}><td><b>{item.name}</b></td><td>{money(item.metrics.revenue)}</td><td className={valueOrZero(item.metrics.growth) < 0 ? "negative" : "positive"}>{percent(item.metrics.growth, true)}</td><td>{money(item.metrics.ebitda)}</td><td>{percent(item.metrics.ebitdaMargin)}</td><td>{money(item.metrics.operating)}</td><td>{money(item.metrics.net)}</td><td>{percent(item.metrics.gavMargin)}</td></tr>)}</tbody></table></div>
    </article>
  </section>;
}
