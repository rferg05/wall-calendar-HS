# Wall Calendar

Home Screens module: **this week**, **this week and next**, or **this month**, with every event's title readable from across the room over whatever photo is behind it.

## What it shows

- **Views:** *This week*, *This week and next* (the default), or *This month*. Weeks start on Sunday, Monday, or today (a rolling 7 or 14 days).
- **Layout:** the week views try both of their layouts against the module's size and use whichever allows larger text. *Days side by side* is the usual calendar: 7 columns, with two rows for two weeks. *One day per row* puts each day's events on one line, and two weeks go side by side. A wide module gets columns; a square or tall one gets rows. *Week layout* in the settings can force one.
- **Events:** a chip for each event, with its start time and title. Timed events are dark chips in the event's own hue with a bar of its color. All-day events are filled with their color, so the two read apart at a glance. Text on them is white, or near-black on light colors like yellow. A multi-day event repeats on each day, with "→10a" on its last day when it ends partway through.
- **Busy days:** a day with room shows whole titles. A busy day cuts titles a line at a time down to *Lines per event title*, then shrinks its own text to as little as 72%, and only then leaves events off with "+2 more".
- **Today:** a ring in the *Today color*, and the date on a disc of it. With *Fade past days* on, earlier days are faded and today's finished events fade too.
- **Colors:** by calendar color (the default), or by person, using each member's color from Settings > Family for the calendars linked to them.

## Legibility

The built-in calendar draws small light text straight onto the module, which disappears over bright or busy photos, and cuts titles at 10 characters. This module:

- **Sizes text from the module**, not a fixed size: the text grows with the space each day gets, as the CTA and Travel Times modules do. *Text size* in the settings, and the Style panel's Text size, adjust it from there.
- **Puts a dark panel behind every day** (*Day darkness*, 70% by default), so the photo behind can't wash out dates and titles. Raise it if a background still makes it hard to read.
- **Gives each event its own solid chip**, with bold text at full contrast whatever the day panel or photo.
- **Outlines day names and dates** with a fine dark ring, for the parts that sit on the day panel rather than a chip.

Measured in the preview at default settings, two weeks on a 1080p screen (busy days go down to about 72% of these):

| Module size | Layout | Event text |
|---|---|---|
| 560×560 | one day per row, weeks side by side | 18 px |
| 1280×720 | one day per row, weeks side by side | 33 px |
| Full screen, 1880×1040 | one day per row, weeks side by side | 48 px |

For reading across a room, give it at least a third of the screen. *This week* on its own gets about twice the text size of two weeks in the same space.

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
| Event style | Dark with a color bar | Or filled with the color. All-day events are always filled. |
| Fade past days and finished events | on | |
| Holidays / Birthdays | on | |
| Hide events whose title contains | | Comma-separated. |
| Text size | 1× | 0.5–2×, on top of the size from the module's shape. |
| Day darkness | 70% | The panel behind each day. |
| Outline day names and dates | on | |
| Today color | blue | |
| Clock times | Household setting | Or 12-hour (7p, 7:30p) or 24-hour. |

## Development

```bash
npm install
npm test             # days on screen, event days across time zones, filters
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
