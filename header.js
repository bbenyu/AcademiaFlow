/**
 * Renders the dynamic header.
 * @param {Object} opts - { title: string, actions: [{label, href, onclick}] }
 */
function renderHeader(opts) {
    const header = document.querySelector('.top-nav');
    if (!header) return;
    header.innerHTML = `
        <span class="site-title">${opts.title || 'AcademiaFlow'}</span>
        <div class="nav-links">
            ${(opts.actions || []).map(a =>
                `<a href="${a.href || '#'}"${a.onclick ? ` onclick="${a.onclick}"` : ''}>${a.label}</a>`
            ).join('')}
        </div>
    `;
}