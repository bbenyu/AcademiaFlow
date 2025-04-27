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

function calculateInitialSnippets() {
    try {
        const container = document.querySelector('.main-content');
        if (!container) {
            console.error('Main content container not found');
            return 1; // Fallback to 1 snippet
        }
        const containerWidth = container.offsetWidth;
        const snippetWidth = 300 + 20; // 300px + 20px gap
        const count = Math.max(1, Math.floor(containerWidth / snippetWidth));
        console.log(`Calculated initial snippets: ${count} (container width: ${containerWidth}px)`);
        return count;
    } catch (e) {
        console.error('Error calculating initial snippets:', e);
        return 1; // Fallback to 1 snippet
    }
}

function addSnippet(autoAdded = false) {
    try {
        snippetCount++;
        const container = document.getElementById('snippets-container');
        if (!container) {
            console.error('Snippets container not found');
            return;
        }
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
        newSnippet.scrollIntoView({ behavior: 'smooth' }); // Always scroll into view
        addDragEvents(newSnippet);
        const textarea = newSnippet.querySelector('.snippet-content');
        textarea.addEventListener('input', debounce(() => {
            updateWordCounts();
            updateGoalProgress();
            updateProgress();
            updatePreview();
            debouncedAutoSave();
            if (snippetCount === parseInt(textarea.id.replace('snippet', ''))) {
                addSnippet(true);
            }
        }, 300));
        updatePreview();
        autoSave();
        console.log(`Added snippet ${snippetCount}`);
    } catch (e) {
        console.error('Error adding snippet:', e);
    }
}



function getPlaceholder() {
    try {
        const style = document.getElementById('citationStyle')?.value || 'apa';
        switch (style) {
            case 'apa': return 'e.g., Smith, J. (2020). Title. Journal.';
            case 'mla': return 'e.g., Smith, John. "Title." Journal, 2020.';
            case 'chicago': return 'e.g., Smith, John. 2020. "Title." Journal.';
            case 'custom': return `e.g., ${customStyle.replace('{author}', 'Smith').replace('{year}', '2020').replace('{title}', 'Title')}`;
            default: return 'Reference';
        }
    } catch (e) {
        console.error('Error getting placeholder:', e);
        return 'Reference';
    }
}



function validateReference(ref, style, index) {
    try {
        const patterns = {
            apa: /^[\w\s]+,\s*[\w\s]+\.\s*\(\d{4}\)\.\s*.+\.\s*.+$/, // e.g., Smith, J. (2020). Title. Journal.
            mla: /^[\w\s]+,\s*[\w\s]+\.\s*".+"\.\s*.+,\s*\d{4}\.$/, // e.g., Smith, John. "Title." Journal, 2020.
            chicago: /^[\w\s]+,\s*[\w\s]+\.\s*\d{4}\.\s*".+"\.\s*.+$/, // e.g., Smith, John. 2020. "Title." Journal.
            custom: new RegExp(
                customStyle
                    .replace('{author}', '[\\w\\s,]+')
                    .replace('{year}', '\\d{4}')
                    .replace('{title}', '[^\\}]+')
                    .replace('{journal}', '.*')
                    .replace(/[\{\}]/g, '')
            )
        };
        const errorSpan = document.getElementById(`error${index + 1}`);
        const correctSpan = document.getElementById(`correct${index + 1}`);
        if (!errorSpan || !correctSpan) {
            console.error(`Validation spans not found for index ${index + 1}`);
            return false;
        }
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
    } catch (e) {
        console.error('Error validating reference:', e);
        return false;
    }
}



function updateValidation(index) {
    try {
        const ref = document.getElementById(`ref${index}`)?.value || '';
        validateReference(ref, document.getElementById('citationStyle')?.value || 'apa', index - 1);
    } catch (e) {
        console.error('Error updating validation:', e);
    }
}

function updatePlaceholders() {
    try {
        for (let i = 1; i <= snippetCount; i++) {
            const refInput = document.getElementById(`ref${i}`);
            if (refInput) {
                refInput.placeholder = getPlaceholder();
                const tooltip = document.getElementById(`ref-tooltip${i}`);
                if (tooltip) tooltip.innerText = getPlaceholder();
                validateReference(refInput.value, document.getElementById('citationStyle')?.value || 'apa', i - 1);
            }
        }
        updatePreview();
    } catch (e) {
        console.error('Error updating placeholders:', e);
    }
}

