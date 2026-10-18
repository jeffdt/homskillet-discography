import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Album, Catalog } from '../catalog/catalog';
import { searchTracks } from '../catalog/search';
import { useDialogKeys } from './dialogFocus';
import '../styles/download.css';
import '../styles/search.css';

interface QuickSearchProps {
  catalog: Catalog;
  playingTrackId: string | null;
  /** The query to start from; it opens selected so typing replaces it. */
  initialQuery: string;
  onQueryChange: (query: string) => void;
  onPlayTrack: (album: Album, index: number) => void;
  onClose: () => void;
}

/** Type a few words, Enter plays the best match within its album. Arrow keys pick another. */
export default function QuickSearch({
  catalog,
  playingTrackId,
  initialQuery,
  onQueryChange,
  onPlayTrack,
  onClose,
}: QuickSearchProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(0);
  const results = useMemo(() => searchTracks(catalog, query), [catalog, query]);

  useDialogKeys(dialogRef, onClose);
  // Focus during commit so keys typed right after opening land in the box, not on the page.
  useLayoutEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  /** Plays one result and closes. */
  const play = (i: number) => {
    const result = results[i];
    if (!result) return;
    onPlayTrack(result.album, result.index);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setSelected((s) => (s + step + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      play(selected);
    }
  };

  const optionId = (i: number) => `QuickSearch-option-${i}`;
  const hasQuery = query.trim() !== '';

  return (
    <div
      className="DownloadDialog-backdrop QuickSearch-backdrop"
      data-modal-layer
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="DownloadDialog QuickSearch"
        role="dialog"
        aria-modal="true"
        aria-label="Search tracks"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="QuickSearch-input"
          type="search"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="QuickSearch-results"
          aria-activedescendant={results.length > 0 ? optionId(selected) : undefined}
          aria-label="Track or album"
          placeholder="Track or album…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
            onQueryChange(e.target.value);
          }}
          onKeyDown={onKeyDown}
        />
        {results.length > 0 ? (
          <ul id="QuickSearch-results" className="QuickSearch-results" role="listbox">
            {results.map((r, i) => (
              <li
                key={r.track.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === selected}
                aria-current={r.track.id === playingTrackId ? 'true' : undefined}
                className="QuickSearch-option"
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => setSelected(i)}
                onClick={() => play(i)}
              >
                <span className="QuickSearch-title">{r.track.title}</span>
                <span className="QuickSearch-album">{r.album.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="QuickSearch-hint">
            {hasQuery ? 'No matches' : 'A few letters of a title or album, then Enter'}
          </p>
        )}
      </div>
    </div>
  );
}
