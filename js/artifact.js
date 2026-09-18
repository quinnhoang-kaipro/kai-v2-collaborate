/* Captions for a line's photo strip, in the order the photos were taken: the
   walk that found the line, then the detail shots. Lost when this file was split
   out — both this file and progress.js read it, neither defined it, so opening
   any historical document threw before it rendered. It belongs here, with the
   paper that shows the strip. */
const ART_PHOTO_CAPS = ['Initial walk','Detail','Wide','Spec','Context','Angle'];

function renderArtifact(){
  const body = document.getElementById('workBody');
  if(!body) return;
  // Priority: historical > copy > index. Guard both drill-in states so a
  // stale id (e.g. a copy that was renamed/removed elsewhere) falls back
  // to the index instead of blanking the tab.
  if(openHistoricalId){
    const v = VERSIONS.find(x => x.id === openHistoricalId);
    if(!v){ openHistoricalId = null; body.innerHTML = _renderArtifactIndex(); return; }
    body.innerHTML = _renderHistoricalDoc(v);
    return;
  }
  if(openCopyId){
    const copy = copyById(openCopyId);
    if(!copy){ openCopyId = null; body.innerHTML = _renderArtifactIndex(); return; }
    body.innerHTML = _renderCopyDoc(copy);
    return;
  }
  body.innerHTML = _renderArtifactIndex();
}
function _renderArtifactIndex(){
  return `<div class="art-index">
    ${_renderRegisterSection()}
    ${_renderHistoricalSection()}
    ${_renderCopiesSection()}
  </div>`;
}

/* ════════════ REGISTER ════════════
   Every event that moved the Job Total, and how that total is classified
   today. Two questions a job manager asks constantly and previously had to
   answer by opening each document in turn and doing the arithmetic.

   SOURCE OF TRUTH — the live scope (TASKS), not VERSIONS[].budget. The two
   seeds disagree in this prototype (the sidebar reads $68,242 where the
   version cards read $26,370), and a section whose whole job is to add money
   up cannot be the place that publishes the stale one. So: the current Job
   Total is the live scope, the classification partitions exactly that figure,
   and each document's historical Job Total is derived by walking its change
   back from today. Every row therefore ties, and the bottom line agrees with
   the number the sidebar has been showing all along. */

// Which ledger row is expanded. One at a time — the detail is a digression
// from the running total, not a second column of it.
let _regOpenVer = null;
/* Which groups inside it are open. Several at once, unlike the rows: comparing
   two rooms of one change order is the reason to be down here at all. Keyed by
   version and room, so opening Kitchen in one document does not open it in
   another. */
let _regOpenGroups = {};
function toggleRegGroup(key){
  _regOpenGroups[key] = !_regOpenGroups[key];
  if(typeof renderArtifact === 'function') renderArtifact();
}
/* The lines of one room that this version touched, with what each carries and
   what it costs. Read off SCOPE, the same records the counts come from, so a
   room that says 4 opens onto four. */
function _regGroupTasks(verKey, room){
  if(typeof SCOPE === 'undefined') return [];
  const g = SCOPE.find(x => x.room === room);
  if(!g) return [];
  return g.tasks
    .filter(t => (t.changes || []).some(ch => ch.ver === verKey))
    .map(t => ({code:t.code, name:t.name, product:t.product || '',
                qty:t.qty || '', amount:t.amount || '',
                added:(t.changes || []).some(ch => ch.ver === verKey
                  && (ch.rows || []).some(r => r.field === 'Line added'))}));
}
/* What the room's lines come to in this version. Summed from the same rows
   the group opens onto, so the figure and the lines under it are one sum. */
function _regGroupAmount(verKey, room){
  const ts = _regGroupTasks(verKey, room);
  if(!ts.length) return '';
  const n = ts.reduce((k, t) => k + (parseFloat(String(t.amount).replace(/[^0-9.\-]/g, '')) || 0), 0);
  return n ? '$' + Math.round(n).toLocaleString('en-US') : '';
}
function toggleRegRow(id){
  _regOpenVer = (_regOpenVer === id) ? null : id;
  if(typeof renderArtifact === 'function') renderArtifact();
}

/* The a2 records (SCOPE / VER) hold what each version actually touched, keyed
   by their own ids. VERSIONS is the ladder this tab already renders. Same
   rungs, different keys — match them by position. */
function _regVerKey(v){
  if(typeof VER_ORDER === 'undefined') return null;
  return VER_ORDER[(v.num || 1) - 1] || null;
}
function _regCounts(v){
  const key = _regVerKey(v);
  if(!key || typeof _ovChangeCounts !== 'function') return null;
  try { return _ovChangeCounts(key); } catch(_){ return null; }
}
/* Added vs revised, off the same change rows the Overview reads. A line that
   appeared is a different act from one that was repriced, and the split is
   the first thing anyone asks about a change order's item count. */
function _regAddedRevised(v){
  const key = _regVerKey(v);
  if(!key || typeof SCOPE === 'undefined') return null;
  let added = 0, revised = 0;
  SCOPE.forEach(g => g.tasks.forEach(t => {
    const rows = (t.changes || []).filter(ch => ch.ver === key);
    if(!rows.length) return;
    const isAdd = rows.some(ch => (ch.rows || []).some(r => r.field === 'Line added'));
    if(isAdd) added++; else revised++;
  }));
  return (added || revised) ? {added, revised} : null;
}

/* How today's Job Total splits. Precedence rather than overlap: a task held
   for a change order is Deferred whatever else it carries, so the three
   buckets partition the total exactly and the rows can be trusted to sum. */
function _regClassify(){
  const modsOf = t => {
    const pm = (typeof taskProductMods === 'function') ? taskProductMods(t) : [];
    return new Set([...(t.mods || []), ...pm]);
  };
  const out = {ready:0, tenant:0, deferred:0, readyN:0, tenantN:0, deferredN:0};
  (typeof TASKS !== 'undefined' ? TASKS : []).forEach(t => {
    const m = modsOf(t), c = dollars(t.cost);
    if(m.has('deferred'))   { out.deferred += c; out.deferredN++; }
    else if(m.has('tenant')){ out.tenant   += c; out.tenantN++;   }
    else                    { out.ready    += c; out.readyN++;    }
  });
  out.total = out.ready + out.tenant + out.deferred;
  out.onPos = out.ready + out.tenant;   // deferred is not on a PO yet
  return out;
}

/* The ledger, oldest first. `total` is each document's Job Total as of its
   approval, derived by unwinding the later changes from today's figure. */
function _regLedger(){
  const ordered = VERSIONS.slice().sort((a,b) => a.num - b.num);
  const live = (typeof TASKS !== 'undefined' ? TASKS : []).reduce((s,t) => s + dollars(t.cost), 0);
  // Each document's own movement, from the version ladder's budgets. The
  // budgets disagree with the live scope in absolute terms but the steps
  // between them are the real change-order amounts.
  const rows = ordered.map((v, i) => {
    const prev = i ? ordered[i-1] : null;
    return {v, change: prev ? (dollars(v.budget) - dollars(prev.budget)) : null};
  });
  // Walk today's total backwards so the last row lands on it exactly.
  let running = live;
  for(let i = rows.length - 1; i >= 0; i--){
    rows[i].total = running;
    running -= (rows[i].change || 0);
  }
  // The walk assumes the live scope is the same body of work the ladder
  // describes. Where it isn't — a seeded ladder against a scope that has been
  // emptied or heavily cut — the derivation runs past zero and starts printing
  // negative money. Fall back to each document's own budget then: those no
  // longer agree with the sidebar, but a figure that disagrees beats a job
  // total of minus fourteen hundred dollars.
  if(rows.some(r => r.total < 0)){
    rows.forEach(r => { r.total = dollars(r.v.budget); });
    return {rows, live: rows[rows.length-1].total, derived:false};
  }
  return {rows, live, derived:true};
}

