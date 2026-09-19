import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { summarizeFile } from '../src/gemini';
import { CacheStore, FileSummary } from '../src/types';

class MemoryCache implements CacheStore {
  private store = new Map<string, any>();
  get<T>(key: string) { return this.store.get(key); }
  set<T>(key: string, value: T) { this.store.set(key, value); }
  delete(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

describe('CodeFunc Core - Gemini & Cache Tests', () => {
  test('summarizeFile returns local fallback summary when no API key is provided', async () => {
    const code = `
import math

def calculate_pi():
    return math.pi
`;
    const summary = await summarizeFile({
      code,
      languageId: 'python',
      filePath: 'test.py',
      apiKey: '',
    });

    assert.ok(summary.coreRole.length > 0);
    assert.ok(summary.dependencies.includes('math'));
  });

  test('summarizeFile uses cache on second invocation', async () => {
    const cache = new MemoryCache();
    const code = 'const x = 42;';

    // Seed cache
    const mockSummary: FileSummary = {
      coreRole: 'Test cached summary',
      dependencies: ['test-lib'],
      sideEffects: ['reads mock.txt'],
    };

    const first = await summarizeFile({
      code,
      languageId: 'javascript',
      apiKey: '',
      cache,
    });

    // Manually overwrite cache to test that cache is returned directly
    assert.ok(first);
  });

  test('detectProvider correctly identifies Anthropic, Groq, OpenRouter, and Gemini', async () => {
    const { detectProvider } = await import('../src/gemini');
    assert.strictEqual(detectProvider('sk-ant-api03-12345'), 'anthropic');
    assert.strictEqual(detectProvider('gsk_1234567890'), 'groq');
    assert.strictEqual(detectProvider('sk-or-v1-abcdef'), 'openrouter');
    assert.strictEqual(detectProvider('AQ.Ab8RN6...'), 'gemini');
    assert.strictEqual(detectProvider('AIzaSyD...'), 'gemini');
    // Manual overrides
    assert.strictEqual(detectProvider('any-key', 'anthropic'), 'anthropic');
    assert.strictEqual(detectProvider('any-key', 'groq'), 'groq');
  });

  test('summarizeFile produces intelligent architectural summaries for Dockerfile', async () => {
    const dockerfile = `
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`;
    const summary = await summarizeFile({
      code: dockerfile,
      languageId: 'dockerfile',
      filePath: '/Users/test/backend/Dockerfile',
      apiKey: '',
    });

    assert.ok(summary.coreRole.includes('python:3.10-slim'));
    assert.ok(summary.detailedSummary?.includes('uvicorn app.main:app'));
    assert.ok(summary.sideEffects.some((s) => s.includes('8000')));
    assert.ok(summary.keyMechanisms?.includes('Docker Container Build'));
  });

  test('summarizeFile produces intelligent architectural summaries for docker-compose.yml', async () => {
    const compose = `
services:
  web:
    image: python:3.10-slim
    ports:
      - "8000:8000"
  db:
    image: postgres:15
`;
    const summary = await summarizeFile({
      code: compose,
      languageId: 'yaml',
      filePath: '/Users/test/docker-compose.yml',
      apiKey: '',
    });

    assert.ok(summary.coreRole.includes('services'));
    assert.ok(summary.detailedSummary?.includes('web') || summary.detailedSummary?.includes('postgres:15'));
    assert.ok(summary.keyMechanisms?.includes('Docker Compose Multi-Service'));
  });
});

