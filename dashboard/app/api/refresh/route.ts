import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    const scriptDir = path.join(process.cwd(), '..');
    // Using the python path specified in README if globally unavailable, but 'python' usually works.
    await execAsync('python tratar_honorarios.py', { cwd: scriptDir });
    
    return NextResponse.json({ success: true, message: 'Dados atualizados com sucesso.' });
  } catch (error) {
    console.error('Error running python script:', error);
    return NextResponse.json({ error: 'Falha ao atualizar os dados.' }, { status: 500 });
  }
}
