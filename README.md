# Wireless Mic Pro — Proper Full Version

Upload/replace these 5 files in the existing GitHub repository:
- index.html
- server.js
- package.json
- render.yaml
- README.md

Render will auto-deploy after the commit.

Main features:
- Master login
- 6-digit room code
- Mic Phone live microphone -> Master Phone speaker via WebRTC
- Master output volume
- Mic gain/amplifier
- Bass, treble, echo, delay
- Master remote mute/unmute
- Mic live meter and Master incoming meter
- YouTube URL/Video ID playback
- YouTube play/pause/stop/music volume
- YouTube search endpoint (optional YOUTUBE_API_KEY environment variable)

Important:
1. Open the SAME Render HTTPS URL on both phones.
2. On Master: login -> Generate Connection Code -> tap Enable / Resume Speaker.
3. On Mic Phone: enter code -> Connect & Start Live Mic -> allow microphone permission.
4. Pair Bluetooth speaker/headset from the phone's Bluetooth settings.
5. Some restrictive mobile networks may require a TURN server for WebRTC. Public STUN is included but cannot guarantee every carrier/NAT combination.
6. For YouTube search, create a YouTube Data API v3 key and add Render environment variable:
   YOUTUBE_API_KEY = your_key
   Direct URL/Video ID playback does not require this key.
