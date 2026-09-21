import * as vscode from 'vscode';
import { SecretManager } from './secret-manager';
import { WorkspaceStateCache } from './vs-cache';
import { CodeFuncLensProvider } from './codelens-provider';
import { CodeFuncOverviewPanel } from './overview-panel';
import { FileSummary } from '@codefunc/core';

export async function activate(context: vscode.ExtensionContext) {

  const secretManager = new SecretManager(context);
  const cache = new WorkspaceStateCache(context.workspaceState);
  const provider = new CodeFuncLensProvider(secretManager, cache);

  // Support all file types in workspace (Dockerfiles, YAML, Shell, JSON, TOML, Python, JS/TS, etc.)
  const selector: vscode.DocumentSelector = [{ scheme: 'file' }];

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

  // Status Bar Item: Persistent quick-access
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'codefunc.showQuickMenu';
  context.subscriptions.push(statusBarItem);

  const updateStatusBar = async () => {
    const key = await secretManager.getApiKey();
    statusBarItem.text = '$(sparkle) CodeFunc';
    statusBarItem.tooltip = key
      ? 'CodeFunc: Active (AI Enabled) — Click for menu'
      : 'CodeFunc: Active (Local Offline Mode) — Click for menu';
    statusBarItem.show();
  };
  await updateStatusBar();

  // Command: Set API Key
  context.subscriptions.push(
    vscode.commands.registerCommand('codefunc.setApiKey', async () => {
      const key = await secretManager.promptForApiKey();
      if (key) {
        await updateStatusBar();
        provider.refresh();
      }
    })
  );

  // Command: Clear API Key
  context.subscriptions.push(
    vscode.commands.registerCommand('codefunc.clearApiKey', async () => {
      await secretManager.clearApiKey();
      await updateStatusBar();
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

  // Command: Open Deep Overview (opens side-by-side Webview architectural card)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codefunc.openDetailedOverview',
      async (targetUri?: vscode.Uri, targetSummary?: FileSummary) => {
        const activeEditor = vscode.window.activeTextEditor;
        const uri = targetUri || activeEditor?.document.uri;
        if (!uri) return;

        const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString()) || activeEditor?.document;
        const summary = targetSummary || (doc ? provider.getSummary(doc) : undefined);
        const hasKey = Boolean(await secretManager.getApiKey());

        CodeFuncOverviewPanel.render(context.extensionUri, uri, summary, hasKey);
      }
    )
  );

  // Command: Copy Summary as Markdown
  context.subscriptions.push(
    vscode.commands.registerCommand('codefunc.copySummary', async (targetUri?: vscode.Uri, targetSummary?: FileSummary) => {
      const activeEditor = vscode.window.activeTextEditor;
      const uri = targetUri || activeEditor?.document.uri;
      if (!uri) {
        vscode.window.showWarningMessage('CodeFunc: No active file to copy summary for.');
        return;
      }
      const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString()) || activeEditor?.document;
      const summary = targetSummary || (doc ? provider.getSummary(doc) : undefined);
      if (!summary) {
        vscode.window.showInformationMessage('CodeFunc: Summary is still being generated or file is empty.');
        return;
      }

      const relPath = vscode.workspace.asRelativePath(uri);
      const deps = (summary.dependencies || []).filter((d) => d && d !== 'None detected');
      const ios = (summary.sideEffects || []).filter((s) => s && s !== 'None detected');
      const mechanisms = (summary.keyMechanisms || []).filter((m) => m);

      const mdLines = [
        `### ⚡ CodeFunc Architectural Overview: \`${relPath}\``,
        `**Primary Role**: ${summary.coreRole}`,
        summary.detailedSummary ? `**Summary**: ${summary.detailedSummary}` : '',
        deps.length > 0 ? `**Dependencies**: ${deps.join(', ')}` : '',
        ios.length > 0 ? `**Side Effects**: ${ios.join('; ')}` : '',
        mechanisms.length > 0 ? `**Key Mechanisms**: ${mechanisms.join(', ')}` : '',
      ].filter(Boolean);

      await vscode.env.clipboard.writeText(mdLines.join('\n\n'));
      vscode.window.showInformationMessage('CodeFunc: Architectural summary copied to clipboard!');
    })
  );

  // Command: Show Quick Action Menu
  context.subscriptions.push(
    vscode.commands.registerCommand('codefunc.showQuickMenu', async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const doc = activeEditor?.document;
      const summary = doc ? provider.getSummary(doc) : undefined;
      const hasKey = Boolean(await secretManager.getApiKey());
      const fileName = doc ? vscode.workspace.asRelativePath(doc.uri) : '';

      const items: vscode.QuickPickItem[] = [
        {
          label: '$(book) Open Deep Architectural Overview',
          description: fileName || undefined,
          detail: 'Open side-by-side architectural panel for active file',
        },
        {
          label: '$(copy) Copy Summary as Markdown',
          detail: 'Copy current file overview to clipboard',
        },
        {
          label: '$(refresh) Refresh File Summary',
          detail: 'Re-analyze current active file',
        },
        {
          label: '$(key) Configure AI API Key',
          detail: hasKey ? 'Update or replace stored API key' : 'Connect Groq, Gemini, OpenRouter, or Claude key',
        },
        {
          label: '$(trash) Clear Summary Cache',
          detail: 'Wipe all cached file summaries',
        },
        {
          label: '$(gear) Open CodeFunc Settings',
          detail: 'Configure persona, line limits, and display options',
        },
      ];

      const pick = await vscode.window.showQuickPick(items, {
        title: 'CodeFunc: Quick Action Menu',
        placeHolder: 'Select a CodeFunc action',
      });

      if (!pick) return;

      if (pick.label.includes('Open Deep')) {
        if (doc) {
          vscode.commands.executeCommand('codefunc.openDetailedOverview', doc.uri, summary);
        } else {
          vscode.window.showWarningMessage('CodeFunc: No active file to inspect.');
        }
      } else if (pick.label.includes('Copy Summary')) {
        vscode.commands.executeCommand('codefunc.copySummary');
      } else if (pick.label.includes('Refresh')) {
        vscode.commands.executeCommand('codefunc.refreshSummary');
      } else if (pick.label.includes('Configure')) {
        vscode.commands.executeCommand('codefunc.setApiKey');
      } else if (pick.label.includes('Clear')) {
        vscode.commands.executeCommand('codefunc.clearCache');
      } else if (pick.label.includes('Settings')) {
        vscode.commands.executeCommand('workbench.action.openSettings', 'codefunc');
      }
    })
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
            label: `$(copy) Copy Summary as Markdown`,
            description: 'Copy formatted architectural summary to clipboard',
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
          } else if (selection.label.includes('Copy Summary')) {
            vscode.commands.executeCommand('codefunc.copySummary', uri, summary);
          } else if (selection.label.includes('Refresh')) {
            vscode.commands.executeCommand('codefunc.refreshSummary');
          } else if (selection.label.includes('Configure')) {
            vscode.commands.executeCommand('codefunc.setApiKey');
          }
        }
      }
    )
  );
}

export function deactivate() {}
