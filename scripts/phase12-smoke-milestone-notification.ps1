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

function CeilDiv([int64]$a, [int64]$b) {
  if ($b -le 0) { throw "CeilDiv b must be > 0" }
  return [int64][math]::Ceiling($a / [double]$b)
}

Write-Host "Health check: $BaseUrl/health"
$health = GetJson "$BaseUrl/health"
Write-Host ("Health OK: " + ($health | ConvertTo-Json -Depth 5))

$suffix = ([Guid]::NewGuid().ToString("N").Substring(0, 8))
$recipEmail = "milerecip_$suffix@test.dev"
$gifterEmail = "milegifter_$suffix@test.dev"
$recipUsername = "milerecip_$suffix"
$gifterUsername = "milegifter_$suffix"

Write-Host "Signing up recipient + gifter... ($recipUsername, $gifterUsername)"
$recipSignup = PostJson "$BaseUrl/auth/signup" @{ email=$recipEmail; username=$recipUsername; password="Password123!" }
$gifterSignup = PostJson "$BaseUrl/auth/signup" @{ email=$gifterEmail; username=$gifterUsername; password="Password123!" }

$recipToken = $recipSignup.accessToken
$gifterToken = $gifterSignup.accessToken
$recipUserId = $recipSignup.user.id

Write-Host "Creating LIVE stream (recipient is host)..."
$stream = PostJson "$BaseUrl/streams" @{ title="Phase 12.7 Milestone ($suffix)"; visibility="PUBLIC" } $recipToken
$streamId = $stream.id
Write-Host "Stream created: $streamId"

Write-Host "Gifter joins stream..."
PostJson "$BaseUrl/streams/$streamId/join" @{} $gifterToken | Out-Null

Write-Host "Fetching wallets..."
$gifterWallet = GetJson "$BaseUrl/me/wallet" $gifterToken
$recipWallet = GetJson "$BaseUrl/me/wallet" $recipToken

$gifterCoins = [int64]$gifterWallet.coins
$recipDiamonds = [int64]$recipWallet.diamondsEarned

Write-Host "Gifter coins: $gifterCoins"
Write-Host "Recipient diamondsEarned: $recipDiamonds"

# Next 1,000,000 threshold
$threshold = ([int64]([math]::Floor($recipDiamonds / 1000000.0)) * 1000000) + 1000000
$needDiamonds = $threshold - $recipDiamonds
Write-Host "Target milestone: $threshold (need +$needDiamonds diamonds)"

Write-Host "Fetching gift catalog..."
$catalog = GetJson "$BaseUrl/gifts/catalog" $gifterToken

# Pick a gift that is affordable and minimizes quantity (prefer higher diamondValue)
$candidates = @()
foreach ($g in $catalog) {
  if (-not $g.coinCost -or -not $g.diamondValue) { continue }
  $coinCost = [int64]$g.coinCost
  $dv = [int64]$g.diamondValue
  if ($coinCost -le 0 -or $dv -le 0) { continue }

  $maxQty = [int64]([math]::Floor($gifterCoins / [double]$coinCost))
  $qtyNeeded = CeilDiv $needDiamonds $dv

  if ($qtyNeeded -le $maxQty -and $qtyNeeded -gt 0) {
    $candidates += [pscustomobject]@{
      id = $g.id
      name = $g.name
      coinCost = $coinCost
      diamondValue = $dv
      qtyNeeded = $qtyNeeded
      totalCost = ($qtyNeeded * $coinCost)
    }
  }
}

if ($candidates.Count -eq 0) {
  Write-Host "No single gift can reach the milestone with the current coin balance."
  Write-Host "Try increasing dev seed coins or use a cheaper gift / multiple sends."
  throw "No affordable gift candidate found."
}

# Prefer minimal qtyNeeded (fewest sends), break ties by total cost
$pick = $candidates | Sort-Object qtyNeeded, totalCost | Select-Object -First 1

Write-Host "Selected gift: $($pick.name) ($($pick.id)) coinCost=$($pick.coinCost) diamondValue=$($pick.diamondValue) qtyNeeded=$($pick.qtyNeeded) totalCost=$($pick.totalCost)"

# Send gifts in batches, starting large and shrinking if server rejects quantity
$qtyRemaining = [int64]$pick.qtyNeeded
$batch = $qtyRemaining
$sentTotal = 0

while ($qtyRemaining -gt 0) {
  $attempt = $batch
  if ($attempt -gt $qtyRemaining) { $attempt = $qtyRemaining }

  try {
    PostJson "$BaseUrl/streams/$streamId/gifts/send" @{
      giftId = $pick.id
      quantity = [int]$attempt
      recipientUserId = $recipUserId
    } $gifterToken | Out-Null

    $qtyRemaining -= $attempt
    $sentTotal += $attempt

    Write-Host "Sent batch quantity=$attempt. Remaining=$qtyRemaining"
    # After first success, keep using the same batch size (fast)
  } catch {
    $msg = $_.Exception.Message
    Write-Host "Send failed for quantity=$attempt. Error: $msg"

    if ($batch -le 1) { throw }
    # Reduce batch size and retry
    $batch = [int64]([math]::Max(1, [math]::Floor($batch / 10.0)))
    Write-Host "Reducing batch size to $batch and retrying..."
  }
}

Write-Host "Total quantity sent: $sentTotal"

Write-Host "Polling for MILESTONE_REACHED notification on recipient (up to 120 seconds, every 3s)..."
$found = $false
for ($i=0; $i -lt 40; $i++) {
  $list = GetJson "$BaseUrl/me/notifications?limit=50&unreadOnly=true" $recipToken
  $match = $list.items | Where-Object { $_.type -eq "MILESTONE_REACHED" -and $_.payload.milestoneAmount -eq $threshold }

  if ($match) {
    Write-Host "FOUND milestone notification:"
    ($match | Select-Object -First 1 | ConvertTo-Json -Depth 12)
    $found = $true
    break
  }
  Start-Sleep -Seconds 3
}

if (-not $found) {
  Write-Host "Did not find MILESTONE_REACHED yet."
  Write-Host "If JOBS_INTERVAL_MS is 60000, it can take up to ~60s for the polling job to emit notifications."
  Write-Host "Tip: set JOBS_INTERVAL_MS=5000 in backend/.env and restart the API for faster feedback."
}

Write-Host "`nPhase 12.7 milestone notification smoke test done."
