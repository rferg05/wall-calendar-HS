import { describe, expect, it } from 'vitest';
import { DEFAULTS, readConfig } from './config';
import { eventsByDay, eventSpan, fetchWindow, viewDays, wallDate } from './dates';
import type { CalendarEvent } from './dates';

const ev = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'x', title: 'Thing', start: '2026-10-22T19:00:00-05:00', end: '2026-10-22T20:00:00-05:00', allDay: false, ...over,
});

describe('viewDays', () => {
  it('this week from Sunday', () => {
    const { days } = viewDays('week', '2026-10-22', 'sunday');
    expect(days[0]).toBe('2026-10-18');
    expect(days).toHaveLength(7);
  });
  it('this week and next from Monday', () => {
    const { days } = viewDays('twoWeeks', '2026-10-22', 'monday');
    expect(days[0]).toBe('2026-10-19');
    expect(days[13]).toBe('2026-11-01');
  });
  it('rolling from today', () => {
    expect(viewDays('week', '2026-10-22', 'today').days[0]).toBe('2026-10-22');
  });
  it('a month grid of whole weeks around the month', () => {
    const { days, month } = viewDays('month', '2026-10-22', 'sunday');
    expect(month).toBe('2026-10');
    expect(days[0]).toBe('2026-09-27');
    expect(days[days.length - 1]).toBe('2026-10-31');
    expect(days.length % 7).toBe(0);
  });
  it('february, and a month ending on the last day of the week', () => {
    const { days } = viewDays('month', '2026-02-10', 'sunday');
    expect(days[0]).toBe('2026-02-01');
    expect(days).toHaveLength(28);
  });
});

describe('fetchWindow', () => {
  it('pads a day each side on whole UTC days', () => {
    expect(fetchWindow(['2026-10-18', '2026-10-24'])).toEqual({
      timeMin: '2026-10-17T00:00:00.000Z', timeMax: '2026-10-26T00:00:00.000Z',
    });
  });
});

describe('days on the household clock', () => {
  it('an evening event stays on its day on a UTC Pi', () => {
    // 7pm Chicago is past midnight UTC.
    expect(wallDate(Date.parse('2026-10-22T19:30:00-05:00'), 'America/Chicago')).toBe('2026-10-22');
  });
  it('all-day ends are exclusive', () => {
    expect(eventSpan(ev({ start: '2026-10-31', end: '2026-11-01', allDay: true }))).toEqual({ from: '2026-10-31', to: '2026-10-31' });
    expect(eventSpan(ev({ start: '2026-11-01', end: '2026-11-04', allDay: true }))).toEqual({ from: '2026-11-01', to: '2026-11-03' });
  });
  it('a timed event ending at midnight stays on one day', () => {
    expect(eventSpan(ev({ start: '2026-10-22T20:00:00-05:00', end: '2026-10-23T00:00:00-05:00' }), 'America/Chicago'))
      .toEqual({ from: '2026-10-22', to: '2026-10-22' });
  });
});

describe('eventsByDay', () => {
  const days = viewDays('week', '2026-10-22', 'sunday').days;
  it('sorts all-day first, then by time', () => {
    const map = eventsByDay([
      ev({ id: '1', title: 'Late', start: '2026-10-22T21:00:00-05:00', end: '2026-10-22T22:00:00-05:00' }),
      ev({ id: '2', title: 'Early', start: '2026-10-22T08:00:00-05:00', end: '2026-10-22T09:00:00-05:00' }),
      ev({ id: '3', title: 'Holiday', start: '2026-10-22', end: '2026-10-23', allDay: true }),
    ], days, DEFAULTS, 'America/Chicago');
    expect(map.get('2026-10-22')!.map((d) => d.event.title)).toEqual(['Holiday', 'Early', 'Late']);
  });
  it('spreads a multi-day event and marks its ends', () => {
    const map = eventsByDay([ev({ start: '2026-10-23', end: '2026-10-26', allDay: true })], days, DEFAULTS);
    expect(map.get('2026-10-23')![0]).toMatchObject({ first: true, last: false });
    expect(map.get('2026-10-24')![0]).toMatchObject({ first: false, last: false });
    expect(map.get('2026-10-22')).toHaveLength(0);
  });
  it('hides by title word and kind', () => {
    const config = readConfig({ hideWords: 'busy, Tentative', showHolidays: false });
    const map = eventsByDay([
      ev({ id: '1', title: 'Busy' }),
      ev({ id: '2', title: 'Tentative: lunch' }),
      ev({ id: '3', title: 'Columbus Day', kind: 'holiday' }),
      ev({ id: '4', title: 'Dinner' }),
    ], days, config, 'America/Chicago');
    expect(map.get('2026-10-22')!.map((d) => d.event.title)).toEqual(['Dinner']);
  });
});

describe('readConfig', () => {
  it('fills gaps and clamps', () => {
    const c = readConfig({ view: 'month', titleLines: '9', dayBackdrop: 'x', layout: 'sideways' });
    expect(c.view).toBe('month');
    expect(c.titleLines).toBe(4);
    expect(c.dayBackdrop).toBe(DEFAULTS.dayBackdrop);
    expect(c.layout).toBe('auto');
  });
  it('carries the old fade-past toggle over to Past events', () => {
    expect(readConfig({}).pastStyle).toBe('gray');
    expect(readConfig({ dimPast: true }).pastStyle).toBe('gray');
    expect(readConfig({ dimPast: false }).pastStyle).toBe('none');
    expect(readConfig({ dimPast: false, pastStyle: 'hide' }).pastStyle).toBe('hide');
  });
});
