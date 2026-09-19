// CodeFunc Content Script for GitHub

const BANNER_ID = 'codefunc-github-banner';

function getFileLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    py: 'python',
    js: 'javascript',
    jsx: 'javascriptreact',
    ts: 'typescript',
    tsx: 'typescriptreact',
    go: 'go',
    rs: 'rust',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    java: 'java',
    cs: 'csharp',
  };
  return map[ext] || 'plaintext';
}

function isBlobView(): boolean {
  return window.location.pathname.includes('/blob/');
}

function getFilePathFromUrl(): string {
  const parts = window.location.pathname.split('/blob/');
  if (parts.length > 1) {
    const afterBlob = parts[1].split('/');
    afterBlob.shift(); // remove branch/commit
    return afterBlob.join('/');
  }
  return window.location.pathname.split('/').pop() || '';
}

function extractCodeContent(): string | null {
  // Method 1: Modern React code view
  const reactLines = document.querySelectorAll('.react-code-text, [data-selector="code-blob-lines"]');
  if (reactLines.length > 0) {
    return Array.from(reactLines)
      .map((el) => el.textContent || '')
      .join('\n');
  }

  // Method 2: Classic table view
  const tableLines = document.querySelectorAll('table.highlight td.blob-code-inner');
  if (tableLines.length > 0) {
    return Array.from(tableLines)
      .map((el) => el.textContent || '')
      .join('\n');
  }

  // Method 3: Textarea
  const textarea = document.getElementById('read-only-cursor-text-area') as HTMLTextAreaElement;
  if (textarea && textarea.value) {
    return textarea.value;
  }

  return null;
}

function findInsertionTarget(): HTMLElement | null {
  // Modern GitHub Blob container
  const modernBlob = document.querySelector('[data-selector="repos-split-pane-content"] #blob-view') as HTMLElement;
  if (modernBlob) return modernBlob;

  // React blob container wrapper
  const reactContainer = document.querySelector('[data-testid="blob-content-holder"]') as HTMLElement;
  if (reactContainer) return reactContainer;

  // Classic file box
  const box = document.querySelector('.Box .Box-header') as HTMLElement;
  if (box && box.parentElement) return box.parentElement;

  return null;
}

async function runCodeFunc() {
  if (!isBlobView()) return;

  const existing = document.getElementById(BANNER_ID);
  if (existing) {
    existing.remove();
  }

  const code = extractCodeContent();
  if (!code || !code.trim()) return;

  const target = findInsertionTarget();
  if (!target) return;

  const filePath = getFilePathFromUrl();
  const languageId = getFileLanguage(filePath);

  // Render loading state
  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.className = 'codefunc-banner codefunc-loading';
  banner.innerHTML = `
    <div class="codefunc-row">
      <span class="codefunc-badge">⚡ CodeFunc</span>
      <span class="codefunc-text">Analyzing file architecture...</span>
    </div>
  `;
  target.prepend(banner);

  try {
    const response: any = await chrome.runtime.sendMessage({
      type: 'SUMMARIZE_FILE',
      payload: { code, filePath, languageId },
    });

    if (response && response.success && response.summary) {
      const s = response.summary;
      const deps = s.dependencies && s.dependencies.length > 0 && s.dependencies[0] !== 'None detected'
        ? s.dependencies.slice(0, 4).join(', ')
        : '';
      const io = s.sideEffects && s.sideEffects.length > 0 && s.sideEffects[0] !== 'None detected'
        ? s.sideEffects.slice(0, 2).join('; ')
        : '';

      banner.className = 'codefunc-banner';
      banner.innerHTML = `
        <div class="codefunc-header">
          <div class="codefunc-title">
            <span class="codefunc-icon">⚡</span>
            <strong>${escapeHtml(s.coreRole)}</strong>
          </div>
          ${s.detailedSummary ? `<div class="codefunc-desc">${escapeHtml(s.detailedSummary)}</div>` : ''}
          <div class="codefunc-meta">
            ${deps ? `<span class="codefunc-tag">📦 ${escapeHtml(deps)}</span>` : ''}
            ${io ? `<span class="codefunc-tag">⇄ ${escapeHtml(io)}</span>` : ''}
            ${s.keyMechanisms && s.keyMechanisms.length > 0 ? `<span class="codefunc-tag">⚙️ ${escapeHtml(s.keyMechanisms.slice(0, 2).join(', '))}</span>` : ''}
          </div>
        </div>
      `;
    } else {
      banner.remove();
    }
  } catch (err) {
    banner.remove();
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Observe GitHub's SPA (Turbo/PJAX) navigations
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    setTimeout(runCodeFunc, 500);
  }
});
observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('turbo:render', () => setTimeout(runCodeFunc, 400));
window.addEventListener('load', () => setTimeout(runCodeFunc, 500));
setTimeout(runCodeFunc, 800);
