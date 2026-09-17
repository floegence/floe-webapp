// Isolated design prototype. Released Workbench remains the production interaction owner.
const compositionRoot = $('#composition-world');
const objectToolbar = $('#object-toolbar');
const colors = ['amber','sage','azure','coral','rose','graphite'];
let selectedObject = null;
let editingObject = null;
let objectGesture = null;
let pendingPointer = null;
let pointerFrame = 0;
let treatmentPickerOpen = false;
let canvasPanHeld = false;
let objectSequence = 20;
let objects = [];
const undoStack = [];
const redoStack = [];
const sceneViews = new Map();
const compositionStats = {pointerFrames:0,domBuilds:0};
const toolbarGeometry = {width:0,height:0,viewportWidth:0,viewportHeight:0};

// One canvas-local projection, using model bounds and observer-cached sizes.
// Pointer frames never measure layout or reconstruct the toolbar.
function positionObjectToolbar() {
  const object=objectById(selectedObject);
  if(!object||scene!=='composition')return;
  const {width,height,viewportWidth,viewportHeight}=toolbarGeometry;
  const left=pan.x+object.x*zoom,right=left+object.w*zoom;
  const top=pan.y+object.y*zoom-(object.kind==='region'&&(hasRegionName(object)||editingObject?.id===object.id)?34:0),bottom=pan.y+(object.y+object.h)*zoom;
  const visible=right>0&&left<viewportWidth&&bottom>0&&top<viewportHeight;
  objectToolbar.style.visibility=visible&&width&&height?'visible':'hidden';
  objectToolbar.inert=!visible;
  if(!visible||!width||!height)return;
  const gap=12,margin=12,minY=matchMedia('(max-width:760px)').matches?106:64;
  const maxY=Math.max(minY,viewportHeight-86-height);
  const clamp=(value,min,max)=>Math.max(min,Math.min(value,max));
  const center=(Math.max(0,left)+Math.min(viewportWidth,right))/2;
  let x=clamp(center-width/2,margin,viewportWidth-width-margin),y=top-height-gap,placement='above';
  if(y<minY) {
    if(bottom+gap<=maxY){y=bottom+gap;placement='below';}
    // In a narrow viewport, keep the selected content clear before reserving HUD space.
    else if(y>=margin){placement='above';}
    else if(bottom+gap+height<=viewportHeight-margin){y=bottom+gap;placement='below';}
    else if(right+gap+width<=viewportWidth-margin){x=right+gap;y=clamp(top,minY,maxY);placement='right';}
    else if(left-gap-width>=margin){x=left-gap-width;y=clamp(top,minY,maxY);placement='left';}
    else {y=clamp(y,minY,maxY);placement='edge';}
  } else y=Math.min(y,maxY);
  objectToolbar.dataset.placement=placement;
  objectToolbar.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;
}

const toolbarObserver=new ResizeObserver(entries=>{
  for(const entry of entries) {
    if(entry.target===objectToolbar) {
      const box=entry.borderBoxSize[0];
      toolbarGeometry.width=box.inlineSize;toolbarGeometry.height=box.blockSize;
    } else {
      toolbarGeometry.viewportWidth=entry.contentRect.width;toolbarGeometry.viewportHeight=entry.contentRect.height;
    }
  }
  positionObjectToolbar();
});
toolbarObserver.observe(objectToolbar);
toolbarObserver.observe($('#canvas'));

const compositionDefinitions = [
  {id:'product',kind:'region',x:80,y:320,w:805,h:540,color:'graphite',treatment:'area',nameKey:'regionDesign'},
  {id:'delivery',kind:'region',x:935,y:320,w:505,h:540,color:'azure',treatment:'frame',nameKey:'regionDelivery'},
  {id:'board-title',kind:'text',x:90,y:104,w:1280,h:72,level:'title',align:'left',textKey:'boardTitle'},
  {id:'board-subtitle',kind:'text',x:94,y:200,w:1190,h:38,level:'bodyText',align:'left',textKey:'boardSubtitle'},
  {id:'idea',kind:'sticky',x:111,y:354,w:356,h:216,color:'amber',treatment:'tint',prefix:'noteIdea'},
  {id:'principle',kind:'sticky',x:497,y:354,w:356,h:216,color:'sage',treatment:'tint',prefix:'notePrinciple'},
  {id:'next',kind:'sticky',x:111,y:606,w:356,h:216,color:'azure',treatment:'tab',prefix:'noteNext'},
  {id:'verify',kind:'sticky',x:497,y:606,w:356,h:216,color:'coral',treatment:'tint',prefix:'noteCheck'},
  {id:'question',kind:'sticky',x:965,y:354,w:445,h:216,color:'rose',treatment:'tint',prefix:'noteQuestion'},
  {id:'reference',kind:'sticky',x:965,y:606,w:445,h:216,color:'graphite',treatment:'ruled',prefix:'noteReference'},
];

