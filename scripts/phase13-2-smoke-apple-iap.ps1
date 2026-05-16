param(
  [string]$BaseUrl = "http://localhost:3001"
)

function PostJson($url, $body, $token=$null) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 10)
}

function GetJson($url, $token=$null) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  return Invoke-RestMethod -Method Get -Uri $url -Headers $headers
}

Write-Host "Health check: $BaseUrl/health"
$health = GetJson "$BaseUrl/health"
Write-Host ("Health OK: " + ($health | ConvertTo-Json -Depth 5))

$suffix = ([Guid]::NewGuid().ToString("N").Substring(0, 8))
$email = "iap_apple_$suffix@test.dev"
$username = "iapapple_$suffix"

Write-Host "Signing up user... ($username)"
$signup = PostJson "$BaseUrl/auth/signup" @{ email=$email; username=$username; password="Password123!" }
$token = $signup.accessToken

$pkgs = GetJson "$BaseUrl/payments/coin-packages"
$pkg = $pkgs | Select-Object -First 1
if (-not $pkg.appleProductId) { throw "Package missing appleProductId. Apply schema + migrate + restart." }

$w0 = GetJson "$BaseUrl/me/wallet" $token
Write-Host "Wallet before: $($w0.coins) coins"

$txId = "apple_tx_$suffix"
Write-Host "Apple verify (STUB): productId=$($pkg.appleProductId) txId=$txId"
$r1 = PostJson "$BaseUrl/payments/iap/apple/verify" @{ productId=$pkg.appleProductId; transactionId=$txId } $token
Write-Host ($r1 | ConvertTo-Json -Depth 10)

$w1 = GetJson "$BaseUrl/me/wallet" $token
Write-Host "Wallet after: $($w1.coins) coins"

Write-Host "Replay same txId (idempotent)"
$r2 = PostJson "$BaseUrl/payments/iap/apple/verify" @{ productId=$pkg.appleProductId; transactionId=$txId } $token
Write-Host ($r2 | ConvertTo-Json -Depth 10)

$w2 = GetJson "$BaseUrl/me/wallet" $token
Write-Host "Wallet after replay: $($w2.coins) coins"

if ($w1.coins -le $w0.coins) { throw "Expected wallet coins to increase" }
if ($w2.coins -ne $w1.coins) { throw "Expected replay to not change coins" }

Write-Host "`nPhase 13.2 Apple IAP stub smoke test done."
