"use client";

import { useMemo, useState } from "react";
import { Download, SlidersHorizontal } from "lucide-react";
import type { BaseRow } from "../base-consolidada";
import { usePrivateData } from "../private-data-context";
import { buildForecast2030, type ForecastYear } from "../forecast-2028-2030";

type DisplayYear = 2026 | 2027 | ForecastYear;
type Annual = { sales: number; margin: number; payroll: number; rent: number; general: number; fourWalls: number; adminFee: number; commercialFee: number; netResult: number };
type ExitCost = { direct: number; notice: number; legal: number; installations: null; total: number };
type StoreProjection = { code: string; chain: string; store: string; contractEnd: string | null; years: Record<DisplayYear, Annual>; exit: ExitCost };
const years: DisplayYear[] = [2026, 2027, 2028, 2029, 2030];
const forecastYears: ForecastYear[] = [2028, 2029, 2030];
const empty = (): Annual => ({ sales: 0, margin: 0, payroll: 0, rent: 0, general: 0, fourWalls: 0, adminFee: 0, commercialFee: 0, netResult: 0 });
const money = (value: number) => `${value < 0 ? "-" : ""}$${Math.round(Math.abs(value) / 1000).toLocaleString("es-CL")}`;
const contractYear = (value: string | null) => value ? Number(value.match(/(20\d{2})/)?.[1] ?? 9999) : 9999;

function historicalStores(baseConsolidada: BaseRow[]) {
  const map = new Map<string, { chain: string; store: string; years: Record<2026 | 2027, Annual> }>();
  for (const row of baseConsolidada) {
    if ((row[0] !== 2026 && row[0] !== 2027) || (row[2] !== "ANUAL" && row[1] !== "TOTAL")) continue;
    const code = String(row[3]);
    if (!map.has(code)) map.set(code, { chain: String(row[4] ?? ""), store: String(row[5] ?? code), years: { 2026: empty(), 2027: empty() } });
    const value = map.get(code)!.years[row[0] as 2026 | 2027];
    value.sales += Number(row[6] ?? 0); value.margin += Number(row[7] ?? 0); value.payroll -= Math.abs(Number(row[8] ?? 0)); value.rent -= Math.abs(Number(row[9] ?? 0)); value.general += Number(row[10] ?? 0);
    value.adminFee -= Math.abs(Number(row[12] ?? 0)); value.commercialFee -= Math.abs(Number(row[13] ?? 0));
    value.fourWalls += Number(row[17] ?? (Number(row[7] ?? 0) - Math.abs(Number(row[8] ?? 0)) - Math.abs(Number(row[9] ?? 0)) + Number(row[10] ?? 0)));
    value.netResult = value.fourWalls + value.adminFee + value.commercialFee;
  }
  return map;
}

