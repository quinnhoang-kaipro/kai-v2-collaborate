/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · DOCUMENT · the page frame and the paper
   shellHtml() is the whole tab's markup — controls card, paper, margin lane,
   legend, timebar shell. renderDoc() fills the table AS OF the playhead.
   Row selection lives here too, since it is a property of the paper.

   Part of the Artifact 2 tab, split across js/a2/*.js. These are plain
   top-level declarations sharing one script scope, same as the rest of
   the panel — no IIFE, so any module can call any other.
   ════════════════════════════════════════════════════════════════════ */
/* ════════════ SHELL ════════════
   Controls card + paper + gutter + legend, all inside one scroller, with the
   scrubber pinned below — the Artifact tab's stacked-page proportions. */
function shellHtml(){
  return `<div class="a2-root" id="a2Root">
    <div class="a2-scroll" id="a2Scroll">
      <div class="a2-page">

        <div class="hist-grid" id="a2Vers">${VER_ORDER.map(k=>{
          const v = VER[k];
          return `<button class="hist-card${v.stateCls}" type="button" data-ver="${k}" onclick="a2JumpVer('${k}')" title="Scrub to ${a2Esc(v.label)}">
            <div class="hist-card-name">${a2Esc(v.label)}</div>
            <div class="hist-card-meta">Approved ${a2Esc(v.date)}</div>
            <div class="hist-card-docid">${a2Esc(v.sow)}</div>
            <div class="hist-card-foot">
              <span class="hist-card-budget">${a2Esc(fmtMoney(v.budget))}</span>
              <span class="hist-card-tag${v.tagCls?` hist-tag-${v.tagCls}`:''}">${a2Esc(v.tag)}</span>
            </div>
          </button>`;
        }).join('')}</div>

        <div class="a2-stage">
          <div class="a2-paper" id="a2Paper">
            <div class="a2-head">
              <div class="a2-head-l">
                <div class="a2-eyebrow">Artifact · Scope of Work · Change History</div>
                <div class="a2-doc-title">3484 South Main Street</div>
                <div class="a2-doc-sub">Atlanta, GA 30315 · Single-family renovation</div>
              </div>
              <div class="a2-head-r">
                <div><div class="a2-meta-k">Compared</div><div class="a2-meta-v">Original → Change Order 2</div></div>
                <div><div class="a2-meta-k">Prepared by</div><div class="a2-meta-v">Kaiizen Engineering</div></div>
                <div><div class="a2-meta-k">Project</div><div class="a2-meta-v">KAI-2241</div></div>
              </div>
            </div>
            <table class="a2-table">
              <thead>
                <tr>
                  <th class="a2-c-item">Item</th>
                  <th class="a2-c-gc">Contractor</th>
                  <th class="a2-c-num a2-r">Qty</th>
                  <th class="a2-c-num a2-r">Labor</th>
                  <th class="a2-c-amt a2-r">Amount</th>
                  <th class="a2-c-media"><span class="a2-sr">Photos &amp; notes</span></th>
                </tr>
              </thead>
              <tbody id="a2Body"></tbody>
              <tfoot id="a2Foot"></tfoot>
            </table>
          </div>
          <div class="a2-margin" id="a2Margin"></div>
        </div>

      </div>
    </div>

    <div class="a2-timebar">
      <div class="a2-timebar-inner" id="a2Scrub"></div>
    </div>
  </div>`;
}

/* ── the document body, AS OF the current playhead time ──
   Cell values roll back to their value-at-T, added rows appear only once
   revealed, and removed rows strike through once revealed. Changed lines are
   flagged by the accent rail on the row; the field that moved and its
   before/after are named on the margin card, so cells carry no mark of their
   own (the per-cell rule this used to draw sat at the bottom of the row
   instead of under the value, and read as a stray mark). */