// A review board uses the same editor and object model as the mixed composition sample.
const regionDefinitions = [
  {id:'field-region',kind:'region',x:80,y:320,w:430,h:470,color:'sage',treatment:'area',nameKey:'regionFieldName'},
  {id:'outline-region',kind:'region',x:550,y:320,w:430,h:470,color:'azure',treatment:'frame',nameKey:'regionFrameName'},
  {id:'blank-region',kind:'region',x:1020,y:320,w:430,h:470,color:'coral',treatment:'hatch',name:''},
  {id:'board-title',kind:'text',x:80,y:104,w:1370,h:72,level:'title',align:'left',textKey:'regionBoardTitle'},
  {id:'board-subtitle',kind:'text',x:84,y:200,w:1370,h:38,level:'bodyText',align:'left',textKey:'regionBoardSubtitle'},
  {id:'field-caption',kind:'text',x:112,y:362,w:366,h:42,level:'headingText',align:'left',textKey:'regionFieldCaption'},
  {id:'field-detail',kind:'text',x:112,y:430,w:366,h:80,level:'bodyText',align:'left',textKey:'regionFieldDetail'},
  {id:'idea',kind:'sticky',x:112,y:551,w:366,h:205,color:'amber',treatment:'tab',prefix:'noteIdea'},
  {id:'outline-caption',kind:'text',x:582,y:362,w:366,h:42,level:'headingText',align:'left',textKey:'regionFrameCaption'},
  {id:'outline-detail',kind:'text',x:582,y:430,w:366,h:80,level:'bodyText',align:'left',textKey:'regionFrameDetail'},
];
const definitions=params.get('sample')==='regions'?regionDefinitions:compositionDefinitions;

document.querySelector('.sprite defs').insertAdjacentHTML('beforeend', [
  ['chevron-down','<path d="m6 9 6 6 6-6"/>'],
  ['region','<path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M3 12h.01M12 3h.01M21 12h.01M12 21h.01"/>'],
  ['text','<path d="M4 5h16M12 5v15M8 20h8M4 5v3m16-3v3"/>'],
  ['edit','<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z"/>'],
  ['copy','<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>'],
  ['trash','<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>'],
  ['undo','<path d="M9 5 3 10l6 5M3 10h11a6 6 0 0 1 0 12"/>'],
  ['redo','<path d="m15 5 6 5-6 5M21 10H10a6 6 0 0 0 0 12"/>'],
  ['left','<path d="M4 5h16M4 10h11M4 15h16M4 20h11"/>'],
  ['center','<path d="M4 5h16M7 10h10M4 15h16M7 20h10"/>'],
].map(([id,paths])=>`<symbol id="i-${id}" viewBox="0 0 24 24">${paths}</symbol>`).join(''));

const objectById = id => objects.find(object=>object.id===id);
const objectNode = id => compositionRoot.querySelector(`[data-object="${id}"]`);
const objectIcon = object => object.kind==='sticky'?'note':object.kind;
const value = (object,field) => object[field] ?? (object[`${field}Key`] ? t(object[`${field}Key`]) : '');
const hasRegionName = object => Boolean(value(object,'name').trim());
const treatmentsFor = object => object.kind==='region'?['area','frame','hatch']:['tint','tab','ruled'];

function initialObjects() {
  return definitions.map(definition=>definition.prefix ? {...definition,titleKey:`${definition.prefix}Title`,bodyKey:`${definition.prefix}Body`} : {...definition});
}

function snapshot() { return {objects:structuredClone(objects),selectedObject}; }
function pushHistory(state) { undoStack.push(state);if(undoStack.length>40)undoStack.shift();redoStack.length=0;updateHistoryButtons(); }
function checkpoint() { pushHistory(snapshot()); }
function updateHistoryButtons() {
  const undo=$('[data-action="undo"]'),redo=$('[data-action="redo"]');
  if(undo)undo.disabled=undoStack.length===0;
  if(redo)redo.disabled=redoStack.length===0;
}
function restoreSnapshot(state) { objects=structuredClone(state.objects);selectedObject=state.selectedObject;renderComposition();renderToolbar(); }
function undo() { finishEditing();if(!undoStack.length)return;redoStack.push(snapshot());restoreSnapshot(undoStack.pop());updateHistoryButtons(); }
function redo() { finishEditing();if(!redoStack.length)return;undoStack.push(snapshot());restoreSnapshot(redoStack.pop());updateHistoryButtons(); }

