/**
 * View 06: Survey History & Mission Logs
 * Cadastral Survey Records, SVAMITVA village archives, RINEX/BIN log downloads
 */

const surveyHistoryData = [
  {
    id: "SVAMITVA-2026-0912",
    date: "10 Oct 2026",
    village: "Rampur Khas",
    district: "Varanasi, UP",
    khasraCount: 38,
    areaHa: 42.6,
    photos: 384,
    gsd: "1.18 cm/px",
    status: "PROCESSED",
    binSize: "48.2 MB"
  },
  {
    id: "SVAMITVA-2026-0894",
    date: "08 Oct 2026",
    village: "Bhadaini Tola",
    district: "Varanasi, UP",
    khasraCount: 24,
    areaHa: 28.1,
    photos: 262,
    gsd: "1.22 cm/px",
    status: "PROCESSED",
    binSize: "32.6 MB"
  },
  {
    id: "SVAMITVA-2026-0841",
    date: "05 Oct 2026",
    village: "Shivpur Cadastre",
    district: "Mirzapur, UP",
    khasraCount: 52,
    areaHa: 68.4,
    photos: 512,
    gsd: "1.15 cm/px",
    status: "GEOPORTAL SYNCED",
    binSize: "74.8 MB"
  },
  {
    id: "SVAMITVA-2026-0790",
    date: "01 Oct 2026",
    village: "Chunar Riverbank",
    district: "Mirzapur, UP",
    khasraCount: 16,
    areaHa: 18.2,
    photos: 190,
    gsd: "1.25 cm/px",
    status: "ARCHIVED",
    binSize: "21.4 MB"
  }
];

window.downloadMissionLog = function(missionId) {
  window.showNotification(`Packaging ArduPilot DataFlash (.BIN) & RINEX GNSS log for ${missionId}...`);
  setTimeout(() => {
    const dummyText = `BHOOMI DRISHTI TELEMETRY LOG EXPORT\nMission: ${missionId}\nFormat: ArduPilot DataFlash Binary v4.5.1\nIntegrity: SHA-256 OK`;
    const blob = new Blob([dummyText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${missionId}_DATAFLASH.bin`;
    a.click();
    URL.revokeObjectURL(url);
    window.showNotification(`Downloaded ${missionId}_DATAFLASH.bin`);
  }, 800);
};

window.previewOrthomosaic = function(missionId) {
  const modal = document.getElementById('ortho-preview-modal');
  const title = document.getElementById('ortho-modal-title');
  if (modal && title) {
    title.textContent = `High-Resolution Orthomosaic (GSD 1.2cm) - ${missionId}`;
    modal.classList.remove('hidden');
    window.showNotification(`Loaded Orthomosaic preview for ${missionId}`);
  }
};

window.closeOrthoModal = function() {
  const modal = document.getElementById('ortho-preview-modal');
  if (modal) modal.classList.add('hidden');
};
