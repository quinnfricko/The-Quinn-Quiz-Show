import { useEffect, useState } from "react";

function Lobby({
  lobby,
  playerRole,
  status,
  playerId,
  gameSettings,
  gamePhase,
  socket,
}) {
  const isHost = playerRole === "HOST";
  const safeHost = lobby?.host || null;
  const safePlayers = Array.isArray(lobby?.players) ? lobby.players : [];
  const safeSettings = gameSettings || {
    rounds: 4,
    questionsPerPlayerPerRound: 2,
  };
  const [rounds, setRounds] = useState(safeSettings.rounds);
  const [questionsPerPlayerPerRound, setQuestionsPerPlayerPerRound] = useState(
    safeSettings.questionsPerPlayerPerRound
  );

  useEffect(() => {
    setRounds(safeSettings.rounds);
    setQuestionsPerPlayerPerRound(safeSettings.questionsPerPlayerPerRound);
  }, [safeSettings]);

  function saveSettings(nextPhase = gamePhase) {
    socket.emit("setGameSettings", {
      gameId: lobby.gameId,
      rounds: Number(rounds),
      questionsPerPlayerPerRound: Number(questionsPerPlayerPerRound),
      phase: nextPhase,
    });
  }

  return (
    <main className="page-shell">
      <section className="hero-card lobby-hero">
        <div>
          <p className="eyebrow">Game Lobby</p>
          <h1>{isHost ? "You are the host" : "Waiting for the host"}</h1>
          <p className="hero-copy">
            {isHost
              ? "Invite players with the game code, tune the match settings, and move into setup when everyone is in."
              : "You are connected. Sit tight while the host locks in the game configuration."}
          </p>
        </div>
        <div className="game-code-card">
          <span>Game Code</span>
          <strong>{lobby?.gameId || "------"}</strong>
          <small>{gamePhase === "SETUP" ? "Setup phase live" : "Lobby phase"}</small>
        </div>
      </section>

      <section className="panel-grid lobby-grid">
        <section className="panel player-panel">
          <div className="panel-heading">
            <h2>Connected Players</h2>
            <span className="player-count">{safePlayers.length} online</span>
          </div>
          <ul className="player-list">
            {safePlayers.map((player) => {
              const isCurrentUser = player.id === playerId;
              const isCurrentHost = player.id === safeHost?.id;

              return (
                <li key={player.id}>
                  <div>
                    <span>{player.name}</span>
                    {isCurrentUser ? <small>You</small> : null}
                  </div>
                  <strong>{isCurrentHost ? "HOST" : "PLAYER"}</strong>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel host-panel">
          <h2>{isHost ? "Game Configuration" : "Game Settings"}</h2>
          <div className="settings-grid">
            <label htmlFor="rounds">Number of Rounds</label>
            <input
              id="rounds"
              type="number"
              min="1"
              value={rounds}
              onChange={(event) => setRounds(event.target.value)}
              disabled={!isHost}
            />

            <label htmlFor="questionsPerPlayerPerRound">
              Questions Per Player Per Round
            </label>
            <input
              id="questionsPerPlayerPerRound"
              type="number"
              min="1"
              value={questionsPerPlayerPerRound}
              onChange={(event) =>
                setQuestionsPerPlayerPerRound(event.target.value)
              }
              disabled={!isHost}
            />
          </div>
          {isHost ? (
            <>
              <p>
                Save the shared settings first, then start the setup phase when
                the lobby is ready.
              </p>
              <div className="button-row">
                <button type="button" onClick={() => saveSettings("LOBBY")}>
                  Save Settings
                </button>
                <button type="button" onClick={() => saveSettings("SETUP")}>
                  Start Setup Phase
                </button>
              </div>
            </>
          ) : (
            <div className="waiting-card">
              <p className="waiting-title">
                {gamePhase === "SETUP" ? "Setup phase started" : "Waiting for host"}
              </p>
              <p>
                {safeHost?.name || "The host"} is the host. Current settings are{" "}
                {safeSettings.rounds} rounds with{" "}
                {safeSettings.questionsPerPlayerPerRound} questions per player
                each round.
              </p>
            </div>
          )}
          <div className="status-block">{status}</div>
        </section>
      </section>
    </main>
  );
}

export default Lobby;
