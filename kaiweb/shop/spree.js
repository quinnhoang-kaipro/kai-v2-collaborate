/* ════════════ SHOP WITH KAI · SHOPPING WORKSPACE (wireframe) ════════════
   Built from "Shop with Kai — Design Requirements". Opens over the whole
   panel from the "Shop with Kai" button in the work bar.

   Shop tab (two panels)
     · Needs: every product the scope needs is a blank thumbnail slot
       ("2 ceiling fans – Bedroom 2") that fills once a product is picked.
       Grouped by department (Wedgewood), room (AMH) or task (contractors).
     · Shelves: retailer shelves (Home Depot, Lowe's, Wayfair). Drag a product
       onto any slot, across groups, or select a slot and press "Add".
     · Standards: each product says whether it meets the org's style guide
       (High match / Lower match).
     · Help me choose: product-to-image matching against a property photo or
       a mood board image.
     · Reference panel: mood board or property photos, plus every picked
       product together, with finish clashes called out.
   Cart & review tab
     · The table view, reused as the cart: by department, room or task, with
       measurements, for the final check.
   Future (shown, tagged, not wired): Pinterest links, board-driven search,
   contractor's private margin, fulfillment view.

   Picks go through shop-v2.js's _v2Apply, so task costs, totals and the
   Record update exactly as they do from the Editor. */
// Rooms on the floor plan that start with no tasks (a draft scope shows empty rooms),
// so a demo can show a task appear when an existing item is replaced.
if(typeof ROOMS !== 'undefined' && Array.isArray(ROOMS)) ['Entry', 'Hallway'].forEach(r => { if(!ROOMS.includes(r)) ROOMS.push(r); });
// No garage in this project.
if(typeof ROOMS !== 'undefined' && Array.isArray(ROOMS)){ const gi = ROOMS.indexOf('Garage'); if(gi > -1) ROOMS.splice(gi, 1); }
if(typeof TASKS !== 'undefined' && Array.isArray(TASKS)) for(let i = TASKS.length - 1; i >= 0; i--) if(TASKS[i].room === 'Garage') TASKS.splice(i, 1);
(function(){
if(!window.__KAI_SHOP_V2) return;

/* ── extra retailer + a few products so the wireframe shows every case ── */
SUPPLIERS.wf = {id:'wf', name:'Wayfair'};
delete SUPPLIERS.fd; delete SUPPLIERS.fer;
// its house-brand tile shouldn't read as the retailer
(typeof catalogAll === 'function' ? catalogAll() : []).forEach(x => { if(x.brand === 'Floor & Decor') x.brand = 'Daltile'; });
const _WF_SECTIONS = new Set(['lighting', 'ceilingfan', 'vanity', 'blinds', 'hardware', 'storage', 'cabinet']);
const _origOffers = catalogOffers;
// Retailers: The Home Depot, Lowe's and Wayfair only (Floor & Decor and Ferguson removed).
const _GONE = new Set(['fd', 'fer']);
catalogOffers = function(p){
  let offers = _origOffers(p);
  if(offers.some(o => _GONE.has(o.supplier))){
    const kept = offers.filter(o => !_GONE.has(o.supplier));
    offers = kept.length ? kept : [{...offers[0], supplier:'hd'}];   // a specialist-only product: sold by The Home Depot instead
  }
  if(!p || Array.isArray(p.offers)) return offers;
  if(_WF_SECTIONS.has(p.section) && !offers.some(o => o.supplier === 'wf') && _skuHash(p.sku) % 3 !== 1){
    const base = Number(p.price) || 0;
    offers.push({supplier:'wf', price:Math.max(1, Math.round(base * (0.94 + (_skuHash(p.sku) % 11) / 100))), stock:'ships'});
  }
  return offers.sort((a, b) => a.price - b.price);
};
const _EXTRA = [
  {tier:'other', brand:'Kichler', name:'Tolani 2-Light Flush Mount, Oil-Rubbed Bronze', sku:'KI-TOL-2ORB', unit:'ea', price:72, stock:'in', section:'lighting', offers:[{supplier:'wf', price:72, stock:'ships'}, {supplier:'low', price:76, stock:'in'}]},
  {tier:'other', brand:'Craftmade', name:'Ellington 52 in. Ceiling Fan, Aged Bronze', sku:'CM-ELL-52AB', unit:'ea', price:229, stock:'in', section:'ceilingfan', offers:[{supplier:'wf', price:229, stock:'ships'}]},
  {tier:'similar', brand:'Globe Electric', name:'Wilson 52 in. Ceiling Fan, Brushed Nickel', sku:'GE-WIL-52BN', unit:'ea', price:158, stock:'in', section:'ceilingfan', offers:[{supplier:'wf', price:158, stock:'ships'}, {supplier:'hd', price:164, stock:'in'}]},
  {tier:'other', brand:'Allen + Roth', name:'Bristow Matte Black Flush Mount', sku:'AR-BRS-MBK', unit:'ea', price:64, stock:'in', section:'lighting', offers:[{supplier:'low', price:64, stock:'in'}]},
];
// More products per category, so a shelf fills its row and pages on.
// Wireframe sample names; prices sit around the category's own.
const _MORE = {
  cabinet:[['American Woodmark','Portland Shaker Linen'],['Shenandoah','Grayson Pure White'],['Hampton Bay','Avondale Dove Gray'],['Allen + Roth','Westwood Natural Oak'],['KraftMaid','Hartford Frost'],['Diamond NOW','Bristol Slate Blue'],['Project Source','Courtland Espresso'],['Hampton Bay','Edgeley Ivory']],
  counter:[['Silestone','Eternal Statuario'],['Caesarstone','Frosty Carrina'],['MSI','Carrara Breve'],['LG Viatera','Rococo'],['Corian','Dove Gray'],['Wilsonart','Calcutta Marble Laminate'],['Hampton Bay','Butcher Block Birch']],
  tile:[['Daltile','Restore Bright White 3x12'],['MSI','Arctic White Herringbone'],['Jeffrey Court','Gloss White Brick'],['Bedrosians','Cloe Bianco 2.5x8'],['Merola','Metro Subway Matte White'],['Daltile','Semi-Gloss White 4x16'],['Ivy Hill','Classic White Hex'],['MSI','Dove Gray 3x6']],
  appliance:[['Frigidaire','Stainless 3-Piece Suite'],['LG','Stainless Smart Suite'],['GE','Profile Fingerprint-Resistant Suite'],['Whirlpool','Black Stainless Suite'],['Samsung','Bespoke Stainless Suite'],['Maytag','Stainless 4-Piece Suite'],['Bosch','100 Series Stainless Suite'],['KitchenAid','Black Stainless Suite']],
  floor:[['LifeProof','Sterling Oak LVP 8.7in'],['Pergo','Outlast+ Coastal Oak'],['Home Decorators','Hayden Hickory LVP'],['TrafficMaster','Gray Elm LVP'],['Shaw','Floorte Pro Ash'],['Mohawk','RevWood Natural Oak'],['LifeProof','Trail Oak LVP'],['SmartCore','Warm Walnut LVP']],
  paint:[['Behr','Swiss Coffee Satin (Gallon)'],['Sherwin-Williams','Alabaster 7008 Satin (Gallon)'],['Valspar','Bistro White Satin (Gallon)'],['Behr','Silver Drop Eggshell (Gallon)'],['PPG','Delicate White Satin (Gallon)'],['Benjamin Moore','Chantilly Lace Satin (Gallon)'],['Glidden','Gray Owl Satin (Gallon)'],['Sherwin-Williams','Repose Gray 7015 Satin (Gallon)']],
  vanity:[['Home Decorators','Sonoma 36" Vanity White'],['Glacier Bay','Everdean 48" Vanity Pearl Gray'],['Glacier Bay','Hampton 30" Vanity White'],['Home Decorators','Merryfield 49" Vanity Dove'],['allen + roth','Presley 48" Vanity Sage'],['Woodbridge','Milan 48" Vanity Espresso'],['Avanity','Modero 48" Vanity Chilled Gray']],
  shower:[['MSI','Calacatta Gold 12x24 Matte'],['Daltile','Fabrique Blanc 12x24'],['Florida Tile','Home Bianco Carrara 12x24'],['Merola','Carrara Hex Mosaic'],['Bedrosians','Allora Gray 12x24'],['MSI','Arabescato Carrara 12x24'],['Daltile','Marble Attache White 12x24']],
  toilet:[['American Standard','Cadet 3 Elongated'],['KOHLER','Highline Comfort Height'],['TOTO','Entrada Elongated'],['Glacier Bay','Power Flush Elongated'],['KOHLER','Wellworth Elongated'],['Gerber','Viper Elongated'],['Pfister','Pfirst Elongated']],
  mech:[['Chamberlain','B550 Smart Belt Drive'],['Genie','ChainMax 1000'],['LiftMaster','87504-267 Smart Wall Mount'],['Chamberlain','C2212T Chain Drive'],['Genie','SilentMax Connect'],['Skylink','ATR-1611C Chain Drive'],['Chamberlain','RJO70 Wall Mount']],
  storage:[['ClosetMaid','SuiteSymphony 4-8 ft Kit'],['Rubbermaid','FastTrack 4-8 ft Kit'],['Closet Evolution','Ultimate White Kit'],['ClosetMaid','Style+ 25 in. White'],['Everbilt','Shelf & Rod 4-8 ft Kit'],['Rubbermaid','HomeFree Deluxe 3-6 ft'],['John Louis','Home 16 in. Deep Organizer']],
  hardware:[['Schlage','Plymouth Passage Knob, Satin Nickel'],['Kwikset','Juno Passage Knob, Satin Nickel'],['Defiant','Saturn Privacy Knob, Stainless'],['Schlage','Accent Passage Lever, Satin Nickel'],['Kwikset','Cove Passage Knob, Satin Nickel'],['Baldwin','Prestige Alcott Knob, Satin Nickel'],['Defiant','Hartford Passage Knob, Brushed Nickel']],
  lighting:[['Hampton Bay','Flaxmere 14 in. Flush Mount, Brushed Nickel'],['Commercial Electric','Low Profile 12 in. LED Flush Mount'],['Home Decorators','Ashby Park 2-Light Flush Mount, Brushed Nickel'],['Progress Lighting','Fluted Glass Close-to-Ceiling, Brushed Nickel'],['Hampton Bay','Wellston 13 in. Flush Mount, Chrome'],['Lithonia','FMML 13 in. LED Flush Mount'],['Globe Electric','Harrow Semi-Flush, Brushed Nickel']],
  ceilingfan:[['Hunter','Builder 52 in. Ceiling Fan, Brushed Nickel'],['Home Decorators','Altura 54 in. Ceiling Fan, Brushed Nickel'],['Hampton Bay','Hugger 52 in. Ceiling Fan, Brushed Nickel'],['Harbor Breeze','Mazon 44 in. Flush Fan, Brushed Nickel'],['Westinghouse','Comet 52 in. Ceiling Fan, Chrome'],['Prominence Home','Alvina 42 in. Ceiling Fan, Satin Nickel']],
  detector:[['First Alert','SC9120B Hardwired Combo'],['Kidde','i12060 Hardwired Smoke'],['First Alert','BRK 3120B Dual Sensor'],['Kidde','P4010ACS-W Hardwired Combo'],['X-Sense','SC07-W Wireless Combo'],['Universal Security','MICCB3510SB Combo']],
  blinds:[['Home Decorators','2 in. Cordless Faux Wood, Snow Drift'],['Levolor','2 in. Faux Wood Blind, White'],['Bali','2 in. Cordless Faux Wood, Linen'],['Hampton Bay','Cordless 2 in. Vinyl Blind, White'],['Chicology','Cordless Light Filtering Shade, White'],['Designer\'s Touch','2 in. Faux Wood, Bright White']],
  exhaust:[['Broan-NuTone','Roomside 70 CFM'],['Panasonic','WhisperCeiling 90 CFM'],['Delta Breez','Signature 80 CFM, Humidity'],['Hunter','Kenner 80 CFM'],['Broan-NuTone','Flex 110 CFM'],['Homewerks','Smart Exhaust 80 CFM']],
};
(function(){
  const base = catalogAll();
  Object.entries(_MORE).forEach(([sec, list]) => {
    const own = base.filter(p => p.section === sec);
    if(!own.length) return;
    const avg = own.reduce((a, p) => a + (+p.price || 0), 0) / own.length;
    list.forEach(([brand, name], i) => {
      const sku = `WF-${sec}-${i}`.toUpperCase();
      if(base.some(p => p.sku === sku)) return;
      const f = 0.8 + ((_skuHash(sku) % 45) / 100);
      base.push({tier: i % 3 === 0 ? 'similar' : 'other', brand, name, sku, unit: own[0].unit || 'ea',
        price: Math.max(1, Math.round(avg * f)), stock: i % 7 === 3 ? 'low' : 'in', section: sec});
    });
  });
})();
const _all = catalogAll();
_EXTRA.forEach(x => { if(!_all.some(p => p.sku === x.sku)) _all.push(x); });

/* ── Exterior doors: a shelf of its own (wireframe sample products), so a
   "Replace · Front door" task made on a room board has something to shop ── */
const EXT_DOORS = [
  {tier:'team', brand:'Masonite', name:'36 in. Six-Panel Primed Steel Prehung Front Door', sku:'MAS-36-6P-STL', unit:'ea', price:289, stock:'in'},
  {tier:'team', brand:'JELD-WEN', name:'36 in. Craftsman 3-Lite Painted Steel Prehung Door', sku:'JW-36-CR3L', unit:'ea', price:519, stock:'in'},
  {tier:'similar', brand:'Therma-Tru', name:'Benchmark 36 in. Shaker Fiberglass Prehung Door, White', sku:'TT-BM-36-SHK', unit:'ea', price:649, stock:'in'},
  {tier:'similar', brand:'Masonite', name:'36 in. Half-Lite Fiberglass Prehung Door, White', sku:'MAS-36-HL-FG', unit:'ea', price:468, stock:'low'},
  {tier:'similar', brand:'Pella', name:'36 in. 1-Panel Smooth Fiberglass Prehung Door, White', sku:'PEL-36-1P-FG', unit:'ea', price:730, stock:'in'},
  {tier:'other', brand:'Steves & Sons', name:'36 in. Modern Flush Steel Prehung Door, Satin Nickel', sku:'SS-36-MOD-FL', unit:'ea', price:398, stock:'in'},
  {tier:'other', brand:'MMI Door', name:'36 in. Contemporary Steel Door with Glass, Black', sku:'MMI-36-CON-BK', unit:'ea', price:612, stock:'in'},
  {tier:'other', brand:'Feather River', name:'Mission Pointe 36 in. Fiberglass Door, Oak (Bronze)', sku:'FR-MP-36-OAK', unit:'ea', price:1149, stock:'ships'},
].map(x => ({...x, section:'extdoor'}));
EXT_DOORS.forEach(x => { if(!_all.some(p => p.sku === x.sku)) _all.push(x); });
try{ CATALOG_SECTION_LABEL.extdoor = 'Exterior doors'; }catch(e){}
try{ if(!CATALOG_SECTIONS.includes('extdoor')) CATALOG_SECTIONS.push('extdoor'); }catch(e){}
try{ _LINE_POOL['Exterior doors'] = 'extdoor'; }catch(e){}
if(typeof productPool === 'function'){
  const _origPool = productPool;
  productPool = function(t, cat){
    if(cat === 'extdoor' || (!cat && /exterior door|front door|entry door/i.test((t && t.name) || ''))) return EXT_DOORS.map(x => ({...x}));
    return _origPool.apply(this, arguments);
  };
}

/* ── More shelves (wireframe sample products), so anything you can replace or add
   from a room board always has products to shop ── */
const MORE_SHELVES = {
  sink:{label:'Sinks & faucets', lines:['Sinks & faucets'], re:/sink|faucet/i, items:[
    {tier:'team', brand:'Kraus', name:'Standart PRO 33 in. Undermount Double-Bowl Stainless Sink', sku:'KR-KHU103-33', unit:'ea', price:329, stock:'in'},
    {tier:'team', brand:'Moen', name:'Adler Single-Handle Pull-Down Kitchen Faucet, Stainless', sku:'MO-87233SRS', unit:'ea', price:149, stock:'in'},
    {tier:'similar', brand:'Glacier Bay', name:'All-in-One 33 in. Drop-In Double-Bowl Sink with Faucet', sku:'GB-AIO-33DB', unit:'ea', price:229, stock:'in'},
    {tier:'similar', brand:'Delta', name:'Essa Pull-Down Kitchen Faucet, Arctic Stainless', sku:'DE-9113-AR', unit:'ea', price:259, stock:'in'},
    {tier:'other', brand:'Elkay', name:'Quartz Classic 33 in. Double-Bowl Sink, White', sku:'EL-ELGULB3322WH', unit:'ea', price:412, stock:'ships'},
    {tier:'other', brand:'Pfister', name:'Stellen Pull-Down Kitchen Faucet, Chrome', sku:'PF-F529-7SDC', unit:'ea', price:139, stock:'in'},
  ]},
  window:{label:'Windows', lines:['Windows'], re:/window(?! blind)/i, items:[
    {tier:'team', brand:'Pella', name:'250 Series 36 x 60 in. Vinyl Double-Hung Window, White', sku:'PE-250-3660-DH', unit:'ea', price:389, stock:'in'},
    {tier:'team', brand:'JELD-WEN', name:'V-2500 36 x 48 in. Vinyl Double-Hung Window, White', sku:'JW-V25-3648', unit:'ea', price:276, stock:'in'},
    {tier:'similar', brand:'Andersen', name:'100 Series 36 x 60 in. Single-Hung Window, White', sku:'AN-100-3660-SH', unit:'ea', price:458, stock:'ships'},
    {tier:'similar', brand:'American Craftsman', name:'70 Series 36 x 54 in. Double-Hung Window', sku:'AC-70-3654-DH', unit:'ea', price:242, stock:'in'},
    {tier:'other', brand:'Pella', name:'Lifestyle 72 x 48 in. Wood Picture Window', sku:'PE-LS-7248-PW', unit:'ea', price:1189, stock:'ships'},
    {tier:'other', brand:'Milgard', name:'Tuscany 36 x 60 in. Vinyl Slider Window', sku:'MG-TUS-3660-SL', unit:'ea', price:345, stock:'low'},
  ]},
  intdoor:{label:'Interior doors', lines:['Interior doors'], re:/interior door/i, items:[
    {tier:'team', brand:'Masonite', name:'30 in. Shaker 2-Panel Primed Prehung Interior Door', sku:'MAS-30-SH2P', unit:'ea', price:189, stock:'in'},
    {tier:'team', brand:'JELD-WEN', name:'30 in. Six-Panel Primed Molded Prehung Door', sku:'JW-30-6P-MOL', unit:'ea', price:139, stock:'in'},
    {tier:'similar', brand:'Masonite', name:'32 in. Flush Hardboard Prehung Interior Door', sku:'MAS-32-FLUSH', unit:'ea', price:98, stock:'in'},
    {tier:'similar', brand:'Steves & Sons', name:'30 in. 1-Panel Shaker Solid Core Door, White', sku:'SS-30-1P-SC', unit:'ea', price:268, stock:'in'},
    {tier:'other', brand:'Codel Doors', name:'30 in. 5-Lite Frosted Glass Prehung Door', sku:'CD-30-5L-FR', unit:'ea', price:315, stock:'ships'},
    {tier:'other', brand:'Krosswood', name:'30 in. Craftsman Knotty Alder Interior Door', sku:'KW-30-CR-KA', unit:'ea', price:362, stock:'low'},
  ]},
  tub:{label:'Tubs & showers', lines:['Tubs', 'Tubs & showers'], re:/\btub\b|bathtub/i, items:[
    {tier:'team', brand:'American Standard', name:'Princeton 60 in. Alcove Americast Bathtub, White', sku:'AS-2391202-020', unit:'ea', price:489, stock:'in'},
    {tier:'team', brand:'Delta', name:'Classic 500 60 in. Tub & Shower Wall Set, White', sku:'DE-B23200-6030', unit:'ea', price:629, stock:'in'},
    {tier:'similar', brand:'Bootz', name:'Aloha 60 in. Alcove Steel Bathtub, White', sku:'BZ-011-2365-00', unit:'ea', price:299, stock:'in'},
    {tier:'similar', brand:'Sterling', name:'Ensemble 60 in. Bath & Shower Kit, White', sku:'ST-71121110-0', unit:'ea', price:712, stock:'ships'},
    {tier:'other', brand:'Kohler', name:'Underscore 60 in. Alcove Bathtub, White', sku:'KO-K-1956-0', unit:'ea', price:845, stock:'ships'},
    {tier:'other', brand:'Aqua Eden', name:'60 in. Acrylic Clawfoot Tub, Brushed Nickel Feet', sku:'AE-VTDE603023', unit:'ea', price:1099, stock:'low'},
  ]},
  fireplace:{label:'Fireplaces', lines:['Fireplaces'], re:/fireplace|mantel/i, items:[
    {tier:'team', brand:'Pleasant Hearth', name:'Electric Fireplace Insert, 23 in.', sku:'PH-EFI-23', unit:'ea', price:279, stock:'in'},
    {tier:'team', brand:'Ornamental Mouldings', name:'Hudson 60 in. Painted Wood Mantel, White', sku:'OM-HUD-60W', unit:'ea', price:349, stock:'in'},
    {tier:'similar', brand:'Duraflame', name:'3D Infrared Electric Fireplace Insert', sku:'DF-DFI030ARU', unit:'ea', price:319, stock:'in'},
    {tier:'similar', brand:'MSI', name:'Carrara White Marble Hearth Surround Tile, 12 x 24', sku:'MSI-CAR-1224', unit:'SF', price:12, stock:'in'},
    {tier:'other', brand:'Superior', name:'DRT2035 35 in. Direct-Vent Gas Fireplace', sku:'SU-DRT2035', unit:'ea', price:2189, stock:'ships'},
    {tier:'other', brand:'Pearl Mantels', name:'Shaker 48 in. Wood Mantel Shelf, Unfinished', sku:'PM-SHK-48', unit:'ea', price:189, stock:'in'},
  ]},
};
Object.entries(MORE_SHELVES).forEach(([sec, sh]) => {
  sh.items = sh.items.map(x => ({...x, section:sec}));
  sh.items.forEach(x => { if(!_all.some(p => p.sku === x.sku)) _all.push(x); });
  try{ CATALOG_SECTION_LABEL[sec] = sh.label; }catch(e){}
  try{ if(!CATALOG_SECTIONS.includes(sec)) CATALOG_SECTIONS.push(sec); }catch(e){}
  try{ sh.lines.forEach(n => { if(!_LINE_POOL[n]) _LINE_POOL[n] = sec; }); }catch(e){}
});
if(typeof productPool === 'function'){
  const _origPool2 = productPool;
  productPool = function(t, cat){
    if(cat && MORE_SHELVES[cat]) return MORE_SHELVES[cat].items.map(x => ({...x}));
    const n = (t && t.name) || '';
    if(!cat || cat === 'generic'){ const hit = Object.values(MORE_SHELVES).find(sh => sh.re.test(n)); if(hit) return hit.items.map(x => ({...x})); }
    return _origPool2.apply(this, arguments);
  };
}

/* ── the org's style guide (wireframe sample) ── */
const GUIDE = {
  org: 'AMH',
  title: 'AMH rental standard',
  finishes: ['Brushed nickel', 'Satin nickel', 'Stainless', 'White'],
  notes: ['White shaker cabinets', 'Cool metals only: nickel, stainless, chrome', 'Warm-neutral walls, oak-tone LVP'],
};
const WARM = /bronze|brass|copper|\bgold\b/i, COOL = /nickel|stainless|chrome|pewter/i;
function finishOf(x){
  const n = String(x && x.name || '');
  const metalSec = !/counter|tile|shower|floor/.test(x && x.section || '');
  const m = n.match(/oil-rubbed bronze|aged bronze|bronze|brushed nickel|satin nickel|stainless|chrome|matte black|black|brass|white/i);
  if(!m) return '';
  if(/gold|brass/i.test(m[0]) && !metalSec) return '';
  return m[0].replace(/\b\w/g, c => c.toUpperCase());
}
function metalOf(x){ const f = finishOf(x); return WARM.test(f) ? 'warm' : COOL.test(f) ? 'cool' : /black/i.test(f) ? 'black' : ''; }
function standard(x){
  let s = x.tier === 'team' ? 2 : x.tier === 'similar' ? 1 : 0;
  const m = metalOf(x);
  if(m === 'cool' || /white/i.test(finishOf(x))) s += 1;
  if(m === 'warm' || m === 'black') s -= 2;
  return s >= 1 ? {cls:'hi', t:'High match', why: x.tier === 'team' ? `On the ${GUIDE.org} template` : `Fits the ${GUIDE.org} style guide`}
                : {cls:'lo', t:'Lower match', why: m === 'warm' ? 'Warm metal; the guide calls for cool metals' : m === 'black' ? 'Black finish is outside the guide' : `Not on the ${GUIDE.org} list`};
}
function stdBadge(x){ const s = standard(x); return `<span class="sp-std is-${s.cls}" title="${esc(s.why)}">${s.t}</span>`; }

/* ── state ── */
let _w = {l:280, r:340};
try{ const v = JSON.parse(localStorage.getItem('kai_wf_spree_w') || 'null'); if(v && v.l && v.r) _w = v; }catch(e){}
const S = {open:false, view:'shop', by:'room', ret:'all', active:null, ref:'mood', guide:'supplied', help:null, helpRef:0, q:''};
const RET = [['all', 'All'], ['hd', 'The Home Depot'], ['low', "Lowe's"], ['wf', 'Wayfair']];
const BY = [['dept', 'Department', 'Wedgewood'], ['room', 'Room', 'AMH'], ['task', 'Task', 'Contractors · Kairos, Fannie Mae']];
const money = n => _v2Money(n), fmt = n => _v2Fmt(n);
const supOf = p => { const k = p.supplier || (typeof rowSupplier === 'function' ? rowSupplier({sku:p.sku, parts:String(p.rate)}) : '') || 'hd';
  return _GONE.has(k) ? ((offersForSku(p.sku) || [])[0] || {}).supplier || 'hd' : k; };
const arg = s => _v2Arg(s);

/* ── slots: one per task that needs a product ── */
function plural(w, n){
  if(n === 1) return w;
  if(/y$/i.test(w) && !/[aeiou]y$/i.test(w)) return w.replace(/y$/i, 'ies');
  if(/(s|x|ch|sh)$/i.test(w)) return w + 'es';
  return w + 's';
}
// "Sinks & faucets" → "Sink & faucet", "Smoke & CO detectors" → "Smoke & CO detector"
if(typeof _v2Need === 'function'){
  const _origNeed = _v2Need;
  const _one = w => /ies$/i.test(w) ? w.replace(/ies$/i, 'y') : /(ches|shes|xes)$/i.test(w) ? w.replace(/es$/i, '') : /[^s]s$/i.test(w) ? w.replace(/s$/i, '') : w;
  _v2Need = function(l){ const n = _origNeed(l); return /&/.test(n) && !/\(/.test(n) ? n.split(' & ').map(_one).join(' & ') : n; };
}
function slotLabel(t, l){
  if(t.__type && !_v2Pool(l).length) return `1 ${t.__type.toLowerCase()} – ${t.room}`;   // a task made on a room board, with no catalog line yet
  const n = _v2NeedQty(t, l), u = _v2Unit(l), need = _v2Need(l).toLowerCase();
  return (u === 'ea' || need.split(/\s+/).includes(u) ? `${fmt(n)} ${plural(need, n)}` : `${fmt(n)} ${u} ${need}`) + ` – ${t.room}`;
}
window.spreeSlotLabel = slotLabel;
function slots(){
  if(typeof TASKS === 'undefined') return [];
  return TASKS.map(t => { const l = _v2Line(t); return l ? {t, l, id:t.id, picked:_v2Picked(l, t)} : null; }).filter(Boolean);
}
function groupOf(s){ return S.by === 'dept' ? s.l.dept : S.by === 'room' ? s.t.room : s.t.name; }
function groups(list){
  const m = new Map();
  list.forEach(s => { const k = groupOf(s); if(!m.has(k)) m.set(k, []); m.get(k).push(s); });
  return [...m.entries()];
}
/* ── allowances: spent so far / allowance, at the top of each group ──
   The owner (e.g. Wedgewood) sets allowances at two levels:
   · Department — materials only (Kitchen: $10,000).
   · Task — materials AND labor (Countertops: $5,000).
   Department view compares materials to the department allowance. Task and
   Room views add any labor already priced on the task (labor never appears
   as a Shopping List item) and compare to the task allowances; a room's
   allowance is the sum of its tasks'.
   Wireframe data: the two above are set; every other allowance is a round
   figure near what it should cost, about one in four set tight. */
// false = no allowance set (the heading shows spend only).
const DEPT_ALLOW = {'Kitchen': 10000, 'Appliances': false, 'Hardware': false, 'Heating & Cooling': false};
const TASK_ALLOW = {'Countertops@Kitchen': 5000,
  'Appliances@Kitchen': false, 'Toilet@Primary Bath': false, 'Toilet@Bathroom': false,
  'Door opener@Garage': false, 'Garage lighting@Garage': false, 'Powerwash@Garage': false,
  'Door hardware@Primary Bed': false, 'Door hardware@Bedroom 2': false, 'Door hardware@Bathroom': false, 'Door hardware@Primary Bath': false};
// Rooms can carry their own allowance (materials + labor); a room without one
// falls back to the total of its tasks' allowances.
const ROOM_ALLOW = {'Kitchen': 18000, 'Primary Bath': 6000, 'Primary Bed': 3500};
// The project budget: the one firm total (materials + labor).
// KaiWeb: the job's own budget (set on Overview) — read live, so an edit there shows here.
const _budget = () => (typeof JOB_BUDGET !== 'undefined' ? JOB_BUDGET : 40000);
const _n = v => { const x = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(x) ? x : 0; };
function _spent(list){ return list.reduce((a, s) => a + s.picked.reduce((b, p) => b + p.cost, 0), 0); }
// Labor already priced on the task's chosen options (rate × quantity).
function _laborOf(t){
  return (t.options || []).filter(o => o.added).reduce((a, o) =>
    a + (o.products || []).reduce((b, x) => b + _n(x.labor) * _n(x.qty), 0), 0);
}
function _labor(list){ const seen = new Set(); return list.reduce((a, s) => seen.has(s.t.id) ? a : (seen.add(s.t.id), a + _laborOf(s.t)), 0); }
function _estCost(s){
  if(s.picked.length) return s.picked.reduce((b, p) => b + p.cost, 0);
  const prices = _v2Pool(s.l).map(x => ((offersForSku(x.sku) || [])[0] || {}).price || x.price || x.cost).map(Number).filter(n => n > 0).sort((a, b) => a - b);
  return prices.length ? prices[Math.floor(prices.length / 2)] * (_num(_v2NeedQty(s.t, s.l)) || 1) : 0;
}
function _roundAllow(est, seed){
  const h = typeof _skuHash === 'function' ? _skuHash(String(seed)) : String(seed).length;
  const f = h % 4 === 0 ? 0.92 : 1.15;
  const step = est > 5000 ? 500 : est > 1000 ? 100 : 50;
  return Math.max(step, Math.round(est * f / step) * step);
}
function _deptAllow(g, list){
  if(DEPT_ALLOW[g] == null) DEPT_ALLOW[g] = _roundAllow(list.reduce((a, s) => a + _estCost(s), 0) || 250 * list.length, 'dept:' + g);
  return DEPT_ALLOW[g];
}
function _taskAllow(t){
  const k = t.name + '@' + t.room;
  if(TASK_ALLOW[k] == null){
    const mat = slots().filter(s => s.t.id === t.id).reduce((a, s) => a + _estCost(s), 0);
    const est = mat + _laborOf(t);
    TASK_ALLOW[k] = _roundAllow(est > 100 ? est : 250, 'task:' + k);   // nothing priced yet: a placeholder
  }
  return TASK_ALLOW[k];
}
function _allowHtml(g, list){
  const whole = n => '$' + Math.round(n).toLocaleString('en-US');
  const mat = _spent(list);
  let a, sp, why;
  if(S.by === 'dept'){
    a = _deptAllow(g, list); sp = mat;
    why = [['Materials', money(mat)], ['Department allowance', a ? whole(a) : '']];
  } else {
    const tasks = [...new Map(list.map(s => [s.t.id, s.t])).values()];
    const own = S.by === 'room' ? ROOM_ALLOW[g] : null;
    // a room with no allowance of its own falls back to its tasks' total, but only if every task has one
    const ta = tasks.map(_taskAllow);
    a = own != null ? own : ta.every(x => x) ? ta.reduce((x, y) => x + y, 0) : false;
    const lab = _labor(list); sp = mat + lab;
    why = [['Materials', money(mat)], ['Labor', lab ? money(lab) : 'not priced yet'], [S.by === 'task' ? 'Task allowance' : own != null ? 'Room allowance' : 'Task allowances, total', a ? whole(a) : '']];
  }
  if(!a){                                   // no allowance set: spend only
    why[why.length - 1] = ['Allowance', 'not set'];
    return `<span class="sp-grp-n sp-allow has-tip" tabindex="0" role="link" onclick="spreeCostBook(event)" onkeydown="if(event.key==='Enter')spreeCostBook(event)">${money(sp)}${_tip(why)}</span>`;
  }
  const over = sp > a;
  if(over) why.push(['Over by', money(sp - a)]);
  return `<span class="sp-grp-n sp-allow has-tip${over ? ' is-over' : ''}" tabindex="0" role="link" onclick="spreeCostBook(event)" onkeydown="if(event.key==='Enter')spreeCostBook(event)">${money(sp)} / ${whole(a)}${_tip(why)}</span>`;
}
// Shop header: everything spent so far (cart after bulk savings + labor already priced) / budget.
function _budgetHtml(cart){
  /* KaiWeb: one money story (kwMoney in kaiweb-shop.js). The cart is materials,
     so it is read against the scope's materials estimate; the hover shows the
     whole chain up to the job budget. */
  if(typeof window.kwMoneyShopHtml === 'function'){ const h = window.kwMoneyShopHtml(); if(h) return h; }
  const BUDGET = _budget();
  if(!BUDGET || typeof TASKS === 'undefined') return '';
  const lab = TASKS.reduce((a, t) => a + _laborOf(t), 0), sp = cart + lab, over = sp > BUDGET;
  const why = [['Cart', money(cart)], ['Labor', money(lab)], ['Project budget', '$' + BUDGET.toLocaleString('en-US')]];
  if(over) why.push(['Over by', money(sp - BUDGET)]);
  return `<span class="sp-meta sp-allow has-tip${over ? ' is-over' : ''}" tabindex="0" role="link" onclick="spreeCostBook(event)" onkeydown="if(event.key==='Enter')spreeCostBook(event)">${money(sp)} / $${BUDGET.toLocaleString('en-US')} budget${_tip(why)}</span>`;
}
// The breakdown that opens on hover (or keyboard focus) over a total.
function _tip(rows){
  return `<span class="sp-tip" role="tooltip">${rows.map(([k, v]) => `<span class="sp-tip-k">${esc(k)}</span><span class="sp-tip-v">${esc(v)}</span>`).join('')}<span class="sp-tip-go">Click to open in Cost Book</span></span>`;
}
/* Clicking a total opens it in the Cost Book (a separate page, not built yet).
   The wireframe only says where it would go. */
window.spreeCostBook = function(e){
  e.stopPropagation();
  toast('Would open this in the Cost Book (page not built yet)');
}
function fits(s, sku){ return _v2Pool(s.l).some(x => x.sku === sku); }
/* Stores to show: S.ret is 'all', or one or more retailer keys joined by commas
   ('hd', 'hd,low'). Several stores = the first offer among them, as All does. */
const _rets = () => S.ret === 'all' ? [] : S.ret.split(',');
const _retOne = () => _rets().length === 1 ? S.ret : 'all';   // where a pick is pinned: one store, or wherever is best
const _retName = () => { const r = _rets(); return !r.length ? 'All stores' : r.length === 1 ? supplierName(r[0]) : `${r.length} stores`; };
function offerFor(x){
  const offers = offersForSku(x.sku), r = _rets();
  return !r.length ? offers[0] || null : offers.find(o => r.includes(o.supplier)) || null;
}
// Tick or untick a store. "All stores" clears the rest; none left, or every one, is all.
window.spreeRet = function(k){
  const keys = RET.map(x => x[0]).filter(x => x !== 'all');
  let r = _rets();
  if(k === 'all') r = [];
  else r = r.includes(k) ? r.filter(x => x !== k) : r.concat(k);
  S.ret = !r.length || r.length === keys.length ? 'all' : keys.filter(x => r.includes(x)).join(',');
  render();
};
/* ── how you're getting it: shipped (to an address) or store pickup (at a store per retailer) ──
   Chosen in Shop; drives the availability and dates on every product, and the
   default for each retailer in Review. Wireframe data: two addresses, a store
   or two per retailer; Wayfair is online only. */
// Delivery address and pickup search both default to the property; either can be typed over.
const PROPERTY = {addr:'3484 South Main Street, Salt Lake City, UT 84115', zip:'84115'};
// mode is what the shelves show: both ways (default), delivery only, or pickup only.
// pick[sku] is the way chosen for one product in its pop-up.
const FUL = {mode:'both', pick:{}, addr:PROPERTY.addr, near:PROPERTY.zip, store:{}, open:false,
  recent:{addr:['1200 Market Street, Salt Lake City, UT 84101'], near:[]}};   // one sample recent search
// Address / ZIP box: type, or pick the property or a recent search from the list under it.
function _combo(k, ph, label){
  const val = FUL[k], prop = k === 'addr' ? PROPERTY.addr : `${PROPERTY.zip} · property`, propV = k === 'addr' ? PROPERTY.addr : PROPERTY.zip;
  const rec = FUL.recent[k].filter(r => r !== propV);
  const row = (v, t, cur) => `<button type="button" class="sp-combo-o${cur ? ' is-cur' : ''}" onmousedown="event.preventDefault();spreeFul('${k}',${esc(JSON.stringify(v))});document.activeElement.blur()">${esc(t)}</button>`;
  return `<div class="sp-combo">
      <span class="sp-combo-in"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 10.5l3.5 3.5" stroke="currentColor" stroke-width="1.4"/></svg>
        <input type="text" class="sp-ful-in is-${k}" value="${esc(val)}" placeholder="${esc(ph)}" aria-label="${esc(label)}" autocomplete="off"
          onfocus="this.select()" onkeydown="if(event.key==='Enter')this.blur()" onchange="spreeFulSearch('${k}',this.value)"></span>
      <div class="sp-combo-pop" role="listbox">
        <span class="sp-combo-h">Property</span>${row(propV, prop, val === propV)}
        ${rec.length ? `<span class="sp-combo-h">Recently searched</span>${rec.map(r => row(r, r, val === r)).join('')}` : ''}
      </div>
    </div>`;
}
window.spreeFulSearch = function(k, v){
  v = v.trim(); const propV = k === 'addr' ? PROPERTY.addr : PROPERTY.zip;
  if(!v) v = propV;
  if(v !== propV) FUL.recent[k] = [v].concat(FUL.recent[k].filter(r => r !== v)).slice(0, 4);
  spreeFul(k, v);
};
const STORES = {hd:[['Midvale #4402', 2.1], ['Sugar House #4418', 5.6]], low:[['Murray #1690', 2.8], ['West Valley #2711', 6.2]], wf:[]};
const _mi = mi => FUL.near === PROPERTY.zip ? mi : Math.round((mi + ((typeof _skuHash === 'function' ? _skuHash(FUL.near) : 3) % 40) / 10) * 10) / 10;
const _storeOf = sup => { const l = STORES[sup] || []; return l.length ? l[Math.min(FUL.store[sup] || 0, l.length - 1)] : null; };
const _day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-US', {month:'short', day:'numeric'}); };
const _range = (a, b) => { const x = _day(a), y = _day(b); return x.split(' ')[0] === y.split(' ')[0] ? `${x}–${y.split(' ')[1]}` : `${x}–${y}`; };
// Availability for one offer, for shipping or pickup: {t: text, ok: can get it this way}
function _avail(o, how){
  if(!o) return {t:'', ok:false};
  const h = (typeof _skuHash === 'function' ? _skuHash(o.supplier + (o.sku || '') + o.price) : 0) % 3;
  if((how || (FUL.mode === 'pickup' ? 'pickup' : 'ship')) === 'pickup'){
    const st = _storeOf(o.supplier);
    if(!st) return {t:'Delivery only', ok:false};
    if(o.stock === 'out') return {t:'Not at this store', ok:false};
    if(o.stock === 'ships') return {t:`Pickup ${_day(9)} · ship to store`, ok:true};
    if(o.stock === 'low') return {t:'Pickup today · 3 left', ok:true};
    return {t: h === 2 ? 'Pickup tomorrow' : `Pickup today · ${8 + h * 7} in stock`, ok:true};
  }
  if(o.stock === 'out') return {t:'Unavailable', ok:false};
  if(o.stock === 'ships') return {t:`Arrives ${_range(18, 24)}`, ok:true};
  return {t:`Arrives ${_range(3 + h, 5 + h)}`, ok:true};
}
// One control: where you are (delivery address, and the stores near it), what to show, and which stores.
// One control. Delivery and pickup each have their own location (deliver to the
// site, pick up near home), and each can be turned off.
function _fulHtml(){
  const sups = Object.keys(STORES).filter(k => STORES[k].length);
  const dOn = FUL.mode !== 'pickup', pOn = FUL.mode !== 'ship';
  const short = v => String(v).split(',')[0];
  const label = [dOn ? `<b>${esc(short(FUL.addr))}</b>` : '', pOn ? `<span class="sp-meta">${dOn ? '· ' : ''}Pickup near</span> <b>${esc(short(FUL.near))}</b>` : ''].join(' ');
  const box = (k, t, on) => `<label class="sp-ful-h"><input type="checkbox"${on ? ' checked' : ''} onchange="spreeShow('${k}',this.checked)"><span>${t}</span></label>`;
  return `<div class="sp-ful">
      <button type="button" class="sp-ful-chip${FUL.open ? ' is-open' : ''}" onclick="spreeFul('open',!${FUL.open})" aria-expanded="${FUL.open}" title="${esc([dOn ? 'Deliver to ' + FUL.addr : '', pOn ? 'Pick up near ' + FUL.near : ''].filter(Boolean).join(' · '))} — set once for the project">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="6.5" r="1.8" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>
        <span class="sp-ful-sum">${esc(dOn && pOn ? 'Delivery & pickup' : dOn ? 'Delivery' : 'Pickup')} · ${esc(_retName())}</span><span aria-hidden="true">${FUL.open ? '▴' : '▾'}</span></button>
      ${FUL.open ? `<div class="sp-fdd-pop sp-ful-pop">
        <section class="sp-ful-sec">
          <span class="sp-k">Show products from</span>
          ${RET.map(([k, t]) => `<label class="sp-fdd-opt"><input type="checkbox"${k === 'all' ? (S.ret === 'all' ? ' checked' : '') : _rets().includes(k) ? ' checked' : ''} onchange="spreeRet('${k}')"><span>${esc(k === 'all' ? 'All stores' : t)}</span></label>`).join('')}
        </section>
        <section class="sp-ful-sec${dOn ? '' : ' is-off'}">
          ${box('ship', 'Delivery', dOn)}
          ${dOn ? `<span class="sp-k">Deliver to</span>${_combo('addr', 'Search by address', 'Delivery address')}` : ''}
        </section>
        <section class="sp-ful-sec${pOn ? '' : ' is-off'}">
          ${box('pickup', 'Pickup', pOn)}
          ${pOn ? `<span class="sp-k">Pick up near</span>${_combo('near', 'Search by city, address or ZIP', 'Pick up near')}
            <span class="sp-k">Stores</span>
            ${sups.map(k => `<div class="sp-ful-ret"><b>${esc(supplierName(k))}</b>${STORES[k].map(([n, mi], i) => `<label class="sp-fdd-opt"><input type="radio" name="st-${k}"${(FUL.store[k] || 0) === i ? ' checked' : ''} onchange="spreeStore('${k}',${i})"><span>${esc(n)}</span><small>${_mi(mi)} mi</small></label>`).join('')}</div>`).join('')}
            <p class="sp-meta">Wayfair is delivery only.</p>` : ''}
        </section>
      </div>` : ''}
    </div>`;
}
window.spreeFul = function(k, v){ FUL[k] = v;
 if(k === 'mode') REV.how = {}; render(); };
// Each box turns its way on or off on its own. Unticking the only one left
// switches to the other, so one is always shown.
window.spreeShow = function(k, on){
  const other = k === 'ship' ? 'pickup' : 'ship';
  const has = {ship:FUL.mode !== 'pickup', pickup:FUL.mode !== 'ship'};
  has[k] = on;
  if(!has.ship && !has.pickup) has[other] = true;
  spreeFul('mode', has.ship && has.pickup ? 'both' : has.ship ? 'ship' : 'pickup');
};
window._paintDetailPub = function(){ _paintDetail(); };
window.spreePick = function(sku, h){ FUL.pick[sku] = h; render(); _paintDetail(); };
window.spreeStore = function(sup, i){ FUL.store[sup] = i; render(); };
document.addEventListener('click', e => { if(FUL.open && !(e.target.closest && e.target.closest('.sp-ful'))){ FUL.open = false; render(); } });
function stockTxt(o){ return !o ? '' : o.stock === 'out' ? 'Unavailable' : o.stock === 'ships' ? 'Ships' : o.stock === 'low' ? 'Low stock' : 'In stock'; }

/* ── picking ── */
function place(s, sku, sup){
  const from = s.picked[0] ? s.picked[0].sku : null;
  const cat = _v2Apply(s.t, s.l, sku, from, sup || _retOne());
  if(!cat) return false;
  toast(`${cat.brand} ${cat.name} → ${slotLabel(s.t, s.l)}`);
  if(typeof renderAll === 'function') renderAll();
  render();
  return true;
}
window.spreeAdd = function(sku, key, hostId){
  // Shop page: the slot selected in the Shopping List. Side panel: also the task open in the Editor.
  let s = _slotOfKey(key) || (S.active != null ? slots().find(x => x.id === S.active) : (hostId ? _sideTarget() : null));
  if(!s){
    const can = slots().filter(x => fits(x, sku));
    if(can.length === 1) s = can[0];
    else if(can.length > 1){ spreeDetail(null, key || '', sku, hostId || ''); return; }   // choose where in the pop-up
    else { const x = catalogFind(sku); toast(`Nothing in this scope needs ${x ? x.name : 'that product'}.`); return; }
  }
  if(!fits(s, sku)){ const x = catalogFind(sku); toast(`${x ? x.name : 'That product'} doesn't fit this shopping list item. It needs a ${_v2Need(s.l).toLowerCase()}.`); return; }
  place(s, sku);
};
/* Is this product in the cart, as far as this button is concerned? With an
   item selected on the Shopping List: in that item. Otherwise: anywhere. */
function _inCartFor(sku, act){
  if(act) return act.picked.some(p => p.sku === sku);
  return slots().some(s => s.picked.some(p => p.sku === sku));
}
// Remove a product: from the selected item if it's there, else from every item holding it.
window.spreeRemoveSku = function(sku, key){
  const act = _slotOfKey(key) || (S.active != null ? slots().find(s => s.id === S.active) : null);
  const from = act && act.picked.some(p => p.sku === sku) ? [act] : slots().filter(s => s.picked.some(p => p.sku === sku));
  if(!from.length) return;
  from.forEach(s => _swapTaskProduct(s.l, s.t, sku, null));
  const x = catalogFind(sku);
  toast(`Removed ${x ? x.name : 'product'} from ${from.length === 1 ? slotLabel(from[0].t, from[0].l) : from.length + ' shopping list items'}`);
  if(_detail.sku === sku) _detail.tickSku = null;
  if(typeof renderAll === 'function') renderAll();
  render(); if(_detail.sku) _paintDetail();
};
window.spreeClear = function(id){
  const s = slots().find(x => x.id === id); if(!s || !s.picked.length) return;
  // The Editor's own swap with no new product: the row's quantity goes to
  // zero, so the slot is blank again and every total updates.
  const names = s.picked.map(p => { const c = _v2Cat(s.l, p.sku); return c ? c.name : p.sku; });
  s.picked.forEach(p => _swapTaskProduct(s.l, s.t, p.sku, null));
  toast(`Removed ${names.join(', ')} from ${slotLabel(s.t, s.l)}`);
  if(typeof renderAll === 'function') renderAll();
  render();
};

/* ── drag and drop ── */
/* While a product is being dragged, the Shopping List regroups around it:
   in each room / department / task, every item the product fits is pulled
   into one group you can drop on to fill them all (or drop on one item to
   fill just that one). If those items span several groups, a bar at the top
   of the list fills all of them. */
let _dragSku = null;
window.spreeDrag = function(e, sku){
  e.dataTransfer.setData('text/plain', sku);
  e.dataTransfer.effectAllowed = 'copy';
  document.body.classList.add('pg-dragging');
  _dragSku = sku;
  // after the drag image is taken, so redrawing the list doesn't disturb it
  setTimeout(() => {
    if(!_dragSku) return;
    const a = _navAnchor(sku);
    _redrawNav();
    _markDrop(sku);
    _restoreAnchor(a);      // the item you were looking at stays where it was
    _jumpToTargets();       // only moves the list if no drop target is in view
  }, 0);
};
function _redrawNav(){
  const nav = document.getElementById('pgNav'); if(!nav || nav.hidden) return;
  const nb = nav.querySelector('.pg-nav-b'), keep = nb ? nb.scrollTop : 0;
  nav.innerHTML = navHtml();
  const nb2 = nav.querySelector('.pg-nav-b'); if(nb2) nb2.scrollTop = keep;
}
/* Remember which Shopping List item is at the top of the view and where, so a
   redraw (regrouping while dragging, or back after) doesn't shift the list. */
function _navAnchor(sku){
  const nb = document.querySelector('#pgNav .pg-nav-b'); if(!nb) return null;
  const nr = nb.getBoundingClientRect();
  const vis = [...nb.querySelectorAll('.sp-slot[data-id]')].filter(x => { const r = x.getBoundingClientRect(); return r.bottom > nr.top + 4 && r.top < nr.bottom - 4; });
  // while dragging, hold still the item you're most likely aiming for: the first visible one the product fits
  const el = (sku && vis.find(x => { const s = slots().find(y => y.id === +x.dataset.id); return s && fits(s, sku); })) || vis[0];
  return el ? {id: el.dataset.id, off: el.getBoundingClientRect().top - nr.top} : null;
}
function _restoreAnchor(a){
  const nb = document.querySelector('#pgNav .pg-nav-b'); if(!nb || !a) return;
  const el = nb.querySelector(`.sp-slot[data-id="${a.id}"]`); if(!el) return;
  const nr = nb.getBoundingClientRect();
  nb.scrollTop += (el.getBoundingClientRect().top - nr.top) - a.off;
}
function _markDrop(sku){
  // room boards on the Measurements page take drops too
  document.querySelectorAll('.pg-sw[data-slot]').forEach(el => {
    const s = slots().find(x => x.id === +el.dataset.slot);
    el.classList.toggle('can-drop', !!(s && fits(s, sku)));
  });
  document.querySelectorAll('.sp-slot').forEach(el => {
    const s = slots().find(x => x.id === +el.dataset.id);
    el.classList.toggle('can-drop', !!(s && fits(s, sku)));
  });
  document.querySelectorAll('.sp-line').forEach(g => {
    const ids = (g.dataset.ids || '').split(',').map(Number);
    const ss = slots().filter(x => ids.includes(x.id));
    g.classList.toggle('can-drop', ss.length > 1 && ss.every(x => fits(x, sku)));
  });
}
// If none of the places it can go are in view, the list jumps to the first (an empty one if any).
function _jumpToTargets(){
  const nav = document.querySelector('#pgNav .pg-nav-b'); if(!nav) return;
  const targets = [...nav.querySelectorAll('.sp-grp .sp-slot.can-drop')];
  const nr = nav.getBoundingClientRect();
  const seen = targets.some(el => { const r = el.getBoundingClientRect(); return r.bottom > nr.top + 20 && r.top < nr.bottom - 20; });
  const go = targets.find(el => el.classList.contains('is-blank')) || targets[0];
  if(!go || seen) return;
  const grp = go.closest('.sp-line') || go.closest('.sp-grp');
  const top = grp.getBoundingClientRect().top - nr.top + nav.scrollTop - 8 - (nav.querySelector('.sp-line-all') ? 70 : 0);
  nav.scrollTo({top: Math.max(0, top), behavior: 'smooth'});
}
/* While dragging, holding near the top or bottom edge of the Shopping List scrolls it. */
document.addEventListener('dragover', e => {
  if(!document.body.classList.contains('pg-dragging')) return;
  const nav = document.querySelector('#pgNav .pg-nav-b'); if(!nav) return;
  const r = nav.getBoundingClientRect();
  if(e.clientX < r.left || e.clientX > r.right) return;
  if(e.clientY < r.top + 48) nav.scrollTop -= 14;
  else if(e.clientY > r.bottom - 48) nav.scrollTop += 14;
});
window.spreeDragEnd = function(){
  document.body.classList.remove('pg-dragging');
  const was = _dragSku; _dragSku = null;
  document.querySelectorAll('.sp-slot, .sp-line, .pg-sw').forEach(x => x.classList.remove('can-drop', 'is-over'));
  if(was){ const a = _navAnchor(was); _redrawNav(); _restoreAnchor(a); }   // back to the usual grouping, without a jump
};
window.spreeOver = function(e, el){ if(el.classList.contains('can-drop')){ e.preventDefault(); e.stopPropagation(); el.classList.add('is-over'); const g = el.closest('.sp-line'); if(g) g.classList.remove('is-over'); } };
window.spreeLeave = function(el){ el.classList.remove('is-over'); };
/* Items in one department that take the same product sit in one group. Drop
   on an item fills that item; drop on the group (its heading or frame) fills
   every item in it. The bold border shows which. */
function _groupBox(ss, title){
  const filled = ss.filter(s => s.picked.length).length;
  const b0 = !_dragSku && filled === ss.length ? bundleOf(ss[0]) : null;
  const isBundle = b0 && ss.every(s => { const b = bundleOf(s); return b && b.key === b0.key; });
  if(isBundle){
    const sub = ss.reduce((a, s) => a + s.picked[0].cost, 0), save = _r2(sub * b0.pct / 100);
    return `<div class="sp-line is-bundle" data-ids="${ss.map(s => s.id).join(',')}"
      ondragover="spreeOverLine(event,this)" ondragleave="spreeLeaveLine(event,this)" ondrop="spreeDropLine(event,this)">
      <div class="sp-line-hd" title="${esc(_bundleWhy(b0))}"><span>${ss.length === b0.items.length ? `Bulk · ${ss.length} items` : `Bulk · ${ss.length} of ${b0.items.length} items`}</span><span class="sp-line-n">${esc(_bundleDeal(b0))}</span></div>

      <div class="sp-line-items">${ss.map(slotHtml).join('')}</div>
      <div class="sp-line-tip">Drop here to fill all ${ss.length}</div>
    </div>`;
  }
  return `<div class="sp-line" data-ids="${ss.map(s => s.id).join(',')}"
      ondragover="spreeOverLine(event,this)" ondragleave="spreeLeaveLine(event,this)" ondrop="spreeDropLine(event,this)">
      <div class="sp-line-hd"><span class="sp-clip" title="${esc(title)}">${esc(title)}</span></div>
      <div class="sp-line-items">${_dragSku ? ss.map(slotHtml).join('') : _bulkRuns(ss)}</div>
      <div class="sp-line-tip">Drop here to fill all ${ss.length}</div>
    </div>`;
}
// Inside a mixed group, items bought in bulk sit together under the same grey
// rule and heading a whole-bulk group gets, so bulk always looks the same.
function _bulkRuns(ss){
  const runs = new Map(), rest = [];
  ss.forEach(s => { const b = bundleOf(s); if(b){ if(!runs.has(b.key)) runs.set(b.key, {b, ss:[]}); runs.get(b.key).ss.push(s); } else rest.push(s); });
  return [...runs.values()].map(({b, ss:rs}) => _bulkBlock(b, rs)).join('') + rest.map(slotHtml).join('');
}
// One look for bulk everywhere: a grey rule with a "Bulk" heading. When the
// rest of the bulk buy sits in other rooms / tasks, the heading says so.
function _bulkBlock(b, rs){
  const n = b.items.length;
  const what = rs.length === n ? `Bulk · ${n} items` : `Bulk · ${rs.length} of ${n} items`;
  return `<div class="sp-line is-bundle is-sub">
      <div class="sp-line-hd" title="${esc(_bundleWhy(b))}"><span>${what}</span><span class="sp-line-n">${esc(_bundleDeal(b))}</span></div>
      <div class="sp-line-items">${rs.map(slotHtml).join('')}</div>
    </div>`;
}
// While dragging: the items this product fits, together, where the first one was.
function _dragClusters(list){
  const fit = list.filter(s => fits(s, _dragSku));
  if(fit.length < 2) return list.map(slotHtml).join('');
  const sameLine = fit.every(s => s.l.key === fit[0].l.key);
  const title = sameLine ? _v2LineName(fit[0].l) : 'Fits this product';
  let done = false;
  return list.map(s => {
    if(!fit.includes(s)) return slotHtml(s);
    if(done) return '';
    done = true; return _groupBox(fit, title);
  }).join('');
}
// While dragging: if the items it fits are in more than one group, one bar fills them all.
function _dragAllBar(all){
  const fit = all.filter(s => fits(s, _dragSku));
  const nGroups = new Set(fit.map(groupOf)).size;
  if(fit.length < 2 || nGroups < 2) return '';
  const word = S.by === 'room' ? 'rooms' : S.by === 'dept' ? 'departments' : 'tasks';
  return `<div class="sp-line sp-line-all" data-ids="${fit.map(s => s.id).join(',')}"
    ondragover="spreeOverLine(event,this)" ondragleave="spreeLeaveLine(event,this)" ondrop="spreeDropLine(event,this)">
    <div class="sp-line-hd"><span>All ${fit.length} items it fits</span><span class="sp-line-n">across ${nGroups} ${word}</span></div>
    <div class="sp-line-tip">Drop here to fill all ${fit.length}</div>
  </div>`;
}
function _lineClusters(list){
  // Department view: items of the same product type together.
  // A bulk buy is one block for the whole department, even when its items are
  // different product types (LVP bought for the tile and carpet items too).
  const order = [], by = new Map(), bulk = new Map();
  list.forEach(s => {
    const b = _dragSku ? null : bundleOf(s);
    const k = b ? 'b:' + b.key : 'l:' + s.l.key;
    if(b) bulk.set(k, b);
    if(!by.has(k)){ by.set(k, []); order.push(k); } by.get(k).push(s);
  });
  return order.map(k => { const ss = by.get(k);
    if(bulk.has(k)) return _bulkBlock(bulk.get(k), ss);
    return ss.length < 2 ? slotHtml(ss[0]) : _groupBox(ss, _v2LineName(ss[0].l)); }).join('');
}
// Room / Task view: items in this section holding the same bundle, together.
function _bundleClusters(list){
  const done = new Set();
  return list.map(s => {
    if(done.has(s.id)) return '';
    const b = bundleOf(s);
    const here = b ? list.filter(x => b.items.some(it => it.s.id === x.id)) : [];
    if(here.length < 2){ done.add(s.id); return b && !_dragSku ? _bulkBlock(b, [s]) : slotHtml(s); }
    here.forEach(x => done.add(x.id));
    return _groupBox(here, _v2LineName(here[0].l));
  }).join('');
}
window.spreeOverLine = function(e, g){
  if(!g.classList.contains('can-drop')) return;
  if(e.target.closest && e.target.closest('.sp-slot')){ g.classList.remove('is-over'); return; }
  e.preventDefault(); g.classList.add('is-over');
  g.querySelectorAll('.sp-slot.is-over').forEach(x => x.classList.remove('is-over'));
};
window.spreeLeaveLine = function(e, g){ if(!e.relatedTarget || !g.contains(e.relatedTarget)) g.classList.remove('is-over'); };
window.spreeDropLine = function(e, g){
  e.preventDefault();
  const sku = e.dataTransfer.getData('text/plain');
  const ids = (g.dataset.ids || '').split(',').map(Number);
  spreeDragEnd();
  const ss = slots().filter(s => ids.includes(s.id) && fits(s, sku));
  if(!sku || !ss.length) return;
  ss.forEach(s => { const from = s.picked[0] ? s.picked[0].sku : null; _v2Apply(s.t, s.l, sku, from, _retOne()); });
  const x = catalogFind(sku);
  toast(`${x ? x.name : 'Product'} added to all ${ss.length} items`);
  if(typeof renderAll === 'function') renderAll();
  render();
};
window.spreeDrop = function(e, id){
  e.preventDefault(); e.stopPropagation();
  const sku = e.dataTransfer.getData('text/plain');
  spreeDragEnd();
  const s = slots().find(x => x.id === id); if(!s || !sku) return;
  if(!fits(s, sku)){ toast(`That shopping list item needs a ${_v2Need(s.l).toLowerCase()}.`); return; }
  S.active = id;
  place(s, sku);
};

/* ── bundles ──
   The same product, from the same retailer, in two or more Shopping List
   items is a bundle. Retailers often price volume lower; the wireframe uses
   a sample rule: 2 items 5% off, 3 items 7%, 4 or more 10%. Savings are shown
   on top of the scope's own costs; they don't change the task costs. */
const BUNDLE_PCT = n => n >= 4 ? 10 : n === 3 ? 7 : n === 2 ? 5 : 0;
/* Packs: products sold by the each (and paint by the gallon) also come in
   multi-packs with a lower unit price. Sample sizes and discounts: single,
   2-pack 4% off, 4-pack 8%, 6-pack 12%. Bundling pools the quantity across
   items, so 4 + 1 + 1 can be one 6-pack instead of a 4-pack and two singles. */
const PACKS = [{n:1, off:0}, {n:2, off:.04}, {n:4, off:.08}, {n:6, off:.12}];
const _PACK_SECTIONS = new Set(['lighting', 'ceilingfan', 'detector', 'hardware', 'exhaust', 'blinds', 'paint']);
function packable(cat){ return !!cat && _PACK_SECTIONS.has(cat.section); }
const _r2 = v => Math.round(v * 100) / 100;
// Cheapest set of packs covering qty units (a few spare allowed when that's cheaper).
function bestPacks(qty, rate){
  qty = Math.max(0, Math.ceil(qty)); if(!qty) return {cost:0, packs:[], units:0};
  const max = qty + PACKS[PACKS.length - 1].n - 1;
  const best = new Array(max + 1).fill(null); best[0] = {cost:0, packs:[]};
  for(let u = 1; u <= max; u++){
    PACKS.forEach(pk => {
      if(pk.n > u || !best[u - pk.n]) return;
      const c = best[u - pk.n].cost + pk.n * rate * (1 - pk.off);
      if(!best[u] || c < best[u].cost - 1e-9) best[u] = {cost:c, packs:best[u - pk.n].packs.concat(pk.n)};
    });
  }
  let pick = null, units = 0;
  for(let u = qty; u <= max; u++) if(best[u] && (!pick || best[u].cost < pick.cost - 1e-9)){ pick = best[u]; units = u; }
  return {cost:_r2(pick.cost), packs:pick.packs.sort((a, b) => b - a), units};
}
// "1 × 6-pack", "4-pack + 2 singles"
function packText(packs){
  const c = new Map(); packs.forEach(n => c.set(n, (c.get(n) || 0) + 1));
  return [...c.entries()].sort((a, b) => b[0] - a[0]).map(([n, k]) => n === 1 ? `${k} single${k > 1 ? 's' : ''}` : `${k > 1 ? k + ' × ' : ''}${n}-pack`).join(' + ');
}
function bundles(){
  const m = new Map();
  slots().forEach(s => s.picked.forEach(p => {
    const k = p.sku + '|' + supOf(p);
    if(!m.has(k)) m.set(k, {key:k, sku:p.sku, supplier:supOf(p), items:[], list:0});
    const b = m.get(k); b.items.push({s, p}); b.list += p.cost;
  }));
  return [...m.values()].filter(b => b.items.length > 1).map(b => {
    b.cat = catalogFind(b.sku) || {name:b.sku};
    if(packable(b.cat)){
      const rate = _num(b.items[0].p.rate) || 0;
      b.qty = b.items.reduce((a, it) => a + Math.ceil(_num(it.p.qty)), 0);
      b.sepPlans = b.items.map(it => bestPacks(_num(it.p.qty), rate));
      b.subtotal = _r2(b.sepPlans.reduce((a, x) => a + x.cost, 0));     // each item bought on its own
      b.plan = bestPacks(b.qty, rate);                                    // all of it bought together
      b.total = b.plan.cost;
      b.savings = _r2(Math.max(0, b.subtotal - b.total));
      b.pct = b.subtotal ? Math.round(b.savings / b.subtotal * 100) : 0;
      b.kind = 'pack';
    } else {
      b.subtotal = b.list;
      b.pct = BUNDLE_PCT(b.items.length);
      b.savings = _r2(b.subtotal * b.pct / 100);
      b.total = _r2(b.subtotal - b.savings);
      b.kind = 'volume';
    }
    return b;
  });
}
function bundleOf(s){ const p = s.picked[0]; if(!p) return null; return bundles().find(b => b.sku === p.sku && b.supplier === supOf(p)) || null; }
const _bundleChip = b => b.kind === 'pack'
  ? `<span class="sp-bundle-chip" title="${b.qty} needed across ${b.items.length} items, bought as ${esc(packText(b.plan.packs))}">Bulk ×${b.items.length} · ${esc(packText(b.plan.packs))}</span>`
  : `<span class="sp-bundle-chip" title="Same product in ${b.items.length} items: ${b.pct}% bulk discount">Bulk ×${b.items.length} · −${b.pct}%</span>`;
// Short deal text ("6-pack · save $20.80"), and the full reasoning for a hover.
function _bundleDeal(b){ const sv = b.savings > 0.005 ? `${money(b.savings)} saved` : ''; return b.kind === 'pack' ? [packText(b.plan.packs), sv].filter(Boolean).join(' · ') : sv; }
function _bundleWhy(b){
  if(b.kind !== 'pack') return `${b.cat.name}, ${b.items.length} items from ${supplierName(b.supplier)}: ${b.pct}% bulk discount`;
  const sep = packText([].concat(...b.sepPlans.map(x => x.packs)));
  return `${b.cat.name}, ${b.qty} needed. Separately: ${sep}, ${money(b.subtotal)}. Bulk: ${packText(b.plan.packs)}, ${money(b.total)}.`;
}
// Department view: the pack plan for a bundle, separately vs together.
function packPlanHtml(b){
  if(!b || b.kind !== 'pack') return '';
  const sepPacks = [].concat(...b.sepPlans.map(x => x.packs));
  const spare = b.plan.units - b.qty;
  return `<div class="sp-plan">
    <div class="sp-plan-need">Need <b>${b.qty}</b> · ${b.items.map(it => `${esc(it.s.t.room)} ${Math.ceil(_num(it.p.qty))}`).join(' · ')}</div>
    <div class="sp-plan-row"><span>Separately</span><span>${esc(packText(sepPacks))}</span><s>${money(b.subtotal)}</s></div>
    <div class="sp-plan-row is-best"><span>Bulk</span><span>${esc(packText(b.plan.packs))}${spare ? ` <small>(${spare} spare)</small>` : ''}</span><b>${money(b.total)}</b></div>
    <div class="sp-plan-save">${b.savings ? `${money(b.savings)} saved · ${money(b.total / Math.max(1, b.plan.units))} per unit` : 'Same price either way'}</div>
  </div>`;
}

function slotHtml(s){
  const on = S.active === s.id;
  const p = s.picked[0];
  const cat = p ? _v2Cat(s.l, p.sku) : null;
  const secs = [...new Set(_v2Pool(s.l).map(x => x.section).filter(Boolean))].join(' ');
  const drop = `data-secs="${secs}" ondragover="spreeOver(event,this)" ondragleave="spreeLeave(this)" ondrop="spreeDrop(event,${s.id})"`;
  if(!p) return `<div class="sp-slot is-blank${on ? ' is-on' : ''}" data-id="${s.id}" ${drop}>
    <button type="button" class="sp-slot-btn" onclick="spreeSlot(${s.id})" aria-pressed="${on}">
      <span class="sp-slot-img">+</span>
      <span class="sp-slot-b"><span class="sp-slot-l">${esc(slotLabel(s.t, s.l))}</span><span class="sp-slot-s">Choose a product</span></span>
      <span class="sp-slot-amt is-none">—</span>
    </button></div>`;
  return `<div class="sp-slot is-filled${on ? ' is-on' : ''}" data-id="${s.id}" ${drop}>
    <button type="button" class="sp-slot-btn" onclick="spreeSlot(${s.id})" aria-pressed="${on}">
      ${PH('sp-slot-img', ART.product(cat))}
      <span class="sp-slot-b"><span class="sp-slot-l">${esc(slotLabel(s.t, s.l))}</span>
        <span class="sp-slot-n">${esc(cat ? cat.name : p.sku)} <span class="sp-slot-s">· ${esc(supplierName(supOf(p)))}</span></span>
        </span>
      <span class="sp-slot-amt">${money(p.cost)}</span>
    </button>
    <!-- The quick ✕ that removed the product is gone: remove it from its shelf in the store (Remove on the card). -->
  </div>`;
}
const _shelfPage = {};
/* Product details: clicking a card opens them under its shelf row; clicking
   it again (or Close) folds them away. One open at a time. */
const _detail = {key:null, sku:null, img:0};
const _shelfLists = {};   // shelf key -> its products in shelf order, for the pop-up's arrows
window.spreeDetailNav = function(d){
  const list = _shelfLists[_detail.key] || []; const i = list.indexOf(_detail.sku);
  if(i < 0 || !list.length) return;
  _detail.sku = list[(i + d + list.length) % list.length]; _detail.img = 0;
  _paintDetail();
};
// Opens as a pop-up over the page; ✕, the backdrop or Escape closes it.
window.spreeDetail = function(e, key, sku, hostId){
  if(e && e.target && e.target.closest && e.target.closest('button,a,input')) return;
  if(e && e.type === 'keydown') e.preventDefault();
  if(key !== 'board') _detail.slot = null;
  _detail.key = key; _detail.sku = sku; _detail.host = hostId || ''; _detail.img = 0;
  _paintDetail();
};
// Photos in the pop-up: grey stand-ins in slightly different tones, so
// flipping reads as a change.
const GAL_N = 5;
const _GAL_TONES = ['#d6d6d6', '#cbcbcb', '#dedede', '#c4c4c4', '#d1d1d1'];
const _galShot = i => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="${_GAL_TONES[i % _GAL_TONES.length]}"/></svg>`);
window.spreeGal = function(d){ _detail.img = (((_detail.img || 0) + d) % GAL_N + GAL_N) % GAL_N; _paintDetail(); };
document.addEventListener('keydown', e => {
  if(!_detail.sku) return;
  if(e.key === 'ArrowRight' && e.shiftKey){ e.preventDefault(); spreeDetailNav(1); }
  else if(e.key === 'ArrowLeft' && e.shiftKey){ e.preventDefault(); spreeDetailNav(-1); }
  else if(e.key === 'ArrowRight'){ e.preventDefault(); spreeGal(1); }
  else if(e.key === 'ArrowLeft'){ e.preventDefault(); spreeGal(-1); }
});
window.spreeDetailClose = function(){ _detail.key = _detail.sku = null; _paintDetail(); };
document.addEventListener('keydown', e => { if(e.key === 'Escape' && _detail.sku) spreeDetailClose(); });
function _paintDetail(){
  let el = document.getElementById('pgDetail');
  if(!_detail.sku){ if(el) el.remove(); return; }
  const x = catalogFind(_detail.sku); if(!x){ spreeDetailClose(); return; }
  const o = offerFor(x) || (offersForSku(x.sku) || [])[0];
  // From Review's "Did you forget?": the pick belongs to one empty item, so that one is ticked.
  const act = _detail.key === 'forget' ? slots().find(s => s.id === _forgetFor[_detail.sku])
            : _detail.host ? _sideTarget() : _slotOfKey(_detail.key) || slots().find(s => s.id === S.active);
  if(!el){ el = document.createElement('div'); el.id = 'pgDetail'; el.className = 'pg-scope'; document.body.appendChild(el); }
  const list = _shelfLists[_detail.key] || [], idx = list.indexOf(_detail.sku);
  const sec = CATALOG_SECTION_LABEL[x.section] || 'products';
  const nav = list.length > 1 ? `<button type="button" class="sp-pnav is-prev" onclick="spreeDetailNav(-1)" aria-label="Previous product">‹</button>
    <button type="button" class="sp-pnav is-next" onclick="spreeDetailNav(1)" aria-label="Next product">›</button>
    <span class="sp-pnav-n">${idx + 1} of ${list.length} ${_detail.key === 'forget' ? "Kai's picks" : esc(sec.toLowerCase())}</span>` : '';
  el.innerHTML = `<div class="sp-scrim" onclick="spreeDetailClose()"></div>${detailHtml({x, o}, act, _detail.key, _detail.host)}${nav}`;
  const c = el.querySelector('.sp-detail-hd .sp-x'); if(c) c.focus();
}
const _SPECS = {
  cabinet:[['Door style','Shaker, 5-piece'],['Box','Plywood, ½ in.'],['Size','30 in. W × 12 in. D × 30 in. H'],['Hinges','Soft-close, concealed'],['Assembly','Pre-assembled']],
  counter:[['Material','Engineered quartz'],['Thickness','3 cm'],['Edge','Eased'],['Slab size','120 × 56 in.'],['Sealing','Not required']],
  tile:[['Size','3 × 6 in.'],['Material','Ceramic'],['Finish','As named'],['Coverage','10 SF per box'],['Use','Walls, backsplash']],
  appliance:[['Includes','Range, OTR microwave, dishwasher, fridge'],['Fridge','25 cu. ft.'],['Range','30 in., 5 burners'],['Finish','Fingerprint-resistant'],['Install','Delivery & haul-away']],
  floor:[['Plank','7 in. × 48 in.'],['Wear layer','12 mil'],['Waterproof','Yes'],['Install','Click-lock floating'],['Coverage','23 SF per box']],
  paint:[['Sheen','Satin'],['Size','1 gallon'],['Coverage','350–400 SF per gallon'],['Base','Water, low-VOC'],['Primer','Paint & primer in one']],
  vanity:[['Width','48 in., double sink'],['Top','Cultured marble, included'],['Faucets','Not included'],['Storage','2 doors, 4 drawers'],['Assembly','Assembled']],
  shower:[['Size','12 × 24 in.'],['Material','Porcelain'],['Finish','As named'],['Coverage','15.5 SF per box'],['Use','Walls and floors']],
  toilet:[['Bowl','Elongated'],['Height','Comfort height, 17 in.'],['Flush','1.28 GPF'],['Rough-in','12 in.'],['Seat','Included']],
  mech:[['Drive','Belt'],['Power','1¼ HP equivalent'],['Smart','Wi-Fi, app control'],['Rail','7 ft. door'],['Backup','Battery optional']],
  storage:[['Width','5–8 ft. adjustable'],['Material','Ventilated wire'],['Finish','White'],['Includes','Shelves, rods, hardware'],['Install','Wall-mounted track']],
  hardware:[['Function','As named'],['Backset','Adjustable 2⅜–2¾ in.'],['Door','1⅜–1¾ in. thick'],['Finish','As named'],['Install','No mortising']],
  lighting:[['Bulb','Integrated LED'],['Lumens','1,100'],['Color temp','3000K'],['Diameter','13 in.'],['Dimmable','Yes']],
  ceilingfan:[['Blade span','52 in.'],['Light','Integrated LED'],['Control','Pull chain + remote'],['Motor','Reversible'],['Mount','Standard or flush']],
  detector:[['Type','Smoke + CO'],['Power','Hardwired, battery backup'],['Interconnect','Yes'],['Battery','10-year sealed'],['Listing','UL 217 / 2034']],
  blinds:[['Slat','2 in. faux wood'],['Lift','Cordless'],['Size','Cut to width'],['Mount','Inside or outside'],['Use','Moisture-resistant']],
  exhaust:[['Airflow','80 CFM'],['Noise','0.8 sones'],['Sensor','Humidity'],['Duct','4 in.'],['Rating','ENERGY STAR']],
};
window.spreeTick = function(id, on){ on ? _detail.ticks.add(id) : _detail.ticks.delete(id); _paintDetail(); };
window.spreeAddDetail = function(sku){
  const todo = slots().filter(s => _detail.ticks.has(s.id) && fits(s, sku) && !s.picked.some(p => p.sku === sku));
  if(!todo.length) return;
  todo.forEach(s => { const from = s.picked[0] ? s.picked[0].sku : null; _v2Apply(s.t, s.l, sku, from, _retOne()); });
  const x = catalogFind(sku);
  toast(`${x ? x.name : 'Product'} added to ${todo.length === 1 ? slotLabel(todo[0].t, todo[0].l) : todo.length + ' shopping list items'}`);
  _detail.ticks = new Set();
  if(typeof renderAll === 'function') renderAll();
  render(); _paintDetail();
};
function detailHtml(r, act, key, hostId, narrow){
  if(!r) return '';
  const x = r.x, st = standard(x), fin = finishOf(x);
  const offers = (offersForSku(x.sku) || []).slice().sort((a, b) => a.price - b.price);
  const fits = slots().filter(s => fits_(s, x.sku));
  // Which slots Add fills: the selected slot if it fits, else every empty one it fits.
  if(_detail.tickSku !== x.sku){
    const open = fits.filter(s => !s.picked.some(p => p.sku === x.sku));
    const sel = act && open.find(s => s.id === act.id);
    const inCart = fits.some(s => s.picked.some(p => p.sku === x.sku));
    _detail.ticks = new Set(sel ? [sel.id] : inCart ? [] : open.filter(s => !s.picked.length).map(s => s.id));
    _detail.tickSku = x.sku;
  }
  const ticks = _detail.ticks;
  const specs = [['Brand', x.brand || '—'], ['SKU', x.sku], ['Category', CATALOG_SECTION_LABEL[x.section] || x.section || '—'], ['Sold by', x.unit || 'ea']]
    .concat(fin ? [['Finish', fin]] : []).concat(_SPECS[x.section] || []);
  return `<div class="sp-detail is-modal${narrow ? ' is-narrow' : ''}" role="dialog" aria-modal="true" aria-label="${esc(x.name)} details">
    <div class="sp-detail-img">
      <div class="sp-gal">
        ${PH('', _galShot(_detail.img))}
        <button type="button" class="sp-gal-b is-prev" onclick="spreeGal(-1)" aria-label="Previous photo">‹</button>
        <button type="button" class="sp-gal-b is-next" onclick="spreeGal(1)" aria-label="Next photo">›</button>
        <span class="sp-gal-n">${_detail.img + 1} / ${GAL_N}</span>
      </div>
      <div class="sp-gal-dots">${[...Array(GAL_N)].map((_, i) => `<button type="button" class="${i === _detail.img ? 'on' : ''}" onclick="spreeGal(${i - _detail.img})" aria-label="Photo ${i + 1}"></button>`).join('')}</div>
    </div>
    <div class="sp-detail-main">
      <div class="sp-detail-hd"><div><span class="sp-card-br">${esc(x.brand || '')}</span><h3>${esc(x.name)}</h3></div>
        <button type="button" class="sp-x" onclick="spreeDetailClose()" aria-label="Close details">✕</button></div>
      <div class="sp-detail-std">${stdBadge(x)}<span>${esc(st.why)}</span></div>
      <section class="sp-dsec"><h4 class="sp-k">Details</h4>
        <dl class="sp-specs">${specs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>
      ${packable(x) ? `<section class="sp-dsec"><h4 class="sp-k">Packs</h4><table class="sp-mini"><tbody>${PACKS.map(pk => { const r = (offers[0] || {price:x.price}).price; return `<tr><td>${pk.n === 1 ? 'Single' : pk.n + '-pack'}</td><td class="num"><b>${money(_r2(pk.n * r * (1 - pk.off)))}</b></td><td class="num">${money(_r2(r * (1 - pk.off)))} / unit</td><td>${pk.off ? '−' + Math.round(pk.off * 100) + '%' : ''}</td></tr>`; }).join('')}</tbody></table></section>` : ''}
      ${(() => { const best = offers.find(o => _avail({...o, sku:x.sku}, 'ship').ok) || offers[0], pk = offers.find(o => _avail({...o, sku:x.sku}, 'pickup').ok);
        const cur = FUL.pick[x.sku] || (FUL.mode === 'pickup' ? 'pickup' : 'ship');
        const opt = (k, t, sub) => `<label class="sp-getit${cur === k ? ' is-sel' : ''}"><input type="radio" name="sp-getit"${cur === k ? ' checked' : ''} onchange="spreePick('${esc(x.sku)}','${k}')"><span><b>${t}</b><small>${sub}</small></span></label>`;
        return `<section class="sp-dsec"><h4 class="sp-k">Delivery or pickup</h4>
          ${opt('ship', `Delivery to ${esc(FUL.addr.split(',')[0])}`, best ? `${esc(_avail({...best, sku:x.sku}, 'ship').t)} · ${esc(supplierName(best.supplier))}` : 'Unavailable')}
          ${opt('pickup', pk ? `Pickup at ${esc(supplierName(pk.supplier))} ${esc(_storeOf(pk.supplier)[0])}` : 'Pickup', pk ? esc(_avail({...pk, sku:x.sku}, 'pickup').t) : 'Not available for pickup nearby')}
        </section>`; })()}
      <section class="sp-dsec"><h4 class="sp-k">Prices</h4>
        <table class="sp-mini"><tbody>${offers.map(o => `<tr><td>${esc(supplierName(o.supplier))}</td><td class="num"><b>${money(o.price)}</b> / ${esc(x.unit || 'ea')}</td><td>${(FUL.mode === 'both' ? ['ship', 'pickup'] : [FUL.mode]).map(h => `<span class="sp-mini-av">${esc(_avail({...o, sku:x.sku}, h).t)}</span>`).join('')}</td></tr>`).join('')}</tbody></table></section>
      <section class="sp-dsec"><h4 class="sp-k">Shopping list</h4>
        ${fits.length ? `<ul class="sp-fits is-pick">${fits.map(s => {
          const has = s.picked.some(p => p.sku === x.sku);
          const other = !has && s.picked[0] ? (_v2Cat(s.l, s.picked[0].sku) || {name:s.picked[0].sku}).name : '';
          return `<li><label class="${has ? 'is-done' : ''}">${has ? '<span class="sp-fit-box is-done" aria-hidden="true">✓</span>'
            : `<input type="checkbox" ${ticks.has(s.id) ? 'checked' : ''} onchange="spreeTick(${s.id},this.checked)">`}
            <span>${esc(slotLabel(s.t, s.l))}</span><small>${has ? 'In cart' : other ? 'Replaces ' + esc(other) : 'Empty'}</small></label></li>`; }).join('')}</ul>`
          : '<p class="sp-meta">Nothing in this scope needs this product.</p>'}
        ${(() => { const b = bundles().find(b => b.sku === x.sku); if(b) return `<p class="sp-bundle-note">Bought in bulk across ${b.items.length} items from ${esc(supplierName(b.supplier))}: <b>${money(b.savings)} saved</b> (${b.pct}%).</p>`;
          const n = fits.filter(s => s.picked.some(p => p.sku === x.sku)).length + ticks.size; return n > 1 ? `<p class="sp-bundle-note">Adding to ${n} items makes it a bulk buy: about ${BUNDLE_PCT(n)}% off.</p>` : ''; })()}
      </section>
      ${(() => {
        const inCart = fits.some(s => s.picked.some(p => p.sku === x.sku));
        // in the cart: browse replacements for that item (its shelf, one click), or remove it
        const held = (_detail.slot && slots().find(s => s.id === _detail.slot && s.picked.some(p => p.sku === x.sku))) || fits.find(s => s.picked.some(p => p.sku === x.sku));
        if(inCart && !ticks.size) return `<div class="sp-detail-acts">${held ? `<button type="button" class="sp-card-add sp-detail-add" onclick="spreeDetailClose();spreeBoardShop(${held.id})">Browse replacements</button>` : ''}<button type="button" class="sp-card-add sp-detail-add is-remove" onclick="spreeRemoveSku('${arg(x.sku)}')">Remove</button></div>`;
        return fits.some(s => !s.picked.some(p => p.sku === x.sku)) ? `<button type="button" class="sp-card-add sp-detail-add" onclick="spreeAddDetail('${arg(x.sku)}')" ${ticks.size ? '' : 'disabled'}>Add</button>` : '';
      })()}
    </div>
  </div>`;
}
const fits_ = (s, sku) => fits(s, sku);
window.spreePage = function(key, d, hostId){ _shelfPage[key] = Math.max(0, (_shelfPage[key] || 0) + d); renderShelves(hostId || undefined); };
let _shelfW = 0;
window.addEventListener('resize', () => { const h = document.getElementById('spShelves'); if(h && h.clientWidth !== _shelfW){ _shelfW = h.clientWidth; renderShelves(); } });
// Re-lay the shelves whenever their width changes enough to fit a different number of
// cards: window resizes, panel drags, the left pane opening or closing.
const _shelfRO = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(es => es.forEach(e => {
  const h = e.target, minW = h.id === 'pgSideShelves' ? 200 : 220;
  const cols = Math.max(1, Math.floor((h.clientWidth + 12) / (minW + 12)));
  if(String(cols) !== h.dataset.cols) renderShelves(h.id === 'spShelves' ? undefined : h.id);
})) : null;
function _watchShelf(host){ if(_shelfRO && !host.__ro){ host.__ro = true; _shelfRO.observe(host); } }
function renderShelves(hostId){
  const host = document.getElementById(hostId || 'spShelves'); if(!host) return;
  const all = slots();
  const act = _relaxAll ? null : hostId ? _sideTarget() : all.find(s => s.id === S.active);
  const scopeSlots = act ? [act] : all;
  const bySec = new Map();
  const seen = new Set();
  scopeSlots.forEach(s => _v2Pool(s.l).forEach(x => {
    if(seen.has(x.sku)) return; seen.add(x.sku);
    const sec = x.section || 'other';
    if(!bySec.has(sec)) bySec.set(sec, []);
    bySec.get(sec).push(x);
  }));
  const q = S.q.trim().toLowerCase();
  // Shopping one shelf: it fills the panel — as many rows as fit the height.
  let nRows = 1;
  if(bySec.size === 1){
    nRows = 2;   // one shelf always fills at least two rows; more when the panel is tall enough
    const sc = host.closest('#pgMain, .pg-side-b, .sp-main') || host.parentElement;
    const avail = sc ? sc.getBoundingClientRect().bottom - host.getBoundingClientRect().top - 32 - 44 : 0;
    const k = hostId || 'main', ch = _cardH[k + '|' + host.clientWidth] || 0;
    // The row count holds steady while you shop: adding, removing or dropping a product
    // (a taller header, an "In cart" card) never takes a row away. Only resizing the panel does.
    const size = sc ? `${host.clientWidth}x${Math.round(sc.getBoundingClientRect().height)}` : '';
    const memo = _rowsMemo[k];
    if(memo && memo.size === size) nRows = memo.rows;
    else if(ch && avail > 0){ nRows = Math.max(2, Math.min(4, Math.round((avail + 12) / (ch + 12)))); _rowsMemo[k] = {size, rows:nRows}; }   // a little scroll to reach the arrows is fine
    else if(memo) nRows = Math.max(2, memo.rows);
  }
  // How many cards fit across: a card never gets narrower than a readable 220px
  // (200px in the side panel), 12px apart. A narrower window shows fewer cards, not smaller ones.
  const minW = hostId ? 200 : 220;
  const cols = Math.max(1, Math.floor(((host.clientWidth || 700) + 12) / (minW + 12)));
  host.dataset.cols = cols;
  _watchShelf(host, hostId);
  if(!hostId){ _renderStore(host, all, cols, q); return; }
  const html = [...bySec.entries()].map(([sec, items]) => {
    const rows = items.filter(x => !q || `${x.brand} ${x.name}`.toLowerCase().includes(q))
      .map(x => ({x, o:offerFor(x)})).filter(r => r.o);
    if(!rows.length) return '';
    rows.sort((a, b) => standard(b.x).cls.localeCompare(standard(a.x).cls) * -1 || a.o.price - b.o.price);
    // One row per shelf; more products page on with the arrows.
    const key = (hostId || 'main') + '|' + sec;
    _shelfLists[key] = rows.map(r => r.x.sku);
    const per = cols * nRows;
    const pages = Math.max(1, Math.ceil(rows.length / per));
    const pg = Math.min(_shelfPage[key] || 0, pages - 1); _shelfPage[key] = pg;
    const shown = rows.slice(pg * per, pg * per + per);
    return `<section class="sp-shelf" data-sec="${esc(sec)}">
      <div class="sp-shelf-hd">${act && !hostId && sec === [...bySec.keys()][0] ? `<button type="button" class="sp-showall" onclick="spreeShowAll()" title="Show every shelf (Esc)">Show all shelves</button>` : ''}<button type="button" class="sp-shelf-t sp-shelf-pick" onclick="spreeFocusSec('${arg(sec)}')" title="Select ${esc(CATALOG_SECTION_LABEL[sec] || sec)}: the other panels point to it">${esc(CATALOG_SECTION_LABEL[sec] || sec)}</button></div>
      <div class="sp-shelf-row" style="grid-template-columns:repeat(${cols},minmax(0,${hostId ? 280 : 300}px))">${shown.map(r => cardHtml(r.x, r.o, act, key, hostId)).join('')}</div>
      ${pages > 1 ? `<div class="sp-pager"><span class="sp-pager-n">${pg * per + 1}–${pg * per + shown.length} of ${rows.length}</span>
        <button type="button" class="sp-pager-b" onclick="spreePage('${arg(key)}',-1,'${hostId || ''}')" ${pg === 0 ? 'disabled' : ''} aria-label="Previous products">‹</button>
        <button type="button" class="sp-pager-b" onclick="spreePage('${arg(key)}',1,'${hostId || ''}')" ${pg >= pages - 1 ? 'disabled' : ''} aria-label="More products">›</button></div>` : ''}
    </section>`;
  }).join('');
  if(html){ host.innerHTML = (_relaxNote || '') + html; _relaxNote = '';
    // learn a card's height once, then lay the single shelf out again to fill the panel
    const c = host.querySelector('.sp-card'), k = (hostId || 'main') + '|' + host.clientWidth;
    if(c && bySec.size === 1){ const h = Math.round(c.getBoundingClientRect().height); if(h && !_cardH[k]){ _cardH[k] = h; delete _rowsMemo[hostId || 'main']; renderShelves(hostId); } }
    return; }
  // Never an empty shelf: widen the search step by step until there are options.
  if(_relaxing < 3){
    const keep = {ret:S.ret, q:S.q, active:S.active}; _relaxing++;
    if(S.ret !== 'all'){ _relaxNote = `<p class="sp-relax">Not at ${esc(_rets().length > 1 ? 'these stores' : supplierName(S.ret))} — showing every retailer.</p>`; S.ret = 'all'; }
    else if(q){ _relaxNote = `<p class="sp-relax">No exact match for “${esc(S.q)}” — showing the closest options.</p>`; S.q = ''; }
    else { _relaxNote = `<p class="sp-relax">Showing popular products while this shelf is stocked.</p>`; S.active = null; _relaxAll = true; }
    try{ renderShelves(hostId); } finally { S.ret = keep.ret; S.q = keep.q; S.active = keep.active; _relaxing--; _relaxAll = false; }
    return;
  }
  host.innerHTML = '';
}
/* ── THE STORE: one continuous page, one shelf per Shopping List item ──
   Shelves follow the list's own order and grouping (Room / Department / Task),
   so the middle panel mirrors the left one. Each shelf holds only the products
   that fit its item, and its Add goes to that item — so nothing has to be
   narrowed to know where a product is going. One row per shelf; the arrows
   page through the rest. */
function _renderStore(host, all, cols, q){
  const keepPage = {};
  const html = groups(all).map(([g, list]) => `<section class="sp-aisle" data-group="${esc(g)}">
      <div class="sp-aisle-hd"><button type="button" class="sp-aisle-btn" onclick="spreeAisleMenu(event,this)" aria-haspopup="menu" aria-expanded="false" title="Jump to another ${S.by === 'dept' ? 'department' : S.by === 'room' ? 'room' : 'task'}">${esc(g)}<span class="sp-aisle-car" aria-hidden="true">▾</span></button></div>
      ${list.map(s => {
        const seen = new Set();
        const rows = _v2Pool(s.l).filter(x => !seen.has(x.sku) && seen.add(x.sku))
          .filter(x => !q || `${x.brand} ${x.name}`.toLowerCase().includes(q))
          .map(x => ({x, o:offerFor(x)})).filter(r => r.o)
          .sort((a, b) => standard(b.x).cls.localeCompare(standard(a.x).cls) * -1 || a.o.price - b.o.price);
        // What's chosen for this item leads its shelf, so it's always on the first page.
        const chosen = new Set(s.picked.map(p => p.sku));
        rows.sort((a, b) => chosen.has(b.x.sku) - chosen.has(a.x.sku));
        const key = 'main|s' + s.id;
        _shelfLists[key] = rows.map(r => r.x.sku);
        const pages = Math.max(1, Math.ceil(rows.length / cols));
        const pg = Math.min(_shelfPage[key] || 0, pages - 1); _shelfPage[key] = pg;
        const shown = rows.slice(pg * cols, pg * cols + cols);
        const sec = (_v2Pool(s.l)[0] || {}).section || 'other';
        const none = q ? 'Nothing on this shelf matches the search.' : _rets().length ? `Not at ${esc(_retName())}.` : 'No products in the catalog for this yet.';
        return `<section class="sp-shelf${S.active === s.id ? ' is-cur' : ''}" data-slot="${s.id}" data-sec="${esc(sec)}">
          <div class="sp-shelf-hd"><button type="button" class="sp-shelf-t sp-shelf-pick" onclick="spreeSlot(${s.id})">${esc(slotLabel(s.t, s.l))}</button>
            <span class="sp-shelf-st">${s.picked.length ? 'Chosen' : 'Not chosen yet'}</span></div>
          ${rows.length ? `<div class="sp-shelf-row" style="grid-template-columns:repeat(${cols},minmax(0,300px))">${shown.map(r => cardHtml(r.x, r.o, s, key, '')).join('')}</div>
          ${pages > 1 ? `<div class="sp-pager"><span class="sp-pager-n">${pg * cols + 1}–${pg * cols + shown.length} of ${rows.length}</span>
            <button type="button" class="sp-pager-b" onclick="spreePage('${arg(key)}',-1,'')" ${pg === 0 ? 'disabled' : ''} aria-label="Previous products">‹</button>
            <button type="button" class="sp-pager-b" onclick="spreePage('${arg(key)}',1,'')" ${pg >= pages - 1 ? 'disabled' : ''} aria-label="More products">›</button></div>` : ''}`
          : `<p class="sp-shelf-none">${none}</p>`}
        </section>`;
      }).join('')}
    </section>`).join('');
  host.innerHTML = html || '<p class="sp-empty">Nothing on the Shopping List yet.</p>';
  // Aisle names stick just under the steps header.
  const m = host.closest('#pgMain'), hd = m && m.querySelector('.pg-main-hd');
  if(m && hd) m.style.setProperty('--sp-hd-h', hd.offsetHeight + 'px');
}
/* Jump menu on the aisle heading: the same groups as the Shopping List (Room,
   Department or Task — whatever the list is set to), each with its progress.
   Picking one glides the store there; the list's highlight follows by scroll-spy. */
function _closeAisleMenu(){ document.querySelectorAll('.sp-aisle-menu').forEach(x => x.remove()); document.querySelectorAll('.sp-aisle-btn[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
window.spreeAisleMenu = function(e, btn){
  e.stopPropagation();
  const open = btn.getAttribute('aria-expanded') === 'true';
  _closeAisleMenu(); if(open) return;
  const here = btn.closest('.sp-aisle').dataset.group;
  const menu = document.createElement('div'); menu.className = 'sp-aisle-menu'; menu.setAttribute('role', 'menu');
  menu.innerHTML = groups(slots()).map(([g, list]) => { const n = list.filter(s => s.picked.length).length;
    return `<button type="button" role="menuitemradio" aria-checked="${g === here}" class="${g === here ? 'is-here' : ''}" data-g="${esc(g)}">
      <span class="sp-am-tick" aria-hidden="true">${g === here ? '✓' : ''}</span><span class="sp-am-n">${esc(g)}</span><span class="sp-am-p">${n} of ${list.length} chosen</span></button>`; }).join('');
  menu.querySelectorAll('button').forEach(b => b.onclick = ev => { ev.stopPropagation(); _closeAisleMenu(); spreeAisleGo(b.dataset.g); });
  btn.parentNode.appendChild(menu); btn.setAttribute('aria-expanded', 'true');
  const first = menu.querySelector('.is-here') || menu.querySelector('button'); if(first) first.focus();
};
window.spreeAisleGo = function(g){
  const m = document.getElementById('pgMain'); if(!m) return;
  const find = () => m.querySelector(`.sp-aisle[data-group="${CSS.escape(g)}"]`);
  const el = find(); if(!el) return;
  const hd = m.querySelector('.pg-main-hd'), y = () => { const a = find() || el; return m.scrollTop + a.getBoundingClientRect().top - m.getBoundingClientRect().top - (hd ? hd.offsetHeight : 0); };
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches){ m.scrollTop = y(); return; }
  const ms = Math.min(1100, Math.max(400, 360 + Math.abs(y() - m.scrollTop) * .1));
  _spyHold = true;
  _glide(m, y, ms, () => { _spyHold = false; _spy(); });
};
document.addEventListener('click', e => { if(!(e.target.closest && e.target.closest('.sp-aisle-menu'))) _closeAisleMenu(); });
document.addEventListener('keydown', e => {
  const menu = document.querySelector('.sp-aisle-menu'); if(!menu) return;
  if(e.key === 'Escape'){ e.stopImmediatePropagation(); const b = menu.parentNode.querySelector('.sp-aisle-btn'); _closeAisleMenu(); if(b) b.focus(); return; }
  if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); const bs = [...menu.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
    const nx = bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length]; if(nx) nx.focus(); }
}, true);
// The shopping list item a shelf belongs to, from its key ('main|s12').
function _slotOfKey(key){ const m = /\|s(\d+)$/.exec(key || ''); return m ? slots().find(s => s.id === +m[1]) || null : null; }
let _relaxing = 0, _relaxNote = '', _relaxAll = false; const _cardH = {}, _rowsMemo = {};
window.addEventListener('resize', () => { clearTimeout(window.__shH); window.__shH = setTimeout(() => { renderShelves(); renderShelves('pgSideShelves'); }, 150); });
function cardHtml(x, o, act, key, hostId){
  const picked = slots().some(s => s.picked.some(p => p.sku === x.sku));
  return `<article class="sp-card${picked ? ' is-picked' : ''}" draggable="true" ondragstart="spreeDrag(event,'${arg(x.sku)}')" ondragend="spreeDragEnd()"
    onclick="spreeDetail(event,'${arg(key)}','${arg(x.sku)}','${hostId || ''}')" role="button" tabindex="0" aria-haspopup="dialog"
    onkeydown="if(event.key==='Enter'||event.key===' '){spreeDetail(event,'${arg(key)}','${arg(x.sku)}','${hostId || ''}')}">
    ${PH('sp-card-img', ART.product(x))}
    <span class="sp-card-ret">${esc(supplierName(o.supplier))}</span>
    <span class="sp-card-br">${esc(x.brand || '')}</span>
    <span class="sp-card-n" title="${esc(x.name)}">${esc(x.name)}</span>
    <span class="sp-card-row"><b>${money(o.price)}</b><small>/ ${esc(x.unit || 'ea')}</small></span>
    ${(FUL.mode === 'both' ? ['ship', 'pickup'] : [FUL.mode]).map(h => (a => `<span class="sp-card-av${a.ok ? '' : ' is-no'}">${FUL.mode === 'both' ? `<b>${h === 'ship' ? 'Delivery' : 'Pickup'}</b> ` : ''}${esc(FUL.mode === 'both' && h === 'pickup' && a.t === 'Delivery only' ? 'Not available' : a.t.replace(/^Pickup /, FUL.mode === 'both' ? '' : 'Pickup '))}</span>`)(_avail({...o, sku:x.sku}, h))).join('')}
    <span class="sp-card-tags">${stdBadge(x)}${picked ? '<span class="sp-fin is-in">In cart</span>' : ''}</span>
    ${_inCartFor(x.sku, act) ? `<button type="button" class="sp-card-add is-remove" onclick="event.stopPropagation();spreeRemoveSku('${arg(x.sku)}','${arg(key || '')}')">Remove</button>`
      : `<button type="button" class="sp-card-add" onclick="event.stopPropagation();spreeAdd('${arg(x.sku)}','${arg(key || '')}','${hostId || ''}')">Add</button>`}
  </article>`;
}

/* Help me choose: product-to-image matching */
function helpHtml(){
  const s = slots().find(x => x.id === S.help); if(!s) return '';
  const refs = [`${s.t.room} · property photo`, ...[0, 1, 2].map(i => `Mood board · ${MOOD_LABEL(i)}`)];
  const ref = refs[S.helpRef] || refs[0];
  const pool = _v2Pool(s.l).map(x => {
    const st = standard(x);
    const score = Math.min(97, 62 + (_skuHash(x.sku + S.helpRef) % 24) + (st.cls === 'hi' ? 10 : 0));
    return {x, o:offersForSku(x.sku)[0], score};
  }).filter(r => r.o).sort((a, b) => b.score - a.score).slice(0, 3);
  return `<div class="sp-scrim" onclick="spreeSet('help',null)"></div>
  <div class="sp-help" role="dialog" aria-label="Help me choose">
    <div class="sp-help-hd"><div><span class="sp-eyebrow">Help me choose</span><h3>Which ${esc(_v2Need(s.l).toLowerCase())}?</h3>
      <span class="sp-meta">For ${esc(slotLabel(s.t, s.l))}. Kai compares catalog pictures with the image you pick.</span></div>
      <button type="button" class="sp-x" onclick="spreeSet('help',null)" aria-label="Close">✕</button></div>
    <div class="sp-help-b">
      <div class="sp-help-ref">
        <span class="sp-k">Match to</span>
        <div class="sp-help-refs">${refs.map((r, i) => `<button type="button" class="${S.helpRef === i ? 'on' : ''}" onclick="spreeSet('helpRef',${i})">${PH('', i === 0 ? ART.room(s.t.room, 1) : MOOD_ART(i - 1))}<span>${esc(r)}</span></button>`).join('')}</div>
      </div>
      <div class="sp-help-res">
        <span class="sp-k">Closest matches to “${esc(ref)}”</span>
        ${pool.map(r => `<div class="sp-help-row">${PH('sp-help-img', ART.product(r.x))}
          <div class="sp-help-t"><b>${esc(r.x.name)}</b><span>${esc(r.x.brand)} · ${esc(supplierName(r.o.supplier))} · ${money(r.o.price)}</span>
          <span class="sp-help-tags"><span class="sp-score">${r.score}% visual match</span>${stdBadge(r.x)}</span></div>
          <button type="button" class="sp-card-add" onclick="spreeChooseHelp('${arg(r.x.sku)}')">Choose</button></div>`).join('')}
      </div>
    </div>
  </div>`;
}
window.spreeChooseHelp = function(sku){
  const s = slots().find(x => x.id === S.help); if(!s) return;
  S.help = null; S.active = s.id;
  place(s, sku, 'all');
};

/* Cart & review: the table view as the cart */
/* ════════════ REVIEW ════════════
   Step 2, between Shop and Cart: settle the decisions before the logistics.
   · Still needed — Shopping List items still empty, with a way back to shop.
   · Items, by retailer (each is its own order): delivery or store pickup per
     retailer; per item, its price and quantity. (Save for later and substitution
     preferences were removed from the cart.) REV.later stays empty.
     */
const REV = {later:new Set(), how:{}, pref:{}, open:null, f:{how:new Set(), room:new Set(), dept:new Set(), task:new Set()}, fopen:null};
/* Review filters: Room, Department and Task, each a dropdown of checkboxes.
   Ticks within one are inclusive (Kitchen OR Living Room); across them they
   narrow (Kitchen AND Lighting). Active ones show as chips you can clear. */
const _RF = [['how', 'Delivery / pickup', s => s.picked.length ? (_howOf(supOf(s.picked[0])) === 'pickup' ? 'Pickup' : 'Delivery') : (FUL.mode === 'pickup' ? 'Pickup' : 'Delivery')],
  ['room', 'Room', s => s.t.room], ['dept', 'Department', s => s.l.dept], ['task', 'Task', s => s.t.name]];
function _revMatch(s){ return _RF.every(([k, , f]) => !REV.f[k].size || REV.f[k].has(f(s))); }
function _revFilterHtml(all, shown){
  const chips = _RF.flatMap(([k, t]) => [...REV.f[k]].map(v => `<span class="sp-fchip">${esc(v)}<button type="button" onclick="spreeRevTick('${k}',${esc(JSON.stringify(v))},false)" aria-label="Remove ${esc(v)}">✕</button></span>`));
  return `<div class="sp-rv-filter">
      ${_RF.map(([k, t, f]) => {
        // faceted: each list only offers what the other filters leave (ticked values always stay)
        const pool = all.filter(s => _RF.every(([k2, , f2]) => k2 === k || !REV.f[k2].size || REV.f[k2].has(f2(s))));
        const vals = [...new Set(pool.map(f).concat([...REV.f[k]]))], n = REV.f[k].size, open = REV.fopen === k;
        return `<div class="sp-fdd${open ? ' is-open' : ''}">
          <button type="button" class="sp-fdd-b${n ? ' is-on' : ''}" onclick="spreeRevOpen('${k}')" aria-expanded="${open}">${t}${n ? ` · ${n}` : ''} <span aria-hidden="true">${open ? '▴' : '▾'}</span></button>
          ${open ? `<div class="sp-fdd-pop" role="group" aria-label="${t}">
            ${vals.length > 8 ? `<input type="search" class="sp-fdd-q" placeholder="Search ${t.toLowerCase()}s" oninput="spreeRevQ(this)">` : ''}
            <div class="sp-fdd-list">${vals.map(v => { const c = pool.filter(s => f(s) === v).length; return `<label class="sp-fdd-opt" data-v="${esc(v.toLowerCase())}"><input type="checkbox"${REV.f[k].has(v) ? ' checked' : ''} onchange="spreeRevTick('${k}',${esc(JSON.stringify(v))},this.checked)"><span>${esc(v)}</span><small>${c}</small></label>`; }).join('')}</div>
            ${n ? `<button type="button" class="sp-link" onclick="spreeRevClear('${k}')">Clear</button>` : ''}
          </div>` : ''}
        </div>`; }).join('')}
      ${chips.length ? `<span class="sp-meta">${shown} of ${all.length} items</span>` : ''}
    </div>
    ${chips.length ? `<div class="sp-fchips">${chips.join('')}<button type="button" class="sp-link" onclick="spreeRevClear()">Clear all</button></div>` : ''}`;
}
window.spreeRevOpen = function(k){ REV.fopen = REV.fopen === k ? null : k; render(); };
window.spreeRevTick = function(k, v, on){ on ? REV.f[k].add(v) : REV.f[k].delete(v); REV.open = null; render(); };
window.spreeRevClear = function(k){ (k ? [k] : Object.keys(REV.f)).forEach(x => REV.f[x].clear()); render(); };
window.spreeRevQ = function(el){ const q = el.value.trim().toLowerCase(); el.parentNode.querySelectorAll('.sp-fdd-opt').forEach(o => { o.hidden = q && !o.dataset.v.includes(q); }); };
// a click outside an open filter closes it
document.addEventListener('click', e => { if(REV.fopen && !(e.target.closest && e.target.closest('.sp-fdd'))){ REV.fopen = null; render(); } });
// A retailer's way in Review: chosen there, else pickup if a product from it was set to pickup
// (in its pop-up) or the shelves show pickup only, else delivery.
function _howOf(sup){
  if(REV.how[sup]) return REV.how[sup];
  if(!_storeOf(sup)) return 'delivery';
  const picked = slots().some(s => s.picked.some(p => supOf(p) === sup && FUL.pick[p.sku] === 'pickup'));
  return picked || FUL.mode === 'pickup' ? 'pickup' : 'delivery';
}
function _offer(sku, sup){ const os = offersForSku(sku) || []; return os.find(o => o.supplier === sup) || os[0] || null; }
function _seg(opts, cur, fn){ return `<span class="sp-ret sp-seg">${opts.map(([k, t]) => `<button type="button" class="${cur === k ? 'on' : ''}" onclick="${fn}('${k}')">${t}</button>`).join('')}</span>`; }
// Up to three stand-ins: same kind of product, in stock, closest to the standard, then price.
function _subsFor(s){
  const p = s.picked[0]; if(!p) return [];
  const cur = _v2Cat(s.l, p.sku) || catalogFind(p.sku) || {}, sec = cur.section;
  const o = _offer(p.sku, supOf(p)), price = o ? o.price : _num(p.rate), q = _num(p.qty) || 1;
  return _v2Pool(s.l).filter(x => x.sku !== p.sku && (!sec || (catalogFind(x.sku) || x).section === sec))
    .map(x => ({x, o:_offer(x.sku)})).filter(a => a.o && a.o.stock !== 'out')
    .map(a => ({...a, hi:standard(a.x).cls === 'hi', d:(a.o.price - price) * q}))
    .sort((a, b) => (b.hi - a.hi) || (a.o.price - b.o.price)).slice(0, 3);
}
const _PREF_T = {none:"Don't substitute"};
function _prefText(s){
  const v = REV.pref[s.id] || 'none';
  if(_PREF_T[v]) return _PREF_T[v];
  const x = catalogFind(v); return `Substitute with ${x ? x.name : 'a chosen item'}`;
}
/* Unit price × quantity, the way a checkout writes it: "4 × $98.00 each",
   "32 SF × $26.00 / SF". The total sits above it. */
function _qtyX(qty, unit, rate){
  const u = String(unit || 'ea');
  const measure = /^(SF|LF|SY|CY|CF|SQ|gal|qt|lb|ft|in)$/i.test(u);   // a suite, a set, a box: counted, not measured
  return !measure ? `${fmt(qty)} × ${money(rate)} each` : `${fmt(qty)} ${esc(u)} × ${money(rate)} / ${esc(u)}`;
}
/* When an item comes: the part of its availability that is the same for a
   whole delivery or pickup ("Arrives Nov 22–24", "Pickup today"), and what is
   left for the row itself ("3 left", "ship to store"). */
function _when(s){
  const p = s.picked[0], o = _offer(p.sku, supOf(p));
  const av = _avail({...(o || {}), sku:p.sku}, _howOf(supOf(p)));
  if(!av.ok) return {key:av.t || 'Unavailable', note:'', ok:false};
  const [key, ...rest] = av.t.split(' · ');
  return {key, note:rest.join(' · ').replace(/^\d+ in stock$/, ''), ok:true};
}
function _whenRank(w){
  if(!w.ok) return 1e9;
  if(/today/i.test(w.key)) return 0;
  if(/tomorrow/i.test(w.key)) return 1;
  const m = w.key.match(/([A-Z][a-z]{2}) (\d+)/); if(!m) return 5e8;
  const now = new Date(), d = new Date(`${m[1]} ${m[2]}, ${now.getFullYear()}`);
  let days = (d - now) / 864e5; if(days < -30) days += 365;
  return days;
}
function _revRow(s){
  const p = s.picked[0], c = _v2Cat(s.l, p.sku) || {name:p.sku};
  const cost = s.picked.reduce((a, x) => a + x.cost, 0);
  const w = _when(s), qty = s.picked.reduce((a, x) => a + _num(x.qty), 0);
  const note = w.ok ? w.note : '';
  return `<div class="sp-rv-row">
      ${PH('sp-rv-ph', ART.product(c))}
      <div class="sp-rv-txt">
        <b>${esc(slotLabel(s.t, s.l))}</b><span>${esc(c.name)}</span>
        ${note ? `<small>${esc(note)}</small>` : ''}
      </div>
      <div class="sp-rv-amt"><b>${money(cost)}</b>${s.picked.length === 1 ? `<small>${_qtyX(qty, _v2Unit(s.l), _num(p.rate))}</small>` : ''}</div>
    </div>`;
}
// Kai's pick for an empty item: closest to the standard, in stock, then lowest price (the shelf's own order).
function _recFor(s){
  const q = _num(_v2NeedQty(s.t, s.l)) || 1;
  const r = _v2Pool(s.l).map(x => ({x, o:_offer(x.sku)})).filter(a => a.o && a.o.stock !== 'out')
    .map(a => ({...a, hi:standard(a.x).cls === 'hi'})).sort((a, b) => (b.hi - a.hi) || ((a.o.stock === 'ships') - (b.o.stock === 'ships')) || (a.o.price - b.o.price))[0];
  return r ? {...r, total:r.o.price * q} : null;
}
let _forgetFor = {};
window.spreeForgetDetail = function(e, sku){ _detail.tickSku = null; spreeDetail(null, 'forget', sku); };
window.spreeAddRec = function(id, sku, sup){ const s = slots().find(x => x.id === id); if(s) place(s, sku, sup); };
function reviewHtml(allItems){
  const all = allItems.filter(_revMatch);
  const filled = all.filter(s => s.picked.length), empty = all.filter(s => !s.picked.length);
  // the pop-up's ‹ › step through Kai's picks in this row
  _forgetFor = {}; empty.forEach(s => { const r = _recFor(s); if(r && !(r.x.sku in _forgetFor)) _forgetFor[r.x.sku] = s.id; });
  _shelfLists.forget = Object.keys(_forgetFor);
  const byRet = new Map(); filled.forEach(s => { const k = supOf(s.picked[0]); if(!byRet.has(k)) byRet.set(k, []); byRet.get(k).push(s); });
  const sum = l => l.reduce((a, s) => a + s.picked.reduce((b, p) => b + p.cost, 0), 0);
  return `<div class="sp-review">
    ${_revFilterHtml(allItems, all.length)}
    ${empty.length ? `<section class="sp-rv-sec"><div class="sp-rv-forget-hd"><span class="sp-rv-h">Still needed</span><span class="sp-meta">Kai's picks for the ${empty.length} empty item${empty.length === 1 ? '' : 's'} on the Shopping List</span><span class="pg-sp"></span>
        <button type="button" class="sp-pager-b" onclick="this.closest('.sp-rv-sec').querySelector('.sp-forget').scrollBy({left:-this.closest('.sp-rv-sec').querySelector('.sp-forget').clientWidth,behavior:'smooth'})" aria-label="Previous">‹</button>
        <button type="button" class="sp-pager-b" onclick="this.closest('.sp-rv-sec').querySelector('.sp-forget').scrollBy({left:this.closest('.sp-rv-sec').querySelector('.sp-forget').clientWidth,behavior:'smooth'})" aria-label="Next">›</button></div>
      <div class="sp-forget">${empty.map(s => { const r = _recFor(s); return `<div class="sp-forget-c">
        ${r ? `<button type="button" class="sp-forget-open" onclick="spreeForgetDetail(event,'${esc(r.x.sku)}')" aria-label="See ${esc(r.x.name)}">${PH('sp-forget-ph', ART.product(r.x))}</button>` : '<span class="sp-forget-ph">+</span>'}
        ${r ? `<div class="sp-forget-amt"><b>${money(r.total)}</b><small>${_qtyX(_num(_v2NeedQty(s.t, s.l)) || 1, _v2Unit(s.l), r.o.price)}</small></div>` : ''}
        <b title="${esc(slotLabel(s.t, s.l))}">${esc(slotLabel(s.t, s.l))}</b>
        <div class="sp-forget-ctx" title="Task: ${esc(s.t.name)} · Department: ${esc(s.l.dept)}">${esc(s.t.name)} · ${esc(s.l.dept)}</div>
        ${r ? `<button type="button" title="${esc(r.x.name)}" class="sp-forget-p" onclick="spreeForgetDetail(event,'${esc(r.x.sku)}')">${esc(r.x.name)}</button><small title="${esc(supplierName(r.o.supplier))}${r.hi ? ' · High match' : ''}">${esc(supplierName(r.o.supplier))}${r.hi ? ' · High match' : ''}</small>
        <button type="button" class="sp-done" onclick="spreeAddRec(${s.id},'${esc(r.x.sku)}','${esc(r.o.supplier)}')">Add</button>` : ''}
        <button type="button" class="sp-link sp-forget-more" onclick="spreeShopFor(${s.id})">View other options</button>
      </div>`; }).join('')}</div></section>` : ''}
    <section class="sp-rv-sec">
      ${[...byRet.entries()].map(([k, l]) => `<div class="sp-rv-ret">
        <div class="sp-rv-ret-hd"><b>${esc(supplierName(k))}</b><span class="sp-meta">${l.length} item${l.length === 1 ? '' : 's'} · ${money(sum(l.filter(s => !REV.later.has(s.id))))}</span><span class="pg-sp"></span>
          ${_storeOf(k) ? _seg([['delivery', 'Delivery'], ['pickup', 'Pickup']], _howOf(k), `(h=>spreeHow('${k}',h))`) : '<span class="sp-meta">Delivery only</span>'}</div>
        <p class="sp-rv-how">${_howOf(k) === 'pickup' ? `At ${esc(supplierName(k))} ${esc(_storeOf(k)[0])} · ${_mi(_storeOf(k)[1])} mi` : `To ${esc(FUL.addr)}`}</p>
        ${(() => {
          const live = l;
          const by = new Map(); live.forEach(s => { const w = _when(s); if(!by.has(w.key)) by.set(w.key, {w, list:[]}); by.get(w.key).list.push(s); });
          const grp = (t, list, cls) => `<div class="sp-rv-when${cls ? ' ' + cls : ''}"><div class="sp-rv-when-hd"><b>${esc(t)}</b><span class="sp-meta">${list.length} item${list.length === 1 ? '' : 's'}</span></div>${list.map(_revRow).join('')}</div>`;
          return [...by.values()].sort((a, b) => _whenRank(a.w) - _whenRank(b.w)).map(g => grp(g.w.key, g.list, g.w.ok ? '' : 'is-issue')).join('')
            ;
        })()}
      </div>`).join('') || '<p class="sp-meta">Nothing chosen yet.</p>'}
    </section>
    <div class="sp-rv-foot"><span class="pg-sp"></span><button type="button" class="sp-done is-pri" onclick="spreeSet('view','cart')">Continue to cart</button></div>
  </div>`;
}
// From Review: back to Shop with that one item selected, so only its shelves show.
window.spreeShopFor = function(id){
  // From the cart dropdown this can come from any tab: go to the Shop first.
  if(PG.primary !== 'shopkai') PG.primary = 'shopkai';
  S.view = 'shop'; S.active = id; S.q = ''; S.help = null; render();
  const el = document.querySelector(`#pgNav .sp-slot[data-id="${id}"]`); if(el) el.scrollIntoView({block:'center'});
  const m = document.getElementById('pgMain'); if(m) m.scrollTop = 0;
};
window.spreeHow = function(sup, h){ REV.how[sup] = h; render(); };
window.spreePrefOpen = function(id){ REV.open = REV.open === id ? null : id; render(); };
window.spreePref = function(id, v){ REV.pref[id] = v; REV.open = null; render(); };

/* KaiWeb: the cart page — Review's checks and orders, with the totals and
   Place order in a summary beside them. */
function cartPageHtml(all){
  const inCart = all.filter(s => !REV.later.has(s.id));
  const grand = inCart.reduce((a, s) => a + s.picked.reduce((b, p) => b + p.cost, 0), 0);
  const saveTot = bundles().reduce((a, b) => a + b.savings, 0);
  const n = inCart.filter(s => s.picked.length).length, missing = all.filter(s => !s.picked.length).length;
  const nSup = new Set(inCart.filter(s => s.picked.length).map(s => supOf(s.picked[0]))).size;   // one order per supplier
  const rv = reviewHtml(all).replace(/<div class="sp-rv-foot">[\s\S]*?Continue to cart<\/button><\/div>/, '');
  const c = cartHtml(inCart), i = c.search(/<section class="sp-bundles"|<div class="sp-future-row"/);
  let tail = i >= 0 ? c.slice(i).replace(/<\/div>\s*$/, '') : '';
  // Your margin sits under the order summary, not under the items.
  const fi = tail.indexOf('<div class="sp-future-row">'), future = fi >= 0 ? tail.slice(fi) : '';
  if(fi >= 0) tail = tail.slice(0, fi);
  return `<div class="sp-cart-page">
    <div class="sp-cart-hd"><h2 class="sp-cart-h">Cart <span class="sp-cart-hn">(${n} item${n === 1 ? '' : 's'} – ${nSup} supplier${nSup === 1 ? '' : 's'})</span></h2></div>
    <div class="sp-cart-cols">
      <div class="sp-cart-main">${rv}${tail}</div>
      <div class="sp-cart-side"><aside class="sp-cart-sum">
        <dl>
          <dt>Subtotal</dt><dd>${money(grand)}</dd>
          ${saveTot ? `<dt>Bulk savings</dt><dd class="is-save">−${money(saveTot)}</dd>` : ''}
          <dt class="is-tot">Total</dt><dd class="is-tot">${money(grand - saveTot)}</dd>
        </dl>
        <button type="button" class="sp-order" onclick="toast('Order placed (prototype)')">Place order</button>
        ${missing ? `<p class="sp-cart-note">${missing} item${missing === 1 ? '' : 's'} on the Shopping List still need${missing === 1 ? 's' : ''} a product.</p>` : ''}
        ${typeof window.kwMoneyCartHtml === 'function' ? window.kwMoneyCartHtml() : ''}
      </aside>${future}</div>
    </div>
  </div>`;
}
function cartHtml(all){
  let grand = 0;
  // Grouped by retailer: each is its own order, delivered or picked up as chosen in Review.
  const retGroups = (() => { const m = new Map(); all.filter(s => s.picked.length).forEach(s => { const k = supOf(s.picked[0]); if(!m.has(k)) m.set(k, []); m.get(k).push(s); }); return [...m.entries()].map(([k, l]) => [`${supplierName(k)} · ${_howOf(k) === 'pickup' ? 'Pickup' : 'Delivery'}`, l]); })();
  const body = retGroups.map(([g, list]) => {
    let sub = 0;
    const rows = list.map(s => {
      if(!s.picked.length) return `<tr class="is-empty"><td>${esc(slotLabel(s.t, s.l))}</td><td colspan="6"><span class="sp-miss">Not chosen yet</span> <button type="button" class="sp-link" onclick="spreeSet('view','shop');spreeSlot(${s.id})">Shop for it</button></td><td></td><td class="sp-fut-col">—</td><td class="sp-rm-col"></td></tr>`;
      return s.picked.map(p => {
        const c = _v2Cat(s.l, p.sku) || {name:p.sku, unit:'ea'};
        sub += p.cost;
        const o = (offersForSku(p.sku) || []).find(x => x.supplier === supOf(p));
        const bk = bundleOf(s);
        return `<tr${bk ? ` class="is-bulk" title="${esc(_bundleWhy(bk))}"` : ''}>
          <td>${esc(slotLabel(s.t, s.l))}</td>
          <td><b>${esc(c.name)}</b><small>${esc(c.brand || '')} · ${esc(p.sku)}</small></td>
          <td>${esc(supplierName(supOf(p)))}</td>
          <td class="num">${fmt(p.qty)} ${esc(c.unit || 'ea')}</td>
          <td>${esc(s.t.qty || '—')}<small>Scope: ${esc(s.t.name)}</small></td>
          <td>${stdBadge(c)}</td>
          <td class="num">${money(p.rate)}</td>
          <td class="num"><b>${money(p.cost)}</b></td>
          <td class="sp-fut-col">${o && o.stock === 'ships' ? 'Ships later' : o && o.stock === 'out' ? 'Back-ordered' : 'Ships now'}</td>
          <td class="sp-rm-col"><button type="button" class="sp-row-rm" onclick="spreeClear(${s.id})" aria-label="Remove ${esc(c.name)}" title="Remove product from cart">✕</button></td>
        </tr>`;
      }).join('');
    }).join('');
    grand += sub;
    return `<tbody><tr class="sp-tgrp"><th colspan="7">${esc(g)}</th><th class="num">${money(sub)}</th><th class="sp-fut-col"></th><th class="sp-rm-col"></th></tr>${rows}</tbody>`;
  }).join('');
  const bs = bundles(), saveTot = bs.reduce((a, b) => a + b.savings, 0);
  const sample = all.find(s => s.picked.length);
  const allow = sample && typeof taskAllowance === 'function' ? taskAllowance(sample.t) : null;
  const pc = sample ? sample.picked.reduce((a, p) => a + p.cost, 0) : 0;
  const hrs = 6, rate = 65, allowV = allow != null ? allow : Math.round(pc * 1.35);
  const byRet = new Map();
  all.forEach(s => s.picked.forEach(p => {
    const o = (offersForSku(p.sku) || []).find(x => x.supplier === supOf(p));
    const k = supplierName(supOf(p)); const when = o && o.stock === 'ships' ? 'later' : 'now';
    if(!byRet.has(k)) byRet.set(k, {now:0, later:0}); byRet.get(k)[when]++;
  }));
  return `<div class="sp-cart">
    <div class="sp-cart-hd"><div><span class="sp-sec-t">Cart</span>
      <span class="sp-sec-sub">One order per retailer${REV.later.size ? ` · ${REV.later.size} saved for later <button type="button" class="sp-link" onclick="spreeSet('view','review')">Review</button>` : ''}</span></div>
      <button type="button" class="sp-done is-pri" onclick="toast('Order placed (wireframe)')">Place order</button></div>
    <div class="sp-tbl-wrap"><table class="sp-tbl">
      <thead><tr><th>Need</th><th>Product</th><th>Retailer</th><th class="num">Qty</th><th>Measurements</th><th>Standards</th><th class="num">Unit</th><th class="num">Total</th><th class="sp-fut-col">Ships</th><th class="sp-rm-col"><span class="sp-vh">Remove</span></th></tr></thead>
      ${body}
      <tfoot>${saveTot ? `<tr class="sp-sub"><th colspan="7">Subtotal</th><th class="num">${money(grand)}</th><th class="sp-fut-col"></th><th class="sp-rm-col"></th></tr>
        <tr class="sp-sub"><th colspan="7">Bulk savings</th><th class="num">−${money(saveTot)}</th><th class="sp-fut-col"></th><th class="sp-rm-col"></th></tr>` : ''}
        <tr><th colspan="7">Cart total</th><th class="num">${money(grand - saveTot)}</th><th class="sp-fut-col"></th><th class="sp-rm-col"></th></tr></tfoot>
    </table></div>
    ${bs.length ? `<section class="sp-bundles"><div class="sp-sec-hd"><span class="sp-sec-t">Bulk buys</span><span class="sp-sec-sub">Same product, same retailer, in more than one item · sample pricing: packs of 1 / 2 (−4%) / 4 (−8%) / 6 (−12%) where sold in packs, else 2 items 5%, 3 items 7%, 4+ 10%</span></div>
      <div class="sp-tbl-wrap"><table class="sp-tbl">
        <thead><tr><th>Product</th><th>Retailer</th><th>Items</th><th class="num">Price</th><th class="num">Discount</th><th class="num">Bulk price</th></tr></thead>
        <tbody>${bs.map(b => `<tr><td><b>${esc(b.cat.name)}</b><small>${esc(b.cat.brand || '')} · ${esc(b.sku)}</small></td><td>${esc(supplierName(b.supplier))}</td>
          <td>${b.items.map(it => esc(slotLabel(it.s.t, it.s.l))).join('<br>')}${b.kind === 'pack' ? `<small>Buy as ${esc(packText(b.plan.packs))} instead of ${esc(packText([].concat(...b.sepPlans.map(x => x.packs))))}</small>` : ''}</td>
          <td class="num"><s>${money(b.subtotal)}</s></td><td class="num">−${money(b.savings)}<small>${b.pct}%</small></td><td class="num"><b>${money(b.total)}</b></td></tr>`).join('')}</tbody>
      </table></div></section>` : ''}
    <div class="sp-future-row">
      <section class="sp-fcard"><div class="sp-sec-hd"><span class="sp-sec-t">Your margin (private)</span>${FUT}</div>
        <p class="sp-meta">Only the contractor sees this. The commissioning org can't.</p>
        ${sample ? `<dl class="sp-dl"><dt>Allowance · ${esc(sample.t.name)}</dt><dd>${money(allowV)}</dd><dt>− Product cost</dt><dd>${money(pc)}</dd><dt>− Your hours (${hrs} h × ${money(rate)})</dt><dd>${money(hrs * rate)}</dd><dt><b>Estimated margin</b></dt><dd><b>${money(allowV - pc - hrs * rate)}</b></dd></dl>` : '<p class="sp-meta">Pick a product to see an estimate.</p>'}
      </section>
    </div>
  </div>`;
}

/* ════════════ PAGES & PANELS ════════════
   After Christine's KaiWeb prototype: every tab is a page, and any page can
   also open as a side panel beside the main one (the small panel icon on
   each tab). The divider between them drags.

   · Shop is a page. While it is the main page, the Kai navigator on the left
     becomes the shopping navigator (the Needs list) and the work area holds
     the retailer shelves, or the cart.
   · Media is a page: property photos, videos, and the mood board.
   · Default: Shop as the main page with Media (mood board) as the side panel.
   Native pages (Overview, Editor, Measurements) open in a
   side panel as a second, read-only copy of the panel. */
const PH = (cls, src) => src ? `<img class="sp-ph is-img ${cls || ''}" src="${src}" alt="" loading="lazy">` : `<span class="sp-ph ${cls || ''}" aria-hidden="true"></span>`;
const _ART = window.__wfArt || {product: () => '', room: () => ''};
// A pool row may not carry its catalogue section; look it up so the sketch matches.
const ART = {room:_ART.room, product: x => _ART.product(x && !x.section && x.sku && typeof catalogFind === 'function' ? (catalogFind(x.sku) || x) : x)};
// Tile shapes in an order with no repeat, so the board's columns stagger
// instead of mirroring each other.
const MOOD_SHAPE = ['sp-h0','sp-h1','sp-h3','sp-h2','sp-h1','sp-h0','sp-h3','sp-h1','sp-h2','sp-h3','sp-h1','sp-h0','sp-h2','sp-h1','sp-h3','sp-h0'];
const MOOD_N = () => (_ART.moodCount && _ART.moodCount()) || _V2_MOOD.length;
const MOOD_ART = i => (_ART.mood && _ART.mood(i)) || (typeof _v2MoodArt === 'function' ? _v2MoodArt(i % _V2_MOOD.length) : '');
const MOOD_LABEL = i => (_ART.moodLabel && _ART.moodLabel(i)) || (_V2_MOOD[i % _V2_MOOD.length] || [''])[0];
// The Editor's own shopping panel shows the same mood board pictures.
if(_ART.mood && typeof _v2MoodArt === 'function') _v2MoodArt = i => MOOD_ART(i);
// Product pictures everywhere in the panel come from the same sketches.
if(ART.product){
  _v2Img = x => ART.product(x);
  if(typeof productArtUri === 'function') productArtUri = x => ART.product(x);
  if(typeof shopProductImg === 'function') shopProductImg = x => ART.product(x);
}
const FUT = '<span class="sp-future">Future</span>';
const PG = {primary:null, side:null, nativePrimary:'overview'};
/* KaiWeb: the tab bar is Overview · Scope · Shop · Documents. Media and
   Floorplan are KaiWeb's own tabs (ids pano / floorplan) drawn in the right
   panel instead (kw: the KaiWeb mode that panel draws). */
const PAGES = {
  overview:{label:'Overview', native:true},
  shop:{label:'Scope', native:true},
  shopkai:{label:'Shop', native:false},
  artifact:{label:'Documents', native:true},
  media:{label:'Media', native:false, kw:'pano'},
  floorplan:{label:'Floorplan', native:false, kw:'floorplan'},
  cart:{label:'Cart', native:false},   // the cart beside the page (right-edge rail)
};
const KW_TAB = {pano:'media', floorplan:'floorplan'};   // KaiWeb tab id → right-panel page
const NESTED = /pgnested=1/.test(window.__KAI_QS || '');
let _pgSideW = 440;
try{ const v = +localStorage.getItem('kai_wf_side_w'); if(v > 200) _pgSideW = v; }catch(e){}
const MEDIA = {view:'photos', show:'all', size:'small', room:''};   // view: photos | mood

/* Reference panel (right side, like Figma's): Media and Measurements live here
   instead of in the tab bar. The tabs pick what you work on; this panel is what
   you look at while you work, so it stays open across tab switches and is
   remembered between visits. */
const REF_PAGES = ['media', 'floorplan', 'cart'];
let _sideSaved = false;
try{ const v = localStorage.getItem('kai_wf_side'); if(v !== null){ _sideSaved = true; if(REF_PAGES.includes(v)) PG.side = v; } }catch(e){}
function _saveSide(){ try{ localStorage.setItem('kai_wf_side', PG.side || ''); _sideSaved = true; }catch(e){} }

// A tall page with its right half filled when open: reads as "panel", not a checkbox.
const _ICON_PANEL = '<svg viewBox="0 0 14 12" fill="none" aria-hidden="true"><rect x=".6" y=".6" width="12.8" height="10.8" stroke="currentColor" stroke-width="1.2"/><path d="M7 .6v10.8" stroke="currentColor" stroke-width="1.2"/><rect class="pg-ic-fill" x="7" y=".6" width="6.4" height="10.8" fill="currentColor"/><rect class="pg-ic-left" x=".6" y=".6" width="6.4" height="10.8" fill="currentColor"/></svg>';

function _el(id, parent, cls){
  let el = document.getElementById(id);
  if(!el && parent){ el = document.createElement('div'); el.id = id; if(cls) el.className = cls; parent.appendChild(el); }
  return el;
}
let _lastPrimary = null, _autoTucked = false, _lastCart = false, _cartTucked = false;
function render(){
  if(NESTED) return;
  // Shop always sits on the left and Media on the right when both are open.
  // Shop always sits on the left: opened as a panel beside any page, it takes the
  // left spot and that page moves to the right.
  if(PG.side === 'shopkai' && PG.primary && PG.primary !== 'floorplan'){ PG.side = PG.primary; PG.primary = 'shopkai'; const sp = document.getElementById('pgSide'); if(sp) sp.dataset.key = ''; }
  const body = document.querySelector('#frame .body'), side = document.querySelector('.sidebar'), work = document.querySelector('.work');
  if(!body || !side || !work) return;
  const shopMain = PG.primary === 'shopkai', mediaMain = PG.primary === 'media', measMain = PG.primary === 'floorplan';
  document.body.classList.toggle('pg-on', !!PG.primary);
  document.body.classList.toggle('pg-shop', shopMain);
  document.body.classList.toggle('pg-has-side', !!PG.side);
  // Measurements is for designing visually: the navigator starts tucked away there
  // (its caret stays, to bring it back), and comes back when you leave the page.
  if(PG.primary === 'floorplan' && _lastPrimary !== 'floorplan' && !document.body.classList.contains('sb-collapsed') && window.collapseSidebar){ _wrapNavToggle(); collapseSidebar(); _autoTucked = true; }
  else if(PG.primary !== 'floorplan' && _lastPrimary === 'floorplan' && _autoTucked && document.body.classList.contains('sb-collapsed') && window.expandSidebar){ expandSidebar(); _autoTucked = false; }
  _lastPrimary = PG.primary;
  // The cart repeats the Shopping List item for item, so opening it tucks the
  // list away (its caret stays, to bring it back); Back to shelves, or leaving
  // Shop, brings it back — unless you reopened it yourself in the meantime.
  const cartOpen = shopMain && (S.view === 'cart' || S.view === 'review');
  const shut = document.body.classList.contains('sb-collapsed');
  if(cartOpen && !_lastCart && !shut && window.kaiCollapseSidebar){ kaiCollapseSidebar(); _cartTucked = true; }
  else if(!cartOpen && _lastCart && _cartTucked && shut && window.kaiExpandSidebar){ kaiExpandSidebar(); }
  if(!cartOpen) _cartTucked = false;
  _lastCart = cartOpen;
  // Left pane: the shopping navigator replaces the scope navigator.
  const nav = _el('pgNav', side, 'pg-scope');
  nav.hidden = !shopMain;
  if(shopMain){
    // Redrawing the list keeps its scroll position (clicking an item shouldn't jump to the top).
    const nb = nav.querySelector('.pg-nav-b'), keep = nb ? nb.scrollTop : 0;
    nav.innerHTML = navHtml();
    const nb2 = nav.querySelector('.pg-nav-b'); if(nb2) nb2.scrollTop = keep;
  }
  // Main page, under the tab bar.
  const main = _el('pgMain', work, 'pg-scope');
  main.hidden = !PG.primary;
  const hdr = document.getElementById('workHdr');
  main.style.top = (hdr && work.contains(hdr) ? hdr.offsetHeight : 0) + 'px';   // 0 once the tab bar sits above the whole page
  if(shopMain) main.innerHTML = shopMainHtml();
  else if(mediaMain) main.innerHTML = mediaHtml('main');
  else if(measMain) main.innerHTML = measureHtml('main');
  // Side panel, beside the main page.
  const div = _el('pgDiv', body, 'pg-div'), sp = _el('pgSide', body, 'pg-scope');
  if(div.parentNode !== body || div.nextSibling !== sp){ body.appendChild(div); body.appendChild(sp); }
  div.hidden = sp.hidden = !PG.side;
  sp.style.flexBasis = _pgSideW + 'px';
  if(PG.side) renderSide(sp);
  if(!div.dataset.wired){
    div.dataset.wired = '1';
    div.setAttribute('role', 'separator'); div.setAttribute('aria-orientation', 'vertical');
    div.setAttribute('aria-label', 'Resize the side panel'); div.tabIndex = 0;
    div.innerHTML = '<span class="pg-div-grip"></span>';
    div.addEventListener('pointerdown', _sideDrag);
    div.addEventListener('keydown', e => {
      if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); _setSideW(_pgSideW + (e.key === 'ArrowLeft' ? 24 : -24)); _saveSideW();
    });
  }
  if(shopMain && S.view === 'shop') renderShelves();
  _paintFocus();
  if(S.help != null) _el('pgHelp', document.body, 'pg-scope').innerHTML = helpHtml();
  else { const h = document.getElementById('pgHelp'); if(h) h.remove(); }
  paintTabs();
}
function _setSideW(px){
  const body = document.querySelector('#frame .body'); if(!body) return;
  const W = body.getBoundingClientRect().width;
  _pgSideW = Math.round(Math.max(260, Math.min(px, W * 0.6)));
  const sp = document.getElementById('pgSide'); if(sp) sp.style.flexBasis = _pgSideW + 'px';
}
function _saveSideW(){ try{ localStorage.setItem('kai_wf_side_w', String(_pgSideW)); }catch(e){} }
function _sideDrag(e){
  const div = e.currentTarget, body = document.querySelector('#frame .body');
  e.preventDefault(); div.setPointerCapture && div.setPointerCapture(e.pointerId);
  div.classList.add('is-drag'); document.body.classList.add('pg-resizing');
  const move = ev => _setSideW(body.getBoundingClientRect().right - ev.clientX);
  const up = () => {
    div.classList.remove('is-drag'); document.body.classList.remove('pg-resizing');
    div.removeEventListener('pointermove', move); div.removeEventListener('pointerup', up); div.removeEventListener('pointercancel', up);
    _saveSideW();
  };
  div.addEventListener('pointermove', move); div.addEventListener('pointerup', up); div.addEventListener('pointercancel', up);
}

/* ── the tab bar: Shop and Media join it, every tab gets a panel button ── */
/* ── hide / show the left pane (Shopping List, or the scope navigator) ──
   A caret in its header hides it; a slim rail at the left edge brings it back. */
const _CHEV = d => `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="${d === 'l' ? 'M7.5 2.5 4 6l3.5 3.5' : 'M4.5 2.5 8 6 4.5 9.5'}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
const _NAV_CARET = `<button type="button" class="pg-navcaret" onclick="collapseSidebar()" title="Hide" aria-label="Hide the left pane">${_CHEV('l')}</button>`;
// Reopen at the width it had (the shell's own reopen width can differ from this layout's).
function _wrapNavToggle(){
  if(NESTED || !window.collapseSidebar || window.__pgNavWrap) return;
  window.__pgNavWrap = true;
  const c = window.collapseSidebar, x = window.expandSidebar;
  let keep = '';
  window.collapseSidebar = function(){ const sb = document.querySelector('.sidebar'); keep = sb ? sb.style.flexBasis : ''; c(); };
  window.expandSidebar = function(){ x(); const sb = document.querySelector('.sidebar'); if(sb) sb.style.flexBasis = keep; window.dispatchEvent(new Event('resize')); };
}
// A small tab on the edge between the left pane and the page, like the new Kai
// experience: ‹ hides the pane, › brings it back.
function _paintNavToggle(){
  if(NESTED) return;
  _wrapNavToggle();
  const work = document.querySelector('.work'); if(!work) return;
  let t = document.getElementById('pgEdge');
  if(!t){ t = document.createElement('button'); t.type = 'button'; t.id = 'pgEdge';
    t.onclick = e => { e.stopPropagation(); _autoTucked = false; _cartTucked = false; document.body.classList.contains('sb-collapsed') ? expandSidebar() : collapseSidebar(); _paintNavToggle(); }; }
  if(t.parentNode !== work) work.appendChild(t);
  const shut = document.body.classList.contains('sb-collapsed'), label = PG.primary === 'shopkai' ? 'Shopping List' : 'navigator';
  const k = (shut ? 'r' : 'l') + label;
  if(t.dataset.k !== k){ t.dataset.k = k; t.innerHTML = _CHEV(shut ? 'r' : 'l'); t.title = `${shut ? 'Show' : 'Hide'} the ${label}`; t.setAttribute('aria-label', t.title); }
}
function paintTabs(){
  _paintNavToggle();
  _paintFocusLabel();
  const wrap = document.querySelector('#workHdr .wmode-tabs'); if(!wrap || NESTED) return;
  // Add Shop (after Editor) once per tab-bar render. Media and Measurements are
  // not tabs: they open in the reference panel from the buttons on the right.
  // KaiWeb drops the Scope tab once closeout is approved (nothing left to
  // edit); Shop goes with it.
  const _scopeTab = [...wrap.querySelectorAll('.wmode')].find(b => /(?:set|pick)WorkMode\('shop'\)/.test(b.getAttribute('onclick') || ''));
  if(!_scopeTab){ const sb = wrap.querySelector('[data-pg="shopkai"]'); if(sb) (sb.closest('.wmode-wrap') || sb).remove(); if(PG.primary === 'shopkai'){ PG.primary = null; render(); } }
  else if(!wrap.querySelector('[data-pg="shopkai"]')){
    const editor = _scopeTab;
    const shopB = document.createElement('button'); shopB.className = 'wmode pg-tab'; shopB.dataset.pg = 'shopkai'; shopB.textContent = 'Shop'; shopB.onclick = () => pgPrimary('shopkai');
    // KaiWeb wraps each tab in a .wmode-wrap; Shop gets one too, after Scope's.
    const sw = document.createElement('span'); sw.className = 'wmode-wrap pg-tab-wrap'; sw.appendChild(shopB);
    const anchor = editor && (editor.closest('.wmode-wrap') || editor);
    if(anchor) anchor.after(sw); else wrap.append(sw);
  }
  wrap.querySelectorAll('.wmode').forEach(b => {
    const m = (b.getAttribute('onclick') || '').match(/(?:set|pick)WorkMode\('(\w+)'\)/);
    const id = b.dataset.pg || (m && (KW_TAB[m[1]] || m[1])); if(!id || !PAGES[id]) return;
    b.dataset.page = id;
    const bw = b.closest('.wmode-wrap') || b;
    if(REF_PAGES.includes(id)){ bw.hidden = true; bw.style.display = 'none'; return; }
    if(PAGES[id].off){
      // Not part of this wireframe: shown, not openable.
      b.removeAttribute('onclick'); b.onclick = null;
      b.classList.add('pg-off'); b.classList.remove('active');
      b.title = `${PAGES[id].label} isn't part of this wireframe`;
      return;
    }
    const isMain = PG.primary ? PG.primary === id : (typeof workMode !== 'undefined' && workMode === id);
    b.classList.toggle('active', isMain);
    if(bw !== b){ bw.classList.toggle('active', isMain); bw.querySelectorAll('.wmode-tools, .view-menu').forEach(x => { x.hidden = !isMain; }); }
  });
  // Reference panel buttons, at the far right of the tab bar.
  const hdr = document.getElementById('workHdr');
  let tools = document.getElementById('pgRefTools');
  if(!tools){
    tools = document.createElement('div'); tools.id = 'pgRefTools'; tools.className = 'pg-ref-tools';
    tools.setAttribute('role', 'group'); tools.setAttribute('aria-label', 'Side panel');
    tools.innerHTML = REF_PAGES.map(id => `<button type="button" class="pg-ref-btn" data-ref="${id}" onclick="pgSide('${id}')">${_ICON_PANEL}<span>${esc(PAGES[id].label)}</span></button>`).join('');
  }
  if(tools.parentNode !== hdr || tools !== hdr.lastElementChild) hdr.appendChild(tools);
  tools.querySelectorAll('.pg-ref-btn').forEach(b => {
    const id = b.dataset.ref, on = PG.side === id;
    if(b.classList.contains('on') === on && b.title) return;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.title = on ? `Close ${PAGES[id].label}` : `Show ${PAGES[id].label} in the side panel`;
  });
}

window.pgPrimary = function(id){
  if(PAGES[id] && PAGES[id].off) return;
  // Media and Measurements only ever open in the side panel.
  if(REF_PAGES.includes(id)){ pgShowSide(id); return; }
  // The side panel stays as it is when the main page changes.
  if(PAGES[id] && PAGES[id].native){ PG.primary = null; if(_origPick) _origPick(id); else if(_origSetWorkMode) _origSetWorkMode(id); render(); return; }
  PG.primary = id;
  S.help = null;
  render();
};
// Open the side panel on a page (no toggle).
window.pgShowSide = function(id){ PG.side = id; _saveSide(); const sp = document.getElementById('pgSide'); if(sp) sp.dataset.key = ''; render(); };
// The tab-bar buttons: open that page in the side panel, or close it if it is showing.
window.pgSide = function(id){
  if(!REF_PAGES.includes(id)){ pgPrimary(id); return; }
  if(PG.side === id){ pgCloseSide(); return; }
  pgShowSide(id);
};
window.pgCloseSide = function(){ PG.side = null; _saveSide(); render(); };
// Clicking any native tab leaves Shop; the side panel stays put.
const _origSetWorkMode = typeof setWorkMode === 'function' ? setWorkMode : null;
const _origPick = typeof pickWorkMode === 'function' ? pickWorkMode : null;
// Media / Floorplan asked for as a tab, from anywhere: they open in the right panel.
const _asSide = m => { const pid = KW_TAB[m]; if(pid && REF_PAGES.includes(pid)){ pgShowSide(pid); return true; } return false; };
if(_origSetWorkMode && !NESTED){
  setWorkMode = function(m){ if(_asSide(m)) return; if(PAGES[m] && PAGES[m].off) return; if(PAGES[m] && !PAGES[m].native){ pgPrimary(m); return; } PG.primary = null; const r = _origSetWorkMode.apply(this, arguments); render(); return r; };
}
if(_origPick && !NESTED){
  pickWorkMode = function(m){ if(_asSide(m)) return; if(PAGES[m] && !PAGES[m].native){ pgPrimary(m); return; } PG.primary = null; const r = _origPick.apply(this, arguments); render(); return r; };
}
/* KaiWeb code that sets workMode = 'pano' / 'floorplan' itself (opening a
   photo, "see on the plan"…) and redraws: the page stays where it was and the
   right panel opens on it instead. No split panes either — the right panel
   replaced them. */
