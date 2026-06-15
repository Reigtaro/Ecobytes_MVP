'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import PublicLayout from '@/components/PublicLayout';
import { getStoredUser } from '@/lib/auth';
import { getApiUrl } from '@/lib/api';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CollectionPoint {
  id: number;
  name: string;
  address: string;
  city: string | null;
  region: string | null;
  commune: string | null;
  latitude: number;
  longitude: number;
  type: string | null;
  materials: string | null; // JSON: ["metal","phone","power_bank"] — materiales aceptados
  contact: string | null;
  website: string | null;
}

// ─── Materiales RAEE ──────────────────────────────────────────────────────────

const RAEE_MATERIALS: Record<string, { label: string; icon: string; color: string }> = {
  metal:       { label: 'Metal',        icon: '⚙️',  color: 'bg-slate-500/15 text-slate-300 border-slate-500/25' },
  phone:       { label: 'Celulares',    icon: '📱',  color: 'bg-violet-500/15 text-violet-300 border-violet-500/25' },
  power_bank:  { label: 'Pilas/Baterías', icon: '🔋', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
};

function parseMaterials(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// ─── Distancia haversine (km) ─────────────────────────────────────────────────

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Estilos del mapa (oscuro, minimalista) ───────────────────────────────────

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',                                                 stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.icon',                                              stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill',                                         stylers: [{ color: '#64748b' }] },
  { elementType: 'labels.text.stroke',                                       stylers: [{ color: '#0f172a' }] },
  { featureType: 'administrative.country',  elementType: 'geometry.stroke',  stylers: [{ color: '#334155' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'landscape',               elementType: 'geometry',         stylers: [{ color: '#1e293b' }] },
  { featureType: 'landscape.natural',       elementType: 'geometry',         stylers: [{ color: '#0f172a' }] },
  { featureType: 'poi',                                                       stylers: [{ visibility: 'off' }] },
  { featureType: 'road',                    elementType: 'geometry',         stylers: [{ color: '#1e293b' }] },
  { featureType: 'road',                    elementType: 'geometry.stroke',  stylers: [{ color: '#334155' }] },
  { featureType: 'road',                    elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'road.highway',            elementType: 'geometry',         stylers: [{ color: '#1d3461' }] },
  { featureType: 'road.highway',            elementType: 'labels.text.fill', stylers: [{ color: '#93c5fd' }] },
  { featureType: 'transit',                                                   stylers: [{ visibility: 'off' }] },
  { featureType: 'water',                   elementType: 'geometry',         stylers: [{ color: '#0c1a3d' }] },
  { featureType: 'water',                   elementType: 'labels.text.fill', stylers: [{ color: '#1e3a5f' }] },
];

// ─── Icono de marcador ────────────────────────────────────────────────────────

// pointType: 'raee' = acepta e-waste (metal/phone/batería), 'generic' = otros materiales
function createPinIcon(selected = false, pointType: 'raee' | 'generic' = 'raee'): string {
  const isRaee = pointType === 'raee';
  const fill   = selected ? '#06b6d4' : isRaee ? '#14b8a6' : '#6366f1';
  const stroke = selected ? '#0891b2' : isRaee ? '#0d9488' : '#4f46e5';
  const inner  = selected ? '#06b6d4' : isRaee ? '#14b8a6' : '#6366f1';
  // Icono dentro del pin: circuito para RAEE, reciclaje para genérico
  const icon = isRaee
    ? `<text x="16" y="20" text-anchor="middle" font-size="9" fill="${inner}">⚡</text>`
    : `<text x="16" y="20" text-anchor="middle" font-size="9" fill="${inner}">♻</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <defs>
      <filter id="s" x="-30%" y="-10%" width="160%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.4)"/>
      </filter>
    </defs>
    <path d="M16 1C7.716 1 1 7.716 1 16c0 10.5 15 25 15 25S31 26.5 31 16C31 7.716 24.284 1 16 1z"
      fill="${fill}" stroke="${stroke}" stroke-width="1.5" filter="url(#s)"/>
    <circle cx="16" cy="16" r="8" fill="white"/>
    ${icon}
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createUserLocationIcon(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <defs>
      <filter id="u" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(59,130,246,0.5)"/>
      </filter>
    </defs>
    <circle cx="14" cy="14" r="10" fill="#3b82f6" filter="url(#u)"/>
    <circle cx="14" cy="14" r="6" fill="#93c5fd"/>
    <circle cx="14" cy="14" r="13" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="2 3" opacity="0.5"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// ─── Componente de mapa ───────────────────────────────────────────────────────

const GMAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

type MapTypeId = 'roadmap' | 'satellite';

function MapComponent({
  points,
  selectedPoint,
  onPointSelect,
  onClose,
  focusCoord,
  userLocation,
  nearestPointIds,
  selectedDistanceKm,
}: {
  points: CollectionPoint[];
  selectedPoint: CollectionPoint | null;
  onPointSelect: (p: CollectionPoint) => void;
  onClose: () => void;
  focusCoord?: { lat: number; lng: number; _t: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  nearestPointIds?: number[];
  selectedDistanceKm?: number;
}) {
  const containerRef       = useRef<HTMLDivElement>(null);
  const mapRef             = useRef<google.maps.Map | null>(null);
  const markersRef         = useRef<google.maps.Marker[]>([]);
  const clustererRef       = useRef<MarkerClusterer | null>(null);
  const markerByIdRef      = useRef<Map<number, google.maps.Marker>>(new Map());
  const prevSelectedRef    = useRef<google.maps.Marker | null>(null);
  const overlayRef         = useRef<google.maps.OverlayView | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedPointRef   = useRef(selectedPoint);
  const userMarkerRef      = useRef<google.maps.Marker | null>(null);
  const polylinesRef       = useRef<google.maps.Polyline[]>([]);
  const [mapLoaded, setMapLoaded]   = useState(false);
  const [mapError, setMapError]     = useState<string | null>(null);
  const [mapType, setMapType]       = useState<MapTypeId>('roadmap');
  const [overlayReady, setOverlayReady] = useState(false);

  // Mantener la ref sincronizada para que draw() siempre vea el punto seleccionado más reciente (evita closure stale)
  useEffect(() => { selectedPointRef.current = selectedPoint; }, [selectedPoint]);

  // Inicializar mapa (solo una vez)
  useEffect(() => {
    if (!GMAPS_API_KEY || !containerRef.current || mapRef.current) return;
    let mounted = true;

    setOptions({ key: GMAPS_API_KEY });
    importLibrary('maps')
      .then(() => {
        if (!mounted || !containerRef.current || mapRef.current) return;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center:              { lat: -33.4569, lng: -70.6483 },
          zoom:                11,
          styles:              MAP_STYLES,
          disableDefaultUI:    true,
          zoomControl:              true,
          zoomControlOptions:       { position: google.maps.ControlPosition.LEFT_BOTTOM },
          fullscreenControl:        true,
          fullscreenControlOptions: { position: google.maps.ControlPosition.BOTTOM_LEFT },
          gestureHandling:     'cooperative',
        });
        setMapLoaded(true);
      })
      .catch(() => { if (mounted) setMapError('No se pudo cargar Google Maps. Verifica la API key.'); });

    return () => { mounted = false; };
  }, []);

  // Agregar o reemplazar marcadores cuando el mapa y los puntos estén listos
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    if (clustererRef.current) { clustererRef.current.clearMarkers(); clustererRef.current = null; }
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    markerByIdRef.current.clear();
    prevSelectedRef.current = null;

    const map = mapRef.current;
    const markers = points.map(point => {
      const mats = parseMaterials(point.materials);
      const isRaee = mats.some(m => ['metal', 'phone', 'power_bank'].includes(m));
      const pType = isRaee ? 'raee' : 'generic';
      const marker = new google.maps.Marker({
        position: { lat: point.latitude, lng: point.longitude },
        title:    point.name,
        icon: {
          url:        createPinIcon(false, pType),
          scaledSize: new google.maps.Size(32, 42),
          anchor:     new google.maps.Point(16, 42),
        },
      });
      marker.addListener('click', () => {
        onPointSelect(point);
      });
      markerByIdRef.current.set(point.id, marker);
      return marker;
    });

    markersRef.current = markers;
    clustererRef.current = new MarkerClusterer({ map, markers });
  }, [mapLoaded, points, onPointSelect]);

  // Centrar y hacer zoom al punto seleccionado (tanto por clic en marcador como por selección en búsqueda)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !selectedPoint) return;
    mapRef.current.panTo({ lat: selectedPoint.latitude, lng: selectedPoint.longitude });
    const currentZoom = mapRef.current.getZoom() ?? 6;
    if (currentZoom < 13) mapRef.current.setZoom(13);
  }, [selectedPoint, mapLoaded]);

  /* Crear un OverlayView persistente cuando el mapa está listo.
     draw() es invocado por Google Maps en cada frame de animación,
     por lo que el popup sigue el marcador con fluidez durante pan/zoom
     sin necesidad de re-renders de React. */
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;pointer-events:auto;display:none;';
    overlayContainerRef.current = container;

    const OverlayClass = class extends google.maps.OverlayView {
      onAdd() {
        const panes = this.getPanes();
        if (panes) panes.floatPane.appendChild(container);
        setOverlayReady(true);
      }
      draw() {
        const sp = selectedPointRef.current;
        if (!sp) { container.style.display = 'none'; return; }
        const proj = this.getProjection();
        if (!proj) return;
        const px = proj.fromLatLngToDivPixel(new google.maps.LatLng(sp.latitude, sp.longitude));
        if (px) {
          container.style.display    = 'block';
          container.style.left       = `${px.x}px`;
          container.style.top        = `${px.y}px`;
          container.style.transform  = 'translate(-50%, calc(-100% - 60px))';
        }
      }
      onRemove() {
        container.parentNode?.removeChild(container);
        setOverlayReady(false);
      }
    };

    const overlay = new OverlayClass();
    overlay.setMap(mapRef.current);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
      overlayContainerRef.current = null;
      polylinesRef.current.forEach(l => l.setMap(null));
      polylinesRef.current = [];
    };
  }, [mapLoaded]);

  // Centrar el mapa en la zona/ciudad cuando cambia focusCoord (al seleccionar una sugerencia de zona)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !focusCoord) return;
    mapRef.current.panTo({ lat: focusCoord.lat, lng: focusCoord.lng });
    const currentZoom = mapRef.current.getZoom() ?? 6;
    if (currentZoom < 12) mapRef.current.setZoom(12);
  }, [focusCoord, mapLoaded]);

  // Colocar o actualizar el marcador de ubicación del usuario
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    if (userLocation) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = new google.maps.Marker({
          position:  { lat: userLocation.lat, lng: userLocation.lng },
          map:       mapRef.current,
          title:     'Tu ubicación',
          zIndex:    999,
          icon: {
            url:        createUserLocationIcon(),
            scaledSize: new google.maps.Size(28, 28),
            anchor:     new google.maps.Point(14, 14),
          },
        });
      } else {
        userMarkerRef.current.setPosition({ lat: userLocation.lat, lng: userLocation.lng });
        userMarkerRef.current.setMap(mapRef.current);
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
    }
  }, [userLocation, mapLoaded]);

  // Dibujar polylines desde la ubicación del usuario hacia los puntos más cercanos (IDs obtenidos del backend via ST_Distance_Sphere)
  useEffect(() => {
    polylinesRef.current.forEach(l => l.setMap(null));
    polylinesRef.current = [];

    if (!mapLoaded || !mapRef.current || !userLocation || !nearestPointIds?.length) return;

    const nearestPoints = nearestPointIds
      .map(id => points.find(p => p.id === id))
      .filter((p): p is CollectionPoint => p !== undefined);

    polylinesRef.current = nearestPoints.map((pt, i) => {
      const opacity = i === 0 ? 0.75 : i === 1 ? 0.5 : 0.3;
      return new google.maps.Polyline({
        path: [
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat: pt.latitude,      lng: pt.longitude },
        ],
        map:           mapRef.current!,
        strokeColor:   '#38bdf8',
        strokeOpacity: opacity,
        strokeWeight:  i === 0 ? 2 : 1.5,
        icons: [{
          icon:   { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
          offset: '0',
          repeat: '14px',
        }],
      });
    });
  }, [userLocation, nearestPointIds, points, mapLoaded]);

  // Forzar draw() al cambiar el punto seleccionado para que el popup
  // aparezca/desaparezca de inmediato, incluso sin evento de movimiento del mapa.
  useEffect(() => {
    overlayRef.current?.draw();
  }, [selectedPoint]);

  // Cambiar tipo de mapa y estilos personalizados (también se ejecuta al cargar el mapa por primera vez)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    mapRef.current.setMapTypeId(mapType);
    mapRef.current.setOptions({ styles: mapType === 'roadmap' ? MAP_STYLES : [] });
  }, [mapType, mapLoaded]);

  // Resaltar / desresaltar el marcador seleccionado
  useEffect(() => {
    if (prevSelectedRef.current) {
      const prev = points.find(p => markerByIdRef.current.get(p.id) === prevSelectedRef.current);
      const prevMats = parseMaterials(prev?.materials ?? null);
      const prevType = prevMats.some(m => ['metal','phone','power_bank'].includes(m)) ? 'raee' : 'generic';
      prevSelectedRef.current.setIcon({
        url: createPinIcon(false, prevType), scaledSize: new google.maps.Size(32, 42), anchor: new google.maps.Point(16, 42),
      });
      prevSelectedRef.current = null;
    }
    if (selectedPoint) {
      const mats = parseMaterials(selectedPoint.materials);
      const pType = mats.some(m => ['metal','phone','power_bank'].includes(m)) ? 'raee' : 'generic';
      const m = markerByIdRef.current.get(selectedPoint.id);
      if (m) {
        m.setIcon({ url: createPinIcon(true, pType), scaledSize: new google.maps.Size(40, 52), anchor: new google.maps.Point(20, 52) });
        prevSelectedRef.current = m;
      }
    }
  }, [selectedPoint, points]);

  if (!GMAPS_API_KEY) {
    return (
      <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">API Key no configurada</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Agrega{' '}
            <code className="text-accent-light bg-white/[0.06] px-1.5 py-0.5 rounded font-mono text-xs">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            </code>{' '}
            en tu archivo <code className="text-accent-light bg-white/[0.06] px-1.5 py-0.5 rounded font-mono text-xs">.env.local</code> para activar el mapa.
          </p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-red-400 mb-3 text-sm">{mapError}</p>
          <button onClick={() => window.location.reload()} className="text-accent-light text-sm underline hover:text-accent">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Popup card — rendered into the OverlayView container via portal so it follows the marker smoothly */}
      {overlayReady && overlayContainerRef.current && selectedPoint && createPortal(
        <PointDetailCard
          key={selectedPoint.id}
          point={selectedPoint}
          onClose={onClose}
          distanceKm={selectedDistanceKm}
        />,
        overlayContainerRef.current
      )}

      {/* Map type toggle — top right */}
      {mapLoaded && (
        <div className="absolute top-4 right-4 z-10 flex rounded-xl overflow-hidden border border-white/[0.12] shadow-lg shadow-black/30 backdrop-blur-sm">
          {(['roadmap', 'satellite'] as MapTypeId[]).map((type) => (
            <button
              key={type}
              onClick={() => setMapType(type)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium transition-colors ${
                mapType === type
                  ? 'bg-accent text-white'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800/90'
              }`}
            >
              {type === 'roadmap' ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                  </svg>
                  Mapa
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Satélite
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helper para badge de tipo de punto ──────────────────────────────────────

const TYPE_STYLES: Record<string, string> = {
  'Punto limpio municipal': 'bg-accent/15 text-accent-light border-accent/25',
  'Centro de acopio':       'bg-cyan-500/15  text-cyan-300  border-cyan-500/25',
  'Tienda autorizada':      'bg-violet-500/15 text-violet-300 border-violet-500/25',
  'Empresa gestora':        'bg-orange-500/15 text-orange-300 border-orange-500/25',
};

// ─── Tarjeta de detalle del punto ────────────────────────────────────────────

function PointDetailCard({ point, onClose, distanceKm }: { point: CollectionPoint; onClose: () => void; distanceKm?: number }) {
  const badge = TYPE_STYLES[point.type ?? ''] ?? 'bg-white/10 text-slate-300 border-white/15';

  return (
    <div className="w-72" style={{ animation: 'slideUp 0.22s ease-out' }}>
      {/* Flecha hacia abajo apuntando al marcador */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-white/[0.09] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Encabezado */}
        <div className="flex items-start justify-between p-4 pb-3 border-b border-white/[0.06]">
          <div className="flex-1 pr-2">
            <h3 className="font-semibold text-white text-[15px] leading-snug">{point.name}</h3>
            {point.type && (
              <span className={`inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge}`}>
                {point.type}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Materiales */}
        {parseMaterials(point.materials).length > 0 && (
          <div className="px-4 pt-3 pb-1 flex flex-wrap gap-1.5">
            {parseMaterials(point.materials).map(mat => {
              const m = RAEE_MATERIALS[mat];
              if (!m) return null;
              return (
                <span key={mat} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${m.color}`}>
                  <span>{m.icon}</span>{m.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Cuerpo */}
        <div className="px-4 py-3 space-y-2.5">
          {/* Dirección */}
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 text-accent-light mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <div>
              <p className="text-sm text-slate-300 leading-snug">{point.address}</p>
              {point.commune && (
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Comuna {point.commune}
                </p>
              )}
              {point.region && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {point.region}
                </p>
              )}
            </div>
          </div>

          {/* Distancia desde el usuario */}
          {distanceKm !== undefined && (
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span className="text-sm text-blue-300 font-medium">
                {distanceKm < 1
                  ? `${Math.round(distanceKm * 1000)} m de ti`
                  : `${distanceKm.toFixed(1)} km de ti`}
              </span>
            </div>
          )}

          {/* Contacto */}
          {point.contact && (
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-accent-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              <span className="text-sm text-slate-300">{point.contact}</span>
            </div>
          )}

          {/* Sitio web */}
          {point.website && (
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-accent-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
              </svg>
              <a href={point.website} target="_blank" rel="noopener noreferrer"
                className="text-sm text-accent-light hover:text-accent underline underline-offset-2 transition-colors truncate">
                {point.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>

        {/* Pie de la tarjeta */}
        <div className="px-4 py-2.5 border-t border-white/[0.05] bg-white/[0.02] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0"/>
            <span className="text-xs text-slate-500 truncate">Punto verificado</span>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/15 border border-accent/25 text-accent-light text-xs font-medium hover:bg-accent/25 active:scale-95 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
            Cómo llegar
          </a>
        </div>
      </div>
      {/* Triángulo inferior apuntando al marcador */}
      <div className="flex justify-center">
        <div className="w-0 h-0" style={{
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid rgba(15,23,42,0.97)',
          filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))',
        }}/>
      </div>
    </div>
  );
}


// ─── Barra de búsqueda ────────────────────────────────────────────────────────

type ZoneSuggestion = {
  kind: 'zone';
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
  count: number;
};
type PointSuggestion = {
  kind: 'point';
  point: CollectionPoint;
};
type Suggestion = ZoneSuggestion | PointSuggestion;

function SearchBar({
  points,
  onSelect,
  onFocus,
  onSearch,
}: {
  points: CollectionPoint[];
  onSelect: (p: CollectionPoint) => void;
  onFocus: (lat: number, lng: number) => void;
  onSearch?: (query: string) => void;
}) {
  const [query, setQuery]             = useState('');
  const [isOpen, setIsOpen]           = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Sugerencias de zona: agrupa ciudades + regiones con su centroide ─────────
  const zoneSuggestions = useMemo((): ZoneSuggestion[] => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const cityMap = new Map<string, { latSum: number; lngSum: number; count: number; region: string | null }>();
    const regionMap = new Map<string, { latSum: number; lngSum: number; count: number }>();

    for (const p of points) {
      if (p.city && p.city.toLowerCase().includes(q)) {
        const e = cityMap.get(p.city) ?? { latSum: 0, lngSum: 0, count: 0, region: p.region };
        cityMap.set(p.city, { latSum: e.latSum + p.latitude, lngSum: e.lngSum + p.longitude, count: e.count + 1, region: e.region });
      }
      if (p.region && p.region.toLowerCase().includes(q)) {
        const e = regionMap.get(p.region) ?? { latSum: 0, lngSum: 0, count: 0 };
        regionMap.set(p.region, { latSum: e.latSum + p.latitude, lngSum: e.lngSum + p.longitude, count: e.count + 1 });
      }
    }

    const zones: ZoneSuggestion[] = [];
    for (const [label, d] of cityMap) {
      zones.push({ kind: 'zone', label, subtitle: d.region ?? 'Ciudad', lat: d.latSum / d.count, lng: d.lngSum / d.count, count: d.count });
    }
    for (const [label, d] of regionMap) {
      if (!cityMap.has(label)) // evitar duplicar si una ciudad comparte nombre con la región
        zones.push({ kind: 'zone', label, subtitle: 'Región', lat: d.latSum / d.count, lng: d.lngSum / d.count, count: d.count });
    }
    return zones.sort((a, b) => b.count - a.count).slice(0, 3);
  }, [query, points]);

  // ── Coincidencias exactas de puntos ──────────────────────────────────────────
  const pointResults = useMemo((): PointSuggestion[] => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return points
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        (p.city   && p.city.toLowerCase().includes(q)) ||
        (p.region && p.region.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .map(point => ({ kind: 'point', point }));
  }, [query, points]);

  const combined = useMemo((): Suggestion[] => [...zoneSuggestions, ...pointResults], [zoneSuggestions, pointResults]);
  const hasResults = combined.length > 0;

  useEffect(() => {
    setHighlighted(0);
    setIsOpen(query.trim().length >= 2);
  }, [query]);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (s: Suggestion) => {
    onSearch?.(query.trim());
    setQuery('');
    setIsOpen(false);
    if (s.kind === 'zone') onFocus(s.lat, s.lng);
    else onSelect(s.point);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, combined.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && combined[highlighted]) pick(combined[highlighted]);
    if (e.key === 'Escape') { setIsOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Campo de texto */}
      <div className={`flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-900/95 backdrop-blur-md border shadow-lg shadow-black/30 transition-all duration-200 ${
        isOpen ? 'rounded-t-2xl border-white/20 border-b-white/[0.06]' : 'rounded-2xl border-white/[0.12]'
      }`}>
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder="Buscar ciudad, dirección o punto…"
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none min-w-0"
        />
        {query ? (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); inputRef.current?.focus(); }}
            className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/20 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        ) : (
          <kbd className="shrink-0 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.09] text-[10px] text-slate-500 font-mono">
            /
          </kbd>
        )}
      </div>

      {/* Lista desplegable */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border border-t-0 border-white/20 rounded-b-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {hasResults ? (
            <>
              {/* ── Sugerencias de zona ──────────────────────────────────────── */}
              {zoneSuggestions.length > 0 && (
                <>
                  <div className="px-3.5 py-2 border-b border-white/[0.05] flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ubicaciones</span>
                  </div>
                  {zoneSuggestions.map((zone, i) => (
                    <button
                      key={`zone-${zone.label}`}
                      onMouseDown={() => pick(zone)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left border-b border-white/[0.04] last:border-0 transition-colors ${
                        i === highlighted ? 'bg-accent/10' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-slate-700/60 border border-slate-600/40">
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate leading-snug">{zone.label}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{zone.subtitle} · {zone.count} punto{zone.count !== 1 ? 's' : ''}</p>
                      </div>
                      <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  ))}
                </>
              )}

              {/* ── Puntos específicos ───────────────────────────────────────── */}
              {pointResults.length > 0 && (
                <>
                  <div className="px-3.5 py-2 border-b border-white/[0.05]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Puntos específicos</span>
                  </div>
                  {pointResults.map(({ point }, i) => {
                    const idx    = zoneSuggestions.length + i;
                    const mats   = parseMaterials(point.materials);
                    const isRaee = mats.some(m => ['metal', 'phone', 'power_bank'].includes(m));
                    const matIcons = mats.filter(m => RAEE_MATERIALS[m]).slice(0, 3).map(m => RAEE_MATERIALS[m].icon);
                    return (
                      <button
                        key={point.id}
                        onMouseDown={() => pick({ kind: 'point', point })}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left border-b border-white/[0.04] last:border-0 transition-colors ${
                          idx === highlighted ? 'bg-accent/10' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                          isRaee ? 'bg-accent/15 border border-accent/25' : 'bg-indigo-500/15 border border-indigo-500/25'
                        }`}>
                          {isRaee ? '⚡' : '♻'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate leading-snug">{point.name}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {[point.address, point.city, point.region].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        {matIcons.length > 0 && (
                          <div className="shrink-0 flex gap-0.5">
                            {matIcons.map((icon, idx2) => <span key={idx2} className="text-sm leading-none">{icon}</span>)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </>
          ) : (
            <div className="px-4 py-5 text-center">
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <p className="text-sm text-slate-500">Sin resultados para <span className="text-slate-400">"{query}"</span></p>
              <p className="text-xs text-slate-600 mt-1">Prueba con otra ciudad o nombre</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CollectionPointsPage() {
  const [points, setPoints]             = useState<CollectionPoint[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<CollectionPoint | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<string | null>(null);
  const [syncing, setSyncing]           = useState(false);
  const [syncResult, setSyncResult]     = useState<{ synced: number; totalInDB: number } | null>(null);
  const [canSync, setCanSync]           = useState(false);
  const [focusCoord, setFocusCoord]     = useState<{ lat: number; lng: number; _t: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearestPointIds, setNearestPointIds] = useState<number[]>([]);
  const [selectedDistance, setSelectedDistance] = useState<number | undefined>(undefined);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const loadPoints = useCallback(() => {
    fetch(`${apiUrl}/collection-points`)
      .then(r => r.json())
      .then((data: CollectionPoint[]) => { setPoints(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [apiUrl]);

  useEffect(() => { loadPoints(); }, [loadPoints]);

  // Obtener puntos más cercanos via ST_Distance_Sphere cuando cambia la ubicación o los filtros
  useEffect(() => {
    if (!userLocation) {
      setNearestPointIds([]);
      return;
    }
    const params = new URLSearchParams({
      lat:   String(userLocation.lat),
      lng:   String(userLocation.lng),
      limit: '3',
    });
    if (activeMaterial) params.set('material', activeMaterial);
    if (activeRegion)   params.set('region', activeRegion);

    fetch(`${apiUrl}/collection-points/nearest?${params}`)
      .then(r => r.json())
      .then((data: { id: number; distanceKm: number }[]) => {
        setNearestPointIds(data.map(d => d.id));
      })
      .catch(() => setNearestPointIds([]));
  }, [userLocation, activeMaterial, activeRegion, apiUrl]);

  // Obtener distancia exacta al punto seleccionado via ST_Distance_Sphere
  useEffect(() => {
    if (!selectedPoint || !userLocation) {
      setSelectedDistance(undefined);
      return;
    }
    fetch(`${apiUrl}/collection-points/${selectedPoint.id}/distance?lat=${userLocation.lat}&lng=${userLocation.lng}`)
      .then(r => r.json())
      .then((data: { distanceKm: number }) => setSelectedDistance(Number(data.distanceKm)))
      .catch(() => setSelectedDistance(undefined));
  }, [selectedPoint, userLocation, apiUrl]);

  // Verificar si el usuario actual puede disparar la sincronización
  useEffect(() => {
    const user = getStoredUser();
    if (user?.permissions?.includes('recoleccion.puntos.gestionar')) {
      setCanSync(true);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(`${apiUrl}/collection-points/sync`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en sincronización');
      setSyncResult({ synced: data.synced, totalInDB: data.totalInDB });
      setLoading(true);
      loadPoints();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const regions = [...new Set(points.map(p => p.region).filter(Boolean) as string[])].sort();
  const filtered = useMemo(() => {
    const base = points.filter(p => {
      if (activeRegion && p.region !== activeRegion) return false;
      if (activeMaterial) {
        const mats = parseMaterials(p.materials);
        if (!mats.includes(activeMaterial)) return false;
      }
      return true;
    });
    if (userLocation) {
      return [...base].sort((a, b) =>
        haversineDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude) -
        haversineDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
      );
    }
    return base;
  }, [points, activeRegion, activeMaterial, userLocation]);
  const handleSelect = useCallback((p: CollectionPoint) => setSelectedPoint(p), []);
  const handleClose  = useCallback(() => { setSelectedPoint(null); setSelectedDistance(undefined); }, []);
  const handleSearch = useCallback((q: string) => {
    fetch(`${getApiUrl()}/collection-points/log-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    }).catch(() => {});
  }, []);
  const handleFocus  = useCallback((lat: number, lng: number) => {
    setSelectedPoint(null);
    setFocusCoord({ lat, lng, _t: Date.now() });
  }, []);

  const handleLocate = useCallback(() => {
    if (userLocation) {
      // Desactivar geolocalización
      setUserLocation(null);
      setLocationError(null);
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización.');
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFocusCoord({ ...loc, _t: Date.now() });
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Permiso denegado. Activa la ubicación en tu navegador.');
        } else {
          setLocationError('No se pudo obtener tu ubicación.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [userLocation]);

  return (
    <PublicLayout showFooter={false}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="flex flex-col bg-background" style={{ minHeight: 'calc(100dvh - 60px)' }}>

        {/* ── Hero bar ──────────────────────────────────────────────────────── */}
        <div className="border-b border-white/[0.06] bg-background px-4 pt-4 pb-3">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              {/* Title */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-btn-header animate-pulse"/>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-btn-header">Red RAEE · Chile</span>
                </div>
                <h1 className="text-xl font-bold text-foreground leading-tight">Puntos de Recolección</h1>
                <p className="text-sm text-muted mt-0.5">Encuentra el centro de reciclaje electrónico más cercano</p>
                <a
                  href="https://puntoslimpios.mma.gob.cl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-secondary hover:text-muted transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                  </svg>
                  Datos: MMA Chile · puntoslimpios.mma.gob.cl
                </a>
              </div>

              {/* Stats + Sync */}
              {!loading && (
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-accent-light to-accent bg-clip-text text-transparent">
                      {points.length}
                    </div>
                    <div className="text-xs text-muted mt-0.5">Puntos activos</div>
                  </div>
                  <div className="w-px h-10 bg-black/[0.08] dark:bg-white/[0.08]"/>
                  <div className="text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-accent-light to-accent bg-clip-text text-transparent">
                      {regions.length}
                    </div>
                    <div className="text-xs text-muted mt-0.5">Regiones</div>
                  </div>
                  {(activeRegion || activeMaterial) && (
                    <>
                      <div className="w-px h-10 bg-black/[0.08] dark:bg-white/[0.08]"/>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-cyan-400">{filtered.length}</div>
                        <div className="text-xs text-muted mt-0.5">Filtrados</div>
                      </div>
                    </>
                  )}

                  {/* Sync button — solo para admins */}
                  {canSync && (
                    <>
                      <div className="w-px h-10 bg-black/[0.08] dark:bg-white/[0.08]"/>
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={handleSync}
                          disabled={syncing}
                          title="Sincronizar datos desde MMA Chile"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent-light text-xs font-medium hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                          </svg>
                          {syncing ? 'Sincronizando…' : 'Sync MMA'}
                        </button>
                        {syncResult && (
                          <span className="text-[10px] text-accent">
                            ✓ {syncResult.synced.toLocaleString()} RAEE importados
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Search bar + Cerca de mí */}
            {!loading && (
              <div className="mt-3">
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 min-w-0">
                    <SearchBar points={points} onSelect={handleSelect} onFocus={handleFocus} onSearch={handleSearch}/>
                  </div>
                  <button
                    onClick={handleLocate}
                    disabled={locationLoading}
                    title={userLocation ? 'Desactivar ubicación' : 'Mostrar puntos más cercanos a ti'}
                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      userLocation
                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 hover:bg-blue-500/30'
                        : 'bg-slate-900/95 border-white/[0.12] text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {locationLoading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    )}
                    <span className="hidden sm:inline whitespace-nowrap">
                      {locationLoading ? 'Buscando…' : userLocation ? 'Cerca de mí ✓' : 'Cerca de mí'}
                    </span>
                  </button>
                </div>
                {locationError && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    {locationError}
                  </p>
                )}
              </div>
            )}

            {/* Material filter chips */}
            {!loading && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => { setActiveMaterial(null); setSelectedPoint(null); }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    activeMaterial === null
                      ? 'bg-accent/15 text-accent-light border-accent/30'
                      : 'text-slate-500 border-white/[0.09] hover:text-accent-light hover:border-accent/30'
                  }`}
                >
                  Todos los RAEE
                </button>
                {Object.entries(RAEE_MATERIALS).map(([key, mat]) => {
                  const count = points.filter(p => parseMaterials(p.materials).includes(key)).length;
                  return (
                    <button
                      key={key}
                      onClick={() => { setActiveMaterial(key); setSelectedPoint(null); }}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                        activeMaterial === key
                          ? 'bg-accent/15 text-accent-light border-accent/30'
                          : 'text-slate-500 border-white/[0.09] hover:text-accent-light hover:border-accent/30'
                      }`}
                    >
                      <span>{mat.icon}</span>
                      {mat.label}
                      {count > 0 && <span className="opacity-60">({count})</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Region filter chips */}
            {!loading && regions.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => { setActiveRegion(null); setSelectedPoint(null); }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    activeRegion === null
                      ? 'bg-accent/15 text-accent-light border-accent/30'
                          : 'text-slate-500 border-white/[0.09] hover:text-accent-light hover:border-accent/30'
                  }`}
                >
                  Todas las regiones
                </button>
                {regions.map(r => (
                  <button
                    key={r}
                    onClick={() => { setActiveRegion(r); setSelectedPoint(null); }}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                      activeRegion === r
                        ? 'bg-accent/15 text-accent-light border-accent/30'
                          : 'text-slate-500 border-white/[0.09] hover:text-accent-light hover:border-accent/30'
                    }`}
                  >
                    {r} ({points.filter(p => p.region === r).length})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Map ───────────────────────────────────────────────────────────── */}
        <div className="relative flex-1 min-h-[420px]">
          {loading ? (
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full border-2 border-accent/20 border-t-accent animate-spin mx-auto mb-4"/>
                <p className="text-slate-400 text-sm">Cargando puntos de recolección…</p>
              </div>
            </div>
          ) : (
            <MapComponent
              points={filtered}
              selectedPoint={selectedPoint}
              onPointSelect={handleSelect}
              onClose={handleClose}
              focusCoord={focusCoord}
              userLocation={userLocation}
              nearestPointIds={nearestPointIds}
              selectedDistanceKm={selectedDistance}
            />
          )}

          {/* Map legend */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-sm border border-white/[0.09] rounded-xl px-3 py-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-accent shadow-sm shadow-accent/50"/>
              <span className="text-xs text-slate-400">Acepta RAEE</span>
            </div>
            <div className="w-px h-3.5 bg-white/10"/>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"/>
              <span className="text-xs text-slate-400">Otros residuos</span>
            </div>
          </div>

        </div>
      </div>

      {/* Suggest modal */}
    </PublicLayout>
  );
}
