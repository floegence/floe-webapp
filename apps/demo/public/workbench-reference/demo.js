const root = document.documentElement;
const $ = (selector) => document.querySelector(selector);
const themes = window.DEMO_THEMES;
const params = new URLSearchParams(location.search);
let locale = params.get('lang') === 'en-US' ? 'en-US' : 'zh-CN';
let theme = themes.find((item) => item.name === params.get('theme')) ?? themes.find((item) => item.name === 'slate');
let design = params.get('design') === 'baseline' ? 'baseline' : 'proposed';
let material = ['default','vibrancy','mica','midnight','aurora','terminal'].includes(params.get('material')) ? params.get('material') : 'default';
let zoom = .65;
let pan = {x:0,y:0};
let active = 'terminal';
let stack = 3;
let dragging = null;
let scene = params.get('scene') === 'work' ? 'work' : 'composition';
const rememberedThemes = {light:'paper',dark:theme.mode === 'dark' ? theme.name : 'forest'};
const windows = [
  {id:'terminal',icon:'terminal',x:100,y:150,w:690,h:420,z:3,status:'terminalStatus'},
  {id:'monitoring',icon:'pulse',x:850,y:160,w:550,h:408,z:1,status:'monitorStatus'},
  {id:'files',icon:'folder',x:620,y:605,w:665,h:312,z:2,status:'filesStatus'},
];
const initial = windows.map((item) => ({...item}));
const t = (key,values = {}) => Object.entries(values).reduce((text,[name,value]) => text.replaceAll(`{${name}}`,value),window.DEMO_COPY[locale][key] ?? key);
const icon = (id,extra='') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const escape = (text) => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

function terminalContent() {
  return `<div class="terminal-layout"><aside class="session-rail"><span class="eyebrow">${t('sessions')}</span><div class="session-row selected-session">${icon('terminal')}<div>redeven<small>~/code/redeven</small></div></div><div class="session-row">${icon('terminal')}<div>Default<small>~ / home</small></div></div></aside><div class="terminal-main"><div class="terminal-tab">${icon('terminal')} <span>zsh</span><span>${t('connected')}</span></div><pre class="terminal-code"><span class="code-success">➜</span> <span class="code-accent">redeven</span> <span class="code-muted">git:(</span>main<span class="code-muted">)</span> pnpm dev

<span class="code-success">  VITE</span> <span class="code-muted">ready in</span> 284 ms

  <span class="code-success">➜</span>  <b>Local:</b>   <span class="code-accent">http://localhost:5173/</span>
  <span class="code-success">➜</span>  <span class="code-muted">press</span> h <span class="code-muted">+ enter to show help</span>

<span class="code-muted">14:32:06</span> <span class="code-success">[vite]</span> page reload src/App.tsx
<span class="code-muted">14:32:08</span> <span class="code-success">[vite]</span> hmr update /src/styles.css

<span class="code-success">➜</span> <span class="code-accent">redeven</span> <span class="cursor"></span></pre><div class="terminal-bottom"><span>zsh · UTF-8</span><span>120 × 32</span></div></div></div>`;
}

function chart(memory=false) {
  const points = memory ? '0,42 10,40 19,25 27,34 36,15 46,35 57,25 68,44 80,41 91,37 103,42 115,43 126,29 139,34 150,24 162,29 172,8 179,35 190,39 204,36' : '0,43 12,43 23,40 34,43 45,42 57,26 68,21 80,35 92,31 102,42 112,39 123,43 134,35 146,36 158,42 171,42 183,38 195,39 204,37';
  return `<svg viewBox="0 0 204 60" preserveAspectRatio="none" class="chart ${memory?'memory-chart':''}" aria-hidden="true"><path class="chart-grid" d="M0 15H204M0 32H204M0 49H204"/><polygon class="chart-fill" points="0,60 ${points} 204,60"/><polyline class="chart-line" points="${points}"/></svg><div class="chart-time"><span>14:31:30</span><span>14:32:00</span><span>14:32:30</span></div>`;
}

