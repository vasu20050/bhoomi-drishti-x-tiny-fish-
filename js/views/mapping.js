/**
 * View 05: Land Mapping Workspace (Cadastre)
 * Leaflet.js GIS Cadastral Land Parcels, Transect Grid, GSD & Survey Tools
 */

let cadastreMap = null;
let droneMapMarker = null;
let surveyGridLayer = null;
let parcelPolygonLayer = null;
let flightPathPolyline = null;
let surveyFlightInterval = null;
let isMissionSimulating = false;

// Sample Indian Cadastral Village Land Parcels (SVAMITVA Scheme Survey Data)
const sampleKhasraParcels = [
  {
    khasraNo: "101/A",
    farmer: "Rameshwar Singh",
    areaHa: 4.8,
    status: "SURVEYED",
    statusColor: "#4edea3",
    coords: [
      [28.6130, 77.2070],
      [28.6155, 77.2072],
      [28.6152, 77.2105],
      [28.6128, 77.2100]
    ]
  },
  {
    khasraNo: "102/B",
    farmer: "Kamla Devi",
    areaHa: 6.2,
    status: "IN PROGRESS",
    statusColor: "#4cd7f6",
    coords: [
      [28.6155, 77.2072],
      [28.6185, 77.2075],
      [28.6180, 77.2112],
      [28.6152, 77.2105]
    ]
  },
  {
    khasraNo: "103/C",
    farmer: "Harish Chandra & Brothers",
    areaHa: 8.5,
    status: "PENDING VERIFICATION",
    statusColor: "#7bd0ff",
    coords: [
      [28.6128, 77.2100],
      [28.6152, 77.2105],
      [28.6148, 77.2140],
      [28.6122, 77.2135]
    ]
  },
  {
    khasraNo: "104/D (Gaon Sabha)",
    farmer: "Community Land / Panchayat",
    areaHa: 9.0,
    status: "PROTECTED WATERBODY",
    statusColor: "#06b6d4",
    coords: [
      [28.6152, 77.2105],
      [28.6180, 77.2112],
      [28.6175, 77.2145],
      [28.6148, 77.2140]
    ]
  }
];

