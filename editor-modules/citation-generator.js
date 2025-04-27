/**
 * Citation Generator Modal
 */
window.CitationGenerator = (function() {
    function openModal() {
        const modal = document.getElementById('citation-modal');
        modal.style.display = 'flex';
        modal.innerHTML = `
        <div class="modal-content" tabindex="0">
            <button class="close-modal" onclick="CitationGenerator.closeModal()" aria-label="Close">&times;</button>
            <h3>Citation Generator</h3>
            <form id="citation-form">
                <label>Author: <input name="author" required></label><br>
                <label>Title: <input name="title" required></label><br>
                <label>Year: <input name="year" required></label><br>
                <label>Journal/Publisher: <input name="journal"></label><br>
                <label>Style:
                    <select name="style">
                        <option value="apa">APA</option>
                        <option value="mla">MLA</option>
                        <option value="chicago">Chicago</option>
                    </select>
                </label><br>
                <button type="submit">Generate & Insert</button>
            </form>
        </div>`;
        document.getElementById('citation-form').onsubmit = function(e) {
            e.preventDefault();
            const f = e.target;
            let citation = "";
            if (f.style.value === "apa") {
                citation = `${f.author.value} (${f.year.value}). <i>${f.title.value}</i>. ${f.journal.value}`;
            } else if (f.style.value === "mla") {
                citation = `${f.author.value}. "<i>${f.title.value}</i>." ${f.journal.value}, ${f.year.value}.`;
            } else {
                citation = `${f.author.value}. <i>${f.title.value}</i>. ${f.journal.value}, ${f.year.value}.`;
            }
            tinymce.activeEditor.execCommand('mceInsertContent', false, citation);
            CitationGenerator.closeModal();
        };
        modal.querySelector('.modal-content').focus();
    }
    function closeModal() {
        document.getElementById('citation-modal').style.display = 'none';
    }
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('open-citation-generator');
        if (btn) btn.onclick = openModal;
    });
    return { openModal, closeModal };
})();