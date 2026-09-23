# What changed, and which decision it came from

Source: *Kai Web Property Page / Project Design Review*, 2026-09-08 — Aaron Mosny,
Christine Martin, Quinn Hoang, Maria Moersen, Tov Arneson.

Files touched: `dashboard.html`, `PropertyOverview.html`, and two new shared files,
`kai-activity.css` + `kai-activity.js`.

---

## The one structural decision

> "There's an opportunity to formalize a structure … an activity log associated with
> everything from the property level to the project level to the scope level all the way
> down to the task level. If we can standardize how we show that log, people can quickly
> understand what they're looking at." — Tov
> "This is my favourite version so far in that it's the same UI language on the scope
> level and the task level." — Maria

That is a decision about *reuse*, so it is implemented as reuse: **`kai-activity.css` +
`kai-activity.js` are standalone files, not a block of CSS inside one page.** The property
page loads them today; the job page and the task panel load the same two files, pass a
different `level`, and get the identical pattern.

```js
KaiActivity.mount(el, { level:'property'|'job'|'group'|'task', entries:[…], onNavigate })
```

Nothing in the renderer knows what a property or a task is. It knows an event has a time,
an actor, a lane, and possibly children. That is why one file serves all four levels.

Pattern decisions baked in:

| Decision | How it shows up |
|---|---|
| Two lanes — "the paperwork behind the decisions" vs "the execution of the actual work" (Tov) | Admin events are hollow dots, work events filled; `All / Admin / Work` filter. Same log, not two logs. |
| Group by day / week / month to stop the history becoming one scroll (Quinn) | `Day / Week / Month` segmented control; property level defaults to Month, job and task to Day. |
| Collapsible at the zoomed-out level, granular further down (Maria) | `Collapse` in the head; property level starts at 8 rows with "show earlier". |
| A change order links to *both* the artifact and the changed task (Christine) | Change-order rows carry a `Change order 4` link **and** an expandable list of the tasks it moved, each with its price delta. |
| A job with many change orders is a signal, not just a number (Tov) | Change-order dots are red; 3+ change orders turn solid red on the dashboard and property table. |

---

## Dashboard

| # | Decision from the review | What I did |
|---|---|---|
| 1 | **"Needs review" is obsolete** — "it was pretty vague because all we had was the one status for everybody" (Christine) | Deleted. Replaced with relevance views. |
| 2 | **"All users have My work; approvers additionally have My team"** (Maria, Christine, aligned) | A segmented control in the toolbar: `My work · My team · All jobs` for an approver. A **builder sees only My work** — Maria: "for a builder it would be just my work"; neither the team view nor the whole-account list is theirs. The demo **Viewing as** switch shows both. Roles and permissions are in the backlog, so nothing is actually gated — Aaron's "crawl version without permissions". The allowed views are a list per role (`DB_ROLE_VIEWS`) rather than a rule per tab, so a third role is one entry rather than another special case. A role left holding a view it may no longer see falls back to My work, and a lone view stops behaving like something you can click. |
| 3 | **Turn-based: put what's mine at the top** (Christine) | The list is ordered, not sectioned. **My turn** is the default sort, so your jobs lead. Headed bands (*Your turn* / *Waiting on someone else*) did this at first and were **removed at review** — they said in a row of type what the order already says by putting those jobs first, and what each card repeats in its own turn chip. |
| 4 | **Managers need to spot stuck work** — "are there things stuck" (Christine) | Partly. A job with no movement shows `35d ago` beside its last-updated date. The *Stalled* / *Moving* bands that grouped them went with the other section headers, so **My team no longer surfaces stalled work as a group** — worth revisiting, probably as a sort option rather than a band. |
| 5 | **Past-due needs to be louder than a subtle cue** (Quinn + Christine, 00:14:34) | A late job gets a red rule down the card's edge, a `152 DAYS LATE` chip in the eyebrow, a red due date, a red dot on its market in the rail, and a count in the page subtitle. It also sorts first *regardless of the chosen sort* — sort answers "in what order", lateness answers "does this need me at all". |
| 6 | **Filter *and* sort** — "we only sort, we don't filter" (Christine) | Filters and sort, both. Sort keeps the shipped menu's own list — Address, Due date, Last updated, Market name, **My turn**, Org property ID — with the default renamed from *Needs review*, since that was the vague one-status-for-everyone the review retired and "is it my turn" is the question people actually arrive with. Filtering uses **the product's existing attention filter** rather than a new control — see below. A `Clear all` chip appears whenever something is hidden. |
| 7 | **"Job" plus the job type, not "scope"** (Tov, Quinn, 01:08:31) | Every row reads `ACQUISITION JOB · CHANGE ORDER`. "Projects" is gone from the UI. |
| 8 | **Both statuses matter** — administrative *and* work status (Tov, 00:59:17) | Partly. The card's tag carries the administrative status. A `12/38` work-progress bar sat beside it for a while and was **removed at review** — it made a fifth labelled cell out of something the card could not act on. The work status still needs a home; the job page is the likelier one. |
| 9 | **Creating a job from a property is a primary goal; maintenance users need search** (Tov 00:19:44, Aaron 00:28:36) | `+ New job` opens a modal that searches *properties* — including properties with no job at all, which the dashboard could otherwise never surface. It flags properties that already have active work ("2 active jobs"), so nobody opens a maintenance job on a house that is mid-turn without knowing. |
| 10 | **Austin had no default template set** (Aaron, 00:22:14) | The modal names the market default it applied, or says plainly that the market has none — a configuration gap that reads as a sentence instead of as a silent extra required field. |

