# CMPM121-Final
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