function stickyMarkup(object,workSample=false) {
  const handle=workSample?'':`<button class="sticky-handle object-move" data-move="${object.id}" title="${t('moveObject',{name:t('sticky')})}" aria-label="${t('moveObject',{name:t('sticky')})}">${icon('grip')}</button>`;
  return `${handle}<div class="sticky-content" ${workSample?'':`data-move="${object.id}"`}><h2 class="sticky-title" ${workSample?'':`data-edit-field="title" data-placeholder="${t('textPlaceholder')}"`}>${escape(value(object,'title'))}</h2><p class="sticky-body" ${workSample?'':`data-edit-field="body" data-placeholder="${t('textPlaceholder')}"`}>${escape(value(object,'body'))}</p></div>`;
}

function regionMarkup(object) {
  return `<div class="region-label" data-move="${object.id}"><span class="region-name" data-edit-field="name" data-placeholder="${t('renameRegion')}">${escape(value(object,'name'))}</span></div><button class="region-grip object-move" data-move="${object.id}" title="${t('moveObject',{name:t('region')})}" aria-label="${t('moveObject',{name:t('region')})}">${icon('grip')}</button>`;
}

function syncRegionName(object) {
  const node=objectNode(object.id);
  node.dataset.named=String(hasRegionName(object));
  node.setAttribute('aria-label',hasRegionName(object)?`${t('region')}: ${value(object,'name')}`:t('unnamedRegion'));
  positionObjectToolbar();
}

function objectMarkup(object) {
  const inner=object.kind==='sticky'?stickyMarkup(object):object.kind==='region'?regionMarkup(object):
    `<div class="free-text-content" data-edit-field="text" data-placeholder="${t('textPlaceholder')}">${escape(value(object,'text'))}</div><button class="text-move object-move" data-move="${object.id}" aria-label="${t('moveObject',{name:t('text')})}">${icon('grip')}</button>`;
  const region=object.kind==='region';
  const name=region?(hasRegionName(object)?`${t('region')}: ${value(object,'name')}`:t('unnamedRegion')):t(object.kind);
  return `<article class="compose-object compose-${object.kind} ${object.kind==='sticky'?'note-surface':region?'region-surface':''}" data-object="${object.id}" data-kind="${object.kind}" data-color="${object.color??'graphite'}" data-treatment="${object.treatment??''}" data-level="${object.level??''}" data-selected="${object.id===selectedObject}" ${region?`data-named="${hasRegionName(object)}" data-move="${object.id}"`:''} tabindex="0" aria-label="${escape(name)}" style="width:${object.w}px;height:${object.h}px;${object.kind==='text'?`min-height:${object.h}px;`:''}transform:translate(${object.x}px,${object.y}px);text-align:${object.align??'left'}">${inner}<span class="selection-box" aria-hidden="true"></span><button class="object-resize" data-resize="${object.id}" aria-label="${t('resizeObject',{name:t(object.kind)})}"></button></article>`;
}

function renderComposition() {
  compositionStats.domBuilds++;
  compositionRoot.innerHTML=objects.map(objectMarkup).join('');
  renderWorkSticky();
  renderDock();
}

function renderWorkSticky() {
  const old=$('#world .note-card');
  const existing=$('#world .work-sticky-strip');
  const note=objectById('idea')??objects.find(object=>object.kind==='sticky');
  if(!note){old?.remove();existing?.remove();return;}
  const strip=document.createElement('div');strip.className='work-sticky-strip';
  strip.innerHTML=`<article class="compose-sticky note-surface" data-color="${note.color}" data-treatment="${note.treatment}">${stickyMarkup(note,true)}</article>`;
  if(existing)existing.replaceWith(strip);else if(old)old.replaceWith(strip);else $('#world').append(strip);
}

function renderDock() {
  $('#composition-dock').innerHTML=[['sticky','note'],['region','region'],['text','text']].map(([kind,glyph])=>`<button data-add="${kind}" title="${t(`add${kind.charAt(0).toUpperCase()+kind.slice(1)}`)}">${icon(glyph)}<span>${t(kind)}</span></button>`).join('')+`<span class="tool-divider"></span><button class="icon-only" data-action="undo" title="${t('undo')}" aria-label="${t('undo')}">${icon('undo')}</button><button class="icon-only" data-action="redo" title="${t('redo')}" aria-label="${t('redo')}">${icon('redo')}</button>`;
  updateHistoryButtons();
}

function toolButton(action,glyph,label=action) { return `<button data-action="${action}" title="${t(label)}" aria-label="${t(label)}">${icon(glyph)}</button>`; }
function optionSelect(id,keys,current,label) {return `<select id="${id}" aria-label="${t(label)}">${keys.map(key=>`<option value="${key}" ${key===current?'selected':''}>${t(key)}</option>`).join('')}</select>`;}

