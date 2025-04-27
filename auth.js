function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = '';
}
function showLogin() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = '';
}
function setSession(username) {
    localStorage.setItem('academictools_user', username);
}
function getSession() {
    return localStorage.getItem('academictools_user');
}
function clearSession() {
    localStorage.removeItem('academictools_user');
}
function register() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const errorDiv = document.getElementById('register-error');
    if (!username || !password) {
        errorDiv.textContent = "Username and password required.";
        return;
    }
    if (localStorage.getItem('user_' + username)) {
        errorDiv.textContent = "Username already exists.";
        return;
    }
    localStorage.setItem('user_' + username, JSON.stringify({ password }));
    setSession(username);
    loadDashboard();
}
function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const user = localStorage.getItem('user_' + username);
    if (!user) {
        errorDiv.textContent = "User not found.";
        return;
    }
    const userObj = JSON.parse(user);
    if (userObj.password !== password) {
        errorDiv.textContent = "Incorrect password.";
        return;
    }
    setSession(username);
    loadDashboard();
}
function logout() {
    clearSession();
    document.getElementById('dashboard-container').style.display = 'none';
    document.getElementById('auth-container').style.display = '';
}
function loadDashboard() {
    const username = getSession();
    if (!username) return;
    document.getElementById('auth-container').style.display = 'none';
    const dash = document.getElementById('dashboard-container');
    dash.innerHTML = `
        <nav class="top-nav">
            <span class="site-title">Academic Tools Dashboard</span>
            <div class="nav-links">
                <button onclick="logout()">Logout (${username})</button>
            </div>
        </nav>
        <div class="container">
            <aside class="sidebar">
                <h2>Tools</h2>
                <ul>
                    <li><a href="text-reference-combiner.html">Text & Reference Combiner</a></li>
                    <li><a href="editor.html">Editor</a></li>
                    <li><a href="#">Plagiarism Checker (Coming Soon)</a></li>
                    <li><a href="#">Citation Generator (Coming Soon)</a></li>
                    <li><a href="#">Outline Builder (Coming Soon)</a></li>
                    <li><a href="#">Reference Library (Coming Soon)</a></li>
                    <li><a href="#">PDF Annotator (Coming Soon)</a></li>
                    <li><a href="#">Math Equation Editor (Coming Soon)</a></li>
                    <li><a href="#">Reading Time Estimator (Coming Soon)</a></li>
                    <li><a href="#">Accessibility Checker (Coming Soon)</a></li>
                </ul>
            </aside>
            <main class="main-content">
                <h2>Welcome, ${username}!</h2>
                <p>Select a tool from the sidebar to get started.</p>
            </main>
        </div>
    `;
    dash.style.display = '';
}
window.onload = function() {
    if (getSession()) {
        loadDashboard();
    }
};
