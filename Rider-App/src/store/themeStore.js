import { create } from "zustand";
import { Appearance } from "react-native";

const lightTheme = {
  name: "light",
  colors: {
    background: "#ffffff",
    backgroundSecondary: "#F8FAFC",
    backgroundCard: "#ffffff",
    backgroundInput: "#ffffff",
    text: "#0f172a",
    textSecondary: "#64748b",
    textMuted: "#94a3b8",
    textDisabled: "#475569",
    textOnPrimary: "#ffffff",
    border: "#e2e8f0",
    borderLight: "#ffffff0a",
    primary: "#115e59",
    primaryAlpha: "#115e5980",
    primaryLight: "#d1e2d9",
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
    text: "#ffffff",
    
    textSecondary: "#64748b",
    textMuted: "#94a3b8",
    textDisabled: "#475569",
    textOnPrimary: "#ffffff",
    border: "#ffffff08",
    borderLight: "#ffffff04",
    primary: "#115e59",
    primaryAlpha: "#115e5980",
    primaryLight: "#d1e2d9",
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
    const resolvedTheme = themeValue === "system" ? Appearance.getColorScheme() || "light" : themeValue;
    const isDark = resolvedTheme === "dark";
    const colors = isDark ? darkTheme.colors : lightTheme.colors;
    set({ theme: themeValue, isDarkMode: isDark, colors });
  },

  getColor: (key) => get().colors[key] || "#ffffff",
}));