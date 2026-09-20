interface HeatmapLegendProps {
  /** Label for the "good" (blue) end, e.g. "High confidence" */
  goodLabel: string;
  /** Label for the "bad" (red) end, e.g. "Low confidence" */
  badLabel: string;
}

/** Blue -> yellow -> red gradient bar matching the heatmap PNGs' color scheme. */
export default function HeatmapLegend({ goodLabel, badLabel }: HeatmapLegendProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="whitespace-nowrap text-xs font-medium text-text-secondary">
        {goodLabel}
      </span>
      <div
        className="h-2.5 flex-1 rounded-full"
        style={{
          background:
            "linear-gradient(to right, #2255ff 0%, #33aa88 35%, #ffd23f 60%, #ff8c3f 80%, #ff3b3b 100%)",
        }}
      />
      <span className="whitespace-nowrap text-xs font-medium text-text-secondary">
        {badLabel}
      </span>
    </div>
  );
}
