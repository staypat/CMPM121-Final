class Play extends Phaser.Scene {
    constructor() {
        super("Play");
    }

    preload() {
        // load assets
    }

    create() {
        this.add.rectangle(200, 150, 100, 50, 0x0000ff);
    }

    update() {
    }
}
