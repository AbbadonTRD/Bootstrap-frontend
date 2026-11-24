// ═════════════════════════════════════════════════════════════════════════════
//  Bootstrap Frontend – alle API-Funktionen (jQuery)
// ═════════════════════════════════════════════════════════════════════════════

// ── Konstanten ───────────────────────────────────────────────────────────────
const LAT = 47.3769;        // Zürich
const LON = 8.5417;
const WINT_LAT = 47.4988;   // Winterthur (hardcoded)
const WINT_LON = 8.7237;

const CAT_API     = 'https://api.thecatapi.com/v1/images/search';
const BTC_API     = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,chf';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const EV_API      = 'https://data.geo.admin.ch/ch.bfe.ladestellen-elektromobilitaet/data/ch.bfe.ladestellen-elektromobilitaet.json';
const GEO_SEARCH  = 'https://api3.geo.admin.ch/rest/services/api/SearchServer';
// Kartenebenen wie bei Google Maps: ein Kartentyp, beliebig viele Details, optional 3D
const SWISSTOPO = '&copy; <a href="https://www.swisstopo.admin.ch/" target="_blank">swisstopo</a>';
const ESRI = 'Tiles &copy; <a href="https://www.esri.com/" target="_blank">Esri</a> · HERE, Garmin, &copy; OpenStreetMap';
const ESRI_URL = (name) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${name}/MapServer/tile/{z}/{y}/{x}`;
const WMTS = (layer, ext = 'png') => `https://wmts.geo.admin.ch/1.0.0/${layer}/default/current/3857/{z}/{x}/{y}.${ext}`;
const MAP_TYPES = [
  // building = Farbe der 3D-Gebäude auf diesem Kartentyp
  { id: 'mono',     name: 'Monochrom',        url: ESRI_URL('World_Light_Gray_Base'), labels: ESRI_URL('World_Light_Gray_Reference'), attribution: ESRI, nativeZoom: 16, building: '#d6d6db' },
  { id: 'dark',     name: 'Dunkel',           url: ESRI_URL('World_Dark_Gray_Base'),  labels: ESRI_URL('World_Dark_Gray_Reference'),  attribution: ESRI, nativeZoom: 16, building: '#45454f', night: true },
  { id: 'grau',     name: 'Landeskarte grau', url: WMTS('ch.swisstopo.pixelkarte-grau', 'jpeg'),  attribution: SWISSTOPO, building: '#cfcfd4' },
  { id: 'farbe',    name: 'Landeskarte',      url: WMTS('ch.swisstopo.pixelkarte-farbe', 'jpeg'), attribution: SWISSTOPO, building: '#ece4d4' },
  { id: 'gelaende', name: 'Gelände',          url: WMTS('ch.swisstopo.swissalti3d-reliefschattierung'), labels: ESRI_URL('World_Light_Gray_Reference'), attribution: `${SWISSTOPO} · Esri`, building: '#e6e6ea' },
  { id: 'luft',     name: 'Luftbild',         url: WMTS('ch.swisstopo.swissimage', 'jpeg'),      attribution: SWISSTOPO, building: '#eeeae2' },
];
const MAP_DETAILS = [
  { id: 'ev',       name: 'Ladestationen' },
  { id: 'oev',      name: 'ÖV-Haltestellen', url: WMTS('ch.bav.haltestellen-oev'), minZoom: 15, thumb: [15, 17161, 11474] },   // erst nah sichtbar, sonst zu dicht
  { id: 'bahn',     name: 'Bahnnetz',        url: WMTS('ch.swisstopo.swisstlm3d-eisenbahnnetz') },
  { id: 'velo',     name: 'Velorouten',      url: WMTS('ch.astra.veloland') },
  { id: 'mtb',      name: 'Mountainbike',    url: WMTS('ch.astra.mountainbikeland'), thumb: [12, 2144, 1439] },
  { id: 'wandern',  name: 'Wanderwege',      url: WMTS('ch.swisstopo.swisstlm3d-wanderwege'), thumb: [13, 4289, 2869] },
  { id: 'schatten', name: 'Relief',          url: WMTS('ch.swisstopo.swissalti3d-reliefschattierung'), opacity: 0.35, thumb: [12, 2144, 1439] },
];
// Vorschaubild: eine Kachel in Zürich (Details können eine eigene Kachel wählen, wo es etwas zu sehen gibt)
const thumbOf = (url, z = 13, x = 4290, y = 2868) => url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
const AERIAL_TILE = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg';

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

// Streamline-Icon aus dem SVG-Sprite in index.html
function icon(name, cls = '') {
  return `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

// Text sicher für HTML maskieren
function esc(text) {
  return $('<div>').text(text == null ? '' : String(text)).html();
}

// Luftbild-Kachel (swisstopo SWISSIMAGE) für eine Koordinate
function aerialTile(lat, lon, z = 17) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return AERIAL_TILE.replace('{z}', z).replace('{x}', x).replace('{y}', y);
}

// Button während eines Requests sperren und Icon drehen lassen
function setLoading($btn, loading) {
  $btn.prop('disabled', loading).toggleClass('is-loading', loading);
}

// Kurze Meldung unten einblenden
let toastTimer;
function showToast(message) {
  const $t = $('#toast');
  $t.find('span').text(message);
  $t.addClass('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $t.removeClass('is-visible'), 3200);
}

// Wert mit kurzem Blur-Übergang austauschen
function swapValue($el, text) {
  $el.addClass('is-updating');
  setTimeout(() => $el.text(text).removeClass('is-updating'), 150);
}

// Zahl mit GSAP hoch-/runterzählen (Fallback: sanfter Austausch)
function rollNumber($el, to, format) {
  const from = Number($el.data('value'));
  $el.data('value', to);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || reduce || !isFinite(from)) { swapValue($el, format(to)); return; }
  const o = { v: from };
  gsap.to(o, { v: to, duration: 0.9, ease: 'power3.out', onUpdate: () => $el.text(format(o.v)) });
}

// Distanz zwischen zwei Koordinaten in km (Haversine)
function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Ort / PLZ über die geo.admin.ch SearchServer-API in Koordinaten umwandeln
function geocode(text, origins) {
  return $.getJSON(GEO_SEARCH, { searchText: text, type: 'locations', origins: origins, sr: 4326 })
    .then((data) => {
      const hit = data.results && data.results[0];
      if (!hit) return $.Deferred().reject('not-found').promise();
      return {
        lat: hit.attrs.lat,
        lon: hit.attrs.lon,
        label: $('<div>').html(hit.attrs.label).text(), // <b>-Tags entfernen
      };
    });
}

// ═════════════════════════════════════════════════════════════════════════════
//  Haptisches Feedback (nur Haptik, kein Ton)
//  - iPhone: Seit iOS 26.5 lässt Apple Haptik nicht mehr per Code auslösen. Was geht:
//    der Finger tippt selbst auf einen echten <input type="checkbox" switch>. Darum liegt
//    in jedem antippbaren Element ein unsichtbarer Schalter – aufgebaut exakt wie bei der
//    Bibliothek @haptics (github.com/howdoiusekeyboard/haptics, MIT), die auf 26.5 läuft.
//    → Haptik bei Taps, nicht beim Wischen durch Diagramme (geht auf iOS nicht).
//  - Android: navigator.vibrate() – bei Taps und fein beim Wischen.
//  - Test: ?haptics=test zeigt unten ein Testfeld (sichtbarer Schalter + Knopf).
// ═════════════════════════════════════════════════════════════════════════════
const haptics = (() => {
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const canVibrate = typeof navigator.vibrate === 'function';
  // Elemente mit Haptik beim Antippen
  const TAP = '.mw-day, .wallet-range, .wallet-toggle, .mw-live-toggle, .ml-item, .mw-city-chip, .mw-now-btn, .mw-details-open, .mw-details-back, .ps-choice, .tui-seg .tui-btn, .haptic-test-btn';
  let touch = false;
  let lastScrub = 0;

  document.addEventListener('pointerdown', (e) => { touch = e.pointerType === 'touch'; }, { capture: true, passive: true });
  document.addEventListener('touchstart', () => { touch = true; }, { capture: true, passive: true });

  // ── iPhone: unsichtbarer echter Schalter als Tipp-Ziel (wie @haptics) ──
  const attach = () => {
    document.querySelectorAll(TAP).forEach((host) => {
      if (host.querySelector(':scope > [data-haptic-overlay]')) return;
      const pos = getComputedStyle(host).position;
      if (pos !== 'absolute' && pos !== 'relative' && pos !== 'fixed' && pos !== 'sticky') host.style.position = 'relative';
      const sw = document.createElement('input');
      sw.type = 'checkbox';
      sw.setAttribute('switch', '');
      sw.setAttribute('data-haptic-overlay', '');
      sw.setAttribute('aria-hidden', 'true');
      sw.tabIndex = -1;
      sw.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;'
        + '-webkit-appearance:switch;appearance:auto;opacity:0;cursor:inherit;pointer-events:auto;';
      // Der echte Tipp toggelt den Schalter (→ iOS-Tick); danach wie @haptics: Klick nicht
      // doppelt durchreichen, sondern sauber am Element selbst auslösen.
      sw.addEventListener('click', (e) => {
        e.stopPropagation();
        host.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      host.appendChild(sw);
    });
  };
  if (isIOS) {
    const start = () => {
      attach();
      let t = 0;
      new MutationObserver(() => { clearTimeout(t); t = setTimeout(attach, 60); }).observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }

  // ── iPhone: Ticks beim Wischen über Diagramme ──
  // Technik von haptick (github.com/jcruzfff/haptick, MIT), geprüft im WebKit-Code:
  // WebKit verfolgt einen Schalter, auf dem ein echter Finger aufsetzt, während des
  // ganzen Wischens und vergleicht den Finger bei jeder Bewegung mit der *aktuellen*
  // Lage des Schalters. Schieben wir den (unsichtbaren) Schalter auf die andere Seite
  // des Fingers, kippt er bei der Bewegung → iOS spielt den System-Tick. Kein Klick aus
  // Code nötig, darum geht das auch auf iOS 26.5.
  // Wichtig: nie .checked per JS setzen (WebKit hört dann auf zu verfolgen) und
  // touchstart/touchmove nicht mit preventDefault() abbrechen.
  const ARM_MS = 260;     // WebKit verfolgt erst ~200 ms nach dem Aufsetzen
  const PARK = 10000;     // so weit weg, dass der Schalter ganz auf einer Seite des Fingers liegt
  let drag = null;        // laufendes Wischen: { sw, on, armedAt, queued, moves, parked }
  // left = Schalter links vom Finger → Finger liegt "rechts" auf der Bahn → Daumen nach rechts (an)
  const place = (d, left) => { d.sw.style.transform = `translateX(${left ? -PARK : PARK}px)`; };
  const release = (d, now) => {
    if (!d.queued || now < d.armedAt || d.moves < 2) return false;   // nie zwei Kipper direkt hintereinander
    d.queued = 0;
    d.moves = 0;
    d.parked = true;
    place(d, !d.on);       // auf die Seite, die den Daumen umlegt → Tick
    d.on = !d.on;
    return true;
  };
  const attachDrag = (host, touchAction) => {
    if (!isIOS || !host || host.querySelector(':scope > [data-haptic-drag]')) return;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    const sw = document.createElement('input');
    sw.type = 'checkbox';
    sw.setAttribute('switch', '');
    sw.setAttribute('data-haptic-drag', '');
    sw.setAttribute('aria-hidden', 'true');
    sw.tabIndex = -1;
    sw.style.cssText = 'position:absolute;inset:0;z-index:3;width:100%;height:100%;margin:0;padding:0;border:0;'
      + '-webkit-appearance:auto;appearance:auto;opacity:0;cursor:inherit;-webkit-tap-highlight-color:transparent;';
    sw.style.touchAction = touchAction || 'none';   // gleich wie das Diagramm: Seite scrollt wie vorher
    sw.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { drag = null; return; }
      drag = { sw, on: sw.checked, armedAt: performance.now() + ARM_MS, queued: 0, moves: Infinity, parked: false };
    }, { passive: true });
    // WebKit "klickt" den Schalter am Ende jedes Wischens – das ist kein Tipp aufs Diagramm
    sw.addEventListener('click', (e) => e.stopPropagation());
    host.appendChild(sw);
  };
  if (isIOS) {
    // Vor den Diagrammen (Capture): jede Fingerbewegung zählen, ggf. Tick auslösen,
    // sonst den Schalter einmal aus der Reichweite parken (damit er nicht zufällig kippt)
    window.addEventListener('touchmove', () => {
      if (!drag) return;
      const now = performance.now();
      drag.moves += 1;
      if (release(drag, now) || drag.parked || now < drag.armedAt) return;
      drag.parked = true;
      place(drag, drag.on);
    }, { capture: true, passive: true });
    const end = () => {
      if (!drag) return;
      const { sw } = drag;
      drag = null;
      setTimeout(() => { sw.style.transform = ''; }, 0);   // erst nachdem WebKit das Ende verarbeitet hat
    };
    window.addEventListener('touchend', end, { capture: true, passive: true });
    window.addEventListener('touchcancel', end, { capture: true, passive: true });
  }

  // ── Android: kurze Vibration beim Antippen ──
  document.addEventListener('click', (e) => {
    if (touch && canVibrate && e.target.closest && e.target.closest(`${TAP}, button`)) { try { navigator.vibrate(8); } catch (err) { /* egal */ } }
  }, true);

  // ── Testfeld: ?haptics=test ──
  if (new URLSearchParams(location.search).get('haptics') === 'test') {
    const show = () => {
      const ver = (navigator.userAgent.match(/OS (\d+)_(\d+)/) || []).slice(1).join('.') || '–';
      const box = document.createElement('div');
      box.className = 'haptic-test';
      box.innerHTML = `
        <p class="haptic-test-title">Haptik-Test <button type="button" class="haptic-test-close" aria-label="Schliessen">×</button></p>
        <p class="haptic-test-info">iOS ${ver} · Schalter-Element: ${'switch' in HTMLInputElement.prototype ? 'ja' : 'nein'} · Vibration: ${canVibrate ? 'ja' : 'nein'}</p>
        <label class="haptic-test-row">1 · Sichtbarer iPhone-Schalter <input type="checkbox" switch></label>
        <button type="button" class="haptic-test-btn">2 · Knopf mit unsichtbarem Schalter</button>
        <div class="haptic-test-drag" aria-label="3 · Hier hin und her wischen"><span>3 · Hier hin und her wischen</span><i></i></div>
        <p class="haptic-test-hint">Kein Tick bei 1 → Einstellungen › Töne &amp; Haptik › System-Haptik einschalten.<br>Tick bei 1, aber nicht bei 2 → bitte melden.</p>
        <p class="haptic-test-log" aria-live="polite"></p>`;
      document.body.appendChild(box);
      const log = box.querySelector('.haptic-test-log');
      let n = 0;
      box.querySelector('.haptic-test-btn').addEventListener('click', () => { log.textContent = `Knopf ${++n}× getippt`; });
      // Wischtest: alle 24 px ein Tick, wie beim Wischen durch ein Diagramm
      const pad = box.querySelector('.haptic-test-drag');
      const dot = pad.querySelector('i');
      let lastStep = null, ticks = 0;
      attachDrag(pad, 'none');
      pad.addEventListener('touchmove', (e) => {
        const r = pad.getBoundingClientRect();
        const x = Math.max(0, Math.min(r.width, e.touches[0].clientX - r.left));
        dot.style.transform = `translateX(${x}px)`;
        const step = Math.floor(x / 24);
        if (lastStep != null && step !== lastStep) { ticks += 1; haptics.scrub(); log.textContent = `Wischen: ${ticks} Ticks angefordert`; }
        lastStep = step;
      }, { passive: true });
      pad.addEventListener('touchend', () => { lastStep = null; }, { passive: true });
      box.querySelector('.haptic-test-close').addEventListener('click', () => box.remove());
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
  }

  return {
    // Ein Schritt beim Wischen (Diagramm-Punkt, Stunde im Streifen):
    // iPhone über den mitwandernden Schalter, Android über vibrate()
    scrub() {
      if (drag) { drag.queued = 1; release(drag, performance.now()); return; }
      if (!touch || !canVibrate) return;
      const now = performance.now();
      const gap = now - lastScrub;
      if (gap < 28) return;                       // nie mehr als ~35 Ticks pro Sekunde
      lastScrub = now;
      try { navigator.vibrate(gap < 55 ? 3 : 5); } catch (e) { /* egal */ }
    },
    // Fläche, über die man wischt (Diagramm), für iPhone-Ticks vorbereiten
    attachDrag,
    // Antippen: iPhone über den Schalter, Android über den Klick-Listener oben
    tick() {},
  };
})();

// Beim Wischen über einen Diagramm-Punkt ticken – höchstens alle 12 px, damit dichte
// Kurven (z.B. 290 Bitcoin-Punkte) nicht dauernd brummen
function hapticScrub(point) {
  const chart = point.series.chart;
  const x = point.plotX;
  if (chart.hapticX == null || Math.abs(x - chart.hapticX) >= 12) {
    chart.hapticX = x;
    haptics.scrub();
  }
}
// Für alle Diagramme (Serien mit eigenem mouseOver rufen hapticScrub selbst auf)
if (window.Highcharts) {
  Highcharts.setOptions({ plotOptions: { series: { point: { events: { mouseOver() { hapticScrub(this); } } } } } });
  // iPhone: jedes Diagramm bekommt den mitwandernden Schalter (gleiches touch-action wie
  // das Diagramm – der wischbare Wetter-Streifen scrollt also weiter wie bisher)
  Highcharts.addEvent(Highcharts.Chart, 'load', function () {
    haptics.attachDrag(this.container, getComputedStyle(this.container).touchAction);
  });
}

// Bilder, die nicht laden (Netz, Inhaltsblocker), ausblenden – Safari zeigt sonst ein blaues "?"
document.addEventListener('error', (e) => {
  if (e.target && e.target.tagName === 'IMG') e.target.classList.add('img-broken');
}, true);
document.addEventListener('load', (e) => {
  if (e.target && e.target.tagName === 'IMG') e.target.classList.remove('img-broken');
}, true);

const fmtUSD = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtCHF = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 });

// ── a) Zufälliges Katzenbild ─────────────────────────────────────────────────
function loadCat() {
  const $btn = $('#btn-cat');
  setLoading($btn, true);
  $('#cat-error').addClass('d-none');

  // Skeleton sofort zeigen, bis das Bild geladen ist
  const $img = $('#cat-image').addClass('is-loading');
  $('#cat-placeholder').addClass('d-none');
  $('#cat-frame').removeClass('d-none');

  $.getJSON(CAT_API)
    .done((data) => {
      // Bild erst einblenden, wenn es fertig geladen ist
      $img.off('load error');
      const cat = data[0];
      $img.one('load', () => {
        requestAnimationFrame(() => $img.removeClass('is-loading'));
        setLoading($btn, false);
        addCatToHistory(cat);
        showCatMeta(cat);
      });
      $img.one('error', () => {
        setLoading($btn, false);
        showToast('Katzenbild konnte nicht geladen werden.');
      });
      $img.attr('src', cat.url);
    })
    .fail(() => {
      setLoading($btn, false);
      if (!$img.attr('src')) { $('#cat-frame').addClass('d-none'); $('#cat-placeholder').removeClass('d-none'); }
      $img.removeClass('is-loading');
      $('#cat-error').removeClass('d-none').find('span').text('Die Cat API ist gerade nicht erreichbar.');
    });
}

// Kleines Glas-Label auf dem Bild: Grösse des Originals
function showCatMeta(cat) {
  const txt = cat.width && cat.height ? `${cat.width} × ${cat.height} px` : 'The Cat API';
  $('#cat-meta').text(txt).removeClass('d-none');
}

// Verlauf der letzten 4 Katzen (neueste zuerst)
const catHistory = [];
function addCatToHistory(cat) {
  if (catHistory.some((c) => c.url === cat.url)) return renderCatHistory(cat.url);
  catHistory.unshift(cat);
  catHistory.length = Math.min(catHistory.length, 4);
  renderCatHistory(cat.url);
}

function renderCatHistory(activeUrl) {
  const $h = $('#cat-history').empty();
  catHistory.forEach((c, i) => {
    $(`<button type="button" class="cat-thumb" aria-label="Katzenbild ${i + 1} anzeigen"><img src="${c.url}" alt="" loading="lazy" /></button>`)
      .attr('aria-pressed', c.url === activeUrl)
      .data('cat', c)
      .appendTo($h);
  });
  // Leere Plätze, damit die Reihe ruhig aussieht
  for (let i = catHistory.length; i < 4; i++) $h.append('<span class="cat-thumb is-empty" aria-hidden="true"></span>');
  $('#cat-history-wrap').toggleClass('d-none', catHistory.length === 0);
}

// Verlaufsbild antippen → wieder gross anzeigen (sanfter Wechsel)
function showCatFromHistory(cat) {
  const $img = $('#cat-image');
  if ($img.attr('src') === cat.url) return;
  $img.addClass('is-loading');
  setTimeout(() => {
    $img.one('load', () => requestAnimationFrame(() => $img.removeClass('is-loading')));
    $img.attr('src', cat.url);
    showCatMeta(cat);
    renderCatHistory(cat.url);
  }, 150);
}

// ── b) Bitcoin-Preis in USD und CHF ──────────────────────────────────────────
function loadBitcoin() {
  const $btn = $('#btn-btc');
  setLoading($btn, true);

  $.getJSON(BTC_API)
    .done((data) => {
      btcUsd = data.bitcoin.usd;
      rollNumber($('#btc-usd'), data.bitcoin.usd, (v) => fmtUSD.format(v));
      rollNumber($('#btc-chf'), data.bitcoin.chf, (v) => fmtCHF.format(v));
      const time = new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      $('#btc-time').text(`Stand ${time}`);
      // Kursverlauf nur laden, wenn er auf diesem Bildschirm sichtbar ist
      loadBtcChart(btcRange);
    })
    .fail(() => showToast('CoinGecko ist gerade nicht erreichbar (Rate-Limit?).'))
    .always(() => setLoading($btn, false));
}

// ── Bitcoin-Kursverlauf im Phantom-Stil ──────────────────────────────────────
const BTC_CHART_API = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart';
const BTC_UP = '#2ec08b';
const BTC_DOWN = '#eb5757';
const RANGE_LABEL = { '1h': 'letzte Stunde', 1: 'letzte 24 Std.', 7: 'letzte 7 Tage', 30: 'letzte 30 Tage', 365: 'letztes Jahr' };
const btcCache = {};        // pro Zeitspanne 60 s zwischenspeichern (Rate-Limit schonen)
let btcRange = '1';
let btcUsd = null;
let btcSeries = null;       // aktuell gezeigte Punkte

const chartVisible = () => $('#btc-chart-wrap').is(':visible');

function fetchBtcHistory(range) {
  const days = range === '1h' ? 1 : Number(range);
  const hit = btcCache[days];
  if (hit && Date.now() - hit.t < 60e3) return $.Deferred().resolve(hit.prices).promise();
  return $.getJSON(BTC_CHART_API, { vs_currency: 'usd', days }).then((d) => {
    btcCache[days] = { t: Date.now(), prices: d.prices };
    return d.prices;
  });
}

// "+$ 345 · +2.76 % · letzte 24 Std." wie bei Phantom unter dem Kontostand
function showBtcChange(from, to, label) {
  const diff = to - from;
  const dir = diff >= 0 ? 'up' : 'down';
  const sign = diff >= 0 ? '+' : '−';
  $('#btc-change').removeClass('up down').addClass(dir).text(`${sign}${fmtUSD.format(Math.abs(diff))}`);
  $('#btc-change-pct').removeClass('up down d-none').addClass(dir).text(`${sign}${Math.abs((diff / from) * 100).toFixed(2)} %`);
  $('#btc-change-label').text(label);
}

function restoreBtcPrice() {
  if (!btcSeries) return;
  const first = btcSeries[0][1];
  const last = btcSeries[btcSeries.length - 1][1];
  if (btcUsd != null) $('#btc-usd').text(fmtUSD.format(btcUsd));
  showBtcChange(first, last, RANGE_LABEL[btcRange]);
}

const fmtScrub = (t) => new Date(t).toLocaleString('de-CH', {
  weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

// Beim Scrubben: Preis zu diesem Zeitpunkt im Vergleich zum aktuellen Preis
function showBtcVsNow(price, now, when) {
  const diff = price - now;
  const dir = diff >= 0 ? 'up' : 'down';
  const sign = diff >= 0 ? '+' : '−';
  $('#btc-change').removeClass('up down').addClass(dir).text(`${sign}${fmtUSD.format(Math.abs(diff))}`);
  $('#btc-change-pct').removeClass('up down d-none').addClass(dir).text(`${sign}${Math.abs((diff / now) * 100).toFixed(2)} %`);
  $('#btc-change-label').text(`${diff >= 0 ? 'über' : 'unter'} aktuell · ${when}`);
}

function renderBtcChart(points) {
  btcSeries = points;
  const now = points[points.length - 1][1];          // aktueller Preis = letzter Punkt
  const pct = (v) => `${v >= now ? '+' : '−'}${Math.abs(((v - now) / now) * 100).toFixed(1)} %`;
  $('#btc-chart').empty();

  // Die Karte wächst mit den Nachbarkarten → Chart bei Grössenänderung neu einpassen
  if (!renderBtcChart.observer) {
    renderBtcChart.observer = new ResizeObserver(() => {
      const c = Highcharts.charts.find((ch) => ch && ch.renderTo.id === 'btc-chart');
      if (c) c.reflow();
    });
    renderBtcChart.observer.observe(document.getElementById('btc-chart'));
  }

  // Hoch/Tief mit Abstand zum aktuellen Preis – als ruhige Zeile UNTER dem Chart
  let hi = points[0][1];
  let lo = points[0][1];
  points.forEach((p) => { hi = Math.max(hi, p[1]); lo = Math.min(lo, p[1]); });
  $('#btc-extremes').html(
    `<span>Hoch <b>${fmtUSD.format(hi)}</b> <em class="up">${pct(hi)}</em></span>` +
    `<span>Tief <b>${fmtUSD.format(lo)}</b> <em class="down">${pct(lo)}</em></span>`
  ).removeClass('d-none');

  // Grün über, rot unter dem aktuellen Preis – Fläche verläuft wie vorher nach unten aus
  const grad = (c) => ({ linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
    stops: [[0, Highcharts.color(c).setOpacity(0.28).get()], [1, Highcharts.color(c).setOpacity(0).get()]] });

  // Hell-Modus: Wallet ist weiss/lila → dunkle Linien und Beschriftung
  const ink = (a) => (isLightMode() ? `rgba(28,24,48,${a})` : `rgba(255,255,255,${a})`);
  Highcharts.chart('btc-chart', {
    chart: {
      backgroundColor: 'transparent', margin: [22, 0, 4, 0],
      style: { fontFamily: cssVar('--font-sans') },
      events: { load() { $(this.container).on('mouseleave', restoreBtcPrice); } },
    },
    title: { text: null }, credits: { enabled: false }, legend: { enabled: false },
    xAxis: {
      type: 'datetime', lineWidth: 0, tickLength: 0, labels: { enabled: false },
      crosshair: { color: ink(0.35), width: 1, dashStyle: 'Dash' },
    },
    yAxis: {
      title: { text: null }, labels: { enabled: false }, gridLineWidth: 0, lineWidth: 0,
      // Achse eng an die Daten → die Kurve nutzt die ganze Höhe
      startOnTick: false, endOnTick: false, minPadding: 0.04, maxPadding: 0.06,
      // Gestrichelte Linie = aktueller Preis (dezent beschriftet)
      plotLines: [{
        value: now, color: ink(0.3), width: 1, dashStyle: 'Dash', zIndex: 1,
        label: {
          text: `Aktuell ${fmtUSD.format(now)}`, align: 'left', x: 8, y: -5,
          style: { color: ink(0.55), fontSize: '10px', fontWeight: '500' },
        },
      }],
    },
    tooltip: {
      useHTML: true, backgroundColor: 'transparent', borderWidth: 0, shadow: false, padding: 0,
      positioner(w, h, point) { return { x: Math.min(Math.max(point.plotX - w / 2, 4), this.chart.chartWidth - w - 4), y: 0 }; },
      formatter() { return `<span class="wallet-scrub-time">${fmtScrub(this.x)}</span>`; },
      style: { color: ink(0.7), fontSize: '12px' },
    },
    plotOptions: { series: { animation: { duration: 600 } } },
    series: [{
      type: 'area', data: points, lineWidth: 2, threshold: null,
      zoneAxis: 'y',
      zones: [
        { value: now, color: BTC_DOWN, fillColor: grad(BTC_DOWN) },
        { color: BTC_UP, fillColor: grad(BTC_UP) },
      ],
      marker: { enabled: false, states: { hover: { enabled: true, radius: 5, lineColor: isLightMode() ? '#ffffff' : '#1c1c1f', lineWidth: 2 } } },
      // Scrubbing: grosser Preis = Wert zu diesem Zeitpunkt, darunter Abstand zum aktuellen Preis
      point: { events: { mouseOver() {
        hapticScrub(this);
        $('#btc-usd').text(fmtUSD.format(this.y));
        showBtcVsNow(this.y, now, fmtScrub(this.x));
      } } },
    }],
  });
  restoreBtcPrice();
}

function loadBtcChart(range) {
  btcRange = range;
  $('.wallet-range').each(function () {
    const on = String($(this).data('range')) === String(range);
    $(this).toggleClass('is-active', on).attr('aria-pressed', on);
  });
  if (!chartVisible()) return;     // auf kleinen Bildschirmen gar nicht erst laden

  const $box = $('#btc-chart').addClass('is-loading');
  fetchBtcHistory(range)
    .done((prices) => {
      let pts = prices;
      if (range === '1h') pts = prices.filter((p) => p[0] >= prices[prices.length - 1][0] - 36e5);
      // Aktuellen Preis anhängen, damit Linie und Kontostand übereinstimmen
      if (btcUsd != null && Date.now() > pts[pts.length - 1][0]) pts = pts.concat([[Date.now(), btcUsd]]);
      renderBtcChart(pts);
    })
    .fail(() => showToast('Kursverlauf ist gerade nicht verfügbar (Rate-Limit?).'))
    .always(() => $box.removeClass('is-loading'));
}

// ── c) Aktuelles Wetter (Standard Zürich, Ort wählbar) + 5-Tage-Chart ───────────
// Schnellwahl; weitere Orte kommen über die swisstopo-Suche
const WEATHER_CITIES = [
  { name: 'Zürich', lat: 47.3769, lon: 8.5417 },
  { name: 'Bern', lat: 46.948, lon: 7.4474 },
  { name: 'Basel', lat: 47.5596, lon: 7.5886 },
  { name: 'Genf', lat: 46.2044, lon: 6.1432 },
  { name: 'Lausanne', lat: 46.5197, lon: 6.6323 },
  { name: 'Luzern', lat: 47.0502, lon: 8.3093 },
  { name: 'St. Gallen', lat: 47.4245, lon: 9.3767 },
  { name: 'Lugano', lat: 46.0037, lon: 8.9511 },
  { name: 'Winterthur', lat: 47.4988, lon: 8.7241 },
  { name: 'Chur', lat: 46.8508, lon: 9.532 },
];
let weatherLoc = WEATHER_CITIES[0];
try {
  const saved = JSON.parse(localStorage.getItem('weather-loc') || 'null');
  if (saved && saved.name && Number.isFinite(saved.lat) && Number.isFinite(saved.lon)) weatherLoc = saved;
} catch (e) { /* kein Speicher → Zürich */ }

const city = { seq: 0, timer: 0, results: [], active: -1 };

// swisstopo-Treffer → { name, meta, lat, lon }  ("<b>Bern</b> (BE)", "3011 - Bern")
function parseCityHit(hit) {
  const label = $('<div>').html(hit.attrs.label).text().trim();
  let name = label;
  const meta = [];
  const zip = label.match(/^(\d{4})\s*-\s*(.+)$/);
  if (zip) { name = zip[2]; meta.push(`PLZ ${zip[1]}`); }
  const kt = name.match(/^(.*?)\s*\(([A-Z]{2})\)$/);
  if (kt) { name = kt[1]; meta.push(kt[2]); }
  return { name, meta: meta.join(' · '), lat: hit.attrs.lat, lon: hit.attrs.lon };
}

function renderCityChips() {
  $('#weather-city-chips').html(WEATHER_CITIES.map((c, i) =>
    `<button type="button" class="mw-city-chip${c.name === weatherLoc.name ? ' is-current' : ''}" data-city="${i}">${esc(c.name)}</button>`).join(''));
}

function renderCityResults() {
  const $list = $('#weather-city-list');
  $list.html(city.results.map((c, i) =>
    `<li id="wc-opt-${i}" class="mw-city-opt${i === city.active ? ' is-active' : ''}" role="option" aria-selected="${i === city.active}" data-i="${i}">`
    + `<span>${esc(c.name)}</span>${c.meta ? `<small>${esc(c.meta)}</small>` : ''}</li>`).join(''));
  $list.prop('hidden', !city.results.length);
  $('#weather-city-input').attr('aria-expanded', city.results.length > 0)
    .attr('aria-activedescendant', city.active >= 0 ? `wc-opt-${city.active}` : null);
}

function searchCities(q) {
  const seq = ++city.seq;
  $('#weather-city-status').text('Suche …');
  return $.getJSON(GEO_SEARCH, { searchText: q, type: 'locations', origins: 'gg25,zipcode', sr: 4326, limit: 8 })
    .then((data) => {
      if (seq !== city.seq) return city.results;             // veraltete Antwort ignorieren
      const seen = new Set();
      city.results = (data.results || []).map(parseCityHit)
        // gleicher Ort in mehreren Sprachen (Bern/Berna/Berne) → nur einmal zeigen
        .filter((c) => { const k = `${c.lat.toFixed(3)}|${c.lon.toFixed(3)}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, 6);
      city.active = city.results.length ? 0 : -1;
      renderCityResults();
      $('#weather-city-status').text(city.results.length ? '' : `Keinen Ort «${q}» gefunden.`);
      return city.results;
    }, () => { if (seq === city.seq) $('#weather-city-status').text('Suche gerade nicht erreichbar.'); });
}

