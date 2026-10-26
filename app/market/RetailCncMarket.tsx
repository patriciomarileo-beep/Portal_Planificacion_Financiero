"use client";

import { ArrowUpRight, Footprints, MonitorSmartphone, Shirt, Store } from "lucide-react";
import MarketTrendChart from "./MarketTrendChart";

const reports = {
  online: "/data/market/reports/cnc/ventas-online-retail-2T26.pdf",
  rm: "/data/market/reports/cnc/ventas-comercio-rm-julio-2026.pdf",
  comparable: "/data/market/reports/cnc/locales-equivalentes-julio-2026.pdf",
};
const quarters = ["1T24", "2T24", "3T24", "4T24", "1T25", "2T25", "3T25", "4T25", "1T26", "2T26"];
const months = ["Ene26", "Feb26", "Mar26", "Abr26", "May26", "Jun26", "Jul26"];
const charts = [
  { title: "Evolución del índice online", subtitle: "Índice nominal · promedio 2024 = 100 · sin alimentos", labels: quarters, unit: "puntos", report: reports.online, page: 1, lines: [{ name: "Retail online", color: "#2474bd", values: [82.7,118.5,86.1,112.6,86.8,121.6,82.2,126.1,90.6,126.2] }] },
  { title: "Participación online", subtitle: "Ventas online sobre total · operadores omnicanal", labels: quarters, unit: "%", report: reports.online, page: 5, lines: [{ name: "Vestuario / calzado", color: "#d06b31", values: [12.9,18.2,12.6,12.7,10.3,15.2,13,16,15,18.4] }, { name: "Total retail", color: "#2474bd", values: [21.4,25,24.2,26.6,22.5,25.8,23.4,28.5,24.2,24.4] }] },
  { title: "Ventas presenciales RM", subtitle: "Total locales · variación real anual", labels: months, unit: "%", report: reports.rm, page: 5, lines: [{ name: "Calzado", color: "#d06b31", values: [3.7,2.3,-11.3,-12.5,2.2,-2.5,13.4] }, { name: "Vestuario", color: "#2474bd", values: [8.6,12.5,3.6,4.4,6.2,4,9.6] }, { name: "Total comercio", color: "#748a83", values: [.5,1.4,-3.3,-1.6,1.2,-3.1,4.3] }] },
  { title: "Locales equivalentes", subtitle: "RM · variación real anual · julio provisorio", labels: months, unit: "%", report: reports.comparable, page: 2, lines: [{ name: "Calzado", color: "#d06b31", values: [7.8,7,-6.8,-11.6,6.3,-2.3,9.4] }, { name: "Vestuario", color: "#2474bd", values: [17.3,17.9,9.6,10.1,10.7,5.9,5.7] }, { name: "Total comercio", color: "#748a83", values: [3.3,3.7,-1,-.2,1.8,-3.3,2] }] },
];

export default function RetailCncMarket() {
  return <section className="market-page">
    <div className="market-title-row"><div><label>MERCADO · CÁMARA NACIONAL DE COMERCIO</label><h1>Calzado, vestuario y omnicanalidad</h1><p>Ventas online al 2T26 y comercio presencial de la Región Metropolitana a julio de 2026.</p></div><span className="market-source">FUENTE <b>CNC · INFORMES INCORPORADOS</b></span></div>
    <section className="cnc-analysis-top"><header><div><label>LECTURA EJECUTIVA · IMPACTO PARA FORUS</label><h2>Recuperación selectiva entre canales y categorías</h2></div><span>2T26 · JUL 2026</span></header><p className="analysis-lead">El mercado digital acelera en vestuario y calzado, mientras la venta física de la Región Metropolitana mantiene una recuperación irregular. Para Forus, la señal debe contrastarse con venta comparable, margen, disponibilidad por talla y devoluciones.</p><div className="market-insights"><article><span>01 · CALZADO FÍSICO</span><h3>Julio mejora, pero la base acumulada sigue exigente</h3><p>Calzado crece 13,4% real anual en julio para total locales. La lectura de tiendas Forus debe separar aperturas de crecimiento orgánico y revisar conversión y pares por boleta.</p></article><article><span>02 · VESTUARIO Y CALZADO ONLINE</span><h3>Mayor penetración con disciplina de margen</h3><p>La participación online sube de 15,2% a 18,4% entre 2T25 y 2T26. Seguir margen después de descuentos, despacho y devoluciones, además de quiebres de talla.</p></article><article><span>03 · OMNICANALIDAD</span><h3>Separar Cyber de la tendencia normal</h3><p>Evaluar eventos digitales junto con semanas sin campaña, retiro en tienda, rotación posterior y eventual canibalización entre e-commerce y locales físicos.</p></article></div></section>
    <div className="market-kpis">
      <article><i><Footprints /></i><span>CALZADO ONLINE · 2T26</span><strong className="positive">+9,9%</strong><small>Variación nominal anual</small></article>
      <article><i><Shirt /></i><span>VESTUARIO ONLINE · 2T26</span><strong className="positive">+20,7%</strong><small>Variación nominal anual</small></article>
      <article><i><Store /></i><span>CALZADO RM · JULIO</span><strong className="positive">+13,4%</strong><small>Variación real · total locales</small></article>
      <article><i><MonitorSmartphone /></i><span>PENETRACIÓN ONLINE</span><strong>18,4%</strong><small>Vestuario y calzado · 2T26</small></article>
    </div>
    <div className="market-grid cnc-grid">{charts.map((chart) => <article className="market-panel" key={chart.title}><header><div><label>EVOLUCIÓN</label><h2>{chart.title}</h2><p>{chart.subtitle}</p></div><span>{chart.unit}</span></header><MarketTrendChart labels={chart.labels} lines={chart.lines} unit={chart.unit} /><a className="market-document-link" href={`${chart.report}#page=${chart.page}`} target="_blank" rel="noreferrer">Abrir fuente CNC · página {chart.page}<ArrowUpRight /></a></article>)}</div>
  </section>;
}
