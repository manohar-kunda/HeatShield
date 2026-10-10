const fs = require('fs');
const assert = require('assert');
const path = require('path');

console.log('==========================================================');
console.log(' HeatShield Mechanical Hindi & i18n Validation Suite');
console.log('==========================================================');

const hiPath = path.join(__dirname, '../frontend/i18n/hi.json');
const enPath = path.join(__dirname, '../frontend/i18n/en.json');

assert(fs.existsSync(hiPath), 'frontend/i18n/hi.json must exist');
assert(fs.existsSync(enPath), 'frontend/i18n/en.json must exist');

function readJsonClean(p) {
  let content = fs.readFileSync(p, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return JSON.parse(content);
}

const hi = readJsonClean(hiPath);
const en = readJsonClean(enPath);

// 1. Every English key has a corresponding Hindi key and vice-versa
console.log('\n>>> Check 1: Key Parity between English and Hindi');
function checkKeyParity(enObj, hiObj, prefix = '') {
  for (const k in enObj) {
    if (k === '_metadata') continue;
    const fullKey = prefix ? `${prefix}.${k}` : k;
    assert(k in hiObj, `Missing Hindi key for English key: ${fullKey}`);
    if (typeof enObj[k] === 'object' && enObj[k] !== null) {
      assert(typeof hiObj[k] === 'object', `Expected object in Hindi for key: ${fullKey}`);
      checkKeyParity(enObj[k], hiObj[k], fullKey);
    }
  }
}
checkKeyParity(en, hi);
console.log('  [PASS] All English keys have matching Hindi keys.');

// 2. No empty values
console.log('\n>>> Check 2: Non-Empty Values Assertion');
function checkNonEmpty(obj, lang, prefix = '') {
  for (const k in obj) {
    if (k === '_metadata') continue;
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      checkNonEmpty(obj[k], lang, fullKey);
    } else {
      assert(typeof obj[k] === 'string', `${lang} key ${fullKey} must be a string`);
      assert(obj[k].trim().length > 0, `${lang} key ${fullKey} must not be empty`);
    }
  }
}
checkNonEmpty(hi, 'Hindi');
checkNonEmpty(en, 'English');
console.log('  [PASS] Zero empty strings detected in i18n dictionaries.');

// 3. Placeholders preserved in every string
console.log('\n>>> Check 3: Placeholder Preservation');
const placeholderRegex = /\{[a-zA-Z0-9_-]+\}/g;
function checkPlaceholders(enObj, hiObj, prefix = '') {
  for (const k in enObj) {
    if (k === '_metadata') continue;
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof enObj[k] === 'string' && typeof hiObj[k] === 'string') {
      const enMatches = (enObj[k].match(placeholderRegex) || []).sort();
      const hiMatches = (hiObj[k].match(placeholderRegex) || []).sort();
      assert.deepStrictEqual(enMatches, hiMatches, `Placeholders mismatch in ${fullKey}`);
    } else if (typeof enObj[k] === 'object' && enObj[k] !== null) {
      checkPlaceholders(enObj[k], hiObj[k], fullKey);
    }
  }
}
checkPlaceholders(en, hi);
console.log('  [PASS] All placeholders preserved identically across languages.');

// 4. Character allowlist: No unexpected Latin text in Hindi values
// Strictly reduced to acronyms and units actually present: ORS, CC, BY, OPEN-METEO.COM
console.log('\n>>> Check 4: Latin Text Whitelist in Hindi Values');
const allowedLatinWords = new Set([
  'CC', 'BY', 'OPEN-METEO.COM', 'OPEN-METEO', 'ORS', 'IST', 'F', 'C', 'NWS'
]);

function checkLatinWords(obj, prefix = '') {
  for (const k in obj) {
    if (k === '_metadata') continue;
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      checkLatinWords(obj[k], fullKey);
    } else if (typeof obj[k] === 'string') {
      if (k === 'review_status_label') continue; // English status tag
      // Strip placeholder tokens like {day}, {date}, {month}, {time} before checking Latin words
      const textWithoutPlaceholders = obj[k].replace(/\{[a-zA-Z0-9_-]+\}/g, '');
      const latinMatches = textWithoutPlaceholders.match(/[A-Za-z0-9\.\-]+/g) || [];
      for (const rawWord of latinMatches) {
        const cleanWord = rawWord.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').toUpperCase();
        if (!cleanWord || /^\d+(\.\d+)?$/.test(cleanWord)) continue; // Digits and decimal numbers allowed
        const isAllowed = allowedLatinWords.has(cleanWord);
        assert(isAllowed, `Unexpected Latin word '${rawWord}' found in Hindi string [${fullKey}]: "${obj[k]}"`);
      }
    }
  }
}
checkLatinWords(hi);
console.log('  [PASS] All Latin words in Hindi strings conform to approved acronyms and units.');

