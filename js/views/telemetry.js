/**
 * View 02: Drone Telemetry & Sensors - Aviation Yellow Theme
 * Chart.js Real-time Telemetry with Live MAVLink Pixhawk Feeds
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

  if (altSpeedChart) altSpeedChart.destroy();
  if (batteryChart) batteryChart.destroy();
  if (vibrationChart) vibrationChart.destroy();

  const labels = Array.from({ length: telemetryHistoryMax }, (_, i) => `-${telemetryHistoryMax - i}s`);

  // Chart 1: Altitude & Speed (Yellow Accent)
  altSpeedChart = new Chart(altSpeedCanvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Altitude MSL (m)',
          data: Array(telemetryHistoryMax).fill(window.bhoomiState.altitudeMSL || 0.0),
          borderColor: '#facc15',
          backgroundColor: 'rgba(250, 204, 21, 0.12)',
          borderWidth: 2,
          tension: 0.2,
          fill: true
        },
        {
          label: 'Groundspeed (m/s)',
          data: Array(telemetryHistoryMax).fill(window.bhoomiState.groundSpeed || 0.0),
          borderColor: '#4edea3',
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
        x: { grid: { color: '#161a24' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } },
        y: { grid: { color: '#161a24' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } }
      },
      plugins: {
        legend: { labels: { color: '#f1f5f9', font: { family: 'Inter', size: 10 } } }
      }
    }
  });

  // Chart 2: Battery & Current Draw
  batteryChart = new Chart(batteryCanvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Battery (V)',
          data: Array(telemetryHistoryMax).fill(window.bhoomiState.batteryVoltage || 24.6),
          borderColor: '#fbbf24',
          backgroundColor: 'transparent',
          borderWidth: 2,
          yAxisID: 'y'
        },
        {
          label: 'Current (A)',
          data: Array(telemetryHistoryMax).fill(window.bhoomiState.batteryCurrent || 0.0),
          borderColor: '#ffb4ab',
          backgroundColor: 'rgba(255, 180, 171, 0.1)',
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
        x: { grid: { color: '#161a24' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } },
        y: { position: 'left', grid: { color: '#161a24' }, ticks: { color: '#fbbf24', font: { family: 'JetBrains Mono', size: 9 } } },
        y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#ffb4ab', font: { family: 'JetBrains Mono', size: 9 } } }
      },
      plugins: {
        legend: { labels: { color: '#f1f5f9', font: { family: 'Inter', size: 10 } } }
      }
    }
  });

  // Chart 3: Vibration
  vibrationChart = new Chart(vibrationCanvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Vib X (m/s²)',
          data: Array(telemetryHistoryMax).fill(window.bhoomiState.vibrationX || 0.02),
          borderColor: '#facc15',
          borderWidth: 1.5,
          tension: 0.1
        },
        {
          label: 'Vib Y (m/s²)',
          data: Array(telemetryHistoryMax).fill(window.bhoomiState.vibrationY || 0.02),
          borderColor: '#4edea3',
          borderWidth: 1.5,
          tension: 0.1
        },
        {
          label: 'Vib Z (m/s²)',
          data: Array(telemetryHistoryMax).fill(window.bhoomiState.vibrationZ || 0.03),
          borderColor: '#fef08a',
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
        x: { grid: { color: '#161a24' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } },
        y: { min: 0, max: 2, grid: { color: '#161a24' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } }
      },
      plugins: {
        legend: { labels: { color: '#f1f5f9', font: { family: 'Inter', size: 10 } } }
      }
    }
  });
};

window.onTelemetryTick = function(state) {
  if (altSpeedChart && state.activeView === 'drone-telemetry') {
    const shiftPush = (chart, dsIdx, val) => {
      chart.data.datasets[dsIdx].data.shift();
      chart.data.datasets[dsIdx].data.push(val);
    };

    shiftPush(altSpeedChart, 0, state.altitudeMSL || state.altitudeAGL);
    shiftPush(altSpeedChart, 1, state.groundSpeed);
    altSpeedChart.update('none');

    if (batteryChart) {
      shiftPush(batteryChart, 0, state.batteryVoltage > 0 ? state.batteryVoltage : 24.6);
      shiftPush(batteryChart, 1, state.batteryCurrent);
      batteryChart.update('none');
    }

    if (vibrationChart) {
      shiftPush(vibrationChart, 0, state.vibrationX);
      shiftPush(vibrationChart, 1, state.vibrationY);
      shiftPush(vibrationChart, 2, state.vibrationZ);
      vibrationChart.update('none');
    }
  }

  const aglText = document.getElementById('telem-agl-val');
  if (aglText) aglText.textContent = `${state.altitudeMSL || state.altitudeAGL} m`;

  const gsText = document.getElementById('telem-gs-val');
  if (gsText) gsText.textContent = `${state.groundSpeed} m/s`;

  const asText = document.getElementById('telem-as-val');
  if (asText) asText.textContent = `${state.airSpeed} m/s`;

  const climbText = document.getElementById('telem-climb-val');
  if (climbText) climbText.textContent = `${state.climbRate >= 0 ? '+' : ''}${state.climbRate} m/s`;

  const throttleText = document.getElementById('telem-throttle-val');
  if (throttleText) throttleText.textContent = `${state.throttle}%`;

  const rtkText = document.getElementById('telem-rtk-sats');
  if (rtkText) rtkText.textContent = `${state.satellites} SATS (${state.gpsFix})`;

  if (window.onFCTick) {
    window.onFCTick(state);
  }
};
