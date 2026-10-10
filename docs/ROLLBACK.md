# Rollback & Emergency Recovery Runbook

**Project**: HeatShield — Community Heatwave Risk-to-Action Planner  
**Target Region**: ap-south-1  
**Pre-Hardening Tag**: `live-pre-hardening`  

---

## 1. Rolling Back Code & Frontend to `live-pre-hardening`

If any regression occurs during or after the hardening deploy, use the git tag to redeploy the exact pre-hardening state.

### Step 1: Check out the pre-hardening tag
```powershell
git checkout live-pre-hardening
```

### Step 2: Rebuild backend artifacts
```powershell
cd backend
mvn clean package -DskipTests=false
cd ..
```

### Step 3: Redeploy CloudFormation via SAM
```powershell
sam deploy --config-file samconfig.toml --no-confirm-changeset
```

### Step 4: Re-sync frontend assets to S3
```powershell
$BUCKET = aws cloudformation describe-stacks --stack-name heatshield-prod --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text

aws s3 sync frontend/ s3://$BUCKET/ --delete --cache-control "no-cache"
```

### Step 5: Invalidate CloudFront edge cache
```powershell
$DIST_ID = aws cloudformation describe-stacks --stack-name heatshield-prod --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text

aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

---

## 2. Emergency Detach of CloudFront Response Headers Policy

If the Content Security Policy (CSP), Strict-Transport-Security (HSTS), or X-Frame-Options headers break legitimate browser rendering, print dialogs, or API calls, detach the response headers policy immediately without a full stack rebuild.

### Option A: Via SAM Template (Recommended)
1. In `template.yaml`, locate `CloudFrontDistribution`:
   ```yaml
   DefaultCacheBehavior:
     # Comment out or remove:
     # ResponseHeadersPolicyId: !Ref SecurityHeadersPolicy
   ```
   and under `CacheBehaviors`:
   ```yaml
   - PathPattern: '/api/*'
     # Comment out or remove:
     # ResponseHeadersPolicyId: !Ref SecurityHeadersPolicy
   ```
2. Run:
   ```powershell
   sam deploy --config-file samconfig.toml --no-confirm-changeset
   ```

### Option B: Immediate In-Place AWS CLI Detach (Under 60 seconds)
1. Fetch current distribution configuration:
   ```powershell
   $DIST_ID = aws cloudformation describe-stacks --stack-name heatshield-prod --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text
   aws cloudfront get-distribution-config --id $DIST_ID > dist-config.json
   ```
2. Note the `ETag` header from the response.
3. Edit `dist-config.json` to remove the `"ResponseHeadersPolicyId"` fields from `DefaultCacheBehavior` and `/api/*` cache behaviors.
4. Update the distribution:
   ```powershell
   aws cloudfront update-distribution --id $DIST_ID --if-match <ETAG> --distribution-config file://dist-config.json
   ```
5. Invalidate edge caches:
   ```powershell
   aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
   ```
