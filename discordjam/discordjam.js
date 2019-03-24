var levels = window.discordJam.tutorialLevels;

var TileCodes = {
    Empty: 0,
    Wall: 1,
    SpawnPoint: 2,
    Outside: 3,
    Goal: 4,
    Vacuum: 5
}

var GameModes = {
    Tutorial: 0,
    Endless: 1
}

const SCREEN_WIDTH = 1200;
const SCREEN_HEIGHT = 800;

// TODO: explain
const MENU_SCREEN_X = 10000;
const MENU_SCREEN_Y = 10000;
const MENU_SCREEN_WIDTH = 320;
const MENU_SCREEN_HEIGHT = 240;
const MENU_START_X = MENU_SCREEN_X + MENU_SCREEN_WIDTH / 2;
const MENU_START_Y = MENU_SCREEN_Y + MENU_SCREEN_HEIGHT / 2 + 20;
const SELECTED_ITEM_X_OFFSET = 4;
const MENU_ITEM_OFFSET = 16;

const MAX_JUICE = 1000;
const JUICE_BAR_HEIGHT = 82;
const JUICE_BAR_WIDTH = 32;
const BATTERY_IMG_Y = MENU_SCREEN_Y + 80;
const JUICE_BAR_X = MENU_SCREEN_X + 4;
const JUICE_BAR_Y = BATTERY_IMG_Y + 7;

const TRANSITION_FADE_TIME = 1200;

// TODO:
const SIDE_BAR_X = MENU_SCREEN_X + MENU_SCREEN_WIDTH * (10/12);
const SIDE_BAR_Y = MENU_SCREEN_Y;
const SIDE_BAR_WIDTH = MENU_SCREEN_WIDTH * (2/12);