function metricsContent() {
  return `<div class="metrics-content"><div class="metrics-grid"><section class="metric-card"><div class="metric-label"><span>${t('cpu')}</span><span class="live"><i class="status-dot"></i>${t('live')}</span></div><div class="metric-value">24.6<small>%</small></div>${chart()}</section><section class="metric-card"><div class="metric-label"><span>${t('memory')}</span><span class="live"><i class="status-dot"></i>${t('live')}</span></div><div class="metric-value">8.4<small>/ 32 GB</small></div>${chart(true)}</section></div><div class="process-heading"><span>${t('processes')}</span><small>8 cores · macOS</small></div><table><thead><tr><th>${t('pid')}</th><th>${t('process')}</th><th class="number">CPU</th><th class="number">${t('memory')}</th></tr></thead><tbody>${[['18415','redeven','24.6','481 MB'],['8799','VirtualMachine','12.3','1.7 GB'],['82150','Renderer','8.1','326 MB'],['2787','WindowServer','3.2','94 MB']].map(([pid,name,cpu,mem])=>`<tr><td class="code-muted">${pid}</td><td>${name}</td><td class="number"><span class="mini-meter" style="--meter:${Number(cpu)*3}%"><i></i></span>${cpu}%</td><td class="number code-muted">${mem}</td></tr>`).join('')}</tbody></table></div>`;
}

