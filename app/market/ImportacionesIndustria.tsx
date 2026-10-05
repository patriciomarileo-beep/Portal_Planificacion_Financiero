"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Boxes, ChevronDown, CircleDollarSign, Gauge, Percent, RefreshCw } from "lucide-react";

type Period = "ANUAL" | "Q1" | "Q2" | "Q3" | "Q4" | "MES";
type DataRow = Record<string, string | number | null>;
type Payload = {
  source: string;
  scope: { fromYear: number; excludedYears: number[]; classes: string[]; units: string[] };
  years: number[];
  overview: DataRow;
  trend: DataRow[];
  segments: DataRow[];
  importers: DataRow[];
  error?: string;
};

const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const number = (value: unknown) => Number(value || 0);
const formatNumber = (value: unknown, digits = 0) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: digits }).format(number(value));
const formatUsd = (value: unknown, digits = 0) => `US$ ${formatNumber(value, digits)}`;
const formatPercent = (value: unknown) => `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(number(value) * 100)}%`;

export default function ImportacionesIndustria() {
  const [period, setPeriod] = useState<Period>("ANUAL");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState(1);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ period, year: String(year), month: String(month) });
    fetch(`/api/importaciones-industria?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as Payload;
        if (!response.ok) throw new Error(payload.error || "No fue posible consultar la fuente.");
        return payload;
      })
      .then((payload) => {
        setData(payload);
        if (payload.years.length && !payload.years.includes(year)) setYear(payload.years[payload.years.length - 1]);
      })
      .catch((reason) => { if (reason.name !== "AbortError") setError(reason.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [period, year, month]);

  const chart = useMemo(() => (data?.trend ?? []).map((row) => ({
    label: `${months[number(row.mes) - 1] ?? row.mes}`,
    cantidad: number(row.cantidad),
    fob: number(row.us_fob),
    unitario: number(row.fob_unitario),
  })), [data]);
  const titlePeriod = period === "ANUAL" ? `Año ${year}` : period === "MES" ? `${months[month - 1]} ${year}` : `${period} ${year}`;

  return <section className="imports-page">
    <div className="imports-title-row">
      <div><label>MERCADO · COMERCIO EXTERIOR</label><h1>Importaciones Industria Retail</h1><p>Volumen, valorización FOB y participación competitiva desde 2023.</p></div>
      <span className="imports-source"><b>FUENTE BIGQUERY</b><small>Actualización directa · Pares y unidades</small></span>
    </div>

    <section className="imports-controlbar">
      <div className="imports-year"><span>AÑO</span><div className="market-select"><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{(data?.years.length ? data.years : [2023, 2024, 2025, 2026]).map((item) => <option key={item}>{item}</option>)}</select><ChevronDown /></div></div>
      <div><span>PERÍODO</span><div className="imports-periods">{(["ANUAL", "Q1", "Q2", "Q3", "Q4", "MES"] as Period[]).map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div></div>
      {period === "MES" && <div className="imports-year"><span>MES</span><div className="market-select"><select value={month} onChange={(event) => setMonth(Number(event.target.value))}>{months.map((item, index) => <option value={index + 1} key={item}>{item}</option>)}</select><ChevronDown /></div></div>}
      <span className="imports-scope">CLASE: CALZADO · VESTUARIO · ACCESORIOS <i /> UNIDAD: PARES · UNIDADES</span>
    </section>

    {loading ? <div className="imports-state"><RefreshCw className="spin" /><strong>Consultando BigQuery…</strong></div> : error ? <div className="imports-state error"><strong>No se pudo cargar la fuente</strong><p>{error}</p><small>La extracción considera exclusivamente registros desde 2023.</small></div> : data && <>
      <div className="imports-kpis">
        <article><i><Boxes /></i><span>VOLUMEN · {titlePeriod}</span><strong>{formatNumber(data.overview.cantidad)}</strong><small>Pares y unidades seleccionados</small></article>
        <article><i><CircleDollarSign /></i><span>VALORIZACIÓN FOB</span><strong>{formatUsd(data.overview.us_fob)}</strong><small>Valor total importado</small></article>
        <article><i><Gauge /></i><span>FOB UNITARIO PONDERADO</span><strong>{formatUsd(data.overview.fob_unitario, 2)}</strong><small>FOB total / volumen total</small></article>
        <article><i><Percent /></i><span>PARTICIPACIÓN FORUS</span><strong>{formatPercent(data.overview.forus_share)}</strong><small>Sobre US$ FOB del universo visible</small></article>
      </div>

      <div className="imports-grid">
        <article className="imports-panel imports-trend"><header><div><label>EVOLUCIÓN TEMPORAL</label><h2>Volumen y FOB unitario</h2></div><span>{titlePeriod}</span></header><div className="imports-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chart} margin={{ top: 18, right: 20, left: 2, bottom: 0 }}><CartesianGrid stroke="#e8edf3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 9, fill: "#718198" }} /><YAxis yAxisId="left" tick={{ fontSize: 8, fill: "#718198" }} tickFormatter={(value) => formatNumber(value)} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 8, fill: "#718198" }} tickFormatter={(value) => `US$${formatNumber(value, 0)}`} /><Tooltip formatter={(value, name) => name === "unitario" ? formatUsd(value, 2) : formatNumber(value)} /><Bar yAxisId="left" dataKey="cantidad" name="Volumen" fill="#1f5ca8" radius={[3, 3, 0, 0]} /><Line yAxisId="right" dataKey="unitario" name="FOB unitario" stroke="#e57a34" strokeWidth={2.5} dot={{ r: 3 }} /></ComposedChart></ResponsiveContainer></div></article>
        <article className="imports-panel"><header><div><label>RANKING COMPETITIVO</label><h2>Importadores por US$ FOB</h2></div><span>TOP 10</span></header><div className="imports-rank">{data.importers.slice(0, 10).map((row, index) => <div key={String(row.importador)} className={row.importador === "FORUS S.A." ? "forus" : ""}><b>{String(index + 1).padStart(2, "0")}</b><span>{row.importador}<small>{formatPercent(row.participacion)} del mercado</small></span><strong>{formatUsd(row.us_fob)}</strong></div>)}</div></article>
      </div>

      <article className="imports-table-panel"><header><div><label>APERTURA FINANCIERA</label><h2>Segmento y clase</h2></div><span>{titlePeriod} · DESDE 2023</span></header><div className="imports-table-wrap"><table><thead><tr><th>Segmento</th><th>Clase</th><th>Volumen</th><th>Participación</th><th>US$ FOB</th><th>FOB unitario</th></tr></thead><tbody>{data.segments.map((row, index) => <tr key={`${row.segmento}-${row.clase}-${index}`}><td>{row.segmento}</td><td>{row.clase}</td><td>{formatNumber(row.cantidad)}</td><td>{formatPercent(row.participacion)}</td><td>{formatUsd(row.us_fob)}</td><td>{formatUsd(row.fob_unitario, 2)}</td></tr>)}</tbody></table></div></article>
      <p className="imports-footnote">Extracción limitada a años ≥ 2023. Los años 2019 y 2022 no se consultan ni participan en totales, variaciones o participaciones.</p>
    </>}
  </section>;
}