function onCityInput() {
  const q = $('#weather-city-input').val().trim();
  clearTimeout(city.timer);
  $('#weather-city-popular').prop('hidden', !!q);
  if (q.length < 2) {
    city.seq++; city.results = []; city.active = -1;
    renderCityResults();
    $('#weather-city-status').text('');
    return;
  }
  city.timer = setTimeout(() => searchCities(q), 220);
}

function openCityPicker() {
  const $p = $('#weather-city');
  renderCityChips();
  $p.prop('hidden', false);
  $('#weather-city-btn').attr('aria-expanded', 'true');
  $('#weather-city-input').val('').trigger('focus');
  onCityInput();
  if (window.gsap && !reduceMotion.matches) gsap.fromTo($p[0], { opacity: 0, y: -6, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out', clearProps: 'all' });
}

function closeCityPicker(refocus = true) {
  if ($('#weather-city').prop('hidden')) return;
  $('#weather-city').prop('hidden', true);
  $('#weather-city-btn').attr('aria-expanded', 'false');
  clearTimeout(city.timer);
  city.seq++;
  if (refocus) $('#weather-city-btn').trigger('focus');
}

function chooseCity(c) {
  weatherLoc = { name: c.name, lat: c.lat, lon: c.lon };
  try { localStorage.setItem('weather-loc', JSON.stringify(weatherLoc)); } catch (e) { /* egal */ }
  $('#weather-place').text(weatherLoc.name);
  closeCityPicker();
  loadWeather();
}

// ── Live-Himmel ─────────────────────────────────────────────────────────────────
// Der Himmel (Wetterkarte + Seitenhintergrund) folgt dem Wetter zur gewählten Zeit.
// Szenen: clear-day, partly-day, overcast, fog, rain, thunder, snow, clear-night, cloudy-night

// WMO-Wettercode (Open-Meteo) → Szene
function skyScene(c) {
  const code = Number(c.weather_code);
  const day = Number(c.is_day) === 1;
  if ([95, 96, 99].includes(code)) return 'thunder';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (code === 3 || Number(c.cloud_cover) >= 85) return day ? 'overcast' : 'cloudy-night';
  if (code === 1 || code === 2) return day ? 'partly-day' : 'cloudy-night';
  return day ? 'clear-day' : 'clear-night';
}

// WMO-Wettercode → kurze Beschreibung für die Kopfzeile
function wmoLabel(code, isDay) {
  const day = Number(isDay) === 1;
  const map = {
    0: day ? 'Sonnig' : 'Klar', 1: day ? 'Meist sonnig' : 'Meist klar', 2: 'Leicht bewölkt', 3: 'Bedeckt',
    45: 'Nebel', 48: 'Nebel mit Reif', 51: 'Leichter Niesel', 53: 'Nieselregen', 55: 'Starker Niesel',
    56: 'Gefrierender Niesel', 57: 'Gefrierender Niesel', 61: 'Leichter Regen', 63: 'Regen', 65: 'Starker Regen',
    66: 'Gefrierender Regen', 67: 'Gefrierender Regen', 71: 'Leichter Schneefall', 73: 'Schneefall', 75: 'Starker Schneefall',
    77: 'Schneegriesel', 80: 'Regenschauer', 81: 'Regenschauer', 82: 'Heftige Schauer', 85: 'Schneeschauer', 86: 'Schneeschauer',
    95: 'Gewitter', 96: 'Gewitter mit Hagel', 99: 'Gewitter mit Hagel',
  };
  return map[Number(code)] || 'Wetter';
}

// Was eine Szene zeichnet: Wolkenfarbe (light/dark/night), Nebel, Niederschlag
const SKY_LOOK = {
  'clear-day':    { tone: [1, 0, 0], fog: 0, rain: 0, snow: 0, low: 0 },
  'partly-day':   { tone: [1, 0, 0], fog: 0, rain: 0, snow: 0, low: 0 },
  overcast:       { tone: [0.7, 0.3, 0], fog: 0, rain: 0, snow: 0, low: 0.45 },
  fog:            { tone: [0.85, 0.15, 0], fog: 1, rain: 0, snow: 0, low: 0.6 },
  rain:           { tone: [0.15, 0.85, 0], fog: 0.15, rain: 1, snow: 0, low: 0.85 },
  thunder:        { tone: [0, 1, 0], fog: 0, rain: 1, snow: 0, low: 0.75 },
  snow:           { tone: [0.9, 0.1, 0], fog: 0.2, rain: 0, snow: 1, low: 0.7 },
  'clear-night':  { tone: [0, 0, 1], fog: 0, rain: 0, snow: 0, low: 0 },
  'cloudy-night': { tone: [0, 0.2, 0.8], fog: 0, rain: 0, snow: 0, low: 0.4 },
};

// Weiche Wolken-Vorlage (Offscreen-Canvas) in einer Farbe; wird pro Frame nur noch kopiert
function makeCloudSprite(seed, body, shade) {
  // Cumulus-Form: gewölbte Oberseite aus mehreren Bällen, flache Unterseite, klare Kante
  const c = document.createElement('canvas');
  c.width = 300; c.height = 140;
  const g = c.getContext('2d');
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const base = 104;
  const puffs = [{ x: 150, y: 70, r: 46 + rnd() * 8 }];
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1, d = 34 + Math.floor(i / 2) * 36 + rnd() * 10;
    puffs.push({ x: 150 + side * d, y: 78 + Math.floor(i / 2) * 8 + rnd() * 6, r: 34 - Math.floor(i / 2) * 7 + rnd() * 8 });
  }
  for (let i = 0; i < 6; i++) puffs.push({ x: 50 + i * 40 + rnd() * 10, y: base - 14, r: 20 + rnd() * 8 });   // Sockel
  const blob = (p, col, dx, dy, scale) => {
    const r = p.r * scale;
    const gr = g.createRadialGradient(p.x + dx, p.y + dy, 0, p.x + dx, p.y + dy, r);
    gr.addColorStop(0, col);
    gr.addColorStop(0.72, col.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.88})`));
    gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = gr; g.beginPath(); g.arc(p.x + dx, p.y + dy, r, 0, 6.283); g.fill();
  };
  puffs.forEach((p) => blob(p, shade, 0, 10, 1.02));   // Schatten unten
  puffs.forEach((p) => blob(p, body, -2, -2, 1));      // Körper, Licht leicht von oben links
  // Volumen: oben aufgehellt, unten abgedunkelt – nur auf der Wolke selbst (source-atop)
  g.globalCompositeOperation = 'source-atop';
  const lit = g.createLinearGradient(0, 20, 0, base);
  lit.addColorStop(0, 'rgba(255,255,255,0.35)');
  lit.addColorStop(0.45, 'rgba(255,255,255,0)');
  lit.addColorStop(1, 'rgba(20,30,48,0.28)');
  g.fillStyle = lit; g.fillRect(0, 0, c.width, c.height);
  // Unterseite weich abschneiden → flache Wolkenbasis
  g.globalCompositeOperation = 'destination-out';
  const cut = g.createLinearGradient(0, base - 6, 0, base + 14);
  cut.addColorStop(0, 'rgba(0,0,0,0)'); cut.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = cut; g.fillRect(0, base - 6, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
  return c;
}

// Ein Himmel-Renderer (Wolken, Nebel, Regen, Schnee) für ein Canvas.
// strength = Deckkraft (Karte 1, Seite dezent), size = Wolkengrösse, maxDpr = Schärfe
function createSkyFx(canvas, opt) {
  const ctx = canvas.getContext('2d');
  // cloudBand: [oben, unten] – Zahlen < 1 = Anteil der Höhe, sonst Pixel
  // fogBand: Höhe der Nebelbänder · curtain: Länge der Regen-/Schneefahnen unter den Wolken
  // mountainY/lowY: (nur Karte) Höhe der Wolkenschatten auf den Alpen bzw. der tiefen Wolken in den Bergen
  const o = { strength: 1, size: 1, maxDpr: 2, clouds: 7, cloudBand: [0.04, 0.45], lightAlpha: 1, drops: 130, flakes: 80,
    fogBand: [0.58, 0.84], curtain: 0.4, mountainY: null, lowY: null, ...opt };
  const px = (v) => (v >= 0 && v < 1 ? v * h : v);   // 0..1 = Anteil der Höhe, sonst Pixel
  let w = 0, h = 0, raf = 0, last = 0, visible = true, idleSince = 0, tau = 380;
  const cur = { cloud: 0, l: 1, d: 0, n: 0, fog: 0, rain: 0, snow: 0, low: 0 };
  let vis = [];          // sichtbare Wolken (für Regen aus den Wolken)
  let flashT = 0, flashCloud = null;
  let tgt = { ...cur };
  const sprites = { l: [], d: [], n: [] };
  for (let i = 0; i < 5; i++) {
    sprites.l.push(makeCloudSprite(17 + i * 31, 'rgba(255,255,255,0.95)', 'rgba(196,206,220,0.75)'));
    sprites.d.push(makeCloudSprite(17 + i * 31, 'rgba(112,124,140,0.95)', 'rgba(70,80,95,0.8)'));
    sprites.n.push(makeCloudSprite(17 + i * 31, 'rgba(70,84,112,0.9)', 'rgba(40,50,72,0.8)'));
  }
  const clouds = Array.from({ length: o.clouds }, (_, k) => ({
    // Tiefe: grosse (nahe) Wolken ziehen schneller und liegen tiefer, kleine (ferne) langsamer und höher
    k, x: Math.random(), y: 0, s: 0.5 + Math.random() * 0.8,
    v: 0, img: k % 5,
  })).sort((a, b) => a.s - b.s);
  clouds.forEach((c) => { c.v = 0.002 + c.s * 0.007; c.y = Math.min(1, Math.max(0, (c.s - 0.5) / 0.8 * 0.7 + Math.random() * 0.3)); });
  const fogBands = [0, 1, 2].map((i) => ({ x: Math.random(), y: i / 2, v: 0.006 + i * 0.003 }));
  const lowClouds = [0, 1, 2].map((i) => ({ x: i / 3, v: 0.003 + i * 0.0015, img: (i * 2) % 5, dy: (i - 1) * 9 }));
  const drops = [];
  const flakes = [];
  // Tropfen/Flocken starten meist an der Unterseite einer sichtbaren Wolke (die Wolke regnet),
  // ein Teil fällt von oben (Regen über die ganze Karte)
  const fromCloud = () => (vis.length && Math.random() < 0.75 ? vis[(Math.random() * vis.length) | 0] : null);
  const newDrop = (any) => {
    const c = fromCloud();
    const x = c ? c.x + c.cw * (0.18 + Math.random() * 0.64) : Math.random() * (w + 80);
    const top = c ? c.base : -30 - Math.random() * 60;
    return { x, y: any ? top + Math.random() * (h - top) : top, l: 10 + Math.random() * 14, v: 420 + Math.random() * 300, a: 0.18 + Math.random() * 0.3 };
  };
  const newFlake = (any) => {
    const c = fromCloud();
    const x = c ? c.x + c.cw * (0.15 + Math.random() * 0.7) : Math.random() * w;
    const top = c ? c.base : -8;
    return { x, y: any ? top + Math.random() * (h - top) : top, r: 1 + Math.random() * 2.2, v: 22 + Math.random() * 40, p: Math.random() * 6.28, a: 0.55 + Math.random() * 0.4 };
  };

  const resize = () => {
    const dpr = Math.min(o.maxDpr, window.devicePixelRatio || 1);
    w = canvas.clientWidth; h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drops.length = 0; flakes.length = 0;
    draw(0);
  };

  function draw(dt) {
    ctx.clearRect(0, 0, w, h);
    const S = o.strength;
    // Wolken: je mehr Bewölkung, desto mehr und dichtere Wolken
    if (cur.cloud > 0.01) {
      const toneSum = cur.l + cur.d + cur.n || 1;
      // Bei starker Bewölkung ein Schleier oben (geschlossene Wolkendecke)
      const veil = Math.max(0, cur.cloud - 0.55) * 1.6;
      if (veil > 0) {
        const r = Math.round((255 * cur.l + 96 * cur.d + 52 * cur.n) / toneSum);
        const gC = Math.round((255 * cur.l + 106 * cur.d + 64 * cur.n) / toneSum);
        const b = Math.round((255 * cur.l + 122 * cur.d + 92 * cur.n) / toneSum);
        const gr = ctx.createLinearGradient(0, 0, 0, h * 0.6);
        gr.addColorStop(0, `rgba(${r},${gC},${b},${0.42 * veil * S})`);
        gr.addColorStop(1, `rgba(${r},${gC},${b},0)`);
        ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h * 0.6);
      }
      const base = Math.min(w, 520) * 0.5 * o.size;
      const band = o.cloudBand.map(px);
      vis = [];
      for (const c of clouds) {
        // Wolke k erscheint, sobald die Bewölkung ihren Anteil erreicht
        const a = Math.max(0, Math.min(1, (cur.cloud * (o.clouds + 1) - c.k) / 1.5)) * S;
        if (a <= 0.01) continue;
        c.x += c.v * dt / 1000;
        if (c.x > 1.25) c.x = -0.35;
        const cw = base * c.s, chh = cw * 0.467;
        const x = c.x * (w + cw) - cw, y = band[0] + c.y * (band[1] - band[0]) - chh / 2;
        for (const [key, wt] of [['l', cur.l], ['d', cur.d], ['n', cur.n]]) {
          if (wt / toneSum < 0.02) continue;
          ctx.globalAlpha = a * (wt / toneSum) * (key === 'l' ? o.lightAlpha : 1) * (0.7 + c.s * 0.3);   // ferne Wolken etwas blasser
          ctx.drawImage(sprites[key][c.img], x, y, cw, chh);
        }
        vis.push({ x, cw, base: y + chh * 0.8, cy: y + chh * 0.5, a });
      }
      ctx.globalAlpha = 1;
      const toneRGB = (l, d, n) => [0, 1, 2].map((k) => Math.round((l[k] * cur.l + d[k] * cur.d + n[k] * cur.n) / toneSum));
      // Regen-/Schneefahnen: unter jeder Wolke ein schräger, weicher Vorhang
      if (cur.rain > 0.03 || cur.snow > 0.03) {
        const H = px(o.curtain);
        const [r, g2, b] = cur.snow > cur.rain ? [236, 242, 250] : toneRGB([206, 214, 228], [88, 98, 114], [60, 70, 96]);
        const amt = cur.snow > cur.rain ? 0.13 * cur.snow : 0.22 * cur.rain;
        for (const c of vis) {
          const x0 = c.x + c.cw * 0.19, x1 = c.x + c.cw * 0.81, y0 = c.base;
          const gr = ctx.createLinearGradient(0, y0, 0, y0 + H);
          gr.addColorStop(0, `rgba(${r},${g2},${b},${amt * c.a})`);
          gr.addColorStop(1, `rgba(${r},${g2},${b},0)`);
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1 - H * 0.22, y0 + H); ctx.lineTo(x0 - H * 0.22, y0 + H); ctx.closePath(); ctx.fill();
        }
      }
      // Wolkenschatten ziehen über die Alpen (nur bei Sonne mit einzelnen Wolken)
      const sh = o.mountainY != null ? (cur.l / toneSum) * Math.max(0, 1 - cur.cloud * 1.1) * 2 : 0;
      if (sh > 0.02) {
        const my = px(o.mountainY);
        for (const c of vis) {
          const cx = c.x + c.cw * 0.5 - 24, rx = c.cw * 0.5;
          const gr = ctx.createRadialGradient(cx, my, 0, cx, my, rx);
          gr.addColorStop(0, `rgba(10,24,48,${0.2 * Math.min(1, sh) * c.a})`);
          gr.addColorStop(1, 'rgba(10,24,48,0)');
          ctx.save(); ctx.translate(cx, my); ctx.scale(1, 0.22); ctx.translate(-cx, -my);
          ctx.fillStyle = gr; ctx.fillRect(cx - rx, my - rx, rx * 2, rx * 2);
          ctx.restore();
        }
      }
      // Blitz im Inneren einer Wolke
      if (flashT > 0) {
        const c = (flashCloud && vis.find((v) => Math.abs(v.x - flashCloud.x) < 60)) || vis[0];
        if (c) {
          const gr = ctx.createRadialGradient(c.x + c.cw / 2, c.cy, 0, c.x + c.cw / 2, c.cy, c.cw * 0.55);
          gr.addColorStop(0, `rgba(235,230,255,${0.85 * flashT})`);
          gr.addColorStop(1, 'rgba(235,230,255,0)');
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = gr; ctx.fillRect(c.x, c.cy - c.cw * 0.55, c.cw, c.cw * 1.1);
          ctx.globalCompositeOperation = 'source-over';
        }
        flashT = Math.max(0, flashT - dt / 260);
      }
    }
    // Tiefe Wolken hängen in den Bergen (Regen, Schnee, bedeckt)
    if (o.lowY != null && cur.low > 0.01) {
      const toneSum = cur.l + cur.d + cur.n || 1;
      const ly = px(o.lowY), lw = w * 0.8, lh = lw * 0.3;
      for (const c of lowClouds) {
        c.x += c.v * dt / 1000; if (c.x > 1.2) c.x = -0.6;
        const x = c.x * (w + lw) - lw * 0.6;
        for (const [key, wt] of [['l', cur.l], ['d', cur.d], ['n', cur.n]]) {
          if (wt / toneSum < 0.02) continue;
          ctx.globalAlpha = cur.low * 0.5 * (wt / toneSum) * o.strength;
          ctx.drawImage(sprites[key][c.img], x, ly - lh / 2 + c.dy, lw, lh);
        }
      }
      ctx.globalAlpha = 1;
    }
    // Nebel: weiche, langsam ziehende Bänder
    if (cur.fog > 0.01) {
      for (const f of fogBands) {
        f.x += f.v * dt / 1000; if (f.x > 1) f.x -= 1;
        const fb = o.fogBand.map(px);
        const y = fb[0] + f.y * (fb[1] - fb[0]), bw = w * 1.6;
        for (const off of [f.x * bw - bw, f.x * bw]) {
          const gr = ctx.createRadialGradient(off + bw / 2, y, 0, off + bw / 2, y, bw / 2);
          gr.addColorStop(0, `rgba(236,240,245,${0.38 * cur.fog * S})`);
          gr.addColorStop(1, 'rgba(236,240,245,0)');
          ctx.save(); ctx.translate(0, y); ctx.scale(1, 0.16); ctx.translate(0, -y);
          ctx.fillStyle = gr; ctx.fillRect(off, y - bw / 2, bw, bw);
          ctx.restore();
        }
      }
    }
    // Regen: gleicher Winkel und Tempo wie überall, Dichte nach Regenmenge
    const wantDrops = Math.round(o.drops * cur.rain);
    while (drops.length < wantDrops) drops.push(newDrop(true));
    if (drops.length > wantDrops) drops.length = wantDrops;
    if (drops.length) {
      ctx.strokeStyle = '#dbe7ff'; ctx.lineWidth = 1; ctx.lineCap = 'round';
      for (const q of drops) {
        q.y += q.v * dt / 1000; q.x -= q.v * 0.22 * dt / 1000;
        if (q.y > h + 24 || q.x < -24) Object.assign(q, newDrop(false));
        ctx.globalAlpha = q.a * S;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + q.l * 0.22, q.y - q.l); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Schnee
    const wantFlakes = Math.round(o.flakes * cur.snow);
    while (flakes.length < wantFlakes) flakes.push(newFlake(true));
    if (flakes.length > wantFlakes) flakes.length = wantFlakes;
    if (flakes.length) {
      ctx.fillStyle = '#fff';
      for (const q of flakes) {
        q.p += 1.2 * dt / 1000; q.y += q.v * dt / 1000; q.x += Math.sin(q.p) * 14 * dt / 1000;
        if (q.y > h + 8) Object.assign(q, newFlake(false));
        ctx.globalAlpha = q.a * S;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // Werte gleiten zum Ziel (kein harter Wechsel), dann zeichnen
  function step(now) {
    raf = 0;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    const k = 1 - Math.exp(-dt / tau);
    let moving = false;
    for (const key of Object.keys(cur)) {
      const d = tgt[key] - cur[key];
      if (Math.abs(d) > 0.002) { cur[key] += d * k; moving = true; } else cur[key] = tgt[key];
    }
    draw(dt);
    const animated = cur.cloud > 0.01 || cur.fog > 0.01 || cur.low > 0.01 || drops.length || flakes.length || flashT > 0;
    if (!animated && !moving) { if (!idleSince) idleSince = now; } else idleSince = 0;
    if (visible && !document.hidden && (animated || moving)) raf = requestAnimationFrame(step);
    else last = 0;
  }
  const kick = () => {
    if (raf || !w) return;
    if (reduceMotion.matches) { Object.assign(cur, tgt); draw(0); return; }   // ruhiges Standbild
    raf = requestAnimationFrame(step);
  };

  new ResizeObserver(resize).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  reduceMotion.addEventListener('change', () => { cancelAnimationFrame(raf); raf = 0; last = 0; kick(); });
  return {
    set(look, cloudCover, amount, fast = false) {
      tau = fast ? 130 : 380;   // beim Wischen schneller nachziehen
      const [l, d, n] = look.tone;
      tgt = { cloud: cloudCover, l, d, n, fog: look.fog, rain: look.rain * amount, snow: look.snow * amount, low: look.low * Math.min(1, cloudCover + 0.2) };
      kick();
    },
    setVisible(v) { visible = v; if (v) kick(); },
    flash() { flashT = 1; flashCloud = vis.length ? vis[(Math.random() * vis.length) | 0] : null; kick(); },
  };
}

// ── Alpen: realistisch gerendert (Canvas) und an Wetter, Tageszeit und Temperatur gekoppelt ──
// Fraktale Bergkämme in drei Ebenen; jede Flanke wird je nach Neigung zum Licht (oben rechts)
// hell oder im Schatten gezeichnet; Schnee liegt über einer Schneegrenze, die mit dem Wetter
// und der Temperatur steigt oder sinkt; ferne Kämme verschwinden im Dunst der Himmelsfarbe.
const ALPS_LOOK = {
  //               Fels hell / Schatten          Schnee hell / Schatten        Schneegrenze  Dunst-Farbe     Dunst fern/mitte/nah
  'clear-day':    { rock: [[122, 132, 146], [44, 54, 74]],   snow: [[252, 253, 255], [168, 190, 218]], line: 0.6,  haze: [118, 172, 232], mist: [0.55, 0.28, 0.08] },
  'partly-day':   { rock: [[112, 120, 132], [46, 54, 70]],   snow: [[242, 246, 252], [160, 178, 204]], line: 0.6,  haze: [128, 168, 214], mist: [0.58, 0.32, 0.1] },
  overcast:       { rock: [[96, 104, 116], [58, 64, 76]],    snow: [[214, 222, 232], [150, 162, 180]], line: 0.6,  haze: [124, 148, 176], mist: [0.62, 0.38, 0.14] },
  fog:            { rock: [[150, 158, 168], [122, 130, 142]], snow: [[226, 231, 237], [186, 194, 204]], line: 0.6,  haze: [196, 205, 214], mist: [0.9, 0.78, 0.58] },
  rain:           { rock: [[64, 72, 84], [26, 32, 42]],      snow: [[146, 156, 170], [92, 102, 118]],  line: 0.78, haze: [72, 96, 126],   mist: [0.7, 0.48, 0.24] },
  thunder:        { rock: [[54, 52, 74], [18, 16, 30]],      snow: [[118, 116, 144], [66, 64, 92]],    line: 0.8,  haze: [62, 60, 102],   mist: [0.66, 0.42, 0.2] },
  snow:           { rock: [[118, 128, 144], [64, 76, 96]],   snow: [[255, 255, 255], [192, 208, 228]], line: 0.24, haze: [178, 202, 230], mist: [0.68, 0.42, 0.16] },
  'clear-night':  { rock: [[30, 38, 66], [8, 12, 28]],       snow: [[146, 166, 214], [56, 70, 116]],   line: 0.62, haze: [26, 42, 96],    mist: [0.6, 0.34, 0.1] },
  'cloudy-night': { rock: [[28, 34, 50], [8, 11, 22]],       snow: [[92, 104, 130], [42, 50, 70]],     line: 0.66, haze: [34, 48, 78],    mist: [0.64, 0.4, 0.14] },
};

function createAlps(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, layers = null, raf = 0;
  let current = null;                 // { scene, temp }
  const shown = document.createElement('canvas');   // was gerade zu sehen ist (für Überblendung)
  const next = document.createElement('canvas');

  // Deterministischer Zufall + fraktaler Kamm (Mittelpunktverschiebung)
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ridge = (seed, n, rough, sharp) => {
    const r = rng(seed);
    const p = new Array(n + 1).fill(0);
    p[0] = r(); p[n] = r();
    for (let step = n, s = 1; step > 1; step /= 2, s *= rough) {
      for (let i = step / 2; i < n; i += step) p[i] = (p[i - step / 2] + p[i + step / 2]) / 2 + (r() - 0.5) * s;
    }
    // glätten (sonst wirken die Kämme wie Rauschen)
    const sm = p.map((_, i) => { let t = 0, c = 0; for (let k = -1; k <= 1; k++) { const v = p[i + k]; if (v != null) { t += v; c++; } } return t / c; });
    const lo = Math.min(...sm), hi = Math.max(...sm);
    const ph = seed * 0.37;
    return sm.map((v, i) => ({
      h: ((v - lo) / (hi - lo)) ** sharp,
      n: 0.5 + 0.28 * Math.sin(i * 0.21 + ph) + 0.22 * Math.sin(i * 0.57 + ph * 2.3),   // weiche Schneekante
    }));
  };
  const build = () => {
    // Ebene: Grundlinie (Anteil der Höhe), Amplitude, Kamm
    layers = [
      { base: 0.6, amp: 0.38, pts: ridge(41, 128, 0.58, 1.7), mist: 0 },
      { base: 0.8, amp: 0.44, pts: ridge(97, 128, 0.6, 1.9), mist: 1 },
      { base: 1.0, amp: 0.5, pts: ridge(163, 128, 0.62, 2.1), mist: 2 },
    ];
  };

  const mix = (a, b, t) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;

  function paint(target, scene, temp) {
    const base = ALPS_LOOK[scene] || ALPS_LOOK.overcast;
    const L = isLightMode() ? lightAlps(base) : base;
    target.width = Math.round(w * dpr); target.height = Math.round(h * dpr);
    const g = target.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    // Schneegrenze: wärmer → höher, Frost → tiefer
    let line = L.line;
    if (temp != null) line = Math.max(0.15, Math.min(0.9, line + (temp - 3) * 0.018));
    for (const layer of layers) {
      const n = layer.pts.length - 1;
      const dx = w / n;
      const ys = layer.pts.map((p) => h * layer.base - p.h * h * layer.amp);
      // Licht über ein breiteres Stück der Flanke bestimmen und glätten → ganze Hänge hell/dunkel
      const raw = ys.map((_, i) => { const a0 = ys[Math.max(0, i - 3)], a1 = ys[Math.min(n, i + 3)]; return Math.max(0, Math.min(1, 0.5 + ((a1 - a0) / (6 * dx)) * 1.15)); });
      const lit = raw.map((_, i) => { let t = 0, c = 0; for (let k = -2; k <= 2; k++) { const v = raw[i + k]; if (v != null) { t += v; c++; } } return t / c; });
      const top = h * (layer.base - layer.amp);
      // 1) Fels als Ganzes: oben Mittelton, nach unten dunkler
      g.beginPath(); g.moveTo(0, h);
      for (let i = 0; i <= n; i++) g.lineTo(i * dx, ys[i]);
      g.lineTo(w, h); g.closePath();
      const body = g.createLinearGradient(0, top, 0, h);
      body.addColorStop(0, mix(L.rock[1], L.rock[0], 0.45));
      body.addColorStop(1, mix(L.rock[1], L.rock[1], 0));
      g.fillStyle = body; g.fill();
      // 2) Licht und Schatten der Flanken: beginnt am Grat und läuft nach unten aus
      const facet = h * layer.amp * 0.55;
      for (let i = 0; i < n; i++) {
        const x0 = i * dx, x1 = x0 + dx + 0.5;
        const y0 = ys[i], y1 = ys[i + 1];
        const gr = g.createLinearGradient(0, Math.min(y0, y1), 0, Math.min(y0, y1) + facet);
        const col = mix(L.rock[1], L.rock[0], lit[i]);
        gr.addColorStop(0, col); gr.addColorStop(1, col.replace('rgb', 'rgba').replace(')', ',0)'));
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1, y1 + facet); g.lineTo(x0, y0 + facet); g.closePath(); g.fill();
        // 3) Schnee über der Grenze, weiche Unterkante
        const p = layer.pts[i];
        if (p.h > line) {
          const depth = (p.h - line) * h * layer.amp * (0.6 + p.n * 0.6);
          g.fillStyle = mix(L.snow[1], L.snow[0], lit[i]);
          g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1, y1 + depth); g.lineTo(x0, y0 + depth); g.closePath(); g.fill();
        }
      }
      // Luftperspektive: Dunst in Himmelsfarbe über der Ebene (fern stark, nah schwach)
      const m = L.mist[layer.mist];
      if (m > 0) {
        g.globalCompositeOperation = 'source-atop';
        const grd = g.createLinearGradient(0, h * (layer.base - layer.amp), 0, h);
        grd.addColorStop(0, `rgba(${L.haze.join(',')},${m})`);
        grd.addColorStop(1, `rgba(${L.haze.join(',')},${Math.min(1, m + 0.25)})`);
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'source-over';
      }
    }
  }

  const draw = (t) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (t < 1 && shown.width) { ctx.globalAlpha = 1 - t; ctx.drawImage(shown, 0, 0); }
    ctx.globalAlpha = t; ctx.drawImage(next, 0, 0);
    ctx.globalAlpha = 1;
  };
  const render = (fade) => {
    if (!current || !w) return;
    // Bisheriges Bild merken, neues zeichnen, dann überblenden
    shown.width = canvas.width; shown.height = canvas.height;
    shown.getContext('2d').drawImage(canvas, 0, 0);
    paint(next, current.scene, current.temp);
    cancelAnimationFrame(raf);
    if (!fade || reduceMotion.matches) { draw(1); return; }
    const t0 = performance.now();
    const step = (now) => { const t = Math.min(1, (now - t0) / 900); draw(t); if (t < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = canvas.clientWidth; h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    if (!layers) build();
    render(false);
  };
  new ResizeObserver(resize).observe(canvas);
  return {
    set(scene, temp, fast) {
      const t = temp != null ? Math.round(temp) : null;
      if (current && current.scene === scene && current.temp === t) return;
      current = { scene, temp: t };
      render(!fast);
    },
    refresh() { render(true); },   // hell/dunkel gewechselt: neu zeichnen, weich überblenden
  };
}

// Hell-Modus: die Karte ist ein heller Himmel mit dunkler Schrift – Berge und Wolken
// werden dafür in Luftperspektive aufgehellt (sonst stünde dunkle Schrift auf dunklem Fels)
const isLightMode = () => document.documentElement.dataset.mode === 'light';
const mixRGB = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
function lightAlps(L) {
  return {
    rock: L.rock.map((c) => mixRGB(c, [176, 192, 216], 0.5)),
    snow: L.snow.map((c) => mixRGB(c, [250, 252, 255], 0.45)),
    line: L.line,
    haze: mixRGB(L.haze, [206, 222, 244], 0.6),
    mist: L.mist.map((m) => Math.min(0.95, m + 0.1)),
  };
}
// Wolken: Nacht- und Regentöne heller mischen
const lightTone = ([l, d, n]) => [l + d * 0.45 + n * 0.6, d * 0.55 + n * 0.25, n * 0.15];

// Steuerung: setzt Szene für Karte + Seite gleichzeitig, inkl. Blitz
const sky = (() => {
  let card = null, page = null, alps = null, scene = '', flashTimer = 0;
  const flash = () => {
    clearTimeout(flashTimer);
    if (scene !== 'thunder' || reduceMotion.matches) return;
    const frames = (peak) => [{ opacity: 0 }, { opacity: peak, offset: 0.08 }, { opacity: 0, offset: 0.2 }, { opacity: peak * 0.6, offset: 0.3 }, { opacity: 0 }];
    const a = document.querySelector('#card-weather .mw-flash');
    const b = document.querySelector('.page-sky-flash');
    if (a && a.animate) a.animate(frames(0.38), { duration: 700, easing: 'ease-out' });
    if (card) card.flash();
    if (b && b.animate) b.animate(frames(0.14), { duration: 700, easing: 'ease-out' });
    flashTimer = setTimeout(flash, 5000 + Math.random() * 8000);
  };
  return {
    init() {
      const c = document.getElementById('mw-sky-fx');
      const p = document.getElementById('page-sky-fx');
      const a = document.getElementById('mw-alps');
      if (a && a.getContext) alps = createAlps(a);
      if (c && c.getContext) {
        card = createSkyFx(c, { strength: 1, size: 1, maxDpr: 2, clouds: 7, cloudBand: [-10, 110], lightAlpha: 0.7, drops: 130, flakes: 80,
          fogBand: [150, 290], curtain: 260, mountainY: 228, lowY: 182 });
        new IntersectionObserver(([e]) => card.setVisible(e.isIntersecting)).observe(c);
      }
      if (p && p.getContext) page = createSkyFx(p, { strength: 0.38, size: 1.9, maxDpr: 1, clouds: 6, cloudBand: [0.02, 0.32], drops: 70, flakes: 50 });
    },
    // c = { weather_code, is_day, cloud_cover, precipitation }
    set(c, fast = false) {
      if (fast) {   // beim Wischen: kurze Übergänge, damit der Himmel mitkommt
        document.documentElement.classList.add('sky-fast');
        clearTimeout(this.fastTimer);
        this.fastTimer = setTimeout(() => document.documentElement.classList.remove('sky-fast'), 500);
      }
      this.last = c;
      const next = skyScene(c);
      const base = SKY_LOOK[next];
      const look = isLightMode() ? { ...base, tone: lightTone(base.tone) } : base;
      const cover = Math.max(0, Math.min(1, (Number(c.cloud_cover) || 0) / 100));
      const amount = Math.min(1, 0.3 + (Number(c.precipitation) || 0) / 3);   // mm/h → Dichte
      document.getElementById('card-weather').dataset.sky = next;
      document.documentElement.dataset.sky = next;
      if (card) card.set(look, cover, amount, fast);
      if (alps) alps.set(next, c.temperature_2m != null ? Number(c.temperature_2m) : null, fast);
      if (page) page.set(look, cover, amount, fast);
      if (next !== scene) { scene = next; if (scene === 'thunder') flashTimer = setTimeout(flash, 1200); else clearTimeout(flashTimer); }
    },
    // hell/dunkel gewechselt: Wolkentöne + Berge neu
    refresh() {
      if (this.last) this.set(this.last);
      if (alps) alps.refresh();
    },
  };
})();

// Zeit-Zeiger im Stundenstreifen: welche Stunde Himmel + Kopfzeile bestimmt
const wxFocus = { idx: -1, nowIdx: -1 };
let skyLive = false;       // Live-Schalter: Himmel folgt beim Wischen jeder Stunde
try { skyLive = localStorage.getItem('sky-live') === '1'; } catch (e) { /* privates Fenster */ }
let weatherNow = null;     // aktuelle Werte (current) für "Jetzt"
let weatherToday = null;   // Tageswerte heute (daily)

function hourConditions(i) {
  const h = lastForecast.hourly;
  return { weather_code: h.weather_code[i], is_day: h.is_day[i], cloud_cover: h.cloud_cover[i], precipitation: h.precipitation[i], temperature_2m: h.temperature_2m[i] };
}

// Kopfzeile für die gewählte Stunde: Beschreibung · Zeit, Temperatur, Tageswerte
function renderFocusHeader(animate = false) {
  if (!lastForecast || wxFocus.idx < 0) return;
  const h = lastForecast.hourly;
  const i = wxFocus.idx;
  const isNow = i === wxFocus.nowIdx;
  const c = isNow && weatherNow ? weatherNow : hourConditions(i);
  const day = weatherDays.find((d) => i >= d.from && i <= d.to) || weatherDays[0];
  const hh = h.time[i].slice(11, 16);
  const when = isNow ? 'Jetzt' : `${day.isToday ? 'Heute' : WEEKDAYS[new Date(day.key + 'T12:00Z').getUTCDay()]} ${hh}`;
  const desc = `${wmoLabel(c.weather_code, c.is_day)} · ${when}`;
  const temp = c.temperature_2m != null ? c.temperature_2m : h.temperature_2m[i];
  const stats = day.isToday && weatherToday ? weatherToday : { tmax: day.max, tmin: day.min, rain: day.rain };
  if (animate) {
    swapValue($('#weather-desc'), desc);
    rollNumber($('#weather-tmax'), temp, (v) => `${Math.round(v)}°C`);
    rollNumber($('#weather-tmax-label'), stats.tmax, (v) => `${Math.round(v)} °C`);
    rollNumber($('#weather-tmin'), stats.tmin, (v) => `${Math.round(v)} °C`);
    rollNumber($('#weather-rain'), stats.rain, (v) => `${v.toFixed(1)} mm`);
  } else {
    $('#weather-desc').text(desc);
    $('#weather-tmax').text(`${Math.round(temp)}°C`);
    $('#weather-tmax-label').text(`${Math.round(stats.tmax)} °C`);
    $('#weather-tmin').text(`${Math.round(stats.tmin)} °C`);
    $('#weather-rain').text(`${stats.rain.toFixed(1)} mm`);
  }
  $('#weather-now').prop('hidden', isNow);
}

// Gewählte Stunde setzen → Himmel (Karte + Seite) und Kopfzeile folgen
function setWeatherFocus(i, animate = false, fast = false) {
  if (!lastForecast) return;
  const n = lastForecast.hourly.time.length;
  i = Math.max(0, Math.min(n - 1, i));
  // Details zuerst: sie folgen dem Streifen und können auf einer anderen Stunde stehen als der Fokus
  if (wxDetails.open) renderDetails(i);
  if (i === wxFocus.idx && !animate) return;
  wxFocus.idx = i;
  const isNow = i === wxFocus.nowIdx;
  sky.set(isNow && weatherNow ? weatherNow : hourConditions(i), fast);
  renderFocusHeader(animate);
}

// ═════════════════════════════════════════════════════════════════════════════
//  Wetterdetails: Bento-Kacheln hinter dem kleinen Pfeil neben "Tag wählen".
//  Zeigen die Stunde unter dem Zeit-Zeiger im Streifen oben (wischen = Details folgen).
//  Temperatur + Niederschlag kommen aus dem MeteoSwiss-Verlauf (gleiche Zahlen wie
//  im Streifen), der Rest (Wind, Feuchte, UV, Sonne, Druck, Sicht) aus einer
//  zweiten, kleinen Anfrage – die gibt ICON-CH2 nicht her.
// ═════════════════════════════════════════════════════════════════════════════
const wxDetails = { open: false, busy: false, key: '', data: null, req: null, idx: -1, arrow: null };
const WIND_DIRS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
const WIND_FROM = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
// Beaufort-Skala (Obergrenze in km/h → Bezeichnung)
const BEAUFORT = [[2, 'Windstill'], [6, 'Leiser Zug'], [12, 'Leichte Brise'], [20, 'Schwache Brise'], [29, 'Mässige Brise'],
  [39, 'Frische Brise'], [50, 'Starker Wind'], [62, 'Steifer Wind'], [75, 'Stürmischer Wind'], [89, 'Sturm'],
  [103, 'Schwerer Sturm'], [118, 'Orkanartiger Sturm'], [Infinity, 'Orkan']];

function loadWeatherDetails() {
  const key = `${weatherLoc.lat},${weatherLoc.lon}`;
  if (wxDetails.key === key && (wxDetails.data || wxDetails.req)) return;
  wxDetails.key = key;
  wxDetails.data = null;
  wxDetails.req = $.getJSON(WEATHER_API, {
    latitude: weatherLoc.lat,
    longitude: weatherLoc.lon,
    hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation_probability,'
      + 'wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,visibility,uv_index',
    daily: 'sunrise,sunset,uv_index_max',
    forecast_days: 5,
    timezone: 'Europe/Zurich',
  }).done((data) => {
    if (wxDetails.key !== key || !data.hourly) return;
    data.at = new Map(data.hourly.time.map((t, i) => [t, i]));   // Stunde → Index (Zeiten als Schlüssel)
    wxDetails.data = data;
    if (wxDetails.open) renderDetails(wxDetails.idx, true);
  }).always(() => { if (wxDetails.key === key) wxDetails.req = null; });
}

// Minuten seit 1970 für "YYYY-MM-DDTHH:MM" (Ortszeit als UTC gelesen – nur für Differenzen)
const wxMin = (s) => Date.parse(`${s}Z`) / 6e4;
function zurichNowMin() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return wxMin(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`);
}
const fmtDur = (m) => {
  m = Math.round(m);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
};

