// Helper: Get selected text and its coordinates
function getSelectionCoords() {
    const sel = window.getSelection();
    if (sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0).cloneRange();
    let rect = range.getBoundingClientRect();
    return {
        text: sel.toString(),
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY
    };
}

// Create and show the custom context menu
function showReferenceMenu(x, y, selectedText) {
    let menu = document.getElementById('reference-context-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'reference-context-menu';
        menu.style.position = 'absolute';
        menu.style.zIndex = 9999;
        menu.style.background = '#fff';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '6px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        menu.style.padding = '8px 12px';
        menu.style.cursor = 'pointer';
        menu.style.fontSize = '1em';
        document.body.appendChild(menu);
    }
    menu.textContent = 'Check Reference';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
    menu.onclick = async function() {
        menu.style.display = 'none';
        await showReferenceResults(selectedText, x, y + 30);
    };
}

// Hide the custom menu
function hideReferenceMenu() {
    const menu = document.getElementById('reference-context-menu');
    if (menu) menu.style.display = 'none';
}

// Show reference results popup
async function showReferenceResults(text, x, y) {
    let popup = document.getElementById('reference-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'reference-popup';
        popup.style.position = 'absolute';
        popup.style.zIndex = 10000;
        popup.style.background = '#fff';
        popup.style.border = '1px solid #007bff';
        popup.style.borderRadius = '8px';
        popup.style.boxShadow = '0 2px 12px rgba(0,123,255,0.15)';
        popup.style.padding = '12px 18px';
        popup.style.minWidth = '320px';
        document.body.appendChild(popup);
    }
    popup.innerHTML = `<b>Searching references for:</b> <i>${text}</i><br>Loading...`;
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    popup.style.display = 'block';

    // Use DuckDuckGo search for top 3 results
    const url = `https://api.duckduckgo.com/?q="${encodeURIComponent(text)}"&format=json&no_redirect=1&no_html=1`;
    try {
        const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const data = await resp.json();
        let results = [];
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            results = data.RelatedTopics.slice(0, 3).map(t => ({
                title: t.Text || t.Result || "Result",
                url: t.FirstURL || "#"
            }));
        }
        if (results.length === 0) {
            popup.innerHTML = `<b>No references found for:</b> <i>${text}</i>`;
        } else {
            popup.innerHTML = `<b>References for:</b> <i>${text}</i><ul style="margin-top:8px;">` +
                results.map(r => `<li><a href="${r.url}" target="_blank">${r.title}</a></li>`).join('') +
                `</ul><button onclick="document.getElementById('reference-popup').style.display='none'">Close</button>`;
        }
    } catch {
        popup.innerHTML = `<b>Error searching references.</b>`;
    }
}

// Listen for right-click in the editor
document.addEventListener('DOMContentLoaded', function() {
    const editor = document.getElementById('editor');
    if (!editor) return;
    editor.addEventListener('contextmenu', function(e) {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0) {
            e.preventDefault();
            const coords = getSelectionCoords();
            showReferenceMenu(coords.x, coords.y, sel.toString());
        } else {
            hideReferenceMenu();
        }
    });
    document.addEventListener('click', hideReferenceMenu);
});

// For short selections, add a "Note" button next to the selection
function addNoteButtonForSelection() {
    const sel = window.getSelection();
    if (!sel || sel.toString().length === 0 || sel.toString().length > 20) return;
    const coords = getSelectionCoords();
    let noteBtn = document.getElementById('note-btn');
    if (!noteBtn) {
        noteBtn = document.createElement('button');
        noteBtn.id = 'note-btn';
        noteBtn.textContent = 'Note';
        noteBtn.style.position = 'absolute';
        noteBtn.style.zIndex = 9999;
        noteBtn.style.background = '#ffc107';
        noteBtn.style.border = 'none';
        noteBtn.style.borderRadius = '4px';
        noteBtn.style.padding = '2px 8px';
        noteBtn.style.fontSize = '0.9em';
        noteBtn.onclick = function() {
            showReferenceResults(sel.toString(), coords.x, coords.y + 30);
        };
        document.body.appendChild(noteBtn);
    }
    noteBtn.style.left = (coords.x + 10) + 'px';
    noteBtn.style.top = (coords.y - 10) + 'px';
    noteBtn.style.display = 'block';
}
document.addEventListener('mouseup', function() {
    setTimeout(() => {
        const sel = window.getSelection();
        if (sel && sel.toString().length > 0 && sel.toString().length <= 20) {
            addNoteButtonForSelection();
        } else {
            const noteBtn = document.getElementById('note-btn');
            if (noteBtn) noteBtn.style.display = 'none';
        }
    }, 10);
});