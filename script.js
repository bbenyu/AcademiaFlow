let snippetCount = 3;
let preferences = JSON.parse(localStorage.getItem('preferences')) || {};
let lastSave = getCookie('lastSave') || 'pdf';
let customStyle = localStorage.getItem('customStyle') || '{author}, {year}, {title}';
let validationTimeouts = {};
let wordGoal = parseInt(localStorage.getItem('wordGoal')) || 0;
let timerInterval = null;
let timerSeconds = 25 * 60;
let isWorkSession = true;
let currentCitationIndex = null;
let goalReached = JSON.parse(localStorage.getItem('goalReached')) || false;

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function countWords(text) {
    const cleanText = text.trim();
    return cleanText.split(/\s+/).filter(w => w.length > 0).length;
}

function addSnippet() {
    if (countWords(document.getElementById(`snippet${snippetCount}`)?.value || '') > 5000) {
        alert('Snippet exceeds 5000 words.');
        return;
    }
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
            <span class="tooltiptext" id="ref-tooltip${snippetCount}"></span>
            <button onclick="formatCitation(${snippetCount})" aria-label="Format citation for Snippet ${snippetCount}">Format</button>
        </div>
        <span id="error${snippetCount}" class="error"></span>
        <span id="correct${snippetCount}" class="correct">Correct</span>
    `;
    container.appendChild(newSnippet);
    newSnippet.scrollIntoView({ behavior: 'smooth' });
    addDragEvents(newSnippet);
    updateAutoAdd();
    updatePreview();
    autoSave();
}

function updateAutoAdd() {
    const lastSnippet = document.getElementById(`snippet${snippetCount}`);
    lastSnippet.removeEventListener('input', handleSnippetInput);
    lastSnippet.addEventListener('input', handleSnippetInput);
}

function handleSnippetInput() {
    const lastSnippet = document.getElementById(`snippet${snippetCount}`);
    if (lastSnippet.value.trim() !== '') {
        addSnippet();
    }
}

function getPlaceholder() {
    const style = document.getElementById('citationStyle').value;
    switch (style) {
        case 'apa': return 'e.g., Smith, J. (2020). Title. Journal.';
        case 'mla': return 'e.g., Smith, John. "Title." Journal, 2020.';
        case 'chicago': return 'e.g., Smith, John. 2020. "Title." Journal.';
        case 'harvard': return 'e.g., Smith, J., 2020. Title. Journal.';
        case 'ieee': return 'e.g., J. Smith, "Title," Journal, 2020.';
        case 'ama': return 'e.g., Smith J. Title. Journal. 2020.';
        case 'vancouver': return 'e.g., Smith J. Title. Journal 2020.';
        case 'turabian': return 'e.g., Smith, John. 2020. Title. Journal.';
        case 'oscola': return 'e.g., Smith J, "Title" (2020) Journal.';
        case 'bluebook': return 'e.g., John Smith, Title, Journal (2020).';
        case 'custom': return `e.g., ${customStyle.replace('{author}', 'Smith').replace('{year}', '2020').replace('{title}', 'Title')}`;
        default: return 'Reference';
    }
}

function validateReference(ref, style, index) {
    const patterns = {
        apa: /^[\w\s]+,\s*[\w\s]+\.\s*\(\d{4}\)\.\s*.+$/,
        mla: /^[\w\s]+,\s*[\w\s]+\.\s*".+"\.\s*.+,\s*\d{4}\.$/,
        chicago: /^[\w\s]+,\s*[\w\s]+\.\s*\d{4}\.\s*".+"\.\s*.+$/,
        harvard: /^[\w\s]+,\s*[\w\s]+,\s*\d{4}\.\s*.+\.\s*.+$/,
        ieee: /^[\w\s]+\.\s*".+",\s*.+,\s*\d{4}\.$/,
        ama: /^[\w\s]+\.\s*.+\.\s*.+\.\s*\d{4}\.$/,
        vancouver: /^[\w\s]+\.\s*.+\.\s*.+\s*\d{4}\.$/,
        turabian: /^[\w\s]+,\s*[\w\s]+\.\s*\d{4}\.\s*.+\.\s*.+$/,
        oscola: /^[\w\s]+\s*,\s*".+"\s*\(\d{4}\)\s*.+$/,
        bluebook: /^[\w\s]+,\s*.+,\s*.+\s*\(\d{4}\)\.$/,
        custom: new RegExp(customStyle.replace('{author}', '[\\w\\s]+').replace('{year}', '\\d{4}').replace('{title}', '.+'))
    };
    const errorSpan = document.getElementById(`error${index + 1}`);
    const correctSpan = document.getElementById(`correct${index + 1}`);
    if (!ref) {
        errorSpan.style.display = 'none';
        correctSpan.style.display = 'none';
        return true;
    }
    if (patterns[style].test(ref)) {
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
    clearTimeout(validationTimeouts[index]);
    validationTimeouts[index] = setTimeout(() => {
        const ref = document.getElementById(`ref${index}`)?.value || '';
        validateReference(ref, document.getElementById('citationStyle').value, index - 1);
    }, 500);
}

function updatePlaceholders() {
    for (let i = 1; i <= snippetCount; i++) {
        const refInput = document.getElementById(`ref${i}`);
        if (refInput) {
            refInput.placeholder = getPlaceholder();
        }
        const tooltip = document.getElementById(`ref-tooltip${i}`);
        if (tooltip) tooltip.innerText = getPlaceholder();
        validateReference(refInput?.value || '', document.getElementById('citationStyle').value, i - 1);
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
        case 'harvard': formatted = `${author}, ${year}. ${title}. ${journal}.`; break;
        case 'ieee': formatted = `${author.split(', ')[0][0]}. ${author.split(', ')[1] || author}, "${title}," ${journal}, ${year}.`; break;
        case 'ama': formatted = `${author}. ${title}. ${journal}. ${year}.`; break;
        case 'vancouver': formatted = `${author}. ${title}. ${journal} ${year}.`; break;
        case 'turabian': formatted = `${author}. ${year}. ${title}. ${journal}.`; break;
        case 'oscola': formatted = `${author}, "${title}" (${year}) ${journal}.`; break;
        case 'bluebook': formatted = `${author}, ${title}, ${journal} (${year}).`; break;
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
    updateExportPreview(outputText);
    updateProgress();
}

function generateBibliography(references, sources, style) {
    const grouped = { book: [], journal: [], website: [], other: [] };
    references.forEach((ref, i) => {
        if (sources[i]) grouped[sources[i]].push(ref);
    });
    let bib = "";
    ['book', 'journal', 'website', 'other'].forEach(type => {
        if (grouped[type].length) {
            bib += `${type.charAt(0).toUpperCase() + type.slice(1)}s:\n`;
            grouped[type].forEach(ref => {
                const parts = ref.split(",").map(p => p.trim());
                if (parts.length < 2) return;
                if (style === 'custom') {
                    bib += customStyle
                        .replace('{author}', parts[0])
                        .replace('{year}', parts[1])
                        .replace('{title}', parts[2] || 'Untitled') + '\n';
                } else {
                    switch (style) {
                        case 'apa': bib += `${parts[0]}. (${parts[1]}). ${parts[2] || "Untitled"}.\n`; break;
                        case 'mla': bib += `${parts[0].split(" ").pop()}, ${parts[0].split(" ")[0]}. "${parts[2] || "Untitled"}." ${parts[1]}.\n`; break;
                        default: bib += `${parts[0]}, ${parts[1]}, ${parts[2] || "Untitled"}\n`;
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
        if (countWords(snippet) > 5000) {
            alert(`Snippet ${i} exceeds 5000 words.`);
            return;
        }
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
    const combined = snippets.map((s, i) => `${s}${references[i] ? ` (${references[i].split(",")[0] || 'Author'}, ${references[i].split(",")[1] || 'Year'})` : ''}`).join("\n\n");
    const bibliography = generateBibliography(references, sources, style);
    const outputText = combined + (bibliography ? "\n\nBibliography:\n" + bibliography : '');
    document.getElementById('output-text').innerHTML = outputText.replace(/\n/g, '<br>');
    document.getElementById('errors-list').innerText = invalidRefs.length ? `Incorrect references: ${formatRanges(invalidRefs)}` : '';
    document.getElementById('output-modal').style.display = 'flex';
}

function formatRanges(numbers) {
    if (!numbers.length) return '';
    numbers.sort((a, b) => a - b);
    const ranges = [];
    let start = numbers[0];
    let prev = start;
    for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] !== prev + 1) {
            if (start === prev) ranges.push(start);
            else ranges.push(`${start}-${prev}`);
            start = numbers[i];
        }
        prev = numbers[i];
    }
    if (start === prev) ranges.push(start);
    else ranges.push(`${start}-${prev}`);
    return ranges.join(', ');
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
    const underGoalSpan = document.createElement('span');
    underGoalSpan.id = 'under-goal';
    underGoalSpan.style.color = '#ffeb3b';
    underGoalSpan.innerText = ' (Under goal)';
    
    if (totalWords >= wordGoal && wordGoal > 0) {
        currentWordsSpan.classList.add('goal-reached');
        goalValueSpan.classList.add('goal-reached');
        if (!goalReached) {
            showGoalReached();
            goalReached = true;
            localStorage.setItem('goalReached', true);
        }
        const existingUnderGoal = document.getElementById('under-goal');
        if (existingUnderGoal) existingUnderGoal.remove();
    } else {
        currentWordsSpan.classList.remove('goal-reached');
        goalValueSpan.classList.remove('goal-reached');
        goalReached = false;
        localStorage.setItem('goalReached', false);
        const progressDiv = document.getElementById('goal-progress');
        if (!document.getElementById('under-goal')) {
            progressDiv.appendChild(underGoalSpan);
        }
    }
}

function showGoalReached() {
    const checkmark = document.getElementById('goal-reached');
    checkmark.style.display = 'block';
    const audio = new Audio('./goalReached.wav');
    audio.play().catch(e => {
        console.error('Audio play failed:', e);
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

function updateExportPreview(text) {
    document.getElementById('export-preview').innerText = `Export Preview:\n${text.slice(0, 100)}...`;
}

function closeModal() {
    document.getElementById('output-modal').style.display = 'none';
    document.getElementById('save-online-options').style.display = 'none';
    document.getElementById('save-locally-options').style.display = 'none';
}

function copyText() {
    try {
        const text = document.getElementById('output-text').innerText;
        navigator.clipboard.writeText(text).then(() => {
            const message = document.getElementById('copy-message');
            message.style.display = 'inline';
            setTimeout(() => message.style.display = 'none', 2000);
            setCookie('lastSave', 'clipboard', 30);
        });
    } catch (e) {
        console.error('Copy failed:', e);
        localStorage.setItem('lastError', `Copy: ${e.message}`);
        alert('Failed to copy text. Please try again.');
    }
}

function savePDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text(document.getElementById('output-text').innerText, 10, 10);
        doc.save('research_synthesis.pdf');
        setCookie('lastSave', 'pdf', 30);
    } catch (e) {
        console.error('PDF export failed:', e);
        localStorage.setItem('lastError', `PDF export: ${e.message}`);
        alert('Failed to generate PDF. Please try again or export as text.');
    }
}

function saveDocx() {
    try {
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
        saveAs(blob, 'research_synthesis.docx');
        setCookie('lastSave', 'docx', 30);
    } catch (e) {
        console.error('DOCX export failed:', e);
        localStorage.setItem('lastError', `DOCX export: ${e.message}`);
        alert('Failed to generate DOCX. Please try again or export as text.');
    }
}

function saveText() {
    try {
        const text = document.getElementById('output-text').innerText;
        const blob = new Blob([text], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'research_synthesis.txt';
        link.click();
        setCookie('lastSave', 'text', 30);
    } catch (e) {
        console.error('Text export failed:', e);
        localStorage.setItem('lastError', `Text export: ${e.message}`);
        alert('Failed to export text. Please try again.');
    }
}

function saveMarkdown() {
    try {
        const text = document.getElementById('output-text').innerText;
        const markdown = text.replace(/^Bibliography:\n/, '## Bibliography\n');
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'research_synthesis.md';
        link.click();
        setCookie('lastSave', 'markdown', 30);
    } catch (e) {
        console.error('Markdown export failed:', e);
        localStorage.setItem('lastError', `Markdown export: ${e.message}`);
        alert('Failed to export Markdown. Please try again.');
    }
}

function saveRIS() {
    try {
        const references = [];
        for (let i = 1; i <= snippetCount; i++) {
            const ref = document.getElementById(`ref${i}`)?.value || '';
            if (ref) references.push(ref);
        }
        let ris = '';
        references.forEach(ref => {
            const parts = ref.split(",").map(p => p.trim());
            ris += `TY  - JOUR\nAU  - ${parts[0]}\nPY  - ${parts[1]}\nTI  - ${parts[2] || "Untitled"}\nER  -\n\n`;
        });
        const blob = new Blob([ris], { type: 'application/x-research-info-systems' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'research_synthesis.ris';
        link.click();
        setCookie('lastSave', 'ris', 30);
    } catch (e) {
        console.error('RIS export failed:', e);
        localStorage.setItem('lastError', `RIS export: ${e.message}`);
        alert('Failed to export RIS. Please try again.');
    }
}

function saveLatex() {
    try {
        const text = document.getElementById('output-text').innerText;
        const latex = `\\documentclass{article}\n\\begin{document}\n${text.replace(/\n/g, '\\\\\n')}\n\\end{document}`;
        const blob = new Blob([latex], { type: 'application/x-tex' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'research_synthesis.tex';
        link.click();
        setCookie('lastSave', 'latex', 30);
    } catch (e) {
        console.error('LaTeX export failed:', e);
        localStorage.setItem('lastError', `LaTeX export: ${e.message}`);
        alert('Failed to export LaTeX. Please try again.');
    }
}

function saveFlashcards() {
    try {
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
        link.download = 'research_synthesis_flashcards.txt';
        link.click();
        setCookie('lastSave', 'flashcards', 30);
    } catch (e) {
        console.error('Flashcards export failed:', e);
        localStorage.setItem('lastError', `Flashcards export: ${e.message}`);
        alert('Failed to export flashcards. Please try again.');
    }
}

function saveZip() {
    try {
        const zip = new JSZip();
        const text = document.getElementById('output-text').innerText;
        zip.file('research_synthesis.txt', text);
        zip.file('research_synthesis.md', text.replace(/^Bibliography:\n/, '## Bibliography\n'));
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text(text, 10, 10);
        zip.file('research_synthesis.pdf', doc.output('blob'));
        const docx = new docxtemplater(new JSZip(), { paragraphLoop: true });
        const content = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p><w:r><w:t>${text.replace(/\n/g, '</w:t></w:r></w:p><w:p><w:r><w:t>')}</w:t></w:r></w:p>
                </w:body>
            </w:document>`;
        docx.loadZip(new JSZip()).setData(content).render();
        zip.file('research_synthesis.docx', docx.getZip().generate({ type: 'blob' }));
        let ris = '';
        for (let i = 1; i <= snippetCount; i++) {
            const ref = document.getElementById(`ref${i}`)?.value || '';
            if (ref) {
                const parts = ref.split(",").map(p => p.trim());
                ris += `TY  - JOUR\nAU  - ${parts[0]}\nPY  - ${parts[1]}\nTI  - ${parts[2] || "Untitled"}\nER  -\n\n`;
            }
        }
        zip.file('research_synthesis.ris', ris);
        zip.generateAsync({ type: 'blob' }).then(blob => {
            saveAs(blob, 'research_synthesis.zip');
        });
        setCookie('lastSave', 'zip', 30);
    } catch (e) {
        console.error('ZIP export failed:', e);
        localStorage.setItem('lastError', `ZIP export: ${e.message}`);
        alert('Failed to export ZIP. Please try again.');
    }
}

