// Version 2 art: the walk-around deck, kitchen stations, the chef, carried items,
// the top-down sea, new fish and dishes. Same sticker style as art.js.
(function () {
  const A = FR.art, D = FR.DATA, K = A.kit;
  const { tex, fs, lin, glow, ell, rr, poly, line, eye, drawFish, miniFish, plate, rnd, OUT } = K;
  const hex = n => '#' + n.toString(16).padStart(6, '0');

  const FISH = {
    crab: c => {
      [[-1], [1]].forEach(([s]) => {
        for (let i = 0; i < 3; i++) line(c, [[64 + s * 18, 40 + i * 5], [64 + s * (34 + i * 3), 34 + i * 10], [64 + s * (40 + i * 3), 44 + i * 9]], OUT, 4);
        line(c, [[64 + s * 16, 30], [64 + s * 32, 18]], OUT, 6); line(c, [[64 + s * 16, 30], [64 + s * 32, 18]], '#e8553a', 3);
        c.beginPath(); c.arc(64 + s * 38, 14, 10, s > 0 ? -2.4 : -0.7, s > 0 ? 2.2 : 3.9); c.closePath(); fs(c, '#ff7a5c');
      });
      ell(c, 64, 40, 26, 18); fs(c, lin(c, 0, 22, 0, 58, ['#ff7a5c', '#d9432a']));
      [[54, 34], [74, 34], [64, 44]].forEach(([x, y]) => { ell(c, x, y, 3, 2); fs(c, '#ffb09a', null); });
      [56, 72].forEach(x => { line(c, [[x, 26], [x, 18]], OUT, 2.5); eye(c, x, 15, 4.5); });
    },
    squid: c => {
      for (let i = 0; i < 6; i++) { const y = 22 + i * 5.5; c.beginPath(); c.moveTo(52, y); c.bezierCurveTo(34, y + (i % 2 ? 8 : -8), 22, y + (i % 2 ? -6 : 6), 8, y + (i - 2.5) * 3); c.strokeStyle = OUT; c.lineWidth = 6; c.stroke(); c.strokeStyle = '#f2a6c2'; c.lineWidth = 3; c.stroke(); }
      poly(c, [[96, 18], [118, 36], [96, 54]]); fs(c, '#d9749c');
      rr(c, 48, 20, 60, 32, 15); fs(c, lin(c, 0, 20, 0, 52, ['#e58fb0', '#f7c4d6']));
      [[70, 28], [84, 42], [94, 30]].forEach(([x, y]) => { ell(c, x, y, 2.5, 2.5); fs(c, '#c85a8a', null); });
      eye(c, 58, 34, 7);
    },
    ghost_shrimp: c => {
      glow(c, 64, 36, 44, 'rgba(200,230,255,0.4)');
      c.globalAlpha = 0.85;
      line(c, [[92, 30], [118, 14]], '#dff1ff', 2); line(c, [[92, 34], [120, 28]], '#dff1ff', 2);
      for (let i = 0; i < 5; i++) { const a = 0.5 + i * 0.5; ell(c, 64 - Math.cos(a) * 22 + 6, 40 - Math.sin(a) * 12, 13 - i, 10 - i * 0.8, -a * 0.6); fs(c, lin(c, 0, 18, 0, 56, ['#eaf6ff', '#a9d4f5']), OUT, 2.5); }
      poly(c, [[30, 46], [12, 40], [18, 50], [12, 60]]); fs(c, '#a9d4f5', OUT, 2.5);
      ell(c, 90, 32, 12, 9); fs(c, '#eaf6ff', OUT, 2.5);
      for (let i = 0; i < 4; i++) line(c, [[58 + i * 8, 48], [56 + i * 8, 58]], OUT, 2);
      c.globalAlpha = 1;
      eye(c, 94, 30, 4);
    },
    old_whiskers: c => drawFish(c, {
      L: 104, H: 54, tail: 16, dorsal: 8, top: '#55664a', belly: '#d8d9b4', fin: '#3f4d36', eye: 6,
      pattern: (c, cx, cy, L, H) => { for (let i = 0; i < 9; i++) { ell(c, cx - 44 + i * 11, cy - 10 + (i % 3) * 6, 4, 3); fs(c, 'rgba(40,50,30,0.5)', null); } line(c, [[cx - 20, cy - 16], [cx - 4, cy - 6]], '#c9d0b0', 2.5); },
      after: (c, cx, cy, L) => {
        const hx = cx + L / 2;
        c.strokeStyle = OUT; c.lineWidth = 2.5;
        [[-4, 4, 12, -18], [-4, 6, 16, 20], [-10, 8, 6, 26], [-8, 2, 4, -22]].forEach(([sx, sy, ex, ey]) => { c.beginPath(); c.moveTo(hx + sx, cy + sy); c.quadraticCurveTo(hx + ex, cy + sy + ey * 0.2, hx + ex * 0.9, cy + ey); c.stroke(); });
        rr(c, hx - 30, cy + 10, 26, 7, 3); fs(c, '#3f4d36', OUT, 2);
      }
    })
  };

  const DISH = {
    fried_calamari: c => { plate(c); for (let i = 0; i < 5; i++) { ell(c, 20 + (i % 3) * 11 + (i > 2 ? 6 : 0), 33 + (i > 2 ? 7 : 0), 6, 4.5); fs(c, null, OUT, 6); fs(c, null, '#f0b860', 3.5); } poly(c, [[44, 42], [54, 38], [52, 47]]); fs(c, '#ffe14d', OUT, 2); },
    crab_cakes: c => { plate(c); [[24, 34], [38, 33], [31, 41]].forEach(([x, y]) => { ell(c, x, y, 8, 5.5); fs(c, '#d9903c', OUT, 2); ell(c, x - 2, y - 1.5, 3, 1.5); fs(c, '#f2c078', null); }); ell(c, 47, 42, 3.5, 3.5); fs(c, '#2f9e5b', null); },
    shrimp_skewers: c => { plate(c); [[30], [38]].forEach(([y]) => { line(c, [[12, y + 2], [52, y - 2]], '#8a5a34', 2.5); [18, 28, 38].forEach(x => { c.beginPath(); c.arc(x + 4, y, 5, 0.6, 5.2); c.strokeStyle = OUT; c.lineWidth = 6; c.stroke(); c.strokeStyle = '#cfe8ff'; c.lineWidth = 3.5; c.stroke(); }); }); },
    whiskers_gumbo: c => {
      glow(c, 32, 34, 32, 'rgba(255,170,80,0.5)');
      ell(c, 32, 48, 24, 8); fs(c, 'rgba(0,0,0,0.18)', null);
      c.beginPath(); c.moveTo(6, 32); c.quadraticCurveTo(10, 58, 32, 58); c.quadraticCurveTo(54, 58, 58, 32); c.closePath(); fs(c, '#7a2e2e');
      ell(c, 32, 32, 26, 10); fs(c, '#c9622a');
      [[22, 31, '#ffffff'], [34, 34, '#2f9e5b'], [42, 30, '#ffe07a'], [28, 35, '#55664a']].forEach(([x, y, col]) => { ell(c, x, y, 4, 2.5); fs(c, col, OUT, 1.5); });
      [[26, 0], [38, -2]].forEach(([x, dy]) => { c.beginPath(); c.moveTo(x, 20 + dy); c.quadraticCurveTo(x - 5, 14 + dy, x, 9 + dy); c.quadraticCurveTo(x + 4, 5 + dy, x, 2 + dy); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2.5; c.stroke(); });
    }
  };

  // ---------- the chef (you) ----------
  function drawChef(c) {
    ell(c, 24, 58, 14, 5); fs(c, 'rgba(0,0,0,0.25)', null);
    rr(c, 11, 34, 26, 24, 9); fs(c, '#ffffff');
    line(c, [[24, 36], [24, 56]], '#c9d3da', 2); [42, 50].forEach(y => { ell(c, 20, y, 1.6, 1.6); fs(c, OUT, null); });
    poly(c, [[19, 34], [24, 40], [29, 34]]); fs(c, '#e8344e', OUT, 2);
    ell(c, 24, 26, 12, 12); fs(c, '#f0c39a');
    [20, 28].forEach(x => { ell(c, x, 26, 1.8, 2.3); fs(c, OUT, null); });
    c.beginPath(); c.arc(24, 29, 4, 0.3, Math.PI - 0.3); c.strokeStyle = OUT; c.lineWidth = 1.8; c.stroke();
    [17, 31].forEach(x => { ell(c, x, 30, 2.4, 1.6); fs(c, 'rgba(255,110,130,0.5)', null); });
    rr(c, 13, 10, 22, 8, 2); fs(c, '#ffffff');
    [[16, 8, 7], [24, 5, 8], [32, 8, 7]].forEach(([x, y, r]) => { ell(c, x, y, r, r); fs(c, '#ffffff'); });
    rr(c, 14, 8, 20, 8, 3); fs(c, '#ffffff', null);
  }

  // ---------- the big walk-around deck ----------
  function drawBigDeck(c, w, h, th, tier) {
    const col = hex(th.deck), trim = hex(th.trim);
    rr(c, 5, 5, w - 10, h - 10, 34); c.save(); c.clip();
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 36) {
      c.fillStyle = `rgba(43,33,64,${(y / 36) % 2 ? 0.07 : 0})`; c.fillRect(0, y, w, 36);
      line(c, [[0, y], [w, y]], 'rgba(43,33,64,0.28)', 2);
      const off = ((y / 36) % 3) * 100;
      for (let x = off; x < w; x += 230) { line(c, [[x, y], [x, y + 36]], 'rgba(43,33,64,0.28)', 2); [9, 27].forEach(d => { ell(c, x + 6, y + d, 1.6, 1.6); fs(c, 'rgba(43,33,64,0.4)', null); }); }
    }
    if (tier === 0) {
      // a patched-up raft: mismatched boards and rope
      [[150, 140, 90, 40], [430, 400, 110, 36], [300, 250, 70, 44], [90, 430, 100, 36]].forEach(([x, y, pw, ph]) => { rr(c, x, y, pw, ph, 3); fs(c, 'rgba(120,80,40,0.45)', 'rgba(43,33,64,0.5)', 2); [[x + 6, y + 6], [x + pw - 6, y + 6], [x + 6, y + ph - 6], [x + pw - 6, y + ph - 6]].forEach(([nx, ny]) => { ell(c, nx, ny, 2, 2); fs(c, OUT, null); }); });
    }
    if (tier === 2) {
      // a floating palace: a carpet runner with gold trim through the dining room
      rr(c, 110, 120, 420, 400, 16); fs(c, 'rgba(179,38,43,0.5)', '#ffd23c', 4);
      rr(c, 124, 134, 392, 372, 10); fs(c, null, 'rgba(255,210,60,0.6)', 2);
    }
    // kitchen floor: checker tiles
    c.save(); rr(c, 580, 14, 330, 512, 14); c.clip();
    for (let y = 14; y < 530; y += 30) for (let x = 580; x < 910; x += 30) { c.fillStyle = (Math.round((x + y - 4) / 30)) % 2 ? '#e9eef2' : '#b9c7d2'; c.fillRect(x, y, 30, 30); }
    c.fillStyle = 'rgba(43,33,64,0.12)'; c.fillRect(580, 14, 330, 512);
    c.restore();
    rr(c, 580, 14, 330, 512, 14); fs(c, null, OUT, 3);
    c.restore();
    rr(c, 5, 5, w - 10, h - 10, 34); c.strokeStyle = OUT; c.lineWidth = 10; c.stroke(); c.strokeStyle = tier === 2 ? '#ffd23c' : trim; c.lineWidth = 6; c.stroke();
    for (let x = 50; x < w; x += 118) [7, h - 7].forEach(y => { ell(c, x, y, 7, 7); fs(c, '#d9b06a', OUT, 2); });
    // the gap in the rail where customers board
    c.fillStyle = col; c.fillRect(0, 196, 14, 150);
    line(c, [[2, 196], [14, 196]], OUT, 4); line(c, [[2, 346], [14, 346]], OUT, 4);
  }

  // ---------- kitchen stations (76 x 60, seen from the front-top) ----------
  function counter(c, top) {
    rr(c, 3, 8, 70, 50, 8); fs(c, lin(c, 0, 8, 0, 58, ['#8a5a34', '#5b3a24']));
    rr(c, 3, 4, 70, 36, 8); fs(c, top || '#c9d3da');
  }
  const ST = {
    st_tank: c => {
      rr(c, 3, 4, 70, 54, 8); fs(c, lin(c, 0, 4, 0, 58, ['#7fd4f5', '#2580bd']));
      line(c, [[8, 16], [68, 16]], 'rgba(255,255,255,0.7)', 3);
      miniFish(c, 28, 32, 0.8, '#b8c7d6', 0); miniFish(c, 50, 44, 0.7, '#7dffb0', 3.14);
      [[18, 46], [58, 26], [40, 22]].forEach(([x, y]) => { ell(c, x, y, 2.5, 2.5); fs(c, null, 'rgba(255,255,255,0.8)', 1.2); });
      rr(c, 3, 4, 70, 54, 8); fs(c, null, OUT, 3.5);
    },
    st_pantry: c => {
      rr(c, 3, 4, 70, 54, 6); fs(c, lin(c, 0, 4, 0, 58, ['#b9824a', '#8a5a34']));
      [22, 40].forEach(y => line(c, [[6, y], [70, y]], OUT, 3));
      [[14, 13, '#ffcf5c'], [30, 13, '#ffffff'], [48, 13, '#2f9e5b'], [62, 13, '#ff7a3c'], [20, 31, '#ffffff'], [40, 31, '#ffcf5c'], [58, 31, '#2f9e5b'], [16, 49, '#ff7a3c'], [36, 49, '#2f9e5b'], [56, 49, '#ffffff']].forEach(([x, y, col]) => { rr(c, x - 6, y - 6, 12, 12, 3); fs(c, col, OUT, 1.8); });
    },
    st_board: c => { counter(c, '#e9eef2'); rr(c, 14, 9, 48, 26, 5); fs(c, lin(c, 0, 9, 0, 35, ['#d9a86a', '#b9824a']), OUT, 2.5); ell(c, 56, 14, 2, 2); fs(c, OUT, null); },
    st_grill: c => { counter(c, '#3a4654'); rr(c, 10, 8, 56, 28, 5); fs(c, '#1e2630', OUT, 2.5); for (let x = 16; x < 64; x += 7) line(c, [[x, 10], [x, 34]], '#ff8a3c', 2); [18, 38, 58].forEach(x => { ell(c, x, 48, 3, 3); fs(c, '#ffe9a8', OUT, 1.5); }); },
    st_fry: c => { counter(c, '#3a4654'); rr(c, 12, 7, 52, 30, 8); fs(c, '#8a97a5', OUT, 2.5); rr(c, 17, 11, 42, 22, 6); fs(c, lin(c, 0, 11, 0, 33, ['#ffd98a', '#e0a020']), OUT, 2); [[26, 18], [40, 24], [50, 17]].forEach(([x, y]) => { ell(c, x, y, 2, 2); fs(c, 'rgba(255,255,255,0.8)', null); }); line(c, [[64, 22], [74, 22]], OUT, 5); },
    st_pot: c => { counter(c, '#3a4654'); ell(c, 38, 24, 24, 13); fs(c, '#56687a'); ell(c, 38, 21, 20, 9); fs(c, '#3d6fb5', OUT, 2); line(c, [[12, 24], [6, 24]], OUT, 5); line(c, [[64, 24], [70, 24]], OUT, 5); [18, 38, 58].forEach(x => { ell(c, x, 48, 3, 3); fs(c, '#ffe9a8', OUT, 1.5); }); },
    st_sink: c => { counter(c, '#c9d3da'); rr(c, 12, 8, 44, 28, 6); fs(c, lin(c, 0, 8, 0, 36, ['#9fdcf5', '#5fb4e0']), OUT, 2.5); line(c, [[64, 30], [64, 14], [52, 14]], OUT, 6); line(c, [[64, 30], [64, 14], [52, 14]], '#e9eef2', 3); [[22, 18], [34, 26], [44, 16]].forEach(([x, y]) => { ell(c, x, y, 3, 3); fs(c, 'rgba(255,255,255,0.7)', '#ffffff', 1); }); },
    st_trash: c => { ell(c, 38, 52, 22, 6); fs(c, 'rgba(0,0,0,0.25)', null); poly(c, [[18, 16], [58, 16], [54, 54], [22, 54]]); fs(c, '#6b7a8a'); [30, 38, 46].forEach(x => line(c, [[x, 22], [x, 48]], 'rgba(43,33,64,0.5)', 2.5)); rr(c, 14, 8, 48, 10, 4); fs(c, '#8a97a5'); rr(c, 32, 3, 12, 6, 2); fs(c, '#8a97a5', OUT, 2); },
    st_rod: c => { ell(c, 38, 52, 20, 6); fs(c, 'rgba(0,0,0,0.25)', null); rr(c, 24, 34, 28, 20, 5); fs(c, '#8a5a34'); line(c, [[38, 40], [62, 4]], OUT, 6); line(c, [[38, 40], [62, 4]], '#b9824a', 3); line(c, [[62, 4], [66, 24]], '#ffffff', 1.5); ell(c, 66, 27, 4, 4); fs(c, '#e8344e', OUT, 1.5); ell(c, 44, 36, 5, 5); fs(c, '#c9d3da', OUT, 2); }
  };

  // ---------- small things you carry ----------
  const ITEM = {
    it_tortilla: c => { ell(c, 20, 22, 15, 12); fs(c, '#ffcf5c'); [[14, 18], [24, 24], [22, 15]].forEach(([x, y]) => { ell(c, x, y, 2, 1.5); fs(c, '#d9a030', null); }); },
    it_rice: c => { c.beginPath(); c.moveTo(6, 20); c.quadraticCurveTo(8, 36, 20, 36); c.quadraticCurveTo(32, 36, 34, 20); c.closePath(); fs(c, '#3d6fb5'); c.beginPath(); c.arc(20, 20, 13, Math.PI, 0); c.closePath(); fs(c, '#ffffff'); },
    it_kelp: c => { [[12, -0.3], [20, 0], [28, 0.3]].forEach(([x, r]) => { c.save(); c.translate(x, 34); c.rotate(r); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-8, -10, 8, -18, 0, -28); c.strokeStyle = OUT; c.lineWidth = 9; c.stroke(); c.strokeStyle = '#2f9e5b'; c.lineWidth = 5; c.stroke(); c.restore(); }); },
    it_veggies: c => { poly(c, [[10, 14], [30, 20], [12, 34]]); fs(c, '#ff7a3c'); line(c, [[10, 14], [5, 8]], '#2f9e5b', 3); ell(c, 28, 28, 8, 8); fs(c, '#e8344e'); line(c, [[28, 20], [30, 15]], '#2f9e5b', 3); },
    plate_dirty: c => { ell(c, 20, 23, 17, 12); fs(c, 'rgba(0,0,0,0.2)', null); ell(c, 20, 21, 17, 12); fs(c, '#e9e2d0'); ell(c, 20, 20, 11, 7); fs(c, '#d9cfb4', '#b8ad8a', 1.5); [[14, 19, '#8a5a34'], [24, 22, '#c98a00'], [20, 16, '#6b4a2f']].forEach(([x, y, col]) => { ell(c, x, y, 3, 2); fs(c, col, null); }); },
    plate_clean: c => { ell(c, 20, 23, 17, 12); fs(c, 'rgba(0,0,0,0.2)', null); ell(c, 20, 21, 17, 12); fs(c, '#ffffff'); ell(c, 20, 20, 11, 7); fs(c, '#eef2f5', '#c9d3da', 1.5); },
    coin: c => { glow(c, 20, 20, 20, 'rgba(255,220,100,0.8)'); ell(c, 20, 21, 12, 12); fs(c, '#e0a020'); ell(c, 20, 19, 12, 12); fs(c, '#ffd23c'); line(c, [[20, 12], [20, 26]], '#b9790a', 2.5); c.beginPath(); c.arc(20, 16, 3.5, 3.6, 1.4, true); c.arc(20, 22, 3.5, 4.6, 1.4); c.strokeStyle = '#b9790a'; c.lineWidth = 2.2; c.stroke(); },
    bell: c => { glow(c, 20, 20, 20, 'rgba(255,255,255,0.7)'); c.beginPath(); c.moveTo(8, 28); c.quadraticCurveTo(8, 8, 20, 8); c.quadraticCurveTo(32, 8, 32, 28); c.closePath(); fs(c, '#ffd23c'); rr(c, 5, 27, 30, 5, 2); fs(c, '#e0a020'); ell(c, 20, 6, 3, 3); fs(c, '#e0a020', OUT, 2); },
    prepbowl: c => { ell(c, 20, 30, 15, 5); fs(c, 'rgba(0,0,0,0.2)', null); c.beginPath(); c.moveTo(5, 18); c.quadraticCurveTo(7, 34, 20, 34); c.quadraticCurveTo(33, 34, 35, 18); c.closePath(); fs(c, '#c9d3da'); ell(c, 20, 18, 15, 6); fs(c, '#eef2f5'); }
  };

  // ---------- gear and bait icons (40 x 40) ----------
  const GEAR = {
    g_light: c => { line(c, [[8, 34], [32, 6]], OUT, 5); line(c, [[8, 34], [32, 6]], '#d9a86a', 2.5); line(c, [[32, 6], [34, 24]], '#ffffff', 1.5); ell(c, 34, 27, 3, 3); fs(c, '#e8344e', OUT, 1.5); },
    g_heavy: c => { line(c, [[6, 35], [33, 5]], OUT, 8); line(c, [[6, 35], [33, 5]], '#8a5a34', 5); ell(c, 14, 27, 5, 5); fs(c, '#c9d3da', OUT, 2); line(c, [[33, 5], [35, 26]], '#ffffff', 2); poly(c, [[31, 26], [39, 26], [35, 34]]); fs(c, '#56687a', OUT, 1.5); },
    g_net: c => { line(c, [[6, 36], [20, 22]], OUT, 6); line(c, [[6, 36], [20, 22]], '#8a5a34', 3); ell(c, 26, 15, 11, 11); c.save(); c.clip(); for (let i = -40; i < 40; i += 6) { line(c, [[i, 0], [i + 40, 40]], 'rgba(255,255,255,0.7)', 1.2); line(c, [[i + 40, 0], [i, 40]], 'rgba(255,255,255,0.7)', 1.2); } c.restore(); ell(c, 26, 15, 11, 11); fs(c, null, OUT, 5); fs(c, null, '#ffd98a', 2.5); },
    g_harpoon: c => { line(c, [[5, 35], [30, 10]], OUT, 6); line(c, [[5, 35], [30, 10]], '#56687a', 3); poly(c, [[36, 4], [34, 18], [28, 14], [22, 12], [26, 6]]); fs(c, '#e9eef2', OUT, 2); },
    g_trap: c => { rr(c, 6, 12, 28, 22, 4); fs(c, 'rgba(217,168,106,0.4)', OUT, 3); for (let x = 12; x < 34; x += 6) line(c, [[x, 12], [x, 34]], '#b9824a', 2); line(c, [[6, 23], [34, 23]], '#b9824a', 2); line(c, [[20, 12], [20, 4]], OUT, 2); ell(c, 20, 4, 3, 3); fs(c, '#ff7a3c', OUT, 1.5); },
    b_worms: c => { c.beginPath(); c.moveTo(8, 28); c.bezierCurveTo(14, 8, 24, 34, 32, 12); c.strokeStyle = OUT; c.lineWidth = 9; c.stroke(); c.strokeStyle = '#e58f8f'; c.lineWidth = 5; c.stroke(); },
    b_shrimp: c => { c.beginPath(); c.arc(20, 20, 10, 0.8, 5.6); c.strokeStyle = OUT; c.lineWidth = 10; c.stroke(); c.strokeStyle = '#ff9a7a'; c.lineWidth = 6; c.stroke(); ell(c, 27, 12, 1.5, 1.5); fs(c, OUT, null); },
    b_glow: c => { glow(c, 20, 20, 20, 'rgba(125,255,176,0.9)'); rr(c, 12, 14, 16, 20, 5); fs(c, '#7dffb0'); rr(c, 14, 8, 12, 7, 2); fs(c, '#b9824a'); },
    b_gold: c => { glow(c, 20, 20, 20, 'rgba(255,220,100,0.9)'); [[14, 24], [24, 26], [20, 16], [28, 17], [12, 15]].forEach(([x, y]) => { poly(c, [[x, y - 5], [x + 5, y], [x, y + 5], [x - 5, y]]); fs(c, '#ffd23c', OUT, 1.8); }); },
    b_none: c => { ell(c, 20, 20, 12, 12); fs(c, null, '#8a97a5', 3); line(c, [[11, 29], [29, 11]], '#8a97a5', 3); }
  };

  // ---------- the top-down sea ----------
  function drawSeaTop(c, w, h, area) {
    const coral = area === 'coral';
    c.fillStyle = lin(c, 0, 0, w, h, coral ? ['#3fd0c0', '#1a9aa0', '#12708a'] : ['#3aa3dc', '#2580bd', '#17599a']);
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { const x = rnd(0, w), y = rnd(60, h); glow(c, x, y, rnd(60, 140), 'rgba(255,255,255,0.07)'); }
    for (let i = 0; i < 12; i++) { const x = rnd(0, w), y = rnd(60, h); glow(c, x, y, rnd(50, 120), 'rgba(8,30,70,0.12)'); }
    for (let i = 0; i < 110; i++) { const x = rnd(0, w), y = rnd(40, h), l = rnd(14, 36); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 5, x + l, y); c.strokeStyle = `rgba(255,255,255,${rnd(0.08, 0.22)})`; c.lineWidth = 2.5; c.stroke(); }
    // rocks / reef around the edge
    [[70, 110], [900, 150], [860, 540], [60, 520], [470, 70]].forEach(([x, y]) => {
      ell(c, x, y, rnd(24, 38), rnd(16, 24)); fs(c, 'rgba(255,255,255,0.25)', null);
      const n = 3 + Math.floor(rnd(0, 2));
      for (let k = 0; k < n; k++) { ell(c, x + rnd(-18, 18), y + rnd(-8, 8), rnd(10, 18), rnd(8, 13)); fs(c, coral ? ['#ff7fa0', '#ffb347', '#c59bff'][k % 3] : ['#7d8a96', '#96a3ae', '#6b7783'][k % 3]); }
    });
  }
  function drawBoatTop(c, th) {
    const hull = hex(th.hull), trim = hex(th.trim), deck = hex(th.deck);
    c.beginPath(); c.moveTo(32, 2); c.quadraticCurveTo(60, 30, 56, 92); c.quadraticCurveTo(32, 106, 8, 92); c.quadraticCurveTo(4, 30, 32, 2); c.closePath(); fs(c, hull);
    c.beginPath(); c.moveTo(32, 12); c.quadraticCurveTo(52, 34, 49, 88); c.quadraticCurveTo(32, 97, 15, 88); c.quadraticCurveTo(12, 34, 32, 12); c.closePath(); fs(c, deck, OUT, 2);
    rr(c, 18, 46, 28, 34, 5); fs(c, '#ffffff');
    c.save(); rr(c, 18, 46, 28, 34, 5); c.clip(); for (let y = 46; y < 80; y += 10) { c.fillStyle = trim; c.fillRect(18, y, 28, 5); } c.restore(); rr(c, 18, 46, 28, 34, 5); fs(c, null);
    ell(c, 32, 30, 6, 6); fs(c, '#ffffff'); ell(c, 32, 30, 3, 3); fs(c, '#f0c39a', OUT, 1.5);
    line(c, [[36, 28], [48, 10]], OUT, 4); line(c, [[36, 28], [48, 10]], '#b9824a', 2);
  }

  A.fishIconScale = 0.3;

  const old = A.build;
  A.build = function (scene) {
    const first = !scene.textures.exists('fish_sardine');
    old(scene);
    if (!first) return;
    for (const id in FISH) tex(scene, 'fish_' + id, 128, 72, FISH[id]);
    for (const id in DISH) tex(scene, 'dish_' + id, 64, 64, DISH[id]);
    for (const id in ST) tex(scene, id, 76, 60, ST[id]);
    for (const id in ITEM) tex(scene, id, 40, 40, ITEM[id]);
    for (const id in GEAR) tex(scene, id, 40, 40, GEAR[id]);
    tex(scene, 'chef', 48, 64, drawChef);
    for (const id in D.themes) {
      for (let tier = 0; tier < 3; tier++) tex(scene, `bigdeck_${id}_${tier}`, 920, 540, (c, w, h) => drawBigDeck(c, w, h, D.themes[id], tier));
      tex(scene, 'boattop_' + id, 64, 108, c => drawBoatTop(c, D.themes[id]));
    }
    for (const id in D.areas) tex(scene, 'seatop_' + id, 960, 600, (c, w, h) => drawSeaTop(c, w, h, id));
    tex(scene, 'ramp', 70, 150, c => { rr(c, 2, 6, 66, 138, 6); fs(c, lin(c, 0, 0, 70, 0, ['#8a5a34', '#b9824a'])); for (let y = 20; y < 140; y += 16) line(c, [[4, y], [66, y]], 'rgba(43,33,64,0.35)', 2); });
    tex(scene, 'softglow', 128, 128, c => glow(c, 64, 64, 64, 'rgba(255,255,255,1)'));
    tex(scene, 'ring', 96, 96, c => { ell(c, 48, 48, 42, 42); fs(c, null, 'rgba(255,255,255,0.9)', 4); });
    tex(scene, 'gull', 36, 20, c => { c.beginPath(); c.moveTo(2, 12); c.quadraticCurveTo(10, 0, 18, 10); c.quadraticCurveTo(26, 0, 34, 12); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 2.5; c.stroke(); });
    tex(scene, 'gullsit', 30, 26, c => { ell(c, 14, 16, 10, 7); fs(c, '#ffffff'); ell(c, 21, 9, 5, 5); fs(c, '#ffffff'); poly(c, [[25, 9], [30, 11], [25, 12]]); fs(c, '#ffb347', OUT, 1.5); ell(c, 22, 8, 1, 1); fs(c, OUT, null); poly(c, [[4, 14], [0, 10], [8, 12]]); fs(c, '#c9d3da', OUT, 1.5); });
    tex(scene, 'trapbuoy', 30, 34, c => { ell(c, 15, 22, 11, 9); fs(c, '#ff7a3c'); line(c, [[5, 22], [25, 22]], '#ffffff', 3); line(c, [[15, 13], [15, 4]], OUT, 2.5); poly(c, [[15, 3], [25, 7], [15, 11]]); fs(c, '#ffe14d', OUT, 1.5); });
    tex(scene, 'rain', 6, 22, c => line(c, [[4, 1], [2, 21]], 'rgba(200,225,255,0.7)', 2));
    tex(scene, 'arrow', 44, 44, c => { rr(c, 3, 3, 38, 38, 9); fs(c, '#ffd23c'); poly(c, [[22, 9], [34, 24], [26, 24], [26, 35], [18, 35], [18, 24], [10, 24]]); fs(c, OUT, null); });
  };
})();
