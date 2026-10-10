import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChannelColorsNotice from '../components/stage/ChannelColorsNotice';
import { VIZ_COPY } from '../components/stage/vizControls';

function renderNotice(props: Partial<React.ComponentProps<typeof ChannelColorsNotice>> = {}) {
  const onUpdate = vi.fn();
  const view = render(
    <ChannelColorsNotice
      visualizerStyle="scopes"
      spectrumColoring="additive"
      scopeColoring="unified"
      onUpdate={onUpdate}
      {...props}
    />
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

  it('explains that the Unified spectrum ignores the palette and switches it to Add light', () => {
    const { onUpdate } = renderNotice({ visualizerStyle: 'spectrum', spectrumColoring: 'unified' });
    expect(screen.getByText(VIZ_COPY.spectrumIgnoresChannels)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: VIZ_COPY.colorSpectrumByChannel }));
    expect(onUpdate).toHaveBeenCalledWith({ spectrumColoring: 'additive' });
  });

  it('shows nothing when the current visual uses channel colors', () => {
    const scopes = renderNotice({ scopeColoring: 'channel' });
    expect(scopes.container.innerHTML).toBe('');
    scopes.unmount();
    const spectrum = renderNotice({ visualizerStyle: 'spectrum', spectrumColoring: 'average' });
    expect(spectrum.container.innerHTML).toBe('');
  });
});
