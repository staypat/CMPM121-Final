/// <reference path="../lib/phaser.d.ts" />
import { Play } from './scenes/Play.js';
import "./style.css";

const config = {
    parent: 'gameView',
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Play]
};

const game = new Phaser.Game(config);

// Handle window resizing
globalThis.addEventListener('resize', () => {
    const newWidth = globalThis.innerWidth;
    const newHeight = globalThis.innerHeight;

    // Resize the Phaser game instance
    game.scale.resize(newWidth, newHeight);
});