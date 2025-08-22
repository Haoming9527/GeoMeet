"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";

// Wrap Leaflet map in a dynamically imported inner component to isolate initialization
const LeafletMapInner = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
});

type LatLng = { lat: number; lng: number };

type NearbyUser = {
  id: string;
  lat?: number;
  lng?: number;
};

export function GeoMap({
  center,
  nearby,
  showBlueDot = true,
}: {
  center: LatLng | null;
  nearby: NearbyUser[];
  showBlueDot?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [mapKey] = useState(() => `map-${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    setMounted(true);
  }, []);

  const mapCenter = useMemo<LatLng>(() => {
    return center ?? { lat: 1.3521, lng: 103.8198 }; // default SG
  }, [center]);

  if (!mounted) {
    return (
      <div className="w-full h-64 rounded-lg overflow-hidden border border-[var(--app-card-border)]" />
    );
  }

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-[var(--app-card-border)]">
      <LeafletMapInner center={mapCenter} nearby={nearby} mapKey={mapKey} />
    </div>
  );
}
