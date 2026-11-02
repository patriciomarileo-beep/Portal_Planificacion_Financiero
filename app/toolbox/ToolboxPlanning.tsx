"use client";

import { useMemo, useState } from "react";
import { BarChart3, Boxes, CalendarRange, Database, GitBranch, Play, RotateCcw, Sigma, TableProperties } from "lucide-react";
import DataEntryForm from "./DataEntryForm";
import FinancialPlanningGrid from "./FinancialPlanningGrid";
import { planningMonths, type PlanningMonth } from "./planning-data";
import { BrandSummary, InventoryFlow, LongTermPlan, RoadmapYoy } from "./ToolboxAnalytics";

type Toast = { kind: "success" | "error"; message: string } | null;

export default function ToolboxPlanning() {
  const [toast, setToast] = useState<Toast>(null);
  const [toolboxView, setToolboxView] = useState<"summary" | "planning" | "inventory" | "roadmap" | "longterm">("planning");
  const [draft, setDraft] = useState({ hierarchy: "Clase", location: "Canal", year: "2027", period: "ANUAL", view: "Venta y Margen", plan: "NY", comparison: "TY" });
  const [focus, setFocus] = useState(draft);
  const monthsByPeriod: Record<string, PlanningMonth[]> = {
    ANUAL: [...planningMonths], S1: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN"], S2: ["JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],
    Q1: ["ENE", "FEB", "MAR"], Q2: ["ABR", "MAY", "JUN"], Q3: ["JUL", "AGO", "SEP"], Q4: ["OCT", "NOV", "DIC"],
  };
  const visibleMonths = useMemo(() => monthsByPeriod[focus.period] ?? [...planningMonths], [focus.period]);
  const updateDraft = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  return <section className={`toolbox-page ${toolboxView === "planning" ? "" : "results-mode"}`}>
    <div className="toolbox-hero"><div><label>TOOLBOX AP · MIGRACIÓN WEB</label><h1>Planifica, distribuye y consolida <em>en una sola vista.</em></h1><p>Edición jerárquica de venta y margen con captura estructurada hacia BigQuery.</p></div><div className="toolbox-hero-flow"><span><GitBranch /><b>Jerarquías</b><small>Marca → Clase → Canal</small></span><i>→</i><span><Sigma /><b>Motor financiero</b><small>Roll Up · Allocate Down</small></span><i>→</i><span><Database /><b>BigQuery</b><small>Disponibilidad en tiempo real</small></span></div></div>
    <nav className="toolbox-subtabs" aria-label="Módulos Toolbox AP"><button type="button" className={toolboxView === "planning" ? "active" : ""} onClick={() => setToolboxView("planning")}><TableProperties /> Planificación</button><button type="button" className={toolboxView === "summary" ? "active" : ""} onClick={() => setToolboxView("summary")}><BarChart3 /> Resumen Marca</button><button type="button" className={toolboxView === "inventory" ? "active" : ""} onClick={() => setToolboxView("inventory")}><Boxes /> Inventory Flow</button><button type="button" className={toolboxView === "roadmap" ? "active" : ""} onClick={() => setToolboxView("roadmap")}><BarChart3 /> Roadmap 2025–2027</button><button type="button" className={toolboxView === "longterm" ? "active" : ""} onClick={() => setToolboxView("longterm")}><CalendarRange /> Visión 2030</button></nav>
    {toolboxView === "planning" ? <><section className="planning-focus-panel">
      <header><div><label>PLANNING FOCUS</label><h2>Merchandise Planning</h2><p>Define el nivel de planificación antes de ejecutar la vista.</p></div><span>Ambiente: <b>Producción</b></span></header>
      <div className="planning-focus-fields">
        <label>JERARQUÍA DE PRODUCTO<select value={draft.hierarchy} onChange={(e) => updateDraft("hierarchy", e.target.value)}><option>Marca + Total</option><option>Marca</option><option>Clase</option><option>Género</option><option>Tipo</option></select><small>Marca → Clase → Género → Tipo</small></label>
        <label>LOCALIDAD<select value={draft.location} onChange={(e) => updateDraft("location", e.target.value)}><option>Canal</option><option>Cadena</option><option>Tienda</option></select><small>Canal → Cadena → Tienda</small></label>
        <label>PLAN PRINCIPAL<select value={draft.plan} onChange={(e) => updateDraft("plan", e.target.value)}><option>NY</option><option>OP</option><option>Presupuesto Revisado</option></select><small>Versión editable</small></label>
        <label>COMPARACIÓN<select value={draft.comparison} onChange={(e) => updateDraft("comparison", e.target.value)}><option>TY</option><option>LY</option><option>OP</option></select><small>Historia de referencia</small></label>
        <label>AÑO<select value={draft.year} onChange={(e) => updateDraft("year", e.target.value)}><option>2025</option><option>2026</option><option>2027</option></select><small>Horizonte del plan</small></label>
        <label>PERÍODO<select value={draft.period} onChange={(e) => updateDraft("period", e.target.value)}><option value="ANUAL">Año completo</option><option value="S1">Primer semestre</option><option value="S2">Segundo semestre</option><option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option></select><small>Dimensión temporal</small></label>
        <label>VISTA<select value={draft.view} onChange={(e) => updateDraft("view", e.target.value)}><option>Venta y Margen</option><option>Venta</option><option>Margen</option></select><small>Información a planificar</small></label>
        <div className="planning-focus-actions"><button type="button" onClick={() => setDraft({ hierarchy: "Clase", location: "Canal", year: "2027", period: "ANUAL", view: "Venta y Margen", plan: "NY", comparison: "TY" })}><RotateCcw /> RESTABLECER</button><button type="button" className="run" onClick={() => setFocus(draft)}><Play /> RUN</button></div>
      </div>
      <footer><span>Nivel: <b>{focus.hierarchy}</b></span><span>Localidad: <b>{focus.location}</b></span><span>Planes: <b>{focus.plan} {focus.year}</b> vs {focus.comparison}</span><span>Período: <b>{focus.period}</b></span><span>Vista: <b>{focus.view}</b></span></footer>
    </section>
    <div className="toolbox-workspace"><FinancialPlanningGrid visibleMonths={visibleMonths} planLabel={`${focus.plan} ${focus.year} · ${focus.period}`} /><DataEntryForm toast={toast} setToast={setToast} /></div></> : toolboxView === "summary" ? <BrandSummary /> : toolboxView === "inventory" ? <InventoryFlow /> : toolboxView === "roadmap" ? <RoadmapYoy /> : <LongTermPlan />}
  </section>;
}
