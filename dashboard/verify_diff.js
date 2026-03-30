const XLSX = require('xlsx');

function parseCurrency(text) {
  if (typeof text !== 'string') return null;
  const m = text.match(/\d[\d.]*,\d{2}/);
  if (!m) return null;
  const s = m[0].replace(/\./g, '').replace(',', '.');
  const val = parseFloat(s);
  return isNaN(val) ? null : val;
}

function findColumnByKeywords(headers, keywords, excludeCols = []) {
  for (const col of headers) {
    if (excludeCols.includes(col)) continue;
    const colUpper = col.toUpperCase();
    for (const kw of keywords) {
      if (colUpper.includes(kw)) return col;
    }
  }
  return null;
}

function findValueColumn(headers, rows) {
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

function findNameColumn(headers, valCol, rows) {
  let col = findColumnByKeywords(headers, ['RAZAO', 'RAZÃO', 'NOME SOCIAL'], [valCol]);
  if (col) return col;
  col = findColumnByKeywords(headers, ['NOME', 'CLIENTE', 'EMPRESA'], [valCol]);
  if (col) return col;
  return headers[0];
}

function analyze() {
  const workbook = XLSX.readFile('processed_csvs/PLANILHA DE CONTRATOS ATIVOS.xlsx');
  let totalWithClient = 0;
  let totalWithValueGTZero = 0;
  
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (rawData.length === 0) continue;

    const firstCell = String(rawData[0][0] || '').toUpperCase().trim();
    const isSpecial = firstCell.includes('GRUPO') || firstCell.includes('ENTE');

    if (isSpecial) {
      const rows = rawData.slice(1);
      const processed = rows.map((row) => {
        const cliente = String(row[1] || '').trim();
        const valStr = String(row[5] || '');
        const vf = parseCurrency(valStr) || 0;
        return { cliente, valor_fixo: vf };
      });
      
      const withClient = processed.filter(d => d.cliente !== '');
      const validForDashboard = withClient.filter(d => d.valor_fixo > 0);
      
      totalWithClient += withClient.length;
      totalWithValueGTZero += validForDashboard.length;
    } else {
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      if (json.length === 0) continue;
      
      const headers = Object.keys(json[0]);
      if (!headers.length) continue;
      const valCol = findValueColumn(headers, json);
      const nameCol = findNameColumn(headers, valCol, json);

      const processed = json.map(row => {
        const cliente = String(row[nameCol] || '').trim();
        const valStr = String(row[valCol] || '');
        const vf = parseCurrency(valStr) || 0;
        return { cliente, valor_fixo: vf };
      });
      
      const withClient = processed.filter(d => d.cliente !== '');
      const validForDashboard = withClient.filter(d => d.valor_fixo > 0);
      
      totalWithClient += withClient.length;
      totalWithValueGTZero += validForDashboard.length;
    }
  }
  
  console.log(`Total com Cliente (O que o ChatGPT conta): ${totalWithClient}`);
  console.log(`Total com valor_fixo > 0 (O que o Dashboard mostra): ${totalWithValueGTZero}`);
  console.log(`Diferença (Contratos com valor zero/nulo): ${totalWithClient - totalWithValueGTZero}`);
}

analyze();