function renderDetails(i, force = false) {
  if (!lastForecast || !weatherDays.length) return;
  const h = lastForecast.hourly;
  i = Math.max(0, Math.min(h.time.length - 1, i));
  if (i === wxDetails.idx && !force) return;
  wxDetails.idx = i;
  const isNow = i === wxFocus.nowIdx;
  const day = weatherDays.find((d) => i >= d.from && i <= d.to) || weatherDays[0];
  $('#wd-title').text(isNow ? 'Jetzt' : `${day.isToday ? 'Heute' : day.name} ${h.time[i].slice(11, 16)}`);

  const D = wxDetails.data;
  const j = D ? D.at.get(h.time[i]) : undefined;
  const v = (k, at = j) => (at != null && D.hourly[k] && D.hourly[k][at] != null ? D.hourly[k][at] : null);
  const dash = '–';
  const loading = !D;
  const temp = isNow && weatherNow && weatherNow.temperature_2m != null ? weatherNow.temperature_2m : h.temperature_2m[i];

  // Wind: Werte, Beaufort in Worten, Pfeil zeigt wohin der Wind weht
  const ws = v('wind_speed_10m'), wg = v('wind_gusts_10m'), wdir = v('wind_direction_10m');
  const sector = wdir == null ? -1 : Math.round(wdir / 45) % 8;
  $('#wd-wind').text(ws == null ? dash : `${Math.round(ws)} km/h`);
  $('#wd-gust').text(wg == null ? dash : `${Math.round(wg)} km/h`);
  $('#wd-dir').text(sector < 0 ? dash : `${WIND_DIRS[sector]} · ${Math.round(wdir)}°`);
  $('#wd-wind-c').text(ws == null ? dash : Math.round(ws));
  $('#wd-wind-note').text(loading ? 'Lädt …' : ws == null ? dash
    : `${BEAUFORT.find(([max]) => ws < max)[1]}${ws >= 2 && sector >= 0 ? ` aus ${WIND_FROM[sector]}` : ''}`);
  if (wdir != null) {
    let deg = wdir + 180;
    // kürzester Weg: nie einmal rundherum drehen (350° → 10° = +20°)
    if (wxDetails.arrow != null) deg = wxDetails.arrow + ((((deg - wxDetails.arrow) % 360) + 540) % 360 - 180);
    wxDetails.arrow = deg;
    document.getElementById('wd-arrow').style.transform = `rotate(${deg}deg)`;
  }

  // Luftfeuchtigkeit + Taupunkt
  const rh = v('relative_humidity_2m'), dew = v('dew_point_2m');
  $('#wd-hum').text(rh == null ? dash : `${Math.round(rh)} %`);
  $('#wd-hum-bar').css('transform', `scaleX(${rh == null ? 0 : rh / 100})`);
  $('#wd-dew').text(dew == null ? (loading ? 'Lädt …' : dash) : `Der Taupunkt liegt bei ${Math.round(dew)}°.`);

  // Niederschlag: diese Stunde (wie die Balken im Streifen) + Wahrscheinlichkeit + ganzer Tag
  const pr = h.precipitation[i] || 0, pp = v('precipitation_probability');
  const snow = pr > 0 && temp <= 0.5;
  $('#wd-prec').html(`${pr.toFixed(1)} <small>mm${snow ? ' Schnee' : ''}</small>`);
  $('#wd-prob-bar').css('transform', `scaleX(${pp == null ? 0 : pp / 100})`);
  $('#wd-prob').text(pp == null ? (loading ? 'Lädt …' : dash) : `${Math.round(pp)} % Wahrscheinlichkeit`);
  $('#wd-prec-day').text(`${day.isToday ? 'Heute' : day.name} insgesamt ${day.rain.toFixed(1)} mm`);

  // Gefühlt: Unterschied aus dem Modell auf die Streifen-Temperatur rechnen (bleibt stimmig)
  const at = v('apparent_temperature'), tb = v('temperature_2m');
  const diff = at != null && tb != null ? at - tb : null;
  $('#wd-feels').text(diff == null ? dash : `${Math.round(temp + diff)}°`);
  let why = 'Fühlt sich etwa so an wie gemessen.';
  if (diff != null && diff <= -1.5) why = ws != null && ws >= 10 ? 'Der Wind lässt es kühler wirken.' : 'Fühlt sich kühler an.';
  if (diff != null && diff >= 1.5) why = rh != null && rh >= 65 ? 'Die feuchte Luft lässt es wärmer wirken.' : 'Die Sonne lässt es wärmer wirken.';
  $('#wd-feels-note').text(diff == null ? (loading ? 'Lädt …' : dash) : `Gemessen ${Math.round(temp)}°. ${why}`);

  // UV-Index
  const k = D ? D.daily.time.indexOf(day.key) : -1;
  const uv = v('uv_index');
  const uvMax = k >= 0 ? D.daily.uv_index_max[k] : null;
  const uvWord = (x) => (x < 3 ? 'Niedrig' : x < 6 ? 'Mässig' : x < 8 ? 'Hoch' : x < 11 ? 'Sehr hoch' : 'Extrem');
  $('#wd-uv').text(uv == null ? dash : Math.round(uv));
  $('#wd-uv-label').text(uv == null ? '' : uvWord(uv));
  $('#wd-uv-dot').css('left', `${uv == null ? 0 : Math.min(100, (uv / 11) * 100)}%`);
  $('#wd-uv-note').text(loading ? 'Lädt …' : !h.is_day[i] ? 'Nachts keine UV-Strahlung.'
    : uv != null && uv >= 3 ? 'Sonnenschutz empfohlen.' : uvMax != null ? `Höchstwert am Tag: ${Math.round(uvMax)}` : dash);

  // Sonne: Auf-/Untergang des Tages, Sonne auf dem Bogen zur gewählten Zeit
  const rise = k >= 0 ? D.daily.sunrise[k] : null, set = k >= 0 ? D.daily.sunset[k] : null;
  $('#wd-rise').text(rise ? rise.slice(11, 16) : dash);
  $('#wd-set').text(set ? set.slice(11, 16) : dash);
  if (rise && set) {
    const r = wxMin(rise), s = wxMin(set);
    const t = isNow ? zurichNowMin() : wxMin(h.time[i]);
    const f = Math.max(0, Math.min(1, (t - r) / (s - r)));
    const x = (1 - f) ** 2 * 14 + 2 * (1 - f) * f * 100 + f * f * 186;   // Punkt auf der Bézier-Kurve
    const y = (1 - f) ** 2 * 56 + 2 * (1 - f) * f * -18 + f * f * 56;
    document.getElementById('wd-sun-dot').style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    document.getElementById('wd-sun-done').style.strokeDashoffset = String(1 - f);
    const night = t < r || t > s;
    $('#wd-sun-arc').toggleClass('is-night', night);
    $('#wd-daylen').text(`Tageslänge ${fmtDur(s - r)}${night ? '' : ` · noch ${fmtDur(s - t)} hell`}`);
  } else {
    $('#wd-daylen').text(loading ? 'Lädt …' : dash);
  }

  // Luftdruck + Tendenz der letzten 3 Stunden
  const p = v('pressure_msl'), p3 = j != null && j >= 3 ? v('pressure_msl', j - 3) : null;
  $('#wd-press').html(p == null ? dash : `${Math.round(p)} <small>hPa</small>`);
  $('#wd-press-dot').css('left', `${p == null ? 50 : Math.max(0, Math.min(100, ((p - 980) / 60) * 100))}%`);
  let trend = loading ? 'Lädt …' : dash;
  if (p != null && p3 != null) {
    const dp = p - p3;
    trend = dp >= 1 ? `Steigend, +${dp.toFixed(1)} hPa in 3 Std.` : dp <= -1 ? `Fallend, ${dp.toFixed(1)} hPa in 3 Std.` : 'Gleichbleibend';
  } else if (p != null) trend = p >= 1020 ? 'Hochdruck' : p <= 1005 ? 'Tiefdruck' : 'Normaler Luftdruck';
  $('#wd-press-trend').text(trend);

  // Sichtweite
  const vis = v('visibility');
  const km = vis == null ? null : vis / 1000;
  $('#wd-vis').html(km == null ? dash : `${km >= 10 ? Math.round(km) : km.toFixed(1)} <small>km</small>`);
  $('#wd-vis-bar').css('transform', `scaleX(${km == null ? 0 : Math.min(1, km / 30)})`);
  $('#wd-vis-note').text(km == null ? (loading ? 'Lädt …' : dash)
    : km >= 10 ? 'Klare Sicht.' : km >= 4 ? 'Gute Sicht.' : km >= 1 ? 'Dunstig.' : 'Nebel, kaum Sicht.');
}

