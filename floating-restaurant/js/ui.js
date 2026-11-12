// Small shared helpers: text, buttons, bars, the HUD, input, and sound blips.
(function () {
  const U = FR.ui = {};
  U.font = '"Trebuchet MS", Verdana, sans-serif';

  U.text = (s, x, y, str, size, color, extra) =>
    s.add.text(x, y, str, Object.assign({ fontFamily: U.font, fontSize: (size || 16) + 'px', color: color || '#ffffff' }, extra || {}));

  // x, y is the button centre. The callback runs on the next tick so it is
  // safe for it to rebuild the screen the button lives on.
  U.button = function (s, x, y, w, h, label, cb, o) {
    o = o || {};
    const c = s.add.container(x, y);
    const bg = s.add.rectangle(0, 0, w, h, o.color !== undefined ? o.color : 0x2f6f8f).setStrokeStyle(2, 0xffffff, 0.5);
    const t = U.text(s, 0, 0, label, o.size || 14).setOrigin(0.5);
    c.add([bg, t]);
    c.bg = bg; c.label = t;
    if (o.enabled === false) {
      bg.setFillStyle(0x4a4f57);
      t.setColor('#9aa0a8');
    } else {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => { FR.sfx('click'); s.time.delayedCall(1, cb); });
      bg.on('pointerover', () => bg.setAlpha(0.8));
      bg.on('pointerout', () => bg.setAlpha(1));
    }
    return c;
  };

  // x is the left edge, y the vertical centre.
  U.bar = function (s, x, y, w, h, color) {
    const bg = s.add.rectangle(x, y, w, h, 0x000000, 0.55).setOrigin(0, 0.5).setStrokeStyle(1, 0xffffff, 0.6);
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
    const bg = s.add.rectangle(0, 0, w, h, 0x16324a).setStrokeStyle(3, 0xffe9a8);
    const t = U.text(s, 0, -h / 2 + 22, title, 18, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0.5);
    c.add([block, bg, t]);
    c.titleText = t;
    return c;
  };

  U.toast = function (s, msg, color) {
    if (s._toast && s._toast.active) s._toast.destroy();
    const t = U.text(s, 480, 92, msg, 17, color || '#ffffff', { backgroundColor: '#000000cc', padding: { x: 12, y: 7 }, align: 'center' })
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
    s.add.rectangle(480, 18, 960, 36, 0x0d2233).setDepth(800);
    const left = U.text(s, 12, 18, '', 15).setOrigin(0, 0.5).setDepth(801);
    const right = U.text(s, 948, 18, '', 15, '#ffe9a8').setOrigin(1, 0.5).setDepth(801);
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
        const bg = scene.add.circle(0, 0, 42, 0xff8a3c).setStrokeStyle(3, 0xffffff);
        const t = U.text(scene, 0, 0, 'ACTION\n(space)', 13, '#ffffff', { align: 'center', fontStyle: 'bold' }).setOrigin(0.5);
        c.add([bg, t]);
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
