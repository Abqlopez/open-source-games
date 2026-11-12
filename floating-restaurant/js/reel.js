// Reeling minigames. Every fish has its own personality; there is no generic reel bar.
// Each game draws inside a panel container and returns null from update() until it
// finishes with { caught, cut: 'perfect' | 'normal' | 'bruised', count?, msg? }.
(function () {
  const U = FR.ui;

  class Base {
    constructor(scene, c, fish, mods) {
      this.s = scene; this.c = c; this.fish = fish;
      this.ease = mods.ease;   // > 1 with a better rod: more forgiving
      this.line = mods.line;   // mistakes the line survives
      this.speed = (fish.reel.speed || 1) / mods.ease;
      this.t = 0;
      this.status = this.add(U.text(scene, 0, 100, '', 15, '#ffffff').setOrigin(0.5));
    }
    add(o) { this.c.add(o); return o; }
    local(inp) { return { x: inp.px - this.c.x, y: inp.py - this.c.y }; }
    bar(x, y, w, h, color) { const b = U.bar(this.s, x, y, w, h, color); this.c.add(b.objs); return b; }
  }

  // Sardine: swipe through the school to scoop several at once.
  class School extends Base {
    constructor(...a) {
      super(...a);
      this.time0 = this.time = 4.5 * this.ease;
      this.count = 0;
      this.fishes = [];
      for (let i = 0; i < 5; i++) {
        const e = this.add(this.s.add.image(FR.rand(-200, 200), FR.rand(-40, 60), 'fish_' + this.fish.id).setScale(0.45));
        e.vx = FR.rand(70, 130) * (Math.random() < 0.5 ? -1 : 1) * this.speed;
        e.vy = FR.rand(-50, 50) * this.speed;
        this.fishes.push(e);
      }
      this.net = this.add(this.s.add.image(0, 0, 'net'));
      this.tbar = this.bar(-150, -52, 300, 8, 0x6fdc6f);
    }
    update(dt, inp) {
      this.time -= dt;
      const p = this.local(inp);
      this.net.setPosition(p.x, p.y).setAlpha(inp.pdown ? 1 : 0.35);
      for (const f of this.fishes) {
        if (f.gone) continue;
        f.x += f.vx * dt; f.y += f.vy * dt; f.flipX = f.vx < 0;
        if (f.x < -250 || f.x > 250) { f.vx *= -1; f.x = Math.max(-250, Math.min(250, f.x)); }
        if (f.y < -40 || f.y > 75) { f.vy *= -1; f.y = Math.max(-40, Math.min(75, f.y)); }
        if (inp.pdown && Math.hypot(f.x - p.x, f.y - p.y) < 30) {
          f.gone = true; f.setVisible(false); this.count++; FR.sfx('blip');
        }
      }
      this.tbar.set(this.time / this.time0);
      this.status.setText(`Scooped: ${this.count}`);
      if (this.time <= 0 || this.count >= 5) {
        return { caught: this.count > 0, cut: this.count >= 3 ? 'perfect' : 'normal', count: Math.min(this.count, 4), msg: 'The school scattered!' };
      }
      return null;
    }
  }

  // Glowgill: it blinks in and out of sight. Reel only while it glows.
  class Blink extends Base {
    constructor(...a) {
      super(...a);
      this.prog = 0; this.strain = 0; this.total = 0;
      this.glow = false; this.phase = FR.rand(0.4, 0.8);
      this.ring = this.add(this.s.add.ellipse(0, 5, 130, 66, this.fish.color, 0.45));
      this.body = this.add(this.s.add.image(0, 5, 'fish_' + this.fish.id).setScale(1.25));
      this.pbar = this.bar(-150, 62, 300, 12, 0x6fdc6f);
      this.sbar = this.bar(-150, 80, 300, 6, 0xff5b5b);
    }
    update(dt, inp) {
      this.total += dt;
      this.phase -= dt;
      this.dark = this.glow ? 0 : (this.dark || 0) + dt;
      if (this.phase <= 0) {
        this.glow = !this.glow;
        this.phase = this.glow ? FR.rand(0.9, 1.6) / this.speed : FR.rand(0.5, 1.0);
      }
      if (inp.down) {
        if (this.glow) this.prog += dt * 0.3;
        else if (this.dark > 0.3) { this.strain += dt; this.prog = Math.max(0, this.prog - dt * 0.15); } // 0.3s grace to let go
      }
      const limit = 1.2 * this.ease;
      this.ring.setVisible(this.glow);
      if (this.glow) this.body.clearTint().setAlpha(1); else this.body.setTint(0x10283c).setAlpha(0.6);
      this.body.y = 5 + Math.sin(this.total * 3) * 4;
      this.pbar.set(this.prog);
      this.sbar.set(this.strain / limit);
      this.status.setText(this.glow ? 'Glowing — reel!' : 'Dark — let go!');
      if (this.prog >= 1) return { caught: true, cut: this.strain < 0.2 ? 'perfect' : this.strain < 0.7 ? 'normal' : 'bruised' };
      if (this.strain >= limit || this.total > 20) return { caught: false, msg: 'It slipped away into the dark.' };
      return null;
    }
  }

  // Thunder Eel: it zaps the line. Let go during each zap or the line snaps.
  class Zap extends Base {
    constructor(...a) {
      super(...a);
      this.prog = 0; this.hits = 0; this.total = 0;
      this.state = 'calm'; this.timer = FR.rand(1.2, 2.2);
      this.body = this.add(this.s.add.image(0, 5, 'fish_' + this.fish.id).setScale(1.5));
      this.flash = this.add(U.text(this.s, 0, -38, '', 22, '#fff27a', { fontStyle: 'bold' }).setOrigin(0.5));
      this.pbar = this.bar(-150, 62, 300, 12, 0x6fdc6f);
    }
    update(dt, inp) {
      this.total += dt;
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === 'calm') { this.state = 'warn'; this.timer = 0.55 * this.ease; }
        else if (this.state === 'warn') { this.state = 'zap'; this.timer = 0.6; this.hitNow = false; FR.sfx('zap'); }
        else { this.state = 'calm'; this.timer = FR.rand(1.2, 2.2) / this.speed; }
      }
      if (inp.down) {
        if (this.state === 'zap') {
          if (!this.hitNow) { this.hitNow = true; this.hits++; FR.sfx('bad'); }
        } else this.prog += dt * 0.24;
      }
      this.flash.setText(this.state === 'warn' ? '! ! !' : this.state === 'zap' ? 'ZAP!' : '');
      if (this.state === 'zap') this.body.setTintFill(0xffffff); else if (this.state === 'warn') this.body.setTint(0xff8a3c); else this.body.clearTint();
      this.body.x = this.state === 'zap' ? FR.rand(-4, 4) : Math.sin(this.total * 2) * 10;
      this.pbar.set(this.prog);
      this.status.setText(`Line hits: ${this.hits}/${this.line}`);
      if (this.hits >= this.line) return { caught: false, msg: 'ZAP! The line snapped.' };
      if (this.prog >= 1) return { caught: true, cut: this.hits === 0 ? 'perfect' : this.hits === 1 ? 'normal' : 'bruised' };
      if (this.total > 25) return { caught: false, msg: 'The eel wriggled free.' };
      return null;
    }
  }

  // Bluefin Tuna: it dives deep. Pump the rod only during its pauses.
  class Pump extends Base {
    constructor(...a) {
      super(...a);
      this.depth = 0.5; this.mistakes = 0;
      this.state = 'dive'; this.timer = FR.rand(0.8, 1.3);
      this.add(this.s.add.rectangle(-200, 15, 26, 150, 0x0b2a44).setStrokeStyle(2, 0xffffff, 0.6));
      this.add(U.text(this.s, -200, -70, 'surface', 11, '#bfe3ff').setOrigin(0.5));
      this.add(U.text(this.s, -200, 100, 'lost', 11, '#ff9c9c').setOrigin(0.5));
      this.marker = this.add(this.s.add.image(-200, 15, 'fish_' + this.fish.id).setScale(0.26).setAngle(-90));
      this.body = this.add(this.s.add.image(30, 0, 'fish_' + this.fish.id).setScale(1.5));
      this.label = this.add(U.text(this.s, 30, 58, '', 18, '#ffffff', { fontStyle: 'bold' }).setOrigin(0.5));
    }
    update(dt, inp) {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === 'dive') { this.state = 'pause'; this.timer = FR.rand(0.8, 1.2) * this.ease; }
        else { this.state = 'dive'; this.timer = FR.rand(0.8, 1.3); this.diveT = 0; }
      }
      if (this.state === 'dive') {
        this.depth += 0.17 * this.speed * dt;
        this.diveT = (this.diveT || 0) + dt;
        if (inp.just && this.diveT > 0.3) { this.mistakes++; FR.sfx('bad'); } // 0.3s grace to stop pumping
      } else if (inp.just) { this.depth -= 0.075; FR.sfx('blip'); }
      this.marker.y = -60 + 150 * Math.max(0, Math.min(1, this.depth));
      this.body.y = this.state === 'dive' ? 8 + Math.sin(this.t += dt * 20) * 3 : 0;
      this.body.setAngle(this.state === 'dive' ? 28 : -6);
      this.label.setText(this.state === 'dive' ? 'DIVING — wait!' : 'PAUSED — pump!');
      this.label.setColor(this.state === 'dive' ? '#ff9c9c' : '#9cffb0');
      this.status.setText(`Line strain: ${this.mistakes}/${this.line + 1}`);
      if (this.mistakes > this.line) return { caught: false, msg: 'Too much strain. The line snapped.' };
      if (this.depth >= 1) return { caught: false, msg: 'It dove out of reach.' };
      if (this.depth <= 0) return { caught: true, cut: this.mistakes === 0 ? 'perfect' : this.mistakes === 1 ? 'normal' : 'bruised' };
      return null;
    }
  }

  // Sunscale Dragon Koi: it breathes a pattern of sparks. Repeat it back.
  class Simon extends Base {
    constructor(...a) {
      super(...a);
      this.colors = [0xff5b5b, 0xffd23c, 0x5bd1ff, 0xb46bff];
      this.add(this.s.add.image(0, -44, 'fish_' + this.fish.id).setScale(0.62));
      this.orbs = this.colors.map((col, i) => {
        const o = this.add(this.s.add.circle(-135 + i * 90, 28, 27, col, 0.3).setStrokeStyle(4, 0x2b2140, 1));
        o.col = col;
        return o;
      });
      this.rounds = this.fish.reel.rounds || [3, 4, 5];
      this.round = 0; this.mistakes = 0;
      this.begin();
    }
    begin() {
      this.seq = [];
      for (let i = 0; i < this.rounds[this.round]; i++) this.seq.push(Math.floor(Math.random() * 4));
      this.state = 'show'; this.idx = 0; this.timer = 0.7; this.lit = -1;
    }
    light(i) { this.orbs.forEach((o, k) => o.setFillStyle(o.col, k === i ? 1 : 0.3)); }
    update(dt, inp) {
      this.timer -= dt;
      if (this.state === 'show') {
        this.status.setText(`Round ${this.round + 1}/${this.rounds.length} — watch the sparks…`);
        if (this.timer <= 0) {
          if (this.lit >= 0) { this.lit = -1; this.light(-1); this.timer = 0.2; }
          else if (this.idx < this.seq.length) { this.lit = this.seq[this.idx++]; this.light(this.lit); FR.sfx('blip'); this.timer = 0.5 / this.speed; }
          else { this.state = 'input'; this.pos = 0; this.timer = 4 + this.seq.length * this.ease; }
        }
      } else if (this.state === 'input') {
        this.status.setText(`Your turn! ${this.pos}/${this.seq.length}`);
        if (this.flashT) { this.flashT -= dt; if (this.flashT <= 0) { this.flashT = 0; this.light(-1); } }
        let wrong = this.timer <= 0;
        if (inp.pjust) {
          const p = this.local(inp);
          const hit = this.orbs.findIndex(o => Math.hypot(o.x - p.x, o.y - p.y) < 36);
          if (hit >= 0) {
            this.light(hit); this.flashT = 0.2;
            if (hit === this.seq[this.pos]) { this.pos++; FR.sfx('blip'); } else wrong = true;
          }
        }
        if (wrong) {
          this.mistakes++; FR.sfx('bad');
          if (this.mistakes >= 2) return { caught: false, msg: 'The koi vanished in a puff of sparks.' };
          this.light(-1); this.begin();
        } else if (this.pos >= this.seq.length) {
          this.round++;
          if (this.round >= this.rounds.length) return { caught: true, cut: this.mistakes === 0 ? 'perfect' : 'bruised' };
          this.light(-1); this.begin();
        }
      }
      return null;
    }
  }

  FR.Reel = { school: School, blink: Blink, zap: Zap, pump: Pump, simon: Simon };
})();
