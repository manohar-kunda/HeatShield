/**
 * HeatShield — Production Client Application v3
 * Zero external libraries, resilient rendering, truthful dataSource pill,
 * offline queue, accessible native controls, no emoji.
 */

const API_BASE = window.location.origin.includes('localhost')
  ? 'http://localhost:8085'
  : ''; // Same-origin on CloudFront (/api/*)

function getOrCreateWorkspaceId() {
  let ws = localStorage.getItem('heatshield_workspace_id');
  if (!ws || !ws.match(/^[a-zA-Z0-9_-]{3,64}$/)) {
    ws = 'ws-' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('heatshield_workspace_id', ws);
  }
  return ws;
}

const CURRENT_WORKSPACE_ID = getOrCreateWorkspaceId();

const TIER_METADATA = {
  BELOW_THRESHOLD: {
    title: 'Below threshold',
    iconSymbol: '#icon-info',
    cssClass: 'tier-below',
    desc: 'Conditions within normal operational tolerances. Routine surveillance.'
  },
  CAUTION: {
    title: 'Caution',
    iconSymbol: '#icon-alert-triangle',
    cssClass: 'tier-caution',
    desc: 'Fatigue possible with prolonged exposure. Activate shaded hydration kiosks.'
  },
  EXTREME_CAUTION: {
    title: 'Extreme Caution',
    iconSymbol: '#icon-alert-triangle',
    cssClass: 'tier-extreme-caution',
    desc: 'Heat cramps and heat exhaustion possible. Suggested shaded rest cycles for outdoor workers.'
  },
  DANGER: {
    title: 'Danger',
    iconSymbol: '#icon-alert-triangle',
    cssClass: 'tier-danger',
    desc: 'Heat cramps or exhaustion likely, heatstroke possible. Open daytime cooling shelters.'
  },
  EXTREME_DANGER: {
    title: 'Extreme Danger',
    iconSymbol: '#icon-alert-triangle',
    cssClass: 'tier-extreme-danger',
    desc: 'Heatstroke imminent with continued exposure. Emergency hospital alert & mobile medical patrols.'
  }
};

// --- Hindi Source of Truth (Loaded from i18n/hi.json with resilient inline fallback) ---
let I18N_HINDI = {
  review_status_label: "PENDING HUMAN REVIEW",
  print_header_title: "वार्ड ग्रीष्म परामर्श (प्रारूप)",
  bulletin_header_title: "वार्ड ग्रीष्म परामर्श (प्रारूप)",
  bulletin_suggested_actions_heading: "सुझाए गए नागरिक कार्य (वार्ड स्तर):",
  bulletin_emergency_contact: "राष्ट्रीय आपातकालीन नंबर: 112",
  bulletin_disclaimer: "सूचना: प्रारूप - केवल समन्वयकों की योजना सहायता हेतु। आधिकारिक चेतावनी नहीं, न ही चिकित्सा सलाह।",
  bulletin_data_attribution: "मौसम डेटा: Open-Meteo.com (CC BY 4.0)",
  tiers: {
    "BELOW_THRESHOLD": "सीमा से नीचे",
    "CAUTION": "सावधानी",
    "EXTREME_CAUTION": "अत्यधिक सावधानी",
    "DANGER": "खतरा",
    "EXTREME_DANGER": "अत्यधिक खतरा"
  },
  bulletin_current_status_prefix: "वर्तमान स्थिति:",
  bulletin_peak_prefix: "अगले 72 घंटों में चरम जोखिम:",
  bulletin_peak_not_applicable: "चरम जोखिम: लागू नहीं (व्हाट-इफ परिदृश्य, स्थिर स्थितियाँ)",
  bulletin_time_at: "को",
  bulletin_deadline_prefix: "समय-सीमा:",
  weekdays: {
    "Mon": "सोमवार",
    "Tue": "मंगलवार",
    "Wed": "बुधवार",
    "Thu": "गुरुवार",
    "Fri": "शुक्रवार",
    "Sat": "शनिवार",
    "Sun": "रविवार"
  },
  months: {
    "Jan": "जनवरी",
    "Feb": "फ़रवरी",
    "Mar": "मार्च",
    "Apr": "अप्रैल",
    "May": "मई",
    "Jun": "जून",
    "Jul": "जुलाई",
    "Aug": "अगस्त",
    "Sep": "सितंबर",
    "Oct": "अक्टूबर",
    "Nov": "नवंबर",
    "Dec": "दिसंबर"
  },
  deadlines: {
    "immediate": "तुरंत",
    "peak_hours": "चरम घंटों में 12:00 से 16:00 IST",
    "before_time": "{day}, {date} {month}, {time} IST से पहले",
    "historical_replay": "ऐतिहासिक: 21 मई 2010"
  },
  actions: {
    "ACT_WATER_KIOSKS": "बस स्टैंड और प्रमुख चौराहों पर ठंडे व छायादार पेयजल केंद्रों (प्याऊ) का निरीक्षण व संचालन सुनिश्चित करें",
    "ACT_OUTDOOR_WORK_ADVISORY": "निर्माण श्रमिकों और सड़क विक्रेताओं के लिए दोपहर में छायादार विश्राम और काम के घंटों में बदलाव लागू करें",
    "ACT_COOLING_SHELTERS": "नागरिकों के लिए छायादार या ठंडे सामुदायिक भवन और सार्वजनिक आश्रय स्थल खोलें",
    "ACT_ORS_DISPATCH": "बस्तियों और झुग्गी क्षेत्रों में ओआरएस (ORS) पैकेट और प्राथमिक चिकित्सा किट के साथ आशा कार्यकर्ताओं की टीम भेजें",
    "ACT_HOSPITAL_ALERT": "शहरी स्वास्थ्य केंद्रों को गर्मी से संबंधित बीमारियों के लिए तैयार रहने हेतु सतर्क करें"
  }
};

