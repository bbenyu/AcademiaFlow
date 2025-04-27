window.PluginAPI.registerPlugin({
  name: "Version History",
  description: "Shows last 5 saves from localStorage, preserving formatting.",
  widget: function() {
    const btn = document.createElement('button');
    btn.textContent = "Version History";
    btn.onclick = function() {
      // Get versions from localStorage
      const versions = JSON.parse(localStorage.getItem('editor_versions') || "[]");
      let modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100vw'; modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.25)';
      modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
      modal.innerHTML = `<div style="background:#fff;padding:24px 32px;border-radius:10px;min-width:320px;max-width:90vw;">
        <h3>Version History</h3>
        <ul style="max-height:200px;overflow:auto;">
          ${versions.map((v,i) => `<li>
            <b>${new Date(v.time).toLocaleString()}</b>
            <button data-idx="${i}">Restore</button>
            <div style="max-width:400px;overflow:auto;border:1px solid #eee;padding:4px 8px;margin:4px 0;">
              ${window.PluginAPI.getQuill().constructor.convertDeltaToHtml ? 
                window.PluginAPI.getQuill().constructor.convertDeltaToHtml(v.delta) :
                window.PluginAPI.getQuill().clipboard.convert(v.delta).outerHTML}
            </div>
          </li>`).join('')}
        </ul>
        <button id="close-ver-modal">Close</button>
      </div>`;
      document.body.appendChild(modal);
      modal.querySelectorAll('button[data-idx]').forEach(btn => {
        btn.onclick = function() {
          const idx = parseInt(btn.getAttribute('data-idx'));
          const quill = window.PluginAPI.getQuill();
          quill.setContents(versions[idx].delta);
          modal.remove();
        };
      });
      document.getElementById('close-ver-modal').onclick = () => modal.remove();
    };
    // Save version on every manual save (hook into export/save button)
    if (!window._versionHistoryHooked) {
      window._versionHistoryHooked = true;
      // Example: save version every 5 minutes or on demand
      setInterval(() => {
        const quill = window.PluginAPI.getQuill();
        const versions = JSON.parse(localStorage.getItem('editor_versions') || "[]");
        versions.unshift({ time: Date.now(), delta: quill.getContents() });
        while (versions.length > 5) versions.pop();
        localStorage.setItem('editor_versions', JSON.stringify(versions));
      }, 5*60*1000);
      // Also expose a manual save function
      window.saveEditorVersion = function() {
        const quill = window.PluginAPI.getQuill();
        const versions = JSON.parse(localStorage.getItem('editor_versions') || "[]");
        versions.unshift({ time: Date.now(), delta: quill.getContents() });
        while (versions.length > 5) versions.pop();
        localStorage.setItem('editor_versions', JSON.stringify(versions));
      }
    }
    return btn;
  }
});
