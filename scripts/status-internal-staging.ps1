param([string]$EnvironmentFile = "deploy\staging.internal.env")

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repositoryRoot
if (-not (Test-Path $EnvironmentFile)) { throw "$EnvironmentFile does not exist." }

$env:STAGING_ENV_FILE = $EnvironmentFile
$compose = @("compose", "--env-file", $EnvironmentFile, "-f", "compose.staging.internal.yml")
& docker @compose ps
if ($LASTEXITCODE -ne 0) { throw "Unable to read the staging service status." }

$settings = @{}
Get-Content $EnvironmentFile | Where-Object { $_ -match "^[A-Z][A-Z0-9_]*=" } | ForEach-Object {
  $key, $value = $_ -split "=", 2
  $settings[$key] = $value
}
$baseUrl = "http://$($settings.APP_BIND_ADDRESS):$($settings.APP_PORT)"
foreach ($endpoint in @("healthz", "readyz")) {
  $response = Invoke-WebRequest -Uri "$baseUrl/$endpoint" -UseBasicParsing -TimeoutSec 10
  Write-Host "$endpoint HTTP $($response.StatusCode)"
}
Write-Host "Staging URL: $baseUrl"
