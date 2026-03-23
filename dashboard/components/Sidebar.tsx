import React from 'react';
import { LayoutDashboard, Users, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeTab: 'dashboard' | 'clientes' | 'distribuicao';
  setActiveTab: (tab: 'dashboard' | 'clientes' | 'distribuicao') => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>Portal</div>
        RAPEL
      </div>
      <nav className="sidebar-nav">
        {[
          { id: 'dashboard', label: 'Dashboard Geral', icon: <LayoutDashboard size={20} /> },
          { id: 'clientes', label: 'Clientes Ativos', icon: <Users size={20} /> },
          { id: 'distribuicao', label: 'Distribuição Técnicos', icon: <UserCheck size={20} /> },
        ].map((item) => (
          <motion.a
            key={item.id}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id as any)}
          >
            {item.icon} {item.label}
          </motion.a>
        ))}
      </nav>
    </aside>
  );
}
