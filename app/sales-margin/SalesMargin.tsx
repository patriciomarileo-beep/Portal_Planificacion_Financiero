"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  getSalesMarginSnapshot,
  loadSalesMargin,
  SalesMarginRequestError,
  type SalesMarginPayload as Payload,
  type SalesMarginRow as ApiRow,
} from "./sales-margin-data";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  Layers3,
  RefreshCw,
  Search,
  Store,
  Tags,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

type Scenario = "2020" | "2021" | "2022" | "2023" | "2024" | "2025" | "2026" | "2026P" | "2026E" | "2027P" | "2027E" | "2028P" | "2028E";
type ScenarioLabel = Scenario;
type View = "summary" | "channel" | "chainBrand" | "brand" | "brandChannel" | "brandClass";
type QuarterFilter = "ANUAL" | "Q1" | "Q2" | "Q3" | "Q4";
type Metric = { sales: number; marginAmount: number };
type ScenarioMetrics = Partial<Record<Scenario, Metric>>;

type DisplayRow = {
  key: string;
  primary: string;
  secondary: string;
  tertiary: string;
  metrics: ScenarioMetrics;
  total?: boolean;
};

const scenarios: { key: Scenario; label: ScenarioLabel }[] = [
  { key: "2020", label: "2020" },
  { key: "2021", label: "2021" },
  { key: "2022", label: "2022" },
  { key: "2023", label: "2023" },
  { key: "2024", label: "2024" },
  { key: "2025", label: "2025" },
  { key: "2026", label: "2026" },
  { key: "2026P", label: "2026P" },
  { key: "2026E", label: "2026E" },
  { key: "2027P", label: "2027P" },
  { key: "2027E", label: "2027E" },
  { key: "2028P", label: "2028P" },
  { key: "2028E", label: "2028E" },
];

const yearOptions = scenarios.map(({ label }) => label);

const currentDefaultYears: ScenarioLabel[] = ["2024", "2025", "2026P", "2026E", "2027P"];
const nextDefaultYears: ScenarioLabel[] = ["2025", "2026", "2027P", "2027E", "2028P", "2028E"];

const comparisons: { label: string; current: Scenario; previous: Scenario }[] = [
  { label: "21/20", current: "2021", previous: "2020" },
  { label: "22/21", current: "2022", previous: "2021" },
  { label: "23/22", current: "2023", previous: "2022" },
  { label: "24/23", current: "2024", previous: "2023" },
  { label: "25/24", current: "2025", previous: "2024" },
  { label: "26/25", current: "2026", previous: "2025" },
  { label: "26E/25", current: "2026E", previous: "2025" },
  { label: "26E/26P", current: "2026E", previous: "2026P" },
  { label: "27P/26", current: "2027P", previous: "2026" },
  { label: "27P/26E", current: "2027P", previous: "2026E" },
  { label: "27E/27P", current: "2027E", previous: "2027P" },
  { label: "28P/27E", current: "2028P", previous: "2027E" },
  { label: "28E/28P", current: "2028E", previous: "2028P" },
];

// Oculta temporalmente la vista sin eliminar su lógica ni sus estilos.
const SHOW_CHAIN_BRAND_VIEW = false;

const tabs = [
  { id: "summary" as const, label: "Consolidado", icon: BarChart3 },
  { id: "channel" as const, label: "Canal", icon: Store },
  { id: "chainBrand" as const, label: "Cadena × marca", icon: Store },
  { id: "brand" as const, label: "Marca", icon: Tags },
  { id: "brandChannel" as const, label: "Marca × canal", icon: Layers3 },
  { id: "brandClass" as const, label: "Marca × clase", icon: Boxes },
];

const visibleTabs = SHOW_CHAIN_BRAND_VIEW
  ? tabs
  : tabs.filter((tab) => tab.id !== "chainBrand");

const quarters: QuarterFilter[] = ["ANUAL", "Q1", "Q2", "Q3", "Q4"];
const monthLabels = ["", "ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const quarterMonths: Record<Exclude<QuarterFilter, "ANUAL">, number[]> = {
  Q1: [1, 2, 3],
  Q2: [4, 5, 6],
  Q3: [7, 8, 9],
  Q4: [10, 11, 12],
};

