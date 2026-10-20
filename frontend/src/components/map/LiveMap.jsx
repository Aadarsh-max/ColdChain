import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair } from 'lucide-react';
import { durationText, formatCoordinate, formatDateTime } from '../../utils/format.js';

const popupContent = (location, shipmentId, speed) => {
  const box = document.createElement('div');
  box.style.cssText = 'font:13px Inter,sans-serif;color:#1e293b;min-width:180px';

  const add = (text, bold = false, color = '') => {
    const line = document.createElement('div');
    line.textContent = text;
    if (bold) line.style.fontWeight = '700';
    if (color) line.style.color = color;
    box.appendChild(line);
  };

  add(shipmentId ? `Shipment: ${shipmentId}` : 'Device position', true);
  add(
    location.status === 'current'
      ? 'Current position (valid GPS fix)'
      : location.status === 'manual'
        ? 'Fixed site location (set manually, not GPS)'
        : 'Last known location, not current',
    true,
    location.status === 'last_known' ? '#b45309' : '#15803d'
  );
  add(`Lat: ${formatCoordinate(location.latitude)}`);
  add(`Lng: ${formatCoordinate(location.longitude)}`);
  if (location.status === 'current' && speed !== null && speed !== undefined) add(`Speed: ${Math.round(speed)} km/h`);
  add(`Satellites: ${location.satellites || 0}`);
  add(`Fix time: ${formatDateTime(location.timestamp)}`);
  if (location.status === 'last_known') add(`Position age: ${durationText(location.ageSeconds)}`);
  return box;
};

const markerColor = (status) => {
  if (status === 'current') return '#ef4444';
  if (status === 'manual') return '#2563eb';
  return '#64748b';
};

export default function LiveMap({ route = [], location, shipmentId, speed, heightClass = 'h-[520px]' }) {
  const containerRef = useRef(null);
  const layers = useRef({ owner: null, line: null, start: null, marker: null });
  const fitted = useRef('');
  const [map, setMap] = useState(null);

  useEffect(() => {
    const instance = L.map(containerRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(instance);

    const timer = setTimeout(() => instance.invalidateSize(), 100);
    setMap(instance);

    return () => {
      clearTimeout(timer);
      layers.current = { owner: null, line: null, start: null, marker: null };
      fitted.current = '';
      instance.remove();
      setMap(null);
    };
  }, []);

  const fit = useCallback(() => {
    if (!map) return false;
    const points = route.map((point) => [point.latitude, point.longitude]);
    if (location && location.available) points.push([location.latitude, location.longitude]);
    if (points.length === 0) return false;

    if (points.length === 1) {
      map.setView(points[0], 16);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
    return true;
  }, [map, route, location]);

  useEffect(() => {
    if (!map) return;

    if (layers.current.owner !== map) {
      layers.current = { owner: map, line: null, start: null, marker: null };
    }
    const layer = layers.current;
    const path = route.map((point) => [point.latitude, point.longitude]);

    if (!layer.line) layer.line = L.polyline([], { color: '#2563eb', weight: 4, opacity: 0.9 }).addTo(map);
    layer.line.setLatLngs(path);

    if (path.length > 1) {
      if (!layer.start) {
        layer.start = L.circleMarker(path[0], {
          radius: 7,
          color: '#ffffff',
          weight: 3,
          fillColor: '#16a34a',
          fillOpacity: 1
        }).bindTooltip('First recorded fix');
      }
      layer.start.setLatLng(path[0]);
      if (!map.hasLayer(layer.start)) layer.start.addTo(map);
    } else if (layer.start && map.hasLayer(layer.start)) {
      map.removeLayer(layer.start);
    }

    if (location && location.available) {
      const position = [location.latitude, location.longitude];

      if (!layer.marker) {
        layer.marker = L.circleMarker(position, { radius: 10, color: '#ffffff', weight: 3, fillOpacity: 1 });
        layer.marker.bindPopup(popupContent(location, shipmentId, speed));
      }
      layer.marker.setLatLng(position);
      layer.marker.setStyle({ fillColor: markerColor(location.status) });
      layer.marker.setPopupContent(popupContent(location, shipmentId, speed));
      if (!map.hasLayer(layer.marker)) layer.marker.addTo(map);
      layer.marker.bringToFront();
    } else if (layer.marker && map.hasLayer(layer.marker)) {
      map.removeLayer(layer.marker);
    }

    const key = `${shipmentId || 'none'}:${location && location.available ? location.status : 'none'}`;
    if (fitted.current !== key && fit()) fitted.current = key;
  }, [map, route, location, shipmentId, speed, fit]);

  return (
    <div className={`relative z-0 ${heightClass} overflow-hidden rounded-xl border border-slate-200`}>
      <div ref={containerRef} className="h-full w-full" />
      <button
        type="button"
        onClick={fit}
        className="absolute bottom-6 left-3 z-[500] flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow hover:bg-slate-50"
      >
        <Crosshair className="h-4 w-4" /> Fit to route
      </button>
    </div>
  );
}