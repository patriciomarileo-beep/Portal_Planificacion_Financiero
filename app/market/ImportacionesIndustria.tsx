"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { aggregateImportRows } from "./imports-data";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Boxes, ChevronDown, CircleDollarSign, Download, Gauge, LayoutDashboard, Percent, RefreshCw, Search, Tags, UsersRound } from "lucide-react";

type Period = "ANUAL" | "H1" | "H2" | "Q1" | "Q2" | "Q3" | "Q4" | "MES";
type DataRow = Record<string, string | number | null>;
type Options = { years: number[]; classes: string[]; importers: string[]; brands: string[]; segments: string[]; units?: string[] };
type AnalysisView = "summary" | "importer" | "brand" | "segments" | "footwear" | "footwear-imports" | "apparel" | "apparel-imports" | "categories" | "origins";
type Payload = { source: string; unit?: string; quantityLabel?: string; coverage?: { fromYear: number; latestPeriod: number }; categoryAnalysis?: DataRow[]; originAnalysis?: DataRow[]; options: Options; overview: DataRow; comparison: DataRow; trend: DataRow[]; segments: DataRow[]; importers: DataRow[]; breakdown: DataRow[]; importerAnalysis: DataRow[]; brandAnalysis: DataRow[]; segmentAnalysis: DataRow[]; importerClass: DataRow[]; classMonth: DataRow[]; error?: string };
const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const number = (value: unknown) => Number(value || 0);
const formatNumber = (value: unknown, digits = 0) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: digits }).format(number(value));
const formatUsd = (value: unknown, digits = 0) => `US$ ${formatNumber(value, digits)}`;
const formatPercent = (value: unknown) => `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(number(value) * 100)}%`;
const formatThousands = (value: unknown) => formatNumber(number(value) / 1000);
const formatUsdThousands = (value: unknown) => `US$ ${formatThousands(value)}`;
const isOther = (value: unknown) => /^(OTROS?|OTRAS?|SIN CLASIFICACI[ÓO]N|NO INFORMADO)$/i.test(String(value).trim());
const othersLast = (a: string, b: string, value: (item: string) => number) => Number(isOther(a)) - Number(isOther(b)) || value(b) - value(a) || a.localeCompare(b, "es");

function MultiFilter<T extends string | number>({ label, values, selected, onChange, searchable = false }: { label: string; values: T[]; selected: T[]; onChange: (values: T[]) => void; searchable?: boolean }) {
  const [search, setSearch] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(100);
  const toggle = (value: T) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  const summary = selected.length === 0 || selected.length === values.length ? "Todas" : selected.length === 1 ? String(selected[0]) : `${selected.length} seleccionadas`;
  const visibleValues = searchable ? values.filter((value) => String(value).toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"))) : values;
  return <label className="imports-multi"><span>{label}</span><details data-dropdown name="portal-dropdown" onToggle={(event) => { if (!(event.currentTarget as HTMLDetailsElement).open) { setSearch(""); setVisibleLimit(100); } }}><summary>{summary}<ChevronDown /></summary><div>
    {searchable && <label className="imports-filter-search"><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleLimit(100); }} placeholder={`Buscar ${label.toLowerCase()}`} autoFocus /></label>}
    <div className="imports-filter-actions"><button type="button" className={selected.length === values.length ? "active" : ""} onClick={() => onChange([...values])}>Seleccionar todo</button><button type="button" className={selected.length === 0 ? "active" : ""} onClick={() => onChange([])}>Restablecer</button></div>
    {visibleValues.slice(0, visibleLimit).map((value) => <label key={String(value)}><input type="checkbox" checked={selected.includes(value)} onChange={() => toggle(value)} />{String(value)}</label>)}
    {visibleValues.length > visibleLimit && <div className="imports-filter-actions"><button type="button" onClick={() => setVisibleLimit(limit => limit + 100)}>Mostrar más ({visibleLimit} de {visibleValues.length})</button></div>}
    {searchable && visibleValues.length === 0 && <small className="imports-filter-empty">Sin coincidencias</small>}
  </div></details></label>;
}

