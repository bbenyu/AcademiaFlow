/*
  Enhanced Google Drive Integration Plugin
  - Save: Uploads current doc, refs, and version history as a JSON file.
  - Load: Lists all matching files, lets user pick one, loads doc/refs/versions.
  - Robust error handling and UI feedback.
  - Requires: Google OAuth2 client ID, Drive API enabled.
*/

(function() {
  // CONFIG
  const GDRIVE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // <-- Replace with your real client ID
  const GDRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file openid email profile';

  // STATE
  let gapiAccessToken = null;
  let gapiUser = null;
  let driveFileId = null; // For updating existing file

  // UI Elements
  let gdriveAuthBtn, gdriveSaveBtn, gdriveLoadBtn;

  // Utility: Show spinner overlay
  function showSpinner(msg) {
    let spinner = document.getElementById('spinner-overlay');
    if (!spinner) {
      spinner = document.createElement('div');
      spinner.id = 'spinner-overlay';
      spinner.style.position = 'fixed';
      spinner.style.top = 0;
      spinner.style.left = 0;
      spinner.style.width = '100vw';
      spinner.style.height = '100vh';
      spinner.style.background = 'rgba(0,0,0,0.3)';
      spinner.style.display = 'flex';
      spinner.style.alignItems = 'center';
      spinner.style.justifyContent = 'center';
      spinner.style.zIndex = 9999;
      spinner.innerHTML = `<div style="background:#fff;padding:24px 32px;border-radius:10px;font-size:1.2em;">
        <span id="spinner-msg">${msg||'Loading...'}</span>
      </div>`;
      document.body.appendChild(spinner);
    } else {
      spinner.style.display = 'flex';
      document.getElementById('spinner-msg').textContent = msg || 'Loading...';
    }
  }
  function hideSpinner() {
    const spinner = document.getElementById('spinner-overlay');
    if (spinner) spinner.style.display = 'none';
  }

  // Utility: Parse JWT
  function parseJwt(token) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) { return {}; }
  }

  // 1. Google Identity Services: Sign In
  function handleCredentialResponse(response) {
    google.accounts.oauth2.tokenClient({
      client_id: GDRIVE_CLIENT_ID,
      scope: GDRIVE_SCOPES,
      callback: (tokenResponse) => {
        gapiAccessToken = tokenResponse.access_token;
        gapiUser = parseJwt(response.credential);
        gdriveSaveBtn.disabled = false;
        gdriveLoadBtn.disabled = false;
        gdriveAuthBtn.textContent = "Signed in as " + (gapiUser.name || gapiUser.email);
      }
    }).requestAccessToken();
  }

  // 2. Attach Google Sign-In
  function setupAuthButton() {
    gdriveAuthBtn.onclick = function() {
      google.accounts.id.initialize({
        client_id: GDRIVE_CLIENT_ID,
        callback: handleCredentialResponse
      });
      google.accounts.id.prompt();
    };
  }

  // 3. Save to Google Drive (new file or update existing)
  async function saveToDrive() {
    if (!gapiAccessToken) return alert("Please sign in with Google Drive first.");
    showSpinner("Saving to Google Drive...");
    try {
      const quill = window.PluginAPI.getQuill();
      const docData = quill.getContents();
      const refData = window.yrefs ? window.yrefs.toArray() : [];
      const versions = JSON.parse(localStorage.getItem('editor_versions') || "[]");
      const blob = new Blob([JSON.stringify({doc: docData, refs: refData, versions})], {type: "application/json"});
      const metadata = {
        name: "AcademicEditorDocument_" + (new Date().toISOString().replace(/[:.]/g,'-')) + ".json",
        mimeType: "application/json"
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
      form.append('file', blob);

      // Always create a new file for now (could add update logic if desired)
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + gapiAccessToken },
        body: form
      });
      if (res.ok) {
        alert("Saved to Google Drive!");
      } else {
        throw new Error(await res.text());
      }
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      hideSpinner();
    }
  }

  // 4. Load from Google Drive with File Picker
  async function loadFromDrive() {
    if (!gapiAccessToken) return alert("Please sign in with Google Drive first.");
    showSpinner("Fetching file list from Google Drive...");
    try {
      // List all JSON files created by this app
      const listRes = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType="application/json" and name contains "AcademicEditorDocument_" and trashed=false&fields=files(id,name,modifiedTime)', {
        headers: { 'Authorization': 'Bearer ' + gapiAccessToken }
      });
      const listData = await listRes.json();
      hideSpinner();

      if (!listData.files || listData.files.length === 0) {
        alert("No saved documents found in your Google Drive.");
        return;
      }

      // Show file picker modal
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100vw'; modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.25)';
      modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
      modal.style.zIndex = 10000;
      modal.innerHTML = `<div style="background:#fff;padding:24px 32px;border-radius:10px;min-width:320px;max-width:90vw;">
        <h3>Load from Google Drive</h3>
        <ul style="max-height:300px;overflow:auto;">
          ${listData.files.map(f => `<li>
            <button data-fileid="${f.id}" style="margin-bottom:4px;">${f.name} <span style="color:#888;font-size:0.9em;">(${new Date(f.modifiedTime).toLocaleString()})</span></button>
          </li>`).join('')}
        </ul>
        <button id="close-gdrive-modal" style="margin-top:16px;">Cancel</button>
      </div>`;
      document.body.appendChild(modal);

      // Attach event listeners to file buttons
      modal.querySelectorAll('button[data-fileid]').forEach(btn => {
        btn.onclick = async function() {
          const fileId = btn.getAttribute('data-fileid');
          modal.remove();
          showSpinner("Loading document from Google Drive...");
          try {
            const fileRes = await fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media', {
              headers: { 'Authorization': 'Bearer ' + gapiAccessToken }
            });
            const fileData = await fileRes.json();
            // Restore document and references
            const quill = window.PluginAPI.getQuill();
            quill.setContents(fileData.doc);
            if (window.yrefs && fileData.refs) {
              window.yrefs.delete(0, window.yrefs.length);
              window.yrefs.push(fileData.refs);
            }
            // Restore version history
            if (fileData.versions) {
              localStorage.setItem('editor_versions', JSON.stringify(fileData.versions));
            }
            alert("Loaded from Google Drive!");
          } catch (err) {
            alert("Failed to load: " + err.message);
          } finally {
            hideSpinner();
          }
        };
      });
      document.getElementById('close-gdrive-modal').onclick = () => modal.remove();
    } catch (err) {
      hideSpinner();
      alert("Failed to fetch file list: " + err.message);
    }
  }

  // 5. Add buttons to UI (if not already present)
  function ensureButtons() {
    // Add to plugin-widgets-bar if available
    let bar = document.getElementById('plugin-widgets-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'plugin-widgets-bar';
      bar.style.margin = "16px 0";
      bar.style.display = "flex";
      bar.style.gap = "12px";
      document.body.insertBefore(bar, document.body.firstChild);
    }
    // Only add once
    if (!document.getElementById('gdrive-auth-btn')) {
      gdriveAuthBtn = document.createElement('button');
      gdriveAuthBtn.id = 'gdrive-auth-btn';
      gdriveAuthBtn.textContent = "Sign in with Google Drive";
      bar.appendChild(gdriveAuthBtn);
    } else {
      gdriveAuthBtn = document.getElementById('gdrive-auth-btn');
    }
    if (!document.getElementById('gdrive-save-btn')) {
      gdriveSaveBtn = document.createElement('button');
      gdriveSaveBtn.id = 'gdrive-save-btn';
      gdriveSaveBtn.textContent = "Save to Google Drive";
      gdriveSaveBtn.disabled = true;
      bar.appendChild(gdriveSaveBtn);
    } else {
      gdriveSaveBtn = document.getElementById('gdrive-save-btn');
    }
    if (!document.getElementById('gdrive-load-btn')) {
      gdriveLoadBtn = document.createElement('button');
      gdriveLoadBtn.id = 'gdrive-load-btn';
      gdriveLoadBtn.textContent = "Load from Google Drive";
      gdriveLoadBtn.disabled = true;
      bar.appendChild(gdriveLoadBtn);
    } else {
      gdriveLoadBtn = document.getElementById('gdrive-load-btn');
    }
  }

  // 6. Attach event handlers
  function setupHandlers() {
    setupAuthButton();
    gdriveSaveBtn.onclick = saveToDrive;
    gdriveLoadBtn.onclick = loadFromDrive;
  }

  // 7. Load Google Identity Services script if not present
  function ensureGoogleScript() {
    if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  // 8. Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    ensureButtons();
    ensureGoogleScript();
    setupHandlers();
  });

  // 9. Expose for plugin system (optional)
  window.GoogleDriveIntegration = {
    signIn: () => gdriveAuthBtn.click(),
    save: saveToDrive,
    load: loadFromDrive
  };
})();