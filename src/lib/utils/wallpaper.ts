import type { CSSProperties } from "react";

// ============================================
// Wallpaper config types
// ============================================

export type WallpaperStyle = "fill" | "gradient" | "blur" | "pattern" | "image";

export interface WallpaperFill {
  style: "fill";
  color: string;
}

export interface WallpaperGradient {
  style: "gradient";
  color: string;
  color2: string;
  direction: "linear-up" | "linear-down" | "radial";
  preset?: string; // key into GRADIENT_PRESETS
}

export interface WallpaperBlur {
  style: "blur";
  color: string;
}

export interface WallpaperPattern {
  style: "pattern";
  color: string;
  pattern: "grid" | "morph" | "organic" | "matrix";
}

export interface WallpaperImage {
  style: "image";
  url: string;
}

export type WallpaperConfig =
  | WallpaperFill
  | WallpaperGradient
  | WallpaperBlur
  | WallpaperPattern
  | WallpaperImage;

// ============================================
// Gradient presets
// ============================================

export const GRADIENT_PRESETS: Record<string, { label: string; css: string; colors: [string, string] }> = {
  "rose-quartz": {
    label: "Rose Quartz",
    css: "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
    colors: ["#fbc2eb", "#a6c1ee"],
  },
  sunset: {
    label: "Sunset",
    css: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    colors: ["#f093fb", "#f5576c"],
  },
  ocean: {
    label: "Ocean",
    css: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    colors: ["#4facfe", "#00f2fe"],
  },
  forest: {
    label: "Forest",
    css: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    colors: ["#43e97b", "#38f9d7"],
  },
  "deep-purple": {
    label: "Deep Purple",
    css: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    colors: ["#a18cd1", "#fbc2eb"],
  },
  midnight: {
    label: "Midnight",
    css: "linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)",
    colors: ["#0c3483", "#a2b6df"],
  },
  ember: {
    label: "Ember",
    css: "linear-gradient(135deg, #f83600 0%, #f9d423 100%)",
    colors: ["#f83600", "#f9d423"],
  },
  lavender: {
    label: "Lavender",
    css: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
    colors: ["#e0c3fc", "#8ec5fc"],
  },
};

// ============================================
// CSS pattern overlays (inline SVG data URIs)
// ============================================

const PATTERN_SVGS: Record<string, (color: string) => string> = {
  grid: (c) =>
    `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M40 0v40H0' fill='none' stroke='${encodeURIComponent(c)}' stroke-opacity='0.15' stroke-width='1'/%3E%3C/svg%3E")`,
  morph: (c) =>
    `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='15' cy='15' r='3' fill='${encodeURIComponent(c)}' fill-opacity='0.12'/%3E%3Ccircle cx='45' cy='45' r='2' fill='${encodeURIComponent(c)}' fill-opacity='0.08'/%3E%3Ccircle cx='45' cy='15' r='1.5' fill='${encodeURIComponent(c)}' fill-opacity='0.1'/%3E%3C/svg%3E")`,
  organic: (c) =>
    `url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20c10-15 30 5 40-10s-10 30 0 40-30-5-40 10 0-30-10-40z' fill='none' stroke='${encodeURIComponent(c)}' stroke-opacity='0.1' stroke-width='1'/%3E%3C/svg%3E")`,
  matrix: (c) =>
    `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='2' y='2' width='4' height='4' rx='1' fill='${encodeURIComponent(c)}' fill-opacity='0.08'/%3E%3Crect x='14' y='14' width='4' height='4' rx='1' fill='${encodeURIComponent(c)}' fill-opacity='0.06'/%3E%3C/svg%3E")`,
};

export const PATTERN_OPTIONS = [
  { key: "grid" as const, label: "Grid" },
  { key: "morph" as const, label: "Morph" },
  { key: "organic" as const, label: "Organic" },
  { key: "matrix" as const, label: "Matrix" },
];

// ============================================
// Rendering: config → CSS
// ============================================

export interface WallpaperCSS {
  /** Inline style for the container div */
  style: CSSProperties;
  /** Extra classNames (e.g. for backdrop-filter which needs a class in some browsers) */
  className?: string;
}

/**
 * Convert a WallpaperConfig into CSS that can be applied to a div.
 * Returns inline `style` and optional extra `className`.
 *
 * @param config  The stored wallpaper config (may be null)
 * @param fallbackColor  Used when config is null — produces a gradient from this color
 */
