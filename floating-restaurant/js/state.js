// Game state, saving, and the rules that several screens share.
(function () {
  const D = FR.DATA, C = D.config;
  const KEY = 'floating-restaurant-save-v1';

  FR.rand = (a, b) => a + Math.random() * (b - a);
  FR.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  FR.weighted = function (w) {
    let total = 0;
    for (const k in w) total += w[k];
    let r = Math.random() * total;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return Object.keys(w)[0];
  };

  const newLedger = () => ({ sales: 0, tips: 0, raw: 0, rewards: 0, ingredients: 0, bait: 0, plates: 0, invest: 0 });

  FR.newState = function () {
    return {
      v: 2, day: 1, money: C.startMoney, area: 'home', won: false,
      tank: [], nextUid: 1,
      sides: Object.assign({}, C.startSides),
      baits: Object.assign({}, C.startBaits), bait: null,
      gear: { light: true }, useGear: 'light', traps: 0,
      plates: C.startPlates,
      journal: {}, journalDone: {}, trophies: [], bossBeaten: false,
      spot: false,
      known: C.startRecipes.slice(), menu: C.startRecipes.slice(),
      upgrades: { tank: 0, station: 0, board: 0, tables: 0, engine: 0 },
      decor: {}, theme: 'beach',
      reviews: C.startReviews.slice(), requests: [],
      friends: { gus: 0, marina: 0 },
      ledger: newLedger()
    };
  };

  // Bring a version 1 save forward so nobody loses their boat.
  function migrate(s) {
    if (s.v === 2) return s;
    const n = FR.newState();
    const rod = (s.upgrades && s.upgrades.rod) || 0;
    Object.assign(n, {
      day: s.day, money: s.money, area: s.area, won: s.won, nextUid: s.nextUid || 1,
      sides: Object.assign(n.sides, s.sides), spot: !!s.spot,
      decor: s.decor || {}, theme: s.theme || 'beach', reviews: s.reviews || n.reviews,
      friends: s.friends || n.friends
    });
    n.tank = (s.tank || []).map(f => Object.assign({ size: 'normal', portions: 1 }, f));
    n.known = (s.known || []).filter(id => D.recipes.some(r => r.id === id));
    n.menu = (s.menu || []).filter(id => n.known.includes(id));
    ['tank', 'station', 'board', 'tables', 'engine'].forEach(k => { n.upgrades[k] = (s.upgrades && s.upgrades[k]) || 0; });
    if (rod > 0) n.gear.heavy = true;
    n.baits.gold += s.bait || 0;
    return n;
  }

  FR.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(FR.state)); } catch (e) { /* storage unavailable */ }
  };
  FR.load = function () {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && (s.v === 1 || s.v === 2)) return migrate(s);
    } catch (e) { /* no save */ }
    return null;
  };

  // --- Money: everything goes through the ledger so the night's earnings screen adds up ---
  FR.earn = function (key, amount) { FR.state.money += amount; FR.state.ledger[key] += amount; };
  FR.spend = function (key, amount) {
    const S = FR.state;
    if (S.money < amount) return false;
    S.money -= amount; S.ledger[key] += amount;
    return true;
  };

  // --- Upgrade lookups ---
  FR.tankCap = () => C.tankSize[FR.state.upgrades.tank];
  FR.menuSlots = () => C.menuSlots[FR.state.upgrades.board];
  FR.tableCount = () => C.tables[FR.state.upgrades.tables];
  FR.burners = () => C.stations[FR.state.upgrades.station];
  FR.boardCount = () => (FR.state.upgrades.station > 0 ? 2 : 1);
  FR.decorCount = () => D.decor.filter(d => FR.state.decor[d.id]).length + FR.state.trophies.length;

  // --- Fish ---
  FR.rollSize = function (lucky) {
    const w = {};
    for (const id in D.sizes) w[id] = D.sizes[id].weight * (lucky && D.sizes[id].rank >= 2 ? 2 : 1);
    return FR.weighted(w);
  };
  FR.addFish = function (id, cut, size) {
    const S = FR.state, def = D.fish[id];
    size = size || 'normal';
    const f = { uid: S.nextUid++, id, age: 0, cut: cut || 'normal', size, portions: def.portions || D.sizes[size].portions };
    S.tank.push(f);
    return f;
  };
  // Fresh on day 1, OK on day 2, spoiled on day 3. The tank upgrade adds a fresh day.
  FR.freshness = function (f) {
    const a = f.age - (FR.state.upgrades.tank > 0 ? 1 : 0);
    return a <= 0 ? 'fresh' : a === 1 ? 'ok' : 'spoiled';
  };
  FR.rawValue = function (f) {
    const v = C.rawShare * C.priceMultiplier * D.fish[f.id].value * D.sizes[f.size || 'normal'].value * f.portions;
    return Math.max(1, Math.round(v * (FR.freshness(f) === 'ok' ? C.rawOkMultiplier : 1)));
  };
  FR.portionsOf = id => FR.state.tank.filter(f => f.id === id).reduce((n, f) => n + f.portions, 0);
  FR.portionsAll = () => FR.state.tank.reduce((n, f) => n + f.portions, 0);

  // The fish journal. Returns what (if anything) the catch unlocked.
  FR.logCatch = function (id, size) {
    const S = FR.state, def = D.fish[id];
    const j = S.journal[id] || (S.journal[id] = { n: 0, best: size });
    const out = { first: j.n === 0, reward: 0, complete: null };
    j.n++;
    if (D.sizes[size].rank > D.sizes[j.best].rank) j.best = size;
    if (out.first) { out.reward = Math.round(def.value * C.journalFirstCatch); FR.earn('rewards', out.reward); }
    for (const a in D.areas) {
      if (!S.journalDone[a] && D.areas[a].journal.every(f => S.journal[f])) {
        S.journalDone[a] = true; out.complete = D.areas[a].name; FR.earn('rewards', C.journalComplete);
      }
    }
    return out;
  };

  // --- Reputation ---
  FR.rating = function () {
    const r = FR.state.reviews;
    if (!r.length) return 1;
    const avg = r.reduce((a, b) => a + b, 0) / r.length;
    return Math.max(1, Math.min(5, Math.round(avg * 10) / 10));
  };
  FR.customersTonight = function () {
    const [lo, hi] = C.customersByStars;
    return Math.round(lo + (FR.rating() - 1) / 4 * (hi - lo));
  };

  // --- Recipes and ingredients ---
  FR.recipe = id => D.recipes.find(r => r.id === id);
  FR.edible = (species, recipe) => species.eats.includes(recipe.kind);
  FR.recipeCost = function (r) {
    let c = 0;
    for (const id in r.fish) c += D.fish[id].value * r.fish[id];
    for (const id in r.sides) c += D.sides[id].price * r.sides[id];
    return c;
  };
  FR.price = r => (r.price !== undefined ? r.price : Math.round(C.priceMultiplier * FR.recipeCost(r)));

  FR.canMakeCount = function (r) {
    const S = FR.state;
    let n = 99;
    for (const id in r.fish) n = Math.min(n, Math.floor(FR.portionsOf(id) / r.fish[id]));
    if (r.anyFish) n = Math.min(n, Math.floor(FR.portionsAll() / r.anyFish));
    for (const id in r.sides) n = Math.min(n, Math.floor((S.sides[id] || 0) / r.sides[id]));
    return n;
  };

  // Take one portion off a fish. Returns a light copy that remembers where it came from.
  function takePortion(f) {
    const S = FR.state;
    f.portions--;
    if (f.portions <= 0) S.tank = S.tank.filter(x => x !== f);
    return { uid: f.uid, id: f.id, age: f.age, cut: f.cut, size: f.size };
  }

  // Pull the ingredients for one serving out of stock. Oldest fish go first;
  // the platter uses your cheapest fish so it never eats a Dragon Koi by accident.
  FR.reserve = function (r) {
    if (FR.canMakeCount(r) < 1) return null;
    const S = FR.state, res = { fish: [], sides: {} };
    for (const id in r.fish) {
      for (let i = 0; i < r.fish[id]; i++) {
        const f = S.tank.filter(x => x.id === id).sort((a, b) => b.age - a.age)[0];
        res.fish.push(takePortion(f));
      }
    }
    for (let i = 0; i < (r.anyFish || 0); i++) {
      const f = S.tank.slice().sort((a, b) => D.fish[a.id].value - D.fish[b.id].value || b.age - a.age)[0];
      res.fish.push(takePortion(f));
    }
    for (const id in r.sides) { S.sides[id] -= r.sides[id]; res.sides[id] = r.sides[id]; }
    return res;
  };
  FR.refundFish = function (p) {
    const S = FR.state, f = S.tank.find(x => x.uid === p.uid);
    if (f) f.portions++; else S.tank.push(Object.assign({ portions: 1 }, p));
  };
  FR.refund = function (res) {
    if (!res) return;
    res.fish.forEach(FR.refundFish);
    for (const id in res.sides) FR.state.sides[id] += res.sides[id];
  };

  // Dish quality = how well it was cooked + how fresh / cleanly caught the fish was.
  FR.qualityOf = function (score, fish) {
    let mod = 0;
    if (fish && fish.length) {
      for (const f of fish) {
        if (FR.freshness(f) === 'ok') mod += C.fishMods.ok;
        if (f.cut === 'perfect') mod += C.fishMods.perfectCut;
        if (f.cut === 'bruised') mod += C.fishMods.bruised;
      }
      mod /= fish.length;
    }
    if (score <= 0) return 'burnt';
    const q = score + mod;
    return q >= C.quality.perfect.min ? 'perfect' : q >= C.quality.good.min ? 'good' : 'burnt';
  };

  FR.unlockRecipe = function (id) {
    if (FR.state.known.includes(id)) return false;
    FR.state.known.push(id);
    return true;
  };

  // --- End of day: reviews, spoilage, next day, auto-save ---
  FR.endDay = function (res) {
    const S = FR.state, day = S.day;
    S.reviews.push(...res.reviews);
    S.reviews = S.reviews.slice(-C.reviewWindow);
    S.requests = res.requests;
    const spoiled = [];
    S.tank.forEach(f => f.age++);
    S.tank = S.tank.filter(f => {
      if (FR.freshness(f) === 'spoiled') { spoiled.push(D.fish[f.id].name); return false; }
      return true;
    });
    const ledger = S.ledger;
    S.ledger = newLedger();
    S.day++;
    FR.save();
    return Object.assign({ day, spoiled, rating: FR.rating(), ledger }, res);
  };
})();