function filesContent() {
  return `<div class="files-layout"><aside class="file-rail"><div class="tree-row current">${icon('folder')} redeven</div>${['src','public','scripts','assets'].map((name)=>`<div class="tree-row indent">${icon('folder')} ${name}</div>`).join('')}<div class="tree-row">${icon('folder')} floegence</div></aside><div class="file-main"><div class="file-path">${icon('folder')}<span>redeven</span>${icon('chevron')}<strong>src</strong><span class="file-count">${t('items')}</span></div><table><thead><tr><th>${t('name')}</th><th>${t('modified')}</th><th class="number">${t('size')}</th></tr></thead><tbody>${[['components','folder','—'],['hooks','folder','—'],['styles','folder','—'],['App.tsx','code','4.2 KB'],['index.tsx','code','1.8 KB'],['env.d.ts','file','0.4 KB']].map(([name,kind,size])=>`<tr><td><span class="file-name">${icon(kind,kind==='folder'?'folder':'')} ${name}</span></td><td class="code-muted">${t('ago')}</td><td class="number code-muted">${size}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function drawWindows() {
  $('#world').innerHTML = windows.map((item)=>`<div class="window-frame" data-window="${item.id}" style="left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;z-index:${item.z}" ${item.minimized?'hidden':''}><span class="overview-label">${icon(item.icon)} ${t(item.id)} <small>${t(item.status)}</small></span><article class="workbench-widget" aria-label="${t(item.id)}"><div class="workbench-widget__header" tabindex="0" aria-label="${t('move',{name:t(item.id)})}">${icon('grip','grip')}${icon(item.icon,'window-symbol')}<span class="workbench-widget__title">${t(item.id)}</span><span class="title-spacer"></span><span class="active-word">${t('selected')}</span><button class="window-action" data-minimize="${item.id}" aria-label="${t('minimize',{name:t(item.id)})}">−</button><button class="window-action" data-focus-window="${item.id}" aria-label="${t('maximize',{name:t(item.id)})}">${icon('fit')}</button></div><div class="window-body">${item.id==='terminal'?terminalContent():item.id==='monitoring'?metricsContent():filesContent()}</div></article></div>`).join('') + `<aside class="note-card" data-note><span class="eyebrow">WORKSPACE NOTES</span><h2>${t('noteTitle')}</h2><p>${t('noteBody')}</p><div class="note-list">${['noteOne','noteTwo','noteThree'].map((key)=>`<span>${icon('check')}${t(key)}</span>`).join('')}</div></aside>`;
  $('#dock').innerHTML = [...windows.map((item)=>({id:item.id,icon:item.icon})),{id:'notes',icon:'note'}].map((item)=>`<button class="dock-button" data-window="${item.id}" aria-label="${t('restore',{name:t(item.id)})}" title="${t(item.id)}">${icon(item.icon)}</button>`).join('');
  applyActive(false);
  window.refreshWorkSample?.();
}

function applyActive(raise=true) {
  const selected = windows.find((item)=>item.id===active);
  if (selected && raise) selected.z=++stack;
  for (const item of windows) {
    const frame=$(`.window-frame[data-window="${item.id}"]`);
    frame.dataset.active=String(item.id===active);
    frame.style.zIndex=item.z;
    frame.querySelector('.workbench-widget').classList.toggle('is-selected',item.id===active);
    const dock=$(`.dock-button[data-window="${item.id}"]`);
    dock.setAttribute('aria-pressed',String(item.id===active));
    dock.dataset.minimized=String(Boolean(item.minimized));
  }
  $('#focus-status').textContent=active?t('focus',{name:t(active)}):t('noFocus');
}

function updateTransform() {
  window.positionObjectToolbar?.();
  const transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
  $('#world').style.transform=transform;
  $('#composition-world').style.transform=transform;
  if (root.style.getPropertyValue('--scale') !== String(zoom)) {
    root.style.setProperty('--scale',zoom);
    root.style.setProperty('--inverse-scale',1/zoom);
  }
  root.dataset.overview=String(zoom<=.5);
  root.dataset.mini=String(zoom<=.3);
  $('#zoom-value').textContent=`${Math.round(zoom*100)}%`;
  $('#overview').setAttribute('aria-pressed',String(Math.abs(zoom-.35)<.005));
  $('#zoom-out').disabled=zoom<=.25;
  $('#zoom-in').disabled=zoom>=1.25;
  $('#overview-hint').textContent=t(scene==='composition'?'compositionHint':zoom<=.5&&design==='proposed'?'overviewHint':'footerHint');
}

function contentBounds() {
  if(scene==='composition' && window.compositionDemo) return window.compositionDemo.bounds();
  const visible=windows.filter((item)=>!item.minimized);
  return {left:Math.min(100,...visible.map((item)=>item.x)),top:Math.min(150,...visible.map((item)=>item.y)),right:Math.max(495,...visible.map((item)=>item.x+item.w)),bottom:Math.max(865,...visible.map((item)=>item.y+item.h))};
}

function fit(value) {
  const bounds=contentBounds();
  const rect=$('#canvas').getBoundingClientRect();
  const width=bounds.right-bounds.left, height=bounds.bottom-bounds.top;
  zoom=value ?? Math.max(.25,Math.min(.85,(rect.width-100)/width,(rect.height-(scene==='composition'?245:205))/height));
  pan={x:(rect.width-width*zoom)/2-bounds.left*zoom,y:(scene==='composition'?128:88)+Math.max(0,(rect.height-(scene==='composition'?245:205)-height*zoom)/2)-bounds.top*zoom};
  updateTransform();
}

function setZoom(value,point) {
  value=Math.max(.25,Math.min(1.25,value));
  const rect=$('#canvas').getBoundingClientRect();
  const anchor=point??{x:rect.width/2,y:rect.height/2};
  const ratio=value/zoom;
  pan={x:anchor.x-(anchor.x-pan.x)*ratio,y:anchor.y-(anchor.y-pan.y)*ratio};
  zoom=value;
  updateTransform();
}

function themeGrid() {
  $('#theme-grid').innerHTML=themes.filter((item)=>item.mode===theme.mode).map((item)=>`<button class="theme-choice" data-theme="${item.name}" aria-label="${escape(item.displayName)}" aria-pressed="${item.name===theme.name}"><span class="theme-chip" style="--chip-canvas:${item.tokens['--background']};--chip-window:${item.tokens['--card']};--chip-accent:${item.tokens['--primary']}"></span><span class="theme-label">${escape(item.displayName)}</span>${item.name===theme.name?icon('check'):''}</button>`).join('');
  document.querySelectorAll('[data-mode]').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.mode===theme.mode)));
}

function updateSwatches() {
  const canvasStyle=getComputedStyle($('#canvas'));
  const widgetStyle=getComputedStyle($('.window-body'));
  const titleStyle=getComputedStyle($('.workbench-widget__header'));
  $('#swatch-canvas').style.background=canvasStyle.background;
  $('#swatch-window').style.background=widgetStyle.background;
  $('#swatch-header').style.background=titleStyle.background;
  $('#layer-mode').textContent=t(theme.mode);
  $('#layer-explanation').textContent=t(design==='baseline'?'baselineLayers':theme.name==='hc-light'?'hcLayers':theme.mode==='dark'?'darkLayers':'lightLayers');
}

