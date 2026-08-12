
function openMenu(){
  const drawer=document.getElementById('menuDrawer');
  const overlay=document.getElementById('menuOverlay');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  overlay.classList.remove('hidden');
  requestAnimationFrame(()=>overlay.classList.add('show'));
  document.body.style.overflow='hidden';
}
function closeMenu(){
  const drawer=document.getElementById('menuDrawer');
  const overlay=document.getElementById('menuOverlay');
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
  overlay.classList.remove('show');
  setTimeout(()=>overlay.classList.add('hidden'),280);
  document.body.style.overflow='';
}
document.getElementById('menuBtn')?.addEventListener('click',openMenu);
document.getElementById('menuClose')?.addEventListener('click',closeMenu);
document.getElementById('menuOverlay')?.addEventListener('click',closeMenu);
document.querySelectorAll('[data-menu-link]').forEach(x=>x.addEventListener('click',closeMenu));
document.getElementById('menuRequest')?.addEventListener('click',()=>{
  closeMenu();
  document.getElementById('search')?.focus();
  document.getElementById('browse')?.scrollIntoView({behavior:'smooth'});
});

const revealObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
},{threshold:.12});
function observeReveals(){
  document.querySelectorAll('.card,.info-section').forEach(el=>{
    if(!el.dataset.revealBound){
      el.dataset.revealBound='1';
      el.classList.add('reveal');
      revealObserver.observe(el);
    }
  });
}

const BOT='https://t.me/SRSMOVIEBOT';

const FIREBASE_API_KEY="AIzaSyA9xYUXl1HV7kpjWfIGWQiIPJh5KJX-IrQ";
const FIREBASE_PROJECT_ID="cinezen-9088f";
const FIRESTORE_BASE=`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
let availableMovieIds=new Set();

const IMG='https://image.tmdb.org/t/p/w500';
const BACK='https://image.tmdb.org/t/p/original';
let page=1, totalPages=1, loading=false, mode='discover', searchTimer;

const el=id=>document.getElementById(id);
const grid=el('grid'), search=el('search'), genre=el('genre'), language=el('language'), sort=el('sort');
const placeholder='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750"><rect width="100%" height="100%" fill="#151a26"/><text x="50%" y="50%" fill="#657085" text-anchor="middle" font-family="Arial" font-size="32">No Poster</text></svg>`);

async function api(params){
  const qs=new URLSearchParams(params);
  const r=await fetch('/api/tmdb?'+qs.toString());
  if(!r.ok) throw new Error((await r.json().catch(()=>({}))).error||'TMDB request failed');
  return r.json();
}


function fsString(v){return v?.stringValue ?? ''}
function fsInt(v){return Number(v?.integerValue ?? 0)}
function fsTimestamp(v){return v?.timestampValue ?? ''}
function parseFirestoreMovie(doc){
  const f=doc.fields||{};
  return {
    id: fsInt(f.tmdbId) || Number((doc.name||'').split('/').pop()),
    title: fsString(f.title),
    release_date: fsString(f.releaseDate) || (fsString(f.year)?fsString(f.year)+'-01-01':''),
    poster_path: fsString(f.posterPath),
    original_language: fsString(f.language),
    vote_average: Number(f.rating?.doubleValue ?? f.rating?.integerValue ?? 0),
    publishedAt: fsTimestamp(f.publishedAt)
  };
}
async function loadLatestMovies(){
  const status=document.getElementById('latestStatus');
  const latestGrid=document.getElementById('latestGrid');
  const empty=document.getElementById('latestEmpty');
  if(!latestGrid)return;
  status.textContent='Loading...';
  try{
    const r=await fetch(`${FIRESTORE_BASE}/latest_movies?pageSize=100&key=${FIREBASE_API_KEY}`);
    if(!r.ok) throw new Error('Unable to load latest movies');
    const data=await r.json();
    const items=(data.documents||[]).map(parseFirestoreMovie)
      .sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt)));
    availableMovieIds=new Set(items.map(x=>Number(x.id)));
    status.textContent=`${items.length} available`;
    empty.classList.toggle('hidden',items.length>0);
    latestGrid.innerHTML=items.map(m=>{
      const year=(m.release_date||'').slice(0,4)||'—';
      return `<article class="card" data-id="${m.id}">
        <div class="poster">
          <span class="available-badge">NOW AVAILABLE</span>
          <img loading="lazy" src="${m.poster_path?IMG+m.poster_path:placeholder}" alt="${escapeHtml(m.title||'Movie')} poster">
          <span class="score">⭐ ${Number(m.vote_average||0).toFixed(1)}</span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(m.title||'Untitled')}</h3>
          <div class="meta"><span>${year}</span><span>${(m.original_language||'').toUpperCase()}</span></div>
        </div>
      </article>`;
    }).join('');
    latestGrid.querySelectorAll('.card').forEach(c=>c.onclick=()=>openMovie(c.dataset.id)); observeReveals();
  }catch(e){
    status.textContent=e.message;
  }
}

async function loadGenres(){
  try{
    const data=await api({action:'genres'});
    data.genres.forEach(g=>{
      const o=document.createElement('option'); o.value=g.id; o.textContent=g.name; genre.appendChild(o);
    });
  }catch(e){console.error(e)}
}

