// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/shell.css', 'utf8');

describe('Reactive UI in low-power mode', () => {
  it('drops the repainting glows and keeps only transforms', () => {
    const rule = css.match(/\.AppShell\[data-perf='low'\][^{]*\{[^}]*--reactive-glow:\s*0/);
    expect(rule).not.toBeNull();
    expect(css).toMatch(/\* var\(--reactive-glow, 1\)/);
  });
});
