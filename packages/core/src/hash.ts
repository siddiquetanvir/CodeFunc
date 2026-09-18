import * as crypto from 'crypto';

/**
 * Computes a fast MD5 hash of the given string content.
 * Used for zero-cost cache lookups across file opens.
 */
export function computeContentHash(content: string, salt: string = ''): string {
  return crypto
    .createHash('md5')
    .update(salt ? `${salt}:${content}` : content)
    .digest('hex');
}