Also: the thumbnail now carries a capture date, because an undated photo of a house
renovated twice is a photo of nothing in particular.


### The filter control

The two `Type` / `Phase` dropdowns are gone. Filtering is now the **`.af` attention
filter** — the same component as the scope editor's (`panel.css` `.af-*`,
`js/panel-core.js` `renderFilter()`), in its light `sb-tools-af` variant, holding the
dashboard's own three filters.

Why the swap: two "All" dropdowns could each hold exactly one value, neither could say
how many jobs were behind a choice, and neither resembled the filter people already use
one screen over.

The rules are restated inside `dashboard.html` because the dashboard loads `shell.css`
and not `panel.css` — same class names, so it stays one component rather than becoming a
lookalike.

**Content** — the three things the card's tag shows, and nothing else:

| Band | Entries |
|---|---|
| **Type** | Acquisition · Turn · Renovation · Maintenance |
| **Phase** | Scope · Change order · Close out |
| **Status** | Approved · In progress |

*Punch list*, *Dispatch* and *Review in progress* were dropped from the menu at review.
*Review in progress* was then retired from the data too, so the two status filters cover
every job. **Punch list and Dispatch are still on jobs in the data** — they show on the
cards but cannot be filtered to, so either the data should retire them as well or they
belong back in the menu.

Status rows carry a dot in the colour the card's tag uses, so a filter and the thing it
filters are recognisably the same object. Type and phase have no dot and no reserved
gutter — three short lists don't need blank space to look like a set.

**Behaviours kept from the component**

- **Zero-count rows stay listed.** `panel-core.js` already argued this: dropping the empty
  ones makes the list change shape between steps, which reads as the filter ignoring the
  step rather than reporting it.
- **Union within a band, intersection across bands.** Turn *or* Renovation; a Turn job *and*
  in review. The alternative makes picking a second type return nothing, which is never
  what was meant.
- **Counts are of the current view, state, market and search — not of the other filters.**
  So a number answers "how many would I get if I turned this on" and doesn't move while you
  toggle its neighbours.
- Multi-select stays open; `Clear` in the footer; a red count badge on the button.

One bug worth noting, since it is easy to reintroduce: picking a filter re-renders the menu,
so by the time the click reaches the document the clicked button is no longer in the DOM and
an `af.contains(ev.target)` outside-click test returns false — closing the menu on every pick
and turning a multi-select into a single-select. Inside clicks are stopped at the wrapper
instead, which survives the re-render.


### Where the two controls live

Swapped, late on. **State** — active, completed, archived — is the outer question and sits
in the black bar as tabs, where the shipped dashboard has it. **Whose work it is** narrows
what is already on screen, so it is a segmented control in the toolbar beside the filter
and sort.

Both carry counts, and every count answers the same question — *how many would I get if I
clicked this*. So each control is counted with its own dimension left out and the other
two (plus the market) applied: the state tabs count within the current view, the view
control counts within the current state. A number that moved when you changed something
unrelated would stop being worth reading.

### The header

Two rows became one, and the brand went back to the corner.

- **Kai mark in the top-left corner**, level with the bar, the way the shipped
  dashboard has it. `shell.css` drops it to the top of the rail instead — right for the
  demo shell, but it puts the brand a row below the product. The page hides that copy
  and carries its own.
- **The view tabs are 12px**, up from 9.5px — they are the primary navigation on the
  page and were set smaller than the row of filter controls beneath them.
- **The title row is gone.** It read "My work / 6 active jobs across all markets / 4 past
  due" — the title restated the active tab, and the count restated both the tab's count
  and the rail's. The only things that lived nowhere else were the past-due figure and the
  New job button, so both moved into the control bar and the row disappeared.
- **What replaced it** is one quiet line in the bar that says only what the tabs and rail
  cannot: how many are past due, and — once a filter is on — `3 of 6 shown`. Previously
  nothing on screen said that unless you opened the filter menu.
- **The search collapsed to its icon.** A field that wide sat in the bar all day
  announcing something most people do rarely. It is a 29px box now and widens on focus.
  Notably there is **no open button and no scripted focus**: the input itself is the
  icon-sized box, so clicking it focuses it the way clicking any field does, and
  `:focus-within` widens it. The first attempt put a button in front of the field, and the
  two raced for one click — the button takes focus on mousedown, script moves it to the
  field, the browser puts it back — so the field opened but everything typed went nowhere.
  One element cannot race itself. It stays open while it holds a query, since a query in a
  collapsed box would hide why the list is short; Escape empties and closes it in one press.
