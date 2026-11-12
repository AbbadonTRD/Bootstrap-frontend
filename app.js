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

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

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
      $img.one('load', () => {
        requestAnimationFrame(() => $img.removeClass('is-loading'));
        setLoading($btn, false);
      });
      $img.one('error', () => {
        setLoading($btn, false);
        showToast('Katzenbild konnte nicht geladen werden.');
      });
      $img.attr('src', data[0].url);
    })
    .fail(() => {
      setLoading($btn, false);
      if (!$img.attr('src')) { $('#cat-frame').addClass('d-none'); $('#cat-placeholder').removeClass('d-none'); }
      $img.removeClass('is-loading');
      $('#cat-error').removeClass('d-none').find('span').text('Die Cat API ist gerade nicht erreichbar.');
    });
}

// ── b) Bitcoin-Preis in USD und CHF ──────────────────────────────────────────
function loadBitcoin() {
  const $btn = $('#btn-btc');
  setLoading($btn, true);

  $.getJSON(BTC_API)
    .done((data) => {
      swapValue($('#btc-usd'), fmtUSD.format(data.bitcoin.usd));
      swapValue($('#btc-chf'), fmtCHF.format(data.bitcoin.chf));
      const time = new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      $('#btc-time').text(`Stand ${time}`);
    })
    .fail(() => showToast('CoinGecko ist gerade nicht erreichbar (Rate-Limit?).'))
    .always(() => setLoading($btn, false));
}

// ── c) Aktuelles Wetter (Zürich) + 5-Tage-Chart ──────────────────────────────
function loadWeather() {
  const $btn = $('#btn-weather');
  setLoading($btn, true);

  // Heute: Tmax, Tmin, Niederschlag
  const today = $.getJSON(WEATHER_API, {
    latitude: LAT,
    longitude: LON,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    forecast_days: 1,
    timezone: 'Europe/Zurich',
  }).done((data) => {
    const d = data.daily;
    swapValue($('#weather-tmax'), `${Math.round(d.temperature_2m_max[0])} °C`);
    swapValue($('#weather-tmin'), `${Math.round(d.temperature_2m_min[0])} °C`);
    swapValue($('#weather-rain'), `${d.precipitation_sum[0].toFixed(1)} mm`);
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
    .fail(() => showToast('Open-Meteo ist gerade nicht erreichbar.'))
    .always(() => setLoading($btn, false));
}

let lastForecast = null; // für Neuzeichnen beim Theme-Wechsel

// CSS-Variable lesen (damit der Chart Hell/Dunkel mitmacht)
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderWeatherChart(data) {
  lastForecast = data;
  // Zeiten sind Lokalzeit ohne Offset → als UTC parsen, Highcharts zeigt sie 1:1
  const times = data.hourly.time.map((t) => Date.parse(t + 'Z'));
  const temp  = times.map((t, i) => [t, data.hourly.temperature_2m[i]]);
  const rain  = times.map((t, i) => [t, data.hourly.precipitation[i]]);

  const muted = cssVar('--muted-foreground');
  const border = cssVar('--border');
  const c1 = cssVar('--chart-1');   // Temperatur
  const c2 = cssVar('--chart-2');   // Niederschlag
  const font = cssVar('--font-sans');

  $('#weather-chart-card').removeClass('d-none');

  // Footer-Zusammenfassung wie bei shadcn ("Trending up …")
  const temps = data.hourly.temperature_2m.filter((v) => v != null);
  const rainSum = data.hourly.precipitation.reduce((s, v) => s + (v || 0), 0);
  $('#weather-trend').html(
    `<i class="bi bi-thermometer-half"></i> ${Math.round(Math.min(...temps))}° bis ${Math.round(Math.max(...temps))}° · ${rainSum.toFixed(1)} mm Regen in 5 Tagen`
  );

  // Deutsche Wochentage
  Highcharts.setOptions({ lang: {
    weekdays: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    shortWeekdays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  } });

  const axisLabels = { style: { color: muted, fontSize: '11px' } };

  Highcharts.chart('weather-chart', {
    chart: {
      backgroundColor: 'transparent', style: { fontFamily: font },
      spacing: [8, 4, 4, 4], animation: { duration: 400 },
    },
    title: { text: null },
    credits: { enabled: false },
    legend: { enabled: false },                // eigene shadcn-Legende im HTML
    xAxis: {
      type: 'datetime', lineWidth: 0, tickLength: 0,
      labels: { ...axisLabels, format: '{value:%a}' },
      crosshair: { color: border, width: 1, dashStyle: 'Dash' },
    },
    yAxis: [
      { title: { text: null }, labels: { ...axisLabels, format: '{value}°' }, gridLineColor: border, gridLineDashStyle: 'Dash', tickAmount: 4 },
      { title: { text: null }, labels: { ...axisLabels, format: '{value} mm' }, opposite: true, gridLineWidth: 0, min: 0, tickAmount: 4 },
    ],
    tooltip: {
      shared: true, useHTML: true, outside: true,
      backgroundColor: 'transparent', borderWidth: 0, shadow: false, padding: 0,
      formatter() {
        const rows = this.points.map((p) => `
          <div class="ui-chart-tooltip-row">
            <i class="ui-chart-dot" style="background:${p.color}"></i>
            <span class="name">${p.series.name}</span>
            <span class="val">${p.y.toFixed(1)} ${p.series.options.unit}</span>
          </div>`).join('');
        const label = Highcharts.dateFormat('%A, %H:%M', this.x);
        return `<div class="ui-chart-tooltip"><div class="ui-chart-tooltip-label">${label}</div>${rows}</div>`;
      },
    },
    plotOptions: {
      series: { marker: { enabled: false, states: { hover: { enabled: true, radius: 4, lineWidth: 2, lineColor: cssVar('--background') } } } },
    },
    series: [
      {
        name: 'Temperatur', unit: '°C', type: 'areaspline', data: temp, color: c1, lineWidth: 2, zIndex: 2,
        // Verlauf wie bei shadcn <linearGradient> (0.8 → 0.1)
        fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, Highcharts.color(c1).setOpacity(0.35).get()], [1, Highcharts.color(c1).setOpacity(0.02).get()]] },
        threshold: null,
      },
      {
        name: 'Niederschlag', unit: 'mm', type: 'column', yAxis: 1, data: rain, color: c2, zIndex: 1,
        borderWidth: 0, borderRadius: 2, pointPadding: 0.05, groupPadding: 0,
      },
    ],
  });
}

