// Utility: Debounce function
function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Extract sentences from text
function getSentences(text) {
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
}

// Check a sentence using DuckDuckGo (free, no API key, but limited)
async function checkSentencePlagiarism(sentence) {
    const url = `https://api.duckduckgo.com/?q="${encodeURIComponent(sentence.trim())}"&format=json&no_redirect=1&no_html=1`;
    try {
        const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!resp.ok) return false;
        const data = await resp.json();
        // If AbstractText or RelatedTopics contains the sentence, consider it found
        if (data.AbstractText && data.AbstractText.includes(sentence.trim())) return true;
        if (data.RelatedTopics && data.RelatedTopics.some(t => t.Text && t.Text.includes(sentence.trim()))) return true;
        return false;
    } catch {
        return false;
    }
}

// Highlight plagiarized sentences in the editor
async function checkPlagiarismInEditor() {
    const editor = document.getElementById('editor');
    const text = editor.value;
    const sentences = getSentences(text);
    let plagiarized = [];
    for (let i = 0; i < sentences.length; i++) {
        const found = await checkSentencePlagiarism(sentences[i]);
        if (found) plagiarized.push(sentences[i]);
    }
    // Highlight in the editor (simple: show a report below)
    const report = document.getElementById('plagiarism-report');
    if (plagiarized.length > 0) {
        report.innerHTML = `<b>Possible Plagiarism Detected:</b><ul>` +
            plagiarized.map(s => `<li style="color:red;">${s.trim()}</li>`).join('') +
            `</ul>`;
    } else {
        report.textContent = "No plagiarism detected.";
    }
}

// Debounced version for real-time checking
const debouncedPlagiarismCheck = debounce(checkPlagiarismInEditor, 2000);

// Attach to editor
document.addEventListener('DOMContentLoaded', function() {
    const editor = document.getElementById('editor');
    if (editor) {
        editor.addEventListener('input', debouncedPlagiarismCheck);
    }
});