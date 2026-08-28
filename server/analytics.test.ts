// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  getAnalyticsConfig,
  installAnalytics,
} from "../client/src/lib/analytics";

describe("optional analytics", () => {
  beforeEach(() => {
    document.head
      .querySelectorAll("script[data-tourism-analytics]")
      .forEach(node => node.remove());
  });

  it("stays disabled when configuration is incomplete", () => {
    expect(getAnalyticsConfig({})).toBeNull();
    expect(installAnalytics({}, document)).toBe(false);
  });

  it("rejects unsafe or invalid endpoints", () => {
    expect(
      getAnalyticsConfig({
        VITE_ANALYTICS_ENDPOINT: "javascript:alert(1)",
        VITE_ANALYTICS_WEBSITE_ID: "site",
      })
    ).toBeNull();
    expect(
      getAnalyticsConfig({
        VITE_ANALYTICS_ENDPOINT: "not-a-url",
        VITE_ANALYTICS_WEBSITE_ID: "site",
      })
    ).toBeNull();
  });

  it("installs a configured script once", () => {
    const environment = {
      VITE_ANALYTICS_ENDPOINT: "https://analytics.example.com/",
      VITE_ANALYTICS_WEBSITE_ID: "tourism",
    };

    expect(installAnalytics(environment, document)).toBe(true);
    expect(installAnalytics(environment, document)).toBe(false);

    const script = document.head.querySelector<HTMLScriptElement>(
      "script[data-tourism-analytics]"
    );
    expect(script?.src).toBe("https://analytics.example.com/umami");
    expect(script?.dataset.websiteId).toBe("tourism");
  });
});
