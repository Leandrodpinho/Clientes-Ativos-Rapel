const XLSX = require('xlsx');
const fs = require('fs');

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

function generateReport() {
  const workbook = XLSX.readFile('processed_csvs/PLANILHA DE CONTRATOS ATIVOS.xlsx');
  
  let markdown = `# Relatório: 57 Contratos sem Valor Fixo Detectados\n\n`;
  markdown += `Abaixo está a lista exata dos 57 contratos ativos que o sistema anterior removia, junto com o preenchimento real da coluna de Valor na sua planilha para entender por que foram zerados.\n\n`;
  markdown += `| Filial / Planilha | Empresa / Cliente | Conteúdo Original (Coluna Valor) |\n`;
  markdown += `| ----------------- | ----------------- | -------------------------------- |\n`;
  
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
        return { sheet: sheetName, cliente, valStr, vf };
      });
      
      const withClient = processed.filter(d => d.cliente !== '');
      const dropped = withClient.filter(d => d.vf <= 0);
      
      dropped.forEach(d => {
        const valClean = d.valStr.replace(/\n/g, ' ') || '*(vazio)*';
        markdown += `| ${d.sheet} | **${d.cliente}** | ${valClean} |\n`;
      });
      
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
        return { sheet: sheetName, cliente, valStr, vf };
      });
      
      const withClient = processed.filter(d => d.cliente !== '');
      const dropped = withClient.filter(d => d.vf <= 0);
      
      dropped.forEach(d => {
        let valClean = String(d.valStr).replace(/\\n/g, ' ') || '*(vazio)*';
        markdown += `| ${d.sheet} | **${d.cliente}** | ${valClean} |\n`;
      });
    }
  }
  
  fs.writeFileSync('C:/Users/RAPEL/.gemini/antigravity/brain/d95ec347-cb72-4fb3-a580-8788b6478c49/relatorio_57_contratos.md', markdown);
  console.log("Relatório gerado em artefato.");
}

generateReport();
