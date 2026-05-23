const DEFAULT_SETTINGS = {
    apiUrl: 'https://api.cobalt.blackcat.sweeux.org',
    apiKey: '',
    filenameStyle: 'basic',
    audioBitrate: '128',
    combineFfmpeg: false
};

// Lista masiva de servidores conocidos para auto-escaneo
const ALL_KNOWN_INSTANCES = [
    'https://api.cobalt.blackcat.sweeux.org',
    'https://cobaltapi.cjs.nz',
    'https://cobalt.woof.monster',
    'https://grapefruit.clxxped.lol',
    'https://api.meowing.de',
    'https://api.squair.xyz',
    'https://cobalt.qwkuns.me',
    'https://fox.kittycat.boo',
    'https://cobalt.mgytr.top',
    'https://co.wuk.sh',
    'https://cobalt.canine.tools',
    'https://co.eepy.today',
    'https://cobalt.sh1mmer.me',
    'https://cobalt.zorner.me',
    'https://cobalt.systemless.me',
    'https://cobalt.lolinade.gay',
    'https://cobalt.starnw.net',
    'https://api.cobalt.best'
];

let FALLBACK_INSTANCES = [
    'https://api.cobalt.blackcat.sweeux.org',
    'https://cobaltapi.cjs.nz',
    'https://cobalt.woof.monster',
    'https://grapefruit.clxxped.lol',
    'https://api.meowing.de'
];

async function autoUpdateCobaltServers() {
    try {
        const lastUpdate = localStorage.getItem('yt_unclogged_servers_last_update');
        const now = Date.now();
        const ONE_HOUR = 3600 * 1000;
        
        // Si ya hay servidores en caché, cargarlos
        const cached = localStorage.getItem('yt_unclogged_healthy_servers');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (parsed.length > 0) FALLBACK_INSTANCES = parsed;
            } catch (e) {}
        }

        // Si se actualizó hace menos de 1 hora, no volver a escanear para no saturar la red
        if (lastUpdate && (now - parseInt(lastUpdate, 10)) < ONE_HOUR) {
            return;
        }

        console.log('🔄 Iniciando escaneo automático de servidores Cobalt...');
        const healthyServers = [];

        // Ping en paralelo a todos los servidores con timeout de 3 segundos
        const promises = ALL_KNOWN_INSTANCES.map(async (url) => {
            try {
                const startTime = performance.now();
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                const res = await fetch(`/api/server-info?url=${encodeURIComponent(url)}`, { 
                    method: 'GET',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (!res.ok) return;
                
                const response = await res.json();
                if (!response.ok) return; // Server didn't respond or failed
                
                const data = response.data;
                const latency = performance.now() - startTime;
                
                // Verificar que soporte youtube y esté funcionando
                if (data.cobalt && data.cobalt.services && data.cobalt.services.includes('youtube')) {
                    healthyServers.push({ url, latency });
                }
            } catch (e) {
                // Ignore timeouts/errors
            }
        });

        await Promise.all(promises);

        if (healthyServers.length > 0) {
            // Ordenar de más rápido a más lento
            healthyServers.sort((a, b) => a.latency - b.latency);
            const bestUrls = healthyServers.map(s => s.url);
            
            console.log(`✅ Escaneo completado: ${bestUrls.length} servidores activos encontrados. Mejor servidor: ${bestUrls[0]} (${Math.round(healthyServers[0].latency)}ms)`);
            
            FALLBACK_INSTANCES = bestUrls;
            localStorage.setItem('yt_unclogged_healthy_servers', JSON.stringify(bestUrls));
            localStorage.setItem('yt_unclogged_servers_last_update', now.toString());
            
            // Si el usuario no tiene una apiKey configurada, usar el mejor servidor
            let appSettings = JSON.parse(localStorage.getItem('yt_unclogged_settings')) || { ...DEFAULT_SETTINGS };
            if (!appSettings.apiKey) {
                appSettings.apiUrl = bestUrls[0];
                localStorage.setItem('yt_unclogged_settings', JSON.stringify(appSettings));
            }
        }
    } catch (err) {
        console.error('Error auto-updating servers:', err);
    }
}

// Iniciar escaneo en background al cargar
autoUpdateCobaltServers();

// Instancias conocidas que no funcionan o requieren auth que falla
const DEAD_INSTANCES = [
    'https://api.cobalt.tools',
    'https://cobalt.kwiateek.pl',
    'https://cobalt.mor1.dev',
    'https://api.cobalt.best',
    'https://api.cobalt.run',
    'https://cobalt.cr.us.kg',
    'https://nuko-c.meowing.de',
    'https://api.qwkuns.me',
    'https://apicobalt.mgytr.top',
    'https://lime.clxxped.lol',
    'https://cobalt.omega.wolfy.love',
    'https://melon.clxxped.lol'
];

// Cargar configuraciones del localStorage o usar valores por defecto
let appSettings = JSON.parse(localStorage.getItem('yt_unclogged_settings')) || { ...DEFAULT_SETTINGS };
let appHistory = JSON.parse(localStorage.getItem('yt_unclogged_history')) || [];

// Migrar automáticamente si el usuario tiene configurada una instancia que sabemos que está caída o bloqueada
if (!appSettings.apiUrl || DEAD_INSTANCES.includes(appSettings.apiUrl)) {
    appSettings.apiUrl = DEFAULT_SETTINGS.apiUrl;
    localStorage.setItem('yt_unclogged_settings', JSON.stringify(appSettings));
}

