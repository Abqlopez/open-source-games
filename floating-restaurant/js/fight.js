// The fish fight (v2). Every fish has stamina and you watch the line tension:
// reel while it is tired, ease off while it runs, and dodge its special move.
(function () {
  const U = FR.ui, D = FR.DATA, C = D.config, J = () => FR.juice;

  FR.Fight = class {
    // o: gear, baitMatch, depth, onDone({ caught, cut, msg })
    constructor(scene, fishId, o) {
      this.s = scene; this.o = o; this.id = fishId;
      const f = this.fish = D.fish[fishId];
      const F = C.fight;
      this.dist = 1; this.tension = 0.15; this.maxTension = 0; this.hits = 0; this.t = 0;
      this.stamina = o.baitMatch ? C.baitStamina : 1;
      this.stage = 1; this.stages = f.stages || 1;
      this.lineK = (o.gear === 'heavy' || o.gear === 'harpoon') ? F.heavyRod : 1;
      this.state = 'run'; this.timer = 1.2;
      this.special = null; this.nextSpecial = FR.rand(F.specialEvery[0], F.specialEvery[1]) * 0.7;

      const p = this.panel = U.panel(scene, 600, 330, f.name, o.depth || 9200);
      p.add(U.text(scene, 0, -118, f.tip, 13, '#ffffff').setOrigin(0.5));
      p.add(scene.add.image(0, -18, 'reelbg').setDisplaySize(560, 170));
      p.add(scene.add.image(-250, -18, 'chef').setScale(0.9));
      this.lineG = scene.add.graphics(); p.add(this.lineG);
      this.body = scene.add.image(0, -18, 'fish_' + fishId).setScale(f.boss ? 1.5 : 1.05); p.add(this.body);
      this.flash = U.title(scene, 0, -78, '', 26, '#fff27a').setOrigin(0.5); p.add(this.flash);
      this.status = U.title(scene, 0, 88, '', 22, '#9cffb0').setOrigin(0.5); p.add(this.status);
      // meters
      p.add(U.text(scene, -270, 118, 'LINE TENSION', 12, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0, 0.5));
      this.meters = scene.add.container(0, 0); p.add(this.meters);
      [[0x3f8f4f, 0, 0.6], [0xd9a020, 0.6, 0.85], [0xb3262b, 0.85, 1]].forEach(([col, a, b]) => this.meters.add(scene.add.rectangle(-160 + a * 420, 118, (b - a) * 420, 20, col).setOrigin(0, 0.5)));
      this.meters.add(scene.add.rectangle(-160, 118, 420, 20).setOrigin(0, 0.5).setStrokeStyle(3, 0x2b2140));
      this.needle = scene.add.rectangle(-160, 118, 8, 32, 0xffffff).setStrokeStyle(3, 0x2b2140); this.meters.add(this.needle);
      this.meters.add(U.text(scene, -270, 144, 'FISH STAMINA', 12, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0, 0.5));
      this.sbar = U.bar(scene, -160, 144, 420, 10, 0x5bd1ff); this.meters.add(this.sbar.objs);
      this.inkG = scene.add.container(0, 0); p.add(this.inkG);
      // spark prompts for the Dragon Koi
      this.arrows = scene.add.container(0, -18); p.add(this.arrows);
      if (FR.dev.auto) this.auto = true;
    }

    startSpecial() {
      const sp = this.fish.special === 'boss' ? FR.pick(['zap', 'dive', 'zap']) : this.fish.special;
      if (!sp || sp === 'none') return;
      this.special = { type: sp, t: 0, phase: 'warn', dur: { blink: 1.3, zap: 0.7, dive: 2.5, ink: 3, sparks: 2.9, phase: 1.6 }[sp], hit: false };
      FR.sfx('bite');
    }

    endSpecial() {
      const sp = this.special;
      this.special = null;
      this.body.setAlpha(1).clearTint();
      this.meters.setAlpha(1);
      this.inkG.removeAll(true);
      this.arrows.removeAll(true);
      this.flash.setText('');
      this.nextSpecial = FR.rand(C.fight.specialEvery[0], C.fight.specialEvery[1]);
      if (sp && sp.type === 'dive') { this.state = 'tired'; this.timer = 1.6; }
    }

    hit(amount) { this.tension += amount; this.hits++; FR.sfx('bad'); J().shake(this.s, 0.008); }

    runSpecial(dt, inp) {
      const sp = this.special, name = this.fish.special === 'boss' ? { zap: 'TAIL SLAM', dive: 'DEEP DIVE' }[sp.type] : null;
      sp.t += dt;
      if (sp.phase === 'warn') {
        this.flash.setText('! ! !');
        if (sp.t >= 0.6) {
          sp.phase = 'on'; sp.t = 0;
          if (sp.type === 'zap') { FR.sfx('zap'); J().shake(this.s, 0.006); }
          if (sp.type === 'dive') { this.state = 'run'; this.timer = sp.dur; }
          if (sp.type === 'ink') { FR.sfx('splash'); for (let i = 0; i < 9; i++) this.inkG.add(this.s.add.circle(FR.rand(-200, 240), FR.rand(100, 150), FR.rand(26, 44), 0x1a1026, 0.96)); }
          if (sp.type === 'sparks') { sp.seq = [0, 1, 2].map(() => FR.pick(['up', 'down', 'left', 'right'])); sp.pos = 0; this.showArrow(sp); }
        }
        return;
      }
      if (sp.type === 'blink') {
        this.flash.setText('It vanished — stop reeling!');
        this.body.setAlpha(0.08);
        if (inp.down && sp.t > 0.3) { this.tension += 1.1 * dt; sp.hit = true; }
      } else if (sp.type === 'zap') {
        this.flash.setText(name || 'ZAP! Let go!');
        this.body.setTintFill(0xffffff);
        if (inp.down && sp.t > 0.2 && !sp.hit) { sp.hit = true; this.hit(0.3); }
      } else if (sp.type === 'dive') {
        this.flash.setText(name || 'DEEP DIVE — let it run!');
      } else if (sp.type === 'ink') {
        this.flash.setText('INKED! Feel the line…');
      } else if (sp.type === 'phase') {
        this.flash.setText('It fades into the dark…');
        this.body.setAlpha(0.15); this.meters.setAlpha(0.06);
      } else if (sp.type === 'sparks') {
        this.flash.setText('Repeat the sparks! (arrow keys / WASD)');
        let pressed = inp.dir;
        if (inp.pjust) this.arrows.each(a => { if (a.dirName && Math.hypot(inp.px - (this.panel.x + a.x), inp.py - (this.panel.y - 18 + a.y)) < 28) pressed = a.dirName; });
        sp.step = (sp.step || 0) + dt;
        if (pressed || sp.step > 0.95) {
          if (pressed === sp.seq[sp.pos]) { FR.sfx('blip'); J().burst(this.s, this.panel.x, this.panel.y - 18, 0xffd23c, 6); } else this.hit(0.22);
          sp.pos++; sp.step = 0;
          if (sp.pos >= sp.seq.length) { this.endSpecial(); return; }
          this.showArrow(sp);
        }
        return;
      }
      if (sp.t >= sp.dur) { if (sp.hit && sp.type === 'blink') this.hits++; this.endSpecial(); }
    }

    showArrow(sp) {
      this.arrows.removeAll(true);
      const want = sp.seq[sp.pos], rot = { up: 0, right: 90, down: 180, left: 270 };
      // the spark to copy, big in the middle, and four tappable arrows around it
      const big = this.s.add.image(0, -4, 'arrow').setAngle(rot[want]).setScale(1.5); this.arrows.add(big);
      [['up', 0, -62], ['down', 0, 54], ['left', -70, -4], ['right', 70, -4]].forEach(([d, x, y]) => { const a = this.s.add.image(x, y, 'arrow').setAngle(rot[d]).setScale(0.8).setAlpha(0.55); a.dirName = d; this.arrows.add(a); });
    }

    finish(res) {
      this.panel.destroy();
      this.o.onDone(res);
    }

    update(dt, inp) {
      const F = C.fight, f = this.fish;
      if (this.auto) { this.finish({ caught: true, cut: 'perfect' }); return; }
      this.t += dt;
      const power = f.power * (0.45 + 0.55 * this.stamina) * (1 + (this.stage - 1) * 0.2);

      // the fish alternates between running and resting; it rests longer as it tires
      this.timer -= dt;
      if (this.timer <= 0 && !(this.special && this.special.type === 'dive' && this.special.phase === 'on')) {
        if (this.state === 'run') { this.state = 'tired'; this.timer = FR.rand(1.3, 2.3) * (1.5 - this.stamina * 0.5); }
        else { this.state = 'run'; this.timer = FR.rand(0.9, 1.8) * (0.5 + this.stamina * 0.5); FR.sfx('splash'); }
      }
      if (!this.special) { this.nextSpecial -= dt; if (this.nextSpecial <= 0) this.startSpecial(); }
      if (this.special) { this.runSpecial(dt, inp); if (!this.panel.active) return; }

      const running = this.state === 'run';
      if (inp.down) {
        if (running) { this.dist -= F.runReel * dt; this.tension += F.tensionRun * (0.5 + power) * this.lineK * dt; this.stamina -= F.tireReel * dt; }
        else { this.dist -= F.reel / f.stamina * dt; this.tension += F.tensionReel * this.lineK * dt; }
      } else {
        this.tension -= F.tensionDrop * dt;
        if (running) { this.dist += F.runPull * (0.6 + power) * dt; this.stamina -= F.tireRest * dt; }
      }
      this.tension = Math.max(0, this.tension);
      this.stamina = Math.max(0, this.stamina);
      this.maxTension = Math.max(this.maxTension, this.tension);

      // draw
      const fx = -190 + Math.min(1.4, Math.max(0, this.dist)) * 300;
      this.body.x += (fx - this.body.x) * Math.min(1, dt * 8);
      this.body.y = -18 + Math.sin(this.t * (running ? 16 : 3)) * (running ? 5 : 3);
      this.body.flipX = !running;
      this.lineG.clear();
      this.lineG.lineStyle(2, this.tension > 0.85 ? 0xff5b5b : 0xfff6d6, 0.95);
      this.lineG.lineBetween(-226, -52, this.body.x + (running ? -40 : 40), this.body.y);
      this.needle.x = -160 + Math.min(1, this.tension) * 420;
      if (this.tension > 0.85) this.needle.x += FR.rand(-2, 2);
      this.sbar.set(this.stamina);
      const stageTxt = this.stages > 1 ? `  (round ${this.stage}/${this.stages})` : '';
      this.status.setText((running ? "It's RUNNING — ease off!" : "It's tired — REEL!") + stageTxt).setColor(running ? '#ff9c9c' : '#9cffb0');

      if (this.tension >= 1) { J().shake(this.s, 0.012); this.finish({ caught: false, msg: 'SNAP! Too much tension. The line broke.' }); return; }
      if (this.dist >= F.escapeAt) { this.finish({ caught: false, msg: 'You gave it too much slack. It swam off.' }); return; }
      if (this.dist <= 0) {
        if (this.stage < this.stages) {
          this.stage++; this.dist = 1; this.stamina = 1; this.tension = 0.2; this.state = 'run'; this.timer = 1.5;
          if (this.special) this.endSpecial();
          FR.sfx('good'); J().pop(this.s, this.panel.x, this.panel.y - 40, 'HARPOON HIT!', '#ffe14d', 34); J().shake(this.s, 0.01);
          return;
        }
        const cut = this.hits === 0 && this.maxTension < 0.9 ? 'perfect' : this.hits >= 2 ? 'bruised' : 'normal';
        this.finish({ caught: true, cut });
      }
    }

    destroy() { if (this.panel.active) this.panel.destroy(); }
  };

  // What happens when a hook goes in: does this gear work on this fish?
  // Returns { fight: true } or { fail: msg } or { scoop: n } or { bruise: true, fight: true }.
  FR.gearCheck = function (fishId, gear) {
    const f = D.fish[fishId];
    if (f.gear.includes(gear)) return gear === 'net' ? { scoop: 3 + Math.floor(Math.random() * 2) } : { fight: true };
    if (f.boss) return { fail: `${f.name} snaps your line like thread. Only a harpoon will stop it.` };
    if (gear === 'net') return { fail: `The ${f.name} slipped right through the net.` };
    if (gear === 'harpoon') return { fail: `A harpoon is far too much for a ${f.name}. It bolts.` };
    if (gear === 'light') return { fail: `SNAP! The ${f.name} is too strong for a light rod.` };
    return { fight: true, bruise: true }; // heavy rod on a small fish
  };
})();