- **`Sort` kept its label.** It was dropped when the default read "Due date", which said
  what it was on its own; "My turn" on a bare control reads like a filter you switch on
  rather than an order you sort by, which is why the shipped menu heads itself "Sort by".
- **The rail lost `MY DASHBOARD`**, a heading that sat above a single row. `All markets`
  is now the first entry of the one list, under `Markets`.
- **The role switch lost its box** and reads "Viewing as Approver". It is a demo control
  and a border gave it the weight of a product one.
- **At phone width** the bar was overflowing and clipping the bell and avatar. Below
  900px the page title, org name and role switch now drop — the rail already names the
  section — and the bell and avatar stay.

### The job tag on each card

Restored to the product's three-segment tag — type, phase, status as one joined bar rather
than separate chips, because it is one sentence read left to right. The first two segments
are filled (grey, then ink) and the third is outlined, so status is the part carrying colour.

The status tag says one of exactly two things: **In progress** or **Approved**.
*Review in progress* was retired — it described who was holding the job rather than where
the work stood, and whose turn it is already has its own chip. Approved is green with a
filled diamond; in progress is hollow and takes its phase's colour, so a change order in
flight still reads differently from ordinary work. `--tag-blue` and `--tag-orange` are declared locally; they aren't in
`shell.css`'s token set.

The review's own chips — `Your turn`, `N days late`, `N change orders` — follow the tag on
the same line rather than replacing it.

---

## Property page

The review's verdict was that the page is an afterthought: it opened with nine facts about
the building and made you scroll to learn whether anyone was working on it. So the page is
now ordered by **how long an answer stays true**.

| # | Decision | What I did |
|---|---|---|
| 1 | **"Critical information regarding the current state of a property and its active jobs should be elevated to the top level"** (Tov, 00:26:32) | New **Right now** band, above everything: one row per open job with type, phase, admin status, whose turn, work progress, due date, budget — late ones first. If nothing is open it says so and offers the button, which is exactly the maintenance case. |
| 2 | **Property details demoted** | The nine facts are now a collapsed disclosure with a one-line summary (`3 bed · 3 bath · 1,422 sqft`). Editing still works in place and writes through to the summary. |
| 3 | **"The property could have three bedrooms one year and six bedrooms four years later"** (Christine) | The details band names the job that last changed them: *"Last changed by 2025 make-ready — took the property from 3 bed / 2 bath to 3 bed / 3 bath."* |
| 4 | **Assign builders at the property level so mobile users can find their work** (Aaron, 00:27:30) | New property-team band: maintenance tech, builder, approver, field user. The job-creation modal now says a new job *inherits* that team unless overridden. |
| 5 | **High-level activity log at the bottom, drilling property → job → group → task** (Maria, 01:04:14) | Implemented, and it actually drills: clicking `Open job` switches the log to that job's own log at `level:'job'`; clicking a task inside a change order goes to `level:'task'`. A breadcrumb climbs back. Job rows in the table and cards in the Right-now band enter the same flow. |
| 6 | **Archived jobs keep their history** (Tov + Aaron, 01:09:31) | Every job in the Archived tab opens its own log with the same pattern. Jobs without a hand-written log get a generated one from their own data, so no row is a dead end. |
| 7 | **Property-level media comparison across jobs, any two points in time** (Tov, 01:12:38–01:20:12) | New **Progress & comparison** section. Every capture from every job on one strip, oldest left, each labelled with its job type and job name. Click sets **B**; click again sets **A**. Under the pair, a sentence says how far apart they are and *which jobs ran in between* — the reason the picture changed. |
| 8 | **"Whatever was the most recent, that's what we promote to the property level"** (Tov) | The hero photo is derived from the newest capture and is captioned with the job it came from. |
| 9 | **Future toggle: by time or by group/room** (Christine, 01:20:12) | Built as `By time / By room`, since they are the same pictures under different headings. |
| 10 | **Project setup out of the side drawer and into a modal** (aligned) | Already a modal; retitled **Start a job**, fields relabelled to job terminology, and given the same market-default-template note as the dashboard. |
| 11 | **Change orders belong in the job's story** | The jobs table gained a Change orders column; 3+ goes solid red. |

---

## Things I deliberately did **not** do

- **Roles and permissions.** Aaron: it's in the backlog and not on the roadmap. The role
  switch is a demo control that proves the two views exist; nothing is gated by it.
- **Removing the property/market info from the *project* page** (Christine, 01:16:59).
  That is the project overview, which is a third file and was not in scope here.
- **The scope/job data-structure merge** (Maria + Tov, 00:41:02). Reflected in the
  *language* everywhere — the scope is spoken of as the plan inside a job — but the
  prototype has no data layer to actually collapse.
- **Contractor assignments box** (Quinn, 00:00:00) — it lives on the project overview page,
  not in either of these two files.

## Notes

- The `.otf` font 404s in the console are the licensed Maxeville/Circular files, which
  aren't in the repo. Same on `index.html`. Google fallbacks render.
- Both pages verified at 1440px and 420px: no horizontal page scroll, no script errors.
  The dashboard's market rail becomes a row of chips below 900px.
