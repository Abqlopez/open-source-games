// Night: customers board, order from the menu, and you cook and serve them.
(function () {
  const U = FR.ui, D = FR.DATA, C = D.config;
  const TABLE_POS = [[150, 215], [330, 215], [510, 215], [150, 425], [330, 425], [510, 425]];
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

      // Deck (top-down), lit by lanterns
      this.add.rectangle(480, 300, 960, 600, 0x0b1b2e);
      this.add.rectangle(335, 295, 630, 490, th.deck).setStrokeStyle(5, th.trim);
      this.add.rectangle(335, 295, 630, 490, 0x0b1b2e, S.decor.lanterns ? 0.12 : 0.3);
      if (S.decor.lanterns) [[60, 90], [610, 90], [60, 500], [610, 500], [335, 90]].forEach(([x, y]) => {
        this.add.circle(x, y, 60, 0xffc56b, 0.16);
        this.add.circle(x, y, 7, 0xffd98a);
      });
      if (S.decor.plants) [[40, 300], [630, 300]].forEach(([x, y]) => this.add.circle(x, y, 13, 0x4caf50).setStrokeStyle(2, 0x2c6e31));
      if (S.decor.sign) U.text(this, 335, 66, '~ FLOATING RESTAURANT ~', 15, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0.5);

      this.tables = [];
      for (let i = 0; i < FR.tableCount(); i++) {
        const [x, y] = TABLE_POS[i];
        this.add.rectangle(x, y, 104, 50, S.decor.tablestyle ? 0xb3262b : th.table).setStrokeStyle(2, S.decor.tablestyle ? 0xffe9a8 : 0x5b4630);
        U.text(this, x, y, 'Table ' + (i + 1), 12, S.decor.tablestyle ? '#ffe9a8' : '#5b4630').setOrigin(0.5);
        this.tables.push({ i, x, y, cust: null });
      }
      U.text(this, 30, 548, 'Waiting to be seated:', 12, '#bfe3ff');

      // Kitchen
      this.add.rectangle(805, 318, 280, 556, 0x1c2b3a).setStrokeStyle(2, 0x8fb3c9);
      U.text(this, 805, 56, 'KITCHEN', 15, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0.5);
      this.stations = [];
      for (let i = 0; i < 3; i++) {
        const open = i < FR.stationCount(), x = STATION_X[i], y = 112;
        const box = this.add.rectangle(x, y, 82, 72, open ? 0x33485c : 0x222a33).setStrokeStyle(2, 0x8fb3c9, open ? 1 : 0.3);
        const txt = U.text(this, x, y - 6, open ? 'empty' : 'locked', 11, open ? '#cfe3f2' : '#66727e', { align: 'center', wordWrap: { width: 78 } }).setOrigin(0.5);
        if (!open) continue;
        const bar = U.bar(this, x - 36, y + 28, 72, 6, 0xff8a3c);
        const bin = U.text(this, x + 33, y - 28, '✕', 13, '#ff9c9c').setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
        const st = { i, x, y, box, txt, bar, bin, state: 'empty', dish: null, t: 0 };
        box.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.clickStation(st));
        bin.on('pointerdown', () => { st.state = 'empty'; st.dish = null; if (this.sel === st) this.sel = null; this.drawStation(st); });
        this.stations.push(st);
        this.drawStation(st);
      }
      this.tip = U.text(this, 805, 166, '', 12, '#ffe9a8', { align: 'center', wordWrap: { width: 262 } }).setOrigin(0.5);
      U.text(this, 675, 186, 'Orders — click one to cook it:', 12, '#bfe3ff');
      this.ticketC = this.add.container(0, 0).setDepth(10);

      const legend =
        'ROLE (square)\n' + Object.values(D.roles).map(r => `${r.letter} ${r.name}: ${r.blurb}`).join('\n') +
        '\nSPECIES (circle)\n' + Object.values(D.species).filter(sp => D.areas[S.area].species[sp.id]).map(sp => `${sp.letter} ${sp.name}: ${sp.blurb}`).join('\n');
      U.text(this, 675, 452, legend, 11, '#9fb6c9', { lineSpacing: 2 });

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
      const k = this.add.container(-40, 574).setDepth(20);
      const body = this.add.circle(0, 0, 18, c.species.color).setStrokeStyle(2, 0xffffff);
      const rb = this.add.rectangle(-15, -27, 18, 18, c.role.color).setStrokeStyle(1, 0xffffff);
      const rt = U.text(this, -15, -27, c.role.letter, 12, '#ffffff', { fontStyle: 'bold' }).setOrigin(0.5);
      const sb = this.add.circle(15, -27, 10, c.species.color).setStrokeStyle(1, 0xffffff);
      const stx = U.text(this, 15, -27, c.species.letter, 12, '#1a1a1a', { fontStyle: 'bold' }).setOrigin(0.5);
      const bar = U.bar(this, -22, 26, 44, 6, 0x6fdc6f);
      const bubble = U.text(this, 0, -42, '', 12, '#1a1a1a', { backgroundColor: '#fffbe8', padding: { x: 5, y: 3 }, align: 'center' }).setOrigin(0.5, 1).setVisible(false);
      k.add([body, rb, rt, sb, stx, ...bar.objs, bubble]);
      if (c.regular) k.add(U.text(this, 0, 40, c.regular.name, 11, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0.5));
      body.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.clickCustomer(c));
      c.k = k; c.bar = bar; c.bubble = bubble;

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
      this.queue.forEach((c, i) => this.tweens.add({ targets: c.k, x: 190 + i * 52, y: 574, duration: 350 }));
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
      this.tweens.add({ targets: c.k, x: tb.x, y: tb.y - 46, duration: 400 });

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
        U.float(this, tb.x, tb.y - 90, 'Everything is sold out!', '#ff9c9c');
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
      if (c.returning && c.orders[0].payMult === 2) U.float(this, tb.x, tb.y - 96, 'Back for their request! Pays double', '#9cffb0');
      this.drawBubble(c);
      this.drawTickets();
    }

    drawBubble(c) {
      const lines = c.orders.map(o => (o.status === 'served' ? '✓ ' : '') + (o.live ? '★ Catch of\nthe moment' : o.recipe.name));
      c.bubble.setText(lines.join('\n')).setVisible(true);
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
      let y = 218;
      this.customers.forEach(c => c.orders.forEach(o => {
        if (o.status !== 'pending' || o.started || y > 430) return;
        const label = `Table ${c.table.i + 1}:  ${o.live ? '★ Catch of the moment' : o.recipe.name}`;
        this.ticketC.add(U.button(this, 805, y, 256, 26, label, () => (o.live ? this.startLive(c, o) : this.startCook(c, o)), { color: o.live ? 0x7a4e9c : 0x2f6f8f, size: 13 }));
        y += 30;
      }));
    }

    drawStation(st) {
      const ql = st.dish ? C.quality[st.dish.quality].label : '';
      st.txt.setText(st.state === 'empty' ? 'empty' : st.state === 'busy' ? 'prepping…' : st.state === 'cooking' ? st.dish.recipe.name : `${st.dish.recipe.name}\n${ql} — READY`);
      st.txt.setColor(st.state === 'ready' ? '#9cffb0' : '#cfe3f2');
      st.box.setStrokeStyle(this.sel === st ? 4 : 2, this.sel === st ? 0xffe14d : 0x8fb3c9);
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
        U.float(this, c.table.x, c.table.y - 96, 'FISH?! How dare you! ★', '#ff9c9c');
        this.release(c);
      } else {
        this.sel = null;
        this.stations.forEach(s => this.drawStation(s));
        this.setTip();
        U.float(this, c.table.x, c.table.y - 96, "That's not my order!", '#ffe9a8');
      }
    }

    // ---------- paying ----------
    pay(c) {
      const S = FR.state, x = c.table.x, y = c.table.y - 96;
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
      panel.add(this.add.rectangle(0, 70, 600, 170, D.areas[FR.state.area].water));
      panel.add(this.add.rectangle(-240, -30, 120, 40, th.deck).setStrokeStyle(3, th.trim));
      panel.add(this.add.circle(-250, -62, 12, 0xe8b98a));
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
      const x = c.table.x, y = c.table.y - 96;
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
            U.float(this, c.table.x, c.table.y - 96, 'Too slow! ★', '#ff9c9c');
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