var DiscordJam = new Phaser.Class({

    Extends: Phaser.Scene,

    initialize: function DiscordJam () {
        Phaser.Scene.call(this, { key: 'discordjam' });

        this.debug = false;

        this.tilemap;
        this.mapSprites;
        this.cursors;
        this.playerTileCoords;
        this.canMove = false;
        this.levelIndex = 0;
        this.levelInProgress = false;
        this.endlessLevelsBeaten = 0;
        this.endlessLevelsBeatenText;
        this.endlessLevelsBeatenBG;
        this.remainingJuice;
        this.isInMenu = true;
        this.menuIndexSelected = 0;
        this.selector;
        this.gameMode;
        this.menuItemImages = [];
        this.remainingJuiceBar;
        this.onFadeCompleted;
        this.destroyOnLevelEnd = [];
        this.gameCamera;
        this.title;
        this.targetBlinderOpacity;

        this.canUseSpace = false;
        this.onContinuePressed;

        this.space;
        this.esc;
        this.enter;
    },

    preload: function () {
        this.load.spritesheet({
            key: 'walls',
            url: 'discordjam/img/walls.png',
            frameConfig: {
                frameWidth: 16,
                frameHeight: 16
            }
        });
        this.load.spritesheet({
            key: 'suck',
            url: 'discordjam/img/suck.png',
            frameConfig: {
                frameWidth: 16,
                frameHeight: 16
            }
        });
        this.load.spritesheet({
            key: 'boo',
            url: 'discordjam/img/boo.png',
            frameConfig: {
                frameWidth: 16,
                frameHeight: 16
            }
        });
        this.load.spritesheet({
            key: 'goggletutorial',
            url: 'discordjam/img/goggletutorial.png',
            frameConfig: {
                frameWidth: 49,
                frameHeight: 34
            }
        });
        this.load.spritesheet({
            key: 'vacuumtutorial',
            url: 'discordjam/img/vacuumtutorial.png',
            frameConfig: {
                frameWidth: 49,
                frameHeight: 34
            }
        });
        this.load.image('player', 'discordjam/img/player.png');
        this.load.image('vacuum', 'discordjam/img/vacuum.png');
        this.load.image('bed', 'discordjam/img/bed.png');
        this.load.image('floor', 'discordjam/img/floor.png');

        this.load.image('selector', 'discordjam/img/selector.png');
        this.load.image('tutorial', 'discordjam/img/tutorial.png');
        this.load.image('endless', 'discordjam/img/endless.png');
        this.load.image('controls', 'discordjam/img/controls.png');
        this.load.image('battery', 'discordjam/img/battery.png');
        this.load.image('title', 'discordjam/img/title.png');
        this.load.image('levelcounter', 'discordjam/img/levelcounter.png');
    },

    create: function () {
        // Listen for inputs on the arrow keys
        this.cursors = this.input.keyboard.createCursorKeys();
        this.space = this.input.keyboard.addKey('SPACE');
        this.esc = this.input.keyboard.addKey('ESC');
        this.enter = this.input.keyboard.addKey('ENTER');

        // FIXME: magic numbers
        this.add.image(SIDE_BAR_X + SIDE_BAR_WIDTH / 2, SIDE_BAR_Y + MENU_SCREEN_HEIGHT - 34, 'controls').setDepth(310);

        this.blinder = this.add.graphics({ fillStyle: { color: 0xff06151d } });

        this.createBlinder();
        this.showMenu();
        this.fadeIn();

        this.anims.create({ key: 'suckAnim', frames: this.anims.generateFrameNames('suck'), frameRate: 16, repeat: 0 });
        this.anims.create({ key: 'booAnim', frames: this.anims.generateFrameNames('boo'), frameRate: 16, repeat: 0 });
        this.anims.create({ key: 'goggletutorialAnim', frames: this.anims.generateFrameNames('goggletutorial'), frameRate: 2, repeat: -1 });
        this.anims.create({ key: 'vacuumtutorialAnim', frames: this.anims.generateFrameNames('vacuumtutorial'), frameRate: 14, repeat: -1 });
    },

    update: function (time, delta) {

        if (this.isInMenu) {

            this.handleMenuInput();

        } else {
            // Is in game

            if (Phaser.Input.Keyboard.JustDown(this.esc)) {
                this.returnToMenu();
            }

            this.handleMovementInput();

            if (this.debug) {
                this.blinder.alpha = 0;
            } else if (this.levelInProgress && this.space.isDown && this.remainingJuice > 0) {
                this.gogglesOn()
                this.setRemainingJuice(Phaser.Math.Clamp(this.remainingJuice - delta, 0, MAX_JUICE));
            } else if (this.levelInProgress) {
                this.gogglesOff();
            }

            if (Math.abs(this.targetBlinderOpacity - this.blinder.alpha) > 0.01 ) {
                this.blinder.alpha += (this.targetBlinderOpacity - this.blinder.alpha) / 4;
            } else {
                // Snap to full on or full off
                this.blinder.alpha = this.targetBlinderOpacity;
            }

            if (!this.levelInProgress && this.canUseSpace && Phaser.Input.Keyboard.JustDown(this.space)) {
                this.onContinuePressed();
            }
        }

        
    },

    clearLevel() {
        this.blinder.alpha = 0;
        this.canMove = false;
        this.tilemap = null;
        for (let i = 0; i < this.mapSprites.length; i++) {
            for (let j = 0; j < this.mapSprites[0].length; j++) {
                if (this.mapSprites[i][j]) {
                    this.mapSprites[i][j].destroy();
                }
            }
        }
        if (this.player) {
            this.player.destroy();
        }
        if (this.remainingJuiceBar) {
            this.remainingJuiceBar.destroy();
        }
        while (this.destroyOnLevelEnd.length > 0) {
            this.destroyOnLevelEnd.pop().destroy();
        }
    },

    startLevel() {
        // Initialize data layer
        this.initializeTileMap();
        // Add sprites to display
        this.createMapSprites();
        this.spawnPlayer();
        this.canMove = true;
        this.levelInProgress = true;
        this.remainingJuiceBar = this.add.graphics({ fillStyle: { color: 0xff21ca16 } });
        // Draw in front of map
        this.remainingJuiceBar.setDepth(100);
        
        this.add.image(MENU_SCREEN_X, BATTERY_IMG_Y, 'battery').setDepth(101).setOrigin(0, 0);
        this.gogglesOff();
        this.blinder.alpha = 1;

        this.setRemainingJuice(MAX_JUICE);
    },

    initializeTileMap: function () {
        // 50 tiles x 50 tiles
        // 16px / tile
        // 50 * 16 = 800px
        let dimensions = 50;
        this.tilemap = new Array(dimensions);
        this.mapSprites = new Array(dimensions);
        for (let i = 0; i < dimensions; i++) {
            this.tilemap[i] = new Array(dimensions);
            this.mapSprites[i] = new Array(dimensions);
        }
        // Initialize tiles to 'outside' tiles
        for (let i = 0; i < this.tilemap.length; i++) {
            for (let j = 0; j < this.tilemap[i].length; j++) {
                this.setTile(i, j, TileCodes.Outside);
            }
        }

        this.spawnMap();
    },

    spawnMap: function() {
        let map = this.gameMode == GameModes.Endless ?
                    window.discordJam.levelGenerator() :
                    levels[this.levelIndex].tiles;

        if (this.gameMode == GameModes.Tutorial && levels[this.levelIndex].sprite) {
            this.destroyOnLevelEnd.push(
                this.add.sprite(SIDE_BAR_X + SIDE_BAR_WIDTH / 2, SIDE_BAR_Y + MENU_SCREEN_HEIGHT / 2, levels[this.levelIndex].sprite)
                    .setDepth(1000)
                    .play(levels[this.levelIndex].sprite + 'Anim')
            );
        }
        this.makeCameraContain(map.length);
        let centerIndexX = Math.floor(this.tilemap.length / 2);
        let centerIndexY = Math.floor(this.tilemap[0].length / 2);
        let mapCenterIndexX = Math.floor(map.length / 2);
        let mapCenterIndexY = Math.floor(map[0].length / 2);
        let diffX = centerIndexX - mapCenterIndexX;
        let diffY = centerIndexY - mapCenterIndexY;
        let debug = false;
        for (let i = 0; i < map.length; i++) {
            for (let j = 0; j < map[0].length; j++) {
                if (debug) {
                    this.setTile(i, j, map[i][j]);
                } else {
                    this.setTile(i + diffX, j + diffY, map[i][j]);
                }
            }
        }
    },

    setTile: function (row, column, tileIndex) {
        this.tilemap[row][column] = tileIndex;
    },

    getTile: function (row, column) {
        return this.tilemap[row][column];
    },

    createMapSprites: function () {
        for (let i = 0; i < this.tilemap.length; i++) {
            for (let j = 0; j < this.tilemap[i].length; j++) {
                let coords = this.getSpriteLocation(i, j);
                switch (this.tilemap[i][j]) {
                    case TileCodes.Wall:
                        ;
                        this.mapSprites[i][j] = this.add.image(coords[0], coords[1], 'walls', this.getWallSpriteIndex(i, j));
                        break;
                    case TileCodes.Outside:
                        // TODO:
                        // this.mapSprites[i][j] = this.add.image(coords[0], coords[1], 'gameboyTileset', 43);
                        break;
                    case TileCodes.Goal:
                        this.mapSprites[i][j] = this.add.image(coords[0], coords[1], 'bed');
                        break;
                    case TileCodes.Vacuum:
                        this.mapSprites[i][j] = this.add.image(coords[0], coords[1], 'vacuum');
                        break;
                    case TileCodes.Empty:
                        this.mapSprites[i][j] = this.add.image(coords[0], coords[1], 'floor');
                        break;
                    default:
                        break;
                }
            }
        }
    },

    getWallSpriteIndex(row, column) {
        [above, below, left, right] = this.getAdjacentTileTypes(row, column);
        if (right && below && !left && !above) {
            return 0;
        }
        if (left && right && !above && !below) {
            // TODO: set should be more ambiguous
            return 1;
        }
        if (left && below && !right && !above) {
            return 2;
        }
        if (below && !above && !right && !left) {
            return 3;
        }
        if (above && below && !left && !right) {
            return 4;   
        }
        if (left && !right && !above && !below) {
            return 5;
        }
        if (right && !left && !above && !below) {
            return 7;
        }
        if (above && right && !left && !below) {
            return 8;
        }
        if (left && above && !right && !below) {
            return 10;
        }
        if (above && !below && !left && !right) {
            return 11;
        }
        console.error('getWallSpriteIndex: combination not handled at [' + row + '][' + column + ']');
        console.error('above: ' + above + ', below: ' + below + ', left: ' + left + ', right: ' + right);
        return 2;
    },

    getAdjacentTileTypes(row, column) {
        let above = this.getTile(row - 1, column) == TileCodes.Wall;
        let below = this.getTile(row + 1, column) == TileCodes.Wall;
        let left = this.getTile(row, column - 1) == TileCodes.Wall;
        let right = this.getTile(row, column + 1) == TileCodes.Wall;
        return [above, below, left, right];
    },

    spawnPlayer: function() {
        for (let i = 0; i < this.tilemap.length; i++) {
            for (let j = 0; j < this.tilemap[i].length; j++) {
                if (this.tilemap[i][j] == TileCodes.SpawnPoint) {
                    let coords = this.getSpriteLocation(i, j);
                    this.player = this.add.image(coords[0], coords[1], 'player');
                    this.player.setDepth(200);
                    this.playerTileCoords = [i, j];
                    this.setTile(i, j, TileCodes.Empty);
                    return;
                }
            }
        }
    },

    getSpriteLocation(row, column) {
        return [column * 16 + 8, row * 16 + 8];
    },

    handleMovementInput() {
        if (!this.canMove) { return; }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
            this.attemptMovement(-1, 0);
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
            this.attemptMovement(1, 0);
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)){
            this.attemptMovement(0, -1);
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)){
            this.attemptMovement(0, 1);
        }
    },

    attemptMovement(diffX, diffY) {
        let desiredRow = Phaser.Math.Clamp(this.playerTileCoords[0] + diffY, 0, this.tilemap.length - 1);
        let desiredColumn = Phaser.Math.Clamp(this.playerTileCoords[1] + diffX, 0, this.tilemap[0].length - 1);
        let desiredTile = this.getTile(desiredRow, desiredColumn);
        if (desiredTile == TileCodes.Empty) {
            // Success, move there
            this.movePlayerTo(desiredRow, desiredColumn);
        } else if (desiredTile == TileCodes.Goal) {
            // Reached goal
            this.movePlayerTo(desiredRow, desiredColumn);
            this.reachedGoal();
        } else if (desiredTile == TileCodes.Vacuum) {
            this.movePlayerTo(desiredRow, desiredColumn);
            this.collidedWithVacuum();
        }
    },

    movePlayerTo(desiredRow, desiredColumn) {
        this.playerTileCoords = [desiredRow, desiredColumn];
        this.updatePlayerSpritePos();
    },

    updatePlayerSpritePos() {
        let newSpritePos = this.getSpriteLocation(this.playerTileCoords[0], this.playerTileCoords[1]);
        this.player.x = newSpritePos[0];
        this.player.y = newSpritePos[1];
    },

    createBlinder() {
        var rect = new Phaser.Geom.Rectangle();
        this.blinder.clear();
        rect.width = SCREEN_HEIGHT;
        rect.height = SCREEN_HEIGHT;
        this.blinder.fillRectShape(rect);
        // Draw in front of map
        this.blinder.setDepth(100);
    },

    reachedGoal() {
        this.gogglesOn();
        this.levelInProgress = false;
        // Play BOO animation
        this.destroyOnLevelEnd.push(
            this.add.sprite(this.player.x, this.player.y, 'boo')
                .setDepth(1000)
                .play('booAnim')
        );
        // Hide actual sprite
        this.player.alpha = 0;
        this.canUseSpace = true;

        this.onContinuePressed = () => {
            this.canUseSpace = false;
            this.fadeOut(() => {
                this.clearLevel();
                if (this.gameMode == GameModes.Tutorial) {
                    if (this.levelIndex < levels.length - 1) {
                        this.levelIndex++;
                    } else {
                        // Last tutorial level, go back to menu
                        this.showMenu();
                        this.fadeIn();
                        return;
                    }
                } else {
                    // Endless mode
                    this.beatEndlessLevel();
                }
                this.startLevel();
                this.fadeIn();
            });
        };
    },

    returnToMenu() {
        this.fadeOut(() => {
            this.clearLevel();
            this.clearEndlessLevelCounter();
            this.showMenu();
            this.fadeIn();
        });
    },

    getSecondsRemainingInTimer(progress, length) {
        // The 1 + ensures we show 5, 4, 3 instead of 4, 3, 2
        // The -1 ensures that we show 5s on the first frame instead of 6
        return 1 + Math.floor(((1 - progress) * length - 1)/ 1000);
    },

    beatEndlessLevel() {
        this.endlessLevelsBeaten++;
        this.setEndlessLevelText(this.endlessLevelsBeaten);
    },

    setEndlessLevelText(newText) {
        if (this.endlessLevelsBeatenText) {
            this.endlessLevelsBeatenText.text = newText;
        }
    },

    collidedWithVacuum() {
        // Game Over!
        this.gogglesOn();
        this.levelInProgress = false;
        // Play suck animation
        this.destroyOnLevelEnd.push(
            this.add.sprite(this.player.x, this.player.y, 'suck')
                .setDepth(1000)
                .play('suckAnim')
        );
        // Hide actual sprite
        this.player.alpha = 0;
        this.canUseSpace = true;
        this.onContinuePressed = () => {
            this.canUseSpace = false;
            this.fadeOut(() => {
                this.endlessLevelsBeaten = 0;
                this.setEndlessLevelText(this.endlessLevelsBeaten);
                this.clearLevel();
                this.startLevel();
                this.fadeIn();
            })
        };
    },

    setRemainingJuice(value) {
        this.remainingJuice = value;
        this.drawJuiceBar();
    },

    handleMenuInput() {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)){
            this.setMenuIndexSelected(this.menuIndexSelected - 1);
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)){
            this.setMenuIndexSelected(this.menuIndexSelected + 1);
        }

        if (this.canUseSpace && Phaser.Input.Keyboard.JustDown(this.space)|| Phaser.Input.Keyboard.JustDown(this.enter)) {
            this.canUseSpace = false;
            switch (this.menuIndexSelected) {
                case 0: 
                    this.fadeOut(() => {
                        this.clearMenu();
                        this.gameMode = GameModes.Tutorial;
                        this.startLevel();
                        this.fadeIn();
                    });
                    break;
                case 1:
                    this.fadeOut(() => {
                        this.clearMenu();
                        this.gameMode = GameModes.Endless;
                        this.createLevelCounter();
                        this.startLevel();
                        this.fadeIn();
                    });
                    break;
                default:
                    console.error('handleMenuInput:invalid selection: ' + this.menuIndexSelected);
                    break;
            }
        }
    },

    setMenuIndexSelected(value) {
        value = Phaser.Math.Clamp(value, 0, this.menuItemImages.length - 1);
        this.menuIndexSelected = value;
        this.selector.y = MENU_START_Y + (MENU_ITEM_OFFSET * this.menuIndexSelected);
        for (let i = 0; i < this.menuItemImages.length; i++) {
            if (i === value) {
                this.menuItemImages[i].x = MENU_START_X + SELECTED_ITEM_X_OFFSET;
            } else {
                this.menuItemImages[i].x = MENU_START_X;
            }
        }
    },

    showMenu() {
        this.canUseSpace = true;
        this.menuBG = this.add.graphics({ fillStyle: { color: 0xff09191c } });
        // Draw in front of everything
        this.menuBG.setDepth(300);
        this.menuBG.fillRect(MENU_SCREEN_X, MENU_SCREEN_Y, MENU_SCREEN_WIDTH, MENU_SCREEN_HEIGHT);

        this.title = this.add.image(MENU_SCREEN_X + (MENU_SCREEN_WIDTH / 2), MENU_SCREEN_Y + 49, 'title').setDepth(310);

        this.selector = this.add.image(MENU_START_X - 4, MENU_START_Y, 'selector').setDepth(310).setOrigin(1, 0.5);
        this.menuItemImages.push(this.add.image(MENU_START_X, MENU_START_Y, 'tutorial').setDepth(310).setOrigin(0, 0.5));
        this.menuItemImages.push(this.add.image(MENU_START_X, MENU_START_Y + MENU_ITEM_OFFSET, 'endless').setDepth(310).setOrigin(0, 0.5));
        this.setMenuIndexSelected(0);
        this.isInMenu = true;

        
        if (this.gameCamera) {
            this.cameras.remove(this.gameCamera);
        }

        this.cameras.main.setZoom(SCREEN_WIDTH / MENU_SCREEN_WIDTH);
        this.cameras.main.centerOn(MENU_SCREEN_X + (MENU_SCREEN_WIDTH / 2), MENU_SCREEN_Y + (MENU_SCREEN_HEIGHT / 2));
    },

    clearMenu() {
        this.menuBG.clear();
        this.menuBG.destroy();
        this.selector.destroy();
        while (this.menuItemImages.length > 0) {
            this.menuItemImages.pop().destroy();
        }
        this.title.destroy();
        this.isInMenu = false;
    },

    drawJuiceBar() {
        this.remainingJuiceBar.clear();
        let colour;
        
        if (this.remainingJuice / MAX_JUICE > 0.7) {
            colour = 0xff21ca16;
        } else if (this.remainingJuice / MAX_JUICE > 0.4) {
            colour = 0xff9ebe03;
        } else {
            colour = 0xffa56900;
        }
        this.remainingJuiceBar.fillStyle(colour);
        let height = (this.remainingJuice / MAX_JUICE) * JUICE_BAR_HEIGHT;
        this.remainingJuiceBar.fillRect(JUICE_BAR_X, JUICE_BAR_Y + JUICE_BAR_HEIGHT - height, JUICE_BAR_WIDTH, height);
    },

    fadeIn() {
        this.cameras.main.fadeIn(TRANSITION_FADE_TIME / 2);
        if (this.gameCamera) {
            this.gameCamera.fadeIn(TRANSITION_FADE_TIME / 2);
        }
    },

    fadeOut(onFadeCompleted) {

        this.cameras.main.once('camerafadeoutcomplete', (camera) => {
            onFadeCompleted();
            this.fadeIn();
        }, this);

        this.cameras.main.fadeOut(TRANSITION_FADE_TIME);
        if (this.gameCamera) {
            this.gameCamera.fadeOut(TRANSITION_FADE_TIME);
        }
    },

    makeCameraContain(dimensions) {
        if (this.gameCamera) {
            this.cameras.remove(this.gameCamera);
        }
        this.gameCamera = this.cameras.add((SCREEN_WIDTH - SCREEN_HEIGHT) / 2, 0, SCREEN_HEIGHT, SCREEN_HEIGHT);
        let visibleMapHeight = (dimensions + 2) * 16;
        this.gameCamera.setZoom(SCREEN_HEIGHT / visibleMapHeight);
    },

    gogglesOn() {
        this.targetBlinderOpacity = 0;
    },

    gogglesOff() {
        this.targetBlinderOpacity = 1;
    },

    createLevelCounter() {
        this.endlessLevelsBeatenBG = this.add.image(SIDE_BAR_X + SIDE_BAR_WIDTH / 2, SIDE_BAR_Y + MENU_SCREEN_HEIGHT / 2, 'levelcounter').setDepth(200);
        this.endlessLevelsBeatenText = this.add.text(SIDE_BAR_X + SIDE_BAR_WIDTH / 2 - 5, SIDE_BAR_Y + MENU_SCREEN_HEIGHT / 2, 0).setDepth(201);
    },

    clearEndlessLevelCounter() {
        if (this.endlessLevelsBeatenBG) {
            this.endlessLevelsBeatenBG.destroy();
            this.endlessLevelsBeatenBG = null;
        }
        if (this.endlessLevelsBeatenText) {
            this.endlessLevelsBeatenText.destroy();
            this;endlessLevelsBeatenText = null;
        }
    }
});

var config = {
    type: Phaser.AUTO,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    parent: 'phaser-example',
    scene: [ DiscordJam ],
    physics: {
        default: 'arcade'
    },
    pixelArt: true,
    backgroundColor: 0xff06151d
};

var game = new Phaser.Game(config);