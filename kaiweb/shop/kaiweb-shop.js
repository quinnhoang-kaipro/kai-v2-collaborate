/* Shop with Kai inside KaiWeb: adapters between the wireframe's Shop layer and KaiWeb's panel. */

/* Tabs on top of the whole page.
   The tab bar used to sit over the middle panel only, yet it also decides what
   the left panel shows (Shop swaps the scope list for the Shopping List). So it
   moves up to span the left and middle panels: each tab is a whole page — its
   list on the left, its content in the middle — and Media / Floorplan, at the
   bar's far right, open the reference panel beside any of them. */
(function(){
  function lift(){
    const h = document.getElementById('workHdr'), main = document.getElementById('main');
    const body = main && main.querySelector(':scope > .body');
    if(!h || !body) return;
    if(h.parentElement !== main) main.insertBefore(h, body);
    document.body.classList.add('kw-tabs-top');
  }
  lift();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lift);
  window.addEventListener('load', lift);
})();

/* Overview carries the full project stepper. The dark bar only shows a chip
   for it now (see kaiweb-shell.js); Overview is the page about where the
   project stands, so the three stages are laid out there in full. The stages
   are read from the app shell's stepper (still rendered, just hidden), and a
   click on one is handed back to it, so it jumps exactly as the old stepper did. */
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function shellStages(){
    try{
      const P = window.parent && window.parent !== window ? window.parent.document : null;
      const st = P && P.getElementById('stages'); if(!st) return null;
      const list = [...st.querySelectorAll(':scope > .stage')].map((el, i) => ({el, n:i + 1,
        label:(el.querySelector('.stage-label') || el).textContent.trim(), done:el.classList.contains('done'),
        viewing:el.classList.contains('active'), can:el.classList.contains('accessible')}));
      const cap = P.querySelector('#stageCaps .stage-cap.active'), tip = P.getElementById('appApproveTip');
      return {list, complete:!!st.querySelector('.stages-completed'), hint:(cap && cap.textContent.trim()) || (tip && tip.textContent.trim()) || ''};
    }catch(e){ return null; }
  }
  /* Just the current stage, as one fact at the top of the property card —
     the other stages aren't listed (a stage you can't be in yet says nothing).
     The note on what moves it on is the field's tooltip. */
  function draw(){
    const ov = document.querySelector('#workBody > .ov'); if(!ov) return;
    const old = ov.querySelector(':scope > .kw-ov-stepper'); if(old) old.remove();
    const facts = ov.querySelector('.ov-id .ov-id-facts'); if(!facts) return;
    const s = shellStages(); let el = facts.querySelector(':scope > .kw-ov-stage');
    if(!s || (!s.list.length && !s.complete)){ if(el) el.remove(); return; }
    const cur = Math.min(s.list.filter(x => x.done).length, Math.max(0, s.list.length - 1));
    const label = s.complete ? 'Project completed' : s.list[cur].label;
    const html = `<span class="ov-k">Project stage</span>
      <span class="ov-v"><b class="kw-ov-stage-v">${esc(label)}</b>${s.complete ? '' : `<span class="kw-ov-stage-n">Stage ${cur + 1} of ${s.list.length}</span>`}</span>`;
    if(!el){ el = document.createElement('div'); el.className = 'ov-f ov-id-f kw-ov-stage'; facts.prepend(el); }
    if(el.innerHTML !== html) el.innerHTML = html;
    el.title = s.complete ? '' : s.hint;
  }
  if(typeof window.renderWork === 'function'){
    const _rw = window.renderWork;
    window.renderWork = function(){ const r = _rw.apply(this, arguments); try{ draw(); }catch(e){} return r; };
  }
  setInterval(() => { try{ draw(); }catch(e){} }, 1000);   // the shell's stage can change without a panel redraw
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', draw); else setTimeout(draw, 0);
})();

/* Media / Floorplan: a slim rail on the page's right edge.
   They are reference panels you open beside any tab, so they sit where the
   panel opens rather than in the page tabs' bar. The rail stays put; the
   panel slides out to its left. Each button is a toggle (pgSide). */
