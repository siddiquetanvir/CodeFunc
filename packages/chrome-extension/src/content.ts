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
    afterBlob.shift(); // remove branch/commit name
    return afterBlob.join('/');
  }
  return window.location.pathname.split('/').pop() || '';
}

async function fetchRawCode(): Promise<string | null> {
  try {
    const rawUrl = window.location.href.replace('/blob/', '/raw/');
    const res = await fetch(rawUrl);
    if (res.ok) {
      return await res.text();
    }
  } catch (e) {
    // Fallback to DOM extraction
  }
  return null;
}

function extractCodeFromDOM(): string | null {
  // Method 1: React code lines
  const reactLines = document.querySelectorAll('.react-code-text, [data-selector="code-blob-lines"]');
  if (reactLines.length > 0) {
    return Array.from(reactLines).map(el => el.textContent || '').join('\n');
  }

  // Method 2: Classic table view
  const tableLines = document.querySelectorAll('table.highlight td.blob-code-inner');
  if (tableLines.length > 0) {
    return Array.from(tableLines).map(el => el.textContent || '').join('\n');
  }

  // Method 3: Textarea
  const textarea = document.getElementById('read-only-cursor-text-area') as HTMLTextAreaElement;
  if (textarea && textarea.value) {
    return textarea.value;
  }

  return null;
}

function findInsertionTarget(): HTMLElement | null {
  // Candidate 1: The container right above the code lines in GitHub's new React view
  const fileContent = document.querySelector('[data-testid="blob-content-holder"], .Box-body, #blob-view, [data-selector="repos-split-pane-content"]');
  if (fileContent && fileContent instanceof HTMLElement) {
    return fileContent;
  }

  // Candidate 2: The classic Box element
  const box = document.querySelector('.Box');
  if (box && box instanceof HTMLElement) {
    return box;
  }

  // Candidate 3: Above the raw table or code area
  const codeArea = document.querySelector('table.highlight, .react-code-view, #read-only-cursor-text-area');
  if (codeArea && codeArea.parentElement) {
    return codeArea.parentElement;
  }

  return null;
}

async function runCodeFunc() {
  if (!isBlobView()) return;

  if (document.getElementById(BANNER_ID)) {
    return; // Already injected
  }

  const target = findInsertionTarget();
  if (!target) {
    return;
  }

  const filePath = getFilePathFromUrl();
  const languageId = getFileLanguage(filePath);

  // Render loading state immediately
  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.className = 'codefunc-banner codefunc-loading';
  banner.innerHTML = `
    <div class="codefunc-header">
      <div class="codefunc-title">
        <span class="codefunc-icon">⚡</span>
        <strong>CodeFunc</strong>
        <span class="codefunc-sub">Analyzing file architecture...</span>
      </div>
    </div>
  `;
  target.insertBefore(banner, target.firstChild);

  // Get code content (fetch raw file for 100% fidelity, fallback to DOM)
  let code = await fetchRawCode();
  if (!code) {
    code = extractCodeFromDOM();
  }

  if (!code || !code.trim()) {
    banner.remove();
    return;
  }

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

// Watch for Turbo & dynamic GitHub URL transitions
let lastPath = window.location.pathname;
setInterval(() => {
  if (window.location.pathname !== lastPath) {
    lastPath = window.location.pathname;
    const old = document.getElementById(BANNER_ID);
    if (old) old.remove();
    setTimeout(runCodeFunc, 300);
  } else if (isBlobView() && !document.getElementById(BANNER_ID)) {
    runCodeFunc();
  }
}, 800);

document.addEventListener('turbo:render', () => setTimeout(runCodeFunc, 200));
document.addEventListener('DOMContentLoaded', () => setTimeout(runCodeFunc, 300));
runCodeFunc();
