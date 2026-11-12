// Dynamisches Copyright-Jahr
document.getElementById('year').textContent = new Date().getFullYear();

// ── Feature 1: Zufälliges Katzenbild ──────────────────────────────────────────
// TODO: API-Aufruf an https://api.thecatapi.com/v1/images/search
document.getElementById('btn-cat').addEventListener('click', () => {
  // Platzhalter: wird später durch echten API-Aufruf ersetzt
  console.log('Feature 1: Katzenbild laden – noch nicht implementiert');
});

// ── Feature 2: Bitcoin-Preis ──────────────────────────────────────────────────
// TODO: API-Aufruf an CoinGecko oder ähnliches
document.getElementById('btn-btc').addEventListener('click', () => {
  // Platzhalter: wird später durch echten API-Aufruf ersetzt
  console.log('Feature 2: Bitcoin-Preis laden – noch nicht implementiert');
});

// ── Feature 3: Aktuelles Wetter ───────────────────────────────────────────────
// Fix hinterlegte Koordinaten: Zürich (47.3769, 8.5417)
// TODO: API-Aufruf an Open-Meteo oder OpenWeatherMap
document.getElementById('btn-weather').addEventListener('click', () => {
  // Platzhalter: wird später durch echten API-Aufruf ersetzt
  console.log('Feature 3: Wetter laden – noch nicht implementiert');
});

// ── Feature 4: Strom-Tankstellen ──────────────────────────────────────────────
// Fix hinterlegter Ort: Zürich HB (47.3779, 8.5403)
// TODO: API-Aufruf an Open Charge Map oder ähnliches
document.getElementById('btn-ev').addEventListener('click', () => {
  // Platzhalter: wird später durch echten API-Aufruf ersetzt
  console.log('Feature 4: Ladestationen laden – noch nicht implementiert');
});

// ── Feature 5: Kartenausschnitt ───────────────────────────────────────────────
// Fix hinterlegter Ort: Zürich (47.3769, 8.5417)
// TODO: Leaflet.js oder ähnliche Kartenbibliothek einbinden
document.getElementById('btn-map').addEventListener('click', () => {
  // Platzhalter: wird später durch echte Karteneinbettung ersetzt
  console.log('Feature 5: Karte anzeigen – noch nicht implementiert');
});
