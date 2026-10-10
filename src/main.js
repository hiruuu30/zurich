import './style.css';
const app = document.getElementById('app');
let path = '/';
try {path=decodeURIComponent(window.location.pathname).replace(/\/+$/,'')||'/';} catch {}
const brand = '<img class="brand-logo" src="/zurich-logo.webp" alt="Zurich Construction & Trading Inc." width="1721" height="420">';
if(path==='/'){
  document.body.classList.add('home');
  app.innerHTML='<main class="landing" aria-label="Zurich Construction landing page"><div class="landing-content">'+brand+'<div class="brand-divider" aria-hidden="true"></div><p class="landing-caption">INTERACTIVE 3D PRESENTATIONS</p></div></main><footer class="home-footer"><span>© '+new Date().getFullYear()+' ZURICH CONSTRUCTION & TRADING INC.</span></footer>';
}else{
  const match=/^\/3d\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
  if(match && match[1].length<=70){
    import('./viewer.js').then(m=>m.mountViewer(app,match[1])).catch(()=>{app.innerHTML='<main class="not-found"><p>Presentation temporarily unavailable.</p><a class="subtle-link" href="/">Return home ↗</a></main>';});
  }else{
    document.title='Page not found — Zurich Construction';
    app.innerHTML='<main class="not-found"><a class="mini-brand" href="/">ZURICH<span class="mark-dot">.</span></a><p>Page not found.</p><a class="subtle-link" href="/">Return home ↗</a></main>';
  }
}
