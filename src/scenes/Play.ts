// Game parameters
const NUM_ROWS = 15;
const NUM_COLS = 20;
const CELL_SIZE = 40;

// Player character
let character: Phaser.GameObjects.Rectangle;
const characterPosition = { row: 0, col: 0 };

// Player movement
let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
const MOVE_COOLDOWN = 250; // in milliseconds
let lastMoveTime = 0;

export class Play extends Phaser.Scene {
    constructor() {
        super("Play");
    }

    preload() {
        // load assets
    }

    create() {
        const grid = new Grid(this, NUM_ROWS, NUM_COLS, CELL_SIZE);
        character = this.add.rectangle(CELL_SIZE, CELL_SIZE, CELL_SIZE / 2, CELL_SIZE / 2, 0xff0000);
        cursors = this.input!.keyboard!.createCursorKeys();
    }

    override update(time: number) {
        // Check if enough time has passed since the last movement
        if (time < lastMoveTime + MOVE_COOLDOWN) return;
        // Check for arrow key input and update character position
        if (cursors.up.isDown && characterPosition.row > 0) {
            characterPosition.row--;
            lastMoveTime = time;
        } else if (cursors.down.isDown && characterPosition.row < NUM_ROWS - 1) {
            characterPosition.row++;
            lastMoveTime = time;
        } else if (cursors.left.isDown && characterPosition.col > 0) {
            characterPosition.col--;
            lastMoveTime = time;
        } else if (cursors.right.isDown && characterPosition.col < NUM_COLS - 1) {
            characterPosition.col++;
            lastMoveTime = time;
        }

        // Update the character's position based on the grid's cell size
        character.x = characterPosition.col * CELL_SIZE + CELL_SIZE / 2;
        character.y = characterPosition.row * CELL_SIZE + CELL_SIZE / 2;
    }
}

class Grid {
    private scene: Phaser.Scene;
    private rows: number;
    private cols: number;
    private cellSize: number;

    constructor(scene: Phaser.Scene, rows: number, cols: number, cellSize: number) {
        this.scene = scene;
        this.rows = rows;
        this.cols = cols;
        this.cellSize = cellSize;
        this.createGrid();
    }

    private createGrid() {
        // create a grid
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const x = col * this.cellSize + this.cellSize / 2;
                const y = row * this.cellSize + this.cellSize / 2;
                const cell = this.scene.add.rectangle(x, y, this.cellSize, this.cellSize, 0x00ff00);
                cell.setStrokeStyle(1, 0x0000ff);
            }
        }
    }
}