let _kwLastMain = 'overview', _kwInSide = false;
if(typeof _applyWorkMode === 'function' && !NESTED){
  const _origApply = _applyWorkMode;
  _applyWorkMode = function(){
    if(!_kwInSide){
      const ref = [workMode, splitMode].find(x => KW_TAB[x]);
      if(ref){
        const keep = [workMode, splitMode].find(x => x && !KW_TAB[x]);
        workMode = keep || _kwLastMain || 'shop';
        PG.side = KW_TAB[ref]; _saveSide();
        const sp = document.getElementById('pgSide'); if(sp) sp.dataset.key = '';
      }
      splitMode = null;
      _kwLastMain = workMode;
    }
    const r = _origApply.apply(this, arguments);
    if(!_kwInSide) render();
    return r;
  };
}
// KaiWeb redraws its work surface → the right panel's copy of Media / Floorplan follows.
if(typeof renderWork === 'function' && !NESTED){
  const _origRenderWork = renderWork;
  renderWork = function(){ const r = _origRenderWork.apply(this, arguments); if(!_kwInSide) _kwRefreshSide(); return r; };
}
if(typeof viewMenuPick === 'function' && !NESTED){
  const _origViewPick = viewMenuPick;
  viewMenuPick = function(js){ const inSide = !!document.querySelector('#pgSide .pg-kw-menu'); _kwMenu = false; const r = _origViewPick.apply(this, arguments); if(inSide) _kwRefreshSide(true); return r; };
}
// Keep the tab bar's extra buttons after every redraw of it.
new MutationObserver(() => { if(!NESTED) paintTabs(); }).observe(document.documentElement, {childList:true, subtree:true});

