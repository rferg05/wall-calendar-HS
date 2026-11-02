// Favorite teams' games, marked with the team's logo.
//
// The schedules come in as ordinary calendar subscriptions (Settings >
// Calendar, see the README for the feed addresses), so a game is recognized
// by its title, whichever calendar it arrives on: "Volleyball -  Nebraska at
// Oregon" from huskers.com, "Bulls vs. Knicks L: 127-133" from the Bulls.
// With the logo there to say whose game it is, the title can drop the team
// and keep the opponent: "at Oregon", "vs. Knicks · L 127–133".

import nebraskaVolleyball from './logos/nebraska-volleyball.png';
import bulls from './logos/bulls.png';

export interface Team {
  id: string;
  name: string;
  logo: string;
  /** The opponent part of a game's title ("vs. Iowa"), or null if the title isn't this team's game. */
  game: (title: string) => string | null;
}

/** "vs Iowa" / "vs. Iowa" / "at Iowa", tidied to "vs. Iowa" / "at Iowa". */
const versus = (where: string, rest: string) => `${/^at$/i.test(where) ? 'at' : 'vs.'} ${rest.trim()}`;

export const TEAMS: Team[] = [
  {
    id: 'nebraska-volleyball',
    name: 'Nebraska Volleyball',
    logo: nebraskaVolleyball,
    game: (title) => {
      const m = /^\s*(?:women'?s\s+)?volleyball\s*[-–—:]\s*nebraska\s+(vs\.?|at)\s+(.+)$/i.exec(title);
      return m ? versus(m[1], m[2]) : null;
    },
  },
  {
    id: 'bulls',
    name: 'Chicago Bulls',
    logo: bulls,
    game: (title) => {
      const m = /^\s*(?:chicago\s+)?bulls\s+(vs\.?|at|@)\s+(.+?)\s*(?:\b([WL])\s*:?\s*(\d+)\s*-\s*(\d+))?\s*$/i.exec(title);
      if (!m) return null;
      const opponent = versus(m[1] === '@' ? 'at' : m[1], m[2]);
      return m[3] ? `${opponent} · ${m[3].toUpperCase()} ${m[4]}–${m[5]}` : opponent;
    },
  },
];

/** The team whose game this is, and the title to show with its logo. */
export function teamGame(title: string | undefined): { team: Team; title: string } | null {
  for (const team of TEAMS) {
    const opponent = team.game(title ?? '');
    if (opponent) return { team, title: opponent };
  }
  return null;
}

/** Mark each team game with its logo (`teamLogo`) and, with `shorten`, the short title. */
export function withTeams<E extends { title: string; teamLogo?: string; teamName?: string }>(events: E[], shorten: boolean): E[] {
  return events.map((ev) => {
    const game = teamGame(ev.title);
    if (!game) return ev;
    return { ...ev, teamLogo: game.team.logo, teamName: game.team.name, title: shorten ? game.title : ev.title };
  });
}
