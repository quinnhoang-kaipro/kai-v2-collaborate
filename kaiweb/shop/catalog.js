/* ── PRODUCT CATALOG : per task category, three tiers ─────────────────
   Lives in its own file, loaded before data.js, because data.js's
   seedOptionCatalogProducts pass needs the pool to attach real SKUs and
   brands to each option's product rows — that SKU is what makes a row a
   catalog row (.is-catalog) and gives it the openFly click that pulls out
   the product detail drawer. Loaded after data.js it silently no-ops and
   every product row renders as plain, unclickable text.

   Pure function of the task, no dependency on TASKS or render state, so
   hoisting it out of scope-navigator.js costs nothing. */
function productPool(t, catOverride){
  // Generic pool sized to the task; in production this is a real catalog query.
  // Tier order: team (template/manager picks) → similar (matches description+budget) → other.
  // catOverride lets a caller that already knows the kind of product — the
  // Departments view's product lines — ask for that section directly.
  const base=(t.name||'').toLowerCase();
  // Vanity and shower are tested before countertop and tile: "vanity with
  // integrated quartz top" is a vanity, and "shower wall and floor tile" is
  // shower tile, not a kitchen backsplash.
  const cat= catOverride ||
    (/cabinet/.test(base)?'cabinet':
    /vanity/.test(base)?'vanity':
    /shower/.test(base)?'shower':
    /counter|quartz/.test(base)?'counter':
    /backsplash|tile/.test(base)?'tile':
    /appliance/.test(base)?'appliance':
    /floor|lvp|carpet|hardwood/.test(base)?'floor':
    /paint/.test(base)?'paint':
    /toilet/.test(base)?'toilet':
    /\bopener\b/.test(base)?'mech':
    /closet/.test(base)?'storage':
    /door hardware|knob|lever/.test(base)?'hardware':
    /exhaust fan/.test(base)?'exhaust':
    /ceiling fan/.test(base)?'ceilingfan':
    /smoke|detector/.test(base)?'detector':
    /blind/.test(base)?'blinds':
    /lighting|light fixture/.test(base)?'lighting':
    'generic');
  const POOLS={
    cabinet:[
      {tier:'team',brand:'Diamond NOW',name:'Arcadia White Shaker Stock Cabinet',sku:'1003-432-100',unit:'LF',price:344,stock:'in',tags:['Template pick','Approved finish']},
      {tier:'team',brand:'KraftMaid',name:'Putnam Maple Dove White',sku:'KM-23-PTNDOV',unit:'LF',price:389,stock:'in',tags:['Manager pick']},
      {tier:'similar',brand:'Hampton Bay',name:'Designer Series Melvern White',sku:'1005-201-110',unit:'LF',price:298,stock:'in',tags:['Under budget']},
      {tier:'similar',brand:'Project Source',name:'White Shaker Stock Cabinet 30x12',sku:'PS-WHTSH-3012',unit:'LF',price:262,stock:'low',tags:['Under budget']},
      {tier:'other',brand:'Lifeart',name:'Anchester Shaker White',sku:'LA-AS-SHW',unit:'LF',price:412,stock:'in'},
      {tier:'other',brand:'JK Cabinetry',name:'Mocha Shaker Maple',sku:'JK-MS-MAP',unit:'LF',price:455,stock:'in'},
    ],
    counter:[
      {tier:'team',brand:'Hardwood Reflections',name:'5 ft. Saman Butcher Block with Live Edge & Blue Epoxy River',sku:'1530RIVBLSAM-60',unit:'ea',price:480,listPrice:564,stock:'in',tags:['Recommended','Template'],coveragePerUnit:5,
        image:'butcher_hero.png',
        photos:[
          'butcher_hero.png',
          'butcher_1.jpg',
          'butcher_2.jpg',
          'butcher_3.jpg',
          'butcher_4.jpg',
        ],
        source:'Home Depot',
        sourceUrl:'https://www.homedepot.com/p/HARDWOOD-REFLECTIONS-5-ft-L-x-30-in-D-UV-Finished-Saman-Solid-Wood-Butcher-Block-Desktop-Countertop-with-Live-Edge-and-Blue-Epoxy-River-1530RIVBLSAM-60/313896119',
        about:'Produce a rich accent to your home with this Hardwood Reflections butcher block countertop in UV-finished saman with a live edge and a signature blue epoxy river running through the center. 100% solid saman wood, factory-finished and ready to install as a kitchen countertop, island top, or desktop.',
        highlights:['60 in. L × 30 in. D × 1.5 in. T actual dimensions','100% solid saman hardwood','UV-cured factory finish, no sealing needed on install','Live-edge sides with a hand-poured blue epoxy river','Ships direct — free returns in-store within 90 days'],
        includes:'One 60 in. × 30 in. finished butcher block slab. Install hardware and adhesive sold separately.',
        specs:{'Actual size':'60 × 30 × 1.5 in.','Material':'Saman solid wood','Finish':'UV cured, factory','Edge':'Live edge with blue epoxy river','Model #':'1530RIVBLSAM-60','Internet #':'313896119','Warranty':'Manufacturer 1-year limited'},
      },
      {tier:'team',brand:'MSI',name:'Calacatta Laza Quartz Slab (Polished)',sku:'CALAZA-PRE',unit:'SF',price:74,stock:'in',tags:['Template pick']},
      {tier:'team',brand:'Silestone',name:'Eternal Calacatta Gold',sku:'SI-CALG-PRE',unit:'SF',price:82,stock:'in',tags:['Template']},
      {tier:'similar',brand:'Q Premium',name:'Aurora Quartz',sku:'QP-AUR',unit:'SF',price:68,stock:'in',tags:['Under budget']},
      {tier:'similar',brand:'Stonemark',name:'Frost N Quartz',sku:'SM-FRN',unit:'SF',price:71,stock:'in'},
      {tier:'other',brand:'Caesarstone',name:'Pure White 1141',sku:'CAS-1141',unit:'SF',price:96,stock:'in'},
      {tier:'other',brand:'LG Viatera',name:'Minuet Quartz',sku:'LG-MIN',unit:'SF',price:79,stock:'in'},
    ],
    tile:[
      {tier:'team',brand:'Daltile',name:'Rittenhouse Arctic White 3x6 Matte',sku:'1000-114-029',unit:'SF',price:26,stock:'in',tags:['Template pick']},
      {tier:'team',brand:'MSI',name:'Highland Park Whisper White 3x6',sku:'MS-HPW-WW36',unit:'SF',price:28,stock:'in'},
      {tier:'similar',brand:'Bedrosians',name:'Cloe Glossy White 3x6',sku:'BD-CLOE-W',unit:'SF',price:22,stock:'in',tags:['Under budget']},
      {tier:'similar',brand:'Floor & Decor',name:'White Glossy Subway 3x6',sku:'FD-WGS-36',unit:'SF',price:18,stock:'in',tags:['Under budget']},
      {tier:'other',brand:'American Olean',name:'Bright White 3x6 Glossy',sku:'AO-BW36',unit:'SF',price:24,stock:'in'},
      {tier:'other',brand:'Cancos',name:'Manhattan Bevel White 3x6',sku:'CN-MAN-36',unit:'SF',price:32,stock:'in'},
    ],
    appliance:[
      {tier:'team',brand:'GE Profile',name:'4-Piece Stainless Suite (Range, OTR, DW, Fridge)',sku:'PROFSUITE-SS',unit:'suite',price:3950,stock:'in',tags:['Template pick','Bundle']},
      {tier:'team',brand:'Whirlpool',name:'4-Piece Stainless Suite',sku:'WHP-4SS',unit:'suite',price:3620,stock:'in'},
      {tier:'similar',brand:'Frigidaire',name:'Gallery 4-Piece Stainless Suite',sku:'FG-GALSS',unit:'suite',price:3210,stock:'in',tags:['Under budget']},
      {tier:'similar',brand:'Samsung',name:'Smart Stainless 4-Piece Suite',sku:'SAM-4SS',unit:'suite',price:4180,stock:'low'},
      {tier:'other',brand:'KitchenAid',name:'Pro Stainless 4-Piece Suite',sku:'KA-PR4-SS',unit:'suite',price:5340,stock:'in'},
    ],
    floor:[
      {tier:'team',brand:'Shaw',name:'Paragon Mix Plus LVP, Aluminum 9x59',sku:'SH-PAR-AL',unit:'SF',price:8.60,stock:'in',tags:['Template pick']},
      {tier:'team',brand:'Mohawk',name:'SmartStrand Silk Berber, Cape May',sku:'MH-SS-CM',unit:'SY',price:42,stock:'in'},
      {tier:'similar',brand:'LifeProof',name:'Sterling Oak LVP 7.1in',sku:'LP-STO-71',unit:'SF',price:6.20,stock:'in',tags:['Under budget']},
      {tier:'similar',brand:'CoreLuxe',name:'Calais Oak Engineered LVP',sku:'CL-CAL-LVP',unit:'SF',price:5.80,stock:'low',tags:['Under budget']},
      {tier:'other',brand:'Pergo',name:'Outlast+ Vintage Pewter Oak',sku:'PRG-VPO',unit:'SF',price:9.40,stock:'in'},
    ],
    paint:[
      {tier:'team',brand:'Sherwin-Williams',name:'Agreeable Gray 7029 Satin (Gallon)',sku:'SW-7029-SAT',unit:'gal',price:78,stock:'in',tags:['Template color']},
      {tier:'team',brand:'Sherwin-Williams',name:'Pure White 7005 Satin (Gallon)',sku:'SW-7005-SAT',unit:'gal',price:78,stock:'in',tags:['Template color']},
      {tier:'similar',brand:'Behr',name:'Marquee Ultra Pure White Satin',sku:'BH-MQ-UPW',unit:'gal',price:62,stock:'in',tags:['Under budget']},
      {tier:'similar',brand:'Benjamin Moore',name:'Aura Decorators White Satin',sku:'BM-AURA-DW',unit:'gal',price:84,stock:'in'},
      {tier:'other',brand:'Glidden',name:'Diamond Pure White Satin',sku:'GL-DP-WS',unit:'gal',price:48,stock:'in'},
    ],
    vanity:[
      {tier:'team',brand:'Home Decorators',name:'Sonoma 48" Double Vanity Pebble Grey',sku:'HD-SON48-PG',unit:'ea',price:1620,stock:'in',tags:['Template']},
      {tier:'team',brand:'James Martin',name:'Brookfield 48" Double Vanity Burnished Mahogany',sku:'JM-BRK48-BM',unit:'ea',price:2160,stock:'in'},
      {tier:'similar',brand:'OVE Decors',name:'Edenderry 48" Double Vanity Dove Gray',sku:'OV-ED48-DG',unit:'ea',price:1180,stock:'in',tags:['Under budget']},
      {tier:'other',brand:'Avanity',name:'Loft 48" Double Vanity Dark Walnut',sku:'AV-LOFT48-DW',unit:'ea',price:1840,stock:'in'},
    ],
    shower:[
      {tier:'team',brand:'Daltile',name:'Modern Hex Carbon Black Mosaic Floor',sku:'1002-301-200',unit:'SF',price:28,stock:'in',tags:['Template']},
      {tier:'team',brand:'MSI',name:'Calacatta Gold 12x24 Polished Wall',sku:'MS-CG-1224P',unit:'SF',price:36,stock:'in',tags:['Template']},
      {tier:'similar',brand:'Florida Tile',name:'Pietra Art Carrara 12x24 Honed',sku:'FT-PAC-1224H',unit:'SF',price:24,stock:'in',tags:['Under budget']},
      {tier:'other',brand:'Marazzi',name:'Travisano Bianco 12x24 Polished',sku:'MZ-TV-BL1224',unit:'SF',price:42,stock:'in'},
    ],
    toilet:[
      {tier:'team',brand:'Kohler',name:'Cimarron Comfort Height Elongated',sku:'K-3589-0',unit:'ea',price:540,stock:'in',tags:['Template pick']},
      {tier:'similar',brand:'American Standard',name:'Champion 4 Elongated',sku:'AS-CH4-EL',unit:'ea',price:368,stock:'in',tags:['Under budget']},
      {tier:'other',brand:'TOTO',name:'Drake II Elongated 1.28GPF',sku:'TT-DR2-128',unit:'ea',price:712,stock:'in'},
    ],
    mech:[
      {tier:'team',brand:'Chamberlain',name:'B970T Smart Belt Drive Opener',sku:'CH-B970T',unit:'ea',price:520,stock:'in',tags:['Template pick']},
      {tier:'similar',brand:'LiftMaster',name:'8500W Wall Mount Smart',sku:'LM-8500W',unit:'ea',price:610,stock:'in'},
      {tier:'other',brand:'Genie',name:'StealthDrive Connect Belt Drive',sku:'GN-STDC',unit:'ea',price:380,stock:'in'},
    ],
    storage:[
      {tier:'team',brand:'ClosetMaid',name:'ShelfTrack 5-8 ft Closet Kit, White',sku:'CM-ST-58W',unit:'kit',price:460,stock:'in',tags:['Template pick']},
      {tier:'similar',brand:'Rubbermaid',name:'HomeFree 4-8 ft Closet Kit',sku:'RB-HF-48',unit:'kit',price:320,stock:'in',tags:['Under budget']},
      {tier:'other',brand:'Easy Track',name:'Deluxe Starter Closet White',sku:'ET-DSC-W',unit:'kit',price:620,stock:'in'},
    ],
    hardware:[
      {tier:'team',brand:'Kwikset',name:'Tylo Passage Knob, Satin Nickel',sku:'KW-TYLO-PS-SN',unit:'ea',price:18,stock:'in',tags:['Template pick']},
      {tier:'team',brand:'Kwikset',name:'Tylo Privacy Knob, Satin Nickel',sku:'KW-TYLO-PV-SN',unit:'ea',price:20,stock:'in',tags:['Template pick']},
      {tier:'similar',brand:'Schlage',name:'Andover Passage Knob, Satin Nickel',sku:'SC-ANDV-PS-SN',unit:'ea',price:27,stock:'in'},
      {tier:'similar',brand:'Defiant',name:'Brandywine Passage Knob, Satin Nickel',sku:'DF-BRDY-PS',unit:'ea',price:12,stock:'in',tags:['Under budget']},
      {tier:'other',brand:'Baldwin',name:'Reserve Round Knob, Satin Nickel',sku:'BW-RSV-RK',unit:'ea',price:58,stock:'low'},
    ],
    lighting:[
      {tier:'team',brand:'Hampton Bay',name:'13 in. LED Flush Mount, Brushed Nickel',sku:'HB-13LED-FM',unit:'ea',price:55,stock:'in',tags:['Template pick']},
      {tier:'team',brand:'Lithonia',name:'4 ft Linkable LED Shop Light',sku:'LI-4FT-SHOP',unit:'ea',price:35,stock:'in',tags:['Manager pick']},
      {tier:'similar',brand:'Commercial Electric',name:'11 in. Color-Select LED Flush Mount',sku:'CE-11CS-FM',unit:'ea',price:39,stock:'in',tags:['Under budget']},
      {tier:'other',brand:'Progress Lighting',name:'Gulliver 2-Light Close-to-Ceiling',sku:'PL-GULL-2L',unit:'ea',price:89,stock:'in'},
    ],
    ceilingfan:[
      {tier:'team',brand:'Hunter',name:'Dempsey 52 in. LED Ceiling Fan with Light',sku:'HU-DEMP-52',unit:'ea',price:190,stock:'in',tags:['Template pick']},
      {tier:'similar',brand:'Hampton Bay',name:'Glendale 52 in. LED Ceiling Fan',sku:'HB-GLND-52',unit:'ea',price:139,stock:'in',tags:['Under budget']},
      {tier:'other',brand:'Minka-Aire',name:'Light Wave 52 in. Ceiling Fan',sku:'MA-LWAV-52',unit:'ea',price:345,stock:'low'},
    ],
    detector:[
      {tier:'team',brand:'First Alert',name:'SCO5CN Hardwired Smoke + CO Combo',sku:'FA-SCO5CN',unit:'ea',price:35,stock:'in',tags:['Template pick','Code compliant']},
      {tier:'similar',brand:'Kidde',name:'KN-COSM-IBA Hardwired Combo',sku:'KD-COSM-IBA',unit:'ea',price:39,stock:'in'},
      {tier:'other',brand:'Google Nest',name:'Protect Wired Smoke + CO',sku:'GN-PROT-W',unit:'ea',price:119,stock:'in'},
    ],
    blinds:[
      {tier:'team',brand:'Bali',name:'2 in. Faux Wood Blind, White',sku:'BA-2FW-WHT',unit:'ea',price:55,stock:'in',tags:['Template pick']},
      {tier:'similar',brand:'Home Decorators',name:'2 in. Cordless Faux Wood Blind',sku:'HD-2CFW',unit:'ea',price:42,stock:'in',tags:['Under budget']},
      {tier:'other',brand:'Levolor',name:'2 in. Cordless Wood Blind',sku:'LV-2CW',unit:'ea',price:98,stock:'in'},
    ],
    exhaust:[
      {tier:'team',brand:'Panasonic',name:'WhisperGreen 80 CFM, Humidity Sensing',sku:'PA-WG80-HS',unit:'ea',price:165,stock:'in',tags:['Template pick']},
      {tier:'similar',brand:'Broan-NuTone',name:'80 CFM Humidity Sensing Fan',sku:'BN-80HS',unit:'ea',price:128,stock:'in',tags:['Under budget']},
      {tier:'other',brand:'Delta Breez',name:'Signature 80 CFM',sku:'DB-SIG80',unit:'ea',price:142,stock:'low'},
    ],
    generic:[
      {tier:'team',brand:'Vendor A',name:'Template-selected product',sku:'TPL-A-001',unit:t.qty?String(t.qty).replace(/[\d.\s]/g,'').trim()||'ea':'ea',price:Math.round(dollars(t.cost||0)*0.6/Math.max(1,parseFloat(t.qty)||1)),stock:'in',tags:['Template pick']},
      {tier:'similar',brand:'Vendor B',name:'Similar option',sku:'SIM-B-002',unit:'ea',price:Math.round(dollars(t.cost||0)*0.55),stock:'in',tags:['Under budget']},
      {tier:'other',brand:'Vendor C',name:'Other option',sku:'OTH-C-003',unit:'ea',price:Math.round(dollars(t.cost||0)*0.7),stock:'in'},
    ],
  };
  return POOLS[cat]||POOLS.generic;
}