// Actualizar los botones de sugerencias de instancias en el modal de Ajustes
function updateInstanceSuggestions(instances) {
    const container = document.getElementById('instance-suggestions');
    if (!container) return;

    if (!instances || instances.length === 0) {
        instances = FALLBACK_INSTANCES.map(url => ({
            api: new URL(url).host,
            frontend: new URL(url).host.split('.')[0] === 'cobaltapi' || new URL(url).host.split('.')[0] === 'api' ? new URL(url).host.split('.')[1] : new URL(url).host.split('.')[0],
            online: true
        }));
    }

    container.innerHTML = instances.map((inst) => {
        const apiUrl = `https://${inst.api}`;
        const name = inst.frontend.charAt(0).toUpperCase() + inst.frontend.slice(1);
        const statusText = inst.online ? 'Activo' : 'Offline';
        const statusColor = inst.online ? 'text-green-500' : 'text-red-500';
        const emoji = '🌐';
        
        return `<button type="button" onclick="setInstanceUrl('${apiUrl}')" class="text-[11px] font-label-bold bg-surface-container hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors border border-surface-container-highest py-2 px-3 text-left flex flex-col gap-0.5 truncate">
                <span class="flex items-center gap-1">${emoji} ${name}</span>
                <span class="text-[9px] font-normal text-secondary/60">Estado: <span class="${statusColor} font-semibold">${statusText}</span></span>
            </button>`;
    }).join('');
}

// Botón de refrescar instancias manualmente: comprueba salud en vivo
window.refreshInstanceList = async function () {
    const btn = document.getElementById('refresh-instances-btn');
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined text-[14px] animate-spin">refresh</span> Verificando...';
    
    const list = FALLBACK_INSTANCES.map(url => ({
        api: new URL(url).host,
        frontend: new URL(url).host.split('.')[0] === 'cobaltapi' || new URL(url).host.split('.')[0] === 'api' ? new URL(url).host.split('.')[1] : new URL(url).host.split('.')[0],
        online: false
    }));
    
    // Probar máximo 12 en paralelo
    await Promise.all(list.map(async (inst) => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            
            const res = await fetch(`https://${inst.api}/`, { 
                method: 'HEAD',
                signal: controller.signal 
            }).catch(() => fetch(`https://${inst.api}/`, { signal: controller.signal }));
            
            clearTimeout(timeout);
            if (res.ok || res.status === 400 || res.status === 401 || res.status === 403) {
                inst.online = true;
            }
        } catch (e) {
            inst.online = false;
        }
    }));
    
    updateInstanceSuggestions(list);
    
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined text-[14px]">refresh</span> Actualizar';
    showToast('INFO', 'Estado de los servidores verificado.', 'info');
};

// Cargar sugerencias al inicio
updateInstanceSuggestions();

// Elementos DOM
const openSettingsBtn = document.getElementById('open-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const resetSettingsBtn = document.getElementById('reset-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const settingsModal = document.getElementById('settings-modal');

const settingsApiUrlInput = document.getElementById('settings-api-url');
const settingsApiKeyInput = document.getElementById('settings-api-key');
const settingsFilenameStyleSelect = document.getElementById('settings-filename-style');
const settingsAudioBitrateSelect = document.getElementById('settings-audio-bitrate');
const settingsCombineFfmpeg = document.getElementById('settings-combine-ffmpeg');

const openHistoryBtn = document.getElementById('open-history');
const closeHistoryBtn = document.getElementById('close-history');
const closeHistoryBtn2 = document.getElementById('close-history-btn');
const clearHistoryBtn = document.getElementById('clear-history');
const historyModal = document.getElementById('history-modal');
const historyList = document.getElementById('history-list');

const dmcaModal = document.getElementById('dmca-modal');
const openDmcaBtn = document.getElementById('open-dmca');
const closeDmcaBtn = document.getElementById('close-dmca');
const closeDmcaBtn2 = document.getElementById('close-dmca-btn');

const privacyModal = document.getElementById('privacy-modal');
const openPrivacyBtn = document.getElementById('open-privacy');
const closePrivacyBtn = document.getElementById('close-privacy');
const closePrivacyBtn2 = document.getElementById('close-privacy-btn');

const termsModal = document.getElementById('terms-modal');
const openTermsBtn = document.getElementById('open-terms');
const closeTermsBtn = document.getElementById('close-terms');
const closeTermsBtn2 = document.getElementById('close-terms-btn');

const unclogBtn = document.getElementById('unclog-btn');
const unclogBtnText = document.getElementById('unclog-btn-text');
const unclogBtnIcon = document.getElementById('unclog-btn-icon');
const urlInput = document.getElementById('url-input');

const statusToast = document.getElementById('status-toast');
const statusToastCard = document.getElementById('status-toast-card');
const statusToastIcon = document.getElementById('status-toast-icon');
const statusToastTitle = document.getElementById('status-toast-title');
const statusToastMessage = document.getElementById('status-toast-message');
const closeToastBtn = document.getElementById('close-toast');

// Elemento del badge de servidor activo
const activeServerNameSpan = document.getElementById('active-server-name');

// Función para formatear y actualizar el badge del servidor activo
function updateActiveServerBadge(url) {
    if (!activeServerNameSpan) return;
    try {
        const parsed = new URL(url || appSettings.apiUrl);
        let name = parsed.hostname;
        // Simplificar nombres comunes
        if (name.includes('kittycat')) name = 'KittyCat (Auto)';
        else if (name.includes('squair')) name = 'Squair (Respaldo)';
        else if (name.includes('sweeux')) name = 'Blackcat (Respaldo)';

        activeServerNameSpan.innerText = name;
    } catch (_) {
        activeServerNameSpan.innerText = 'Personalizado';
    }
}

// Inicializar inputs de configuración
function initSettingsInputs() {
    settingsApiUrlInput.value = appSettings.apiUrl || DEFAULT_SETTINGS.apiUrl;
    settingsApiKeyInput.value = appSettings.apiKey || '';
    settingsFilenameStyleSelect.value = appSettings.filenameStyle || DEFAULT_SETTINGS.filenameStyle;
    settingsAudioBitrateSelect.value = appSettings.audioBitrate || DEFAULT_SETTINGS.audioBitrate;
    if (settingsCombineFfmpeg) {
        settingsCombineFfmpeg.checked = !!appSettings.combineFfmpeg;
    }
    updateActiveServerBadge();
    updateButtonState();
}

// Seleccionar instancia rápida desde sugerencias
window.setInstanceUrl = function (url) {
    settingsApiUrlInput.value = url;
    showToast('INFO', `Instancia seleccionada: ${url}. Haz clic en GUARDAR para aplicar los cambios.`, 'info');
};

// Guardar configuraciones
function saveSettings() {
    // Asegurarse de quitar las barras diagonales al final de la URL
    let cleanUrl = settingsApiUrlInput.value.trim().replace(/\/+$/, "");
    if (!cleanUrl) {
        cleanUrl = DEFAULT_SETTINGS.apiUrl;
    }

    appSettings = {
        apiUrl: cleanUrl,
        apiKey: settingsApiKeyInput.value.trim(),
        filenameStyle: settingsFilenameStyleSelect.value,
        audioBitrate: settingsAudioBitrateSelect.value,
        combineFfmpeg: settingsCombineFfmpeg ? settingsCombineFfmpeg.checked : false
    };

    localStorage.setItem('yt_unclogged_settings', JSON.stringify(appSettings));
    updateActiveServerBadge();
    showToast('ÉXITO', 'Configuración guardada correctamente.', 'success');
    closeModal(settingsModal);
}

// Reestablecer configuraciones
function resetSettings() {
    appSettings = { ...DEFAULT_SETTINGS };
    localStorage.setItem('yt_unclogged_settings', JSON.stringify(appSettings));
    initSettingsInputs();
    updateActiveServerBadge();
    showToast('INFO', 'Configuración reestablecida a los valores originales.', 'info');
}

// Abrir modal con animación
function openModal(modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.querySelector('.neo-card').classList.remove('scale-95');
        modal.querySelector('.neo-card').classList.add('scale-100');
    }, 10);
}

