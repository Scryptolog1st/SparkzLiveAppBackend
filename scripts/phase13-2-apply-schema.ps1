param(
  [string]$SchemaPath = ".\backend\prisma\schema.prisma"
)

if (-not (Test-Path $SchemaPath)) { throw "Schema not found: $SchemaPath" }
$lines = Get-Content $SchemaPath

function Insert-BeforeLine([string[]]$arr, [regex]$rx, [string[]]$toInsert) {
  for ($i=0; $i -lt $arr.Count; $i++) {
    if ($rx.IsMatch($arr[$i])) {
      if ($i -eq 0) { return @($toInsert + $arr) }
      return @($arr[0..($i-1)] + $toInsert + $arr[$i..($arr.Count-1)])
    }
  }
  return $arr
}

# 1) PurchaseProvider: add APPLE/GOOGLE
$enumStart = -1; $enumEnd = -1
for ($i=0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match "^\s*enum\s+PurchaseProvider\s*\{") { $enumStart = $i; break } }
if ($enumStart -ge 0) { for ($j=$enumStart+1; $j -lt $lines.Count; $j++) { if ($lines[$j] -match "^\s*\}\s*$") { $enumEnd = $j; break } } }
if ($enumStart -ge 0 -and $enumEnd -gt $enumStart) {
  $block = ($lines[$enumStart..$enumEnd] -join "`n")
  $insert = @()
  if ($block -notmatch "\bAPPLE\b") { $insert += "  APPLE" }
  if ($block -notmatch "\bGOOGLE\b") { $insert += "  GOOGLE" }
  if ($insert.Count -gt 0) {
    $new = @()
    $new += $lines[0..($enumEnd-1)]
    $new += $insert
    $new += $lines[$enumEnd..($lines.Count-1)]
    $lines = $new
    Write-Host "Inserted APPLE/GOOGLE into PurchaseProvider enum."
  } else {
    Write-Host "PurchaseProvider already contains APPLE/GOOGLE."
  }
} else {
  Write-Host "WARNING: Could not find enum PurchaseProvider. Add APPLE/GOOGLE manually."
}

# 2) CoinPackage fields + indexes
$schema = ($lines -join "`r`n")
if ($schema -match "model\s+CoinPackage\s*\{") {
  if ($schema -notmatch "appleProductId") {
    $lines2 = @()
    $inModel = $false
    for ($i=0; $i -lt $lines.Count; $i++) {
      $line = $lines[$i]
      if ($line -match "^\s*model\s+CoinPackage\s*\{") { $inModel = $true }
      $lines2 += $line
      if ($inModel -and ($line -match "^\s*currency\s+")) {
        $lines2 += "  appleProductId  String?  @map(""apple_product_id"")"
        $lines2 += "  googleProductId String?  @map(""google_product_id"")"
      }
      if ($inModel -and ($line -match "^\s*\}\s*$")) { $inModel = $false }
    }
    $lines = $lines2
    Write-Host "Inserted CoinPackage appleProductId/googleProductId."
  } else {
    Write-Host "CoinPackage already has appleProductId/googleProductId."
  }

  $schema = ($lines -join "`r`n")
  if ($schema -notmatch "@@index\(\[appleProductId\]\)") {
    $lines = Insert-BeforeLine $lines ([regex] "^\s*@@map\(""coin_packages""\)") @("  @@index([appleProductId])", "  @@index([googleProductId])")
    Write-Host "Inserted CoinPackage product id indexes."
  } else {
    Write-Host "CoinPackage product id indexes already present."
  }
} else {
  Write-Host "WARNING: Could not find model CoinPackage. Add fields manually."
}

# 3) PurchaseOrder unique(provider, providerRef)
$schema = ($lines -join "`r`n")
if ($schema -match "model\s+PurchaseOrder\s*\{") {
  if ($schema -notmatch "@@unique\(\[provider,\s*providerRef\]\)") {
    $lines = Insert-BeforeLine $lines ([regex] "^\s*@@map\(""purchase_orders""\)") @("  @@unique([provider, providerRef])")
    Write-Host "Inserted @@unique([provider, providerRef]) in PurchaseOrder."
  } else {
    Write-Host "PurchaseOrder unique(provider, providerRef) already present."
  }
} else {
  Write-Host "WARNING: Could not find model PurchaseOrder. Add @@unique manually."
}

Copy-Item $SchemaPath "$SchemaPath.bak_phase13_2" -Force
Set-Content -Path $SchemaPath -Value ($lines -join "`r`n") -Encoding utf8
Write-Host "Saved: $SchemaPath (backup: $SchemaPath.bak_phase13_2)"
Write-Host "Next:"
Write-Host "  cd backend"
Write-Host "  npx prisma format"
Write-Host "  npx prisma migrate dev --name phase13_2_iap_foundation"
Write-Host "  restart API"
