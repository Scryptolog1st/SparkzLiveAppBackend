param(
  [string]$BaseUrl = "http://localhost:3001",
  [string]$WebhookSecret = "whsec_dev"
)

function PostJsonRaw($url, [string]$rawJson, $headers=@{}) {
  return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType "application/json" -Body $rawJson
}

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

function HmacSha256Hex([string]$secret, [string]$data) {
  $hmac = New-Object System.Security.Cryptography.HMACSHA256
  $hmac.Key = [Text.Encoding]::UTF8.GetBytes($secret)
  $bytes = [Text.Encoding]::UTF8.GetBytes($data)
  $hash = $hmac.ComputeHash($bytes)
  ($hash | ForEach-Object { $_.ToString("x2") }) -join ""
}

Write-Host "Health check: $BaseUrl/health"
$health = GetJson "$BaseUrl/health"
Write-Host ("Health OK: " + ($health | ConvertTo-Json -Depth 5))

$suffix = ([Guid]::NewGuid().ToString("N").Substring(0, 8))
$email = "stripe_$suffix@test.dev"
$username = "stripe_$suffix"

Write-Host "Signing up user... ($username)"
$signup = PostJson "$BaseUrl/auth/signup" @{ email=$email; username=$username; password="Password123!" }
$token = $signup.accessToken

$w0 = GetJson "$BaseUrl/me/wallet" $token
Write-Host "Wallet before: $($w0.coins) coins"

$pkgs = GetJson "$BaseUrl/payments/coin-packages"
$pkg = $pkgs | Select-Object -First 1

Write-Host "Creating STRIPE order for package $($pkg.id)"
$orderRes = PostJson "$BaseUrl/payments/orders/stripe" @{ packageId = $pkg.id; idempotencyKey = "stripe_$suffix" } $token
$orderId = $orderRes.order.id
Write-Host "OrderId: $orderId status=$($orderRes.order.status) provider=$($orderRes.order.provider)"

$event = @{
  id = "evt_$suffix"
  type = "checkout.session.completed"
  data = @{
    object = @{
      id = "cs_test_$suffix"
      metadata = @{ orderId = $orderId }
    }
  }
} | ConvertTo-Json -Depth 10 -Compress

$t = [int][math]::Floor([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())
$signedPayload = "$t.$event"
$sig = HmacSha256Hex $WebhookSecret $signedPayload
$header = "t=$t,v1=$sig"

Write-Host "Posting webhook event to /payments/webhooks/stripe (signature verified)"
$resp = PostJsonRaw "$BaseUrl/payments/webhooks/stripe" $event @{ "Stripe-Signature" = $header }
Write-Host ($resp | ConvertTo-Json -Depth 10)

if ($resp.ok -eq $false) {
  throw "Webhook handler returned ok=false: $($resp.error.message)"
}

Start-Sleep -Seconds 1
$order = GetJson "$BaseUrl/payments/orders/$orderId" $token
$w1 = GetJson "$BaseUrl/me/wallet" $token
Write-Host "Order after: status=$($order.status) fulfilledAt=$($order.fulfilledAt)"
Write-Host "Wallet after: $($w1.coins) coins"

if ($w1.coins -le $w0.coins) { throw "Expected wallet coins to increase" }
if ($order.status -ne "FULFILLED") { throw "Expected order status FULFILLED" }

Write-Host "`nPhase 13.1 Stripe webhook smoke test done."
