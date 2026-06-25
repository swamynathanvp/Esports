// Device verification engine — the enforceable core of the iOS anti-cheat story.
//
// THE THREAT (read this):
//   On iPhone/iPad the dominant BGMI/PUBG cheat vector is a MODIFIED build of the
//   game itself, distributed through TestFlight or sideloading services (eSign,
//   Scarlet, AltStore, enterprise certs). Aimbot/ESP/no-recoil is compiled into a
//   re-signed IPA of the game.
//
// THE HARD LIMIT:
//   Our app is sandboxed by iOS. It CANNOT read the game's binary, check the game's
//   signature, or even enumerate installed apps. That is an Apple security guarantee.
//   So "scan the device for a hacked PUBG" is impossible from our app on a normal
//   (non-supervised) device. Any vendor claiming otherwise on stock iOS is bluffing.
//
// WHAT IS ACTUALLY ENFORCEABLE:
//   1. App Attest — proves OUR app is genuine + the device is not jailbroken. A
//      jailbroken device is what most sideload/inject toolchains need, so this alone
//      removes a large class of cheats.
//   2. Install-source rejection — we can prove whether OUR app is an App Store build
//      vs a TestFlight/sandbox build (App Store receipt name). We refuse to trust a
//      TestFlight/sideloaded copy of our own integrity client.
//   3. MDM supervision (the ONLY 100% path) — a player device enrolled as
//      *supervised* in the org's MDM lets the OS itself block TestFlight + non-App
//      Store installs and report the exact installed apps/versions to our backend.
//      This is how you actually guarantee the game is the unmodified App Store build.
//
// Tiers reflect how much we can trust the device. Prize/official scrims require
// MANAGED; everything below gets reduced or no credential access.

export const TIERS = {
    UNVERIFIED: 'UNVERIFIED', // no/failed attestation, or TestFlight/sideloaded client
    ATTESTED: 'ATTESTED',     // App Attest passed + App Store build + not jailbroken
    MANAGED: 'MANAGED',       // ATTESTED + MDM-supervised with verified App Store game
};

const TIER_RANK = { UNVERIFIED: 0, ATTESTED: 1, MANAGED: 2 };

export function tierAtLeast(actual, required) {
    return (TIER_RANK[actual] ?? 0) >= (TIER_RANK[required] ?? 0);
}

// Install sources we refuse to treat as trustworthy for OUR client.
const UNTRUSTED_INSTALL_SOURCES = new Set(['testflight', 'sandbox', 'sideloaded', 'enterprise']);

export function isUntrustedInstallSource(installSource) {
    return UNTRUSTED_INSTALL_SOURCES.has(String(installSource || '').toLowerCase());
}

// Compute the tier from the verified device record.
export function computeVerificationTier(dv = {}) {
    if (!dv.attestationVerified) return TIERS.UNVERIFIED;
    if (isUntrustedInstallSource(dv.installSource)) return TIERS.UNVERIFIED;
    if (dv.jailbroken) return TIERS.UNVERIFIED;

    if (dv.mdmSupervised && dv.gameIntegrity === 'verified_appstore') {
        return TIERS.MANAGED;
    }
    return TIERS.ATTESTED;
}

// --- One-time attestation challenges (nonces) ---
// App Attest assertions must be bound to a fresh server nonce so a captured
// assertion can't be replayed. Stored in-memory here; move to Redis for multi-instance.
const challenges = new Map(); // key: `${userId}` -> { value, expiresAt }
const CHALLENGE_TTL_MS = 2 * 60_000;

export function issueChallenge(userId, randomHex) {
    const value = randomHex;
    challenges.set(String(userId), { value, expiresAt: Date.now() + CHALLENGE_TTL_MS });
    return value;
}

export function consumeChallenge(userId, presented) {
    const key = String(userId);
    const entry = challenges.get(key);
    challenges.delete(key); // single use, always
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) return false;
    return entry.value === presented;
}

setInterval(() => {
    const now = Date.now();
    for (const [k, v] of challenges) if (now > v.expiresAt) challenges.delete(k);
}, 60_000).unref?.();

// --- Apple App Attest verification ---
// PRODUCTION NOTE: full verification requires validating the attestation/assertion
// CBOR against Apple's App Attest root certificate, checking the nonce, the rpId hash
// (your Team ID + bundle ID), the counter, and the key binding. Do that with a
// maintained library (e.g. `node-app-attest` / `@peculiar/asn1`) plus Apple's root.
// This function performs the structural + nonce checks and is the single place to
// drop in the cryptographic verification. It MUST return false unless the assertion
// genuinely verifies in production.
export function verifyAppAttestAssertion({ keyId, assertion, challengeOk }) {
    if (!keyId || !assertion) return false;
    if (!challengeOk) return false; // nonce must match and be unexpired

    if (process.env.APP_ATTEST_ENFORCE === 'true') {
        // TODO: real cryptographic verification against Apple's root cert here.
        // Until implemented, fail closed when enforcement is on.
        return verifyAgainstAppleRoot({ keyId, assertion });
    }

    // Dev/staging: accept structurally-valid assertions so the flow is testable,
    // but the tier still records that hard enforcement is OFF.
    return typeof keyId === 'string' && typeof assertion === 'string' && assertion.length > 16;
}

// Placeholder for the real Apple-root verification (implement before production).
function verifyAgainstAppleRoot(_input) {
    console.error('[AppAttest] APP_ATTEST_ENFORCE=true but verifyAgainstAppleRoot is not implemented. Failing closed.');
    return false;
}