function MultiSelectFilter<T extends string>({
  label,
  plural,
  allLabel,
  options,
  selected,
  onChange,
}: {
  label: string;
  plural: string;
  allLabel: string;
  options: T[];
  selected: T[];
  onChange: (values: T[]) => void;
}) {
  const optionsId = useId();
  const [optionQuery, setOptionQuery] = useState("");
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);
  const toggle = (option: T) => onChange(
    selected.includes(option)
      ? selected.filter((value) => value !== option)
      : [...selected, option],
  );
  const selectionLabel = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? selected[0]
      : `${selected.length} ${plural}`;
  const visibleOptions = options.filter((option) =>
    option.toLocaleLowerCase("es").includes(optionQuery.trim().toLocaleLowerCase("es")),
  );
  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!visibleOptions.length) return;
      setActiveOptionIndex((currentIndex) => event.key === "ArrowDown"
        ? currentIndex < 0 ? 0 : (currentIndex + 1) % visibleOptions.length
        : currentIndex < 0 ? visibleOptions.length - 1 : (currentIndex - 1 + visibleOptions.length) % visibleOptions.length);
      return;
    }
    if (event.key === "Enter" && visibleOptions.length) {
      event.preventDefault();
      const optionIndex = activeOptionIndex >= 0 && activeOptionIndex < visibleOptions.length ? activeOptionIndex : 0;
      toggle(visibleOptions[optionIndex]);
    }
  };

  return <details data-dropdown name="portal-dropdown" className="chain-multiselect sales-margin-multiselect">
    <summary><span>{label}<strong>{selectionLabel}</strong></span><ChevronDown /></summary>
    <div id={optionsId} className="chain-options sales-margin-multiselect-options">
      <div className="sales-margin-option-search">
        <Search aria-hidden="true" />
        <input value={optionQuery} onChange={(event) => { setOptionQuery(event.target.value); setActiveOptionIndex(0); }} onKeyDown={handleSearchKeyDown} role="combobox" aria-autocomplete="list" aria-controls={optionsId} aria-expanded="true" placeholder={`Buscar ${label.toLocaleLowerCase("es")}`} aria-label={`Buscar ${label.toLocaleLowerCase("es")}`} />
      </div>
      <button type="button" className={selected.length === 0 ? "active" : ""} onClick={() => onChange([])}>{allLabel}</button>
      {visibleOptions.map((option, index) => <label key={option} className={activeOptionIndex === index ? "keyboard-active" : ""} onMouseEnter={() => setActiveOptionIndex(index)}>
        <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
        {option}
      </label>)}
      {visibleOptions.length === 0 && <small className="sales-margin-option-empty">Sin coincidencias</small>}
    </div>
  </details>;
}

const zeroMetric = (): Metric => ({ sales: 0, marginAmount: 0 });

const addMetric = (target: ScenarioMetrics, scenario: Scenario, metric: Metric) => {
  const current = target[scenario] ?? zeroMetric();
  target[scenario] = {
    sales: current.sales + metric.sales,
    marginAmount: current.marginAmount + metric.marginAmount,
  };
};

const sumMetrics = (rows: DisplayRow[]): ScenarioMetrics => {
  const result: ScenarioMetrics = {};
  for (const row of rows) {
    for (const { key } of scenarios) addMetric(result, key, row.metrics[key] ?? zeroMetric());
  }
  return result;
};

const groupedRows = (
  rows: ApiRow[],
  primaryOf: (row: ApiRow) => string,
  secondaryOf: (row: ApiRow) => string = () => "",
  tertiaryOf: (row: ApiRow) => string = () => "",
): DisplayRow[] => {
  const grouped = new Map<string, DisplayRow>();
  for (const row of rows) {
    if (!scenarios.some(({ key }) => key === row.scenario)) continue;
    const primary = primaryOf(row);
    const secondary = secondaryOf(row);
    const tertiary = tertiaryOf(row);
    const key = `${primary}\u0000${secondary}\u0000${tertiary}`;
    const current = grouped.get(key) ?? {
      key,
      primary,
      secondary,
      tertiary,
      metrics: {},
    };
    addMetric(current.metrics, row.scenario as Scenario, {
      sales: Number(row.sales) || 0,
      marginAmount: Number(row.marginAmount) || 0,
    });
    grouped.set(key, current);
  }
  return [...grouped.values()];
};

