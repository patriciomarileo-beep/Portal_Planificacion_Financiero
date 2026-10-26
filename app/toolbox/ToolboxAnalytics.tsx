"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const inventory = months.map((month, index) => ({
  month,
  y2025: [1442, 1742, 1646, 2066, 1781, 1593, 1688, 934, 1969, 2281, 2056, 1566][index],
  y2026: [1510, 1818, 1722, 2154, 1860, 1667, 1754, 1012, 2054, 2370, 2140, 1642][index],
  y2027: [1585, 1908, 1801, 2248, 1940, 1738, 1829, 1088, 2146, 2473, 2235, 1716][index],
}));
const inventoryDays = {
  2025: [136, 170, 157, 140, 91, 85, 150, 223, 186, 154, 130, 110],
  2026: [129, 155, 146, 132, 88, 81, 139, 198, 174, 149, 122, 101],
  2027: [118, 143, 136, 124, 82, 76, 128, 181, 162, 139, 113, 94],
};
const channelSales = [
  { channel: "B&M", y2025: 4567, y2026: 4982, y2027: 5410 },
  { channel: "ECOMM", y2025: 1493, y2026: 1704, y2027: 1976 },
  { channel: "WHOLESALE", y2025: 389, y2026: 440, y2027: 487 },
  { channel: "MARKETPLACE", y2025: 172, y2026: 216, y2027: 261 },
];
const participation = [
  { year: "2025", bm: 69, ecom: 22.5, whs: 5.9, mktp: 2.6 },
  { year: "2026", bm: 67.9, ecom: 23.2, whs: 6, mktp: 2.9 },
  { year: "2027", bm: 66.5, ecom: 24.3, whs: 6, mktp: 3.2 },
];
const brands = ["TOTAL", "HUSH PUPPIES", "D.HOUSE", "HUSH PUPPIES KIDS", "ROCKFORD", "COLUMBIA", "MOUNTAIN HARDWEAR", "MERRELL", "FUNSPORT", "BSOUL", "CATERPILLAR", "SHOE EXPRESS", "AZALEIA", "7VEINTE", "VANS", "LOP", "CROCS", "UNDER ARMOUR", "PARFOIS", "BILLABONG", "OTROS"];
type AnalyticsFilter = { classification: string; channel: string; brand: string; gender: string; className: string; opening: string };
const defaultFilter: AnalyticsFilter = { classification: "YTD", channel: "Todos", brand: "ROCKFORD", gender: "Todos", className: "CALZADO", opening: "Todas" };

function factorFor(filter: AnalyticsFilter) {
  const brandIndex = Math.max(1, brands.indexOf(filter.brand));
  const brandFactor = filter.brand === "TOTAL" ? 1.42 : 0.78 + (brandIndex % 7) * 0.055;
  const classFactor = filter.className === "CALZADO" ? 1 : filter.className === "VESTUARIO" ? 0.72 : 0.38;
  const openingFactor = filter.opening === "Todas" ? 1 : filter.opening === "SSS" ? 0.82 : filter.opening === "NS" ? 0.18 : 0.1;
  return brandFactor * classFactor * openingFactor;
}

function AnalyticsFilters({ roadmap = false, value, onChange }: { roadmap?: boolean; value: AnalyticsFilter; onChange: (value: AnalyticsFilter) => void }) {
  const field = (key: keyof AnalyticsFilter) => (event: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, [key]: event.target.value });
  return <div className="analytics-filters">
    {roadmap && <label>CLASIFICACIÓN<select value={value.classification} onChange={field("classification")}><option>YTD</option><option>YTG</option><option>Total</option></select></label>}
    <label>CANAL<select value={value.channel} onChange={field("channel")}><option>Todos</option><option>Retail</option><option>Ecommerce</option><option>Wholesale</option><option>Marketplace</option></select></label>
    <label>MARCA<select value={value.brand} onChange={field("brand")}>{brands.map((brand) => <option key={brand}>{brand}</option>)}</select></label>
    <label>GÉNERO<select value={value.gender} onChange={field("gender")}><option>Todos</option><option>Hombre</option><option>Mujer</option><option>Unisex</option><option>Niños</option></select></label>
    <label>CLASE<select value={value.className} onChange={field("className")}><option>CALZADO</option><option>VESTUARIO</option><option>ACCESORIOS</option></select></label>
    <label>APERTURA<select value={value.opening} onChange={field("opening")}><option>Todas</option><option>SSS</option><option>NS</option><option>Nueva</option><option>Remodelación</option><option>Cierre</option></select></label>
  </div>;
}

