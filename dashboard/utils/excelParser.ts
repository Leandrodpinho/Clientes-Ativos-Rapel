import * as XLSX from 'xlsx';
import { ContractData } from '../types';

// Parsing helpers
function parseCurrency(text: any): number | null {
  if (typeof text !== 'string') return null;
  const m = text.match(/\d[\d.]*,\d{2}/);
  if (!m) return null;
  const s = m[0].replace(/\./g, '').replace(',', '.');
  const val = parseFloat(s);
  return isNaN(val) ? null : val;
}

function parseIntLimit(text: any): number | null {
  if (typeof text !== 'string') return null;
  const upper = text.toUpperCase();
  let m = upper.match(/ATÉ\s*(\d{1,4})/);
  if (m) {
    const val = parseInt(m[1], 10);
    if (!isNaN(val)) return val;
  }
  m = upper.match(/(\d{1,4})\s*FUNC/);
  if (m) {
    const val = parseInt(m[1], 10);
    if (!isNaN(val)) return val;
  }
  return null;
}

function parseValorPorFunc(text: any): number | null {
  if (typeof text !== 'string') return null;
  const upper = text.toUpperCase();
  let m = upper.match(/ACIMA\s*(\d[\d.]*,\d{2})/);
  if (m) {
    return parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
  }
  m = upper.match(/(\d[\d.]*,\d{2})\s*POR\s*FUNC/);
  if (m) {
    return parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
  }
  return null;
}

function parseReajuste(text: any): [string | null, number | null] {
  if (typeof text !== 'string') return [null, null];
  const upper = text.toUpperCase();
  let m = upper.match(/\(([^)]*REAJUST[^)]*)\)/);
  if (m) {
    const content = m[1].trim();
    let p = content.match(/(\d{1,2}[.,]\d+%)/);
    if (p) {
      return [content, parseFloat(p[1].replace(',', '.').replace('%', ''))];
    }
    p = content.match(/(\d{1,3}%)/);
    if (p) {
      return [content, parseFloat(p[1].replace('%', ''))];
    }
    return [content, null];
  }
  if (upper.includes('REAJUST')) {
    const m2 = upper.match(/REAJUST[^\d%]*(\d[\d,.]*%?)/);
    if (m2) {
      const valStr = m2[1].replace(',', '.');
      if (valStr.endsWith('%')) {
        return [valStr, parseFloat(valStr.replace('%', ''))];
      }
      return [valStr, parseFloat(valStr)];
    }
    return [text, null];
  }
  return [null, null];
}

// Column finders
function findColumnByKeywords(headers: string[], keywords: string[], excludeCols: string[] = []): string | null {
  for (const col of headers) {
    if (excludeCols.includes(col)) continue;
    const colUpper = col.toUpperCase();
    for (const kw of keywords) {
      if (colUpper.includes(kw)) return col;
    }
  }
  return null;
}

function findValueColumn(headers: string[], rows: any[]): string {
  const kwMatch = findColumnByKeywords(headers, ['VALOR']);
  if (kwMatch) return kwMatch;

  let bestCol = headers[headers.length - 1];
  let maxMatches = 0;
  for (const col of headers) {
    let matches = 0;
    for (const row of rows.slice(0, 50)) {
      if (String(row[col]).match(/\d[\d.]*,\d{2}/)) matches++;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestCol = col;
    }
  }
  return bestCol;
}

function findNameColumn(headers: string[], valCol: string, rows: any[]): string {
  let col = findColumnByKeywords(headers, ['RAZAO', 'RAZÃO', 'NOME SOCIAL'], [valCol]);
  if (col) return col;
  col = findColumnByKeywords(headers, ['NOME', 'CLIENTE', 'EMPRESA'], [valCol]);
  if (col) return col;

  let bestCol = headers[0];
  let maxUnique = -1;
  for (const c of headers) {
    if (c === valCol) continue;
    const values = rows.map(r => String(r[c] || ''));
    if (values.length > 0) {
      const uniqueCount = new Set(values).size;
      if (uniqueCount > maxUnique) {
        maxUnique = uniqueCount;
        bestCol = c;
      }
    }
  }
  return bestCol;
}