function surfacePreview(kind,color,treatment) {
  if(kind==='region')return `<span class="region-preview-mat"><span class="surface-preview region-preview region-surface" data-color="${color}" data-treatment="${treatment}" aria-hidden="true"><span class="preview-objects"></span></span></span>`;
  return `<span class="surface-preview note-preview note-surface" data-color="${color}" data-treatment="${treatment}" aria-hidden="true"><span class="preview-writing"></span></span>`;
}

function renderPaletteLegend() {
  const selected=objectById(selectedObject);
  const object=selected?.kind==='region'||selected?.kind==='sticky'?selected:{kind:params.get('sample')==='regions'?'region':'sticky',treatment:params.get('sample')==='regions'?'area':'tint'};
  $('#palette-legend').innerHTML=colors.map(color=>`<span title="${t(color)}">${surfacePreview(object.kind,color,object.treatment)}</span>`).join('');
}

function syncToolbarAppearance() {
  const object=objectById(selectedObject);if(!object)return;
  renderPaletteLegend();
  objectToolbar.querySelectorAll('[data-object-color]').forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.objectColor===object.color));
    button.querySelector('.surface-preview').dataset.treatment=object.treatment;
  });
  objectToolbar.querySelectorAll('[data-object-treatment]').forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.objectTreatment===object.treatment));
    button.querySelector('.surface-preview').dataset.color=object.color;
  });
  const trigger=objectToolbar.querySelector('[data-action="treatments"]');
  if(trigger) {
    trigger.querySelector('.surface-preview').dataset.color=object.color;
    trigger.querySelector('.surface-preview').dataset.treatment=object.treatment;
    trigger.querySelector('.treatment-name').textContent=t(object.treatment);
  }
}

function toggleTreatmentPicker(open,focusTrigger=false) {
  treatmentPickerOpen=open;
  const panel=objectToolbar.querySelector('.treatment-panel'),trigger=objectToolbar.querySelector('[data-action="treatments"]');
  if(panel)panel.hidden=!open;
  trigger?.setAttribute('aria-expanded',String(open));
  if(focusTrigger)trigger?.focus();
}

function renderToolbar() {
  const object=objectById(selectedObject);
  objectToolbar.hidden=!object||scene!=='composition';
  renderPaletteLegend();
  updateObjectStatus();
  if(!object)return;
  objectToolbar.dataset.kind=object.kind;
  objectToolbar.setAttribute('aria-label',t('objectTools'));
  if(editingObject) {
    const region=object.kind==='region';
    const fields=object.kind==='sticky'?`<div class="edit-field-options" role="group" aria-label="${t('edit')}">${['title','body'].map(field=>`<button data-edit-target="${field}" aria-pressed="${editingObject.field===field}">${t(field==='title'?'editTitle':'editBody')}</button>`).join('')}</div>`:'';
    objectToolbar.innerHTML=`<div class="toolbar-main">${fields}<span class="editing-caption">${t(region?'regionEditingHint':'editingHint')}</span>${region?`<button class="name-trigger" data-action="clear-region-name">${t('clearRegionName')}</button>`:''}<button class="name-trigger" data-action="edit-style">${t('treatment')}</button><button data-action="done">${t('done')}</button></div>`;
    positionObjectToolbar();return;
  }
  const hasMaterial=object.kind!=='text';
  const palette=hasMaterial?`<div class="color-options" role="group" aria-label="${t('palette')}">${colors.map(color=>`<button class="color-choice" data-object-color="${color}" aria-label="${t(color)}" title="${t(color)}" aria-pressed="${object.color===color}">${surfacePreview(object.kind,color,object.treatment)}${icon('check')}</button>`).join('')}</div><span class="tool-divider"></span>`:'';
  const picker=hasMaterial?`<div id="treatment-panel" class="treatment-panel" role="group" aria-label="${t('treatment')}" ${treatmentPickerOpen?'':'hidden'}><div class="picker-heading">${t('treatment')}<span>${t('treatmentHint')}</span></div><div class="treatment-options">${treatmentsFor(object).map(treatment=>`<button data-object-treatment="${treatment}" aria-pressed="${object.treatment===treatment}">${surfacePreview(object.kind,object.color,treatment)}<span class="treatment-label">${t(treatment)}${icon('check')}</span><small>${t(`${treatment}Description`)}</small></button>`).join('')}</div></div>`:'';
  const style=hasMaterial?`<button class="treatment-trigger" data-action="treatments" aria-label="${t('treatment')}" aria-expanded="${treatmentPickerOpen}" aria-controls="treatment-panel">${surfacePreview(object.kind,object.color,object.treatment)}<span class="treatment-name">${t(object.treatment)}</span>${icon('chevron-down')}</button>`:
    optionSelect('text-level',['title','headingText','bodyText','caption'],object.level,'typography')+`<button data-align="left" aria-label="${t('left')}" aria-pressed="${object.align==='left'}">${icon('left')}</button><button data-align="center" aria-label="${t('center')}" aria-pressed="${object.align==='center'}">${icon('center')}</button>`;
  const edit=object.kind==='region'?`<button class="name-trigger" data-action="edit" title="${t(hasRegionName(object)?'regionTitle':'addRegionName')}">${icon('text')}<span>${t(hasRegionName(object)?'regionTitle':'addRegionName')}</span></button>`:toolButton('edit','edit');
  objectToolbar.innerHTML=`${picker}<div class="toolbar-main">${palette}${style}<span class="tool-divider"></span>${edit}${toolButton('duplicate','copy')}${toolButton('remove','trash')}</div>`;
  positionObjectToolbar();
}

