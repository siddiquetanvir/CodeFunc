import { GoogleGenAI } from '@google/genai';
import { ExtractedMetadata, FileSummary, SummarizeOptions } from './types';
import { extractMetadata } from './parser';
import { computeContentHash } from './hash';

const SUMMARY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    coreRole: {
      type: 'string',
      description: 'One concise sentence (max 15 words) explaining what this file accomplishes.',
    },
    detailedSummary: {
      type: 'string',
      description: 'A comprehensive 2-4 sentence architectural overview explaining what this file accomplishes, how data flows, and key algorithms or components.',
    },
    keyMechanisms: {
      type: 'array',
      items: { type: 'string' },
      description: 'Key algorithms, data structures, or patterns utilized (e.g. "2D Grid Scan", "Manhattan distance").',
    },
    dependencies: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of external libraries and key modules imported/used.',
    },
    sideEffects: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of files read/written, network endpoints, or database tables invoked.',
    },
  },
  required: ['coreRole', 'detailedSummary', 'dependencies', 'sideEffects'],
};

export function detectProvider(apiKey: string, specifiedProvider?: string): 'gemini' | 'groq' | 'openrouter' | 'anthropic' {
  if (specifiedProvider && specifiedProvider !== 'auto') {
    if (specifiedProvider === 'groq' || specifiedProvider === 'openrouter' || specifiedProvider === 'gemini' || specifiedProvider === 'anthropic') {
      return specifiedProvider;
    }
  }
  const key = (apiKey || '').trim();
  if (key.startsWith('sk-ant-')) {
    return 'anthropic';
  }
  if (key.startsWith('gsk_')) {
    return 'groq';
  }
  if (key.startsWith('sk-or-')) {
    return 'openrouter';
  }
  return 'gemini';
}

function getPersonaInstruction(persona?: string): string {
  switch (persona) {
    case 'Security Auditor':
      return 'Act as a senior Security Auditor. Explicitly emphasize security posture, validation/sanitization, sensitive data handling, auth, and external attack surfaces.';
    case 'Performance Expert':
      return 'Act as a senior Performance Engineer. Explicitly emphasize computational complexity, memory allocations, caching, bottleneck routines, and latency/throughput characteristics.';
    default:
      return 'Act as an expert senior developer writing a clear, direct, and non-generic architectural overview for team members browsing the codebase.';
  }
}

/**
 * Summarizes the file using local extraction + Gemini/Groq/OpenRouter/Anthropic API.
 * Uses cache if provided to avoid repeated API calls for unchanged files.
 */
