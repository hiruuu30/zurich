import '@google/model-viewer';
import sceneConfigs from './project-scenes.json';
import { tunePbrMaterials } from './materials.js';
import { installReviewTools } from './review-tools.js';
const projectNames={'dr-neil':'Dr. Neil'};
const friendlyName=s=>projectNames[s]||s.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
export async function mountViewer(app,slug){
  const title=friendlyName(slug);
  const scenes=sceneConfigs[slug] || [];
  let currentScene=0,renderIndex=0;
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
  ['camera-controls','shadow-intensity','exposure','interaction-prompt','loading','environment-image','touch-action'].forEach((k,i)=>viewer.setAttribute(k,['','0.55','1.12','auto','eager','neutral','pan-y'][i]));
  viewer.setAttribute('tone-mapping','agx');
  viewer.setAttribute('shadow-softness','0.85');
  viewer.setAttribute('min-camera-orbit','auto auto 0.08m');
  viewer.setAttribute('max-camera-orbit','auto auto 35m');
  viewer.setAttribute('min-field-of-view','20deg');
  viewer.setAttribute('max-field-of-view','90deg');
  if(scenes.length){viewer.cameraTarget=scenes[0].cameraTarget;viewer.cameraOrbit=scenes[0].cameraOrbit;viewer.fieldOfView=scenes[0].fieldOfView;}
  viewer.innerHTML='<div class="viewer-progress" slot="progress-bar"><div class="viewer-progress-fill"></div></div>';
  const toolbar=document.createElement('div');toolbar.className='viewer-toolbar';
  toolbar.innerHTML='<div class="scene-group"><span class="scene-prefix">SCENES</span><div class="scene-list" id="scene-list" role="group" aria-label="Saved Enscape scenes"></div></div><div class="viewer-actions"><button type="button" id="render-mode" title="Adjust exposure and tone mapping">Render: Natural ↻</button><button type="button" id="reset-view">Reset view ↺</button><button type="button" id="fullscreen-view">Fullscreen ⤢</button></div>';
  shell.append(viewer);shell.after(toolbar);
  if(!scenes.length)toolbar.querySelector('.scene-group').hidden=true;
  function activateScene(index){
    const scene=scenes[index];
    if(!scene){viewer.cameraOrbit='auto auto auto';viewer.cameraTarget='auto auto auto';viewer.fieldOfView='auto';return;}
    if(scene.available===false)return;
    currentScene=index;
    viewer.cameraTarget=scene.cameraTarget;
    viewer.cameraOrbit=scene.cameraOrbit;
    viewer.fieldOfView=scene.fieldOfView;
    [...toolbar.querySelectorAll('.scene-button')].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  }
  scenes.forEach((scene,index)=>{
    const button=document.createElement('button');
    button.type='button';button.className='scene-button';button.textContent=String(index+1).padStart(2,'0');
    button.title=scene.available===false ? scene.name+' — currently unavailable' : scene.name;
    button.disabled=scene.available===false;
    button.setAttribute('aria-label',scene.available===false ? scene.name+' unavailable in this model export' : scene.name);
    button.setAttribute('aria-pressed',String(index===0));
    button.addEventListener('click',()=>activateScene(index));
    toolbar.querySelector('#scene-list').append(button);
  });
  const presets=[{name:'Natural',exposure:1.12,tone:'agx'},{name:'Bright',exposure:1.42,tone:'neutral'},{name:'Soft',exposure:.95,tone:'agx'}];
  toolbar.querySelector('#render-mode').addEventListener('click',()=>{
    renderIndex=(renderIndex+1)%presets.length;
    const preset=presets[renderIndex];
    viewer.exposure=preset.exposure;viewer.toneMapping=preset.tone;
    toolbar.querySelector('#render-mode').textContent='Render: '+preset.name+' ↻';
  });
  viewer.addEventListener('progress',e=>{const fill=viewer.querySelector('.viewer-progress-fill');if(fill)fill.style.width=Math.round(e.detail.totalProgress*100)+'%';});
  viewer.addEventListener('load',()=>{tunePbrMaterials(viewer.model);if(scenes.length)activateScene(0);status.remove();},{once:true});
  viewer.addEventListener('error',()=>{viewer.remove();toolbar.remove();status.innerHTML='<strong>Could not open this 3D presentation.</strong><span>Please try again later.</span>';status.classList.add('empty-state');});
  document.getElementById('reset-view').addEventListener('click',()=>activateScene(currentScene));
  document.getElementById('fullscreen-view').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(shell.requestFullscreen)await shell.requestFullscreen();}catch{}});
  installReviewTools({viewer,shell,toolbar,scenes,activateScene,title,slug});
}
