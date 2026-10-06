import { describe, it, expect } from 'vitest';
import { handoffTransform } from '../shell/logoHandoff';

describe('handoffTransform', () => {
  it('moves the small logo back to the big one and scales it up from its corner', () => {
    expect(
      handoffTransform({ left: 300, top: 400, height: 100 }, { left: 20, top: 16, height: 25 })
    ).toBe('translate(280px, 384px) scale(4)');
  });

  it('does not scale when the target has no height yet', () => {
    expect(handoffTransform({ left: 0, top: 0, height: 50 }, { left: 0, top: 0, height: 0 })).toBe(
      'translate(0px, 0px) scale(1)'
    );
  });
});
