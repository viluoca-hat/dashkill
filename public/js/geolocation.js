export function getIPGeo() {
    return new Promise(function(resolve) {
        const services = [
            { url: 'https://ipapi.co/json/', parse: function(d) {
                return { ip: d.ip, city: d.city, region: d.region, country: d.country_name, lat: d.latitude, lng: d.longitude, isp: d.org };
            }},
            { url: 'https://ipinfo.io/json', parse: function(d) {
                const loc = d.loc ? d.loc.split(',') : [null, null];
                return { ip: d.ip, city: d.city, region: d.region, country: d.country, lat: parseFloat(loc[0]), lng: parseFloat(loc[1]), isp: d.org };
            }},
            { url: 'https://ip-api.com/json/', parse: function(d) {
                return { ip: d.query, city: d.city, region: d.regionName, country: d.country, lat: d.lat, lng: d.lon, isp: d.isp };
            }},
            { url: 'https://api.ipify.org?format=json', parse: function(d) {
                return { ip: d.ip, city: 'Global Internet Client', region: 'Remote', country: 'Global', lat: null, lng: null, isp: 'Public Provider' };
            }}
        ];
        let attempts = 0;
        function tryNext() {
            if (attempts >= services.length) { resolve(null); return; }
            const s = services[attempts];
            attempts++;
            fetch(s.url, { timeout: 4000 })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(d) {
                    if (d && (d.ip || d.query)) {
                        resolve(s.parse(d));
                    } else {
                        tryNext();
                    }
                })
                .catch(function() { tryNext(); });
        }
        tryNext();
    });
}

export function getGPS() {
    return new Promise(function(resolve) {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
            function(p) { resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }); },
            function() { resolve(null); },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    });
}