async function loadHindiStrings() {
  try {
    const res = await fetch('i18n/hi.json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.actions) {
        I18N_HINDI = data;
        updateStaticHindiDom();
      }
    }
  } catch (err) {
    console.warn('Using embedded i18n fallback:', err);
  }
}

function updateStaticHindiDom() {
  const printHindiTitle = document.getElementById('print-poster-hindi-title');
  if (printHindiTitle) {
    printHindiTitle.innerHTML = `${escapeHtml(I18N_HINDI.print_header_title)} <small class="hindi-review-tag">[${escapeHtml(I18N_HINDI.review_status_label)}]</small>`;
  }
}

let currentAssessment = null;
let currentFilter = 'ALL';

// DOM Elements
const wardSelect = document.getElementById('ward-select');
const fetchLiveBtn = document.getElementById('fetch-live-btn');
const resetDemoBtn = document.getElementById('reset-demo-btn');
const toggleWhatifBtn = document.getElementById('toggle-whatif-btn');
const whatifForm = document.getElementById('whatif-form');
const resetSimBtn = document.getElementById('reset-sim-btn');
const localHelplineInput = document.getElementById('local-helpline-input');
const dataSourceBadge = document.getElementById('datasource-badge');

const tierBanner = document.getElementById('tier-banner');
const tierIcon = document.getElementById('tier-icon');
const rightNowTier = document.getElementById('right-now-tier');
const peak72hTier = document.getElementById('peak-72h-tier');
const tierDesc = document.getElementById('tier-desc');
const hiShadeVal = document.getElementById('hi-shade-val');
const hiShadeF = document.getElementById('hi-shade-f');
const hiSunVal = document.getElementById('hi-sun-val');
const ambientConditions = document.getElementById('ambient-conditions');
const forecastPeakVal = document.getElementById('forecast-peak-val');
const forecastSummaryText = document.getElementById('forecast-summary-text');
const imdSignalVal = document.getElementById('imd-signal-val');
const imdCriteriaDesc = document.getElementById('imd-criteria-desc');
const assessmentTimestamp = document.getElementById('assessment-timestamp');

const progressContainer = document.getElementById('progress-container');
const progressLabel = document.getElementById('progress-label');
const progressBarFill = document.getElementById('progress-bar-fill');
const roleFilterSelect = document.getElementById('role-filter-select');
const actionsList = document.getElementById('actions-list');

const bulletinPreview = document.getElementById('bulletin-preview');
const copyWhatsappBtn = document.getElementById('copy-whatsapp-btn');
const copyBtnText = document.getElementById('copy-btn-text');
const copyAnnouncement = document.getElementById('copy-announcement');
const printBulletinBtn = document.getElementById('print-bulletin-btn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadHindiStrings();
  initHelplineField();
  setupEventListeners();
  registerServiceWorker();
  fetchForecast(wardSelect.value, true);
});

function initHelplineField() {
  if (localHelplineInput) {
    const saved = localStorage.getItem('heatshield_local_helpline') || '';
    localHelplineInput.value = saved;
    localHelplineInput.addEventListener('change', () => {
      localStorage.setItem('heatshield_local_helpline', localHelplineInput.value.trim());
      if (currentAssessment) renderBulletin(currentAssessment);
    });
  }
}

// --- Date & Timestamp Parsing Pure Helper ---
function parseTimestamp(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
    const n = parseFloat(raw);
    if (!isNaN(n)) return parseTimestamp(n);
  }
  if (typeof raw === 'number') {
    // If epoch is in seconds (< 1e11), convert to milliseconds
    if (raw < 1e11) {
      return new Date(raw * 1000);
    }
    return new Date(raw);
  }
  return null;
}

function formatIstTimestamp(raw) {
  const dt = parseTimestamp(raw);
  if (!dt) return 'Not available';
  
  try {
    const options = {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    const formatter = new Intl.DateTimeFormat('en-IN', options);
    const parts = formatter.formatToParts(dt);
    const partMap = {};
    parts.forEach(p => { partMap[p.type] = p.value; });
    const time = `${partMap.hour}:${partMap.minute} ${partMap.dayPeriod.toUpperCase()}`;
    const date = `${partMap.day} ${partMap.month} ${partMap.year}`;
    return `${time} IST, ${date}`;
  } catch (e) {
    return dt.toLocaleString();
  }
}

function getIstParts(raw) {
  const dt = parseTimestamp(raw);
  if (!dt) return null;
  try {
    const options = {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    const parts = new Intl.DateTimeFormat('en-IN', options).formatToParts(dt);
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });
    return map; // { weekday: 'Mon', day: '12', month: 'Oct', year: '2026', hour: '14', minute: '00' }
  } catch (e) {
    return null;
  }
}

