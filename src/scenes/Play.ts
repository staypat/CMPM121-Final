// Game parameters
const NUM_ROWS = 12;
const NUM_COLS = 20;
const CELL_SIZE = 40;

// Player character
let character: Phaser.GameObjects.Rectangle;
const characterPosition = { row: 0, col: 0 };

// Player movement
let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
const MOVE_COOLDOWN = 250; // In milliseconds
let lastMoveTime = 0;

// Turn button
let _nextTurnButton: Phaser.GameObjects.Text;
let turnCounter = 0;

export class Play extends Phaser.Scene {
    constructor() {
        super("Play");
    }

    preload() {
        // Load assets
    }

    create() {
        const _grid = new Grid(this, NUM_ROWS, NUM_COLS, CELL_SIZE);
        character = this.add.rectangle(CELL_SIZE, CELL_SIZE, CELL_SIZE / 2, CELL_SIZE / 2, 0xff0000);
        cursors = this.input!.keyboard!.createCursorKeys();

        // Button UI (bottom of screen)
        const gridHeight = NUM_ROWS * CELL_SIZE;
        const totalGameHeight = this.scale.height;
        const blackHeight = totalGameHeight - gridHeight;
        // Center of button UI
        const centerX = this.scale.width / 2;
        const centerY = gridHeight + blackHeight / 2;
        // Next turn button
        const _nextTurnButton = this.add.text(centerX, centerY, "Next Turn", {
            font: "20px Arial",
            backgroundColor: "#0000ff",
            padding: { x: 10, y: 10 },
        })
            .setOrigin(0.5, 0.5).setInteractive().on("pointerdown", () => this.nextTurn());
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

    // Function to handle the "Next Turn" button click
    nextTurn() {
        turnCounter++;
        console.log(`Turn ${turnCounter}`);
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
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const x = col * this.cellSize + this.cellSize / 2;
                const y = row * this.cellSize + this.cellSize / 2;
                const cell = this.scene.add.rectangle(x, y, this.cellSize, this.cellSize, 0x00ff00)
                    .setStrokeStyle(1, 0x0000ff)
                    .setInteractive();

                // Handle cell click
                cell.on('pointerdown', () => {
                    this.onCellClick(row, col);
                });
            }
        }
    }

    private onCellClick(row: number, col: number) {
        // Check adjacency with the player
        const isAdjacent = this.isAdjacent(row, col);
        console.log(`Cell is adjacent: ${isAdjacent}`);
    }

    private isAdjacent(row: number, col: number): boolean {
        const dRow = Math.abs(row - characterPosition.row);
        const dCol = Math.abs(col - characterPosition.col);

        // A cell is adjacent if it's directly next to the player or diagonal
        return (dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1) || (dRow === 1 && dCol === 1) || (dRow === 0 && dCol === 0);
    }
}
