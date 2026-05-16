<# 
Phase 13.3.1 — Add IAP env toggles to backend/.env (non-destructive)
- Appends missing keys only (won't overwrite existing values)

Run from repo root:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\backend\scripts\phase13-3-1-add-iap-env.ps1
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$false)]
  [string]$EnvPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($EnvPath)) {
  $EnvPath = Join-Path (Get-Location) "backend\.env"
}

if (-not (Test-Path -LiteralPath $EnvPath)) {
  throw "backend/.env not found at: $EnvPath"
}

$existing = Get-Content -LiteralPath $EnvPath -Raw

function Ensure-Line([string]$key, [string]$line) {
  if ($existing -match ("(?m)^\s*" + [regex]::Escape($key) + "\s*=")) { return }
  Add-Content -LiteralPath $EnvPath -Value $line
}

Add-Content -LiteralPath $EnvPath -Value ""
Add-Content -LiteralPath $EnvPath -Value "# --- Phase 13.3 (IAP REAL verification toggles) ---"

Ensure-Line "IAP_APPLE_VERIFY_MODE" "IAP_APPLE_VERIFY_MODE=STUB"
Ensure-Line "IAP_GOOGLE_VERIFY_MODE" "IAP_GOOGLE_VERIFY_MODE=STUB"
Ensure-Line "APPLE_BUNDLE_ID" "APPLE_BUNDLE_ID=com.yourcompany.yourapp"
Ensure-Line "APPLE_ENVIRONMENT" "APPLE_ENVIRONMENT=Sandbox"
Ensure-Line "GOOGLE_PLAY_PACKAGE_NAME" "GOOGLE_PLAY_PACKAGE_NAME=com.yourcompany.yourapp"
Ensure-Line "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64" "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64="

Write-Host "Done. Updated: $EnvPath"
