# SebetPage Frontend

React client for the SebetPage social/chat platform. It talks to the Spring Boot API gateway for REST and real-time messaging.

## Prerequisites

- Node.js 18+
- Backend gateway running (default `http://localhost:8000`)

## Setup

```bash
cp .env.example .env
npm install
```

## Environment

| Variable | Purpose |
| --- | --- |
| `REACT_APP_GATEWAY_BASE_URL` | Gateway URL for WebSocket connections (e.g. `http://localhost:8000`) |
| `REACT_APP_API_BASE_URL` | Optional synonym for the gateway WebSocket URL |

REST calls use relative `/api/*` paths. In development, Create React App proxies those to the gateway via `package.json` → `"proxy"`.

WebSocket connects directly to `REACT_APP_GATEWAY_BASE_URL/ws` with a short-lived ticket (see backend README).

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Dev server at [http://localhost:3000](http://localhost:3000) |
| `npm run build` | Production build in `build/` |
| `npm test` | Run tests |

## Architecture

```text
index.tsx
  └── UserProvider
        └── App
              └── ChatSocketProvider   ← single WebSocket/STOMP connection
                    └── MainRouter
```

### Key modules

| Path | Role |
| --- | --- |
| `src/services/apiService.ts` | Fetch wrapper, bearer token, refresh cookie, proactive token rotation |
| `src/context/UserContext.tsx` | Session state (`/api/user/me`, login/logout) |
| `src/context/ChatSocketContext.tsx` | Shared real-time socket for all components |
| `src/hooks/useWebSocket.ts` | STOMP singleton (internal; use context in components) |
| `src/components/ProfilePopup/` | Profile view/edit, friend actions, block UI |
| `src/components/FriendsPanel/FriendChat/` | Direct-message chat widget |

### Auth model

- Access token: in memory only (never `localStorage`)
- Refresh token: HttpOnly cookie (`refreshToken`)
- WebSocket: short-lived ticket via `POST /api/auth/ws-ticket` — JWT is never placed in the WS URL

### Routes

| Path | Page |
| --- | --- |
| `/` | Home (login modal, friends panel, chats) |
| `/register` | Registration |
| `/reset-password?code=...` | Password reset |
| `/profile/:nickname` | Home with profile popup |
| `/group/:id` | Home with group context |
| `/?login=1` | Home with login modal open |

## Production notes

Serve the `build/` folder behind a reverse proxy that forwards `/api/*` and `/ws` to the gateway. Without that, relative API calls will fail.

## Related repo

Backend microservices: `../microservices` — see its README for Docker Compose and env setup.
