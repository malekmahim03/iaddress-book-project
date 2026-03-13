/**
 * iAddress Pro — Frontend App Logic v2.0
 * Features: Auth, CRUD, Favourites, Groups,
 *           Search, Sort, Grid/List view, Detail panel
 */

'use strict';

// ── CONFIG ────────────────────────────────
const API = 'http://localhost:3001/api';

// ── STATE ─────────────────────────────────
let token       = localStorage.getItem('iap_token');
let currentUser = JSON.parse(localStorage.getItem('iap_user') || 'null');
let contacts    = [];
let currentView = 'all';
let currentLayout = 'list';
let currentSort   = 'name';
let deleteTarget  = null;
let panelContact  = null;
let sidebarOpen   = true;

// Avatar colors pool
const COLORS = [
  '#6366f1','#ec4899','#f59e0b','#10b981',
  '#3b82f6','#8b5cf6','#ef4444','#14b8a6',
  '#f97316','#06b6d4','#84cc16','#a855f7'
];

// ════════════════════════════════════════
// INIT
// ════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  // Show loading, then transition
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    ls.classList.add('out');
    setTimeout(() => {
      ls.classList.add('hidden');
      token && currentUser ? showApp() : showAuth();
    }, 500);
  }, 1600);
});

// ════════════════════════════════════════
// AUTH
// ════════════════════════════════════════
function showAuth() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  updateUserUI();
  loadAll();
}

function updateUserUI() {
  if (!currentUser) return;
  const init = currentUser.name.charAt(0).toUpperCase();
  el('sb-avatar').textContent = init;
  el('sb-user-name').textContent = currentUser.name;
  el('sb-user-email').textContent = currentUser.email;
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  el('tab-login').classList.toggle('active', isLogin);
  el('tab-register').classList.toggle('active', !isLogin);
  el('tab-slider').classList.toggle('right', !isLogin);
  el('form-login').classList.toggle('active', isLogin);
  el('form-register').classList.toggle('active', !isLogin);
  el('l-err').textContent = '';
  el('r-err').textContent = '';
}

async function login() {
  const email = val('l-email'), password = val('l-pass');
  const errEl = el('l-err');
  errEl.textContent = '';
  if (!email || !password) return (errEl.textContent = 'Please enter email and password.');

  setBtnLoading('btn-login', true, 'Signing in…');
  try {
    const res  = await post(`${API}/auth/login`, { email, password });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; return; }
    storeAuth(data);
    showApp();
    toast(`Welcome back, ${data.user.name}! 👋`, 'success');
  } catch { errEl.textContent = 'Cannot reach server. Is it running?'; }
  finally   { setBtnLoading('btn-login', false, 'Sign In'); }
}

async function register() {
  const name = val('r-name'), email = val('r-email'), password = val('r-pass');
  const errEl = el('r-err');
  errEl.textContent = '';
  if (!name || !email || !password) return (errEl.textContent = 'All fields are required.');

  setBtnLoading('btn-register', true, 'Creating account…');
  try {
    const res  = await post(`${API}/auth/register`, { name, email, password });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; return; }
    storeAuth(data);
    showApp();
    toast(`Account created! Welcome, ${data.user.name} 🎉`, 'success');
  } catch { errEl.textContent = 'Cannot reach server. Is it running?'; }
  finally   { setBtnLoading('btn-register', false, 'Create Account'); }
}

function storeAuth(data) {
  token = data.token;
  currentUser = data.user;
  localStorage.setItem('iap_token', token);
  localStorage.setItem('iap_user', JSON.stringify(currentUser));
}

function logout() {
  token = currentUser = null;
  contacts = [];
  localStorage.removeItem('iap_token');
  localStorage.removeItem('iap_user');
  el('l-email').value = '';
  el('l-pass').value = '';
  showAuth();
  toast('Signed out successfully.', 'info');
}

// ════════════════════════════════════════
// DATA LOADING
// ════════════════════════════════════════
async function loadAll() {
  await Promise.all([fetchContacts(), fetchStats()]);
}

async function fetchContacts() {
  const search = val('search-input');
  let url = `${API}/contacts?sort=${currentSort}`;
  if (search)                      url += `&search=${encodeURIComponent(search)}`;
  if (currentView === 'favourites') url += '&favourite=true';
  if (currentView === 'recent')     url += '&sort=recent';

  try {
    const res = await get(url);
    if (res.status === 401) { logout(); return; }
    contacts = await res.json();
    renderContacts();
  } catch { toast('Failed to load contacts.', 'error'); }
}

