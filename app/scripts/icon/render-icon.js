// Renders the Take My Pill app icon: magenta blister pack, 2x2 cells, three white pills, bottom-right taken.
const sharp = require('sharp');
const fs = require('fs');

const S = 1024;
const PINK = '#E2288C';
const PINK_DEEP = '#C3127A';
const PINK_LIGHT = '#F05BAA';

// cell centers (2x2), generous spacing so the iOS mask never clips a dome
const cells = [
  { x: 326, y: 326 },
  { x: 698, y: 326 },
  { x: 326, y: 698 },
  { x: 698, y: 698, empty: true },
];
const DOME_R = 150; // blister dome radius
const PILL_R = 124; // pill radius

function fullCell({ x, y }) {
  return `
  <circle cx="${x}" cy="${y}" r="${DOME_R}" fill="url(#dome)" />
  <circle cx="${x}" cy="${y}" r="${DOME_R}" fill="none" stroke="url(#domeRim)" stroke-width="6" />
  <path d="M ${x - 108} ${y - 86} A 142 142 0 0 1 ${x + 4} ${y - 146}" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="10" stroke-linecap="round" />
  <ellipse cx="${x + 10}" cy="${y + 24}" rx="${PILL_R + 4}" ry="${PILL_R - 6}" fill="#8A0A56" fill-opacity="0.4" />
  <circle cx="${x}" cy="${y}" r="${PILL_R}" fill="url(#pill)" />
  <path d="M ${x - 78} ${y - 62} A 98 98 0 0 1 ${x + 4} ${y - 106}" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="12" stroke-linecap="round" />
  <ellipse cx="${x - 30}" cy="${y - 40}" rx="36" ry="22" fill="#FFFFFF" fill-opacity="0.5" />
  `;
}

function emptyCell({ x, y }) {
  // Pressed-through cell: just the dark cavity, with depth from an inner shadow and a faint rim.
  return `
  <circle cx="${x}" cy="${y}" r="${DOME_R}" fill="url(#domeEmpty)" />
  <circle cx="${x}" cy="${y}" r="${DOME_R}" fill="none" stroke="url(#domeRim)" stroke-width="6" />
  <circle cx="${x}" cy="${y}" r="${DOME_R * 0.84}" fill="url(#cavity)" />
  <!-- inner shadow: darker crescent at the top-left, like light coming from top-left -->
  <path d="M ${x - 118} ${y - 30} A 126 126 0 0 1 ${x + 20} ${y - 124} A 100 100 0 0 0 ${x - 96} ${y - 20} Z" fill="#2A0419" fill-opacity="0.55" />
  <!-- faint light catching the far bottom-right wall -->
  <path d="M ${x + 40} ${y + 112} A 126 126 0 0 0 ${x + 116} ${y + 36} A 104 104 0 0 1 ${x + 36} ${y + 96} Z" fill="#FF8FCB" fill-opacity="0.28" />
  `;
}

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PINK_LIGHT}" />
      <stop offset="0.5" stop-color="${PINK}" />
      <stop offset="1" stop-color="${PINK_DEEP}" />
    </linearGradient>
    <pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="14" height="14" fill="none" />
      <line x1="0" y1="0" x2="0" y2="14" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="2" />
      <line x1="0" y1="0" x2="14" y2="0" stroke="#000000" stroke-opacity="0.035" stroke-width="2" />
    </pattern>
    <radialGradient id="dome" cx="0.38" cy="0.32" r="0.75">
      <stop offset="0" stop-color="#FF8FCB" />
      <stop offset="0.55" stop-color="${PINK}" />
      <stop offset="1" stop-color="#A80E68" />
    </radialGradient>
    <radialGradient id="domeEmpty" cx="0.5" cy="0.5" r="0.6">
      <stop offset="0" stop-color="#B2126F" />
      <stop offset="1" stop-color="#C9177B" />
    </radialGradient>
    <linearGradient id="domeRim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.65" />
      <stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0.08" />
      <stop offset="1" stop-color="#7A0A4C" stop-opacity="0.6" />
    </linearGradient>
    <radialGradient id="pill" cx="0.4" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#FFFFFF" />
      <stop offset="0.55" stop-color="#F7F2E8" />
      <stop offset="1" stop-color="#D9CFBE" />
    </radialGradient>
    <radialGradient id="cavity" cx="0.5" cy="0.5" r="0.6">
      <stop offset="0" stop-color="#5C0638" />
      <stop offset="1" stop-color="#8E0D59" />
    </radialGradient>
    <radialGradient id="cavityDeep" cx="0.5" cy="0.5" r="0.6">
      <stop offset="0" stop-color="#2A0419" />
      <stop offset="1" stop-color="#5C0638" />
    </radialGradient>
    <linearGradient id="foilB" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F7F7F9" />
      <stop offset="0.5" stop-color="#C4C4CC" />
      <stop offset="1" stop-color="#ECECF0" />
    </linearGradient>
    <linearGradient id="foil" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" />
      <stop offset="0.35" stop-color="#D9D9DE" />
      <stop offset="0.6" stop-color="#F4F4F6" />
      <stop offset="1" stop-color="#B9B9C2" />
    </linearGradient>
  </defs>

  <rect width="${S}" height="${S}" fill="url(#bg)" />
  <rect width="${S}" height="${S}" fill="url(#hatch)" />

  ${cells.map((c) => (c.empty ? emptyCell(c) : fullCell(c))).join('\n')}
</svg>`;

fs.writeFileSync('icon.svg', svg);
sharp(Buffer.from(svg)).png().toFile('icon-1024.png').then(() =>
  sharp('icon-1024.png').resize(256, 256).png().toFile('icon-preview.png'),
).then(() => console.log('rendered icon-1024.png + icon-preview.png'));
