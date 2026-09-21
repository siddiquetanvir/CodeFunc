<div align="center">

<img src="https://raw.githubusercontent.com/siddiquetanvir/CodeFunc/main/packages/vscode-extension/media/logo.png" alt="CodeFunc Logo" width="160" height="160" />

# CodeFunc

**Non-intrusive, zero-click architectural file overviews for VS Code.**

[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/TanvirSdq.codefunc-vscode?style=for-the-badge&logo=visual-studio-code&color=007ACC)](https://marketplace.visualstudio.com/items?itemName=TanvirSdq.codefunc-vscode)
[![Marketplace Installs](https://img.shields.io/visual-studio-marketplace/d/TanvirSdq.codefunc-vscode?style=for-the-badge&color=brightgreen)](https://marketplace.visualstudio.com/items?itemName=TanvirSdq.codefunc-vscode)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js Version](https://img.shields.io/badge/Node.js-18+-success?style=for-the-badge&logo=node.js)](https://nodejs.org)

</div>

---

## 💡 What is CodeFunc?

When exploring open-source repositories, onboarding onto large codebases, or reviewing unfamiliar pull requests, developers spend cognitive energy reading hundreds of lines just to answer basic questions:
- *What is the primary responsibility of this file?*
- *What external services, libraries, or base images does it invoke?*
- *What ports, databases, files, or network endpoints are touched?*

**CodeFunc solves this directly at Line 0.** It automatically places a crisp, lightweight **CodeLens glance header** at the top of every file you open—requiring zero clicks, zero prompt typing, and zero side-panel distraction.

```text
🔍 Role: Docker container build based on python:3.10-slim
📦 Uses: python:3.10-slim
💾 I/O: Exposes port 8000
[📖 Detailed Overview] [⚡ Refresh]
```

Clicking **`[📖 Detailed Overview]`** launches a dedicated **glassmorphic side panel** with deep architectural diagrams, data flow breakdown, and risk analysis.

<p align="center">
  <img src="https://github.com/user-attachments/assets/024dd5cd-d8bf-495f-9b2b-999a883988aa" alt="CodeFunc VS Code AI Architectural Overview" width="900" />
  <br />
  <em>✨ CodeFunc in VS Code: Zero-click CodeLens glance header paired with the deep AI Architectural Overview panel.</em>
</p>

---

## ✨ Key Highlights

### ⚡ 1. Universal File Intelligence (v1.0.0)
CodeFunc isn't just for programming languages—it now delivers rich structural overviews across your entire DevOps and infrastructure stack:
- 🐳 **Dockerfiles**: Automatically extracts base images, multi-stage build pipelines, exposed ports, and container entrypoint commands (`CMD` / `ENTRYPOINT`).
- 🐙 **Docker Compose (`docker-compose.yml`)**: Identifies orchestrated services, backing container images, port forwarding bindings, and volume mounts.
- ⚙️ **CI/CD Pipelines (GitHub Actions)**: Analyzes workflow triggers, jobs, and shared actions (`actions/checkout`, `setup-node`, etc.).
- 🐚 **Shell Scripts (`.sh`, `.bash`, `.zsh`)**: Detects automation routines, sourced helper scripts, and CLI utilities (`curl`, `docker`, `kubectl`, `rsync`).
- 📦 **Manifests & Configs (`package.json`, `tsconfig.json`)**: Summarizes package roles, build scripts, TypeScript compiler targets, and dependencies.
- 🗄️ **SQL Schemas & Migrations (`.sql`)**: Identifies queried tables, DDL migrations (`CREATE TABLE`), and data mutation operations.
- 💻 **All Major Languages**: Full AST and heuristic parsing for Python, TypeScript, JavaScript, Go, Rust, Java, C, C++, and C#.

---

### 🛡️ 2. Intelligent Offline Fallback (Zero Config, 100% Free & Private)
- **Works instantly out-of-the-box**: No API key or account needed.
- **Privacy-first**: For non-technical users or enterprise environments with strict security policies, CodeFunc runs a sophisticated local static analysis engine that extracts key mechanisms, patterns, dependencies, and I/O completely on-device.
- **Zero latency**: Local summaries render in **< 5 milliseconds** with 0 network calls.

<p align="center">
  <img src="https://github.com/user-attachments/assets/a0049c44-d8fa-47c2-9deb-d20e929b3f8d" alt="CodeFunc VS Code Offline Local Inspection" width="900" />
  <br />
  <em>🛡️ CodeFunc Offline Mode: Instant heuristic static analysis without sending a single byte outside your machine.</em>
</p>

---

### 🧠 3. Multi-Provider AI Superpowers
Bring your favorite LLM provider for deep, human-like architectural summaries. CodeFunc automatically detects your key on paste:

| Provider | Supported API Keys | Recommended Default Model | Description |
|---|---|---|---|
| **Google Gemini** | `AQ...` / `AIzaSy...` | `gemini-3.6-flash` | Uses Google's latest official **Interactions API** with structured JSON output. |
| **Groq** | `gsk_...` | `llama-3.3-70b-versatile` | Blazing-fast inference (500+ tokens/sec) on LPUs, completely free tier available. |
| **OpenRouter** | `sk-or-...` or `sk-...` | `google/gemini-2.5-flash` / `meta-llama/llama-3.3-70b-instruct` | Unified gateway to hundreds of open-source and commercial foundation models. |
| **Anthropic** | `sk-ant-...` | `claude-3-5-haiku-latest` | Native Claude Messages API with high analytical precision. |

---

### 🎨 4. Custom Analysis Personas
Tailor your code lens to your current objective via the `codefunc.persona` setting:
- **General Developer**: Focuses on architectural intent, high-level business logic, and component flow.
- **Security Auditor**: Highlights sensitive data handling, authentication/authorization layers, network attack surfaces, and untrusted inputs.
- **Performance Expert**: Spotlights computational complexity (e.g. 2D grid loops, nested iterations), memory allocations, and potential I/O bottlenecks.

---

### ⚡ 5. Performance by Design
- **Cryptographic MD5 Caching**: Unchanged files are hashed and served instantaneously from memory/workspace cache. Zero repeated API calls while editing.
- **Smart Ignore Filter**: Automatically ignores minified bundles (`*.min.js`, `*.min.css`), lockfiles (`package-lock.json`, `pnpm-lock.yaml`), binary assets (`.png`, `.wasm`, `.pyc`), and vendor folders (`node_modules/`, `.git/`).
- **Responsive Stacking**: If a summary exceeds your viewport, CodeFunc gracefully splits the content into stacked CodeLens lines so you never experience horizontal scroll overflow.

---

## 🔒 Security & Why We Don't Hardcode Shared API Keys

> [!IMPORTANT]
> **Design Philosophy**: CodeFunc will **never hardcode a shared public API key** inside the extension client.

1. **Vulnerability of Client Keys**: Extensions distributed via the VS Code Marketplace are client-side JavaScript packages. Any hardcoded API key can be extracted by automated scrapers in seconds, leading to immediate revocation, billing abuse, or global rate limit lockouts for all users.
2. **True Reliability**: By pairing an **intelligent zero-cost local offline parser** with a **Bring-Your-Own-Key (BYOK)** model, you get 100% reliable functionality that never breaks because someone else burned through a shared token pool.
3. **OS Keychain Encryption**: When you provide an API key, it is encrypted in your operating system's native keychain using VS Code's `SecretStorage` API. It is never committed to Git, logged to disk, or sent to any intermediary server.

---

## 🚀 Installation & Quick Start

### 🖥️ A. VS Code Extension

#### Option 1: From VS Code Marketplace
1. Open VS Code.
2. Press `Cmd+P` (macOS) or `Ctrl+P` (Windows/Linux) and run:
   ```bash
   ext install TanvirSdq.codefunc-vscode
   ```
3. Open any file (Python, TypeScript, Dockerfile, YAML, etc.)—**CodeFunc is active immediately!**

#### Option 2: From `.vsix` Release
1. Download `codefunc-vscode-1.0.0.vsix` from the [Releases](https://github.com/siddiquetanvir/CodeFunc/releases) tab.
2. Install via command line:
   ```bash
   code --install-extension codefunc-vscode-1.0.0.vsix
   ```

---

### 🌐 B. Chrome Extension for GitHub (Load Locally in 60s)

You can run CodeFunc directly inside Google Chrome, Brave, Microsoft Edge, Arc, or Opera to get instant file overviews while browsing GitHub repositories:

<p align="center">
  <img src="https://github.com/user-attachments/assets/bfb3a770-0049-41d7-85d2-92ff9901ca43" alt="CodeFunc Chrome Extension Overview on GitHub" width="900" />
  <br />
  <em>🌐 CodeFunc for GitHub: Passive architectural glance banner injected right above file content in your browser.</em>
</p>

#### Method 1: Using Pre-Packaged Release (No Node.js Required)
1. Download [`codefunc-chrome-v1.0.0.zip`](https://github.com/siddiquetanvir/CodeFunc/releases) from GitHub Releases (or locate it in `packages/chrome-extension/codefunc-chrome-v0.1.0.zip`).
2. Unzip the `.zip` file to any folder on your computer.
3. Open your browser and navigate to:
   - **Chrome / Brave / Arc**: `chrome://extensions`
   - **Microsoft Edge**: `edge://extensions`
4. Toggle on **"Developer mode"** in the top-right corner.
5. Click **"Load unpacked"** in the top-left toolbar.
6. Select the unzipped folder (containing `manifest.json`, `content.js`, etc.).
7. **That's it!** Open any file on GitHub (e.g. any repository's `Dockerfile`, `.py`, or `.ts`), and CodeFunc will inject the architectural glance header right above the file.

#### Method 2: Building from Source
```bash
# 1. Clone the repository
git clone https://github.com/siddiquetanvir/CodeFunc.git
cd CodeFunc

# 2. Install dependencies & build extension
npm install
npm run build --workspace=packages/chrome-extension

# 3. Load in Chrome:
# Go to chrome://extensions -> Enable Developer Mode -> Click "Load unpacked" -> Select:
# CodeFunc/packages/chrome-extension/dist
```

---

## ⌨️ Command Palette Reference

Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

| Command | Action |
|---|---|
| `CodeFunc: Set AI API Key` | Prompts for your Gemini, Groq, OpenRouter, or Anthropic key and securely stores it in the OS keychain. |
| `CodeFunc: Clear AI API Key` | Deletes the stored API key and seamlessly transitions back to local offline mode. |
| `CodeFunc: Refresh File Summary` | Forces re-analysis of the currently active document, bypassing cache. |
| `CodeFunc: Clear Summary Cache` | Wipes the entire MD5 in-memory and workspace summary cache. |
| `CodeFunc: Show File Details` | Displays quick overview dialog for the active document. |
| `CodeFunc: Open Deep Architectural Overview` | Opens the split-screen glassmorphic Webview panel for comprehensive file exploration. |

---

## ⚙️ Configuration Options

Customize CodeFunc via your VS Code `settings.json`:

```json
{
  // Enable or disable CodeFunc CodeLens headers
  "codefunc.enabled": true,

  // AI Provider: "auto", "gemini", "groq", "openrouter", "anthropic"
  "codefunc.provider": "auto",

  // Optional custom model override (leave empty for recommended defaults)
  "codefunc.model": "",

  // Analysis persona: "General Developer", "Security Auditor", "Performance Expert"
  "codefunc.persona": "General Developer",

  // Show detected I/O and side effects in CodeLens
  "codefunc.showSideEffects": true,

  // Maximum character width before stacking CodeLens badges
  "codefunc.maxCodeLensLength": 70,

  // Skip minified files, lockfiles, and binaries to save tokens
  "codefunc.ignoreMinified": true,

  // Skip files larger than N lines (0 to disable)
  "codefunc.maxFileLines": 8000
}
```

---

## 🏗️ Monorepo Architecture

CodeFunc is built as an extensible, modular TypeScript monorepo using npm workspaces:

```text
CodeFunc/
├── packages/
│   ├── core/                  # Engine: parsers, content hashing, LLM orchestration
│   │   ├── src/
│   │   │   ├── parser.ts      # Multi-language & DevOps heuristic extractors
│   │   │   ├── gemini.ts      # LLM clients (Gemini, Groq, OpenRouter, Claude) & local fallback
│   │   │   ├── hash.ts        # Fast MD5 document hashing
│   │   │   └── types.ts       # Shared schemas & TypeScript interfaces
│   │   └── tests/             # Automated test suite (11 unit tests)
│   └── vscode-extension/      # VS Code Extension Host
│       ├── src/
│       │   ├── extension.ts        # Activation, registration, status bar
│       │   ├── codelens-provider.ts# Line 0 CodeLens provider with smart wrap
│       │   ├── secret-manager.ts   # VS Code SecretStorage encryption
│       │   └── vs-cache.ts         # Persistent WorkspaceState cache adapter
│       └── package.json            # Extension manifest & configuration
├── examples/                  # Sample test files for various languages
└── package.json               # Root monorepo workspace configuration
```

---

## 🛠️ Local Development & Testing

### Prerequisites
- Node.js 18+
- npm 9+
- VS Code 1.85+

### Build and Run Tests
```bash
# Clone the repository
git clone https://github.com/siddiquetanvir/CodeFunc.git
cd CodeFunc

# Install dependencies across all workspaces
npm install

# Run automated tests in @codefunc/core
npm test --workspace=packages/core

# Build extension bundle with esbuild
npm run package --workspace=packages/vscode-extension
```

### Debugging Live in VS Code
1. Open the `CodeFunc` repository folder in VS Code.
2. Press **`F5`** (or select **Run > Start Debugging**).
3. A new **Extension Development Host** window will open.
4. Open any file in the test window to see live CodeLens summaries appear instantly!

---

## 🤝 Contributing

Contributions, issues, and feature ideas are warmly welcome!
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add support for Kubernetes manifests'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**. See the [LICENSE](LICENSE) file for full details.

Copyright © 2026 [Tanvir Siddique](https://github.com/siddiquetanvir). All rights reserved.