async function fetchStats() {
  try {
    const data = await (await get(`${API}/stats`)).json();
    el('badge-all').textContent  = data.total;
    el('badge-favs').textContent = data.favourites;
    el('ss-total').textContent   = data.total;
    el('ss-favs').textContent    = data.favourites;
    el('ss-groups').textContent  = Object.keys(data.groups || {}).length;
    renderGroups(data.groups || {});
  } catch {}
}

function renderGroups(groups) {
  const list = el('groups-list');
  list.innerHTML = '';
  Object.entries(groups).sort().forEach(([name, count]) => {
    const btn = document.createElement('button');
    btn.className = 'sb-item' + (currentView === 'group:' + name ? ' active' : '');
    btn.id = 'nav-group-' + name;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" opacity=".3"/></svg>
      <span>${escHtml(name)}</span>
      <span class="sb-badge">${count}</span>`;
    btn.onclick = () => setView('group:' + name);
    list.appendChild(btn);
  });
}

// ════════════════════════════════════════
// RENDER
// ════════════════════════════════════════
function renderContacts() {
  const container = el('contacts-container');
  const empty     = el('empty-state');

  container.innerHTML = '';
  container.className = currentLayout === 'grid' ? 'contacts-grid' : 'contacts-list';

  if (!contacts.length) {
    container.classList.add('hidden');
    empty.classList.remove('hidden');
    const titles = {
      favourites: ['No favourites yet', 'Star a contact to see it here.'],
      recent:     ['No contacts yet',    'Add your first contact below.'],
    };
    const [t, d] = titles[currentView] || ['No contacts found', val('search-input') ? 'Try a different keyword.' : 'Add your first contact below.'];
    el('empty-title').textContent = t;
    el('empty-desc').textContent  = d;
    return;
  }

  container.classList.remove('hidden');
  empty.classList.add('hidden');

  contacts.forEach((c, i) => {
    const node = currentLayout === 'grid' ? makeCard(c, i) : makeRow(c, i);
    container.appendChild(node);
  });
}

function makeRow(c, i) {
  const id      = c._id || c.id;
  const initials = getInitials(c.name);
  const isFav    = !!c.favourite;
  const color    = c.avatarColor || COLORS[0];

  const div = document.createElement('div');
  div.className = 'contact-row';
  div.style.setProperty('--row-color', color);
  div.style.animationDelay = `${i * 0.03}s`;
  div.setAttribute('data-id', id);

  div.innerHTML = `
    <div class="row-avatar" style="background:${color}">${initials}</div>
    <div class="row-main">
      <div class="row-name">${escHtml(c.name)}</div>
      <div class="row-meta">
        ${c.phone   ? `<span class="row-detail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.62 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>${escHtml(c.phone)}</span>` : ''}
        ${c.email   ? `<span class="row-detail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${escHtml(c.email)}</span>` : ''}
        ${c.company ? `<span class="row-detail">${escHtml(c.company)}</span>` : ''}
        <span class="row-group-tag">${escHtml(c.group || 'General')}</span>
      </div>
    </div>
    <div class="row-actions">
      <button class="row-btn ${isFav ? 'fav-on' : ''}" onclick="event.stopPropagation();toggleFav('${id}',this)" title="${isFav?'Unstar':'Star'}">
        <svg viewBox="0 0 24 24" fill="${isFav?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
      <button class="row-btn" onclick="event.stopPropagation();openEditModal('${id}')" title="Edit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="row-btn del" onclick="event.stopPropagation();openDeleteModal('${id}','${escHtml(c.name).replace(/'/g,"\\'")}') " title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>`;

  div.addEventListener('click', () => openDetailPanel(c));
  return div;
}

function makeCard(c, i) {
  const id      = c._id || c.id;
  const initials = getInitials(c.name);
  const isFav    = !!c.favourite;
  const color    = c.avatarColor || COLORS[0];

  const div = document.createElement('div');
  div.className = 'contact-card';
  div.style.setProperty('--card-color', color);
  div.style.animationDelay = `${i * 0.04}s`;
  div.setAttribute('data-id', id);

  div.innerHTML = `
    <div class="card-avatar-wrap">
      <div class="card-avatar" style="background:${color}">${initials}</div>
      <button class="card-fav-btn ${isFav?'on':''}" onclick="event.stopPropagation();toggleFav('${id}',this)" title="${isFav?'Unstar':'Star'}">
        <svg viewBox="0 0 24 24" fill="${isFav?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
    </div>
    <div class="card-name">${escHtml(c.name)}</div>
    <div class="card-company">${escHtml(c.company || c.group || 'No company')}</div>
    <div class="card-info">
      ${c.phone ? `<div class="card-info-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.62 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg><span>${escHtml(c.phone)}</span></div>` : ''}
      ${c.email ? `<div class="card-info-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span>${escHtml(c.email)}</span></div>` : ''}
    </div>
    <div class="card-footer">
      <span class="card-tag">${escHtml(c.group || 'General')}</span>
      <div class="card-actions">
        <button class="card-action" onclick="event.stopPropagation();openEditModal('${id}')" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="card-action del" onclick="event.stopPropagation();openDeleteModal('${id}','${escHtml(c.name).replace(/'/g,"\\'")}') " title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>`;

  div.addEventListener('click', () => openDetailPanel(c));
  return div;
}

