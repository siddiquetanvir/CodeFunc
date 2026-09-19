import { ExtractedMetadata } from './types';

/**
 * Extracts external dependencies, file I/O operations, network side-effects,
 * and top-level signatures without calling any external services.
 */
export function extractMetadata(code: string, languageId?: string): ExtractedMetadata {
  const lang = (languageId || '').toLowerCase();
  let result: ExtractedMetadata;

  switch (lang) {
    case 'python':
    case 'py':
      result = parsePython(code);
      break;
    case 'javascript':
    case 'typescript':
    case 'javascriptreact':
    case 'typescriptreact':
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
      result = parseJavaScript(code);
      break;
    case 'dockerfile':
    case 'docker':
      result = parseDocker(code);
      break;
    case 'yaml':
    case 'yml':
      result = parseYaml(code);
      break;
    case 'shellscript':
    case 'bash':
    case 'sh':
    case 'zsh':
      result = parseShell(code);
      break;
    case 'json':
    case 'jsonc':
      result = parseJson(code);
      break;
    case 'toml':
      result = parseToml(code);
      break;
    case 'sql':
      result = parseSql(code);
      break;
    case 'go':
      result = parseGo(code);
      break;
    case 'rust':
    case 'rs':
      result = parseRust(code);
      break;
    case 'java':
    case 'c':
    case 'cpp':
    case 'csharp':
    case 'cs':
      result = parseCStyle(code);
      break;
    default:
      // Auto-detect based on content
      if (/^\s*FROM\s+[^\s]+/im.test(code)) {
        result = parseDocker(code);
      } else if (/^\s*#!\/(?:usr\/)?bin\/(?:env\s+)?(?:bash|sh|zsh)/m.test(code)) {
        result = parseShell(code);
      } else {
        result = parseGeneric(code);
      }
      break;
  }

  result.leadComment = extractLeadComment(code);
  result.patterns = detectPatterns(code);
  return result;
}

