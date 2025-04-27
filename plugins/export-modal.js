window.PluginAPI.registerPlugin({
  name: "Export Modal",
  description: "Export your document in multiple formats.",
  widget: function() {
    const btn = document.createElement('button');
    btn.textContent = "Export";
    btn.onclick = function() {
      // Modal
      let modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100vw'; modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.25)';
      modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
      modal.innerHTML = `<div style="background:#fff;padding:24px 32px;border-radius:10px;min-width:320px;max-width:90vw;">
        <h3>Export Document</h3>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <button id="export-pdf">Export as PDF</button>
          <button id="export-docx">Export as DOCX</button>
          <button id="export-md">Export as Markdown</button>
          <button id="export-html">Export as HTML</button>
          <button id="export-txt">Export as Plain Text</button>
        </div>
        <button id="close-export-modal" style="margin-top:16px;">Close</button>
      </div>`;
      document.body.appendChild(modal);

      // Export handlers
      const quill = window.PluginAPI.getQuill();

      // PDF (uses print for simplicity)
      document.getElementById('export-pdf').onclick = function() {
        const win = window.open('', '_blank');
        win.document.write('<html><head><title>Export PDF</title></head><body>');
        win.document.write(quill.root.innerHTML);
        win.document.write('</body></html>');
        win.document.close();
        win.print();
      };

      // DOCX (uses html-docx-js)
      document.getElementById('export-docx').onclick = async function() {
        // Load html-docx-js if not present
        if (!window.htmlDocx) {
          const script = document.createElement('script');
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-docx-js/0.4.1/html-docx.js";
          document.body.appendChild(script);
          await new Promise(res => script.onload = res);
        }
        const html = quill.root.innerHTML;
        const docx = window.htmlDocx.asBlob(html);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(docx);
        a.download = "document.docx";
        a.click();
        URL.revokeObjectURL(a.href);
      };

      // Markdown (simple conversion)
      document.getElementById('export-md').onclick = function() {
        const html = quill.root.innerHTML;
        // Simple HTML to Markdown (for demo)
        let md = html
          .replace(/<h1>(.*?)<\/h1>/g, '# $1\n')
          .replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
          .replace(/<h3>(.*?)<\/h3>/g, '### $1\n')
          .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
          .replace(/<b>(.*?)<\/b>/g, '**$1**')
          .replace(/<em>(.*?)<\/em>/g, '*$1*')
          .replace(/<i>(.*?)<\/i>/g, '*$1*')
          .replace(/<ul>/g, '').replace(/<\/ul>/g, '')
          .replace(/<ol>/g, '').replace(/<\/ol>/g, '')
          .replace(/<li>(.*?)<\/li>/g, '- $1\n')
          .replace(/<br\s*\/?>/g, '\n')
          .replace(/<[^>]+>/g, '');
        const blob = new Blob([md], { type: "text/markdown" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "document.md";
        a.click();
        URL.revokeObjectURL(a.href);
      };

      // HTML
      document.getElementById('export-html').onclick = function() {
        const html = quill.root.innerHTML;
        const blob = new Blob([html], { type: "text/html" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "document.html";
        a.click();
        URL.revokeObjectURL(a.href);
      };

      // Plain Text
      document.getElementById('export-txt').onclick = function() {
        const text = quill.getText();
        const blob = new Blob([text], { type: "text/plain" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "document.txt";
        a.click();
        URL.revokeObjectURL(a.href);
      };

      document.getElementById('close-export-modal').onclick = () => modal.remove();
    };
    return btn;
  }
});