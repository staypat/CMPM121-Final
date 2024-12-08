// Game parameters
const NUM_ROWS = 15;
const NUM_COLS = 20;
const CELL_SIZE = 40;
let PLANT_TYPES = ["None", "Species A", "Species B", "Species C"];
let GROWTH_LEVELS = ["N/A", "Level 1", "Level 2", "Level 3"];
const PLANT_TEXTURE_KEY = {
    empty: 0,       // Empty patch
    seedling: 8,    // Shared 1st growth stage
    plant_a_2: 1,   // Plant A, 2nd growth stage
    plant_a_3: 2,   // Plant A, 3rd growth stage
    plant_b_2: 5,   // Plant B, 2nd growth stage
    plant_b_3: 6,   // Plant B, 3rd growth stage
    plant_c_2: 9,   // Plant C, 2nd growth stage
    plant_c_3: 10,  // Plant C, 3rd growth stage
};
let character;
const characterPosition = { row: 0, col: 0 };
let cursors;
const MOVE_COOLDOWN = 250;
let lastMoveTime = 0;
let turnCounter = 0;
let popupText = null;
let activeCell = null;
const undoStack = [];
const redoStack = [];
let currentLanguage = 'en'; // Default language is English
let buttonsCreated = false;

import * as yaml from 'js-yaml';
export class Play extends Phaser.Scene {
    grid;
    hasWon = false;

    constructor() {
        super("Play");
    }

    // Step 2: Add setLanguage() method here
    setLanguage(languageCode) {
        const translations = this.cache.json.get(languageCode);
        if (translations) {
            this.localization = translations; // Update the localization object
            this.refreshTexts();            // Update all the text
            PLANT_TYPES = translations.plantTypes || PLANT_TYPES;
            GROWTH_LEVELS = translations.growthLevels || GROWTH_LEVELS;
            console.log(`Language switched to: ${languageCode}`);
        } else {
            console.error(`Failed to load language: ${languageCode}`);
        }
    }

    // Add the refreshTexts method (next section) here
    refreshTexts() {
        const nextTurnButton = document.querySelector('.next-turn-button');
        nextTurnButton.innerText = this.localization.nextTurn || "Next Turn";
        const undoButton = document.querySelector('.undo-button');
        undoButton.innerText = this.localization.undo || "Undo";
        const redoButton = document.querySelector('.redo-button');
        redoButton.innerText = this.localization.redo || "Redo";
        const saveSlot1Button = document.querySelector('.save-button1');
        saveSlot1Button.innerText = this.localization.saveSlot.replace("{slot}", 1) || "Save Slot 1";
        const saveSlot2Button = document.querySelector('.save-button2');
        saveSlot2Button.innerText = this.localization.saveSlot.replace("{slot}", 2) || "Save Slot 2";
        const saveSlot3Button = document.querySelector('.save-button3');
        saveSlot3Button.innerText = this.localization.saveSlot.replace("{slot}", 3) || "Save Slot 3";
        const loadSlot1Button = document.querySelector('.load-button1');
        loadSlot1Button.innerText = this.localization.loadSlot.replace("{slot}", 1) || "Save Slot 1";
        const loadSlot2Button = document.querySelector('.load-button2');
        loadSlot2Button.innerText = this.localization.loadSlot.replace("{slot}", 2) || "Save Slot 2";
        const loadSlot3Button = document.querySelector('.load-button3');
        loadSlot3Button.innerText = this.localization.loadSlot.replace("{slot}", 3) || "Save Slot 3";
        const autoSaveButton = document.querySelector(".auto-save-button");
        autoSaveButton.innerText = this.localization.autoSaveMessage || "Continue from last auto-save?"; // Set button text
    
        // Update Save/Load buttons
        this.refreshSaveLoadButtonsText();

        // Refresh Auto-Save message
        this.refreshAutoSaveMessage();

        // Refresh popup text (recreates the popup with updated language)
        this.updatePopup();
    
        // Popup text
        if (popupText && activeCell) {
            popupText.setText(
                `${this.localization.popup?.sun || "Sun"}: ${activeCell.sun}, ${this.localization.popup?.water || "Water"}: ${activeCell.water}\n` +
                `${this.localization.popup?.plant || "Plant"}: ${activeCell.plantType}, ${this.localization.popup?.growth || "Growth"}: ${activeCell.growthLevel}`
            );
        }
    }

