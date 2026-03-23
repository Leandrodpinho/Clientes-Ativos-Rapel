'use client';

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useDashboardData } from '../hooks/useDashboardData';
import { Sidebar } from '../components/Sidebar';
import { KpiCards } from '../components/KpiCards';
import { ChartsGroup } from '../components/ChartsGroup';
import { ClientsTable } from '../components/ClientsTable';
import { DistributionTab } from '../components/DistributionTab';
import { ExcelUpload } from '../components/ExcelUpload';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clientes' | 'distribuicao'>('dashboard');

  const {
    data, loading, refreshing, error, handleRefresh, importExcelData,
    sheetFilter, setSheetFilter, estadoFilter, setEstadoFilter, unidadeFilter, setUnidadeFilter,
    searchTerm, setSearchTerm, currentPage, setCurrentPage, sortDir, setSortDir,
    selectedDistUnit, setSelectedDistUnit, splitRatio, setSplitRatio,
    sheets, estados, unidades,
    totalContracts, totalRevenue, avgRevenue,
    revenueByUnit, stateDistribution, contractsByUnit,
    tableData, pagedData, totalPages,
    distributionData
  } = useDashboardData();

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading && data.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Carregando dados premium...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content" style={{ paddingBottom: '6rem' }}>
        <div className="top-header">
          <div>
            <h1 className="page-title">
              {activeTab === 'dashboard' && 'Painel Executivo'}
              {activeTab === 'clientes' && 'Gestão de Clientes'}
              {activeTab === 'distribuicao' && 'Distribuição de Carteira'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
              {activeTab === 'dashboard' && 'Métricas analíticas da operação e saúde financeira.'}
              {activeTab === 'clientes' && 'Visão detalhada de todos os contratos ativos na rede.'}
              {activeTab === 'distribuicao' && 'Otimização de produtividade entre técnicos sênior e júnior.'}
            </p>
          </div>
          <div className="header-actions">
            <ExcelUpload onUpload={importExcelData} refreshing={refreshing} />
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass" 
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--primary)', padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--primary-glow)' }}
          >
            <AlertCircle size={20} /> <span style={{fontWeight: 700}}>{error}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            {activeTab === 'dashboard' && (
              <>
                <div className="filters-section glass" style={{ padding: '1.5rem 2rem' }}>
                  <div className="filter-group">
                    <label>Unidade Operacional</label>
                    <select value={unidadeFilter} onChange={e => { setUnidadeFilter(e.target.value); setSheetFilter(''); }}>
                      <option value="">Todas as Unidades</option>
                      {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Filial / Aba</label>
                    <select value={sheetFilter} onChange={e => { setSheetFilter(e.target.value); setUnidadeFilter(''); }}>
                      <option value="">Todas as Filiais</option>
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
                    <label>Estado (Brasil)</label>
                    <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
                      <option value="">Todos os Estados</option>
                      {estados.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  {(unidadeFilter || sheetFilter || estadoFilter) && (
                    <button 
                      onClick={() => { setUnidadeFilter(''); setSheetFilter(''); setEstadoFilter(''); }}
                      style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>

                <KpiCards 
                  totalContracts={totalContracts} 
                  totalRevenue={totalRevenue} 
                  avgRevenue={avgRevenue} 
                  unidadesCount={unidades.length} 
                />

                <ChartsGroup 
                  revenueByUnit={revenueByUnit} 
                  stateDistribution={stateDistribution}
                  sheets={sheets}
                  unidades={unidades}
                  setSheetFilter={setSheetFilter}
                  setUnidadeFilter={setUnidadeFilter}
                  setEstadoFilter={setEstadoFilter}
                  setSearchTerm={setSearchTerm}
                  setActiveTab={setActiveTab}
                />

                <div className="table-card glass">
                  <h3 className="chart-title" style={{marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem'}}>
                    Resumo Consolidado por Unidade
                  </h3>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Unidade</th>
                          <th>Qtd. Contratos</th>
                          <th>Receita Total</th>
                          <th>Ticket Médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contractsByUnit.map((row, i) => {
                          const unitRevenue = revenueByUnit.find(r => r.name === row.name)?.value || 0;
                          return (
                            <tr key={i}>
                              <td style={{fontWeight: 700}}>{row.name}</td>
                              <td><span style={{fontWeight: 600}}>{row.count}</span></td>
                              <td style={{fontWeight: 800, color: 'var(--primary)'}}>{formatCurrency(unitRevenue)}</td>
                              <td><span style={{color: 'var(--text-muted)'}}>{row.count > 0 ? formatCurrency(unitRevenue / row.count) : '-'}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'clientes' && (
              <ClientsTable 
                tableData={tableData}
                pagedData={pagedData}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                sortDir={sortDir}
                setSortDir={setSortDir}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
              />
            )}

            {activeTab === 'distribuicao' && (
              <DistributionTab 
                distributionData={distributionData}
                sheets={sheets}
                unidades={unidades}
                selectedDistUnit={selectedDistUnit}
                setSelectedDistUnit={setSelectedDistUnit}
                splitRatio={splitRatio}
                setSplitRatio={setSplitRatio}
                data={data}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {refreshing && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', bottom: '2.5rem', right: '2.5rem',
            background: 'var(--surface-solid)', padding: '1rem 2rem',
            borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
            border: '1px solid var(--primary)', display: 'flex',
            alignItems: 'center', gap: '1rem', zIndex: 1000,
            backdropFilter: 'blur(8px)'
          }}
        >
          <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></div>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>Processando Planilha...</span>
        </motion.div>
      )}
    </div>
  );
}
