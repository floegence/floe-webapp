// Review-only framing. The frozen reference renderer and styles remain unchanged.
const reviewStyle=document.createElement('style');
reviewStyle.textContent='.preview-footer,.study-header,.inspector,.preview-toolbar,.canvas-caption,.canvas-help,.composition-dock,.zoom-toolbar{display:none!important}.study-layout{display:block;height:100dvh;min-height:0}.preview{height:100dvh}.workbench-surface{height:100dvh}';
document.head.append(reviewStyle);
function reviewFrame() {
  const target=objectById(params.get('object'));
  const scale=Number(params.get('scale')||'0.8');
  zoom=scale;
  if(target) pan={x:innerWidth/2-(target.x+target.w/2)*scale,y:Math.max(260,innerHeight/2-target.h*scale/2)-target.y*scale};
  else fit(scale);
  updateTransform();
  if(target){selectObject(target.id);treatmentPickerOpen=params.get('tools')==='style';renderToolbar();}
}
requestAnimationFrame(()=>requestAnimationFrame(reviewFrame));
window.addEventListener('resize',reviewFrame);
