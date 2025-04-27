window.PluginAPI.registerPlugin({
  name: "Context Menu",
  description: "Custom context menu for selected text.",
  onRegister: function() {
    const quill = window.PluginAPI.getQuill();
    let menu = null;
    quill.root.addEventListener('contextmenu', function(e) {
      const selection = quill.getSelection();
      if (!selection || selection.length === 0) return; // Only show if text is selected
      e.preventDefault();
      // Remove old menu
      if (menu) menu.remove();
      menu = document.createElement('div');
      menu.style.position = 'fixed';
      menu.style.left = e.clientX + 'px';
      menu.style.top = e.clientY + 'px';
      menu.style.background = '#fff';
      menu.style.border = '1px solid #ccc';
      menu.style.borderRadius = '6px';
      menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      menu.style.zIndex = 10000;
      menu.innerHTML = `
        <button id="ctx-check-ref" style="display:block;width:100%;border:none;background:none;padding:8px;">Check Reference</button>
        <button id="ctx-note" style="display:block;width:100%;border:none;background:none;padding:8px;">Note</button>
      `;
      document.body.appendChild(menu);
      // Actions
      document.getElementById('ctx-check-ref').onclick = function() {
        const text = quill.getText(selection.index, selection.length);
        window.open('https://duckduckgo.com/?q=' + encodeURIComponent(text), '_blank');
        menu.remove();
      };
      document.getElementById('ctx-note').onclick = function() {
        const note = prompt("Add a note for this selection:");
        if (note) {
          quill.formatText(selection.index, selection.length, { background: '#b2f2ff' });
          // Optionally, store note in a map for later retrieval
        }
        menu.remove();
      };
      // Remove menu on click elsewhere
      document.addEventListener('click', function handler() {
        if (menu) menu.remove();
        document.removeEventListener('click', handler);
      });
    });
  }
});