function renderDoc(){
  const out = [];
  let roomCount = 0;
  SCOPE.forEach(g=>{
    // An added line is absent from the scope until its "added" change lands.
    const vis = g.tasks.filter(t => !t.added || revealed(findCt(t,'added')));
    out.push(`<tr class="a2-grp">
      <td class="a2-gname" colspan="5">${a2Esc(g.room)}<span class="a2-gcount">${vis.length} ${vis.length===1?'item':'items'}</span></td>
      <td class="a2-media-cell">${a2MediaBtn('room', g.room, a2RoomPhotoCount(g.room))}</td>
    </tr>`);
    roomCount++;
    vis.forEach(t=>{
      const isGone = t.removed && revealed(findCt(t,'removed'));
      const gcv  = valueAsOf(t,'Contractor', t.gc);
      const qtyv = valueAsOf(t,'Qty', t.qty);
      const labv = valueAsOf(t,'Labor', t.labor);
      const amtv = valueAsOf(t,'Amount', t.amount);
      const gcHtml = gcv.val ? a2Esc(gcv.val) : `<span class="a2-gc-none">Unassigned</span>`;
      const cls = ['a2-row', isGone?'is-removed':''].filter(Boolean).join(' ');
      const badge  = t.added ? '<span class="a2-badge is-added">New line</span>' : '';
      const rbadge = isGone  ? '<span class="a2-badge is-removed">Removed</span>' : '';
      out.push(`<tr class="${cls}" data-a2-code="${a2Esc(t.code)}" onclick="a2Select('${a2Esc(t.code)}')">
        <td class="a2-item">
          <div class="a2-id">${a2Esc(t.code)}</div>
          <div class="a2-name">${a2NameHtml(t)}${badge}${rbadge}</div>
          <div class="a2-opt">${a2Esc(t.opt)}</div>
        </td>
        <td class="a2-gc">${gcHtml}</td>
        <td class="a2-num">${a2Esc(qtyv.val)}</td>
        <td class="a2-num">${a2Esc(labv.val)}</td>
        <td class="a2-amt">${a2Esc(amtv.val)}</td>
        <td class="a2-media-cell">${a2MediaBtn('task', t.code, a2TaskPhotoCount(t.code))}</td>
      </tr>`);
      const prodv = valueAsOf(t,'Product', t.product);
      const mods = modsAsOf(t);
      const modsHtml = mods.length
        ? `<div class="a2-mods">${mods.map(x=>`<span class="a2-mod ${x.isNew?'is-new':''}">${a2Esc(x.m)}</span>`).join('')}</div>` : '';
      out.push(`<tr class="a2-row a2-detail" data-a2-detail="${a2Esc(t.code)}" onclick="a2Select('${a2Esc(t.code)}')">
        <td colspan="6">
          <div class="a2-desc">${a2Esc(t.desc)}</div>
          <div class="a2-prod"><span class="a2-lbl">Product</span> <span>${a2Esc(prodv.val)}</span></div>
          ${modsHtml}
        </td>
      </tr>`);
    });
  });
  document.getElementById('a2Body').innerHTML = out.join('');
  renderTotal(roomCount);
  applySelection();   // the rows were just replaced; re-mark the selected line
}
/* Selection is a line, not a row: the main row and its detail row light up
   together, so a selected line reads as one block. */
function applySelection(){
  document.querySelectorAll('#a2Body tr[data-a2-code], #a2Body tr[data-a2-detail]').forEach(r=>{
    const code = r.dataset.a2Code || r.dataset.a2Detail;
    r.classList.toggle('is-sel', !!selCode && code === selCode);
  });
}
function selectRow(code){
  selCode = (selCode === code) ? null : code;   // clicking the selected line clears it
  applySelection();
}
/* Running total at the current playhead, in the paper's own footer — the
   same figure the controls card reports, stated where a scope document
   states it. */
function renderTotal(rooms){
  const foot = document.getElementById('a2Foot');
  if(!foot) return;
  const ver = VER[asofVer()];
  foot.innerHTML = `
    <tr class="a2-total">
      <td class="a2-total-k" colspan="2">${rooms} ${rooms===1?'room':'rooms'}</td>
      <td colspan="2"></td>
      <td class="a2-total-a">${a2Esc(fmtMoney(totalAsOf()))}</td>
      <td></td>
    </tr>
    <tr class="a2-total-lbl">
      <td colspan="6">Total as of ${a2Esc(ver.date)}</td>
    </tr>`;
}
