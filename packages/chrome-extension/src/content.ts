// CodeFunc Content Script for GitHub

const BANNER_ID = 'codefunc-github-banner';

// Clean, modern SVG Octicon & Lucide-style vector icons
const ICONS = {
  sparkle: `<svg class="codefunc-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M7.53 1.282a.5.5 0 0 1 .94 0l.966 2.766a4.5 4.5 0 0 0 2.746 2.746l2.766.966a.5.5 0 0 1 0 .94l-2.766.966a4.5 4.5 0 0 0-2.746 2.746l-.966 2.766a.5.5 0 0 1-.94 0l-.966-2.766a4.5 4.5 0 0 0-2.746-2.746l-2.766-.966a.5.5 0 0 1 0-.94l2.766-.966a4.5 4.5 0 0 0 2.746-2.746l.966-2.766Z"/></svg>`,
  package: `<svg class="codefunc-tag-icon" viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="m8.878.392 5.25 3.045c.54.314.872.89.872 1.514v6.098a1.75 1.75 0 0 1-.872 1.514l-5.25 3.045a1.75 1.75 0 0 1-1.756 0l-5.25-3.045A1.75 1.75 0 0 1 1 11.049V4.951c0-.624.332-1.201.872-1.514L7.122.392a1.75 1.75 0 0 1 1.756 0ZM7.875 1.69l-4.63 2.685L8 7.133l4.755-2.758-4.63-2.685a.248.248 0 0 0-.25 0ZM2.5 5.677v5.372c0 .09.047.171.125.216l4.625 2.683V8.432Zm11 5.372V5.677L8.75 8.432v5.516l4.625-2.683a.25.25 0 0 0 .125-.216Z"/></svg>`,
  arrowSwap: `<svg class="codefunc-tag-icon" viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M5.22 1.47a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.749.749 0 0 1-1.275-.53V4.75H1.75a.75.75 0 0 1 0-1.5h3.47V1.75a.75.75 0 0 1 0-1.06Zm5.56 8.28a.749.749 0 0 1 1.275.53v1.75h3.47a.75.75 0 0 1 0 1.5h-3.47v1.75a.75.75 0 0 1-1.06.53l-2.25-2.25a.75.75 0 0 1 0-1.06l2.035-2.035Z"/></svg>`,
  cpu: `<svg class="codefunc-tag-icon" viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M6 2.75a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75h-1.5v1.5a.75.75 0 0 1-.75.75h-1.5v1.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1-.75-.75v-1.5h-1.5a.75.75 0 0 1-.75-.75v-1.5h-1.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 1 .75-.75h1.5v-1.5a.75.75 0 0 1 .75-.75h1.5V2.75Zm.75.75v1.5a.75.75 0 0 1-.75.75h-1.5v2.5h1.5a.75.75 0 0 1 .75.75v1.5h2.5v-1.5a.75.75 0 0 1 .75-.75h1.5v-2.5h-1.5a.75.75 0 0 1-.75-.75v-1.5h-2.5Z"/></svg>`,
  copy: `<svg class="codefunc-copy-icon" viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>`,
};

