export type SpatialValuePoint = { areaId: number; year: number; value: number; unit: string };

export type SpatialColorScale = {
  enabled: boolean;
  unit: string | null;
  min: number | null;
  max: number | null;
  colors: string[];
  colorFor: (areaId: number) => string;
  latestByArea: Map<number, SpatialValuePoint>;
};

const neutralColor = "#0f766e";
const noDataColor = "#94a3b8";
const palette = ["#fef3c7", "#fde68a", "#fbbf24", "#f97316", "#b91c1c"];

export function buildSpatialColorScale(points: SpatialValuePoint[], enabled: boolean): SpatialColorScale {
  const latestByArea = new Map<number, SpatialValuePoint>();
  points.forEach((point) => {
    const current = latestByArea.get(point.areaId);
    if (!current || point.year > current.year) latestByArea.set(point.areaId, point);
  });
  const values = Array.from(latestByArea.values()).map((point) => point.value).filter(Number.isFinite);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const unit = latestByArea.values().next().value?.unit ?? null;
  const colorFor = (areaId: number) => {
    const point = latestByArea.get(areaId);
    if (!point) return noDataColor;
    if (!enabled) return neutralColor;
    if (min === null || max === null || min === max) return palette[2];
    const index = Math.min(palette.length - 1, Math.max(0, Math.floor(((point.value - min) / (max - min)) * palette.length)));
    return palette[index];
  };
  return { enabled, unit, min, max, colors: palette, colorFor, latestByArea };
}

export { neutralColor, noDataColor };
