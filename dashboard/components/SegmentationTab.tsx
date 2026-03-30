import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from 'recharts';

interface SegmentationTabProps {
  segmentationData: { name: string, value: number }[];
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#4ade80', '#fb923c', '#a855f7'
];

export function SegmentationTab({ segmentationData }: SegmentationTabProps) {
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
                <Bar dataKey="value" name="Clientes" radius={[0, 4, 4, 0]} barSize={25}>
                  {segmentationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                >
                  {segmentationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

      {/* Summary Table */}
      <div className="table-card glass p-6">
        <h3 className="chart-title mb-4">Detalhamento dos Segmentos</h3>
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="pb-3 text-muted-foreground font-semibold">Segmento</th>
                <th className="pb-3 text-muted-foreground font-semibold text-center">Contratos</th>
                <th className="pb-3 text-muted-foreground font-semibold text-right">Representatividade</th>
              </tr>
            </thead>
            <tbody>
              {segmentationData.map((seg, i) => {
                const total = segmentationData.reduce((acc, curr) => acc + curr.value, 0);
                const percent = ((seg.value / total) * 100).toFixed(1);
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-white/5 transition-colors">
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