const indexRows = (rows: ApiRow[], keyOf: (row: ApiRow) => string) => {
  const index = new Map<string, ApiRow[]>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    const group = index.get(key);
    if (group) group.push(row);
    else index.set(key, [row]);
  }
  return index;
};

const buildDisplayRows = (rows: ApiRow[], view: View, quarterFilter: QuarterFilter = "ANUAL"): DisplayRow[] => {
  if (rows.length === 0) return [];

  if (quarterFilter !== "ANUAL") {
    const activeMonths = quarterMonths[quarterFilter];
    const activeMonthSet = new Set(activeMonths);
    const periodRows = (
      sourceRows: ApiRow[],
      keyPrefix: string,
      primary: string,
      secondary = "",
      periodLevel: "primary" | "secondary" | "tertiary" = "secondary",
    ): DisplayRow[] => {
      const totalMetrics: ScenarioMetrics = {};
      const metricsByMonth = new Map<number, ScenarioMetrics>();
      for (const row of sourceRows) {
        if (!scenarios.some(({ key }) => key === row.scenario)) continue;
        const scenario = row.scenario as Scenario;
        const metric = {
          sales: Number(row.sales) || 0,
          marginAmount: Number(row.marginAmount) || 0,
        };
        addMetric(totalMetrics, scenario, metric);
        if (!activeMonthSet.has(row.month)) continue;
        const monthMetrics = metricsByMonth.get(row.month) ?? {};
        addMetric(monthMetrics, scenario, metric);
        metricsByMonth.set(row.month, monthMetrics);
      }
      const rowForPeriod = (period: string, month: number | null, total = false): DisplayRow => ({
        key: `${keyPrefix}\u0000${period}`,
        primary: periodLevel === "primary" ? period : primary,
        secondary: periodLevel === "secondary" ? period : secondary,
        tertiary: periodLevel === "tertiary" ? period : "",
        metrics: month === null ? totalMetrics : metricsByMonth.get(month) ?? {},
        total,
      });
      return [
        ...activeMonths.map((month) => rowForPeriod(monthLabels[month], month)),
        rowForPeriod(periodLevel === "primary" ? `TOTAL ${quarterFilter}` : "TOTAL", null, true),
      ];
    };
    const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "es"));

    if (view === "summary") return periodRows(rows, quarterFilter, "", "", "primary");

    if (view === "channel") return unique(rows.map((row) => row.business)).flatMap((business) =>
      periodRows(rows.filter((row) => row.business === business), `channel-${business}`, business),
    );

    if (view === "brand") {
      const consolidated = periodRows(rows, "brand-consolidated", "CONSOLIDADO");
      const detail = unique(rows.map((row) => row.brand)).flatMap((brand) =>
        periodRows(rows.filter((row) => row.brand === brand), `brand-${brand}`, brand),
      );
      return [...detail, ...consolidated];
    }

    if (view === "chainBrand") {
      const rowsByChain = indexRows(rows, (row) => row.chain);
      const chains = unique([...rowsByChain.keys()]);
      const consolidated = periodRows(rows, "chain-brand-consolidated", "CONSOLIDADO", "TODAS LAS CADENAS", "tertiary");
      const detail = chains.flatMap((chain) => {
        const chainRows = rowsByChain.get(chain) ?? [];
        const rowsByBrand = indexRows(chainRows, (row) => row.brand);
        const brands = unique([...rowsByBrand.keys()]);
        return [
          ...brands.flatMap((brand) => periodRows(
            rowsByBrand.get(brand) ?? [],
            `chain-brand-${chain}-${brand}`,
            chain,
            brand,
            "tertiary",
          )),
          ...periodRows(chainRows, `chain-brand-${chain}-total`, chain, "TOTAL CADENA", "tertiary"),
        ];
      });
      return [...detail, ...consolidated];
    }

    const secondaryOf = view === "brandChannel" ? (row: ApiRow) => row.business : (row: ApiRow) => row.class;
    const consolidatedLabel = view === "brandChannel" ? "TODOS LOS CANALES" : "TODAS LAS CLASES";
    const pairs = [...new Map(rows.map((row) => {
      const secondary = secondaryOf(row);
      return [`${row.brand}\u0000${secondary}`, { primary: row.brand, secondary }] as const;
    })).values()].sort((a, b) =>
      a.primary.localeCompare(b.primary, "es") || a.secondary.localeCompare(b.secondary, "es"),
    );
    const consolidated = periodRows(rows, `${view}-consolidated`, "CONSOLIDADO", consolidatedLabel, "tertiary");
    const detail = pairs.flatMap(({ primary, secondary }) => periodRows(
      rows.filter((row) => row.brand === primary && secondaryOf(row) === secondary),
      `${view}-${primary}-${secondary}`,
      primary,
      secondary,
      "tertiary",
    ));
    return [...detail, ...consolidated];
  }

  if (view === "summary") {
    const quarters = groupedRows(rows, (row) => row.quarter);
    const quarter = (name: string) => quarters.find((row) => row.primary === name) ?? {
      key: name,
      primary: name,
      secondary: "",
      tertiary: "",
      metrics: {},
    };
    const q1 = quarter("Q1"), q2 = quarter("Q2"), q3 = quarter("Q3"), q4 = quarter("Q4");
    const annualRows: DisplayRow[] = [
      q1,
      q2,
      { key: "H1", primary: "1ER SEMESTRE", secondary: "", tertiary: "", metrics: sumMetrics([q1, q2]), total: true },
      q3,
      q4,
      { key: "H2", primary: "2DO SEMESTRE", secondary: "", tertiary: "", metrics: sumMetrics([q3, q4]), total: true },
      { key: "TOTAL", primary: "TOTAL", secondary: "", tertiary: "", metrics: sumMetrics([q1, q2, q3, q4]), total: true },
    ];
    return annualRows;
  }

  if (view === "channel") {
    const quarterOrder = ["Q1", "Q2", "Q3", "Q4"];
    const detail = groupedRows(rows, (row) => row.business, (row) => row.quarter).sort((a, b) =>
      a.primary.localeCompare(b.primary, "es") || quarterOrder.indexOf(a.secondary) - quarterOrder.indexOf(b.secondary),
    );
    const businesses = [...new Set(detail.map((row) => row.primary))];
    return businesses.flatMap((business) => {
      const businessRows = detail.filter((row) => row.primary === business);
      return [
        ...businessRows,
        { key: `${business}\u0000TOTAL`, primary: business, secondary: "TOTAL", tertiary: "", metrics: sumMetrics(businessRows), total: true },
      ];
    });
  }

  if (view === "chainBrand") {
    const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    const rowsByChain = indexRows(rows, (row) => row.chain);
    const chains = unique([...rowsByChain.keys()]);
    const consolidated = groupedRows(rows, () => "CONSOLIDADO", () => "TODAS LAS CADENAS")[0];
    const detail = chains.flatMap((chain) => {
      const chainRows = rowsByChain.get(chain) ?? [];
      const chainTotal = groupedRows(chainRows, () => chain, () => "TOTAL CADENA")[0];
      const brands = groupedRows(chainRows, () => chain, (row) => row.brand).sort((a, b) =>
        a.secondary.localeCompare(b.secondary, "es"),
      );
      return [
        ...brands,
        { ...chainTotal, key: `${chain}\u0000TOTAL`, total: true },
      ];
    });
    return [
      ...detail,
      { ...consolidated, key: "chainBrand\u0000TOTAL", total: true },
    ];
  }

  const detail = groupedRows(
    rows,
    (row) => row.brand,
    view === "brandChannel" ? (row) => row.business : view === "brandClass" ? (row) => row.class : undefined,
  ).sort((a, b) =>
    a.primary.localeCompare(b.primary, "es") || a.secondary.localeCompare(b.secondary, "es"),
  );
  return [
    ...detail,
    { key: `${view}\u0000TOTAL`, primary: "CONSOLIDADO", secondary: "", tertiary: "", metrics: sumMetrics(detail), total: true },
  ];
};

