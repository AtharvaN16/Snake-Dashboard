import { color as d3Color, rgb as d3Rgb } from "d3-color";

export function radialPoint(angle: number, radius: number): [number, number] {
  return [
    radius * Math.cos(angle - Math.PI / 2),
    radius * Math.sin(angle - Math.PI / 2),
  ];
}

/** Wavy starburst badge using smooth Catmull-Rom → cubic bezier curves */
export function starburstPath(r: number, bumps = 12, depth = 0.12): string {
  const outerR = r * (1 + depth);
  const innerR = r * (1 - depth);
  const points: [number, number][] = [];
  const total = bumps * 2;
  for (let i = 0; i < total; i++) {
    const angle = (i / total) * Math.PI * 2;
    const rad = i % 2 === 0 ? outerR : innerR;
    points.push([rad * Math.cos(angle), rad * Math.sin(angle)]);
  }
  const n = points.length;
  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const tension = 0.45;
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + "Z";
}

/** Regular hexagon */
export function hexagonPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = r * Math.cos(angle);
    const py = r * Math.sin(angle);
    pts.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return pts.join("") + "Z";
}

/** Rounded square (centered, side = 2*r, corner radius ~25%) */
export function roundedSquarePath(r: number): string {
  const cr = r * 0.28;
  const s = r;
  return [
    `M${-s + cr},${-s}`,
    `L${s - cr},${-s}`,
    `Q${s},${-s} ${s},${-s + cr}`,
    `L${s},${s - cr}`,
    `Q${s},${s} ${s - cr},${s}`,
    `L${-s + cr},${s}`,
    `Q${-s},${s} ${-s},${s - cr}`,
    `L${-s},${-s + cr}`,
    `Q${-s},${-s} ${-s + cr},${-s}`,
    "Z",
  ].join(" ");
}

/** Simple diamond / rhombus — vertices at cardinal points */
export function diamondPath(r: number): string {
  return `M0,${-r} L${r},0 L0,${r} L${-r},0 Z`;
}

/** Mix a hex color toward white to create a light tint */
export function lightTint(hex: string, amount = 0.82): string {
  const c = d3Color(hex)?.rgb();
  if (!c) return hex;
  const mix = (v: number) => Math.round(v + (255 - v) * amount);
  return d3Rgb(mix(c.r), mix(c.g), mix(c.b)).formatHex();
}
