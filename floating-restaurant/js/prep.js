// Afternoon: set tonight's menu, shop, buy gear and bait, upgrade, decorate,
// check the fish tank and journal, and experiment in the kitchen lab.
(function () {
  const U = FR.ui, D = FR.DATA, C = D.config;
  const TABS = [['menu', 'Menu'], ['shop', 'Shop'], ['gear', 'Gear + bait'], ['upgrades', 'Upgrades'], ['decor', 'Decor'], ['tank', 'Fish tank'], ['journal', 'Journal'], ['lab', 'Kitchen lab']];
  const KIND = { real: 'real fish', fantasy: 'fantasy fish', kelp: 'kelp, no fish', mixed: 'mixed fish' };

  function ingredientText(r) {
    const parts = [];
    for (const id in r.fish) parts.push(D.fish[id].name);
    if (r.anyFish) parts.push(`any ${r.anyFish} fish`);
    for (const id in r.sides) parts.push(D.sides[id].name.toLowerCase());
    return parts.join(' + ');
  }
  FR.ingredientText = ingredientText;

  class PrepScene extends Phaser.Scene {
    constructor() { super('Prep'); }

    create() {
      this.tab = 'menu'; this.mix = []; this.labMsg = '';
      FR.art.build(this);
      this.add.image(480, 300, 'prepbg');
      this.hud = U.hud(this, 'Afternoon');
      this.content = this.add.container(0, 0);
      this.render();
    }

    put(o) { this.content.add(o); return o; }
    label(x, y, str, size, color, extra) { return this.put(U.text(this, x, y, str, size || 14, color, extra)); }
    head(str) { return this.put(U.title(this, 200, 46, str, 26)); }
    card(x, y, w, h, color) { return this.put(U.card(this, x, y, w, h, color === undefined ? 0x1d3557 : color, 0.95)); }
    img(x, y, key, scale) { return this.put(this.add.image(x, y, key).setScale(scale || 1)); }
    btn(x, y, w, h, label, cb, o) { return this.put(U.button(this, x, y, w, h, label, cb, o)); }

    buy(key, price, fn) {
      if (!FR.spend(key, price)) { U.toast(this, 'Not enough money.', '#ff9c9c'); return; }
      FR.sfx('coin');
      fn();
      this.render();
    }

    render() {
      const S = FR.state;
      this.content.removeAll(true);
      this.hud.set('');
      TABS.forEach(([id, name], i) => {
        this.btn(90, 70 + i * 43, 156, 35, name, () => { this.tab = id; this.render(); }, { color: this.tab === id ? 0xe07a2f : 0x9c6b3f, size: 15 });
      });
      this.label(90, 448, 'Tonight you seat\nabout ' + FR.customersTonight() + ' customers', 13, '#ffe9a8', { align: 'center' }).setOrigin(0.5);
      this.btn(90, 540, 156, 56, 'Open for\ndinner ▶', () => this.open(), { color: 0x3f8f4f, size: 16 });
      this['tab_' + this.tab](S);
    }

    open() {
      const S = FR.state;
      if (!S.menu.length) { U.toast(this, "Put at least one dish on tonight's menu first.", '#ff9c9c'); return; }
      if (S.plates < 2) { U.toast(this, 'You need at least 2 plates. Buy some in the Shop.', '#ff9c9c'); return; }
      this.scene.start('Service');
    }

    // --- Menu ---
    tab_menu(S) {
      S.menu = S.menu.filter(id => S.known.includes(id)).slice(0, FR.menuSlots());
      this.head(`Tonight's menu: ${S.menu.length}/${FR.menuSlots()} dishes`);
      const req = S.requests.length ? `   Asked for last night (pays double): ${S.requests.map(q => FR.recipe(q.recipe).name).join(', ')}` : '';
      this.label(200, 82, 'Customers can only order what is on it. Every dish sells for about 3x its ingredients.' + req, 12, '#dfefff', { wordWrap: { width: 730 } });
      const list = S.known.map(FR.recipe), rowH = list.length > 7 ? 42 : 56;
      list.forEach((r, i) => {
        const y = 134 + i * rowH, on = S.menu.includes(r.id), n = FR.canMakeCount(r);
        this.card(565, y, 740, rowH - 6, on ? 0x2c6e49 : 0x1d3557);
        this.img(228, y, 'dish_' + r.id, rowH > 50 ? 0.7 : 0.55);
        this.label(262, y - (rowH > 50 ? 20 : 17), r.name, 16, r.legendary ? '#ffe14d' : '#ffffff', { fontStyle: 'bold' });
        this.label(262, y + 2, `${ingredientText(r)}   ·   ${D.heat[r.heat].name}   ·   ${KIND[r.kind]}`, 11, '#cfe3f2');
        this.label(650, y - 12, '$' + FR.price(r), 19, '#ffe9a8', { fontStyle: 'bold' });
        this.label(705, y - 8, n > 0 ? `can make ${n}` : 'SOLD OUT', 13, n > 0 ? '#ffffff' : '#ff9c9c');
        this.btn(865, y, 120, rowH - 18, on ? 'On menu ✓' : 'Add', () => {
          if (on) S.menu = S.menu.filter(id => id !== r.id);
          else if (S.menu.length >= FR.menuSlots()) { U.toast(this, 'The menu is full. Take something off first.', '#ff9c9c'); return; }
          else S.menu.push(r.id);
          this.render();
        }, { color: on ? 0x3f8f4f : 0x2f6f8f });
      });
    }

    // --- Shop: ingredients, plates, recipes ---
    tab_shop(S) {
      this.head('Shop');
      this.label(200, 84, 'Side ingredients', 15, '#dfefff', { fontStyle: 'bold' });
      Object.keys(D.sides).forEach((id, i) => {
        const sd = D.sides[id], x = 200 + (i % 2) * 380, y = 124 + Math.floor(i / 2) * 44;
        this.img(x + 16, y, 'it_' + id, 0.8);
        this.label(x + 40, y - 9, `${sd.name}  $${sd.price}   (have ${S.sides[id]})`, 14);
        this.btn(x + 270, y, 50, 28, '+1', () => this.buy('ingredients', sd.price, () => { S.sides[id]++; }));
        this.btn(x + 328, y, 50, 28, '+5', () => this.buy('ingredients', sd.price * 5, () => { S.sides[id] += 5; }));
      });
      this.label(200, 212, 'Plates', 15, '#dfefff', { fontStyle: 'bold' });
      this.img(216, 248, 'plate_clean', 0.8);
      this.label(240, 239, `You own ${S.plates} plates. Every dish needs a clean one, and washing sometimes breaks one.`, 13);
      this.btn(880, 248, 110, 28, 'Buy $' + C.platePrice, () => this.buy('plates', C.platePrice, () => { S.plates++; }));

      this.label(200, 292, 'Recipes  (or discover them for free in the Kitchen lab)', 15, '#dfefff', { fontStyle: 'bold' });
      const locked = D.recipes.filter(r => !S.known.includes(r.id) && r.unlock);
      if (!locked.length) this.label(210, 326, 'You know every recipe you can buy.', 14, '#9cffb0');
      locked.forEach((r, i) => {
        const x = 200 + (i % 2) * 380, y = 334 + Math.floor(i / 2) * 44;
        this.img(x + 18, y, 'dish_' + r.id, 0.5);
        this.label(x + 42, y - 16, r.name, 14, '#ffffff', { fontStyle: 'bold' });
        this.label(x + 42, y + 1, `sells for $${FR.price(r)}`, 11, '#cfe3f2');
        this.btn(x + 310, y, 92, 28, 'Buy $' + r.unlock, () => this.buy('invest', r.unlock, () => { FR.unlockRecipe(r.id); }));
      });
      if (!S.known.includes('whiskers_gumbo')) this.label(200, 560, 'One legendary recipe cannot be bought. A giant in these waters guards it.', 12, '#ffe9a8');
    }

    // --- Gear and bait ---
    tab_gear(S) {
      this.head('Gear + bait');
      this.label(200, 82, 'The right tool lands the fish. The wrong one snaps, tears or misses.', 13, '#dfefff');
      Object.keys(D.gear).forEach((id, i) => {
        const g = D.gear[id], y = 128 + i * 48, own = !!S.gear[id];
        this.card(565, y, 740, 42);
        this.img(226, y, 'g_' + id, 0.9);
        this.label(254, y - 18, g.name, 16, '#ffffff', { fontStyle: 'bold' });
        this.label(254, y + 2, g.desc, 12, '#cfe3f2');
        if (own) this.btn(860, y, 130, 30, 'Owned ✓', () => {}, { enabled: false });
        else this.btn(860, y, 130, 30, 'Buy $' + g.price, () => this.buy('invest', g.price, () => { S.gear[id] = true; }), { color: 0x3f8f4f });
      });
      const ty = 128 + 4 * 48;
      this.card(565, ty, 740, 42);
      this.img(226, ty, 'g_trap', 0.9);
      this.label(254, ty - 18, `Crab trap   (you own ${S.traps}/${C.trapMax})`, 16, '#ffffff', { fontStyle: 'bold' });
      this.label(254, ty + 2, `Drop it in the morning, haul it up ${C.trapSeconds} seconds later. The only way to catch crab.`, 12, '#cfe3f2');
      if (S.traps >= C.trapMax) this.btn(860, ty, 130, 30, 'Maxed ✓', () => {}, { enabled: false });
      else this.btn(860, ty, 130, 30, 'Buy $' + C.trapPrice, () => this.buy('invest', C.trapPrice, () => { S.traps++; }), { color: 0x3f8f4f });

      this.label(200, 372, 'Bait  (each fish has a favorite: it bites faster, tires sooner and runs bigger)', 15, '#dfefff', { fontStyle: 'bold' });
      Object.keys(D.baits).forEach((id, i) => {
        const b = D.baits[id], x = 200 + (i % 2) * 380, y = 416 + Math.floor(i / 2) * 46;
        this.img(x + 16, y, 'b_' + id, 0.8);
        this.label(x + 40, y - 9, `${b.name}  $${b.price}   (have ${S.baits[id]})`, 14);
        this.btn(x + 270, y, 50, 28, '+1', () => this.buy('bait', b.price, () => { S.baits[id]++; }));
        this.btn(x + 328, y, 50, 28, '+5', () => this.buy('bait', b.price * 5, () => { S.baits[id] += 5; }));
      });
    }

    // --- Upgrades ---
    tab_upgrades(S) {
      this.head('Boat upgrades');
      D.upgrades.forEach((u, i) => {
        const y = 112 + i * 62, lvl = S.upgrades[u.id], max = u.prices.length;
        this.card(565, y, 740, 54);
        this.label(210, y - 20, `${u.name}   (level ${lvl}/${max})`, 17, '#ffffff', { fontStyle: 'bold' });
        this.label(210, y + 4, u.desc, 13, '#cfe3f2');
        if (lvl >= max) this.btn(855, y, 140, 36, 'Maxed ✓', () => {}, { enabled: false });
        else this.btn(855, y, 140, 36, 'Buy $' + u.prices[lvl].toLocaleString('en-US'), () => this.buy('invest', u.prices[lvl], () => { S.upgrades[u.id]++; }), { color: 0x3f8f4f });
      });
      if (S.upgrades.engine > 0) {
        const there = S.area === 'coral';
        this.btn(565, 480, 420, 50, there ? '⚓ Sail back to Home Waters' : '⚓ Sail to Coral Bay', () => this.sail(), { color: 0xd9822b, size: 18 });
      } else {
        this.label(565, 480, 'Buy the boat engine to sail to Coral Bay: new fish and new customers.', 14, '#bfe3ff').setOrigin(0.5);
      }
    }

    sail() {
      const S = FR.state;
      S.area = S.area === 'coral' ? 'home' : 'coral';
      const first = S.area === 'coral' && !S.won;
      if (first) S.won = true;
      FR.save();
      this.render();
      if (!first) { U.toast(this, 'You sailed to ' + D.areas[S.area].name + '.', '#9cffb0'); return; }
      FR.sfx('good');
      const p = U.panel(this, 600, 300, 'You made it to Coral Bay!', 9300);
      p.add(U.text(this, 0, -10,
        'New fish swim here (the Coral Snapper and the Bubble Puffer),\nand the Octofolk, who have eight arms and order 2 dishes at once.\n\nKeep cooking as long as you like!',
        15, '#ffffff', { align: 'center' }).setOrigin(0.5));
      p.add(U.button(this, 0, 105, 200, 40, 'Keep cooking', () => p.destroy(), { color: 0x3f8f4f, size: 16 }));
    }

    // --- Decor ---
    tab_decor(S) {
      this.head('Decor');
      this.label(200, 82, `Each item (and each mounted trophy) makes customers a little more patient (+${Math.round(C.decorPatienceBonus * 100)}% each).`, 13, '#dfefff');
      D.decor.forEach((d, i) => {
        const y = 136 + i * 54, own = !!S.decor[d.id];
        this.card(565, y, 740, 46);
        this.img(660, y, { lanterns: 'lantern', plants: 'plant', sign: 'plank', tablestyle: 'table_fancy' }[d.id], { lanterns: 0.9, plants: 0.75, sign: 0.5, tablestyle: 0.6 }[d.id]);
        this.label(210, y - 10, d.name, 17, '#ffffff', { fontStyle: 'bold' });
        if (own) this.btn(855, y, 140, 32, 'Owned ✓', () => {}, { enabled: false });
        else this.btn(855, y, 140, 32, 'Buy $' + d.price, () => this.buy('invest', d.price, () => { S.decor[d.id] = true; }), { color: 0x3f8f4f });
      });
      this.label(200, 370, 'Theme', 15, '#dfefff', { fontStyle: 'bold' });
      Object.keys(D.themes).forEach((id, i) => {
        const th = D.themes[id], on = S.theme === id;
        this.btn(300 + i * 220, 420, 200, 44, th.name + (on ? ' ✓' : ''), () => { S.theme = id; this.render(); }, { color: on ? 0xd9822b : 0x2f6f8f, size: 16 });
        this.img(300 + i * 220, 520, 'boat_' + id, 0.5);
      });
    }

    // --- Fish tank: freshness, sizes, selling raw, mounting trophies ---
    tab_tank(S) {
      this.head(`Fish tank  ${S.tank.length}/${FR.tankCap()}`);
      this.label(200, 82, 'Fresh on day 1, OK on day 2, thrown out on day 3. Raw fish sells for only 40% of what it earns cooked.', 13, '#dfefff');
      const groups = {};
      S.tank.forEach(f => { const k = [f.id, FR.freshness(f), f.cut, f.size, f.portions].join('|'); (groups[k] = groups[k] || []).push(f); });
      const keys = Object.keys(groups).sort();
      if (!keys.length) this.label(210, 130, 'The tank is empty. Go fishing tomorrow morning!', 15);
      keys.slice(0, 10).forEach((k, i) => {
        const list = groups[k], f = list[0], y = 126 + i * 44, val = FR.rawValue(f), def = D.fish[f.id];
        const cut = f.cut === 'perfect' ? 'Perfect cut' : f.cut === 'bruised' ? 'Bruised' : 'Normal cut';
        this.card(565, y, 740, 38);
        this.img(232, y, 'fish_' + f.id, f.size === 'trophy' ? 0.5 : f.size === 'big' ? 0.44 : f.size === 'small' ? 0.3 : 0.38);
        this.label(270, y - 17, `${def.name} ×${list.length}`, 15, '#ffffff', { fontStyle: 'bold' });
        this.label(270, y + 1, `${D.sizes[f.size].name}  ·  ${f.portions} portion${f.portions > 1 ? 's' : ''}  ·  ${FR.freshness(f) === 'fresh' ? 'Fresh' : 'OK'}  ·  ${cut}`, 11, FR.freshness(f) === 'fresh' ? '#9cffb0' : '#ffe9a8');
        const sell = fish => { fish.forEach(x => FR.earn('raw', FR.rawValue(x))); S.tank = S.tank.filter(x => !fish.includes(x)); FR.sfx('coin'); this.render(); };
        if (f.size === 'trophy' && !def.boss && !S.trophies.includes(f.id) && S.trophies.length < 5) {
          this.btn(590, y, 150, 28, 'Mount on the wall', () => { S.trophies.push(f.id); S.tank = S.tank.filter(x => x !== f); FR.sfx('good'); U.toast(this, `The trophy ${def.name} now hangs on your deck. Customers love it.`, '#9cffb0'); this.render(); }, { color: 0x7a4e9c, size: 12 });
        }
        this.btn(730, y, 110, 28, `Sell 1 ($${val})`, () => sell([list[0]]), { size: 12 });
        if (list.length > 1) this.btn(858, y, 130, 28, `Sell all ($${val * list.length})`, () => sell(list), { size: 12 });
      });
    }

    // --- Fish journal ---
    tab_journal(S) {
      const ids = D.areas[S.area].journal.concat(S.area === 'home' ? [] : D.areas.home.journal).slice(0, 12);
      const got = ids.filter(id => S.journal[id]).length;
      this.head(`Fish journal  ${got}/${ids.length}`);
      this.label(200, 82, `Each new fish pays a reward. Fill an area's pages for a $${C.journalComplete} bonus.`, 13, '#dfefff');
      ids.forEach((id, i) => {
        const f = D.fish[id], j = S.journal[id], x = 380 + (i % 2) * 372, y = 138 + Math.floor(i / 2) * 76;
        this.card(x, y, 362, 68, j ? 0x1d3557 : 0x18243a);
        const im = this.img(x - 146, y, 'fish_' + id, 0.5);
        if (!j) im.setTintFill(0x0b1424);
        this.label(x - 106, y - 28, j ? f.name : '???', 15, f.boss ? '#ffe14d' : '#ffffff', { fontStyle: 'bold' });
        if (j) {
          const how = f.trap ? 'crab trap' : f.nightOnly ? 'deck rod at night' : D.gear[f.gear[0]].name;
          this.label(x - 106, y - 9, `Caught ${j.n}  ·  best: ${D.sizes[j.best].name}  ·  ${how}${f.bait ? '  ·  ' + D.baits[f.bait].name : ''}`, 11, '#9cffb0');
          this.label(x - 106, y + 8, f.tip, 11, '#cfe3f2', { wordWrap: { width: 280 } });
        } else {
          const sign = { ripples: 'Look for ripples on the water.', glow: 'Look for a soft glow.', bubbles: 'Look for sparking bubbles.', birds: 'Look for circling gulls.', ink: 'Look for a dark patch.', gold: 'Look for a golden shimmer.', shadow: 'A huge shadow under the surface.' }[f.sign];
          this.label(x - 106, y - 6, f.trap ? 'It will not take a hook.' : f.nightOnly ? 'Never seen by day.' : sign, 11, '#8fa3b8', { wordWrap: { width: 280 } });
        }
      });
    }

    // --- Kitchen lab: mix ingredients to discover recipes ---
    tab_lab(S) {
      this.head('Kitchen lab');
      this.label(200, 82, 'Mix ingredients to discover a recipe. A failed mix still uses up the ingredients.', 13, '#dfefff');
      const used = id => this.mix.filter(m => m === id).length;
      const add = id => { if (this.mix.length < 4) { this.mix.push(id); this.labMsg = ''; this.render(); } };
      let i = 0;
      const tile = (id, name, have) => {
        const left = have - used(id), x = 290 + (i % 4) * 180, y = 130 + Math.floor(i / 4) * 42;
        i++;
        this.btn(x, y, 168, 32, `${name} (${left})`, () => add(id), { enabled: left > 0, size: 13 });
      };
      Object.keys(D.fish).forEach(id => { const n = FR.portionsOf(id); if (n) tile('fish:' + id, D.fish[id].name, n); });
      Object.keys(D.sides).forEach(id => { if (S.sides[id]) tile('side:' + id, D.sides[id].name, S.sides[id]); });
      if (!i) this.label(210, 130, 'You have nothing to mix yet.', 15);
      const names = this.mix.map(m => { const [t, id] = m.split(':'); return t === 'fish' ? D.fish[id].name : D.sides[id].name; });
      this.card(565, 400, 740, 56);
      this.label(565, 400, names.length ? names.join('  +  ') : 'Pick up to 4 ingredients above', 16, '#ffffff').setOrigin(0.5);
      this.btn(470, 466, 160, 40, 'Mix!', () => this.doMix(), { color: 0x3f8f4f, size: 16, enabled: this.mix.length > 0 });
      this.btn(660, 466, 160, 40, 'Clear', () => { this.mix = []; this.labMsg = ''; this.render(); });
      if (this.labMsg) this.label(565, 530, this.labMsg, 16, '#ffe9a8', { align: 'center' }).setOrigin(0.5);
    }

    doMix() {
      const S = FR.state, fish = {}, sides = {};
      let fishTotal = 0;
      this.mix.forEach(m => {
        const [t, id] = m.split(':');
        if (t === 'fish') { fish[id] = (fish[id] || 0) + 1; fishTotal++; } else sides[id] = (sides[id] || 0) + 1;
      });
      const same = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => a[k] === b[k]);
      const match = D.recipes.find(r => !r.legendary && same(r.sides, sides) && (r.anyFish ? fishTotal === r.anyFish && !Object.keys(r.fish).length : same(r.fish, fish)));
      if (match && S.known.includes(match.id)) {
        this.labMsg = `That is ${match.name}. You already know it, so nothing was used.`;
        this.mix = [];
        this.render();
        return;
      }
      // use up one portion per fish picked, oldest first
      for (const id in fish) for (let n = 0; n < fish[id]; n++) {
        const f = S.tank.filter(x => x.id === id).sort((a, b) => b.age - a.age)[0];
        f.portions--;
        if (f.portions <= 0) S.tank = S.tank.filter(x => x !== f);
      }
      for (const id in sides) S.sides[id] -= sides[id];
      if (match) { FR.unlockRecipe(match.id); FR.sfx('good'); this.labMsg = `Discovered: ${match.name}! Add it to your menu.`; }
      else { FR.sfx('bad'); this.labMsg = 'A smelly mess. Nothing discovered.'; }
      this.mix = [];
      this.render();
    }
  }

  FR.PrepScene = PrepScene;
})();
