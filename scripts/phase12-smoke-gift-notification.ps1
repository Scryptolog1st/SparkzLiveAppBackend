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
$hostEmail = "notifhost_$suffix@test.dev"
$viewerEmail = "notifviewer_$suffix@test.dev"
$hostUsername = "notifhost_$suffix"
$viewerUsername = "notifviewer_$suffix"

Write-Host "Signing up host + viewer... ($hostUsername, $viewerUsername)"
$hostSignup = PostJson "$BaseUrl/auth/signup" @{ email=$hostEmail; username=$hostUsername; password="Password123!" }
$viewerSignup = PostJson "$BaseUrl/auth/signup" @{ email=$viewerEmail; username=$viewerUsername; password="Password123!" }

$hostToken = $hostSignup.accessToken
$viewerToken = $viewerSignup.accessToken
$hostUserId = $hostSignup.user.id

Write-Host "Creating LIVE stream..."
$stream = PostJson "$BaseUrl/streams" @{ title="Phase 12 Gift Notif ($suffix)"; visibility="PUBLIC" } $hostToken
$streamId = $stream.id
Write-Host "Stream created: $streamId"

Write-Host "Viewer joins stream..."
PostJson "$BaseUrl/streams/$streamId/join" @{} $viewerToken | Out-Null

Write-Host "Sending gift from viewer -> host..."
$catalog = GetJson "$BaseUrl/gifts/catalog" $viewerToken
$gift = $catalog[0]

PostJson "$BaseUrl/streams/$streamId/gifts/send" @{
  giftId = $gift.id
  quantity = 1
  recipientUserId = $hostUserId
} $viewerToken | Out-Null

Write-Host "Polling for notification on host (up to 90 seconds, checking every 3s)..."
$found = $false
for ($i=0; $i -lt 30; $i++) {
  $list = GetJson "$BaseUrl/me/notifications?limit=20&unreadOnly=true" $hostToken
  $match = $list.items | Where-Object { $_.type -eq "GIFT_RECEIVED" -and $_.streamId -eq $streamId }
  if ($match) {
    Write-Host "FOUND notification:"
    ($match | Select-Object -First 1 | ConvertTo-Json -Depth 10)
    $found = $true
    break
  }
  Start-Sleep -Seconds 3
}

if (-not $found) {
  Write-Host "Did not find GIFT_RECEIVED notification yet."
  Write-Host "If JOBS_INTERVAL_MS is 60000, it can take up to ~60s for the polling job to emit notifications."
  Write-Host "You can temporarily set JOBS_INTERVAL_MS=5000 and restart api for faster feedback."
}

Write-Host "`nPhase 12 gift notification smoke test done."
