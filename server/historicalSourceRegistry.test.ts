import { describe, expect, it } from "vitest";
import { historicalOfficialPublisher, historicalSourceRegistry } from "./historicalSourceRegistry";

describe("historical source registry", () => {
  it("records the official publisher and preserves partial sources as non-annual material", () => {
    expect(historicalOfficialPublisher.verificationUrl).toBe("https://tidc.com.ly/releases.php?page=1");
    expect(historicalSourceRegistry.some((source) => source.coverage === "1993" && source.status === "أرشيف تفصيلي")).toBe(true);
    expect(historicalSourceRegistry.some((source) => source.coverage === "2021–2025" && source.status === "مستورد جزئياً")).toBe(true);
  });
});