// ── d) Die 5 nächstgelegenen Strom-Tankstellen ───────────────────────────────
let evStations = null; // Cache: Datei ist ~1 MB, nur einmal laden

function fetchStations() {
  if (evStations) return $.Deferred().resolve(evStations).promise();

  return $.getJSON(EV_API).then((data) => {
    const seen = new Set();
    evStations = [];
    data.EVSEData.forEach((operator) => {
      operator.EVSEDataRecord.forEach((r) => {
        // Nur öffentlich zugängliche Stationen
        if (!/publicly accessible/.test(r.Accessibility)) return;
        const [lat, lon] = r.GeoCoordinates.Google.split(/[ ,]+/).map(Number);
        if (!isFinite(lat) || !isFinite(lon)) return;
        // Ein Standort hat oft mehrere Ladepunkte → pro Standort (~10 m) nur einmal aufnehmen
        const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        if (seen.has(key)) return;
        seen.add(key);
        // ChargingStationNames ist meist ein Array, manchmal aber ein einzelnes Objekt
        const names = [].concat(r.ChargingStationNames || []);
        const name = (names.find((n) => n.lang === 'de') || names[0] || {}).value || 'Ladestation';
        const a = r.Address || {};
        evStations.push({
          lat, lon, name,
          address: [a.Street, [a.PostalCode, a.City].filter(Boolean).join(' ')].filter(Boolean).join(', '),
          operator: operator.OperatorName,
        });
      });
    });
    return evStations;
  });
}

