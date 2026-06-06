import { create } from "zustand";
import { Appearance } from "react-native";

const lightTheme = {
  name: "light",
  colors: {
    background: "#ffffff",
    backgroundSecondary: "#F8FAFC",
    backgroundCard: "#ffffff",
    backgroundInput: "#ffffff",
    // --- Text Hierarchy Optimization ---
    text: "#0f172a",          // Dark slate for crisp primary reading
    textSecondary: "#475569", // Accessible mid-tone gray
    textMuted: "#64748b",     // Subtitles and descriptive labels
    textDisabled: "#94a3b8",  // Non-interactive elements or placeholders
    textOnPrimary: "#ffffff",
    // --- Borders & Accents ---
    border: "#e2e8f0",
    borderLight: "#f1f5f9",
    primary: "#115e59",       // Stormy Teal
    primaryAlpha: "#115e5980",
    primaryLight: "#dde8e7",  // Azure Mist tint
    secondary: "#6366f1",
    success: "#10b981",
    successLight: "#10b98120",
    warning: "#facc15",
    warningLight: "#facc1520",
    danger: "#ef4444",
    dangerLight: "#ef444420",
    purple: "#a855f7",
    purpleLight: "#a855f720",
    tabBar: "#ffffff",
    tabBorder: "#e2e8f0",
    shadow: "#000000",
  },
};

const darkTheme = {
  name: "dark",
  colors: {
    background: "#0b0d0f",
    backgroundSecondary: "#16191e",
    backgroundCard: "#16191e",
    backgroundInput: "#0b0d0f",
    // --- High-Legibility Contrast Fixes (Using Teal Scale Tokens) ---
    text: "#ffffff",          // Pure contrast white for primary labels
    textSecondary: "#dde8e7", // Azure Mist - gorgeous premium readability text
    textMuted: "#99bab8",     // Ash Grey 2 - sharp contrast descriptions
    textDisabled: "#558c88",  // Dark Cyan - perfect for muted states/placeholders
    textOnPrimary: "#ffffff",
    // --- Borders & Accents ---
    border: "#ffffff08",
    borderLight: "#ffffff04",
    primary: "#115e59",       // Stormy Teal base stays unified
    primaryAlpha: "#115e5980",
    primaryLight: "#115e5930", // Translucent backdrop fill
    secondary: "#6366f1",
    success: "#10b981",
    successLight: "#10b98120",
    warning: "#facc15",
    warningLight: "#facc1520",
    danger: "#ef4444",
    dangerLight: "#ef444420",
    purple: "#a855f7",
    purpleLight: "#a855f720",
    tabBar: "#0b0d0f",
    tabBorder: "#ffffff08",
    shadow: "#000000",
  },
};

export const useThemeStore = create((set, get) => ({
  theme: "dark",
  colors: darkTheme.colors,
  isDarkMode: true,

  toggleTheme: () => {
    const current = get().isDarkMode;
    const newIsDark = !current;
    const newColors = newIsDark ? darkTheme.colors : lightTheme.colors;
    const newTheme = newIsDark ? "dark" : "light";
    set({ isDarkMode: newIsDark, colors: newColors, theme: newTheme });
  },

  setTheme: (themeValue) => {
    const resolvedTheme =
      themeValue === "system"
        ? Appearance.getColorScheme() || "light"
        : themeValue;
    const isDark = resolvedTheme === "dark";
    const colors = isDark ? darkTheme.colors : lightTheme.colors;
    set({ theme: themeValue, isDarkMode: isDark, colors });
  },

  // Memoized getter utility
  getColor: (key) => get().colors[key] || "#ffffff",
}));