function formatCitation(index) {
    try {
        currentCitationIndex = index;
        document.getElementById('format-author').value = '';
        document.getElementById('format-year').value = '';
        document.getElementById('format-title').value = '';
        document.getElementById('format-journal').value = '';
        const modal = document.getElementById('citation-format-modal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.error('Citation format modal not found');
        }
    } catch (e) {
        console.error('Error formatting citation:', e);
    }
}

function applyFormattedCitation() {
    try {
        const author = document.getElementById('format-author').value;
        const year = document.getElementById('format-year').value;
        const title = document.getElementById('format-title').value;
        const journal = document.getElementById('format-journal').value;
        if (!author || !year || !title) {
            alert('Please fill in author, year, and title.');
            return;
        }
        const style = document.getElementById('citationStyle')?.value || 'apa';
        let formatted = '';
        switch (style) {
            case 'apa': formatted = `${author}. (${year}). ${title}. ${journal}.`; break;
            case 'mla': formatted = `${author.split(', ')[0].split(' ')[1]}, ${author.split(', ')[0].split(' ')[0]}. "${title}." ${journal}, ${year}.`; break;
            case 'chicago': formatted = `${author}. ${year}. "${title}." ${journal}.`; break;
            case 'custom': formatted = customStyle.replace('{author}', author).replace('{year}', year).replace('{title}', title).replace('{journal}', journal); break;
        }
        const refInput = document.getElementById(`ref${currentCitationIndex}`);
        if (refInput) {
            refInput.value = formatted;
            validateReference(formatted, style, currentCitationIndex - 1);
            document.getElementById('citation-format-modal').style.display = 'none';
            updatePreview();
            autoSave();
        } else {
            console.error(`Reference input ref${currentCitationIndex} not found`);
        }
    } catch (e) {
        console.error('Error applying formatted citation:', e);
    }
}

function closeCitationFormatModal() {
    try {
        document.getElementById('citation-format-modal').style.display = 'none';
    } catch (e) {
        console.error('Error closing citation format modal:', e);
    }
}

function updatePreview() {
    try {
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
        const style = document.getElementById('citationStyle')?.value || 'apa';
        const combined = snippets.map((s, i) => `${s}${references[i] ? ` (${references[i].split(',')[0] || 'Author'}, ${references[i].split(',')[1] || 'Year'})` : ''}`).join('\n\n');
        const bibliography = generateBibliography(references, sources, style);
        const outputText = combined + (bibliography ? '\n\nBibliography:\n' + bibliography : '');
        const previewContent = document.getElementById('preview-content');
        if (previewContent) {
            previewContent.innerText = outputText;
        } else {
            console.error('Preview content element not found');
        }
        updateWordCounts();
        updateGoalProgress();
    } catch (e) {
        console.error('Error updating preview:', e);
    }
}

function generateBibliography(references, sources, style) {
    try {
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
    } catch (e) {
        console.error('Error generating bibliography:', e);
        return '';
    }
}

function combineText() {
    try {
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
                if (ref && !validateReference(ref, document.getElementById('citationStyle')?.value || 'apa', i - 1)) {
                    invalidRefs.push(i);
                }
            }
        }
        const style = document.getElementById('citationStyle')?.value || 'apa';
        const combined = snippets.map((s, i) => `${s}${references[i] ? ` (${references[i].split(',')[0] || 'Author'}, ${references[i].split(',')[1] || 'Year'})` : ''}`).join('\n\n');
        const bibliography = generateBibliography(references, sources, style);
        const outputText = combined + (bibliography ? '\n\nBibliography:\n' + bibliography : '');
        const outputTextElement = document.getElementById('output-text');
        if (outputTextElement) {
            outputTextElement.innerHTML = outputText.replace(/\n/g, '<br>');
        } else {
            console.error('Output text element not found');
        }
        const errorsList = document.getElementById('errors-list');
        if (errorsList) {
            errorsList.innerText = invalidRefs.length ? `Incorrect references: ${invalidRefs.join(', ')}` : '';
        }
        const wordCountOutput = document.getElementById('word-count-output');
        if (wordCountOutput) {
            const totalOutputWords = countWords(outputText);
            const snippetsOnly = outputText.split('\n\nBibliography:\n')[0]?.replace(/\([\w\s,]+\)/g, '') || '';
            const snippetsWords = countWords(snippetsOnly);
            wordCountOutput.innerText = `Total Words: ${totalOutputWords} (Excluding Citations: ${snippetsWords})`;
        }
        const outputModal = document.getElementById('output-modal');
        if (outputModal) {
            outputModal.style.display = 'flex';
        } else {
            console.error('Output modal not found');
        }
    } catch (e) {
        console.error('Error combining text:', e);
    }
}



