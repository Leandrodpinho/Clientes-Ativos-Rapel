import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { motion } from 'framer-motion';

interface ChartsGroupProps {
  revenueByUnit: { name: string, value: number }[];
  stateDistribution: { name: string, value: number }[];
  sheets: string[];
  unidades: string[];
  setSheetFilter: (val: string) => void;
  setUnidadeFilter: (val: string) => void;
  setEstadoFilter: (val: string) => void;
  setSearchTerm: (val: string) => void;
  setActiveTab: (tab: 'dashboard' | 'clientes' | 'distribuicao') => void;
}

const COLORS = ['#c1121f', '#e63946', '#fca311', '#14213d', '#4a4e69', '#9a8c98', '#c9ada7', '#2a9d8f', '#264653', '#e76f51'];

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function ChartsGroup({
  revenueByUnit,
  stateDistribution,
  sheets,
  unidades,
  setSheetFilter,
  setUnidadeFilter,
  setEstadoFilter,
  setSearchTerm,
  setActiveTab
}: ChartsGroupProps) {
  return (
    <div className="charts-grid">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="chart-card glass"
      >
        <h3 className="chart-title">Receita por Unidade</h3>
        <div className="chart-container" style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={revenueByUnit} 
              margin={{top: 20, right: 30, left: 20, bottom: 60}}
              style={{ cursor: 'pointer' }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const unitName = e.activePayload[0].payload.name;
                  const targetSheet = sheets.find(s => s.toUpperCase() === unitName.toUpperCase());
                  const targetUnidade = unidades.find(u => u.toUpperCase() === unitName.toUpperCase());
                  
                  if (targetSheet) {
                    setSheetFilter(targetSheet);
                    setUnidadeFilter('');
                  } else if (targetUnidade) {
                    setUnidadeFilter(targetUnidade);
                    setSheetFilter('');
                  } else {
                    if (unitName.includes('GRUPO')) setSheetFilter('GRUPOS');
                    if (unitName.includes('ENTE')) setSheetFilter('ENTES PÚBLICOS');
                  }
                  
                  setEstadoFilter('');
                  setSearchTerm('');
                  setActiveTab('clientes');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600}} />
              <Tooltip 
                formatter={(value: any) => formatCurrency(Number(value))}
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  padding: '10px 14px'
                }}
                itemStyle={{ color: 'var(--primary)', fontWeight: 700 }}
                labelStyle={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {revenueByUnit.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="chart-card glass"
      >
        <h3 className="chart-title">Distribuição por Estado</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stateDistribution}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                labelLine={false}
              >
                {stateDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)', 
                  background: '#ffffff', 
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  padding: '10px 14px'
                }} 
                itemStyle={{ color: 'var(--text-main)', fontWeight: 700 }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
