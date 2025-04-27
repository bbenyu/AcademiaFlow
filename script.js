let snippetCount = 0;
let preferences = JSON.parse(localStorage.getItem('preferences')) || {};
let customStyle = localStorage.getItem('customStyle') || '{author}, {year}, {title}';
let wordGoal = parseInt(localStorage.getItem('wordGoal')) || 0;
let timerInterval = null;
let timerSeconds = 25 * 60;
let timerMinutes = 25;
const breakMinutes = 5;
let isWorkSession = true;
let currentCitationIndex = null;
let goalReached = false;

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function countWords(text) {
    const cleanText = text.trim();
    return cleanText.split(/\s+/).filter(w => w.length > 0).length;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function addSnippet() {
    snippetCount++;
    const container = document.getElementById('snippets-container');
    const newSnippet = document.createElement('div');
    newSnippet.className = 'snippet';
    newSnippet.draggable = true;
    newSnippet.setAttribute('tabindex', '0');
    newSnippet.innerHTML = `
        <h3 class="snippet-header">Text Snippet ${snippetCount}</h3>
        <textarea id="snippet${snippetCount}" class="snippet-content" aria-label="Text Snippet ${snippetCount}"></textarea>
        <div class="snippet-meta">
            <span id="word-count${snippetCount}">Words: 0</span>
            <div><label>Category:</label></div>
            <select id="source${snippetCount}" aria-label="Source type for Snippet ${snippetCount}">
                <option value="book">Book</option>
                <option value="journal">Journal</option>
                <option value="website">Website</option>
                <option value="other">Other</option>
            </select>
        </div>
        <div class="tooltip">
            <input type="text" id="ref${snippetCount}" placeholder="${getPlaceholder()}" aria-label="Reference for Snippet ${snippetCount}">
            <span class="tooltiptext" id="ref-tooltip${snippetCount}">${getPlaceholder()}</span>
            <button onclick="formatCitation(${snippetCount})" aria-label="Format citation for Snippet ${snippetCount}">Format</button>
        </div>
        <span id="error${snippetCount}" class="error"></span>
        <span id="correct${snippetCount}" class="correct">Correct</span>
    `;
    container.appendChild(newSnippet);
    newSnippet.scrollIntoView({ behavior: 'smooth' });
    addDragEvents(newSnippet);
    updatePreview();
    autoSave();
}

function getPlaceholder() {
    const style = document.getElementById('citationStyle').value;
    switch (style) {
        case 'apa': return 'e.g., Smith, J. (2020). Title. Journal.';
        case 'mla': return 'e.g., Smith, John. "Title." Journal, 2020.';
        case 'chicago': return 'e.g., Smith, John. 2020. "Title." Journal.';
        case 'custom': return `e.g., ${customStyle.replace('{author}', 'Smith').replace('{year}', '2020').replace('{title}', 'Title')}`;
        default: return 'Reference';
    }
}

function validateReference(ref, style, index) {
    const patterns = {
        apa: /^[\w\s]+,\s*[\w\s]+\.\s*\(\d{4}\)\.\s*.+$/,
        mla: /^[\w\s]+,\s*[\w\s]+\.\s*".+"\.\s*.+,\s*\d{4}\.$/,
        chicago: /^[\w\s]+,\s*[\w\s]+\.\s*\d{4}\.\s*".+"\.\s*.+$/,
        custom: new RegExp(customStyle.replace('{author}', '[\\w\\s]+').replace('{year}', '\\d{4}').replace('{title}', '.+'))
    };
    const errorSpan = document.getElementById(`error${index + 1}`);
    const correctSpan = document.getElementById(`correct${index + 1}`);
    if (!ref) {
        errorSpan.style.display = 'none';
        correctSpan.style.display = 'none';
        return true;
    }
    if (patterns[style]?.test(ref)) {
        errorSpan.style.display = 'none';
        correctSpan.style.display = 'block';
        return true;
    } else {
        errorSpan.innerText = `Incorrect citation for ${style.toUpperCase()} format.`;
        errorSpan.style.display = 'block';
        correctSpan.style.display = 'none';
        return false;
    }
}

function updateValidation(index) {
    const ref = document.getElementById(`ref${index}`)?.value || '';
    validateReference(ref, document.getElementById('citationStyle').value, index - 1);
}

function updatePlaceholders() {
    for (let i = 1; i <= snippetCount; i++) {
        const refInput = document.getElementById(`ref${i}`);
        if (refInput) {
            refInput.placeholder = getPlaceholder();
            const tooltip = document.getElementById(`ref-tooltip${i}`);
            if (tooltip) tooltip.innerText = getPlaceholder();
            validateReference(refInput.value, document.getElementById('citationStyle').value, i - 1);
        }
    }
    updatePreview();
}

function formatCitation(index) {
    currentCitationIndex = index;
    document.getElementById('format-author').value = '';
    document.getElementById('format-year').value = '';
    document.getElementById('format-title').value = '';
    document.getElementById('format-journal').value = '';
    document.getElementById('citation-format-modal').style.display = 'block';
}

function applyFormattedCitation() {
    const author = document.getElementById('format-author').value;
    const year = document.getElementById('format-year').value;
    const title = document.getElementById('format-title').value;
    const journal = document.getElementById('format-journal').value;
    if (!author || !year || !title) {
        alert('Please fill in author, year, and title.');
        return;
    }
    const style = document.getElementById('citationStyle').value;
    let formatted = '';
    switch (style) {
        case 'apa': formatted = `${author}. (${year}). ${title}. ${journal}.`; break;
        case 'mla': formatted = `${author.split(', ')[0].split(' ')[1]}, ${author.split(', ')[0].split(' ')[0]}. "${title}." ${journal}, ${year}.`; break;
        case 'chicago': formatted = `${author}. ${year}. "${title}." ${journal}.`; break;
        case 'custom': formatted = customStyle.replace('{author}', author).replace('{year}', year).replace('{title}', title).replace('{journal}', journal); break;
    }
    const refInput = document.getElementById(`ref${currentCitationIndex}`);
    refInput.value = formatted;
    validateReference(formatted, style, currentCitationIndex - 1);
    document.getElementById('citation-format-modal').style.display = 'none';
    updatePreview();
    autoSave();
}

function closeCitationFormatModal() {
    document.getElementById('citation-format-modal').style.display = 'none';
}

const debouncedUpdatePreview = debounce(updatePreview, 300);

function updatePreview() {
    const snippets = [];
    const references = [];
    const sources = [];
    for (let i = 1; i <= snippetCount; i++) {
        const snippet = document.getElementById(`snippet${i}`)?.value || '';
        const ref = document.getElementById(`ref${i}`)?.value || '';
        const source = document.getElementById(`source${i}`)?.value || '';
        if (snippet || ref) {
            snippets.push(snippet);
            references.push(ref);
            sources.push(source);
        }
    }
    const style = document.getElementById('citationStyle').value;
    const combined = snippets.map((s, i) => `${s}${references[i] ? ` (${references[i].split(',')[0] || 'Author'}, ${references[i].split(',')[1] || 'Year'})` : ''}`).join('\n\n');
    const bibliography = generateBibliography(references, sources, style);
    const outputText = combined + (bibliography ? '\n\nBibliography:\n' + bibliography : '');
    document.getElementById('preview-content').innerText = outputText;
    updateWordCounts();
    updateGoalProgress();
}

function generateBibliography(references, sources, style) {
    const grouped = { book: [], journal: [], website: [], other: [] };
    references.forEach((ref, i) => {
        if (sources[i]) grouped[sources[i]].push(ref);
    });
    let bib = '';
    ['book', 'journal', 'website', 'other'].forEach(type => {
        if (grouped[type].length) {
            bib += `${type.charAt(0).toUpperCase() + type.slice(1)}s:\n`;
            grouped[type].forEach(ref => {
                const parts = ref.split(',').map(p => p.trim());
                if (parts.length < 2) return;
                if (style === 'custom') {
                    bib += customStyle
                        .replace('{author}', parts[0])
                        .replace('{year}', parts[1])
                        .replace('{title}', parts[2] || 'Untitled') + '\n';
                } else {
                    switch (style) {
                        case 'apa': bib += `${parts[0]}. (${parts[1]}). ${parts[2] || 'Untitled'}.\n`; break;
                        case 'mla': bib += `${parts[0].split(' ').pop()}, ${parts[0].split(' ')[0]}. "${parts[2] || 'Untitled'}." ${parts[1]}.\n`; break;
                        case 'chicago': bib += `${parts[0]}. ${parts[1]}. "${parts[2] || 'Untitled'}." ${parts[3] || ''}.\n`; break;
                    }
                }
            });
        }
    });
    return bib;
}

function combineText() {
    const snippets = [];
    const references = [];
    const sources = [];
    const invalidRefs = [];
    for (let i = 1; i <= snippetCount; i++) {
        const snippet = document.getElementById(`snippet${i}`)?.value || '';
        const ref = document.getElementById(`ref${i}`)?.value || '';
        const source = document.getElementById(`source${i}`)?.value || '';
        if (snippet || ref) {
            snippets.push(snippet);
            references.push(ref);
            sources.push(source);
            if (ref && !validateReference(ref, document.getElementById('citationStyle').value, i - 1)) {
                invalidRefs.push(i);
            }
        }
    }
    const style = document.getElementById('citationStyle').value;
    const combined = snippets.map((s, i) => `${s}${references[i] ? ` (${references[i].split(',')[0] || 'Author'}, ${references[i].split(',')[1] || 'Year'})` : ''}`).join('\n\n');
    const bibliography = generateBibliography(references, sources, style);
    const outputText = combined + (bibliography ? '\n\nBibliography:\n' + bibliography : '');
    document.getElementById('output-text').innerHTML = outputText.replace(/\n/g, '<br>');
    document.getElementById('errors-list').innerText = invalidRefs.length ? `Incorrect references: ${invalidRefs.join(', ')}` : '';
    document.getElementById('output-modal').style.display = 'flex';
}

function updateWordCounts() {
    let totalWords = 0;
    for (let i = 1; i <= snippetCount; i++) {
        const snippet = document.getElementById(`snippet${i}`)?.value || '';
        const wordCountSpan = document.getElementById(`word-count${i}`);
        if (wordCountSpan) {
            const count = countWords(snippet);
            wordCountSpan.innerText = `Words: ${count}`;
            totalWords += count;
        }
    }
    const outputText = document.getElementById('output-text').innerText;
    const snippetsOnly = outputText.split('\n\nBibliography:\n')[0]?.replace(/\([\w\s,]+\)/g, '') || '';
    const totalOutputWords = countWords(outputText);
    const snippetsWords = countWords(snippetsOnly);
    document.getElementById('word-count-output').innerText = `Total Words: ${totalOutputWords} (Excluding Citations: ${snippetsWords})`;
}

function updateGoalProgress() {
    let totalWords = 0;
    for (let i = 1; i <= snippetCount; i++) {
        const snippet = document.getElementById(`snippet${i}`)?.value || '';
        totalWords += countWords(snippet);
    }
    document.getElementById('current-words').innerText = totalWords;
    document.getElementById('goal-value').innerText = wordGoal;
    const currentWordsSpan = document.getElementById('current-words');
    const goalValueSpan = document.getElementById('goal-value');
    if (totalWords >= wordGoal && wordGoal > 0) {
        currentWordsSpan.classList.add('goal-reached');
        goalValueSpan.classList.add('goal-reached');
        if (!goalReached) {
            showGoalReached();
            goalReached = true;
        }
    } else {
        currentWordsSpan.classList.remove('goal-reached');
        goalValueSpan.classList.remove('goal-reached');
        goalReached = false;
    }
}

function showGoalReached() {
    const checkmark = document.getElementById('goal-reached');
    checkmark.style.display = 'block';
    const audio = new Audio('goalReached.wav');
    audio.play().catch(e => {
        console.error('Goal audio failed:', e);
        alert('Goal reached! (Audio unavailable)');
    });
    setTimeout(() => {
        checkmark.style.display = 'none';
    }, 2000);
}

function updateProgress() {
    const completed = Array.from(document.querySelectorAll('.snippet-content')).filter(s => s.value.trim() !== '').length;
    const total = snippetCount;
    document.getElementById('progress').innerText = `${Math.round((completed / total) * 100)}%`;
}

function closeModal() {
    document.getElementById('output-modal').style.display = 'none';
    document.getElementById('save-locally-options').style.display = 'none';
}

function copyText() {
    const text = document.getElementById('output-text').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const message = document.getElementById('copy-message');
        message.style.display = 'inline';
        setTimeout(() => message.style.display = 'none', 2000);
    }).catch(e => {
        console.error('Copy failed:', e);
        alert('Failed to copy text.');
    });
}

function savePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(document.getElementById('output-text').innerText, 10, 10);
    doc.save('text_combiner.pdf');
}

function saveDocx() {
    const text = document.getElementById('output-text').innerText;
    const doc = new docxtemplater(new JSZip(), { paragraphLoop: true });
    const content = `
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
            <w:body>
                <w:p><w:r><w:t>${text.replace(/\n/g, '</w:t></w:r></w:p><w:p><w:r><w:t>')}</w:t></w:r></w:p>
            </w:body>
        </w:document>`;
    doc.loadZip(new JSZip()).setData(content).render();
    const blob = doc.getZip().generate({ type: 'blob' });
    saveAs(blob, 'text_combiner.docx');
}

function saveText() {
    const text = document.getElementById('output-text').innerText;
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'text_combiner.txt';
    link.click();
}

function saveMarkdown() {
    const text = document.getElementById('output-text').innerText;
    const markdown = text.replace(/^Bibliography:\n/, '## Bibliography\n');
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'text_combiner.md';
    link.click();
}

function saveRIS() {
    const references = [];
    for (let i = 1; i <= snippetCount; i++) {
        const ref = document.getElementById(`ref${i}`)?.value || '';
        if (ref) references.push(ref);
    }
    let ris = '';
    references.forEach(ref => {
        const parts = ref.split(',').map(p => p.trim());
        ris += `TY  - JOUR\nAU  - ${parts[0]}\nPY  - ${parts[1]}\nTI  - ${parts[2] || 'Untitled'}\nER  -\n\n`;
    });
    const blob = new Blob([ris], { type: 'application/x-research-info-systems' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'text_combiner.ris';
    link.click();
}

function saveLatex() {
    const text = document.getElementById('output-text').innerText;
    const latex = `\\documentclass{article}\n\\begin{document}\n${text.replace(/\n/g, '\\\\\n')}\n\\end{document}`;
    const blob = new Blob([latex], { type: 'application/x-tex' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'text_combiner.tex';
    link.click();
}

function saveFlashcards() {
    const snippets = [];
    const references = [];
    for (let i = 1; i <= snippetCount; i++) {
        const snippet = document.getElementById(`snippet${i}`)?.value || '';
        const ref = document.getElementById(`ref${i}`)?.value || '';
        if (snippet && ref) {
            snippets.push(snippet);
            references.push(ref);
        }
    }
    const text = snippets.map((s, i) => `${s}\t${references[i]}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'text_combiner_flashcards.txt';
    link.click();
}

function saveZip() {
    const zip = new JSZip();
    const text = document.getElementById('output-text').innerText;
    zip.file('text_combiner.txt', text);
    zip.file('text_combiner.md', text.replace(/^Bibliography:\n/, '## Bibliography\n'));
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(text, 10, 10);
    zip.file('text_combiner.pdf', doc.output('blob'));
    const docx = new docxtemplater(new JSZip(), { paragraphLoop: true });
    const content = `
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
            <w:body>
                <w:p><w:r><w:t>${text.replace(/\n/g, '</w:t></w:r></w:p><w:p><w:r><w:t>')}</w:t></w:r></w:p>
            </w:body>
        </w:document>`;
    docx.loadZip(new JSZip()).setData(content).render();
    zip.file('text_combiner.docx', docx.getZip().generate({ type: 'blob' }));
    let ris = '';
    for (let i = 1; i <= snippetCount; i++) {
        const ref = document.getElementById(`ref${i}`)?.value || '';
        if (ref) {
            const parts = ref.split(',').map(p => p.trim());
            ris += `TY  - JOUR\nAU  - ${parts[0]}\nPY  - ${parts[1]}\nTI  - ${parts[2] || 'Untitled'}\nER  -\n\n`;
        }
    }
    zip.file('text_combiner.ris', ris);
    zip.generateAsync({ type: 'blob' }).then(blob => {
        saveAs(blob, 'text_combiner.zip');
    });
}

function toggleSaveLocally() {
    const options = document.getElementById('save-locally-options');
    options.style.display = options.style.display === 'block' ? 'none' : 'block';
}

function saveCustomStyle() {
    customStyle = document.getElementById('custom-style-input').value;
    localStorage.setItem('customStyle', customStyle);
    updatePlaceholders();
    document.getElementById('custom-style-modal').style.display = 'none';
}

function closeCustomStyleModal() {
    document.getElementById('custom-style-modal').style.display = 'none';
}

function showRequestForm() {
    document.getElementById('request-form').style.display = 'block';
}

function closeRequestForm() {
    document.getElementById('request-form').style.display = 'none';
}

function submitRequest() {
    const request = document.getElementById('feature-request').value;
    if (request) {
        console.log('Feature Request:', request);
        alert('Feature request submitted! (Logged to console)');
        closeRequestForm();
    }
}

function showReferenceLibrary() {
    loadReferenceLibrary();
    document.getElementById('reference-library-modal').style.display = 'block';
}

function closeReferenceLibrary() {
    document.getElementById('reference-library-modal').style.display = 'none';
}

function addReferenceToLibrary() {
    const ref = document.getElementById('library-ref').value;
    const tag = document.getElementById('library-tag').value;
    if (ref) {
        const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
        library.push({ ref, tag });
        localStorage.setItem('referenceLibrary', JSON.stringify(library));
        document.getElementById('library-ref').value = '';
        document.getElementById('library-tag').value = '';
        loadReferenceLibrary();
    }
}

function loadReferenceLibrary() {
    const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
    const list = document.getElementById('library-list');
    list.innerHTML = '';
    const search = document.getElementById('library-search').value.toLowerCase();
    library.filter(item => item.ref.toLowerCase().includes(search) || (item.tag || '').toLowerCase().includes(search)).forEach((item, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="library-select" data-index="${i}"></td>
            <td>${item.ref}</td>
            <td>${item.tag || 'No tag'}</td>
            <td>
                <button onclick="applyReference(${i})">Apply</button>
                <button onclick="editReference(${i})">Edit</button>
                <button onclick="deleteReference(${i})">Delete</button>
            </td>
        `;
        list.appendChild(tr);
    });
    document.getElementById('select-all').checked = false;
}

function applyReference(index) {
    const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
    const refInput = document.getElementById(`ref${snippetCount}`);
    if (refInput && library[index]) {
        refInput.value = library[index].ref;
        validateReference(library[index].ref, document.getElementById('citationStyle').value, snippetCount - 1);
        updatePreview();
        autoSave();
    }
}

function editReference(index) {
    const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
    const ref = prompt('Edit reference:', library[index].ref);
    const tag = prompt('Edit tag:', library[index].tag || '');
    if (ref) {
        library[index] = { ref, tag };
        localStorage.setItem('referenceLibrary', JSON.stringify(library));
        loadReferenceLibrary();
    }
}

function deleteReference(index) {
    const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
    library.splice(index, 1);
    localStorage.setItem('referenceLibrary', JSON.stringify(library));
    loadReferenceLibrary();
}

function deleteSelectedReferences() {
    const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
    const selected = Array.from(document.querySelectorAll('.library-select:checked')).map(cb => parseInt(cb.dataset.index));
    if (selected.length && confirm('Delete selected references?')) {
        selected.sort((a, b) => b - a).forEach(i => library.splice(i, 1));
        localStorage.setItem('referenceLibrary', JSON.stringify(library));
        loadReferenceLibrary();
    }
}

function sortLibrary(key) {
    const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
    library.sort((a, b) => (a[key] || '').localeCompare(b[key] || ''));
    localStorage.setItem('referenceLibrary', JSON.stringify(library));
    loadReferenceLibrary();
}

function savePreferences() {
    preferences = {
        citationStyle: document.getElementById('citationStyle').value
    };
    localStorage.setItem('preferences', JSON.stringify(preferences));
    alert('Preferences saved!');
}

function startTimer() {
    if (!timerInterval) {
        timerMinutes = parseInt(document.getElementById('timer-minutes').value) || 25;
        localStorage.setItem('timerMinutes', timerMinutes);
        timerSeconds = isWorkSession ? timerMinutes * 60 : breakMinutes * 60;
        timerInterval = setInterval(updateTimer, 1000);
    }
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerMinutes = parseInt(document.getElementById('timer-minutes').value) || 25;
    timerSeconds = isWorkSession ? timerMinutes * 60 : breakMinutes * 60;
    document.getElementById('timer-display').innerText = formatTime(timerSeconds);
}

function updateTimer() {
    timerSeconds--;
    if (timerSeconds <= 0) {
        const audio = new Audio('timerBeep.wav');
        audio.play().catch(e => {
            console.error('Timer beep failed:', e);
            alert(isWorkSession ? 'Time for a break!' : 'Back to work!');
        });
        isWorkSession = !isWorkSession;
        timerMinutes = parseInt(document.getElementById('timer-minutes').value) || 25;
        timerSeconds = isWorkSession ? timerMinutes * 60 : breakMinutes * 60;
        document.getElementById('motivational-tip').innerText = isWorkSession ? 'Back to work!' : 'Take a break! Stretch or grab a snack.';
    }
    document.getElementById('timer-display').innerText = formatTime(timerSeconds);
}

function checkStorageCapacity() {
    const used = JSON.stringify(localStorage).length;
    const limit = 5 * 1024 * 1024;
    if (used > 0.8 * limit) {
        alert('Storage is nearly full! Please export your project.');
    }
    return used < limit;
}

const debouncedAutoSave = debounce(autoSave, 1000);

function autoSave() {
    const snippets = [];
    for (let i = 1; i <= snippetCount; i++) {
        snippets.push({
            snippet: document.getElementById(`snippet${i}`)?.value || '',
            ref: document.getElementById(`ref${i}`)?.value || '',
            source: document.getElementById(`source${i}`)?.value || ''
        });
    }
    const data = { snippets, snippetCount };
    if (checkStorageCapacity()) {
        localStorage.setItem('autoSave', JSON.stringify(data));
    }
}

function loadAutoSave() {
    document.getElementById('loading-spinner').style.display = 'block';
    try {
        const saved = JSON.parse(localStorage.getItem('autoSave'));
        if (saved && saved.snippets && saved.snippetCount) {
            snippetCount = Math.min(saved.snippetCount, 3);
            const container = document.getElementById('snippets-container');
            container.innerHTML = '';
            saved.snippets.slice(0, 3).forEach((item, i) => {
                const index = i + 1;
                const newSnippet = document.createElement('div');
                newSnippet.className = 'snippet';
                newSnippet.draggable = true;
                newSnippet.setAttribute('tabindex', '0');
                newSnippet.innerHTML = `
                    <h3 class="snippet-header">Text Snippet ${index}</h3>
                    <textarea id="snippet${index}" class="snippet-content" aria-label="Text Snippet ${index}">${item.snippet}</textarea>
                    <div class="snippet-meta">
                        <span id="word-count${index}">Words: ${countWords(item.snippet)}</span>
                        <div><label>Category:</label></div>
                        <select id="source${index}" aria-label="Source type for Snippet ${index}">
                            <option value="book" ${item.source === 'book' ? 'selected' : ''}>Book</option>
                            <option value="journal" ${item.source === 'journal' ? 'selected' : ''}>Journal</option>
                            <option value="website" ${item.source === 'website' ? 'selected' : ''}>Website</option>
                            <option value="other" ${item.source === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div class="tooltip">
                        <input type="text" id="ref${index}" placeholder="${getPlaceholder()}" value="${item.ref}" aria-label="Reference for Snippet ${index}">
                        <span class="tooltiptext" id="ref-tooltip${index}">${getPlaceholder()}</span>
                        <button onclick="formatCitation(${index})" aria-label="Format citation for Snippet ${index}">Format</button>
                    </div>
                    <span id="error${index}" class="error"></span>
                    <span id="correct${index}" class="correct">Correct</span>
                `;
                container.appendChild(newSnippet);
                addDragEvents(newSnippet);
            });
            updatePreview();
        } else {
            addSnippet();
        }
    } catch (e) {
        console.error('Load autoSave failed:', e);
        document.getElementById('snippets-container').innerHTML = '';
        addSnippet();
    } finally {
        document.getElementById('loading-spinner').style.display = 'none';
    }
}

function addDragEvents(snippet) {
    snippet.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', snippet.querySelector('h3').innerText.split(' ')[2]);
        snippet.classList.add('dragging');
    });
    snippet.addEventListener('dragend', () => {
        snippet.classList.remove('dragging');
    });
    snippet.addEventListener('dragover', e => e.preventDefault());
    snippet.addEventListener('drop', e => {
        e.preventDefault();
        const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const targetIndex = parseInt(snippet.querySelector('h3').innerText.split(' ')[2]);
        reorderSnippets(draggedIndex, targetIndex);
    });
}

function reorderSnippets(draggedIndex, targetIndex) {
    if (draggedIndex !== targetIndex) {
        const container = document.getElementById('snippets-container');
        const snippets = Array.from(container.children);
        const dragged = snippets[draggedIndex - 1];
        const target = snippets[targetIndex - 1];
        if (draggedIndex < targetIndex) {
            container.insertBefore(dragged, target.nextSibling);
        } else {
            container.insertBefore(dragged, target);
        }
        renumberSnippets();
        updatePreview();
        autoSave();
    }
}

function renumberSnippets() {
    const snippets = document.querySelectorAll('.snippet');
    snippets.forEach((snippet, i) => {
        const index = i + 1;
 ascendant = snippet.querySelector('h3');
        ascendant.innerText = `Text Snippet ${index}`;
        const textarea = snippet.querySelector('textarea');
        textarea.id = `snippet${index}`;
        textarea.setAttribute('aria-label', `Text Snippet ${index}`);
        const wordCount = snippet.querySelector('span');
        wordCount.id = `word-count${index}`;
        const select = snippet.querySelector('select');
        select.id = `source${index}`;
        select.setAttribute('aria-label', `Source type for Snippet ${index}`);
        const input = snippet.querySelector('input');
        input.id = `ref${index}`;
        input.setAttribute('aria-label', `Reference for Snippet ${index}`);
        const tooltip = snippet.querySelector('.tooltiptext');
        tooltip.id = `ref-tooltip${index}`;
        const formatButton = snippet.querySelector('button');
        formatButton.setAttribute('onclick', `formatCitation(${index})`);
        formatButton.setAttribute('aria-label', `Format citation for Snippet ${index}`);
        const error = snippet.querySelector('.error');
        error.id = `error${index}`;
        const correct = snippet.querySelector('.correct');
        correct.id = `correct${index}`;
    });
}

function trapFocus(modal) {
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    modal.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark-mode');
    document.querySelectorAll('.snippet, #preview, #output-content, #custom-style-modal, #citation-format-modal, #reference-library-modal, #request-form, .top-nav, .sidebar').forEach(el => {
        el.style.backgroundColor = document.documentElement.classList.contains('dark-mode') ? '#333' : '#fff';
        el.style.color = document.documentElement.classList.contains('dark-mode') ? '#eee' : '#333';
    });
}

function initialize() {
    document.getElementById('loading-spinner').style.display = 'block';
    try {
        localStorage.clear(); // Clear storage on first load to prevent corruption
        addSnippet();
        document.getElementById('timer-minutes').value = timerMinutes;
        document.getElementById('word-goal').value = wordGoal || '';
        document.getElementById('word-goal').addEventListener('input', () => {
            wordGoal = parseInt(document.getElementById('word-goal').value) || 0;
            localStorage.setItem('wordGoal', wordGoal);
            updateGoalProgress();
        });
        document.getElementById('citationStyle').addEventListener('change', () => {
            if (document.getElementById('citationStyle').value === 'custom') {
                document.getElementById('custom-style-modal').style.display = 'block';
            }
            updatePlaceholders();
        });
        document.querySelectorAll('textarea, input[type="text"]').forEach(el => {
            el.addEventListener('input', debounce(() => {
                debouncedUpdatePreview();
                debouncedAutoSave();
                if (el.id.startsWith('ref')) {
                    updateValidation(parseInt(el.id.replace('ref', '')));
                }
            }, 300));
        });
        document.querySelectorAll('.snippet-content').forEach(textarea => {
            textarea.addEventListener('input', debounce(() => {
                updateWordCounts();
                updateGoalProgress();
                updateProgress();
                debouncedUpdatePreview();
            }, 300));
        });
        document.getElementById('library-search').addEventListener('input', loadReferenceLibrary);
        document.getElementById('select-all').addEventListener('change', e => {
            document.querySelectorAll('.library-select').forEach(cb => cb.checked = e.target.checked);
        });
        document.querySelectorAll('#output-modal, #custom-style-modal, #citation-format-modal, #reference-library-modal, #request-form').forEach(modal => {
            trapFocus(modal);
        });
        const tips = ['Write first, edit later.', 'Clarity is key.', 'Take breaks to stay focused.'];
        document.getElementById('motivational-tip').innerText = tips[Math.floor(Math.random() * tips.length)];
        if (preferences.citationStyle) document.getElementById('citationStyle').value = preferences.citationStyle;
        loadAutoSave();
        updatePlaceholders();
    } catch (e) {
        console.error('Initialization failed:', e);
        document.getElementById('snippets-container').innerHTML = '';
        addSnippet();
    } finally {
        document.getElementById('loading-spinner').style.display = 'none';
    }
}

window.onload = initialize;
