"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Check,
  ChevronDown,
  CircleDollarSign,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
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
import {
  forecastScenarios,
  type ForecastScenario,
  type ProfitabilityForecastPayload,
  type ProfitabilityForecastRow,
} from "./profitability-types";

type Channel = "Ecommerce" | "Marketplace" | "Wholesale" | "Consolidado";
type Scenario = ForecastScenario;
type Period = "ANUAL" | "Q1" | "Q2" | "Q3" | "Q4" | "MES";
type MetricKey = "sales" | "margin" | "operatingCost" | "operatingResult" | "utility";
type RankingSortKey = "name" | "sales" | "salesAnnual" | "salesBudget" | "margin" | "marginRate" | "operatingResult" | "operatingAnnual" | "operatingBudget" | "utility" | "utilityAnnual" | "utilityBudget";
type SortDirection = "asc" | "desc";

type SourceRow = ProfitabilityForecastRow;

type Totals = Record<MetricKey, number>;

const scenarios: Scenario[] = [...forecastScenarios];
const periods: Period[] = ["ANUAL", "Q1", "Q2", "Q3", "Q4", "MES"];
const businessChannels = ["Brick&Life", "Ecommerce", "Wholesale", "Marketplace"] as const;
const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const metricRows: { key: MetricKey; label: string }[] = [
  { key: "sales", label: "Ventas" },
  { key: "margin", label: "Margen" },
  { key: "operatingCost", label: "Costo operacional" },
  { key: "operatingResult", label: "Resultado operacional" },
  { key: "utility", label: "Utilidad neta" },
];
const metricLabel = Object.fromEntries(metricRows.map(({ key, label }) => [key, label])) as Record<MetricKey, string>;
const rankingColumns: { key: RankingSortKey; label: string }[] = [
  { key: "name", label: "Marca" },
  { key: "sales", label: "Ventas" },
  { key: "salesAnnual", label: "Var. A.A." },
  { key: "salesBudget", label: "Var. ppto." },
  { key: "margin", label: "Margen" },
  { key: "marginRate", label: "Margen %" },
  { key: "operatingResult", label: "ROP" },
  { key: "operatingAnnual", label: "Var. A.A." },
  { key: "operatingBudget", label: "Var. ppto." },
  { key: "utility", label: "Utilidad neta" },
  { key: "utilityAnnual", label: "Var. A.A." },
  { key: "utilityBudget", label: "Var. ppto." },
];
const zeroTotals = (): Totals => ({ sales: 0, margin: 0, operatingCost: 0, operatingResult: 0, utility: 0 });
const scenarioLabel: Record<Scenario, string> = {
  "2025": "2025R",
  "2026E": "2026E",
  "2026P": "2026P",
  "2027P": "2027P",
};
const comparisonOf: Record<Scenario, Scenario | null> = {
  "2025": null,
  "2026E": "2025",
  "2026P": "2026E",
  "2027P": "2026E",
};

const sumRows = (rows: SourceRow[]): Totals => rows.reduce((total, row) => {
  total.sales += row.sales;
  total.margin += row.margin;
  total.operatingCost += row.operatingCost;
  total.operatingResult += row.operatingResult;
  total.utility += row.utility;
  return total;
}, zeroTotals());

