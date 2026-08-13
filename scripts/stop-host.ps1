$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot ".host.pid"

function Get-Port3000Process {
    $connection = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $connection) {
        return $null
    }

    return Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
}

function Stop-ProcessSafe([System.Diagnostics.Process]$process) {
    if (-not $process) {
        return
    }

    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path $pidFile)) {
    $portProcess = Get-Port3000Process
    if ($portProcess) {
        Stop-ProcessSafe -process $portProcess
        Write-Host "Stopped process on port 3000 (PID: $($portProcess.Id))."
        exit 0
    }

    Write-Host "No running host found (.host.pid is missing)."
    exit 0
}

$pidValue = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()

$portProcess = Get-Port3000Process
if ($portProcess) {
    Stop-ProcessSafe -process $portProcess
    Write-Host "Stopped process on port 3000 (PID: $($portProcess.Id))."
}

if (-not $pidValue) {
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Write-Host "PID file was empty and has been cleaned up."
    exit 0
}

$process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
if ($process) {
    if (-not $portProcess -or $process.Id -ne $portProcess.Id) {
        Stop-ProcessSafe -process $process
        Write-Host "Stopped host wrapper process (PID: $pidValue)."
    }
} else {
    Write-Host "Process $pidValue is not running. Cleaning up PID file."
}

Remove-Item $pidFile -ErrorAction SilentlyContinue