function applyTheme() {
  root.classList.toggle('dark',theme.mode==='dark');
  root.dataset.floeShellTheme=theme.name;
  root.dataset.design=design;
  for (const [key,value] of Object.entries(theme.tokens)) root.style.setProperty(key,value);
  $('#surface').dataset.workbenchTheme=material;
  $('#material').value=material;
  $('#preview-theme-name').textContent=`${theme.displayName}${material==='default'?'':` / ${material.charAt(0).toUpperCase()+material.slice(1)}`}`;
  $('#preview-design-name').textContent=t(design==='proposed'?'proposedLabel':'baselineLabel');
  document.querySelectorAll('[data-design-choice]').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.designChoice===design)));
  themeGrid();
  updateSwatches();
  updateTransform();
  updateURL();
  document.dispatchEvent(new CustomEvent('demo-theme-change'));
}

function updateURL() {
  const url=new URL(location.href);
  url.searchParams.set('theme',theme.name);
  url.searchParams.set('design',design);
  url.searchParams.set('material',material);
  url.searchParams.set('lang',locale);
  url.searchParams.set('scene',scene);
  history.replaceState(null,'',url);
}

function localize() {
  root.lang=locale;
  document.querySelectorAll('[data-i18n]').forEach((node)=>node.textContent=t(node.dataset.i18n));
  document.querySelectorAll('[data-title]').forEach((node)=>{node.title=t(node.dataset.title);node.setAttribute('aria-label',t(node.dataset.title));});
  $('#language').textContent=locale==='zh-CN'?'English':'中文';
  drawWindows();
  applyTheme();
}

document.addEventListener('click',(event)=>{
  const button=event.target.closest('button');
  if (!button) return;
  if (button.dataset.theme) { theme=themes.find((item)=>item.name===button.dataset.theme); rememberedThemes[theme.mode]=theme.name;applyTheme(); }
  if (button.dataset.mode) { rememberedThemes[theme.mode]=theme.name;theme=themes.find((item)=>item.name===rememberedThemes[button.dataset.mode]);applyTheme(); }
  if (button.dataset.designChoice) { design=button.dataset.designChoice;applyTheme(); }
  if (scene==='composition' && button.id==='reset') return;
  if (button.dataset.minimize) { const item=windows.find((item)=>item.id===button.dataset.minimize);item.minimized=true;if (active===item.id) active=null;drawWindows(); }
  if (button.dataset.focusWindow) { const item=windows.find((item)=>item.id===button.dataset.focusWindow);const rect=$('#canvas').getBoundingClientRect();active=item.id;zoom=Math.min(1,(rect.width-90)/item.w,(rect.height-170)/item.h);pan={x:rect.width/2-(item.x+item.w/2)*zoom,y:rect.height/2-(item.y+item.h/2)*zoom};applyActive();updateTransform(); }
  if (button.closest('#dock')) {
    const item=windows.find((item)=>item.id===button.dataset.window);
    if (item) { item.minimized=false;active=item.id;drawWindows();applyActive();fit(); }
    else { const rect=$('#canvas').getBoundingClientRect();zoom=Math.min(.9,(rect.width-80)/375);pan={x:rect.width/2-307.5*zoom,y:rect.height/2-730*zoom};active=null;applyActive();updateTransform(); }
  }
});

$('#material').addEventListener('change',(event)=>{material=event.target.value;applyTheme();});
$('#language').addEventListener('click',()=>{locale=locale==='zh-CN'?'en-US':'zh-CN';localize();});
$('#zoom-out').addEventListener('click',()=>setZoom(zoom-.1));
$('#zoom-in').addEventListener('click',()=>setZoom(zoom+.1));
$('#zoom-value').addEventListener('click',()=>fit(zoom>.5?.35:1));
$('#overview').addEventListener('click',()=>fit(.35));
$('#fit').addEventListener('click',()=>fit());
$('#reset').addEventListener('click',()=>{if(scene==='composition')return;windows.forEach((item,index)=>{Object.assign(item,initial[index]);item.minimized=false;});active='terminal';stack=3;drawWindows();fit();});

