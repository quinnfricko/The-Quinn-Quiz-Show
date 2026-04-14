function Lobby({ lobby, playerRole, status, playerId }) {
  const isHost = playerRole === "HOST";

  return (
    <main className="page-shell">
      <section className="hero-card lobby-hero">
        <div>
          <p className="eyebrow">Game Lobby</p>
          <h1>{isHost ? "You are the host" : "Waiting for the host"}</h1>
          <p className="hero-copy">
            {isHost
              ? "Invite players with the game code, review the live roster, and move into setup when everyone is in."
              : "You are connected. Sit tight while the host prepares the game setup."}
          </p>
        </div>
        <div className="game-code-card">
          <span>Game Code</span>
          <strong>{lobby.gameId}</strong>
        </div>
      </section>

      <section className="panel-grid lobby-grid">
        <section className="panel player-panel">
          <div className="panel-heading">
            <h2>Connected Players</h2>
            <span className="player-count">{lobby.players.length} online</span>
          </div>
          <ul className="player-list">
            {lobby.players.map((player) => {
              const isCurrentUser = player.id === playerId;
              const isCurrentHost = player.id === lobby.host.id;

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
          <h2>{isHost ? "Host Controls" : "Player View"}</h2>
          {isHost ? (
            <>
              <p>
                When you are ready, move into the next setup step for game
                configuration.
              </p>
              <button type="button">Start Game Setup</button>
            </>
          ) : (
            <div className="waiting-card">
              <p className="waiting-title">Waiting for host</p>
              <p>
                {lobby.host.name} is the host. The game will move forward once
                setup begins.
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
