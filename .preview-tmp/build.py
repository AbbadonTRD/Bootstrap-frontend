cells=[];n=[100]
def add(value,x,y,w,h,style,extra=''):
    n[0]+=1
    v=value.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('\n','&#xa;')
    cells.append(f'    <mxCell id="{n[0]}" value="{v}" style="whiteSpace=wrap;html=1;{style}" vertex="1" parent="1">\n      <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />\n    </mxCell>')
INK='#18181b';MUTED='#71717a';LINE='#e4e4e7';SOFT='#f4f4f5'
def rr(r):return f'rounded=1;absoluteArcSize=1;arcSize={r};'
# navbar: glassy dark pill
add('',40,32,1574,56,rr(28)+f'fillColor={INK};strokeColor=none;shadow=1;')
add('●  Dashboard',64,32,300,56,'text;fontColor=#ffffff;fontSize=14;fontStyle=1;align=left;verticalAlign=middle;fontFamily=Inter;')
for i,t in enumerate(['Katzen','Bitcoin','Wetter','Laden','Karte']):
    add(t,1160+i*88,44,80,32,rr(16)+('fillColor=#ffffff;fontColor=#18181b;' if i==0 else 'fillColor=none;fontColor=#a1a1aa;')+'strokeColor=none;fontSize=12;fontFamily=Inter;')
# hero: gradient
add('Bootstrap Frontend\nKatzen · Bitcoin · Wetter · Ladestationen · Karte',40,108,1574,120,rr(24)+'fillColor=#18181b;gradientColor=#4338ca;gradientDirection=east;strokeColor=none;fontColor=#ffffff;fontSize=26;fontStyle=1;align=left;spacingLeft=40;fontFamily=Inter;')
add('LIVE DATA · 5 APIs',1414,128,170,28,rr(14)+'fillColor=#ffffff22;fillColor=#6d6ad8;strokeColor=none;fontColor=#ffffff;fontSize=10;fontStyle=1;fontFamily=Inter;')
def card(x,y,w,h,title,chip,icon):
    add('',x,y,w,h,rr(20)+f'fillColor=#ffffff;strokeColor={LINE};shadow=1;')
    add(icon,x+20,y+16,32,32,rr(10)+f'fillColor={chip};strokeColor=none;fontSize=15;')
    add(title,x+62,y+16,w-90,32,f'text;fontColor={INK};fontSize=14;fontStyle=1;align=left;verticalAlign=middle;fontFamily=Inter;')
    add('',x+20,y+60,w-40,1,f'fillColor={LINE};strokeColor=none;')
def btn(label,x,y,w,fill=INK,fc='#ffffff'):
    add(label,x,y,w,40,rr(12)+f'fillColor={fill};strokeColor=none;fontColor={fc};fontSize=13;fontStyle=1;fontFamily=Inter;')
def tile(t,x,y,w,h,val=None):
    add(t,x,y,w,h,rr(12)+f'fillColor={SOFT};strokeColor=none;fontColor={INK};fontSize=13;align=left;spacingLeft=16;fontFamily=Inter;')
# row 1
card(40,252,490,276,'Zufälliges Katzenbild','#ffe4e6','😺')
add('🖼️\nBild erscheint hier',60,332,450,120,rr(14)+f'fillColor={SOFT};strokeColor=#d4d4d8;dashed=1;dashPattern=4 4;fontColor={MUTED};fontSize=13;fontFamily=Inter;')
btn('↻  Neues Katzenbild laden',60,470,450)
card(572,252,490,276,'Bitcoin-Preis','#fef3c7','₿')
add('USD',592,332,450,48,rr(12)+f'fillColor={SOFT};strokeColor=none;fontColor={MUTED};fontSize=12;align=left;spacingLeft=16;fontFamily=Inter;')
add('$ ——————',852,332,170,48,f'text;fontColor={INK};fontSize=16;fontStyle=1;align=right;verticalAlign=middle;fontFamily=Courier New;')
add('CHF',592,392,450,48,rr(12)+f'fillColor={SOFT};strokeColor=none;fontColor={MUTED};fontSize=12;align=left;spacingLeft=16;fontFamily=Inter;')
add('₣ ——————',852,392,170,48,f'text;fontColor={INK};fontSize=16;fontStyle=1;align=right;verticalAlign=middle;fontFamily=Courier New;')
btn('↻  Preis abrufen',592,470,450)
card(1104,252,510,276,'Aktuelles Wetter','#e0f2fe','⛅')
add('Zürich · 47.3769° N, 8.5417° E',1124,314,470,18,f'text;fontColor={MUTED};fontSize=11;align=left;fontFamily=Inter;')
for i,(t,v) in enumerate([('Temp','–– °C'),('Himmel','––––'),('Wind','–– km/h')]):
    x=1124+i*160
    add(t.upper(),x,340,150,100,rr(12)+f'fillColor={SOFT};strokeColor=none;fontColor={MUTED};fontSize=10;fontStyle=1;align=left;verticalAlign=top;spacingLeft=14;spacingTop=14;fontFamily=Inter;')
    add(v,x,372,150,50,f'text;fontColor={INK};fontSize=18;fontStyle=1;align=left;spacingLeft=14;verticalAlign=middle;fontFamily=Courier New;')
btn('↻  Wetter laden',1124,470,470)
# row 2
card(40,568,770,320,'Nächste Strom-Tankstellen','#dcfce7','⚡')
d=['0.3','0.5','0.8','1.1','1.4']
for i,k in enumerate(d):
    y=640+i*38
    add(f'{i+1}   Station Name',60,y,730,32,rr(10)+f'fillColor={SOFT if i%2==0 else "#ffffff"};strokeColor=none;fontColor={INK};fontSize=12;align=left;spacingLeft=14;fontFamily=Inter;')
    add(f'{k} km',690,y,90,32,f'text;fontColor={MUTED};fontSize=12;align=right;verticalAlign=middle;fontFamily=Courier New;')
btn('↻  Ladestationen laden',60,834,730)
card(844,568,770,320,'Kartenausschnitt','#ede9fe','🗺️')
add('📍  Kartenansicht Zürich\n47.3769, 8.5417',864,640,730,176,rr(14)+f'fillColor=#ecfdf5;strokeColor=#a7f3d0;dashed=1;dashPattern=4 4;fontColor=#047857;fontSize=14;fontFamily=Inter;')
btn('Karte anzeigen',864,834,730)
# footer
add('© 2026 Bootstrap Frontend · Tiago Cevallos',40,916,1574,36,f'text;fontColor={MUTED};fontSize=11;align=center;fontFamily=Inter;')
# motion notes
add('MOTION SPEC\n\n• Cards: fade + translateY(8px) → 0, 300ms, stagger 50ms\n• Buttons: :active scale(0.97), 160ms ease-out\n• Hover: only on (hover: hover) devices\n• Easing: cubic-bezier(0.23, 1, 0.32, 1)\n• Values: tabular-nums, swap w/ blur + fade 200ms\n• Never animate from scale(0)',40,980,560,150,rr(16)+f'fillColor=#fffbeb;strokeColor=#fde68a;fontColor=#78350f;fontSize=11;align=left;verticalAlign=top;spacingLeft=18;spacingTop=14;fontFamily=Inter;')
out='<mxGraphModel dx="1422" dy="762" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="1169" background="#fafafa" math="0" shadow="0">\n  <root>\n    <mxCell id="0" />\n    <mxCell id="1" parent="0" />\n'+'\n'.join(cells)+'\n  </root>\n</mxGraphModel>\n'
open('wireframe.drawio','w',encoding='utf8').write(out)
