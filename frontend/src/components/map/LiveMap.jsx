import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair } from 'lucide-react';
import { SITE_NAME } from '../../utils/constants.js';
import { durationText, formatCoordinate, formatDateTime } from '../../utils/format.js';

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

const validPoint = (point) =>
  Boolean(point) &&
  typeof point.latitude === 'number' &&
  typeof point.longitude === 'number' &&
  Number.isFinite(point.latitude) &&
  Number.isFinite(point.longitude) &&
  !(point.latitude === 0 && point.longitude === 0);

const fetchRoadRoute = async (origin, destination, signal) => {
  const url = `${OSRM_URL}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Route request failed');
  const body = await res.json();
  const route = body.routes && body.routes[0];
  if (!route || !route.geometry) throw new Error('No route found');
  return {
    path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    road: true
  };
};

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

  if (location.status === 'manual') {
    add(SITE_NAME, true, '#1d4ed8');
    add(`Lat: ${formatCoordinate(location.latitude)}`);
    add(`Lng: ${formatCoordinate(location.longitude)}`);
    add(`Updated: ${formatDateTime(location.timestamp)}`);
    return box;
  }

  add(
    location.status === 'current' ? 'Current position (valid GPS fix)' : 'Last known location, not current',
    true,
    location.status === 'current' ? '#15803d' : '#b45309'
  );
  add(`Lat: ${formatCoordinate(location.latitude)}`);
  add(`Lng: ${formatCoordinate(location.longitude)}`);
  if (location.status === 'current' && speed !== null && speed !== undefined) add(`Speed: ${Math.round(speed)} km/h`);
  add(`Satellites: ${location.satellites || 0}`);
  add(`Position time: ${formatDateTime(location.timestamp)}`);
  if (location.status === 'last_known') add(`Position age: ${durationText(location.ageSeconds)}`);
  return box;
};

const markerColor = (status) => {
  if (status === 'current') return '#ef4444';
  if (status === 'manual') return '#2563eb';
  return '#64748b';
};

const letterIcon = (letter, color) =>
  L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};color:#fff;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font:700 13px Inter,sans-serif">${letter}</div>`
  });

export default function LiveMap({ route = [], location, shipmentId, speed, planned = null, heightClass = 'h-[520px]' }) {
  const containerRef = useRef(null);
  const layers = useRef({ owner: null, line: null, start: null, marker: null, plan: null, pointA: null, pointB: null });
  const fitted = useRef('');
  const [map, setMap] = useState(null);
  const [plan, setPlan] = useState(null);

  const plannedValid = Boolean(planned) && validPoint(planned.origin) && validPoint(planned.destination);
  const planKey = plannedValid
    ? `${planned.origin.latitude},${planned.origin.longitude};${planned.destination.latitude},${planned.destination.longitude}`
    : '';

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
      layers.current = { owner: null, line: null, start: null, marker: null, plan: null, pointA: null, pointB: null };
      fitted.current = '';
      instance.remove();
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!plannedValid) {
      setPlan(null);
      return undefined;
    }

    const controller = new AbortController();
    const origin = planned.origin;
    const destination = planned.destination;
    const straight = {
      path: [
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude]
      ],
      road: false
    };

    fetchRoadRoute(origin, destination, controller.signal)
      .then((result) => setPlan(result))
      .catch((err) => {
        if (err && err.name === 'AbortError') return;
        setPlan(straight);
      });

    return () => controller.abort();
  }, [planKey]);

  const fit = useCallback(() => {
    if (!map) return false;
    const points = route.map((point) => [point.latitude, point.longitude]);
    if (location && location.available) points.push([location.latitude, location.longitude]);
    if (plan) points.push(...plan.path);
    if (points.length === 0) return false;

    if (points.length === 1) {
      map.setView(points[0], 16);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
    return true;
  }, [map, route, location, plan]);

  useEffect(() => {
    if (!map) return;

    if (layers.current.owner !== map) {
      layers.current = { owner: map, line: null, start: null, marker: null, plan: null, pointA: null, pointB: null };
    }
    const layer = layers.current;

    if (plan) {
      if (!layer.plan) layer.plan = L.polyline([], { color: '#dc2626', weight: 5, opacity: 0.85 }).addTo(map);
      layer.plan.setLatLngs(plan.path);
      layer.plan.setStyle({ dashArray: plan.road ? null : '10 8' });

      const first = plan.path[0];
      const last = plan.path[plan.path.length - 1];
      const originName = planned && planned.origin.name ? planned.origin.name : 'Origin';
      const destinationName = planned && planned.destination.name ? planned.destination.name : 'Destination';

      if (!layer.pointA) layer.pointA = L.marker(first, { icon: letterIcon('A', '#16a34a') });
      layer.pointA.setLatLng(first);
      layer.pointA.bindTooltip(`Origin: ${originName}`);
      if (!map.hasLayer(layer.pointA)) layer.pointA.addTo(map);

      if (!layer.pointB) layer.pointB = L.marker(last, { icon: letterIcon('B', '#dc2626') });
      layer.pointB.setLatLng(last);
      layer.pointB.bindTooltip(`Destination: ${destinationName}`);
      if (!map.hasLayer(layer.pointB)) layer.pointB.addTo(map);
    } else {
      if (layer.plan && map.hasLayer(layer.plan)) map.removeLayer(layer.plan);
      if (layer.pointA && map.hasLayer(layer.pointA)) map.removeLayer(layer.pointA);
      if (layer.pointB && map.hasLayer(layer.pointB)) map.removeLayer(layer.pointB);
    }

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
        }).bindTooltip('Travelled path start');
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

    const key = `${shipmentId || 'none'}:${location && location.available ? location.status : 'none'}:${plan ? 'plan' : 'noplan'}`;
    if (fitted.current !== key && fit()) fitted.current = key;
  }, [map, route, location, shipmentId, speed, plan, planned, fit]);

  return (
    <div className={`relative z-0 ${heightClass} overflow-hidden rounded-xl border border-slate-200`}>
      <div ref={containerRef} className="h-full w-full" />
      {plan && (
        <div className="absolute right-3 top-3 z-[500] rounded-lg bg-white/95 px-3 py-2 text-xs shadow">
          <div className="font-bold text-red-600">Planned route</div>
          {plan.road ? (
            <div className="text-slate-600">
              About {Math.round(plan.distanceKm)} km, {durationText(Math.round(plan.durationMin * 60))} by road (estimate)
            </div>
          ) : (
            <div className="text-slate-600">Straight line between origin and destination</div>
          )}
        </div>
      )}
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