function FinancialMatrix({ title, rows, years, metric, quantityLabel = "UNIDADES" }: { title: string; rows: DataRow[]; years: number[]; metric: "cantidad" | "us_fob"; quantityLabel?: string }) {
  const matrix = useMemo(() => aggregateImportRows(rows), [rows]);
  const sourceItems = matrix.items;
  const valueFor = (item: string, year: number) => matrix.valueFor(item, year, metric);
  const latestYear = years.includes(2026) ? 2026 : years.at(-1) ?? 0;
  const items = title === "Mes" ? sourceItems.sort((a, b) => matrix.valueFor(b, latestYear, "us_fob") - matrix.valueFor(a, latestYear, "us_fob")) : sourceItems;
  const totalFor = (year: number) => matrix.totalFor(year, metric);
  const pairs = years.slice(1).map((year, index) => ({ current: year, previous: years[index] }));
  const change = (current: number, previous: number) => previous ? current / previous - 1 : null;
  const variationCell = (current: number, previous: number, key: string) => { const value = change(current, previous); return <td key={key} className={value !== null && value < 0 ? "negative" : "positive"}>{value === null ? "—" : formatPercent(value)}</td>; };
  return <article className="imports-matrix"><h3>{metric === "cantidad" ? `${quantityLabel} · M` : "US$ FOB"}</h3><div><table><thead><tr><th>{title}</th>{years.map((year) => <th key={year}>{year}</th>)}{pairs.map((pair) => <th key={`${pair.current}/${pair.previous}`}>VAR {String(pair.current).slice(-2)}/{String(pair.previous).slice(-2)}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item}><td>{item}</td>{years.map((year) => <td key={year}>{formatThousands(valueFor(item, year))}</td>)}{pairs.map((pair) => variationCell(valueFor(item, pair.current), valueFor(item, pair.previous), `${pair.current}/${pair.previous}`))}</tr>)}<tr className="total"><td>Total</td>{years.map((year) => <td key={year}>{formatThousands(totalFor(year))}</td>)}{pairs.map((pair) => variationCell(totalFor(pair.current), totalFor(pair.previous), `${pair.current}/${pair.previous}`))}</tr></tbody></table></div></article>;
}