function updateWordCounts() {
    try {
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
        const outputText = document.getElementById('output-text')?.innerText || '';
        const snippetsOnly = outputText.split('\n\nBibliography:\n')[0]?.replace(/\([\w\s,]+\)/g, '') || '';
        const totalOutputWords = countWords(outputText);
        const snippetsWords = countWords(snippetsOnly);
        const wordCountOutput = document.getElementById('word-count-output');
        if (wordCountOutput) {
            wordCountOutput.innerText = `Total Words: ${totalOutputWords} (Excluding Citations: ${snippetsWords})`;
        }
    } catch (e) {
        console.error('Error updating word counts:', e);
    }
}

function updateGoalProgress() {
    try {
        let totalWords = 0;
        for (let i = 1; i <= snippetCount; i++) {
            const snippet = document.getElementById(`snippet${i}`)?.value || '';
            totalWords += countWords(snippet);
        }
        const currentWordsSpan = document.getElementById('current-words');
        const goalValueSpan = document.getElementById('goal-value');
        const checkmark = document.getElementById('goal-reached');
        if (currentWordsSpan && goalValueSpan && checkmark) {
            currentWordsSpan.innerText = totalWords;
            goalValueSpan.innerText = wordGoal;
            if (totalWords >= wordGoal && wordGoal > 0) {
                currentWordsSpan.classList.add('goal-reached');
                goalValueSpan.classList.add('goal-reached');
                checkmark.style.display = 'block';
                if (!goalReached) {
                    showGoalReached();
                    goalReached = true;
                }
            } else {
                currentWordsSpan.classList.remove('goal-reached');
                goalValueSpan.classList.remove('goal-reached');
                checkmark.style.display = 'none';
                goalReached = false;
            }
        }
    } catch (e) {
        console.error('Error updating goal progress:', e);
    }
}

// In script.js, replace the showGoalReached function
function showGoalReached() {
    try {
        const audio = new Audio('goalReached.wav');
        audio.play().catch(e => {
            console.error('Goal audio failed:', e);
            alert('Goal reached!');
        });
    } catch (e) {
        console.error('Error showing goal reached:', e);
        alert('Goal reached!');
    }
}


function updateProgress() {
    try {
        let totalWords = 0;
        for (let i = 1; i <= snippetCount; i++) {
            const snippet = document.getElementById(`snippet${i}`)?.value || '';
            totalWords += countWords(snippet);
        }
        const progressElement = document.getElementById('progress');
        if (progressElement && wordGoal > 0) {
            const percentage = Math.min(Math.round((totalWords / wordGoal) * 100), 100);
            progressElement.innerText = `${percentage}%`;
        } else if (progressElement) {
            progressElement.innerText = '0%';
        }
    } catch (e) {
        console.error('Error updating progress:', e);
    }
}


function closeModal() {
    try {
        const outputModal = document.getElementById('output-modal');
        if (outputModal) {
            outputModal.style.display = 'none';
            document.getElementById('save-locally-options').style.display = 'none';
            document.getElementById('save-online-options').style.display = 'none';
        }
    } catch (e) {
        console.error('Error closing modal:', e);
    }
}

