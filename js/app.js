/**
 * Bhoomi Drishti Ground Control Station (GCS v2.4-RC3)
 * Core Application Engine, WebSocket MAVLink Telemetry Gateway & Mission Router
 * Truthful Operational States, Clean Lifecycle Management & Aerospace HUD
 */

// Global GCS State
window.bhoomiState = {
  connected: false,
  hardwareConnected: false,
  simulationRunning: false,
  connectionStatus: 'DISCONNECTED', // 'LIVE' | 'STALE' | 'SIMULATING' | 'DISCONNECTED'
  comPort: 'COM5',
  targetPort: 'AUTO',
  baudRate: 57600,
  connectionType: 'SEARCHING',
  armed: false,
  flightMode: 'STANDBY',
  altitudeAGL: null,
  altitudeMSL: null,
  groundSpeed: null,
  airSpeed: null,
  climbRate: null,
  throttle: 0,
  heading: 0,
  pitch: 0.0,
  roll: 0.0,
  yaw: 0.0,
  batteryVoltage: null,
  batteryCurrent: null,
  batteryPercent: null,
  satellites: 0,
  gpsFix: 'NO FIX',
  hdop: null,
  vdop: null,
  rssi: null,
  rfDbm: null,
  imuTemp: null,
  cpuLoad: null,
  vibrationX: null,
  vibrationY: null,
  vibrationZ: null,
  ekf: {
    velocity_variance: null,
    pos_horiz_variance: null,
    pos_vert_variance: null,
    compass_variance: null,
    terrain_alt_variance: null
  },
  rcChannels: Array(16).fill(1500),
  activeWaypoint: 1,
  totalWaypoints: 24,
  surveyAreaTotalHa: 28.5,
  surveyAreaDoneHa: 0.0,
  surveyPhotosCount: 0,
  sdFreeGb: 184,
  audioMuted: false,
  activeView: 'overview',
  droneLat: parseFloat(localStorage.getItem('bhoomi_custom_lat')) || 28.4701886,
  droneLng: parseFloat(localStorage.getItem('bhoomi_custom_lng')) || 77.4941820,
  packetsReceived: 0,
  lastRealPacketTime: 0,
  availablePorts: []
};

// Audio Alert System
window.bhoomiAudio = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  },
  beep(freq = 880, duration = 0.15, type = 'sine') {
    if (window.bhoomiState.audioMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  },
  alertWarning() {
    this.beep(520, 0.1, 'square');
    setTimeout(() => this.beep(440, 0.2, 'square'), 120);
  },
  alertSuccess() {
    this.beep(880, 0.1, 'sine');
    setTimeout(() => this.beep(1320, 0.2, 'sine'), 100);
  }
};

// Notification Toast
window.showNotification = function(msg, isError = false) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;
  if (isError) {
    toast.classList.remove('text-primary');
    toast.classList.add('text-error');
    window.bhoomiAudio.alertWarning();
  } else {
    toast.classList.remove('text-error');
    toast.classList.add('text-primary');
  }

  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-3');
  toast.classList.add('opacity-100', 'translate-y-0');

  if (window._toastTimer) clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-3');
  }, 3200);
};

// Clean View Router & Tab Switching
window.navigateTo = function(viewId) {
  window.bhoomiState.activeView = viewId;
  window.location.hash = viewId;

  document.querySelectorAll('#sidebar-nav .nav-link').forEach(link => {
    const path = link.getAttribute('data-path');
    if (path === viewId) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active', 'bg-primary-container', 'text-on-primary-container', 'font-semibold');
      link.removeAttribute('aria-current');
    }
  });

  document.querySelectorAll('.view-section').forEach(sec => {
    if (sec.id === `view-${viewId}`) {
      sec.classList.remove('hidden');
    } else {
      sec.classList.add('hidden');
    }
  });

  // Subsystem-specific lifecycle initializers
  if (viewId === 'overview') {
    if (window.initOverviewOperationsCanvas) {
      window.initOverviewOperationsCanvas();
    } else if (window.initOverviewMiniMap) {
      window.initOverviewMiniMap();
    }
  }
  if (viewId === 'drone-telemetry' && window.initTelemetryCharts) {
    window.initTelemetryCharts();
  }
  if (viewId === 'flight-controller-health' && window.initFCHealth) {
    window.initFCHealth();
  }
  if (viewId === 'live-orientation' && window.initOrientation3D) {
    window.initOrientation3D();
  }
  if (viewId === 'land-mapping-workspace' && window.initCadastreMap) {
    window.initCadastreMap();
  }
  if (viewId === 'survey-history-logs' && window.initSurveyHistory) {
    window.initSurveyHistory();
  }
  if (viewId === 'alerts-system-events' && window.filterAlerts) {
    window.filterAlerts('ALL');
  }
  if (viewId === 'device-settings' && window.initSettingsView) {
    window.initSettingsView();
  }

  // Safeguard: Ensure Leaflet maps accurately resize when their container becomes visible
  setTimeout(() => {
    if (window.cadastreMap) window.cadastreMap.invalidateSize();
    if (window.overviewGisMap) window.overviewGisMap.invalidateSize();
    if (window.overviewMiniMap) window.overviewMiniMap.invalidateSize();
  }, 80);

  window.showNotification(`Console: ${viewId.replace(/-/g, ' ').toUpperCase()}`);
};

