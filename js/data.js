/* ════════════ DATA ════════════ */
const ATT = {
  unassigned:{label:'Unassigned contractor', cls:'c-unassigned'},
  missing:   {label:'Missing product',        cls:'c-missing'},
  oos:       {label:'Out of stock',           cls:'c-oos'},
  deferred:  {label:'Deferred',               cls:'c-deferred'},
  tenant:    {label:'Tenant',                 cls:'c-tenant'},
  fin:       {label:'Financial modifier',     cls:'c-fin'},
};
/* resolvable system-detected problems */
const FLAGS = {
  unassigned:{label:'Unassigned contractor', cls:'c-unassigned'},
  no_gc:     {label:'Unassigned contractor', cls:'c-unassigned'},
  oos:       {label:'Out of stock',          cls:'c-oos'},
  edit_req:  {label:'Edit requests',         cls:'c-editreq'},
  co_open:   {label:'Change orders',         cls:'c-coopen'},
};
/* user-created modifier tags (up to 5 per project). kind: financial | display */
let PROJECT_MODS = [
  {id:'tenant',   label:'Tenant',               kind:'financial'},
  {id:'deferred', label:'Deferred',           kind:'financial'},
];
const STATUS = {
  not_started: {label:'Not started',    cls:'s-notstarted'},
  in_progress: {label:'In progress',    cls:'s-inprogress'},
  pending:     {label:'Pending review', cls:'s-pending'},
  in_review:   {label:'In review',      cls:'s-inreview'},
  complete:    {label:'Completed',      cls:'s-complete'},
  needs_rework:{label:'Rework',         cls:'s-rework'},
  missing:     {label:'Missing details',cls:'s-missing'},
  approved:    {label:'Approved',       cls:'s-complete'},   // relabelled per stage — see approveDoneLabel
  edit_req:    {label:'Edit Requested', cls:'s-inreview'},
};

/* Project mode passed from the shell. Determines which task-status vocabulary
   shows in the sidebar (per the language table): draft = "Missing details";
   review / closeout = "Approved" / "Edit Requested"; work = the full set. */
const PROJ_MODE = new URLSearchParams(window.__KAI_QS || window.location.search).get('projMode') || 'work';
// ── Scope versioning ─────────────────────────────────────────────────
// Owned by the iframe now (was previously in the shell's stepper). The chip
// lives in the sidebar header since switching versions only affects the
// sidebar's scope contents, not the page's overall stage/workflow position.
// Shell mirrors currentVersionId via postMessage so it can render the
// state bar's "outdated scope" messaging.
// Change-order history only exists once the original scope has been
// approved at least once — the versioning system covers CO1, CO2, etc.
// during construction. Pre-approval (projMode=review), there's nothing to
// look back on yet: the "historical artifacts" list is just the one scope
// submission, awaiting its first review.
const VERSIONS = PROJ_MODE === 'review'
  ? [{id:'v3', num:1, at:'Apr 30, 2026', budget:'$26,370'}]
  : [
      {id:'v3', num:3, at:'Apr 30, 2026', budget:'$26,370'},
      {id:'v2', num:2, at:'Apr 22, 2026', budget:'$25,130', tag:'Outdated', tagCls:'outdated'},
      {id:'v1', num:1, at:'Apr 12, 2026', budget:'$24,890', tag:'Original', tagCls:'archived'},
    ];
// Terminal state: append the final signed-off Closeout document to the
// front of the version list, and promote it to the "current" version.
// The Closeout doc is treated as a semantically-distinct kind so its
// label + eyebrow read as "Closeout" rather than "Change Order N".
if(PROJ_MODE === 'closeout-approved'){
  VERSIONS.unshift({id:'v4', num:4, at:'Jul 16, 2026', budget:'$26,370', kind:'closeout'});
}
let currentVersionId = (PROJ_MODE === 'closeout-approved') ? 'v4' : 'v3';
// v3's tag pill mirrors the current project stage. In the iframe we use
// PROJ_MODE + IS_DRAFT_STAGE (both are URL-param derived) as the source.
function v3StatusTag(){
  if(IS_DRAFT_STAGE)                                    return {tag:'In Draft',  tagCls:'archived'};
  if(PROJ_MODE === 'review')                            return {tag:'In Review', tagCls:'outdated'};
  if(PROJ_MODE === 'work' || PROJ_MODE === 'closeout')  return {tag:'Current',   tagCls:''};
  return {tag:'In Draft', tagCls:'archived'};
}
function versionTag(v){
  // Terminal closeout-approved state — every historical doc is finalised
  // and Approved. The tag colour reads as the "current" neutral so no
  // one document dims relative to the others.
  if(PROJ_MODE === 'closeout-approved') return {tag:'Approved', tagCls:''};
  if(v.id === 'v3') return v3StatusTag();
  return {tag:v.tag||'', tagCls:v.tagCls||''};
}
function versionMeta(v){
  if(v.id === 'v3'){
    if(PROJ_MODE === 'work' || PROJ_MODE === 'closeout' || PROJ_MODE === 'closeout-approved') return `Approved ${v.at}`;
    if(PROJ_MODE === 'review') return `Submitted ${v.at}`;
    return `Working copy · started ${v.at}`;
  }
  return `Approved ${v.at}`;
}
// Semantic version label: v1 is the base "Scope"; every version after is a
// numbered "Change Order" (so v2 → Change Order 1, v3 → Change Order 2).
// A version carrying kind:'closeout' is the terminal signed-off doc.
function versionLabel(v){
  if(v.kind === 'closeout') return 'Closeout';
  if(v.num <= 1) return 'Scope';
  return `Change Order ${v.num - 1}`;
}
const ROOMS = ['Kitchen','Living Room','Master Bath','Bathroom','Master Bed','Bedroom 2','Garage'];
// ── Gallery: photo data + view state ────────────────────────────────
// PHOTOS is a flat store — one record per photo with room / kind / task.
// All gallery views read filtered slices, so counts and layout stay live.
const PHOTO_PEOPLE = [
  {who:'J. Chen',    role:'Field Agent'},
  {who:'M. Alvarez', role:'Field Agent'},
  {who:'T. Okafor',  role:'Manager'},
  {who:'S. Patel',   role:'Ops'},
  {who:'R. Brooks',  role:'Field Agent'},
];
function photoMeta(seed){
  const per=PHOTO_PEOPLE[seed%PHOTO_PEOPLE.length];
  const source=(seed%3===0)?'Uploaded':'Captured';
  const d=new Date(2026,4,1); d.setDate(d.getDate()+((seed*7)%54));
  const mm=String(d.getMonth()+1).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0');
  const yy=String(d.getFullYear()).slice(2);
  return {who:per.who, role:per.role, source, date:`${mm}/${dd}/${yy}`};
}
let PHOTOS = [];
let _pid = 1;
// ── Walks (from the Compare prototype) ────────────────────────────
// Each photo belongs to a "walk" — a scheduled site visit that captured
// evidence. Users filter Pano/Gallery by walk to see how conditions
// evolved: Initial → Progress → Change order → Progress → Closeout.
/* Dates sit inside the project's own chronology rather than beside it. The
   scope opens Apr 2 (VER.orig.opened in js/a2/a2-data.js) and is approved
   Apr 12; Change Order 1 lands Apr 22 and Change Order 2 Apr 30. Each walk is
   placed against those boundaries so "the latest photo as of this date" is a
   real question with a changing answer:

     initial      Apr 2   the scan the scope was built from
     progress_1   Apr 14  first visit after the scope was approved
     change_order Apr 21  the visit that surfaced Change Order 1
     progress_2   Apr 27  between the two change orders
     close_out    May 18  after the change history ends — construction done

   These used to run Jan 8 – Mar 15, entirely before the scope existed, which
   made every date-based lookup return the same photo no matter where the
   playhead sat. Keep them ordered and inside the project's timeline. */
