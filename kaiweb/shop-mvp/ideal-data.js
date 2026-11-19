/* Shop with Kai — ideal shopping concept: demo data.
   One job (3484 South Main Street), six rooms, 27 things to buy, ~110
   products from the catalog the prototypes already use. Prices, brands and
   SKU names come from kaiweb/shop/catalog.js; stock, stores, dates, packs,
   finishes and team history are made up for the demo but kept consistent. */

const TODAY = new Date(2026, 10, 18);            // Wed, Nov 18 2026 — fixed so the demo reads the same every day
const day = (m, d) => new Date(2026, m - 1, d);

const JOB = {
  street: '3484 South Main Street', city: 'Wilmington, NC 28401', id: 'WG-244171',
  name: 'Main St Renovation', stage: 'Work in progress', contractor: 'FloorWorks · J. Ruiz (crew lead)',
  materialsEstimate: 29332.38
};

const TEAM = {
  MA: {name: 'M. Abbott',   role: 'Job manager', tone: '#DDF1E1'},
  TO: {name: 'T. Oyelaran', role: 'Field agent', tone: '#D9E7F4'},
  SP: {name: 'S. Patel',    role: 'Purchasing',  tone: '#F6DCCB'},
  JR: {name: 'J. Ruiz',     role: 'Crew lead · FloorWorks', tone: '#ECE4F5'}
};
const ME = 'MA';

const SUPPLIERS = {
  hd:  {name: 'The Home Depot', store: 'Wilmington #1863', mi: 3.2, mono: 'HD', tone: '#F3D9C4'},
  low: {name: "Lowe's",         store: 'Wilmington · Oleander Dr', mi: 4.1, mono: 'LW', tone: '#D6E2F0'},
  fd:  {name: 'Floor & Decor',  store: 'Wilmington', mi: 6.8, mono: 'FD', tone: '#E7E1D2'},
  fer: {name: 'Ferguson',       store: 'Wilmington Showroom', mi: 5.5, mono: 'FG', tone: '#DCE7DD'}
};

/* Rooms: plan geometry (feet) for the floor plan, and photos. */
const ROOMS = [
  {id: 'kitchen', name: 'Kitchen',      w: 14, h: 12, x: 0,  y: 0,  scene: 'kitchen'},
  {id: 'living',  name: 'Living Room',  w: 18, h: 14, x: 14, y: 0,  scene: 'living'},
  {id: 'pbath',   name: 'Primary Bath', w: 10, h: 8,  x: 0,  y: 12, scene: 'bath'},
  {id: 'bath',    name: 'Bathroom',     w: 8,  h: 7,  x: 10, y: 12, scene: 'bath'},
  {id: 'pbed',    name: 'Primary Bed',  w: 15, h: 14, x: 18, y: 14, scene: 'bed'},
  {id: 'bed2',    name: 'Bedroom 2',    w: 11, h: 12, x: 0,  y: 20, scene: 'bed'}
];
const ROOM = Object.fromEntries(ROOMS.map(r => [r.id, r]));

const PHOTOS = {
  kitchen: [['Existing cabinets, upper run', 'Mar 2', 'TO'], ['Water stain under the sink', 'Mar 2', 'TO'], ['Backsplash wall, 16′ run', 'Mar 2', 'TO'], ['Appliance wall', 'Mar 2', 'TO'], ['Floor at the hallway seam', 'Mar 9', 'SP'], ['Ceiling light boxes (3)', 'Mar 9', 'SP']],
  living:  [['Room from the entry', 'Mar 2', 'TO'], ['Carpet to be removed', 'Mar 2', 'TO'], ['Fan box, center of ceiling', 'Mar 2', 'TO'], ['Three front windows', 'Mar 9', 'SP']],
  pbath:   [['Shower, 60″ × 32″', 'Mar 2', 'TO'], ['Vanity wall, 48″ opening', 'Mar 2', 'TO'], ['Exhaust fan, no humidity sensor', 'Mar 2', 'TO']],
  bath:    [['Hall bath from the door', 'Mar 2', 'TO'], ['Vanity, 30″ opening', 'Mar 2', 'TO']],
  pbed:    [['Room from the door', 'Mar 2', 'TO'], ['Closet, 6′ wide', 'Mar 2', 'TO'], ['Ceiling — no fan box yet', 'Mar 9', 'SP']],
  bed2:    [['Room from the door', 'Mar 2', 'TO'], ['Two windows, 35″ wide', 'Mar 2', 'TO']]
};

/* The job's mood board, set on the template and carried into the job. */
const MOOD = {
  name: 'Warm minimal', source: 'Kai rental standard 2026 (template)',
  swatches: [
    {k: 'Walls',    v: 'Agreeable Gray · SW 7029', c: '#D1CBC1'},
    {k: 'Trim & doors', v: 'Pure White · SW 7005', c: '#F2F0EA'},
    {k: 'Floors',   v: 'Gray-washed oak', c: '#BDB3A3', grain: true},
    {k: 'Cabinets', v: 'White shaker', c: '#F4F2EC', shaker: true},
    {k: 'Counters', v: 'White quartz, soft vein', c: '#EEEBE6', vein: true},
    {k: 'Tile',     v: 'Matte white subway', c: '#F5F4F0', subway: true},
    {k: 'Metals',   v: 'Brushed nickel · chrome', c: '#A8A9A6', metal: true}
  ],
  rules: ['Cool metals only — brushed nickel or chrome', 'No black or brass fixtures', 'Light, gray-washed floors in every room', 'White or soft-white tile; no colored tile']
};

