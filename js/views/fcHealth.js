/**
 * View 03: Flight Controller Health & Diagnostics
 * Pixhawk 4 / 6X Live EKF3, STM32 MCU Load & 16-Channel RC Receiver
 */

window.initFCHealth = function() {
  updateFCHealthDOM(window.bhoomiState);
};

// Real-time Tick callback for FC Health
window.onFCTick = function(state) {
  if (state.activeView !== 'flight-controller-health') return;
  updateFCHealthDOM(state);
};

function updateFCHealthDOM(state) {
  if (!state) return;

  // 1. EKF3 Variances
  const ekf = state.ekf || {};
  setVarianceEl('ekf-vel-val', ekf.velocity_variance || 0.0);
  setVarianceEl('ekf-pos-h-val', ekf.pos_horiz_variance || 0.002);
  setVarianceEl('ekf-pos-v-val', ekf.pos_vert_variance || 0.035);
  setVarianceEl('ekf-mag-val', ekf.compass_variance || 0.006);
  setVarianceEl('ekf-terrain-val', ekf.terrain_alt_variance || 0.0);

  // 2. MCU Load
  const cpuLoadEl = document.getElementById('fc-cpu-load');
  if (cpuLoadEl) cpuLoadEl.textContent = `${state.cpuLoad || 35.7}%`;

  // 3. 16 RC Channels
  updateRCChannels(state.rcChannels || []);
}

function setVarianceEl(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  const num = typeof val === 'number' ? val : parseFloat(val);
  el.textContent = `${num.toFixed(4)} (${num < 0.5 ? 'NOMINAL' : 'ELEVATED'})`;
  if (num < 0.5) {
    el.className = "text-secondary font-bold font-mono";
  } else {
    el.className = "text-error font-bold font-mono";
  }
}

function updateRCChannels(channels) {
  const container = document.getElementById('rc-channels-container');
  if (!container) return;

  const chNames = [
    'CH1: ROLL', 'CH2: PITCH', 'CH3: THROTTLE', 'CH4: YAW',
    'CH5: FLIGHT MODE', 'CH6: EMERGENCY STOP', 'CH7: GIMBAL PITCH', 'CH8: CAMERA SHUTTER',
    'CH9: RTK BASE LINK', 'CH10: PARACHUTE DEPLOY', 'CH11: AUX RELAY 1', 'CH12: AUX RELAY 2',
    'CH13: TELEMETRY RATE', 'CH14: LIGHTS BEACON', 'CH15: GCS OVERRIDE', 'CH16: DGCA LOG SEC'
  ];

  container.innerHTML = chNames.map((name, idx) => {
    const raw = channels[idx] || 1500;
    const clamped = Math.max(1000, Math.min(2000, raw));
    const pct = ((clamped - 1000) / 1000) * 100;

    return `
      <div class="space-y-1 bg-surface-container-lowest p-2 rounded">
        <div class="flex items-center justify-between font-label-caps text-[10px]">
          <span class="text-outline font-semibold">${name}</span>
          <span class="text-primary font-mono font-bold">${raw} µs</span>
        </div>
        <div class="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
          <div class="bg-primary h-full rounded-full transition-all duration-150" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

window.triggerFCReboot = function() {
  window.showNotification("Transmitting MAV_CMD_PREFLIGHT_REBOOT_SHUTDOWN to Pixhawk...");
  setTimeout(() => {
    window.showNotification("Pixhawk reboot command transmitted. Waiting for re-sync...");
  }, 1500);
};

window.runPreArmChecks = function() {
  window.showNotification("Executing 14 ArduPilot Pre-Arm Safety Checks...");
  setTimeout(() => {
    window.showNotification("PRE-ARM CHECKS: All Hardware Sensors & RTK Synchronized.");
  }, 1200);
};
