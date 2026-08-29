export function genId() {
    return 'red_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

export function collectData() {
    try {
        return {
            sessionId: genId(),
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown',
            maxTouchPoints: navigator.maxTouchPoints || 0,
            connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown',
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio,
            cookies: "simulated_session_id=mock_sec_" + Math.random().toString(36).substring(2, 8) + "; cyber_consent=true",
            localStorage: (function() {
                return {
                    "simulated_token": "mock_jwt_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock_signature",
                    "lab_mode": "educational_simulation"
                };
            })(),
            sessionStorage: (function() {
                return {
                    "simulated_csrf": "mock_csrf_987654321_lab"
                };
            })()
        };
    } catch (e) {
        console.error('Error recolectando:', e);
        return null;
    }
}