// Cerrar modal con animación
function closeModal(modal) {
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.neo-card').classList.remove('scale-100');
    modal.querySelector('.neo-card').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// Mostrar alerta Toast (Neo-brutalist)
let toastTimeout;
function showToast(title, message, type = 'info') {
    clearTimeout(toastTimeout);

    statusToastTitle.innerText = title;
    statusToastMessage.innerText = message;

    // Estilo según tipo
    if (type === 'success') {
        statusToastCard.style.borderColor = '#c3f400';
        statusToastCard.style.boxShadow = '-4px 4px 0px 0px #c3f400';
        statusToastIcon.innerText = 'check_circle';
        statusToastIcon.style.color = '#c3f400';
    } else if (type === 'error') {
        statusToastCard.style.borderColor = '#ffb4ab';
        statusToastCard.style.boxShadow = '-4px 4px 0px 0px #ffb4ab';
        statusToastIcon.innerText = 'error';
        statusToastIcon.style.color = '#ffb4ab';
    } else {
        statusToastCard.style.borderColor = '#ffffff';
        statusToastCard.style.boxShadow = '-4px 4px 0px 0px #ffffff';
        statusToastIcon.innerText = 'info';
        statusToastIcon.style.color = '#ffffff';
    }

    statusToast.classList.remove('opacity-0', 'translate-y-[-20px]', 'pointer-events-none');
    statusToast.classList.add('opacity-100', 'translate-y-0');

    toastTimeout = setTimeout(() => {
        hideToast();
    }, 6000);
}

function hideToast() {
    statusToast.classList.remove('opacity-100', 'translate-y-0');
    statusToast.classList.add('opacity-0', 'translate-y-[-20px]', 'pointer-events-none');
}

// Renderizar lista de historial
function renderHistory() {
    historyList.innerHTML = '';
    if (appHistory.length === 0) {
        historyList.innerHTML = '<div class="text-center py-8 text-secondary font-body-md">El historial está vacío. ¡Empieza a liberar contenido!</div>';
        return;
    }

    appHistory.forEach((item, index) => {
        const date = new Date(item.timestamp).toLocaleDateString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const isMp3 = item.format === 'mp3';

        const card = document.createElement('div');
        card.className = 'bg-surface-container border border-surface-container-highest p-4 flex flex-col gap-2 relative group hover:border-primary-fixed transition-colors';
        card.innerHTML = `
                <div class="flex justify-between items-start gap-4">
                    <div class="flex-grow min-w-0">
                        <h4 class="font-label-bold text-[13px] text-primary truncate uppercase">${item.title || 'Video Liberado'}</h4>
                        <a href="${item.url}" target="_blank" class="text-[11px] text-secondary hover:text-primary-fixed truncate block mt-0.5">${item.url}</a>
                    </div>
                    <span class="text-[10px] bg-surface p-1 border border-surface-container-highest font-label-bold uppercase text-primary-fixed">
                        ${isMp3 ? 'Audio' : item.quality + 'p'}
                    </span>
                </div>
                <div class="flex justify-between items-center mt-2 pt-2 border-t border-surface-container/50">
                    <span class="text-[10px] text-secondary/60">${date}</span>
                    <div class="flex gap-2">
                        <button onclick="deleteHistoryItem(${index})" class="text-error/70 hover:text-error text-[11px] font-label-bold uppercase flex items-center justify-center gap-1 transition-colors">
                            <span class="material-symbols-outlined text-[14px]">delete</span> Borrar
                        </button>
                        <a href="${item.downloadUrl}" download class="text-primary-fixed hover:text-white text-[11px] font-label-bold uppercase flex items-center justify-center gap-1 transition-colors">
                            <span class="material-symbols-outlined text-[14px]">download</span> Bajar
                        </a>
                    </div>
                </div>
            `;
        historyList.appendChild(card);
    });
}

// Borrar elemento individual del historial
window.deleteHistoryItem = function (index) {
    appHistory.splice(index, 1);
    localStorage.setItem('yt_unclogged_history', JSON.stringify(appHistory));
    renderHistory();
    showToast('INFO', 'Elemento eliminado del historial.', 'info');
};

// Limpiar todo el historial
function clearHistory() {
    if (appHistory.length === 0) return;
    if (confirm('¿Seguro que deseas limpiar todo tu historial de descargas?')) {
        appHistory = [];
        localStorage.setItem('yt_unclogged_history', JSON.stringify(appHistory));
        renderHistory();
        showToast('INFO', 'Historial limpiado correctamente.', 'info');
    }
}

// Show / hide the download progress card
function showProgressCard(filename) {
    const card = document.getElementById('download-progress-card');
    if (!card) return;
    const filenameEl = document.getElementById('progress-filename');
    if (filenameEl) filenameEl.textContent = filename || 'Preparando archivo...';
    card.classList.remove('hidden');
    card.classList.add('flex');
}

function hideProgressCard() {
    const card = document.getElementById('download-progress-card');
    if (!card) return;
    card.classList.add('hidden');
    card.classList.remove('flex');
}

// Reset UI progress bar before starting a new download
function resetProgressBar(filename) {
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressStatus = document.getElementById('progress-status');
    const progressStats = document.getElementById('progress-stats');
    const progressSpeed = document.getElementById('progress-speed');
    const filenameEl = document.getElementById('progress-filename');
    if (progressBarFill) { progressBarFill.style.width = '0%'; progressBarFill.style.transition = 'width 0.1s ease-out'; }
    if (progressPercent) progressPercent.textContent = '0%';
    if (progressStatus) progressStatus.textContent = 'DESCARGANDO...';
    if (progressStats) progressStats.textContent = '0.00 MB / ? MB';
    if (progressSpeed) progressSpeed.textContent = 'Velocidad: -- MB/s';
    if (filenameEl) filenameEl.textContent = filename || 'Preparando archivo...';
}

// Fetch a URL and return a Uint8Array, updating the progress UI
async function fetchBufferWithProgress(downloadUrl, filename) {
    showProgressCard(filename);
    resetProgressBar(filename);

    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error('Download failed: ' + res.status);
    const contentLength = res.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : null;
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    let lastTime = performance.now();
    let lastReceived = 0;

    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressStats = document.getElementById('progress-stats');
    const progressSpeed = document.getElementById('progress-speed');
    const progressStatus = document.getElementById('progress-status');

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;

        const now = performance.now();
        const elapsed = (now - lastTime) / 1000;
        if (elapsed >= 0.3) {
            const bytesPerSec = (received - lastReceived) / elapsed;
            const mbps = (bytesPerSec / (1024 * 1024)).toFixed(2);
            if (progressSpeed) progressSpeed.textContent = `Velocidad: ${mbps} MB/s`;
            lastTime = now;
            lastReceived = received;
        }

        const receivedMB = (received / (1024 * 1024)).toFixed(2);
        if (total) {
            const percent = Math.round((received / total) * 100);
            const totalMB = (total / (1024 * 1024)).toFixed(2);
            if (progressBarFill) progressBarFill.style.width = percent + '%';
            if (progressPercent) progressPercent.textContent = percent + '%';
            if (progressStats) progressStats.textContent = `${receivedMB} MB / ${totalMB} MB`;
        } else {
            // Unknown size: just show received MB and animate the bar
            if (progressBarFill) progressBarFill.style.width = '100%';
            if (progressBarFill) progressBarFill.style.opacity = '0.6';
            if (progressPercent) progressPercent.textContent = `${receivedMB} MB`;
            if (progressStats) progressStats.textContent = `${receivedMB} MB descargados`;
        }
    }

    const result = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    // Mark as completed
    if (progressBarFill) { progressBarFill.style.width = '100%'; progressBarFill.style.opacity = '1'; }
    if (progressPercent) progressPercent.textContent = '100%';
    if (progressStatus) progressStatus.textContent = 'COMPLETADO ✓';
    if (progressSpeed) progressSpeed.textContent = 'Descarga finalizada';

    return result;
}