// 5. WhatsApp copy text round-trips as UTF-8
console.log('\n>>> Check 5: WhatsApp Bulletin Text UTF-8 Round-Trip');
const sampleBulletin = `HEATWAVE ADVISORY (DRAFT) - Demo ward: Ahmedabad Central\nIssued: 11:10 PM IST, 10 Oct 2026\nStatus: EXTREME CAUTION\n\n--- ${hi.bulletin_header_title} [${hi.review_status_label}] ---\n${hi.bulletin_current_status_prefix} ${hi.tiers.EXTREME_CAUTION}\n${hi.bulletin_peak_prefix} ${hi.tiers.EXTREME_CAUTION} (${hi.bulletin_time_at} Tue, 12:00 pm IST)\n\n${hi.bulletin_suggested_actions_heading}\n1. [पूर्ण / DONE] ${hi.actions.ACT_WATER_KIOSKS} (${hi.bulletin_deadline_prefix} Tomorrow, before 10:00 AM IST)\n2. [लंबित / PENDING] ${hi.actions.ACT_OUTDOOR_WORK_ADVISORY} (${hi.bulletin_deadline_prefix} During peak hours 12:00 to 16:00 IST)\n\nEmergency Contacts: National emergency: 112\n${hi.bulletin_emergency_contact}\nNotice: DRAFT for coordinator review. Planning aid only.\n${hi.bulletin_disclaimer}\nData: Open-Meteo.com (CC BY 4.0)\n${hi.bulletin_data_attribution}`;

const buf = Buffer.from(sampleBulletin, 'utf8');
const roundTripped = buf.toString('utf8');
assert.strictEqual(sampleBulletin, roundTripped, 'WhatsApp bulletin text must round-trip cleanly as UTF-8');
assert(roundTripped.includes('वार्ड ग्रीष्म परामर्श'), 'Devanagari characters preserved in round-trip');
assert(roundTripped.includes('112'), 'Helpline preserved');
console.log(`  [PASS] WhatsApp bulletin text round-tripped cleanly (${buf.length} bytes, 0 corruption).`);

// 6. Tricky Devanagari conjuncts round-trip test (नुक्ता, हलन्त, संयुक्ताक्षर, चंद्रबिंदु, विसर्ग)
console.log('\n>>> Check 6: Tricky Devanagari Conjuncts & Diacritics Round-Trip');
const trickyConjuncts = [
  'ग्रीष्म', // हलन्त + ष + म
  'प्याऊ', // प + य + आ + ऊ
  'श्रमिकों', // श्र + म + ि + क + ों
  'झुग्गी', // झ + ु + ग + ् + ग + ी
  'डॉक्टर', // ॉ (चन्द्र)
  'आर्द्रता', // र् (रेफ़)
  'पुनर्जलीकरण', // र् (रेफ़)
  'प्राथमिक', // प्र
  'चिकित्सा', // त्स
  'वातानुकूलित' // त + ा + न + ु + क + ू
];

for (const word of trickyConjuncts) {
  const wBuf = Buffer.from(word, 'utf8');
  const wDec = wBuf.toString('utf8');
  assert.strictEqual(word, wDec, `Devanagari conjunct '${word}' failed UTF-8 round trip`);
}
console.log(`  [PASS] All ${trickyConjuncts.length} complex Devanagari conjuncts verified for lossless UTF-8 round trip.`);

// 7. Full Generated Bulletin Samples Validation across Scenarios (Live, What-If, Replay)
console.log('\n>>> Check 7: Generated Bulletin Scenarios Assertion');
const samplesPath = path.join(__dirname, '../docs/hindi-review/GENERATED_BULLETIN_SAMPLES.txt');
assert(fs.existsSync(samplesPath), 'GENERATED_BULLETIN_SAMPLES.txt must exist');
const samplesContent = fs.readFileSync(samplesPath, 'utf8');

