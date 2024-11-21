// Game parameters
const NUM_ROWS = 12;
const NUM_COLS = 20;
const CELL_SIZE = 40;

// Player character
let character: Phaser.GameObjects.Rectangle;
const characterPosition = { row: 0, col: 0 };

// Player movement controls
let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
let collectWaterKey: Phaser.Input.Keyboard.Key; // Declare W key for collecting water
let collectSunKey: Phaser.Input.Keyboard.Key; // Declare S key for collecting sun
const MOVE_COOLDOWN = 250; // Cooldown between moves, in milliseconds
let lastMoveTime = 0;

// Turn button
let _nextTurnButton: Phaser.GameObjects.Text;
let turnCounter = 0;

// Popup text and other UI
let popupText: Phaser.GameObjects.Text | null = null; // Popup info for the current cell
let currentWaterText: Phaser.GameObjects.Text; // Tracks the player's collected water
let currentSunText: Phaser.GameObjects.Text; // Tracks the player's collected sun
let activeCell: { sun: number; water: number } | null = null; // Current cell the player is standing on

// Player inventory
let playerWater = 0;
let playerSun = 0;

// Main Play scene
export class Play extends Phaser.Scene {
    private grid!: Grid;

    constructor() {
        super("Play");
    }

    preload() {
        // Preload assets if needed
    }

    create() {
        // Initialize the grid
        this.grid = new Grid(this, NUM_ROWS, NUM_COLS, CELL_SIZE);

        // Add the player character (red rectangle)
        character = this.add.rectangle(CELL_SIZE / 2, CELL_SIZE / 2, CELL_SIZE / 2, CELL_SIZE / 2, 0xff0000);

        // Set up keyboard controls
        cursors = this.input.keyboard!.createCursorKeys();
        collectWaterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W); // W key to collect water
        collectSunKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S); // S key to collect sun

        // Create "Next Turn" button UI
        const gridHeight = NUM_ROWS * CELL_SIZE;
        const totalGameHeight = this.scale.height;
        const blackHeight = totalGameHeight - gridHeight;
        const centerX = this.scale.width / 2;
        const centerY = gridHeight + blackHeight / 2;

        // Add the "Next Turn" button at the center
        _nextTurnButton = this.add.text(centerX, centerY, "Next Turn", {
            font: "20px Arial",
            backgroundColor: "#0000ff",
            padding: { x: 10, y: 10 },
        })
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .on("pointerdown", () => this.nextTurn());

        // Add player's sun counter to the right of the button
        currentSunText = this.add.text(
            centerX + 150, // Position to the right of the button with spacing
            centerY - 20,  // Slightly above water (stacked vertically)
            `Sun Collected: ${playerSun}`,
            {
                font: "20px Arial",
                color: "#ffffff",
                backgroundColor: "#000000",
            }
        ).setOrigin(0, 0.5); // Left-align relative to the sun counter

        // Add player's water counter below the sun counter
        currentWaterText = this.add.text(
            centerX + 150, // Same X position as the sun counter
            centerY + 20,  // Below the sun counter
            `Water Collected: ${playerWater}`,
            {
                font: "20px Arial",
                color: "#ffffff",
                backgroundColor: "#000000",
            }
        ).setOrigin(0, 0.5); // Left-align relative to the water counter
    }

    override update(time: number) {
        // Update player position on movement
        if (time >= lastMoveTime + MOVE_COOLDOWN) {
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

            // Update player visual position when position changes
            character.x = characterPosition.col * CELL_SIZE + CELL_SIZE / 2;
            character.y = characterPosition.row * CELL_SIZE + CELL_SIZE / 2;
        }

        // Update the popup text (even when standing still)
        this.updatePopup();

        // Handle water collection if W is pressed
        if (Phaser.Input.Keyboard.JustDown(collectWaterKey)) {
            this.collectWater();
        }

        // Handle sun collection if S is pressed
        if (Phaser.Input.Keyboard.JustDown(collectSunKey)) {
            this.collectSun();
        }
    }

    private updatePopup() {
        // Get the current cell based on the player's position
        const currentCell = this.grid.getCellData(characterPosition.row, characterPosition.col);

        // If the player moves to a different cell, reset the sun in the previous cell
        if (activeCell && activeCell !== currentCell) {
            activeCell.sun = 0; // Reset the sun to 0 when the player exits the cell
        }

        // If the player moves to a new cell, update the activeCell and popup
        if (activeCell !== currentCell) {
            activeCell = currentCell;

            // Destroy and refresh the popup text
            if (popupText) popupText.destroy();

            popupText = this.add.text(
                character.x + CELL_SIZE / 2,
                character.y - CELL_SIZE / 2,
                `Sun: ${currentCell.sun}, Water: ${currentCell.water}\nPress W to collect water\nPress S to collect sun`,
                {
                    font: "16px Arial",
                    color: "#ffffff",
                    backgroundColor: "#000000",
                }
            );
        }
    }

    private collectWater() {
        // Ensure the player is standing on a valid cell and it has water
        if (activeCell && activeCell.water > 0) {
            // Add water to the player's inventory
            playerWater += activeCell.water;

            // Deplete water in the current cell
            activeCell.water = 0;

            // Refresh the popup text and water counter
            if (popupText) {
                popupText.setText(`Sun: ${activeCell.sun}, Water: ${activeCell.water}\nPress W to collect water\nPress S to collect sun`);
            }
            currentWaterText.setText(`Water Collected: ${playerWater}`);
        } else {
            console.log("No water available to collect in this cell.");
        }
    }

    private collectSun() {
        // Ensure the player is standing on a valid cell and it has sun
        if (activeCell && activeCell.sun > 0) {
            // Add sun to the player's inventory
            playerSun += activeCell.sun;

            // Deplete sun in the current cell
            activeCell.sun = 0;

            // Refresh the popup text and sun counter
            if (popupText) {
                popupText.setText(`Sun: ${activeCell.sun}, Water: ${activeCell.water}\nPress W to collect water\nPress S to collect sun`);
            }
            currentSunText.setText(`Sun Collected: ${playerSun}`);
        } else {
            console.log("No sun available to collect in this cell.");
        }
    }

    private nextTurn() {
        turnCounter++;
        this.grid.randomizeCellData(); // Randomize cell data for the next turn
    }
}

