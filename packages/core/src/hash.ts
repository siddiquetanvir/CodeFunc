/**
 * Computes a fast 128-bit hash (Murmur3/FNV-inspired) formatted as a 32-character hex string.
 * 100% platform-agnostic (works identically in Node.js, Electron, and browser environments)
 * without requiring Node.js 'crypto' polyfills or native bindings.
 */
export function computeContentHash(content: string, salt: string = ''): string {
  const str = salt ? `${salt}:${content}` : content;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  let h3 = 0x1b873593;
  let h4 = 0x2b4c5d6e;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822519);
    h4 = Math.imul(h4 ^ ch, 3266489917);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);

  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const p4 = (h4 >>> 0).toString(16).padStart(8, '0');

  return `${p1}${p2}${p3}${p4}`;
}
