// Game parameters
const NUM_ROWS = 12;
const NUM_COLS = 20;
const CELL_SIZE = 40;
const PLANT_TYPES = ["None", "Species A", "Species B", "Species C"];
const GROWTH_LEVELS = ["N/A", "Level 1", "Level 2", "Level 3"];
const PLANT_TEXTURE_KEY: { [key: string]: number } = {
    empty: 0,       // Empty patch
    seedling: 8,    // Shared 1st growth stage
    plant_a_2: 1,   // Plant A, 2nd growth stage
    plant_a_3: 2,   // Plant A, 3rd growth stage
    plant_b_2: 5,   // Plant B, 2nd growth stage
    plant_b_3: 6,   // Plant B, 3rd growth stage
    plant_c_2: 9,   // Plant C, 2nd growth stage
    plant_c_3: 10,  // Plant C, 3rd growth stage
};
let character: Phaser.GameObjects.Sprite;
const characterPosition = { row: 0, col: 0 };
let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
const MOVE_COOLDOWN = 250;
let lastMoveTime = 0;
let _nextTurnButton: Phaser.GameObjects.Text;
let turnCounter = 0;
let popupText: Phaser.GameObjects.Text | null = null;
let activeCell: { sun: number; water: number; plantType: string; growthLevel: string } | null = null;
const undoStack: { gridData: Uint8Array; characterPosition: { row: number; col: number } }[] = [];
const redoStack: { gridData: Uint8Array; characterPosition: { row: number; col: number } }[] = [];

import * as yaml from 'js-yaml';
export class Play extends Phaser.Scene {
    private grid!: Grid;
    private hasWon: boolean = false;

    constructor() {
        super("Play");
    }

    preload() {
        this.load.spritesheet('plants', '/assets/reap_sow_tilesheet.png', {
            frameWidth: CELL_SIZE * 10, // Width of each tile
            frameHeight: CELL_SIZE * 10, // Height of each tile
        });
        this.load.image('player', '/assets/astronaut.png');
        const url = '/assets/scenarios/level1.yaml';
        console.log('Loading level file from:', url);
        this.load.text('level1', url);
    }

    

