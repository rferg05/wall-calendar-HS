# Wall Calendar

Home Screens module: **this week**, **this week and next**, or **this month**, with every event's title readable from across the room over whatever photo is behind it.

## What it shows

- **Views:** *This week*, *This week and next* (the default), or *This month*. Weeks start on Sunday, Monday, or today (a rolling 7 or 14 days).
- **Layout:** the week views have two layouts. *Days side by side* is the usual calendar: 7 columns, with two rows for two weeks. *One day per row* puts each day's events on one line, and two weeks go side by side. Auto estimates, for the module's size, how large the text can be in each and how many events a day each can hold, then picks the larger text among the layouts that hold the busiest day on screen. Big type never comes at the cost of hiding events, unless the other layout's text would be under 45% as large (days side by side in a narrow column), which is unreadable anyway. *Week layout* in the settings can force one.
- **Events:** a chip for each event, with its start time and title. Timed events are dark chips in the event's own hue with a bar of its color. All-day events are filled with their color, so the two read apart at a glance. Text on them is white, or near-black on light colors like yellow. A multi-day event repeats on each day, with "→10a" on its last day when it ends partway through.
- **Busy days:** a day with room shows whole titles. A busy day cuts titles a line at a time down to *Lines per event title*, then shrinks its own text to as little as 72%, and only then leaves events off with "+2 more".
- **Today:** a ring in the *Today color*, and the date on a disc of it.
- **Past events:** an event that has ended, today or earlier, turns into a flat gray chip with light gray text, keeping a dimmed bar of its color so whose it was still shows. Upcoming events stay in full color, so the eye goes straight to them. Earlier days' names and dates fade too. *Past events* can instead fade them, hide them, or leave them as they are.
- **Colors:** by calendar color (the default), or by person, using each member's color from Settings > Family for the calendars linked to them.
- **Duplicates:** with several calendars linked, the same event turns up more than once: an invite on two people's calendars, or a booking that both the restaurant site and Gmail added ("Reservation at Avec" and "Reservation: Avec"). Copies are merged into one when they start within 15 minutes of each other and nearly all the words of the shorter title are in the longer one, ignoring punctuation and words like "at", "with" and "the". So "Soccer practice" and "Soccer game" stay apart. The merged event shows the fuller title, the latest end, and any location either copy had.
- **The ~ marker:** an Outlook event marked personal for the [calendar filter](../../../Calendar%20Filter/README.md) ends in `~`. The filter removes it from its own feed, but the same event reaches other calendars (an invite, a shared calendar) with the `~` still on. The module drops a `~` at either end of every title.
- **Events you share:** an event on more than one person's calendar is drawn as both of yours. With *Both colors* (the default), one person's color runs down the chip's left edge and the other's down its right, over a surface blending one tint into the other. A filled chip runs from one color to the other. Only shared events have a bar on the right, so they stand out from across the room. *One color of their own* draws them all in a single color instead (purple by default).
  People are told apart by Settings > Family, with each person's calendars linked to them. Two calendars linked to the same person count as one: a duplicate across them is merged but isn't marked shared. A calendar linked to no one counts as its own person.

## Legibility

The built-in calendar draws small light text straight onto the module, which disappears over bright or busy photos, and cuts titles at 10 characters. This module:

- **Sizes text from the module**, not a fixed size: the text grows with the space each day gets, as the CTA and Travel Times modules do. *Text size* in the settings, and the Style panel's Text size, adjust it from there.
- **Puts a dark panel behind every day** (*Day darkness*, 70% by default), so the photo behind can't wash out dates and titles. Raise it if a background still makes it hard to read.
- **Gives each event its own solid chip**, with bold text at full contrast whatever the day panel or photo.
- **Outlines day names and dates** with a fine dark ring, for the parts that sit on the day panel rather than a chip.

Measured in the preview at default settings on a 1080p screen, with the preview's sample events (up to 5 on the busiest day). Busy days' text goes down to about 72% of these.

