"use client";

import { Search } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

export type MonthPeriod = "ANUAL" | "Q1" | "Q2" | "Q3" | "Q4" | "MES";

const fixedPeriods: Exclude<MonthPeriod, "MES">[] = ["ANUAL", "Q1", "Q2", "Q3", "Q4"];

export default function MonthPeriodFilter<T extends string | number>({
  period,
  onPeriodChange,
  months,
  selectedMonths,
  onSelectedMonthsChange,
  ariaLabel,
  className = "",
}: {
  period: MonthPeriod;
  onPeriodChange: (period: MonthPeriod) => void;
  months: { value: T; label: string }[];
  selectedMonths: T[];
  onSelectedMonthsChange: (months: T[]) => void;
  ariaLabel: string;
  className?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const optionsId = useId();
  const [query, setQuery] = useState("");
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const visibleMonths = useMemo(() => months.filter(({ label }) =>
    label.toLocaleLowerCase("es").includes(normalizedQuery)
  ), [months, normalizedQuery]);

  const selectPeriod = (nextPeriod: Exclude<MonthPeriod, "MES">) => {
    onPeriodChange(nextPeriod);
    detailsRef.current?.removeAttribute("open");
  };

  const toggleMonth = (month: T) => {
    onPeriodChange("MES");
    onSelectedMonthsChange(selectedMonths.includes(month)
      ? selectedMonths.filter((item) => item !== month)
      : [...selectedMonths, month]);
  };

  const toggleAllMonths = () => {
    onPeriodChange("MES");
    onSelectedMonthsChange(selectedMonths.length === months.length
      ? []
      : months.map(({ value }) => value));
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      detailsRef.current?.removeAttribute("open");
      detailsRef.current?.querySelector("summary")?.focus();
      setActiveOptionIndex(-1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      if (!visibleMonths.length) return;
      event.preventDefault();
      setActiveOptionIndex(event.key === "Home" ? 0 : visibleMonths.length - 1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!visibleMonths.length) return;
      event.preventDefault();
      setActiveOptionIndex((currentIndex) => event.key === "ArrowDown"
        ? currentIndex < 0 ? 0 : (currentIndex + 1) % visibleMonths.length
        : currentIndex < 0 ? visibleMonths.length - 1 : (currentIndex - 1 + visibleMonths.length) % visibleMonths.length);
      return;
    }
    if (event.key === "Enter" && visibleMonths.length) {
      event.preventDefault();
      const optionIndex = activeOptionIndex >= 0 && activeOptionIndex < visibleMonths.length
        ? activeOptionIndex
        : 0;
      toggleMonth(visibleMonths[optionIndex].value);
    }
  };

  return <div className={`quarter-filter ${className}`.trim()} aria-label={ariaLabel}>
    {fixedPeriods.map((item) => <button
      type="button"
      key={item}
      className={period === item ? "active" : ""}
      onClick={() => selectPeriod(item)}
    >{item}</button>)}
    <details
      ref={detailsRef}
      data-dropdown
      name="portal-dropdown"
      className={`month-period-filter ${period === "MES" ? "active" : ""}`}
    >
      <summary onClick={() => onPeriodChange("MES")}>MES</summary>
      <div id={optionsId} className="month-options">
        <div className="month-options-head">
          <b>{selectedMonths.length} MESES</b>
          <button type="button" onClick={toggleAllMonths}>{selectedMonths.length === months.length ? "LIMPIAR" : "TODOS"}</button>
        </div>
        <div className="month-options-search">
          <Search aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveOptionIndex(0); }}
            onKeyDown={handleSearchKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={optionsId}
            aria-expanded="true"
            placeholder="Buscar mes"
            aria-label="Buscar mes"
          />
        </div>
        {visibleMonths.map(({ value, label }, index) => <label
          key={value}
          data-keyboard-option
          className={activeOptionIndex === index ? "keyboard-active" : ""}
          onMouseEnter={() => setActiveOptionIndex(index)}
        >
          <input type="checkbox" checked={selectedMonths.includes(value)} onChange={() => toggleMonth(value)} />
          {label}
        </label>)}
        {visibleMonths.length === 0 && <small className="month-options-empty">Sin coincidencias</small>}
      </div>
    </details>
  </div>;
}
