#!/bin/bash
# Removes the Mermaid Diagrams add-in installed by install-mac.sh.
rm -f "$HOME/Library/Containers/com.microsoft.Word/Data/Documents/wef/mermaid2word.xml"
echo "Mermaid Diagrams add-in removed. Quit and reopen Word to finish."