const WALKS = [
  {id:'initial',    label:'Initial walk',      short:'Initial',     date:'Apr 2, 2026',  conductor:'Sarah M.',   color:'#555555'},
  {id:'progress_1', label:'Progress walk 1',   short:'Progress 1',  date:'Apr 14, 2026', conductor:'Marcus W.',  color:'#567DA3'},
  {id:'change_order',label:'Change order walk',short:'Change order',date:'Apr 21, 2026', conductor:'Diana R.',   color:'#B3643E'},
  {id:'progress_2', label:'Progress walk 2',   short:'Progress 2',  date:'Apr 27, 2026', conductor:'Marcus W.',  color:'#5BAED4'},
  {id:'close_out',  label:'Closeout walk',     short:'Closeout',    date:'May 18, 2026', conductor:'Sarah M.',   color:'#60926C'},
];
// ── Room-color palette ────────────────────────────────────────────
// Each room gets a signature color that shows up as a 2px outline on
// its photos, so users can see which room a tile belongs to at a
// glance in the mixed strip. Muted, non-competitive hues.
const ROOM_COLORS = {
  'Kitchen':     '#B3643E',
  'Living Room': '#567DA3',
  'Master Bath': '#60926C',
  'Bathroom':    '#8B5DD4',
  'Master Bed':  '#C4783A',
  'Bedroom 2':   '#5BAED4',
  'Garage':      '#7a8c6e',
};
function roomColor(room){ return ROOM_COLORS[room] || '#888780'; }
function walkFor(id){ return WALKS.find(w => w.id === id) || WALKS[0]; }
// Round-robin walk assignment during seed. Real data would carry the walk
// id from the capture session; here we distribute so every walk shows up.
/* Where a seeded photo came from. Walk photos are captured on site by
   whoever ran that walk — WALKS carries the conductor — while every fourth
   is treated as an upload instead, a contractor or manager adding evidence
   between walks, so the strip shows both kinds. Real data would carry this
   per photo; the demo derives it so the tiles have something honest to show.

   Every name here is a person. A photo is taken or uploaded by someone with
   an account — the firm they work for is the task's contractor, which is a
   different field and shows separately. This list used to mix the two
   ("Apex Carpentry", "FloorWorks"), which read as a company holding a
   camera. Shane D. and R. Garcia are the contractor-side people the
   progress feed already uses. */
const PHOTO_UPLOADERS = ['Shane D.','Ada Novak','Or Weiss','R. Garcia'];
function _seedPhotoProvenance(walkId, n){
  const w = (typeof walkFor === 'function') ? walkFor(walkId) : null;
  return (n % 4 === 3)
    ? { source:'uploaded', by: PHOTO_UPLOADERS[Math.floor(n / 4) % PHOTO_UPLOADERS.length] }
    : { source:'captured', by: (w && w.conductor) || 'Field agent' };
}
/* Curbside: the property from the street. Belongs to the scope rather than
   any room, so it has its own kind and its own section at the top. */
function _seedCurbsidePhotos(){
  if(typeof PHOTOS === 'undefined') return;
  if(PHOTOS.some(p => p.kind === 'curbside')) return;
  const walk = (typeof WALKS !== 'undefined' && WALKS[0]) ? WALKS[0].id : null;
  let id = PHOTOS.reduce((n, p) => Math.max(n, p.id || 0), 0);
  for(let i = 0; i < 3; i++){
    PHOTOS.unshift({id: ++id, seed: 900 + i, room: 'Curbside', kind: 'curbside',
                    task: null, walk, source: 'captured',
                    by: ((typeof walkFor === 'function' && walkFor(walk)) || {}).conductor || 'Field agent'});
  }
}

function seedPhotos(){
  PHOTOS = []; _pid = 1;
  const gCounts=[6,3,4,2,3,2,2];
  const walkIds = WALKS.map(w => w.id);
  let walkIdx = 0;
  const pickWalk = () => walkIds[walkIdx++ % walkIds.length];
  // Everything after a task's first shot comes from a later visit.
  const laterWalks = walkIds.slice(1);
  let laterIdx = 0;
  const pickLaterWalk = () => laterWalks.length ? laterWalks[laterIdx++ % laterWalks.length] : walkIds[0];
  ROOMS.forEach((room,ri)=>{
    const base=ri*13, gn=gCounts[ri]||2;
    for(let i=0;i<gn;i++) PHOTOS.push({id:_pid++, seed:base+i, room, kind:'group', task:null, walk:pickWalk()});
    let s=ri*13+50;
    TASKS.filter(t=>t.room===room).forEach(t=>{
      for(let k=0;k<(t.photos||0);k++){
        // A task's FIRST shot is always the initial walk — that scan is what
        // the task was scoped from, so every scoped line has evidence dated
        // day one. Later shots come from the visits that followed. Without
        // this, round-robin left most lines with nothing dated before the
        // scope was even approved, and any "latest photo as of <date>" lookup
        // came up empty for them through the whole draft and review phase.
        const walk = (k === 0) ? walkIds[0] : pickLaterWalk();
        PHOTOS.push({id:_pid++, seed:s++, room, kind:'task', task:t.code, walk});
      }
    });
  });
  for(let i=0;i<9;i++) PHOTOS.push({id:_pid++, seed:900+i, room:'Project', kind:'unsorted', task:null, walk:pickWalk()});
  // One pass at the end rather than threading it through each push.
  PHOTOS.forEach((ph, n) => Object.assign(ph, _seedPhotoProvenance(ph.walk, n)));
  _seedCurbsidePhotos();
}
// Pano's currently-selected walk filter. 'all' shows every walk.
let selectedWalk = 'all';
function setSelectedWalk(w){ selectedWalk = w; if(typeof renderPano === 'function') renderPano(); }
function filterByWalk(photos){
  if(selectedWalk === 'all') return photos;
  return photos.filter(p => p.walk === selectedWalk);
}
function groupPhotos(room){ return PHOTOS.filter(p=>p.room===room && p.kind==='group'); }
function photosForTask(t){ return PHOTOS.filter(p=>p.kind==='task' && p.task===t.code); }
function unsortedPhotos(){ return PHOTOS.filter(p=>p.kind==='unsorted'); }
// View state for the gallery.
let mediaScope = 'all';         // 'all' or a room key when drilled in
let mediaTask = null;
let mediaCollapsed = new Set(); // section keys collapsed (e.g. 'ds:Kitchen', 'ds:unsorted')
const CONTRACTORS = ['Apex Carpentry','Stone Bros','FloorWorks','BrightElectric','ProPlumb'];
const OPTIONS = ['Replace','Install','Reface','Repair','Remove','Full repaint','Resident install'];

