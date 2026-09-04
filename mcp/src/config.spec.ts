/**
 * The Worker `vars` override path.
 *
 * Worth its own file because the mechanism is otherwise invisible: `config` is a module
 * global that `initConfig` mutates, so a value read at module-eval time — before any
 * request calls it — silently keeps the default forever. That is not a crash, it is a
 * wrong number, and `ALLOWED_HOSTS` in particular is what the DNS-rebinding check compares
 * against. These tests are what say the wiring is live at all.
 */
import { describe, expect, it } from 'vitest';
import { config, initConfig } from './config';

describe('initConfig', () => {
  it('falls back to the defaults when no var is set', () => {
    initConfig({});
    expect(config.appOrigin).toBe('https://simulador.latam-tools.com.br');
    expect(config.allowedHosts).toEqual(['simulador.latam-tools.com.br', 'localhost']);
    expect(config.limits.maxSearchResults).toBe(50);
  });

  it('applies string, integer and comma-list vars', () => {
    initConfig({
      PUBLIC_APP_ORIGIN: 'https://staging.example.com',
      DEFAULT_TARGET_ID: '1002',
      ALLOWED_HOSTS: 'a.example.com, b.example.com',
      MAX_SEARCH_RESULTS: '7',
    });
    expect(config.appOrigin).toBe('https://staging.example.com');
    expect(config.defaultTargetId).toBe(1002);
    expect(config.allowedHosts).toEqual(['a.example.com', 'b.example.com']);
    expect(config.limits.maxSearchResults).toBe(7);
  });

  it('ignores blank and unparseable values rather than taking them literally', () => {
    initConfig({ PUBLIC_APP_ORIGIN: '   ', DEFAULT_TARGET_ID: 'não é número', ALLOWED_HOSTS: '' });
    expect(config.appOrigin).toBe('https://simulador.latam-tools.com.br');
    expect(config.defaultTargetId).toBe(21077);
    expect(config.allowedHosts).toEqual(['simulador.latam-tools.com.br', 'localhost']);
  });

  it('is idempotent, since it runs on every request', () => {
    initConfig({ ALLOWED_HOSTS: 'once.example.com' });
    initConfig({ ALLOWED_HOSTS: 'once.example.com' });
    expect(config.allowedHosts).toEqual(['once.example.com']);
  });

  it('never hands back the defaults array itself, which a later call would then mutate', () => {
    initConfig({});
    const first = config.allowedHosts;
    initConfig({ ALLOWED_HOSTS: 'other.example.com' });
    initConfig({});
    expect(config.allowedHosts).toEqual(['simulador.latam-tools.com.br', 'localhost']);
    expect(config.allowedHosts).not.toBe(first);
  });
});
