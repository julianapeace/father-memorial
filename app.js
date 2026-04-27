(function () {
  "use strict";

  const data = window.MEMORIAL_DATA;
  if (!data) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stackHtml(obj) {
    if (!obj || typeof obj.en !== "string") return "";
    const zh = typeof obj.zh === "string" ? obj.zh : "";
    return `<span class="bilingual-inline"><span class="en">${escapeHtml(obj.en)}</span><span class="zh">${escapeHtml(zh)}</span></span>`;
  }

  function dotJoin(en, zh) {
    return `${escapeHtml(en)} · ${escapeHtml(zh)}`;
  }

  function str(key) {
    return data.strings[key] || { en: "", zh: "" };
  }

  function videoById(id) {
    return data.videos.find((v) => v.id === id);
  }

  function clearThemePlayer() {
    const shell = $("#theme-inline-player");
    if (shell) shell.innerHTML = "";
    themePlayingVideoId = null;
    const meta = $("#theme-player-now-title");
    if (meta) meta.innerHTML = "";
    const ps = $("#theme-player-section");
    if (ps) ps.hidden = true;
  }

  function applyContent() {
    const n = data.name;
    document.title = `${n.en} · ${n.zh}`;

    $("#brand").innerHTML = stackHtml(str("pageTitle"));
    $("#skip-link").innerHTML = stackHtml(str("skipToContent"));

    $("#welcome-name").innerHTML = stackHtml(n);
    $("#welcome-dates").innerHTML = stackHtml(data.dates);
    $("#welcome-line").innerHTML = stackHtml(data.welcomeLine);
    $("#welcome-line").classList.add("bilingual-block");

    $("#themes-heading").innerHTML = stackHtml(str("themesLabel"));
  }

  function youtubeThumb(id) {
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  function youtubeEmbedUrl(videoId, opts) {
    const autoplay = opts && opts.autoplay !== false ? "1" : "0";
    const mute = opts && opts.mute ? "1" : "0";
    const q = new URLSearchParams({
      autoplay,
      mute,
      controls: "1",
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
      fs: "1",
    });
    return `https://www.youtube-nocookie.com/embed/${videoId}?${q}`;
  }

  function renderWelcome() {
    const hero = $("#hero-img");
    hero.src = data.heroUrl;
    hero.alt = `${data.name.en} · ${data.name.zh}`;
  }

  function renderIntroVideo() {
    const wrap = $("#intro-video-wrap");
    const heading = $("#intro-video-heading");
    const shell = $("#intro-video-shell");
    if (!wrap || !heading || !shell) return;

    const fv = data.frontPageVideo;
    const rawId = fv && typeof fv.youtubeId === "string" ? fv.youtubeId.trim() : "";
    if (!rawId) {
      wrap.hidden = true;
      shell.innerHTML = "";
      heading.innerHTML = "";
      return;
    }

    wrap.hidden = false;
    heading.innerHTML = fv.title ? stackHtml(fv.title) : "";

    shell.innerHTML = "";
    const iframe = document.createElement("iframe");
    const t = fv.title;
    iframe.title =
      t && typeof t.en === "string" && typeof t.zh === "string"
        ? `${t.en} · ${t.zh}`
        : t && typeof t.en === "string"
          ? t.en
          : "Memorial video";
    iframe.setAttribute("allowfullscreen", "");
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.src = youtubeEmbedUrl(rawId, { autoplay: true, mute: false });
    shell.appendChild(iframe);
  }

  function setActiveThemeCard(themeId) {
    $$("#theme-grid .theme-card").forEach((b) => {
      const on = Boolean(themeId && b.dataset.theme === themeId);
      b.classList.toggle("is-selected", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function renderThemeGrid() {
    const grid = $("#theme-grid");
    grid.innerHTML = "";
    data.themes.forEach((th) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "theme-card";
      b.dataset.theme = th.id;
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = `<p class="theme-bilingual compact">${dotJoin(th.en, th.zh)}</p>`;
      grid.appendChild(b);
    });
    setActiveThemeCard(currentThemeId);
  }

  let currentThemeId = null;
  let themePlayingVideoId = null;

  function openTheme(themeId) {
    clearThemePlayer();
    currentThemeId = themeId;
    themePlayingVideoId = null;
    const th = data.themes.find((x) => x.id === themeId);
    $("#theme-videos-title").textContent = th ? `${th.en} · ${th.zh}` : themeId;

    const gallery = $("#theme-video-gallery");
    const playerSection = $("#theme-player-section");
    const detail = $("#theme-detail");
    if (!gallery || !playerSection || !detail) {
      return;
    }

    gallery.innerHTML = "";
    detail.removeAttribute("hidden");
    detail.hidden = false;

    const vids = data.videos.filter(
      (v) => Array.isArray(v.themes) && v.themes.includes(themeId),
    );
    if (vids.length === 0) {
      playerSection.hidden = true;
      const empty = document.createElement("div");
      empty.className = "silent-banner gallery-empty";
      empty.innerHTML = stackHtml({
        en: "No videos in this theme yet.",
        zh: "此主题下暂无视频。",
      });
      gallery.appendChild(empty);
    } else {
      vids.forEach((v) => gallery.appendChild(renderGalleryTile(v)));
      playVideoInThemeView(vids[0].id);
    }

    setActiveThemeCard(themeId);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        detail.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function refreshThemeVideoSelection() {
    $$("#theme-video-gallery .gallery-tile").forEach((tile) => {
      tile.classList.toggle("is-current", tile.dataset.videoId === themePlayingVideoId);
    });
  }

  function playVideoInThemeView(videoId) {
    const v = videoById(videoId);
    if (!v) return;
    themePlayingVideoId = videoId;

    const playerSection = $("#theme-player-section");
    playerSection.hidden = false;

    const shell = $("#theme-inline-player");
    shell.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.title = `${v.title.en} · ${v.title.zh}`;
    iframe.setAttribute("allowfullscreen", "");
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.src = youtubeEmbedUrl(v.youtubeId, { autoplay: true, mute: false });
    shell.appendChild(iframe);

    $("#theme-player-now-title").innerHTML = stackHtml(v.title);

    refreshThemeVideoSelection();
  }

  function renderGalleryTile(v) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "gallery-tile";
    tile.dataset.videoId = v.id;
    tile.setAttribute(
      "aria-label",
      `${v.title.en} · ${v.title.zh}`,
    );
    const pick = () => playVideoInThemeView(v.id);
    tile.addEventListener("click", pick);

    const frame = document.createElement("div");
    frame.className = "gallery-tile__frame";
    const img = document.createElement("img");
    img.src = youtubeThumb(v.youtubeId);
    img.alt = "";
    img.width = 480;
    img.height = 270;
    img.loading = "eager";
    img.decoding = "async";
    frame.appendChild(img);

    const cap = document.createElement("div");
    cap.className = "gallery-tile__caption";
    cap.innerHTML = stackHtml(v.title);

    tile.appendChild(frame);
    tile.appendChild(cap);
    return tile;
  }

  function renderDynamicViews() {
    applyContent();
    renderWelcome();
    renderIntroVideo();
    renderThemeGrid();
    if (currentThemeId) openTheme(currentThemeId);
  }

  function bind() {
    const themeGrid = $("#theme-grid");
    if (themeGrid) {
      themeGrid.addEventListener("click", (e) => {
        const card = e.target.closest(".theme-card");
        if (!card || !card.dataset.theme) return;
        openTheme(card.dataset.theme);
      });
    }

    $("#brand").addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  bind();
  renderDynamicViews();
})();
