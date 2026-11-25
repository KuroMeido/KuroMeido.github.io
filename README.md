# KuroHitsuji.github.io

Website: [https://kuromeido.github.io](https://kuromeido.github.io)

## Home page

`index.html` is the "Master Plan" home page (no libraries, ES modules):

- `assets/css/home.css` – styles; colour, type and layout tokens in `:root` (the canvases read them too)
- `assets/js/home/data.js` – home content: posts, tools, library. Keep in sync with `assets/js/data.js`, `resources-data.js`, `revit-data.js`
- `assets/js/home/main.js` – entry; `city-map.js`, `blog.js`, `metro.js`, `resources.js`, `board.js`, `lib/`

ES modules need http(s): preview through GitHub Pages or a local server, not by opening the file directly.
