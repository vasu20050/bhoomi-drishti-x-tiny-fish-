/**
 * Bhoomi Drishti x TinyFish Agent & AI/ML Intelligence Console (View 09)
 * Real-Time Autonomous Browser Agent SSE Stream, Telemetry ML Diagnostics,
 * Cadastral SVAMITVA Scout & Voice Copilot.
 */

window.tinyfishState = {
  isStreaming: false,
  eventSource: null,
  activeSubTab: 'agent-terminal', // 'agent-terminal', 'ml-diagnostics', 'cadastral-scout', 'copilot-chat'
  voiceEnabled: true,
  lastDiagnostics: null,
  chatHistory: []
};

// Initialize TinyFish View
window.initTinyFishAgent = async function() {
  await refreshTinyFishStatus();
  await loadMLDiagnostics();
  setupAgentEventListeners();
};

// Refresh Status from Backend
async function refreshTinyFishStatus() {
  try {
    const res = await fetch('/api/tinyfish/status');
    const data = await res.json();
    const badge = document.getElementById('tinyfish-status-pill');
    const modeDesc = document.getElementById('tinyfish-mode-desc');
    if (badge) {
      if (data.has_tinyfish_key) {
        badge.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> LIVE API ACTIVE (v${data.version})`;
        badge.className = "px-2 py-0.5 rounded text-[10px] font-label-caps bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1.5";
      } else {
        badge.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-secondary"></span> SMART SIMULATION (v${data.version})`;
        badge.className = "px-2 py-0.5 rounded text-[10px] font-label-caps bg-secondary/15 border border-secondary/30 text-secondary font-bold flex items-center gap-1.5";
      }
    }
    if (modeDesc) {
      modeDesc.textContent = data.has_tinyfish_key 
        ? "Connected to TinyFish Cloud Agents (@tiny-fish/sdk)"
        : "Autonomous Offline Simulator (Provide TINYFISH_API_KEY in Settings for Cloud API)";
    }
  } catch (err) {
    console.error("TinyFish status error:", err);
  }
}

// Switch Sub-tabs inside View 09
window.switchTinyFishTab = function(tabName) {
  window.tinyfishState.activeSubTab = tabName;
  
  // Tab buttons
  document.querySelectorAll('.tf-subtab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.className = "tf-subtab-btn px-3 py-1.5 rounded bg-primary text-on-primary font-label-caps text-xs font-bold transition-all shadow-md";
    } else {
      btn.className = "tf-subtab-btn px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-caps text-xs transition-all";
    }
  });

  // Tab panes
  ['agent-terminal', 'ml-diagnostics', 'cadastral-scout', 'copilot-chat'].forEach(p => {
    const pane = document.getElementById(`tf-pane-${p}`);
    if (pane) {
      if (p === tabName) pane.classList.remove('hidden');
      else pane.classList.add('hidden');
    }
  });

  if (tabName === 'ml-diagnostics') loadMLDiagnostics();
};

// ==============================================================================
// 1. AUTONOMOUS AGENT TERMINAL (SSE STREAMING)
// ==============================================================================

