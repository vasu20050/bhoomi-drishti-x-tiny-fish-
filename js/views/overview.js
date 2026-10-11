/**
 * View 01: Mission Overview & Pilot Cockpit HUD
 * Real FPV 5.8GHz USB Video Receiver (UVC WebCam) + Primary Flight Display
 */

let overviewMiniMap = null;
let overviewDroneMarker = null;
let fpvMediaStream = null;
let ovSatTiles = null;
let ovOsmTiles = null;

window.initOverviewMiniMap = function() {
  const container = document.getElementById('overview-mini-map');
  if (!container) return;

  if (overviewMiniMap) {
    overviewMiniMap.invalidateSize();
    return;
  }

  overviewMiniMap = L.map('overview-mini-map', {
    zoomControl: false,
    attributionControl: true
  }).setView([28.4701886, 77.4941820], 16);
  window.overviewMiniMap = overviewMiniMap;

  // OpenStreetMap Tile Layer
  ovOsmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
  });

  // Satellite Ortho Tile Layer
  ovSatTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}', {
    maxZoom: 19,
    attribution: 'Esri'
  });

  // Default to OpenStreetMap
  ovOsmTiles.addTo(overviewMiniMap);

  // Basemap switcher for cockpit overview mini-map
  window.switchOverviewBaseMap = function(type) {
    if (!overviewMiniMap) return;
    const satBtn = document.getElementById('ov-map-sat-btn');
    const osmBtn = document.getElementById('ov-map-osm-btn');

    if (type === 'sat') {
      if (overviewMiniMap.hasLayer(ovOsmTiles)) overviewMiniMap.removeLayer(ovOsmTiles);
      ovSatTiles.addTo(overviewMiniMap);
      if (satBtn) {
        satBtn.className = "px-2 py-0.5 rounded text-[10px] font-label-caps bg-primary text-on-primary font-bold shadow cursor-pointer";
      }
      if (osmBtn) {
        osmBtn.className = "px-2 py-0.5 rounded text-[10px] font-label-caps text-on-surface-variant hover:text-on-surface cursor-pointer";
      }
      window.showNotification("Cockpit Mini-Map: Satellite Ortho Layer");
    } else {
      if (overviewMiniMap.hasLayer(ovSatTiles)) overviewMiniMap.removeLayer(ovSatTiles);
      ovOsmTiles.addTo(overviewMiniMap);
      if (osmBtn) {
        osmBtn.className = "px-2 py-0.5 rounded text-[10px] font-label-caps bg-primary text-on-primary font-bold shadow cursor-pointer";
      }
      if (satBtn) {
        satBtn.className = "px-2 py-0.5 rounded text-[10px] font-label-caps text-on-surface-variant hover:text-on-surface cursor-pointer";
      }
      window.showNotification("Cockpit Mini-Map: OpenStreetMap Standard");
    }
  };

  // Cadastral polygon boundary preview
  L.polygon([
    [28.4685, 77.4920],
    [28.4720, 77.4925],
    [28.4715, 77.4960],
    [28.4680, 77.4955]
  ], {
    color: '#06b6d4',
    fillColor: '#06b6d4',
    fillOpacity: 0.25,
    weight: 2
  }).addTo(overviewMiniMap);

  const icon = L.divIcon({
    className: 'ov-drone-icon',
    html: `
      <div class="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-[0_0_8px_rgba(76,215,246,0.8)]">
        <span class="material-symbols-outlined text-xs text-on-primary">navigation</span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  overviewDroneMarker = L.marker([28.4701886, 77.4941820], { icon }).addTo(overviewMiniMap);
  window.overviewDroneMarker = overviewDroneMarker;
};

// Connect Real FPV 5.8GHz USB Receiver (UVC Webcam)
window.toggleRealFPVFeed = async function() {
  const videoEl = document.getElementById('fpv-live-video');
  const imgEl = document.getElementById('fpv-static-img');
  const btn = document.getElementById('btn-fpv-feed');

  if (fpvMediaStream) {
    // Stop stream
    fpvMediaStream.getTracks().forEach(t => t.stop());
    fpvMediaStream = null;
    if (videoEl) videoEl.classList.add('hidden');
    if (imgEl) imgEl.classList.remove('hidden');
    if (btn) {
      btn.innerHTML = `<span class="material-symbols-outlined text-xs">videocam</span> CONNECT FPV 5.8GHz USB`;
    }
    window.showNotification("Switched off FPV UVC receiver stream");
    return;
  }

  try {
    window.showNotification("Accessing 5.8GHz UVC FPV Receiver...");
    // Find video input devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    
    // Look for USB2.0 UVC WebCam / External receiver first
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
    if (imgEl) imgEl.classList.add('hidden');
    if (btn) {
      btn.innerHTML = `<span class="material-symbols-outlined text-xs">videocam_off</span> DISCONNECT FPV`;
    }
    window.showNotification("FPV 5.8GHz Video Receiver connected live to HUD!");
  } catch (err) {
    console.error("Camera access error:", err);
    window.showNotification("Could not access FPV USB receiver. Ensure camera permissions are granted.", true);
  }
};

window.toggleArming = function() {
  window.bhoomiState.armed = !window.bhoomiState.armed;
  const armBtn = document.getElementById('btn-action-arm');
  const badge = document.getElementById('hud-arm-badge');

  if (window.bhoomiState.armed) {
    if (armBtn) {
      armBtn.classList.remove('bg-error-container', 'text-on-error-container');
      armBtn.classList.add('bg-secondary', 'text-on-secondary');
      armBtn.innerHTML = `<span class="material-symbols-outlined text-xs">gpp_good</span> ARMED (DISARM)`;
    }
    if (badge) {
      badge.textContent = "ARMED";
      badge.className = "font-label-caps text-label-caps px-space-xs py-0.5 rounded bg-secondary-container/30 text-secondary font-bold";
    }
    window.showNotification("AUTOPILOT ARMED! Motors active.");
  } else {
    if (armBtn) {
      armBtn.classList.remove('bg-secondary', 'text-on-secondary');
      armBtn.classList.add('bg-error-container', 'text-on-error-container');
      armBtn.innerHTML = `<span class="material-symbols-outlined text-xs">lock</span> DISARMED (ARM)`;
    }
    if (badge) {
      badge.textContent = "DISARMED";
      badge.className = "font-label-caps text-label-caps px-space-xs py-0.5 rounded bg-error-container/30 text-error font-bold";
    }
    window.showNotification("AUTOPILOT DISARMED. Motors disabled.");
  }
};

window.triggerTakeoff = function() {
  if (!window.bhoomiState.armed) {
    window.showNotification("Cannot Takeoff: Autopilot is DISARMED! Please Arm first.", true);
    return;
  }
  window.showNotification("TAKEOFF INITIATED: Climbing to survey altitude 80.0m AGL...");
  window.bhoomiState.altitudeAGL = 80.0;
  window.bhoomiState.flightMode = 'GUIDED CLIMB';
};

window.triggerRTL = function() {
  window.bhoomiState.flightMode = 'RTL';
  window.showNotification("RTL ENGAGED: Drone returning to launch home.");
};

window.triggerEmergencyLand = function() {
  window.bhoomiState.flightMode = 'LAND';
  window.showNotification("EMERGENCY LAND: Descending at current location!", true);
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
    }, 150);
  }
  window.bhoomiAudio.beep(1600, 0.08, 'triangle');
  window.showNotification(`Geotagged Cadastral Orthophoto #${window.bhoomiState.surveyPhotosCount} captured`);
};
