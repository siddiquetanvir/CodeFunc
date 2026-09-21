# CodeFunc for Chrome & Chromium Browsers

> **Instant, non-intrusive architectural file overviews directly on GitHub.**

CodeFunc for Chrome brings the power of CodeFunc directly into your browser when exploring code on GitHub. As you browse repositories, pull requests, or commits on `github.com`, CodeFunc passively renders a clean, single-line glance banner right above the file content:

<p align="center">
  <img src="https://github.com/user-attachments/assets/34b789a1-4d74-429e-8a6b-fbb4625090d9" alt="CodeFunc Chrome Extension Overview on GitHub" width="900" />
  <br />
  <em>🌐 CodeFunc in action on GitHub: Instant architectural overview banner directly above repository code.</em>
</p>

---

## 🚀 Key Features

- **Direct GitHub Integration**: Injects seamlessly into GitHub's blob code viewer without disrupting your browsing flow.
- **Universal File Support**: Works on **Dockerfiles**, **Docker Compose** (`docker-compose.yml`), **CI/CD Workflows** (GitHub Actions), **Shell scripts** (`.sh`), **Node/TS manifests** (`package.json`, `tsconfig.json`), **SQL files**, and all major programming languages (Python, TypeScript, Go, Rust, Java, C/C++, C#).
- **Intelligent Offline Fallback**: Works completely free without an API key using `@codefunc/core/src`'s on-device static analysis engine.
- **Multi-Provider AI (Optional)**: Support for Gemini, Groq, OpenRouter, and Claude via the extension popup settings.
- **Privacy & Security**: Zero telemetry. If no API key is set, your code is analyzed entirely in-browser without sending a single byte to external servers.

---

## 🛠️ How to Download & Load Locally (Unpacked Extension)

Since the extension can be run directly in Developer Mode on Google Chrome, Brave, Microsoft Edge, Arc, or Opera, you can load it in under 60 seconds.

### Method 1: Using Pre-Packaged Release (No Node.js Required)

1. Download [`codefunc-chrome-v1.0.1.zip`](https://github.com/siddiquetanvir/CodeFunc/releases) from the Releases page (or from this repository under `packages/chrome-extension/`).
2. Extract/unzip the `.zip` archive into a folder on your computer.
3. Open your Chromium-based browser (Chrome, Brave, Edge, Arc) and go to the extensions management page:
   - **Chrome / Brave / Arc**: `chrome://extensions`
   - **Edge**: `edge://extensions`
4. Toggle on **"Developer mode"** in the top-right corner.
5. Click the **"Load unpacked"** button in the top-left corner.
6. Select the extracted folder (containing `manifest.json`, `content.js`, `background.js`, `icons/`, etc.).
7. **Done!** Navigate to any file on GitHub (for example: [CampusShare Dockerfile](https://github.com/siddiquetanvir/CampusShare) or any repository file), and the CodeFunc glance banner will render automatically!

---

### Method 2: Building from Source (For Developers)

1. Clone the repository:
   ```bash
   git clone https://github.com/siddiquetanvir/CodeFunc.git
   cd CodeFunc
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the Chrome extension:
   ```bash
   npm run build --workspace=packages/chrome-extension
   ```
   _(Or run `npm run watch --workspace=packages/chrome-extension` for auto-rebuilding while making edits)_
4. Open `chrome://extensions` in your browser.
5. Enable **Developer mode** (toggle in top right).
6. Click **Load unpacked** and select the folder:
   ```
   CodeFunc/packages/chrome-extension/dist
   ```

---

## ⚙️ Extension Settings & Optional AI Key

Click the **CodeFunc icon** in your browser toolbar to open the settings popup:

- **AI API Key (Optional)**: Paste your key from Google Gemini, Groq, OpenRouter, or Anthropic. If left empty, CodeFunc operates entirely offline using intelligent heuristic extraction.
- **Analysis Perspective**: Choose between **General Developer**, **Security Auditor**, or **Performance Expert**.
- Click **Save Settings**.

---

## 📄 License

GNU Affero General Public License v3.0 (AGPLv3) © 2026 Tanvir Siddique. All rights reserved.
