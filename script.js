let snippetCount = 0;
let timerInterval = null;
let timerSeconds = 25 * 60;
let workMinutes = 25;
let breakMinutes = 5;
let isWorkSession = true;

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
    newSnippet.innerHTML = `
        <h3 class="snippet-header">Text Snippet ${snippetCount}</h3>
        <textarea id="snippet${snippetCount}" class="snippet-content" aria-label="Text Snippet ${snippetCount}"></textarea>
    `;
    container.appendChild(newSnippet);
    newSnippet.scrollIntoView({ behavior: 'smooth' });
    document.getElementById(`snippet${snippetCount}`).addEventListener('input', updatePreview);
}

function updatePreview() {
    const snippets = [];
    for (let i = 1; i <= snippetCount; i++) {
        const snippet = document.getElementById(`snippet${i}`)?.value || '';
        if (snippet) snippets.push(snippet);
    }
    document.getElementById('preview-content').innerText = snippets.join('\n\n');
}

function combineText() {
    const snippets = [];
    for (let i = 1; i <= snippetCount; i++) {
        const snippet = document.getElementById(`snippet${i}`)?.value || '';
        if (snippet) snippets.push(snippet);
    }
    const combined = snippets.join('\n\n');
    document.getElementById('output-text').innerHTML = combined.replace(/\n/g, '<br>');
    document.getElementById('output-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('output-modal').style.display = 'none';
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

function startTimer() {
    if (!timerInterval) {
        workMinutes = parseInt(document.getElementById('work-minutes').value) || 25;
        breakMinutes = parseInt(document.getElementById('break-minutes').value) || 5;
        timerSeconds = isWorkSession ? workMinutes * 60 : breakMinutes * 60;
        timerInterval = setInterval(updateTimer, 1000);
    }
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    workMinutes = parseInt(document.getElementById('work-minutes').value) || 25;
    breakMinutes = parseInt(document.getElementById('break-minutes').value) || 5;
    timerSeconds = isWorkSession ? workMinutes * 60 : breakMinutes * 60;
    document.getElementById('timer-display').innerText = formatTime(timerSeconds);
}

function updateTimer() {
    timerSeconds--;
    if (timerSeconds <= 0) {
        isWorkSession = !isWorkSession;
        workMinutes = parseInt(document.getElementById('work-minutes').value) || 25;
        breakMinutes = parseInt(document.getElementById('break-minutes').value) || 5;
        timerSeconds = isWorkSession ? workMinutes * 60 : breakMinutes * 60;
    }
    document.getElementById('timer-display').innerText = formatTime(timerSeconds);
}

function initialize() {
    document.getElementById('loading-spinner').style.display = 'block';
    try {
        addSnippet(); // Add one snippet to start
        document.getElementById('work-minutes').value = workMinutes;
        document.getElementById('break-minutes').value = breakMinutes;
        updatePreview();
    } catch (e) {
        console.error('Initialization failed:', e);
        alert('Error during initialization. Please try again.');
    } finally {
        document.getElementById('loading-spinner').style.display = 'none';
    }
}

window.onload = initialize;
