import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

function Tooltip({ children, content, side = 'right' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (!triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        let top = 0;
        let left = 0;

        switch (side) {
          case 'top':
            top = triggerRect.top - tooltipRect.height - 8;
            left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
            break;
          case 'bottom':
            top = triggerRect.bottom + 8;
            left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
            break;
          case 'left':
            top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
            left = triggerRect.left - tooltipRect.width - 8;
            break;
          case 'right':
            top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
            left = triggerRect.right + 8;
            break;
        }

        // Keep tooltip within viewport bounds
        const padding = 16;
        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

        setPosition({ top, left });
      });
    } else {
      setPosition(null);
    }
  }, [isVisible, side]);

  // Randomize the glitch slice positions every time it opens
  const [glitchVars, setGlitchVars] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isVisible) {
      setGlitchVars({
        '--g1': `${Math.floor(Math.random() * 60) + 20}%`, // Avoid very top/bottom
        '--g2': `${Math.floor(Math.random() * 60) + 20}%`,
        '--flicker-dur': `${Math.random() * 4 + 3}s`, // 3s to 7s
        '--flicker-del': `${Math.random()}s`,
        '--glitch-dur': `${Math.random() * 1.5 + 1}s`, // 1s to 2.5s (very fast/snappy)
      } as React.CSSProperties);
    }
  }, [isVisible]);

  return (
    <>
      <span
        ref={triggerRef}
        className="Tooltip-trigger"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </span>
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`Tooltip Tooltip-${side}`}
          style={{
            top: position ? `${position.top}px` : '0px',
            left: position ? `${position.left}px` : '0px',
            opacity: position ? 1 : 0,
          }}
        >
          <div className="Tooltip-wrapper" style={glitchVars}>
            <div className="Tooltip-box" style={glitchVars}>
              <div style={{ paddingLeft: '16px' }}>{content}</div>
            </div>
            <div className="Tooltip-glitch" aria-hidden="true" style={glitchVars}>
              <div style={{ paddingLeft: '16px' }}>{content}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Tooltip;
