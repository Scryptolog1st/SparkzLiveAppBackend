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

Write-Host "Health check: $BaseUrl/health"
$health = GetJson "$BaseUrl/health"
Write-Host ("Health OK: " + ($health | ConvertTo-Json -Depth 5))

# Use unique emails/usernames on every run to avoid 409 conflicts.
$suffix = ([Guid]::NewGuid().ToString("N").Substring(0, 8))
$hostEmail = "host_$suffix@test.dev"
$viewerEmail = "viewer_$suffix@test.dev"
$hostUsername = "host_$suffix"
$viewerUsername = "viewer_$suffix"

Write-Host "Creating host + viewer... ($hostUsername, $viewerUsername)"
$hostSignup = PostJson "$BaseUrl/auth/signup" @{ email = $hostEmail; username = $hostUsername; password = "Password123!" }
$viewerSignup = PostJson "$BaseUrl/auth/signup" @{ email = $viewerEmail; username = $viewerUsername; password = "Password123!" }

$hostToken = $hostSignup.accessToken
$viewerToken = $viewerSignup.accessToken
$hostUserId = $hostSignup.user.id

Write-Host "Creating LIVE stream..."
$stream = PostJson "$BaseUrl/streams" @{ title = "Phase 11 Smoke Stream ($suffix)"; visibility = "PUBLIC" } $hostToken
$streamId = $stream.id
Write-Host "Stream created: $streamId"

Write-Host "Viewer joins stream..."
PostJson "$BaseUrl/streams/$streamId/join" @{} $viewerToken | Out-Null

Write-Host "Posting chat..."
# Your backend expects { text: string } (not { message: string })
try {
  PostJson "$BaseUrl/streams/$streamId/chat" @{ text = "hey from viewer ($suffix)" } $viewerToken | Out-Null
  PostJson "$BaseUrl/streams/$streamId/chat" @{ text = "another message ($suffix)" } $viewerToken | Out-Null
  Write-Host "Chat posted OK."
}
catch {
  Write-Host "Chat post failed. Raw error:"
  Write-Host $_
}

Write-Host "Sending gift..."
$catalog = GetJson "$BaseUrl/gifts/catalog" $viewerToken
$gift = $catalog[0]

# Your backend may accept recipientUserId instead of recipientId.
# Try recipientUserId first (matches DB schema), then fallback to recipientId.
$giftSent = $false
try {
  PostJson "$BaseUrl/streams/$streamId/gifts/send" @{
    giftId          = $gift.id
    quantity        = 1
    recipientUserId = $hostUserId
  } $viewerToken | Out-Null
  $giftSent = $true
  Write-Host "Gift sent OK (recipientUserId)."
}
catch {
  try {
    PostJson "$BaseUrl/streams/$streamId/gifts/send" @{
      giftId      = $gift.id
      quantity    = 1
      recipientId = $hostUserId
    } $viewerToken | Out-Null
    $giftSent = $true
    Write-Host "Gift sent OK (recipientId)."
  }
  catch {
    Write-Host "Gift send failed. Raw error:"
    Write-Host $_
  }
}

Write-Host "`n--- USERS SEARCH (should find host_*) ---"
(GetJson "$BaseUrl/users/search?q=$hostUsername&limit=10" | ConvertTo-Json -Depth 10)

Write-Host "`n--- EXPLORE TRENDING (your new stream should appear; chat/gift counts should be >0 if those steps succeeded) ---"
(GetJson "$BaseUrl/explore/streams/live?sort=trending&windowMinutes=10&limit=10" | ConvertTo-Json -Depth 10)

Write-Host "`n--- LEADERBOARDS (earnings alltime) ---"
(GetJson "$BaseUrl/leaderboards?period=alltime&type=earnings&limit=10" | ConvertTo-Json -Depth 10)

Write-Host "`n--- LEADERBOARDS (gifters daily) ---"
(GetJson "$BaseUrl/leaderboards?period=daily&type=gifters&limit=10" | ConvertTo-Json -Depth 10)

Write-Host "`nPhase 11 smoke test done."
