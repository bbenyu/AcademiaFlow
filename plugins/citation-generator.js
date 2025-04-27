window.PluginAPI.registerPlugin({
  name: "Citation Generator",
  description: "Generate and insert a citation at the cursor.",
  widget: function() {
    const btn = document.createElement('button');
    btn.textContent = "Citation Generator";
    btn.onclick = () => {
      // Modal for citation input
      let modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100vw'; modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.25)';
      modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
      modal.innerHTML = `<div style="background:#fff;padding:24px 32px;border-radius:10px;min-width:320px;max-width:90vw;">
        <h3>Insert Citation</h3>
        <form id="citation-form">
          <label>Author: <input id="cit-author" required></label><br>
          <label>Year: <input id="cit-year" required></label><br>
          <label>Title: <input id="cit-title" required></label><br>
          <label>Source: <input id="cit-source"></label><br>
          <button type="submit">Insert</button>
          <button type="button" id="close-cit-modal">Cancel</button>
        </form>
      </div>`;
      document.body.appendChild(modal);
      document.getElementById('close-cit-modal').onclick = () => modal.remove();
      document.getElementById('citation-form').onsubmit = function(e) {
        e.preventDefault();
        const author = document.getElementById('cit-author').value;
        const year = document.getElementById('cit-year').value;
        const title = document.getElementById('cit-title').value;
        const source = document.getElementById('cit-source').value;
        const citation = `${author} (${year}). <i>${title}</i>. ${source}`;
        const quill = window.PluginAPI.getQuill();
        const range = quill.getSelection(true);
        quill.insertText(range ? range.index : 0, citation, { italic: true });
        modal.remove();
      };
    };
    return btn;
  }
});