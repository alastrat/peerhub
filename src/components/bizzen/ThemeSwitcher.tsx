"use client";

import { useTheme } from "@/providers/ThemeProvider";

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        gap: "6px",
        padding: "8px 12px",
        borderRadius: "50px",
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          title={t.label}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: theme === t.id ? "2px solid #fff" : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s ease",
            background:
              t.id === "classic"
                ? "linear-gradient(135deg, #4a9960, #be6840)"
                : t.id === "brand"
                  ? "linear-gradient(135deg, #7C3E8F, #9CC445)"
                  : "linear-gradient(135deg, #1a1a2e, #613171)",
          }}
        />
      ))}
    </div>
  );
}
