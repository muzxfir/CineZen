const BOT_URL = "https://t.me/SADIEMOLBOT";
const CHANNEL_URL = "https://t.me/CineZenHQ";

const movies = [
  {
    title: "Midnight Signal", year: 2026, language: "English", genre: "Thriller", quality: "HD",
    poster: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=700&q=85",
    description: "A late-night radio host receives a mysterious call that turns a quiet shift into a race against time.",
    trailer: "https://www.youtube.com/results?search_query=movie+trailer"
  },
  {
    title: "Neon City", year: 2026, language: "English", genre: "Action", quality: "4K",
    poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=85",
    description: "An underground courier crosses a futuristic city to deliver a package everyone wants.",
    trailer: "https://www.youtube.com/results?search_query=action+movie+trailer"
  },
  {
    title: "Mazha", year: 2025, language: "Malayalam", genre: "Drama", quality: "HD",
    poster: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=85",
    description: "A warm human drama about memory, home and the people we return to.",
    trailer: "https://www.youtube.com/results?search_query=malayalam+movie+trailer"
  },
  {
    title: "Chennai Nights", year: 2025, language: "Tamil", genre: "Crime", quality: "HD",
    poster: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=85",
    description: "A rookie investigator follows a trail of clues through the city after midnight.",
    trailer: "https://www.youtube.com/results?search_query=tamil+crime+movie+trailer"
  },
  {
    title: "Dil Se Door", year: 2026, language: "Hindi", genre: "Romance", quality: "HD",
    poster: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=85",
    description: "Two strangers meet during a journey and discover that distance changes everything.",
    trailer: "https://www.youtube.com/results?search_query=hindi+romance+movie+trailer"
  },
  {
    title: "Silent Orbit", year: 2024, language: "English", genre: "Sci-Fi", quality: "4K",
    poster: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=700&q=85",
    description: "A lone astronaut wakes to find the mission altered and Earth no longer responding.",
    trailer: "https://www.youtube.com/results?search_query=scifi+movie+trailer"
  },
  {
    title: "Kadal", year: 2026, language: "Malayalam", genre: "Thriller", quality: "HD",
    poster: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=85",
    description: "A coastal mystery begins after a fisherman discovers something impossible at sea.",
    trailer: "https://www.youtube.com/results?search_query=malayalam+thriller+trailer"
  },
  {
    title: "Level Up", year: 2025, language: "Hindi", genre: "Comedy", quality: "HD",
    poster: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=85",
    description: "Three friends accidentally turn a small gaming competition into a nationwide obsession.",
    trailer: "https://www.youtube.com/results?search_query=hindi+comedy+movie+trailer"
  },
  {
    title: "Red Line", year: 2026, language: "Tamil", genre: "Action", quality: "4K",
    poster: "https://images.unsplash.com/photo-1525011268546-bf3f9b007f6a?auto=format&fit=crop&w=700&q=85",
    description: "A suspended officer gets one night to stop a city-wide conspiracy.",
    trailer: "https://www.youtube.com/results?search_query=tamil+action+movie+trailer"
  },
  {
    title: "After Rain", year: 2024, language: "Malayalam", genre: "Romance", quality: "HD",
    poster: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=700&q=85",
    description: "A quiet romance about second chances, old letters and one unexpected reunion.",
    trailer: "https://www.youtube.com/results?search_query=malayalam+romance+trailer"
  }
];

const filters = ["All","Malayalam","Tamil","Hindi","English","Action","Thriller","Romance","Drama","Comedy","Sci-Fi"];
let activeFilter = "All";

const grid = document.getElementById("movieGrid");
const filterWrap = document.getElementById("filters");
const searchInput = document.getElementById("searchInput");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");

function renderFilters(){
  filterWrap.innerHTML = filters.map(f => `<button class="filter-btn ${f===activeFilter?'active':''}" data-filter="${f}">${f}</button>`).join("");
  filterWrap.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    activeFilter = btn.dataset.filter;
    renderFilters();
    renderMovies();
  }));
}

function filteredMovies(){
  const q = searchInput.value.trim().toLowerCase();
  return movies.filter(m => {
    const filterMatch = activeFilter === "All" || m.language === activeFilter || m.genre === activeFilter;
    const haystack = `${m.title} ${m.year} ${m.language} ${m.genre} ${m.quality}`.toLowerCase();
    return filterMatch && haystack.includes(q);
  });
}

function renderMovies(){
  const list = filteredMovies();
  resultCount.textContent = `${list.length} title${list.length===1?'':'s'}`;
  emptyState.classList.toggle("hidden", list.length !== 0);
  grid.innerHTML = list.map((m, i) => `
    <article class="movie-card" data-title="${m.title}">
      <div class="poster-wrap">
        <img src="${m.poster}" alt="${m.title} poster" loading="lazy">
        <span class="quality">${m.quality}</span>
      </div>
      <div class="card-body">
        <h3>${m.title}</h3>
        <div class="card-meta">
          <span>${m.year} • ${m.language}</span>
          <span>${m.genre}</span>
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll(".movie-card").forEach(card => {
    card.addEventListener("click", () => openModal(card.dataset.title));
  });
}

function openModal(title){
  const m = movies.find(x => x.title === title);
  if(!m) return;
  document.getElementById("modalPoster").src = m.poster;
  document.getElementById("modalPoster").alt = `${m.title} poster`;
  document.getElementById("modalMeta").textContent = `${m.year} • ${m.language} • ${m.quality}`;
  document.getElementById("modalTitle").textContent = m.title;
  document.getElementById("modalDescription").textContent = m.description;
  document.getElementById("modalTags").innerHTML = [m.language,m.genre,m.quality].map(x => `<span>${x}</span>`).join("");
  document.getElementById("modalBotBtn").href = `${BOT_URL}?start=${encodeURIComponent(m.title.replace(/\s+/g,'_'))}`;
  document.getElementById("modalTrailerBtn").href = m.trailer;
  const modal = document.getElementById("movieModal");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}

function closeModal(){
  const modal = document.getElementById("movieModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-close-modal]").forEach(el => el.addEventListener("click", closeModal));
document.addEventListener("keydown", e => { if(e.key === "Escape") closeModal(); });
searchInput.addEventListener("input", renderMovies);

renderFilters();
renderMovies();
