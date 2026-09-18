/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · SCOPE CHANGE HISTORY
   Ported from ProjectReview_ChangeHistory_1.html. A read-only track-changes
   view of the scope: the paper document carries the line items, every change
   gets a margin card wired to the line it touched, and a scrubber at the
   bottom moves a playhead through the version history — scrolling forward
   accumulates redlines instead of replacing them.

   Proportions follow the Artifact tab (ProjectReview_ScopePanel's
   .art-page-stacked) rather than the standalone page: the version cards in
   the page gutters, the paper claiming the rest of the width beneath them,
   and one annotation gutter on the right. The standalone page centered a
   fixed-width paper between two wide margins, which reads unbalanced in a
   panel that is already narrower than a full page.

   The other difference: the page scrolled the window and docked the scrubber
   with position:fixed. Here .a2-root fills #workBody, .a2-scroll holds the
   version cards + paper, and the scrubber is pinned to the bottom.

   Data is self-contained on purpose: this is a fixed prototype snapshot of
   the change history, not a projection of the live TASKS model.
   ════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · DATA · taxonomy, version ladder, and the scope snapshot
   The fixed prototype record: what each change type is, what each version
   is, and the line items with their history. Edit demo content here and
   nothing else needs to know. Also holds the four local formatters — note
   a2Esc is deliberately stricter than the panel's global esc(), which only
   escapes quotes, so the two must not be confused.

   Part of the Artifact 2 tab, split across js/a2/*.js. These are plain
   top-level declarations sharing one script scope, same as the rest of
   the panel — no IIFE, so any module can call any other.
   ════════════════════════════════════════════════════════════════════ */
/* ── change-type taxonomy ── */
const CT = {
  value:      {label:'Value',       color:'var(--ct-value)'},
  contractor: {label:'Contractor',  color:'var(--ct-contractor)'},
  modifier:   {label:'Modifier',    color:'var(--ct-modifier)'},
  product:    {label:'Product',     color:'var(--ct-product)'},
  added:      {label:'Line added',  color:'var(--ct-added)'},
  removed:    {label:'Line removed',color:'var(--ct-removed)'},
};

/* Which version each change belongs to. Drives the change dates and labels,
   and doubles as the model for the version cards above the paper — the same
   .hist-card the Artifact tab uses for its audit trail, so the two surfaces
   present a scope's history identically. */
const VER = {
  // `opened` is where the timeline starts — the first walk, ten days before
  // the scope was approved. Only the first version needs it.
  orig:{label:'Scope',          date:'Apr 12, 2026', time:'2:10pm',  rank:0, opened:'Apr 2, 2026', openedTime:'8:20am', sow:'SOW-00000E7B', tag:'Original', tagCls:'archived', stateCls:''},
  co1: {label:'Change Order 1', date:'Apr 22, 2026', time:'11:40am', rank:1, opened:'Apr 12, 2026', openedTime:'3:35pm', sow:'SOW-00000E7C', tag:'Outdated', tagCls:'outdated', stateCls:' is-outdated'},
  co2: {label:'Change Order 2', date:'Apr 30, 2026', time:'4:20pm',  rank:2, opened:'Apr 27, 2026', openedTime:'1:05pm', sow:'SOW-00000E7D', tag:'Current',  tagCls:'',         stateCls:' is-current'},
};
const VER_ORDER = ['orig','co1','co2'];

/* ── sign-offs ──
   Who marked a version as reviewed, and when. Kept apart from the version
   ladder above because a review is a person's act rather than the document's:
   several people sign the same version, and they sign in the days running up
   to approval, not on the approval date itself. The scrubber draws each one as
   a check in its own lane under the rail, and the dates are what place it —
   these fall inside the Apr 2 → Apr 30 span the bar is drawn on. */
/* The roster a scope goes out to for sign-off. REVIEWS below records only the
   people who actually signed, so anyone here without an entry there has not
   yet — which is the half the hand-off modal needs in order to say who is
   still outstanding. */
const REVIEWERS = [
  {who:'T. Okafor',  first:'Tara',   role:'Job manager'},
  {who:'S. Patel',   first:'Sana',   role:'Ops'},
  {who:'D. Reyes',   first:'Diego',  role:'Designer'},
  {who:'M. Alvarez', first:'Marisol',role:'Field Agent'},
];
/* Times are part of the record: a scope changes hands more than once a day,
   and without them the Activity could not say in what order — or how long
   anyone actually held it. */
