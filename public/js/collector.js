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
            // Detección detallada de Sistema Operativo y Navegador
            parsedOS: (function() {
                const ua = navigator.userAgent;
                if (/android/i.test(ua)) return 'Android';
                if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS (iPhone/iPad)';
                if (/Win64|Win32|Windows/i.test(ua)) return 'Windows';
                if (/Macintosh|MacIntel|MacPPC|Mac68K/i.test(ua)) return 'macOS';
                if (/Linux/i.test(ua)) return 'Linux';
                return 'Desconocido';
            })(),
            parsedBrowser: (function() {
                const ua = navigator.userAgent;
                if (ua.includes('Firefox/')) return 'Firefox (' + (ua.split('Firefox/')[1] || '').split(' ')[0] + ')';
                if (ua.includes('Edg/')) return 'Edge (' + (ua.split('Edg/')[1] || '').split(' ')[0] + ')';
                if (ua.includes('Chrome/')) return 'Chrome (' + (ua.split('Chrome/')[1] || '').split(' ')[0] + ')';
                if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
                return 'Navegador Web';
            })(),
            deviceType: (function() {
                const ua = navigator.userAgent;
                if (/mobile/i.test(ua)) return '📱 Teléfono Móvil';
                if (/ipad|tablet/i.test(ua)) return '📱 Tablet';
                return '💻 Computadora de Escritorio';
            })(),
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