const salesFormatter = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatSales = (value: number) => Number.isFinite(value) ? salesFormatter.format(value) : "—";
const marginPercent = (metric: Metric) => metric.sales ? metric.marginAmount / metric.sales : null;
const formatPercent = (value: number | null) => value === null || !Number.isFinite(value)
  ? "—"
  : `${percentFormatter.format(value * 100)}%`;
const variation = (current: Metric, previous: Metric) => previous.sales ? current.sales / previous.sales - 1 : null;

const variationClass = (value: number | null) => value === null
  ? "neutral"
  : value > 0.0005
    ? "positive"
    : value < -0.0005
      ? "negative"
      : "neutral";

export default function SalesMargin({
  sessionScope,
  refreshKey = 0,
  onRefreshComplete,
}: {
  sessionScope: string;
  refreshKey?: number;
  onRefreshComplete?: () => void;
}) {
  const [payload, setPayload] = useState<Payload | null>(() => getSalesMarginSnapshot(sessionScope));
  const [view, setView] = useState<View>("summary");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [channelFilter, setChannelFilter] = useState<string[]>([]);
  const [chainFilter, setChainFilter] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<ScenarioLabel[] | null>(null);
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>("ANUAL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const handledRefreshKey = useRef(refreshKey);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPayload(await loadSalesMargin(sessionScope, true));
    } catch (loadError) {
      if (loadError instanceof SalesMarginRequestError && [401, 403].includes(loadError.status)) setPayload(null);
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar Venta & Margen.");
    } finally {
      setLoading(false);
    }
  }, [sessionScope]);

  useEffect(() => {
    let active = true;
    void loadSalesMargin(sessionScope)
      .then((body) => { if (active) setPayload(body); })
      .catch((loadError) => {
        if (active) {
          if (loadError instanceof SalesMarginRequestError && [401, 403].includes(loadError.status)) setPayload(null);
          setError(loadError instanceof Error ? loadError.message : "No fue posible cargar Venta & Margen.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionScope]);

  useEffect(() => {
    if (refreshKey === handledRefreshKey.current) return;
    handledRefreshKey.current = refreshKey;
    void load().finally(() => onRefreshComplete?.());
  }, [refreshKey, load, onRefreshComplete]);

  const filterOptions = useMemo(() => {
    const rows = payload?.rows ?? [];
    const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    return {
      brands: unique(rows.map((row) => row.brand)),
      channels: unique(rows.map((row) => row.business)),
      chains: unique(rows.map((row) => row.chain)),
      classes: unique(rows.map((row) => row.class)),
    };
  }, [payload]);
  const filteredSourceRows = useMemo(() => (payload?.rows ?? []).filter((row) =>
    (brandFilter.length === 0 || brandFilter.includes(row.brand))
    && (channelFilter.length === 0 || channelFilter.includes(row.business))
    && (view !== "chainBrand" || (Boolean(row.chain) && (chainFilter.length === 0 || chainFilter.includes(row.chain))))
    && (classFilter.length === 0 || classFilter.includes(row.class))
    && (quarterFilter === "ANUAL" || row.quarter === quarterFilter)
  ), [payload, view, brandFilter, channelFilter, chainFilter, classFilter, quarterFilter]);
  const allRows = useMemo(
    () => buildDisplayRows(filteredSourceRows, view, quarterFilter),
    [filteredSourceRows, view, quarterFilter],
  );
  const visibleRows = allRows;
  const defaultYearFilter = useMemo(
    () => (payload?.rows ?? []).some(({ scenario }) => scenario === "2028P" || scenario === "2028E")
      ? nextDefaultYears
      : currentDefaultYears,
    [payload],
  );
  const effectiveYearFilter = yearFilter ?? defaultYearFilter;
  const visibleScenarios = useMemo(
    () => effectiveYearFilter.length === 0
      ? scenarios
      : scenarios.filter(({ label }) => effectiveYearFilter.includes(label)),
    [effectiveYearFilter],
  );
  const visibleComparisons = useMemo(() => {
    if (effectiveYearFilter.length === 0) return comparisons;
    const visibleScenarioKeys = new Set(visibleScenarios.map(({ key }) => key));
    return comparisons.filter(({ current, previous }) =>
      visibleScenarioKeys.has(current) && visibleScenarioKeys.has(previous)
    );
  }, [effectiveYearFilter, visibleScenarios]);
  const totalMetrics = useMemo(() => {
    const rows = groupedRows(filteredSourceRows, () => "TOTAL");
    return rows[0]?.metrics ?? {};
  }, [filteredSourceRows]);
  const metric2027 = totalMetrics["2027P"] ?? zeroMetric();
  const metric2026 = totalMetrics["2026E"] ?? zeroMetric();
  const salesGrowth = variation(metric2027, metric2026);
  const margin2027 = marginPercent(metric2027);
  const margin2026 = marginPercent(metric2026);
  const marginGrowth = margin2027 !== null && margin2026
    ? margin2027 / margin2026 - 1
    : null;
  const refreshedAt = payload?.refreshedAt
    ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(`${payload.refreshedAt}T12:00:00`))
    : "Sin fecha informada";
  const hasMonthBreakdown = quarterFilter !== "ANUAL";
  const hasSecondary = view === "channel" || view === "chainBrand" || view === "brandChannel" || view === "brandClass" || (hasMonthBreakdown && view === "brand");
  const hasTertiary = hasMonthBreakdown && (view === "chainBrand" || view === "brandChannel" || view === "brandClass");
  const visibleDataColumnCount = visibleScenarios.length * 2 + visibleComparisons.length;
  const needsExpandedYearLayout = visibleDataColumnCount > 14;
  const expandedTableMinWidth = (() => {
    const primaryWidth = view === "summary" ? 100 : 140;
    const secondaryWidth = hasSecondary ? 100 : 0;
    const tertiaryWidth = hasTertiary ? 70 : 0;
    return primaryWidth
      + secondaryWidth
      + tertiaryWidth
      + visibleScenarios.length * 120
      + visibleComparisons.length * 72;
  })();
  const primaryLabel = view === "summary" ? "Período" : view === "channel" ? "Canal" : view === "chainBrand" ? "Cadena" : "Marca";
  const secondaryLabel = view === "channel" || (view === "brand" && hasMonthBreakdown) ? "Período" : view === "chainBrand" ? "Marca" : view === "brandChannel" ? "Canal" : "Clase";
  const mergePrimaryCells = view === "channel" || view === "chainBrand" || view === "brandChannel" || view === "brandClass" || (hasMonthBreakdown && view === "brand");
  const mergeSecondaryCells = hasTertiary;
  const primaryRowSpan = (index: number) => {
    if (!mergePrimaryCells) return 1;
    const row = visibleRows[index];
    if (index > 0 && visibleRows[index - 1].primary === row.primary) return 0;
    let span = 1;
    while (visibleRows[index + span]?.primary === row.primary) span += 1;
    return span;
  };
  const secondaryRowSpan = (index: number) => {
    if (!mergeSecondaryCells) return 1;
    const row = visibleRows[index];
    const previous = visibleRows[index - 1];
    if (previous?.primary === row.primary && previous.secondary === row.secondary) return 0;
    let span = 1;
    while (
      visibleRows[index + span]?.primary === row.primary
      && visibleRows[index + span]?.secondary === row.secondary
    ) span += 1;
    return span;
  };
  const activeFilterCount = brandFilter.length
    + channelFilter.length
    + (view === "chainBrand" ? chainFilter.length : 0)
    + classFilter.length
    + (yearFilter === null ? 0 : Math.max(yearFilter.length, 1))
    + (quarterFilter === "ANUAL" ? 0 : 1);
  const clearFilters = () => {
    setBrandFilter([]);
    setChannelFilter([]);
    setChainFilter([]);
    setClassFilter([]);
    setYearFilter(null);
    setQuarterFilter("ANUAL");
  };
  const initialLoading = loading && !payload;

  return <section className="sales-margin-module">
    <header className="sales-margin-hero">
      <div>
        <label>PLANIFICACIÓN FINANCIERA · PRESUPUESTO 2027</label>
        <h1>Venta <em>& Margen</em></h1>
        <p>Lectura consolidada por período, canal, marca y clase con datos directos de BigQuery.</p>
      </div>
      <aside className="sales-margin-hero-meta">
        <b>INFORME EN MM$</b>
        <small>ACTUALIZACIÓN FUENTE · {payload ? refreshedAt : "Consultando…"}</small>
      </aside>
    </header>

    {error && <div className="sales-margin-state error" role="alert">
      <strong>No pudimos cargar el informe</strong><p>{error}</p><button type="button" onClick={() => void load()}>Reintentar</button>
    </div>}
    <>
      <div className="sales-margin-kpis" aria-busy={loading}>
        <article>
          <div className="sales-margin-kpi-head"><small>VENTA 2027P</small><BarChart3 /></div>
          <div className="sales-margin-kpi-value"><b>{!payload ? "…" : `$${formatSales(metric2027.sales)}`}</b><span>MM$</span></div>
          <div className={`sales-margin-kpi-variation ${variationClass(salesGrowth)}`}>
            <small>VAR. 27P / 26E</small>
            <strong>{salesGrowth !== null && (salesGrowth < 0 ? <TrendingDown /> : <TrendingUp />)} {!payload ? "…" : formatPercent(salesGrowth)}</strong>
          </div>
        </article>
        <article>
          <div className="sales-margin-kpi-head"><small>MARGEN 2027P</small><BarChart3 /></div>
          <div className="sales-margin-kpi-value"><b>{!payload ? "…" : formatPercent(margin2027)}</b><span>MG %</span></div>
          <div className={`sales-margin-kpi-variation ${variationClass(marginGrowth)}`}>
            <small>VAR. 27P / 26E</small>
            <strong>{marginGrowth !== null && (marginGrowth < 0 ? <TrendingDown /> : <TrendingUp />)} {!payload ? "…" : formatPercent(marginGrowth)}</strong>
          </div>
        </article>
      </div>

      <div className="sales-margin-panel">
        <nav className="sales-margin-tabs" aria-label="Vistas de Venta y Margen">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return <button type="button" key={tab.id} className={view === tab.id ? "active" : ""} onClick={() => setView(tab.id)}>
              <Icon /><span>{tab.label}</span>
            </button>;
          })}
        </nav>
        <div className={`sales-margin-toolbar${view === "chainBrand" ? " with-chain-filter" : ""}`}>
          <div className="sales-margin-toolbar-title"><small>DETALLE DEL INFORME</small><h2>{visibleTabs.find((tab) => tab.id === view)?.label}</h2></div>
          <MultiSelectFilter label="MARCA" plural="MARCAS" allLabel="TODAS" options={filterOptions.brands} selected={brandFilter} onChange={setBrandFilter} />
          <MultiSelectFilter label="CANAL" plural="CANALES" allLabel="TODOS" options={filterOptions.channels} selected={channelFilter} onChange={setChannelFilter} />
          {view === "chainBrand" && <MultiSelectFilter label="CADENA" plural="CADENAS" allLabel="TODAS" options={filterOptions.chains} selected={chainFilter} onChange={setChainFilter} />}
          <MultiSelectFilter label="CLASE" plural="CLASES" allLabel="TODAS" options={filterOptions.classes} selected={classFilter} onChange={setClassFilter} />
          <MultiSelectFilter label="AÑO" plural="AÑOS" allLabel="TODOS" options={yearOptions} selected={effectiveYearFilter} onChange={setYearFilter} />
          <div className="quarter-filter sales-margin-quarter-filter" aria-label="Trimestre de Venta y Margen">
            {quarters.map((quarter) => <button type="button" key={quarter} className={quarterFilter === quarter ? "active" : ""} onClick={() => setQuarterFilter(quarter)}>{quarter}</button>)}
          </div>
          <div className="sales-margin-toolbar-right">
            {activeFilterCount > 0 && <button className="sales-margin-clear" type="button" onClick={clearFilters} title="Limpiar filtros"><X /> {activeFilterCount}</button>}
          </div>
        </div>

        {loading && <div className="sales-margin-loading-status" role="status"><RefreshCw className="spin" />{payload ? "Actualizando datos… Puedes seguir revisando el informe." : "Cargando datos… Puedes elegir la vista y el período."}</div>}
        <div className="sales-margin-table-wrap" aria-busy={initialLoading}>
            <table
              className={`sales-margin-table view-${view}${hasMonthBreakdown ? " period-breakdown" : ""}${needsExpandedYearLayout ? " expanded-years" : ""}`}
              style={needsExpandedYearLayout ? { minWidth: expandedTableMinWidth } : undefined}
            >
              <thead>
                <tr>
                  <th rowSpan={2}>{primaryLabel}</th>
                  {hasSecondary && <th rowSpan={2} className={hasMonthBreakdown && (view === "channel" || view === "brand") ? "period-dimension" : ""}>{secondaryLabel}</th>}
                  {hasTertiary && <th rowSpan={2} className="period-dimension">Período</th>}
                  {visibleScenarios.map(({ key, label }) => <th key={key} colSpan={2} className={`scenario scenario-${key.replace("_", "-")}`}>{label}</th>)}
                  {visibleComparisons.map((item) => <th key={item.label} rowSpan={2} className="comparison">{item.label}<small>Var. venta</small></th>)}
                </tr>
                <tr>
                  {visibleScenarios.flatMap(({ key }) => [
                    <th key={`${key}-sales`} className="subhead">Ventas</th>,
                    <th key={`${key}-margin`} className="subhead">Mg %</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {initialLoading && Array.from({ length: 7 }, (_, index) => <tr key={`loading-${index}`} aria-hidden="true">
                  <th><span className="sales-margin-placeholder" /></th>
                  {Array.from({ length: (hasSecondary ? 1 : 0) + (hasTertiary ? 1 : 0) + visibleScenarios.length * 2 + visibleComparisons.length }, (_, cell) => <td key={cell}><span className="sales-margin-placeholder" /></td>)}
                </tr>)}
                {visibleRows.map((row, index) => {
                  const rowSpan = primaryRowSpan(index);
                  const secondarySpan = secondaryRowSpan(index);
                  return <tr key={row.key} className={row.total ? "total" : ""}>
                  {rowSpan > 0 && <th scope={mergePrimaryCells ? "rowgroup" : "row"} rowSpan={rowSpan}>{row.primary}</th>}
                  {hasSecondary && secondarySpan > 0 && <td rowSpan={secondarySpan} className={`dimension${hasMonthBreakdown && (view === "channel" || view === "brand") ? " period-dimension" : ""}`}>{row.secondary || "—"}</td>}
                  {hasTertiary && <td className="dimension period-dimension">{row.tertiary || "—"}</td>}
                  {visibleScenarios.flatMap(({ key }) => {
                    const metric = row.metrics[key];
                    return [
                      <td key={`${key}-sales`} className="number">{metric ? formatSales(metric.sales) : "—"}</td>,
                      <td key={`${key}-margin`} className="number margin">{metric ? formatPercent(marginPercent(metric)) : "—"}</td>,
                    ];
                  })}
                  {visibleComparisons.map((item) => {
                    const current = row.metrics[item.current];
                    const previous = row.metrics[item.previous];
                    const value = current && previous ? variation(current, previous) : null;
                    return <td key={item.label} className={`number variance ${variationClass(value)}`}>{formatPercent(value)}</td>;
                  })}
                </tr>})}
              </tbody>
            </table>
        </div>
        {!loading && !error && payload && visibleRows.length === 0 && <div className="sales-margin-empty">No hay registros que coincidan con la búsqueda.</div>}
        <footer>
          <span><b>FUENTE</b> forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_CONSOLIDADA</span>
          <span>Referencia funcional: {payload?.sourceSheet}</span>
        </footer>
      </div>
    </>
  </section>;
}
