# Erzeugt wireframe.drawio im shadcn/ui-Stil (zinc, 1px-Borders, radius 8/12)
cells = []; n = [100]

def add(value, x, y, w, h, style):
    n[0] += 1
    v = value.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '&#xa;')
    cells.append(f'    <mxCell id="{n[0]}" value="{v}" style="whiteSpace=wrap;html=1;{style}" vertex="1" parent="1">\n      <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />\n    </mxCell>')

FG = '#09090b'; MUTED = '#71717a'; BORDER = '#e4e4e7'; MUTEDBG = '#f4f4f5'; PRIMARY = '#18181b'; F = 'fontFamily=Inter;'

def rr(r): return f'rounded=1;absoluteArcSize=1;arcSize={r};'

def text(v, x, y, w, h, size=14, color=FG, bold=False, align='left'):
    add(v, x, y, w, h, f'text;fontColor={color};fontSize={size};fontStyle={1 if bold else 0};align={align};verticalAlign=middle;{F}')

def btn(label, x, y, w, variant='default'):
    s = {'default': f'fillColor={PRIMARY};fontColor=#fafafa;strokeColor=none;',
         'outline': f'fillColor=#ffffff;fontColor={FG};strokeColor={BORDER};'}[variant]
    add(label, x, y, w, 36, rr(12) + s + f'fontSize=13;{F}')

def badge(label, x, y, w, variant='secondary'):
    s = {'secondary': f'fillColor={MUTEDBG};strokeColor=none;fontColor={FG};',
         'outline': f'fillColor=none;strokeColor={BORDER};fontColor={FG};'}[variant]
    add(label, x, y, w, 22, rr(10) + s + f'fontSize=11;{F}')

def card(x, y, w, h, title, desc, icon):
    add('', x, y, w, h, rr(24) + f'fillColor=#ffffff;strokeColor={BORDER};')
    add(icon, x + 24, y + 24, 36, 36, rr(14) + f'fillColor=#ffffff;strokeColor={BORDER};fontSize=15;')
    text(title, x + 72, y + 22, w - 180, 20, 15, FG, True)
    text(desc, x + 72, y + 42, w - 180, 20, 13, MUTED)

def inputrow(label, ph, x, y, w):
    text(label, x, y, 200, 16, 13, FG, True)
    add(ph, x, y + 24, w - 108, 36, rr(12) + f'fillColor=#ffffff;strokeColor={BORDER};fontColor={MUTED};fontSize=13;align=left;spacingLeft=12;{F}')
    btn('⌕  Suchen', x + w - 100, y + 24, 100, 'outline')

def empty(title, desc, x, y, w, h):
    add('', x, y, w, h, rr(16) + f'fillColor=none;strokeColor={BORDER};dashed=1;dashPattern=4 4;')
    add('◻', x + w / 2 - 20, y + h / 2 - 48, 40, 40, rr(16) + f'fillColor={MUTEDBG};strokeColor=none;fontColor={MUTED};fontSize=16;')
    text(title, x, y + h / 2, w, 20, 13, FG, True, 'center')
    text(desc, x, y + h / 2 + 20, w, 20, 12, MUTED, False, 'center')

# Header
add('', 0, 0, 1654, 56, f'fillColor=#ffffff;strokeColor={BORDER};')
add('▦', 40, 16, 24, 24, rr(12) + f'fillColor={PRIMARY};fontColor=#ffffff;strokeColor=none;fontSize=12;')
text('Dashboard', 72, 16, 120, 24, 14, FG, True)
for i, t in enumerate(['Katzen', 'Bitcoin', 'Wetter', 'Laden', 'Karte']):
    text(t, 220 + i * 80, 16, 70, 24, 13, MUTED, False, 'center')
btn('☀', 1578, 10, 36, 'outline')

# Hero (Himmel mit Wolken)
add('Bootstrap Frontend\nKatzen · Bitcoin · Wetter · Ladestationen · Karte', 40, 88, 1574, 260,
    rr(24) + f'fillColor=#3876ba;gradientColor=#8cbfe8;gradientDirection=south;strokeColor={BORDER};fontColor=#ffffff;fontSize=30;fontStyle=1;align=left;verticalAlign=bottom;spacingLeft=32;spacingBottom=32;{F}')
for (cx, cy, cw) in [(300, 120, 200), (800, 180, 260), (1150, 110, 180), (1350, 230, 220)]:
    add('', cx, cy, cw, round(cw * 0.38), 'ellipse;fillColor=#fbf8f2;strokeColor=none;opacity=85;')
add('● LIVE DATA · 5 APIS', 1440, 112, 150, 22, rr(10) + f'fillColor=#ffffff;opacity=30;strokeColor=#ffffff;fontColor=#ffffff;fontSize=11;{F}')

# Reihe 1
Y = 380
card(40, Y, 490, 380, 'Zufälliges Katzenbild', 'Ein neues Bild von The Cat API.', '🖼')
empty('Noch kein Bild', 'Klicke auf den Button, um ein Katzenbild zu laden.', 64, Y + 84, 442, 212)
btn('↻  Neues Katzenbild laden', 64, Y + 320, 442)

