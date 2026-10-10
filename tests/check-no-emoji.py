import re
import glob
import sys

# Comprehensive Unicode ranges for emoji and symbols
emoji_pattern = re.compile(
    r'[\U0001F600-\U0001F64F]'  # Emoticons
    r'|[\U0001F300-\U0001F5FF]'  # Misc Symbols and Pictographs
    r'|[\U0001F680-\U0001F6FF]'  # Transport and Map
    r'|[\U0001F1E0-\U0001F1FF]'  # Flags
    r'|[\U00002702-\U000027B0]'  # Dingbats
    r'|[\U0001F900-\U0001F9FF]'  # Supplemental Symbols and Pictographs
    r'|[\U0001FA70-\U0001FAFF]'  # Symbols and Pictographs Extended-A
    r'|[\U00002600-\U000026FF]'  # Misc symbols (sun, warning, umbrella, etc.)
    r'|[\U00002300-\U000023FF]'  # Misc Technical (watch, hourglass, etc.)
    r'|[\U00002B50]'              # Star
    r'|[\U0000203C\U00002049]'  # Double exclamation, etc.
)

target_files = glob.glob('frontend/*.*') + glob.glob('tests/*.js')
print(f"Scanning {len(target_files)} files for emoji...")

failures = 0
for fpath in target_files:
    with open(fpath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    file_matches = 0
    for idx, line in enumerate(lines, 1):
        found = emoji_pattern.findall(line)
        if found:
            print(f"  [FOUND] {fpath}:{idx}: {found} in line: {line.strip()[:60]}")
            file_matches += len(found)
    if file_matches > 0:
        print(f"FAIL: {fpath} contains {file_matches} emoji.")
        failures += file_matches
    else:
        print(f"PASS: {fpath} (0 emoji)")

if failures == 0:
    print("\nSUCCESS: 0 emoji detected across all scanned files.")
    sys.exit(0)
else:
    print(f"\nFAILURE: Total {failures} emoji detected.")
    sys.exit(1)
