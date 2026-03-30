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
    const allData: any[] = [];

    for (const file of files) {
      const filePath = path.join(csvDirPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
      
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const sheetName = file.replace('.csv', '');
      
      records.forEach((record: any) => {
        record.__sheet = sheetName;
        // Conversões numéricas
        if (record.valor_fixo) record.valor_fixo = parseFloat(record.valor_fixo) || 0;
        if (record.limite_func) record.limite_func = parseInt(record.limite_func) || 0;
        if (record.valor_por_func_acima) record.valor_por_func_acima = parseFloat(record.valor_por_func_acima) || 0;
        if (record.reajuste_percent) record.reajuste_percent = parseFloat(record.reajuste_percent) || 0;
        
        allData.push(record);
      });
    }

    return NextResponse.json({ data: allData });
  } catch (error) {
    console.error('Error reading CSVs:', error);
    return NextResponse.json({ error: 'Falha ao ler os dados.' }, { status: 500 });
  }
}
