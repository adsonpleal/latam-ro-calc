import { describe, expect, it } from 'vitest';
import { PrettyJsonFormatter as PrettyJsonPipe } from '../utils/pretty-json';

describe('raw JSON highlighting', () => {
  const pipe = new PrettyJsonPipe();

  it('preserves whitespace and unfinished input while highlighting recognized tokens', () => {
    const source = '{\n    "atk": ["10",\n';
    const html = pipe.transform(source, [false, 0, 'raw']);
    expect(html).toContain('class="key"');
    expect(html).toContain('class="string"');
    expect(html.replace(/<\/?span[^>]*>/g, '')).toBe(source);
  });

  it('escapes user text before emitting token spans', () => {
    const html = pipe.transform('{"text":"<img src=x onerror=alert(1)> & value"}', [false, 0, 'raw']);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&gt; &amp; value');
  });

  it('keeps the existing formatted display mode', () => {
    expect(pipe.transform('{"atk":["10"]}', [true, 3])).toContain('class="number-line');
    expect(pipe.transform('{', [false, 3])).toContain('Invalid JSON');
  });
});
