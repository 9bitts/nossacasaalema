$root = Split-Path $PSScriptRoot -Parent
$labels = @{
  'Anmeldung' = 'Registro de endereco'
  'Casamento_Divorcio' = 'Casamento e divorcio'
  'Correspondencia_Outros' = 'Correspondencia e outros'
  'Escola' = 'Escola e educacao'
  'Identidade' = 'Identidade e documentos pessoais'
  'Imigracao' = 'Imigracao e vistos'
  'Jobcenter_Beneficios' = 'Jobcenter e beneficios'
  'Kindergeld' = 'Kindergeld'
  'Moradia' = 'Moradia e aluguel'
  'Saude_Seguros' = 'Saude e seguros'
  'Trabalho_Renda' = 'Trabalho e renda'
}

$manifest = @()
Get-ChildItem -LiteralPath "$root\Organizado" -Directory | Sort-Object Name | ForEach-Object {
  $cat = $_.Name
  Get-ChildItem -LiteralPath $_.FullName -File | Sort-Object Name | ForEach-Object {
    $manifest += [ordered]@{
      id = [guid]::NewGuid().ToString()
      name = $_.Name
      category = $cat
      categoryLabel = $labels[$cat]
      path = "Organizado/$cat/$($_.Name)"
      size = $_.Length
      extension = $_.Extension.TrimStart('.').ToLower()
      updatedAt = $_.LastWriteTimeUtc.ToString('o')
    }
  }
}

$obj = @{
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  total = $manifest.Count
  categories = $labels
  documents = $manifest
}

$obj | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath "$root\manifest.json" -Encoding UTF8
Write-Host "manifest.json atualizado: $($manifest.Count) documentos"
