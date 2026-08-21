/* Panel source, unescaped and ready to hand to the iframe. */
const KAI_PANEL_RAW = (document.getElementById('kaiPanelSrc').textContent || '')
  .replace(/<\\\/script/gi, '<\/script')
  .replace(/<\\script/gi, '<scr' + 'ipt');

/* Build a panel document for a given query string.
   srcdoc doesn't carry two things the panel relies on, so we inject both
   at the top of its <head>, before any of its own scripts evaluate:
     · __KAI_QS — the panel reads role / stage / tab / projMode / seed /
       chromeless / audience out of the query string to decide what to render.
     · <base>  — srcdoc resolves relative URLs against about:srcdoc, which
       would break the ./fonts/ paths. Pointing base at this file's folder
       means the real Maxeville and Circular XX files still load when a
       fonts/ folder sits next to this HTML; without it the panel falls
       back to the Google Fonts stack it already declares. */
function KAI_PANEL_DOC(qs){
  const boot =
    '<base href="' + location.href.split('#')[0] + '">' +
    '<scr' + 'ipt>window.__KAI_QS=' + JSON.stringify(qs ? '?' + qs : '') + ';<\/script>';
  return KAI_PANEL_RAW.replace(/<head([^>]*)>/i, '<head$1>' + boot);
}

/* ═══ shell stage/role model + app JS ═══ */
/* ════════════ STAGE & ROLE MODEL ════════════ */
const ROLES = [
  {id:'field_agent', name:'Field agent',    desc:'Walks the property and builds the initial scope.'},
  {id:'admin',       name:'Admin',          desc:'Reviews the scope. Sends to manager for publish.'},
  {id:'manager',     name:'Manager',        desc:'Publishes the scope so it can be shared externally.'},
  {id:'contractor',  name:'Contractor',     desc:'Shops products and executes the approved work.'},
  {id:'renter',      name:'Renter',         desc:'Views the scope without pricing or edit access.'},
];

/* ── change-order hand-off ───────────────────────────────────────────
   A manager or field agent looking at a change order under review holds no
   decision — approving it is the admin's. But they are not stuck: they can pass
   the document on, to the admin or to whoever should weigh in, with a note
   saying why. So their CTA is "Hand off" rather than a dead "Waiting on" gate.

   Its own modal rather than openModal(): that one serialises onConfirm with
   toString(), so a closure over the selected teammate and the typed note would
   not survive the round trip. Reuses the .dsp-* shell so it looks native.

   The internal team only. Handing a change order to the renter or the
   contractor isn't a review, it's a disclosure. */
const HANDOFF_ROLES = ['field_agent', 'admin', 'manager'];
let coHandoffOpen = false;
let coHandoffTo   = null;   // role id of the chosen teammate
let coHandoffNote = '';

function coHandoffTeam(){
  return HANDOFF_ROLES
    .filter(r => r !== state.role)
    .map(r => ({id:r, name:ROLE_PEOPLE[r].name, initials:ROLE_PEOPLE[r].initials,
                role:(ROLES.find(x => x.id === r) || {}).name || r}));
}
function openCoHandoff(){
  const team = coHandoffTeam();
  // Default to whoever actually owes the move — that is the hand-off you want
  // nine times in ten, and pre-selecting it saves the common case a click.
  const owner = turnRoleFor(viewStage, state.twoStep);
  coHandoffTo   = (owner && owner !== state.role) ? owner : (team[0] && team[0].id);
  coHandoffNote = '';
  coHandoffOpen = true;
  renderCoHandoff();
}
function closeCoHandoff(){ coHandoffOpen = false; renderCoHandoff(); }
function pickCoHandoff(id){ coHandoffTo = id; renderCoHandoff(); }
/* Note is read straight off the field on confirm rather than mirrored on every
   keystroke — re-rendering the modal under a cursor loses the caret. */
function confirmCoHandoff(){
  const ta = document.getElementById('coHandoffNote');
  coHandoffNote = ta ? ta.value.trim() : '';
  const to = coHandoffTeam().find(p => p.id === coHandoffTo);
  coHandoffOpen = false;
  renderCoHandoff();
  if(typeof toast === 'function'){
    toast(to ? `Change order handed off to ${to.name}` : 'Change order handed off');
  }
}
function renderCoHandoff(){
  let el = document.getElementById('coHandoffModal');
  if(!coHandoffOpen){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement('div'); el.id = 'coHandoffModal'; document.body.appendChild(el); }
  const team = coHandoffTeam();
  const rows = team.map(p => `
    <button type="button" class="dsp-row co-ho-row${coHandoffTo === p.id ? ' is-on' : ''}"
      onclick="pickCoHandoff('${p.id}')" aria-pressed="${coHandoffTo === p.id}">
      <span class="dsp-av">${p.initials}</span>
      <span class="dsp-who"><span class="dsp-name">${p.name}</span><span class="dsp-role">${p.role}</span></span>
      <span class="co-ho-tick">${ICONS.check}</span>
    </button>`).join('');
  el.innerHTML = `<div class="dsp-scrim" onclick="closeCoHandoff()"></div>
    <div class="dsp-card" role="dialog" aria-modal="true" aria-label="Hand off the change order">
      <div class="dsp-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3L3 10.5l7 3 3 7L21 3z"/></svg>
      </div>
      <div class="dsp-title">Hand off the change order</div>
      <div class="dsp-lbl">Pass it to</div>
      <div class="dsp-list">${rows}</div>
      <div class="dsp-lbl co-ho-lbl2">Add a comment <span class="co-ho-opt">optional</span></div>
      <textarea id="coHandoffNote" class="co-ho-note" rows="3"
        placeholder="What should they look at? Anything you'd want changed before this is approved.">${coHandoffNote}</textarea>
      <div class="dsp-acts">
        <button type="button" class="dsp-btn" onclick="closeCoHandoff()">Cancel</button>
        <button type="button" class="dsp-btn is-primary" onclick="confirmCoHandoff()">Hand off</button>
      </div>
    </div>`;
  const ta = document.getElementById('coHandoffNote');
  if(ta) ta.focus();
}
/* True where a viewer with no decision can still pass the document on. Today
   that is the change-order review, for the two internal roles that are not the
   approver. */
function canHandOffHere(){
  if(viewStage !== 'published' || state.workTrack !== 'change_order') return false;
  return state.role === 'manager' || state.role === 'field_agent';
}

/* ── the turn popover ────────────────────────────────────────────────
   Two initials can't say who someone is. The chip is a button, and this is
   what it opens: the name behind the initials, the role, what that person owes,
   and how far through it they are when the stage tracks that.

   Lives on <body> rather than inside the stepper — renderStages rewrites that
   subtree on every state change, which would take the popover with it. */
let turnPopOpen = false;
function toggleTurnPop(){ turnPopOpen = !turnPopOpen; renderTurnPop(); }
function closeTurnPop(){ if(!turnPopOpen) return; turnPopOpen = false; renderTurnPop(); }
/* What the person whose turn it is owes, as an infinitive phrase that reads
   after their name: "A. Novak (Admin) to review the change order." Keeping it
   in one grammatical shape is what lets the same string serve both paragraphs. */
function turnNeedFor(stage, twoStep, track){
  switch(stage){
    case 'edit':         return 'to finish building the scope and hand it off for review';
    case 'submitted':    return 'to begin the review';
    case 'reviewing':    return twoStep ? 'to review every task and hand it off'
                                        : 'to review every task and approve it to publish';
    case 'review-done':  return 'to send the reviewed scope on to publish';
    case 'awaiting-pub': return 'to approve and publish the scope';
    case 'published':    return track === 'change_order'
                                ? 'to review the change order'
                                : 'to track the work and submit closeout once every task is complete';
    case 'closeout':     return 'to compare before and after, then approve the closeout';
    default:             return '';
  }
}
/* The same obligation addressed to the person who holds it. */
function turnMineFor(stage, twoStep, track){
  switch(stage){
    case 'edit':         return 'Finish building the scope, then hand it off for review.';
    case 'submitted':    return 'Begin the review.';
    case 'reviewing':    return twoStep ? 'Review every task, then hand off to the manager.'
                                        : 'Review every task, then approve to publish.';
    case 'review-done':  return 'Send the reviewed scope on to publish.';
    case 'awaiting-pub': return 'Approve and publish the scope to release it to the field.';
    case 'published':    return track === 'change_order'
                                ? 'Review the change order and approve it, or request an edit if something is wrong.'
                                : 'Track the work. Submit closeout once every task is complete.';
    case 'closeout':     return 'Compare before and after, then approve the closeout.';
    default:             return '';
  }
}
/* What the VIEWER can do while someone else holds the move. The useful answer
   is rarely "nothing" — there is usually a way to intervene, and saying so is
   the difference between a dead end and a next step. Keyed on the viewer's role
   first, because the same stage means different things to each of them. */