function getFileLanguage(filePath: string): string {
  const baseName = filePath.split('/').pop()?.toLowerCase() || '';
  if (baseName === 'dockerfile' || baseName.startsWith('dockerfile.') || baseName.endsWith('.dockerfile')) {
    return 'dockerfile';
  }
  if (baseName.includes('docker-compose') || baseName.includes('compose.yaml') || baseName.includes('compose.yml')) {
    return 'yaml';
  }
  if (baseName === 'makefile' || baseName.endsWith('.mk')) {
    return 'makefile';
  }
  if (baseName.startsWith('.env') || baseName === 'env') {
    return 'env';
  }
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
    dockerfile: 'dockerfile',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shellscript',
    bash: 'shellscript',
    zsh: 'shellscript',
    json: 'json',
    jsonc: 'jsonc',
    toml: 'toml',
    sql: 'sql',
    md: 'markdown',
    markdown: 'markdown',
    mdx: 'markdown',
    env: 'env',
    makefile: 'makefile',
    mk: 'makefile',
    graphql: 'graphql',
    gql: 'graphql',
    prisma: 'prisma',
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
  const reactLines = document.querySelectorAll('.react-code-text, [data-selector="code-blob-lines"]');
  if (reactLines.length > 0) {
    return Array.from(reactLines).map(el => el.textContent || '').join('\n');
  }

  const tableLines = document.querySelectorAll('table.highlight td.blob-code-inner');
  if (tableLines.length > 0) {
    return Array.from(tableLines).map(el => el.textContent || '').join('\n');
  }

  const textarea = document.getElementById('read-only-cursor-text-area') as HTMLTextAreaElement;
  if (textarea && textarea.value) {
    return textarea.value;
  }

  return null;
}

function findInsertionTarget(): HTMLElement | null {
  const fileContent = document.querySelector('[data-testid="blob-content-holder"], .Box-body, #blob-view, [data-selector="repos-split-pane-content"]');
  if (fileContent && fileContent instanceof HTMLElement) {
    return fileContent;
  }

  const box = document.querySelector('.Box');
  if (box && box instanceof HTMLElement) {
    return box;
  }

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

  // Render modern loading state
  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.className = 'codefunc-banner codefunc-loading';
  banner.innerHTML = `
    <div class="codefunc-header">
      <div class="codefunc-title">
        <span class="codefunc-pulse-dot"></span>
        <span class="codefunc-brand">CodeFunc</span>
        <span class="codefunc-sub">Analyzing file architecture...</span>
      </div>
    </div>
  `;
  target.insertBefore(banner, target.firstChild);

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
          <div class="codefunc-top-row">
            <div class="codefunc-title">
              ${ICONS.sparkle}
              <span class="codefunc-role-text">${escapeHtml(s.coreRole)}</span>
            </div>
            <button class="codefunc-copy-btn" id="codefunc-copy-btn" title="Copy architectural summary as Markdown">
              ${ICONS.copy}
              <span id="codefunc-copy-label">Copy</span>
            </button>
          </div>
          ${s.detailedSummary ? `<div class="codefunc-desc">${escapeHtml(s.detailedSummary)}</div>` : ''}
          <div class="codefunc-meta">
            ${deps ? `<span class="codefunc-tag">${ICONS.package}<span>${escapeHtml(deps)}</span></span>` : ''}
            ${io ? `<span class="codefunc-tag">${ICONS.arrowSwap}<span>${escapeHtml(io)}</span></span>` : ''}
            ${s.keyMechanisms && s.keyMechanisms.length > 0 ? `<span class="codefunc-tag">${ICONS.cpu}<span>${escapeHtml(s.keyMechanisms.slice(0, 2).join(', '))}</span></span>` : ''}
          </div>
        </div>
      `;

      // Copy summary listener
      const copyBtn = banner.querySelector('#codefunc-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          const mdText = [
            `### ⚡ ${filePath}`,
            `**Role**: ${s.coreRole}`,
            s.detailedSummary ? `**Summary**: ${s.detailedSummary}` : '',
            deps ? `**Dependencies**: ${deps}` : '',
            io ? `**Side Effects**: ${io}` : '',
            s.keyMechanisms && s.keyMechanisms.length > 0 ? `**Key Mechanisms**: ${s.keyMechanisms.slice(0, 2).join(', ')}` : '',
          ].filter(Boolean).join('\n\n');

          try {
            await navigator.clipboard.writeText(mdText);
            const label = banner.querySelector('#codefunc-copy-label');
            if (label) {
              label.textContent = 'Copied!';
              setTimeout(() => { label.textContent = 'Copy'; }, 2000);
            }
          } catch (e) {
            // Fallback if clipboard API blocked
          }
        });
      }
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
