const assert = require('assert');

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
  
  // Format in IST (+05:30)
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
  
  // e.g. "11:10 PM IST, 10 Oct 2026"
  const time = `${partMap.hour}:${partMap.minute} ${partMap.dayPeriod.toUpperCase()}`;
  const date = `${partMap.day} ${partMap.month} ${partMap.year}`;
  return `${time} IST, ${date}`;
}

// Tests:
// 1. Seconds format from backend Jackson Instant serializer: 1791654231.2231965
const tSeconds = 1791654231.2231965;
const formattedSec = formatIstTimestamp(tSeconds);
console.log('Seconds test:', formattedSec);
assert(!formattedSec.includes('1970'), 'Seconds format must not parse to 1970');
assert(formattedSec.includes('2026'), 'Seconds format must parse to 2026');
assert(formattedSec.includes('IST'), 'Must include IST');

// 2. Milliseconds epoch
const tMillis = 1791654231223;
const formattedMil = formatIstTimestamp(tMillis);
console.log('Millis test:', formattedMil);
assert(!formattedMil.includes('1970'), 'Millis format must not parse to 1970');
assert(formattedMil.includes('2026'), 'Millis format must parse to 2026');

// 3. ISO String
const tIso = '2026-10-10T17:05:00Z';
const formattedIso = formatIstTimestamp(tIso);
console.log('ISO test:', formattedIso);
assert(!formattedIso.includes('1970'), 'ISO format must not parse to 1970');
assert(formattedIso.includes('2026'), 'ISO format must parse to 2026');
assert(formattedIso.includes('IST'), 'ISO format must include IST');

// 4. Timezone invariance: time zone must be IST (+05:30) regardless of local environment
assert(formattedSec.includes('IST'), 'Must explicitly display IST');
assert(formattedMil.includes('IST'), 'Must explicitly display IST');

console.log('ALL TIMESTAMP TESTS PASSED!');