// 5-Tage-Prognose ⇄ Details am gleichen Platz: kurz ausblenden, Höhe gleitet mit, Kacheln kommen gestaffelt.
// Ab 1200px steht die Karte neben Katze + Bitcoin: dort bleibt die Höhe gleich und die
// Kacheln scrollen im Panel – sonst würden die Nachbarkarten leer mitwachsen.
const wxWideRow = window.matchMedia('(min-width: 1200px)');
function setDetailsOpen(open, instant = false) {
  if (open === wxDetails.open || (wxDetails.busy && !instant)) return;
  wxDetails.open = open;
  const lower = document.getElementById('weather-lower');
  const days = document.getElementById('weather-chart-card');
  const det = document.getElementById('weather-details');
  const from = open ? days : det, to = open ? det : days;
  $('#weather-details-open').attr('aria-expanded', String(open));
  if (open) {
    const dh = days.hidden ? 0 : days.getBoundingClientRect().height;   // exakt, sonst 1px-Sprung
    if (dh) lower.style.setProperty('--mw-lower-h', `${dh}px`);
    det.querySelector('.mw-bento').scrollTop = 0;
    loadWeatherDetails();
    renderDetails(wxStrip ? stripCenterIndex() : wxFocus.idx, true);
  }
  const swap = () => {
    from.hidden = true;
    to.hidden = false;
    lower.classList.toggle('is-fixed', open && wxWideRow.matches);
    if (!open) { const ch = Highcharts.charts.find((c) => c && c.renderTo.id === 'weather-week'); if (ch) ch.reflow(); }
  };
  if (instant || reduceMotion.matches || !lower.animate) { swap(); return; }
  wxDetails.busy = true;
  const ease = 'cubic-bezier(.22,1,.36,1)';
  const h0 = lower.offsetHeight;
  const out = from.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.985)' }], { duration: 130, easing: 'ease-in', fill: 'forwards' });
  out.onfinish = () => {
    swap();
    out.cancel();
    const h1 = lower.offsetHeight;
    lower.style.overflow = 'hidden';
    const grow = lower.animate([{ height: `${h0}px` }, { height: `${h1}px` }], { duration: 380, easing: ease });
    grow.onfinish = () => { lower.style.overflow = ''; wxDetails.busy = false; };
    if (open) {
      det.querySelector('.mw-details-head').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      det.querySelectorAll('.mw-tile').forEach((t, n) => t.animate(
        [{ opacity: 0, transform: 'translateY(12px) scale(.97)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: 35 * n, easing: ease, fill: 'backwards' }));
    } else {
      to.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: ease });
    }
    document.getElementById(open ? 'weather-details-close' : 'weather-details-open').focus({ preventScroll: true });
  };
}

// Beim Öffnen der Seite: nur den aktuellen Himmel holen (kein Laden der Wetterdaten)
function loadSkyNow() {
  $.getJSON(WEATHER_API, {
    latitude: weatherLoc.lat, longitude: weatherLoc.lon,
    current: 'weather_code,is_day,cloud_cover,precipitation,temperature_2m', timezone: 'Europe/Zurich',
  }).done((data) => { if (data.current && !lastForecast) sky.set(data.current); });
}

function loadWeather() {
  const $btn = $('#btn-weather');
  setLoading($btn, true);
  // Skeleton statt hartem Aufspringen (offene Details schliessen: neuer Ort, neue Daten)
  setDetailsOpen(false, true);
  $('#weather-empty, #weather-hourly-wrap, #weather-chart-card').addClass('d-none');
  $('#weather-skeleton').removeClass('d-none');

  // Heute: Tmax, Tmin, Niederschlag
  const today = $.getJSON(WEATHER_API, {
    latitude: weatherLoc.lat,
    longitude: weatherLoc.lon,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    current: 'weather_code,is_day,cloud_cover,precipitation,temperature_2m',   // "Jetzt" für Himmel + Kopfzeile
    forecast_days: 1,
    timezone: 'Europe/Zurich',
  }).done((data) => {
    const d = data.daily;
    weatherToday = { tmax: d.temperature_2m_max[0], tmin: d.temperature_2m_min[0], rain: d.precipitation_sum[0] };
    weatherNow = data.current || null;
  });

  // Für die Schnellen: stündlicher Verlauf der nächsten 5 Tage (MeteoSwiss-Modell)
  const forecast = $.getJSON(WEATHER_API, {
    latitude: weatherLoc.lat,
    longitude: weatherLoc.lon,
    hourly: 'temperature_2m,precipitation,weather_code,cloud_cover,is_day',   // auch für den Live-Himmel
    forecast_days: 5,
    models: 'meteoswiss_icon_ch2', // ch1 reicht nur ~33 h, ch2 deckt die vollen 5 Tage ab
    timezone: 'Europe/Zurich',
  }).done(renderWeatherChart);

  // Erst wenn beides da ist: Himmel + Kopfzeile auf "Jetzt" (mit Zahlen-Animation)
  $.when(today, forecast).done(() => {
    if (wxFocus.idx === wxFocus.nowIdx || wxFocus.idx < 0) setWeatherFocus(wxFocus.nowIdx, true);
    else renderFocusHeader(true);
    loadWeatherDetails();   // Details schon mal holen → Pfeil öffnet sofort
  });
  $.when(today, forecast)
    .fail(() => {
      $('#weather-skeleton').addClass('d-none');
      if (!lastForecast) $('#weather-empty').removeClass('d-none');
      else $('#weather-hourly-wrap, #weather-chart-card').removeClass('d-none');
      showToast('Open-Meteo ist gerade nicht erreichbar.');
    })
    .always(() => setLoading($btn, false));
}

let lastForecast = null; // für Neuzeichnen beim Theme-Wechsel

// CSS-Variable lesen (damit der Chart Hell/Dunkel mitmacht)
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Kurze Wetterbeschreibung aus Tagesniederschlag und Temperatur
function describeDay(rainMm, tmax) {
  if (rainMm >= 0.2 && tmax <= 1) return 'Schneefall möglich';
  if (rainMm < 0.2) return 'Meist trocken';
  if (rainMm < 1)   return 'Vereinzelt leichter Regen';
  if (rainMm < 5)   return 'Leichter Regen';
  return 'Regnerisch';
}

// Icon (Bootstrap Icons) passend zum Tageswetter
function dayIcon(rainMm, tmax) {
  if (rainMm >= 0.5 && tmax <= 1) return icon('snow', 'ic-snow');
  if (rainMm < 0.2) return icon('sun', 'ic-sun');
  if (rainMm < 1)   return icon('suncloud', 'ic-mix');
  if (rainMm < 5)   return icon('rain', 'ic-rain');
  return icon('rain', 'ic-rain ic-heavy');
}

// Aktuelle Stunde in Zürich als "YYYY-MM-DDTHH:00" (Format der Open-Meteo-Zeiten)
function zurichHourKey() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:00`;
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MW_RED = '#e0353b';
const MW_BLUE = '#1f3bff';

let weatherDays = [];      // pro Tag: key, Index-Bereich, min, max, Regen
let weatherSelDay = null;  // gewählter Tag (key); null bzw. heute = "nächste 12 Std."

function renderWeatherChart(data) {
  lastForecast = data;
  const h = data.hourly;
  wxFocus.nowIdx = Math.max(0, h.time.indexOf(zurichHourKey()));
  wxFocus.idx = -1;

  Highcharts.setOptions({ lang: {
    weekdays: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    shortWeekdays: WEEKDAYS,
  } });

  // ── Tage zusammenfassen ───────────────────────────────────────────────────
  weatherDays = [];
  h.time.forEach((t, i) => {
    const key = t.slice(0, 10);
    let d = weatherDays[weatherDays.length - 1];
    if (!d || d.key !== key) { d = { key, from: i, to: i, temps: [], rain: 0 }; weatherDays.push(d); }
    d.to = i;
    if (h.temperature_2m[i] != null) d.temps.push(h.temperature_2m[i]);
    d.rain += h.precipitation[i] || 0;
  });
  const todayKey = zurichHourKey().slice(0, 10);
  const $grid = $('#weather-days').empty();
  weatherDays.forEach((d) => {
    d.min = Math.round(Math.min(...d.temps));
    d.max = Math.round(Math.max(...d.temps));
    d.isToday = d.key === todayKey;
    d.name = d.isToday ? 'Heute' : WEEKDAYS[new Date(d.key + 'T12:00Z').getUTCDay()];
    d.date = `${d.key.slice(8, 10)}.${d.key.slice(5, 7)}.`;
    $(`
      <button type="button" class="mw-day" aria-pressed="false" aria-controls="weather-hourly-wrap"
              title="${d.rain.toFixed(1)} mm Niederschlag">
        <span class="mw-day-name">${d.name}</span>
        <span class="mw-day-date">${d.date}</span>
        <span class="mw-day-icon">${dayIcon(d.rain, d.max)}</span>
        <span class="mw-day-temp">${d.min}°<span class="sep">|</span>${d.max}°</span>
      </button>`).data('day', d.key).appendTo($grid);
  });

  // ── Einblenden: Skeleton weg, Bereiche sanft rein (zuerst sichtbar machen,
  //    damit die Charts ihre echte Breite kennen) ──────────────────────────────
  $('#weather-skeleton, #weather-empty').addClass('d-none');
  $('#weather-hourly-wrap, #weather-chart-card').removeClass('d-none');

  initStripScroll();
  renderWeatherStrip();
  renderWeekChart();

  // Fusszeile: Spannweite der 5 Tage
  const all = h.temperature_2m.filter((v) => v != null);
  const rainSum = h.precipitation.reduce((s, v) => s + (v || 0), 0);
  $('#weather-trend').text(`5 Tage: ${Math.round(Math.min(...all))}° bis ${Math.round(Math.max(...all))}° · ${rainSum.toFixed(1)} mm · Open-Meteo`);
}

// Farben der Wetter-Charts (ruhig, wie bei SRF Meteo)
const WX_TEMP = '#ff6b6b';
// Schrift/Linien in der Wetterkarte: weiss auf dunklem Himmel, dunkelblau auf hellem (Hell-Modus)
const wxInk = (a = 1) => (isLightMode() ? `rgba(14,28,51,${a})` : `rgba(255,255,255,${a})`);
const WX_RAIN = 'rgba(140,180,255,.8)';
const WX_HOURS_VISIBLE = 12;          // so viele Stunden sieht man im Streifen gleichzeitig
const wxFill = (a, b) => ({ linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
  stops: [[0, Highcharts.color(WX_TEMP).setOpacity(a).get()], [1, Highcharts.color(WX_TEMP).setOpacity(b).get()]] });

let wxStrip = null;   // Highcharts-Instanz des Streifens

// ── Oberer Streifen: ganzer 5-Tage-Verlauf, seitlich wischbar ───────────────
function renderWeatherStrip() {
  if (!lastForecast) return;
  const h = lastForecast.hourly;
  const scroller = document.getElementById('weather-scroll');
  const viewW = scroller.clientWidth || 600;
  const times = h.time.map((t) => Date.parse(t + 'Z'));
  const n = times.length;

  // Position merken, damit z.B. ein Theme-Wechsel nicht zurückspringt
  const keepTime = wxStrip ? wxStrip.xAxis[0].toValue(scroller.scrollLeft + viewW / 2) : null;

  // Breite so wählen, dass 12 Stunden in den sichtbaren Bereich passen
  const hourPx = viewW / WX_HOURS_VISIBLE;
  const fullW = Math.round(hourPx * (n - 1) + 20);
  $('#weather-hourly').css('width', fullW);

  const pts = (k) => times.map((t, i) => [t, h[k][i]]);
  const rainMax = Math.max(...h.precipitation.map((v) => v || 0));
  const nowKey = zurichHourKey();
  const nowIdx = Math.max(0, h.time.indexOf(nowKey));
  const nowT = times[nowIdx];
  const midnights = times.filter((t, i) => i > 0 && new Date(t).getUTCHours() === 0);

  wxStrip = Highcharts.chart('weather-hourly', {
    chart: {
      width: fullW, backgroundColor: 'transparent', spacing: [6, 10, 4, 10],
      style: { fontFamily: cssVar('--font-sans') }, animation: false,
    },
    title: { text: null }, credits: { enabled: false }, legend: { enabled: false },
    xAxis: {
      type: 'datetime', lineWidth: 1, lineColor: wxInk(0.18), tickLength: 0,
      tickInterval: 2 * 36e5, gridLineWidth: 0,
      labels: {
        useHTML: true, y: 15,
        style: { color: wxInk(0.65), fontSize: '11px' },
        // Um Mitternacht steht der Wochentag statt "00"
        formatter() {
          const d = new Date(this.value);
          if (d.getUTCHours() === 0) return `<b class="mw-tick-day">${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}.</b>`;
          return String(d.getUTCHours()).padStart(2, '0');
        },
      },
      crosshair: { color: wxInk(0.3), width: 1 },
      plotLines: [
        ...midnights.map((t) => ({ value: t, color: wxInk(0.45), width: 1, dashStyle: 'Dash' })),
        { value: nowT, color: 'rgba(255,107,107,.6)', width: 1, dashStyle: 'Dot', zIndex: 2,
          label: { text: 'Jetzt', rotation: 0, align: 'left', verticalAlign: 'bottom', x: 4, y: -6, style: { color: isLightMode() ? '#c8323b' : '#ff9b9b', fontSize: '10px', fontWeight: '500' } } },
      ],
    },
    yAxis: [
      { visible: false, maxPadding: 0.18, minPadding: 0.04, startOnTick: false, endOnTick: false },
      { visible: false, min: 0, max: Math.max(3, rainMax * 1.6) },
    ],
    // followTouchMove aus: sonst schluckt Highcharts das Wischen (touch-action: none) und der Streifen scrollt nicht
    tooltip: { ...weatherTooltip(), followTouchMove: false },
    plotOptions: { series: { marker: { enabled: false }, animation: false } },
    series: [
      { name: 'Niederschlag', unit: 'mm', type: 'column', yAxis: 1, data: pts('precipitation'), color: WX_RAIN, borderWidth: 0, borderRadius: 2, pointPadding: 0.34, groupPadding: 0 },
      {
        name: 'Temperatur', unit: '°C', type: 'areaspline', data: pts('temperature_2m'), color: WX_TEMP, lineWidth: 2,
        fillColor: wxFill(0.22, 0), threshold: null,
        dataLabels: {
          enabled: true, formatter() { return new Date(this.x).getUTCHours() % 2 === 0 ? `${Math.round(this.y)}°` : null; },
          style: { color: wxInk(1), textOutline: 'none', fontSize: '12px', fontWeight: '500' }, y: -6,
        },
      },
      { name: 'Jetzt', type: 'scatter', data: [[nowT, h.temperature_2m[nowIdx]]], color: WX_TEMP, marker: { enabled: true, radius: 4, symbol: 'circle', lineColor: isLightMode() ? 'rgba(255,255,255,.9)' : '#fff', lineWidth: 1.5 }, enableMouseTracking: false },
    ],
  });

  // Start: "Jetzt" unter dem Zeit-Zeiger in der Mitte (bzw. vorherige Position halten)
  if (keepTime != null) scrollStripTo(keepTime, 'center', false);
  else scrollStripTo(nowT, 'center', false);
  updateStripHeader();
  setWeatherFocus(stripCenterIndex());
}

// Streifen zu einem Zeitpunkt scrollen.
// Eigene, kurze Animation statt scrollTo({behavior:'smooth'}): die ist auf dem Handy
// träge (bis ~1 s) und lässt sich nicht abbrechen.
const strip = { raf: 0, busy: false, lastKey: '', lastHour: null };
function stopStripAnim() {
  if (strip.raf) cancelAnimationFrame(strip.raf);
  strip.raf = 0;
  strip.busy = false;
}
function scrollStripTo(t, where = 'left', smooth = true) {
  if (!wxStrip) return;
  const scroller = document.getElementById('weather-scroll');
  const x = wxStrip.xAxis[0].toPixels(t);
  const max = scroller.scrollWidth - scroller.clientWidth;
  const target = Math.max(0, Math.min(max, where === 'center' ? x - scroller.clientWidth / 2 : x - 14));
  const from = scroller.scrollLeft;
  stopStripAnim();
  if (!smooth || reduceMotion.matches || Math.abs(target - from) < 2) { scroller.scrollLeft = target; return; }
  const dist = target - from;
  const dur = Math.min(320, 180 + Math.abs(dist) / 20);   // kurz, auch über mehrere Tage
  const t0 = performance.now();
  strip.busy = true;                                       // Kopfzeile während der Fahrt nicht umschalten
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    scroller.scrollLeft = from + dist * (1 - (1 - p) ** 3); // easeOutCubic
    if (p < 1) { strip.raf = requestAnimationFrame(step); return; }
    strip.raf = 0;
    strip.busy = false;
  };
  strip.raf = requestAnimationFrame(step);
}

// Kopfzeile + Markierung in der 5-Tage-Leiste für einen Tag setzen
function showStripDay(d) {
  weatherSelDay = d.key;
  strip.lastKey = d.key;
  const wd = WEEKDAYS[new Date(d.key + 'T12:00Z').getUTCDay()];
  $('#weather-strip-title').text(d.isToday ? `Heute, ${wd} ${d.date}` : `${d.name}, ${d.date}`);
  $('#weather-hourly-day').text(`${d.min}° bis ${d.max}°`);
  $('#weather-strip-rain').text(d.rain >= 0.1 ? `${d.rain.toFixed(1)} mm Regen` : 'trocken');
  $('.mw-day').each(function () { $(this).attr('aria-pressed', $(this).data('day') === d.key); });
}

// Tag in der Mitte des sichtbaren Bereichs bestimmen
function stripCenterDay() {
  if (!wxStrip || !weatherDays.length) return null;
  const scroller = document.getElementById('weather-scroll');
  const t = wxStrip.xAxis[0].toValue(scroller.scrollLeft + scroller.clientWidth / 2);
  const key = new Date(t).toISOString().slice(0, 10);
  return weatherDays.find((x) => x.key === key) || (t < Date.parse(weatherDays[0].key) ? weatherDays[0] : weatherDays[weatherDays.length - 1]);
}

// Kopfzeile + gewählter Tag folgen dem Tag in der Mitte des sichtbaren Bereichs
function updateStripHeader() {
  const d = stripCenterDay();
  if (d) showStripDay(d);
}

// Tag in der 5-Tage-Leiste angetippt → sofort markieren, dann Streifen dorthin fahren
function selectWeatherDay(key) {
  const d = weatherDays.find((x) => x.key === key);
  if (!d || !lastForecast) return;
  showStripDay(d);
  const h = lastForecast.hourly;
  // Heute: jetzt; andere Tage: 12 Uhr – das Wetter des Tages. Himmel + Kopfzeile sofort.
  const idx = d.isToday ? wxFocus.nowIdx : Math.min(d.from + 12, d.to);
  setWeatherFocus(idx);
  scrollStripTo(Date.parse(h.time[idx] + 'Z'), 'center', true);
}

// Stunde unter dem Zeit-Zeiger (Mitte des Streifens) als Index in den Stundendaten
function stripCenterIndex() {
  if (!wxStrip || !lastForecast) return wxFocus.nowIdx;
  const scroller = document.getElementById('weather-scroll');
  const t = wxStrip.xAxis[0].toValue(scroller.scrollLeft + scroller.clientWidth / 2);
  const t0 = Date.parse(lastForecast.hourly.time[0] + 'Z');
  return Math.round((t - t0) / 36e5);
}

// Ziehen mit der Maus, Pfeiltasten und Shift+Mausrad (Touch & Trackpad scrollen nativ)
function initStripScroll() {
  const el = document.getElementById('weather-scroll');
  if (!el || el.dataset.ready) return;
  el.dataset.ready = '1';
  // Beim Scrollen nur reagieren, wenn der Tag in der Mitte wechselt (günstig).
  // Während einer Fahrt nach Antippen bleibt der angetippte Tag stehen.
  el.addEventListener('scroll', () => {
    if (!wxStrip || strip.busy) return;
    // Wie das Timer-Rad: jede Stunde, die durch die Mitte läuft, gibt einen Tick
    const hour = Math.round(wxStrip.xAxis[0].toValue(el.scrollLeft + el.clientWidth / 2) / 36e5);
    if (hour !== strip.lastHour) {
      if (strip.lastHour != null) haptics.scrub();
      strip.lastHour = hour;
      if (skyLive) setWeatherFocus(stripCenterIndex(), false, true);   // Live: Himmel + Kopfzeile folgen der Mitte
      else if (wxDetails.open) renderDetails(stripCenterIndex());     // Details folgen der Mitte immer
    }
    const d = stripCenterDay();
    if (d && d.key !== strip.lastKey) showStripDay(d);
  }, { passive: true });
  // Selbst wischen/scrollen bricht eine laufende Fahrt sofort ab
  ['touchstart', 'wheel', 'pointerdown'].forEach((type) => el.addEventListener(type, stopStripAnim, { passive: true }));

  let drag = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: el.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 3) { drag.moved = true; el.classList.add('is-dragging'); }
    if (drag.moved) el.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null;
    el.classList.remove('is-dragging');
  });
  el.addEventListener('keydown', (e) => {
    const hourPx = el.clientWidth / WX_HOURS_VISIBLE;
    if (e.key === 'ArrowRight') { el.scrollBy({ left: hourPx * 2, behavior: 'smooth' }); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { el.scrollBy({ left: -hourPx * 2, behavior: 'smooth' }); e.preventDefault(); }
  });
  // Bei Grössenänderung neu aufbauen (Stundenbreite hängt von der Breite ab)
  let rt;
  new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (lastForecast && wxStrip && Math.abs(wxStrip.chartWidth - Math.round((el.clientWidth / WX_HOURS_VISIBLE) * (lastForecast.hourly.time.length - 1) + 20)) > 4) renderWeatherStrip(); }, 200); }).observe(el);
}

// ── Unterer Wochenverlauf: immer alle 5 Tage, unabhängig von der Auswahl ────
function renderWeekChart() {
  if (!lastForecast || !weatherDays.length) return;
  const h = lastForecast.hourly;
  const pts = (k) => h.time.map((t, i) => [Date.parse(t + 'Z'), h[k][i]]);
  const dayStart = Date.parse(weatherDays[0].key + 'T00:00Z');
  const dayEnd = dayStart + weatherDays.length * 864e5;

  Highcharts.chart('weather-week', {
    // Keine Ränder: die Tage liegen genau unter den Spalten darüber
    chart: { backgroundColor: 'transparent', margin: [10, 0, 2, 0], style: { fontFamily: cssVar('--font-sans') } },
    title: { text: null }, credits: { enabled: false }, legend: { enabled: false },
    xAxis: {
      type: 'datetime', min: dayStart, max: dayEnd, lineWidth: 0, tickLength: 0, labels: { enabled: false }, gridLineWidth: 0,
      // Deutliche Tagestrenner
      plotLines: weatherDays.slice(1).map((_, i) => ({ value: dayStart + (i + 1) * 864e5, color: wxInk(isLightMode() ? 0.22 : 0.4), width: 1.5, zIndex: 3 })),
      crosshair: { color: wxInk(0.3), width: 1 },
    },
    yAxis: [
      { visible: false, maxPadding: 0.15, minPadding: 0.1, startOnTick: false, endOnTick: false },
      { visible: false, min: 0, max: 6 },
    ],
    tooltip: weatherTooltip(),
    plotOptions: { series: { marker: { enabled: false }, animation: { duration: 500 } } },
    series: [
      { name: 'Niederschlag', unit: 'mm', type: 'column', yAxis: 1, data: pts('precipitation'), color: 'rgba(140,180,255,.45)', borderWidth: 0, pointPadding: 0, groupPadding: 0 },
      { name: 'Temperatur', unit: '°C', type: 'areaspline', data: pts('temperature_2m'), color: WX_TEMP, lineWidth: 2, fillColor: wxFill(0.18, 0), threshold: null },
    ],
  });
}

// Gemeinsamer Tooltip im shadcn-Stil
function weatherTooltip() {
  return {
    shared: true, useHTML: true, outside: true,
    backgroundColor: 'transparent', borderWidth: 0, shadow: false, padding: 0,
    formatter() {
      const rows = this.points.filter((p) => p.series.options.unit).map((p) => `
        <div class="ui-chart-tooltip-row">
          <i class="ui-chart-dot" style="background:${p.color}"></i>
          <span class="name">${p.series.name}</span>
          <span class="val">${p.y.toFixed(1)} ${p.series.options.unit}</span>
        </div>`).join('');
      return `<div class="ui-chart-tooltip"><div class="ui-chart-tooltip-label">${Highcharts.dateFormat('%A, %H:%M', this.x)}</div>${rows}</div>`;
    },
  };
}

// ── d) Die 5 nächstgelegenen Strom-Tankstellen ───────────────────────────────
let evStations = null; // Cache: Datei ist ~1 MB, nur einmal laden

function fetchStations() {
  if (evStations) return $.Deferred().resolve(evStations).promise();

  return $.getJSON(EV_API).then((data) => {
    const byKey = new Map();
    data.EVSEData.forEach((operator) => {
      operator.EVSEDataRecord.forEach((r) => {
        // Nur öffentlich zugängliche Stationen
        if (!/publicly accessible/.test(r.Accessibility)) return;
        const [lat, lon] = r.GeoCoordinates.Google.split(/[ ,]+/).map(Number);
        if (!isFinite(lat) || !isFinite(lon)) return;

        const power = Math.max(0, ...[].concat(r.ChargingFacilities || []).map((f) => parseFloat(f && f.power) || 0));
        const plugs = [].concat(r.Plugs || []).filter(Boolean);

        // Ein Standort hat oft mehrere Ladepunkte → pro Standort (~10 m) zusammenfassen
        const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        const known = byKey.get(key);
        if (known) {
          known.points += 1;
          known.power = Math.max(known.power, power);
          plugs.forEach((p) => known.plugs.add(p));
          return;
        }
        // ChargingStationNames ist meist ein Array, manchmal aber ein einzelnes Objekt
        const names = [].concat(r.ChargingStationNames || []);
        const name = (names.find((n) => n.lang === 'de') || names[0] || {}).value || 'Ladestation';
        const a = r.Address || {};
        byKey.set(key, {
          lat, lon, name,
          address: [a.Street, [a.PostalCode, a.City].filter(Boolean).join(' ')].filter(Boolean).join(', '),
          operator: operator.OperatorName,
          paying: /^Paying/.test(r.Accessibility),
          open24: r.IsOpen24Hours === true,
          power,
          plugs: new Set(plugs),
          points: 1,
        });
      });
    });
    evStations = [...byKey.values()];
    return evStations;
  });
}

// ── Expandable Cards ─────────────────────────────────────────────────────────
function renderStations(originLat, originLon, originLabel) {
  const nearest = evStations
    .map((s) => ({ ...s, dist: distanceKm(originLat, originLon, s.lat, s.lon) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5);

  const $list = $('#ev-list').empty();
  nearest.forEach((s, i) => {
    s.rank = i + 1;
    $(`
      <article class="ev-card" role="listitem" tabindex="0" aria-haspopup="dialog" style="--i:${i}">
        <div class="ev-card-media">
          <img src="${aerialTile(s.lat, s.lon)}" alt="" loading="lazy" />
          <span class="ev-rank-pill">${s.rank}</span>
          <span class="ev-dist-pill">${s.dist.toFixed(1)} km</span>
        </div>
        <div class="ev-card-body">
          <h4 class="ev-card-title">${esc(s.name)}</h4>
          <p class="ev-card-sub">${esc(s.address || s.operator)}</p>
        </div>
      </article>`)
      .data('station', s)
      .appendTo($list);
  });

  $('#ev-placeholder').addClass('d-none');
  $('#ev-list, #ev-hint').removeClass('d-none');
  $('#ev-origin').text(originLabel);

  showStationsOnMap(nearest, originLat, originLon);
}

// Skeleton-Karten, solange die ~1 MB grosse Datei lädt
function showStationSkeleton() {
  if (evStations) return;
  const $list = $('#ev-list').empty();
  for (let i = 0; i < 4; i++) {
    $list.append(`<div class="ev-card is-skeleton" aria-hidden="true">
      <div class="ev-card-media ui-skeleton"></div>
      <div class="ev-card-body"><div class="ui-skeleton" style="height:14px;width:70%"></div>
      <div class="ui-skeleton mt-2" style="height:12px;width:50%"></div></div></div>`);
  }
  $('#ev-placeholder').addClass('d-none');
  $list.removeClass('d-none');
}

function hideStationSkeletonOnError() {
  if (evStations) return;
  $('#ev-list').addClass('d-none').empty();
  $('#ev-placeholder').removeClass('d-none');
}

function loadStations() {
  const $btn = $('#btn-ev');
  setLoading($btn, true);
  showStationSkeleton();
  fetchStations()
    .done(() => renderStations(WINT_LAT, WINT_LON, 'Winterthur'))
    .fail(() => { hideStationSkeletonOnError(); showToast('Ladestationen konnten nicht geladen werden.'); })
    .always(() => setLoading($btn, false));
}

// Für die Schnellen: Suche nach PLZ – Resultate landen in derselben Liste
function searchStationsByPlz() {
  const plz = $('#ev-plz').val().trim();
  if (!/^\d{4}$/.test(plz)) {
    showToast('Bitte eine 4-stellige Schweizer PLZ eingeben.');
    $('#ev-plz').attr('aria-invalid', 'true').trigger('focus');
    return;
  }
  $('#ev-plz').removeAttr('aria-invalid');
  const $btn = $('#btn-ev-plz');
  setLoading($btn, true);
  showStationSkeleton();

  $.when(fetchStations(), geocode(plz, 'zipcode'))
    .done((_, place) => renderStations(place.lat, place.lon, place.label))
    .fail((err) => {
      hideStationSkeletonOnError();
      if (err === 'not-found') $('#ev-plz').attr('aria-invalid', 'true');
      showToast(err === 'not-found' ? `PLZ ${plz} nicht gefunden.` : 'Suche fehlgeschlagen.');
    })
    .always(() => setLoading($btn, false));
}

// Karte öffnen/schliessen mit "Shared Element"-Animation (FLIP)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let $openCard = null;

function flipFrom(fromEl, toEl) {
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  return `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`;
}

function openStation($card) {
  const s = $card.data('station');
  if (!s) return;
  $openCard = $card;

  $('#ev-modal-img').attr({ src: aerialTile(s.lat, s.lon), alt: `Luftbild bei ${s.name}` });
  $('#ev-modal-rank').text(s.rank);
  $('#ev-modal-title').text(s.name);
  $('#ev-modal-sub').text(s.address || s.operator);

  const plugs = [...s.plugs].join(', ') || 'k. A.';
  const facts = [
    ['nav', 'Distanz', `${s.dist.toFixed(2)} km`],
    ['flash', 'Max. Leistung', s.power ? `${s.power} kW` : 'k. A.'],
    ['plug', 'Stecker', plugs],
    ['ev', 'Ladepunkte', `${s.points}`],
    ['clock', 'Geöffnet', s.open24 ? '24 Stunden' : 'Siehe Betreiber'],
    ['building', 'Betreiber', s.operator || 'k. A.'],
    ['info', 'Zugang', s.paying ? 'Öffentlich, kostenpflichtig' : 'Öffentlich, kostenlos'],
  ];
  $('#ev-modal-facts').html(facts.map(([ic, label, val], i) =>
    `<li style="--i:${i}">${icon(ic)}<span class="label">${label}</span><span class="val">${esc(val)}</span></li>`).join(''));

  const overlay = document.getElementById('ev-overlay');
  const modal = document.getElementById('ev-modal');
  overlay.hidden = false;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  $('#ev-list .ev-card').attr('aria-expanded', 'false');
  $card.attr('aria-expanded', 'true');

  if (!reduceMotion.matches) {
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    modal.animate(
      [{ transform: flipFrom($card[0], modal), opacity: 0.4, borderRadius: '16px' }, { transform: 'none', opacity: 1 }],
      { duration: 380, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    );
  }
  modal.classList.add('is-open');
  $('#ev-modal-close').trigger('focus');

  // Advanced: Karte im Hintergrund schon auf die Station zentrieren
  focusStation(s, false);
}

function closeStation() {
  const overlay = document.getElementById('ev-overlay');
  const modal = document.getElementById('ev-modal');
  if (modal.hidden) return;
  const $card = $openCard;
  const done = () => {
    modal.hidden = true; overlay.hidden = true;
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    if ($card) $card.attr('aria-expanded', 'false').trigger('focus');
  };
  if (reduceMotion.matches || !$card || !document.body.contains($card[0])) return done();
  overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
  const anim = modal.animate(
    [{ transform: 'none', opacity: 1 }, { transform: flipFrom($card[0], modal), opacity: 0 }],
    { duration: 240, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
  );
  // Sicher schliessen, auch wenn der Browser die Animation drosselt (Hintergrund-Tab)
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    done();
    modal.getAnimations().concat(overlay.getAnimations()).forEach((a) => a.cancel());
  };
  anim.onfinish = finish;
  setTimeout(finish, 300);
}

// ── e) Kartenausschnitt (Leaflet + swisstopo) ────────────────────────────────
let map = null;
let placeLayer = null;   // Marker für Ort-Suche
let stationLayer = null; // Marker für Ladestationen
const mapState = { type: 'mono', details: new Set(['ev']), is3d: false };
const mapLayers = { base: null, details: {} };

const mapType = () => MAP_TYPES.find((t) => t.id === mapState.type) || MAP_TYPES[0];
const mapLabel = () => `${mapType().name}${mapState.is3d ? ' · 3D' : ''}`;

function loadMapPrefs() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem('map-layers') || 'null'); } catch (e) { /* kein Speicher */ }
  if (p && MAP_TYPES.some((t) => t.id === p.type)) {
    mapState.type = p.type;
    mapState.details = new Set((p.details || []).filter((id) => MAP_DETAILS.some((d) => d.id === id)));
    mapState.is3d = !!p.is3d;
  } else {
    mapState.type = isDark() ? 'dark' : 'mono';   // ohne Wahl: passend zum Farbschema
  }
}
function saveMapPrefs() {
  try { localStorage.setItem('map-layers', JSON.stringify({ type: mapState.type, details: [...mapState.details], is3d: mapState.is3d })); } catch (e) { /* egal */ }
}

function initMap() {
  if (map) return map;
  map = L.map('map-container', { zoomControl: false, attributionControl: false }).setView([LAT, LON], 13);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.attribution({ position: 'topright', prefix: false }).addTo(map);
  placeLayer = L.layerGroup().addTo(map);
  stationLayer = L.layerGroup();
  loadMapPrefs();
  setMapType(mapState.type, false);
  [...mapState.details].forEach((id) => setMapDetail(id, true, false));
  renderLayerPicker();
  // Suche/Ladestation im 3D-Modus: Leaflet bewegt sich unsichtbar mit, die 3D-Karte fliegt hinterher
  map.on('moveend', () => {
    if (!mapState.is3d || !glReady) return;
    const c = map.getCenter();
    fly3d({ center: [c.lng, c.lat], zoom: Math.max(map.getZoom() - 1, 14), duration: 1400 });
    syncGlMarkers();
  });
  if (mapState.is3d) set3d(true, false);
  return map;
}

function setMapType(id, save = true) {
  const t = MAP_TYPES.find((x) => x.id === id) || MAP_TYPES[0];
  mapState.type = t.id;
  if (mapLayers.base) map.removeLayer(mapLayers.base);
  const opts = { maxZoom: 19, maxNativeZoom: t.nativeZoom || 18, attribution: t.attribution };
  const base = L.tileLayer(t.url, { ...opts, zIndex: 1 });
  mapLayers.base = t.labels ? L.layerGroup([base, L.tileLayer(t.labels, { ...opts, attribution: '', zIndex: 9 })]) : base;
  mapLayers.base.addTo(map);
  if (gl) gl.setStyle(glStyle());
  if (save) saveMapPrefs();
  syncLayerPicker();
}

function setMapDetail(id, on, save = true) {
  const d = MAP_DETAILS.find((x) => x.id === id);
  if (!d) return;
  if (on) mapState.details.add(id); else mapState.details.delete(id);
  if (id === 'ev') {
    if (on) stationLayer.addTo(map); else map.removeLayer(stationLayer);
  } else if (on && !mapLayers.details[id]) {
    mapLayers.details[id] = L.tileLayer(d.url, { minZoom: d.minZoom || 0, maxZoom: 19, maxNativeZoom: 18, opacity: d.opacity || 1, zIndex: 5, attribution: SWISSTOPO }).addTo(map);
  } else if (!on && mapLayers.details[id]) {
    map.removeLayer(mapLayers.details[id]);
    delete mapLayers.details[id];
  }
  if (gl) { gl.setStyle(glStyle()); syncGlMarkers(); }
  if (save) saveMapPrefs();
  syncLayerPicker();
}

// ── Ebenen-Auswahl (Panel mit Vorschaubildern) ──
function thumbHtml(t, extra = '') {
  const imgs = [`<img src="${thumbOf(t.url)}" alt="" loading="lazy">`];
  if (t.labels) imgs.push(`<img src="${thumbOf(t.labels)}" alt="" loading="lazy">`);
  return imgs.join('') + extra;
}
function renderLayerPicker() {
  const item = (attr, id, name, inner) =>
    `<button type="button" class="ml-item" ${attr}="${id}" aria-pressed="false"><span class="ml-img">${inner}</span><span class="ml-name">${name}</span></button>`;
  $('#map-types').html(MAP_TYPES.map((t) => item('data-type', t.id, t.name, thumbHtml(t))).join(''));
  const mono = MAP_TYPES[0];
  $('#map-details').html(MAP_DETAILS.map((d) => {
    const over = d.id === 'ev'
      ? '<i class="ml-dot" style="left:30%;top:40%"></i><i class="ml-dot" style="left:62%;top:28%"></i><i class="ml-dot" style="left:55%;top:68%"></i>'
      : `<img src="${thumbOf(d.url, ...(d.thumb || []))}" alt="" loading="lazy"${d.opacity ? ` style="opacity:${Math.min(1, d.opacity * 2)}"` : ''}>`;
    return item('data-detail', d.id, d.name, `<img src="${thumbOf(mono.url, ...(d.thumb || []))}" alt="" loading="lazy">${over}`);
  }).join(''));
  syncLayerPicker();
}
function syncLayerPicker() {
  const t = mapType();
  $('#map-types .ml-item').each(function () { $(this).attr('aria-pressed', $(this).data('type') === t.id); });
  $('#map-details .ml-item').each(function () { $(this).attr('aria-pressed', mapState.details.has($(this).data('detail'))); });
  // Ansicht 2D/3D zeigt jeweils den aktuellen Kartentyp – einmal flach, einmal gekippt
  const focused = $('#map-views .ml-item:focus').data('view');
  $('#map-views').html(['2d', '3d'].map((v) =>
    `<button type="button" class="ml-item ml-view" data-view="${v}" aria-pressed="${(v === '3d') === mapState.is3d}">` +
    `<span class="ml-img${v === '3d' ? ' is-tilted' : ''}">${thumbHtml(t)}</span><span class="ml-name">${v === '3d' ? '3D · Gelände & Gebäude' : '2D'}</span></button>`).join(''));
  if (focused) $(`#map-views [data-view="${focused}"]`).trigger('focus');
  $('#map-layers-thumb').html(thumbHtml(t)).toggleClass('is-tilted', mapState.is3d);
  $('#map-meta').text((i, txt) => (/^(Karte|Suchergebnis) ·/.test(txt) ? txt.replace(/·.*$/, `· ${mapLabel()}`) : txt));
}
function toggleLayerPanel(open) {
  const $p = $('#map-layers-panel');
  const show = open === undefined ? $p.prop('hidden') : open;
  $p.prop('hidden', !show);
  $('#map-layers-btn').attr('aria-expanded', show);
  // Panel bleibt innerhalb der Karte (scrollt sonst)
  if (show) { const card = document.getElementById('card-map'); $p.css('max-height', card.clientHeight - $p[0].offsetTop - 20 - 20); }
  if (show && window.gsap && !reduceMotion.matches) gsap.fromTo($p[0], { opacity: 0, scale: 0.96, y: -6 }, { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power2.out', clearProps: 'all' });
  if (show) $p.find('.ml-item[aria-pressed="true"]').first().trigger('focus');
}

// ── 3D-Ansicht: MapLibre GL mit Höhenmodell (AWS Terrain Tiles) und Gebäuden (OpenFreeMap) ──
const GL_VERSION = '4.7.1';
let gl = null;
let glReady = false;   // erst nach dem ersten load darf die Kamera animiert werden
let glMarkers = [];
let glLoading = null;
function loadMapLibre() {
  if (window.maplibregl) return $.Deferred().resolve().promise();
  if (glLoading) return glLoading;
  const d = $.Deferred();
  $('<link rel="stylesheet">').attr('href', `https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/${GL_VERSION}/maplibre-gl.min.css`).appendTo('head');
  const s = document.createElement('script');
  s.src = `https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/${GL_VERSION}/maplibre-gl.min.js`;
  s.onload = () => d.resolve();
  s.onerror = () => { glLoading = null; d.reject(); };
  document.head.appendChild(s);
  glLoading = d.promise();
  return glLoading;
}
function glStyle() {
  const t = mapType();
  const sources = {
    base: { type: 'raster', tiles: [t.url], tileSize: 256, maxzoom: t.nativeZoom || 18, attribution: t.attribution },
    dem: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 14, attribution: 'Höhen: Mapzen / AWS Terrain Tiles' },
    omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; OpenStreetMap' },
  };
  const layers = [{ id: 'base', type: 'raster', source: 'base' }];
  MAP_DETAILS.forEach((d) => {
    if (!d.url || !mapState.details.has(d.id)) return;
    sources[`d-${d.id}`] = { type: 'raster', tiles: [d.url], tileSize: 256, maxzoom: 18 };
    layers.push({ id: `d-${d.id}`, type: 'raster', source: `d-${d.id}`, minzoom: d.minZoom ? d.minZoom - 1 : 0, paint: { 'raster-opacity': d.opacity || 1 } });
  });
  if (t.labels) {
    sources.labels = { type: 'raster', tiles: [t.labels], tileSize: 256, maxzoom: t.nativeZoom || 18 };
    layers.push({ id: 'labels', type: 'raster', source: 'labels' });
  }
  layers.push({
    id: 'gebaeude', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 13,
    paint: {
      'fill-extrusion-color': t.building,
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
      'fill-extrusion-opacity': 0.9,
    },
  });
  return {
    version: 8, sources, layers,
    terrain: { source: 'dem', exaggeration: 1 },   // echte Höhe – überhöht steckt die Kamera in den Alpen im Berg
    sky: t.night
      ? { 'sky-color': '#0f1b2d', 'horizon-color': '#1f3a66', 'fog-color': '#16294a', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.85 }
      : { 'sky-color': '#9cc4f2', 'horizon-color': '#e3f0ff', 'fog-color': '#eef4fb', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.85 },
  };
}
function syncGlMarkers() {
  if (!gl) return;
  glMarkers.forEach((m) => m.remove());
  glMarkers = [];
  const add = (ll, el) => glMarkers.push(new maplibregl.Marker(el ? { element: el } : { color: '#7c6fd6' }).setLngLat([ll.lng, ll.lat]).addTo(gl));
  placeLayer.eachLayer((l) => l.getLatLng && add(l.getLatLng()));
  if (mapState.details.has('ev')) {
    stationLayer.eachLayer((l) => { const el = document.createElement('span'); el.className = 'gl-dot'; add(l.getLatLng(), el); });
  }
}
// Kamera kippen; in den Bergen drückt das Gelände die Kamera runter → dann etwas herauszoomen
function fly3d(opts) {
  const { duration, ...rest } = opts;
  gl.flyTo({ pitch: 62, ...rest, duration: reduceMotion.matches ? 0 : duration, essential: true });
  gl.once('moveend', () => {
    if (gl.getPitch() < 55 && gl.getZoom() > 11) fly3d({ zoom: gl.getZoom() - 1.3, duration: 900 });
  });
}
function set3d(on, save = true) {
  const card = document.getElementById('card-map');
  mapState.is3d = on;
  if (save) saveMapPrefs();
  syncLayerPicker();
  if (!on) {
    if (gl && card.classList.contains('is-3d')) {
      const c = gl.getCenter();
      map.setView([c.lat, c.lng], Math.round(gl.getZoom() + 1), { animate: false });
    }
    card.classList.remove('is-3d');
    map.invalidateSize();
    return;
  }
  card.classList.add('is-loading-3d');
  loadMapLibre().done(() => {
    card.classList.remove('is-loading-3d');
    if (!mapState.is3d) return;
    const c = map.getCenter();
    // Kamera erst kippen, wenn der Stil geladen ist – sonst bleibt MapLibre mit Terrain hängen
    const tilt = () => fly3d({ bearing: -18, zoom: Math.max(map.getZoom() - 1, 14), duration: 1600 });
    const fresh = !gl;
    if (!gl) {
      gl = new maplibregl.Map({
        container: 'map-3d', style: glStyle(), center: [c.lng, c.lat], zoom: map.getZoom() - 1,
        maxPitch: 80, attributionControl: false,
      });
      gl.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      gl.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right');
    } else {
      gl.jumpTo({ center: [c.lng, c.lat], zoom: map.getZoom() - 1, pitch: 0, bearing: 0 });
    }
    card.classList.add('is-3d');
    gl.resize();
    syncGlMarkers();
    if (fresh) {
      gl.once('load', () => {
        glReady = true;
        tilt();
        // Quellenangabe zugeklappt starten (Info-Knopf klappt sie auf)
        const attrib = gl.getContainer().querySelector('.maplibregl-ctrl-attrib');
        if (attrib) attrib.classList.remove('maplibregl-compact-show');
      });
    } else {
      tilt();
    }
  }).fail(() => {
    card.classList.remove('is-loading-3d');
    showToast('3D-Ansicht konnte nicht geladen werden.');
    mapState.is3d = false;
    syncLayerPicker();
  });
}

// Titel/Beschreibung der Content Card aktualisieren
function setMapInfo(title, lat, lon, meta) {
  $('#map-title').text(title);
  $('#map-desc').text(`${lat.toFixed(4)}° N · ${lon.toFixed(4)}° E`);
  $('#map-meta').text(meta);
}

function showMap() {
  initMap();
  placeLayer.clearLayers();
  L.marker([LAT, LON]).addTo(placeLayer).bindPopup('<strong>Zürich</strong>').openPopup();
  map.flyTo([LAT, LON], 13, { duration: 0.6 });
  setMapInfo('Zürich', LAT, LON, `Karte · ${mapLabel()}`);
}

// Für die Schnellen: Suche nach Ort – Karte wird darauf zentriert
function searchPlace() {
  const text = $('#map-place').val().trim();
  if (!text) {
    showToast('Bitte einen Ort eingeben.');
    $('#map-place').attr('aria-invalid', 'true').trigger('focus');
    return;
  }
  $('#map-place').removeAttr('aria-invalid');
  const $btn = $('#btn-map-place');
  setLoading($btn, true);

  geocode(text, 'gg25,zipcode,district,kantone,gazetteer,address')
    .done((place) => {
      initMap();
      placeLayer.clearLayers();
      L.marker([place.lat, place.lon]).addTo(placeLayer).bindPopup(`<strong>${esc(place.label)}</strong>`).openPopup();
      map.flyTo([place.lat, place.lon], 13, { duration: 0.6 });
      setMapInfo(place.label, place.lat, place.lon, `Suchergebnis · ${mapLabel()}`);
    })
    .fail(() => { $('#map-place').attr('aria-invalid', 'true'); showToast(`«${text}» wurde nicht gefunden.`); })
    .always(() => setLoading($btn, false));
}

// Advanced: Ladestationen als Marker zeigen …
function showStationsOnMap(stations, originLat, originLon) {
  initMap();
  stationLayer.clearLayers();
  if (!mapState.details.has('ev')) setMapDetail('ev', true);   // Stationen geladen → Ebene einschalten
  stations.forEach((s) => {
    s.marker = L.circleMarker([s.lat, s.lon], {
      radius: 8, color: '#fff', weight: 2, fillColor: '#7c6fd6', fillOpacity: 1,
    })
      .addTo(stationLayer)
      .bindPopup(`<strong>${s.rank}. ${esc(s.name)}</strong><br>${esc(s.address)}`);
  });
  L.circleMarker([originLat, originLon], { radius: 6, color: '#fff', weight: 2, fillColor: '#18181b', fillOpacity: 1 })
    .addTo(stationLayer).bindTooltip('Ausgangspunkt');
  map.flyToBounds(L.latLngBounds(stations.map((s) => [s.lat, s.lon]).concat([[originLat, originLon]])), { padding: [60, 60], duration: 0.6 });
}

// … und eine Station auf der Karte zentrieren
function focusStation(s, scroll) {
  initMap();
  map.closePopup();
  map.once('moveend', () => s.marker && s.marker.openPopup());
  map.flyTo([s.lat, s.lon], 17, { duration: 0.6 });
  setMapInfo(s.name, s.lat, s.lon, `Ladestation ${s.rank} · ${s.dist.toFixed(1)} km`);
  if (scroll) document.getElementById('card-map').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
}

// ── Hell/Dunkel-Modus ────────────────────────────────────────────────────────
function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function toggleTheme() {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) { /* privates Fenster */ }
  applyMode();
}

