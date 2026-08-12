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
function hideSuggestions(){$('suggestions').classList.add('hidden');$('suggestions').innerHTML='';document.body.classList.remove('search-suggestions-open')}
function renderSuggestions(list){const a=list.slice(0,20);if(!a.length)return hideSuggestions();$('suggestions').innerHTML=a.map((m,i)=>`<div class="suggestion" data-i="${i}"><img src="${normalizePoster(m.poster_path)}" alt=""><div><strong>${escapeHtml(m.title||'Untitled')}</strong><small>${yearOf(m)} • ${(m.original_language||'').toUpperCase()}</small></div></div>`).join('');$('suggestions').classList.remove('hidden');document.body.classList.add('search-suggestions-open');$('suggestions').querySelectorAll('.suggestion').forEach(x=>x.onclick=()=>{const m=a[Number(x.dataset.i)];$('search').value=m.title||'';hideSuggestions();openMovie(m.id)})}
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

function isSearchActive(){
  const search = document.getElementById('search');
  const suggestions = document.getElementById('suggestions');
  const focused = document.activeElement === search;
  const suggestionsOpen = suggestions && !suggestions.classList.contains('hidden');
  return focused || suggestionsOpen;
}

function updateSearchBarOnScroll(){
  const shell = document.querySelector('.search-shell');
  if(!shell) return;

  const y = window.scrollY;
  const delta = y - lastScrollY;

  if(isSearchActive()){
    shell.classList.remove('search-hidden');
    searchBarHidden = false;
    lastScrollY = y;
    return;
  }

  if(y < 140){
    shell.classList.remove('search-hidden');
    searchBarHidden = false;
  }else if(delta > 8 && !searchBarHidden){
    shell.classList.add('search-hidden');
    searchBarHidden = true;
  }else if(delta < -8 && searchBarHidden){
    shell.classList.remove('search-hidden');
    searchBarHidden = false;
  }

  lastScrollY = y;
}

window.addEventListener('scroll', updateSearchBarOnScroll, {passive:true});


document.getElementById('footerShare')?.addEventListener('click',async()=>{
  try{
    if(navigator.share){
      await navigator.share({title:'CineZen',text:'Discover movies on CineZen',url:location.href});
    }else{
      await navigator.clipboard.writeText(location.href);
      alert('CineZen link copied');
    }
  }catch{}
});

const cinezenLegalPages = {
  disclaimer: {
    title: "Disclaimer",
    body: `<p>CineZen is a movie discovery and information service. Movie titles, posters, ratings, cast details, release information and related metadata may be supplied by third-party data providers such as TMDB.</p>
    <h3>No file hosting</h3><p>CineZen does not host movie or television video files on this website. Availability information or external service links are provided for navigation and informational purposes.</p>
    <h3>Accuracy</h3><p>We try to keep information useful and current, but we cannot guarantee that every title, date, rating, poster, link or availability status is complete or error-free.</p>
    <h3>Third-party services</h3><p>External websites, Telegram services and other third-party destinations have their own terms and privacy practices. CineZen is not responsible for content or actions on third-party services.</p>`
  },
  faq: {
    title: "Frequently Asked Questions",
    body: `<h3>What is CineZen?</h3><p>CineZen helps users discover movies, view movie information, save favorites and request titles.</p>
    <h3>Does CineZen host movies?</h3><p>No. CineZen does not host movie video files on this website.</p>
    <h3>How do movie requests work?</h3><p>Use the Request Movie feature. A request can be sent to the CineZen admin for review. A request does not guarantee that a title will become available.</p>
    <h3>Where are my favorites stored?</h3><p>Favorites and recently viewed information may be stored locally in your browser unless a feature specifically states otherwise.</p>
    <h3>Why can movie information change?</h3><p>Movie metadata can be updated by the third-party data source used by CineZen.</p>`
  },
  privacy: {
    title: "Privacy Policy",
    body: `<p>This policy explains the basic data handling of the CineZen website.</p>
    <h3>Information you provide</h3><p>When you submit a movie request or contact CineZen, the information you enter may be processed to handle that request or message.</p>
    <h3>Browser storage</h3><p>CineZen may use local browser storage for features such as favorites and recently viewed movies.</p>
    <h3>Technical data</h3><p>Hosting providers and third-party services may process ordinary technical information such as IP address, browser/device information and request logs as part of operating their services.</p>
    <h3>Third parties</h3><p>CineZen can use third-party services for hosting, movie metadata and external links. Their own privacy policies apply to data they process.</p>
    <h3>Changes</h3><p>This policy may be updated as CineZen features or service providers change.</p>`
  },
  dmca: {
    title: "DMCA / Copyright",
    body: `<p>CineZen respects intellectual-property rights and does not host movie video files on this website.</p>
    <h3>Copyright concerns</h3><p>If you are a copyright owner or an authorized representative and believe content or a link displayed through CineZen infringes your rights, contact CineZen with enough information to identify the material.</p>
    <h3>Please include</h3><ul><li>Your name and contact information.</li><li>Identification of the copyrighted work.</li><li>The exact CineZen page, title or link involved.</li><li>A description of the issue and the action requested.</li><li>A statement that the information supplied is accurate and that you are authorized to act.</li></ul>
    <p>Valid notices can be reviewed and appropriate action taken where applicable.</p>`
  },
  terms: {
    title: "Terms & Conditions",
    body: `<p>By using CineZen, you agree to use the service lawfully and responsibly.</p>
    <h3>Service purpose</h3><p>CineZen provides movie discovery, metadata, favorites, requests and links to related services. Features can be changed, suspended or removed without guarantee of continuous availability.</p>
    <h3>Acceptable use</h3><p>Do not misuse CineZen, interfere with its operation, attempt unauthorized access, submit abusive content or use the service in violation of applicable law or third-party rights.</p>
    <h3>Third-party content</h3><p>Movie metadata and external destinations can be provided by third parties. Their terms may apply separately.</p>
    <h3>No warranty</h3><p>CineZen is provided on an “as available” basis. Information and availability can change and may contain errors.</p>
    <h3>Updates</h3><p>These terms may be revised as the service develops. Continued use after an update means the current terms apply.</p>`
  },
  contact: {
    title: "Contact CineZen",
    body: `<p>Need help, want to report an issue, or have a copyright/privacy question? You can contact CineZen through the official Telegram channels below.</p>
    <div class="contact-box"><h3>Telegram</h3><p><a href="https://t.me/muzxfir" target="_blank" rel="noopener">Contact @muzxfir</a></p>
    <h3>CineZen Bot</h3><p><a href="https://t.me/SRSMOVIEBOT" target="_blank" rel="noopener">Open CineZen Bot</a></p></div>
    <p style="margin-top:18px">For a movie request, use the Request Movie option on the CineZen website so the request reaches the admin dashboard.</p>`
  }
};

