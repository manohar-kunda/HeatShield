param(
    [string]$BaseUrl = "http://localhost:8085"
)
$r = curl.exe -s "$BaseUrl/api/forecast?wardId=WARD_12" | ConvertFrom-Json
[PSCustomObject]@{
    wardId         = $r.wardId
    wardName       = $r.wardName
    dataSource     = $r.dataSource
    tier           = $r.operationalTier
    actionCount    = $r.actions.Length
    peakTier       = $r.forecastSummary.peakTier
    maxHeatIndexC  = $r.forecastSummary.maxHeatIndexC
    firstDeadline  = $r.actions[0].deadline
} | Format-List
