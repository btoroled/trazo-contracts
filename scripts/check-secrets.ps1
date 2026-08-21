$ErrorActionPreference = 'Stop'

$allowedEnvironmentFiles = @('.env.example')
$blockedExtensions = @('.pem', '.key', '.p12', '.pfx')
$scannerPath = 'scripts/check-secrets.ps1'
$trackedFiles = @(git ls-files)
$violations = [System.Collections.Generic.List[string]]::new()

foreach ($file in $trackedFiles) {
  $name = [System.IO.Path]::GetFileName($file)
  $extension = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
  if ($name.StartsWith('.env') -and $file -notin $allowedEnvironmentFiles) {
    $violations.Add("tracked environment file: $file")
  }
  if ($extension -in $blockedExtensions) {
    $violations.Add("tracked private key or certificate bundle: $file")
  }
}

$patterns = @(
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----',
  'AKIA[0-9A-Z]{16}',
  'gh[pousr]_[A-Za-z0-9]{20,}',
  '(CHAIN_PRIVATE_KEY|AMOY_PRIVATE_KEY|PRIVATE_KEY)\s*=\s*0x[1-9a-fA-F][0-9a-fA-F]{63}'
)

foreach ($file in $trackedFiles | Where-Object { $_ -ne $scannerPath }) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
  $content = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue
  if ($null -eq $content) { continue }
  foreach ($pattern in $patterns) {
    if ($content -match $pattern) {
      $violations.Add("possible secret in: $file")
      break
    }
  }
}

if ($violations.Count -gt 0) {
  $violations | Sort-Object -Unique | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host 'Secret and environment-file check passed.'
