# The Quinn Quiz Show

A full-stack multiplayer browser-based trivia lobby scaffold built with React, Vite, Node.js, Express, and Socket.io.

This version includes a real-time multiplayer lobby flow:

- A host creates a game and is assigned the `HOST` role
- Players join using a browser game code and become `PLAYERS`
- The lobby player list updates instantly in every connected browser
- The host sees a `Start Game Setup` control while players see a waiting screen

Trivia gameplay has not been added yet.

## Project Structure

```text
.
├── client
└── server
```

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Real-time: Socket.io

## Local Setup

Open the project in VS Code, then use two terminals:

### 1. Install dependencies

```bash
cd /Users/quinnfricko/Documents/New\ project/client
npm install
```

```bash
cd /Users/quinnfricko/Documents/New\ project/server
npm install
```

### 2. Start the backend

```bash
cd /Users/quinnfricko/Documents/New\ project/server
npm run start
```

The server runs on `http://localhost:3001`.

### 3. Start the frontend

```bash
cd /Users/quinnfricko/Documents/New\ project/client
npm run dev
```

The Vite app runs on `http://localhost:5173`.

## How To Test The Lobby

1. Open the frontend in one browser tab as the host.
2. Click **Create Game Room**.
3. Copy the generated room code.
4. Open another browser tab or window.
5. Enter a player name and the room code.
6. Click **Join Room**.
7. Watch the lobby update live as players join.
8. Confirm the host sees **Start Game Setup** and players see the waiting view.

## Notes For Development

- Vite proxies API and Socket.io traffic to the Express server.
- Game rooms are stored in memory on the server by `gameId`.
- This is intended as a clean starting point for future trivia gameplay.