export async function parseExcelFile(file: File): Promise<ContractData[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  let allProcessedData: ContractData[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // Read raw data to check if special
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (rawData.length === 0) continue;

    const firstCell = String(rawData[0][0] || '').toUpperCase().trim();
    const isSpecial = firstCell.includes('GRUPO') || firstCell.includes('ENTE');

    if (isSpecial) {
      // Special format logic (skip first row/name)
      const rows = rawData.slice(1);
      const processed = rows.map(row => {
        const valStr = String(row[5] || '');
        const [reajText, reajPerc] = parseReajuste(valStr);
        return {
          __sheet: sheetName,
          CLIENTE: String(row[1] || '').trim(),
          NOME_FANTASIA: String(row[2] || '').trim(),
          CNPJ: String(row[3] || '').trim(),
          CPF: String(row[4] || '').trim(),
          UNIDADE: String(row[0] || '').trim(),
          ESTADO: String(row[11] || '').trim(),
          CIDADE: String(row[10] || '').trim(),
          INICIO: String(row[6] || '').trim(),
          ASOS_EMPRESA: String(row[9] || '').trim(),
          valor_fixo: parseCurrency(valStr) || 0,
          limite_func: parseIntLimit(valStr) || 0,
          valor_por_func_acima: parseValorPorFunc(valStr) || 0,
          reajuste_text: reajText || '',
          reajuste_percent: reajPerc || 0,
        } as ContractData;
      }).filter(d => d.CLIENTE !== '');
      allProcessedData = [...allProcessedData, ...processed];
    } else {
      // Standard sheet logic
      const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      if (json.length === 0) continue;
      
      const headers = Object.keys(json[0]);
      const valCol = findValueColumn(headers, json);
      const nameCol = findNameColumn(headers, valCol, json);
      const fantasiaCol = findColumnByKeywords(headers, ['FANTASIA']);
      const cnpjCol = findColumnByKeywords(headers, ['CNPJ']);
      const cpfCol = findColumnByKeywords(headers, ['CPF']);
      const uniCol = findColumnByKeywords(headers, ['UNIDADE']);
      const estCol = findColumnByKeywords(headers, ['ESTADO', 'UF']);
      const cidCol = findColumnByKeywords(headers, ['CIDADE', 'MUNICÍPIO', 'MUNICIPIO']);
      const iniCol = findColumnByKeywords(headers, ['INICIO', 'INÍCIO']);
      const asoEmpCol = findColumnByKeywords(headers, ['ASOS EMPRESA']);

      const processed = json.map(row => {
        const valStr = String(row[valCol] || '');
        const [reajText, reajPerc] = parseReajuste(valStr);
        return {
          __sheet: sheetName,
          CLIENTE: String(row[nameCol] || '').trim(),
          NOME_FANTASIA: fantasiaCol ? String(row[fantasiaCol] || '').trim() : '',
          CNPJ: cnpjCol ? String(row[cnpjCol] || '').trim() : '',
          CPF: cpfCol ? String(row[cpfCol] || '').trim() : '',
          UNIDADE: uniCol ? String(row[uniCol] || '').trim() : '',
          ESTADO: estCol ? String(row[estCol] || '').trim() : '',
          CIDADE: cidCol ? String(row[cidCol] || '').trim() : '',
          INICIO: iniCol ? String(row[iniCol] || '').trim() : '',
          ASOS_EMPRESA: asoEmpCol ? String(row[asoEmpCol] || '').trim() : '',
          valor_fixo: parseCurrency(valStr) || 0,
          limite_func: parseIntLimit(valStr) || 0,
          valor_por_func_acima: parseValorPorFunc(valStr) || 0,
          reajuste_text: reajText || '',
          reajuste_percent: reajPerc || 0,
        } as ContractData;
      }).filter(d => d.CLIENTE !== '');
      allProcessedData = [...allProcessedData, ...processed];
    }
  }

  return allProcessedData;
}
