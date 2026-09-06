import {Game} from './core/game';
import './surface.css';
try { new Game(); } catch(error) { console.error(error); document.getElementById('app')!.innerHTML='<main class="launch-error"><h1>Navapur needs a graphics-enabled browser.</h1><p>Enable hardware acceleration in Chrome or Edge, then reload the city.</p><button onclick="location.reload()">Reload Navapur</button><details><summary>Technical details</summary><pre></pre></details></main>';document.querySelector('pre')!.textContent=String(error); }
