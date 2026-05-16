<# 
Phase 13.3.3 — Add Google Auth Library dependency

This installs `google-auth-library` in backend/.

Run from repo root:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\backend\scripts\phase13-3-3-add-google-lib.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location (Join-Path (Get-Location) "backend")
try {
  npm i google-auth-library
} finally {
  Pop-Location
}
