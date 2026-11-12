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
      this.bobber = scene.add.circle(0, 0, 7, 0xff5040).setStrokeStyle(2, 0xffffff).setDepth(d + 1).setVisible(false);
      this.bang = U.text(scene, 0, 0, '!', 44, '#ffe14d', { fontStyle: 'bold', stroke: '#000000', strokeThickness: 5 })
        .setOrigin(0.5).setDepth(d + 2).setVisible(false);
      this.hint = U.text(scene, o.hintX, o.hintY, '', 15, '#ffffff', { backgroundColor: '#000000aa', padding: { x: 10, y: 5 } })
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
      this.panel.add(U.text(this.s, 0, -78, fish.reel.hint, 13, '#ffffff').setOrigin(0.5));
      this.game = new FR.Reel[fish.reel.type](this.s, this.panel, fish, FR.rodMods());
      this.state = 'reel';
    }

    update(dt, inp) {
      const o = this.o;
      this.t += dt;
      this.g.clear();
      if (this.bobber.visible) {
        this.g.lineStyle(1.5, 0xffffff, 0.85);
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
    const S = FR.state || FR.newState(), th = D.themes[S.theme];
    const g = s.add.graphics().setDepth(5);
    g.fillStyle(th.hull, 1);
    g.fillPoints([{ x: x - 120, y: y - 20 }, { x: x + 120, y: y - 20 }, { x: x + 90, y: y + 28 }, { x: x - 95, y: y + 28 }], true);
    g.fillStyle(th.trim, 1);
    g.fillRect(x - 120, y - 26, 240, 8);
    g.fillStyle(th.deck, 1);
    g.fillRect(x - 90, y - 78, 110, 52);           // cabin
    g.fillStyle(th.trim, 1);
    g.fillRect(x - 98, y - 88, 126, 12);           // roof
    g.fillStyle(0x16324a, 1);
    g.fillRect(x - 76, y - 64, 26, 22);
    g.fillRect(x - 38, y - 64, 26, 22);
    // the captain and the rod
    g.fillStyle(0x2f6f8f, 1);
    g.fillRect(x + 42, y - 58, 16, 32);
    g.fillStyle(0xe8b98a, 1);
    g.fillCircle(x + 50, y - 68, 10);
    g.lineStyle(3, 0x5b4630, 1);
    g.lineBetween(x + 56, y - 46, x + 100, y - 92);
    if (S.decor.sign) U.text(s, x - 35, y - 100, 'FLOATING RESTAURANT', 10, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0.5).setDepth(6);
    if (S.decor.lanterns) [-80, -20, 30].forEach(dx => s.add.circle(x + dx, y - 34, 5, 0xffc56b).setDepth(6));
    if (S.decor.plants) [-108, 108].forEach(dx => s.add.circle(x + dx, y - 34, 8, 0x4caf50).setDepth(6));
    return { tipX: x + 100, tipY: y - 92 };
  };

  class FishingScene extends Phaser.Scene {
    constructor() { super('Fishing'); }

    create() {
      const S = FR.state, area = D.areas[S.area];
      this.inp = FR.makeInput(this);
      this.timeLeft = C.morningSeconds;
      this.finished = false;

      this.add.rectangle(480, 170, 960, 340, area.sky);
      this.add.circle(820, 110, 40, 0xfff3b0);
      this.add.rectangle(480, 455, 960, 290, area.water);
      for (let i = 0; i < 6; i++) this.add.rectangle(FR.rand(250, 930), FR.rand(340, 580), FR.rand(30, 70), 3, 0xffffff, 0.18);

      const minX = 290, maxX = 930, range = maxX - minX;
      const edges = [0, C.zoneEdges.near, C.zoneEdges.mid, 1];
      ['NEAR', 'MID', 'FAR — rare fish'].forEach((name, i) => {
        const x0 = minX + edges[i] * range, x1 = minX + edges[i + 1] * range;
        if (i > 0) this.add.rectangle(x0, 455, 2, 290, 0xffffff, 0.25);
        U.text(this, (x0 + x1) / 2, 326, name, 12, '#ffffff').setOrigin(0.5).setAlpha(0.7);
      });

      const tip = FR.drawBoat(this, 135, 300);
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
      this.inp.addActionButton(895, 500);
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
      this.tankRow.add(U.text(this, 16, 356, `Fish tank ${S.tank.length}/${FR.tankCap()}`, 13, '#ffffff'));
      S.tank.forEach((f, i) => {
        const x = 28 + (i % 9) * 24, y = 388 + Math.floor(i / 9) * 18;
        this.tankRow.add(this.add.ellipse(x, y, 20, 10, D.fish[f.id].color).setStrokeStyle(1, FR.freshness(f) === 'ok' ? 0x8a6d00 : 0xffffff));
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
      this.rig.update(dt, inp);
      this.hud.set(U.clock(this.timeLeft));
      if (this.timeLeft <= 0 && !this.rig.busy()) this.finish();
    }
  }

  FR.FishingScene = FishingScene;
})();
