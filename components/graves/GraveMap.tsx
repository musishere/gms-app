'use client';
import { useEffect, useMemo, useCallback, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapLocationSearch, { type MapSearchResult } from './MapLocationSearch';
import type { Graveyard } from '@/lib/graveyards';

type OsmCemeteryPin = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type Grave = {
  id: string;
  graveNumber: string;
  section: string;
  latitude?: number;
  longitude?: number;
  status: string;
  size: string;
  price: number;
  occupiedBy?: string;
  graveyardId?: string;
};

const STATUS_COLOR: Record<string, string> = {
  available: '#10b981',
  occupied: '#64748b',
  reserved: '#3b82f6',
  maintenance: '#f97316',
};

const graveyardIcon = (active: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${active ? '#10b981' : '#1e293b'};border:3px solid ${active ? '#fff' : '#10b981'};box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:14px">⛼</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const osmCemeteryIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#78350f;border:2px solid #fbbf24;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:11px">⚱</div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom ?? 16, { duration: 1.2 });
  }, [map, lat, lng, zoom]);
  return null;
}

function FitGraves({ graves, section }: { graves: Grave[]; section: string }) {
  const map = useMap();
  const withCoords = graves.filter(g => g.latitude && g.longitude);

  useEffect(() => {
    if (withCoords.length === 0) return;
    const filtered = section ? withCoords.filter(g => g.section === section) : withCoords;
    const points = filtered.length > 0 ? filtered : withCoords;
    if (points.length === 1) {
      map.setView([points[0].latitude!, points[0].longitude!], 18);
    } else {
      const lats = points.map(g => g.latitude!);
      const lngs = points.map(g => g.longitude!);
      map.fitBounds([
        [Math.min(...lats) - 0.001, Math.min(...lngs) - 0.001],
        [Math.max(...lats) + 0.001, Math.max(...lngs) + 0.001],
      ]);
    }
  }, [map, graves, section, withCoords]);
  return null;
}

function FocusGrave({ graveId, graves }: { graveId?: string; graves: Grave[] }) {
  const map = useMap();
  useEffect(() => {
    if (!graveId) return;
    const g = graves.find(gr => gr.id === graveId);
    if (g?.latitude && g?.longitude) map.setView([g.latitude, g.longitude], 19);
  }, [map, graveId, graves]);
  return null;
}

function GraveyardPopupContent({
  gy,
  onGraveyardSelect,
  onViewGraves,
}: {
  gy: Graveyard;
  onGraveyardSelect?: (id: string) => void;
  onViewGraves?: (id: string) => void;
}) {
  const map = useMap();

  const viewGraves = useCallback((e: React.MouseEvent) => {
    L.DomEvent.stopPropagation(e.nativeEvent);
    e.preventDefault();
    onGraveyardSelect?.(gy.id);
    onViewGraves?.(gy.id);
    map.closePopup();
  }, [gy.id, map, onGraveyardSelect, onViewGraves]);

  return (
    <div className="text-sm min-w-[160px]">
      <p className="font-bold text-slate-900">{gy.name}</p>
      <p className="text-xs text-slate-600">{gy.area}, Lahore</p>
      <p className="text-xs mt-1 text-slate-700">{gy.description}</p>
      <button
        type="button"
        onClick={viewGraves}
        className="mt-2 w-full text-center text-xs text-white font-semibold bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg cursor-pointer"
      >
        View graves →
      </button>
    </div>
  );
}

function disablePopupMapCapture(popup: L.Popup) {
  const el = popup.getElement();
  if (!el) return;
  L.DomEvent.disableClickPropagation(el);
  L.DomEvent.disableScrollPropagation(el);
}

interface GraveMapProps {
  graves: Grave[];
  graveyards?: Graveyard[];
  selectedGraveyardId?: string;
  section: string;
  selectedId?: string | null;
  focusGraveId?: string | null;
  flyTo?: { lat: number; lng: number; zoom?: number } | null;
  showSearch?: boolean;
  onSelect: (grave: Grave) => void;
  onGraveyardSelect?: (graveyardId: string) => void;
  onViewGraves?: (graveyardId: string) => void;
  onSearchSelect?: (result: MapSearchResult) => void;
  showOsmCemeteries?: boolean;
}

