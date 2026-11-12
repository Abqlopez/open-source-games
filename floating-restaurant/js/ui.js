// Small shared helpers: text, buttons, bars, the HUD, input, and sound blips.
(function () {
  const U = FR.ui = {};
  U.font = '"Fredoka", "Trebuchet MS", Verdana, sans-serif';
  U.display = '"Lilita One", "Fredoka", "Trebuchet MS", sans-serif';

  U.text = (s, x, y, str, size, color, extra) =>
    s.add.text(x, y, str, Object.assign({ fontFamily: U.font, fontSize: (size || 16) + 'px', color: color || '#ffffff' }, extra || {}));

  // Big chunky heading with an outline.
  U.title = (s, x, y, str, size, color) =>
    s.add.text(x, y, str, { fontFamily: U.display, fontSize: size + 'px', color: color || '#ffe9a8', stroke: '#2b2140', strokeThickness: Math.max(4, size / 6) });

  // A rounded card drawn at (x, y) = centre.
  U.card = function (s, x, y, w, h, color, alpha, border) {
    const g = s.add.graphics();
    const r = Math.min(14, h / 2);
    g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x - w / 2, y - h / 2 + 3, w, h, r);
    g.fillStyle(color, alpha === undefined ? 1 : alpha); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    g.lineStyle(2, border === undefined ? 0x2b2140 : border, 0.9); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
    return g;
  };

  // x, y is the button centre. The callback runs on the next tick so it is
  // safe for it to rebuild the screen the button lives on.
  U.button = function (s, x, y, w, h, label, cb, o) {
    o = o || {};
    const off = o.enabled === false;
    const col = off ? 0x4a4f57 : (o.color !== undefined ? o.color : 0x2f6f8f);
    const c = s.add.container(x, y);
    const r = Math.min(12, h / 2);
    const g = s.add.graphics();
    g.fillStyle(0x2b2140, 1); g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, r);       // chunky drop edge
    g.fillStyle(col, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(0xffffff, off ? 0.05 : 0.18); g.fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, Math.max(4, h * 0.36), Math.min(r - 2, h * 0.18));
    g.lineStyle(2, 0x2b2140, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    const t = U.text(s, o.icon ? 12 : 0, 0, label, o.size || 14, off ? '#9aa0a8' : '#ffffff', { align: 'center' }).setOrigin(0.5);
    if (!off) t.setShadow(0, 1, '#2b2140', 2);
    const hit = s.add.rectangle(0, 0, w, h + 4, 0xffffff, 0.001);
    c.add([g, t, hit]);
    if (o.icon) c.add(s.add.image(-w / 2 + 17, 0, o.icon).setScale((h - 4) / 64));
    c.bg = hit; c.label = t;
    if (!off) {
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => { FR.sfx('click'); c.y = y + 2; s.time.delayedCall(1, cb); });
      hit.on('pointerup', () => { c.y = y; });
      hit.on('pointerover', () => c.setScale(1.03));
      hit.on('pointerout', () => { c.setScale(1); c.y = y; });
    }
    return c;
  };

  // x is the left edge, y the vertical centre.
  U.bar = function (s, x, y, w, h, color) {
    const bg = s.add.rectangle(x, y, w, h, 0x1a1430, 0.8).setOrigin(0, 0.5).setStrokeStyle(2, 0x2b2140, 1);
    const fill = s.add.rectangle(x + 1, y, w - 2, h - 2, color).setOrigin(0, 0.5);
    return {
      bg, fill, objs: [bg, fill],
      set(f) { fill.scaleX = Math.max(0.0001, Math.min(1, f)); },
      color(c) { fill.setFillStyle(c); }
    };
  };

  // A dimmed, click-blocking popup centred on screen.
  U.panel = function (s, w, h, title, depth, x, y) {
    x = x === undefined ? 480 : x; y = y === undefined ? 320 : y;
    const c = s.add.container(x, y).setDepth(depth || 100);
    const block = s.add.rectangle(480 - x, 300 - y, 960, 600, 0x000000, 0.55).setInteractive();
    const bg = s.add.graphics();
    bg.fillStyle(0x2b2140, 1); bg.fillRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 16, 22);
    bg.fillStyle(0xffd98a, 1); bg.fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 20);
    bg.fillStyle(0x1d3557, 1); bg.fillRoundedRect(-w / 2, -h / 2, w, h, 17);
    bg.fillStyle(0xffffff, 0.05); bg.fillRoundedRect(-w / 2, -h / 2, w, 44, { tl: 17, tr: 17, bl: 0, br: 0 });
    const t = U.title(s, 0, -h / 2 + 22, title, 21).setOrigin(0.5);
    c.add([block, bg, t]);
    c.titleText = t;
    return c;
  };

  U.toast = function (s, msg, color) {
    if (s._toast && s._toast.active) s._toast.destroy();
    const t = U.text(s, 480, 92, msg, 17, color || '#ffffff', { backgroundColor: '#2b2140ee', padding: { x: 14, y: 8 }, align: 'center' })
      .setOrigin(0.5).setDepth(900);
    s._toast = t;
    s.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 500, onComplete: () => t.destroy() });
    return t;
  };

  U.float = function (s, x, y, msg, color) {
    const t = U.text(s, x, y, msg, 15, color || '#ffffff', { fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5).setDepth(850);
    s.tweens.add({ targets: t, y: y - 36, alpha: 0, delay: 700, duration: 900, onComplete: () => t.destroy() });
  };

  U.clock = function (sec) {
    sec = Math.max(0, Math.ceil(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  };

  // Top bar: day, time of day, money, stars, fish in the tank.
  U.hud = function (s, phase) {
    s.add.rectangle(480, 18, 960, 36, 0x2b2140).setDepth(800);
    s.add.rectangle(480, 36, 960, 3, 0xffd98a).setDepth(800);
    const left = U.text(s, 12, 18, '', 16).setOrigin(0, 0.5).setDepth(801);
    const right = U.text(s, 948, 18, '', 16, '#ffe9a8').setOrigin(1, 0.5).setDepth(801);
    const h = {
      set(time) {
        const S = FR.state;
        left.setText(`Day ${S.day}  ·  ${phase}${time ? '  ' + time : ''}  ·  ${FR.DATA.areas[S.area].name}`);
        right.setText(`$${S.money}    ★ ${FR.rating().toFixed(1)}    Fish ${S.tank.length}/${FR.tankCap()}`);
      }
    };
    h.set('');
    return h;
  };

  // One "action" input per scene: the spacebar, or an on-screen button that
  // does the same job (handy on touch screens).
  FR.makeInput = function (scene) {
    const space = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const st = { btn: false, q: false, pq: false, prev: false };
    scene.input.keyboard.on('keydown-SPACE', ev => { if (!ev.repeat) st.q = true; });
    scene.input.on('pointerdown', () => { st.pq = true; });
    scene.input.on('pointerup', () => { st.btn = false; });
    return {
      addActionButton(x, y) {
        const c = scene.add.container(x, y).setDepth(950);
        const sh = scene.add.circle(0, 5, 42, 0x2b2140);
        const bg = scene.add.circle(0, 0, 42, 0xff8a3c).setStrokeStyle(4, 0x2b2140);
        const t = U.text(scene, 0, 0, 'ACTION\n(space)', 13, '#ffffff', { align: 'center', fontStyle: 'bold' }).setOrigin(0.5);
        c.add([sh, bg, t]);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => { st.btn = true; st.q = true; });
        bg.on('pointerout', () => { st.btn = false; });
        return c;
      },
      poll() {
        const p = scene.input.activePointer;
        const down = space.isDown || st.btn;
        const r = { down, just: st.q, up: !down && st.prev, px: p.x, py: p.y, pdown: p.isDown, pjust: st.pq };
        st.q = false; st.pq = false; st.prev = down;
        return r;
      }
    };
  };

  // Tiny synth blips so catches and coins have some feedback.
  FR.sfx = function (name) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = FR._ac || (FR._ac = new AC());
      if (ctx.state === 'suspended') ctx.resume();
      const def = {
        click: [440, 0.05, 'square', 0.03], blip: [660, 0.08, 'sine', 0.07], bite: [880, 0.15, 'square', 0.06],
        good: [784, 0.3, 'triangle', 0.09], bad: [160, 0.3, 'sawtooth', 0.06], coin: [1046, 0.2, 'triangle', 0.08],
        zap: [90, 0.2, 'sawtooth', 0.09]
      }[name];
      if (!def) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = def[2];
      o.frequency.value = def[0];
      g.gain.setValueAtTime(def[3], ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + def[1]);
      o.connect(g); g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + def[1]);
    } catch (e) { /* audio is optional */ }
  };
})();
