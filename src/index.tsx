import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { PluginComponentProps } from './hs-plugin';
import { hostFrameStyle } from './host-style';
import { readConfig } from './config';
import type { Config } from './config';
import { eventsByDay, fetchWindow, viewDays, wallDate, weekday } from './dates';
import type { CalendarEvent, DayEvent } from './dates';
import { chipColors } from './colors';

/** Today, past-day dimming and finished events are re-read this often. */
const CLOCK_TICK_MS = 60_000;
/** How often the module asks the host for events (the host's own calendar poll). */
const FETCH_MS = 5 * 60_000;
/** Below this the text is no longer worth shrinking; cells show "+N more" instead. */
const MIN_FONT_PX = 9;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December'];

// ── Data ────────────────────────────────────────────────────────────────────

/** A household member and the calendars that are theirs (the host's CalendarPerson). */
interface Person { id: string; name: string; color: string; sourceIds: string[] }
interface FamilyMember { id: string; name: string; color: string }

/** Stands in for the host's fetch hook where there is none (tests). */
const noFetch = <T,>(_url: string | null, _ms: number): [T | null, string | null] => [null, null];

/**
 * Events for exactly the days on screen. The host's `events` prop only runs
 * from today forward (Settings > Calendar > days ahead, 7 by default), which
 * would leave this week's earlier days, next week and most of the month
 * blank. So the module asks the host's own `/api/calendar` for its window,
 * through the host's fetch hook, which carries the display's credentials and
 * shares the host's server-side cache. The prop is the fallback until the
 * answer arrives, or if the request fails.
 */