// ════════════════════════════════════════
// DETAIL PANEL
// ════════════════════════════════════════
function openDetailPanel(c) {
  panelContact = c;
  const id     = c._id || c.id;
  const color  = c.avatarColor || COLORS[0];
  const isFav  = !!c.favourite;

  el('dp-avatar').textContent  = getInitials(c.name);
  el('dp-avatar').style.background = color;
  el('dp-name').textContent    = c.name;
  el('dp-company').textContent = c.company || c.group || '';

  const favBtn = el('dp-fav-btn');
  favBtn.classList.toggle('active', isFav);
  favBtn.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
  favBtn.querySelector('svg').style.color = isFav ? 'inherit' : '';

  // Build detail rows
  const rows = [
    { label:'Phone',    val: c.phone,    icon: phoneIcon(),  href: c.phone ? `tel:${c.phone}` : null },
    { label:'Email',    val: c.email,    icon: emailIcon(),  href: c.email ? `mailto:${c.email}` : null },
    { label:'Company',  val: c.company,  icon: buildingIcon() },
    { label:'Address',  val: c.address,  icon: pinIcon() },
    { label:'Website',  val: c.website,  icon: webIcon(),    href: c.website || null },
    { label:'Birthday', val: c.birthday, icon: calIcon() },
    { label:'Group',    val: c.group,    icon: groupIcon() },
    { label:'Notes',    val: c.notes,    icon: noteIcon() },
  ].filter(r => r.val);

  el('dp-body').innerHTML = rows.length ? `
    <div class="dp-section">
      <div class="dp-section-title">Contact Information</div>
      ${rows.map(r => `
        <div class="dp-row">
          <div class="dp-row-icon">${r.icon}</div>
          <div class="dp-row-info">
            <div class="dp-row-label">${r.label}</div>
            <div class="dp-row-val">${r.href ? `<a href="${r.href}" target="_blank">${escHtml(r.val)}</a>` : escHtml(r.val)}</div>
          </div>
        </div>`).join('')}
    </div>
    <div class="dp-section" style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
      <div class="dp-section-title">Added</div>
      <div class="dp-row-val" style="font-size:.82rem;color:var(--t2)">${c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : 'Unknown'}</div>
    </div>` : '<p style="color:var(--t3);font-size:.85rem">No details saved for this contact.</p>';

  el('detail-panel').classList.remove('hidden');
  el('detail-overlay').classList.remove('hidden');
  setTimeout(() => el('detail-panel').classList.add('open'), 10);
}

function closeDetailPanel() {
  el('detail-panel').classList.remove('open');
  el('detail-overlay').classList.add('hidden');
  setTimeout(() => el('detail-panel').classList.add('hidden'), 300);
  panelContact = null;
}

function toggleFavFromPanel() {
  if (!panelContact) return;
  toggleFav(panelContact._id || panelContact.id, el('dp-fav-btn'), true);
}

function editFromPanel() {
  if (!panelContact) return;
  closeDetailPanel();
  openEditModal(panelContact._id || panelContact.id);
}

function deleteFromPanel() {
  if (!panelContact) return;
  closeDetailPanel();
  openDeleteModal(panelContact._id || panelContact.id, panelContact.name);
}

