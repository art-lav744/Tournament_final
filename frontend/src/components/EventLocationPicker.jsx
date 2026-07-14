import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

const DEFAULT_CENTER = [24.7111, 48.9226];
const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

export default function EventLocationPicker({ value, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: value ? [value.longitude, value.latitude] : DEFAULT_CENTER,
      zoom: value ? 15 : 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    function setPoint(lngLat) {
      markerRef.current?.remove();
      const element = document.createElement("div");
      element.className = "event-location-marker";
      markerRef.current = new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat(lngLat)
        .addTo(map);
      onChange({ latitude: lngLat.lat, longitude: lngLat.lng });
    }

    map.on("click", (event) => setPoint(event.lngLat));
    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;

    const lngLat = { lng: value.longitude, lat: value.latitude };
    if (!markerRef.current) {
      const element = document.createElement("div");
      element.className = "event-location-marker";
      markerRef.current = new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(lngLat);
    }
  }, [value]);

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        onChange(next);
        mapRef.current?.flyTo({
          center: [next.longitude, next.latitude],
          zoom: 16,
          duration: 700,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div className="event-location-picker-wrap">
      <div ref={containerRef} className="event-location-picker" />
      <button className="event-location-use-me" type="button" onClick={useCurrentLocation}>
        Використати мою позицію
      </button>
    </div>
  );
}
