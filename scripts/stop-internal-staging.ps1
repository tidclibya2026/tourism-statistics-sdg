param([string]$EnvironmentFile = "deploy\staging.internal.env")

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repositoryRoot
if (-not (Test-Path $EnvironmentFile)) { throw "$EnvironmentFile does not exist." }

$env:STAGING_ENV_FILE = $EnvironmentFile
& docker compose --env-file $EnvironmentFile -f compose.staging.internal.yml stop app db
if ($LASTEXITCODE -ne 0) { throw "Unable to stop the staging services cleanly." }
Write-Host "Internal staging stopped. The database volume was preserved."
