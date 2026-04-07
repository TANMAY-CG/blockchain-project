import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  value: string; // ISO: YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
};

function isoToDate(iso: string) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function dateToIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function DatePicker({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [cursorMonth, setCursorMonth] = useState<Date>(() => isoToDate(value) ?? new Date());
  const [placement, setPlacement] = useState<'below' | 'above'>('below');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => isoToDate(value), [value]);

  useEffect(() => {
    if (selected) setCursorMonth(selected);
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const rect = triggerEl.getBoundingClientRect();
    // If there's not enough room below, render above.
    const spaceBelow = window.innerHeight - rect.bottom;
    setPlacement(spaceBelow < 320 ? 'above' : 'below');
  }, [open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = wrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const monthStart = useMemo(() => {
    const d = new Date(cursorMonth);
    d.setDate(1);
    return d;
  }, [cursorMonth]);

  const grid = useMemo(() => {
    // Monday-start grid
    const startDow = (monthStart.getDay() + 6) % 7; // Mon=0 ... Sun=6
    const first = new Date(monthStart);
    first.setDate(first.getDate() - startDow);

    const cells: { d: Date; inMonth: boolean; key: string }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      const inMonth = d.getMonth() === monthStart.getMonth();
      cells.push({ d, inMonth, key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` });
    }
    return cells;
  }, [monthStart]);

  function monthLabel(d: Date) {
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  function prevMonth() {
    const d = new Date(cursorMonth);
    d.setMonth(d.getMonth() - 1);
    setCursorMonth(d);
  }

  function nextMonth() {
    const d = new Date(cursorMonth);
    d.setMonth(d.getMonth() + 1);
    setCursorMonth(d);
  }

  const selectedIso = selected ? dateToIso(selected) : '';

  return (
    <div className="date-picker-wrap" ref={wrapRef}>
      <div className="date-picker-trigger" ref={triggerRef}>
      <input
        className="input date-picker-input"
        type="text"
        readOnly
        value={value || ''}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="date-picker-trigger-btn"
        aria-label="Open calendar"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M8 2v3M16 2v3M3.5 9h17"
            stroke="#111"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M6.5 5h11A3 3 0 0 1 20.5 8v11A3 3 0 0 1 17.5 22h-11A3 3 0 0 1 3.5 19V8A3 3 0 0 1 6.5 5Z"
            stroke="#111"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 13h3M7.5 16h3M12.5 13h3M12.5 16h3"
            stroke="#111"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      </div>

      {open ? (
        <div
          className={`date-picker-popover ${
            placement === 'above' ? 'date-picker-popover--above' : ''
          }`}
          role="dialog"
          aria-label="Choose date"
        >
          <div className="date-picker-header">
            <button type="button" className="date-nav" onClick={prevMonth} aria-label="Previous month">
              ‹
            </button>
            <div className="date-month">{monthLabel(cursorMonth)}</div>
            <button type="button" className="date-nav" onClick={nextMonth} aria-label="Next month">
              ›
            </button>
          </div>

          <div className="date-weekdays">
            {weekDays.map((w) => (
              <div key={w} className="date-weekday">
                {w}
              </div>
            ))}
          </div>

          <div className="date-grid">
            {grid.map(({ d, inMonth, key }) => {
              const iso = dateToIso(d);
              const isSelected = selectedIso === iso;
              const isToday = iso === dateToIso(new Date());
              return (
                <button
                  key={key}
                  type="button"
                  className={`date-cell ${inMonth ? '' : 'date-cell--out'} ${isSelected ? 'date-cell--selected' : ''} ${isToday ? 'date-cell--today' : ''}`}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

