# CineZen — TMDB + Vercel

This version loads live movie data from TMDB and keeps your TMDB API key on the server side using a Vercel Environment Variable.

## Deploy to Vercel

1. Upload all files/folders in this project to a GitHub repository.
2. Import the repository into Vercel.
3. Open Vercel Project → Settings → Environment Variables.
4. Add:
   - Name: `TMDB_API_KEY`
   - Value: your TMDB v3 API key
   - Enable it for Production (and Preview if wanted).
5. Redeploy the project after adding/changing the environment variable.

Do NOT place the API key inside `script.js` or `index.html`.

## Features

- Live popular/discover movie catalog
- Search movie database
- Genre filter
- Language filter
- Popular / Top Rated / Latest sorting
- Poster, year, rating and original language
- Movie detail modal
- TMDB rating
- IMDb button when TMDB supplies an IMDb ID
- YouTube trailer when available
- Telegram Get Movie button → `SADIEMOLBOT`
- Channel button → `CineZenHQ`
- Pagination / Load More
- Mobile responsive

## Telegram bot deep link

Movie detail buttons use this format:

`https://t.me/SADIEMOLBOT?start=movie_<TMDB_ID>`

Your Telegram bot can read that `/start` parameter and return the matching authorized content or information.

## Important

TMDB supplies movie metadata, not movie files. Only publish or distribute content you are authorized to share.

This product uses the TMDB API but is not endorsed or certified by TMDB.