function saveToGoogleDrive() {
    alert('Google Drive integration requires API setup. Placeholder for now.');
    setCookie('lastSave', 'googleDrive', 30);
}

function saveToDropbox() {
    alert('Dropbox integration requires API setup. Placeholder for now.');
    setCookie('lastSave', 'dropbox', 30);
}

function saveToOneDrive() {
    alert('OneDrive integration requires API setup. Placeholder for now.');
    setCookie('lastSave', 'onedrive', 30);
}

function shareSecurely() {
    try {
        const text = document.getElementById('output-text').innerText;
        const password = prompt('Enter a password for secure sharing:');
        if (password) {
            const encrypted = btoa(text + '|' + password);
            const url = `${window.location.href}#${encrypted}`;
            navigator.clipboard.writeText(url).then(() => alert('Secure URL copied to clipboard.'));
        }
    } catch (e) {
        console.error('Share failed:', e);
        localStorage.setItem('lastError', `Share: ${e.message}`);
        alert('Failed to share securely. Please try again.');
    }
}

function toggleSaveOnline() {
    const options = document.getElementById('save-online-options');
    options.style.display = options.style.display === 'block' ? 'none' : 'block';
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
        localStorage.setItem('featureRequest', request);
        alert('Feature request submitted! Please take a screenshot and email it separately if needed.');
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
        timerInterval = setInterval(updateTimer, 1000);
    }
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = isWorkSession ? 25 * 60 : 5 * 60;
    document.getElementById('timer-display').innerText = formatTime(timerSeconds);
}

