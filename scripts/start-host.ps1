$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot ".host.pid"

if (Test-Path $pidFile) {
    $existingPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
    if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
        Write-Host "Host is already running (PID: $existingPid)."
        exit 0
    }

    Remove-Item $pidFile -ErrorAction SilentlyContinue
}

$process = Start-Process -FilePath "npm.cmd" `
    -ArgumentList @("run", "dev") `
    -WorkingDirectory $projectRoot `
    -PassThru

Set-Content -Path $pidFile -Value $process.Id

Write-Host "Host started successfully."
Write-Host "PID: $($process.Id)"
Write-Host "URL: http://localhost:3000"