function copyText() {
    try {
        const text = document.getElementById('output-text')?.innerText || '';
        navigator.clipboard.writeText(text).then(() => {
            const message = document.getElementById('copy-message');
            if (message) {
                message.style.display = 'inline';
                setTimeout(() => message.style.display = 'none', 2000);
            }
        }).catch(e => {
            console.error('Copy failed:', e);
            alert('Failed to copy text.');
        });
    } catch (e) {
        console.error('Error copying text:', e);
    }
}

function savePDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text(document.getElementById('output-text')?.innerText || '', 10, 10);
        doc.save('text_combiner.pdf');
    } catch (e) {
        console.error('Error saving PDF:', e);
    }
}



function saveDocx() {
    try {
        const text = document.getElementById('output-text')?.innerText || '';
        const zip = new JSZip();
        const doc = new docxtemplater();
        const template = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r>
                            <w:t>{text}</w:t>
                        </w:r>
                    </w:p>
                </w:body>
            </w:document>`;
        zip.file('word/document.xml', template);
        doc.loadZip(zip).setData({ text: text.replace(/\n/g, '</w:t></w:r></w:p><w:p><w:r><w:t>') }).render();
        const blob = doc.getZip().generate({ type: 'blob' });
        saveAs(blob, 'text_combiner.docx');
    } catch (e) {
        console.error('Error saving DOCX:', e);
        alert('Failed to save DOCX. Ensure all dependencies are loaded.');
    }
}



function saveText() {
    try {
        const text = document.getElementById('output-text')?.innerText || '';
        const blob = new Blob([text], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'text_combiner.txt';
        link.click();
    } catch (e) {
        console.error('Error saving text:', e);
    }
}



function toggleSaveLocally() {
    try {
        const options = document.getElementById('save-locally-options');
        if (options) {
            options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
            document.getElementById('save-online-options').style.display = 'none'; // Hide other menu
        }
    } catch (e) {
        console.error('Error toggling save locally:', e);
    }
}

function toggleSaveOnline() {
    try {
        const options = document.getElementById('save-online-options');
        if (options) {
            options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
            document.getElementById('save-locally-options').style.display = 'none'; // Hide other menu
        }
    } catch (e) {
        console.error('Error toggling save online:', e);
    }
}



function saveToGoogleDrive() {
    alert('Google Drive integration not implemented. Please implement OAuth and Google Drive API.');
}

function saveToDropbox() {
    alert('Dropbox integration not implemented. Please implement OAuth and Dropbox API.');
}

function saveToSharepoint() {
    alert('Sharepoint integration not implemented. Please implement Microsoft Graph API.');
}

function saveToClassrooms() {
    alert('Classrooms integration not implemented. Please specify platform (e.g., Google Classroom) and implement API.');
}

function saveCustomStyle() {
    try {
        customStyle = document.getElementById('custom-style-input').value;
        localStorage.setItem('customStyle', customStyle);
        updatePlaceholders();
        document.getElementById('custom-style-modal').style.display = 'none';
    } catch (e) {
        console.error('Error saving custom style:', e);
    }
}

function closeCustomStyleModal() {
    try {
        document.getElementById('custom-style-modal').style.display = 'none';
    } catch (e) {
        console.error('Error closing custom style modal:', e);
    }
}

function showRequestForm() {
    try {
        document.getElementById('request-form').style.display = 'block';
    } catch (e) {
        console.error('Error showing request form:', e);
    }
}

function closeRequestForm() {
    try {
        document.getElementById('request-form').style.display = 'none';
    } catch (e) {
        console.error('Error closing request form:', e);
    }
}

function submitRequest() {
    try {
        const request = document.getElementById('feature-request').value;
        if (request) {
            console.log('Feature Request:', request);
            alert('Feature request submitted! (Logged to console)');
            closeRequestForm();
        }
    } catch (e) {
        console.error('Error submitting request:', e);
    }
}

function showReferenceLibrary() {
    try {
        loadReferenceLibrary();
        document.getElementById('reference-library-modal').style.display = 'block';
    } catch (e) {
        console.error('Error showing reference library:', e);
    }
}

function closeReferenceLibrary() {
    try {
        document.getElementById('reference-library-modal').style.display = 'none';
    } catch (e) {
        console.error('Error closing reference library:', e);
    }
}

function addReferenceToLibrary() {
    try {
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
    } catch (e) {
        console.error('Error adding reference to library:', e);
    }
}

function loadReferenceLibrary() {
    try {
        const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
        const list = document.getElementById('library-list');
        if (list) {
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
    } catch (e) {
        console.error('Error loading reference library:', e);
    }
}

function applyReference(index) {
    try {
        const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
        const refInput = document.getElementById(`ref${snippetCount}`);
        if (refInput && library[index]) {
            refInput.value = library[index].ref;
            validateReference(library[index].ref, document.getElementById('citationStyle')?.value || 'apa', snippetCount - 1);
            updatePreview();
            autoSave();
        }
    } catch (e) {
        console.error('Error applying reference:', e);
    }
}

function editReference(index) {
    try {
        const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
        const ref = prompt('Edit reference:', library[index].ref);
        const tag = prompt('Edit tag:', library[index].tag || '');
        if (ref) {
            library[index] = { ref, tag };
            localStorage.setItem('referenceLibrary', JSON.stringify(library));
            loadReferenceLibrary();
        }
    } catch (e) {
        console.error('Error editing reference:', e);
    }
}

function deleteReference(index) {
    try {
        const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
        library.splice(index, 1);
        localStorage.setItem('referenceLibrary', JSON.stringify(library));
        loadReferenceLibrary();
    } catch (e) {
        console.error('Error deleting reference:', e);
    }
}

function deleteSelectedReferences() {
    try {
        const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
        const selected = Array.from(document.querySelectorAll('.library-select:checked')).map(cb => parseInt(cb.dataset.index));
        if (selected.length && confirm('Delete selected references?')) {
            selected.sort((a, b) => b - a).forEach(i => library.splice(i, 1));
            localStorage.setItem('referenceLibrary', JSON.stringify(library));
            loadReferenceLibrary();
        }
    } catch (e) {
        console.error('Error deleting selected references:', e);
    }
}

function sortLibrary(key) {
    try {
        const library = JSON.parse(localStorage.getItem('referenceLibrary')) || [];
        library.sort((a, b) => (a[key] || '').localeCompare(b[key] || ''));
        localStorage.setItem('referenceLibrary', JSON.stringify(library));
        loadReferenceLibrary();
    } catch (e) {
        console.error('Error sorting library:', e);
    }
}

function startTimer() {
    try {
        if (!timerInterval) {
            timerMinutes = parseInt(document.getElementById('timer-minutes').value) || 25;
            localStorage.setItem('timerMinutes', timerMinutes);
            timerSeconds = isWorkSession ? timerMinutes * 60 : breakMinutes * 60;
            const startTime = performance.now();
            timerInterval = setInterval(() => {
                const elapsed = (performance.now() - startTime) / 1000;
                const remaining = timerSeconds - Math.floor(elapsed);
                if (remaining <= 0) {
                    const audio = new Audio('timerBeep.wav');
                    audio.play().catch(e => {
                        console.error('Timer beep failed:', e);
                        alert(isWorkSession ? 'Time for a break!' : 'Back to work!');
                    });
                    isWorkSession = !isWorkSession;
                    timerMinutes = parseInt(document.getElementById('timer-minutes').value) || 25;
                    timerSeconds = isWorkSession ? timerMinutes * 60 : breakMinutes * 60;
                    document.getElementById('motivational-tip').innerText = isWorkSession ? 'Back to work!' : 'Take a break! Stretch or grab a snack.';
                    clearInterval(timerInterval);
                    startTimer();
                } else {
                    document.getElementById('timer-display').innerText = formatTime(remaining);
                }
            }, 100);
        }
    } catch (e) {
        console.error('Error starting timer:', e);
    }
}

function stopTimer() {
    try {
        clearInterval(timerInterval);
        timerInterval = null;
        timerMinutes = parseInt(document.getElementById('timer-minutes').value) || 25;
        timerSeconds = isWorkSession ? timerMinutes * 60 : breakMinutes * 60;
        document.getElementById('timer-display').innerText = formatTime(timerSeconds);
    } catch (e) {
        console.error('Error stopping timer:', e);
    }
}

function checkStorageCapacity() {
    try {
        const used = JSON.stringify(localStorage).length;
        const limit = 5 * 1024 * 1024;
        if (used > 0.8 * limit) {
            alert('Storage is nearly full! Please export your project.');
        }
        return used < limit;
    } catch (e) {
        console.error('Error checking storage capacity:', e);
        return true;
    }
}

const debouncedAutoSave = debounce(autoSave, 1000);

function autoSave() {
    try {
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
    } catch (e) {
        console.error('Error auto-saving:', e);
    }
}

function loadAutoSave() {
    document.getElementById('loading-spinner').style.display = 'block';
    try {
        const saved = JSON.parse(localStorage.getItem('autoSave'));
        const container = document.getElementById('snippets-container');
        if (!container) {
            console.error('Snippets container not found in loadAutoSave');
            return;
        }
        container.innerHTML = '';
        if (saved && saved.snippets && saved.snippetCount) {
            snippetCount = saved.snippetCount;
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
                        <span class="tooltiptext" id="ref-tooltip${index}">${getPlaceholder()}</span>
                        <button onclick="formatCitation(${index})" aria-label="Format citation for Snippet ${index}">Format</button>
                    </div>
                    <span id="error${index}" class="error"></span>
                    <span id="correct${index}" class="correct">Correct</span>
                `;
                container.appendChild(newSnippet);
                addDragEvents(newSnippet);
                const textarea = newSnippet.querySelector('.snippet-content');
                textarea.addEventListener('input', debounce(() => {
                    updateWordCounts();
                    updateGoalProgress();
                    updateProgress();
                    updatePreview();
                    debouncedAutoSave();
                    if (index === snippetCount) {
                        addSnippet(true);
                    }
                }, 300));
            });
            updatePreview();
        } else {
            const initialSnippets = calculateInitialSnippets();
            console.log(`Loading ${initialSnippets} initial snippets`);
            for (let i = 0; i < initialSnippets; i++) {
                addSnippet(true);
            }
        }
    } catch (e) {
        console.error('Error loading autoSave:', e);
        const container = document.getElementById('snippets-container');
        if (container) {
            container.innerHTML = '';
            const initialSnippets = calculateInitialSnippets();
            for (let i = 0; i < initialSnippets; i++) {
                addSnippet(true);
            }
        }
    } finally {
        document.getElementById('loading-spinner').style.display = 'none';
    }
}

