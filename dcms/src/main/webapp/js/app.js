/**
 * ============================================================================
 * DCMS Frontend - Application principale
 * ============================================================================
 * Gere l'interface utilisateur, la navigation, et les interactions.
 * ============================================================================
 */

// Variable globale pour stocker l'ID de la plainte actuellement affichee
let currentComplaintId = null;

/* ============================================================
   INITIALISATION
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
    if (Auth.isLoggedIn()) {
        showApp();
    } else {
        showAuthPage();
    }
});

/* ============================================================
   AUTHENTIFICATION
   ============================================================ */

function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('auth-error').classList.add('hidden');
}

function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('auth-error').classList.add('hidden');
}

function showAuthError(message) {
    const el = document.getElementById('auth-error');
    el.textContent = message;
    el.classList.remove('hidden');
}

async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!username || !password) {
        showAuthError('Veuillez remplir tous les champs.');
        return;
    }

    try {
        await apiLogin(username, password);
        showApp();
    } catch (error) {
        showAuthError(error.message || 'Identifiants incorrects.');
    }
}

async function register() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const role = document.getElementById('reg-role').value;

    if (!username || !email || !password) {
        showAuthError('Veuillez remplir tous les champs.');
        return;
    }

    try {
        await apiRegister(username, email, password, role);
        showApp();
    } catch (error) {
        showAuthError(error.message || 'Erreur lors de l\'inscription.');
    }
}

function logout() {
    Auth.clear();
    showAuthPage();
    showToast('Deconnexion reussie', 'info');
}

// Permettre la connexion avec la touche Entree
document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        if (!loginForm.classList.contains('hidden')) {
            login();
        } else if (!registerForm.classList.contains('hidden')) {
            register();
        }
    }
});

/* ============================================================
   NAVIGATION PAGES
   ============================================================ */

function showAuthPage() {
    document.getElementById('auth-page').classList.add('active');
    document.getElementById('auth-page').classList.remove('hidden');
    document.getElementById('app-page').classList.add('hidden');
    document.getElementById('app-page').classList.remove('active');
    // Reset les champs
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    showLogin();
}

function showApp() {
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('auth-page').classList.remove('active');
    document.getElementById('app-page').classList.remove('hidden');
    document.getElementById('app-page').classList.add('active');

    // Mettre a jour la navbar
    document.getElementById('nav-username').textContent = Auth.getUsername();
    const roleBadge = document.getElementById('nav-role');
    roleBadge.textContent = Auth.getRole();
    roleBadge.className = 'role-badge ' + Auth.getRole();

    // Afficher/masquer les liens selon le role
    const role = Auth.getRole();
    const adminLinks = document.querySelectorAll('.admin-only');
    adminLinks.forEach(function (link) {
        if (role === 'ADMIN' || role === 'AGENT') {
            link.classList.remove('hidden');
        } else {
            link.classList.add('hidden');
        }
    });

    // Charger le dashboard
    showSection('dashboard');
}

/* ============================================================
   NAVIGATION SECTIONS
   ============================================================ */

function showSection(sectionName) {
    // Masquer toutes les sections
    document.querySelectorAll('.section').forEach(function (s) {
        s.classList.remove('active');
        s.classList.add('hidden');
    });

    // Afficher la section demandee
    const section = document.getElementById('section-' + sectionName);
    if (section) {
        section.classList.add('active');
        section.classList.remove('hidden');
    }

    // Mettre a jour les liens actifs
    document.querySelectorAll('.nav-link').forEach(function (link) {
        link.classList.remove('active');
    });
    event.target.classList.add('active');

    // Charger les donnees de la section
    switch (sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'my-complaints':
            loadMyComplaints();
            break;
        case 'all-complaints':
            loadAllComplaints();
            break;
        case 'history':
            loadHistory();
            break;
    }
}

/* ============================================================
   DASHBOARD
   ============================================================ */

