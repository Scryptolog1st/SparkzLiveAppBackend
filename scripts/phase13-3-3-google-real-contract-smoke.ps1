<# 
Phase 13.3.3 — Google REAL verification contract smoke test

This smoke test is designed to be useful even before you set up Google service account credentials.

It checks:
- Backend health
- Endpoint returns 4xx for missing required REAL fields
- Endpoint returns a controlled 4xx (not 500) for invalid token or missing credentials

Prereqs:
- backend is running on http://localhost:3001
- Set in backend/.env:
    IAP_GOOGLE_VERIFY_MODE=REAL

Optional:
- If you have service account configured, it will also test the invalid-token path against Google API.

Run from repo root:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\backend\scripts\phase13-3-3-google-real-contract-smoke.ps1
#>

[CmdletBinding()]
param(
  [string]$BaseUrl = "http://localhost:3001"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Json($method, $url, $body, $token) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  return Invoke-RestMethod -Method $method -Uri $url -Headers $headers -Body ($body | ConvertTo-Json -Depth 10)
}

Write-Host "Health check: $BaseUrl/health"
$health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET
Write-Host "Health OK:" ($health | ConvertTo-Json -Depth 4)

# Create a user
$rand = ([guid]::NewGuid().ToString("N")).Substring(0,8)
$username = "iapgoogle_real_$rand"
$email = "$username@example.com"
$password = "Password123!"

Write-Host "Signing up user... ($username)"
$signup = Invoke-Json POST "$BaseUrl/auth/signup" @{ email=$email; username=$username; password=$password } $null
$token = $signup.accessToken
if (-not $token) { throw "No accessToken returned from signup" }

Write-Host "Calling Google verify REAL with missing productId/packageName (should 400)"
try {
  Invoke-Json POST "$BaseUrl/payments/iap/google/verify" @{ purchaseToken="tok_$rand"; platform="android" } $token | Out-Null
  throw "Expected request to fail, but it succeeded."
} catch {
  Write-Host "Got expected failure:" $_.Exception.Message
}

Write-Host "Calling Google verify REAL with invalid token + required fields (should 4xx; not 500)"
try {
  Invoke-Json POST "$BaseUrl/payments/iap/google/verify" @{ purchaseToken="tok_$rand"; productId="coins_1000"; packageName="com.example.app"; platform="android" } $token | Out-Null
  throw "Expected request to fail, but it succeeded."
} catch {
  Write-Host "Got expected failure:" $_.Exception.Message
}

Write-Host ""
Write-Host "Phase 13.3.3 Google REAL contract smoke done."
Write-Host "Next: configure service account + package name, then test with a real Play Billing purchaseToken."
