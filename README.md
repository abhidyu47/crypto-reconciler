# crypto-reconciler

A production-grade Node.js service that ingests crypto transaction data from two sources (exchange export and user records), matches them using a two-pass algorithm, and produces a structured reconciliation report.

---

## Tech Stack

- **Node.js** + **Express** — REST API
- **MongoDB** + **Mongoose** — data storage
- **Winston** — logging
- **Jest** — testing

---

## Setup

```bash
git clone https://github.com/abhidyu47/crypto-reconciler.git
cd crypto-reconciler
npm install
cp .env.example .env   # edit MONGODB_URI if needed
npm start
```

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/crypto_reconciler` | MongoDB connection |
| `PORT` | `3000` | Server port |
| `TIMESTAMP_TOLERANCE_SECONDS` | `300` | Max timestamp difference for a match |
| `QUANTITY_TOLERANCE_PCT` | `0.01` | Max quantity difference (1%) |

---

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/reconcile` | Trigger a reconciliation run |
| `GET` | `/report/:runId` | Full report (add `?format=csv` for CSV) |
| `GET` | `/report/:runId/summary` | Counts only — matched, conflicting, unmatched |
| `GET` | `/report/:runId/unmatched` | Only unmatched rows with reasons |

### Example

```bash
# Start a run
curl -X POST http://localhost:3000/reconcile

# Check status
curl http://localhost:3000/report/<runId>/summary

# Download CSV report
curl http://localhost:3000/report/<runId>?format=csv
```

---

## How It Works

### Ingestion
- Parses both CSVs and stores every row in MongoDB
- Flags bad rows with reason and severity — nothing is silently dropped
- Handles: malformed timestamps, negative quantities, duplicate IDs, asset aliases (e.g. `bitcoin` → `BTC`), unknown types

### Matching (two passes)
1. **ID-based** — pairs rows whose transaction IDs share the same trailing number (e.g. `EXC-1001` ↔ `USR-001`)
2. **Proximity-based** — matches remaining rows by asset + type + timestamp window + quantity tolerance

Handles `TRANSFER_IN` ↔ `TRANSFER_OUT` as the same event from opposite perspectives.

### Report Categories
- **Matched** — successfully paired
- **Conflicting** — paired but fields differ beyond tolerance
- **Unmatched (User only)** — in user file, not found in exchange
- **Unmatched (Exchange only)** — in exchange file, not found in user

---

## Running Tests

```bash
npm test
```