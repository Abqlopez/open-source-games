// Floating Restaurant – all tunable data lives in this one file.
// Change numbers here after playtesting; nothing else needs to be touched.
window.FR = window.FR || {};

(function () {
  // Dev helpers: add ?speed=5 to run clocks faster, ?auto=1 to auto-win minigames.
  const q = new URLSearchParams(window.location.search);
  FR.dev = { speed: Number(q.get('speed')) || 1, auto: q.get('auto') === '1' };

  FR.DATA = {
    config: {
      startMoney: 100,
      startSides: { tortilla: 2, rice: 2, veggies: 0, kelp: 2 },
      startRecipes: ['grilled_sardine', 'glowgill_tacos', 'kelp_wrap'],
      startReviews: [2, 2, 2],

      // Day loop (seconds of real time)
      morningSeconds: 180,
      nightSeconds: 240,

      // Fishing
      biteWait: [2, 6],
      biteWindow: 1,
      zoneEdges: { near: 0.4, mid: 0.7 }, // cast distance (0-1) where each zone ends
      rodReach: [0.8, 0.9, 1], // max cast distance per rod level
      rodEase: 0.15, // each rod level makes reeling this much more forgiving
      baseLineStrength: 2, // mistakes the line survives (+1 per rod level)
      baitBoost: 2.5, // rare/legendary weight multiplier with bait
      spotBoost: 1.5, // rare/legendary weight multiplier at the secret spot

      // Upgrade effects per level
      tankSize: [10, 15, 25],
      menuSlots: [4, 6],
      tables: [2, 4, 6],
      stations: [1, 2, 3],

      // Cooking
      cookSeconds: 4, // time a dish sits on the station after the minigames
      quality: {
        perfect: { min: 0.8, pay: 1.5, label: 'Perfect', review: 5 },
        good: { min: 0.42, pay: 1, label: 'Good', review: 4 },
        burnt: { min: -9, pay: 0.5, label: 'Burnt', review: 2 }
      },
      fishMods: { ok: -0.12, perfectCut: 0.12, bruised: -0.12 },

      // Customers
      patience: { high: 75, medium: 55, low: 38 }, // seconds
      queuePatienceRate: 0.5,
      customersByStars: [4, 12], // at 1 star, at 5 stars
      reviewWindow: 15, // star rating = average of the last N reviews
      specialRequestChance: 0.2,
      maxRequestsPerNight: 3,
      liveCatchChance: 0.12,
      liveCatchPay: 2, // x raw fish value
      tipRate: 0.15,
      foodiePerfectTip: 0.5,
      pirateMapChance: 0.2,
      seaKingBaitChance: 0.3,
      decorPatienceBonus: 0.05,
      regularEvery: 3,
      friendshipGoal: 3,

      // Economy
      baitPrice: 50,
      rawOkMultiplier: 0.5 // raw sale value of a fish that is only "OK"
    },

    fish: {
      sardine: {
        name: 'Sardine', type: 'real', rarity: 'common', sell: 5, color: 0xb8c7d6,
        reel: { type: 'school', speed: 1, hint: 'Hold the mouse and swipe through the school before it scatters!' }
      },
      glowgill: {
        name: 'Glowgill', type: 'fantasy', rarity: 'common', sell: 8, color: 0x7dffb0, nightBoost: 2,
        reel: { type: 'blink', speed: 1, hint: 'Hold SPACE to reel, but only while it glows.' }
      },
      thunder_eel: {
        name: 'Thunder Eel', type: 'fantasy', rarity: 'uncommon', sell: 15, color: 0xf2d53c,
        reel: { type: 'zap', speed: 1, hint: 'Hold SPACE to reel. Let go during each ZAP or the line snaps!' }
      },
      bluefin_tuna: {
        name: 'Bluefin Tuna', type: 'real', rarity: 'rare', sell: 30, color: 0x3c6fd9,
        reel: { type: 'pump', speed: 1, hint: 'Tap SPACE to pump the rod, but only while it pauses.' }
      },
      dragon_koi: {
        name: 'Sunscale Dragon Koi', type: 'fantasy', rarity: 'legendary', sell: 100, color: 0xff8a2b,
        reel: { type: 'simon', speed: 1, rounds: [3, 4, 5], hint: 'Watch the sparks, then click them back in the same order.' }
      },
      // Coral Bay fish
      coral_snapper: {
        name: 'Coral Snapper', type: 'real', rarity: 'uncommon', sell: 20, color: 0xff6f91,
        reel: { type: 'pump', speed: 0.8, hint: 'Tap SPACE to pump the rod, but only while it pauses.' }
      },
      bubble_puffer: {
        name: 'Bubble Puffer', type: 'fantasy', rarity: 'rare', sell: 40, color: 0xc59bff,
        reel: { type: 'blink', speed: 1.5, hint: 'Hold SPACE to reel, but only while it glows.' }
      }
    },

    // Chance weights per cast zone. Far is ~5% Dragon Koi.
    zones: {
      near: { sardine: 55, glowgill: 45 },
      mid: { thunder_eel: 55, sardine: 20, glowgill: 25 },
      far: { bluefin_tuna: 50, thunder_eel: 45, dragon_koi: 5 }
    },

    areas: {
      home: {
        name: 'Home Waters', sky: 0x8fd3ff, water: 0x2a7fb8,
        species: { human: 50, mermaid: 25, seaking: 25 }
      },
      coral: {
        name: 'Coral Bay', sky: 0xffc9d9, water: 0x1fa3a3,
        zones: { mid: { coral_snapper: 40 }, far: { bubble_puffer: 30 } },
        species: { human: 35, mermaid: 20, seaking: 20, octofolk: 25 }
      }
    },

    sides: {
      tortilla: { name: 'Tortilla', price: 2 },
      rice: { name: 'Rice', price: 3 },
      kelp: { name: 'Sea kelp', price: 3 },
      veggies: { name: 'Veggies', price: 4 }
    },

    // kind: real | fantasy | kelp | mixed. Species use it to decide what they eat.
    recipes: [
      { id: 'grilled_sardine', name: 'Grilled Sardine', fish: { sardine: 1 }, sides: {}, steps: ['grill'], price: 12, kind: 'real' },
      { id: 'glowgill_tacos', name: 'Glowgill Tacos', fish: { glowgill: 1 }, sides: { tortilla: 1 }, steps: ['chop', 'fry', 'plate'], price: 18, kind: 'fantasy' },
      { id: 'kelp_wrap', name: 'Kelp Wrap', fish: {}, sides: { kelp: 1, rice: 1 }, steps: ['chop', 'roll'], price: 20, kind: 'kelp' },
      { id: 'thunder_eel_soup', name: 'Thunder Eel Soup', fish: { thunder_eel: 1 }, sides: { veggies: 1 }, steps: ['chop', 'boil'], price: 28, kind: 'fantasy', unlock: 90 },
      { id: 'tuna_sushi', name: 'Tuna Sushi', fish: { bluefin_tuna: 1 }, sides: { rice: 1 }, steps: ['slice', 'roll', 'plate'], price: 55, kind: 'real', unlock: 160 },
      { id: 'seafood_platter', name: 'Seafood Platter', fish: {}, anyFish: 3, sides: {}, steps: ['grill', 'fry', 'plate'], price: 45, kind: 'mixed', unlock: 120 },
      { id: 'dragon_koi_feast', name: 'Dragon Koi Feast', fish: { dragon_koi: 1 }, sides: { rice: 1, veggies: 1 }, steps: ['slice', 'grill', 'boil', 'plate'], price: 200, kind: 'fantasy', unlock: 300 }
    ],

    steps: {
      chop: { name: 'Chop', hint: 'Press SPACE as the knife crosses each marker.' },
      fry: { name: 'Fry', hint: 'Press SPACE to stop the needle in the green zone.' },
      grill: { name: 'Grill', hint: 'Press SPACE to stop the needle in the green zone.' },
      boil: { name: 'Boil', hint: 'Wait... press SPACE when the pot reaches the green zone.' },
      slice: { name: 'Slice', hint: 'Hold the mouse and trace the line.' },
      roll: { name: 'Roll', hint: 'Hold the mouse and trace the curve.' },
      plate: { name: 'Plate', hint: 'Drag the food onto the middle of the plate.' }
    },

    roles: {
      sailor: { id: 'sailor', name: 'Sailor', letter: 'S', color: 0x3d7edb, weight: 45, patience: 'high', pay: 1, blurb: 'cheap + fast' },
      foodie: { id: 'foodie', name: 'Foodie', letter: 'F', color: 0xd9548f, weight: 30, patience: 'medium', pay: 1.3, minMenu: 3, blurb: 'wants quality' },
      pirate: { id: 'pirate', name: 'Pirate', letter: 'P', color: 0x333333, weight: 25, patience: 'low', pay: 2, blurb: 'priciest dish' }
    },

    species: {
      human: { id: 'human', name: 'Human', letter: 'H', color: 0xe8b98a, eats: ['real', 'fantasy', 'kelp', 'mixed'], fantasyNerves: 1.4, blurb: 'nervous about fantasy fish' },
      mermaid: { id: 'mermaid', name: 'Mermaid', letter: 'M', color: 0x4fd1c5, eats: ['kelp'], blurb: 'kelp dishes only' },
      seaking: { id: 'seaking', name: 'Sea King', letter: 'K', color: 0xe0b23a, eats: ['fantasy'], pay: 1.5, blurb: 'fantasy fish only' },
      octofolk: { id: 'octofolk', name: 'Octofolk', letter: 'O', color: 0xb26bd6, eats: ['real', 'fantasy', 'kelp', 'mixed'], orders: 2, blurb: 'orders 2 dishes' }
    },

    regulars: [
      {
        id: 'gus', name: 'Old Gus', role: 'sailor', species: 'human', dayMod: 2,
        favorite: 'grilled_sardine', reward: 'thunder_eel_soup',
        lines: ["Evenin', cap'n. The usual, if you've got it.", "Calm sea tonight. Good night for a sardine."]
      },
      {
        id: 'marina', name: 'Marina', role: 'foodie', species: 'mermaid', dayMod: 0,
        favorite: 'kelp_wrap', reward: 'seafood_platter',
        lines: ['Your deck looks lovely tonight.', 'Kelp, please. And make it pretty.']
      }
    ],

    upgrades: [
      { id: 'rod', name: 'Fishing rod', prices: [150, 400], desc: 'Stronger line, slower fish, farther cast' },
      { id: 'tank', name: 'Fish tank', prices: [200, 500], desc: 'Holds 15, then 25. Fish stay fresh 1 day longer' },
      { id: 'station', name: 'Kitchen station', prices: [250, 600], desc: 'Cook 2, then 3 dishes at once' },
      { id: 'board', name: 'Menu board', prices: [300], desc: '6 menu slots instead of 4' },
      { id: 'tables', name: 'Tables', prices: [100, 250], desc: '4, then 6 tables' },
      { id: 'engine', name: 'Boat engine', prices: [1000], desc: 'Unlocks sailing to Coral Bay' }
    ],

    decor: [
      { id: 'lanterns', name: 'Lanterns', price: 40 },
      { id: 'plants', name: 'Plants', price: 30 },
      { id: 'sign', name: 'Sign', price: 60 },
      { id: 'tablestyle', name: 'Table style', price: 50 }
    ],

    themes: {
      beach: { name: 'Beach Shack', deck: 0xd9b77a, hull: 0xf0dfb4, trim: 0x3bb6b0, table: 0xfff3d6 },
      pirate: { name: 'Pirate Ship', deck: 0x7a4e2d, hull: 0x4a2e1a, trim: 0xb3262b, table: 0xc9a56b }
    }
  };
})();
