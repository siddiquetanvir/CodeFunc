import * as vscode from 'vscode';
import { FileSummary } from '@codefunc/core';
import * as path from 'path';

export class CodeFuncOverviewPanel {
  public static currentPanel: CodeFuncOverviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static render(
    extensionUri: vscode.Uri,
    uri: vscode.Uri,
    summary: FileSummary | undefined,
    hasApiKey: boolean
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.One;

    const title = `CodeFunc: ${path.basename(uri.fsPath)}`;

    if (CodeFuncOverviewPanel.currentPanel) {
      CodeFuncOverviewPanel.currentPanel._panel.reveal(column);
      CodeFuncOverviewPanel.currentPanel._update(uri, summary, hasApiKey);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'codefuncOverview',
      title,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    CodeFuncOverviewPanel.currentPanel = new CodeFuncOverviewPanel(panel, extensionUri, uri, summary, hasApiKey);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    uri: vscode.Uri,
    summary: FileSummary | undefined,
    hasApiKey: boolean
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update(uri, summary, hasApiKey);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case 'setApiKey':
            vscode.commands.executeCommand('codefunc.setApiKey');
            break;
          case 'refresh':
            vscode.commands.executeCommand('codefunc.refreshSummary');
            break;
          case 'openSettings':
            vscode.commands.executeCommand('workbench.action.openSettings', 'codefunc');
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public update(uri: vscode.Uri, summary: FileSummary | undefined, hasApiKey: boolean) {
    this._update(uri, summary, hasApiKey);
  }

  private _update(uri: vscode.Uri, summary: FileSummary | undefined, hasApiKey: boolean) {
    const webview = this._panel.webview;
    const fileName = path.basename(uri.fsPath);
    const relPath = vscode.workspace.asRelativePath(uri);
    this._panel.title = `CodeFunc: ${fileName}`;
    this._panel.webview.html = this._getHtmlForWebview(webview, relPath, summary, hasApiKey);
  }

  public dispose() {
    CodeFuncOverviewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    filePath: string,
    summary: FileSummary | undefined,
    hasApiKey: boolean
  ): string {
    const role = summary?.coreRole || 'Analyzing module architecture...';
    const desc = summary?.detailedSummary || '';
    const deps = (summary?.dependencies || []).filter((d) => d && d !== 'None detected');
    const ios = (summary?.sideEffects || []).filter((s) => s && s !== 'None detected');
    const mechanisms = (summary?.keyMechanisms || []).filter((m) => m);
    const errorInfo = summary?.error ? this._formatHumanError(summary.error) : null;

    // SVG Octicons (crisp, modern vector graphics matching Chrome extension)
    const sparkleSvg = `<svg class="octicon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M7.53 1.282a.5.5 0 0 1 .94 0l.91 2.825a2.5 2.5 0 0 0 1.624 1.624l2.825.91a.5.5 0 0 1 0 .94l-2.825.91a2.5 2.5 0 0 0-1.624 1.624l-.91 2.825a.5.5 0 0 1-.94 0l-.91-2.825a2.5 2.5 0 0 0-1.624-1.624l-2.825-.91a.5.5 0 0 1 0-.94l2.825-.91a2.5 2.5 0 0 0 1.624-1.624l.91-2.825Z"></path></svg>`;
    const packageSvg = `<svg class="octicon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="m8.878.392 5.25 3.045c.54.314.872.89.872 1.514v6.098a1.75 1.75 0 0 1-.872 1.514l-5.25 3.045a1.75 1.75 0 0 1-1.756 0l-5.25-3.045A1.75 1.75 0 0 1 1 11.049V4.951c0-.624.332-1.201.872-1.514L7.122.392a1.75 1.75 0 0 1 1.756 0ZM7.875 1.69l-4.63 2.685L8 7.133l4.755-2.758-4.63-2.685a.248.248 0 0 0-.25 0ZM2.5 5.677v5.372c0 .09.047.171.125.216l4.625 2.683V8.432L2.5 5.677Zm11 5.372V5.677L8.75 8.432v5.516l4.625-2.683a.25.25 0 0 0 .125-.216Z"></path></svg>`;
    const arrowSwapSvg = `<svg class="octicon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-2.5 2.5a.75.75 0 0 1-1.06-1.06L11.44 5.5H3.75a.75.75 0 0 1 0-1.5h7.69L10.22 2.78a.75.75 0 0 1 1.06-1.06l2.5 2.5Zm-11.56 7.56a.75.75 0 0 1 1.06-1.06L4.56 11.94H12.25a.75.75 0 0 1 0 1.5H4.56l1.22 1.22a.75.75 0 1 1-1.06 1.06l-2.5-2.5Z"></path></svg>`;
    const circuitSvg = `<svg class="octicon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M1.75 1.5A1.75 1.75 0 0 0 0 3.25v9.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 16 12.75v-9.5A1.75 1.75 0 0 0 14.25 1.5H1.75ZM1.5 3.25a.25.25 0 0 1 .25-.25h12.5a.25.25 0 0 1 .25.25v9.5a.25.25 0 0 1-.25.25H1.75a.25.25 0 0 1-.25-.25v-9.5Zm4 3.75a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>`;
    const keySvg = `<svg class="octicon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M6.5 1a5.5 5.5 0 0 0-4.78 8.22.75.75 0 0 1 .05.68l-1.5 3.5a.75.75 0 0 0 .97.97l2.25-.96 1.78 1.78a.75.75 0 0 0 1.06 0l1.5-1.5a.75.75 0 0 0 0-1.06L6.5 11.3v-.62a.75.75 0 0 1 .22-.53A5.5 5.5 0 1 0 6.5 1ZM2.5 6.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm7 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z"></path></svg>`;
    const refreshSvg = `<svg class="octicon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .655-.835Zm11.758.835a.75.75 0 0 1-.834-.656 5.5 5.5 0 0 0-9.592-2.97l1.204 1.204a.25.25 0 0 1-.177.427H.414a.25.25 0 0 1-.25-.25V3.004a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-.655.835Z"></path></svg>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeFunc Architectural Overview</title>
  <style>
    :root {
      --bg-card: var(--vscode-editorWidget-background, rgba(22, 27, 34, 0.7));
      --border-card: var(--vscode-editorWidget-border, var(--vscode-widget-border, #30363d));
      --accent-blue: var(--vscode-textLink-foreground, #58a6ff);
      --text-main: var(--vscode-editor-foreground, #e6edf3);
      --text-muted: var(--vscode-descriptionForeground, #8b949e);
      --tag-bg: var(--vscode-badge-background, #161b22);
      --tag-border: var(--vscode-widget-border, #30363d);
      --tag-fg: var(--vscode-badge-foreground, #c9d1d9);
      
      --btn-bg: var(--vscode-button-secondaryBackground, #21262d);
      --btn-fg: var(--vscode-button-secondaryForeground, #c9d1d9);
      --btn-hover: var(--vscode-button-secondaryHoverBackground, #30363d);
      
      --btn-primary-bg: var(--vscode-button-background, #238636);
      --btn-primary-fg: var(--vscode-button-foreground, #ffffff);
      --btn-primary-hover: var(--vscode-button-hoverBackground, #2ea043);
    }

    body {
      margin: 0;
      padding: 24px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      color: var(--vscode-editor-foreground, var(--text-main));
      background-color: var(--vscode-editor-background, #0d1117);
      line-height: 1.6;
    }

    .container {
      max-width: 860px;
      margin: 0 auto;
    }

    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-card);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.2px;
      color: var(--text-main);
    }

    .file-badge {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-size: 12px;
      padding: 3px 8px;
      background: var(--tag-bg);
      border: 1px solid var(--border-card);
      border-radius: 6px;
      color: var(--accent-blue);
    }

    /* Main Architectural Card */
    .card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-card);
      border-left: 4px solid var(--accent-blue);
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }

    .role-section {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }

    .role-icon {
      color: var(--accent-blue);
      flex-shrink: 0;
      margin-top: 3px;
      filter: drop-shadow(0 0 6px rgba(88, 166, 255, 0.6));
    }

    .role-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.35;
      margin: 0;
    }

    .flow-desc {
      font-size: 14px;
      color: var(--text-main);
      line-height: 1.65;
      margin-left: 28px;
      margin-bottom: 20px;
    }

    /* Metadata tags / badges */
    .meta-group {
      margin-left: 28px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 14px;
      border-top: 1px solid var(--border-card);
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .meta-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      min-width: 110px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--tag-bg);
      border: 1px solid var(--tag-border);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-main);
      transition: all 0.2s ease;
    }

    .tag:hover {
      border-color: var(--accent-blue);
      color: var(--text-main);
      background: var(--btn-bg);
    }

    .tag .octicon {
      color: var(--accent-blue);
    }

    /* API Key Warning / Prompt Banner */
    .banner-api {
      border-radius: 8px;
      padding: 16px 18px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .banner-api-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .banner-api-title {
      font-size: 13.5px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .banner-api-msg {
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
    }

    .banner-api-tip {
      font-size: 12px;
      line-height: 1.4;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Actions Bar */
    .actions-bar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    button.btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--btn-bg);
      color: var(--text-main);
      border: 1px solid var(--border-card);
      border-radius: 6px;
      padding: 7px 14px;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      flex-shrink: 0;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    button.btn:hover {
      background: var(--btn-hover);
      border-color: var(--accent-blue);
      color: var(--text-main);
    }

    button.btn-primary {
      background: var(--btn-primary-bg);
      border-color: var(--border-card);
      color: var(--btn-primary-fg);
    }

    button.btn-primary:hover {
      background: var(--btn-primary-hover);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <div class="brand">
        <span class="brand-title">⚡ CodeFunc Architectural Overview</span>
      </div>
      <span class="file-badge">${filePath}</span>
    </div>

    ${
      errorInfo
        ? `<div class="banner-api" style="background: var(--vscode-inputValidation-errorBackground, rgba(239, 68, 68, 0.08)); border: 1px solid var(--vscode-inputValidation-errorBorder, rgba(239, 68, 68, 0.35));">
            <div class="banner-api-header">
              <span class="banner-api-title" style="color: var(--vscode-errorForeground, #f87171);">
                ${errorInfo.title}
              </span>
              <button class="btn btn-primary" onclick="sendMessage('setApiKey')">
                ${keySvg} Switch / Update Key
              </button>
            </div>
            <p class="banner-api-msg" style="color: var(--text-main);">
              ${errorInfo.message}
            </p>
            ${
              errorInfo.tip
                ? `<div class="banner-api-tip" style="color: var(--vscode-editorWarning-foreground, #fbbf24);">
                    ${errorInfo.tip}
                  </div>`
                : ''
            }
          </div>`
        : !hasApiKey
        ? `<div class="banner-api" style="background: var(--vscode-inputValidation-warningBackground, rgba(245, 158, 11, 0.08)); border: 1px solid var(--vscode-inputValidation-warningBorder, rgba(245, 158, 11, 0.3));">
            <div class="banner-api-header">
              <span class="banner-api-title" style="color: var(--vscode-editorWarning-foreground, #fbbf24);">
                💡 Using Local Static Inspection
              </span>
              <button class="btn btn-primary" onclick="sendMessage('setApiKey')">
                ${keySvg} Set API Key
              </button>
            </div>
            <p class="banner-api-msg" style="color: var(--text-main);">
              Connect a Gemini, Groq, or OpenRouter API Key for automated deep architectural reasoning.
            </p>
          </div>`
        : ''
    }

    <div class="card">
      <div class="role-section">
        <div class="role-icon">${sparkleSvg}</div>
        <h2 class="role-title">${role}</h2>
      </div>

      ${desc ? `<div class="flow-desc">${desc}</div>` : ''}

      <div class="meta-group">
        ${
          deps.length > 0
            ? `<div class="meta-row">
                <span class="meta-label">Dependencies</span>
                ${deps.map((d) => `<span class="tag">${packageSvg} ${d}</span>`).join('')}
              </div>`
            : ''
        }

        ${
          ios.length > 0
            ? `<div class="meta-row">
                <span class="meta-label">Side Effects</span>
                ${ios.map((io) => `<span class="tag">${arrowSwapSvg} ${io}</span>`).join('')}
              </div>`
            : ''
        }

        ${
          mechanisms.length > 0
            ? `<div class="meta-row">
                <span class="meta-label">Algorithms</span>
                ${mechanisms.map((m) => `<span class="tag">${circuitSvg} ${m}</span>`).join('')}
              </div>`
            : ''
        }
      </div>
    </div>

    <div class="actions-bar">
      <button class="btn" onclick="sendMessage('refresh')">
        ${refreshSvg} Refresh Overview
      </button>
      <button class="btn" onclick="sendMessage('setApiKey')">
        ${keySvg} ${hasApiKey ? 'Change API Key' : 'Configure API Key'}
      </button>
      <button class="btn" onclick="sendMessage('openSettings')">
        Settings
      </button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function sendMessage(command) {
      vscode.postMessage({ command });
    }
  </script>
</body>
</html>`;
  }

  private _formatHumanError(rawError: string): { title: string; message: string; tip?: string } {
    try {
      let parsed: any = null;
      if (rawError.includes('{') && rawError.includes('}')) {
        const start = rawError.indexOf('{');
        const end = rawError.lastIndexOf('}') + 1;
        parsed = JSON.parse(rawError.slice(start, end));
      }

      const errObj = parsed?.error || parsed;
      const code = errObj?.code || errObj?.status;
      const msg: string = errObj?.message || rawError;

      if (code === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource_exhausted')) {
        const retryMatch = /retry in ([\d.]+s?)/i.exec(msg);
        const retryText = retryMatch ? ` (retry in ${retryMatch[1]})` : '';
        return {
          title: '⚠️ Gemini Rate Limit Exceeded (429)',
          message: `Google Gemini Free Tier allows 5 requests per minute${retryText}. Opening multiple files quickly exhausts this quota.`,
          tip: '💡 Tip: To avoid rate limits, click "Switch / Update Key" and use an OpenRouter or Groq key (free 30 req/min)!',
        };
      }

      if (code === 404 || msg.toLowerCase().includes('not found')) {
        return {
          title: '⚠️ Model Not Available',
          message: msg.slice(0, 160),
          tip: 'Check your model configuration in Settings or leave it empty for auto-defaults.',
        };
      }

      if (code === 401 || code === 403 || msg.toLowerCase().includes('api_key_invalid')) {
        return {
          title: '⚠️ Invalid API Key',
          message: 'The API key provided was not accepted by the provider.',
          tip: 'Click "Switch / Update Key" to enter a valid API key.',
        };
      }

      return {
        title: '⚠️ AI Connection Issue',
        message: msg.length > 200 ? msg.slice(0, 200) + '...' : msg,
        tip: 'Displaying local structural extraction instead.',
      };
    } catch {
      return {
        title: '⚠️ AI Connection Issue',
        message: rawError.length > 200 ? rawError.slice(0, 200) + '...' : rawError,
        tip: 'Displaying local structural extraction instead.',
      };
    }
  }
}

