import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import Slider from '../components/Slider';

describe('Slider', () => {
  it('maps a click to a fraction of the rail measured in viewport coordinates', () => {
    const onChange = vi.fn();
    const { container } = render(<Slider pos={0} onDrag={() => {}} onChange={onChange} />);
    const rail = container.querySelector('.Slider') as HTMLElement;
    // offsetLeft stays 0 in jsdom, like a slider whose positioned ancestor sits mid-page.
    rail.getBoundingClientRect = () =>
      ({ left: 400, width: 200, top: 0, right: 600, bottom: 10, height: 10 }) as DOMRect;

    fireEvent.mouseDown(rail, { clientX: 450 });
    fireEvent.mouseUp(document, { clientX: 450 });

    expect(onChange).toHaveBeenCalledWith(0.25);
  });
});
