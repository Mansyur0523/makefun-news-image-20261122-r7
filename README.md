![License](https://img.shields.io/badge/license-MIT-green)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Competition](https://img.shields.io/badge/make.fun-news--image--20261122-blue)

# The World in One Page — Sunday, 22 November 2026

A single-page newspaper poster that packs the whole world's news for
Sunday, 22 November 2026 into one printable sheet. Everything on the page
happened on or around that date: no story from another day slips in, and
every figure on the page was checked against the reporting of the day.

## What is on the poster

- **38 stories in total** — 3 lead stories across the top, 10 feature
  stories in the middle columns, and 25 short briefs filling the lower
  half, so a reader can scan the day in a minute or read it all in ten.
- **7 regions covered** — Europe, Asia, the Middle East, Africa, North
  America, South America, and Oceania each get their own corner of the
  page, so no part of the world is missing from the day's picture.
- **A world map with 13 pins** — one pin per major story location, with a
  legend underneath the map that ties every pin number back to its
  headline.
- **A strip of 6 numbers** running under the masthead, the day in figures:
  186 drones overnight, 720/9 total for India at Wellington, 44 hours of
  overtime at COP31, 75 career wins for Verstappen, an 80% margin rate in
  China, and 5,640 ballots in Hong Kong.

## Feature 11 — the sport lead

The biggest sports story of the day sits at feature slot 11:

> **ALCARAZ WINS TURIN 6-2, 7-6(7)**

Alcaraz takes the Turin title in straight sets, closing the second set in
a tiebreak.

## Date check

Before the poster was frozen, six separate date checks were run and all
six came back **SUN 22 NOV**:

1. Masthead date reads Sunday, 22 November 2026.
2. Lead story datelines all fall on 22 November 2026.
3. Feature datelines all fall on 22 November 2026.
4. Brief datelines all fall on 22 November 2026.
5. The number strip figures are all dated 22 November 2026.
6. The map pins and legend all point to events of 22 November 2026.

## Files

| File | What it is |
| --- | --- |
| `entry.png` | The finished poster image (1024 px max side, 8-bit RGB PNG). |
| `main.ts` | Validator and copier: checks the PNG chunk by chunk, then copies it byte-identical to the output directory. |
| `README.md` | This file. |
| `LICENSE` | MIT license. |

## How to run

```sh
MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
```

`main.ts` reads `entry.png` next to itself, validates the PNG signature,
size, IHDR, IDAT, IEND and every chunk CRC, then writes an identical copy
to `$MAKEFUN_OUTPUT_DIR/entry.png` (default `/output`) and prints a JSON
summary with the byte count, dimensions and sha256. It refuses to write
inside the repository.
