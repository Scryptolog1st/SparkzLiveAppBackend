param(
  [string]$MainPath = ".\backend\src\main.ts"
)

if (-not (Test-Path $MainPath)) { throw "File not found: $MainPath" }

$src = Get-Content $MainPath -Raw

if ($src -match "rawBody\s*:\s*true") {
  Write-Host "rawBody already enabled in main.ts. No changes made."
  exit 0
}

# Replace the first NestFactory.create(AppModule) occurrence
$src2 = $src -replace "NestFactory\.create\((\s*)AppModule(\s*)\)", "NestFactory.create(`$1AppModule`$2, { rawBody: true })"

if ($src2 -eq $src) {
  Write-Host "WARNING: Could not auto-patch NestFactory.create(AppModule). Add { rawBody: true } manually."
} else {
  Copy-Item $MainPath "$MainPath.bak_phase13_rawbody" -Force
  Set-Content -Path $MainPath -Value $src2 -Encoding utf8
  Write-Host "Enabled rawBody in main.ts. Backup: $MainPath.bak_phase13_rawbody"
  Write-Host "Restart the API process/container for this to take effect."
}
