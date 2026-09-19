const fs = require('fs');

let css = fs.readFileSync('packages/vscode-extension/src/overview-panel.ts', 'utf8');

// flow-desc color
css = css.replace(/color:\s*#c9d1d9;/g, 'color: var(--text-main);');

// meta-group border
css = css.replace(/border-top:\s*1px solid rgba\(48, 54, 61, 0\.6\);/g, 'border-top: 1px solid var(--border-card);');

// btn-primary colors
css = css.replace(/button\.btn-primary\s*\{\s*background:\s*var\(--btn-primary-bg\);\s*border-color:\s*rgba\(240, 246, 252, 0\.1\);\s*color:\s*var\(--text-main\);\s*\}/, `button.btn-primary {
      background: var(--btn-primary-bg);
      border-color: var(--border-card);
      color: var(--btn-primary-fg);
    }`);

// Also fix the banner-api inline styles in the HTML which might have hardcoded colors
css = css.replace(/style="color:\s*#f87171;"/g, 'style="color: var(--vscode-errorForeground, #f87171);"');
css = css.replace(/style="color:\s*#e6edf3;"/g, 'style="color: var(--text-main);"');
css = css.replace(/style="color:\s*#fbbf24;"/g, 'style="color: var(--vscode-editorWarning-foreground, #fbbf24);"');
css = css.replace(/style="color:\s*#c9d1d9;"/g, 'style="color: var(--text-main);"');
css = css.replace(/background:\s*rgba\(239, 68, 68, 0\.08\)/g, 'background: var(--vscode-inputValidation-errorBackground, rgba(239, 68, 68, 0.08))');
css = css.replace(/border:\s*1px solid rgba\(239, 68, 68, 0\.35\)/g, 'border: 1px solid var(--vscode-inputValidation-errorBorder, rgba(239, 68, 68, 0.35))');
css = css.replace(/background:\s*rgba\(245, 158, 11, 0\.08\)/g, 'background: var(--vscode-inputValidation-warningBackground, rgba(245, 158, 11, 0.08))');
css = css.replace(/border:\s*1px solid rgba\(245, 158, 11, 0\.3\)/g, 'border: 1px solid var(--vscode-inputValidation-warningBorder, rgba(245, 158, 11, 0.3))');


fs.writeFileSync('packages/vscode-extension/src/overview-panel.ts', css);