function updateObjectStatus() {
  const object=objectById(selectedObject);
  if(scene!=='composition')return;
  $('#focus-status').textContent=object?t('focus',{name:t(object.kind)}):t('noObject');
  $('#overview-hint').textContent=t(editingObject?(object?.kind==='region'?'regionEditingHint':'editingHint'):object?.kind==='region'?'regionHint':object?'selectedHint':'compositionHint');
}

function selectObject(id) {
  if(editingObject && editingObject.id!==id)finishEditing();
  if(selectedObject===id){updateObjectStatus();return;}
  const previous=objectNode(selectedObject);
  if(previous)previous.dataset.selected='false';
  selectedObject=id;
  treatmentPickerOpen=false;
  const node=objectNode(id);
  if(node)node.dataset.selected='true';
  renderToolbar();
}

function patchObject(object) {
  const node=objectNode(object.id);
  node.style.transform=`translate(${object.x}px,${object.y}px)`;
  node.style.width=`${object.w}px`;node.style.height=`${object.h}px`;
  if(object.kind==='text')node.style.minHeight=`${object.h}px`;
  node.style.textAlign=object.align??'left';
  node.dataset.color=object.color??'graphite';node.dataset.treatment=object.treatment??'';node.dataset.level=object.level??'';
  positionObjectToolbar();
}

function frameEditor(object=objectById(editingObject?.id)) {
  if(!object||object.kind==='region')return false;
  const rect=$('#canvas').getBoundingClientRect();
  zoom=Math.min(.9,(rect.width-70)/object.w);
  pan={x:rect.width/2-(object.x+object.w/2)*zoom,y:rect.height/2-(object.y+object.h/2)*zoom};
  updateTransform();return true;
}

function startEditing(id,field) {
  if(editingObject?.id===id&&editingObject.field===field)return;
  finishEditing();selectObject(id);
  const object=objectById(id);
  if(zoom<=.5)frameEditor(object);
  field=field??(object.kind==='sticky'?'body':object.kind==='region'?'name':'text');
  const node=objectNode(id),editable=node.querySelector(`[data-edit-field="${field}"]`);
  if(!editable)return;
  treatmentPickerOpen=false;
  editingObject={id,field,previous:object[field],initial:value(object,field),before:snapshot()};
  node.dataset.editing='true';editable.setAttribute('contenteditable','plaintext-only');
  editable.setAttribute('role','textbox');editable.setAttribute('aria-label',t(object.kind==='sticky'?(field==='title'?'noteTitleLabel':'noteBodyLabel'):object.kind==='region'?'regionTitle':'freeTextLabel'));
  editable.focus();renderToolbar();
}

function finishEditing(cancel=false) {
  if(!editingObject)return;
  const edit=editingObject,object=objectById(edit.id),node=objectNode(edit.id),editable=node.querySelector(`[data-edit-field="${edit.field}"]`);
  let next=editable.innerText.replaceAll('\r\n','\n');
  if(object.kind==='region')next=next.replace(/\s+/g,' ').trim();
  if(cancel||next===edit.initial) {
    if(edit.previous===undefined)delete object[edit.field];else object[edit.field]=edit.previous;
    editable.textContent=value(object,edit.field);
  } else {
    object[edit.field]=next;
    if(object.kind==='region')editable.textContent=next;
    pushHistory(edit.before);
  }
  editingObject=null;
  editable.removeAttribute('contenteditable');editable.removeAttribute('role');node.dataset.editing='false';
  if(object.kind==='text')object.h=Math.ceil(node.getBoundingClientRect().height/zoom);
  if(object.kind==='region')syncRegionName(object);
  renderToolbar();renderWorkSticky();updateHistoryButtons();
}

