param(
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "https://d2ijd5tuo68h8.cloudfront.net"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " HeatShield Comprehensive Live Verification Protocol" -ForegroundColor Cyan
Write-Host " Target URL: $BaseUrl" -ForegroundColor Cyan
Write-Host " Time:       $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')" -ForegroundColor Cyan
Write-Host "=========================================================="

$totalChecks = 0
$passedChecks = 0
$failedChecks = 0

function Report-Check {
    param(
        [string]$Name,
        [bool]$Success,
        [string]$Details
    )
    $script:totalChecks++
    if ($Success) {
        $script:passedChecks++
        Write-Host " [PASS] $Name - $Details" -ForegroundColor Green
    } else {
        $script:failedChecks++
        Write-Host " [FAIL] $Name - $Details" -ForegroundColor Red
    }
}

# --- 1. HTML Content Checks (Required strings present, Forbidden strings absent) ---
Write-Host "`n>>> [1/7] HTML Content & Disclaimer Verification" -ForegroundColor Yellow
try {
    $indexResponse = Invoke-WebRequest -Uri "$BaseUrl/" -Method Get -UseBasicParsing
    $rawHtml = $indexResponse.Content
    $statusCode = $indexResponse.StatusCode

    Report-Check "Root URL Status" ($statusCode -eq 200) "HTTP $statusCode"

    # Required strings
    $requiredStrings = @(
        "Suggested Ward Action Playbook",
        "DRAFT",
        "Open-Meteo.com",
        "Demo ward:",
        "Reset Demo",
        "National emergency: <strong>112</strong>",
        "DRAFT Ward Heat Advisory (illustrative)",
        "PENDING HUMAN REVIEW",
        "Replay: Ahmedabad, May 2010 heatwave",
        "Retrospective illustration only"
    )

    foreach ($req in $requiredStrings) {
        $found = $rawHtml.Contains($req)
        Report-Check "Required string '$req'" $found "Present in HTML: $found"
    }

    # Replay provenance truth assertions: 44.2 forbidden, 45.4 required
    $has454 = $rawHtml.Contains("45.4")
    Report-Check "Live HTML requires '45.4'" $has454 "Present in HTML: $has454"
    $has442 = $rawHtml.Contains("44.2")
    Report-Check "Live HTML forbids '44.2'" (-not $has442) "Absent from HTML: $(-not $has442)"

    # Forbidden strings
    $forbiddenStrings = @(
        "Mandatory Ward",
        "1916",
        "Issued under",
        "MUNICIPAL WARD HEATWAVE ACTION NOTICE",
        "Severe Heatwave",
        "docs/ACCESSIBILITY.md",
        "sin((hour-9)"
    )

    foreach ($forb in $forbiddenStrings) {
        $found = $rawHtml.Contains($forb)
        Report-Check "Forbidden string '$forb' absent" (-not $found) "Absent from HTML: $(-not $found)"
    }

    # Verify app.js and i18n/hi.json for 44.2 absence
    try {
        $appJsContent = (Invoke-WebRequest -Uri "$BaseUrl/app.js" -Method Get -UseBasicParsing).Content
        $appJsHas442 = $appJsContent.Contains("44.2")
        Report-Check "Live app.js forbids '44.2'" (-not $appJsHas442) "Absent from app.js: $(-not $appJsHas442)"

        $hiJsonContent = (Invoke-WebRequest -Uri "$BaseUrl/i18n/hi.json" -Method Get -UseBasicParsing).Content
        $hiJsonHas442 = $hiJsonContent.Contains("44.2")
        Report-Check "Live i18n/hi.json forbids '44.2'" (-not $hiJsonHas442) "Absent from hi.json: $(-not $hiJsonHas442)"

        # 24-hour and extrapolation assertions
        $appJsHasAmIst = $appJsContent.Contains("AM IST")
        Report-Check "Live app.js forbids 'AM IST'" (-not $appJsHasAmIst) "Absent from app.js: $(-not $appJsHasAmIst)"

        $appJsHasPmIst = $appJsContent.Contains("PM IST")
        Report-Check "Live app.js forbids 'PM IST'" (-not $appJsHasPmIst) "Absent from app.js: $(-not $appJsHasPmIst)"

        $hiJsonHasAmIst = $hiJsonContent.Contains("AM IST")
        Report-Check "Live i18n/hi.json forbids 'AM IST'" (-not $hiJsonHasAmIst) "Absent from hi.json: $(-not $hiJsonHasAmIst)"

        $hiJsonHasPmIst = $hiJsonContent.Contains("PM IST")
        Report-Check "Live i18n/hi.json forbids 'PM IST'" (-not $hiJsonHasPmIst) "Absent from hi.json: $(-not $hiJsonHasPmIst)"

        $appJsHasOldExtrap = $appJsContent.Contains("Heat index above 110")
        Report-Check "Live app.js forbids 'Heat index above 110'" (-not $appJsOldExtrap) "Absent from app.js: $(-not $appJsHasOldExtrap)"

        $hiJsonHasOldExtrap = $hiJsonContent.Contains("Heat index above 110")
        Report-Check "Live i18n/hi.json forbids 'Heat index above 110'" (-not $hiJsonHasOldExtrap) "Absent from hi.json: $(-not $hiJsonHasOldExtrap)"

        $enJsonContent = (Invoke-WebRequest -Uri "$BaseUrl/i18n/en.json" -Method Get -UseBasicParsing).Content
        $enJsonHasOldExtrap = $enJsonContent.Contains("Heat index above 110")
        Report-Check "Live i18n/en.json forbids 'Heat index above 110'" (-not $enJsonHasOldExtrap) "Absent from en.json: $(-not $enJsonHasOldExtrap)"

        $enJsonHasNewExtrap = $enJsonContent.Contains("Air temperature above 110 F")
        Report-Check "Live i18n/en.json requires 'Air temperature above 110 F'" $enJsonHasNewExtrap "Present in en.json: $enJsonHasNewExtrap"
    } catch {
        Report-Check "Live asset provenance check" $false $_.Exception.Message
    }
} catch {
    Report-Check "HTML Content Fetch" $false $_.Exception.Message
}

# --- 2. Cache-Control Header Checks ---
Write-Host "`n>>> [2/7] Cache-Control Header Verification" -ForegroundColor Yellow
try {
    $curlRoot = curl.exe -sI "$BaseUrl/"
    $rootCCMatch = [bool]($curlRoot | Select-String -Pattern "cache-control" -CaseSensitive:$false)
    $rootCCStr = ($curlRoot | Select-String -Pattern "cache-control" -CaseSensitive:$false) -join "; "
    Report-Check "Root / Cache-Control" $rootCCMatch "Header: $rootCCStr"

    $curlSw = curl.exe -sI "$BaseUrl/sw.js"
    $swCCMatch = [bool]($curlSw | Select-String -Pattern "cache-control" -CaseSensitive:$false)
    $swCCStr = ($curlSw | Select-String -Pattern "cache-control" -CaseSensitive:$false) -join "; "
    Report-Check "/sw.js Cache-Control" $swCCMatch "Header: $swCCStr"
} catch {
    Report-Check "Cache-Control Verification" $false $_.Exception.Message
}

# --- 3. Security Headers Checks ---
Write-Host "`n>>> [3/7] Security Headers Verification" -ForegroundColor Yellow
try {
    $headersCheck = curl.exe -sI "$BaseUrl/"
    
    $hasCsp = ($headersCheck | Select-String -Pattern "content-security-policy" -CaseSensitive:$false) -ne $null
    $hasXcto = ($headersCheck | Select-String -Pattern "x-content-type-options" -CaseSensitive:$false) -ne $null
    $hasFrame = ($headersCheck | Select-String -Pattern "x-frame-options" -CaseSensitive:$false) -ne $null
    $hasHsts = ($headersCheck | Select-String -Pattern "strict-transport-security" -CaseSensitive:$false) -ne $null
    $hasReferrer = ($headersCheck | Select-String -Pattern "referrer-policy" -CaseSensitive:$false) -ne $null

    Report-Check "Header Content-Security-Policy" $hasCsp "Found: $hasCsp"
    Report-Check "Header X-Content-Type-Options" $hasXcto "Found: $hasXcto"
    Report-Check "Header X-Frame-Options" $hasFrame "Found: $hasFrame"
    Report-Check "Header Strict-Transport-Security" $hasHsts "Found: $hasHsts"
    Report-Check "Header Referrer-Policy" $hasReferrer "Found: $hasReferrer"
} catch {
    Report-Check "Security Headers Check" $false $_.Exception.Message
}

# --- 4. Main Smoke Flow Verification ---
Write-Host "`n>>> [4/7] End-to-End API Smoke Flow" -ForegroundColor Yellow
$smokeWs = "verify-live-" + [System.Guid]::NewGuid().ToString().Substring(0, 8)
try {
    # GET /api/health
    $healthRes = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get -Headers @{"X-Workspace-Id"=$smokeWs}
    Report-Check "GET /api/health" ($healthRes.status -eq "UP") "Status: $($healthRes.status), SnapStart: $($healthRes.snapStartSupported)"

    # POST /api/assessments
    $postBody = @{
        wardId = "DEMO_AHMEDABAD"
        wardName = "Demo ward: Ahmedabad Central (illustrative)"
        temperatureC = 38.5
        humidityPct = 55.0
    } | ConvertTo-Json

    $assessRes = Invoke-RestMethod -Uri "$BaseUrl/api/assessments" -Method Post -Body $postBody -ContentType "application/json" -Headers @{"X-Workspace-Id"=$smokeWs}
    Report-Check "POST /api/assessments" ($assessRes.assessmentId -ne $null) "Assessment ID: $($assessRes.assessmentId), Tier: $($assessRes.operationalTier)"

    # GET /api/forecast
    $forecastRes = Invoke-RestMethod -Uri "$BaseUrl/api/forecast?wardId=DEMO_AHMEDABAD" -Method Get -Headers @{"X-Workspace-Id"=$smokeWs}
    Report-Check "GET /api/forecast" ($forecastRes.actions.Count -gt 0) "Actions returned: $($forecastRes.actions.Count)"

    # PATCH /api/actions/ACT_WATER_KIOSKS
    $patchBody = @{
        status = "COMPLETED"
        note = "Verified via automated verify-live script"
    } | ConvertTo-Json

    $patchRes = Invoke-RestMethod -Uri "$BaseUrl/api/actions/ACT_WATER_KIOSKS?wardId=DEMO_AHMEDABAD" -Method Patch -Body $patchBody -ContentType "application/json" -Headers @{"X-Workspace-Id"=$smokeWs}
    Report-Check "PATCH /api/actions" ($patchRes.status -eq "COMPLETED") "Status: $($patchRes.status)"
} catch {
    Report-Check "Smoke Flow Execution" $false $_.Exception.Message
}

# --- 5. Two-Workspace Isolation Check ---
Write-Host "`n>>> [5/7] Multi-Tenant Workspace Isolation" -ForegroundColor Yellow
$wsA = "ws-iso-alpha-" + [System.Guid]::NewGuid().ToString().Substring(0, 6)
$wsB = "ws-iso-beta-" + [System.Guid]::NewGuid().ToString().Substring(0, 6)
try {
    # Initialize both with assessment
    $initBody = @{
        wardId = "DEMO_AHMEDABAD"
        wardName = "Ahmedabad Central"
        temperatureC = 37.0
        humidityPct = 50.0
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$BaseUrl/api/assessments" -Method Post -Body $initBody -ContentType "application/json" -Headers @{"X-Workspace-Id"=$wsA} | Out-Null
    Invoke-RestMethod -Uri "$BaseUrl/api/assessments" -Method Post -Body $initBody -ContentType "application/json" -Headers @{"X-Workspace-Id"=$wsB} | Out-Null

    # Mutate wsA
    $updateA = @{
        status = "IN_PROGRESS"
        note = "Alpha distinct secret note 888"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$BaseUrl/api/actions/ACT_WATER_KIOSKS?wardId=DEMO_AHMEDABAD" -Method Patch -Body $updateA -ContentType "application/json" -Headers @{"X-Workspace-Id"=$wsA} | Out-Null

    # Query both
    $queryA = Invoke-RestMethod -Uri "$BaseUrl/api/forecast?wardId=DEMO_AHMEDABAD" -Method Get -Headers @{"X-Workspace-Id"=$wsA}
    $queryB = Invoke-RestMethod -Uri "$BaseUrl/api/forecast?wardId=DEMO_AHMEDABAD" -Method Get -Headers @{"X-Workspace-Id"=$wsB}

    $actA = ($queryA.actions | Where-Object { $_.actionId -eq "ACT_WATER_KIOSKS" })
    $actB = ($queryB.actions | Where-Object { $_.actionId -eq "ACT_WATER_KIOSKS" })

    $isolated = ($actA.status -eq "IN_PROGRESS") -and ($actB.status -eq "PENDING") -and ($actB.note -ne "Alpha distinct secret note 888")
    Report-Check "Workspace Isolation" $isolated "wsA status=$($actA.status), wsB status=$($actB.status)"
} catch {
    Report-Check "Workspace Isolation" $false $_.Exception.Message
}

# --- 6. Security Input Validation: Unknown Ward ID Rejection ---
Write-Host "`n>>> [6/7] Unknown Ward Rejection (400 Bad Request)" -ForegroundColor Yellow
try {
    $maliciousBody = @{
        wardId = "UNKNOWN_UNAUTHORIZED_WARD_999"
        temperatureC = 40.0
        humidityPct = 50.0
    } | ConvertTo-Json

    $res = Invoke-WebRequest -Uri "$BaseUrl/api/assessments" -Method Post -Body $maliciousBody -ContentType "application/json" -Headers @{"X-Workspace-Id"=$smokeWs} -UseBasicParsing
    Report-Check "Unknown Ward Rejection" $false "Expected HTTP 400 but received HTTP $($res.StatusCode)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Report-Check "Unknown Ward Rejection" ($code -eq 400) "Raw status code: HTTP $code"
}

# --- 7. Privacy Filter Rejection Test Suite ---
Write-Host "`n>>> [7/7] Privacy Filter Rejection Test Suite" -ForegroundColor Yellow

# Explicitly construct Devanagari digit string from Unicode code points (U+096B = ५ repeated 5 times, followed by U+0967..0x096B = १२३४५)
$devanagariChars = @([char]0x096B, [char]0x096B, [char]0x096B, [char]0x096B, [char]0x096B, [char]0x0967, [char]0x0968, [char]0x0969, [char]0x096A, [char]0x096B)
$devanagariPhone = -join $devanagariChars
$devanagariHex = ($devanagariChars | ForEach-Object { "U+{0:X4}" -f [int]$_ }) -join " "

$privacyTestItems = @(
    @{ Name = "ASCII phone with space (55555 12345)"; Value = "55555 12345" },
    @{ Name = "International prefix phone (+91-55555-12345)"; Value = "+91-55555-12345" },
    @{ Name = "Hyphenated phone (5555-123-456)"; Value = "5555-123-456" },
    @{ Name = "Devanagari 10-digit ($devanagariHex)"; Value = $devanagariPhone },
    @{ Name = "Email address (fake-test@fake-domain.invalid)"; Value = "fake-test@fake-domain.invalid" },
    @{ Name = "Coordinator email (coordinator.field@fake-municipality.invalid)"; Value = "coordinator.field@fake-municipality.invalid" },
    @{ Name = "Multiline email (hello\n fake-test@fake-domain.invalid)"; Value = "hello`n fake-test@fake-domain.invalid" },
    @{ Name = "Slash-delimited phone (55555/12345)"; Value = "55555/12345" },
    @{ Name = "Comma-delimited phone (55555,12345)"; Value = "55555,12345" },
    @{ Name = "Underscore-delimited phone (55555_12345)"; Value = "55555_12345" },
    @{ Name = "Newline-delimited phone (55555\n12345)"; Value = "55555`n12345" }
)

foreach ($item in $privacyTestItems) {
    $testName = $item.Name
    $testVal = $item.Value
    try {
        $pBodyJson = @{
            status = "COMPLETED"
            note = "Testing note: $testVal"
        } | ConvertTo-Json
        $pBodyBytes = [System.Text.Encoding]::UTF8.GetBytes($pBodyJson)

        $res = Invoke-WebRequest -Uri "$BaseUrl/api/actions/ACT_WATER_KIOSKS?wardId=DEMO_AHMEDABAD" -Method Patch -Body $pBodyBytes -ContentType "application/json; charset=utf-8" -Headers @{"X-Workspace-Id"=$smokeWs} -UseBasicParsing
        Report-Check "Privacy rejection: $testName" $false "Expected 400 but got HTTP $($res.StatusCode)"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Report-Check "Privacy rejection: $testName" ($code -eq 400) "Raw status code: HTTP $code"
    }
}

$summaryColor = "Green"
if ($failedChecks -gt 0) { $summaryColor = "Red" }
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " Verification Summary: $passedChecks / $totalChecks Checks Passed ($failedChecks Failed)" -ForegroundColor $summaryColor
Write-Host "=========================================================="
