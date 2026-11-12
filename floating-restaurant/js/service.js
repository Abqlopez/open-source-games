// Night (v2): you walk the deck and do every job yourself.
// Greet and seat, take orders, carry ingredients, chop, cook, plate, serve,
// collect the money, bus the plates and wash them.
(function () {
  const U = FR.ui, D = FR.DATA, C = D.config, J = FR.juice;
  const TABLES = [[230, 210], [410, 210], [230, 352], [410, 352], [230, 494], [410, 494]];
  const POS = { pantry: [640, 104], board0: [722, 104], board1: [805, 104], tank: [890, 104], grill: [890, 215], fry: [890, 305], pot: [890, 395], sink: [880, 546], trash: [790, 546], rod: [560, 548] };
  const BOUNDS = { x0: 42, x1: 918, y0: 84, y1: 572 };
  const rectDist = (r, x, y) => Math.hypot(Math.max(Math.abs(x - r.x) - r.w / 2, 0), Math.max(Math.abs(y - r.y) - r.h / 2, 0));

  class ServiceScene extends Phaser.Scene {
    constructor() { super('Service'); }

    create() {
      const S = FR.state;
      FR.art.build(this);
      this.inp = FR.makeInput(this);
      this.timeLeft = C.nightSeconds; this.elapsed = 0; this.ended = false; this.paused = false;
      this.fight = null; this.leading = null; this.combo = 0; this.liveOpen = false; this.idleT = 0; this.target = null;
      this.res = { earned: 0, tips: 0, reviews: [], served: 0, walked: 0, turned: 0, requests: [], events: [], bestCombo: 0, broken: 0 };
      this.customers = []; this.queue = []; this.tickets = [];
      this.clean = S.plates;
      this.things = []; this.solid = [];

      // --- the boat ---
      this.add.image(480, 300, 'nightsea');
      this.add.image(18, 321, 'ramp').setDepth(1);
      this.add.image(480, 320, `bigdeck_${S.theme}_${S.upgrades.tables}`).setDepth(2);
      if (S.decor.plants) [[60, 110], [560, 110], [60, 540]].forEach(([x, y]) => this.add.image(x, y, 'plant').setDepth(y));
      if (S.decor.sign) { this.add.image(320, 92, 'plank').setDepth(3); U.text(this, 320, 92, 'FLOATING RESTAURANT', 15, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0.5).setDepth(3); }
      S.trophies.forEach((t, i) => { this.add.image(130 + i * 70, 118, 'plank').setScale(0.3, 0.9).setDepth(3); this.add.image(130 + i * 70, 118, 'fish_' + t).setScale(0.42).setDepth(3); });
      U.text(this, 52, 228, 'DOCK', 11, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0.5).setDepth(3);

      // --- tables ---
      this.tables = [];
      for (let i = 0; i < FR.tableCount(); i++) {
        const [x, y] = TABLES[i];
        const tb = { i, x, y, cust: null, dirty: 0, cash: null, rect: { x, y: y + 2, w: 100, h: 36 } };
        this.add.image(x, y, S.decor.tablestyle ? 'table_fancy' : 'table_' + S.theme).setDepth(y);
        U.text(this, x, y + 36, String(i + 1), 12, '#ffffff', { fontStyle: 'bold', stroke: '#2b2140', strokeThickness: 3 }).setOrigin(0.5).setDepth(y);
        tb.mess = this.add.container(x, y - 6).setDepth(y + 1);
        tb.action = () => this.tableAction(tb);
        this.tables.push(tb); this.things.push(tb); this.solid.push(tb.rect);
      }

      // --- kitchen ---
      const station = (key, tex, extra) => {
        const [x, y] = POS[key];
        const st = Object.assign({ key, x, y, rect: { x, y, w: 74, h: 54 } }, extra);
        st.img = this.add.image(x, y, tex).setDepth(y);
        st.top = this.add.container(x, y).setDepth(y + 1);
        this.things.push(st); this.solid.push(st.rect);
        return st;
      };
      this.pantry = station('pantry', 'st_pantry', { action: () => this.storeAction('side') });
      this.tank = station('tank', 'st_tank', { action: () => this.storeAction('fish') });
      this.boards = [];
      for (let i = 0; i < FR.boardCount(); i++) { const b = station('board' + i, 'st_board', { items: [], prep: null, prog: 0 }); b.action = () => this.boardAction(b); this.boards.push(b); }
      this.heats = ['grill', 'fry', 'pot'].map(type => { const h = station(type, 'st_' + type, { type, slots: new Array(FR.burners()).fill(null) }); h.action = () => this.heatAction(h); return h; });
      this.sink = station('sink', 'st_sink', { dirty: 0, prog: 0 }); this.sink.action = () => this.sinkAction();
      this.trash = station('trash', 'st_trash', { action: () => this.trashAction() });
      this.rod = station('rod', 'st_rod', { action: () => this.rodAction() });
      this.ramp = { x: 50, y: 321, rect: { x: 46, y: 321, w: 40, h: 150 }, action: () => this.rampAction() };
      this.things.push(this.ramp);
      [['pantry', 'PANTRY'], ['tank', 'FISH TANK'], ['board0', 'CHOP'], ['grill', 'GRILL'], ['fry', 'FRYER'], ['pot', 'POT'], ['sink', 'SINK'], ['trash', 'BIN'], ['rod', 'ROD']].forEach(([k, name]) => {
        const [x, y] = POS[k];
        const side = ['grill', 'fry', 'pot'].includes(k);
        U.text(this, side ? x - 46 : x, side ? y : y - 38, name, 10, '#2b2140', { fontStyle: 'bold', backgroundColor: '#ffe9a8', padding: { x: 4, y: 1 } }).setOrigin(side ? 1 : 0.5, 0.5).setDepth(600);
      });
      this.plateText = U.text(this, 880, 590, '', 11, '#ffffff', { fontStyle: 'bold', stroke: '#2b2140', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(8100);

      // --- you ---
      this.me = { x: 590, y: 320, carry: [] };
      this.me.k = this.add.container(this.me.x, this.me.y);
      this.me.body = this.add.image(0, -18, 'chef');
      this.me.hands = this.add.container(0, -56);
      this.me.k.add([this.me.body, this.me.hands]);

      // --- lighting: sunset fades to a lantern-lit night ---
      this.dusk = this.add.rectangle(480, 320, 960, 564, 0xff8a3c, 0.16).setDepth(7000);
      this.lamps = [];
      [[60, 90], [320, 80], [580, 90], [60, 560], [330, 566], [900, 566], [912, 160]].forEach(([x, y], i) => {
        if (!S.decor.lanterns && i > 2) return;
        const gl = this.add.image(x, y + 10, 'softglow').setTint(0xffc56b).setScale(S.decor.lanterns ? 2.2 : 1.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(7001);
        const la = this.add.image(x, y, 'lantern').setOrigin(0.5, 0).setDepth(7002);
        this.tweens.add({ targets: la, angle: { from: -7, to: 7 }, duration: 1700 + i * 210, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.lamps.push(gl);
      });
      this.raining = Math.random() < C.rainChance && S.day > 1;
      if (this.raining) this.time.delayedCall(600, () => U.toast(this, 'Rain tonight. The deck shines under the lanterns.', '#bfe3ff'));
      this.time.addEvent({ delay: 9000, loop: true, callback: () => this.gull() });

      // --- HUD ---
      this.hud = U.hud(this, 'Night');
      this.rail = this.add.container(0, 0).setDepth(8100);
      this.prompt = U.text(this, 0, 0, '', 13, '#ffffff', { backgroundColor: '#2b2140ee', padding: { x: 8, y: 4 }, align: 'center', fontStyle: 'bold' }).setOrigin(0.5, 1).setDepth(8200).setVisible(false);
      this.ring = this.add.rectangle(0, 0, 10, 10).setStrokeStyle(3, 0xffe14d).setDepth(8150).setVisible(false);
      this.holdBar = U.bar(this, 0, 0, 60, 8, 0x9cffb0); this.holdBar.objs.forEach(o => o.setDepth(8200).setVisible(false));
      this.comboText = U.title(this, 20, 62, '', 22, '#ffe14d').setDepth(8100);
      this.phaseText = U.text(this, 480, 50, '', 12, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0.5).setDepth(8100);
      U.button(this, 560, 62, 30, 26, '?', () => this.help(), { size: 15 }).setDepth(8100);
      // touch screens get an on-screen action button; with a keyboard it would only be in the way
      this.actionBtn = this.inp.addActionButton(505, 440).setAlpha(0.85).setVisible(this.sys.game.device.input.touch);

      this.buildArrivals();
      this.drawHands(); this.drawRail(); this.heats.forEach(h => this.drawHeat(h)); this.boards.forEach(b => this.drawBoard(b));
      if (!S.seenHelp) { S.seenHelp = true; this.help(); }
    }

    help() {
      if (this.paused) return;
      this.paused = true;
      const S = FR.state;
      const p = U.panel(this, 720, 440, 'Running the boat', 9300);
      p.add(U.text(this, -330, -170,
        'Move: WASD or arrows (or click a spot).   Do things: E or SPACE.   You carry 2 things at most.\n\n' +
        '1. Greet customers at the DOCK, lead them to a clean table.\n' +
        '2. Take their order at the table.\n' +
        '3. Grab what it needs from the FISH TANK and PANTRY, drop it on the CHOP board, hold E to chop.\n' +
        '4. Carry it to the right station (grill, fryer or pot). Take it off while it is green. It burns!\n' +
        '    Dishes with no cooking (kelp wrap, sushi) are plated straight off the board.\n' +
        '5. Serve it, then collect the money before they get bored.\n' +
        '6. Bus dirty plates to the SINK and hold E to wash, or you run out of plates.\n' +
        'Serve dish after dish with no mistakes to build a COMBO that multiplies your tips.',
        13, '#ffffff', { lineSpacing: 4, wordWrap: { width: 660 } }));
      let y = 78;
      const row = (x, key, text) => { p.add(this.add.image(x, y, key).setScale(0.7)); p.add(U.text(this, x + 16, y, text, 12, '#bfd3e6').setOrigin(0, 0.5)); };
      Object.values(D.roles).forEach((r, i) => { row(-320 + i * 220, 'role_' + r.id, `${r.name}: ${r.blurb}`); });
      y += 26;
      Object.values(D.species).filter(sp => D.areas[S.area].species[sp.id]).forEach((sp, i) => { row(-320 + (i % 3) * 220, 'sp_' + sp.id, `${sp.name}: ${sp.blurb}`); if (i === 2) y += 24; });
      p.add(U.button(this, 0, 186, 200, 38, "Let's cook", () => { p.destroy(); this.paused = false; }, { color: 0x3f8f4f, size: 16 }));
    }

    gull() {
      if (this.ended) return;
      const x = FR.rand(120, 560), g = this.add.image(x - 200, 10, 'gull').setDepth(7003);
      this.tweens.add({ targets: g, x, y: 50, duration: 1400, onComplete: () => { g.setTexture('gullsit'); this.tweens.add({ targets: g, y: 48, duration: 300, yoyo: true, repeat: 8, onComplete: () => { g.setTexture('gull'); this.tweens.add({ targets: g, x: x + 260, y: -20, duration: 1300, onComplete: () => g.destroy() }); } }); } });
    }

    // ---------- items ----------
    itemName(it) {
      if (it.k === 'ing') return it.t === 'fish' ? D.fish[it.id].name : D.sides[it.id].name;
      if (it.k === 'prep') return 'prepped ' + it.recipe.name;
      if (it.k === 'dish') return it.live ? 'Catch of the Moment' : it.recipe.name;
      return 'dirty plate';
    }
    itemIcon(it, x, y, sc) {
      sc = sc || 1;
      const out = [];
      if (it.k === 'ing') out.push(this.add.image(x, y, it.t === 'fish' ? 'fish_' + it.id : 'it_' + it.id).setScale(it.t === 'fish' ? 0.3 * sc : 0.7 * sc));
      else if (it.k === 'prep') { out.push(this.add.image(x, y, 'prepbowl').setScale(0.8 * sc)); out.push(this.add.image(x, y - 4 * sc, 'dish_' + it.recipe.id).setScale(0.3 * sc)); }
      else if (it.k === 'dish') { const im = this.add.image(x, y, it.live ? 'dish_live' : 'dish_' + it.recipe.id).setScale(0.5 * sc); if (it.quality === 'burnt') im.setTint(0x5a4a3a); out.push(im); }
      else out.push(this.add.image(x, y, 'plate_dirty').setScale(0.75 * sc));
      return out;
    }
    drawHands() {
      const h = this.me.hands;
      h.removeAll(true);
      this.me.carry.forEach((it, i) => h.add(this.itemIcon(it, (i - (this.me.carry.length - 1) / 2) * 30, 0)));
    }
    room() { return this.me.carry.length < C.carryMax; }
    give(it) { this.me.carry.push(it); this.drawHands(); }
    drop(it) { this.me.carry = this.me.carry.filter(x => x !== it); this.drawHands(); }
    plateUp() {
      if (this.clean > 0) { this.clean--; return true; }
      U.toast(this, 'No clean plates! Bus the tables and wash up at the sink.', '#ff9c9c'); FR.sfx('bad');
      return false;
    }
    breakCombo(why) {
      if (this.combo >= 2) U.float(this, this.me.x, this.me.y - 90, `Combo lost: ${why}`, '#ff9c9c');
      this.combo = 0;
    }

    // ---------- stations ----------
    // Fish tank and pantry hand you the next thing your open orders need.
    storeAction(t) {
      const S = FR.state, me = this.me;
      let need = null, order = null;
      for (const tk of this.tickets) { need = tk.o.need.find(n => n.t === t); if (need) { order = tk.o; break; } }
      if (need && this.room()) return { label: `Grab ${this.itemName(need)}`, press: () => { order.need = order.need.filter(n => n !== need); this.give(need); FR.sfx(t === 'fish' ? 'splash' : 'blip'); } };
      const held = me.carry.find(it => it.k === 'ing' && it.t === t);
      if (held) return { label: `Put the ${this.itemName(held)} back`, press: () => { if (t === 'fish') FR.refundFish(held.fish); else S.sides[held.id]++; this.drop(held); } };
      if (need) return { label: 'Your hands are full' };
      return null;
    }

    matchRecipe(items) {
      const fish = {}, sides = {};
      let nFish = 0;
      items.forEach(it => { if (it.t === 'fish') { fish[it.id] = (fish[it.id] || 0) + 1; nFish++; } else sides[it.id] = (sides[it.id] || 0) + 1; });
      const same = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => a[k] === b[k]);
      return FR.state.known.map(FR.recipe).find(r => same(r.sides, sides) && (r.anyFish ? nFish === r.anyFish && !Object.keys(r.fish).length : same(r.fish, fish)));
    }

    boardAction(b) {
      const me = this.me, ings = me.carry.filter(it => it.k === 'ing');
      if (ings.length && !b.prep && b.items.length + ings.length <= 4) {
        return { label: 'Put on the board', press: () => { ings.forEach(it => { b.items.push(it); me.carry = me.carry.filter(x => x !== it); }); b.prog = 0; this.drawHands(); this.drawBoard(b); FR.sfx('blip'); } };
      }
      if (b.prep) {
        const r = b.prep.recipe;
        if (r.heat === 'none') {
          if (!this.room()) return { label: 'Your hands are full' };
          return { label: `Plate the ${r.name}`, press: () => { if (!this.plateUp()) return; this.give({ k: 'dish', recipe: r, quality: FR.qualityOf(C.noHeatScore, b.prep.fish), fish: b.prep.fish }); b.prep = null; this.drawBoard(b); FR.sfx('blip'); } };
        }
        if (!this.room()) return { label: 'Your hands are full' };
        return { label: `Pick up (goes on the ${D.heat[r.heat].name})`, press: () => { this.give(b.prep); b.prep = null; this.drawBoard(b); } };
      }
      const m = this.matchRecipe(b.items);
      if (m) return {
        label: `Hold E: chop for ${m.name}`, prog: b.prog,
        hold: dt => {
          b.prog += dt / C.chopSeconds;
          if (Math.random() < dt * 9) { FR.sfx('chop'); J.burst(this, b.x, b.y - 12, 0xffffff, 2, 18); }
          if (b.prog >= 1) { b.prep = { k: 'prep', recipe: m, fish: b.items.filter(it => it.t === 'fish').map(it => it.fish) }; b.items = []; b.prog = 0; this.drawBoard(b); FR.sfx('good'); }
        }
      };
      if (b.items.length) return this.room() ? { label: 'Not a recipe yet. E: pick one back up', press: () => { this.give(b.items.pop()); this.drawBoard(b); } } : { label: 'Not a recipe yet' };
      return null;
    }
    drawBoard(b) {
      b.top.removeAll(true);
      b.items.forEach((it, i) => b.top.add(this.itemIcon(it, (i - (b.items.length - 1) / 2) * 17, -10, 0.72)));
      if (b.prep) b.top.add(this.itemIcon(b.prep, 0, -10));
    }

    stage(slot) {
      const over = slot.t - C.cookSeconds;
      return over < 0 ? 'cooking' : over <= C.perfectWindow ? 'perfect' : over <= C.perfectWindow + C.goodWindow ? 'good' : 'burnt';
    }
    heatAction(h) {
      const me = this.me;
      const p = me.carry.find(it => it.k === 'prep' && it.recipe.heat === h.type), free = h.slots.indexOf(null);
      if (p && free >= 0) return { label: `Cook the ${p.recipe.name}`, press: () => { h.slots[free] = { prep: p, t: 0 }; this.drop(p); this.drawHeat(h); FR.sfx('sizzle'); } };
      const done = h.slots.filter(s => s && s.t >= C.cookSeconds).sort((a, b) => b.t - a.t)[0];
      if (done) {
        const stg = this.stage(done);
        if (!this.room()) return { label: 'Your hands are full' };
        return {
          label: `Take the ${done.prep.recipe.name} (${C.quality[stg].label})`,
          press: () => {
            if (!this.plateUp()) return;
            const quality = FR.qualityOf(stg === 'perfect' ? 1 : stg === 'good' ? 0.6 : 0, done.prep.fish);
            h.slots[h.slots.indexOf(done)] = null;
            this.give({ k: 'dish', recipe: done.prep.recipe, quality, fish: done.prep.fish });
            this.drawHeat(h);
            if (quality === 'perfect') { J.pop(this, h.x - 60, h.y - 30, 'PERFECT!', '#9cffb0', 28); FR.sfx('perfect'); J.burst(this, h.x, h.y, 0x9cffb0, 10); }
            else if (quality === 'burnt') { J.pop(this, h.x - 60, h.y - 30, 'BURNT!', '#ff9c9c', 26); FR.sfx('bad'); J.shake(this); }
            else FR.sfx('blip');
          }
        };
      }
      const wrong = me.carry.find(it => it.k === 'prep');
      if (wrong) return { label: wrong.recipe.heat === h.type ? 'No free burner' : `That goes on the ${D.heat[wrong.recipe.heat].name}` };
      if (h.slots.some(s => s)) return { label: 'Still cooking…' };
      return null;
    }
    drawHeat(h) {
      h.top.removeAll(true);
      const n = h.slots.length;
      h.bars = h.slots.map((s, i) => {
        if (!s) return null;
        const x = (i - (n - 1) / 2) * 25;
        const icons = this.itemIcon({ k: 'dish', recipe: s.prep.recipe }, x, -12, 0.74);
        h.top.add(icons);
        const bar = U.bar(this, x - 11, -34, 22, 6, 0xff8a3c);
        h.top.add(bar.objs);
        return { bar, icon: icons[0], x };
      });
    }

    sinkAction() {
      const me = this.me, s = this.sink, dirty = me.carry.filter(it => it.k === 'dirty');
      if (dirty.length) return { label: 'Drop the dirty plates in', press: () => { s.dirty += dirty.length; me.carry = me.carry.filter(it => it.k !== 'dirty'); this.drawHands(); FR.sfx('splash'); } };
      if (s.dirty > 0) return {
        label: `Hold E: wash (${s.dirty} dirty)`, prog: s.prog,
        hold: dt => {
          s.prog += dt / C.washSeconds;
          if (Math.random() < dt * 8) { FR.sfx('wash'); J.burst(this, s.x - 6, s.y - 14, 0xbfe9ff, 2, 20); }
          if (s.prog >= 1) {
            s.prog = 0; s.dirty--;
            if (Math.random() < C.plateBreakChance) { FR.state.plates--; this.res.broken++; U.float(this, s.x, s.y - 50, 'A plate slipped and broke!', '#ff9c9c'); FR.sfx('bad'); J.shake(this, 0.004); }
            else { this.clean++; J.burst(this, s.x, s.y - 14, 0xffffff, 8); FR.sfx('blip'); }
          }
        }
      };
      return null;
    }

    trashAction() {
      const me = this.me, it = me.carry.slice().reverse().find(x => x.k !== 'dirty');
      if (!it) return null;
      return { label: `Throw away the ${this.itemName(it)}`, press: () => { this.drop(it); if (it.k === 'dish') { this.clean++; this.breakCombo('wasted a dish'); } FR.sfx('bad'); } };
    }

    // The rod on the deck edge: a Live Catch in front of the guests, or a top-up for the tank.
    rodAction() {
      const S = FR.state;
      const live = this.tickets.find(tk => tk.o.live && !tk.o.caught);
      if (live && !this.room()) return { label: 'Your hands are full' };
      if (!live && S.tank.length >= FR.tankCap()) return { label: 'The fish tank is full' };
      return { label: live ? 'Fish for the Catch of the Moment!' : 'Cast a line (night fish for the tank)', press: () => this.startLive(live) };
    }
    startLive(tk) {
      const S = FR.state, id = FR.pickNightFish(), f = D.fish[id];
      let bait = S.bait && S.baits[S.bait] > 0 ? S.bait : null;
      if (bait) S.baits[bait]--;
      FR.sfx('splash'); J.burst(this, this.rod.x + 20, this.rod.y + 30, 0xffffff, 10);
      this.fight = new FR.Fight(this, id, {
        gear: 'light', baitMatch: bait === f.bait,
        onDone: res => {
          this.fight = null;
          const others = this.customers.filter(c => c.state === 'waitfood' || c.state === 'ready');
          if (!res.caught) {
            FR.sfx('bad'); U.toast(this, res.msg + (tk ? ' The whole deck groans.' : ''), '#ff9c9c');
            if (tk) others.forEach(c => { c.patience = Math.max(0.05, c.patience - 0.08); });
            return;
          }
          if (!tk || tk.c.state !== 'waitfood') { FR.landFish(this, id, res.cut, false); return; }
          if (!this.plateUp()) { FR.landFish(this, id, res.cut, false); return; }
          const j = FR.logCatch(id, 'normal');
          const flashy = res.cut === 'perfect' || f.rarity === 'rare' || f.rarity === 'legendary';
          tk.o.caught = true;
          this.give({ k: 'dish', live: tk.o, fishId: id, flashy, quality: 'good' });
          if (flashy) { others.forEach(c => { c.patience = Math.min(1, c.patience + 0.15); }); J.pop(this, 480, 240, 'THE CROWD GOES WILD!', '#ffe14d', 36); FR.sfx('perfect'); }
          U.toast(this, `A ${f.name}, landed in front of everyone. Carry it to table ${tk.c.table.i + 1}!${j.first ? `\nNew in your journal! +$${j.reward}` : ''}`, '#9cffb0');
        }
      });
    }

    rampAction() {
      if (this.leading) return { label: 'Lead them to a clean table' };
      const c = this.queue[0];
      if (!c) return null;
      return { label: `Greet the ${c.species.name} ${c.role.name}`, press: () => { this.queue.shift(); this.leading = c; c.state = 'follow'; c.patience = Math.min(1, c.patience + 0.2); FR.sfx('order'); U.float(this, c.k.x, c.k.y - 70, 'Welcome aboard!', '#9cffb0'); this.layoutQueue(); } };
    }

    tableAction(tb) {
      const me = this.me, c = tb.cust;
      if (this.leading) {
        if (c) return null;
        if (tb.dirty) return { label: 'Clear this table first' };
        return { label: 'Seat them here', press: () => this.seat(this.leading, tb) };
      }
      if (c && c.state === 'ready') return { label: 'Take their order', press: () => this.takeOrder(c) };
      if (c && c.state === 'waitfood') {
        const dishes = me.carry.filter(it => it.k === 'dish');
        const right = dishes.find(it => this.wants(c, it));
        if (right) return { label: `Serve the ${this.itemName(right)}`, press: () => this.serve(c, right) };
        if (dishes.length) return { label: `Offer the ${this.itemName(dishes[0])} (not their order!)`, press: () => this.serve(c, dishes[0]) };
        return null;
      }
      if (c && c.state === 'paying') return { label: `Collect $${c.due.pay + (c.payT > C.payGrace ? 0 : c.due.tip)}`, press: () => this.collect(c) };
      if (tb.cash) return { label: `Collect the $${tb.cash} they left`, press: () => { FR.earn('sales', tb.cash); this.res.earned += tb.cash; U.float(this, tb.x, tb.y - 60, `+$${tb.cash}`, '#9cffb0'); FR.sfx('coin'); tb.cash = null; this.drawMess(tb); } };
      if (!c && tb.dirty) return this.room() ? { label: 'Clear the dirty plate', press: () => { tb.dirty--; this.give({ k: 'dirty' }); this.drawMess(tb); FR.sfx('blip'); } } : { label: 'Your hands are full' };
      return null;
    }
    drawMess(tb) {
      tb.mess.removeAll(true);
      for (let i = 0; i < tb.dirty; i++) tb.mess.add(this.add.image(-16 + i * 22, 0, 'plate_dirty').setScale(0.7));
      if (tb.cash) tb.mess.add(this.add.image(28, -4, 'coin').setScale(0.7));
    }

    // ---------- arrivals: calm, then rush hour, then winding down ----------
    buildArrivals() {
      const S = FR.state, list = [];
      for (let i = 0; i < FR.customersTonight(); i++) {
        const roleW = {};
        for (const id in D.roles) roleW[id] = D.roles[id].weight;
        list.push({ role: FR.weighted(roleW), species: FR.weighted(D.areas[S.area].species) });
      }
      D.regulars.forEach(r => { if (S.day % C.regularEvery === r.dayMod) list.push({ role: r.role, species: r.species, regular: r }); });
      S.requests.forEach(q => { if (S.menu.includes(q.recipe)) list.push({ role: q.role, species: q.species, returning: q.recipe }); });
      const span = C.nightSeconds * 0.78;
      list.forEach(a => { a.t = 4 + span * (Math.random() + Math.random()) / 2; });
      list.sort((a, b) => a.t - b.t);
      if (list.length) list[0].t = 3;
      this.arrivals = list;
    }

    spawn(spec) {
      const S = FR.state;
      const c = { role: D.roles[spec.role], species: D.species[spec.species], regular: spec.regular || null, returning: spec.returning || null, patience: 1, rate: 1, orders: [], state: 'queue' };
      c.ptime = C.patience[c.role.patience] * (1 + C.decorPatienceBonus * FR.decorCount());
      const k = this.add.container(-40, 321).setDepth(321);
      const body = this.add.image(0, 0, FR.art.customerKey(c));
      const rb = this.add.image(-15, -46, 'role_' + c.role.id).setScale(0.86);
      const sb = this.add.image(15, -46, 'sp_' + c.species.id).setScale(0.86);
      const bar = U.bar(this, -24, -62, 48, 7, 0x6fdc6f);
      const bub = this.add.container(0, -70);
      k.add([body, rb, sb, ...bar.objs, bub]);
      c.k = k; c.bar = bar; c.bub = bub; c.body = body;

      const menu = S.menu.map(FR.recipe);
      let no = null;
      if (c.role.minMenu && menu.length < c.role.minMenu) no = `Only ${menu.length} dishes? No thanks.`;
      else if (!menu.some(r => FR.edible(c.species, r))) no = c.species.id === 'mermaid' ? 'No kelp dish? Hmph!' : c.species.id === 'seaking' ? 'No fantasy fish? Bah!' : 'Nothing for me here.';
      if (no) {
        this.res.turned++;
        this.tweens.add({ targets: k, x: 56, duration: 500, onComplete: () => { U.float(this, 110, 290, no, '#ff9c9c'); this.leave(c); } });
        return;
      }
      this.queue.push(c);
      this.layoutQueue();
      FR.sfx('order');
    }
    layoutQueue() { this.queue.forEach((c, i) => this.tweens.add({ targets: c.k, x: 56, y: 300 + i * 52, duration: 350 })); }
    leave(c) {
      c.state = 'gone';
      c.bub.removeAll(true);
      this.tweens.add({ targets: c.k, x: -60, y: 321, alpha: 0, delay: 300, duration: 900, onComplete: () => c.k.destroy() });
    }

    // ---------- the customer loop ----------
    seat(c, tb) {
      this.leading = null;
      tb.cust = c; c.table = tb; c.state = 'seated'; c.think = C.orderDelay;
      c.patience = Math.min(1, c.patience + 0.25);
      this.customers.push(c);
      this.tweens.add({ targets: c.k, x: tb.x, y: tb.y - 58, duration: 300 });
      FR.sfx('blip');
      if (c.regular) U.toast(this, `${c.regular.name}: "${FR.pick(c.regular.lines)}"`, '#ffe9a8');
    }

    chooseDish(c) {
      const S = FR.state;
      const avail = S.menu.map(FR.recipe).filter(r => FR.edible(c.species, r) && FR.canMakeCount(r) > 0);
      if (!avail.length) return null;
      if (c.returning) { const r = avail.find(a => a.id === c.returning); if (r) return r; }
      if (c.regular) { const r = avail.find(a => a.id === c.regular.favorite); if (r) return r; }
      if (c.role.id === 'sailor') return avail.sort((a, b) => FR.price(a) - FR.price(b))[0];
      if (c.role.id === 'pirate') return avail.sort((a, b) => FR.price(b) - FR.price(a))[0];
      const w = {};
      avail.forEach(r => { w[r.id] = FR.price(r); });
      return FR.recipe(FR.weighted(w));
    }

    takeOrder(c) {
      const S = FR.state, tb = c.table;
      const edibleNow = S.menu.map(FR.recipe).filter(r => FR.edible(c.species, r) && FR.canMakeCount(r) > 0);
      if (c.species.fantasyNerves && edibleNow.length && edibleNow.every(r => r.kind === 'fantasy')) c.rate = c.species.fantasyNerves;
      const fishEater = c.species.eats.includes('real') || c.species.eats.includes('fantasy');
      if (!c.regular && !c.returning && fishEater && !this.liveOpen && Math.random() < C.liveCatchChance) {
        c.orders.push({ live: true, status: 'open', need: [] });
        this.liveOpen = true;
      } else {
        for (let i = 0; i < (c.species.orders || 1); i++) {
          const r = this.chooseDish(c);
          if (!r) break;
          const res = FR.reserve(r), need = res.fish.map(f => ({ k: 'ing', t: 'fish', id: f.id, fish: f }));
          for (const id in res.sides) for (let n = 0; n < res.sides[id]; n++) need.push({ k: 'ing', t: 'side', id });
          c.orders.push({ recipe: r, need, status: 'open', payMult: c.returning === r.id ? 2 : 1 });
        }
      }
      if (!c.orders.length) {
        this.res.turned++;
        U.float(this, tb.x, tb.y - 120, 'Everything they eat is sold out!', '#ff9c9c');
        this.release(c);
        return;
      }
      c.orders.forEach(o => this.tickets.push({ c, o }));
      c.state = 'waitfood';
      c.patience = Math.min(1, c.patience + 0.2);
      if (c.orders.length > 1) c.ptime *= 1.5;
      if (c.orders[0].live) c.ptime *= 1.3;
      FR.sfx('order');
      if (!c.regular && !c.returning && this.res.requests.length < C.maxRequestsPerNight && Math.random() < C.specialRequestChance) {
        const opts = D.recipes.filter(r => !r.legendary && !S.menu.includes(r.id) && FR.edible(c.species, r) && !this.res.requests.some(q => q.recipe === r.id));
        if (opts.length) {
          const r = FR.pick(opts);
          this.res.requests.push({ recipe: r.id, role: c.role.id, species: c.species.id });
          U.toast(this, `${c.species.name} ${c.role.name}: "Do you ever serve ${r.name}? I'd come back for that."`, '#ffe9a8');
        }
      }
      if (c.returning && c.orders[0].payMult === 2) U.float(this, tb.x, tb.y - 130, 'Back for their request! Pays double', '#9cffb0');
      this.drawBubble(c); this.drawRail();
    }

    wants(c, it) { return c.orders.find(o => o.status !== 'served' && (it.live ? o === it.live : !o.live && it.recipe && o.recipe.id === it.recipe.id)); }

    serve(c, it) {
      const tb = c.table, o = this.wants(c, it);
      if (!o) {
        if (c.species.id === 'mermaid' && (it.live || it.recipe.kind !== 'kelp')) {
          this.drop(it);
          this.res.reviews.push(1);
          FR.sfx('bad'); J.shake(this, 0.008); J.burst(this, tb.x, tb.y - 60, 0x5bd1ff, 16);
          U.float(this, tb.x, tb.y - 130, 'FISH?! How dare you! ★', '#ff9c9c');
          this.breakCombo('served a Mermaid fish');
          tb.dirty++; this.drawMess(tb);
          this.release(c);
        } else { U.float(this, tb.x, tb.y - 130, "That's not my order!", '#ffe9a8'); FR.sfx('bad'); this.breakCombo('wrong dish'); }
        return;
      }
      this.drop(it);
      this.refundNeed(o);
      o.status = 'served'; o.quality = it.quality;
      if (it.live) {
        const f = D.fish[it.fishId];
        const pay = Math.round(f.value * C.priceMultiplier * C.liveCatchPay * c.role.pay * (c.species.pay || 1));
        o.livePay = { pay, tip: Math.round(it.flashy ? pay * 0.5 : pay * C.tipRate), flashy: it.flashy };
        this.liveOpen = false;
      }
      if (it.quality === 'burnt') this.breakCombo('served a burnt dish');
      else {
        this.combo++; this.res.bestCombo = Math.max(this.res.bestCombo, this.combo);
        if (this.combo >= 2) { J.pop(this, tb.x, tb.y - 150, `COMBO x${this.combo}`, '#ffe14d', 24 + Math.min(12, this.combo * 2)); FR.sfx('perfect'); }
      }
      c.comboMult = Math.max(c.comboMult || 1, 1 + C.comboStep * Math.min(this.combo, C.comboMax));
      J.burst(this, tb.x, tb.y - 50, it.quality === 'perfect' ? 0x9cffb0 : 0xffe9a8, 10);
      FR.sfx('good');
      this.tickets = this.tickets.filter(tk => tk.o !== o);
      if (c.orders.every(x => x.status === 'served')) { c.state = 'eating'; c.eat = C.eatSeconds; }
      else c.patience = Math.min(1, c.patience + 0.25);
      this.drawBubble(c); this.drawRail();
    }

    // Work out the bill when they finish eating.
    bill(c) {
      let pay = 0, tip = 0, worst = 5;
      c.orders.forEach(o => {
        if (o.live) { pay += o.livePay.pay; tip += o.livePay.tip; worst = Math.min(worst, o.livePay.flashy ? 5 : 4); return; }
        const q = C.quality[o.quality];
        worst = Math.min(worst, q.review);
        if (c.role.id === 'foodie' && o.quality === 'burnt') return; // a Foodie will not pay for a burnt dish
        const base = FR.price(o.recipe) * q.pay * c.role.pay * (c.species.pay || 1) * (o.payMult || 1);
        pay += base;
        tip += base * C.tipRate * c.patience;
        if (c.role.id === 'foodie' && o.quality === 'perfect') tip += base * C.foodiePerfectTip;
      });
      let review = worst;
      if (c.patience < 0.2) review = Math.max(1, review - 1);
      c.due = { pay: Math.round(pay), tip: Math.round(tip * (c.comboMult || 1)), review };
      c.state = 'paying'; c.payT = 0;
      this.drawBubble(c);
      FR.sfx('order');
    }

    collect(c) {
      const S = FR.state, tb = c.table, late = c.payT > C.payGrace;
      const pay = c.due.pay, tip = late ? 0 : c.due.tip, review = late ? Math.max(1, c.due.review - 1) : c.due.review;
      FR.earn('sales', pay); FR.earn('tips', tip);
      this.res.earned += pay; this.res.tips += tip; this.res.served++;
      this.res.reviews.push(review);
      if (c.orders.some(o => o.live && o.livePay.flashy)) this.res.reviews.push(5);
      FR.sfx(pay > 0 ? 'coin' : 'bad');
      J.burst(this, tb.x, tb.y - 40, 0xffd23c, pay > 0 ? 14 : 0);
      U.float(this, tb.x, tb.y - 130, pay > 0 ? `+$${pay}${tip ? '  tip $' + tip : late ? '  (no tip: too slow)' : ''}   ${'★'.repeat(review)}` : `Burnt! No pay   ${'★'.repeat(review)}`, pay > 0 ? '#9cffb0' : '#ff9c9c');
      if (c.role.id === 'pirate' && !S.spot && Math.random() < C.pirateMapChance) {
        S.spot = true; S.baits.gold += 2;
        this.res.events.push('A pirate paid with a treasure map! It led to a stash of 2 gold flakes, the bait legends like.');
        U.toast(this, 'The pirate slides a treasure map across the table!', '#ffe9a8');
      }
      if (c.species.id === 'seaking' && Math.random() < C.seaKingBaitChance) {
        S.baits.gold++;
        this.res.events.push('A Sea King tipped you with gold flakes (rare bait).');
        U.float(this, tb.x, tb.y - 108, '+1 gold flakes', '#ffe9a8');
      }
      if (c.regular && c.orders.some(o => !o.live && o.recipe.id === c.regular.favorite) && S.friends[c.regular.id] < C.friendshipGoal) {
        const f = ++S.friends[c.regular.id];
        if (f >= C.friendshipGoal) {
          const r = FR.recipe(c.regular.reward);
          if (FR.unlockRecipe(r.id)) this.res.events.push(`${c.regular.name} is now a friend and taught you a recipe: ${r.name}!`);
          else { FR.earn('rewards', 50); this.res.events.push(`${c.regular.name} is now a friend and left a $50 gift.`); }
        } else this.res.events.push(`${c.regular.name} loved their favorite dish. Friendship ${f}/${C.friendshipGoal}.`);
      }
      tb.dirty += c.orders.length; this.drawMess(tb);
      this.release(c);
    }

    refundNeed(o) {
      o.need.forEach(n => { if (n.t === 'fish') FR.refundFish(n.fish); else FR.state.sides[n.id]++; });
      o.need = [];
    }

    // A customer is done (paid, walked out, or stormed off): free their table.
    release(c) {
      c.orders.forEach(o => { if (o.status !== 'served') { this.refundNeed(o); if (o.live) this.liveOpen = false; } });
      this.tickets = this.tickets.filter(tk => tk.c !== c);
      if (c.table) c.table.cust = null;
      if (this.leading === c) this.leading = null;
      this.customers = this.customers.filter(x => x !== c);
      this.leave(c);
      this.drawRail();
    }

    walkOut(c) {
      this.res.walked++; this.res.reviews.push(1);
      FR.sfx('bad'); this.breakCombo('a customer walked out');
      U.float(this, c.k.x, c.k.y - 90, c.state === 'queue' || c.state === 'follow' ? 'Tired of waiting! ★' : 'Too slow! ★', '#ff9c9c');
      if (c.state === 'queue') { this.queue = this.queue.filter(x => x !== c); this.leave(c); this.layoutQueue(); return; }
      if (c.table) { const eaten = c.orders.filter(o => o.status === 'served').length; if (eaten) { c.table.dirty += eaten; this.drawMess(c.table); } }
      this.release(c);
    }

    drawBubble(c) {
      const b = c.bub;
      b.removeAll(true);
      const rows = [];
      if (c.state === 'ready') rows.push({ icon: 'bell', t: 'Ready to order!', sc: 0.5 });
      else if (c.state === 'waitfood') { if (c.regular) rows.push({ t: c.regular.name, head: true }); c.orders.forEach(o => rows.push({ icon: o.live ? 'dish_live' : 'dish_' + o.recipe.id, t: (o.status === 'served' ? '✓ ' : '') + (o.live ? 'Catch of the moment' : o.recipe.name) })); }
      else if (c.state === 'eating') rows.push({ t: 'Mmm…' });
      else if (c.state === 'paying') rows.push({ icon: 'coin', t: `$${c.due.pay}  Collect!`, sc: 0.5 });
      if (!rows.length) return;
      const texts = rows.map(r => U.text(this, 0, 0, r.t, 12, r.head ? '#b3262b' : '#2b2140', { fontStyle: 'bold' }));
      const w = Math.max(...texts.map((t, i) => t.width + (rows[i].icon ? 26 : 0))) + 16, h = rows.length * 22 + 6;
      const g = this.add.graphics();
      g.fillStyle(0x2b2140, 1); g.fillRoundedRect(-w / 2 - 2, -h - 2, w + 4, h + 5, 10); g.fillTriangle(-7, 2, 7, 2, 0, 10);
      g.fillStyle(c.state === 'paying' ? 0xfff0b0 : 0xfffbe8, 1); g.fillRoundedRect(-w / 2, -h, w, h, 8); g.fillTriangle(-5, -1, 5, -1, 0, 6);
      b.add(g);
      rows.forEach((r, i) => {
        const y = -h + 14 + i * 22;
        let x = -w / 2 + 8;
        if (r.icon) { b.add(this.add.image(x + 10, y, r.icon).setScale(r.sc || 0.36)); x += 26; }
        b.add(texts[i].setPosition(x, y).setOrigin(0, 0.5));
      });
    }

    drawRail() {
      this.rail.removeAll(true);
      this.tickets.slice(0, 8).forEach((tk, i) => {
        const x = 128 + i * 52;
        this.rail.add(U.card(this, x, 64, 46, 32, tk.o.live ? 0x7a4e9c : 0xfffbe8));
        this.rail.add(this.add.image(x - 8, 64, tk.o.live ? 'dish_live' : 'dish_' + tk.o.recipe.id).setScale(0.4));
        this.rail.add(U.text(this, x + 13, 64, String(tk.c.table.i + 1), 14, tk.o.live ? '#ffffff' : '#2b2140', { fontStyle: 'bold' }).setOrigin(0.5));
      });
    }

    // ---------- main loop ----------
    update(time, delta) {
      if (this.ended || this.paused) { if (this.paused) this.inp.poll(); return; }
      const S = FR.state, me = this.me;
      const dt = Math.min(delta, 100) / 1000, gdt = dt * FR.dev.speed;
      const inp = this.inp.poll();
      this.elapsed += gdt; this.timeLeft -= gdt;
      const frac = this.elapsed / C.nightSeconds;

      // light: sunset -> night
      const k = Math.min(1, frac / 0.35);
      this.dusk.setFillStyle(Phaser.Display.Color.GetColor(255 - 235 * k, 138 - 110 * k, 60 + 40 * k), 0.16 + 0.2 * k);
      this.lamps.forEach(l => l.setAlpha(0.28 * k + Math.sin(time / 300 + l.x) * 0.02 * k));
      if (this.raining && Math.random() < dt * 60) { const r = this.add.image(FR.rand(0, 1000), 30, 'rain').setDepth(7005); this.tweens.add({ targets: r, x: r.x - 60, y: 620, duration: 500, onComplete: () => r.destroy() }); }
      this.phaseText.setText(this.timeLeft <= 0 ? 'LAST CALL' : frac < 0.3 ? 'A calm start' : frac < 0.7 ? 'RUSH HOUR' : 'Winding down');

      while (this.timeLeft > 0 && this.arrivals.length && this.arrivals[0].t <= this.elapsed) this.spawn(this.arrivals.shift());

      // --- move ---
      if (this.fight) this.fight.update(dt, inp);
      else {
        if (inp.floorClick && inp.py > 44) this.target = { x: inp.px, y: inp.py };
        let vx = inp.mx, vy = inp.my;
        if (vx || vy) this.target = null;
        else if (this.target) { const dx = this.target.x - me.x, dy = this.target.y - me.y, d = Math.hypot(dx, dy); if (d < 6) this.target = null; else { vx = dx / d; vy = dy / d; } }
        const len = Math.hypot(vx, vy);
        if (len > 0) {
          const step = C.playerSpeed * dt, ox = me.x, oy = me.y;
          const blocked = (x, y) => x < BOUNDS.x0 || x > BOUNDS.x1 || y < BOUNDS.y0 || y > BOUNDS.y1 || this.solid.some(r => Math.abs(x - r.x) < r.w / 2 + 11 && Math.abs(y - r.y) < r.h / 2 + 8);
          const nx = me.x + vx / len * step, ny = me.y + vy / len * step;
          if (!blocked(nx, me.y)) me.x = nx;
          if (!blocked(me.x, ny)) me.y = ny;
          if (me.x === ox && me.y === oy) this.target = null;
          if (vx) me.body.flipX = vx < 0;
          me.body.y = -18 + Math.abs(Math.sin(time / 70)) * -4;
        } else me.body.y = -18;
        me.k.setPosition(me.x, me.y).setDepth(me.y);
      }

      // --- what can I use from here? ---
      let best = null, bestD = C.reach, act = null;
      if (!this.fight) for (const th of this.things) {
        const d = rectDist(th.rect, me.x, me.y);
        if (d >= bestD) continue;
        const a = th.action();
        if (a) { best = th; bestD = d; act = a; }
      }
      this.prompt.setVisible(!!act); this.ring.setVisible(!!act);
      this.holdBar.objs.forEach(o => o.setVisible(!!(act && act.hold)));
      if (act) {
        const r = best.rect;
        this.ring.setPosition(r.x, r.y).setSize(r.w + 8, r.h + 8).setStrokeStyle(3, act.press || act.hold ? 0xffe14d : 0x8a97a5);
        this.prompt.setText(act.label).setPosition(Phaser.Math.Clamp(r.x, 90, 870), r.y - r.h / 2 - 30).setColor(act.press || act.hold ? '#ffffff' : '#c9d3da');
        if (act.hold) {
          this.holdBar.objs.forEach(o => o.setPosition(r.x - 30, r.y - r.h / 2 - 22));
          this.holdBar.fill.x = r.x - 29;
          this.holdBar.set(act.prog || 0);
          if (inp.down) act.hold(dt);
        } else if (act.press && inp.just) act.press();
      }

      // --- customers ---
      if (this.leading) {
        const c = this.leading, dx = me.x - c.k.x, dy = me.y - c.k.y, d = Math.hypot(dx, dy);
        if (d > 46) { c.k.x += dx / d * Math.min(d - 46, 230 * dt); c.k.y += dy / d * Math.min(d - 46, 230 * dt); }
      }
      for (const c of this.customers.concat(this.queue, this.leading ? [this.leading] : [])) {
        c.k.setDepth(c.k.y + (c.state === 'follow' ? 0 : -8));
        if (c.state === 'seated') { c.think -= gdt; if (c.think <= 0) { c.state = 'ready'; this.drawBubble(c); FR.sfx('order'); } }
        else if (c.state === 'eating') { c.eat -= gdt; c.body.y = Math.sin(time / 110) * 2; if (c.eat <= 0) { c.body.y = 0; this.bill(c); } }
        else if (c.state === 'paying') {
          c.payT += gdt;
          if (c.payT > C.payGrace * 2) { // gave up waiting: leaves the money, no tip, a worse review
            c.table.cash = (c.table.cash || 0) + c.due.pay; this.res.served++; this.res.reviews.push(Math.max(1, c.due.review - 1));
            c.table.dirty += c.orders.length; this.drawMess(c.table);
            U.float(this, c.table.x, c.table.y - 130, 'Nobody came for the money…', '#ff9c9c');
            this.release(c);
          }
        }
        const waiting = ['queue', 'follow', 'ready', 'waitfood'].includes(c.state);
        if (waiting) c.patience -= gdt / c.ptime * (c.state === 'queue' || c.state === 'follow' ? C.queuePatienceRate : c.rate);
        const shown = c.state === 'paying' ? Math.max(0, 1 - c.payT / C.payGrace) : c.patience;
        c.bar.objs.forEach(o => o.setVisible(waiting || c.state === 'paying'));
        c.bar.set(shown);
        c.bar.color(shown > 0.5 ? 0x6fdc6f : shown > 0.25 ? 0xffc93c : 0xff5b5b);
        // moods you can see: impatient customers shake
        if (waiting && c.patience < 0.3 && c.state !== 'follow') c.body.x = Math.sin(time / 40) * 2; else c.body.x = 0;
        if (waiting && c.patience <= 0) this.walkOut(c);
      }

      // --- cooking ---
      for (const h of this.heats) {
        h.slots.forEach((s, i) => {
          if (!s) return;
          const before = this.stage(s);
          s.t += gdt;
          const stg = this.stage(s), b = h.bars[i];
          if (stg !== before) {
            if (stg === 'perfect') { FR.sfx('perfect'); J.pop(this, h.x - 70, h.y - 20, 'DONE!', '#9cffb0', 22); }
            if (stg === 'burnt') { FR.sfx('bad'); b.icon.setTint(0x3a2a22); }
          }
          const over = s.t - C.cookSeconds;
          if (stg === 'cooking') { b.bar.color(0xff8a3c); b.bar.set(s.t / C.cookSeconds); }
          else if (stg === 'perfect') { b.bar.color(0x6fdc6f); b.bar.set(1 - over / C.perfectWindow); }
          else if (stg === 'good') { b.bar.color(0xffc93c); b.bar.set(1 - (over - C.perfectWindow) / C.goodWindow); }
          else { b.bar.color(0x3a2a22); b.bar.set(1); }
          if (Math.random() < dt * (stg === 'burnt' ? 7 : 2.5)) J.puff(this, h.x + b.x, h.y - 26, stg === 'burnt' ? 0x333333 : 0xffffff);
          if (stg === 'cooking' && Math.random() < dt * 1.5) FR.sfx('sizzle');
        });
      }

      this.plateText.setText(`Clean plates: ${this.clean}   In sink: ${this.sink.dirty}`);
      this.comboText.setText(this.combo >= 2 ? `COMBO x${this.combo}  (tips +${Math.round(C.comboStep * Math.min(this.combo, C.comboMax) * 100)}%)` : '');
      this.hud.set(U.clock(this.timeLeft));

      // --- closing time ---
      if (this.timeLeft <= 0 && this.queue.length) { this.queue.forEach(c => this.leave(c)); this.queue = []; }
      const empty = !this.arrivals.length && !this.customers.length && !this.queue.length && !this.leading;
      this.idleT = empty ? this.idleT + dt : 0;
      if (!this.fight && (this.timeLeft <= -C.lastCallSeconds || this.idleT > 1.5 || (this.timeLeft <= 0 && !this.customers.length && !this.leading))) this.endNight();
    }

    endNight() {
      this.ended = true;
      // anyone still waiting to pay settles up at the door, without a tip
      this.customers.forEach(c => {
        if (c.state === 'paying') { FR.earn('sales', c.due.pay); this.res.earned += c.due.pay; this.res.served++; this.res.reviews.push(Math.max(1, c.due.review - 1)); }
        c.orders.forEach(o => { if (o.status !== 'served') this.refundNeed(o); });
      });
      this.tables.forEach(tb => { if (tb.cash) { FR.earn('sales', tb.cash); this.res.earned += tb.cash; } });
      // ingredients left in your hands or on a board go back in stock
      const back = this.me.carry.concat(...this.boards.map(b => b.items)).filter(it => it.k === 'ing');
      back.forEach(it => { if (it.t === 'fish') FR.refundFish(it.fish); else FR.state.sides[it.id]++; });
      this.scene.start('Summary', FR.endDay(this.res));
    }
  }

  FR.ServiceScene = ServiceScene;
})();
