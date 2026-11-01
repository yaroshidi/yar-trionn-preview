// Loader: only pull in three.js when WebGL is actually available; otherwise the CSS Y mark stays.
const probe = document.createElement('canvas');
let ok = false;
try { ok = !!(window.WebGLRenderingContext && (probe.getContext('webgl2') || probe.getContext('webgl'))); } catch (e) { ok = false; }
if (ok) {
  import('./hero3d-scene.min.js').catch(err => { console.warn('[hero3d] falling back to CSS mark:', err && err.message); document.getElementById('gl')?.remove(); document.documentElement.classList.remove('webgl'); window.__glReady = true; dispatchEvent(new Event('yar:gl')); });
} else {
  document.getElementById('gl')?.remove(); window.__glReady = true; dispatchEvent(new Event('yar:gl'));
}
