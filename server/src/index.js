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

function createDefaultSettings() {
  return {
    rounds: 4,
    questionsPerPlayerPerRound: 2,
  };
}

function createSetupState() {
  return {
    currentRound: 1,
    questionsByRound: {},
  };
}

function getRoundStore(room, roundNumber) {
  const roundKey = String(roundNumber);

  if (!room.setup.questionsByRound[roundKey]) {
    room.setup.questionsByRound[roundKey] = {};
  }

  return room.setup.questionsByRound[roundKey];
}

function getRoundProgress(room) {
  const currentRound = room.setup?.currentRound || 1;
  const roundStore = getRoundStore(room, currentRound);
  const requiredCount = room.settings.questionsPerPlayerPerRound;
  const playerProgress = room.players.map((player) => ({
    playerId: player.id,
    playerName: player.name,
    submittedCount: Array.isArray(roundStore[player.id])
      ? roundStore[player.id].length
      : 0,
    requiredCount,
    isComplete: Array.isArray(roundStore[player.id])
      ? roundStore[player.id].length >= requiredCount
      : false,
  }));

  return {
    currentRound,
    totalRounds: room.settings.rounds,
    questionsPerPlayerPerRound: requiredCount,
    playerProgress,
  };
}

function serializeRoom(room) {
  return {
    gameId: room.gameId,
    host: room.host,
    players: room.players,
    settings: room.settings,
    phase: room.phase,
    roundState: getRoundProgress(room),
  };
}

function emitHostAssignment(room, socketId) {
  io.to(socketId).emit("assignHost", {
    gameId: room.gameId,
    host: room.host,
    isHost: room.host.id === socketId,
  });
}

function emitRoundProgress(room) {
  const payload = {
    gameId: room.gameId,
    phase: room.phase,
    ...getRoundProgress(room),
  };

  io.to(room.gameId).emit("roundProgress", payload);
  io.to(room.gameId).emit("roundProgressUpdate", payload);
}

function broadcastLobby(room) {
  io.to(room.gameId).emit("updatePlayerList", serializeRoom(room));
  emitHostAssignment(room, room.host.id);

  room.players
    .filter((player) => player.id !== room.host.id)
    .forEach((player) => {
      emitHostAssignment(room, player.id);
    });

  if (room.phase === "SETUP" || room.phase === "SETUP_COMPLETE") {
    emitRoundProgress(room);
  }
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

function sanitizeQuestion(payload) {
  const question = String(payload?.question || payload?.questionText || "").trim();
  const choices = Array.isArray(payload?.choices)
    ? payload.choices.map((choice) => String(choice || "").trim())
    : [];
  const correctIndex = Number(
    payload?.correctIndex ?? payload?.correctAnswerIndex
  );

  if (!question) {
    return { error: "Question is required." };
  }

  if (choices.length !== 4 || choices.some((choice) => !choice)) {
    return { error: "Exactly 4 non-empty answer choices are required." };
  }

  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    return { error: "Exactly 1 correct answer must be selected." };
  }

  return {
    question: {
      question,
      choices,
      correctIndex,
    },
  };
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
      settings: createDefaultSettings(),
      phase: "LOBBY",
      setup: createSetupState(),
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

    if (room.phase !== "LOBBY") {
      socket.emit("gameError", "This game has already moved past the lobby.");
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

  socket.on("setGameSettings", ({ gameId, rounds, questionsPerPlayerPerRound, phase }) => {
    const normalizedGameId = String(gameId || "").trim().toUpperCase();
    const room = gameRooms.get(normalizedGameId);

    if (!room) {
      socket.emit("gameError", "Game room not found.");
      return;
    }

    if (room.host.id !== socket.id) {
      socket.emit("gameError", "Only the host can change game settings.");
      return;
    }

    if (room.phase === "SETUP_COMPLETE") {
      socket.emit("gameError", "Setup is already complete for this game.");
      return;
    }

    const parsedRounds = Number(rounds);
    const parsedQuestionsPerRound = Number(questionsPerPlayerPerRound);

    if (
      !Number.isInteger(parsedRounds) ||
      !Number.isInteger(parsedQuestionsPerRound) ||
      parsedRounds < 1 ||
      parsedQuestionsPerRound < 1
    ) {
      socket.emit(
        "gameError",
        "Rounds and questions per player per round must both be whole numbers greater than 0."
      );
      return;
    }

    room.settings = {
      rounds: parsedRounds,
      questionsPerPlayerPerRound: parsedQuestionsPerRound,
    };

    if (phase === "SETUP" && room.phase === "LOBBY") {
      room.phase = "SETUP";
      room.setup = createSetupState();
    }

    io.to(room.gameId).emit("gameSettingsUpdated", {
      gameId: room.gameId,
      settings: room.settings,
      phase: room.phase,
    });

    broadcastLobby(room);
  });

  socket.on("submitQuestion", (payload) => {
    const normalizedGameId = String(payload?.gameId || "").trim().toUpperCase();
    const room = gameRooms.get(normalizedGameId);

    if (!room) {
      socket.emit("gameError", "Game room not found.");
      return;
    }

    if (room.phase !== "SETUP") {
      socket.emit("gameError", "Question submission is only available during setup.");
      return;
    }

    const currentPlayer = room.players.find((player) => player.id === socket.id);

    if (!currentPlayer) {
      socket.emit("gameError", "You are not part of this game.");
      return;
    }

    const validation = sanitizeQuestion(payload);

    if (validation.error) {
      socket.emit("gameError", validation.error);
      return;
    }

    const roundNumber = Number(payload?.round) || room.setup.currentRound;
    const roundStore = getRoundStore(room, roundNumber);

    if (!roundStore[socket.id]) {
      roundStore[socket.id] = [];
    }

    roundStore[socket.id].push({
      gameId: room.gameId,
      round: roundNumber,
      playerId: socket.id,
      ...validation.question,
    });

    socket.emit("questionSaved", {
      gameId: room.gameId,
      round: roundNumber,
      playerId: socket.id,
      question: validation.question.question,
      choices: validation.question.choices,
      correctIndex: validation.question.correctIndex,
    });

    emitRoundProgress(room);
  });

  socket.on("disconnect", () => {
    leaveCurrentGame(socket);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Quinn Quiz Show server running on http://localhost:${PORT}`);
});
