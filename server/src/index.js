import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const gameRooms = new Map();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

function generateGameId() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let gameId = "";

  for (let index = 0; index < 6; index += 1) {
    gameId += characters[Math.floor(Math.random() * characters.length)];
  }

  return gameId;
}

function createUniqueGameId() {
  let gameId = generateGameId();

  while (gameRooms.has(gameId)) {
    gameId = generateGameId();
  }

  return gameId;
}

function createPlayer(socketId, name) {
  return {
    id: socketId,
    name,
  };
}

function serializeRoom(room) {
  return {
    gameId: room.gameId,
    host: room.host,
    players: room.players,
  };
}

function emitHostAssignment(room, socketId) {
  io.to(socketId).emit("assignHost", {
    gameId: room.gameId,
    host: room.host,
    isHost: room.host.id === socketId,
  });
}

function broadcastLobby(room) {
  io.to(room.gameId).emit("updatePlayerList", serializeRoom(room));
  emitHostAssignment(room, room.host.id);

  room.players
    .filter((player) => player.id !== room.host.id)
    .forEach((player) => {
      emitHostAssignment(room, player.id);
    });
}

function leaveCurrentGame(socket) {
  const currentGameId = socket.data.gameId;

  if (!currentGameId || !gameRooms.has(currentGameId)) {
    return;
  }

  const room = gameRooms.get(currentGameId);
  room.players = room.players.filter((player) => player.id !== socket.id);
  socket.leave(currentGameId);
  delete socket.data.gameId;

  if (room.players.length === 0) {
    gameRooms.delete(currentGameId);
    return;
  }

  if (room.host.id === socket.id) {
    room.host = room.players[0];
  }

  broadcastLobby(room);
}

io.on("connection", (socket) => {
  socket.on("createGame", ({ playerName }) => {
    const trimmedName = String(playerName || "").trim();

    if (!trimmedName) {
      socket.emit("gameError", "Host name is required.");
      return;
    }

    leaveCurrentGame(socket);

    const gameId = createUniqueGameId();
    const host = createPlayer(socket.id, trimmedName);
    const room = {
      gameId,
      host,
      players: [host],
    };

    gameRooms.set(gameId, room);
    socket.join(gameId);
    socket.data.gameId = gameId;

    broadcastLobby(room);
  });

  socket.on("joinGame", ({ playerName, gameId }) => {
    const trimmedName = String(playerName || "").trim();
    const normalizedGameId = String(gameId || "").trim().toUpperCase();

    if (!trimmedName || !normalizedGameId) {
      socket.emit("gameError", "Player name and game code are required.");
      return;
    }

    const room = gameRooms.get(normalizedGameId);

    if (!room) {
      socket.emit("gameError", "Game room not found.");
      return;
    }

    if (socket.data.gameId && socket.data.gameId !== normalizedGameId) {
      leaveCurrentGame(socket);
    }

    const existingPlayer = room.players.find((player) => player.id === socket.id);

    if (existingPlayer) {
      existingPlayer.name = trimmedName;
    } else {
      room.players.push(createPlayer(socket.id, trimmedName));
    }

    socket.join(normalizedGameId);
    socket.data.gameId = normalizedGameId;

    broadcastLobby(room);
  });

  socket.on("disconnect", () => {
    leaveCurrentGame(socket);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Quinn Quiz Show server running on http://localhost:${PORT}`);
});