card(572, Y, 490, 380, 'Bitcoin-Preis', 'Aktueller Kurs in USD und CHF.', '₿')
add('', 596, Y + 84, 442, 132, rr(16) + f'fillColor=#ffffff;strokeColor={BORDER};')
text('Währung', 612, Y + 84, 200, 40, 12, MUTED); text('Preis', 822, Y + 84, 200, 40, 12, MUTED, False, 'right')
add('', 596, Y + 124, 442, 1, f'fillColor={BORDER};strokeColor=none;')
badge('USD', 612, Y + 138, 44, 'outline'); text('$ ––––––', 822, Y + 130, 200, 40, 15, FG, True, 'right')
add('', 596, Y + 170, 442, 1, f'fillColor={BORDER};strokeColor=none;')
badge('CHF', 612, Y + 184, 44, 'outline'); text('CHF ––––––', 822, Y + 176, 200, 40, 15, FG, True, 'right')
text('Noch nicht abgerufen', 596, Y + 228, 300, 20, 12, MUTED)
btn('↻  Preis abrufen', 596, Y + 320, 442)

card(1104, Y, 510, 380, 'Aktuelles Wetter', 'Ort: Zürich, CH', '⛅')
for i, (l, v) in enumerate([('Tmax', '–– °C'), ('Tmin', '–– °C'), ('Niederschlag', '–– mm')]):
    x = 1128 + i * 158
    add('', x, Y + 84, 150, 72, rr(16) + f'fillColor=#ffffff;strokeColor={BORDER};')
    text(l, x + 12, Y + 92, 130, 18, 11, MUTED); text(v, x + 12, Y + 114, 130, 30, 18, FG, True)
add('Chart: Temperatur (Linie) + Niederschlag (Säulen), 5 Tage', 1128, Y + 170, 462, 130,
    rr(16) + f'fillColor={MUTEDBG};strokeColor=none;fontColor={MUTED};fontSize=12;{F}')
btn('↻  Wetter laden', 1128, Y + 320, 462)

# Reihe 2
Y2 = Y + 412
card(40, Y2, 770, 460, 'Nächste Strom-Tankstellen', 'Die 5 nächsten öffentlichen Ladestationen.', '⚡')
badge('Winterthur', 700, Y2 + 24, 86)
inputrow('Postleitzahl', 'z.B. 8400', 64, Y2 + 84, 722)
add('', 64, Y2 + 156, 722, 236, rr(16) + f'fillColor=#ffffff;strokeColor={BORDER};')
text('#', 76, Y2 + 156, 30, 36, 12, MUTED); text('Station', 112, Y2 + 156, 300, 36, 12, MUTED)
text('Distanz', 660, Y2 + 156, 110, 36, 12, MUTED, False, 'right')
for i, d in enumerate(['0.2', '0.2', '0.2', '0.5', '0.5']):
    yy = Y2 + 192 + i * 40
    add('', 64, yy, 722, 1, f'fillColor={BORDER};strokeColor=none;')
    text(str(i + 1), 76, yy, 30, 40, 13, MUTED); text('Station Name · Strasse, PLZ Ort', 112, yy, 480, 40, 13, FG)
    badge(f'{d} km', 712, yy + 9, 60)
btn('↻  Ladestationen laden (Winterthur)', 64, Y2 + 404, 722)

card(844, Y2, 770, 460, 'Kartenausschnitt', 'Landeskarte von swisstopo.', '🗺')
inputrow('Ort', 'z.B. Luzern', 868, Y2 + 84, 722)
add('📍 Leaflet-Karte (swisstopo)', 868, Y2 + 156, 722, 236, rr(16) + f'fillColor={MUTEDBG};strokeColor={BORDER};fontColor={MUTED};fontSize=13;{F}')
btn('⌖  Karte anzeigen (Zürich)', 868, Y2 + 404, 722)

# Footer
add('', 0, Y2 + 500, 1654, 1, f'fillColor={BORDER};strokeColor=none;')
text('© 2026 Bootstrap Frontend · Tiago Cevallos', 40, Y2 + 512, 600, 30, 13, MUTED)

# Komponenten-Legende
add('shadcn-Mapping\n\nNavbar → Navigation Menu · Theme-Toggle → Button (ghost, icon)\n'
    'Karten → Card (Header / Title / Description / Content / Footer)\nButtons → Button (default / outline)\n'
    'PLZ & Ort → Label + Input\nBitcoin & Stationen → Table + Badge\n'
    'Platzhalter → Empty State · Laden → Skeleton · Fehler → Toast / Alert',
    1000, Y2 + 520, 614, 170,
    rr(16) + f'fillColor={MUTEDBG};strokeColor={BORDER};fontColor={FG};fontSize=12;align=left;verticalAlign=top;spacingLeft=16;spacingTop=14;{F}')

out = ('<mxGraphModel dx="1422" dy="762" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" '
       'page="1" pageScale="1" pageWidth="1654" pageHeight="1600" background="#ffffff" math="0" shadow="0">\n  <root>\n'
       '    <mxCell id="0" />\n    <mxCell id="1" parent="0" />\n' + '\n'.join(cells) + '\n  </root>\n</mxGraphModel>\n')
open('wireframe.drawio', 'w', encoding='utf8').write(out)