/* ── Catalog ──
   [sku, brand, name, price, color, flags, extra]
   flags: S team standard · M matches the mood board · U upgrade tier · L low stock
   extra: {why} for something outside the mood board, {size} for vanities, {pack} */
const CAT_INFO = {
  floor:      {label: 'Vinyl plank flooring', unit: 'SF',    pack: 23.6, packName: 'box',    sups: ['hd', 'fd', 'low']},
  tile:       {label: 'Backsplash tile',      unit: 'SF',    pack: 12.5, packName: 'box',    sups: ['hd', 'fd', 'low']},
  shower:     {label: 'Shower tile',          unit: 'SF',    pack: 11.6, packName: 'box',    sups: ['fd', 'hd', 'low']},
  counter:    {label: 'Countertops',          unit: 'SF',    pack: 1,    packName: 'SF',     sups: ['hd', 'low']},
  cabinet:    {label: 'Cabinets',             unit: 'LF',    pack: 1,    packName: 'LF',     sups: ['hd', 'low']},
  appliance:  {label: 'Appliance suite',      unit: 'suite', pack: 1,    packName: 'suite',  sups: ['hd', 'low']},
  paint:      {label: 'Interior paint',       unit: 'gal',   pack: 1,    packName: 'gallon', sups: ['hd', 'low']},
  lighting:   {label: 'Light fixtures',       unit: 'ea',    pack: 1,    packName: 'fixture', sups: ['hd', 'low']},
  door:       {label: 'Interior doors',       unit: 'ea',    pack: 1,    packName: 'door',   sups: ['hd', 'low']},
  ceilingfan: {label: 'Ceiling fans',         unit: 'ea',    pack: 1,    packName: 'fan',    sups: ['hd', 'low']},
  blinds:     {label: 'Blinds',               unit: 'ea',    pack: 1,    packName: 'blind',  sups: ['hd', 'low']},
  detector:   {label: 'Smoke + CO detectors', unit: 'ea',    pack: 1,    packName: 'detector', sups: ['hd', 'low']},
  vanity:     {label: 'Vanities',             unit: 'ea',    pack: 1,    packName: 'vanity', sups: ['fer', 'hd', 'low']},
  toilet:     {label: 'Toilets',              unit: 'ea',    pack: 1,    packName: 'toilet', sups: ['fer', 'hd', 'low']},
  exhaust:    {label: 'Exhaust fans',         unit: 'ea',    pack: 1,    packName: 'fan',    sups: ['hd', 'low']},
  hardware:   {label: 'Door hardware',        unit: 'ea',    pack: 1,    packName: 'set',    sups: ['hd', 'low']},
  storage:    {label: 'Closet systems',       unit: 'kit',   pack: 1,    packName: 'kit',    sups: ['hd', 'low']}
};
const CAT_ORDER = ['floor', 'paint', 'cabinet', 'counter', 'tile', 'appliance', 'lighting', 'door', 'hardware', 'vanity', 'shower', 'toilet', 'exhaust', 'ceilingfan', 'blinds', 'detector', 'storage'];

