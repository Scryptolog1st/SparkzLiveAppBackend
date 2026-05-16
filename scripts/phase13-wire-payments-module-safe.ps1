param(
  [string]$AppModulePath = ".\backend\src\app.module.ts"
)

if (-not (Test-Path $AppModulePath)) { throw "File not found: $AppModulePath" }

$lines = Get-Content $AppModulePath

# Backup first
Copy-Item $AppModulePath "$AppModulePath.bak2" -Force

# 1) Ensure import exists
$importLine = "import { PaymentsModule } from './modules/payments/payments.module';"
if (-not ($lines -match "from '\./modules/payments/payments\.module'")) {
  $importIdx = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*import\s+") { $importIdx = $i }
  }
  if ($importIdx -ge 0) {
    $lines = @($lines[0..$importIdx] + $importLine + $lines[($importIdx+1)..($lines.Count-1)])
    Write-Host "Inserted PaymentsModule import."
  } else {
    $lines = @($importLine) + $lines
    Write-Host "Prepended PaymentsModule import."
  }
} else {
  Write-Host "PaymentsModule import already present."
}

# 2) Ensure PaymentsModule is in @Module imports array (search after @Module decorator)
$moduleStart = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match "^\s*@Module\s*\(") { $moduleStart = $i; break }
}
if ($moduleStart -lt 0) {
  throw "Could not find @Module( ... ) in app.module.ts"
}

# Find 'imports:' line after @Module(
$importsLine = -1
for ($i = $moduleStart; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match "imports\s*:\s*\[") { $importsLine = $i; break }
}
if ($importsLine -lt 0) {
  throw "Could not find 'imports: [' array in @Module decorator. Add PaymentsModule manually."
}

# Check if PaymentsModule already present within that imports array block (until closing ']' on its own or same line)
$blockEnd = $importsLine
for ($i = $importsLine; $i -lt $lines.Count; $i++) {
  $blockEnd = $i
  if ($lines[$i] -match "\]") { break }
}
$blockText = ($lines[$importsLine..$blockEnd] -join "`n")
if ($blockText -match "\bPaymentsModule\b") {
  Write-Host "PaymentsModule already present in @Module imports."
} else {
  # Insert right after the imports: [ line
  $indent = ""
  if ($lines[$importsLine] -match "^(\s*)") { $indent = $Matches[1] }
  $insertLine = $indent + "  PaymentsModule,"
  $lines = @($lines[0..$importsLine] + $insertLine + $lines[($importsLine+1)..($lines.Count-1)])
  Write-Host "Inserted PaymentsModule into @Module imports array."
}

Set-Content -Path $AppModulePath -Value ($lines -join "`r`n") -Encoding utf8
Write-Host "Saved changes. Backup: $AppModulePath.bak2"
Write-Host "Next: docker compose restart liveapp-api"