/* ── side panel ── */
/* ── KaiWeb panes in the right panel ── */
// Which KaiWeb mode the right panel draws now (Media on Mood board draws Shop's own board).
const _kwSideMode = () => { const pg = PAGES[PG.side]; return pg && pg.kw && !(PG.side === 'media' && MEDIA.view === 'mood') ? pg.kw : null; };
let _kwMenu = false;
function _kwSpec(mode){
  let spec = null, acts = [];
  _kwInSide = true; const keepW = workMode; workMode = mode;
  try{ spec = typeof _tabViewSpec === 'function' ? _tabViewSpec(mode) : null; acts = typeof _tabActionSpec === 'function' ? _tabActionSpec(mode) : []; }catch(e){}
  finally{ workMode = keepW; _kwInSide = false; }
  return {spec, acts};
}
function _kwDrawPane(host, mode){
  if(!host || typeof _renderPaneInto !== 'function') return;
  const keep = host.scrollTop;
  _kwInSide = true;
  try{ _renderPaneInto(host, mode); }catch(e){ console.error('right panel', mode, e); }
  finally{ _kwInSide = false; }
  host.scrollTop = keep;
}
function _kwRefreshSide(opts){
  const sp = document.getElementById('pgSide'); if(!sp || sp.hidden) return;
  const mode = _kwSideMode(); if(!mode) return;
  if(opts){ sp.dataset.key = ''; render(); return; }
  _kwDrawPane(sp.querySelector('.pg-kw-host'), mode);
}
window.pgKwMenu = function(e){ if(e) e.stopPropagation(); _kwMenu = !_kwMenu; const sp = document.getElementById('pgSide'); if(sp) sp.dataset.key = ''; render(); };
document.addEventListener('click', e => { if(_kwMenu && !e.target.closest('.pg-kw-menu, .pg-kw-view')){ _kwMenu = false; const sp = document.getElementById('pgSide'); if(sp) sp.dataset.key = ''; render(); } });
/* ── Cart, beside the page ──
   Opened from the right-edge rail, so you can keep shopping and watch it
   fill. What's in it (by item), what's still to choose, the totals, how it sits
   against the materials estimate, and the way on to the full cart, where the
   orders are reviewed and placed. */
