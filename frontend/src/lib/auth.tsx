'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';

interface User {
    id: number;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    player: any;
    club: any;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => void;
    setAuth: (data: { user: User; accessToken: string; refreshToken: string; player?: any; club?: any }) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [player, setPlayer] = useState<any>(null);
    const [club, setClub] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('rankeate_auth');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setUser(data.user);
                setToken(data.accessToken);
                setPlayer(data.player);
                setClub(data.club);
            } catch { }
        }
        setLoading(false);
    }, []);

    const setAuth = (data: { user: User; accessToken: string; refreshToken: string; player?: any; club?: any }) => {
        setUser(data.user);
        setToken(data.accessToken);
        setPlayer(data.player || null);
        setClub(data.club || null);
        localStorage.setItem('rankeate_auth', JSON.stringify(data));
    };

    const login = async (email: string, password: string): Promise<User> => {
        const data = await api.login(email, password);
        setAuth(data);
        return data.user;
    };

    const logout = () => {
        if (token) {
            api.logout(token).catch(() => { });
        }
        setUser(null);
        setToken(null);
        setPlayer(null);
        setClub(null);
        localStorage.removeItem('rankeate_auth');
    };

    return (
        <AuthContext.Provider value={{ user, player, club, token, loading, login, logout, setAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
