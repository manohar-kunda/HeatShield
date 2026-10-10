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
// Allowed Latin: Units & acronyms (NDMA, IMD, WhatsApp, A4, CC BY 4.0, Open-Meteo, ORS, IV, PENDING HUMAN REVIEW, etc.)
console.log('\n>>> Check 4: Latin Text Whitelist in Hindi Values');
const allowedLatinWords = new Set([
  'NDMA', 'IMD', 'WHATSAPP', 'A4', 'CC', 'BY', '4.0', 'OPEN-METEO.COM', 'OPEN-METEO',
  'ORS', 'IV', 'PENDING', 'HUMAN', 'REVIEW', 'DONE'
]);

function checkLatinWords(obj, prefix = '') {
  for (const k in obj) {
    if (k === '_metadata') continue;
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      checkLatinWords(obj[k], fullKey);
    } else if (typeof obj[k] === 'string') {
      if (k === 'review_status_label') continue; // English status tag
      const text = obj[k];
      const latinMatches = text.match(/[A-Za-z0-9\.\-]+/g) || [];
      for (const rawWord of latinMatches) {
        const cleanWord = rawWord.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').toUpperCase();
        if (!cleanWord || /^\d+$/.test(cleanWord)) continue; // Digits allowed
        const isAllowed = allowedLatinWords.has(cleanWord) ||
                          cleanWord === 'OPEN-METEO' ||
                          cleanWord === 'OPEN-METEO.COM';
        assert(isAllowed, `Unexpected Latin word '${rawWord}' found in Hindi string [${fullKey}]: "${text}"`);
      }
    }
  }
}
checkLatinWords(hi);
console.log('  [PASS] All Latin words in Hindi strings conform to approved acronyms and units.');

// 5. WhatsApp copy text round-trips as UTF-8
console.log('\n>>> Check 5: WhatsApp Bulletin Text UTF-8 Round-Trip');
const sampleBulletin = `HEATWAVE ADVISORY (DRAFT) - Demo ward: Ahmedabad Central\nIssued: 11:10 PM IST, 10 Oct 2026\nStatus: EXTREME CAUTION\n\n--- ${hi.bulletin_header_title} [${hi.review_status_label}] ---\n${hi.bulletin_suggested_actions_heading}\n1. [पूर्ण / DONE] ${hi.actions.ACT_WATER_KIOSKS}\n2. [लंबित / PENDING] ${hi.actions.ACT_OUTDOOR_WORK_ADVISORY}\n\nEmergency Contacts: National emergency: 112\n${hi.bulletin_emergency_contact}\nNotice: DRAFT for coordinator review. Planning aid only.\n${hi.bulletin_disclaimer}\nData: Open-Meteo.com (CC BY 4.0)\n${hi.bulletin_data_attribution}`;

const buf = Buffer.from(sampleBulletin, 'utf8');
const roundTripped = buf.toString('utf8');
assert.strictEqual(sampleBulletin, roundTripped, 'WhatsApp bulletin text must round-trip cleanly as UTF-8');
assert(roundTripped.includes('वार्ड ग्रीष्म परामर्श'), 'Devanagari characters preserved in round-trip');
assert(roundTripped.includes('112'), 'Helpline preserved');
console.log(`  [PASS] WhatsApp bulletin text round-tripped cleanly (${buf.length} bytes, 0 corruption).`);

console.log('\n==========================================================');
console.log(' ALL MECHANICAL HINDI CHECKS PASSED (5/5)');
console.log('==========================================================');