    create() {
        // Initialize game state
        this.grid = new Grid(this, NUM_ROWS, NUM_COLS, CELL_SIZE);
        character = this.add.sprite(CELL_SIZE / 2, CELL_SIZE / 2, 'player').setScale(.1);
        cursors = this.input.keyboard!.createCursorKeys();
        const gridHeight = NUM_ROWS * CELL_SIZE;
        const totalGameHeight = this.scale.height;
        const blackHeight = totalGameHeight - gridHeight;
        const centerX = this.scale.width / 2;

        const levelData = this.cache.text.get('level1');
        if (!levelData) {
            console.error('Failed to load level1.yaml');
            return;
        }
        const parsedData = yaml.load(levelData);
        console.log(parsedData);
        
        if (parsedData.StartingConditions) {
            const startPos = parsedData.StartingConditions.PlayerPosition;
            if (startPos) {
                const [row, col] = startPos;
                characterPosition.row = row;
                characterPosition.col = col;
                character.setPosition(
                    col * CELL_SIZE + CELL_SIZE / 2,
                    row * CELL_SIZE + CELL_SIZE / 2
                );
            }
        }

        // Push initial state to the undo stack
        this.grid.pushUndoStack();
    
        // Adjust the Next Turn button to sit higher than before
        const centerY = gridHeight + (blackHeight / 2) - 30; // Move the button 50px up
        
    
        _nextTurnButton = this.add.text(centerX, centerY, "Next Turn", {
            font: "20px Arial",
            backgroundColor: "#0000ff",
            padding: { x: 10, y: 10 },
        })
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .on("pointerdown", () => this.nextTurn());

        // Add undo button
        this.add.text(centerX - 100, centerY, "Undo", {
            font: "20px Arial",
            backgroundColor: "#ff0000",
            padding: { x: 10, y: 10 },
        })
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .on("pointerdown", () => {
                if (undoStack.length != 0) {
                    redoStack.push({
                        gridData: new Uint8Array(this.grid.getSerializedData().gridData),
                        characterPosition: { row: characterPosition.row, col: characterPosition.col },
                    });
                    const undoState = undoStack.pop();
                    if (undoState) {
                        this.grid.loadSerializedData({
                            gridData: Array.from(undoState!.gridData),
                            level3PlantCounts: this.grid.getLevel3PlantCounts()
                        });
                    }
                    characterPosition.row = undoState!.characterPosition.row;
                    characterPosition.col = undoState!.characterPosition.col;
                    character.x = characterPosition.col * CELL_SIZE + CELL_SIZE / 2;
                    character.y = characterPosition.row * CELL_SIZE + CELL_SIZE / 2;
                }
            });

        // Add redo button
        this.add.text(centerX + 100, centerY, "Redo", {
            font: "20px Arial",
            backgroundColor: "#00ff00",
            padding: { x: 10, y: 10 },
        })
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .on("pointerdown", () => {
                if (redoStack.length != 0) {
                    undoStack.push({
                        gridData: new Uint8Array(this.grid.getSerializedData().gridData),
                        characterPosition: { row: characterPosition.row, col: characterPosition.col },
                    });
                    const redoState = redoStack.pop();
                    if (redoState) {
                        this.grid.loadSerializedData({
                            gridData: Array.from(redoState!.gridData),
                            level3PlantCounts: this.grid.getLevel3PlantCounts()
                        });
                    }
                    characterPosition.row = redoState!.characterPosition.row;
                    characterPosition.col = redoState!.characterPosition.col;
                    character.x = characterPosition.col * CELL_SIZE + CELL_SIZE / 2;
                    character.y = characterPosition.row * CELL_SIZE + CELL_SIZE / 2;
                }
            });
    
        this.addSaveLoadUI();
        
        if (localStorage.getItem("AutoSave")) {
            const continueText = this.add.text(centerX, centerY - 50, "Continue from last auto-save?", {
                font: "20px Arial",
                backgroundColor: "#0000ff",
                padding: { x: 10, y: 10 },
            })
                .setOrigin(0.5, 0.5)
                .setInteractive()
                .on("pointerdown", () => {
                    this.loadAutoSave();
                    continueText.destroy();
                });
        }

        // Timer for autosave
        this.time.addEvent({
            delay: 30000, // 30 seconds
            callback: this.autoSaveGame,
            callbackScope: this,
            loop: true
        });
    
        // Add event listener for browser close
        globalThis.addEventListener('beforeunload', () => {
            this.autoSaveGame();
        });
    }


    override update(time: number) {
        // Only handle input if the cooldown period has expired and no tween is running
        let isMoving = false;
        if (time >= lastMoveTime + MOVE_COOLDOWN && !isMoving) {
            let hasMoved = false;

    
            // Handle player movement inputs
            if (cursors.up.isDown && characterPosition.row > 0) {
                characterPosition.row--;
                hasMoved = true;
            } else if (cursors.down.isDown && characterPosition.row < NUM_ROWS - 1) {
                characterPosition.row++;
                hasMoved = true;
            } else if (cursors.left.isDown && characterPosition.col > 0) {
                characterPosition.col--;
                character.flipX = true;
                hasMoved = true;
            } else if (cursors.right.isDown && characterPosition.col < NUM_COLS - 1) {
                characterPosition.col++;
                character.flipX = false;
                hasMoved = true;
            }
    
            if (hasMoved) {
                // Push move to undo stack
                this.grid.pushUndoStack();
                console.log("Player Moved. Undo Stack and Redo Stack Updated.");
    
                // Lock movement and set cooldown
                isMoving = true; // Custom property to lock movement
                lastMoveTime = time;
    
                // Calculate target visual position
                const targetX = characterPosition.col * CELL_SIZE + CELL_SIZE / 2;
                const targetY = characterPosition.row * CELL_SIZE + CELL_SIZE / 2;
    
                // Tween for smooth movement
                this.tweens.add({
                    targets: character,
                    x: targetX,
                    y: targetY,
                    duration: MOVE_COOLDOWN, // Match tween duration to your cooldown
                    ease: 'Linear',
                    onComplete: () => {
                        isMoving = false; // Unlock movement after tween completes
                    }
                });
            }
        }
    
        this.updatePopup();
    }

