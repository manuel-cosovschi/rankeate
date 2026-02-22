const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface FetchOptions extends RequestInit {
    token?: string;
}

async function apiFetch(endpoint: string, options: FetchOptions = {}) {
    const { token, ...fetchOptions } = options;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'Error de servidor');
    }

    return data;
}

// ─── Public API ──────────────────────────────────────
export const api = {
    // Rankings
    getRankings: (params: Record<string, string>) =>
        apiFetch(`/rankings?${new URLSearchParams(params)}`),
    getCategories: () => apiFetch('/rankings/categories'),
    getLocalities: () => apiFetch('/rankings/localities'),

    // Players
    searchPlayers: (params: Record<string, string>) =>
        apiFetch(`/players?${new URLSearchParams(params)}`),
    getPlayer: (id: number) => apiFetch(`/players/${id}`),

    // Auth
    login: (email: string, password: string) =>
        apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    registerPlayer: (data: any) =>
        apiFetch('/auth/register-player', { method: 'POST', body: JSON.stringify(data) }),
    registerClub: (data: any) =>
        apiFetch('/auth/register-club', { method: 'POST', body: JSON.stringify(data) }),
    refresh: (refreshToken: string) =>
        apiFetch('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    forgotPassword: (email: string) =>
        apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    getMe: (token: string) =>
        apiFetch('/auth/me', { token }),
    logout: (token: string) =>
        apiFetch('/auth/logout', { method: 'POST', token }),

    // Player authenticated
    updateProfile: (token: string, data: any) =>
        apiFetch('/players/me', { method: 'PUT', token, body: JSON.stringify(data) }),
    getMyHistory: (token: string) =>
        apiFetch('/players/me/history', { token }),
    submitCorrection: (token: string, message: string) =>
        apiFetch('/corrections', { method: 'POST', token, body: JSON.stringify({ message }) }),
    getMyCorrections: (token: string) =>
        apiFetch('/corrections/me', { token }),

    // Club
    getClubDashboard: (token: string) =>
        apiFetch('/clubs/me', { token }),
    getMyTournaments: (token: string) =>
        apiFetch('/clubs/tournaments', { token }),
    createTournament: (token: string, data: any) =>
        apiFetch('/clubs/tournaments', { method: 'POST', token, body: JSON.stringify(data) }),
    getTournament: (token: string, id: number) =>
        apiFetch(`/clubs/tournaments/${id}`, { token }),
    submitResults: (token: string, tournamentId: number, data: any) =>
        apiFetch(`/clubs/tournaments/${tournamentId}/results`, { method: 'POST', token, body: JSON.stringify(data) }),
    confirmResults: (token: string, tournamentId: number, categoryId: number) =>
        apiFetch(`/clubs/tournaments/${tournamentId}/results/confirm`, { method: 'POST', token, body: JSON.stringify({ categoryId }) }),
    searchPlayersClub: (token: string, params: Record<string, string>) =>
        apiFetch(`/clubs/players/search?${new URLSearchParams(params)}`, { token }),

    // Admin
    getPendingClubs: (token: string) =>
        apiFetch('/admin/clubs/pending', { token }),
    approveClub: (token: string, id: number) =>
        apiFetch(`/admin/clubs/${id}/approve`, { method: 'POST', token }),
    rejectClub: (token: string, id: number) =>
        apiFetch(`/admin/clubs/${id}/reject`, { method: 'POST', token }),
    voidPoints: (token: string, id: number, reason: string) =>
        apiFetch(`/admin/point-movements/${id}/void`, { method: 'POST', token, body: JSON.stringify({ reason }) }),
    getReports: (token: string) =>
        apiFetch('/admin/reports', { token }),
    getRecentMovements: (token: string) =>
        apiFetch('/admin/reports', { token }),
    getRecentTournaments: (token: string) =>
        apiFetch('/admin/reports', { token }),
    getCorrections: (token: string) =>
        apiFetch('/admin/corrections', { token }),
    resolveCorrection: (token: string, id: number, data: any) =>
        apiFetch(`/admin/corrections/${id}/resolve`, { method: 'POST', token, body: JSON.stringify(data) }),
};
