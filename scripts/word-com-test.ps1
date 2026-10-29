# Inserts every OOXML package from test-output/ into a real Word document through COM
# (Range.InsertXML uses the same import path as Office.js insertOoxml), saves .docx + .pdf,
# checks that alt text survives, and tests replacing a diagram in place.
# Run after `npm run test:render`. Uses its own hidden Word instance; if Word stops
# responding (e.g. a hidden prompt), only that instance is stopped after the timeout.
param(
  [string]$OutDir = (Join-Path $PSScriptRoot "..\test-output"),
  [int]$TimeoutSeconds = 180
)
$OutDir = (Resolve-Path $OutDir).Path
$before = @(Get-Process WINWORD -ErrorAction SilentlyContinue | ForEach-Object Id)

$job = Start-Job -ArgumentList $OutDir -ScriptBlock {
  param($OutDir)
  $failures = 0
  $files = Get-ChildItem $OutDir -Filter "*.ooxml.xml" | Where-Object { $_.Name -notlike "*.inner.*" } | Sort-Object Name
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  try {
    $doc = $word.Documents.Add()
    foreach ($f in $files) {
      $end = $doc.Content; $end.Collapse(0)
      $end.InsertAfter($f.Name); $end.InsertParagraphAfter()
      $end = $doc.Content; $end.Collapse(0)
      $end.InsertXML([IO.File]::ReadAllText($f.FullName))
    }
    $doc.SaveAs2("$OutDir\all-diagrams.docx", 16)
    $doc.ExportAsFixedFormat("$OutDir\all-diagrams.pdf", 17)
    "Saved all-diagrams.docx and all-diagrams.pdf"

    $count = $doc.InlineShapes.Count
    "Inline pictures: $count (expected $($files.Count))"
    if ($count -ne $files.Count) { $failures++ }

    $tagged = 0
    foreach ($cc in $doc.ContentControls) { if ($cc.Tag -eq "mermaid-diagram") { $tagged++ } }
    "Tagged content controls: $tagged"
    if ($tagged -ne $files.Count) { $failures++ }

    # Alt text exactly as Word stores it, for comparison with the *.alt.txt originals.
    $alt = @(); foreach ($s in $doc.InlineShapes) { $alt += $s.AlternativeText }
    [IO.File]::WriteAllText("$OutDir\word-alt-texts.json", (ConvertTo-Json $alt))

    # Replace the first diagram's picture in place (the "Update selected" path).
    $cc = @($doc.ContentControls)[0]
    $cc.Range.InlineShapes.Item(1).Range.InsertXML([IO.File]::ReadAllText("$OutDir\pie.inner.ooxml.xml"))
    $pics = $cc.Range.InlineShapes
    "After in-place replace: control holds $($pics.Count) picture(s), $($cc.Range.Paragraphs.Count) paragraph(s)"
    if ($pics.Count -ne 1 -or -not $pics.Item(1).AlternativeText.Contains("pie")) { "FAIL replace"; $failures++ }

    $doc.Close([ref]0)
  } finally {
    $word.Quit([ref]0)
  }
  "FAILURES=$failures"
}

if (-not (Wait-Job $job -Timeout $TimeoutSeconds)) {
  Write-Host "Word did not finish within $TimeoutSeconds s; stopping the Word instance this script started."
  Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id } | Stop-Process -Force
  Stop-Job $job
  Receive-Job $job | Write-Host
  exit 1
}
$output = Receive-Job $job
$output | Where-Object { $_ -notlike "FAILURES=*" } | Write-Host
$failures = [int](($output | Where-Object { $_ -like "FAILURES=*" }) -replace "FAILURES=", "")
Write-Host "$failures problem(s)"
exit $failures
