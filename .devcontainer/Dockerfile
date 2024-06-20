FROM mcr.microsoft.com/devcontainers/base:jammy
RUN wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /tmp/packages.microsoft.gpg \
    && install -o root -g root -m 644 /tmp/packages.microsoft.gpg /etc/apt/trusted.gpg.d/ \
    && sh -c 'echo "deb [arch=amd64 signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/vscode stable main" > /etc/apt/sources.list.d/vscode.list' \
    && apt-get install -y apt-transport-https \
    && apt-get update \
    && apt-get install -y code # This ensures all vscode depenedencies are installed so that tests can run against a downloaded vscode
RUN apt-get install -y xvfb # For headless running of tests
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs