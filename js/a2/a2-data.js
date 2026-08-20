/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · SCOPE CHANGE HISTORY
   Ported from ProjectReview_ChangeHistory_1.html. A read-only track-changes
   view of the scope: the paper document carries the line items, every change
   gets a margin card wired to the line it touched, and a scrubber at the
   bottom moves a playhead through the version history — scrolling forward
   accumulates redlines instead of replacing them.

   Proportions follow the Artifact tab (ProjectReview_ScopePanel's
   .art-page-stacked) rather than the standalone page: a sunken controls card
   inside the page gutters, the paper claiming the rest of the width beneath
   it, and one annotation gutter on the right. The standalone page centered a
   fixed-width paper between two wide margins, which reads unbalanced in a
   panel that is already narrower than a full page.

   The other difference: the page scrolled the window and docked the scrubber
   with position:fixed. Here .a2-root fills #workBody, .a2-scroll holds the
   controls card + paper + legend, and the scrubber is pinned to the bottom.

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
  orig:{label:'Scope',          date:'Apr 12, 2026', rank:0, budget:24890, sow:'SOW-00000E7B', tag:'Original', tagCls:'archived', stateCls:''},
  co1: {label:'Change Order 1', date:'Apr 22, 2026', rank:1, budget:25130, sow:'SOW-00000E7C', tag:'Outdated', tagCls:'outdated', stateCls:' is-outdated'},
  co2: {label:'Change Order 2', date:'Apr 30, 2026', rank:2, budget:26370, sow:'SOW-00000E7D', tag:'Current',  tagCls:'',         stateCls:' is-current'},
};
const VER_ORDER = ['orig','co1','co2'];
const BASE_TOTAL = VER.orig.budget;   // the running total builds from here

/* ── SCOPE (current / Change Order 2 state), grouped by room.
   `changes[]` on each task holds its history from the Original scope.
   Budget math ties out:  $24,890 →(+$240)→ $25,130 →(+$1,240)→ $26,370 ── */
const SCOPE = [
  {room:'Kitchen', tasks:[
    {code:'KIT-79B1', name:'Cabinets', opt:'Replace : shaker, white', gc:'Apex Carpentry',
     product:'Diamond NOW Arcadia White Shaker', qty:'14 LF', labor:'$3,180', amount:'$4,820',
     desc:'Demo existing uppers and base cabinets. Install new shaker fronts, soft-close hardware, and toe-kick. Verify wall is plumb before hanging.',
     mods:[],
     changes:[
       {ct:'product', ver:'co1', who:'D. Reyes', role:'Designer',
        rows:[{field:'Product', from:'(not selected)', to:'Diamond NOW Arcadia White Shaker'}]},
       {ct:'value', ver:'co2', who:'T. Okafor', role:'Manager',
        rows:[{field:'Labor', from:'$3,000', to:'$3,180'},{field:'Amount', from:'$4,580', to:'$4,820', delta:'+$240'}]},
     ]},
    {code:'KIT-F362', name:'Countertops', opt:'Replace : quartz', gc:'Stone Bros',
     product:'MSI Calacatta Laza Quartz', qty:'42 SF', labor:'$2,200', amount:'$4,400',
     desc:'Template and fabricate quartz tops. Remove old laminate. Confirm sink cutout and overhang before fab.',
     mods:[],
     changes:[
       {ct:'contractor', ver:'co2', who:'T. Okafor', role:'Manager',
        rows:[{field:'Contractor', from:'Apex Carpentry', to:'Stone Bros'}]},
     ]},
    {code:'KIT-E6C4', name:'Appliances', opt:'Replace : full suite', gc:'Apex Carpentry',
     product:'GE Profile Stainless Suite', qty:'1 suite', labor:'$3,950', amount:'$3,950',
     desc:'Remove and haul old appliances. Install full stainless suite. Confirm gas/electric rough-in matches range spec.',
     mods:[],
     changes:[
       {ct:'value', ver:'co2', who:'T. Okafor', role:'Manager',
        rows:[{field:'Amount', from:'$3,410', to:'$3,950', delta:'+$540'}]},
     ]},
  ]},
  {room:'Living Room', tasks:[
    {code:'LIV-6075', name:'Flooring', opt:'Replace : LVP', gc:'FloorWorks',
     product:'Shaw Paragon Mix Plus', qty:'320 SF', labor:'$1,920', amount:'$2,760',
     desc:'Pull existing flooring, prep subfloor, install LVP with underlayment across living area.',
     mods:[],
     changes:[
       {ct:'value', ver:'co1', who:'M. Alvarez', role:'Field Agent',
        rows:[{field:'Qty', from:'296 SF', to:'320 SF'},{field:'Amount', from:'$2,520', to:'$2,760', delta:'+$240'}]},
     ]},
    {code:'LIV-DA26', name:'Paint', opt:'Full repaint', gc:'FloorWorks',
     product:'SW Agreeable Gray 7029', qty:'1 room', labor:'$240', amount:'$980',
     desc:'Patch, prime, and repaint all walls and ceiling. Two coats.',
     mods:[],
     changes:[
       {ct:'modifier', ver:'co1', who:'S. Patel', role:'Ops',
        rows:[{field:'Modifier added', add:'Resident pays'}]},
     ]},
    {code:'LIV-53D7', name:'Ceiling fan', opt:'Resident install', gc:null,
     product:'Resident supplied', qty:'1 ea', labor:'$0', amount:'$0',
     desc:'Resident to supply and install ceiling fan. Confirm box is fan-rated.',
     mods:['Resident pays'], removed:true,
     changes:[
       {ct:'removed', ver:'co2', who:'T. Okafor', role:'Manager',
        rows:[{field:'Line removed', remove:'Ceiling fan — resident handling separately', wasAmount:'$0'}]},
     ]},
  ]},
  {room:'Master Bed', tasks:[
    {code:'MBD-2DFD', name:'Flooring', opt:'Replace : carpet', gc:'FloorWorks',
     product:'Mohawk SmartStrand Silk', qty:'1 room', labor:'$1,100', amount:'$1,540',
     desc:'Remove old carpet, install new carpet and pad in master bedroom.',
     mods:[], changes:[]},
    {code:'MBD-A7AE', name:'Closet', opt:'Add shelving', gc:null,
     product:'ClosetMaid ShelfTrack', qty:'1 kit', labor:'$340', amount:'$460',
     desc:'Add wire shelving system to master closet. Contractor not yet assigned.',
     mods:['Required'], added:true,
     changes:[
       {ct:'added', ver:'co2', who:'D. Reyes', role:'Designer',
        rows:[{field:'Line added', add:'Add shelving to master closet', wasAmount:'$460'}]},
     ]},
  ]},
  {room:'Garage', tasks:[
    {code:'GAR-9B10', name:'Door opener', opt:'Replace', gc:'Stone Bros',
     product:'Chamberlain B970 Smart', qty:'1 ea', labor:'$420', amount:'$520',
     desc:'Replace garage door opener with smart unit. Reuse existing rail if compatible.',
     mods:[],
     changes:[
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
     mods:[],
     changes:[
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
