/**
 * ============================================================================
 * DCMS Frontend - Module API
 * ============================================================================
 * Gere toutes les communications HTTP avec le backend JAX-RS.
 * Utilise fetch() pour les requetes REST et gere le token JWT.
 * ============================================================================
 */

const API_BASE = window.location.origin + window.location.pathname.replace(/\/+$/, '') + '/api';

/**
 * Stockage du token JWT et des infos utilisateur dans sessionStorage.
 */
const Auth = {
    setToken(data) {
        sessionStorage.setItem('dcms_token', data.token);
        sessionStorage.setItem('dcms_userId', data.userId);
        sessionStorage.setItem('dcms_username', data.username);
        sessionStorage.setItem('dcms_role', data.role);
    },
    getToken() {
        return sessionStorage.getItem('dcms_token');
    },
    getUserId() {
        return sessionStorage.getItem('dcms_userId');
    },
    getUsername() {
        return sessionStorage.getItem('dcms_username');
    },
    getRole() {
        return sessionStorage.getItem('dcms_role');
    },
    isLoggedIn() {
        return !!sessionStorage.getItem('dcms_token');
    },
    clear() {
        sessionStorage.removeItem('dcms_token');
        sessionStorage.removeItem('dcms_userId');
        sessionStorage.removeItem('dcms_username');
        sessionStorage.removeItem('dcms_role');
    }
};

/**
 * Effectue une requete HTTP vers l'API backend.
 * Ajoute automatiquement le token JWT si disponible.
 *
 * @param {string} endpoint - Chemin relatif (ex: '/auth/login')
 * @param {object} options - Options fetch (method, body, etc.)
 * @returns {Promise<object>} Reponse JSON parsee
 */
async function apiRequest(endpoint, options = {}) {
    const url = API_BASE + endpoint;

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    if (Auth.getToken()) {
        headers['Authorization'] = 'Bearer ' + Auth.getToken();
    }

    const config = {
        headers: headers,
        ...options
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw {
                status: response.status,
                message: data.message || 'Erreur serveur',
                data: data
            };
        }

        return data;
    } catch (error) {
        if (error.status) {
            throw error;
        }
        throw {
            status: 0,
            message: 'Impossible de contacter le serveur. Verifiez que Tomcat est demarre.',
            data: null
        };
    }
}

/* ============================================================
   API : Authentification
   ============================================================ */

async function apiLogin(username, password) {
    const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { username, password }
    });
    if (data.success && data.data) {
        Auth.setToken(data.data);
    }
    return data;
}

async function apiRegister(username, email, password, role) {
    const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: { username, email, password, role }
    });
    if (data.success && data.data) {
        Auth.setToken(data.data);
    }
    return data;
}

/* ============================================================
   API : Plaintes
   ============================================================ */

async function apiGetAllComplaints(page, size) {
    let endpoint = '/complaints';
    if (page !== undefined && size !== undefined) {
        endpoint += '?page=' + page + '&size=' + size;
    }
    return apiRequest(endpoint, { method: 'GET' });
}

async function apiGetMyComplaints() {
    return apiRequest('/complaints/my', { method: 'GET' });
}

async function apiGetComplaintById(id) {
    return apiRequest('/complaints/' + id, { method: 'GET' });
}

async function apiGetComplaintsByStatus(status) {
    return apiRequest('/complaints/status/' + status, { method: 'GET' });
}

async function apiCreateComplaint(title, description) {
    return apiRequest('/complaints', {
        method: 'POST',
        body: { title, description }
    });
}

async function apiUpdateStatus(complaintId, newStatus) {
    return apiRequest('/complaints/' + complaintId + '/status?newStatus=' + newStatus, {
        method: 'PUT'
    });
}

async function apiAssignAgent(complaintId, agentId) {
    return apiRequest('/complaints/' + complaintId + '/assign/' + agentId, {
        method: 'PUT'
    });
}

async function apiDeleteComplaint(complaintId) {
    return apiRequest('/complaints/' + complaintId, {
        method: 'DELETE'
    });
}

/* ============================================================
   API : Historique
   ============================================================ */

async function apiGetAllHistory() {
    return apiRequest('/history', { method: 'GET' });
}

async function apiGetHistoryByComplaint(complaintId) {
    return apiRequest('/history/complaint/' + complaintId, { method: 'GET' });
}
