const players = {};

const config = {
  type: Phaser.HEADLESS,
  parent: "phaser-example",
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 300 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  autoFocus: false
};

function preload() {
  this.load.image("star", "assets/star.png");
  this.load.image("ground", "assets/platform.png");
  this.load.spritesheet("dude", "assets/dude.png", {
    frameWidth: 32,
    frameHeight: 48
  });
}

function create() {
  const self = this;
  this.players = this.physics.add.group();

  this.scores = {
    blue: 0,
    red: 0
  };

  this.star = this.physics.add.image(
    randomPosition(400),
    randomPosition(300),
    "star"
  );
  this.physics.add.collider(this.players);

  this.platforms = this.physics.add.staticGroup();

  this.platforms
    .create(400, 568, "ground")
    .setScale(2)
    .refreshBody();

  this.platforms.create(300, 400, "ground");
  this.platforms.create(50, 250, "ground");
  this.platforms.create(750, 220, "ground");

  this.physics.add.collider(this.platforms, this.players);

  this.physics.add.collider(this.star, this.platforms);

  this.physics.add.overlap(this.players, this.star, function(star, player) {
    if (players[player.playerId].team === "red") {
      self.scores.red += 10;
    } else {
      self.scores.blue += 10;
    }
    self.star.setPosition(randomPosition(400), randomPosition(300));
    io.emit("updateScore", self.scores);
    io.emit("starLocation", { x: self.star.x, y: self.star.y });
  });

  io.on("connection", function(socket) {
    console.log("a user connected");
    players[socket.id] = {
      x: Math.floor(Math.random() * 700) + 50,
      y: Math.floor(Math.random() * 500) + 50,
      playerId: socket.id,
      team: Math.floor(Math.random() * 2) == 0 ? "red" : "blue",
      input: {
        left: false,
        right: false,
        up: false
      }
    };
    // add player to server
    addPlayer(self, players[socket.id]);
    // send the players object to the new player
    socket.emit("currentPlayers", players);
    // update all other players of the new player
    socket.broadcast.emit("newPlayer", players[socket.id]);

    // send the star object to the new player
    socket.emit("starLocation", { x: self.star.x, y: self.star.y });
    // send the current scores
    socket.emit("updateScore", self.scores);

    socket.on("disconnect", function() {
      console.log("user disconnected");
      // remove player from server
      removePlayer(self, socket.id);
      // remove this player from our players object
      delete players[socket.id];
      // emit a message to all players to remove this player
      io.emit("disconnect", socket.id);
    });
    // when a player moves, update the player data
    socket.on("playerInput", function(inputData) {
      handlePlayerInput(self, socket.id, inputData);
    });
  });
}

function addPlayer(self, playerInfo) {
  const player = self.physics.add
    .image(playerInfo.x, playerInfo.y, "star")
    .setOrigin(0.5, 0.5)
    .setDisplaySize(53, 40);
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  player.body.setGravityY(300);
  player.playerId = playerInfo.playerId;
  self.players.add(player);
}
function removePlayer(self, playerId) {
  self.players.getChildren().forEach(player => {
    if (playerId === player.playerId) {
      player.destroy();
    }
  });
}

function update() {
  this.players.getChildren().forEach(player => {
    const input = players[player.playerId].input;
    if (input.left) {
      player.setVelocityX(-160);
    } else if (input.right) {
      player.setVelocityX(160);
    } else {
      player.setVelocityX(0);
    }

    if (input.up && player.body.touching.down) {
      player.setVelocityY(-400);
    }

    players[player.playerId].x = player.x;
    players[player.playerId].y = player.y;
  });
  io.emit("playerUpdates", players);
  io.emit("starLocation", { x: this.star.x, y: this.star.y });
}

function randomPosition(max) {
  return Math.floor(Math.random() * max) + 50;
}
function handlePlayerInput(self, playerId, input) {
  self.players.getChildren().forEach(player => {
    if (playerId === player.playerId) {
      players[player.playerId].input = input;
    }
  });
}

const game = new Phaser.Game(config);

window.gameLoaded();
