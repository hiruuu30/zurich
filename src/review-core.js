// Zurich client review: browser-safe, deterministic data helpers.
const orbitPattern = /^-?\d+(?:\.\d+)?(?:deg|rad)\s+-?\d+(?:\.\d+)?(?:deg|rad)\s+\d+(?:\.\d+)?(?:m|cm|mm)$/;
const targetPattern = /^-?\d+(?:\.\d+)?m\s+-?\d+(?:\.\d+)?m\s+-?\d+(?:\.\d+)?m$/;
const fovPattern = /^\d+(?:\.\d+)?(?:deg|rad)$/;
const MAX_NOTES = 70;
function valid(value, pattern, max=145) {
  return typeof value === 'string' && value.length < max && pattern.test(value.trim());
}
export function validCamera(camera) {
  return !!camera && valid(camera.orbit,orbitPattern) && valid(camera.target,targetPattern) &&
    valid(camera.fov,fovPattern,60);
}
export function getViewFromSearch(search) {
  try {
    const p = new URLSearchParams(search);
    if (p.get('view') !== '1') return null;
    const camera={orbit:p.get('orbit'),target:p.get('target'),fov:p.get('fov')};
    return validCamera(camera) ? camera : null;
  } catch { return null; }
}
export function buildViewURL(base,camera) {
  if (!validCamera(camera)) throw new Error('Invalid camera');
  const url=new URL(base);
  url.search='';
  url.hash='';
  url.searchParams.set('view','1');
  url.searchParams.set('orbit',camera.orbit);
  url.searchParams.set('target',camera.target);
  url.searchParams.set('fov',camera.fov);
  return url.toString();
}
export function getCamera(viewer) {
  if (!viewer || typeof viewer.getCameraOrbit !== 'function') return null;
  const orbit=viewer.getCameraOrbit(),target=viewer.getCameraTarget();
  const camera={orbit:orbit.toString(),target:target.toString(),fov:String(viewer.getFieldOfView())+'deg'};
  return validCamera(camera) ? camera : null;
}
export function getTourOrder(scenes=[]) {
  const used=new Set();
  return scenes.reduce((list,scene,index)=>{
    if (!scene || scene.available===false) return list;
    const key=[scene.cameraOrbit,scene.cameraTarget,scene.fieldOfView].join('|');
    if (!used.has(key)) {used.add(key);list.push(index);}
    return list;
  },[]);
}
export function emptyReview() {return {version:1,notes:[],decision:null};}
function sanitizeNote(note) {
  if (!note || typeof note!=='object' || !validCamera(note.camera)) return null;
  if (typeof note.text!=='string' || !note.text.trim()) return null;
  if (!valid(note.position,targetPattern) || !valid(note.normal,targetPattern)) return null;
  return {id:String(note.id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,55),
    text:note.text.trim().slice(0,550),
    position:note.position,normal:note.normal,camera:note.camera,
    createdAt:typeof note.createdAt==='string'?note.createdAt:''};
}
export function sanitizeReview(raw) {
  const base=emptyReview();
  if (!raw || typeof raw!=='object') return base;
  if (Array.isArray(raw.notes)) base.notes=raw.notes.slice(0,MAX_NOTES).map(sanitizeNote).filter(Boolean);
  if (raw.decision && ['approve','changes'].includes(raw.decision.type)
      && typeof raw.decision.name==='string') {
    base.decision={
      type:raw.decision.type,name:raw.decision.name.slice(0,90),
      message:String(raw.decision.message||'').slice(0,1600),
      createdAt:String(raw.decision.createdAt||'').slice(0,42)
    };
  }
  return base;
}
export function readReview(storage,slug) {
  try {return sanitizeReview(JSON.parse(storage.getItem('zurich:review:v1:'+slug)));} catch{return emptyReview();}
}
export function saveReview(storage,slug,review) {
  try {storage.setItem('zurich:review:v1:'+slug,JSON.stringify(sanitizeReview(review)));return true;}catch{return false;}
}
export function reviewText(review,title,url) {
  const clean=sanitizeReview(review);
  const lines=['ZURICH CONSTRUCTION & TRADING INC.','CLIENT DESIGN REVIEW',
    'Project: '+title,'Presentation: '+url,'',
    'Decision: '+(clean.decision ? clean.decision.type==='approve'?'APPROVAL DRAFT':'CHANGES REQUESTED (DRAFT)':'Not selected'),
    'Reviewer: '+(clean.decision?.name||'Not provided'),
    'Message: '+(clean.decision?.message||'None'),'',
    'REVISION NOTES ('+clean.notes.length+')'];
  clean.notes.forEach((n,i)=>{lines.push(
    '',String(i+1)+'. '+n.text,'Captured: '+n.createdAt,'Location: '+n.position,
    'Camera: '+n.camera.orbit+' | '+n.camera.target+' | '+n.camera.fov
  );});
  lines.push('','DRAFT ONLY — Not submitted to Zurich. Please send this report to your contact.');
  return lines.join('\n');
}
export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function reviewHTML(review,title,url) {
  const content=escapeHTML(reviewText(review,title,url));
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zurich Design Review</title><style>body{font-family:Arial,Helvetica,sans-serif;max-width:780px;margin:60px auto;padding:0 24px;color:#272321;line-height:1.7}h1{font-size:23px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}.note{margin-top:30px;font-size:12px;color:#817670}@media print{body{margin:18mm auto}}</style><h1>Zurich Design Review</h1><pre>'+content+'</pre><p class="note">Prepared locally in the Zurich 3D showcase.</p></html>';
}
