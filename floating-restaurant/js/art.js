// All the art, painted in code onto canvas textures when the game boots.
// Style: chunky "sticker" shapes with a dark plum outline and warm lantern colors.
(function () {
  const A = FR.art = {};
  const D = FR.DATA;
  const OUT = '#2b2140';
  for (const id in D.fish) D.fish[id].id = id;

  // ---------- tiny drawing kit ----------
  function tex(scene, key, w, h, draw) {
    const t = scene.textures.createCanvas(key, w, h);
    const c = t.getContext();
    c.lineJoin = 'round'; c.lineCap = 'round';
    draw(c, w, h);
    t.refresh();
  }
  function fs(c, fill, stroke, lw) {
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke !== null) { c.strokeStyle = stroke || OUT; c.lineWidth = lw || 3; c.stroke(); }
  }
  function lin(c, x0, y0, x1, y1, stops) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    return g;
  }
  function glow(c, x, y, r, color) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function poly(c, pts) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); }
  function line(c, pts, color, lw) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.strokeStyle = color || OUT; c.lineWidth = lw || 2; c.stroke(); }
  function eye(c, x, y, r) {
    ell(c, x, y, r, r); fs(c, '#ffffff', OUT, 2);
    ell(c, x + r * 0.25, y, r * 0.55, r * 0.55); fs(c, OUT, null);
    ell(c, x + r * 0.5, y - r * 0.3, r * 0.22, r * 0.22); fs(c, '#ffffff', null);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- fish (128 x 72, facing right) ----------
  function fishBody(c, cx, cy, L, H) {
    c.beginPath();
    c.moveTo(cx + L / 2, cy);
    c.bezierCurveTo(cx + L * 0.3, cy - H * 0.72, cx - L * 0.25, cy - H * 0.6, cx - L / 2, cy);
    c.bezierCurveTo(cx - L * 0.25, cy + H * 0.6, cx + L * 0.3, cy + H * 0.72, cx + L / 2, cy);
    c.closePath();
  }
  function drawFish(c, o) {
    const cx = 70, cy = 36, L = o.L, H = o.H, bx = cx - L / 2, T = o.tail;
    // tail
    c.beginPath();
    c.moveTo(bx + 8, cy);
    c.quadraticCurveTo(bx - T * 0.4, cy - T * 0.25, bx - T, cy - T * 0.85);
    c.quadraticCurveTo(bx - T * (o.fork || 0.45), cy, bx - T, cy + T * 0.85);
    c.quadraticCurveTo(bx - T * 0.4, cy + T * 0.25, bx + 8, cy);
    c.closePath(); fs(c, o.fin);
    // dorsal + belly fins
    c.beginPath();
    c.moveTo(cx + L * 0.14, cy - H * 0.42);
    c.quadraticCurveTo(cx - L * 0.02, cy - H * 0.5 - o.dorsal, cx - L * 0.28, cy - H * 0.34);
    c.closePath(); fs(c, o.fin);
    poly(c, [[cx, cy + H * 0.42], [cx - L * 0.12, cy + H * 0.5 + o.dorsal * 0.5], [cx - L * 0.2, cy + H * 0.36]]); fs(c, o.fin);
    // body
    fishBody(c, cx, cy, L, H);
    fs(c, lin(c, 0, cy - H / 2, 0, cy + H / 2, [o.top, o.top, o.belly]));
    if (o.pattern) {
      c.save(); fishBody(c, cx, cy, L, H); c.clip(); o.pattern(c, cx, cy, L, H); c.restore();
      fishBody(c, cx, cy, L, H); fs(c, null);
    }
    // gill, side fin, face
    c.globalAlpha = 0.45; c.beginPath(); c.arc(cx + L * 0.2, cy, H * 0.3, -1, 1); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1;
    c.beginPath(); c.moveTo(cx + L * 0.1, cy + H * 0.06); c.quadraticCurveTo(cx - L * 0.04, cy + H * 0.42, cx - L * 0.12, cy + H * 0.1); c.closePath(); fs(c, o.fin, OUT, 2);
    eye(c, cx + L * 0.33, cy - H * 0.1, o.eye || 5);
    line(c, [[cx + L / 2 - 2, cy + 3], [cx + L / 2 - 10, cy + 5]], OUT, 2);
    if (o.after) o.after(c, cx, cy, L, H);
  }

  const FISH = {
    sardine: c => drawFish(c, {
      L: 84, H: 24, tail: 16, dorsal: 6, fork: 0.3, top: '#4f7fb3', belly: '#eef5fa', fin: '#7fa6cf', eye: 4,
      pattern: (c, cx, cy, L) => {
        line(c, [[cx - L / 2, cy - 2], [cx + L / 2, cy - 2]], '#d9f0ff', 3);
        for (let i = 0; i < 6; i++) { ell(c, cx - 30 + i * 9, cy - 7, 1.6, 1.6); fs(c, '#2b4d78', null); }
      }
    }),
    glowgill: c => {
      glow(c, 70, 36, 46, 'rgba(125,255,176,0.35)');
      drawFish(c, {
        L: 70, H: 38, tail: 18, dorsal: 10, top: '#1c5d6b', belly: '#2fb59a', fin: '#7dffb0', eye: 6,
        pattern: (c, cx, cy) => {
          [[-18, -4], [-6, 5], [6, -6], [-28, 4], [-12, -10]].forEach(([dx, dy]) => { glow(c, cx + dx, cy + dy, 9, 'rgba(200,255,225,0.95)'); });
          for (let i = 0; i < 3; i++) line(c, [[cx + 10 - i * 4, cy - 6], [cx + 8 - i * 4, cy + 8]], '#b8ffd9', 2);
        },
        after: (c, cx, cy, L, H) => {
          // angler lure
          c.beginPath(); c.moveTo(cx + L * 0.3, cy - H * 0.45); c.quadraticCurveTo(cx + L * 0.45, cy - H * 0.95, cx + L * 0.62, cy - H * 0.6);
          c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
          glow(c, cx + L * 0.62, cy - H * 0.6, 10, 'rgba(255,255,200,0.9)');
          ell(c, cx + L * 0.62, cy - H * 0.6, 4, 4); fs(c, '#fffbd0', OUT, 1.5);
        }
      });
    },
    thunder_eel: c => {
      const pts = [];
      for (let i = 0; i <= 20; i++) pts.push([12 + i * 4.6, 38 + Math.sin(i * 0.75) * 9 * (1 - i / 40)]);
      line(c, pts, OUT, 24); line(c, pts, '#f2c530', 18);
      line(c, pts.map(p => [p[0], p[1] + 5]), '#ffe98a', 5);
      // lightning stripes
      for (let i = 2; i < 18; i += 3) { const p = pts[i]; line(c, [[p[0] - 3, p[1] - 8], [p[0] + 2, p[1] - 1], [p[0] - 2, p[1] + 1], [p[0] + 3, p[1] + 8]], '#7a4a00', 2.5); }
      // tail fin + head
      poly(c, [[14, 38], [2, 26], [6, 38], [2, 52]]); fs(c, '#ffb300');
      ell(c, 106, 36, 15, 13); fs(c, '#f2c530');
      eye(c, 110, 32, 5);
      line(c, [[120, 40], [110, 43]], OUT, 2);
      // sparks
      [[30, 14], [62, 60], [88, 12]].forEach(([x, y]) => line(c, [[x - 5, y - 5], [x + 1, y - 1], [x - 2, y + 1], [x + 5, y + 6]], '#8fe9ff', 2.5));
    },
    bluefin_tuna: c => drawFish(c, {
      L: 100, H: 46, tail: 22, dorsal: 16, fork: 0.15, top: '#1d3f8a', belly: '#dfe8f2', fin: '#27468f', eye: 5,
      pattern: (c, cx, cy, L, H) => {
        line(c, [[cx - L / 2, cy + 3], [cx + L / 2, cy + 1]], '#8fb4e8', 2);
        for (let i = 0; i < 6; i++) { poly(c, [[cx - 44 + i * 7, cy - H * 0.3 + i], [cx - 41 + i * 7, cy - H * 0.3 - 6 + i], [cx - 38 + i * 7, cy - H * 0.3 + i]]); fs(c, '#ffd23c', null); }
      },
      after: (c, cx, cy, L, H) => { for (let i = 0; i < 5; i++) { poly(c, [[cx - 40 + i * 7, cy + H * 0.36 - i], [cx - 37 + i * 7, cy + H * 0.36 + 6 - i], [cx - 34 + i * 7, cy + H * 0.36 - i]]); fs(c, '#ffd23c', OUT, 1); } }
    }),
    dragon_koi: c => {
      glow(c, 66, 36, 50, 'rgba(255,200,90,0.35)');
      // flowing back fins
      c.beginPath(); c.moveTo(34, 36); c.bezierCurveTo(8, 6, 0, 30, 14, 34); c.bezierCurveTo(-2, 44, 6, 68, 34, 40); c.closePath(); fs(c, lin(c, 0, 0, 30, 0, ['#ffd23c', '#ff5b3c']));
      drawFish(c, {
        L: 92, H: 44, tail: 6, dorsal: 18, top: '#ff7a1f', belly: '#fff1d6', fin: '#ff5b3c', eye: 6,
        pattern: (c, cx, cy, L, H) => {
          ell(c, cx - 14, cy - 12, 16, 10); fs(c, '#ffffff', null);
          ell(c, cx + 12, cy + 10, 12, 8); fs(c, '#ffd23c', null);
          c.strokeStyle = 'rgba(122,40,0,0.45)'; c.lineWidth = 1.5;
          for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(cx - 40 + i * 9 + (r % 2) * 4, cy - 12 + r * 8, 5, 0.3, 2.8); c.stroke(); }
        },
        after: (c, cx, cy, L) => {
          const hx = cx + L / 2;
          // whiskers and antlers: this one is part dragon
          c.strokeStyle = OUT; c.lineWidth = 2;
          c.beginPath(); c.moveTo(hx - 6, cy + 6); c.quadraticCurveTo(hx + 8, cy + 10, hx + 6, cy + 24); c.stroke();
          c.beginPath(); c.moveTo(hx - 12, cy + 8); c.quadraticCurveTo(hx - 4, cy + 20, hx - 10, cy + 26); c.stroke();
          line(c, [[hx - 22, cy - 16], [hx - 18, cy - 30], [hx - 10, cy - 34]], '#ffd23c', 4);
          line(c, [[hx - 18, cy - 30], [hx - 24, cy - 36]], '#ffd23c', 4);
          [[20, 10], [104, 62], [50, 4]].forEach(([x, y]) => { line(c, [[x - 4, y], [x + 4, y]], '#fff6c2', 2); line(c, [[x, y - 4], [x, y + 4]], '#fff6c2', 2); });
        }
      });
    },
    coral_snapper: c => drawFish(c, {
      L: 80, H: 46, tail: 20, dorsal: 14, top: '#ff5f7e', belly: '#ffd7c9', fin: '#ff9a5c', eye: 6,
      pattern: (c, cx, cy, L, H) => { for (let i = 0; i < 5; i++) line(c, [[cx - 30 + i * 13, cy - H], [cx - 36 + i * 13, cy + H]], 'rgba(255,255,255,0.35)', 4); },
      after: (c, cx, cy, L, H) => { for (let i = 0; i < 5; i++) line(c, [[cx - 18 + i * 8, cy - H * 0.5], [cx - 20 + i * 8, cy - H * 0.5 - 9]], OUT, 2); }
    }),
    bubble_puffer: c => {
      glow(c, 66, 36, 44, 'rgba(197,155,255,0.35)');
      for (let a = 0; a < 14; a++) { const an = a / 14 * Math.PI * 2; line(c, [[66 + Math.cos(an) * 24, 36 + Math.sin(an) * 24], [66 + Math.cos(an) * 33, 36 + Math.sin(an) * 33]], OUT, 3); }
      poly(c, [[44, 36], [26, 24], [30, 36], [26, 48]]); fs(c, '#8e5fd6');
      ell(c, 66, 36, 26, 25); fs(c, lin(c, 0, 10, 0, 62, ['#a678f0', '#a678f0', '#f3e6ff']));
      [[56, 24], [72, 20], [62, 34], [50, 38]].forEach(([x, y]) => { ell(c, x, y, 3, 3); fs(c, '#7446c2', null); });
      eye(c, 78, 30, 7);
      ell(c, 90, 40, 4, 3); fs(c, '#ff8fab', OUT, 2);
      [[104, 20, 6], [114, 34, 4], [108, 50, 5]].forEach(([x, y, r]) => { ell(c, x, y, r, r); fs(c, 'rgba(255,255,255,0.35)', '#ffffff', 1.5); });
    }
  };

  // ---------- dishes (64 x 64) ----------
  function plate(c, rim) {
    ell(c, 32, 40, 29, 19); fs(c, 'rgba(0,0,0,0.18)', null);
    ell(c, 32, 37, 29, 19); fs(c, rim || '#ffffff');
    ell(c, 32, 36, 21, 13); fs(c, '#eef2f5', '#c9d3da', 1.5);
  }
  function miniFish(c, x, y, s, col, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s);
    poly(c, [[-14, 0], [-22, -7], [-22, 7]]); fs(c, col, OUT, 2);
    ell(c, 0, 0, 16, 7); fs(c, col, OUT, 2);
    ell(c, 9, -2, 1.6, 1.6); fs(c, OUT, null);
    c.restore();
  }
  const DISH = {
    grilled_sardine: c => {
      plate(c);
      miniFish(c, 30, 35, 1.15, '#c9a36a', -0.15);
      for (let i = 0; i < 4; i++) line(c, [[20 + i * 6, 29], [17 + i * 6, 40]], '#5b3a1a', 2);
      poly(c, [[44, 40], [54, 36], [52, 46]]); fs(c, '#ffe14d', OUT, 2);
    },
    glowgill_tacos: c => {
      plate(c);
      [[22, 0], [40, 2]].forEach(([x, dy]) => {
        c.beginPath(); c.arc(x, 40 + dy, 12, Math.PI, 0); c.closePath(); fs(c, '#ffcf5c', OUT, 2);
        c.beginPath(); c.arc(x, 39 + dy, 8, Math.PI, 0); c.closePath(); fs(c, '#7dffb0', null);
        [[-5, -3], [0, -5], [5, -2]].forEach(([a, b]) => { ell(c, x + a, 38 + dy + b, 2, 2); fs(c, '#ff5b5b', null); });
      });
    },
    kelp_wrap: c => {
      plate(c);
      [[22, 34], [36, 38], [46, 31]].forEach(([x, y]) => {
        rr(c, x - 7, y - 8, 14, 16, 5); fs(c, '#2f9e5b', OUT, 2);
        ell(c, x, y - 7, 6, 3.5); fs(c, '#ffffff', OUT, 1.5);
        ell(c, x, y - 7, 2, 1.5); fs(c, '#ff9a5c', null);
      });
    },
    thunder_eel_soup: c => {
      ell(c, 32, 48, 24, 8); fs(c, 'rgba(0,0,0,0.18)', null);
      c.beginPath(); c.moveTo(6, 32); c.quadraticCurveTo(10, 58, 32, 58); c.quadraticCurveTo(54, 58, 58, 32); c.closePath(); fs(c, '#3d6fb5');
      ell(c, 32, 32, 26, 10); fs(c, '#ffe07a');
      line(c, [[18, 32], [24, 29], [30, 34], [36, 29], [44, 33]], '#c98a00', 4);
      ell(c, 42, 34, 3, 2); fs(c, '#2f9e5b', null); ell(c, 22, 35, 3, 2); fs(c, '#ff7a3c', null);
      [[24, 0], [34, -3], [42, 1]].forEach(([x, dy]) => { c.beginPath(); c.moveTo(x, 20 + dy); c.quadraticCurveTo(x - 5, 14 + dy, x, 9 + dy); c.quadraticCurveTo(x + 4, 5 + dy, x, 2 + dy); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2.5; c.stroke(); });
    },
    tuna_sushi: c => {
      plate(c, '#2e3350');
      ell(c, 32, 36, 21, 13); fs(c, '#3b4266', null);
      [[20, 36], [33, 32], [45, 38]].forEach(([x, y]) => {
        rr(c, x - 7, y - 3, 14, 9, 4); fs(c, '#ffffff', OUT, 2);
        rr(c, x - 8, y - 8, 16, 8, 4); fs(c, '#e8344e', OUT, 2);
        line(c, [[x - 4, y - 6], [x + 3, y - 3]], '#ff9aa8', 1.5);
      });
    },
    seafood_platter: c => {
      ell(c, 32, 41, 30, 19); fs(c, 'rgba(0,0,0,0.18)', null);
      ell(c, 32, 38, 30, 19); fs(c, '#d8b06a');
      ell(c, 32, 37, 24, 14); fs(c, '#f3dca8', '#b98d45', 1.5);
      miniFish(c, 24, 32, 0.85, '#8fb4e8', -0.3);
      miniFish(c, 40, 34, 0.85, '#ff9a8a', 0.25);
      miniFish(c, 30, 43, 0.8, '#ffd23c', 0.05);
      ell(c, 48, 44, 4, 4); fs(c, '#ffe14d', OUT, 1.5);
      ell(c, 16, 42, 3, 3); fs(c, '#2f9e5b', null);
    },
    dragon_koi_feast: c => {
      glow(c, 32, 34, 32, 'rgba(255,210,90,0.6)');
      ell(c, 32, 41, 30, 19); fs(c, 'rgba(0,0,0,0.18)', null);
      ell(c, 32, 38, 30, 19); fs(c, lin(c, 0, 20, 0, 58, ['#ffe98a', '#e0a020']));
      ell(c, 32, 37, 23, 13); fs(c, '#fff6d6', '#c98a00', 1.5);
      c.beginPath(); c.arc(32, 36, 11, 0.4, 5.4); c.strokeStyle = OUT; c.lineWidth = 11; c.stroke();
      c.beginPath(); c.arc(32, 36, 11, 0.4, 5.4); c.strokeStyle = '#ff7a1f'; c.lineWidth = 7; c.stroke();
      c.beginPath(); c.arc(32, 36, 11, 1.2, 2.2); c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.stroke();
      ell(c, 42, 31, 1.6, 1.6); fs(c, OUT, null);
      [[12, 22], [52, 20], [54, 50]].forEach(([x, y]) => { line(c, [[x - 4, y], [x + 4, y]], '#ffffff', 2); line(c, [[x, y - 4], [x, y + 4]], '#ffffff', 2); });
    },
    live: c => {
      glow(c, 32, 34, 30, 'rgba(180,107,255,0.5)');
      line(c, [[40, 4], [40, 34]], '#ffffff', 2);
      c.beginPath(); c.arc(32, 34, 8, 0, Math.PI); c.strokeStyle = '#dfe6ea'; c.lineWidth = 4; c.stroke();
      miniFish(c, 26, 46, 1.1, '#7dffb0', -0.6);
      [[14, 18], [52, 22]].forEach(([x, y]) => { line(c, [[x - 5, y], [x + 5, y]], '#ffe14d', 2.5); line(c, [[x, y - 5], [x, y + 5]], '#ffe14d', 2.5); });
    }
  };

  // ---------- customers (64 x 68 busts): species head + role outfit ----------
  const SKIN = { human: '#f0c39a', mermaid: '#8fe0d0', seaking: '#6fa8dc', octofolk: '#b784e0' };
  function drawCustomer(c, sp, role, who) {
    const skin = SKIN[sp];
    // things that sit behind the head
    if (sp === 'mermaid') { c.beginPath(); c.moveTo(14, 26); c.bezierCurveTo(8, 50, 14, 58, 12, 64); c.lineTo(52, 64); c.bezierCurveTo(50, 58, 56, 50, 50, 26); c.closePath(); fs(c, who === 'marina' ? '#ffd23c' : '#ff8fab'); }
    if (sp === 'octofolk') [[-1, 0], [1, 0], [-1, 1], [1, 1]].forEach(([sx, row]) => {
      c.beginPath(); c.moveTo(32 + sx * 12, 30 + row * 6); c.bezierCurveTo(32 + sx * 30, 28 + row * 8, 32 + sx * 30, 50 + row * 4, 32 + sx * (20 + row * 4), 46 + row * 8);
      c.strokeStyle = OUT; c.lineWidth = 9; c.stroke(); c.strokeStyle = '#9a63cc'; c.lineWidth = 5; c.stroke();
    });
    // outfit
    const cloth = { sailor: '#f4f7fb', foodie: '#d9548f', pirate: '#3a2f4a' }[role];
    c.beginPath(); c.moveTo(8, 68); c.quadraticCurveTo(8, 45, 32, 45); c.quadraticCurveTo(56, 45, 56, 68); c.closePath(); fs(c, cloth);
    c.save(); c.clip();
    if (role === 'sailor') { for (let y = 50; y < 68; y += 6) line(c, [[6, y], [58, y]], '#2f5fb3', 3); }
    if (role === 'pirate') { line(c, [[10, 50], [54, 66]], '#b3262b', 6); [54, 62].forEach(y => { ell(c, 32, y, 2, 2); fs(c, '#ffd23c', null); }); }
    c.restore();
    if (role === 'foodie') { poly(c, [[32, 50], [22, 45], [22, 55]]); fs(c, '#ffe14d', OUT, 2); poly(c, [[32, 50], [42, 45], [42, 55]]); fs(c, '#ffe14d', OUT, 2); }
    if (role === 'sailor') { poly(c, [[24, 45], [32, 54], [40, 45]]); fs(c, '#2f5fb3', OUT, 2); }
    // ears / fins
    if (sp === 'human') { ell(c, 16, 30, 4, 5); fs(c, skin, OUT, 2); ell(c, 48, 30, 4, 5); fs(c, skin, OUT, 2); }
    if (sp === 'mermaid' || sp === 'seaking') [[-1], [1]].forEach(([sx]) => { poly(c, [[32 + sx * 13, 26], [32 + sx * 25, 20], [32 + sx * 22, 30], [32 + sx * 25, 37], [32 + sx * 13, 34]]); fs(c, sp === 'seaking' ? '#ffd23c' : '#4fc3b0', OUT, 2); });
    // head
    ell(c, 32, 29, sp === 'octofolk' ? 17 : 15, sp === 'octofolk' ? 17 : 15.5); fs(c, skin);
    if (sp === 'octofolk') [[22, 20], [41, 18], [44, 27]].forEach(([x, y]) => { ell(c, x, y, 2.5, 2.5); fs(c, '#8e5fd6', null); });
    // hair
    if (sp === 'human') {
      c.beginPath(); c.arc(32, 27, 15, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(40, 20, 32, 22); c.quadraticCurveTo(22, 20, 17, 27); c.closePath();
      fs(c, who === 'gus' ? '#d9dde2' : '#7a4a2a', OUT, 2);
    }
    if (sp === 'mermaid') { c.beginPath(); c.arc(32, 27, 15, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(36, 26, 26, 18); c.quadraticCurveTo(22, 24, 17, 27); c.closePath(); fs(c, who === 'marina' ? '#ffd23c' : '#ff8fab', OUT, 2); }
    // face
    [26, 38].forEach(x => { ell(c, x, 30, 2.3, 2.8); fs(c, OUT, null); ell(c, x + 0.8, 29, 0.8, 0.8); fs(c, '#ffffff', null); });
    [22, 42].forEach(x => { ell(c, x, 35, 3, 2); fs(c, 'rgba(255,110,130,0.45)', null); });
    c.beginPath(); c.arc(32, 34, 5, 0.25, Math.PI - 0.25); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
    if (sp === 'seaking' || who === 'gus') {
      c.beginPath(); c.moveTo(18, 34); c.quadraticCurveTo(20, 52, 32, 54); c.quadraticCurveTo(44, 52, 46, 34); c.quadraticCurveTo(38, 42, 32, 38); c.quadraticCurveTo(26, 42, 18, 34); c.closePath();
      fs(c, '#ffffff', OUT, 2);
    }
    if (role === 'pirate') { line(c, [[17, 22], [47, 30]], OUT, 2); ell(c, 38, 30, 4.5, 4.5); fs(c, OUT, null); }
    if (role === 'foodie') { ell(c, 26, 30, 5.5, 5.5); fs(c, 'rgba(255,255,255,0.25)', '#ffd23c', 2); line(c, [[21, 33], [19, 44]], '#ffd23c', 1.5); }
    if (who === 'marina') { ell(c, 46, 20, 5, 5); fs(c, '#ff8fab', OUT, 2); ell(c, 46, 20, 2, 2); fs(c, '#ffffff', null); }
    // hat
    if (role === 'sailor') {
      rr(c, 18, 6, 28, 10, 5); fs(c, '#ffffff');
      rr(c, 16, 13, 32, 6, 3); fs(c, '#2f5fb3');
    }
    if (role === 'foodie') {
      ell(c, 30, 12, 17, 8, -0.2); fs(c, '#e8344e');
      line(c, [[30, 5], [32, 1]], OUT, 3);
    }
    if (role === 'pirate') {
      c.beginPath(); c.moveTo(8, 17); c.quadraticCurveTo(20, 12, 22, 4); c.quadraticCurveTo(32, -2, 42, 4); c.quadraticCurveTo(44, 12, 56, 17); c.quadraticCurveTo(32, 22, 8, 17); c.closePath(); fs(c, '#2b2140');
      c.beginPath(); c.moveTo(10, 17); c.quadraticCurveTo(32, 21, 54, 17); c.strokeStyle = '#ffd23c'; c.lineWidth = 2; c.stroke();
      ell(c, 32, 10, 3.5, 3.5); fs(c, '#ffffff', null); ell(c, 30.8, 9.5, 1, 1); fs(c, OUT, null); ell(c, 33.2, 9.5, 1, 1); fs(c, OUT, null);
    }
  }
  A.customerKey = c => 'cust_' + (c.regular ? c.regular.id : c.species.id + '_' + c.role.id);

  // ---------- icons (28 x 28) ----------
  const ICON = {
    role_sailor: c => { ell(c, 14, 7, 3, 3); fs(c, null, '#ffffff', 2.5); line(c, [[14, 10], [14, 23]], '#ffffff', 2.5); line(c, [[9, 14], [19, 14]], '#ffffff', 2.5); c.beginPath(); c.arc(14, 15, 8, 0.2, Math.PI - 0.2); c.strokeStyle = '#ffffff'; c.lineWidth = 2.5; c.stroke(); },
    role_foodie: c => { [10, 14, 18].forEach(x => line(c, [[x, 5], [x, 12]], '#ffffff', 2)); line(c, [[10, 12], [18, 12]], '#ffffff', 2.5); line(c, [[14, 12], [14, 23]], '#ffffff', 3); },
    role_pirate: c => { ell(c, 14, 12, 8, 7); fs(c, '#ffffff', null); rr(c, 10, 16, 8, 6, 2); fs(c, '#ffffff', null); ell(c, 11, 12, 2.2, 2.5); fs(c, OUT, null); ell(c, 17, 12, 2.2, 2.5); fs(c, OUT, null); line(c, [[12.5, 18], [12.5, 21]], OUT, 1); line(c, [[15.5, 18], [15.5, 21]], OUT, 1); },
    sp_human: c => { ell(c, 14, 10, 4.5, 4.5); fs(c, OUT, null); c.beginPath(); c.arc(14, 24, 8, Math.PI, 0); c.closePath(); fs(c, OUT, null); },
    sp_mermaid: c => { c.beginPath(); c.moveTo(14, 5); c.quadraticCurveTo(20, 12, 14, 18); c.quadraticCurveTo(8, 12, 14, 5); fs(c, OUT, null); poly(c, [[14, 16], [6, 23], [14, 21], [22, 23]]); fs(c, OUT, null); },
    sp_seaking: c => { poly(c, [[6, 20], [5, 9], [10, 14], [14, 6], [18, 14], [23, 9], [22, 20]]); fs(c, OUT, null); },
    sp_octofolk: c => { c.beginPath(); c.arc(14, 12, 7, Math.PI, 0); c.lineTo(21, 15); c.lineTo(7, 15); c.closePath(); fs(c, OUT, null); [8, 12, 16, 20].forEach((x, i) => line(c, [[x, 15], [x + (i < 2 ? -2 : 2), 22]], OUT, 2.5)); }
  };

  // ---------- scenery ----------
  function drawCaptain(c, x, y) {
    rr(c, x - 9, y - 30, 18, 30, 6); fs(c, '#2f6f8f');
    line(c, [[x - 9, y - 18], [x + 9, y - 18]], '#ffffff', 2);
    ell(c, x, y - 40, 10, 10); fs(c, '#f0c39a');
    ell(c, x + 3, y - 41, 1.6, 2); fs(c, OUT, null);
    c.beginPath(); c.arc(x + 2, y - 37, 4, 0.2, 2.2); c.strokeStyle = OUT; c.lineWidth = 1.5; c.stroke();
    rr(c, x - 10, y - 54, 20, 9, 4); fs(c, '#ffffff');
    rr(c, x - 12, y - 47, 26, 5, 2); fs(c, '#2b2140');
    line(c, [[x + 6, y - 22], [x + 20, y - 26]], OUT, 6); line(c, [[x + 6, y - 22], [x + 20, y - 26]], '#f0c39a', 3);
  }

  // Side view of the boat. Local origin = deck line at the middle; canvas offset (160, 150).
  function drawBoat(c, th) {
    const X = 160, Y = 150, hull = '#' + th.hull.toString(16).padStart(6, '0'), trim = '#' + th.trim.toString(16).padStart(6, '0'), deck = '#' + th.deck.toString(16).padStart(6, '0');
    // rod
    line(c, [[X + 62, Y - 44], [X + 100, Y - 92]], OUT, 5); line(c, [[X + 62, Y - 44], [X + 100, Y - 92]], '#b9824a', 2.5);
    // mast + flag
    line(c, [[X - 104, Y - 20], [X - 104, Y - 132]], OUT, 7); line(c, [[X - 104, Y - 20], [X - 104, Y - 132]], '#8a5a34', 4);
    poly(c, [[X - 102, Y - 132], [X - 70, Y - 122], [X - 102, Y - 112]]); fs(c, trim);
    // cabin
    rr(c, X - 88, Y - 78, 104, 60, 6); fs(c, deck);
    for (let i = 0; i < 4; i++) line(c, [[X - 86, Y - 66 + i * 12], [X + 14, Y - 66 + i * 12]], 'rgba(43,33,64,0.18)', 1.5);
    [[-72], [-36]].forEach(([dx]) => { rr(c, X + dx, Y - 66, 26, 24, 5); fs(c, lin(c, 0, Y - 66, 0, Y - 42, ['#ffe9a8', '#ffb347'])); line(c, [[X + dx + 13, Y - 66], [X + dx + 13, Y - 42]], OUT, 2); });
    rr(c, X - 2, Y - 62, 14, 42, 3); fs(c, '#8a5a34');
    // striped awning
    poly(c, [[X - 98, Y - 78], [X + 26, Y - 78], [X + 34, Y - 92], [X - 90, Y - 96]]); fs(c, '#ffffff');
    c.save(); poly(c, [[X - 98, Y - 78], [X + 26, Y - 78], [X + 34, Y - 92], [X - 90, Y - 96]]); c.clip();
    for (let i = 0; i < 7; i++) { c.fillStyle = trim; c.fillRect(X - 98 + i * 20, Y - 100, 10, 26); }
    c.restore();
    poly(c, [[X - 98, Y - 78], [X + 26, Y - 78], [X + 34, Y - 92], [X - 90, Y - 96]]); fs(c, null);
    // chimney
    rr(c, X - 60, Y - 114, 14, 20, 3); fs(c, '#5b4a6b');
    drawCaptain(c, X + 50, Y - 22);
    // hull
    c.beginPath(); c.moveTo(X - 132, Y - 22); c.lineTo(X + 140, Y - 28); c.quadraticCurveTo(X + 120, Y + 20, X + 86, Y + 30); c.lineTo(X - 100, Y + 30); c.quadraticCurveTo(X - 126, Y + 14, X - 132, Y - 22); c.closePath();
    fs(c, hull);
    c.save(); c.clip();
    c.fillStyle = 'rgba(43,33,64,0.14)'; c.fillRect(X - 140, Y + 4, 290, 40);
    for (let i = 0; i < 3; i++) line(c, [[X - 140, Y - 6 + i * 11], [X + 150, Y - 10 + i * 11]], 'rgba(43,33,64,0.2)', 1.5);
    c.restore();
    c.beginPath(); c.moveTo(X - 134, Y - 24); c.lineTo(X + 142, Y - 30); c.lineTo(X + 138, Y - 20); c.lineTo(X - 131, Y - 14); c.closePath(); fs(c, trim);
    [[-70], [-30], [10]].forEach(([dx]) => { ell(c, X + dx, Y + 4, 7, 7); fs(c, '#ffd98a'); });
    // life ring
    ell(c, X + 96, Y - 2, 11, 11); fs(c, '#ffffff'); ell(c, X + 96, Y - 2, 5, 5); fs(c, hull);
    [0, 1.57, 3.14, 4.71].forEach(a => { c.beginPath(); c.arc(X + 96, Y - 2, 8, a - 0.3, a + 0.3); c.strokeStyle = '#e8344e'; c.lineWidth = 6; c.stroke(); });
  }

  function drawSky(c, w, h, area) {
    const coral = area === 'coral';
    c.fillStyle = lin(c, 0, 0, 0, h, coral ? ['#ff8fb0', '#ffb89a', '#ffe7b8'] : ['#57b5ee', '#a8dcf7', '#ffe9c9']);
    c.fillRect(0, 0, w, h);
    glow(c, 820, 110, 150, 'rgba(255,246,200,0.9)');
    ell(c, 820, 110, 42, 42); fs(c, '#fff6c2', null);
    // far islands
    const land = coral ? '#c85a8a' : '#5f9fb8', land2 = coral ? '#e07a9a' : '#7fbccb';
    [[120, 90, 30, land2], [330, 140, 44, land], [600, 110, 36, land2], [760, 160, 50, land]].forEach(([x, rw, rh, col]) => {
      c.beginPath(); c.moveTo(x - rw, h); c.quadraticCurveTo(x - rw * 0.4, h - rh * 1.6, x, h - rh); c.quadraticCurveTo(x + rw * 0.5, h - rh * 1.3, x + rw, h); c.closePath(); fs(c, col, null);
    });
    if (coral) {
      // coral arches
      [[420, 70], [880, 90]].forEach(([x, s]) => { c.beginPath(); c.arc(x, h, s, Math.PI, 0); c.strokeStyle = '#b84a7a'; c.lineWidth = 18; c.stroke(); });
    } else {
      // palms on the big island
      [[322, h - 44], [350, h - 40]].forEach(([x, y]) => { line(c, [[x, y], [x + 4, y - 30]], '#3d6f6a', 4); for (let a = 0; a < 5; a++) { c.beginPath(); c.moveTo(x + 4, y - 30); c.quadraticCurveTo(x + 4 + Math.cos(a * 1.25 + 3.4) * 14, y - 44, x + 4 + Math.cos(a * 1.25 + 3.4) * 24, y - 26 + Math.abs(a - 2) * -3); c.strokeStyle = '#3d8f6a'; c.lineWidth = 4; c.stroke(); } });
    }
    // gulls
    [[240, 70], [280, 92], [560, 60]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 9, y); c.quadraticCurveTo(x - 4, y - 7, x, y); c.quadraticCurveTo(x + 4, y - 7, x + 9, y); c.strokeStyle = 'rgba(43,33,64,0.55)'; c.lineWidth = 2; c.stroke(); });
  }

  function drawWater(c, w, h, area) {
    const coral = area === 'coral';
    c.fillStyle = lin(c, 0, 0, 0, h, coral ? ['#3fd0c0', '#1a9aa0', '#0e5f78'] : ['#4db3e6', '#2580bd', '#123f73']);
    c.fillRect(0, 0, w, h);
    // deeper water toward the far end
    c.fillStyle = lin(c, 280, 0, w, 0, ['rgba(10,20,60,0)', 'rgba(10,20,60,0.35)']); c.fillRect(0, 0, w, h);
    // light bands
    for (let i = 0; i < 26; i++) {
      const y = rnd(14, h - 30), x = rnd(0, w), len = rnd(30, 110);
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len / 2, y - 5, x + len, y); c.strokeStyle = `rgba(255,255,255,${rnd(0.06, 0.2)})`; c.lineWidth = 3; c.stroke();
    }
    // seabed
    c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w; x += 60) c.quadraticCurveTo(x + 30, h - rnd(14, 40), x + 60, h - rnd(6, 18));
    c.lineTo(w, h); c.closePath(); fs(c, coral ? '#0b4a60' : '#0d3058', null);
    for (let i = 0; i < 16; i++) {
      const x = rnd(250, w - 10), s = rnd(18, 46);
      if (coral) { ['#ff7fa0', '#ffb347', '#c59bff'].forEach((col, k) => { c.beginPath(); c.moveTo(x + k * 8, h); c.quadraticCurveTo(x + k * 8 - 8, h - s * 0.6, x + k * 8 + (k - 1) * 8, h - s); c.strokeStyle = col; c.lineWidth = 5; c.globalAlpha = 0.75; c.stroke(); c.globalAlpha = 1; }); } else { c.beginPath(); c.moveTo(x, h); c.bezierCurveTo(x - 10, h - s * 0.4, x + 10, h - s * 0.7, x, h - s); c.strokeStyle = 'rgba(60,170,120,0.6)'; c.lineWidth = 5; c.stroke(); }
    }
  }

  function drawNightSea(c, w, h) {
    c.fillStyle = lin(c, 0, 0, 0, h, ['#0a1430', '#122a4d', '#0c2140']); c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,255,${rnd(0.2, 0.9)})`; c.fillRect(rnd(0, w), rnd(0, h), rnd(1, 2.4), rnd(1, 2.4)); }
    for (let i = 0; i < 40; i++) { const x = rnd(0, w), y = rnd(0, h); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 20, y - 4, x + 40, y); c.strokeStyle = 'rgba(140,190,255,0.12)'; c.lineWidth = 3; c.stroke(); }
  }

  function drawDeck(c, w, h, th) {
    const col = '#' + th.deck.toString(16).padStart(6, '0'), trim = '#' + th.trim.toString(16).padStart(6, '0');
    rr(c, 4, 4, w - 8, h - 8, 26); c.save(); c.clip();
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 34) {
      c.fillStyle = `rgba(43,33,64,${(y / 34) % 2 ? 0.07 : 0})`; c.fillRect(0, y, w, 34);
      line(c, [[0, y], [w, y]], 'rgba(43,33,64,0.3)', 2);
      const off = ((y / 34) % 3) * 90;
      for (let x = off; x < w; x += 210) { line(c, [[x, y], [x, y + 34]], 'rgba(43,33,64,0.3)', 2); ell(c, x + 6, y + 8, 1.6, 1.6); fs(c, 'rgba(43,33,64,0.4)', null); ell(c, x + 6, y + 26, 1.6, 1.6); fs(c, 'rgba(43,33,64,0.4)', null); }
    }
    c.restore();
    rr(c, 4, 4, w - 8, h - 8, 26); c.strokeStyle = OUT; c.lineWidth = 9; c.stroke(); c.strokeStyle = trim; c.lineWidth = 5; c.stroke();
    // rope posts
    for (let x = 40; x < w; x += 110) [6, h - 6].forEach(y => { ell(c, x, y, 6, 6); fs(c, '#d9b06a', OUT, 2); });
  }

  function drawTable(c, kind, th) {
    ell(c, 56, 40, 52, 14); fs(c, 'rgba(0,0,0,0.25)', null);
    rr(c, 50, 30, 12, 20, 3); fs(c, '#6b4a2f');
    ell(c, 56, 26, 52, 20);
    const cloth = kind === 'fancy' ? '#ffffff' : '#' + th.table.toString(16).padStart(6, '0');
    fs(c, cloth);
    if (kind === 'fancy') {
      c.save(); ell(c, 56, 26, 52, 20); c.clip();
      for (let i = 0; i < 12; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) { c.fillStyle = '#e8344e'; c.fillRect(i * 10 - 2, j * 9, 10, 9); }
      c.restore(); ell(c, 56, 26, 52, 20); fs(c, null);
    }
    ell(c, 40, 26, 14, 7); fs(c, '#ffffff', '#c9d3da', 1.5);
    glow(c, 78, 16, 16, 'rgba(255,220,130,0.8)');
    rr(c, 75, 18, 6, 10, 2); fs(c, '#fff6d6', OUT, 1.5);
    c.beginPath(); c.moveTo(78, 8); c.quadraticCurveTo(83, 15, 78, 18); c.quadraticCurveTo(73, 15, 78, 8); fs(c, '#ffb347', null);
  }

  function drawStove(c) {
    rr(c, 3, 3, 76, 66, 10); fs(c, lin(c, 0, 0, 0, 72, ['#8fa3b5', '#56687a']));
    rr(c, 9, 9, 64, 44, 6); fs(c, '#2e3a48', OUT, 2);
    [14, 9].forEach(r => { ell(c, 41, 31, r * 1.5, r); fs(c, null, '#ff8a3c', 2.5); });
    [20, 34, 48, 62].forEach(x => { ell(c, x, 61, 3.5, 3.5); fs(c, '#ffe9a8', OUT, 1.5); });
  }

  function drawKitchen(c, w, h) {
    rr(c, 2, 2, w - 4, h - 4, 14); c.save(); c.clip();
    c.fillStyle = '#24384d'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 28) for (let x = (y / 28) % 2 ? -14 : 0; x < w; x += 28) { rr(c, x + 1, y + 1, 26, 26, 3); fs(c, 'rgba(255,255,255,0.035)', 'rgba(0,0,0,0.18)', 1); }
    c.restore();
    rr(c, 2, 2, w - 4, h - 4, 14); fs(c, null, OUT, 4);
  }

  function drawPrepBg(c, w, h) {
    c.fillStyle = lin(c, 0, 0, 0, h, ['#f7b267', '#f4845f', '#3b3561']); c.fillRect(0, 0, w, h);
    glow(c, 760, 420, 320, 'rgba(255,230,160,0.55)');
    c.fillStyle = 'rgba(24,36,70,0.86)'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = rnd(0, w), y = rnd(40, h); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 14, y - 5, x + 28, y); c.strokeStyle = 'rgba(160,200,255,0.06)'; c.lineWidth = 3; c.stroke(); }
    c.fillStyle = lin(c, 0, 0, 180, 0, ['#5b3a24', '#7a4e2d']); c.fillRect(0, 36, 180, h);
    for (let y = 36; y < h; y += 40) line(c, [[0, y], [180, y]], 'rgba(0,0,0,0.25)', 2);
    line(c, [[180, 36], [180, h]], OUT, 4);
  }

  A.kit = { tex, fs, lin, glow, ell, rr, poly, line, eye, drawFish, miniFish, plate, rnd, OUT };

  // ---------- build everything once ----------
  A.build = function (scene) {
    if (scene.textures.exists('fish_sardine')) return;
    for (const id in FISH) tex(scene, 'fish_' + id, 128, 72, FISH[id]);
    for (const id in DISH) tex(scene, 'dish_' + id, 64, 64, DISH[id]);
    for (const sp in D.species) for (const role in D.roles) tex(scene, `cust_${sp}_${role}`, 64, 68, c => drawCustomer(c, sp, role));
    D.regulars.forEach(r => tex(scene, 'cust_' + r.id, 64, 68, c => drawCustomer(c, r.species, r.role, r.id)));
    for (const id in D.roles) tex(scene, 'role_' + id, 28, 28, c => { rr(c, 2, 2, 24, 24, 6); fs(c, '#' + D.roles[id].color.toString(16).padStart(6, '0'), '#ffffff', 2); ICON['role_' + id](c); });
    for (const id in D.species) tex(scene, 'sp_' + id, 28, 28, c => { ell(c, 14, 14, 12, 12); fs(c, '#' + D.species[id].color.toString(16).padStart(6, '0'), '#ffffff', 2); ICON['sp_' + id](c); });
    for (const id in D.themes) {
      const th = D.themes[id];
      tex(scene, 'boat_' + id, 320, 190, c => drawBoat(c, th));
      tex(scene, 'deck_' + id, 630, 490, (c, w, h) => drawDeck(c, w, h, th));
      tex(scene, 'table_' + id, 112, 56, c => drawTable(c, 'plain', th));
    }
    tex(scene, 'table_fancy', 112, 56, c => drawTable(c, 'fancy', D.themes.beach));
    for (const id in D.areas) {
      tex(scene, 'sky_' + id, 960, 340, (c, w, h) => drawSky(c, w, h, id));
      tex(scene, 'water_' + id, 960, 290, (c, w, h) => drawWater(c, w, h, id));
    }
    tex(scene, 'nightsea', 960, 600, drawNightSea);
    tex(scene, 'kitchen', 280, 556, drawKitchen);
    tex(scene, 'prepbg', 960, 600, drawPrepBg);
    tex(scene, 'stove', 82, 72, drawStove);
    tex(scene, 'captain', 48, 64, c => drawCaptain(c, 20, 60));
    tex(scene, 'cloud', 150, 60, c => { [[40, 36, 26], [72, 28, 30], [106, 38, 24], [74, 44, 34]].forEach(([x, y, r]) => { ell(c, x, y, r, r * 0.62); fs(c, 'rgba(255,255,255,0.92)', null); }); });
    tex(scene, 'wave', 96, 18, c => { c.beginPath(); c.moveTo(0, 9); for (let x = 0; x < 96; x += 24) c.quadraticCurveTo(x + 12, 0, x + 24, 9); c.lineTo(96, 18); c.lineTo(0, 18); c.closePath(); fs(c, 'rgba(255,255,255,0.22)', null); c.beginPath(); c.moveTo(0, 9); for (let x = 0; x < 96; x += 24) c.quadraticCurveTo(x + 12, 0, x + 24, 9); c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2.5; c.stroke(); });
    tex(scene, 'bobber', 20, 28, c => { line(c, [[10, 2], [10, 10]], OUT, 2); ell(c, 10, 17, 8, 9); fs(c, '#ffffff'); c.save(); ell(c, 10, 17, 8, 9); c.clip(); c.fillStyle = '#e8344e'; c.fillRect(0, 6, 20, 11); c.restore(); ell(c, 10, 17, 8, 9); fs(c, null); });
    tex(scene, 'buoy', 30, 44, c => { line(c, [[15, 4], [15, 16]], OUT, 3); ell(c, 15, 5, 3.5, 3.5); fs(c, '#ffe14d', OUT, 2); poly(c, [[6, 34], [10, 14], [20, 14], [24, 34]]); fs(c, '#ff7a3c'); line(c, [[8, 24], [22, 24]], '#ffffff', 4); ell(c, 15, 35, 12, 5); fs(c, '#e8344e'); });
    tex(scene, 'net', 64, 64, c => { ell(c, 32, 32, 27, 27); c.save(); c.clip(); for (let i = -64; i < 64; i += 9) { line(c, [[i, 0], [i + 64, 64]], 'rgba(255,255,255,0.5)', 1.5); line(c, [[i + 64, 0], [i, 64]], 'rgba(255,255,255,0.5)', 1.5); } c.restore(); ell(c, 32, 32, 27, 27); fs(c, null, OUT, 7); fs(c, null, '#ffd98a', 4); });
    tex(scene, 'reelbg', 524, 176, (c, w, h) => { rr(c, 2, 2, w - 4, h - 4, 14); c.save(); c.clip(); c.fillStyle = lin(c, 0, 0, 0, h, ['#2f8fc4', '#12406e']); c.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { const r = rnd(2, 6); ell(c, rnd(10, w - 10), rnd(10, h - 10), r, r); fs(c, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.3)', 1.2); } for (let i = 0; i < 5; i++) { const x = rnd(0, w); c.beginPath(); c.moveTo(x, h); c.bezierCurveTo(x - 12, h - 20, x + 12, h - 40, x, h - rnd(40, 70)); c.strokeStyle = 'rgba(60,190,130,0.45)'; c.lineWidth = 6; c.stroke(); } c.restore(); rr(c, 2, 2, w - 4, h - 4, 14); fs(c, null, OUT, 3); });
    tex(scene, 'lantern', 26, 40, c => { glow(c, 13, 24, 13, 'rgba(255,210,120,0.9)'); line(c, [[13, 0], [13, 10]], OUT, 2); rr(c, 6, 10, 14, 5, 2); fs(c, '#b3262b', OUT, 2); rr(c, 5, 14, 16, 18, 6); fs(c, lin(c, 0, 14, 0, 32, ['#ffe9a8', '#ff9a3c']), OUT, 2); rr(c, 8, 31, 10, 4, 2); fs(c, '#b3262b', OUT, 2); });
    tex(scene, 'plant', 40, 52, c => { [[-0.7, '#2f9e5b'], [0.7, '#2f9e5b'], [-0.25, '#4cc27a'], [0.25, '#4cc27a'], [0, '#3db36a']].forEach(([a, col]) => { c.save(); c.translate(20, 34); c.rotate(a); ell(c, 0, -15, 6, 16); fs(c, col, OUT, 2); c.restore(); }); poly(c, [[8, 32], [32, 32], [28, 50], [12, 50]]); fs(c, '#d9822b'); rr(c, 6, 29, 28, 6, 2); fs(c, '#f29a4a'); });
    tex(scene, 'plank', 240, 40, (c, w, h) => { rr(c, 3, 3, w - 6, h - 6, 8); fs(c, lin(c, 0, 0, 0, h, ['#b9824a', '#8a5a34'])); line(c, [[14, 14], [w - 14, 13]], 'rgba(43,33,64,0.25)', 1.5); line(c, [[14, 27], [w - 14, 28]], 'rgba(43,33,64,0.25)', 1.5); [12, w - 12].forEach(x => { ell(c, x, h / 2, 2.5, 2.5); fs(c, '#ffd98a', OUT, 1.5); }); });
    tex(scene, 'knife', 30, 64, c => { poly(c, [[10, 2], [22, 2], [22, 36], [10, 30]]); fs(c, '#e6edf2', OUT, 2); rr(c, 11, 36, 10, 24, 3); fs(c, '#8a5a34', OUT, 2); });
    tex(scene, 'board', 440, 80, (c, w, h) => { rr(c, 3, 3, w - 6, h - 6, 12); fs(c, lin(c, 0, 0, 0, h, ['#d9a86a', '#b9824a'])); for (let i = 0; i < 4; i++) line(c, [[16, 18 + i * 14], [w - 16, 16 + i * 14]], 'rgba(43,33,64,0.12)', 2); });
    tex(scene, 'bigplate', 128, 128, c => { ell(c, 64, 68, 60, 60); fs(c, 'rgba(0,0,0,0.2)', null); ell(c, 64, 64, 60, 60); fs(c, '#ffffff'); ell(c, 64, 64, 42, 42); fs(c, '#eef2f5', '#c9d3da', 2); ell(c, 64, 64, 13, 13); fs(c, null, 'rgba(47,158,91,0.6)', 2); });
  };
})();
