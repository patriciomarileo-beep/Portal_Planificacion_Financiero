"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  getSalesMarginSnapshot,
  loadSalesMargin,
  salesMarginDefaultYears,
  salesMarginYearOptions,
  SalesMarginRequestError,
  deriveDefaultScenarioYears,
  displayScenarioLabel,
  sortSalesMarginYears,
  type SalesMarginPayload as Payload,
  type SalesMarginRow as ApiRow,
  type SalesMarginYearStatus,
} from "./sales-margin-data";
import {
  BarChart3,
  BookOpen,
  Boxes,
  ChevronDown,
  ChevronRight,
  Layers3,
  RefreshCw,
  Search,
  Store,
  Tags,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import MonthPeriodFilter, { type MonthPeriod } from "../components/MonthPeriodFilter";

type Scenario = string;
type ScenarioLabel = string;

export type SalesMarginView = "summary" | "channel" | "chainBrand" | "brand" | "brandChannel" | "brandClass";
type QuarterFilter = MonthPeriod;
type Metric = { sales: number; marginAmount: number };
type ScenarioMetrics = Partial<Record<Scenario, Metric>>;

type DisplayRow = {
  key: string;
  primary: string;
  secondary: string;
  tertiary: string;
  metrics: ScenarioMetrics;
  total?: boolean;
  expandable?: boolean;
  parentKey?: string;
  depth?: number;
};

const validReportScenario = (scenario: string) =>
  /^20\d{2}(?:PS|[PEM])?$/.test(scenario);

const EMPTY_YEAR_CATALOG: SalesMarginYearStatus[] = [];

const currentDefaultYears: ScenarioLabel[] = [...salesMarginDefaultYears];

const comparisons: { label: string; current: Scenario; previous: Scenario }[] = [
  { label: "21/20", current: "2021", previous: "2020" },
  { label: "22/21", current: "2022", previous: "2021" },
  { label: "23/22", current: "2023", previous: "2022" },
  { label: "24/23", current: "2024", previous: "2023" },
  { label: "25/24", current: "2025", previous: "2024" },
  { label: "26E/25", current: "2026E", previous: "2025" },
  { label: "26E/26P", current: "2026E", previous: "2026P" },
  { label: "27P/26E", current: "2027P", previous: "2026E" },
  { label: "27E/27P", current: "2027E", previous: "2027P" },
];

// Expone la apertura de cadena normalizada que entrega BigQuery.
const SHOW_CHAIN_BRAND_VIEW = true;

const tabs = [
  { id: "summary" as const, label: "Consolidado", icon: BarChart3 },
  { id: "channel" as const, label: "Canal", icon: Store },
  { id: "brand" as const, label: "Marca", icon: Tags },
  { id: "brandChannel" as const, label: "Marca × canal", icon: Layers3 },
  { id: "brandClass" as const, label: "Marca × clase", icon: Boxes },
  { id: "chainBrand" as const, label: "Cadena × marca", icon: Store },
];

const visibleTabs = SHOW_CHAIN_BRAND_VIEW
  ? tabs
  : tabs.filter((tab) => tab.id !== "chainBrand");

const monthLabels = ["", "ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const monthOptions = monthLabels.slice(1).map((label, index) => ({ value: index + 1, label }));
const allMonths = monthOptions.map(({ value }) => value);
const chainPageSize = 8;
const quarterMonths: Record<Exclude<QuarterFilter, "ANUAL">, number[]> = {
  Q1: [1, 2, 3],
  Q2: [4, 5, 6],
  Q3: [7, 8, 9],
  Q4: [10, 11, 12],
  MES: [],
};

const uniqueLabels = (values: string[]) => [...new Set(values.filter(Boolean))]
  .sort((left, right) => left.localeCompare(right, "es"));

type SalesMarginFilters = {
  brands: string[];
  channels: string[];
  chains: string[];
  classes: string[];
};

type SalesMarginFilterKey = keyof SalesMarginFilters;

const filterValue = (row: ApiRow, key: SalesMarginFilterKey) => ({
  brands: row.brand,
  channels: row.business,
  chains: row.chain,
  classes: row.class,
})[key];

const salesMarginOptionsFor = (
  rows: ApiRow[],
  filters: SalesMarginFilters,
  target: SalesMarginFilterKey,
) => uniqueLabels(rows
  .filter((row) => (Object.keys(filters) as SalesMarginFilterKey[]).every((key) =>
    key === target || filters[key].length === 0 || filters[key].includes(filterValue(row, key)),
  ))
  .map((row) => filterValue(row, target)));

const dependentSelectionLabel = (
  options: readonly string[],
  plural: string,
  constrained: boolean,
) => constrained
  ? options.length === 1 ? options[0] : `${options.length} ${plural}`
  : undefined;

export const salesMarginBrandsForFilters = (
  rows: ApiRow[],
  selectedChannels: readonly string[],
  selectedClasses: readonly string[],
  selectedChains: readonly string[] = [],
) => salesMarginOptionsFor(rows, {
  brands: [],
  channels: [...selectedChannels],
  chains: [...selectedChains],
  classes: [...selectedClasses],
}, "brands");

export const salesMarginChannelsForFilters = (
  rows: ApiRow[],
  selectedBrands: readonly string[],
  selectedClasses: readonly string[],
  selectedChains: readonly string[] = [],
) => salesMarginOptionsFor(rows, {
  brands: [...selectedBrands],
  channels: [],
  chains: [...selectedChains],
  classes: [...selectedClasses],
}, "channels");

export const salesMarginChannelsForBrands = (
  rows: ApiRow[],
  selectedBrands: readonly string[],
) => salesMarginChannelsForFilters(rows, selectedBrands, []);

export const salesMarginClassesForFilters = (
  rows: ApiRow[],
  selectedBrands: readonly string[],
  selectedChannels: readonly string[],
  selectedChains: readonly string[] = [],
) => salesMarginOptionsFor(rows, {
  brands: [...selectedBrands],
  channels: [...selectedChannels],
  chains: [...selectedChains],
  classes: [],
}, "classes");

export const salesMarginChainsForFilters = (
  rows: ApiRow[],
  selectedBrands: readonly string[],
  selectedChannels: readonly string[],
  selectedClasses: readonly string[],
) => salesMarginOptionsFor(rows, {
  brands: [...selectedBrands],
  channels: [...selectedChannels],
  chains: [],
  classes: [...selectedClasses],
}, "chains");

export const reconcileSalesMarginFilters = (
  rows: ApiRow[],
  filters: SalesMarginFilters,
  changed: SalesMarginFilterKey,
): SalesMarginFilters => {
  const next: SalesMarginFilters = Object.fromEntries(
    Object.entries(filters).map(([key, values]) => [key, [...values]]),
  ) as SalesMarginFilters;
  const keys = Object.keys(next) as SalesMarginFilterKey[];

  for (let iteration = 0; iteration < keys.length; iteration += 1) {
    let stable = true;
    for (const key of keys) {
      if (key === changed || next[key].length === 0) continue;
      const allowed = new Set(salesMarginOptionsFor(rows, next, key));
      const valid = next[key].filter((value) => allowed.has(value));
      if (valid.length !== next[key].length) stable = false;
      next[key] = valid;
    }
    if (stable) break;
  }

  return next;
};

function MultiSelectFilter<T extends string>({
  label,
  plural,
  allLabel,
  options,
  selected,
  onChange,
  emptySelectionLabel,
  displayOption,
}: {
  label: string;
  plural: string;
  allLabel: string;
  options: T[];
  selected: T[];
  onChange: (values: T[]) => void;
  emptySelectionLabel?: string;
  displayOption?: (value: T) => string;
}) {
  const optionsId = useId();
  const optionLabel =
    displayOption ?? ((value: T) => value);
  const [optionQuery, setOptionQuery] = useState("");
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);
  const toggle = (option: T) => onChange(
    selected.includes(option)
      ? selected.filter((value) => value !== option)
      : [...selected, option],
  );
  const selectionLabel = selected.length === 0
    ? emptySelectionLabel ?? allLabel
    : selected.length === 1
      ? optionLabel(selected[0])
      : `${selected.length} ${plural}`;
  const visibleOptions = options.filter((option) =>
    optionLabel(option).toLocaleLowerCase("es").includes(optionQuery.trim().toLocaleLowerCase("es")),
  );
  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {

    
    if (event.key === "Escape") {
      event.preventDefault();

      const details = event.currentTarget.closest("details");

      if (details) {
        details.open = false;
        details.querySelector("summary")?.focus();
      }

      setActiveOptionIndex(-1);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      if (!visibleOptions.length) return;

      event.preventDefault();
      setActiveOptionIndex(
        event.key === "Home" ? 0 : visibleOptions.length - 1
      );
    return;
    }

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

  useEffect(() => {
    if (activeOptionIndex < 0) return;

  const active = document
    .getElementById(optionsId)
    ?.querySelector<HTMLElement>(
      "[data-keyboard-option].keyboard-active"
    );

    active?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "auto",
    });
  }, [activeOptionIndex, optionsId, optionQuery]);

  return <details data-dropdown name="portal-dropdown" className="chain-multiselect sales-margin-multiselect">
    <summary><span>{label}<strong>{selectionLabel}</strong></span><ChevronDown /></summary>
    <div id={optionsId} className="chain-options sales-margin-multiselect-options">
      <div className="sales-margin-option-search">
        <Search aria-hidden="true" />
        <input value={optionQuery} onChange={(event) => { setOptionQuery(event.target.value); setActiveOptionIndex(0); }} onKeyDown={handleSearchKeyDown} role="combobox" aria-autocomplete="list" aria-controls={optionsId} aria-expanded="true" placeholder={`Buscar ${label.toLocaleLowerCase("es")}`} aria-label={`Buscar ${label.toLocaleLowerCase("es")}`} />
      </div>
      <button type="button" className={selected.length === 0 ? "active" : ""} onClick={() => onChange([])}>{emptySelectionLabel ?? allLabel}</button>
      
      {visibleOptions.map((option, index) => <label
        key={option}
        data-keyboard-option
        className={activeOptionIndex === index ? "keyboard-active" : ""}
        onMouseEnter={() => setActiveOptionIndex(index)}
      >

        <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
        {optionLabel(option)}
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
    for (const [scenario, metric] of Object.entries(row.metrics)) {
      if (metric) addMetric(result, scenario, metric);
    }
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
    if (!validReportScenario(row.scenario)) continue;
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

export const buildDisplayRows = (
  rows: ApiRow[],
  view: SalesMarginView,
  quarterFilter: QuarterFilter = "ANUAL",
  selectedMonths: number[] = allMonths,
  showConsolidated = true,
): DisplayRow[] => {
  if (rows.length === 0) return [];

  if (quarterFilter !== "ANUAL") {
    const activeMonths = quarterFilter === "MES"
      ? [...selectedMonths].sort((left, right) => left - right)
      : quarterMonths[quarterFilter];
    const activeMonthSet = new Set(activeMonths);
    const periodRows = (
      sourceRows: ApiRow[],
      keyPrefix: string,
      primary: string,
      secondary = "",
      periodLevel: "primary" | "secondary" | "tertiary" = "secondary",
      total = false,
    ): DisplayRow[] => {
      const totalMetrics: ScenarioMetrics = {};
      const metricsByMonth = new Map<number, ScenarioMetrics>();
      for (const row of sourceRows) {
        if (!validReportScenario(row.scenario)) continue;
        if (!activeMonthSet.has(row.month)) continue;
        const scenario = row.scenario as Scenario;
        const metric = {
          sales: Number(row.sales) || 0,
          marginAmount: Number(row.marginAmount) || 0,
        };
        addMetric(totalMetrics, scenario, metric);
        const monthMetrics = metricsByMonth.get(row.month) ?? {};
        addMetric(monthMetrics, scenario, metric);
        metricsByMonth.set(row.month, monthMetrics);
      }
      const aggregateLabel = quarterFilter === "MES"
        ? activeMonths.length === 1 ? monthLabels[activeMonths[0]] : `${activeMonths.length} MESES`
        : quarterFilter;
      const childMonths = view === "summary" || activeMonths.length > 1 ? activeMonths : [];
      const parentKey = `${keyPrefix}\u0000aggregate-${quarterFilter}-${activeMonths.join("-")}`;
      const rowForPeriod = (period: string, metrics: ScenarioMetrics, keySuffix: string): DisplayRow => ({
        key: `${keyPrefix}\u0000${keySuffix}`,
        primary: periodLevel === "primary" ? period : primary,
        secondary: periodLevel === "secondary" ? period : secondary,
        tertiary: periodLevel === "tertiary" ? period : "",
        metrics,
      });
      return [
        {
          ...rowForPeriod(aggregateLabel, totalMetrics, `aggregate-${quarterFilter}-${activeMonths.join("-")}`),
          key: parentKey,
          total,
          expandable: childMonths.length > 0,
        },
        ...childMonths.map((month) => ({
          ...rowForPeriod(monthLabels[month], metricsByMonth.get(month) ?? {}, `month-${month}`),
          parentKey,
          depth: 1,
        })),
      ];
    };
    const totalForSelectedPeriod = (
      sourceRows: ApiRow[],
      keyPrefix: string,
      primary: string,
      secondary: string,
    ): DisplayRow => {
      const aggregate = periodRows(sourceRows, keyPrefix, primary, secondary, "tertiary", true)[0];
      return {
        ...aggregate,
        key: `${keyPrefix}\u0000TOTAL`,
        tertiary: "",
        expandable: false,
        parentKey: undefined,
        depth: undefined,
      };
    };
    const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "es"));

    if (view === "summary") {
      const parent = periodRows(rows, quarterFilter, "", "", "primary", true)[0];
      const children = periodRows(rows, quarterFilter, "", "", "primary").slice(1);
      return [
        ...children.map((row) => ({ ...row, parentKey: undefined, depth: undefined })),
        { ...parent, key: `summary\u0000TOTAL-${quarterFilter}`, primary: `TOTAL ${quarterFilter}`, expandable: false },
      ];
    }

    if (view === "channel") return unique(rows.map((row) => row.business)).flatMap((business) =>
      periodRows(rows.filter((row) => row.business === business), `channel-${business}`, business),
    );

    if (view === "brand") {
      const consolidated = periodRows(rows, "brand-consolidated", "CONSOLIDADO", "", "secondary", true);
      const detail = unique(rows.map((row) => row.brand)).flatMap((brand) =>
        periodRows(rows.filter((row) => row.brand === brand), `brand-${brand}`, brand),
      );
      return showConsolidated ? [...detail, ...consolidated] : detail;
    }

    if (view === "chainBrand") {
      const rowsByChain = indexRows(rows, (row) => row.chain);
      const chains = unique([...rowsByChain.keys()]);
      const consolidated = periodRows(rows, "chain-brand-consolidated", "CONSOLIDADO", "TODAS LAS CADENAS", "tertiary", true);
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
          ...periodRows(chainRows, `chain-brand-${chain}-total`, chain, "TOTAL", "tertiary", true),
        ];
      });
      return showConsolidated ? [...detail, ...consolidated] : detail;
    }

    const secondaryOf = view === "brandChannel" ? (row: ApiRow) => row.business : (row: ApiRow) => row.class;
    const consolidatedLabel = view === "brandChannel" ? "TODOS LOS CANALES" : "TODAS LAS CLASES";
    const pairs = [...new Map(rows.map((row) => {
      const secondary = secondaryOf(row);
      return [`${row.brand}\u0000${secondary}`, { primary: row.brand, secondary }] as const;
    })).values()].sort((a, b) =>
      a.primary.localeCompare(b.primary, "es") || a.secondary.localeCompare(b.secondary, "es"),
    );
    const consolidated = totalForSelectedPeriod(rows, `${view}-consolidated`, "CONSOLIDADO", consolidatedLabel);
    const brands = unique(pairs.map(({ primary }) => primary));
    const detail = brands.flatMap((brand) => {
      const brandPairs = pairs.filter(({ primary }) => primary === brand);
      const channelsOrClasses = brandPairs.flatMap(({ secondary }) => periodRows(
        rows.filter((row) => row.brand === brand && secondaryOf(row) === secondary),
        `${view}-${brand}-${secondary}`,
        brand,
        secondary,
        "tertiary",
      ));
      return [
        ...channelsOrClasses,
        totalForSelectedPeriod(
          rows.filter((row) => row.brand === brand),
          `${view}-${brand}-total`,
          brand,
          "TOTAL",
        ),
      ];
    });
    return showConsolidated ? [...detail, consolidated] : detail;
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
      const chainTotal = groupedRows(chainRows, () => chain, () => "TOTAL")[0];
      const brands = groupedRows(chainRows, () => chain, (row) => row.brand).sort((a, b) =>
        a.secondary.localeCompare(b.secondary, "es"),
      );
      return [
        ...brands,
        { ...chainTotal, key: `${chain}\u0000TOTAL`, total: true },
      ];
    });
    return showConsolidated
      ? [...detail, { ...consolidated, key: "chainBrand\u0000TOTAL", total: true }]
      : detail;
  }

  const detail = groupedRows(
    rows,
    (row) => row.brand,
    view === "brandChannel" ? (row) => row.business : view === "brandClass" ? (row) => row.class : undefined,
  ).sort((a, b) =>
    a.primary.localeCompare(b.primary, "es") || a.secondary.localeCompare(b.secondary, "es"),
  );
  if (view === "brandChannel" || view === "brandClass") {
    const brands = [...new Set(detail.map((row) => row.primary))];
    const rowsWithBrandTotals = brands.flatMap((brand) => {
      const brandRows = detail.filter((row) => row.primary === brand);
      return [
        ...brandRows,
        {
          key: `${view}\u0000${brand}\u0000TOTAL`,
          primary: brand,
          secondary: "TOTAL",
          tertiary: "",
          metrics: sumMetrics(brandRows),
          total: true,
        },
      ];
    });
    return [
      ...rowsWithBrandTotals,
      ...(showConsolidated
        ? [{ key: `${view}\u0000TOTAL`, primary: "CONSOLIDADO", secondary: "", tertiary: "", metrics: sumMetrics(detail), total: true }]
        : []),
    ];
  }
  if (!showConsolidated && view === "brand") return detail;
  return [
    ...detail,
    { key: `${view}\u0000TOTAL`, primary: "CONSOLIDADO", secondary: "", tertiary: "", metrics: sumMetrics(detail), total: true },
  ];
};

