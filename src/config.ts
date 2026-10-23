// Module config, read defensively: the editor stores whatever its widgets
// produce, so numbers can arrive as strings and old configs miss new keys.

export type View = 'week' | 'twoWeeks' | 'month';
export type WeekStart = 'sunday' | 'monday' | 'today';
export type Layout = 'auto' | 'columns' | 'rows';

export interface Config {
  view: View;
  weekStart: WeekStart;
  /** Week views only: days side by side, or one day per row. */
  layout: Layout;
  showHeader: boolean;
  showTime: boolean;
  showLocation: boolean;
  /** Lines an event title may wrap to before it is cut. */
  titleLines: number;
  colorBy: 'calendar' | 'person';
  /** Merge near-duplicates (same time, near-same title), not just exact copies. */
  mergeDuplicates: boolean;
  /** An event on more than one person's calendar: both colors, or one color of its own. */
  sharedStyle: 'split' | 'color';
  sharedColor: string;
  /** Draw holidays in `holidayColor` instead of the holiday calendar's color. */
  customHolidayColor: boolean;
  holidayColor: string;
  chipStyle: 'tinted' | 'solid';
  /** Each day's card: its color, how strongly it's laid over the photo
   *  (0-100), frosted-glass blur (px), and border. */
  dayBackground: string;
  dayBackdrop: number;
  dayBlur: number;
  dayBorderWidth: number;
  dayBorderColor: string;
  textOutline: boolean;
  /** Events that have ended: drained of color, faded, left off, or as is. */
  pastStyle: 'gray' | 'fade' | 'hide' | 'none';
  showHolidays: boolean;
  showBirthdays: boolean;
  /** Lowercased words; events whose title contains one are hidden. */
  hideWords: string[];
  /** Multiplies the size worked out from the module's shape. */
  textScale: number;
  accentColor: string;
  timeFormat: 'auto' | '12h' | '24h';
}

export const DEFAULTS: Config = {
  view: 'twoWeeks',
  weekStart: 'sunday',
  layout: 'auto',
  showHeader: true,
  showTime: true,
  showLocation: false,
  titleLines: 2,
  colorBy: 'calendar',
  mergeDuplicates: true,
  sharedStyle: 'split',
  sharedColor: '#a855f7',
  customHolidayColor: false,
  holidayColor: '#ef4444',
  chipStyle: 'tinted',
  dayBackground: '#080a0e',
  dayBackdrop: 70,
  dayBlur: 0,
  dayBorderWidth: 0,
  dayBorderColor: '#64748b',
  textOutline: true,
  pastStyle: 'gray',
  showHolidays: true,
  showBirthdays: true,
  hideWords: [],
  textScale: 1,
  accentColor: '#3b82f6',
  timeFormat: 'auto',
};

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && value !== '' && value !== null ? Math.min(max, Math.max(min, n)) : fallback;
}

const color = (value: unknown, fallback: string): string =>
  (typeof value === 'string' && value.trim() ? value.trim() : fallback);

export function readConfig(raw: Record<string, unknown>): Config {
  const words = typeof raw.hideWords === 'string' ? raw.hideWords : '';
  return {
    view: oneOf(raw.view, ['week', 'twoWeeks', 'month'] as const, DEFAULTS.view),
    weekStart: oneOf(raw.weekStart, ['sunday', 'monday', 'today'] as const, DEFAULTS.weekStart),
    layout: oneOf(raw.layout, ['auto', 'columns', 'rows'] as const, DEFAULTS.layout),
    showHeader: bool(raw.showHeader, DEFAULTS.showHeader),
    showTime: bool(raw.showTime, DEFAULTS.showTime),
    showLocation: bool(raw.showLocation, DEFAULTS.showLocation),
    titleLines: Math.round(num(raw.titleLines, DEFAULTS.titleLines, 1, 4)),
    colorBy: oneOf(raw.colorBy, ['calendar', 'person'] as const, DEFAULTS.colorBy),
    mergeDuplicates: bool(raw.mergeDuplicates, DEFAULTS.mergeDuplicates),
    sharedStyle: oneOf(raw.sharedStyle, ['split', 'color'] as const, DEFAULTS.sharedStyle),
    sharedColor: typeof raw.sharedColor === 'string' && raw.sharedColor ? raw.sharedColor : DEFAULTS.sharedColor,
    customHolidayColor: bool(raw.customHolidayColor, DEFAULTS.customHolidayColor),
    holidayColor: typeof raw.holidayColor === 'string' && raw.holidayColor ? raw.holidayColor : DEFAULTS.holidayColor,
    chipStyle: oneOf(raw.chipStyle, ['tinted', 'solid'] as const, DEFAULTS.chipStyle),
    dayBackground: color(raw.dayBackground, DEFAULTS.dayBackground),
    dayBackdrop: num(raw.dayBackdrop, DEFAULTS.dayBackdrop, 0, 100),
    dayBlur: num(raw.dayBlur, DEFAULTS.dayBlur, 0, 30),
    dayBorderWidth: num(raw.dayBorderWidth, DEFAULTS.dayBorderWidth, 0, 8),
    dayBorderColor: color(raw.dayBorderColor, DEFAULTS.dayBorderColor),
    textOutline: bool(raw.textOutline, DEFAULTS.textOutline),
    // 1.1 and earlier had only an on/off "fade past" toggle; off still means off.
    pastStyle: oneOf(raw.pastStyle, ['gray', 'fade', 'hide', 'none'] as const,
      bool(raw.dimPast, true) ? DEFAULTS.pastStyle : 'none'),
    showHolidays: bool(raw.showHolidays, DEFAULTS.showHolidays),
    showBirthdays: bool(raw.showBirthdays, DEFAULTS.showBirthdays),
    hideWords: words.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean),
    textScale: num(raw.textScale, DEFAULTS.textScale, 0.5, 2),
    accentColor: typeof raw.accentColor === 'string' && raw.accentColor ? raw.accentColor : DEFAULTS.accentColor,
    timeFormat: oneOf(raw.timeFormat, ['auto', '12h', '24h'] as const, DEFAULTS.timeFormat),
  };
}
