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
$email = "pay_$suffix@test.dev"
$username = "pay_$suffix"

Write-Host "Signing up user... ($username)"
$signup = PostJson "$BaseUrl/auth/signup" @{ email=$email; username=$username; password="Password123!" }
$token = $signup.accessToken

Write-Host "Wallet before:"
$w0 = GetJson "$BaseUrl/me/wallet" $token
Write-Host ($w0 | ConvertTo-Json -Depth 5)

Write-Host "Listing packages..."
$pkgs = GetJson "$BaseUrl/payments/coin-packages"
Write-Host ($pkgs | ConvertTo-Json -Depth 5)

$pkg = $pkgs | Select-Object -First 1
Write-Host "Selected package: $($pkg.id)"

Write-Host "Creating order..."
$orderRes = PostJson "$BaseUrl/payments/orders" @{ packageId = $pkg.id; idempotencyKey = "k_$suffix" } $token
Write-Host ($orderRes | ConvertTo-Json -Depth 8)

$orderId = $orderRes.order.id

Write-Host "Marking paid (DEV)..."
$paid = PostJson "$BaseUrl/payments/orders/$orderId/dev/mark-paid" @{ providerRef = "dev_$suffix" } $token
Write-Host ($paid | ConvertTo-Json -Depth 8)

Write-Host "Fulfilling (credits coins, idempotent)..."
$ful1 = PostJson "$BaseUrl/payments/orders/$orderId/fulfill" @{ providerRef = "dev_$suffix" } $token
Write-Host ($ful1 | ConvertTo-Json -Depth 8)

Write-Host "Fulfilling again (should be alreadyFulfilled=true)..."
$ful2 = PostJson "$BaseUrl/payments/orders/$orderId/fulfill" @{ providerRef = "dev_$suffix" } $token
Write-Host ($ful2 | ConvertTo-Json -Depth 8)

Write-Host "Wallet after:"
$w1 = GetJson "$BaseUrl/me/wallet" $token
Write-Host ($w1 | ConvertTo-Json -Depth 5)

Write-Host "`nPhase 13.0 payments smoke test done."