export default function StoreSensitivity() {
  const { baseConsolidada, storeContractEnd } = usePrivateData();
  const [macroAdjustment, setMacroAdjustment] = useState(0), [payrollGrowth, setPayrollGrowth] = useState(6), [contractLimit, setContractLimit] = useState(2030);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const rows = useMemo(() => buildForecast2030(baseConsolidada, { scenarioAdjustment: macroAdjustment / 100, payrollGrowth: payrollGrowth / 100 }), [baseConsolidada, macroAdjustment, payrollGrowth]);
  const stores = useMemo(() => {
    const history = historicalStores(baseConsolidada), map = new Map<string, StoreProjection>();
    history.forEach((value, code) => map.set(code, { code, chain: value.chain, store: value.store, contractEnd: storeContractEnd[code] ?? null, years: { 2026: value.years[2026], 2027: value.years[2027], 2028: empty(), 2029: empty(), 2030: empty() }, exit: { direct: 0, notice: 0, legal: 0, installations: null, total: 0 } }));
    rows.forEach((row) => {
      if (!map.has(row.code)) map.set(row.code, { code: row.code, chain: row.chain, store: row.store, contractEnd: storeContractEnd[row.code] ?? null, years: { 2026: empty(), 2027: empty(), 2028: empty(), 2029: empty(), 2030: empty() }, exit: { direct: 0, notice: 0, legal: 0, installations: null, total: 0 } });
      const target = map.get(row.code)!, annual = target.years[row.year];
      annual.sales += row.sales; annual.margin += row.margin; annual.payroll += row.payroll; annual.rent += row.rent; annual.general += row.general; annual.fourWalls += row.fourWalls;
    });
    map.forEach((store) => {
      forecastYears.forEach((year) => { const baseFee = store.years[2027]; const scale = baseFee.sales ? store.years[year].sales / baseFee.sales : 1; store.years[year].adminFee = baseFee.adminFee * scale; store.years[year].commercialFee = baseFee.commercialFee * scale; store.years[year].netResult = store.years[year].fourWalls + store.years[year].adminFee + store.years[year].commercialFee; });
      const monthlyPayroll = Math.abs(store.years[2028].payroll) / 12;
      const direct = Math.abs(store.years[2028].rent) * Math.max(0, Math.min(3, contractYear(store.contractEnd) - 2027));
      const notice = monthlyPayroll, legal = monthlyPayroll * 4.25;
      store.exit = { direct, notice, legal, installations: null, total: direct + notice + legal };
    });
    return [...map.values()].filter((store) => store.years[2027].sales || store.years[2028].sales);
  }, [rows, baseConsolidada, storeContractEnd]);
  const candidates = stores.filter((store) => forecastYears.some((year) => store.years[year].fourWalls < 0) && contractYear(store.contractEnd) <= contractLimit);
  const totals = (year: DisplayYear, removed: boolean) => stores.reduce((sum, store) => { if (closed.has(store.code) !== removed) return sum; const value = store.years[year]; Object.keys(sum).forEach((key) => sum[key as keyof Annual] += value[key as keyof Annual]); return sum; }, empty());
  const redistributed = (year: DisplayYear) => { const remaining = totals(year, false), removed = totals(year, true); remaining.adminFee += removed.adminFee; remaining.commercialFee += removed.commercialFee; remaining.netResult = remaining.fourWalls + remaining.adminFee + remaining.commercialFee; return remaining; };
  const removedAfterRedistribution = (year: DisplayYear) => { const value = totals(year, true); value.adminFee = 0; value.commercialFee = 0; value.netResult = value.fourWalls; return value; };
  const toggle = (code: string) => setClosed((current) => { const next = new Set(current); if (next.has(code)) next.delete(code); else next.add(code); return next; });
  const exportBase = () => { const headers = ["Año","Mes","CC","Cadena","Tienda","Venta","Margen","Remuneraciones","Arriendo","Gastos directos","Four Walls","Crecimiento","Mg %","Modelo"]; const html = `<table><tr>${headers.map((item) => `<th>${item}</th>`).join("")}</tr>${rows.map((row) => `<tr>${[row.year,row.month,row.code,row.chain,row.store,row.sales,row.margin,row.payroll,row.rent,row.general,row.fourWalls,row.salesGrowth,row.marginRate,row.model].map((value) => `<td>${value}</td>`).join("")}</tr>`).join("")}</table>`; const link=document.createElement("a"); link.href=URL.createObjectURL(new Blob(["\ufeff",html],{type:"application/vnd.ms-excel"})); link.download="Forecast_B&L_2028_2030.xls"; link.click(); URL.revokeObjectURL(link.href); };
  return <section className="sensitivity-page">
    <div className="title sensitivity-title"><div><i>05</i><span><h2>Sensibilidad de tiendas</h2><p>Resultados 2026–2027, proyección SARIMAX macro 2028–2030 y simulación de cierres</p></span></div><button className="export-button" onClick={exportBase}><Download /> EXPORTAR BASE 2028–2030</button></div>
    <section className="sensitivity-controls panel"><label><SlidersHorizontal /> AJUSTE ESCENARIO<input type="number" step="0.5" value={macroAdjustment} onChange={(e)=>setMacroAdjustment(Number(e.target.value))}/><span>% sobre SARIMAX</span></label><label>REMUNERACIONES<input type="number" step="0.5" value={payrollGrowth} onChange={(e)=>setPayrollGrowth(Number(e.target.value))}/><span>% anual</span></label><label className="contract-slider">VENCIMIENTO HASTA <b>{contractLimit}</b><input type="range" min="2025" max="2038" value={contractLimit} onChange={(e)=>setContractLimit(Number(e.target.value))}/><small>2025 — 2038</small></label><label>MODELO DE VENTA<b>SARIMAX + PIB · IPC · USD</b></label><article><small>Candidatas</small><strong>{candidates.length}</strong></article><article><small>Cierres ON</small><strong>{closed.size}</strong></article><article><small>Sin fecha contrato</small><strong>{stores.filter((store)=>!store.contractEnd).length}</strong></article></section>
    <section className="panel sensitivity-candidates"><div className="monitor-head"><div><label>DECISIÓN DE RED</label><h3>Candidatas a cierre</h3><p>Four Walls negativo y vencimiento contractual hasta {contractLimit}</p></div></div><div className="scroll"><table className="detail-table compact-table"><thead><tr><th>CIERRE</th><th>CC</th><th>CADENA / TIENDA</th><th>FIN CONTRATO</th>{years.map((year)=><th key={year}>FW {year}</th>)}<th>COSTOS DIRECTOS</th><th>DOTACIÓN · AVISO</th><th>DOTACIÓN · LEGAL</th><th>INSTALACIONES</th><th>COSTO SALIDA</th></tr></thead><tbody>{candidates.map((store)=><tr className={closed.has(store.code)?"closure-selected":""} key={store.code}><td><button className={`closure-toggle ${closed.has(store.code)?"on":""}`} onClick={()=>toggle(store.code)}>{closed.has(store.code)?"ON":"OFF"}</button></td><td>{store.code}</td><td><b>{store.chain}</b><small>{store.store}</small></td><td className={!store.contractEnd?"missing-contract":""}>{store.contractEnd??"FALTA FECHA"}</td>{years.map((year)=><td className={store.years[year].fourWalls<0?"neg":"pos"} key={year}>{money(store.years[year].fourWalls)}</td>)}<td>{money(-store.exit.direct)}</td><td>{money(-store.exit.notice)}</td><td>{money(-store.exit.legal)}</td><td className="exit-pending">—</td><td><b>{money(-store.exit.total)}</b></td></tr>)}</tbody></table></div></section>
    <div className="two sensitivity-results"><section className="panel"><div className="monitor-head"><div><label>ESCENARIO</label><h3>P&L Brick post cierres</h3><p>Fees redistribuidos entre tiendas abiertas</p></div></div><SensitivityTable values={years.map(redistributed)}/></section><section className="panel"><div className="monitor-head"><div><label>IMPACTO</label><h3>P&L retirado</h3><p>Fees transferidos al resto de la red</p></div></div><SensitivityTable values={years.map(removedAfterRedistribution)}/></section></div>
    <div className="sensitivity-note"><b>Composición del costo de salida:</b> costos directos = arriendo anual 2028 por años remanentes, limitado a 3; aviso = 1 remuneración mensual; legal = 4,25 remuneraciones mensuales (supuesto transitorio hasta cargar antigüedad y dotación individual); instalaciones = saldo por depreciar, visible pero pendiente. El total excluye instalaciones mientras no exista dato. Los fees de administración y comercial se redistribuyen en la red abierta.</div>
  </section>;
}

function SensitivityTable({values}:{values:Annual[]}) { const lines:[string,keyof Annual][]=[["Ventas","sales"],["Margen","margin"],["Remuneraciones","payroll"],["Arriendos","rent"],["Gastos directos","general"],["Four Walls","fourWalls"],["Fee administración redistribuido","adminFee"],["Fee comercial redistribuido","commercialFee"],["Resultado después de fees","netResult"]]; return <table><thead><tr><th>Cuenta</th>{years.map((year)=><th key={year}>{year}</th>)}</tr></thead><tbody>{lines.map(([label,key])=><tr key={key}><td>{label}</td>{values.map((value,index)=><td key={years[index]}>{money(value[key])}</td>)}</tr>)}</tbody></table>; }