function turnYoursFor(stage, role, twoStep, track){
  const live = (stage === 'published' || stage === 'closeout' || stage === 'closeout-approved');
  const co   = (stage === 'published' && track === 'change_order');
  switch(role){
    case 'manager':
      if(co)                 return 'If something is wrong with the change order, hand it off with a comment — request an edit and send it back for approval.';
      if(stage === 'published') return 'Nothing to action. You will be asked again if a change order needs approving.';
      if(stage === 'closeout')  return 'Nothing to action — the admin signs the closeout off.';
      return 'Nothing yet. It reaches you once the admin has finished their review.';
    case 'admin':
      if(stage === 'awaiting-pub') return 'Your review is done. You can recall the scope if something needs changing before it goes live.';
      return 'Nothing to action from here.';
    case 'contractor':
      if(co)                 return 'Keep working the approved lines. Anything the change order touches is on hold until it is approved.';
      if(stage === 'published') return 'Keep shopping products and marking tasks complete as you go.';
      if(live)               return 'Nothing to action. Your work is being signed off.';
      return 'Nothing yet — the scope is not live. You get access once it is published.';
    case 'field_agent':
      if(stage === 'edit' || stage === 'submitted') return 'Keep adding what you found on site until the scope is handed off.';
      if(co) return 'You can hand the change order on with a comment if you saw something on site that affects it.';
      return 'Nothing to action — the scope has moved past scoping.';
    case 'renter':
      return 'Nothing to action. You can view the scope, without pricing.';
    default:
      return 'Nothing to action from here.';
  }
}
/* Who picks it up after the person whose move it is now. */
function turnNextFor(stage, twoStep){
  switch(stage){
    // This paragraph only renders when the move is yours, so it can address you
    // directly. Review is the admin's own next step, not a handover to someone
    // else — saying "it goes to the admin" to the admin read as a dead loop.
    case 'edit':
    case 'submitted':    return twoStep ? 'You review it next, then the manager publishes.'
                                        : 'You review it next, then publish.';
    case 'reviewing':    return twoStep ? 'It goes to the manager to publish.' : 'Publishing is yours too — the scope goes live.';
    case 'review-done':  return 'It goes to the manager to publish.';
    case 'awaiting-pub': return 'The scope goes live and the contractor starts work.';
    case 'published':    return 'Closeout review follows once the work is done.';
    case 'closeout':     return 'The project is complete.';
    default:             return '';
  }
}
function renderTurnPop(){
  let el = document.getElementById('turnPop');
  if(!turnPopOpen){ if(el) el.remove(); return; }
  const chip = document.querySelector('.stage.active .stage-turn');
  if(!chip){ turnPopOpen = false; if(el) el.remove(); return; }
  const t = whoseTurn(viewStage, state.role, state.twoStep);
  if(!t.role){ turnPopOpen = false; if(el) el.remove(); return; }
  if(!el){ el = document.createElement('div'); el.id = 'turnPop'; document.body.appendChild(el); }
  const roleName = (ROLES.find(r => r.id === t.role) || {}).name || t.role;
  // Where the stage counts decisions, say how far along they are — "waiting on
  // someone" is a lot more actionable with "9 of 18 reviewed" under it.
  const d = window.__KAI_DECISION || {};
  const prog = (d.total && !d.ready)
    ? `<div class="turn-pop-prog"><b>${d.done} of ${d.total}</b> ${d.verb === 'approve' ? 'approved' : 'reviewed'}</div>`
    : (d.total && d.ready ? `<div class="turn-pop-prog is-done"><b>All ${d.total}</b> ${d.verb === 'approve' ? 'approved' : 'reviewed'} — ready</div>` : '');
  const r = chip.getBoundingClientRect();
  const track = state.workTrack || '';
  /* Two labelled paragraphs: who holds the move and what for, then what YOU can
     do about it. The old single sentence stated the holder's obligation with no
     subject — "Track the work and submit closeout" read as an instruction to
     whoever was looking, which is exactly wrong when it is someone else's. */
  const p1 = t.mine
    ? `<span class="turn-pop-lbl">You</span> ${turnMineFor(viewStage, state.twoStep, track)}`
    : `<span class="turn-pop-lbl">Waiting on</span> ${t.who} (${roleName}) ${turnNeedFor(viewStage, state.twoStep, track)}.`;
  const p2 = t.mine
    ? (turnNextFor(viewStage, state.twoStep) ? `<span class="turn-pop-lbl">Then</span> ${turnNextFor(viewStage, state.twoStep)}` : '')
    : `<span class="turn-pop-lbl">You</span> ${turnYoursFor(viewStage, state.role, state.twoStep, track)}`;
  // No stage eyebrow. The stepper node the chip sits on already carries the
   // stage, so printing it again at the top of the card was the third time it
   // appeared in the same corner of the screen.
  el.innerHTML = `<div class="turn-pop-card" role="dialog" aria-label="Whose turn it is"
      style="top:${Math.round(r.bottom + 8)}px;left:${Math.round(r.left)}px">
    <div class="turn-pop-who"><span class="turn-pop-av${t.mine ? ' is-mine' : ''}">${t.initials}</span>
      <span class="turn-pop-name"><b>${t.who}</b><span class="turn-pop-role">${roleName}</span></span></div>
    <div class="turn-pop-p">${p1}</div>
    ${p2 ? `<div class="turn-pop-p">${p2}</div>` : ''}
    ${prog}
  </div>`;
}
/* Anywhere else closes it. Registered once — the popover is rebuilt, not this. */
document.addEventListener('click', e => {
  if(!turnPopOpen) return;
  if(e.target.closest && (e.target.closest('#turnPop') || e.target.closest('.stage-turn'))) return;
  closeTurnPop();
});
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeTurnPop(); });

/* ── whose turn is it ─────────────────────────────────────────────────
   One predicate, read by all three surfaces that answer the question: the
   stepper's active node, the primary CTA, and the caption under the stepper.
   They each used to infer it from `stage` independently, which is how the app
   CTA ended up offering the manager's publish gate to an admin — it never
   checked role at all, so a 2-step approval could be completed by the person
   2-step exists to keep out.

   The people are the same ones the panel's sign-off roster names, so "waiting
   on T. Okafor" here and a pending Manager signature there are one fact. The
   viewer is always whichever role the demo picker is set to, so `mine` is a
   role comparison, not an identity lookup. */
const ROLE_PEOPLE = {
  field_agent: {name:'M. Alvarez', initials:'MA'},
  admin:       {name:'A. Novak',   initials:'AN'},
  manager:     {name:'T. Okafor',  initials:'TO'},
  contractor:  {name:'Apex Carpentry', initials:'AC'},
  renter:      {name:'Resident',   initials:'R'},
};
/* Which role owes the next move at a stage. Null where nobody does — a
   terminal stage is nobody's turn, and saying "waiting on X" there would
   invent an obligation. */
function turnRoleFor(stage, twoStep){
  switch(stage){
    case 'edit':
    case 'submitted':     return 'admin';
    case 'reviewing':     return 'admin';
    case 'review-done':   return 'admin';
    // The whole point of 2-step: the publish belongs to the manager, and to
    // the admin only when the second step is switched off.
    case 'awaiting-pub':  return twoStep ? 'manager' : 'admin';
    case 'published':     return 'admin';
    case 'closeout':      return 'admin';
    default:              return null;   // closeout-approved — done
  }
}
/* {mine, role, who, initials}. `mine` is the only thing most callers need;
   the rest is for naming the person you are waiting on. */
function whoseTurn(stage, role, twoStep){
  const owner = turnRoleFor(stage, twoStep);
  if(!owner) return {mine:false, role:null, who:null, initials:null};
  const p = ROLE_PEOPLE[owner] || {name:owner, initials:'?'};
  return {mine: role === owner, role:owner, who:p.name, initials:p.initials};
}

const STAGES = [
  {id:'edit',          name:'Edit',           sub:'Draft',                 iframe:'ProjectReview_ScopePanel_ShopEdit.html'},
  {id:'submitted',     name:'Hand off',       sub:'Locked',                iframe:'ProjectReview_ScopePanel_ShopEdit.html'},
  {id:'reviewing',     name:'Review',         sub:'Admin reviewing',       iframe:'ProjectReview_ScopePanel_ShopEdit.html'},
  {id:'review-done',   name:'Review finished',sub:'Awaiting publish',      iframe:'ProjectReview_ScopePanel_ShopEdit.html'},
  {id:'awaiting-pub',  name:'Awaiting publish',sub:'Manager to review',    iframe:'ProjectReview_ScopePanel_ShopEdit.html'},
  {id:'published',     name:'Published',      sub:'Live to externals',     iframe:'ProjectReview_ScopePanel_ShopEdit.html'},
  // Closeout now uses the same ScopePanel iframe as the earlier steps so the
  // left panel reads identically. Right panel picks up the Artifact tab which
  // will act as the closeout review surface until a dedicated Compare tab is
  // wired in. Compare tool still exists in ProjectReview_Compare.html for reuse.
  {id:'closeout',      name:'Closeout',       sub:'Compare before/after',  iframe:'ProjectReview_ScopePanel_ShopEdit.html'},
  {id:'closeout-approved', name:'Closeout approved', sub:'Project complete', iframe:'ProjectReview_ScopePanel_ShopEdit.html'},
];

// 5-step user-facing model — Edit · Review · Publish · Work (Labor + Materials) · Close out.
// The stepper renders these groups; the actbar shows the fine-grained sub-status.
// Work is a branched supergroup: two parallel tracks after publish (labor progress
// and material procurement), which merge back at Close out.
const SUPER_STAGES = [
  // SCOPE covers the full authoring + review + publish lifecycle. Edit and View
  // are internal modes (surfaced inside the scope panel, not in the stepper).
  {id:'scope',    name:'Scope',    substages:['edit','submitted','reviewing','review-done','awaiting-pub'], home:'edit'},
  // WORK (formerly "Construction") — the doing phase. Labor / Material procurement
  // still exist as internal work-track modes for iframe routing, but they no
  // longer render as sub-nodes in the stepper.
  {id:'work',     name:'Work',     substages:['published'], home:'published'},
  // Closeout owns both the review substage AND the fully-approved terminal
  // substage. `closeout-approved` is the project's post-completion state —
  // the stepper is suppressed on this substage (see renderStages) since
  // there's no further step to visualise.
  {id:'closeout', name:'Closeout', substages:['closeout','closeout-approved'], home:'closeout'},
];
function superForStage(stageId){
  return SUPER_STAGES.find(s => s.substages.includes(stageId));
}
// Preferred substage to land on when a role clicks a supergroup: use the
// project's current substage if it's inside this group, else the group home.
function landingSubstage(supergroupId){
  const sg = SUPER_STAGES.find(s=>s.id===supergroupId); if(!sg) return null;
  // Currently inside this supergroup — keep the exact substage.
  if(sg.substages.includes(state.projectStage)) return state.projectStage;
  // Project has already completed this supergroup (user is clicking back to view
  // it after moving on). Land on the group's LAST substage — for Scope that's the
  // "review finished" view (read-only artifact), avoiding the edit-lock modal
  // that fires when viewStage='edit' but projectStage='published'/'closeout'.
  const projIdx = SUPER_STAGES.findIndex(s => s.substages.includes(state.projectStage));
  const thisIdx = SUPER_STAGES.findIndex(s => s === sg);
  if(projIdx > thisIdx && sg.substages.length){
    // Prefer the last substage that isn't itself gated by 2-step approval.
    const preferred = sg.substages.filter(sub => sub !== 'awaiting-pub' || state.twoStep);
    return preferred[preferred.length - 1] || sg.substages[sg.substages.length - 1];
  }
  return sg.home;
}

// What each role is allowed to do at each stage. Read as "given this role,
// which stages can I work in?"
const ROLE_ACCESS = {
  // 'published' so a field agent can see a live scope. They hold no decision
  // there, but they are the person on site — a change order under review is
  // exactly the thing they may have context on, and they need the stage in
  // view to hand it on. Without this, switching to field agent at a live stage
  // bounced them back to 'submitted'.
  field_agent: ['edit','submitted','published'],
  admin:       ['edit','submitted','reviewing','review-done','awaiting-pub','published','closeout','closeout-approved'],
  manager:     ['submitted','reviewing','review-done','awaiting-pub','published','closeout','closeout-approved'],
  contractor:  ['published','closeout','closeout-approved'],
  renter:      ['published'],
};

// What is the user's *home* stage given role + current project stage?
// Used when role changes and we want to land them somewhere useful.
function homeStage(role, projectStage){
  const access=ROLE_ACCESS[role]||[];
  // First try to keep them on the current stage if accessible
  if(access.includes(projectStage)) return projectStage;
  // Otherwise pick the most advanced stage they're allowed in that's <= project stage
  const stageOrder=STAGES.map(s=>s.id);
  const projIdx=stageOrder.indexOf(projectStage);
  for(let i=projIdx;i>=0;i--){
    if(access.includes(stageOrder[i])) return stageOrder[i];
  }
  // Fall back to their first accessible stage
  return access[0]||'edit';
}

