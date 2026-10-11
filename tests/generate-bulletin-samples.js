const fs = require('fs');
const path = require('path');

// 1. Load single source of truth i18n
const hiPath = path.join(__dirname, '../frontend/i18n/hi.json');
const enPath = path.join(__dirname, '../frontend/i18n/en.json');

function readJsonClean(p) {
  let content = fs.readFileSync(p, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return JSON.parse(content);
}

const I18N_HINDI = readJsonClean(hiPath);
const I18N_EN = readJsonClean(enPath);

const TIER_METADATA = {
  BELOW_THRESHOLD: { title: 'Below threshold', desc: 'No heat advisory warranted. Standard summer precautions.' },
  CAUTION: { title: 'Caution', desc: 'Fatigue possible with prolonged exposure and physical activity. Hydration advised.' },
  EXTREME_CAUTION: { title: 'Extreme Caution', desc: 'Heat cramps and heat exhaustion possible. Suggested shaded rest cycles for outdoor workers.' },
  DANGER: { title: 'Danger', desc: 'Heat cramps or exhaustion likely, heatstroke possible. Open daytime cooling shelters.' },
  EXTREME_DANGER: { title: 'Extreme Danger', desc: 'Heatstroke imminent with continued exposure. Emergency hospital alert & mobile medical patrols.' }
};

// Mirror functions exactly from frontend/app.js
function parseTimestamp(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
    const n = parseFloat(raw);
    if (!isNaN(n)) return parseTimestamp(n);
  }
  if (typeof raw === 'number') {
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
      hour12: false,
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    const formatter = new Intl.DateTimeFormat('en-IN', options);
    const parts = formatter.formatToParts(dt);
    const partMap = {};
    parts.forEach(p => { partMap[p.type] = p.value; });
    const time = `${partMap.hour}:${partMap.minute}`;
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
    return map;
  } catch (e) {
    return null;
  }
}

