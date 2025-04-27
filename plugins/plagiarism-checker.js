window.PluginAPI.registerPlugin({
  name: "Plagiarism Checker",
  description: "Checks for plagiarism by highlighting suspect sentences.",
  widget: function() {
    const btn = document.createElement('button');
    btn.textContent = "Plagiarism Check";
    btn.onclick = () => {
      const quill = window.PluginAPI.getQuill();
      const text = quill.getText();
      // Split into sentences (simple split)
      const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
      // Randomly pick some sentences as "plagiarized"
      const suspectIdx = [];
      for (let i = 0; i < sentences.length; ++i) {
        if (Math.random() < 0.25) suspectIdx.push(i);
      }
      // Remove old highlights
      quill.formatText(0, quill.getLength(), 'background', false);
      // Highlight suspects
      let pos = 0;
      sentences.forEach((sent, idx) => {
        if (suspectIdx.includes(idx)) {
          quill.formatText(pos, sent.length, { background: '#ffe066' });
        }
        pos += sent.length;
      });
      // Show modal with dummy sources
      if (suspectIdx.length) {
        let modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100vw'; modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.25)';
        modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
        modal.innerHTML = `<div style="background:#fff;padding:24px 32px;border-radius:10px;min-width:320px;max-width:90vw;">
          <h3>Plagiarism Suspects</h3>
          <ul>${suspectIdx.map(idx => `<li><b>Sentence:</b> ${sentences[idx]}<br><b>Sources:</b> <a href="https://duckduckgo.com/?q=${encodeURIComponent(sentences[idx])}" target="_blank">Search DuckDuckGo</a></li>`).join('')}</ul>
          <button id="close-plag-modal">Close</button>
        </div>`;
        document.body.appendChild(modal);
        document.getElementById('close-plag-modal').onclick = () => modal.remove();
      } else {
        alert("No plagiarism detected!");
      }
    };
    return btn;
  }
});