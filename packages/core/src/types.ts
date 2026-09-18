export interface FileSummary {
  /** Concise 1-sentence description of what the file accomplishes. */
  coreRole: string;
  /** Detailed multi-sentence overview explaining file architecture, flow, and purpose. */
  detailedSummary?: string;
  /** Key logic, algorithms, or mechanisms detected in the file. */
  keyMechanisms?: string[];
  /** Key libraries, packages, or frameworks imported and used. */
  dependencies: string[];
  /** I/O and side effects (file reads/writes, network APIs, database operations). */
  sideEffects: string[];
  /** Timestamp when this summary was generated. */
  timestamp?: number;
  /** Source language identified. */
  language?: string;
}

export interface ExtractedMetadata {
  /** Discovered external imports and packages. */
  dependencies: string[];
  /** Discovered file operations, system resources, and network endpoints. */
  sideEffects: string[];
  /** Important top-level functions or class signatures extracted locally. */
  signatures: string[];
  /** Detected algorithmic patterns (e.g. 2D matrix, sorting, network server). */
  patterns?: string[];
  /** Top-level leading header comment describing the file, if present. */
  leadComment?: string;
}

export interface CacheStore {
  get<T>(key: string): Promise<T | undefined> | T | undefined;
  set<T>(key: string, value: T): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
}

export type AIProvider = 'gemini' | 'groq' | 'openrouter' | 'anthropic' | 'auto';

export interface SummarizeOptions {
  code: string;
  languageId?: string;
  filePath?: string;
  provider?: AIProvider;
  apiKey: string;
  model?: string;
  cache?: CacheStore;
  persona?: string;
}
