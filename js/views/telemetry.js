/**
 * View 02: Drone Telemetry & Sensors - Aerospace Instrumentation Console
 * Chart.js Real-time Telemetry with Truthful Operational States & No Memory Leaks
 */

let altSpeedChart = null;
let batteryChart = null;
let vibrationChart = null;
const telemetryHistoryMax = 20;

window.initTelemetryCharts = function() {
  const altSpeedCanvas = document.getElementById('chart-alt-speed');
  const batteryCanvas = document.getElementById('chart-battery');
  const vibrationCanvas = document.getElementById('chart-vibration');

  if (!altSpeedCanvas || !batteryCanvas || !vibrationCanvas) return;

  if (altSpeedChart) {
    altSpeedChart.destroy();
    altSpeedChart = null;
  }
  if (batteryChart) {
    batteryChart.destroy();
    batteryChart = null;
  }
  if (vibrationChart) {
    vibrationChart.destroy();
    vibrationChart = null;
  }

  const labels = Array.from({ length: telemetryHistoryMax }, (_, i) => `-${telemetryHistoryMax - i}s`);
  const s = window.bhoomiState;

  // Chart 1: Altitude (AGL) & Groundspeed (Cyan & Emerald)
  altSpeedChart = new Chart(altSpeedCanvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Altitude AGL (m)',
          data: Array(telemetryHistoryMax).fill(s.altitudeAGL !== null ? s.altitudeAGL : 0.0),
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.12)',
          borderWidth: 2,
          tension: 0.2,
          fill: true
        },
        {
          label: 'Groundspeed (m/s)',
          data: Array(telemetryHistoryMax).fill(s.groundSpeed !== null ? s.groundSpeed : 0.0),
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } }
      },
      plugins: {
        legend: { labels: { color: '#f4f4f5', font: { family: 'Inter', size: 10 } } }
      }
    }
  });

  // Chart 2: Battery Voltage & Current Draw (Amber & Rose)
  batteryChart = new Chart(batteryCanvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Battery (V)',
          data: Array(telemetryHistoryMax).fill(s.batteryVoltage !== null ? s.batteryVoltage : 0.0),
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2,
          yAxisID: 'y'
        },
        {
          label: 'Current (A)',
          data: Array(telemetryHistoryMax).fill(s.batteryCurrent !== null ? s.batteryCurrent : 0.0),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          fill: true,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } },
        y: { position: 'left', grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#f59e0b', font: { family: 'JetBrains Mono', size: 9 } } },
        y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#ef4444', font: { family: 'JetBrains Mono', size: 9 } } }
      },
      plugins: {
        legend: { labels: { color: '#f4f4f5', font: { family: 'Inter', size: 10 } } }
      }
    }
  });

  // Chart 3: Vibration FFT
  vibrationChart = new Chart(vibrationCanvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Vib X (m/s²)',
          data: Array(telemetryHistoryMax).fill(s.vibrationX !== null ? s.vibrationX : 0.0),
          borderColor: '#0ea5e9',
          borderWidth: 1.5,
          tension: 0.1
        },
        {
          label: 'Vib Y (m/s²)',
          data: Array(telemetryHistoryMax).fill(s.vibrationY !== null ? s.vibrationY : 0.0),
          borderColor: '#10b981',
          borderWidth: 1.5,
          tension: 0.1
        },
        {
          label: 'Vib Z (m/s²)',
          data: Array(telemetryHistoryMax).fill(s.vibrationZ !== null ? s.vibrationZ : 0.0),
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } },
        y: { min: 0, max: 2, grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } }
      },
      plugins: {
        legend: { labels: { color: '#f4f4f5', font: { family: 'Inter', size: 10 } } }
      }
    }
  });
};

window.onTelemetryTick = function(state) {
  if (altSpeedChart && state.activeView === 'drone-telemetry') {
    const shiftPush = (chart, dsIdx, val) => {
      chart.data.datasets[dsIdx].data.shift();
      chart.data.datasets[dsIdx].data.push(val !== null ? val : 0.0);
    };

    shiftPush(altSpeedChart, 0, state.altitudeAGL !== null ? state.altitudeAGL : 0.0);
    shiftPush(altSpeedChart, 1, state.groundSpeed !== null ? state.groundSpeed : 0.0);
    altSpeedChart.update('none');

    if (batteryChart) {
      shiftPush(batteryChart, 0, state.batteryVoltage !== null ? state.batteryVoltage : 0.0);
      shiftPush(batteryChart, 1, state.batteryCurrent !== null ? state.batteryCurrent : 0.0);
      batteryChart.update('none');
    }

    if (vibrationChart) {
      shiftPush(vibrationChart, 0, state.vibrationX !== null ? state.vibrationX : 0.0);
      shiftPush(vibrationChart, 1, state.vibrationY !== null ? state.vibrationY : 0.0);
      shiftPush(vibrationChart, 2, state.vibrationZ !== null ? state.vibrationZ : 0.0);
      vibrationChart.update('none');
    }
  }

  // Update Telemetry metric text displays truthfully
  const aglText = document.getElementById('telem-agl-val');
  if (aglText) aglText.textContent = state.altitudeAGL !== null ? `${state.altitudeAGL.toFixed(1)} m` : `-- m`;

  const gsText = document.getElementById('telem-gs-val');
  if (gsText) gsText.textContent = state.groundSpeed !== null ? `${state.groundSpeed.toFixed(1)} m/s` : `-- m/s`;

  const asText = document.getElementById('telem-as-val');
  if (asText) asText.textContent = state.airSpeed !== null ? `${state.airSpeed.toFixed(1)} m/s` : `-- m/s`;

  const climbText = document.getElementById('telem-climb-val');
  if (climbText) {
    if (state.climbRate !== null) {
      climbText.textContent = `${state.climbRate >= 0 ? '+' : ''}${state.climbRate.toFixed(2)} m/s`;
    } else {
      climbText.textContent = `-- m/s`;
    }
  }

  const throttleText = document.getElementById('telem-throttle-val');
  if (throttleText) throttleText.textContent = `${state.throttle || 0}%`;

  const rtkText = document.getElementById('telem-rtk-sats');
  if (rtkText) {
    if (state.satellites > 0) {
      rtkText.textContent = `${state.satellites} SATS (${state.gpsFix})`;
      rtkText.className = "px-2 py-1 rounded bg-surface-container text-emerald-400 font-semibold";
    } else {
      rtkText.textContent = `0 SATS (NO FIX)`;
      rtkText.className = "px-2 py-1 rounded bg-surface-container text-rose-400 font-semibold";
    }
  }

  if (window.onFCTick) {
    window.onFCTick(state);
  }
};
