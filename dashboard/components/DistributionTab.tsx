import React from 'react';
import { motion } from 'framer-motion';
import { ContractData } from '../types';

interface DistributionTabProps {
  distributionData: {
    unit: string;
    senior: ContractData[];
    junior: ContractData[];
    seniorTotal: number;
    juniorTotal: number;
  };
  sheets: string[];
  unidades: string[];
  selectedDistUnit: string;
  setSelectedDistUnit: (val: string) => void;
  splitRatio: number;
  setSplitRatio: (val: number) => void;
  data: ContractData[];
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function DistributionTab({
  distributionData,
  sheets,
  unidades,
  selectedDistUnit,
  setSelectedDistUnit,
  splitRatio,
  setSplitRatio,
  data
}: DistributionTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      <div className="filters-section glass">
        <div className="filter-group">
          <label>Selecionar Filial/Aba</label>
          <select value={selectedDistUnit || ''} onChange={e => setSelectedDistUnit(e.target.value)}>
            {(!selectedDistUnit) && <option value="">Selecione uma Filial/Aba</option>}
            <optgroup label="Minas Gerais">
              {sheets.filter(s => ['JANAÚBA','MONTES CLAROS','JAÍBA','S. FRANCISCO'].includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
            </optgroup>
            <optgroup label="Bahia">
              {sheets.filter(s => ['GUANAMBI','V. CONQUISTA','CAETITÉ'].includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
            </optgroup>
            <optgroup label="Especiais">
              {sheets.filter(s => ['GRUPOS','ENTES PÚBLICOS'].includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
            </optgroup>
          </select>
        </div>
        <div className="filter-group">
          <label>Proporção Sênior/Júnior: <span style={{color: 'var(--primary)', fontWeight: 800}}>{splitRatio}% / {100 - splitRatio}%</span></label>
          <input 
            type="range" 
            min={30} 
            max={90} 
            step={5} 
            value={splitRatio} 
            onChange={e => setSplitRatio(Number(e.target.value))}
            style={{ width: '250px', accentColor: 'var(--primary)', height: '8px', cursor: 'pointer' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
        {/* Senior */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="chart-card glass" 
          style={{ borderLeft: '6px solid #10b981' }}
        >
          <h3 className="chart-title" style={{ color: '#059669', display: 'flex', justifyContent: 'space-between' }}>
            🏆 Técnico Sênior <span>{distributionData.senior.length} clientes</span>
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Carteira Principal • Receita: <strong style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>{formatCurrency(distributionData.seniorTotal)}</strong>
          </p>
          <div className="table-wrapper" style={{ maxHeight: '450px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Cidade</th>
                  <th>Valor Fixo</th>
                </tr>
              </thead>
              <tbody>
                {distributionData.senior.map((row, i) => (
                  <tr key={i}>
                    <td style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>{i + 1}</td>
                    <td style={{fontWeight: 700}}>{row.CLIENTE || row.NOME_FANTASIA || 'N/A'}</td>
                    <td style={{fontSize: '0.85rem'}}>{row.CIDADE || '-'}</td>
                    <td style={{fontWeight: 800, color: '#059669'}}>{formatCurrency(row.valor_fixo || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Junior */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="chart-card glass" 
          style={{ borderLeft: '6px solid #f97316' }}
        >
          <h3 className="chart-title" style={{ color: '#ea580c', display: 'flex', justifyContent: 'space-between' }}>
            📋 Técnico Júnior <span>{distributionData.junior.length} clientes</span>
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Carteira Secundária • Receita: <strong style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>{formatCurrency(distributionData.juniorTotal)}</strong>
          </p>
          <div className="table-wrapper" style={{ maxHeight: '450px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Cidade</th>
                  <th>Valor Fixo</th>
                </tr>
              </thead>
              <tbody>
                {distributionData.junior.map((row, i) => (
                  <tr key={i}>
                    <td style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>{i + 1}</td>
                    <td style={{fontWeight: 700}}>{row.CLIENTE || row.NOME_FANTASIA || 'N/A'}</td>
                    <td style={{fontSize: '0.85rem'}}>{row.CIDADE || '-'}</td>
                    <td style={{fontWeight: 800, color: '#ea580c'}}>{formatCurrency(row.valor_fixo || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="table-card glass" 
        style={{ marginTop: '1rem' }}
      >
        <h3 className="chart-title">Visão Geral — Todas as Unidades</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Unidade</th>
                <th>Total Clientes</th>
                <th>Sênior ({splitRatio}%)</th>
                <th>Júnior ({100 - splitRatio}%)</th>
                <th>Receita Total</th>
              </tr>
            </thead>
            <tbody>
              {unidades.map((unit, i) => {
                const unitClients = data.filter(d => d.UNIDADE === unit);
                const cutoff = Math.ceil(unitClients.length * (splitRatio / 100));
                const unitRevenue = unitClients.reduce((a, c) => a + (c.valor_fixo || 0), 0);
                return (
                  <tr key={i} style={{cursor: 'pointer'}} onClick={() => { setSelectedDistUnit(unit); window.scrollTo({top: 0, behavior: 'smooth'}); }}>
                    <td style={{fontWeight: 700}}>{unit}</td>
                    <td><span style={{fontWeight: 600}}>{unitClients.length}</span></td>
                    <td style={{color: '#059669', fontWeight: 800}}>{cutoff}</td>
                    <td style={{color: '#ea580c', fontWeight: 800}}>{unitClients.length - cutoff}</td>
                    <td style={{fontWeight: 900, color: 'var(--primary)'}}>{formatCurrency(unitRevenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
