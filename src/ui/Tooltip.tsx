import { css } from '@emotion/css';
import { type ReactNode, useState } from 'react';

const wrapCss = css({ position: 'relative', display: 'inline-flex' });
const tipCss = css({
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  marginBottom: 4,
  padding: '4px 8px',
  background: 'rgba(28,43,52,0.95)',
  color: '#fff',
  fontSize: 12,
  borderRadius: 4,
  whiteSpace: 'nowrap',
  zIndex: 1000,
  pointerEvents: 'none',
});

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

/** 最小 hover 提示（后续如需富交互可替换）。 */
export function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <span className={wrapCss} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && content != null ? <span className={tipCss}>{content}</span> : null}
    </span>
  );
}
