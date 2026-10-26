"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type CellValueChangedEvent, type ColDef, type ICellRendererParams, type ValueFormatterParams, type ValueGetterParams, type ValueSetterParams } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ChevronDown, ChevronRight, Download, Percent, TrendingUp, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { initialPlanningRows, planningMonths, type PlanningMonth, type PlanningRow } from "./planning-data";

ModuleRegistry.registerModules([AllCommunityModule]);
type MetricKey = "sales" | "marginPct";

const cloneRows = (rows: PlanningRow[]) => rows.map((row) => ({ ...row, values: Object.fromEntries(planningMonths.map((month) => [month, { ...row.values[month] }])) as PlanningRow["values"] }));
const childrenOf = (rows: PlanningRow[], id: string) => rows.filter((row) => row.parentId === id);

export function calculateRollUp(source: PlanningRow[], nodeId: string): PlanningRow[] {
  const rows = cloneRows(source);
  const aggregate = (parentId: string) => {
    const parent = rows.find((row) => row.id === parentId);
    const children = childrenOf(rows, parentId);
    if (!parent || !children.length) return;
    for (const month of planningMonths) {
      const sales = children.reduce((sum, child) => sum + child.values[month].sales, 0);
      const marginAmount = children.reduce((sum, child) => sum + child.values[month].sales * child.values[month].marginPct / 100, 0);
      parent.values[month] = { sales, marginPct: sales ? marginAmount / sales * 100 : 0 };
    }
    if (parent.parentId) aggregate(parent.parentId);
  };
  const node = rows.find((row) => row.id === nodeId);
  if (node?.parentId) aggregate(node.parentId);
  else if (node) aggregate(node.id);
  return rows;
}

export function calculateAllocateDown(source: PlanningRow[], nodeId: string, month: PlanningMonth, metric: MetricKey, newValue: number): PlanningRow[] {
  const rows = cloneRows(source);
  const distribute = (parentId: string, target: number) => {
    const children = childrenOf(rows, parentId);
    if (!children.length) return;
    if (metric === "marginPct") {
      children.forEach((child) => { child.values[month].marginPct = target; distribute(child.id, target); });
      return;
    }
    const currentTotal = children.reduce((sum, child) => sum + Math.max(0, child.values[month].sales), 0);
    children.forEach((child, index) => {
      const weight = currentTotal ? Math.max(0, child.values[month].sales) / currentTotal : 1 / children.length;
      child.values[month].sales = index === children.length - 1
        ? target - children.slice(0, -1).reduce((sum, prior) => sum + prior.values[month].sales, 0)
        : target * weight;
      distribute(child.id, child.values[month].sales);
    });
  };
  const node = rows.find((row) => row.id === nodeId);
  if (!node) return rows;
  node.values[month][metric] = newValue;
  distribute(nodeId, newValue);
  return calculateRollUp(rows, nodeId);
}

const initializeRollups = (source: PlanningRow[]) => {
  let rows = cloneRows(source);
  for (const parent of [...rows].sort((a, b) => b.level - a.level).filter((row) => childrenOf(rows, row.id).length)) rows = calculateRollUp(rows, parent.id);
  return rows;
};

const hierarchyRenderer = (params: ICellRendererParams<PlanningRow>) => {
  const row = params.data;
  if (!row) return "";
  const hasChildren = Boolean(params.context.hasChildren(row.id));
  return <button className="planning-tree-cell" style={{ paddingLeft: `${row.level * 18}px` }} onClick={() => hasChildren && params.context.toggle(row.id)}>{hasChildren ? row.expanded ? <ChevronDown /> : <ChevronRight /> : <span className="tree-dot" />}<span><b>{row.label}</b><small>{row.hierarchy.join(" › ")}</small></span></button>;
};

