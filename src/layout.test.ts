import { describe, expect, it } from 'vitest';
import { readConfig } from './config';
import { planLayout } from './index';

// Module sizes on a 1080p screen, less the frame's padding.
const twoWeeks = readConfig({ view: 'twoWeeks' });
const week = readConfig({ view: 'week' });

describe('planLayout (auto)', () => {
  it('takes columns when rows would hide events for bigger text', () => {
    // The right side of the screen: rows would give ~42px but fit only 2 a day.
    expect(planLayout(twoWeeks, 1256, 1016, 14, 5).kind).toBe('columns');
    expect(planLayout(week, 1256, 1016, 7, 4).kind).toBe('columns');
  });
  it('takes the bigger text when either fits the busiest day', () => {
    expect(planLayout(twoWeeks, 1256, 1016, 14, 1).kind).toBe('rows');
  });
  it('never picks text far smaller than the other layout\'s, even to fit everything', () => {
    // A 580px column: columns would be ~11px.
    expect(planLayout(twoWeeks, 556, 1016, 14, 5).kind).toBe('rows');
  });
  it('follows a forced layout', () => {
    expect(planLayout(readConfig({ layout: 'rows' }), 1256, 1016, 14, 5).kind).toBe('rows');
    expect(planLayout(readConfig({ layout: 'columns' }), 556, 1016, 14, 0).kind).toBe('columns');
  });
});