async function loadDashboard() {
    try {
        const role = Auth.getRole();
        let complaints;

        if (role === 'ADMIN' || role === 'AGENT') {
            const data = await apiGetAllComplaints(0, 100);
            complaints = data.data || [];
        } else {
            const data = await apiGetMyComplaints();
            complaints = data.data || [];
        }

        // Calculer les statistiques
        const total = complaints.length;
        const newCount = complaints.filter(function (c) { return c.status === 'NOUVELLE'; }).length;
        const progressCount = complaints.filter(function (c) { return c.status === 'EN_COURS'; }).length;
        const resolvedCount = complaints.filter(function (c) { return c.status === 'RESOLUE'; }).length;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-new').textContent = newCount;
        document.getElementById('stat-progress').textContent = progressCount;
        document.getElementById('stat-resolved').textContent = resolvedCount;

        // Afficher les plaintes recentes (5 dernieres)
        const recent = complaints.slice(0, 5);
        renderComplaintsList('recent-complaints', recent);

    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
        if (error.status === 401) {
            logout();
        }
    }
}

/* ============================================================
   MES PLAINTES
   ============================================================ */

async function loadMyComplaints() {
    try {
        const data = await apiGetMyComplaints();
        const complaints = data.data || [];
        renderComplaintsList('my-complaints-list', complaints);
    } catch (error) {
        console.error('Erreur chargement mes plaintes:', error);
        if (error.status === 401) logout();
    }
}

/* ============================================================
   TOUTES LES PLAINTES (ADMIN/AGENT)
   ============================================================ */

async function loadAllComplaints() {
    try {
        const data = await apiGetAllComplaints(0, 100);
        const complaints = data.data || [];
        renderComplaintsList('all-complaints-list', complaints);
    } catch (error) {
        console.error('Erreur chargement toutes les plaintes:', error);
        if (error.status === 401) logout();
    }
}

async function filterByStatus() {
    const status = document.getElementById('filter-status').value;
    try {
        let complaints;
        if (status) {
            const data = await apiGetComplaintsByStatus(status);
            complaints = data.data || [];
        } else {
            const data = await apiGetAllComplaints(0, 100);
            complaints = data.data || [];
        }
        renderComplaintsList('all-complaints-list', complaints);
    } catch (error) {
        console.error('Erreur filtrage:', error);
    }
}

/* ============================================================
   HISTORIQUE (ADMIN)
   ============================================================ */

async function loadHistory() {
    try {
        const data = await apiGetAllHistory();
        const history = data.data || [];
        renderHistoryList('history-list', history);
    } catch (error) {
        console.error('Erreur chargement historique:', error);
        if (error.status === 401) logout();
    }
}

/* ============================================================
   CREATION DE PLAINTE
   ============================================================ */

function openNewComplaintModal() {
    document.getElementById('complaint-title').value = '';
    document.getElementById('complaint-desc').value = '';
    openModal('modal-new-complaint');
}

async function createComplaint() {
    const title = document.getElementById('complaint-title').value.trim();
    const description = document.getElementById('complaint-desc').value.trim();

    if (!title || !description) {
        showToast('Veuillez remplir tous les champs.', 'error');
        return;
    }

    try {
        await apiCreateComplaint(title, description);
        closeModal('modal-new-complaint');
        showToast('Plainte creee avec succes !', 'success');

        // Recharger la section active
        refreshCurrentSection();
    } catch (error) {
        showToast(error.message || 'Erreur lors de la creation.', 'error');
    }
}

/* ============================================================
   DETAIL D'UNE PLAINTE
   ============================================================ */

