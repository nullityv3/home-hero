# Deploy all Supabase Edge Functions
# Usage: .\deploy.ps1 [function-name]
# If no function name is provided, all functions will be deployed

param(
    [string]$FunctionName
)

$functions = @(
    "create-job",
    "list-jobs",
    "express-interest",
    "choose-hero",
    "send-chat"
)

if ([string]::IsNullOrEmpty($FunctionName)) {
    Write-Host "Deploying all functions..." -ForegroundColor Green
    foreach ($func in $functions) {
        Write-Host "Deploying $func..." -ForegroundColor Yellow
        supabase functions deploy $func
    }
    Write-Host "All functions deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "Deploying $FunctionName..." -ForegroundColor Yellow
    supabase functions deploy $FunctionName
    Write-Host "$FunctionName deployed successfully!" -ForegroundColor Green
}
