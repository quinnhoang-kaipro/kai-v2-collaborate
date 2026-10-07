# Activity section requirements

The Activity section at the bottom of the job's Overview tab shows who worked on the job's documents, what they did, and how it changed the job total.

**Prototype:** `job-overview` branch, `js/overview.js` · **Updated:** Oct 7, 2026

| Shows | Does not show |
|---|---|
| Changes to artifacts: a scope version, change order or closeout being created, edited, handed off, taken over or approved. | Task progress updates (in progress, needs rework, completed, progress posts). Those belong to the Progress tab. |

## Example

| When | Who | What | Artifact | Note | Difference | Total |
|---|---|---|---|---|--:|--:|
| ◆ May 22, 2026 | Tara O. | Approved 18 tasks | Closeout · Approved | — | | |
| ◆ Apr 29 – 30, 2026 | Tara O. | Edited 5 tasks, 3 groups · approved | Change Order 2 · Approved | Excepteur sint… | +$3,640 (red) | → $26,614 |
| ◇ Apr 28 – 29, 2026 | Sana P. | Edited 1 task | Change Order 2 · Approved | Ut enim ad… | −$180 (green) | → $22,974 |
| ◆ Apr 27 – 28, 2026 | Marisol A. | Created draft and edited 1 task<br>*Handed off to Sana P.* | Change Order 2 · Approved | Sed do eiusmod… | +$460 (red) | → $23,154 |

Tara took Change Order 2 from Sana without a hand-off, so Sana's row has no "Handed off to" line.

## Rows

- **ACT-1** One row per person per turn with a document. A turn runs from when the document reached them until it left them (handed on, taken, or approved). Turns follow the sign-off chain: the creator, then each reviewer in order. The last one approves.
- **ACT-2** One list for the whole job, with no per-document grouping. Newest first by the day the turn ended; an open turn uses the day it started. Same-day order: approved, then handed off, then created.
- **ACT-3** Show the latest 3 rows. Older rows sit behind `View all history (n earlier entries)`, which toggles to `Hide earlier activity`. No link with 3 or fewer rows. With no documents, show `No documents yet.`

## Columns

- **ACT-4 When:** `Apr 27 – 28` (month said once), `Apr 30 – May 2`, or a single day `May 22`, with the year underneath. Days only, no clock times.
  Each row has a marker on a vertical rail: filled black for created, outlined for a middle turn, green for approved. The current holder's row gets a yellow bar on its left edge.
- **ACT-5 Who:** first name and last initial, for example `Tara O.` No role titles.
- **ACT-6 What:** a phrase from the table below. [n] counts only that person's edits in that document: `1 task` or `5 tasks, 3 groups`.
- **ACT-7 Hand-off:** when the person handed the document on, add `Handed off to [name]` under What. Leave it out when the next person took the work instead (a manager can take it without a hand-off; flag `taken` on the sign-off), and on a document's last turn. The taker's row doesn't mention taking.
- **ACT-8 Artifact:** the document's name, with `Draft` under it while it's open and `Approved` once approved.
- **ACT-9 Note:** the note from that turn, clamped to 2 lines. Clicking it opens the Notes drawer at that note. Em dash if none.
- **ACT-10 Difference:** the net change from that person's edits. Increases in red with a plus (+$3,640), decreases in green with a true minus sign (−$180). Hover shows was → now.
  **Total:** `→ $X`, the job total after their edits. Totals run through a document's turns and land on its approved amount. Both cells stay blank when the turn changed no money.

| Situation (first match) | What says |
|---|---|
| Still has it, has edited | `Edited [n] so far` |
| Still has it, no edits yet | `Reviewing` |
| Created the draft and edited it | `Created draft and edited [n]` |
| Edited and approved | `Edited [n] · approved` |
| Edited | `Edited [n]` |
| Approved | `Approved` |
| Created the draft | `Created draft` |
| Had it, changed nothing | `Reviewed` |
| Closeout | `Approved [n] tasks` |

## Interactions

- **ACT-11** A row with edits expands (via its caret or a row click) to list the changed tasks by room: code, name, and up to 2 changes, then `+n more`. A room opens that group in the Editor. A task opens that task, or its group with a message if the task no longer exists.
- **ACT-12** Clicking a document name opens the document. Hovering a document, room or task name shows a preview card.

## Open items

- **ACT-13** *Placeholder:* note text is lorem ipsum. Turns need to store the note the hand-off dialog collects.
- **ACT-14** *Parked:* a Duration column is built but switched off until events carry real timestamps.
