import { defineConfig } from '@vscode/test-cli';

import { env } from 'process';

function allowNativeVsCodeToRunInWsl() {
    delete env['VSCODE_IPC_HOOK_CLI']; // This is a hack to allow the extensions to be installed when working inside WSL+devcontainer
    env['DONT_PROMPT_WSL_INSTALL'] = 'TRUE'; // Without this, the extension installer just hangs asking for input
}

allowNativeVsCodeToRunInWsl();

export default defineConfig({
    files: 'out/test/**/*.test.js',
    mocha: {
        timeout: 10 * 1000,
    },
    installExtensions: ['ms-python.python'],
});
