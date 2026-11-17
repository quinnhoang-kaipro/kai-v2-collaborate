/* ════ KaiWeb shell: tabs in the dark bar, the stepper as a status chip ════
   The dark bar is the most prominent row on the page, so it carries what you
   use most: the page tabs (Overview · Scope · Shop · Documents) and the
   Media / Floorplan panel buttons. The three-stage stepper — which you mostly
   read, and which changes a few times over a whole job — folds into a chip
   beside the address; clicking it opens the three stages, what's done, and
   what comes next. (Overview still shows the full stepper.)

   The tabs themselves live inside the panel iframe, which owns their state and
   their behaviour. This bar mirrors them: it redraws whenever the panel's tab
   row changes, and every click is handed back to the real button there. The
   panel's own tab row is collapsed (body.kw-tabs-shell) only once this mirror
   is running, so if anything here fails the old row is still there. */
(function(){
  const bar = document.getElementById('appToolbar');
  if(!bar) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const frame = () => document.getElementById('iframe');
  const fdoc = () => { try{ const f = frame(); return f && f.contentDocument; }catch(e){ return null; } };

  /* ── Our pieces of the bar ── */
  const address = bar.querySelector('.tb-address');
  const stages = document.getElementById('stages');
  const chipWrap = document.createElement('div'); chipWrap.className = 'kw-stage-wrap';
  chipWrap.innerHTML = `<button type="button" class="kw-stage" id="kwStage" aria-haspopup="dialog" aria-expanded="false"></button>
    <div class="kw-stage-pop" id="kwStagePop" role="dialog" aria-label="Project stage" hidden></div>`;
  const tabs = document.createElement('nav'); tabs.className = 'kw-tabs'; tabs.id = 'kwTabs'; tabs.setAttribute('aria-label', 'Pages');
  const spacer = document.createElement('span'); spacer.className = 'kw-sp';
  const spacerL = document.createElement('span'); spacerL.className = 'kw-sp kw-sp-l';
  const refs = document.createElement('div'); refs.className = 'kw-refs'; refs.id = 'kwRefs'; refs.setAttribute('role', 'group'); refs.setAttribute('aria-label', 'Side panel');
  if(address) address.after(chipWrap); else bar.prepend(chipWrap);
  /* Retired from the bar: Overview is where a project opens, and it carries the
     full stepper, so a second stage readout up here only repeated it. Kept in
     the DOM (hidden) so it can come back with one line. */
  chipWrap.hidden = true;
  const turnWrap = document.createElement('div'); turnWrap.className = 'kw-turn-wrap';
  turnWrap.innerHTML = `<button type="button" class="kw-turn" id="kwTurn" aria-haspopup="dialog" aria-expanded="false"></button>
    <div class="kw-stage-pop kw-turn-pop" id="kwTurnPop" role="dialog" aria-label="Whose turn" hidden></div>`;
  chipWrap.after(turnWrap);
  /* Whose turn it is and the move that passes it on are one idea, so they sit
     together: the pill, then the stage's action (Hand off · n of 38 approved ·
     Submit change order, with Cancel change order before it when it shows).
     The buttons keep their own ids and handlers; only their place changes. */
  const turnGroup = document.createElement('div'); turnGroup.className = 'kw-turn-group';
  turnWrap.before(turnGroup); turnGroup.appendChild(turnWrap);
  ['appCancelCoBtn', 'appApproveWrap'].forEach(id => { const el = document.getElementById(id); if(el) turnGroup.appendChild(el); });
  chipWrap.after(spacerL);
  spacerL.after(tabs);
  tabs.after(spacer);
  spacer.after(refs);
  /* Media / Floorplan moved off the bar to a rail on the page's right edge
     (kaiweb-shop.js); the bar keeps the mirror code but shows nothing there. */
  refs.hidden = true;
  /* Cart: on screen whatever tab is open. Shows what's in it; opens it (or,
     from the cart, goes back to the shelves). Asks the panel (spree.js). */
  const cart = document.createElement('button'); cart.type = 'button'; cart.className = 'kw-cart'; cart.id = 'kwCart'; cart.hidden = true;
  refs.after(cart);
  /* The turn and its hand-off are the bar's main action, so they take the
     right-hand end, after Cart and before the alerts and your avatar. */
  cart.after(turnGroup);
  const CART_IC = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 3.5h2.2l2 9.5h8.6l1.7-6.6H5.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="16.2" r="1.2" fill="currentColor"/><circle cx="14.3" cy="16.2" r="1.2" fill="currentColor"/></svg>';
  function drawCart(){
    // Cart moved to the page's right-edge rail (a panel beside the shelves);
    // the bar button stays built but hidden, so it can come back in one line.
    cart.hidden = true; return;
    let info = null; try{ const w = frame() && frame().contentWindow; info = w && w.kwCartInfo ? w.kwCartInfo() : null; }catch(e){}
    cart.hidden = !info; if(!info) return;
    const html = `${CART_IC}<span class="kw-cart-l">Cart</span>`;   // just "Cart": the total is in the cart and on the Shop page
    if(cart.innerHTML !== html) cart.innerHTML = html;
    cart.classList.toggle('is-on', !!info.on); cart.setAttribute('aria-pressed', String(!!info.on));
    cart.title = info.on ? 'Back to the shelves' : `Open the cart: ${info.n} items, ${info.total}`;
  }
  cart.addEventListener('click', e => {
    e.stopPropagation();
    try{ frame().contentWindow.kwOpenCart(); }catch(err){}
    setTimeout(() => { drawTabs(); drawCart(); }, 60);
  });
  setInterval(drawCart, 600);
  document.body.classList.add('kw-shell-tabs');
  /* The app-wide nav rail (Dashboard, Markets, Properties…) is gone from the
     project page: the page is the project, and the rail only took width from
     it. Its Kai mark moves to the start of the dark bar. */
  const gnav = document.querySelector('.global-nav'), logo = gnav && gnav.querySelector('.global-nav-logo');
  if(logo){ logo.classList.add('kw-logo'); bar.prepend(logo); }
  if(gnav) gnav.hidden = true;
  document.body.classList.add('kw-no-gnav');
  /* Address: the street, larger, with the city under it — the street is what
     tells two jobs apart, and the full one-liner was being cut off. */
  function drawAddress(){
    const el = bar.querySelector('.tb-address'); if(!el) return;
    const b = el.querySelector('b'); if(!b || el.querySelector('i.kw-city')) return;
    const full = b.textContent.trim(), k = full.indexOf(',');
    if(k < 0) return;
    b.textContent = full.slice(0, k).trim();
    const i = document.createElement('i'); i.className = 'kw-city'; i.textContent = full.slice(k + 1).trim();
    el.appendChild(i); el.title = full;
  }
  drawAddress(); setInterval(drawAddress, 800);

  /* ── Documents menu ──
     Documents is a long page (the live document, purchase orders, shared
     copies, outdated versions), so its tab opens a menu of shortcuts: one
     column per section, each listing its documents, and the Layout switch.
     A link opens Documents if it isn't open, then scrolls to that section or
     row and flashes it. The sections are read off the page itself whenever
     Documents is showing; before that, the menu offers the sections alone. */
  const docsMenu = document.createElement('div'); docsMenu.id = 'kwDocsMenu'; docsMenu.className = 'kw-docs-menu'; docsMenu.setAttribute('role', 'menu'); docsMenu.hidden = true;
  document.body.appendChild(docsMenu);
  const DOCS_FALLBACK = ['Current', 'Purchase orders', 'Shared copies', 'Outdated'].map(t => ({title:t, meta:'', rows:[]}));
  let docsSnap = null;
  const ROWS = '.rec-row:not(.rec-head), .po-row:not(.po-head), .cp-row:not(.cp-head)';
  const rowLabel = r => { const t = (r.innerText || '').replace(/\s+/g, ' ').trim(); return t.split(/\s(?:SOW|PO)-[0-9A-F]+/)[0].trim(); };
  function readDocs(){
    const d = fdoc(); if(!d) return null;
    // only off the Documents page itself (Overview's Register uses the same section markup)
    let mode = ''; try{ mode = frame().contentWindow.eval('typeof workMode !== "undefined" ? workMode : ""'); }catch(e){}
    if(mode !== 'artifact' || !tabs.querySelector('.kw-tab.is-on[data-page="artifact"]')) return null;
    const secs = [...d.querySelectorAll('#workBody .art-sec')].filter(sec => sec.querySelector('.art-sec-title') && sec.querySelector('.rec-row:not(.rec-head), .po-row:not(.po-head), .cp-row:not(.cp-head)'));
    if(!secs.length) return null;
    return secs.map(sec => {
      const tEl = sec.querySelector('.art-sec-title'), title = ((tEl.childNodes[0] || {}).textContent || tEl.textContent).trim();
      const rows = [...sec.querySelectorAll('.rec-row:not(.rec-head), .po-row:not(.po-head), .cp-row:not(.cp-head)')].map(rowLabel).filter(Boolean);
      return {title, meta:(sec.querySelector('.art-sec-hdr .art-sec-desc') || {}).textContent || '', rows};
    });
  }
  function docsView(){ try{ return frame().contentWindow.eval('typeof DOCS_VIEW !== "undefined" ? DOCS_VIEW : "list"'); }catch(e){ return 'list'; } }
  function drawDocsMenu(){
    docsSnap = readDocs() || docsSnap;
    const secs = docsSnap || DOCS_FALLBACK, MAX = 5, v = docsView();
    docsMenu.innerHTML = `<div class="kw-dm-cols">${secs.map((sec, si) => `<div class="kw-dm-col">
        <button type="button" class="kw-dm-h" role="menuitem" data-sec="${esc(sec.title)}">${esc(sec.title)}${sec.rows.length ? `<span>${sec.rows.length}</span>` : ''}</button>
        ${sec.rows.slice(0, MAX).map(r => `<button type="button" class="kw-dm-l" role="menuitem" data-sec="${esc(sec.title)}" data-row="${esc(r)}">${esc(r)}</button>`).join('')}
        ${sec.rows.length > MAX ? `<button type="button" class="kw-dm-l is-more" role="menuitem" data-sec="${esc(sec.title)}">All ${sec.rows.length} ${esc(sec.title.toLowerCase())}</button>` : ''}
      </div>`).join('')}</div>
      <div class="kw-dm-foot"><span class="kw-dm-k">Layout</span>
        <div class="kw-dm-seg" role="group" aria-label="Layout">
          <button type="button" data-view="list" aria-pressed="${v !== 'cards'}" class="${v !== 'cards' ? 'is-on' : ''}">List</button><button type="button" data-view="cards" aria-pressed="${v === 'cards'}" class="${v === 'cards' ? 'is-on' : ''}">Thumbnails</button>
        </div></div>`;
  }
  function placeDocsMenu(){
    const tab = tabs.querySelector('.kw-tab[data-page="artifact"]'); if(!tab) return;
    const r = tab.getBoundingClientRect(), w = docsMenu.offsetWidth;
    docsMenu.style.top = Math.round(r.bottom) + 'px';
    docsMenu.style.left = Math.round(Math.max(8, Math.min(r.left, window.innerWidth - w - 8))) + 'px';
  }
  function openDocs(){ drawDocsMenu(); docsMenu.hidden = false; placeDocsMenu(); const c = tabs.querySelector('[data-docs]'); if(c) c.setAttribute('aria-expanded', 'true'); tabs.querySelector('.kw-tab[data-page="artifact"]')?.classList.add('is-menu'); }
  function closeDocs(){ if(docsMenu.hidden) return; docsMenu.hidden = true; const c = tabs.querySelector('[data-docs]'); if(c) c.setAttribute('aria-expanded', 'false'); tabs.querySelector('.kw-tab.is-menu')?.classList.remove('is-menu'); }
  // Open Documents if needed, wait for the page, then scroll to the target and flash it.
  function goDocs(secTitle, rowText){
    closeDocs();
    const tabB = tabs.querySelector('.kw-tab[data-page="artifact"] .kw-tab-b');
    if(tabB && !tabB.closest('.kw-tab').classList.contains('is-on')){ const t = src[+tabB.dataset.i]; if(t) t.click(); }
    let tries = 0;
    (function seek(){
      const d = fdoc(); const secs = d ? [...d.querySelectorAll('#workBody .art-sec')] : [];
      const sec = secs.find(x => { const t = x.querySelector('.art-sec-title'); return t && ((t.childNodes[0] || {}).textContent || '').trim() === secTitle; });
      if(!sec){ if(++tries < 40) setTimeout(seek, 60); return; }
      const row = rowText ? [...sec.querySelectorAll('.rec-row:not(.rec-head), .po-row:not(.po-head), .cp-row:not(.cp-head)')].find(r => rowLabel(r) === rowText) : null;
      // The page can redraw just after a tab switch, so wait for it to settle,
      // then scroll the Documents column (#workBody) to the target, re-finding
      // it in case the redraw replaced it.
      const find = () => {
        const dd = fdoc(); const ss = dd ? [...dd.querySelectorAll('#workBody .art-sec')] : [];
        const sc = ss.find(x => { const t = x.querySelector('.art-sec-title'); return t && ((t.childNodes[0] || {}).textContent || '').trim() === secTitle; });
        if(!sc) return null;
        const rw = rowText ? [...sc.querySelectorAll(ROWS)].find(r => rowLabel(r) === rowText) : null;
        return rw || sc;
      };
      setTimeout(() => {
        const el = find(); if(!el) return;
        const body = fdoc().getElementById('workBody') || el.parentElement;
        const top = el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - (rowText ? Math.max(0, body.clientHeight / 2 - el.offsetHeight / 2) : 12);
        // Our own glide: the browser's smooth scroll doesn't survive here (the
        // Shop code works around the same thing). Lands exactly either way.
        const from = body.scrollTop, to = Math.max(0, Math.min(top, body.scrollHeight - body.clientHeight)), t0 = performance.now(), MS = 420;
        const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        const step = now => { const k = Math.min(1, (now - t0) / MS), e = 1 - Math.pow(1 - k, 3); body.scrollTop = from + (to - from) * e; if(k < 1) requestAnimationFrame(step); };
        if(reduce) body.scrollTop = to; else requestAnimationFrame(step);
        setTimeout(() => { body.scrollTop = to; }, MS + 80);
        el.classList.remove('kw-flash'); void el.offsetWidth; el.classList.add('kw-flash');
        setTimeout(() => el.classList.remove('kw-flash'), 1600);
      }, 250);
      drawTabs();
    })();
  }
  docsMenu.addEventListener('click', e => {
    e.stopPropagation();
    const vb = e.target.closest('[data-view]');
    if(vb){ try{ frame().contentWindow.docsSetView(vb.dataset.view); }catch(err){} drawDocsMenu(); return; }
    const b = e.target.closest('[data-sec]'); if(b) goDocs(b.dataset.sec, b.dataset.row || '');
  });
  // Hover opens it too, the way a site's top menu does; a short grace period
  // lets the pointer travel from the tab down into the menu.
  let docsT = null;
  const hoverIn = () => { clearTimeout(docsT); docsT = setTimeout(openDocs, 140); };
  const hoverOut = () => { clearTimeout(docsT); docsT = setTimeout(closeDocs, 260); };
  tabs.addEventListener('mouseover', e => { if(e.target.closest('.kw-tab[data-page="artifact"]')) hoverIn(); else if(e.target.closest('.kw-tab')) hoverOut(); });
  tabs.addEventListener('mouseleave', hoverOut);
  docsMenu.addEventListener('mouseenter', () => clearTimeout(docsT));
  docsMenu.addEventListener('mouseleave', hoverOut);
  document.addEventListener('click', e => { if(!e.target.closest('#kwDocsMenu, [data-docs]')) closeDocs(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !docsMenu.hidden){ closeDocs(); tabs.querySelector('[data-docs]')?.focus(); } });
  window.addEventListener('resize', () => { if(!docsMenu.hidden) placeDocsMenu(); });

  /* ── Tabs: mirror the panel's tab row ── */
  const CARET = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let src = [];   // the panel's buttons, by index, for click forwarding
  function shown(d, el){
    if(!el || el.hidden) return false;
    const v = d.defaultView; return v && v.getComputedStyle(el).display !== 'none';
  }
  function drawTabs(){
    const d = fdoc(); const hdr = d && d.getElementById('workHdr');
    if(!hdr){ tabs.innerHTML = ''; refs.innerHTML = ''; return; }
    src = [];
    const wraps = [...hdr.querySelectorAll('.wmode-tabs > .wmode-wrap')].filter(w => shown(d, w));
    const html = wraps.map(w => {
      const b = w.querySelector('.wmode'); if(!b) return '';
      const page = b.dataset.page || '';
      // Scope has no dropdown. Documents gets its own menu (jump links + layout).
      const tools = page === 'shop' ? null : w.querySelector('.wmode-tools');
      const on = w.classList.contains('active');
      const i = src.push(b) - 1, j = tools ? src.push(tools) - 1 : -1;
      const caret = page === 'artifact'
        ? `<button type="button" class="kw-tab-menu" data-docs="1" aria-haspopup="menu" aria-expanded="${!docsMenu.hidden}" aria-controls="kwDocsMenu" title="Jump to a part of Documents" aria-label="Documents menu">${CARET}</button>`
        : j >= 0 && on ? `<button type="button" class="kw-tab-menu" data-i="${j}" data-menu="1" aria-haspopup="menu" title="${esc(tools.title || 'Options')}" aria-label="${esc(tools.title || 'Options')}">${CARET}</button>` : '';
      return `<span class="kw-tab${on ? ' is-on' : ''}" data-page="${esc(page)}"><button type="button" class="kw-tab-b" data-i="${i}"${on ? ' aria-current="page"' : ''}>${esc(b.textContent.trim())}</button>${caret}</span>`;
    }).join('');
    if(tabs.innerHTML !== html) tabs.innerHTML = html;
    const rt = d.getElementById('pgRefTools');
    const rhtml = rt ? [...rt.querySelectorAll('.pg-ref-btn')].map(b => {
      const i = src.push(b) - 1, on = b.classList.contains('on'), label = (b.querySelector('span') || b).textContent.trim();
      const svg = b.querySelector('svg');
      return `<button type="button" class="kw-ref${on ? ' is-on' : ''}" data-i="${i}" aria-pressed="${on}" title="${esc(b.title || label)}">${svg ? svg.outerHTML : ''}<span>${esc(label)}</span></button>`;
    }).join('') : '';
    if(refs.innerHTML !== rhtml) refs.innerHTML = rhtml;
    d.body.classList.add('kw-tabs-shell');
    const snap = readDocs(); if(snap) docsSnap = snap;
  }
  // A forwarded menu opens inside the panel, from its collapsed tab row. The
  // panel pins it (position:fixed, CSS) at --kw-menu-x, which is set here to
  // sit under the caret that was clicked in this bar.
  function placeMenu(btn){
    const d = fdoc(), f = frame(); if(!d || !f) return;
    const tab = (btn.isConnected && btn.closest('.kw-tab')) || tabs.querySelector('.kw-tab.is-on'); if(!tab) return;
    const x = Math.max(8, Math.min(tab.getBoundingClientRect().left - f.getBoundingClientRect().left, f.clientWidth - 260));
    d.body.style.setProperty('--kw-menu-x', Math.round(x) + 'px');
  }
  bar.addEventListener('click', e => {
    const dm = e.target.closest('[data-docs]');
    if(dm){ e.stopPropagation(); clearTimeout(docsT); docsMenu.hidden ? openDocs() : closeDocs(); return; }
    const b = e.target.closest('.kw-tabs [data-i], .kw-refs [data-i]'); if(!b) return;
    closeDocs();
    const t = src[+b.dataset.i]; if(!t) return;
    e.stopPropagation();
    if(b.dataset.menu) placeMenu(b);
    t.click();
    drawTabs();
  });
  // A click anywhere out here closes a menu left open in the panel.
  document.addEventListener('click', e => {
    if(e.target.closest('[data-menu]')) return;
    const d = fdoc(); if(d && [...d.querySelectorAll('.view-menu')].some(x => shown(d, x))) d.body.click();
  });

  /* ── Stage chip ── */
  const chip = chipWrap.querySelector('#kwStage'), pop = chipWrap.querySelector('#kwStagePop');
  function stageList(){
    if(!stages) return [];
    return [...stages.querySelectorAll(':scope > .stage')].map((el, i) => ({
      el, n:i + 1, label:(el.querySelector('.stage-label') || el).textContent.trim(),
      done:el.classList.contains('done'), viewing:el.classList.contains('active'), can:el.classList.contains('accessible'),
    }));
  }
  function drawChip(){
    const list = stageList(), complete = stages && stages.querySelector('.stages-completed');
    if(complete || !list.length){
      chip.innerHTML = `<span class="kw-marks">${'<i class="is-done"></i>'.repeat(3)}</span><span class="kw-stage-t">${complete ? 'Project completed' : ''}</span>`;
      chip.disabled = !list.length && !complete; return;
    }
    const cur = Math.min(list.filter(s => s.done).length, list.length - 1);
    chip.innerHTML = `<span class="kw-marks">${list.map((s, i) => `<i class="${s.done ? 'is-done' : i === cur ? 'is-cur' : ''}"></i>`).join('')}</span>
      <span class="kw-stage-t">${esc(list[cur].label)}</span>${CARET}`;
    chip.title = `Stage ${cur + 1} of ${list.length}: ${list[cur].label}`;
    if(!pop.hidden) drawPop();
  }
  function nextHint(){
    const tip = document.getElementById('appApproveTip'), btn = document.getElementById('appApproveBtn');
    const cap = document.querySelector('#stageCaps .stage-cap.active');
    return (cap && cap.textContent.trim()) || (btn && !btn.hidden && btn.disabled !== false && tip && tip.textContent.trim()) || (tip && tip.textContent.trim()) || '';
  }
  function drawPop(){
    if(!stageList().length){
      pop.innerHTML = `<div class="kw-pop-hd"><b>Project stage</b><span>Completed</span></div><p class="kw-pop-hint">Closeout approved · the project is completed.</p>`;
      return;
    }
    const list = stageList(), cur = Math.min(list.filter(s => s.done).length, list.length - 1), hint = nextHint();
    pop.innerHTML = `<div class="kw-pop-hd"><b>Project stage</b><span>${cur + 1} of ${list.length}</span></div>
      <ol class="kw-pop-list">${list.map((s, i) => {
        const st = s.done ? 'Done' : i === cur ? 'Now' : 'Next';
        return `<li><button type="button" class="kw-pop-st${s.done ? ' is-done' : i === cur ? ' is-cur' : ''}${s.viewing ? ' is-view' : ''}" data-n="${i}"${s.can ? '' : ' disabled'}>
          <span class="kw-pop-n">${s.done ? '✓' : s.n}</span><span class="kw-pop-l">${esc(s.label)}</span>
          <span class="kw-pop-s">${s.viewing && i !== cur ? 'Viewing' : st}</span></button></li>`;
      }).join('')}</ol>
      ${hint ? `<p class="kw-pop-hint">${esc(hint)}</p>` : ''}`;
  }
  chip.addEventListener('click', e => {
    e.stopPropagation();
    pop.hidden = !pop.hidden; chip.setAttribute('aria-expanded', String(!pop.hidden));
    if(!pop.hidden) drawPop();
  });
  pop.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('[data-n]'); if(!b || b.disabled) return;
    const s = stageList()[+b.dataset.n]; if(s) s.el.click();
    pop.hidden = true; chip.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('click', () => { if(!pop.hidden){ pop.hidden = true; chip.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !pop.hidden){ pop.hidden = true; chip.setAttribute('aria-expanded', 'false'); chip.focus(); } });
  if(stages) new MutationObserver(drawChip).observe(stages, {childList:true, subtree:true, attributes:true, characterData:true});
  drawChip();

  /* ── Whose turn: the hand-off pill ──
     Turn-based: one person holds the job at a time and hands it on. The pill
     says who ("With M. Abbott", or "Your turn" when it's the viewer); its card
     answers Who / When / What's next and lists the hand-offs so far.
     KaiWeb follows the holder from the stage (syncHolder): the field user
     drafts, the reviewer reviews, the project manager runs the work. The dates
     are the demo job's own (last updated, scope due, job end). */
  const turn = turnWrap.querySelector('#kwTurn'), tpop = turnWrap.querySelector('#kwTurnPop');
  const PEOPLE = {
    tO:{name:'T. Oyelaran', role:'Field user',      as:['field_agent']},
    sP:{name:'S. Patel',    role:'Reviewer',        as:['admin']},
    mA:{name:'M. Abbott',   role:'Project manager', as:['manager']},
  };
  const D = {start:'Mar 2, 2026', review:'Mar 9, 2026', approved:'Mar 14, 2026', closeout:'Apr 28, 2026'};
  const LOCKS = {
    open:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9"/><path d="M8 11V7.5a4 4 0 0 1 7.5-1.9"/></svg>',
    shut:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9"/><path d="M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11"/></svg>',
  };
  function turnNow(){
    let proj = 'edit'; try{ proj = state.projectStage || 'edit'; }catch(e){}
    const {tO, sP, mA} = PEOPLE;
    const h1 = {date:D.start, text:`${tO.name} started the scope`};
    const h2 = {date:D.review, text:`${tO.name} handed off the scope to ${sP.name}`};
    const h3 = {date:D.approved, text:`${mA.name} approved the scope and took the job`};
    const h4 = {date:D.closeout, text:`${mA.name} submitted the job for closeout`};
    if(proj === 'closeout-approved') return null;
    if(proj === 'edit') return {who:tO, doc:'Draft', lock:'open', hist:[h1],
      whoT:`The scope is with ${tO.name}.`, whenT:`${tO.name} started this scope on ${D.start}.`,
      nextT:`Anyone with edit access can edit while it's a draft. ${tO.name} builds it on site, then hands it off for review. A Project Manager gives final approval.`};
    if(proj === 'published') return {who:mA, doc:'Approved', lock:'shut', hist:[h3, h2, h1],
      whoT:`The job is with ${mA.name}.`, whenT:`${mA.name} approved the scope and took the job on ${D.approved}.`,
      nextT:`${mA.name} tracks the work on site. Once every task is marked complete, ${mA.name} submits it for closeout. Changes to the approved budget go through a change order.`};
    if(proj === 'closeout') return {who:mA, doc:'Approved', lock:'shut', hist:[h4, h3, h2, h1],
      whoT:`Closeout is with ${mA.name}.`, whenT:`${mA.name} submitted the job for closeout on ${D.closeout}.`,
      nextT:`${mA.name} compares the before and after photos and approves closeout. Then the project is complete.`};
    return {who:sP, doc:'In review', lock:'shut', hist:[h2, h1],   // submitted · reviewing · review-done · awaiting-pub
      whoT:`The scope is with ${sP.name}.`, whenT:`${sP.name} received this scope from ${tO.name} on ${D.review}.`,
      nextT:`Only ${sP.name} can change the version under review. Then ${sP.name} hands it to ${mA.name}, the Project Manager, for final approval.`};
  }
  const isMine = t => { try{ return t.who.as.includes(state.role); }catch(e){ return false; } };
  function drawTurn(){
    const t = turnNow();
    turnWrap.hidden = !t; if(!t){ tpop.hidden = true; return; }
    const mine = isMine(t);
    turn.classList.toggle('is-mine', mine);
    const html = `<span class="kw-turn-l">${mine ? 'Your turn' : '<span class="kw-turn-w">With </span>' + esc(t.who.name)}</span><span class="kw-turn-car">${CARET}</span>`;
    if(turn.innerHTML !== html) turn.innerHTML = html;
    turn.title = `With ${t.who.name} (${t.who.role}): opens who, when and what's next`;
    if(!tpop.hidden) drawTurnPop();
  }
  function drawTurnPop(){
    const t = turnNow(); if(!t) return;
    const whoT = isMine(t) ? t.whoT.replace(`with ${t.who.name}.`, `with you (${t.who.name}).`) : t.whoT;
    tpop.innerHTML = `<div class="kw-turn-doc">${LOCKS[t.lock]}<span>${esc(t.doc)}</span></div>
      <p class="kw-turn-p"><b>Who:</b> ${esc(whoT)}</p>
      <p class="kw-turn-p"><b>When:</b> ${esc(t.whenT)}</p>
      <p class="kw-turn-p"><b>What's next:</b> ${esc(t.nextT)}</p>
      <ol class="kw-turn-hist">${t.hist.map(h => `<li><span class="kw-turn-ck">✓</span><span><span class="kw-turn-d">${esc(h.date)}</span>${esc(h.text)}</span></li>`).join('')}</ol>`;
  }
  const closeTurn = () => { if(!tpop.hidden){ tpop.hidden = true; turn.setAttribute('aria-expanded', 'false'); turn.classList.remove('is-open'); } };
  turn.addEventListener('click', e => {
    e.stopPropagation();
    if(!pop.hidden){ pop.hidden = true; chip.setAttribute('aria-expanded', 'false'); }
    const open = tpop.hidden; tpop.hidden = !open; turn.setAttribute('aria-expanded', String(open)); turn.classList.toggle('is-open', open);
    if(open) drawTurnPop();
  });
  tpop.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', closeTurn);
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !tpop.hidden){ closeTurn(); turn.focus(); } });
  chip.addEventListener('click', closeTurn);
  drawTurn();
  setInterval(drawTurn, 800);   // follows the demo's stage and role pickers

  /* ── Notifications (bell) and account (avatar): two menus ──
     The bell carries the unread count and opens your notifications; the
     avatar opens the account menu. (Tried as one combined menu on the avatar;
     notifications are too important in a turn-based product to sit behind
     your profile picture, so they're back on the bell.) Both share one panel
     element, drawn for whichever opened it. The person follows the demo's role
     picker; notifications are this job's own events; the account links are
     placeholders (a toast says so). */
  const notifBtn = bar.querySelector('.app-notif');
  let acctMode = 'notes';   // 'notes' (bell) | 'acct' (avatar)
  const avatar = bar.querySelector('.app-avatar');
  const acct = document.createElement('div'); acct.id = 'kwAcct'; acct.className = 'kw-acct'; acct.setAttribute('role', 'menu'); acct.hidden = true;
  document.body.appendChild(acct);
  const WHO = {field_agent:['T. Oyelaran', 'Field user'], admin:['S. Patel', 'Reviewer'], manager:['M. Abbott', 'Project manager'],
    contractor:['Apex Carpentry', 'Contractor'], renter:['Resident', 'Renter']};
  const me = () => { let r = 'manager'; try{ r = state.role || r; }catch(e){} return WHO[r] || WHO.manager; };
  const initials = n => n.replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const NOTES = [
    {id:'n1', t:'Change order approved', b:'Change Order 2 approved: 3484 South Main Street', when:'5d ago', unread:true},
    {id:'n2', t:'Purchase order ready', b:'Apex Carpentry · Change Order 2 is ready to send', when:'5d ago', unread:true},
    {id:'n3', t:'Handed off to you', b:'S. Patel handed off the scope to you', when:'9d ago', unread:true},
    {id:'n4', t:'Scope approved', b:'Scope approved: 3484 South Main Street', when:'10d ago', unread:false},
    {id:'n5', t:'Note added', b:'T. Oyelaran added a note on Kitchen · Cabinets', when:'12d ago', unread:false},
  ];
  let acctUnreadOnly = false, acctMore = false;
  const BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M22 19.65H2L5 16.15V7.15L12 2.65L19 7.15V16.15L22 19.65Z"/><path d="M10 19.65V21.65L12 22.65L14 21.65V19.65"/></svg>';
  const IC = {
    profile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    help:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 4h18v13H9l-5 4V4z"/><path d="M12 8v.01M12 11v3"/></svg>',
    feedback:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 5h16v11H8l-4 4V5z"/></svg>',
    flags:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 21V4M5 4h12l-3 4 3 4H5"/></svg>',
    admin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5" y="11" width="14" height="9"/><path d="M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11"/></svg>',
    logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/></svg>',
    more:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  };
  const LINKS = [['profile', 'My profile'], ['help', 'Help & support'], ['feedback', 'Feedback'], ['flags', 'Feature flags'], ['admin', 'Super admin'], ['logout', 'Log out']];
  const unread = () => NOTES.filter(n => n.unread).length;
  function drawAvatar(){
    const [name] = me(), n = unread(), open = !acct.hidden;
    if(avatar){
      const html = esc(initials(name));
      if(avatar.innerHTML !== html) avatar.innerHTML = html;
      avatar.setAttribute('role', 'button'); avatar.setAttribute('tabindex', '0'); avatar.removeAttribute('aria-hidden');
      avatar.setAttribute('aria-haspopup', 'menu'); avatar.setAttribute('aria-expanded', String(open && acctMode === 'acct'));
      avatar.setAttribute('aria-label', `${name}: account`); avatar.title = name;
    }
    if(notifBtn){
      notifBtn.hidden = false;
      let b = notifBtn.querySelector('.kw-badge');
      if(n && !b){ b = document.createElement('span'); b.className = 'kw-badge'; notifBtn.appendChild(b); }
      if(b){ if(n) b.textContent = n; else b.remove(); }
      notifBtn.setAttribute('aria-haspopup', 'dialog'); notifBtn.setAttribute('aria-expanded', String(open && acctMode === 'notes'));
      notifBtn.setAttribute('aria-label', `Notifications${n ? `, ${n} unread` : ''}`); notifBtn.title = n ? `${n} unread notification${n === 1 ? '' : 's'}` : 'Notifications';
    }
  }
  /* Notifications first — they're what you open this for, and in a
     turn-based product "handed off to you" is the message that matters. The
     account is one compact row at the bottom: who you are, then Profile, Help
     and Log out as icons; the rarer links (Feedback, Feature flags, Super
     admin) sit behind More. */
  function drawAcct(){
    const [name, role] = me(), n = unread();
    if(acctMode === 'acct'){
      acct.innerHTML = `<div class="kw-acct-hd"><b>${esc(name)}</b><span>${esc(role)} · Kai demo</span></div>
        <div class="kw-acct-links">${LINKS.map(([k, l]) => `<button type="button" role="menuitem" data-link="${k}">${IC[k]}<span>${esc(l)}</span></button>`).join('')}</div>`;
      return;
    }
    const list = NOTES.filter(x => !acctUnreadOnly || x.unread);
    const ib = (k, l) => `<button type="button" class="kw-acct-ib" role="menuitem" data-link="${k}" title="${esc(l)}" aria-label="${esc(l)}">${IC[k]}</button>`;
    acct.innerHTML = `<div class="kw-acct-nh"><b>Notifications</b>${n ? `<span class="kw-acct-n" title="${n} unread">${n}</span>` : ''}<span class="kw-acct-sp"></span>
        <label class="kw-acct-tg"><input type="checkbox" data-act="unreadonly"${acctUnreadOnly ? ' checked' : ''}> Unread only</label>
        ${n ? `<button type="button" class="kw-acct-lnk" data-act="readall">Mark all read</button>` : ''}</div>
      <div class="kw-acct-list">${list.length ? list.map(x => `<button type="button" class="kw-note${x.unread ? ' is-unread' : ''}" role="menuitem" data-note="${x.id}">
          <span class="kw-note-ic">${BELL}</span><span class="kw-note-b"><b>${esc(x.t)}</b><span>${esc(x.b)}</span></span><span class="kw-note-w">${esc(x.when)}</span></button>`).join('')
        : `<p class="kw-acct-empty">You're all caught up.</p>`}</div>
      <button type="button" class="kw-acct-more" data-act="all">View all notifications</button>`;
  }
  function placeAcct(){
    const a = acctMode === 'acct' ? avatar : notifBtn; if(!a) return;
    const r = a.getBoundingClientRect(); acct.style.top = Math.round(r.bottom + 8) + 'px';
    acct.style.right = Math.round(Math.max(8, window.innerWidth - r.right - (acctMode === 'notes' ? 0 : 0))) + 'px';
    acct.classList.toggle('is-acct', acctMode === 'acct');
  }
  const openAcct = mode => { acctMode = mode || 'notes'; drawAcct(); acct.hidden = false; placeAcct(); drawAvatar(); };
  const toggleMenu = mode => { if(!acct.hidden && acctMode === mode) closeAcct(); else openAcct(mode); };
  const closeAcct = () => { if(acct.hidden) return; acct.hidden = true; acctMore = false; drawAvatar(); };
  const say = m => { try{ toast(m); }catch(e){} };
  if(avatar){
    avatar.addEventListener('click', e => { e.stopPropagation(); toggleMenu('acct'); });
    avatar.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleMenu('acct'); } });
  }
  if(notifBtn){
    notifBtn.addEventListener('click', e => { e.stopPropagation(); toggleMenu('notes'); });
  }
  acct.addEventListener('click', e => {
    e.stopPropagation();
    const act = e.target.closest('[data-act]');
    if(act && act.dataset.act === 'unreadonly'){ acctUnreadOnly = act.checked; drawAcct(); return; }
    if(act && act.dataset.act === 'more'){ acctMore = !acctMore; drawAcct(); return; }
    if(act && act.dataset.act === 'readall'){ NOTES.forEach(x => x.unread = false); drawAcct(); drawAvatar(); return; }
    if(act && act.dataset.act === 'all'){ closeAcct(); say('All notifications (not in this prototype)'); return; }
    const note = e.target.closest('[data-note]');
    if(note){ const x = NOTES.find(y => y.id === note.dataset.note); if(x) x.unread = false; drawAcct(); drawAvatar(); return; }
    const link = e.target.closest('[data-link]');
    if(link){ closeAcct(); say(`${link.textContent.trim()} (not in this prototype)`); }
  });
  document.addEventListener('click', closeAcct);
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !acct.hidden){ const back = acctMode === 'acct' ? avatar : notifBtn; closeAcct(); back && back.focus(); } });
  window.addEventListener('resize', () => { if(!acct.hidden) placeAcct(); });
  drawAvatar(); setInterval(drawAvatar, 800);

  /* ── Keep the mirror in step with the panel ──
     The panel reloads on every demo step (a fresh srcdoc), so the observer is
     re-armed on each load; a slow interval is the safety net. */
  let mo = null, armedOn = null;
  function arm(){
    const d = fdoc(); const hdr = d && d.getElementById('workHdr');
    if(!hdr || hdr === armedOn) return;
    if(mo) mo.disconnect();
    mo = new MutationObserver(() => requestAnimationFrame(drawTabs));
    mo.observe(hdr, {childList:true, subtree:true, attributes:true, attributeFilter:['class', 'hidden', 'style', 'aria-pressed']});
    armedOn = hdr; drawTabs();
    // A click inside the panel closes the stage popover too.
    d.addEventListener('click', () => { if(!pop.hidden){ pop.hidden = true; chip.setAttribute('aria-expanded', 'false'); } closeTurn(); closeDocs(); closeAcct(); });
  }
  const f0 = frame(); if(f0) f0.addEventListener('load', () => setTimeout(arm, 0));
  setInterval(() => { arm(); drawTabs(); }, 800);
  arm();
})();
