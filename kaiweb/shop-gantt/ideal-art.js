/* Shop with Kai — ideal shopping concept: drawn pictures.
   Every product gets a soft, finish-colored drawing of what it is (planks,
   subway tile, a quartz slab, shaker doors…), so the shelf reads at a glance
   without photography. Rooms get "site photos" in the same hand. */
const ART = (() => {
  const cache = new Map();
  const uri = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const shade = (h, f) => { const [r, g, b] = rgb(h), t = f < 0 ? 0 : 255, p = Math.abs(f); return hex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p); };
  const lum = h => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const rnd = seed => { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const hs = s => { let h = 7; for(const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const BG = `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F9F6F0"/><stop offset="1" stop-color="#ECE6DA"/></linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="glow" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#FFFBEA"/><stop offset="1" stop-color="#FFFBEA" stop-opacity="0"/></radialGradient></defs>
    <rect width="240" height="180" fill="url(#bg)"/>`;
  const shadow = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${Math.max(4, rx * .1)}" fill="#3b3326" opacity=".12"/>`;
  const metal = c => `<linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(c, .35)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -.25)}"/></linearGradient>`;

  /* ── surfaces ── */
  function planks(c, seed, w = 240, h = 180){
    const r = rnd(seed), rows = 7, rh = h / rows; let s = '';
    for(let i = 0; i < rows; i++){
      let x = -Math.floor(r() * 120);
      while(x < w){
        const len = 95 + Math.floor(r() * 70), f = (r() - .5) * .12;
        const fill = f < 0 ? shade(c, f) : shade(c, f);
        s += `<rect x="${x}" y="${i * rh}" width="${len}" height="${rh}" fill="${fill}" stroke="${shade(c, -.22)}" stroke-width=".7"/>`;
        for(let g = 0; g < 3; g++){
          const y = i * rh + rh * (.25 + g * .25) + (r() - .5) * 3;
          s += `<path d="M${x + 4} ${y.toFixed(1)}c${len * .25} ${(r() - .5) * 4} ${len * .5} ${(r() - .5) * 4} ${len - 8} ${(r() - .5) * 3}" stroke="${shade(c, -.14)}" stroke-width=".6" fill="none" opacity=".55"/>`;
        }
        x += len;
      }
    }
    return s;
  }
  function bricks(c, name, seed){
    const dark = lum(c) < .45, grout = dark ? shade(c, .22) : shade(c, -.16), r = rnd(seed);
    let s = `<rect width="240" height="180" fill="${grout}"/>`;
    if(/hex/i.test(name)){
      const R = 13, dx = R * 1.732, dy = R * 1.5;
      for(let row = -1; row < 15; row++) for(let col = -1; col < 11; col++){
        const cx = col * dx + (row % 2 ? dx / 2 : 0), cy = row * dy;
        const pts = [...Array(6)].map((_, k) => { const a = Math.PI / 6 + k * Math.PI / 3; return `${(cx + (R - 1.2) * Math.cos(a)).toFixed(1)},${(cy + (R - 1.2) * Math.sin(a)).toFixed(1)}`; }).join(' ');
        s += `<polygon points="${pts}" fill="${shade(c, (r() - .5) * .08)}"/>`;
      }
      return s;
    }
    const sq = /4×4/.test(name), long = /3×12/.test(name), zel = /2×8|Zellige/i.test(name);
    const bw = sq ? 34 : long ? 96 : zel ? 66 : 54, bh = sq ? 34 : zel ? 18 : 27, g = 2.6;
    for(let y = 0, row = 0; y < 180; y += bh, row++){
      for(let x = (row % 2 && !sq ? -bw / 2 : 0); x < 240; x += bw){
        const f = (r() - .5) * (zel ? .16 : .05);
        s += `<rect x="${x + g / 2}" y="${y + g / 2}" width="${bw - g}" height="${bh - g}" fill="${shade(c, f)}" ${zel ? 'rx="1.5"' : ''}/>`;
        s += `<rect x="${x + g / 2}" y="${y + g / 2}" width="${bw - g}" height="${(bh - g) * .45}" fill="url(#sheen)" opacity="${/Glossy|Bevel/.test(name) ? .9 : .35}"/>`;
      }
    }
    return s;
  }
  function slabs(c, name, seed, tw = 120, th = 60){
    const r = rnd(seed), grout = shade(c, -.12), vein = /Gold/.test(name) ? '#C6A46A' : lum(c) < .4 ? shade(c, .35) : shade(c, -.28);
    let s = `<rect width="240" height="180" fill="${grout}"/>`;
    for(let y = 0, row = 0; y < 180; y += th, row++) for(let x = (row % 2 ? -tw / 2 : 0); x < 240; x += tw){
      s += `<rect x="${x + 1}" y="${y + 1}" width="${tw - 2}" height="${th - 2}" fill="${shade(c, (r() - .5) * .05)}"/>`;
      if(!/Gray|Volume/.test(name)) for(let v = 0; v < 2; v++){
        const x0 = x + r() * tw, y0 = y + 2;
        s += `<path d="M${x0.toFixed(1)} ${y0}c${(r() * 30 - 15).toFixed(1)} ${(th * .3).toFixed(1)} ${(r() * 40 - 20).toFixed(1)} ${(th * .6).toFixed(1)} ${(r() * 50 - 25).toFixed(1)} ${th - 4}" stroke="${vein}" stroke-width="${(.5 + r() * .9).toFixed(2)}" fill="none" opacity=".6"/>`;
      }
    }
    return s;
  }

  /* ── products ── */
  const P = {
    floor: (p, v, sd) => v === 1 ? `<g transform="scale(1.9)">${planks(p.color, sd)}</g>`
      : v === 2 ? `<rect width="240" height="180" fill="#E8E2D7"/><rect y="58" width="240" height="6" fill="#F6F3EE"/><g transform="translate(0 64) scale(1 .64)"><g transform="skewX(-28) translate(40 0)">${planks(p.color, sd, 420)}</g></g><rect x="150" y="10" width="54" height="44" fill="#F5F3EE" stroke="#d6cfc2"/><path d="M177 10v44M150 32h54" stroke="#d6cfc2"/>`
      : planks(p.color, sd),
    tile: (p, v, sd) => v === 1 ? `<g transform="scale(1.8)">${bricks(p.color, p.name, sd)}</g>`
      : v === 2 ? `${bricks(p.color, p.name, sd)}<rect y="128" width="240" height="14" fill="#EFECE6"/><rect y="142" width="240" height="38" fill="#F3F1EC"/><path d="M0 142h240" stroke="#d2cbbf"/><rect x="110" y="96" width="20" height="28" rx="2" fill="#FBFBF9" stroke="#cfc8bb"/>`
      : bricks(p.color, p.name, sd),
    shower: (p, v, sd) => /Hex/.test(p.name) ? bricks(p.color, p.name, sd)
      : v === 1 ? `<g transform="scale(1.7)">${slabs(p.color, p.name, sd)}</g>` : /24×48/.test(p.name) ? slabs(p.color, p.name, sd, 160, 80) : slabs(p.color, p.name, sd),
    counter: (p, v, sd) => {
      const c = p.color, wood = /Butcher/.test(p.name), r = rnd(sd);
      const top = wood ? [...Array(9)].map((_, i) => `<path d="M${30 + i * 22} 52 L${15 + i * 22} 118" stroke="${shade(c, -.18)}" stroke-width="${8 + r() * 6}" opacity=".35"/>`).join('')
        : [...Array(4)].map(() => `<path d="M${20 + r() * 200} 50c${r() * 40 - 20} 20 ${r() * 50 - 25} 40 ${r() * 60 - 30} 68" stroke="${/Gold/.test(p.name) ? '#C9A86B' : lum(c) < .5 ? shade(c, .3) : shade(c, -.22)}" stroke-width="${.6 + r()}" fill="none" opacity=".7"/>`).join('');
      return `${BG}${shadow(120, 150, 110)}<defs><clipPath id="t"><polygon points="32,50 228,50 212,118 14,118"/></clipPath></defs>
        <polygon points="32,50 228,50 212,118 14,118" fill="${c}"/><g clip-path="url(#t)">${top}<rect width="240" height="180" fill="url(#sheen)" opacity=".5"/></g>
        <polygon points="14,118 212,118 212,134 14,134" fill="${shade(c, -.12)}"/><polygon points="212,118 228,50 228,66 212,134" fill="${shade(c, -.2)}"/>`;
    },
    cabinet: (p, v) => {
      const c = p.color, edge = shade(c, -.16), pull = lum(c) < .4 ? '#C9CACB' : '#8E9091';
      const door = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" stroke="${edge}"/><rect x="${x + 9}" y="${y + 10}" width="${w - 18}" height="${h - 20}" fill="${shade(c, -.05)}" stroke="${edge}" stroke-width=".8"/><rect x="${x + 9}" y="${y + 10}" width="${w - 18}" height="5" fill="${shade(c, -.1)}" opacity=".6"/>`;
      if(v === 2) return `${BG}<rect x="0" y="0" width="240" height="180" fill="#E9E4DA"/>${door(20, 10, 48, 62)}${door(68, 10, 48, 62)}${door(124, 10, 48, 62)}${door(172, 10, 48, 62)}<rect x="10" y="98" width="220" height="8" fill="#EFEDE8"/>${door(20, 106, 64, 62)}${door(84, 106, 64, 62)}${door(148, 106, 72, 62)}<rect x="0" y="168" width="240" height="12" fill="#3a3530" opacity=".55"/>`;
      return `${BG}${shadow(120, 166, 92)}<rect x="34" y="34" width="172" height="10" fill="#EFEDE8" stroke="#d8d2c6"/>${door(38, 44, 82, 112)}${door(120, 44, 82, 112)}
        <rect x="108" y="76" width="4" height="30" rx="2" fill="${pull}"/><rect x="128" y="76" width="4" height="30" rx="2" fill="${pull}"/><rect x="38" y="156" width="164" height="8" fill="${shade(c, -.35)}"/>`;
    },
    appliance: (p) => `${BG}<defs>${metal(p.color)}</defs>${shadow(120, 166, 100)}
      <rect x="26" y="18" width="84" height="146" rx="3" fill="url(#m)" stroke="${shade(p.color, -.3)}"/><path d="M26 66h84" stroke="${shade(p.color, -.35)}"/><rect x="98" y="28" width="4" height="30" rx="2" fill="${shade(p.color, -.4)}"/><rect x="98" y="74" width="4" height="50" rx="2" fill="${shade(p.color, -.4)}"/>
      <rect x="122" y="74" width="94" height="90" rx="2" fill="url(#m)" stroke="${shade(p.color, -.3)}"/><rect x="122" y="70" width="94" height="8" fill="#2c2c2c"/><rect x="132" y="98" width="74" height="40" rx="3" fill="#2f3133"/><rect x="132" y="98" width="74" height="12" fill="#fff" opacity=".08"/>
      ${[0, 1, 2, 3].map(i => `<circle cx="${136 + i * 22}" cy="88" r="3.5" fill="#3a3a3a"/>`).join('')}<rect x="122" y="18" width="94" height="40" rx="2" fill="url(#m)" stroke="${shade(p.color, -.3)}"/><rect x="132" y="26" width="58" height="24" rx="2" fill="#2f3133"/>`,
    paint: (p) => {
      const c = p.color;
      return `${BG}<path d="M14 54c40-18 120-10 210-22 4 14 2 34-4 44-70 6-150 2-206 16-4-12-4-26 0-38z" fill="${c}" opacity=".95"/><path d="M14 54c40-18 120-10 210-22" stroke="${shade(c, -.12)}" stroke-width="2" fill="none" opacity=".5"/>
        ${shadow(120, 162, 58)}<defs>${metal('#C9CBCC')}</defs><rect x="70" y="78" width="100" height="82" fill="url(#m)"/><ellipse cx="120" cy="78" rx="50" ry="10" fill="#B9BBBC"/><ellipse cx="120" cy="78" rx="42" ry="7" fill="#D7D8D9"/>
        <rect x="70" y="98" width="100" height="44" fill="#FBFAF7"/><rect x="80" y="104" width="34" height="32" fill="${c}" stroke="${shade(c, -.2)}" stroke-width=".6"/><path d="M122 110h38M122 118h30M122 126h34" stroke="#bdb7ac" stroke-width="2.4"/><ellipse cx="120" cy="160" rx="50" ry="6" fill="${shade('#C9CBCC', -.2)}"/>`;
    },
    lighting: (p) => {
      const c = p.color, wafer = /Wafer/.test(p.name), dome = /Dome/.test(p.name);
      return `${BG}<rect width="240" height="36" fill="#F3F0EA"/><path d="M0 36h240" stroke="#ddd5c7"/><defs>${metal(c)}</defs><circle cx="120" cy="110" r="90" fill="url(#glow)"/>
        ${wafer ? `<ellipse cx="120" cy="44" rx="70" ry="9" fill="#FBFBF9" stroke="#d5d1c8"/><ellipse cx="120" cy="47" rx="60" ry="5" fill="#fff"/>`
          : `<rect x="78" y="36" width="84" height="8" fill="url(#m)"/><path d="M${dome ? 76 : 70} 44h${dome ? 88 : 100}c0 ${dome ? 54 : 44}-${dome ? 88 : 100} ${dome ? 54 : 44}-${dome ? 88 : 100} 0z" fill="${dome ? c : '#FBFAF6'}" stroke="${shade(c, -.2)}" stroke-width=".8"/>${dome ? '' : `<path d="M74 52h92" stroke="url(#m)" stroke-width="4"/><ellipse cx="120" cy="70" rx="30" ry="10" fill="#fff" opacity=".8"/>`}`}`;
    },
    door: (p) => {
      const c = p.color, e = shade(c, -.14), n = p.name;
      const panels = /Flush/.test(n) ? [] : /1-Panel/.test(n) ? [[96, 30, 48, 120]] : /2-Panel/.test(n) ? [[96, 28, 48, 50], [96, 92, 48, 58]] : /3-Panel/.test(n) ? [[96, 26, 48, 36], [96, 70, 48, 36], [96, 114, 48, 38]]
        : /5-Panel/.test(n) ? [0, 1, 2, 3, 4].map(i => [96, 26 + i * 25.5, 48, 20]) : [[96, 26, 21, 34], [123, 26, 21, 34], [96, 68, 21, 40], [123, 68, 21, 40], [96, 116, 21, 36], [123, 116, 21, 36]];
      return `${BG}<rect x="72" y="8" width="96" height="164" fill="#F7F5F0" stroke="#d9d2c5"/>${shadow(120, 172, 50)}<rect x="82" y="16" width="76" height="156" fill="${c}" stroke="${e}"/>
        ${panels.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${shade(c, -.04)}" stroke="${e}"/>`).join('')}<circle cx="150" cy="98" r="5" fill="#A6A7A4"/><circle cx="150" cy="98" r="2.6" fill="#cfd0ce"/>`;
    },
    ceilingfan: (p) => {
      const c = p.color, blade = /White/.test(p.name) ? '#F2F1EE' : lum(c) < .35 ? '#5b4636' : '#CDBFAA';
      return `${BG}<circle cx="120" cy="90" r="96" fill="url(#glow)" opacity=".6"/>${[0, 72, 144, 216, 288].map(a => `<g transform="rotate(${a} 120 90)"><path d="M126 84 L208 72 Q218 90 208 106 L126 96z" fill="${blade}" stroke="${shade(blade, -.18)}"/><rect x="118" y="86" width="24" height="8" fill="${c}"/></g>`).join('')}
        <defs>${metal(c)}</defs><circle cx="120" cy="90" r="24" fill="url(#m)"/><circle cx="120" cy="90" r="15" fill="#FBF9F2" stroke="${shade(c, -.2)}"/>`;
    },
    blinds: (p) => {
      const c = p.color, cell = /Cellular/.test(p.name), paper = /Paper/.test(p.name);
      let s = `${BG}<rect x="40" y="16" width="160" height="150" fill="#DCE7EF"/><rect x="40" y="110" width="160" height="56" fill="#CFDCCB" opacity=".7"/><rect x="34" y="10" width="172" height="10" fill="#F7F5F0" stroke="#d6cfc2"/>`;
      for(let y = 22; y < 140; y += cell ? 12 : paper ? 9 : 10) s += cell ? `<path d="M42 ${y}h156v10c-26 3-130 3-156 0z" fill="${c}" stroke="${shade(c, -.12)}"/>` : `<rect x="42" y="${y}" width="156" height="${paper ? 7 : 7.5}" fill="${shade(c, paper ? (y % 18 ? -.03 : .02) : 0)}" stroke="${shade(c, -.14)}" stroke-width=".6"/>`;
      return s + `<rect x="34" y="166" width="172" height="8" fill="#F7F5F0" stroke="#d6cfc2"/>`;
    },
    detector: (p) => `${BG}${shadow(120, 150, 64)}<circle cx="120" cy="86" r="62" fill="#FBFBF9" stroke="#dcd7cd"/><circle cx="120" cy="86" r="46" fill="none" stroke="#e3dfd6"/>${[...Array(16)].map((_, i) => `<rect x="118" y="34" width="4" height="12" rx="2" fill="#e7e3da" transform="rotate(${i * 22.5} 120 86)"/>`).join('')}<circle cx="120" cy="86" r="18" fill="#F3F2EE" stroke="#d8d3c9"/><circle cx="146" cy="70" r="3" fill="#3FA35B"/>`,
    vanity: (p) => {
      const c = p.color, dbl = (p.size || 48) >= 48, e = shade(c, -.16);
      return `${BG}<rect x="${dbl ? 46 : 80}" y="8" width="${dbl ? 148 : 80}" height="44" fill="#E3E9EC" stroke="#cfd5d8"/>${shadow(120, 168, 96)}
        <rect x="${dbl ? 22 : 60}" y="74" width="${dbl ? 196 : 120}" height="10" fill="#F6F5F2" stroke="#dcd7cc"/>${(dbl ? [76, 164] : [120]).map(x => `<ellipse cx="${x}" cy="76" rx="20" ry="3.5" fill="#E6E3DC"/><path d="M${x} 74v-12h7" stroke="#A9AAA8" stroke-width="3" fill="none"/>`).join('')}
        <rect x="${dbl ? 26 : 64}" y="84" width="${dbl ? 188 : 112}" height="76" fill="${c}" stroke="${e}"/>${dbl ? `<rect x="34" y="92" width="80" height="60" fill="${shade(c, -.04)}" stroke="${e}"/><rect x="126" y="92" width="80" height="60" fill="${shade(c, -.04)}" stroke="${e}"/><rect x="112" y="108" width="3" height="22" fill="#9A9B99"/><rect x="125" y="108" width="3" height="22" fill="#9A9B99"/>`
          : `<rect x="72" y="92" width="96" height="60" fill="${shade(c, -.04)}" stroke="${e}"/><rect x="116" y="110" width="8" height="3" fill="#9A9B99"/>`}`;
    },
    toilet: (p) => `${BG}${shadow(124, 164, 66)}<rect x="132" y="30" width="56" height="62" rx="4" fill="#FCFCFA" stroke="#d6d2c9"/><rect x="128" y="24" width="64" height="10" rx="3" fill="#F7F7F4" stroke="#d6d2c9"/>
      <path d="M60 96h134c0 28-22 44-50 46l-4 20h-48l4-22c-22-6-36-22-36-44z" fill="#FCFCFA" stroke="#d6d2c9"/><path d="M58 92h136v6H58z" fill="#F2F1ED" stroke="#d6d2c9"/>`,
    exhaust: (p) => `${BG}<rect width="240" height="180" fill="#F3F0EA"/><rect x="62" y="32" width="116" height="116" rx="6" fill="#FBFBF9" stroke="#d3cfc6"/>${[...Array(8)].map((_, i) => `<rect x="74" y="${46 + i * 12}" width="92" height="5" rx="2.5" fill="#e3dfd7"/>`).join('')}`,
    hardware: (p) => `${BG}<rect x="0" y="0" width="150" height="180" fill="#F6F4EF" stroke="#ddd6c9"/><defs><radialGradient id="k" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="${shade(p.color, .5)}"/><stop offset=".6" stop-color="${p.color}"/><stop offset="1" stop-color="${shade(p.color, -.35)}"/></radialGradient></defs>
      ${shadow(128, 128, 30)}<circle cx="118" cy="92" r="30" fill="${shade(p.color, -.1)}"/><circle cx="124" cy="90" r="38" fill="url(#k)"/><ellipse cx="112" cy="78" rx="12" ry="7" fill="#fff" opacity=".35"/>`,
    storage: (p) => `${BG}<rect width="240" height="180" fill="#ECE7DD"/><path d="M20 40h200" stroke="#bdb7ac" stroke-width="3"/>${[...Array(25)].map((_, i) => `<path d="M${22 + i * 8} 40v14" stroke="#cfcac0" stroke-width="1.2"/>`).join('')}<path d="M20 56h200" stroke="#bdb7ac" stroke-width="2"/>
      ${[[40, '#B9C2C9'], [70, '#D8CDBE'], [100, '#9DA79A'], [130, '#E5DDD0'], [160, '#C6B7A6']].map(([x, c]) => `<path d="M${x} 58l-9 12h18z" fill="none" stroke="#8e8a83" stroke-width="1.4"/><path d="M${x - 14} 70h28l4 64h-36z" fill="${c}"/>`).join('')}<path d="M20 150h200" stroke="#bdb7ac" stroke-width="3"/>`
  };
  const CROP = {tile: 1, floor: 1, shower: 1};
  function product(p, v = 0){
    const key = p.sku + ':' + v;
    if(cache.has(key)) return cache.get(key);
    const sd = hs(p.sku);
    let body = (P[p.cat] || P.storage)(p, v, sd);
    if(CROP[p.cat]) body = `${BG}${body}<rect width="240" height="180" fill="url(#sheen)" opacity=".25"/>`;
    else if(!body.startsWith(BG)) body = BG + body;
    if(v === 1 && !CROP[p.cat]) body = `<g transform="translate(-60 -45) scale(1.5)">${body}</g>`;
    const out = uri(wrap(body));
    cache.set(key, out);
    return out;
  }

  /* ── site photos ── */
  const SCENES = {
    kitchen: `<rect width="240" height="180" fill="#E3DACB"/><rect x="92" y="18" width="56" height="42" fill="#DCE6EA" stroke="#f3efe6" stroke-width="4"/>
      <rect x="10" y="14" width="70" height="50" fill="#B98B5B" stroke="#8f6a42"/><path d="M45 14v50" stroke="#8f6a42"/><rect x="160" y="14" width="70" height="50" fill="#B98B5B" stroke="#8f6a42"/><path d="M195 14v50" stroke="#8f6a42"/>
      <rect x="0" y="96" width="240" height="8" fill="#CFC5B0"/><rect x="0" y="86" width="240" height="10" fill="#E2DCCF"/><rect x="0" y="104" width="240" height="46" fill="#B98B5B" stroke="#8f6a42"/><path d="M60 104v46M120 104v46M180 104v46" stroke="#8f6a42"/>
      <rect x="0" y="150" width="240" height="30" fill="#D6CDBB"/><path d="M0 162h240M0 172h240" stroke="#c9bfa9"/>`,
    living: `<rect width="240" height="180" fill="#E4DED3"/><rect x="30" y="30" width="56" height="70" fill="#DCE7EF" stroke="#f6f3ee" stroke-width="5"/><rect x="100" y="30" width="56" height="70" fill="#DCE7EF" stroke="#f6f3ee" stroke-width="5"/><rect x="170" y="30" width="56" height="70" fill="#DCE7EF" stroke="#f6f3ee" stroke-width="5"/>
      <rect y="122" width="240" height="58" fill="#BDB3A2"/><path d="M0 122h240" stroke="#f3efe7" stroke-width="5"/>${[...Array(30)].map((_, i) => `<circle cx="${(i * 37) % 240}" cy="${130 + (i * 13) % 46}" r="1" fill="#a99f8e"/>`).join('')}<circle cx="120" cy="8" r="7" fill="#f6f3ee" stroke="#d2cbbf"/>`,
    bath: `<rect width="240" height="180" fill="#E8E5DF"/>${[...Array(10)].map((_, i) => `<path d="M${i * 24} 0v110" stroke="#d6d2ca"/>`).join('')}${[...Array(5)].map((_, i) => `<path d="M0 ${i * 24}h240" stroke="#d6d2ca"/>`).join('')}
      <rect x="10" y="20" width="60" height="44" fill="#D7DEE1" stroke="#c4c9cc"/><rect y="110" width="240" height="70" fill="#D9D3C7"/><rect x="0" y="86" width="96" height="58" fill="#B98B5B" stroke="#8f6a42"/><rect x="0" y="80" width="100" height="8" fill="#EDE9E1"/>
      <path d="M120 92h120v38a12 12 0 0 1-12 12h-96a12 12 0 0 1-12-12z" fill="#F7F6F3" stroke="#d4d0c8"/>`,
    bed: `<rect width="240" height="180" fill="#E7E1D7"/><rect x="140" y="26" width="64" height="64" fill="#DCE7EF" stroke="#f6f3ee" stroke-width="5"/><rect x="20" y="30" width="80" height="102" fill="#EFEBE3" stroke="#d6cfc2"/><path d="M60 30v102M40 30v102M80 30v102" stroke="#ddd6ca"/>
      <rect y="132" width="240" height="48" fill="#C7BDAD"/><path d="M0 132h240" stroke="#f3efe7" stroke-width="5"/>`
  };
  function photo(scene, i = 0){
    const key = 'ph:' + scene + i;
    if(cache.has(key)) return cache.get(key);
    const s = 1 + (i % 3) * .18, tx = -((i * 37) % 60) * (s - 1) * 2.2, ty = -((i * 23) % 40) * (s - 1) * 1.6;
    const out = uri(wrap(`<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s})">${SCENES[scene] || SCENES.living}</g><rect width="240" height="180" fill="#f0c890" opacity=".08"/>
      <radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient><rect width="240" height="180" fill="url(#vg)"/>`));
    cache.set(key, out);
    return out;
  }

  /* ── mood swatches ── */
  function swatch(sw){
    const key = 'sw:' + sw.k;
    if(cache.has(key)) return cache.get(key);
    const c = sw.c;
    const body = sw.grain ? planks(c, 11) : sw.subway ? bricks(c, '3×6 Matte', 5) : sw.vein ? slabs(c, 'Quartz', 9, 240, 180)
      : sw.shaker ? P.cabinet({color: c}, 0).replace(BG, '') : sw.metal ? `<defs>${metal(c)}</defs><rect width="240" height="180" fill="url(#m)"/>${[...Array(40)].map((_, i) => `<path d="M0 ${i * 4.5}h240" stroke="#fff" stroke-width=".5" opacity=".18"/>`).join('')}`
      : `<rect width="240" height="180" fill="${c}"/><rect width="240" height="180" fill="url(#sheen)" opacity=".4"/>`;
    const out = uri(wrap(BG + body));
    cache.set(key, out);
    return out;
  }
  /* ── mood board: one placeholder picture of the look (warm minimal) ── */
  function mood(){
    if(cache.has('mood')) return cache.get('mood');
    const floor = `<g transform="translate(0 134)">${planks('#C4BAAA', 5, 240, 46)}</g>`;
    const body = `<defs><linearGradient id="wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#EEE9E1"/><stop offset="1" stop-color="#DDD6CA"/></linearGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF9EC" stop-opacity=".75"/><stop offset="1" stop-color="#FFF9EC" stop-opacity="0"/></linearGradient>
        <radialGradient id="vg" cx=".5" cy=".5" r=".78"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></radialGradient></defs>
      <rect width="240" height="180" fill="url(#wall)"/>
      <rect x="14" y="16" width="58" height="104" fill="#F7F5F0" stroke="#F2EEE6" stroke-width="5"/><rect x="18" y="20" width="50" height="96" fill="#E3EBEF"/><path d="M43 20v96M18 62h50" stroke="#F7F5F0" stroke-width="3"/>
      ${floor}<rect x="0" y="129" width="240" height="6" fill="#F4F2EC"/>
      <path d="M18 116h50l52 64H0z" fill="url(#beam)" opacity=".55"/>
      <path d="M96 0v30" stroke="#8d8e8a" stroke-width=".8"/><path d="M84 40a12 10 0 0 1 24 0z" fill="#A8A9A6"/><path d="M84 40h24" stroke="#8d8e8a"/><ellipse cx="96" cy="41" rx="6" ry="1.6" fill="#FFF6DA"/>
      <rect x="146" y="30" width="58" height="46" fill="#F6F3EE" stroke="#BDB3A3" stroke-width="2"/><rect x="152" y="36" width="46" height="34" fill="#E9E4DA"/><circle cx="166" cy="50" r="9" fill="#C9BFAE"/><path d="M152 70c12-14 22-6 30-14s12-4 16-2v16z" fill="#B5AC9D"/>
      <rect x="124" y="94" width="104" height="38" fill="#F4F2EC" stroke="#DAD5CB"/><path d="M150 94v38M176 94v38M202 94v38" stroke="#DAD5CB"/>
      ${[0, 1, 2, 3].map(i => `<rect x="${128 + i * 26}" y="98" width="18" height="30" fill="none" stroke="#E2DDD3"/><circle cx="${144 + i * 26 - (i % 2 ? 0 : 14)}" cy="113" r="1.4" fill="#A8A9A6"/>`).join('')}
      <path d="M130 132v6M222 132v6" stroke="#8d8e8a" stroke-width="2"/>
      <path d="M136 94c-1-8 1-14 4-18 3 4 5 10 4 18z" fill="#F7F6F3" stroke="#DAD5CB"/><path d="M140 76c-6-14-2-26 4-34M140 74c4-10 12-16 18-18M141 70c-8-4-12-12-12-18" stroke="#8C8A74" stroke-width=".9" fill="none"/>
      ${[[144, 44], [156, 57], [130, 53], [147, 52]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="1.6" fill="#9DA58B" transform="rotate(-30 ${x} ${y})"/>`).join('')}
      <rect x="196" y="86" width="22" height="3.5" fill="#C9BFAE"/><rect x="198" y="82.5" width="19" height="3.5" fill="#E9E4DA"/><rect x="197" y="89.5" width="21" height="4.5" fill="#A8A9A6"/>
      <ellipse cx="174" cy="92" rx="11" ry="3" fill="#E9E4DA" stroke="#DAD5CB"/>
      <path d="M92 122h22l-3 12h-16z" fill="#E9E4DA"/><path d="M103 122c-6-12-14-18-20-20M103 122c2-14 8-22 14-26M103 122c-1-10-2-18 0-26" stroke="#8C9A7A" stroke-width="1.1" fill="none"/>
      ${[[86, 104], [97, 99], [114, 98], [103, 96], [92, 110], [112, 108]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="2.2" fill="#93A07F" transform="rotate(${(x * 7) % 60 - 30} ${x} ${y})"/>`).join('')}
      <rect x="14" y="146" width="150" height="34" fill="#EDE9E1" opacity=".75"/><path d="M14 146h150" stroke="#DAD5CB"/>
      <rect width="240" height="180" fill="#f0c890" opacity=".07"/><rect width="240" height="180" fill="url(#vg)"/>`;
    const out = uri(wrap(body));
    cache.set('mood', out);
    return out;
  }
  return {product, photo, swatch, mood, shade};
})();