window.runTinyFishAgent = async function(presetGoal = null) {
  const goalInput = document.getElementById('tf-agent-goal-input');
  const goal = presetGoal || (goalInput ? goalInput.value.trim() : '');
  if (!goal) {
    window.showNotification("Please specify an agent goal", true);
    return;
  }
  if (goalInput && presetGoal) goalInput.value = presetGoal;

  const terminal = document.getElementById('tf-agent-terminal-logs');
  const statusEl = document.getElementById('tf-agent-exec-status');
  const runBtn = document.getElementById('tf-agent-run-btn');
  const resultCard = document.getElementById('tf-agent-result-card');
  const resultJson = document.getElementById('tf-agent-result-json');

  if (terminal) terminal.innerHTML = '';
  if (resultCard) resultCard.classList.add('hidden');
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> DISPATCHING...`;
  }
  if (statusEl) {
    statusEl.textContent = "RUNNING AGENT...";
    statusEl.className = "px-2 py-0.5 rounded text-[10px] font-label-caps bg-secondary/15 text-secondary font-bold";
  }

  appendTerminalLog(`[SYSTEM] Initializing TinyFish Agent execution...`, 'text-outline');
  appendTerminalLog(`[GOAL] "${goal}"`, 'text-secondary font-bold');

  window.bhoomiAudio.beep(880, 0.08);

  try {
    const response = await fetch('/api/tinyfish/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: goal })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // Keep last partial chunk

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.substring(6));
            handleAgentStreamEvent(event);
          } catch (pe) {
            console.error("SSE parse error:", pe);
          }
        }
      }
    }

    if (runBtn) {
      runBtn.disabled = false;
      runBtn.innerHTML = `<span class="material-symbols-outlined text-sm">rocket_launch</span> DISPATCH AGENT`;
    }
    if (statusEl) {
      statusEl.textContent = "COMPLETED";
      statusEl.className = "px-2 py-0.5 rounded text-[10px] font-label-caps bg-emerald-500/15 text-emerald-400 font-bold";
    }
    window.bhoomiAudio.alertSuccess();
    window.showNotification("TinyFish Agent task finished!");
  } catch (err) {
    console.error("Agent execution error:", err);
    appendTerminalLog(`[ERROR] Agent execution failed: ${err.message}`, 'text-error font-bold');
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.innerHTML = `<span class="material-symbols-outlined text-sm">rocket_launch</span> DISPATCH AGENT`;
    }
    if (statusEl) {
      statusEl.textContent = "FAILED";
      statusEl.className = "px-2 py-0.5 rounded text-[10px] font-label-caps bg-error/15 text-error font-bold";
    }
  }
};

function handleAgentStreamEvent(event) {
  if (event.type === 'started') {
    appendTerminalLog(`[STARTED] Target Host: ${event.url}`, 'text-primary');
  } else if (event.type === 'progress') {
    const actionTag = event.action ? `[${event.action}]` : `[STEP]`;
    appendTerminalLog(`${actionTag} ${event.message}`, 'text-on-surface');
  } else if (event.type === 'warning') {
    appendTerminalLog(`[WARN] ${event.message}`, 'text-secondary');
  } else if (event.type === 'complete') {
    appendTerminalLog(`[SUCCESS] Autonomous task completed with status: ${event.status}`, 'text-emerald-400 font-bold');
    if (event.result) {
      renderAgentResult(event.result);
    }
  }
}

function appendTerminalLog(text, cssClass = 'text-on-surface') {
  const terminal = document.getElementById('tf-agent-terminal-logs');
  if (!terminal) return;
  const line = document.createElement('div');
  line.className = `py-0.5 font-data-sm text-xs font-mono leading-relaxed ${cssClass}`;
  const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
  line.innerHTML = `<span class="text-outline-variant mr-2 select-none">${timeStr}</span> ${text}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function renderAgentResult(result) {
  const resultCard = document.getElementById('tf-agent-result-card');
  const resultJson = document.getElementById('tf-agent-result-json');
  const resultVerdict = document.getElementById('tf-agent-result-verdict');
  const resultSummary = document.getElementById('tf-agent-result-summary');

  if (resultCard) resultCard.classList.remove('hidden');
  if (resultVerdict) {
    resultVerdict.textContent = result.verdict || "APPROVED_NOMINAL";
    resultVerdict.className = "font-label-caps text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
  }
  if (resultSummary) {
    resultSummary.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
        <div class="p-2 rounded bg-surface-container border border-surface-container-high/60">
          <span class="font-label-caps text-[10px] text-outline">AIRSPACE CLEARANCE:</span>
          <div class="font-data-md text-xs font-bold text-primary">${result.airspace_class || 'Green Zone (Class G)'}</div>
        </div>
        <div class="p-2 rounded bg-surface-container border border-surface-container-high/60">
          <span class="font-label-caps text-[10px] text-outline">WEATHER CONDITIONS:</span>
          <div class="font-data-md text-xs font-bold text-on-surface">${result.weather_summary || 'Optimal (Wind 3.1 m/s)'}</div>
        </div>
        <div class="p-2 rounded bg-surface-container border border-surface-container-high/60">
          <span class="font-label-caps text-[10px] text-outline">AI SAFETY INDEX:</span>
          <div class="font-data-md text-xs font-bold text-secondary">${result.safety_index || '96.4'}% (CLEAR)</div>
        </div>
      </div>
    `;
  }
  if (resultJson) {
    resultJson.textContent = JSON.stringify(result, null, 2);
  }
}

// ==============================================================================
// 2. AI/ML TELEMETRY ANOMALY DIAGNOSTICS
// ==============================================================================

window.loadMLDiagnostics = async function() {
  try {
    const res = await fetch('/api/aiml/diagnostics');
    const data = await res.json();
    window.tinyfishState.lastDiagnostics = data;
    renderMLDiagnosticsUI(data);
  } catch (err) {
    console.error("ML diagnostics error:", err);
  }
};

function renderMLDiagnosticsUI(data) {
  const scoreEl = document.getElementById('ml-composite-score');
  const verdictEl = document.getElementById('ml-verdict-badge');
  const recEl = document.getElementById('ml-recommendation-text');

  if (scoreEl) scoreEl.textContent = `${data.composite_safety_score}%`;
  if (verdictEl) {
    verdictEl.textContent = data.health_verdict;
    verdictEl.className = data.composite_safety_score >= 85
      ? "px-2 py-0.5 rounded text-[11px] font-label-caps bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold"
      : "px-2 py-0.5 rounded text-[11px] font-label-caps bg-secondary/15 border border-secondary/30 text-secondary font-bold";
  }
  if (recEl) recEl.textContent = data.ai_recommendation;

  // Vibration
  const vibStatus = document.getElementById('ml-vib-status');
  const vibMag = document.getElementById('ml-vib-mag');
  const vibClip = document.getElementById('ml-vib-clip');
  if (vibStatus) vibStatus.textContent = data.vibration.status;
  if (vibMag) vibMag.textContent = `${data.vibration.magnitude} RMS`;
  if (vibClip) vibClip.textContent = `${data.vibration.clipping} clips`;

  // Battery
  const batVolts = document.getElementById('ml-bat-volts');
  const batMins = document.getElementById('ml-bat-mins');
  const batRes = document.getElementById('ml-bat-res');
  if (batVolts) batVolts.textContent = `${data.battery.voltage}V`;
  if (batMins) batMins.textContent = `~${data.battery.est_flight_remaining_min} min`;
  if (batRes) batRes.textContent = `${data.battery.est_internal_resistance_ohm} Ω`;

  // EKF & GPS
  const ekfStatus = document.getElementById('ml-ekf-status');
  const ekfVar = document.getElementById('ml-ekf-var');
  const gpsStatus = document.getElementById('ml-gps-status');
  const gpsSats = document.getElementById('ml-gps-sats');
  if (ekfStatus) ekfStatus.textContent = data.ekf.status;
  if (ekfVar) ekfVar.textContent = `${data.ekf.max_variance}`;
  if (gpsStatus) gpsStatus.textContent = data.gps.fix_type_desc;
  if (gpsSats) gpsSats.textContent = `${data.gps.satellites} sats (HDOP ${data.gps.hdop})`;
}

// ==============================================================================
// 3. CADASTRAL & SVAMITVA LAND SCOUT
// ==============================================================================

window.runCadastralScout = async function() {
  const parcelInput = document.getElementById('cs-parcel-id-input');
  const parcelId = parcelInput ? parcelInput.value.trim() : 'SVAMITVA-KH-402/1';
  const scoutBtn = document.getElementById('cs-scout-btn');
  const resultsBox = document.getElementById('cs-results-container');

  if (scoutBtn) {
    scoutBtn.disabled = true;
    scoutBtn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> SCOUTING...`;
  }

  try {
    const lat = window.bhoomiState.droneLat || 28.4701886;
    const lon = window.bhoomiState.droneLng || 77.4941820;

    const res = await fetch('/api/aiml/cadastral-scout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parcel_id: parcelId, lat: lat, lon: lon })
    });
    const data = await res.json();
    renderCadastralScoutResults(data);
    window.showNotification(`Cadastral parcel ${data.parcel_id} authenticated!`);
  } catch (err) {
    console.error("Cadastral scout error:", err);
    window.showNotification("Scout query error", true);
  } finally {
    if (scoutBtn) {
      scoutBtn.disabled = false;
      scoutBtn.innerHTML = `<span class="material-symbols-outlined text-sm">search</span> QUERY CADASTRAL REGISTRY`;
    }
  }
};

