export function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export function sortByNearest<T extends { lat?: number; lng?: number }>(
  origin: { lat: number; lng: number } | null,
  items: (T & { id: string })[],
): (T & { id: string; distanceMeters?: number })[] {
  if (!origin) return items;
  const withDistance = items.map((i) => {
    if (typeof i.lat === "number" && typeof i.lng === "number") {
      return {
        ...i,
        distanceMeters: haversineDistanceMeters(origin, {
          lat: i.lat,
          lng: i.lng,
        }),
      };
    }
    return i;
  });
  return withDistance.sort(
    (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
  );
}




