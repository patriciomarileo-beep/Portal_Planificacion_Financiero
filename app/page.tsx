"use client";

import { useMemo, useState } from "react";
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
  ChevronDown,
  Database,
  Filter,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";
import { baseConsolidada, type BaseRow } from "./base-consolidada";

type Year = 2024 | 2025 | 2026 | 2027;
type FwBand = "negative" | "low" | "high" | null;
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
const chainNames: Record<string, string> = {
  HP: "Hush Puppies", DH: "D.House", HPK: "H.P.Kids", RK: "Rockford",
  COL: "Columbia", MHW: "Mountain Hardwear", MER: "Merrell",
  FUN: "Funsport", BSOUL: "Bsoul", CAT: "Caterpillar", SE: "Shoe Express",
  AZ: "Azaleia", "7V": "7Veinte", VANS: "Vans", LOP: "LOP",
  CROCS: "Crocs", UA: "Under Armour",
};
const chains = [
  "Hush Puppies", "D.House", "H.P.Kids", "Rockford", "Columbia",
  "Mountain Hardwear", "Merrell", "Funsport", "Bsoul", "Caterpillar",
  "Shoe Express", "Azaleia", "7Veinte", "Vans", "LOP", "Crocs",
  "Under Armour", "OTROS",
];
const ns26 = new Set([
  "228704","231201","232201","232301","232303","231301","232305","232302",
  "232304","232306","228504","222706","233201","231302","231501","233301",
  "231502","217601","232307","222810","229804","233302","222707","221706",
  "223807","222809","223805","229803","228803","223806","228802","233303",
  "223514","228505",
]);
const ns27 = new Set([
  "228301","2561","2687","221201","221301","221706","210108","210109",
  "210110","210203","210302","210307","210807","210811","214701","214803",
  "214805","2657","2511","230301","2690","2691","229804","2683","2684",
  "229703","2685","2686","222707","222101","222301","222810","2693",
  "2695","2523","233302","2525","2526","2654","223805","223807","2576",
  "2681","223514","232302","232306","232307","2651","2652",
]);

const emptyMetric = (): Metric => ({
  sales: 0, margin: 0, payroll: 0, rent: 0, general: 0,
  operatingCost: 0, operatingResult: 0, nonOperating: 0, utility: 0,
  fourWalls: null, fwAvailable: 0,
});
const metricFrom = (r: BaseRow): Metric => {
  const officialFourWalls = r[17];
  // Respaldo controlado: V presenta errores #N/A en parte de 2026/2027.
  // Se conserva V cuando es numérico; si falla, se aplica la fórmula de negocio
  // con los componentes de la misma fila (los gastos vienen con signo negativo).
  const fourWalls = officialFourWalls ?? (r[16] - (r[11] + r[12] + r[13]));
  return {
    sales: r[6], margin: r[7], payroll: r[8], rent: r[9], general: r[10],
    operatingCost: r[14], operatingResult: r[7] + r[14],
    nonOperating: r[15], utility: r[16], fourWalls,
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
  fourWalls:
    a.fourWalls === null && b.fourWalls === null
      ? null
      : (a.fourWalls ?? 0) + (b.fourWalls ?? 0),
  fwAvailable: a.fwAvailable + b.fwAvailable,
});
const chainLabel = (raw: string) => chainNames[raw.trim().toUpperCase()] ?? "OTROS";

const stores: StoreRow[] = (() => {
  const map = new Map<string, StoreRow>();
  for (const r of baseConsolidada) {
    const year = r[0] as Year;
    const code = r[3];
    if (!map.has(code)) {
      map.set(code, {
        code,
        chain: chainLabel(r[4]),
        name: r[5] || `Tienda ${code}`,
        annual: { 2024: emptyMetric(), 2025: emptyMetric(), 2026: emptyMetric(), 2027: emptyMetric() },
        monthly: { 2026: {}, 2027: {} },
      });
    }
    const store = map.get(code)!;
    if (store.chain === "OTROS" && chainLabel(r[4]) !== "OTROS") store.chain = chainLabel(r[4]);
    if (r[2] === "ANUAL" || r[1] === "TOTAL") {
      store.annual[year] = addMetric(store.annual[year], metricFrom(r));
    } else if ((year === 2026 || year === 2027) && r[2] === "MENSUAL") {
      const month = r[1].toUpperCase();
      store.monthly[year][month] = addMetric(store.monthly[year][month] ?? emptyMetric(), metricFrom(r));
    }
  }
  return [...map.values()];
})();