const salesFormatter = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const groupedBrandSalesFormatter = new Intl.NumberFormat("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
  initialView = "summary",
  refreshKey = 0,
  onRefreshComplete,
}: {
  sessionScope: string;
  initialView?: SalesMarginView;
  refreshKey?: number;
  onRefreshComplete?: () => void;
}) {
  const [payload, setPayload] = useState<Payload | null>(() => getSalesMarginSnapshot(sessionScope));
  const [view, setView] = useState<SalesMarginView>(initialView);
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [channelFilter, setChannelFilter] = useState<string[]>([]);
  const [chainFilter, setChainFilter] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<ScenarioLabel[] | null>(null);
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>("ANUAL");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [expandedTemporalRows, setExpandedTemporalRows] = useState<Set<string>>(() => new Set());
  const [chainPage, setChainPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [brandGlossaryOpen, setBrandGlossaryOpen] = useState(false);
  const handledRefreshKey = useRef(refreshKey);
  

  const yearCatalog =
    payload?.yearCatalog ?? EMPTY_YEAR_CATALOG;

  const yearOptions = useMemo(
    () => yearCatalog.length > 0
      ? sortSalesMarginYears(
          yearCatalog.map((item) => item.key)
        )
      : [...salesMarginYearOptions],
    [yearCatalog],
  );

  const defaultYearFilter = useMemo(
    () => yearCatalog.length > 0
      ? deriveDefaultScenarioYears(yearCatalog)
      : currentDefaultYears,
    [yearCatalog],
  );

  const labelForYear = useCallback(
    (key: string) => displayScenarioLabel(key, yearCatalog),
    [yearCatalog],
  );

  const scenarioDefinitions = useMemo(
    () => yearOptions.map((key) => ({
      key,
      label: labelForYear(key),
    })),
    [yearOptions, labelForYear],
  );

  const effectiveYearFilter =
    yearFilter ?? defaultYearFilter;

  const requestedYears = effectiveYearFilter.length === 0
    ? yearOptions
    : effectiveYearFilter;



  const includeChain = view === "chainBrand";
  const hasActiveChainFilter = includeChain && chainFilter.length > 0;
  const chainMonthsForRequest = useMemo(() => {
    if (!includeChain || quarterFilter === "ANUAL") return null;
    if (quarterFilter === "MES") return selectedMonths.length > 0 ? selectedMonths : null;
    return quarterMonths[quarterFilter];
  }, [includeChain, quarterFilter, selectedMonths]);
  const chainPeriodKey = chainMonthsForRequest?.length ? chainMonthsForRequest.join("-") : "annual";
  const payloadMatchesPeriod = !includeChain || payload?.chainPeriodKey === chainPeriodKey;
  const payloadRows = useMemo(
    () => payloadMatchesPeriod ? payload?.rows ?? [] : [],
    [payload, payloadMatchesPeriod],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPayload(await loadSalesMargin(sessionScope, true, requestedYears, includeChain, chainMonthsForRequest));
    } catch (loadError) {
      if (loadError instanceof SalesMarginRequestError && [401, 403].includes(loadError.status)) setPayload(null);
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar Venta & Margen.");
    } finally {
      setLoading(false);
    }
  }, [chainMonthsForRequest, includeChain, requestedYears, sessionScope]);

  useEffect(() => {
    let active = true;
    void loadSalesMargin(sessionScope, false, requestedYears, includeChain, chainMonthsForRequest)
      .then((body) => { if (active) setPayload(body); })
      .catch((loadError) => {
        if (active) {
          if (loadError instanceof SalesMarginRequestError && [401, 403].includes(loadError.status)) setPayload(null);
          setError(loadError instanceof Error ? loadError.message : "No fue posible cargar Venta & Margen.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [chainMonthsForRequest, includeChain, requestedYears, sessionScope]);

  useEffect(() => {
    if (refreshKey === handledRefreshKey.current) return;
    handledRefreshKey.current = refreshKey;
    void load().finally(() => onRefreshComplete?.());
  }, [refreshKey, load, onRefreshComplete]);

  useEffect(() => {
    if (!brandGlossaryOpen) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBrandGlossaryOpen(false);
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [brandGlossaryOpen]);

  const filterOptions = useMemo(() => {
    const rows = payloadRows;
    const activeChains = view === "chainBrand" ? chainFilter : [];
    return {
      brands: salesMarginBrandsForFilters(rows, channelFilter, classFilter, activeChains),
      channels: salesMarginChannelsForFilters(rows, brandFilter, classFilter, activeChains),
      chains: salesMarginChainsForFilters(rows, brandFilter, channelFilter, classFilter),
      classes: salesMarginClassesForFilters(rows, brandFilter, channelFilter, activeChains),
    };
  }, [payloadRows, view, brandFilter, channelFilter, chainFilter, classFilter]);
  const changeFilter = (changed: SalesMarginFilterKey, values: string[]) => {
    const rows = payloadRows;
    const next = reconcileSalesMarginFilters(rows, {
      brands: brandFilter,
      channels: channelFilter,
      chains: view === "chainBrand" ? chainFilter : [],
      classes: classFilter,
      [changed]: values,
    }, changed);
    setBrandFilter(next.brands);
    setChannelFilter(next.channels);
    if (view === "chainBrand") setChainFilter(next.chains);
    setClassFilter(next.classes);
    setChainPage(0);
  };
  const filteredSourceRows = useMemo(() => payloadRows.filter((row) =>
    (brandFilter.length === 0 || brandFilter.includes(row.brand))
    && (channelFilter.length === 0 || channelFilter.includes(row.business))
    && (view !== "chainBrand" || (Boolean(row.chain) && (chainFilter.length === 0 || chainFilter.includes(row.chain))))
    && (classFilter.length === 0 || classFilter.includes(row.class))
    && (quarterFilter === "ANUAL"
      || (quarterFilter === "MES" ? selectedMonths.includes(row.month) : row.quarter === quarterFilter))
  ), [payloadRows, view, brandFilter, channelFilter, chainFilter, classFilter, quarterFilter, selectedMonths]);
  const allRows = useMemo(
    () => buildDisplayRows(
      filteredSourceRows,
      view,
      quarterFilter,
      selectedMonths,
      view === "chainBrand" ? chainFilter.length !== 1 : brandFilter.length !== 1,
    ),
    [filteredSourceRows, view, quarterFilter, selectedMonths, brandFilter.length, chainFilter.length],
  );
  const chainNames = useMemo(() => view === "chainBrand"
    ? uniqueLabels(allRows.map((row) => row.primary).filter((name) => name !== "CONSOLIDADO"))
    : [], [allRows, view]);
  const chainPageCount = Math.max(1, Math.ceil(chainNames.length / chainPageSize));
  const safeChainPage = Math.min(chainPage, chainPageCount - 1);
  const chainPageStart = chainNames.length === 0 ? 0 : safeChainPage * chainPageSize + 1;
  const chainPageEnd = Math.min((safeChainPage + 1) * chainPageSize, chainNames.length);
  const paginatedRows = useMemo(() => {
    if (view !== "chainBrand" || chainPageCount <= 1) return allRows;
    const firstChain = safeChainPage * chainPageSize;
    const pageChains = new Set(chainNames.slice(firstChain, firstChain + chainPageSize));
    return allRows.filter((row) => row.primary === "CONSOLIDADO" || pageChains.has(row.primary));
  }, [allRows, chainNames, chainPageCount, safeChainPage, view]);
  const visibleRows = useMemo(() => paginatedRows.filter((row) =>
    !row.parentKey || expandedTemporalRows.has(row.parentKey)
  ), [paginatedRows, expandedTemporalRows]);

  const visibleScenarios = useMemo(
    () => effectiveYearFilter.length === 0
      ? scenarioDefinitions
      : scenarioDefinitions.filter(({ key }) =>
          effectiveYearFilter.includes(key)
        ),
    [effectiveYearFilter, scenarioDefinitions],
  );

  const visibleComparisons = useMemo(() => {
  const selectedKeys = new Set(
    visibleScenarios.map(({ key }) => key)
  );

  return comparisons
    .filter(({ current, previous }) =>
      selectedKeys.has(current) &&
      selectedKeys.has(previous)
    )
    .map(({ current, previous }) => ({
      current,
      previous,
      label:
        `${labelForYear(current).slice(2)}/` +
        `${labelForYear(previous).slice(2)}`,
    }));
}, [visibleScenarios, labelForYear]);


  
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
  const toggleTemporalRow = (key: string) => setExpandedTemporalRows((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const temporalCell = (row: DisplayRow, value: string) => {
    if (row.expandable) {
      const expanded = expandedTemporalRows.has(row.key);
      return <button
        type="button"
        className="sales-margin-drilldown-toggle"
        aria-expanded={expanded}
        onClick={() => toggleTemporalRow(row.key)}
      >
        {expanded ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        <span>{value || "—"}</span>
      </button>;
    }
    return <span className={row.depth ? "sales-margin-drilldown-label" : undefined}>{value || "—"}</span>;
  };
  const activeFilterCount = brandFilter.length
    + channelFilter.length
    + (view === "chainBrand" ? chainFilter.length : 0)
    + classFilter.length
    + (yearFilter === null ? 0 : Math.max(yearFilter.length, 1))
    + (quarterFilter === "ANUAL" ? 0 : 1);
  const changeYearFilter = (years: ScenarioLabel[]) => {
    setLoading(true);
    setError("");
    setYearFilter(years);
    setChainPage(0);
  };
  const clearFilters = () => {
    setBrandFilter([]);
    setChannelFilter([]);
    setChainFilter([]);
    setClassFilter([]);
    setYearFilter(null);
    setQuarterFilter("ANUAL");
    setSelectedMonths([]);
    setExpandedTemporalRows(new Set());
    setChainPage(0);
  };
  const initialLoading = loading && (!payload || !payloadMatchesPeriod);

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
            return <button type="button" key={tab.id} className={view === tab.id ? "active" : ""} onClick={() => {
              if (tab.id === "chainBrand" && (
                payload?.chainPeriodKey !== "annual"
                || !requestedYears.every((year) => payload?.chainYears?.includes(year))
              )) setLoading(true);
              setExpandedTemporalRows(new Set());
              setChainPage(0);
              setView(tab.id);
            }}>
              <Icon /><span>{tab.label}</span>
            </button>;
          })}
        </nav>
        <div className={`sales-margin-toolbar${view === "chainBrand" ? " with-chain-filter" : ""}`}>
          <div className="sales-margin-toolbar-title"><small>DETALLE DEL INFORME</small><h2>{visibleTabs.find((tab) => tab.id === view)?.label}</h2></div>
          <MultiSelectFilter
            label="MARCA"
            plural="MARCAS"
            allLabel="TODAS"
            options={filterOptions.brands}
            selected={brandFilter}
            onChange={(values) => changeFilter("brands", values)}
            emptySelectionLabel={dependentSelectionLabel(filterOptions.brands, "MARCAS", channelFilter.length > 0 || hasActiveChainFilter || classFilter.length > 0)}
          />
          <MultiSelectFilter
            label="CANAL"
            plural="CANALES"
            allLabel="TODOS"
            options={filterOptions.channels}
            selected={channelFilter}
            onChange={(values) => changeFilter("channels", values)}
            emptySelectionLabel={dependentSelectionLabel(filterOptions.channels, "CANALES", brandFilter.length > 0 || hasActiveChainFilter || classFilter.length > 0)}
          />
          {view === "chainBrand" && <MultiSelectFilter
            label="CADENA"
            plural="CADENAS"
            allLabel="TODAS"
            options={filterOptions.chains}
            selected={chainFilter}
            onChange={(values) => changeFilter("chains", values)}
            emptySelectionLabel={dependentSelectionLabel(filterOptions.chains, "CADENAS", brandFilter.length > 0 || channelFilter.length > 0 || classFilter.length > 0)}
          />}
          <MultiSelectFilter
            label="CLASE"
            plural="CLASES"
            allLabel="TODAS"
            options={filterOptions.classes}
            selected={classFilter}
            onChange={(values) => changeFilter("classes", values)}
            emptySelectionLabel={dependentSelectionLabel(filterOptions.classes, "CLASES", brandFilter.length > 0 || channelFilter.length > 0 || hasActiveChainFilter)}
          />
          <MultiSelectFilter 
            label="AÑO" 
            plural="AÑOS" 
            allLabel="TODOS" 
            options={yearOptions} 
            selected={effectiveYearFilter} 
            onChange={changeYearFilter}
            displayOption={labelForYear}/>
          <MonthPeriodFilter
            period={quarterFilter}
            onPeriodChange={(period) => {
              setExpandedTemporalRows(new Set());
              if (includeChain) setLoading(true);
              setChainPage(0);
              setQuarterFilter(period);
            }}
            months={monthOptions}
            selectedMonths={selectedMonths}
            onSelectedMonthsChange={(months) => {
              setExpandedTemporalRows(new Set());
              if (includeChain) setLoading(true);
              setChainPage(0);
              setSelectedMonths(months);
            }}
            ariaLabel="Período de Venta y Margen"
            className="sales-margin-quarter-filter"
          />
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
                  return <tr key={row.key} className={`${row.total ? "total " : ""}${row.expandable ? "temporal-parent " : ""}${row.depth ? "temporal-child" : ""}`.trim()}>
                  {rowSpan > 0 && <th scope={mergePrimaryCells ? "rowgroup" : "row"} rowSpan={rowSpan}>{row.primary}</th>}
                  {hasSecondary && secondarySpan > 0 && <td rowSpan={secondarySpan} className={`dimension${hasMonthBreakdown && (view === "channel" || view === "brand") ? " period-dimension" : ""}`}>
                    {hasMonthBreakdown && (view === "channel" || view === "brand") ? temporalCell(row, row.secondary) : row.secondary || "—"}
                  </td>}
                  {hasTertiary && <td className="dimension period-dimension">{temporalCell(row, row.tertiary)}</td>}
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
        {view === "chainBrand" && chainPageCount > 1 && <nav className="sales-margin-chain-pagination" aria-label="Paginación de cadenas">
          <span>Cadenas {chainPageStart}–{chainPageEnd} de {chainNames.length}</span>
          <div>
            <button type="button" onClick={() => setChainPage(Math.max(0, safeChainPage - 1))} disabled={safeChainPage === 0}>Anterior</button>
            <b>{safeChainPage + 1} / {chainPageCount}</b>
            <button type="button" onClick={() => setChainPage(Math.min(chainPageCount - 1, safeChainPage + 1))} disabled={safeChainPage >= chainPageCount - 1}>Siguiente</button>
          </div>
        </nav>}
        {!loading && !error && payload && visibleRows.length === 0 && <div className="sales-margin-empty">No hay registros que coincidan con la búsqueda.</div>}
        <footer>
          <span><b>FUENTE</b> {payload?.source ?? "forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_CONSOLIDADA_TOOLBOX_CL"}</span>
          <button
            type="button"
            className="sales-margin-brand-glossary-trigger"
            onClick={() => setBrandGlossaryOpen(true)}
            disabled={!payload}
            aria-haspopup="dialog"
          >
            <BookOpen aria-hidden="true" />
            OTRAS · {payload?.brandGrouping.brands.length ?? 0} MARCAS
          </button>
          <span>Referencia funcional: {payload?.sourceSheet}</span>
        </footer>
      </div>

      {brandGlossaryOpen && payload && <div
        className="sales-margin-brand-glossary-backdrop"
        role="presentation"
        onMouseDown={() => setBrandGlossaryOpen(false)}
      >
        <section
          className="sales-margin-brand-glossary"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sales-margin-brand-glossary-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header>
            <div>
              <small>GLOSARIO DE MARCAS</small>
              <h2 id="sales-margin-brand-glossary-title">Composición de “OTRAS”</h2>
            </div>
            <button type="button" onClick={() => setBrandGlossaryOpen(false)} aria-label="Cerrar glosario"><X /></button>
          </header>
          <p>
            Incluye las marcas con ventas acumuladas inferiores a <b>MM${payload.brandGrouping.thresholdMm}</b>
            {payload.brandGrouping.window.length > 0 && <> en la ventana <b>{payload.brandGrouping.window.join(" · ")}</b></>}.
          </p>
          <div className="sales-margin-brand-glossary-summary">
            <span>Marcas agrupadas</span>
            <strong>{payload.brandGrouping.brands.length}</strong>
          </div>
          <div className="sales-margin-brand-glossary-list" role="list" aria-label="Marcas agrupadas como OTRAS">
            {payload.brandGrouping.brands.map((brand) => <div key={brand.name} role="listitem">
              <span>{brand.name}</span>
              <strong>{groupedBrandSalesFormatter.format(brand.totalSalesMm)} MM$</strong>
            </div>)}
            {payload.brandGrouping.brands.length === 0 && <p>No hay marcas agrupadas para la ventana vigente.</p>}
          </div>
          <footer>
            <small>Los montos corresponden a la suma utilizada para aplicar la regla de agrupación.</small>
            <button type="button" onClick={() => setBrandGlossaryOpen(false)}>Cerrar</button>
          </footer>
        </section>
      </div>}
    </>
  </section>;
}
