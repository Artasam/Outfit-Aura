---
title: OutfitAura Backend
emoji: 👗
colorFrom: purple
colorTo: pink
sdk: docker
pinned: false
app_port: 7860
---

## Required environment variables

- `GROQ_API_KEY`: API key used to initialize the Groq chat client.

If this variable is not configured, the app will still start, but the `/chat` endpoint will return a 503 error until the key is provided.
