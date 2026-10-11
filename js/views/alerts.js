/**
 * View 07: Alerts & System Events
 * Real-time MAVLink STATUSTEXT event feed & Failsafe History
 */

const alertsLog = [
  { time: "14:11:42", level: "WARN", msg: "Compass 2 slight magnetic interference offset (+18 µT) - within tolerance", id: "EVT-402" },
  { time: "14:10:05", level: "WARN", msg: "Telemetry RF buffer peak 74% during high waypoint sync", id: "EVT-401" },
  { time: "14:08:22", level: "INFO", msg: "RTK Carrier Phase Locked - 26 Satellites Fixed", id: "EVT-400" },
  { time: "14:05:18", level: "INFO", msg: "Camera Sony a7R IV hotshoe trigger test successful (EXIF Geotag synced)", id: "EVT-399" },
  { time: "14:02:11", level: "INFO", msg: "DGCA Green Zone Digital Sky Permission Token Validated (Permit #IN-DGCA-9042)", id: "EVT-398" },
  { time: "14:00:02", level: "INFO", msg: "Pixhawk 6X Autopilot booted. EKF3 lanes 1-3 active and synchronized.", id: "EVT-397" }
];

window.filterAlerts = function(level) {
  const container = document.getElementById('alerts-feed-container');
  if (!container) return;

  const filtered = level === 'ALL' ? alertsLog : alertsLog.filter(a => a.level === level);

  container.innerHTML = filtered.map(a => {
    const isWarn = a.level === 'WARN';
    const isCrit = a.level === 'CRITICAL';
    const badgeBg = isCrit ? 'bg-error-container text-on-error-container' : (isWarn ? 'bg-error-container/20 text-error' : 'bg-primary-container/20 text-primary');
    
    return `
      <div class="p-3 rounded bg-surface-container-lowest border-l-4 ${isWarn ? 'border-error' : 'border-primary'} flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <span class="font-data-sm text-outline mt-0.5">${a.time}</span>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-label-caps text-[10px] px-1.5 py-0.5 rounded font-bold ${badgeBg}">${a.level}</span>
              <span class="font-data-sm text-outline font-semibold">${a.id}</span>
            </div>
            <p class="font-body-md text-on-surface mt-1">${a.msg}</p>
          </div>
        </div>
        <button onclick="window.acknowledgeAlert('${a.id}')" class="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface font-label-caps text-[10px]">
          ACK
        </button>
      </div>
    `;
  }).join('');
};

window.acknowledgeAlert = function(id) {
  window.showNotification(`Alert ${id} acknowledged`);
};

window.clearAlerts = function() {
  window.showNotification("Cleared local event display buffer");
};