window.initCadastreMap = function() {
  const mapContainer = document.getElementById('cadastre-leaflet-map');
  if (!mapContainer) return;

  if (cadastreMap) {
    cadastreMap.invalidateSize();
    return;
  }

  const initialLat = (window.bhoomiState && window.bhoomiState.droneLat && window.bhoomiState.droneLat !== 0) 
    ? window.bhoomiState.droneLat 
    : 28.4702108;
  const initialLng = (window.bhoomiState && window.bhoomiState.droneLng && window.bhoomiState.droneLng !== 0) 
    ? window.bhoomiState.droneLng 
    : 77.4942966;

  // Create Leaflet map centered on real Pixhawk GPS location
  cadastreMap = L.map('cadastre-leaflet-map', {
    zoomControl: false,
    attributionControl: true
  }).setView([initialLat, initialLng], 17);
  window.cadastreMap = cadastreMap;

  // 1. OpenStreetMap (Standard OSM) Basemap
  const osmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
  });

  // 2. OpenStreetMap Humanitarian (HOT) Basemap
  const osmHotTiles = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">HOT</a>'
  });

  // 3. Dark Basemap (CARTO Dark Matter)
  const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; CARTO'
  });
  
  // 4. High-Resolution Satellite Ortho (ArcGIS World Imagery)
  const satTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; DigitalGlobe, GeoEye, Earthstar Geographics'
  });

  // Default to OpenStreetMap Standard
  osmTiles.addTo(cadastreMap);

  function updateBaseMapButtons(type) {
    const btnMap = {
      'osm': document.getElementById('btn-basemap-osm'),
      'osm-hot': document.getElementById('btn-basemap-osm-hot'),
      'sat': document.getElementById('btn-basemap-sat'),
      'dark': document.getElementById('btn-basemap-dark')
    };
    Object.entries(btnMap).forEach(([key, btn]) => {
      if (!btn) return;
      if (key === type) {
        btn.className = "px-space-md py-1 rounded bg-primary text-on-primary font-label-caps text-xs font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)] cursor-pointer flex items-center gap-1 transition-all";
      } else {
        btn.className = "px-space-md py-1 rounded bg-surface-container text-on-surface-variant font-label-caps text-xs hover:text-on-surface cursor-pointer flex items-center gap-1 transition-all";
      }
    });
  }

  // Layer controller logic
  window.switchBaseMap = function(type) {
    [osmTiles, osmHotTiles, satTiles, darkTiles].forEach(layer => {
      if (cadastreMap.hasLayer(layer)) {
        cadastreMap.removeLayer(layer);
      }
    });

    if (type === 'osm') {
      osmTiles.addTo(cadastreMap);
      window.showNotification("Switched to OpenStreetMap (Standard OSM)");
    } else if (type === 'osm-hot') {
      osmHotTiles.addTo(cadastreMap);
      window.showNotification("Switched to OpenStreetMap Humanitarian (HOT)");
    } else if (type === 'dark') {
      darkTiles.addTo(cadastreMap);
      window.showNotification("Switched to Cadastral Vector Dark Basemap");
    } else {
      satTiles.addTo(cadastreMap);
      window.showNotification("Switched to High-Res Satellite Ortho Layer");
    }
    updateBaseMapButtons(type);
  };

  // Render Khasra Cadastral Parcels
  parcelPolygonLayer = L.featureGroup().addTo(cadastreMap);
  window.parcelPolygonLayer = parcelPolygonLayer;

  sampleKhasraParcels.forEach((parcel) => {
    const polygon = L.polygon(parcel.coords, {
      color: parcel.statusColor,
      weight: 2,
      opacity: 0.9,
      fillColor: parcel.statusColor,
      fillOpacity: 0.18
    }).addTo(parcelPolygonLayer);

    polygon.bindPopup(`
      <div class="p-2 space-y-1 font-body-sm text-on-surface">
        <div class="flex items-center justify-between border-b border-surface-container pb-1">
          <span class="font-bold text-primary font-headline-sm text-sm">KHASRA #${parcel.khasraNo}</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-surface-container font-label-caps" style="color:${parcel.statusColor}">${parcel.status}</span>
        </div>
        <div class="text-xs text-on-surface-variant pt-1">
          <b>Owner / Titleholder:</b> ${parcel.farmer}<br/>
          <b>Surveyed Area:</b> ${parcel.areaHa} Hectares (~${(parcel.areaHa * 3.95).toFixed(1)} Bigha)<br/>
          <b>SVAMITVA ID:</b> IN-UP-9042-${parcel.khasraNo.replace('/', '')}
        </div>
        <button onclick="window.selectParcelForFlightPlan('${parcel.khasraNo}')" class="w-full mt-2 py-1 rounded bg-primary text-on-primary font-label-caps text-xs font-bold hover:bg-primary-fixed-dim">
          GENERATE FLIGHT TRANSECT
        </button>
      </div>
    `);

    // Center tooltip
    polygon.bindTooltip(`Khasra ${parcel.khasraNo} (${parcel.areaHa} Ha)`, {
      permanent: true,
      direction: 'center',
      className: 'bg-surface-container-lowest/80 text-primary border border-primary/40 font-label-caps text-[10px] px-1 py-0.5 rounded shadow'
    });
  });

  // Drone Position Marker with Directional Heading Arrow
  const droneSvgIcon = L.divIcon({
    className: 'custom-drone-map-icon',
    html: `
      <div id="map-drone-icon-wrapper" class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-transform duration-150" style="width:48px;height:48px;transform-origin:center center;">
        <!-- Glowing Forward Heading Directional Arrow -->
        <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20">
          <svg class="w-4 h-4 text-primary filter drop-shadow-[0_0_5px_rgba(56,189,248,1)] animate-pulse" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12,2 4,14 12,10 20,14" />
          </svg>
        </div>
        <!-- Radar Pulse Ring -->
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-30"></span>
        <!-- Compass Outer Reticle -->
        <div class="absolute inset-0 rounded-full border border-primary/40 pointer-events-none"></div>
        <!-- High-Tech Drone Silhouette with Forward Arrow Tip -->
        <svg class="w-9 h-9 text-secondary filter drop-shadow-[0_0_8px_rgba(78,222,163,0.9)]" viewBox="0 0 48 48" fill="none">
          <!-- Forward Direction Arrow Pointer -->
          <polygon points="24,3 18,17 24,13 30,17" fill="#38bdf8"/>
          <!-- Central Avionics Core -->
          <circle cx="24" cy="24" r="6" fill="#1e2230" stroke="#4edea3" stroke-width="2.5"/>
          <circle cx="24" cy="24" r="2.5" fill="#38bdf8"/>
          <!-- Carbon Quad Arms -->
          <line x1="12" y1="12" x2="36" y2="36" stroke="#dfe2ef" stroke-width="2.5"/>
          <line x1="12" y1="36" x2="36" y2="12" stroke="#dfe2ef" stroke-width="2.5"/>
          <!-- Rotors -->
          <circle cx="12" cy="12" r="3.5" fill="#facc15"/>
          <circle cx="36" cy="12" r="3.5" fill="#facc15"/>
          <circle cx="12" cy="36" r="3.5" fill="#38bdf8"/>
          <circle cx="36" cy="36" r="3.5" fill="#38bdf8"/>
        </svg>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });

  droneMapMarker = L.marker([window.bhoomiState.droneLat, window.bhoomiState.droneLng], { icon: droneSvgIcon }).addTo(cadastreMap);
  window.droneMapMarker = droneMapMarker;

  // Native Leaflet Layer Control (Base Layers & Overlays)
  const baseLayers = {
    "OpenStreetMap (Standard)": osmTiles,
    "OpenStreetMap (Humanitarian)": osmHotTiles,
    "Satellite Ortho (ArcGIS)": satTiles,
    "Dark Cadastre (CARTO)": darkTiles
  };
  const overlayLayers = {
    "Cadastral Parcels": parcelPolygonLayer
  };
  L.control.layers(baseLayers, overlayLayers, { position: 'topright' }).addTo(cadastreMap);

  // Add Leaflet Scale and Zoom controls
  L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(cadastreMap);
  L.control.zoom({ position: 'bottomright' }).addTo(cadastreMap);

  // Live mouse hover coordinate indicator HUD
  cadastreMap.on('mousemove', function(e) {
    const coordsEl = document.getElementById('map-cursor-coords');
    if (coordsEl) {
      coordsEl.textContent = `LAT: ${e.latlng.lat.toFixed(6)}°  LON: ${e.latlng.lng.toFixed(6)}° | ZOOM: ${cadastreMap.getZoom()}`;
    }
  });

  // Live GPS Tracking & Auto-Follow State
  window.autoFollowDrone = true;

  window.toggleAutoFollowDrone = function() {
    window.autoFollowDrone = !window.autoFollowDrone;
    const btn = document.getElementById('btn-auto-follow-drone');
    if (btn) {
      if (window.autoFollowDrone) {
        btn.className = "px-2 py-0.5 rounded bg-secondary text-on-secondary text-[11px] font-label-caps font-bold flex items-center gap-1 cursor-pointer shadow";
        btn.innerHTML = `<span class="material-symbols-outlined text-xs">my_location</span> AUTO-FOLLOW: ON`;
        window.centerMapOnDrone();
      } else {
        btn.className = "px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px] font-label-caps flex items-center gap-1 cursor-pointer";
        btn.innerHTML = `<span class="material-symbols-outlined text-xs">location_searching</span> AUTO-FOLLOW: OFF`;
      }
    }
    window.showNotification(`GPS Auto-Follow: ${window.autoFollowDrone ? 'ACTIVE' : 'PAUSED'}`);
  };

  // Real-time GPS Position handler called on every telemetry tick
  window.updateMapDroneLocation = function(lat, lon, state) {
    if (!lat || !lon) return;

    // Update GPS Readout in Map Header
    const gpsEl = document.getElementById('map-live-gps-readout');
    if (gpsEl) {
      gpsEl.textContent = `GPS: ${lat.toFixed(6)}° N, ${lon.toFixed(6)}° E`;
    }
    const fixEl = document.getElementById('map-live-gps-fix');
    if (fixEl) {
      fixEl.textContent = `${state.satellites || 0} SATS • ${state.gpsFix || 'LIVE GPS'}`;
    }

    // Update Drone Marker on Cadastre OpenStreetMap
    if (droneMapMarker && cadastreMap) {
      droneMapMarker.setLatLng([lat, lon]);

      // Rotate Drone Map Marker to Match Real-World Flight Heading Arrow
      const headingDeg = Math.round(state.heading || state.yaw || 0);
      const iconWrapper = document.getElementById('map-drone-icon-wrapper');
      if (iconWrapper) {
        iconWrapper.style.transform = `rotate(${headingDeg}deg)`;
      }

      // Dynamic Popup with Live Flight Telemetry
      droneMapMarker.bindPopup(`
        <div class="p-2 space-y-1 font-body-sm text-on-surface">
          <div class="flex items-center justify-between border-b border-surface-container pb-1">
            <span class="font-bold text-secondary font-headline-sm text-sm">LIVE PIXHAWK GPS</span>
            <span class="text-xs px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary font-bold font-label-caps">${state.gpsFix || 'ACTIVE'}</span>
          </div>
          <div class="text-xs text-on-surface-variant pt-1 font-mono">
            <b>Latitude:</b> ${lat.toFixed(7)}°<br/>
            <b>Longitude:</b> ${lon.toFixed(7)}°<br/>
            <b>Alt MSL:</b> ${(state.altitudeMSL || 0).toFixed(1)} m | <b>AGL:</b> ${(state.altitudeAGL || 0).toFixed(1)} m<br/>
            <b>Heading:</b> ${Math.round(state.heading || state.yaw || 0)}° | <b>Speed:</b> ${(state.groundSpeed || 0).toFixed(1)} m/s<br/>
            <b>Satellites:</b> ${state.satellites || 0} | <b>Mode:</b> ${state.flightMode}
          </div>
        </div>
      `);

      // Auto-center map if enabled
      if (window.autoFollowDrone) {
        cadastreMap.panTo([lat, lon], { animate: true, duration: 0.4 });
      }
    }

    // Update Overview Mini-Map as well
    if (window.overviewDroneMarker && window.overviewMiniMap) {
      window.overviewDroneMarker.setLatLng([lat, lon]);
      if (window.autoFollowDrone) {
        window.overviewMiniMap.panTo([lat, lon], { animate: true, duration: 0.4 });
      }
    }
  };

  // Re-center helpers
  window.centerMapOnDrone = function() {
    if (cadastreMap && window.bhoomiState && window.bhoomiState.droneLat) {
      cadastreMap.flyTo([window.bhoomiState.droneLat, window.bhoomiState.droneLng], 18);
      window.showNotification(`Centered OpenStreetMap on Drone GPS: ${window.bhoomiState.droneLat.toFixed(6)}°, ${window.bhoomiState.droneLng.toFixed(6)}°`);
    }
  };

  window.centerMapOnParcels = function() {
    if (cadastreMap && parcelPolygonLayer) {
      cadastreMap.fitBounds(parcelPolygonLayer.getBounds(), { padding: [35, 35] });
      window.showNotification("Centered map on SVAMITVA Khasra site");
    }
  };

  window.jumpToSurveyLocation = function(locKey) {
    const locations = {
      'varanasi': { name: "Rampur Khas (Varanasi Site)", coords: [28.6155, 77.2105], zoom: 16 },
      'greater_noida': { name: "Knowledge Park (Greater Noida)", coords: [28.4701886, 77.4941820], zoom: 16 },
      'ayodhya': { name: "Ayodhya Cadastre Belt", coords: [26.7922, 82.1998], zoom: 15 },
      'lucknow': { name: "Lucknow IT City Enclave", coords: [26.7922, 80.9995], zoom: 15 },
      'delhi': { name: "Delhi Survey Region", coords: [28.6139, 77.2090], zoom: 16 }
    };
    const loc = locations[locKey];
    if (loc && cadastreMap) {
      cadastreMap.flyTo(loc.coords, loc.zoom);
      window.showNotification(`Flew OpenStreetMap to ${loc.name}`);
    }
  };

  // Generate initial flight transects for Parcel 102/B
  window.selectParcelForFlightPlan("102/B");
};

// Generate Lawn-mower Flight Grid Transects over target Khasra
window.selectParcelForFlightPlan = function(khasraNo) {
  const parcel = sampleKhasraParcels.find(p => p.khasraNo === khasraNo) || sampleKhasraParcels[1];
  
  if (surveyGridLayer) cadastreMap.removeLayer(surveyGridLayer);
  surveyGridLayer = L.featureGroup().addTo(cadastreMap);

  // Generate parallel survey flight paths across bounding box
  const lats = parcel.coords.map(c => c[0]);
  const lngs = parcel.coords.map(c => c[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const transectLines = [];
  const steps = 7;
  const latStep = (maxLat - minLat) / steps;

  for (let i = 0; i <= steps; i++) {
    const lat = minLat + i * latStep;
    if (i % 2 === 0) {
      transectLines.push([lat, minLng]);
      transectLines.push([lat, maxLng]);
    } else {
      transectLines.push([lat, maxLng]);
      transectLines.push([lat, minLng]);
    }
  }

  // Draw transects
  const flightPoly = L.polyline(transectLines, {
    color: '#4edea3',
    weight: 2.5,
    dashArray: '5, 8',
    opacity: 0.9
  }).addTo(surveyGridLayer);

  // Waypoint markers
  transectLines.forEach((pt, idx) => {
    L.circleMarker(pt, {
      radius: 4,
      fillColor: '#4cd7f6',
      color: '#003640',
      weight: 1.5,
      fillOpacity: 1
    }).bindTooltip(`WP ${idx + 1}`, { className: 'font-label-caps text-[9px]' }).addTo(surveyGridLayer);
  });

  // Calculate & update GSD metrics
  const altitude = parseFloat(document.getElementById('survey-altitude-input')?.value || 80);
  const sensorWidth = 35.7; // Sony a7R IV mm
  const focalLength = 35; // mm
  const imgWidth = 9504; // px
  // GSD (cm/px) = (SensorWidth * Altitude * 100) / (FocalLength * ImageWidth)
  const gsd = ((sensorWidth * altitude * 100) / (focalLength * imgWidth)).toFixed(2);
  
  const gsdEl = document.getElementById('calc-gsd-display');
  if (gsdEl) gsdEl.textContent = `${gsd} cm/px`;

  const totalDistKm = (steps * (maxLng - minLng) * 111).toFixed(2);
  const estPhotos = Math.round(steps * 28);
  const estTimeMin = Math.round((totalDistKm * 1000) / (8 * 60)); // speed 8 m/s

  const distEl = document.getElementById('calc-dist-display');
  const photosEl = document.getElementById('calc-photos-display');
  const timeEl = document.getElementById('calc-time-display');
  if (distEl) distEl.textContent = `${totalDistKm} km`;
  if (photosEl) photosEl.textContent = `${estPhotos} img`;
  if (timeEl) timeEl.textContent = `${estTimeMin} min`;

  window.activeFlightPath = transectLines;
  window.showNotification(`Flight grid transect computed for Khasra ${parcel.khasraNo} (GSD: ${gsd} cm/px)`);
};

// Simulation of Drone Traversal
window.toggleMissionSimulation = function() {
  if (isMissionSimulating) {
    clearInterval(surveyFlightInterval);
    isMissionSimulating = false;
    document.getElementById('btn-sim-survey').innerHTML = `
      <span class="material-symbols-outlined text-xs">play_arrow</span>
      START CADASTRE RUN
    `;
    window.showNotification("Cadastral survey run paused");
    return;
  }

  if (!window.activeFlightPath || window.activeFlightPath.length === 0) {
    window.showNotification("Select a parcel first to calculate transect path", true);
    return;
  }

  isMissionSimulating = true;
  document.getElementById('btn-sim-survey').innerHTML = `
    <span class="material-symbols-outlined text-xs">pause</span>
    PAUSE CADASTRE RUN
  `;
  window.showNotification("Drone surveying Khasra transect grid. Camera triggering at 80% overlap!");

  let currentWpIndex = 0;
  surveyFlightInterval = setInterval(() => {
    if (currentWpIndex >= window.activeFlightPath.length) {
      clearInterval(surveyFlightInterval);
      isMissionSimulating = false;
      document.getElementById('btn-sim-survey').innerHTML = `
        <span class="material-symbols-outlined text-xs">check_circle</span>
        MISSION COMPLETED
      `;
      window.showNotification("Survey Mission complete! All cadastral geotagged orthophotos stored to SD.");
      return;
    }

    const targetPt = window.activeFlightPath[currentWpIndex];
    window.bhoomiState.droneLat = targetPt[0];
    window.bhoomiState.droneLng = targetPt[1];
    window.bhoomiState.activeWaypoint = currentWpIndex + 1;
    window.bhoomiState.surveyPhotosCount += 2;

    if (droneMapMarker) {
      droneMapMarker.setLatLng(targetPt);
      // Camera shutter blink effect
      window.bhoomiAudio.beep(1200, 0.05, 'triangle');
    }

    currentWpIndex++;
  }, 1200);
};

// Export GeoJSON Cadastre Boundary
window.exportCadastreGeoJSON = function() {
  const geojson = {
    type: "FeatureCollection",
    properties: {
      gcsVersion: "Bhoomi Drishti v2.4-RC3",
      surveyProject: "SVAMITVA Cadastre Phase 4",
      timestamp: new Date().toISOString()
    },
    features: sampleKhasraParcels.map(p => ({
      type: "Feature",
      properties: {
        khasraNo: p.khasraNo,
        farmer: p.farmer,
        areaHa: p.areaHa,
        status: p.status
      },
      geometry: {
        type: "Polygon",
        coordinates: [p.coords.map(c => [c[1], c[0]])]
      }
    }))
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BhoomiDrishti_Cadastre_Khasra_${Date.now()}.geojson`;
  a.click();
  URL.revokeObjectURL(url);
  window.showNotification("Exported Cadastre GeoJSON successfully");
};
