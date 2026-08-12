# CineZen Public Website — Now Available Integration

This version keeps the full TMDB catalog/search, and also reads your Firebase Firestore `latest_movies` collection.

- Full TMDB catalog remains visible.
- Separate "Now Available on CineZen" section shows only movies published from your admin site.
- "Get Movie on Telegram" is active only for movies present in `latest_movies`.
- Other movies show "Not Available Yet".
- Telegram bot: @SRSMOVIEBOT

Vercel still needs `TMDB_API_TOKEN` for the TMDB proxy API.