const money = (value: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value);
const percent = (value: number) => `${new Intl.NumberFormat("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
const variation = (current: number, previous: number) => previous === 0 ? null : ((current / previous) - 1) * 100;

function Variation({ value }: { value: number | null }) {
  if (value === null) return <span className="channel-var neutral">Sin base comparable</span>;
  const positive = value >= 0;
  return <span className={`channel-var ${positive ? "positive" : "negative"}`}>
    {positive ? <TrendingUp /> : <TrendingDown />}{positive ? "+" : ""}{percent(value)} A.A.
  </span>;
}

function SearchableSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [optionQuery, setOptionQuery] = useState("");
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  const normalizedQuery = optionQuery.trim().toLocaleLowerCase("es");
  const visibleOptions = options.filter((option) =>
    option.label.toLocaleLowerCase("es").includes(normalizedQuery),
  );

  const select = (nextValue: T) => {
    onChange(nextValue);
    setOptionQuery("");
    if (detailsRef.current) detailsRef.current.open = false;
  };

  return <details ref={detailsRef} data-dropdown name="portal-dropdown" className={`chain-multiselect sales-margin-multiselect channel-filter-select ${className}`.trim()}>
    <summary><span>{label}<strong>{selectedLabel}</strong></span><ChevronDown /></summary>
    <div className="chain-options sales-margin-multiselect-options channel-searchable-options">
      <div className="sales-margin-option-search">
        <Search aria-hidden="true" />
        <input value={optionQuery} onChange={(event) => setOptionQuery(event.target.value)} placeholder={`Buscar ${label.toLocaleLowerCase("es")}`} aria-label={`Buscar ${label.toLocaleLowerCase("es")}`} />
      </div>
      {visibleOptions.map((option) => <button type="button" key={option.value} className={option.value === value ? "active" : ""} onClick={() => select(option.value)}>
        <span>{option.label}</span>{option.value === value && <Check aria-hidden="true" />}
      </button>)}
      {visibleOptions.length === 0 && <small className="sales-margin-option-empty">Sin coincidencias</small>}
    </div>
  </details>;
}

function SearchableMultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [optionQuery, setOptionQuery] = useState("");
  const normalizedQuery = optionQuery.trim().toLocaleLowerCase("es");
  const visibleOptions = options.filter((option) =>
    option.toLocaleLowerCase("es").includes(normalizedQuery),
  );
  const selectionLabel = selected.length === 0
    ? "TODAS"
    : selected.length === 1
      ? selected[0]
      : `${selected.length} MARCAS`;
  const toggle = (option: string) => onChange(
    selected.includes(option)
      ? selected.filter((value) => value !== option)
      : [...selected, option],
  );

  return <details data-dropdown name="portal-dropdown" className="chain-multiselect sales-margin-multiselect channel-filter-select brand-filter">
    <summary><span>{label}<strong>{selectionLabel}</strong></span><ChevronDown /></summary>
    <div className="chain-options sales-margin-multiselect-options channel-searchable-options">
      <div className="sales-margin-option-search">
        <Search aria-hidden="true" />
        <input value={optionQuery} onChange={(event) => setOptionQuery(event.target.value)} placeholder="Buscar marca" aria-label="Buscar marca" />
      </div>
      <button type="button" className={selected.length === 0 ? "active" : ""} onClick={() => onChange([])}><span>TODAS</span>{selected.length === 0 && <Check aria-hidden="true" />}</button>
      {visibleOptions.map((option) => <label key={option}>
        <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
        <span>{option}</span>
      </label>)}
      {visibleOptions.length === 0 && <small className="sales-margin-option-empty">Sin coincidencias</small>}
    </div>
  </details>;
}

export default function ChannelProfitability({
  channel,
  refreshKey = 0,
  onRefreshComplete,
}: {
  channel: Channel;
  refreshKey?: number;
  onRefreshComplete?: () => void;
}) {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [scenario, setScenario] = useState<Scenario>("2026E");
  const [period, setPeriod] = useState<Period>("ANUAL");
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedBrandsByChannel, setSelectedBrandsByChannel] = useState<Partial<Record<Channel, string[]>>>({});
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("sales");
  const [rankingSort, setRankingSort] = useState<{ key: RankingSortKey; direction: SortDirection }>({ key: "sales", direction: "desc" });

  useEffect(() => {
    const controller = new AbortController();
    const refreshParameter = refreshKey > 0 ? `?refresh=${refreshKey}` : "";
    void fetch(`/api/profitability-forecast${refreshParameter}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as ProfitabilityForecastPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error || "No fue posible consultar Rentabilidad Forecast.");
        if (!Array.isArray(payload.rows) || !payload.rows.length) throw new Error("BigQuery no devolvió registros para Rentabilidad Forecast.");
        if (!controller.signal.aborted) setRows(payload.rows);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "No fue posible consultar Rentabilidad Forecast.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          onRefreshComplete?.();
        }
      });
    return () => controller.abort();
  }, [onRefreshComplete, refreshKey, retryKey]);

  const matchesPeriod = useCallback((row: SourceRow) => period === "ANUAL" || (period === "MES" ? row.month === selectedMonth : row.quarter === period), [period, selectedMonth]);

  const brands = useMemo(() => [...new Set(rows.filter((row) => row.channel === channel && row.brand !== "Consolidado").map((row) => row.brand))].sort(), [rows, channel]);
  const selectedBrands = useMemo(() => (selectedBrandsByChannel[channel] ?? []).filter((brandName) => brands.includes(brandName)), [brands, channel, selectedBrandsByChannel]);
  const setSelectedBrands = useCallback((brandNames: string[]) => {
    setSelectedBrandsByChannel((currentSelection) => ({ ...currentSelection, [channel]: brandNames }));
  }, [channel]);
  const scenarioOptions = useMemo(() => scenarios.map((item) => ({ value: item, label: scenarioLabel[item] })), []);
  const monthOptions = useMemo(() => months.map((item, index) => ({ value: String(index + 1), label: item })), []);
  const metricOptions = useMemo(() => metricRows.map(({ key, label }) => ({ value: key, label })), []);
  const matchesBrand = useCallback((row: SourceRow) => selectedBrands.length === 0
    ? row.brand === "Consolidado"
    : selectedBrands.includes(row.brand), [selectedBrands]);

  const filterRows = useCallback((year: Scenario) => rows.filter((row) =>
    row.channel === channel && row.year === year && matchesPeriod(row) &&
    matchesBrand(row)
  ), [channel, matchesBrand, matchesPeriod, rows]);
  const current = useMemo(() => sumRows(filterRows(scenario)), [filterRows, scenario]);
  const comparisonScenario = comparisonOf[scenario];
  const previous = useMemo(() => comparisonScenario ? sumRows(filterRows(comparisonScenario)) : zeroTotals(), [comparisonScenario, filterRows]);

  const annualMatrix = useMemo(() => scenarios.map((year) => ({ year, totals: sumRows(rows.filter((row) =>
    row.channel === channel && row.year === year && matchesPeriod(row) &&
    matchesBrand(row)
  )) })), [rows, channel, matchesPeriod, matchesBrand]);

  const channelMatrix = useMemo(() => {
    if (channel !== "Consolidado") return [];
    return [...businessChannels, "Consolidado"].map((name) => {
      const select = (year: Scenario | null) => year ? sumRows(rows.filter((row) =>
        row.channel === name && row.year === year && matchesPeriod(row) &&
        matchesBrand(row)
      )) : zeroTotals();
      return { name: name === "Consolidado" ? "Total" : name, current: select(scenario), previous: select(comparisonScenario) };
    });
  }, [rows, channel, scenario, comparisonScenario, matchesPeriod, matchesBrand]);

  const monthly = useMemo(() => months.map((name, index) => {
    const selectMonth = (year: Scenario | null) => year ? sumRows(rows.filter((row) => row.channel === channel && row.year === year && row.month === index + 1 && matchesBrand(row))) : zeroTotals();
    return { name, current: selectMonth(scenario)[selectedMetric], previous: selectMonth(comparisonScenario)[selectedMetric] };
  }), [rows, channel, scenario, comparisonScenario, matchesBrand, selectedMetric]);

  const ranking = useMemo(() => {
    const items = brands
      .filter((name) => selectedBrands.length === 0 || selectedBrands.includes(name))
      .map((name) => {
        const select = (year: Scenario) => sumRows(rows.filter((row) => row.channel === channel && row.year === year && matchesPeriod(row) && row.brand === name));
        const selected = select(scenario);
        const prior = select("2025");
        const budget = select("2026P");
        return {
          name,
          ...selected,
          prior,
          budget,
          salesAnnual: variation(selected.sales, prior.sales),
          salesBudget: variation(selected.sales, budget.sales),
          marginRate: selected.sales ? selected.margin / selected.sales * 100 : null,
          operatingAnnual: variation(selected.operatingResult, prior.operatingResult),
          operatingBudget: variation(selected.operatingResult, budget.operatingResult),
          utilityAnnual: variation(selected.utility, prior.utility),
          utilityBudget: variation(selected.utility, budget.utility),
        };
      });

    return items.sort((left, right) => {
      const leftValue = left[rankingSort.key];
      const rightValue = right[rankingSort.key];
      if (typeof leftValue === "string" && typeof rightValue === "string") {
        const result = leftValue.localeCompare(rightValue, "es", { sensitivity: "base" });
        return rankingSort.direction === "asc" ? result : -result;
      }
      if (leftValue === null) return 1;
      if (rightValue === null) return -1;
      const result = Number(leftValue) - Number(rightValue);
      return rankingSort.direction === "asc" ? result : -result;
    });
  }, [brands, channel, matchesPeriod, rankingSort, rows, scenario, selectedBrands]);

  const cards: { key: MetricKey; label: string; hint: string }[] = [
    { key: "sales", label: "Ventas", hint: "Ingresos del canal" },
    { key: "margin", label: "Margen", hint: current.sales ? `${percent(current.margin / current.sales * 100)} sobre ventas` : "Sobre ventas" },
    { key: "operatingCost", label: "Costo operacional", hint: current.sales ? `${percent(current.operatingCost / current.sales * 100)} sobre ventas` : "Sobre ventas" },
    { key: "operatingResult", label: "ROP", hint: current.sales ? `${percent(current.operatingResult / current.sales * 100)} sobre ventas` : "Sobre ventas" },
    { key: "utility", label: "Utilidad neta", hint: current.sales ? `${percent(current.utility / current.sales * 100)} sobre ventas` : "Sobre ventas" },
  ];

  const changeRankingSort = (key: RankingSortKey) => setRankingSort((currentSort) => ({
    key,
    direction: currentSort.key === key
      ? currentSort.direction === "asc" ? "desc" : "asc"
      : key === "name" ? "asc" : "desc",
  }));

  const selectedBrandLabel = selectedBrands.length === 0
    ? "TODAS LAS MARCAS"
    : selectedBrands.length === 1
      ? selectedBrands[0]
      : `${selectedBrands.length} MARCAS`;

  const reportHeader = <header className="channel-hero">
    <div><label>RENTABILIDAD FORECAST · BASE OFICIAL</label><h1>Rentabilidad <em>{channel}</em></h1><p>Estado de resultados por canal, marca y periodo. Sin análisis Four Walls.</p></div>
    <span><b>INFORME EN MM$</b><small>FUENTE · BIGQUERY</small></span>
  </header>;

  const retryLoad = () => {
    setLoading(true);
    setLoadError("");
    setRetryKey((current) => current + 1);
  };

  if (loading) return <section className="channel-profitability">{reportHeader}<div className="portal-data-status" role="status"><RefreshCw className="spin" /><p>Cargando Rentabilidad Forecast desde BigQuery…</p></div></section>;
  if (loadError) return <section className="channel-profitability">{reportHeader}<div className="portal-data-status" role="alert"><p>{loadError}</p><button type="button" onClick={retryLoad}>Reintentar</button></div></section>;

  return <section className="channel-profitability">
    {reportHeader}

    <section className={`channel-filters ${period === "MES" ? "with-month" : ""}`}>
      <SearchableSelect label="ESCENARIO" value={scenario} options={scenarioOptions} onChange={setScenario} className="scenario-filter" />
      <div className="channel-period-control">
        <small>PERIODO</small>
        <div className="channel-periods">{periods.map((item) => <button type="button" key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div>
      </div>
      {period === "MES" && <SearchableSelect label="MES" value={String(selectedMonth)} options={monthOptions} onChange={(value) => setSelectedMonth(Number(value))} className="month-filter" />}
      <SearchableMultiSelect label="MARCA" options={brands} selected={selectedBrands} onChange={setSelectedBrands} />
      <div className="channel-filter-note"><CircleDollarSign /><span><small>LECTURA ACTUAL</small><b>{scenarioLabel[scenario]} · {period}</b></span></div>
    </section>

    <section className="channel-kpis">
      {cards.map((card) => <button type="button" className={`channel-kpi-card ${selectedMetric === card.key ? "active" : ""}`} aria-pressed={selectedMetric === card.key} key={card.key} onClick={() => setSelectedMetric(card.key)}><div><small>{card.label}</small><BarChart3 /></div><strong>{money(current[card.key])}</strong><Variation value={comparisonScenario ? variation(current[card.key], previous[card.key]) : null} /><p>{card.hint}</p></button>)}
    </section>

    <section className="channel-grid">
      <article className="channel-panel channel-eerr">
        <header><div><label>RESUMEN EJECUTIVO</label><h2>Estado de resultados</h2></div><span>{period}</span></header>
        <div className="channel-table-wrap"><table><thead><tr><th>Concepto</th>{annualMatrix.map(({ year }) => <th key={year}>{scenarioLabel[year]}</th>)}</tr></thead><tbody>
          {metricRows.map(({ key, label }) => <tr key={key} className={selectedMetric === key ? "active" : ""} onClick={() => setSelectedMetric(key)}><td>{label}</td>{annualMatrix.map(({ year, totals }, index) => {
            const prior = index ? annualMatrix[index - 1].totals[key] : 0;
            const yoy = index ? variation(totals[key], prior) : null;
            return <td key={year}><b>{money(totals[key])}</b>{index > 0
              ? <small className={yoy !== null && yoy < 0 ? "negative" : "positive"}>{yoy === null ? "Sin base" : `${yoy >= 0 ? "+" : ""}${percent(yoy)} A.A.`}</small>
              : key !== "sales" && <small>{totals.sales ? percent(totals[key] / totals.sales * 100) : "—"}</small>}</td>;
          })}</tr>)}
        </tbody></table></div>
      </article>

      <article className="channel-panel channel-trend">
        <header><div><label>EVOLUCIÓN MENSUAL</label><h2>{metricLabel[selectedMetric]}</h2></div><div className="channel-trend-tools"><SearchableSelect label="CUENTA" value={selectedMetric} options={metricOptions} onChange={setSelectedMetric} className="trend-account-filter" /><span>{scenarioLabel[scenario]}</span></div></header>
        <div className="channel-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthly} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe4ef" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => money(Number(value))} tickLine={false} axisLine={false} width={72} /><Tooltip formatter={(value) => [`${money(Number(value))} MM$`, ""]} /><Legend /><Line name={scenarioLabel[scenario]} dataKey="current" stroke="#153b72" strokeWidth={3} dot={{ r: 3 }} /><Line name={comparisonScenario ? scenarioLabel[comparisonScenario] : "Base"} dataKey="previous" stroke="#9cacc0" strokeWidth={2} strokeDasharray="5 5" dot={false} /></LineChart></ResponsiveContainer></div>
      </article>
    </section>

    {channel === "Consolidado" && <article className="channel-panel channel-channel-view">
      <header><div><label>COMPORTAMIENTO POR CANAL</label><h2>Cuadro Consolidado</h2></div><span>{selectedBrandLabel}</span></header>
      <div className="channel-table-wrap"><table><thead><tr><th>Canal</th><th>Venta</th><th>Var. ventas</th><th>Margen</th><th>Margen %</th><th>ROP</th><th>Var. resultado</th><th>Utilidad neta</th><th>Var. utilidad</th></tr></thead><tbody>
        {channelMatrix.map(({ name, current: item, previous: base }) => {
          const salesVar = comparisonScenario ? variation(item.sales, base.sales) : null;
          const resultVar = comparisonScenario ? variation(item.operatingResult, base.operatingResult) : null;
          const utilityVar = comparisonScenario ? variation(item.utility, base.utility) : null;
          const variationCell = (value: number | null) => <span className={value !== null && value < 0 ? "negative" : "positive"}>{value === null ? "—" : `${value >= 0 ? "+" : ""}${percent(value)}`}</span>;
          return <tr key={name} className={name === "Total" ? "channel-total-row" : ""}><td><b>{name}</b></td><td>{money(item.sales)}</td><td>{variationCell(salesVar)}</td><td>{money(item.margin)}</td><td>{item.sales ? percent(item.margin / item.sales * 100) : "—"}</td><td>{money(item.operatingResult)}</td><td>{variationCell(resultVar)}</td><td>{money(item.utility)}</td><td>{variationCell(utilityVar)}</td></tr>;
        })}
      </tbody></table></div>
    </article>}

    <article className="channel-panel channel-ranking">
      <header><div><label>APERTURA POR MARCA</label><h2>Contribución al canal</h2></div><span>{selectedBrandLabel}</span></header>
      <div className="channel-table-wrap"><table className="channel-ranking-table"><thead><tr>{rankingColumns.map((column) => {
        const active = rankingSort.key === column.key;
        const SortIcon = active ? rankingSort.direction === "asc" ? ArrowUp : ArrowDown : ArrowUpDown;
        return <th key={column.key} aria-sort={active ? rankingSort.direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" className={active ? "active" : ""} onClick={() => changeRankingSort(column.key)}>{column.label}<SortIcon aria-hidden="true" /></button></th>;
      })}</tr></thead><tbody>
        {ranking.map((item) => {
          const cell = (value: number | null) => <span className={value !== null && value < 0 ? "negative" : "positive"}>{value === null ? "—" : `${value >= 0 ? "+" : ""}${percent(value)}`}</span>;
          return <tr key={item.name}><td><b>{item.name}</b></td><td>{money(item.sales)}</td><td>{cell(item.salesAnnual)}</td><td>{cell(item.salesBudget)}</td><td>{money(item.margin)}</td><td>{item.marginRate === null ? "—" : percent(item.marginRate)}</td><td className={item.operatingResult < 0 ? "negative" : "positive"}>{money(item.operatingResult)}</td><td>{cell(item.operatingAnnual)}</td><td>{cell(item.operatingBudget)}</td><td className={item.utility < 0 ? "negative" : "positive"}>{money(item.utility)}</td><td>{cell(item.utilityAnnual)}</td><td>{cell(item.utilityBudget)}</td></tr>;
        })}
      </tbody></table></div>
    </article>
  </section>;
}