// Switch Active MAVLink Port (COM5 Telemetry @ 57600 or COM8 USB @ 115200)
window.switchMavlinkPort = async function(port, baud) {
  baud = parseInt(baud) || (port === 'COM5' ? 57600 : 115200);
  window.showNotification(`Configuring MAVLink link: ${port} @ ${baud} baud...`);

  try {
    const res = await fetch('/api/switch-port', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port: port, baud: baud })
    });
    if (res.ok) {
      const data = await res.json();
      window.bhoomiState.targetPort = port;
      window.bhoomiState.baudRate = baud;
      window.bhoomiState.comPort = port;
      window.showNotification(data.message || `Switched to ${port}`);
      updateHardwareBadge(false, `Connecting to ${port}...`);
      return;
    }
  } catch (err) {
    // Expected on static cloud preview / Vercel without local bridge.py
  }

  // Graceful static preview fallback
  window.bhoomiState.targetPort = port;
  window.bhoomiState.baudRate = baud;
  window.bhoomiState.comPort = port;
  window.showNotification(`Port configured: ${port} @ ${baud} baud (Local bridge.py not detected)`);
  updateHardwareBadge(window.bhoomiState.hardwareConnected);
};

// Fetch list of physical COM ports
async function refreshAvailablePorts() {
  try {
    const res = await fetch('/api/ports');
    if (res.ok) {
      const data = await res.json();
      window.bhoomiState.availablePorts = data.ports || [];
      renderPortSwitcher(data.ports, data.current_active, data.target_port);
    }
  } catch (e) {
    // Running in static preview mode
  }
}

function renderPortSwitcher(ports, activePort, targetPort) {
  const headerSelect = document.getElementById('hdr-port-selector');
  if (!headerSelect) return;
  if (headerSelect.options.length <= 1) {
    headerSelect.innerHTML = `
      <option value="AUTO">⚡ Auto-Detect Port</option>
      <option value="COM5">📻 COM5 - Telemetry Radio (57600)</option>
      <option value="COM8">🔌 COM8 - Pixhawk USB (115200)</option>
    `;
  }
  const desired = targetPort || activePort || 'AUTO';
  if (headerSelect.value !== desired && !headerSelect.matches(':focus')) {
    headerSelect.value = desired;
  }
}

// Global Dark Mode Toggle
window.toggleDarkMode = function() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  window.showNotification(`Switched to ${isDark ? 'Dark' : 'Light'} mode`);
};

// Copy text to clipboard
window.copyToClipboard = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    window.showNotification('Copied to clipboard');
  }).catch(() => {
    window.showNotification('Failed to copy', true);
  });
};

// Export GCS state
window.exportSettingsAsJSON = function() {
  const dataStr = JSON.stringify(window.bhoomiState, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bhoomi_settings_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  window.showNotification('Settings exported');
};

// Import settings
window.importSettingsFromJSON = function(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const obj = JSON.parse(e.target.result);
      const allowed = [
        'connected','hardwareConnected','comPort','targetPort','baudRate','connectionType','armed','flightMode',
        'altitudeAGL','altitudeMSL','groundSpeed','airSpeed','climbRate','throttle','heading','pitch','roll','yaw',
        'batteryVoltage','batteryCurrent','batteryPercent','satellites','gpsFix','hdop','vdop','rssi','rfDbm',
        'imuTemp','cpuLoad','vibrationX','vibrationY','vibrationZ','ekf','rcChannels','activeWaypoint','totalWaypoints',
        'surveyAreaTotalHa','surveyAreaDoneHa','surveyPhotosCount','sdFreeGb','simulationRunning','audioMuted','activeView',
        'droneLat','droneLng','packetsReceived','availablePorts'
      ];
      const sanitized = {};
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = obj[key];
        }
      }
      window.bhoomiState = { ...window.bhoomiState, ...sanitized };
      window.showNotification('Settings imported');
      updateHardwareBadge(window.bhoomiState.hardwareConnected);
      updateCommonTelemetryDisplays();
    } catch (err) {
      window.showNotification('Invalid settings file', true);
    }
  };
  reader.readAsText(file);
};

