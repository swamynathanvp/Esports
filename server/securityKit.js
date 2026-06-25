// Centralized security primitives for the Nexus command server.
// Intentionally dependency-free (only Node stdlib + jsonwebtoken, which is already a dep)
// so it works without adding new packages.

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// --- JWT secret: must be strong and must come from the environment ---
// A hardcoded fallback secret means anyone who reads the source (or git history)
// can forge tokens — including a MANAGER token, which grants full admin. So we
// refuse to start without a real secret, except in explicit local dev.
const rawSecret = process.env.JWT_SECRET;

if (!rawSecret || rawSecret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
        // Fail fast: never run prod with a weak/absent secret.
        throw new Error(
            '[FATAL] JWT_SECRET is missing or too short (need >=32 chars). ' +
            'Set a strong random secret in the environment before starting in production.'
        );
    }
    console.warn(
        '\n[SECURITY WARNING] JWT_SECRET is not set or is weak. ' +
        'Using an ephemeral random secret for THIS process only.\n' +
        'All existing tokens are invalid on restart. Set JWT_SECRET in server/.env for stable dev.\n'
    );
}

// In dev with no secret we generate a random one per process (tokens won't survive a restart,
// which is fine and far safer than a known constant).
export const JWT_SECRET = rawSecret && rawSecret.length >= 32
    ? rawSecret
    : crypto.randomBytes(48).toString('hex');

export const JWT_ISSUER = 'nexus-command';

export function signToken(payload, options = {}) {
    return jwt.sign(payload, JWT_SECRET, { issuer: JWT_ISSUER, ...options });
}

export function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER });
}

// --- NoSQL injection guard ---
// Express parses JSON, so a body like {"username": {"$gt": ""}} arrives as an object
// and, passed straight into User.findOne({ username }), becomes a query operator.
// Coerce auth-critical fields to plain strings (or reject) before they touch Mongo.
export function asString(value, { max = 256 } = {}) {
    if (typeof value !== 'string') return null;
    if (value.length === 0 || value.length > max) return null;
    return value;
}

// --- Lightweight in-memory rate limiter (per IP + bucket) ---
// Good enough to blunt brute force / credential stuffing on a single instance.
// For multi-instance production, move this to Redis.
const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 10, bucket = 'default' } = {}) {
    return (req, res, next) => {
        const key = `${bucket}:${req.ip}`;
        const now = Date.now();
        const entry = buckets.get(key);

        if (!entry || now > entry.resetAt) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        entry.count += 1;
        if (entry.count > max) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({ error: 'Too many requests. Slow down and try again shortly.' });
        }
        next();
    };
}

// Periodically evict expired buckets so the map can't grow unbounded.
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
        if (now > entry.resetAt) buckets.delete(key);
    }
}, 5 * 60_000).unref?.();

// --- Security response headers (helmet-lite, no dependency) ---
export function securityHeaders(req, res, next) {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Cross-Origin-Resource-Policy', 'same-site');
    res.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // This is a JSON API; nothing should be embedded or scripted from a response.
    res.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.removeHeader('X-Powered-By');
    next();
}

// --- CORS allowlist derived from env ---
// origin: "*" lets any website drive the API from a victim's browser. Lock it down.
export function buildCorsOptions() {
    const allowed = (process.env.CORS_ORIGINS || 'http://localhost:5173,capacitor://localhost,ionic://localhost')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    return {
        origin(origin, callback) {
            // Allow non-browser clients (no Origin header): native app, curl, server-to-server.
            if (!origin) return callback(null, true);
            if (allowed.includes(origin)) return callback(null, true);
            return callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    };
}

export const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,capacitor://localhost,ionic://localhost')
    .split(',').map(s => s.trim()).filter(Boolean);
