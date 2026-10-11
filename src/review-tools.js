import './review-tools.css';
import {buildViewURL, getViewFromSearch, getCamera, getTourOrder,
  readReview, saveReview, reviewText, reviewHTML} from './review-core.js';

// This first release deliberately keeps client notes on this browser.
// A review is never claimed to have been transmitted without an actual recipient/backend.
export function installReviewTools({viewer, shell, toolbar, scenes, activateScene, title, slug}) {
  let storage;
  try { storage=window.localStorage; } catch { storage={getItem:()=>null,setItem:()=>{throw Error('storage blocked');}}; }
  const review=readReview(storage,slug);
  const order=getTourOrder(scenes);
  let ready=false, pinMode=false, pendingHit=null, tourTimer=null, tourIndex=0, tourPlaying=false, pointerDown=null;
  const el=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!=null)node.textContent=text;
    return node;
  };
  const bar=el('section','zr-actionbar');
  bar.setAttribute('aria-label','Project presentation tools');
  bar.innerHTML='<div class="zr-action-primary"><button id="zr-tour" type="button">▶ Start tour</button><span id="zr-tour-progress" class="zr-tour-progress" aria-live="polite"></span></div><div class="zr-action-secondary"><button id="zr-pin" type="button" title="Add a note to a specific point on the model">＋ Pin a revision</button><button id="zr-list" type="button">Notes (0)</button><button id="zr-capture" type="button">▣ Capture view</button><button id="zr-share" type="button">↗ Share this view</button></div>';
  toolbar.after(bar);
  const dock=el('section','zr-decision-dock');
  dock.innerHTML='<div class="zr-review-intro"><span class="zr-eyebrow">PROJECT REVIEW</span><h2>Ready to review this design?</h2><p>Save a decision draft and send it to Zurich.</p><p id="zr-decision-state" class="zr-decision-state"></p></div><div class="zr-decision-actions"><button type="button" id="zr-approve">✓ Approve design</button><button type="button" id="zr-changes">Request changes ↗</button></div><div class="zr-submit-actions"><button type="button" id="zr-download">Download review</button><button type="button" id="zr-email">Prepare email ↗</button></div>';
  bar.after(dock);
  const list=el('section','zr-notes');
  list.hidden=true;
  list.innerHTML='<div class="zr-notes-head"><div><span class="zr-eyebrow">REVISION BOARD</span><h2>Revision notes</h2><p>These notes stay on this device until you download or email a report.</p></div><button id="zr-close-notes" type="button" aria-label="Close revision board">✕</button></div><div id="zr-note-items" class="zr-note-items"></div>';
  dock.after(list);
  const status=el('div','zr-notice');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  status.hidden=true;
  list.after(status);
  let statusTimer;
  function notify(message) {
    clearTimeout(statusTimer);
    status.textContent=message;
    status.hidden=false;
    statusTimer=setTimeout(()=>{status.hidden=true;},5500);
  }
  const noteDialog=el('dialog','zr-dialog');
  noteDialog.setAttribute('aria-label','Create a revision');
  noteDialog.innerHTML='<form id="zr-note-form"><div class="zr-dialog-header"><span class="zr-eyebrow">ANNOTATE MODEL</span><h2>Pin a revision</h2><p>Your note will be attached to this exact model position and viewpoint.</p></div><label for="zr-note-text">What should Zurich change?</label><textarea id="zr-note-text" rows="4" maxlength="550" required placeholder="Describe the adjustment…"></textarea><div class="zr-dialog-footer"><button type="button" id="zr-note-cancel">Cancel</button><button class="zr-btn-primary" type="submit">Save pin</button></div></form>';
  list.after(noteDialog);
  const decisionDialog=el('dialog','zr-dialog');
  decisionDialog.setAttribute('aria-label','Client design decision');
  decisionDialog.innerHTML='<form id="zr-decision-form"><div class="zr-dialog-header"><span class="zr-eyebrow">CLIENT FEEDBACK</span><h2 id="zr-decision-heading">Review design</h2><p id="zr-decision-help">Prepare a review report to send to Zurich.</p></div><label for="zr-reviewer">Your name</label><input id="zr-reviewer" type="text" maxlength="90" autocomplete="name" required placeholder="Client name"><label for="zr-message" id="zr-message-label">Message (optional)</label><textarea id="zr-message" rows="4" maxlength="1600" placeholder="Add a message…"></textarea><p class="zr-dialog-note">This creates a draft on your device. Nothing is sent automatically.</p><div class="zr-dialog-footer"><button type="button" id="zr-decision-cancel">Cancel</button><button class="zr-btn-primary" type="submit">Save review draft</button></div></form>';
  noteDialog.after(decisionDialog);
  const $=(selector,root=document)=>root.querySelector(selector);
  const tourBtn=$('#zr-tour'),progress=$('#zr-tour-progress'),pinBtn=$('#zr-pin'),notesBtn=$('#zr-list');
  const filename=slug+'-design-review.html';

  for(const button of bar.querySelectorAll('button'))button.disabled=true;
  for(const button of dock.querySelectorAll('button'))button.disabled=true;

  function persist() {
    if(!saveReview(storage,slug,review))
      notify('Browser storage is unavailable. Download the review report before leaving this page.');
  }
  function stopTour() {
    if(tourTimer!==null){clearTimeout(tourTimer);tourTimer=null;}
    tourPlaying=false;
    tourBtn.textContent='▶ Start tour';
    tourBtn.setAttribute('aria-pressed','false');
  }
  function tourStep(index) {
    if(!tourPlaying)return;
    if(index>=order.length){
      stopTour();
      progress.textContent='Tour complete · '+order.length+' views';
      return;
    }
    tourIndex=index;
    activateScene(order[index]);
    progress.textContent='View '+(index+1)+' of '+order.length;
    tourTimer=setTimeout(()=>tourStep(index+1),6100);
  }
  tourBtn.addEventListener('click',()=>{
    if(tourPlaying){stopTour();progress.textContent='Tour paused';return;}
    if(order.length===0){notify('No available saved scenes for this model.');return;}
    pinMode=false;updatePinState();
    tourPlaying=true;
    tourBtn.textContent='Ⅱ Pause tour';
    tourBtn.setAttribute('aria-pressed','true');
    tourStep(0);
  });
  toolbar.addEventListener('click',event=>{
    if(event.target.closest('.scene-button')&&tourPlaying){
      stopTour();progress.textContent='Manual view selected';
    }
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&tourPlaying){stopTour();progress.textContent='Tour paused';}
  });
  viewer.addEventListener('pointerdown',event=>{
    pointerDown={x:event.clientX,y:event.clientY};
    if(tourPlaying){stopTour();progress.textContent='Explore freely';}
  });
  function updatePinState(){
    pinBtn.setAttribute('aria-pressed',String(pinMode));
    pinBtn.textContent=pinMode?'✕ Cancel pin':'＋ Pin a revision';
    viewer.classList.toggle('zr-pinning',pinMode);
    if(pinMode)viewer.setAttribute('disable-tap','');
    else viewer.removeAttribute('disable-tap');
  }
  pinBtn.addEventListener('click',()=>{
    if(!ready)return;
    stopTour();
    pinMode=!pinMode;
    updatePinState();
    if(pinMode)notify('Click or tap a surface in the model to place a revision pin.');
  });
  function readableVector(vec){
    const vals=[vec?.x,vec?.y,vec?.z];
    if(vals.some(x=>!Number.isFinite(x)||Math.abs(x)>999999))return null;
    return vals.map(x=>Number(x).toFixed(5)+'m').join(' ');
  }
  viewer.addEventListener('click',event=>{
    if(!pinMode || !ready || noteDialog.open)return;
    if(pointerDown && Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>9)return;
    const hit=typeof viewer.positionAndNormalFromPoint==='function'
      ? viewer.positionAndNormalFromPoint(event.clientX,event.clientY):null;
    if(!hit){notify('No model surface at this point. Try another position.');return;}
    const camera=getCamera(viewer),position=readableVector(hit.position),normal=readableVector(hit.normal);
    if(!camera || !position || !normal){notify('Could not record this location. Try a different surface.');return;}
    pendingHit={position,normal,camera};
    $('#zr-note-text').value='';
    noteDialog.showModal();
    $('#zr-note-text').focus();
  });
  $('#zr-note-cancel').addEventListener('click',()=>{noteDialog.close();pendingHit=null;});
  noteDialog.addEventListener('close',()=>{pendingHit=null;});
  $('#zr-note-form').addEventListener('submit',event=>{
    event.preventDefault();
    if(!pendingHit)return;
    const text=$('#zr-note-text').value.trim();
    if(!text)return;
    if(review.notes.length>=70){notify('Maximum 70 notes. Download your report before adding more.');return;}
    review.notes.push({
      id:'pin-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
      text:text.slice(0,550),...pendingHit,createdAt:new Date().toISOString()
    });
    if(review.decision?.type==='approve')review.decision=null;
    persist();noteDialog.close();pendingHit=null;
    pinMode=false;updatePinState();renderNotes();
    list.hidden=false;notesBtn.setAttribute('aria-expanded','true');
    notify('Revision pin saved on this device.');
  });
  function focusNote(note){
    stopTour();
    viewer.cameraOrbit=note.camera.orbit;
    viewer.cameraTarget=note.camera.target;
    viewer.fieldOfView=note.camera.fov;
    notify('Viewing revision: '+note.text.slice(0,120));
    viewer.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function renderNotes(){
    notesBtn.textContent='Notes ('+review.notes.length+')';
    const parent=$('#zr-note-items');parent.replaceChildren();
    if(review.notes.length===0){
      const p=el('p','zr-note-empty','No revisions yet. Choose “Pin a revision” and tap a model surface.');
      parent.append(p);
    }
    review.notes.forEach((note,index)=>{
      const item=el('article','zr-note-item');
      const number=el('span','zr-note-number',String(index+1).padStart(2,'0'));
      const textNode=el('p','zr-note-copy',note.text);
      const view=el('button','zr-inline-button','Go to pin ↗');
      view.type='button';view.addEventListener('click',()=>focusNote(note));
      const remove=el('button','zr-inline-button zr-remove-note','Remove');
      remove.type='button';remove.addEventListener('click',()=>{
        if(!window.confirm('Remove this revision note from this device?'))return;
        review.notes=review.notes.filter(n=>n.id!==note.id);
        persist();renderNotes();renderPins();updateDecisionState();
      });
      const buttons=el('div','zr-note-links');buttons.append(view,remove);
      item.append(number,textNode,buttons);parent.append(item);
    });
    updateDecisionState();
  }
  function renderPins(){
    viewer.querySelectorAll('.zr-hotspot').forEach(node=>node.remove());
    review.notes.forEach((note,index)=>{
      const pin=el('button','zr-hotspot',String(index+1));
      pin.type='button';
      pin.setAttribute('slot','hotspot-'+note.id);
      pin.setAttribute('data-position',note.position);
      pin.setAttribute('data-normal',note.normal);
      pin.setAttribute('aria-label','Revision '+(index+1)+': '+note.text);
      pin.title=note.text;
      pin.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();focusNote(note);});
      viewer.append(pin);
    });
  }
  notesBtn.setAttribute('aria-expanded','false');
  notesBtn.addEventListener('click',()=>{
    list.hidden=!list.hidden;
    notesBtn.setAttribute('aria-expanded',String(!list.hidden));
    if(!list.hidden)list.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  $('#zr-close-notes').addEventListener('click',()=>{
    list.hidden=true;notesBtn.setAttribute('aria-expanded','false');
  });
  let decisionType='approve';
  function openDecision(type){
    decisionType=type;stopTour();pinMode=false;updatePinState();
    const isChange=type==='changes';
    $('#zr-decision-heading').textContent=isChange?'Request changes':'Approve design';
    $('#zr-decision-help').textContent=isChange?'Summarize requested adjustments for Zurich.':'Prepare an approval record to send to Zurich.';
    $('#zr-message-label').textContent=isChange?'Requested changes':'Message (optional)';
    $('#zr-message').required=isChange;
    $('#zr-message').placeholder=isChange?'What would you like changed?':'Any additional comments…';
    $('#zr-reviewer').value=review.decision?.name||'';
    $('#zr-message').value=(review.decision?.type===type?review.decision.message:'')||'';
    decisionDialog.showModal();
    $('#zr-reviewer').focus();
  }
  $('#zr-approve').addEventListener('click',()=>openDecision('approve'));
  $('#zr-changes').addEventListener('click',()=>openDecision('changes'));
  $('#zr-decision-cancel').addEventListener('click',()=>decisionDialog.close());
  $('#zr-decision-form').addEventListener('submit',event=>{
    event.preventDefault();
    const name=$('#zr-reviewer').value.trim(),message=$('#zr-message').value.trim();
    if(!name || (decisionType==='changes'&&!message))return;
    review.decision={type:decisionType,name:name.slice(0,90),message:message.slice(0,1600),createdAt:new Date().toISOString()};
    persist();decisionDialog.close();updateDecisionState();
    notify('Review draft saved locally. Download or prepare an email to send it to Zurich.');
  });
  function updateDecisionState(){
    const label=$('#zr-decision-state');
    if(!review.decision){label.textContent='Not reviewed yet';label.dataset.state='none';return;}
    label.dataset.state=review.decision.type;
    label.textContent=(review.decision.type==='approve'?'Approval draft':'Change-request draft')+' · not sent';
  }
  function downloadBlob(blob,name){
    const url=URL.createObjectURL(blob),a=el('a');
    a.href=url;a.download=name;a.style.display='none';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),20000);
  }
  $('#zr-download').addEventListener('click',()=>{
    const content=reviewHTML(review,title,window.location.origin+window.location.pathname);
    downloadBlob(new Blob([content],{type:'text/html;charset=utf-8'}),filename);
    notify('Review report downloaded. Send it to Zurich to submit your feedback.');
  });
  $('#zr-email').addEventListener('click',()=>{
    const subject='Zurich design review — '+title;
    const body=reviewText(review,title,window.location.origin+window.location.pathname);
    if(body.length>1650)notify('The email summary is shortened. Attach the downloaded report for all notes.');
    const href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body.slice(0,1650)+'\n\nAttach the full downloaded report if needed.');
    window.location.href=href;
  });
  async function copyText(text){
    try {await navigator.clipboard.writeText(text);return true;} catch {}
    const input=el('textarea');input.value=text;input.setAttribute('readonly','');
    input.style.position='fixed';input.style.opacity='0';document.body.append(input);
    input.focus();input.select();
    let copied=false;
    try {copied=document.execCommand('copy');} catch {}
    input.remove();
    return copied;
  }
  $('#zr-share').addEventListener('click',async()=>{
    const camera=getCamera(viewer);
    if(!camera){notify('Camera is not ready. Try again after the model loads.');return;}
    const url=buildViewURL(window.location.href,camera);
    if(await copyText(url))notify('Camera link copied. It will open this exact view on another device.');
    else window.prompt('Copy this camera link:',url);
  });
  $('#zr-capture').addEventListener('click',async()=>{
    try {
      const data=await viewer.toDataURL('image/png');
      if(typeof data!=='string' || !data.startsWith('data:image/png'))throw Error('Screenshot unavailable');
      const response=await fetch(data);
      downloadBlob(await response.blob(),slug+'-view-'+new Date().toISOString().slice(0,10)+'.png');
      notify('PNG snapshot downloaded.');
    }catch{
      notify('Could not capture this view. Try again after the model finishes rendering.');
    }
  });
  viewer.addEventListener('load',()=>{
    ready=true;
    for(const b of bar.querySelectorAll('button'))b.disabled=false;
    for(const b of dock.querySelectorAll('button'))b.disabled=false;
    renderNotes();renderPins();updateDecisionState();
    const shared=getViewFromSearch(window.location.search);
    if(shared){
      viewer.cameraOrbit=shared.orbit;viewer.cameraTarget=shared.target;viewer.fieldOfView=shared.fov;
      progress.textContent='Shared camera view';
    }
  },{once:true});
  viewer.addEventListener('error',()=>{
    stopTour();
    for(const b of bar.querySelectorAll('button'))b.disabled=true;
    for(const b of dock.querySelectorAll('button'))b.disabled=true;
  });
}