// Loading overlay
window.showLoadingOverlay = function(message = 'Loading…') {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50';
    overlay.innerHTML = `<div class="flex flex-col items-center gap-2"><div class="animate-spin rounded-full border-4 border-primary border-t-transparent w-10 h-10"></div><span class="font-mono text-xs text-primary font-bold">${message}</span></div>`;
    document.body.appendChild(overlay);
  }
};

window.hideLoadingOverlay = function() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
};

window.formatNumber = function(value, decimals = 2) {
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// Toggle Autonomous Simulation Flight (Demo Mode)
window.toggleSimulationMode = function(forceState) {
  const s = window.bhoomiState;
  s.simulationRunning = (forceState !== undefined) ? !!forceState : !s.simulationRunning;

  const simBtn = document.getElementById('btn-toggle-simulation');
  const simBadge = document.getElementById('hud-sim-badge');

  if (s.simulationRunning) {
    s.flightMode = 'AUTO SURVEY';
    s.armed = true;
    s.satellites = 26;
    s.gpsFix = 'RTK FIXED';
    s.hdop = 0.65;
    s.vdop = 0.85;
    s.batteryVoltage = 24.6;
    s.batteryPercent = 88;
    s.batteryCurrent = 14.2;
    s.altitudeAGL = 78.4;
    s.groundSpeed = 8.2;
    s.airSpeed = 8.5;
    s.climbRate = 0.1;
    s.imuTemp = 38.6;
    s.cpuLoad = 35.2;

    if (simBtn) {
      simBtn.innerHTML = `<span class="material-symbols-outlined text-xs">stop_circle</span> STOP SIM`;
      simBtn.className = "px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all";
    }
    if (simBadge) {
      simBadge.classList.remove('hidden');
    }
    window.showNotification("Simulation Mode: Active Autonomous Flight Demo");
  } else {
    // Reset to truthful disconnected values if no hardware link
    if (!s.hardwareConnected) {
      s.flightMode = 'STANDBY';
      s.armed = false;
      s.satellites = 0;
      s.gpsFix = 'NO FIX';
      s.hdop = null;
      s.vdop = null;
      s.batteryVoltage = null;
      s.batteryPercent = null;
      s.batteryCurrent = null;
      s.altitudeAGL = null;
      s.groundSpeed = null;
      s.airSpeed = null;
      s.climbRate = null;
      s.imuTemp = null;
      s.cpuLoad = null;
    }
    if (simBtn) {
      simBtn.innerHTML = `<span class="material-symbols-outlined text-xs">play_arrow</span> DEMO SIM`;
      simBtn.className = "px-2.5 py-1 rounded bg-surface-container-high text-primary border border-primary/30 font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-surface-container transition-all";
    }
    if (simBadge) {
      simBadge.classList.add('hidden');
    }
    window.showNotification("Simulation Mode Stopped: Awaiting Live Telemetry Link");
  }

  updateHardwareBadge(s.hardwareConnected);
  updateCommonTelemetryDisplays();
};

// WebSocket MAVLink Link
let ws = null;
function initWebSocket() {
  const host = window.location.host || 'localhost:8000';
  const wsUrl = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + host + '/ws';

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[Bhoomi Drishti] MAVLink WebSocket Connected!");
      window.bhoomiState.hardwareConnected = true;
      window.bhoomiState.simulationRunning = false;
      window.bhoomiState.lastRealPacketTime = Date.now();
      refreshAvailablePorts();
      updateHardwareBadge(true);
      window.showNotification("MAVLink Telemetry Bridge Connected Live!");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        window.bhoomiState.lastRealPacketTime = Date.now();
        window.bhoomiState.hardwareConnected = true;
        applyMavlinkData(data);
      } catch (e) {
        console.error("Error parsing telemetry packet:", e);
      }
    };

    ws.onclose = () => {
      window.bhoomiState.hardwareConnected = false;
      updateHardwareBadge(false);
      setTimeout(initWebSocket, 2500);
    };

    ws.onerror = () => {
      try { ws.close(); } catch (e) {}
    };
  } catch (e) {
    setTimeout(initWebSocket, 3000);
  }
}

