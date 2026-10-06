import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutPanel from '../components/AboutPanel';

describe('AboutPanel', () => {
  it('lists credits and the source link', () => {
    render(<AboutPanel about={null} />);
    expect(screen.getByRole('link', { name: 'chiptune.app' }).getAttribute('href')).toBe(
      'https://chiptune.app/'
    );
    expect(screen.getByRole('link', { name: /source on github/i }).getAttribute('href')).toBe(
      'https://github.com/jeffdt/homskillet-discography'
    );
    expect(screen.getByText(/CC BY-SA 4.0/)).toBeTruthy();
    expect(screen.getByText(/Space Grotesk/)).toBeTruthy();
    expect(document.querySelector('.AboutPanel-intro')).toBeNull();
  });

  it('shows the owner-written about text when present', () => {
    render(<AboutPanel about="I write NES music." />);
    expect(screen.getByText('I write NES music.')).toBeTruthy();
  });
});