    private updatePopup() {
        const currentCell = this.grid.getCellData(characterPosition.row, characterPosition.col);
        if (activeCell !== currentCell) {
            activeCell = currentCell;
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
        this.grid.advanceTime();
        this.autoSaveGame(); // Auto-save after each turn
    }

    public handleWin() {
        this.hasWon = true;
        localStorage.removeItem("AutoSave"); // Clear auto-save on win
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        this.add.text(centerX, centerY, "You Win!", {
            font: "32px Arial",
            color: "#ffffff",
            backgroundColor: "#000000",
            padding: { x: 20, y: 20 },
        }).setOrigin(0.5, 0.5);

        _nextTurnButton.setText("Restart").on("pointerdown", () => this.scene.restart());
    }

    private saveGame(slotName: string) {
        const gameState = {
            gridData: this.grid.getSerializedData().gridData, // Save grid data
            characterPosition: { ...characterPosition },       // Save player position
            turnCounter,                                       // Save turn counter
            level3PlantCounts: this.grid.getLevel3PlantCounts(), // Save plant counts
            undoStack: undoStack.map(state => ({
                gridData: Array.from(state.gridData),
                characterPosition: { ...state.characterPosition },
            })), // Serialize undoStack
            redoStack: redoStack.map(state => ({
                gridData: Array.from(state.gridData),
                characterPosition: { ...state.characterPosition },
            })), // Serialize redoStack
        };
    
        // Save game state
        localStorage.setItem(slotName, JSON.stringify(gameState));
        console.log(`Game saved to slot: ${slotName}`);
    }

    private loadGame(slotName: string) {
        const savedState = localStorage.getItem(slotName);
        if (!savedState) {
            console.error(`No save found in slot: ${slotName}`);
            return;
        }

        const gameState = JSON.parse(savedState);

        // Restore grid data, player position, and turn counter
        this.grid.loadSerializedData({
            gridData: gameState.gridData,
            level3PlantCounts: gameState.level3PlantCounts,
        });
        characterPosition.row = gameState.characterPosition.row;
        characterPosition.col = gameState.characterPosition.col;
        turnCounter = gameState.turnCounter;

        // Update visuals to match the restored character position
        character.x = characterPosition.col * CELL_SIZE + CELL_SIZE / 2;
        character.y = characterPosition.row * CELL_SIZE + CELL_SIZE / 2;

        // Restore undo/redo stacks
        undoStack.length = 0; // Clear existing stack
        redoStack.length = 0; // Clear existing stack
        gameState.undoStack.forEach((state: { gridData: number[]; characterPosition: { row: number; col: number } }) => {
            undoStack.push({
                gridData: Uint8Array.from(state.gridData),
                characterPosition: { ...state.characterPosition },
            });
        });
        gameState.redoStack.forEach((state: { gridData: number[]; characterPosition: { row: number; col: number } }) => {
            redoStack.push({
                gridData: Uint8Array.from(state.gridData),
                characterPosition: { ...state.characterPosition },
            });
        });
    
        console.log(`Game loaded from slot: ${slotName}`);
        console.log("Undo Stack:", undoStack);
        console.log("Redo Stack:", redoStack);
    }

    private addSaveLoadUI() {
        const buttonWidth = 120; // Width of each button
        const spacing = 10; // Space between buttons
        const yPosition = this.scale.height - 50; // Align horizontally with "Next Turn" button
        const centerX = this.scale.width / 2; // Center point for the "Next Turn" button
    
        // Calculate starting x position so all buttons fit to the left of "Next Turn"
        let xOffset = centerX - (3 * (buttonWidth + spacing)) - spacing; // Place Save/Load buttons leftwards of center
    
        // Save Slot 1 Button
        this.add.text(xOffset, yPosition, "Save Slot 1", {
            font: "16px Arial",
            backgroundColor: "#008000",
            padding: { x: 10, y: 10 },
        })
            .setInteractive()
            .on("pointerdown", () => this.saveGame("SaveSlot1"));
    
        // Load Slot 1 Button
        xOffset += buttonWidth + spacing; // Move to the right of the previous button
        this.add.text(xOffset, yPosition, "Load Slot 1", {
            font: "16px Arial",
            backgroundColor: "#800000",
            padding: { x: 10, y: 10 },
        })
            .setInteractive()
            .on("pointerdown", () => this.loadGame("SaveSlot1"));
    
        // Save Slot 2 Button
        xOffset += buttonWidth + spacing; // Move to the right of the previous button
        this.add.text(xOffset, yPosition, "Save Slot 2", {
            font: "16px Arial",
            backgroundColor: "#008000",
            padding: { x: 10, y: 10 },
        })
            .setInteractive()
            .on("pointerdown", () => this.saveGame("SaveSlot2"));
    
        // Load Slot 2 Button
        xOffset += buttonWidth + spacing; // Move to the right of the previous button
        this.add.text(xOffset, yPosition, "Load Slot 2", {
            font: "16px Arial",
            backgroundColor: "#800000",
            padding: { x: 10, y: 10 },
        })
            .setInteractive()
            .on("pointerdown", () => this.loadGame("SaveSlot2"));
    
        // Save Slot 3 Button
        xOffset += buttonWidth + spacing; // Move to the right of the previous button
        this.add.text(xOffset, yPosition, "Save Slot 3", {
            font: "16px Arial",
            backgroundColor: "#008000",
            padding: { x: 10, y: 10 },
        })
            .setInteractive()
            .on("pointerdown", () => this.saveGame("SaveSlot3"));
    
        // Load Slot 3 Button
        xOffset += buttonWidth + spacing; // Move to the right of the previous button
        this.add.text(xOffset, yPosition, "Load Slot 3", {
            font: "16px Arial",
            backgroundColor: "#800000",
            padding: { x: 10, y: 10 },
        })
            .setInteractive()
            .on("pointerdown", () => this.loadGame("SaveSlot3"));
    }

    private autoSaveGame() {
        const gameState = {
            gridData: this.grid.getSerializedData(),
            characterPosition,
            turnCounter,
            level3PlantCounts: this.grid.getLevel3PlantCounts(),
        };
        localStorage.setItem("AutoSave", JSON.stringify(gameState));
        console.log("Game auto-saved.");
    }

    private loadAutoSave() {
        const savedState = localStorage.getItem("AutoSave");
        if (!savedState) {
            console.error("No auto-save found.");
            return;
        }
        const gameState = JSON.parse(savedState);
        this.grid.loadSerializedData(gameState.gridData);
        characterPosition.row = gameState.characterPosition.row;
        characterPosition.col = gameState.characterPosition.col;
        turnCounter = gameState.turnCounter;
        console.log("Game loaded from auto-save.");
    }
}

class Grid {
    private scene: Phaser.Scene;
    private rows: number;
    private cols: number;
    private cellSize: number;
    private gridData: Uint8Array;
    private cellVisuals: Phaser.GameObjects.Rectangle[][];
    private plantVisuals: Phaser.GameObjects.Sprite[][];
    private level3PlantCounts: { [key: string]: number };

