/// <reference path="../lib/phaser.d.ts" />

const config = {
    parent: 'gameView',
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [Play]
}

const game = new Phaser.Game(config);