function addObject(kind) {
  finishEditing();checkpoint();
  const rect=$('#canvas').getBoundingClientRect();
  const w=kind==='region'?600:kind==='text'?550:356,h=kind==='region'?380:kind==='text'?75:216;
  const object={id:`object-${++objectSequence}`,kind,x:(rect.width/2-pan.x)/zoom-w/2,y:(rect.height/2-pan.y)/zoom-h/2,w,h};
  if(kind==='sticky')Object.assign(object,{color:colors[objects.filter(item=>item.kind==='sticky').length%colors.length],treatment:'tint',title:t('newSticky'),body:t('newBody')});
  if(kind==='text')Object.assign(object,{level:'headingText',align:'left',text:t('newText')});
  if(kind==='region')Object.assign(object,{color:colors[objects.filter(item=>item.kind==='region').length%colors.length],treatment:'area',name:''});
  objects.push(object);compositionRoot.insertAdjacentHTML('beforeend',objectMarkup(object));
  selectObject(object.id);updateHistoryButtons();
}

function deleteObject() {
  if(!selectedObject)return;
  finishEditing();checkpoint();
  objectNode(selectedObject)?.remove();objects=objects.filter(object=>object.id!==selectedObject);selectedObject=null;
  renderToolbar();renderWorkSticky();updateHistoryButtons();
}

function duplicateObject() {
  const object=objectById(selectedObject);if(!object)return;
  checkpoint();const copy={...structuredClone(object),id:`object-${++objectSequence}`,x:object.x+28/zoom,y:object.y+28/zoom};
  objects.push(copy);compositionRoot.insertAdjacentHTML('beforeend',objectMarkup(copy));selectObject(copy.id);updateHistoryButtons();
}

function setScene(next,initial=false) {
  finishEditing();
  if(!initial)sceneViews.set(scene,{zoom,pan:{...pan}});
  scene=next;root.dataset.scene=scene;
  $('#world').hidden=scene!=='work';compositionRoot.hidden=scene!=='composition';
  $('#composition-dock').hidden=scene!=='composition';$('#dock').hidden=scene!=='work';
  document.querySelectorAll('[data-scene]').forEach(button=>{if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.scene===scene));});
  $('.canvas-help span:last-child').textContent=t(scene==='composition'?'compositionHelp':'workHelp');
  const stored=sceneViews.get(scene);
  if(stored&&!initial){zoom=stored.zoom;pan={...stored.pan};updateTransform();}else fit(params.get('zoom')==='35'?.35:undefined);
  renderToolbar();if(scene==='work')applyActive(false);updateURL();
}

function paintPointer() {
  pointerFrame=0;
  if(!objectGesture||!pendingPointer)return;
  const gesture=objectGesture,point=pendingPointer;
  pendingPointer=null;
  const dx=point.x-gesture.startX,dy=point.y-gesture.startY;
  if(!gesture.started && Math.hypot(dx,dy)<3)return;
  if(!gesture.started) {
    if(gesture.kind!=='pan')checkpoint();
    gesture.started=true;
    if(gesture.node)gesture.node.dataset.dragging='true';
    objectToolbar.dataset.moving='true';
  }
  compositionStats.pointerFrames++;
  if(gesture.kind==='pan') {
    pan={x:gesture.x+dx,y:gesture.y+dy};
    const transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
    compositionRoot.style.transform=transform;$('#world').style.transform=transform;
  } else if(gesture.kind==='move') {
    gesture.object.x=gesture.x+dx/zoom;gesture.object.y=gesture.y+dy/zoom;
    gesture.node.style.transform=`translate(${gesture.object.x}px,${gesture.object.y}px)`;
  } else {
    const minimumWidth=gesture.object.kind==='region'?180:gesture.object.kind==='sticky'?240:150;
    const minimumHeight=gesture.object.kind==='region'?150:gesture.object.kind==='sticky'?160:36;
    gesture.object.w=Math.max(minimumWidth,gesture.w+dx/zoom);gesture.object.h=Math.max(minimumHeight,gesture.h+dy/zoom);
    gesture.node.style.width=`${gesture.object.w}px`;gesture.node.style.height=`${gesture.object.h}px`;
    if(gesture.object.kind==='text')gesture.node.style.minHeight=`${gesture.object.h}px`;
  }
  positionObjectToolbar();
}

function finishGesture() {
  if(pointerFrame){cancelAnimationFrame(pointerFrame);pointerFrame=0;}
  paintPointer();
  if(objectGesture?.node)objectGesture.node.dataset.dragging='false';
  if(objectGesture?.kind==='pan'&&!objectGesture.started&&!objectGesture.explicitPan)selectObject(null);
  objectToolbar.dataset.moving='false';
  objectGesture=null;pendingPointer=null;
}

