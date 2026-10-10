import '@google/model-viewer';
const projectNames={'dr-neil':'Dr. Neil'};
const friendlyName=s=>projectNames[s]||s.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
export async function mountViewer(app,slug){
  const title=friendlyName(slug);
  document.title=title+' — Zurich 3D Showcase';
  document.body.classList.add('viewer-page');
  app.innerHTML='<main class="showcase"><header class="showcase-header"><a href="/" class="showcase-home" aria-label="Zurich Construction — home"><img src="/zurich-logo.webp" alt="Zurich" width="1721" height="420"></a><span class="header-label">3D SHOWCASE</span></header><section class="showcase-body" aria-label="3D project presentation"><div class="project-heading"><p class="eyebrow">PROJECT PRESENTATION</p><h1 id="project-title"></h1></div><div class="viewer-shell" id="viewer-shell"><div class="loading-area" id="viewer-status" role="status" aria-live="polite"><span class="load-indicator" aria-hidden="true"></span><span>Checking presentation…</span></div></div></section><footer class="showcase-footer"><span>ZURICH CONSTRUCTION & TRADING INC.</span><span>INTERACTIVE 3D</span></footer></main>';
  document.getElementById('project-title').textContent=title;
  const shell=document.getElementById('viewer-shell'),status=document.getElementById('viewer-status'),url='/models/'+encodeURIComponent(slug)+'.glb';
  try{
    const r=await fetch(url,{method:'HEAD',cache:'no-store'});
    if(!r.ok||!(/model|gltf|binary|octet-stream/.test(r.headers.get('content-type')||'')))throw Error('Model not available');
  }catch{
    status.innerHTML='<span class="empty-icon" aria-hidden="true">◇</span><strong>Presentation not available yet.</strong><span>Please check back later.</span>';
    status.classList.add('empty-state');return;
  }
  const viewer=document.createElement('model-viewer');
  viewer.className='model-viewer';viewer.src=url;viewer.alt='Interactive 3D model of '+title;
  ['camera-controls','shadow-intensity','exposure','interaction-prompt','loading','environment-image','touch-action'].forEach((k,i)=>viewer.setAttribute(k,['','1','1','auto','eager','neutral','pan-y'][i]));
  viewer.innerHTML='<div class="viewer-progress" slot="progress-bar"><div class="viewer-progress-fill"></div></div>';
  const toolbar=document.createElement('div');toolbar.className='viewer-toolbar';
  toolbar.innerHTML='<span class="viewer-hint">DRAG TO ORBIT · SCROLL TO ZOOM</span><div class="viewer-actions"><button type="button" id="reset-view">Reset view ↺</button><button type="button" id="fullscreen-view">Fullscreen ⤢</button></div>';
  shell.append(viewer,toolbar);
  viewer.addEventListener('progress',e=>{const fill=viewer.querySelector('.viewer-progress-fill');if(fill)fill.style.width=Math.round(e.detail.totalProgress*100)+'%';});
  viewer.addEventListener('load',()=>status.remove(),{once:true});
  viewer.addEventListener('error',()=>{viewer.remove();toolbar.remove();status.innerHTML='<strong>Could not open this 3D presentation.</strong><span>Please try again later.</span>';status.classList.add('empty-state');});
  document.getElementById('reset-view').addEventListener('click',()=>{viewer.cameraOrbit='auto auto auto';viewer.cameraTarget='auto auto auto';viewer.fieldOfView='auto';viewer.jumpCameraToGoal();});
  document.getElementById('fullscreen-view').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(shell.requestFullscreen)await shell.requestFullscreen();}catch{}});
}
