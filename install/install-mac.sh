#!/bin/bash
# Installs the Mermaid Diagrams add-in for Word on Mac (sideloads the manifest; no admin needed).
set -euo pipefail
wef_dir="$HOME/Library/Containers/com.microsoft.Word/Data/Documents/wef"
mkdir -p "$wef_dir"
curl -fsSL "__ADDIN_BASE_URL__manifest.xml" -o "$wef_dir/mermaid2word.xml"
echo "Mermaid Diagrams add-in installed."
echo "Quit Word completely and reopen it. Then click Add-ins (Home or Insert tab) and choose 'Mermaid Diagrams'."
echo "After the first time, it also appears at Insert > Mermaid Diagram."
