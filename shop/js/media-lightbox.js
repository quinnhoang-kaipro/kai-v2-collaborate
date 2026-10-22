function openGroupFromGallery(room){ mediaScope=room; mediaTask=null; renderGallery(); }
function openTaskFromGallery(id){
  const t=TASKS.find(x=>x.id===id); if(!t) return;
  mediaScope=t.room; mediaTask=id; renderGallery();
}
function clearMediaScope(){ mediaScope='all'; mediaTask=null; renderGallery(); }
function renderGallery(){
  const body=document.getElementById('workBody');
  const rooms = mediaScope==='all' ? ROOMS : [mediaScope];
  const single = mediaScope!=='all';
  // Project-wide tallies for the info block at the bottom.
  let capTot=0, upTot=0;
  const allSeeds=[];
  ROOMS.forEach(room=>{
    groupPhotos(room).forEach(p=>allSeeds.push(p.seed));
    TASKS.filter(t=>t.room===room).forEach(t=>photosForTask(t).forEach(p=>allSeeds.push(p.seed)));
  });
  const uAll=unsortedPhotos();
  uAll.forEach(p=>allSeeds.push(p.seed));
  allSeeds.forEach(s=>{ (photoMeta(s).source==='Uploaded')?upTot++:capTot++; });
  const groupCount=ROOMS.length, taskCount=TASKS.length;

  let html='<div class="gal ds-set">';
  if(single){
    const drilledTask = mediaTask ? TASKS.find(t=>t.id===mediaTask) : null;
    const crumb = drilledTask ? `${mediaScope} <span class="bc-sep">/</span> ${drilledTask.name}` : mediaScope;
    html+=`<div class="ds-scopebar">
      <button class="bc-back" onclick="clearMediaScope()">${galBcArrow()} All scope</button>
      <span class="bc-sep">/</span>
      <span class="bc-here">${crumb}</span>
    </div>`;
  }
  // UNSORTED first (only at project-wide view when photos need a home).
  if(!single && uAll.length){
    const collapsed = mediaCollapsed.has('ds:unsorted');
    html+=`<div class="gal-sec">
      <div class="gal-grphead">
        <span class="gal-grpname">Unsorted</span>
        <span class="gal-grpmeta">${uAll.length} ${uAll.length===1?'photo':'photos'} · needs a task</span>
        <span class="gal-grphead-rule"></span>
        <button class="ds-add" onclick="openAddGalleryModal({kind:'unsorted'})">${galPlusSvg()} Add</button>
        <button class="gal-toggle" onclick="toggleGalSection('ds:unsorted')"><span>${collapsed?'See all '+uAll.length+' unsorted':'Collapse Unsorted'}</span> ${collapsed?galArrowDn():galArrowUp()}</button>
      </div>
      ${collapsed?'':`<div class="ds-frame ds-frame-tight"><div class="ds-grid">${uAll.map(drawingPhotoBox).join('')}</div></div>`}
    </div>`;
  }
  const renderSheet=(room)=>{
    const tasks=TASKS.filter(t=>t.room===room);
    if(!tasks.length && !single) return '';
    const gPhotos=groupPhotos(room);
    const total=gPhotos.length + tasks.reduce((n,t)=>n+photosForTask(t).length,0);
    const collapsed=mediaCollapsed.has('ds:'+room);
    let s=`<div class="gal-sec">
      <div class="gal-grphead">
        <span class="gal-grpname${!single?' gal-link':''}"${!single?` onclick="openGroupFromGallery('${room}')"`:''}>${room}</span>
        <span class="gal-grpmeta">${tasks.length} ${tasks.length===1?'task':'tasks'}<span class="sep">·</span>${total} ${total===1?'photo':'photos'}</span>
        <span class="gal-grphead-rule"></span>
        <button class="ds-add" onclick="openAddGalleryModal({kind:'group',room:'${room}'})">${galPlusSvg()} Add</button>
        <button class="gal-toggle" onclick="toggleGalSection('ds:${room}')"><span>${collapsed?'See all '+total+' in '+room:'Collapse '+room}</span> ${collapsed?galArrowDn():galArrowUp()}</button>
      </div>`;
    if(!collapsed){
      if(gPhotos.length){
        s+=`<div class="ds-grpsub">Group photos · ${gPhotos.length}</div>`;
        s+=`<div class="ds-frame ds-frame-tight"><div class="ds-grid">${gPhotos.map(drawingPhotoBox).join('')}</div></div>`;
      }
      tasks.forEach(t=>{
        const tp=photosForTask(t);
        s+=`<div class="ds-taskhead${tp.length?'':' ds-empty'}">
              <div class="ds-taskhead-top">
                <span class="ds-tasklabel gal-link" onclick="openTaskFromGallery(${t.id})">${t.name}</span>
                ${tp.length?`<span class="ds-taskmeta">${tp.length} ${tp.length===1?'photo':'photos'}</span>`:`<span class="ds-emptyflag">No photos</span>`}
                <span class="ds-taskrule"></span>
                <button class="ds-add ds-add-sm" onclick="openAddGalleryModal({kind:'task',room:'${room}',task:'${t.code}'})">${galPlusSvg()} Add</button>
              </div>
              ${t.opt?`<div class="ds-taskopt">${t.opt}</div>`:''}
            </div>`;
        if(tp.length){
          s+=`<div class="ds-frame ds-frame-tight"><div class="ds-grid">${tp.map(drawingPhotoBox).join('')}</div></div>`;
        }
      });
    }
    s+=`</div>`;
    return s;
  };
  rooms.forEach(room=>{ html+=renderSheet(room); });
  if(!single){
    html+=`<div class="ds-titleblock">
      <div class="ds-tb-row">
        <div class="ds-tb-project">
          <span class="ds-tb-label">Job</span>
          <span class="ds-tb-name">3484 South Main St</span>
        </div>
        <div class="ds-tb-cell"><span class="ds-tb-label">Group / Task</span><span class="ds-tb-val">${groupCount} / ${taskCount}</span></div>
        <div class="ds-tb-cell"><span class="ds-tb-label">Captured / Uploaded</span><span class="ds-tb-val">${capTot} / ${upTot}</span></div>
        <div class="ds-tb-cell"><span class="ds-tb-label">Updated</span><span class="ds-tb-val">07 / 01 / 26</span></div>
      </div>
    </div>`;
  }
  html+='</div>';
  body.innerHTML = html;
  return; // Old task-focused rendering below is superseded by the new full-scope view.
}
function _legacyRenderGallery(){
  const body=document.getElementById('workBody');
  const sel=selId?TASKS.find(t=>t.id===selId):null;

  // No task selected → show empty hint pointing to the sidebar
  if(!sel){
    body.innerHTML=`
      <div class="shop-empty">
        <span class="shop-empty-icon"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="0"/><circle cx="9" cy="10" r="2"/><path d="M3 17l5-5 4 4 3-3 6 5"/></svg></span>
        <span class="shop-empty-title">Select a task to see its visual context</span>
        <span class="shop-empty-desc">Gallery shows existing-condition photos, room dimensions, walkthrough notes, and what's been picked for sibling tasks : everything you need to make a confident product choice.</span>
      </div>`;
    return;
  }

  const meta = ROOM_META[sel.room] || {dims:':', light:':', notes:[]};
  const photoN = sel.photos||0;
  const roomPhotosN = (typeof roomPhotoCount==='function')?roomPhotoCount(sel.room):Math.min(6, 2+(sel.photos||0));
  const taskPhotos = Array.from({length:photoN}).map((_,i)=>
    `<div class="gal-photo is-static">
      <span class="tag task">Task</span>${svgPhoto()}<span class="cap">${sel.name} · ${i+1}</span>
    </div>`
  ).join('');
  const roomPhotos = Array.from({length:roomPhotosN}).map((_,i)=>
    `<div class="gal-photo is-static">
      <span class="tag">Room</span>${svgPhoto()}<span class="cap">${sel.room} scan ${i+1}</span>
    </div>`
  ).join('');
  // Inspo photos : fake 2-3 if the task has notes
  const inspoN = sel.notes>0 ? 3 : 0;
  const inspoPhotos = Array.from({length:inspoN}).map((_,i)=>
    `<div class="gal-photo" title="Reference attached by designer">
      <span class="tag inspo">Inspo</span>${svgPhoto()}<span class="cap">Reference ${i+1}</span>
    </div>`
  ).join('');

  // Coordinating items : other tasks in the same room
  const siblings = TASKS.filter(t=>t.room===sel.room).map(t=>{
    const isSelf = t.id===sel.id;
    const c = cart[t.id];
    let prod=null, status='pending', cls='pending';
    if(c){ prod=c.product; status='In PO'; cls=''; }
    else if(t.product){ prod={brand:'',name:t.product,unit:t.qty?String(t.qty).replace(/[\d.\s]/g,'').trim()||'ea':'ea'}; status='Pre-selected'; cls=''; }
    return {t, isSelf, prod, status, cls};
  });
  const coord = siblings.map(s=>`
    <div class="gal-coord-item ${s.isSelf?'self':''}" ${s.isSelf?'':`onclick="selId=${s.t.id};renderSidebar();renderWork()"`}>
      <div class="gal-coord-thumb">${svgPhoto()}</div>
      <div class="gal-coord-mid">
        <span class="gal-coord-task">${s.t.name}${s.t.opt?' · '+s.t.opt:''}</span>
        <span class="gal-coord-prod ${s.prod?'':'muted'}">${s.prod?(s.prod.brand?s.prod.brand+' ':'')+s.prod.name:'No product selected yet'}</span>
        <span class="gal-coord-meta">${s.t.cost||''} ${s.t.gc?'· '+s.t.gc:''}</span>
      </div>
      <span class="gal-coord-status ${s.isSelf?'self':s.cls}">${s.isSelf?'This task':s.status}</span>
    </div>
  `).join('');

  const budget = dollars(sel.cost||0);
  const c = cart[sel.id];
  const spent = c ? c.product.price * c.qty : 0;
  const over = budget && spent>budget;

  body.innerHTML = `<div class="gallery">

    <div class="gal-head">
      <div class="gal-head-l">
        <div class="gal-head-eyebrow">${sel.room} · ${sel.code}</div>
        <div class="gal-head-name">${sel.name}</div>
        <div class="gal-head-opt">${sel.opt||''}</div>
        <button class="gal-shop-btn" onclick="setWorkMode('shop')">Shop for this task <svg viewBox="0 0 12 12" fill="none"><path d="M4.5 3l3 3-3 3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
      <div class="gal-head-r">
        <div class="gal-head-stat"><span class="k">Qty</span><span class="v">${sel.qty||':'}</span></div>
        <div class="gal-head-stat"><span class="k">Budget</span><span class="v ${over?'over':''}">${sel.cost||':'}</span></div>
      </div>
    </div>

    <div class="gal-info">
      <div class="gal-info-cell"><span class="k">Room dims</span><span class="v">${meta.dims}</span></div>
      <div class="gal-info-cell"><span class="k">Light</span><span class="v">${meta.light}</span></div>
      <div class="gal-info-cell"><span class="k">Photos</span><span class="v">${photoN} task · ${roomPhotosN} room</span></div>
      <div class="gal-info-cell"><span class="k">Contractor</span><span class="v">${sel.gc||'Unassigned'}</span></div>
    </div>

    <div class="gal-sec">
      <div class="gal-sec-h">
        <span class="lbl">Existing conditions</span>
        <span class="sub">Photos from the field walkthrough</span>
        <span class="ct">${photoN+roomPhotosN} total</span>
      </div>
      <div class="gal-grid">${taskPhotos}${roomPhotos}</div>
    </div>

    <div class="gal-sec">
      <div class="gal-sec-h">
        <span class="lbl">Coordinating with</span>
        <span class="sub">Other tasks in ${sel.room} : pick products that work together</span>
        <span class="ct">${siblings.length-1} sibling ${siblings.length-1===1?'task':'tasks'}</span>
      </div>
      <div class="gal-coord">${coord}</div>
    </div>

    <div class="gal-sec">
      <div class="gal-sec-h">
        <span class="lbl">Notes & observations</span>
        <span class="sub">From the field walkthrough and designer review</span>
      </div>
      <div class="gal-notes">
        ${sel.desc?`<div class="gal-note"><div class="gal-note-meta"><span class="who">Task description</span></div><div class="gal-note-body">${sel.desc}</div></div>`:''}
        ${meta.notes.map(n=>`<div class="gal-note"><div class="gal-note-meta"><span class="who">${n.who}</span><span>${n.when}</span></div><div class="gal-note-body">${n.body}</div></div>`).join('')}
      </div>
    </div>

    ${inspoN?`<div class="gal-sec">
      <div class="gal-sec-h">
        <span class="lbl">Reference & inspiration</span>
        <span class="sub">Designer-attached visual reference</span>
        <span class="ct">${inspoN} reference${inspoN===1?'':'s'}</span>
      </div>
      <div class="gal-grid">${inspoPhotos}</div>
    </div>`:''}

  </div>`;
}

