"use client";

import { useEffect, useState } from "react";
import { BarChart3, ChevronDown, Download, FileText, TrendingUp } from "lucide-react";
import { CompanyLogo } from "./companyLogos";

type Row = Record<string, string>;
type Scope = "Consolidado" | "Retail";
type Value = { current: number | null; previous: number | null };
type Company = { name: string; values: Record<string, Value> };
type Indicator = { label: string; source: string; kind: "money" | "percent" | "change" | "points"; group?: boolean };
type SourceErrorPayload = { error?: unknown; errorId?: unknown };

const indicators: Indicator[] = [
  { label: "Ingresos", source: "Ingresos", kind: "money", group: true },
  { label: "A/A ingresos", source: "Ingresos", kind: "change" },
  { label: "Ganancia bruta", source: "Ganancia Bruta", kind: "money", group: true },
  { label: "Margen bruto", source: "Margen Bruto", kind: "percent" },
  { label: "Variación margen bruto", source: "Margen Bruto", kind: "points" },
  { label: "GAV", source: "GAV", kind: "money", group: true },
  { label: "GAV / venta", source: "GAV / Venta %", kind: "percent" },
  { label: "Resultado operacional", source: "Resultado Operacional", kind: "money", group: true },
  { label: "Margen operacional", source: "Margen Operacional", kind: "percent" },
  { label: "Utilidad neta", source: "Utilidad Neta", kind: "money", group: true },
  { label: "Margen neto", source: "Margen Neto", kind: "percent" },
  { label: "EBITDA reportado (IFRS)", source: "EBITDA reportado (IFRS)", kind: "money", group: true },
  { label: "Margen EBITDA", source: "EBITDA Margen", kind: "percent" },
];
const priority = ["FORUS", "Falabella", "Cencosud", "Hites", "Ripley", "Tricot", "Abc SA"];
const empty: Value = { current: null, previous: null };
const number = (text = "") => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[,%\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};
const median = (items: number[]) => {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[center] : (sorted[center - 1] + sorted[center]) / 2;
};
const change = (a: number | null, b: number | null) => a === null || b === null || b === 0 ? null : (a / b - 1) * 100;
const fmtNumber = (value: number, digits = 0) => new Intl.NumberFormat("es-CL", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const fmt = (value: number | null, kind: Indicator["kind"], signed = false) => value === null ? "N/D" :
  `${signed && value > 0 ? "+" : ""}${fmtNumber(value, kind === "money" ? 0 : 1)}${kind === "money" ? "" : kind === "points" ? " pp" : "%"}`;
const metric = (company: Company, source: string) => company.values[source] ?? empty;
const valueFor = (company: Company, indicator: Indicator): Value => {
  const source = metric(company, indicator.source);
  if (indicator.kind === "change") return { current: change(source.current, source.previous), previous: null };
  if (indicator.kind === "points") return { current: source.current === null || source.previous === null ? null : source.current - source.previous, previous: null };
  return source;
};
const rankingIndicators = [
  { label: "Ingresos", weight: 10, lower: false, value: (company: Company) => metric(company, "Ingresos").current },
  { label: "Crecimiento de ingresos", weight: 20, lower: false, value: (company: Company) => change(metric(company, "Ingresos").current, metric(company, "Ingresos").previous) },
  { label: "Margen EBITDA", weight: 25, lower: false, value: (company: Company) => metric(company, "EBITDA Margen").current },
  { label: "GAV / venta", weight: 15, lower: true, value: (company: Company) => metric(company, "GAV / Venta %").current },
  { label: "Margen operacional", weight: 15, lower: false, value: (company: Company) => metric(company, "Margen Operacional").current },
  { label: "Margen neto", weight: 15, lower: false, value: (company: Company) => metric(company, "Margen Neto").current },
];
function rankCompanies(companies: Company[]) {
  const distributions = rankingIndicators.map((indicator) => companies.map(indicator.value).filter((value): value is number => value !== null));
  const ranked = companies.map((company) => {
    let score = 0, coverage = 0;
    const parts = rankingIndicators.map((indicator, index) => {
      const value = indicator.value(company);
      if (value === null) return { label: indicator.label, points: 0, weight: indicator.weight };
      const peers = distributions[index];
      let percentile = peers.length <= 1 ? 0.5 :
        (peers.filter((peer) => peer < value).length + (peers.filter((peer) => peer === value).length - 1) / 2) / (peers.length - 1);
      if (indicator.lower) percentile = 1 - percentile;
      const points = percentile * indicator.weight;
      score += points;
      coverage += indicator.weight;
      return { label: indicator.label, points, weight: indicator.weight };
    });
    return { company, score, coverage, parts };
  }).sort((a, b) => b.score - a.score);
  return ranked.map((entry) => ({ ...entry, position: ranked.findIndex((other) => Math.abs(other.score - entry.score) < 1e-9) + 1 }));
}

function parseCsv(text: string): Row[] {
  const records: string[][] = [];
  let record: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && (char === "," || char === "\n")) {
      record.push(cell.replace(/\r$/, "")); cell = "";
      if (char === "\n") { records.push(record); record = []; }
    } else cell += char;
  }
  if (cell || record.length) records.push([...record, cell]);
  const [header = [], ...body] = records;
  const keys = header.map((key) => key.replace(/^\uFEFF/, ""));
  return body.filter((cells) => cells.length === keys.length).map((cells) => Object.fromEntries(keys.map((key, index) => [key, cells[index]])));
}
function periodOrder(period: string) {
  const match = period.match(/^(\d+)([TM])([0-9]{2,4})$/i);
  if (!match) return -1;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  return year * 12 + Number(match[1]) * (match[2].toUpperCase() === "T" ? 3 : 1);
}
function isScope(row: Row, scope: Scope) {
  const title = row.TITULO_HOJA_ORIGEN || "";
  if (/Chile Retail/i.test(title)) return scope === "Retail";
  if (/Total Empresa/i.test(title)) return scope === "Consolidado";
  if (title.trim()) return false;
  // La fuente histórica no titula Chile Retail en trimestres ni Total Empresa en acumulados.
  return scope === (/^\d+T\d+/i.test(row.PERIODO_ORIGEN || "") ? "Retail" : "Consolidado");
}
function companiesFor(rows: Row[], period: string, scope: Scope): Company[] {
  const byName = new Map<string, Company>();
  for (const row of rows) {
    if (row.PERIODO_ORIGEN !== period || !isScope(row, scope) || !row.EMPRESA || !row.METRICA_ORIGEN) continue;
    const source = row.METRICA_ORIGEN;
    if (!indicators.some((indicator) => indicator.source === source)) continue;
    const company = byName.get(row.EMPRESA) ?? { name: row.EMPRESA, values: {} };
    if (!company.values[source]) company.values[source] = { current: number(row.VALOR), previous: number(row.VALOR_PERIODO_ANT) };
    byName.set(row.EMPRESA, company);
  }
  return [...byName.values()].filter((company) => metric(company, "Ingresos").current !== null)
    .sort((a, b) => (priority.indexOf(a.name) < 0 ? 100 : priority.indexOf(a.name)) - (priority.indexOf(b.name) < 0 ? 100 : priority.indexOf(b.name)) || a.name.localeCompare(b.name, "es"));
}
function downloadCsv(filename: string, records: string[][]) {
  const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const content = "\uFEFF" + records.map((record) => record.map(escape).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function sourceError(response: Response) {
  let payload: SourceErrorPayload = {};
  try {
    payload = await response.json() as SourceErrorPayload;
  } catch {
    // La ruta puede responder sin JSON ante un error de infraestructura.
  }
  const detail = typeof payload.error === "string" && payload.error.trim()
    ? payload.error.trim()
    : "La fuente no entregó un detalle adicional.";
  const errorId = typeof payload.errorId === "string" && payload.errorId.trim()
    ? ` Identificador: ${payload.errorId.trim()}.`
    : "";
  return `No fue posible cargar la fuente nacional (HTTP ${response.status}). ${detail}${errorId}`;
}

export default function NationalBenchmark() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("");
  const [scope, setScope] = useState<Scope>("Consolidado");
  const [selected, setSelected] = useState("Todas");
  useEffect(() => {
    fetch("/data/market/national-source.csv", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw Error(await sourceError(response));
        return response.text();
      })
      .then((text) => setRows(parseCsv(text)))
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);
  const periods = [...new Set(rows.map((row) => row.PERIODO_ORIGEN))].filter((item) => periodOrder(item) > 0 && rows.some((row) => row.PERIODO_ORIGEN === item && row.EMPRESA === "FORUS" && row.METRICA_ORIGEN === "Ingresos" && isScope(row, "Consolidado")))
    .sort((a, b) => periodOrder(a) - periodOrder(b));
  const activePeriod = periods.includes(period) ? period : periods.at(-1) ?? "";
  const all = companiesFor(rows, activePeriod, scope);
  const visible = selected === "Todas" ? all : all.filter((company) => company.name === selected);
  const focus = all.find((company) => company.name === (selected === "Todas" ? "FORUS" : selected));
  const peers = all.filter((company) => company.name !== focus?.name);
  const ranking = rankCompanies(all).filter((entry) => selected === "Todas" || entry.company.name === selected);
  const comparisons = [
    { title: "Crecimiento de ingresos", indicator: indicators[1], icon: TrendingUp },
    { title: "Margen bruto", indicator: indicators[3], icon: BarChart3 },
    { title: "Margen EBITDA", indicator: indicators[12], icon: BarChart3 },
    { title: "Margen neto", indicator: indicators[10], icon: BarChart3 },
  ].map((item) => {
    const current = focus ? valueFor(focus, item.indicator).current : null;
    const peer = median(peers.map((company) => valueFor(company, item.indicator).current).filter((item): item is number => item !== null));
    return { ...item, current, peer, gap: current === null || peer === null ? null : current - peer };
  });
  const exportRows = [
    ["Benchmark nacional", activePeriod, scope, selected === "Todas" ? "Todas las empresas" : selected],
    ["Indicador", ...visible.flatMap((company) => [`${company.name} anterior`, `${company.name} actual`])],
    ...indicators.map((indicator) => [indicator.label, ...visible.flatMap((company) => {
      const value = valueFor(company, indicator);
      return [fmt(value.previous, indicator.kind), fmt(value.current, indicator.kind)];
    })]),
  ];
  if (loading) return <section className="market-state">Cargando Benchmark Nacional…</section>;
  if (error) return <section className="market-state error">{error}</section>;
  if (!activePeriod || !all.length) return <section className="market-state error">No hay datos comparables en la fuente nacional.</section>;

  const revenue = focus ? metric(focus, "Ingresos") : empty;
  const ebitda = focus ? metric(focus, "EBITDA reportado (IFRS)") : empty;
  const net = focus ? metric(focus, "Utilidad Neta") : empty;
  const growth = change(revenue.current, revenue.previous);
  const executive = focus ? [
    `${focus.name} registró ingresos de ${fmt(revenue.current, "money")} MM$ en ${activePeriod}, con una variación de ${fmt(growth, "change", true)} frente al año anterior.`,
    `La mediana de crecimiento de ${peers.length} compañías comparables fue ${fmt(comparisons[0].peer, "change", true)}. La brecha de ${focus.name} fue ${fmt(comparisons[0].gap, "points", true)}.`,
    `El EBITDA reportado fue ${fmt(ebitda.current, "money")} MM$ (${fmt(change(ebitda.current, ebitda.previous), "change", true)} A/A) y la utilidad neta ${fmt(net.current, "money")} MM$ (${fmt(change(net.current, net.previous), "change", true)} A/A).`,
    `El margen EBITDA se ubicó en ${fmt(comparisons[2].current, "percent")}, frente a una mediana de ${fmt(comparisons[2].peer, "percent")} en las otras compañías.`,
  ] : [];
  const maxRevenue = Math.max(1, ...visible.flatMap((company) => [metric(company, "Ingresos").current ?? 0, metric(company, "Ingresos").previous ?? 0]));
  return <section className="market-page benchmark-expanded national-benchmark" id="national-benchmark-report">
    <div className="market-title-row"><div><label>RESULTADOS FINANCIEROS COMPARABLES</label><h1>{scope === "Consolidado" ? "Resultados consolidados" : "Resultados retail Chile"}</h1><p>Lectura comparativa del desempeño {activePeriod}, con base del año anterior.</p></div><span className="market-source">FUENTE <b>BD NACIONAL · MM$ CLP</b></span></div>
    <div className="market-filters"><div><span>PERÍODO</span><div className="market-segments">{periods.map((item) => <button type="button" key={item} className={activePeriod === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div></div><div><span>APERTURA</span><div className="market-segments">{(["Consolidado", "Retail"] as Scope[]).map((item) => <button type="button" key={item} className={scope === item ? "active" : ""} onClick={() => { setScope(item); setSelected("Todas"); }}>{item}</button>)}</div></div><label><span>EMPRESA</span><div className="market-select"><select value={selected} onChange={(event) => setSelected(event.target.value)}><option>Todas</option>{all.map((company) => <option key={company.name}>{company.name}</option>)}</select><ChevronDown /></div></label><div className="benchmark-export-actions"><button type="button" onClick={() => downloadCsv(`benchmark-nacional-${activePeriod}-${scope.toLowerCase()}-${selected.replace(/\s+/g, "-")}.csv`, exportRows)}><Download /> Exportar CSV</button><button type="button" onClick={() => window.print()}><FileText /> Exportar PDF</button></div></div>
    <div className="market-kpis benchmark-kpis">{comparisons.map(({ title, indicator, icon: Icon, current, peer, gap }) => <article key={title}><i><Icon /></i><span>{focus?.name.toUpperCase()} · {title.toUpperCase()}</span><strong>{fmt(current, indicator.kind, indicator.kind === "change")}</strong><b className={gap === null ? "" : gap >= 0 ? "positive" : "negative"}>{gap === null ? "Sin comparación" : `${fmt(gap, "points", true)} vs mediana`}</b><small>Mediana de otras compañías: {fmt(peer, indicator.kind, indicator.kind === "change")}</small></article>)}</div>
    <Section label="BENCHMARK NACIONAL" title="Comparativo financiero por compañía" aside={`${activePeriod} · ${scope} · MM$ CLP`}><div className="benchmark-matrix-wrap"><table className="benchmark-matrix"><thead><tr><th rowSpan={2} scope="col">Indicador financiero</th>{visible.map((company) => <th key={company.name} colSpan={2} scope="colgroup" className={company.name === "FORUS" ? "forus" : ""}>{company.name}</th>)}</tr><tr>{visible.flatMap((company) => [<th key={`${company.name}-prior`} scope="col">Año anterior</th>, <th key={`${company.name}-current`} scope="col">{activePeriod}</th>])}</tr></thead><tbody>{indicators.map((indicator) => <tr key={indicator.label} className={indicator.group ? "group" : ""}><th scope="row">{indicator.label}</th>{visible.flatMap((company) => { const item = valueFor(company, indicator); return [<td key={`${company.name}-${indicator.label}-prior`}>{fmt(item.previous, indicator.kind)}</td>, <td key={`${company.name}-${indicator.label}-current`} className={company.name === "FORUS" ? "forus" : ""}>{fmt(item.current, indicator.kind, indicator.kind === "change" || indicator.kind === "points")}</td>]; })}</tr>)}</tbody></table></div><p className="benchmark-data-note">N/D: dato no disponible. A/A compara el período actual con el anterior; pp indica puntos porcentuales. Cifras según la fuente, sin imputar valores.</p></Section>
    <Section label="INFORME EJECUTIVO" title={`${focus?.name} frente al mercado`} aside={`${activePeriod} · ${scope}`}><div className="benchmark-executive"><p className="benchmark-executive-lead">Síntesis para alta gerencia basada en los filtros activos.</p>{executive.map((line) => <p key={line}>{line}</p>)}<small>Comparación con mediana de compañías con dato disponible; los importes son MM$ CLP.</small></div></Section>
    <Section label="VENTAS DEL NEGOCIO" title="Ingresos · actual versus año anterior" aside={`${activePeriod} · ${scope}`}><div className="company-comparison-list">{visible.map((company) => { const item = metric(company, "Ingresos"); return <div key={company.name}><div className="company-name"><CompanyLogo name={company.name} /><b>{company.name}</b></div><div className="dual-bars"><i><em style={{ width: `${(item.current ?? 0) / maxRevenue * 100}%` }} /></i><i><em style={{ width: `${(item.previous ?? 0) / maxRevenue * 100}%` }} /></i></div><div><strong>{fmt(item.current, "money")} MM$</strong><small>{fmt(item.previous, "money")} MM$ anterior</small><b className={(change(item.current, item.previous) ?? 0) < 0 ? "negative" : "positive"}>{fmt(change(item.current, item.previous), "change", true)}</b></div></div>; })}</div></Section>
    <Section label={`EVALUACIÓN PONDERADA · ${scope.toUpperCase()}`} title="Ranking financiero final" aside="PUNTAJE SOBRE 100"><details className="ranking-method"><summary>Ver metodología y ponderaciones</summary><p>Modelo por percentiles entre las compañías disponibles. Un valor mayor recibe más puntos, excepto GAV / venta. Los datos faltantes aportan cero puntos sin redistribuir pesos; la cobertura muestra el peso disponible.</p><div>{rankingIndicators.map((indicator) => <span key={indicator.label}>{indicator.label}: <b>{indicator.weight}%</b>{indicator.lower ? " · menor es mejor" : ""}</span>)}</div></details><div className="market-table-wrap"><table><thead><tr><th>POSICIÓN</th><th>COMPAÑÍA</th><th>PUNTAJE / 100</th><th>COBERTURA</th><th>APORTE POR INDICADOR</th></tr></thead><tbody>{ranking.map((entry) => <tr key={entry.company.name}><td>#{entry.position}</td><td><span className="table-company"><CompanyLogo name={entry.company.name} /><b>{entry.company.name}</b></span></td><td><strong>{fmtNumber(entry.score, 1)} puntos</strong><div className="score-track"><i style={{ width: `${entry.score}%` }} /></div></td><td>{entry.coverage}%{entry.coverage < 100 ? " · incompleto" : ""}</td><td><details><summary>Desglose</summary>{entry.parts.map((part) => <p key={part.label}>{part.label}: <b>{fmtNumber(part.points, 1)} / {part.weight}</b></p>)}</details></td></tr>)}</tbody></table></div></Section>
  </section>;
}
function Section({ label, title, aside, children }: { label: string; title: string; aside: string; children: React.ReactNode }) {
  return <section className="benchmark-section"><header><div><label>{label}</label><h2>{title}</h2></div><span>{aside}</span></header>{children}</section>;
}
