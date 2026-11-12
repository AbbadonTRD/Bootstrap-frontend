# Bootstrap Frontend

Ein Bootstrap 5.3 Frontend-Projekt mit 5 interaktiven Features, die offene APIs per jQuery abfragen.

## Features

| # | Feature | API / Library | Status |
|---|---------|---------------|--------|
| a | Zufälliges Katzenbild | The Cat API | ✅ |
| b | Bitcoin-Preis in USD & CHF | CoinGecko | ✅ |
| c | Aktuelles Wetter Zürich + 5-Tage-Chart | Open-Meteo, Highcharts | ✅ |
| d | 5 nächste Strom-Tankstellen (Winterthur) + Suche nach PLZ | data.geo.admin.ch, api3.geo.admin.ch | ✅ |
| e | Kartenausschnitt + Suche nach Ort | Leaflet, swisstopo | ✅ |
| Advanced | Klick auf Tankstelle zentriert die Karte | – | ✅ |

## Verwendete Technologien

- [Bootstrap 5.3](https://getbootstrap.com/docs/5.3/) + [Streamline Core Solid Icons](https://www.streamlinehq.com/icons/core-solid) (CC BY 4.0, als SVG-Sprite)
- [jQuery 3.7](https://jquery.com/)
- [Leaflet 1.9](https://leafletjs.com/)
- [Highcharts 11](https://www.highcharts.com/)
- Hero: Split-Flap-Board (inspiriert von Aceternity „Text Flipping Board“), nur HTML/CSS + jQuery
- Liquid Glass (inspiriert von Aceternity): SVG-Filter als backdrop-filter, Fallback mattes Glas
- Design im Stil von [shadcn/ui](https://ui.shadcn.com/) – umgesetzt mit Bootstrap-Grid + eigenen CSS-Variablen (Hell/Dunkel), ohne React/Tailwind

## Projektstruktur

```
bootstrap-frontend/
├── index.html   # Hauptseite
├── styles.css   # Eigene Styles
├── app.js       # Alle API-Funktionen (jQuery)
└── README.md
```

## Lokale Entwicklung

`index.html` im Browser öffnen oder einen lokalen Server starten, z.B.:

```bash
npx http-server -p 5500
```
