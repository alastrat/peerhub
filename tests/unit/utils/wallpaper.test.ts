import { describe, it, expect } from "vitest";
import {
  getWallpaperCSS,
  parseWallpaperConfig,
  parseColorConfig,
  resolveColors,
  getContrastBadgeColors,
  GRADIENT_PRESETS,
  PATTERN_OPTIONS,
  DEFAULT_COLORS,
  type WallpaperConfig,
  type ColorConfig,
} from "@/lib/utils/wallpaper";

describe("wallpaper utils", () => {
  // ──────────────────────────────────────────────
  // GRADIENT_PRESETS / PATTERN_OPTIONS constants
  // ──────────────────────────────────────────────
  describe("constants", () => {
    it("has gradient presets with label, css, and colors", () => {
      for (const [key, preset] of Object.entries(GRADIENT_PRESETS)) {
        expect(preset.label).toBeTruthy();
        expect(preset.css).toContain("linear-gradient");
        expect(preset.colors).toHaveLength(2);
      }
    });

    it("has pattern options with key and label", () => {
      expect(PATTERN_OPTIONS.length).toBeGreaterThan(0);
      for (const opt of PATTERN_OPTIONS) {
        expect(opt.key).toBeTruthy();
        expect(opt.label).toBeTruthy();
      }
    });

    it("includes all expected gradient presets", () => {
      const keys = Object.keys(GRADIENT_PRESETS);
      expect(keys).toContain("rose-quartz");
      expect(keys).toContain("sunset");
      expect(keys).toContain("ocean");
      expect(keys).toContain("midnight");
    });

    it("includes all expected pattern options", () => {
      const keys = PATTERN_OPTIONS.map((p) => p.key);
      expect(keys).toEqual(["grid", "morph", "organic", "matrix"]);
    });
  });

  // ──────────────────────────────────────────────
  // getWallpaperCSS
  // ──────────────────────────────────────────────
  describe("getWallpaperCSS", () => {
    it("returns fallback gradient when config is null", () => {
      const result = getWallpaperCSS(null);
      expect(result.style.background).toContain("#613171");
    });

    it("returns fallback gradient when config is undefined", () => {
      const result = getWallpaperCSS(undefined);
      expect(result.style.background).toContain("#613171");
    });

    it("uses custom fallback color when config is null", () => {
      const result = getWallpaperCSS(null, "#ff0000");
      expect(result.style.background).toContain("#ff0000");
    });

    it("returns solid background for fill style", () => {
      const config: WallpaperConfig = { style: "fill", color: "#abcdef" };
      const result = getWallpaperCSS(config);
      expect(result.style.background).toBe("#abcdef");
    });

    it("returns preset gradient CSS when preset key is valid", () => {
      const config: WallpaperConfig = {
        style: "gradient",
        color: "#000",
        color2: "#fff",
        direction: "linear-down",
        preset: "ocean",
      };
      const result = getWallpaperCSS(config);
      expect(result.style.background).toBe(GRADIENT_PRESETS["ocean"].css);
    });

    it("returns linear-gradient to top for linear-up direction", () => {
      const config: WallpaperConfig = {
        style: "gradient",
        color: "#aaa",
        color2: "#bbb",
        direction: "linear-up",
      };
      const result = getWallpaperCSS(config);
      expect(result.style.background).toContain("to top");
      expect(result.style.background).toContain("#aaa");
      expect(result.style.background).toContain("#bbb");
    });

    it("returns linear-gradient to bottom for linear-down direction", () => {
      const config: WallpaperConfig = {
        style: "gradient",
        color: "#aaa",
        color2: "#bbb",
        direction: "linear-down",
      };
      const result = getWallpaperCSS(config);
      expect(result.style.background).toContain("to bottom");
    });

    it("returns radial-gradient for radial direction", () => {
      const config: WallpaperConfig = {
        style: "gradient",
        color: "#aaa",
        color2: "#bbb",
        direction: "radial",
      };
      const result = getWallpaperCSS(config);
      expect(result.style.background).toContain("radial-gradient");
    });

    it("returns blur style with backdrop filter", () => {
      const config: WallpaperConfig = { style: "blur", color: "#123456" };
      const result = getWallpaperCSS(config);
      expect(result.style.background).toBe("#12345688");
      expect(result.style.backdropFilter).toBe("blur(24px)");
      expect(result.style.WebkitBackdropFilter).toBe("blur(24px)");
    });

    it("returns pattern style with SVG background image", () => {
      const config: WallpaperConfig = {
        style: "pattern",
        color: "#613171",
        pattern: "grid",
      };
      const result = getWallpaperCSS(config);
      expect(result.style.backgroundColor).toBe("#613171");
      expect(result.style.backgroundImage).toContain("data:image/svg+xml");
      expect(result.style.backgroundRepeat).toBe("repeat");
    });

    it("returns pattern style for each pattern type", () => {
      const patterns = ["grid", "morph", "organic", "matrix"] as const;
      for (const pattern of patterns) {
        const config: WallpaperConfig = {
          style: "pattern",
          color: "#000000",
          pattern,
        };
        const result = getWallpaperCSS(config);
        expect(result.style.backgroundImage).toBeTruthy();
      }
    });

    it("returns image style with cover and center", () => {
      const config: WallpaperConfig = {
        style: "image",
        url: "https://example.com/bg.jpg",
      };
      const result = getWallpaperCSS(config);
      expect(result.style.backgroundImage).toBe("url(https://example.com/bg.jpg)");
      expect(result.style.backgroundSize).toBe("cover");
      expect(result.style.backgroundPosition).toBe("center");
    });

    it("returns empty style for unknown style type", () => {
      const config = { style: "unknown" } as unknown as WallpaperConfig;
      const result = getWallpaperCSS(config);
      expect(result.style).toEqual({});
    });
  });

  // ──────────────────────────────────────────────
  // parseWallpaperConfig
  // ──────────────────────────────────────────────
  describe("parseWallpaperConfig", () => {
    it("returns null for null input", () => {
      expect(parseWallpaperConfig(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(parseWallpaperConfig(undefined)).toBeNull();
    });

    it("returns null for non-object input", () => {
      expect(parseWallpaperConfig("string")).toBeNull();
      expect(parseWallpaperConfig(42)).toBeNull();
      expect(parseWallpaperConfig(true)).toBeNull();
    });

    it("returns null for object without style property", () => {
      expect(parseWallpaperConfig({ color: "#fff" })).toBeNull();
    });

    it("returns null for object with non-string style", () => {
      expect(parseWallpaperConfig({ style: 123 })).toBeNull();
    });

    it("returns typed config for valid fill config", () => {
      const raw = { style: "fill", color: "#abcdef" };
      const result = parseWallpaperConfig(raw);
      expect(result).toEqual(raw);
    });

    it("returns typed config for valid gradient config", () => {
      const raw = {
        style: "gradient",
        color: "#aaa",
        color2: "#bbb",
        direction: "linear-down",
      };
      const result = parseWallpaperConfig(raw);
      expect(result).toEqual(raw);
    });
  });

  // ──────────────────────────────────────────────
  // parseColorConfig
  // ──────────────────────────────────────────────
  describe("parseColorConfig", () => {
    it("returns null for null input", () => {
      expect(parseColorConfig(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(parseColorConfig(undefined)).toBeNull();
    });

    it("returns null for non-object input", () => {
      expect(parseColorConfig("string")).toBeNull();
    });

    it("returns the object as ColorConfig for valid input", () => {
      const raw = { background: "#fff", buttons: "#000" };
      expect(parseColorConfig(raw)).toEqual(raw);
    });
  });

  // ──────────────────────────────────────────────
  // resolveColors
  // ──────────────────────────────────────────────
  describe("resolveColors", () => {
    it("returns all default colors when config is null", () => {
      const result = resolveColors(null);
      expect(result).toEqual(DEFAULT_COLORS);
    });

    it("returns all default colors when config is undefined", () => {
      const result = resolveColors(undefined);
      expect(result).toEqual(DEFAULT_COLORS);
    });

    it("merges provided colors with defaults", () => {
      const config: ColorConfig = { background: "#000000" };
      const result = resolveColors(config);
      expect(result.background).toBe("#000000");
      expect(result.buttons).toBe(DEFAULT_COLORS.buttons);
      expect(result.buttonText).toBe(DEFAULT_COLORS.buttonText);
    });

    it("uses themeColorFallback for buttons when not specified in config", () => {
      const result = resolveColors(null, "#ff0000");
      expect(result.buttons).toBe("#ff0000");
    });

    it("prefers config.buttons over themeColorFallback", () => {
      const config: ColorConfig = { buttons: "#00ff00" };
      const result = resolveColors(config, "#ff0000");
      expect(result.buttons).toBe("#00ff00");
    });

    it("returns all fields as required (no undefined values)", () => {
      const result = resolveColors({});
      for (const value of Object.values(result)) {
        expect(value).toBeDefined();
        expect(value).not.toBe("");
      }
    });
  });

  // ──────────────────────────────────────────────
  // getContrastBadgeColors
  // ──────────────────────────────────────────────
  describe("getContrastBadgeColors", () => {
    it("returns light badge for dark wallpaper color", () => {
      const config: WallpaperConfig = { style: "fill", color: "#000000" };
      const result = getContrastBadgeColors(config);
      expect(result.bg).toContain("255,255,255");
      expect(result.text).toBe("#1a1a2e");
    });

    it("returns dark badge for light wallpaper color", () => {
      const config: WallpaperConfig = { style: "fill", color: "#ffffff" };
      const result = getContrastBadgeColors(config);
      expect(result.bg).toContain("0,0,0");
      expect(result.text).toBe("#ffffff");
    });

    it("uses fallback color when config is null", () => {
      const result = getContrastBadgeColors(null, "#000000");
      expect(result.bg).toContain("255,255,255");
    });

    it("uses default fallback (#613171) when no config and no fallback", () => {
      const result = getContrastBadgeColors(null);
      // #613171 is relatively dark, should return light badge
      expect(result.bg).toContain("255,255,255");
    });

    it("extracts color from gradient config without preset", () => {
      const config: WallpaperConfig = {
        style: "gradient",
        color: "#ffffff",
        color2: "#000000",
        direction: "linear-down",
      };
      const result = getContrastBadgeColors(config);
      // Uses config.color (#ffffff) which is light
      expect(result.bg).toContain("0,0,0");
    });

    it("extracts color from gradient preset", () => {
      const config: WallpaperConfig = {
        style: "gradient",
        color: "#000",
        color2: "#000",
        direction: "linear-down",
        preset: "ocean",
      };
      const result = getContrastBadgeColors(config);
      // Ocean preset first color is #4facfe (medium-light blue)
      expect(result).toBeDefined();
    });

    it("uses config.color for blur style", () => {
      const config: WallpaperConfig = { style: "blur", color: "#000000" };
      const result = getContrastBadgeColors(config);
      expect(result.bg).toContain("255,255,255");
    });

    it("uses config.color for pattern style", () => {
      const config: WallpaperConfig = {
        style: "pattern",
        color: "#ffffff",
        pattern: "grid",
      };
      const result = getContrastBadgeColors(config);
      expect(result.bg).toContain("0,0,0");
    });

    it("returns white-bg badge for image style (assumes dark overlay)", () => {
      const config: WallpaperConfig = {
        style: "image",
        url: "https://example.com/bg.jpg",
      };
      const result = getContrastBadgeColors(config);
      expect(result.bg).toContain("255,255,255");
      expect(result.text).toBe("#1a1a2e");
    });

    it("handles short hex colors (#rgb format) via fallback", () => {
      const result = getContrastBadgeColors(null, "#fff");
      expect(result.bg).toContain("0,0,0");
    });
  });
});