const REVIEWS = [
  {ver:'orig', who:'S. Patel',  role:'Ops',          date:'Apr 10, 2026', time:'9:05am'},
  {ver:'orig', who:'T. Okafor', role:'Job manager',  date:'Apr 11, 2026', time:'4:40pm'},
  {ver:'co1',  who:'D. Reyes',  role:'Designer',     date:'Apr 20, 2026', time:'11:12am'},
  {ver:'co1',  who:'T. Okafor', role:'Job manager',  date:'Apr 21, 2026', time:'2:55pm'},
  {ver:'co2',  who:'S. Patel',  role:'Ops',          date:'Apr 28, 2026', time:'10:30am'},
  {ver:'co2',  who:'T. Okafor', role:'Job manager',  date:'Apr 29, 2026', time:'5:15pm'},
];
// `budget` is stamped onto each version by stampVersionBudgets() — it is the
// sum of the lines that exist at that point, not a figure kept by hand.

/* ── SCOPE (current / Change Order 2 state), grouped by room.
   `changes[]` on each task holds its history from the Original scope.

   A scope grows, and it grows fastest before it is ever approved. The Scope
   phase IS the scoping: an agent walks the property over days and the
   document fills up behind them. By the time change orders start, the
   argument is over details, not over what exists. So most changes here are
   tagged ver:'orig' — they happen between the first walk (Apr 2) and the
   approval (Apr 12) — and the later versions are comparatively quiet.

   A line carries `added:true` plus an 'added' change naming the version it
   arrived in, and until the playhead reaches that change the line is not in
   the document — nor is its room, if it is the room's only line. What exists
   when:
     Day one  (Apr 2)  · 2 lines · Kitchen cabinets, living room floor: what
                                   the first pass through the door caught
     Scope    (Apr 12) · 8 lines · six more lines and two more rooms scoped,
                                   products picked, contractors assigned
     CO 1     (Apr 22) · +3      · kitchen backsplash, and Master Bath and
                                   Garage appear for the first time
     CO 2     (Apr 30) · +2, −1  · master closet, shower surround; the resident
                                   takes the ceiling fan back out ── */
