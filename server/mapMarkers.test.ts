import { describe, expect, it, vi } from "vitest";
import { detachMapMarkers } from "../shared/mapMarkers";

describe("map marker lifecycle", () => {
  it("detaches valid markers and safely discards a stale SDK marker", () => {
    const healthy = { setMap: vi.fn() };
    const stale = { setMap: vi.fn(() => { throw new Error("stale map"); }) };

    expect(detachMapMarkers([healthy, stale])).toEqual([]);
    expect(healthy.setMap).toHaveBeenCalledWith(null);
    expect(stale.setMap).toHaveBeenCalledWith(null);
  });
});
