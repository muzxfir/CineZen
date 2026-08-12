const BOT='https://t.me/SRSMOVIEBOT';
const IMG='https://image.tmdb.org/t/p/w500';
const FIREBASE_API_KEY="AIzaSyA9xYUXl1HV7kpjWfIGWQiIPJh5KJX-IrQ";
const FIREBASE_PROJECT_ID="cinezen-9088f";
const FIRESTORE_BASE=`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const LS_FAV='cinezen_favorites_v2', LS_RECENT='cinezen_recent_v2', LS_REQ='cinezen_requested_v1';
const $=id=>document.getElementById(id);
const placeholder='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750"><rect width="100%" height="100%" fill="#171d29"/><text x="50%" y="50%" fill="#657085" text-anchor="middle" font-family="Arial" font-size="28">No Poster</text></svg>`);
let page=1,totalPages=1,loading=false,currentFeed='trending',suggestTimer;
let availableMovieIds=new Set(),favorites=readLS(LS_FAV,[]),recent=readLS(LS_RECENT,[]),requested=new Set(readLS(LS_REQ,[]));

function readLS(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}}
function saveLS(k,v){localStorage.setItem(k,JSON.stringify(v))}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
async function api(params){const r=await fetch('/api/tmdb?'+new URLSearchParams(params));const d=await r.json();if(!r.ok)throw new Error(d.error||'TMDB request failed');return d}

