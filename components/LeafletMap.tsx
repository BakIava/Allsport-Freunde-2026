"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's broken default icon paths when bundled with webpack/Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Coords {
  lat: number;
  lon: number;
}

interface LeafletMapProps {
  address: string;
  label?: string;
}

export default function LeafletMap({ address, label }: LeafletMapProps) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState(false);
  const cache = useRef<Record<string, Coords>>({});

  useEffect(() => {
    if (!address) return;

    if (cache.current[address]) {
      setCoords(cache.current[address]);
      return;
    }

    const controller = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: { "Accept-Language": "de" },
        signal: controller.signal,
      }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data[0]) {
          const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
          cache.current[address] = result;
          setCoords(result);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(true);
      });

    return () => controller.abort();
  }, [address]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg text-sm text-gray-500">
        Karte konnte nicht geladen werden
      </div>
    );
  }

  if (!coords) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg text-sm text-gray-400 animate-pulse">
        Karte wird geladen...
      </div>
    );
  }

  return (
    <MapContainer
      center={[coords.lat, coords.lon]}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[coords.lat, coords.lon]} icon={defaultIcon}>
        <Popup>{label ?? address}</Popup>
      </Marker>
    </MapContainer>
  );
}