function addDragEvents(snippet) {
    try {
        snippet.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', snippet.querySelector('h3').innerText.split(' ')[2]);
            snippet.classList.add('dragging');
        });
        snippet.addEventListener('dragend', () => {
            snippet.classList.remove('dragging');
            document.querySelectorAll('.snippet').forEach(s => s.classList.remove('drag-over'));
        });
        snippet.addEventListener('dragover', e => {
            e.preventDefault();
            snippet.classList.add('drag-over');
        });
        snippet.addEventListener('dragleave', () => {
            snippet.classList.remove('drag-over');
        });
        snippet.addEventListener('drop', e => {
            e.preventDefault();
            snippet.classList.remove('drag-over');
            const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const targetIndex = parseInt(snippet.querySelector('h3').innerText.split(' ')[2]);
            reorderSnippets(draggedIndex, targetIndex);
        });
    } catch (e) {
        console.error('Error adding drag events:', e);
    }
}


function reorderSnippets(draggedIndex, targetIndex) {
    try {
        if (draggedIndex !== targetIndex) {
            const container = document.getElementById('snippets-container');
            const snippets = Array.from(container.children);
            const dragged = snippets[draggedIndex - 1];
            const target = snippets[targetIndex - 1];
            // Animate movement
            dragged.style.transition = 'transform 0.3s ease';
            target.style.transition = 'transform 0.3s ease';
            if (draggedIndex < targetIndex) {
                container.insertBefore(dragged, target.nextSibling);
            } else {
                container.insertBefore(dragged, target);
            }
            renumberSnippets();
            updatePreview();
            autoSave();
            // Reset transitions after animation
            setTimeout(() => {
                dragged.style.transition = '';
                target.style.transition = '';
            }, 300);
        }
    } catch (e) {
        console.error('Error reordering snippets:', e);
    }
}



