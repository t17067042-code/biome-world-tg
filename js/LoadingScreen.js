/**
 * Simple loading overlay while AssetManager preloads.
 */
const LoadingScreen = (() => {
  let el = null;

  function show(title = 'Biome World') {
    if (el) return;
    el = document.createElement('div');
    el.id = 'loadingScreen';
    el.innerHTML = `
      <style>
        #loadingScreen{position:fixed;inset:0;z-index:9999;background:#1a2a1c;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#e8e8f0;font-family:system-ui,sans-serif}
        #loadingScreen .ls-title{font-size:22px;font-weight:800;color:#7ec8ff;letter-spacing:1px;margin-bottom:6px}
        #loadingScreen .ls-sub{font-size:12px;color:#888;margin-bottom:24px}
        #loadingScreen .ls-bar{width:min(260px,70vw);height:8px;background:rgba(255,255,255,.1);border-radius:4px;overflow:hidden}
        #loadingScreen .ls-fill{height:100%;width:0%;background:linear-gradient(90deg,#4caf50,#ffd76a);transition:width .2s}
        #loadingScreen .ls-pct{margin-top:10px;font-size:11px;color:#aaa}
      </style>
      <div class="ls-title">${title}</div>
      <div class="ls-sub">CRYPTO FRONTIER</div>
      <div class="ls-bar"><div class="ls-fill" id="lsFill"></div></div>
      <div class="ls-pct" id="lsPct">0%</div>
    `;
    document.body.appendChild(el);
  }

  function setProgress(loaded, total) {
    if (!el) return;
    const pct = total > 0 ? Math.floor((loaded / total) * 100) : 0;
    const fill = el.querySelector('#lsFill');
    const label = el.querySelector('#lsPct');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = `${pct}% · ${loaded}/${total}`;
  }

  function hide() {
    if (!el) return;
    el.style.transition = 'opacity .4s';
    el.style.opacity = '0';
    setTimeout(() => {
      el?.remove();
      el = null;
    }, 400);
  }

  return { show, setProgress, hide };
})();

if (typeof window !== 'undefined') window.LoadingScreen = LoadingScreen;
// export default LoadingScreen;