const RAW = {
  floor: [
    ['SH-PAR',  'Shaw', 'Paragon Mix Plus LVP, Aluminum 9×59', 8.60, '#B9B2A6', 'SM'],
    ['SH-PST',  'Shaw', 'Paragon Mix Plus LVP, Stonewash 9×59', 8.60, '#CFC7BA', 'M'],
    ['PRG-VPO', 'Pergo', 'Outlast+ Vintage Pewter Oak', 9.40, '#A39C92', 'MUL'],
    ['MH-FOG',  'Mohawk', 'RevWood Plus, Fog Oak', 10.80, '#B5AEA4', 'MU'],
    ['KR-BAL',  'Karndean', 'Korlok Baltic Limed Oak', 7.20, '#D7CFC2', 'MU'],
    ['FD-NUC',  'NuCore', 'Driftwood Oak Rigid Core', 4.99, '#C2B39C', 'M'],
    ['SM-BIR',  'SmartCore', 'Pro Silver Birch', 4.29, '#C7C1B5', 'ML'],
    ['TF-ELK',  'TrafficMaster', 'Elk Mountain Gray Oak', 2.89, '#A9A39A', 'M'],
    ['LP-STO',  'LifeProof', 'Sterling Oak LVP 7.1 in.', 6.20, '#C8A67C', '', {why: 'Warm, honey oak — the guide calls for gray-washed floors'}],
    ['CL-CAL',  'CoreLuxe', 'Calais Oak Engineered LVP', 5.80, '#B8986C', 'L', {why: 'Warm, honey oak — the guide calls for gray-washed floors'}],
    ['AQ-COA',  'Aquaguard', 'Coastal Oak Waterproof', 5.49, '#D2BE9F', '', {why: 'Warm oak tone'}],
    ['CT-SCZ',  'COREtec', 'Plus Santa Cruz Oak', 7.79, '#CDB28E', 'U', {why: 'Warm oak tone'}]
  ],
  tile: [
    ['DT-RIT',  'Daltile', 'Rittenhouse Arctic White 3×6 Matte', 26, '#F2F1EC', 'SM'],
    ['MSI-HPW', 'MSI', 'Highland Park Whisper White 3×6', 28, '#EFEDE6', 'M'],
    ['AO-BW',   'American Olean', 'Bright White 3×6 Glossy', 24, '#F8F8F5', 'M'],
    ['BD-CLOE', 'Bedrosians', 'Cloe Glossy White 3×6', 22, '#F7F7F4', 'M'],
    ['FD-WGS',  'Floor & Decor', 'White Glossy Subway 3×6', 18, '#FAFAF7', 'M'],
    ['CN-MAN',  'Cancos', 'Manhattan Bevel White 3×6', 32, '#F3F2EE', 'MU'],
    ['DT-ZEL',  'Daltile', 'Zellige-look Sea Salt 2×8', 34, '#E9E6DE', 'MU'],
    ['FD-HEX',  'Floor & Decor', 'Carrara Hex Mosaic', 16, '#ECECEA', 'M'],
    ['MSI-GRY', 'MSI', 'Gray Glossy 3×12', 19, '#C2C5C6', '', {why: 'Colored tile — the guide calls for white'}],
    ['BD-ZAG',  'Bedrosians', 'Zagora Sage 4×4', 30, '#A8B5A0', '', {why: 'Colored tile — the guide calls for white'}]
  ],
  shower: [
    ['FT-PAC',  'Florida Tile', 'Pietra Art Carrara 12×24 Honed', 24, '#EAEAE7', 'SM'],
    ['MSI-ARA', 'MSI', 'Arabescato Venato 12×24', 29, '#F0EFEC', 'M'],
    ['DT-VOL',  'Daltile', 'Volume 1.0 Lustrous 12×24', 21, '#E0DED8', 'M'],
    ['FD-NEW',  'Floor & Decor', 'Newport Gray 12×24', 9.99, '#C5C3BE', 'M'],
    ['MS-CG',   'MSI', 'Calacatta Gold 12×24 Polished', 36, '#F1EEE8', 'MU'],
    ['MZ-TV',   'Marazzi', 'Travisano Bianco 12×24 Polished', 42, '#EDE7DD', 'MU'],
    ['BD-MAG',  'Bedrosians', 'Magnifica Pure Calacatta 24×48', 58, '#F4F2EE', 'MU'],
    ['DT-HEXB', 'Daltile', 'Modern Hex Carbon Black Mosaic', 28, '#2E2E2E', '', {why: 'Black tile — the guide calls for white'}]
  ],
  counter: [
    ['MSI-CAL', 'MSI', 'Calacatta Laza Quartz (Polished)', 74, '#F2F0EB', 'SM'],
    ['QP-AUR',  'Q Premium', 'Aurora Quartz', 68, '#EDEBE6', 'M'],
    ['SM-FRN',  'Stonemark', 'Frost N Quartz', 71, '#F5F5F2', 'M'],
    ['LG-MIN',  'LG Viatera', 'Minuet Quartz', 79, '#EFEEEA', 'M'],
    ['SI-CALG', 'Silestone', 'Eternal Calacatta Gold', 82, '#F3EFE7', 'MU'],
    ['CAS-1141','Caesarstone', 'Pure White 1141', 96, '#FBFBF9', 'MU'],
    ['MSI-SG',  'MSI', 'Stellar Gray Quartz', 58, '#8E8E8C', '', {why: 'Dark gray — the guide calls for white quartz'}],
    ['HR-BB',   'Hardwood Reflections', 'Saman Butcher Block, Live Edge', 52, '#B07D4E', '', {why: 'Wood top — the guide calls for white quartz'}]
  ],
  cabinet: [
    ['DN-ARC',  'Diamond NOW', 'Arcadia White Shaker Stock Cabinet', 344, '#F4F2EC', 'SM'],
    ['KM-PUT',  'KraftMaid', 'Putnam Maple, Dove White', 389, '#EEECE6', 'MU'],
    ['HB-MEL',  'Hampton Bay', 'Designer Series Melvern White', 298, '#F6F5F1', 'M'],
    ['PS-WSH',  'Project Source', 'White Shaker Stock Cabinet', 262, '#F7F6F2', 'ML'],
    ['LA-ANC',  'Lifeart', 'Anchester Shaker White', 412, '#F2F0EA', 'MU'],
    ['HB-DGR',  'Hampton Bay', 'Shaker Dove Gray', 316, '#B9B6B0', 'M'],
    ['JK-MOC',  'JK Cabinetry', 'Mocha Shaker Maple', 455, '#6E5442', '', {why: 'Dark wood — the guide calls for white shaker'}],
    ['KM-NAV',  'KraftMaid', 'Shaker, Navy', 402, '#2F3D52', '', {why: 'Navy — the guide calls for white shaker'}]
  ],
  appliance: [
    ['GE-SUITE','GE Profile', '4-Piece Stainless Suite (Range, OTR, DW, Fridge)', 3950, '#C9CBCC', 'SM'],
    ['WHP-4SS', 'Whirlpool', '4-Piece Stainless Suite', 3620, '#C4C6C7', 'M'],
    ['FG-GAL',  'Frigidaire', 'Gallery 4-Piece Stainless Suite', 3210, '#CBCDCE', 'M'],
    ['SAM-4SS', 'Samsung', 'Smart Stainless 4-Piece Suite', 4180, '#C6C8C9', 'ML'],
    ['KA-PRO',  'KitchenAid', 'Pro Stainless 4-Piece Suite', 5340, '#BFC1C2', 'MU'],
    ['LG-BLK',  'LG', 'Black Stainless 4-Piece Suite', 4460, '#4A4B4D', '', {why: 'Black stainless — the guide calls for stainless'}]
  ],
  paint: [
    ['SW-7029', 'Sherwin-Williams', 'Agreeable Gray 7029, Satin (Gallon)', 78, '#D1CBC1', 'SM'],
    ['SW-7015', 'Sherwin-Williams', 'Repose Gray 7015, Satin (Gallon)', 78, '#C6C3BC', 'M'],
    ['BM-EDG',  'Benjamin Moore', 'Edgecomb Gray, Aura Satin (Gallon)', 84, '#D5CEC2', 'MU'],
    ['BH-SIL',  'Behr', 'Marquee Silver Drop, Satin (Gallon)', 58, '#D8D7D0', 'M'],
    ['SW-7005', 'Sherwin-Williams', 'Pure White 7005, Satin (Gallon)', 78, '#F2F0EA', ''],
    ['BH-MQ',   'Behr', 'Marquee Ultra Pure White, Satin', 62, '#F7F7F4', ''],
    ['BM-AURA', 'Benjamin Moore', 'Aura Decorators White, Satin', 84, '#F0F0EB', 'U'],
    ['GL-DP',   'Glidden', 'Diamond Pure White, Satin', 48, '#F6F6F3', '']
  ],
  lighting: [
    ['HB-13LED','Hampton Bay', '13 in. LED Flush Mount, Brushed Nickel', 55, '#A8A9A6', 'SM'],
    ['CE-11CS', 'Commercial Electric', '11 in. Color-Select LED Flush Mount', 39, '#B9BAB8', 'M'],
    ['PL-GULL', 'Progress Lighting', 'Gulliver 2-Light Close-to-Ceiling, Nickel', 89, '#A5A6A4', 'MU'],
    ['LI-WAF',  'Lithonia', '6 in. Wafer LED, 4-pack', 59, '#EFEFEC', 'M'],
    ['HB-KEN',  'Hampton Bay', 'Kendal Flush Mount, Brass', 64, '#C9A45C', '', {why: 'Brass — the guide calls for cool metals'}],
    ['GL-MBD',  'Globe Electric', 'Matte Black Dome Flush Mount', 49, '#2B2B2B', '', {why: 'Black finish is outside the guide'}]
  ],
  door: [
    ['MS-2PS',  'Masonite', '2-Panel Shaker, Primed, Prehung 32 in.', 189, '#F1EFE9', 'M'],
    ['JW-1PS',  'JELD-WEN', '1-Panel Shaker, Hollow Core, Prehung 30 in.', 168, '#F3F1EC', 'M'],
    ['MS-3SC',  'Masonite', '3-Panel Shaker, Solid Core, Prehung 32 in.', 262, '#F0EEE8', 'MU'],
    ['JW-5SC',  'JELD-WEN', '5-Panel Shaker, Solid Core, Prehung 32 in.', 289, '#EFEDE7', 'MU'],
    ['RB-6P',   'ReliaBilt', '6-Panel Hollow Core, Prehung 30 in.', 98, '#F5F4F0', ''],
    ['MS-FLU',  'Masonite', 'Flush Hollow Core, Primed, Prehung 30 in.', 79, '#F4F3EF', '']
  ],
  ceilingfan: [
    ['HU-DEMP', 'Hunter', 'Dempsey 52 in. LED Ceiling Fan, Brushed Nickel', 190, '#A8A9A6', 'SM'],
    ['HB-GLND', 'Hampton Bay', 'Glendale 52 in. LED Ceiling Fan', 139, '#B0B1AE', 'M'],
    ['HU-CRAN', 'Hunter', 'Cranbrook 52 in., Brushed Nickel', 229, '#A9AAA7', 'MU'],
    ['HD-ALT',  'Home Decorators', 'Altura 56 in., Matte White', 279, '#F1F1EF', 'MU'],
    ['MA-LWAV', 'Minka-Aire', 'Light Wave 52 in.', 345, '#E9E9E6', 'MUL'],
    ['HB-ROCK', 'Hampton Bay', 'Rockport 52 in., Oil-Rubbed Bronze', 119, '#4A3B2F', '', {why: 'Bronze — the guide calls for cool metals'}]
  ],
  blinds: [
    ['BA-2FW',  'Bali', '2 in. Faux Wood Blind, White', 55, '#F4F3EF', 'SM'],
    ['HD-2CFW', 'Home Decorators', '2 in. Cordless Faux Wood Blind', 42, '#F6F5F1', 'M'],
    ['LV-2CW',  'Levolor', '2 in. Cordless Wood Blind', 98, '#F1EFE9', 'MU'],
    ['HD-CELL', 'Home Decorators', 'Light-Filtering Cordless Cellular Shade', 64, '#F0EEE9', 'M'],
    ['RS-PAP',  'Redi Shade', 'Temporary Paper Shade', 12, '#F2EFE7', '']
  ],
  detector: [
    ['FA-SCO5', 'First Alert', 'SCO5CN Hardwired Smoke + CO Combo', 35, '#F4F4F2', 'SM'],
    ['KD-COSM', 'Kidde', 'KN-COSM-IBA Hardwired Combo', 39, '#F2F2F0', 'M'],
    ['GN-PROT', 'Google Nest', 'Protect Wired Smoke + CO', 119, '#F7F7F5', 'MU']
  ],
  vanity: [
    ['HD-SON48','Home Decorators', 'Sonoma 48 in. Double Vanity, Pebble Grey', 1620, '#B7B5AF', 'SM', {size: 48}],
    ['OV-ED48', 'OVE Decors', 'Edenderry 48 in. Double Vanity, Dove Gray', 1180, '#C3C1BC', 'M', {size: 48}],
    ['GB-EV48', 'Glacier Bay', 'Everdean 48 in. Vanity, White', 899, '#F2F1ED', 'M', {size: 48}],
    ['JM-BRK48','James Martin', 'Brookfield 48 in. Double Vanity, Mahogany', 2160, '#6B3F2A', 'U', {size: 48, why: 'Dark wood — the guide calls for light gray or white'}],
    ['AV-LOFT48','Avanity', 'Loft 48 in. Double Vanity, Dark Walnut', 1840, '#5A4636', '', {size: 48, why: 'Dark wood — the guide calls for light gray or white'}],
    ['HD-SON30','Home Decorators', 'Sonoma 30 in. Vanity, Pebble Grey', 720, '#B7B5AF', 'SM', {size: 30}],
    ['OV-ED30', 'OVE Decors', 'Edenderry 30 in. Vanity, Dove Gray', 640, '#C3C1BC', 'M', {size: 30}],
    ['GB-EV30', 'Glacier Bay', 'Everdean 30 in. Vanity, White', 449, '#F2F1ED', 'M', {size: 30}]
  ],
  toilet: [
    ['K-CIM',   'Kohler', 'Cimarron Comfort Height Elongated', 540, '#F5F5F2', 'SM'],
    ['AS-CH4',  'American Standard', 'Champion 4 Elongated', 368, '#F6F6F3', 'M'],
    ['TT-DR2',  'TOTO', 'Drake II Elongated 1.28 GPF', 712, '#F7F7F4', 'MU'],
    ['GB-2PC',  'Glacier Bay', '2-Piece 1.1 GPF Elongated', 139, '#F4F4F1', 'M']
  ],
  exhaust: [
    ['PA-WG80', 'Panasonic', 'WhisperGreen 80 CFM, Humidity Sensing', 165, '#EDEDEA', 'SM'],
    ['BN-80HS', 'Broan-NuTone', '80 CFM Humidity Sensing Fan', 128, '#EFEFEC', 'M'],
    ['DB-SIG80','Delta Breez', 'Signature 80 CFM', 142, '#F0F0ED', 'ML']
  ],
  hardware: [
    ['KW-TYLO', 'Kwikset', 'Tylo Privacy Knob, Satin Nickel', 20, '#A8A9A6', 'SM'],
    ['SC-ANDV', 'Schlage', 'Andover Privacy Knob, Satin Nickel', 29, '#ABACA9', 'M'],
    ['DF-BRDY', 'Defiant', 'Brandywine Privacy Knob, Satin Nickel', 13, '#AEAFAC', 'M'],
    ['BW-RSV',  'Baldwin', 'Reserve Round Knob, Satin Nickel', 58, '#A6A7A4', 'MUL'],
    ['KW-HAL',  'Kwikset', 'Halifax Privacy Knob, Matte Black', 24, '#262626', '', {why: 'Black finish is outside the guide'}]
  ],
  storage: [
    ['CM-ST58', 'ClosetMaid', 'ShelfTrack 5–8 ft Closet Kit, White', 460, '#F3F3F0', 'SM'],
    ['RB-HF48', 'Rubbermaid', 'HomeFree 4–8 ft Closet Kit', 320, '#F1F1EE', 'M'],
    ['ET-DSC',  'Easy Track', 'Deluxe Starter Closet, White', 620, '#F2F2EF', 'MU']
  ]
};

