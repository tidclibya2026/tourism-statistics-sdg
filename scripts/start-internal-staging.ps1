param(
  [string]$EnvironmentFile = "deploy\staging.internal.env"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repositoryRoot

if (-not (Test-Path $EnvironmentFile)) {
  throw "$EnvironmentFile does not exist. Run scripts\initialize-internal-staging.ps1 first."
}

$compose = @("compose", "--env-file", $EnvironmentFile, "-f", "compose.staging.internal.yml")
$env:STAGING_ENV_FILE = $EnvironmentFile

& docker @compose config --quiet
if ($LASTEXITCODE -ne 0) { throw "Docker Compose configuration validation failed." }

& docker @compose up -d --wait db
if ($LASTEXITCODE -ne 0) { throw "The staging database did not become healthy." }

& docker @compose --profile tools run --rm migrate
if ($LASTEXITCODE -ne 0) { throw "Database migration failed; the application was not started." }

& docker @compose up -d --build --wait app
if ($LASTEXITCODE -ne 0) { throw "The staging application did not become healthy." }

$settings = @{}
Get-Content $EnvironmentFile | Where-Object { $_ -match "^[A-Z][A-Z0-9_]*=" } | ForEach-Object {
  $key, $value = $_ -split "=", 2
  $settings[$key] = $value
}
$url = "http://$($settings.APP_BIND_ADDRESS):$($settings.APP_PORT)/readyz"
$response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
if ($response.StatusCode -ne 200) { throw "Readiness endpoint returned HTTP $($response.StatusCode)." }

Write-Host "Internal staging is healthy: http://$($settings.APP_BIND_ADDRESS):$($settings.APP_PORT)"
