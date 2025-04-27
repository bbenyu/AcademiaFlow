/**
 * Core Editor Features
 */
document.addEventListener('DOMContentLoaded', () => {
    // Table of Contents
    document.getElementById('insert-toc').onclick = function() {
        const content = tinymce.activeEditor.getContent({format: 'html'});
        const headings = Array.from(content.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi));
        if (headings.length === 0) {
            alert("No headings found for Table of Contents.");
            return;
        }
        let toc = "<h3>Table of Contents</h3><ul>";
        headings.forEach(h => {
            toc += `<li>${h[2]}</li>`;
        });
        toc += "</ul>";
        tinymce.activeEditor.execCommand('mceInsertContent', false, toc);
    };

    // Export as PDF
    document.getElementById('export-pdf').onclick = function() {
        const win = window.open('', '_blank');
        win.document.write('<html><head><title>Export PDF</title></head><body>');
        win.document.write(tinymce.activeEditor.getContent());
        win.document.write('</body></html>');
        win.document.close();
        win.print();
    };

    // Track Changes (simulated toggle)
    let trackChanges = false;
    document.getElementById('track-changes-toggle').onclick = function() {
        trackChanges = !trackChanges;
        alert(trackChanges ? "Track Changes ON (simulated)" : "Track Changes OFF");
    };

    // Version History
    document.getElementById('open-history').onclick = function() {
        const modal = document.getElementById('history-modal');
        modal.style.display = 'flex';
        let user = localStorage.getItem('academictools_user') || 'default';
        let history = JSON.parse(localStorage.getItem('editor_history_' + user) || "[]");
        modal.innerHTML = `<div class="modal-content" tabindex="0">
            <button class="close-modal" onclick="document.getElementById('history-modal').style.display='none'" aria-label="Close">&times;</button>
            <h3>Version History (last 5 saves)</h3>
            <ul>${history.slice(-5).map((h, i) => `<li>
                <button onclick="tinymce.activeEditor.setContent(\`${h.content.replace(/`/g, '\\`')}\`)">Restore</button>
                <span>${new Date(h.time).toLocaleString()}</span>
            </li>`).join('')}</ul>
        </div>`;
        modal.querySelector('.modal-content').focus();
    };
    // Save to history on every save
    tinymce.init({
        selector: '#editor',
        setup: function(editor) {
            editor.on('SaveContent', function(e) {
                let user = localStorage.getItem('academictools_user') || 'default';
                let history = JSON.parse(localStorage.getItem('editor_history_' + user) || "[]");
                history.push({content: e.content, time: Date.now()});
                localStorage.setItem('editor_history_' + user, JSON.stringify(history.slice(-10)));
            });
        }
    });

    // Help Modal
    document.getElementById('open-help').onclick = function() {
        const modal = document.getElementById('help-modal');
        modal.style.display = 'flex';
        modal.innerHTML = `<div class="modal-content" tabindex="0">
            <button class="close-modal" onclick="document.getElementById('help-modal').style.display='none'" aria-label="Close">&times;</button>
            <h3>Help & Quick Guide</h3>
            <ul>
                <li><b>Ctrl+Shift+R</b>: Open Reference Library</li>
                <li><b>Ctrl+Shift+G</b>: Citation Generator</li>
                <li><b>Ctrl+Shift+P</b>: Plagiarism Check</li>
                <li><b>Ctrl+Shift+H</b>: Version History</li>
                <li><b>Ctrl+Shift+S</b>: Settings</li>
            </ul>
        </div>`;
        modal.querySelector('.modal-content').focus();
    };

    // Settings Modal
    document.getElementById('open-settings').onclick = function() {
        const modal = document.getElementById('settings-modal');
        modal.style.display = 'flex';
        modal.innerHTML = `<div class="modal-content" tabindex="0">
            <button class="close-modal" onclick="document.getElementById('settings-modal').style.display='none'" aria-label="Close">&times;</button>
            <h3>Settings</h3>
            <label>Font Size: <input id="editor-font-size" type="number" min="10" max="36" value="16"> px</label>
            <button onclick="document.body.style.fontSize=document.getElementById('editor-font-size').value+'px'">Apply</button>
            <br>
            <label>Word Goal: <input id="word-goal-input" type="number" min="0" value="0"></label>
            <button onclick="localStorage.setItem('editor_word_goal',document.getElementById('word-goal-input').value)">Set Goal</button>
        </div>`;
        modal.querySelector('.modal-content').focus();
    };

    // Word Goal Tracker
    function updateWordGoal() {
        const text = tinymce.activeEditor.getContent({ format: 'text' });
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        const goal = parseInt(localStorage.getItem('editor_word_goal') || "0", 10);
        let percent = goal ? Math.min(100, Math.round((words/goal)*100)) : 0;
        document.getElementById('word-count').textContent = `Words: ${words} | Characters: ${text.length} | Reading Time: ${Math.max(1, Math.round(words/200))} min | Goal: ${percent}%`;
    }
    setInterval(updateWordGoal, 2000);

    // Keyboard Shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey) {
            switch (e.key.toLowerCase()) {
                case 'r': document.getElementById('open-reference-library').click(); break;
                case 'g': document.getElementById('open-citation-generator').click(); break;
                case 'p': document.getElementById('check-plagiarism').click(); break;
                case 'h': document.getElementById('open-history').click(); break;
                case 's': document.getElementById('open-settings').click(); break;
            }
        }
    });
});