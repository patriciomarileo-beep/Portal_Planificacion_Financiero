"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  CircleDollarSign,
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
import { usePrivateData } from "../private-data-context";
import type { ProfitabilityDataRow } from "./profitability-data";

type Channel = "Ecommerce" | "Marketplace" | "Wholesale" | "Consolidado";
type Scenario = "2025" | "2026E" | "2026P";
type Period = "ANUAL" | "Q1" | "Q2" | "Q3" | "Q4" | "MES";
type MetricKey = "sales" | "margin" | "operatingCost" | "operatingResult" | "utility";

type SourceRow = {
  monthName: string;
  year: Scenario;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  month: number;
  channel: string;
  brand: string;
  sales: number;
  margin: number;
  operatingCost: number;
  operatingResult: number;
  utility: number;
};

type Totals = Record<MetricKey, number>;

const scenarios: Scenario[] = ["2025", "2026E", "2026P"];
const periods: Period[] = ["ANUAL", "Q1", "Q2", "Q3", "Q4", "MES"];
const businessChannels = ["Brick&Life", "Ecommerce", "Wholesale", "Marketplace"] as const;
const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const metricRows: { key: MetricKey; label: string }[] = [
  { key: "sales", label: "Ventas netas" },
  { key: "margin", label: "Margen" },
  { key: "operatingCost", label: "Costo operacional" },
  { key: "operatingResult", label: "Resultado operacional" },
  { key: "utility", label: "Utilidad neta" },
];
const zeroTotals = (): Totals => ({ sales: 0, margin: 0, operatingCost: 0, operatingResult: 0, utility: 0 });
const scenarioLabel: Record<Scenario, string> = {
  "2025": "2025R",
  "2026E": "2026E · Cierre",
  "2026P": "2026P · Presupuesto",
};
const comparisonOf: Record<Scenario, Scenario | null> = {
  "2025": null,
  "2026E": "2025",
  "2026P": "2026E",
};

const parseRows = (profitabilityData: ProfitabilityDataRow[]): SourceRow[] => profitabilityData.map(([monthName, year, quarter, month, channel, brand, sales, margin, operatingCost, operatingResult, utility]) => ({
  monthName, year: year as Scenario, quarter: quarter as SourceRow["quarter"], month, channel, brand,
  sales, margin, operatingCost, operatingResult, utility,
}));

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

