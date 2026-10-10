import subprocess
import os
import sys

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_path):
    edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

print(f"Edge binary: {edge_path}")
target_url = sys.argv[1] if len(sys.argv) > 1 else "https://d2ijd5tuo68h8.cloudfront.net"
print(f"Target URL: {target_url}")

os.makedirs("scratch", exist_ok=True)
os.makedirs("docs/evidence", exist_ok=True)

widths = [360, 768, 1280]
all_passed = True

for w in widths:
    print(f"\n==========================================")
    print(f"Testing viewport width: {w}px")
    print(f"==========================================")
    
    dump_path = f"scratch/dom-live-{w}.html"
    ss_path = os.path.abspath(f"docs/evidence/ui-viewport-{w}px.png")
    
    cmd = [
        edge_path,
        "--headless",
        "--disable-gpu",
        f"--window-size={w},900",
        "--virtual-time-budget=8000",
        f"--screenshot={ss_path}",
        "--dump-dom",
        target_url
    ]
    
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='ignore')
    
    dom = proc.stdout
    with open(dump_path, 'w', encoding='utf-8') as f:
        f.write(dom)
        
    print(f"  DOM length: {len(dom)} chars")
    
    # 1. Actions rendered
    if 'class="action-card' in dom:
        print("  [PASS] At least one action card rendered.")
    else:
        print("  [FAIL] No action-card elements found in DOM.")
        all_passed = False
        
    # 2. Absence of "Unable to reach server"
    if "Unable to reach server" in dom:
        print("  [FAIL] 'Unable to reach server' error message is present in DOM.")
        all_passed = False
    else:
        print("  [PASS] 'Unable to reach server' is ABSENT.")
        
    # 3. Absence of 1970 timestamp bug
    if "1970" in dom:
        print("  [FAIL] '1970' timestamp bug detected in DOM.")
        all_passed = False
    else:
        print("  [PASS] '1970' timestamp is ABSENT.")
        
    # 4. Right Now and Peak tier presence
    if ("Right now:" in dom or "RIGHT NOW" in dom) and ("Peak" in dom or "PEAK" in dom):
        print("  [PASS] Right-now and peak risk indications present.")
    else:
        print("  [FAIL] Missing right-now or peak tier indicators.")
        all_passed = False
        
    # 5. Status pill
    if 'id="datasource-badge"' in dom and ("Live data" in dom or "Saved data" in dom or "Offline sample" in dom):
        print("  [PASS] Truthful status pill rendered with valid state.")
    else:
        print("  [FAIL] Status pill missing or in invalid state.")
        all_passed = False
        
    # 6. DRAFT notice
    if "DRAFT for coordinator review" in dom:
        print("  [PASS] DRAFT review banner present.")
    else:
        print("  [FAIL] DRAFT review banner missing.")
        all_passed = False
        
    # 7. Open-Meteo attribution
    if "Open-Meteo" in dom:
        print("  [PASS] Open-Meteo attribution present.")
    else:
        print("  [FAIL] Open-Meteo attribution missing.")
        all_passed = False

    if os.path.exists(ss_path) and os.path.getsize(ss_path) > 0:
        print(f"  [PASS] Viewport screenshot saved ({os.path.getsize(ss_path)} bytes): {ss_path}")
    else:
        print(f"  [WARN] Screenshot was not created.")

print("\n==========================================")
if all_passed:
    print("ALL LIVE BROWSER DOM CHECKS PASSED.")
    sys.exit(0)
else:
    print("SOME LIVE BROWSER DOM CHECKS FAILED.")
    sys.exit(1)
