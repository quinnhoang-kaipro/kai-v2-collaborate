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
  /* Media / Floorplan / Cart: panels that open beside whatever page is showing.
     Icon over a word, so they read as tools, not as more page tabs. */
  const REF_IC = {
    media: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4" width="15" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="8.2" r="1.4" fill="currentColor"/><path d="M3.5 14.5l4.2-4 3 2.8 2.3-2 3.5 3.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    floorplan: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 3.5h14v13H3z M9.5 3.5v5 M9.5 11.5v5 M9.5 10H13 M3 10h3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    beside: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4" width="15" height="12" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 4v12" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="4" width="7.5" height="12" fill="currentColor" opacity=".35"/></svg>',
    property: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 9.2 10 3.5l7 5.7V16.5H3z M8 16.5v-4.5h4v4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    cart: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 3.5h2.2l2 9.5h8.6l1.7-6.6H5.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="16.2" r="1.2" fill="currentColor"/><circle cx="14.3" cy="16.2" r="1.2" fill="currentColor"/></svg>'
  };
  let propOpen = false;
  const f0w = () => { try{ return frame().contentWindow; }catch(e){ return null; } };
  document.addEventListener('click', e => { if(propOpen && !e.target.closest('.kw-ref-prop-wrap')){ propOpen = false; drawTabs(); } });
  document.addEventListener('click', e => { if(e.target.closest('.kw-ref[data-ref="cart"]')) return; try{ const w = frame().contentWindow; if(w.kwCartPopOpen && w.kwCartPopOpen()){ w.kwCartPop(false); drawTabs(); } }catch(err){} });
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
  let docsSnap = null; const menuSnap = {};
  const ROWS = '.rec-row:not(.rec-head), .po-row:not(.po-head), .cp-row:not(.cp-head)';
  const rowLabel = r => { const t = (r.innerText || '').replace(/\s+/g, ' ').trim(); return t.split(/\s(?:SOW|PO)-[0-9A-F]+/)[0].trim(); };
  /* Jump menus: Documents and Overview are both long pages, so each tab opens
     a menu of its sections and what's in them. menuPg is the page whose menu
     is open. pageSecs reads the live page: [{title, el, rows:[{label, el}]}]. */
  let menuPg = 'artifact';
  const MENU_FALLBACK = {
    artifact: DOCS_FALLBACK,
    overview: ['Register', 'Job details', 'Contractors', 'Activity'].map(t => ({title:t, meta:'', rows:[]})),
    shop: []
  };
  const secTitle = h => { const t = h.querySelector('.art-sec-title'); return t ? ((t.childNodes[0] || {}).textContent || t.textContent).trim() : ''; };
  function pageSecs(pg){
    const d = fdoc(); if(!d) return null;
    if(pg === 'artifact'){
      return [...d.querySelectorAll('#workBody .art-sec')].filter(sec => sec.querySelector('.art-sec-title') && sec.querySelector(ROWS))
        .map(sec => ({title:secTitle(sec), el:sec, meta:(sec.querySelector('.art-sec-hdr .art-sec-desc') || {}).textContent || '',
          rows:[...sec.querySelectorAll(ROWS)].map(r => ({label:rowLabel(r), el:r})).filter(r => r.label)}));
    }
    // Overview: the Register is its own section; the rest are flat runs under
    // the page, each a header followed by its blocks until the next header.
    const ov = d.querySelector('#workBody .ov'); if(!ov) return null;
    const out = [];
    const card = ov.querySelector('.ov-id, [class*="ov-id"]');
    if(card) out.push({title:'Property', el:card, meta:'', rows:[]});
    [...ov.querySelectorAll('.art-sec-hdr')].forEach(h => {
      const title = secTitle(h); if(!title) return;
      const sec = h.closest('.art-sec');
      const rows = [];
      if(sec) sec.querySelectorAll(ROWS).forEach(r => { const l = rowLabel(r).split(/\s+(?:\d+ purchase orders?|[A-Z][a-z]{2} \d{1,2}, \d{4})/)[0].trim(); if(l) rows.push({label:l, el:r}); });
      else for(let n = h.nextElementSibling; n && !n.matches('.art-sec-hdr, .art-sec'); n = n.nextElementSibling){
        [n, ...n.querySelectorAll('.ov-sec')].filter(x => x.matches('.ov-sec')).forEach(x => {
          const lbl = x.querySelector('.ov-sec-lbl');
          const l = lbl ? lbl.textContent.trim() : x.firstElementChild && x.firstElementChild.matches('.ov-grid') ? 'Property facts' : ((x.textContent || '').trim().split(/\s*\n\s*/)[0] || '').trim();
          if(l) rows.push({label:l, el:x});
        });
      }
      out.push({title, el:sec || h, meta:'', rows});
    });
    return out;
  }
  /* Scope's menu: the job's groups as the left panel lists them under All
     (by room), whatever the panel is set to now, with the whole scope first. */
  function scopeGroups(){
    let rooms = [];
    try{ rooms = frame().contentWindow.eval("(() => { const by = []; TASKS.forEach(t => { if(!t.room) return; let g = by.find(x => x.room === t.room); if(!g) by.push(g = {room:t.room, tasks:[]}); g.tasks.push({id:t.id, name:t.name, cost:t.cost || ''}); }); return by; })()"); }catch(e){}
    return [{title:'All scope', meta:'', rows:[], all:true}].concat(rooms.map(r => ({title:r.room, meta:'', rows:[], tasks:r.tasks})));
  }
  function goScope(title){
    closeDocs();
    const w = frame() && frame().contentWindow; if(!w) return;
    try{
      if(typeof w.setRailKind === 'function') w.setRailKind('all');
      if(title === 'All scope'){ if(w.eval('workMode') !== 'shop') w.setWorkMode('shop'); w.selectScope(); if(typeof w.renderAll === 'function') w.renderAll(); }
      else w.goUpRoom(title);
    }catch(e){}
    setTimeout(drawTabs, 60);
  }
  function goScopeTask(id){
    closeDocs();
    const w = frame() && frame().contentWindow; if(!w) return;
    try{
      if(typeof w.setRailKind === 'function') w.setRailKind('all');
      if(w.eval('groupBy') !== 'room') w.setGroupBy('room');
      if(w.eval('workMode') !== 'shop') w.setWorkMode('shop');
      w.selectTask(+id);
    }catch(e){}
    setTimeout(drawTabs, 60);
  }
  function readDocs(pg){
    pg = pg || menuPg;
    // only off the page itself (Overview's Register uses the same section markup as Documents)
    let mode = ''; try{ mode = frame().contentWindow.eval('typeof workMode !== "undefined" ? workMode : ""'); }catch(e){}
    if(mode !== pg || !tabs.querySelector(`.kw-tab.is-on[data-page="${pg}"]`)) return null;
    const secs = pageSecs(pg);
    if(!secs || !secs.length) return null;
    return secs.map(x => ({title:x.title, meta:x.meta, rows:x.rows.map(r => r.label)}));
  }
  function docsView(){ try{ return frame().contentWindow.eval('typeof DOCS_VIEW !== "undefined" ? DOCS_VIEW : "list"'); }catch(e){ return 'list'; } }
  function drawDocsMenu(){
    const snap = menuPg === 'shop' ? null : readDocs(); if(snap) menuSnap[menuPg] = snap;
    const secs = menuPg === 'shop' ? scopeGroups() : (menuSnap[menuPg] || MENU_FALLBACK[menuPg]), MAX = 5, v = docsView();
    docsMenu.classList.toggle('is-ov', menuPg === 'overview' || menuPg === 'shop');
    docsMenu.classList.toggle('is-scope', menuPg === 'shop');
    subCol = null;
    docsMenu.innerHTML = `<div class="kw-dm-cols">${secs.map((sec, si) => `<div class="kw-dm-col">
        <button type="button" class="kw-dm-h${sec.tasks ? ' has-sub' : ''}" role="menuitem" data-sec="${esc(sec.title)}"${sec.tasks ? ' aria-haspopup="menu"' : ''}>${esc(sec.title)}${sec.rows.length && menuPg === 'artifact' ? `<span>${sec.rows.length}</span>` : ''}${sec.tasks ? `<span class="kw-dm-n">${sec.tasks.length}</span><svg class="kw-dm-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 3l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}</button>
        ${sec.tasks ? `<div class="kw-dm-sub" role="menu" aria-label="${esc(sec.title)} tasks"><div class="kw-dm-sub-h">${esc(sec.title)}</div>${sec.tasks.map(t => `<button type="button" class="kw-dm-t" role="menuitem" data-task="${t.id}"><span>${esc(t.name)}</span><span class="kw-dm-tc">${esc(t.cost)}</span></button>`).join('')}</div>` : ''}
        ${menuPg !== 'artifact' ? '' : sec.rows.slice(0, MAX).map(r => `<button type="button" class="kw-dm-l" role="menuitem" data-sec="${esc(sec.title)}" data-row="${esc(r)}">${esc(r)}</button>`).join('')}
        ${menuPg === 'artifact' && sec.rows.length > MAX ? `<button type="button" class="kw-dm-l is-more" role="menuitem" data-sec="${esc(sec.title)}">All ${sec.rows.length} ${esc(sec.title.toLowerCase())}</button>` : ''}
      </div>`).join('')}</div>
      ${menuPg !== 'artifact' ? '' : `<div class="kw-dm-foot"><span class="kw-dm-k">Layout</span>
        <div class="kw-dm-seg" role="group" aria-label="Layout">
          <button type="button" data-view="list" aria-pressed="${v !== 'cards'}" class="${v !== 'cards' ? 'is-on' : ''}">List</button><button type="button" data-view="cards" aria-pressed="${v === 'cards'}" class="${v === 'cards' ? 'is-on' : ''}">Thumbnails</button>
        </div></div>`}`;
  }
  function placeDocsMenu(){
    const tab = tabs.querySelector(`.kw-tab[data-page="${menuPg}"]`); if(!tab) return;
    const r = tab.getBoundingClientRect(), w = docsMenu.offsetWidth;
    docsMenu.style.top = Math.round(r.bottom) + 'px';
    docsMenu.style.left = Math.round(Math.max(8, Math.min(r.left, window.innerWidth - w - 8))) + 'px';
  }
  function openDocs(pg){
    if(pg && pg !== menuPg){ closeDocs(); menuPg = pg; }
    drawDocsMenu(); docsMenu.hidden = false; placeDocsMenu();
    tabs.querySelectorAll('[data-docs]').forEach(c => c.setAttribute('aria-expanded', String(c.dataset.docs === menuPg)));
    tabs.querySelectorAll('.kw-tab.is-menu').forEach(t => t.classList.remove('is-menu'));
    tabs.querySelector(`.kw-tab[data-page="${menuPg}"]`)?.classList.add('is-menu');
  }
  function closeDocs(){ if(docsMenu.hidden) return; docsMenu.hidden = true; tabs.querySelectorAll('[data-docs]').forEach(c => c.setAttribute('aria-expanded', 'false')); tabs.querySelector('.kw-tab.is-menu')?.classList.remove('is-menu'); }
  // Open Documents if needed, wait for the page, then scroll to the target and flash it.
  function goDocs(secTitle, rowText){
    const pg = menuPg;
    closeDocs();
    const tabB = tabs.querySelector(`.kw-tab[data-page="${pg}"] .kw-tab-b`);
    if(tabB && !tabB.closest('.kw-tab').classList.contains('is-on')){ const t = src[+tabB.dataset.i]; if(t) t.click(); }
    let tries = 0;
    // The page can redraw just after a tab switch, so the target is re-found
    // from the live page each time.
    const find = () => {
      const secs = pageSecs(pg) || [];
      const sc = secs.find(x => x.title === secTitle); if(!sc) return null;
      const rw = rowText ? sc.rows.find(r => r.label === rowText) : null;
      return rw ? rw.el : sc.el;
    };
    (function seek(){
      if(!find()){ if(++tries < 40) setTimeout(seek, 60); return; }
      setTimeout(() => {
        const el = find(); if(!el) return;
        let body = el.parentElement; while(body && body.scrollHeight <= body.clientHeight + 2) body = body.parentElement; body = body || fdoc().getElementById('workBody');
        const top = el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - (rowText ? Math.max(0, body.clientHeight / 2 - el.offsetHeight / 2) : 12);
        glideTo(body, top);
        el.classList.remove('kw-flash'); void el.offsetWidth; el.classList.add('kw-flash');
        setTimeout(() => el.classList.remove('kw-flash'), 1600);
      }, 250);
      drawTabs();
    })();
  }
  // Our own glide: the browser's smooth scroll doesn't survive here (the Shop
  // code works around the same thing). Lands exactly either way.
  function glideTo(body, top){
    const from = body.scrollTop, to = Math.max(0, Math.min(top, body.scrollHeight - body.clientHeight)), t0 = performance.now(), MS = 420;
    if(Math.abs(to - from) < 2){ body.scrollTop = to; return; }
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = now => { const k = Math.min(1, (now - t0) / MS), e = 1 - Math.pow(1 - k, 3); body.scrollTop = from + (to - from) * e; if(k < 1) requestAnimationFrame(step); };
    if(reduce) body.scrollTop = to; else requestAnimationFrame(step);
    setTimeout(() => { body.scrollTop = to; }, MS + 80);
  }
  /* Clicking a tab's name (not its menu) lands at the top of that page, the
     way a site's top menu item opens that section's front page. Scope's front
     page is the whole scope, the first item in its menu. Already on the page:
     glide up. Coming from another page: start at the top (the pages share one
     scroller, so it would otherwise keep the last page's position). */
  function toPageTop(pg, already){
    // Scope: the whole scope, leaving the panel's All / Labor / Material choice as it is.
    if(pg === 'shop'){ try{ const w = frame().contentWindow; if(w.eval('workMode') !== 'shop') w.setWorkMode('shop'); w.selectScope(); if(typeof w.renderAll === 'function') w.renderAll(); }catch(e){} setTimeout(drawTabs, 60); }
    const body = () => { const d = fdoc(); return d && d.getElementById(pg === 'shopkai' ? 'pgMain' : 'workBody'); };
    if(already){ const b = body(); if(b) glideTo(b, 0); return; }
    // The page can redraw (and restore a position) just after the switch.
    [0, 80, 260].forEach(ms => setTimeout(() => { const b = body(); if(b) b.scrollTop = 0; }, ms));
  }
  docsMenu.addEventListener('click', e => {
    e.stopPropagation();
    const vb = e.target.closest('[data-view]');
    if(vb){ try{ frame().contentWindow.docsSetView(vb.dataset.view); }catch(err){} drawDocsMenu(); return; }
    const tk = e.target.closest('[data-task]'); if(tk){ goScopeTask(tk.dataset.task); return; }
    const b = e.target.closest('[data-sec]'); if(!b) return;
    if(menuPg === 'shop') goScope(b.dataset.sec); else goDocs(b.dataset.sec, b.dataset.row || '');
  });
  /* Scope's task flyouts: the open group stays open while the pointer is on
     its way to the tasks (crossing other group rows on the diagonal), and
     another group takes over only once the pointer rests on it. */
  let subCol = null, subT = null;
  const setSub = col => { if(subCol === col) return; if(subCol) subCol.classList.remove('is-sub'); subCol = col; if(col) col.classList.add('is-sub'); };
  docsMenu.addEventListener('mouseover', e => {
    if(menuPg !== 'shop') return;
    if(e.target.closest('.kw-dm-sub')){ clearTimeout(subT); return; }
    const col = e.target.closest('.kw-dm-col'); if(!col) return;
    clearTimeout(subT);
    if(!subCol) setSub(col.querySelector('.kw-dm-sub') ? col : null);
    else subT = setTimeout(() => setSub(col.querySelector('.kw-dm-sub') ? col : null), 220);
  });
  docsMenu.addEventListener('mouseleave', () => { clearTimeout(subT); subT = setTimeout(() => setSub(null), 300); });
  docsMenu.addEventListener('focusin', e => { const col = e.target.closest('.kw-dm-col'); if(menuPg === 'shop' && col && !e.target.closest('.kw-dm-sub')) setSub(col.querySelector('.kw-dm-sub') ? col : null); });
  // Hover opens it too, the way a site's top menu does; a short grace period
  // lets the pointer travel from the tab down into the menu.
  let docsT = null;
  const hoverIn = pg => { clearTimeout(docsT); if(!docsMenu.hidden && pg !== menuPg){ openDocs(pg); return; } docsT = setTimeout(() => openDocs(pg), 140); };
  const hoverOut = () => { clearTimeout(docsT); docsT = setTimeout(closeDocs, 260); };
  // After a click on a tab's name, its menu stays shut until the pointer leaves that tab.
  let hoverHold = null;
  tabs.addEventListener('mouseover', e => {
    const t = e.target.closest('.kw-tab');
    if(!t) return;   // the gap between tabs, or the row just redrawn under the pointer
    if(t.dataset.page === hoverHold) return;
    hoverHold = null;
    if(MENU_FALLBACK[t.dataset.page]) hoverIn(t.dataset.page); else hoverOut();
  });
  tabs.addEventListener('mouseleave', () => { hoverHold = null; hoverOut(); });
  docsMenu.addEventListener('mouseenter', () => clearTimeout(docsT));
  docsMenu.addEventListener('mouseleave', hoverOut);
  document.addEventListener('click', e => { if(!e.target.closest('#kwDocsMenu, [data-docs]')) closeDocs(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !docsMenu.hidden){ closeDocs(); tabs.querySelector('[data-docs]')?.focus(); } });
  window.addEventListener('resize', () => { if(!docsMenu.hidden) placeDocsMenu(); });

  /* ── Tabs: mirror the panel's tab row ── */
  const CARET = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const BESIDE = {media:'Media', floorplan:'Floorplan'};   // tabs that can also open beside the page
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
      const caret = MENU_FALLBACK[page]
        ? `<button type="button" class="kw-tab-menu" data-docs="${page}" aria-haspopup="menu" aria-expanded="${!docsMenu.hidden && menuPg === page}" aria-controls="kwDocsMenu" title="Jump to a part of ${esc(b.textContent.trim())}" aria-label="${esc(b.textContent.trim())} menu">${CARET}</button>`
        : j >= 0 && on ? `<button type="button" class="kw-tab-menu" data-i="${j}" data-menu="1" aria-haspopup="menu" title="${esc(tools.title || 'Options')}" aria-label="${esc(tools.title || 'Options')}">${CARET}</button>` : '';
      const hint = BESIDE[page] && !on ? ` title="⌘-click to open ${esc(BESIDE[page])} beside this page"` : '';
      return `<span class="kw-tab${on ? ' is-on' : ''}" data-page="${esc(page)}"><button type="button" class="kw-tab-b" data-i="${i}"${on ? ' aria-current="page"' : ''}${hint}>${esc(b.textContent.trim())}</button>${caret}</span>`;
    }).join('');
    if(tabs.innerHTML !== html) tabs.innerHTML = html;
    const rt = d.getElementById('pgRefTools');
    let hasShop = false; try{ hasShop = !!(f0w() && f0w().kwCartInfo && f0w().kwCartInfo()); }catch(e){}
    // Lit only while its panel is really on screen (a remembered choice can be set with no panel drawn).
    const sp = d.getElementById('pgSide'), sideShown = !!(sp && sp.getBoundingClientRect().width > 40 && sp.querySelector('.pg-side-hd'));
    let cartOpen = false; try{ cartOpen = !!frame().contentWindow.kwCartPopOpen(); }catch(e){}
    const rb = rt ? [...rt.querySelectorAll('.pg-ref-btn')].filter(b => b.dataset.ref !== 'cart' || hasShop).map(b => {
      const id = b.dataset.ref, i = src.push(b) - 1, on = id === 'cart' ? cartOpen : b.classList.contains('on') && sideShown, label = (b.querySelector('span') || b).textContent.trim();
      return {id, i, on, label, title: b.title || label};
    }) : [];
    const one = r => `<button type="button" class="kw-ref${r.on ? ' is-on' : ''}" data-ref="${r.id}" data-i="${r.i}" aria-pressed="${r.on}" title="${esc(r.title)}">${REF_IC[r.id] || ''}<span>${esc(r.label)}</span></button>`;
    /* Media and Floorplan are page tabs now, so the bar keeps one button for
       opening either of them beside the page instead: Side by side, with a
       menu. The page showing full width isn't offered beside itself. While a
       panel is open the button is lit and names it. */
    const curW = wraps.find(w => w.classList.contains('active')), curB = curW && curW.querySelector('.wmode');
    const curPage = curB ? curB.dataset.page || '' : '', curName = curB ? curB.textContent.trim() : '';
    const cartR = rb.find(r => r.id === 'cart'), openR = rb.find(r => r.id !== 'cart' && r.on);
    const prop = rb.filter(r => r.id !== 'cart' && r.id !== curPage);
    if(!prop.length && !openR) propOpen = false;
    const ck = '<svg class="kw-pm-ck" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2l2.4 2.4 4.6-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const menu = propOpen ? `<div class="kw-prop-menu kw-beside-menu" role="menu">
        <div class="kw-pm-hd">Open beside ${esc(curName || 'this page')}</div>
        ${prop.map(r => `<button type="button" role="menuitemcheckbox" aria-checked="${r.on}" class="${r.on ? 'is-on' : ''}" data-i="${r.i}">${REF_IC[r.id] || ''}<span>${esc(r.label)}</span>${r.on ? ck : ''}</button>`).join('')}
        ${openR ? `<span class="kw-pm-sep" role="separator"></span><button type="button" role="menuitem" class="kw-pm-close" data-close-side="1">Close ${esc(openR.label)}</button>` : ''}
      </div>` : '';
    const beside = (prop.length || openR) ? `<span class="kw-ref-prop-wrap"><button type="button" class="kw-ref kw-ref-prop${openR ? ' is-on' : ''}" data-prop="1" aria-haspopup="menu" aria-expanded="${propOpen}" title="${openR ? `${esc(openR.label)} is open beside the page` : 'Open Media or Floorplan beside the page'}">${REF_IC.beside}<span><em>${esc(openR ? openR.label : 'Side by side')}</em>${CARET}</span></button>${menu}</span>` : '';
    const rhtml = rb.length ? `${beside}${cartR ? '<span class="kw-refs-sep" aria-hidden="true"></span>' + one(cartR) : ''}` : '';
    if(refs.innerHTML !== rhtml) refs.innerHTML = rhtml;
    d.body.classList.add('kw-tabs-shell');
    ['artifact', 'overview'].forEach(pg => { const snap = readDocs(pg); if(snap) menuSnap[pg] = snap; });
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
    if(dm){ e.stopPropagation(); clearTimeout(docsT); (docsMenu.hidden || menuPg !== dm.dataset.docs) ? openDocs(dm.dataset.docs) : closeDocs(); return; }
    const cs = e.target.closest('[data-close-side]');
    if(cs){ e.stopPropagation(); propOpen = false; try{ frame().contentWindow.pgCloseSide(); }catch(err){} drawTabs(); return; }
    const pp = e.target.closest('[data-prop]');
    if(pp){ e.stopPropagation(); propOpen = !propOpen; drawTabs(); return; }
    // ⌘ / Ctrl-click on the Media or Floorplan tab: beside the page, not instead of it.
    const bt = (e.metaKey || e.ctrlKey) && e.target.closest('.kw-tab:not(.is-on) .kw-tab-b');
    if(bt && BESIDE[bt.closest('.kw-tab').dataset.page]){
      e.stopPropagation(); e.preventDefault(); propOpen = false; closeDocs();
      try{ frame().contentWindow.pgSide(bt.closest('.kw-tab').dataset.page); }catch(err){}
      drawTabs(); return;
    }
    const cb = e.target.closest('.kw-ref[data-ref="cart"]');
    if(cb){
      // Cart opens as a dropdown over the page, lined up under this button.
      e.stopPropagation(); closeDocs(); propOpen = false;
      try{ const f = frame(); f.contentWindow.kwCartPop('toggle', f.getBoundingClientRect().right - cb.getBoundingClientRect().right); }catch(err){}
      drawTabs(); return;
    }
    const b = e.target.closest('.kw-tabs [data-i], .kw-refs [data-i]'); if(!b) return;
    propOpen = false;
    clearTimeout(docsT);
    closeDocs();
    const t = src[+b.dataset.i]; if(!t) return;
    e.stopPropagation();
    if(b.dataset.menu) placeMenu(b);
    const tab = b.classList.contains('kw-tab-b') && b.closest('.kw-tab'), already = !!(tab && tab.classList.contains('is-on'));
    if(tab) hoverHold = tab.dataset.page;
    t.click();
    drawTabs();
    if(tab) toPageTop(tab.dataset.page, already);
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

/* ── Tabs line up with the page ──
   The first tab's word starts where the page's content starts (the work
   column's edge plus its 28px inset: Register, Job details…), following the
   left panel as it's resized or collapsed. The gap before the tabs absorbs
   the difference; when the address is too wide for that, it keeps its minimum. */
(function(){
  const INSET = 28, MIN = 18;
  let last = '';
  function align(){
    const tabs = document.getElementById('kwTabs'), gap = document.querySelector('.app-toolbar .kw-sp-l');
    const f = document.getElementById('iframe');
    if(!tabs || !gap || !f) return;
    let work = null; try{ work = f.contentDocument.querySelector('#main .work') || f.contentDocument.querySelector('.work'); }catch(e){}
    const first = tabs.querySelector('.kw-tab-b');
    if(!work || !first || !work.getBoundingClientRect().width){ if(last){ gap.style.flexBasis = ''; last = ''; } return; }
    const target = f.getBoundingClientRect().left + work.getBoundingClientRect().left + INSET;
    // Measure with the gap at its minimum: the free space then sits in the
    // right-hand spacer, and the gap may take only that much, so the address
    // never gets squeezed and nothing runs off the bar. Returns how far short
    // of the page's text the first tab still falls.
    const right = document.querySelector('.app-toolbar .kw-sp:not(.kw-sp-l)');
    function place(){
      const pad = parseFloat(getComputedStyle(first).paddingLeft) || 0;
      gap.style.flexBasis = MIN + 'px';
      const slack = right ? Math.max(0, right.getBoundingClientRect().width - (parseFloat(getComputedStyle(right).minWidth) || 0)) : 0;
      const want = Math.round(target - pad - gap.getBoundingClientRect().left);
      const w = Math.max(MIN, Math.min(MIN + slack, want));
      gap.style.flexBasis = w + 'px'; gap.style.minWidth = MIN + 'px'; last = w + 'px';
      return want - w;
    }
    /* Short of room, the bar tightens one step at a time until the tabs reach
       the text: first Side by side and Cart drop to their icons (their tooltips
       stay), then the tabs and the right-hand items close up a little. If even
       that can't line them up, nothing tightens: closer isn't worth the labels. */
    const b = document.body, set = n => { b.classList.toggle('kw-fit-1', n >= 1); b.classList.toggle('kw-fit-2', n >= 2); };
    for(let n = 0; n <= 2; n++){ set(n); if(place() <= 1) return; }
    set(0); place();
  }
  window.addEventListener('resize', align);
  setInterval(align, 250);
  align();
})();

/* ── Embedded (?embed=1&tab=overview|scope|documents) ──────────────────
   Another page can frame KaiWeb and bring its own chrome — the Shop concept
   does, so its Overview, Scope and Documents tabs are these real pages. Then
   the demo strip, the dark bar and the left rail hide, the starting tab comes
   from ?tab=, and the framing page switches tabs with a message:
   {type:'kw-embed-tab', page:'overview' | 'scope' | 'shop' | 'media' | 'floorplan' | 'documents'}. */
(function(){
  const qs = new URLSearchParams(location.search);
  if(qs.get('embed') !== '1') return;
  document.documentElement.classList.add('kw-embed');
  const MAP = {overview:'overview', scope:'shop', media:'media', floorplan:'floorplan', documents:'artifact', shop:'shopkai'};   // the mirrored tabs' data-page
  const go = page => {
    const pg = MAP[page] || page; let n = 0;
    (function tryIt(){
      const b = document.querySelector(`.kw-tab[data-page="${pg}"] .kw-tab-b`);
      if(b){ if(!b.closest('.kw-tab').classList.contains('is-on')) b.click(); return; }
      if(++n < 80) setTimeout(tryIt, 100);   // the panel draws its tabs once it has loaded
    })();
  };
  if(qs.get('tab')) go(qs.get('tab'));
  window.addEventListener('message', e => { const d = e.data || {}; if(d.type === 'kw-embed-tab' && d.page) go(d.page); });
  /* ?nopanel=1: the framing page shows its own task list, so this page's scope
     panel (and its drag handle and edge) stays hidden. Done from inside KaiWeb,
     so it works even when the framing page can't reach in (opened as a file). */
  if(qs.get('nopanel') === '1'){
    const hide = () => { const f = document.getElementById('iframe'), d = f && f.contentDocument;
      if(f && !f.dataset.np){ f.dataset.np = '1'; f.addEventListener('load', hide); }
      if(d && d.head && !d.getElementById('kw-no-panel')){ const st = d.createElement('style'); st.id = 'kw-no-panel'; st.textContent = '.body > .sidebar, .body > #handle, #pgEdge { display: none !important; }'; d.head.appendChild(st); } };
    hide(); setInterval(hide, 400);
  }
})();
