import React from 'react';
import { FileText, DollarSign, TrendingUp, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface KpiCardsProps {
  totalContracts: number;
  totalRevenue: number;
  avgRevenue: number;
  unidadesCount: number;
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export function KpiCards({ totalContracts, totalRevenue, avgRevenue, unidadesCount }: KpiCardsProps) {
  const cards = [
    { title: 'Total de Contratos', value: totalContracts, icon: <FileText size={24} /> },
    { title: 'Receita Estimada (Fixo)', value: formatCurrency(totalRevenue), icon: <DollarSign size={24} /> },
    { title: 'Ticket Médio', value: formatCurrency(avgRevenue), icon: <TrendingUp size={24} /> },
    { title: 'Unidades Ativas', value: unidadesCount, icon: <Building2 size={24} /> },
  ];

  return (
    <motion.div 
      className="kpi-grid"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {cards.map((card, idx) => (
        <motion.div 
          key={idx} 
          variants={item}
          className="kpi-card glass"
        >
          <div className="kpi-icon">{card.icon}</div>
          <div className="kpi-info">
            <span className="kpi-title">{card.title}</span>
            <span className="kpi-value">{card.value}</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