const SCOPE = [
  {room:'Kitchen', tasks:[
    {code:'KIT-79B1', name:'Cabinets', opt:'Replace : shaker, white', gc:'Apex Carpentry',
     product:'Diamond NOW Arcadia White Shaker', qty:'14 LF', labor:'$3,180', amount:'$4,820',
     desc:'Demo existing uppers and base cabinets. Install new shaker fronts, soft-close hardware, and toe-kick. Verify wall is plumb before hanging.',
     mods:[],
     changes:[
       {ct:'value', ver:'co1', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Amount', from:'$4,320', to:'$4,580', delta:'+$260'}]},
       {ct:'product', ver:'orig', who:'D. Reyes', role:'Designer',
        rows:[{field:'Product', from:'(not selected)', to:'Diamond NOW Arcadia White Shaker'}]},
       {ct:'value', ver:'co2', who:'T. Okafor', role:'Job manager',
        rows:[{field:'Labor', from:'$3,000', to:'$3,180'},{field:'Amount', from:'$4,580', to:'$4,820', delta:'+$240'}]},
     ]},
    {code:'KIT-F362', name:'Countertops', opt:'Replace : quartz', gc:'Stone Bros',
     product:'MSI Calacatta Laza Quartz', qty:'42 SF', labor:'$2,200', amount:'$4,400',
     desc:'Template and fabricate quartz tops. Remove old laminate. Confirm sink cutout and overhang before fab.',
     mods:[], added:true,
     changes:[
       {ct:'product', ver:'co1', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Product', from:'MSI Carrara Marmi Quartz', to:'MSI Calacatta Laza Quartz'}]},
       {ct:'added', ver:'orig', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Line added', add:'Countertops — laminate is delaminating at the sink', wasAmount:'$4,400'}]},
       {ct:'contractor', ver:'orig', who:'S. Patel', role:'Ops',
        rows:[{field:'Contractor', from:'Unassigned', to:'Apex Carpentry'}]},
       {ct:'contractor', ver:'co2', who:'T. Okafor', role:'Job manager',
        rows:[{field:'Contractor', from:'Apex Carpentry', to:'Stone Bros'}]},
     ]},
    {code:'KIT-E6C4', name:'Appliances', opt:'Replace : full suite', gc:'Apex Carpentry',
     product:'GE Profile Stainless Suite', qty:'1 suite', labor:'$3,950', amount:'$3,950',
     desc:'Remove and haul old appliances. Install full stainless suite. Confirm gas/electric rough-in matches range spec.',
     mods:[], added:true,
     changes:[
       {ct:'contractor', ver:'co1', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Contractor', from:'Stone Bros', to:'American Appliance Co.'}]},
       {ct:'added', ver:'orig', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Line added', add:'Appliances — range and fridge are original to the build', wasAmount:'$3,410'}]},
       {ct:'value', ver:'co2', who:'T. Okafor', role:'Job manager',
        rows:[{field:'Amount', from:'$3,410', to:'$3,950', delta:'+$540'}]},
     ]},
    {code:'KIT-B914', name:'Backsplash', opt:'Add : subway tile', gc:'Apex Carpentry',
     product:'Daltile Rittenhouse Arctic White 3x6', qty:'32 SF', labor:'$820', amount:'$1,344',
     desc:'Install waterproof membrane and subway tile from counter to the underside of the uppers. Schluter edge trim at exposed ends.',
     mods:[], added:true,
     changes:[
       {ct:'added', ver:'co1', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Line added', add:'Backsplash — wall was left bare by the original scope', wasAmount:'$1,344'}]},
     ]},
  ]},
  {room:'Living Room', tasks:[
    {code:'LIV-6075', name:'Flooring', opt:'Replace : LVP', gc:'FloorWorks',
     product:'Shaw Paragon Mix Plus', qty:'320 SF', labor:'$1,920', amount:'$2,760',
     desc:'Pull existing flooring, prep subfloor, install LVP with underlayment across living area.',
     mods:[],
     changes:[
       {ct:'product', ver:'co1', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Product', from:'Shaw Endura Plus', to:'Shaw Paragon Mix Plus'}]},
       {ct:'value', ver:'orig', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Qty', from:'296 SF', to:'320 SF'},{field:'Amount', from:'$2,520', to:'$2,760', delta:'+$240'}]},
     ]},
    {code:'LIV-DA26', name:'Paint', opt:'Full repaint', gc:'FloorWorks',
     product:'SW Agreeable Gray 7029', qty:'1 room', labor:'$240', amount:'$980',
     desc:'Patch, prime, and repaint all walls and ceiling. Two coats.',
     mods:[], added:true,
     changes:[
       {ct:'contractor', ver:'co1', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Contractor', from:'Unassigned', to:'Roll With It Painting'}]},
       {ct:'added', ver:'orig', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Line added', add:'Paint — scuffing and nail pops throughout', wasAmount:'$980'}]},
       {ct:'modifier', ver:'co1', who:'S. Patel', role:'Ops',
        rows:[{field:'Modifier added', add:'Resident pays'}]},
     ]},
    {code:'LIV-53D7', name:'Ceiling fan', opt:'Resident install', gc:null,
     product:'Resident supplied', qty:'1 ea', labor:'$0', amount:'$0',
     desc:'Resident to supply and install ceiling fan. Confirm box is fan-rated.',
     mods:[], added:true, removed:true,
     changes:[
       {ct:'value', ver:'co1', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Amount', from:'$0', to:'$180', delta:'+$180'}]},
       {ct:'added', ver:'orig', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Line added', add:'Ceiling fan — resident asked for one during the walk', wasAmount:'$0'}]},
       {ct:'modifier', ver:'orig', who:'S. Patel', role:'Ops',
        rows:[{field:'Modifier added', add:'Resident pays'}]},
       {ct:'removed', ver:'co2', who:'T. Okafor', role:'Job manager',
        rows:[{field:'Line removed', remove:'Ceiling fan — resident handling separately', wasAmount:'$0'}]},
     ]},
  ]},
  {room:'Master Bed', tasks:[
    {code:'MBD-2DFD', name:'Flooring', opt:'Replace : carpet', gc:'FloorWorks',
     product:'Mohawk SmartStrand Silk', qty:'1 room', labor:'$1,100', amount:'$1,540',
     desc:'Remove old carpet, install new carpet and pad in master bedroom.',
     mods:[], added:true,
     changes:[
       {ct:'added', ver:'orig', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Line added', add:'Carpet — pet staining through to the pad', wasAmount:'$1,540'}]},
       {ct:'contractor', ver:'orig', who:'S. Patel', role:'Ops',
        rows:[{field:'Contractor', from:'Unassigned', to:'FloorWorks'}]},
     ]},
    {code:'MBD-A7AE', name:'Closet', opt:'Add shelving', gc:null,
     product:'ClosetMaid ShelfTrack', qty:'1 kit', labor:'$340', amount:'$460',
     desc:'Add wire shelving system to master closet. Contractor not yet assigned.',
     mods:['Required'], added:true,
     changes:[
       {ct:'added', ver:'co2', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Line added', add:'Add shelving to master closet', wasAmount:'$460'}]},
     ]},
  ]},
  {room:'Master Bath', tasks:[
    {code:'MBA-3C57', name:'Vanity', opt:'Replace : 48in double', gc:'Stone Bros',
     product:'Home Decorators Sonoma 48in', qty:'1 ea', labor:'$760', amount:'$2,180',
     desc:'Remove existing vanity and top. Install 48 in. double vanity, undermount sinks, and new supply lines. Confirm rough-in centers before ordering.',
     mods:[], added:true,
     changes:[
       {ct:'added', ver:'co1', who:'D. Reyes', role:'Designer',
        rows:[{field:'Line added', add:'Vanity — master bath was not walked the first time', wasAmount:'$2,180'}]},
     ]},
    {code:'MBA-77E1', name:'Shower surround', opt:'Replace : tile surround', gc:null,
     product:'MSI Highland Park 3x6', qty:'64 SF', labor:'$1,540', amount:'$2,860',
     desc:'Demo tub surround to the studs. New cement board, waterproofing, and tile to the ceiling. Contractor not yet assigned.',
     mods:['Required'], added:true,
     changes:[
       {ct:'added', ver:'co2', who:'T. Okafor', role:'Job manager',
        rows:[{field:'Line added', add:'Shower surround — failed moisture check behind the tub', wasAmount:'$2,860'}]},
     ]},
  ]},
  {room:'Garage', tasks:[
    {code:'GAR-9B10', name:'Door opener', opt:'Replace', gc:'Stone Bros',
     product:'Chamberlain B970 Smart', qty:'1 ea', labor:'$420', amount:'$520',
     desc:'Replace garage door opener with smart unit. Reuse existing rail if compatible.',
     mods:[], added:true,
     changes:[
       {ct:'value', ver:'co2', who:'S. Patel', role:'Ops',
        rows:[{field:'Amount', from:'$520', to:'$700', delta:'+$180'}]},
       {ct:'added', ver:'co1', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Line added', add:'Door opener — garage added to the walk', wasAmount:'$520'}]},
       {ct:'product', ver:'co2', who:'D. Reyes', role:'Designer',
        rows:[{field:'Product', from:'Chamberlain B750', to:'Chamberlain B970 Smart'}]},
       {ct:'modifier', ver:'co2', who:'S. Patel', role:'Ops',
        rows:[{field:'Modifier added', add:'Required'}]},
     ]},
  ]},
  {room:'Bedroom 2', tasks:[
    {code:'BD2-215F', name:'Paint', opt:'Full repaint', gc:'FloorWorks',
     product:'SW Pure White 7005', qty:'1 room', labor:'$180', amount:'$620',
     desc:'Repaint bedroom walls and trim, two coats.',
     mods:[], added:true,
     changes:[
       {ct:'added', ver:'orig', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Line added', add:'Paint — second bedroom walked on the last pass', wasAmount:'$620'}]},
       {ct:'modifier', ver:'co1', who:'S. Patel', role:'Ops',
        rows:[{field:'Modifier added', add:'Resident pays'}]},
     ]},
  ]},
];

/* ── local helpers. The panel's global a2Esc() only escapes quotes, so this
   view carries its own full escape. ── */
function a2Esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function initials(name){ return String(name||'').split(/\s+/).map(p=>p[0]).join('').slice(0,2).toUpperCase(); }
function parseMoney(s){
  if(s==null) return 0;
  const neg = /^-|\(/.test(String(s).trim());
  const n = parseFloat(String(s).replace(/[^0-9.]/g,'')) || 0;
  return neg ? -n : n;
}
function fmtMoney(n){ return '$' + Math.round(n).toLocaleString('en-US'); }
