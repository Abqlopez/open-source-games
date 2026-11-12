// Afternoon: set tonight's menu, shop, upgrade, decorate, sell raw fish, and
// experiment in the kitchen lab.
(function () {
  const U = FR.ui, D = FR.DATA, C = D.config;
  const TABS = [['menu', 'Menu'], ['shop', 'Shop'], ['upgrades', 'Upgrades'], ['decor', 'Decor'], ['tank', 'Fish tank'], ['lab', 'Kitchen lab']];
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
      this.tab = 'menu';
      this.mix = [];
      this.labMsg = '';
      this.add.rectangle(480, 300, 960, 600, 0xf2c98a);
      this.add.rectangle(480, 318, 960, 564, 0x21405a, 0.92);
      this.add.rectangle(90, 318, 180, 564, 0x16324a);
      this.hud = U.hud(this, 'Afternoon');
      this.content = this.add.container(0, 0);
      this.render();
    }

    put(o) { this.content.add(o); return o; }
    label(x, y, str, size, color, extra) { return this.put(U.text(this, x, y, str, size || 14, color, extra)); }
    btn(x, y, w, h, label, cb, o) { return this.put(U.button(this, x, y, w, h, label, cb, o)); }

    buy(price, fn) {
      const S = FR.state;
      if (S.money < price) { U.toast(this, 'Not enough money.', '#ff9c9c'); return; }
      S.money -= price;
      FR.sfx('coin');
      fn();
      this.render();
    }

    render() {
      const S = FR.state;
      this.content.removeAll(true);
      this.hud.set('');
      TABS.forEach(([id, name], i) => {
        this.btn(90, 76 + i * 46, 156, 38, name, () => { this.tab = id; this.render(); }, { color: this.tab === id ? 0xd9822b : 0x2f6f8f, size: 15 });
      });
      this.label(90, 440, 'Tonight you seat\nabout ' + FR.customersTonight() + ' customers', 12, '#bfe3ff', { align: 'center' }).setOrigin(0.5);
      this.btn(90, 540, 156, 56, 'Open for\ndinner ▶', () => this.open(), { color: 0x3f8f4f, size: 16 });
      this['tab_' + this.tab](S);
    }

    open() {
      const S = FR.state;
      if (!S.menu.length) { U.toast(this, "Put at least one dish on tonight's menu first.", '#ff9c9c'); return; }
      this.scene.start('Service');
    }

    // --- Menu ---
    tab_menu(S) {
      S.menu = S.menu.filter(id => S.known.includes(id)).slice(0, FR.menuSlots());
      this.label(200, 52, `Tonight's menu: ${S.menu.length}/${FR.menuSlots()} dishes`, 20, '#ffe9a8', { fontStyle: 'bold' });
      this.label(200, 80, "Customers can only order what's on it. A dish sells out when you run out of its ingredients.", 13, '#dfefff');
      if (S.requests.length) {
        const names = S.requests.map(q => FR.recipe(q.recipe).name).join(', ');
        this.label(200, 100, `Asked for last night (they come back and pay double if it's on the menu): ${names}`, 13, '#9cffb0');
      }
      S.known.map(FR.recipe).forEach((r, i) => {
        const y = 150 + i * 60, on = S.menu.includes(r.id), n = FR.canMakeCount(r);
        this.put(this.add.rectangle(565, y, 740, 54, on ? 0x2c5f3a : 0x1a3349).setStrokeStyle(1, 0xffffff, 0.25));
        this.label(210, y - 20, r.name, 17, '#ffffff', { fontStyle: 'bold' });
        this.label(210, y + 3, `${ingredientText(r)}   ·   ${r.steps.map(s => D.steps[s].name).join(', ')}   ·   ${KIND[r.kind]}`, 12, '#cfe3f2');
        this.label(620, y - 10, '$' + r.price, 18, '#ffe9a8', { fontStyle: 'bold' });
        this.label(690, y - 8, n > 0 ? `can make ${n}` : 'SOLD OUT', 13, n > 0 ? '#ffffff' : '#ff9c9c');
        this.btn(865, y, 120, 36, on ? 'On menu ✓' : 'Add', () => {
          if (on) S.menu = S.menu.filter(id => id !== r.id);
          else if (S.menu.length >= FR.menuSlots()) { U.toast(this, 'The menu is full. Take something off first.', '#ff9c9c'); return; }
          else S.menu.push(r.id);
          this.render();
        }, { color: on ? 0x3f8f4f : 0x2f6f8f });
      });
    }

    // --- Shop ---
    tab_shop(S) {
      this.label(200, 52, 'Shop', 20, '#ffe9a8', { fontStyle: 'bold' });
      this.label(200, 84, 'Side ingredients', 15, '#dfefff', { fontStyle: 'bold' });
      Object.keys(D.sides).forEach((id, i) => {
        const sd = D.sides[id], y = 124 + i * 40;
        this.label(210, y - 9, `${sd.name}  —  $${sd.price} each`, 15);
        this.label(480, y - 9, `you have ${S.sides[id]}`, 14, '#cfe3f2');
        this.btn(640, y, 70, 30, '+1', () => this.buy(sd.price, () => { S.sides[id]++; }));
        this.btn(725, y, 70, 30, '+5', () => this.buy(sd.price * 5, () => { S.sides[id] += 5; }));
      });
      this.label(200, 290, 'Bait', 15, '#dfefff', { fontStyle: 'bold' });
      this.label(210, 318, `Bait  —  $${C.baitPrice} each.  Better odds of rare fish for one morning.`, 15);
      this.label(210, 340, `you have ${S.bait}`, 14, '#cfe3f2');
      this.btn(725, 330, 70, 30, 'Buy', () => this.buy(C.baitPrice, () => { S.bait++; }));

      this.label(200, 380, 'Recipes  (or discover them for free in the Kitchen lab)', 15, '#dfefff', { fontStyle: 'bold' });
      const locked = D.recipes.filter(r => !S.known.includes(r.id));
      if (!locked.length) this.label(210, 410, 'You know every recipe.', 14, '#9cffb0');
      locked.forEach((r, i) => {
        const y = 420 + i * 40;
        this.label(210, y - 9, `${r.name}  —  sells for $${r.price}`, 15);
        this.btn(725, y, 110, 30, 'Buy $' + r.unlock, () => this.buy(r.unlock, () => { FR.unlockRecipe(r.id); }));
      });
    }

    // --- Upgrades ---
    tab_upgrades(S) {
      this.label(200, 52, 'Boat upgrades', 20, '#ffe9a8', { fontStyle: 'bold' });
      D.upgrades.forEach((u, i) => {
        const y = 112 + i * 62, lvl = S.upgrades[u.id], max = u.prices.length;
        this.put(this.add.rectangle(565, y, 740, 54, 0x1a3349).setStrokeStyle(1, 0xffffff, 0.25));
        this.label(210, y - 20, `${u.name}   (level ${lvl}/${max})`, 17, '#ffffff', { fontStyle: 'bold' });
        this.label(210, y + 4, u.desc, 13, '#cfe3f2');
        if (lvl >= max) this.btn(855, y, 140, 36, 'Maxed ✓', () => {}, { enabled: false });
        else this.btn(855, y, 140, 36, 'Buy $' + u.prices[lvl].toLocaleString('en-US'), () => this.buy(u.prices[lvl], () => { S.upgrades[u.id]++; }), { color: 0x3f8f4f });
      });
      if (S.upgrades.engine > 0) {
        const there = S.area === 'coral';
        this.btn(565, 510, 420, 50, there ? '⚓ Sail back to Home Waters' : '⚓ Sail to Coral Bay', () => this.sail(), { color: 0xd9822b, size: 18 });
      } else {
        this.label(565, 510, 'Buy the boat engine to sail to Coral Bay: new fish and new customers.', 14, '#bfe3ff').setOrigin(0.5);
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
      const p = U.panel(this, 600, 320, 'You made it to Coral Bay!', 200);
      p.add(U.text(this, 0, -20,
        'The little worn-down boat is now a real floating restaurant.\n\n' +
        'Coral Bay has 2 new fish — the Coral Snapper and the Bubble Puffer —\n' +
        'and the Octofolk, who have eight arms and order 2 dishes at once.\n\n' +
        'That is the end of version 1. Keep playing as long as you like!',
        15, '#ffffff', { align: 'center' }).setOrigin(0.5));
      p.add(U.button(this, 0, 115, 200, 40, 'Keep cooking', () => p.destroy(), { color: 0x3f8f4f, size: 16 }));
    }

    // --- Decor ---
    tab_decor(S) {
      this.label(200, 52, 'Decor', 20, '#ffe9a8', { fontStyle: 'bold' });
      this.label(200, 82, `Each item makes customers a little more patient (+${Math.round(C.decorPatienceBonus * 100)}% each).`, 13, '#dfefff');
      D.decor.forEach((d, i) => {
        const y = 136 + i * 54, own = !!S.decor[d.id];
        this.put(this.add.rectangle(565, y, 740, 46, 0x1a3349).setStrokeStyle(1, 0xffffff, 0.25));
        this.label(210, y - 10, d.name, 17, '#ffffff', { fontStyle: 'bold' });
        if (own) this.btn(855, y, 140, 32, 'Owned ✓', () => {}, { enabled: false });
        else this.btn(855, y, 140, 32, 'Buy $' + d.price, () => this.buy(d.price, () => { S.decor[d.id] = true; }), { color: 0x3f8f4f });
      });
      this.label(200, 370, 'Theme', 15, '#dfefff', { fontStyle: 'bold' });
      Object.keys(D.themes).forEach((id, i) => {
        const th = D.themes[id], on = S.theme === id;
        this.btn(300 + i * 220, 420, 200, 44, th.name + (on ? ' ✓' : ''), () => { S.theme = id; this.render(); }, { color: on ? 0xd9822b : 0x2f6f8f, size: 16 });
        this.put(this.add.rectangle(300 + i * 220, 470, 200, 24, th.deck).setStrokeStyle(3, th.trim));
      });
    }

    // --- Fish tank: see freshness and sell raw fish ---
    tab_tank(S) {
      this.label(200, 52, `Fish tank  ${S.tank.length}/${FR.tankCap()}`, 20, '#ffe9a8', { fontStyle: 'bold' });
      this.label(200, 82, 'Fresh on day 1, OK on day 2, thrown out on day 3. Selling raw pays far less than cooking.', 13, '#dfefff');
      const groups = {};
      S.tank.forEach(f => {
        const k = f.id + '|' + FR.freshness(f) + '|' + f.cut;
        (groups[k] = groups[k] || []).push(f);
      });
      const keys = Object.keys(groups).sort();
      if (!keys.length) this.label(210, 130, 'The tank is empty. Go fishing tomorrow morning!', 15);
      keys.slice(0, 10).forEach((k, i) => {
        const list = groups[k], f = list[0], y = 130 + i * 42, val = FR.rawValue(f);
        const cut = f.cut === 'perfect' ? 'Perfect cut' : f.cut === 'bruised' ? 'Bruised' : 'Normal';
        this.put(this.add.ellipse(222, y, 26, 12, D.fish[f.id].color).setStrokeStyle(1, 0xffffff));
        this.label(246, y - 9, `${D.fish[f.id].name} ×${list.length}`, 15, '#ffffff', { fontStyle: 'bold' });
        this.label(470, y - 8, `${FR.freshness(f) === 'fresh' ? 'Fresh' : 'OK'}  ·  ${cut}`, 13, FR.freshness(f) === 'fresh' ? '#9cffb0' : '#ffe9a8');
        const sell = fish => {
          fish.forEach(x => { S.money += FR.rawValue(x); });
          S.tank = S.tank.filter(x => !fish.includes(x));
          FR.sfx('coin');
          this.render();
        };
        this.btn(720, y, 110, 30, `Sell 1 ($${val})`, () => sell([list[0]]));
        if (list.length > 1) this.btn(850, y, 130, 30, `Sell all ($${val * list.length})`, () => sell(list));
      });
    }

    // --- Kitchen lab: mix ingredients to discover recipes ---
    tab_lab(S) {
      this.label(200, 52, 'Kitchen lab', 20, '#ffe9a8', { fontStyle: 'bold' });
      this.label(200, 82, 'Mix ingredients to discover a recipe. A failed mix still uses up the ingredients.', 13, '#dfefff');
      const used = id => this.mix.filter(m => m === id).length;
      const add = id => { if (this.mix.length < 4) { this.mix.push(id); this.labMsg = ''; this.render(); } };
      let i = 0;
      const tile = (id, name, have) => {
        const left = have - used(id), x = 290 + (i % 4) * 180, y = 136 + Math.floor(i / 4) * 44;
        i++;
        this.btn(x, y, 168, 34, `${name} (${left})`, () => add(id), { enabled: left > 0 });
      };
      Object.keys(D.fish).forEach(id => {
        const n = S.tank.filter(f => f.id === id).length;
        if (n) tile('fish:' + id, D.fish[id].name, n);
      });
      Object.keys(D.sides).forEach(id => { if (S.sides[id]) tile('side:' + id, D.sides[id].name, S.sides[id]); });
      if (!i) this.label(210, 130, 'You have nothing to mix yet.', 15);

      const names = this.mix.map(m => { const [t, id] = m.split(':'); return t === 'fish' ? D.fish[id].name : D.sides[id].name; });
      this.put(this.add.rectangle(565, 380, 740, 60, 0x1a3349).setStrokeStyle(1, 0xffffff, 0.25));
      this.label(565, 380, names.length ? names.join('  +  ') : 'Pick up to 4 ingredients above', 16, '#ffffff').setOrigin(0.5);
      this.btn(470, 450, 160, 40, 'Mix!', () => this.doMix(), { color: 0x3f8f4f, size: 16, enabled: this.mix.length > 0 });
      this.btn(660, 450, 160, 40, 'Clear', () => { this.mix = []; this.labMsg = ''; this.render(); });
      if (this.labMsg) this.label(565, 520, this.labMsg, 16, '#ffe9a8', { align: 'center' }).setOrigin(0.5);
    }

    doMix() {
      const S = FR.state, fish = {}, sides = {};
      let fishTotal = 0;
      this.mix.forEach(m => {
        const [t, id] = m.split(':');
        if (t === 'fish') { fish[id] = (fish[id] || 0) + 1; fishTotal++; } else sides[id] = (sides[id] || 0) + 1;
      });
      const same = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => a[k] === b[k]);
      const match = D.recipes.find(r => same(r.sides, sides) && (r.anyFish ? fishTotal === r.anyFish && !Object.keys(r.fish).length : same(r.fish, fish)))
        // a specific-fish recipe wins over the "any 3 fish" platter
        || null;
      if (match && S.known.includes(match.id)) {
        this.labMsg = `That is ${match.name}. You already know it, so nothing was used.`;
        this.mix = [];
        this.render();
        return;
      }
      for (const id in fish) {
        const mine = S.tank.filter(f => f.id === id).sort((a, b) => b.age - a.age).slice(0, fish[id]);
        S.tank = S.tank.filter(f => !mine.includes(f));
      }
      for (const id in sides) S.sides[id] -= sides[id];
      if (match) {
        FR.unlockRecipe(match.id);
        FR.sfx('good');
        this.labMsg = `Discovered: ${match.name}! Add it to your menu.`;
      } else {
        FR.sfx('bad');
        this.labMsg = 'A smelly mess. Nothing discovered.';
      }
      this.mix = [];
      this.render();
    }
  }

  FR.PrepScene = PrepScene;
})();
