/// <reference path="../lib/phaser.d.ts" />
import { Play } from './scenes/Play.js';
import "./style.css";

const config = {
    parent: 'gameView',
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [Play]
};

const _game = new Phaser.Game(config);