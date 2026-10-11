import test from 'node:test';
import assert from 'node:assert/strict';
import {getTourOrder,getViewFromSearch,buildViewURL,validCamera,readReview,saveReview,reviewText,reviewHTML,sanitizeReview} from '../src/review-core.js';
const c={orbit:'1.2rad 1.5rad 4m',target:'1m 2m -3m',fov:'55deg'};
test('camera view URLs round trip and reject hostile values',()=>{
  const url=buildViewURL('https://zurich.example/3d/dr-neil?old=1#x',c);
  assert.deepEqual(getViewFromSearch(new URL(url).search),c);
  assert.ok(!url.includes('old=1'));
  assert.equal(getViewFromSearch('?view=1&orbit=javascript:alert(1)&target=0m+0m+0m&fov=50deg'),null);
  assert.equal(validCamera({...c,target:'auto auto auto'}),false);
});
test('tour ignores unavailable and duplicate angles',()=>{
  const s=(n,enabled)=>({cameraOrbit:n,cameraTarget:'0m 0m 0m',fieldOfView:'50deg',available:enabled});
  assert.deepEqual(getTourOrder([s('a',true),s('b',false),s('c',true),s('a',true)]),[0,2]);
});
test('local review is sanitized and survives roundtrip',()=>{
  const item={id:'a1',text:'Change the hinge',position:'1m 1m 1m',normal:'0m 1m 0m',camera:c,createdAt:'2026-10-10'};
  const state={notes:[item],decision:{type:'changes',name:'Client',message:'Test'}};
  const store=new Map();
  const storage={getItem:key=>store.get(key),setItem:(key,val)=>store.set(key,val)};
  assert.equal(saveReview(storage,'dr-neil',state),true);
  assert.equal(readReview(storage,'dr-neil').notes.length,1);
  assert.equal(readReview(storage,'another').notes.length,0);
  assert.equal(sanitizeReview({notes:[{...item,text:'  '}]}).notes.length,0);
});
test('report text and HTML safely preserve revision content',()=>{
  const review={notes:[{id:'1',text:'<script>alert("x")</script>',position:'1m 2m 3m',normal:'0m 1m 0m',camera:c}],decision:{type:'approve',name:'A & B'}};
  assert.match(reviewText(review,'Dr. Neil','https://example.com'),/DRAFT ONLY/);
  const html=reviewHTML(review,'Dr. Neil','https://example.com');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});
