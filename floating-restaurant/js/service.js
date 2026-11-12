// Night: customers board, order from the menu, and you cook and serve them.
(function () {
  const U = FR.ui, D = FR.DATA, C = D.config;
  const TABLE_POS = [[150, 232], [335, 232], [520, 232], [150, 440], [335, 440], [520, 440]];
  const HEAD = 140; // how far above a table the floating text appears
  const STATION_X = [715, 805, 895];

  class ServiceScene extends Phaser.Scene {
    constructor() { super('Service'); }

    create() {
      const S = FR.state, th = D.themes[S.theme];
      this.inp = FR.makeInput(this);
      this.timeLeft = C.nightSeconds;
      this.elapsed = 0; this.ended = false; this.modal = null; this.sel = null;
      this.liveOpen = false; this.idleT = 0;
      this.res = { earned: 0, tips: 0, reviews: [], served: 0, walked: 0, turned: 0, requests: [], events: [] };
      this.customers = []; this.queue = [];

      // Deck at night, lit by lanterns
      FR.art.build(this);
      this.add.image(480, 300, 'nightsea');
      this.add.image(335, 295, 'deck_' + S.theme);
      this.add.rectangle(335, 295, 600, 460, 0x0b1b2e, S.decor.lanterns ? 0.1 : 0.32);
      if (S.decor.lanterns) [[70, 96], [600, 96], [70, 500], [600, 500], [335, 96]].forEach(([x, y], i) => {
        const gl = this.add.circle(x, y + 8, 70, 0xffc56b, 0.16);
        this.tweens.add({ targets: gl, alpha: 0.1, scale: 0.94, duration: 900 + i * 130, yoyo: true, repeat: -1 });
        this.add.image(x, y, 'lantern');
      });
      if (S.decor.plants) [[48, 300], [622, 300]].forEach(([x, y]) => this.add.image(x, y, 'plant'));
      if (S.decor.sign) {
        this.add.image(335, 70, 'plank');
        U.text(this, 335, 70, 'FLOATING RESTAURANT', 15, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0.5);
      }

      this.tables = [];
      for (let i = 0; i < FR.tableCount(); i++) {
        const [x, y] = TABLE_POS[i];
        this.add.image(x, y, S.decor.tablestyle ? 'table_fancy' : 'table_' + S.theme);
        U.text(this, x, y + 36, 'Table ' + (i + 1), 11, '#ffffff').setOrigin(0.5).setAlpha(0.7);
        this.tables.push({ i, x, y, cust: null });
      }
      U.text(this, 30, 548, 'Waiting to\nbe seated:', 12, '#bfe3ff');

      // Kitchen
      this.add.image(805, 318, 'kitchen');
      U.title(this, 805, 58, 'KITCHEN', 20).setOrigin(0.5);
      this.stations = [];
      for (let i = 0; i < 3; i++) {
        const open = i < FR.stationCount(), x = STATION_X[i], y = 112;
        const box = this.add.image(x, y, 'stove');
        if (!open) { box.setTint(0x445566).setAlpha(0.45); U.text(this, x, y, 'locked', 11, '#8a97a5').setOrigin(0.5); continue; }
        const ring = this.add.rectangle(x, y, 88, 78).setStrokeStyle(4, 0xffe14d).setVisible(false);
        const dish = this.add.image(x, y - 12, 'dish_kelp_wrap').setScale(0.78).setVisible(false);
        const txt = U.text(this, x, y + 21, '', 11, '#cfe3f2', { align: 'center', fontStyle: 'bold', stroke: '#2b2140', strokeThickness: 3 }).setOrigin(0.5);
        const bar = U.bar(this, x - 34, y + 31, 68, 7, 0xff8a3c);
        const bin = U.text(this, x + 30, y - 27, '✕', 15, '#ff9c9c', { fontStyle: 'bold', stroke: '#2b2140', strokeThickness: 3 }).setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
        const st = { i, x, y, box, ring, dishImg: dish, txt, bar, bin, state: 'empty', dish: null, t: 0 };
        box.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.clickStation(st));
        bin.on('pointerdown', () => { st.state = 'empty'; st.dish = null; if (this.sel === st) this.sel = null; this.drawStation(st); });
        this.stations.push(st);
        this.drawStation(st);
      }
      this.tip = U.text(this, 805, 166, '', 12, '#ffe9a8', { align: 'center', wordWrap: { width: 262 } }).setOrigin(0.5);
      U.text(this, 675, 186, 'Orders — click one to cook it:', 12, '#bfe3ff');
      this.ticketC = this.add.container(0, 0).setDepth(10);

      let ly = 440;
      const legendRow = (key, text) => { this.add.image(686, ly, key).setScale(0.62); U.text(this, 700, ly, text, 11, '#bfd3e6').setOrigin(0, 0.5); ly += 19; };
      Object.values(D.roles).forEach(r => legendRow('role_' + r.id, `${r.name}: ${r.blurb}`));
      ly += 5;
      Object.values(D.species).filter(sp => D.areas[S.area].species[sp.id]).forEach(sp => legendRow('sp_' + sp.id, `${sp.name}: ${sp.blurb}`));

      this.hud = U.hud(this, 'Night');
      this.actionBtn = this.inp.addActionButton(880, 545).setVisible(false);
      this.buildArrivals();
      this.setTip();
    }

    // ---------- arrivals ----------
    buildArrivals() {
      const S = FR.state, list = [];
      for (let i = 0; i < FR.customersTonight(); i++) {
        const roleW = {};
        for (const id in D.roles) roleW[id] = D.roles[id].weight;
        list.push({ role: FR.weighted(roleW), species: FR.weighted(D.areas[S.area].species) });
      }
      D.regulars.forEach(r => { if (S.day % C.regularEvery === r.dayMod) list.push({ role: r.role, species: r.species, regular: r }); });
      S.requests.forEach(q => { if (S.menu.includes(q.recipe)) list.push({ role: q.role, species: q.species, returning: q.recipe }); });
      for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
      const span = C.nightSeconds * 0.72;
      list.forEach((a, i) => { a.t = 3 + (i + FR.rand(0, 0.6)) * span / list.length; });
      this.arrivals = list;
    }

    spawn(spec) {
      const S = FR.state;
      const c = {
        role: D.roles[spec.role], species: D.species[spec.species], regular: spec.regular || null, returning: spec.returning || null,
        patience: 1, rate: 1, orders: [], state: 'queue'
      };
      c.ptime = C.patience[c.role.patience] * (1 + C.decorPatienceBonus * FR.decorCount());
      const k = this.add.container(-40, 560).setDepth(20);
      const body = this.add.image(0, 0, FR.art.customerKey(c));
      const rb = this.add.image(-15, -46, 'role_' + c.role.id).setScale(0.86);
      const sb = this.add.image(15, -46, 'sp_' + c.species.id).setScale(0.86);
      const bar = U.bar(this, -24, 38, 48, 7, 0x6fdc6f);
      const bub = this.add.container(0, -62);
      k.add([body, rb, sb, ...bar.objs, bub]);
      body.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.clickCustomer(c));
      c.k = k; c.bar = bar; c.bub = bub; c.body = body;

      const menu = S.menu.map(FR.recipe);
      let no = null;
      if (c.role.minMenu && menu.length < c.role.minMenu) no = `Only ${menu.length} dishes? No thanks.`;
      else if (!menu.some(r => FR.edible(c.species, r))) {
        no = c.species.id === 'mermaid' ? 'No kelp dish? Hmph!' : c.species.id === 'seaking' ? 'No fantasy fish? Bah!' : 'Nothing for me here.';
      }
      if (no) {
        this.res.turned++;
        this.tweens.add({ targets: k, x: 60, duration: 500, onComplete: () => { U.float(this, 90, 540, no, '#ff9c9c'); this.leave(c); } });
        return;
      }
      this.queue.push(c);
      this.layoutQueue();
    }

    layoutQueue() {
      this.queue.forEach((c, i) => this.tweens.add({ targets: c.k, x: 140 + i * 58, y: 560, duration: 350 }));
    }

    leave(c) {
      c.state = 'gone';
      this.tweens.add({ targets: c.k, x: -60, alpha: 0, delay: 500, duration: 600, onComplete: () => c.k.destroy() });
    }

    // ---------- seating and ordering ----------
    chooseDish(c) {
      const S = FR.state;
      const avail = S.menu.map(FR.recipe).filter(r => FR.edible(c.species, r) && FR.canMakeCount(r) > 0);
      if (!avail.length) return null;
      if (c.returning) { const r = avail.find(a => a.id === c.returning); if (r) return r; }
      if (c.regular) { const r = avail.find(a => a.id === c.regular.favorite); if (r) return r; }
      if (c.role.id === 'sailor') return avail.sort((a, b) => a.price - b.price || a.steps.length - b.steps.length)[0];
      if (c.role.id === 'pirate') return avail.sort((a, b) => b.price - a.price)[0];
      const w = {};
      avail.forEach(r => { w[r.id] = r.price; });
      return FR.recipe(FR.weighted(w));
    }

    seat(c, tb) {
      const S = FR.state;
      tb.cust = c; c.table = tb; c.state = 'seated';
      this.customers.push(c);
      this.tweens.add({ targets: c.k, x: tb.x, y: tb.y - 60, duration: 400 });

      const edibleNow = S.menu.map(FR.recipe).filter(r => FR.edible(c.species, r) && FR.canMakeCount(r) > 0);
      if (c.species.fantasyNerves && edibleNow.length && edibleNow.every(r => r.kind === 'fantasy')) c.rate = c.species.fantasyNerves;

      const fishEater = c.species.eats.includes('real') || c.species.eats.includes('fantasy');
      if (!c.regular && !c.returning && fishEater && !this.liveOpen && Math.random() < C.liveCatchChance) {
        c.orders.push({ live: true, status: 'pending' });
        this.liveOpen = true;
        c.ptime *= 1.3;
      } else {
        for (let i = 0; i < (c.species.orders || 1); i++) {
          const r = this.chooseDish(c);
          if (!r) break;
          c.orders.push({ recipe: r, reserved: FR.reserve(r), started: false, status: 'pending', payMult: c.returning === r.id ? 2 : 1 });
        }
        if (c.orders.length > 1) c.ptime *= 1.5;
      }
      if (!c.orders.length) {
        this.res.turned++;
        U.float(this, tb.x, tb.y - HEAD, 'Everything is sold out!', '#ff9c9c');
        this.release(c);
        return;
      }

      // Special request: a dish that is not on tonight's menu
      if (!c.regular && !c.returning && this.res.requests.length < C.maxRequestsPerNight && Math.random() < C.specialRequestChance) {
        const opts = D.recipes.filter(r => !S.menu.includes(r.id) && FR.edible(c.species, r) && !this.res.requests.some(q => q.recipe === r.id));
        if (opts.length) {
          const r = FR.pick(opts);
          this.res.requests.push({ recipe: r.id, role: c.role.id, species: c.species.id });
          U.toast(this, `${c.species.name} ${c.role.name}: "Do you ever serve ${r.name}? I'd come back for that."`, '#ffe9a8');
        }
      }
      if (c.regular) U.toast(this, `${c.regular.name}: "${FR.pick(c.regular.lines)}"`, '#ffe9a8');
      if (c.returning && c.orders[0].payMult === 2) U.float(this, tb.x, tb.y - HEAD, 'Back for their request! Pays double', '#9cffb0');
      this.drawBubble(c);
      this.drawTickets();
    }

    // Speech bubble: a little picture and the name of each dish they ordered.
    drawBubble(c) {
      c.bub.removeAll(true);
      const rows = [];
      if (c.regular) rows.push({ t: c.regular.name, head: true });
      c.orders.forEach(o => rows.push({ icon: o.live ? 'dish_live' : 'dish_' + o.recipe.id, t: (o.status === 'served' ? '✓ ' : '') + (o.live ? 'Catch of the moment' : o.recipe.name) }));
      const texts = rows.map(r => U.text(this, 0, 0, r.t, 12, r.head ? '#b3262b' : '#2b2140', { fontStyle: 'bold' }));
      const w = Math.max(...texts.map((t, i) => t.width + (rows[i].icon ? 26 : 0))) + 16, h = rows.length * 22 + 6;
      const g = this.add.graphics();
      g.fillStyle(0x2b2140, 1); g.fillRoundedRect(-w / 2 - 2, -h - 2, w + 4, h + 5, 10);
      g.fillTriangle(-7, 2, 7, 2, 0, 10);
      g.fillStyle(0xfffbe8, 1); g.fillRoundedRect(-w / 2, -h, w, h, 8);
      g.fillTriangle(-5, -1, 5, -1, 0, 6);
      c.bub.add(g);
      rows.forEach((r, i) => {
        const y = -h + 14 + i * 22;
        let x = -w / 2 + 8;
        if (r.icon) { c.bub.add(this.add.image(x + 10, y, r.icon).setScale(0.36)); x += 26; }
        c.bub.add(texts[i].setPosition(x, y).setOrigin(0, 0.5));
      });
    }

    // A customer is done (paid, walked out, or stormed off): free their table.
    release(c) {
      c.orders.forEach(o => {
        if (o.live) { if (o.status !== 'served') this.liveOpen = false; }
        else if (!o.started) { FR.refund(o.reserved); o.started = true; }
      });
      if (c.table) c.table.cust = null;
      this.customers = this.customers.filter(x => x !== c);
      if (this.modal && this.modal.cust === c) this.closeModal();
      this.leave(c);
      this.drawTickets();
    }

    // ---------- kitchen ----------
    drawTickets() {
      this.ticketC.removeAll(true);
      let y = 220;
      this.customers.forEach(c => c.orders.forEach(o => {
        if (o.status !== 'pending' || o.started || y > 400) return;
        const label = `Table ${c.table.i + 1}:  ${o.live ? '★ Catch of the moment' : o.recipe.name}`;
        this.ticketC.add(U.button(this, 805, y, 256, 28, label, () => (o.live ? this.startLive(c, o) : this.startCook(c, o)), { color: o.live ? 0x7a4e9c : 0x2f6f8f, size: 13, icon: o.live ? 'dish_live' : 'dish_' + o.recipe.id }));
        y += 35;
      }));
    }

    drawStation(st) {
      const ql = st.dish ? C.quality[st.dish.quality].label : '';
      st.txt.setText(st.state === 'busy' ? 'prepping…' : st.state === 'cooking' ? 'cooking…' : st.state === 'ready' ? ql + ' ✓' : '');
      st.txt.setColor(st.state === 'ready' ? (st.dish.quality === 'burnt' ? '#ff9c9c' : '#9cffb0') : '#cfe3f2');
      st.dishImg.setVisible(!!st.dish);
      if (st.dish) st.dishImg.setTexture('dish_' + st.dish.recipe.id).setAlpha(st.state === 'ready' ? 1 : 0.75);
      if (st.dish && st.dish.quality === 'burnt' && st.state === 'ready') st.dishImg.setTint(0x6b5a4a); else st.dishImg.clearTint();
      st.ring.setVisible(this.sel === st);
      st.bar.objs.forEach(o => o.setVisible(st.state === 'cooking'));
      st.bin.setVisible(st.state === 'ready');
    }

    setTip() {
      this.tip.setText(this.sel ? `Now click the customer who ordered ${this.sel.dish.recipe.name}.` : 'When a dish is READY, click it, then click the customer.');
    }

    startCook(c, o) {
      if (this.modal || this.ended || o.started) return;
      const st = this.stations.find(s => s.state === 'empty');
      if (!st) { U.toast(this, 'Every kitchen station is busy.', '#ff9c9c'); return; }
      o.started = true;
      st.state = 'busy';
      this.drawStation(st);
      this.drawTickets();
      this.actionBtn.setVisible(true);
      this.modal = new FR.CookSession(this, o.recipe, score => {
        this.modal = null;
        this.actionBtn.setVisible(false);
        st.dish = { recipe: o.recipe, quality: FR.qualityOf(score, o.reserved) };
        st.state = 'cooking'; st.t = C.cookSeconds;
        this.drawStation(st);
      });
      this.modal.station = st;
    }

    clickStation(st) {
      if (this.modal || st.state !== 'ready') return;
      this.sel = this.sel === st ? null : st;
      this.stations.forEach(s => this.drawStation(s));
      this.setTip();
    }

    clickCustomer(c) {
      if (this.modal || this.ended || c.state !== 'seated') return;
      const wants = id => c.orders.find(o => !o.live && o.status !== 'served' && o.recipe.id === id);
      let st = this.sel;
      if (!st) st = this.stations.find(s => s.state === 'ready' && wants(s.dish.recipe.id));
      if (!st) { U.toast(this, 'Cook their order from the Orders list first, then serve it.', '#ffe9a8'); return; }
      const dish = st.dish, o = wants(dish.recipe.id);
      const clear = () => { st.state = 'empty'; st.dish = null; this.sel = null; this.stations.forEach(s => this.drawStation(s)); this.setTip(); };
      if (o) {
        if (!o.started) { FR.refund(o.reserved); o.started = true; }
        o.status = 'served'; o.quality = dish.quality;
        clear();
        if (c.orders.every(x => x.status === 'served')) this.pay(c);
        else { c.patience = Math.min(1, c.patience + 0.25); this.drawBubble(c); this.drawTickets(); }
      } else if (c.species.id === 'mermaid' && dish.recipe.kind !== 'kelp') {
        clear();
        this.res.reviews.push(1);
        FR.sfx('bad');
        U.float(this, c.table.x, c.table.y - HEAD, 'FISH?! How dare you! ★', '#ff9c9c');
        this.release(c);
      } else {
        this.sel = null;
        this.stations.forEach(s => this.drawStation(s));
        this.setTip();
        U.float(this, c.table.x, c.table.y - HEAD, "That's not my order!", '#ffe9a8');
      }
    }

    // ---------- paying ----------
    pay(c) {
      const S = FR.state, x = c.table.x, y = c.table.y - HEAD;
      let pay = 0, tip = 0, worst = 5;
      c.orders.forEach(o => {
        const q = C.quality[o.quality];
        worst = Math.min(worst, q.review);
        if (c.role.id === 'foodie' && o.quality === 'burnt') return; // a Foodie will not pay for a burnt dish
        const base = o.recipe.price * q.pay * c.role.pay * (c.species.pay || 1) * (o.payMult || 1);
        pay += base;
        tip += base * C.tipRate * c.patience;
        if (c.role.id === 'foodie' && o.quality === 'perfect') tip += base * C.foodiePerfectTip;
      });
      pay = Math.round(pay); tip = Math.round(tip);
      let review = worst;
      if (c.patience < 0.2) review = Math.max(1, review - 1);
      S.money += pay + tip;
      this.res.earned += pay; this.res.tips += tip; this.res.served++;
      this.res.reviews.push(review);
      FR.sfx(pay > 0 ? 'coin' : 'bad');
      U.float(this, x, y, pay > 0 ? `+$${pay}${tip ? '  tip $' + tip : ''}   ${'★'.repeat(review)}` : `Burnt! No pay   ${'★'.repeat(review)}`, pay > 0 ? '#9cffb0' : '#ff9c9c');

      if (c.role.id === 'pirate' && !S.spot && Math.random() < C.pirateMapChance) {
        S.spot = true;
        this.res.events.push('A pirate paid with a treasure map! It unlocks the Sunken Reef fishing spot (toggle it in the morning).');
        U.toast(this, 'The pirate slides a treasure map across the table!', '#ffe9a8');
      }
      if (c.species.id === 'seaking' && Math.random() < C.seaKingBaitChance) {
        S.bait++;
        this.res.events.push('A Sea King tipped you with rare bait.');
        U.float(this, x, y + 20, '+1 rare bait', '#ffe9a8');
      }
      if (c.regular && c.orders.some(o => o.recipe.id === c.regular.favorite) && S.friends[c.regular.id] < C.friendshipGoal) {
        const f = ++S.friends[c.regular.id];
        if (f >= C.friendshipGoal) {
          const r = FR.recipe(c.regular.reward);
          if (FR.unlockRecipe(r.id)) this.res.events.push(`${c.regular.name} is now a friend and taught you a recipe: ${r.name}!`);
          else { S.money += 50; this.res.events.push(`${c.regular.name} is now a friend and left a $50 gift.`); }
        } else this.res.events.push(`${c.regular.name} loved their favorite dish. Friendship ${f}/${C.friendshipGoal}.`);
      }
      this.release(c);
    }

    // ---------- live catch: fishing as dinner theater ----------
    startLive(c, o) {
      if (this.modal || this.ended) return;
      const panel = U.panel(this, 640, 400, 'Catch of the moment — the whole deck is watching!', 100);
      const th = D.themes[FR.state.theme];
      panel.add(this.add.image(0, 70, 'water_' + FR.state.area).setCrop(180, 0, 600, 170).setPosition(0, 130));
      panel.add(this.add.rectangle(-240, -24, 124, 30, th.deck).setStrokeStyle(3, 0x2b2140));
      panel.add(this.add.image(-250, -70, 'captain'));
      panel.add(U.text(this, 0, -150, 'Their patience keeps draining. A clean or rare catch thrills the crowd.', 13, '#ffffff').setOrigin(0.5));
      const rig = new FR.FishingRig(this, {
        depth: 110, tipX: 300, tipY: 250, waterY: 312, castMinX: 330, castMaxX: 770, hintX: 480, hintY: 490,
        night: true, quick: true, canFish: () => true,
        onCatch: (id, cut) => this.liveResult(c, o, id, cut),
        onFail: () => this.liveResult(c, o, null),
        onInfo: msg => U.toast(this, msg, '#ffe9a8')
      });
      this.actionBtn.setVisible(true);
      this.modal = { cust: c, update: (dt, inp) => rig.update(dt, inp), destroy: () => { rig.destroy(); panel.destroy(); } };
    }

    liveResult(c, o, id, cut) {
      const S = FR.state;
      this.closeModal();
      this.liveOpen = false;
      o.status = 'served';
      if (c.state !== 'seated') return;
      const x = c.table.x, y = c.table.y - HEAD;
      const others = this.customers.filter(k => k !== c);
      if (!id) {
        FR.sfx('bad');
        this.res.reviews.push(2);
        others.forEach(k => { k.patience = Math.max(0.05, k.patience - 0.1); });
        U.toast(this, 'The fish got away… the whole deck groans.', '#ff9c9c');
        this.release(c);
        return;
      }
      const f = D.fish[id];
      const flashy = cut === 'perfect' || f.rarity === 'rare' || f.rarity === 'legendary';
      const pay = Math.round(f.sell * C.liveCatchPay * c.role.pay * (c.species.pay || 1));
      const tip = Math.round(flashy ? pay : pay * C.tipRate);
      S.money += pay + tip;
      this.res.earned += pay; this.res.tips += tip; this.res.served++;
      this.res.reviews.push(flashy ? 5 : 4);
      FR.sfx('good');
      if (flashy) {
        this.res.reviews.push(5); // a flashy catch gets people talking
        others.forEach(k => { k.patience = Math.min(1, k.patience + 0.15); });
        U.toast(this, `A ${f.name}, landed clean in front of everyone. THE CROWD GOES WILD!`, '#9cffb0');
      } else U.toast(this, `You land a ${f.name} to polite applause.`, '#ffe9a8');
      U.float(this, x, y, `+$${pay}  tip $${tip}`, '#9cffb0');
      this.release(c);
    }

    closeModal() {
      if (!this.modal) return;
      if (this.modal.station) { this.modal.station.state = 'empty'; this.drawStation(this.modal.station); }
      this.modal.destroy();
      this.modal = null;
      this.actionBtn.setVisible(false);
    }

    // ---------- main loop ----------
    update(time, delta) {
      if (this.ended) return;
      const dt = Math.min(delta, 100) / 1000, gdt = dt * FR.dev.speed;
      const inp = this.inp.poll();
      this.elapsed += gdt; this.timeLeft -= gdt;

      while (this.arrivals.length && this.arrivals[0].t <= this.elapsed) this.spawn(this.arrivals.shift());

      while (this.queue.length) {
        const tb = this.tables.find(t => !t.cust);
        if (!tb) break;
        this.seat(this.queue.shift(), tb);
        this.layoutQueue();
      }

      for (const c of this.customers.concat(this.queue)) {
        c.patience -= gdt / c.ptime * (c.state === 'queue' ? C.queuePatienceRate : c.rate);
        c.bar.set(c.patience);
        c.bar.color(c.patience > 0.5 ? 0x6fdc6f : c.patience > 0.25 ? 0xffc93c : 0xff5b5b);
        if (c.patience <= 0) {
          this.res.walked++;
          this.res.reviews.push(1);
          FR.sfx('bad');
          if (c.state === 'queue') {
            this.queue = this.queue.filter(x => x !== c);
            U.float(this, c.k.x, 540, 'Tired of waiting! ★', '#ff9c9c');
            this.leave(c);
            this.layoutQueue();
          } else {
            U.float(this, c.table.x, c.table.y - HEAD, 'Too slow! ★', '#ff9c9c');
            this.release(c);
          }
        }
      }

      for (const st of this.stations) {
        if (st.state !== 'cooking') continue;
        st.t -= gdt;
        st.bar.set(1 - st.t / C.cookSeconds);
        if (st.t <= 0) { st.state = 'ready'; FR.sfx('blip'); this.drawStation(st); }
      }

      if (this.modal) this.modal.update(dt, inp);
      this.hud.set(U.clock(this.timeLeft));

      const empty = !this.arrivals.length && !this.customers.length && !this.queue.length;
      this.idleT = empty ? this.idleT + dt : 0;
      if ((this.timeLeft <= 0 && !this.modal) || this.idleT > 1.5) this.endNight();
    }

    endNight() {
      this.ended = true;
      this.closeModal();
      this.customers.forEach(c => c.orders.forEach(o => { if (!o.live && !o.started) FR.refund(o.reserved); }));
      this.scene.start('Summary', FR.endDay(this.res));
    }
  }

  FR.ServiceScene = ServiceScene;
})();