// Continuous Telemetry Loop
let telemHeartbeatTimer = null;
function startTelemetryHeartbeat() {
  if (telemHeartbeatTimer) return;

  telemHeartbeatTimer = setInterval(() => {
    const s = window.bhoomiState;
    const now = Date.now();

    // 1. If real WebSocket packet arrived in the last 2000ms, live hardware is driving
    if (s.lastRealPacketTime && (now - s.lastRealPacketTime < 2000)) {
      s.connectionStatus = 'LIVE';
      return;
    }

    // 2. If real connection was present but packet is older than 2s, mark stale
    if (s.hardwareConnected && s.lastRealPacketTime && (now - s.lastRealPacketTime >= 2000)) {
      s.connectionStatus = 'STALE';
      updateHardwareBadge(true, '⚠ LINK STALE (>2s)');
      return;
    }

    // 3. If Simulation Mode is explicitly enabled by the user
    if (s.simulationRunning) {
      s.connectionStatus = 'SIMULATING';
      const t = now / 1000;

      // Realistic autonomous survey pattern progression
      const centerLat = 28.4701886;
      const centerLng = 77.4941820;
      const radius = 0.0018;

      const simPacket = {
        connected: true,
        port: s.comPort || 'COM5',
        baud: s.baudRate || 57600,
        connection_type: 'SIMULATION DEMO FLIGHT',
        target_port: s.targetPort || 'AUTO',
        armed: true,
        flight_mode: 'AUTO SURVEY',
        pitch: Number((1.5 * Math.sin(t * 0.5)).toFixed(1)),
        roll: Number((3.2 * Math.cos(t * 0.4)).toFixed(1)),
        yaw: Number(((t * 6) % 360).toFixed(1)),
        heading: Math.floor((t * 6) % 360),
        alt_agl: Number((78.4 + 1.2 * Math.sin(t * 0.3)).toFixed(1)),
        alt_msl: Number((142.4 + 1.2 * Math.sin(t * 0.3)).toFixed(1)),
        groundspeed: Number((8.2 + 0.4 * Math.cos(t * 0.4)).toFixed(1)),
        airspeed: Number((8.6 + 0.3 * Math.cos(t * 0.4)).toFixed(1)),
        climb_rate: Number((0.15 * Math.sin(t * 0.25)).toFixed(2)),
        throttle: Math.floor(48 + 2 * Math.sin(t * 0.3)),
        satellites_visible: 26,
        gps_fix_type: 6, // RTK FIXED
        hdop: 0.65,
        vdop: 0.85,
        cpu_load: 35.2,
        vibration_x: Number((0.02 + 0.006 * Math.sin(t * 2.1)).toFixed(3)),
        vibration_y: Number((0.02 + 0.006 * Math.cos(t * 2.3)).toFixed(3)),
        vibration_z: Number((0.03 + 0.006 * Math.sin(t * 1.9)).toFixed(3)),
        voltage_battery: Number((24.6 - (t * 0.002) % 3.0).toFixed(2)),
        current_battery: Number((14.2 + 0.8 * Math.sin(t * 0.4)).toFixed(1)),
        battery_remaining: Math.max(20, Math.floor(88 - (t * 0.02) % 40)),
        imu_temp: 38.6,
        rssi: 94,
        rf_dbm: -68.0,
        lat: centerLat + radius * Math.cos(t * 0.08),
        lon: centerLng + radius * Math.sin(t * 0.08) * 1.3,
        status_message: 'SIMULATED DEMO FLIGHT'
      };

      applyMavlinkData(simPacket);
      return;
    }

    // 4. Default state: Disconnected / Awaiting link
    s.connectionStatus = 'DISCONNECTED';
    updateHardwareBadge(false);
    updateCommonTelemetryDisplays();
  }, 100);
}