async function openComplaintDetail(complaintId) {
    currentComplaintId = complaintId;

    try {
        const data = await apiGetComplaintById(complaintId);
        const c = data.data;

        document.getElementById('detail-title').textContent = c.title;
        document.getElementById('detail-id').textContent = '#' + c.id;
        document.getElementById('detail-status').innerHTML = '<span class="status-badge status-' + c.status + '">' + getStatusLabel(c.status) + '</span>';
        document.getElementById('detail-creator').textContent = c.createdByUsername || 'N/A';
        document.getElementById('detail-agent').textContent = c.assignedToUsername || 'Non assigne';
        document.getElementById('detail-date').textContent = formatDate(c.createdAt);
        document.getElementById('detail-desc').textContent = c.description;

        // Afficher les actions pour ADMIN/AGENT
        const role = Auth.getRole();
        const actionsDiv = document.getElementById('detail-actions');
        if (role === 'ADMIN' || role === 'AGENT') {
            actionsDiv.classList.remove('hidden');
            // Actions admin uniquement
            const adminActions = document.querySelectorAll('.admin-action');
            adminActions.forEach(function (el) {
                if (role === 'ADMIN') {
                    el.style.display = 'flex';
                } else {
                    el.style.display = 'none';
                }
            });
        } else {
            actionsDiv.classList.add('hidden');
        }

        // Charger l'historique de la plainte
        await loadComplaintHistory(complaintId);

        openModal('modal-complaint-detail');

    } catch (error) {
        showToast(error.message || 'Erreur lors du chargement.', 'error');
    }
}

async function loadComplaintHistory(complaintId) {
    const container = document.getElementById('detail-history-list');
    const role = Auth.getRole();

    if (role !== 'ADMIN' && role !== 'AGENT') {
        document.getElementById('detail-history').classList.add('hidden');
        return;
    }

    document.getElementById('detail-history').classList.remove('hidden');

    try {
        const data = await apiGetHistoryByComplaint(complaintId);
        const history = data.data || [];

        if (history.length === 0) {
            container.innerHTML = '<p style="color:#a0aec0;font-size:0.9em;">Aucun historique disponible.</p>';
            return;
        }

        let html = '';
        history.forEach(function (h) {
            html += '<div class="timeline-item">';
            html += '  <div class="timeline-dot"></div>';
            html += '  <div>';
            html += '    <div class="timeline-text">';
            html += (h.oldStatusLibelle || 'Creation') + ' &rarr; ' + (h.newStatusLibelle || h.newStatus);
            html += '    </div>';
            html += '    <div class="timeline-date">';
            html += (h.changedByUsername || 'Systeme') + ' - ' + formatDate(h.changedAt);
            html += '    </div>';
            html += '  </div>';
            html += '</div>';
        });

        container.innerHTML = html;

    } catch (error) {
        container.innerHTML = '<p style="color:#a0aec0;font-size:0.9em;">Historique non disponible.</p>';
    }
}

/* ============================================================
   ACTIONS SUR UNE PLAINTE
   ============================================================ */

async function changeStatus() {
    const newStatus = document.getElementById('action-status').value;
    if (!newStatus) {
        showToast('Selectionnez un statut.', 'error');
        return;
    }

    try {
        await apiUpdateStatus(currentComplaintId, newStatus);
        showToast('Statut mis a jour avec succes !', 'success');
        closeModal('modal-complaint-detail');
        refreshCurrentSection();
    } catch (error) {
        showToast(error.message || 'Erreur lors de la mise a jour.', 'error');
    }
}

async function assignAgent() {
    const agentId = document.getElementById('action-agent-id').value;
    if (!agentId) {
        showToast('Entrez l\'ID de l\'agent.', 'error');
        return;
    }

    try {
        await apiAssignAgent(currentComplaintId, agentId);
        showToast('Agent assigne avec succes !', 'success');
        closeModal('modal-complaint-detail');
        refreshCurrentSection();
    } catch (error) {
        showToast(error.message || 'Erreur lors de l\'assignation.', 'error');
    }
}

async function deleteComplaint() {
    if (!confirm('Etes-vous sur de vouloir supprimer cette plainte ?')) {
        return;
    }

    try {
        await apiDeleteComplaint(currentComplaintId);
        showToast('Plainte supprimee avec succes !', 'success');
        closeModal('modal-complaint-detail');
        refreshCurrentSection();
    } catch (error) {
        showToast(error.message || 'Erreur lors de la suppression.', 'error');
    }
}

