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

  FR.newState = function () {
    return {
      v: 1, day: 1, money: C.startMoney, area: 'home', won: false,
      tank: [], nextUid: 1,
      sides: Object.assign({}, C.startSides),
      bait: 0, baitActive: false, spot: false, useSpot: false,
      known: C.startRecipes.slice(), menu: C.startRecipes.slice(),
      upgrades: { rod: 0, tank: 0, station: 0, board: 0, tables: 0, engine: 0 },
      decor: {}, theme: 'beach',
      reviews: C.startReviews.slice(), requests: [],
      friends: { gus: 0, marina: 0 }
    };
  };

  FR.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(FR.state)); } catch (e) { /* storage unavailable */ }
  };
  FR.load = function () {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) return s;
    } catch (e) { /* no save */ }
    return null;
  };

  // --- Upgrade lookups ---
  FR.tankCap = () => C.tankSize[FR.state.upgrades.tank];
  FR.menuSlots = () => C.menuSlots[FR.state.upgrades.board];
  FR.tableCount = () => C.tables[FR.state.upgrades.tables];
  FR.stationCount = () => C.stations[FR.state.upgrades.station];
  FR.decorCount = () => D.decor.filter(d => FR.state.decor[d.id]).length;

  // --- Fish ---
  FR.addFish = function (id, cut) {
    const S = FR.state;
    S.tank.push({ uid: S.nextUid++, id, age: 0, cut: cut || 'normal' });
  };
  // Fresh on day 1, OK on day 2, spoiled on day 3. The tank upgrade adds a fresh day.
  FR.freshness = function (f) {
    const a = f.age - (FR.state.upgrades.tank > 0 ? 1 : 0);
    return a <= 0 ? 'fresh' : a === 1 ? 'ok' : 'spoiled';
  };
  FR.rawValue = function (f) {
    const v = D.fish[f.id].sell;
    return FR.freshness(f) === 'ok' ? Math.max(1, Math.round(v * C.rawOkMultiplier)) : v;
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

  FR.canMakeCount = function (r) {
    const S = FR.state;
    let n = 99;
    for (const id in r.fish) n = Math.min(n, Math.floor(S.tank.filter(f => f.id === id).length / r.fish[id]));
    if (r.anyFish) n = Math.min(n, Math.floor(S.tank.length / r.anyFish));
    for (const id in r.sides) n = Math.min(n, Math.floor((S.sides[id] || 0) / r.sides[id]));
    return n;
  };

  function takeFish(list, count) {
    const S = FR.state, taken = list.slice(0, count);
    S.tank = S.tank.filter(f => !taken.includes(f));
    return taken;
  }

  // Pull the ingredients for one serving out of stock. Oldest fish go first;
  // the platter uses your cheapest fish so it never eats a Dragon Koi by accident.
  FR.reserve = function (r) {
    if (FR.canMakeCount(r) < 1) return null;
    const S = FR.state, res = { fish: [], sides: {} };
    for (const id in r.fish) {
      const mine = S.tank.filter(f => f.id === id).sort((a, b) => b.age - a.age);
      res.fish.push(...takeFish(mine, r.fish[id]));
    }
    if (r.anyFish) {
      const all = S.tank.slice().sort((a, b) => D.fish[a.id].sell - D.fish[b.id].sell || b.age - a.age);
      res.fish.push(...takeFish(all, r.anyFish));
    }
    for (const id in r.sides) { S.sides[id] -= r.sides[id]; res.sides[id] = r.sides[id]; }
    return res;
  };
  FR.refund = function (res) {
    if (!res) return;
    const S = FR.state;
    S.tank.push(...res.fish);
    for (const id in res.sides) S.sides[id] += res.sides[id];
  };

  // Dish quality = cooking minigame score + how fresh / cleanly caught the fish was.
  FR.qualityOf = function (score, res) {
    let mod = 0;
    if (res && res.fish.length) {
      for (const f of res.fish) {
        if (FR.freshness(f) === 'ok') mod += C.fishMods.ok;
        if (f.cut === 'perfect') mod += C.fishMods.perfectCut;
        if (f.cut === 'bruised') mod += C.fishMods.bruised;
      }
      mod /= res.fish.length;
    }
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
    S.baitActive = false;
    S.day++;
    FR.save();
    return Object.assign({ day, spoiled, rating: FR.rating() }, res);
  };
})();
