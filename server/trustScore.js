// Server-authoritative trust scoring.
//
// IMPORTANT: every input here is a CLIENT-REPORTED HINT and can be forged on a
// compromised device. This score is for triage/visibility only. The hard gate
// that actually withholds match credentials must be backed by Apple App Attest
// (see SECURITY.md), not by these booleans alone.

export function computeTrustScore(d = {}) {
    // Definitive tampering => instant zero.
    if (d.isBgmiModified || d.hasCheatTools) return 0;

    let score = 100;
    if (d.isRooted) score -= 50;              // jailbreak on iOS
    if (d.hasVirtualSpace) score -= 80;
    if (d.isEmulator) score -= 60;
    if (d.isSideloaded) score -= 40;
    if (d.hasAccessibilityAbuse) score -= 40;
    if (d.isClockTampered) score -= 30;
    if (d.hasOverlayApps) score -= 30;
    if (d.hasScreenCapture) score -= 25;
    if (d.isDevModeActive) score -= 20;
    if (d.isVpnActive) score -= 15;

    return Math.max(0, Math.min(100, score));
}
