/**
 * View 08: Device Settings & Radio Bus Controller
 */

const eepromParamsList = [
  { name: "BATT_ARM_VOLT", value: "21.60", desc: "Minimum voltage to allow motor arming (6S LiPo)", group: "Battery" },
  { name: "BATT_LOW_VOLT", value: "21.20", desc: "Low voltage failsafe trigger to RTL", group: "Battery" },
  { name: "BATT_CRT_VOLT", value: "20.40", desc: "Critical battery voltage emergency land", group: "Battery" },
  { name: "FENCE_ALT_MAX", value: "120.0", desc: "DGCA India Digital Sky hard altitude ceiling (m)", group: "Geofence" },
  { name: "FENCE_RADIUS", value: "1500.0", desc: "Maximum horizontal boundary from home (m)", group: "Geofence" },
  { name: "FENCE_ACTION", value: "1 (RTL)", desc: "Action on geofence breach", group: "Geofence" },
  { name: "RTL_ALT", value: "6000", desc: "Return to Launch transit altitude in centimeters", group: "Navigation" },
  { name: "WP_SPEED", value: "8.0", desc: "Survey waypoint cruising speed in m/s", group: "Survey" },
  { name: "CAM_TRIGG_DIST", value: "14.2", desc: "Camera trigger distance for 80% front overlap (m)", group: "Camera" },
  { name: "SERIAL1_BAUD", value: "57", desc: "Telemetry 1 baudrate (57600 baud)", group: "Telemetry" },
  { name: "MOT_SPIN_ARM", value: "0.10", desc: "Motor idle spin speed on arming (10%)", group: "Motors" }
];

window.initSettingsView = function() {
  renderParamsTable(eepromParamsList);

  const searchInput = document.getElementById('param-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = eepromParamsList.filter(p => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.group.toLowerCase().includes(q));
      renderParamsTable(filtered);
    });
  }
};

function renderParamsTable(params) {
  const container = document.getElementById('params-table-body');
  if (!container) return;

  container.innerHTML = params.map(p => `
    <tr class="border-b border-surface-container/60 hover:bg-surface-container/40">
      <td class="p-2 font-mono text-primary font-semibold text-xs">${p.name}</td>
      <td class="p-2">
        <input type="text" value="${p.value}" class="bg-surface-container text-on-surface font-mono text-xs px-2 py-0.5 rounded w-24 outline-none border border-transparent focus:border-primary">
      </td>
      <td class="p-2 font-body-sm text-xs text-on-surface-variant">${p.desc}</td>
      <td class="p-2 font-label-caps text-[10px] text-outline">${p.group}</td>
    </tr>
  `).join('');
}
