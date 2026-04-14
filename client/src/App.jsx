import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Lobby from "./Lobby";
import SetupPhase from "./SetupPhase";

const socket = io({
  autoConnect: true,
});

const defaultGameSettings = {
  rounds: 4,
  questionsPerPlayerPerRound: 2,
};

const defaultRoundState = {
  currentRound: 1,
  totalRounds: 4,
  questionsPerPlayerPerRound: 2,
  playerProgress: [],
};

function App() {
  const [playerName, setPlayerName] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [lobby, setLobby] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);
  const [gameSettings, setGameSettings] = useState(defaultGameSettings);
  const [gamePhase, setGamePhase] = useState("LOBBY");
  const [roundState, setRoundState] = useState(defaultRoundState);
  const [status, setStatus] = useState("Connecting to server...");

  useEffect(() => {
    function onConnect() {
      setStatus("Connected. Create a game or join with a code.");
    }

    function onDisconnect() {
      setStatus("Disconnected from server.");
      setLobby(null);
      setPlayerRole(null);
      setGameSettings(defaultGameSettings);
      setGamePhase("LOBBY");
      setRoundState(defaultRoundState);
    }

    function onUpdatePlayerList(updatedLobby) {
      const safeLobby = {
        gameId: updatedLobby?.gameId || "",
        host: updatedLobby?.host || null,
        players: Array.isArray(updatedLobby?.players) ? updatedLobby.players : [],
        settings: updatedLobby?.settings || defaultGameSettings,
        phase: updatedLobby?.phase || "LOBBY",
        roundState: updatedLobby?.roundState || defaultRoundState,
      };

      setLobby(safeLobby);
      setGameSettings(safeLobby.settings);
      setGamePhase(safeLobby.phase);
      setRoundState(safeLobby.roundState);

      if (safeLobby.phase === "LOBBY") {
        setStatus(`Joined lobby ${safeLobby.gameId}.`);
      }

      if (safeLobby.phase === "SETUP") {
        setStatus(
          `Setup in progress: round ${safeLobby.roundState.currentRound}/${safeLobby.roundState.totalRounds}.`
        );
      }

      if (safeLobby.phase === "SETUP_COMPLETE") {
        setStatus("Setup complete. All question rounds are finished.");
      }
    }

    function onAssignHost(payload) {
      setPlayerRole(payload.isHost ? "HOST" : "PLAYER");
    }

    function onGameError(message) {
      setStatus(message);
    }

    function onGameSettingsUpdated(payload) {
      const safeSettings = payload?.settings || defaultGameSettings;
      const nextPhase = payload?.phase || "LOBBY";

      setGameSettings(safeSettings);
      setGamePhase(nextPhase);
      setLobby((currentLobby) =>
        currentLobby
          ? {
              ...currentLobby,
              settings: safeSettings,
              phase: nextPhase,
            }
          : currentLobby
      );
      setStatus(
        nextPhase === "SETUP"
          ? "Host started the setup phase."
          : "Game settings updated."
      );
    }

    function onRoundProgress(payload) {
      setRoundState({
        currentRound: payload?.currentRound || 1,
        totalRounds: payload?.totalRounds || gameSettings.rounds,
        questionsPerPlayerPerRound:
          payload?.questionsPerPlayerPerRound ||
          gameSettings.questionsPerPlayerPerRound,
        playerProgress: Array.isArray(payload?.playerProgress)
          ? payload.playerProgress
          : [],
      });
    }

    function onRoundComplete(payload) {
      setStatus(
        `Round ${payload.completedRound} complete. Preparing next round...`
      );
    }

    function onSetupComplete(payload) {
      setGamePhase("SETUP_COMPLETE");
      setLobby((currentLobby) =>
        currentLobby
          ? {
              ...currentLobby,
              phase: "SETUP_COMPLETE",
            }
          : currentLobby
      );
      setStatus(
        `Setup complete. Collected ${payload.totalRounds} rounds of questions.`
      );
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("updatePlayerList", onUpdatePlayerList);
    socket.on("assignHost", onAssignHost);
    socket.on("gameSettingsUpdated", onGameSettingsUpdated);
    socket.on("roundProgress", onRoundProgress);
    socket.on("roundComplete", onRoundComplete);
    socket.on("setupComplete", onSetupComplete);
    socket.on("gameError", onGameError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("updatePlayerList", onUpdatePlayerList);
      socket.off("assignHost", onAssignHost);
      socket.off("gameSettingsUpdated", onGameSettingsUpdated);
      socket.off("roundProgress", onRoundProgress);
      socket.off("roundComplete", onRoundComplete);
      socket.off("setupComplete", onSetupComplete);
      socket.off("gameError", onGameError);
    };
  }, [gameSettings.questionsPerPlayerPerRound, gameSettings.rounds]);

  function createGame() {
    const trimmedName = playerName.trim();

    if (!trimmedName) {
      setStatus("Enter your name before creating a game.");
      return;
    }

    socket.emit("createGame", { playerName: trimmedName });
  }

  function joinGame() {
    const trimmedName = playerName.trim();
    const trimmedGameCode = gameCode.trim().toUpperCase();

    if (!trimmedName || !trimmedGameCode) {
      setStatus("Enter your name and game code to join.");
      return;
    }

    socket.emit("joinGame", {
      playerName: trimmedName,
      gameId: trimmedGameCode,
    });
  }

  if (lobby && playerRole) {
    if (gamePhase === "SETUP" || gamePhase === "SETUP_COMPLETE") {
      return (
        <SetupPhase
          lobby={lobby}
          playerRole={playerRole}
          playerId={socket.id}
          gameSettings={gameSettings}
          roundState={roundState}
          gamePhase={gamePhase}
          status={status}
          socket={socket}
        />
      );
    }

    return (
      <Lobby
        lobby={lobby}
        playerRole={playerRole}
        status={status}
        playerId={socket.id}
        gameSettings={gameSettings}
        gamePhase={gamePhase}
        socket={socket}
      />
    );
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Live Multiplayer Lobby</p>
        <h1>The Quinn Quiz Show</h1>
        <p className="hero-copy">
          Spin up a browser-based game room, hand out the game code, and watch
          the lobby populate in real time before the quiz begins.
        </p>
        <div className="status-pill">{status}</div>
      </section>

      <section className="panel-grid">
        <div className="panel">
          <h2>Choose Your Name</h2>
          <label htmlFor="playerName">Display Name</label>
          <input
            id="playerName"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Quinn"
          />
        </div>

        <div className="panel">
          <h2>Host A Room</h2>
          <p>Create a new game and become the host automatically.</p>
          <button type="button" onClick={createGame}>
            Create Game Room
          </button>
        </div>

        <div className="panel">
          <h2>Join Existing Room</h2>
          <label htmlFor="gameCode">Game Code</label>
          <input
            id="gameCode"
            value={gameCode}
            onChange={(event) => setGameCode(event.target.value)}
            placeholder="ABC123"
            maxLength={6}
          />
          <button type="button" onClick={joinGame}>
            Join Room
          </button>
        </div>
      </section>
    </main>
  );
}

export default App;