export default function ChannelProfitability({ channel }: { channel: Channel }) {
  const { profitabilityData } = usePrivateData();
  const rows = useMemo(() => parseRows(profitabilityData), [profitabilityData]);
  const [scenario, setScenario] = useState<Scenario>("2026E");
  const [period, setPeriod] = useState<Period>("ANUAL");
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [brand, setBrand] = useState("TODAS");
  const [query, setQuery] = useState("");
  const matchesPeriod = (row: SourceRow) => period === "ANUAL" || (period === "MES" ? row.month === selectedMonth : row.quarter === period);

  const brands = useMemo(() => [...new Set(rows.filter((row) => row.channel === channel && row.brand !== "Consolidado").map((row) => row.brand))].sort(), [rows, channel]);
  const filterRows = (year: Scenario, selectedBrand = brand) => rows.filter((row) =>
    row.channel === channel && row.year === year && matchesPeriod(row) &&
    (selectedBrand === "TODAS" ? row.brand === "Consolidado" : row.brand === selectedBrand)
  );
  const current = useMemo(() => sumRows(filterRows(scenario)), [rows, channel, scenario, period, selectedMonth, brand]);
  const comparisonScenario = comparisonOf[scenario];
  const previous = useMemo(() => comparisonScenario ? sumRows(filterRows(comparisonScenario)) : zeroTotals(), [rows, channel, scenario, period, selectedMonth, brand]);

  const annualMatrix = useMemo(() => scenarios.map((year) => ({ year, totals: sumRows(rows.filter((row) =>
    row.channel === channel && row.year === year && matchesPeriod(row) &&
    (brand === "TODAS" ? row.brand === "Consolidado" : row.brand === brand)
  )) })), [rows, channel, period, selectedMonth, brand]);

  const channelMatrix = useMemo(() => {
    if (channel !== "Consolidado") return [];
    return [...businessChannels, "Consolidado"].map((name) => {
      const select = (year: Scenario | null) => year ? sumRows(rows.filter((row) =>
        row.channel === name && row.year === year && matchesPeriod(row) &&
        (brand === "TODAS" ? row.brand === "Consolidado" : row.brand === brand)
      )) : zeroTotals();
      return { name: name === "Consolidado" ? "Total" : name, current: select(scenario), previous: select(comparisonScenario) };
    });
  }, [rows, channel, scenario, comparisonScenario, period, selectedMonth, brand]);

  const monthly = useMemo(() => months.map((name, index) => {
    const selectMonth = (year: Scenario | null) => year ? sumRows(rows.filter((row) => row.channel === channel && row.year === year && row.month === index + 1 && (brand === "TODAS" ? row.brand === "Consolidado" : row.brand === brand))) : zeroTotals();
    return { name, current: selectMonth(scenario).sales, previous: selectMonth(comparisonScenario).sales };
  }), [rows, channel, scenario, comparisonScenario, brand]);

  const ranking = useMemo(() => brands.map((name) => {
    const select = (year: Scenario) => sumRows(rows.filter((row) => row.channel === channel && row.year === year && matchesPeriod(row) && row.brand === name));
    return { name, ...select(scenario), prior: select("2025"), budget: select("2026P") };
  })
    .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.sales - a.sales), [rows, brands, channel, scenario, period, selectedMonth, query]);

  const cards: { key: MetricKey; label: string; hint: string }[] = [
    { key: "sales", label: "Ventas netas", hint: "Ingresos del canal" },
    { key: "margin", label: "Margen", hint: current.sales ? `${percent(current.margin / current.sales * 100)} sobre ventas` : "Sobre ventas" },
    { key: "operatingResult", label: "Resultado operacional", hint: current.sales ? `${percent(current.operatingResult / current.sales * 100)} sobre ventas` : "Sobre ventas" },
    { key: "utility", label: "Utilidad neta", hint: current.sales ? `${percent(current.utility / current.sales * 100)} sobre ventas` : "Sobre ventas" },
  ];

  return <section className="channel-profitability">
    <header className="channel-hero">
      <div><label>RENTABILIDAD FORECAST · BASE OFICIAL</label><h1>Rentabilidad <em>{channel}</em></h1><p>Estado de resultados por canal, marca y periodo. Sin análisis Four Walls.</p></div>
      <span><b>INFORME EN MM$</b><small>FUENTE · GOOGLE SHEETS / BASE</small></span>
    </header>

    <section className="channel-filters">
      <label>ESCENARIO<div><select value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)}>{scenarios.map((item) => <option key={item} value={item}>{scenarioLabel[item]}</option>)}</select><ChevronDown /></div></label>
      <label>PERIODO<div><select value={period} onChange={(event) => setPeriod(event.target.value as Period)}>{periods.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown /></div></label>
      {period === "MES" && <label>MES<div><select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>{months.map((item, index) => <option key={item} value={index + 1}>{item}</option>)}</select><ChevronDown /></div></label>}
      <label>MARCA<div><select value={brand} onChange={(event) => setBrand(event.target.value)}><option>TODAS</option>{brands.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown /></div></label>
      <div className="channel-filter-note"><CircleDollarSign /><span><small>LECTURA ACTUAL</small><b>{scenarioLabel[scenario]} · {period}</b></span></div>
    </section>

    <section className="channel-kpis">
      {cards.map((card) => <article key={card.key}><div><small>{card.label}</small><BarChart3 /></div><strong>{money(current[card.key])}</strong><Variation value={comparisonScenario ? variation(current[card.key], previous[card.key]) : null} /><p>{card.hint}</p></article>)}
    </section>

    <section className="channel-grid">
      <article className="channel-panel channel-eerr">
        <header><div><label>RESUMEN EJECUTIVO</label><h2>Estado de resultados</h2></div><span>{period}</span></header>
        <div className="channel-table-wrap"><table><thead><tr><th>Concepto</th>{annualMatrix.map(({ year }) => <th key={year}>{scenarioLabel[year]}</th>)}</tr></thead><tbody>
          {metricRows.map(({ key, label }) => <tr key={key}><td>{label}</td>{annualMatrix.map(({ year, totals }, index) => {
            const prior = index ? annualMatrix[index - 1].totals[key] : 0;
            const yoy = index ? variation(totals[key], prior) : null;
            return <td key={year}><b>{money(totals[key])}</b>{index > 0
              ? <small className={yoy !== null && yoy < 0 ? "negative" : "positive"}>{yoy === null ? "Sin base" : `${yoy >= 0 ? "+" : ""}${percent(yoy)} A.A.`}</small>
              : key !== "sales" && <small>{totals.sales ? percent(totals[key] / totals.sales * 100) : "—"}</small>}</td>;
          })}</tr>)}
        </tbody></table></div>
      </article>

      <article className="channel-panel channel-trend">
        <header><div><label>EVOLUCIÓN MENSUAL</label><h2>Ventas netas</h2></div><span>{scenarioLabel[scenario]}</span></header>
        <div className="channel-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthly} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe4ef" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => money(Number(value))} tickLine={false} axisLine={false} width={72} /><Tooltip formatter={(value) => [`${money(Number(value))} MM$`, ""]} /><Legend /><Line name={scenarioLabel[scenario]} dataKey="current" stroke="#153b72" strokeWidth={3} dot={{ r: 3 }} /><Line name={comparisonScenario ? scenarioLabel[comparisonScenario] : "Base"} dataKey="previous" stroke="#9cacc0" strokeWidth={2} strokeDasharray="5 5" dot={false} /></LineChart></ResponsiveContainer></div>
      </article>
    </section>

    {channel === "Consolidado" && <article className="channel-panel channel-channel-view">
      <header><div><label>COMPORTAMIENTO POR CANAL</label><h2>Cuadro Consolidado</h2></div><span>{brand === "TODAS" ? "TODAS LAS MARCAS" : brand}</span></header>
      <div className="channel-table-wrap"><table><thead><tr><th>Canal</th><th>Ventas netas</th><th>Var. ventas</th><th>Margen</th><th>Margen %</th><th>Resultado operacional</th><th>Var. resultado</th><th>Utilidad neta</th><th>Var. utilidad</th></tr></thead><tbody>
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
      <header><div><label>APERTURA POR MARCA</label><h2>Contribución al canal</h2></div><div className="channel-ranking-tools"><div className="channel-periods">{periods.map((item) => <button type="button" key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div>{period === "MES" && <select className="channel-month-select" value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>{months.map((item, index) => <option key={item} value={index + 1}>{item}</option>)}</select>}<div className="channel-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar marca…" /></div></div></header>
      <div className="channel-table-wrap"><table className="channel-ranking-table"><thead><tr><th>Marca</th><th>Ventas netas</th><th>Var. A.A.</th><th>Var. ppto.</th><th>Margen</th><th>Margen %</th><th>Resultado operacional</th><th>Var. A.A.</th><th>Var. ppto.</th><th>Utilidad neta</th><th>Var. A.A.</th><th>Var. ppto.</th></tr></thead><tbody>
        {ranking.map((item) => {
          const cell = (value: number | null) => <span className={value !== null && value < 0 ? "negative" : "positive"}>{value === null ? "—" : `${value >= 0 ? "+" : ""}${percent(value)}`}</span>;
          return <tr key={item.name}><td><b>{item.name}</b></td><td>{money(item.sales)}</td><td>{cell(variation(item.sales, item.prior.sales))}</td><td>{cell(variation(item.sales, item.budget.sales))}</td><td>{money(item.margin)}</td><td>{item.sales ? percent(item.margin / item.sales * 100) : "—"}</td><td className={item.operatingResult < 0 ? "negative" : "positive"}>{money(item.operatingResult)}</td><td>{cell(variation(item.operatingResult, item.prior.operatingResult))}</td><td>{cell(variation(item.operatingResult, item.budget.operatingResult))}</td><td className={item.utility < 0 ? "negative" : "positive"}>{money(item.utility)}</td><td>{cell(variation(item.utility, item.prior.utility))}</td><td>{cell(variation(item.utility, item.budget.utility))}</td></tr>;
        })}
      </tbody></table></div>
    </article>
  </section>;
}
