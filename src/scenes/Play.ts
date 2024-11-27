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
    private hasWon: boolean = false;

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

    // Handle the win condition
    public handleWin() {
        this.hasWon = true; // Stop game interactions

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // Display "You Win!" message
        this.add.text(centerX, centerY, "You Win!", {
            font: "32px Arial",
            color: "#ffffff",
            backgroundColor: "#000000",
            padding: { x: 20, y: 20 },
        }).setOrigin(0.5, 0.5);

        // Change the button text for restarting
        _nextTurnButton.setText("Restart").on("pointerdown", () => this.scene.restart());
    }
}

class Grid {
    private scene: Phaser.Scene;
    private rows: number;
    private cols: number;
    private cellSize: number;
    private gridData: Uint8Array; // Array of Structures for grid data
    private cellVisuals: Phaser.GameObjects.Rectangle[][]; // Stores visual objects for each cell
    private plantVisuals: Phaser.GameObjects.Rectangle[][]; // Stores plant visuals for each cell
    private level3PlantCounts: { [key: string]: number }; // Tracks counts of Level 3 plants for each species

    constructor(scene: Phaser.Scene, rows: number, cols: number, cellSize: number) {
        this.scene = scene;
        this.rows = rows;
        this.cols = cols;
        this.cellSize = cellSize;

        // Initialize metadata and cell visuals
        this.gridData = new Uint8Array(rows * cols * 4); // 4 values per cell (sun, water, plantType, growthLevel)
        this.cellVisuals = [];
        this.plantVisuals = [];
        this.level3PlantCounts = {
            "Species A": 0,
            "Species B": 0,
            "Species C": 0,
        };

        this.initializeGrid();
        this.createGridVisuals();
    }

    // Initialize the grid's byte array with random or default values
    private initializeGrid() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = (row * this.cols + col) * 4;

                // Initialize cell properties
                this.gridData[index] = Phaser.Math.Between(1, 5); // Sun
                this.gridData[index + 1] = Phaser.Math.Between(1, 10); // Water
                this.gridData[index + 2] = 0; // PlantType (None)
                this.gridData[index + 3] = 0 // GrowthLevel (N/A)
            }
        }
    }
    
    private createGridVisuals() {
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
                    GROWTH_COLORS[this.getCellData(row, col).growthLevel as keyof typeof GROWTH_COLORS]
                );

                rowVisuals.push(cell);
                rowPlants.push(plant);

                // Handle cell click
                cell.on('pointerdown', () => {
                    this.onCellClick(row, col);
                    // If the empty cell is adjacent to the player, plant a seed
                    if (this.getCellData(row, col).plantType === PLANT_TYPES[0] && this.isAdjacent(row, col)) {
                        this.plantSeed(row, col, PLANT_TYPES[Phaser.Math.Between(1, PLANT_TYPES.length - 1)]);
                    }
                    // Else if the cell is not empty and the growth level is max, harvest the plant
                    else if (this.getCellData(row, col).plantType !== PLANT_TYPES[0] && this.getCellData(row, col).growthLevel === GROWTH_LEVELS[GROWTH_LEVELS.length - 1]) {
                        this.getCellData(row, col).plantType = PLANT_TYPES[0];
                        this.getCellData(row, col).growthLevel = GROWTH_LEVELS[0];
                        this.plantVisuals[row][col].setFillStyle(GROWTH_COLORS[GROWTH_LEVELS[0] as keyof typeof GROWTH_COLORS]);
                    }
                });
            }

            this.cellVisuals.push(rowVisuals);
            this.plantVisuals.push(rowPlants);
        }
    }

    // Get metadata for a specific cell
    public getCellData(row: number, col: number) {
        const index = (row * this.cols + col) * 4;
        return {
            sun: this.gridData[index], // Sunlight value
            water: this.gridData[index + 1], // Water value
            plantType: PLANT_TYPES[this.gridData[index + 2]], // Convert plantType index to string
            growthLevel: GROWTH_LEVELS[this.gridData[index + 3]], // Convert growthLevel index to string
        };
    }

    // Randomize all cell metadata every turn
    public advanceTime() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = (row * this.cols + col) * 4;
    
                // Randomize sun and water values
                this.gridData[index] = Phaser.Math.Between(1, 5);       // new sun value
                this.gridData[index + 1] += Phaser.Math.Between(3, 5);   // adjust water level
    
                // Growth logic: If the sun is greater than 3 and water is greater than 10 and the plant level is greater than 0, increase the growth level
                if (this.gridData[index] > 3 && this.gridData[index + 1] > 10 && this.getCellData(row, col).growthLevel !== GROWTH_LEVELS[0]) {
                    if (this.gridData[index + 3] < 3) { // growthLevel < Level 3
                        this.gridData[index + 3]++;
                        if (this.gridData[index + 3] === 3) { // growthLevel == Level 3
                            const plantTypeIndex = this.gridData[index + 2];
                            const plantType = PLANT_TYPES[plantTypeIndex];
                            if (this.level3PlantCounts[plantType] !== undefined) {
                                this.level3PlantCounts[plantType]++;
                            }
                        }
                    }
                }

                // Update plant visual color
                this.plantVisuals[row][col].setFillStyle(
                    GROWTH_COLORS[this.getCellData(row, col).growthLevel as keyof typeof GROWTH_COLORS]
                );
            }
        }
        console.log("Level 3 Plant Counts:", this.level3PlantCounts);
        this.checkWinCondition();
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

    private plantSeed(row: number, col: number, plantType: string) {
        const index = (row * this.cols + col) * 4;
    
        this.gridData[index + 2] = PLANT_TYPES.indexOf(plantType);   // Update plantType
        this.gridData[index + 3] = 1;                               // Set growthLevel to "Level 1"
    
        // Update visual color
        this.plantVisuals[row][col].setFillStyle(GROWTH_COLORS["Level 1"]);
    }

    // Win condition: Check if all species have more than 5 of Level 3 plants
    private checkWinCondition() {
        // Retrieve counts for each species
        const speciesA = this.level3PlantCounts["Species A"];
        const speciesB = this.level3PlantCounts["Species B"];
        const speciesC = this.level3PlantCounts["Species C"];
            
        // If all species have >= 5 Level 3 plants, trigger the win state
        if (speciesA >= 5 && speciesB >= 5 && speciesC >= 5) {
            (this.scene as Play).handleWin();
        }
    }
}
