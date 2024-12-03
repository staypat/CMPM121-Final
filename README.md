# CMPM121-Final
# Devlog Entry - [11/27/2024]
## How we satisfied the software requirements
[F1.a] The important state of our game's grid is backed by a single continuous byte array in Array of Structures format. It is Uint8Array called "gridData" that holds the grid's sun levels, water levels, plant type, and growth level. Each part of our
game's grid state is a number so it only takes 1 byte * 4 to hold the data of one grid cell.
![F1.a data structure diagram](./f1_a_diagram.png.png)

[F1.b] We have saveGame() and loadGame() functions that save and load grid data, player position, turn counter, win condition, undo stack, and redo stack. It loads serialized data from grid data that allows us to keep track of our game better from a saved state. The player can click one of the three save/load slots on the bottom of the UI to save/load the game.

[F1.c] We have loadAutoSave() and autoSaveGame() functions that stringify and parse the game state which contains our grid data, player position, turn counter, and win condition. These functions are run every time the player presses 'Next Turn' and every 30 seconds so that the game will auto-save during the important parts of gameplay. We also have a 'beforeunload' event listener to auto-save the game when the browser closes. Similarly, if the local storage contains an auto-save item, the game will ask the player if they want to resume where they were.

[F1.d] We have a primary pushUndoStack() function that saves the current game state and pushes a game state into an undo/redo stack. These stacks are also maintained inside the saveGame() and loadGame() function so players can revert their choices in their saved games. All major actions (moving, planting, harvesting, advancing turn) utilize the pushUndoStack() function which signifies that this action is undoable.

[F0.a-g] Same as last week

## Reflection
Initially, we wanted to focus on adjusting UI so the player could receive better feedback, but the F1 requirements focused on player accessibility so we shifted our focus towards making sure players had the quality of life features: save slots and undo system. We dedicated more time towards creating this rather than creating a more cohesive user experience. In the future, we plan on addressing this issue so that a new user is familiar with what they need to do in the game. We also noticed that a lot of our code is clumped, so we took some time to refactor the code so that some functions aren't completely reliant on others. We will continue to refactor our code as we work on it.

# Devlog Entry - [11/21/2024]
## How we satisfied the software requirements
[F0.a] We created a grid class with a private createGrid() method to initialize our grid cells which also contain information about the sun and water levels. The character is represented by a red square and moves when the player presses an arrow key. Its position is tracked in our update function as this information is needed to display our grid cell data.

[F0.b] We have a 'Next Turn' button that advances time by increasing the water level by a certain amount and resetting the sun level to a random value. This is the only way time passes and plants can grow to a higher level.

[F0.c] When the player moves around the grid, they are limited to interacting with adjacent cells to reap or sow plants. They can sow plants by left-clicking on a space next to them. Similarly, when plants are level 3, they can left-click the plant to reap them.

[F0.d] When players walk over a grid cell, they are presented with how much sun and water levels are in the cell. When the player presses the 'Next Turn' button, the water level will increase by a random amount while the sun level will be randomly reset to a new number. The sun will be used immediately to level up the plant if there is sufficient sun and water at the same time, otherwise, the sun level will be lost.

[F0.e] When the player sows plants, each plant will be given a random species type (A, B, C). Each plant starts at level 1 and is represented by a yellow color. When each plant has enough sun and water to level up, they will turn blue and purple to represent level 2 and level 3 respectively. 

[F0.f] The growth level of each plant is determined by how much sun and water the plant has at the time the player presses the "Next Turn" button. If the plant has at least 3 sun and 10 water, the plant will level up.

[F0.g] The game's win condition occurs when the player has 5 of each species plant at level 3. We implemented this by checking each plant's state after time is advanced. Once the win condition is met, the player is given a win screen and the 'Next Turn' button is replaced with a 'Restart' button.

## Reflection
Initially, our team wanted to create a tower defense game where turns were determined by a planning phase and a fighting phase. However, we realized the fighting phase was going to be an autobattler and it would be out of scope given the time we had to work. We decided to change our game to a gardening game with a space theme that we will work on during polishing since we wanted to focus on getting the primary mechanics down first before devoting more time to asset creation. During our integration with GitHub pages, we also ran into the problem of the website being unable to read TypeScript which was the language we started with. We had to work around this by getting a transcompiler to convert the TypeScript into JavaScript so our page could render.

# Devlog Entry - [11/14/2024]
## Introducing the team

Tools Lead: Frank Shi

Engine Lead: Brady Lin

Engine Assistant: Edwin Fong

Design Lead: Patrick Hu

Design Assistant: Jackie Huang


## Tools and materials

Our team is planning on using the Phaser framework with Typescript for our project. We chose to work with the Phaser framework because we all have
experience using it from CMPM-120. Phaser also builds on the Javascript language and library, which has some ties with 
the Typescript language we've been practicing in CMPM-121.

We're planning to use Typescript, JSON, and HTML for our project. We chose to use these tools because we've been practicing using them
for the majority of the class. These tools are a necessity for creating a well-functioning website, which was another big reason why we 
chose to use them.

The main IDE we're all going to be using is Visual Studio Code and the live server extension built into VSCode. As for the image editor, 
we're planning on using Aseprite and Tiled to create our game's visual assets. The main reason why we chose to use these tools is
because of prior experience using them from CMPM-120.

Our main alternate platform would be transitioning to using Javascript instead of Typescript, but still using the Phaser framework.

## Outlook

We want to try including procedural audio in our game, as well as original music and sound effects. We also want to attempt
to create a more customizable experience for the player in the form of an options menu, as well as giving the player more
accessibility options such as cross-platorm, color blindness mode, subtitles, high-contrast mode, voice narration, and adjustable difficulty levels.

Our main concern is not being able to use certain interfaces for our project.

We're hoping to make our project adaptable and continue to polish our Javascript and Typescript skills. On top of that, we're
hoping to keep our code maintainable.