    refreshAutoSaveMessage() {
        if (this.autoSaveMessage && this.localization) {
            const message = this.localization.autoSaveMessage || "Continue from last auto-save?";
            this.autoSaveMessage.setText(message);
        }
    }

    preload() {
        //international languages
        this.load.json('en', './assets/en.json'); //english
        this.load.json('zh', './assets/zh.json'); //chinese
        this.load.json('ar', './assets/ar.json'); //arabic

        this.load.spritesheet('plants', '/CMPM121-Final/assets/reap_sow_tilesheet.png', {
            frameWidth: CELL_SIZE * 10, // Width of each tile
            frameHeight: CELL_SIZE * 10, // Height of each tile
        });
        this.load.image('player', '/CMPM121-Final/assets/astronaut.png');
        const url = '/CMPM121-Final/assets/scenarios/level1.yaml';
        console.log('Loading level file from:', url);
        this.load.text('level1', url);
    }


    create() {
        // Add key listeners for switching languages
        this.input.keyboard.on('keydown-L', () => {
            // cycle through languages
            if (currentLanguage === 'en') {
                currentLanguage = 'zh';
                this.setLanguage('zh');
            } else if (currentLanguage === 'zh') {
                currentLanguage = 'ar';
                this.setLanguage('ar');
            } else {
                currentLanguage = 'en';
                this.setLanguage('en');
            }
        });

        // Initialize game state
        this.grid = new Grid(this, NUM_ROWS, NUM_COLS, CELL_SIZE);
        character = this.add.sprite(CELL_SIZE / 2, CELL_SIZE / 2, 'player').setScale(.1);
        if (this.input.keyboard) {
            cursors = this.input.keyboard.createCursorKeys();
        } else {
            console.error('Keyboard input is not available.');
        }
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

        if (buttonsCreated == false) {
            this.addSaveLoadUI();
            buttonsCreated = true;
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
        this.setLanguage('en');
    }


    update(time) {
        // Only handle input if the cooldown period has expired and no tween is running
        let isMoving = false;
        if (time >= lastMoveTime + MOVE_COOLDOWN && !isMoving) {
            let hasMoved = false;

    
            // Handle player movement inputs
            if (cursors.up.isDown && characterPosition.row > 0) {
                this.grid.pushUndoStack();
                characterPosition.row--;
                hasMoved = true;
            } else if (cursors.down.isDown && characterPosition.row < NUM_ROWS - 1) {
                this.grid.pushUndoStack();
                characterPosition.row++;
                hasMoved = true;
            } else if (cursors.left.isDown && characterPosition.col > 0) {
                this.grid.pushUndoStack();
                characterPosition.col--;
                character.flipX = true;
                hasMoved = true;
            } else if (cursors.right.isDown && characterPosition.col < NUM_COLS - 1) {
                this.grid.pushUndoStack();
                characterPosition.col++;
                character.flipX = false;
                hasMoved = true;
            }
    
            if (hasMoved) {    
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

    updatePopup() {
        const currentCell = this.grid.getCellData(characterPosition.row, characterPosition.col);
    
        // Only proceed if the active cell changes
        if (activeCell !== currentCell) {
            activeCell = currentCell; // Update the tracked cell
    
            // Use the stats div to display the popup text
            const statsDiv = document.getElementById('stats'); // Select the stats div
    
            // Clear existing text
            statsDiv.innerHTML = ''; // Clear the existing content
    
            // Generate the translated popup text
            const popupLocalization = this.localization?.popup || {
                sun: "Sun",
                water: "Water",
                plant: "Plant",
                growth: "Growth",
            };
    
            // Create a new div for the popup text
            const popupTextElement = document.createElement("div");
            popupTextElement.style.color = "#ffffff"; // Set text color, adjust as necessary
            popupTextElement.innerText = `${popupLocalization.sun}: ${currentCell.sun}, ` +
                `${popupLocalization.water}: ${currentCell.water}\n` +
                `${popupLocalization.plant}: ${currentCell.plantType}, ` +
                `${popupLocalization.growth}: ${currentCell.growthLevel}`;
    
            // Append the newly created popup text element to the stats div
            statsDiv.appendChild(popupTextElement);
        }
    }

    nextTurn() {
        turnCounter++;
        this.grid.advanceTime();
        this.autoSaveGame(); // Auto-save after each turn
    }

    handleWin() {
        this.hasWon = true;
        localStorage.removeItem("AutoSave"); // Clear auto-save on win
    
        // Create container for win message and restart button
        const gameView = document.getElementById('gameView'); // Get the gameView div
        const winContainer = document.createElement("div");
        winContainer.className = 'win-container';
    
        // Create win message
        const winMessage = document.createElement("div");
        winMessage.innerText = this.localization.winMessage || "You Win!"; // Localized win message
        winContainer.appendChild(winMessage); // Add win message to container
    
        // Create a Restart button
        const restartButton = document.createElement("button");
        restartButton.innerText = this.localization.restart || "Restart"; // Localize Restart button text
        restartButton.className = 'restart-button'; // Class for styling
        restartButton.onclick = () => {
            this.scene.restart(); // Restart the game when clicked
            winContainer.remove(); // Remove the win container after action
        };
    
        // Append the restart button to the win container
        winContainer.appendChild(restartButton);
        
        // Append the winContainer to the gameView div
        
        gameView.appendChild(winContainer); // Add the win container to the game view
    }

    saveGame(slotName) {
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

    loadGame(slotName) {
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
        gameState.undoStack.forEach((state) => {
            undoStack.push({
                gridData: Uint8Array.from(state.gridData),
                characterPosition: { ...state.characterPosition },
            });
        });
        gameState.redoStack.forEach((state) => {
            redoStack.push({
                gridData: Uint8Array.from(state.gridData),
                characterPosition: { ...state.characterPosition },
            });
        });
    
        console.log(`Game loaded from slot: ${slotName}`);
        console.log("Undo Stack:", undoStack);
        console.log("Redo Stack:", redoStack);
    }

    addSaveLoadUI() {
        // Get the savesButtonContainer
        const lsbuttonContainer = document.getElementById('savesButtonContainer');
        const actionsbuttonContainer = document.getElementById('actions');
    
        // Track Save/Load buttons for translation
        this.saveLoadButtons = [];
    
        // Save Slot 1 Button
        const saveSlot1Button = document.createElement("button");
        saveSlot1Button.innerText = "Save Slot 1";
        saveSlot1Button.className = 'save-button1';
        saveSlot1Button.onclick = () => this.saveGame("SaveSlot1");
        lsbuttonContainer.appendChild(saveSlot1Button);
    
        // Load Slot 1 Button
        const loadSlot1Button = document.createElement("button");
        loadSlot1Button.innerText = "Load Slot 1";
        loadSlot1Button.className = 'load-button1';
        loadSlot1Button.onclick = () => this.loadGame("SaveSlot1");
        lsbuttonContainer.appendChild(loadSlot1Button);
    
        // Save Slot 2 Button
        const saveSlot2Button = document.createElement("button");
        saveSlot2Button.innerText = "Save Slot 2";
        saveSlot2Button.className = 'save-button2';
        saveSlot2Button.onclick = () => this.saveGame("SaveSlot2");
        lsbuttonContainer.appendChild(saveSlot2Button);
    
        // Load Slot 2 Button
        const loadSlot2Button = document.createElement("button");
        loadSlot2Button.innerText = "Load Slot 2";
        loadSlot2Button.className = 'load-button2';
        loadSlot2Button.onclick = () => this.loadGame("SaveSlot2");
        lsbuttonContainer.appendChild(loadSlot2Button);
    
        // Save Slot 3 Button
        const saveSlot3Button = document.createElement("button");
        saveSlot3Button.innerText = "Save Slot 3";
        saveSlot3Button.className = 'save-button3';
        saveSlot3Button.onclick = () => this.saveGame("SaveSlot3");
        lsbuttonContainer.appendChild(saveSlot3Button);
    
        // Load Slot 3 Button
        const loadSlot3Button = document.createElement("button");
        loadSlot3Button.innerText = "Load Slot 3";
        loadSlot3Button.className = 'load-button3';
        loadSlot3Button.onclick = () => this.loadGame("SaveSlot3");
        lsbuttonContainer.appendChild(loadSlot3Button);

        // Add undo button
        const undoButton = document.createElement("button");
        undoButton.innerText = "Undo";
        undoButton.className = 'undo-button';
        undoButton.onclick = () => {
            if (undoStack.length !== 0) {
                const undoState = undoStack.pop();
                redoStack.push({
                    gridData: new Uint8Array(this.grid.getSerializedData().gridData),
                    characterPosition: { row: characterPosition.row, col: characterPosition.col },
                });
                if (undoState) {
                    this.grid.loadSerializedData({
                        gridData: Array.from(undoState?.gridData || []),
                        level3PlantCounts: this.grid.getLevel3PlantCounts()
                    });
                }
                if (undoState) {
                    characterPosition.row = undoState.characterPosition.row;
                    characterPosition.col = undoState.characterPosition.col;
                }
                character.x = characterPosition.col * CELL_SIZE + CELL_SIZE / 2;
                character.y = characterPosition.row * CELL_SIZE + CELL_SIZE / 2;
            }
        };
        actionsbuttonContainer.appendChild(undoButton);
        
        // Add Next Turn Button
        const nextTurnButton = document.createElement("button");
        nextTurnButton.innerText = "Next Turn";
        nextTurnButton.className = 'next-turn-button';
        nextTurnButton.onclick = () => this.nextTurn();
        actionsbuttonContainer.appendChild(nextTurnButton);

        // Add Redo Button
        const redoButton = document.createElement("button");
        redoButton.innerText = "Redo";
        redoButton.className = 'redo-button';
        redoButton.onclick = () => {
            if (redoStack.length !== 0) {
                undoStack.push({
                    gridData: new Uint8Array(this.grid.getSerializedData().gridData),
                    characterPosition: { row: characterPosition.row, col: characterPosition.col },
                });
                const redoState = redoStack.pop();
                if (redoState) {
                    this.grid.loadSerializedData({
                        gridData: Array.from(redoState?.gridData || []),
                        level3PlantCounts: this.grid.getLevel3PlantCounts()
                    });
                }
                if (redoState) {
                    characterPosition.row = redoState.characterPosition.row;
                    characterPosition.col = redoState.characterPosition.col;
                }
                character.x = characterPosition.col * CELL_SIZE + CELL_SIZE / 2;
                character.y = characterPosition.row * CELL_SIZE + CELL_SIZE / 2;
            }
        };
        actionsbuttonContainer.appendChild(redoButton);

        // You can add more button styles or classes as needed here.
        this.refreshSaveLoadButtonsText();

        // Check if an auto-save exists, then create the message
        if (localStorage.getItem("AutoSave")) {
            const autoSaveButton = document.createElement("button");
            autoSaveButton.innerText = "Continue from last auto-save?"; // Set button text
            autoSaveButton.className = 'auto-save-button'; // Add styling class for the button
            
            // Add click event to load the auto-save
            autoSaveButton.onclick = () => {
                this.loadAutoSave(); // Replace with your actual loadAutoSave method
                autoSaveButton.remove(); // Remove the button after action
            };

            lsbuttonContainer.appendChild(autoSaveButton);
        }
    }

    refreshSaveLoadButtonsText() {
        if (!this.saveLoadButtons || !this.localization) return;
    
        this.saveLoadButtons.forEach(({ type, slot, button }) => {
            const textKey = type === "save" ? "saveSlot" : "loadSlot";
            const translatedText = this.localization[textKey]?.replace("{slot}", slot) || `${type} Slot ${slot}`;
            button.setText(translatedText);
        });
    }

    autoSaveGame() {
        const gameState = {
            gridData: this.grid.getSerializedData(),
            characterPosition,
            turnCounter,
            level3PlantCounts: this.grid.getLevel3PlantCounts(),
        };
        localStorage.setItem("AutoSave", JSON.stringify(gameState));
        console.log("Game auto-saved.");
    }

    loadAutoSave() {
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
    scene;
    rows;
    cols;
    cellSize;
    gridData;
    cellVisuals;
    plantVisuals;
    level3PlantCounts;

    constructor(scene, rows, cols, cellSize) {
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
    getCellData(row, col) {
        const index = (row * this.cols + col) * 4;
        return {
            sun: this.gridData[index], // Sunlight value
            water: this.gridData[index + 1], // Water value
            plantType: PLANT_TYPES[this.gridData[index + 2]], // Convert plantType index to string
            growthLevel: GROWTH_LEVELS[this.gridData[index + 3]], // Convert growthLevel index to string
        };
    }

    // Serialize all grid data (used for saving and loading)
    getSerializedData() {
        return {
            gridData: Array.from(this.gridData), // Convert Uint8Array to a regular array
            level3PlantCounts: this.level3PlantCounts,
        };
    }

    // Load and apply serialized data to the grid
    loadSerializedData(gridState) {
        this.gridData = Uint8Array.from(gridState.gridData);
        this.level3PlantCounts = gridState.level3PlantCounts;
    
        // Update visuals to reflect the restored data
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = (row * this.cols + col) * 4;
    
                const plantTypeIndex = this.gridData[index + 2];
                const growthLevelIndex = this.gridData[index + 3];
    
                // Validate indices
                if (plantTypeIndex < 0 || plantTypeIndex >= PLANT_TYPES.length) continue; // Skip invalid types
                const plantType = PLANT_TYPES[plantTypeIndex];
    
                if (growthLevelIndex < 0 || growthLevelIndex >= GROWTH_LEVELS.length) continue; // Skip invalid levels
                const growthLevel = GROWTH_LEVELS[growthLevelIndex];
    
                let textureKey;
                if (plantType === "None" || growthLevel === "N/A") {
                    textureKey = 'empty'; // No plant
                } else if (growthLevel === "Level 1") {
                    textureKey = 'seedling'; // Any species at Level 1
                } else if (growthLevel === "Level 2") {
                    textureKey = `plant_${plantType.slice(-1).toLowerCase()}_2`; // Specific species for Level 2
                } else { // Level 3
                    textureKey = `plant_${plantType.slice(-1).toLowerCase()}_3`; // Specific species for Level 3
                }
    
                // Set the visual based on the restored state
                this.plantVisuals[row][col].setTexture('plants', PLANT_TEXTURE_KEY[textureKey]);
            }
        }
    }

    getLevel3PlantCounts() {
        return this.level3PlantCounts;
    }

    initializeGrid() {
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

    createGridVisuals() {
        for (let row = 0; row < this.rows; row++) {
            const rowVisuals = [];
            const rowPlants = [];
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

    advanceTime() {
        this.pushUndoStack();
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = (row * this.cols + col) * 4;
                this.gridData[index] = Phaser.Math.Between(1, 5); // Update sun value
                this.gridData[index + 1] += Phaser.Math.Between(2, 3); // Update water value
                const cellData = this.getCellData(row, col); // Retrieve data for this cell
                const plantType = cellData.plantType;

                // Skip empty cells
                if (plantType === "None") continue;

                // Retrieve growth rules for this plant type
                const rules = PlantDSL[plantType]?.growthRules;
                if (!rules || rules.length === 0) continue;

                // Check if all growth rules are satisfied
                const satisfiesRules = rules.every(rule => rule(cellData, this, row, col));

                if (satisfiesRules && cellData.growthLevel !== "Level 3") {
                    // Increment growth level
                    this.gridData[index + 3]++;
    
                    const newGrowthLevel = GROWTH_LEVELS[this.gridData[index + 3]];
                    console.log(`${plantType} in (${row}, ${col}) grew to ${newGrowthLevel}`);
    
                    // Update visuals
                    const textureKey = `plant_${plantType.slice(-1).toLowerCase()}_${newGrowthLevel.slice(-1)}`;
                    this.plantVisuals[row][col].setTexture('plants', PLANT_TEXTURE_KEY[textureKey]);
    
                    // Update Level 3 counts if applicable
                    if (newGrowthLevel === "Level 3" && this.level3PlantCounts[plantType] !== undefined) {
                        this.level3PlantCounts[plantType]++;
                    }
                }
            }
        }
        this.checkWinCondition();
    }

    // Push the current state to the undo stack
   pushUndoStack() {
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

    onCellClick(row, col) {
        console.log(`Clicked on cell (${row}, ${col})`);
    }

    isAdjacent(row, col) {
        const dRow = Math.abs(row - characterPosition.row);
        const dCol = Math.abs(col - characterPosition.col);
        return (dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1) || (dRow === 1 && dCol === 1) || (dRow === 0 && dCol === 0);
    }

    plantSeed(row , col , plantType) {
        this.pushUndoStack();
        const index = (row * this.cols + col) * 4;
        this.gridData[index + 2] = PLANT_TYPES.indexOf(plantType); // PlantType
        this.gridData[index + 3] = 1;                             // Growth Level 1
        this.plantVisuals[row][col].setTexture('plants', PLANT_TEXTURE_KEY['seedling']);
    }

    checkWinCondition() {
        const speciesA = this.level3PlantCounts["Species A"];
        const speciesB = this.level3PlantCounts["Species B"];
        const speciesC = this.level3PlantCounts["Species C"];
        console.log(this.level3PlantCounts);
        if (speciesA >= 5 && speciesB >= 5 && speciesC >= 5) {
            this.scene.handleWin();
        }
    }

    getNeighborCells(row, col) {
        const directions = [
            { dRow: -1, dCol: 0 },  // Up
            { dRow: 1, dCol: 0 },   // Down
            { dRow: 0, dCol: -1 },  // Left
            { dRow: 0, dCol: 1 },   // Right
            { dRow: -1, dCol: -1 }, // Top-left diagonal
            { dRow: -1, dCol: 1 },  // Top-right diagonal
            { dRow: 1, dCol: -1 },  // Bottom-left diagonal
            { dRow: 1, dCol: 1 }    // Bottom-right diagonal
        ];
    
        return directions
            .map(dir => {
                const nRow = row + dir.dRow;
                const nCol = col + dir.dCol;
                if (nRow >= 0 && nRow < this.rows && nCol >= 0 && nCol < this.cols) {
                    return this.getCellData(nRow, nCol); // Valid neighbor
                }
                return null; // Out of bounds
            })
            .filter(cell => cell !== null); // Filter nulls
    }
}

/**
 * @typedef {Object} CellData
 * @property {number} sun
 * @property {number} water
 * @property {string} plantType
 * @property {string} growthLevel
 */

/**
 * @typedef {function(CellData, Grid, number, number): boolean} GrowthRule
 */

export const PlantDSL = {
    "Species A": {
        // Rule: Grows if sun > 3 and water > 8
        growthRules: [
            (cell) => cell.sun > 3,
            (cell) => cell.water > 8
        ]
    },
    "Species B": {
        // Rule: Grows if sun <= 3 or has a neighboring plant
        growthRules: [
            (cell) => cell.sun <= 3,
            (_cell, grid, row, col) => {
                const neighbors = grid.getNeighborCells(row, col);
                return neighbors.some(n => n.plantType !== "None");
            }
        ]
    },
    "Species C": {
        // Rule: Grows if water >= 5, sun >= 2, and no neighbors
        growthRules: [
            (cell) => cell.water >= 5 && cell.sun >= 2,
            (_cell, grid, row, col) => {
                const neighbors = grid.getNeighborCells(row, col);
                return neighbors.every(n => n.plantType === "None");
            }
        ]
    }
};

console.log(PlantDSL["Species A"]);
console.log(PlantDSL["Species B"]);
console.log(PlantDSL["Species C"]);
