<#
.SYNOPSIS
    Applies corrections from docs/hindi-review/REVIEW_SHEET.csv to frontend/i18n/hi.json.
    Strictly keeps "PENDING HUMAN REVIEW" unless explicitly executed with -ConfirmedBy and -Date parameters.

.PARAMETER ReviewSheet
    Path to the returned REVIEW_SHEET.csv. Defaults to docs/hindi-review/REVIEW_SHEET.csv.

.PARAMETER ConfirmedBy
    Reviewer role or initials confirming native review (e.g. -ConfirmedBy "Municipal Hindi Specialist (AK)").
    If omitted or empty, the status remains "PENDING HUMAN REVIEW".

.PARAMETER Date
    Date of review confirmation (e.g. -Date "2026-10-15").
#>
param(
    [string]$ReviewSheet = "docs/hindi-review/REVIEW_SHEET.csv",
    [string]$ConfirmedBy = "",
    [string]$Date = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " HeatShield Hindi Review Ingestion & Application Utility" -ForegroundColor Cyan
Write-Host "=========================================================="

if (-not (Test-Path $ReviewSheet)) {
    Write-Error "Review sheet not found at path: $ReviewSheet"
}

$hiJsonPath = "frontend/i18n/hi.json"
if (-not (Test-Path $hiJsonPath)) {
    Write-Error "Target hi.json not found at: $hiJsonPath"
}

$hiData = Get-Content $hiJsonPath -Raw -Encoding utf8 | ConvertFrom-Json

# 1. Parse CSV rows (Handling UTF-8 with or without BOM)
$csvBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $ReviewSheet))
$encoding = [System.Text.Encoding]::UTF8
if ($csvBytes.Length -ge 3 -and $csvBytes[0] -eq 0xEF -and $csvBytes[1] -eq 0xBB -and $csvBytes[2] -eq 0xBF) {
    # Skip BOM bytes
    $csvText = $encoding.GetString($csvBytes, 3, $csvBytes.Length - 3)
} else {
    $csvText = $encoding.GetString($csvBytes)
}

$rows = $csvText | ConvertFrom-Csv
$appliedCount = 0

foreach ($row in $rows) {
    $key = $row.key
    $correction = $row.suggested_correction
    $verdict = $row.reviewer_verdict

    if (-not [string]::IsNullOrWhiteSpace($correction) -and $correction -ne $row.Hindi) {
        Write-Host "Applying correction for key '$key':" -ForegroundColor Yellow
        Write-Host "  Old: $($row.Hindi)"
        Write-Host "  New: $correction"

        if ($key.StartsWith("ACT_")) {
            $hiData.actions.$key = $correction
        } elseif ($key.StartsWith("tier_")) {
            $tierName = $key.Substring(5)
            $hiData.tiers.$tierName = $correction
        } else {
            $hiData.$key = $correction
        }
        $appliedCount++
    }
}

Write-Host "`nCorrections applied: $appliedCount" -ForegroundColor Green

# 2. Status Label Logic
if (-not [string]::IsNullOrWhiteSpace($ConfirmedBy) -and -not [string]::IsNullOrWhiteSpace($Date)) {
    $newStatus = "Hindi reviewed by a native speaker ($ConfirmedBy, $Date)"
    Write-Host "[STATUS UPDATED] Reviewer confirmed. Setting status: $newStatus" -ForegroundColor Green
    $hiData._metadata.status = $newStatus
    $hiData._metadata.reviewed_by = $ConfirmedBy
    $hiData._metadata.reviewed_date = $Date
    $hiData.review_status_label = $newStatus
} else {
    Write-Host "[STATUS MAINTAINED] -ConfirmedBy and/or -Date not supplied." -ForegroundColor Yellow
    Write-Host "Status strictly remains: PENDING HUMAN REVIEW" -ForegroundColor Yellow
    $hiData._metadata.status = "PENDING HUMAN REVIEW"
    $hiData.review_status_label = "PENDING HUMAN REVIEW"
}

# 3. Save hi.json (UTF-8 without BOM)
$jsonString = $hiData | ConvertTo-Json -Depth 10
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Resolve-Path $hiJsonPath), $jsonString, $utf8NoBom)
Write-Host "Saved updated $hiJsonPath" -ForegroundColor Green

# 4. Run mechanical tests
Write-Host "`nRunning mechanical validation tests..." -ForegroundColor Cyan
& node tests/i18n-hindi-test.js
if ($LASTEXITCODE -ne 0) {
    Write-Error "Mechanical validation tests failed! Aborting."
}

Write-Host "`n[COMPLETED] Hindi review ingestion finished successfully." -ForegroundColor Green