function applyMavlinkData(data) {
  const s = window.bhoomiState;
  s.connected = !!data.connected;
  s.comPort = data.port || s.comPort;
  s.baudRate = data.baud || s.baudRate;
  s.connectionType = data.connection_type || 'SEARCHING';
  s.targetPort = data.target_port || s.targetPort;
  s.armed = !!data.armed;
  s.flightMode = data.flight_mode || 'STANDBY';
  s.pitch = data.pitch !== undefined ? data.pitch : 0.0;
  s.roll = data.roll !== undefined ? data.roll : 0.0;
  s.yaw = data.yaw !== undefined ? data.yaw : 0.0;
  s.heading = data.heading !== undefined ? data.heading : 0;
  s.altitudeAGL = data.alt_agl !== undefined ? data.alt_agl : (data.alt_msl !== undefined ? data.alt_msl : null);
  s.altitudeMSL = data.alt_msl !== undefined ? data.alt_msl : null;
  s.groundSpeed = data.groundspeed !== undefined ? data.groundspeed : null;
  s.airSpeed = data.airspeed !== undefined ? data.airspeed : null;
  s.climbRate = data.climb_rate !== undefined ? data.climb_rate : null;
  s.throttle = data.throttle !== undefined ? data.throttle : 0;
  s.satellites = data.satellites_visible !== undefined ? data.satellites_visible : 0;
  s.gpsFix = data.gps_fix_type >= 3 ? (data.gps_fix_type === 6 ? 'RTK FIXED' : '3D FIX') : 'NO FIX';
  s.hdop = data.hdop !== undefined ? data.hdop : null;
  s.vdop = data.vdop !== undefined ? data.vdop : null;
  s.cpuLoad = data.cpu_load !== undefined ? data.cpu_load : null;
  s.vibrationX = data.vibration_x !== undefined ? data.vibration_x : null;
  s.vibrationY = data.vibration_y !== undefined ? data.vibration_y : null;
  s.vibrationZ = data.vibration_z !== undefined ? data.vibration_z : null;

  if (data.voltage_battery > 0) {
    s.batteryVoltage = data.voltage_battery;
    s.batteryCurrent = data.current_battery !== undefined ? data.current_battery : null;
    s.batteryPercent = data.battery_remaining >= 0 ? data.battery_remaining : 88;
  }

  if (data.imu_temp !== undefined) s.imuTemp = data.imu_temp;
  if (data.rssi !== undefined) s.rssi = data.rssi;
  if (data.rf_dbm !== undefined) s.rfDbm = data.rf_dbm;

  s.ekf = {
    velocity_variance: data.velocity_variance,
    pos_horiz_variance: data.pos_horiz_variance,
    pos_vert_variance: data.pos_vert_variance,
    compass_variance: data.compass_variance,
    terrain_alt_variance: data.terrain_alt_variance
  };

  if (data.rc_channels && data.rc_channels.length > 0) {
    s.rcChannels = data.rc_channels;
  }

  if (data.lat && data.lon && (data.lat !== 0 || data.lon !== 0)) {
    s.droneLat = data.lat;
    s.droneLng = data.lon;
    if (window.droneMapMarker) window.droneMapMarker.setLatLng([data.lat, data.lon]);
    if (window.overviewDroneMarker) window.overviewDroneMarker.setLatLng([data.lat, data.lon]);
    if (window.updateMapDroneLocation) window.updateMapDroneLocation(data.lat, data.lon, s);
  }

  s.packetsReceived = data.packets_received || (s.packetsReceived + 1);

  updateHardwareBadge(data.connected, data.status_message);
  updateCommonTelemetryDisplays();

  if (window.onTelemetryTick) window.onTelemetryTick(s);
  if (window.onFCTick) window.onFCTick(s);
}