function renumberSnippets() {
    try {
        const snippets = document.querySelectorAll('.snippet');
        snippets.forEach((snippet, i) => {
            const index = i + 1;
            const header = snippet.querySelector('h3');
            header.innerText = `Text Snippet ${index}`;
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
    } catch (e) {
        console.error('Error renumbering snippets:', e);
    }
}

function trapFocus(modal) {
    try {
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
    } catch (e) {
        console.error('Error trapping focus:', e);
    }
}

function toggleDarkMode() {
    try {
        document.documentElement.classList.toggle('dark-mode');
        document.querySelectorAll('.snippet, #preview, #persistent-info, #output-content, #custom-style-modal, #citation-format-content, #reference-library-modal, #request-form, .top-nav, .sidebar').forEach(el => {
            el.style.backgroundColor = document.documentElement.classList.contains('dark-mode') ? '#333' : '#fff';
            el.style.color = document.documentElement.classList.contains('dark-mode') ? '#eee' : '#333';
        });
    } catch (e) {
        console.error('Error toggling dark mode:', e);
    }
}

function initialize() {
    document.getElementById('loading-spinner').style.display = 'block';
    try {
        // Remove localStorage.clear() to preserve saved data
        // localStorage.clear();
        console.log('Initializing application');
        const timerMinutesInput = document.getElementById('timer-minutes');
        if (timerMinutesInput) {
            timerMinutesInput.value = timerMinutes;
        }
        const wordGoalInput = document.getElementById('word-goal');
        if (wordGoalInput) {
            wordGoalInput.value = wordGoal || '';
            wordGoalInput.addEventListener('input', () => {
                wordGoal = parseInt(wordGoalInput.value) || 0;
                localStorage.setItem('wordGoal', wordGoal);
                updateGoalProgress();
            });
        }
        const citationStyleSelect = document.getElementById('citationStyle');
        if (citationStyleSelect) {
            citationStyleSelect.addEventListener('change', () => {
                if (citationStyleSelect.value === 'custom') {
                    document.getElementById('custom-style-modal').style.display = 'block';
                }
                updatePlaceholders();
            });
        }
        document.querySelectorAll('textarea, input[type="text"]').forEach(el => {
            el.addEventListener('input', debounce(() => {
                updatePreview();
                debouncedAutoSave();
                if (el.id.startsWith('ref')) {
                    updateValidation(parseInt(el.id.replace('ref', '')));
                }
            }, 300));
        });
        const librarySearch = document.getElementById('library-search');
        if (librarySearch) {
            librarySearch.addEventListener('input', loadReferenceLibrary);
        }
        const selectAll = document.getElementById('select-all');
        if (selectAll) {
            selectAll.addEventListener('change', e => {
                document.querySelectorAll('.library-select').forEach(cb => cb.checked = e.target.checked);
            });
        }
        document.querySelectorAll('#output-modal, #custom-style-modal, #citation-format-modal, #reference-library-modal, #request-form').forEach(modal => {
            trapFocus(modal);
        });
        const tips = ['Write first, edit later.', 'Clarity is key.', 'Take breaks to stay focused.'];
        const motivationalTip = document.getElementById('motivational-tip');
        if (motivationalTip) {
            motivationalTip.innerText = tips[Math.floor(Math.random() * tips.length)];
        }
        if (preferences.citationStyle && citationStyleSelect) {
            citationStyleSelect.value = preferences.citationStyle;
        }
        loadAutoSave();
        updatePlaceholders();
        // Ensure at least one snippet is added if none exist
        if (snippetCount === 0) {
            console.log('No snippets found, adding one');
            addSnippet(true);
        }
    } catch (e) {
        console.error('Initialization failed:', e);
        const container = document.getElementById('snippets-container');
        if (container) {
            container.innerHTML = '';
            addSnippet(true); // Fallback to one snippet
        }
    } finally {
        document.getElementById('loading-spinner').style.display = 'none';
    }
}

// Use DOMContentLoaded instead of window.onload for faster initialization
document.addEventListener('DOMContentLoaded', initialize);