function detectPatterns(code: string): string[] {
  const patterns: string[] = [];
  // 2D grid or matrix
  if (/\b\w+\[[^\]]+\]\[[^\]]+\]/.test(code) && /for\s*\(.*for\s*\(/.test(code.replace(/\s+/g, ' '))) {
    patterns.push('2D matrix/grid traversal');
  }
  // Manhattan distance
  if (/abs\s*\([^)]+\)\s*\+\s*abs\s*\([^)]+\)/.test(code)) {
    patterns.push('Manhattan distance calculation');
  }
  // Sorting
  if (/(?:std::sort|sort\s*\(|qsort)/.test(code)) {
    patterns.push('Sorting');
  }
  // Binary search
  if (/(?:binary_search|lower_bound|upper_bound)/.test(code)) {
    patterns.push('Binary search');
  }
  // Dynamic programming
  if (/\b(?:dp|memo)\[/.test(code)) {
    patterns.push('Dynamic programming table');
  }
  // Graph / BFS / DFS
  if (/(?:vector<int>\s*adj|queue<int>|visited\[|dfs\(|bfs\()/.test(code)) {
    patterns.push('Graph traversal (BFS/DFS)');
  }
  // Web Service / HTTP Server
  if (/(?:express\(\)|app\.listen|createServer)/.test(code)) {
    patterns.push('HTTP Web Service');
  }
  // Frameworks & Domain Patterns
  if (/\b(?:import\s+streamlit|from\s+streamlit)\b/.test(code)) {
    patterns.push('Streamlit Dashboard');
  }
  if (/\b(?:import\s+pandas|from\s+pandas)\b/.test(code) && /\b(?:import\s+matplotlib|import\s+plotly|import\s+seaborn|from\s+plotly|from\s+matplotlib)\b/.test(code)) {
    patterns.push('Data Analytics & Visualization Pipeline');
  }
  if (/\b(?:FastAPI|from\s+fastapi)\b/.test(code)) {
    if (/\b(?:OAuth2|HTTPBearer|jwt|bcrypt|passlib|create_access_token)\b/.test(code)) {
      patterns.push('FastAPI Authentication & Security');
    } else {
      patterns.push('FastAPI REST API');
    }
  }
  if (/\b(?:Flask|from\s+flask)\b/.test(code)) {
    patterns.push('Flask Web Service');
  }
  if (/\b(?:import\s+React|from\s+['"]react['"])/.test(code)) {
    patterns.push('React UI Component');
  }
  // DevOps & Infrastructure Patterns
  if (/FROM\s+[^\s]+/i.test(code) && /(?:RUN|CMD|ENTRYPOINT|WORKDIR|COPY)/i.test(code)) {
    patterns.push('Docker Container Build');
  }
  if (/(?:services:|version:\s*['"]?\d)/i.test(code) && /(?:image:|build:)/i.test(code)) {
    patterns.push('Docker Compose Multi-Service');
  }
  if (/(?:name:|on:)\s*.*(?:jobs:|steps:)/is.test(code)) {
    patterns.push('CI/CD Workflow Pipeline');
  }
  if (/\b(?:CREATE\s+TABLE|SELECT\s+.*?\s+FROM|INSERT\s+INTO)\b/is.test(code)) {
    patterns.push('SQL Database Operations');
  }
  return patterns;
}

function extractLeadComment(code: string): string | undefined {
  // Only inspect top-of-file comments before code or import statements
  const lines = code.split('\n').slice(0, 15);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // If we encounter code or imports, the file header comment area has ended!
    if (
      line.startsWith('import ') ||
      line.startsWith('from ') ||
      line.startsWith('package ') ||
      line.startsWith('def ') ||
      line.startsWith('class ') ||
      line.startsWith('export ') ||
      line.startsWith('const ') ||
      line.startsWith('let ') ||
      line.startsWith('var ') ||
      line.startsWith('#include')
    ) {
      break;
    }

    if (line.startsWith('//') || line.startsWith('#') || line.startsWith('/*') || line.startsWith('*')) {
      const cleaned = line
        .replace(/^\/\/\s*|^\/\*\s*|^\*\s*|^#\s*/, '')
        .replace(/\*\/$/, '')
        .trim();

      // Skip comment divider banners: "--- SECTION ---", "=== CONFIG ===", "### HELPERS ###"
      if (
        /^[-=*#~_]{2,}/.test(cleaned) ||
        /[-=*#~_]{2,}$/.test(cleaned) ||
        /^[-=*#~_\s]+$/.test(cleaned) ||
        /^([A-Z0-9_\s-]{4,})$/.test(cleaned) // ALL CAPS section header
      ) {
        continue;
      }

      if (
        cleaned.length > 8 &&
        !cleaned.startsWith('eslint') &&
        !cleaned.startsWith('pragma') &&
        !cleaned.startsWith('!') &&
        !cleaned.startsWith('include') &&
        !cleaned.startsWith('@ts-') &&
        !cleaned.startsWith('type:') &&
        !cleaned.startsWith('coding:')
      ) {
        return cleaned;
      }
    }
  }
  return undefined;
}

function parsePython(code: string): ExtractedMetadata {
  const dependencies = new Set<string>();
  const sideEffects = new Set<string>();
  const signatures: string[] = [];

  // Imports: "import numpy as np", "from tensorflow.keras import models"
  const importRegex = /(?:^|\n)\s*(?:import\s+([^\r\n#;]+)|from\s+([a-zA-Z0-9_.]+)\s+import)/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(code)) !== null) {
    if (match[1]) {
      match[1].split(',').forEach((pkg) => {
        const clean = pkg.trim().split(/\s+as\s+/)[0].split('.')[0].trim();
        if (clean && clean !== '__future__') {
          dependencies.add(clean);
        }
      });
    } else if (match[2]) {
      const clean = match[2].split('.')[0].trim();
      if (clean && clean !== '__future__') {
        dependencies.add(clean);
      }
    }
  }

  // File I/O & side-effects
  const ioRegex = /(?:open|with\s+open)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = ioRegex.exec(code)) !== null) {
    sideEffects.add(`reads/writes "${match[1]}"`);
  }

  // Pandas / OS / Subprocess / DB
  if (/(?:pd\.read_csv|pd\.read_json|pd\.read_excel)\s*\(\s*['"]([^'"]+)['"]/i.test(code)) {
    const pdMatch = /(?:pd\.read_\w+)\s*\(\s*['"]([^'"]+)['"]/i.exec(code);
    if (pdMatch) sideEffects.add(`loads "${pdMatch[1]}"`);
  }
  if (/(?:requests\.get|requests\.post|httpx\.get|httpx\.post|urllib)/.test(code)) {
    sideEffects.add('network HTTP calls');
  }
  if (/(?:sqlite3|psycopg2|sqlalchemy|pymongo)/.test(code)) {
    sideEffects.add('database queries');
  }

  // Signatures (def, class)
  const sigRegex = /(?:^|\n)\s*(?:def|class)\s+([a-zA-Z0-9_]+)\s*(\([^)]*\))?/g;
  let count = 0;
  while ((match = sigRegex.exec(code)) !== null && count < 6) {
    signatures.push(match[0].trim());
    count++;
  }

  return {
    dependencies: Array.from(dependencies).slice(0, 10),
    sideEffects: Array.from(sideEffects).slice(0, 6),
    signatures,
  };
}

function parseJavaScript(code: string): ExtractedMetadata {
  const dependencies = new Set<string>();
  const sideEffects = new Set<string>();
  const signatures: string[] = [];

  // ES Imports: import x from 'pkg'; import { y } from 'pkg';
  const importRegex = /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?|require\s*\(\s*)['"]([^'"./\\][^'"]*)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(code)) !== null) {
    const pkg = match[1].split('/')[0].trim();
    if (pkg) dependencies.add(pkg);
  }

  // File I/O: fs.readFileSync('path'), fs.writeFile, readFileSync('path'), etc.
  const fsRegex = /(?:fs\.)?(?:read|write|append|open|createReadStream|readFile|writeFile|readFileSync|writeFileSync)\w*\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = fsRegex.exec(code)) !== null) {
    sideEffects.add(`fs access "${match[1]}"`);
  }

  // HTTP & Network: fetch('url'), axios.get('url')
  const netRegex = /(?:fetch|axios\.(?:get|post|put|delete))\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = netRegex.exec(code)) !== null) {
    const url = match[1];
    sideEffects.add(`HTTP request to ${url.length > 35 ? url.slice(0, 32) + '...' : url}`);
  }

  // Signatures (function, export, class)
  const sigRegex = /(?:^|\n)\s*(?:export\s+)?(?:default\s+)?(?:function|class|const|let)\s+([a-zA-Z0-9_]+)/g;
  let count = 0;
  while ((match = sigRegex.exec(code)) !== null && count < 6) {
    signatures.push(match[1]);
    count++;
  }

  return {
    dependencies: Array.from(dependencies).slice(0, 10),
    sideEffects: Array.from(sideEffects).slice(0, 6),
    signatures,
  };
}

function parseGo(code: string): ExtractedMetadata {
  const dependencies = new Set<string>();
  const sideEffects = new Set<string>();
  const signatures: string[] = [];

  // Go imports
  const importBlockRegex = /import\s*\(([^)]+)\)/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = importBlockRegex.exec(code)) !== null) {
    const lines = blockMatch[1].split('\n');
    for (const line of lines) {
      const match = /"([^"]+)"/.exec(line);
      if (match) dependencies.add(match[1].split('/').pop() || match[1]);
    }
  }
  let match: RegExpExecArray | null;
  const singleImportRegex = /import\s+"([^"]+)"/g;
  while ((match = singleImportRegex.exec(code)) !== null) {
    dependencies.add(match[1].split('/').pop() || match[1]);
  }

  if (/(?:os\.Open|os\.ReadFile|ioutil\.ReadFile)\s*\(\s*["']([^"']+)["']/.test(code)) {
    sideEffects.add('file system I/O');
  }
  if (/(?:http\.Get|http\.Post|net\/http)/.test(code)) {
    sideEffects.add('HTTP network calls');
  }

  // Signatures
  const fnRegex = /func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/g;
  let count = 0;
  while ((match = fnRegex.exec(code)) !== null && count < 6) {
    signatures.push(match[1]);
    count++;
  }

  return {
    dependencies: Array.from(dependencies).slice(0, 10),
    sideEffects: Array.from(sideEffects).slice(0, 6),
    signatures,
  };
}

