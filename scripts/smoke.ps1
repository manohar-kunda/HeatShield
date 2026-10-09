param(
    [Parameter(Mandatory=$true)]
    [string]$BaseUrl
)

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " HeatShield End-to-End Smoke Verification" -ForegroundColor Cyan
Write-Host " Target URL: $BaseUrl"
Write-Host "========================================="

# 1. Health check
Write-Host "`n[1/4] Testing GET /api/health..." -ForegroundColor Yellow
$healthUrl = "$BaseUrl/api/health"
$health = Invoke-RestMethod -Uri $healthUrl -Method Get
Write-Host "Status: $($health.status), Service: $($health.service), SnapStart: $($health.snapStartSupported)" -ForegroundColor Green

# 2. POST assessment
Write-Host "`n[2/4] Testing POST /api/assessments..." -ForegroundColor Yellow
$postUrl = "$BaseUrl/api/assessments"
$postBody = @{
    wardId = "WARD_SMOKE_TEST"
    wardName = "Verification Ward"
    temperatureC = 37.5
    humidityPct = 60.0
} | ConvertTo-Json

$assessment = Invoke-RestMethod -Uri $postUrl -Method Post -ContentType "application/json" -Body $postBody
Write-Host "Assessment created: ID=$($assessment.assessmentId)" -ForegroundColor Green
Write-Host "Calculated Heat Index: $($assessment.heatIndex.heatIndexC)°C ($($assessment.heatIndex.heatIndexF)°F)" -ForegroundColor Green
Write-Host "Operational Tier: $($assessment.operationalTier)" -ForegroundColor Green
Write-Host "Actions Generated: $($assessment.actions.Count)" -ForegroundColor Green

# 3. GET forecast / assessment
Write-Host "`n[3/4] Testing GET /api/forecast?wardId=WARD_SMOKE_TEST..." -ForegroundColor Yellow
$getUrl = "$BaseUrl/api/forecast?wardId=WARD_SMOKE_TEST"
$fetched = Invoke-RestMethod -Uri $getUrl -Method Get
Write-Host "Fetched wardId: $($fetched.wardId) with $($fetched.actions.Count) actions" -ForegroundColor Green

# 4. PATCH action status
Write-Host "`n[4/4] Testing PATCH /api/actions/ACT_WATER_KIOSKS..." -ForegroundColor Yellow
$actionId = $assessment.actions[0].actionId
$patchUrl = "$BaseUrl/api/actions/$actionId`?wardId=WARD_SMOKE_TEST"
$patchBody = @{
    status = "COMPLETED"
    note = "Verified via automated smoke script"
} | ConvertTo-Json

$updated = Invoke-RestMethod -Uri $patchUrl -Method Patch -ContentType "application/json" -Body $patchBody
Write-Host "Action $actionId status updated to: $($updated.status)" -ForegroundColor Green

Write-Host "`n>>> All smoke tests PASSED successfully against $BaseUrl!" -ForegroundColor Cyan
