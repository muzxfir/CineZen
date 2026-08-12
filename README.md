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
Bot: SADIEMOLBOT
Channel: CineZenHQ

## Security
If a token/key has been publicly shared in a screenshot or chat, rotate/regenerate it before using the site publicly.
