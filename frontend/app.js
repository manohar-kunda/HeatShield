/**
 * HeatShield — Production Client Application
 * Zero dependencies, pure vanilla ES6, offline-first with background queue.
 */

const API_BASE = window.location.origin.includes('localhost')
  ? 'http://localhost:8085'
  : ''; // Same-origin on CloudFront (/api/*)

const TIER_METADATA = {
  BELOW_THRESHOLD: {
    title: 'Below Threshold / Not Rated',
    icon: 'ℹ️',
    cssClass: 'tier-below',
    desc: 'Conditions within normal operational tolerances. Routine surveillance.'
  },
  CAUTION: {
    title: 'Caution (Yellow Alert)',
    icon: '🟡',
    cssClass: 'tier-caution',
    desc: 'Fatigue possible with prolonged exposure. Activate shaded hydration kiosks.'
  },
  EXTREME_CAUTION: {
    title: 'Extreme Caution (Amber Alert)',
    icon: '🟠',
    cssClass: 'tier-extreme-caution',
    desc: 'Heat cramps and heat exhaustion possible. Mandatory shaded rest cycles for outdoor workers.'
  },
  DANGER: {
    title: 'Danger (Orange Alert)',
    icon: '🚨',
    cssClass: 'tier-danger',
    desc: 'Heat cramps or exhaustion likely, heatstroke possible. Open daytime cooling shelters.'
  },
  EXTREME_DANGER: {
    title: 'Extreme Danger (Red Alert)',
    icon: '🛑',
    cssClass: 'tier-extreme-danger',
    desc: 'Heatstroke imminent with continued exposure. Emergency hospital alert & mobile medical patrols.'
  }
};

let currentAssessment = null;
let currentFilter = 'ALL';

// DOM Elements
const wardSelect = document.getElementById('ward-select');
const fetchLiveBtn = document.getElementById('fetch-live-btn');
const toggleWhatifBtn = document.getElementById('toggle-whatif-btn');
const whatifForm = document.getElementById('whatif-form');
const resetSimBtn = document.getElementById('reset-sim-btn');
const networkBadge = document.getElementById('network-badge');
const dataSourceBadge = document.getElementById('datasource-badge');

const tierBanner = document.getElementById('tier-banner');
const tierIcon = document.getElementById('tier-icon');
const tierTitle = document.getElementById('tier-title');
const tierDesc = document.getElementById('tier-desc');
const hiShadeVal = document.getElementById('hi-shade-val');
const hiShadeF = document.getElementById('hi-shade-f');
const hiSunVal = document.getElementById('hi-sun-val');
const ambientConditions = document.getElementById('ambient-conditions');
const extrapolationBadge = document.getElementById('extrapolation-badge');
const imdSignalVal = document.getElementById('imd-signal-val');
const imdCriteriaDesc = document.getElementById('imd-criteria-desc');
const assessmentTimestamp = document.getElementById('assessment-timestamp');

const forecastSection = document.getElementById('forecast-section');
const forecastPeakBadge = document.getElementById('forecast-peak-badge');
const forecastSummaryText = document.getElementById('forecast-summary-text');
const timelineTrack = document.getElementById('timeline-track');
const tierHoursSummary = document.getElementById('tier-hours-summary');

const actionsList = document.getElementById('actions-list');
const progressLabel = document.getElementById('progress-label');
const progressBarFill = document.getElementById('progress-bar-fill');
const filterChips = document.querySelectorAll('.filter-chip');

const bulletinPreview = document.getElementById('bulletin-preview');
const copyWhatsappBtn = document.getElementById('copy-whatsapp-btn');
const printBulletinBtn = document.getElementById('print-bulletin-btn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  setupNetworkListeners();
  setupEventListeners();
  registerServiceWorker();
  fetchForecast(wardSelect.value, true);
});

