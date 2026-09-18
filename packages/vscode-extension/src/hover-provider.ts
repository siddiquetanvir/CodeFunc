import * as vscode from 'vscode';
import { FileSummary } from '@codefunc/core';

export class CodeFuncHoverProvider implements vscode.HoverProvider {
  constructor(private getSummary: (uri: vscode.Uri) => FileSummary | undefined) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    // Trigger hover at the top of file (lines 0 and 1)
    if (position.line > 1) {
      return null;
    }

    const summary = this.getSummary(document.uri);
    if (!summary) {
      return null;
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;
    md.appendMarkdown(`### $(sparkle) **CodeFunc File Overview**\n\n`);
    md.appendMarkdown(`**Role**: ${summary.coreRole}\n\n`);

    if (summary.detailedSummary) {
      md.appendMarkdown(`**Overview**: ${summary.detailedSummary}\n\n`);
    }

    if (summary.keyMechanisms && summary.keyMechanisms.length > 0) {
      md.appendMarkdown(`**Mechanisms**: ${summary.keyMechanisms.map((m) => `\`${m}\``).join(', ')}\n\n`);
    }

    const deps = summary.dependencies.filter((d) => d !== 'None detected');
    if (deps.length > 0) {
      md.appendMarkdown(`**Dependencies**: ${deps.map((d) => `\`${d}\``).join(', ')}\n\n`);
    }

    const ios = summary.sideEffects.filter((s) => s !== 'None detected');
    if (ios.length > 0) {
      md.appendMarkdown(`**I/O & Side-effects**: ${ios.join('; ')}\n\n`);
    }

    md.appendMarkdown(`---\n[$(book) Open Deep Overview](command:codefunc.openDetailedOverview) • [$(refresh) Refresh](command:codefunc.refreshSummary)`);

    return new vscode.Hover(md, new vscode.Range(0, 0, 0, document.lineAt(0).text.length));
  }
}

