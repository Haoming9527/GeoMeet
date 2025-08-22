"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";

// Fix for missing marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type LatLng = { lat: number; lng: number };
type NearbyUser = { id: string; lat?: number; lng?: number };

export default function LeafletMapInner({
  center,
  nearby,
  mapKey,
  showBlueDot = true,
}: {
  center: LatLng;
  nearby: NearbyUser[];
  mapKey: string;
  showBlueDot?: boolean;
}) {
  return (
    <MapContainer
      key={mapKey}
      center={[center.lat, center.lng]}
      zoom={15}
      scrollWheelZoom={false}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {center && showBlueDot && (
        <CircleMarker
          center={[center.lat, center.lng]}
          radius={8}
          pathOptions={{
            color: "#2563eb",
            fillColor: "#3b82f6",
            fillOpacity: 0.9,
          }}
        >
          <Popup>My Location</Popup>
        </CircleMarker>
      )}
      {nearby
        .filter((u) => typeof u.lat === "number" && typeof u.lng === "number")
        .map((u) => (
          <CircleMarker
            key={u.id}
            center={[u.lat as number, u.lng as number]}
            radius={6}
            pathOptions={{
              color: "#dc2626",
              fillColor: "#ef4444",
              fillOpacity: 0.9,
            }}
          >
            <Popup>{u.id}</Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}
