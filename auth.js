// Spinner utility functions
function showSpinner() {
    const spinner = document.getElementById('spinner-overlay');
    if (spinner) spinner.style.display = 'flex';
}

function hideSpinner() {
    const spinner = document.getElementById('spinner-overlay');
    if (spinner) spinner.style.display = 'none';
}

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

// Call this at the top of every protected page (dashboard, editor, etc.)
function requireLogin() {
    if (!getSession()) {
        window.location.href = "index.html";
        return false;
    }
    return true;
}
function register() {
    showSpinner();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const errorDiv = document.getElementById('register-error');
    
    if (!username || !password) {
        errorDiv.textContent = "Username and password required.";
        hideSpinner();
        return;
    }
    
    if (localStorage.getItem('user_' + username)) {
        errorDiv.textContent = "Username already exists.";
        hideSpinner();
        return;
    }
    
    // Simulate network delay for better UX
    setTimeout(() => {
        localStorage.setItem('user_' + username, JSON.stringify({ password }));
        setSession(username);
        hideSpinner();
        window.location.href = "dashboard.html";
    }, 1000);
}
function login() {
    showSpinner();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    // Clear previous errors
    errorDiv.textContent = "";
    
    const user = localStorage.getItem('user_' + username);
    if (!user) {
        setTimeout(() => {
            errorDiv.textContent = "User not found.";
            hideSpinner();
        }, 500);
        return;
    }
    
    const userObj = JSON.parse(user);
    if (userObj.password !== password) {
        setTimeout(() => {
            errorDiv.textContent = "Incorrect password.";
            hideSpinner();
        }, 500);
        return;
    }
    
    // Simulate network delay for better UX
    setTimeout(() => {
        setSession(username);
        hideSpinner();
        window.location.href = "dashboard.html";
    }, 1000);
}
function logout() {
    showSpinner();
    // Simulate network delay for better UX
    setTimeout(() => {
        clearSession();
        hideSpinner();
        window.location.href = "index.html";
    }, 500);
}
function loadDashboard() {
    if (!requireLogin()) return;
    
    const username = getSession();
    document.getElementById('username-display').textContent = username;
}
window.onload = function() {
    // Check if we're on a protected page
    const isProtectedPage = document.getElementById('dashboard-container') || 
                           document.getElementById('editor-container') ||
                           document.getElementById('tool-container');
    
    if (isProtectedPage) {
        // If this is a protected page, require login
        if (requireLogin()) {
            loadDashboard();
        }
    } else if (getSession() && document.getElementById('auth-container')) {
        // If user is already logged in and we're on the login page, redirect to dashboard
        window.location.href = "dashboard.html";
    }
    
    // Hide spinner on initial load if it exists
    hideSpinner();
};