/* ════════════ DEMO PRESETS ════════════ */
/* Demo scenarios. The step number is the scenario's position in the VISIBLE
   list, computed in renderPresets — not stored here. It used to be a hardcoded
   `step` field pinned to the full list, so with the 2-step preset filtered out
   (the default) the menu read 1, 2, 3, 5, 6, 7, 8 with a hole where step 4
   should be. Deriving it keeps the sequence contiguous in both modes and
   removes the second source of truth. */
const PRESETS = [
  {id:'empty-draft',        name:'Empty draft',                desc:'Fresh project, no tasks. Start building the scope from scratch.',
    state:{role:'admin', projectStage:'edit', viewStage:'edit', scopeSeed:'empty'}},
  {id:'populated-draft',    name:'Populated draft',            desc:'Scope pre-built with tasks across all rooms. Ready to hand off for review.',
    state:{role:'admin', projectStage:'edit', viewStage:'edit', scopeSeed:'full'}},
  {id:'mid-review',         name:'Handed off, admin reviewing', desc:'Scope has been handed off and admin is actively reviewing tasks.',
    state:{role:'admin', projectStage:'reviewing', viewStage:'reviewing', scopeSeed:'full'}},
  // Only relevant when the 2-step approval flow is on — filtered out by renderPresets otherwise.
  {id:'awaiting-publish',   name:'Review complete, awaiting publish', desc:'Admin approved the review. Manager needs to approve and publish (2-step).', twoStepOnly:true,
    state:{role:'manager', projectStage:'awaiting-pub', viewStage:'awaiting-pub', scopeSeed:'full', twoStep:true}},
  {id:'construction-labor', name:'Scope approved', desc:'Scope is live and released to the field. Nothing has been started yet.',
    state:{role:'admin', projectStage:'published', viewStage:'published', scopeSeed:'full', workTrack:'labor'}},
  {id:'construction-materials', name:'Scope approved, tasks in progress', desc:'Work is under way. Tasks sit at mixed statuses across the job.',
    state:{role:'contractor', projectStage:'published', viewStage:'published', scopeSeed:'full', workTrack:'materials'}},
  {id:'change-order-review', name:'Change order review', desc:'Work is under way and a change order has been submitted against the live scope. Admin reviewing it before approval.',
    state:{role:'admin', projectStage:'published', viewStage:'published', scopeSeed:'full', workTrack:'change_order'}},
  {id:'closeout',           name:'Close out review',           desc:'Work is done. Admin comparing before/after photos to sign off.',
    state:{role:'admin', projectStage:'closeout', viewStage:'closeout', scopeSeed:'full'}},
  {id:'closeout-approved',  name:'Closeout approved',          desc:'Admin has signed off. Project is complete — read-only view.',
    state:{role:'admin', projectStage:'closeout-approved', viewStage:'closeout-approved', scopeSeed:'full'}},
];
function presetLabel(p, n){ return `Step ${n} · ${p.name}`; }

/* ════════════ PERSISTED STATE ════════════ */
const DEFAULTS={
  role:'admin',
  projectStage:'edit',   // where the project actually is in its lifecycle
  twoStep:true,          // 2-step approval enabled
  scopeSeed:'empty',     // 'empty' | 'full' — seeds the scope builder iframe
  preset:'empty-draft',  // last-applied preset id (for highlighting)
  workTrack:'materials', // 'labor' | 'materials' — which track user is on at Work stage
};
let state=loadState();
function loadState(){
  try{
    const raw=localStorage.getItem('kai_comp_state');
    if(!raw) return {...DEFAULTS};
    return {...DEFAULTS, ...JSON.parse(raw)};
  }catch(e){ return {...DEFAULTS}; }
}
function saveState(){
  try{ localStorage.setItem('kai_comp_state', JSON.stringify(state)); }catch(e){}
}

/* current view stage (may differ from project stage when role can't access project stage) */
let viewStage=null;

/* ════════════ RENDER ════════════ */
function render(){
  if(!viewStage) viewStage = homeStage(state.role, state.projectStage);
  // Ensure current viewStage is still accessible
  const access=ROLE_ACCESS[state.role]||[];
  if(!access.includes(viewStage)) viewStage=homeStage(state.role, state.projectStage);

  renderRoleMenu();
  renderPresets();
  renderVersionChip();
  renderVersionNotice();
  renderStages();
  renderActBar();
  renderActions();
  renderIframe();
  syncAppApproveBtn();
  syncSettings();
}

function renderRoleMenu(){
  const menu=document.getElementById('roleMenu');
  menu.innerHTML=ROLES.map(r=>`
    <button class="tb-role-opt${state.role===r.id?' on':''}" onclick="setRole('${r.id}')">
      <span class="ck"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5L5 9L9.5 3.5"/></svg></span>
      <span class="l"><span class="n">${r.name}</span><span class="d">${r.desc}</span></span>
    </button>
  `).join('')+`
    <div class="tb-role-foot">
      <span class="lbl">Switch role · for testing the flow</span>
    </div>`;
  const lbl=ROLES.find(r=>r.id===state.role);
  document.getElementById('roleLabel').textContent = lbl?lbl.name:'—';
}

function renderPresets(){
  const wrap=document.getElementById('tbPresets');
  if(!wrap) return;
  // Hide 2-step-only presets when 2-step approval is turned off in the demo settings.
  const visible = PRESETS.filter(p => !(p.twoStepOnly && !state.twoStep));
  /* The 2-step preset doesn't take a number of its own — it's a variant of the
     review step, not a step after it, and letting it consume one pushed every
     later scenario's number up whenever the toggle was on. It shows as "3+"
     beside the step it varies, and the main line stays 1..7 in both modes. */
  let n = 0;
  const nums = visible.map(p => p.twoStepOnly ? `${n}+` : `${++n}`);
  wrap.innerHTML = visible.map((p,i)=>`
    <button class="tb-preset${state.preset===p.id?' on':''}" onclick="applyPreset('${p.id}')">
      <span class="tb-preset-num">${nums[i]}</span>
      <span class="tb-preset-l">
        <div class="tb-preset-n">${presetLabel(p, nums[i])}</div>
        <div class="tb-preset-d">${p.desc}</div>
      </span>
    </button>
  `).join('');
}

function applyPreset(id){
  const p=PRESETS.find(x=>x.id===id); if(!p) return;
  Object.assign(state, p.state, {preset:id});
  saveState();
  viewStage = p.state.viewStage || null;
  // Force iframe reload so seed param takes effect
  const ifr=document.getElementById('iframe');
  if(ifr) ifr.setAttribute('src','');
  render();
  document.getElementById('tbSet').classList.remove('open');
  toast(`Loaded · ${presetLabel(p)}`);
}

/* ── Scope versions (git-branch model, demo data). Each version is a snapshot
   of the scope at a point in time. Current version tracks the live project;
   older versions are read-only archives that reflect that historical state. */
// v3 is always the "live" version — its tag reflects the current project state.
// v1 + v2 are historical/approved versions that never change their tag or budget.
const VERSIONS = [
  {id:'v3', num:3, at:'May 6, 2026',  budget:'$26,370'},   // tag/tagCls injected dynamically via v3StatusTag()
  {id:'v2', num:2, at:'Apr 22, 2026', budget:'$25,130', tag:'Outdated', tagCls:'outdated'},
  {id:'v1', num:1, at:'Apr 12, 2026', budget:'$24,890', tag:'Original', tagCls:'archived'},
];
let currentVersionId = 'v3';

// v3's tag pill mirrors the project stage the user is currently viewing.
// (currentVersionId is declared just above this block.)
function v3StatusTag(){
  const proj = state.projectStage;
  if(proj==='edit')       return {tag:'In Draft',  tagCls:'archived'};
  if(proj==='submitted')  return {tag:'Handed off', tagCls:'outdated'};
  if(proj==='reviewing' || proj==='review-done' || proj==='awaiting-pub')
                          return {tag:'In Review', tagCls:'outdated'};
  if(proj==='published' || proj==='closeout')
                          return {tag:'Current',   tagCls:''};
  return {tag:'In Draft', tagCls:'archived'};
}
// Return the effective tag/tagCls for any version (v3 dynamic; v1/v2 static).
function versionTag(v){
  if(v.id === 'v3') return v3StatusTag();
  return {tag:v.tag||'', tagCls:v.tagCls||''};
}
// Meta line under a version's title in the dropdown. v3 shows "Live" once
// approved and "Working copy" while still being drafted / in review.
function versionMeta(v){
  if(v.id === 'v3'){
    const proj = state.projectStage;
    if(proj==='published' || proj==='closeout') return `Approved ${v.at}`;
    return `Working copy · started ${v.at}`;
  }
  return `Approved ${v.at}`;
}

function toggleVersion(e){
  e.stopPropagation();
  const chip = document.getElementById('verChip');
  chip.classList.toggle('open');
  // Close other dropdowns
  document.getElementById('tbSet')?.classList.remove('open');
  document.getElementById('tbRole')?.classList.remove('open');
  if(chip.classList.contains('open')) renderVersionMenu();
}
function renderVersionMenu(){
  const menu = document.getElementById('verMenu');
  if(!menu) return;
  menu.innerHTML = `<div class="ver-menu-h">Scope versions</div>` +
    VERSIONS.map(v => {
      const isCur = v.id === currentVersionId;
      const isLive = v.id === 'v3';
      const {tag, tagCls} = versionTag(v);
      const tagChip = tag ? `<span class="ver-item-badge ${tagCls}">${tag}</span>` : '';
      return `<button class="ver-item${isCur?' on':''}${isLive?' current':''}" onclick="switchVersion('${v.id}')">
        <div class="ver-item-node"><span class="ver-item-dot"></span></div>
        <div class="ver-item-l">
          <div class="ver-item-title">
            <span class="ver-item-num">v${v.num}</span>
            ${tagChip}
          </div>
          <div class="ver-item-meta">${versionMeta(v)}</div>
        </div>
        <div class="ver-item-r">${v.budget||''}</div>
      </button>`;
    }).join('');
}
function switchVersion(id){
  // The version chip lives in the iframe now, so shell-triggered switches
  // (Return to current button, outdated-lock modal) forward the intent to
  // the iframe. Iframe updates its local state + UI, then postmessages
  // 'kai-version-changed' back which our listener uses to update mirrors
  // + re-render the state bar / lock modal.
  const iframe = document.getElementById('iframe');
  if(iframe && iframe.contentWindow){
    iframe.contentWindow.postMessage({type:'kai-set-version', versionId:id}, '*');
  }
}
// Push the currently-selected version's budget into the iframe so its sidebar
// rollup matches the version dropdown's amount, plus an `archived` flag so the
// iframe can render the total in a muted color when viewing v1 / v2.
function pushScopeTotalToIframe(){
  const v = VERSIONS.find(x => x.id === currentVersionId);
  if(!v) return;
  const ifr = document.getElementById('iframe');
  if(!ifr || !ifr.contentWindow) return;
  const archived = currentVersionId !== 'v3';
  try { ifr.contentWindow.postMessage({type:'kai:scope-total', total: v.budget, archived}, '*'); } catch(e){}
}
function renderVersionChip(){
  const v = VERSIONS.find(x => x.id === currentVersionId) || VERSIONS[0];
  const labelEl = document.getElementById('verChipLabel');
  const tagEl = document.getElementById('verChipTag');
  if(labelEl) labelEl.textContent = 'v' + v.num;
  if(tagEl){
    const {tag, tagCls} = versionTag(v);
    tagEl.textContent = tag;
    tagEl.className = 'ver-chip-tag ' + (tagCls || '');
  }
}
// State bar that sits above the iframe. It expresses "which scope version
// you're on, what mode you're in, and what to do next" as a single row so
// the sidebar can drop its own chips and buttons.
//
// Modes:
//   • outdated (viewing v1 / v2) — read-only warning + "Return to current"
//   • draft    (v3, projectStage draft-family) — accent bar + Submit for review
//   • edit-co  (v3, approved stage, scope-edit-mode on in iframe) — change-order editing
//   • view     (v3, approved stage, no edit mode) — quiet "View-only" caption
//   • pending  (v3, submitted / reviewing) — quiet status caption, no CTA
/* ── Dispatch ─────────────────────────────────────────────────────────
   Field agents on this property's market bench. In the product this comes
   from the market attached at project setup; here it's a list you can edit.
   The first is the market default, which is why it's pre-selected. */