// Modus anwenden: Diagramme + Himmel (Canvas) zeichnen ihre Farben je nach hell/dunkel
function applyMode() {
  const mode = isDark() ? 'dark' : 'light';
  document.documentElement.dataset.mode = mode;
  if (lastForecast) renderWeatherChart(lastForecast);
  if (btcSeries) renderBtcChart(btcSeries);
  sky.refresh();
}
// Ohne eigene Wahl folgt die Seite dem System (z. B. automatisch dunkel am Abend)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!document.documentElement.dataset.theme) applyMode();
});

// ── Event-Handler ────────────────────────────────────────────────────────────
$(function () {
  $('#year').text(new Date().getFullYear());

  $('#btn-theme').on('click', toggleTheme);

  // Kartenebenen
  $('#map-layers-btn').on('click', () => { initMap(); toggleLayerPanel(); });
  $('#map-layers-close').on('click', () => { toggleLayerPanel(false); $('#map-layers-btn').trigger('focus'); });
  $('#map-layers-panel')
    .on('click', '[data-type]', function () { setMapType($(this).data('type')); })
    .on('click', '[data-detail]', function () { const id = $(this).data('detail'); setMapDetail(id, !mapState.details.has(id)); })
    .on('click', '[data-view]', function () { set3d($(this).data('view') === '3d'); });
  $(document).on('click', (e) => { if (!$(e.target).closest('.map-layers').length && !$('#map-layers-panel').prop('hidden')) toggleLayerPanel(false); });
  $(document).on('keydown', (e) => {
    if (e.key === 'Escape' && !$('#map-layers-panel').prop('hidden')) { toggleLayerPanel(false); $('#map-layers-btn').trigger('focus'); }
  });
  // Fehlermarkierung entfernen, sobald getippt wird
  $('#ev-plz, #map-place').on('input', function () { $(this).removeAttr('aria-invalid'); });

  $('#btn-cat').on('click', loadCat);
  $('#cat-history').on('click', '.cat-thumb:not(.is-empty)', function () { showCatFromHistory($(this).data('cat')); });
  $('#btn-btc').on('click', loadBitcoin);
  $('.wallet-range').on('click', function () { haptics.tick(); loadBtcChart(String($(this).data('range'))); });
  // Handy: Schalter blendet den Kursverlauf ein/aus (Wahl wird gemerkt)
  const setBtcChartOpen = (open, save = true) => {
    $('#card-btc').toggleClass('show-chart', open);
    $('#btc-chart-toggle').attr('aria-checked', open);
    if (save) { try { localStorage.setItem('btc-chart-open', open ? '1' : '0'); } catch (e) { /* egal */ } }
    if (open && btcUsd != null && !btcSeries) loadBtcChart(btcRange);
    if (open && window.gsap && !reduceMotion.matches) gsap.fromTo('#btc-chart-wrap', { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'opacity,transform' });
  };
  let btcChartOpen = false;
  try { btcChartOpen = localStorage.getItem('btc-chart-open') === '1'; } catch (e) { /* privates Fenster */ }
  setBtcChartOpen(btcChartOpen, false);
  $('#btc-chart-toggle').on('click', function () { setBtcChartOpen($(this).attr('aria-checked') !== 'true'); });
  // Wird das Fenster gross genug, den Verlauf nachladen
  window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => {
    if (e.matches && btcUsd != null && !btcSeries) loadBtcChart(btcRange);
  });
  $('#btn-weather').on('click', loadWeather);
  sky.init();
  loadSkyNow();
  // Live-Schalter: an = Himmel folgt beim Wischen; aus = nur gewählter Tag bzw. Jetzt
  const setSkyLive = (on, save = true) => {
    skyLive = on;
    $('#sky-live-toggle').attr('aria-checked', on);
    $('#weather-hourly-wrap').toggleClass('is-live', on);
    if (save) { try { localStorage.setItem('sky-live', on ? '1' : '0'); } catch (e) { /* egal */ } }
    if (on && lastForecast) setWeatherFocus(stripCenterIndex(), false, true);   // sofort zur Mitte springen
  };
  setSkyLive(skyLive, false);
  $('#sky-live-toggle').on('click', () => setSkyLive(!skyLive));
  $('#weather-now').on('click', () => { const d = weatherDays.find((x) => x.isToday); if (d) selectWeatherDay(d.key); });
  // Wetterdetails: Pfeil neben "Tag wählen" öffnet, "‹ 5 Tage" bzw. Esc schliesst
  $('#weather-details-open').on('click', () => setDetailsOpen(true));
  $('#weather-details-close').on('click', () => setDetailsOpen(false));
  $('#weather-details').on('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); setDetailsOpen(false); } });
  wxWideRow.addEventListener('change', () => { document.getElementById('weather-lower').classList.toggle('is-fixed', wxDetails.open && wxWideRow.matches); });

  // Wetter: Ort wählen
  $('#weather-place').text(weatherLoc.name);
  $('#weather-city-btn').on('click', () => ($('#weather-city').prop('hidden') ? openCityPicker() : closeCityPicker()));
  $('#weather-city-close').on('click', () => closeCityPicker());
  $('#weather-city-chips').on('click', '.mw-city-chip', function () { chooseCity(WEATHER_CITIES[$(this).data('city')]); });
  $('#weather-city-list')
    .on('mousedown', '.mw-city-opt', (e) => e.preventDefault())     // Fokus im Feld lassen
    .on('click', '.mw-city-opt', function () { chooseCity(city.results[$(this).data('i')]); });
  $('#weather-city-input')
    .on('input', onCityInput)
    .on('keydown', (e) => {
      const n = city.results.length;
      if (e.key === 'ArrowDown' && n) { e.preventDefault(); city.active = (city.active + 1) % n; renderCityResults(); }
      else if (e.key === 'ArrowUp' && n) { e.preventDefault(); city.active = (city.active - 1 + n) % n; renderCityResults(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCityPicker(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const q = $(e.target).val().trim();
        if (n && city.active >= 0) chooseCity(city.results[city.active]);
        else if (q.length >= 2) { clearTimeout(city.timer); searchCities(q).then((r) => { if (r && r.length) chooseCity(r[0]); }); }
      }
    });
  // Klick neben das Panel schliesst es
  $(document).on('click', (e) => {
    if (!$(e.target).closest('#weather-city, #weather-city-btn').length) closeCityPicker(false);
  });
  // 5-Tage-Prognose: Tag wählen = oberer Streifen zeigt diesen Tag
  $('#weather-days').on('click', '.mw-day', function () {
    const key = $(this).data('day');
    haptics.tick();
    selectWeatherDay(key);
  });
  $('#btn-ev').on('click', loadStations);
  $('#btn-ev-plz').on('click', searchStationsByPlz);
  $('#btn-map').on('click', showMap);
  $('#btn-map-place').on('click', searchPlace);

  // Enter in den Suchfeldern löst die Suche aus
  $('#ev-plz').on('keydown', (e) => { if (e.key === 'Enter') searchStationsByPlz(); });
  $('#map-place').on('keydown', (e) => { if (e.key === 'Enter') searchPlace(); });

  // Expandable Cards: Klick / Enter öffnet Details (und zentriert die Karte)
  $('#ev-list').on('click', '.ev-card:not(.is-skeleton)', function () { openStation($(this)); });
  $('#ev-list').on('keydown', '.ev-card:not(.is-skeleton)', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openStation($(this)); }
  });
  $('#ev-overlay, #ev-modal-close').on('click', closeStation);
  $('#ev-modal-map').on('click', () => {
    const s = $openCard && $openCard.data('station');
    closeStation();
    if (s) focusStation(s, true);
  });
  $(document).on('keydown', (e) => {
    if ($('#ev-modal').prop('hidden')) return;
    if (e.key === 'Escape') closeStation();
    // Fokus im Dialog halten
    if (e.key === 'Tab') {
      const f = $('#ev-modal').find('button:visible').get();
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });

  // Karte direkt beim Laden anzeigen, damit der Bereich nicht leer ist
  initMap();
});

// ═════════════════════════════════════════════════════════════════════════════
//  Hero: Split-Flap-Board (inspiriert von Aceternity "Text Flipping Board")
// ═════════════════════════════════════════════════════════════════════════════
const FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789·';
const FLAP_COLORS = ['#ab9ff2', '#f59e0b', '#2ec08b', '#3b82f6', '#eb5757'];
const FLAP_MESSAGES = [
  'BOOTSTRAP\nFRONTEND',
  'UNTERRICHT\nOBERLE',
  'DESIGNED BY\nTIAGO',
  'KATZEN · BITCOIN\nWETTER · LADEN · KARTE',
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (n) => Math.floor(Math.random() * n);

const flip = { cols: 0, rows: 0, tiles: [], msg: 0, values: [] };

// Wert auf eine Kachel-Hälfte schreiben: Zeichen oder Farbkachel ("#rrggbb")
function setFace(el, v) {
  if (v && v[0] === '#') { el.style.background = v; el.firstChild.textContent = ''; }
  else { el.style.background = ''; el.firstChild.textContent = v === ' ' ? '' : v; }
}

function buildBoard() {
  const board = document.getElementById('flipboard');
  if (!board) return false;
  const w = board.clientWidth;
  const target = w >= 900 ? 46 : w >= 520 ? 36 : 28;     // Wunschbreite einer Kachel
  const cols = Math.max(11, Math.min(26, Math.round(w / target)));
  const rows = cols >= 20 ? 4 : 5;
  if (cols === flip.cols && rows === flip.rows) return false;

  flip.cols = cols; flip.rows = rows;
  board.style.setProperty('--cols', cols);
  board.innerHTML = '';
  flip.tiles = [];
  for (let i = 0; i < cols * rows; i++) {
    const el = document.createElement('div');
    el.className = 'flap';
    el.innerHTML = '<div class="t"><span></span></div><div class="b"><span></span></div><div class="f"><span></span></div><div class="k"><span></span></div>';
    board.appendChild(el);
    flip.tiles.push({ el, t: el.children[0], b: el.children[1], f: el.children[2], k: el.children[3], v: ' ', busy: false });
  }
  return true;
}

// Text auf das Raster legen: Wörter umbrechen, horizontal + vertikal zentrieren
function layoutMessage(text, cols, rows) {
  const lines = [];
  text.split('\n').forEach((part) => {
    let line = '';
    part.split(' ').forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (next.length > cols && line) { lines.push(line); line = word; } else { line = next; }
    });
    if (line) lines.push(line);
  });
  const grid = new Array(cols * rows).fill(' ');
  const top = Math.max(0, Math.floor((rows - lines.length) / 2));
  lines.slice(0, rows).forEach((line, r) => {
    const left = Math.max(0, Math.floor((cols - line.length) / 2));
    [...line.slice(0, cols)].forEach((ch, c) => { grid[(top + r) * cols + left + c] = ch; });
  });
  // Ein paar farbige Kacheln als Deko in freien Feldern (wie beim Vestaboard)
  const free = grid.map((v, i) => (v === ' ' ? i : -1)).filter((i) => i >= 0);
  for (let n = 0; n < Math.min(4, free.length); n++) {
    const i = free.splice(rnd(free.length), 1)[0];
    grid[i] = FLAP_COLORS[rnd(FLAP_COLORS.length)];
  }
  return grid;
}

