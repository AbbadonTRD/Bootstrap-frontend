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
const MAP_TILES   = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg';
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

  Highcharts.chart('btc-chart', {
    chart: {
      backgroundColor: 'transparent', margin: [22, 0, 4, 0],
      style: { fontFamily: cssVar('--font-sans') },
      events: { load() { $(this.container).on('mouseleave', restoreBtcPrice); } },
    },
    title: { text: null }, credits: { enabled: false }, legend: { enabled: false },
    xAxis: {
      type: 'datetime', lineWidth: 0, tickLength: 0, labels: { enabled: false },
      crosshair: { color: 'rgba(255,255,255,.35)', width: 1, dashStyle: 'Dash' },
    },
    yAxis: {
      title: { text: null }, labels: { enabled: false }, gridLineWidth: 0, lineWidth: 0,
      // Achse eng an die Daten → die Kurve nutzt die ganze Höhe
      startOnTick: false, endOnTick: false, minPadding: 0.04, maxPadding: 0.06,
      // Gestrichelte Linie = aktueller Preis (dezent beschriftet)
      plotLines: [{
        value: now, color: 'rgba(255,255,255,.3)', width: 1, dashStyle: 'Dash', zIndex: 1,
        label: {
          text: `Aktuell ${fmtUSD.format(now)}`, align: 'left', x: 8, y: -5,
          style: { color: 'rgba(255,255,255,.55)', fontSize: '10px', fontWeight: '500' },
        },
      }],
    },
    tooltip: {
      useHTML: true, backgroundColor: 'transparent', borderWidth: 0, shadow: false, padding: 0,
      positioner(w, h, point) { return { x: Math.min(Math.max(point.plotX - w / 2, 4), this.chart.chartWidth - w - 4), y: 0 }; },
      formatter() { return `<span class="wallet-scrub-time">${fmtScrub(this.x)}</span>`; },
      style: { color: 'rgba(255,255,255,.7)', fontSize: '12px' },
    },
    plotOptions: { series: { animation: { duration: 600 } } },
    series: [{
      type: 'area', data: points, lineWidth: 2, threshold: null,
      zoneAxis: 'y',
      zones: [
        { value: now, color: BTC_DOWN, fillColor: grad(BTC_DOWN) },
        { color: BTC_UP, fillColor: grad(BTC_UP) },
      ],
      marker: { enabled: false, states: { hover: { enabled: true, radius: 5, lineColor: '#1c1c1f', lineWidth: 2 } } },
      // Scrubbing: grosser Preis = Wert zu diesem Zeitpunkt, darunter Abstand zum aktuellen Preis
      point: { events: { mouseOver() {
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

// ── c) Aktuelles Wetter (Zürich) + 5-Tage-Chart ──────────────────────────────
function loadWeather() {
  const $btn = $('#btn-weather');
  setLoading($btn, true);
  // Skeleton statt hartem Aufspringen
  $('#weather-empty, #weather-hourly-wrap, #weather-chart-card').addClass('d-none');
  $('#weather-skeleton').removeClass('d-none');

  // Heute: Tmax, Tmin, Niederschlag
  const today = $.getJSON(WEATHER_API, {
    latitude: LAT,
    longitude: LON,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    forecast_days: 1,
    timezone: 'Europe/Zurich',
  }).done((data) => {
    const d = data.daily;
    const tmax = Math.round(d.temperature_2m_max[0]);
    const rain = d.precipitation_sum[0];
    rollNumber($('#weather-tmax'), tmax, (v) => `${Math.round(v)}°C`);
    rollNumber($('#weather-tmax-label'), tmax, (v) => `${Math.round(v)} °C`);
    rollNumber($('#weather-tmin'), d.temperature_2m_min[0], (v) => `${Math.round(v)} °C`);
    rollNumber($('#weather-rain'), rain, (v) => `${v.toFixed(1)} mm`);
    swapValue($('#weather-desc'), describeDay(rain, tmax));
  });

  // Für die Schnellen: stündlicher Verlauf der nächsten 5 Tage (MeteoSwiss-Modell)
  const forecast = $.getJSON(WEATHER_API, {
    latitude: LAT,
    longitude: LON,
    hourly: 'temperature_2m,precipitation',
    forecast_days: 5,
    models: 'meteoswiss_icon_ch2', // ch1 reicht nur ~33 h, ch2 deckt die vollen 5 Tage ab
    timezone: 'Europe/Zurich',
  }).done(renderWeatherChart);

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
      type: 'datetime', lineWidth: 1, lineColor: 'rgba(255,255,255,.18)', tickLength: 0,
      tickInterval: 2 * 36e5, gridLineWidth: 0,
      labels: {
        useHTML: true, y: 15,
        style: { color: 'rgba(255,255,255,.65)', fontSize: '11px' },
        // Um Mitternacht steht der Wochentag statt "00"
        formatter() {
          const d = new Date(this.value);
          if (d.getUTCHours() === 0) return `<b class="mw-tick-day">${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}.</b>`;
          return String(d.getUTCHours()).padStart(2, '0');
        },
      },
      crosshair: { color: 'rgba(255,255,255,.3)', width: 1 },
      plotLines: [
        ...midnights.map((t) => ({ value: t, color: 'rgba(255,255,255,.45)', width: 1, dashStyle: 'Dash' })),
        { value: nowT, color: 'rgba(255,107,107,.6)', width: 1, dashStyle: 'Dot', zIndex: 2,
          label: { text: 'Jetzt', rotation: 0, align: 'left', verticalAlign: 'bottom', x: 4, y: -6, style: { color: '#ff9b9b', fontSize: '10px', fontWeight: '500' } } },
      ],
    },
    yAxis: [
      { visible: false, maxPadding: 0.18, minPadding: 0.04, startOnTick: false, endOnTick: false },
      { visible: false, min: 0, max: Math.max(3, rainMax * 1.6) },
    ],
    tooltip: weatherTooltip(),
    plotOptions: { series: { marker: { enabled: false }, animation: false } },
    series: [
      { name: 'Niederschlag', unit: 'mm', type: 'column', yAxis: 1, data: pts('precipitation'), color: WX_RAIN, borderWidth: 0, borderRadius: 2, pointPadding: 0.34, groupPadding: 0 },
      {
        name: 'Temperatur', unit: '°C', type: 'areaspline', data: pts('temperature_2m'), color: WX_TEMP, lineWidth: 2,
        fillColor: wxFill(0.22, 0), threshold: null,
        dataLabels: {
          enabled: true, formatter() { return new Date(this.x).getUTCHours() % 2 === 0 ? `${Math.round(this.y)}°` : null; },
          style: { color: '#fff', textOutline: 'none', fontSize: '12px', fontWeight: '500' }, y: -6,
        },
      },
      { name: 'Jetzt', type: 'scatter', data: [[nowT, h.temperature_2m[nowIdx]]], color: WX_TEMP, marker: { enabled: true, radius: 4, symbol: 'circle', lineColor: '#fff', lineWidth: 1.5 }, enableMouseTracking: false },
    ],
  });

  // Start: "jetzt" am linken Rand (bzw. vorherige Position halten)
  if (keepTime != null) scrollStripTo(keepTime, 'center', false);
  else scrollStripTo(nowT - 36e5 * 0.5, 'left', false);
  updateStripHeader();
}

// Streifen zu einem Zeitpunkt scrollen
function scrollStripTo(t, where = 'left', smooth = true) {
  if (!wxStrip) return;
  const scroller = document.getElementById('weather-scroll');
  const x = wxStrip.xAxis[0].toPixels(t);
  const left = where === 'center' ? x - scroller.clientWidth / 2 : x - 14;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  scroller.scrollTo({ left: Math.max(0, left), behavior: smooth && !reduce ? 'smooth' : 'auto' });
}

// Kopfzeile + gewählter Tag folgen dem Tag in der Mitte des sichtbaren Bereichs
function updateStripHeader() {
  if (!wxStrip || !weatherDays.length) return;
  const scroller = document.getElementById('weather-scroll');
  const t = wxStrip.xAxis[0].toValue(scroller.scrollLeft + scroller.clientWidth / 2);
  const key = new Date(t).toISOString().slice(0, 10);
  const d = weatherDays.find((x) => x.key === key) || (t < Date.parse(weatherDays[0].key) ? weatherDays[0] : weatherDays[weatherDays.length - 1]);
  weatherSelDay = d.key;
  const wd = WEEKDAYS[new Date(d.key + 'T12:00Z').getUTCDay()];
  $('#weather-strip-title').text(d.isToday ? `Heute, ${wd} ${d.date}` : `${d.name}, ${d.date}`);
  $('#weather-hourly-day').text(`${d.min}° bis ${d.max}°`);
  $('#weather-strip-rain').text(d.rain >= 0.1 ? `${d.rain.toFixed(1)} mm Regen` : 'trocken');
  $('.mw-day').each(function () { $(this).attr('aria-pressed', $(this).data('day') === d.key); });
}

// Tag in der 5-Tage-Leiste angetippt → Streifen dorthin scrollen
function selectWeatherDay(key) {
  const d = weatherDays.find((x) => x.key === key);
  if (!d || !lastForecast) return;
  const h = lastForecast.hourly;
  // Heute: ab jetzt; andere Tage: ab 06 Uhr, damit man den Tag gut sieht
  const idx = d.isToday ? Math.max(0, h.time.indexOf(zurichHourKey())) : Math.min(d.from + 6, d.to);
  scrollStripTo(Date.parse(h.time[idx] + 'Z') - 36e5 * 0.5, 'left', true);
}

// Ziehen mit der Maus, Pfeiltasten und Shift+Mausrad (Touch & Trackpad scrollen nativ)
function initStripScroll() {
  const el = document.getElementById('weather-scroll');
  if (!el || el.dataset.ready) return;
  el.dataset.ready = '1';
  // Direkt beim Scrollen aktualisieren (günstig, und hängt nicht an rAF)
  let lastKey = '';
  el.addEventListener('scroll', () => {
    if (!wxStrip) return;
    const t = wxStrip.xAxis[0].toValue(el.scrollLeft + el.clientWidth / 2);
    const key = new Date(t).toISOString().slice(0, 10);
    if (key !== lastKey) { lastKey = key; updateStripHeader(); }
  }, { passive: true });

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
      plotLines: weatherDays.slice(1).map((_, i) => ({ value: dayStart + (i + 1) * 864e5, color: 'rgba(255,255,255,.4)', width: 1.5, zIndex: 3 })),
      crosshair: { color: 'rgba(255,255,255,.3)', width: 1 },
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

function initMap() {
  if (map) return map;
  map = L.map('map-container', { zoomControl: false, attributionControl: false }).setView([LAT, LON], 13);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.attribution({ position: 'topright', prefix: false }).addTo(map);
  L.tileLayer(MAP_TILES, {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.swisstopo.admin.ch/" target="_blank">swisstopo</a>',
  }).addTo(map);
  placeLayer = L.layerGroup().addTo(map);
  stationLayer = L.layerGroup().addTo(map);
  return map;
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
  setMapInfo('Zürich', LAT, LON, 'swisstopo · Landeskarte');
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
      setMapInfo(place.label, place.lat, place.lon, 'Suchergebnis · swisstopo');
    })
    .fail(() => { $('#map-place').attr('aria-invalid', 'true'); showToast(`«${text}» wurde nicht gefunden.`); })
    .always(() => setLoading($btn, false));
}

// Advanced: Ladestationen als Marker zeigen …
function showStationsOnMap(stations, originLat, originLon) {
  initMap();
  stationLayer.clearLayers();
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
  if (lastForecast) renderWeatherChart(lastForecast);
}

// ── Event-Handler ────────────────────────────────────────────────────────────
$(function () {
  $('#year').text(new Date().getFullYear());

  $('#btn-theme').on('click', toggleTheme);
  // Fehlermarkierung entfernen, sobald getippt wird
  $('#ev-plz, #map-place').on('input', function () { $(this).removeAttr('aria-invalid'); });

  $('#btn-cat').on('click', loadCat);
  $('#cat-history').on('click', '.cat-thumb:not(.is-empty)', function () { showCatFromHistory($(this).data('cat')); });
  $('#btn-btc').on('click', loadBitcoin);
  $('.wallet-range').on('click', function () { loadBtcChart(String($(this).data('range'))); });
  // Wird das Fenster gross genug, den Verlauf nachladen
  window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => {
    if (e.matches && btcUsd != null && !btcSeries) loadBtcChart(btcRange);
  });
  $('#btn-weather').on('click', loadWeather);
  // 5-Tage-Prognose: Tag wählen = oberer Streifen zeigt diesen Tag
  $('#weather-days').on('click', '.mw-day', function () {
    const key = $(this).data('day');
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
const supportsLiquid = !!(navigator.userAgentData && navigator.userAgentData.brands.some((b) => /Chromium/.test(b.brand)))
  && !window.matchMedia('(prefers-reduced-transparency: reduce)').matches;

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
//  Zusatzfeature: ÖV in drei Schritten (transport.opendata.ch)
//   1) kleines Terminal (uiverse.io / ilkhoeri, MIT) → Haltestelle + Enter
//   2) grosses Terminal "sbb-tui": Abfahrts-/Ankunftstafel mit Zugverlauf
//   3) Klick auf einen Zug → blaue SBB-Perronanzeige
// ═════════════════════════════════════════════════════════════════════════════
const SBB_API = 'https://transport.opendata.ch/v1';
const tui = { station: 'Zürich HB', type: 'departure', list: [], sel: 0, lastFocus: null, timer: 0 };

// Linien-Typ (für Badge-Farbe und Symbol)
function lineKind(cat) {
  if (/^(IC|ICE|IR|EC|RE|TGV|RJX?|EN|NJ|PE)$/i.test(cat)) return 'long';
  if (/^S/i.test(cat)) return 'sbahn';
  if (/^(T|TRAM)$/i.test(cat)) return 'tram';
  if (/^(B|BUS|NFB|EXB)$/i.test(cat)) return 'bus';
  if (/^(BAT|FAE|SCH)$/i.test(cat)) return 'boat';
  return 'other';
}
const modeIcon = { long: '🚆', sbahn: '🚆', tram: '🚊', bus: '🚌', boat: '⛴', other: '🚆' };

// "S 3", "IC 5" – bei Fernzügen ist "number" oft die Zugnummer → dann nur Kategorie
function lineLabel(e) {
  const num = String(e.number || '').replace(/^0+/, '');
  if (!num || num === e.category || num.length > 3) return e.category;
  return `${e.category} ${num}`;
}

const hm = (ts) => (ts ? new Date(ts * 1000).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : '–');
const dur = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}h ${String(min % 60).padStart(2, '0')}m`;

// Rohdaten in ein handliches Objekt pro Zug umwandeln
function toTrain(e, stationName) {
  const pass = (e.passList || []).filter((p) => p.station);
  const stops = pass.map((p, i) => ({
    name: p.station.name || stationName,
    ts: p.departureTimestamp || p.arrivalTimestamp || (i === 0 ? e.stop.departureTimestamp : null),
    platform: p.platform || (i === 0 ? e.stop.platform : '') || '',
  }));
  const dep = e.stop.departureTimestamp;
  const last = stops[stops.length - 1];
  const end = last && last.ts && last.ts > dep ? last.ts : null;
  return {
    raw: e,
    line: lineLabel(e),
    kind: lineKind(e.category),
    op: e.operator || '',
    to: e.to,
    dep,
    delay: Number(e.stop.delay) || 0,
    platform: (e.stop.prognosis && e.stop.prognosis.platform) || e.stop.platform || '',
    end,
    stops,
    cap1: e.capacity1st, cap2: e.capacity2nd,
  };
}

// ── Schritt 1 ────────────────────────────────────────────────────────────────
function openFromEntry() {
  const q = $('#sbb-query').val().trim() || 'Zürich HB';
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
    // Sicherheitsnetz, falls der Browser Frames auslässt
    setTimeout(() => gsap.set('#tui', { clearProps: 'opacity,transform' }), 600);
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

function loadTui() {
  // PowerShell-artige Ladezeile mit drehendem Schrägstrich (uiverse.io / mihocsaszilard)
  const slashes = ['|', '/', '-', '\\', '|', '/', '-', '\\'];
  const spin = `<span class="tui-spin" aria-hidden="true">${slashes.map((c) => `<span class="slash">${c}</span>`).join('')}</span>`;
  const ps = '<span class="ps">PS C:\\sbb&gt;</span>';
  const $list = $('#tui-list').html(
    `<p class="tui-loading">${ps} stationboard "${esc(tui.station)}" --${tui.type === 'arrival' ? 'arrivals' : 'departures'} ${spin}</p>`
    + '<div class="tui-skel"></div><div class="tui-skel"></div><div class="tui-skel"></div>');
  $('#tui-detail').html(`<p class="tui-loading">${ps} lade verlauf ${spin}</p>`);
  $('#tui-status').text('lädt …');
  return $.getJSON(`${SBB_API}/stationboard`, { station: tui.station, limit: 15, type: tui.type })
    .done((d) => {
      const name = (d.station && d.station.name) || tui.station;
      tui.station = name;
      $('#tui-station').val(name);
      tui.list = (d.stationboard || []).map((e) => toTrain(e, name));
      tui.sel = 0;
      if (!tui.list.length) {
        $list.html(`<p class="tui-empty">› keine ${tui.type === 'arrival' ? 'ankünfte' : 'abfahrten'} für «${esc(tui.station)}» gefunden.</p>`);
        $('#tui-detail').empty();
        $('#tui-status').text('0 züge');
        return;
      }
      renderTuiList();
      renderTuiDetail();
      $('#tui-status').text(`${tui.list.length} züge · ${name}`);
    })
    .fail(() => {
      $list.html('<p class="tui-empty">› verbindung fehlgeschlagen – später nochmals versuchen.</p>');
      $('#tui-detail').empty();
      $('#tui-status').text('fehler');
    });
}

// Linke Liste: Karten wie in sbb-tui
function renderTuiList() {
  const $list = $('#tui-list').empty();
  tui.list.forEach((t, i) => {
    const n = t.stops.length;
    const marks = t.stops.map((s, k) => {
      const pos = n > 1 ? (k / (n - 1)) * 100 : 0;
      return `<i style="left:${pos}%" class="${k === 0 || k === n - 1 ? 'is-end' : ''}"></i>`;
    }).join('');
    const total = t.end ? dur(Math.round((t.end - t.dep) / 60)) : '';
    $(`
      <button type="button" class="tui-train" role="option" id="tui-opt-${i}">
        <span class="tui-row1">
          <span class="tui-mode" aria-hidden="true">${modeIcon[t.kind]}</span>
          <span class="tui-line">${esc(t.line)}</span>
          ${t.op ? `<span class="tui-op">${esc(t.op)}</span>` : ''}
          <span class="tui-to">${esc(t.to)}</span>
        </span>
        <span class="tui-row2">
          <span>${hm(t.dep)}${t.delay > 0 ? `<span class="tui-delay">+${t.delay}'</span>` : ''}</span>
          ${n > 1 ? `<span class="tui-track" aria-hidden="true">${marks}</span>` : '<span class="tui-ends">● endet hier</span>'}
          <span>${t.end ? hm(t.end) : ''}</span>
        </span>
        <span class="tui-row3"><span>${t.platform ? `gleis ${esc(t.platform)}` : ''}</span><span>${total}</span></span>
      </button>`)
      .attr('aria-selected', i === tui.sel)
      .toggleClass('is-sel', i === tui.sel)
      .data('i', i)
      .appendTo($list);
  });
  $('#tui-list').attr('aria-activedescendant', `tui-opt-${tui.sel}`);
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
  const rows = t.stops.map((s, k) => `
    <li class="tui-stop${k === 0 ? ' is-first' : ''}">
      <time>${hm(s.ts)}</time>
      <span class="rail" aria-hidden="true"><i></i></span>
      <span class="name">${esc(s.name)}</span>
      <span class="pl">${s.platform ? `gl ${esc(s.platform)}` : ''}</span>
    </li>`).join('');
  $('#tui-detail').html(`
    <div class="tui-detail-head">
      <span class="tui-mode" aria-hidden="true">${modeIcon[t.kind]}</span>
      <span class="tui-line">${esc(t.line)}</span>
      ${t.op ? `<span class="tui-op">${esc(t.op)}</span>` : ''}
      <span>→ ${esc(t.to)}</span>
    </div>
    <ol class="tui-stops">${rows || '<li class="tui-empty">keine halte bekannt</li>'}</ol>`);
}

// ── Schritt 3: SBB-Perronanzeige ─────────────────────────────────────────────
function openBoard(i) {
  const t = tui.list[i];
  if (!t) return;
  selectTui(i, false);
  const next = t.stops.slice(1);
  const via = next.slice(0, -1).map((s) => s.name).slice(0, 6);
  $('#sbbd-line').text(t.line).toggleClass('is-sbahn', t.kind !== 'long');
  $('#sbbd-time').text(hm(t.dep));
  $('#sbbd-delay').text(t.delay > 0 ? `+${t.delay}'` : '');
  $('#sbbd-dest').text(t.to);
  $('#sbbd-via').text(via.join('  '));
  $('#sbbd-plat').text(t.platform || '–');
  const cap = (n) => `<span class="cap">${[1, 2, 3].map((k) => `<i class="${n >= k ? 'on' : ''}"></i>`).join('')}</span>`;
  $('#sbbd-strip').html(
    `<span>${esc(t.op || 'ÖV')}</span>`
    + (t.cap1 ? `<span>1. Kl. ${cap(t.cap1)}</span>` : '')
    + (t.cap2 ? `<span>2. Kl. ${cap(t.cap2)}</span>` : '')
    + (t.end ? `<span>an ${esc(t.to)} ${hm(t.end)}</span>` : ''),
  );
  // Endet der Zug hier (z.B. in der Ankunftstafel), gibt es keine weiteren Halte
  const endsHere = !next.length || norm(t.to || '') === norm(tui.station || '');
  $('#sbbd-stops').html(next.length
    ? next.slice(0, 6).map((s) => `<li>${esc(s.name)}<small>${hm(s.ts)}</small></li>`).join('')
    : `<li class="is-end">${endsHere ? 'Endstation – dieser Zug endet hier.' : 'Keine weiteren Halte bekannt.'}</li>`);
  if (!next.length) $('#sbbd-via').text(endsHere ? `Ankunft in ${t.to}` : '');
  $('#sbbd-sr').text(`${t.line} nach ${t.to}, ${hm(t.dep)}, Gleis ${t.platform || 'unbekannt'}. Halte: ${next.map((s) => s.name).join(', ')}.`);
  const board = document.getElementById('tui-board');
  board.hidden = false;
  document.getElementById('tui').classList.add('is-board');
  $('#tui-name').text(`sbb-tui · ${t.line} → ${t.to}`);
  if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo('.sbb-display', { y: 18, opacity: 0, rotateX: 8 }, { y: 0, opacity: 1, rotateX: 0, duration: 0.45, ease: 'power3.out', clearProps: 'all' });
    setTimeout(() => gsap.set('.sbb-display', { clearProps: 'all' }), 800);
  }
}

function closeBoard(refocus = true) {
  const board = document.getElementById('tui-board');
  if (board.hidden) return false;
  board.hidden = true;
  document.getElementById('tui').classList.remove('is-board');
  $('#tui-name').text('sbb-tui · Abfahrtstafel');
  if (refocus) { const el = document.getElementById(`tui-opt-${tui.sel}`); if (el) el.focus(); }
  return true;
}

function setTuiType(type) {
  tui.type = type;
  $('#tui-dep').toggleClass('is-on', type === 'departure').attr('aria-pressed', type === 'departure');
  $('#tui-arr').toggleClass('is-on', type === 'arrival').attr('aria-pressed', type === 'arrival');
  loadTui();
}

$(function () {
  // Schritt 1
  $('#sbb-query').on('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); openFromEntry(); } });
  $('#sbb-copy').on('click', function () {
    const cmd = `sbb ${$('#sbb-query').val().trim() || 'Zürich HB'}`;
    if (navigator.clipboard) navigator.clipboard.writeText(cmd).catch(() => {});
    $(this).removeClass('is-copied');
    void this.offsetWidth;
    $(this).addClass('is-copied');
    showToast(`Kopiert: ${cmd}`);
  });

  // Schritt 2
  $('#tui-close, #tui-overlay').on('click', closeSbbTui);
  $('#tui-dep').on('click', () => setTuiType('departure'));
  $('#tui-arr').on('click', () => setTuiType('arrival'));
  $('#tui-search').on('click', () => { tui.station = $('#tui-station').val().trim() || tui.station; loadTui(); });
  $('#tui-station').on('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); tui.station = $(e.target).val().trim() || tui.station; loadTui(); } });
  $('#tui-list')
    .on('mouseenter focus', '.tui-train', function () { selectTui($(this).data('i'), false); })
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
  // Klick auf die Anzeige schliesst sie wieder
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
