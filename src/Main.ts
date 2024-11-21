/// <reference path="../lib/phaser.d.ts" />
import { Play } from './scenes/Play.ts';

const config: Phaser.Types.Core.GameConfig = {
    parent: 'gameView',
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [Play]
}

const _game = new Phaser.Game(config);