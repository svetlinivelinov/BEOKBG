$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot ".host.pid"

if (-not (Test-Path $pidFile)) {
    Write-Host "No running host found (.host.pid is missing)."
    exit 0
}

$pidValue = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()

if (-not $pidValue) {
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Write-Host "PID file was empty and has been cleaned up."
    exit 0
}

$process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Id $pidValue -Force
    Write-Host "Host stopped successfully (PID: $pidValue)."
} else {
    Write-Host "Process $pidValue is not running. Cleaning up PID file."
}

Remove-Item $pidFile -ErrorAction SilentlyContinue