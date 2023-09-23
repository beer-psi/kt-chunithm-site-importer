# kt-chunithm-site-importer

Import scores from https://chunithm-net-eng.com/mobile to Kamaitachi

## Features
- [x] Import recent scores
- [x] Import PBs

## Installation
### With a userscript manager

1. Install a userscript manager (e.g. Greasemonkey or Tampermonkey).
2. Click [here](https://github.com/beerpiss/kt-chunithm-site-importer/raw/trunk/docs/kt-chunithm-site-importer.user.js).

### With a bookmarklet
(view this site from <https://beerpiss.github.io/kt-chunithm-site-importer/>)

1. Bookmark this link by dragging it to the bookmarks bar: [Kamaitachi CHUNITHM Site Importer](javascript:void(function(d){if(d.location.host==='chunithm-net-eng.com')document.body.appendChild(document.createElement('script')).src='https://beerpiss.github.io/kt-chunithm-site-importer/kt-chunithm-site-importer.min.js?t='+Math.floor(Date.now()/60000)})(document);).

## Usage
1. Go to [CHUNITHM-NET](https://chunithm-net-eng.com/mobile) and log in.
2. Set up your API key following the instructions you see on the page.
3. ALWAYS IMPORT RECENT SCORES FIRST.
4. Jump to recent scores page, and click the "Import recent scores" button.
5. To backfill all PBs, jump to the PBs page and click the "Import all PBs" button.
