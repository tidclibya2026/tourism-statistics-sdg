import React, { createContext, useContext, useEffect, useState } from "react";

export type FontScale = "normal" | "large" | "xlarge";
type AccessibilityContextValue = { fontScale: FontScale; highContrast: boolean; reduceMotion: boolean; setFontScale: (value: FontScale) => void; setHighContrast: (value: boolean) => void; setReduceMotion: (value: boolean) => void };
const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

function storedBoolean(key: string, fallback: boolean) { return localStorage.getItem(key) === null ? fallback : localStorage.getItem(key) === "true"; }

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [fontScale, setFontScale] = useState<FontScale>(() => (localStorage.getItem("accessibility-font-scale") as FontScale) || "normal");
  const [highContrast, setHighContrast] = useState(() => storedBoolean("accessibility-high-contrast", false));
  const [reduceMotion, setReduceMotion] = useState(() => storedBoolean("accessibility-reduce-motion", false));
  useEffect(() => { const root = document.documentElement; root.classList.toggle("accessibility-font-large", fontScale === "large"); root.classList.toggle("accessibility-font-xlarge", fontScale === "xlarge"); localStorage.setItem("accessibility-font-scale", fontScale); }, [fontScale]);
  useEffect(() => { document.documentElement.classList.toggle("accessibility-high-contrast", highContrast); localStorage.setItem("accessibility-high-contrast", String(highContrast)); }, [highContrast]);
  useEffect(() => { document.documentElement.classList.toggle("accessibility-reduce-motion", reduceMotion); localStorage.setItem("accessibility-reduce-motion", String(reduceMotion)); }, [reduceMotion]);
  return <AccessibilityContext.Provider value={{ fontScale, highContrast, reduceMotion, setFontScale, setHighContrast, setReduceMotion }}>{children}</AccessibilityContext.Provider>;
}
export function useAccessibility() { const context = useContext(AccessibilityContext); if (!context) throw new Error("useAccessibility must be used within AccessibilityProvider"); return context; }