function parseRust(code: string): ExtractedMetadata {
  const dependencies = new Set<string>();
  const sideEffects = new Set<string>();
  const signatures: string[] = [];

  const useRegex = /use\s+([a-zA-Z0-9_]+)::/g;
  let match: RegExpExecArray | null;
  while ((match = useRegex.exec(code)) !== null) {
    if (match[1] !== 'crate' && match[1] !== 'super') {
      dependencies.add(match[1]);
    }
  }

  if (/(?:File::open|fs::read_to_string|std::fs)/.test(code)) {
    sideEffects.add('file system I/O');
  }
  if (/(?:reqwest|hyper|tokio::net)/.test(code)) {
    sideEffects.add('network I/O');
  }

  const fnRegex = /(?:pub\s+)?fn\s+([a-zA-Z0-9_]+)/g;
  let count = 0;
  while ((match = fnRegex.exec(code)) !== null && count < 6) {
    signatures.push(match[1]);
    count++;
  }

  return {
    dependencies: Array.from(dependencies).slice(0, 10),
    sideEffects: Array.from(sideEffects).slice(0, 6),
    signatures,
  };
}

function parseCStyle(code: string): ExtractedMetadata {
  const dependencies = new Set<string>();
  const sideEffects = new Set<string>();
  const signatures: string[] = [];

  // Includes / imports
  const incRegex = /#(?:include|import)\s+[<"]([^>"]+)[>"]/g;
  let match: RegExpExecArray | null;
  while ((match = incRegex.exec(code)) !== null) {
    dependencies.add(match[1]);
  }

  const javaImportRegex = /import\s+(?:static\s+)?([a-zA-Z0-9_.]+);/g;
  while ((match = javaImportRegex.exec(code)) !== null) {
    const parts = match[1].split('.');
    dependencies.add(parts.length > 1 ? parts[parts.length - 2] : parts[0]);
  }

  if (/(?:fopen|ifstream|ofstream|Files\.read|FileInputStream)/.test(code)) {
    sideEffects.add('file system I/O');
  }
  if (/(?:socket|curl|HttpURLConnection|HttpClient)/.test(code)) {
    sideEffects.add('network sockets/HTTP');
  }
  if (/(?:cin\s*>>|cout\s*<<|scanf|printf)/.test(code)) {
    sideEffects.add('standard I/O (cin/cout)');
  }

  // Extract functions: int main(), void solve(), etc.
  const fnRegex = /(?:^|\n)\s*(?:[a-zA-Z0-9_<>*&:]+\s+)+([a-zA-Z0-9_]+)\s*\([^;{}]*\)\s*\{/g;
  let count = 0;
  while ((match = fnRegex.exec(code)) !== null && count < 6) {
    const fnName = match[1];
    if (fnName && !['if', 'while', 'for', 'switch', 'catch'].includes(fnName)) {
      signatures.push(fnName);
      count++;
    }
  }

  return {
    dependencies: Array.from(dependencies).slice(0, 10),
    sideEffects: Array.from(sideEffects).slice(0, 6),
    signatures,
  };
}

function parseGeneric(code: string): ExtractedMetadata {
  const dependencies = new Set<string>();
  const sideEffects = new Set<string>();

  // Look for generic import/require/include/use statements
  const genericImportRegex = /(?:import|require|include|use)\s+['"<]?([a-zA-Z0-9_.-]+)['">]?/g;
  let match: RegExpExecArray | null;
  while ((match = genericImportRegex.exec(code)) !== null) {
    dependencies.add(match[1]);
  }

  // Look for common file extensions in strings (e.g. data.txt, config.json)
  const fileRefRegex = /['"]([^'"]+\.(?:txt|json|csv|yaml|yml|xml|sqlite|db|env))['"]/gi;
  while ((match = fileRefRegex.exec(code)) !== null) {
    sideEffects.add(`references "${match[1]}"`);
  }

  return {
    dependencies: Array.from(dependencies).slice(0, 10),
    sideEffects: Array.from(sideEffects).slice(0, 6),
    signatures: [],
  };
}

function parseDocker(code: string): ExtractedMetadata {
  const dependencies = new Set<string>();
  const sideEffects = new Set<string>();
  const signatures: string[] = [];

  // FROM <image> [AS <stage>]
  const fromRegex = /(?:^|\n)\s*FROM\s+([^\s#]+)(?:\s+AS\s+([^\s#]+))?/gi;
  let match: RegExpExecArray | null;
  while ((match = fromRegex.exec(code)) !== null) {
    dependencies.add(match[1]);
    if (match[2]) {
      signatures.push(`Stage: ${match[2]}`);
    }
  }

  // EXPOSE <port>
  const exposeRegex = /(?:^|\n)\s*EXPOSE\s+([^\r\n#]+)/gi;
  while ((match = exposeRegex.exec(code)) !== null) {
    sideEffects.add(`Exposes port ${match[1].trim()}`);
  }

  // VOLUME
  const volRegex = /(?:^|\n)\s*VOLUME\s+([^\r\n#]+)/gi;
  while ((match = volRegex.exec(code)) !== null) {
    sideEffects.add(`Mounts volume ${match[1].trim()}`);
  }

  // ENTRYPOINT / CMD
  const cmdRegex = /(?:^|\n)\s*(?:ENTRYPOINT|CMD)\s+([^\r\n#]+)/gi;
  while ((match = cmdRegex.exec(code)) !== null) {
    let clean = match[1].trim();
    if (clean.startsWith('[') && clean.endsWith(']')) {
      try {
        const arr = JSON.parse(clean);
        clean = arr.join(' ');
      } catch {
        // keep clean as is
      }
    }
    signatures.push(`Entry: ${clean}`);
  }

  return {
    dependencies: Array.from(dependencies).slice(0, 10),
    sideEffects: Array.from(sideEffects).slice(0, 6),
    signatures: signatures.slice(0, 6),
  };
}

function parseYaml(code: string): ExtractedMetadata {
  const dependencies = new Set<string>();
  const sideEffects = new Set<string>();
  const signatures: string[] = [];

  // GitHub Actions uses: actions/checkout@v4
  const usesRegex = /(?:^|\n)\s*(?:-\s*)?uses:\s*['"]?([^\s'"#]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = usesRegex.exec(code)) !== null) {
    dependencies.add(match[1]);
  }

  // Docker Compose images: image: postgres:15
  const imgRegex = /(?:^|\n)\s*image:\s*['"]?([^\s'"#]+)/gi;
  while ((match = imgRegex.exec(code)) !== null) {
    dependencies.add(match[1]);
  }

  // Docker Compose Services
  if (/(?:^|\n)services:\s*/i.test(code)) {
    const serviceRegex = /(?:^|\n)\s{2}([a-zA-Z0-9_-]+):\s*(?:\n|$)/g;
    while ((match = serviceRegex.exec(code)) !== null) {
      if (!['image', 'build', 'ports', 'volumes', 'environment', 'depends_on', 'restart'].includes(match[1])) {
        signatures.push(`Service: ${match[1]}`);
      }
    }
  }

  // Ports: "8000:8000"
  const portRegex = /(?:^|\n)\s*-\s*['"]?(\d+:\d+)['"]?/g;
  while ((match = portRegex.exec(code)) !== null) {
    sideEffects.add(`Binds port ${match[1]}`);
  }

  // Volumes
  if (/(?:^|\n)\s*volumes:\s*/i.test(code)) {
    sideEffects.add('Persistent volume mounts');
  }

  return {
    dependencies: Array.from(dependencies).slice(0, 10),
    sideEffects: Array.from(sideEffects).slice(0, 6),
    signatures: signatures.slice(0, 6),
  };
}

function parseShell(code: string): ExtractedMetadata {
  const dependencies = new Set<string>();
  const sideEffects = new Set<string>();
  const signatures: string[] = [];

  // Source / .
  const srcRegex = /(?:^|\n)\s*(?:source|\.)\s+([^\r\n#;]+)/g;
  let match: RegExpExecArray | null;
  while ((match = srcRegex.exec(code)) !== null) {
    dependencies.add(match[1].trim());
  }

  // CLI tools invoked
  const toolList = ['curl', 'wget', 'docker', 'kubectl', 'git', 'npm', 'pnpm', 'yarn', 'pip', 'python', 'node', 'ssh', 'scp', 'rsync'];
  for (const tool of toolList) {
    if (new RegExp(`(?:^|\\s|\\|)\\s*${tool}\\b`).test(code)) {
      dependencies.add(tool);
    }
  }

  if (/(?:curl|wget|ssh|scp|rsync)/.test(code)) {
    sideEffects.add('Network operations / downloads');
  }
  if (/(?:rm -rf|rm |mkdir |mv |cp )/.test(code)) {
    sideEffects.add('File system modifications');
  }

  // Functions: foo() { ... }
  const fnRegex = /(?:^|\n)\s*(?:function\s+)?([a-zA-Z0-9_-]+)\s*\(\s*\)\s*\{/g;
  while ((match = fnRegex.exec(code)) !== null) {
    signatures.push(match[1]);
  }

  return {
    dependencies: Array.from(dependencies).slice(0, 10),
    sideEffects: Array.from(sideEffects).slice(0, 6),
    signatures: signatures.slice(0, 6),
  };
}

function parseJson(code: string): ExtractedMetadata {
  const dependencies = new Set<string>();
  const sideEffects = new Set<string>();
  const signatures: string[] = [];

  try {
    const parsed = JSON.parse(code);
    if (parsed.dependencies && typeof parsed.dependencies === 'object') {
      Object.keys(parsed.dependencies).slice(0, 8).forEach((dep) => dependencies.add(dep));
    }
    if (parsed.scripts && typeof parsed.scripts === 'object') {
      Object.keys(parsed.scripts).slice(0, 6).forEach((sc) => signatures.push(`npm run ${sc}`));
    }
    if (parsed.name) {
      signatures.unshift(`Package: ${parsed.name}`);
    }
  } catch {
    // Non-strict JSON or large payload
  }

  return {
    dependencies: Array.from(dependencies).slice(0, 10),
    sideEffects: Array.from(sideEffects).slice(0, 6),
    signatures: signatures.slice(0, 6),
  };
}

function parseToml(code: string): ExtractedMetadata {
  const dependencies = new Set<string>();
  const sideEffects = new Set<string>();
  const signatures: string[] = [];

  const lines = code.split('\n');
  let currentSection = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1).toLowerCase();
      signatures.push(`Section: ${currentSection}`);
      continue;
    }
    if (currentSection.includes('dependencies')) {
      const match = /^([a-zA-Z0-9_-]+)\s*=/i.exec(trimmed);
      if (match && match[1] !== 'python') {
        dependencies.add(match[1]);
      }
    }
  }

  return {
    dependencies: Array.from(dependencies).slice(0, 10),
    sideEffects: Array.from(sideEffects).slice(0, 6),
    signatures: signatures.slice(0, 6),
  };
}

function parseSql(code: string): ExtractedMetadata {
  const dependencies = new Set<string>();
  const sideEffects = new Set<string>();
  const signatures: string[] = [];

  const tblRegex = /\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z0-9_.]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = tblRegex.exec(code)) !== null) {
    dependencies.add(match[1]);
  }

  if (/\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\b/i.test(code)) {
    sideEffects.add('Database mutations (INSERT/UPDATE/DDL)');
  }
  if (/\bSELECT\b/i.test(code)) {
    sideEffects.add('Database queries (SELECT)');
  }

  const createRegex = /\bCREATE\s+(?:TABLE|VIEW|INDEX|PROCEDURE|FUNCTION)\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_.]+)/gi;
  while ((match = createRegex.exec(code)) !== null) {
    signatures.push(match[0].trim());
  }

  return {
    dependencies: Array.from(dependencies).slice(0, 10),
    sideEffects: Array.from(sideEffects).slice(0, 6),
    signatures: signatures.slice(0, 6),
  };
}
