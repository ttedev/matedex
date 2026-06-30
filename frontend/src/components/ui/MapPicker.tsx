import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { LeafletMouseEvent } from 'leaflet';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  lat?: number;
  lng?: number;
  onLocationChange: (lat: number, lng: number, name: string) => void;
}

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface NominatimReverseResult {
  display_name?: string;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onClick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export default function MapPicker({ lat, lng, onLocationChange }: MapPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    typeof lat === 'number' && typeof lng === 'number' ? [lat, lng] : null
  );
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ferme la liste si clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce : lance la recherche 400ms après la dernière frappe
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = search.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(trimmed);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  async function fetchSuggestions(query: string): Promise<void> {
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=fr`
      );
      if (!res.ok) return;
      const data = (await res.json()) as NominatimSearchResult[];
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch {
      // silence
    } finally {
      setIsSearching(false);
    }
  }

  function selectSuggestion(result: NominatimSearchResult): void {
    const nextPosition: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    setPosition(nextPosition);
    mapRef.current?.flyTo(nextPosition, 13);
    onLocationChange(nextPosition[0], nextPosition[1], result.display_name);
    setSearch(result.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function reverseGeocode(nextLat: number, nextLng: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${nextLat}&lon=${nextLng}&format=json&accept-language=fr`
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as NominatimReverseResult;
      return data.display_name ?? `${nextLat.toFixed(4)}, ${nextLng.toFixed(4)}`;
    } catch {
      return `${nextLat.toFixed(4)}, ${nextLng.toFixed(4)}`;
    }
  }

  async function handleMapClick(nextLat: number, nextLng: number): Promise<void> {
    setPosition([nextLat, nextLng]);
    setSuggestions([]);
    setShowSuggestions(false);
    const name = await reverseGeocode(nextLat, nextLng);
    setSearch(name);
    onLocationChange(nextLat, nextLng, name);
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="relative z-[1000]">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setShowSuggestions(false);
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                if (suggestions.length > 0) selectSuggestion(suggestions[0]);
              }
            }}
            placeholder="Rechercher un lieu..."
            autoComplete="off"
            className="flex-1 px-4 py-3 rounded-lg bg-surface-container border border-outline-variant text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {isSearching ? (
            <div className="px-4 py-3 flex items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
            </div>
          ) : (
            <div className="px-4 py-3 flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined">search</span>
            </div>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-outline-variant rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
            {suggestions.map((result) => (
              <li key={`${result.lat}-${result.lon}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(result)}
                  className="w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container-high transition-colors duration-150 border-b border-outline-variant/30 last:border-0"
                >
                  <span className="material-symbols-outlined text-sm align-middle mr-2 text-primary">location_on</span>
                  {result.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg overflow-hidden border border-outline-variant" style={{ height: '250px' }}>
        <MapContainer
          center={position ?? [48.8566, 2.3522]}
          zoom={position ? 13 : 5}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onClick={(nlat, nlng) => void handleMapClick(nlat, nlng)} />
          {position ? <Marker position={position} /> : null}
        </MapContainer>
      </div>

      <p className="text-label-sm text-on-surface-variant text-center">
        Tape une adresse ou clique sur la carte pour placer le lieu.
      </p>
    </div>
  );
}