const legalModal = document.getElementById("legalModal");
const legalTitle = document.getElementById("legalTitle");
const legalContent = document.getElementById("legalContent");
function closeCinezenLegal(){
  legalModal?.classList.remove("open");
  legalModal?.setAttribute("aria-hidden","true");
  document.body.classList.remove("legal-open");
}
document.querySelectorAll(".legal-link").forEach(link=>{
  link.addEventListener("click",e=>{
    e.preventDefault();
    const page=cinezenLegalPages[link.dataset.legal];
    if(!page || !legalModal) return;
    legalTitle.textContent=page.title;
    legalContent.innerHTML=page.body;
    legalModal.classList.add("open");
    legalModal.setAttribute("aria-hidden","false");
    document.body.classList.add("legal-open");
  });
});
document.getElementById("legalClose")?.addEventListener("click",closeCinezenLegal);
legalModal?.addEventListener("click",e=>{if(e.target===legalModal) closeCinezenLegal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape") closeCinezenLegal();});

function keepSearchVisibleOnFocus(){
  const shell=document.querySelector('.search-shell');
  if(shell){
    shell.classList.remove('search-hidden');
    searchBarHidden=false;
  }
}
document.getElementById('search')?.addEventListener('focus',keepSearchVisibleOnFocus);

const suggestionsBox=document.getElementById('suggestions');
suggestionsBox?.addEventListener('wheel',e=>{
  e.stopPropagation();
},{passive:true});
suggestionsBox?.addEventListener('touchmove',e=>{
  e.stopPropagation();
},{passive:true});

function lockSuggestionScroll(){
  const box=document.getElementById('suggestions');
  if(!box) return;

  let startY=0;

  box.addEventListener('touchstart',e=>{
    if(e.touches && e.touches.length){
      startY=e.touches[0].clientY;
    }
  },{passive:true});

  box.addEventListener('touchmove',e=>{
    if(!e.touches || !e.touches.length) return;
    const currentY=e.touches[0].clientY;
    const movingDown=currentY>startY;
    const movingUp=currentY<startY;

    const atTop=box.scrollTop<=0;
    const atBottom=Math.ceil(box.scrollTop+box.clientHeight)>=box.scrollHeight;

    // Keep gesture inside the suggestion list instead of handing it to page scroll.
    if((atTop && movingDown) || (atBottom && movingUp)){
      e.preventDefault();
    }
  },{passive:false});
}
lockSuggestionScroll();
