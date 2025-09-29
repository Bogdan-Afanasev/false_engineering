import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface User {
    id: string;
    username: string;
    fullName: string;
    email?: string;
    role: 'manager' | 'employee';
    isAuthenticated: boolean;
}

interface AuthContextType {
    user: User | null;
    login: (username: string) => Promise<void>;
    register: (fullName: string, email: string) => Promise<void>;
    logout: () => void;
    updateRole: (role: 'manager' | 'employee') => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('fe-user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (username: string) => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
            });

            if (!response.ok) {
                throw new Error('User not found');
            }

            const userData = await response.json();

            const user = {
                id: userData.id.toString(),
                username: userData.username,
                fullName: `${userData.first_name} ${userData.last_name}`,
                email: userData.email,
                role: userData.is_manager ? 'manager' : 'employee',
                isAuthenticated: true
            };

            setUser(user);
            localStorage.setItem('fe-user', JSON.stringify(user));
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (fullName: string, email: string) => {
        setIsLoading(true);
        try {
            const users = JSON.parse(localStorage.getItem('fe-users') || '[]');
            const newUser = {
                id: Date.now().toString(),
                fullName,
                email,
                role: 'employee' as const,
                isAuthenticated: false
            };

            users.push(newUser);
            localStorage.setItem('fe-users', JSON.stringify(users));
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('fe-user');
    };

    const updateRole = (role: 'manager' | 'employee') => {
        if (user) {
            const updatedUser = { ...user, role };
            setUser(updatedUser);
            localStorage.setItem('fe-user', JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            register,
            logout,
            updateRole,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}