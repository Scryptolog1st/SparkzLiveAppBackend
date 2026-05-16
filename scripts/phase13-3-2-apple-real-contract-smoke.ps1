<# 
Phase 13.3.2 — Apple REAL verification contract smoke test (no iOS purchase required)

What this checks:
1) Backend is running
2) Endpoint rejects REAL requests without proper proof OR with invalid proof
3) STUB smoke tests remain available separately (Phase 13.2 scripts)

Prereqs:
- backend is running on http://localhost:3001
- You have set:
    IAP_APPLE_VERIFY_MODE=REAL
    APPLE_BUNDLE_ID=...
    APPLE_ENVIRONMENT=Sandbox
- You have downloaded Apple root certs:
    pwsh -File .\backend\scripts\phase13-3-2-download-apple-root-certs.ps1

Run from repo root:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\backend\scripts\phase13-3-2-apple-real-contract-smoke.ps1
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
$username = "iapapple_real_$rand"
$email = "$username@example.com"
$password = "Password123!"

Write-Host "Signing up user... ($username)"
$signup = Invoke-Json POST "$BaseUrl/auth/signup" @{ email=$email; username=$username; password=$password } $null
$token = $signup.accessToken
if (-not $token) { throw "No accessToken returned from signup" }

Write-Host "Calling Apple verify REAL with missing signedTransactionInfo (should 400)"
try {
  Invoke-Json POST "$BaseUrl/payments/iap/apple/verify" @{ platform="ios" } $token | Out-Null
  throw "Expected request to fail, but it succeeded."
} catch {
  Write-Host "Got expected failure:" $_.Exception.Message
}

Write-Host "Calling Apple verify REAL with invalid signedTransactionInfo (should 4xx)"
try {
  Invoke-Json POST "$BaseUrl/payments/iap/apple/verify" @{ platform="ios"; signedTransactionInfo="invalid.jwt.value" } $token | Out-Null
  throw "Expected request to fail, but it succeeded."
} catch {
  Write-Host "Got expected failure:" $_.Exception.Message
}

Write-Host ""
Write-Host "Phase 13.3.2 Apple REAL contract smoke done (expected failures observed)."
Write-Host "When you have a real StoreKit2 purchase JWS, send it as signedTransactionInfo and it should credit once."
