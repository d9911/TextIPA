import { spawn } from 'node:child_process';
import type { Dialect, Language } from '../../types/domain.ts';
export function runEspeak(args: string[], text = ''): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.ESPEAK_BIN || 'espeak-ng', args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let output = '';
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(output.trim());
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('ENGINE_TIMEOUT'));
    }, 4000);
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
      if (output.length > 20000) {
        child.kill();
        finish(new Error('ENGINE_OUTPUT_LIMIT'));
      }
    });
    child.stdin.on('error', () => {});
    child.on('error', () => finish(new Error('ENGINE_MISSING')));
    child.on('close', (code) => finish(code === 0 ? undefined : new Error('ENGINE_FAILED')));
    child.stdin.end(text);
  });
}
function spanishToken(token: string): string {
  token = token.replace(/ˌ/g, '').replace(/ɛ/g, 'e').replace(/ɪ/g, 'i').replace(/ʊ/g, 'u').replace(/ʎ/g, 'ʝ').replace(/g/g, 'ɡ').replace(/uˈe/g, 'wˈe');
  const vowels = 'aeiouəɑ';
  const onsets = new Set(['pɾ', 'bɾ', 'βɾ', 'tɾ', 'dɾ', 'ðɾ', 'kɾ', 'ɡɾ', 'ɣɾ', 'fɾ', 'pl', 'bl', 'βl', 'kl', 'ɡl', 'ɣl', 'fl', 'tʃ']);
  while (token.includes('ˈ')) {
    const pos = token.indexOf('ˈ');
    const bare = token.slice(0, pos) + token.slice(pos + 1);
    let start = pos;
    while (start > 0 && !vowels.includes(bare[start - 1]!)) start--;
    const cluster = bare.slice(start, pos);
    let next = 0;
    if (start !== 0) {
      const glide = /[jw]$/.test(cluster) ? cluster.slice(-1) : '';
      const root = glide ? cluster.slice(0, -1) : cluster;
      const onset = onsets.has(root.slice(-2)) ? root.slice(-2) : root.slice(-1);
      next = pos - onset.length - glide.length;
    }
    token = bare.slice(0, next) + '§' + bare.slice(next);
  }
  return token
    .replace(/§/g, 'ˈ')
    .replace(/tʃ/g, 't͡ʃ')
    .replace(/([aeou])i(?![aeiou])/g, '$1i̯')
    .replace(/([aeio])u(?![aeiou])/g, '$1u̯');
}
export function normalizeIpa(raw: string, language: Language, dialect: Dialect): string {
  let value = raw
    .replace(/[​-‍﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (language === 'es') {
    value = value.split(' ').map(spanishToken).join(' ');
    if (dialect === 'es-419') value = value.replace(/θ/g, 's');
  }
  return '[' + value + ']';
}
export async function generateIpa(texts: string[], language: Language, dialect: Dialect): Promise<string[]> {
  const voice = language === 'en' ? (dialect === 'en-US' ? 'en-us' : 'en-gb') : language;
  const result: string[] = [];
  const start = Date.now();
  for (const text of texts) {
    if (Date.now() - start > 30000) throw new Error('ENGINE_TIMEOUT');
    result.push(normalizeIpa(await runEspeak(['-q', '--ipa=3', '-v', voice, '--stdin'], text), language, dialect));
  }
  return result;
}