function useEvents(days: string[], fallback: CalendarEvent[] | undefined) {
  const useFetch = window.__HS_SDK__?.useFetchData ?? noFetch;
  const { timeMin, timeMax } = fetchWindow(days);
  const url = `/api/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;
  const [data, error] = useFetch<{ events?: CalendarEvent[]; error?: string }>(url, FETCH_MS);
  const events = Array.isArray(data?.events) ? data.events : Array.isArray(fallback) ? fallback : undefined;
  return { events, error: !events ? (data?.error ?? error ?? null) : null };
}

/** Settings > Family, for everyone's color. The calendar props only list
 *  people who have a calendar linked; colors there can be older. */
function usePeople(calendarPeople: Person[] | undefined): Person[] {
  const useFetch = window.__HS_SDK__?.useFetchData ?? noFetch;
  const [family] = useFetch<{ members?: FamilyMember[] }>('/api/family', 5 * 60_000);
  return useMemo(() => {
    const cal = Array.isArray(calendarPeople) ? calendarPeople : [];
    const members = Array.isArray(family?.members) ? family.members : [];
    return cal.map((p) => ({ ...p, color: members.find((m) => m.id === p.id)?.color || p.color }));
  }, [calendarPeople, family]);
}

function eventColor(ev: CalendarEvent, people: Person[], config: Config): string {
  const person = ev.sourceId ? people.find((p) => p.sourceIds.includes(ev.sourceId!)) : undefined;
  return config.colorBy === 'person'
    ? person?.color || ev.calendarColor || config.accentColor
    : ev.calendarColor || person?.color || config.accentColor;
}

// ── Formatting ──────────────────────────────────────────────────────────────

/** "7p", "7:30p", or "19:30". Short, because every character costs size. */
function timeFormatter(config: Config, hostFormat: '12h' | '24h' | undefined, timezone?: string) {
  const fmt = config.timeFormat === 'auto' ? hostFormat : config.timeFormat;
  let f: Intl.DateTimeFormat;
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', ...(fmt ? { hour12: fmt === '12h' } : {}) };
  try {
    f = new Intl.DateTimeFormat('en-US', { ...opts, timeZone: timezone || undefined });
  } catch {
    f = new Intl.DateTimeFormat('en-US', opts);
  }
  return (ms: number) => {
    const v: Record<string, string> = {};
    for (const p of f.formatToParts(new Date(ms))) v[p.type] = p.value;
    if (!v.dayPeriod) return `${v.hour.padStart(2, '0')}:${v.minute}`;
    return `${v.hour}${v.minute === '00' ? '' : `:${v.minute}`}${v.dayPeriod.charAt(0).toLowerCase()}`;
  };
}

function rangeLabel(days: string[], month?: string): string {
  if (month) {
    const [y, m] = month.split('-').map(Number);
    return `${MONTHS_LONG[m - 1]} ${y}`;
  }
  const [a, b] = [days[0], days[days.length - 1]];
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  if (ay !== by) return `${MONTHS[am - 1]} ${ad}, ${ay} – ${MONTHS[bm - 1]} ${bd}, ${by}`;
  if (am !== bm) return `${MONTHS[am - 1]} ${ad} – ${MONTHS[bm - 1]} ${bd}`;
  return `${MONTHS_LONG[am - 1]} ${ad} – ${bd}`;
}

// ── Layout ──────────────────────────────────────────────────────────────────

type Plan =
  | { kind: 'columns'; font: number }
  | { kind: 'rows'; font: number; split: boolean }
  | { kind: 'month'; font: number };

/**
 * Text size from the space a day gets, so text grows with the module: a
 * calendar filling half the wall is readable from across the room without
 * touching Text size. For the week views it tries days side by side and one
 * day per row (and, for two weeks, the weeks side by side or stacked) and
 * keeps whichever allows the larger text. Columns win ties, since that's
 * the shape people expect a calendar to have.
 */
export function planLayout(config: Config, w: number, h: number, dayCount: number): Plan {
  const avail = h * (config.showHeader ? 0.9 : 1);
  const weeks = dayCount / 7;
  if (config.view === 'month') {
    const cellW = w / 7;
    const cellH = (avail * 0.93) / weeks;
    return { kind: 'month', font: Math.min(cellW / 9, cellH / 3.6) };
  }
  const columns: Plan = { kind: 'columns', font: Math.min(w / 7 / 7.5, avail / weeks / 5.5) };
  const rowsFor = (split: boolean): Plan => {
    const rows = split ? 7 : dayCount;
    const colW = split ? w / 2 : w;
    // A row holds its padding plus one line of events: about 2.7em.
    return { kind: 'rows', split, font: Math.min(avail / rows / 2.7, colW / 15) };
  };
  const rows = weeks > 1 && rowsFor(true).font > rowsFor(false).font ? rowsFor(true) : rowsFor(false);
  if (config.layout === 'columns') return columns;
  if (config.layout === 'rows') return rows;
  // Columns show more events per day, so they're worth some text size.
  return columns.font >= rows.font * 0.75 ? columns : rows;
}

function useBoxSize(ref: React.RefObject<HTMLDivElement | null>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    const ro = new ResizeObserver(read);
    ro.observe(el);
    read();
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// ── Pieces ──────────────────────────────────────────────────────────────────

/** A dark ring and soft glow around light text, so day names and dates
 *  read over a bright photo where the day's backdrop is thin. */
const OUTLINE = '0 0 0.08em rgba(0,0,0,0.95), 0 0 0.08em rgba(0,0,0,0.95), 0 0.04em 0.25em rgba(0,0,0,0.7)';

/** Title lines come from the `--lines` the day's EventStack sets, so a quiet
 *  day can show whole titles and a busy one can cut them short. */
const clampedTitle: CSSProperties = {
  display: '-webkit-box', WebkitLineClamp: 'var(--lines, 2)' as unknown as number, WebkitBoxOrient: 'vertical',
  overflow: 'hidden', overflowWrap: 'break-word',
};

/** Lines a title may use on a day with room to spare. */
const ROOMY_LINES = 6;

interface ChipProps {
  item: DayEvent;
  config: Config;
  color: string;
  time: (ms: number) => string;
  now: number;
  /** Time before the title on one line, instead of above it. */
  inline: boolean;
  /** On a day before today. */
  pastDay: boolean;
}

/** One event. All-day events are filled with their color, timed ones (by
 *  default) a dark chip in their hue with a bar of it, so the two read apart
 *  at a glance. White text on either stays legible over any background. */
function Chip({ item, config, color, time, now, inline, pastDay }: ChipProps) {
  const { event, allDay } = item;
  const colors = chipColors(color);
  const solid = allDay || config.chipStyle === 'solid';
  const ink = solid ? colors.onBase : '#ffffff';
  // Only today's finished events fade here; a past day fades as a whole, and
  // fading both would leave it unreadable.
  const finished = config.dimPast && item.endMs <= now && !pastDay;
  let when = '';
  if (config.showTime && !allDay) {
    if (item.first) when = time(item.startMs);
    else if (item.last) when = `→${time(item.endMs)}`;
  }
  const title = `${event.icon ? `${event.icon} ` : ''}${event.title?.trim() || '(No title)'}`;
  const location = config.showLocation && !inline && event.location ? event.location.split(',')[0].trim() : '';

  return (
    <div style={{
      display: 'flex', minWidth: 0, maxWidth: '100%', flexShrink: 0, borderRadius: '0.3em', overflow: 'hidden',
      background: solid ? colors.base : colors.surface, color: ink, opacity: finished ? 0.55 : 1,
      boxShadow: '0 0.05em 0.2em rgba(0,0,0,0.45)',
    }}>
      {!solid && <div style={{ width: '0.26em', flexShrink: 0, background: colors.base }} />}
      <div style={{ minWidth: 0, padding: '0.14em 0.34em 0.16em', lineHeight: 1.15 }}>
        {when && !inline && (
          <div style={{ fontSize: '0.78em', fontWeight: 800, whiteSpace: 'nowrap', opacity: 0.95 }}>{when}</div>
        )}
        <div style={{ ...clampedTitle, fontWeight: 700 }}>
          {when && inline && <span style={{ fontWeight: 800, opacity: 0.9, marginRight: '0.3em' }}>{when}</span>}
          {title}
        </div>
        {location && (
          <div style={{ fontSize: '0.75em', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.9 }}>
            {location}
          </div>
        )}
      </div>
    </div>
  );
}

/** A busy day's text may shrink this far before events are left off. */
const MIN_STACK_SCALE = 0.72;

/**
 * A day's events, as many as fit, then "+N more". A day with room shows
 * whole titles. A busy one first cuts titles a line at a time down to
 * `lines`, then shrinks its
 * own text a step at a time (never below MIN_STACK_SCALE), then drops one
 * event at a time until the stack fits its cell. Measured before paint, so
 * an overflowing frame never shows. Starts over whenever the events, the
 * text size or the cell's size change.
 */
function EventStack({ items, resetKey, wrap, lines, children }: {
  items: DayEvent[];
  resetKey: string;
  /** Events flow along a row and wrap, instead of stacking. */
  wrap: boolean;
  /** Title lines on a busy day. */
  lines: number;
  children: (item: DayEvent) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const roomy = Math.max(lines, ROOMY_LINES);
  const [fit, setFit] = useState({ key: '', shown: items.length, scale: 1, lines: roomy });
  const [size, setSize] = useState('');
  const key = `${resetKey}|${items.length}|${size}`;
  const shown = fit.key === key ? fit.shown : items.length;
  const scale = fit.key === key ? fit.scale : 1;
  const titleLines = fit.key === key ? fit.lines : roomy;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(`${el.clientWidth}x${el.clientHeight}`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !el.clientHeight) return;
    const over = el.scrollHeight > el.clientHeight + 1;
    const state = { key, shown, scale, lines: titleLines };
    if (over && titleLines > lines) setFit({ ...state, lines: titleLines - 1 });
    else if (over && scale > MIN_STACK_SCALE) setFit({ ...state, scale: Math.max(MIN_STACK_SCALE, scale * 0.9) });
    else if (over && shown > 0) setFit({ ...state, shown: shown - 1 });
    else if (fit.key !== key) setFit(state);
  });

  const hidden = items.length - shown;
  return (
    <div ref={ref} style={{
      ['--lines' as string]: titleLines,
      fontSize: `${scale}em`, flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex',
      flexDirection: wrap ? 'row' : 'column', flexWrap: wrap ? 'wrap' : 'nowrap', alignContent: 'flex-start',
      gap: '0.2em',
    }}>
      {items.slice(0, shown).map((item) => (
        <React.Fragment key={`${item.event.id}|${item.event.start}`}>{children(item)}</React.Fragment>
      ))}
      {hidden > 0 && (
        <div style={{
          fontSize: '0.8em', fontWeight: 800, lineHeight: 1.05, whiteSpace: 'nowrap', padding: '0 0.2em', flexShrink: 0,
          alignSelf: wrap ? 'center' : 'flex-start',
        }}>
          +{hidden} more
        </div>
      )}
    </div>
  );
}

interface DayProps {
  day: string;
  items: DayEvent[];
  today: string;
  config: Config;
  /** Month view: the month on show; days outside it are dimmed. */
  month?: string;
  chip: (item: DayEvent, inline: boolean) => ReactNode;
  resetKey: string;
}

function dayFrame(day: string, today: string, config: Config, faded: boolean): CSSProperties {
  const isToday = day === today;
  const a = config.dayBackdrop / 100;
  return {
    minWidth: 0, minHeight: 0, display: 'flex', borderRadius: '0.4em', padding: '0.25em',
    background: isToday ? `rgba(28, 34, 46, ${Math.max(a, 0.5) + 0.12})` : `rgba(8, 10, 14, ${a})`,
    boxShadow: isToday ? `inset 0 0 0 0.12em ${config.accentColor}` : undefined,
    opacity: faded ? 0.68 : 1,
  };
}

/** The date, in a filled accent disc on today. */
function DateNumber({ day, today, config, size }: { day: string; today: string; config: Config; size: string }) {
  const isToday = day === today;
  const n = Number(day.slice(8));
  const first = n === 1;
  const label = first ? `${MONTHS[Number(day.slice(5, 7)) - 1]} 1` : String(n);
  return (
    <span style={{
      fontSize: size, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap',
      ...(isToday
        ? { background: config.accentColor, color: chipColors(config.accentColor).onBase, borderRadius: '1em', padding: '0.08em 0.32em', minWidth: '1em', textAlign: 'center' }
        : { textShadow: config.textOutline ? OUTLINE : undefined }),
    }}>{label}</span>
  );
}

const weekdayStyle = (config: Config, isToday: boolean): CSSProperties => ({
  fontSize: '0.72em', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1,
  color: isToday ? config.accentColor : undefined, opacity: isToday ? 1 : 0.85,
  textShadow: config.textOutline ? OUTLINE : undefined,
});

/** A day as a column: day name and date on top, events stacked below. */
function ColumnDay({ day, items, today, config, chip, resetKey }: DayProps) {
  const isToday = day === today;
  return (
    <div style={{ ...dayFrame(day, today, config, config.dimPast && day < today), flexDirection: 'column', gap: '0.25em' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35em', padding: '0.05em 0.1em', flexShrink: 0 }}>
        <span style={weekdayStyle(config, isToday)}>{WEEKDAYS[weekday(day)]}</span>
        <DateNumber day={day} today={today} config={config} size="1.15em" />
      </div>
      <EventStack items={items} resetKey={resetKey} lines={config.titleLines} wrap={false}>{(item) => chip(item, false)}</EventStack>
    </div>
  );
}

/** A day as a row: day name and date down the left, events flowing to the right. */
function RowDay({ day, items, today, config, chip, resetKey }: DayProps) {
  const isToday = day === today;
  return (
    <div style={{ ...dayFrame(day, today, config, config.dimPast && day < today), flexDirection: 'row', alignItems: 'stretch', gap: '0.4em' }}>
      <div style={{
        width: '2.6em', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.12em',
      }}>
        <span style={weekdayStyle(config, isToday)}>{WEEKDAYS[weekday(day)]}</span>
        <DateNumber day={day} today={today} config={config} size={Number(day.slice(8)) === 1 ? '0.9em' : '1.2em'} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', padding: '0.1em 0' }}>
        <EventStack items={items} resetKey={resetKey} lines={config.titleLines} wrap>{(item) => chip(item, true)}</EventStack>
      </div>
    </div>
  );
}

/** A month cell: the date in the corner, events below with their time inline. */
function MonthDay({ day, items, today, config, month, chip, resetKey }: DayProps) {
  const outside = month !== undefined && day.slice(0, 7) !== month;
  return (
    <div style={{
      ...dayFrame(day, today, config, outside || (config.dimPast && day < today)),
      flexDirection: 'column', gap: '0.15em', padding: '0.2em',
      ...(outside ? { background: `rgba(8, 10, 14, ${(config.dayBackdrop / 100) * 0.6})` } : {}),
    }}>
      <div style={{ padding: '0.05em 0.1em', flexShrink: 0, display: 'flex' }}>
        <DateNumber day={day} today={today} config={config} size="0.95em" />
      </div>
      <EventStack items={items} resetKey={resetKey} lines={config.titleLines} wrap={false}>{(item) => chip(item, true)}</EventStack>
    </div>
  );
}

// ── Module ──────────────────────────────────────────────────────────────────

export interface WallCalendarProps extends PluginComponentProps {
  /** Preview and tests only: a fixed clock. */
  nowMs?: number;
}

export default function WallCalendar(props: WallCalendarProps) {
  const { style, timezone } = props;
  const config = useMemo(() => readConfig(props.config ?? {}), [props.config]);

  const [tick, setTick] = useState(() => props.nowMs ?? Date.now());
  useEffect(() => {
    if (props.nowMs !== undefined) return;
    const id = setInterval(() => setTick(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, [props.nowMs]);
  const now = props.nowMs ?? tick;
  const today = wallDate(now, timezone);

  const { days, month } = useMemo(() => viewDays(config.view, today, config.weekStart), [config.view, config.weekStart, today]);
  const { events, error } = useEvents(days, props.events as CalendarEvent[] | undefined);
  const people = usePeople(props.people as Person[] | undefined);
  const byDay = useMemo(
    () => eventsByDay(events, days, config, timezone),
    [events, days, config, timezone],
  );
  const time = useMemo(() => timeFormatter(config, props.timeFormat, timezone), [config, props.timeFormat, timezone]);

  const measureRef = useRef<HTMLDivElement>(null);
  const box = useBoxSize(measureRef);
  const pad = Number.isFinite(style.padding) ? style.padding : 0;
  const plan = planLayout(config, Math.max(0, box.w - 2 * pad), Math.max(0, box.h - 2 * pad), days.length);
  const textSize = (style.fontSize || 16) / 16;
  const fontPx = Math.max(MIN_FONT_PX, Math.min(140, plan.font * textSize * config.textScale));
  const resetKey = `${fontPx.toFixed(2)}|${plan.kind}|${config.titleLines}|${config.showTime}|${config.showLocation}`;

  const dayProps = (day: string): DayProps => ({
    day, items: byDay.get(day) ?? [], today, config, month, resetKey,
    chip: (item, inline) => (
      <Chip item={item} config={config} color={eventColor(item.event, people, config)} time={time} now={now} inline={inline}
        pastDay={day < today} />
    ),
  });

  const gap = '0.25em';
  const weeks = days.length / 7;
  let body: ReactNode;
  if (plan.kind === 'month') {
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap, flexShrink: 0 }}>
          {days.slice(0, 7).map((d) => (
            <div key={d} style={{ ...weekdayStyle(config, false), textAlign: 'center', padding: '0.1em 0' }}>{WEEKDAYS[weekday(d)]}</div>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))`, gap }}>
          {days.map((d) => <MonthDay key={d} {...dayProps(d)} />)}
        </div>
      </>
    );
  } else if (plan.kind === 'columns') {
    body = (
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))`, gap }}>
        {days.map((d) => <ColumnDay key={d} {...dayProps(d)} />)}
      </div>
    );
  } else {
    // One day per row; two weeks side by side when that gives larger text.
    const cols = plan.split ? weeks : 1;
    const rows = days.length / cols;
    body = (
      <div style={{
        flex: 1, minHeight: 0, display: 'grid', gap, gridAutoFlow: 'column',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}>
        {days.map((d) => <RowDay key={d} {...dayProps(d)} />)}
      </div>
    );
  }

  const empty = events !== undefined && [...byDay.values()].every((l) => l.length === 0);

  return (
    <div ref={measureRef} style={{ width: '100%', height: '100%' }}>
      <div style={{ ...hostFrameStyle(style), fontSize: fontPx, display: 'flex', flexDirection: 'column', gap: '0.3em' }}>
        {config.showHeader && (
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: '0.6em', flexShrink: 0, lineHeight: 1.1,
            textShadow: config.textOutline ? OUTLINE : undefined,
          }}>
            <span style={{ fontSize: '1.15em', fontWeight: 800, whiteSpace: 'nowrap' }}>{rangeLabel(days, month)}</span>
            {(error || empty) && (
              <span style={{ fontSize: '0.7em', fontWeight: 600, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {error ? `Calendar unavailable: ${error}` : 'Nothing scheduled'}
              </span>
            )}
          </div>
        )}
        {body}
      </div>
    </div>
  );
}
