// Themed replacements for the browser's <select>, <input type="date"> and checkbox.
// Select and DateInput take the same value / onChange(e.target.value) shape as the
// native elements, so forms can switch over without changing their handlers.
import {
  Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type KeyboardEvent, type ReactElement, type ReactNode, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { fmtDate, fromISO, toISO, todayISO } from '../lib/logic';

type ChangeEvent = { target: { value: string } };
const change = (value: string): ChangeEvent => ({ target: { value } });

/* ---------- Popover: portal + fixed position, so modals and cards never clip it ---------- */

function usePopover(anchor: RefObject<HTMLElement>, open: boolean, onClose: () => void, minWidth = 0) {
  const pop = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', top: -9999, left: -9999 });

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const p = pop.current?.getBoundingClientRect();
      if (!a) return;
      const h = p?.height ?? 0;
      const w = Math.max(a.width, minWidth, p?.width ?? 0);
      const below = window.innerHeight - a.bottom;
      const top = below < h + 12 && a.top > h + 12 ? a.top - h - 6 : a.bottom + 6;
      const left = Math.min(Math.max(8, a.left), window.innerWidth - w - 8);
      setStyle({ position: 'fixed', top, left, minWidth: Math.max(a.width, minWidth), zIndex: 80 });
    };
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, anchor, minWidth]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !anchor.current?.contains(t)) onClose();
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [open, anchor, onClose]);

  return { pop, style };
}

/* ---------- Select ---------- */

type Opt = { value: string; label: ReactNode };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

function readOptions(children: ReactNode): Opt[] {
  const out: Opt[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ value?: string | number; children?: ReactNode }>;
    if (el.type === Fragment) { out.push(...readOptions(el.props.children)); return; }
    if (el.type === 'option') out.push({ value: String(el.props.value ?? textOf(el.props.children)), label: el.props.children });
  });
  return out;
}