// Ein einzelner Klapp-Schritt: oben fällt das alte Blatt, unten klappt das neue auf
async function flipStep(tile, next, ms) {
  const cur = tile.v;
  setFace(tile.t, next); setFace(tile.b, cur);
  setFace(tile.f, cur);  setFace(tile.k, next);
  tile.el.classList.add('is-flipping');
  tile.f.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], { duration: ms / 2, easing: 'ease-in', fill: 'forwards' });
  await sleep(ms / 2);
  tile.k.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], { duration: ms / 2, easing: 'ease-out', fill: 'forwards' });
  await sleep(ms / 2);
  setFace(tile.b, next);
  tile.el.classList.remove('is-flipping');
  tile.f.getAnimations().concat(tile.k.getAnimations()).forEach((a) => a.cancel());
  tile.v = next;
}

async function flipTile(tile, target) {
  tile.target = target;              // läuft schon eine Animation, nimmt sie das neue Ziel mit
  if (tile.busy) return;
  tile.busy = true;
  while (tile.v !== tile.target) {
    const goal = tile.target;
    // Ein paar Zwischenstände (Zeichen oder Farben), dann das Ziel
    const steps = 2 + rnd(4);
    for (let s = 0; s < steps && goal === tile.target; s++) {
      const between = Math.random() < 0.25 ? FLAP_COLORS[rnd(FLAP_COLORS.length)] : FLAP_CHARS[1 + rnd(FLAP_CHARS.length - 1)];
      await flipStep(tile, between, 90);
    }
    await flipStep(tile, tile.target, 160);
  }
  tile.busy = false;
}

function setBoardInstant(values) {
  flip.tiles.forEach((tile, i) => {
    tile.v = values[i];
    tile.target = values[i];
    [tile.t, tile.b].forEach((el) => setFace(el, values[i]));
  });
}

async function showFlipMessage(animated) {
  const values = layoutMessage(FLAP_MESSAGES[flip.msg], flip.cols, flip.rows);
  flip.values = values;
  if (!animated) { setBoardInstant(values); return; }
  // Welle von links nach rechts
  flip.tiles.forEach((tile, i) => {
    const col = i % flip.cols;
    const row = Math.floor(i / flip.cols);
    setTimeout(() => flipTile(tile, values[i]), col * 35 + row * 25 + rnd(80));
  });
  await sleep(flip.cols * 35 + 1600);
}

let boardVisible = true;
async function runFlipBoard() {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  buildBoard();
  setBoardInstant(new Array(flip.cols * flip.rows).fill(' '));
  for (;;) {
    // Pausieren, solange der Hero nicht sichtbar ist (spart Akku)
    while (document.hidden || !boardVisible) await sleep(400);
    await showFlipMessage(!motion.matches);
    await sleep(motion.matches ? 6000 : 4200);
    flip.msg = (flip.msg + 1) % FLAP_MESSAGES.length;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Liquid Glass (inspiriert von Aceternity "Liquid Glass")
//  Erzeugt pro Glasfläche eine Displacement-Map (gewölbter Rand) und einen
//  SVG-Filter mit Farbsaum. Chromium nutzt ihn als backdrop-filter.
// ═════════════════════════════════════════════════════════════════════════════
const SVGNS = 'http://www.w3.org/2000/svg';
// Zum Testen: ?glass=fallback zeigt in Chrome/Edge die Safari/Firefox-Variante,
// ?glass=svg erzwingt die echte Lichtbrechung auch in Safari/Firefox
const glassParam = new URLSearchParams(location.search).get('glass');
const supportsLiquid = glassParam !== 'fallback'
  && (glassParam === 'svg' || !!(navigator.userAgentData && navigator.userAgentData.brands.some((b) => /Chromium/.test(b.brand))))
  && !window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
// Safari/Firefox: eigene Glas-Variante in CSS (html.lg-fallback)
document.documentElement.classList.toggle('lg-fallback', !supportsLiquid);

// Liquid Glass wie beim Hire-Digital-Generator: Die Linsen-Karte ist ein kleines
// SVG aus zwei Farbverläufen (Rot = x, Grün = y). Die Mitte ist neutral grau
// und weich ausgeblendet → nur am Rand entsteht die "wässrige" Lichtbrechung.
function glassMap(w, h, radius, bezel) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2) - bezel);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + '<defs>'
    + '<linearGradient id="Y" x1="0" x2="0" y1="3%" y2="97%"><stop offset="0%" stop-color="#0F0"/><stop offset="100%" stop-color="#000"/></linearGradient>'
    + '<linearGradient id="X" x1="2%" x2="98%" y1="0" y2="0"><stop offset="0%" stop-color="#F00"/><stop offset="100%" stop-color="#000"/></linearGradient>'
    + '</defs>'
    + `<rect width="${w}" height="${h}" fill="#808080"/>`
    + '<g filter="blur(2px)">'
    + `<rect width="${w}" height="${h}" fill="#000080"/>`
    + `<rect width="${w}" height="${h}" fill="url(#Y)" style="mix-blend-mode:screen"/>`
    + `<rect width="${w}" height="${h}" fill="url(#X)" style="mix-blend-mode:screen"/>`
    + `<rect x="${bezel}" y="${bezel}" width="${Math.max(0, w - 2 * bezel)}" height="${Math.max(0, h - 2 * bezel)}" rx="${r}" ry="${r}" fill="#808080" filter="blur(${bezel}px)"/>`
    + '</g></svg>';
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

