"use client";

type Line = { name: string; color: string; values: Array<number | null> };

export default function MarketTrendChart({ labels, lines, unit = "%" }: { labels: string[]; lines: Line[]; unit?: string }) {
  const numbers = lines.flatMap((line) => line.values).filter((value): value is number => Number.isFinite(value));
  if (!numbers.length) return <div className="market-chart-empty">Sin datos para el período.</div>;
  const lowValue = Math.min(...numbers); const highValue = Math.max(...numbers); const padding = (highValue - lowValue || 1) * .12;
  const low = lowValue - padding; const high = highValue + padding;
  const x = (index: number) => 58 + index / Math.max(labels.length - 1, 1) * 620;
  const y = (value: number) => 225 - (value - low) / (high - low) * 185;
  const formatter = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });
  return <div className="market-trend">
    <div className="market-trend-legend">{lines.map((line) => <span key={line.name}><i style={{ background: line.color }} />{line.name}</span>)}</div>
    <svg viewBox="0 0 740 270" role="img">
      {[0, .25, .5, .75, 1].map((tick) => { const value = low + (high - low) * tick; return <g key={tick}><line x1="58" x2="678" y1={y(value)} y2={y(value)} /><text x="50" y={y(value) + 4} textAnchor="end">{formatter.format(value)}</text></g>; })}
      {lines.map((line) => { let started = false; const path = line.values.map((value, index) => { if (value === null || !Number.isFinite(value)) { started = false; return ""; } const command = started ? "L" : "M"; started = true; return `${command}${x(index)},${y(value)}`; }).join(" "); return <g key={line.name}><path d={path} stroke={line.color} /><>{line.values.map((value, index) => value === null ? null : <circle key={index} cx={x(index)} cy={y(value)} r="3.5" fill={line.color}><title>{line.name} · {labels[index]}: {formatter.format(value)} {unit}</title></circle>)}</></g>; })}
      {[...new Set([0, Math.round((labels.length - 1) / 3), Math.round((labels.length - 1) * 2 / 3), labels.length - 1])].map((index) => <text key={index} x={x(index)} y="254" textAnchor="middle">{labels[index]}</text>)}
    </svg>
  </div>;
}
