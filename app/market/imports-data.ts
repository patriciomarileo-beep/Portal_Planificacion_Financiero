type Row = Record<string, string | number | null>;
type Metric = "cantidad" | "us_fob";
type Totals = Record<Metric, number>;

export function aggregateImportRows(rows: Row[]) {
  const items = new Map<string, Map<number, Totals>>();
  const totals = new Map<number, Totals>();
  for (const row of rows) {
    const item = String(row.item);
    const year = Number(row.anio);
    let years = items.get(item);
    if (!years) { years = new Map(); items.set(item, years); }
    const value = years.get(year) ?? { cantidad: 0, us_fob: 0 };
    const total = totals.get(year) ?? { cantidad: 0, us_fob: 0 };
    for (const metric of ["cantidad", "us_fob"] as const) {
      const amount = Number(row[metric] ?? 0);
      if (Number.isFinite(amount)) { value[metric] += amount; total[metric] += amount; }
    }
    years.set(year, value);
    totals.set(year, total);
  }
  return {
    items: [...items.keys()],
    valueFor: (item: string, year: number, metric: Metric) => items.get(item)?.get(year)?.[metric] ?? 0,
    totalFor: (year: number, metric: Metric) => totals.get(year)?.[metric] ?? 0,
  };
}