async function loadGenres(){
 try{const d=await api({action:'genres'});d.genres.forEach(g=>{const o=document.createElement('option');o.value=g.id;o.textContent=g.name;$('genre').appendChild(o)})}catch(e){console.error(e)}
}
function fsStr(v){return v?.stringValue||''} function fsInt(v){return Number(v?.integerValue||0)}
function parseAvailable(doc){const f=doc.fields||{};return{id:fsInt(f.tmdbId)||Number((doc.name||'').split('/').pop()),title:fsStr(f.title),release_date:fsStr(f.releaseDate)||(fsStr(f.year)?fsStr(f.year)+'-01-01':''),poster_path:fsStr(f.posterPath),original_language:fsStr(f.language),vote_average:Number(f.rating?.doubleValue||f.rating?.integerValue||0),publishedAt:f.publishedAt?.timestampValue||''}}
async function loadAvailable(){
 try{const r=await fetch(`${FIRESTORE_BASE}/latest_movies?pageSize=100&key=${FIREBASE_API_KEY}`);const d=await r.json();if(!r.ok)throw new Error(d.error?.message||'Unable to load');const items=(d.documents||[]).map(parseAvailable).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));availableMovieIds=new Set(items.map(x=>Number(x.id)));$('availableStatus').textContent=items.length+' available';$('availableEmpty').classList.toggle('hidden',items.length>0);renderGrid($('availableGrid'),items,true)}catch(e){$('availableStatus').textContent=e.message}
}
function normalizePoster(path){if(!path)return placeholder;if(path.startsWith('http'))return path;return IMG+path}
function yearOf(m){return (m.release_date||'').slice(0,4)||m.year||'—'}
function cardHtml(m,available=false){
 const id=Number(m.id||m.tmdbId),fav=favorites.some(x=>Number(x.id)===id);
 return `<article class="card" data-id="${id}"><div class="poster"><img loading="lazy" src="${normalizePoster(m.poster_path||m.posterPath)}" alt="${escapeHtml(m.title||'Movie')} poster"><span class="score">⭐ ${Number(m.vote_average||m.rating||0).toFixed(1)}</span>${available?'<span class="available-badge">AVAILABLE</span>':`<button class="fav-mini" data-fav="${id}" aria-label="Favorite">${fav?'♥':'♡'}</button>`}</div><div class="card-body"><h3>${escapeHtml(m.title||'Untitled')}</h3><div class="meta"><span>${yearOf(m)}</span><span>${(m.original_language||m.language||'').toUpperCase()}</span></div></div></article>`;
}
function renderGrid(container,items,available=false){
 container.innerHTML=items.map(m=>cardHtml(m,available)).join('');
 container.querySelectorAll('.card').forEach(c=>c.addEventListener('click',e=>{if(e.target.closest('[data-fav]'))return;openMovie(c.dataset.id)}));
 container.querySelectorAll('[data-fav]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleFavoriteById(Number(b.dataset.fav));}));
}
async function loadFeed(reset=true){
 if(loading)return;loading=true;if(reset)page=1;$('status').textContent='Loading...';
 try{const q=$('search').value.trim();let d,title;if(q){d=await api({action:'search',q,page});title=`Search: ${q}`}else if(currentFeed==='discover'){d=await api({action:'discover',page,genre:$('genre').value,language:$('language').value,sort:'popularity.desc'});title='Popular Movies'}else{d=await api({action:currentFeed,page});title=currentFeed==='trending'?'Trending Movies':currentFeed==='upcoming'?'Upcoming Movies':'Top Rated Movies'}totalPages=Math.min(d.total_pages||1,500);if(reset)$('grid').innerHTML='';const temp=document.createElement('div');temp.innerHTML=(d.results||[]).map(m=>cardHtml(m,false)).join('');$('grid').insertAdjacentHTML('beforeend',temp.innerHTML);$('grid').querySelectorAll('.card').forEach(c=>{if(!c.dataset.bound){c.dataset.bound='1';c.addEventListener('click',e=>{if(e.target.closest('[data-fav]'))return;openMovie(c.dataset.id)})}});$('grid').querySelectorAll('[data-fav]').forEach(b=>{if(!b.dataset.bound){b.dataset.bound='1';b.addEventListener('click',e=>{e.stopPropagation();toggleFavoriteById(Number(b.dataset.fav))})}});$('feedTitle').textContent=title;$('status').textContent=`Page ${page} of ${totalPages}`;$('empty').classList.toggle('hidden',(d.results||[]).length>0);$('loadMore').classList.toggle('hidden',page>=totalPages)}catch(e){$('status').textContent=e.message}finally{loading=false}
}
async function openMovie(id){
 try{const d=await api({action:'details',id});$('modalPoster').src=normalizePoster(d.poster_path);$('modalTitle').textContent=d.title||'Untitled';$('modalMeta').textContent=`${yearOf(d)} • ${d.runtime||'—'} min • ${(d.original_language||'').toUpperCase()}`;$('tmdbRating').textContent=`⭐ TMDB ${Number(d.vote_average||0).toFixed(1)}/10`;$('modalOverview').textContent=d.overview||'No overview available.';$('tags').innerHTML=(d.genres||[]).map(g=>`<span>${escapeHtml(g.name)}</span>`).join('');$('cast').innerHTML=(d.credits?.cast||[]).slice(0,5).map(x=>`<span>${escapeHtml(x.name)}</span>`).join('');if(d.imdb_id){$('imdbLink').href='https://www.imdb.com/title/'+d.imdb_id+'/';$('imdbLink').classList.remove('hidden')}else $('imdbLink').classList.add('hidden');const tr=(d.videos?.results||[]).find(v=>v.site==='YouTube'&&v.type==='Trailer')||(d.videos?.results||[]).find(v=>v.site==='YouTube');if(tr){$('trailer').href='https://www.youtube.com/watch?v='+tr.key;$('trailer').classList.remove('hidden')}else $('trailer').classList.add('hidden');const yr=yearOf(d)!=='—'?yearOf(d):'';const payload=('direct_'+`${d.title||''} ${yr}`.trim()).normalize('NFKD').replace(/[^a-zA-Z0-9 ]/g,'').trim().replace(/\s+/g,'_').slice(0,64);if(availableMovieIds.has(Number(d.id))){$('getMovie').href=BOT+'?start='+payload;$('getMovie').classList.remove('hidden');$('requestMovie').classList.add('hidden')}else{$('getMovie').classList.add('hidden');$('requestMovie').classList.remove('hidden');$('requestMovie').textContent=requested.has(Number(d.id))?'Request Sent ✓':'Request This Movie';$('requestMovie').disabled=requested.has(Number(d.id));$('requestMovie').onclick=()=>requestMovie(d)}setFavoriteButton(d);$('shareBtn').onclick=()=>shareMovie(d);addRecent(d);$('modal').classList.remove('hidden');$('modal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}catch(e){alert(e.message)}
}
function closeModal(){$('modal').classList.add('hidden');$('modal').setAttribute('aria-hidden','true');document.body.style.overflow=''}
document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',closeModal));document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

async function requestMovie(movie){
 const btn=$('requestMovie');btn.disabled=true;btn.textContent='Sending...';
 const fields={tmdbId:{integerValue:String(movie.id)},title:{stringValue:movie.title||''},year:{stringValue:yearOf(movie)==='—'?'':yearOf(movie)},releaseDate:{stringValue:movie.release_date||''},posterPath:{stringValue:movie.poster_path?IMG+movie.poster_path:''},language:{stringValue:movie.original_language||''},status:{stringValue:'pending'},requestedAt:{timestampValue:new Date().toISOString()}};
 try{const r=await fetch(`${FIRESTORE_BASE}/movie_requests/${movie.id}?key=${FIREBASE_API_KEY}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error?.message||'Request failed');requested.add(Number(movie.id));saveLS(LS_REQ,[...requested]);btn.textContent='Request Sent ✓'}catch(e){btn.disabled=false;btn.textContent='Request This Movie';alert(e.message)}
}
function compactMovie(m){return{id:Number(m.id),title:m.title||'',release_date:m.release_date||'',poster_path:m.poster_path||'',original_language:m.original_language||'',vote_average:Number(m.vote_average||0)}}
function addRecent(m){recent=[compactMovie(m),...recent.filter(x=>Number(x.id)!==Number(m.id))].slice(0,10);saveLS(LS_RECENT,recent);renderRecent()}
function renderRecent(){$('recentEmpty').classList.toggle('hidden',recent.length>0);renderGrid($('recentGrid'),recent,false)}
function toggleFavoriteById(id){const exists=favorites.some(x=>Number(x.id)===id);if(exists)favorites=favorites.filter(x=>Number(x.id)!==id);else{const source=[...recent].find(x=>Number(x.id)===id);if(source)favorites.unshift(source)}saveLS(LS_FAV,favorites);renderFavorites();document.querySelectorAll(`[data-fav="${id}"]`).forEach(b=>b.textContent=favorites.some(x=>Number(x.id)===id)?'♥':'♡')}
function setFavoriteButton(m){const id=Number(m.id),exists=favorites.some(x=>Number(x.id)===id);$('favoriteBtn').textContent=exists?'♥ Remove Favorite':'♡ Add Favorite';$('favoriteBtn').onclick=()=>{if(exists)favorites=favorites.filter(x=>Number(x.id)!==id);else favorites.unshift(compactMovie(m));saveLS(LS_FAV,favorites);renderFavorites();setFavoriteButton(m)}}
function renderFavorites(){$('favCount').textContent=favorites.length+' saved';$('favoritesEmpty').classList.toggle('hidden',favorites.length>0);renderGrid($('favoritesGrid'),favorites,false)}
async function shareMovie(m){const text=`${m.title||'Movie'} (${yearOf(m)}) — CineZen`;try{if(navigator.share)await navigator.share({title:m.title,text,url:location.href});else{await navigator.clipboard.writeText(text);alert('Movie info copied')}}catch{}}
function hideSuggestions(){$('suggestions').classList.add('hidden');$('suggestions').innerHTML=''}
function renderSuggestions(list){const a=list.slice(0,7);if(!a.length)return hideSuggestions();$('suggestions').innerHTML=a.map((m,i)=>`<div class="suggestion" data-i="${i}"><img src="${normalizePoster(m.poster_path)}" alt=""><div><strong>${escapeHtml(m.title||'Untitled')}</strong><small>${yearOf(m)} • ${(m.original_language||'').toUpperCase()}</small></div></div>`).join('');$('suggestions').classList.remove('hidden');$('suggestions').querySelectorAll('.suggestion').forEach(x=>x.onclick=()=>{const m=a[Number(x.dataset.i)];$('search').value=m.title||'';hideSuggestions();openMovie(m.id)})}
$('search').addEventListener('input',()=>{clearTimeout(suggestTimer);const q=$('search').value.trim();if(q.length<2){hideSuggestions();if(!q)loadFeed(true);return}suggestTimer=setTimeout(async()=>{try{const d=await api({action:'search',q,page:1});renderSuggestions(d.results||[])}catch{hideSuggestions()}},280)});
$('search').addEventListener('keydown',e=>{if(e.key==='Enter'){hideSuggestions();loadFeed(true)}});
document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))hideSuggestions()});
$('genre').addEventListener('change',()=>{currentFeed='discover';activateQuick('discover');loadFeed(true)});$('language').addEventListener('change',()=>{currentFeed='discover';activateQuick('discover');loadFeed(true)});
function activateQuick(feed){document.querySelectorAll('.quick').forEach(b=>b.classList.toggle('active',b.dataset.feed===feed))}
document.querySelectorAll('.quick').forEach(b=>b.onclick=()=>{currentFeed=b.dataset.feed;activateQuick(currentFeed);$('search').value='';loadFeed(true);document.getElementById('browse').scrollIntoView({behavior:'smooth'})});
$('loadMore').onclick=()=>{if(page<totalPages){page++;loadFeed(false)}};
$('bottomSearch').onclick=()=>{document.getElementById('searchSection').scrollIntoView({behavior:'smooth'});setTimeout(()=>$('search').focus(),350)};
loadGenres();loadAvailable();renderFavorites();renderRecent();loadFeed(true);


let lastScrollY = window.scrollY;
let searchBarHidden = false;

function updateSearchBarOnScroll(){
  const shell = document.querySelector('.search-shell');
  if(!shell) return;

  const y = window.scrollY;
  const delta = y - lastScrollY;

  // Always show near top
  if(y < 140){
    shell.classList.remove('search-hidden');
    searchBarHidden = false;
  }
  // Scroll down -> hide
  else if(delta > 8 && !searchBarHidden){
    shell.classList.add('search-hidden');
    searchBarHidden = true;
  }
  // Scroll up -> show
  else if(delta < -8 && searchBarHidden){
    shell.classList.remove('search-hidden');
    searchBarHidden = false;
  }

  lastScrollY = y;
}

window.addEventListener('scroll', updateSearchBarOnScroll, {passive:true});
