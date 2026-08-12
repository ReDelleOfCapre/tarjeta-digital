function renderVynkProfile(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; // Clean canvas
    
    // Set Theme Variables
    if (data.theme) {
        const primaryColor = data.theme.primaryColor || '#EF6F7C';
        document.documentElement.style.setProperty('--primary-color', primaryColor);
        const r = parseInt(primaryColor.slice(1,3), 16) || 239;
        const g = parseInt(primaryColor.slice(3,5), 16) || 111;
        const b = parseInt(primaryColor.slice(5,7), 16) || 124;
        document.documentElement.style.setProperty('--primary-color-transparent', `rgba(${r}, ${g}, ${b}, 0.2)`);
        document.documentElement.style.setProperty('--bg-dark', data.theme.backgroundColor || '#0A0A0A');
    }

    // 1. Header / Hero - Avatar Hydration with Instant Rendering & Elegant Fallback
    const headerData = data.header || {};
    const avatarUrl = headerData.avatar || headerData.avatar_url || data.avatar_url || data.foto_url || '';
    const name = headerData.name || data.nombre_perfil || data.name || '';
    const bio = headerData.bio || data.bio || '';
    const badge = headerData.badge || '';

    const headerEl = document.createElement('div');
    headerEl.className = 'vynk-header';
    
    let avatarHtml = '';
    if (avatarUrl && avatarUrl.trim() !== '') {
        avatarHtml = `<div class="vynk-avatar-wrap">
            <img src="${avatarUrl}" alt="${name}" class="vynk-avatar avatar" onerror="this.onerror=null;this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';" />
            <div class="vynk-avatar avatar-fallback" style="display:none;background:var(--primary-color,#007AFF);align-items:center;justify-content:center;font-size:2rem;font-weight:700;color:#FFF">${(name || 'V').substring(0,2).toUpperCase()}</div>
            ${badge ? `<span class="vynk-badge-float">${badge}</span>` : ''}
        </div>`;
    } else {
        const initials = (name || 'V').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        avatarHtml = `<div class="vynk-avatar-wrap">
            <div class="vynk-avatar avatar-fallback" style="background:var(--primary-color,#007AFF);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;color:#FFF">${initials}</div>
            ${badge ? `<span class="vynk-badge-float">${badge}</span>` : ''}
        </div>`;
    }
    
    headerEl.innerHTML = `
        ${avatarHtml}
        <h1 class="vynk-name">${name}</h1>
        <p class="vynk-bio">${bio}</p>
    `;
    container.appendChild(headerEl);

    // 2. Blocks Iteration (Bento Grid Only - Zero Floating Buttons)
    if (data.blocks && Array.isArray(data.blocks)) {
        data.blocks.forEach(block => {
            const blockEl = document.createElement('div');
            blockEl.className = 'vynk-block';
            
            if (block.type === 'hero_link' || block.type === 'whatsapp') {
                blockEl.classList.add('vynk-hero-link');
                blockEl.innerHTML = `
                    <div class="block-content">
                        <div class="block-title">${block.title || 'WhatsApp Directo'}</div>
                        <div class="block-meta">${block.meta || 'Atención inmediata'}</div>
                    </div>
                    <div class="block-action">
                        <span class="badge-accent">${block.badge || 'Responde rápido'}</span>
                    </div>
                `;
                if (block.url) blockEl.onclick = () => window.open(block.url, '_blank');
            } 
            else if (block.type === 'social_grid' || block.type === 'social_icons') {
                blockEl.classList.add('vynk-social-grid-container');
                let gridHtml = `<div class="vynk-social-grid">`;
                const items = block.items || block.redes || [];
                items.forEach(item => {
                    gridHtml += `
                        <a href="${item.url}" target="_blank" class="vynk-social-item">
                            <span class="social-icon">${item.icon || '🔗'}</span>
                            <span class="social-label">${item.label || item.tipo || ''}</span>
                        </a>
                    `;
                });
                gridHtml += `</div>`;
                blockEl.innerHTML = gridHtml;
            }
            else if (block.type === 'location_map' || block.type === 'ubicacion') {
                blockEl.classList.add('vynk-location-map');
                blockEl.innerHTML = `
                    <div class="map-header">
                        <h2>${block.title || 'Nuestra Ubicación'}</h2>
                        <p>${block.subtitle || ''}</p>
                    </div>
                    <div class="map-visual">
                        <div class="map-placeholder">[ Interactive Map View ]</div>
                    </div>
                    <div class="map-details">
                        <div class="loc-name">${block.locationName || block.title || ''}</div>
                        <div class="loc-address">${block.address || block.direccion || ''}</div>
                        <div class="dist-display">— <small>km</small></div>
                        <button class="btn-calculate" onclick="alert('Calculando GPS...')">Calcular mi distancia</button>
                    </div>
                `;
            }
            container.appendChild(blockEl);
        });
    }
}
window.renderVynkProfile = renderVynkProfile;