export default function FinancialPlanningGrid({ visibleMonths = [...planningMonths], planLabel = "NY 2027" }: { visibleMonths?: PlanningMonth[]; planLabel?: string }) {
  const [rows, setRows] = useState<PlanningRow[]>(() => initializeRollups(initialPlanningRows));
  const [metricView, setMetricView] = useState<MetricKey>("sales");
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");
  const hasChildren = (id: string) => rows.some((row) => row.parentId === id);
  const visibleRows = useMemo(() => rows.filter((row) => {
    let parentId = row.parentId;
    while (parentId) {
      const parent = rows.find((candidate) => candidate.id === parentId);
      if (!parent?.expanded) return false;
      parentId = parent.parentId;
    }
    return true;
  }), [rows]);
  const toggle = (id: string) => setRows((current) => current.map((row) => row.id === id ? { ...row, expanded: !row.expanded } : row));
  const columns = useMemo<ColDef<PlanningRow>[]>(() => [
    { headerName: "JERARQUÍA PRODUCTO / CANAL", pinned: "left", width: 260, minWidth: 240, sortable: false, editable: false, cellRenderer: hierarchyRenderer },
    ...visibleMonths.map((month) => metricView === "sales"
      ? { headerName: month, colId: `${month}_sales`, flex: 1, minWidth: 92, type: "numericColumn", editable: true, valueGetter: ({ data }: ValueGetterParams<PlanningRow>) => data?.values[month].sales ?? 0, valueSetter: ({ data, newValue }: ValueSetterParams<PlanningRow>) => { if (!data) return false; data.values[month].sales = Number(newValue) || 0; return true; }, valueFormatter: ({ value }: ValueFormatterParams<PlanningRow>) => `$${Number(value || 0).toLocaleString("es-CL", { maximumFractionDigits: 0 })}` }
      : { headerName: month, colId: `${month}_marginPct`, flex: 1, minWidth: 82, type: "numericColumn", editable: true, valueGetter: ({ data }: ValueGetterParams<PlanningRow>) => data?.values[month].marginPct ?? 0, valueSetter: ({ data, newValue }: ValueSetterParams<PlanningRow>) => { if (!data) return false; data.values[month].marginPct = Math.max(0, Math.min(100, Number(newValue) || 0)); return true; }, valueFormatter: ({ value }: ValueFormatterParams<PlanningRow>) => `${Number(value || 0).toFixed(1)}%` }),
    metricView === "sales"
      ? { headerName: "TOTAL", width: 125, type: "numericColumn", editable: false, valueGetter: ({ data }) => visibleMonths.reduce((sum, month) => sum + (data?.values[month].sales ?? 0), 0), valueFormatter: ({ value }) => `$${Number(value || 0).toLocaleString("es-CL", { maximumFractionDigits: 0 })}` }
      : { headerName: "PROM. POND.", width: 125, type: "numericColumn", editable: false, valueGetter: ({ data }) => { const sales = visibleMonths.reduce((sum, month) => sum + (data?.values[month].sales ?? 0), 0); const margin = visibleMonths.reduce((sum, month) => sum + (data?.values[month].sales ?? 0) * (data?.values[month].marginPct ?? 0) / 100, 0); return sales ? margin / sales * 100 : 0; }, valueFormatter: ({ value }) => `${Number(value || 0).toFixed(1)}%` },
  ], [visibleMonths, metricView]);
  const onCellValueChanged = (event: CellValueChangedEvent<PlanningRow>) => {
    const match = event.column.getColId().match(/^(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)_(sales|marginPct)$/);
    if (!match || !event.data) return;
    const month = match[1] as PlanningMonth;
    const metric = match[2] as MetricKey;
    const value = Number(event.newValue) || 0;
    setRows((current) => hasChildren(event.data!.id)
      ? calculateAllocateDown(current, event.data!.id, month, metric, value)
      : calculateRollUp(current.map((row) => row.id === event.data!.id ? { ...row, values: event.data!.values } : row), event.data!.id));
  };
  const exportExcel = () => {
    const output = rows.map((row) => ({ ID: row.id, Padre: row.parentId ?? "", Jerarquia: row.hierarchy.join(" > "), ...Object.fromEntries(planningMonths.flatMap((month) => [[`${month}_Venta`, row.values[month].sales], [`${month}_MargenPct`, row.values[month].marginPct]])) }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(output), "Planificación");
    XLSX.writeFile(book, "toolbox-ap-planificacion-2027.xlsx");
  };
  const importExcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError("");
    try {
      if (!/\.xlsx?$/i.test(file.name) || file.size > 5 * 1024 * 1024) throw new Error("Selecciona un archivo Excel de hasta 5 MB.");
      const book = XLSX.read(await file.arrayBuffer(), { sheets: 0, sheetRows: 5001, cellFormula: false, cellHTML: false, bookVBA: false });
      const sheet = book.Sheets[book.SheetNames[0]];
      if (!sheet) throw new Error("El archivo no contiene una hoja válida.");
      const input = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);
      if (input.length > 5000) throw new Error("El archivo excede las 5000 filas permitidas.");
      const values = new Map(input.map((item) => [String(item.ID), item]));
      const number = (value: unknown) => {
        const result = Number(value);
        if (!Number.isFinite(result) || Math.abs(result) > 1e15) throw new Error("El archivo contiene valores numéricos inválidos.");
        return result;
      };
      const updated = initializeRollups(rows.map((row) => {
        const source = values.get(row.id);
        if (!source) return row;
        const next = cloneRows([row])[0];
        planningMonths.forEach((month) => { next.values[month] = { sales: number(source[`${month}_Venta`] ?? next.values[month].sales), marginPct: number(source[`${month}_MargenPct`] ?? next.values[month].marginPct) }; });
        return next;
      }));
      setRows(updated);
    } catch (error) { setImportError(error instanceof Error ? error.message : "No fue posible importar el archivo."); }
    event.target.value = "";
  };
  return <section className="toolbox-grid-card">
    <header><div><span>PLANNING FOCUS · {planLabel}</span><h2>Planificación financiera por jerarquía</h2><p>Edita una celda hija para consolidar o una fila padre para distribuir proporcionalmente.</p></div><div className="planning-grid-actions"><div className="planning-metric-toggle"><button type="button" className={metricView === "sales" ? "active" : ""} onClick={() => setMetricView("sales")}><TrendingUp /> VENTA</button><button type="button" className={metricView === "marginPct" ? "active" : ""} onClick={() => setMetricView("marginPct")}><Percent /> MARGEN</button></div><input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={importExcel} /><button type="button" onClick={() => fileRef.current?.click()}><Upload /> IMPORTAR</button><button type="button" className="primary" onClick={exportExcel}><Download /> XLSX</button></div></header>
    {importError && <p role="alert">{importError}</p>}
    <div className="planning-legend"><span><i className="editable" />Celdas editables</span><span><i className="rollup" />Roll Up automático</span><span><i className="allocate" />Allocate Down proporcional</span></div>
    <div className="planning-grid ag-theme-quartz"><AgGridReact<PlanningRow> theme="legacy" rowData={visibleRows} columnDefs={columns} defaultColDef={{ resizable: true, suppressMovable: true }} getRowId={({ data }) => data.id} context={{ toggle, hasChildren }} onCellValueChanged={onCellValueChanged} rowClassRules={{ "planning-parent": ({ data }) => Boolean(data && data.level < 2), "planning-total": ({ data }) => data?.level === 0 }} animateRows /></div>
  </section>;
}