export default function GraveMap({
  graves,
  graveyards = [],
  selectedGraveyardId,
  section,
  selectedId,
  focusGraveId,
  flyTo,
  showSearch = true,
  onSelect,
  onGraveyardSelect,
  onViewGraves,
  onSearchSelect,
  showOsmCemeteries = true,
}: GraveMapProps) {
  const [osmCemeteries, setOsmCemeteries] = useState<OsmCemeteryPin[]>([]);

  useEffect(() => {
    if (!showOsmCemeteries) return;
    fetch('/api/geocode/cemeteries')
      .then(r => r.json())
      .then(d => setOsmCemeteries(d.cemeteries ?? []))
      .catch(() => setOsmCemeteries([]));
  }, [showOsmCemeteries]);

  const siteGraves = useMemo(
    () => graves.filter(g =>
      g.latitude && g.longitude &&
      (!selectedGraveyardId || g.graveyardId === selectedGraveyardId || !g.graveyardId) &&
      (!section || g.section === section),
    ),
    [graves, selectedGraveyardId, section],
  );

  const center: [number, number] = useMemo(() => {
    const gy = graveyards.find(g => g.id === selectedGraveyardId);
    if (gy) return [gy.latitude, gy.longitude];
    if (siteGraves.length > 0) return [siteGraves[0].latitude!, siteGraves[0].longitude!];
    return [31.5204, 74.3587];
  }, [graveyards, selectedGraveyardId, siteGraves]);

  const handleSearch = (r: MapSearchResult) => {
    onSearchSelect?.(r);
    if (r.type === 'graveyard') onGraveyardSelect?.(r.id);
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700">
      <MapContainer center={center} zoom={15} className="h-[500px] w-full z-0" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {flyTo && <FlyTo lat={flyTo.lat} lng={flyTo.lng} zoom={flyTo.zoom} />}
        <FitGraves graves={siteGraves} section={section} />
        {focusGraveId && <FocusGrave graveId={focusGraveId} graves={graves} />}

        {graveyards.map(gy => (
          <Marker
            key={gy.id}
            position={[gy.latitude, gy.longitude]}
            icon={graveyardIcon(selectedGraveyardId === gy.id)}
            eventHandlers={{ click: () => onGraveyardSelect?.(gy.id) }}
          >
            <Popup
              closeButton
              autoPan
              eventHandlers={{ add: e => disablePopupMapCapture(e.popup) }}
            >
              <GraveyardPopupContent gy={gy} onGraveyardSelect={onGraveyardSelect} onViewGraves={onViewGraves} />
            </Popup>
          </Marker>
        ))}

        {showOsmCemeteries && osmCemeteries.map(c => (
          <Marker
            key={c.id}
            position={[c.latitude, c.longitude]}
            icon={osmCemeteryIcon}
            zIndexOffset={-100}
          >
            <Popup eventHandlers={{ add: e => disablePopupMapCapture(e.popup) }}>
              <div className="text-sm min-w-[140px]">
                <p className="font-bold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-600">{c.address}</p>
                <p className="text-[10px] mt-1 text-amber-700 uppercase tracking-wide">OpenStreetMap · not in GMS</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {siteGraves.map(g => (
          <CircleMarker
            key={g.id}
            center={[g.latitude!, g.longitude!]}
            radius={selectedId === g.id ? 10 : 7}
            pathOptions={{
              color: selectedId === g.id ? '#fff' : (STATUS_COLOR[g.status] ?? '#64748b'),
              fillColor: STATUS_COLOR[g.status] ?? '#64748b',
              fillOpacity: 0.85,
              weight: selectedId === g.id ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onSelect(g) }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{g.graveNumber}</p>
                <p className="text-xs capitalize">{g.status} · {g.size}</p>
                {g.occupiedBy && <p className="text-xs">{g.occupiedBy}</p>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {showSearch && (
        <MapLocationSearch
          onSelect={handleSearch}
          onGraveyardSelect={onGraveyardSelect}
          onViewGraves={onViewGraves}
        />
      )}

      <div className="absolute bottom-3 left-3 z-[999] bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 flex flex-wrap gap-3 max-w-[calc(100%-1.5rem)]">
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-slate-300">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{status}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-slate-300 border-l border-slate-600 pl-3">
          <span>⛼</span> GMS graveyard
        </div>
        {showOsmCemeteries && osmCemeteries.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-300 border-l border-slate-600 pl-3">
            <span>⚱</span> OSM cemetery
          </div>
        )}
      </div>
    </div>
  );
}