(function(){
  const ITEMS = [['media', 'Media'], ['floorplan', 'Floorplan'], ['cart', 'Cart']];
  const CART_IC = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 3.5h2.2l2 9.5h8.6l1.7-6.6H5.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="16.2" r="1.2" fill="currentColor"/><circle cx="14.3" cy="16.2" r="1.2" fill="currentColor"/></svg>';
  function draw(){
    const body = document.querySelector('#main > .body'); if(!body) return;
    let r = document.getElementById('kwRail');
    if(!r){
      r = document.createElement('nav'); r.id = 'kwRail'; r.className = 'kw-rail'; r.setAttribute('aria-label', 'Side panels');
      r.addEventListener('click', e => { const b = e.target.closest('[data-ref]'); if(b && typeof window.pgSide === 'function') window.pgSide(b.dataset.ref); setTimeout(draw, 30); });
    }
    if(r.parentElement !== body || r !== body.lastElementChild) body.appendChild(r);
    const ref = id => document.querySelector(`#pgRefTools .pg-ref-btn[data-ref="${id}"]`);
    const hasShop = typeof window.kwCartInfo === 'function' && !!window.kwCartInfo();
    const html = ITEMS.filter(([id]) => id !== 'cart' || hasShop).map(([id, label]) => {
      const src = ref(id), on = !!(src && src.classList.contains('on')), svg = id === 'cart' ? null : src && src.querySelector('svg');
      return `${id === 'cart' ? '<span class="kw-rail-sep" aria-hidden="true"></span>' : ''}<button type="button" class="kw-rail-b${on ? ' is-on' : ''}" data-ref="${id}" aria-pressed="${on}" title="${on ? 'Close ' + label : 'Open ' + label + ' beside this page'}">${id === 'cart' ? CART_IC : svg ? svg.outerHTML : ''}<span>${label}</span></button>`;
    }).join('');
    if(r.innerHTML !== html) r.innerHTML = html;
  }
  setInterval(draw, 500);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', draw); else setTimeout(draw, 0);
})();

/* ── One money story: the documents follow the live scope ──
   KaiWeb's demo seeds its document figures (VERSIONS: the original scope and
   its change orders; OV_ACT: the activity feed's running totals) for its own
   smaller job. Shop with Kai's job has 38 tasks, so those seeds no longer
   matched the scope total the left panel adds up live — $26,370 against
   $47,195. Here the current document is pinned to the live task total, and
   every other seeded figure moves by the same amount, so each change order
   still differs from the one before by exactly what it did. Re-run before
   each render, so editing the scope moves the register with it. */
(function(){
  if(typeof VERSIONS === 'undefined' || typeof TASKS === 'undefined' || typeof dollars !== 'function') return;
  const fmt = n => '$' + (Math.round(n * 100) / 100).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  VERSIONS.forEach(v => { if(v._seed == null) v._seed = dollars(v.budget); });
  const ACT = (typeof OV_ACT !== 'undefined') ? OV_ACT : [];
  ACT.forEach(e => { if(e._seed == null && typeof e.total === 'number') e._seed = e.total; });
  function live(){
    return TASKS.reduce((a, t) => (typeof __CO_REMOVED !== 'undefined' && __CO_REMOVED.has(t.id)) ? a : a + dollars(t.cost || '$0'), 0);
  }
  function sync(){
    if(!VERSIONS.length) return;
    // the current document: the newest one (a closeout, when there is one)
    const cur = VERSIONS.slice().sort((a, b) => b.num - a.num)[0];
    const off = live() - cur._seed;
    VERSIONS.forEach(v => { v.budget = fmt(v._seed + off); });
    ACT.forEach(e => { if(e._seed != null) e.total = Math.round((e._seed + off) * 100) / 100; });
  }
  window.kwSyncMoney = sync;
  sync();
  if(typeof window.renderWork === 'function'){
    const _rw = window.renderWork;
    window.renderWork = function(){ try{ sync(); }catch(e){} return _rw.apply(this, arguments); };
  }
})();

/* ── One money story, shown the same way everywhere ──
   The job's money is one chain, and every figure on screen is a link in it:

     Job budget            $50,000
     └ Scope total         $47,195   (labor + materials, from the tasks)
        ├ Labor            $18,020   paid to contractors, never in the cart
        └ Materials est.   $29,175
           └ In the cart   $24,867   chosen products, after bulk savings

   kwMoney() works the figures out once; the three views below show them:
   the Shop header (materials vs the materials estimate, with the chain on
   hover), the cart's summary (the chain in full), and the Overview register
   (what's been chosen, under Materials; headroom, under the job total). */
