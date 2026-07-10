param([Parameter(Mandatory = $true)][string]$Password)
$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($Password))
Write-Host (-join ($hash | ForEach-Object { '{0:x2}' -f $_ }))
