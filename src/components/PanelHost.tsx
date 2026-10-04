import React, { useEffect, useRef } from 'react';
import {
  PANEL_TITLES,
  PanelId,
  PanelSlot,
  PanelState,
  panelInSlot,
  topmostPanel,
} from '../shell/panels';

const SWIPE_CLOSE_PX = 80;
const WIDE_SLOTS: PanelSlot[] = ['left', 'right', 'center'];

type Placement = PanelSlot | 'sheet';

interface PanelProps {
  id: PanelId;
  placement: Placement;
  onClose: (id: PanelId) => void;
  children: React.ReactNode;
}

/** A titled, scrollable panel frame that takes focus when it opens. */
function Panel({ id, placement, onClose, children }: PanelProps) {
  const ref = useRef<HTMLElement>(null);
  const touchStartY = useRef<number | null>(null);
  const title = PANEL_TITLES[id];

  useEffect(() => {
    if (ref.current) ref.current.focus({ preventScroll: true });
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches && e.touches[0] ? e.touches[0].clientY : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartY.current;
    touchStartY.current = null;
    const end = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : null;
    if (placement === 'sheet' && start !== null && end !== null && end - start > SWIPE_CLOSE_PX) {
      onClose(id);
    }
  };

  return (
    <section
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label={title}
      className={`Panel Panel--${placement}`}
    >
      <header className="Panel-header" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {placement === 'sheet' && <div className="Panel-grabber" aria-hidden="true" />}
        <h2 className="Panel-title">{title}</h2>
        <button className="Panel-close" aria-label={`Close ${title}`} onClick={() => onClose(id)}>
          ✕
        </button>
      </header>
      <div className="Panel-body">{children}</div>
    </section>
  );
}

interface PanelHostProps {
  panels: PanelState;
  compact: boolean;
  onClose: (id: PanelId) => void;
  renderPanel: (id: PanelId) => React.ReactNode;
}

/** Places open panels: left, right and center slots on wide layouts; one bottom sheet on compact layouts. */
export default function PanelHost({ panels, compact, onClose, renderPanel }: PanelHostProps) {
  if (compact) {
    const id = topmostPanel(panels);
    if (!id) return null;
    return (
      <>
        <div className="Panel-backdrop" role="presentation" onClick={() => onClose(id)} />
        <Panel key={id} id={id} placement="sheet" onClose={onClose}>
          {renderPanel(id)}
        </Panel>
      </>
    );
  }
  return (
    <>
      {WIDE_SLOTS.map((slot) => {
        const id = panelInSlot(panels, slot);
        return id ? (
          <Panel key={id} id={id} placement={slot} onClose={onClose}>
            {renderPanel(id)}
          </Panel>
        ) : null;
      })}
    </>
  );
}
