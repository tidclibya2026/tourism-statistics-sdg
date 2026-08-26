/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import React, { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";
import { LoaderCircle, MapPinned, RefreshCw } from "lucide-react";

declare global {
  interface Window {
    google?: typeof google;
    __tourismMapsLoadPromise?: Promise<void>;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;
const MAPS_SCRIPT_ID = "tourism-google-maps-script";

function loadMapScript() {
  if (window.google?.maps?.Map) return Promise.resolve();
  if (window.__tourismMapsLoadPromise) return window.__tourismMapsLoadPromise;

  window.__tourismMapsLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const resolveWhenReady = () => {
      if (window.google?.maps?.Map) resolve();
      else reject(new Error("Google Maps loaded without a map constructor"));
    };
    const fail = () => {
      window.__tourismMapsLoadPromise = undefined;
      if (!existing) script.remove();
      reject(new Error("Failed to load Google Maps script"));
    };

    script.addEventListener("load", resolveWhenReady, { once: true });
    script.addEventListener("error", fail, { once: true });
    if (!existing) {
      script.id = MAPS_SCRIPT_ID;
      script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
  });

  return window.__tourismMapsLoadPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  onMapError?: () => void;
  onMapLoadingChange?: (loading: boolean) => void;
  retryKey?: number;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
  onMapError,
  onMapLoadingChange,
  retryKey = 0,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const init = usePersistFn(async () => {
    setStatus("loading");
    onMapLoadingChange?.(true);
    try {
      await loadMapScript();
      if (!mapContainer.current) {
        throw new Error("Map container not found");
      }
      map.current = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: true,
        mapId: "DEMO_MAP_ID",
      });
      if (onMapReady) {
        onMapReady(map.current);
      }
      setStatus("ready");
      onMapLoadingChange?.(false);
    } catch {
      setStatus("error");
      onMapLoadingChange?.(false);
      onMapError?.();
    }
  });

  useEffect(() => {
    init();
  }, [init, retryKey]);

  return (
    <div className={cn("relative h-[500px] w-full overflow-hidden bg-[#e7f1ee]", className)}>
      <div ref={mapContainer} className="h-full w-full" />
      {status === "loading" && <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(120deg,rgba(236,247,244,.96),rgba(218,238,231,.9),rgba(236,247,244,.96))] p-6"><div className="w-full max-w-sm text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#0f766e] shadow-[0_10px_30px_rgba(10,91,86,.14)]"><LoaderCircle className="h-7 w-7 animate-spin" /></span><p className="mt-4 font-bold text-[#173f3c]">جاري تجهيز الخريطة التفاعلية</p><p className="mt-2 text-xs leading-6 text-slate-500">يتم تحميل طبقة الخرائط والتحقق من مواقع المدن المرجعية.</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/85"><div className="h-full w-2/3 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-[#0f766e]" /></div><div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#60736e]"><MapPinned className="h-3.5 w-3.5" />بيانات مكانية موثقة فقط</div></div></div>}
      {status === "error" && <div className="absolute inset-0 grid place-items-center bg-[#f7fbf9] p-6 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><RefreshCw className="h-5 w-5" /></span><p className="mt-3 text-sm font-bold text-[#173f3c]">تعذر تحميل طبقة الخريطة</p><p className="mt-1 text-xs text-slate-500">سيُعرض بديل مكاني تفاعلي للحفاظ على استمرار العمل.</p></div></div>}
    </div>
  );
}
