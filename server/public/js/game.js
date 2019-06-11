var config = {
  type: Phaser.AUTO,
  parent: "phaser-example",
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

var game = new Phaser.Game(config);

function preload() {
  this.load.image("star", "assets/star.png");
  this.load.image("otherPlayer", "assets/bomb.png");
  this.load.image("sky", "assets/sky.png");
  this.load.image("ground", "assets/platform.png");
  this.load.spritesheet("dude", "assets/dude.png", {
    frameWidth: 32,
    frameHeight: 48
  });
}

function create() {
  this.add.image(400, 300, "sky");
  var self = this;
  this.socket = io();
  this.players = this.physics.add.group();

  this.platforms = this.physics.add.staticGroup();

  this.platforms
    .create(400, 568, "ground")
    .setScale(2)
    .refreshBody();

  this.platforms.create(300, 400, "ground");
  this.platforms.create(50, 250, "ground");
  this.platforms.create(750, 220, "ground");

  this.blueScoreText = this.add.text(16, 16, "", {
    fontSize: "32px",
    fill: "#0000FF"
  });
  this.redScoreText = this.add.text(584, 16, "", {
    fontSize: "32px",
    fill: "#FF0000"
  });

  this.anims.create({
    key: "left",
    frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });

  this.anims.create({
    key: "turn",
    frames: [{ key: "dude", frame: 4 }],
    frameRate: 20
  });

  this.anims.create({
    key: "right",
    frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });

  this.socket.on("currentPlayers", function(players) {
    Object.keys(players).forEach(function(id) {
      if (players[id].playerId === self.socket.id) {
        displayPlayers(self, players[id], "dude");
      } else {
        displayPlayers(self, players[id], "dude");
      }
    });
  });

  this.socket.on("newPlayer", function(playerInfo) {
    displayPlayers(self, playerInfo, "otherPlayer");
  });

  this.socket.on("disconnect", function(playerId) {
    self.players.getChildren().forEach(function(player) {
      if (playerId === player.playerId) {
        player.destroy();
      }
    });
  });

  this.socket.on("playerUpdates", function(players) {
    Object.keys(players).forEach(function(id) {
      self.players.getChildren().forEach(function(player) {
        if (players[id].playerId === player.playerId) {
          player.setPosition(players[id].x, players[id].y);
          if (players[id].input.left) {
            player.anims.play("left", true);
          } else if (players[id].input.right) {
            player.anims.play("right", true);
          } else {
            player.anims.play("turn");
          }
        }
      });
    });
  });
  this.cursors = this.input.keyboard.createCursorKeys();

  this.socket.on("updateScore", function(scores) {
    self.blueScoreText.setText("Blue: " + scores.blue);
    self.redScoreText.setText("Red: " + scores.red);
  });

  this.socket.on("starLocation", function(starLocation) {
    if (!self.star) {
      self.star = self.add.image(starLocation.x, starLocation.y, "star");
    } else {
      self.star.setPosition(starLocation.x, starLocation.y);
    }
  });
  this.leftKeyPressed = false;
  this.rightKeyPressed = false;
  this.upKeyPressed = false;
}

function update() {
  const left = this.leftKeyPressed;
  const right = this.rightKeyPressed;
  const up = this.upKeyPressed;

  if (this.cursors.left.isDown) {
    this.leftKeyPressed = true;
  } else if (this.cursors.right.isDown) {
    this.rightKeyPressed = true;
  } else {
    this.leftKeyPressed = false;
    this.rightKeyPressed = false;
  }

  if (this.cursors.up.isDown) {
    this.upKeyPressed = true;
  } else {
    this.upKeyPressed = false;
  }

  if (
    left !== this.leftKeyPressed ||
    right !== this.rightKeyPressed ||
    up !== this.upKeyPressed
  ) {
    this.socket.emit("playerInput", {
      left: this.leftKeyPressed,
      right: this.rightKeyPressed,
      up: this.upKeyPressed
    });
  }
}

function displayPlayers(self, playerInfo, sprite) {
  const player = self.add
    .sprite(playerInfo.x, playerInfo.y, sprite)
    .setOrigin(0.5, 0.5);
  if (playerInfo.team === "blue") player.setTint(0x0000ff);
  else player.setTint(0xff0000);
  player.playerId = playerInfo.playerId;
  self.players.add(player);
}