/* ── CONTRACTOR MODE: filter scope to just the tasks assigned to this contractor.
   For this demo, the viewer is Apex Carpentry. Notes are treated as external —
   requests and explanations from the manager and field agent to the contractor. */
/* labor | materials — only meaningful at the published stage, where it's
   the one thing distinguishing step 5 from step 6. */
const WORK_TRACK = new URLSearchParams(window.__KAI_QS || window.location.search).get('track') || '';
const IS_CONTRACTOR = new URLSearchParams(window.__KAI_QS || window.location.search).get('role') === 'contractor';
const MY_CONTRACTOR = 'Apex Carpentry';

const TASKS = [
  {id:1, code:'KIT-79B1', room:'Kitchen', name:'Cabinets', opt:'Replace : shaker, white', gc:'Apex Carpentry', product:'Diamond NOW Arcadia White Shaker', qty:'14 LF', rate:'$344', cost:'$4,820', photos:3, flags:[], mods:[], status:'in_review', desc:'Demo existing uppers and base cabinets. Install new shaker fronts, soft-close hardware, and toe-kick. Verify wall is plumb before hanging.', pcost:'$3,180', notes:2},
  {id:2, code:'KIT-F362', room:'Kitchen', name:'Countertops', opt:'Replace : quartz', gc:'Stone Bros', product:'(not selected)', qty:'42 SF', rate:'$74', cost:'$4,400', photos:2, flags:['missing'], mods:[], status:'pending', desc:'Template and fabricate quartz tops. Remove old laminate. Confirm sink cutout and overhang before fab.', pcost:'$2,200', notes:1, photoUrls:['kitchen_before.jpg','kitchen_after.jpg'], groupPhotoUrls:['kitchen_before.jpg','kitchen_after.jpg']},
  {id:3, code:'KIT-6D13', room:'Kitchen', name:'Backsplash tile installation including waterproof membrane and schluter edge profiles', opt:'Install : 3x6 handmade ceramic subway tile in matte white with dark grey epoxy grout, running bond pattern', gc:null, product:'Daltile Rittenhouse Modern Dimensions Arctic White 3x6 Glazed Ceramic Subway Wall Tile (Box of 48, Matte Finish)', qty:'32 SF', rate:'$26', cost:'$840', photos:1, flags:['unassigned'], mods:[], status:'pending', desc:'Install handmade subway tile backsplash from the top of the countertop to the underside of the upper cabinets across the full run of the north and east kitchen walls. Includes waterproof membrane behind the range, Schluter metal edge trim on all exposed edges, epoxy grout in dark grey, and color-matched silicone caulk at the counter-to-backsplash transition and all inside corners. Contractor to confirm tile layout and grout joint width with the homeowner before starting, and to dry-lay the first course to verify the pattern centers on the range hood.', pcost:'$520', notes:3},
  {id:4, code:'KIT-E6C4', room:'Kitchen', name:'Appliances', opt:'Replace : full suite', gc:'Apex Carpentry', product:'GE Profile Stainless Suite', qty:'1 suite', rate:'$3,950', cost:'$3,950', photos:4, flags:['oos'], mods:[], status:'in_progress', desc:'Remove and haul old appliances. Install full stainless suite. Confirm gas/electric rough-in matches range spec.', pcost:'$3,950', notes:0},
  {id:5, code:'LIV-6075', room:'Living Room', name:'Flooring', opt:'Replace : LVP', gc:'FloorWorks', product:'Shaw Paragon Mix Plus', qty:'320 SF', rate:'$8.6', cost:'$2,760', photos:2, flags:[], mods:['tenant'], status:'complete', desc:'Pull existing flooring, prep subfloor, install LVP with underlayment across living area.', pcost:'$1,920', notes:1},
  {id:6, code:'LIV-DA26', room:'Living Room', name:'Paint', opt:'Full repaint', gc:'FloorWorks', product:'SW Agreeable Gray 7029', qty:'1 room', rate:'$980', cost:'$980', photos:1, flags:[], mods:['tenant'], status:'in_progress', desc:'Patch, prime, and repaint all walls and ceiling. Two coats. Resident electing this color change; resident pays.', pcost:'$240', notes:0},
  {id:7, code:'LIV-53D7', room:'Living Room', name:'Ceiling fan', opt:'Resident install', gc:null, product:'Resident supplied', qty:'1 ea', rate:'$0', cost:'$0', photos:1, flags:[], mods:['tenant'], status:'not_started', desc:'Resident to supply and install ceiling fan. Confirm box is fan-rated.', pcost:'$0', notes:1},
  {id:8, code:'MBA-CD88', room:'Master Bath', name:'Double vanity replacement with integrated quartz top and undermount sinks', opt:'Replace : 48 inch furniture-style double vanity, soft-close drawers, brushed gold hardware (design pending)', gc:'Stone Bros', product:'(design pending : awaiting homeowner selection from the three shortlisted furniture-style vanity options)', qty:'1 ea', rate:'$1,900', cost:'$1,900', photos:2, flags:[], mods:['deferred'], status:'pending', desc:'Remove the existing single vanity and disconnect plumbing. Supply and install a new 48-inch furniture-style double vanity with a single-slab quartz top, two undermount porcelain sinks, and two widespread faucets. Includes new shutoff valves, supply lines, P-traps, and reconnection to existing drain. Final vanity model, finish, and hardware are pending homeowner selection; pricing shown is an allowance and will be trued up once the selection is locked. Confirm rough-in dimensions against the selected unit before ordering.', pcost:'$1,400', notes:4},
  {id:9, code:'MBA-4739', room:'Master Bath', name:'Shower wall and floor tile with waterproofing and linear drain', opt:'Replace : full demo to studs, redgard waterproofing, large-format porcelain wall tile with mosaic floor (design pending)', gc:null, product:'(design pending : large-format porcelain shower wall tile plus coordinating mosaic floor tile, selection in progress)', qty:'60 SF', rate:'$40', cost:'$2,400', photos:3, flags:['unassigned'], mods:['deferred'], status:'pending', desc:'Demolish the existing shower surround down to the studs and subfloor. Frame and slope the shower pan, install a linear drain, and apply a full liquid waterproofing membrane across the pan and walls to 6 inches above the showerhead. Set large-format porcelain wall tile and a coordinating mosaic floor tile per the pending design selection, including a recessed niche, bullnose or metal trim on all exposed edges, and color-matched grout and silicone. Contractor not yet assigned; tile selection still in progress with the homeowner. Confirm waterproofing inspection is scheduled before any tile is set.', pcost:'$1,600', notes:2},
  {id:10, code:'MBA-C0EA', room:'Master Bath', name:'Toilet', opt:'Replace', gc:'Stone Bros', product:'Kohler Cimarron', qty:'1 ea', rate:'$540', cost:'$540', photos:1, flags:[], mods:[], status:'complete', desc:'Remove and reset toilet with new wax ring and supply line.', pcost:'$420', notes:0},
  {id:11, code:'BTH-3A9B', room:'Bathroom', name:'Vanity', opt:'Reface', gc:'Apex Carpentry', product:'(not selected)', qty:'1 ea', rate:'$760', cost:'$760', photos:2, flags:['missing'], mods:[], status:'pending', desc:'Reface existing vanity cabinet, new door and drawer fronts. Product not yet selected.', pcost:'$300', notes:1},
  {id:12, code:'BTH-B44C', room:'Bathroom', name:'Flooring', opt:'Replace : tile', gc:'FloorWorks', product:'Daltile Concrete Look 12x24', qty:'48 SF', rate:'$24.6', cost:'$1,180', photos:3, flags:[], mods:[], status:'not_started', desc:'Install porcelain tile flooring with backer board and grout.', pcost:'$760', notes:0},
  {id:13, code:'MBD-2DFD', room:'Master Bed', name:'Flooring', opt:'Replace : carpet', gc:'FloorWorks', product:'Mohawk SmartStrand Silk', qty:'1 room', rate:'$1,540', cost:'$1,540', photos:2, flags:[], mods:[], status:'in_progress', desc:'Remove old carpet, install new carpet and pad in master bedroom.', pcost:'$1,100', notes:2},
  {id:14, code:'MBD-A7AE', room:'Master Bed', name:'Closet', opt:'Add shelving', gc:null, product:'ClosetMaid ShelfTrack', qty:'1 kit', rate:'$460', cost:'$460', photos:1, flags:['unassigned'], mods:[], status:'not_started', desc:'Add wire shelving system to master closet. Contractor not yet assigned.', pcost:'$340', notes:1},
  {id:15, code:'BD2-215F', room:'Bedroom 2', name:'Paint', opt:'Full repaint', gc:'FloorWorks', product:'SW Pure White 7005', qty:'1 room', rate:'$620', cost:'$620', photos:2, flags:[], mods:['tenant'], status:'complete', desc:'Repaint bedroom walls and trim, two coats. Resident electing this color; resident pays.', pcost:'$180', notes:0},
  {id:16, code:'GAR-9B10', room:'Garage', name:'Door opener', opt:'Replace', gc:'Stone Bros', product:'Chamberlain B970 Smart', qty:'1 ea', rate:'$520', cost:'$520', photos:1, flags:[], mods:[], status:'in_review', desc:'Replace garage door opener with smart unit. Reuse existing rail if compatible.', pcost:'$420', notes:1},
];