function EntityAnalysisTable({ title, rows, years, quantityLabel = "UNIDADES", pageSize }: { title: string; rows: DataRow[]; years: number[]; quantityLabel?: string; pageSize?: number }) {
  const matrix = useMemo(() => aggregateImportRows(rows), [rows]);
  const { valueFor, totalFor } = matrix;
  const items = [...matrix.items];
  const [page, setPage] = useState(0);
  const latestYear = years.includes(2026) ? 2026 : years.at(-1) ?? 0;
  const orderedItems = items.sort((a, b) => othersLast(a, b, (item) => valueFor(item, latestYear, "us_fob")));
  const pageCount = pageSize ? Math.max(1, Math.ceil(items.length / pageSize)) : 1;
  const currentPage = Math.min(page, pageCount - 1);
  const displayedItems = pageSize ? orderedItems.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : orderedItems;
  const pagination = pageSize && pageCount > 1 ? <div className="imports-table-pagination"><span>Página {currentPage + 1} de {pageCount} · {items.length} registros</span><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</button><button type="button" disabled={currentPage + 1 === pageCount} onClick={() => setPage(currentPage + 1)}>Siguiente</button></div> : null;
  const entityLabel = title === "Importador Resumen" ? "IMPORTADOR" : title === "Tipos por categoría" ? "TIPO · CATEGORÍA" : title === "Categorías" ? "CATEGORÍA" : title === "País de origen" ? "PAÍS DE ORIGEN" : "MARCA";
  const pair = years.length > 1 ? { previous: years.at(-2)!, current: years.at(-1)! } : null;
  const pairs = years.slice(1).map((current, index) => ({ previous: years[index], current }));
  const variation = (current: number, previous: number) => previous ? current / previous - 1 : null;
  if (title === "Marca Resumen") return <article className="imports-analysis-table brand-summary-table"><header><div><label>ANÁLISIS COMPETITIVO</label><h2>{title}</h2></div><span>{quantityLabel} EN M · FOB EN MUS$</span></header>{pagination}<div><table><thead><tr><th aria-hidden="true"></th><th colSpan={years.length * 2}>{quantityLabel}</th><th colSpan={years.length + pairs.length}>VALORIZADO US$ FOB</th></tr><tr><th>MARCA</th>{years.flatMap((year) => [<th key={`u-${year}`}>{year}</th>,<th key={`up-${year}`}>%</th>])}{years.map((year)=><th key={`f-${year}`}>{year}</th>)}{pairs.map(({previous,current})=><th key={`fv-${current}`}>VAR {String(current).slice(-2)}/{String(previous).slice(-2)}</th>)}</tr></thead><tbody>{displayedItems.map((item)=><tr key={item}><td>{item}</td>{years.flatMap((year)=>[<td key={`u-${year}`}>{formatThousands(valueFor(item,year,"cantidad"))}</td>,<td key={`up-${year}`}>{new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(totalFor(year,"cantidad")?valueFor(item,year,"cantidad")/totalFor(year,"cantidad")*100:0)}%</td>])}{years.map((year)=><td key={`f-${year}`}>{formatThousands(valueFor(item,year,"us_fob"))}</td>)}{pairs.map(({previous,current})=>{const v=variation(valueFor(item,current,"us_fob"),valueFor(item,previous,"us_fob"));return <td key={`fv-${current}`} className={v!==null&&v<0?"negative":"positive"}>{v===null?"—":formatPercent(v)}</td>;})}</tr>)}<tr className="total"><td>Total</td>{years.flatMap((year)=>[<td key={`tu-${year}`}>{formatThousands(totalFor(year,"cantidad"))}</td>,<td key={`tup-${year}`}>100%</td>])}{years.map((year)=><td key={`tf-${year}`}>{formatThousands(totalFor(year,"us_fob"))}</td>)}{pairs.map(({previous,current})=><td key={`tfv-${current}`}>{formatPercent(variation(totalFor(current,"us_fob"),totalFor(previous,"us_fob"))??0)}</td>)}</tr></tbody></table></div></article>;
  return <article className="imports-analysis-table"><header><div><label>ANÁLISIS COMPETITIVO</label><h2>{title}</h2></div><span>{quantityLabel} EN M · FOB EN MUS$</span></header>{pagination}<div><table><thead><tr><th rowSpan={2}>{entityLabel}</th><th colSpan={years.length * 2 + (pair ? 1 : 0)}>{quantityLabel}</th><th colSpan={years.length * 2 + (pair ? 1 : 0)}>VALORIZADO US$ FOB</th></tr><tr>{years.flatMap((year) => [<th key={`u-${year}`}>{year}</th>, <th key={`up-${year}`}>%</th>])}{pair && <th>VAR {String(pair.current).slice(-2)}/{String(pair.previous).slice(-2)}</th>}{years.flatMap((year) => [<th key={`f-${year}`}>{year}</th>, <th key={`fp-${year}`}>%</th>])}{pair && <th>VAR {String(pair.current).slice(-2)}/{String(pair.previous).slice(-2)}</th>}</tr></thead><tbody>{displayedItems.map((item) => { const unitVariation = pair ? variation(valueFor(item, pair.current, "cantidad"), valueFor(item, pair.previous, "cantidad")) : null; const fobVariation = pair ? variation(valueFor(item, pair.current, "us_fob"), valueFor(item, pair.previous, "us_fob")) : null; return <tr key={item}><td>{item}</td>{years.flatMap((year) => [<td key={`u-${year}`}>{formatThousands(valueFor(item, year, "cantidad"))}</td>, <td key={`up-${year}`}>{formatPercent(totalFor(year, "cantidad") ? valueFor(item, year, "cantidad") / totalFor(year, "cantidad") : 0)}</td>])}{pair && <td className={unitVariation !== null && unitVariation < 0 ? "negative" : "positive"}>{unitVariation === null ? "—" : formatPercent(unitVariation)}</td>}{years.flatMap((year) => [<td key={`f-${year}`}>{formatThousands(valueFor(item, year, "us_fob"))}</td>, <td key={`fp-${year}`}>{formatPercent(totalFor(year, "us_fob") ? valueFor(item, year, "us_fob") / totalFor(year, "us_fob") : 0)}</td>])}{pair && <td className={fobVariation !== null && fobVariation < 0 ? "negative" : "positive"}>{fobVariation === null ? "—" : formatPercent(fobVariation)}</td>}</tr>; })}<tr className="total"><td>Total</td>{years.flatMap((year) => [<td key={`tu-${year}`}>{formatThousands(totalFor(year, "cantidad"))}</td>, <td key={`tup-${year}`}>100%</td>])}{pair && <td>{formatPercent(variation(totalFor(pair.current, "cantidad"), totalFor(pair.previous, "cantidad")) ?? 0)}</td>}{years.flatMap((year) => [<td key={`tf-${year}`}>{formatThousands(totalFor(year, "us_fob"))}</td>, <td key={`tfp-${year}`}>100%</td>])}{pair && <td>{formatPercent(variation(totalFor(pair.current, "us_fob"), totalFor(pair.previous, "us_fob")) ?? 0)}</td>}</tr></tbody></table></div></article>;
}

function ComparisonDelta({ value, text }: { value: number | null; text: string }) {
  return <small className={value !== null && value < 0 ? "negative" : "positive"}>{value === null ? "Sin base comparable" : `${formatPercent(value)} ${text}`}</small>;
}

