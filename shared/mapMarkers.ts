export type DetachableMapMarker = { setMap: (map: null) => void };

export function detachMapMarkers(markers: DetachableMapMarker[]) {
  for (const marker of markers) {
    try {
      marker.setMap(null);
    } catch {
      // A remote maps SDK may invalidate old markers during an HMR reload or
      // a failed script refresh. The city directory remains the safe fallback.
    }
  }
  return [] as DetachableMapMarker[];
}