export async function summarizeFile(options: SummarizeOptions): Promise<FileSummary> {
  const { code, languageId, filePath, apiKey, model = 'gemini-flash-latest', cache, persona } = options;

  // 1. Check cache first (incorporate persona into hash key if set)
  const personaSuffix = persona ? `:${persona}` : '';
  const contentHash = computeContentHash(code, languageId) + personaSuffix;
  if (cache) {
    const cached = await cache.get<FileSummary>(contentHash);
    if (cached) {
      return cached;
    }
  }

  // 2. Local static extraction
  const metadata = extractMetadata(code, languageId);

  // If no API key provided, return intelligent local summary
  if (!apiKey || !apiKey.trim()) {
    return generateSmartLocalSummary(metadata, languageId, filePath);
  }

  // 3. Prepare optimized prompt to minimize token usage
  const codeExcerpt = code.length > 12000 ? code.slice(0, 12000) + '\n... [truncated]' : code;
  const personaInstruction = getPersonaInstruction(persona);

  const prompt = `${personaInstruction}
Your goal is to give a coworker browsing this codebase a crisp, instant understanding of what this file does directly at Line 0.

File: ${filePath || 'code_file'}
Language: ${languageId || 'unknown'}
Pre-extracted dependencies: ${JSON.stringify(metadata.dependencies)}
Pre-extracted I/O and side effects: ${JSON.stringify(metadata.sideEffects)}
Header comment: ${metadata.leadComment || 'None'}

Code excerpt:
\`\`\`${languageId || ''}
${codeExcerpt}
\`\`\`

Return a JSON object conforming strictly to the requested schema.
- coreRole: A single concise, punchy sentence (max 12-14 words) describing the file's primary purpose so it fits comfortably on screen without horizontal scrolling (e.g., "Calculates contest qualifiers scoring at or above k-th rank threshold").
- detailedSummary: A comprehensive 2-4 sentence architectural overview explaining what this file accomplishes, logic flow, and edge cases.
- keyMechanisms: List of key algorithms, patterns, or data structures used.
- dependencies: The key external libraries/modules used.
- sideEffects: Files read/written, network APIs, or database/console I/O invoked.`;

  try {
    const resolvedProvider = detectProvider(apiKey, options.provider);
    let summary: FileSummary;

    if (resolvedProvider === 'groq') {
      summary = await callOpenAICompatible(
        apiKey,
        model && model !== 'gemini-flash-latest' ? model : 'llama-3.3-70b-versatile',
        'https://api.groq.com/openai/v1/chat/completions',
        prompt,
        metadata
      );
    } else if (resolvedProvider === 'openrouter') {
      summary = await callOpenAICompatible(
        apiKey,
        model && model !== 'gemini-flash-latest' ? model : 'google/gemini-2.5-flash',
        'https://openrouter.ai/api/v1/chat/completions',
        prompt,
        metadata,
        {
          'HTTP-Referer': 'https://github.com/siddiquetanvir/CodeFunc',
          'X-Title': 'CodeFunc',
        }
      );
    } else if (resolvedProvider === 'anthropic') {
      summary = await callAnthropicNative(
        apiKey,
        model && model !== 'gemini-flash-latest' ? model : 'claude-3-5-haiku-latest',
        prompt,
        metadata
      );
    } else {
      summary = await callGemini(apiKey, model, prompt, metadata);
    }

    summary.timestamp = Date.now();
    summary.language = languageId;

    // Cache the result
    if (cache) {
      await cache.set(contentHash, summary);
    }

    return summary;
  } catch (err: any) {
    // Graceful intelligent fallback to static metadata on network/API failure
    return generateSmartLocalSummary(metadata, languageId, filePath);
  }
}

