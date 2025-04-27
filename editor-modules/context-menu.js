/**
 * Context Menu Module
 * - Shows only when text is selected
 * - "Check Reference" fetches sources for selection
 * - "Note" for short selections (shows sticky note)
 */
window.ContextMenu = (function() {
    function getSelectionText() {
        return tinymce.activeEditor.selection.getContent({format: 'text'}).trim();
    }

    function showMenu(x, y, options) {
        const menu = document.getElementById('reference-context-menu');
        menu.innerHTML = '';
        options.forEach(opt => {
            const div = document.createElement('div');
            div.className = 'context-menu-item';
            div.tabIndex = 0;
            div.textContent = opt.label;
            div.onclick = opt.action;
            div.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") opt.action(); };
            menu.appendChild(div);
        });
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
    }

    function hideMenu() {
        document.getElementById('reference-context-menu').style.display = 'none';
    }

    async function checkReferenceAction() {
        const text = getSelectionText();
        if (!text) return;
        const url = `https://api.duckduckgo.com/?q="${encodeURIComponent(text)}"&format=json&no_redirect=1&no_html=1`;
        showSpinner();
        let sources = [];
        try {
            const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
            const data = await resp.json();
            if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                sources = data.RelatedTopics.slice(0, 3).map(t => ({
                    title: t.Text || t.Result || "Result",
                    url: t.FirstURL || "#"
                }));
            }
        } catch {}
        hideSpinner();
        const modal = document.getElementById('plagiarism-report');
        modal.style.display = 'block';
        if (sources.length === 0) {
            modal.innerHTML = `<b>No references found for:</b> <i>${text}</i>`;
        } else {
            modal.innerHTML = `<b>References for:</b> <i>${text}</i><ul>` +
                sources.map(r => `<li><a href="${r.url}" target="_blank">${r.title}</a></li>`).join('') +
                `</ul><button onclick="document.getElementById('plagiarism-report').style.display='none'">Close</button>`;
        }
    }

    function noteAction() {
        const text = getSelectionText();
        if (!text) return;
        const note = prompt("Add a note for this selection:", "");
        if (note) {
            // Insert a note marker in the editor
            tinymce.activeEditor.selection.setContent(
                `<span class="note-marker" title="${note}" tabindex="0" aria-label="Note">${text}</span>`
            );
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        tinymce.init({
            selector: '#editor'
        });
        const editorEl = document.getElementById('editor');
        editorEl && editorEl.addEventListener('contextmenu', function(e) {
            setTimeout(() => {
                const text = getSelectionText();
                if (text.length > 0) {
                    e.preventDefault();
                    const opts = [
                        { label: "Check Reference", action: checkReferenceAction }
                    ];
                    if (text.length <= 20) {
                        opts.push({ label: "Note", action: noteAction });
                    }
                    showMenu(e.pageX, e.pageY, opts);
                } else {
                    hideMenu();
                }
            }, 10);
        });
        document.addEventListener('click', hideMenu);
    });

    return {};
})();