let glassDefs = null;
let glassCount = 0;
function setupGlass(el) {
  if (el.dataset.glassReady) return;
  el.dataset.glassReady = '1';
  if (!glassDefs) {
    glassDefs = document.createElementNS(SVGNS, 'svg');
    glassDefs.setAttribute('width', '0'); glassDefs.setAttribute('height', '0');
    glassDefs.setAttribute('aria-hidden', 'true');
    glassDefs.style.position = 'absolute';
    document.body.appendChild(glassDefs);
  }
  const id = `liquid-glass-${glassCount++}`;
  const ab = Number(el.dataset.aberration || 2);
  const channel = (r, g, b) => `${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`;

  const filter = document.createElementNS(SVGNS, 'filter');
  filter.id = id;
  filter.setAttribute('x', '0'); filter.setAttribute('y', '0');
  filter.setAttribute('width', '100%'); filter.setAttribute('height', '100%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  filter.innerHTML = `
    <feImage x="0" y="0" result="map" />
    <feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" />
    <feColorMatrix type="matrix" result="displacedR" values="${channel(1, 0, 0)}" />
    <feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" />
    <feColorMatrix type="matrix" result="displacedG" values="${channel(0, 1, 0)}" />
    <feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" />
    <feColorMatrix type="matrix" result="displacedB" values="${channel(0, 0, 1)}" />
    <feBlend in="displacedR" in2="displacedG" mode="screen" result="rg" />
    <feBlend in="rg" in2="displacedB" mode="screen" />`;
  glassDefs.appendChild(filter);

  let lastKey = '';
  const update = () => {
    const w = Math.round(el.offsetWidth);
    const h = Math.round(el.offsetHeight);
    if (!w || !h) return;
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const key = `${w}x${h}x${radius}`;
    if (key === lastKey) return;
    lastKey = key;
    // Gewählte Einstellung (aus dem Generator getestet): weicher, breiter Rand,
    // ruhige Mitte. Beides skaliert mit der Grösse, damit auch kleine Buttons gut aussehen.
    const short = Math.min(w, h);
    // Glasiger: breiterer Rand und stärkere Brechung
    const bezel = Math.round(Math.max(5, Math.min(30, short * 0.38)));
    // Nie stärker als das Element selbst – sonst holt die Brechung Inhalt von ausserhalb
    const refraction = Math.round(Math.max(14, Math.min(Number(el.dataset.scale || 90), short * 0.8)));
    const img = filter.querySelector('feImage');
    img.setAttribute('width', w); img.setAttribute('height', h);
    img.setAttribute('href', glassMap(w, h, radius, bezel));
    filter.querySelectorAll('feDisplacementMap').forEach((d, i) => d.setAttribute('scale', refraction + ab - i * ab));
    const bf = `blur(0.5px) url(#${id}) blur(1px) saturate(1.5) brightness(1.1)`;
    el.style.backdropFilter = bf;
    el.style.webkitBackdropFilter = bf;
    el.classList.add('is-refracting');
  };
  let t;
  new ResizeObserver(() => { clearTimeout(t); t = setTimeout(update, 120); }).observe(el);
  update();
}

$(function () {
  // Flip-Board starten und bei Grössenänderung neu aufbauen
  if (document.getElementById('flipboard')) {
    runFlipBoard();
    let rt;
    $(window).on('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (buildBoard()) setBoardInstant(layoutMessage(FLAP_MESSAGES[flip.msg], flip.cols, flip.rows)); }, 200);
    });
    new IntersectionObserver(([e]) => { boardVisible = e.isIntersecting; }).observe(document.getElementById('flipboard'));
  }
  // Liquid Glass nur dort, wo der Browser SVG-Filter als backdrop-filter kann
  if (supportsLiquid) $('.liquid-glass').each(function () { setupGlass(this); });
});

// ═════════════════════════════════════════════════════════════════════════════
//  Hintergrund: Punkte-Raster (inspiriert von Aceternity "Dot Distortion Shader")
//  Canvas 2D: Punkte weichen der Maus aus, federn zurück, "atmen" leicht und
//  leuchten zufällig kurz auf. Bewusst dezent.
// ═════════════════════════════════════════════════════════════════════════════
const dotBg = (() => {
  const GAP = 24;            // Abstand der Punkte
  const SIZE = 2;            // Punktgrösse
  const RADIUS = 150;        // Einflussradius der Maus
  const PUSH = 1.8;          // Stärke der Verdrängung
  const SPRING = 0.06;       // Rückstellkraft
  const DAMP = 0.82;         // Dämpfung
  let canvas, ctx, w, h, dpr, dots = [], mouse = { x: -9999, y: -9999 }, raf = 0, color = '#888', glow = '#ab9ff2';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function readColors() {
    color = cssVar('--muted-foreground') || '#888';
    glow = '#ab9ff2';
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = [];
    for (let y = GAP / 2; y < h; y += GAP) {
      for (let x = GAP / 2; x < w; x += GAP) {
        dots.push({ hx: x, hy: y, x, y, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2, glow: 0 });
      }
    }
    draw(performance.now());
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    const still = reduce.matches;
    for (const d of dots) {
      if (!still) {
        // Maus drückt die Punkte weg …
        const dx = d.x - mouse.x;
        const dy = d.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < RADIUS && dist > 0.1) {
          const f = (1 - dist / RADIUS) ** 2 * PUSH;
          d.vx += (dx / dist) * f;
          d.vy += (dy / dist) * f;
        }
        // … und sie federn zurück an ihren Platz
        d.vx = (d.vx + (d.hx - d.x) * SPRING) * DAMP;
        d.vy = (d.vy + (d.hy - d.y) * SPRING) * DAMP;
        d.x += d.vx; d.y += d.vy;
        // Zufälliges kurzes Aufleuchten
        if (d.glow > 0) d.glow -= 0.012;
        else if (Math.random() < 0.0004) d.glow = 1;
      }
      const breathe = still ? 0.5 : 0.4 + 0.25 * Math.sin(t / 1400 + d.phase);
      const moved = Math.min(1, Math.hypot(d.x - d.hx, d.y - d.hy) / 12);
      ctx.globalAlpha = 0.42 * breathe + 0.45 * moved;
      ctx.fillRect(d.x - SIZE / 2, d.y - SIZE / 2, SIZE, SIZE);
      if (d.glow > 0) {
        ctx.save();
        ctx.globalAlpha = d.glow * 0.9;
        ctx.fillStyle = glow;
        ctx.shadowColor = glow; ctx.shadowBlur = 12;
        ctx.fillRect(d.x - 2, d.y - 2, 4, 4);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(t) {
    draw(t);
    raf = document.hidden || reduce.matches ? 0 : requestAnimationFrame(loop);
  }
  const start = () => { if (!raf && !reduce.matches) raf = requestAnimationFrame(loop); };

  function init() {
    canvas = document.getElementById('dot-bg');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    readColors();
    resize();
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; } }, { passive: true });
    document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    document.addEventListener('visibilitychange', start);
    reduce.addEventListener('change', () => { draw(performance.now()); start(); });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); draw(performance.now()); });
    start();
  }
  return { init, refresh: () => { if (ctx) { readColors(); draw(performance.now()); } } };
})();

$(function () {
  dotBg.init();
  // Farben beim Hell/Dunkel-Umschalten nachziehen
  $('#btn-theme').on('click', () => setTimeout(dotBg.refresh, 0));
});

// ═════════════════════════════════════════════════════════════════════════════
//  Zusatzfeature: ÖV in drei Schritten
//   1) PowerShell-Fenster (uiverse.io / mihocsaszilard, MIT) → Haltestelle + Enter
//   2) grosses Terminal "sbb-tui": Abfahrts-/Ankunftstafel mit Zugverlauf
//   3) Klick auf einen Zug → blaue SBB-Perronanzeige
//  Daten: timetable.search.ch (Herkunft, Gleis, Verspätung, Halte);
//         transport.opendata.ch als Ersatz, falls search.ch nicht antwortet.
// ═════════════════════════════════════════════════════════════════════════════
const SEARCH_API = 'https://timetable.search.ch/api';
const SBB_API = 'https://transport.opendata.ch/v1';
const tui = { station: 'Zürich HB', type: 'departure', list: [], sel: 0, lastFocus: null, timer: 0 };

// Linien-Typ (für Badge-Farbe und Symbol)
function lineKind(cat) {
  if (/^(IC|ICE|ICN|IR|EC|RE|TGV|RJX?|EN|NJ|PE)$/i.test(cat)) return 'long';
  if (/^(S|SN|R)$/i.test(cat) || /^S/i.test(cat)) return 'sbahn';
  if (/^(T|TRAM)$/i.test(cat)) return 'tram';
  if (/^(B|BUS|NFB|EXB|KB)$/i.test(cat)) return 'bus';
  if (/^(BAT|FAE|SCH)$/i.test(cat)) return 'boat';
  return 'other';
}

// Farbe des Linien-Badges wie in der SBB-App:
// Fernverkehr/InterRegio rot (weisse Schrift), S-Bahn & Regio weiss (schwarze Schrift),
// Nachtzüge schwarz (gelbe Schrift)
function lineBadgeClass(t) {
  if (/^(SN|N|EN|NJ)$/i.test(t.cat || '')) return 'is-night';
  return t.kind === 'long' ? 'is-long' : 'is-local';
}

// Zeiten als "Lokalzeit in Sekunden" (Schweizer Zeit, unabhängig von der Zeitzone des Browsers)
const lts = (str) => (str ? Date.parse(`${String(str).slice(0, 16).replace(' ', 'T')}:00Z`) / 1000 : null);
const hm = (ts) => (ts ? new Date(ts * 1000).toISOString().slice(11, 16) : '–');
const localStr = (ts) => new Date(ts * 1000).toISOString().slice(0, 16).replace('T', ' ');
const dur = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}h ${String(min % 60).padStart(2, '0')}m`;
const delayOf = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : 0; };

// ── Daten von search.ch in ein einheitliches Zug-Objekt umwandeln ───────────
function fromSearch(c, station, mode) {
  const cat = c['*G'] || c.line || '';
  const num = c['*L'] && c['*L'] !== cat ? c['*L'] : '';
  const ts = lts(c.time);
  const track = String(c.track || '');
  const onward = (c.subsequent_stops || []).map((s) => ({ name: s.name, ts: lts(s.arr || s.dep), delay: delayOf(s.arr_delay || s.dep_delay) }));
  const t = {
    mode,
    lineRaw: c.line,
    line: num ? `${cat} ${num}` : (c.line || cat),
    cat,
    kind: lineKind(cat),
    op: c.operator || '',
    number: c['*Z'] || '',
    dep: ts,
    delay: delayOf(mode === 'arrival' ? c.arr_delay : c.dep_delay),
    cancelled: /X/i.test(String(mode === 'arrival' ? c.arr_delay : c.dep_delay || '')),
    platform: track.replace('!', ''),
    platformChanged: track.includes('!'),
    onward,
  };
  if (mode === 'arrival') {
    t.from = c.terminal && c.terminal.name;
    t.to = onward.length ? onward[onward.length - 1].name : station;
    t.stops = [];                // vorherige Halte werden bei Bedarf nachgeladen
    t.route = 'todo';
  } else {
    t.to = c.terminal && c.terminal.name;
    t.stops = [{ name: station, ts, platform: t.platform }].concat(onward);
    t.route = 'ready';
  }
  const last = t.stops[t.stops.length - 1];
  t.end = last && last.ts > ts ? last.ts : null;
  return t;
}

// Ersatz: transport.opendata.ch (hat keine Herkunft für Ankünfte)
function fromOpendata(e, station, mode) {
  const pass = (e.passList || []).filter((p) => p.station);
  const stops = pass.map((p, i) => ({
    name: p.station.name || station,
    ts: lts(p.departure || p.arrival || (i === 0 ? e.stop.departure : null)),
    platform: p.platform || (i === 0 ? e.stop.platform : '') || '',
  }));
  const num = String(e.number || '').replace(/^0+/, '');
  const dep = lts(e.stop.departure || e.stop.arrival);
  const last = stops[stops.length - 1];
  return {
    mode,
    lineRaw: e.category + num,
    line: !num || num === e.category || num.length > 3 ? e.category : `${e.category} ${num}`,
    cat: e.category || '',
    kind: lineKind(e.category),
    op: e.operator || '',
    number: e.name || '',
    dep,
    delay: Number(e.stop.delay) || 0,
    platform: (e.stop.prognosis && e.stop.prognosis.platform) || e.stop.platform || '',
    platformChanged: !!(e.stop.prognosis && e.stop.prognosis.platform && e.stop.prognosis.platform !== e.stop.platform),
    to: e.to,
    from: null,
    stops,
    onward: stops.slice(1),
    route: 'ready',
    end: last && last.ts > dep ? last.ts : null,
  };
}

function fetchBoard(station, mode) {
  return $.getJSON(`${SEARCH_API}/stationboard.json`, {
    stop: station, limit: 15, mode: mode === 'arrival' ? 'arrival' : 'depart',
    show_subsequent_stops: 1, show_delays: 1, show_trackchanges: 1, show_tracks: 1,
  }).then((d) => {
    if (!d || !d.connections) return $.Deferred().reject('search-empty').promise();
    const name = (d.stop && d.stop.name) || station;
    return { name, list: d.connections.map((c) => fromSearch(c, name, mode)) };
  }).then(null, () => $.getJSON(`${SBB_API}/stationboard`, { station, limit: 15, type: mode }).then((d) => {
    const name = (d.station && d.station.name) || station;
    return { name, list: (d.stationboard || []).map((e) => fromOpendata(e, name, mode)) };
  }));
}

// Ankunft: denselben Zug an seinem Startbahnhof suchen (gleiche Linie, gleiche
// Ankunftszeit hier) und daraus die vorherigen Halte übernehmen.
function loadArrivalRoute(t) {
  if (t.routeReq) return t.routeReq;
  if (!t.from || norm(t.from) === norm(tui.station)) { t.route = 'none'; return $.Deferred().resolve(t).promise(); }
  t.route = 'loading';
  refreshCard(t);
  const back = new Date((t.dep - 3 * 3600) * 1000);
  const day = localStr(t.dep).slice(0, 10);
  const startDay = back.toISOString().slice(0, 10);
  const when = startDay === day ? back.toISOString().slice(11, 16) : '00:00';
  const target = localStr(t.dep);
  const sameLine = (a) => String(a || '').replace(/\s+/g, '').toUpperCase() === String(t.lineRaw || '').replace(/\s+/g, '').toUpperCase();
  const here = (name) => norm(name || '') === norm(tui.station);
  const found = (stops) => { t.stops = stops; t.route = 'ready'; return t; };

  // 1) Abfahrtstafel am Startbahnhof (klappt bei kleineren Bahnhöfen)
  const viaBoard = () => $.getJSON(`${SEARCH_API}/stationboard.json`, {
    stop: t.from, date: day, time: when, limit: 150, show_subsequent_stops: 1, show_tracks: 1,
  }).then((d) => {
    const hit = (d.connections || []).find((c) => sameLine(c.line)
      && (c.subsequent_stops || []).some((s) => here(s.name) && String(s.arr || '').slice(0, 16) === target));
    if (!hit) return $.Deferred().reject().promise();
    const sub = hit.subsequent_stops;
    const idx = sub.findIndex((s) => here(s.name) && String(s.arr || '').slice(0, 16) === target);
    return found([{ name: t.from, ts: lts(hit.time), platform: String(hit.track || '').replace('!', '') }]
      .concat(sub.slice(0, idx + 1).map((s) => ({ name: s.name, ts: lts(s.arr || s.dep) }))));
  });

  // 2) Verbindungssuche Startbahnhof → hier (für grosse Bahnhöfe wie Zürich HB)
  const viaRoute = (minutesBefore) => {
    const from = new Date((t.dep - minutesBefore * 60) * 1000).toISOString();
    return $.getJSON(`${SEARCH_API}/route.json`, {
      from: t.from, to: tui.station, date: from.slice(0, 10), time: from.slice(11, 16), num: 16,
    }).then((d) => {
      const leg = (d.connections || []).map((c) => c.legs && c.legs[0]).find((l) => l && sameLine(l.line)
        && l.exit && here(l.exit.name) && String(l.exit.arrival || '').slice(0, 16) === target);
      if (!leg) return $.Deferred().reject().promise();
      return found([{ name: t.from, ts: lts(leg.departure), platform: String(leg.track || '').replace('!', '') }]
        .concat((leg.stops || []).map((s) => ({ name: s.name, ts: lts(s.arrival || s.departure || s.arr || s.dep) })))
        .concat([{ name: tui.station, ts: t.dep, platform: t.platform }]));
    });
  };

  t.routeReq = viaBoard()
    .then(null, () => viaRoute(75))
    .then(null, () => viaRoute(180))
    .then(null, () => viaRoute(330))     // lange Fahrten, z.B. Genève → Winterthur
    .then(null, () => { t.route = 'none'; return t; });
  return t.routeReq;
}

// ── Schritt 1 ────────────────────────────────────────────────────────────────
function openFromEntry() {
  const raw = $('#sbb-query').val().trim();
  // Einzelnes Kürzel wie bei einer PowerShell-Auswahl: "b" → Bern
  const choice = raw.length === 1 && $(`.ps-choice[data-key="${raw.toUpperCase()}"]`).data('station');
  const q = choice || raw || 'Zürich HB';
  // Handy: Tastatur zuerst schliessen, sonst öffnet das Fenster in den Tastatur-/Zoom-Zustand hinein
  document.getElementById('sbb-query').blur();
  openSbbTui(q);
}

// ── Schritt 2: grosses Terminal öffnen/laden ────────────────────────────────
function openSbbTui(station) {
  tui.station = station || tui.station;
  tui.lastFocus = document.activeElement;
  $('#tui-station').val(tui.station);
  document.getElementById('tui-overlay').hidden = false;
  document.getElementById('tui').hidden = false;
  document.body.classList.add('modal-open');
  closeBoard(false);
  if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo('#tui', { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.out', clearProps: 'opacity,transform' });
    setTimeout(() => gsap.set('#tui', { clearProps: 'opacity,transform' }), 600);   // Sicherheitsnetz
  }
  updateTuiClock();
  clearInterval(tui.timer);
  tui.timer = setInterval(updateTuiClock, 15000);
  loadTui();
}

function closeSbbTui() {
  if (document.getElementById('tui').hidden) return;
  document.getElementById('tui').hidden = true;
  document.getElementById('tui-overlay').hidden = true;
  document.body.classList.remove('modal-open');
  clearInterval(tui.timer);
  if (tui.lastFocus && tui.lastFocus.focus) tui.lastFocus.focus();
}

function updateTuiClock() {
  const now = new Date();
  $('#tui-date').text(now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' }));
  $('#tui-time').text(now.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' }));
}

const psSpin = () => `<span class="tui-spin" aria-hidden="true">${['|', '/', '-', '\\', '|', '/', '-', '\\'].map((c) => `<span class="slash">${c}</span>`).join('')}</span>`;
const psPrompt = '<span class="ps">PS C:\\sbb&gt;</span>';

function loadTui() {
  const arr = tui.type === 'arrival';
  const $list = $('#tui-list').html(
    `<p class="tui-loading">${psPrompt} stationboard "${esc(tui.station)}" --${arr ? 'arrivals' : 'departures'} ${psSpin()}</p>`
    + '<div class="tui-skel"></div><div class="tui-skel"></div><div class="tui-skel"></div>');
  $('#tui-detail').html(`<p class="tui-loading">${psPrompt} lade verlauf ${psSpin()}</p>`);
  $('#tui-status').text('lädt …');
  const reqType = tui.type;
  return fetchBoard(tui.station, tui.type)
    .done((r) => {
      if (reqType !== tui.type) return;          // inzwischen umgeschaltet
      tui.station = r.name;
      $('#tui-station').val(r.name);
      tui.list = r.list;
      tui.sel = 0;
      if (!tui.list.length) {
        $list.html(`<p class="tui-empty">› keine ${arr ? 'ankünfte' : 'abfahrten'} für «${esc(tui.station)}» gefunden.</p>`);
        $('#tui-detail').empty();
        $('#tui-status').text('0 züge');
        return;
      }
      renderTuiList();
      renderTuiDetail();
      $('#tui-status').text(`${tui.list.length} ${arr ? 'ankünfte' : 'abfahrten'} · ${r.name}`);
      if (arr) preloadArrivalRoutes(tui.list);
    })
    .fail(() => {
      $list.html('<p class="tui-empty">› verbindung fehlgeschlagen – später nochmals versuchen.</p>');
      $('#tui-detail').empty();
      $('#tui-status').text('fehler');
    });
}

// Alle Ankunfts-Routen im Hintergrund laden – höchstens 3 gleichzeitig
function preloadArrivalRoutes(list) {
  const queue = list.filter((t) => t.route === 'todo');
  const run = () => {
    const t = queue.shift();
    if (!t || tui.list !== list) return;         // Tafel wurde inzwischen neu geladen
    loadArrivalRoute(t).always(() => {
      refreshCard(t);
      if (tui.list[tui.sel] === t) renderTuiDetail();
      run();
    });
  };
  for (let k = 0; k < 3; k++) run();
}

// Stopp-Leiste ●—○—○—●: Punkte nach Fahrzeit platziert (nicht gleichmässig), zu nahe
// Halte werden zusammengefasst – so bleibt die Linie auch bei vielen Halten ruhig
function trackMarks(stops) {
  const n = stops.length;
  if (n < 2) return '';
  const t0 = stops[0].ts, t1 = stops[n - 1].ts, span = t1 - t0;
  let prev = 0;
  const pos = stops.map((s, k) => {
    let f = span > 0 && s.ts ? (s.ts - t0) / span : k / (n - 1);
    f = Math.max(prev, Math.min(1, f));          // nie rückwärts (Durchfahrten ohne Zeit)
    prev = f;
    return f;
  });
  const MIN = 0.08;                               // mind. 8 % Abstand → höchstens ~12 Punkte
  const keep = [0];
  for (let k = 1; k < n - 1; k++) {
    if (pos[k] - pos[keep[keep.length - 1]] >= MIN && 1 - pos[k] >= MIN) keep.push(k);
  }
  keep.push(n - 1);
  return keep.map((k) => `<i style="left:${(pos[k] * 100).toFixed(1)}%" class="${k === 0 || k === n - 1 ? 'is-end' : ''}"></i>`).join('');
}

// Halte-Anzahl für die Karte ("14 halte"), Start und Ziel nicht mitgezählt
const stopCount = (stops) => (stops.length > 2 ? `${stops.length - 2} halt${stops.length - 2 === 1 ? '' : 'e'}` : 'direkt');

// Betreiber sauber anzeigen: "SOB-sob" → "SOB", "BLS-bls" → "BLS"
function opLabel(op) {
  const m = String(op || '').match(/^([^-]+)-(.+)$/);
  return m && m[1].toLowerCase() === m[2].toLowerCase() ? m[1] : op;
}

// Inhalt einer Zug-Karte (wird nach dem Nachladen der Route neu gesetzt)
function trainCardHtml(t) {
  const arr = t.mode === 'arrival';
  const dl = t.delay > 0 ? `<span class="tui-delay">+${t.delay}'</span>` : '';
  const gl = t.platform ? `gleis ${esc(t.platform)}${t.platformChanged ? '!' : ''}` : '';
  if (arr && (t.route === 'todo' || t.route === 'loading')) {
    // Route lädt noch: Skeleton statt "von …"
    return `
      <span class="tui-row1">
        <span class="tui-line ${lineBadgeClass(t)}">${esc(t.line)}</span>
        ${t.op ? `<span class="tui-op">${esc(opLabel(t.op))}</span>` : ''}
        <span class="tui-to">← ${esc(t.from || 'unbekannt')}</span>
      </span>
      <span class="tui-row2" aria-busy="true">
        <span class="tui-skel-bar" style="width:5ch"></span>
        <span class="tui-skel-bar tui-skel-track"></span>
        <span>${hm(t.dep)}${dl}</span>
      </span>
      <span class="tui-row3"><span>${gl}</span><span class="tui-skel-bar" style="width:16ch"></span></span>`;
  }
  if (arr) {
    const ready = t.route === 'ready' && t.stops.length > 1;
    const start = ready ? t.stops[0] : null;
    const total = ready ? dur(Math.round((t.dep - start.ts) / 60)) : '';
    return `
      <span class="tui-row1">
        <span class="tui-line ${lineBadgeClass(t)}">${esc(t.line)}</span>
        ${t.op ? `<span class="tui-op">${esc(opLabel(t.op))}</span>` : ''}
        <span class="tui-to">← ${esc(t.from || 'unbekannt')}</span>
      </span>
      <span class="tui-row2">
        <span>${ready ? hm(start.ts) : ''}</span>
        ${ready ? `<span class="tui-track" aria-hidden="true">${trackMarks(t.stops)}</span>` : `<span class="tui-ends">von ${esc(t.from || '–')}${t.route === 'loading' ? ' …' : ''}</span>`}
        <span>${hm(t.dep)}${dl}</span>
      </span>
      <span class="tui-row3"><span>${gl}</span><span>${t.onward.length ? `weiter → ${esc(t.to)}` : 'endet hier'}${ready ? ` · ${stopCount(t.stops)}` : ''}${total ? ` · ${total}` : ''}</span></span>`;
  }
  const n = t.stops.length;
  const total = t.end ? dur(Math.round((t.end - t.dep) / 60)) : '';
  return `
    <span class="tui-row1">
      <span class="tui-line ${lineBadgeClass(t)}">${esc(t.line)}</span>
      ${t.op ? `<span class="tui-op">${esc(opLabel(t.op))}</span>` : ''}
      <span class="tui-to">${esc(t.to || '–')}</span>
    </span>
    <span class="tui-row2">
      <span>${hm(t.dep)}${dl}</span>
      ${n > 1 ? `<span class="tui-track" aria-hidden="true">${trackMarks(t.stops)}</span>` : '<span class="tui-ends">● endet hier</span>'}
      <span>${t.end ? hm(t.end) : ''}</span>
    </span>
    <span class="tui-row3"><span>${gl}</span><span>${n > 1 ? `${stopCount(t.stops)} · ` : ''}${total}</span></span>`;
}

