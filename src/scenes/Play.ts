// Game parameters
const NUM_ROWS = 12;
const NUM_COLS = 20;
const CELL_SIZE = 40;

// Plant types and growth levels
const PLANT_TYPES = ["None", "Species A", "Species B", "Species C"];
const GROWTH_LEVELS = ["N/A", "Level 1", "Level 2", "Level 3"];
const GROWTH_COLORS = {
    "": 0x00000000, // clear
    "Level 1": 0xffff00, // Yellow
    "Level 2": 0x0000ff, // Blue
    "Level 3": 0x800080  // Purple
};

// Player character
let character: Phaser.GameObjects.Rectangle;
const characterPosition = { row: 0, col: 0 };

// Player movement controls
let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
const MOVE_COOLDOWN = 250; // Cooldown between moves, in milliseconds
let lastMoveTime = 0;

// Turn button
let _nextTurnButton: Phaser.GameObjects.Text;
let turnCounter = 0;

// Popup text and other UI
let popupText: Phaser.GameObjects.Text | null = null; // Popup info for the current cell
let activeCell: { sun: number; water: number; plantType: string; growthLevel: string } | null = null; // Current cell the player is standing on

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

        // Create the "Next Turn" button UI
        const gridHeight = NUM_ROWS * CELL_SIZE;
        const totalGameHeight = this.scale.height;
        const blackHeight = totalGameHeight - gridHeight;
        const centerX = this.scale.width / 2;
        const centerY = gridHeight + blackHeight / 2;

        // Add the "Next Turn" button
        _nextTurnButton = this.add.text(centerX, centerY, "Next Turn", {
            font: "20px Arial",
            backgroundColor: "#0000ff",
            padding: { x: 10, y: 10 },
        })
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .on("pointerdown", () => this.nextTurn());
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
    }

    private updatePopup() {
        // Get the current cell based on the player's position
        const currentCell = this.grid.getCellData(characterPosition.row, characterPosition.col);

        // If the player moves to a different cell, update the activeCell and popup
        if (activeCell !== currentCell) {
            activeCell = currentCell;

            // Destroy and refresh the popup text
            if (popupText) popupText.destroy();

            popupText = this.add.text(
                character.x + CELL_SIZE / 2,
                character.y - CELL_SIZE / 2,
                `Sun: ${currentCell.sun}, Water: ${currentCell.water}\nPlant: ${currentCell.plantType}, Growth: ${currentCell.growthLevel}`,
                {
                    font: "16px Arial",
                    color: "#ffffff",
                    backgroundColor: "#000000",
                }
            );
        }
    }

    private nextTurn() {
        turnCounter++;
        this.grid.advanceTime(); // Randomize cell data for the next turn
    }
}

class Grid {
    private scene: Phaser.Scene;
    private rows: number;
    private cols: number;
    private cellSize: number;
    private cellData: { sun: number; water: number; plantType: string; growthLevel: string }[][]; // Stores metadata for each cell
    private cellVisuals: Phaser.GameObjects.Rectangle[][]; // Stores visual objects for each cell
    private plantVisuals: Phaser.GameObjects.Rectangle[][]; // Stores plant visuals for each cell

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
                plantType: PLANT_TYPES[0],
                growthLevel: GROWTH_LEVELS[0],
            }))
        );
        this.cellVisuals = [];
        this.plantVisuals = [];
        this.createGrid();
    }

    private createGrid() {
        for (let row = 0; row < this.rows; row++) {
            const rowVisuals: Phaser.GameObjects.Rectangle[] = [];
            const rowPlants: Phaser.GameObjects.Rectangle[] = [];

            for (let col = 0; col < this.cols; col++) {
                const x = col * this.cellSize + this.cellSize / 2;
                const y = row * this.cellSize + this.cellSize / 2;

                const cell = this.scene.add.rectangle(x, y, this.cellSize, this.cellSize, 0x00ff00)
                    .setStrokeStyle(1, 0x0000ff)
                    .setInteractive();

                const plant = this.scene.add.rectangle(
                    x,
                    y,
                    this.cellSize / 2,
                    this.cellSize / 2,
                    GROWTH_COLORS[this.cellData[row][col].growthLevel as keyof typeof GROWTH_COLORS]
                );

                rowVisuals.push(cell);
                rowPlants.push(plant);

                // Handle cell click (if future actions are added)
                cell.on('pointerdown', () => {
                    this.onCellClick(row, col);
                });
            }

            this.cellVisuals.push(rowVisuals);
            this.plantVisuals.push(rowPlants);
        }
    }

    // Get metadata for a specific cell
    public getCellData(row: number, col: number) {
        return this.cellData[row][col];
    }

    // Randomize all cell metadata every turn
    public advanceTime() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.cellData[row][col] = {
                    sun: Phaser.Math.Between(1, 5),
                    water: this.cellData[row][col].water + Phaser.Math.Between(1, 10) - 5,
                    plantType: this.cellData[row][col].plantType,
                    growthLevel: this.cellData[row][col].growthLevel,
                };

                // Update plant visual color
                this.plantVisuals[row][col].setFillStyle(
                    GROWTH_COLORS[this.cellData[row][col].growthLevel as keyof typeof GROWTH_COLORS]
                );
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