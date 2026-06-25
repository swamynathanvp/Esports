# Security & Device Integrity — Esports Nexus

This document covers the threat model, what was hardened, and the roadmap to
genuinely tamper-resistant device integrity on iOS / iPadOS.

## The one thing to understand first

**Client-side anti-cheat can never be "100% uncheatable."** Any check that runs on
the player's device can be hooked, patched, or lied to on a jailbroken device. A
function that returns "not jailbroken" can be made to return that on a jailbroken
phone. This is a law of the platform, not a bug we can fix.

What *is* achievable is **server-authoritative trust rooted in Apple App Attest**:

- The server decides everything (trust score, credential release). The client only
  reports hints and renders UI.
- **Apple App Attest** gives a cryptographic proof, signed by Apple's hardware, that
  a *genuine, unmodified* build of this app is running on a *real, non-jailbroken*
  Apple device. The server verifies Apple's signature. This assertion **cannot be
  forged on the client** — it is the real root of trust.

Treat the 12 "layers" as triage signals. Treat App Attest as the gate.

## Threat model

| Actor | Goal | Mitigation |
|------|------|-----------|
| Cheating player | Report a clean device while cheating | App Attest (authoritative); client signals are advisory only |
| Malicious player | Set another player's trust score to 0 (grief) or own to 100 | **Fixed**: heartbeat now bound to the JWT-authenticated user; no client-claimed identity |
| Anyone with the source/git | Forge a MANAGER token → full admin | **Fixed**: hardcoded JWT secret removed; secret now required from env |
| Attacker | NoSQL injection via `{"$gt":""}` in login body | **Fixed**: auth fields coerced to strings |
| Attacker | Brute force / credential stuffing | **Fixed**: rate limiting on auth routes |
| Any website | Drive the API from a victim's browser | **Fixed**: CORS locked to an allowlist |
| Non-participant | Read match Room ID / password | **Fixed**: credentials no longer broadcast; released only via gated endpoint |

## What was fixed in this pass

### Critical
1. **Trust-score forgery via WebSocket (total anti-cheat bypass).**
   The `integrity_heartbeat` handler trusted a client-supplied `hardwareId` and never
   verified the socket. Anyone could connect, claim any identity, and set any player's
   `trustScore` to 100 (or 0). Now the socket must present a valid JWT
   (`authenticate({ token })`); the heartbeat is applied to *that* user only, and the
   `hardwareId` comes from the DB, not the client. See `server/server.js`,
   `server/middleware/auth.js`.
2. **Hardcoded JWT secret** (`'nexus_super_secret_key_2024'`).
   Anyone reading the repo could forge tokens — including a MANAGER token, which
   `auth.js` trusts without a DB lookup → full admin. The secret is now required from
   the environment (`JWT_SECRET`, ≥32 chars); the server refuses to start in production
   without it and uses an ephemeral per-process secret in dev. See `server/securityKit.js`.
3. **Hardcoded `admin`/`admin` manager login** with the password printed in the UI.
   Moved to env (`MANAGER_USERNAME` + bcrypt `MANAGER_PASSWORD_HASH`); the UI hint was
   removed. A dev-only `admin/admin` fallback remains *only* when `NODE_ENV !== production`
   and no hash is configured, with a loud warning.

### High
4. **Match credential broadcast leak.** `io.emit('scrim_created', scrim)` pushed the full
   scrim *including Room ID + password* to **every** connected socket, regardless of team,
   eligibility, or trust score. Now broadcasts carry no secrets (`scrims_updated`), and
   credentials are fetched from `GET /scrims/credentials/:id`, which enforces membership +
   release time + trust score **server-side**. The previous gate was client-side React
   state only.
5. **NoSQL injection.** Auth inputs are coerced to strings (`asString`) so an object like
   `{"$gt":""}` can't become a Mongo operator.
6. **No rate limiting.** Added an in-memory limiter on all credential-accepting routes.
7. **Wide-open CORS** (`origin: "*"`). Now an allowlist from `CORS_ORIGINS`.

### Hardening
8. Security response headers (`securityHeaders`), `X-Powered-By` removed, 64 kB JSON body cap.
9. Diagnostics payload whitelisted to known boolean keys before persistence.
10. `.env` added to `.gitignore`; minimum password length (8).
11. Honest `SecurityService`: unmeasured devices are no longer reported as "clean"
    (`nativeChecksImplemented` flag), and the iOS terminology (jailbreak/Simulator) replaces
    the Android stubs.

## Setup (required)

```bash
cd server
cp .env.example .env
# Generate a strong JWT secret:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Generate a manager password hash:
node -e "import('bcrypt').then(b=>b.default.hash('YourStrongPassword',12)).then(console.log)"
# Paste both into .env, then start the server.
```

## Roadmap to tamper-resistant integrity (the real work)

### 1. App Attest (highest priority — this is the actual anti-cheat)
- **Native plugin (Swift):** implement a Capacitor plugin `NexusIntegrity` exposing:
  - `attest({ challenge })` → uses `DCAppAttestService` to `generateKey()` then
    `generateAssertion(challenge)`; returns `{ keyId, assertion }`.
  - `runChecks()` → returns `{ isJailbroken, isDebuggerAttached, isSimulator,
    isClockTampered, isAppTampered, isScreenCaptured }`.
- **Flow:** server issues a one-time `challenge` → client calls `requestAttestation(challenge)`
  → server verifies the assertion against Apple's attestation root and binds the verified
  `keyId` to the user. Subsequent sensitive actions (credential fetch) require a fresh,
  server-verified assertion. Set `attestationVerified` server-side; never trust the client's copy.
- **Gate on attestation, not booleans:** credential release should require a valid,
  recent App Attest assertion in addition to the existing checks.

### 2. iOS native detections (defense in depth, advisory)
Jailbreak heuristics (suspicious paths, `fork()` success, sandbox escape, dyld image
inspection), debugger detection (`sysctl` `P_TRACED`), `UIScreen.isCaptured`, Simulator
detection, and bundle/code-signature validation. These raise the bar but are bypassable —
keep them as score inputs, not gates.

### 3. Transport & platform
- Serve the API over **HTTPS only** in production; pin certificates in the native app.
- Move `api.js` `baseURL` to an env/build variable (currently hardcoded `http://localhost:5000`).
- Configure iOS **App Transport Security** to forbid arbitrary loads.
- Consider shortening the 30-day player token and adding refresh-token rotation.

### 4. Operational
- Move the rate limiter and any nonce/challenge store to Redis for multi-instance.
- Centralized audit logging for manager actions (ban, promote, credential push).
- Add `helmet` and `express-mongo-sanitize` as dependencies if you prefer maintained
  libraries over the dependency-free helpers added here.

## Residual risks (be honest with stakeholders)
- Until App Attest is implemented and *gated on*, trust scores rely on client-reported
  signals and can be defeated on a jailbroken device.
- App Attest proves the device/app are genuine; it does **not** prove the human isn't
  cheating via a second device, hardware, or network-side tooling. Pair it with
  server-side statistical anomaly detection on match results.
