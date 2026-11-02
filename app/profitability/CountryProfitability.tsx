"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe2, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Scenario = { label: string; metrics: Record<string, number>; margins: Record<string, number> };
type Country = { name: string; scenarios: Scenario[] };
type Payload = { countries?: Country[]; refreshedAt?: string; source?: string; error?: string; stale?: boolean; warning?: string };

const refreshMinutes = [480, 555, 630, 705, 780, 855, 930, 1005]; // 08:00 a 16:45, ocho ventanas.
const metrics = ["Ventas", "Margen", "GAV", "ROP", "Utilidad Neta", "EBITDA"];
const number = (value: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value);
const percent = (value: number) => `${new Intl.NumberFormat("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value * 100)}%`;

const nextRefreshDelay = () => {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const next = refreshMinutes.find((minute) => minute > current);
  const target = new Date(now);
  if (next === undefined) { target.setDate(target.getDate() + 1); target.setHours(8, 0, 0, 0); }
  else target.setHours(Math.floor(next / 60), next % 60, 0, 0);
  return Math.max(30_000, target.getTime() - now.getTime());
};

export default function CountryProfitability() {
  const [data, setData] = useState<Payload | null>(null);
  const [countryName, setCountryName] = useState("Consolidado");
  const [scenarioLabel, setScenarioLabel] = useState("2026E");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/country-profitability?refresh=${Date.now()}`, { cache: "no-store" });
      const payload = await response.json() as Payload;
      if (!response.ok) throw new Error(payload.error || "No se pudo actualizar Países.");
      setData(payload); setError(payload.stale ? "Actualización remota no disponible; se muestra el último corte guardado." : "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo actualizar Países."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { timer = setTimeout(async () => { await load(); schedule(); }, nextRefreshDelay()); };
    schedule();
    return () => clearTimeout(timer);
  }, [load]);

  const countries = data?.countries ?? [];
  const country = countries.find((item) => item.name === countryName) ?? countries[0];
  const scenario = country?.scenarios.find((item) => item.label === scenarioLabel) ?? country?.scenarios.at(-1);
  const prior = country?.scenarios[Math.max(0, (country?.scenarios.findIndex((item) => item.label === scenario?.label) ?? 0) - 1)];
  const variation = (metric: string) => prior?.metrics[metric] ? (Number(scenario?.metrics[metric] ?? 0) / prior.metrics[metric]) - 1 : null;
  const countryComparison = useMemo(() => countries.filter((item) => item.name !== "Consolidado").map((item) => {
    const selected = item.scenarios.find((entry) => entry.label === scenarioLabel);
    return { name: item.name, ventas: selected?.metrics.Ventas ?? 0, rop: selected?.metrics.ROP ?? 0 };
  }), [countries, scenarioLabel]);

  return <section className="country-profitability">
    <header className="country-hero"><div><label>RENTABILIDAD FORECAST · VISIÓN REGIONAL</label><h1>Resultados por <em>Países</em></h1><p>Lectura ejecutiva del estado de resultados y proyección regional en miles de USD.</p></div><span><b>FUENTE GOOGLE SHEETS</b><small>SLIDES + INFORMES PAÍS · 8 ACTUALIZACIONES DIARIAS</small></span></header>
    <section className="country-toolbar"><div><span>PAÍS</span><div className="country-tabs">{countries.map((item) => <button key={item.name} className={country?.name === item.name ? "active" : ""} onClick={() => setCountryName(item.name)}>{item.name}</button>)}</div></div><div><span>ESCENARIO</span><div className="country-tabs">{country?.scenarios.map((item) => <button key={item.label} className={scenario?.label === item.label ? "active" : ""} onClick={() => setScenarioLabel(item.label)}>{item.label}</button>)}</div></div><button type="button" className="country-refresh" onClick={() => void load()}><RefreshCw className={loading ? "spin" : ""} /> Actualizar</button></section>
    {error && !data ? <div className="channel-state error"><b>No se pudo cargar Países</b><p>{error}</p></div> : country && scenario && <>
      {error && <div className="country-warning">Se mantiene el último corte disponible · {error}</div>}
      <section className="country-kpis">{["Ventas", "Margen", "ROP", "Utilidad Neta", "EBITDA"].map((metric) => { const change = variation(metric); return <article key={metric}><small>{metric}</small><strong>{number(scenario.metrics[metric] ?? 0)}</strong><span className={change !== null && change < 0 ? "negative" : "positive"}>{change === null ? "Sin base" : `${change >= 0 ? "+" : ""}${percent(change)} A.A.`}</span><em>{metric === "Ventas" ? "Miles de USD" : `${percent(scenario.margins[metric] ?? 0)} sobre ventas`}</em></article>; })}</section>
      <section className="country-main-grid"><article className="country-panel"><header><div><label>ESTADO DE RESULTADOS</label><h2>{country.name}</h2></div><span>{scenario.label}</span></header><div className="country-table-wrap"><table><thead><tr><th>Concepto</th>{country.scenarios.map((item) => <th key={item.label}>{item.label}</th>)}</tr></thead><tbody>{metrics.map((metric) => <tr key={metric}><td><b>{metric}</b></td>{country.scenarios.map((item) => <td key={item.label}><b>{number(item.metrics[metric] ?? 0)}</b><small>{metric === "Ventas" ? "100%" : percent(item.margins[metric] ?? 0)}</small></td>)}</tr>)}</tbody></table></div></article>
      <article className="country-panel"><header><div><label>COMPARACIÓN REGIONAL</label><h2>Ventas y ROP</h2></div><span>{scenario.label}</span></header><div className="country-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={countryComparison} margin={{ top: 18, right: 12, left: 4, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e1e7ee" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tickFormatter={(value) => number(Number(value))} width={68} /><Tooltip formatter={(value) => [`US$ ${number(Number(value))} mil`, ""]} /><Bar dataKey="ventas" name="Ventas" fill="#1d4f91" radius={[4, 4, 0, 0]} /><Bar dataKey="rop" name="ROP" fill="#2aa876" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></article></section>
      <section className="country-cards">{countries.filter((item) => item.name !== "Consolidado").map((item) => { const selected = item.scenarios.find((entry) => entry.label === scenarioLabel) ?? item.scenarios.at(-1)!; return <button type="button" key={item.name} className={country.name === item.name ? "active" : ""} onClick={() => setCountryName(item.name)}><Globe2 /><span><small>{item.name}</small><strong>{number(selected.metrics.Ventas ?? 0)}</strong><em>ROP {percent(selected.margins.ROP ?? 0)} · EBITDA {percent(selected.margins.EBITDA ?? 0)}</em></span></button>; })}</section>
      <p className="country-source-note">Última lectura: {data?.refreshedAt ? new Date(data.refreshedAt).toLocaleString("es-CL") : "—"} · ventanas programadas 08:00, 09:15, 10:30, 11:45, 13:00, 14:15, 15:30 y 16:45.</p>
    </>}
  </section>;
}
