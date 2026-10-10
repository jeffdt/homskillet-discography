import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PanelHost from '../components/PanelHost';
import { PanelState } from '../shell/panels';

function renderHost(panels: PanelState, compact: boolean, onClose = vi.fn()) {
  const utils = render(
    <PanelHost
      panels={panels}
      compact={compact}
      onClose={onClose}
      renderPanel={(id) => <p>{`${id} body`}</p>}
    />
  );
  return { ...utils, onClose };
}

function touch(el: Element, type: string, key: 'touches' | 'changedTouches', clientY: number) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, key, { value: [{ clientY }] });
  fireEvent(el, event);
}

describe('PanelHost', () => {
  it('shows outer, inner and center panels together on wide layouts', () => {
    renderHost({ open: ['albums', 'stage', 'about'] }, false);
    expect(screen.getByRole('dialog', { name: 'Albums' }).className).toContain('Panel--outer');
    expect(screen.getByRole('dialog', { name: 'Visualizer' }).className).toContain('Panel--inner');
    expect(screen.getByRole('dialog', { name: 'About' }).className).toContain('Panel--center');
  });

  it('shows only the topmost panel as a sheet on compact layouts', () => {
    const { container } = renderHost({ open: ['albums', 'mixer'] }, true);
    expect(screen.queryByRole('dialog', { name: 'Albums' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Mixer' }).className).toContain('Panel--sheet');
    expect(container.querySelector('.Panel-backdrop')).not.toBeNull();
  });

  it('closes from the close button and from the compact backdrop', () => {
    const { container, onClose } = renderHost({ open: ['about'] }, true);
    fireEvent.click(screen.getByRole('button', { name: 'Close About' }));
    fireEvent.click(container.querySelector('.Panel-backdrop')!);
    expect(onClose.mock.calls).toEqual([['about'], ['about']]);
  });

  it('closes a compact sheet on a downward swipe of its header', () => {
    const { container, onClose } = renderHost({ open: ['albums'] }, true);
    const header = container.querySelector('.Panel-header')!;
    touch(header, 'touchstart', 'touches', 100);
    touch(header, 'touchend', 'changedTouches', 220);
    expect(onClose).toHaveBeenCalledWith('albums');
  });

  it('ignores short swipes and renders panel bodies in a scroll container', () => {
    const { container, onClose } = renderHost({ open: ['albums'] }, true);
    const header = container.querySelector('.Panel-header')!;
    touch(header, 'touchstart', 'touches', 100);
    touch(header, 'touchend', 'changedTouches', 140);
    expect(onClose).not.toHaveBeenCalled();
    expect(container.querySelector('.Panel-body')!.textContent).toBe('albums body');
  });
});
