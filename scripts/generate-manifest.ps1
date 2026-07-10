$root = Split-Path $PSScriptRoot -Parent
& (Join-Path $PSScriptRoot "apply-catalog.ps1")
