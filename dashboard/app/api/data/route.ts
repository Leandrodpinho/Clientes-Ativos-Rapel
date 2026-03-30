import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const csvDirPath = path.join(process.cwd(), '../processed_csvs');
    if (!fs.existsSync(csvDirPath)) {
      return NextResponse.json({ error: 'Diretório de CSVs não encontrado.' }, { status: 404 });
    }

    const files = fs.readdirSync(csvDirPath).filter(file => 
      file.endsWith('.csv') && !file.toUpperCase().includes('CONTRATOS ATIVOS')
    );

    // 1. Criar um mapa para resgatar a "Filial / Aba" dos arquivos regionais
    const sheetMapping = new Map<string, string>();
    for (const file of files) {
      const filePath = path.join(csvDirPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
      const records = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });
      const sheetName = file.replace('.csv', '');
      
      records.forEach((r: any) => {
        const key = `${r.CLIENTE}_${r.CNPJ}`;
        sheetMapping.set(key, sheetName);
      });
    }

    const allData: any[] = [];
    const mainFilePath = path.join(csvDirPath, 'CONTRATOS ATIVOS.csv');

    if (!fs.existsSync(mainFilePath)) {
      return NextResponse.json({ error: 'Arquivo base de contratos não encontrado.' }, { status: 404 });
    }

    // 2. Carregar TODOS os clientes exatamente como estão na aba 'CONTRATOS ATIVOS'
    const mainFileContent = fs.readFileSync(mainFilePath, 'utf-8').replace(/^\uFEFF/, '');
    const masterRecords = parse(mainFileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    masterRecords.forEach((record: any) => {
      // Ignorar linhas em branco
      const isTrash = !record.CLIENTE || record.CLIENTE.toLowerCase() === 'nan';
      
      if (!isTrash) {
        const key = `${record.CLIENTE}_${record.CNPJ}`;
        
        // Resgatar a filial/aba original. Se não existir (ex: novos zerados), usar UNIDADE como fallback.
        const mappedSheet = sheetMapping.get(key);
        record.__sheet = mappedSheet || (record.UNIDADE && record.UNIDADE.toLowerCase() !== 'nan' ? record.UNIDADE : 'Sem Unidade');

        // Conversões numéricas
        record.valor_fixo = parseFloat(record.valor_fixo) || 0;
        record.limite_func = parseInt(record.limite_func) || 0;
        record.valor_por_func_acima = parseFloat(record.valor_por_func_acima) || 0;
        record.reajuste_percent = parseFloat(record.reajuste_percent) || 0;
        
        allData.push(record);
      }
    });

    return NextResponse.json({ data: allData });
  } catch (error) {
    console.error('Error reading CSVs:', error);
    return NextResponse.json({ error: 'Falha ao ler os dados.' }, { status: 500 });
  }
}
