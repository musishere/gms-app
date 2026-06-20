'use client';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { City, Graveyard } from '@/lib/graveyards';

export type GraveyardWithStats = Graveyard & { stats?: { total: number; available: number } };

/* ── Animated fly-to ─────────────────────────────────────────────────────── */
function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1.4, easeLinearity: 0.2 });
  }, [map, lat, lng, zoom]);
  return null;
}

/* ── City marker icon ─────────────────────────────────────────────────────── */
function makeCityIcon(name: string, count: number, active: boolean): L.DivIcon {
  const size = active ? 50 : 40;
  const glow = active ? '0 0 18px rgba(16,185,129,0.7)' : '0 0 8px rgba(16,185,129,0.25)';
  const bg = active ? '#10b981' : '#0f172a';
  const border = active ? '3px solid #fff' : '2px solid #10b981';
  const label = active ? '#fff' : '#94a3b8';
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;">
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${bg};border:${border};
          box-shadow:${glow};
          display:flex;align-items:center;justify-content:center;font-size:${active ? 22 : 18}px;
          transition:all 0.35s cubic-bezier(.4,0,.2,1);
        ">🕌</div>
        <div style="
          background:${bg};color:${label};
          border:1px solid ${active ? '#34d399' : '#1e293b'};
          border-radius:99px;padding:2px 9px;
          font-size:11px;font-weight:700;font-family:system-ui,sans-serif;
          white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);
          transition:all 0.35s;
        ">${name}${count > 0 ? ` <span style="color:#10b981">${count}</span>` : ''}</div>
      </div>`,
    iconSize: [120, 68],
    iconAnchor: [60, 25],
  });
}

/* ── Graveyard marker icon ──────────────────────────────────────────────────── */
function makeGraveyardIcon(area: string, available: number | undefined, active: boolean): L.DivIcon {
  const size = active ? 40 : 30;
  const glow = active ? '0 0 14px rgba(16,185,129,0.65)' : '0 0 6px rgba(16,185,129,0.2)';
  const bg = active ? '#10b981' : '#0f172a';
  const border = active ? '3px solid #fff' : '2px solid #10b981';
  const avail = available !== undefined
    ? `<span style="color:${active ? '#d1fae5' : '#10b981'}"> · ${available} avail</span>`
    : '';
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;">
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${bg};border:${border};
          box-shadow:${glow};
          display:flex;align-items:center;justify-content:center;font-size:${active ? 18 : 14}px;
          transition:all 0.35s cubic-bezier(.4,0,.2,1);
        ">⛼</div>
        <div style="
          background:${bg};color:#e2e8f0;
          border:1px solid ${active ? '#34d399' : '#1e293b'};
          border-radius:99px;padding:2px 7px;
          font-size:10px;font-weight:600;font-family:system-ui,sans-serif;
          white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;
          box-shadow:0 2px 6px rgba(0,0,0,0.45);
          transition:all 0.35s;
        ">${area}${avail}</div>
      </div>`,
    iconSize: [130, 55],
    iconAnchor: [65, 20],
  });
}

/* ── Marker layer rendered via useEffect (avoids icon-update lag in react-leaflet) ── */
function MarkersLayer({
  mode,
  cities,
  graveyards,
  selectedCityId,
  selectedGraveyardId,
  onCitySelect,
  onGraveyardSelect,
}: {
  mode: 'cities' | 'graveyards';
  cities: (City & { graveyardCount?: number })[];
  graveyards: GraveyardWithStats[];
  selectedCityId?: string;
  selectedGraveyardId?: string;
  onCitySelect?: (id: string) => void;
  onGraveyardSelect?: (id: string) => void;
}) {
  const map = useMap();
  // Keep callbacks stable without causing marker re-creation
  const citySelectRef = useRef(onCitySelect);
  const graveSelectRef = useRef(onGraveyardSelect);
  useEffect(() => { citySelectRef.current = onCitySelect; }, [onCitySelect]);
  useEffect(() => { graveSelectRef.current = onGraveyardSelect; }, [onGraveyardSelect]);

  useEffect(() => {
    const markers: L.Marker[] = [];

    if (mode === 'cities') {
      cities.forEach(city => {
        const active = selectedCityId === city.id;
        const m = L.marker([city.latitude, city.longitude], {
          icon: makeCityIcon(city.name, city.graveyardCount ?? 0, active),
          zIndexOffset: active ? 1000 : 0,
        })
          .on('click', () => citySelectRef.current?.(city.id))
          .addTo(map);
        markers.push(m);
      });
    } else {
      graveyards.forEach(gy => {
        const active = selectedGraveyardId === gy.id;
        const m = L.marker([gy.latitude, gy.longitude], {
          icon: makeGraveyardIcon(gy.area, gy.stats?.available, active),
          zIndexOffset: active ? 1000 : 0,
        })
          .on('click', () => graveSelectRef.current?.(gy.id))
          .addTo(map);
        markers.push(m);
      });
    }

    return () => markers.forEach(m => { try { m.remove(); } catch (_) {} });
  // Re-run when selection or data changes so icons update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mode, cities, graveyards, selectedCityId, selectedGraveyardId]);

  return null;
}

/* ── Public interface ───────────────────────────────────────────────────────── */
export interface BookingFlowMapProps {
  mode: 'cities' | 'graveyards';
  cities?: (City & { graveyardCount?: number })[];
  graveyards?: GraveyardWithStats[];
  flyTarget: { lat: number; lng: number; zoom: number };
  selectedCityId?: string;
  selectedGraveyardId?: string;
  onCitySelect?: (id: string) => void;
  onGraveyardSelect?: (id: string) => void;
  /** Tailwind height class, default h-80 */
  height?: string;
}

export default function BookingFlowMap({
  mode,
  cities = [],
  graveyards = [],
  flyTarget,
  selectedCityId,
  selectedGraveyardId,
  onCitySelect,
  onGraveyardSelect,
  height = 'h-80',
}: BookingFlowMapProps) {
  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-700 ${height}`}>
      <MapContainer
        center={[flyTarget.lat, flyTarget.lng]}
        zoom={flyTarget.zoom}
        className="h-full w-full z-0"
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
      >
        {/* Dark CartoDB tiles match the app's dark theme */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />

        <MarkersLayer
          mode={mode}
          cities={cities}
          graveyards={graveyards}
          selectedCityId={selectedCityId}
          selectedGraveyardId={selectedGraveyardId}
          onCitySelect={onCitySelect}
          onGraveyardSelect={onGraveyardSelect}
        />
      </MapContainer>

      {/* Hint overlay */}
      <div className="absolute top-3 left-3 z-[999] pointer-events-none">
        <div className="bg-slate-950/85 backdrop-blur border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-medium">
          {mode === 'cities' ? '📍 Hover cards or click a city marker' : '🗺 Hover cards or click a graveyard marker'}
        </div>
      </div>

      {/* Attribution */}
      <div className="absolute bottom-1 right-1 z-[999] text-[9px] text-slate-600 pointer-events-none">
        © OpenStreetMap · © CARTO
      </div>
    </div>
  );
}
