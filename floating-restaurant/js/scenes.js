// Title screen, end-of-day summary, and game start-up.
(function () {
  const U = FR.ui, D = FR.DATA;

  class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
      const save = FR.load();
      FR.state = save || FR.newState();
      this.sea = FR.drawSea(this, FR.state.area);
      FR.drawBoat(this, 480, 318);
      ['dragon_koi', 'glowgill', 'thunder_eel', 'bluefin_tuna'].forEach((id, i) => {
        const f = this.add.image([150, 800, 250, 720][i], [395, 385, 470, 465][i], 'fish_' + id).setScale(0.9).setDepth(2);
        f.flipX = i % 2 === 1;
        this.tweens.add({ targets: f, y: f.y + 10, x: f.x + (i % 2 ? -24 : 24), duration: 2200 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
      const logo = U.title(this, 480, 92, 'Floating Restaurant', 72, '#ffe9a8').setOrigin(0.5).setDepth(10);
      this.tweens.add({ targets: logo, y: 98, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      U.text(this, 480, 156, 'Fish by day. Cook by night. Sail to new waters.', 20, '#2b2140', { fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
      if (save) {
        U.button(this, 370, 440, 200, 52, `Continue (day ${save.day})`, () => this.scene.start('Fishing'), { color: 0x3f8f4f, size: 17 }).setDepth(20);
        U.button(this, 590, 440, 200, 52, 'New game', () => { FR.state = FR.newState(); this.scene.start('Fishing'); }, { size: 17 }).setDepth(20);
      } else {
        U.button(this, 480, 440, 220, 52, 'Start', () => { FR.state = FR.newState(); this.scene.start('Fishing'); }, { color: 0x3f8f4f, size: 22 }).setDepth(20);
      }
      U.text(this, 480, 540,
        'Move with WASD or the arrow keys.  Do things with E or SPACE.\n' +
        'Morning: steer to the signs on the water and fish.  Night: run the whole boat yourself.',
        14, '#ffffff', { align: 'center', backgroundColor: '#2b2140cc', padding: { x: 12, y: 8 } }).setOrigin(0.5).setDepth(20);
    }
    update(t, d) { this.sea.update(d / 1000); }
  }

  class SummaryScene extends Phaser.Scene {
    constructor() { super('Summary'); }
    create(r) {
      const S = FR.state;
      FR.art.build(this);
      this.add.image(480, 300, 'nightsea');
      U.card(this, 480, 300, 646, 546, 0xffd98a);
      U.card(this, 480, 300, 636, 536, 0x1d3557);
      U.title(this, 480, 64, `Day ${r.day} results`, 36).setOrigin(0.5);
      const L = r.ledger;
      const income = L.sales + L.tips + L.raw + L.rewards, costs = L.ingredients + L.bait + L.plates, profit = income - costs;
      const money = n => (n < 0 ? '-$' + (-n) : '$' + n);
      const rows = [
        ['Dishes sold', L.sales], ['Tips' + (r.bestCombo >= 2 ? `  (best combo x${r.bestCombo})` : ''), L.tips], ['Raw fish sold', L.raw], ['Journal + gifts', L.rewards],
        ['Ingredients', -L.ingredients], ['Bait', -L.bait], ['New plates' + (r.broken ? `  (${r.broken} broke)` : ''), -L.plates]
      ];
      U.text(this, 190, 100, 'EARNINGS', 13, '#ffe9a8', { fontStyle: 'bold' });
      rows.forEach(([name, v], i) => {
        U.text(this, 190, 120 + i * 20, name, 14, '#ffffff');
        U.text(this, 470, 120 + i * 20, money(v), 14, v < 0 ? '#ff9c9c' : '#9cffb0').setOrigin(1, 0);
      });
      this.add.rectangle(330, 264, 280, 2, 0xffe9a8);
      U.text(this, 190, 270, "Tonight's profit", 16, '#ffe9a8', { fontStyle: 'bold' });
      U.text(this, 470, 270, money(profit), 16, profit < 0 ? '#ff9c9c' : '#9cffb0', { fontStyle: 'bold' }).setOrigin(1, 0);
      if (L.invest) U.text(this, 190, 292, `Also invested in the boat: $${L.invest}`, 12, '#bfe3ff');
      const side = [
        `Served:  ${r.served}`, `Walked out:  ${r.walked}`, `Turned away:  ${r.turned}`,
        `Star rating:  ★ ${r.rating.toFixed(1)}`, `Tomorrow: about ${FR.customersTonight()} customers`,
        `Fish spoiled:  ${r.spoiled.length ? r.spoiled.join(', ') : 'none'}`
      ];
      U.text(this, 510, 100, 'THE NIGHT', 13, '#ffe9a8', { fontStyle: 'bold' });
      U.text(this, 510, 120, side.join('\n'), 14, '#ffffff', { lineSpacing: 6, wordWrap: { width: 270 } });
      const lines = [`Reviews:  ${r.reviews.length ? r.reviews.map(n => n + '★').join(' ') : 'none'}`];
      if (r.requests.length) lines.push(`Requests for tomorrow (pays double):  ${r.requests.map(q => FR.recipe(q.recipe).name).join(', ')}`);
      r.events.forEach(e => lines.push('• ' + e));
      U.text(this, 190, 322, lines.join('\n'), 13, '#ffffff', { wordWrap: { width: 580 }, lineSpacing: 5 });
      U.text(this, 480, 492, `You have $${S.money}.  Progress saved.`, 14, '#bfe3ff').setOrigin(0.5);
      U.button(this, 480, 536, 240, 46, `Start day ${S.day} ▶`, () => this.scene.start('Fishing'), { color: 0x3f8f4f, size: 18 });
    }
  }

  // Wait (briefly) for the web fonts so canvas text uses them, then start.
  function start() {
    FR.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: 960,
      height: 600,
      backgroundColor: '#0b1b2e',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [TitleScene, FR.FishingScene, FR.PrepScene, FR.ServiceScene, SummaryScene]
    });
  }
  let started = false;
  const go = () => { if (!started) { started = true; start(); } };
  try {
    Promise.all([document.fonts.load('16px "Fredoka"'), document.fonts.load('16px "Lilita One"')]).then(go, go);
  } catch (e) { go(); }
  setTimeout(go, 1500);
})();