// Migration + seeding for the multi-option model. Each task carries a
// `t.options` array — one option per sub-item with its own qty, labor,
// and total. Existing single-option tasks migrate to a one-entry array
// so nothing downstream breaks; the primary option (index 0) mirrors
// t.opt / t.product / t.qty / t.rate / t.cost for snapshot compatibility.
(function seedTaskOptions(){
  const genOptId = () => 'opt_' + Math.random().toString(36).slice(2,7);
  // Legacy extras: absorbed into the primary option's products list after
  // migration so nothing visible in the option-level product view goes away.
  const _legacyExtras = {
    1:  [{product:'ClosetMaid Storage Add-on', pcost:'$220', qty:'2 ea', rate:'$0'}],
    8:  [{product:'Delta Widespread Faucet · brushed gold', pcost:'$310', qty:'2 ea', rate:'$85'}],
    11: [{product:'Moen 8-inch Bath Handle · matte black', pcost:'$140', qty:'1 ea', rate:'$60'}],
  };
  TASKS.forEach(t => {
    if(t.options) return;
    // Split the free-text qty ("14 LF") into number + unit so the primary
    // option can carry the numeric part in its own field with a locked unit.
    const qParts = (typeof parseQty === 'function') ? parseQty(t.qty) : {num:t.qty, unit:''};
    t.options = [{
      id: genOptId(),
      name: t.opt || t.name || 'Option 1',
      description: (t.opt || t.name || '').toUpperCase(),
      qty: qParts.num || t.qty || '',
      qtyUnit: qParts.unit || 'ea',
      rate: t.rate || '',
      cost: t.cost || '',
      products: t.product ? [{product:t.product, pcost:t.pcost||''}] : [],
    }];
    // Absorb legacy extras as siblings of the primary product inside the
    // migrated primary option — keeps the demo data richness intact.
    const extras = _legacyExtras[t.id];
    if(Array.isArray(extras) && extras.length){
      t.options[0].products.push(...extras.map(p => ({product:p.product||'', pcost:p.pcost||'', qty:p.qty||'', rate:p.rate||''})));
      // Also keep the old t.extraProducts alive in case any other code path
      // still reads it (taskProducts/extras UI is orphaned but defined).
      t.extraProducts = extras;
    }
  });
  // Sprinkle extra options across the seed data so the multi-option UI
  // has visible variety without every task looking the same. Users can
  // no longer add/remove options at runtime — these are demo-only.
  const _extraOptionsById = {
    1:  [ // Cabinets
      {name:'Install pull-out drawer inserts',   description:'INSTALL PULL-OUT DRAWER INSERTS',   qty:'6',  qtyUnit:'ea', rate:'$45',  cost:'$270'},
      {name:'Add soft-close hinges upgrade',     description:'ADD SOFT-CLOSE HINGES UPGRADE',      qty:'22', qtyUnit:'ea', rate:'$8',   cost:'$176'},
    ],
    2:  [ // Countertops
      {name:'Install undermount sink cutout',    description:'INSTALL UNDERMOUNT SINK CUTOUT',     qty:'1',  qtyUnit:'ea', rate:'$180', cost:'$180'},
    ],
    4:  [ // Appliances
      {name:'Install range hood vent to exterior', description:'INSTALL RANGE HOOD VENT TO EXTERIOR', qty:'1', qtyUnit:'ea', rate:'$420', cost:'$420'},
      {name:'Haul away old appliances',           description:'HAUL AWAY OLD APPLIANCES',            qty:'1', qtyUnit:'lot', rate:'$150', cost:'$150'},
    ],
    9:  [ // Master Bath Shower
      {name:'Install frameless glass shower door', description:'INSTALL FRAMELESS GLASS SHOWER DOOR', qty:'1', qtyUnit:'ea', rate:'$680', cost:'$680'},
    ],
    12: [ // Bathroom Flooring
      {name:'Install matching baseboard trim',    description:'INSTALL MATCHING BASEBOARD TRIM',    qty:'24', qtyUnit:'LF', rate:'$8', cost:'$192'},
    ],
    14: [ // Master Bed Closet
      {name:'Install hanging rod + double-hang bracket', description:'INSTALL HANGING ROD + DOUBLE-HANG BRACKET', qty:'2', qtyUnit:'ea', rate:'$60', cost:'$120'},
    ],
    16: [ // Garage door opener
      {name:'Install smart Wi-Fi hub + app pairing', description:'INSTALL SMART WI-FI HUB + APP PAIRING', qty:'1', qtyUnit:'ea', rate:'$120', cost:'$120'},
    ],
  };
  Object.keys(_extraOptionsById).forEach(taskId => {
    const t = TASKS.find(x => x.id === parseInt(taskId, 10));
    if(!t || !t.options) return;
    _extraOptionsById[taskId].forEach(opt => {
      t.options.push({
        id: genOptId(),
        name: opt.name,
        description: opt.description,
        qty: opt.qty || '',
        qtyUnit: opt.qtyUnit || 'ea',
        rate: opt.rate || '',
        cost: opt.cost || '',
        products: [],
      });
    });
  });
  // Seed a Powerwash task with two distinct options for the demo. Adds
  // to the Garage room (already in ROOMS) so it slots in cleanly.
  if(!TASKS.some(t => /powerwash/i.test(t.name))){
    const newId = Math.max(0, ...TASKS.map(t => t.id)) + 1;
    TASKS.push({
      id:newId, code:'GAR-PW01', room:'Garage', name:'Powerwash',
      opt:'Multiple options', gc:null,
      product:'Karcher K5 Premium', qty:'4 ea', rate:'$150', cost:'$800',
      photos:2, flags:[], mods:[], status:'not_started',
      desc:'Full exterior powerwash across flatwork and vertical surfaces.',
      pcost:'$180', notes:0,
      options:[
        {id:genOptId(), name:'Powerwash Flatwork',
         description:'POWERWASH FLATWORK',
         qty:'4', qtyUnit:'ea', rate:'$150', cost:'$600',
         products:[{product:'Karcher K5 Premium', pcost:'$180'}]},
        {id:genOptId(), name:'Powerwash House',
         description:'POWERWASH HOUSE (SIDING, TRIM, PORCHES, DECK, WINDOWS, DOORS, MAILBOX, GARAGE FLOOR, BACKSIDE OF GARAGE DOOR)',
         qty:'1', qtyUnit:'ea', rate:'$200', cost:'$200',
         products:[{product:'Karcher K5 Premium', pcost:'$180'}]},
      ],
    });
  }
  // Seed an "Interior Doors" task in the Kitchen group with three
  // options — slab / bi-fold / prehung — each option carrying multiple
  // Home Depot SKUs pulled from the reference. Illustrates a task where
  // the specific SKU + qty gets picked at walkthrough time (all qtys
  // start at 0). Contractor defaults to Apex Carpentry to match the
  // other Kitchen tasks.
  if(!TASKS.some(t => /interior doors/i.test(t.name))){
    const newId = Math.max(0, ...TASKS.map(t => t.id)) + 1;
    TASKS.push({
      id:newId, code:'KIT-DR07', room:'Kitchen', name:'Interior Doors',
      opt:'Install : slab, bi-fold, or prehung (selection at walkthrough)',
      gc:'Apex Carpentry',
      product:'(selection at walkthrough)',
      qty:'0 ea', rate:'$0', cost:'$0',
      photos:2, flags:[], mods:[], status:'not_started',
      desc:'Install or replace interior doors, including slab, bi-fold, and prehung units. Specific door configuration, size, and style will be selected at the time of the walkthrough. Task includes associated installation labor.',
      pcost:'$0', notes:0,
      options:[
        {id:genOptId(), name:'Install standard interior door slab',
         description:'INSTALL STANDARD INTERIOR DOOR SLAB',
         qty:'0', qtyUnit:'ea', rate:'$0', cost:'$0',
         products:[
           {product:'30 in. x 80 in. 6 Panel Colonist Primed Textured Molded Composite Interior Door Slab · SKU 198225', pcost:'$81.88'},
           {product:'36 in. x 80 in. 6 Panel Colonist Primed Textured Molded Composite MDF Interior Door Slab · SKU 200190', pcost:'$80.00'},
         ]},
        {id:genOptId(), name:'Install interior bi-fold door',
         description:'INSTALL INTERIOR BI-FOLD DOOR',
         qty:'0', qtyUnit:'ea', rate:'$0', cost:'$0',
         products:[
           {product:'30 in. x 80 in. 6 Panel Colonial Primed Textured Molded Composite Closet Bi-Fold Door · SKU 311579', pcost:'$155.88'},
           {product:'36 in. x 80 in. 6 Panel Colonist Primed Textured Molded Composite Hollow Core Closet Bi-Fold Door · SKU 311601', pcost:'$180.29'},
         ]},
        {id:genOptId(), name:'Install prehung interior door',
         description:'INSTALL PREHUNG INTERIOR DOOR',
         qty:'0', qtyUnit:'ea', rate:'$0', cost:'$0',
         products:[
           {product:'Missing Home Depot Product', pcost:''},
           {product:'30 in. x 80 in. 6 Panel Colonist Primed Right-Hand Smooth Solid Core Molded Composite MDF Single Prehung Interior Door', pcost:'$212.00'},
         ]},
      ],
    });
  }
})();