function renderCadastralScoutResults(data) {
  const container = document.getElementById('cs-results-container');
  if (!container) return;
  container.classList.remove('hidden');

  document.getElementById('cs-res-parcel-id').textContent = data.parcel_id;
  document.getElementById('cs-res-village').textContent = `${data.village_name}, ${data.district}`;
  document.getElementById('cs-res-area').textContent = `${data.area_hectares} Ha (${data.total_sub_parcels} Sub-parcels)`;
  document.getElementById('cs-res-alt').textContent = `${data.recommended_flight_alt_agl}m AGL`;
  document.getElementById('cs-res-gsd').textContent = `${data.required_gsd_cm_px} cm/pixel`;

  const sourcesList = document.getElementById('cs-res-sources');
  if (sourcesList && data.intelligence_sources) {
    sourcesList.innerHTML = data.intelligence_sources.map(s => `
      <div class="p-2 rounded bg-surface-container border border-surface-container-high/40 text-xs">
        <div class="font-bold text-primary flex items-center justify-between">
          <span class="truncate">${s.title}</span>
          <span class="font-label-caps text-[9px] text-secondary">${s.source}</span>
        </div>
        <p class="text-on-surface-variant text-[11px] mt-1">${s.snippet}</p>
        <a href="${s.url}" target="_blank" class="text-secondary hover:underline text-[10px] mt-1 inline-block truncate max-w-full">${s.url}</a>
      </div>
    `).join('');
  }
}

