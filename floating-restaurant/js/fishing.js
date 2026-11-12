// Morning (v2): steer the boat around a top-down sea, read the signs on the
// water to find fish, pick the right gear and bait, and win the fight.
(function () {
  const U = FR.ui, D = FR.DATA, C = D.config, J = FR.juice;

  // ---- side-view sea and boat, still used by the title screen ----
  FR.drawBoat = function (s, x, y) {
    const S = FR.state || FR.newState();
    const boat = s.add.image(x, y, 'boat_' + S.theme).setOrigin(0.5, 150 / 190).setDepth(5);
    s.tweens.add({ targets: boat, angle: { from: -0.8, to: 0.8 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (S.decor.lanterns) [-88, -40, 8].forEach(dx => s.add.image(x + dx, y - 62, 'lantern').setScale(0.7).setDepth(6));
    if (S.decor.plants) [-118, 118].forEach(dx => s.add.image(x + dx, y - 44, 'plant').setScale(0.7).setDepth(6));
  };
  FR.drawSea = function (s, areaId) {
    FR.art.build(s);
    s.add.image(480, 170, 'sky_' + areaId);
    [[160, 70, 1], [520, 120, 0.7], [760, 50, 0.85]].forEach(([x, y, sc], i) => {
      const cl = s.add.image(x, y, 'cloud').setScale(sc).setAlpha(0.9);
      s.tweens.add({ targets: cl, x: x + 60, duration: 16000 + i * 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    s.add.image(480, 455, 'water_' + areaId);
    const wave = s.add.tileSprite(480, 312, 960, 18, 'wave').setDepth(7);
    const wave2 = s.add.tileSprite(480, 330, 960, 18, 'wave').setDepth(1).setAlpha(0.4);
    return { update(dt) { wave.tilePositionX += dt * 26; wave2.tilePositionX -= dt * 14; } };
  };

  FR.pickNightFish = () => FR.weighted(D.areas[FR.state.area].night);

  // Shared by the morning and the deck rod at night: put a caught fish in the
  // tank, write it in the journal, and say what happened.
  FR.landFish = function (scene, id, cut, lucky, count) {
    const S = FR.state, f = D.fish[id];
    let n = 0, size = 'normal', notes = [];
    for (let i = 0; i < (count || 1) && S.tank.length < FR.tankCap(); i++) {
      size = f.boss ? 'trophy' : FR.rollSize(lucky);
      FR.addFish(id, cut, size);
      const j = FR.logCatch(id, size);
      if (j.first) notes.push(`New in your journal! +$${j.reward}`);
      if (j.complete) notes.push(`${j.complete} journal complete! +$${C.journalComplete}`);
      n++;
    }
    if (!n) { U.toast(scene, 'The tank is full, so you let it go.', '#ffe9a8'); return null; }
    const sizeTxt = n > 1 ? ` ×${n}` : size !== 'normal' ? ` (${D.sizes[size].name}${D.sizes[size].portions > 1 && !f.boss ? ', feeds ' + D.sizes[size].portions : ''})` : '';
    const cutTxt = cut === 'perfect' ? ' — clean catch!' : cut === 'bruised' ? ' — bruised.' : '';
    U.toast(scene, `Caught ${f.name}${sizeTxt}${cutTxt}${notes.length ? '\n' + notes.join('  ') : ''}`, cut === 'bruised' ? '#ffe9a8' : '#9cffb0');
    FR.sfx(size === 'trophy' || cut === 'perfect' ? 'perfect' : 'good');
    if (size === 'trophy' && !f.boss) J.pop(scene, 480, 250, 'TROPHY CATCH!', '#ffe14d', 44);
    else if (cut === 'perfect') J.pop(scene, 480, 250, 'PERFECT!', '#9cffb0', 40);
    return size;
  };

  class FishingScene extends Phaser.Scene {
    constructor() { super('Fishing'); }

    create() {
      const S = FR.state;
      FR.art.build(this);
      this.inp = FR.makeInput(this);
      this.timeLeft = C.morningSeconds;
      this.finished = false; this.cast = null; this.fight = null; this.target = null; this.wakeT = 0;
      this.add.image(480, 300, 'seatop_' + S.area);
      this.shimmer = this.add.tileSprite(480, 318, 960, 564, 'wave').setAlpha(0.1).setTileScale(2, 3);
      this.hud = U.hud(this, 'Morning');
      this.boat = this.add.image(480, 330, 'boattop_' + S.theme).setDepth(50);
      this.bang = U.title(this, 0, 0, '!', 56, '#ffe14d').setOrigin(0.5).setDepth(60).setVisible(false);
      this.bobber = this.add.image(0, 0, 'bobber').setDepth(49).setVisible(false);
      this.lineG = this.add.graphics().setDepth(48);
      this.prompt = U.text(this, 480, 500, '', 15, '#ffffff', { backgroundColor: '#2b2140dd', padding: { x: 12, y: 6 }, align: 'center' }).setOrigin(0.5).setDepth(100);

      this.spots = []; this.traps = [];
      for (let i = 0; i < C.spotCount; i++) this.spawnSpot();
      if (D.areas[S.area].boss && S.day >= C.bossFromDay && !S.bossBeaten) this.spawnSpot(D.areas[S.area].boss);

      this.bar = this.add.container(0, 0).setDepth(200);
      this.drawBar();
      this.input.keyboard.on('keydown', ev => {
        const owned = Object.keys(D.gear).filter(g => S.gear[g]);
        const n = Number(ev.key);
        if (n >= 1 && n <= owned.length && !this.cast && !this.fight) { S.useGear = owned[n - 1]; this.drawBar(); }
        if (ev.code === 'KeyQ') this.nextBait();
        if (ev.code === 'KeyT') this.dropTrap();
      });
      U.button(this, 868, 62, 164, 32, 'Finish morning ▶', () => this.finish(), { color: 0x3f8f4f }).setDepth(200);
      this.inp.addActionButton(905, 480);
      if (S.day === 1) U.toast(this, 'Steer with WASD or arrows. Sail to a sign on the water and press SPACE to cast.', '#ffe9a8');
    }

    // ---------- gear / bait bar ----------
    drawBar() {
      const S = FR.state;
      this.bar.removeAll(true);
      this.bar.add(U.card(this, 480, 566, 940, 56, 0x1d3557, 0.92));
      Object.keys(D.gear).filter(g => S.gear[g]).forEach((g, i) => {
        const on = S.useGear === g;
        this.bar.add(U.button(this, 84 + i * 128, 566, 122, 34, `${i + 1}  ${D.gear[g].name}`, () => { S.useGear = g; this.drawBar(); }, { color: on ? 0xe07a2f : 0x2f6f8f, size: 12, icon: 'g_' + g }));
      });
      const b = S.bait && S.baits[S.bait] > 0 ? S.bait : null;
      S.bait = b;
      this.bar.add(U.button(this, 612, 566, 150, 34, b ? `Q  ${D.baits[b].name} ×${S.baits[b]}` : 'Q  No bait', () => this.nextBait(), { color: b ? 0x7a4e9c : 0x4a5a6a, size: 12, icon: b ? 'b_' + b : 'b_none' }));
      if (S.traps > 0) {
        const left = S.traps - this.traps.length;
        this.bar.add(U.button(this, 772, 566, 150, 34, `T  Drop trap ×${left}`, () => this.dropTrap(), { size: 12, icon: 'g_trap', enabled: left > 0 }));
      }
    }

    nextBait() {
      if (this.cast || this.fight) return;
      const S = FR.state, opts = [null].concat(Object.keys(D.baits).filter(b => S.baits[b] > 0));
      S.bait = opts[(opts.indexOf(S.bait) + 1) % opts.length];
      this.drawBar();
    }

    dropTrap() {
      const S = FR.state;
      if (this.cast || this.fight || this.traps.length >= S.traps) return;
      const img = this.add.image(this.boat.x, this.boat.y, 'trapbuoy').setDepth(20);
      this.tweens.add({ targets: img, angle: { from: -8, to: 8 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const label = U.text(this, img.x, img.y + 22, '', 12, '#ffffff', { fontStyle: 'bold', stroke: '#2b2140', strokeThickness: 3 }).setOrigin(0.5).setDepth(20);
      this.traps.push({ x: img.x, y: img.y, t: C.trapSeconds, img, label });
      FR.sfx('splash'); J.burst(this, img.x, img.y, 0xffffff, 8);
      this.drawBar();
    }

    collectTrap(tr) {
      const n = 1 + (Math.random() < 0.4 ? 1 : 0);
      J.burst(this, tr.x, tr.y, 0xff7a5c, 10);
      tr.img.destroy(); tr.label.destroy();
      this.traps = this.traps.filter(x => x !== tr);
      FR.landFish(this, 'crab', 'normal', false, n);
      this.drawBar();
    }

    // ---------- signs on the water ----------
    spawnSpot(forceId) {
      const S = FR.state;
      const id = forceId || FR.weighted(D.areas[S.area].spots), f = D.fish[id];
      let x, y, tries = 0;
      do { x = FR.rand(90, 870); y = FR.rand(120, 480); tries++; }
      while (tries < 30 && (Math.hypot(x - this.boat.x, y - this.boat.y) < 150 || this.spots.some(sp => Math.hypot(x - sp.x, y - sp.y) < 130)));
      const c = this.add.container(x, y).setDepth(10).setAlpha(0);
      const tw = cfg => this.tweens.add(Object.assign({ repeat: -1 }, cfg));
      const ringPulse = (tint, n) => { for (let i = 0; i < n; i++) { const r = this.add.image(0, 0, 'ring').setTint(tint).setScale(0.15); c.add(r); tw({ targets: r, scale: 0.95, alpha: { from: 0.9, to: 0 }, duration: 1800, delay: i * 600 }); } };
      const glowDot = (tint, sc) => { const g = this.add.image(0, 0, 'softglow').setTint(tint).setScale(sc).setBlendMode(Phaser.BlendModes.ADD); c.add(g); tw({ targets: g, scale: sc * 1.25, alpha: { from: 0.95, to: 0.5 }, duration: 900, yoyo: true }); };
      if (f.sign === 'ripples') {
        ringPulse(0xffffff, 3);
        for (let i = 0; i < 4; i++) { const m = this.add.image(FR.rand(-16, 16), FR.rand(-12, 12), 'fish_sardine').setScale(0.18).setTintFill(0x123a66).setAlpha(0.5); c.add(m); tw({ targets: m, x: m.x + FR.rand(-14, 14), y: m.y + FR.rand(-10, 10), duration: 700 + i * 150, yoyo: true }); }
      } else if (f.sign === 'glow') glowDot(f.color, 0.75);
      else if (f.sign === 'gold') { glowDot(0xffd23c, 0.6); for (let i = 0; i < 4; i++) { const st = U.text(this, FR.rand(-24, 24), FR.rand(-20, 20), '✦', 16, '#fff6c2').setOrigin(0.5); c.add(st); tw({ targets: st, alpha: 0, scale: 1.6, duration: 700, delay: i * 250, yoyo: true }); } }
      else if (f.sign === 'bubbles') { for (let i = 0; i < 6; i++) { const b = this.add.circle(FR.rand(-20, 20), FR.rand(-6, 14), FR.rand(3, 6)).setStrokeStyle(2, 0xffffff, 0.9); c.add(b); tw({ targets: b, y: b.y - 22, alpha: 0, duration: 1100, delay: i * 190 }); } const z = U.text(this, 0, 0, 'ϟ', 20, '#fff27a', { fontStyle: 'bold' }).setOrigin(0.5); c.add(z); tw({ targets: z, alpha: 0, duration: 260, yoyo: true, repeatDelay: 1100 }); }
      else if (f.sign === 'birds') { const spin = this.add.container(0, 0); c.add(spin); for (let i = 0; i < 3; i++) spin.add(this.add.image(Math.cos(i * 2.1) * 30, Math.sin(i * 2.1) * 30, 'gull')); tw({ targets: spin, angle: 360, duration: 4200 }); ringPulse(0xffffff, 1); }
      else if (f.sign === 'ink') { const g = this.add.image(0, 0, 'softglow').setTint(0x1a1026).setScale(0.8); c.add(g); tw({ targets: g, scale: 0.95, duration: 1200, yoyo: true }); ringPulse(0x1a1026, 1); }
      else if (f.sign === 'shadow') { const sh = this.add.image(0, 0, 'fish_old_whiskers').setScale(1.5).setTintFill(0x081a33).setAlpha(0.55); c.add(sh); tw({ targets: sh, x: 26, angle: 6, duration: 2600, yoyo: true, ease: 'Sine.easeInOut' }); ringPulse(0xffe9a8, 2); }
      const known = !!S.journal[id];
      const label = U.text(this, 0, f.boss ? 56 : 42, known || f.boss ? f.name : '???', 12, f.boss ? '#ffe14d' : '#ffffff', { fontStyle: 'bold', stroke: '#2b2140', strokeThickness: 3 }).setOrigin(0.5);
      c.add(label);
      this.tweens.add({ targets: c, alpha: 1, duration: 500 });
      this.spots.push({ id, x, y, c, life: f.boss ? 9999 : FR.rand(C.spotLife[0], C.spotLife[1]) });
    }

    removeSpot(sp, respawn) {
      this.spots = this.spots.filter(x => x !== sp);
      this.tweens.add({ targets: sp.c, alpha: 0, duration: 400, onComplete: () => sp.c.destroy() });
      if (respawn && !D.fish[sp.id].boss) this.time.delayedCall(900, () => { if (!this.finished) this.spawnSpot(); });
    }

    // ---------- casting ----------
    startCast(sp) {
      const S = FR.state, f = D.fish[sp.id];
      let bait = S.bait;
      if (bait) { S.baits[bait]--; if (S.baits[bait] <= 0) S.bait = null; }
      const match = bait === f.bait;
      const w = C.biteWait[match ? 'match' : bait ? 'other' : 'none'];
      this.cast = { sp, bait, match, phase: 'wait', t: FR.rand(w[0], w[1]), ignore: f.needsBait && !match };
      this.bobber.setPosition(sp.x, sp.y).setVisible(true);
      FR.sfx('splash'); J.burst(this, sp.x, sp.y, 0xffffff, 6, 26);
      this.drawBar();
    }

    endCast(spook) {
      const sp = this.cast.sp;
      this.cast = null;
      this.bobber.setVisible(false); this.bang.setVisible(false);
      if (spook) this.removeSpot(sp, true);
    }

    hook() {
      const S = FR.state, cast = this.cast, id = cast.sp.id, f = D.fish[id];
      const check = FR.gearCheck(id, S.useGear);
      this.bang.setVisible(false);
      if (check.fail) { FR.sfx('bad'); J.shake(this, 0.008); U.toast(this, check.fail, '#ff9c9c'); this.endCast(!f.boss); return; }
      if (check.scoop) {
        J.burst(this, cast.sp.x, cast.sp.y, 0xb8c7d6, 14);
        this.endCast(true);
        FR.landFish(this, id, 'perfect', cast.match, check.scoop);
        return;
      }
      cast.phase = 'fight';
      this.fight = new FR.Fight(this, id, {
        gear: S.useGear, baitMatch: cast.match,
        onDone: res => {
          this.fight = null;
          const boss = f.boss;
          this.endCast(res.caught || !boss);
          if (!res.caught) { FR.sfx('bad'); U.toast(this, res.msg, '#ff9c9c'); return; }
          const size = FR.landFish(this, id, check.bruise ? 'bruised' : res.cut, cast.match);
          if (boss && size) {
            S.bossBeaten = true;
            const r = D.recipes.find(x => x.legendary && x.fish[id]);
            if (r) FR.unlockRecipe(r.id);
            J.pop(this, 480, 200, 'OLD WHISKERS IS YOURS!', '#ffe14d', 46); J.shake(this, 0.015);
            U.toast(this, `You beat ${f.name}! Legendary recipe unlocked: ${r.name}.`, '#ffe14d');
          }
        }
      });
    }

    finish() {
      if (this.finished || this.fight) return;
      this.finished = true;
      this.traps.filter(t => t.t <= 0).forEach(t => this.collectTrap(t));
      this.scene.start('Prep');
    }

    update(time, delta) {
      if (this.finished) return;
      const S = FR.state;
      const dt = Math.min(delta, 100) / 1000;
      const inp = this.inp.poll();
      this.timeLeft -= dt * FR.dev.speed;
      this.hud.set(U.clock(this.timeLeft));
      this.shimmer.tilePositionX += dt * 8;

      if (this.fight) { this.prompt.setVisible(false); this.fight.update(dt, inp); return; }

      // schools drift away after a while
      for (const sp of this.spots.slice()) {
        if (this.cast && this.cast.sp === sp) continue;
        sp.life -= dt;
        if (sp.life <= 0) this.removeSpot(sp, true);
      }
      for (const tr of this.traps) {
        tr.t -= dt;
        tr.label.setText(tr.t > 0 ? Math.ceil(tr.t) + 's' : 'READY!').setColor(tr.t > 0 ? '#ffffff' : '#9cffb0');
      }

      const full = S.tank.length >= FR.tankCap();
      if (this.cast) {
        const c = this.cast;
        this.lineG.clear(); this.lineG.lineStyle(2, 0xfff6d6, 0.9); this.lineG.lineBetween(this.boat.x, this.boat.y, this.bobber.x, this.bobber.y);
        c.t -= dt;
        if (c.phase === 'wait') {
          this.bobber.y = c.sp.y + Math.sin(time / 160) * 2;
          this.prompt.setText('Wait for the bite…');
          if (inp.just) { U.toast(this, 'Too early! You scared them off.', '#ffe9a8'); this.endCast(true); }
          else if (c.t <= 0) {
            if (c.ignore) { U.toast(this, 'Something huge glints below, but it ignores your bait. It wants something shinier.', '#ffe9a8'); this.endCast(false); }
            else { c.phase = 'bite'; c.t = C.biteWindow; this.bang.setPosition(c.sp.x, c.sp.y - 46).setVisible(true); FR.sfx('bite'); }
          }
        } else if (c.phase === 'bite') {
          this.prompt.setText('NOW! Press SPACE!');
          this.bobber.y = c.sp.y + 8;
          if (inp.just) this.hook();
          else if (c.t <= 0) { FR.sfx('bad'); U.toast(this, 'Too slow. It spat the hook.', '#ff9c9c'); this.endCast(true); }
        }
      } else {
        this.lineG.clear();
        // steer
        if (inp.floorClick && inp.py > 44 && inp.py < 536) this.target = { x: inp.px, y: inp.py };
        let vx = inp.mx, vy = inp.my;
        if (vx || vy) this.target = null;
        else if (this.target) {
          const dx = this.target.x - this.boat.x, dy = this.target.y - this.boat.y, d = Math.hypot(dx, dy);
          if (d < 8) this.target = null; else { vx = dx / d; vy = dy / d; }
        }
        const len = Math.hypot(vx, vy);
        if (len > 0) {
          this.boat.x = Phaser.Math.Clamp(this.boat.x + vx / len * C.boatSpeed * dt, 34, 926);
          this.boat.y = Phaser.Math.Clamp(this.boat.y + vy / len * C.boatSpeed * dt, 84, 520);
          this.boat.rotation = Phaser.Math.Angle.RotateTo(this.boat.rotation, Math.atan2(vy, vx) + Math.PI / 2, dt * 7);
          this.wakeT -= dt;
          if (this.wakeT <= 0) { this.wakeT = 0.09; const w = this.add.circle(this.boat.x - vx / len * 40, this.boat.y - vy / len * 40, 6, 0xffffff, 0.5).setDepth(5); this.tweens.add({ targets: w, scale: 2.4, alpha: 0, duration: 800, onComplete: () => w.destroy() }); }
        }

        // what is in reach?
        const near = (o, r) => Math.hypot(o.x - this.boat.x, o.y - this.boat.y) < r;
        const trap = this.traps.find(t => t.t <= 0 && near(t, 60));
        const sp = this.spots.filter(s => near(s, C.spotRadius)).sort((a, b) => Math.hypot(a.x - this.boat.x, a.y - this.boat.y) - Math.hypot(b.x - this.boat.x, b.y - this.boat.y))[0];
        if (trap) {
          this.prompt.setText(full ? 'The fish tank is full!' : 'SPACE: haul up the crab trap');
          if (inp.just && !full) this.collectTrap(trap);
        } else if (sp) {
          const f = D.fish[sp.id], known = S.journal[sp.id];
          const info = known ? `${f.name} — likes ${D.baits[f.bait].name}, use the ${D.gear[f.gear[0]].name}` : f.boss ? `${f.name}: ${f.tip}` : 'Unknown fish. Try a cast and learn what it is.';
          this.prompt.setText(full ? 'The fish tank is full!' : `SPACE: cast with ${D.gear[S.useGear].name}${S.bait ? ' + ' + D.baits[S.bait].name : ''}\n${info}`);
          if (inp.just && !full) this.startCast(sp);
        } else this.prompt.setText('');
        this.prompt.setVisible(!!this.prompt.text);
      }
      if (this.timeLeft <= 0 && !this.cast) this.finish();
    }
  }

  FR.FishingScene = FishingScene;
})();