function renderStations(originLat, originLon, originLabel) {
  const nearest = evStations
    .map((s) => ({ ...s, dist: distanceKm(originLat, originLon, s.lat, s.lon) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5);

  const $list = $('#ev-list').empty();
  nearest.forEach((s, i) => {
    $('<tr class="ev-item is-clickable">')
      .attr({ tabindex: 0, 'aria-selected': 'false', title: 'Auf der Karte zeigen' })
      .data('station', s)
      .append(
        $('<td class="cell-rank">').text(i + 1),
        $('<td>').append(
          $('<span class="fw-medium">').text(s.name),
          $('<span class="cell-sub">').text(s.address || s.operator)
        ),
        $('<td class="num">').append($('<span class="ui-badge ui-badge-secondary">').text(`${s.dist.toFixed(1)} km`))
      )
      .appendTo($list);
  });

  $('#ev-placeholder').addClass('d-none');
  $('#ev-table, #ev-hint').removeClass('d-none');
  $('#ev-origin').text(originLabel);

  showStationsOnMap(nearest, originLat, originLon);
}

// Skeleton-Zeilen, solange die ~1 MB grosse Datei lädt
function showStationSkeleton() {
  if (evStations) return;
  const $list = $('#ev-list').empty();
  for (let i = 0; i < 5; i++) {
    $list.append(`<tr><td class="cell-rank"><div class="ui-skeleton" style="height:14px;width:14px"></div></td>
      <td><div class="ui-skeleton" style="height:14px;width:${60 + (i % 3) * 12}%"></div>
          <div class="ui-skeleton mt-2" style="height:12px;width:45%"></div></td>
      <td class="num"><div class="ui-skeleton ms-auto" style="height:20px;width:52px"></div></td></tr>`);
  }
  $('#ev-placeholder').addClass('d-none');
  $('#ev-table').removeClass('d-none');
}

function hideStationSkeletonOnError() {
  if (evStations) return;
  $('#ev-table').addClass('d-none');
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

// ── e) Kartenausschnitt (Leaflet + swisstopo) ────────────────────────────────
let map = null;
let placeLayer = null;   // Marker für Ort-Suche
let stationLayer = null; // Marker für Ladestationen

function initMap() {
  if (map) return map;
  map = L.map('map-container', { zoomControl: true }).setView([LAT, LON], 13);
  L.tileLayer(MAP_TILES, {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.swisstopo.admin.ch/" target="_blank">swisstopo</a>',
  }).addTo(map);
  placeLayer = L.layerGroup().addTo(map);
  stationLayer = L.layerGroup().addTo(map);
  return map;
}

function showMap() {
  initMap();
  placeLayer.clearLayers();
  L.marker([LAT, LON]).addTo(placeLayer).bindPopup('<strong>Zürich</strong>').openPopup();
  map.flyTo([LAT, LON], 13, { duration: 0.6 });
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
      L.marker([place.lat, place.lon]).addTo(placeLayer).bindPopup(`<strong>${$('<div>').text(place.label).html()}</strong>`).openPopup();
      map.flyTo([place.lat, place.lon], 13, { duration: 0.6 });
    })
    .fail(() => { $('#map-place').attr('aria-invalid', 'true'); showToast(`«${text}» wurde nicht gefunden.`); })
    .always(() => setLoading($btn, false));
}

// Advanced: Ladestationen als Marker zeigen …
function showStationsOnMap(stations, originLat, originLon) {
  initMap();
  stationLayer.clearLayers();
  stations.forEach((s, i) => {
    s.marker = L.circleMarker([s.lat, s.lon], {
      radius: 8, color: '#fff', weight: 2, fillColor: '#7c6fd6', fillOpacity: 1,
    })
      .addTo(stationLayer)
      .bindPopup(`<strong>${i + 1}. ${$('<div>').text(s.name).html()}</strong><br>${$('<div>').text(s.address).html()}`);
  });
  L.circleMarker([originLat, originLon], { radius: 6, color: '#fff', weight: 2, fillColor: '#18181b', fillOpacity: 1 })
    .addTo(stationLayer).bindTooltip('Ausgangspunkt');
  map.flyToBounds(L.latLngBounds(stations.map((s) => [s.lat, s.lon]).concat([[originLat, originLon]])), { padding: [30, 30], duration: 0.6 });
}

// … und beim Klick auf eine Station die Karte darauf zentrieren
function focusStation($item) {
  const s = $item.data('station');
  $('.ev-item').attr('aria-selected', 'false');
  $item.attr('aria-selected', 'true');
  initMap();
  map.closePopup();
  map.once('moveend', () => s.marker && s.marker.openPopup());
  map.flyTo([s.lat, s.lon], 17, { duration: 0.6 });
  // Auf kleinen Bildschirmen zur Karte scrollen
  if (window.innerWidth < 992) document.getElementById('card-map').scrollIntoView({ behavior: 'smooth' });
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
  $('#btn-btc').on('click', loadBitcoin);
  $('#btn-weather').on('click', loadWeather);
  $('#btn-ev').on('click', loadStations);
  $('#btn-ev-plz').on('click', searchStationsByPlz);
  $('#btn-map').on('click', showMap);
  $('#btn-map-place').on('click', searchPlace);

  // Enter in den Suchfeldern löst die Suche aus
  $('#ev-plz').on('keydown', (e) => { if (e.key === 'Enter') searchStationsByPlz(); });
  $('#map-place').on('keydown', (e) => { if (e.key === 'Enter') searchPlace(); });

  // Advanced: Klick (oder Enter) auf eine Station → Karte zentrieren
  $('#ev-list').on('click', '.ev-item', function () { focusStation($(this)); });
  $('#ev-list').on('keydown', '.ev-item', function (e) { if (e.key === 'Enter') focusStation($(this)); });

  // Karte direkt beim Laden anzeigen, damit der Bereich nicht leer ist
  initMap();
});