// ==============================================================================
// 4. AI DRONE COPILOT CHAT & VOICE ASSISTANT
// ==============================================================================

window.sendCopilotMessage = async function(prefilled = null) {
  const input = document.getElementById('copilot-chat-input');
  const msg = prefilled || (input ? input.value.trim() : '');
  if (!msg) return;
  if (input && !prefilled) input.value = '';

  appendChatMessage('user', msg);
  const sendBtn = document.getElementById('copilot-send-btn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await fetch('/api/aiml/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: window.tinyfishState.chatHistory })
    });
    const data = await res.json();
    appendChatMessage('assistant', data.reply);
    window.tinyfishState.chatHistory.push({ role: 'user', content: msg });
    window.tinyfishState.chatHistory.push({ role: 'assistant', content: data.reply });

    if (window.tinyfishState.voiceEnabled) {
      speakCopilotReply(data.reply);
    }
  } catch (err) {
    console.error("Copilot chat error:", err);
    appendChatMessage('assistant', "⚠️ Error reaching AI Copilot service. Check connection to bridge server.");
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
};

function appendChatMessage(role, text) {
  const chatBody = document.getElementById('copilot-chat-messages');
  if (!chatBody) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = role === 'user'
    ? "flex justify-end mb-3"
    : "flex justify-start mb-3";

  // Simple markdown renderer for bold and lists
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-surface-container font-mono text-[11px] text-primary">$1</code>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n- /g, '<br>• ');

  msgDiv.innerHTML = `
    <div class="max-w-[85%] p-3 rounded-lg text-xs leading-relaxed ${
      role === 'user'
        ? "bg-primary text-on-primary font-medium rounded-br-none shadow-md"
        : "bg-surface-container-high border border-white/[0.08] text-on-surface rounded-bl-none shadow-md"
    }">
      <div class="flex items-center gap-1.5 font-label-caps text-[9px] mb-1 ${role === 'user' ? 'text-on-primary/70' : 'text-secondary'}">
        <span class="material-symbols-outlined text-xs">${role === 'user' ? 'person' : 'smart_toy'}</span>
        <span>${role === 'user' ? 'PILOT IN COMMAND' : 'BHOOMI COPILOT (TINYFISH)'}</span>
      </div>
      <div>${formatted}</div>
    </div>
  `;
  chatBody.appendChild(msgDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Voice Speech Synthesis
function speakCopilotReply(fullText) {
  if (!('speechSynthesis' in window)) return;
  try {
    // Strip markdown formatting for speech
    const cleanSpeech = fullText
      .replace(/[*#`_]/g, '')
      .split('\n\n')[0]; // Speak just the lead summary to avoid excessive speech
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {}
}

window.toggleCopilotVoice = function() {
  window.tinyfishState.voiceEnabled = !window.tinyfishState.voiceEnabled;
  const btn = document.getElementById('copilot-voice-toggle-btn');
  if (btn) {
    btn.innerHTML = window.tinyfishState.voiceEnabled
      ? `<span class="material-symbols-outlined text-xs text-secondary">volume_up</span> VOICE ON`
      : `<span class="material-symbols-outlined text-xs text-outline">volume_off</span> VOICE MUTED`;
  }
  window.showNotification(window.tinyfishState.voiceEnabled ? "Copilot Voice Enabled" : "Copilot Voice Muted");
};

function setupAgentEventListeners() {
  const goalInput = document.getElementById('tf-agent-goal-input');
  if (goalInput) {
    goalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window.runTinyFishAgent();
    });
  }
  const chatInput = document.getElementById('copilot-chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window.sendCopilotMessage();
    });
  }
}
