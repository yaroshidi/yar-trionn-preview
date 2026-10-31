// Loader: only pull in three.js when WebGL is actually available; otherwise the CSS Y mark stays.
const probe = document.createElement('canvas');
let ok = false;
try { ok = !!(window.WebGLRenderingContext && (probe.getContext('webgl2') || probe.getContext('webgl'))); } catch (e) { ok = false; }
if (ok) {
  import('./hero3d-scene.js').catch(err => { console.warn('[hero3d] falling back to CSS mark:', err && err.message); document.getElementById('gl')?.remove(); document.documentElement.classList.remove('webgl'); });
} else {
  document.getElementById('gl')?.remove();
}
