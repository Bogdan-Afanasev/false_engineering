import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const { user, login, isLoading } = useAuth();
    const { toast } = useToast();

    if (user?.isAuthenticated) {
        return <Navigate to="/search" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;

        try {
            await login(username.trim());
            toast({
                title: "Вход выполнен",
                description: "Добро пожаловать в False Engineering"
            });
        } catch (error) {
            toast({
                title: "Ошибка входа",
                description: "Пользователь не найден. Пожалуйста, зарегистрируйтесь.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Logo */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-lg font-bold text-primary-foreground">FE</span>
                        </div>
                        <div className="text-left">
                            <div className="font-semibold text-foreground">False</div>
                            <div className="font-semibold text-foreground">Engineering</div>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Умный поиск
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Войдите для доступа к системе
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Вход в систему</CardTitle>
                        <CardDescription>
                            Введите ваши учетные данные для входа
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Имя пользователя</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Введите ваше имя пользователя"
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="space-y-4">
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Вход...' : 'Войти'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <div className="text-center text-sm">
                    <span className="text-muted-foreground">Нет аккаунта? </span>
                    <Link to="/auth/register" className="text-primary hover:underline">
                        Зарегистрироваться
                    </Link>
                </div>
            </div>
        </div>
    );
}