const rawToMM = (n: number) => n / 1000;
const money = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(rawToMM(n)).toLocaleString("es-CL", {
    minimumFractionDigits: 1, maximumFractionDigits: 1,
  })} MM$ CLP`;
const pct = (n: number, d: number) => (d ? (n / d) * 100 : 0);
const variation = (current: number, prior: number) =>
  prior ? ((current / prior) - 1) * 100 : null;
const isNS = (code: string, year: 2026 | 2027) => (year === 2026 ? ns26 : ns27).has(code);
const fwBandOf = (store: StoreRow, year: Year): FwBand => {
  if (store.annual[year].sales === 0) return null;
  const value = store.annual[year].fourWalls ?? 0;
  return value < 0 ? "negative" : value < 6000 ? "low" : "high";
};

function YoY({ current, prior }: { current: number; prior: number }) {
  const value = variation(current, prior);
  if (value === null || !Number.isFinite(value)) return <small>YoY —</small>;
  return (
    <small className={value >= 0 ? "pos" : "neg"}>
      {value >= 0 ? <ArrowUpRight /> : <ArrowDownRight />} YoY {Math.abs(value).toFixed(1)}%
    </small>
  );
}

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      <b>{payload[0]?.payload?.name || label}</b>
      {payload.map((p: any) => (
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
}: {
  selection: StoreRow[];
  universe: StoreRow[];
  quadrantYear: Year;
  setQuadrantYear: (year: Year) => void;
  fwBand: FwBand;
  setFwBand: (band: FwBand) => void;
}) {
  const total = (ss: StoreRow[], y: Year) =>
    ss.reduce((a, s) => addMetric(a, s.annual[y]), emptyMetric());
  const totals = years.map((y) => total(selection, y));
  const rows: { label: string; key: keyof Metric; percent?: boolean }[] = [
    { label: "Ventas", key: "sales" },
    { label: "Margen", key: "margin" },
    { label: "Margen / venta", key: "margin", percent: true },
    { label: "Arriendos", key: "rent" },
    { label: "Remuneraciones", key: "payroll" },
    { label: "Costo operacional", key: "operatingCost" },
    { label: "Resultado operacional", key: "operatingResult" },
    { label: "Utilidad", key: "utility" },
  ];
  return (
    <>
      <section className="executive-matrix panel">
        <div className="matrix-title">
          <div>
            <label>RESUMEN EJECUTIVO</label>
            <h2>Estado de resultados consolidado</h2>
            <p>BASE_CONSOLIDADA · 2024R–2025R anual · 2026E–2027P total anual · MM$ CLP</p>
          </div>
          <strong><Store /> {selection.length} tiendas</strong>
        </div>
        <div className="scroll matrix-scroll">
          <table>
            <thead>
              <tr><th>CONCEPTO</th>{years.map((y) => <th key={y}>{yearLabel(y)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className={row.key === "utility" ? "total-row" : ""}>
                  <td>{row.label}</td>
                  {totals.map((t, i) => {
                    const value = t[row.key] as number;
                    return (
                      <td key={years[i]}>
                        <b>{row.percent ? `${pct(t.margin, t.sales).toFixed(2)}%` : money(value)}</b>
                        {i > 0 && <YoY current={row.percent ? pct(t.margin, t.sales) : value} prior={row.percent ? pct(totals[i - 1].margin, totals[i - 1].sales) : (totals[i - 1][row.key] as number)} />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="chain-divider">
          <h3>Apertura por cadena</h3><span>Utilidad, margen sobre venta y variación anual</span>
        </div>
        <div className="scroll matrix-scroll">
          <table>
            <thead><tr><th>CADENA</th>{years.map((y) => <th key={y}>{yearLabel(y)}</th>)}</tr></thead>
            <tbody>
              {chains.map((chain) => {
                const chainStores = selection.filter((s) => s.chain === chain);
                return (
                  <tr key={chain}>
                    <td>{chain}</td>
                    {years.map((y, i) => {
                      const t = total(chainStores, y);
                      const prev = i ? total(chainStores, years[i - 1]) : null;
                      return (
                        <td key={y}>
                          <b>{money(t.utility)}</b>
                          <small>{pct(t.margin, t.sales).toFixed(2)}% margen</small>
                          {prev && <YoY current={t.utility} prior={prev.utility} />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr className="grand-total">
                <td>TOTAL</td>
                {totals.map((t, i) => <td key={years[i]}><b>{money(t.utility)}</b><small>{pct(t.margin, t.sales).toFixed(2)}% margen</small></td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <FourWalls selection={selection} universe={universe} quadrantYear={quadrantYear} setQuadrantYear={setQuadrantYear} fwBand={fwBand} setFwBand={setFwBand} />
    </>
  );
}

function FourWalls({
  selection,
  universe,
  quadrantYear,
  setQuadrantYear,
  fwBand,
  setFwBand,
}: {
  selection: StoreRow[];
  universe: StoreRow[];
  quadrantYear: Year;
  setQuadrantYear: (year: Year) => void;
  fwBand: FwBand;
  setFwBand: (band: FwBand) => void;
}) {
  const [selected, setSelected] = useState<StoreRow | null>(null);
  const points = selection.filter((s) => s.annual[quadrantYear].sales !== 0).map((s) => ({
      name: s.name,
      code: s.code,
      x: s.annual[quadrantYear].sales,
      y: s.annual[quadrantYear].fourWalls as number,
      store: s,
      official: s.annual[quadrantYear].fwAvailable > 0,
    }));
  const risk = selection
    .filter((s) => years.some((y) => (s.annual[y].fourWalls ?? 0) < 0))
    .sort((a, b) => (a.annual[2027].fourWalls ?? 0) - (b.annual[2027].fourWalls ?? 0));
  const derived = selection.filter((s) => s.annual[quadrantYear].sales !== 0 && s.annual[quadrantYear].fwAvailable === 0).length;
  const bands = [
    { id: "negative" as const, label: "Pérdida estructural", help: "Four Walls menor a 0", color: "red", count: universe.filter((s) => fwBandOf(s, quadrantYear) === "negative").length },
    { id: "low" as const, label: "Rentabilidad baja", help: "Four Walls entre 0 y < 6 MM$", color: "amber", count: universe.filter((s) => fwBandOf(s, quadrantYear) === "low").length },
    { id: "high" as const, label: "Rentabilidad saludable", help: "Four Walls desde 6 MM$", color: "green", count: universe.filter((s) => fwBandOf(s, quadrantYear) === "high").length },
  ];
  return (
    <>
      <div className="title">
        <div><i className="red">02</i><span><h2>Rentabilidad Four Walls</h2><p>Valor directo de la columna V · BASE_CONSOLIDADA</p></span></div>
        <strong className="neg">{risk.length} tiendas con alerta histórica</strong>
      </div>
      {derived > 0 && (
        <div className="data-warning compact-warning"><AlertTriangle /><span><b>{derived} tiendas usan respaldo en {yearLabel(quadrantYear)}.</b> Se aplica la fórmula de negocio sólo cuando V devuelve error o vacío.</span></div>
      )}
      <section className="two">
        <section className="panel risk">
          <label>TIENDA NO RENTABLE ESTRUCTURALMENTE</label>
          <h3>Alertas críticas · histórico completo</h3>
          <div className="scroll fw-scroll">
            <table className="compact-table">
              <thead><tr><th>TIENDA</th><th>CADENA</th>{years.map((y) => <th key={y}>FW {yearLabel(y)}</th>)}</tr></thead>
              <tbody>
                {risk.map((s) => (
                  <tr key={s.code} onClick={() => setSelected(s)} className="clickable-row">
                    <td><b>{s.name}</b><small>#{s.code}</small></td><td>{s.chain}</td>
                    {years.map((y) => {
                      const value = s.annual[y].fourWalls ?? 0;
                      return <td key={y} className={value < 0 ? "neg bold" : "pos"}>{money(value)}</td>;
                    })}
                  </tr>
                ))}
                {!risk.length && <tr><td colSpan={6}>No hay alertas Four Walls en la selección.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel quadrant-panel">
          <div className="panel-toolbar">
            <div><label>CUADRANTE {yearLabel(quadrantYear)}</label><h3>Ventas vs Four Walls</h3></div>
            <label className="year-select">AÑO<select value={quadrantYear} onChange={(e) => setQuadrantYear(Number(e.target.value) as Year)}>{years.map((y) => <option key={y} value={y}>{yearLabel(y)}</option>)}</select><ChevronDown /></label>
          </div>
          <div className="chart compact-chart">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke="#e7ebf1" />
                <XAxis type="number" dataKey="x" tickFormatter={(v) => `${(v / 1000).toFixed(0)} MM$`} />
                <YAxis type="number" dataKey="y" tickFormatter={(v) => `${(v / 1000).toFixed(0)} MM$`} />
                <ReferenceLine y={0} stroke="#d92d42" strokeDasharray="4 4" />
                <Tooltip content={<Tip />} />
                <Scatter
                  data={points}
                  cursor="pointer"
                  onClick={(point: any) => setSelected((point.payload ?? point).store)}
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
          <div><label>DETALLE FOUR WALLS</label><h2>{store.name}</h2><p>#{store.code} · {store.chain} · <b>{isNS(store.code, 2027) ? "NS 2027P" : "SSS 2027P"}</b></p></div>
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
              <XAxis dataKey="month" /><YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)} MM$`} />
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
                  <td><b>{s.name}</b><small>#{s.code}</small></td><td>{s.chain}</td><td><i className="tag">{isNS(s.code, 2027) ? "NS" : "SSS"}</i></td>
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
  return (
    <>
      <div className="title"><div><i>05</i><span><h2>Break-Even</h2><p>Simulación de punto cero para tiendas con utilidad negativa en 2027P</p></span></div><strong className="neg">{rows.length} tiendas bajo punto de equilibrio</strong></div>
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
  const pending = rows.filter((r) => r.issues.length);
  return (
    <>
      <div className="title"><div><i>04</i><span><h2>Monitor maestro de tiendas</h2><p>Control preliminar para cuadratura de tiendas, cadenas y mall / ubicación</p></span></div><strong>{pending.length} registros por revisar</strong></div>
      <section className="monitor-kpis">
        <article><label>TIENDAS / CC</label><strong>{rows.length}</strong><span>registros únicos</span></article>
        <article><label>CADENA OTROS</label><strong>{rows.filter((r) => r.chain === "OTROS").length}</strong><span>requieren clasificación</span></article>
        <article><label>NOMBRES DUPLICADOS</label><strong>{duplicateNames.size}</strong><span>posibles homologaciones</span></article>
        <article><label>ACTIVAS 2027P</label><strong>{rows.filter((r) => r.annual[2027].sales !== 0).length}</strong><span>con venta anual</span></article>
      </section>
      <section className="panel monitor-panel">
        <div className="monitor-head"><div><label>BASE DE CONTROL</label><h3>Listado de tiendas</h3></div><span>“Mall / ubicación” es derivado del nombre y queda sujeto a validación.</span></div>
        <div className="scroll monitor-scroll">
          <table className="detail-table compact-table">
            <thead><tr><th>CC REPORTE</th><th>TIENDA HOMOLOGADA</th><th>CADENA</th><th>MALL / UBICACIÓN</th><th>APERTURA</th>{years.map((y) => <th key={y}>{yearLabel(y)}</th>)}<th>ESTADO CONTROL</th></tr></thead>
            <tbody>{rows.map((s) => <tr key={s.code}>
              <td><b>{s.code}</b></td><td><b>{s.name}</b></td><td className={s.chain === "OTROS" ? "neg bold" : ""}>{s.chain}</td><td>{s.mall}</td>
              <td><i className="tag">{isNS(s.code, 2027) ? "NS 2027P" : "SSS 2027P"}</i></td>
              {years.map((y) => <td key={y}><i className={s.active.includes(y) ? "presence yes" : "presence"}>{s.active.includes(y) ? "● Sí" : "○ No"}</i></td>)}
              <td>{s.issues.length ? <i className="status low">● {s.issues.join(" · ")}</i> : <i className="status good">● Cuadrada</i>}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default function Home() {
  const [view, setView] = useState<"annual" | "detail" | "monitor" | "break-even">("annual");
  const [opening, setOpening] = useState("Todas");
  const [chain, setChain] = useState("Todas");
  const [query, setQuery] = useState("");
  const [quadrantYear, setQuadrantYear] = useState<Year>(2027);
  const [fwBand, setFwBand] = useState<FwBand>(null);
  const universe = useMemo(() => stores.filter((s) => {
    const matchesOpening = opening === "Todas" || (opening === "NS" ? isNS(s.code, 2027) : !isNS(s.code, 2027));
    const matchesChain = chain === "Todas" || s.chain === chain;
    const needle = query.trim().toLowerCase();
    return matchesOpening && matchesChain && (!needle || s.name.toLowerCase().includes(needle) || s.code.toLowerCase().includes(needle));
  }), [opening, chain, query]);
  const selection = useMemo(
    () => fwBand ? universe.filter((s) => fwBandOf(s, quadrantYear) === fwBand) : universe,
    [universe, fwBand, quadrantYear],
  );
  return (
    <main>
      <header>
        <div className="brand"><img src="/forus.png" alt="Forus" /><b>PLANIFICACIÓN <span>FINANCIERA</span><small>Finance Intelligence</small></b></div>
        <nav>
          <button className={view === "annual" ? "active" : ""} onClick={() => setView("annual")}>Comparativa anual</button>
          <button className={view === "detail" ? "active" : ""} onClick={() => setView("detail")}>Detalle tiendas</button>
          <button className={view === "break-even" ? "active" : ""} onClick={() => setView("break-even")}>Break-Even</button>
          <button className={view === "monitor" ? "active" : ""} onClick={() => setView("monitor")}>Monitor tiendas</button>
        </nav>
        <button className="refresh-button" onClick={() => window.location.reload()} title="Recargar la última versión disponible"><RefreshCw /> Actualizar vista</button><i className="avatar">PF</i>
      </header>
      <section className="hero">
        <div><label>PLANIFICACIÓN FINANCIERA · PRESUPUESTO 2027P</label><h1>Rentabilidad de tiendas <em>2027P</em></h1><p>EERR consolidado, evolución mensual y riesgo Four Walls por tienda.</p></div>
        <span><Database /> Fuente oficial<br/><b>BASE_CONSOLIDADA</b></span>
      </section>
      <section className="filters">
        <b><Filter /> Segmentar vista</b>
        <label>APERTURA<select value={opening} onChange={(e) => setOpening(e.target.value)}><option>Todas</option><option>SSS</option><option>NS</option></select><ChevronDown /></label>
        <label>CADENA<select value={chain} onChange={(e) => setChain(e.target.value)}><option>Todas</option>{chains.map((c) => <option key={c}>{c}</option>)}</select><ChevronDown /></label>
        <div><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tienda o código..." /></div>
        {fwBand && <i className={`filter-chip band-${fwBand}`}>Four Walls {yearLabel(quadrantYear)} · {fwBand === "negative" ? "Pérdida" : fwBand === "low" ? "Baja" : "Saludable"}</i>}
        <button onClick={() => { setOpening("Todas"); setChain("Todas"); setQuery(""); setFwBand(null); }}>Limpiar filtros</button>
      </section>
      <div className="content">
        {view === "annual" ? <Executive selection={selection} universe={universe} quadrantYear={quadrantYear} setQuadrantYear={setQuadrantYear} fwBand={fwBand} setFwBand={setFwBand} /> : view === "detail" ? <Detail selection={selection} /> : view === "break-even" ? <BreakEven selection={selection} /> : <StoreMonitor selection={selection} />}
      </div>
      <footer>Planificación Financiera · Forus <span>Valores en millones de pesos chilenos (MM$ CLP) · Fuente: BASE_CONSOLIDADA</span></footer>
    </main>
  );
}

// Para refrescar el dashboard, reemplazar este snapshot mediante el mismo mapper
// conectado a Google Sheets API y mantener los índices definidos en BaseRow.
