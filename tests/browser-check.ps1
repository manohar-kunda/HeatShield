param(
    [string]$TargetUrl = "",
    [string]$ScreenshotDir = "docs/evidence"
)

$ErrorActionPreference = "Stop"

# Find Edge or Chrome
$browser = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $browser)) {
    $browser = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}
if (-not (Test-Path $browser)) {
    $browser = "C:\Program Files\Google\Chrome\Application\chrome.exe"
}

if (-not (Test-Path $browser)) {
    Write-Error "No Edge or Chrome browser executable found."
    exit 1
}

Write-Host "Using browser: $browser"

if (-not $TargetUrl) {
    # Default to local file path
    $resolved = (Resolve-Path "frontend/index.html").Path.Replace("\", "/")
    $TargetUrl = "file:///$resolved"
}

Write-Host "Target URL: $TargetUrl"
New-Item -ItemType Directory -Force -Path $ScreenshotDir | Out-Null
New-Item -ItemType Directory -Force -Path "scratch" | Out-Null

$widths = @(360, 768, 1280)
$allPassed = $true

foreach ($w in $widths) {
    Write-Host "`n=========================================="
    Write-Host "Checking viewport width: ${w}px"
    Write-Host "=========================================="
    
    $dumpFile = "scratch/dom-$w.html"
    $ssFile = "$ScreenshotDir/ui-viewport-${w}px.png"
    
    # Run headless browser with window-size and virtual time budget
    & $browser --headless --disable-gpu --window-size="$w,900" --virtual-time-budget=6000 --screenshot="$ssFile" --dump-dom "$TargetUrl" | Out-File -FilePath $dumpFile -Encoding utf8
    
    if (-not (Test-Path $dumpFile)) {
        Write-Error "Failed to dump DOM for width $w"
        $allPassed = $false
        continue
    }
    
    $dom = Get-Content $dumpFile -Raw
    
    # 1. Check for action items rendered
    if ($dom -match 'class="action-item"') {
        Write-Host "  [PASS] At least one action card rendered." -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] No action-item elements found in DOM." -ForegroundColor Red
        $allPassed = $false
    }
    
    # 2. Check absence of "Unable to reach server"
    if ($dom -match "Unable to reach server") {
        Write-Host "  [FAIL] 'Unable to reach server' error message is present in DOM." -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "  [PASS] 'Unable to reach server' is ABSENT." -ForegroundColor Green
    }
    
    # 3. Check absence of 1970 timestamp bug
    if ($dom -match "1970") {
        Write-Host "  [FAIL] '1970' timestamp bug detected in DOM." -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "  [PASS] '1970' timestamp is ABSENT." -ForegroundColor Green
    }
    
    # 4. Check Right Now & Peak Tier presence
    if ($dom -match "RIGHT NOW" -and $dom -match "TODAY'S PEAK") {
        Write-Host "  [PASS] Both 'RIGHT NOW' and 'TODAY'S PEAK' sections present." -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Missing 'RIGHT NOW' or 'TODAY'S PEAK'." -ForegroundColor Red
        $allPassed = $false
    }
    
    # 5. Check Data Source status pill presence
    if ($dom -match 'id="status-pill"') {
        Write-Host "  [PASS] Status pill element present." -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Status pill element missing." -ForegroundColor Red
        $allPassed = $false
    }
    
    # 6. Check for DRAFT banner
    if ($dom -match "DRAFT for coordinator review") {
        Write-Host "  [PASS] DRAFT review banner present." -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] DRAFT review banner missing." -ForegroundColor Red
        $allPassed = $false
    }
    
    # 7. Check for Open-Meteo attribution
    if ($dom -match "Open-Meteo") {
        Write-Host "  [PASS] Open-Meteo attribution present." -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Open-Meteo attribution missing." -ForegroundColor Red
        $allPassed = $false
    }

    if (Test-Path $ssFile) {
        Write-Host "  [PASS] Viewport screenshot saved: $ssFile" -ForegroundColor Green
    }
}

Write-Host "`n=========================================="
if ($allPassed) {
    Write-Host "ALL BROWSER DOM CHECKS PASSED SUCCESSFULLY." -ForegroundColor Green
    exit 0
} else {
    Write-Host "SOME BROWSER DOM CHECKS FAILED." -ForegroundColor Red
    exit 1
}
