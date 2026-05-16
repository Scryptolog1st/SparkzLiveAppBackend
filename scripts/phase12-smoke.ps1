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
$email = "notif_$suffix@test.dev"
$username = "notif_$suffix"

Write-Host "Signing up test user... ($username)"
$signup = PostJson "$BaseUrl/auth/signup" @{ email=$email; username=$username; password="Password123!" }
$token = $signup.accessToken

Write-Host "Creating test notification..."
$created = PostJson "$BaseUrl/me/notifications/test" @{
  type = "SYSTEM"
  title = "Phase 12 Smoke"
  body = "Notifications pipeline is alive."
  payload = @{ ok = $true; run = $suffix }
} $token

Write-Host ("Created: " + ($created | ConvertTo-Json -Depth 5))

Write-Host "`nListing notifications..."
$list = GetJson "$BaseUrl/me/notifications?limit=10" $token
Write-Host ($list | ConvertTo-Json -Depth 10)

if ($list.items.Count -gt 0) {
  $id = $list.items[0].id
  Write-Host "`nMarking read: $id"
  $mr = PostJson "$BaseUrl/me/notifications/$id/read" @{} $token
  Write-Host ($mr | ConvertTo-Json -Depth 5)
}

Write-Host "`nPhase 12 smoke test done."