const DISPATCH_BENCH = [
  {id:'sc', name:'Sarah Chen',    initials:'SC', role:'Field agent', isDefault:true},
  {id:'mw', name:'Marcus Webb',   initials:'MW', role:'Field agent'},
  {id:'pr', name:'Priya Raman',   initials:'PR', role:'Field agent'},
  {id:'de', name:'Devon Ellis',   initials:'DE', role:'Field agent'},
  {id:'to', name:'Tasha Okonkwo', initials:'TO', role:'Field agent'},
];
const DISPATCH_PROJECT = {
  address: '3484 South Main Street, Wilmington NC 28403',
  ref: 'KAI-4821',
};
let dispatchOpen = false;
let dispatchPicking = false;
let dispatchAssignee = DISPATCH_BENCH[0].id;
/* Set once dispatched. The button retires on this, and it's what a later
   build would read to show who has it. */
let dispatched = null;   // {who, at}

function openDispatch(){
  dispatchOpen = true;
  dispatchPicking = false;
  renderDispatch();
}
function closeDispatch(){
  dispatchOpen = false;
  dispatchPicking = false;
  renderDispatch();
}
function dispatchPick(){
  dispatchPicking = true;
  renderDispatch();
}
/* Choosing returns to the confirm view rather than dispatching — picking who
   and deciding to send are two different intentions. */
function dispatchChoose(id){
  dispatchAssignee = id;
  dispatchPicking = false;
  renderDispatch();
}
function dispatchConfirm(){
  const who = DISPATCH_BENCH.find(a => a.id === dispatchAssignee) || DISPATCH_BENCH[0];
  dispatched = {who: who.name, at: new Date()};
  dispatchOpen = false;
  dispatchPicking = false;
  renderDispatch();
  renderVersionNotice();
  if(typeof toast === 'function') toast(`Dispatched to ${who.name}`);
}
function _dispatchRowHtml(a){
  const on = a.id === dispatchAssignee;
  return `<button type="button" class="dsp-row${on ? ' is-on' : ''}" onclick="dispatchChoose('${a.id}')">
    <span class="dsp-av">${a.initials}</span>
    <span class="dsp-who">
      <span class="dsp-name">${a.name}</span>
      <span class="dsp-role">${a.role}</span>
    </span>
    ${a.isDefault ? `<span class="dsp-default">Default</span>` : ''}
    <span class="dsp-check">${on ? '<svg viewBox="0 0 14 14"><path d="M2.5 7.5l3 3 6-7"/></svg>' : ''}</span>
  </button>`;
}
function renderDispatch(){
  let el = document.getElementById('dspModal');
  if(!dispatchOpen){ if(el) el.remove(); return; }
  if(!el){
    el = document.createElement('div');
    el.id = 'dspModal';
    document.body.appendChild(el);
  }
  const cur = DISPATCH_BENCH.find(a => a.id === dispatchAssignee) || DISPATCH_BENCH[0];
  const body = dispatchPicking
    ? `<div class="dsp-lbl">Field agents in this market</div>
       <div class="dsp-list">${DISPATCH_BENCH.map(_dispatchRowHtml).join('')}</div>`
    : `<div class="dsp-assignee">
         <span class="dsp-av">${cur.initials}</span>
         <span class="dsp-who">
           <span class="dsp-name">${cur.name}</span>
           <span class="dsp-role">${cur.role}</span>
         </span>
         <button type="button" class="dsp-change" onclick="dispatchPick()">Change</button>
       </div>`;
  el.innerHTML = `<div class="dsp-scrim" onclick="closeDispatch()"></div>
    <div class="dsp-card" role="dialog" aria-modal="true" aria-label="Dispatch scope">
      <div class="dsp-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3L3 10.5l7 3 3 7L21 3z"/></svg>
      </div>
      <div class="dsp-title">Dispatch scope</div>
      <div class="dsp-meta">
        <div class="dsp-addr">${DISPATCH_PROJECT.address}</div>
        <div class="dsp-ref">Project #${DISPATCH_PROJECT.ref}</div>
      </div>
      ${body}
      <div class="dsp-acts">
        <button type="button" class="dsp-btn" onclick="closeDispatch()">Cancel</button>
        <button type="button" class="dsp-btn is-primary" onclick="dispatchConfirm()">Dispatch</button>
      </div>
    </div>`;
}
if(!window.__kaiDspBound){
  window.__kaiDspBound = true;
  document.addEventListener('keydown', e => {
    if(e.key !== 'Escape' || !dispatchOpen) return;
    e.stopPropagation();
    // Escape unwinds a step at a time: picker → confirm → closed.
    dispatchPicking ? (dispatchPicking = false, renderDispatch()) : closeDispatch();
  }, true);
}

function renderVersionNotice(){
  const notice = document.getElementById('verNotice');
  if(!notice) return;
  const v = VERSIONS.find(x => x.id === currentVersionId);
  if(!v){ notice.hidden = true; notice.innerHTML=''; notice.className='ver-notice'; return; }
  notice.className = 'ver-notice';
  // ── Outdated version ────────────────────────────────────────────────
  if(v.id !== 'v3'){
    notice.hidden = false;
    notice.innerHTML = `
      <span class="ver-notice-tag">Viewing v${v.num}</span>
      <span class="ver-notice-body">You're looking at an <b>outdated scope</b> from ${v.at}. Changes made here are read-only.</span>
      <button class="ver-notice-btn" onclick="switchVersion('v3')">Return to current</button>`;
    return;
  }
  // ── v3: state depends on projectStage (+ iframe edit-mode signal) ───
  const proj = state.projectStage;
  const draftFamily = ['edit'].includes(proj);           // still authoring
  const inReview    = ['submitted','reviewing','review-done','awaiting-pub'].includes(proj);
  const approved    = ['published','closeout'].includes(proj);
  if(draftFamily){
    notice.hidden = false;
    notice.classList.add('is-draft');
    notice.innerHTML = `
      <span class="ver-notice-tag">v3 draft</span>
      <span class="ver-notice-mode">Editing</span>
      <span class="ver-notice-body">Hand off changes to admin for review when you're done.</span>
      <button class="ver-notice-btn is-primary" onclick="submitScopeForReview()">Hand off for review</button>`;
    return;
  }
  if(inReview){
    const stateWord = proj==='reviewing' ? 'in review'
                    : proj==='review-done' ? 'reviewed'
                    : proj==='awaiting-pub' ? 'awaiting publish'
                    : 'submitted';
    notice.hidden = false;
    notice.innerHTML = `
      <span class="ver-notice-tag">v3 ${stateWord}</span>
      <span class="ver-notice-mode">View-only</span>
      <span class="ver-notice-body">Your scope is with admin. If you want to make changes before they respond, send it back to draft first.</span>
      <button class="ver-notice-btn" onclick="sendBackToDraft()">Send back to draft</button>`;
    return;
  }
  if(approved){
    // If the iframe has told us it's in edit-mode (change order), reflect that.
    const editing = !!window.__KAI_IFRAME_EDIT_MODE;
    notice.hidden = false;
    if(editing){
      notice.innerHTML = `
        <span class="ver-notice-tag">v3 current</span>
        <span class="ver-notice-mode">Editing</span>
        <span class="ver-notice-body">Changes are sent to admin for review as a change order.</span>
        <button class="ver-notice-btn is-primary" onclick="submitScopeForReview()">Hand off for review</button>`;
    } else {
      notice.innerHTML = `
        <span class="ver-notice-tag">v3 current</span>
        <span class="ver-notice-mode">View-only</span>
        <span class="ver-notice-body">This scope is approved. To make changes, we'll create a draft copy you can hand off to admin for review.</span>
        <button class="ver-notice-btn" onclick="duplicateAndEdit()">Duplicate &amp; edit</button>`;
    }
    return;
  }
  notice.hidden = true;
  notice.innerHTML = '';
}
// Fire the iframe's own approveAll flow so this button behaves identically
// to the (now-hidden) toolbar Submit for review button.
function submitScopeForReview(){
  const iframe = document.querySelector('.stage-frame');
  if(iframe && iframe.contentWindow){
    iframe.contentWindow.postMessage({type:'kai-submit-scope'}, '*');
  }
}
// Approved-scope "Duplicate & edit" — the bar copy already explains the fork
// so we skip the intermediate modal and just tell the iframe to enter edit
// mode directly. Iframe re-uses the existing confirmEditFromApproved handler
// so behavior is identical to clicking through the modal manually.
function duplicateAndEdit(){
  const iframe = document.querySelector('.stage-frame');
  if(iframe && iframe.contentWindow){
    iframe.contentWindow.postMessage({type:'kai-duplicate-edit'}, '*');
  }
}
// ── App-toolbar handlers ────────────────────────────────────────────────
/* Group by + Filters live in the iframe's work-hdr now — no shell handlers needed. */
// Approve CTA fires the same postMessage the iframe's state-bar Submit uses,
// which triggers approveAll() inside the iframe. Label + visibility are set
// by syncAppApproveBtn() below based on the current stage.
function triggerIframeApprove(){
  // Gate: Submit Closeout requires every task marked Completed. The button
  // is disabled in that case, but guard here too in case someone bypasses
  // the disabled attribute.
  if(state.projectStage === 'published' && !window.__KAI_ALL_TASKS_COMPLETE){
    return;
  }
  // Draft CTA: open the local Submit-for-review confirmation modal so
  // clicking the top-nav "Submit Scope" in the draft scenarios (Steps 1-2)
  // advances the demo to Step 3 (submitted, admin reviewing) — same flow
  // as the sidebar state-bar button.
  if(state.projectStage === 'edit'){
    submitForReview();
    return;
  }
  // Closeout-review CTA: route through the local approveCloseout flow
  // so clicking the primary button in Step 7 advances the demo to Step 8
  // (closeout-approved) instead of just pinging the iframe.
  if(state.projectStage === 'closeout'){
    approveCloseout();
    return;
  }
  const iframe = document.getElementById('iframe');
  if(iframe && iframe.contentWindow){
    iframe.contentWindow.postMessage({type:'kai-submit-scope'}, '*');
  }
}
// Fired by the Cancel Change Order button. The iframe reverts every
// snapshot-tracked change back to originals, which auto-fires an
// `kai-edit-mode: on:false` back to us — that resyncs the CTA label.
function triggerIframeCancelCo(){
  const iframe = document.getElementById('iframe');
  if(iframe && iframe.contentWindow){
    iframe.contentWindow.postMessage({type:'kai-cancel-change-order'}, '*');
  }
}
// Keep the app-toolbar's Approve button label + visibility in sync with the
// current stage. Draft is fully covered by the yellow state bar so we hide
// the toolbar CTA there; other stages get a stage-appropriate label.
/* How far the sidebar's review or approval has got. The panel posts this on
   every render; the CTA reads it. */
