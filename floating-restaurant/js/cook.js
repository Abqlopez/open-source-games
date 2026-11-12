// Cooking minigames (3-5 seconds each). Each returns a 0-1 score from update().
(function () {
  const U = FR.ui, D = FR.DATA;

  class Base {
    constructor(scene, c, ox, oy) { this.s = scene; this.c = c; this.ox = ox; this.oy = oy; this.t = 0; }
    add(o) { this.c.add(o); return o; }
    local(inp) { return { x: inp.px - this.ox, y: inp.py - this.oy }; }
  }

  // Chop: tap in rhythm as the knife crosses each marker.
  class Chop extends Base {
    constructor(...a) {
      super(...a);
      this.dur = 3.6; this.score = 0;
      this.add(this.s.add.image(0, 0, 'board'));
      this.marks = [0.9, 1.6, 2.3, 3.0].map(tm => {
        const m = this.add(this.s.add.rectangle(this.x(tm), 0, 8, 50, 0xffffff).setStrokeStyle(2, 0x2b2140));
        m.tm = tm;
        return m;
      });
      this.knife = this.add(this.s.add.image(this.x(0), -30, 'knife').setAngle(180));
    }
    x(t) { return -200 + 400 * t / this.dur; }
    update(dt, inp) {
      this.t += dt;
      this.knife.x = this.x(this.t);
      if (inp.just) {
        let best = null;
        for (const m of this.marks) if (!m.hit && (!best || Math.abs(m.tm - this.t) < Math.abs(best.tm - this.t))) best = m;
        if (best) {
          const err = Math.abs(best.tm - this.t);
          if (err < 0.3) {
            best.hit = true;
            const sc = err < 0.08 ? 1 : 1 - (err - 0.08) / 0.22 * 0.7;
            this.score += sc;
            best.setFillStyle(sc > 0.7 ? 0x6fdc6f : 0xffc93c);
            FR.sfx('blip');
          }
        }
      }
      return this.t >= this.dur ? this.score / this.marks.length : null;
    }
  }

  // Fry / grill: stop the moving needle in the green zone.
  class Needle extends Base {
    constructor(...a) {
      super(...a);
      this.zc = FR.rand(0.25, 0.75);
      this.add(this.s.add.rectangle(0, 0, 400, 26, 0x3a2a1c).setStrokeStyle(3, 0x2b2140));
      this.add(this.s.add.rectangle(-200 + this.zc * 400, 0, 88, 26, 0x4caf50));
      this.add(this.s.add.rectangle(-200 + this.zc * 400, 0, 40, 26, 0x7dff8a));
      this.needle = this.add(this.s.add.rectangle(-200, 0, 6, 44, 0xffffff));
    }
    update(dt, inp) {
      this.t += dt;
      const pos = 0.5 - 0.5 * Math.cos(this.t * 3.6);
      this.needle.x = -200 + pos * 400;
      if (inp.just) {
        const d = Math.abs(pos - this.zc);
        FR.sfx('blip');
        return d <= 0.05 ? 1 : d <= 0.11 ? 0.8 : Math.max(0, 0.55 - (d - 0.11) * 3);
      }
      return this.t > 5 ? 0.15 : null;
    }
  }

  // Boil: wait, then pull the dish off at the right time.
  class Boil extends Base {
    constructor(...a) {
      super(...a);
      this.dur = 4; this.z = FR.rand(0.55, 0.78); this.zw = 0.16;
      this.add(this.s.add.rectangle(0, 0, 400, 26, 0x1f3550).setStrokeStyle(3, 0x2b2140));
      this.add(this.s.add.rectangle(-200 + (this.z + this.zw / 2) * 400, 0, this.zw * 400, 26, 0x4caf50));
      this.fill = this.add(this.s.add.rectangle(-200, 0, 400, 14, 0xff8a3c).setOrigin(0, 0.5));
      this.fill.scaleX = 0.0001;
    }
    update(dt, inp) {
      this.t += dt;
      const f = this.t / this.dur;
      this.fill.scaleX = Math.max(0.0001, Math.min(1, f));
      if (inp.just) {
        FR.sfx('blip');
        if (f < this.z) return Math.max(0.1, 0.75 - (this.z - f) * 3);
        if (f <= this.z + this.zw) return 1;
        return Math.max(0.1, 0.7 - (f - this.z - this.zw) * 4);
      }
      return f >= 1 ? 0.1 : null;
    }
  }

  // Slice / roll: hold the mouse and trace the path.
  class Trace extends Base {
    constructor(scene, c, ox, oy, kind) {
      super(scene, c, ox, oy);
      this.n = 12; this.next = 0; this.pts = [];
      for (let i = 0; i <= this.n; i++) {
        const k = i / this.n;
        if (kind === 'roll') {
          const ang = Math.PI + Math.PI * k;
          this.pts.push({ x: 150 * Math.cos(ang), y: 40 + 85 * Math.sin(ang) });
        } else this.pts.push({ x: -170 + 340 * k, y: 40 - 80 * k });
      }
      this.dots = this.pts.map((p, i) => this.add(this.s.add.circle(p.x, p.y, i === 0 ? 11 : 7, i === 0 ? 0xffc93c : 0xffffff, 0.8)));
      this.cursor = this.add(this.s.add.circle(0, 0, 10).setStrokeStyle(2, 0xffe9a8));
    }
    update(dt, inp) {
      this.t += dt;
      const p = this.local(inp);
      this.cursor.setPosition(p.x, p.y);
      if (inp.pdown) {
        while (this.next < this.pts.length && Math.hypot(this.pts[this.next].x - p.x, this.pts[this.next].y - p.y) < 24) {
          this.dots[this.next].setFillStyle(0x6fdc6f, 1);
          this.next++;
        }
      }
      if (this.next >= this.pts.length) { FR.sfx('blip'); return 1; }
      return this.t > 5 ? this.next / this.pts.length : null;
    }
  }

  // Plate: drag the food onto the plate.
  class Plate extends Base {
    constructor(...a) {
      super(...a);
      this.add(this.s.add.image(130, 0, 'bigplate').setScale(0.95));
      this.food = this.add(this.s.add.circle(-150, 0, 22, 0xff8a3c).setStrokeStyle(3, 0x2b2140));
      this.drag = false;
    }
    update(dt, inp) {
      this.t += dt;
      const p = this.local(inp);
      if (!this.drag && inp.pjust && Math.hypot(p.x - this.food.x, p.y - this.food.y) < 34) this.drag = true;
      if (this.drag) {
        if (inp.pdown) this.food.setPosition(p.x, p.y);
        else {
          this.drag = false;
          const d = Math.hypot(this.food.x - 130, this.food.y);
          if (d < 58) { FR.sfx('blip'); return d < 14 ? 1 : 1 - (d - 14) / 44 * 0.6; }
          this.food.setPosition(-150, 0);
        }
      }
      return this.t > 5 ? 0.1 : null;
    }
  }

  const GAMES = {
    chop: (s, c, x, y) => new Chop(s, c, x, y),
    fry: (s, c, x, y) => new Needle(s, c, x, y),
    grill: (s, c, x, y) => new Needle(s, c, x, y),
    boil: (s, c, x, y) => new Boil(s, c, x, y),
    slice: (s, c, x, y) => new Trace(s, c, x, y, 'slice'),
    roll: (s, c, x, y) => new Trace(s, c, x, y, 'roll'),
    plate: (s, c, x, y) => new Plate(s, c, x, y)
  };

  // Runs a recipe's steps one after another in a popup, then reports the average score.
  FR.CookSession = class {
    constructor(scene, recipe, onDone) {
      this.s = scene; this.recipe = recipe; this.onDone = onDone;
      this.panel = U.panel(scene, 560, 290, 'Cooking: ' + recipe.name, 100);
      this.panel.add(scene.add.image(-236, -122, 'dish_' + recipe.id).setScale(0.8));
      this.stepText = U.text(scene, 0, -82, '', 15, '#ffffff', { align: 'center' }).setOrigin(0.5);
      this.result = U.text(scene, 0, 118, '', 16, '#9cffb0', { fontStyle: 'bold' }).setOrigin(0.5);
      this.panel.add([this.stepText, this.result]);
      this.idx = -1; this.scores = []; this.gap = 0;
      this.nextStep();
    }
    nextStep() {
      if (this.area) this.area.destroy();
      this.idx++;
      const id = this.recipe.steps[this.idx], st = D.steps[id];
      this.stepText.setText(`Step ${this.idx + 1}/${this.recipe.steps.length}: ${st.name}\n${st.hint}`);
      this.area = this.s.add.container(0, 20);
      this.panel.add(this.area);
      this.game = GAMES[id](this.s, this.area, this.panel.x, this.panel.y + 20);
    }
    finish() {
      const score = this.scores.reduce((a, b) => a + b, 0) / this.scores.length;
      this.panel.destroy();
      this.onDone(score);
    }
    update(dt, inp) {
      if (FR.dev.auto) { this.scores = [0.95]; this.finish(); return; }
      if (this.gap > 0) {
        this.gap -= dt;
        if (this.gap <= 0) {
          if (this.idx + 1 >= this.recipe.steps.length) { this.finish(); return; }
          this.result.setText('');
          this.nextStep();
        }
        return;
      }
      const r = this.game.update(dt, inp);
      if (r !== null) {
        this.scores.push(r);
        this.result.setText(r >= 0.8 ? 'Perfect!' : r >= 0.42 ? 'Good' : 'Sloppy…');
        this.result.setColor(r >= 0.8 ? '#9cffb0' : r >= 0.42 ? '#ffe9a8' : '#ff9c9c');
        this.gap = 0.55;
      }
    }
    destroy() { this.panel.destroy(); }
  };
})();
