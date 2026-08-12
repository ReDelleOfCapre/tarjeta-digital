(function () {
  if (!checkAuth()) return;

  var BLOCK_TYPES = [
    { tipo: "link", label: "Link destacado", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7\"/><path d=\"M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7\"/></svg>", color: "#4C6FFF" },
    { tipo: "ubicacion", label: "Ubicacion", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z\"/><circle cx=\"12\" cy=\"9\" r=\"2.4\"/></svg>", color: "#EF6F7C" },
    { tipo: "whatsapp", label: "WhatsApp", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M21 12a8 8 0 0 1-8 8H4l3-3a8 8 0 1 1 14-5z\"/></svg>", color: "#25D366" },
    { tipo: "social_icons", label: "Redes", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z\"/></svg>", color: "#B86AF6" },
    { tipo: "galeria", label: "Galeria", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><rect x=\"3\" y=\"6\" width=\"18\" height=\"14\" rx=\"2\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/><path d=\"M8.5 6l1-2h5l1 2\"/></svg>", color: "#EC4899" },
    { tipo: "wishlist", label: "Wishlist", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><rect x=\"3\" y=\"8\" width=\"18\" height=\"13\" rx=\"1\"/><path d=\"M12 8v13\"/><path d=\"M3 12h18\"/><path d=\"M12 8c-2.5 0-4-1.5-4-3.5S10 2 12 4s2 4.5 0 6z\"/></svg>", color: "#E8A33D" },
    { tipo: "pdf", label: "PDF", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z\"/><path d=\"M14 3v6h6M9 13h6M9 17h4\"/></svg>", color: "#F35B5B" },
    { tipo: "pago", label: "Pago", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M2 10h20\"/><path d=\"M6 15h4\"/></svg>", color: "#32B47E" },
    { tipo: "nota", label: "Nota", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z\"/></svg>", color: "#F59E0B" },
    { tipo: "seccion", label: "Seccion", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\"1.4\"/></svg>", color: "#7A68F8" },
    { tipo: "spotify", label: "Spotify", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/></svg>", color: "#1DB954" },
    { tipo: "youtube", label: "YouTube", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M6 4l14 8-14 8V4z\"/></svg>", color: "#FF3131" },
    { tipo: "tiktok", label: "TikTok", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5\"/></svg>", color: "#111111" },
    { tipo: "texto", label: "Texto libre", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z\"/></svg>", color: "#8C8A95" },
    { tipo: "email_capture", label: "Captura email", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m4 7 8 6 8-6\"/></svg>", color: "#F97316" },
    { tipo: "countdown", label: "Cuenta regresiva", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M7 3h10M7 21h10\"/><path d=\"M8 3v6l-4 9h16l-4-9V3\"/><path d=\"M12 12v3\"/></svg>", color: "#FF6B70" }
  ];

  var SOCIAL_TYPES = [
    { tipo: "instagram", label: "Instagram", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><rect x=\"3\" y=\"6\" width=\"18\" height=\"14\" rx=\"2\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/><path d=\"M8.5 6l1-2h5l1 2\"/></svg>" },
    { tipo: "tiktok", label: "TikTok", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/></svg>" },
    { tipo: "twitter", label: "X", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg>" },
    { tipo: "youtube", label: "YouTube", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M6 4l14 8-14 8V4z\"/></svg>" },
    { tipo: "facebook", label: "Facebook", icon: "f" },
    { tipo: "linkedin", label: "LinkedIn", icon: "in" },
    { tipo: "spotify", label: "Spotify", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/></svg>" },
    { tipo: "github", label: "GitHub", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><path d=\"M9 9V5a3 3 0 1 0-3 3h4z\"/><path d=\"M15 9V5a3 3 0 1 1 3 3h-4z\"/><path d=\"M15 15v4a3 3 0 1 1-3-3h3z\"/><path d=\"M9 15v4a3 3 0 1 0 3-3H9z\"/></svg>" },
    { tipo: "web", label: "Sitio", icon: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"width:1.2em;height:1.2em;vertical-align:-0.18em\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\"/></svg>" }
  ];

  var THEMES = [
    {
      id: "auto",
      name: "Camaleon",
      note: "Usa tu foto o logo",
      preview: "linear-gradient(135deg, #E8A33D, #EF6F7C)"
    },
    {
      id: "editorial",
      name: "Editorial",
      note: "Calido y premium",
      preview: "linear-gradient(135deg, #251f2e, #3a2d27)"
    },
    {
      id: "graphite",
      name: "Graphite",
      note: "Sobrio y nitido",
      preview: "linear-gradient(135deg, #11131A, #2A3345)"
    },
    {
      id: "coast",
      name: "Coast",
      note: "Limpio y vibrante",
      preview: "linear-gradient(135deg, #0F2B36, #1F6B6C)"
    },
    {
      id: "paper",
      name: "Paper",
      note: "Claro y elegante",
      preview: "linear-gradient(135deg, #F4EEE3, #DCC8A4)"
    },
    {
      id: "velvet",
      name: "Velvet",
      note: "Contraste profundo",
      preview: "linear-gradient(135deg, #261229, #53205B)"
    },
    {
      id: "forest",
      name: "Bosque",
      note: "Natural y calmado",
      preview: "linear-gradient(135deg, #0F231B, #2F6B4F)"
    },
    {
      id: "sunset",
      name: "Atardecer",
      note: "Calido al anochecer",
      preview: "linear-gradient(135deg, #2A1220, #CD5C2B)"
    },
    {
      id: "midnight",
      name: "Medianoche",
      note: "Azul profundo y sereno",
      preview: "linear-gradient(135deg, #0B1430, #36A3F5)"
    },
    {
      id: "champagne",
      name: "Champagne",
      note: "Claro, calido y elegante",
      preview: "linear-gradient(135deg, #F7EFDE, #C9B279)"
    },
    {
      id: "mint",
      name: "Menta",
      note: "Fresco y luminoso",
      preview: "linear-gradient(135deg, #E8F4EC, #7FBF9C)"
    },
    {
      id: "rose",
      name: "Rosa",
      note: "Suave y romantico",
      preview: "linear-gradient(135deg, #FBE9EE, #E05E8C)"
    }
  ];

  var editId = new URLSearchParams(location.search).get("id");
  var selectedTheme = "auto";
  var selectedColor = "#E8A33D";
  var autoExtractedColor = null;
  var blocks = [];
  var profileSlug = null;
  var editingBlockIdx = null;
  var currentStep = 1;

  renderThemePicker();
  renderPalette();
  renderBlockList();
  setupEvents();
  updateStepUI();
  updateLivePreview();

  if (editId) {
    var titleEl = document.getElementById("page-title");
    if (titleEl) titleEl.textContent = "Editar identidad digital";
    loadExisting(editId);
  }

  function setupEvents() {
    [
      "nombre_perfil",
      "tipo_perfil",
      "bio_perfil",
      "cumpleanos",
      "lugar_estudio",
      "pronombres",
      "marco_estilo"
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", updateLivePreview);
      el.addEventListener("change", updateLivePreview);
    });

    var saveBtn = document.getElementById("btn-save");
    var finalBtn = document.getElementById("btn-final-save");
    if (saveBtn) saveBtn.addEventListener("click", saveAll);
    if (finalBtn) finalBtn.addEventListener("click", saveAll);

    setupColorPicker();
    setupPhotoUpload();
    setupSortableDragAndDrop();
  }

  function renderThemePicker() {
    var container = document.getElementById("theme-picker");
    if (!container) return;

    container.innerHTML = THEMES.map(function (theme) {
      var active = theme.id === selectedTheme ? " active" : "";
      return (
        '<button type="button" class="theme-card' + active + '" data-theme-id="' + escapeHtml(theme.id) + '">' +
          '<div class="theme-surface" style="background:' + theme.preview + '">' +
            "<span></span><span></span>" +
          "</div>" +
          '<div class="theme-head"><strong>' + escapeHtml(theme.name) + "</strong>" +
            '<small class="theme-meta">' + escapeHtml(theme.id) + "</small></div>" +
          '<div style="color:var(--editor-muted);font-size:0.78rem;line-height:1.45">' + escapeHtml(theme.note) + "</div>" +
        "</button>"
      );
    }).join("");

    container.querySelectorAll("[data-theme-id]").forEach(function (node) {
      node.addEventListener("click", function () {
        selectedTheme = node.getAttribute("data-theme-id") || "auto";
        renderThemePicker();
        updateLivePreview();
      });
    });
  }

  function renderPalette() {
    var container = document.getElementById("block-palette");
    if (!container) return;

    container.innerHTML = BLOCK_TYPES.map(function (block) {
      return (
        '<button type="button" class="block-chip" data-block-type="' + escapeHtml(block.tipo) + '">' +
          '<div style="font-size:1.12rem">' + block.icon + "</div>" +
          "<strong>" + escapeHtml(block.label) + "</strong>" +
          "<span>Agregar al preview</span>" +
        "</button>"
      );
    }).join("");

    container.querySelectorAll("[data-block-type]").forEach(function (node) {
      node.addEventListener("click", function () {
        showBlockForm(node.getAttribute("data-block-type"));
      });
    });
  }

  function setupColorPicker() {
    var options = document.querySelectorAll(".color-option");
    options.forEach(function (option) {
      option.addEventListener("click", function () {
        options.forEach(function (current) {
          current.classList.remove("active");
        });
        option.classList.add("active");
        selectedColor = option.getAttribute("data-color") || "#E8A33D";
        updateLivePreview();
      });
    });

    var defaultOption = document.querySelector('.color-option[data-color="' + selectedColor + '"]');
    if (defaultOption) defaultOption.classList.add("active");
  }

  function setupPhotoUpload() {
    var input = document.getElementById("input-foto");
    if (!input) return;

    input.addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showToast("Maximo 5MB", "error");
        return;
      }

      var reader = new FileReader();
      reader.onload = function (loadEvent) {
        var src = loadEvent.target.result;
        var photoPreview = document.getElementById("photo-preview");
        var avatarBox = document.getElementById("prev-avatar-box");
        if (photoPreview) photoPreview.innerHTML = '<img src="' + src + '" alt="preview">';
        if (avatarBox) avatarBox.innerHTML = '<img src="' + src + '" alt="avatar">';

        var img = new Image();
        img.onload = function () {
          extractDominantColorFromImage(img);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  }

  function setupSortableDragAndDrop() {
    var blockList = document.getElementById("block-list");
    if (!blockList || !window.Sortable) return;
    window.Sortable.create(blockList, {
      animation: 150,
      handle: ".drag-handle",
      onEnd: function (evt) {
        if (evt.oldIndex === evt.newIndex) return;
        var moved = blocks.splice(evt.oldIndex, 1)[0];
        blocks.splice(evt.newIndex, 0, moved);
        normalizeOrder();
        renderBlockList();
      }
    });
  }

  function extractDominantColorFromImage(imgEl) {
    try {
      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      canvas.width = 56;
      canvas.height = 56;
      ctx.drawImage(imgEl, 0, 0, 56, 56);
      var data = ctx.getImageData(0, 0, 56, 56).data;
      var bucket = {};

      for (var i = 0; i < data.length; i += 4) {
        var r = data[i];
        var g = data[i + 1];
        var b = data[i + 2];
        var a = data[i + 3];
        if (a < 120) continue;
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        if (max - min < 24) continue;
        var key = [
          Math.round(r / 24) * 24,
          Math.round(g / 24) * 24,
          Math.round(b / 24) * 24
        ].join(",");
        bucket[key] = (bucket[key] || 0) + 1;
      }

      var best = Object.keys(bucket).sort(function (a, b) {
        return bucket[b] - bucket[a];
      })[0];

      if (!best) return;
      var parts = best.split(",");
      autoExtractedColor = rgbToHex(Number(parts[0]), Number(parts[1]), Number(parts[2]));
      if (selectedTheme === "auto") updateLivePreview();
    } catch (error) {
      console.error("No se pudo extraer color:", error);
    }
  }

  function updateLivePreview() {
    var accent = selectedTheme === "auto" && autoExtractedColor ? autoExtractedColor : selectedColor;
    var theme = buildTheme(selectedTheme, accent);
    applyTheme(theme);
    renderIdentity(theme);
    renderPreviewBlocks(theme);
  }

  function renderIdentity(theme) {
    var name = gv("nombre_perfil") || "Tu nombre";
    var type = gv("tipo_perfil") || "personal";
    var bio = gv("bio_perfil") || "Tu narrativa principal aparecera aqui con el nuevo sistema visual.";
    var marcoEstilo = gv("marco_estilo") || "gradient";

    setText("prev-name", name);
    setText("prev-type", type);
    setText("prev-bio", bio);

    var initialsEl = document.getElementById("prev-avatar-initials");
    if (initialsEl) initialsEl.textContent = getInitials(name);

    var avatarBox = document.getElementById("prev-avatar-box");
    if (avatarBox) {
      if (marcoEstilo === "none") {
        avatarBox.style.background = "rgba(255,255,255,0.08)";
        avatarBox.style.boxShadow = "none";
      } else if (marcoEstilo === "solid") {
        avatarBox.style.background = theme.surface;
        avatarBox.style.boxShadow = "inset 0 0 0 3px " + theme.primary;
      } else {
        avatarBox.style.background = "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))";
        avatarBox.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.06)";
      }
    }
  }

  function renderPreviewBlocks(theme) {
    var container = document.getElementById("prev-blocks");
    if (!container) return;

    if (!blocks.length) {
      container.innerHTML = '<div class="preview-empty">Tus bloques apareceran aqui en cuanto los agregues.</div>';
      return;
    }

    var locationBlocks = blocks.filter(function (block) { return block.tipo === "ubicacion"; });
    var otherBlocks = blocks.filter(function (block) { return block.tipo !== "ubicacion"; });
    var parts = [];

    if (otherBlocks.length) {
      var first = otherBlocks[0];
      parts.push(renderPrimaryPreview(first));
      otherBlocks.slice(1).forEach(function (block) {
        parts.push(renderSecondaryPreview(block));
      });
    }

    if (locationBlocks.length) {
      parts.push(renderLocationCluster(locationBlocks));
    }

    container.innerHTML = parts.join("");
  }

  function renderPrimaryPreview(block) {
    var icon = blockIcon(block.tipo);
    var content = block.contenido || {};
    var title = previewTitle(block);
    var meta = previewMeta(block);

    return (
      '<div class="preview-cta">' +
        "<span>" + icon + " " + escapeHtml(title) + "</span>" +
        '<small style="opacity:0.78">' + escapeHtml(meta || "Listo") + "</small>" +
      "</div>"
    );
  }

  function renderSecondaryPreview(block) {
    var content = block.contenido || {};
    var title = previewTitle(block);
    var meta = previewMeta(block);

    if (block.tipo === "texto" || block.tipo === "nota" || block.tipo === "seccion") {
      return (
        '<div class="preview-card">' +
          "<h3>" + escapeHtml(title) + "</h3>" +
          "<p>" + escapeHtml(meta || "Contenido libre") + "</p>" +
        "</div>"
      );
    }

    if (block.tipo === "whatsapp") {
      return (
        '<div class="preview-row" style="border-left: 3px solid #25D366; background: rgba(37, 211, 102, 0.08);">' +
          '<div class="preview-icon" style="background:#25D366;color:#fff;border-radius:10px;display:grid;place-items:center;width:34px;height:34px"><i class="fab fa-whatsapp"></i></div>' +
          '<div class="preview-row-copy">' +
            '<strong style="color:var(--phone-text)">' + escapeHtml(title || "WhatsApp Directo") + "</strong>" +
            '<span style="color:#25D366;font-size:0.75rem">⚡ Responde rápido</span>' +
          "</div>" +
        "</div>"
      );
    }

    return (
      '<div class="preview-row">' +
        '<div class="preview-icon">' + blockIcon(block.tipo) + "</div>" +
        '<div class="preview-row-copy">' +
          "<strong>" + escapeHtml(title) + "</strong>" +
          "<span>" + escapeHtml(meta || fallbackMeta(block, content)) + "</span>" +
        "</div>" +
      "</div>"
    );
  }

  function renderLocationCluster(locationBlocks) {
    var lead = locationBlocks[0];
    var leadContent = lead.contenido || {};
    var pins = locationBlocks.slice(0, 4).map(function (block, index) {
      var coords = [
        { top: "64%", left: "24%" },
        { top: "36%", left: "58%" },
        { top: "70%", left: "76%" },
        { top: "26%", left: "82%" }
      ][index] || { top: "50%", left: "50%" };
      return (
        '<div class="location-pin" style="top:' + coords.top + ";left:" + coords.left + '"></div>'
      );
    }).join("");

    var list = locationBlocks.map(function (block, index) {
      var content = block.contenido || {};
      var label = content.titulo || "Sucursal " + (index + 1);
      var hint = content.horario || content.direccion || "Ubicacion disponible";
      return (
        '<div class="location-list-item">' +
          "<span>" + escapeHtml(label) + "</span>" +
          '<small style="color:var(--phone-muted)">' + escapeHtml(trimPreview(hint, 30)) + "</small>" +
        "</div>"
      );
    }).join("");

    return (
      '<div class="preview-location-shell">' +
        '<div class="location-map">' +
          '<div class="location-map-grid"></div>' +
          pins +
        "</div>" +
        '<div class="location-ticket">' +
          "<strong>" + escapeHtml(leadContent.titulo || "Ubicaciones") + "</strong>" +
          "<p>" + escapeHtml(leadContent.direccion || "Selecciona la sede mas cercana desde tu tarjeta.") + "</p>" +
          '<div class="location-meta-row">' +
            '<span class="location-pill">' + escapeHtml(locationBlocks.length + " sedes activas") + "</span>" +
            (leadContent.horario ? '<span class="location-pill">' + escapeHtml(leadContent.horario) + "</span>" : "") +
          "</div>" +
          '<div class="location-list">' + list + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function buildTheme(themeId, accent) {
    var primary = accent || "#E8A33D";
    if (themeId === "paper") {
      return {
        background: "#F2E9DC",
        surface: "#FFFFFF",
        card: "#F3E7D6",
        text: "#211D19",
        muted: "#6C6258",
        primary: primary,
        secondary: mixHex(primary, "#F7D5A6", 0.55),
        onPrimary: readableText(primary)
      };
    }

    if (themeId === "coast") {
      return {
        background: mixHex(primary, "#0F2730", 0.82),
        surface: mixHex(primary, "#173843", 0.84),
        card: mixHex(primary, "#1C3E41", 0.72),
        text: "#F4F3EF",
        muted: "rgba(244,243,239,0.68)",
        primary: primary,
        secondary: mixHex(primary, "#78D7C6", 0.48),
        onPrimary: readableText(primary)
      };
    }

    if (themeId === "graphite") {
      return {
        background: mixHex(primary, "#0E1118", 0.92),
        surface: mixHex(primary, "#1D2430", 0.88),
        card: mixHex(primary, "#2A3342", 0.76),
        text: "#F6F3EE",
        muted: "rgba(246,243,238,0.66)",
        primary: primary,
        secondary: mixHex(primary, "#97A9FF", 0.44),
        onPrimary: readableText(primary)
      };
    }

    if (themeId === "velvet") {
      return {
        background: mixHex(primary, "#1A0E1E", 0.84),
        surface: mixHex(primary, "#2B1430", 0.74),
        card: mixHex(primary, "#4D2050", 0.68),
        text: "#FFF7F7",
        muted: "rgba(255,247,247,0.68)",
        primary: primary,
        secondary: mixHex(primary, "#F4A3C8", 0.52),
        onPrimary: readableText(primary)
      };
    }

    if (themeId === "editorial") {
      return {
        background: mixHex(primary, "#1B171D", 0.86),
        surface: mixHex(primary, "#2B242A", 0.78),
        card: mixHex(primary, "#392C32", 0.67),
        text: "#F8F4EF",
        muted: "rgba(248,244,239,0.68)",
        primary: primary,
        secondary: mixHex(primary, "#F7D08A", 0.46),
        onPrimary: readableText(primary)
      };
    }

    if (themeId === "forest") {
      return {
        background: mixHex(primary, "#0F231B", 0.86),
        surface: mixHex(primary, "#1B3A2B", 0.78),
        card: mixHex(primary, "#2C533F", 0.66),
        text: "#F2F5EC",
        muted: "rgba(242,245,236,0.68)",
        primary: primary,
        secondary: mixHex(primary, "#8FD0A8", 0.48),
        onPrimary: readableText(primary)
      };
    }

    if (themeId === "sunset") {
      return {
        background: mixHex(primary, "#241018", 0.84),
        surface: mixHex(primary, "#3A1B22", 0.74),
        card: mixHex(primary, "#6E2F24", 0.6),
        text: "#FFF6EF",
        muted: "rgba(255,246,239,0.68)",
        primary: primary,
        secondary: mixHex(primary, "#FFB27A", 0.5),
        onPrimary: readableText(primary)
      };
    }

    if (themeId === "midnight") {
      return {
        background: mixHex(primary, "#070D22", 0.9),
        surface: mixHex(primary, "#14203F", 0.8),
        card: mixHex(primary, "#213258", 0.68),
        text: "#F4F6FF",
        muted: "rgba(244,246,255,0.68)",
        primary: primary,
        secondary: mixHex(primary, "#7FD8FF", 0.45),
        onPrimary: readableText(primary)
      };
    }

    if (themeId === "champagne") {
      return {
        background: "#F3EADB",
        surface: "#FFFBEF",
        card: "#EFE1C6",
        text: "#2C2418",
        muted: "#7A6A50",
        primary: primary,
        secondary: mixHex(primary, "#E7C99A", 0.5),
        onPrimary: readableText(primary)
      };
    }

    if (themeId === "mint") {
      return {
        background: "#E9F4EE",
        surface: "#FFFFFF",
        card: "#DDEFE4",
        text: "#16301F",
        muted: "#4F7260",
        primary: primary,
        secondary: mixHex(primary, "#A9E2C4", 0.5),
        onPrimary: readableText(primary)
      };
    }

    if (themeId === "rose") {
      return {
        background: "#FBEAF0",
        surface: "#FFFFFF",
        card: "#F6DCE7",
        text: "#33202A",
        muted: "#7A5666",
        primary: primary,
        secondary: mixHex(primary, "#F4A8C4", 0.45),
        onPrimary: readableText(primary)
      };
    }

    return {
      background: mixHex(primary, "#17151B", 0.84),
      surface: mixHex(primary, "#2A2630", 0.78),
      card: mixHex(primary, "#3A3342", 0.68),
      text: "#F8F4EF",
      muted: "rgba(248,244,239,0.68)",
      primary: primary,
      secondary: mixHex(primary, "#FFD59B", 0.52),
      onPrimary: readableText(primary)
    };
  }

  function applyTheme(theme) {
    var frame = document.getElementById("smartphone-frame");
    if (!frame) return;
    frame.style.setProperty("--phone-bg", theme.background);
    frame.style.setProperty("--phone-surface", theme.surface);
    frame.style.setProperty("--phone-card", theme.card);
    frame.style.setProperty("--phone-primary", theme.primary);
    frame.style.setProperty("--phone-secondary", theme.secondary);
    frame.style.setProperty("--phone-text", theme.text);
    frame.style.setProperty("--phone-muted", theme.muted);
    frame.style.setProperty("--phone-on-primary", theme.onPrimary);
    frame.style.background = theme.background;
    frame.style.color = theme.text;
    frame.style.boxShadow = "0 26px 54px -28px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)";
    frame.setAttribute("data-theme", selectedTheme);
  }

  function showBlockForm(tipo) {
    if (editingBlockIdx === null) editingBlockIdx = null;
    var area = document.getElementById("block-form-area");
    if (!area) return;

    var existing = editingBlockIdx !== null && blocks[editingBlockIdx] ? blocks[editingBlockIdx].contenido || {} : {};
    var isEdit = editingBlockIdx !== null;
    var html = "";

    html += '<div class="section-title"><div><div class="step-badge">' + (isEdit ? "Editar" : "Nuevo bloque") + "</div>" +
      getBlockLabel(tipo) + '</div><button type="button" class="editor-btn" onclick="hideBlockForm()">Cerrar</button></div>';

    if (tipo === "ubicacion") {
      html += formField("Nombre de sede", "bf-titulo", existing.titulo || "", "Ej. Sede Centro");
      html += formField("Direccion", "bf-direccion", existing.direccion || existing.url || "", "Calle, numero, colonia");
      html += formField("Horario", "bf-horario", existing.horario || existing.subtitulo || "", "Ej. Lun-Sab 9:00-18:00");
      html += formField("Telefono", "bf-telefono", existing.telefono || "", "Ej. +52 55 0000 0000");
      html += formField("Link de mapa", "bf-url", existing.url || "", "https://maps.google.com/?q=...");
      html += '<div class="form-grid cols-2">' +
        formField("Latitud", "bf-lat", existing.lat || "", "19.4326") +
        formField("Longitud", "bf-lng", existing.lng || "", "-99.1332") +
      "</div>";
    } else if (tipo === "link" || tipo === "spotify" || tipo === "youtube" || tipo === "tiktok" || tipo === "wishlist" || tipo === "pdf") {
      html += formField("Titulo", "bf-titulo", existing.titulo || "", "Ej. Agenda una llamada");
      html += formField("URL", "bf-url", existing.url || "", "https://...");
      html += formField("Subtitulo", "bf-sub", existing.subtitulo || "", "Descripcion corta");
    } else if (tipo === "whatsapp") {
      html += formField("Titulo", "bf-titulo", existing.titulo || "WhatsApp Directo", "Ej. Pedidos por WhatsApp");
      html += formField("Numero (con lada)", "bf-tel", existing.numero || existing.url || "", "522311556138");
      html += formField("Mensaje inicial predeterminado", "bf-msg", existing.mensaje_default || "", "Hola, quiero información sobre tus servicios");
    } else if (tipo === "social_icons") {
      html += '<div class="mono-note" style="color:var(--editor-muted);margin-bottom:12px">Completa solo las redes que vayas a mostrar.</div>';
      SOCIAL_TYPES.forEach(function (social) {
        var value = "";
        if (Array.isArray(existing.redes)) {
          var found = existing.redes.find(function (item) { return item.tipo === social.tipo; });
          value = found ? found.url : "";
        }
        html += formField(social.label, "bf-social-" + social.tipo, value, "@usuario o URL");
      });
    } else if (tipo === "texto" || tipo === "nota" || tipo === "seccion") {
      html += '<div class="field"><label for="bf-texto">Texto</label><textarea id="bf-texto" class="form-input" rows="4" placeholder="Escribe aqui">' +
        escapeHtml(existing.texto || existing.titulo || "") + "</textarea></div>";
      if (tipo === "texto") {
        html += '<div class="field"><label for="bf-estilo">Estilo</label><select id="bf-estilo" class="form-select">' +
          '<option value="normal">Normal</option><option value="titulo">Titulo</option><option value="cita">Cita</option>' +
        "</select></div>";
      }
    } else if (tipo === "email_capture") {
      html += formField("Titulo", "bf-titulo", existing.titulo || "", "Suscribete a novedades");
      html += formField("Boton", "bf-btn", existing.boton_texto || "", "Quiero recibir info");
    } else if (tipo === "countdown") {
      html += formField("Titulo", "bf-titulo", existing.titulo || "", "Proximo lanzamiento");
      html += '<div class="field"><label for="bf-fecha">Fecha</label><input id="bf-fecha" class="form-input" type="datetime-local" value="' +
        escapeHtml(existing.fecha_fin || "") + '"></div>';
    } else if (tipo === "pago") {
      html += formField("Banco", "bf-banco", existing.banco || "", "Banco principal");
      html += formField("Beneficiario", "bf-beneficiario", existing.beneficiario || "", "Nombre completo");
      html += formField("CLABE", "bf-clabe", existing.clabe || "", "18 digitos");
    } else {
      html += formField("Titulo", "bf-titulo", existing.titulo || "", "Nombre del bloque");
      html += formField("Detalle", "bf-sub", existing.subtitulo || existing.texto || "", "Descripcion corta");
      html += formField("URL opcional", "bf-url", existing.url || "", "https://...");
    }

    html += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">' +
      '<button type="button" class="editor-btn" onclick="hideBlockForm()">Cancelar</button>' +
      '<button type="button" class="editor-btn primary" onclick="addBlock(\'' + escapeHtml(tipo) + '\')">' +
      (isEdit ? "Actualizar bloque" : "Agregar bloque") + "</button></div>";

    area.innerHTML = html;
    area.classList.remove("hidden");

    var styleSelect = document.getElementById("bf-estilo");
    if (styleSelect && existing.estilo) styleSelect.value = existing.estilo;
  }

  window.hideBlockForm = function () {
    editingBlockIdx = null;
    var area = document.getElementById("block-form-area");
    if (area) area.classList.add("hidden");
  };

  window.addBlock = function (tipo) {
    var content = collectBlockContent(tipo);
    if (!content) return;

    if (editingBlockIdx !== null && blocks[editingBlockIdx]) {
      blocks[editingBlockIdx].tipo = tipo;
      blocks[editingBlockIdx].contenido = content;
      showToast("Bloque actualizado", "success");
    } else {
      blocks.push({
        _tempId: "tmp_" + Date.now(),
        tipo: tipo,
        contenido: content,
        orden: blocks.length
      });
      showToast("Bloque agregado", "success");
    }

    normalizeOrder();
    editingBlockIdx = null;
    hideBlockForm();
    renderBlockList();

    if ((tipo === "link" || tipo === "spotify" || tipo === "youtube" || tipo === "tiktok") && content.url && content.url.indexOf("http") === 0) {
      enrichLinkMetadata(content);
    }
  };

  function collectBlockContent(tipo) {
    if (tipo === "ubicacion") {
      var direccion = gv("bf-direccion");
      if (!direccion) {
        showToast("La direccion es obligatoria", "error");
        return null;
      }
      var titulo = gv("bf-titulo") || "Ubicacion";
      var horario = gv("bf-horario");
      return {
        titulo: titulo,
        direccion: direccion,
        horario: horario,
        telefono: gv("bf-telefono"),
        url: gv("bf-url") || "https://maps.google.com/?q=" + encodeURIComponent(direccion),
        lat: gv("bf-lat"),
        lng: gv("bf-lng"),
        subtitulo: horario || gv("bf-telefono") || ""
      };
    }

    if (tipo === "link" || tipo === "spotify" || tipo === "youtube" || tipo === "tiktok" || tipo === "wishlist" || tipo === "pdf") {
      var url = gv("bf-url");
      if (!url) {
        showToast("La URL es obligatoria", "error");
        return null;
      }
      return {
        titulo: gv("bf-titulo") || url,
        url: url,
        subtitulo: gv("bf-sub")
      };
    }

    if (tipo === "whatsapp") {
      var tel = gv("bf-tel");
      if (!tel) {
        showToast("El numero es obligatorio", "error");
        return null;
      }
      var cleanNum = tel.replace(/[^0-9]/g, "");
      return {
        titulo: gv("bf-titulo") || "WhatsApp Directo",
        numero: cleanNum,
        url: "https://wa.me/" + cleanNum,
        mensaje_default: gv("bf-msg")
      };
    }

    if (tipo === "social_icons") {
      var redes = [];
      SOCIAL_TYPES.forEach(function (social) {
        var value = gv("bf-social-" + social.tipo);
        if (value) redes.push({ tipo: social.tipo, url: value });
      });
      if (!redes.length) {
        showToast("Agrega al menos una red", "error");
        return null;
      }
      return { redes: redes };
    }

    if (tipo === "texto") {
      var texto = gv("bf-texto");
      if (!texto) {
        showToast("El texto es obligatorio", "error");
        return null;
      }
      return { texto: texto, estilo: gv("bf-estilo") || "normal" };
    }

    if (tipo === "nota") {
      var nota = gv("bf-texto");
      if (!nota) {
        showToast("La nota es obligatoria", "error");
        return null;
      }
      return { texto: nota };
    }

    if (tipo === "seccion") {
      var tituloSeccion = gv("bf-texto");
      if (!tituloSeccion) {
        showToast("El titulo es obligatorio", "error");
        return null;
      }
      return { titulo: tituloSeccion };
    }

    if (tipo === "email_capture") {
      return {
        titulo: gv("bf-titulo") || "Suscribete",
        boton_texto: gv("bf-btn") || "Enviar"
      };
    }

    if (tipo === "countdown") {
      var fecha = gv("bf-fecha");
      if (!fecha) {
        showToast("La fecha es obligatoria", "error");
        return null;
      }
      return {
        titulo: gv("bf-titulo") || "Proximo lanzamiento",
        fecha_fin: fecha
      };
    }

    if (tipo === "pago") {
      return {
        banco: gv("bf-banco"),
        beneficiario: gv("bf-beneficiario"),
        clabe: gv("bf-clabe")
      };
    }

    return {
      titulo: gv("bf-titulo") || getBlockLabel(tipo),
      subtitulo: gv("bf-sub"),
      url: gv("bf-url")
    };
  }

  function enrichLinkMetadata(content) {
    api("/metadata", {
      method: "POST",
      body: JSON.stringify({ url: content.url })
    }).then(function (meta) {
      if (!meta) return;
      if (!content.titulo || content.titulo === content.url) content.titulo = meta.title || content.titulo;
      if (!content.subtitulo) content.subtitulo = meta.description || "";
      renderBlockList();
    }).catch(function () {
      showToast("No se pudo leer metadata del enlace", "info");
    });
  }

  function renderBlockList() {
    var container = document.getElementById("block-list");
    if (!container) return;

    if (!blocks.length) {
      container.innerHTML = '<div class="preview-empty">Toca un bloque para empezar a construir tu tarjeta.</div>';
      updateLivePreview();
      return;
    }

    container.innerHTML = blocks.map(function (block, index) {
      return (
        '<div class="block-item-row" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid rgba(255,255,255,0.08);border-radius:18px;margin-bottom:10px">' +
          '<div class="drag-handle" style="cursor:grab;color:var(--editor-faint)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1.15rem;height:1.15rem"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg></div>' +
          '<div style="width:38px;height:38px;border-radius:14px;display:grid;place-items:center;background:' + escapeHtml(blockColor(block.tipo)) + ';color:#fff">' + blockIcon(block.tipo) + "</div>" +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:0.74rem;color:var(--editor-faint);text-transform:uppercase;letter-spacing:0.08em">' + escapeHtml(getBlockLabel(block.tipo)) + "</div>" +
            '<div style="font-size:0.95rem;color:var(--editor-text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(previewTitle(block)) + "</div>" +
            '<div style="font-size:0.78rem;color:var(--editor-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(previewMeta(block)) + "</div>" +
          "</div>" +
          '<div style="display:flex;gap:6px">' +
            '<button type="button" class="editor-btn" style="padding:8px 10px" onclick="moveBlock(' + index + ', -1)" ' + (index === 0 ? "disabled" : "") + '>↑</button>' +
            '<button type="button" class="editor-btn" style="padding:8px 10px" onclick="moveBlock(' + index + ', 1)" ' + (index === blocks.length - 1 ? "disabled" : "") + '>↓</button>' +
            '<button type="button" class="editor-btn" style="padding:8px 10px" onclick="editBlock(' + index + ')">Editar</button>' +
            '<button type="button" class="editor-btn" style="padding:8px 10px;color:#ff9fa3" onclick="removeBlock(' + index + ')">Borrar</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");

    updateLivePreview();
  }

  window.editBlock = function (index) {
    editingBlockIdx = index;
    var block = blocks[index];
    if (!block) return;
    showBlockForm(block.tipo);
  };

  window.removeBlock = function (index) {
    var block = blocks[index];
    if (block && block.id && editId) {
      api("/bloques/" + block.id, { method: "DELETE" }).catch(function () {});
    }
    blocks.splice(index, 1);
    normalizeOrder();
    renderBlockList();
  };

  window.moveBlock = function (index, direction) {
    var target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    var moved = blocks.splice(index, 1)[0];
    blocks.splice(target, 0, moved);
    normalizeOrder();
    renderBlockList();
  };

  window.goStep = function (step) {
    currentStep = Math.max(1, Math.min(3, step));
    updateStepUI();
  };

  window.nextStep = function () {
    if (currentStep === 3) {
      saveAll();
      return;
    }

    if (currentStep === 1 && !gv("nombre_perfil")) {
      showToast("Ingresa el nombre antes de continuar", "error");
      var input = document.getElementById("nombre_perfil");
      if (input) input.focus();
      return;
    }

    currentStep += 1;
    updateStepUI();
  };

  window.prevStep = function () {
    currentStep = Math.max(1, currentStep - 1);
    updateStepUI();
  };

  function updateStepUI() {
    var track = document.getElementById("wizard-track");
    if (track) track.style.transform = "translateX(" + ((currentStep - 1) * -33.333333) + "%)";

    [1, 2, 3].forEach(function (step) {
      var dot = document.getElementById("dot-" + step);
      if (!dot) return;
      dot.classList.remove("active", "done");
      if (step < currentStep) dot.classList.add("done");
      if (step === currentStep) dot.classList.add("active");
    });

    var prevBtn = document.getElementById("btn-prev-step");
    var nextBtn = document.getElementById("btn-next-step");
    if (prevBtn) prevBtn.disabled = currentStep === 1;
    if (nextBtn) nextBtn.textContent = currentStep === 3 ? "Guardar ahora" : "Siguiente";
  }

  function saveAll() {
    var nombre = gv("nombre_perfil");
    if (!nombre) {
      showToast("El nombre es obligatorio", "error");
      var input = document.getElementById("nombre_perfil");
      if (input) input.focus();
      return;
    }

    lockSaveButtons(true);

    var formData = new FormData();
    formData.append("nombre_perfil", nombre);
    formData.append("tipo", gv("tipo_perfil") || "personal");
    formData.append("color", selectedTheme === "auto" && autoExtractedColor ? autoExtractedColor : selectedColor);
    formData.append("tema", selectedTheme);
    formData.append("marco_estilo", gv("marco_estilo") || "gradient");
    formData.append("bio", gv("bio_perfil"));
    formData.append("cumpleanos", gv("cumpleanos"));
    formData.append("lugar_estudio", gv("lugar_estudio"));
    formData.append("pronombres", gv("pronombres"));

    var fotoInput = document.getElementById("input-foto");
    if (fotoInput && fotoInput.files && fotoInput.files[0]) {
      formData.append("foto", fotoInput.files[0]);
    }

    var method = editId ? "PUT" : "POST";
    var endpoint = editId ? "/perfiles/" + editId : "/perfiles";

    api(endpoint, { method: method, body: formData, headers: {} })
      .then(function (profile) {
        if (!profile) throw new Error("No se pudo guardar el perfil");
        var perfilId = profile.id || editId;
        profileSlug = profile.slug || profileSlug;
        updatePreviewButton();

        var requests = blocks.map(function (block, index) {
          var body = JSON.stringify({
            tipo: block.tipo,
            contenido: block.contenido,
            orden: index
          });

          if (block.id) {
            return api("/bloques/" + block.id, { method: "PUT", body: body });
          }

          return api("/perfiles/" + perfilId + "/bloques", {
            method: "POST",
            body: body
          }).then(function (created) {
            if (created && created.id) block.id = created.id;
          });
        });

        return Promise.all(requests);
      })
      .then(function () {
        showToast("Tarjeta guardada con exito", "success");
        lockSaveButtons(false, true);
        setTimeout(function () {
          window.location.replace("/dashboard.html");
        }, 420);
      })
      .catch(function (error) {
        console.error("Error guardando tarjeta:", error);
        showToast(error && (error.error || error.message) ? (error.error || error.message) : "No se pudo guardar", "error");
        lockSaveButtons(false, false);
      });
  }

  function loadExisting(id) {
    api("/perfiles")
      .then(function (profiles) {
        var profile = (profiles || []).find(function (item) { return String(item.id) === String(id); });
        if (!profile) {
          showToast("No se encontro el perfil", "error");
          return null;
        }

        setValue("nombre_perfil", profile.nombre_perfil || "");
        setValue("tipo_perfil", profile.tipo || "personal");
        setValue("bio_perfil", profile.bio || "");
        setValue("cumpleanos", profile.cumpleanos || "");
        setValue("lugar_estudio", profile.lugar_estudio || "");
        setValue("pronombres", profile.pronombres || "");
        setValue("marco_estilo", profile.marco_estilo || "gradient");

        if (profile.tema) selectedTheme = profile.tema;
        if (profile.color) selectedColor = profile.color;
        profileSlug = profile.slug || null;

        var colorOption = document.querySelector('.color-option[data-color="' + selectedColor + '"]');
        if (colorOption) {
          document.querySelectorAll(".color-option").forEach(function (option) {
            option.classList.remove("active");
          });
          colorOption.classList.add("active");
        }

        if (profile.foto_url) {
          var photoPreview = document.getElementById("photo-preview");
          var avatarBox = document.getElementById("prev-avatar-box");
          if (photoPreview) photoPreview.innerHTML = '<img src="' + profile.foto_url + '" alt="foto">';
          if (avatarBox) avatarBox.innerHTML = '<img src="' + profile.foto_url + '" alt="avatar">';
        }

        renderThemePicker();
        updatePreviewButton();
        updateLivePreview();
        return api("/perfiles/" + id + "/bloques");
      })
      .then(function (savedBlocks) {
        if (!savedBlocks || !Array.isArray(savedBlocks)) return;
        blocks = savedBlocks.map(function (block) {
          return {
            id: block.id,
            tipo: block.tipo,
            contenido: typeof block.contenido === "string" ? JSON.parse(block.contenido) : (block.contenido || {}),
            orden: block.orden
          };
        }).sort(function (a, b) {
          return (a.orden || 0) - (b.orden || 0);
        });
        normalizeOrder();
        renderBlockList();
      })
      .catch(function (error) {
        console.error("Error cargando perfil:", error);
        showToast("No se pudo cargar el perfil", "error");
      });
  }

  function updatePreviewButton() {
    var button = document.getElementById("btn-preview");
    if (!button || !profileSlug) return;
    button.href = "/u/" + profileSlug;
    button.classList.remove("hidden");
  }

  function lockSaveButtons(lock, success) {
    var text = lock ? "Guardando..." : (success ? "Guardado" : "Guardar");
    var finalText = lock ? "Guardando..." : (success ? "Guardado" : "Guardar y publicar");
    var navButton = document.getElementById("btn-save");
    var finalButton = document.getElementById("btn-final-save");

    if (navButton) {
      navButton.disabled = !!lock;
      navButton.textContent = text;
    }

    if (finalButton) {
      finalButton.disabled = !!lock;
      finalButton.textContent = finalText;
    }
  }

  function previewTitle(block) {
    var content = block.contenido || {};
    return content.titulo || content.texto || content.numero || content.banco || getBlockLabel(block.tipo);
  }

  function previewMeta(block) {
    var content = block.contenido || {};
    if (block.tipo === "ubicacion") return content.horario || content.direccion || "Mapa y sede";
    if (block.tipo === "whatsapp") return content.numero || "Contacto directo";
    if (block.tipo === "social_icons") return (content.redes ? content.redes.length : 0) + " redes conectadas";
    if (block.tipo === "countdown") return content.fecha_fin || "Cuenta regresiva";
    if (block.tipo === "email_capture") return content.boton_texto || "Formulario";
    if (block.tipo === "pago") return content.beneficiario || content.clabe || "Datos de transferencia";
    return content.subtitulo || content.url || content.texto || "";
  }

  function fallbackMeta(block, content) {
    if (block.tipo === "pdf") return "Documento listo para descargar";
    if (block.tipo === "spotify") return "Reproductor embebido";
    if (block.tipo === "youtube" || block.tipo === "tiktok") return "Contenido multimedia";
    return content.subtitulo || "Bloque activo";
  }

  function blockColor(tipo) {
    var block = BLOCK_TYPES.find(function (item) { return item.tipo === tipo; });
    return block ? block.color : "#8C8A95";
  }

  function blockIcon(tipo) {
    var block = BLOCK_TYPES.find(function (item) { return item.tipo === tipo; });
    return block ? block.icon : "•";
  }

  function getBlockLabel(tipo) {
    var block = BLOCK_TYPES.find(function (item) { return item.tipo === tipo; });
    return block ? block.label : tipo;
  }

  function formField(label, id, value, placeholder) {
    return (
      '<div class="field"><label for="' + escapeHtml(id) + '">' + escapeHtml(label) + "</label>" +
      '<input id="' + escapeHtml(id) + '" class="form-input" type="text" value="' + escapeHtml(String(value || "")) + '" placeholder="' + escapeHtml(String(placeholder || "")) + '"></div>'
    );
  }

  function gv(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function setValue(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value;
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function getInitials(name) {
    return String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0); })
      .join("")
      .toUpperCase() || "V";
  }

  function normalizeOrder() {
    blocks.forEach(function (block, index) {
      block.orden = index;
    });
  }

  function trimPreview(value, size) {
    var text = String(value || "");
    if (text.length <= size) return text;
    return text.slice(0, size - 1) + "…";
  }

  function readableText(hex) {
    var rgb = hexToRgb(hex);
    var luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return luminance > 0.62 ? "#17151B" : "#FFF8F0";
  }

  function hexToRgb(hex) {
    var raw = String(hex || "").replace("#", "");
    if (raw.length === 3) {
      raw = raw.split("").map(function (piece) { return piece + piece; }).join("");
    }
    var int = parseInt(raw, 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255
    };
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(function (value) {
      var safe = Math.max(0, Math.min(255, Math.round(value)));
      return safe.toString(16).padStart(2, "0");
    }).join("").toUpperCase();
  }

  function mixHex(hexA, hexB, weight) {
    var a = hexToRgb(hexA);
    var b = hexToRgb(hexB);
    var ratio = typeof weight === "number" ? weight : 0.5;
    return rgbToHex(
      a.r + (b.r - a.r) * ratio,
      a.g + (b.g - a.g) * ratio,
      a.b + (b.b - a.b) * ratio
    );
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    var div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }

  window.generateAiBio = function() {
    var name = document.getElementById('nombre_perfil') ? document.getElementById('nombre_perfil').value : '';
    var type = document.getElementById('tipo_perfil') ? document.getElementById('tipo_perfil').value : 'negocio';
    var bios = {
      negocio: "Experiencia gastronómica y servicio exclusivo. Conéctate con nosotros en un solo tap.",
      personal: "Consultoría de alto nivel y proyectos de visión global. Diseñando el futuro digital.",
      creador: "Contenido de alta fidelidad, visión estética y narrativa visual independiente.",
      artista: "Proyectos sonoros y dirección creativa. Escucha nuestras producciones en tiempo real.",
      profesional: "Atención personalizada, rigor técnico y excelencia garantizada en cada consulta."
    };
    var bioField = document.getElementById('bio_perfil');
    if (bioField) {
      bioField.value = (name ? name + " — " : "") + (bios[type] || bios.negocio);
      updatePreview();
      if (typeof showToast === 'function') showToast('✨ Narrativa de Lujo Silencioso generada por IA VYNK', 'success');
    }
  };
})();
