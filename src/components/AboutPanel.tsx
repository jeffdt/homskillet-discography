import React from 'react';

const REPO_URL = 'https://github.com/jeffdt/homskillet-discography';

/** Credits and the owner's note; replaces the old footer and about modal. */
export default function AboutPanel({ about }: { about: string | null }) {
  return (
    <div className="AboutPanel">
      {about && <p className="AboutPanel-intro">{about}</p>}
      <ul className="AboutPanel-credits">
        <li>
          Based on{' '}
          <a href="https://chiptune.app/" target="_blank" rel="noopener noreferrer">
            chiptune.app
          </a>{' '}
          by Matt Montag
        </li>
        <li>
          Logo font: Nixdorf 8810 M15 by{' '}
          <a
            href="https://int10h.org/oldschool-pc-fonts/"
            target="_blank"
            rel="noopener noreferrer"
          >
            VileR
          </a>{' '}
          (CC BY-SA 4.0)
        </li>
        <li>Text font: Space Grotesk by Florian Karsten (SIL Open Font License 1.1)</li>
        <li>Label font: Silkscreen by Jason Kottke (SIL Open Font License 1.1)</li>
      </ul>
      <a className="AboutPanel-source" href={REPO_URL} target="_blank" rel="noopener noreferrer">
        View source on GitHub
      </a>
    </div>
  );
}