export function Select({
  value, onChange, children, className = 'input', disabled, ...rest
}: {
  value: string | number; onChange: (e: ChangeEvent) => void; children: ReactNode; className?: string; disabled?: boolean;
  'aria-label'?: string; id?: string;
}) {
  const options = readOptions(children);
  const current = String(value);
  const selected = options.find((o) => o.value === current);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const uid = useId();
  const close = () => setOpen(false);
  const { pop, style } = usePopover(btn, open, close);

  const openList = () => {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  };
  const choose = (o: Opt) => { if (o.value !== current) onChange(change(o.value)); close(); btn.current?.focus(); };

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function onKey(e: KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (options[active]) choose(options[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') close();
    else if (e.key.length === 1) {
      const i = options.findIndex((o) => textOf(o.label).toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  }

  return (
    <>
      <button ref={btn} type="button" id={rest.id} disabled={disabled} aria-label={rest['aria-label']}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? uid : undefined}
        aria-activedescendant={open ? `${uid}-${active}` : undefined}
        onClick={() => (open ? close() : openList())} onKeyDown={onKey}
        className={`${className} inline-flex items-center justify-between gap-2 text-left cursor-pointer ${open ? 'border-teal ring-4 ring-teal/10' : ''}`}>
        <span className="truncate">{selected?.label ?? <span className="muted">Choose…</span>}</span>
        <ChevronDown size={15} className={`shrink-0 opacity-60 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div ref={pop} style={style} className="pop">
          <ul ref={list} id={uid} role="listbox" className="max-h-72 overflow-y-auto py-0.5">
            {options.map((o, i) => {
              const sel = o.value === current;
              return (
                <li key={o.value + i} id={`${uid}-${i}`} data-i={i} role="option" aria-selected={sel}
                  onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(o)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm cursor-pointer whitespace-nowrap ${i === active ? 'bg-beige' : ''} ${sel ? 'font-semibold text-teal' : 'text-ink'}`}>
                  <span className="w-4 shrink-0">{sel && <Check size={14} strokeWidth={3} />}</span>
                  {o.label}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ---------- DateInput ---------- */

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function DateInput({
  value, onChange, className = 'input', placeholder = 'Pick a date', ...rest
}: { value: string; onChange: (e: ChangeEvent) => void; className?: string; placeholder?: string; 'aria-label'?: string; id?: string }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);
  const { pop, style } = usePopover(btn, open, close, 292);
  const base = value || todayISO();
  const [month, setMonth] = useState(() => fromISO(base));
  const [focus, setFocus] = useState(base);

  useEffect(() => {
    if (open) { const b = value || todayISO(); setMonth(fromISO(b)); setFocus(b); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) pop.current?.querySelector<HTMLElement>(`[data-day="${focus}"]`)?.focus();
  }, [open, focus, month, pop]);

  const pick = (iso: string) => { onChange(change(iso)); close(); btn.current?.focus(); };
  const y = month.getFullYear();
  const m = month.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => toISO(new Date(y, m, i + 1)))];
  const today = todayISO();

  function moveFocus(delta: number) {
    const d = fromISO(focus);
    d.setDate(d.getDate() + delta);
    const iso = toISO(d);
    setFocus(iso);
    if (d.getMonth() !== m || d.getFullYear() !== y) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  function onGridKey(e: KeyboardEvent) {
    const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in map) { e.preventDefault(); moveFocus(map[e.key]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); btn.current?.focus(); }
  }

  return (
    <>
      <button ref={btn} type="button" id={rest.id} aria-label={rest['aria-label']} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`${className} inline-flex items-center justify-between gap-2 text-left cursor-pointer ${open ? 'border-teal ring-4 ring-teal/10' : ''}`}>
        <span className={value ? '' : 'muted'}>{value ? fmtDate(value, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : placeholder}</span>
        <CalendarDays size={15} className="shrink-0 text-teal" />
      </button>
      {open && createPortal(
        <div ref={pop} style={style} className="pop !p-3 w-[292px]" role="dialog" aria-label="Choose a date" onKeyDown={onGridKey}>
          <div className="flex items-center justify-between mb-2">
            <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => setMonth(new Date(y, m - 1, 1))}><ChevronLeft size={16} /></button>
            <div className="font-serif text-[15px]">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
            <button type="button" className="icon-btn" aria-label="Next month" onClick={() => setMonth(new Date(y, m + 1, 1))}><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((d) => <div key={d} className="text-[10px] font-bold tracking-wider muted py-1">{d}</div>)}
            {cells.map((iso, i) => iso ? (
              <button key={iso} type="button" data-day={iso} tabIndex={iso === focus ? 0 : -1} onClick={() => pick(iso)}
                aria-label={fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} aria-pressed={iso === value}
                className={`h-9 rounded-xl text-sm cursor-pointer transition outline-none focus-visible:ring-2 focus-visible:ring-teal
                  ${iso === value ? 'bg-teal text-white font-semibold' : iso === today ? 'ring-1 ring-gold text-gold font-semibold hover:bg-beige' : 'hover:bg-beige text-ink'}`}>
                {Number(iso.slice(8))}
              </button>
            ) : <span key={`e${i}`} />)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-line">
            <button type="button" className="link !text-xs" onClick={() => pick(today)}>Today</button>
            {value && <button type="button" className="text-xs muted hover:text-danger cursor-pointer" onClick={() => pick('')}>Clear</button>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ---------- Checkbox ---------- */

export function Checkbox({ checked, onChange, label, size = 20, ...rest }: {
  checked: boolean; onChange: (checked: boolean) => void; label?: ReactNode; size?: number; 'aria-label'?: string;
}) {
  const box = (
    <span aria-hidden="true" style={{ width: size, height: size }}
      className={`shrink-0 grid place-items-center rounded-[7px] border-2 transition ${checked ? 'bg-sage border-sage text-white scale-100' : 'border-ink/25 bg-field group-hover:border-teal'}`}>
      <Check size={size * 0.62} strokeWidth={3.2} className={`transition ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
    </span>
  );
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={rest['aria-label']} onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2.5 text-sm cursor-pointer text-left outline-none focus-visible:[&>span]:ring-4 focus-visible:[&>span]:ring-teal/20">
      {box}{label}
    </button>
  );
}
