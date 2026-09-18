# CodeFunc

> **Non-intrusive, zero-click file state overview for VS Code (and future Chrome extension)**

CodeFunc passively displays a clean, single-line **glance header** at line 0 of active files when collaborating, browsing, or inspecting codebases:
```text
🔍 Role: Initializes express server and health endpoints | 📦 Uses: express, axios, fs | 💾 I/O: fs access "config.json"; HTTP request to https://service.internal/health
```

---

## 🚀 Key Features

- **Zero-Click Non-Intrusive UX**: Uses VS Code's native **CodeLens API** positioned at Line 0. It never blocks lines or alters your source code.
- **Multi-Provider AI Intelligence**:
  - **Anthropic** (`sk-ant-...`): Direct Claude 3.5 Haiku & Sonnet inference with native Messages API.
  - **OpenRouter** (`sk-or-...`): Access Gemini, Claude, Llama 3.3, and hundreds of models with unified billing.
  - **Groq** (`gsk_...`): Free, ultra-fast 500 tokens/sec inference (Llama 3.3 70B, Qwen).
  - **Google Gemini** (`AQ...` / `AIzaSy...`): Native Gemini Flash support.
  - **Smart Auto-Detection**: Paste any key and CodeFunc automatically selects the right provider.
- **Custom AI Personas**:
  - Choose between **General Developer**, **Security Auditor**, or **Performance Expert** via `codefunc.persona`.
- **Smart Ignore Protection**:
  - Automatically avoids summarizing minified files (`*.min.*`), bundle locks, and oversized files (`codefunc.maxFileLines`) to conserve API tokens.
- **2-3 Line Deep Understanding for Large Files**:
  - Supports comprehensive multi-sentence explanations and dual-tier CodeLens badges (role + algorithmic mechanisms + I/O).
- **Hybrid Performance Architecture**:
  - **Local Static Extractor**: Pre-extracts imports, file I/O operations (e.g. `open()`, `fs.readFile`, `pd.read_csv`), network calls (`fetch`, `requests`), 2D grid/matrix algorithms, and signatures.
  - **MD5 Content Hash Caching**: Instantly retrieves cached summaries for unchanged files with zero latency and zero API calls (capped at 500 items to prevent memory bloating).
  - **Resilient Fallback**: If no API key is configured or offline, automatically provides rich local algorithmic inspection without failing.
- **Deep Architectural Overview**: Side-by-side split Markdown view + rich hover cards for large, complex codebases.
- **Multi-Language Support**: Python, JS/TS, C/C++, Go, Rust, Java, C#, and generic file fallback.
- **Secure Key Storage**: API keys are encrypted in your machine's OS keychain via VS Code `SecretStorage`.

---

## 📁 Monorepo Structure

```text
CodeFunc/
├── packages/
│   ├── core/                  # Shared platform-agnostic engine
│   │   ├── src/
│   │   │   ├── parser.ts      # Multi-language static extraction
│   │   │   ├── hash.ts        # MD5 content hasher
│   │   │   ├── gemini.ts      # Gemini API client & fallback logic
│   │   │   └── types.ts       # Shared TypeScript schemas
│   │   └── tests/             # Unit test suite
│   └── vscode-extension/      # VS Code extension host
│       ├── src/
│       │   ├── extension.ts        # Activation, commands, status bar
│       │   ├── codelens-provider.ts# Line 0 CodeLens provider
│       │   ├── secret-manager.ts   # VS Code SecretStorage manager
│       │   └── vs-cache.ts         # WorkspaceState cache adapter
│       └── package.json            # Extension manifest & settings
├── examples/                  # Test files (Python, TypeScript)
├── .vscode/
│   ├── launch.json            # F5 Extension Debugging configuration
│   └── tasks.json             # Build tasks
├── package.json               # Root npm workspaces configuration
└── tsconfig.json
```

---

## 🛠️ Getting Started & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Build All Packages
```bash
npm run build
```

### 3. Run Unit Tests
```bash
npm test
```

### 4. Test Live in VS Code (F5 Debugging)
1. Open this `CodeFunc` directory in VS Code.
2. Press **`F5`** (or go to the **Run & Debug** menu and click **Run CodeFunc Extension**).
3. An **[Extension Development Host]** test window will launch.
4. In the test window, open any code file (such as `examples/sample_model.py` or `examples/sample_server.ts`).
5. You will see the CodeLens header appear at the very top of the file!

---

## ⚙️ Configuration & Commands

Open the VS Code Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

| Command | Description |
|---|---|
| `CodeFunc: Set Gemini API Key` | Securely stores your Gemini API key in VS Code SecretStorage |
| `CodeFunc: Clear Gemini API Key` | Removes the stored API key |
| `CodeFunc: Refresh File Summary` | Re-analyzes active files and updates CodeLens |
| `CodeFunc: Clear Summary Cache` | Wipes the local hash cache |
| `CodeFunc: Show File Details` | Opens a detail view when clicking on a CodeLens badge |

### Settings (`settings.json`):
- `codefunc.enabled`: Enable or disable the CodeLens overview (default: `true`).
- `codefunc.model`: Gemini model to use (`gemini-3.8-flash` or `gemini-3.5-flash-lite`).
- `codefunc.showSideEffects`: Whether to display detected I/O and side effects (default: `true`).

---

## 📄 License
GNU Affero General Public License v3.0 (AGPLv3) © 2026 Tanvir Siddique. All rights reserved.
