"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

/**
 * OpenStreetMap picker. Map tiles require Internet; coordinates are stored
 * as plain numbers so they remain available offline.
 */
export default function LocationPicker({ lat, lng, onChange, readOnly = false, height = 240 }: { lat: number | null; lng: number | null; onChange?: (lat: number, lng: number) => void; readOnly?: boolean; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!ref.current || map.current) return;
    const center: L.LatLngExpression = lat != null && lng != null ? [lat, lng] : [39.5, -8.0];
    const m = L.map(ref.current, { center, zoom: lat != null ? 15 : 6, scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(m);
    if (lat != null && lng != null) marker.current = L.circleMarker([lat, lng], { radius: 9, color: "#1e3a5f", fillColor: "#12b76a", fillOpacity: 0.9 }).addTo(m);
    if (!readOnly) {
      m.on("click", (e: L.LeafletMouseEvent) => {
        const { lat: la, lng: ln } = e.latlng;
        if (marker.current) marker.current.setLatLng(e.latlng);
        else marker.current = L.circleMarker(e.latlng, { radius: 9, color: "#1e3a5f", fillColor: "#12b76a", fillOpacity: 0.9 }).addTo(m);
        onChange?.(Math.round(la * 1e6) / 1e6, Math.round(ln * 1e6) / 1e6);
      });
    }
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is created once; position updates handled below
  }, []);

  useEffect(() => {
    if (!map.current || lat == null || lng == null) return;
    if (marker.current) marker.current.setLatLng([lat, lng]);
    else marker.current = L.circleMarker([lat, lng], { radius: 9, color: "#1e3a5f", fillColor: "#12b76a", fillOpacity: 0.9 }).addTo(map.current);
  }, [lat, lng]);

  return <div ref={ref} style={{ height }} className="overflow-hidden rounded-lg border border-slate-200" role="application" aria-label="Mapa para escolher a localização" />;
}