// Normalize every option's `products` into the {id, product, qty, parts,
// labor} shape the Editor tab's per-product rows edit, and make an
// option's cost the sum of its products' line totals (qty × (parts +
// labor)) rather than a single option-level qty/rate. Existing single-
// product options decompose cleanly: parts-per-unit = pcost / qty (so
// parts-per-unit × qty recovers the original lump product cost exactly),
// labor-per-unit = the option's old rate (already per-unit) — so the
// option's total is unchanged. Options with no product yet (pure-labor
// line items) get a synthetic "Labor" product carrying the old qty/rate,
// so nothing is lost — every option ends up with at least one product row.
(function seedOptionProducts(){
  const genProdId = () => 'prod_' + Math.random().toString(36).slice(2,7);
  const numFrom = (str) => parseFloat(String(str||'0').replace(/[^0-9.-]/g,'')) || 0;
  TASKS.forEach(t => {
    (t.options||[]).forEach(opt => {
      const qtyNum = numFrom(opt.qty);
      const rateNum = numFrom(opt.rate);
      const products = (Array.isArray(opt.products) ? opt.products : []).map(p => {
        const pcostNum = numFrom(p.pcost);
        const partsPerUnit = (qtyNum > 0) ? (pcostNum / qtyNum) : pcostNum;
        return {
          id: genProdId(),
          product: p.product || '',
          qty: p.qty || opt.qty || '1',
          parts: partsPerUnit ? _fmtDollars(partsPerUnit) : '',
          labor: p.rate || '',
        };
      });
      // Only the FIRST migrated product inherits the option's per-unit
      // labor rate (it already represents the option's own line item);
      // additional products (legacy alternates/extras) stay parts-only
      // unless they already carried their own rate above.
      if(products[0] && !products[0].labor && rateNum) products[0].labor = opt.rate;
      const laborCaptured = products.some(p => numFrom(p.labor) > 0);
      if(!laborCaptured && rateNum > 0){
        products.push({ id: genProdId(), product: 'Labor', qty: opt.qty || '1', parts: '', labor: opt.rate || '' });
      }
      opt.products = products;
      const total = products.reduce((sum, p) => {
        const q = numFrom(p.qty) || 0;
        return sum + q * (numFrom(p.parts) + numFrom(p.labor));
      }, 0);
      opt.cost = _fmtDollars(total);
    });
    if(t.options && t.options.length){
      t.cost = _fmtDollars(t.options.reduce((sum,o) => sum + numFrom(o.cost), 0));
    }
  });
})();