function formatPeakDateTime(raw) {
  const parts = getIstParts(raw);
  if (!parts) return 'Upcoming';
  return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute} IST`;
}

function formatPeakDateTimeHindi(raw) {
  const parts = getIstParts(raw);
  if (!parts) return '';
  const dayHi = (I18N_HINDI && I18N_HINDI.weekdays && I18N_HINDI.weekdays[parts.weekday]) || parts.weekday;
  const monthHi = (I18N_HINDI && I18N_HINDI.months && I18N_HINDI.months[parts.month]) || parts.month;
  return `${dayHi}, ${parts.day} ${monthHi}, ${parts.hour}:${parts.minute} IST को`;
}

function localizeDeadlineText(rawDeadline, isHindi = false) {
  if (!rawDeadline) return '';
  if (!isHindi) return rawDeadline;

  if (!I18N_HINDI || !I18N_HINDI.deadlines) return rawDeadline;

  if (/immediate/i.test(rawDeadline)) {
    return I18N_HINDI.deadlines.immediate || 'तुरंत';
  }

  if (/peak hours/i.test(rawDeadline) || /PEAK_HOURS/i.test(rawDeadline)) {
    return I18N_HINDI.deadlines.peak_hours || 'चरम घंटों में 12:00 से 16:00 IST';
  }

  if (/historical/i.test(rawDeadline)) {
    return I18N_HINDI.deadlines.historical_replay || 'ऐतिहासिक: 21 मई 2010';
  }

  // Pattern: "Before peak: Tue 13 Oct 12:00 IST" or "Before peak: Tue 13 Oct 12:00"
  const peakMatch = rawDeadline.match(/before peak:\s*(?:([A-Za-z]+),?\s+)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{1,2}:\d{2})/i);
  if (peakMatch) {
    const rawWk = peakMatch[1] || '';
    const dayNum = peakMatch[2];
    const rawMo = peakMatch[3];
    const rawTime = peakMatch[4];

    const dayHi = (rawWk && I18N_HINDI.weekdays && I18N_HINDI.weekdays[rawWk]) ? I18N_HINDI.weekdays[rawWk] : rawWk;
    const monthHi = (I18N_HINDI.months && I18N_HINDI.months[rawMo]) ? I18N_HINDI.months[rawMo] : rawMo;

    const tpl = (I18N_HINDI.deadlines && I18N_HINDI.deadlines.before_peak) || 'चरम जोखिम से पहले: {day}, {date} {month}, {time} IST';
    return tpl
      .replace('{day}', dayHi)
      .replace('{date}', dayNum)
      .replace('{month}', monthHi)
      .replace('{time}', rawTime);
  }

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

function generateBulletinText(assessment, localHelpline = '') {
  if (!assessment) return 'No assessment loaded.';
  const compositeTier = assessment.operationalTier || 'BELOW_THRESHOLD';
  const compositeMeta = TIER_METADATA[compositeTier] || TIER_METADATA.BELOW_THRESHOLD;
  const hi = assessment.heatIndex;
  const ambient = hi ? (hi.ambientTempC !== undefined ? hi.ambientTempC : hi.temperatureC).toFixed(1) : '--';
  const hiC = hi ? hi.heatIndexC.toFixed(1) : '--';

  const currentTier = (hi && (hi.riskTier || hi.tier)) || assessment.operationalTier || 'BELOW_THRESHOLD';
  const currentMeta = TIER_METADATA[currentTier] || TIER_METADATA.BELOW_THRESHOLD;

  const currentAirTemp = hi ? (hi.ambientTempC !== undefined ? hi.ambientTempC : hi.temperatureC) : 0;
  const summary = assessment.forecastSummary;
  const peakAirTemp = (summary && summary.maxTemperatureC !== undefined) ? summary.maxTemperatureC : currentAirTemp;
  const isExtrapolated = (currentAirTemp > 43.33) || (peakAirTemp > 43.33);

  const timeStr = formatIstTimestamp(assessment.timestamp);

  let text = `HEATWAVE ADVISORY (DRAFT) - ${assessment.wardName || assessment.wardId}\n`;
  text += `Issued: ${timeStr}\n`;
  text += `Right now: ${currentMeta.title} (heat index ${hiC}C)\n`;

  if (assessment.dataSource === 'SIMULATION') {
    text += `Peak in next 72 hours: not applicable (what-if, constant conditions)\n`;
  } else if (summary && summary.peakTier) {
    const peakMeta = TIER_METADATA[summary.peakTier] || compositeMeta;
    const peakTimeStr = summary.peakWindowStart ? formatPeakDateTime(summary.peakWindowStart) : '';
    const peakLineEn = peakTimeStr
      ? `Peak in next 72 hours: ${peakMeta.title} at ${peakTimeStr}\n`
      : `Peak in next 72 hours: ${peakMeta.title}\n`;
    text += peakLineEn;
  } else {
    text += `\n`;
  }

  text += `Planning level (follows the 72-hour peak): ${compositeMeta.title}\n`;
  if (isExtrapolated) {
    text += `Air temperature above 110 F / 43.3 C is outside the validated range of the NWS regression; heat index values are extrapolated.\n`;
  }
  text += `\n`;

  text += `Summary:\n${compositeMeta.desc}\n\n`;

  text += `Suggested Civic Actions:\n`;
  (assessment.actions || []).forEach((a, i) => {
    const mark = a.status === 'COMPLETED' ? '[DONE]' : '[PENDING]';
    text += `${i + 1}. ${mark} ${a.title} (Deadline: ${a.deadline || a.timeWindow})\n`;
  });

  const hindiStatus = (I18N_HINDI && I18N_HINDI.review_status_label) ? I18N_HINDI.review_status_label : 'PENDING HUMAN REVIEW';
  const hindiBulletinTitle = (I18N_HINDI && I18N_HINDI.bulletin_header_title) ? I18N_HINDI.bulletin_header_title : 'वार्ड ग्रीष्म परामर्श (प्रारूप)';
  const hindiActionHeading = (I18N_HINDI && I18N_HINDI.bulletin_suggested_actions_heading) ? I18N_HINDI.bulletin_suggested_actions_heading : 'सुझाए गए नागरिक कार्य (वार्ड स्तर):';
  const hindiTiers = (I18N_HINDI && I18N_HINDI.tiers) ? I18N_HINDI.tiers : {};
  const currentTierHindi = hindiTiers[currentTier] || currentTier;
  const compositeTierHindi = hindiTiers[compositeTier] || compositeTier;

  text += `\n--- ${hindiBulletinTitle} [${hindiStatus}] ---\n`;
  text += `${I18N_HINDI.bulletin_right_now_prefix || 'वर्तमान स्थिति:'} ${currentTierHindi}\n`;

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

  text += `${I18N_HINDI.bulletin_planning_level_prefix || 'योजना स्तर (72 घंटे के चरम के अनुसार):'} ${compositeTierHindi}\n`;
  if (isExtrapolated) {
    text += `${I18N_HINDI.bulletin_extrapolation_note || '110 F / 43.3 C से ऊपर का हवा का तापमान NWS प्रतिगमन की मान्य सीमा से बाहर है; हीट इंडेक्स मान अनुमानित हैं।'}\n`;
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

// Fixed Clocks & Scenarios
// Scenario 1: DEMO_AHMEDABAD Live Forecast at 02:30 IST, 11 Oct 2026
// Current: 28.5 C heat index (Caution), Peak 72h: Extreme Caution at Tue 13 Oct, 12:00 IST
const scenario1 = {
  wardId: 'DEMO_AHMEDABAD',
  wardName: 'Demo ward: Ahmedabad Central (illustrative)',
  timestamp: '2026-10-10T21:00:00Z', // 02:30 IST, 11 Oct 2026
  dataSource: 'OPEN_METEO_LIVE',
  operationalTier: 'EXTREME_CAUTION',
  riskTier: 'EXTREME_CAUTION',
  heatIndex: {
    temperatureC: 28.0,
    ambientTempC: 28.0,
    relativeHumidityPct: 60.0,
    heatIndexC: 28.5,
    tier: 'CAUTION'
  },
  forecastSummary: {
    maxHeatIndexC: 38.5,
    maxTemperatureC: 38.0,
    peakTier: 'EXTREME_CAUTION',
    peakWindowStart: '2026-10-13T06:30:00Z' // 12:00 IST, 13 Oct 2026
  },
  actions: [
    {
      actionId: 'ACT_WATER_KIOSKS',
      title: 'Activate and inspect shaded drinking water kiosks (Piyawa) at transit hubs',
      status: 'COMPLETED',
      deadline: 'Sun 11 Oct, before 10:00 IST'
    },
    {
      actionId: 'ACT_OUTDOOR_WORK_ADVISORY',
      title: 'Enforce work-rest cycles and shaded rest breaks for outdoor laborers and street vendors',
      status: 'PENDING',
      deadline: 'During peak hours 12:00 to 16:00 IST'
    }
  ]
};

// Scenario 2: What-if Simulation at 38.5 C, 55% RH -> heat index 53.3 C (127.9 F), Extreme Danger
// Air temp is 38.5 C (101.3 F) <= 43.3 C (110 F), so NO extrapolation note!
const scenario2 = {
  wardId: 'DEMO_AHMEDABAD',
  wardName: 'Demo ward: Ahmedabad Central (illustrative)',
  timestamp: '2026-10-10T21:00:00Z', // 02:30 IST, 11 Oct 2026
  dataSource: 'SIMULATION',
  operationalTier: 'EXTREME_DANGER',
  riskTier: 'EXTREME_DANGER',
  heatIndex: {
    temperatureC: 38.5,
    ambientTempC: 38.5,
    relativeHumidityPct: 55.0,
    heatIndexC: 53.3,
    tier: 'EXTREME_DANGER'
  },
  actions: [
    {
      actionId: 'ACT_WATER_KIOSKS',
      title: 'Activate and inspect shaded drinking water kiosks (Piyawa) at transit hubs',
      status: 'COMPLETED',
      deadline: 'Sun 11 Oct, before 10:00 IST'
    },
    {
      actionId: 'ACT_OUTDOOR_WORK_ADVISORY',
      title: 'Enforce work-rest cycles and shaded rest breaks for outdoor laborers and street vendors',
      status: 'PENDING',
      deadline: 'During peak hours 12:00 to 16:00 IST'
    },
    {
      actionId: 'ACT_COOLING_SHELTERS',
      title: 'Open shaded or cooled community buildings and public shelters',
      status: 'PENDING',
      deadline: 'Sun 11 Oct, before 11:00 IST'
    },
    {
      actionId: 'ACT_ORS_DISPATCH',
      title: 'Dispatch mobile ASHA/volunteer patrols with Oral Rehydration Salts (ORS) packets to informal colonies',
      status: 'PENDING',
      deadline: 'During peak hours 12:00 to 16:00 IST'
    },
    {
      actionId: 'ACT_HOSPITAL_ALERT',
      title: 'Alert urban health centres to prepare for heat-related illnesses',
      status: 'PENDING',
      deadline: 'Immediate (within 30 mins, by 03:00 IST)'
    }
  ]
};

// Scenario 3: Historical Replay 20 May 2010 at 08:00 IST
// Current air temp 33.2 C, 46% RH -> heat index 35.7 C (Extreme Caution)
// Peak in next 72h: Danger at Thu 20 May, 13:00 IST. Peak air temp 45.4 C (> 43.3 C), so extrapolation note triggers!
const scenario3 = {
  wardId: 'HISTORICAL_REPLAY_2010',
  wardName: 'Historical Replay: Ahmedabad May 2010 Heatwave',
  timestamp: '2010-05-20T02:30:00Z', // 08:00 IST, 20 May 2010
  dataSource: 'HISTORICAL_REPLAY_2010',
  operationalTier: 'DANGER',
  riskTier: 'DANGER',
  heatIndex: {
    temperatureC: 33.2,
    ambientTempC: 33.2,
    relativeHumidityPct: 46.0,
    heatIndexC: 35.7,
    tier: 'EXTREME_CAUTION'
  },
  forecastSummary: {
    maxHeatIndexC: 46.2,
    maxTemperatureC: 45.4,
    peakTier: 'DANGER',
    peakWindowStart: '2010-05-20T07:30:00Z' // 13:00 IST, 20 May 2010
  },
  actions: [
    {
      actionId: 'ACT_WATER_KIOSKS',
      title: 'Activate and inspect shaded drinking water kiosks (Piyawa) at transit hubs',
      status: 'COMPLETED',
      deadline: 'Thu 20 May, before 10:00 IST'
    },
    {
      actionId: 'ACT_OUTDOOR_WORK_ADVISORY',
      title: 'Enforce work-rest cycles and shaded rest breaks for outdoor laborers and street vendors',
      status: 'PENDING',
      deadline: 'During peak hours 12:00 to 16:00 IST'
    },
    {
      actionId: 'ACT_COOLING_SHELTERS',
      title: 'Open shaded or cooled community buildings and public shelters',
      status: 'PENDING',
      deadline: 'Thu 20 May, before 11:00 IST'
    },
    {
      actionId: 'ACT_ORS_DISPATCH',
      title: 'Dispatch mobile ASHA/volunteer patrols with Oral Rehydration Salts (ORS) packets to informal colonies',
      status: 'PENDING',
      deadline: 'During peak hours 12:00 to 16:00 IST'
    }
  ]
};

const output = [];
output.push('================================================================================');
output.push('GENERATED BULLETIN SAMPLES FOR HUMAN LINGUISTIC REVIEW');
output.push('Status: PENDING HUMAN REVIEW');
output.push('Date: 2026-10-11');
output.push('================================================================================');
output.push('');
output.push('### SCENARIO 1: LIVE FORECAST (DEMO_AHMEDABAD, EXTREME CAUTION PEAK)');
output.push('--------------------------------------------------------------------------------');
output.push(generateBulletinText(scenario1));
output.push('');
output.push('');
output.push('### SCENARIO 2: WHAT-IF SIMULATION (38.5 C, 55% RH - EXTREME DANGER)');
output.push('--------------------------------------------------------------------------------');
output.push(generateBulletinText(scenario2));
output.push('');
output.push('');
output.push('### SCENARIO 3: HISTORICAL REPLAY (AHMEDABAD MAY 2010 HEATWAVE)');
output.push('--------------------------------------------------------------------------------');
output.push(generateBulletinText(scenario3));
output.push('');

const outContent = output.join('\n');
const targetFile = path.join(__dirname, '../docs/hindi-review/GENERATED_BULLETIN_SAMPLES.txt');
fs.writeFileSync(targetFile, outContent, 'utf8');
console.log('Successfully generated bulletin samples at:', targetFile);