// Linke Liste: Karten wie in sbb-tui
function renderTuiList() {
  const $list = $('#tui-list').empty();
  tui.list.forEach((t, i) => {
    $(`<button type="button" class="tui-train" role="option" id="tui-opt-${i}">${trainCardHtml(t)}</button>`)
      .attr('aria-selected', i === tui.sel)
      .toggleClass('is-sel', i === tui.sel)
      .data('i', i)
      .appendTo($list);
  });
  $('#tui-list').attr('aria-activedescendant', `tui-opt-${tui.sel}`);
}

function refreshCard(t) {
  const i = tui.list.indexOf(t);
  if (i >= 0) $(`#tui-opt-${i}`).html(trainCardHtml(t));
}

function selectTui(i, scroll = true) {
  if (!tui.list.length) return;
  tui.sel = (i + tui.list.length) % tui.list.length;
  $('#tui-list .tui-train').each(function () {
    const on = $(this).data('i') === tui.sel;
    $(this).toggleClass('is-sel', on).attr('aria-selected', on);
  });
  $('#tui-list').attr('aria-activedescendant', `tui-opt-${tui.sel}`);
  if (scroll) { const el = document.getElementById(`tui-opt-${tui.sel}`); if (el) el.scrollIntoView({ block: 'nearest' }); }
  renderTuiDetail();
}

// Rechte Spalte: kompletter Verlauf des gewählten Zugs
function renderTuiDetail() {
  const t = tui.list[tui.sel];
  if (!t) return;
  const arr = t.mode === 'arrival';
  if (arr && t.route === 'todo') {
    loadArrivalRoute(t).always(() => { refreshCard(t); if (tui.list[tui.sel] === t) renderTuiDetail(); });
  }
  const head = `
    <div class="tui-detail-head">
      <span class="tui-line ${lineBadgeClass(t)}">${esc(t.line)}</span>
      ${t.op ? `<span class="tui-op">${esc(opLabel(t.op))}</span>` : ''}
      <span>${arr ? `← ${esc(t.from || 'unbekannt')}` : `→ ${esc(t.to || '–')}`}</span>
    </div>`;
  if (arr && t.route !== 'ready') {
    $('#tui-detail').html(head + (t.route === 'loading' || t.route === 'todo'
      ? `<p class="tui-loading">${psPrompt} route von "${esc(t.from || '')}" ${psSpin()}</p>`
      : `<p class="tui-empty">› kommt von ${esc(t.from || 'unbekannt')} · Ankunft ${hm(t.dep)} gleis ${esc(t.platform || '–')}</p>`)
      + onwardNote(t));
    return;
  }
  const lastIdx = t.stops.length - 1;
  const rows = t.stops.map((s, k) => `
    <li class="tui-stop${(arr ? k === lastIdx : k === 0) ? ' is-first' : ''}">
      <time>${hm(s.ts)}</time>
      <span class="rail" aria-hidden="true"><i></i></span>
      <span class="name">${esc(s.name)}</span>
      <span class="pl">${s.platform ? `gl ${esc(s.platform)}` : ''}</span>
    </li>`).join('');
  $('#tui-detail').html(`${head}<ol class="tui-stops">${rows || '<li class="tui-empty">keine halte bekannt</li>'}</ol>${arr ? onwardNote(t) : ''}`);
}

function onwardNote(t) {
  return t.onward && t.onward.length
    ? `<p class="tui-empty">› fährt weiter: ${t.onward.slice(0, 4).map((s) => esc(s.name)).join(' · ')}${t.onward.length > 4 ? ' …' : ''}</p>`
    : '<p class="tui-empty">› endet hier</p>';
}

// ── Schritt 3: SBB-Perronanzeige ─────────────────────────────────────────────
function openBoard(i) {
  const t = tui.list[i];
  if (!t) return;
  selectTui(i, false);
  fillBoard(t);
  const board = document.getElementById('tui-board');
  board.hidden = false;
  document.getElementById('tui').classList.add('is-board');
  $('#tui-name').text(`sbb-tui · ${t.line} ${t.mode === 'arrival' ? '← ' + (t.from || '') : '→ ' + (t.to || '')}`);
  if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo('.sbb-display', { y: 18, opacity: 0, rotateX: 8 }, { y: 0, opacity: 1, rotateX: 0, duration: 0.45, ease: 'power3.out', clearProps: 'all' });
    setTimeout(() => gsap.set('.sbb-display', { clearProps: 'all' }), 800);
  }
  // Ankunft: Route ggf. nachladen und Anzeige aktualisieren
  if (t.mode === 'arrival' && t.route !== 'ready' && t.route !== 'none') {
    loadArrivalRoute(t).always(() => { refreshCard(t); if (!board.hidden && tui.list[tui.sel] === t) fillBoard(t); });
  }
}

// Sektoren & Wagenreihung – die freien APIs liefern keine Formation, darum schematisch:
// Länge und Klassen-Lage hängen vom Zugtyp ab, die Zugnummer macht sie pro Zug stabil.
const CUP_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 5h9v4a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V5Zm9 1h1.5a2 2 0 0 1 0 4H11" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
function sectorBar(t) {
  if (t.kind !== 'long' && t.kind !== 'sbahn' && t.kind !== 'other') return '';
  const long = t.kind === 'long';
  const seed = parseInt(String(t.number || t.line || '7').replace(/\D/g, ''), 10) || 7;
  const letters = long ? ['A', 'B', 'C', 'D', 'E', 'F'] : ['A', 'B', 'C', 'D'];
  let cars;
  if (long) {
    const n = 8 + (seed % 4);                       // 8–11 Wagen
    cars = ['1', '1', 'WR'].concat(Array(n - 3).fill('2'));
  } else {
    const unit = ['2', '1', '2', '2'];              // Doppelstock-Einheit, 1. Klasse im 2. Wagen
    cars = seed % 2 ? unit.concat(unit) : unit.slice();
  }
  const frontRight = seed % 2 === 0;                // Fahrtrichtung
  if (frontRight) cars.reverse();                   // 1. Klasse immer an der Zugspitze
  const w = long ? 7.4 : (cars.length > 4 ? 10.5 : 13);
  const span = w * cars.length;
  const start = Math.max(2, Math.min(96 - span, 4 + (seed % 3) * (100 - span) / 6));
  const secW = 100 / letters.length;
  const secOf = (x) => letters[Math.min(letters.length - 1, Math.floor(x / secW))];
  const where = { '1': new Set(), WR: new Set() };
  const carHtml = cars.map((c, k) => {
    const left = start + k * w;
    if (where[c]) where[c].add(secOf(left + w / 2));
    const cls = `sbbd-car${c === '1' ? ' is-first' : ''}${c === 'WR' ? ' is-wr' : ''}${k === 0 ? ' is-head-l' : ''}${k === cars.length - 1 ? ' is-head-r' : ''}`;
    return `<span class="${cls}" style="left:${left}%;width:${w}%">${c === 'WR' ? CUP_SVG : c}</span>`;
  }).join('');
  const arrow = frontRight
    ? `<span class="sbbd-dir" style="left:${start + span}%">»</span>`
    : `<span class="sbbd-dir is-left" style="left:${start}%">«</span>`;
  const join = (s) => [...s].sort().join('/');
  const note = [`1. Klasse: Sektor ${join(where['1'])}`];
  if (where.WR.size) note.push(`Speisewagen: Sektor ${join(where.WR)}`);
  note.push(`2. Klasse: übrige Sektoren`);
  return `
    <div class="sbbd-sec-letters">${letters.map((l, k) => `<span style="left:${k * secW}%;width:${secW}%">${l}</span>`).join('')}</div>
    <div class="sbbd-train">${carHtml}${arrow}</div>
    <p class="sbbd-sec-note">${note.join(' · ')} <em>schematisch</em></p>`;
}

function fillBoard(t) {
  const arr = t.mode === 'arrival';
  const bar = sectorBar(t);
  $('#sbbd-sectors').html(bar).prop('hidden', !bar);
  const badge = lineBadgeClass(t);
  $('#sbbd-line').text(t.line).toggleClass('is-sbahn', badge === 'is-local').toggleClass('is-night', badge === 'is-night');
  $('#sbbd-time').text(hm(t.dep));
  $('#sbbd-delay').text(t.cancelled ? 'fällt aus' : (t.delay > 0 ? `+${t.delay}'` : ''));
  const plat = String(t.platform || '–');
  $('#sbbd-plat').text(plat).parent().attr('data-len', plat.length > 6 ? 'long' : plat.length);
  let stops;
  let strip = [`<span>${esc(opLabel(t.op) || 'ÖV')}</span>`];
  if (t.number) strip.push(`<span>Zug ${esc(String(t.number).replace(/^0+/, ''))}</span>`);
  if (arr) {
    // Ankunftsanzeige: Herkunft gross, darunter die letzten Halte vor diesem Bahnhof
    const prev = t.route === 'ready' ? t.stops.slice(0, -1) : [];
    $('#sbbd-dest').text(t.from ? `von ${t.from}` : 'Ankunft');
    $('#sbbd-via').text(prev.length ? `über ${prev.slice(1).slice(-5).map((s) => s.name).join('  ')}` : (t.route === 'loading' || t.route === 'todo' ? 'Route wird geladen …' : `Ankunft ${hm(t.dep)}`));
    stops = prev.length
      ? prev.slice(-6).map((s) => `<li>${esc(s.name)}<small>ab ${hm(s.ts)}</small></li>`).join('') + `<li>${esc(tui.station)}<small>an ${hm(t.dep)}</small></li>`
      : `<li class="is-end">${t.route === 'loading' || t.route === 'todo' ? 'Route wird geladen …' : `Kommt von ${esc(t.from || 'unbekannt')}.`}</li>`;
    strip.push(t.onward.length ? `<span>weiter nach ${esc(t.to)}</span>` : '<span>endet hier</span>');
  } else {
    const next = t.stops.slice(1);
    $('#sbbd-dest').text(t.to || '–');
    $('#sbbd-via').text(next.length ? next.slice(0, -1).slice(0, 6).map((s) => s.name).join('  ') : `Ankunft in ${t.to || tui.station}`);
    stops = next.length
      ? next.slice(0, 6).map((s) => `<li>${esc(s.name)}<small>${hm(s.ts)}</small></li>`).join('')
      : '<li class="is-end">Endstation – dieser Zug endet hier.</li>';
    if (t.end) strip.push(`<span>an ${esc(t.to)} ${hm(t.end)}</span>`);
  }
  $('#sbbd-stops').html(stops);
  $('#sbbd-strip').html(strip.join(''));
  $('#sbbd-sr').text(`${t.line} ${arr ? `von ${t.from || 'unbekannt'}` : `nach ${t.to}`}, ${hm(t.dep)}, Gleis ${t.platform || 'unbekannt'}.`);
}

function closeBoard(refocus = true) {
  const board = document.getElementById('tui-board');
  if (board.hidden) return false;
  board.hidden = true;
  document.getElementById('tui').classList.remove('is-board');
  $('#tui-name').text(tui.type === 'arrival' ? 'sbb-tui · Ankunftstafel' : 'sbb-tui · Abfahrtstafel');
  if (refocus) { const el = document.getElementById(`tui-opt-${tui.sel}`); if (el) el.focus(); }
  return true;
}

function setTuiType(type) {
  tui.type = type;
  $('#tui-dep').toggleClass('is-on', type === 'departure').attr('aria-pressed', type === 'departure');
  $('#tui-arr').toggleClass('is-on', type === 'arrival').attr('aria-pressed', type === 'arrival');
  $('#tui-name').text(type === 'arrival' ? 'sbb-tui · Ankunftstafel' : 'sbb-tui · Abfahrtstafel');
  loadTui();
}

$(function () {
  // Schritt 1
  $('#sbb-query').on('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); openFromEntry(); } });
  // Schnellwahl antippen (wie eine PowerShell-Auswahl)
  $('.ps-choices').on('click', '.ps-choice', function () {
    document.getElementById('sbb-query').blur();
    openSbbTui($(this).data('station'));
  });

  // Schritt 2
  $('#tui-close, #tui-overlay').on('click', closeSbbTui);
  $('#tui-dep').on('click', () => setTuiType('departure'));
  $('#tui-arr').on('click', () => setTuiType('arrival'));
  $('#tui-search').on('click', () => { tui.station = $('#tui-station').val().trim() || tui.station; loadTui(); });
  $('#tui-station').on('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); tui.station = $(e.target).val().trim() || tui.station; loadTui(); } });
  $('#tui-list')
    .on('mouseenter focus', '.tui-train', function () { if ($(this).data('i') !== tui.sel) selectTui($(this).data('i'), false); })
    .on('click', '.tui-train', function () { openBoard($(this).data('i')); });

  // Tastatur: ↑↓ Züge, Enter Anzeige, Esc zurück / schliessen
  $(document).on('keydown', (e) => {
    if (document.getElementById('tui').hidden) return;
    const inInput = document.activeElement && document.activeElement.id === 'tui-station';
    if (e.key === 'Escape') { e.preventDefault(); if (!closeBoard()) closeSbbTui(); return; }
    if (!document.getElementById('tui-board').hidden) return;
    if (inInput) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); selectTui(tui.sel + 1); document.getElementById(`tui-opt-${tui.sel}`)?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); selectTui(tui.sel - 1); document.getElementById(`tui-opt-${tui.sel}`)?.focus(); }
    if (e.key === 'Enter' && document.activeElement.classList.contains('tui-train')) { e.preventDefault(); openBoard(tui.sel); }
  });
  // Klick neben die Anzeige schliesst sie wieder
  $('#tui-board').on('click', (e) => { if (!$(e.target).closest('.sbb-display').length) closeBoard(); });
});

// ═════════════════════════════════════════════════════════════════════════════
//  GSAP: Einblenden beim Scrollen (Zusatzfeature)
// ═════════════════════════════════════════════════════════════════════════════
$(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();
  // Nur wenn keine reduzierte Bewegung gewünscht ist
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.ui-header-inner', { y: -18, opacity: 0, duration: 0.7, ease: 'power3.out', clearProps: 'transform,opacity' });

    const items = gsap.utils.toArray('.flip-hero, #card-cat, #card-btc, #card-weather, #card-ev, #card-map, #card-sbb');
    gsap.set(items, { y: 28, opacity: 0 });
    ScrollTrigger.batch(items, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out', stagger: 0.09, clearProps: 'transform,opacity' });
        // Sicherheitsnetz: falls der Browser Frames auslässt, Karten trotzdem sichtbar machen
        setTimeout(() => gsap.set(batch, { clearProps: 'transform,opacity' }), 1600);
      },
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  Befehlspalette (Ctrl+K / Cmd+K) – Zusatzfeature
// ═════════════════════════════════════════════════════════════════════════════
const cmdk = { items: [], active: 0, lastFocus: null, pointer: '', mouse: '' };
// Letzte Mausposition merken: beim Öffnen gilt sie als "nicht bewegt"
window.addEventListener('mousemove', (e) => { cmdk.mouse = `${e.screenX},${e.screenY}`; }, { passive: true, capture: true });

// Zu einer Karte scrollen und sie kurz hervorheben
function goToCard(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  el.classList.remove('is-pinged');
  void el.offsetWidth;
  el.classList.add('is-pinged');
}

// Feste Befehle (Gruppe, Icon, Text, Suchbegriffe, Aktion)
const CMDK_STATIC = [
  { group: 'Springen zu', icon: 'image', label: 'Katzenbild', keys: 'katze cat bild', run: () => goToCard('card-cat') },
  { group: 'Springen zu', icon: 'bitcoin', label: 'Bitcoin-Preis', keys: 'btc krypto preis kurs', run: () => goToCard('card-btc') },
  { group: 'Springen zu', icon: 'suncloud', label: 'Wetter', keys: 'wetter zürich prognose regen', run: () => goToCard('card-weather') },
  { group: 'Springen zu', icon: 'ev', label: 'Ladestationen', keys: 'laden strom tankstelle ev auto', run: () => goToCard('card-ev') },
  { group: 'Springen zu', icon: 'map', label: 'Karte', keys: 'karte map ort', run: () => goToCard('card-map') },
  { group: 'Springen zu', icon: 'train', label: 'Abfahrten', keys: 'öv sbb zug tram bus abfahrt', run: () => goToCard('card-sbb') },
  { group: 'Aktionen', icon: 'reload', label: 'Neues Katzenbild laden', keys: 'katze cat', run: () => { goToCard('card-cat'); loadCat(); } },
  { group: 'Aktionen', icon: 'reload', label: 'Bitcoin-Preis abrufen', keys: 'btc preis', run: () => { goToCard('card-btc'); loadBitcoin(); } },
  { group: 'Aktionen', icon: 'reload', label: 'Wetter laden', keys: 'wetter', run: () => { goToCard('card-weather'); loadWeather(); } },
  { group: 'Aktionen', icon: 'reload', label: 'Ladestationen laden (Winterthur)', keys: 'laden strom winterthur', run: () => { goToCard('card-ev'); loadStations(); } },
  { group: 'Aktionen', icon: 'reload', label: 'Abfahrtstafel öffnen (Zürich HB)', keys: 'öv sbb zug abfahrt ankunft tafel', run: () => openSbbTui('Zürich HB') },
  { group: 'Aktionen', icon: 'pin', label: 'Karte: Zürich anzeigen', keys: 'karte zürich', run: () => { goToCard('card-map'); showMap(); } },
  { group: 'Aktionen', icon: 'light', label: 'Hell/Dunkel umschalten', keys: 'theme dark light modus farbe', run: () => $('#btn-theme').trigger('click') },
];

const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Aus dem eingegebenen Text passende "Such-Befehle" ableiten
function dynamicCommands(q) {
  const out = [];
  if (/^\d{4}$/.test(q)) {
    out.push({ group: 'Suchen', icon: 'ev', label: `Ladestationen bei PLZ ${q}`, run: () => { goToCard('card-ev'); $('#ev-plz').val(q); searchStationsByPlz(); } });
  }
  if (q.length >= 2) {
    out.push({ group: 'Suchen', icon: 'pin', label: `«${q}» auf der Karte zeigen`, run: () => { goToCard('card-map'); $('#map-place').val(q); searchPlace(); } });
    out.push({ group: 'Suchen', icon: 'train', label: `Abfahrten ab «${q}»`, run: () => openSbbTui(q) });
  }
  return out;
}

function renderCmdk() {
  const q = $('#cmdk-input').val().trim();
  const nq = norm(q);
  const words = nq.split(/\s+/).filter(Boolean);
  const matches = CMDK_STATIC.filter((c) => {
    const hay = norm(`${c.group} ${c.label} ${c.keys || ''}`);
    return words.every((w) => hay.includes(w));
  });
  // Treffer bei festen Befehlen zuerst, danach die Such-Vorschläge
  cmdk.items = matches.length && q ? matches.concat(dynamicCommands(q)) : dynamicCommands(q).concat(matches);
  cmdk.active = Math.min(cmdk.active, Math.max(0, cmdk.items.length - 1));

  const $list = $('#cmdk-list').empty();
  if (!cmdk.items.length) {
    $list.append('<li class="cmdk-empty">Nichts gefunden – versuche einen Ort, eine PLZ oder eine Haltestelle.</li>');
    $('#cmdk-input').attr('aria-activedescendant', '');
    return;
  }
  let group = '';
  cmdk.items.forEach((c, i) => {
    if (c.group !== group) {
      group = c.group;
      $list.append(`<li class="cmdk-group" role="presentation">${group}</li>`);
    }
    $(`<li id="cmdk-opt-${i}" class="cmdk-item" role="option">${icon(c.icon)}<span>${esc(c.label)}</span></li>`)
      .attr('aria-selected', i === cmdk.active)
      .data('i', i)
      .appendTo($list);
  });
  $('#cmdk-input').attr('aria-activedescendant', `cmdk-opt-${cmdk.active}`);
}

function setCmdkActive(i) {
  if (!cmdk.items.length) return;
  cmdk.active = (i + cmdk.items.length) % cmdk.items.length;
  $('#cmdk-list .cmdk-item').each(function () { $(this).attr('aria-selected', $(this).data('i') === cmdk.active); });
  $('#cmdk-input').attr('aria-activedescendant', `cmdk-opt-${cmdk.active}`);
  const el = document.getElementById(`cmdk-opt-${cmdk.active}`);
  if (el) el.scrollIntoView({ block: 'nearest' });
}

function openCmdk() {
  const dlg = document.getElementById('cmdk');
  if (!dlg.hidden) return;
  cmdk.lastFocus = document.activeElement;
  cmdk.active = 0;
  cmdk.pointer = cmdk.mouse;
  $('#cmdk-input').val('');
  renderCmdk();
  dlg.hidden = false;
  document.getElementById('cmdk-overlay').hidden = false;
  document.body.classList.add('modal-open');
  if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo(dlg, { opacity: 0, y: -10, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: 'power3.out', clearProps: 'transform,opacity' });
    gsap.fromTo('#cmdk-overlay', { opacity: 0 }, { opacity: 1, duration: 0.2 });
  }
  setTimeout(() => $('#cmdk-input').trigger('focus'), 0);
}

function closeCmdk(restoreFocus = true) {
  const dlg = document.getElementById('cmdk');
  if (dlg.hidden) return;
  dlg.hidden = true;
  document.getElementById('cmdk-overlay').hidden = true;
  document.body.classList.remove('modal-open');
  if (restoreFocus && cmdk.lastFocus && cmdk.lastFocus.focus) cmdk.lastFocus.focus();
}

function runCmdk(i) {
  const c = cmdk.items[i];
  if (!c) return;
  closeCmdk(false);
  c.run();
}

$(function () {
  // Ctrl+K / Cmd+K öffnet bzw. schliesst; "/" öffnet, wenn man nicht gerade tippt
  $(document).on('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (document.getElementById('cmdk').hidden) openCmdk(); else closeCmdk();
    } else if (e.key === '/' && !typing && document.getElementById('cmdk').hidden) {
      e.preventDefault();
      openCmdk();
    }
  });
  $('#btn-cmdk').on('click', openCmdk);
  $('#cmdk-overlay').on('click', () => closeCmdk());
  $('#cmdk-input').on('input', () => { cmdk.active = 0; renderCmdk(); });

  // Tastatur-Navigation: gilt, solange die Palette offen ist – egal wo der Fokus
  // gerade liegt (Capture-Phase, damit nichts anderes die Pfeiltasten "schluckt")
  window.addEventListener('keydown', (e) => {
    if (document.getElementById('cmdk').hidden) return;
    const keys = { ArrowDown: 1, ArrowUp: -1, Tab: e.shiftKey ? -1 : 1 };
    if (e.key in keys) {
      e.preventDefault(); e.stopPropagation();
      setCmdkActive(cmdk.active + keys[e.key]);
    } else if (e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation();
      runCmdk(cmdk.active);
      return;
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      closeCmdk();
      return;
    }
    // Tippen landet immer im Suchfeld
    if (document.activeElement !== document.getElementById('cmdk-input')) $('#cmdk-input').trigger('focus');
  }, true);

  // Maus wählt nur aus, wenn sie sich wirklich bewegt (nicht wenn die Liste
  // beim Pfeiltasten-Scrollen unter dem stehenden Mauszeiger durchrutscht)
  $('#cmdk-list')
    .on('mousemove', '.cmdk-item', function (e) {
      const pos = `${e.screenX},${e.screenY}`;
      if (pos === cmdk.pointer) return;
      cmdk.pointer = pos;
      if ($(this).data('i') !== cmdk.active) setCmdkActive($(this).data('i'));
    })
    .on('click', '.cmdk-item', function () { runCmdk($(this).data('i')); });
  // Auf Mac "⌘ K" statt "Ctrl K" anzeigen
  if (/Mac|iPhone|iPad/.test(navigator.platform)) $('#btn-cmdk .cmdk-kbd').text('⌘ K');
});
