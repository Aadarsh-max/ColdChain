import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Check, MapPin, Search, X } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { inputClass } from '../ui/Field.jsx';

const NOMINATIM = 'https://nominatim.openstreetmap.org';

const shortName = (text) =>
  String(text || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');

const hasPoint = (value) =>
  Boolean(value) &&
  typeof value.latitude === 'number' &&
  typeof value.longitude === 'number' &&
  Number.isFinite(value.latitude) &&
  Number.isFinite(value.longitude);

export default function LocationPicker({ title, initial, onSelect, onClose }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const requestId = useRef(0);

  const [point, setPoint] = useState(hasPoint(initial) ? { latitude: initial.latitude, longitude: initial.longitude } : null);
  const [name, setName] = useState(initial && initial.name ? initial.name : '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState('');

  const placeMarker = useCallback((lat, lng) => {
    const map = mapRef.current;
    if (!map) return;
    if (!markerRef.current) {
      markerRef.current = L.circleMarker([lat, lng], {
        radius: 10,
        color: '#ffffff',
        weight: 3,
        fillColor: '#dc2626',
        fillOpacity: 1
      }).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, []);

  const choose = useCallback(
    async (lat, lng, label) => {
      const latitude = Math.round(lat * 1e6) / 1e6;
      const longitude = Math.round(lng * 1e6) / 1e6;
      setPoint({ latitude, longitude });
      placeMarker(latitude, longitude);

      if (label) {
        setName(label);
        setNote('');
        return;
      }

      const id = requestId.current + 1;
      requestId.current = id;
      setNote('Looking up the place name...');
      try {
        const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=16&lat=${latitude}&lon=${longitude}`);
        if (!res.ok) throw new Error('lookup failed');
        const body = await res.json();
        if (id === requestId.current) {
          setName(body && body.display_name ? shortName(body.display_name) : '');
          setNote('');
        }
      } catch {
        if (id === requestId.current) setNote('Could not look up the place name. Type it yourself.');
      }
    },
    [placeMarker]
  );

  useEffect(() => {
    const start = hasPoint(initial) ? [initial.latitude, initial.longitude] : [20.5937, 78.9629];
    const map = L.map(containerRef.current, { zoomControl: true }).setView(start, hasPoint(initial) ? 14 : 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;
    if (hasPoint(initial)) placeMarker(initial.latitude, initial.longitude);

    map.on('click', (event) => {
      const wrapped = event.latlng.wrap();
      choose(wrapped.lat, wrapped.lng);
    });

    const timer = setTimeout(() => map.invalidateSize(), 100);

    return () => {
      clearTimeout(timer);
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [choose, placeMarker]);

  const search = async (event) => {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;

    setSearching(true);
    setNote('');
    setResults([]);
    try {
      const res = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=6&q=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error('search failed');
      const items = await res.json();
      if (items.length === 0) setNote('No places found. Try another name, or click on the map.');
      setResults(items);
    } catch {
      setNote('Search is not available right now. Click on the map instead.');
    } finally {
      setSearching(false);
    }
  };

  const pickResult = (item) => {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setResults([]);
    if (mapRef.current) mapRef.current.setView([lat, lng], 15);
    choose(lat, lng, shortName(item.display_name));
  };

  const confirm = () => {
    if (!point) return;
    onSelect({ name: name.trim(), latitude: point.latitude, longitude: point.longitude });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 sm:p-6">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <MapPin className="h-5 w-5 text-red-600" /> {title}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          <form onSubmit={search} className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                className={`${inputClass} pl-9`}
                placeholder="Search a place, for example Mumbai Central or Pune station"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </form>

          {results.length > 0 && (
            <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-sm">
              {results.map((item) => (
                <li key={item.place_id}>
                  <button
                    type="button"
                    onClick={() => pickResult(item)}
                    className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50"
                  >
                    {item.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {note && <p className="text-xs text-slate-500">{note}</p>}

          <div className="relative z-0 h-[340px] overflow-hidden rounded-xl border border-slate-200">
            <div ref={containerRef} className="h-full w-full" />
          </div>
          <p className="text-xs text-slate-500">Click anywhere on the map to drop the marker, then adjust the name if needed.</p>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Place name</span>
              <input
                className={inputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name shown on the shipment"
              />
            </label>
            <div className="text-sm text-slate-600 sm:pt-6">
              {point ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}` : 'No point selected'}
            </div>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!point}>
            <Check className="h-4 w-4" /> Use this location
          </Button>
        </footer>
      </div>
    </div>
  );
}