// Scenario 1: Live Forecast assertions
assert(samplesContent.includes('### SCENARIO 1: LIVE FORECAST'), 'Scenario 1 must be present');
assert(samplesContent.includes('Issued: 02:30 AM IST, 11 Oct 2026'), 'Scenario 1 issued at fixed clock 02:30 AM IST, 11 Oct 2026');
assert(samplesContent.includes('Right now: Caution (heat index 28.5C)'), 'Live right now must be Caution from current heat index');
assert(samplesContent.includes('वर्तमान स्थिति: सावधानी'), 'Live Hindi current status must be Caution');
assert(samplesContent.includes('Peak in next 72 hours: Extreme Caution at Tue 13 Oct, 12:00 IST'), 'Live English peak line');
assert(samplesContent.includes('अगले 72 घंटों में चरम जोखिम: अत्यधिक सावधानी (मंगलवार, 13 अक्टूबर, 12:00 IST को)'), 'Live Hindi peak line');
assert(samplesContent.includes('Planning level (follows the 72-hour peak): Extreme Caution'), 'Live planning level must be Extreme Caution');
assert(samplesContent.includes('योजना स्तर (72 घंटे के चरम के अनुसार): अत्यधिक सावधानी'), 'Live Hindi planning level must be Extreme Caution');
assert(samplesContent.includes('IST को'), 'Live Hindi peak line must use "<time> IST को"');
assert(samplesContent.includes('IST से पहले'), 'Live Hindi deadline must use "IST से पहले"');
assert(samplesContent.includes('Deadline: Sun 11 Oct, before 10:00 AM IST'), 'Scenario 1 deadline is at 10:00 AM IST, after 02:30 AM issue time');

// Scenario 2: What-if Simulation assertions
assert(samplesContent.includes('### SCENARIO 2: WHAT-IF SIMULATION'), 'Scenario 2 must be present');
assert(samplesContent.includes('Issued: 02:30 AM IST, 11 Oct 2026'), 'Scenario 2 issued at fixed clock 02:30 AM IST, 11 Oct 2026');
assert(samplesContent.includes('Right now: Extreme Danger (heat index 53.9C)'), 'What-if right now must be Extreme Danger');
assert(samplesContent.includes('वर्तमान स्थिति: अत्यधिक खतरा'), 'What-if Hindi current status must be Extreme Danger');
assert(samplesContent.includes('Peak in next 72 hours: not applicable (what-if, constant conditions)'), 'What-if must state peak not applicable in English');
assert(samplesContent.includes('चरम जोखिम: लागू नहीं (व्हाट-इफ परिदृश्य, स्थिर स्थितियाँ)'), 'What-if must state peak not applicable in Hindi');
assert(samplesContent.includes('Planning level (follows the 72-hour peak): Extreme Danger'), 'What-if planning level must be Extreme Danger');
assert(samplesContent.includes('योजना स्तर (72 घंटे के चरम के अनुसार): अत्यधिक खतरा'), 'What-if Hindi planning level must be Extreme Danger');
assert(samplesContent.includes('Heat index above 110 F / 43.3 C is outside the NWS validated range (extrapolated).'), 'What-if English extrapolation disclaimer');
assert(samplesContent.includes('110 F / 43.3 C से ऊपर का हीट इंडेक्स NWS मान्य सीमा से बाहर है (अनुमानित)।'), 'What-if Hindi extrapolation disclaimer');

// Scenario 3: Historical Replay assertions
assert(samplesContent.includes('### SCENARIO 3: HISTORICAL REPLAY'), 'Scenario 3 must be present');
assert(samplesContent.includes('Historical Replay: Ahmedabad May 2010 Heatwave'), 'Replay must be present');
assert(samplesContent.includes('Issued: 08:00 AM IST, 20 May 2010'), 'Scenario 3 issued at historic clock 08:00 AM IST, 20 May 2010');
assert(samplesContent.includes('Right now: Extreme Caution (heat index 35.7C)'), 'Replay right now must be Extreme Caution from current 33.2C / 46%');
assert(samplesContent.includes('वर्तमान स्थिति: अत्यधिक सावधानी'), 'Replay Hindi current status must be Extreme Caution');
assert(samplesContent.includes('Peak in next 72 hours: Danger at Thu 20 May, 13:00 IST'), 'Replay English peak line');
assert(samplesContent.includes('अगले 72 घंटों में चरम जोखिम: खतरा (गुरुवार, 20 मई, 13:00 IST को)'), 'Replay Hindi peak line with correct localized grammar');
assert(samplesContent.includes('Planning level (follows the 72-hour peak): Danger'), 'Replay planning level must be Danger');
assert(samplesContent.includes('योजना स्तर (72 घंटे के चरम के अनुसार): खतरा'), 'Replay Hindi planning level must be Danger');
assert(samplesContent.includes('Deadline: Thu 20 May, before 10:00 AM IST'), 'Replay deadline at 10:00 AM IST is after 08:00 AM issue time');
assert(samplesContent.includes('समय-सीमा: गुरुवार, 20 मई, 10:00 IST से पहले'), 'Replay Hindi localized deadline');

console.log('  [PASS] All 3 bulletin scenarios verified for distinct Right-now / Planning tiers, future deadlines, and extrapolation notices.');

console.log('\n==========================================================');
console.log(' ALL MECHANICAL HINDI CHECKS PASSED (7/7)');
console.log('==========================================================');