$('#canvas').addEventListener('pointerdown',event=>{
  if(scene!=='composition'||![0,1].includes(event.button))return;
  if(event.target.closest('.object-toolbar,.composition-dock,.zoom-toolbar'))return;
  if(canvasPanHeld||event.button===1) {
    finishEditing();toggleTreatmentPicker(false);
    objectGesture={kind:'pan',explicitPan:true,x:pan.x,y:pan.y,startX:event.clientX,startY:event.clientY,started:false};
    $('#canvas').setPointerCapture(event.pointerId);event.preventDefault();return;
  }
  const move=event.target.closest('[data-move]'),resize=event.target.closest('[data-resize]');
  if(event.target.closest('[contenteditable]'))return;
  if(!move&&!resize&&event.target.closest('button,select,.object-toolbar,.composition-dock,.zoom-toolbar'))return;
  const objectElement=event.target.closest('[data-object]');
  const field=event.target.closest('[data-edit-field]');
  if(objectElement&&field) {
    // Activate before the browser's native pointer selection so the first click can type.
    const previousZoom=zoom;
    const caret=zoom<=.5&&objectElement.dataset.kind!=='region'?document.caretRangeFromPoint(event.clientX,event.clientY):null;
    startEditing(objectElement.dataset.object,field.dataset.editField);
    if(zoom!==previousZoom) {
      event.preventDefault();
      if(caret&&field.contains(caret.startContainer)){const selection=getSelection();selection.removeAllRanges();selection.addRange(caret);}
    }
    return;
  }
  if(objectElement && !move && !resize){selectObject(objectElement.dataset.object);return;}
  if(move||resize) {
    finishEditing();const id=move?.dataset.move??resize.dataset.resize;selectObject(id);
    const object=objectById(id);
    objectNode(id).focus({preventScroll:true});
    objectGesture={kind:resize?'resize':'move',object,node:objectNode(id),x:object.x,y:object.y,w:object.w,h:object.h,startX:event.clientX,startY:event.clientY,started:false};
  } else {
    finishEditing();toggleTreatmentPicker(false);
    objectGesture={kind:'pan',x:pan.x,y:pan.y,startX:event.clientX,startY:event.clientY,started:false};
  }
  $('#canvas').setPointerCapture(event.pointerId);event.preventDefault();
});
$('#canvas').addEventListener('pointermove',event=>{
  if(!objectGesture)return;pendingPointer={x:event.clientX,y:event.clientY};
  if(!pointerFrame)pointerFrame=requestAnimationFrame(paintPointer);
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('#canvas').addEventListener(type,finishGesture);

compositionRoot.addEventListener('input',event=>{
  if(!editingObject)return;
  const field=event.target.closest('[data-edit-field]');
  if(field)objectById(editingObject.id)[editingObject.field]=field.innerText;
});
compositionRoot.addEventListener('focusin',event=>{
  const node=event.target.closest('[data-object]');
  if(node&&!editingObject)selectObject(node.dataset.object);
});
compositionRoot.addEventListener('focusout',event=>{
  if(editingObject&&event.target.closest('[data-object]')?.dataset.object===editingObject.id&&event.target.dataset.editField===editingObject.field&&!event.relatedTarget?.closest('.object-toolbar'))finishEditing();
});
document.addEventListener('pointerdown',event=>{if(treatmentPickerOpen&&!event.target.closest('.object-toolbar'))toggleTreatmentPicker(false);});
objectToolbar.addEventListener('pointerdown',event=>{if(editingObject&&event.target.closest('button'))event.preventDefault();});

document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.scene){setScene(button.dataset.scene);return;}
  if(button.dataset.add){addObject(button.dataset.add);return;}
  if(button.dataset.objectColor) {
    const object=objectById(selectedObject);if(object.color===button.dataset.objectColor)return;
    checkpoint();object.color=button.dataset.objectColor;patchObject(object);
    syncToolbarAppearance();if(object.kind==='sticky')renderWorkSticky();return;
  }
  if(button.dataset.objectTreatment) {
    const object=objectById(selectedObject);if(object.treatment===button.dataset.objectTreatment)return;
    checkpoint();object.treatment=button.dataset.objectTreatment;patchObject(object);syncToolbarAppearance();if(object.kind==='sticky')renderWorkSticky();return;
  }
  if(button.dataset.align) {
    const object=objectById(selectedObject);checkpoint();object.align=button.dataset.align;patchObject(object);
    objectToolbar.querySelectorAll('[data-align]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.align===object.align)));return;
  }
  if(button.dataset.editTarget){startEditing(selectedObject,button.dataset.editTarget);return;}
  const action=button.dataset.action;
  if(action==='edit-style'){finishEditing();if(objectById(selectedObject).kind!=='text')toggleTreatmentPicker(true);}
  if(action==='treatments')toggleTreatmentPicker(!treatmentPickerOpen);
  if(action==='edit')startEditing(selectedObject);
  if(action==='done')finishEditing();
  if(action==='clear-region-name'&&editingObject&&objectById(editingObject.id).kind==='region') {
    objectNode(editingObject.id).querySelector('[data-edit-field="name"]').textContent='';
    finishEditing();
  }
  if(action==='duplicate')duplicateObject();
  if(action==='remove')deleteObject();
  if(action==='undo')undo();
  if(action==='redo')redo();
  if(button.id==='reset'&&scene==='composition') {finishEditing();checkpoint();objects=initialObjects();selectedObject=null;renderComposition();renderToolbar();fit();}
});
objectToolbar.addEventListener('change',event=>{
  const object=objectById(selectedObject);if(!object)return;
  checkpoint();
  if(event.target.id==='text-level')object.level=event.target.value;
  patchObject(object);renderWorkSticky();
});
document.addEventListener('keydown',event=>{
  if(scene!=='composition'||event.isComposing)return;
  if(editingObject) {
    if(event.key==='Escape'){event.preventDefault();finishEditing(true);}
    if(event.key==='Enter'&&(event.metaKey||event.ctrlKey||objectById(editingObject.id).kind==='region')){event.preventDefault();finishEditing();}
    return;
  }
  if(event.target.closest('input,select,textarea,[contenteditable]'))return;
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();return;}
  if(event.key==='Escape'){if(treatmentPickerOpen)toggleTreatmentPicker(false,true);else selectObject(null);return;}
  if(event.target.closest('.object-toolbar,.composition-dock,button:not([data-move])'))return;
  if(event.code==='Space'){event.preventDefault();canvasPanHeld=true;$('#canvas').dataset.panHeld='true';return;}
  const focusedNode=event.target.closest('[data-object]');
  if(focusedNode&&event.key==='Enter'){event.preventDefault();selectObject(focusedNode.dataset.object);if(event.key==='Enter')startEditing(selectedObject);return;}
  const object=objectById(selectedObject);if(!object)return;
  if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();deleteObject();return;}
  if(event.key==='Enter'){event.preventDefault();startEditing(selectedObject);return;}
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||event.target.closest('.object-toolbar'))return;
  event.preventDefault();if(!event.repeat)checkpoint();
  const step=(event.shiftKey?20:2)/zoom;
  if(event.key==='ArrowLeft')object.x-=step;
  if(event.key==='ArrowRight')object.x+=step;
  if(event.key==='ArrowUp')object.y-=step;
  if(event.key==='ArrowDown')object.y+=step;
  patchObject(object);
});

