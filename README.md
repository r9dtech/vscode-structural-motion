# Structural-Motion README

A VSCode plugin which allows you to move code structures (such as functions and classes) up and down with keyboard shortcuts.

## Features

Use the shortcuts Ctrl+Alt+Up or Ctrl+Alt+Down (Cmd+Alt+Up or Cmd+Alt+Down on a Mac) to move the structure under the cursor up or down.

This should work reasonably well in most languages for which VSCode has a good plugin. If a language plugin supports selection widening (Ctrl+Shift+Right) and also supports the "Outline" view (in the "Explorer" panel on the left) then Structural Motion has a good chance of working.

## Known Issues

-   Multiple cursors are not supported
-   Moving selected text is not supported
-   Indentation based languages (such as Python) behave less robustly because the line on which a class and it's last method end are the same, so Structural-Motion can't make a good decision about what to move
-   Line breaks in strange places can confuse Structural-Motion
-   Whitespace at the end of lines can confuse Structural-Motion
-   Moving structures past method chains doesn't work well
