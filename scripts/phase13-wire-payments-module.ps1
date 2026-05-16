param(
  [string]$AppModulePath = ".\backend\src\app.module.ts"
)

if (-not (Test-Path $AppModulePath)) { throw "File not found: $AppModulePath" }

$src = Get-Content $AppModulePath -Raw

if ($src -match "PaymentsModule") {
  Write-Host "PaymentsModule already referenced in app.module.ts. No changes made."
  exit 0
}

# 1) Add import line near the top (after other module imports if present)
$importLine = "import { PaymentsModule } from './modules/payments/payments.module';"

# Try to insert after the last import line
if ($src -match "(?s)^((?:import .*?\r?\n)+)") {
  $prefix = $Matches[1]
  $rest = $src.Substring($prefix.Length)
  $src = $prefix.TrimEnd() + "`r`n" + $importLine + "`r`n" + $rest
  Write-Host "Inserted PaymentsModule import."
} else {
  # Fallback: just prepend
  $src = $importLine + "`r`n" + $src
  Write-Host "Prepended PaymentsModule import."
}

# 2) Add PaymentsModule into @Module({ imports: [...] })
# Common pattern: imports: [A, B, ...]
$pattern = "(?s)(imports\s*:\s*\[)([^\]]*)(\])"
if ($src -match $pattern) {
  $before = $Matches[1]
  $inside = $Matches[2]
  $after = $Matches[3]

  # Ensure trailing comma style
  $trimInside = $inside.TrimEnd()
  if ($trimInside.Length -gt 0 -and $trimInside.TrimEnd().EndsWith(",")) {
    $newInside = $inside + " PaymentsModule,"
  } else {
    # Add comma if needed and then module
    if ($trimInside.Length -gt 0) {
      $newInside = $inside.TrimEnd() + "," + "`r`n    PaymentsModule,"
    } else {
      $newInside = "`r`n    PaymentsModule,"
    }
  }

  $src = [regex]::Replace($src, $pattern, "$before$newInside$after", 1, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  Write-Host "Inserted PaymentsModule into imports array."
} else {
  Write-Host "WARNING: Could not find an imports: [] array to patch automatically. Add PaymentsModule manually to @Module({ imports: [...] })."
}

# Backup + write
Copy-Item $AppModulePath "$AppModulePath.bak" -Force
Set-Content -Path $AppModulePath -Value $src -Encoding utf8
Write-Host "Saved changes. Backup: $AppModulePath.bak"
Write-Host "Next: restart the API container and rerun phase13-smoke.ps1"