$('#canvas').addEventListener('pointerdown',(event)=>{
  if (scene==='composition') return;
  if (event.button!==0||event.target.closest('button,select,.zoom-toolbar,.demo-dock')) return;
  const frame=event.target.closest('.window-frame');
  if (frame) {
    active=frame.dataset.window;applyActive();
    if (!event.target.closest('.workbench-widget__header')) return;
    const item=windows.find((item)=>item.id===active);
    dragging={kind:'window',item,frame,startX:event.clientX,startY:event.clientY,x:item.x,y:item.y};
  } else {
    if (event.target.closest('.note-card')) return;
    active=null;applyActive(false);
    dragging={kind:'canvas',startX:event.clientX,startY:event.clientY,x:pan.x,y:pan.y};
  }
  $('#canvas').setPointerCapture(event.pointerId);
  event.preventDefault();
});
$('#canvas').addEventListener('pointermove',(event)=>{
  if (!dragging) return;
  const dx=event.clientX-dragging.startX,dy=event.clientY-dragging.startY;
  if (dragging.kind==='window') {
    dragging.item.x=dragging.x+dx/zoom;dragging.item.y=dragging.y+dy/zoom;
    dragging.frame.style.transform=`translate(${dx/zoom}px,${dy/zoom}px)`;
  } else { pan={x:dragging.x+dx,y:dragging.y+dy};updateTransform(); }
});
function endDrag(){if(dragging?.kind==='window'){dragging.frame.style.left=`${dragging.item.x}px`;dragging.frame.style.top=`${dragging.item.y}px`;dragging.frame.style.transform='';}dragging=null;}
$('#canvas').addEventListener('pointerup',endDrag);
$('#canvas').addEventListener('pointercancel',endDrag);
$('#canvas').addEventListener('lostpointercapture',endDrag);
$('#canvas').addEventListener('wheel',(event)=>{
  if (event.target.closest('.zoom-toolbar,.demo-dock,.object-toolbar,.composition-dock')) return;
  if(scene==='composition' && event.target.closest('[data-object][data-selected="true"]:not([data-kind="region"])')){event.preventDefault();return;}
  const frame=event.target.closest('.window-frame');
  event.preventDefault();
  // Selected sample content never sends wheel input to the canvas.
  if (frame?.dataset.window===active) return;
  const rect=$('#canvas').getBoundingClientRect();
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?rect.height:1);
  setZoom(zoom*Math.exp(-delta*.002),{x:event.clientX-rect.left,y:event.clientY-rect.top});
},{passive:false});
document.addEventListener('keydown',(event)=>{
  const header=event.target.closest('.workbench-widget__header');
  if (!header||event.target.closest('button')) return;
  if (event.key==='Enter'||event.key===' ') { active=header.closest('.window-frame').dataset.window;applyActive();event.preventDefault();return; }
  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
  active=header.closest('.window-frame').dataset.window;
  const item=windows.find((item)=>item.id===active),step=(event.shiftKey?30:10)/zoom;
  if(event.key==='ArrowLeft')item.x-=step;
  if(event.key==='ArrowRight')item.x+=step;
  if(event.key==='ArrowUp')item.y-=step;
  if(event.key==='ArrowDown')item.y+=step;
  const frame=header.closest('.window-frame');frame.style.left=`${item.x}px`;frame.style.top=`${item.y}px`;
  applyActive();event.preventDefault();
});
let lastSize;
let firstResize=true;
new ResizeObserver(([entry])=>{const size=`${entry.contentRect.width},${entry.contentRect.height}`;if(size!==lastSize){lastSize=size;if(!window.frameActiveEditor?.())fit(firstResize&&params.get('zoom')==='35'?.35:undefined);firstResize=false;}}).observe($('#canvas'));
localize();
fit(params.get('zoom')==='35'?.35:undefined);
window.demoState=()=>({scene,theme:theme.name,mode:theme.mode,design,material,zoom,pan:{...pan},active,windows:windows.map((item)=>({...item}))});
