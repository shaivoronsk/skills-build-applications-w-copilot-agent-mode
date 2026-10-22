# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep route-level views in React and use the shared API client. Each view handles loading, success, empty, and accessible error states; presentation code does not own persistence or business rules.
- Logic tier decision: Keep request validation and API behavior in Express routes/services. Return deliberate 4xx responses for invalid input, malformed IDs, missing references, and unknown users; do not expose Mongoose cast errors as 500s.
- Data tier decision: Use Mongoose schemas for required fields, defaults, and relationships. Keep seeding idempotent and preserve unrelated records.
- Activity tracking approach: Validate the activity payload and verify that the referenced user and team exist before creating a record. Store the submitted references and fields, plus computed points and an occurrence date.
- Team management approach: Support listing and creating teams with their submitted name, mascot, and members. Reject a missing name with 400.
- Leaderboard approach: Sum activity points per team, sort descending, and return each team’s name, total, and 1-based rank.
- Workout suggestions approach: Find the user by email and prioritize workouts matching their goal or recent activity. Include a reason with the first suggestion; return a deliberate 4xx when no user matches.


## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`. Schema failures indicate missing validation/defaults; seed failures indicate missing fixtures, destructive behavior, or non-idempotent seeding. Current result: 4 failed, 1 passed; the seed test passed.
- API command: `npm run test:api --prefix octofit-tracker/backend`. Failures indicate incorrect validation/persistence, leaderboard aggregation, or recommendation behavior. Current result: 4 failed; invalid activity/team requests returned 501, leaderboard was empty, and the first suggestion did not match the expected user.
- Frontend command: `npm test --prefix octofit-tracker/frontend`. Failures indicate missing API rendering, request states, empty states, or accessible error handling. Current result: 15 failed; the views still show “Implementation pending.”
- Backend build command: `npm run build --prefix octofit-tracker/backend`. Failures indicate TypeScript compilation errors. Current result: passed.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`. Failures indicate TypeScript or Vite build errors. Current result: passed.