window.__KAI_DECISION = null;   // {verb, done, total, ready}

/* Confirmation for the stage CTA. The per-task boxes toggle freely — this is
   the step that can't be undone by clicking again. */
function _stageConfirmCopy(){
  const proj = state.projectStage;
  if(proj === 'reviewing') return {
    title: 'Mark scope reviewed',
    body: 'This sends the scope on for approval. You can still change your review until it is approved.',
    cta: 'Scope reviewed',
  };
  return {
    title: 'Approve and publish',
    body: 'This publishes the scope and releases it to the field. Further changes become change orders.',
    cta: 'Approve & publish',
  };
}
let stageConfirmOpen = false;
function openStageConfirm(){
  stageConfirmOpen = true;
  renderStageConfirm();
}
function closeStageConfirm(){
  stageConfirmOpen = false;
  renderStageConfirm();
}
function confirmStageAdvance(){
  stageConfirmOpen = false;
  renderStageConfirm();
  triggerIframeApprove();
}
function renderStageConfirm(){
  let el = document.getElementById('stageConfirm');
  if(!stageConfirmOpen){ if(el) el.remove(); return; }
  if(!el){
    el = document.createElement('div');
    el.id = 'stageConfirm';
    document.body.appendChild(el);
  }
  const c = _stageConfirmCopy();
  const d = window.__KAI_DECISION || {};
  el.innerHTML = `<div class="dsp-scrim" onclick="closeStageConfirm()"></div>
    <div class="dsp-card is-narrow" role="dialog" aria-modal="true">
      <div class="dsp-title">${c.title}</div>
      <div class="dsp-confirm-body">${c.body}</div>
      ${d.total ? `<div class="dsp-confirm-n">${d.total} task${d.total === 1 ? '' : 's'}</div>` : ''}
      <div class="dsp-acts">
        <button type="button" class="dsp-btn" onclick="closeStageConfirm()">Cancel</button>
        <button type="button" class="dsp-btn is-primary" onclick="confirmStageAdvance()">${c.cta}</button>
      </div>
    </div>`;
}

function syncAppApproveBtn(){
  const btn = document.getElementById('appApproveBtn');
  const tipEl = document.getElementById('appApproveTip');
  const cancelBtn = document.getElementById('appCancelCoBtn');
  const hoBtn = document.getElementById('appHandoffBtn');
  if(!btn) return;
  // Off unless a branch below turns it on — otherwise it survives a role or
  // stage change that no longer offers a hand-off.
  if(hoBtn) hoBtn.hidden = true;
  const proj = state.projectStage;
  // Hide entirely when viewing an archived / outdated scope (v1 / v2).
  if(currentVersionId && currentVersionId !== 'v3'){
    btn.hidden = true;
    if(cancelBtn) cancelBtn.hidden = true;
    return;
  }
  // Draft: state bar owns the CTA.
  // Terminal state — project is complete, no CTA to act on.
  if(proj === 'closeout-approved'){
    btn.hidden = true;
    if(cancelBtn) cancelBtn.hidden = true;
    return;
  }
  btn.hidden = false;
  // Change-order-active override: when the iframe reports staged edits
  // AND we're in a stage where those edits create a Change Order
  // (published = Work in progress, closeout = Closeout submitted),
  // swap the primary CTA to "Submit Change Order" and reveal the
  // Cancel Change Order ghost button on its left.
  const inCoStage = (proj === 'published' || proj === 'closeout');
  const coActive  = inCoStage && !!window.__KAI_IFRAME_EDIT_MODE;
  if(coActive){
    btn.textContent = 'Submit Change Order';
    if(cancelBtn) cancelBtn.hidden = false;
    return;
  }
  if(cancelBtn) cancelBtn.hidden = true;
  // Step 1: an empty scope has nothing to submit, so the CTA is the
  // handoff to a field agent. It retires once dispatched.
  if(proj === 'edit' && state.scopeSeed === 'empty'){
    if(dispatched){ btn.hidden = true; if(tipEl) tipEl.hidden = true; return; }
    btn.textContent = 'Dispatch';
    btn.onclick = openDispatch;
    btn.disabled = false;
    if(tipEl) tipEl.hidden = true;
    return;
  }
  // Review and approval: the sidebar collects the decisions, so this is a
  // gate rather than the action. It can't fire until every task carries
  // one, and says how many are left until then.
  /* Not your move: the CTA becomes a statement of who owes it, not a disabled
     gate. A disabled gate reads as "your job, not finished yet" — which is the
     opposite of the truth here, and at awaiting-pub it also let an admin work
     through the manager's 18 approvals and publish. */
  const turn = whoseTurn(proj, state.role, state.twoStep);
  if(turn.role && !turn.mine){
    /* No decision here, but not necessarily nothing to do: at a change order a
       manager or field agent can still pass the document on with a note. Where
       that applies the CTA is a real action rather than a dead gate. */
    if(canHandOffHere()){
      /* A manager can send the change order on for review — that is the
         forward action, so it takes the primary — with Hand off beside it as
         the sideways one. A field agent has no submit to make, so for them
         Hand off IS the action and takes the primary itself. */
      if(state.role === 'manager'){
        if(hoBtn) hoBtn.hidden = false;
        btn.textContent = 'Submit for review';
        btn.disabled = false;
        btn.onclick = submitChangeOrderForReview;
      } else {
        btn.textContent = 'Hand off';
        btn.disabled = false;
        btn.onclick = openCoHandoff;
      }
      btn.hidden = false;
      if(tipEl) tipEl.hidden = true;
      return;
    }
    btn.textContent = 'Waiting on ' + turn.who;
    btn.disabled = true;
    btn.onclick = null;
    btn.hidden = false;
    if(tipEl) tipEl.hidden = true;
    return;
  }
  if(proj === 'reviewing' || proj === 'awaiting-pub'){
    const d = window.__KAI_DECISION || {};
    const label = proj === 'reviewing' ? 'Scope reviewed' : 'Approve & publish';
    btn.textContent = d.total && !d.ready ? `${d.done} of ${d.total} ${d.verb === 'approve' ? 'approved' : 'reviewed'}` : label;
    btn.disabled = !d.ready;
    btn.onclick = openStageConfirm;
    if(tipEl) tipEl.hidden = true;
    return;
  }
  btn.disabled = false;
  // Every other state keeps the approve path the button was born with.
  btn.onclick = triggerIframeApprove;
  // Step 2 only — Step 1 (empty scope) returned above with 'Dispatch'.
  if(proj === 'edit')           btn.textContent = 'Hand off Scope';
  else if(proj === 'review-done')btn.textContent = 'Send to publish';
  else if(proj === 'awaiting-pub')btn.textContent = 'Approve & publish';
  else if(proj === 'published') btn.textContent = 'Submit closeout';
  else if(proj === 'closeout')  btn.textContent = 'Approve Closeout';
  else                          btn.textContent = 'Approve scope';
  // "Submit closeout" gate — only enabled once every task is Completed.
  // Iframe reports the aggregate via postMessage (kai-tasks-complete). If we
  // haven't heard from it yet, assume not-all-complete so the button stays
  // gated pending confirmation.
  const tip = document.getElementById('appApproveTip');
  const gateCloseout = (proj === 'published');
  if(gateCloseout){
    const allDone = !!window.__KAI_ALL_TASKS_COMPLETE;
    btn.disabled = !allDone;
    if(tip) tip.hidden = allDone;
  } else {
    btn.disabled = false;
    if(tip) tip.hidden = true;
  }
}
// The iframe pings us whenever its scope-edit-mode flips (used for the
// approved-stage change-order case). We just re-render the state bar.
window.addEventListener('message', (e)=>{
  if(!e.data || typeof e.data !== 'object') return;
  if(e.data.type === 'kai-edit-mode'){
    window.__KAI_IFRAME_EDIT_MODE = !!e.data.on;
    renderVersionNotice();
    // Also swap the top-bar primary CTA (Submit closeout ↔ Submit Change
    // Order) + show/hide the Cancel Change Order ghost button.
    if(typeof syncAppApproveBtn === 'function') syncAppApproveBtn();
  }
  // The version chip now lives in the iframe's sidebar. When the user picks
  // a different version there, we mirror the id here so the state bar's
  // "outdated scope" messaging + the lock-overlay modal keep working.
  if(e.data.type === 'kai-version-changed'){
    const id = e.data.versionId;
    if(id && id !== currentVersionId){
      const changing = true;
      currentVersionId = id;
      if(changing) outdatedLockDismissed = false;
    }
    renderVersionNotice();
    syncAppApproveBtn();
    if(typeof renderIframe === 'function') renderIframe();
  }
  /* kai-group-by-changed + kai-filter-changed no longer needed — those
     controls live entirely in the iframe now. */
  // Sidebar state bar's "Send back to draft" button fires this. Shell owns
  // projectStage + the confirm-modal flow, so we run it here.
  if(e.data.type === 'kai-send-back-to-draft'){
    if(typeof sendBackToDraft === 'function') sendBackToDraft();
  }
  // Iframe photo-overlay modal opened/closed. Dim the shell's global nav
  // so the scrim visually continues across the iframe boundary.
  if(e.data.type === 'kai-photo-overlay'){
    document.body.classList.toggle('kai-photo-overlay-open', !!e.data.open);
  }
  // Iframe reports whether every task is marked Completed. Gate the
  // "Submit closeout" CTA on it — button is disabled until all tasks land
  // in the Completed state.
  if(e.data.type === 'kai-decision-progress'){
    window.__KAI_DECISION = {verb:e.data.verb, done:e.data.done,
                             total:e.data.total, ready:e.data.ready};
    syncAppApproveBtn();
    return;
  }
  if(e.data.type === 'kai-tasks-complete'){
    window.__KAI_ALL_TASKS_COMPLETE = !!e.data.allComplete;
    if(typeof syncAppApproveBtn === 'function') syncAppApproveBtn();
  }
});
// Close the dropdown when clicking outside
document.addEventListener('click', e => {
  const chip = document.getElementById('verChip');
  if(chip && chip.classList.contains('open') && !chip.contains(e.target)){
    chip.classList.remove('open');
  }
});

