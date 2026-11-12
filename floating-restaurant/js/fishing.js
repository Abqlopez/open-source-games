// Fishing: the cast -> bite -> reel rig (shared by the morning and by live
// catches off the dining deck), plus the morning Fishing screen.
(function () {
  const U = FR.ui, D = FR.DATA, C = D.config;

  FR.pickFish = function (zone, o) {
    const S = FR.state;
    const w = Object.assign({}, D.zones[zone], (D.areas[S.area].zones || {})[zone] || {});
    for (const id in w) {
      const f = D.fish[id];
      if (o.night && f.nightBoost) w[id] *= f.nightBoost;
      if (f.rarity === 'rare' || f.rarity === 'legendary') {
        if (o.bait) w[id] *= C.baitBoost;
        if (o.spot) w[id] *= C.spotBoost;
      }
    }
    return FR.weighted(w);
  };

  FR.rodMods = function () {
    const lvl = FR.state.upgrades.rod;
    return { ease: 1 + C.rodEase * lvl, line: C.baseLineStrength + lvl, reach: C.rodReach[lvl] };
  };

  FR.FishingRig = class {
    // o: tipX, tipY, waterY, castMinX, castMaxX, hintX, hintY, depth, night, quick,
    //    canFish(), bait(), spot(), onCatch(id, cut, count), onFail(msg), onInfo(msg)
    constructor(scene, o) {
      this.s = scene; this.o = o;
      const d = o.depth || 20;
      this.d = d;
      this.state = 'idle'; this.t = 0;
      this.g = scene.add.graphics().setDepth(d);
      this.bobber = scene.add.image(0, 0, 'bobber').setOrigin(0.5, 0.6).setDepth(d + 1).setVisible(false);
      this.bang = U.title(scene, 0, 0, '!', 54, '#ffe14d')
        .setOrigin(0.5).setDepth(d + 2).setVisible(false);
      this.hint = U.text(scene, o.hintX, o.hintY, '', 15, '#ffffff', { backgroundColor: '#2b2140dd', padding: { x: 12, y: 6 } })
        .setOrigin(0.5).setDepth(d + 2);
      this.pbar = U.bar(scene, o.tipX - 50, o.tipY - 34, 100, 12, 0xffc93c);
      this.pbar.objs.forEach(x => x.setDepth(d + 2).setVisible(false));
    }
    busy() { return ['flying', 'bite', 'reel'].includes(this.state); }
    setHint(m) { if (this.hint.text !== m) this.hint.setText(m); this.hint.setVisible(!!m); }
    rest() {
      this.bobber.setVisible(false); this.bang.setVisible(false);
      this.pbar.objs.forEach(x => x.setVisible(false));
      this.state = 'rest'; this.restT = 0.7; this.setHint('');
    }
    zoneOf(f) { return f < C.zoneEdges.near ? 'near' : f < C.zoneEdges.mid ? 'mid' : 'far'; }

    startReel() {
      const o = this.o;
      const id = FR.pickFish(this.zone, { night: o.night, bait: o.bait && o.bait(), spot: o.spot && o.spot() });
      const fish = D.fish[id];
      this.fishId = id;
      this.setHint('');
      if (FR.dev.auto) { this.rest(); o.onCatch(id, 'perfect', fish.reel.type === 'school' ? 3 : 1); return; }
      this.panel = U.panel(this.s, 560, 250, fish.name, this.d + 30);
      this.panel.add(U.text(this.s, 0, -80, fish.reel.hint, 13, '#ffffff').setOrigin(0.5));
      this.panel.add(this.s.add.image(0, 22, 'reelbg'));
      this.game = new FR.Reel[fish.reel.type](this.s, this.panel, fish, FR.rodMods());
      this.state = 'reel';
    }

    update(dt, inp) {
      const o = this.o;
      this.t += dt;
      this.g.clear();
      if (this.bobber.visible) {
        this.g.lineStyle(2, 0xfff6d6, 0.9);
        this.g.lineBetween(o.tipX, o.tipY, this.bobber.x, this.bobber.y);
      }
      switch (this.state) {
        case 'idle':
          if (!o.canFish()) { this.setHint('The fish tank is full!'); return; }
          this.setHint('Hold SPACE to charge your cast, release to throw');
          if (inp.just) {
            this.state = 'charging'; this.power = 0; this.pdir = 1;
            this.pbar.objs.forEach(x => x.setVisible(true));
          }
          break;
        case 'charging':
          this.power += this.pdir * dt * 1.2;
          if (this.power >= 1) { this.power = 1; this.pdir = -1; }
          if (this.power <= 0) { this.power = 0; this.pdir = 1; }
          this.pbar.set(this.power);
          this.setHint('Release to cast! More power = farther = rarer fish');
          if (!inp.down) {
            this.pbar.objs.forEach(x => x.setVisible(false));
            this.f = Math.max(0.08, this.power * FR.rodMods().reach);
            this.tx = o.castMinX + this.f * (o.castMaxX - o.castMinX);
            this.zone = this.zoneOf(this.f);
            this.ft = 0; this.state = 'flying';
            this.bobber.setVisible(true).setPosition(o.tipX, o.tipY);
          }
          break;
        case 'flying': {
          this.ft += dt / 0.45;
          const k = Math.min(1, this.ft);
          this.bobber.setPosition(o.tipX + (this.tx - o.tipX) * k, o.tipY + (o.waterY - o.tipY) * k - Math.sin(Math.PI * k) * 70);
          if (k >= 1) {
            this.state = 'waiting';
            this.wait = FR.rand(C.biteWait[0], C.biteWait[1]) * (o.quick ? 0.45 : 1) * (o.spot && o.spot() ? 0.6 : 1);
            FR.sfx('blip');
          }
          break;
        }
        case 'waiting':
          this.wait -= dt;
          this.bobber.y = o.waterY + Math.sin(this.t * 4) * 2;
          this.setHint(`Line is in ${this.zone} water… wait for the bite`);
          if (inp.just) { this.rest(); if (o.onInfo) o.onInfo('Too early! You scared the fish off.'); return; }
          if (this.wait <= 0) {
            this.state = 'bite'; this.biteT = C.biteWindow;
            this.bang.setVisible(true).setPosition(this.bobber.x, this.bobber.y - 46);
            FR.sfx('bite');
          }
          break;
        case 'bite':
          this.biteT -= dt;
          this.bobber.y = o.waterY + 9;
          this.setHint('NOW! Press SPACE!');
          if (inp.just) { this.bang.setVisible(false); this.startReel(); }
          else if (this.biteT <= 0) { this.rest(); o.onFail('Too slow. The fish escaped.'); }
          return;
        case 'reel': {
          const r = this.game.update(dt, inp);
          if (r) {
            const id = this.fishId;
            this.panel.destroy(); this.panel = null; this.game = null;
            this.rest();
            if (r.caught) o.onCatch(id, r.cut, r.count || 1);
            else o.onFail(r.msg || 'It got away!');
          }
          return;
        }
        case 'rest':
          this.restT -= dt;
          if (this.restT <= 0) this.state = 'idle';
          break;
      }
    }

    destroy() {
      [this.g, this.bobber, this.bang, this.hint, this.pbar.bg, this.pbar.fill].forEach(x => x.destroy());
      if (this.panel) this.panel.destroy();
    }
  };

  // Side view of the boat, used on the title and fishing screens.
  FR.drawBoat = function (s, x, y) {
    const S = FR.state || FR.newState();
    const boat = s.add.image(x, y, 'boat_' + S.theme).setOrigin(0.5, 150 / 190).setDepth(5);
    s.tweens.add({ targets: boat, angle: { from: -0.8, to: 0.8 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (S.decor.sign) {
      s.add.image(x - 30, y - 112, 'plank').setScale(0.62).setDepth(6);
      U.text(s, x - 30, y - 112, 'FLOATING RESTAURANT', 10, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0.5).setDepth(6);
    }
    if (S.decor.lanterns) [-88, -40, 8].forEach(dx => s.add.image(x + dx, y - 62, 'lantern').setScale(0.7).setDepth(6));
    if (S.decor.plants) [-118, 118].forEach(dx => s.add.image(x + dx, y - 44, 'plant').setScale(0.7).setDepth(6));
    return { tipX: x + 100, tipY: y - 92 };
  };

  // Sky, drifting clouds, water and a scrolling wave line. Returns the wave strip to animate.
  FR.drawSea = function (s, areaId) {
    FR.art.build(s);
    s.add.image(480, 170, 'sky_' + areaId);
    [[160, 70, 1], [520, 120, 0.7], [760, 50, 0.85]].forEach(([x, y, sc], i) => {
      const cl = s.add.image(x, y, 'cloud').setScale(sc).setAlpha(0.9);
      s.tweens.add({ targets: cl, x: x + 60, duration: 16000 + i * 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    s.add.image(480, 455, 'water_' + areaId);
    // fish shadows drifting under the surface
    ['sardine', 'glowgill', 'bluefin_tuna', 'sardine'].forEach((id, i) => {
      const f = s.add.image(-80, 380 + i * 48, 'fish_' + id).setScale(0.5 + (i % 2) * 0.2).setTintFill(0x0a2a4a).setAlpha(0.28);
      s.tweens.add({ targets: f, x: 1040, duration: 14000 + i * 4000, delay: i * 3000, repeat: -1 });
    });
    const wave = s.add.tileSprite(480, 312, 960, 18, 'wave').setDepth(7);
    const wave2 = s.add.tileSprite(480, 330, 960, 18, 'wave').setDepth(1).setAlpha(0.4);
    return { update(dt) { wave.tilePositionX += dt * 26; wave2.tilePositionX -= dt * 14; } };
  };

  class FishingScene extends Phaser.Scene {
    constructor() { super('Fishing'); }

    create() {
      const S = FR.state, area = D.areas[S.area];
      this.inp = FR.makeInput(this);
      this.timeLeft = C.morningSeconds;
      this.finished = false;

      this.sea = FR.drawSea(this, S.area);

      const minX = 290, maxX = 930, range = maxX - minX;
      const edges = [0, C.zoneEdges.near, C.zoneEdges.mid, 1];
      ['NEAR', 'MID', 'FAR — rare fish'].forEach((name, i) => {
        const x0 = minX + edges[i] * range, x1 = minX + edges[i + 1] * range;
        if (i > 0) {
          const bu = this.add.image(x0, 306, 'buoy').setDepth(8);
          this.tweens.add({ targets: bu, y: 310, angle: { from: -6, to: 6 }, duration: 1500 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        U.text(this, (x0 + x1) / 2, 346, name, 13, '#ffffff', { fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.75);
      });

      const tip = FR.drawBoat(this, 150, 300);
      this.hud = U.hud(this, 'Morning');

      this.rig = new FR.FishingRig(this, {
        tipX: tip.tipX, tipY: tip.tipY, waterY: 312, castMinX: minX, castMaxX: maxX,
        hintX: 480, hintY: 566, night: false,
        canFish: () => S.tank.length < FR.tankCap(),
        bait: () => S.baitActive,
        spot: () => S.spot && S.useSpot,
        onCatch: (id, cut, count) => this.caught(id, cut, count),
        onFail: msg => { FR.sfx('bad'); U.toast(this, msg, '#ff9c9c'); },
        onInfo: msg => U.toast(this, msg, '#ffe9a8')
      });

      this.btns = this.add.container(0, 0).setDepth(30);
      this.tankRow = this.add.container(0, 0).setDepth(30);
      this.drawButtons();
      this.drawTank();
      this.inp.addActionButton(895, 505);
    }

    drawButtons() {
      const S = FR.state;
      this.btns.removeAll(true);
      this.btns.add(U.button(this, 870, 62, 160, 32, 'Finish morning ▶', () => this.finish(), { color: 0x3f8f4f }));
      if (S.baitActive) this.btns.add(U.button(this, 690, 62, 170, 32, 'Bait is on the hook', () => {}, { enabled: false }));
      else if (S.bait > 0) {
        this.btns.add(U.button(this, 690, 62, 170, 32, `Use bait (${S.bait} left)`, () => {
          S.bait--; S.baitActive = true;
          U.toast(this, 'Bait on! Better odds of rare fish this morning.', '#9cffb0');
          this.drawButtons();
        }));
      }
      if (S.spot) {
        this.btns.add(U.button(this, 500, 62, 190, 32, S.useSpot ? 'Spot: Sunken Reef ✓' : 'Spot: open water', () => {
          S.useSpot = !S.useSpot;
          U.toast(this, S.useSpot ? 'Sunken Reef: faster bites, more rare fish.' : 'Back to open water.', '#ffe9a8');
          this.drawButtons();
        }, { color: 0x7a4e9c }));
      }
    }

    drawTank() {
      const S = FR.state;
      this.tankRow.removeAll(true);
      this.tankRow.add(U.card(this, 130, 492, 240, 150, 0x1d3557, 0.85));
      this.tankRow.add(U.text(this, 24, 426, `Fish tank  ${S.tank.length}/${FR.tankCap()}`, 15, '#ffe9a8', { fontStyle: 'bold' }));
      S.tank.forEach((f, i) => {
        const x = 44 + (i % 5) * 43, y = 462 + Math.floor(i / 5) * 22;
        const im = this.add.image(x, y, 'fish_' + f.id).setScale(0.32);
        if (FR.freshness(f) === 'ok') im.setTint(0xc9b98a);
        this.tankRow.add(im);
      });
    }

    caught(id, cut, count) {
      const S = FR.state, f = D.fish[id];
      const n = Math.min(count, FR.tankCap() - S.tank.length);
      for (let i = 0; i < n; i++) FR.addFish(id, cut);
      FR.sfx('good');
      const note = cut === 'perfect' ? ' — clean catch, Perfect cut!' : cut === 'bruised' ? ' — rough fight, it is bruised.' : '';
      U.toast(this, `Caught ${f.name}${n > 1 ? ' ×' + n : ''}${note}`, cut === 'bruised' ? '#ffe9a8' : '#9cffb0');
      this.drawTank();
    }

    finish() {
      if (this.finished) return;
      this.finished = true;
      this.scene.start('Prep');
    }

    update(time, delta) {
      if (this.finished) return;
      const dt = Math.min(delta, 100) / 1000;
      const inp = this.inp.poll();
      this.timeLeft -= dt * FR.dev.speed;
      this.sea.update(dt);
      this.rig.update(dt, inp);
      this.hud.set(U.clock(this.timeLeft));
      if (this.timeLeft <= 0 && !this.rig.busy()) this.finish();
    }
  }

  FR.FishingScene = FishingScene;
})();
