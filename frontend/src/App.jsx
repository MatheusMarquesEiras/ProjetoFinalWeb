import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import api from './api';

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(null); // null enquanto carregando

    useEffect(() => {
        const checkAuth = async () => {
            try {
                await api.get('/check-session');
                setIsAuthenticated(true);
            } catch {
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        return <div>Carregando...</div>; // Estado de carregamento inicial
    }

    return (
        <Router>
            <Routes>
                {/* Rota raiz */}
                <Route
                    path="/"
                    element={
                        isAuthenticated ? (
                            <Dashboard setIsAuthenticated={setIsAuthenticated} />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                {/* Rota de login */}
                <Route
                    path="/login"
                    element={
                        isAuthenticated ? (
                            <Navigate to="/" replace />
                        ) : (
                            <Login setIsAuthenticated={setIsAuthenticated} />
                        )
                    }
                />
            </Routes>
        </Router>
    );
};

export default App;
