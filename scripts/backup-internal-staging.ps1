param(
  [string]$EnvironmentFile = "deploy\staging.internal.env",
  [string]$OutputDirectory = "backups"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repositoryRoot
if (-not (Test-Path $EnvironmentFile)) { throw "$EnvironmentFile does not exist." }

$env:STAGING_ENV_FILE = $EnvironmentFile
$compose = @("compose", "--env-file", $EnvironmentFile, "-f", "compose.staging.internal.yml")
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "tourism-staging-$timestamp.sql.gz"
$containerArchive = "/tmp/$archiveName"
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

& docker @compose exec -T db sh -c 'mysqldump --single-transaction --routines --triggers -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" | gzip -c > "$1"' sh $containerArchive
if ($LASTEXITCODE -ne 0) { throw "Database backup failed." }
$containerId = (& docker @compose ps -q db).Trim()
if (-not $containerId) { throw "Database container was not found." }
$destination = Join-Path $OutputDirectory $archiveName
& docker cp "${containerId}:$containerArchive" $destination
if ($LASTEXITCODE -ne 0) { throw "Unable to copy the backup from the database container." }
& docker @compose exec -T db rm -f $containerArchive

$hash = (Get-FileHash -Algorithm SHA256 -Path $destination).Hash.ToLowerInvariant()
Set-Content -Path "$destination.sha256" -Value "$hash  $archiveName" -Encoding ascii
Write-Host "Backup created: $destination"
Write-Host "Checksum created: $destination.sha256"