// Wire each task's primary option to its real catalog candidates (the same
// pool the old standalone "Product selection" section used to browse) so
// the Options section is the ONE place to pick a product — no separate
// picker below. The first catalog item inherits whatever qty/labor the
// prior pass computed (reads as "already selected"); every other
// candidate starts at qty 0 — that's how you select/deselect a product,
// there's no add/remove affordance. Skips tasks whose primary option was
// already hand-authored with real alternatives (Interior Doors, Powerwash)
// so this doesn't clobber curated demo data.
(function seedOptionCatalogProducts(){
  const genProdId = () => 'prod_' + Math.random().toString(36).slice(2,7);
  const numFrom = (str) => parseFloat(String(str||'0').replace(/[^0-9.-]/g,'')) || 0;
  TASKS.forEach(t => {
    if(/interior doors/i.test(t.name) || /powerwash/i.test(t.name)) return;
    const primary = t.options && t.options[0]; if(!primary) return;
    const pool = (typeof productPool === 'function') ? productPool(t).filter(p => p.tier === 'team') : [];
    if(!pool.length) return;
    const prevFirst = (primary.products && primary.products[0]) || {};
    primary.products = pool.map((p, i) => ({
      id: genProdId(),
      sku: p.sku,
      brand: p.brand,
      product: p.name,
      qty: i === 0 ? (prevFirst.qty || '1') : '0',
      parts: _fmtDollars(p.price),
      labor: i === 0 ? (prevFirst.labor || '') : '',
    }));
    const total = primary.products.reduce((sum, p) => sum + numFrom(p.qty) * (numFrom(p.parts) + numFrom(p.labor)), 0);
    primary.cost = _fmtDollars(total);
    t.cost = _fmtDollars(t.options.reduce((sum,o) => sum + numFrom(o.cost), 0));
  });
})();

/* ── Scope-total override, pushed from the shell via postMessage. Used so the
   sidebar rollup matches the budget shown next to whichever version the user
   picked in the shell's version dropdown (v1 / v2 / v3). */
let __KAI_SCOPE_TOTAL_OVERRIDE = null;
let __KAI_VIEWING_ARCHIVED = false;
window.addEventListener('message', e => {
  if(e && e.data && e.data.type === 'kai:scope-total'){
    __KAI_SCOPE_TOTAL_OVERRIDE = e.data.total || null;
    __KAI_VIEWING_ARCHIVED = !!e.data.archived;
    // Toggle a body class so styles that key off the archived state (like the
    // muted budget total in the sidebar rollup) can react.
    if(document.body) document.body.classList.toggle('viewing-archived', __KAI_VIEWING_ARCHIVED);
    if(typeof renderSidebar === 'function') renderSidebar();
  }
});

/* ── DRAFT MODE (Edit / Submitted stages) ────────────────────────────────
   Scope is still being built. Every task returns to an "in-progress" state:
   no contractor, no product, no cost. The sidebar shows a lot of "…" so the
   user can see which fields are still open before submitting for review. */
