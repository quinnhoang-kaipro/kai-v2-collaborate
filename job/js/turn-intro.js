/* ── turn-based workflow: feature introduction ───────────────────────
   A short multi-step modal that explains how documents move between people:
   one person holds a scope, change order or closeout at a time; they hand it
   off when they are done; anyone who needs it sooner can take the turn; and
   every turn lands in the Activity record.

   Each step is a real screenshot of the prototype (img/turn-intro/), cropped
   to the one control it is about. They were captured from this branch, so
   they go stale if those surfaces change — recapture rather than redraw.

   Opens by itself once per browser, and on demand from the turn popover's
   "How turns work" link and the Demo menu. Reads `state.role` from shell.js
   for the one sentence that differs by role. */
const TURN_INTRO_SEEN_KEY = 'kai_turn_intro_seen';

/* `img` places the screenshot inside the picture panel: its rendered width,
   and its offset from the panel's top-left. Every shot is wider or taller than
   the panel on purpose, so it bleeds off an edge and reads as a crop of the
   real screen rather than a free-floating card. */
const TURN_INTRO_STEPS = [
  /* The first screen announces the feature before it explains anything: a NEW
     badge, a title that names it, and a lead line on why it exists. The
     mechanics follow underneath, so the step still teaches the turn chip. */
  {
    kicker: 'Turn-based workflow',
    badge: 'New',
    title: 'Introducing the turn-based workflow',
    lead: () => `Scopes, change orders and closeouts now move between your team one
      turn at a time, so it is always clear who is working on what.`,
    body: () => `One person holds each document. The chip beside the stage says who
      has it. Open it to see who is responsible and where it has been.`,
    img: {src:'img/turn-intro/turn.png', alt:'The stage bar, with the turn chip open on "With T. Okafor"', w:540, x:28, y:26},
  },
  {
    kicker: 'Hand off',
    title: 'Pass it on when you are done',
    body: () => `Choose who gets it next and leave a note on what is still open.
      They can edit it, and a ${rn('manager')} can approve it.`
      + (state.role === 'manager'
          ? ` As the ${rn('manager')}, you can edit, hand off and approve at any time.`
          : ` Once it is handed off, you edit again when it comes back to you.`),
    img: {src:'img/turn-intro/handoff.png', alt:'The Hand off the scope dialogue', w:430, x:62, y:26},
  },
  {
    kicker: 'Take the turn',
    title: 'Need it now? You do not have to wait',
    body: () => `If someone else has the document, you can start editing anyway.
      We will let them know, and you hand it back, or on to the next person, when
      you are finished.`,
    img: {src:'img/turn-intro/take.png', alt:'The Take the turn from T. Okafor dialogue', w:400, x:76, y:30},
  },
  {
    kicker: 'The record',
    title: 'Every turn is on the record',
    body: () => `The Activity section on the Overview tab lists each turn: who had
      the document, what they changed, the note they left, and what it did to the
      job total.`,
    img: {src:'img/turn-intro/activity.png', alt:'The Activity section on the Overview tab', w:640, x:28, y:30},
  },
];

let turnIntroStep = 0;

function openTurnIntro(step){
  turnIntroStep = Math.max(0, Math.min(TURN_INTRO_STEPS.length - 1, step || 0));
  if(typeof closeStatePop === 'function') closeStatePop();
  const menu = document.getElementById('tbSet');
  if(menu) menu.classList.remove('open');
  try{ localStorage.setItem(TURN_INTRO_SEEN_KEY, '1'); }catch(e){}
  renderTurnIntro();
}
function closeTurnIntro(){
  const el = document.getElementById('turnIntro');
  if(el) el.remove();
}
function turnIntroGo(delta){
  const next = turnIntroStep + delta;
  if(next >= TURN_INTRO_STEPS.length){ closeTurnIntro(); return; }
  if(next < 0) return;
  turnIntroStep = next;
  renderTurnIntro();
}

function renderTurnIntro(){
  let el = document.getElementById('turnIntro');
  if(!el){ el = document.createElement('div'); el.id = 'turnIntro'; document.body.appendChild(el); }
  const n = TURN_INTRO_STEPS.length;
  const s = TURN_INTRO_STEPS[turnIntroStep];
  const last = turnIntroStep === n - 1;
  el.innerHTML = `<div class="dsp-scrim" onclick="closeTurnIntro()"></div>
    <div class="ti-card" role="dialog" aria-modal="true" aria-labelledby="tiTitle">
      <button type="button" class="ti-x" onclick="closeTurnIntro()" aria-label="Close">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>
      </button>
      <div class="ti-pic">
        <img src="${s.img.src}" alt="${s.img.alt}"
          style="width:${s.img.w}px;left:${s.img.x}px;top:${s.img.y}px">
      </div>
      <div class="ti-body">
        <div class="ti-kicker">${s.badge ? `<span class="ti-badge">${s.badge}</span>` : ''}${turnIntroStep + 1} of ${n} · ${s.kicker}</div>
        <h2 class="ti-title" id="tiTitle">${s.title}</h2>
        ${s.lead ? `<p class="ti-lead">${s.lead()}</p>` : ''}
        <p class="ti-text">${s.body()}</p>
      </div>
      <div class="ti-foot">
        <div class="ti-dots" role="tablist" aria-label="Steps">
          ${TURN_INTRO_STEPS.map((x, i) => `<button type="button" class="ti-dot${i === turnIntroStep ? ' is-on' : ''}"
            role="tab" aria-selected="${i === turnIntroStep}" aria-label="Step ${i + 1}: ${x.kicker}"
            onclick="openTurnIntro(${i})"></button>`).join('')}
        </div>
        <div class="ti-acts">
          ${turnIntroStep > 0 ? `<button type="button" class="dsp-btn" onclick="turnIntroGo(-1)">Back</button>` : ''}
          <button type="button" class="dsp-btn is-primary" id="tiNext" onclick="turnIntroGo(1)">${last ? 'Got it' : 'Next'}</button>
        </div>
      </div>
    </div>`;
  const next = document.getElementById('tiNext');
  if(next) next.focus();
}

document.addEventListener('keydown', e => {
  if(!document.getElementById('turnIntro')) return;
  if(e.key === 'Escape'){ closeTurnIntro(); }
  else if(e.key === 'ArrowRight'){ turnIntroGo(1); }
  else if(e.key === 'ArrowLeft'){ turnIntroGo(-1); }
});

/* Once per browser, after the app has drawn — opening over a blank shell would
   introduce a screen nobody has seen yet. */
(function(){
  let seen = false;
  try{ seen = localStorage.getItem(TURN_INTRO_SEEN_KEY) === '1'; }catch(e){}
  if(!seen) setTimeout(() => openTurnIntro(0), 700);
})();
