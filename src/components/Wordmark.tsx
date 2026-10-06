import React from 'react';

/**
 * The HOMSKILLET logo seen through a CRT: color-split copies of the word plus rolling scanlines.
 * Sized in em, so it scales with the font-size of whatever contains it.
 */
export default function Wordmark() {
  return (
    <span className="Wordmark">
      <span className="Wordmark-word" data-text="HOMSKILLET">
        HOMSKILLET
      </span>
      <span className="Wordmark-lines" aria-hidden="true" />
    </span>
  );
}
