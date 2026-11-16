/* Shop with Kai inside KaiWeb — product and room sketches (from the wireframe's
   js/wireframe.js, without its grayscale photo filter). Loaded before spree.js,
   which draws every product picture through window.__wfArt. */
(function(){
  const uri = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  const svg = (body, vb) => uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb || '0 0 160 120'}" preserveAspectRatio="xMidYMid slice">${body}</svg>`);
  const hash = s => { let h = 0; s = String(s || ''); for(let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const L = 'fill="none" stroke="#6e6e6e" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';

  /* ── rooms ── */
  const ROOMS = {
    kitchen: (v) => `<rect width="160" height="120" fill="#ececec"/><rect y="86" width="160" height="34" fill="#dcdcdc"/>
      <rect x="${54 + v * 4}" y="14" width="40" height="30" fill="#f7f7f7" stroke="#8a8a8a"/><path d="M${74 + v * 4} 14v30M${54 + v * 4} 29h40" stroke="#8a8a8a"/>
      <g ${L}><rect x="8" y="12" width="40" height="28"/><path d="M28 12v28"/><rect x="100" y="12" width="52" height="28"/><path d="M126 12v28"/>
      <rect x="8" y="58" width="144" height="30"/><path d="M8 58h144M44 58v30M80 58v30M116 58v30"/><path d="M38 70h4M74 70h4M110 70h4M146 70h4"/></g>
      <rect x="6" y="54" width="148" height="5" fill="#bdbdbd"/>`,
    bath: (v) => `<rect width="160" height="120" fill="#efefef"/>${[...Array(8)].map((_, i) => `<path d="M${i * 20} 0v80" stroke="#e0e0e0"/>`).join('')}<path d="M0 40h160M0 60h160M0 20h160" stroke="#e0e0e0"/>
      <rect y="80" width="160" height="40" fill="#dedede"/>
      <g ${L}><rect x="${18 + v * 3}" y="18" width="34" height="30" rx="4" fill="#f9f9f9"/><rect x="12" y="56" width="48" height="26" fill="#f4f4f4"/><path d="M12 62h48M36 56v26"/>
      <path d="M86 64h64v14a10 10 0 0 1-10 10h-44a10 10 0 0 1-10-10z" fill="#fafafa"/><path d="M138 64V36h8"/></g>`,
    bedroom: (v) => `<rect width="160" height="120" fill="#ededed"/><rect y="84" width="160" height="36" fill="#d9d9d9"/>
      <rect x="${96 - v * 4}" y="16" width="40" height="34" fill="#f8f8f8" stroke="#8a8a8a"/><path d="M${116 - v * 4} 16v34" stroke="#8a8a8a"/>
      <g ${L}><rect x="14" y="44" width="70" height="16" rx="3" fill="#f6f6f6"/><rect x="10" y="58" width="84" height="26" rx="3" fill="#fbfbfb"/><path d="M10 70h84"/>
      <rect x="100" y="66" width="20" height="18"/><path d="M110 50v16M104 50h12l-3-8h-6z"/></g>`,
    living: (v) => `<rect width="160" height="120" fill="#eeeeee"/><rect y="88" width="160" height="32" fill="#dadada"/>
      <rect x="18" y="14" width="${40 + v * 4}" height="28" fill="#e2e2e2" stroke="#8a8a8a"/>
      <g ${L}><path d="M30 64h100v22H30z" fill="#f7f7f7"/><path d="M24 56h12v32H24zM124 56h12v32h-12z" fill="#f2f2f2"/><path d="M36 64v-12h88v12"/><path d="M80 52v34"/>
      <path d="M140 30v58M134 30h12"/><circle cx="140" cy="24" r="7" fill="#f4f4f4"/></g>`,
    garage: (v) => `<rect width="160" height="120" fill="#ececec"/><path d="M0 46l80-34 80 34v74H0z" fill="#f6f6f6" stroke="#8a8a8a"/>
      <g ${L}><rect x="34" y="58" width="92" height="62" fill="#e9e9e9"/>${[0, 1, 2, 3, 4].map(i => `<path d="M34 ${70 + i * 10}h92"/>`).join('')}<rect x="${8 + v * 2}" y="60" width="16" height="18"/></g>`,
    exterior: (v) => `<rect width="160" height="120" fill="#f0f0f0"/><rect y="96" width="160" height="24" fill="#d6d6d6"/>
      <g ${L}><path d="M30 56l50-34 50 34" /><rect x="38" y="56" width="84" height="40" fill="#f8f8f8"/><rect x="72" y="70" width="16" height="26"/>
      <rect x="46" y="64" width="16" height="14"/><rect x="98" y="64" width="16" height="14"/><circle cx="${18 + v * 3}" cy="70" r="12" fill="#e0e0e0"/><path d="M${18 + v * 3} 82v14"/></g>`,
  };
  const roomKind = r => { r = String(r || '').toLowerCase();
    return /kitchen/.test(r) ? 'kitchen' : /bath/.test(r) ? 'bath' : /bed/.test(r) ? 'bedroom' : /living|family|dining/.test(r) ? 'living'
      : /garage/.test(r) ? 'garage' : /curb|exterior|front|yard|job/.test(r) ? 'exterior' : null; };
  const PHOTOS = window.__wfPhotos || null;
  function roomArt(room, n){
    const kind = roomKind(room) || Object.keys(ROOMS)[hash(room + n) % Object.keys(ROOMS).length];
    const ph = PHOTOS && PHOTOS.room[kind];
    if(ph && ph.length) return ph[(hash(String(room)) + (n || 0)) % ph.length];
    const keys = Object.keys(ROOMS);
    const k = roomKind(room) || keys[hash(room + n) % keys.length];
    return svg(ROOMS[k]((hash(String(n)) % 3)));
  }

  /* ── products ── */
  function finishTone(name){
    const n = String(name || '').toLowerCase();
    if(/bronze/.test(n)) return '#5c5c5c';
    if(/black|carbon/.test(n)) return '#2e2e2e';
    if(/nickel|stainless|chrome|pewter/.test(n)) return '#b9b9b9';
    if(/walnut|mocha|oak|maple|wood|butcher/.test(n)) return '#a3a3a3';
    if(/gray|grey/.test(n)) return '#c4c4c4';
    return '#f6f6f6';
  }
  const ART = {
    cabinet: f => `<g ${L}><rect x="34" y="20" width="92" height="84" fill="${f}"/><path d="M80 20v84M34 62h92"/><rect x="40" y="26" width="34" height="30"/><rect x="86" y="26" width="34" height="30"/><rect x="40" y="68" width="34" height="30"/><rect x="86" y="68" width="34" height="30"/><path d="M70 40v6M90 40v6M70 80v6M90 80v6"/></g>`,
    counter: f => `<g ${L}><path d="M18 52l26-14h98l-26 14z" fill="${f}"/><path d="M18 52v10h98V52M116 62l26-14V38"/><path d="M48 44c10 2 20-2 30 1s18 0 26 2" stroke="#9a9a9a"/></g>`,
    tile: f => `<g ${L}>${[0, 1, 2, 3].map(r => [0, 1, 2].map(c => `<rect x="${30 + c * 34 + (r % 2) * 17}" y="${22 + r * 20}" width="32" height="18" fill="${f}"/>`).join('')).join('')}</g>`,
    appliance: f => `<g ${L}><rect x="20" y="22" width="40" height="80" rx="3" fill="${f}"/><path d="M20 52h40M54 30v14M54 60v18"/><rect x="72" y="50" width="56" height="52" rx="3" fill="${f}"/><rect x="80" y="64" width="40" height="28"/><circle cx="84" cy="56" r="2"/><circle cx="94" cy="56" r="2"/><circle cx="104" cy="56" r="2"/></g>`,
    floor: f => `<g ${L}>${[0, 1, 2, 3, 4].map(i => `<path d="M${10 + i * 8} ${100 - i * 12}l${120} 0" />`).join('')}<path d="M10 100l40-60h100l-40 60z" fill="${f}" opacity=".6"/><path d="M36 76l14 0M70 64l20 0M98 88l14 0"/></g>`,
    paint: f => `<g ${L}><path d="M50 40h60v58a6 6 0 0 1-6 6H56a6 6 0 0 1-6-6z" fill="${f}"/><ellipse cx="80" cy="40" rx="30" ry="7" fill="#fafafa"/><path d="M54 40c0-18 52-18 52 0"/><rect x="58" y="60" width="44" height="22" fill="#fff"/></g>`,
    vanity: f => `<g ${L}><rect x="50" y="12" width="60" height="34" rx="4" fill="#f9f9f9"/><rect x="34" y="58" width="92" height="44" fill="${f}"/><path d="M30 54h100v6H30z" fill="#e6e6e6"/><path d="M80 58v44M64 74v6M96 74v6"/><path d="M80 46v8"/></g>`,
    shower: f => `<g ${L}>${[0, 1, 2, 3, 4].map(r => `<path d="M24 ${24 + r * 16}h112"/>`).join('')}${[0, 1, 2, 3, 4, 5].map(c => `<path d="M${24 + c * 22} 24v64"/>`).join('')}<rect x="24" y="24" width="112" height="64" fill="${f}" opacity=".5"/><path d="M110 24v-6h14M124 18v10" /></g>`,
    toilet: f => `<g ${L}><rect x="58" y="16" width="44" height="30" rx="3" fill="${f}"/><path d="M48 52h64c0 22-14 34-32 34s-32-12-32-34z" fill="${f}"/><path d="M66 86l-4 18h36l-4-18"/></g>`,
    mech: f => `<g ${L}><rect x="40" y="40" width="58" height="26" rx="4" fill="${f}"/><path d="M98 53h44"/><path d="M60 66v10h18V66"/><circle cx="52" cy="53" r="4"/></g>`,
    storage: f => `<g ${L}><path d="M24 24h112M24 24v80M136 24v80M24 60h112"/><path d="M40 24v28M60 24v30M80 24v26M100 24v28" stroke-dasharray="2 3"/><rect x="34" y="70" width="28" height="20" fill="${f}"/><rect x="98" y="70" width="28" height="20" fill="${f}"/></g>`,
    hardware: f => `<g ${L}><rect x="62" y="20" width="24" height="80" rx="4" fill="#f2f2f2"/><circle cx="74" cy="50" r="16" fill="${f}"/><circle cx="74" cy="78" r="4"/></g>`,
    lighting: f => `<g ${L}><path d="M40 40h80"/><path d="M48 40c0 22 64 22 64 0" fill="#fafafa"/><rect x="74" y="30" width="12" height="10" fill="${f}"/><path d="M60 72l-6 10M80 76v12M100 72l6 10" stroke="#9a9a9a"/></g>`,
    ceilingfan: f => `<g ${L}><path d="M80 14v24"/><circle cx="80" cy="46" r="9" fill="${f}"/><path d="M71 46H18l4-7h49M89 46h53l-4-7H89"/><path d="M80 55c-8 0-10 14 0 14s8-14 0-14z" fill="#fafafa"/></g>`,
    detector: f => `<g ${L}><circle cx="80" cy="60" r="34" fill="#fafafa"/><circle cx="80" cy="60" r="20"/><circle cx="80" cy="60" r="3" fill="${f}"/><path d="M62 44l6 6M98 44l-6 6"/></g>`,
    blinds: f => `<g ${L}><rect x="30" y="14" width="100" height="10" fill="${f}"/>${[...Array(9)].map((_, i) => `<path d="M34 ${32 + i * 8}h92"/>`).join('')}<path d="M124 24v80"/></g>`,
    exhaust: f => `<g ${L}><rect x="44" y="28" width="72" height="64" rx="4" fill="${f}"/>${[0, 1, 2, 3, 4].map(i => `<path d="M54 ${42 + i * 9}h52"/>`).join('')}</g>`,
    generic: f => `<g ${L}><path d="M50 42l30-14 30 14v40l-30 14-30-14z" fill="${f}"/><path d="M50 42l30 14 30-14M80 56v40"/></g>`,
  };
  function productArt(x){
    if(!x) return svg('<rect width="160" height="120" fill="#efefef"/>');
    const sec = x.section && ART[x.section] ? x.section : (/fan/i.test(x.name) ? 'ceilingfan' : /light|lamp/i.test(x.name) ? 'lighting' : 'generic');
    if(PHOTOS && PHOTOS.sku && PHOTOS.sku[x.sku]) return PHOTOS.sku[x.sku];
    const ph = PHOTOS && PHOTOS.product[sec];
    if(ph && ph.length) return ph[hash(x.sku || x.name) % ph.length];
    const bg = ['#efefef', '#eaeaea', '#f2f2f2'][hash(x.sku) % 3];
    return svg(`<rect width="160" height="120" fill="${bg}"/>${ART[sec](finishTone(x.name))}`);
  }
  /* High fidelity: product pictures are solid colour tiles from a warm, muted
     set (the same family as the job's photo placeholders), one per product so
     neighbouring cards differ. */
  const SOLIDS = ['#D9E0E6', '#E8CFB8', '#ECE4D4', '#D8DFD3', '#E3D6BF', '#DED7E2', '#E6DCCB', '#CFD9DC'];
  const solidProduct = x => svg(`<rect width="160" height="120" fill="${SOLIDS[hash(x && (x.sku || x.name)) % SOLIDS.length]}"/>`);
  // Mood board pictures: solid tiles too, from a deeper set so the board reads
  // as inspiration rather than as product swatches. Labels stay the board's own.
  const MOODS = ['#C9B8A0', '#A9B7AE', '#D8C3A5', '#B5A69A', '#9FB0BC', '#D6B9A3', '#BCB59C', '#C7C2B6', '#A88F7A', '#B9C3B0'];
  const solidMood = i => svg(`<rect width="160" height="120" fill="${MOODS[i % MOODS.length]}"/>`);
  window.__wfArt = {product: solidProduct, room: roomArt, mood: solidMood};
})();
