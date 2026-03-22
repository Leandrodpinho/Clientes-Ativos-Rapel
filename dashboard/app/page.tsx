'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { 
  LayoutDashboard, Users, RefreshCw, FileText, 
  MapPin, DollarSign, TrendingUp, AlertCircle,
  ChevronLeft, ChevronRight, Search, UserCheck, Building2
} from 'lucide-react';

interface ContractData {
  __sheet: string;
  ESTADO: string;
  UNIDADE: string;
  CLIENTE: string;
  NOME_FANTASIA: string;
  CNPJ: string;
  CPF: string;
  CIDADE: string;
  INICIO: string;
  valor_fixo: number;
  limite_func: number;
  valor_por_func_acima: number;
  reajuste_percent: number;
  reajuste_text: string;
  [key: string]: any;
}

const PAGE_SIZE = 12;

export default function DashboardPage() {
  const [data, setData] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [sheetFilter, setSheetFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [unidadeFilter, setUnidadeFilter] = useState('');

  // Table
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Distribution
  const [selectedDistUnit, setSelectedDistUnit] = useState('');
  const [splitRatio, setSplitRatio] = useState(67); // % para sênior

  // Active tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clientes' | 'distribuicao'>('dashboard');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Falha ao buscar dados da API.');
      const json = await res.json();
      setData(json.data || []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/refresh', { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao atualizar dados com o script Python.');
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Filtered Data
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchSheet = sheetFilter ? d.__sheet === sheetFilter : true;
      const matchEstado = estadoFilter ? d.ESTADO === estadoFilter : true;
      const matchUnidade = unidadeFilter ? d.UNIDADE === unidadeFilter : true;
      return matchSheet && matchEstado && matchUnidade;
    });
  }, [data, sheetFilter, estadoFilter, unidadeFilter]);

  // KPIs
  const totalContracts = filteredData.length;
  const totalRevenue = filteredData.reduce((acc, curr) => acc + (curr.valor_fixo || 0), 0);
  const avgRevenue = totalContracts > 0 ? totalRevenue / totalContracts : 0;

  // Helper: resolve label for grouping (GRUPOS/ENTES stay as __sheet, others use UNIDADE)
  // Defined as a stable function to avoid stale closures
  const getGroupLabel = React.useCallback((d: ContractData) => {
    const sheetUpper = (d.__sheet || '').toUpperCase();
    if (sheetUpper.includes('GRUPO') || sheetUpper.includes('ENTE')) {
      return d.__sheet || 'Desconhecida';
    }
    return d.UNIDADE || d.__sheet || 'Desconhecida';
  }, []);

  // Filter Options — custom order: MG (desc by count), BA (desc by count), GRUPOS, ENTES
  const sheetOrder: Record<string, number> = {
    'JANAÚBA': 10, 'MONTES CLAROS': 11, 'JAÍBA': 12, 'S. FRANCISCO': 13,
    'GUANAMBI': 20, 'V. CONQUISTA': 21, 'CAETITÉ': 22,
    'GRUPOS': 30, 'ENTES PÚBLICOS': 40,
  };
  const sheets = useMemo(() => {
    const raw = Array.from(new Set(data.map(d => d.__sheet).filter(Boolean))) as string[];
    // Count per sheet to sort within regions
    const countMap = new Map<string, number>();
    data.forEach(d => { if (d.__sheet) countMap.set(d.__sheet, (countMap.get(d.__sheet) || 0) + 1); });
    return raw.sort((a, b) => {
      const oa = sheetOrder[a] ?? 50;
      const ob = sheetOrder[b] ?? 50;
      const regionA = Math.floor(oa / 10);
      const regionB = Math.floor(ob / 10);
      if (regionA !== regionB) return oa - ob;
      // Within same region, sort by count desc
      return (countMap.get(b) || 0) - (countMap.get(a) || 0);
    });
  }, [data]);
  const estados = Array.from(new Set(data.map(d => d.ESTADO).filter(Boolean))).sort() as string[];
  const unidades = Array.from(new Set(data.map(d => d.UNIDADE).filter(Boolean))).sort() as string[];

  // Revenue by Group Label (GRUPOS/ENTES distinct)
  const revenueByUnit = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => {
      const label = getGroupLabel(d);
      map.set(label, (map.get(label) || 0) + (d.valor_fixo || 0));
    });
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData, getGroupLabel]);

  // State distribution
  const stateDistribution = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => {
      if (!d.ESTADO) return;
      const estado = String(d.ESTADO).toUpperCase().trim();
      map.set(estado, (map.get(estado) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Contracts by Group Label (for table) — inline logic to avoid closure issues
  const contractsByUnit = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => {
      const sheetUpper = (d.__sheet || '').toUpperCase();
      const isSpecial = sheetUpper.includes('GRUPO') || sheetUpper.includes('ENTE');
      const label = isSpecial ? (d.__sheet || 'Desconhecida') : (d.UNIDADE || d.__sheet || 'Desconhecida');
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // Table data with search, sort, pagination
  const tableData = useMemo(() => {
    let result = [...filteredData];
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(d =>
        (d.CLIENTE || '').toLowerCase().includes(t) ||
        (d.NOME_FANTASIA || '').toLowerCase().includes(t) ||
        (d.CNPJ || '').includes(t) ||
        (d.CIDADE || '').toLowerCase().includes(t)
      );
    }
    result.sort((a, b) => sortDir === 'desc' ? (b.valor_fixo || 0) - (a.valor_fixo || 0) : (a.valor_fixo || 0) - (b.valor_fixo || 0));
    return result;
  }, [filteredData, searchTerm, sortDir]);

  const totalPages = Math.ceil(tableData.length / PAGE_SIZE);
  const pagedData = tableData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [sheetFilter, estadoFilter, unidadeFilter, searchTerm]);

  // Distribution data
  const distributionData = useMemo(() => {
    // If no unit is selected, default to the first available sheet (Filial/Aba)
    const unitToUse = selectedDistUnit || (sheets.length > 0 ? sheets[0] : '');
    if (!unitToUse) return { unit: '', senior: [] as ContractData[], junior: [] as ContractData[], seniorTotal: 0, juniorTotal: 0 };
    
    // Filter by __sheet to match exactly what is shown in the Filial/Aba filter
    const unitClients = data
      .filter(d => d.__sheet === unitToUse)
      .sort((a, b) => (b.valor_fixo || 0) - (a.valor_fixo || 0));
    
    const cutoff = Math.ceil(unitClients.length * (splitRatio / 100));
    const senior = unitClients.slice(0, cutoff);
    const junior = unitClients.slice(cutoff);
    
    return {
      unit: unitToUse,
      senior,
      junior,
      seniorTotal: senior.reduce((a, c) => a + (c.valor_fixo || 0), 0),
      juniorTotal: junior.reduce((a, c) => a + (c.valor_fixo || 0), 0),
    };
  }, [data, selectedDistUnit, splitRatio, sheets]);

  const COLORS = ['#c1121f', '#e63946', '#fca311', '#14213d', '#4a4e69', '#9a8c98', '#c9ada7', '#2a9d8f', '#264653', '#e76f51'];

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading && data.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Carregando dados dos contratos...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>RAPEL</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 500, opacity: 0.9, marginTop: '4px' }}>Contratos Ativos</span>
        </div>
        <nav className="sidebar-nav">
          <a className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard Geral
          </a>
          <a className={`nav-item ${activeTab === 'clientes' ? 'active' : ''}`} onClick={() => setActiveTab('clientes')}>
            <Users size={20} /> Clientes Ativos
          </a>
          <a className={`nav-item ${activeTab === 'distribuicao' ? 'active' : ''}`} onClick={() => setActiveTab('distribuicao')}>
            <UserCheck size={20} /> Distribuição Técnicos
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={{ paddingBottom: '6rem' }}>
        <div className="top-header">
          <div>
            <h1 className="page-title">
              {activeTab === 'dashboard' && 'Painel Executivo de Contratos'}
              {activeTab === 'clientes' && 'Clientes Ativos'}
              {activeTab === 'distribuicao' && 'Distribuição de Clientes por Técnico'}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              {activeTab === 'dashboard' && 'Métricas analíticas da operação administrativa e financeira.'}
              {activeTab === 'clientes' && 'Visão completa de todos os contratos ativos com busca e filtros.'}
              {activeTab === 'distribuicao' && 'Distribua clientes entre técnicos sênior e júnior por unidade.'}
            </p>
          </div>
          <div className="header-actions">
            <button className="btn-primary" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={18} style={{animation: refreshing ? 'spin 1s linear infinite' : 'none'}} />
              {refreshing ? 'Atualizando...' : 'Atualizar Excel'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {/* Filters - show on dashboard and clientes tabs */}
        {(activeTab === 'dashboard' || activeTab === 'clientes') && (
          <div className="filters-section">
            <div className="filter-group">
              <label>Filial/Aba</label>
              <select value={sheetFilter} onChange={e => setSheetFilter(e.target.value)}>
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
              <label>Estado</label>
              <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
                <option value="">Todos</option>
                {estados.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>Unidade</label>
              <select value={unidadeFilter} onChange={e => setUnidadeFilter(e.target.value)}>
                <option value="">Todas</option>
                {unidades.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ═══════════════ DASHBOARD TAB ═══════════════ */}
        {activeTab === 'dashboard' && (
          <>
            {/* KPIs */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon"><FileText size={24} /></div>
                <div className="kpi-info">
                  <span className="kpi-title">Total de Contratos</span>
                  <span className="kpi-value">{totalContracts}</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><DollarSign size={24} /></div>
                <div className="kpi-info">
                  <span className="kpi-title">Receita Estimada (Fixo)</span>
                  <span className="kpi-value">{formatCurrency(totalRevenue)}</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><TrendingUp size={24} /></div>
                <div className="kpi-info">
                  <span className="kpi-title">Ticket Médio</span>
                  <span className="kpi-value">{formatCurrency(avgRevenue)}</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><Building2 size={24} /></div>
                <div className="kpi-info">
                  <span className="kpi-title">Unidades Ativas</span>
                  <span className="kpi-value">{unidades.length}</span>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
              <div className="chart-card">
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
                          // Find matching sheet or unit to filter by
                          const targetSheet = sheets.find(s => s.toUpperCase() === unitName.toUpperCase());
                          const targetUnidade = unidades.find(u => u.toUpperCase() === unitName.toUpperCase());
                          
                          if (targetSheet) {
                            setSheetFilter(targetSheet);
                            setUnidadeFilter('');
                          } else if (targetUnidade) {
                            setUnidadeFilter(targetUnidade);
                            setSheetFilter('');
                          } else {
                            // If exactly GRUPOS or ENTES, matching the visual label
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(Number(value))}
                        cursor={{fill: '#f1f5f9'}}
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)'}}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {revenueByUnit.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="chart-card">
                <h3 className="chart-title">Distribuição por Estado</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stateDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        labelLine={false}
                      >
                        {stateDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)'}} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Contracts per Unit Summary */}
            <div className="table-card">
              <h3 className="chart-title" style={{marginBottom: 0}}>Contratos por Unidade</h3>
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
                          <td style={{fontWeight: 600}}>{row.name}</td>
                          <td>{row.count}</td>
                          <td style={{fontWeight: 600, color: 'var(--primary)'}}>{formatCurrency(unitRevenue)}</td>
                          <td>{row.count > 0 ? formatCurrency(unitRevenue / row.count) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════ CLIENTES TAB ═══════════════ */}
        {activeTab === 'clientes' && (
          <div className="table-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <h3 className="chart-title" style={{marginBottom: 0, borderBottom: 'none', paddingBottom: 0}}>
                Detalhamento de Clientes ({tableData.length} registros)
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Buscar cliente, CNPJ, cidade..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                      padding: '0.5rem 0.5rem 0.5rem 2rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      width: '280px',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                </div>
                <button 
                  onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    color: 'var(--text-main)',
                  }}
                >
                  Valor {sortDir === 'desc' ? '↓' : '↑'}
                </button>
              </div>
            </div>
            <div className="table-wrapper" style={{ overflowX: 'auto', overflowY: 'hidden', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <table style={{ minWidth: '1200px' }}>
                <thead style={{ background: 'var(--surface)', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    <th>#</th>
                    <th>Razão Social</th>
                    <th>Nome Fantasia</th>
                    <th>CNPJ</th>
                    <th>Unidade</th>
                    <th>Cidade</th>
                    <th>Estado</th>
                    <th>Valor Fixo</th>
                    <th>Lim. Func.</th>
                    <th>Início</th>
                    <th>Aba</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedData.map((row, i) => (
                    <tr key={i}>
                      <td style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                      <td style={{fontWeight: 500, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{row.CLIENTE || 'N/A'}</td>
                      <td style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{row.NOME_FANTASIA || '-'}</td>
                      <td style={{fontSize: '0.85rem'}}>{row.CNPJ || row.CPF || '-'}</td>
                      <td>{row.UNIDADE || '-'}</td>
                      <td>{row.CIDADE || '-'}</td>
                      <td>{row.ESTADO || '-'}</td>
                      <td style={{fontWeight: 600, color: 'var(--primary)'}}>{formatCurrency(row.valor_fixo || 0)}</td>
                      <td>{row.limite_func ? `Até ${row.limite_func}` : '-'}</td>
                      <td style={{fontSize: '0.85rem'}}>{row.INICIO || '-'}</td>
                      <td>
                        <span style={{background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600}}>
                          {row.__sheet}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {tableData.length === 0 && (
                    <tr>
                      <td colSpan={11} style={{textAlign: 'center', color: 'var(--text-muted)', padding: '2rem'}}>
                        Nenhum cliente encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: currentPage === 1 ? '#e2e8f0' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 600, color: 'var(--text-main)' }}
                >
                  Primeira
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: currentPage === 1 ? '#e2e8f0' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                
                <span style={{ margin: '0 1rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Página <strong style={{color: 'var(--primary)'}}>{currentPage}</strong> de {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: currentPage === totalPages ? '#e2e8f0' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}
                >
                  Próxima <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: currentPage === totalPages ? '#e2e8f0' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 600, color: 'var(--text-main)' }}
                >
                  Última
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ DISTRIBUIÇÃO TAB ═══════════════ */}
        {activeTab === 'distribuicao' && (
          <>
            {/* Distribution Controls */}
            <div className="filters-section">
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
                <label>Proporção Sênior/Júnior: {splitRatio}% / {100 - splitRatio}%</label>
                <input 
                  type="range" 
                  min={30} 
                  max={90} 
                  step={5} 
                  value={splitRatio} 
                  onChange={e => setSplitRatio(Number(e.target.value))}
                  style={{ width: '200px', accentColor: 'var(--primary)' }}
                />
              </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Senior */}
              <div className="chart-card" style={{ borderLeft: '4px solid #2a9d8f' }}>
                <h3 className="chart-title" style={{ color: '#2a9d8f' }}>
                  🏆 Técnico Sênior — {distributionData.senior.length} clientes
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Maiores clientes por valor fixo • Receita: <strong style={{ color: '#2a9d8f' }}>{formatCurrency(distributionData.seniorTotal)}</strong>
                </p>
                <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Cliente</th>
                        <th>Cidade</th>
                        <th>Valor Fixo</th>
                        <th>Lim. Func</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributionData.senior.map((row, i) => (
                        <tr key={i}>
                          <td style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>{i + 1}</td>
                          <td style={{fontWeight: 500, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{row.CLIENTE || row.NOME_FANTASIA || 'N/A'}</td>
                          <td>{row.CIDADE || '-'}</td>
                          <td style={{fontWeight: 600, color: '#2a9d8f'}}>{formatCurrency(row.valor_fixo || 0)}</td>
                          <td>{row.limite_func ? `Até ${row.limite_func}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Junior */}
              <div className="chart-card" style={{ borderLeft: '4px solid #e76f51' }}>
                <h3 className="chart-title" style={{ color: '#e76f51' }}>
                  📋 Técnico Júnior — {distributionData.junior.length} clientes
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Clientes menores • Receita: <strong style={{ color: '#e76f51' }}>{formatCurrency(distributionData.juniorTotal)}</strong>
                </p>
                <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Cliente</th>
                        <th>Cidade</th>
                        <th>Valor Fixo</th>
                        <th>Lim. Func</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributionData.junior.map((row, i) => (
                        <tr key={i}>
                          <td style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>{i + 1}</td>
                          <td style={{fontWeight: 500, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{row.CLIENTE || row.NOME_FANTASIA || 'N/A'}</td>
                          <td>{row.CIDADE || '-'}</td>
                          <td style={{fontWeight: 600, color: '#e76f51'}}>{formatCurrency(row.valor_fixo || 0)}</td>
                          <td>{row.limite_func ? `Até ${row.limite_func}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* All Units Overview */}
            <div className="table-card">
              <h3 className="chart-title" style={{marginBottom: 0}}>Visão Geral — Todas as Unidades</h3>
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
                          <td style={{fontWeight: 600}}>{unit}</td>
                          <td>{unitClients.length}</td>
                          <td style={{color: '#2a9d8f', fontWeight: 600}}>{cutoff}</td>
                          <td style={{color: '#e76f51', fontWeight: 600}}>{unitClients.length - cutoff}</td>
                          <td style={{fontWeight: 600, color: 'var(--primary)'}}>{formatCurrency(unitRevenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