const KpiStrip = ({ roadmap = false }: { roadmap?: boolean }) => <div className="analytics-kpi-strip">
  <article><b>VENTA</b>{[["2027", roadmap ? "8.134" : "8.103"], ["2026", roadmap ? "7.342" : "7.368"], ["2025", roadmap ? "6.621" : "6.757"], ["27/26", "10,8%"], ["26/25", "10,9%"]].map(([label, value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}</article>
  <article><b>MARGEN</b>{[["2027", roadmap ? "55,4%" : "55,0%"], ["2026", "54,6%"], ["2025", "53,8%"], ["27/26", "0,8 pp"], ["26/25", "0,8 pp"]].map(([label, value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}</article>
</div>;

export function InventoryFlow() {
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [filter, setFilter] = useState(defaultFilter);
  const factor = factorFor(filter);
  const filteredInventory = useMemo(() => inventory.map((row) => ({ ...row, y2025: Math.round(row.y2025 * factor), y2026: Math.round(row.y2026 * factor), y2027: Math.round(row.y2027 * factor) })), [factor]);
  const exits: (string | number)[][] = [["Q1", 931, 842, 781, "10,6%"], ["Q2", 1214, 1102, 1033, "10,2%"], ["Q3", 812, 736, 678, "10,3%"], ["Q4", 1346, 1224, 1158, "10,0%"]];
  return <section className="analytics-page"><header className="analytics-header"><h1>Inventory Flow <em>2025–2027</em></h1><AnalyticsFilters value={filter} onChange={setFilter} /></header><div className="inventory-layout">
    <div className="inventory-left"><KpiStrip /><article className="analytics-card compact"><header><h2>Salidas a costo</h2><span>CLP MM</span></header><table><thead><tr><th>Quarter</th><th>2027</th><th>2026</th><th>2025</th><th>27/26</th></tr></thead><tbody>{exits.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody><tfoot><tr><td>Total</td><td>4.303</td><td>3.904</td><td>3.650</td><td>10,2%</td></tr></tfoot></table></article><article className="analytics-card arrivals"><header><h2>Llegadas 2027</h2><span>CALZADO</span></header><div>{months.slice(0, 6).map((month, index) => <span key={month}><small>{month}</small><b>{[302, 316, 828, 389, 112, 75][index]}</b></span>)}</div></article></div>
    <div className="inventory-right"><article className="analytics-card inventory-chart"><header><h2>Gross Inventory</h2><span>CLP MM</span></header><ResponsiveContainer width="100%" height={170}><BarChart data={filteredInventory}><CartesianGrid vertical={false} stroke="#e6e9ef" /><XAxis dataKey="month" tick={{ fontSize: 8, fill: "#53657a" }} /><YAxis hide /><Tooltip /><Legend wrapperStyle={{ fontSize: 8 }} /><Bar dataKey="y2025" stackId="a" fill="#8aa9c7" name="2025" /><Bar dataKey="y2026" stackId="a" fill="#243a5e" name="2026" /><Bar dataKey="y2027" stackId="a" fill="#0078d4" name="2027" /></BarChart></ResponsiveContainer></article><article className="analytics-card inventory-days"><header><h2>Inventory Days</h2><button type="button" onClick={() => setFormulaOpen((value) => !value)}>FÓRMULAS {formulaOpen ? "−" : "+"}</button></header>{Object.entries(inventoryDays).map(([year, values]) => <div className="days-row" key={year}><b>{year}</b>{values.map((value, index) => <span key={months[index]}><strong>{Math.round(value * (filter.opening === "Todas" ? 1 : .92))}</strong><small>{months[index]}</small></span>)}</div>)}</article>{formulaOpen && <FormulaDocumentation />}</div>
  </div></section>;
}

function FormulaDocumentation() {
  return <section className="formula-docs"><article><b>SFINAL</b><code>Stock inicial + Compras − Salidas a costo</code><p>Saldo final mensual valorizado.</p></article><article><b>Días financieros</b><code>SFINAL ÷ costo de venta diario</code><p>Cobertura financiera del inventario.</p></article><article><b>Días cobertura</b><code>SFINAL ÷ consumo futuro diario</code><p>Cobertura frente al consumo futuro.</p></article><article><b>GMROI</b><code>Margen bruto ÷ inventario promedio</code><p>Retorno por peso invertido.</p></article></section>;
}

export function RoadmapYoy() {
  const [filter, setFilter] = useState(defaultFilter);
  const factor = factorFor(filter);
  const filteredChannels = useMemo(() => channelSales.filter((row) => filter.channel === "Todos" || row.channel === (filter.channel === "Retail" ? "B&M" : filter.channel === "Ecommerce" ? "ECOMM" : filter.channel.toUpperCase())).map((row) => ({ ...row, y2025: Math.round(row.y2025 * factor), y2026: Math.round(row.y2026 * factor), y2027: Math.round(row.y2027 * factor) })), [filter, factor]);
  return <section className="analytics-page roadmap-page"><header className="analytics-header"><h1>ROADMAP 2025 - 2027 <em>Análisis YoY</em></h1><AnalyticsFilters roadmap value={filter} onChange={setFilter} /></header><div className="roadmap-grid"><article className="analytics-card"><header><h2>Desglose por canal · {filter.classification} 2027</h2></header><ResponsiveContainer width="100%" height={165}><BarChart data={filteredChannels}><CartesianGrid vertical={false} stroke="#e6e9ef" /><XAxis dataKey="channel" tick={{ fontSize: 8, fill: "#53657a" }} /><YAxis hide /><Tooltip /><Bar dataKey="y2027" fill="#0078d4" name="2027" /></BarChart></ResponsiveContainer></article><article className="analytics-card"><header><h2>Participaciones por canal</h2></header><ResponsiveContainer width="100%" height={165}><BarChart data={participation} layout="vertical"><XAxis type="number" hide domain={[0, 100]} /><YAxis type="category" dataKey="year" width={38} tick={{ fontSize: 8, fill: "#53657a" }} /><Tooltip formatter={(value) => `${value}%`} /><Bar dataKey="bm" stackId="a" fill="#a9b7c6" name="B&L" /><Bar dataKey="ecom" stackId="a" fill="#243a5e" name="ECOMM" /><Bar dataKey="whs" stackId="a" fill="#0078d4" name="WHS" /><Bar dataKey="mktp" stackId="a" fill="#d7e1ea" name="MKTP" /></BarChart></ResponsiveContainer></article><article className="analytics-card roadmap-comparison"><header><h2>Comparativa YoY por canal</h2></header><div>{filteredChannels.map((channel) => { const yoy = (channel.y2027 / channel.y2026 - 1) * 100; return <span key={channel.channel}><small>{channel.channel} YoY</small><strong className={yoy >= 0 ? "pos" : "neg"}>{yoy.toFixed(1)}%</strong><i style={{ height: `${Math.max(18, Math.min(75, channel.y2027 / 25))}px` }} /></span>; })}</div></article><article className="roadmap-summary"><KpiStrip roadmap /></article></div></section>;
}

function Matrix({ title, rows, inventoryMode = false }: { title: string; rows: [string, number[]][]; inventoryMode?: boolean }) {
  return <div className={`brand-matrix ${inventoryMode ? "inventory-matrix" : ""}`}><header><b>{title}</b>{months.map((month) => <span key={month}>{month}</span>)}<strong>{inventoryMode ? "PROM." : "TOTAL"}</strong></header>{rows.map(([label, values]) => <div className={inventoryMode && ["SFINAL", "Días Financieros", "Días Cobertura", "GMROI"].includes(label) ? "highlight" : label.includes("Var") ? "rate" : ""} key={label}><b>{label}</b>{values.map((value, index) => <span className={value < 0 ? "neg" : ""} key={index}>{label.includes("%") ? `${value.toLocaleString("es-CL")}%` : value.toLocaleString("es-CL", { maximumFractionDigits: 1 })}</span>)}<strong>{label.includes("Margen") ? `${(values.reduce((a, b) => a + b, 0) / 12).toFixed(1)}%` : label.includes("Var") ? "5,0%" : (inventoryMode ? values.reduce((a, b) => a + b, 0) / 12 : values.reduce((a, b) => a + b, 0)).toLocaleString("es-CL", { maximumFractionDigits: 1 })}</strong></div>)}</div>;
}

export function BrandSummary() {
  const [filter, setFilter] = useState(defaultFilter);
  const factor = factorFor(filter);
  const sales = [1402, 1822, 2007, 1641, 3326, 2589, 2542, 2374, 1387, 1570, 1407, 2296].map((value) => Math.round(value * factor));
  const opening = [9407, 10172, 9455, 8541, 7959, 7739, 6713, 5493, 4806, 4113, 5221, 4647].map((value) => Math.round(value * factor));
  const purchases = [1467, 194, 89, 239, 1443, 268, 52, 500, 0, 1893, 130, 40].map((value) => Math.round(value * factor));
  const exits = [-701, -911, -1003, -821, -1663, -1294, -1271, -1187, -694, -785, -704, -1148].map((value) => Math.round(value * factor));
  const closing = opening.map((value, index) => value + purchases[index] + exits[index]);
  const salesRows: [string, number[]][] = [["Ventas TY MM$", sales], ["Ventas LY MM$", sales.map((value) => Math.round(value / .95))], ["Var % TY/LY", sales.map(() => 5)], ["Margen TY %", sales.map(() => 50)], ["Margen LY %", sales.map(() => 49.2)]];
  const inventoryRows: [string, number[]][] = [["SINICIAL", opening], ["Compras", purchases], ["Salidas", exits], ["SFINAL", closing], ["Días Financieros", [435, 352, 294, 278, 228, 189, 151, 130, 116, 152, 139, 105]], ["Días Cobertura", [301, 279, 252, 235, 229, 198, 162, 142, 122, 154, 137, 105]], ["GMROI", [.8, 1, 1.1, 1.1, 1.4, 1.5, 1.6, 1.7, 1.8, 1.8, 1.8, 1.9]]];
  return <section className="analytics-page brand-summary"><header className="analytics-header"><h1>Brand {filter.brand}</h1><AnalyticsFilters value={filter} onChange={setFilter} /></header><Matrix title="Rolling Forecast" rows={salesRows} /><Matrix title="Inventarios MM$" rows={inventoryRows} inventoryMode /></section>;
}

export function LongTermPlan() {
  const outlook = [{ year: "2027", sales: 8134, margin: 55.4, inventory: 1716 }, { year: "2028", sales: 8915, margin: 56.1, inventory: 1780 }, { year: "2029", sales: 9698, margin: 56.7, inventory: 1842 }, { year: "2030", sales: 10574, margin: 57.2, inventory: 1908 }];
  return <section className="analytics-page roadmap-page"><header className="analytics-header"><h1>VISIÓN 2030 <em>Plan estratégico de largo plazo</em></h1></header><div className="roadmap-grid"><article className="analytics-card"><header><h2>Trayectoria de ventas · CLP MM</h2></header><ResponsiveContainer width="100%" height={190}><LineChart data={outlook}><CartesianGrid vertical={false} stroke="#e6e9ef" /><XAxis dataKey="year" /><YAxis hide /><Tooltip /><Line type="monotone" dataKey="sales" stroke="#0078d4" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></article><article className="analytics-card compact"><header><h2>Metas financieras</h2><span>2027–2030</span></header><table><thead><tr><th>Año</th><th>Venta</th><th>Margen</th><th>Inventario</th></tr></thead><tbody>{outlook.map((row) => <tr key={row.year}><td>{row.year}</td><td>{row.sales.toLocaleString("es-CL")}</td><td>{row.margin}%</td><td>{row.inventory.toLocaleString("es-CL")}</td></tr>)}</tbody></table></article><article className="analytics-card arrivals"><header><h2>Pilares 2030</h2><span>FOCOS</span></header><div>{[["Crecimiento", "+9,1% CAGR"], ["Margen", "+1,8 pp"], ["Digital", "30% mix"], ["Inventario", "≤ 90 días"]].map(([label, value]) => <span key={label}><small>{label}</small><b>{value}</b></span>)}</div></article><article className="roadmap-summary"><KpiStrip roadmap /></article></div></section>;
}