function releasePanKey() {canvasPanHeld=false;$('#canvas').dataset.panHeld='false';}
document.addEventListener('keyup',event=>{if(event.code==='Space')releasePanKey();});
window.addEventListener('blur',()=>{releasePanKey();finishGesture();});

let compositionLocale=locale;
document.addEventListener('demo-theme-change',()=>{
  // Palette changes are CSS-only. Content DOM changes only when its language changes.
  if(compositionLocale!==locale){finishEditing();compositionLocale=locale;renderComposition();renderToolbar();}
  renderWorkSticky();
  renderPaletteLegend();
  $('.canvas-help span:last-child').textContent=t(scene==='composition'?'compositionHelp':'workHelp');
  updateObjectStatus();
});

objects=initialObjects();
window.refreshWorkSample=renderWorkSticky;
window.positionObjectToolbar=positionObjectToolbar;
window.frameActiveEditor=()=>editingObject?frameEditor():false;
window.compositionDemo={
  bounds:()=>({left:Math.min(80,...objects.map(o=>o.x)),top:Math.min(100,...objects.map(o=>o.y)),right:Math.max(1440,...objects.map(o=>o.x+o.w)),bottom:Math.max(860,...objects.map(o=>o.y+o.h))}),
  state:()=>({selectedObject,editing:editingObject?{id:editingObject.id,field:editingObject.field}:null,objects:structuredClone(objects),undo:undoStack.length,redo:redoStack.length,stats:{...compositionStats},pendingFrame:Boolean(pointerFrame)}),
};
renderComposition();
renderPaletteLegend();
setScene(scene,true);
if(scene==='composition'&&objectById(params.get('object'))) {
  selectObject(params.get('object'));
  if(params.get('tools')==='style'&&objectById(selectedObject).kind!=='text')toggleTreatmentPicker(true);
}
