export const planningMonths = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"] as const;
export type PlanningMonth = typeof planningMonths[number];
export type PlanningValue = { sales: number; marginPct: number };
export type PlanningRow = {
  id: string;
  parentId: string | null;
  hierarchy: string[];
  label: string;
  level: 0 | 1 | 2;
  expanded: boolean;
  values: Record<PlanningMonth, PlanningValue>;
};

const monthly = (sales: number, marginPct: number) => Object.fromEntries(
  planningMonths.map((month, index) => [month, { sales: Math.round(sales * (0.88 + index * 0.022)), marginPct }]),
) as Record<PlanningMonth, PlanningValue>;

export const initialPlanningRows: PlanningRow[] = [
  { id: "marca-forus", parentId: null, hierarchy: ["FORUS"], label: "Total Marca Forus", level: 0, expanded: true, values: monthly(0, 0) },
  { id: "calzado", parentId: "marca-forus", hierarchy: ["FORUS", "Calzado"], label: "Calzado", level: 1, expanded: true, values: monthly(0, 0) },
  { id: "calzado-retail", parentId: "calzado", hierarchy: ["FORUS", "Calzado", "Retail"], label: "Retail", level: 2, expanded: true, values: monthly(920, 46.5) },
  { id: "calzado-ecommerce", parentId: "calzado", hierarchy: ["FORUS", "Calzado", "Ecommerce"], label: "Ecommerce", level: 2, expanded: true, values: monthly(285, 49.2) },
  { id: "calzado-wholesale", parentId: "calzado", hierarchy: ["FORUS", "Calzado", "Wholesale"], label: "Wholesale", level: 2, expanded: true, values: monthly(410, 41.8) },
  { id: "vestuario", parentId: "marca-forus", hierarchy: ["FORUS", "Vestuario"], label: "Vestuario", level: 1, expanded: true, values: monthly(0, 0) },
  { id: "vestuario-retail", parentId: "vestuario", hierarchy: ["FORUS", "Vestuario", "Retail"], label: "Retail", level: 2, expanded: true, values: monthly(690, 52.1) },
  { id: "vestuario-ecommerce", parentId: "vestuario", hierarchy: ["FORUS", "Vestuario", "Ecommerce"], label: "Ecommerce", level: 2, expanded: true, values: monthly(240, 54.4) },
  { id: "vestuario-wholesale", parentId: "vestuario", hierarchy: ["FORUS", "Vestuario", "Wholesale"], label: "Wholesale", level: 2, expanded: true, values: monthly(330, 44.6) },
  { id: "accesorios", parentId: "marca-forus", hierarchy: ["FORUS", "Accesorios"], label: "Accesorios", level: 1, expanded: true, values: monthly(0, 0) },
  { id: "accesorios-retail", parentId: "accesorios", hierarchy: ["FORUS", "Accesorios", "Retail"], label: "Retail", level: 2, expanded: true, values: monthly(190, 57.3) },
  { id: "accesorios-ecommerce", parentId: "accesorios", hierarchy: ["FORUS", "Accesorios", "Ecommerce"], label: "Ecommerce", level: 2, expanded: true, values: monthly(95, 58.1) },
];
