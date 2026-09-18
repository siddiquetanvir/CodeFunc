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
      result = parseGeneric(code);
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
  return patterns;
}

function extractLeadComment(code: string): string | undefined {
  const lines = code.split('\n').slice(0, 25);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('//') || line.startsWith('#') || line.startsWith('/*') || line.startsWith('*')) {
      const cleaned = line
        .replace(/^\/\/\s*|^\/\*\s*|^\*\s*|^#\s*/, '')
        .replace(/\*\/$/, '')
        .trim();
      if (
        cleaned.length > 5 &&
        !cleaned.startsWith('eslint') &&
        !cleaned.startsWith('pragma') &&
        !cleaned.startsWith('!') &&
        !cleaned.startsWith('include') &&
        !cleaned.startsWith('@ts-')
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
