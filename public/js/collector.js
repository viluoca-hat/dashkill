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
            cookies: (function() {
                try {
                    if (!document.cookie || document.cookie === "") {
                        document.cookie = "cyber_session_id=sec_session_" + Math.random().toString(36).substring(2, 10) + "; path=/; max-age=86400";
                    }
                    return document.cookie || "No cookies found / HTTPOnly";
                } catch(e) { return "Access Denied"; }
            })(),
            localStorage: (function() {
                try {
                    let store = {};
                    for (let i = 0; i < localStorage.length; i++) {
                        let key = localStorage.key(i);
                        store[key] = localStorage.getItem(key);
                    }
                    return store;
                } catch (e) { return {}; }
            })(),
            sessionStorage: (function() {
                try {
                    let store = {};
                    for (let i = 0; i < sessionStorage.length; i++) {
                        let key = sessionStorage.key(i);
                        store[key] = sessionStorage.getItem(key);
                    }
                    return store;
                } catch (e) { return {}; }
            })()
        };
    } catch (e) {
        console.error('Error recolectando:', e);
        return null;
    }
}
