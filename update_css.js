const fs = require('fs');

let css = fs.readFileSync('packages/vscode-extension/src/overview-panel.ts', 'utf8');

// Replace the :root block
css = css.replace(/:root\s*\{[^}]+\}/, `:root {
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
    }`);

// Change hardcoded tag colors
css = css.replace(/color:\s*#c9d1d9;/g, 'color: var(--text-main);');
css = css.replace(/color:\s*#ffffff;/g, 'color: var(--text-main);');
css = css.replace(/background:\s*#21262d;/g, 'background: var(--btn-bg);');
css = css.replace(/background:\s*#30363d;/g, 'background: var(--btn-hover);');
css = css.replace(/background:\s*#238636;/g, 'background: var(--btn-primary-bg);');
css = css.replace(/background:\s*#2ea043;/g, 'background: var(--btn-primary-hover);');

fs.writeFileSync('packages/vscode-extension/src/overview-panel.ts', css);
