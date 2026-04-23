$projectDir = "C:\OSCAR\oscar-viewer"
$logDir = "$projectDir\cypress\scheduled-logs"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = "$logDir\run-$timestamp.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Keep only the last 48 log files (~24 hours at 30-min intervals)
Get-ChildItem -Path $logDir -Filter "run-*.log" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 48 |
    Remove-Item -Force

Set-Location $projectDir

Write-Output "=== Cypress scheduled run at $timestamp ===" | Tee-Object -FilePath $logFile
npm run test:scheduled 2>&1 | Tee-Object -Append -FilePath $logFile

$exitCode = $LASTEXITCODE
Write-Output "=== Exit code: $exitCode ===" | Tee-Object -Append -FilePath $logFile
exit $exitCode
