import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface User {
  id: string;
  fullName: string;
  email?: string;
  role: 'manager' | 'employee';
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (fullName: string) => Promise<void>;
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
    // Check for existing session
    const savedUser = localStorage.getItem('fe-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (fullName: string) => {
    setIsLoading(true);
    try {
      // Check if user exists (mock check)
      const users = JSON.parse(localStorage.getItem('fe-users') || '[]');
      const existingUser = users.find((u: any) => u.fullName === fullName);
      
      if (existingUser) {
        const userData = {
          ...existingUser,
          isAuthenticated: true
        };
        setUser(userData);
        localStorage.setItem('fe-user', JSON.stringify(userData));
      } else {
        throw new Error('User not found');
      }
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