<# 
LiveApp Phase 13.3.0 — Mobile Runtime + IAP Preflight (v2.2)
================================================================================
Fixes v2.1 bug:
- PowerShell interpreted "-or" as a parameter to Test-Path in the app.json detection.
- v2.2 wraps each Test-Path in parentheses.

Run from repo root:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\phase-13.3.0-mobile-preflight.ps1 -RepoRoot .\mobile
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$false)]
  [string]$RepoRoot,

  [Parameter(Mandatory=$false)]
  [int]$MaxSearchDepth = 6
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section([string]$title) {
  Write-Host ""
  Write-Host ("=" * 78)
  Write-Host $title
  Write-Host ("=" * 78)
}

function Read-JsonFile([string]$path) {
  try {
    if (-not (Test-Path -LiteralPath $path)) { return $null }
    $raw = Get-Content -LiteralPath $path -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
    return $raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-AllDeps($pkgObj) {
  $deps = @{}
  if ($pkgObj -and $pkgObj.dependencies) {
    $pkgObj.dependencies.PSObject.Properties | ForEach-Object { $deps[$_.Name] = $_.Value }
  }
  if ($pkgObj -and $pkgObj.devDependencies) {
    $pkgObj.devDependencies.PSObject.Properties | ForEach-Object {
      if (-not $deps.ContainsKey($_.Name)) { $deps[$_.Name] = $_.Value }
    }
  }
  return $deps
}

function Score-MobilePackage($pkgObj) {
  if ($null -eq $pkgObj) { return 0 }
  $deps = Get-AllDeps $pkgObj
  $score = 0
  if ($deps.ContainsKey("expo")) { $score += 20 }
  if ($deps.ContainsKey("react-native")) { $score += 18 }
  if ($deps.ContainsKey("expo-dev-client")) { $score += 6 }
  if ($deps.ContainsKey("expo-router")) { $score += 3 }
  if ($deps.ContainsKey("@react-navigation/native")) { $score += 2 }
  if ($deps.ContainsKey("react-native-iap")) { $score += 5 }
  if ($deps.ContainsKey("expo-iap")) { $score += 5 }
  return $score
}

function Find-PackageJsonFiles([string]$root, [int]$maxDepth) {
  $excludeDirs = @("node_modules", ".git", ".expo", "dist", "build", "coverage")
  $results = New-Object System.Collections.Generic.List[string]
  $queue = New-Object System.Collections.Generic.Queue[object]
  $queue.Enqueue(@{ Path = $root; Depth = 0 })

  while ($queue.Count -gt 0) {
    $item = $queue.Dequeue()
    $dirPath = $item.Path
    $depth = [int]$item.Depth

    $pj = Join-Path $dirPath "package.json"
    if (Test-Path -LiteralPath $pj) { $results.Add($pj) }

    if ($depth -ge $maxDepth) { continue }

    Get-ChildItem -LiteralPath $dirPath -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      if ($excludeDirs -contains $_.Name) { return }
      $queue.Enqueue(@{ Path = $_.FullName; Depth = ($depth + 1) })
    }
  }

  return @($results | Select-Object -Unique)
}

function Detect-Runtime([string]$packageJsonPath) {
  $pkg = Read-JsonFile $packageJsonPath
  if ($null -eq $pkg) { return $null }

  $deps = Get-AllDeps $pkg
  $root = Split-Path -Parent $packageJsonPath

  $hasExpo = $deps.ContainsKey("expo")
  $hasExpoDevClient = $deps.ContainsKey("expo-dev-client")
  $hasReactNative = $deps.ContainsKey("react-native")
  $hasIos = Test-Path -LiteralPath (Join-Path $root "ios")
  $hasAndroid = Test-Path -LiteralPath (Join-Path $root "android")
  $hasEas = Test-Path -LiteralPath (Join-Path $root "eas.json")

  # FIX: wrap each Test-Path call so -or is treated as boolean operator
  $hasAppJson =
    (Test-Path -LiteralPath (Join-Path $root "app.json")) -or
    (Test-Path -LiteralPath (Join-Path $root "app.config.js")) -or
    (Test-Path -LiteralPath (Join-Path $root "app.config.ts"))

  $runtime = "UNKNOWN"
  $confidence = "LOW"

  if ($hasExpo) {
    if ($hasIos -or $hasAndroid) {
      if ($hasExpoDevClient -or $hasEas) {
        $runtime = "EXPO (Dev Client / Prebuild)"
        $confidence = "HIGH"
      } else {
        $runtime = "EXPO (Prebuilt/Bare — ios/android present)"
        $confidence = "MEDIUM"
      }
    } else {
      $runtime = "EXPO Managed (no ios/android)"
      $confidence = "HIGH"
    }
  } elseif ($hasReactNative) {
    if ($hasIos -or $hasAndroid) {
      $runtime = "Bare React Native"
      $confidence = "HIGH"
    } else {
      $runtime = "React Native (structure unclear — missing ios/android?)"
      $confidence = "LOW"
    }
  }

  return @{
    runtime = $runtime
    confidence = $confidence
    appRoot = $root
    deps = $deps
    hasExpo = $hasExpo
    hasExpoDevClient = $hasExpoDevClient
    hasReactNative = $hasReactNative
    hasIos = $hasIos
    hasAndroid = $hasAndroid
    hasEas = $hasEas
    hasAppJson = $hasAppJson
  }
}

Write-Section "Phase 13.3.0 Preflight — Repo Scan (v2.2)"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Get-Location).Path
}