export function getWallpaperCSS(
  config: WallpaperConfig | null | undefined,
  fallbackColor?: string,
): WallpaperCSS {
  if (!config) {
    const c = fallbackColor || "#613171";
    return {
      style: {
        background: `linear-gradient(135deg, ${c}, ${c}cc)`,
      },
    };
  }

  switch (config.style) {
    case "fill":
      return { style: { background: config.color } };

    case "gradient": {
      if (config.preset && GRADIENT_PRESETS[config.preset]) {
        return { style: { background: GRADIENT_PRESETS[config.preset].css } };
      }
      const dir =
        config.direction === "linear-up"
          ? "to top"
          : config.direction === "radial"
            ? undefined
            : "to bottom";
      const bg = dir
        ? `linear-gradient(${dir}, ${config.color}, ${config.color2})`
        : `radial-gradient(circle, ${config.color}, ${config.color2})`;
      return { style: { background: bg } };
    }

    case "blur":
      return {
        style: {
          background: `${config.color}88`,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        },
      };

    case "pattern": {
      const overlay = PATTERN_SVGS[config.pattern]?.(config.color);
      return {
        style: {
          backgroundColor: config.color,
          backgroundImage: overlay || undefined,
          backgroundRepeat: "repeat",
        },
      };
    }

    case "image":
      return {
        style: {
          backgroundImage: `url(${config.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        },
      };

    default:
      return { style: {} };
  }
}

/**
 * Parse a JSON value from the DB into a typed WallpaperConfig.
 * Returns null if the value is null/undefined or not a valid config.
 */
export function parseWallpaperConfig(
  raw: unknown,
): WallpaperConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.style !== "string") return null;
  return obj as unknown as WallpaperConfig;
}

// ============================================
// Color config — controls page colors
// ============================================

export interface ColorConfig {
  background?: string;   // page background
  buttons?: string;      // button fill color
  buttonText?: string;   // button text color
  pageText?: string;     // body / paragraph text
  titleText?: string;    // headings / title text
}

const DEFAULT_COLORS: Required<ColorConfig> = {
  background: "#f5f5f5",
  buttons: "#613171",
  buttonText: "#ffffff",
  pageText: "#374151",
  titleText: "#111827",
};

export function parseColorConfig(raw: unknown): ColorConfig | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ColorConfig;
}

/** Merge user colors with defaults — every field always has a value. */
export function resolveColors(
  config: ColorConfig | null | undefined,
  themeColorFallback?: string,
): Required<ColorConfig> {
  return {
    background: config?.background || DEFAULT_COLORS.background,
    buttons: config?.buttons || themeColorFallback || DEFAULT_COLORS.buttons,
    buttonText: config?.buttonText || DEFAULT_COLORS.buttonText,
    pageText: config?.pageText || DEFAULT_COLORS.pageText,
    titleText: config?.titleText || DEFAULT_COLORS.titleText,
  };
}

export { DEFAULT_COLORS };

// ============================================
// Contrast helpers
// ============================================

/** Parse a hex color (#rgb or #rrggbb) into [r, g, b] 0-255. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Relative luminance (0 = black, 1 = white) per WCAG. */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Given the wallpaper config, extract the dominant color and return
 * badge colors that will contrast against it.
 * Returns `{ bg, text }` hex strings for the badge.
 */
export function getContrastBadgeColors(
  wallpaperConfig: WallpaperConfig | null | undefined,
  fallbackColor?: string,
): { bg: string; text: string } {
  let dominantColor = fallbackColor || "#613171";

  if (wallpaperConfig) {
    switch (wallpaperConfig.style) {
      case "fill":
        dominantColor = wallpaperConfig.color;
        break;
      case "gradient":
        dominantColor = wallpaperConfig.preset
          ? (GRADIENT_PRESETS[wallpaperConfig.preset]?.colors[0] ?? wallpaperConfig.color)
          : wallpaperConfig.color;
        break;
      case "blur":
      case "pattern":
        dominantColor = wallpaperConfig.color;
        break;
      case "image":
        // Can't analyze an image; assume dark overlay
        return { bg: "rgba(255,255,255,0.9)", text: "#1a1a2e" };
    }
  }

  const lum = luminance(dominantColor);
  // Dark background → white badge; light background → dark badge
  return lum < 0.4
    ? { bg: "rgba(255,255,255,0.85)", text: "#1a1a2e" }
    : { bg: "rgba(0,0,0,0.7)", text: "#ffffff" };
}
