// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "../client/src/contexts/ThemeContext";

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ThemeProvider", () => {
  it("يبدأ بالوضع الداكن عند تفضيله من النظام ويحفظ التبديل اليدوي", () => {
    render(
      <ThemeProvider defaultTheme="light" switchable>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByRole("button").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("theme")).toBe("light");
  });
});
