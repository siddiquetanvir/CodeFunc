import * as vscode from 'vscode';
import { SecretManager } from './secret-manager';
import { WorkspaceStateCache } from './vs-cache';
import { CodeFuncLensProvider } from './codelens-provider';
import { FileSummary } from '@codefunc/core';

export async function activate(context: vscode.ExtensionContext) {

  const secretManager = new SecretManager(context);
  const cache = new WorkspaceStateCache(context.workspaceState);
  const provider = new CodeFuncLensProvider(secretManager, cache);

  // Supported languages for CodeLens
  const selector: vscode.DocumentSelector = [
    { scheme: 'file', language: 'python' },
    { scheme: 'file', language: 'javascript' },
    { scheme: 'file', language: 'typescript' },
    { scheme: 'file', language: 'javascriptreact' },
    { scheme: 'file', language: 'typescriptreact' },
    { scheme: 'file', language: 'go' },
    { scheme: 'file', language: 'rust' },
    { scheme: 'file', language: 'java' },
    { scheme: 'file', language: 'c' },
    { scheme: 'file', language: 'cpp' },
    { scheme: 'file', language: 'csharp' },
  ];

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(selector, provider)
  );

  // Register Hover Provider on line 1 for immediate deep overview
  const hoverProvider = new (require('./hover-provider').CodeFuncHoverProvider)(
    (uri: vscode.Uri) => {
      const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());
      return doc ? provider.getSummary(doc) : undefined;
    }
  );
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(selector, hoverProvider)
  );

  // Command: Set API Key
  context.subscriptions.push(
    vscode.commands.registerCommand('codefunc.setApiKey', async () => {
      const key = await secretManager.promptForApiKey();
      if (key) {
        provider.refresh();
      }
    })
  );

  // Command: Clear API Key
  context.subscriptions.push(
    vscode.commands.registerCommand('codefunc.clearApiKey', async () => {
      await secretManager.clearApiKey();
      provider.refresh();
    })
  );

  // Command: Refresh Summary
  context.subscriptions.push(
    vscode.commands.registerCommand('codefunc.refreshSummary', () => {
      provider.refresh();
      vscode.window.showInformationMessage('CodeFunc: File summaries refreshed.');
    })
  );

  // Command: Clear Cache
  context.subscriptions.push(
    vscode.commands.registerCommand('codefunc.clearCache', async () => {
      await cache.clear();
      provider.refresh();
      vscode.window.showInformationMessage('CodeFunc: Summary cache cleared.');
    })
  );

  // Command: Open Deep Overview (opens side-by-side Markdown overview)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codefunc.openDetailedOverview',
      async (targetUri?: vscode.Uri, targetSummary?: FileSummary) => {
        const activeEditor = vscode.window.activeTextEditor;
        const uri = targetUri || activeEditor?.document.uri;
        if (!uri) return;

        const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString()) || activeEditor?.document;
        const summary = targetSummary || (doc ? provider.getSummary(doc) : undefined);
        const fileName = vscode.workspace.asRelativePath(uri);

        const mdContent = `# ⚡ CodeFunc Architectural Overview: \`${fileName}\`

## 🎯 Primary Purpose
> **${summary?.coreRole || 'Analyzing file state...'}**

${summary?.detailedSummary ? `## 📖 Detailed System Flow\n${summary.detailedSummary}\n` : ''}

${summary?.keyMechanisms && summary.keyMechanisms.length > 0 ? `## ⚙️ Key Mechanisms & Algorithmic Patterns\n${summary.keyMechanisms.map(m => `- \`${m}\``).join('\n')}\n` : ''}

## 📦 Frameworks & Dependencies
${summary && summary.dependencies.length > 0 && summary.dependencies[0] !== 'None detected' ? summary.dependencies.map(d => `- \`${d}\``).join('\n') : '_No external dependencies detected._'}

## ⇄ I/O & System Side Effects
${summary && summary.sideEffects.length > 0 && summary.sideEffects[0] !== 'None detected' ? summary.sideEffects.map(s => `- ${s}`).join('\n') : '_No external file, DB, or network side effects detected._'}

---
*Tip: Configure a Gemini API Key via \`CodeFunc: Set Gemini API Key\` for full automated deep-dive analysis.*
`;

        const overviewDoc = await vscode.workspace.openTextDocument({
          content: mdContent,
          language: 'markdown',
        });
        await vscode.window.showTextDocument(overviewDoc, {
          viewColumn: vscode.ViewColumn.Beside,
          preview: true,
        });
      }
    )
  );

  // Command: Show File Details (when clicking the CodeLens)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codefunc.showDetails',
      async (uri: vscode.Uri, summary: FileSummary | null) => {
        if (!summary) {
          const hasKey = await secretManager.getApiKey();
          if (!hasKey) {
            const pick = await vscode.window.showInformationMessage(
              'CodeFunc: No AI API key configured. Provide an API key for deep AI summaries, or use built-in local inspection.',
              'Set AI API Key',
              'Dismiss'
            );
            if (pick === 'Set AI API Key') {
              vscode.commands.executeCommand('codefunc.setApiKey');
            }
          } else {
            vscode.window.showInformationMessage('CodeFunc: Analyzing file...');
          }
          return;
        }

        const items: vscode.QuickPickItem[] = [
          {
            label: `$(book) Open Deep Architectural Overview`,
            description: 'Open full side-by-side breakdown document',
          },
          {
            label: `$(sparkle) Role`,
            description: summary.coreRole,
          },
          {
            label: `$(package) Dependencies`,
            description: summary.dependencies.join(', ') || 'None detected',
          },
          {
            label: `$(arrow-swap) I/O & Side Effects`,
            description: summary.sideEffects.join('; ') || 'None detected',
          },
          {
            label: `$(refresh) Refresh File Summary`,
            detail: 'Re-analyze current file state and update overview',
          },
          {
            label: `$(key) Configure AI API Key`,
            detail: 'Update or replace stored API key (Anthropic, OpenRouter, Groq, Gemini)',
          },
        ];

        const selection = await vscode.window.showQuickPick(items, {
          title: `CodeFunc: ${vscode.workspace.asRelativePath(uri)}`,
          placeHolder: 'File Overview & Actions',
        });

        if (selection) {
          if (selection.label.includes('Open Deep')) {
            vscode.commands.executeCommand('codefunc.openDetailedOverview', uri, summary);
          } else if (selection.label.includes('Refresh')) {
            vscode.commands.executeCommand('codefunc.refreshSummary');
          } else if (selection.label.includes('Configure')) {
            vscode.commands.executeCommand('codefunc.setApiKey');
          }
        }
      }
    )
  );

  // Check on activation if API key is present; if not, prompt gently
  secretManager.getApiKey().then((key) => {
    if (!key) {
      const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        90
      );
      statusBarItem.text = '$(key) CodeFunc: Set AI API Key';
      statusBarItem.tooltip = 'Click to configure your AI API Key (Claude, OpenRouter, Groq, Gemini) for CodeFunc file summaries';
      statusBarItem.command = 'codefunc.setApiKey';
      statusBarItem.show();
      context.subscriptions.push(statusBarItem);
    }
  });
}

export function deactivate() {}
