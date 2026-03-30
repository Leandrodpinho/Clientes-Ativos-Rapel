import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from 'recharts';
import { Search, X, Building2, MapPin, DollarSign, ExternalLink } from 'lucide-react';
import { ContractData } from '../types';

interface SegmentationTabProps {
  segmentationData: { name: string, value: number }[];
  allData: ContractData[];
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#4ade80', '#fb923c', '#a855f7'
];

export function SegmentationTab({ segmentationData, allData }: SegmentationTabProps) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = useMemo(() => {
    if (!selectedSegment) return [];
    return allData.filter(item => {
      const matchSegment = item.SEGMENTO === selectedSegment;
      const matchSearch = item.CLIENTE.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.CIDADE.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSegment && matchSearch;
    });
  }, [selectedSegment, allData, searchTerm]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="chart-card glass p-6">
          <h3 className="chart-title mb-4">Volume de Clientes por Segmento</h3>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <BarChart
                data={segmentationData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                onClick={(data) => {
                  if (data && data.activeLabel) setSelectedSegment(data.activeLabel);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="value" name="Clientes" radius={[0, 4, 4, 0]} barSize={25} cursor="pointer">
                  {segmentationData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      opacity={selectedSegment === null || selectedSegment === entry.name ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="chart-card glass p-6">
          <h3 className="chart-title mb-4">Distribuição Percentual</h3>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={segmentationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  cursor="pointer"
                  onClick={(data) => {
                    if (data && data.name) setSelectedSegment(data.name);
                  }}
                >
                  {segmentationData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      opacity={selectedSegment === null || selectedSegment === entry.name ? 1 : 0.3}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedSegment ? (
          <motion.div
            key="drill-down"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="glass p-6 border-l-4" style={{ borderColor: COLORS[segmentationData.findIndex(s => s.name === selectedSegment) % COLORS.length] }}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Building2 className="text-primary" />
                    Empresas em: <span className="text-primary">{selectedSegment}</span>
                  </h2>
                  <p className="text-muted-foreground font-medium">Foram encontrados {filteredClients.length} clientes neste segmento.</p>
                </div>
                <button 
                  onClick={() => setSelectedSegment(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
                >
                  <X size={20} /> Fechar Detalhes
                </button>
              </div>

              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar empresa ou cidade..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 focus:border-primary transition-colors outline-none font-medium"
                  />
                </div>
              </div>

              <div className="table-wrapper max-h-[500px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-[#0f172a] z-10 shadow-sm">
                    <tr className="border-b border-white/10">
                      <th className="py-3 px-4 font-bold text-muted-foreground">Cliente</th>
                      <th className="py-3 px-4 font-bold text-muted-foreground">Cidade/UF</th>
                      <th className="py-3 px-4 font-bold text-muted-foreground text-right">Valor Honorário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-4 font-bold text-sm">
                          <div className="flex flex-col">
                            {client.CLIENTE}
                            <span className="text-xs text-muted-foreground font-medium">{client.CNPJ || 'CPF não informado'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm font-medium">
                          <div className="flex items-center gap-1.5 opacity-80">
                            <MapPin size={14} className="text-primary" />
                            {client.CIDADE} / {client.ESTADO}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-primary">
                          {formatCurrency(client.valor_fixo)}
                        </td>
                      </tr>
                    ))}
                    {filteredClients.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-20 text-center text-muted-foreground font-bold">
                          Nenhuma empresa encontrada com os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="summary-table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="table-card glass p-6"
          >
            <h3 className="chart-title mb-4">Detalhamento dos Segmentos</h3>
            <div className="table-wrapper">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-3 text-muted-foreground font-semibold">Segmento</th>
                    <th className="pb-3 text-muted-foreground font-semibold text-center">Contratos</th>
                    <th className="pb-3 text-muted-foreground font-semibold text-right">Representatividade</th>
                    <th className="pb-3 text-muted-foreground font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {segmentationData.map((seg, i) => {
                    const total = segmentationData.reduce((acc, curr) => acc + curr.value, 0);
                    const percent = ((seg.value / total) * 100).toFixed(1);
                    return (
                      <tr 
                        key={i} 
                        className="border-b border-border/50 hover:bg-white/5 transition-colors cursor-pointer group"
                        onClick={() => setSelectedSegment(seg.name)}
                      >
                        <td className="py-4 font-bold flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                          {seg.name}
                        </td>
                        <td className="py-4 text-center font-semibold text-primary">{seg.value}</td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full" 
                                style={{ 
                                  width: `${percent}%`, 
                                  backgroundColor: COLORS[i % COLORS.length] 
                                }}
                              ></div>
                            </div>
                            <span className="font-mono text-sm w-12">{percent}%</span>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <button className="text-xs font-bold uppercase text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto">
                            Ver Empresas <ExternalLink size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