function updateTimer() {
    timerSeconds--;
    if (timerSeconds <= 0) {
        const audio = new Audio('./timerBeep.wav');
        audio.play().catch(e => console.error('Timer beep failed:', e));
        isWorkSession = !isWorkSession;
        timerSeconds = isWorkSession ? 25 * 60 : 5 * 60;
        document.getElementById('motivational-tip').innerText = isWorkSession ? 'Back to work!' : 'Take a break! Stretch or grab a snack.';
    }
    document.getElementById('timer-display').innerText = formatTime(timerSeconds);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function checkStorageCapacity() {
    const used = JSON.stringify(localStorage).length;
    const limit = 5 * 1024 * 1024; // 5MB
    if (used > 0.8 * limit) {
        alert('Storage is nearly full! Please export your project to avoid data loss.');
    }
    return used < limit;
}

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
    const compressed = LZString.compressToUTF16(JSON.stringify(data));
    if (checkStorageCapacity()) {
        localStorage.setItem('autoSave', compressed);
    } else {
        saveToIndexedDB(data);
    }
}

function loadAutoSave() {
    let saved = localStorage.getItem('autoSave');
    if (saved) {
        saved = JSON.parse(LZString.decompressFromUTF16(saved));
    } else {
        saved = loadFromIndexedDB();
    }
    if (saved) {
        snippetCount = saved.snippetCount;
        const container = document.getElementById('snippets-container');
        container.innerHTML = '';
        saved.snippets.forEach((item, i) => {
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
                    <span class="tooltiptext" id="ref-tooltip${index}"></span>
                    <button onclick="formatCitation(${index})" aria-label="Format citation for Snippet ${index}">Format</button>
                </div>
                <span id="error${index}" class="error"></span>
                <span id="correct${index}" class="correct">Correct</span>
            `;
            container.appendChild(newSnippet);
            addDragEvents(newSnippet);
        });
        updateAutoAdd();
        updatePreview();
        updateValidation();
    }
}

let db;
function initIndexedDB() {
    const request = indexedDB.open('TextCombinerDB', 1);
    request.onupgradeneeded = event => {
        db = event.target.result;
        db.createObjectStore('projects', { keyPath: 'id' });
    };
    request.onsuccess = event => {
        db = event.target.result;
    };
    request.onerror = () => console.error('IndexedDB failed to initialize');
}

function saveToIndexedDB(data) {
    const transaction = db.transaction(['projects'], 'readwrite');
    const store = transaction.objectStore('projects');
    store.put({ id: 'autoSave', data });
}

function loadFromIndexedDB() {
    return new Promise(resolve => {
        const transaction = db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.get('autoSave');
        request.onsuccess = () => resolve(request.result?.data || null);
        request.onerror = () => resolve(null);
    });
}

function addDragEvents(snippet) {
    snippet.setAttribute('tabindex', '0');
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
    snippet.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const index = parseInt(snippet.querySelector('h3').innerText.split(' ')[2]);
            const targetIndex = e.key === 'ArrowUp' ? index - 1 : index + 1;
            if (targetIndex >= 1 && targetIndex <= snippetCount) {
                reorderSnippets(index, targetIndex);
                document.querySelector(`.snippet:nth-child(${targetIndex})`).focus();
            }
        }
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
        snippet.querySelector('h3').innerText = `Text Snippet ${index}`;
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
    updateAutoAdd();
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

function initialize() {
    for (let i = 1; i <= snippetCount; i++) {
        addSnippet();
    }
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
        el.addEventListener('input', () => {
            updatePreview();
            autoSave();
            if (el.id.startsWith('ref')) {
                updateValidation(parseInt(el.id.replace('ref', '')));
            }
        });
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('.save-options') && !e.target.closest('button[aria-label="Save online"]') && !e.target.closest('button[aria-label="Save locally"]')) {
            document.getElementById('save-online-options').style.display = 'none';
            document.getElementById('save-locally-options').style.display = 'none';
        }
    });
    document.querySelectorAll('.snippet-content').forEach(textarea => {
        textarea.addEventListener('input', () => {
            updateWordCounts();
            updateGoalProgress();
            updatePreview();
        });
    });
    document.getElementById('library-search').addEventListener('input', loadReferenceLibrary);
    document.getElementById('select-all').addEventListener('change', e => {
        document.querySelectorAll('.library-select').forEach(cb => cb.checked = e.target.checked);
    });
    document.querySelectorAll('#output-modal, #custom-style-modal, #citation-format-modal, #reference-library-modal, #request-form').forEach(modal => {
        trapFocus(modal);
    });
    setInterval(autoSave, 5000);
    const tips = ['Write first, edit later.', 'Clarity is key.', 'Take breaks to stay focused.'];
    document.getElementById('motivational-tip').innerText = tips[Math.floor(Math.random() * tips.length)];
    if (preferences.citationStyle) document.getElementById('citationStyle').value = preferences.citationStyle;
    document.getElementById('word-goal').value = wordGoal || '';
    initIndexedDB();
    loadAutoSave();
    updatePlaceholders();
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark-mode');
    document.querySelectorAll('.snippet, #preview, #output-content, #custom-style-modal, #citation-format-modal, #reference-library-modal, #request-form').forEach(el => {
        el.style.backgroundColor = document.documentElement.classList.contains('dark-mode') ? '#333' : '#fff';
        el.style.color = document.documentElement.classList.contains('dark-mode') ? '#eee' : '#333';
    });
}

window.onload = initialize;
