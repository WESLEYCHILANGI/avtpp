import { useState, useRef, useEffect } from 'react';

/**
 * Kebab (3-dot) action menu. Pass `items`: [{ label, onClick, danger?, disabled? }].
 * The dropdown is rendered with fixed positioning so it is never clipped by a
 * scrollable table container.
 */
export default function ActionMenu({ items = [], label = 'Actions' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const ref = useRef(null);
  const triggerRef = useRef(null);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div className="action-menu" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        className="action-menu-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {open && (
        <div className="action-menu-dropdown" role="menu" style={{ top: `${pos.top}px`, right: `${pos.right}px` }}>
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={`action-menu-item ${it.danger ? 'danger' : ''}`}
              disabled={it.disabled}
              onClick={() => { setOpen(false); it.onClick && it.onClick(); }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
