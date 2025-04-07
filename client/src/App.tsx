import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Sensors from "@/pages/Sensors";
import Analytics from "@/pages/Analytics";
import Alerts from "@/pages/Alerts";
import Settings from "@/pages/Settings";
import Register from "@/pages/Register";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { useState, useEffect } from "react";
import { WebSocketProvider } from "@/contexts/WebSocketContext";

function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex flex-col h-screen bg-[#FFFAF7]">
      <Header onMenuToggle={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      {isMobile && <MobileNav />}
    </div>
  );
}

function Router() {
  // Determina si la ruta es /register para no mostrar el AppLayout en la página de registro
  const [location] = useLocation();
  
  // Si estamos en la página de registro, no usamos el AppLayout
  if (location === "/register") {
    return (
      <Switch>
        <Route path="/register" component={Register} />
      </Switch>
    );
  }

  // Para las demás rutas, usamos el AppLayout normal
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/sensors" component={Sensors} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <Router />
        <Toaster />
      </WebSocketProvider>
    </QueryClientProvider>
  );
}

export default App;
