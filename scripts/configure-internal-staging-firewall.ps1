param(
  [string]$RuleName = "Tourism Statistics Staging",
  [int]$Port = 3000,
  [string]$AllowedSubnet = "192.168.1.0/24"
)

$ErrorActionPreference = "Stop"
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run PowerShell as Administrator to configure Windows Firewall."
}
$existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
if ($existing) { Remove-NetFirewallRule -DisplayName $RuleName }
New-NetFirewallRule `
  -DisplayName $RuleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort $Port `
  -RemoteAddress $AllowedSubnet `
  -Profile Domain,Private | Out-Null
Write-Host "Firewall rule created for TCP $Port from $AllowedSubnet only."
