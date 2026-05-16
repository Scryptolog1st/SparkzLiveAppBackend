<# 
Phase 13.3.2 — Download Apple Root Certificates (for StoreKit 2 JWS verification)

This downloads Apple Root certificates from Apple's PKI site into:
  backend\certs\apple\

Run from repo root:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\backend\scripts\phase13-3-2-download-apple-root-certs.ps1

Sources:
- Apple PKI "Apple Root Certificates" links point to these .cer files. citeturn2view0
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$false)]
  [string]$OutDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path (Get-Location) "backend\certs\apple"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$items = @(
  @{ Name="AppleIncRootCertificate.cer"; Url="https://www.apple.com/appleca/AppleIncRootCertificate.cer" },
  @{ Name="AppleRootCA-G2.cer";         Url="https://www.apple.com/certificateauthority/AppleRootCA-G2.cer" },
  @{ Name="AppleRootCA-G3.cer";         Url="https://www.apple.com/certificateauthority/AppleRootCA-G3.cer" }
)

foreach ($it in $items) {
  $dest = Join-Path $OutDir $it.Name
  Write-Host "Downloading $($it.Name) ..."
  Invoke-WebRequest -Uri $it.Url -OutFile $dest -UseBasicParsing
}

Write-Host ""
Write-Host "Done. Files saved to: $OutDir"
Get-ChildItem -Path $OutDir | Format-Table Name, Length, LastWriteTime -AutoSize
