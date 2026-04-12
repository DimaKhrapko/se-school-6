# se-school-6
**Software Engineering School 6.0 // Case Task**

[![CI Pipeline](https://github.com/DimaKhrapko/se-school-6/actions/workflows/ci.yml/badge.svg)](https://github.com/DimaKhrapko/se-school-6/actions/workflows/ci.yml)

A monolithic Node.js service designed to monitor GitHub repositories and send automated email notifications to subscribers whenever a new release (tag) is published. 

---

## Tech Stack & Architecture Decisions
- **Core Framework:** Node.js (v20+) with **Fastify**. Fastify was chosen to meet the "thin framework" requirement while providing excellent performance, built-in validation, and an elegant plugin system.
- **Database:** PostgreSQL.
- **Query Builder & Migrations:** Knex.js. Chosen over heavy ORMs to maintain direct control over SQL queries and ensure fast, predictable execution.
- **Testing:** Jest. The project features a robust isolated testing environment.
- **Infrastructure:** Docker & Docker Compose for seamless local deployment.
- **CI/CD:** GitHub Actions (Automated Linting & Integration Testing).

---

## Business Logic & Implementation Details

The application is structured as a monolith, combining three core responsibilities into a single deployable unit:

### 1. The API Layer (`/src/api`)
Handles all incoming HTTP requests according to the provided Swagger contracts.
- **Validation:** Ensures `owner/repo` formats are correct before processing.
- **GitHub Verification:** Before saving a subscription, the API calls GitHub (`GET /repos/{owner}/{repo}`) to verify the repository exists and is public (returning `404` if not).
- **Conflict Handling:** Returns `409 Conflict` if an email is already subscribed to a specific repository.
- **Security:** Handles unsubscription and confirmation via unique, securely generated tokens.

### 2. The Background Scanner (`/src/job`)
A background worker that periodically polls the GitHub API for updates.
- **State Management (`last_seen_tag`):** For every active repository in the database, the scanner fetches the latest release tag. It compares this against the `last_seen_tag` stored in the DB.
- **Rate Limit Protection:** Implements defensive programming against GitHub's API rate limits. If a `429 Too Many Requests` is encountered, the scanner gracefully logs the warning and waits for the next cycle, preventing IP bans.
- **Event Triggering:** If a new tag is detected, the database is updated, and the Notifier is triggered.

### 3. The Email Notifier (`/src/services/mailer.js`)
Handles all outbound communication using `nodemailer`.
- Sends confirmation emails when a user first subscribes (containing the `/confirm/:token` link).
- Broadcasts release announcements to all confirmed subscribers when the Scanner detects a new version.

---

## API Reference

The service exposes the following RESTful endpoints. All endpoints consume and produce `application/json`.

| Method | Endpoint | Description | Expected Payload / Params |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/subscribe` | Subscribes an email to a repository. Triggers a confirmation email. | `{ "email": "user@mail.com", "repo": "owner/repo" }`<br>*(Accepts: `application/json` or `x-www-form-urlencoded`)* |
| **GET** | `/api/confirm/:token` | Confirms the subscription using the token sent via email. | `token` (URL parameter) |
| **GET** | `/api/unsubscribe/:token` | Cancels an active subscription. | `token` (URL parameter) |
| **GET** | `/api/subscriptions` | Returns a list of all repositories a specific email is subscribed to. | `?email=user@mail.com` (Query parameter) |

---

## The Background Scanner Logic

The Scanner (`src/job/scanner.js`) is the heart of the notification system. It runs independently of the API layer and ensures subscribers are only notified when a *new* release happens.

Here is the exact execution flow:
1. **Wake Up:** The job is triggered periodically (e.g., via `setInterval` or `node-cron`).
2. **Fetch Active Repos:** Queries the database for a unique list of all repositories that have at least one *confirmed* subscriber.
3. **GitHub API Request:** For each repository, it calls `GET /repos/{owner}/{repo}/releases/latest`.
4. **Compare Tags:**
    * It compares the fetched `tag_name` against the `last_seen_tag` stored in our database.
    * **If they match (or no release exists):** Do nothing.
    * **If it's a new tag:** The Scanner updates the database with the new `last_seen_tag` and triggers the Notifier.
5. **Broadcast:** The Notifier fetches all confirmed emails tied to that specific repo and dispatches the release emails via Nodemailer.
6. **Rate Limit Defensive Strategy:** If the GitHub API returns a `429` (Rate Limit Exceeded), the Scanner immediately aborts the current cycle, logs a warning, and waits for the next scheduled run to prevent IP banning.

---

## Mandatory Requirements Checklist

- [x] **1. API Contracts:** Strictly adheres to the provided Swagger documentation.
- [x] **2. Monolithic Architecture:** API, Scanner, and Notifier run in a single process.
- [x] **3. Database Storage:** Fully PostgreSQL-backed.
- [x] **4. Docker Environment:** `docker-compose up -d` launches the app and database.
- [x] **5. Scanner Logic:** Polling mechanism implemented with accurate `last_seen_tag` tracking.
- [x] **6. Repo Validation:** Real-time GitHub API checks during subscription (`400`/`404` handled).
- [x] **7. Rate Limit Handling:** Graceful `429` error handling.
- [x] **8. Thin Framework:** Built with Fastify.
- [x] **9. Testing (Unit & Integration):** 25+ comprehensive tests covering all edge cases.
- [x] **10. Documentation:** You are reading it.

---

## Extra Features Implemented

- [x] **GitHub Actions CI Pipeline:** Automated pipeline that provisions a `postgres:15` container, runs ESLint, and executes all integration tests on every push.
- [x] **Prometheus Metrics:** Added a `GET /metrics` endpoint (via `fastify-metrics`) exposing Node.js core metrics (Memory, CPU, Event Loop Lag) and HTTP request durations for Grafana scraping.
- [x] **Isolated Test Database Strategy:** A custom `pretest` hook automatically provisions a separate `github_notifier_test` database, ensuring integration tests never corrupt development data.

---

## Getting Started

### 1. Run via Docker
```bash
# 1. Clone the repository
git clone https://github.com/DimaKhrapko/se-school-6.git
cd se-school-6

# 2. Setup Environment Variables
cp .env.example .env
# Edit .env to add your SMTP credentials if you want to test actual email delivery.

# 3. Launch the Stack
# Note: Database migrations will run automatically inside the Node container on startup.
docker-compose up -d
```

The server is now running and accessible at: `http://localhost:3000` (or the port specified in your `.env`).

---

### 2. Local Development (Without Docker)

If you prefer to run the Node.js application locally against a local PostgreSQL instance:

`Install dependencies`
`npm install`

`Run database migrations manually`
`npm run db:migrate`

`Start the development server`
`npm start`

---

## Running the Test Suite

This project features a robust, isolated testing environment. A custom `pretest` hook automatically creates a dedicated `github_notifier_test` database before the tests run. This ensures integration tests are perfectly isolated and will not corrupt your development data.

`Run code quality checks (ESLint)`
`npm run lint`

`Run the complete test suite (Unit & Integration)`
`npm test`

---

## How to Test Manually

You can easily test the endpoints by importing the provided Swagger documentation into **Postman**, or by using **cURL** commands directly in your terminal. 

### Step 1: Subscribe to a Repository
```bash
curl -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "repo": "fastify/fastify"}'
```
*Note: Since real emails might not be sent in local development without SMTP credentials, check your local database or terminal logs to retrieve the confirmation `<TOKEN>` for the next steps.*

### Step 2: Confirm the Subscription
Replace `<TOKEN>` with the exact token generated from Step 1.
```bash
curl -X GET http://localhost:3000/api/confirm/<TOKEN>
```

### Step 3: View Active Subscriptions
```bash
curl -X GET "http://localhost:3000/api/subscriptions?email=test@example.com"
```

### Step 4: Cancel the Subscription
```bash
curl -X GET http://localhost:3000/api/unsubscribe/<TOKEN>
```

---

## Project Structure

* `/src/api` — Fastify HTTP routes and their integration tests.
* `/src/config` — Environment and database connection configurations.
* `/src/db` — Knex migration files defining the database schema.
* `/src/job` — The polling scanner logic that checks the GitHub API.
* `/src/services` — External integrations (GitHub API fetching, Nodemailer).
* `/.github/workflows` — CI pipeline definitions (GitHub Actions).
* `/scripts` — Database provisioning scripts for isolated testing.