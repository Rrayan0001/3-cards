# 3-Cards Multiplayer Game

A real-time multiplayer card game where players compete to achieve the lowest sum with three hidden cards.

## Features

- 2-6 players per game
- Real-time multiplayer with Socket.IO
- Dynamic deck scaling (1 deck for 2-4 players, 2 decks for 5-6 players)
- Power cards with special abilities
- Turn-based gameplay with timers
- Responsive design for desktop and mobile

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd 3cards
   ```

2. Install server dependencies
   ```
   cd server && npm install
   ```

3. Install client dependencies
   ```
   cd ../client && npm install
   ```

4. Set up environment variables

   Create `server/.env`:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/3cards
   CLIENT_URL=http://localhost:3000
   ```

   Create `client/.env`:
   ```
   REACT_APP_SERVER_URL=http://localhost:5000
   ```

5. Start MongoDB
   ```
   mongod
   ```

6. Start the server
   ```
   cd server && npm run dev
   ```

7. Start the client
   ```
   cd ../client && npm start
   ```

8. Access the game
   - Open http://localhost:3000 in your browser
   - Create or join a game room
   - Invite friends using the room code

## License

MIT


