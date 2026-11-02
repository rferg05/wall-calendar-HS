import { describe, expect, it } from 'vitest';
import { teamGame, withTeams } from './teams';

describe('teamGame', () => {
  it('finds Nebraska Volleyball games as huskers.com titles them', () => {
    expect(teamGame('Volleyball -  Nebraska at Oregon')?.title).toBe('at Oregon');
    expect(teamGame('Volleyball -  Nebraska vs. Iowa')?.title).toBe('vs. Iowa');
    expect(teamGame('Volleyball -  Nebraska at Big Ten Tournament')?.title).toBe('at Big Ten Tournament');
    expect(teamGame('Volleyball -  Nebraska vs. Iowa')?.team.id).toBe('nebraska-volleyball');
  });
  it('finds Bulls games, with the result once played', () => {
    expect(teamGame('Bulls vs. Magic')?.title).toBe('vs. Magic');
    expect(teamGame('Bulls at Trail Blazers')?.title).toBe('at Trail Blazers');
    expect(teamGame('Bulls vs. Knicks L: 127-133')?.title).toBe('vs. Knicks · L 127–133');
    expect(teamGame('Bulls at Bucks (Preseason) W: 125-104')?.title).toBe('at Bucks (Preseason) · W 125–104');
    expect(teamGame('Bulls vs. Wizards')?.title).toBe('vs. Wizards');
    expect(teamGame('Bulls vs. Bucks')?.team.id).toBe('bulls');
  });
  it('leaves everything else alone', () => {
    expect(teamGame('Indoor volleyball')).toBeNull();
    expect(teamGame('Cubs watch party')).toBeNull();
    expect(teamGame('Bulls watch party')).toBeNull();
    expect(teamGame(undefined)).toBeNull();
  });
});

describe('withTeams', () => {
  it('adds the logo, and shortens the title only when asked', () => {
    const events: { title: string; teamLogo?: string; teamName?: string }[] = [{ title: 'Bulls vs. Magic' }, { title: 'Book club' }];
    const [game, other] = withTeams(events, true);
    expect(game.title).toBe('vs. Magic');
    expect(game.teamName).toBe('Chicago Bulls');
    expect(game.teamLogo).toBeTruthy();
    expect(other).toBe(events[1]);
    expect(withTeams(events, false)[0].title).toBe('Bulls vs. Magic');
  });
});
