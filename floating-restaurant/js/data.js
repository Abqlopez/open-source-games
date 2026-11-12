// Floating Restaurant v2 – all tunable data lives in this one file.
// Change numbers here after playtesting; nothing else needs to be touched.
window.FR = window.FR || {};

(function () {
  // Dev helpers: add ?speed=5 to run clocks faster, ?auto=1 to auto-win fish fights.
  const q = new URLSearchParams(window.location.search);
  FR.dev = { speed: Number(q.get('speed')) || 1, auto: q.get('auto') === '1' };

  FR.DATA = {
    config: {
      startMoney: 100,
      startSides: { tortilla: 3, rice: 3, veggies: 0, kelp: 3 },
      startBaits: { worms: 6, shrimp: 0, glow: 2, gold: 0 },
      startRecipes: ['grilled_sardine', 'glowgill_tacos', 'kelp_wrap'],
      startReviews: [2, 2, 2],
      startPlates: 5,

      // Day loop (seconds of real time)
      morningSeconds: 90,
      nightSeconds: 180,
      lastCallSeconds: 25, // extra time for seated customers after closing

      // --- Money rules (v2): every price is derived from these ---
      priceMultiplier: 3,   // dish price = 3x the cost of its ingredients
      rawShare: 0.4,        // raw fish sells for 40% of what it earns as a dish
      rawOkMultiplier: 0.5, // raw value of a fish that is only "OK"
      platePrice: 12,
      plateBreakChance: 0.06,
      journalFirstCatch: 3, // reward = this x fish value
      journalComplete: 150,

      // --- Fishing ---
      boatSpeed: 190,
      spotCount: 5,
      spotLife: [14, 24],   // seconds before a school moves on
      spotRadius: 62,
      biteWindow: 1,
      biteWait: { match: [0.5, 0.9], other: [1.6, 3], none: [2.2, 4] },
      baitStamina: 0.7,     // a fish hooked on its favorite bait starts this tired
      trapPrice: 40, trapMax: 3, trapSeconds: 25,
      bossFromDay: 2,
      fight: {
        reel: 0.26,         // distance reeled per second on a tired fish (divided by fish stamina)
        runReel: 0.025,     // distance reeled per second while it runs
        runPull: 0.04,      // distance the fish takes back while it runs and you rest
        tensionReel: 0.22,  // tension per second, reeling a tired fish
        tensionRun: 0.75,   // tension per second, reeling a running fish (x fish power)
        tensionDrop: 0.65,  // tension lost per second while resting
        tireReel: 0.22,     // stamina the fish loses per second when you reel against a run
        tireRest: 0.09,     // stamina it loses per second running on a slack line
        heavyRod: 0.75,     // heavy rod and harpoon lines take this much of the tension
        escapeAt: 1.4,
        specialEvery: [4, 7]
      },

      // --- Restaurant ---
      playerSpeed: 215,
      carryMax: 2,
      reach: 34,            // how close you must stand to use something
      orderDelay: 1.5,      // seconds before a seated customer is ready to order
      chopSeconds: 1.3,
      washSeconds: 1.0,
      cookSeconds: 6,
      perfectWindow: 3.5,   // seconds after "done" that a dish is still Perfect
      goodWindow: 5,        // then Good for this long, then it burns
      noHeatScore: 0.75,    // uncooked dishes are only Perfect with a cleanly caught fish
      eatSeconds: 6,
      payGrace: 12,         // collect within this or lose the tip and a star
      comboStep: 0.1, comboMax: 5, // each combo step adds 10% to tips, up to +50%
      quality: {
        perfect: { min: 0.8, pay: 1.3, label: 'Perfect', review: 5 },
        good: { min: 0.42, pay: 1, label: 'Good', review: 4 },
        burnt: { min: -9, pay: 0.5, label: 'Burnt', review: 2 }
      },
      fishMods: { ok: -0.12, perfectCut: 0.12, bruised: -0.12 },
      rainChance: 0.2,

      // Upgrade effects per level
      tankSize: [10, 15, 25],
      menuSlots: [4, 6],
      tables: [2, 4, 6],
      stations: [1, 2, 3], // slots on each of grill / fryer / pot; a second cutting board comes at level 1

      // Customers
      patience: { high: 85, medium: 66, low: 50 }, // seconds
      queuePatienceRate: 0.5,
      customersByStars: [4, 10], // at 1 star, at 5 stars
      reviewWindow: 15,
      specialRequestChance: 0.2,
      maxRequestsPerNight: 3,
      liveCatchChance: 0.12,
      liveCatchPay: 2,
      tipRate: 0.15,
      foodiePerfectTip: 0.5,
      pirateMapChance: 0.2,
      seaKingBaitChance: 0.3,
      decorPatienceBonus: 0.05,
      regularEvery: 3,
      friendshipGoal: 3
    },

    // Catch sizes. Bigger fish feed more customers (portions).
    sizes: {
      small: { name: 'Small', weight: 25, portions: 1, value: 0.7, rank: 0 },
      normal: { name: 'Normal', weight: 50, portions: 1, value: 1, rank: 1 },
      big: { name: 'Big', weight: 20, portions: 2, value: 1, rank: 2 },
      trophy: { name: 'Trophy', weight: 5, portions: 3, value: 1, rank: 3 }
    },

    gear: {
      light: { name: 'Light rod', price: 0, desc: 'For small fish' },
      net: { name: 'Net', price: 60, desc: 'Scoops a whole school at once' },
      heavy: { name: 'Heavy rod', price: 180, desc: 'For big fish. Bruises small ones' },
      harpoon: { name: 'Harpoon', price: 350, desc: 'The only thing that stops a giant' }
    },

    baits: {
      worms: { name: 'Worms', price: 2 },
      shrimp: { name: 'Shrimp', price: 4 },
      glow: { name: 'Glow paste', price: 6 },
      gold: { name: 'Gold flakes', price: 25 }
    },

    // value = what one portion is worth as an ingredient (drives dish prices).
    // sign = what you see on the water. gear = what can land it (first is best).
    // stamina = how long the fight is. power = how hard it runs. special = its trick.
    fish: {
      sardine: { name: 'Sardine', type: 'real', rarity: 'common', value: 4, color: 0xb8c7d6, sign: 'ripples', gear: ['net', 'light'], bait: 'worms', stamina: 0.5, power: 0.3, special: 'none', tip: 'Swims in schools. A net scoops several.' },
      glowgill: { name: 'Glowgill', type: 'fantasy', rarity: 'common', value: 6, color: 0x7dffb0, sign: 'glow', gear: ['light'], bait: 'glow', stamina: 0.75, power: 0.45, special: 'blink', nightBoost: 2, tip: 'Blinks out of sight. Stop reeling while it is dark.' },
      squid: { name: 'Squid', type: 'real', rarity: 'common', value: 8, color: 0xe58fb0, sign: 'ink', gear: ['light'], bait: 'worms', stamina: 0.9, power: 0.5, special: 'ink', tip: 'Inks your screen. Feel the line.' },
      thunder_eel: { name: 'Thunder Eel', type: 'fantasy', rarity: 'uncommon', value: 10, color: 0xf2d53c, sign: 'bubbles', gear: ['light', 'heavy'], bait: 'shrimp', stamina: 1, power: 0.6, special: 'zap', tip: 'Zaps the line. Let go during each zap.' },
      crab: { name: 'Crab', type: 'real', rarity: 'uncommon', value: 9, color: 0xe8553a, trap: true, tip: 'Only walks into traps. Set one and come back.' },
      ghost_shrimp: { name: 'Ghost Shrimp', type: 'fantasy', rarity: 'uncommon', value: 12, color: 0xcfe8ff, nightOnly: true, gear: ['light'], bait: 'glow', stamina: 0.6, power: 0.4, special: 'phase', tip: 'Only seen at night, off the dining deck.' },
      bluefin_tuna: { name: 'Bluefin Tuna', type: 'real', rarity: 'rare', value: 22, color: 0x3c6fd9, sign: 'birds', gear: ['heavy'], bait: 'shrimp', stamina: 1.5, power: 0.9, special: 'dive', tip: 'Dives deep. Snaps a light rod every time.' },
      dragon_koi: { name: 'Sunscale Dragon Koi', type: 'fantasy', rarity: 'legendary', value: 60, color: 0xff8a2b, sign: 'gold', gear: ['heavy'], bait: 'gold', needsBait: true, stamina: 1.8, power: 0.8, special: 'sparks', tip: 'Breathes spark patterns. Only bites gold flakes.' },
      old_whiskers: { name: 'Old Whiskers', type: 'real', rarity: 'boss', value: 30, color: 0x6b7a5a, sign: 'shadow', gear: ['harpoon'], bait: 'gold', stamina: 1.1, power: 1, special: 'boss', stages: 3, portions: 6, boss: true, tip: 'A giant catfish. Three rounds with the harpoon.' },
      // Coral Bay fish (the area itself is rebuilt in v4)
      coral_snapper: { name: 'Coral Snapper', type: 'real', rarity: 'uncommon', value: 14, color: 0xff6f91, sign: 'ripples', gear: ['light', 'heavy'], bait: 'shrimp', stamina: 1, power: 0.6, special: 'dive', tip: 'A strong runner from the reef.' },
      bubble_puffer: { name: 'Bubble Puffer', type: 'fantasy', rarity: 'rare', value: 28, color: 0xc59bff, sign: 'glow', gear: ['light'], bait: 'glow', stamina: 1.2, power: 0.6, special: 'blink', tip: 'Puffs up and vanishes in its own bubbles.' }
    },

    areas: {
      home: {
        name: 'Home Waters', sky: 0x8fd3ff, water: 0x2a7fb8,
        spots: { sardine: 30, glowgill: 22, squid: 15, thunder_eel: 16, bluefin_tuna: 11, dragon_koi: 4 },
        night: { glowgill: 40, ghost_shrimp: 35, sardine: 20, thunder_eel: 12 },
        boss: 'old_whiskers', journal: ['sardine', 'glowgill', 'squid', 'thunder_eel', 'crab', 'ghost_shrimp', 'bluefin_tuna', 'dragon_koi', 'old_whiskers'],
        species: { human: 50, mermaid: 25, seaking: 25 }
      },
      coral: {
        name: 'Coral Bay', sky: 0xffc9d9, water: 0x1fa3a3,
        spots: { sardine: 16, glowgill: 14, coral_snapper: 28, bubble_puffer: 14, thunder_eel: 12, bluefin_tuna: 10, dragon_koi: 4 },
        night: { glowgill: 40, ghost_shrimp: 30, bubble_puffer: 15 },
        journal: ['coral_snapper', 'bubble_puffer'],
        species: { human: 35, mermaid: 20, seaking: 20, octofolk: 25 }
      }
    },

    sides: {
      tortilla: { name: 'Tortilla', price: 2 },
      rice: { name: 'Rice', price: 2 },
      kelp: { name: 'Sea kelp', price: 3 },
      veggies: { name: 'Veggies', price: 3 }
    },

    // heat: grill | fry | pot | none. Price is worked out from the ingredients
    // (x priceMultiplier) unless a recipe sets its own.
    recipes: [
      { id: 'grilled_sardine', name: 'Grilled Sardine', fish: { sardine: 1 }, sides: {}, heat: 'grill', kind: 'real' },
      { id: 'glowgill_tacos', name: 'Glowgill Tacos', fish: { glowgill: 1 }, sides: { tortilla: 1 }, heat: 'fry', kind: 'fantasy' },
      { id: 'kelp_wrap', name: 'Kelp Wrap', fish: {}, sides: { kelp: 1, rice: 1 }, heat: 'none', kind: 'kelp' },
      { id: 'fried_calamari', name: 'Fried Calamari', fish: { squid: 1 }, sides: { veggies: 1 }, heat: 'fry', kind: 'real', unlock: 60 },
      { id: 'crab_cakes', name: 'Crab Cakes', fish: { crab: 1 }, sides: { rice: 1 }, heat: 'fry', kind: 'real', unlock: 80 },
      { id: 'thunder_eel_soup', name: 'Thunder Eel Soup', fish: { thunder_eel: 1 }, sides: { veggies: 1 }, heat: 'pot', kind: 'fantasy', unlock: 100 },
      { id: 'shrimp_skewers', name: 'Ghost Shrimp Skewers', fish: { ghost_shrimp: 1 }, sides: { kelp: 1 }, heat: 'grill', kind: 'fantasy', unlock: 140 },
      { id: 'seafood_platter', name: 'Seafood Platter', fish: {}, anyFish: 3, sides: {}, heat: 'grill', kind: 'mixed', price: 45, unlock: 160 },
      { id: 'tuna_sushi', name: 'Tuna Sushi', fish: { bluefin_tuna: 1 }, sides: { rice: 1 }, heat: 'none', kind: 'real', unlock: 240 },
      { id: 'dragon_koi_feast', name: 'Dragon Koi Feast', fish: { dragon_koi: 1 }, sides: { rice: 1, veggies: 1 }, heat: 'grill', kind: 'fantasy', unlock: 400 },
      { id: 'whiskers_gumbo', name: 'Old Whiskers Gumbo', fish: { old_whiskers: 1 }, sides: { rice: 1, veggies: 1 }, heat: 'pot', kind: 'real', legendary: true }
    ],

    heat: {
      grill: { name: 'Grill' }, fry: { name: 'Fryer' }, pot: { name: 'Pot' }, none: { name: 'No cooking' }
    },

    roles: {
      sailor: { id: 'sailor', name: 'Sailor', letter: 'S', color: 0x3d7edb, weight: 45, patience: 'high', pay: 1, blurb: 'cheap + fast' },
      foodie: { id: 'foodie', name: 'Foodie', letter: 'F', color: 0xd9548f, weight: 30, patience: 'medium', pay: 1.2, minMenu: 3, blurb: 'wants quality' },
      pirate: { id: 'pirate', name: 'Pirate', letter: 'P', color: 0x333333, weight: 25, patience: 'low', pay: 1.6, blurb: 'priciest dish' }
    },

    species: {
      human: { id: 'human', name: 'Human', letter: 'H', color: 0xe8b98a, eats: ['real', 'fantasy', 'kelp', 'mixed'], fantasyNerves: 1.4, blurb: 'nervous about fantasy fish' },
      mermaid: { id: 'mermaid', name: 'Mermaid', letter: 'M', color: 0x4fd1c5, eats: ['kelp'], blurb: 'kelp dishes only' },
      seaking: { id: 'seaking', name: 'Sea King', letter: 'K', color: 0xe0b23a, eats: ['fantasy'], pay: 1.3, blurb: 'fantasy fish only' },
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

    // Each tier costs about 2x the last; each should pay for itself in 2-4 nights.
    upgrades: [
      { id: 'tables', name: 'Tables', prices: [150, 350], desc: '4, then 6 tables. The boat grows with them' },
      { id: 'tank', name: 'Fish tank', prices: [120, 300], desc: 'Holds 15, then 25. Fish stay fresh 1 day longer' },
      { id: 'station', name: 'Kitchen', prices: [200, 450], desc: 'A 2nd cutting board and 2, then 3 burners per station' },
      { id: 'board', name: 'Menu board', prices: [200], desc: '6 menu slots instead of 4' },
      { id: 'engine', name: 'Boat engine', prices: [1500], desc: 'Unlocks sailing to Coral Bay' }
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
