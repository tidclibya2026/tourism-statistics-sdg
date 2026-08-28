param(
  [string]$AppId,

  [string]$OwnerOpenId,

  [string]$BindAddress = "192.168.1.2",
  [int]$AppPort = 3000,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $repositoryRoot "deploy\staging.internal.env"

if ([string]::IsNullOrWhiteSpace($AppId)) { $AppId = Read-Host "Enter the staging Manus App ID" }
if ([string]::IsNullOrWhiteSpace($OwnerOpenId)) { $OwnerOpenId = Read-Host "Enter the staging owner Open ID" }
if ([string]::IsNullOrWhiteSpace($AppId) -or [string]::IsNullOrWhiteSpace($OwnerOpenId)) {
  throw "App ID and owner Open ID are required."
}

if ((Test-Path $outputPath) -and -not $Force) {
  throw "deploy\staging.internal.env already exists. Use -Force only when rotating every staging secret."
}

function New-HexSecret([int]$Bytes = 32) {
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
  return [Convert]::ToHexString($buffer).ToLowerInvariant()
}

$databasePassword = New-HexSecret 24
$rootPassword = New-HexSecret 32
$jwtSecret = New-HexSecret 48

$content = @"
NODE_ENV=production
TOURISM_DEPLOYMENT_ENV=staging
PORT=3000
APP_PORT=$AppPort
APP_BIND_ADDRESS=$BindAddress
READINESS_TIMEOUT_MS=3000
SHUTDOWN_TIMEOUT_MS=10000

STAGING_DB_NAME=tourism_staging
STAGING_DB_USER=tourism_app
STAGING_DB_PASSWORD=$databasePassword
STAGING_DB_ROOT_PASSWORD=$rootPassword
STAGING_DB_PORT=3307
DATABASE_URL=mysql://tourism_app:$databasePassword@db:3306/tourism_staging
JWT_SECRET=$jwtSecret

AUTH_PROVIDER=manus
VITE_AUTH_PROVIDER=manus
VITE_APP_ID=$AppId
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
OWNER_OPEN_ID=$OwnerOpenId
OWNER_NAME=Staging Owner

PUBLIC_STORAGE_BASE_URL=/manus-storage
VITE_STORAGE_PUBLIC_BASE_URL=/manus-storage
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
"@

[System.IO.File]::WriteAllText($outputPath, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "Created deploy\staging.internal.env with locally generated secrets."
Write-Host "The values were not printed. Keep this file on the staging host only."
