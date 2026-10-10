# PowerShell script to scan codebase for sensitive data:
# 12-digit AWS account numbers, raw ARNs with account numbers, unapproved emails, samconfig.toml, and private keys.

$ErrorActionPreference = "Stop"

Write-Host "=========================================================="
Write-Host " HeatShield Pre-Commit Secret Scanner"
Write-Host "=========================================================="

$authorEmail = "manohar"
$hasViolation = $false

# 1. Check for tracked samconfig or keys
$forbiddenFiles = @("samconfig.toml", ".env", "*.pem", "*.id_rsa", "*.key")
foreach ($pat in $forbiddenFiles) {
    $found = git ls-files $pat
    if ($found) {
        Write-Host "  [FAIL] Forbidden tracked file detected: $found" -ForegroundColor Red
        $hasViolation = $true
    }
}

# 2. Check for 12-digit numbers
$trackedFiles = git ls-files
$digitPattern = "\b\d{12}\b"

foreach ($file in $trackedFiles) {
    # Skip binary files or images
    if ($file -match "\.(png|jpg|jpeg|jar|class|ico|svg|pdf)$") { continue }
    if (!(Test-Path $file)) { continue }
    
    $content = Get-Content $file -Raw -Encoding utf8 -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    # Exclude 000000000000 if used as a fake placeholder
    $matches = [regex]::Matches($content, $digitPattern)
    foreach ($m in $matches) {
        if ($m.Value -ne "000000000000") {
            Write-Host "  [FAIL] 12-digit number found in $file" -ForegroundColor Red
            $hasViolation = $true
            break
        }
    }
    
    # 3. Check for raw ARN with 12-digit account number (excluding SAM !Sub expressions)
    if ($content -match "arn:aws:[a-z0-9\-]+:[a-z0-9\-]*:\d{12}:") {
        Write-Host "  [FAIL] Raw AWS ARN with account ID found in $file" -ForegroundColor Red
        $hasViolation = $true
    }
    
    # 4. Check for external real email addresses (excluding author, placeholders like invalid/example/test)
    $emailMatches = [regex]::Matches($content, "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
    foreach ($em in $emailMatches) {
        $val = $em.Value.ToLower()
        if ($val -notmatch "invalid" -and $val -notmatch "example\.com" -and $val -notmatch "fake-" -and $val -notmatch "your_email" -and $val -notmatch "open-meteo" -and $val -notmatch "amazon" -and $val -notmatch "wemakedevs" -and $val -ne "a@b.com") {
            Write-Host "  [FAIL] Potential sensitive email found in ${file}: $val" -ForegroundColor Red
            $hasViolation = $true
            break
        }
    }
}

if ($hasViolation) {
    Write-Host "`n[FATAL] Secret scanner found violations. Aborting." -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n[PASS] No account IDs, raw ARNs, forbidden files, or sensitive emails detected." -ForegroundColor Green
    exit 0
}
