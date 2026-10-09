param(
    [string]$DeployFrontend = "false",
    [string]$BudgetEmail = "",
    [string]$Region = "ap-south-1",
    [string]$StackName = "heatshield-app"
)

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " HeatShield Deployment Automation" -ForegroundColor Cyan
Write-Host " Stack Name:       $StackName"
Write-Host " Region:           $Region"
Write-Host " DeployFrontend:   $DeployFrontend"
Write-Host "========================================="

# 1. Build serverless artifact
Write-Host "`n[1/4] Running sam build..." -ForegroundColor Yellow
sam build --no-use-container

# 2. Deploy CloudFormation stack via SAM
Write-Host "`n[2/4] Deploying stack via sam deploy..." -ForegroundColor Yellow
$paramOverrides = "DeployFrontend=$DeployFrontend"
if ($BudgetEmail -ne "") {
    $paramOverrides += " BudgetNotificationEmail=$BudgetEmail"
}

sam deploy `
    --stack-name $StackName `
    --region $Region `
    --resolve-s3 `
    --capabilities CAPABILITY_IAM `
    --parameter-overrides $paramOverrides `
    --no-confirm-changeset

# 3. Retrieve Stack Outputs
Write-Host "`n[3/4] Fetching stack outputs..." -ForegroundColor Yellow
$outputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" | ConvertFrom-Json

$apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "HttpApiUrl" }).OutputValue
$cfUrl = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontUrl" }).OutputValue
$bucketName = ($outputs | Where-Object { $_.OutputKey -eq "FrontendBucketName" }).OutputValue

Write-Host "Direct API URL:      $apiUrl" -ForegroundColor Green
if ($cfUrl) {
    Write-Host "CloudFront URL:      $cfUrl" -ForegroundColor Green
}

# 4. Sync frontend if enabled
if ($DeployFrontend -eq "true" -and $bucketName) {
    Write-Host "`n[4/4] Syncing frontend static files to S3 ($bucketName)..." -ForegroundColor Yellow
    aws s3 sync frontend/ "s3://$bucketName" --delete
    Write-Host "Frontend sync complete!" -ForegroundColor Green
} else {
    Write-Host "`n[4/4] Frontend deployment skipped (DeployFrontend=$DeployFrontend)" -ForegroundColor Gray
}

Write-Host "`n>>> Deployment complete!" -ForegroundColor Cyan