// ════════════════════════════════════════
// VIEWS & SEARCH
// ════════════════════════════════════════
function setView(view) {
  currentView = view;

  // Update sidebar active state
  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  if (view === 'all')        el('nav-all')?.classList.add('active');
  if (view === 'favourites') el('nav-favs')?.classList.add('active');
  if (view === 'recent')     el('nav-recent')?.classList.add('active');
  if (view.startsWith('group:')) {
    el('nav-group-' + view.slice(6))?.classList.add('active');
  }

  const titles = {
    all:        ['All Contacts',    'Manage your personal address book'],
    favourites: ['Favourites ⭐',   'Your starred contacts'],
    recent:     ['Recently Added',  'Contacts added most recently'],
  };
  const [title, sub] = titles[view] || [`Group: ${view.slice(6)}`, `Contacts in ${view.slice(6)} group`];
  el('page-title').textContent = title;
  el('page-sub').textContent   = sub;

  clearSearch(false);
  fetchContacts();
}

function handleSearch() {
  const q = val('search-input');
  el('search-clear').classList.toggle('hidden', !q);
  fetchContacts();
}

function clearSearch(reload = true) {
  el('search-input').value = '';
  el('search-clear').classList.add('hidden');
  if (reload) fetchContacts();
}

function handleSort() {
  currentSort = el('sort-select').value;
  fetchContacts();
}

function setLayout(layout) {
  currentLayout = layout;
  el('btn-grid').classList.toggle('active', layout === 'grid');
  el('btn-list').classList.toggle('active', layout === 'list');
  renderContacts();
}

function toggleSidebar() {
  const sb = el('sidebar');
  if (window.innerWidth <= 900) {
    sb.classList.toggle('mobile-open');
  } else {
    sidebarOpen = !sidebarOpen;
    sb.classList.toggle('collapsed', !sidebarOpen);
  }
}

// ════════════════════════════════════════
// ADD / EDIT CONTACT
// ════════════════════════════════════════
function openAddModal() {
  el('edit-id').value   = '';
  el('c-name').value    = '';
  el('c-company').value = '';
  el('c-phone').value   = '';
  el('c-email').value   = '';
  el('c-address').value = '';
  el('c-website').value = '';
  el('c-birthday').value= '';
  el('c-notes').value   = '';
  el('c-group').value   = 'General';
  el('modal-err').textContent = '';
  el('modal-title').textContent    = 'Add New Contact';
  el('modal-subtitle').textContent = 'Fill in the contact details below';
  el('btn-save-text').textContent  = 'Save Contact';
  el('modal-avatar').textContent   = '?';
  el('modal-avatar').style.background = 'var(--a)';
  el('contact-modal').classList.remove('hidden');
  setTimeout(() => el('c-name').focus(), 100);
}

function openEditModal(id) {
  const c = contacts.find(x => (x._id || x.id) === id);
  if (!c) return;

  el('edit-id').value    = id;
  el('c-name').value     = c.name    || '';
  el('c-company').value  = c.company || '';
  el('c-phone').value    = c.phone   || '';
  el('c-email').value    = c.email   || '';
  el('c-address').value  = c.address || '';
  el('c-website').value  = c.website || '';
  el('c-birthday').value = c.birthday|| '';
  el('c-notes').value    = c.notes   || '';
  el('c-group').value    = c.group   || 'General';
  el('modal-err').textContent = '';
  el('modal-title').textContent    = 'Edit Contact';
  el('modal-subtitle').textContent = `Editing details for ${c.name}`;
  el('btn-save-text').textContent  = 'Save Changes';

  // Avatar preview
  const init = getInitials(c.name);
  el('modal-avatar').textContent = init;
  el('modal-avatar').style.background = c.avatarColor || 'var(--a)';

  el('contact-modal').classList.remove('hidden');
  setTimeout(() => el('c-name').focus(), 100);
}

function updateModalAvatar() {
  const name = val('c-name').trim();
  el('modal-avatar').textContent = name ? getInitials(name) : '?';
}

function closeModal() { el('contact-modal').classList.add('hidden'); }
function closeModalOutside(e) { if (e.target === el('contact-modal')) closeModal(); }

async function saveContact() {
  const id   = val('edit-id');
  const name = val('c-name').trim();
  const errEl = el('modal-err');
  errEl.textContent = '';

  if (!name) return (errEl.textContent = '⚠ Contact name is required.');

  const body = {
    name,
    company:  val('c-company').trim(),
    phone:    val('c-phone').trim(),
    email:    val('c-email').trim(),
    address:  val('c-address').trim(),
    website:  val('c-website').trim(),
    birthday: val('c-birthday'),
    notes:    val('c-notes').trim(),
    group:    el('c-group').value,
  };

  el('btn-save').disabled = true;
  try {
    const res  = id
      ? await apiFetch('PUT',  `${API}/contacts/${id}`, body)
      : await apiFetch('POST', `${API}/contacts`, body);
    const data = await res.json();
    if (!res.ok) return (errEl.textContent = data.error || 'Save failed.');
    closeModal();
    await loadAll();
    toast(id ? '✏️ Contact updated successfully!' : '✅ Contact added successfully!', 'success');
  } catch { errEl.textContent = 'Server error. Please try again.'; }
  finally  { el('btn-save').disabled = false; }
}