function _renderRegisterSection(){
  // An empty scope has no job total to account for, and the seeded version
  // ladder describes work that isn't there. The sidebar already says "Empty
  // scope"; a register of nothing would only dress that up as an accounting.
  if(typeof TASKS === 'undefined' || !TASKS.length) return '';
  const {rows, live} = _regLedger();
  if(!rows.length) return '';
  const cls = _regClassify();
  const first = rows[0];
  const approvedChange = rows.slice(1).reduce((s,r) => s + (r.change || 0), 0);
  const coCount = rows.length - 1;
  const cur = VERSIONS.find(v => v.id === currentVersionId) || rows[rows.length-1].v;
  const curTag = versionTag(cur);

  const fmt = n => '$' + Math.round(n).toLocaleString('en-US') + '.00';
  const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US') + '.00';

  /* ── Three figures, in the order the question is asked: what was approved,
        what has moved it since, what it is now. */
  const cards = `<div class="reg-cards">
    <div class="reg-card">
      <div class="reg-card-lbl">Initial approved scope</div>
      <div class="reg-card-val">${fmt(first.total)}</div>
      <div class="reg-card-sub">${esc(first.v.at)} · ${TASKS.length} item${TASKS.length===1?'':'s'}</div>
    </div>
    <div class="reg-card">
      <div class="reg-card-lbl">Approved changes</div>
      <div class="reg-card-val">${sgn(approvedChange)}</div>
      <div class="reg-card-sub">${coCount} change order${coCount===1?'':'s'}</div>
    </div>
    <div class="reg-card is-current">
      <div class="reg-card-lbl">Current job total</div>
      <div class="reg-card-val">${fmt(live)}</div>
      <div class="reg-card-sub">${esc(versionLabel(cur))}${curTag.tag?' · '+esc(curTag.tag):''}</div>
    </div>
  </div>`;

  /* ── Classification. "On Purchase Orders" deliberately excludes Deferred:
        the whole point of that modifier is that the money is not committed. */
  const clsRows = [
    {name:'Ready to order',    chip:'',                      note:'In purchase orders',                  val:cls.ready,    n:cls.readyN},
    {name:'Tenant responsible',chip:'Tracked cost',          note:'In purchase orders — reported separately', val:cls.tenant, n:cls.tenantN, chipCls:'is-quiet'},
    {name:'Deferred',          chip:'Procure on change order', note:'Held until a change order is approved', val:cls.deferred, n:cls.deferredN, chipCls:'is-quiet'},
  ].filter(r => r.n > 0).map(r => `<tr>
      <th>${esc(r.name)}${r.chip?`<span class="reg-chip ${r.chipCls||''}">${esc(r.chip)}</span>`:''}</th>
      <td class="reg-cls-note">${esc(r.note)}</td>
      <td class="reg-num">${fmt(r.val)}</td>
    </tr>`).join('');

  const classify = `<table class="reg-cls">
    <caption>How the job total is classified</caption>
    <tbody>
      ${clsRows}
      <tr class="is-total">
        <th>On purchase orders</th>
        <td class="reg-cls-note">Ready to order plus tracked cost</td>
        <td class="reg-num">${fmt(cls.onPos)}</td>
      </tr>
    </tbody>
  </table>`;

  /* ── The ledger. One row per approved document, then today's total.
        Built oldest-first, because each row's index is how it knows whether
        it is the original scope, and reversed at the end so the newest
        document is the one the eye lands on. */
  const ledgerRows = rows.map((r, i) => {
    const v = r.v;
    const tag = versionTag(v);
    const counts = i ? _regCounts(v) : null;
    const open = _regOpenVer === v.id;
    const items = i ? (counts ? counts.tasks : null) : TASKS.length;
    const canOpen = !!(counts && counts.detail && counts.detail.length);
    const head = `<tr class="reg-row${open?' is-open':''}${canOpen?' is-openable':''}"${canOpen?` onclick="toggleRegRow('${v.id}')"`:''}>
      <td class="reg-date">${esc(v.at)}</td>
      <td class="reg-doc">
        ${canOpen?`<span class="reg-caret" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6l-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`:'<span class="reg-caret is-blank"></span>'}
        <span class="reg-doc-name">${esc(versionLabel(v))}</span>
        ${tag.tag?`<span class="hist-card-tag hist-tag-${esc(tag.tagCls||'')}">${esc(tag.tag)}</span>`:''}
      </td>
      <td class="reg-num reg-items">${items != null ? items : '—'}</td>
      <td class="reg-num">${r.change == null ? 'Approved' : sgn(r.change)}</td>
      <td class="reg-num reg-total">${fmt(r.total)}</td>
    </tr>`;
    if(!open || !canOpen) return head;
    const ar = _regAddedRevised(v);
    /* A sentence, not two pills: the counts say what happened to the scope,
       and "2 added / 5 revised" made the reader supply the nouns. */
    const chips = ar ? `<div class="reg-sub-chips">${[
      ar.added ? `${ar.added} new task${ar.added === 1 ? '' : 's'} added` : '',
      ar.revised ? `${ar.revised} task${ar.revised === 1 ? '' : 's'} edited` : ''
    ].filter(Boolean).join(', ')}</div>` : '';
    const verKey = _regVerKey(v);
    const groups = counts.detail.map(g => {
      const gk = `${v.id}|${g.room}`;
      const open = !!_regOpenGroups[gk];
      const rows = open ? _regGroupTasks(verKey, g.room).map(t => `
        <div class="reg-task is-go" role="button" tabindex="0"
          onclick="event.stopPropagation();ovGoTask('${esc(t.code)}','${esc(g.room).replace(/'/g, "\\'")}','${esc(t.name).replace(/'/g, "\\'")}')"
          onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();ovGoTask('${esc(t.code)}','${esc(g.room).replace(/'/g, "\\'")}','${esc(t.name).replace(/'/g, "\\'")}');}">
          <span class="reg-task-l">
            <span class="reg-task-name" data-hv-code="${esc(t.code)}"
              data-hv-name="${esc(t.name)}" data-hv-room="${esc(g.room)}">${esc(t.name)}</span>${t.added
              ? `<span class="reg-task-new">New</span>` : ''}
            <span class="reg-task-sub"><span class="reg-task-code">${esc(t.code)}</span>${t.product
              ? ` \u00b7 <span class="reg-task-prod" data-hv-product="${esc(t.product)}"
                  data-hv-code="${esc(t.code)}" data-hv-room="${esc(g.room)}">${esc(t.product)}</span>`
              : ' \u00b7 <span class="reg-task-none">No product selected</span>'}</span>
          </span>
          <span class="reg-task-r">
            <span class="reg-task-qty">${esc(t.qty)}</span>
            <span class="reg-task-amt">${esc(t.amount)}</span>
          </span>
        </div>`).join('') : '';
      return `<div class="reg-sub-g${open ? ' is-open' : ''}">
        <button class="reg-sub-row" aria-expanded="${open}"
          onclick="event.stopPropagation();toggleRegGroup('${esc(gk).replace(/'/g, "\\'")}')"
          title="${open ? 'Hide' : 'Show'} the lines this changed in ${esc(g.room)}">
          <span class="reg-sub-name">${esc(g.room)}</span>
          <span class="reg-sub-n">${g.tasks.length} ${g.tasks.length === 1 ? 'task' : 'tasks'}</span>
          <span class="reg-sub-amt">${esc(_regGroupAmount(verKey, g.room))}</span>
          <span class="reg-sub-go" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6l-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        ${open ? `<div class="reg-tasks">${rows}</div>` : ''}
      </div>`;
    }).join('');
    return head + `<tr class="reg-sub"><td colspan="5">
      ${chips}
      <div class="reg-sub-list">${groups}</div>
      <div class="reg-sub-note">Each group opens onto the lines it changed.</div>
      <button class="reg-sub-open" onclick="event.stopPropagation();openHistorical('${v.id}')">Open ${esc(versionLabel(v))} →</button>
    </td></tr>`;
  }).reverse().join('');

  /* ── Anything staged but not approved sits below the line, excluded from
        the total. Only rendered when there actually is something. */
  let pending = '';
  const staged = (typeof TASKS !== 'undefined' && typeof taskHasOpenChangeOrder === 'function')
    ? TASKS.filter(t => taskHasOpenChangeOrder(t)) : [];
  if(staged.length){
    const d = (typeof scopeDelta === 'function') ? scopeDelta() : 0;
    pending = `<div class="reg-pending-cap">Not approved · not included in the job total</div>
      <table class="reg-table reg-table-pending"><tbody><tr class="reg-row">
        <td class="reg-date">Draft</td>
        <td class="reg-doc"><span class="reg-caret is-blank"></span><span class="reg-doc-name">${esc(versionLabel({num:VERSIONS.length+1}))}</span></td>
        <td class="reg-num reg-items">${staged.length}</td>
        <td class="reg-num">${d ? sgn(d) : '—'}</td>
        <td class="reg-num reg-total is-quiet">In progress</td>
      </tr></tbody></table>`;
  }

  return `<section class="art-sec art-reg">
    <header class="art-sec-hdr">
      <div class="art-sec-hdr-l">
        <h2 class="art-sec-title">Register</h2>
        <p class="art-sec-desc">Every event that changed the job total, and how it is classified today.</p>
      </div>
    </header>
    ${cards}
    ${classify}
    <div class="reg-table-scroll">
      <table class="reg-table">
        <thead><tr>
          <th class="reg-date">Date</th><th class="reg-doc">Document</th>
          <th class="reg-num">Items</th><th class="reg-num">Change</th><th class="reg-num">Job total</th>
        </tr></thead>
        <tbody>
          ${ledgerRows}
          <tr class="reg-row is-grand">
            <td class="reg-date"></td>
            <td class="reg-doc"><span class="reg-caret is-blank"></span><span class="reg-doc-name">Current job total</span></td>
            <td class="reg-num"></td><td class="reg-num"></td>
            <td class="reg-num reg-total">${fmt(live)}</td>
          </tr>
        </tbody>
      </table>
      ${pending}
    </div>
  </section>`;
}
function _renderHistoricalSection(){
  // Historical artifacts = the audit trail. Each VERSION renders as a
  // read-only card. Chronological (oldest → newest) so the story reads
  // "Original scope → CO1 → CO2" left-to-right.
  const ordered = VERSIONS.slice().sort((a,b) => a.num - b.num);
  const cards = ordered.map(v => {
    const label = versionLabel(v);
    const tag = versionTag(v);
    const isCurrent = v.id === currentVersionId;
    const isOriginal = v.num === 1;
    // isOriginal is "Approved" only once it's been superseded by a later
    // version — if it's still the current one (nothing approved it yet),
    // fall through to versionMeta so an in-review submission reads as such.
    const meta = (isOriginal && !isCurrent) ? `Approved ${v.at}` : versionMeta(v);
    // Which visual bucket the card falls into. Original = neutral;
    // current = ink accent bar; outdated = dimmed. Read from the
    // computed tag (not the static v.tagCls) so terminal-state overrides
    // like "everything is Approved" flatten the outdated state.
    const stateCls = isCurrent ? ' is-current' : (tag.tagCls === 'outdated' ? ' is-outdated' : '');
    // No eyebrow: the card's own name already says which version it is, so
    // "Original scope" over "Scope" only restated it.
    return `<button class="hist-card${stateCls}" onclick="openHistorical('${v.id}')" title="View ${esc(label)}">
      <div class="hist-card-name">${esc(label)}</div>
      <div class="hist-card-meta">${esc(meta)}</div>
      <div class="hist-card-docid">${esc(_sowIdFor(v.id))}</div>
      <div class="hist-card-foot">
        <span class="hist-card-budget">${esc(v.budget || '')}</span>
        ${tag.tag ? `<span class="hist-card-tag hist-tag-${esc(tag.tagCls||'')}">${esc(tag.tag)}</span>` : ''}
      </div>
    </button>`;
  }).join('');
  return `<section class="art-sec">
    <header class="art-sec-hdr">
      <div class="art-sec-hdr-l">
        <h2 class="art-sec-title">Historical artifacts</h2>
        <p class="art-sec-desc">Review the original scope and each change-order version for this job.</p>
      </div>
    </header>
    <div class="hist-grid">${cards}</div>
  </section>`;
}
function _renderCopiesSection(){
  const cards = SCOPE_COPIES.map(c => {
    const expired = copyIsExpired(c);
    const filters = _copyFilterSummary(c);
    const chips = filters.map(f => `<span class="copy-filter-chip">${esc(f)}</span>`).join('');
    const metaBits = [
      `<span>Based on ${esc(versionLabel(VERSIONS.find(v=>v.id===c.basedOnVersionId)||{num:1}))}</span>`,
      `<span>Created ${_fmtDate(c.createdAt)}</span>`,
      expired
        ? `<span class="copy-expired-tag">Expired ${_fmtDate(c.expiresAt)}</span>`
        : `<span>Expires ${_fmtDate(c.expiresAt)}</span>`,
    ].join('');
    return `<button class="copy-card${expired?' is-expired':''}" onclick="openCopy('${c.id}')">
      <div class="copy-card-name">${esc(c.name)}</div>
      <div class="copy-card-desc">${esc(c.description||'')}</div>
      <div class="copy-card-meta">${metaBits}</div>
      <div class="copy-card-filters">${chips}</div>
      <div class="copy-card-actions">
        <span class="copy-card-btn" onclick="event.stopPropagation();openCopyShare('${c.id}')">Share link</span>
        <span class="copy-card-btn is-primary" onclick="event.stopPropagation();openCopy('${c.id}')">Open</span>
      </div>
    </button>`;
  }).join('');
  const empty = SCOPE_COPIES.length ? '' : `<div class="copy-empty">
    <div class="copy-empty-title">No copies yet</div>
    <div class="copy-empty-desc">Create a filtered, read-only copy to share with anyone who needs a look.</div>
  </div>`;
  return `<section class="art-sec">
    <header class="art-sec-hdr">
      <div class="art-sec-hdr-l">
        <h2 class="art-sec-title">Shareable copies</h2>
        <p class="art-sec-desc">Create read-only audience-doc copies from any scope version, then copy a public link when you are ready to share.</p>
      </div>
      <button class="art-sec-cta" onclick="openNewCopy()">
        <svg viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        New copy
      </button>
    </header>
    <div class="copy-grid">${cards}${empty}</div>
  </section>`;
}
// Deterministic 8-char hex "document ID" derived from any seed string.
// Not crypto — just a stable-looking identifier for the paper header
// (matches the visual language of internal doc numbers).
function _sowIdFor(seed){
  let h = 0; const s = String(seed || '');
  for(let i = 0; i < s.length; i++){ h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return 'SOW-' + Math.abs(h).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
}
/* ── the submitter's internal note ───────────────────────────────────
   A document explains what the work is; it does not explain why it was sent
   when it was. That belongs to whoever submitted it, and it is internal — so it
   sits above the paper rather than in it, where a shared copy would carry it out
   of the building.

   Author and subject are read off the version's own changes rather than written
   down again here: whoever authored the most of them submitted it, and the
   contractor named is one actually assigned to a line that version touched. Both
   come from Artifact 2's history, which is the same script scope. Falls back to
   the review roster and the contractor list when that history is not loaded. */
function _histVerId(v){
  // VERSIONS is v1/v2/v3, the change history is orig/co1/co2 — same ladder,
  // different names, matched by position.
  if(typeof VER_ORDER === 'undefined') return null;
  return VER_ORDER[(v.num || 1) - 1] || null;
}
function _histNoteFor(v){
  const ver = _histVerId(v);
  const changes = [];
  if(ver && typeof SCOPE !== 'undefined'){
    SCOPE.forEach(g => g.tasks.forEach(t => (t.changes || []).forEach(ch => {
      if(ch.ver === ver) changes.push({ch, t});
    })));
  }
  // Whoever made the most changes in this version is who sent it.
  const tally = {};
  changes.forEach(({ch}) => {
    if(!ch.who) return;
    tally[ch.who] = tally[ch.who] || {who:ch.who, role:ch.role || '', n:0};
    tally[ch.who].n++;
  });
  const author = Object.values(tally).sort((a, b) => b.n - a.n)[0]
    || (typeof REVIEWERS !== 'undefined' ? REVIEWERS[REVIEWERS.length - 1] : {who:'M. Alvarez', role:'Field Agent'});
  // A contractor on one of the lines this version touched, so the note is about
  // work the reader can actually find in the document below it.
  const gcs = [...new Set(changes.map(({t}) => t.gc).filter(Boolean))];
  // Stepped by version, so successive notes are not all about the same firm.
  const gc = gcs[((v.num || 1) - 1) % (gcs.length || 1)] || gcs[0]
    || (typeof CONTRACTORS !== 'undefined' ? CONTRACTORS[0] : 'the contractor');
  const added   = changes.filter(({ch}) => ch.ct === 'added').length;
  const removed = changes.filter(({ch}) => ch.ct === 'removed').length;
  const lines = n => `${n} line${n === 1 ? '' : 's'}`;
  const text = ((v.num || 1) === 1)
    ? `Submitting scope for approval while ${gc}'s availability is pending. A change order may follow within the week to confirm.`
    : removed
      ? `${gc} confirmed dates and the resident took ${lines(removed)} back out, so this is the scope as it now stands. Nothing else is waiting on anyone.`
      : `${gc} came back with dates, so this carries the revised labor${added ? ` and ${lines(added)} the last walk turned up` : ''}. Sending it up now rather than holding the whole scope for it.`;
  /* The note was written when the version was submitted, not when it was
     approved — so v.at is the wrong date to put on it. The earliest sign-off is
     the last moment the document must already have existed, which is the closest
     honest stand-in; a version nobody has signed falls back to its own date. */
  const sigs = (ver && typeof REVIEWS !== 'undefined' ? REVIEWS.filter(r => r.ver === ver) : [])
    .map(r => r.date).sort((a, b) => Date.parse(a) - Date.parse(b));
  return {who:author.who, role:author.role, text, when: sigs[0] || v.at || ''};
}
// Local rather than Artifact 2's initials(): this file should not stop working
// if that one is not on the page.
function _histInitials(name){
  return String(name || '').split(/[\s.]+/).filter(Boolean).map(w => w[0]).join('').slice(0,2).toUpperCase();
}
function _histNoteHtml(v){
  const n = _histNoteFor(v);
  if(!n) return '';
  return `<div class="hist-note">
    <div class="hist-note-hdr">
      <span class="hist-note-av">${esc(_histInitials(n.who))}</span>
      <span class="hist-note-who"><b>${esc(n.who)}</b>${n.role ? `<span class="hist-note-role">${esc(n.role)}</span>` : ''}${n.when ? `<span class="hist-note-when">${esc(n.when)}</span>` : ''}</span>
      <span class="hist-note-sp"></span>
      <span class="hist-note-tag" title="Visible to your team only — not part of the document or any shared copy">Internal note</span>
    </div>
    <p class="hist-note-body">${esc(n.text)}</p>
  </div>`;
}
/* The same notes, for the Notes drawer opened from the Scope row. They are
   scope-level internal notes that happen to live on a document, so a reader
   going through the project's notes should find them there too — otherwise the
   only way to know why a version was sent when it was is to open all three
   artifacts. Shaped for dwNotes(), newest first.

   Internal, so a contractor viewing the same drawer does not get them. The
   drawer does not filter on `hidden` — it only badges it — so the filtering has
   to happen here. */
function _histSubmissionNotes(){
  if(typeof IS_CONTRACTOR !== 'undefined' && IS_CONTRACTOR) return [];
  if(typeof VERSIONS === 'undefined') return [];
  return VERSIONS.slice()
    .sort((a, b) => (b.num || 0) - (a.num || 0))
    .map(v => {
      const n = _histNoteFor(v);
      if(!n) return null;
      return {
        who: n.who, role: n.role, when: n.when, body: n.text,
        // The chip says what the note is attached to, and for these that is the
        // document rather than a level in the scope.
        level: versionLabel(v),
        hidden: true,
      };
    })
    .filter(Boolean);
}
// _renderHistoricalDoc — read-only view of a frozen version. Reuses
// _renderCopyPaper with a synthetic "no filters" copy so we don't
// duplicate the paper render logic. No filter strip, no Share button —
// only a back link, meta chip, and Print.
function _renderHistoricalDoc(v){
  const readOnlyCopy = {
    id:'hist_'+v.id,
    name: versionLabel(v),
    description:'',
    basedOnVersionId: v.id,
    createdAt: v.at,
    filters:{showAmounts:true, contractor:null, renterOnly:false},
    _isHistorical: true,
  };
  const tag = versionTag(v);
  const isOriginal = v.num === 1;
  const eyebrow = isOriginal ? 'Original scope' : `Change order ${v.num - 1}`;
  return `<div class="copy-doc-wrap hist-doc-wrap">
    <div class="copy-crumb hist-crumb">
      <button class="copy-crumb-back" onclick="closeHistorical()" title="Back to the Register">
        <span aria-hidden="true">‹</span> Back
      </button>
      <span class="copy-crumb-div"></span>
      <span class="copy-crumb-name">${esc(versionLabel(v))}</span>
      <span class="copy-crumb-meta">${esc(eyebrow)} · Approved ${esc(v.at)}${v.budget?` · ${esc(v.budget)}`:''}</span>
      <span class="copy-crumb-sp"></span>
      ${tag.tag ? `<span class="hist-doc-tag hist-tag-${esc(tag.tagCls||'')}">${esc(tag.tag)}</span>` : ''}
      <button class="hist-print-btn" onclick="window.print()" title="Print this artifact">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 5V2h7v3M4.5 12H3V6h10v6h-1.5M4.5 9h7v5h-7z" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Print
      </button>
    </div>
    ${_histNoteHtml(v)}
    <div class="copy-paper hist-paper">${_renderCopyPaper(readOnlyCopy)}</div>
  </div>`;
}
function _renderCopyIndex(){
  // Legacy alias — used to be the sole index; now delegates to the
  // two-section artifact index so anything that still calls it works.
  return _renderArtifactIndex();
}

function _copyFilterSummary(copy){
  const parts = [];
  parts.push(copy.filters.showAmounts ? 'Prices visible' : 'Prices hidden');
  parts.push(copy.filters.contractor ? `Only ${copy.filters.contractor}` : 'All contractors');
  if(copy.filters.renterOnly) parts.push('Resident-responsible only');
  parts.push(copy.filters.includePhotos !== false ? 'Photos included' : 'Photos hidden');
  return parts;
}

function _fmtDate(iso){
  if(!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
}

function _renderCopyDoc(copy){
  const expired = copyIsExpired(copy);
  const ver = VERSIONS.find(v => v.id === copy.basedOnVersionId) || VERSIONS[0];
  // Filter strip — read-only summary of what the sender selected when
  // creating the copy. To change filters, the sender clicks the pencil
  // (Edit copy) which opens the create/edit modal. Rendering as plain
  // text (no checkboxes / no dropdown) makes it obvious the doc below
  // reflects a decision that's already been made.
  const filterItems = _copyFilterSummary(copy)
    .map(s => `<span class="copy-filter-static">${esc(s)}</span>`).join('');
  const strip = `<div class="copy-filter-strip is-static">
    <div class="copy-filter-strip-static">
      <span class="copy-filter-strip-cap-t">
        <svg viewBox="0 0 12 12" fill="none"><path d="M2 3h8M3 6h6M4 9h4" stroke-linecap="round"/></svg>
        Filters
      </span>
      ${filterItems}
    </div>
  </div>`;
  const expiredBanner = expired ? `<div class="copy-expired-banner">
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5"/><path d="M7 4v3.5l2 1.2"/></svg>
    <span><b>This share link expired</b> on ${_fmtDate(copy.expiresAt)}. Recipients can no longer view this copy — edit the expiration below to renew it.</span>
  </div>` : '';
  const paper = _renderCopyPaper(copy);
  return `<div class="copy-doc-wrap">
    <div class="copy-crumb">
      <button class="copy-crumb-back" onclick="closeCopy()" title="Back to all copies">
        <span aria-hidden="true">‹</span> Back
      </button>
      <span class="copy-crumb-div"></span>
      <span class="copy-crumb-name">${esc(copy.name)}</span>
      <button class="copy-crumb-edit" onclick="openEditCopy('${copy.id}')" title="Rename or change filters" aria-label="Edit copy">
        <svg viewBox="0 0 14 14"><path d="M9 2.5l2.5 2.5-6 6H3v-2.5l6-6z" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <span class="copy-crumb-meta">Based on ${esc(versionLabel(ver))} · ${expired?'Expired':'Expires'} ${_fmtDate(copy.expiresAt)}</span>
      <span class="copy-crumb-sp"></span>
      <button class="copy-share-btn" onclick="openCopyShare('${copy.id}')">
        <svg viewBox="0 0 16 16" fill="none"><path d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9L1.5 6L14.5 1.5Z" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Share
      </button>
    </div>
    ${strip}
    <div class="copy-paper">${expiredBanner}${paper}</div>
  </div>`;
}

function _renderCopyPaper(copy){
  // Filter TASKS per copy's filter recipe. No editing — pure projection.
  let scopeTasks = TASKS.slice();
  if(copy.filters.contractor) scopeTasks = scopeTasks.filter(t => t.gc === copy.filters.contractor);
  if(copy.filters.renterOnly) scopeTasks = scopeTasks.filter(isTenantTask);
  const showPricing = !!copy.filters.showAmounts;

  if(!scopeTasks.length){
    return `<div style="padding:60px 40px;text-align:center">
      <div class="art-eyebrow" style="margin-bottom:14px">Scope of work</div>
      <div class="art-title" style="font-size:22px">No tasks match this filter</div>
      <div class="art-sub-info" style="margin-top:8px">Adjust the filters above to include more line items.</div>
    </div>`;
  }

  // Group tasks by room, preserving TASKS order.
  const groups = [];
  const seen = {};
  scopeTasks.forEach(t => {
    if(seen[t.room] === undefined){ seen[t.room] = groups.length; groups.push({room:t.room, items:[]}); }
    groups[seen[t.room]].items.push(t);
  });
  const grandTotal = scopeTasks.reduce((s,t)=>s+dollars(t.cost), 0);
  const grandLabor = scopeTasks.reduce((s,t)=>s+dollars(t.pcost||'$0'), 0);
  const pricingHead = showPricing ? `<th class="art-col-num">Labor</th><th class="art-col-amt">Amount</th>` : '';
  const rows = groups.map(g => {
    const gTotal = g.items.reduce((s,t)=>s+dollars(t.cost), 0);
    const gLabor = g.items.reduce((s,t)=>s+dollars(t.pcost||'$0'), 0);
    const itemRows = g.items.map(t => {
      const contractor = t.gc || '<span class="art-unassigned">Unassigned</span>';
      const product = t.product && !/not selected/i.test(t.product) ? t.product : '<span class="art-muted">Product not selected</span>';
      const priceCells = showPricing
        ? `<td class="art-num">${t.pcost || '$0'}</td>
           <td class="art-amt">${t.cost}</td>`
        : '';
      // Photos honor the copy's includePhotos filter — checkbox unchecked
      // suppresses the entire photo strip, matching the "Include photos"
      // filter that recipients see (or don't see) on the shared link.
      const includePhotos = copy.filters.includePhotos !== false;
      const photoStrip = (includePhotos && t.photos>0) ? `<div class="art-photos">
        ${Array.from({length:t.photos}).map((_,i)=>{
          const cap = ART_PHOTO_CAPS[i] || `Photo ${i+1}`;
          return `<button class="art-thumb" onclick="artOpenPhoto('${t.code}',${i})" title="${esc(cap)}">${svgPhoto()}<span class="art-thumb-cap">${esc(cap)}</span></button>`;
        }).join('')}
      </div>` : '';
      const detailColspan = showPricing ? 5 : 3;
      const hasDetail = (t.desc || t.opt || product || photoStrip);
      const selCls = (selId && TASKS.find(x=>x.id===selId)?.code===t.code) ? ' art-selected' : '';
      const detailRow = hasDetail ? `<tr class="art-item-detail${selCls}" data-row-tid="${t.code}-detail" data-select-code="${t.code}">
        <td class="art-id"></td>
        <td class="art-item-wide" colspan="${detailColspan}">
          <div class="art-desc">${t.desc || t.opt || ''}</div>
          <div class="art-product"><span class="art-lbl">Product</span> <span>${product}</span></div>
          ${photoStrip}
        </td>
      </tr>` : '';
      return `<tr data-row-tid="${t.code}" data-select-code="${t.code}" class="art-item-main${selCls}">
        <td class="art-id">${t.code}</td>
        <td class="art-item"><div class="art-name">${esc(t.name)}</div></td>
        <td class="art-gc">${contractor}</td>
        <td class="art-num">${t.qty || '—'}</td>
        ${priceCells}
      </tr>${detailRow}`;
    }).join('');
    const grpColspan = showPricing ? 6 : 4;
    const subRow = showPricing ? `<tr class="art-sub">
        <td colspan="4"></td>
        <td class="art-num art-sub-l">${money(gLabor)}</td>
        <td class="art-amt art-sub-a">${money(gTotal)}</td>
      </tr>` : '';
    return `
      <tr class="art-grp">
        <td class="art-grp-name" colspan="${grpColspan}"><span class="art-grp-room">${g.room.toUpperCase()}</span><span class="art-grp-count-inline">${g.items.length} ${g.items.length===1?'item':'items'}</span></td>
      </tr>
      ${itemRows}
      ${subRow}
    `;
  }).join('');

  const grandRows = showPricing ? `<tfoot>
            <tr class="art-grand">
              <td colspan="4"></td>
              <td class="art-num">${money(grandLabor)}</td>
              <td class="art-amt art-grand-a">${money(grandTotal)}</td>
            </tr>
            <tr class="art-grand-lbl">
              <td colspan="4"></td>
              <td class="art-num">Labor total</td>
              <td class="art-amt">Scope total</td>
            </tr>
          </tfoot>` : '';

  return `
    <div class="art-head">
      <div class="art-head-l">
        <div class="art-eyebrow">Scope of work · ${esc(versionLabel(VERSIONS.find(v=>v.id===copy.basedOnVersionId)||{num:1}))}</div>
        <div class="art-title">3484 South Main Street</div>
        <div class="art-sub-info">Atlanta, GA 30315 · Single-family renovation</div>
      </div>
      <div class="art-head-r">
        ${copy._isHistorical ? '' : `<div class="art-meta">
          <div class="art-meta-k">Prepared for</div>
          <div class="art-meta-v">${esc(copy.name)}</div>
        </div>
        <div class="art-meta">
          <div class="art-meta-k">Prepared</div>
          <div class="art-meta-v">${_fmtDate(copy.createdAt)}</div>
        </div>`}
        ${(()=>{
          // "Based on" only makes sense when the doc is derived from an
          // earlier version — i.e. a change order (v.num > 1) or a copy
          // that references some version. For the original scope (v1),
          // there's nothing older to be "based on", so we omit the row.
          const v = VERSIONS.find(x => x.id === copy.basedOnVersionId) || {num:1};
          if(v.num <= 1) return '';
          return `<div class="art-meta">
            <div class="art-meta-k">Based on</div>
            <div class="art-meta-v">${esc(versionLabel(v))}</div>
          </div>`;
        })()}
        <div class="art-meta">
          <div class="art-meta-k">Document ID</div>
          <div class="art-meta-v art-meta-docid">${esc(_sowIdFor(copy._isHistorical ? copy.basedOnVersionId : (copy.shareToken || copy.id)))}</div>
        </div>
      </div>
    </div>
    <table class="art-table">
      <thead>
        <tr>
          <th class="art-col-id">ID</th>
          <th class="art-col-item">Item</th>
          <th class="art-col-gc">Contractor</th>
          <th class="art-col-num">Qty</th>
          ${pricingHead}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      ${grandRows}
    </table>`;
}

/* ── Share / New / Edit copy modals ─────────────────────────────────── */
function _ensureCopyModals(){
  if(document.getElementById('copyShareModal')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="se-modal-scrim" id="copyModalScrim" onclick="closeCopyModals()"></div>
    <div class="se-modal copy-modal" id="copyShareModal">
      <div class="se-modal-cap">Share scope copy</div>
      <div class="se-modal-title" id="copyShareTitle">Copy name</div>
      <div class="copy-share-body" id="copyShareBody"></div>
      <div class="se-modal-actions">
        <button class="se-btn se-btn-secondary" onclick="closeCopyModals()">Close</button>
      </div>
    </div>
    <div class="se-modal copy-modal" id="copyFormModal">
      <div class="se-modal-cap" id="copyFormCap">New copy</div>
      <div class="se-modal-title" id="copyFormTitle">Create a new scope copy</div>
      <div class="copy-form-body" id="copyFormBody"></div>
      <div class="se-modal-actions">
        <button class="se-btn se-btn-secondary" onclick="closeCopyModals()">Cancel</button>
        <button class="se-btn se-btn-primary" id="copyFormSave" onclick="saveCopyForm()">Save</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}
function closeCopyModals(){
  const s = document.getElementById('copyModalScrim');
  const sh = document.getElementById('copyShareModal');
  const fm = document.getElementById('copyFormModal');
  if(s) s.classList.remove('open');
  if(sh) sh.classList.remove('open');
  if(fm) fm.classList.remove('open');
  _copyFormEditingId = null;
}
function openCopyShare(id){
  const c = copyById(id); if(!c) return;
  _ensureCopyModals();
  const link = `https://kaiizen.app/scope/${c.shareToken}`;
  const previewHref = `ScopeCopy_Recipient.html?token=${encodeURIComponent(c.shareToken)}`;
  const expiredHref = previewHref + '&expired=1';
  const expired = copyIsExpired(c);
  const summary = _copyFilterSummary(c).map(s => `<span class="copy-share-summary-i">${esc(s)}</span>`).join('');
  document.getElementById('copyShareTitle').textContent = c.name;
  document.getElementById('copyShareBody').innerHTML = `
    <div class="copy-share-section">
      <span class="copy-share-lbl">Shareable link</span>
      <div class="copy-link-row">
        <input class="copy-link" id="copyShareLink" value="${esc(link)}" readonly onclick="this.select()">
        <button class="copy-link-btn" onclick="copyLinkToClipboard()">Copy link</button>
      </div>
      <span class="copy-share-note">Anyone with this link can view the copy. No login required.</span>
    </div>
    <div class="copy-share-section">
      <span class="copy-share-lbl">Expiration</span>
      <div class="copy-share-exp">
        <span class="copy-share-exp-v${expired?' is-expired':''}">${expired?'Expired':'Expires'} ${_fmtDate(c.expiresAt)}</span>
      </div>
    </div>
    <div class="copy-share-section">
      <span class="copy-share-lbl">Recipient will see</span>
      <div class="copy-share-summary">${summary}</div>
    </div>
    <div class="copy-share-section">
      <span class="copy-share-lbl">Preview the recipient view</span>
      <div class="copy-share-preview">
        <a href="${previewHref}" target="_blank" rel="noopener">Open recipient preview →</a>
        <a href="${expiredHref}" target="_blank" rel="noopener">Preview as expired →</a>
      </div>
    </div>`;
  document.getElementById('copyModalScrim').classList.add('open');
  document.getElementById('copyShareModal').classList.add('open');
}
function copyLinkToClipboard(){
  const input = document.getElementById('copyShareLink'); if(!input) return;
  const val = input.value;
  const done = ()=>toast('Link copied');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(val).then(done, ()=>{
      input.select(); try{ document.execCommand('copy'); }catch(_){} done();
    });
  } else {
    input.select(); try{ document.execCommand('copy'); }catch(_){} done();
  }
}
function extendCopyExpiration(id, val){
  if(!val) return;
  const c = copyById(id); if(!c) return;
  if(val === 'none'){ c.expiresAt = '2099-12-31'; toast('Expiration removed'); }
  else { c.expiresAt = _addDays(_todayIso(), parseInt(val,10)); toast(`Expiration extended by ${val} days`); }
  openCopyShare(id);   // re-render modal
  renderArtifact();
}

/* ── New / Edit form ── */
let _copyFormEditingId = null;
function openNewCopy(){ _openCopyForm(null); }
function openEditCopy(id){ _openCopyForm(id); }
function _openCopyForm(id){
  _ensureCopyModals();
  _copyFormEditingId = id;
  const existing = id ? copyById(id) : null;
  const defaults = existing || {
    name:'', description:'', basedOnVersionId:currentVersionId,
    filters:{showAmounts:true, contractor:null, renterOnly:false, includePhotos:true},
  };
  // Migrate older copies that were created before includePhotos was
  // introduced — default them to true so the checkbox reflects reality.
  if(defaults.filters && typeof defaults.filters.includePhotos === 'undefined'){
    defaults.filters.includePhotos = true;
  }
  document.getElementById('copyFormCap').textContent = existing ? 'Edit copy' : 'New copy';
  document.getElementById('copyFormTitle').textContent = existing ? 'Edit scope copy' : 'Create a new scope copy';
  document.getElementById('copyFormSave').textContent = existing ? 'Save changes' : 'Create copy';
  const verOpts = VERSIONS.map(v => `<option value="${v.id}"${v.id===defaults.basedOnVersionId?' selected':''}>${esc(versionLabel(v))} · ${esc(v.at)}</option>`).join('');
  const contractorOpts = ['<option value="">All contractors</option>']
    .concat(CONTRACTORS.map(c => `<option value="${esc(c)}"${c===defaults.filters.contractor?' selected':''}>${esc(c)}</option>`))
    .join('');
  document.getElementById('copyFormBody').innerHTML = `
    <div class="copy-form-row">
      <span class="copy-form-lbl">Name</span>
      <input class="copy-form-input" id="copyFormName" placeholder="e.g. Apex Carpentry — kitchen bid" value="${esc(defaults.name)}">
    </div>
    <div class="copy-form-row">
      <span class="copy-form-lbl">Based on version</span>
      <select class="copy-form-sel" id="copyFormVer">${verOpts}</select>
    </div>
    <div class="copy-form-row">
      <span class="copy-form-lbl">Contractor filter</span>
      <select class="copy-form-sel" id="copyFormGc">${contractorOpts}</select>
    </div>
    <div class="copy-form-row copy-form-row-inline">
      <label class="copy-filter-chk">
        <span class="box-halo"><input type="checkbox" id="copyFormShowAmt"${defaults.filters.showAmounts?' checked':''}></span>
        <span class="copy-filter-chk-lbl">Show dollar amounts</span>
      </label>
      <label class="copy-filter-chk">
        <span class="box-halo"><input type="checkbox" id="copyFormRenter"${defaults.filters.renterOnly?' checked':''}></span>
        <span class="copy-filter-chk-lbl">Resident-responsible only</span>
      </label>
      <label class="copy-filter-chk">
        <span class="box-halo"><input type="checkbox" id="copyFormPhotos"${defaults.filters.includePhotos?' checked':''}></span>
        <span class="copy-filter-chk-lbl">Include photos</span>
      </label>
    </div>`;
  document.getElementById('copyModalScrim').classList.add('open');
  document.getElementById('copyFormModal').classList.add('open');
  setTimeout(()=>{ const el=document.getElementById('copyFormName'); if(el) el.focus(); }, 20);
}
function saveCopyForm(){
  const name = document.getElementById('copyFormName').value.trim() || 'Untitled copy';
  const ver  = document.getElementById('copyFormVer').value;
  const gc   = document.getElementById('copyFormGc').value || null;
  const showAmt = document.getElementById('copyFormShowAmt').checked;
  const renter  = document.getElementById('copyFormRenter').checked;
  const photos  = document.getElementById('copyFormPhotos').checked;
  // Description field was removed from the form — preserve any existing
  // description on edit, default to empty on new.
  if(_copyFormEditingId){
    const c = copyById(_copyFormEditingId);
    if(c){
      c.name = name; c.basedOnVersionId = ver;
      c.filters = {showAmounts:showAmt, contractor:gc, renterOnly:renter, includePhotos:photos};
    }
    closeCopyModals();
    renderArtifact();
    toast('Copy updated');
  } else {
    const newId = _copyId();
    SCOPE_COPIES.push({
      id:newId, name, description:'', basedOnVersionId:ver,
      createdAt:_todayIso(), shareToken:_copyToken(),
      expiresAt:_addDays(_todayIso(), 30),
      filters:{showAmounts:showAmt, contractor:gc, renterOnly:renter, includePhotos:photos},
    });
    closeCopyModals();
    openCopy(newId);
    toast('Copy created');
  }
}

/* ── Room metadata (dimensions + walkthrough notes) : fake but consistent ── */
const ROOM_META = {
  'Kitchen':     {dims:'14′ × 16′ · 224 SF · 9′ ceiling', light:'East-facing windows, bright AM', notes:[
    {who:'Field agent',when:'Apr 18 · 9:42a',body:'Cabinet base near sink showing water damage. Counters scratched, laminate edges lifting. Walls in good condition.'},
    {who:'Designer',when:'Apr 22 · 11:00a',body:'Stick with white shaker direction. Quartz over granite. Use Daltile subway 3×6 matte for backsplash.'},
  ]},
  'Living Room': {dims:'15′ × 18′ · 270 SF · 9′ ceiling', light:'South-facing bay window, full sun midday', notes:[
    {who:'Field agent',when:'Apr 18 · 9:55a',body:'Carpet stained, edges peeling at transition strip. Walls have nail holes throughout.'},
  ]},
  'Master Bath': {dims:'8′ × 10′ · 80 SF · 8′ ceiling', light:'North-facing small window', notes:[
    {who:'Field agent',when:'Apr 19 · 10:12a',body:'Shower grout failing, tile chipped near drain. Vanity dated, plumbing roughed for double sink.'},
    {who:'Designer',when:'Apr 22 · 11:15a',body:'Homeowner approved 48" double vanity allowance. Awaiting final selection from 3 shortlisted units.'},
  ]},
  'Bathroom':    {dims:'6′ × 9′ · 54 SF · 8′ ceiling', light:'No window (vent fan only)', notes:[
    {who:'Field agent',when:'Apr 19 · 10:30a',body:'Vanity in decent shape, refacing only. Floor tile worn but structurally sound.'},
  ]},
  'Master Bed':  {dims:'13′ × 15′ · 195 SF · 9′ ceiling', light:'East-facing window + ceiling fan', notes:[
    {who:'Field agent',when:'Apr 18 · 10:15a',body:'Carpet in usable shape but homeowner wants LVP throughout. Closet has no shelving.'},
  ]},
  'Bedroom 2':   {dims:'11′ × 12′ · 132 SF · 9′ ceiling', light:'West-facing window', notes:[
    {who:'Field agent',when:'Apr 18 · 10:25a',body:'Repaint only. No other work needed.'},
  ]},
  'Garage':      {dims:'20′ × 20′ · 400 SF · 9′ ceiling', light:'No windows, fluorescent overhead', notes:[
    {who:'Field agent',when:'Apr 18 · 10:40a',body:'Door opener noisy, leaking oil. Sensors misaligned.'},
  ]},
};

// Drawing-variant gallery: full-scope photo overview. Unsorted section at top,
// then per-room sections with group photos + task subsections. Ported from the
// Kai Web Right-Panel prototype.
function galArrowUp(){ return `<svg viewBox="0 0 12 12" fill="none"><path d="M3 7.5L6 4.5l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function galArrowDn(){ return `<svg viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function galPlusSvg(){ return `<svg viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`; }
function galBcArrow(){ return `<svg viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function galCheckSvg(){ return `<svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5l2.5 2.5L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function drawingPhotoBox(p){
  const m=photoMeta(p.seed||0);
  const scopeTag = p.kind==='task' ? 'Task' : (p.kind==='unsorted' ? 'Unsorted' : 'Group');
  const isUnsorted = p.kind==='unsorted';
  return `<div class="ds-photo${isUnsorted?' ds-photo-unsorted':''}" data-pid="${p.id}" onclick="openGalleryPhoto(${p.id})">
    <button class="ds-check" onclick="event.stopPropagation();toggleGalleryPhotoSel(${p.id})" aria-label="Select photo">${galCheckSvg()}</button>
    <div class="ds-hover">
      <div class="ds-hover-top"><span class="ds-hover-tag">${scopeTag}</span></div>
      <div class="ds-hover-info">
        <span class="ds-hover-who">${m.who}</span>
        <span class="ds-hover-sub">${m.source} · ${m.date}</span>
      </div>
    </div>
  </div>`;
}
// ── Photo Overlay Modal (poModal) ──────────────────────────────────
// Full-screen photo + task detail modal. Ported from Compare prototype.
// Opens from every photo click site (Gallery tiles, Pano cells,
// Progress timeline cells, activity-page thumbnails). Artifact-tab
// thumbnails use the separate artOpenPhoto() → #artLightbox path.
let __poCurrentPid = null;
function _poEnsureDom(){
  if(document.getElementById('poModal')) return;
  const el = document.createElement('div');
  el.id = 'poModal';
  el.innerHTML = `
    <div class="po-scrim" onclick="closePoModal()"></div>
    <div class="po-card" id="poCard" role="dialog" aria-modal="true">
      <div class="po-left" id="poLeft"></div>
      <div class="po-right" id="poRight">
        <button class="po-close" onclick="closePoModal()" aria-label="Close">
          <svg viewBox="0 0 14 14"><path d="M3 3l8 8M11 3l-8 8" stroke-linecap="round"/></svg>
        </button>
        <div class="po-detail" id="poDetail"></div>
        <div class="po-footer" id="poFooter"></div>
      </div>
    </div>`;
  document.body.appendChild(el);
}
function closePoModal(){
  const el = document.getElementById('poModal');
  if(el) el.classList.remove('is-open');
  document.body.style.overflow = '';
  __poCurrentPid = null;
  try{ window.parent && window.parent.postMessage({type:'kai-photo-overlay', open:false}, '*'); }catch(_){}
}
document.addEventListener('keydown', e => {
  const el = document.getElementById('poModal');
  if(!el || !el.classList.contains('is-open')) return;
  if(e.key === 'Escape'){ closePoModal(); return; }
  if(e.key === 'ArrowLeft'){ poStepPhoto(-1); return; }
  if(e.key === 'ArrowRight'){ poStepPhoto(1); return; }
});
// Given the current photo, find sibling photos on the same task so
// prev/next chevrons walk through them in order.
function _poSiblingsFor(photo){
  if(!photo) return [];
  if(photo.kind === 'task'){
    return (PHOTOS || []).filter(p => p.kind === 'task' && p.task === photo.task)
      .sort((a,b) => (a.id||0) - (b.id||0));
  }
  if(photo.kind === 'group'){
    return (PHOTOS || []).filter(p => p.kind === 'group' && p.room === photo.room)
      .sort((a,b) => (a.id||0) - (b.id||0));
  }
  return (PHOTOS || []).filter(p => p.kind === photo.kind).sort((a,b) => (a.id||0) - (b.id||0));
}
function poStepPhoto(dir){
  const cur = (PHOTOS || []).find(p => p.id === __poCurrentPid);
  if(!cur) return;
  const sibs = _poSiblingsFor(cur);
  const idx = sibs.findIndex(p => p.id === cur.id);
  if(idx < 0) return;
  const next = sibs[(idx + dir + sibs.length) % sibs.length];
  if(next) openGalleryPhoto(next.id);
}
function _poCollapseToggle(){
  const wrap = document.querySelector('#poLeft .po-strip-wrap');
  if(!wrap) return;
  const btn = document.querySelector('#poLeft .po-cap-collapse');
  const collapsed = wrap.style.display === 'none';
  wrap.style.display = collapsed ? '' : 'none';
  if(btn) btn.innerHTML = collapsed
    ? '<svg viewBox="0 0 12 12" fill="none"><path d="M3 8l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Collapse'
    : '<svg viewBox="0 0 12 12" fill="none"><path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Expand';
}
function _poRenderLeft(photo, task){
  const walk = (photo.walk && typeof walkFor === 'function') ? walkFor(photo.walk) : null;
  // Only surface milestone walk names on the hero — Progress walks are
  // context noise (their date carries enough meaning) so skip the chip.
  const isMilestoneWalk = walk && !/^Progress/i.test(walk.short || '');
  const walkTag = isMilestoneWalk ? `<span class="po-hero-walk"><span class="po-hero-walk-dot" style="background:${walk.color}"></span>${esc(walk.short)}</span>` : '';
  const bg = _photoBg(photo, 0);
  // Hero image: prefer a real URL when the demo has one, else fallback SVG placeholder.
  // photo.src first: a file added through the manager is the one case where
  // we hold the actual image, and the hero is where you'd most want to see it.
  const heroUrl = (photo.src || photo.url || (task && task.photoUrls && task.photoUrls[(task._poIdx||0)])) || null;
  const heroInner = heroUrl
    ? `<img class="po-hero-img" src="${heroUrl}" alt="" onerror="this.replaceWith(Object.assign(document.createElementNS('http://www.w3.org/2000/svg','svg'),{}))">`
    : `<div class="po-hero-svg">${svgPhoto()}</div>`;
  // Task photo strip — every photo on this task, walk-tagged.
  const taskCode = task ? task.code : null;
  // Most-recent-first by the walk's date. WALKS is stored in chronological
  // order, so use the walk-index descending as a stable proxy for "newest
  // date first"; fall back to id for photos whose walk isn't in WALKS.
  const _walkIdx = wid => {
    const i = (WALKS || []).findIndex(w => w.id === wid);
    return i < 0 ? -1 : i;
  };
  const _photoRecency = (a,b) => {
    const wi = _walkIdx(b.walk) - _walkIdx(a.walk);
    if(wi !== 0) return wi;
    return (b.id||0) - (a.id||0);
  };
  const taskPhotos = taskCode ? (PHOTOS || []).filter(p => p.kind === 'task' && p.task === taskCode).sort(_photoRecency) : [];
  const groupPhotos = task ? (PHOTOS || []).filter(p => p.kind === 'group' && p.room === task.room).sort(_photoRecency) : [];
  const thumbBg = p => _photoBg(p, 0);
  const thumbHtml = p => {
    return `<button class="po-thumb${p.id === photo.id ? ' is-current' : ''}" style="background:${thumbBg(p)}" onclick="openGalleryPhoto(${p.id})"></button>`;
  };
  const taskStripHtml = taskPhotos.length
    ? `<div class="po-strip-group">
         <div class="po-strip-title">${task ? esc(task.name) : 'Photos'} · ${taskPhotos.length} ${taskPhotos.length===1?'photo':'photos'}</div>
         <div class="po-strip">${taskPhotos.map(thumbHtml).join('')}</div>
       </div>` : '';
  const groupStripHtml = groupPhotos.length
    ? `<div class="po-strip-group">
         <div class="po-strip-title">Group · ${groupPhotos.length} ${groupPhotos.length===1?'photo':'photos'}</div>
         <div class="po-strip">${groupPhotos.map(thumbHtml).join('')}</div>
       </div>` : '';
  const stripWrap = (taskStripHtml || groupStripHtml)
    ? `<div class="po-strip-wrap">${taskStripHtml}${groupStripHtml}</div>` : '';
  // Cap bar meta
  const idx = _poSiblingsFor(photo).findIndex(p => p.id === photo.id);
  const total = _poSiblingsFor(photo).length;
  /* Read the photo rather than the walk. The author is photo.by — an upload's
     author isn't whoever ran the nearest walk, and a photo added in the
     manager has no walk at all, which used to caption it "Field agent · ·
     Camera". Date falls back to when it landed, and the last field names how
     it got here instead of always claiming a camera. */
  const _capBy   = photo.by || (walk ? walk.conductor : 'Field agent');
  const _capDate = walk && walk.date
    ? walk.date
    : (photo.addedAt
        ? new Date(photo.addedAt).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})
        : '');
  const _capSrc  = photo.source === 'uploaded' ? 'Upload' : 'Camera';
  const capMeta = `<b>${esc(_capBy)}</b><span class="po-cap-sep">·</span>${esc(_capDate)}<span class="po-cap-sep">·</span>${idx+1} of ${total}<span class="po-cap-sep">·</span>${_capSrc}`;
  const left = document.getElementById('poLeft');
  left.innerHTML = `
    <div class="po-hero-col">
      <div class="po-hero" style="background:${bg}">
        ${walkTag}
        ${heroInner}
        ${total > 1 ? `<button class="po-nav prev" onclick="poStepPhoto(-1)" aria-label="Previous"><svg viewBox="0 0 12 12"><path d="M7.5 2l-3 4 3 4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
        ${total > 1 ? `<button class="po-nav next" onclick="poStepPhoto(1)" aria-label="Next"><svg viewBox="0 0 12 12"><path d="M4.5 2l3 4-3 4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
      </div>
      <div class="po-cap">
        <div class="po-cap-l">${capMeta}</div>
      </div>
    </div>
    ${stripWrap}`;
}
function _poRenderRight(photo, task){
  if(!task){
    document.getElementById('poDetail').innerHTML = `
      <div class="po-section">
        <div class="po-header-title">Unsorted photo</div>
        <div class="po-grid">
          <span class="po-grid-lbl">Photo ID</span><span class="po-grid-val mono">#${photo.id}</span>
          <span class="po-grid-lbl">Kind</span><span class="po-grid-val">${esc(photo.kind || 'unsorted')}</span>
        </div>
      </div>`;
    document.getElementById('poFooter').innerHTML = '';
    return;
  }
  const walk = (photo.walk && typeof walkFor === 'function') ? walkFor(photo.walk) : null;
  const room = task.room;
  const roomColor = (typeof ROOM_COLORS !== 'undefined' && ROOM_COLORS[room]) ? ROOM_COLORS[room] : 'var(--midtone)';
  // Status pill — read from STATUS + approved set (same normalisation the sidebar uses).
  const isApproved = approved.has(task.id);
  let statusKey = 'not_started';
  if(task.editRequested) statusKey = 'needs_rework';
  else if(isApproved) statusKey = 'complete';
  else if(STATUS[task.status]) statusKey = task.status;
  const statusMeta = STATUS[statusKey] || STATUS.not_started;
  const statusColor = statusKey === 'complete' ? 'var(--success)'
    : statusKey === 'needs_rework' ? 'var(--error)'
    : statusKey === 'in_progress' ? 'var(--progress,#2E5A87)'
    : 'var(--t2)';
  // Financials
  const laborNum = _parseDollars(task.rate);
  const qtyNum = _parseQtyNum(task.qty);
  const laborTotal = laborNum * qtyNum;
  const matTotal = _parseDollars(task.pcost);
  const taskTotal = _parseDollars(task.cost);
  // Materials list — use taskOptions if available, else primary product only.
  let materials = [];
  if(typeof taskOptions === 'function'){
    const opts = taskOptions(task) || [];
    opts.forEach(o => (o.products || []).forEach(p => {
      if(p && p.product) materials.push({name:p.product, pcost:p.pcost || ''});
    }));
  }
  if(!materials.length && task.product){
    materials.push({name:task.product, pcost:task.pcost || ''});
  }
  const materialsHtml = materials.length
    ? materials.map(m => `
        <span class="po-grid-lbl">${esc(m.name)}</span>
        <span class="po-grid-val mono">${esc(m.pcost || '—')}</span>`).join('')
    : `<span class="po-grid-lbl" style="color:var(--t3);font-style:italic">No materials</span><span></span>`;
  // Synthesized activity feed
  const activity = [];
  if(walk) activity.push({dot:'green', who: walk.conductor || 'Field agent', action: ` captured photo on ${walk.label}`, time: walk.date});
  if(task.gc) activity.push({dot:'blue', who: task.gc, action: ' assigned to task', time: 'Apr 21, 2026'});
  if(isApproved) activity.push({dot:'green', who: 'Admin', action: ' approved the task', time: 'Recently'});
  if(task.editRequested) activity.push({dot:'red', who: 'Admin', action: ' requested edit', time: 'Recently'});
  const activityHtml = activity.map(a => `
    <div class="po-tl-item">
      <div class="po-tl-dot ${a.dot||''}"></div>
      <div class="po-tl-who">${esc(a.who)}<span class="po-tl-action">${esc(a.action)}</span></div>
      <div class="po-tl-time">${esc(a.time)}</div>
    </div>`).join('');
  document.getElementById('poDetail').innerHTML = `
    <div class="po-section" style="padding-top:24px">
      <div class="po-header-title">${esc(task.name)}</div>
      <div class="po-header-group">${esc(room)}</div>
      <div class="po-header-totalrow">
        <span class="po-header-totalrow-total"><span class="po-header-totalrow-lbl">Task total</span><span class="po-header-totalrow-val">${esc(task.cost || _fmtDollars(taskTotal))}</span></span>
        <a class="po-header-totalrow-edit" href="#" onclick="event.preventDefault();closePoModal();if(typeof selectTask==='function')selectTask(${task.id});">Go to Editor →</a>
      </div>
    </div>
    <div class="po-section">
      <div class="po-section-title">Photo info</div>
      <div class="po-grid">
        <span class="po-grid-lbl">Status</span><span class="po-grid-val status" style="color:${statusColor}">${esc(statusMeta.label)}</span>
        <span class="po-grid-lbl">Walk date</span><span class="po-grid-val mono">${walk ? esc(walk.date) : '—'}</span>
        <span class="po-grid-lbl">Field user</span><span class="po-grid-val">${walk ? esc(walk.conductor) : '—'}</span>
        <span class="po-grid-lbl">Source</span><span class="po-grid-val">${(photo.id % 2 === 0) ? 'Taken by Phone' : 'Upload from Computer'}</span>
      </div>
    </div>
    <div class="po-section">
      <div class="po-section-title">Task info</div>
      <div class="po-grid">
        <span class="po-grid-lbl">Task ID</span><span class="po-grid-val mono">${esc(task.code)}</span>
        <span class="po-grid-lbl">Contractor</span><span class="po-grid-val">${esc(task.gc || 'Unassigned')}</span>
        <span class="po-grid-lbl">Labor <span style="color:var(--t3);font-size:11.5px">· ${esc(task.qty || '—')} × ${esc(task.rate || '—')}</span></span>
        <span class="po-grid-val mono">${_fmtDollars(laborTotal)}</span>
        ${materialsHtml}
      </div>
    </div>
    <div class="po-section">
      <div class="po-section-title">Notes</div>
      ${task.desc ? `<div class="po-note-box">${esc(task.desc)}<div class="po-note-meta">Task description</div></div>` : '<div style="color:var(--t3);font-size:12px;font-style:italic">No notes yet.</div>'}
    </div>`;
  document.getElementById('poFooter').innerHTML = `
    <button class="po-btn danger po-btn-icononly" onclick="closePoModal();if(typeof toast==='function')toast('Delete flow — not wired')" title="Delete" aria-label="Delete">
      <svg viewBox="0 0 14 14"><path d="M2 3.5h10M5.5 3.5V2.5h3v1M6 6v4M8 6v4M3.5 3.5l.5 8h6l.5-8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <button class="po-btn" onclick="closePoModal();if(typeof openEditRequest==='function')openEditRequest(${task.id})">
      <svg viewBox="0 0 14 14"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Request edit
    </button>
    <button class="po-btn primary" onclick="if(typeof toggleApprove==='function')toggleApprove(${task.id});closePoModal()">
      <svg viewBox="0 0 14 14"><path d="M3 7.5l3 3 5-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ${isApproved ? 'Approved' : 'Approve'}
    </button>`;
}
function openGalleryPhoto(pid){
  _poEnsureDom();
  const photo = (PHOTOS || []).find(p => p.id === pid);
  if(!photo){ if(typeof toast === 'function') toast('Photo not found'); return; }
  __poCurrentPid = pid;
  // Find the task the photo belongs to (task photos have p.task === t.code; group photos have no task).
  const task = photo.kind === 'task'
    ? TASKS.find(t => t.code === photo.task)
    : (photo.kind === 'group' ? TASKS.find(t => t.room === photo.room) : null);
  _poRenderLeft(photo, task);
  _poRenderRight(photo, task);
  const el = document.getElementById('poModal');
  el.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  // Tell shell to dim its global nav so the scrim looks continuous across
  // the iframe boundary.
  try{ window.parent && window.parent.postMessage({type:'kai-photo-overlay', open:true}, '*'); }catch(_){}
}
function toggleGalleryPhotoSel(pid){ if(typeof toast==='function') toast('Selection UI coming next'); }
function openAddGalleryModal(target){
  const label = target.kind==='unsorted' ? 'Unsorted' : (target.kind==='group' ? target.room + ' (group)' : target.room + ' · ' + target.task);
  if(typeof toast==='function') toast('Add photos to ' + label + ' — upload flow next');
}
function toggleGalSection(key){
  mediaCollapsed.has(key) ? mediaCollapsed.delete(key) : mediaCollapsed.add(key);
  renderGallery();
}