/* What the team says about a product — shown in its detail. */
const TEAM_SAYS = {
  'SH-PAR':  [['JR', 'Clicks together fast and hides seams well. Our crews like it.', '1208 Oak St · Sep']],
  'DT-RIT':  [['SP', 'Our default backsplash. Pickup stock at #1863 runs thin on Mondays.', '77 Dock St · Oct']],
  'DN-ARC':  [['TO', 'Ships assembled; boxes fit through a 30″ door.', '1515 Market · Aug']],
  'MSI-CAL': [['SP', 'Fabricator turns it in 6 days if we order by Thursday.', '210 Princess · Oct']],
  'FT-PAC':  [['JR', '12×24 means fewer cuts on a 60″ shower wall.', '402 Grace St · Jul']],
  'HU-DEMP': [['JR', 'Easy hang. Light kit is included — no extra trip.', '1208 Oak St · Sep']],
  'K-CIM':   [['TO', 'Never had a callback on these.', '88 Castle St · Jun']]
};

/* Build the catalog: supplier offers, stock and dates are derived from the
   SKU so the demo is stable. */
const _h = s => { let h = 7; for(const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const CATALOG = {};
const BY_CAT = {};
Object.entries(RAW).forEach(([cat, rows]) => {
  const info = CAT_INFO[cat];
  BY_CAT[cat] = rows.map(([sku, brand, name, price, color, flags, extra]) => {
    const x = extra || {}, h = _h(sku);
    const sups = info.sups;
    const s0 = sups[h % sups.length];
    const low = flags.includes('L');
    const pack = cat === 'floor' ? [23.6, 22.4, 19.8, 24][h % 4] : cat === 'tile' ? [12.5, 10, 8.6][h % 3] : cat === 'shower' ? [11.6, 15.5, 7.7][h % 3] : info.pack;
    const mkOffer = (sup, i) => {
      const hh = _h(sku + sup);
      const stock = low ? 3 + hh % 5 : 18 + hh % 70;
      // a second store never matches the first to the cent, so the choice means something
      return {sup, price: i ? Math.round(price * [0.94, 0.97, 1.03, 1.06, 0.95, 1.04][hh % 6] * 100) / 100 : price,
        stock, aisle: `Aisle ${4 + hh % 30} · Bay ${1 + hh % 18}`, ship: day(11, 20 + hh % 7)};
    };
    const offers = [mkOffer(s0, 0)];
    if(h % 3 !== 0){ const s1 = sups.find(s => s !== s0); if(s1) offers.push(mkOffer(s1, 1)); }
    const p = {sku, cat, brand, name, price, color, unit: info.unit, pack, packName: info.packName,
      std: flags.includes('S'), mood: flags.includes('M'), up: flags.includes('U'), why: x.why || '', size: x.size || 0,
      used: flags.includes('S') ? 90 + h % 80 : h % 3 ? h % 34 : 0,
      rating: (41 + h % 8) / 10, reviews: 40 + h % 900, offers};
    CATALOG[sku] = p;
    return p;
  });
});

/* Demo specifics: the backsplash tile the crew will find gone at pickup, and a
   fixture that's out at the nearest store and ships in a few weeks. */
CATALOG['DT-RIT'].offers = [{sup: 'hd', price: 26, stock: 6, aisle: 'Aisle 21 · Bay 4', ship: day(11, 21)}];
CATALOG['MSI-HPW'].offers = [{sup: 'hd', price: 28, stock: 46, aisle: 'Aisle 21 · Bay 5', ship: day(11, 21)}];
CATALOG['AO-BW'].offers = [{sup: 'hd', price: 24, stock: 31, aisle: 'Aisle 21 · Bay 7', ship: day(11, 21)}];
CATALOG['CN-MAN'].offers = [{sup: 'hd', price: 32, stock: 12, aisle: 'Aisle 21 · Bay 9', ship: day(11, 22)}];
CATALOG['PL-GULL'].offers = [{sup: 'hd', price: 89, stock: 0, aisle: 'Aisle 9 · Bay 2', ship: day(12, 7)}, {sup: 'low', price: 91.5, stock: 5, aisle: 'Aisle 12 · Bay 6', ship: day(11, 24)}];
['SH-PAR', 'DN-ARC', 'MSI-CAL', 'GE-SUITE', 'SW-7029', 'HU-DEMP', 'BA-2FW', 'FA-SCO5', 'KW-TYLO', 'CM-ST58', 'PA-WG80'].forEach(s => { CATALOG[s].offers[0].sup = 'hd'; });
['HD-SON48', 'HD-SON30', 'OV-ED30', 'K-CIM'].forEach(s => { CATALOG[s].offers[0].sup = 'fer'; });
// A store sells a product once: where that left two offers from the same store, the second moves to another store.
Object.values(CATALOG).forEach(p => { if(p.offers.length > 1 && p.offers[1].sup === p.offers[0].sup){
  const alt = CAT_INFO[p.cat].sups.find(s => s !== p.offers[0].sup); if(alt) p.offers[1].sup = alt; else p.offers.length = 1; } });

/* ── What the job needs ──
   One row per task × product type. qty is what to cover (waste included);
   src says where that number came from. pick/backups are SKUs. */
const NEEDS = [
  {id: 'k1', room: 'kitchen', cat: 'cabinet',   task: 'Cabinets', qty: 14, src: 'Floor plan: 8′ base run + 6′ upper run', pick: 'DN-ARC', backups: ['KM-PUT'], allow: 6500,
   desc: 'Demo existing uppers and base cabinets. Install new shaker fronts, soft-close hardware and toe-kick. Verify the wall is plumb before hanging.'},
  {id: 'k2', room: 'kitchen', cat: 'counter',   task: 'Countertops', qty: 42, src: 'Fabricator template: 2 runs, 25.5″ deep, plus island return', pick: 'MSI-CAL', backups: [], allow: 4000,
   desc: 'Remove laminate tops. Template and install quartz with an undermount sink cutout and a 4″ splash on the window wall.'},
  {id: 'k3', room: 'kitchen', cat: 'tile',      task: 'Backsplash tile installation', qty: 32, src: 'Floor plan: 16′ of wall × 18″ high, +10% waste', pick: 'DT-RIT', backups: ['MSI-HPW'],
   desc: 'Tile the backsplash from countertop to the underside of the uppers. Running bond, white grout, bullnose at the open ends.'},
  {id: 'k4', room: 'kitchen', cat: 'appliance', task: 'Appliances', qty: 1, src: '1 suite: range, over-the-range microwave, dishwasher, fridge', pick: 'GE-SUITE', backups: ['WHP-4SS'], allow: 4500,
   desc: 'Remove and haul away old appliances. Deliver and install a matching stainless suite. Fridge opening is 36″.'},
  {id: 'k5', room: 'kitchen', cat: 'lighting',  task: 'Kitchen lighting', qty: 3, src: '3 ceiling boxes (photo, Mar 9)', pick: 'PL-GULL', backups: [],
   desc: 'Replace three ceiling fixtures with close-to-ceiling LED fixtures in brushed nickel.'},
  {id: 'k6', room: 'kitchen', cat: 'paint',     task: 'Paint', qty: 2, src: 'Walls: 350 SF, 2 coats ≈ 2 gallons', pick: 'SW-7029', backups: [],
   desc: 'Patch, prime stains and paint walls Agreeable Gray. Trim and the four interior doors Pure White. Ceilings flat white (by the crew, not in this list).'},
  // A second option on the same task (of: its task's id): the task's name, room and description come from k6.
  {id: 'k6t', of: 'k6', cat: 'paint', qty: 1, src: 'Base, casing and 4 doors, 1 coat over primer ≈ 1 gallon', pick: 'SW-7005', backups: []},
  {id: 'k7', room: 'kitchen', cat: 'floor',     task: 'Kitchen flooring', qty: 185, src: 'Floor plan: 14′ × 12′ = 168 SF, +10% waste', pick: 'SH-PAR', backups: ['SH-PST'],
   desc: 'Remove sheet vinyl. Level and install click-lock LVP. Transition to the hallway at the existing seam.'},
  {id: 'k8', room: 'kitchen', cat: 'door',      task: 'Interior doors', qty: 4, src: '4 openings: pantry, laundry, 2 closets', pick: null, backups: [],
   desc: 'Replace four hollow-core doors with prehung shaker doors. Two are 30″, two are 32″ — check each opening.'},
  {id: 'l1', room: 'living',  cat: 'floor',     task: 'Flooring', qty: 277, src: 'Floor plan: 18′ × 14′ = 252 SF, +10% waste', pick: 'SH-PAR', backups: ['SH-PST'],
   desc: 'Remove carpet and pad. Install click-lock LVP to match the kitchen; run planks parallel to the long wall.'},
  {id: 'l2', room: 'living',  cat: 'paint',     task: 'Paint', qty: 4, src: 'Walls: 640 SF, 2 coats ≈ 4 gallons', pick: 'SW-7029', backups: [], desc: 'Patch and paint walls Agreeable Gray.'},
  {id: 'l3', room: 'living',  cat: 'ceilingfan',task: 'Ceiling fan', qty: 1, src: '1 fan box, center of ceiling', pick: 'HU-DEMP', backups: [], desc: 'Replace the light with a 52″ fan with an LED light kit.'},
  {id: 'l4', room: 'living',  cat: 'blinds',    task: 'Blinds', qty: 3, src: '3 front windows, 35″ wide', pick: 'BA-2FW', backups: [], desc: 'Install 2″ white faux wood blinds, inside mount.'},
  {id: 'l5', room: 'living',  cat: 'detector',  task: 'Smoke + CO detectors', qty: 2, src: '2 locations per code', pick: 'FA-SCO5', backups: [], desc: 'Replace with hardwired smoke + CO combos.'},
  {id: 'p1', room: 'pbath',   cat: 'vanity',    task: 'Double vanity replacement', qty: 1, fit: 48, src: '48″ opening (photo, Mar 2)', pick: 'HD-SON48', backups: ['OV-ED48'], allow: 2000,
   desc: 'Remove the vanity and top. Install a 48″ double vanity with integrated top; new supply lines and P-traps.'},
  {id: 'p2', room: 'pbath',   cat: 'shower',    task: 'Shower wall and floor tile', qty: 96, src: 'Shower 60″ × 32″ × 7′ walls + floor, +10% waste', pick: null, backups: [],
   desc: 'Demo the tile surround to studs. Install cement board and waterproofing, then 12×24 wall tile and a mosaic floor.'},
  {id: 'p3', room: 'pbath',   cat: 'toilet',    task: 'Toilet', qty: 1, src: '1 toilet, 12″ rough-in', pick: 'K-CIM', backups: [], desc: 'Replace the toilet with a comfort-height elongated model.'},
  {id: 'p4', room: 'pbath',   cat: 'exhaust',   task: 'Exhaust fan', qty: 1, src: '1 fan, existing duct', pick: 'PA-WG80', backups: [], desc: 'Replace the exhaust fan with an 80 CFM humidity-sensing fan.'},
  {id: 'p5', room: 'pbath',   cat: 'hardware',  task: 'Door hardware', qty: 2, src: '2 doors: bath and closet', pick: 'KW-TYLO', backups: [], desc: 'Replace door knobs with satin nickel privacy knobs.'},
  {id: 'b1', room: 'bath',    cat: 'vanity',    task: 'Vanity', qty: 1, fit: 30, src: '30″ opening (photo, Mar 2)', pick: 'OV-ED30', backups: [], desc: 'Replace the vanity with a 30″ vanity and integrated top.'},
  {id: 'b2', room: 'bath',    cat: 'toilet',    task: 'Toilet', qty: 1, src: '1 toilet, 12″ rough-in', pick: 'K-CIM', backups: [], desc: 'Replace the toilet.'},
  {id: 'b3', room: 'bath',    cat: 'exhaust',   task: 'Exhaust fan', qty: 1, src: '1 fan, existing duct', pick: 'PA-WG80', backups: [], desc: 'Replace the exhaust fan.'},
  {id: 'b4', room: 'bath',    cat: 'paint',     task: 'Paint', qty: 1, src: 'Walls: 180 SF, 2 coats ≈ 1 gallon', pick: 'SW-7029', backups: [], desc: 'Paint walls Agreeable Gray, semi-gloss trim.'},
  {id: 'r1', room: 'pbed',    cat: 'floor',     task: 'Flooring', qty: 231, src: 'Floor plan: 15′ × 14′ = 210 SF, +10% waste', pick: 'SH-PAR', backups: ['SH-PST'], desc: 'Remove carpet. Install LVP to match the rest of the house.'},
  {id: 'r2', room: 'pbed',    cat: 'paint',     task: 'Paint', qty: 3, src: 'Walls: 520 SF, 2 coats ≈ 3 gallons', pick: 'SW-7029', backups: [], desc: 'Paint walls Agreeable Gray.'},
  {id: 'r3', room: 'pbed',    cat: 'ceilingfan',task: 'Ceiling fan', qty: 1, src: 'New fan box needed (photo, Mar 9)', pick: null, backups: [], desc: 'Add a fan-rated box and install a 52″ ceiling fan with light.'},
  {id: 'r4', room: 'pbed',    cat: 'storage',   task: 'Closet system', qty: 1, src: 'Closet 6′ wide', pick: 'CM-ST58', backups: [], desc: 'Install a wire closet kit, one hang rod and shelf, one double-hang section.'},
  {id: 'e1', room: 'bed2',    cat: 'floor',     task: 'Flooring', qty: 145, src: 'Floor plan: 11′ × 12′ = 132 SF, +10% waste', pick: 'LP-STO', backups: [], desc: 'Remove carpet. Install LVP.'},
  {id: 'e2', room: 'bed2',    cat: 'paint',     task: 'Paint', qty: 2, src: 'Walls: 400 SF, 2 coats ≈ 2 gallons', pick: 'SW-7029', backups: [], desc: 'Paint walls Agreeable Gray.'},
  {id: 'e3', room: 'bed2',    cat: 'blinds',    task: 'Blinds', qty: 2, src: '2 windows, 35″ wide', pick: 'BA-2FW', backups: [], desc: 'Install 2″ white faux wood blinds.'}
];
/* Each task's chosen option, named as Scope names it ("Replace : LVP"): what the
   products on the shelf are for. */
const OPT = {
  k1: 'Replace : Shaker cabinets', k2: 'Replace : Quartz', k3: 'Install : Subway tile', k4: 'Replace : Stainless suite',
  k5: 'Replace : LED fixtures', k6: 'Paint : Walls', k6t: 'Paint : Trim and doors', k7: 'Replace : LVP', k8: 'Replace : Prehung doors',
  l1: 'Replace : LVP', l2: 'Paint : Walls', l3: 'Replace : Fan with light', l4: 'Install : Faux wood blinds', l5: 'Replace : Hardwired combos',
  p1: 'Replace : 48″ double vanity', p2: 'Replace : Wall and floor tile', p3: 'Replace : Comfort-height toilet', p4: 'Replace : 80 CFM fan', p5: 'Replace : Privacy knobs',
  b1: 'Replace : 30″ vanity', b2: 'Replace : Toilet', b3: 'Replace : Exhaust fan', b4: 'Paint : Walls and trim',
  r1: 'Replace : LVP', r2: 'Paint : Walls', r3: 'Add : Fan with light', r4: 'Install : Wire closet kit',
  e1: 'Replace : LVP', e2: 'Paint : Walls', e3: 'Install : Faux wood blinds'
};
NEEDS.forEach(n => { n.opt = OPT[n.id] || ''; });
/* A task can have more than one option, each shopped on its own. An option row
   names its task with of:, and takes the task's name, room and description. */
NEEDS.forEach(n => { if(n.of){ const t = NEEDS.find(x => x.id === n.of); n.task = t.task; n.room = t.room; n.desc = t.desc; } });

/* Notes on the job, by need (and a few for the whole room). */
const NOTES = {
  k2: [['TO', 'Owner signed off on white quartz — no butcher block, it’s a rental.', 'Mar 9'], ['TO', 'Added the island return after the walk with the fabricator. 38 → 42 SF.', 'Nov 17']],
  k3: [['SP', 'Rittenhouse is our default. If #1863 is short, MSI Whisper White is the same look.', 'Nov 12']],
  k7: [['JR', 'Hallway seam is at the kitchen door — order one extra box for the transition.', 'Nov 10']],
  k8: [['TO', 'Pantry and laundry are 30″. Both closets are 32″.', 'Mar 9']],
  l1: [['TO', 'Match the hallway LVP from the 2024 turn (Shaw Paragon, Aluminum).', 'Mar 2']],
  p2: [['SP', '12×24 on the walls means fewer cuts on the 60″ wall.', 'Nov 16']],
  e1: [['SP', 'Bedroom 2 was quoted with LifeProof before we standardized on Paragon.', 'Nov 3']],
  r3: [['JR', 'Needs a fan-rated box — the existing one is light-only.', 'Mar 9']]
};
