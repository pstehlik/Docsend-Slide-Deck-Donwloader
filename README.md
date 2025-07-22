# DocSend Slide Deck Downloader
A Chrome extension to download DocSend slides as a PDF.

Forked from [here](https://github.com/MK-EA/Docsend-Slide-Deck-Donwloader) - and updated to work with Chrome in 2025 again.

Download on the Chrome Web Store: TODO

## Installation from source

1. Clone this repository to your machine
2. Navigate to `chrome://extensions/` on Google Chrome.
3. Toggle Developer Mode on the top right if not toggled already.
4. Click Load unpacked and navigate to the directory of this repository and select it.

## Usage

Navigate to any DocSend slide deck page and click on the extension icon on the top right of Google Chrome to generate a PDF of the slide deck.

## Debug Mode

For troubleshooting or development purposes, you can enable debug mode to see detailed console logging:

**Enable Debug Mode:**
Add `?downloaderDebug=true` to the DocSend URL

**Examples:**
- Normal: `https://docsend.com/view/abc123`  
- Debug: `https://docsend.com/view/abc123?downloaderDebug=true`

**Debug Output:**
- Dependency loading status
- API request/response details  
- PDF generation progress
- Error details

**Note:** Debug logs appear in the browser's Developer Console (F12 → Console tab)