function renderStages(){
  const wrap=document.getElementById('stages');
  const capsWrap=document.getElementById('stageCaps');
  // Post-completion state: hide the stepper entirely and replace it with a
  // "Closeout Approved · Project completed" message in its place. There's
  // no further step to walk through, so a stepper is just noise.
  if(viewStage === 'closeout-approved'){
    if(capsWrap) capsWrap.innerHTML = '';
    wrap.innerHTML = `<div class="stages-completed">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21.5 18L11.5 23.5L1.5 18V7L11.5 1.5L21.5 7V18Z"/>
        <path d="M6 12.5L10.5 16.5L17 8.5"/>
      </svg>
      <span class="stages-completed-t">Closeout approved</span>
      <span class="stages-completed-sep">·</span>
      <span class="stages-completed-sub">Project is completed</span>
    </div>`;
    return;
  }
  // Stepper renders only relevant supergroups. `hidden:true` always skips it;
  // All non-hidden supergroups render — the stepper is now Scope · Work · Closeout.
  const visibleStages = SUPER_STAGES.filter(s => !s.hidden);
  const projSuper = superForStage(state.projectStage);
  const viewSuper = superForStage(viewStage);
  const projSuperIdx = visibleStages.findIndex(s=>s===projSuper);
  const access = ROLE_ACCESS[state.role] || [];
  // Per-stage caption slots: only the active supergroup's slot renders text.
  const captionText = messageFor(state.role, viewStage);
  /* The turn marker on the active node. Whose move it is stops being something
     you deduce from role + stage and becomes a match: this avatar against your
     own in the toolbar. Only the active node carries it — a past stage's turn
     is spent and a future one's isn't assigned yet. */
  const _turn = whoseTurn(viewStage, state.role, state.twoStep);
  const turnChip = _turn.role
    ? `<button class="stage-turn${_turn.mine ? ' is-mine' : ''}" type="button" aria-haspopup="dialog"
         onclick="event.stopPropagation();toggleTurnPop()"
         title="${_turn.mine ? 'Your move — click for detail' : 'Waiting on ' + _turn.who + ' — click for detail'}"
         >${_turn.mine ? 'You' : _turn.initials}</button>`
    : '';
  if(capsWrap) capsWrap.innerHTML = visibleStages.map(sg => {
    const isActive = sg === viewSuper;
    const branched = sg.branched ? ' stage-cap-branched' : '';
    return `<div class="stage-cap${branched}${isActive?' active':''}">${isActive?captionText:''}</div>`;
  }).join('');
  wrap.innerHTML = visibleStages.map((sg,i)=>{
    const accessible = sg.substages.some(sub => access.includes(sub));
    const isActive = sg === viewSuper;
    const isDone = projSuperIdx > i;
    const cls = [isActive?'active':'', isDone?'done':'', accessible?'accessible':'', sg.id==='work'||sg.id==='closeout'?'publish':''].filter(Boolean).join(' ');
    const sub = subStatusMeta(sg.id);
    // Branched supergroup (Work): render as two side-by-side sub-boxes.
    if(sg.branched){
      const tracks = sg.tracks.map((tr,ti) => {
        const trActive = isActive && state.workTrack === tr.id;
        return `<div class="stage-track${trActive?' active':''}${accessible?'':' locked'}"
                     onclick="${accessible?`event.stopPropagation();jumpWorkTrack('${tr.id}')`:''}"
                     title="${tr.sub}">
          <span class="stage-track-name">${tr.name}</span>
        </div>`;
      }).join('');
      return `<div class="stage stage-branched ${cls}" onclick="${accessible?`jumpSupergroup('${sg.id}')`:''}">
        <span class="stage-num">${i+1}</span>
        <div class="stage-info">
          <div class="stage-label">${sub}</div>
          ${isActive ? turnChip : ''}
        </div>
        <div class="stage-tracks">${tracks}</div>
      </div>`;
    }
    // Version chip moved to the iframe's sidebar header (it only controls the
    // sidebar's scope contents, not the whole page's stage). SCOPE node is now
    // a plain stepper item like Work and Closeout.
    return `<div class="stage ${cls}" onclick="${accessible?`jumpSupergroup('${sg.id}')`:''}">
      <span class="stage-num">${i+1}</span>
      <div class="stage-info">
        <div class="stage-label">${sub}</div>
        ${isActive ? turnChip : ''}
      </div>
    </div>`;
  }).join('');
}

/* Version chip markup — pinned to the SCOPE node. Stable IDs so switchVersion
   can update label / tag without re-rendering the stepper (which would reset
   Work + Closeout node states visually). */
function versionChipHtml(){
  const v = VERSIONS.find(x => x.id === currentVersionId) || VERSIONS[0];
  // v3's tag is computed dynamically (versionTag) from the project stage so the
  // pill reads "Current" / "In Draft" / "In Review" instead of empty.
  const {tag, tagCls} = versionTag(v);
  return `<div class="ver-chip" id="verChip" onclick="event.stopPropagation()">
    <button class="ver-chip-btn" onclick="toggleVersion(event)" aria-label="Scope version">
      <span class="ver-chip-label" id="verChipLabel">v${v.num}</span>
      <span class="ver-chip-tag ${tagCls||''}" id="verChipTag">${tag||''}</span>
      <svg viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="ver-menu" id="verMenu"></div>
  </div>`;
}

// Land on the right substage when a supergroup node is clicked
function jumpSupergroup(sgId){
  const target = landingSubstage(sgId);
  if(target) jumpStage(target);
}

// Switch which parallel track is active at the Work stage (labor vs materials).
function jumpWorkTrack(trackId){
  state.workTrack = trackId;
  saveState();
  // If we're not already at the Work supergroup, land there too
  const workSg = SUPER_STAGES.find(s=>s.id==='work');
  if(workSg && !workSg.substages.includes(viewStage)) jumpStage(workSg.home);
  else render();
}

// Sub-status text shown under each supergroup name in the stepper (project state).
function subStatusMeta(sgId){
  const proj = state.projectStage;
  if(sgId==='scope'){
    if(proj==='edit') return 'Scope in draft';
    if(proj==='submitted' || proj==='reviewing' || proj==='review-done' || proj==='awaiting-pub') return 'Scope in review';
    if(proj==='published' || proj==='closeout' || proj==='closeout-approved') return 'Scope approved';
    return 'Scope in draft';
  }
  if(sgId==='work'){
    if(proj==='published') return 'Work in progress';
    if(proj==='closeout' || proj==='closeout-approved') return 'Work completed';
    return 'Work not started';
  }
  if(sgId==='closeout'){
    // Language table treats the closeout preset as the "submitted" state
    // (contractor uploaded, admin is reviewing). Approved would come after.
    if(proj==='closeout') return 'Closeout submitted';
    if(proj==='closeout-approved') return 'Closeout approved';
    return 'Closeout unavailable';
  }
  return '';
}

/* ── stage status text + style for the action bar ── */
const STATUS_META={
  edit:        {cls:'draft',       label:'Draft'},
  submitted:   {cls:'submitted',   label:'Handed off'},
  reviewing:   {cls:'review',      label:'In review'},
  'review-done':{cls:'review-done',label:'Review finished'},
  'awaiting-pub':{cls:'review-done',label:'Awaiting publish'},
  published:   {cls:'published',   label:'Published · live'},
  closeout:    {cls:'review',      label:'Closeout review'},
  'closeout-approved':{cls:'published',label:'Project complete'},
};
function renderActBar(){
  // Caption text is placed under the active stepper node by renderStages().
  // This function now just handles the slim secondary action bar (Send back
  // to draft, Re-open review, Mark work complete, etc.) that lives below it.
  const bar = document.getElementById('actbar');
  const actEl = document.getElementById('actActions');
  const isRenter = state.role === 'renter';
  if(viewStage === 'closeout' || (isRenter && viewStage === 'published')){
    if(actEl) actEl.innerHTML = '';
    if(bar) bar.classList.add('is-empty');
    return;
  }
  const actions = actionsFor(state.role, viewStage);
  if(actEl) actEl.innerHTML = actions;
  if(bar) bar.classList.toggle('is-empty', !actions);
}

function messageFor(role, stage){
  /* This function took `role` and ignored it, so an admin parked on the publish
     step was told "Manager approves and publishes to make the scope live" —
     third person, about someone else, in the one slot that should say what YOU
     do next. When the move isn't yours the caption now says so and names who
     has it; when it is, the stage copy below explains the move. */
  const turn = whoseTurn(stage, role, state.twoStep);
  if(turn.role && !turn.mine) return `Nothing for you here — waiting on ${turn.who} (${turn.role === 'manager' ? 'Manager' : turn.role === 'admin' ? 'Admin' : turn.role}).`;
  if(stage==='edit') return `Build and refine the scope. Hand off for review when ready.`;
  if(stage==='submitted') return `Scope is locked. Recall to keep editing.`;
  if(stage==='reviewing') return state.twoStep
    ? `Admin reviews each task. Hand off to manager when done.`
    : `Admin reviews each task. Approve to publish when done.`;
  if(stage==='review-done') return state.twoStep
    ? `Review complete. Hand off to the manager.`
    : `Review complete. Publish to send the scope live.`;
  if(stage==='awaiting-pub') return `Manager approves and publishes to make the scope live and begin construction.`;
  if(stage==='published'){
    if(role==='contractor') return `Track labor progress and shop materials with Kai.`;
    if(role==='renter') return `Read-only view. Pricing and admin tools are hidden.`;
    return `Track task progress here. Once all tasks are marked as complete, the project moves into Closeout.`;
  }
  if(stage==='closeout') return `Compare initial vs final photos to sign off.`;
  return '';
}

/* Only secondary/back-leaning actions go here — primary lives in the topbar */
function actionsFor(role, stage){
  // Secondary action bar removed entirely — the actbar renders empty for every
  // state and collapses via .is-empty. Reverse-flow actions (send back to draft,
  // re-open review, etc.) can be re-surfaced later inside the panel itself if
  // needed, but the shell no longer holds a global strip for them.
  return '';
}

function btn(kind, label, onclick){
  return `<button class="btn btn-${kind}" onclick="${onclick}">${label}</button>`;
}