// ════════════════════════════════════════
// FAVOURITE
// ════════════════════════════════════════
async function toggleFav(id, btn, fromPanel = false) {
  try {
    const res  = await apiFetch('PATCH', `${API}/contacts/${id}/favourite`);
    if (!res.ok) { toast('Failed to update favourite.', 'error'); return; }
    const data = await res.json();
    const isFav = !!data.favourite;

    // Update local array
    const c = contacts.find(x => (x._id || x.id) === id);
    if (c) c.favourite = isFav;

    // Update button
    if (btn) {
      btn.classList.toggle('fav-on', isFav);
      btn.classList.toggle('on', isFav);
      btn.classList.toggle('active', isFav);
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
    }

    // If panel is open for this contact, refresh panel fav btn
    if (panelContact && (panelContact._id || panelContact.id) === id) {
      panelContact.favourite = isFav;
      const pb = el('dp-fav-btn');
      pb.classList.toggle('active', isFav);
      pb.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
    }

    // Remove from favourites view if unstarred
    if (currentView === 'favourites' && !isFav) {
      await fetchContacts();
    }

    await fetchStats();
    toast(isFav ? '⭐ Added to favourites!' : 'Removed from favourites', isFav ? 'gold' : 'info');
  } catch { toast('Something went wrong.', 'error'); }
}

// ════════════════════════════════════════
// DELETE
// ════════════════════════════════════════
function openDeleteModal(id, name) {
  deleteTarget = id;
  el('del-name').textContent = name;
  el('delete-modal').classList.remove('hidden');
}

function closeDeleteModal() {
  deleteTarget = null;
  el('delete-modal').classList.add('hidden');
}

function closeDeleteOutside(e) { if (e.target === el('delete-modal')) closeDeleteModal(); }

async function confirmDelete() {
  if (!deleteTarget) return;
  try {
    const res = await apiFetch('DELETE', `${API}/contacts/${deleteTarget}`);
    if (!res.ok) { toast('Delete failed.', 'error'); return; }
    closeDeleteModal();
    closeDetailPanel();
    await loadAll();
    toast('🗑️ Contact deleted.', 'success');
  } catch { toast('Server error.', 'error'); }
}

// ════════════════════════════════════════
// TOAST
// ════════════════════════════════════════
let toastTimer;
function toast(msg, type = 'success') {
  const t = el('toast');
  t.textContent = msg;
  t.className   = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

// ════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeDeleteModal();
    closeDetailPanel();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    el('search-input')?.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    if (!el('app').classList.contains('hidden')) openAddModal();
  }
});

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════
function el(id)  { return document.getElementById(id); }
function val(id) { return (el(id)?.value || '').trim(); }
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function getInitials(name) {
  return (name || '').split(' ').map(w=>w[0]).filter(Boolean).slice(0,2).join('').toUpperCase() || '?';
}
function get(url)  { return fetch(url, { headers: { Authorization: `Bearer ${token}` } }); }
function post(url, body) { return fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); }
function apiFetch(method, url, body) {
  const opts = { method, headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(url, opts);
}
function setBtnLoading(id, loading, text) {
  const b = el(id);
  if (!b) return;
  b.disabled = loading;
  b.querySelector('span') ? (b.querySelector('span').textContent = text) : (b.textContent = text);
}

// ── SVG icon helpers ──
const svgWrap = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d}</svg>`;
const phoneIcon    = () => svgWrap(`<path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.62 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/>`);
const emailIcon    = () => svgWrap(`<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>`);
const buildingIcon = () => svgWrap(`<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`);
const pinIcon      = () => svgWrap(`<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>`);
const webIcon      = () => svgWrap(`<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`);
const calIcon      = () => svgWrap(`<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`);
const groupIcon    = () => svgWrap(`<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`);
const noteIcon     = () => svgWrap(`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>`);
app.listen(3001, () => {
  console.log("Server running on port 3001");
});