const IS_DRAFT_STAGE = new URLSearchParams(window.__KAI_QS || window.location.search).get('stage') === 'draft';
// Empty-scope seed — Step 1 · Empty draft. When the shell tells us the scope
// should start empty, drop every seeded task so the sidebar + each tab
// render their empty states.
const IS_EMPTY_SEED = new URLSearchParams(window.__KAI_QS || window.location.search).get('seed') === 'empty';
if(IS_EMPTY_SEED){
  TASKS.length = 0;
}
if(IS_DRAFT_STAGE){
  // Empty draft still needs the draft-stage body class + auto edit-mode
  // (editing IS the mode in draft), but skips the task-mutation block since
  // there are no tasks to reset.
  document.addEventListener('DOMContentLoaded', ()=>{
    document.body.classList.add('draft-stage');
    const toggle = document.getElementById('sbEditToggle');
    if(toggle) toggle.hidden = true;
    if(typeof enterEditMode === 'function'){ enterEditMode(true); }
    else { document.body.classList.add('scope-edit-mode'); }
  });
}
if(IS_DRAFT_STAGE && !IS_EMPTY_SEED){
  // Populated draft: keep tasks but strip contractor / cost / status so the
  // scope reads like an in-progress build.
  const draftKeepCount = Math.min(TASKS.length, 10);
  TASKS.length = draftKeepCount;
  // Split each room three ways so the completeness column has something to
  // say. Stripping every task made every row identical.
  const _draftBuckets = {};
  TASKS.forEach(t => { (_draftBuckets[t.room] = _draftBuckets[t.room] || []).push(t); });
  const _draftNewCodes = new Set();
  Object.keys(_draftBuckets).forEach(room => {
    const list = _draftBuckets[room];
    const third = Math.max(1, Math.round(list.length / 3));
    list.forEach((t, i) => {
      if(i < third) return;              // ready: left as the seed data has it
      // Everything past the first third is unspecified work.
      t.gc = null;
      t.product = '(not selected)';
      t.cost = '$0';
      t.pcost = '$0';
      t.rate = '$0';
      t.qty = '';        // no product chosen yet, so no quantity to state
      t.status = 'not_started';
      t.flags = ['unassigned','missing'];
      t.mods = [];
      t.notes = 0;
      // The last third is brand new: nothing has been captured against it.
      // seedPhotos builds task photos from t.photos, so zeroing it here is
      // what actually keeps them empty — and it works whichever order the
      // seeding runs in, which the PHOTOS filter below did not.
      if(i >= third * 2){
        _draftNewCodes.add(t.code);
        t.photos = 0;
      }
    });
  });
  // If the photos were already seeded before this block ran, clear the ones
  // belonging to those tasks too — t.photos only governs the next seeding.
  if(typeof PHOTOS !== 'undefined' && PHOTOS && PHOTOS.length){
    for(let i = PHOTOS.length - 1; i >= 0; i--){
      if(PHOTOS[i].kind === 'task' && _draftNewCodes.has(PHOTOS[i].task)) PHOTOS.splice(i, 1);
    }
  }
  // Options are candidates the user hasn't committed to yet. The split
  // runs within each room rather than across the flat task list, so
  // every group shows both states — otherwise the added ones all land
  // in the first room and the rest of the scope looks uniformly empty.
  const _byRoom = {};
  TASKS.forEach(t => { (_byRoom[t.room] = _byRoom[t.room] || []).push(t); });
  Object.keys(_byRoom).forEach(room => {
    const list = _byRoom[room];
    const keep = Math.ceil(list.length / 2);
    list.forEach((t, i) => {
      (t.options || []).forEach((o, oi) => {
        const added = (i < keep && oi === 0);
        o.added = added;
        if(!added){
          // Nobody has worked this option yet. Quantity is what marks a
          // product as chosen, so its products start at 0 — a stated zero
          // rather than an empty field, so the row reads as awaiting a
          // number instead of looking unrendered. productIsPicked treats 0
          // as unchosen, so the shading still waits. Cost is set directly
          // rather than via recomputeOptionFromProducts, which would roll
          // up into t.cost and undo the $0 the draft seed just forced.
          (o.products || []).forEach(pr => { pr.qty = '0'; });
          o.cost = '$0';
        }
      });
    });
  });
} else if(!IS_DRAFT_STAGE){
  // Approved-scope mode: any task without a contractor (nulls in the demo data) gets
  // assigned so the scope reads as a fully-baked approved plan. Unassigned rows only
  // appear during the draft/build phase (Step 1 · Empty draft / Populated draft).
  const _fallbackGcByTrade = t => {
    const n = (t.name||'').toLowerCase();
    if(/cabinet|counter|backsplash|appliance|closet|shelving/.test(n)) return 'Apex Carpentry';
    if(/vanity|toilet|shower|sink|plumb/.test(n)) return 'Stone Bros';
    if(/floor|paint/.test(n)) return 'FloorWorks';
    if(/light|fan|door opener|electric/.test(n)) return 'BrightElectric';
    return 'Apex Carpentry';
  };
  TASKS.forEach(t => {
    if(!t.gc){
      t.gc = _fallbackGcByTrade(t);
      t.flags = (t.flags||[]).filter(a => a !== 'unassigned');
    }
  });
  // Same idea as the contractor fallback above: a task that reached
  // construction has had its product chosen, so anything still reading
  // "(not selected)" or "(design pending)" gets a plausible one. Without it
  // the row shows a quantity and a price against no product at all, and the
  // group total counts money nobody can trace to a line item.
  const _fallbackProductByTrade = t => {
    const n = (t.name || '').toLowerCase();
    if(/countertop/.test(n))            return 'Silestone Ethereal Haze';
    if(/vanity/.test(n))                return 'Signature Hardware Quen 48\" vanity';
    if(/shower|tile|backsplash/.test(n))return 'Daltile Restore Bright White';
    if(/floor/.test(n))                 return 'Shaw Paragon Mix Plus';
    if(/paint/.test(n))                 return 'SW Agreeable Gray 7029';
    if(/cabinet/.test(n))               return 'Diamond NOW Arcadia White Shaker';
    if(/toilet/.test(n))                return 'Kohler Cimarron';
    if(/light|fan/.test(n))             return 'Hunter Dempsey 44\"';
    return 'Contractor supplied';
  };
  TASKS.forEach(t => {
    if(!t.product || /not selected|design pending/i.test(t.product)){
      t.product = _fallbackProductByTrade(t);
      t.flags = (t.flags || []).filter(a => a !== 'missing');
    }
  });
}
/* Closeout is the sign-off on finished work, so every task arrives
   complete. Nothing seeded statuses per stage before — they came
   straight from the TASKS literal, which left step 7 showing a mix of
   in-progress and not-started work under a Closeout heading.
   Outstanding rework and missing-detail flags are cleared with it: a
   task can't be both complete and awaiting a fix, and either one would
   outrank 'complete' in the status ladder. */
