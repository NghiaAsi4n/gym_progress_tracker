# Gym Progress Tracker

A multi-account gym tracking web application focused on the complete workflow from workout planning and session logging to progress analysis. The responsive interface supports English and Vietnamese, kg/lb units, and light/dark/system themes.

## Core Features

- Register, sign in, and manage sessions with JWT authentication; data is isolated per user.
- Manage system and personal exercise catalogs and create workout templates.
- Start an empty workout or use a template; log sets, reps, weight, set status, and notes.
- Automatically save active workouts; complete, cancel, view details, or delete workout history.
- Track body weight, total volume, best weight, e1RM, workout frequency, and progress charts.
- Estimate calories burned for completed workouts based on duration and body weight.
- The API supports weekly training plans, rescheduling/skipping sessions, and rule-based exercise suggestions based on goals, experience, available equipment, and missing movement patterns.

## Technology Stack

| Component | Technology                                   |
| --------- | -------------------------------------------- |
| Web       | React 19, Vite, React Router, TanStack Query |
| API       | Node.js, Express 5, Mongoose                 |
| Database  | MongoDB 8                                    |
| Contracts | TypeScript, Zod                              |
| Testing   | Vitest, React Testing Library, Supertest     |

## Architecture

```text
apps/
├── web/                 React SPA
└── api/                 Modular monolith REST API
packages/
└── contracts/           Shared Zod schemas and TypeScript types
```

The API uses the `/api/v1` prefix. `packages/contracts` is the shared contract source that keeps frontend and backend validation, requests, responses, and error formats consistent.

## Requirements

- Node.js `>= 24`
- npm `>= 11`
- Docker and Docker Compose

## Local Development

### 1. Prepare the environment

```powershell
Copy-Item .env.example .env
docker compose up -d mongodb
npm ci
```

Open `.env` and set `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` to two different random strings, each at least 32 characters long. The remaining default values are suitable for local development.

### 2. Seed and start the application

```powershell
npm run seed
npm run dev
```

| Service      | URL                                   |
| ------------ | ------------------------------------- |
| Web          | `http://localhost:5173`               |
| API          | `http://localhost:4000/api/v1`        |
| Health check | `http://localhost:4000/api/v1/health` |

Demo account after seeding:

- Email: `demo@gym.local`
- Password: `DemoPassword1!`

The seed command can be run repeatedly without creating duplicate data and is disabled when `NODE_ENV=production`. Stop MongoDB with `docker compose down`; local data is retained in the `mongodb_data` volume.

## Environment Variables

| Variable               | Description                                     | Local default                            |
| ---------------------- | ----------------------------------------------- | ---------------------------------------- |
| `PORT`                 | API port                                        | `4000`                                   |
| `MONGODB_URI`          | MongoDB connection string                       | `mongodb://127.0.0.1:27017/gym_tracking` |
| `WEB_ORIGIN`           | Origin allowed to call the API                  | `http://localhost:5173`                  |
| `ACCESS_TOKEN_SECRET`  | Access token signing secret, at least 32 chars  | Required                                 |
| `REFRESH_TOKEN_SECRET` | Refresh token signing secret, at least 32 chars | Required                                 |
| `VITE_API_URL`         | API base URL used by the web application        | `http://localhost:4000/api/v1`           |

TTL, audience, and issuer settings are documented in full in `.env.example`.

## Common Commands

| Command                 | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | Run contracts, API, and web in development mode        |
| `npm run seed`          | Seed system exercises and demo data                    |
| `npm test`              | Run the complete test suite                            |
| `npm run test:coverage` | Run tests and generate a coverage report               |
| `npm run lint`          | Run ESLint checks                                      |
| `npm run typecheck`     | Run TypeScript checks                                  |
| `npm run format:check`  | Check formatting with Prettier                         |
| `npm run build`         | Build the complete workspace                           |
| `make check`            | Run formatting, linting, type checks, tests, and build |

## API Groups

The main resources are `auth`, `me`, `exercises`, `workout-templates`, `training-plans`, `scheduled-workouts`, `schedule-overrides`, `workouts`, `body-weights`, and `progress`. Except for registration, login, refresh, and health checks, all business endpoints require authentication.

## Security

- Access tokens are stored in memory only; refresh tokens use rotated `HttpOnly`, `SameSite=Lax` cookies.
- The API limits request frequency and payload/query sizes, and only accepts CORS requests from `WEB_ORIGIN`.
- Every personal-data query is scoped to the user obtained from the access token.
- Never use secrets from `.env.example` in production, and never commit the `.env` file.

## Build and Deployment

```powershell
docker build --build-arg VITE_API_URL=/api/v1 -t gym-tracking:local .
docker run --rm -p 4000:4000 --env-file .env.production gym-tracking:local
```

The production image builds both the web application and API, then Express serves the SPA and REST API from a single port. The repository also includes `render.yaml` for the API and `vercel.json` for the web application when separate deployments are required.

## Contributing

Before creating a pull request, run:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Keep changes small, add tests for new behavior, and use Conventional Commit messages such as `feat:`, `fix:`, and `docs:`.
