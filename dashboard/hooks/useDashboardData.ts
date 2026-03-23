import { useState, useEffect, useMemo, useCallback } from 'react';
import { ContractData } from '../types';
import { parseExcelFile } from '../utils/excelParser';

interface UseDashboardDataReturn {
  data: ContractData[];
  loading: boolean;
  refreshing: boolean;
  error: string;
  handleRefresh: () => Promise<void>;
  importExcelData: (file: File) => Promise<void>;
  // Filters
  sheetFilter: string;
  setSheetFilter: (val: string) => void;
  estadoFilter: string;
  setEstadoFilter: (val: string) => void;
  unidadeFilter: string;
  setUnidadeFilter: (val: string) => void;
  
  // Table
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  sortDir: 'asc' | 'desc';
  setSortDir: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  
  // Split ratio
  selectedDistUnit: string;
  setSelectedDistUnit: (val: string) => void;
  splitRatio: number;
  setSplitRatio: (val: number) => void;
  
  // Data Views
  filteredData: ContractData[];
  sheets: string[];
  estados: string[];
  unidades: string[];
  
  // KPIs
  totalContracts: number;
  totalRevenue: number;
  avgRevenue: number;
  
  revenueByUnit: { name: string, value: number }[];
  stateDistribution: { name: string, value: number }[];
  contractsByUnit: { name: string, count: number }[];
  
  tableData: ContractData[];
  pagedData: ContractData[];
  totalPages: number;
  
  distributionData: {
    unit: string;
    senior: ContractData[];
    junior: ContractData[];
    seniorTotal: number;
    juniorTotal: number;
  };
}

const PAGE_SIZE = 12;

export function useDashboardData(): UseDashboardDataReturn {
  const [data, setData] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [sheetFilter, setSheetFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [unidadeFilter, setUnidadeFilter] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [selectedDistUnit, setSelectedDistUnit] = useState('');
  const [splitRatio, setSplitRatio] = useState(67);

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

  const importExcelData = async (file: File) => {
    try {
      setRefreshing(true);
      const processedData = await parseExcelFile(file);
      setData(processedData);
      alert(`${processedData.length} registros processados com sucesso!`);
    } catch (err: any) {
      setError(`Erro ao processar arquivo: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchSheet = sheetFilter ? d.__sheet === sheetFilter : true;
      const matchEstado = estadoFilter ? d.ESTADO === estadoFilter : true;
      const matchUnidade = unidadeFilter ? d.UNIDADE === unidadeFilter : true;
      return matchSheet && matchEstado && matchUnidade;
    });
  }, [data, sheetFilter, estadoFilter, unidadeFilter]);

  const totalContracts = filteredData.length;
  const totalRevenue = filteredData.reduce((acc, curr) => acc + (curr.valor_fixo || 0), 0);
  const avgRevenue = totalContracts > 0 ? totalRevenue / totalContracts : 0;

  const getGroupLabel = useCallback((d: ContractData) => {
    const sheetUpper = (d.__sheet || '').toUpperCase();
    if (sheetUpper.includes('GRUPO') || sheetUpper.includes('ENTE')) {
      return d.__sheet || 'Desconhecida';
    }
    return d.UNIDADE || d.__sheet || 'Desconhecida';
  }, []);

  const sheetOrder: Record<string, number> = {
    'JANAÚBA': 10, 'MONTES CLAROS': 11, 'JAÍBA': 12, 'S. FRANCISCO': 13,
    'GUANAMBI': 20, 'V. CONQUISTA': 21, 'CAETITÉ': 22,
    'GRUPOS': 30, 'ENTES PÚBLICOS': 40,
  };

  const sheets = useMemo(() => {
    const raw = Array.from(new Set(data.map(d => d.__sheet).filter(Boolean))) as string[];
    const countMap = new Map<string, number>();
    data.forEach(d => { if (d.__sheet) countMap.set(d.__sheet, (countMap.get(d.__sheet) || 0) + 1); });
    return raw.sort((a, b) => {
      const oa = sheetOrder[a] ?? 50;
      const ob = sheetOrder[b] ?? 50;
      const regionA = Math.floor(oa / 10);
      const regionB = Math.floor(ob / 10);
      if (regionA !== regionB) return oa - ob;
      return (countMap.get(b) || 0) - (countMap.get(a) || 0);
    });
  }, [data]);
  
  const estados = Array.from(new Set(data.map(d => d.ESTADO).filter(Boolean))).sort() as string[];
  const unidades = Array.from(new Set(data.map(d => d.UNIDADE).filter(Boolean))).sort() as string[];

  const revenueByUnit = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => {
      const label = getGroupLabel(d);
      map.set(label, (map.get(label) || 0) + (d.valor_fixo || 0));
    });
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData, getGroupLabel]);

  const stateDistribution = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(d => {
      if (!d.ESTADO) return;
      const estado = String(d.ESTADO).toUpperCase().trim();
      map.set(estado, (map.get(estado) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

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

  useEffect(() => { setCurrentPage(1); }, [sheetFilter, estadoFilter, unidadeFilter, searchTerm]);

  const distributionData = useMemo(() => {
    const unitToUse = selectedDistUnit || (sheets.length > 0 ? sheets[0] : '');
    if (!unitToUse) return { unit: '', senior: [] as ContractData[], junior: [] as ContractData[], seniorTotal: 0, juniorTotal: 0 };
    
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

  return {
    data, loading, refreshing, error, handleRefresh, importExcelData,
    sheetFilter, setSheetFilter, estadoFilter, setEstadoFilter, unidadeFilter, setUnidadeFilter,
    searchTerm, setSearchTerm, currentPage, setCurrentPage, sortDir, setSortDir,
    selectedDistUnit, setSelectedDistUnit, splitRatio, setSplitRatio,
    filteredData, sheets, estados, unidades,
    totalContracts, totalRevenue, avgRevenue,
    revenueByUnit, stateDistribution, contractsByUnit,
    tableData, pagedData, totalPages,
    distributionData
  };
}