function miniCartHtml(){
  const all = slots();
  if(!all.length) return `<p class="sp-empty">Nothing to buy for this job yet.</p>`;
  const inCart = all.filter(s => !REV.later.has(s.id) && s.picked.length), missing = all.filter(s => !s.picked.length);
  const sub = inCart.reduce((a, s) => a + s.picked.reduce((b, p) => b + p.cost, 0), 0);
  const sv = bundles().reduce((a, b) => a + b.savings, 0);
  const nSup = new Set(inCart.map(s => supOf(s.picked[0]))).size;
  const m = typeof window.kwMoney === 'function' ? window.kwMoney() : null;
  const onCart = PG.primary === 'shopkai' && S.view === 'cart';
  const row = s => { const p = s.picked[0], c = _v2Cat(s.l, p.sku) || {name:p.sku}, cost = s.picked.reduce((a, x) => a + x.cost, 0);
    return `<li class="mc-row"><button type="button" class="mc-it" onclick="spreeShopFor(${s.id})" title="Show on the shelves">
      ${PH('mc-ph', ART.product(c))}<span class="mc-tx"><b>${esc(slotLabel(s.t, s.l))}</b><span>${esc(c.name)}</span></span><span class="mc-amt">${money(cost)}</span></button></li>`; };
  return `<div class="mc">
    <p class="mc-sum">${inCart.length} item${inCart.length === 1 ? '' : 's'} – ${nSup} supplier${nSup === 1 ? '' : 's'}</p>
    <div class="mc-top"><button type="button" class="mc-go" onclick="${onCart ? "spreeSet('view','shop')" : "(window.kwCartPop&&kwCartPop(false));kwOpenCart()"}">${onCart ? 'Back to the shelves' : 'Review &amp; order'}</button></div>
    ${missing.length ? `<div class="mc-miss"><b>${missing.length} still to choose</b>${missing.map(s => `<button type="button" class="sp-link" onclick="spreeShopFor(${s.id})">${esc(slotLabel(s.t, s.l))}</button>`).join('')}</div>` : ''}
    <div class="mc-list">${(() => {
      // One block per supplier, like the full cart: name, how it arrives, count and subtotal.
      const by = new Map(); inCart.forEach(x => { const k = supOf(x.picked[0]); if(!by.has(k)) by.set(k, []); by.get(k).push(x); });
      return [...by.entries()].map(([k, l]) => {
        const tot = l.reduce((a, x) => a + x.picked.reduce((b, p) => b + p.cost, 0), 0);
        const how = _howOf(k) === 'pickup' && _storeOf(k) ? `Pickup at ${_storeOf(k)[0]}` : 'Delivery';
        return `<section class="mc-sup"><div class="mc-sup-hd"><b>${esc(supplierName(k))}</b><span>${esc(how)} · ${l.length} item${l.length === 1 ? '' : 's'}</span><span class="mc-sup-amt">${money(tot)}</span></div>
          <ul class="mc-sup-list">${l.map(row).join('')}</ul></section>`;
      }).join('');
    })()}</div>
    <div class="mc-foot">
      <dl class="mc-tot"><dt>Subtotal</dt><dd>${money(sub)}</dd>${sv > 0.005 ? `<dt>Bulk savings</dt><dd class="is-save">−${money(sv)}</dd>` : ''}<dt class="is-tot">Total</dt><dd class="is-tot">${money(sub - sv)}</dd></dl>
      ${m && m.mat ? `<p class="mc-est">${money(sub - sv)} of the ${money(m.mat)} materials estimate</p>` : ''}
    </div>
  </div>`;
}
function renderSide(sp){
  const id = PG.side, pg = PAGES[id];
  const kwMode = _kwSideMode();
  const kw = kwMode ? _kwSpec(kwMode) : null;
  const opts = id === 'media' ? mediaOptsHtml() : '';
  let head = sp.querySelector('.pg-side-hd');
  const key = id + '|' + (id === 'media' ? MEDIA.view + S.guide : '') + (kw ? '|' + JSON.stringify(kw.spec && kw.spec.groups.map(g => g.opts.filter(o => o.on).map(o => o.id || o.label))) + JSON.stringify(kw.acts.map(a => a.on)) + _kwMenu : '');
  if(sp.dataset.key === key && (pg.native || kwMode)) return;   // keep a native page's frame alive
  if(id === 'cart'){ const k2 = 'cart|' + miniCartHtml().length + '|' + (S.view || ''); if(sp.dataset.key === k2) return; sp.dataset.key = k2; } else
  sp.dataset.key = key;
  const oldB = sp.querySelector('.pg-side-b'), keepSide = oldB ? oldB.scrollTop : 0;
  // The right-edge rail switches Media / Floorplan / Cart, so the panel just names itself.
  const title = `<span class="pg-side-t">${esc(pg.label)}</span>`;
  sp.innerHTML = `<div class="pg-side-hd">
      ${title}
      <span class="pg-sp"></span>
      ${kw && (kw.spec || kw.acts.length) ? `<span class="pg-kw-view-wrap"><button type="button" class="pg-kw-view${_kwMenu ? ' is-open' : ''}" onclick="pgKwMenu(event)" aria-haspopup="menu" aria-expanded="${_kwMenu}">View <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></button>${_kwMenu && typeof _tabMenuHtml === 'function' ? `<div class="pg-kw-menu">${_tabMenuHtml(kwMode, kw.spec, kw.acts)}</div>` : ''}</span>` : ''}
      <button type="button" class="pg-side-x" onclick="pgCloseSide()" title="Close side panel" aria-label="Close side panel">✕</button>
    </div>
    ${opts ? `<div class="pg-side-opts">${opts}</div>` : ''}
    <div class="pg-side-b${kwMode ? ' pg-kw-pane' : ''}">${kwMode ? `<div class="pg-kw-host work-body is-paneb" data-kw="${kwMode}"></div>` : pg.native ? '' : id === 'media' ? mediaHtml('side') : id === 'floorplan' ? measureHtml('side') : id === 'cart' ? miniCartHtml() : shopSideHtml()}</div>`;
  if(kwMode) _kwDrawPane(sp.querySelector('.pg-kw-host'), kwMode);
  { const b = sp.querySelector('.pg-side-b'); if(b) b.scrollTop = keepSide; }
  if(pg.native){
    const f = document.createElement('iframe');
    f.className = 'pg-side-frame'; f.title = pg.label;
    try{
      const P = window.parent;
      const qs = `tab=${id}&only=${id}&chromeless=1&sb=collapsed&seed=full&projMode=draft&stageId=edit&pgnested=1`;
      f.srcdoc = P.KAI_PANEL_DOC(qs);
    }catch(e){ f.srcdoc = '<p style="font:13px sans-serif;padding:16px">This page can\'t open as a panel here.</p>'; }
    sp.querySelector('.pg-side-b').appendChild(f);
  }
  if(id === 'shopkai') renderShelves('pgSideShelves');
}

/* ── Shop page ── */
function navHtml(){
  const all = slots();
  const done = all.filter(s => s.picked.length).length;
  return `<div class="pg-nav-hd">
      <div class="pg-nav-t"><span class="sp-sec-t">Shopping List</span><span class="pg-sp"></span></div>
      <div class="sb-tools-seg pg-by" role="tablist" aria-label="Shop by">
        ${BY.map(([k, t]) => `<button type="button" class="${S.by === k ? 'active' : ''}" onclick="spreeSet('by','${k}')">${t}</button>`).join('')}
      </div>
    </div>
    <div class="pg-nav-b">${_dragSku ? _dragAllBar(all) : ''}${all.length ? groups(all).map(([g, list]) => `<section class="sp-grp">
      <div class="sp-grp-hd"><span class="sp-clip" title="${esc(g)}">${esc(g)}</span>${_allowHtml(g, list)}</div>
      <div class="sp-slots">${_dragSku ? _dragClusters(list) : S.by === 'dept' ? _lineClusters(list) : list.map(slotHtml).join('') /* bulk shows only in Department view and the cart */}</div>
    </section>`).join('') : `<div class="sp-empty">No products needed yet. ${WF_EMPTY ? 'Replace existing items on the room boards in Measurements, and they show up here.' : 'Load Step 2 · Populated draft from the Demo menu.'}</div>`}</div>`;
}
function shopMainHtml(){
  const all = slots();
  const total = all.filter(s => !REV.later.has(s.id)).reduce((a, s) => a + s.picked.reduce((b, p) => b + p.cost, 0), 0);   // saved-for-later items are not in the cart
  const act = all.find(s => s.id === S.active);
  /* KaiWeb: no Shop / Review / Cart steps — the job's own stepper is the only
     stepper on screen. The page is the shelves; the Cart button opens the cart,
     and Review is the top of the cart (what's still needed, how each order
     arrives, substitutions, save for later). */
  if(S.view === 'review') S.view = 'cart';
  const inCart = all.filter(s => !REV.later.has(s.id) && s.picked.length).length;
  const sv = bundles().reduce((a, b) => a + b.savings, 0);
  const onCart = S.view === 'cart';
  const head = `<div class="pg-main-hd">
      ${onCart ? `<button type="button" class="sp-back" onclick="spreeSet('view','shop')"><span aria-hidden="true">‹</span> Back to shelves</button>` : ''}
      ${onCart ? '' : `<div class="sp-shop-tools sp-hd-tools">
        <label class="sp-search"><input type="search" id="spSearch" value="${esc(S.q)}" placeholder="Search the shelves" oninput="spreeSearch(this.value)" aria-label="Search the shelves"></label>
        ${_fulHtml()}
      </div>`}
      <span class="pg-sp"></span>
      ${_budgetHtml(all.reduce((a, s) => a + s.picked.reduce((b, p) => b + p.cost, 0), 0) - sv)}
      ${/* The Cart button lives in the app's dark bar now, visible on every tab (kaiweb-shell.js). */''}
    </div>`;
  if(S.view === 'cart') return head + cartPageHtml(all);
  // The search and Delivery & pickup sit in the header row now (see head).
  return head + `<div class="sp-shop">
      <div id="spShelves" class="sp-shelves"></div>
    </div>`;
}
// Shop as a side panel: the shelves, adding to the slot selected in the
// Shop navigator, or to the task open in the Editor.
function shopSideHtml(){
  const t = _sideTarget();
  return `<div class="sp-shop is-side">
    <div class="sp-ret" role="group" aria-label="Retailer">${RET.map(([k, tt]) => `<button type="button" class="${S.ret === k ? 'on' : ''}" onclick="spreeSet('ret','${k}')">${esc(tt)}</button>`).join('')}</div>
    <div class="sp-active${t ? '' : ' is-none'}">${t ? `<span class="sp-active-k">${t.picked.length ? 'Replacing for' : 'Adding to'}</span><b>${esc(slotLabel(t.t, t.l))}</b>${t.picked.length ? `<small class="sp-active-cur">Now: ${esc((_v2Cat(t.l, t.picked[0].sku) || {name:t.picked[0].sku}).name)}</small>` : ''}` : 'Open a task in the Editor to add products to it.'}</div>
    <div id="pgSideShelves" class="sp-shelves"></div>
  </div>`;
}
function _sideTarget(){
  const all = slots();
  if(S.active != null) return all.find(s => s.id === S.active) || null;
  if(typeof selId !== 'undefined' && selId != null) return all.find(s => s.id === selId) || null;
  return null;
}

/* ════════════ MEASUREMENTS ════════════
   Its own page (and openable as a side panel), after the Measurements page in
   the new Kai experience: Rooms / Floor plan; a 2D plan with a level picker and
   tools; the room list beside it, view only; click a room to see where it is.
   Wireframe rooms for 3484 South Main Street, sized to match the Shopping List
   (320 SF of LVP in a 20' × 16' living room, 48 SF of tile in an 8' × 6' bath). */
