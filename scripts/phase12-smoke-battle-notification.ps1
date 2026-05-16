param(
  [string]$BaseUrl = "http://localhost:3001"
)

function PostJson($url, $body, $token = $null) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 10)
}

function GetJson($url, $token = $null) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  return Invoke-RestMethod -Method Get -Uri $url -Headers $headers
}

function PickBattleId($obj) {
  if ($null -eq $obj) { return $null }

  # Common shapes we may return from controllers/services
  if ($obj.PSObject.Properties.Name -contains "id") { return $obj.id }
  if ($obj.PSObject.Properties.Name -contains "battleId") { return $obj.battleId }
  if ($obj.PSObject.Properties.Name -contains "battle") {
    $b = $obj.battle
    if ($b -and ($b.PSObject.Properties.Name -contains "id")) { return $b.id }
    if ($b -and ($b.PSObject.Properties.Name -contains "battleId")) { return $b.battleId }
  }

  return $null
}

Write-Host "Health check: $BaseUrl/health"
$health = GetJson "$BaseUrl/health"
Write-Host ("Health OK: " + ($health | ConvertTo-Json -Depth 5))

$suffix = ([Guid]::NewGuid().ToString("N").Substring(0, 8))
$hostEmail = "battlehost_$suffix@test.dev"
$oppEmail = "battleopp_$suffix@test.dev"
$hostUsername = "battlehost_$suffix"
$oppUsername = "battleopp_$suffix"

Write-Host "Signing up host + opponent... ($hostUsername, $oppUsername)"
$hostSignup = PostJson "$BaseUrl/auth/signup" @{ email = $hostEmail; username = $hostUsername; password = "Password123!" }
$oppSignup = PostJson "$BaseUrl/auth/signup" @{ email = $oppEmail; username = $oppUsername; password = "Password123!" }

$hostToken = $hostSignup.accessToken
$oppToken = $oppSignup.accessToken
$hostUserId = $hostSignup.user.id
$oppUserId = $oppSignup.user.id

Write-Host "Creating LIVE stream..."
$stream = PostJson "$BaseUrl/streams" @{ title = "Phase 12.6 Battle Notif ($suffix)"; visibility = "PUBLIC" } $hostToken
$streamId = $stream.id
Write-Host "Stream created: $streamId"

Write-Host "Opponent joins stream..."
PostJson "$BaseUrl/streams/$streamId/join" @{} $oppToken | Out-Null

Write-Host "Creating battle (PENDING)..."
$battleRes = PostJson "$BaseUrl/streams/$streamId/battles" @{ opponentUserId = $oppUserId; durationSeconds = 60 } $hostToken
$battleId = PickBattleId $battleRes

if (-not $battleId) {
  Write-Host "Create battle response (couldn't extract id):"
  Write-Host ($battleRes | ConvertTo-Json -Depth 20)
  throw "Could not extract battleId from create battle response. Update script mapping to match backend response."
}

Write-Host "Battle created: $battleId"

Write-Host "Opponent accepts battle..."
PostJson "$BaseUrl/battles/$battleId/accept" @{} $oppToken | Out-Null

Write-Host "Send a gift during battle to ensure a winner exists..."
$catalog = GetJson "$BaseUrl/gifts/catalog" $oppToken
$gift = $catalog[0]

# Opponent sends a gift to host (hostScore should increase)
PostJson "$BaseUrl/streams/$streamId/gifts/send" @{
  giftId          = $gift.id
  quantity        = 1
  recipientUserId = $hostUserId
} $oppToken | Out-Null

Write-Host "Ending battle..."
PostJson "$BaseUrl/battles/$battleId/end" @{} $hostToken | Out-Null

Write-Host "Polling for BATTLE_ENDED notifications (up to 90 seconds, every 3s)..."
$foundHost = $false
$foundOpp = $false
for ($i = 0; $i -lt 30; $i++) {
  $hostList = GetJson "$BaseUrl/me/notifications?limit=50&unreadOnly=true" $hostToken
  $oppList = GetJson "$BaseUrl/me/notifications?limit=50&unreadOnly=true" $oppToken

  $h = $hostList.items | Where-Object { $_.type -eq "BATTLE_ENDED" -and $_.streamId -eq $streamId }
  $o = $oppList.items  | Where-Object { $_.type -eq "BATTLE_ENDED" -and $_.streamId -eq $streamId }

  if ($h -and -not $foundHost) {
    Write-Host "`nHOST notification:"
    ($h | Select-Object -First 1 | ConvertTo-Json -Depth 10)
    $foundHost = $true
  }
  if ($o -and -not $foundOpp) {
    Write-Host "`nOPPONENT notification:"
    ($o | Select-Object -First 1 | ConvertTo-Json -Depth 10)
    $foundOpp = $true
  }

  if ($foundHost -and $foundOpp) { break }
  Start-Sleep -Seconds 3
}

if (-not $foundHost -or -not $foundOpp) {
  Write-Host "`nDid not find both BATTLE_ENDED notifications yet."
  Write-Host "If JOBS_INTERVAL_MS is 60000, it can take up to ~60s to emit. Set JOBS_INTERVAL_MS=5000 in backend/.env and restart for faster feedback."
}

Write-Host "`nPhase 12.6 battle notification smoke test done."