function ComparisonStrip({ comparison, periodLabel }: { comparison: DataRow; periodLabel: string }) {
  const currentYear = number(comparison.current_year);
  const previousYear = number(comparison.previous_year);
  const selected = Boolean(comparison.hasEntitySelection);
  const entityLabel = String(comparison.entityLabel || "FORUS S.A.");
  const change = (current: unknown, previous: unknown) => number(previous) ? number(current) / number(previous) - 1 : null;
  const unitVsForus = number(comparison.forus_current_cantidad) ? number(comparison.entity_current_cantidad) / number(comparison.forus_current_cantidad) - 1 : null;
  const fobVsForus = number(comparison.forus_current_fob) ? number(comparison.entity_current_fob) / number(comparison.forus_current_fob) - 1 : null;
  const forusUnitChange = change(comparison.forus_current_cantidad, comparison.forus_previous_cantidad);
  const forusFobChange = change(comparison.forus_current_fob, comparison.forus_previous_fob);
  const entityUnitChange = change(comparison.entity_current_cantidad, comparison.entity_previous_cantidad);
  const entityFobChange = change(comparison.entity_current_fob, comparison.entity_previous_fob);
  return <div className="imports-kpis comparison-strip">
    {selected ? <>
      <article><i><Boxes /></i><span>{entityLabel} · UNIDADES {currentYear}</span><strong>{formatThousands(comparison.entity_current_cantidad)}</strong><ComparisonDelta value={unitVsForus} text="vs Forus" /><em>{entityUnitChange === null ? "" : `${formatPercent(entityUnitChange)} vs ${previousYear}`}</em></article>
      <article><i><CircleDollarSign /></i><span>{entityLabel} · FOB {currentYear}</span><strong>{formatUsdThousands(comparison.entity_current_fob)}</strong><ComparisonDelta value={fobVsForus} text="vs Forus" /><em>{entityFobChange === null ? "" : `${formatPercent(entityFobChange)} vs ${previousYear}`}</em></article>
    </> : <>
      <article><i><Boxes /></i><span>FORUS · UNIDADES {currentYear}</span><strong>{formatThousands(comparison.forus_current_cantidad)}</strong><ComparisonDelta value={forusUnitChange} text={`vs ${previousYear}`} /></article>
      <article><i><CircleDollarSign /></i><span>FORUS · FOB {currentYear}</span><strong>{formatUsdThousands(comparison.forus_current_fob)}</strong><ComparisonDelta value={forusFobChange} text={`vs ${previousYear}`} /></article>
    </>}
    {selected ? <><article><i><Boxes /></i><span>FORUS · UNIDADES {currentYear}</span><strong>{formatThousands(comparison.forus_current_cantidad)}</strong><ComparisonDelta value={forusUnitChange} text={`vs ${previousYear}`} /></article><article><i><CircleDollarSign /></i><span>FORUS · FOB {currentYear}</span><strong>{formatUsdThousands(comparison.forus_current_fob)}</strong><ComparisonDelta value={forusFobChange} text={`vs ${previousYear}`} /><em>{periodLabel}</em></article></> : <><article><i><Gauge /></i><span>FORUS · FOB UNITARIO {currentYear}</span><strong>{formatUsd(number(comparison.forus_current_fob) / Math.max(number(comparison.forus_current_cantidad), 1), 2)}</strong><small>FOB total / unidades</small></article><article><i><Percent /></i><span>PARTICIPACIÓN FORUS {currentYear}</span><strong>{formatPercent(number(comparison.market_current_fob) ? number(comparison.forus_current_fob) / number(comparison.market_current_fob) : 0)}</strong><small>Sobre mercado visible · {periodLabel}</small></article></>}
  </div>;
}

function CosmeticsSummary({ overview, comparison, quantityLabel, periodLabel }: { overview: DataRow; comparison: DataRow; quantityLabel: string; periodLabel: string }) {
  const cutoff = number(comparison.through_month);
  const comparisonLabel = cutoff > 0 && cutoff < 12 ? `${periodLabel} · corte ${months[cutoff - 1]}` : periodLabel;
  const previous = comparison.previous_fob;
  const current = comparison.current_fob;
  const change = previous != null && current != null && number(previous) !== 0 ? number(current) / number(previous) - 1 : null;
  return <div className="imports-kpis comparison-strip">
    <article><i><Boxes /></i><span>{quantityLabel} · M</span><strong>{formatThousands(overview.cantidad)}</strong><small>Cantidad importada · {periodLabel}</small></article>
    <article><i><CircleDollarSign /></i><span>VALORIZACIÓN US$ FOB</span><strong>{formatUsdThousands(overview.us_fob)}</strong><small>Valores en miles de US$</small></article>
    <article><i><Gauge /></i><span>FOB POR {quantityLabel === "KG NETOS" ? "KG NETO" : quantityLabel}</span><strong>{overview.fob_unitario == null ? "—" : formatUsd(overview.fob_unitario, 2)}</strong><small>FOB total / cantidad importada</small></article>
    <article><i><Percent /></i><span>VARIACIÓN FOB {comparison.current_year} / {comparison.previous_year}</span><strong>{change === null ? "—" : formatPercent(change)}</strong><small>{change === null ? "Sin base comparable" : `Período ${comparisonLabel}`}</small></article>
  </div>;
}

