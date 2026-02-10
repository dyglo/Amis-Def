<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1lRTO9D9gDURigtjAZA_6iyM7S9UTVnzI

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure [.env.local](.env.local):
   - `SERPER_API_KEY` for Serper.dev news ingestion
   - `OPENAI_API_KEY` for `gpt-4o`/`gpt-4o-mini` reasoning
   - `VITE_GOOGLE_MAPS_API_KEY` for ground recon map views
3. Run the backend proxy:
   `npm run dev:server`
4. Run the app:
   `npm run dev`
