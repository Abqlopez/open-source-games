// Title screen, end-of-day summary, and game start-up.
(function () {
  const U = FR.ui, D = FR.DATA;

  class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
      const save = FR.load();
      FR.state = save || FR.newState();
      this.add.rectangle(480, 170, 960, 340, 0x8fd3ff);
      this.add.circle(800, 110, 44, 0xfff3b0);
      this.add.rectangle(480, 455, 960, 290, 0x2a7fb8);
      FR.drawBoat(this, 480, 350);
      U.text(this, 480, 90, 'Floating Restaurant', 54, '#ffffff', { fontStyle: 'bold', stroke: '#16324a', strokeThickness: 8 }).setOrigin(0.5);
      U.text(this, 480, 150, 'Fish by day. Cook by night. Upgrade the boat and sail to new waters.', 18, '#16324a').setOrigin(0.5);
      if (save) {
        U.button(this, 370, 450, 200, 50, `Continue (day ${save.day})`, () => this.scene.start('Fishing'), { color: 0x3f8f4f, size: 17 });
        U.button(this, 590, 450, 200, 50, 'New game', () => { FR.state = FR.newState(); this.scene.start('Fishing'); }, { size: 17 });
      } else {
        U.button(this, 480, 450, 220, 50, 'Start', () => { FR.state = FR.newState(); this.scene.start('Fishing'); }, { color: 0x3f8f4f, size: 20 });
      }
      U.text(this, 480, 540,
        'Mouse + spacebar.  Morning: hold SPACE to cast, press it on the "!" to hook, then read each fish.\n' +
        'Afternoon: set the menu and shop.  Night: click an order to cook it, then serve the customer.',
        14, '#ffffff', { align: 'center' }).setOrigin(0.5);
    }
  }

  class SummaryScene extends Phaser.Scene {
    constructor() { super('Summary'); }
    create(r) {
      const S = FR.state;
      this.add.rectangle(480, 300, 960, 600, 0x0b1b2e);
      this.add.rectangle(480, 300, 640, 540, 0x16324a).setStrokeStyle(3, 0xffe9a8);
      U.text(this, 480, 62, `Day ${r.day} results`, 30, '#ffe9a8', { fontStyle: 'bold' }).setOrigin(0.5);
      const lines = [
        `Money earned:  $${r.earned}`,
        `Tips:  $${r.tips}`,
        `Customers served:  ${r.served}     walked out:  ${r.walked}     turned away:  ${r.turned}`,
        `Reviews tonight:  ${r.reviews.length ? r.reviews.map(n => n + '★').join('  ') : 'none'}`,
        `Star rating:  ★ ${r.rating.toFixed(1)}   (about ${FR.customersTonight()} customers tomorrow night)`,
        `Fish spoiled:  ${r.spoiled.length ? r.spoiled.join(', ') : 'none'}`
      ];
      if (r.requests.length) lines.push(`Requests for tomorrow (pays double):  ${r.requests.map(q => FR.recipe(q.recipe).name).join(', ')}`);
      r.events.forEach(e => lines.push('• ' + e));
      U.text(this, 190, 110, lines.join('\n\n'), 15, '#ffffff', { wordWrap: { width: 580 }, lineSpacing: 2 });
      U.text(this, 480, 492, `You have $${S.money}.  Progress saved.`, 14, '#bfe3ff').setOrigin(0.5);
      U.button(this, 480, 536, 240, 46, `Start day ${S.day} ▶`, () => this.scene.start('Fishing'), { color: 0x3f8f4f, size: 18 });
    }
  }

  FR.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 960,
    height: 600,
    backgroundColor: '#0b1b2e',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [TitleScene, FR.FishingScene, FR.PrepScene, FR.ServiceScene, SummaryScene]
  });
})();