export default function ImportacionesIndustria({ variant = "retail" }: { variant?: "retail" | "cosmetics" }) {
  const cosmetics = variant === "cosmetics";
  const endpoint = cosmetics ? "/api/importaciones-cosmeticos" : "/api/importaciones-industria";
  const [unit, setUnit] = useState("");
  const hasLoaded = useRef(false);
  const availableOptions = useRef<Options | null>(null);
  const [period, setPeriod] = useState<Period>("ANUAL");
  const [month, setMonth] = useState(1);
  const [years, setYears] = useState<number[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [importers, setImporters] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  const [analysisView, setAnalysisView] = useState<AnalysisView>("summary");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [loadedFilters, setLoadedFilters] = useState("");
  const filterKey = JSON.stringify([variant, unit, period, month, years, classes, importers, brands, segments]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true); setError("");
      const params = new URLSearchParams({ period, month: String(month), queryVersion: "period-v3" });
      if (unit) params.set("unit", unit);
      if (years.length && years.length !== availableOptions.current?.years.length) params.set("years", years.join("|"));
      if (classes.length && classes.length !== availableOptions.current?.classes.length) params.set("classes", classes.join("|"));
      if (importers.length && importers.length !== availableOptions.current?.importers.length) params.set("importers", importers.join("|"));
      if (brands.length && brands.length !== availableOptions.current?.brands.length) params.set("brands", brands.join("|"));
      if (segments.length && segments.length !== availableOptions.current?.segments.length) params.set("segments", segments.join("|"));
      fetch(`${endpoint}?${params}`, { signal: controller.signal, cache: "no-store" }).then(async (response) => { const payload = await response.json() as Payload; if (!response.ok) throw new Error(payload.error || "No fue posible consultar la fuente."); return payload; }).then((payload) => { setData(payload); setLoadedFilters(filterKey); availableOptions.current = payload.options; hasLoaded.current = true; }).catch((reason) => { if (reason.name !== "AbortError") setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, hasLoaded.current ? 350 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [endpoint, unit, period, month, years, classes, importers, brands, segments, refreshToken, filterKey]);

  const visibleYears = useMemo(() => (years.length ? years : data?.options.years ?? []).slice().sort((a, b) => a - b), [years, data]);
  const chart = useMemo(() => (data?.trend ?? []).map((row) => ({ label: `${row.anio} ${months[number(row.mes) - 1] ?? row.mes}`, cantidad: number(row.cantidad), unitario: number(row.fob_unitario) })), [data]);
  const importerRanking = useMemo(() => { const rows = data?.importers ?? [], regular = rows.filter((row) => !isOther(row.importador)).slice(0, 9), other = rows.find((row) => isOther(row.importador)); return other ? [...regular, other] : rows.slice(0, 10); }, [data]);
  const periodLabel = period === "ANUAL" ? "Anual" : period === "MES" ? months[month - 1] : period;
  const quantityLabel = cosmetics ? data?.quantityLabel || "KG NETOS" : "UNIDADES";
  const dimensions = cosmetics
    ? [{ key: "TRIMESTRE", title: "Trimestre" }, { key: "CLASE", title: "Categoría" }, { key: "ORIGEN", title: "País de origen" }]
    : [{ key: "TRIMESTRE", title: "Trimestre" }, { key: "CLASE", title: "Clase" }, { key: "GENERO", title: "Género" }];
  const periodRows = useCallback((rows: DataRow[]) => rows.filter((row) => {
    const rowMonth = number(row.mes);
    if (!rowMonth) return true;
    if (period === "H1") return rowMonth <= 6;
    if (period === "H2") return rowMonth >= 7;
    if (period.startsWith("Q")) return Math.floor((rowMonth - 1) / 3) + 1 === Number(period.slice(1));
    if (period === "MES") return rowMonth === month;
    return true;
  }), [period, month]);
  const breakdownRows = (dimension: string) => data?.breakdown.filter((row) => {
    if (row.dimension !== dimension) return false;
    const rowMonth = number(row.mes);
    if (period === "H1") return rowMonth >= 1 && rowMonth <= 6;
    if (period === "H2") return rowMonth >= 7 && rowMonth <= 12;
    if (period.startsWith("Q")) return Math.floor((rowMonth - 1) / 3) + 1 === Number(period.slice(1));
    if (period === "MES") return rowMonth === month;
    return true;
  }) ?? [];
  const segmentRows = useMemo(() => periodRows(data?.segmentAnalysis ?? []).map((row) => ({ ...row, item: `${row.item} · ${row.clase}` })), [data, periodRows]);
  const classRows = (name: string) => periodRows((data?.classMonth ?? []).filter((row) => row.clase === name)).map((row) => ({ ...row, item: months[number(row.item) - 1] ?? row.item }));
  const importerClassRows = (name: string) => (data?.importerClass ?? []).filter((row) => row.clase === name);
  const exportExcel = async () => {
    if (!data) return;
    const XLSX = await import("xlsx");
    const book = XLSX.utils.book_new();
    const appendMatrix = (sheetName: string, title: string, rows: DataRow[]) => {
      const matrix = aggregateImportRows(rows);
      const items = matrix.items;
      const value = matrix.valueFor;
      const totals = Object.fromEntries(visibleYears.map((year) => [year, { cantidad: matrix.totalFor(year, "cantidad"), us_fob: matrix.totalFor(year, "us_fob") }])) as Record<number, { cantidad: number; us_fob: number }>;
      const latest = visibleYears.at(-1) ?? 0, previous = visibleYears.at(-2) ?? 0, metricHeaders = visibleYears.flatMap((year) => [year, "%"]);
      const ordered = items.sort((a, b) => othersLast(a, b, (item) => value(item, latest, "us_fob")));
      const header = [title, ...metricHeaders, `VAR ${String(latest).slice(-2)}/${String(previous).slice(-2)}`, ...metricHeaders, `VAR ${String(latest).slice(-2)}/${String(previous).slice(-2)}`];
      const output: (string | number)[][] = [[title, quantityLabel, ...Array(metricHeaders.length).fill(""), "VALORIZADO US$ FOB", ...Array(metricHeaders.length).fill("")], header];
      ordered.forEach((item) => output.push([item, ...visibleYears.flatMap((year) => [value(item, year, "cantidad"), totals[year].cantidad ? value(item, year, "cantidad") / totals[year].cantidad : 0]), previous && value(item, previous, "cantidad") ? value(item, latest, "cantidad") / value(item, previous, "cantidad") - 1 : 0, ...visibleYears.flatMap((year) => [value(item, year, "us_fob"), totals[year].us_fob ? value(item, year, "us_fob") / totals[year].us_fob : 0]), previous && value(item, previous, "us_fob") ? value(item, latest, "us_fob") / value(item, previous, "us_fob") - 1 : 0]));
      output.push(["TOTAL", ...visibleYears.flatMap((year) => [totals[year].cantidad, 1]), previous && totals[previous].cantidad ? totals[latest].cantidad / totals[previous].cantidad - 1 : 0, ...visibleYears.flatMap((year) => [totals[year].us_fob, 1]), previous && totals[previous].us_fob ? totals[latest].us_fob / totals[previous].us_fob - 1 : 0]);
      const sheet = XLSX.utils.aoa_to_sheet(output), unitEnd = metricHeaders.length + 1, fobStart = unitEnd + 1, fobEnd = fobStart + metricHeaders.length;
      sheet["!merges"] = [{ s: { r: 0, c: 1 }, e: { r: 0, c: unitEnd } }, { s: { r: 0, c: fobStart }, e: { r: 0, c: fobEnd } }];
      sheet["!cols"] = [{ wch: 34 }, ...Array(header.length - 1).fill({ wch: 13 })];
      const percentColumns = [...visibleYears.flatMap((_, index) => [2 + index * 2, fobStart + 1 + index * 2]), unitEnd, fobEnd];
      for (let r = 2; r < output.length; r++) for (const c of percentColumns) { const cell = sheet[XLSX.utils.encode_cell({ r, c })]; if (cell) cell.z = "0.0%"; }
      XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
    };
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet([{ Periodo: periodLabel, Años: visibleYears.join(", "), [cosmetics ? "Categoría" : "Clase"]: classes.join(", ") || "Todas", Importador: importers.join(", ") || "Todos", Marca: brands.join(", ") || "Todas", [cosmetics ? "Tipo" : "Segmento"]: segments.join(", ") || "Todos", ...(cosmetics ? { Unidad: data.unit } : {}) }]), "Filtros");
    dimensions.forEach((dimension) => appendMatrix(`Resumen ${dimension.title}`, dimension.title, breakdownRows(dimension.key)));
    appendMatrix("Importador", "IMPORTADOR", periodRows(data.importerAnalysis));
    appendMatrix("Marca Resumen", "MARCA", periodRows(data.brandAnalysis));
    appendMatrix(cosmetics ? "Tipo por Categoría" : "Segmento por Clase", cosmetics ? "TIPO · CATEGORÍA" : "SEGMENTO · CLASE", segmentRows);
    if (cosmetics) {
      appendMatrix("Categorías", "CATEGORÍA", periodRows(data.categoryAnalysis ?? []));
      appendMatrix("País de origen", "PAÍS", periodRows(data.originAnalysis ?? []));
    } else {
      appendMatrix("Calzado", "MES", classRows("CALZADO"));
      appendMatrix("Importación Calzado", "IMPORTADOR", periodRows(importerClassRows("CALZADO")));
      appendMatrix("Vestuario", "MES", classRows("VESTUARIO"));
      appendMatrix("Importación Vestuario", "IMPORTADOR", periodRows(importerClassRows("VESTUARIO")));
    }
    XLSX.writeFile(book, `Importaciones_${cosmetics ? "Cosmeticos" : "Industria"}_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return <section className="imports-page">
    <div className="imports-title-row"><div><label>MERCADO · COMERCIO EXTERIOR</label><h1>{cosmetics ? "Importaciones Cosméticos" : "Importaciones Industria Retail"}</h1><p>{cosmetics ? "Kilogramos netos, valorización FOB y participación por categoría, marca e importador." : "Unidades, valorización FOB y participación competitiva desde 2023."}</p></div><div className="imports-title-actions"><button type="button" className="export-button" onClick={exportExcel} disabled={!data || loading || Boolean(error) || loadedFilters !== filterKey}><Download /> DESCARGAR EXCEL</button><span className="imports-source"><b>FUENTE BIGQUERY</b><small>Actualización directa · {cosmetics ? "Kilogramos netos" : "Pares y unidades"}</small></span></div></div>
    <div className="imports-workbench"><aside className="imports-sheets"><label>HOJAS DE ANÁLISIS</label><button type="button" className={analysisView === "summary" ? "active" : ""} onClick={() => setAnalysisView("summary")}><LayoutDashboard /><span>Resumen</span></button><button type="button" className={analysisView === "importer" ? "active" : ""} onClick={() => setAnalysisView("importer")}><UsersRound /><span>Importador</span></button><button type="button" className={analysisView === "brand" ? "active" : ""} onClick={() => setAnalysisView("brand")}><Tags /><span>Marca Resumen</span></button>{(cosmetics ? [["segments","Tipos por categoría"],["categories","Categorías"],["origins","País de origen"]] : [["segments","Segmentos"],["footwear","Calzado"],["footwear-imports","Importación Calzado"],["apparel","Vestuario"],["apparel-imports","Importación Vestuario"]]).map(([key,label])=><button type="button" key={key} className={analysisView===key?"active":""} onClick={()=>setAnalysisView(key as AnalysisView)}><Tags/><span>{label}</span></button>)}</aside><div className="imports-view">
    <section className="imports-controlbar"><MultiFilter label="AÑO" values={data?.options.years ?? []} selected={years} onChange={setYears} /><div><span>PERÍODO</span><div className="imports-periods quarter-filter">{(["ANUAL", "H1", "H2", "Q1", "Q2", "Q3", "Q4", "MES"] as Period[]).map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div></div>{period === "MES" && <label className="imports-single"><span>MES</span><select value={month} onChange={(event) => setMonth(Number(event.target.value))}>{months.map((item, index) => <option value={index + 1} key={item}>{item}</option>)}</select></label>}{cosmetics && <label className="imports-single"><span>UNIDAD DE MEDIDA</span><select value={unit || data?.unit || ""} onChange={(event) => setUnit(event.target.value)}>{(data?.options.units ?? []).map(value => <option key={value} value={value}>{value}</option>)}</select></label>}<MultiFilter label={cosmetics ? "CATEGORÍA" : "CLASE"} values={data?.options.classes ?? []} selected={classes} onChange={setClasses} /><MultiFilter label={cosmetics ? "IMPORTADOR" : "IMPORTADOR HOMOLOGADO"} values={data?.options.importers ?? []} selected={importers} onChange={setImporters} searchable={cosmetics} /><MultiFilter label={cosmetics ? "MARCA" : "MARCA HOMOLOGADA"} values={data?.options.brands ?? []} selected={brands} onChange={setBrands} searchable /><MultiFilter label={cosmetics ? "TIPO" : "SEGMENTO"} values={data?.options.segments ?? []} selected={segments} onChange={setSegments} searchable={cosmetics} /></section>
    {loading && !data ? <div className="imports-state"><RefreshCw className="spin" /><strong>Consultando BigQuery…</strong></div> : error && !data ? <div className="imports-state error"><strong>No se pudo cargar la fuente</strong><p>{error}</p><button type="button" className="export-button" onClick={() => setRefreshToken((value) => value + 1)}><RefreshCw /> REINTENTAR CONEXIÓN</button></div> : data && <>
      {loading && <div className="imports-updating"><RefreshCw className="spin" /> Actualizando filtros…</div>}
      {error && <p className="data-warning" role="alert">No se pudo actualizar el informe: {error} Se muestran los datos de la consulta anterior.</p>}
      {cosmetics && number(data.overview.rows_count) === 0 && <p className="data-warning" role="status">No hay registros para los filtros seleccionados.</p>}
      {cosmetics ? <CosmeticsSummary overview={data.overview} comparison={data.comparison} quantityLabel={quantityLabel} periodLabel={periodLabel} /> : <ComparisonStrip comparison={data.comparison} periodLabel={periodLabel} />}
      {analysisView === "summary" ? <><section className="imports-financial-matrices">{dimensions.map((dimension) => { const rows = breakdownRows(dimension.key); return <div className="imports-matrix-pair" key={dimension.key}><FinancialMatrix quantityLabel={quantityLabel} title={dimension.title} rows={rows} years={visibleYears} metric="cantidad" /><FinancialMatrix quantityLabel={quantityLabel} title={dimension.title} rows={rows} years={visibleYears} metric="us_fob" /></div>; })}</section>
      <div className="imports-grid"><article className="imports-panel imports-trend"><header><div><label>EVOLUCIÓN TEMPORAL</label><h2>{cosmetics ? "Kilogramos netos y FOB por kilogramo" : "Unidades y FOB unitario"}</h2></div><span>{periodLabel}</span></header><div className="imports-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chart} margin={{ top: 18, right: 20, left: 2, bottom: 0 }}><CartesianGrid stroke="#e8edf3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 10, fill: "#718198" }} /><YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#718198" }} tickFormatter={(value) => formatThousands(value)} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#718198" }} tickFormatter={(value) => `US$${formatNumber(value)}`} /><Tooltip formatter={(value, name) => name === "FOB unitario" ? formatUsd(value, 2) : `${formatThousands(value)} M`} /><Bar yAxisId="left" dataKey="cantidad" name={quantityLabel} fill="#142b72" radius={[2, 2, 0, 0]} /><Line yAxisId="right" dataKey="unitario" name="FOB unitario" stroke="#e06b2e" strokeWidth={2.2} dot={{ r: 2 }} /></ComposedChart></ResponsiveContainer></div></article><article className="imports-panel"><header><div><label>RANKING COMPETITIVO</label><h2>Importadores por US$ FOB</h2></div><span>TOP 10</span></header><div className="imports-rank">{importerRanking.map((row, index) => <div key={String(row.importador)} className={!cosmetics && row.importador === "FORUS S.A." ? "forus" : ""}><b>{String(index + 1).padStart(2, "0")}</b><span>{row.importador}<small>{formatPercent(row.participacion)} del mercado</small></span><strong>{formatUsdThousands(row.us_fob)}</strong></div>)}</div></article></div></> : analysisView === "importer" ? <EntityAnalysisTable pageSize={cosmetics ? 100 : undefined} quantityLabel={quantityLabel} title="Importador Resumen" rows={periodRows(data.importerAnalysis)} years={visibleYears} /> : analysisView === "brand" ? <EntityAnalysisTable pageSize={cosmetics ? 100 : undefined} quantityLabel={quantityLabel} title="Marca Resumen" rows={periodRows(data.brandAnalysis)} years={visibleYears} /> : analysisView === "segments" ? <EntityAnalysisTable pageSize={cosmetics ? 100 : undefined} quantityLabel={quantityLabel} title={cosmetics ? "Tipos por categoría" : "Segmentos"} rows={segmentRows} years={visibleYears} /> : analysisView === "categories" ? <EntityAnalysisTable pageSize={cosmetics ? 100 : undefined} quantityLabel={quantityLabel} title="Categorías" rows={periodRows(data.categoryAnalysis ?? [])} years={visibleYears} /> : analysisView === "origins" ? <EntityAnalysisTable pageSize={cosmetics ? 100 : undefined} quantityLabel={quantityLabel} title="País de origen" rows={periodRows(data.originAnalysis ?? [])} years={visibleYears} /> : analysisView === "footwear" ? <div className="imports-matrix-pair"><FinancialMatrix quantityLabel={quantityLabel} title="Mes" rows={classRows("CALZADO")} years={visibleYears} metric="cantidad"/><FinancialMatrix quantityLabel={quantityLabel} title="Mes" rows={classRows("CALZADO")} years={visibleYears} metric="us_fob"/></div> : analysisView === "footwear-imports" ? <EntityAnalysisTable pageSize={cosmetics ? 100 : undefined} quantityLabel={quantityLabel} title="Importación Calzado" rows={periodRows(importerClassRows("CALZADO"))} years={visibleYears}/> : analysisView === "apparel" ? <div className="imports-matrix-pair"><FinancialMatrix quantityLabel={quantityLabel} title="Mes" rows={classRows("VESTUARIO")} years={visibleYears} metric="cantidad"/><FinancialMatrix quantityLabel={quantityLabel} title="Mes" rows={classRows("VESTUARIO")} years={visibleYears} metric="us_fob"/></div> : <EntityAnalysisTable pageSize={cosmetics ? 100 : undefined} quantityLabel={quantityLabel} title="Importación Vestuario" rows={periodRows(importerClassRows("VESTUARIO"))} years={visibleYears}/>}
      <p className="imports-footnote">{cosmetics ? `Datos desde ${data.coverage?.fromYear ?? 2024}. Cantidades en miles de ${data.unit?.toLowerCase() ?? "kilogramos netos"}; valores FOB en miles de US$. Último período disponible: ${String(data.coverage?.latestPeriod ?? "").slice(4)}/${String(data.coverage?.latestPeriod ?? "").slice(0, 4)}. Las variaciones comparan el período seleccionado; el último año puede tener cobertura parcial.` : "Extracción limitada a años ≥ 2023. Los años 2019 y 2022 no participan en la consulta ni en las variaciones."}</p>
    </>}
    </div></div>
  </section>;
}