$RepoRoot = (Resolve-Path $RepoRoot).Path
Write-Host "RepoRoot: $RepoRoot"

Write-Section "Searching for mobile package.json"
$pkgFiles = @(Find-PackageJsonFiles -root $RepoRoot -maxDepth $MaxSearchDepth)
if (-not $pkgFiles) { $pkgFiles = @() }

if ($pkgFiles.Count -eq 0) {
  Write-Host "No package.json files found under RepoRoot within depth $MaxSearchDepth."
  exit 0
}

$ranked = @()
foreach ($pj in $pkgFiles) {
  $pkgObj = Read-JsonFile $pj
  $score = Score-MobilePackage $pkgObj
  $ranked += [PSCustomObject]@{
    PackageJson = $pj
    Score = $score
  }
}

$ranked = $ranked | Sort-Object Score -Descending
Write-Host "Top candidates:"
$ranked | Select-Object -First 10 | ForEach-Object {
  Write-Host ("  Score {0,3}  {1}" -f $_.Score, $_.PackageJson)
}

$best = $ranked | Select-Object -First 1
if ($best.Score -lt 10) {
  Write-Host ""
  Write-Host "⚠️  I didn't find a strong Expo/React-Native package.json inside this folder."
  exit 0
}

$det = Detect-Runtime -packageJsonPath $best.PackageJson
if ($null -eq $det) {
  Write-Host "Failed to read/parse: $($best.PackageJson)"
  exit 0
}

Write-Section "Detected Runtime"
Write-Host ("Runtime: " + $det.runtime)
Write-Host ("Confidence: " + $det.confidence)
Write-Host ("AppRoot: " + $det.appRoot)
Write-Host ("package.json: " + $best.PackageJson)

Write-Section "Signals"
Write-Host ("expo: " + $det.hasExpo)
Write-Host ("expo-dev-client: " + $det.hasExpoDevClient)
Write-Host ("react-native: " + $det.hasReactNative)
Write-Host ("ios/ folder: " + $det.hasIos)
Write-Host ("android/ folder: " + $det.hasAndroid)
Write-Host ("eas.json: " + $det.hasEas)
Write-Host ("app.json/app.config.*: " + $det.hasAppJson)
Write-Host ("react-native-iap: " + ($det.deps.ContainsKey("react-native-iap")))
Write-Host ("expo-iap: " + ($det.deps.ContainsKey("expo-iap")))

Write-Section "IAP Library Recommendation"
if ($det.hasExpo -and (-not $det.hasIos) -and (-not $det.hasAndroid)) {
  Write-Host "You are Expo managed. You cannot test IAP inside Expo Go."
  Write-Host "Recommended path: build an Expo Development Build (Dev Client) and use a native IAP module."
  Write-Host ""
  if ($det.deps.ContainsKey("react-native-iap")) {
    Write-Host "Use: react-native-iap (already installed) via Dev Client."
  } elseif ($det.deps.ContainsKey("expo-iap")) {
    Write-Host "Use: expo-iap (already installed)."
  } else {
    Write-Host "Pick one: expo-iap OR react-native-iap"
  }
} else {
  Write-Host "Use: react-native-iap"
}

Write-Section "Client → Backend Proof Payload Contracts (Phase 13.3)"
Write-Host "APPLE (StoreKit 2 preferred):"
Write-Host "  POST /payments/iap/apple/verify"
Write-Host "  Body:"
@'
{
  "signedTransactionInfo": "<StoreKit 2 JWS (a.k.a. signedTransactionInfo)>",
  "appAccountToken": "<optional UUID you set per user for anti-fraud / restore mapping>",
  "platform": "ios"
}
'@ | Write-Host
Write-Host ""
Write-Host "GOOGLE (Play Billing):"
Write-Host "  POST /payments/iap/google/verify"
Write-Host "  Body:"
@'
{
  "purchaseToken": "<purchaseToken from Google Play>",
  "productId": "<sku/productId>",
  "packageName": "<your Android applicationId/package name>",
  "platform": "android"
}
'@ | Write-Host