async function callOpenAICompatible(
  apiKey: string,
  model: string,
  endpoint: string,
  prompt: string,
  fallbackMetadata: ExtractedMetadata,
  extraHeaders: Record<string, string> = {}
): Promise<FileSummary> {
  const systemPrompt = `You are a high-performance code analyzer. Analyze the provided code and return a JSON object with this exact structure:
{
  "coreRole": "One crisp, concrete sentence (max 15 words) explaining the primary purpose of the file.",
  "detailedSummary": "A comprehensive 2-4 sentence architectural overview explaining data flow, purpose, and key components.",
  "keyMechanisms": ["Key algorithm, pattern, or data structure used"],
  "dependencies": ["External library or module name"],
  "sideEffects": ["Files read/written, network endpoints, or DB queries"]
}
Never include markdown formatting or backticks outside the JSON object. Return raw JSON only.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
      signal: controller.signal as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Provider API error (${response.status}): ${errorText}`);
    }

    const data: any = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('No content returned from LLM provider');
    }

    const parsed = JSON.parse(rawContent);
    return sanitizeSummary(parsed, fallbackMetadata);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callAnthropicNative(
  apiKey: string,
  model: string,
  prompt: string,
  fallbackMetadata: ExtractedMetadata
): Promise<FileSummary> {
  const systemPrompt = `You are a high-performance code analyzer. Analyze the provided code and return a JSON object with this exact structure:
{
  "coreRole": "One crisp, concrete sentence (max 15 words) explaining the primary purpose of the file.",
  "detailedSummary": "A comprehensive 2-4 sentence architectural overview explaining data flow, purpose, and key components.",
  "keyMechanisms": ["Key algorithm, pattern, or data structure used"],
  "dependencies": ["External library or module name"],
  "sideEffects": ["Files read/written, network endpoints, or DB queries"]
}
Never include conversational intro, markdown formatting, or backticks outside the JSON object. Return raw JSON only.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
      signal: controller.signal as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const data: any = await response.json();
    const textBlock = data.content?.find((b: any) => b.type === 'text');
    const rawContent = textBlock?.text;
    if (!rawContent) {
      throw new Error('No content returned from Anthropic API');
    }

    // Clean potential markdown wrap if model included it
    const cleanJson = rawContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);
    return sanitizeSummary(parsed, fallbackMetadata);
  } finally {
    clearTimeout(timeoutId);
  }
}

function generateSmartLocalSummary(
  metadata: ExtractedMetadata,
  languageId?: string,
  filePath?: string
): FileSummary {
  let role = '';
  const mechanisms = metadata.patterns || [];

  if (metadata.leadComment) {
    role = metadata.leadComment;
    if (metadata.signatures.includes('main') && !role.toLowerCase().includes('main')) {
      role += ' (main)';
    }
  } else if (mechanisms.length > 0) {
    role = mechanisms.slice(0, 2).join(' & ');
    if (metadata.signatures.includes('main')) {
      role += ' (main)';
    }
  } else if (metadata.signatures.includes('main')) {
    const otherFns = metadata.signatures.filter((s) => s !== 'main');
    if (otherFns.length > 0) {
      role = `Entrypoint (main) coordinating ${otherFns.slice(0, 2).join(', ')}`;
    } else {
      role = 'Executable program entrypoint (main)';
    }
  } else if (metadata.signatures.length > 0) {
    role = `Implements ${metadata.signatures.slice(0, 3).join(', ')}`;
  } else if (metadata.dependencies.length > 0) {
    role = `Module configuring ${metadata.dependencies.slice(0, 3).join(', ')}`;
  } else {
    const baseName = filePath ? filePath.split('/').pop() : '';
    role = baseName ? `Module logic for ${baseName}` : 'Module definitions and program logic';
  }

  // Generate detailed overview
  const parts: string[] = [];
  if (role) {
    parts.push(`Primary Role: ${role}.`);
  }
  if (mechanisms.length > 0) {
    parts.push(`Identified logic & patterns: ${mechanisms.join(', ')}.`);
  }
  if (metadata.signatures.length > 0) {
    parts.push(`Defined procedures: ${metadata.signatures.join(', ')}.`);
  }
  if (metadata.dependencies.length > 0) {
    parts.push(`Dependencies: ${metadata.dependencies.join(', ')}.`);
  }
  if (metadata.sideEffects.length > 0) {
    parts.push(`I/O & Side-effects: ${metadata.sideEffects.join('; ')}.`);
  }

  return {
    coreRole: role,
    detailedSummary: parts.join(' '),
    keyMechanisms: mechanisms,
    dependencies: metadata.dependencies.length > 0 ? metadata.dependencies : ['None detected'],
    sideEffects: metadata.sideEffects.length > 0 ? metadata.sideEffects : ['None detected'],
    timestamp: Date.now(),
    language: languageId,
  };
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  fallbackMetadata: ExtractedMetadata
): Promise<FileSummary> {
  const client = new GoogleGenAI({ apiKey });

  // Attempt 1: Interactions API with response_format
  try {
    const interaction = await client.interactions.create({
      model,
      input: prompt,
      response_format: [
        {
          type: 'text',
          mime_type: 'application/json',
          schema: SUMMARY_JSON_SCHEMA,
        },
      ],
    });

    if (interaction.output_text) {
      const parsed = JSON.parse(interaction.output_text);
      return sanitizeSummary(parsed, fallbackMetadata);
    }
  } catch (interactionError) {
    // Attempt 2: Fallback to generateContent API
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: SUMMARY_JSON_SCHEMA as any,
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return sanitizeSummary(parsed, fallbackMetadata);
      }
    } catch (genError) {
      // Re-throw to hit the graceful fallback in summarizeFile
      throw genError;
    }
  }

  throw new Error('No output returned from Gemini API');
}

function sanitizeSummary(raw: any, metadata: ExtractedMetadata): FileSummary {
  const coreRole = typeof raw.coreRole === 'string' && raw.coreRole.trim()
    ? raw.coreRole.trim()
    : 'Performs module logic and data handling';

  const detailedSummary = typeof raw.detailedSummary === 'string' && raw.detailedSummary.trim()
    ? raw.detailedSummary.trim()
    : undefined;

  const keyMechanisms = Array.isArray(raw.keyMechanisms) && raw.keyMechanisms.length > 0
    ? raw.keyMechanisms
    : metadata.patterns;

  const dependencies = Array.isArray(raw.dependencies) && raw.dependencies.length > 0
    ? raw.dependencies
    : metadata.dependencies;

  const sideEffects = Array.isArray(raw.sideEffects) && raw.sideEffects.length > 0
    ? raw.sideEffects
    : metadata.sideEffects;

  return {
    coreRole,
    detailedSummary,
    keyMechanisms,
    dependencies,
    sideEffects,
  };
}