| Module size | This week | This week and next |
|---|---|---|
| Right of a 580px column, 1280×1040 | days side by side, 24 px, all events | days side by side, 24 px, all events |
| Portrait column, 580×1040 | one day per row, 37 px, 3 hidden | one day per row, 24 px, 5 hidden |
| Landscape strip, 1280×520 | days side by side, 24 px, all events | days side by side, 24 px, 4 hidden |
| Wide strip, 1880×420 | one day per row, 19 px, all events | one day per row, 19 px, all events |

A landscape module, near square or wider, works best: seven days side by side reads like a paper calendar and gives titles room to wrap. A tall, narrow module has to go one day per row, where long titles and busy days run out of width. For reading across a room, give it at least a third of the screen.

## Where the events come from

The host only hands plugins events from today forward (Settings > Calendar > days ahead, 7 by default), which would leave the earlier days of this week, next week and most of the month empty. So the module asks the host's own `/api/calendar` for exactly the days it draws, through the host's fetch hook. That uses the same calendars, the same server-side cache and the same 5-minute refresh as the built-in calendar, with no extra setup or API keys. Until the first answer arrives, it shows the host's own events.

Holidays, birthdays, and events whose title contains a word from *Hide events whose title contains* can be left out.

## Install

In the Home Screens editor, open the Plugin Store, choose **Install from URL**, and paste:

```
https://github.com/rferg05/wall-calendar-HS/releases/latest/download/wall-calendar.tar.gz
```

This always points at the newest release. Home Screens doesn't check URL-installed plugins for updates on its own, so to update: Plugin Store > **Installed**, then the download icon on Wall Calendar, then **Install**. Then add **Wall Calendar** to a screen from the Calendar category.

## Settings

| Setting | Default | |
|---|---|---|
| Show | This week and next | This week, this week and next, or this month. |
| Weeks start on | Sunday | Sunday, Monday, or today (week views only; the month uses Sunday then). |
| Week layout | Auto | Auto, days side by side, or one day per row. |
| Month / dates heading | on | "October 18 – 31", "October 2026". |
| Start times / Location | on / off | Location shows with days side by side: the part before the first comma. |
| Lines per event title | 2 | How short a busy day may cut titles. |
| Color events by | Calendar color | Or person, from Settings > Family. |
| Merge duplicate events | on | Near-duplicates as above. Off merges only exact copies. |
| Events you share | Both colors | Or one color of their own. |
| Shared event color | purple | With *One color of their own*. |
| Event style | Dark with a color bar | Or filled with the color. All-day events are always filled. |
| Past events | Gray out | Or fade, hide, or leave as is. |
| Holidays / Birthdays | on | |
| Own color for holidays / Holiday color | off / red | Holidays in a color you pick, instead of the holiday calendar's. |
| Hide events whose title contains | | Comma-separated. |
| Text size | 1× | 0.5–2×, on top of the size from the module's shape. |
| Day darkness | 70% | The panel behind each day. |
| Outline day names and dates | on | |
| Today color | blue | |
| Clock times | Household setting | Or 12-hour (7p, 7:30p) or 24-hour. |

## Development

```bash
npm install
npm test             # days on screen, event days across time zones, filters, merging
npm run preview      # module against a mock calendar at http://localhost:5177
npm run build        # dist/bundle.js
```

The preview takes `?w=&h=` for the module size, `fs=` for text size, `bg=bright|busy|dark` for the background, `tz=`, and any config key (`view=month`, `layout=columns`).

Release tarball:

```bash
mkdir -p release/pkg/wall-calendar/dist
cp manifest.json release/pkg/wall-calendar/
cp dist/bundle.js dist/bundle.js.map release/pkg/wall-calendar/dist/
tar -czf release/wall-calendar-<version>.tar.gz -C release/pkg wall-calendar
```

Attach it to a GitHub release tagged `v<version>`, along with a copy named `wall-calendar.tar.gz` so the `latest/download` URL above keeps working:

```bash
cp release/wall-calendar-<version>.tar.gz release/wall-calendar.tar.gz
gh release create v<version> release/wall-calendar-<version>.tar.gz release/wall-calendar.tar.gz --title v<version>
```
