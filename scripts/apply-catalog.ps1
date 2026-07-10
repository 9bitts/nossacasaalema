$root = Split-Path $PSScriptRoot -Parent
$catalogPath = Join-Path $PSScriptRoot "documents-catalog.json"
$catalogRaw = Get-Content -LiteralPath $catalogPath -Encoding UTF8 | ConvertFrom-Json

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

$byKey = @{}
$byFileName = @{}
$catalogRaw.PSObject.Properties | ForEach-Object {
  $byKey[$_.Name] = $_.Value
  $byFileName[$_.Value.fileName] = $_.Value
}

function Find-Meta($category, $fileName) {
  $key = "$category|$fileName"
  if ($byKey.ContainsKey($key)) { return $byKey[$key] }
  if ($byFileName.ContainsKey($fileName)) { return $byFileName[$fileName] }
  return $null
}

$manifest = @()
$missing = @()

Get-ChildItem -LiteralPath "$root\Organizado" -Directory | Sort-Object Name | ForEach-Object {
  $cat = $_.Name
  Get-ChildItem -LiteralPath $_.FullName -File | Sort-Object Name | ForEach-Object {
    $meta = Find-Meta $cat $_.Name
    if (-not $meta) {
      $missing += "$cat|$($_.Name)"
      return
    }

    $manifest += [ordered]@{
      id = [guid]::NewGuid().ToString()
      name = $_.Name
      nameDe = $meta.nameDe
      namePt = $meta.namePt
      descriptionPt = $meta.descriptionPt
      category = $cat
      categoryLabel = $labels[$cat]
      path = "Organizado/$cat/$($_.Name)"
      size = $_.Length
      extension = $_.Extension.TrimStart('.').ToLower()
      updatedAt = $_.LastWriteTimeUtc.ToString('o')
    }
  }
}

if ($missing.Count -gt 0) {
  Write-Warning "Sem catalogo ($($missing.Count)):"
  $missing | ForEach-Object { Write-Warning "  $_" }
}

$obj = @{
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  total = $manifest.Count
  categories = $labels
  documents = $manifest
}

$obj | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath "$root\manifest.json" -Encoding UTF8
Write-Host "manifest.json: $($manifest.Count) documentos"
