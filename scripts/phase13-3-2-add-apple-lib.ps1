<# 
Phase 13.3.2 — Add Apple App Store Server Library dependency

This appends @apple/app-store-server-library to backend/package.json using npm.
Run from repo root:

  cd backend
  npm i @apple/app-store-server-library

(This script just automates the above.)
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location (Join-Path (Get-Location) "backend")
try {
  npm i @apple/app-store-server-library
} finally {
  Pop-Location
}
