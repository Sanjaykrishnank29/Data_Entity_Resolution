$PIDs = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Get-Unique
foreach ($PID in $PIDs) {
    if ($PID -ne 0) {
        taskkill /F /PID $PID
    }
}
