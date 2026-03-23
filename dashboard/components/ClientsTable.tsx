import { Search, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContractData } from '../types';
import * as XLSX from 'xlsx';
import { useState } from 'react';

interface ClientsTableProps {
  tableData: ContractData[];
  pagedData: ContractData[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  sortDir: 'asc' | 'desc';
  setSortDir: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
}

const PAGE_SIZE = 12;

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function ClientsTable({
  tableData,
  pagedData,
  searchTerm,
  setSearchTerm,
  sortDir,
  setSortDir,
  currentPage,
  setCurrentPage,
  totalPages
}: ClientsTableProps) {
  const [selectedClient, setSelectedClient] = useState<ContractData | null>(null);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes_Filtrados");
    XLSX.writeFile(workbook, `contratos_ativos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="table-card glass"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h3 className="chart-title" style={{marginBottom: 0, borderBottom: 'none', paddingBottom: 0}}>
          Detalhamento de Clientes ({tableData.length})
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={exportToExcel}
            style={{
              padding: '0.75rem 1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              background: '#0ea5e9',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              fontFamily: 'inherit',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Download size={16} /> Exportar
          </button>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar cliente, CNPJ, cidade..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                fontSize: '0.9rem',
                width: '300px',
                background: 'var(--surface-solid)',
                color: 'var(--text-main)',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
          </div>
          <button 
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            style={{
              padding: '0.75rem 1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              background: 'var(--surface-solid)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              fontFamily: 'inherit',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            Valor {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>
      <div className="table-wrapper" style={{ overflowX: 'auto', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <table style={{ minWidth: '1200px' }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Razão Social</th>
              <th>Nome Fantasia</th>
              <th>CNPJ/CPF</th>
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
              <tr 
                key={i} 
                onClick={() => setSelectedClient(row)}
                style={{ cursor: 'pointer', transition: 'background 0.2s' }}
              >
                <td style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                <td style={{fontWeight: 700, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{row.CLIENTE || 'N/A'}</td>
                <td style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)'}}>{row.NOME_FANTASIA || '-'}</td>
                <td style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{row.CNPJ || row.CPF || '-'}</td>
                <td><span style={{fontWeight: 600}}>{row.UNIDADE || '-'}</span></td>
                <td>{row.CIDADE || '-'}</td>
                <td><span style={{padding: '4px 8px', borderRadius: '6px', background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.75rem'}}>{row.ESTADO || '-'}</span></td>
                <td style={{fontWeight: 800, color: 'var(--primary)', fontSize: '1rem'}}>{formatCurrency(row.valor_fixo || 0)}</td>
                <td style={{color: 'var(--text-muted)'}}>{row.limite_func ? `Até ${row.limite_func}` : '-'}</td>
                <td style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{row.INICIO || '-'}</td>
                <td>
                  <span style={{background: 'rgba(0,0,0,0.05)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase'}}>
                    {row.__sheet}
                  </span>
                </td>
              </tr>
            ))}
            {tableData.length === 0 && (
              <tr>
                <td colSpan={11} style={{textAlign: 'center', color: 'var(--text-muted)', padding: '4rem', fontWeight: 600}}>
                  Nenhum cliente encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Client Detail Modal */}
      <AnimatePresence>
        {selectedClient && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClient(null)}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass"
              style={{ 
                position: 'relative', width: '100%', maxWidth: '600px', background: 'var(--surface-solid)', 
                borderRadius: '24px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                border: '1px solid var(--border-color)', overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{selectedClient.CLIENTE}</h2>
                  <p style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '0.25rem' }}>ID do Contrato: #{Math.floor(Math.random() * 9000) + 1000}</p>
                </div>
                <button 
                  onClick={() => setSelectedClient(null)}
                  style={{ background: 'var(--bg-color)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="filter-group">
                  <label>CNPJ/CPF</label>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedClient.CNPJ || selectedClient.CPF || '-'}</p>
                </div>
                <div className="filter-group">
                  <label>Cidade / UF</label>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedClient.CIDADE} - {selectedClient.ESTADO}</p>
                </div>
                <div className="filter-group">
                  <label>Valor Mensal (Fixo)</label>
                  <p style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--primary)' }}>{formatCurrency(selectedClient.valor_fixo || 0)}</p>
                </div>
                <div className="filter-group">
                  <label>Início do Contrato</label>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedClient.INICIO || '-'}</p>
                </div>
                <div className="filter-group">
                  <label>Limite de Funcionários</label>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedClient.limite_func || 'Não informado'}</p>
                </div>
                <div className="filter-group">
                  <label>Unidade Responsável</label>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedClient.UNIDADE}</p>
                </div>
              </div>

              <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  <ExternalLink size={18} /> Ver Documentação
                </button>
                <button 
                  onClick={() => setSelectedClient(null)}
                  style={{ 
                    padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', 
                    background: 'none', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer' 
                  }}
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '2rem', padding: '1rem' }}>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-solid)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}
          >
            Primeira
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-solid)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          
          <span style={{ margin: '0 1.5rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Página <strong style={{color: 'var(--primary)', fontSize: '1.1rem'}}>{currentPage}</strong> de {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-solid)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}
          >
            Próxima <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-solid)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}
          >
            Última
          </button>
        </div>
      )}
    </motion.div>
  );
}