function renderActions(){
  // The topbar holds the single primary CTA for the current stage
  const wrap=document.getElementById('tbActions');
  let main='';
  if(viewStage==='edit' && (state.role==='admin' || state.role==='field_agent')){
    main = btn('primary','Hand off for review','submitForReview()');
  } else if(viewStage==='submitted' && state.role==='admin'){
    main = btn('primary','Begin review','beginReview()');
  } else if(viewStage==='reviewing' && state.role==='admin'){
    main = btn('primary','Approve Scope','finishReview()');
  } else if(viewStage==='review-done' && state.role==='admin'){
    // Always send to the Publish step — in 2-step mode the manager approves,
    // in 1-step mode the admin approves again as step 3.
    main = state.twoStep
      ? btn('primary','Send to publish','notifyManager()')
      : btn('primary','Send to publish','notifyManager()');
  } else if(viewStage==='awaiting-pub' && (state.role==='manager' || (state.role==='admin' && !state.twoStep))){
    main = btn('primary','Approve & publish','confirmPublish()');
  } else if(viewStage==='closeout' && (state.role==='admin'||state.role==='manager')){
    main = btn('primary','Approve Closeout','approveCloseout()');
  }
  // Renter on Published gets a read-only note in place of any CTA
  if(state.role === 'renter' && viewStage === 'published'){
    wrap.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.78);padding:6px 10px;border:1px solid rgba(255,255,255,.25)"><svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="3"/><path d="M1.5 7C3 4 5 3 7 3s4 1 5.5 4c-1.5 3-3.5 4-5.5 4s-4-1-5.5-4z"/></svg>Read-only · pricing &amp; admin hidden</span>`;
    return;
  }
  wrap.innerHTML = main || `<span style="font-family:var(--mono);font-size:10px;color:rgba(255,255,255,.45);letter-spacing:.08em;text-transform:uppercase">${viewStage==='published'?'Scope is live':''}</span>`;
}

/* ── lock the iframe interaction if the role can't act on this stage ── */
function renderIframe(){
  const stage=STAGES.find(s=>s.id===viewStage);
  if(!stage) return;
  const ifr=document.getElementById('iframe');
  // Any prior "change-order in progress" state belongs to the previous
  // iframe instance. A fresh load starts clean — the iframe will re-post
  // kai-edit-mode once it decides it has staged edits again.
  window.__KAI_IFRAME_EDIT_MODE = false;
  if(typeof syncAppApproveBtn === 'function') syncAppApproveBtn();
  // Resolve which file to load — renter at "published" gets a read-only,
  // tenant-filtered scope review instead of the contractor shop panel.
  let file = stage.iframe;
  const params = [];
  // Renter now goes through the same ScopePanel as everyone else, with the
  // Share to selector pre-set + locked to Renter so the Artifact tab renders
  // the renter view. One code path for the artifact across all audiences.
  // Renter on Published always sees the renter-audience artifact — pricing
  // stripped, tenant-responsible only. Keep that override.
  if(viewStage === 'published' && state.role === 'renter'){
    file = 'ProjectReview_ScopePanel_ShopEdit.html';
    params.push('tab=artifact','audience=renter');
  } else if(viewStage === 'published' && state.role === 'contractor'){
    params.push('role=contractor');
  }
  // Draft-lifecycle stages need the sidebar's task-status pills to show
  // "in progress" / "missing details" instead of the approved vocabulary.
  if(viewStage === 'edit' || viewStage === 'submitted'){
    params.push('stage=draft');
  }
  // At the Work stage, flag the context so the sidebar's CTA copy switches
  // from "Approve scope" to the closeout flow.
  if(viewStage === 'published' && state.role !== 'renter'){
    params.push('context=construction');
  }
  // ── Default tab, unified rule ──────────────────────────────────────
  // Latest document APPROVED → Pano (Progress) so users land on the
  //   visual before/after comparison — the story of what's been done.
  // Latest document SUBMITTED but not yet APPROVED → Editor so users
  //   land on the surface where they can make edits or resolve details.
  // closeout-approved is the terminal state — Artifact is the sensible
  //   home since the doc set is the point at that stage.
  // Exceptions kept:
  //   – renter on published: already routed to artifact + audience above
  //   – contractor on published with workTrack=materials: Editor
  //     (the legacy shopping flow) so materials procurement stays put
  //   – contractor on published with workTrack=labor: Artifact
  const hasTabAlready = params.some(p => p.startsWith('tab='));
  if(!hasTabAlready){
    // Revisiting-a-completed-step override — if the user is looking at a
    // stepper node earlier than where the project actually is (e.g. Scope
    // once Work has started), open on Artifact so they view the frozen
    // approved doc rather than land on the Editor for a locked scope.
    const _viewSuperIdx = SUPER_STAGES.findIndex(s => s.substages.includes(viewStage));
    const _projSuperIdx = SUPER_STAGES.findIndex(s => s.substages.includes(state.projectStage));
    const _isRevisitingCompletedStep = _viewSuperIdx >= 0 && _projSuperIdx > _viewSuperIdx;
    // Editor is where the work is at every stage, so it's always the
    // landing tab. This used to branch per role and stage — admins at
    // Published landed on Progress, closeout on Artifact — which meant
    // the tab you wanted was a click away in exactly the steps where you
    // were most likely to want it. The panel still redirects to Artifact
    // at closeout-approved, where Editor doesn't exist (see WORK_MODES).
    const defaultTab = 'shop';
    params.push('tab=' + defaultTab);
  }
  if(state.scopeSeed === 'full') params.push('seed=full');
  if(state.scopeSeed === 'empty') params.push('seed=empty');
  // Project mode drives the vocabulary shown on task-status pills in the sidebar.
  // Maps to the "Task status options" column of the language table.
  const projMode =
    (viewStage==='edit' || viewStage==='submitted') ? 'draft'
    : (viewStage==='reviewing' || viewStage==='review-done' || viewStage==='awaiting-pub') ? 'review'
    : (viewStage==='closeout') ? 'closeout'
    : (viewStage==='closeout-approved') ? 'closeout-approved'
    : 'work';
  params.push('projMode=' + projMode);
  // Steps 5 and 6 share a stage; the track is what separates them, and
  // the panel needs it to know whether work has started yet.
  if(state.workTrack) params.push('track=' + state.workTrack);
  // The shell now owns the Kai identity + action toolbar; ask the iframe to
  // suppress its own copy so we don't get two black bars stacked.
  params.push('chromeless=1');
  // Exact stepper node. projMode collapses `edit` and `submitted` into
  // 'draft', but the scope-level overview is off at `edit` (where
  // authoring the scope is the job) and on from `submitted` onward,
  // so the panel needs to tell those two apart.
  params.push('stageId=' + viewStage);
  const newSrc = file + (params.length ? '?' + params.join('&') : '');
  const cur=ifr.getAttribute('data-kai-src')||'';
  // Reload when the src actually changes
  if(cur !== newSrc){
    // Iframe always initializes at v3. Reset the shell's mirrored id so the
    // state bar doesn't sit on a stale outdated-scope message from a prior
    // preset. If the user opened v2 before switching presets, they'll land
    // fresh on v3 like the iframe does.
    if(currentVersionId !== 'v3'){
      currentVersionId = 'v3';
      outdatedLockDismissed = false;
      renderVersionNotice();
      syncAppApproveBtn();
    }
    // The URL is now bookkeeping only — it tracks which variant is loaded
    // so the change check above still works, then the panel is rebuilt from
    // the embedded source with that query string handed to it directly.
    ifr.setAttribute('data-kai-src', newSrc);
    ifr.srcdoc = KAI_PANEL_DOC(newSrc.split('?')[1] || '');
  }
  // Lock overlay logic
  const host=document.getElementById('host');
  const inner=document.getElementById('lockInner');
  const lockInfo = computeLock();
  if(lockInfo){
    host.classList.add('locked');
    inner.innerHTML=`
      <div class="lock-overlay-cap">${lockInfo.cap}</div>
      <div class="lock-overlay-title">${lockInfo.title}</div>
      <div class="lock-overlay-body">${lockInfo.body}</div>
      <div class="lock-overlay-actions">${lockInfo.actions||''}</div>`;
  } else {
    host.classList.remove('locked');
    inner.innerHTML='';
  }
}

// Session flag so "Keep viewing" dismisses the outdated-scope modal without
// changing state. Resets when the user switches versions (see switchVersion).
let outdatedLockDismissed = false;
function dismissOutdatedLock(){
  outdatedLockDismissed = true;
  const host = document.getElementById('host');
  const inner = document.getElementById('lockInner');
  if(host) host.classList.remove('locked');
  if(inner) inner.innerHTML = '';
}
// Build the "you're on an outdated scope" modal — shown in place of the normal
// stage-mismatch lock when the user has picked v1 or v2 in the version chip.
function outdatedScopeLock(){
  const v = VERSIONS.find(x => x.id === currentVersionId);
  if(!v) return null;
  return {
    cap:'Viewing an outdated scope',
    title:`You're interacting with an outdated scope`,
    body:`v${v.num} isn't the current version — this is a read-only snapshot from ${v.at}. To make changes, switch back to the current scope.`,
    actions:`<button class="btn btn-secondary" onclick="dismissOutdatedLock()">Keep viewing v${v.num}</button> <button class="btn btn-primary" onclick="switchVersion('v3')">See current scope</button>`,
  };
}

function computeLock(){
  // If the user is on an outdated version and has already dismissed the modal
  // this session, don't re-lock the surface.
  const viewingOutdated = currentVersionId && currentVersionId !== 'v3';
  if(viewingOutdated && outdatedLockDismissed) return null;

  // Scope is editable only at the edit stage AND the project is actually there
  // (otherwise editing here would diverge from the locked source of truth)
  if(viewStage==='edit' && state.projectStage!=='edit'){
    if(viewingOutdated) return outdatedScopeLock();
    return {
      cap:'Scope is locked',
      title:'This scope has been handed off',
      body:`Live editing is paused while the scope is in <b>${STATUS_META[state.projectStage]?.label||state.projectStage}</b>. ${state.projectStage==='submitted'?'Recall it to the draft to keep editing, or:':''}`,
      actions: state.projectStage==='submitted'
        ? `<button class="btn btn-secondary" onclick="recallToDraft()">Recall to draft</button> <button class="btn btn-primary" onclick="jumpStage('${state.projectStage}')">Go back to current step</button>`
        : `<button class="btn btn-primary" onclick="jumpStage('${state.projectStage}')">Go back to current step</button>`,
    };
  }
  // Review stages can only act when project is at or beyond submitted
  if(viewStage==='reviewing' && state.projectStage==='edit'){
    if(viewingOutdated) return outdatedScopeLock();
    return {
      cap:'Not ready for review',
      title:'Scope still in draft',
      body:`The scope hasn't been handed off yet. Hand it off from the Edit stage to begin review.`,
      actions:`<button class="btn btn-secondary" onclick="jumpStage('edit')">Go to Edit</button> <button class="btn btn-primary" onclick="submitForReview()">Hand off now</button>`,
    };
  }
  // Publish lock ONLY fires when the project hasn't reached publish yet — not
  // when it has already moved past (which would misleadingly say "not ready").
  if(viewStage==='awaiting-pub' && ['edit','submitted','reviewing','review-done'].includes(state.projectStage)){
    if(viewingOutdated) return outdatedScopeLock();
    return {
      cap:'Not ready for publish',
      title:state.projectStage==='reviewing'?'Admin review still in progress':'Already moved on',
      body:`Admin hasn't handed off this scope yet. The publish step opens once admin marks the review finished and notifies you.`,
      actions:`<button class="btn btn-secondary" onclick="jumpStage('${state.projectStage}')">Go back to current step</button>`,
    };
  }
  if(viewStage==='published' && !['published','closeout'].includes(state.projectStage)){
    if(viewingOutdated) return outdatedScopeLock();
    return {
      cap:'Not yet published',
      title:'Scope is not live',
      body:`This scope hasn't been published. Shopping is read-only until publish is complete.`,
      actions:`<button class="btn btn-secondary" onclick="jumpStage('${state.projectStage}')">Go back to current step</button>`,
    };
  }
  if(viewStage==='closeout' && state.projectStage!=='closeout'){
    if(viewingOutdated) return outdatedScopeLock();
    return {
      cap:'Closeout not yet open',
      title:'Work still in progress',
      body:`Closeout review opens once the contractor has finished the scope and uploaded final photos.`,
      actions:`<button class="btn btn-secondary" onclick="state.projectStage='closeout';saveState();render()">Simulate finished work →</button>`,
    };
  }
  return null;
}

