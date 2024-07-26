# Development Environment

If using windows, check this project out under WSL.

This repository contains a devcontainer. VSCode should prompt you to re-open the workspace in the dev container.

Take a look at the CI pipeline (`.github/workflows/ci`) to see how linting and testing are run. we use prettier and eslint, so having the relevant plugins installed is recommended.

## Running the plugin

-   Press `F5` to open a new window with your extension loaded.
-   Run your command from the command palette by pressing (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and typing `Hello World`.
-   Set breakpoints in your code inside `src/extension.ts` to debug your extension.
-   Find output from your extension in the debug console.

## Make changes

-   You can relaunch the extension from the debug toolbar after changing code in `src/extension.ts`.
-   You can also reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code window with your extension to load your changes.

## Run tests

-   Install the [Extension Test Runner](https://marketplace.visualstudio.com/items?itemName=ms-vscode.extension-test-runner)
-   Run the "watch" task via the **Tasks: Run Task** command. Make sure this is running, or tests might not be discovered.
-   Open the Testing view from the activity bar and click the Run Test" button, or use the hotkey `Ctrl/Cmd + ; A`
-   See the output of the test result in the Test Results view.