/* ── The whole catalogue, for search ─────────────────────────────────
   productPool answers "what fits this task"; search needs "everything we
   sell". Every section except the generic placeholders, each product once
   (by SKU), tagged with the section it came from. Built lazily — the pools
   are plain data, but `dollars` has to be defined before the first call. */
const CATALOG_SECTIONS = ['cabinet','counter','tile','appliance','floor','paint','vanity','shower','toilet','mech','storage','hardware','lighting','ceilingfan','detector','blinds','exhaust'];
const CATALOG_SECTION_LABEL = {cabinet:'Cabinets', counter:'Countertops', tile:'Tile', appliance:'Appliances', floor:'Flooring', paint:'Paint', vanity:'Vanities', shower:'Shower tile', toilet:'Toilets', mech:'Garage door openers', storage:'Closet systems', hardware:'Door hardware', lighting:'Light fixtures', ceilingfan:'Ceiling fans', detector:'Smoke & CO detectors', blinds:'Blinds', exhaust:'Exhaust fans'};
let _catalogAll = null;
function catalogAll(){
  if(_catalogAll) return _catalogAll;
  const seen = new Set();
  _catalogAll = [];
  CATALOG_SECTIONS.forEach(cat => {
    productPool({name:'', cost:'$0', qty:''}, cat).forEach(p => {
      if(seen.has(p.sku)) return;
      seen.add(p.sku);
      _catalogAll.push(Object.assign({}, p, {section:cat}));
    });
  });
  return _catalogAll;
}
function catalogFind(sku){
  return catalogAll().find(p => p.sku === sku) || null;
}
/* Every word has to appear in the brand, the name, the SKU or the section,
   so "white shaker" and "kohler toilet" both land. Recommended products
   rank first, then similar, then the rest. */