function syncSettings(){
  const cb=document.getElementById('twoStep');
  if(cb) cb.checked = !!state.twoStep;
}

/* ════════════ TRANSITIONS ════════════ */
function jumpStage(s){
  const access=ROLE_ACCESS[state.role]||[];
  if(!access.includes(s)){ toast(`${roleName(state.role)} can't access this stage.`); return; }
  viewStage=s;
  render();
}

function setRole(r){
  state.role=r; saveState();
  document.getElementById('tbRole').classList.remove('open');
  viewStage=null; // re-home on next render
  render();
  toast(`Switched to ${roleName(r)}`);
}
function roleName(id){ const r=ROLES.find(x=>x.id===id); return r?r.name:id; }

function setTwoStep(v){
  state.twoStep=!!v; saveState();
  // If turning 2-step off while in awaiting-pub, advance project stage
  if(!v && state.projectStage==='awaiting-pub'){ state.projectStage='review-done'; saveState(); }
  render();
}

function setProjectStage(s){
  state.projectStage=s; saveState();
  // If user role allows, keep them in sync with the new project stage
  const access=ROLE_ACCESS[state.role]||[];
  if(access.includes(s)) viewStage=s;
  render();
}

/* Who has signed the scope off and who still owes it, for the hand-off modal.
   The roster lives with the scope data inside the panel iframe, so it is read
   across through the export rather than kept a second time here — two copies
   of the same team would drift the moment either changed. Returns '' if the
   panel is not up yet, and the modal simply goes without. */
function reviewRosterHtml(){
  let st = null;
  try{
    const ifr = document.getElementById('iframe') || document.querySelector('iframe');
    if(ifr && ifr.contentWindow && typeof ifr.contentWindow.a2ReviewState === 'function'){
      st = ifr.contentWindow.a2ReviewState();
    }
  }catch(e){ return ''; }
  if(!st || !st.total) return '';
  const row = (p, done) => `
    <div class="rv-row${done?' is-done':''}">
      <span class="rv-mark">${done ? ICONS.check : ''}</span>
      <span class="rv-who"><b>${p.who}</b><span class="rv-role">${p.role}</span></span>
      <span class="rv-when">${done ? p.date : 'Not yet reviewed'}</span>
    </div>`;
  return `
    <div class="rv-list">
      <div class="rv-hdr">Reviewed by ${st.signed.length} of ${st.total}</div>
      ${st.signed.map(p => row(p, true)).join('')}
      ${st.pending.map(p => row(p, false)).join('')}
    </div>`;
}

/* Sending a change order on for approval — the manager's forward action at the
   change-order review. Distinct from submitForReview() above, which hands off
   the whole scope and moves the project stage: this one is about the order
   sitting against an already-live scope, so the stage does not move. */
function submitChangeOrderForReview(){
  openModal({
    icon:'check',
    title:'Submit the change order for review?',
    body:`The change order goes to the team for approval. The live scope is unaffected until it is approved — work carries on against the approved lines, and the lines this order touches stay on hold.${reviewRosterHtml()}`,
    confirm:'Submit for review',
    onConfirm:()=>{ if(typeof toast === 'function') toast('Change order submitted for review'); }
  });
}
function submitForReview(){
  openModal({
    icon:'check',
    title:'Hand off scope for review?',
    // The old copy said the scope locks outright, which isn't what happens —
    // you keep editing and re-submitting right up until approval; what changes
    // is that everyone else needs to ask for access while it sits in the queue.
    // The field-agent recall clause that used to hang off the end is gone: the
    // first sentence now covers it, and better.
    body:`Once handed off, you can make edits and hand off again as long as the doc hasn't been approved. The rest of your team would need to request edit access while the scope is waiting for approval.${reviewRosterHtml()}`,
    confirm:'Hand off',
    onConfirm:()=>{
      setProjectStage('submitted');
      toast('Handed off for review');
    }
  });
}
function recallToDraft(){
  if(state.projectStage!=='submitted'){ toast('Can only recall while handed off, before review starts.'); return; }
  setProjectStage('edit');
  toast('Returned to draft');
}
function beginReview(){
  setProjectStage('reviewing');
  toast('Review opened');
}
function sendBackToDraft(){
  openModal({
    icon:'arrow',
    title:'Send back to draft?',
    body:'This unlocks the scope for editing. Anyone with edit access can keep building until it\'s handed off again.',
    confirm:'Send back',
    onConfirm:()=>{
      setProjectStage('edit');
      toast('Scope reopened for edit');
    }
  });
}
function finishReview(){
  openModal({
    icon:'check',
    title:'Approve all scope?',
    body:`This locks your review and moves the scope to ${state.twoStep?'<b>Awaiting publish</b> for the manager':'<b>Review finished</b> so you can publish'}.`,
    confirm:'Approve all',
    onConfirm:()=>{
      setProjectStage('review-done');
      toast('Review marked complete');
    }
  });
}
function reopenReview(){
  setProjectStage('reviewing');
  toast('Review reopened');
}
function notifyManager(){
  openModal({
    icon:'bell',
    title:'Notify manager to publish?',
    body:`The manager will be notified that admin review is complete and the scope is ready for publishing. You can still re-open the review until they publish.`,
    confirm:'Notify',
    onConfirm:()=>{
      setProjectStage('awaiting-pub');
      toast('Manager notified');
    }
  });
}
function sendBackToAdmin(){
  openModal({
    icon:'arrow',
    title:'Send back to admin?',
    body:'Returns the scope to admin for another review pass before publishing.',
    confirm:'Send back',
    onConfirm:()=>{
      setProjectStage('reviewing');
      toast('Returned to admin review');
    }
  });
}
function confirmPublish(){
  openModal({
    icon:'send',
    title:'Publish scope?',
    body:`Publishing makes this scope shareable with external parties (contractor, renter). It also triggers any pending purchase orders.<ul><li>Contractor can begin shopping materials</li><li>Renter gets a read-only view (no pricing)</li><li>Scope becomes the source of truth for closeout comparison</li></ul>This action can be reversed by admin or manager.`,
    confirm:'Publish',
    confirmKind:'primary',
    onConfirm:()=>{
      setProjectStage('published');
      toast('Scope published · live to external parties');
    }
  });
}
function approveCloseout(){
  openModal({
    icon:'check',
    title:'Approve closeout?',
    body:`This will sign off on the closeout as reviewed and mark the project as complete. This action cannot be undone from the demo.`,
    confirm:'Approve closeout',
    onConfirm:()=>{
      // Advance to the terminal "closeout-approved" substage — stepper
      // hides, Editor tab drops out of the right panel, CTA disappears.
      setProjectStage('closeout-approved');
      viewStage = 'closeout-approved';
      saveState();
      render();
      toast('Closeout approved · project complete');
    }
  });
}

/* ════════════ MODAL ════════════ */
const ICONS={
  check:`<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-11"/></svg>`,
  arrow:`<svg viewBox="0 0 24 24"><path d="M9 6l-6 6 6 6M3 12h18"/></svg>`,
  bell: `<svg viewBox="0 0 24 24"><path d="M7 17a5 5 0 0 1 10 0M12 3v2M9 19a3 3 0 0 0 6 0"/></svg>`,
  send: `<svg viewBox="0 0 24 24"><path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z"/></svg>`,
};
function openModal({icon='check', title, body, confirm='Confirm', confirmKind='primary', cancel='Cancel', onConfirm}){
  const m=document.getElementById('modal');
  m.innerHTML=`
    <div class="modal-icon">${ICONS[icon]||ICONS.check}</div>
    <div class="modal-title">${title}</div>
    <div class="modal-body">${body}</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">${cancel}</button>
      <button class="btn btn-${confirmKind}" onclick="closeModal();(${onConfirm.toString()})()">${confirm}</button>
    </div>`;
  document.getElementById('modalScrim').classList.add('open');
  m.classList.add('open');
}
function closeModal(){
  document.getElementById('modalScrim').classList.remove('open');
  document.getElementById('modal').classList.remove('open');
}

/* ════════════ MENUS ════════════ */
function toggleRole(e){ e.stopPropagation(); document.getElementById('tbRole').classList.toggle('open'); document.getElementById('tbSet').classList.remove('open'); }
function toggleSet(e){ e.stopPropagation(); document.getElementById('tbSet').classList.toggle('open'); document.getElementById('tbRole').classList.remove('open'); }
document.addEventListener('click',()=>{
  document.getElementById('tbRole').classList.remove('open');
  document.getElementById('tbSet').classList.remove('open');
});

/* ════════════ TOAST ════════════ */
let toastT;
function toast(msg){
  const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),2200);
}

/* ════════════ RESET ════════════ */
function resetDemo(){
  if(!confirm('Reset the demo? This clears role + stage state.')) return;
  localStorage.removeItem('kai_comp_state');
  state={...DEFAULTS};
  viewStage=null;
  render();
  toast('Demo reset');
}

/* ── Top-bar collapse toggle: hide the black header for the current session
   only (no localStorage persistence — otherwise a collapsed AMH shell can leak
   into the Comprehensive shell and vice versa via shared storage). */
function toggleTopBar(){
  document.body.classList.toggle('tb-hidden');
}
// Clear any legacy persisted state so the topbar always starts visible.
try{ localStorage.removeItem('kai_tb_hidden'); }catch(e){}

/* ════════════ INIT ════════════ */
render();
