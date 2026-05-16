param(
  [string]$SchemaPath = ".\backend\prisma\schema.prisma",
  [string]$SnippetPath = ".\backend\prisma\PHASE13_schema_snippet.prisma"
)

if (-not (Test-Path $SchemaPath)) { throw "Schema not found: $SchemaPath" }
if (-not (Test-Path $SnippetPath)) { throw "Snippet not found: $SnippetPath" }

$schema = Get-Content $SchemaPath -Raw
$snippet = Get-Content $SnippetPath -Raw

# 1) Ensure LedgerEntryType contains PURCHASE_CREDIT
if ($schema -match "enum\s+LedgerEntryType\s*\{") {
  if ($schema -notmatch "LedgerEntryType[\s\S]*PURCHASE_CREDIT") {
    # Insert before closing brace of the enum
    $schema = [regex]::Replace(
      $schema,
      "(enum\s+LedgerEntryType\s*\{[\s\S]*?)(\r?\n\})",
      "`$1`r`n  PURCHASE_CREDIT`$2",
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
    Write-Host "Inserted PURCHASE_CREDIT into enum LedgerEntryType."
  } else {
    Write-Host "LedgerEntryType already contains PURCHASE_CREDIT."
  }
} else {
  Write-Host "WARNING: Could not find enum LedgerEntryType. If your schema differs, add PURCHASE_CREDIT manually."
}

# 2) Append payments models if not already present
if ($schema -match "model\s+PurchaseOrder") {
  Write-Host "Phase 13 models already present in schema. Writing enum change (if any) only."
  Set-Content -Path $SchemaPath -Value $schema -Encoding utf8
  exit 0
}

$schema = $schema + "`r`n`r`n" + $snippet
Set-Content -Path $SchemaPath -Value $schema -Encoding utf8
Write-Host "Appended Phase 13 snippet to $SchemaPath"