function formatPeakDateTime(raw) {
  const parts = getIstParts(raw);
  if (!parts) return 'Upcoming';
  // English format: "Tue 13 Oct, 14:00 IST" or 12h: "Tue, 02:00 PM IST"
  return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute} IST`;
}

function formatPeakDateTimeHindi(raw) {
  const parts = getIstParts(raw);
  if (!parts) return '';
  const dayHi = (I18N_HINDI && I18N_HINDI.weekdays && I18N_HINDI.weekdays[parts.weekday]) || parts.weekday;
  const monthHi = (I18N_HINDI && I18N_HINDI.months && I18N_HINDI.months[parts.month]) || parts.month;
  // Format: "<weekday>, <date> <month>, <time> IST को"
  return `${dayHi}, ${parts.day} ${monthHi}, ${parts.hour}:${parts.minute} IST को`;
}

function localizeDeadlineText(rawDeadline, isHindi = false) {
  if (!rawDeadline) return '';
  if (!isHindi) return rawDeadline;

  // If already Hindi or no I18N_HINDI
  if (!I18N_HINDI || !I18N_HINDI.deadlines) return rawDeadline;

  // Immediate: "Immediate (within 30 mins...)" -> "तुरंत"
  if (/immediate/i.test(rawDeadline)) {
    return I18N_HINDI.deadlines.immediate || 'तुरंत';
  }

  // Peak hours: "During peak hours 12:00 to 16:00 IST" or "PEAK_HOURS_12_TO_16"
  if (/peak hours/i.test(rawDeadline) || /PEAK_HOURS/i.test(rawDeadline)) {
    return I18N_HINDI.deadlines.peak_hours || 'चरम घंटों में 12:00 से 16:00 IST';
  }

  // Historical replay: "Historical"
  if (/historical/i.test(rawDeadline)) {
    return I18N_HINDI.deadlines.historical_replay || 'ऐतिहासिक: 21 मई 2010';
  }

  // Pattern: "Mon 12 Oct, before 10:00 AM IST" or "Today, Sun 11 Oct, before 10:00 AM" or "Tomorrow, Mon 12 Oct..."
  // Extract weekday, day number, month, time
  const match = rawDeadline.match(/(?:(?:Today|Tomorrow),\s+)?(?:([A-Za-z]+),?\s+)?(\d{1,2})\s+([A-Za-z]+)(?:,\s*before\s*|\s*before\s*)(\d{1,2}:\d{2}(?:\s*[APap][Mm])?)/i);
  if (match) {
    const rawWk = match[1] || '';
    const dayNum = match[2];
    const rawMo = match[3];
    const rawTime = match[4];

    const dayHi = (rawWk && I18N_HINDI.weekdays && I18N_HINDI.weekdays[rawWk])
      ? I18N_HINDI.weekdays[rawWk]
      : (rawWk.toLowerCase().includes('today') ? 'आज' : (rawWk.toLowerCase().includes('tomorrow') ? 'कल' : rawWk));
    const monthHi = (I18N_HINDI.months && I18N_HINDI.months[rawMo]) ? I18N_HINDI.months[rawMo] : rawMo;

    // Convert 12h time to 24h if needed
    let time24 = rawTime.trim();
    if (/am|pm/i.test(time24)) {
      const isPm = /pm/i.test(time24);
      const isAm = /am/i.test(time24);
      const parts = time24.replace(/[^\d:]/g, '').split(':');
      let h = parseInt(parts[0], 10);
      const m = parts[1] || '00';
      if (isPm && h < 12) h += 12;
      if (isAm && h === 12) h = 0;
      time24 = `${String(h).padStart(2, '0')}:${m}`;
    }

    const tpl = I18N_HINDI.deadlines.before_time || '{day}, {date} {month}, {time} IST से पहले';
    return tpl
      .replace('{day}', dayHi)
      .replace('{date}', dayNum)
      .replace('{month}', monthHi)
      .replace('{time}', time24);
  }

  return rawDeadline;
}

// --- Data Fetching ---
async function fetchForecast(wardId, live = true) {
  setLoadingState(true);
  const controller = new AbortController();
  
  // 3s timer updates feedback without aborting the actual network request
  const slowWarningTimer = setTimeout(() => {
    dataSourceBadge.textContent = 'Still loading...';
    dataSourceBadge.className = 'pill pill-saved';
  }, 3000);

  // 12s client timeout guarantees server has ample opportunity to respond (Lambda worst case 10s)
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 12000);

  try {
    const url = `${API_BASE}/api/forecast?wardId=${encodeURIComponent(wardId)}&live=${live}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'X-Workspace-Id': CURRENT_WORKSPACE_ID }
    });
    clearTimeout(slowWarningTimer);
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    currentAssessment = data;
    renderAll(data);
    localStorage.setItem(`heatshield_cache_${wardId}`, JSON.stringify(data));
  } catch (err) {
    clearTimeout(slowWarningTimer);
    clearTimeout(timeoutId);
    console.warn('Network fetch error or timeout, checking fallback:', err);
    
    const cached = localStorage.getItem(`heatshield_cache_${wardId}`);
    if (cached) {
      try {
        currentAssessment = JSON.parse(cached);
        currentAssessment.dataSource = 'STALE_CACHE';
        renderAll(currentAssessment);
      } catch (parseErr) {
        handleFetchFailure(err);
      }
    } else {
      handleFetchFailure(err);
    }
  } finally {
    setLoadingState(false);
  }
}

