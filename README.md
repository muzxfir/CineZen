# CineZen — TMDB Read Access Token Version

## Vercel setup

Add ONE environment variable:

Name:
TMDB_API_TOKEN

Value:
Paste your TMDB **API Read Access Token** (the long token beginning with `ey...`).

Select Production and Preview, save it, then redeploy.

This version sends the token only from the Vercel serverless API route as:
Authorization: Bearer <token>

Do not put the token in index.html or script.js.

## Telegram
Bot: SRSMOVIEBOT
Channel: CineZenHQ

## Security
If a token/key has been publicly shared in a screenshot or chat, rotate/regenerate it before using the site publicly.


## Website → Telegram bot auto request

Each selected movie opens the bot using:

`https://t.me/SRSMOVIEBOT?start=movie_<TMDB_ID>`

Example:

`https://t.me/SRSMOVIEBOT?start=movie_550`

The bot must handle the `/start movie_<TMDB_ID>` payload to automatically process that selected movie.


## Auto request behavior
The Get Movie button now sends the selected movie title + release year to SRSMOVIEBOT.

Example:
`https://t.me/SRSMOVIEBOT?start=search_Jawan_2023`

The uploaded Auto-Filter-v7 bot source already contains a `search_` deep-link handler that converts this payload into a normal auto-filter search.
