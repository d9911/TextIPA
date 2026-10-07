import test from 'node:test';
import assert from 'node:assert/strict';
import { localVoice } from '../src/features/playback/voice.ts';

test('playback only chooses local voices, preferring the requested dialect without remote fallback', () => {
  const remote = { localService: false, lang: 'es-ES' };
  const local = { localService: true, lang: 'es-MX' };
  const exact = { localService: true, lang: 'es-ES' };
  assert.equal(localVoice([remote, local, exact], 'es', 'es-ES'), exact);
  assert.equal(localVoice([remote, local], 'es', 'es-ES'), local);
  assert.equal(localVoice([remote, { localService: true, lang: 'en-US' }], 'es', 'es-ES'), undefined);
  assert.equal(localVoice([], 'es', 'es-ES'), undefined);
});