(function(){
  const M = n => (typeof _recMoney === 'function') ? _recMoney(n) : '$' + Number(n || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.kwMoney = function(){
    if(typeof TASKS === 'undefined' || typeof dollars !== 'function') return null;
    const scope = TASKS.reduce((a, t) => (typeof __CO_REMOVED !== 'undefined' && __CO_REMOVED.has(t.id)) ? a : a + dollars(t.cost || '$0'), 0);
    const split = typeof _recScaleTo === 'function' ? _recScaleTo(scope) : {mat:scope, lab:0};
    const c = typeof window.kwCartInfo === 'function' ? window.kwCartInfo() : null;
    return {budget:(typeof JOB_BUDGET !== 'undefined' ? JOB_BUDGET : 0), scope, lab:split.lab, mat:split.mat,
      cart:c ? c.totalNum : null, n:c ? c.n : 0, slots:c ? c.slots : 0, missing:c ? c.missing : 0};
  };
  const diff = (a, b, under, over) => a <= b ? `${M(b - a)} ${under}` : `${M(a - b)} ${over}`;

  // Shop header: the cart is materials, so it is read against the materials estimate.
  window.kwMoneyShopHtml = function(){
    const m = window.kwMoney(); if(!m || m.cart == null) return '';
    const over = m.cart > m.mat;
    const rows = [['Job budget', M(m.budget)], ['Scope total', M(m.scope)], ['Labor (not bought here)', M(m.lab)],
      ['Materials estimate', M(m.mat)], [`In the cart (${m.n} of ${m.slots} items)`, M(m.cart)]];
    return `<span class="sp-meta sp-allow has-tip kw-money-hd${over ? ' is-over' : ''}" tabindex="0">
      Materials <b>${M(m.cart)}</b> of <b>${M(m.mat)}</b> estimate
      <span class="sp-tip" role="tooltip">${rows.map(([k, v]) => `<span class="sp-tip-k">${E(k)}</span><span class="sp-tip-v">${E(v)}</span>`).join('')}
        <span class="sp-tip-go">${E(diff(m.cart, m.mat, 'under the materials estimate', 'over the materials estimate'))}</span></span></span>`;
  };

  // Cart summary: the whole chain, nested, so this order's place in the job is plain.
  window.kwMoneyCartHtml = function(){
    const m = window.kwMoney(); if(!m || m.cart == null) return '';
    const pct = m.mat ? Math.min(100, m.cart / m.mat * 100) : 0;
    return `<section class="kw-money" aria-label="How this cart fits the job">
      <h4 class="kw-money-t">How this fits the job</h4>
      <div class="kw-money-r is-0"><span>Job budget</span><b>${M(m.budget)}</b></div>
      <div class="kw-money-r is-1"><span>Scope total</span><b>${M(m.scope)}</b></div>
      <p class="kw-money-n is-1">${E(diff(m.scope, m.budget, 'under budget', 'over budget'))}</p>
      <div class="kw-money-r is-2"><span>Labor <i>paid to contractors, not in the cart</i></span><b>${M(m.lab)}</b></div>
      <div class="kw-money-r is-2"><span>Materials estimate</span><b>${M(m.mat)}</b></div>
      <div class="kw-money-r is-3 is-here"><span>This cart <i>${m.n} of ${m.slots} items</i></span><b>${M(m.cart)}</b></div>
      <div class="kw-money-bar is-3" role="img" aria-label="Cart is ${Math.round(pct)}% of the materials estimate"><i style="width:${pct.toFixed(1)}%"></i></div>
      <p class="kw-money-n is-3">${E(diff(m.cart, m.mat, 'under the materials estimate', 'over the materials estimate'))}${m.missing ? ` · ${m.missing} item${m.missing === 1 ? '' : 's'} still to choose` : ''}</p>
    </section>`;
  };

  // Overview register: headroom under the job total; what's chosen under Materials.
  function decorateRegister(){
    const reg = document.querySelector('#workBody .reg-row'); if(!reg) return;
    const m = window.kwMoney(); if(!m) return;
    const figs = [...reg.querySelectorAll('.reg-fig')];
    const byKey = k => figs.find(f => (f.querySelector('.reg-k') || {}).textContent && f.querySelector('.reg-k').textContent.trim().toLowerCase().startsWith(k));
    const put = (fig, cls, html) => { if(!fig) return; let el = fig.querySelector('.' + cls); if(!el){ el = document.createElement('span'); el.className = 'kw-reg-note ' + cls; fig.appendChild(el); } if(el.innerHTML !== html) el.innerHTML = html; };
    put(byKey('job budget'), 'kw-reg-head', E(diff(m.scope, m.budget, 'left after the scope', 'over, with the scope')));
    if(m.cart != null) put(byKey('materials'), 'kw-reg-cart',
      `<button type="button" class="ov-link" onclick="kwOpenCart && kwOpenCart()">${E(M(m.cart))} in the cart</button> · ${m.n} of ${m.slots} items`);
  }
  if(typeof window.renderWork === 'function'){
    const _rw = window.renderWork;
    window.renderWork = function(){ const r = _rw.apply(this, arguments); try{ decorateRegister(); }catch(e){} return r; };
  }
  setInterval(() => { try{ decorateRegister(); }catch(e){} }, 1000);
})();
