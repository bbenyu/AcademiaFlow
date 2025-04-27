/**
 * Plagiarism Checker Module
 * - Checks each sentence using DuckDuckGo
 * - Highlights matches in the editor
 * - Shows sources in a modal on click
 */
window.PlagiarismChecker = (function() {
    // Utility: Debounce
    function debounce(fn, delay) {
        let timer = null;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Extract sentences
    function getSentences(text) {
        return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
    }

    // Check a sentence using DuckDuckGo
    async function checkSentenceOnline(sentence) {
        const url = `https://api.duckduckgo.com/?q="${encodeURIComponent(sentence.trim())}"&format=json&no_redirect=1&no_html=1`;
        try {
            const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!resp.ok) return [];
            const data = await resp.json();
            let results = [];
            if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                results = data.RelatedTopics.slice(0, 3).map(t => ({
                    title: t.Text || t.Result || "Result",
                    url: t.FirstURL || "#"
                }));
            }
            return results;
        } catch {
            return [];
        }
    }

    // Highlight matches in the editor
    function highlightMatches(editor, matches) {
        let content = editor.getContent({format: 'html'});
        matches.forEach((m, i) => {
            // Use a unique marker for each match
            const marker = `<span class="plagiarism-match" data-plagiarism-idx="${i}" tabindex="0" aria-label="Plagiarized segment">${m.sentence}</span>`;
            // Replace only the first occurrence
            content = content.replace(m.sentence, marker);
        });
        editor.setContent(content);
    }

    // Show sources in modal
    function showSourcesModal(sources, sentence) {
        const modal = document.getElementById('plagiarism-report');
        modal.style.display = 'block';
        modal.innerHTML = `<h3>Possible Sources for:</h3>
            <blockquote>${sentence}</blockquote>
            <ul>${sources.map(s => `<li><a href="${s.url}" target="_blank">${s.title}</a></li>`).join('')}</ul>
            <button onclick="document.getElementById('plagiarism-report').style.display='none'">Close</button>`;
    }

    // Main plagiarism check
    async function checkPlagiarism() {
        const editor = tinymce.activeEditor;
        const text = editor.getContent({format: 'text'});
        const sentences = getSentences(text);
        let matches = [];
        let progress = 0;
        showSpinner();
        for (let i = 0; i < sentences.length; i++) {
            const sources = await checkSentenceOnline(sentences[i]);
            if (sources.length > 0) {
                matches.push({sentence: sentences[i], sources});
            }
            progress = Math.round(((i+1)/sentences.length)*100);
            // Optionally update a progress bar here
        }
        hideSpinner();
        if (matches.length === 0) {
            document.getElementById('plagiarism-report').style.display = 'block';
            document.getElementById('plagiarism-report').innerHTML = "<b>No plagiarism detected.</b>";
        } else {
            highlightMatches(editor, matches);
            document.getElementById('plagiarism-report').style.display = 'block';
            document.getElementById('plagiarism-report').innerHTML = `<b>Possible plagiarism detected. Click highlighted text for sources.</b>`;
            // Add click handlers for highlights
            setTimeout(() => {
                document.querySelectorAll('.plagiarism-match').forEach((el, idx) => {
                    el.onclick = () => showSourcesModal(matches[idx].sources, matches[idx].sentence);
                    el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") el.click(); };
                });
            }, 500);
        }
    }

    // Bind to button
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('check-plagiarism');
        if (btn) btn.onclick = checkPlagiarism;
    });

    return { checkPlagiarism };
})();