/* ============================================================
   RENDU HTML
   ============================================================ */

function renderComplaintsList(containerId, complaints) {
    const container = document.getElementById(containerId);

    if (!complaints || complaints.length === 0) {
        container.innerHTML = '<div class="empty-state">' +
            '<div class="empty-icon">📋</div>' +
            '<p>Aucune plainte trouvee</p>' +
            '</div>';
        return;
    }

    let html = '';
    complaints.forEach(function (c) {
        html += '<div class="complaint-card status-' + c.status + '" onclick="openComplaintDetail(' + c.id + ')">';
        html += '  <span class="card-id">#' + c.id + '</span>';
        html += '  <div class="card-info">';
        html += '    <div class="card-title">' + escapeHtml(c.title) + '</div>';
        html += '    <div class="card-meta">';
        html += '      Par ' + (c.createdByUsername || 'N/A');
        if (c.assignedToUsername) {
            html += ' &bull; Assigne a ' + c.assignedToUsername;
        }
        html += ' &bull; ' + formatDate(c.createdAt);
        html += '    </div>';
        html += '  </div>';
        html += '  <span class="status-badge status-' + c.status + '">' + getStatusLabel(c.status) + '</span>';
        html += '</div>';
    });

    container.innerHTML = html;
}

function renderHistoryList(containerId, history) {
    const container = document.getElementById(containerId);

    if (!history || history.length === 0) {
        container.innerHTML = '<div class="empty-state">' +
            '<div class="empty-icon">📜</div>' +
            '<p>Aucun historique disponible</p>' +
            '</div>';
        return;
    }

    let html = '';
    history.forEach(function (h) {
        html += '<div class="history-card">';
        html += '  <div class="history-icon">🔄</div>';
        html += '  <div class="history-info">';
        html += '    <div class="history-title">Plainte #' + h.complaintId + (h.complaintTitle ? ' - ' + escapeHtml(h.complaintTitle) : '') + '</div>';
        html += '    <div class="history-detail">';
        html += (h.oldStatusLibelle || 'Creation') + ' &rarr; ' + (h.newStatusLibelle || h.newStatus);
        html += ' par ' + (h.changedByUsername || 'Systeme');
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="history-date">' + formatDate(h.changedAt) + '</div>';
        html += '</div>';
    });

    container.innerHTML = html;
}

/* ============================================================
   MODALS
   ============================================================ */

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Fermer le modal en cliquant en dehors
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

function showToast(message, type) {
    type = type || 'info';
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');

    toastMsg.textContent = message;
    toast.className = 'toast ' + type;

    // Masquer apres 3 secondes
    setTimeout(function () {
        toast.classList.add('hidden');
    }, 3000);
}

/* ============================================================
   UTILITAIRES
   ============================================================ */

function getStatusLabel(status) {
    var labels = {
        'NOUVELLE': 'Nouvelle',
        'EN_COURS': 'En cours',
        'RESOLUE': 'Resolue',
        'REJETEE': 'Rejetee',
        'FERMEE': 'Fermee'
    };
    return labels[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        var day = ('0' + d.getDate()).slice(-2);
        var month = ('0' + (d.getMonth() + 1)).slice(-2);
        var year = d.getFullYear();
        var hours = ('0' + d.getHours()).slice(-2);
        var minutes = ('0' + d.getMinutes()).slice(-2);
        return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes;
    } catch (e) {
        return dateStr;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function refreshCurrentSection() {
    var activeSection = document.querySelector('.section.active');
    if (!activeSection) return;

    var id = activeSection.id;
    if (id === 'section-dashboard') loadDashboard();
    else if (id === 'section-my-complaints') loadMyComplaints();
    else if (id === 'section-all-complaints') loadAllComplaints();
    else if (id === 'section-history') loadHistory();
}
