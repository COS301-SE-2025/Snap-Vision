// scripts/inject-maptiler-key.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const htmlPath = path.join(__dirname, '../android/app/src/main/assets/leaflet.html');
let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace('MAPTILER_API_KEY_PLACEHOLDER', process.env.MAPTILER_API_KEY);
fs.writeFileSync(htmlPath, html);
console.log('MapTiler API key injected into leaflet.html');