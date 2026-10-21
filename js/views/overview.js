/**
 * View 01: AI Mission Control & Geospatial Operations Console
 * Interactive Geospatial Operational Canvas:
 * 1. 2D GIS Cadastre Satellite Map with SVAMITVA village parcels & transects
 * 2. 3D AHRS Digital Twin Airframe with Gyro Stabilization
 * 3. Primary Flight Display (PFD) Artificial Horizon HUD
 * 4. Real 5.8GHz / USB UVC Video Stream with Honest Standby Raster
 */

let overviewGisMap = null;
let overviewDroneMarker = null;
let overviewGisSatTiles = null;
let overviewGisOsmTiles = null;
let overviewCadastreLayer = null;
let overviewTransectLayer = null;
let overviewWaypointsLayer = null;

let ovThreeScene = null;
let ovThreeCamera = null;
let ovThreeRenderer = null;
let ovThreeDrone = null;
let ovThreeAnimId = null;
let ovProps = [];

let pfdCanvas = null;
let pfdCtx = null;
let pfdAnimId = null;

let fpvMediaStream = null;
window.missionCanvasMode = 'map'; // 'map' | '3d' | 'pfd' | 'uvc'

// Layers Visibility State
let showCadastre = true;
let showTransects = true;
let showWaypoints = true;

// Initialize the Master Mission Operations Canvas
window.initOverviewOperationsCanvas = function() {
  initOverviewGisMap();
  initOverview3DScene();
  initPfdCanvas();

  // Default to Map view or maintain selected mode
  window.switchMissionCanvasMode(window.missionCanvasMode || 'map');
};

// Backwards compatibility alias
window.initOverviewMiniMap = window.initOverviewOperationsCanvas;

/* --------------------------------------------------------------------------
   1. GEOSPATIAL GIS MAP (LEAFLET SATELLITE ORTHO + SVAMITVA CADASTRE)
   -------------------------------------------------------------------------- */
