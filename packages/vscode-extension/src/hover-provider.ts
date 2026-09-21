import * as vscode from "vscode"
import { FileSummary } from "@codefunc/core/src"

export class CodeFuncHoverProvider implements vscode.HoverProvider {
  constructor(
    private getSummary: (uri: vscode.Uri) => FileSummary | undefined,
  ) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    // Trigger hover at the top of file (lines 0 and 1)
    if (position.line > 1) {
      return null
    }

    const summary = this.getSummary(document.uri)
    if (!summary) {
      return null
    }

    const md = new vscode.MarkdownString()
    md.isTrusted = true
    md.supportThemeIcons = true

    // Header Role
    md.appendMarkdown(`### $(sparkle) **${summary.coreRole}**\n\n`)

    // Detailed Architecture Flow
    if (summary.detailedSummary) {
      md.appendMarkdown(`${summary.detailedSummary}\n\n`)
    }

    // Modern Pill-style Metadata Tags
    const tags: string[] = []

    const deps = summary.dependencies.filter((d) => d && d !== "None detected")
    if (deps.length > 0) {
      tags.push(`$(package) \`${deps.slice(0, 4).join(", ")}\``)
    }

    const ios = summary.sideEffects.filter((s) => s && s !== "None detected")
    if (ios.length > 0) {
      tags.push(`$(arrow-swap) \`${ios.slice(0, 2).join("; ")}\``)
    }

    if (summary.keyMechanisms && summary.keyMechanisms.length > 0) {
      tags.push(
        `$(circuit-board) \`${summary.keyMechanisms.slice(0, 2).join(", ")}\``,
      )
    }

    if (tags.length > 0) {
      md.appendMarkdown(`${tags.join(" &nbsp;•&nbsp; ")}\n\n`)
    }

    md.appendMarkdown(
      `---\n[$(book) Open Deep Overview](command:codefunc.openDetailedOverview) &nbsp;|&nbsp; [$(refresh) Refresh](command:codefunc.refreshSummary) &nbsp;|&nbsp; [$(key) Change Key](command:codefunc.setApiKey)`,
    )

    return new vscode.Hover(
      md,
      new vscode.Range(0, 0, 0, document.lineAt(0).text.length),
    )
  }
}