    constructor(scene: Phaser.Scene, rows: number, cols: number, cellSize: number) {
        this.scene = scene;
        this.rows = rows;
        this.cols = cols;
        this.cellSize = cellSize;
        this.gridData = new Uint8Array(rows * cols * 4); // 4 values per cell: sun, water, plantType, growthLevel
        this.cellVisuals = [];
        this.plantVisuals = [];
        this.level3PlantCounts = { "Species A": 0, "Species B": 0, "Species C": 0 };
        this.initializeGrid();
        this.createGridVisuals();
    }

    // This method retrieves metadata for a specific cell
    public getCellData(row: number, col: number) {
        const index = (row * this.cols + col) * 4;
        return {
            sun: this.gridData[index], // Sunlight value
            water: this.gridData[index + 1], // Water value
            plantType: PLANT_TYPES[this.gridData[index + 2]], // Convert plantType index to string
            growthLevel: GROWTH_LEVELS[this.gridData[index + 3]], // Convert growthLevel index to string
        };
    }

    // Serialize all grid data (used for saving and loading)
    public getSerializedData() {
        return {
            gridData: Array.from(this.gridData), // Convert Uint8Array to a regular array
            level3PlantCounts: this.level3PlantCounts,
        };
    }

    // Load and apply serialized data to the grid
    public loadSerializedData(gridState: { gridData: number[]; level3PlantCounts: { [key: string]: number } }) {
        this.gridData = Uint8Array.from(gridState.gridData); // Restore Uint8Array from the saved array
        this.level3PlantCounts = gridState.level3PlantCounts;

        // Update visuals to reflect the restored data
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                // Update visual texture based on growth level
                const growthLevel = this.getCellData(row, col).growthLevel;
                const plantType = this.getCellData(row, col).plantType;
                const textureKey = `plant_${plantType.slice(-1).toLowerCase()}_${growthLevel.slice(-1)}`;
                this.plantVisuals[row][col].setTexture('plants', PLANT_TEXTURE_KEY[textureKey]);
            }
        }
    }

    public getLevel3PlantCounts() {
        return this.level3PlantCounts;
    }

    private initializeGrid() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = (row * this.cols + col) * 4;
                this.gridData[index] = Phaser.Math.Between(1, 5);       // Sun value
                this.gridData[index + 1] = Phaser.Math.Between(1, 10);  // Water value
                this.gridData[index + 2] = 0;                           // PlantType (None)
                this.gridData[index + 3] = 0;                           // GrowthLevel (N/A)
            }
        }
    }

    private createGridVisuals() {
        for (let row = 0; row < this.rows; row++) {
            const rowVisuals: Phaser.GameObjects.Rectangle[] = [];
            const rowPlants: Phaser.GameObjects.Sprite[] = [];
            for (let col = 0; col < this.cols; col++) {
                const x = col * this.cellSize + this.cellSize / 2;
                const y = row * this.cellSize + this.cellSize / 2;
                const cell = this.scene.add.rectangle(x, y, this.cellSize, this.cellSize, 0x00ff00)
                    .setStrokeStyle(1, 0x0000ff)
                    .setInteractive();
                const plant = this.scene.add.sprite(x, y, 'plants', 0).setScale(.1);
                rowVisuals.push(cell);
                rowPlants.push(plant);

                // Handle cell click
                cell.on('pointerdown', () => {
                    this.onCellClick(row, col);
                    const cellData = this.getCellData(row, col);
                    if (cellData.plantType === PLANT_TYPES[0] && this.isAdjacent(row, col)) {
                        this.plantSeed(row, col, PLANT_TYPES[Phaser.Math.Between(1, PLANT_TYPES.length - 1)]);
                        this.pushUndoStack();
                    } else if (cellData.plantType !== PLANT_TYPES[0] && cellData.growthLevel === GROWTH_LEVELS[3] && this.isAdjacent(row, col)) {
                        const index = (row * this.cols + col) * 4;
                        this.gridData[index + 2] = 0
                        this.gridData[index + 3] = 0;
                        // Update visual texture based on growth level
                        const growthLevel = this.getCellData(row, col).growthLevel;
                        const plantType = this.getCellData(row, col).plantType;
                        const textureKey = `plant_${plantType.slice(-1).toLowerCase()}_${growthLevel.slice(-1)}`;
                        this.plantVisuals[row][col].setTexture('plants', PLANT_TEXTURE_KEY[textureKey]);
                        this.pushUndoStack();
                    }
                });
            }
            this.cellVisuals.push(rowVisuals);
            this.plantVisuals.push(rowPlants);
        }
    }

    public advanceTime() {
        this.pushUndoStack();
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = (row * this.cols + col) * 4;

                // Randomize sun and water values
                this.gridData[index] = Phaser.Math.Between(1, 5);       // Sun value
                this.gridData[index + 1] += Phaser.Math.Between(3, 5); // Water adjustment

                // Grow plant if conditions are met
                if (
                    this.gridData[index + 2] !== 0 &&                       // Plant is present
                    this.gridData[index] > 3 &&                              // Plenty of sun
                    this.gridData[index + 1] > 10 &&                        // Plenty of water
                    this.gridData[index + 3] < 3                             // Growth Level < Level 3
                ) {
                    this.gridData[index + 3]++;
                    const plantType = PLANT_TYPES[this.gridData[index + 2]];
                    if (this.gridData[index + 3] === 3 && this.level3PlantCounts[plantType] !== undefined) {
                        this.level3PlantCounts[plantType]++;
                    }
                }

                // Update visual texture based on growth level
                const growthLevel = this.getCellData(row, col).growthLevel;
                const plantType = this.getCellData(row, col).plantType;
                if (growthLevel !== "N/A") {
                    if (parseInt(growthLevel.slice(-1), 10) > 1) {
                        const textureKey = `plant_${plantType.slice(-1).toLowerCase()}_${growthLevel.slice(-1)}`;
                        this.plantVisuals[row][col].setTexture('plants', PLANT_TEXTURE_KEY[textureKey]);
                    }
                }
            }
        }
        this.checkWinCondition();
    }

    // Push the current state to the undo stack
    public pushUndoStack() {
        const currentState = {
            gridData: new Uint8Array(this.gridData), // Copy the current grid data
            characterPosition: { row: characterPosition.row, col: characterPosition.col }, // Current player position
        };
    
        // Prevent duplicate states in the undo stack
        const lastState = undoStack[undoStack.length - 1];
        if (
            !lastState || // Push if the stack is empty
            lastState.characterPosition.row !== currentState.characterPosition.row ||
            lastState.characterPosition.col !== currentState.characterPosition.col || 
            !lastState.gridData.every((value, index) => value === currentState.gridData[index]) // Compare grid data
        ) {
            // Push the current state
            undoStack.push(currentState);
            redoStack.length = 0; // Clear the redo stack
            console.log(`State pushed to Undo Stack: `, currentState);
        } else {
            console.log("State not pushed: Current state matches the last state in the `undoStack`.");
        }
    }

    private onCellClick(row: number, col: number) {
        console.log(`Clicked on cell (${row}, ${col})`);
    }

    private isAdjacent(row: number, col: number): boolean {
        const dRow = Math.abs(row - characterPosition.row);
        const dCol = Math.abs(col - characterPosition.col);
        return (dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1) || (dRow === 1 && dCol === 1) || (dRow === 0 && dCol === 0);
    }

    private plantSeed(row: number, col: number, plantType: string) {
        const index = (row * this.cols + col) * 4;
        this.gridData[index + 2] = PLANT_TYPES.indexOf(plantType); // PlantType
        this.gridData[index + 3] = 1;                             // Growth Level 1
        this.plantVisuals[row][col].setTexture('plants', PLANT_TEXTURE_KEY['seedling']);
    }

    private checkWinCondition() {
        const speciesA = this.level3PlantCounts["Species A"];
        const speciesB = this.level3PlantCounts["Species B"];
        const speciesC = this.level3PlantCounts["Species C"];
        if (speciesA >= 5 && speciesB >= 5 &&- speciesC >= 5) {
            (this.scene as Play).handleWin();
        }
    }
}