function catalogSearch(q, limit){
  const terms = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  if(!terms.length) return [];
  const tierRank = {team:0, similar:1, other:2};
  return catalogAll()
    .filter(p => {
      const hay = `${p.brand} ${p.name} ${p.sku} ${CATALOG_SECTION_LABEL[p.section] || ''}`.toLowerCase();
      return terms.every(t => hay.includes(t));
    })
    .sort((a, b) => (tierRank[a.tier] ?? 3) - (tierRank[b.tier] ?? 3))
    .slice(0, limit || 8);
}

/* ── Suppliers ────────────────────────────────────────────────────────
   One product is one listing — same name, details and quantity — sold by
   one or more suppliers at their own price and stock. The catalogue here
   has no supplier feed, so offers are derived from the SKU: stable across
   reloads, a few percent apart, with a specialist where the trade has one.
   In production this is the supplier price/stock feed. */
const SUPPLIERS = {
  hd:  {id:'hd',  name:'The Home Depot'},
  low: {id:'low', name:"Lowe's"},
  fd:  {id:'fd',  name:'Floor & Decor'},
  fer: {id:'fer', name:'Ferguson'},
};
const _SUPPLIER_SPECIALIST = {tile:'fd', floor:'fd', shower:'fd', toilet:'fer', vanity:'fer'};
function _skuHash(s){
  let h = 0; s = String(s || '');
  for(let i = 0; i < s.length; i++){ h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}
/* The offers for a catalogue product, cheapest first. The listed price is
   The Home Depot's; the others sit within about ±7% of it. */
function catalogOffers(p){
  if(!p || !p.sku) return [];
  if(Array.isArray(p.offers) && p.offers.length) return p.offers.slice().sort((a, b) => a.price - b.price);
  const h = _skuHash(p.sku);
  const base = Number(p.price) || 0;
  // Whole dollars, as every price in the app is shown; never the same as
  // the listed price, so a second supplier is always a real alternative.
  const step = pct => { const v = Math.max(1, Math.round(base * (1 + pct))); return v === base ? v + (pct < 0 ? -1 : 1) : v; };
  const stockOf = k => (k % 7 === 0) ? 'out' : (k % 5 === 0) ? 'low' : 'in';
  const offers = [{supplier:'hd', price:base, stock:p.stock || 'in'}];
  if(h % 6 !== 0){
    const d = ((h % 15) - 7) / 100;                  // −7% … +7%
    offers.push({supplier:'low', price:step(d || -0.03), stock:stockOf(h >> 3)});
  }
  const spec = _SUPPLIER_SPECIALIST[p.section];
  if(spec && h % 3 !== 0){
    const d = ((h >> 4) % 13 - 8) / 100;             // −8% … +4%
    offers.push({supplier:spec, price:step(d || -0.05), stock:stockOf(h >> 6)});
  }
  return offers.sort((a, b) => a.price - b.price);
}
function supplierName(id){ return (SUPPLIERS[id] || {}).name || id || ''; }
// Offers for a SKU from anywhere in the catalogue.
function offersForSku(sku){
  const p = (typeof catalogFind === 'function') ? catalogFind(sku) : null;
  return p ? catalogOffers(p) : [];
}
/* Which supplier a picked product row is buying from: its own choice if
   it made one, else the offer its price matches (rows seeded before
   suppliers existed), else the cheapest. */
function rowSupplier(row){
  const offers = offersForSku(row && row.sku);
  if(!offers.length) return null;
  if(row.supplier && offers.some(o => o.supplier === row.supplier)) return row.supplier;
  const n = parseFloat(String(row.parts || '').replace(/[^0-9.-]/g, '')) || 0;
  const hit = offers.find(o => Math.abs(o.price - n) < 0.01);
  return (hit || offers[0]).supplier;
}
