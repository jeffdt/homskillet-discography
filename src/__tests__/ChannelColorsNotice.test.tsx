import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChannelColorsNotice from '../components/stage/ChannelColorsNotice';
import { VIZ_COPY } from '../components/stage/vizControls';

function renderNotice(props: Partial<React.ComponentProps<typeof ChannelColorsNotice>> = {}) {
  const onUpdate = vi.fn();
  const view = render(
    <ChannelColorsNotice scopeColoring="unified" onUpdate={onUpdate} {...props} />
  );
  return { onUpdate, ...view };
}

describe('ChannelColorsNotice', () => {
  it('explains that accent-colored scopes ignore the palette and switches them by channel', () => {
    const { onUpdate } = renderNotice();
    expect(screen.getByText(VIZ_COPY.scopesIgnoreChannels)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: VIZ_COPY.colorScopesByChannel }));
    expect(onUpdate).toHaveBeenCalledWith({ scopeColoring: 'channel' });
  });

  it('shows nothing when the scopes use channel colors', () => {
    const { container } = renderNotice({ scopeColoring: 'channel' });
    expect(container.innerHTML).toBe('');
  });
});
