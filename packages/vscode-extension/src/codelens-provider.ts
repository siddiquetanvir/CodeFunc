import * as vscode from 'vscode';
import { summarizeFile, FileSummary, computeContentHash } from '@codefunc/core';
import { SecretManager } from './secret-manager';
import { WorkspaceStateCache } from './vs-cache';

export class CodeFuncLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  private inFlightRequests = new Set<string>();
  private activeSummaries = new Map<string, FileSummary>();

  constructor(
    private secretManager: SecretManager,
    private cache: WorkspaceStateCache
  ) {}

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  public getSummary(document: vscode.TextDocument): FileSummary | undefined {
    const text = document.getText();
    const config = vscode.workspace.getConfiguration('codefunc');
    const persona = config.get<string>('persona', 'General Developer');
    const hash = computeContentHash(text, document.languageId) + (persona ? `:${persona}` : '');
    return this.activeSummaries.get(hash) || this.cache.get<FileSummary>(hash);
  }

  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const config = vscode.workspace.getConfiguration('codefunc');
    if (!config.get<boolean>('enabled', true)) {
      return [];
    }

    // Ignore unsupported or empty files
    if (document.lineCount === 0 || document.uri.scheme !== 'file') {
      return [];
    }

    const normalizedPath = document.uri.fsPath.replace(/\\/g, '/').toLowerCase();

    // Smart Ignore: check minified / generated / binary / oversized files
    const ignoreMinified = config.get<boolean>('ignoreMinified', true);
    if (ignoreMinified) {
      if (
        normalizedPath.endsWith('.min.js') ||
        normalizedPath.endsWith('.min.css') ||
        normalizedPath.endsWith('.map') ||
        normalizedPath.endsWith('package-lock.json') ||
        normalizedPath.endsWith('yarn.lock') ||
        normalizedPath.endsWith('pnpm-lock.yaml') ||
        normalizedPath.endsWith('.png') ||
        normalizedPath.endsWith('.jpg') ||
        normalizedPath.endsWith('.jpeg') ||
        normalizedPath.endsWith('.gif') ||
        normalizedPath.endsWith('.ico') ||
        normalizedPath.endsWith('.svg') ||
        normalizedPath.endsWith('.webp') ||
        normalizedPath.endsWith('.wasm') ||
        normalizedPath.endsWith('.pyc') ||
        normalizedPath.endsWith('.zip') ||
        normalizedPath.endsWith('.tar') ||
        normalizedPath.endsWith('.gz') ||
        normalizedPath.endsWith('.pdf') ||
        normalizedPath.endsWith('.woff') ||
        normalizedPath.endsWith('.woff2') ||
        normalizedPath.endsWith('.ttf') ||
        normalizedPath.endsWith('.eot') ||
        normalizedPath.includes('/.git/') ||
        normalizedPath.includes('/node_modules/')
      ) {
        return [];
      }
    }

    const maxFileLines = config.get<number>('maxFileLines', 8000);
    if (maxFileLines > 0 && document.lineCount > maxFileLines) {
      return [];
    }

    const text = document.getText();
    if (!text.trim()) {
      return [];
    }

    const persona = config.get<string>('persona', 'General Developer');
    const hash = computeContentHash(text, document.languageId) + (persona ? `:${persona}` : '');
    let summary = this.activeSummaries.get(hash) || this.cache.get<FileSummary>(hash);

    const topOfFileRange = new vscode.Range(0, 0, 0, 0);

    if (!summary) {
      // Trigger background summarization if not already running
      if (!this.inFlightRequests.has(hash)) {
        this.inFlightRequests.add(hash);
        this.fetchSummaryAsync(document, text, hash);
      }

      // Render a subtle loading placeholder
      const loadingLens = new vscode.CodeLens(topOfFileRange, {
        title: '$(loading~spin) CodeFunc: Analyzing file...',
        command: 'codefunc.showDetails',
        arguments: [document.uri, null],
      });
      return [loadingLens];
    }

    // Format the header badge(s) with modern VS Code Codicons
    // Split long text into stacked CodeLens lines so it never exceeds screen width
    const maxLineLen = config.get<number>('maxCodeLensLength', 70);
    const showSideEffects = config.get<boolean>('showSideEffects', true);
    const depsText = summary.dependencies.length > 0 && summary.dependencies[0] !== 'None detected'
      ? summary.dependencies.slice(0, 4).join(', ')
      : '';
    const ioText = summary.sideEffects.length > 0 && summary.sideEffects[0] !== 'None detected'
      ? summary.sideEffects.slice(0, 2).join('; ')
      : '';

    const lenses: vscode.CodeLens[] = [];

    // Helper: Wrap string into chunks of maxLen characters at word boundaries
    const wrapIntoLines = (prefixIcon: string, text: string, maxLen: number): string[] => {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let currentLine = prefixIcon ? `${prefixIcon} ` : '';

      for (const word of words) {
        if (!word) continue;
        if ((currentLine + (currentLine.length > 0 && !currentLine.endsWith(' ') ? ' ' : '') + word).length > maxLen) {
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentLine = '   ' + word; // Indent continuation lines slightly
        } else {
          currentLine += (currentLine.length > 0 && !currentLine.endsWith(' ') ? ' ' : '') + word;
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      return lines;
    };

    // 1. Role lines (split if too wide)
    const roleLines = wrapIntoLines('$(sparkle)', summary.coreRole, maxLineLen);
    for (let i = 0; i < roleLines.length; i++) {
      lenses.push(
        new vscode.CodeLens(topOfFileRange, {
          title: roleLines[i],
          command: 'codefunc.openDetailedOverview',
          tooltip: 'CodeFunc File Overview - Click to open full architectural panel',
          arguments: [document.uri, summary],
        })
      );
    }

    // 2. Dependencies line (if any)
    if (depsText) {
      const depLines = wrapIntoLines('$(package)', depsText, maxLineLen);
      for (const dLine of depLines) {
        lenses.push(
          new vscode.CodeLens(topOfFileRange, {
            title: dLine,
            command: 'codefunc.openDetailedOverview',
            tooltip: 'File dependencies - Click to open full architectural panel',
            arguments: [document.uri, summary],
          })
        );
      }
    }

    // 3. I/O & Side Effects line (if any)
    if (showSideEffects && ioText) {
      const ioLines = wrapIntoLines('$(arrow-swap)', ioText, maxLineLen);
      for (const iLine of ioLines) {
        lenses.push(
          new vscode.CodeLens(topOfFileRange, {
            title: iLine,
            command: 'codefunc.openDetailedOverview',
            tooltip: 'Detected file, console, and network I/O - Click to open full architectural panel',
            arguments: [document.uri, summary],
          })
        );
      }
    }

    // 4. Key Mechanisms / Algorithms line (if any)
    if (summary.keyMechanisms && summary.keyMechanisms.length > 0) {
      const mech = summary.keyMechanisms.slice(0, 2).join(', ');
      const mechLines = wrapIntoLines('$(circuit-board)', mech, maxLineLen);
      for (const mLine of mechLines) {
        lenses.push(
          new vscode.CodeLens(topOfFileRange, {
            title: mLine,
            command: 'codefunc.openDetailedOverview',
            tooltip: 'Algorithmic patterns & mechanisms - Click to open full architectural panel',
            arguments: [document.uri, summary],
          })
        );
      }
    }

    return lenses;
  }

  private async fetchSummaryAsync(
    document: vscode.TextDocument,
    code: string,
    hash: string
  ): Promise<void> {
    try {
      const apiKey = await this.secretManager.getApiKey();
      const config = vscode.workspace.getConfiguration('codefunc');
      const provider = config.get<string>('provider', 'auto');
      const model = config.get<string>('model', '');
      const persona = config.get<string>('persona', 'General Developer');

      const summary = await summarizeFile({
        code,
        languageId: document.languageId,
        filePath: vscode.workspace.asRelativePath(document.uri),
        provider: provider as any,
        apiKey: apiKey || '',
        model: model || undefined,
        cache: this.cache,
        persona,
      });

      this.activeSummaries.set(hash, summary);
      this._onDidChangeCodeLenses.fire();
    } catch (error) {
      console.error('CodeFunc summary failed:', error);
    } finally {
      this.inFlightRequests.delete(hash);
    }
  }
}