// Truthful Hardware Link & Connection Status Badge
function updateHardwareBadge(isConnected, customMsg) {
  const badge = document.getElementById('hardware-connection-badge');
  if (!badge) return;

  const s = window.bhoomiState;

  if (s.simulationRunning) {
    badge.innerHTML = `
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
      </span>
      <span class="font-mono text-xs text-cyan-300 font-bold tracking-tight">
        ⚡ SIMULATION (DEMO)
      </span>
    `;
    badge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/30 shrink-0";
    return;
  }

  if (isConnected || s.hardwareConnected) {
    const isRadio = s.comPort === 'COM5';
    const msg = customMsg || (isRadio ? '● COM5 TELEMETRY (10Hz)' : '● USB DIRECT (115200)');
    const isStale = s.connectionStatus === 'STALE';

    const dotColor = isStale ? 'bg-amber-400' : 'bg-emerald-400';
    const textColor = isStale ? 'text-amber-300' : 'text-emerald-300';
    const border = isStale ? 'border-amber-500/30' : 'border-emerald-500/30';
    const bg = isStale ? 'bg-amber-950/40' : 'bg-emerald-950/40';

    badge.innerHTML = `
      <span class="relative flex h-2 w-2">
        <span class="relative inline-flex rounded-full h-2 w-2 ${dotColor}"></span>
      </span>
      <span class="font-mono text-xs ${textColor} font-bold tracking-tight">
        ${msg}
      </span>
    `;
    badge.className = `flex items-center gap-1.5 px-2.5 py-1 rounded ${bg} border ${border} shrink-0`;
    return;
  }

  // Disconnected / Offline State
  badge.innerHTML = `
    <span class="relative flex h-2 w-2">
      <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
    </span>
    <span class="font-mono text-xs text-rose-400 font-bold tracking-tight">
      ○ DISCONNECTED (NO LINK)
    </span>
  `;
  badge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/30 border border-rose-500/25 shrink-0";
}

// Update Top Header & Shared Telemetry Elements Truthfully
function updateCommonTelemetryDisplays() {
  const s = window.bhoomiState;

  const imuTempEl = document.getElementById('imu-temp');
  if (imuTempEl) {
    imuTempEl.textContent = s.imuTemp !== null ? `${s.imuTemp}°C` : '--°C';
  }

  const busVoltEl = document.getElementById('bus-volt');
  if (busVoltEl) {
    busVoltEl.textContent = s.batteryVoltage ? `${s.batteryVoltage.toFixed(1)}V (${s.batteryPercent}%)` : `BATTERY --`;
  }

  const satEl = document.getElementById('telem-rtk-sats');
  if (satEl) {
    satEl.textContent = s.satellites > 0 ? `${s.satellites} SATS (${s.gpsFix})` : `0 SATS (NO FIX)`;
  }

  const modeBadge = document.getElementById('hdr-flight-mode-badge');
  if (modeBadge) {
    modeBadge.textContent = s.flightMode;
    if (s.flightMode === 'AUTO SURVEY') {
      modeBadge.className = "font-mono text-xs text-cyan-400 font-bold";
    } else if (s.flightMode === 'RTL' || s.flightMode === 'LAND') {
      modeBadge.className = "font-mono text-xs text-amber-400 font-bold";
    } else {
      modeBadge.className = "font-mono text-xs text-slate-300 font-bold";
    }
  }

  if (window.updateOverviewHud) window.updateOverviewHud(s);
}

// Global DOM Ready Initialization & Mobile Sidebar Handling
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('aside');
  const toggleBtn = document.getElementById('sidebar-toggle');

  function openSidebar() {
    if (sidebar) {
      sidebar.classList.remove('hidden');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    }
  }
  function closeSidebar() {
    if (sidebar) {
      sidebar.classList.add('hidden');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    }
  }

  // Sidebar toggle button handler
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (sidebar && sidebar.classList.contains('hidden')) {
        openSidebar();
      } else {
        closeSidebar();
      }
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (sidebar && !sidebar.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
      if (window.innerWidth < 1024) {
        closeSidebar();
      }
    }
  });

  // Close sidebar on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (window.innerWidth < 1024) closeSidebar();
    }
  });

  // Navigation links: navigate and close sidebar on mobile
  document.querySelectorAll('#sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const path = link.getAttribute('data-path');
      if (path) {
        window.navigateTo(path);
        if (window.innerWidth < 1024) closeSidebar();
      }
    });
  });

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== window.bhoomiState.activeView) {
      window.navigateTo(hash);
    }
  });

  // Header Port Switcher
  const portSelect = document.getElementById('hdr-port-selector');
  if (portSelect) {
    portSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      const baud = selected === 'COM5' ? 57600 : 115200;
      window.switchMavlinkPort(selected, baud);
    });
  }

  // Connection tab switching
  document.querySelectorAll('.conn-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const text = tab.textContent.toUpperCase();
      if (text.includes('TELEMETRY')) {
        window.switchMavlinkPort('COM5', 57600);
      } else if (text.includes('USB')) {
        window.switchMavlinkPort('COM8', 115200);
      }
    });
  });

  const initialHash = window.location.hash.replace('#', '') || 'overview';
  window.navigateTo(initialHash);

  initWebSocket();
  startTelemetryHeartbeat();
  setInterval(refreshAvailablePorts, 5000);
});