function handleFetchFailure(err) {
  dataSourceBadge.textContent = 'Could not load';
  dataSourceBadge.className = 'pill pill-error';

  let msg = 'Server error encountered while retrieving weather data.';
  if (!navigator.onLine) {
    msg = 'Offline. No network connection detected.';
  } else if (err.name === 'AbortError') {
    msg = 'Request timed out after 12 seconds. Server is slow to respond.';
  }
  renderErrorState(msg);
}

async function runWhatIfAssessment(payload) {
  setLoadingState(true);
  try {
    const res = await fetch(`${API_BASE}/api/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': CURRENT_WORKSPACE_ID
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    data.dataSource = 'SIMULATION';
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
  const action = (currentAssessment.actions || []).find(a => a.actionId === actionId);
  if (action) {
    action.status = status;
    if (note !== undefined) action.note = note;
    renderActions(currentAssessment.actions);
    updateProgress(currentAssessment.actions);
    renderBulletin(currentAssessment);
  }

  // Client-side privacy filtering
  if (note) {
    if (note.length > 200) {
      alert('Note exceeds maximum length of 200 characters.');
      return;
    }
    const strippedNonAlphanumeric = note.replace(/[^\p{L}\p{Nd}]/gu, '');
    if (/\p{Nd}{10,}/u.test(strippedNonAlphanumeric)) {
      alert('Privacy alert: Phone numbers or citizen identifiers cannot be entered in notes.');
      return;
    }
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/m.test(note)) {
      alert('Privacy alert: Email addresses cannot be entered in notes.');
      return;
    }
  }

  if (!navigator.onLine) {
    queueOfflineAction(wardId, actionId, status, note);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/actions/${actionId}?wardId=${encodeURIComponent(wardId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': CURRENT_WORKSPACE_ID
      },
      body: JSON.stringify({ status, note })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.warn('Action update failed, queueing offline:', err);
    queueOfflineAction(wardId, actionId, status, note);
  }
}

// --- Isolated Section Rendering ---
function renderAll(assessment) {
  try { renderHeaderStatus(assessment); } catch (e) { console.error('Error rendering header status:', e); }
  try { renderRiskSummary(assessment); } catch (e) { console.error('Error rendering risk summary:', e); }
  try { renderActions(assessment ? assessment.actions : []); } catch (e) { console.error('Error rendering actions:', e); }
  try { updateProgress(assessment ? assessment.actions : []); } catch (e) { console.error('Error rendering progress:', e); }
  try { renderBulletin(assessment); } catch (e) { console.error('Error rendering bulletin:', e); }
}

function renderHeaderStatus(assessment) {
  const ds = (assessment && assessment.dataSource) ? assessment.dataSource : 'UNKNOWN';
  
  if (ds === 'LIVE_OPEN_METEO') {
    dataSourceBadge.textContent = 'Live data';
    dataSourceBadge.className = 'pill pill-live';
  } else if (ds === 'STALE_CACHE') {
    dataSourceBadge.textContent = 'Saved data (stale)';
    dataSourceBadge.className = 'pill pill-saved';
  } else if (ds === 'CLIENT_OFFLINE_CACHE') {
    dataSourceBadge.textContent = 'Offline sample';
    dataSourceBadge.className = 'pill pill-sample';
  } else if (ds === 'HISTORICAL_REPLAY_2010') {
    dataSourceBadge.textContent = 'Replay (past event)';
    dataSourceBadge.className = 'pill pill-replay';
  } else if (ds === 'SIMULATION') {
    dataSourceBadge.textContent = 'Simulation';
    dataSourceBadge.className = 'pill pill-sample';
  } else {
    dataSourceBadge.textContent = 'Could not load';
    dataSourceBadge.className = 'pill pill-error';
  }

  if (assessment && assessment.timestamp) {
    assessmentTimestamp.textContent = `Updated: ${formatIstTimestamp(assessment.timestamp)}`;
  } else {
    assessmentTimestamp.textContent = 'Updated: Not available';
  }
}

function renderRiskSummary(assessment) {
  if (!assessment) return;

  const summary = assessment.forecastSummary;
  const hi = assessment.heatIndex;

  // 1. Right now tier vs Peak in next 72 hours tier
  const currentTierKey = (hi && hi.riskTier) ? hi.riskTier : (assessment.operationalTier || 'BELOW_THRESHOLD');
  const currentMeta = TIER_METADATA[currentTierKey] || TIER_METADATA.BELOW_THRESHOLD;

  const peakTierKey = summary ? summary.peakTier : (assessment.operationalTier || currentTierKey);
  const peakMeta = TIER_METADATA[peakTierKey] || TIER_METADATA.BELOW_THRESHOLD;

  // The composite card follows the peak tier styling
  tierBanner.className = `tier-callout ${peakMeta.cssClass}`;
  tierIcon.querySelector('use').setAttribute('href', peakMeta.iconSymbol);

  const currentHiC = hi ? hi.heatIndexC.toFixed(1) : '--';
  const peakHiC = summary ? summary.maxHeatIndexC.toFixed(1) : currentHiC;

  rightNowTier.textContent = `Right now: ${currentMeta.title} (heat index ${currentHiC}°C)`;

  if (assessment.dataSource === 'SIMULATION') {
    peak72hTier.textContent = 'Peak: not applicable (what-if, constant conditions)';
  } else if (summary && summary.peakWindowStart) {
    const peakTimeStr = formatPeakDateTime(summary.peakWindowStart);
    peak72hTier.textContent = `Peak in next 72 hours: ${peakMeta.title} at ${peakTimeStr} (heat index ${peakHiC}°C)`;
  } else {
    peak72hTier.textContent = `Peak in next 72 hours: ${peakMeta.title} (heat index ${peakHiC}°C)`;
  }

  tierDesc.textContent = peakMeta.desc;

  // 2. Simple Stats
  if (hi) {
    const ambient = (hi.ambientTempC !== undefined ? hi.ambientTempC : hi.temperatureC);
    const humidity = (hi.relativeHumidityPct !== undefined ? hi.relativeHumidityPct : hi.humidityPct);
    const sunC = (hi.sunExposureC !== undefined ? hi.sunExposureC : hi.sunExposureHeatIndexC);

    hiShadeVal.textContent = `${hi.heatIndexC.toFixed(1)}°C`;
    hiShadeF.textContent = `${hi.heatIndexF.toFixed(1)}°F`;
    hiSunVal.textContent = `${sunC.toFixed(1)}°C`;
    ambientConditions.textContent = `${ambient.toFixed(1)}°C / ${humidity.toFixed(0)}% RH`;
  } else {
    hiShadeVal.textContent = 'Not available';
    hiShadeF.textContent = '--';
    hiSunVal.textContent = 'Not available';
    ambientConditions.textContent = '--';
  }

  if (assessment.dataSource === 'SIMULATION') {
    forecastPeakVal.textContent = 'Not applicable';
    forecastSummaryText.textContent = 'What-if constant simulation (no forecast timeline)';
  } else if (summary && summary.peakWindowStart) {
    const peakTimeStr = formatPeakDateTime(summary.peakWindowStart);
    forecastPeakVal.textContent = `${peakMeta.title}`;
    forecastSummaryText.textContent = `Expected around ${peakTimeStr} (${summary.maxHeatIndexC.toFixed(1)}°C)`;
  } else {
    forecastPeakVal.textContent = 'Not available';
    forecastSummaryText.textContent = 'Peak window data unavailable';
  }

  // 3. IMD Signal
  let imdRaw = assessment.imdCategory || 'NORMAL';
  if (imdRaw === 'NORMAL') {
    imdSignalVal.textContent = 'No heatwave signal (indicative)';
    imdCriteriaDesc.textContent = 'Indicative signal from model forecast, not an official IMD warning.';
  } else if (imdRaw === 'HEAT_WAVE') {
    imdSignalVal.textContent = 'Heatwave signal';
    imdCriteriaDesc.textContent = 'Observed or forecast ambient temperature meets IMD heatwave criteria.';
  } else if (imdRaw === 'SEVERE_HEAT_WAVE') {
    imdSignalVal.textContent = 'Severe heatwave signal';
    imdCriteriaDesc.textContent = 'Ambient temperature exceeds IMD severe heatwave criteria (≥47°C or ≥6.4°C departure).';
  } else {
    imdSignalVal.textContent = imdRaw.replace(/_/g, ' ');
  }

  if (assessment.dataSource === 'HISTORICAL_REPLAY_2010') {
    imdCriteriaDesc.textContent = 'RETROSPECTIVE ILLUSTRATION using reanalysis data, not a forecast. (Station 46.8°C / Grid 44.2°C)';
  }
}

function renderActions(actions) {
  actionsList.innerHTML = '';
  const list = actions || [];

  const filtered = currentFilter === 'ALL'
    ? list
    : list.filter(a => a.ownerRole === currentFilter);

  if (filtered.length === 0) {
    actionsList.innerHTML = '<div class="empty-state">No suggested actions for the selected filter.</div>';
    return;
  }

  filtered.forEach((action) => {
    const card = document.createElement('div');
    const isDone = action.status === 'COMPLETED';
    const isInProgress = action.status === 'IN_PROGRESS';
    card.className = `action-card ${isDone ? 'status-done' : ''} ${isInProgress ? 'status-inprogress' : ''}`;

    const deadlineText = action.deadline || action.timeWindow || 'Before peak hours';
    const hindiFromI18n = (I18N_HINDI && I18N_HINDI.actions && I18N_HINDI.actions[action.actionId])
      ? I18N_HINDI.actions[action.actionId]
      : (action.hindiTitle || '').replace(/\s*\(PENDING HUMAN REVIEW\)/i, '');
    const hindiStatusLabel = (I18N_HINDI && I18N_HINDI.review_status_label) ? I18N_HINDI.review_status_label : 'PENDING HUMAN REVIEW';

    card.innerHTML = `
      <div class="action-top-row">
        <h3 class="action-title">${escapeHtml(action.title)}</h3>
        <span class="action-priority"><svg class="icon icon-inline" aria-hidden="true"><use href="#icon-clock"/></svg>${escapeHtml(action.priority || 'MEDIUM')}</span>
      </div>
      ${hindiFromI18n ? `<p class="action-hindi">${escapeHtml(hindiFromI18n)} <small class="hindi-review-tag">[${escapeHtml(hindiStatusLabel)}]</small></p>` : ''}
      <div class="action-meta">
        <span>Role: ${formatRole(action.ownerRole)}</span>
        <span>Deadline: ${escapeHtml(deadlineText)}</span>
        <span>Source: ${escapeHtml(action.sourceReference || 'NDMA Guidelines')}</span>
      </div>
      <div class="action-controls">
        <select class="action-status-select" aria-label="Action status">
          <option value="PENDING" ${action.status === 'PENDING' ? 'selected' : ''}>Pending</option>
          <option value="IN_PROGRESS" ${action.status === 'IN_PROGRESS' ? 'selected' : ''}>In progress</option>
          <option value="COMPLETED" ${action.status === 'COMPLETED' ? 'selected' : ''}>Done</option>
        </select>
        <input type="text" class="action-note-input" maxlength="200" placeholder="Coordinator note (no personal data)" value="${escapeHtml(action.note || '')}" />
        <button type="button" class="action-save-btn">Save</button>
      </div>
    `;

    const statusSelect = card.querySelector('.action-status-select');
    const noteInput = card.querySelector('.action-note-input');
    const saveBtn = card.querySelector('.action-save-btn');

    statusSelect.addEventListener('change', () => {
      updateActionStatus(action.actionId, statusSelect.value, noteInput.value.trim());
    });

    saveBtn.addEventListener('click', () => {
      updateActionStatus(action.actionId, statusSelect.value, noteInput.value.trim());
    });

    noteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        updateActionStatus(action.actionId, statusSelect.value, noteInput.value.trim());
      }
    });

    actionsList.appendChild(card);
  });
}

function updateProgress(actions) {
  if (!actions || actions.length === 0) {
    progressContainer.style.display = 'none';
    progressLabel.textContent = '0 of 0 actions done';
    progressBarFill.style.width = '0%';
    return;
  }

  progressContainer.style.display = 'block';
  const completed = actions.filter(a => a.status === 'COMPLETED').length;
  const total = actions.length;
  const pct = Math.round((completed / total) * 100);

  progressLabel.textContent = `${completed} of ${total} actions done`;
  progressBarFill.style.width = `${pct}%`;
  progressBarFill.parentElement.setAttribute('aria-valuenow', pct);
}

function renderBulletin(assessment) {
  if (!assessment) {
    bulletinPreview.textContent = 'No assessment loaded.';
    copyWhatsappBtn.disabled = true;
    printBulletinBtn.disabled = true;
    return;
  }

  const text = generateBulletinText(assessment);
  bulletinPreview.textContent = text;
  copyWhatsappBtn.disabled = false;
  printBulletinBtn.disabled = false;
}

function generateBulletinText(assessment) {
  if (!assessment) return 'No assessment loaded.';
  const tier = assessment.operationalTier || 'BELOW_THRESHOLD';
  const meta = TIER_METADATA[tier] || TIER_METADATA.BELOW_THRESHOLD;
  const hi = assessment.heatIndex;
  const ambient = hi ? (hi.ambientTempC !== undefined ? hi.ambientTempC : hi.temperatureC).toFixed(1) : '--';
  const hiC = hi ? hi.heatIndexC.toFixed(1) : '--';

  const timeStr = formatIstTimestamp(assessment.timestamp);

  let text = `HEATWAVE ADVISORY (DRAFT) - ${assessment.wardName || assessment.wardId}\n`;
  text += `Issued: ${timeStr}\n`;
  text += `Status: ${meta.title.toUpperCase()}\n`;
  text += `Current: ${ambient}C | Heat Index: ${hiC}C\n`;

  const summary = assessment.forecastSummary;
  if (assessment.dataSource === 'SIMULATION') {
    text += `Peak in next 72 hours: not applicable (what-if, constant conditions)\n\n`;
  } else if (summary && summary.peakTier) {
    const peakMeta = TIER_METADATA[summary.peakTier] || meta;
    const peakTimeStr = summary.peakWindowStart ? formatPeakDateTime(summary.peakWindowStart) : '';
    const peakLineEn = peakTimeStr
      ? `Peak in next 72 hours: ${peakMeta.title} at ${peakTimeStr}\n\n`
      : `Peak in next 72 hours: ${peakMeta.title}\n\n`;
    text += peakLineEn;
  } else {
    text += `\n`;
  }

  text += `Summary:\n${meta.desc}\n\n`;

  text += `Suggested Civic Actions:\n`;
  (assessment.actions || []).forEach((a, i) => {
    const mark = a.status === 'COMPLETED' ? '[DONE]' : '[PENDING]';
    text += `${i + 1}. ${mark} ${a.title} (Deadline: ${a.deadline || a.timeWindow})\n`;
  });

  // Hindi section from single source of truth I18N_HINDI
  const hindiStatus = (I18N_HINDI && I18N_HINDI.review_status_label) ? I18N_HINDI.review_status_label : 'PENDING HUMAN REVIEW';
  const hindiBulletinTitle = (I18N_HINDI && I18N_HINDI.bulletin_header_title) ? I18N_HINDI.bulletin_header_title : 'वार्ड ग्रीष्म परामर्श (प्रारूप)';
  const hindiActionHeading = (I18N_HINDI && I18N_HINDI.bulletin_suggested_actions_heading) ? I18N_HINDI.bulletin_suggested_actions_heading : 'सुझाए गए नागरिक कार्य (वार्ड स्तर):';
  const hindiTiers = (I18N_HINDI && I18N_HINDI.tiers) ? I18N_HINDI.tiers : {};
  const currentTierHindi = hindiTiers[tier] || tier;

  text += `\n--- ${hindiBulletinTitle} [${hindiStatus}] ---\n`;
  text += `${I18N_HINDI.bulletin_current_status_prefix || 'वर्तमान स्थिति:'} ${currentTierHindi}\n`;

  if (assessment.dataSource === 'SIMULATION') {
    const notApplicableHi = I18N_HINDI.bulletin_peak_not_applicable || 'चरम जोखिम: लागू नहीं (व्हाट-इफ परिदृश्य, स्थिर स्थितियाँ)';
    text += `${notApplicableHi}\n`;
  } else if (summary && summary.peakTier) {
    const peakTierHindi = hindiTiers[summary.peakTier] || summary.peakTier;
    const peakTimeStrHi = summary.peakWindowStart ? formatPeakDateTimeHindi(summary.peakWindowStart) : '';
    const peakLineHi = peakTimeStrHi
      ? `${I18N_HINDI.bulletin_peak_prefix || 'अगले 72 घंटों में चरम जोखिम:'} ${peakTierHindi} (${peakTimeStrHi})`
      : `${I18N_HINDI.bulletin_peak_prefix || 'अगले 72 घंटों में चरम जोखिम:'} ${peakTierHindi}`;
    text += `${peakLineHi}\n`;
  }

  text += `\n${hindiActionHeading}\n`;
  (assessment.actions || []).forEach((a, i) => {
    const mark = a.status === 'COMPLETED' ? '[पूर्ण / DONE]' : '[लंबित / PENDING]';
    const hindiAction = (I18N_HINDI && I18N_HINDI.actions && I18N_HINDI.actions[a.actionId])
      ? I18N_HINDI.actions[a.actionId]
      : (a.hindiTitle || '').replace(/\s*\(PENDING HUMAN REVIEW\)/i, '');
    const rawDeadlineStr = a.deadline || a.timeWindow || '';
    const localizedDeadline = localizeDeadlineText(rawDeadlineStr, true);
    const deadlinePart = localizedDeadline ? ` (${I18N_HINDI.bulletin_deadline_prefix || 'समय-सीमा:'} ${localizedDeadline})` : '';
    if (hindiAction) {
      text += `${i + 1}. ${mark} ${hindiAction}${deadlinePart}\n`;
    }
  });

  const localHelpline = localHelplineInput ? localHelplineInput.value.trim() : '';
  const emergencyStr = localHelpline ? `National emergency: 112 | Public office: ${localHelpline}` : `National emergency: 112`;

  text += `\nEmergency Contacts: ${emergencyStr}\n`;
  if (I18N_HINDI && I18N_HINDI.bulletin_emergency_contact) {
    text += `${I18N_HINDI.bulletin_emergency_contact}\n`;
  }
  text += `Notice: DRAFT for coordinator review. Planning aid only.\n`;
  if (I18N_HINDI && I18N_HINDI.bulletin_disclaimer) {
    text += `${I18N_HINDI.bulletin_disclaimer}\n`;
  }
  text += `Data: Open-Meteo.com (CC BY 4.0)\n`;
  if (I18N_HINDI && I18N_HINDI.bulletin_data_attribution) {
    text += `${I18N_HINDI.bulletin_data_attribution}\n`;
  }

  return text;
}

function copyBulletinToClipboard() {
  const text = generateBulletinText(currentAssessment);
  if (!text) return;

  function onCopied() {
    copyBtnText.textContent = 'Copied';
    copyAnnouncement.textContent = 'Bulletin copied to clipboard successfully.';
    setTimeout(() => {
      copyBtnText.textContent = 'Copy text';
      copyAnnouncement.textContent = '';
    }, 2500);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onCopied).catch(() => {
      fallbackSelectAndCopy();
    });
  } else {
    fallbackSelectAndCopy();
  }
}

function fallbackSelectAndCopy() {
  const range = document.createRange();
  range.selectNodeContents(bulletinPreview);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  copyBtnText.textContent = 'Selected (Press Ctrl+C)';
  copyAnnouncement.textContent = 'Bulletin text selected. Press Ctrl+C to copy.';
}

function preparePrintPoster() {
  if (!currentAssessment) return;
  const meta = document.getElementById('print-poster-meta');
  const tier = document.getElementById('print-poster-tier');
  const acts = document.getElementById('print-poster-actions');
  const printHelplineSpan = document.getElementById('print-local-helpline');

  const tierMeta = TIER_METADATA[currentAssessment.operationalTier] || TIER_METADATA.BELOW_THRESHOLD;
  const hi = currentAssessment.heatIndex;

  const localHelpline = localHelplineInput ? localHelplineInput.value.trim() : '';
  if (printHelplineSpan) {
    printHelplineSpan.textContent = localHelpline ? `| Public office: ${localHelpline}` : '';
  }

  meta.innerHTML = `
    <p><strong>Ward / Jurisdiction:</strong> ${escapeHtml(currentAssessment.wardName || currentAssessment.wardId)}</p>
    <p><strong>Date & Time of Assessment:</strong> ${formatIstTimestamp(currentAssessment.timestamp)}</p>
    <p><strong>Ambient / Heat Index:</strong> ${hi ? `${hi.temperatureC || hi.ambientTempC}°C / Heat Index: ${hi.heatIndexC.toFixed(1)}°C` : 'N/A'}</p>
  `;

  tier.innerHTML = `
    <div>${tierMeta.title.toUpperCase()}</div>
    <div style="font-size: 11pt; font-weight: normal; margin-top: 4pt;">${tierMeta.desc}</div>
  `;

  acts.innerHTML = '<h3>SUGGESTED WARD-LEVEL ACTIONS (PLANNING AID):</h3>';
  const hindiStatusLabel = (I18N_HINDI && I18N_HINDI.review_status_label) ? I18N_HINDI.review_status_label : 'PENDING HUMAN REVIEW';
  (currentAssessment.actions || []).forEach((a, idx) => {
    const div = document.createElement('div');
    div.className = 'print-poster-action-item';
    const cleanHindi = (I18N_HINDI && I18N_HINDI.actions && I18N_HINDI.actions[a.actionId])
      ? I18N_HINDI.actions[a.actionId]
      : (a.hindiTitle || '').replace(/\s*\(PENDING HUMAN REVIEW\)/i, '');
    div.innerHTML = `
      <p><strong>${idx + 1}. [${a.status}] ${escapeHtml(a.title)}</strong></p>
      ${cleanHindi ? `<p style="font-style: italic; color: #444;">${escapeHtml(cleanHindi)} <small class="hindi-review-tag">[${escapeHtml(hindiStatusLabel)}]</small></p>` : ''}
      <p><small>Role: ${formatRole(a.ownerRole)} | Deadline: ${escapeHtml(a.deadline || a.timeWindow)} | Source: ${escapeHtml(a.sourceReference || '')}</small></p>
    `;
    acts.appendChild(div);
  });
}

// --- Offline Queue Handling ---
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
    dataSourceBadge.textContent = 'Live data';
    dataSourceBadge.className = 'pill pill-live';
  } else {
    dataSourceBadge.textContent = `Queued (${remaining.length})`;
  }
}

// --- Event Listeners ---
function setupEventListeners() {
  window.addEventListener('online', flushOfflineQueue);

  wardSelect.addEventListener('change', () => {
    const replayProv = document.getElementById('replay-provenance');
    if (replayProv) {
      replayProv.style.display = wardSelect.value === 'REPLAY_AHMEDABAD_2010' ? 'block' : 'none';
    }
    fetchForecast(wardSelect.value, true);
  });

  fetchLiveBtn.addEventListener('click', () => {
    fetchForecast(wardSelect.value, true);
  });

  resetDemoBtn.addEventListener('click', () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('heatshield_cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('heatshield_offline_queue');
    fetchForecast(wardSelect.value, true);
  });

  toggleWhatifBtn.addEventListener('click', () => {
    const isHidden = whatifForm.hidden;
    whatifForm.hidden = !isHidden;
    toggleWhatifBtn.setAttribute('aria-expanded', String(!isHidden));
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
    fetchForecast(wardSelect.value, true);
  });

  roleFilterSelect.addEventListener('change', () => {
    currentFilter = roleFilterSelect.value;
    renderActions(currentAssessment ? currentAssessment.actions : []);
  });

  copyWhatsappBtn.addEventListener('click', copyBulletinToClipboard);

  printBulletinBtn.addEventListener('click', () => {
    preparePrintPoster();
    window.print();
  });
}

function setLoadingState(loading) {
  if (loading) {
    dataSourceBadge.textContent = 'Loading...';
    dataSourceBadge.className = 'pill pill-muted';
  }
}

function renderErrorState(msg) {
  actionsList.innerHTML = `<div class="empty-state" style="color: #991b1b;">${escapeHtml(msg)}</div>`;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('SW registration skipped or failed:', err);
    });
  }
}

function formatRole(role) {
  if (!role) return 'Unassigned';
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
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
