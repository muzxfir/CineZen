const BOT='https://t.me/SRSMOVIEBOT';
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
  grid.insertAdjacentHTML('beforeend',html);
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
    const startPayload='search_'+rawQuery
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9 ]/g,'')
      .trim()
      .replace(/\s+/g,'_')
      .slice(0,64);
    el('getMovie').href=BOT+'?start='+startPayload;
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
loadGenres();loadMovies(true);
