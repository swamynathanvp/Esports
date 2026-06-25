import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

/**
 * SecurityService — device integrity signal collector for iOS / iPadOS.
 *
 * HONEST BOUNDARY (read this before trusting any value here):
 *   Everything this service reports is a CLIENT-SIDE HINT. On a jailbroken device
 *   an attacker can hook these functions to return whatever they want. These signals
 *   are useful for triage and UX, but they are NOT a security boundary.
 *
 *   The authoritative integrity check is Apple App Attest (`requestAttestation()`),
 *   verified server-side. Only the App-Attest assertion proves that a genuine,
 *   unmodified build of THIS app is running on a non-jailbroken Apple device, and
 *   it cannot be forged on the client. See SECURITY.md.
 *
 *   The native checks below require a Capacitor plugin written in Swift (e.g. a
 *   `NexusIntegrity` plugin). Until that plugin ships, native checks return `false`
 *   AND `nativeChecksImplemented` is `false`, so the server can tell "verified clean"
 *   apart from "not yet measured" rather than silently treating an unmeasured device
 *   as trusted.
 */

const NATIVE_PLUGIN = 'NexusIntegrity'; // Swift Capacitor plugin (to be implemented)

class SecurityService {
    constructor() {
        this.platform = Capacitor.getPlatform(); // 'web', 'ios', 'android'
    }

    get nativeAvailable() {
        return this.platform === 'ios' && Capacitor.isPluginAvailable(NATIVE_PLUGIN);
    }

    async requestRequiredPermissions() {
        // iOS integrity checks (jailbreak heuristics, App Attest) need no runtime
        // permission prompts. Kept for API compatibility.
        return true;
    }

    /**
     * Apple App Attest — the ONLY cryptographically sound integrity proof on iOS.
     * Returns a base64 assertion + keyId that the server verifies against Apple's
     * attestation servers. Returns null when unavailable (web preview, missing plugin,
     * or a device that doesn't support App Attest).
     *
     * @param {string} challenge - a one-time nonce issued by our server.
     */
    async requestAttestation(challenge) {
        if (!this.nativeAvailable) return null;
        try {
            const plugin = Capacitor.Plugins[NATIVE_PLUGIN];
            // Native side calls DCAppAttestService.generateKey + generateAssertion(challenge).
            const { keyId, assertion } = await plugin.attest({ challenge });
            return { keyId, assertion };
        } catch (e) {
            console.warn('[SecurityService] App Attest unavailable:', e?.message);
            return null;
        }
    }

    /**
     * Collects best-effort integrity signals. The server treats these as hints and
     * computes the authoritative trust score; it must weight App Attest above all of
     * these booleans.
     */
    async runCompleteDiagnostic() {
        const results = {
            isRooted: false,              // iOS: jailbreak
            isDevModeActive: false,
            isVpnActive: false,
            isSideloaded: false,
            hasOverlayApps: false,
            hasCheatTools: false,
            hasVirtualSpace: false,
            hasAccessibilityAbuse: false,
            hasScreenCapture: false,
            isEmulator: false,            // iOS: Simulator
            isClockTampered: false,
            isBgmiModified: false,
            nativeChecksImplemented: false,
            attestationVerified: false,   // set true only after the server verifies App Attest
            issues: []
        };

        // VPN is the one signal genuinely observable from JS via Capacitor.
        results.isVpnActive = await this.checkVPNConnection();
        if (results.isVpnActive) results.issues.push('VPN_ACTIVE');

        if (!this.nativeAvailable) {
            // Web preview or no native plugin: we honestly have not measured the device.
            return results;
        }

        try {
            const plugin = Capacitor.Plugins[NATIVE_PLUGIN];
            const native = await plugin.runChecks();

            results.isRooted = !!native.isJailbroken;
            results.isDevModeActive = !!native.isDebuggerAttached;
            results.isEmulator = !!native.isSimulator;
            results.isClockTampered = !!native.isClockTampered;
            results.isBgmiModified = !!native.isAppTampered;       // app signature / bundle check
            results.hasScreenCapture = !!native.isScreenCaptured;  // UIScreen.isCaptured / mirroring
            results.nativeChecksImplemented = true;

            if (results.isRooted) results.issues.push('JAILBREAK_DETECTED');
            if (results.isDevModeActive) results.issues.push('DEBUGGER_ATTACHED');
            if (results.isEmulator) results.issues.push('SIMULATOR_ENVIRONMENT');
            if (results.isClockTampered) results.issues.push('CLOCK_TAMPERED');
            if (results.isBgmiModified) results.issues.push('APP_TAMPERED');
            if (results.hasScreenCapture) results.issues.push('SCREEN_CAPTURE_ACTIVE');
        } catch (e) {
            console.error('[SecurityService] Native diagnostic failed:', e);
            // Leave nativeChecksImplemented = false so the server knows this device is unmeasured.
        }

        return results;
    }

    async checkVPNConnection() {
        try {
            const status = await Network.getStatus();
            return status.connectionType === 'vpn';
        } catch (e) {
            return false;
        }
    }
}

export const securityService = new SecurityService();
