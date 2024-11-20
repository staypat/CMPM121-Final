class Main extends Phaser.Scene {
    constructor() {
        super("Main");
    }

    preload() {
        // You can load assets here if needed
    }

    create() {
        // Adding a rectangle to the scene
        this.add.rectangle(200, 150, 100, 50, 0x0000ff);
    }

    update() {
        // Logic update happens here
    }
}

// Phaser game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: Main,
    // parent: 'phaser-game-container', // optional if appending to a specific div
};

// Initialize the Phaser Game
const game = new Phaser.Game(config);