// Opens on Rooms, unless Floor plan was the last one used (remembered in this browser).
const MEAS = {view:'rooms', sel:'', labels:true, table:false};
try{ if(localStorage.getItem('kai_wf_meas_view') === 'plan') MEAS.view = 'plan'; }catch(e){}
const ROOMS = [   // name, x, y, w, l (feet)
  ['Kitchen', 0, 0, 16, 14], ['Living Room', 16, 0, 20, 16],
  ['Hallway', 0, 14, 16, 4], ['Entry', 16, 16, 8, 6], ['Bedroom 2', 24, 16, 12, 11],
  ['Primary Bed', 0, 18, 14, 13], ['Primary Bath', 14, 22, 10, 9], ['Bathroom', 24, 27, 8, 6],
];
const _ft = n => `${Math.floor(n)}'${n % 1 ? ` ${Math.round((n % 1) * 12)}"` : ''}`;
const _dims = r => `${_ft(r[3])} × ${_ft(r[4])}`;
function _planSvg(){
  const S2 = 10, W = 36 * S2, H = 33 * S2;
  return `<svg class="pg-plan-svg" viewBox="-12 -12 ${W + 24} ${H + 24}" role="img" aria-label="Level 1 floor plan">
    ${ROOMS.map(r => { const on = MEAS.sel === r[0]; const [x, y, w, h] = [r[1] * S2, r[2] * S2, r[3] * S2, r[4] * S2];
      return `<g class="pg-room-g${on ? ' is-on' : ''}" onclick="spreeRoom('${esc(r[0])}')" role="button" aria-label="${esc(r[0])}">
        <rect x="${x}" y="${y}" width="${w}" height="${h}"/>
        ${MEAS.labels ? `<text x="${x + w / 2}" y="${y + h / 2 + 4}">${esc(r[0])}</text>` : ''}
        ${on ? `<text class="pg-room-d" x="${x + w / 2}" y="${y + h / 2 + 18}">${_dims(r)}</text>` : ''}
      </g>`; }).join('')}
  </svg>`;
}
function measureHtml(where){
  const area = r => r[3] * r[4];
  const sw = `<span class="sp-ret sp-seg">${[['rooms', 'Rooms'], ['plan', 'Floor plan']].map(([k, t]) => `<button type="button" class="${MEAS.view === k ? 'on' : ''}" onclick="spreeMeas('view','${k}')">${t}</button>`).join('')}</span>`;
  const head = where === 'main' ? `<div class="pg-main-hd"><span class="sp-sec-t">Measurements</span><span class="pg-sp"></span>${sw}</div>` : `<div class="pg-meas-sw">${sw}</div>`;
  const list = `<div class="pg-meas-list">
      <div class="pg-meas-lh"><span class="sp-k">Level 1 · ${ROOMS.length} rooms</span><span class="sp-meta">View only</span></div>
      ${ROOMS.map(r => `<button type="button" class="pg-meas-room${MEAS.sel === r[0] ? ' is-on' : ''}" onclick="spreeRoom('${esc(r[0])}')"><span>${esc(r[0])}</span><small>${_dims(r)} · ${area(r)} sqft</small></button>`).join('')}
      <p class="sp-meta pg-meas-tip">Click a room to see its position and size.</p>
    </div>`;
  if(MEAS.view === 'rooms') return head + `<div class="pg-meas is-${where} is-rooms">
      ${_measSummary()}
      <div class="pg-boards">${ROOMS.map(r => _roomBoard(r, false)).join('')}</div>
      ${MEAS.table ? _measTable() : ''}
    </div>`;
  return head + `<div class="pg-meas is-${where}">
      <div class="pg-plan">
        <div class="pg-plan-tools">
          <span class="sp-ret sp-seg"><button type="button" class="on">2D plan</button><button type="button" disabled title="3D view isn't part of this wireframe">3D view</button></span>
          <button type="button" class="pg-plan-ic${MEAS.labels ? '' : ' is-off'}" onclick="spreeMeas('labels',${!MEAS.labels})" title="${MEAS.labels ? 'Hide' : 'Show'} room names" aria-label="${MEAS.labels ? 'Hide' : 'Show'} room names"><svg viewBox="0 0 16 16"><path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button>
          <button type="button" class="pg-plan-ic" onclick="toast('Would download the floor plan (wireframe)')" title="Download" aria-label="Download"><svg viewBox="0 0 16 16"><path d="M8 2v8M4.5 7L8 10.5 11.5 7M2.5 13.5h11" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button>
          <label class="pg-plan-lv"><span class="sp-k">Level</span><select aria-label="Level"><option>Level 1</option></select></label>
        </div>
        ${_planSvg()}
      </div>
      ${list}
    </div>`;
}
window.spreeMeas = function(k, v){ MEAS[k] = v; if(k === 'view'){ try{ localStorage.setItem('kai_wf_meas_view', v); }catch(e){} } render(); };
const _ceil = r => r[0] === 'Garage' ? 10 : 9;
const _area = r => r[3] * r[4], _per = r => 2 * (r[3] + r[4]), _walls = r => _per(r) * _ceil(r);
// The room's flooring, from what's chosen on the Shopping List.
function _floorOf(room){
  const s = slots().find(x => x.t.room === room && /floor/i.test(x.t.name || '') && x.picked.length);
  if(!s) return '';
  const c = _v2Cat(s.l, s.picked[0].sku) || catalogFind(s.picked[0].sku) || {};
  return c.name || '';
}
// A room's outline, to scale within a box
function _shape(r, box){
  const k = box / Math.max(r[3], r[4]), w = r[3] * k, h = r[4] * k;
  return `<svg class="pg-shape" viewBox="0 0 ${box + 4} ${box + 4}" width="${box + 4}" height="${box + 4}" aria-hidden="true"><rect x="${2 + (box - w) / 2}" y="${2 + (box - h) / 2}" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
}
/* ── Room boards: a room's selections laid out around its plan, like an
   interior designer's presentation board. Each selection is a swatch with a
   leader line to where it goes in the room; empty ones are dashed. Click a
   chosen swatch for the product pop-up, an empty one to shop for it. ── */
const _ANCHOR = {cabinet:[.25, .06], counter:[.42, .12], tile:[.5, .72], appliance:[.85, .1], floor:[.5, .72], paint:[0, .5],
  vanity:[1, .3], toilet:[1, .7], backsplash:[.45, .04], shower:[.2, .25], storage:[.88, .12], mech:[.5, 1], lighting:[.5, .4], ceilingfan:[.5, .42], detector:[.72, .22],
  blinds:[.5, 1], exhaust:[.68, .2], hardware:[.12, 1], door:[.2, 1], extdoor:[.5, 1]};
function _secOf(l, t){
  if(t && /backsplash/i.test(t.name)) return 'backsplash';
  if(t && /shower/i.test(t.name)) return 'shower';
  const x = _v2Pool(l)[0]; const c = x && (catalogFind(x.sku) || x); return (c && c.section) || (/door/i.test(_v2Need(l)) ? 'door' : ''); }
const _clip = (t, n) => t.length > n ? t.slice(0, n - 1) + '…' : t;
/* Plan symbols, in the usual drafting conventions, drawn light so the room still reads:
   ⊗ ceiling light · fan with blades · SD smoke/CO · EF exhaust fan · cabinet run with dashed uppers
   · countertop · range (four burners) · backsplash band · shower with X · floor patterns (planks,
   tile grid) with a finish tag · wall-finish tag for paint · vanity with basin · toilet · closet with
   rod · window with blinds · door swing for hardware and doors · garage door. Not chosen = dashed, lighter. */
function _sym(sec, x, y, b, empty, id){
  const u = Math.max(7, Math.min(b.rw, b.rh) / 9), d = empty ? ' stroke-dasharray="3 2"' : '';
  const g = inner => `<g class="pg-sym${empty ? ' is-empty' : ''}"${d}>${inner}</g>`;
  const top = b.ry + 2, bot = b.ry + b.rh - 2, lft = b.rx + 2, rgt = b.rx + b.rw - 2;
  // runs along a wall stay inside the room: shift the centre so the whole width fits
  const fitX = w => { const half = Math.min(w, rgt - lft) / 2; x = Math.min(Math.max(x, lft + half), rgt - half); };
  ({cabinet:6, counter:5, appliance:2, backsplash:6, storage:3.6, sink:3.2, mech:6, window:3.6, tub:5.2, blinds:3.2})[sec] && fitX(u * {cabinet:6, counter:5, appliance:2, backsplash:6, storage:3.6, sink:3.2, mech:6, window:3.6, tub:5.2, blinds:3.2}[sec]);
  switch(sec){
    case 'lighting': return g(`<circle cx="${x}" cy="${y}" r="${u * .8}"/><path d="M${x - u * .57} ${y - u * .57}L${x + u * .57} ${y + u * .57}M${x + u * .57} ${y - u * .57}L${x - u * .57} ${y + u * .57}"/>`);
    case 'ceilingfan': return g(`<circle cx="${x}" cy="${y}" r="${u * .35}"/>${[0, 90, 180, 270].map(a => `<ellipse cx="${x + u * 1.1}" cy="${y}" rx="${u * .7}" ry="${u * .22}" transform="rotate(${a} ${x} ${y})"/>`).join('')}`);
    case 'detector': return g(`<circle cx="${x}" cy="${y}" r="${u * .6}"/><text x="${x}" y="${y + u * .22}" style="font-size:${u * .6}px">SD</text>`);
    case 'exhaust': return g(`<rect x="${x - u * .7}" y="${y - u * .7}" width="${u * 1.4}" height="${u * 1.4}"/><circle cx="${x}" cy="${y}" r="${u * .45}"/>`);
    case 'cabinet': return g(`<rect x="${x - u * 3}" y="${top}" width="${u * 6}" height="${u * 1.3}"/><path d="M${x - u * 3} ${top + u * 2}h${u * 6}" stroke-dasharray="4 3"/><path d="M${x - u} ${top}v${u * 1.3}M${x + u} ${top}v${u * 1.3}"/>`);
    case 'counter': return g(`<rect x="${x - u * 2.5}" y="${top}" width="${u * 5}" height="${u * 1.1}"/><path d="M${x - u * 2.5} ${top + u * .9}h${u * 5}"/>`);
    case 'appliance': return g(`<rect x="${x - u}" y="${top}" width="${u * 2}" height="${u * 1.4}"/>${[[-.45, .4], [.45, .4], [-.45, 1], [.45, 1]].map(([a, c]) => `<circle cx="${x + a * u}" cy="${top + c * u}" r="${u * .22}"/>`).join('')}`);
    case 'backsplash': return g(`<path d="M${x - u * 3} ${top + u * .35}${[...Array(12)].map((_, i) => `L${x - u * 3 + (i + 1) * u * .5} ${top + (i % 2 ? u * .35 : u * .05)}`).join('')}"/>`);
    case 'shower': return g(`<rect x="${lft}" y="${top}" width="${u * 3}" height="${u * 3}"/><path d="M${lft} ${top}l${u * 3} ${u * 3}M${lft + u * 3} ${top}l${-u * 3} ${u * 3}"/>`);
    case 'floor': case 'tile': {
      const pid = `fp${id}`, pat = sec === 'tile'
        ? `<pattern id="${pid}" width="${u}" height="${u}" patternUnits="userSpaceOnUse"><path d="M0 0H${u}M0 0V${u}"/></pattern>`
        : `<pattern id="${pid}" width="${u * 3}" height="${u * .7}" patternUnits="userSpaceOnUse"><path d="M0 0H${u * 3}M${u * 1.5} 0V${u * .7}"/></pattern>`;
      return `<g class="pg-sym is-floor${empty ? ' is-empty' : ''}"><defs>${pat}</defs>${empty ? '' : `<rect x="${b.rx}" y="${b.ry}" width="${b.rw}" height="${b.rh}" fill="url(#${pid})" stroke="none"/>`}<rect class="pg-sym-tag" x="${x - u * .9}" y="${y - u * .5}" width="${u * 1.8}" height="${u}"${d}/><text x="${x}" y="${y + u * .2}" style="font-size:${u * .55}px">${sec === 'tile' ? 'T' : 'F'}</text></g>`;
    }
    case 'paint': return g(`<path d="M${lft + 3} ${b.ry + b.rh * .25}V${b.ry + b.rh * .75}" stroke-width="3"/><path d="M${x + u * .5} ${y}l${u * .6} ${-u * .55}h${u * .9}l${u * .6} ${u * .55}l${-u * .6} ${u * .55}h${-u * .9}z"/><text x="${x + u * 1.55}" y="${y + u * .22}" style="font-size:${u * .55}px">P</text>`);
    case 'vanity': return g(`<rect x="${rgt - u * 1.5}" y="${y - u * 1.5}" width="${u * 1.5}" height="${u * 3}"/><ellipse cx="${rgt - u * .75}" cy="${y}" rx="${u * .45}" ry="${u * .7}"/>`);
    case 'toilet': return g(`<rect x="${rgt - u * .55}" y="${y - u * .7}" width="${u * .55}" height="${u * 1.4}"/><ellipse cx="${rgt - u * 1.25}" cy="${y}" rx="${u * .75}" ry="${u * .5}"/>`);
    case 'storage': return g(`<rect x="${x - u * 1.8}" y="${top}" width="${u * 3.6}" height="${u * 1.4}"/><path d="M${x - u * 1.8} ${top + u * .7}h${u * 3.6}" stroke-dasharray="2 2"/>`);
    case 'blinds': return g(`<path d="M${x - u * 1.6} ${bot - 2}h${u * 3.2}M${x - u * 1.6} ${bot + 2}h${u * 3.2}"/><path d="M${x - u * 1.6} ${bot - u * .6}${[...Array(8)].map((_, i) => `L${x - u * 1.6 + (i + 1) * u * .4} ${bot - (i % 2 ? u * .6 : u * .3)}`).join('')}"/>`);
    case 'hardware': case 'door': return g(`<path d="M${x} ${bot}V${bot - u * 2.2}"/><path d="M${x} ${bot - u * 2.2}A${u * 2.2} ${u * 2.2} 0 0 1 ${x + u * 2.2} ${bot}" stroke-dasharray="3 2"/>${sec === 'hardware' ? `<circle cx="${x + u * 1.9}" cy="${bot - u * .35}" r="${u * .18}"/>` : ''}`);
    case 'mech': return g(`<rect x="${x - u * 3}" y="${bot - u * .5}" width="${u * 6}" height="${u * .5}"/><rect x="${x - u * .6}" y="${b.ry + b.rh * .45}" width="${u * 1.2}" height="${u * .8}"/><path d="M${x} ${b.ry + b.rh * .45 + u * .8}V${bot - u * .5}" stroke-dasharray="3 2"/>`);
    case 'sink': return g(`<rect x="${x - u * 1.6}" y="${top}" width="${u * 3.2}" height="${u * 1.4}"/><rect x="${x - u * 1.4}" y="${top + u * .2}" width="${u * 1.25}" height="${u}" rx="${u * .25}"/><rect x="${x + u * .15}" y="${top + u * .2}" width="${u * 1.25}" height="${u}" rx="${u * .25}"/>`);
    case 'window': { const wy = y <= b.ry + 1 ? b.ry : b.ry + b.rh; return g(`<rect x="${x - u * 1.8}" y="${wy - 3}" width="${u * 3.6}" height="6" fill="#fff"/><path d="M${x - u * 1.8} ${wy}h${u * 3.6}"/>`); }
    case 'fireplace': return g(`<rect x="${rgt - u * 1.2}" y="${y - u * 1.8}" width="${u * 1.2}" height="${u * 3.6}"/><rect x="${rgt - u * .8}" y="${y - u}" width="${u * .8}" height="${u * 2}"/>`);
    case 'tub': { const ty = y <= b.ry + 1 ? top : bot - u * 2.2; return g(`<rect x="${x - u * 2.6}" y="${ty}" width="${u * 5.2}" height="${u * 2.2}"/><rect x="${x - u * 2.3}" y="${ty + u * .3}" width="${u * 4.6}" height="${u * 1.6}" rx="${u * .7}"/>`); }
    case 'linen': { const lx2 = x <= b.rx + 1 ? lft : x >= b.rx + b.rw - 1 ? rgt - u * 1.2 : x - u * 1.5, ly = y >= b.ry + b.rh - 1 ? bot - u * 1.2 : y - u * 1.2;
      const w = x <= b.rx + 1 || x >= b.rx + b.rw - 1 ? u * 1.2 : u * 3, h = w === u * 1.2 ? u * 2.4 : u * 1.2;
      return g(`<rect x="${lx2}" y="${ly}" width="${w}" height="${h}"/><path d="M${lx2} ${ly}l${w} ${h}"/>`); }
    case 'wh': return g(`<circle cx="${x}" cy="${y}" r="${u * .9}"/><text x="${x}" y="${y + u * .25}" style="font-size:${u * .65}px">WH</text>`);
    case 'bench': return g(`<rect x="${lft}" y="${y - u * 2.5}" width="${u * 1.4}" height="${u * 5}"/>`);
    case 'extdoor':
    case 'frontdoor': return g(`<path d="M${x - u * 1.2} ${bot}V${bot - u * 2.4}"/><path d="M${x - u * 1.2} ${bot - u * 2.4}A${u * 2.4} ${u * 2.4} 0 0 1 ${x + u * 1.2} ${bot}"/>`);
    default: return g(`<circle cx="${x}" cy="${y}" r="${u * .4}"/>`);
  }
}
// What's already in each room and staying (wireframe data; from the scan and property photos):
// [type, description, plan symbol, x, y]
const EXISTING = {
  'Kitchen':[['Sink & faucet', 'Double-bowl sink, chrome faucet', 'sink', .6, .04], ['Window', 'Double-hung, 36 in.', 'window', .35, 1]],
  'Living Room':[['Fireplace', 'Brick surround, wood mantel', 'fireplace', 1, .5], ['Window', 'Picture window, 72 in.', 'window', .5, 0]],
  'Primary Bath':[['Bathtub', 'Alcove tub, white', 'tub', .5, 1], ['Linen cabinet', 'Built-in, painted white', 'linen', 0, .7]],
  'Bathroom':[['Tub & shower', 'Tub / shower combo, white', 'tub', .5, 0], ['Medicine cabinet', 'Recessed, mirrored', 'linen', 1, .65]],
  'Primary Bed':[['Window', 'Double-hung, pair', 'window', .45, 0]],
  'Bedroom 2':[['Window', 'Double-hung, 36 in.', 'window', .4, 0]],
  'Garage':[['Water heater', '50 gal gas', 'wh', .88, .82], ['Workbench', 'Built-in, 8 ft', 'bench', 0, .45]],
  'Entry':[['Front door', 'Six-panel, painted', 'frontdoor', .5, 1], ['Coat closet', 'Bifold doors', 'linen', 0, .4]],
  'Hallway':[['Linen closet', 'Built-in shelves', 'linen', .5, 1]],
};
/* ── Empty-scope version: start with no tasks at all. Everything the scope
   would have touched is "existing" in its room instead, ready to keep or
   replace from the room boards. (Set by window.__WF_EMPTY on the page.) ── */
const WF_EMPTY = !!(window.__WF_EMPTY || (window.parent && window.parent !== window && (() => { try{ return window.parent.__WF_EMPTY; }catch(e){ return false; } })()));
if(WF_EMPTY && typeof TASKS !== 'undefined'){
  const seen = {};
  slots().forEach(s => {
    const room = s.t.room, sec = _secOf(s.l, s.t), base = _ANCHOR[sec] || [.5, .5];
    const n = seen[room + sec] = (seen[room + sec] || 0) + 1;
    const edgeX = base[0] === 0 || base[0] === 1;
    const x = edgeX ? base[0] : Math.min(.9, Math.max(.1, base[0] + (n - 1) * .12)), y = base[1] === 0 || base[1] === 1 ? base[1] : Math.min(.9, Math.max(.1, base[1] + (edgeX ? (n - 1) * .12 : 0)));
    const need = _v2Need(s.l);
    (EXISTING[room] = EXISTING[room] || []).push([need.charAt(0).toUpperCase() + need.slice(1), 'In place today', sec, x, y, s.t.name]);
  });
  TASKS.length = 0;
  // a brand-new scope has no notes yet
  try{ if(typeof roomNotes === 'function') roomNotes = () => []; }catch(e){}
  try{ if(typeof selId !== 'undefined') selId = null; }catch(e){}
  setTimeout(() => { if(typeof renderAll === 'function') renderAll(); render(); }, 0);
}
/* ── Building the scope from the room boards ──
   Existing things can be kept (default) or replaced; replacing creates the task
   ("Replace · Medicine cabinet") in the scope, which then shows on the Shopping List.
   A task's item can go back to "keep existing", which removes the task. "+ Add to
   room" creates a task for something new. The scope navigator updates as you go. */
const KEPT = {};   // room → items turned back into "existing" from a task
const ADDABLE = [['Ceiling light fixture', 'Light fixture'], ['Ceiling fan', 'Ceiling fan'], ['Smoke and CO detectors', 'Smoke & CO detector'],
  ['Window blinds', 'Blinds & shades'], ['Exhaust fan', 'Exhaust fan'], ['Paint', 'Interior paint'], ['Door hardware', 'Door knobs & locks'],
  ['Vanity', 'Vanity'], ['Toilet', 'Toilet'], ['Interior Doors', 'Interior door']];
const _DEPT_FOR = {'Bathtub':'Bathroom', 'Tub & shower':'Bathroom', 'Medicine cabinet':'Bathroom', 'Sink & faucet':'Kitchen', 'Linen cabinet':'Storage & Organization', 'Coat closet':'Storage & Organization', 'Linen closet':'Storage & Organization'};
function _existingOf(room){
  const gone = new Set(TASKS.filter(t => t.__from && t.room === room).map(t => t.__from));
  return (EXISTING[room] || []).map(([type, desc, sec, x, y, task], i) => ({key:'e' + i, type, desc, sec, x, y, task}))
    .concat(KEPT[room] || []).filter(e => !gone.has(e.key));
}
function _newTask(room, name, extra){
  const id = Math.max(0, ...TASKS.map(t => t.id)) + 1;
  const t = Object.assign({id, code:'NEW-' + id, room, name, opt:'Replace', gc:'', product:'(not selected)', qty:name === 'Paint' ? '1 room' : '1 ea', rate:'$0', cost:'$0.00', pcost:'$0',
    photos:0, flags:[], mods:[], status:'new', desc:`${name} – ${room}. Added from the room board on Measurements.`, notes:0, photoUrls:[], groupPhotoUrls:[],
    options:[{id:'opt_' + id, name:'Replace', description:'REPLACE', qty:'1', qtyUnit:name === 'Paint' ? 'room' : 'ea', rate:'$0', cost:'$0.00', products:[], added:false}]}, extra || {});
  TASKS.push(t);
  return t;
}
function _scopeChanged(t, msg){
  if(typeof renderAll === 'function') renderAll();
  render();
  toast(msg);
}
// "Replace cabinets", "Replace countertops", "Replace toilet": the line's name for
// things bought by length or area, the item's own name for single things.
function _replaceName(e){
  const base = e.task || e.type;
  const probe = Object.assign({}, TASKS[0] || {}, {name:base, opt:'Replace', options:[], product:'', desc:''});
  let line = '';
  try{ line = taskLine(probe).line || ''; }catch(err){}
  // bought by length, area or the room: the line's name ("cabinets"); single things: the item ("toilet")
  const byArea = /^(cabinets|countertops|tile|vinyl plank \(lvp\)|carpet|hardwood|laminate|interior paint|blinds & shades|smoke & co detectors|door knobs & locks)$/i.test(line);
  const word = byArea ? line.replace(/\s*\(.*\)/, '') : e.type;
  const name = `Replace ${word.replace(/\s*\(.*?\)/g, '').toLowerCase().replace(/\bco\b/, 'CO')}`;
  // keep the name only if it still lands on the same product line (so its shelf still opens)
  try{ if(line && !/other/i.test(line) && taskLine(Object.assign({}, probe, {name})).line !== line) return base; }catch(err){ return base; }
  return name;
}
window.spreeReplaceExisting = function(room, key){
  const e = _existingOf(room).find(x => x.key === key); if(!e) return;
  const t = _newTask(room, _replaceName(e), {__from:key, __type:e.type, __sym:e.sec, __an:[e.x, e.y], dept:_DEPT_FOR[e.type]});
  _scopeChanged(t, `Added to scope: ${t.name} – ${room}`);
  // the new item's shelf opens right away, ready to pick a product
  if(slots().some(s => s.id === t.id)) spreeBoardShop(t.id);
};
window.spreeKeepExisting = function(id){
  const i = TASKS.findIndex(t => t.id === id); if(i < 0) return;
  const t = TASKS[i], s = slots().find(x => x.id === id);
  if(!t.__from && !t.__added){   // an item from the original scope: it becomes an existing item to keep
    const sec = t.__sym || (s ? _secOf(s.l, t) : ''), an = t.__an || _ANCHOR[sec] || [.5, .5];
    (KEPT[t.room] = KEPT[t.room] || []).push({key:'k' + t.id, type:s ? _v2Need(s.l) : t.name, task:t.name, desc:'Keeping the existing one', sec, x:an[0], y:an[1]});
  }
  TASKS.splice(i, 1);
  if(S.active === id) S.active = null;
  _scopeChanged(null, t.__added ? `Removed from scope: ${t.name} – ${t.room}` : `Keeping the existing ${(s ? _v2Need(s.l) : t.name).toLowerCase()} – ${t.room} (task removed)`);
};
window.spreeAddToRoom = function(room, name){
  if(!name) return;
  const t = _newTask(room, name, {__added:true, opt:'Add', __type:(ADDABLE.find(a => a[0] === name) || [, name])[1]});
  _scopeChanged(t, `Added to scope: ${name} – ${room}`);
};
function _roomBoard(r, big){
  const items = slots().filter(s => s.t.room === r[0]);
  const exist = _existingOf(r[0]).map(e => ({ex:{type:e.type, desc:e.desc, i:e.key, key:e.key}, sec:e.sec, an:[e.x, e.y]}));
  const area = r[3] * r[4];
  // full page: a wider canvas so the board fills the screen sideways, with a bigger room plan
  const W = big ? 1180 : 980, row = 128;   // full page: a tighter canvas, so it scales up and everything reads bigger
  // where each selection goes in the room (0–1 across, 0–1 down); same kinds spread apart
  const seen = {};
  const placed = items.map(s => { if(s.t.__sym) return {s, sec:s.t.__sym, an:s.t.__an};
    const sec = _secOf(s.l, s.t), base = _ANCHOR[sec] || [.5, .5], n = seen[sec] = (seen[sec] || 0) + 1;
    const off = (n - 1) * .12, edgeX = base[0] === 0 || base[0] === 1, edgeY = base[1] === 0 || base[1] === 1;
    const fx = edgeX ? base[0] : Math.min(.9, Math.max(.1, base[0] + off)), fy = edgeY ? base[1] : Math.min(.9, Math.max(.1, base[1] + (edgeX ? off : 0)));
    return {s, sec, an:[Math.min(.97, Math.max(.03, fx)), Math.min(.97, Math.max(.03, fy))]}; }).concat(exist);
  // swatches sit on the side nearer their spot, top to bottom in the order of their spots, so leaders don't cross
  let L = placed.filter(p => p.an[0] <= .5), R = placed.filter(p => p.an[0] > .5);
  while(L.length - R.length > 1){ L.sort((a, b) => b.an[0] - a.an[0]); R.push(L.shift()); }
  while(R.length - L.length > 1){ R.sort((a, b) => a.an[0] - b.an[0]); L.push(R.shift()); }
  L.sort((a, b) => a.an[1] - b.an[1]); R.sort((a, b) => a.an[1] - b.an[1]);
  const nL = L.length, nR = R.length;
  const H = Math.max(Math.max(nL, nR) * row + 24, 320);
  // the room, to scale, in the middle
  const k = Math.min((big ? 420 : 300) / r[3], (H - 70) / r[4]), rw = r[3] * k, rh = r[4] * k, rx = (W - rw) / 2, ry = (H - rh) / 2 + 8;
  const tileW = big ? 320 : 300, sw = 108;
  const syms = placed.map(q => q.ex ? `<g class="is-existing">${_sym(q.sec, rx + q.an[0] * rw, ry + q.an[1] * rh, {rx, ry, rw, rh}, false, 'x' + q.ex.i)}</g>`
    : _sym(q.sec, rx + q.an[0] * rw, ry + q.an[1] * rh, {rx, ry, rw, rh}, !q.s.picked.length, q.s.t.id)).join('');
  const col = (list, side) => list.map(({s, an, ex}, i) => {
    const n = list.length, y = (H - n * row) / 2 + i * row + 10;
    const x = side === 'L' ? 8 : W - tileW - 8;
    const ax = rx + an[0] * rw, ay = ry + an[1] * rh;
    if(ex){   // already in the room, staying: a photo from the property, hatched swatch, no shopping
      const sx = side === 'L' ? x : x + tileW - sw, txX = side === 'L' ? x + sw + 10 : x + tileW - sw - 10, at = side === 'L' ? 'start' : 'end', lx = side === 'L' ? x + tileW + 6 : x - 6;
      return `<g class="pg-sw is-existing" onclick="spreeRoomMedia('${esc(r[0])}')" role="button" aria-label="${esc(ex.type)}, existing">
        <title>${esc(ex.type)} · existing, staying · ${esc(ex.desc)} · see property photos</title>
        <polyline class="pg-lead" points="${lx},${y + sw / 2} ${side === 'L' ? lx + 12 : lx - 12},${y + sw / 2} ${ax},${ay}"/>
        <circle class="pg-dot" cx="${ax}" cy="${ay}" r="2.5"/>
        <rect class="pg-sw-img" x="${sx}" y="${y}" width="${sw}" height="${sw}" style="fill:url(#exh${r[0].replace(/\W/g, '')})"/>
        <g class="pg-sw-cam" transform="translate(${sx + sw - 24} ${y + 6})"><rect width="18" height="13" rx="2"/><circle cx="9" cy="7" r="3.2"/></g>
        <text class="pg-sw-k" x="${txX}" y="${y + 34}" text-anchor="${at}">${esc(ex.type.toUpperCase())}</text>
        <text class="pg-sw-n" x="${txX}" y="${y + 54}" text-anchor="${at}">Existing · keeping</text>
        <text class="pg-sw-m" x="${txX}" y="${y + 72}" text-anchor="${at}">${esc(_clip(ex.desc, 30))}</text>
        <text class="pg-sw-swap" x="${txX}" y="${y + 94}" text-anchor="${at}" onclick="event.stopPropagation();spreeReplaceExisting('${esc(r[0])}','${ex.key}')" role="button">↻ Replace</text>
      </g>`;
    }
    const p = s.picked[0], c = p ? (_v2Cat(s.l, p.sku) || catalogFind(p.sku) || {name:p.sku}) : null;
    const need = s.t.__type || _v2Need(s.l), cost = s.picked.reduce((a, q) => a + q.cost, 0);
    const sx = side === 'L' ? x : x + tileW - sw, tx = side === 'L' ? x + sw + 10 : x, anchorTx = side === 'L' ? 'start' : 'end';
    const txX = side === 'L' ? tx : x + tileW - sw - 10;
    const lx = side === 'L' ? x + tileW + 6 : x - 6;   // where the leader leaves the swatch, clear of its text
    const act = p ? `spreeBoardDetail(${s.id},'${esc(p.sku)}')` : `spreeBoardShop(${s.id})`;
    return `<g class="pg-sw${p ? '' : ' is-empty'}" data-slot="${s.id}" onclick="${act}" ondragover="spreeOver(event,this)" ondragleave="spreeLeave(this)" ondrop="spreeDrop(event,${s.id})" role="button" aria-label="${esc(need)}${c ? ': ' + esc(c.name) : ', not chosen'}">
      <title>${esc(need)}${c ? ' · ' + esc(c.name) + ' · ' + money(cost) : ' · not chosen yet'}</title>
      <polyline class="pg-lead" points="${lx},${y + sw / 2} ${side === 'L' ? lx + 12 : lx - 12},${y + sw / 2} ${ax},${ay}"/>
      <circle class="pg-dot" cx="${ax}" cy="${ay}" r="2.5"/>
      <rect class="pg-sw-img" x="${sx}" y="${y}" width="${sw}" height="${sw}"/>
      ${p ? '' : `<text class="pg-sw-plus" x="${sx + sw / 2}" y="${y + sw / 2 + 9}">+</text>`}
      <text class="pg-sw-k" x="${txX}" y="${y + 34}" text-anchor="${anchorTx}">${esc(need.toUpperCase())}</text>
      <text class="pg-sw-n" x="${txX}" y="${y + 54}" text-anchor="${anchorTx}">${esc(c ? _clip(c.name, 22) : 'Not chosen yet')}</text>
      <text class="pg-sw-m" x="${txX}" y="${y + 72}" text-anchor="${anchorTx}">${c ? `${esc(supplierName(supOf(p)))} · ${money(cost)}` : _v2Pool(s.l).length ? 'Shop for it' : 'No products in the catalog yet'}</text>
      ${c ? `<text class="pg-sw-swap" x="${txX}" y="${y + 94}" text-anchor="${anchorTx}" onclick="event.stopPropagation();spreeBoardShop(${s.id})" role="button">⇄ Swap</text>` : ''}
      <text class="pg-sw-keep" x="${txX}" y="${y + (c ? 112 : 94)}" text-anchor="${anchorTx}" onclick="event.stopPropagation();spreeKeepExisting(${s.id})" role="button">${s.t.__added ? '✕ Remove from scope' : '↺ Keep existing'}</text>
      ${s.t.status === 'new' && (s.t.__from || s.t.__added) ? `<text class="pg-sw-new" x="${txX}" y="${y + 16}" text-anchor="${anchorTx}">NEW TASK</text>` : ''}
    </g>`;
  }).join('');
  const chosen = items.filter(s => s.picked.length), rid = r[0].replace(/\W/g, '');
  const spend = chosen.reduce((a, s) => a + s.picked.reduce((b, q) => b + q.cost, 0), 0);
  return `<section class="pg-board${MEAS.sel === r[0] ? ' is-on' : ''}" data-room="${esc(r[0])}">
    <div class="pg-board-hd" onclick="spreeRoom('${esc(r[0])}')"><b>${esc(r[0])}</b><span class="sp-meta">${_dims(r)} × ${_ft(_ceil(r))} · ${area} sqft</span><span class="pg-sp"></span>
      <label class="pg-addroom" onclick="event.stopPropagation()"><select onchange="spreeAddToRoom('${esc(r[0])}',this.value);this.value=''" aria-label="Add to ${esc(r[0])}"><option value="">+ Add to room</option>${ADDABLE.map(([n, t]) => `<option value="${esc(n)}">${esc(t)}</option>`).join('')}</select></label>
      <span class="sp-meta">${items.length ? `${chosen.length} of ${items.length} chosen${spend ? ` · ${money(spend)}` : ''}` : 'Nothing to buy'}${exist.length ? ` · ${exist.length} existing` : ''}</span></div>
    ${placed.length ? `<svg class="pg-board-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(r[0])} selections">
      <defs><pattern id="exh${rid}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#e4e4e4"/><path d="M0 0V8" stroke="#cfcfcf" stroke-width="3"/></pattern></defs>
      <rect class="pg-board-room" x="${rx}" y="${ry}" width="${rw}" height="${rh}"/>
      ${syms}
      <rect class="pg-board-room is-line" x="${rx}" y="${ry}" width="${rw}" height="${rh}"/>
      <text class="pg-board-rn" x="${W / 2}" y="${ry - 8}">${esc(r[0])}</text>
      ${col(L, 'L')}${col(R, 'R')}
    </svg>
    <div class="pg-legend"><span><i class="is-chosen"></i>Chosen</span><span><i class="is-needed"></i>Still needed</span><span><i class="is-existing"></i>Existing · keeping</span></div>` : `<p class="sp-meta pg-board-none">Nothing recorded for this room.</p>`}
  </section>`;
}
function _measSummary(){
  const tot = f => ROOMS.reduce((a, r) => a + f(r), 0).toLocaleString('en-US');
  const fls = [...new Set(ROOMS.map(r => _floorOf(r[0])).filter(Boolean))];
  return `<section class="pg-msum">
      <div class="pg-msum-hd"><h3>Project Measurements</h3><button type="button" class="sp-done" onclick="spreeMeas('table',true)">View table ↗</button></div>
      <div class="pg-msum-stats">
        <span><span class="sp-k">Listed area</span><b>—</b></span>
        <span><span class="sp-k">Measured area</span><b>${tot(_area)} <small>sqft</small></b></span>
        <span class="pg-msum-sep"></span>
        <span><span class="sp-k">Perimeter</span><b>${tot(_per)} <small>ft</small></b></span>
        <span><span class="sp-k">Walls</span><b>${tot(_walls)} <small>sqft</small></b></span>
        <span><span class="sp-k">Flooring</span><b>${fls.length || '—'}${fls.length ? ' <small>types</small>' : ''}</b></span>
      </div>
      <div class="pg-msum-fl">${fls.length ? fls.map(f => `<span class="pg-chip">${esc(f)}</span>`).join('') : '<span class="pg-chip">None specified</span>'}</div>
    </section>`;
}
function _measTable(){
  const tot = f => ROOMS.reduce((a, r) => a + f(r), 0).toLocaleString('en-US');
  return `<div class="pg-mmodal"><div class="sp-scrim" onclick="spreeMeas('table',false)"></div>
    <div class="pg-mmodal-c" role="dialog" aria-modal="true" aria-label="Project Measurements">
      <div class="pg-msum-hd"><h3>Project Measurements</h3><button type="button" class="sp-x" onclick="spreeMeas('table',false)" aria-label="Close">✕</button></div>
      <h4 class="sp-k">Overview</h4>
      <div class="pg-msum-stats"><span><span class="sp-k">Listed area (sqft)</span><b>—</b></span><span><span class="sp-k">Measured area (sqft)</span><b>${tot(_area)}</b></span><span><span class="sp-k">Perimeter (ft)</span><b>${tot(_per)}</b></span><span><span class="sp-k">Walls (sqft)</span><b>${tot(_walls)}</b></span></div>
      <h4 class="sp-k">Room measurements</h4>
      <div class="sp-tbl-wrap"><table class="sp-tbl pg-meas-tbl">
        <thead><tr><th>Room</th><th>Width × Length × Height</th><th class="num">Area</th><th class="num">Perimeter</th><th class="num">Walls</th></tr></thead>
        <tbody><tr class="pg-mtot"><td><b>Level 1 (totals)</b></td><td></td><td class="num"><b>${tot(_area)}</b> sqft</td><td class="num"><b>${tot(_per)}</b> ft</td><td class="num"><b>${tot(_walls)}</b> sqft</td></tr>
        ${ROOMS.map(r => `<tr><td>${esc(r[0])}</td><td><span class="pg-mdim">${_shape(r, 14)}${_dims(r)} × ${_ft(_ceil(r))}</span></td><td class="num"><b>${_area(r)}</b> sqft</td><td class="num"><b>${_per(r)}</b> ft</td><td class="num"><b>${_walls(r)}</b> sqft</td></tr>`).join('')}</tbody>
      </table></div>
    </div></div>`;
}
document.addEventListener('keydown', e => { if(e.key === 'Escape' && MEAS.table){ MEAS.table = false; render(); } });
window.spreeRoom = function(n){ MEAS.sel = MEAS.sel === n ? '' : n; render(); };

/* ── Media page: photos, videos, mood board ── */
/* One toolbar row: the view on the left; on Property, what to show (a compact
   dropdown) and the thumbnail size (two icons) on the right. */
const _ICON_GRID_S = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1h3v3H1zM5.5 1h3v3h-3zM10 1h3v3h-3zM1 5.5h3v3H1zM5.5 5.5h3v3h-3zM10 5.5h3v3h-3zM1 10h3v3H1zM5.5 10h3v3h-3zM10 10h3v3h-3z" fill="currentColor"/></svg>';
const _ICON_GRID_L = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1h5.5v5.5H1zM7.5 1H13v5.5H7.5zM1 7.5h5.5V13H1zM7.5 7.5H13V13H7.5z" fill="currentColor"/></svg>';
function mediaOptsHtml(){
  const view = `<div class="pg-seg" role="group" aria-label="Media view">
    <button type="button" class="${MEDIA.view === 'photos' ? 'on' : ''}" onclick="pgMedia('view','photos')">Property</button>
    <button type="button" class="${MEDIA.view === 'mood' ? 'on' : ''}" onclick="pgMedia('view','mood')">Mood board</button>
  </div>`;
  if(MEDIA.view === 'mood' || PAGES.media.kw) return view;
  return view + `<span class="pg-sp"></span>
    <select class="pg-media-show" aria-label="Show" onchange="pgMedia('show',this.value)">${[['all', 'All media'], ['photos', 'Photos'], ['videos', 'Videos']].map(([k, t]) => `<option value="${k}"${MEDIA.show === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
    <div class="pg-seg pg-seg-ic" role="group" aria-label="Thumbnail size">${[['small', 'Small thumbnails', _ICON_GRID_S], ['large', 'Large thumbnails', _ICON_GRID_L]].map(([k, t, ic]) => `<button type="button" class="${MEDIA.size === k ? 'on' : ''}" onclick="pgMedia('size','${k}')" title="${t}" aria-label="${t}" aria-pressed="${MEDIA.size === k}">${ic}</button>`).join('')}</div>`;
}
// From an existing item on a room board: open Media (as the side panel unless it's
// already open) on Property, scrolled to that room's photos, which flash briefly.
// From a "not chosen yet" swatch: open Shop (as the side panel unless it's already
// open) with that Shopping List item selected, so only its shelf shows.
window.spreeBoardDetail = function(id, sku){ _detail.slot = id; spreeDetail(null, 'board', sku); };
window.spreeBoardShop = function(id){
  if(PG.primary === 'shopkai'){ spreeShopFor(id); return; }
  S.active = id; S.view = 'shop'; S.q = ''; S.help = null;
  // Shop opens as the main page; the side panel (Measurements) stays put.
  PG.primary = 'shopkai'; render(); spreeShopFor(id);
};
window.spreeRoomMedia = function(room){
  MEDIA.view = 'photos'; MEDIA.show = 'all'; MEDIA.room = room;
  // The side panel switches to Media.
  PG.side = 'media'; _saveSide();
  const sp = document.getElementById('pgSide'); if(sp) sp.dataset.key = '';
  render();
  const host = PG.primary === 'media' ? document.getElementById('pgMain') : document.querySelector('#pgSide .pg-side-b');
  const sec = host && host.querySelector(`.pg-room[data-room="${CSS.escape(room)}"]`);
  if(sec){ host.scrollTop += sec.getBoundingClientRect().top - host.getBoundingClientRect().top - 8; }
  clearTimeout(window.__pgFlash); window.__pgFlash = setTimeout(() => { MEDIA.room = ''; document.querySelectorAll('.pg-room.is-flash').forEach(x => x.classList.remove('is-flash')); }, 1600);
};
window.pgMedia = function(k, v){ MEDIA[k] = v; const sp = document.getElementById('pgSide'); if(sp) sp.dataset.key = ''; render(); };
function mediaHtml(where){
  const head = where === 'main' ? `<div class="pg-main-hd"><span class="sp-sec-t">Media</span>${mediaOptsHtml()}<span class="pg-sp"></span></div>` : '';
  if(MEDIA.view === 'mood') return head + `<div class="pg-media is-${where}">${moodHtml()}</div>`;
  const all = slots();
  const rooms = [...new Set((all.length ? all.map(s => s.t.room) : ['Kitchen', 'Living Room', 'Bathroom']).concat(typeof ROOMS !== 'undefined' ? ROOMS.map(r => r[0]) : []))];
  const filt = '';   // the show / size controls live in the toolbar row (mediaOptsHtml)
  const items = n => [...Array(n)].map((_, i) => ({video: i % 4 === 3, n:i + 1})).filter(x => MEDIA.show === 'all' || (MEDIA.show === 'videos') === x.video);
  return head + `<div class="pg-media is-${where}">${filt}
    ${rooms.map(r => { const list = items(5); return list.length ? `<section class="pg-room${MEDIA.room === r ? ' is-flash' : ''}" data-room="${esc(r)}"><div class="sp-grp-hd"><span>${esc(r)}</span><span class="sp-grp-n">${list.length}</span></div>
      <div class="pg-thumbs is-${MEDIA.size}">${list.map(x => `<figure class="sp-photo">${PH('', ART.room(r, x.n))}${x.video ? '<span class="pg-play">▶ 0:42</span>' : ''}<figcaption>${esc(r)} · ${x.video ? 'video' : 'photo'} ${x.n}</figcaption></figure>`).join('')}</div></section>` : ''; }).join('')}
  </div>`;
}
function moodHtml(){
  const all = slots();
  const pickedAll = [];
  all.forEach(s => s.picked.forEach(p => { const c = _v2Cat(s.l, p.sku); if(c) pickedAll.push({s, p, c}); }));
  const metals = new Set(pickedAll.map(r => metalOf(r.c)).filter(Boolean));
  const clash = metals.has('warm') && metals.has('cool');
  const odd = clash ? pickedAll.filter(r => metalOf(r.c) === 'warm') : [];
  const tiles = S.guide === 'supplied'
    ? [...Array(MOOD_N())].map((_, i) => `<figure class="sp-mood">${PH(MOOD_SHAPE[i % MOOD_SHAPE.length], MOOD_ART(i))}<figcaption>${esc(MOOD_LABEL(i))}</figcaption></figure>`).join('')
    : (pickedAll.length ? pickedAll.map((r, i) => `<figure class="sp-mood${clash && metalOf(r.c) === 'warm' ? ' is-odd' : ''}">${PH('sp-h' + ((i + 1) % 4), ART.product(r.c))}<figcaption>${esc(r.c.name)}<small>${esc(r.s.t.room)}${finishOf(r.c) ? ' · ' + esc(finishOf(r.c)) : ''}</small></figcaption></figure>`).join('')
      : '<div class="sp-empty">Pick products and the board builds itself from them.</div>');
  return `
    ${clash ? `<div class="sp-warn"><b>Finish mismatch.</b> ${odd.map(r => `${esc(finishOf(r.c))} in ${esc(slotLabel(r.s.t, r.s.l))}`).join('; ')}, in a home of nickel and stainless.
      <button type="button" class="sp-link" onclick="pgPrimary('shopkai');spreeSlot(${odd[0].s.id})">Review</button></div>` : ''}
    <div class="sp-mood-grid">${tiles}</div>
    <label class="sp-pin">Add a Pinterest board ${FUT}<input type="url" placeholder="pinterest.com/…" disabled></label>`;
}

/* ── open / state ── */
window.spreeOpen = function(taskId){
  if(taskId != null) S.active = taskId;
  PG.primary = 'shopkai';
  // First visit: open the panel on Media. After that, keep whatever the person left it as.
  if(!PG.side && !_sideSaved) PG.side = 'media';
  render();
};
window.spreeClose = function(){ PG.primary = null; render(); };
/* For the app bar's Cart button, which is on screen whatever tab is open:
   what's in the cart, and a way to open it (or go back to the shelves). */
window.kwCartInfo = function(){
  if(!document.querySelector('#workHdr .pg-tab')) return null;   // no Shop at this stage (e.g. a completed job)
  const all = slots(); if(!all.length) return null;
  const sv = bundles().reduce((a, b) => a + b.savings, 0);
  const inCart = all.filter(s => !REV.later.has(s.id) && s.picked.length);
  const total = inCart.reduce((a, s) => a + s.picked.reduce((b, p) => b + p.cost, 0), 0) - sv;
  return {n:inCart.length, total:money(total), on:PG.primary === 'shopkai' && S.view === 'cart',
    totalNum:total, slots:all.length, missing:all.filter(s => !s.picked.length).length};
};
window.kwMiniCartHtml = () => miniCartHtml();
window.kwOpenCart = function(){
  if(PG.primary === 'shopkai' && S.view === 'cart'){ S.view = 'shop'; render(); return; }
  S.view = 'cart'; S.help = null;
  if(PG.primary !== 'shopkai') spreeOpen(); else render();
};
window.spreeSet = function(k, v){
  S[k] = v;
  if(k === 'by' || k === 'view') S.help = null;
  if(k === 'guide'){ const sp = document.getElementById('pgSide'); if(sp) sp.dataset.key = ''; }
  render();
};
/* Picking a Shopping List item: the middle panel SCROLLS to that item's shelf
   through the full store, the way you would by hand, and only then narrows to
   it. The shelf stays exactly where the scroll left it while the others drop
   away, so the last thing you see is the page moving, not content swapping.
   From one picked item to another, the store opens back up at the first one's
   shelf and scrolls from there. Un-picking scrolls down to the item's shelf
   in the full store. Reduced motion: jumps instead. */
let _glideId = 0;
/* Our own glide rather than scrollTo({behavior:'smooth'}): a redraw cancels the
   browser's smooth scroll. The target is re-read every frame, so a shelf redrawn
   mid-glide is still where it lands. A wheel or touch stops it where it is;
   done() runs either way. */
function _glide(el, target, ms, done){
  const id = ++_glideId, start = el.scrollTop, t0 = performance.now();
  let fin = false; const end = () => { if(fin) return; fin = true; if(done) done(); };
  const stop = () => { if(id === _glideId){ _glideId++; end(); } };
  el.addEventListener('wheel', stop, {once:true, passive:true});
  el.addEventListener('touchstart', stop, {once:true, passive:true});
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // ease-in-out: reads as travel
  const step = now => {
    if(id !== _glideId) return;
    const k = Math.min(1, (now - t0) / ms), to = Math.max(0, typeof target === 'function' ? target() : target);
    el.scrollTop = start + (to - start) * ease(k);
    if(k < 1) requestAnimationFrame(step); else end();
  };
  requestAnimationFrame(step);
}
// The item's shelf: the first of the shelves its products sit on that is showing.
const _shelfFor = (m, s) => { if(!s) return null;
  const own = m.querySelector(`.sp-shelf[data-slot="${s.id}"]`); if(own) return own;
  for(const sec of [...new Set(_v2Pool(s.l).map(x => x.section || 'other'))]){ const el = m.querySelector(`.sp-shelf[data-sec="${CSS.escape(sec)}"]`); if(el) return el; }
  return null; };
// Room for what's pinned at the top: the steps header and the sticky aisle name.
const _hdOff = m => { const hd = m.querySelector('.pg-main-hd'), ai = m.querySelector('.sp-aisle-hd'); return (hd ? hd.offsetHeight : 0) + (ai ? ai.offsetHeight : 0) + 12; };
const _yOf = (m, el) => m.scrollTop + el.getBoundingClientRect().top - m.getBoundingClientRect().top - _hdOff(m);
const _flashHd = el => { const h = el && el.querySelector('.sp-shelf-hd'); if(!h) return; h.classList.remove('is-arrive'); void h.offsetWidth; h.classList.add('is-arrive'); };
/* Clicking a Shopping List item scrolls the store to that item's shelf. Nothing
   is hidden, so there is nothing to undo; clicking it again just brings the
   shelf back into view. Esc clears the highlight. */
let _spyHold = false;
window.spreeSlot = function(id){
  S.focusSec = null; S.active = id; render();
  const m = document.getElementById('pgMain');
  if(!m || m.hidden || PG.primary !== 'shopkai' || S.view !== 'shop') return;
  const find = () => m.querySelector(`.sp-shelf[data-slot="${id}"]`);
  const el = find(); if(!el) return;
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(calm){ m.scrollTop = _yOf(m, el); _flashHd(el); return; }
  // Longer trips take a little longer, so the distance reads.
  const dist = Math.abs(_yOf(m, el) - m.scrollTop), ms = Math.min(1100, Math.max(400, 360 + dist * .1));
  _spyHold = true;
  _glide(m, () => _yOf(m, find() || el), ms, () => { _spyHold = false; _flashHd(find()); });
};
window.spreeShowAll = function(){ if(S.active != null || S.focusSec){ S.active = null; S.focusSec = null; render(); } };
document.addEventListener('keydown', e => { if(e.key === 'Escape' && S.help == null && !FUL.open && (S.active != null || S.focusSec) && !(e.target.closest && e.target.closest('input,textarea,select'))) spreeShowAll(); });

/* Scroll-spy: scrolling the store yourself moves the highlight in the Shopping
   List to the shelf you're reading, and keeps that row in view there. No redraw —
   just the highlight — so the scroll stays smooth. Paused while a click is
   gliding the store, so the list doesn't flicker through everything it passes. */
function _spy(){
  const m = document.getElementById('pgMain');
  if(_spyHold || !m || m.hidden || PG.primary !== 'shopkai' || S.view !== 'shop') return;
  const line = m.getBoundingClientRect().top + _hdOff(m) + 40;
  let cur = null;
  for(const el of m.querySelectorAll('.sp-shelf[data-slot]')){ if(el.getBoundingClientRect().top <= line) cur = el; else break; }
  if(!cur) return;
  const id = +cur.dataset.slot; if(id === S.active) return;
  S.active = id; S.focusSec = null;
  m.querySelectorAll('.sp-shelf.is-cur').forEach(x => x.classList.remove('is-cur')); cur.classList.add('is-cur');
  const nav = document.getElementById('pgNav'), box = nav && nav.querySelector('.pg-nav-b');
  if(nav) nav.querySelectorAll('.sp-slot[data-id]').forEach(r => { const on = +r.dataset.id === id; r.classList.toggle('is-on', on); const b = r.querySelector('.sp-slot-btn'); if(b) b.setAttribute('aria-pressed', on); });
  const row = nav && nav.querySelector(`.sp-slot[data-id="${id}"]`);
  if(row && box){ const a = row.getBoundingClientRect(), b = box.getBoundingClientRect();
    if(a.top < b.top + 8) box.scrollTop -= b.top + 8 - a.top; else if(a.bottom > b.bottom - 8) box.scrollTop += a.bottom - (b.bottom - 8); }
  _paintFocus();
}
let _spyQ = 0;
document.addEventListener('scroll', e => { if(e.target && e.target.id === 'pgMain' && !_spyQ) _spyQ = requestAnimationFrame(() => { _spyQ = 0; _spy(); }); }, true);
window.spreeSearch = function(v){ S.q = v; renderShelves(); };
document.addEventListener('keydown', e => { if(e.key === 'Escape' && S.help != null){ S.help = null; render(); } });

/* The project opens on Overview (KaiWeb's default). The wireframe used to land
   on Shop here, once per page load; now this only sets Media to the mood board
   for when Shop is first opened. */
if(!NESTED){
  window.addEventListener('load', () => setTimeout(() => {
    let top = window; try{ top = window.parent || window; }catch(e){}
    if(top.__spreeAuto) return;
    // empty-scope version: land on Measurements (Rooms), where the scope gets built
    if(WF_EMPTY){ top.__spreeAuto = true; MEAS.view = 'rooms'; pgShowSide('floorplan'); return; }
    if(!slots().length) return;
    top.__spreeAuto = true;
    MEDIA.view = 'mood';
  }, 400));
  // The Editor's product tiles and v2 shopping panel link here too.
  new MutationObserver(() => {
    const v2h = document.querySelector('#v2Shop .v2s-head-r');
    if(v2h && !v2h.querySelector('.sp-entry')){
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sp-entry'; b.textContent = 'Shop the whole scope';
      b.onclick = () => spreeOpen(typeof v2Shop !== 'undefined' && v2Shop ? v2Shop.taskId : null);
      v2h.insertBefore(b, v2h.firstChild);
    }
    const tiles = document.querySelector('.v2-tiles-hd');
    if(tiles && !tiles.querySelector('.sp-entry')){
      const t = (typeof selId !== 'undefined') ? selId : null;
      tiles.insertAdjacentHTML('beforeend', `<button type="button" class="sp-entry is-link" onclick="spreeOpen(${t == null ? '' : t})">Shop the whole scope</button>`);
    }
  }).observe(document.documentElement, {childList:true, subtree:true});
  window.addEventListener('resize', () => { if(PG.primary) render(); });
}


/* ── LINKED PANELS · calm version ──────────────────────────────────────
   One shared selection — a Shopping List item (Kitchen · Cabinets) or a whole
   shelf (Cabinets) — that every panel points to. Panels never move on their
   own: they highlight what matches, and when it is out of view they offer a
   "Go to" pill. Only two deliberate clicks set it: a Shopping List item, or a
   shelf's name in Shop. The label in the tab bar says what is selected; its ✕
   clears it. */
S.focusSec = null;
const _secName = (sec, s) => CATALOG_SECTION_LABEL[sec] || (s ? _v2Need(s.l) : sec);
function focusNow(){
  const all = slots();
  if(S.active != null){
    const s = all.find(x => x.id === S.active);
    if(s){
      const sec = _secOf(s.l, s.t);
      return {sec, room:s.t.room, rooms:[s.t.room], main:[s.id],
        rel:all.filter(x => x.id !== s.id && sec && _secOf(x.l, x.t) === sec).map(x => x.id),
        label:[s.t.room, _secName(sec, s)]};
    }
  }
  if(S.focusSec){
    const sec = S.focusSec, list = all.filter(s => _v2Pool(s.l).some(x => (x.section || 'other') === sec));
    const rooms = [...new Set(list.map(s => s.t.room))];
    return {sec, room:rooms.length === 1 ? rooms[0] : null, rooms, main:list.map(s => s.id), rel:[],
      label:rooms.length === 1 ? [rooms[0], _secName(sec)] : [_secName(sec), `${rooms.length} rooms`]};
  }
  return null;
}
window.spreeFocusSec = function(sec){ S.focusSec = S.focusSec === sec && S.active == null ? null : sec; S.active = null; render(); };
window.spreeFocusClear = function(){ S.active = null; S.focusSec = null; render(); };

// The label, in the tab bar. Rewritten only when it changes (the tab bar is watched).
function _paintFocusLabel(){
  // Removed: the picked row in the Shopping List and the shelf heading already say
  // what's selected. Kept as a no-op so callers stay simple.
  const old = document.getElementById('pgFocus'); if(old) old.remove(); return;
  const hdr = document.getElementById('workHdr'); if(!hdr || NESTED) return;
  const f = PG.primary === 'shopkai' ? focusNow() : null;
  let el = document.getElementById('pgFocus');
  if(!f){ if(el) el.remove(); return; }
  const html = `<span class="pg-focus-k">Selected</span><b>${esc(f.label[0])}</b><span class="pg-focus-sep">›</span><b>${esc(f.label[1])}</b>
    <button type="button" class="pg-focus-x" onclick="spreeFocusClear()" title="Clear the selection" aria-label="Clear the selection">✕</button>`;
  if(!el){ el = document.createElement('div'); el.id = 'pgFocus'; el.className = 'pg-focus'; el.setAttribute('role', 'status'); }
  const tabs = hdr.querySelector('.wmode-tabs');
  if(tabs && el.previousElementSibling !== tabs) tabs.after(el);
  if(el.dataset.k !== html){ el.dataset.k = html; el.innerHTML = html; }
}

// Is el fully inside the visible part of its scroller?
function _inView(el, box){
  const a = el.getBoundingClientRect(), b = box.getBoundingClientRect();
  return a.top >= b.top - 2 && a.top < b.bottom - 40;
}
/* The pill. One per panel, floating over the top or bottom edge of its scroller,
   pointing the way. targets: [{el, label}] — one, or a choice of rooms. */
function _pill(host, box, targets){
  let p = host.querySelector(':scope > .pg-go');
  const need = box && targets.length && !targets.some(t => _inView(t.el, box));
  if(!need){ if(p) p.remove(); return; }
  const first = targets[0].el.getBoundingClientRect(), up = first.top < box.getBoundingClientRect().top;
  const k = (up ? 'u' : 'd') + targets.map(t => t.label).join('|');
  if(!p){ p = document.createElement('div'); p.className = 'pg-go'; host.appendChild(p); }
  const bb = box.getBoundingClientRect(), hb = host.getBoundingClientRect();
  p.style.top = up ? (bb.top - hb.top + 10) + 'px' : '';
  p.style.bottom = up ? '' : (hb.bottom - bb.bottom + 14) + 'px';
  if(p.dataset.k === k) return;
  p.dataset.k = k;
  const arrow = up ? '↑' : '↓';
  p.innerHTML = targets.length === 1
    ? `<button type="button" data-i="0">Go to ${esc(targets[0].label)} <span aria-hidden="true">${arrow}</span></button>`
    : `<span class="pg-go-k">Go to</span>${targets.map((t, i) => `<button type="button" data-i="${i}">${esc(t.label)}</button>`).join('')}`;
  p.querySelectorAll('button').forEach(b => b.onclick = () => {
    const t = targets[+b.dataset.i].el;
    box.scrollTo({top:box.scrollTop + t.getBoundingClientRect().top - box.getBoundingClientRect().top - 12, behavior:'smooth'});
    t.classList.remove('is-arrive'); void t.offsetWidth; t.classList.add('is-arrive');
    p.remove();
  });
}
const _mark = (scope, sel, cls, test) => scope && scope.querySelectorAll(sel).forEach(el => el.classList.toggle(cls, !!test(el)));
function _paintFocus(){
  if(NESTED) return;
  _paintFocusLabel();
  const f = PG.primary === 'shopkai' ? focusNow() : null;
  const main = new Set(f ? f.main.map(String) : []), rel = new Set(f ? f.rel.map(String) : []);
  document.body.classList.toggle('pg-has-focus', !!f);
  // Middle: the selected shelf's name.
  _mark(document.getElementById('pgMain'), '.sp-shelf', 'is-focus', el => f && S.active == null && el.dataset.sec === f.sec);
  // Left: the Shopping List.
  const nav = document.getElementById('pgNav'), navB = nav && nav.querySelector('.pg-nav-b');
  _mark(nav, '.sp-slot[data-id]', 'is-focus', el => S.active == null && main.has(el.dataset.id));
  _mark(nav, '.sp-slot[data-id]', 'is-rel', el => rel.has(el.dataset.id));
  if(nav) _pill(nav, navB, f ? [...(nav.querySelectorAll('.sp-slot.is-on, .sp-slot.is-focus'))].slice(0, 1).map(el => ({el, label:f.label.join(' · ')})) : []);
  // Right: Measurements or Media.
  const side = document.getElementById('pgSide'), sideB = side && !side.hidden && side.querySelector('.pg-side-b');
  const rooms = f ? f.rooms : [];
  _mark(side, '.pg-board[data-room], .pg-room[data-room]', 'is-focus', el => rooms.includes(el.dataset.room));
  _mark(side, '.pg-sw[data-slot]', 'is-focus', el => main.has(el.dataset.slot));
  _mark(side, '.pg-room-g', 'is-focus', el => rooms.includes(el.getAttribute('aria-label')));
  _mark(side, '.pg-meas-room', 'is-focus', el => rooms.includes((el.querySelector('span') || {}).textContent));
  if(side){
    const tgt = rooms.map(r => side.querySelector(`.pg-board[data-room="${CSS.escape(r)}"], .pg-room[data-room="${CSS.escape(r)}"]`)).filter(Boolean)
      .map((el, i) => ({el, label:rooms.length === 1 ? `${rooms[0]}` : rooms[i]}));
    _pill(side, sideB, tgt);
  }
}
// Panels re-check their pill as you scroll them (a pill goes once its target is in view).
let _pfq = 0;
document.addEventListener('scroll', e => {
  const t = e.target; if(!t || !t.closest || !t.closest('#pgNav, #pgSide')) return;
  if(!_pfq) _pfq = requestAnimationFrame(() => { _pfq = 0; _paintFocus(); });
}, true);

})();

