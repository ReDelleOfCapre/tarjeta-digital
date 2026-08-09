// ============================================
// My ID — Analytics Dashboard Logic
// ============================================
(function() {
  if (!checkAuth()) return;

  var user = getUser();
  if (!user) { logout(); return; }

  document.getElementById('user-name').textContent = user.nombre;
  document.getElementById('btn-logout').addEventListener('click', logout);

  var profileSelect = document.getElementById('profile-select');
  var visitsChartInstance = null;
  var eventsChartInstance = null;

  // Detect dark mode
  var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var textColor = isDark ? '#f2f2f7' : '#1c1c1e';
  var gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  // Format event names for display
  function formatEventName(evento) {
    var names = {
      'visita': 'Visita',
      'click_whatsapp': 'WhatsApp',
      'click_llamar': 'Llamada',
      'click_email': 'Email',
      'descarga_vcard': 'Contacto (vCard)',
      'click_mapa': 'Mapa',
      'click_red_social': 'Red Social',
      'ver_archivo': 'Archivo'
    };
    return names[evento] || evento;
  }

  // Define chart colors
  var chartColors = [
    '#34C759', // Green
    '#007AFF', // Blue
    '#FF9500', // Orange
    '#FF3B30', // Red
    '#AF52DE', // Purple
    '#5856D6', // Indigo
    '#FFCC00', // Yellow
    '#5AC8FA'  // Teal
  ];

  function init() {
    // Check if ID is passed in URL
    var urlParams = new URLSearchParams(window.location.search);
    var preselectedId = urlParams.get('id');

    // Load profiles
    api('/perfiles').then(function(data) {
      if (!data || data.error) return;
      var perfiles = Array.isArray(data) ? data : (data.perfiles || []);
      
      if (perfiles.length === 0) {
        showToast('No tienes tarjetas creadas', 'warning');
        return;
      }

      // Populate selector
      profileSelect.innerHTML = '';
      perfiles.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nombre_perfil + ' (' + (p.tipo || 'personal') + ')';
        if (preselectedId && String(p.id) === String(preselectedId)) {
          opt.selected = true;
        }
        profileSelect.appendChild(opt);
      });

      if (perfiles.length > 1) {
        profileSelect.classList.remove('hidden');
      }

      // Load analytics for current/selected profile
      loadAnalytics(profileSelect.value);
      // Handle change
      profileSelect.addEventListener('change', function() {
        loadAnalytics(this.value);
      });
    }).catch(function(err) {
      console.error(err);
      alert('Error al cargar datos. Reintente.');
    });
  }

  function loadAnalytics(perfilId) {
    if (!perfilId) return;

    api('/estadisticas/perfiles/' + perfilId + '/estadisticas')
      .then(function(data) {
        if (!data || data.error) {
          showToast(data.error || 'Error cargando estadísticas', 'error');
          return;
        }
        renderDashboard(data);
      })
      .catch(function(err) {
        showToast('Error cargando estadísticas', 'error');
      });
  }

  function renderDashboard(data) {
    var eventos = data.eventos || {};
    var tendencia = data.tendencia || [];
    var visitasTotal = data.visitas_total || 0;

    // Calculate totals
    var interaccionesTotal = 0;
    var topEvent = null;
    var maxEventCount = -1;

    var eventsLabels = [];
    var eventsData = [];
    var eventsBgColors = [];

    var i = 0;
    for (var key in eventos) {
      if (key !== 'visita') { // Don't count normal visits as interactions
        interaccionesTotal += eventos[key];
        
        eventsLabels.push(formatEventName(key));
        eventsData.push(eventos[key]);
        eventsBgColors.push(chartColors[i % chartColors.length]);

        if (eventos[key] > maxEventCount) {
          maxEventCount = eventos[key];
          topEvent = key;
        }
        i++;
      }
    }

    var conversionRate = visitasTotal > 0 ? ((interaccionesTotal / visitasTotal) * 100).toFixed(1) : 0;

    // Update Stats
    document.getElementById('stat-visits').textContent = visitasTotal;
    document.getElementById('stat-interactions').textContent = interaccionesTotal;
    document.getElementById('stat-conversion').textContent = conversionRate + '%';
    document.getElementById('stat-top-event').textContent = topEvent ? formatEventName(topEvent) : '-';

    // Prepare line chart data (tendencia)
    var lineLabels = [];
    var lineData = [];
    
    // Reverse array to show oldest first if API returns descending, or just map if it's already ascending
    tendencia.forEach(function(item) {
      // Format date: YYYY-MM-DD to DD/MM
      var dateParts = item.fecha.split('-');
      var formattedDate = dateParts.length === 3 ? dateParts[2] + '/' + dateParts[1] : item.fecha;
      lineLabels.push(formattedDate);
      lineData.push(item.visitas);
    });

    renderLineChart(lineLabels, lineData);
    renderDoughnutChart(eventsLabels, eventsData, eventsBgColors);
    renderActivityFeed(tendencia);
  }

  function renderLineChart(labels, data) {
    var ctx = document.getElementById('visitsChart').getContext('2d');
    
    if (visitsChartInstance) {
      visitsChartInstance.destroy();
    }

    // Gradient fill
    var gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, isDark ? 'rgba(10, 132, 255, 0.5)' : 'rgba(0, 122, 255, 0.5)');
    gradient.addColorStop(1, isDark ? 'rgba(10, 132, 255, 0.0)' : 'rgba(0, 122, 255, 0.0)');

    var accentColor = isDark ? '#0A84FF' : '#007AFF';

    visitsChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Visitas',
          data: data,
          borderColor: accentColor,
          backgroundColor: gradient,
          borderWidth: 3,
          pointBackgroundColor: accentColor,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: isDark ? 'rgba(28,28,30,0.9)' : 'rgba(255,255,255,0.9)',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: gridColor,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, maxTicksLimit: 7 }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor, borderDash: [5, 5] },
            ticks: { color: textColor, precision: 0 }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

  function renderDoughnutChart(labels, data, bgColors) {
    var ctx = document.getElementById('eventsChart').getContext('2d');
    
    if (eventsChartInstance) {
      eventsChartInstance.destroy();
    }

    if (data.length === 0) {
      // Empty state
      eventsChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Sin interacciones'],
          datasets: [{
            data: [1],
            backgroundColor: [isDark ? '#3a3a3c' : '#e5e5ea'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: textColor } },
            tooltip: { enabled: false }
          },
          cutout: '70%'
        }
      });
      return;
    }

    eventsChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: isDark ? '#1c1c1e' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(28,28,30,0.9)' : 'rgba(255,255,255,0.9)',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: gridColor,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8
          }
        },
        cutout: '70%'
      }
    });
  }

  function renderActivityFeed(tendencia) {
    var list = document.getElementById('activity-list');
    list.innerHTML = '';

    if (!tendencia || tendencia.length === 0) {
      var emptyItem = document.createElement('li');
      emptyItem.className = 'activity-item';
      emptyItem.innerHTML = '<div class="activity-date">Sin actividad reciente</div>';
      list.appendChild(emptyItem);
      return;
    }

    // Sort to show newest first for the activity list
    var sorted = [].concat(tendencia).reverse();

    sorted.forEach(function(item) {
      if (item.visitas > 0) {
        var li = document.createElement('li');
        li.className = 'activity-item';
        
        var dateObj = new Date(item.fecha);
        var dateStr = isNaN(dateObj.getTime()) ? item.fecha : dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
        
        li.innerHTML = '<div class="activity-date">' + dateStr + '</div>' +
                       '<div class="activity-count">' + item.visitas + ' visitas</div>';
        list.appendChild(li);
      }
    });
  }

  // Initialize
  init();
})();