// Download with streaming + progress UI (returns a Blob)
async function downloadWithProgress(downloadUrl, filename) {
    const buffer = await fetchBufferWithProgress(downloadUrl, filename);
    const blob = new Blob([buffer]);
    // Trigger download via temporary link
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Mark as completed
    if (progressBarFill) { progressBarFill.style.width = '100%'; progressBarFill.style.opacity = '1'; }
    if (progressPercent) progressPercent.textContent = '100%';
    if (progressStatus) progressStatus.textContent = 'COMPLETADO ✓';
    if (progressSpeed) progressSpeed.textContent = 'Descarga finalizada';

    // Auto-hide after 4 seconds
    setTimeout(() => hideProgressCard(), 4000);
    return blob;
}

// Helper to generate safe filename
function safeFilename(title, ext) {
    const safe = (title || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${safe}.${ext}`;
}

// Manejar lógica de descarga con sistema de redundancia inteligente (fallbacks)
let lastDownloadTime = 0;
async function handleDownload() {
    const now = Date.now();
    if (now - lastDownloadTime < 3000) {
        showToast('INFO', 'Espera unos segundos antes de iniciar otra descarga.', 'info');
        return;
    }
    lastDownloadTime = now;

    const urlValue = urlInput.value.trim();
    if (!urlValue) {
        showToast('ERROR', 'Por favor pega un enlace válido para empezar.', 'error');
        return;
    }

    // Expresión regular muy flexible para cualquier URL de descarga
    try {
        new URL(urlValue);
    } catch (_) {
        showToast('ERROR', 'La URL introducida no es válida.', 'error');
        return;
    }

    // Obtener formato seleccionado
    const selectedFormat = document.querySelector('input[name="format"]:checked').value;
    // Obtener calidad seleccionada
    const selectedQuality = document.querySelector('input[name="quality"]:checked').value;

    // Deshabilitar botón e input
    unclogBtn.disabled = true;
    urlInput.disabled = true;
    unclogBtn.classList.add('opacity-50', 'cursor-not-allowed');

    unclogBtnText.innerText = 'CONECTANDO...';
    unclogBtnIcon.innerText = 'sync';
    unclogBtnIcon.classList.add('animate-spin');

    // Construir cuerpo de petición de Cobalt
    const requestData = {
        url: urlValue,
        filenameStyle: appSettings.filenameStyle,
        downloadMode: selectedFormat === 'mp3' ? 'audio' : 'auto',
        youtubeHLS: true
    };

    if (selectedFormat === 'mp3') {
        requestData.audioFormat = 'mp3';
        requestData.audioBitrate = appSettings.audioBitrate;
    } else {
        requestData.videoQuality = selectedQuality;
    }

    const useRapid = !!getYoutubeVideoId(urlValue);
    let success = false;
    let lastError = null;

    // Construir la lista de URLs a intentar (empezando por la configurada)
    const configuredUrl = appSettings.apiUrl || DEFAULT_SETTINGS.apiUrl;
    const candidateUrls = [configuredUrl];

    FALLBACK_INSTANCES.forEach(url => {
        if (url !== configuredUrl) {
            candidateUrls.push(url);
        }
    });



    // Bucle de reintentos sobre todos los servidores candidatos
    for (let i = 0; i < candidateUrls.length; i++) {
        const currentUrl = candidateUrls[i];

        if (i > 0) {
            showToast('REINTENTANDO', `Servidor fallido. Probando respaldo (${i}/${candidateUrls.length - 1}): ${new URL(currentUrl).hostname}...`, 'info');
            unclogBtnText.innerText = `RESPALDO ${i}...`;
            // Pequeño retraso para no bombardear todos los servidores en 1 milisegundo
            await new Promise(r => setTimeout(r, 600));
        } else {
            unclogBtnText.innerText = 'PROCESANDO...';
        }

        try {
            let response = null;
            let fetchError = null;

            try {
                // Enviar la petición a través del proxy local para evitar CORS
                const proxyHeaders = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Cobalt-Target': currentUrl.endsWith('/') ? currentUrl : currentUrl + '/'
                };
                if (appSettings.apiKey && currentUrl === configuredUrl) {
                    proxyHeaders['Authorization'] = `Api-Key ${appSettings.apiKey}`;
                }

                response = await fetch('/api/cobalt', {
                    method: 'POST',
                    headers: proxyHeaders,
                    body: JSON.stringify(requestData)
                });
            } catch (err) {
                fetchError = err;
            }

            if (fetchError) {
                throw fetchError;
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                let errorMsg = 'Error del servidor de descarga.';
                if (errData && errData.error) {
                    const code = errData.error.code || '';
                    if (code.includes('rate_limit')) {
                        errorMsg = 'Límite de velocidad superado en esta instancia.';
                    } else if (code.includes('url')) {
                        errorMsg = 'El enlace proporcionado no es soportado o está roto.';
                    } else if (code.includes('auth')) {
                        errorMsg = 'Esta instancia requiere API Key o autenticación.';
                    } else if (errData.error.context && errData.error.context.service) {
                        errorMsg = `Servicio no soportado o bloqueado (${errData.error.context.service})`;
                    } else {
                        errorMsg = code || 'Error de la API (' + response.status + ')';
                    }
                } else {
                    errorMsg = `El servidor respondió con error ${response.status}`;
                }
                throw new Error(errorMsg);

            }

            const data = await response.json();

            if (data.status === 'error') {
                throw new Error(data.error && data.error.code ? `Error: ${data.error.code}` : 'Error desconocido de Cobalt.');
            }

            if (data.status === 'redirect' || data.status === 'tunnel') {
                unclogBtnText.innerText = 'VERIFICANDO...';

                const fallbackMsg = currentUrl !== configuredUrl
                    ? ` (vía respaldo: ${new URL(currentUrl).hostname})`
                    : '';

                let downloadUrl = data.url;

                // Verificar server-side si el túnel tiene datos reales (evita archivos 0B)
                if (data.status === 'tunnel') {
                    unclogBtnText.innerText = 'VERIFICANDO...';
                    try {
                        const probeRes = await fetch(`/api/cobalt-probe?url=${encodeURIComponent(downloadUrl)}`);
                        const probeData = await probeRes.json();
                        if (!probeData.ok) {
                            throw new Error(`Archivo vacío (0 bytes) — servidor bloqueado por YouTube. Probando siguiente...`);
                        }
                    } catch (probeErr) {
                        if (probeErr.message.includes('0 bytes') || probeErr.message.includes('Archivo vacío')) {
                            throw probeErr;
                        }
                        // Si el probe falla por otra razón, intentar descargar de todas formas
                        console.warn('Probe falló, intentando descarga directa:', probeErr);
                    }

                    // Pedir URL fresca (el probe consumió la anterior)
                    unclogBtnText.innerText = 'PREPARANDO...';
                    const freshRes = await fetch('/api/cobalt', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-Cobalt-Target': currentUrl.endsWith('/') ? currentUrl : currentUrl + '/'
                        },
                        body: JSON.stringify(requestData)
                    });
                    if (freshRes.ok) {
                        const freshData = await freshRes.json();
                        if (freshData.url) {
                            downloadUrl = freshData.url;
                        } else {
                            throw new Error('El servidor de respaldo no devolvió un enlace fresco.');
                        }
                    } else {
                        throw new Error('Error al obtener el enlace de descarga fresco del servidor.');
                    }
                }

                unclogBtnText.innerText = 'DESCARGANDO...';
                unclogBtnIcon.classList.remove('animate-spin');
                showToast('DESCARGANDO', `Tu navegador iniciará la descarga en breve${fallbackMsg}...`, 'info');

                // Mostrar barra de progreso simulada para descarga por redirección del navegador
                const cobaltFilename = data.filename || 'video.mp4';
                showProgressCard(cobaltFilename);
                resetProgressBar(cobaltFilename);
                // Animación de barra indeterminada para cobalt redirect (no tenemos stream)
                const progressBarFill = document.getElementById('progress-bar-fill');
                const progressStatus = document.getElementById('progress-status');
                const progressStats = document.getElementById('progress-stats');
                const progressSpeed = document.getElementById('progress-speed');
                if (progressBarFill) {
                    progressBarFill.style.transition = 'width 8s ease-out';
                    progressBarFill.style.width = '90%';
                }
                if (progressStats) progressStats.textContent = 'Iniciando descarga...';
                if (progressSpeed) progressSpeed.textContent = 'Velocidad: dependiente del navegador';

                // Descarga a través del proxy para evitar CORS en túneles
                window.location.assign(`/api/cobalt-download?url=${encodeURIComponent(downloadUrl)}`);
                
                // Agregar al historial
                const cleanTitle = data.filename
                    ? data.filename.replace(/ \([^)]*\)\.mp4$/, '').replace(/\.mp4$/, '')
                    : 'Video sin título';

                const historyItem = {
                    id: Date.now().toString(),
                    title: cleanTitle,
                    url: urlValue,
                    downloadUrl: data.url,
                    format: selectedFormat,
                    quality: selectedQuality,
                    timestamp: Date.now()
                };

                appHistory.unshift(historyItem);
                localStorage.setItem('yt_unclogged_history', JSON.stringify(appHistory));
                renderHistory();

                setTimeout(() => {
                    showToast('ÉXITO', `¡Descarga iniciada! Revisa tu gestor de descargas.${fallbackMsg}`, 'success');
                    urlInput.value = '';
                    urlInput.dispatchEvent(new Event('input'));
                    // Marcar como completado y ocultar después
                    if (progressStatus) progressStatus.textContent = 'COMPLETADO ✓';
                    if (progressBarFill) { progressBarFill.style.width = '100%'; progressBarFill.style.transition = 'width 0.3s'; }
                    setTimeout(() => hideProgressCard(), 4000);
                }, 2500);

                success = true;
                break;
            } else if (data.status === 'picker') {
                throw new Error('Las listas de reproducción completas no son soportadas en descargas directas. Pega un video individual.');
            } else {
                throw new Error('Estado de respuesta desconocido del servidor de Cobalt.');
            }

        } catch (error) {
            console.warn(`Intento con ${currentUrl} falló:`, error);
            lastError = error;

            // Si es un error crítico irreversible del usuario, abortamos de inmediato sin recorrer respaldos
            if (error.message && (
                error.message.includes('listas de reproducción') || 
                error.message.includes('enlace proporcionado no es soportado') ||
                error.message.includes('roto')
            )) {
                break;
            }
        }
    }

    if (!success) {
        if (useRapid) {
            showToast('FALLBACK', 'Cobalt falló. Intentando con RapidAPI...', 'info');
            unclogBtnText.innerText = 'USANDO RAPIDAPI...';
            const rapidVideoId = getYoutubeVideoId(urlValue);
            const fallbackApiKey = appSettings.apiKey || '79af032004mshfea6d6648d84e89p1edabbjsnecb4ea28e382';
            
            try {
                // Siempre usar el proxy local para evitar CORS
                const rapidRes = await fetch(`/api/rapidapi?videoId=${encodeURIComponent(rapidVideoId)}`, {
                    method: 'GET',
                    headers: {
                        'x-rapidapi-key': fallbackApiKey
                    }
                });
                if (!rapidRes.ok) {
                    const err = await rapidRes.json().catch(() => ({}));
                    throw new Error(err.message || `RapidAPI error ${rapidRes.status}`);
                }
                const rapidData = await rapidRes.json();
                
                let videoUrl = null;
                let audioUrl = null;
                let finalDownloadUrl = null;
                let requiresMerge = false;

                if (selectedFormat === 'mp3') {
                    if (!rapidData.audios || !rapidData.audios.items || rapidData.audios.items.length === 0) {
                        throw new Error('RapidAPI response missing audio URLs');
                    }
                    finalDownloadUrl = rapidData.audios.items[0].url;
                } else {
                    if (!rapidData.videos || !rapidData.videos.items || rapidData.videos.items.length === 0) {
                        throw new Error('RapidAPI response missing video URLs');
                    }
                    
                    // Buscar la calidad preferida o la más alta disponible
                    let videoItem = rapidData.videos.items.find(v => v.quality === selectedQuality + 'p');
                    
                    if (!appSettings.combineFfmpeg) {
                        // Si FFmpeg está desactivado, FORZAR buscar una calidad que ya traiga audio nativo (usualmente 720p o 360p)
                        // para evitar entregar un video mudo.
                        if (!videoItem || !videoItem.hasAudio) {
                            videoItem = rapidData.videos.items.find(v => v.hasAudio) || rapidData.videos.items[0];
                            if (videoItem && videoItem.hasAudio) {
                                showToast('INFO', `El video se descargará en ${videoItem.quality} para incluir audio sin usar FFmpeg.`, 'info');
                            }
                        }
                    } else {
                        if (!videoItem) {
                            videoItem = rapidData.videos.items[0]; // Fallback al primero
                        }
                    }
                    
                    videoUrl = videoItem.url;
                    
                    // Si el video no tiene audio, necesitamos extraer también el audio
                    if (!videoItem.hasAudio) {
                        if (rapidData.audios && rapidData.audios.items && rapidData.audios.items.length > 0) {
                            audioUrl = rapidData.audios.items[0].url;
                            requiresMerge = true;
                        }
                    } else {
                        finalDownloadUrl = videoUrl;
                    }
                }

                // Logica de combinacion FFmpeg
                if (requiresMerge && videoUrl && audioUrl) {
                    if (appSettings.combineFfmpeg) {
                        unclogBtnText.innerText = 'COMBINANDO...';
                        showToast('PROCESANDO', 'Descargando y combinando audio y video...', 'info');
                        try {
                            const [{ FFmpeg }, { default: coreURL }, { default: wasmURL }] = await Promise.all([
                                import('@ffmpeg/ffmpeg'),
                                import('@ffmpeg/core?url'),
                                import('@ffmpeg/core/wasm?url')
                            ]);
                            
                            const ffmpeg = new FFmpeg();
                            ffmpeg.on('log', ({ message }) => {
                                console.log('FFmpeg:', message);
                            });
                            
                            unclogBtnText.innerText = 'CARGANDO FFMPEG...';
                            await ffmpeg.load({
                                coreURL,
                                wasmURL
                            });
                            
                            // Descargar video y audio por separado pero MOSTRANDO BARRA DE PROGRESO
                            unclogBtnText.innerText = 'BAJANDO VIDEO...';
                            const videoBuffer = await fetchBufferWithProgress(`/api/cobalt-download?url=${encodeURIComponent(videoUrl)}`, "Descargando pista de Video (1/2)...");
                            ffmpeg.writeFile('video.mp4', videoBuffer);
                            
                            unclogBtnText.innerText = 'BAJANDO AUDIO...';
                            const audioBuffer = await fetchBufferWithProgress(`/api/cobalt-download?url=${encodeURIComponent(audioUrl)}`, "Descargando pista de Audio (2/2)...");
                            ffmpeg.writeFile('audio.m4a', audioBuffer);
                            
                            unclogBtnText.innerText = 'COMBINANDO...';
                            showProgressCard('Procesando archivo final... por favor espera.');
                            
                            await ffmpeg.exec(['-i', 'video.mp4', '-i', 'audio.m4a', '-c', 'copy', 'output.mp4']);
                            
                            const data = await ffmpeg.readFile('output.mp4');
                            const blob = new Blob([data.buffer], { type: 'video/mp4' });
                            finalDownloadUrl = URL.createObjectURL(blob);
                            
                            showToast('ÉXITO', 'Streams combinados correctamente.', 'success');
                        } catch (ffErr) {
                            console.error('Error in FFmpeg processing:', ffErr);
                            throw new Error('Error al combinar audio y video en el cliente.');
                        }
                    } else {
                        // Fallback to downloading video only (sin audio) a través del proxy si todo falla
                        finalDownloadUrl = `/api/cobalt-download?url=${encodeURIComponent(videoUrl)}`;
                    }
                }

                if (!finalDownloadUrl) {
                    throw new Error('No se pudo determinar el enlace final de descarga de RapidAPI.');
                }


                
                // Iniciar descarga con barra de progreso
                const fileExt = selectedFormat === 'mp3' ? 'mp3' : 'mp4';
                const filename = safeFilename(rapidData.title, fileExt);
                if (finalDownloadUrl.startsWith('blob:')) {
                    // If FFmpeg produced a blob, download it directly (no progress needed)
                    const a = document.createElement('a');
                    a.href = finalDownloadUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } else if (finalDownloadUrl.startsWith('/api/')) {
                    // Already proxied URL — use streaming download with progress
                    await downloadWithProgress(finalDownloadUrl, filename);
                } else {
                    // External URL (googlevideo etc) — route through proxy to avoid CORS
                    await downloadWithProgress(`/api/cobalt-download?url=${encodeURIComponent(finalDownloadUrl)}`, filename);
                }

                // Add to history (simplified)
                const historyItem = {
                    id: Date.now().toString(),
                    title: rapidData.title || 'Video sin título',
                    url: urlValue,
                    downloadUrl: finalDownloadUrl,
                    format: selectedFormat,
                    quality: selectedQuality,
                    timestamp: Date.now()
                };
                appHistory.unshift(historyItem);
                localStorage.setItem('yt_unclogged_history', JSON.stringify(appHistory));
                renderHistory();
                success = true;
            } catch (err) {
                console.warn('RapidAPI fallback failed:', err);
                lastError = err;
            }
        }

        if (!success) {
            console.error('Todos los servidores fallaron. Último error:', lastError);
            // Mejorar el mensaje de error cuando todos fallan por youtube.login
            let friendlyMsg = 'Error al conectar con todos los servidores. Verifica tu conexión o cambia de servidor en Ajustes.';
            if (lastError && lastError.message) {
                friendlyMsg = `Error: ${lastError.message}`;
            }
            showToast('ERROR AL DESCARGAR', friendlyMsg, 'error');
        }
    }

    // Reestablecer estados del botón en cualquier caso al terminar
    urlInput.disabled = false;
    unclogBtnText.innerText = 'UNCLOG';
    unclogBtnIcon.innerText = 'download';
    unclogBtnIcon.classList.remove('animate-spin');

    // Si el campo de URL está vacío (porque se completó la descarga con éxito y se limpió)
    if (urlInput.value.trim() === '') {
        const previewCard = document.getElementById('video-preview-card');
        if (previewCard) {
            previewCard.classList.add('opacity-0');
            setTimeout(() => {
                previewCard.classList.add('hidden');
                previewCard.classList.remove('flex');
            }, 300);
        }
    }

    updateButtonState();
}

// Utilidades para validación de URL y Previsualización
function checkUrlValidity(value) {
    let clean = value.trim();
    if (!clean) return false;

    // Prevención de inyecciones simples
    if (clean.includes(' ') || clean.toLowerCase().startsWith('javascript:') || clean.toLowerCase().startsWith('data:')) {
        return false;
    }

    if (!/^https?:\/\//i.test(clean)) {
        clean = 'https://' + clean;
    }
    try {
        const u = new URL(clean);
        return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.') && u.hostname.length > 3;
    } catch (_) {
        return false;
    }
}

function updateButtonState() {
    const value = urlInput.value.trim();
    const isValid = checkUrlValidity(value);

    if (isValid) {
        unclogBtn.disabled = false;
        unclogBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none', 'bg-surface-container-high', 'text-secondary/40');
        unclogBtn.classList.add('bg-primary-fixed', 'text-on-primary-fixed');
    } else {
        unclogBtn.disabled = true;
        unclogBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none', 'bg-surface-container-high', 'text-secondary/40');
        unclogBtn.classList.remove('bg-primary-fixed', 'text-on-primary-fixed');
    }
}

async function handleUrlPreview(value) {
    const previewCard = document.getElementById('video-preview-card');
    const previewThumbnail = document.getElementById('preview-thumbnail');
    const previewPlatform = document.getElementById('preview-platform');
    const previewAuthor = document.getElementById('preview-author');
    const previewTitle = document.getElementById('preview-title');
    const previewDomain = document.getElementById('preview-domain');

    if (!previewCard) return;

    const clean = value.trim();
    if (!checkUrlValidity(clean)) {
        previewCard.classList.add('opacity-0');
        setTimeout(() => {
            previewCard.classList.add('hidden');
            previewCard.classList.remove('flex');
        }, 300);
        return;
    }

    let urlWithProtocol = clean;
    if (!/^https?:\/\//i.test(clean)) {
        urlWithProtocol = 'https://' + clean;
    }

    const url = new URL(urlWithProtocol);
    const domain = url.hostname.replace('www.', '');

    const isYoutube = domain.includes('youtube.com') || domain.includes('youtu.be');
    const isTiktok = domain.includes('tiktok.com');
    const isInstagram = domain.includes('instagram.com');
    const isTwitter = domain.includes('twitter.com') || domain.includes('x.com');

    previewCard.classList.remove('hidden');
    previewCard.classList.add('flex');
    setTimeout(() => {
        previewCard.classList.remove('opacity-0');
    }, 10);

    previewDomain.innerText = domain;

    if (isYoutube) {
        previewPlatform.innerText = 'YouTube';
        previewPlatform.className = 'px-2 py-0.5 text-[9px] font-label-bold uppercase bg-red-600 text-white border border-transparent';
        previewAuthor.innerText = 'Cargando canal...';
        previewTitle.innerText = 'Cargando detalles del video...';
        previewThumbnail.src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=200&auto=format&fit=crop';

        try {
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(urlWithProtocol)}&format=json`;
            const response = await fetch(oembedUrl);
            if (response.ok) {
                const metadata = await response.json();
                previewTitle.innerText = metadata.title;
                previewAuthor.innerText = metadata.author_name;
                previewThumbnail.src = metadata.thumbnail_url;
            } else {
                throw new Error('oEmbed no disponible');
            }
        } catch (e) {
            const ytId = getYoutubeVideoId(urlWithProtocol);
            if (ytId) {
                previewTitle.innerText = 'Video de YouTube';
                previewAuthor.innerText = 'Canal de YouTube';
                previewThumbnail.src = `https://i3.ytimg.com/vi/${ytId}/mqdefault.jpg`;
            } else {
                previewTitle.innerText = 'Video de YouTube (Enlace de reproducción)';
                previewAuthor.innerText = 'YouTube';
                previewThumbnail.src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=250&auto=format&fit=crop';
            }
        }
    } else {
        let platformColor = 'bg-primary-fixed text-on-primary-fixed';
        let platformName = 'Enlace Web';
        let thumbUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=250&auto=format&fit=crop';

        if (isTiktok) {
            platformName = 'TikTok';
            platformColor = 'bg-black text-white border border-pink-500';
            thumbUrl = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=250&auto=format&fit=crop';
        } else if (isInstagram) {
            platformName = 'Instagram';
            platformColor = 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white';
            thumbUrl = 'https://images.unsplash.com/photo-1611224885990-ab7363d1f2a9?q=80&w=250&auto=format&fit=crop';
        } else if (isTwitter) {
            platformName = 'Twitter / X';
            platformColor = 'bg-zinc-900 text-white border border-zinc-700';
            thumbUrl = 'https://images.unsplash.com/photo-1611605698335-8b15d27e03f9?q=80&w=250&auto=format&fit=crop';
        }

        previewPlatform.innerText = platformName;
        previewPlatform.className = `px-2 py-0.5 text-[9px] font-label-bold uppercase ${platformColor}`;
        previewAuthor.innerText = domain.toUpperCase();
        previewTitle.innerText = 'CONTENIDO LISTO PARA DESCARGAR';
        previewThumbnail.src = thumbUrl;
    }
}

function getYoutubeVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Event listener para validar la URL en tiempo real y mostrar portada
let previewTimeout;
urlInput.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    updateButtonState();

    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
        handleUrlPreview(value);
    }, 400);
});

// Event Listeners para Modales
openSettingsBtn.addEventListener('click', () => {
    initSettingsInputs();
    openModal(settingsModal);
});
closeSettingsBtn.addEventListener('click', () => closeModal(settingsModal));
resetSettingsBtn.addEventListener('click', resetSettings);
saveSettingsBtn.addEventListener('click', saveSettings);

openHistoryBtn.addEventListener('click', () => {
    renderHistory();
    openModal(historyModal);
});
closeHistoryBtn.addEventListener('click', () => closeModal(historyModal));
closeHistoryBtn2.addEventListener('click', () => closeModal(historyModal));
clearHistoryBtn.addEventListener('click', clearHistory);

// Eventos de los modales de DMCA, Privacy y Terms
openDmcaBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(dmcaModal); });
closeDmcaBtn.addEventListener('click', () => closeModal(dmcaModal));
closeDmcaBtn2.addEventListener('click', () => closeModal(dmcaModal));

openPrivacyBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(privacyModal); });
closePrivacyBtn.addEventListener('click', () => closeModal(privacyModal));
closePrivacyBtn2.addEventListener('click', () => closeModal(privacyModal));

openTermsBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(termsModal); });
closeTermsBtn.addEventListener('click', () => closeModal(termsModal));
closeTermsBtn2.addEventListener('click', () => closeModal(termsModal));

// Event listener para el botón de descarga
unclogBtn.addEventListener('click', handleDownload);

// Permitir presionar Enter en el input de URL
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleDownload();
    }
});

closeToastBtn.addEventListener('click', hideToast);

// Cerrar modales haciendo clic fuera del neo-card
[settingsModal, historyModal, dmcaModal, privacyModal, termsModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
});

// Cambiar la visualización de calidades disponibles según el formato
document.querySelectorAll('input[name="format"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const qualityContainer = document.querySelector('input[name="quality"]').closest('.neo-card');
        if (e.target.value === 'mp3') {
            // Si es MP3, las opciones de resolución se atenúan y se indica que se usará la calidad de audio configurada en ajustes.
            qualityContainer.classList.add('opacity-40', 'pointer-events-none');
            showToast('INFO', 'Formato MP3 seleccionado. La calidad de audio se ajusta en el botón de Configuración superior.', 'info');
        } else {
            qualityContainer.classList.remove('opacity-40', 'pointer-events-none');
        }
    });
});

// Inicializar inputs al cargar la página
initSettingsInputs();
renderHistory();