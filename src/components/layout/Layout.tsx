import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import PortalTabs from './PortalTabs';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('glasshouse-theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('glasshouse-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <div className="app-content">
        <TopBar
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode(value => !value)}
          onOpenMenu={() => setSidebarOpen(true)}
        />
        <PortalTabs />
        <main className="app-main">
          <div className="page-enter max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
