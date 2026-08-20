function renderCart(){
  if(!cartOpen) return;
  const entries=Object.entries(cart).map(([id,c])=>{
    const t=TASKS.find(x=>x.id===+id);
    return t?{id:+id, t, c}:null;
  }).filter(Boolean);
  // group by room
  const byRoom={};
  entries.forEach(e=>{ (byRoom[e.t.room]=byRoom[e.t.room]||[]).push(e); });
  const grandTotal=entries.reduce((s,e)=>s+e.c.product.price*e.c.qty,0);
  const grandBudget=entries.reduce((s,e)=>s+dollars(e.t.cost||0),0);
  const overCount=entries.filter(e=>isOverBudget(e.t,e.c.product,e.c.qty)).length;
  const cartEl=document.getElementById('cart');
  if(!entries.length){
    cartEl.innerHTML=`
      <div class="cart-head">
        <div><div class="cart-eyebrow">Purchase order</div><div class="cart-title">Empty</div></div>
        <button class="fly-close" onclick="closeCart()" aria-label="Close"><svg viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-linecap="round"/></svg></button>
      </div>
      <div class="cart-empty">
        <svg viewBox="0 0 24 24"><path d="M5 7h14l-1 11H6L5 7z"/><path d="M9 7V5a3 3 0 016 0v2"/></svg>
        <div>Add products from the shop to start building the PO.</div>
      </div>`;
    return;
  }
  cartEl.innerHTML=`
    <div class="cart-head">
      <div>
        <div class="cart-eyebrow">Purchase order</div>
        <div class="cart-title">${entries.length} ${entries.length===1?'product':'products'}</div>
        <div class="cart-summary">
          <span class="pill">${Object.keys(byRoom).length} ${Object.keys(byRoom).length===1?'room':'rooms'}</span>
          <span class="pill">${money(Math.round(grandTotal))} total</span>
          ${overCount?`<span class="pill over">${overCount} over budget</span>`:''}
        </div>
      </div>
      <button class="fly-close" onclick="closeCart()" aria-label="Close"><svg viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-linecap="round"/></svg></button>
    </div>
    <div class="cart-body">
      ${Object.entries(byRoom).map(([room,items])=>{
        const roomBudget=items.reduce((s,e)=>s+dollars(e.t.cost||0),0);
        const roomTotal=items.reduce((s,e)=>s+e.c.product.price*e.c.qty,0);
        const roomOver=roomTotal>roomBudget;
        return `<div class="cart-group">
          <div class="cart-group-hdr">
            <span class="cart-group-name">${room}</span>
            <span class="cart-group-meta${roomOver?' over':''}">${money(Math.round(roomTotal))} of ${money(roomBudget)}</span>
          </div>
          ${items.map(e=>cartItem(e)).join('')}
        </div>`;
      }).join('')}
    </div>
    <div class="cart-foot">
      <div class="cart-foot-row${grandTotal>grandBudget?' over':''}">
        <span class="gl">Grand total</span>
        <span class="gv">${money(Math.round(grandTotal))}</span>
      </div>
      <div class="cart-foot-row" style="font-size:11.5px;color:var(--t3)">
        <span class="gl">Scope budget</span>
        <span style="font-family:var(--mono)">${money(grandBudget)}</span>
      </div>
      <div class="cart-foot-actions">
        <button class="btn" onclick="closeCart()">Continue shopping</button>
        <button class="btn primary" onclick="toast('Submitted for review (placeholder)');closeCart()">Submit for review</button>
      </div>
    </div>`;
}
function cartItem(e){
  const {id, t, c}=e;
  const p=c.product;
  const lineTotal=p.price*c.qty;
  const over=isOverBudget(t,p,c.qty);
  return `<div class="cart-item${over?' is-over':''}">
    <div class="cart-item-thumb">${svgPhoto()}</div>
    <div class="cart-item-mid">
      <span class="cart-item-brand">${p.brand}</span>
      <span class="cart-item-name">${p.name}</span>
      <div class="cart-item-meta">SKU ${p.sku} · $${p.price.toLocaleString()} / ${p.unit}</div>
      <div class="cart-item-actions">
        <button class="cart-item-task" onclick="gotoTaskFromCart(${id})" title="Open this task in the scope panel">${t.room} · ${t.name}</button>
        <button class="cart-item-remove" onclick="removeFromCart(${id})">Remove</button>
      </div>
    </div>
    <div class="cart-item-right">
      <div class="shop-qty-grp">
        <div class="shop-qty" style="border:0">
          <button onclick="bumpCartQty(${id},-1)" aria-label="Decrease">−</button>
          <input type="number" min="0.1" step="1" value="${c.qty}" onchange="setCartQty(${id}, this.value)">
          <button onclick="bumpCartQty(${id},1)" aria-label="Increase">+</button>
        </div>
        <input class="shop-unit-input" list="unitSuggestions" value="${cartUnit(id)}" onchange="setCartUnit(${id}, this.value)" title="Change unit">
      </div>
      <span class="shop-qty-unit">${p.unit}</span>
      <span class="cart-item-total">$${Math.round(lineTotal).toLocaleString()}</span>
      ${over?`<span class="shop-product-over" title="Line total exceeds task budget of ${t.cost}">Over budget</span>`:''}
    </div>
  </div>`;
}
function flyResolveProduct(taskId, sku){
  const t=TASKS.find(x=>x.id===taskId); if(!t) return null;
  let p=productPool(t).find(x=>x.sku===sku);
  if(p) return p;
  // siblings
  for(const otherId in selectedProduct){
    if(selectedProduct[otherId] && selectedProduct[otherId].sku===sku) return selectedProduct[otherId];
  }
  return null;
}
function renderFly(){
  if(!flyState) return;
  const {taskId, sku}=flyState;
  const t=TASKS.find(x=>x.id===taskId); if(!t) return;
  const p=flyResolveProduct(taskId, sku); if(!p) return;
  const c=cart[taskId];
  const cartedHere = c && c.product.sku===p.sku;
  const qty = cartedHere ? c.qty : defaultQty(t, p);
  const total = p.price * qty;
  const stockLabel=p.stock==='low'?'Low stock':p.stock==='out'?'Out of stock':'In stock';
  const over = isOverBudget(t, p, qty);
  const d = productDetail(p, t);
  // related : same task pool minus this one — "Related for this task" is
  // hidden for now (see below); keep this computed in case it comes back.
  const related=[]; // was: productPool(t).filter(x=>x.sku!==p.sku).slice(0,4);
  const fly=document.getElementById('fly');
  fly.innerHTML=`
    <div class="fly-head">
      <div style="min-width:0">
        <div class="fly-eyebrow">${p.brand} · SKU ${p.sku}</div>
        <div class="fly-title">${p.name}</div>
      </div>
      <button class="fly-close" onclick="closeFly()" aria-label="Close"><svg viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-linecap="round"/></svg></button>
    </div>
    <div class="fly-body">
      <div class="fly-hero" id="flyHero" style="${p.image?'padding:0;overflow:hidden':''}">${p.image?`<img id="flyHeroImg" src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;background:#fff" onerror="this.style.opacity=.3">`:svgPhoto()}</div>
      ${flyThumbStrip(p)}
      ${p.source?`<div style="margin-top:6px;font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--t3);display:flex;align-items:center;gap:6px"><span>Source</span><a href="${p.sourceUrl||'#'}" target="_blank" rel="noopener" style="color:var(--ink);text-decoration:none;border-bottom:1px solid var(--stroke)">${p.source}</a></div>`:''}
      ${p.listPrice&&p.listPrice>p.price?`<div style="margin-top:4px;font-family:var(--body);font-size:12px;color:var(--t3)"><span style="text-decoration:line-through">$${p.listPrice.toLocaleString()}</span> <span style="color:var(--success);font-weight:600;margin-left:4px">Save $${(p.listPrice-p.price).toLocaleString()}</span></div>`:''}

      <div>
        <div class="fly-price">
          <span class="fly-price-amt">$${p.price.toLocaleString()}</span>
          <span class="fly-price-unit">/ ${p.unit}</span>
        </div>
        <div class="fly-tags" style="margin-top:8px">
          <span class="shop-product-tag" style="background:${p.stock==='in'?'rgba(46,144,72,.10)':p.stock==='low'?'rgba(196,150,15,.10)':'rgba(192,68,58,.08)'};color:${p.stock==='in'?'var(--success)':p.stock==='low'?'#9E6B2F':'var(--error)'};border-color:${p.stock==='in'?'#CFE3D3':p.stock==='low'?'#F0E0BB':'#E3B7B3'}">${stockLabel}</span>
          ${(p.tags||[]).map(tg=>{const cls=/template|manager|designer/i.test(tg)?'tmpl':/budget/i.test(tg)?'budget':'';return `<span class="shop-product-tag ${cls}">${tg}</span>`}).join('')}
          ${over?`<span class="shop-product-over">Over budget for this task</span>`:''}
        </div>
      </div>

      <div class="fly-section">
        <span class="fly-section-h">About this product</span>
        <p class="fly-desc">${d.about}</p>
      </div>

      <div class="fly-section">
        <span class="fly-section-h">Highlights</span>
        <ul style="padding-left:18px;display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--t2);line-height:1.55;margin:0">
          ${d.highlights.map(h=>`<li>${h}</li>`).join('')}
        </ul>
      </div>

      <div class="fly-section">
        <span class="fly-section-h">What's included</span>
        <p class="fly-desc">${d.includes}</p>
      </div>

      <div class="fly-section">
        <span class="fly-section-h">Specifications</span>
        <div class="fly-specs">
          ${Object.entries(d.specs).map(([k,v])=>`<div><span class="fly-spec-k">${k}</span><span class="fly-spec-v">${v}</span></div>`).join('')}
        </div>
      </div>

      <div class="fly-section">
        <span class="fly-section-h">Product information</span>
        <div class="fly-specs">
          <div><span class="fly-spec-k">Brand</span><span class="fly-spec-v">${p.brand}</span></div>
          <div><span class="fly-spec-k">Catalog #</span><span class="fly-spec-v">${100000000 + (p.sku.replace(/\D/g,'')|0)}</span></div>
          <div><span class="fly-spec-k">Model #</span><span class="fly-spec-v">${p.sku}</span></div>
          <div><span class="fly-spec-k">Store SKU</span><span class="fly-spec-v">${10000000 + (p.sku.replace(/\D/g,'')|0)%9999999}</span></div>
          <div><span class="fly-spec-k">Sold by</span><span class="fly-spec-v">${p.unit}</span></div>
          <div><span class="fly-spec-k">Unit price</span><span class="fly-spec-v">$${p.price.toLocaleString()}</span></div>
        </div>
      </div>

      ${related.length?`<div class="fly-section">
        <span class="fly-section-h">Related for this task</span>
        <div class="fly-related">
          ${related.map(r=>`<div class="fly-related-card" onclick="openFly(${taskId},'${r.sku}')">
            <div class="fly-related-thumb">${svgPhoto()}</div>
            <div class="fly-related-brand">${r.brand}</div>
            <div class="fly-related-name">${r.name}</div>
            <div class="fly-related-price">$${r.price.toLocaleString()} / ${r.unit}</div>
          </div>`).join('')}
        </div>
      </div>`:''}
    </div>
    <div class="fly-foot">
      <div class="fly-task">
        Adding to<b>${t.room} · ${t.name}</b>
        <span style="display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.04em;color:${over?'var(--error)':'var(--t3)'};margin-top:3px">${qty} ${cartedHere?cartUnit(taskId):p.unit} · $${Math.round(total).toLocaleString()} ${over?'(over budget of '+t.cost+')':''}</span>
      </div>
      ${cartedHere
        ? `<div class="shop-qty-grp">
            <div class="shop-qty" style="border:0"><button onclick="bumpCartQty(${taskId},-1)">−</button><input type="number" min="0.1" step="1" value="${qty}" onchange="setCartQty(${taskId},this.value)"><button onclick="bumpCartQty(${taskId},1)">+</button></div>
            <input class="shop-unit-input" list="unitSuggestions" value="${cartUnit(taskId)}" onchange="setCartUnit(${taskId}, this.value)" title="Change unit">
          </div>`
        : `<div class="shop-qty-grp" title="Set qty and unit before adding">
            <div class="shop-qty" style="border:0">
              <button onclick="adjPending(-1)">−</button>
              <input id="flyPendingQty" type="number" min="0.1" step="1" value="${defaultQty(t, p)}">
              <button onclick="adjPending(1)">+</button>
            </div>
            <input id="flyPendingUnit" class="shop-unit-input" list="unitSuggestions" value="${p.unit}" title="Change unit">
          </div>`
      }
      <button class="fly-cta${cartedHere?' is-selected':''}" onclick="selectProduct(${taskId},'${p.sku}')">
        ${cartedHere?'Added ✓':'Add to task'}
      </button>
    </div>`;
}

// Shared empty-state block for each of the 6 tabs when the scope has no
// tasks (Step 1 · Empty draft). Icons + copy are per-tab so users understand
// where they are and what action would fill the surface.
function _tabEmptyHtml(mode){
  const specs = {
    floorplan: {
      icon: '<path d="M3 3h18v18H3z"/><path d="M3 12h9M12 3v18M12 16h6"/><circle cx="7.5" cy="7.5" r="1"/>',
      title: 'No measurements yet',
      desc: 'Upload measurements so field agents can pin photos to specific rooms during walks.',
      cta: {label:'Upload measurements', action:"toast('Upload flow — not wired')"},
    },
    gallery: {
      icon: '<rect x="3" y="5" width="18" height="14"/><circle cx="9" cy="10" r="1.5"/><path d="M4 17l5-5 4 4 2-2 4 4"/>',
      title: 'No photos yet',
      desc: 'Photos captured during walks will land here, grouped by room and organized by walk date.',
      cta: {label:'Upload photos', action:"toast('Upload flow — not wired')"},
    },
    shop: {
      icon: '<path d="M4 4h16v16H4z"/><path d="M4 10h16M9 4v16"/>',
      title: 'Start building your scope',
      desc: 'Add tasks to the sidebar to define the work. Each task can hold a contractor, product picks, and cost.',
    },
    pano: {
      icon: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>',
      title: 'No progress captured yet',
      desc: 'Once field agents complete a walk, progress photos will surface here — organized by room and walk date.',
    },
    progress: {
      icon: '<path d="M4 6h16M4 12h16M4 18h10"/>',
      title: 'No activity yet',
      desc: 'Task updates, contractor assignments, photo drops, and approvals will appear here as they happen.',
      hint: 'Activity appears once tasks are added and work begins',
    },
    artifact: {
      icon: '<path d="M5 3h11l4 4v14H5z"/><path d="M15 3v5h5M9 13h7M9 17h7"/>',
      title: 'No scope submitted yet',
      desc: 'Finish building the scope and submit it for review. The approved artifact with line items, prices, and totals will live here.',
      hint: 'Submit the scope for review from the top-right button',
    },
    artifact2: {
      icon: '<path d="M5 3h11l4 4v14H5z"/><path d="M15 3v5h5M9 12h7M9 16h4"/>',
      title: 'No change history yet',
      desc: 'Once a scope is approved and change orders start landing, every edit shows up here as a redline on the document with a margin card naming who changed what.',
      hint: 'Change history begins at the first approved scope',
    },
  };
  const s = specs[mode] || specs.shop;
  const cta = s.cta ? `<button class="tab-empty-cta" onclick="${s.cta.action}"><svg viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>${s.cta.label}</button>` : '';
  const hint = s.hint ? `<div class="tab-empty-hint">${s.hint}</div>` : '';
  return `<div class="tab-empty">
    <div class="tab-empty-icon"><svg viewBox="0 0 24 24">${s.icon}</svg></div>
    <div class="tab-empty-title">${s.title}</div>
    <div class="tab-empty-desc">${s.desc}</div>
    ${cta}
    ${hint}
  </div>`;
}
function _renderTabEmptyIfNeeded(mode){
  if((TASKS || []).length !== 0) return false;
  const body = document.getElementById('workBody');
  if(!body) return false;
  body.innerHTML = _tabEmptyHtml(mode);
  return true;
}
