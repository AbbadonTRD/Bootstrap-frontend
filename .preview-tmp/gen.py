import re,json
x=open('wireframe.drawio',encoding='utf8').read()
x=re.sub(r'<!--.*?-->','',x,flags=re.S)
js=r'''
const d=new DOMParser().parseFromString(xml,'text/xml');
const c=document.getElementById('c');
d.querySelectorAll('mxCell[vertex="1"]').forEach(m=>{
 const g=m.querySelector('mxGeometry'),s={};
 (m.getAttribute('style')||'').split(';').forEach(p=>{const[k,v]=p.split('=');if(k)s[k]=v});
 const e=document.createElement('div');
 e.innerHTML=(m.getAttribute('value')||'').replace(/\n/g,'<br>');
 Object.assign(e.style,{position:'absolute',left:g.getAttribute('x')+'px',top:g.getAttribute('y')+'px',width:g.getAttribute('width')+'px',height:g.getAttribute('height')+'px',boxSizing:'border-box',
 background:s.fillColor&&s.fillColor!='none'?s.fillColor:'transparent',color:s.fontColor||'#000',fontSize:(s.fontSize||12)+'px',fontFamily:(s.fontFamily||'Inter')+',system-ui,sans-serif',whiteSpace:'pre-line',lineHeight:1.4,
 border:s.strokeColor&&s.strokeColor!='none'?'1px '+(s.dashed=='1'?'dashed ':'solid ')+s.strokeColor:'none',borderRadius:('ellipse' in s)?'50%':s.rounded=='1'?(s.arcSize||8)+'px':'0',backgroundImage:s.gradientColor?`linear-gradient(90deg,${s.fillColor},${s.gradientColor})`:'none',
 boxShadow:s.shadow=='1'?'0 0 0 1px rgba(0,0,0,.04),0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.06)':'none',fontWeight:(s.fontStyle&1)?'bold':'normal',display:'flex',flexDirection:'column',
 justifyContent:s.verticalAlign=='top'?'flex-start':s.verticalAlign=='bottom'?'flex-end':'center',textAlign:s.align||'center',paddingLeft:(s.spacingLeft||0)+'px',overflow:'hidden',opacity:s.opacity?s.opacity/100:1});
 if(m.getAttribute('style').includes('fontStyle=1;fontFamily=Inter;')&&e.style.height=='40px'){e.style.cursor='pointer';e.style.transition='transform 160ms cubic-bezier(.23,1,.32,1)';e.onmousedown=()=>e.style.transform='scale(.97)';e.onmouseup=e.onmouseleave=()=>e.style.transform='';}
 c.appendChild(e);});
'''
html='<!doctype html><meta charset=utf-8><title>wireframe</title><body style="margin:0;background:#fafafa"><div id=c style="position:relative;width:1700px;height:1180px;background:#fafafa"></div><script>const xml='+json.dumps(x)+';'+js+'</script>'
open('.preview-tmp/wireframe.html','w',encoding='utf8').write(html)
