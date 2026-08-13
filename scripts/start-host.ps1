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

if (Test-Path $pidFile) {
    $existingPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
    if ($existingPid) {
        $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
        if ($existingProcess) {
            $portProcess = Get-Port3000Process
            if ($portProcess) {
                Set-Content -Path $pidFile -Value $portProcess.Id
                Write-Host "Host is already running (PID: $($portProcess.Id))."
                Write-Host "URL: http://localhost:3000"
                exit 0
            }

            Stop-Process -Id $existingProcess.Id -Force -ErrorAction SilentlyContinue
        }
    }

    Remove-Item $pidFile -ErrorAction SilentlyContinue
}

$portProcess = Get-Port3000Process
if ($portProcess) {
    Set-Content -Path $pidFile -Value $portProcess.Id
    Write-Host "Cannot start host because port 3000 is already in use by '$($portProcess.ProcessName)' (PID: $($portProcess.Id))."
    Write-Host "Run 'npm run host:stop' if this is your BEOKBG host, or stop that process manually."
    exit 1
}

$process = Start-Process -FilePath "npm.cmd" `
    -ArgumentList @("run", "dev") `
    -WorkingDirectory $projectRoot `
    -PassThru

$listenerProcess = $null
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    $listenerProcess = Get-Port3000Process
    if ($listenerProcess) {
        break
    }

    Start-Sleep -Milliseconds 200
}

if ($listenerProcess) {
    Set-Content -Path $pidFile -Value $listenerProcess.Id
} else {
    Set-Content -Path $pidFile -Value $process.Id
}

Write-Host "Host started successfully."
if ($listenerProcess) {
    Write-Host "PID: $($listenerProcess.Id)"
} else {
    Write-Host "PID: $($process.Id)"
}
Write-Host "URL: http://localhost:3000"