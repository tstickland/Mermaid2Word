# Installs the Mermaid Diagrams add-in for Word on Windows, for the current user only (no admin needed).
# Downloads the manifest and registers it the same way Office's developer tools sideload add-ins.
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$baseUrl = "__ADDIN_BASE_URL__"
$addinId = "__ADDIN_ID__"
$installDir = Join-Path $env:LOCALAPPDATA "Mermaid2Word"
$manifestPath = Join-Path $installDir "manifest.xml"
$registryKey = "HKCU:\Software\Microsoft\Office\16.0\Wef\Developer"

New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Invoke-WebRequest -UseBasicParsing -Uri "${baseUrl}manifest.xml" -OutFile $manifestPath

if (-not (Test-Path $registryKey)) { New-Item -Path $registryKey -Force | Out-Null }
New-ItemProperty -Path $registryKey -Name $addinId -Value $manifestPath -PropertyType String -Force | Out-Null

Write-Host "Mermaid Diagrams add-in installed."
if (Get-Process WINWORD -ErrorAction SilentlyContinue) {
  Write-Host "Close ALL Word windows and reopen Word."
}
Write-Host "In Word, go to Home > Add-ins and choose 'Mermaid Diagrams' (under Developer Add-ins)."
Write-Host "After the first time, it also appears at Insert > Mermaid Diagram."
