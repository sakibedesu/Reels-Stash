# Reel Stash

A simple browser extension that adds a **Save** button to Instagram reels, so you can keep the links in your own collections.

## Features

- **One-click save:** A floating Save button appears on Instagram reels and saves the link to your last used collection.
- **Collections:** Create as many as you like, and save the same reel to more than one.
- **Toolbar popup:** Browse, copy, or delete saved links quickly.
- **Full page view:** Search your links, add notes, move links between collections, and rename or delete collections.
- **Export and backup:** Copy links, export a `.txt` list, or make a `.json` backup and import it later.
- **Private:** Everything is stored locally in your browser. Nothing is sent anywhere.

## Install

Works in Chrome, Brave, and Edge.

1. Download or clone this repository.
2. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select this folder.
5. Refresh any open Instagram tabs.

## Usage

1. Open a reel on Instagram.
2. Click **Save** to add it to your last used collection, or click the arrow next to it to pick a collection or create a new one.
3. Click the extension icon to see your saved reels, or open the full page for search, notes, and export.

## Notes

- Only the link is saved, not the caption, title, or thumbnail.
- Instagram changes its site often, so the button may occasionally need an update.
- This project is not affiliated with or endorsed by Instagram or Meta.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension configuration |
| `content.js` | The Save button on Instagram |
| `popup.html` / `popup.js` | Toolbar popup |
| `manager.html` / `manager.js` | Full page view |
| `shared.js` | Storage and helper functions |
| `background.js` | Opens the full page |
| `common.css` | Shared styles |