if(PROJ_MODE === 'closeout' || PROJ_MODE === 'closeout-approved'){
  TASKS.forEach(t => {
    t.status = 'complete';
    t.editRequested = false;
    // Closeout is the sign-off on finished work: nothing can still be
    // flagged, or it wouldn't be finished.
    t.flags = [];
  });
}
/* Labour track — the scope has just gone live. Every task was approved to get
   here and none of it has been touched, so nothing is in progress, nothing
   needs rework, and nothing is flagged. Step 6 keeps the mixed statuses and
   carries the story forward into work actually happening. */
if(PROJ_MODE === 'work' && WORK_TRACK === 'labor'){
  TASKS.forEach(t => {
    t.status = 'not_started';
    t.editRequested = false;
    t.flags = [];
  });
}
if(IS_CONTRACTOR){
  // Shop-mode focus only: swap the topbar identity + reframe notes as external
  // requests. The left panel still shows the full scope like the admin view.
  document.addEventListener('DOMContentLoaded', ()=>{
    document.body.classList.add('contractor-view');
    const chip = document.getElementById('orgChip');
    if(chip) chip.innerHTML = '<span class="dot"></span> ' + MY_CONTRACTOR;
    const av = document.getElementById('orgAvatar');
    if(av) av.textContent = 'AC';
  });
}

/* ── CHANGE-ORDER MODE (Construction step) ─────────────────────────────
   Scope is published. The left panel is read-only for non-admin roles;
   any proposed edit is captured as a change-order line and batched into a
   pending change order that the admin has to approve. */
const IS_CHANGE_ORDER = new URLSearchParams(window.__KAI_QS || window.location.search).get('context') === 'construction';
// "Progress" stages — scope is approved and work / closeout is happening. In
// these modes the sidebar surfaces "+ Update" affordances (mirroring the "+"
// pattern the draft stage uses for task creation) so users can attach a
// photo update to a group or a specific task as construction progresses.
const IS_PROGRESS_STAGE = (PROJ_MODE === 'work' || PROJ_MODE === 'closeout');
// When embedded in the shell, the shell now hosts the Kai identity + action
// toolbar. `?chromeless=1` tells us to suppress our own copy so the two don't
// stack. Class + inline CSS both applied so the rule wins regardless of any
// other .toolbar overrides in effect.
const IS_CHROMELESS = new URLSearchParams(window.__KAI_QS || window.location.search).get('chromeless') === '1';

/* ── Scope-level view gate ───────────────────────────────────────────
   Which stepper node the shell is showing. The whole-scope overview is
   available from Submit onward; at `edit` the sidebar IS the authoring
   surface and a read-only scope read-out would only compete with it.
   Opened standalone (no stageId in the URL) the overview stays on. */
const STAGE_ID = new URLSearchParams(window.__KAI_QS || window.location.search).get('stageId') || '';
// Was off at draft, on the grounds that a read-only read-out would compete
// with the authoring surface. The page carries rollups, notes, activity and
// the gallery now, so it isn't a read-out and it's on everywhere.
const SCOPE_VIEW_ENABLED = true;
let pendingChanges = [];  // {type:'contractor'|'delete'|'edit', taskId, taskCode, before, after, when}
document.addEventListener('DOMContentLoaded', ()=>{
  if(IS_CHANGE_ORDER) document.body.classList.add('co-mode');
  if(IS_CHROMELESS){
    document.body.classList.add('chromeless');
    const tb = document.querySelector('.toolbar');
    if(tb) tb.style.display = 'none';
  }
  // Project-mode class on the body so CSS can differentiate task/group
  // affordances per stage (e.g. hide the task-approve checkbox in draft/work).
  document.body.classList.add('proj-mode-' + PROJ_MODE);
  // Seed the flat PHOTOS store used by the gallery (needs TASKS to exist).
  if(typeof seedPhotos === 'function') seedPhotos();
  // Initial paint of the sidebar state bar (mode + copy + primary CTA).
  if(typeof renderStateBar === 'function') renderStateBar();
});

function coAddChange(change){
  // Merge with existing change for the same task+field, else push new
  const idx = pendingChanges.findIndex(c => c.taskId===change.taskId && c.type===change.type);
  if(idx>=0){ pendingChanges[idx] = {...pendingChanges[idx], ...change, when:new Date()}; }
  else { pendingChanges.push({...change, when:new Date()}); }
  renderChangeOrderBar();
  // The group rows and the task card carry the state too, so the whole
  // surface has to re-render — the sidebar alone left them stale.
  if(typeof renderAll === 'function') renderAll(); else renderSidebar();
}
function coRemoveChange(taskId, type){
  pendingChanges = pendingChanges.filter(c => !(c.taskId===taskId && c.type===type));
  renderChangeOrderBar();
  renderSidebar();
}
function coHasChange(taskId){
  return pendingChanges.some(c => c.taskId===taskId);
}
function coSubmit(){
  // Every task carrying a draft goes over, not just the ones with a
  // staged entry — a field edited in place never reaches pendingChanges.
  const drafts = _coDraftTasks();
  const n = drafts.length || pendingChanges.length;
  if(!n){ toast('No pending changes to submit'); return; }
  drafts.forEach(t => __CO_SUBMITTED.add(t.id));
  toast(`Change order submitted · ${n} change${n===1?'':'s'} sent to admin for review`);
  pendingChanges = [];
  renderChangeOrderBar();
  if(typeof renderAll === 'function') renderAll(); else renderSidebar();
}
function coClear(){
  if(!pendingChanges.length) return;
  pendingChanges = [];
  toast('Change order draft discarded');
  renderChangeOrderBar();
  renderSidebar();
}
function renderChangeOrderBar(){
  // Counts tasks, not staged entries: editing a rate in place changes
  // the task without touching pendingChanges, and the bar is the only
  // thing telling you there's something to submit.
  const n = (typeof _coDraftTasks === 'function') ? _coDraftTasks().length : pendingChanges.length;
  const bar = document.getElementById('coBar');
  if(!bar) return;
  if(!n){ bar.classList.add('hidden'); bar.innerHTML=''; return; }
  bar.classList.remove('hidden');
  bar.innerHTML = `
    <div class="co-bar-info">
      <span class="co-bar-tag">Change order draft</span>
      <span class="co-bar-n">${n} change${n===1?'':'s'}</span>
    </div>
    <div class="co-bar-acts">
      <button class="co-bar-btn" onclick="coClear()">Discard</button>
      <button class="co-bar-btn primary" onclick="coSubmit()">Submit for review</button>
    </div>`;
}

