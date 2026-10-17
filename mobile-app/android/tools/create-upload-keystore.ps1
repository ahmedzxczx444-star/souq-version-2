<#
.SYNOPSIS
  Creates the Google Play upload keystore for Souq Cars and the key.properties
  file the Android release build reads.

.DESCRIPTION
  Run once, on the machine that builds releases:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\mobile-app\android\tools\create-upload-keystore.ps1"

  Add -CheckOnly to see the paths it will use without creating anything.

  You choose the password when asked; it is never shown, logged or passed on
  the command line. The keystore is created OUTSIDE the repository (default
  %USERPROFILE%\souq-keys\souq-upload.jks) and key.properties is written to
  mobile-app\android\key.properties, which Git ignores.

  The script refuses to overwrite an existing keystore or key.properties: a
  lost or replaced upload key cannot be recovered by rebuilding it.

  Back up the .jks file AND the password (for example in a password manager
  plus an offline copy). See mobile-app\README.md, "Android signing".
#>
[CmdletBinding()]
param(
  # Folder for the keystore. Keep it outside the repository.
  [string]$KeyDir = (Join-Path $env:USERPROFILE 'souq-keys'),
  [string]$KeystoreName = 'souq-upload.jks',
  [string]$Alias = 'upload',
  # Where to write key.properties (default: mobile-app\android\key.properties).
  # Resolved in the script body: Windows PowerShell 5.1 has not set
  # $PSScriptRoot yet while parameter defaults are evaluated.
  [string]$PropertiesPath = '',
  [string]$CommonName = 'Souq Cars',
  [string]$Organization = 'Souq Cars',
  [string]$City = 'Cairo',
  [string]$Country = 'EG',
  # For automation only: name of an environment variable that holds the
  # password, instead of typing it.
  [string]$PasswordEnvVar,
  # Only check paths and keytool, then stop: no prompt, nothing is created.
  [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'

# This script lives in mobile-app\android\tools. Work that out from the script's
# own path, whichever PowerShell version or working directory runs it.
$scriptPath = if ($PSCommandPath) { $PSCommandPath } else { $MyInvocation.MyCommand.Path }
if (-not $scriptPath) { throw 'Cannot tell where this script is. Run it with: powershell -File <path to create-upload-keystore.ps1>' }
$toolsDir = Split-Path -Parent $scriptPath
$androidDir = Split-Path -Parent $toolsDir
$repoRoot = Split-Path -Parent (Split-Path -Parent $androidDir)
if (-not $PropertiesPath) { $PropertiesPath = Join-Path $androidDir 'key.properties' }

function Find-Keytool {
  $candidates = @()
  if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME 'bin\keytool.exe') }
  $candidates += 'D:\Android\jdk-21\bin\keytool.exe'
  $onPath = Get-Command keytool -ErrorAction SilentlyContinue
  if ($onPath) { $candidates += $onPath.Source }
  foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { return $c } }
  throw 'keytool was not found. Set JAVA_HOME to a JDK (for example D:\Android\jdk-21) and run again.'
}

function Read-Password {
  if ($PasswordEnvVar) {
    $value = [Environment]::GetEnvironmentVariable($PasswordEnvVar)
    if (-not $value) { throw "Environment variable $PasswordEnvVar is empty." }
    return $value
  }
  while ($true) {
    $first = Read-Host 'Choose a keystore password (at least 8 characters)' -AsSecureString
    $second = Read-Host 'Type it again' -AsSecureString
    $a = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($first))
    $b = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($second))
    if ($a -ne $b) { Write-Host 'The two entries differ. Try again.' -ForegroundColor Yellow; continue }
    if ($a.Length -lt 8) { Write-Host 'Use at least 8 characters.' -ForegroundColor Yellow; continue }
    return $a
  }
}

$keystore = Join-Path $KeyDir $KeystoreName
if (Test-Path $keystore) { throw "A keystore already exists at $keystore. It was left untouched; do not replace an upload key." }
if (Test-Path $PropertiesPath) { throw "$PropertiesPath already exists. It was left untouched." }

$keyDirFull = [IO.Path]::GetFullPath($KeyDir).TrimEnd('\') + '\'
$repoRootFull = [IO.Path]::GetFullPath($repoRoot).TrimEnd('\') + '\'
if ($keyDirFull.StartsWith($repoRootFull, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Choose a key folder outside the repository ($repoRoot), so the keystore can never be committed."
}

$keytool = Find-Keytool

if ($CheckOnly) {
  Write-Host 'Check only - nothing was created.'
  Write-Host "  Repository:     $repoRoot"
  Write-Host "  Keystore will be created at: $keystore"
  Write-Host "  key.properties will be written to: $PropertiesPath"
  Write-Host "  keytool:        $keytool"
  return
}
New-Item -ItemType Directory -Force -Path $KeyDir | Out-Null
$password = Read-Password

# keytool reads the password from this process-only variable (":env"), so it
# never appears on a command line or in the process list.
$envName = 'SOUQ_KEYTOOL_PASSWORD'
[Environment]::SetEnvironmentVariable($envName, $password, 'Process')
try {
  $dname = "CN=$CommonName, O=$Organization, L=$City, C=$Country"
  # keytool prints progress on stderr; Windows PowerShell would treat that as
  # an error under 'Stop', so success is judged by the exit code and the file.
  $ErrorActionPreference = 'Continue'
  & $keytool -genkeypair -keystore $keystore -storetype PKCS12 -alias $Alias `
    -keyalg RSA -keysize 2048 -validity 10000 -dname $dname `
    -storepass:env $envName -keypass:env $envName 2>&1 | Out-Null
  $created = ($LASTEXITCODE -eq 0) -and (Test-Path $keystore)
  $listing = & $keytool -list -v -keystore $keystore -alias $Alias -storepass:env $envName 2>&1 | ForEach-Object { "$_" }
  $ErrorActionPreference = 'Stop'
  if (-not $created) { throw 'keytool could not create the keystore.' }
  $fingerprint = ($listing | Select-String 'SHA256:' | Select-Object -First 1)
  $fingerprint = if ($fingerprint) { $fingerprint.ToString().Trim() } else { '(run keytool -list -v to see it)' }
} finally {
  $ErrorActionPreference = 'Stop'
  [Environment]::SetEnvironmentVariable($envName, $null, 'Process')
}

# Forward slashes keep the path valid in a .properties file.
$storePath = $keystore -replace '\\', '/'
$lines = @(
  "storeFile=$storePath",
  "storePassword=$password",
  "keyAlias=$Alias",
  "keyPassword=$password"
)
[IO.File]::WriteAllLines($PropertiesPath, $lines, (New-Object Text.UTF8Encoding($false)))
$password = $null

Write-Host ''
Write-Host 'Upload keystore created.' -ForegroundColor Green
Write-Host "  Keystore:       $keystore"
Write-Host "  Alias:          $Alias"
Write-Host "  key.properties: $PropertiesPath (ignored by Git)"
Write-Host "  Certificate:    $fingerprint"
Write-Host ''
Write-Host 'Back up now: copy the .jks file and the password to a password manager and an offline copy.' -ForegroundColor Yellow
Write-Host 'Then build: flutter build appbundle --release --dart-define=API_BASE_URL=https://souq-elsyrat.com'
