import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Lobby from "./Lobby";

const socket = io({
  autoConnect: true,
});

function App() {
  const [playerName, setPlayerName] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [lobby, setLobby] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);
  const [status, setStatus] = useState("Connecting to server...");

  useEffect(() => {
    function onConnect() {
      setStatus("Connected. Create a game or join with a code.");
    }

    function onDisconnect() {
      setStatus("Disconnected from server.");
      setLobby(null);
      setPlayerRole(null);
    }

    function onUpdatePlayerList(updatedLobby) {
      setLobby(updatedLobby);
      setStatus(`Joined lobby ${updatedLobby.gameId}.`);
    }

    function onAssignHost(payload) {
      setPlayerRole(payload.isHost ? "HOST" : "PLAYER");
    }

    function onGameError(message) {
      setStatus(message);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("updatePlayerList", onUpdatePlayerList);
    socket.on("assignHost", onAssignHost);
    socket.on("gameError", onGameError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("updatePlayerList", onUpdatePlayerList);
      socket.off("assignHost", onAssignHost);
      socket.off("gameError", onGameError);
    };
  }, []);

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
    return (
      <Lobby
        lobby={lobby}
        playerRole={playerRole}
        status={status}
        playerId={socket.id}
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
