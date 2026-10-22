import { createContext, useCallback, useContext, useMemo, useState } from "react";
import apiClient from "../api/client";


const AuthContext = createContext(null);

function decodeToken(token){
    const payloadSegment = token.split('.')[1];
    return JSON.parse(atob(payloadSegment));
 
}

export function AuthProvider ({children}){
    const [token, setToken] = useState(()=> localStorage.getItem('workToken'));

    const user = useMemo(()=> (token ? decodeToken(token): null), [token]);

    const login = async (username, password) => {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await apiClient.post('/auth/token', formData, {
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        });

        localStorage.setItem('workToken', response.data.access_token);
        setToken(response.data.access_token);
    }

    // Self-service sign-up always creates an Employee account, then logs straight in
    const signup = async (name, email, password) => {
        await apiClient.post('/auth/signup', { name, email, password });
        await login(email, password);
    };

    const logout = useCallback(() =>{
        localStorage.removeItem('workToken');
        setToken(null);
    }, []);

    const value = {token, user, isAuthenticated: Boolean(token), login, signup, logout};

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(){
    const context = useContext(AuthContext);
    if (context === null){
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context;
}