function initOverviewGisMap() {
  const container = document.getElementById('overview-gis-map');
  if (!container) return;

  if (overviewGisMap) {
    overviewGisMap.invalidateSize();
    return;
  }

  const s = window.bhoomiState;
  const initLat = (s && s.droneLat) ? s.droneLat : 28.4701886;
  const initLng = (s && s.droneLng) ? s.droneLng : 77.4941820;

  overviewGisMap = L.map('overview-gis-map', {
    zoomControl: false,
    attributionControl: false
  }).setView([initLat, initLng], 17);

  window.overviewGisMap = overviewGisMap;

  // Add custom zoom control to bottom right
  L.control.zoom({ position: 'bottomright' }).addTo(overviewGisMap);

  // Satellite Imagery (Esri World Imagery)
  overviewGisSatTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}', {
    maxZoom: 19,
    attribution: 'Esri Satellite'
  });

  // Street Imagery (OpenStreetMap)
  overviewGisOsmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: 'OpenStreetMap'
  });

  // Default to Satellite
  overviewGisSatTiles.addTo(overviewGisMap);

  // SVAMITVA Cadastral Land Parcels (Khasra 101/A, 102/B, 103/C, 104/D)
  overviewCadastreLayer = L.layerGroup();
  const dLat = 0.0018;
  const dLng = 0.0022;

  const parcels = [
    {
      khasra: "101/A",
      owner: "Rameshwar Singh",
      area: "4.8 Ha",
      status: "SURVEYED (CONFIRMED)",
      color: "#10b981",
      coords: [
        [initLat - dLat, initLng - dLng],
        [initLat, initLng - dLng * 0.9],
        [initLat, initLng],
        [initLat - dLat, initLng - dLng * 0.1]
      ]
    },
    {
      khasra: "102/B",
      owner: "Kamla Devi",
      area: "6.2 Ha",
      status: "IN PROGRESS (ACTIVE)",
      color: "#06b6d4",
      coords: [
        [initLat, initLng - dLng * 0.9],
        [initLat + dLat, initLng - dLng * 0.8],
        [initLat + dLat, initLng + dLng * 0.2],
        [initLat, initLng]
      ]
    },
    {
      khasra: "103/C",
      owner: "Harish Chandra & Bros",
      area: "8.5 Ha",
      status: "PENDING VERIFICATION",
      color: "#f59e0b",
      coords: [
        [initLat - dLat, initLng - dLng * 0.1],
        [initLat, initLng],
        [initLat - dLat * 0.1, initLng + dLng],
        [initLat - dLat * 1.1, initLng + dLng * 0.9]
      ]
    },
    {
      khasra: "104/D (Gaon Sabha)",
      owner: "Community Land / Panchayat",
      area: "9.0 Ha",
      status: "PROTECTED WATERBODY",
      color: "#3b82f6",
      coords: [
        [initLat, initLng],
        [initLat + dLat, initLng + dLng * 0.2],
        [initLat + dLat * 0.9, initLng + dLng * 1.1],
        [initLat - dLat * 0.1, initLng + dLng]
      ]
    }
  ];

  parcels.forEach(p => {
    const poly = L.polygon(p.coords, {
      color: p.color,
      fillColor: p.color,
      fillOpacity: 0.2,
      weight: 2
    });

    poly.bindPopup(`
      <div class="font-sans text-xs p-1">
        <div class="font-bold text-white text-sm">Khasra ${p.khasra}</div>
        <div class="text-zinc-400 mt-0.5">Owner: <span class="text-white">${p.owner}</span></div>
        <div class="text-zinc-400">Area: <span class="text-cyan-400 font-mono">${p.area}</span></div>
        <div class="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono" style="background:${p.color}25; color:${p.color}; border:1px solid ${p.color}50;">
          ${p.status}
        </div>
      </div>
    `);

    overviewCadastreLayer.addLayer(poly);
  });
  overviewCadastreLayer.addTo(overviewGisMap);

  // Survey Transect Grid Lines
  overviewTransectLayer = L.layerGroup();
  const transectLines = [
    [[initLat - dLat * 0.8, initLng - dLng * 0.7], [initLat + dLat * 0.8, initLng - dLng * 0.7]],
    [[initLat + dLat * 0.8, initLng - dLng * 0.3], [initLat - dLat * 0.8, initLng - dLng * 0.3]],
    [[initLat - dLat * 0.8, initLng + dLng * 0.1], [initLat + dLat * 0.8, initLng + dLng * 0.1]],
    [[initLat + dLat * 0.8, initLng + dLng * 0.5], [initLat - dLat * 0.8, initLng + dLng * 0.5]],
    [[initLat - dLat * 0.8, initLng + dLng * 0.9], [initLat + dLat * 0.8, initLng + dLng * 0.9]]
  ];

  transectLines.forEach(pts => {
    const line = L.polyline(pts, {
      color: '#38bdf8',
      weight: 1.8,
      dashArray: '5, 5',
      opacity: 0.8
    });
    overviewTransectLayer.addLayer(line);
  });
  overviewTransectLayer.addTo(overviewGisMap);

  // Waypoints (WP 1 to 8)
  overviewWaypointsLayer = L.layerGroup();
  transectLines.forEach((pts, idx) => {
    const wpNum = (idx * 2) + 1;
    const marker = L.circleMarker(pts[0], {
      radius: 5,
      color: '#38bdf8',
      fillColor: '#09090b',
      fillOpacity: 1,
      weight: 2
    }).bindTooltip(`WP ${wpNum}`, { permanent: false, direction: 'top' });
    overviewWaypointsLayer.addLayer(marker);
  });
  overviewWaypointsLayer.addTo(overviewGisMap);

  // Dynamic Drone Marker (Cyan Airplane / Nav Icon)
  const droneIcon = L.divIcon({
    className: 'ov-drone-marker',
    html: `
      <div id="ov-map-drone-icon" style="transform: rotate(0deg); transition: transform 0.25s linear;" class="relative w-8 h-8 flex items-center justify-center">
        <span class="absolute inset-0 rounded-full bg-cyan-400/25 animate-ping"></span>
        <div class="w-6 h-6 rounded-full bg-cyan-500 border border-white shadow-[0_0_12px_rgba(6,182,212,0.9)] flex items-center justify-center">
          <span class="material-symbols-outlined text-xs text-black font-bold">navigation</span>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  overviewDroneMarker = L.marker([initLat, initLng], { icon: droneIcon, zIndexOffset: 1000 }).addTo(overviewGisMap);
  window.overviewDroneMarker = overviewDroneMarker;
}

// Center map on drone
window.centerMapOnDrone = function() {
  if (!overviewGisMap) return;
  const s = window.bhoomiState;
  const lat = (s && s.droneLat) ? s.droneLat : 28.4701886;
  const lng = (s && s.droneLng) ? s.droneLng : 77.4941820;
  overviewGisMap.setView([lat, lng], 17, { animate: true });
  window.showNotification("Map centered on drone coordinates");
};

// Toggle Base Layer (Sat vs OSM)
window.toggleOverviewBaseLayer = function(type) {
  if (!overviewGisMap) return;
  const btnSat = document.getElementById('ov-btn-layer-sat');
  const btnOsm = document.getElementById('ov-btn-layer-osm');

  if (type === 'sat') {
    if (overviewGisMap.hasLayer(overviewGisOsmTiles)) overviewGisMap.removeLayer(overviewGisOsmTiles);
    overviewGisSatTiles.addTo(overviewGisMap);
    if (btnSat) btnSat.className = "px-2 py-0.5 rounded bg-cyan-500 text-black font-mono text-[10px] font-bold shadow";
    if (btnOsm) btnOsm.className = "px-2 py-0.5 rounded text-zinc-400 hover:text-white font-mono text-[10px]";
    window.showNotification("Base Layer: High-Res Satellite Ortho");
  } else {
    if (overviewGisMap.hasLayer(overviewGisSatTiles)) overviewGisMap.removeLayer(overviewGisSatTiles);
    overviewGisOsmTiles.addTo(overviewGisMap);
    if (btnOsm) btnOsm.className = "px-2 py-0.5 rounded bg-cyan-500 text-black font-mono text-[10px] font-bold shadow";
    if (btnSat) btnSat.className = "px-2 py-0.5 rounded text-zinc-400 hover:text-white font-mono text-[10px]";
    window.showNotification("Base Layer: OpenStreetMap Standard");
  }
};

// Toggle Cadastre Parcels Overlay
window.toggleCadastreParcelsOverlay = function() {
  if (!overviewGisMap || !overviewCadastreLayer) return;
  showCadastre = !showCadastre;
  if (showCadastre) {
    overviewCadastreLayer.addTo(overviewGisMap);
    window.showNotification("Cadastral Land Parcels: Visible");
  } else {
    overviewGisMap.removeLayer(overviewCadastreLayer);
    window.showNotification("Cadastral Land Parcels: Hidden");
  }
};

/* --------------------------------------------------------------------------
   2. 3D AHRS DIGITAL TWIN VIEWPORT (THREE.JS)
   -------------------------------------------------------------------------- */
function initOverview3DScene() {
  const container = document.getElementById('overview-threejs-container');
  if (!container || ovThreeScene) return;

  const w = container.clientWidth || 600;
  const h = container.clientHeight || 450;

  ovThreeScene = new THREE.Scene();
  ovThreeScene.background = new THREE.Color(0x06080e);

  ovThreeCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  ovThreeCamera.position.set(0, 5, 9);
  ovThreeCamera.lookAt(0, 0, 0);

  ovThreeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  ovThreeRenderer.setSize(w, h);
  ovThreeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(ovThreeRenderer.domElement);

  // Lighting
  const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
  ovThreeScene.add(ambLight);

  const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
  dirLight.position.set(8, 14, 8);
  ovThreeScene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
  fillLight.position.set(-8, -4, -6);
  ovThreeScene.add(fillLight);

  // Ground Grid & Coordinate Axis Ring
  const gridHelper = new THREE.GridHelper(16, 16, 0x0ea5e9, 0x1e293b);
  gridHelper.position.y = -1.2;
  ovThreeScene.add(gridHelper);

  // Procedural Enterprise Drone Model
  ovThreeDrone = new THREE.Group();

  // Central Hub
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.8 });
  const hubGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.35, 8);
  const hub = new THREE.Mesh(hubGeo, hubMat);
  ovThreeDrone.add(hub);

  // Drone Canopy (Cyan Accent)
  const topCoverMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.6 });
  const topCoverGeo = new THREE.CylinderGeometry(0.55, 0.8, 0.25, 8);
  const topCover = new THREE.Mesh(topCoverGeo, topCoverMat);
  topCover.position.y = 0.28;
  ovThreeDrone.add(topCover);

  // GNSS RTK Mast
  const mastMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), mastMat);
  mast.position.set(0, 0.65, -0.3);
  ovThreeDrone.add(mast);

  const rtkPuck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  rtkPuck.position.set(0, 1.0, -0.3);
  ovThreeDrone.add(rtkPuck);

  // 4 Carbon Arms + Motors + Props
  const armMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.5 });
  const motorMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.2 });
  const propMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.65 });

  ovProps = [];
  const armDist = 1.8;
  const angles = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];

  angles.forEach((ang) => {
    const x = Math.cos(ang) * armDist;
    const z = Math.sin(ang) * armDist;

    // Arm tube
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, armDist, 8);
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(x / 2, 0, z / 2);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, 0, z).normalize());
    ovThreeDrone.add(arm);

    // Motor pod
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 12), motorMat);
    motor.position.set(x, 0.12, z);
    ovThreeDrone.add(motor);

    // 2-blade Propeller
    const propGeo = new THREE.BoxGeometry(1.2, 0.02, 0.12);
    const prop = new THREE.Mesh(propGeo, propMat);
    prop.position.set(x, 0.28, z);
    ovThreeDrone.add(prop);
    ovProps.push(prop);
  });

  ovThreeScene.add(ovThreeDrone);

  // Resize handler
  window.addEventListener('resize', () => {
    if (!container || !ovThreeRenderer || !ovThreeCamera) return;
    const newW = container.clientWidth;
    const newH = container.clientHeight;
    ovThreeCamera.aspect = newW / newH;
    ovThreeCamera.updateProjectionMatrix();
    ovThreeRenderer.setSize(newW, newH);
  });

  // Animation Loop
  function animate3D() {
    ovThreeAnimId = requestAnimationFrame(animate3D);

    const s = window.bhoomiState;
    if (ovThreeDrone) {
      // Convert Euler degrees from MAVLink/State to Three.js Radians
      // Aerospace attitude: pitch (nose up/down), roll (bank left/right), yaw (compass)
      const pitchRad = ((s.pitch || 0) * Math.PI) / 180;
      const rollRad = ((s.roll || 0) * Math.PI) / 180;
      const yawRad = -((s.yaw || 0) * Math.PI) / 180;

      ovThreeDrone.rotation.set(pitchRad, yawRad, -rollRad, 'YXZ');

      // Spin props when armed or simulating
      if (s.armed || s.simulationRunning) {
        ovProps.forEach((p, idx) => {
          p.rotation.y += (idx % 2 === 0 ? 0.45 : -0.45);
        });
      }
    }

    ovThreeRenderer.render(ovThreeScene, ovThreeCamera);
  }
  animate3D();
}

/* --------------------------------------------------------------------------
   3. PRIMARY FLIGHT DISPLAY (PFD) ARTIFICIAL HORIZON
   -------------------------------------------------------------------------- */
function initPfdCanvas() {
  pfdCanvas = document.getElementById('pfd-horizon-canvas');
  if (!pfdCanvas) return;
  pfdCtx = pfdCanvas.getContext('2d');

  function resizePfd() {
    if (!pfdCanvas) return;
    pfdCanvas.width = pfdCanvas.clientWidth || 600;
    pfdCanvas.height = pfdCanvas.clientHeight || 450;
  }
  resizePfd();
  window.addEventListener('resize', resizePfd);

  function renderPfd() {
    pfdAnimId = requestAnimationFrame(renderPfd);
    if (!pfdCtx || !pfdCanvas || window.missionCanvasMode !== 'pfd') return;

    const w = pfdCanvas.width;
    const h = pfdCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const s = window.bhoomiState;
    const pitch = s.pitch || 0; // degrees
    const roll = s.roll || 0;   // degrees
    const pitchPxPerDeg = 4;

    pfdCtx.save();
    pfdCtx.clearRect(0, 0, w, h);

    // 1. Artificial Horizon Sky & Ground
    pfdCtx.save();
    pfdCtx.translate(cx, cy);
    pfdCtx.rotate((-roll * Math.PI) / 180);
    pfdCtx.translate(0, pitch * pitchPxPerDeg);

    // Sky
    pfdCtx.fillStyle = '#0c4a6e';
    pfdCtx.fillRect(-w * 1.5, -h * 2, w * 3, h * 2);

    // Ground
    pfdCtx.fillStyle = '#1c1917';
    pfdCtx.fillRect(-w * 1.5, 0, w * 3, h * 2);

    // Horizon line
    pfdCtx.strokeStyle = '#ffffff';
    pfdCtx.lineWidth = 2;
    pfdCtx.beginPath();
    pfdCtx.moveTo(-w, 0);
    pfdCtx.lineTo(w, 0);
    pfdCtx.stroke();

    // Pitch ladder rungs
    for (let p = -30; p <= 30; p += 10) {
      if (p === 0) continue;
      const y = -p * pitchPxPerDeg;
      const rw = Math.abs(p) % 20 === 0 ? 60 : 35;

      pfdCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      pfdCtx.lineWidth = 1.5;
      pfdCtx.beginPath();
      pfdCtx.moveTo(-rw, y);
      pfdCtx.lineTo(rw, y);
      pfdCtx.stroke();

      pfdCtx.font = '10px monospace';
      pfdCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      pfdCtx.textAlign = 'right';
      pfdCtx.fillText(p.toString(), -rw - 6, y + 3);
      pfdCtx.textAlign = 'left';
      pfdCtx.fillText(p.toString(), rw + 6, y + 3);
    }
    pfdCtx.restore();

    // 2. Fixed Reticle Wings (Yellow / Cyan)
    pfdCtx.strokeStyle = '#38bdf8';
    pfdCtx.lineWidth = 2.5;

    // Left wing
    pfdCtx.beginPath();
    pfdCtx.moveTo(cx - 70, cy);
    pfdCtx.lineTo(cx - 25, cy);
    pfdCtx.lineTo(cx - 25, cy + 10);
    pfdCtx.stroke();

    // Right wing
    pfdCtx.beginPath();
    pfdCtx.moveTo(cx + 70, cy);
    pfdCtx.lineTo(cx + 25, cy);
    pfdCtx.lineTo(cx + 25, cy + 10);
    pfdCtx.stroke();

    // Center dot
    pfdCtx.fillStyle = '#38bdf8';
    pfdCtx.beginPath();
    pfdCtx.arc(cx, cy, 3, 0, Math.PI * 2);
    pfdCtx.fill();

    // 3. Airspeed Tape (Left)
    pfdCtx.fillStyle = 'rgba(10, 12, 18, 0.85)';
    pfdCtx.fillRect(10, 30, 60, h - 60);
    pfdCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    pfdCtx.strokeRect(10, 30, 60, h - 60);

    pfdCtx.font = 'bold 12px monospace';
    pfdCtx.fillStyle = '#38bdf8';
    pfdCtx.textAlign = 'center';
    const speedStr = s.groundSpeed !== null ? `${s.groundSpeed.toFixed(1)}` : '--';
    pfdCtx.fillText(`${speedStr}`, 40, cy);
    pfdCtx.font = '8px sans-serif';
    pfdCtx.fillStyle = '#94a3b8';
    pfdCtx.fillText('m/s GS', 40, cy + 14);

    // 4. Altitude Tape (Right)
    pfdCtx.fillStyle = 'rgba(10, 12, 18, 0.85)';
    pfdCtx.fillRect(w - 70, 30, 60, h - 60);
    pfdCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    pfdCtx.strokeRect(w - 70, 30, 60, h - 60);

    pfdCtx.font = 'bold 12px monospace';
    pfdCtx.fillStyle = '#38bdf8';
    pfdCtx.textAlign = 'center';
    const altStr = s.altitudeAGL !== null ? `${s.altitudeAGL.toFixed(1)}` : '--';
    pfdCtx.fillText(`${altStr}`, w - 40, cy);
    pfdCtx.font = '8px sans-serif';
    pfdCtx.fillStyle = '#94a3b8';
    pfdCtx.fillText('m AGL', w - 40, cy + 14);

    pfdCtx.restore();
  }
  renderPfd();
}

/* --------------------------------------------------------------------------
   4. CANVAS MODE SWITCHER (MAP | 3D | PFD | UVC)
   -------------------------------------------------------------------------- */
window.switchMissionCanvasMode = function(mode) {
  window.missionCanvasMode = mode;

  const btnMap = document.getElementById('btn-mode-map');
  const btn3D = document.getElementById('btn-mode-3d');
  const btnPfd = document.getElementById('btn-mode-pfd');
  const btnUvc = document.getElementById('btn-mode-uvc');

  const mapEl = document.getElementById('overview-gis-map');
  const threeEl = document.getElementById('overview-threejs-container');
  const pfdEl = document.getElementById('pfd-horizon-canvas');
  const uvcVideoEl = document.getElementById('fpv-live-video');
  const standbyEl = document.getElementById('fpv-standby-screen');
  const mapToolbar = document.getElementById('overview-map-toolbar');

  const activeClass = "px-2.5 py-1 rounded bg-cyan-500 text-black font-mono text-xs font-bold shadow transition-all cursor-pointer";
  const inactiveClass = "px-2.5 py-1 rounded text-zinc-400 hover:text-white font-mono text-xs transition-all cursor-pointer";

  if (btnMap) btnMap.className = (mode === 'map') ? activeClass : inactiveClass;
  if (btn3D) btn3D.className = (mode === '3d') ? activeClass : inactiveClass;
  if (btnPfd) btnPfd.className = (mode === 'pfd') ? activeClass : inactiveClass;
  if (btnUvc) btnUvc.className = (mode === 'uvc') ? activeClass : inactiveClass;

  if (mapEl) mapEl.classList.toggle('hidden', mode !== 'map');
  if (threeEl) threeEl.classList.toggle('hidden', mode !== '3d');
  if (pfdEl) pfdEl.classList.toggle('hidden', mode !== 'pfd');
  if (mapToolbar) mapToolbar.classList.toggle('hidden', mode !== 'map');

  if (mode === 'uvc') {
    if (fpvMediaStream && uvcVideoEl) {
      uvcVideoEl.classList.remove('hidden');
      if (standbyEl) standbyEl.classList.add('hidden');
    } else {
      if (uvcVideoEl) uvcVideoEl.classList.add('hidden');
      if (standbyEl) standbyEl.classList.remove('hidden');
    }
  } else {
    if (uvcVideoEl) uvcVideoEl.classList.add('hidden');
    if (standbyEl) standbyEl.classList.add('hidden');
  }

  if (mode === 'map') {
    if (!overviewGisMap) initOverviewGisMap();
    setTimeout(() => { if (overviewGisMap) overviewGisMap.invalidateSize(); }, 50);
  } else if (mode === '3d') {
    if (!ovThreeScene) initOverview3DScene();
  }
};

// Fullscreen Toggle for the Operations Canvas
window.toggleMissionCanvasFullscreen = function() {
  const container = document.getElementById('cockpit-screen-viewport');
  if (!container) return;

  if (!document.fullscreenElement) {
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    }
    window.showNotification("Canvas Expanded: Fullscreen Operations Mode");
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

/* --------------------------------------------------------------------------
   5. REAL FPV 5.8GHz / USB VIDEO STREAM (UVC)
   -------------------------------------------------------------------------- */
window.toggleRealFPVFeed = async function() {
  const videoEl = document.getElementById('fpv-live-video');
  const standbyEl = document.getElementById('fpv-standby-screen');
  const btn = document.getElementById('btn-fpv-feed');

  if (fpvMediaStream) {
    fpvMediaStream.getTracks().forEach(t => t.stop());
    fpvMediaStream = null;
    if (videoEl) videoEl.classList.add('hidden');
    if (standbyEl && window.missionCanvasMode === 'uvc') standbyEl.classList.remove('hidden');
    if (btn) btn.innerHTML = `<span class="material-symbols-outlined text-xs">videocam</span> CONNECT UVC`;
    window.showNotification("UVC Video Receiver disconnected");
    return;
  }

  try {
    window.showNotification("Accessing UVC / USB Video Receiver...");
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');

    let selectedDeviceId = undefined;
    const uvc = videoDevices.find(d => d.label.toLowerCase().includes('uvc') || d.label.toLowerCase().includes('usb'));
    if (uvc) selectedDeviceId = uvc.deviceId;

    const constraints = {
      video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      audio: false
    };

    fpvMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (videoEl) {
      videoEl.srcObject = fpvMediaStream;
      videoEl.classList.remove('hidden');
      videoEl.play();
    }
    if (standbyEl) standbyEl.classList.add('hidden');

    window.switchMissionCanvasMode('uvc');
    if (btn) btn.innerHTML = `<span class="material-symbols-outlined text-xs">videocam_off</span> DISCONNECT UVC`;
    window.showNotification("Live 5.8GHz UVC Video Feed Connected!");
  } catch (err) {
    console.error("Camera access error:", err);
    window.showNotification("No UVC video device detected or permission denied.", true);
  }
};

/* --------------------------------------------------------------------------
   6. TELEMETRY TICK UPDATES (TRUTHFUL HUD)
   -------------------------------------------------------------------------- */
window.updateOverviewHud = function(s) {
  // 1. Top Telemetry Strip
  const rtk = document.getElementById('hud-rtk-sats');
  if (rtk) {
    if (s.satellites > 0) {
      rtk.textContent = `RTK 3D: ${s.satellites} SATS`;
      rtk.className = "bg-black/75 px-2.5 py-1 rounded text-emerald-400 border border-emerald-500/30";
    } else {
      rtk.textContent = `NO GPS FIX (0 SATS)`;
      rtk.className = "bg-black/75 px-2.5 py-1 rounded text-rose-400 border border-rose-500/30";
    }
  }

  const hdop = document.getElementById('hud-hdop');
  if (hdop) {
    hdop.textContent = (s.hdop !== null) ? `HDOP: ${s.hdop.toFixed(2)}` : `HDOP: --`;
  }

  const bat = document.getElementById('hud-battery');
  if (bat) {
    if (s.batteryVoltage) {
      bat.textContent = `BATTERY: ${s.batteryPercent}% (${s.batteryVoltage.toFixed(1)}V)`;
      bat.className = s.batteryPercent > 25 
        ? "bg-black/75 px-2.5 py-1 rounded text-cyan-300 border border-cyan-500/30"
        : "bg-black/75 px-2.5 py-1 rounded text-rose-400 border border-rose-500/40";
    } else {
      bat.textContent = `BATTERY: --`;
      bat.className = "bg-black/75 px-2.5 py-1 rounded text-zinc-400 border border-zinc-700";
    }
  }

  // 2. Center Tactical Attitude Readout
  const att = document.getElementById('hud-attitude-readout');
  if (att) {
    if (s.connected || s.simulationRunning) {
      att.textContent = `PITCH: ${(s.pitch || 0).toFixed(1)}° | ROLL: ${(s.roll || 0).toFixed(1)}° | HDG: ${s.heading || 0}°`;
    } else {
      att.textContent = `PITCH: --° | ROLL: --° | HDG: --°`;
    }
  }

  // 3. Bottom Tape
  const spd = document.getElementById('hud-speed');
  if (spd) {
    spd.textContent = (s.groundSpeed !== null) ? `${s.groundSpeed.toFixed(1)} m/s` : `-- m/s`;
  }

  const alt = document.getElementById('hud-alt');
  if (alt) {
    alt.textContent = (s.altitudeAGL !== null) ? `${s.altitudeAGL.toFixed(1)} m` : `-- m`;
  }

  const wp = document.getElementById('hud-waypoint');
  if (wp) {
    wp.textContent = (s.connected || s.simulationRunning) ? `WP ${s.activeWaypoint || 1} / ${s.totalWaypoints || 24}` : `WP -- / --`;
  }

  // 4. Update Drone Marker on Map
  if (overviewDroneMarker && s.droneLat && s.droneLng) {
    overviewDroneMarker.setLatLng([s.droneLat, s.droneLng]);
    const iconEl = document.getElementById('ov-map-drone-icon');
    if (iconEl && s.heading !== undefined) {
      iconEl.style.transform = `rotate(${s.heading}deg)`;
    }
  }
};

/* --------------------------------------------------------------------------
   7. FLIGHT COMMAND HANDLERS
   -------------------------------------------------------------------------- */
window.toggleArming = function() {
  window.bhoomiState.armed = !window.bhoomiState.armed;
  const armBtn = document.getElementById('btn-action-arm');
  const badge = document.getElementById('hud-arm-badge');

  if (window.bhoomiState.armed) {
    if (armBtn) {
      armBtn.className = "px-space-md py-1.5 rounded bg-emerald-600 text-white font-mono text-xs font-bold hover:bg-emerald-500 flex items-center gap-1 cursor-pointer transition-all shadow";
      armBtn.innerHTML = `<span class="material-symbols-outlined text-xs">gpp_good</span> ARMED (DISARM)`;
    }
    if (badge) {
      badge.textContent = "ARMED";
      badge.className = "font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30";
    }
    window.showNotification("AUTOPILOT ARMED: Propulsion systems live!");
  } else {
    if (armBtn) {
      armBtn.className = "px-space-md py-1.5 rounded bg-rose-600 text-white font-mono text-xs font-bold hover:bg-rose-500 flex items-center gap-1 cursor-pointer transition-all shadow";
      armBtn.innerHTML = `<span class="material-symbols-outlined text-xs">lock</span> DISARMED (ARM)`;
    }
    if (badge) {
      badge.textContent = "DISARMED";
      badge.className = "font-mono text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30";
    }
    window.showNotification("AUTOPILOT DISARMED: Propulsion disabled.");
  }
};

window.triggerTakeoff = function() {
  if (!window.bhoomiState.armed) {
    window.showNotification("Cannot Takeoff: Autopilot is DISARMED! Please Arm first.", true);
    return;
  }
  window.bhoomiState.altitudeAGL = 80.0;
  window.bhoomiState.flightMode = 'GUIDED CLIMB';
  window.showNotification("AUTO TAKEOFF INITIATED: Climbing to survey altitude 80.0m AGL...");
};

window.triggerRTL = function() {
  window.bhoomiState.flightMode = 'RTL';
  window.showNotification("RTL ENGAGED: Drone returning to launch home coordinates.");
};

window.triggerEmergencyLand = function() {
  window.bhoomiState.flightMode = 'LAND';
  window.showNotification("EMERGENCY LAND: Autopilot descending at current position!", true);
};

window.capturePayloadPhoto = function() {
  window.bhoomiState.surveyPhotosCount++;
  const countEl = document.getElementById('ov-photo-counter');
  if (countEl) countEl.textContent = window.bhoomiState.surveyPhotosCount;

  const shutterFlash = document.getElementById('fpv-shutter-flash');
  if (shutterFlash) {
    shutterFlash.classList.remove('opacity-0');
    shutterFlash.classList.add('opacity-80');
    setTimeout(() => {
      shutterFlash.classList.remove('opacity-80');
      shutterFlash.classList.add('opacity-0');
    }, 120);
  }
  window.bhoomiAudio.beep(1600, 0.08, 'triangle');
  window.showNotification(`Geotagged Cadastral Orthophoto #${window.bhoomiState.surveyPhotosCount} captured`);
};
