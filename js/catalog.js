/* ── PRODUCT CATALOG : per task category, three tiers ─────────────────
   Lives in its own file, loaded before data.js, because data.js's
   seedOptionCatalogProducts pass needs the pool to attach real SKUs and
   brands to each option's product rows — that SKU is what makes a row a
   catalog row (.is-catalog) and gives it the openFly click that pulls out
   the product detail drawer. Loaded after data.js it silently no-ops and
   every product row renders as plain, unclickable text.

   Pure function of the task, no dependency on TASKS or render state, so
   hoisting it out of scope-navigator.js costs nothing. */
function productPool(t){
  // Generic pool sized to the task; in production this is a real catalog query.
  // Tier order: team (template/manager picks) → similar (matches description+budget) → other.
  const base=(t.name||'').toLowerCase();
  const cat=
    /cabinet/.test(base)?'cabinet':
    /counter|quartz/.test(base)?'counter':
    /backsplash|tile/.test(base)?'tile':
    /appliance/.test(base)?'appliance':
    /floor|lvp|carpet|hardwood/.test(base)?'floor':
    /paint/.test(base)?'paint':
    /vanity/.test(base)?'vanity':
    /shower/.test(base)?'shower':
    /toilet/.test(base)?'toilet':
    /\bopener\b/.test(base)?'mech':
    /closet/.test(base)?'storage':
    'generic';
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
      {tier:'team',brand:'Hardwood Reflections',name:'5 ft. Saman Butcher Block with Live Edge & Blue Epoxy River',sku:'1530RIVBLSAM-60',unit:'ea',price:480,listPrice:564,stock:'in',tags:['Recommended','Designer pick'],coveragePerUnit:5,
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
      {tier:'team',brand:'Silestone',name:'Eternal Calacatta Gold',sku:'SI-CALG-PRE',unit:'SF',price:82,stock:'in',tags:['Designer pick']},
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
      {tier:'team',brand:'Home Decorators',name:'Sonoma 48" Double Vanity Pebble Grey',sku:'HD-SON48-PG',unit:'ea',price:1620,stock:'in',tags:['Designer pick']},
      {tier:'team',brand:'James Martin',name:'Brookfield 48" Double Vanity Burnished Mahogany',sku:'JM-BRK48-BM',unit:'ea',price:2160,stock:'in'},
      {tier:'similar',brand:'OVE Decors',name:'Edenderry 48" Double Vanity Dove Gray',sku:'OV-ED48-DG',unit:'ea',price:1180,stock:'in',tags:['Under budget']},
      {tier:'other',brand:'Avanity',name:'Loft 48" Double Vanity Dark Walnut',sku:'AV-LOFT48-DW',unit:'ea',price:1840,stock:'in'},
    ],
    shower:[
      {tier:'team',brand:'Daltile',name:'Modern Hex Carbon Black Mosaic Floor',sku:'1002-301-200',unit:'SF',price:28,stock:'in',tags:['Designer pick']},
      {tier:'team',brand:'MSI',name:'Calacatta Gold 12x24 Polished Wall',sku:'MS-CG-1224P',unit:'SF',price:36,stock:'in',tags:['Designer pick']},
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
    generic:[
      {tier:'team',brand:'Vendor A',name:'Template-selected product',sku:'TPL-A-001',unit:t.qty?String(t.qty).replace(/[\d.\s]/g,'').trim()||'ea':'ea',price:Math.round(dollars(t.cost||0)*0.6/Math.max(1,parseFloat(t.qty)||1)),stock:'in',tags:['Template pick']},
      {tier:'similar',brand:'Vendor B',name:'Similar option',sku:'SIM-B-002',unit:'ea',price:Math.round(dollars(t.cost||0)*0.55),stock:'in',tags:['Under budget']},
      {tier:'other',brand:'Vendor C',name:'Other option',sku:'OTH-C-003',unit:'ea',price:Math.round(dollars(t.cost||0)*0.7),stock:'in'},
    ],
  };
  return POOLS[cat]||POOLS.generic;
}