/* Room boards: each leader line starts right where its swatch's text ends, not at the edge of the column. */
(function(){
  function fit(){
    document.querySelectorAll('.pg-board-svg .pg-sw').forEach(g => {
      const pl = g.querySelector('.pg-lead'), img = g.querySelector('.pg-sw-img'); if(!pl || !img) return;
      const pts = pl.getAttribute('points').trim().split(/\s+/).map(p => p.split(',').map(Number)); if(pts.length < 3) return;
      const ix = +img.getAttribute('x'), iw = +img.getAttribute('width');
      const texts = [...g.querySelectorAll('text')].filter(t => !t.classList.contains('pg-sw-plus'));
      let lo = Infinity, hi = -Infinity;
      texts.forEach(t => { try{ const b = t.getBBox(); if(b.width){ lo = Math.min(lo, b.x); hi = Math.max(hi, b.x + b.width); } }catch(e){} });
      const left = pts[2][0] > ix + iw;   // swatch on the left of the room: line leaves to the right
      let x0;
      if(left) x0 = (hi > -Infinity ? hi : ix + iw) + 8;
      else x0 = (lo < Infinity ? lo : ix) - 8;
      const y = pts[0][1], x1 = left ? x0 + 12 : x0 - 12;
      pl.setAttribute('points', `${x0},${y} ${x1},${y} ${pts[2][0]},${pts[2][1]}`);
    });
  }
  let q = 0;
  const go = () => { if(q) return; q = requestAnimationFrame(() => { q = 0; fit(); }); };
  const start = () => { new MutationObserver(go).observe(document.body, {childList:true, subtree:true}); go(); };
  if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(go);
})();
