function renderVynkProfile(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; // Clean canvas
    
    // Set Theme Variables
    if (data.theme) {
        document.documentElement.style.setProperty('--primary-color', data.theme.primaryColor || '#EF6F7C');
        const r = parseInt(data.theme.primaryColor.slice(1,3), 16) || 239;
        const g = parseInt(data.theme.primaryColor.slice(3,5), 16) || 111;
        const b = parseInt(data.theme.primaryColor.slice(5,7), 16) || 124;
        document.documentElement.style.setProperty('--primary-color-transparent', `rgba(${r}, ${g}, ${b}, 0.2)`);
        document.documentElement.style.setProperty('--bg-dark', data.theme.backgroundColor || '#0A0A0A');
    }

    // 1. Header / Hero
    if (data.header) {
        const headerEl = document.createElement('div');
        headerEl.className = 'vynk-header';
        
        let avatarHtml = '';
        if (data.header.avatar) {
            avatarHtml = `<div class="vynk-avatar-wrap">
                <img src="${data.header.avatar}" alt="${data.header.name}" class="vynk-avatar" />
                ${data.header.badge ? `<span class="vynk-badge-float">${data.header.badge}</span>` : ''}
            </div>`;
        }
        
        headerEl.innerHTML = `
            ${avatarHtml}
            <h1 class="vynk-name">${data.header.name || ''}</h1>
            <p class="vynk-bio">${data.header.bio || ''}</p>
        `;
        container.appendChild(headerEl);
    }

    // 2. Blocks Iteration
    if (data.blocks && Array.isArray(data.blocks)) {
        data.blocks.forEach(block => {
            const blockEl = document.createElement('div');
            blockEl.className = 'vynk-block';
            
            if (block.type === 'hero_link') {
                blockEl.classList.add('vynk-hero-link');
                blockEl.innerHTML = `
                    <div class="block-content">
                        <div class="block-title">${block.title}</div>
                        <div class="block-meta">${block.meta}</div>
                    </div>
                    <div class="block-action">
                        <span class="badge-accent">${block.badge || 'Link'}</span>
                    </div>
                `;
                blockEl.onclick = () => window.open(block.url, '_blank');
            } 
            else if (block.type === 'social_grid') {
                blockEl.classList.add('vynk-social-grid-container'); // Container without padding
                let gridHtml = `<div class="vynk-social-grid">`;
                block.items.forEach(item => {
                    gridHtml += `
                        <a href="${item.url}" target="_blank" class="vynk-social-item">
                            <span class="social-icon">${item.icon}</span>
                            <span class="social-label">${item.label}</span>
                        </a>
                    `;
                });
                gridHtml += `</div>`;
                blockEl.innerHTML = gridHtml;
            }
            else if (block.type === 'location_map') {
                blockEl.classList.add('vynk-location-map');
                blockEl.innerHTML = `
                    <div class="map-header">
                        <h2>${block.title}</h2>
                        <p>${block.subtitle}</p>
                    </div>
                    <div class="map-visual">
                        <div class="map-placeholder">[ Interactive Map View ]</div>
                    </div>
                    <div class="map-details">
                        <div class="loc-name">${block.locationName}</div>
                        <div class="loc-address">${block.address}</div>
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