class Grid {
    private scene: Phaser.Scene;
    private rows: number;
    private cols: number;
    private cellSize: number;
    private cellData: { sun: number; water: number }[][]; // Stores metadata for each cell
    private cellVisuals: Phaser.GameObjects.Rectangle[][]; // Stores visual objects for each cell

    constructor(scene: Phaser.Scene, rows: number, cols: number, cellSize: number) {
        this.scene = scene;
        this.rows = rows;
        this.cols = cols;
        this.cellSize = cellSize;

        // Initialize metadata and cell visuals
        this.cellData = Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => ({
                sun: Phaser.Math.Between(1, 5),
                water: Phaser.Math.Between(1, 10),
            }))
        );
        this.cellVisuals = [];
        this.createGrid();
    }

    private createGrid() {
        for (let row = 0; row < this.rows; row++) {
            const rowVisuals: Phaser.GameObjects.Rectangle[] = [];

            for (let col = 0; col < this.cols; col++) {
                const x = col * this.cellSize + this.cellSize / 2;
                const y = row * this.cellSize + this.cellSize / 2;

                const cell = this.scene.add.rectangle(x, y, this.cellSize, this.cellSize, 0x00ff00)
                    .setStrokeStyle(1, 0x0000ff)
                    .setInteractive();

                rowVisuals.push(cell);

                this.cellVisuals.push(rowVisuals);
                // Handle cell click
                cell.on('pointerdown', () => {
                    this.onCellClick(row, col);
                });

            }


        }
    }

    // Get metadata for a specific cell
    public getCellData(row: number, col: number) {
        return this.cellData[row][col];
    }

    // Randomize all cell metadata
    public randomizeCellData() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.cellData[row][col] = {
                    sun: Phaser.Math.Between(1, 5),
                    water: Phaser.Math.Between(1, 10),
                };
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
        return (dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1) || (dRow === 1 && dCol === 1)  || (dRow === 0 && dCol === 0);
    }
}