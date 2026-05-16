<# 
LiveApp Phase 13.3.0 — Backend IAP Env Preflight (v2)
================================================================================
Fixes:
- Works whether you run it from repo root OR from inside /backend
- Checks for .env in:
    1) <RepoRoot>\backend\.env
    2) <RepoRoot>\.env
    3) <CWD>\.env
    4) <CWD>\backend\.env

Run:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\phase-13.3.0-backend-env-preflight.ps1

Or:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\phase-13.3.0-backend-env-preflight.ps1 -RepoRoot "C:\path\to\repo"
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$false)]
  [string]$RepoRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section([string]$title) {
  Write-Host ""
  Write-Host ("=" * 78)
  Write-Host $title
  Write-Host ("=" * 78)
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Get-Location).Path
}

$RepoRoot = (Resolve-Path $RepoRoot).Path
$cwd = (Get-Location).Path

Write-Section "Phase 13.3.0 Preflight — Backend .env Scan (v2)"
Write-Host "RepoRoot: $RepoRoot"
Write-Host "CWD:      $cwd"

$candidates = @(
  (Join-Path $RepoRoot "backend\.env"),
  (Join-Path $RepoRoot ".env"),
  (Join-Path $cwd ".env"),
  (Join-Path $cwd "backend\.env")
)

$envPath = $null
foreach ($c in $candidates) {
  if (Test-Path -LiteralPath $c) { $envPath = $c; break }
}

if ($null -eq $envPath) {
  Write-Host "No .env found in common locations. Searched:"
  $candidates | ForEach-Object { Write-Host ("  - " + $_) }
  exit 0
}

Write-Host "EnvPath:  $envPath"

$lines = Get-Content -LiteralPath $envPath

function HasKey([string]$key) {
  return $lines | Where-Object { $_ -match ("^\s*" + [regex]::Escape($key) + "\s*=") } | Select-Object -First 1
}

$recommended = @(
  "IAP_APPLE_VERIFY_MODE",
  "IAP_GOOGLE_VERIFY_MODE",
  "APPLE_BUNDLE_ID",
  "APPLE_ENVIRONMENT",
  "APPLE_APPLE_ID",
  "GOOGLE_PLAY_PACKAGE_NAME",
  "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
)

Write-Section "Recommended Keys (present/missing)"
foreach ($k in $recommended) {
  $present = (HasKey $k) -ne $null
  Write-Host ("{0,-40} {1}" -f ($k + ":"), ($present ? "✅ present" : "❌ missing"))
}

Write-Section "Suggested .env snippet (copy/paste)"
@'
# --- Phase 13.3 (IAP REAL verification toggles) ---
# STUB keeps local dev unblocked. REAL enables server-side verification calls.
IAP_APPLE_VERIFY_MODE=STUB
IAP_GOOGLE_VERIFY_MODE=STUB

# Apple (required for REAL)
APPLE_BUNDLE_ID=com.yourcompany.yourapp
APPLE_ENVIRONMENT=Sandbox  # Sandbox|Production
APPLE_APPLE_ID=000000000   # optional for some Apple server API flows

# Google (required for REAL)
GOOGLE_PLAY_PACKAGE_NAME=com.yourcompany.yourapp
# Option A (preferred): base64 of the whole JSON credentials file contents
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=
# Option B: split vars (if you prefer):
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
'@ | Write-Host

Write-Section "Notes"
Write-Host "- Keep STUB modes available so local dev isn't blocked."
Write-Host "- For Google, prefer GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 (single var) OR email+private key vars."
Write-Host "- For Apple, REAL verification needs bundle id + environment; App Store Server API JWT can be added later."