function renderCards(items, append=false){
  if(!append) grid.innerHTML='';
  const html=items.map(m=>{
    const title=m.title||m.original_title||'Untitled';
    const year=(m.release_date||'').slice(0,4)||'—';
    const rating=Number(m.vote_average||0).toFixed(1);
    return `<article class="card" data-id="${m.id}">
      <div class="poster">
        <img loading="lazy" src="${m.poster_path?IMG+m.poster_path:placeholder}" alt="${escapeHtml(title)} poster">
        <span class="score">⭐ ${rating}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(title)}</h3>
        <div class="meta"><span>${year}</span><span>${m.original_language?.toUpperCase()||''}</span></div>
      </div>
    </article>`
  }).join('');
  grid.insertAdjacentHTML('beforeend',html); observeReveals();
  grid.querySelectorAll('.card').forEach(c=>{if(!c.dataset.bound){c.dataset.bound='1';c.onclick=()=>openMovie(c.dataset.id)}});
}

async function loadMovies(reset=false){
  if(loading)return; loading=true;
  if(reset){page=1; grid.innerHTML='';}
  el('status').textContent='Loading...';
  try{
    let data;
    const q=search.value.trim();
    if(q){
      mode='search';
      data=await api({action:'search',q,page});
      el('heading').textContent=`Search: ${q}`;
    }else{
      mode='discover';
      data=await api({action:'discover',page,genre:genre.value,language:language.value,sort:sort.value});
      el('heading').textContent='Browse Movies';
    }
    totalPages=Math.min(data.total_pages||1,500);
    renderCards(data.results||[], page>1);
    el('status').textContent=`Page ${page} of ${totalPages}`;
    el('empty').classList.toggle('hidden',(data.results||[]).length>0 || page>1);
    el('loadMore').classList.toggle('hidden',page>=totalPages);
  }catch(e){
    el('status').textContent=e.message;
  }finally{loading=false}
}


async function requestMovieToAdmin(movie){
  const year=(movie.release_date||'').slice(0,4);
  const fields={
    tmdbId:{integerValue:String(movie.id)},
    title:{stringValue:movie.title||movie.original_title||''},
    year:{stringValue:year},
    releaseDate:{stringValue:movie.release_date||''},
    posterPath:{stringValue:movie.poster_path||''},
    language:{stringValue:movie.original_language||''},
    status:{stringValue:'pending'},
    requestedAt:{timestampValue:new Date().toISOString()}
  };
  const url=`${FIRESTORE_BASE}/movie_requests/${encodeURIComponent(String(movie.id))}?key=${FIREBASE_API_KEY}`;
  const r=await fetch(url,{
    method:'PATCH',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({fields})
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error?.message||'Request failed');
  return d;
}

async function openMovie(id){
  try{
    const d=await api({action:'details',id});
    el('modalPoster').src=d.poster_path?IMG+d.poster_path:placeholder;
    el('modalTitle').textContent=d.title||'Untitled';
    el('modalMeta').textContent=`${(d.release_date||'').slice(0,4)||'—'} • ${d.runtime||'—'} min • ${(d.original_language||'').toUpperCase()}`;
    el('tmdbRating').textContent=`⭐ TMDB ${Number(d.vote_average||0).toFixed(1)}/10`;
    el('modalOverview').textContent=d.overview||'No overview available.';
    el('tags').innerHTML=(d.genres||[]).map(g=>`<span>${escapeHtml(g.name)}</span>`).join('');
    const year=(d.release_date||'').slice(0,4);
    const rawQuery=`${d.title||''}${year?' '+year:''}`.trim();
    const startPayload='direct_'+rawQuery
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9 ]/g,'')
      .trim()
      .replace(/\s+/g,'_')
      .slice(0,64);
    if(availableMovieIds.has(Number(d.id))){
      el('getMovie').href=BOT+'?start='+startPayload;
      el('getMovie').textContent='Get Movie on Telegram';
      el('getMovie').classList.remove('secondary','hidden');
      el('getMovie').style.pointerEvents='';
      el('getMovie').removeAttribute('aria-disabled');
      el('requestMovie').classList.add('hidden');
      el('requestMovie').onclick=null;
    }else{
      el('getMovie').removeAttribute('href');
      el('getMovie').classList.add('hidden');
      el('getMovie').style.pointerEvents='none';
      el('getMovie').setAttribute('aria-disabled','true');
      el('requestMovie').classList.remove('hidden');
      el('requestMovie').textContent='Request This Movie';
      el('requestMovie').disabled=false;
      el('requestMovie').onclick=async()=>{
        const btn=el('requestMovie');
        btn.disabled=true;
        btn.textContent='Sending Request...';
        try{
          await requestMovieToAdmin(d);
          btn.textContent='Request Sent ✓';
        }catch(e){
          btn.disabled=false;
          btn.textContent='Request This Movie';
          alert(e.message);
        }
      };
    }
    const imdb=el('imdbLink');
    if(d.imdb_id){imdb.href='https://www.imdb.com/title/'+d.imdb_id+'/';imdb.classList.remove('hidden')}else imdb.classList.add('hidden');
    const trailer=(d.videos?.results||[]).find(v=>v.site==='YouTube'&&v.type==='Trailer') || (d.videos?.results||[]).find(v=>v.site==='YouTube');
    const tr=el('trailer');
    if(trailer){tr.href='https://www.youtube.com/watch?v='+trailer.key;tr.classList.remove('hidden')}else tr.classList.add('hidden');
    el('modal').classList.remove('hidden'); document.body.style.overflow='hidden';
  }catch(e){alert(e.message)}
}
function closeModal(){el('modal').classList.add('hidden');document.body.style.overflow=''}
document.querySelectorAll('[data-close]').forEach(x=>x.onclick=closeModal);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadMovies(true),450)});
[genre,language,sort].forEach(x=>x.addEventListener('change',()=>{if(!search.value.trim())loadMovies(true)}));
el('loadMore').onclick=()=>{if(page<totalPages){page++;loadMovies(false)}};
function escapeHtml(s=''){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
observeReveals();loadLatestMovies();loadGenres();loadMovies(true);