// --- Network & Offline Queue ---
function setupNetworkListeners() {
  function updateOnlineStatus() {
    if (navigator.onLine) {
      networkBadge.textContent = '● Online';
      networkBadge.className = 'badge badge-online';
      flushOfflineQueue();
    } else {
      networkBadge.textContent = '○ Offline (Cached)';
      networkBadge.className = 'badge badge-offline';
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
}

function queueOfflineAction(wardId, actionId, status, note) {
  const queue = JSON.parse(localStorage.getItem('heatshield_offline_queue') || '[]');
  queue.push({ wardId, actionId, status, note, timestamp: Date.now() });
  localStorage.setItem('heatshield_offline_queue', JSON.stringify(queue));
  dataSourceBadge.textContent = `Queued (${queue.length})`;
}

async function flushOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem('heatshield_offline_queue') || '[]');
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    try {
      const res = await fetch(`${API_BASE}/api/actions/${item.actionId}?wardId=${encodeURIComponent(item.wardId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: item.status, note: item.note })
      });
      if (!res.ok) throw new Error('Sync failed');
    } catch (e) {
      remaining.push(item);
    }
  }

  localStorage.setItem('heatshield_offline_queue', JSON.stringify(remaining));
  if (remaining.length === 0) {
    dataSourceBadge.textContent = 'Synced';
  } else {
    dataSourceBadge.textContent = `Queued (${remaining.length})`;
  }
}

// --- Event Listeners ---
function setupEventListeners() {
  wardSelect.addEventListener('change', () => {
    fetchForecast(wardSelect.value, true);
  });

  fetchLiveBtn.addEventListener('click', () => {
    fetchForecast(wardSelect.value, true);
  });

  toggleWhatifBtn.addEventListener('click', () => {
    const isHidden = whatifForm.hidden;
    whatifForm.hidden = !isHidden;
    toggleWhatifBtn.setAttribute('aria-expanded', String(isHidden));
    toggleWhatifBtn.textContent = isHidden ? '✕ Close Simulator' : '⚡ What-If Simulator';
  });

  whatifForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tempC = parseFloat(document.getElementById('sim-temp').value);
    const humidityPct = parseFloat(document.getElementById('sim-humidity').value);
    const depVal = document.getElementById('sim-departure').value;
    const imdDepartureC = depVal !== '' ? parseFloat(depVal) : null;

    await runWhatIfAssessment({
      wardId: wardSelect.value,
      wardName: wardSelect.options[wardSelect.selectedIndex].text,
      temperatureC: tempC,
      humidityPct: humidityPct,
      imdDepartureC: imdDepartureC
    });
  });

  resetSimBtn.addEventListener('click', () => {
    whatifForm.hidden = true;
    toggleWhatifBtn.setAttribute('aria-expanded', 'false');
    toggleWhatifBtn.textContent = '⚡ What-If Simulator';
    fetchForecast(wardSelect.value, true);
  });

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');
      currentFilter = chip.getAttribute('data-filter');
      renderActions(currentAssessment ? currentAssessment.actions : []);
    });
  });

  copyWhatsappBtn.addEventListener('click', () => {
    copyBulletinToClipboard();
  });

  printBulletinBtn.addEventListener('click', () => {
    preparePrintPoster();
    window.print();
  });
}

// --- Data Fetching ---
async function fetchForecast(wardId, live = true) {
  setLoadingState(true);
  try {
    const url = `${API_BASE}/api/forecast?wardId=${encodeURIComponent(wardId)}&live=${live}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentAssessment = data;
    renderAll(data);
    localStorage.setItem(`heatshield_cache_${wardId}`, JSON.stringify(data));
  } catch (err) {
    console.warn('Network fetch error, attempting local cache fallback:', err);
    const cached = localStorage.getItem(`heatshield_cache_${wardId}`);
    if (cached) {
      currentAssessment = JSON.parse(cached);
      currentAssessment.dataSource = 'CLIENT_OFFLINE_CACHE';
      renderAll(currentAssessment);
    } else {
      renderErrorState('Unable to reach server. Please check internet connection.');
    }
  } finally {
    setLoadingState(false);
  }
}

async function runWhatIfAssessment(payload) {
  setLoadingState(true);
  try {
    const res = await fetch(`${API_BASE}/api/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentAssessment = data;
    renderAll(data);
  } catch (err) {
    alert('Failed to simulate assessment: ' + err.message);
  } finally {
    setLoadingState(false);
  }
}

async function updateActionStatus(actionId, status, note) {
  if (!currentAssessment) return;
  const wardId = currentAssessment.wardId;

  // Optimistic UI update
  const action = currentAssessment.actions.find(a => a.actionId === actionId);
  if (action) {
    action.status = status;
    if (note !== undefined) action.note = note;
    renderActions(currentAssessment.actions);
    updateProgress(currentAssessment.actions);
    renderBulletin(currentAssessment);
  }

  if (!navigator.onLine) {
    queueOfflineAction(wardId, actionId, status, note);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/actions/${actionId}?wardId=${encodeURIComponent(wardId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.warn('Action update failed, queueing offline:', err);
    queueOfflineAction(wardId, actionId, status, note);
  }
}

// --- Rendering ---
function renderAll(assessment) {
  renderHeaderStatus(assessment);
  renderRiskSummary(assessment);
  renderForecastTimeline(assessment);
  renderActions(assessment.actions);
  updateProgress(assessment.actions);
  renderBulletin(assessment);
}

function renderHeaderStatus(assessment) {
  const ds = assessment.dataSource || 'UNKNOWN';
  dataSourceBadge.textContent = ds.replace(/_/g, ' ');
  if (ds === 'LIVE_OPEN_METEO') {
    dataSourceBadge.className = 'badge badge-online';
  } else if (ds === 'STALE_CACHE' || ds === 'CLIENT_OFFLINE_CACHE') {
    dataSourceBadge.className = 'badge badge-offline';
  } else {
    dataSourceBadge.className = 'badge badge-source';
  }

  if (assessment.timestamp) {
    const dt = new Date(assessment.timestamp);
    assessmentTimestamp.textContent = `Updated: ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${dt.toLocaleDateString()})`;
  }
}

function renderRiskSummary(assessment) {
  const tierKey = assessment.operationalTier || 'BELOW_THRESHOLD';
  const meta = TIER_METADATA[tierKey] || TIER_METADATA.BELOW_THRESHOLD;

  tierBanner.className = `tier-banner ${meta.cssClass}`;
  tierIcon.textContent = meta.icon;
  tierTitle.textContent = meta.title;
  tierDesc.textContent = meta.desc;

  const hi = assessment.heatIndex;
  if (hi) {
    hiShadeVal.textContent = `${hi.heatIndexC.toFixed(1)}°C`;
    hiShadeF.textContent = `${hi.heatIndexF.toFixed(1)}°F (Apparent)`;
    hiSunVal.textContent = `${hi.sunExposureC.toFixed(1)}°C`;
    ambientConditions.textContent = `${hi.ambientTempC.toFixed(1)}°C / ${hi.relativeHumidityPct.toFixed(0)}%`;

    if (hi.isExtrapolated) {
      extrapolationBadge.textContent = '⚠️ Outside 80-110°F validated range';
      extrapolationBadge.style.color = '#fbbf24';
    } else {
      extrapolationBadge.textContent = '✓ NWS Rothfusz Validated Range';
      extrapolationBadge.style.color = '#94a3b8';
    }
  }

  const imd = assessment.imdCategory || 'NORMAL';
  imdSignalVal.textContent = imd.replace(/_/g, ' ');
  if (imd === 'SEVERE_HEAT_WAVE') {
    imdSignalVal.className = 'metric-value text-danger';
    imdCriteriaDesc.textContent = 'Max Temp ≥ 47°C or Departure > 6.4°C';
  } else if (imd === 'HEAT_WAVE') {
    imdSignalVal.className = 'metric-value text-danger';
    imdCriteriaDesc.textContent = 'Max Temp ≥ 45°C or Departure 4.5 - 6.4°C';
  } else {
    imdSignalVal.className = 'metric-value';
    imdCriteriaDesc.textContent = 'Below IMD Plains Heatwave Criteria';
  }
}

function renderForecastTimeline(assessment) {
  const summary = assessment.forecastSummary;
  const hourly = assessment.hourlyForecast || [];

  if (!summary || hourly.length === 0) {
    forecastSummaryText.textContent = '72-Hour continuous hourly timeline available when fetching live or simulation profiles.';
    timelineTrack.innerHTML = '<div class="timeline-chip">Hourly data not present for this assessment.</div>';
    tierHoursSummary.innerHTML = '';
    forecastPeakBadge.textContent = 'Peak: N/A';
    return;
  }

  // Peak badge
  const peakTierMeta = TIER_METADATA[summary.peakTier] || TIER_METADATA.BELOW_THRESHOLD;
  forecastPeakBadge.textContent = `Peak: ${summary.maxHeatIndexC.toFixed(1)}°C (${peakTierMeta.title.split(' ')[0]})`;

  // Summary text
  const startDt = new Date(summary.peakWindowStart);
  const endDt = new Date(summary.peakWindowEnd);
  forecastSummaryText.textContent = `Peak thermal stress window predicted between ${startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} and ${endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Prepare preemptive actions.`;

  // Timeline track
  timelineTrack.innerHTML = '';
  hourly.forEach((pt, idx) => {
    const chip = document.createElement('div');
    const isPeak = Math.abs(pt.heatIndexC - summary.maxHeatIndexC) < 0.1;
    chip.className = `timeline-chip ${isPeak ? 'chip-peak' : ''}`;

    const dt = new Date(pt.timestamp);
    const timeStr = `${dt.getHours()}:00`;

    const dotClass = getDotClass(pt.tier);

    chip.innerHTML = `
      <span class="timeline-time">${timeStr}</span>
      <span class="timeline-temp">${pt.temperatureC.toFixed(0)}°</span>
      <span class="timeline-sub" style="font-size:0.65rem; color:#94a3b8;">${pt.heatIndexC.toFixed(0)}° HI</span>
      <span class="timeline-tier-dot ${dotClass}" title="${pt.tier}"></span>
    `;
    timelineTrack.appendChild(chip);
  });

  // Hours per tier pills
  tierHoursSummary.innerHTML = '';
  if (summary.hoursPerTier) {
    for (const [tier, count] of Object.entries(summary.hoursPerTier)) {
      if (count > 0) {
        const pill = document.createElement('span');
        pill.className = 'hour-pill';
        const meta = TIER_METADATA[tier] || { title: tier };
        pill.innerHTML = `<strong>${count} hrs</strong> in ${meta.title.split(' ')[0]}`;
        tierHoursSummary.appendChild(pill);
      }
    }
  }
}

function getDotClass(tier) {
  switch (tier) {
    case 'EXTREME_DANGER': return 'dot-extreme-danger';
    case 'DANGER': return 'dot-danger';
    case 'EXTREME_CAUTION': return 'dot-extreme-caution';
    case 'CAUTION': return 'dot-caution';
    default: return 'dot-below';
  }
}

function renderActions(actions) {
  actionsList.innerHTML = '';
  if (!actions || actions.length === 0) {
    actionsList.innerHTML = '<div class="loading-state">No immediate operational actions required for this tier. Maintain monitoring.</div>';
    return;
  }

  const filtered = actions.filter(act => {
    if (currentFilter === 'ALL') return true;
    if (currentFilter === 'SANITATION') return act.ownerRole.includes('SANITATION');
    if (currentFilter === 'LABOUR') return act.ownerRole.includes('LABOUR');
    if (currentFilter === 'HEALTH') return act.ownerRole.includes('HEALTH') || act.ownerRole.includes('MEDICAL');
    if (currentFilter === 'RELIEF') return act.ownerRole.includes('RELIEF') || act.ownerRole.includes('COORDINATOR');
    return true;
  });

  if (filtered.length === 0) {
    actionsList.innerHTML = '<div class="loading-state">No actions match the selected role filter.</div>';
    return;
  }

  filtered.forEach(action => {
    const card = document.createElement('div');
    const statusClass = action.status === 'COMPLETED' ? 'status-completed' : (action.status === 'IN_PROGRESS' ? 'status-in-progress' : '');
    card.className = `action-card ${statusClass}`;

    const priorityClass = action.priority === 'CRITICAL' ? 'badge-critical' : (action.priority === 'URGENT' ? 'badge-urgent' : 'badge-high');

    card.innerHTML = `
      <div class="action-top">
        <div class="action-title-group">
          <h3>${escapeHtml(action.title)}</h3>
          <div class="action-hindi-title">${escapeHtml(action.hindiTitle || '')}</div>
        </div>
        <span class="action-priority-badge ${priorityClass}">${action.priority}</span>
      </div>

      <div class="action-meta-grid">
        <div class="action-meta-item">
          <span>Role: <strong>${formatRole(action.ownerRole)}</strong></span>
        </div>
        <div class="action-meta-item">
          <span>Target: <strong>${formatTarget(action.targetGroup)}</strong></span>
        </div>
        <div class="action-meta-item action-deadline">
          <span>⏰ <strong>${escapeHtml(action.deadline || action.timeWindow)}</strong></span>
        </div>
      </div>

      <div style="font-size: 0.72rem; color: #64748b;">
        Source: ${escapeHtml(action.sourceReference || 'NDMA / AMC HAP')}
      </div>

      <div class="action-status-bar">
        <div class="status-toggle-group" role="group" aria-label="Action Status">
          <button class="status-btn ${action.status === 'PENDING' ? 'active-pending' : ''}" data-status="PENDING">PENDING</button>
          <button class="status-btn ${action.status === 'IN_PROGRESS' ? 'active-in-progress' : ''}" data-status="IN_PROGRESS">IN PROGRESS</button>
          <button class="status-btn ${action.status === 'COMPLETED' ? 'active-completed' : ''}" data-status="COMPLETED">COMPLETED</button>
        </div>
        <input type="text" class="action-note-input" placeholder="Field note (e.g. Tanker deployed)" value="${escapeHtml(action.note || '')}" />
      </div>
    `;

    // Wire status toggles
    const statusButtons = card.querySelectorAll('.status-btn');
    const noteInput = card.querySelector('.action-note-input');

    statusButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const newStatus = btn.getAttribute('data-status');
        updateActionStatus(action.actionId, newStatus, noteInput.value.trim());
      });
    });

    noteInput.addEventListener('change', () => {
      updateActionStatus(action.actionId, action.status, noteInput.value.trim());
    });

    actionsList.appendChild(card);
  });
}

function updateProgress(actions) {
  if (!actions || actions.length === 0) {
    progressLabel.textContent = '0 / 0 Completed';
    progressBarFill.style.width = '0%';
    return;
  }

  const completed = actions.filter(a => a.status === 'COMPLETED').length;
  const total = actions.length;
  const pct = Math.round((completed / total) * 100);

  progressLabel.textContent = `${completed} of ${total} Completed (${pct}%)`;
  progressBarFill.style.width = `${pct}%`;
}

function renderBulletin(assessment) {
  const text = generateBulletinText(assessment);
  bulletinPreview.textContent = text;
}

function generateBulletinText(assessment) {
  if (!assessment) return 'No assessment loaded.';
  const tier = assessment.operationalTier || 'BELOW_THRESHOLD';
  const meta = TIER_METADATA[tier] || TIER_METADATA.BELOW_THRESHOLD;
  const hi = assessment.heatIndex;
  const actions = assessment.actions || [];

  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let text = `🚨 *HEATSHIELD WARD ADVISORY* 🚨\n`;
  text += `📍 *Ward:* ${assessment.wardName || assessment.wardId}\n`;
  text += `📅 *Issued:* ${dateStr} at ${timeStr}\n`;
  text += `⚠️ *Alert Tier:* ${meta.title.toUpperCase()}\n`;
  if (hi) {
    text += `🌡️ *Heat Index:* ${hi.heatIndexC.toFixed(1)}°C (Sun: ${hi.sunExposureC.toFixed(1)}°C)\n`;
  }
  text += `ℹ️ *Guidance:* ${meta.desc}\n\n`;

  text += `📋 *PRIORITY WARD ACTIONS:*\n`;
  actions.forEach((a, i) => {
    const statusIcon = a.status === 'COMPLETED' ? '✅' : (a.status === 'IN_PROGRESS' ? '⏳' : '⭕');
    text += `${i + 1}. ${statusIcon} [${a.status}] ${a.title}\n`;
    if (a.hindiTitle) {
      text += `   👉 ${a.hindiTitle}\n`;
    }
  });

  text += `\n📞 *Emergency Contacts:* Ambulance: 108 | Civic Helpline: 1916\n`;
  text += `🛡️ *HeatShield* — Community Heatwave Risk-to-Action Planner`;

  return text;
}

function copyBulletinToClipboard() {
  const text = generateBulletinText(currentAssessment);
  navigator.clipboard.writeText(text).then(() => {
    const original = copyWhatsappBtn.innerHTML;
    copyWhatsappBtn.innerHTML = '<span>✓</span> Copied to Clipboard!';
    setTimeout(() => {
      copyWhatsappBtn.innerHTML = original;
    }, 2500);
  }).catch(err => {
    alert('Failed to copy: ' + err.message);
  });
}

function preparePrintPoster() {
  if (!currentAssessment) return;
  const meta = document.getElementById('print-poster-meta');
  const tier = document.getElementById('print-poster-tier');
  const acts = document.getElementById('print-poster-actions');

  const tierMeta = TIER_METADATA[currentAssessment.operationalTier] || TIER_METADATA.BELOW_THRESHOLD;
  const hi = currentAssessment.heatIndex;

  meta.innerHTML = `
    <p><strong>Ward / Jurisdiction:</strong> ${escapeHtml(currentAssessment.wardName || currentAssessment.wardId)}</p>
    <p><strong>Date & Time of Assessment:</strong> ${new Date().toLocaleString('en-IN')}</p>
    <p><strong>Ambient / Heat Index:</strong> ${hi ? `${hi.ambientTempC.toFixed(1)}°C / Heat Index: ${hi.heatIndexC.toFixed(1)}°C (Sun: ${hi.sunExposureC.toFixed(1)}°C)` : 'N/A'}</p>
  `;

  tier.innerHTML = `
    <div>${tierMeta.icon} ${tierMeta.title.toUpperCase()}</div>
    <div style="font-size: 11pt; font-weight: normal; margin-top: 4pt;">${tierMeta.desc}</div>
  `;

  acts.innerHTML = '<h3>MANDATORY WARD-LEVEL ACTIONS:</h3>';
  (currentAssessment.actions || []).forEach((a, idx) => {
    const div = document.createElement('div');
    div.className = 'print-poster-action-item';
    div.innerHTML = `
      <p><strong>${idx + 1}. [${a.status}] ${escapeHtml(a.title)}</strong></p>
      <p style="font-style: italic; color: #444;">${escapeHtml(a.hindiTitle || '')}</p>
      <p><small>Role: ${formatRole(a.ownerRole)} | Deadline: ${escapeHtml(a.deadline || a.timeWindow)} | Source: ${escapeHtml(a.sourceReference || '')}</small></p>
    `;
    acts.appendChild(div);
  });
}

// --- Helpers ---
function formatRole(role) {
  if (!role) return 'Unassigned';
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function formatTarget(target) {
  if (!target) return 'All Citizens';
  return target.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function setLoadingState(loading) {
  if (loading) {
    dataSourceBadge.textContent = 'Syncing...';
  }
}

function renderErrorState(msg) {
  actionsList.innerHTML = `<div class="loading-state" style="color: #f87171;">⚠️ ${escapeHtml(msg)}</div>`;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('SW registration skipped or failed:', err);
    });
  }
}
