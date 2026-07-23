import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthScreen from "../features/auth/AuthScreen";
import { getToken, logout as apiLogout, me, setToken } from "../features/auth/api";
import type { User } from "../entities/user";
import AppShell from "../widgets/app-shell/AppShell";
import { ToastViewport } from "../shared/ui/Toast";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  // 앱 시작 시 저장된 토큰으로 세션 확인
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setBooting(false);
      return;
    }
    me(token)
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setBooting(false));
  }, []);

  async function handleLogout() {
    const token = getToken();
    if (token) await apiLogout(token);
    setUser(null);
  }

  if (booting) {
    return (
      <div className="h-screen flex items-center justify-center text-[15px] text-text-secondary">
        불러오는 중…
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSuccess={setUser} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell user={user} onUserUpdate={setUser} onLogout={handleLogout} />
      <ToastViewport />
    </QueryClientProvider>
  );
}

export default App;
