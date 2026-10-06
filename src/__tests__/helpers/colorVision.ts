/** Color math for palette tests: WCAG contrast, color-vision-deficiency simulation and CIEDE2000. */

/** Three components: linear RGB (0..1) or CIELAB. */
export type Vec3 = [number, number, number];

/** The dichromacies the palette tests check. */
export type Deficiency = 'protanopia' | 'deuteranopia' | 'tritanopia';

/** Machado, Oliveira and Fernandes (2009) simulation matrices at full severity, for linear RGB. */
const MACHADO: Record<Deficiency, Vec3[]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function channelToLinear(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** '#rrggbb' to linear-light RGB, 0..1. */
export function hexToLinear(hex: string): Vec3 {
  return [1, 3, 5].map((i) => channelToLinear(parseInt(hex.slice(i, i + 2), 16))) as Vec3;
}

function luminance([r, g, b]: Vec3): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two '#rrggbb' colors (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [high, low] = [luminance(hexToLinear(a)), luminance(hexToLinear(b))].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** How a '#rrggbb' color looks with a deficiency (null: normal vision), as linear RGB. */
export function simulate(hex: string, deficiency: Deficiency | null): Vec3 {
  const rgb = hexToLinear(hex);
  if (!deficiency) return rgb;
  return MACHADO[deficiency].map((row) =>
    Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]))
  ) as Vec3;
}

/** Linear sRGB (D65) to CIELAB. */
export function linearToLab([r, g, b]: Vec3): Vec3 {
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIEDE2000 color difference between two CIELAB colors (Sharma, Wu and Dalal 2005). */
export function deltaE2000([l1, a1, b1]: Vec3, [l2, a2, b2]: Vec3): number {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const pow7 = (v: number) => Math.pow(v, 7);
  const cBar = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const g = 0.5 * (1 - Math.sqrt(pow7(cBar) / (pow7(cBar) + pow7(25))));
  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);
  const hue = (b: number, a: number) => {
    if (b === 0 && a === 0) return 0;
    const h = Math.atan2(b, a) * deg;
    return h < 0 ? h + 360 : h;
  };
  const h1p = hue(b1, a1p);
  const h2p = hue(b2, a2p);
  const dL = l2 - l1;
  const dC = c2p - c1p;
  let dh = 0;
  if (c1p * c2p !== 0) {
    dh = h2p - h1p;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(c1p * c2p) * Math.sin((dh / 2) * rad);
  const lBar = (l1 + l2) / 2;
  const cBarP = (c1p + c2p) / 2;
  let hBar = h1p + h2p;
  if (c1p * c2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hBar = hBar < 360 ? hBar + 360 : hBar - 360;
    hBar /= 2;
  }
  const t =
    1 -
    0.17 * Math.cos((hBar - 30) * rad) +
    0.24 * Math.cos(2 * hBar * rad) +
    0.32 * Math.cos((3 * hBar + 6) * rad) -
    0.2 * Math.cos((4 * hBar - 63) * rad);
  const dTheta = 30 * Math.exp(-Math.pow((hBar - 275) / 25, 2));
  const rc = 2 * Math.sqrt(pow7(cBarP) / (pow7(cBarP) + pow7(25)));
  const sl = 1 + (0.015 * Math.pow(lBar - 50, 2)) / Math.sqrt(20 + Math.pow(lBar - 50, 2));
  const sc = 1 + 0.045 * cBarP;
  const sh = 1 + 0.015 * cBarP * t;
  const rt = -Math.sin(2 * dTheta * rad) * rc;
  return Math.sqrt(
    Math.pow(dL / sl, 2) + Math.pow(dC / sc, 2) + Math.pow(dH / sh, 2) + rt * (dC / sc) * (dH / sh)
  );
}

/** The smallest CIEDE2000 difference between any two of the colors as seen with the deficiency. */
export function minPairwiseDeltaE(
  colors: readonly string[],
  deficiency: Deficiency | null
): number {
  const labs = colors.map((color) => linearToLab(simulate(color, deficiency)));
  let min = Infinity;
  for (let i = 0; i < labs.length; i++) {
    for (let j = i + 1; j < labs.length; j++) min = Math.min(min, deltaE2000(labs[i], labs[j]));
  }
  return min;
}
