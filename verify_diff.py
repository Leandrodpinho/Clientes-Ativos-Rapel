import os
import pandas as pd
import re

file_path = 'PLANILHA DE CONTRATOS ATIVOS.xlsx'

def is_special_sheet(df):
    if df.empty: return False
    first_cell = str(df.iloc[0, 0]).upper().strip() if len(df.columns) > 0 else ''
    return 'GRUPO' in first_cell or 'ENTE' in first_cell

def find_value_column(df):
    for col in df.columns:
        if isinstance(col, str) and 'VALOR' in col.upper():
            return col
    best_col = None
    max_matches = 0
    for col in df.columns:
        s = df[col].astype(str)
        matches = s.str.contains(r'\d[\d\.]*,\d{2}', regex=True, na=False).sum()
        if matches > max_matches:
            max_matches = matches
            best_col = col
    return best_col if max_matches > 0 else df.columns[-1]

def find_name_column(df, val_col):
    for col in df.columns:
        if isinstance(col, str) and col != val_col and any(kw in col.upper() for kw in ['RAZAO', 'RAZÃO', 'NOME SOCIAL', 'NOME', 'CLIENTE', 'EMPRESA']):
            return col
    return df.columns[0]

def parse_currency(text):
    if not isinstance(text, str): return None
    m = re.search(r"\d[\d\.]*,\d{2}", text)
    if not m: return None
    s = m.group(0).replace('.', '').replace(',', '.')
    try: return float(s)
    except: return None

excel = pd.ExcelFile(file_path)

total_valid = 0
total_with_value = 0
total_zero_value = 0

print("Relatório de Discrepância de Contratos:\n" + "="*50)

for sheet in excel.sheet_names:
    df_raw = pd.read_excel(file_path, sheet_name=sheet, header=None)
    if df_raw.empty: continue
    
    if is_special_sheet(df_raw):
        # Special sheet
        df = df_raw.iloc[1:].copy()
        df.columns = range(len(df.columns))
        client_col = 1
        val_col = 5
    else:
        df = pd.read_excel(file_path, sheet_name=sheet)
        df = df.dropna(axis=1, how='all')
        if df.empty: continue
        val_col = find_value_column(df)
        client_col = find_name_column(df, val_col)
    
    # Filter rows that have a client name
    has_client = df[client_col].astype(str).str.strip().replace({'nan': '', 'None': '', 'NaN': ''}) != ''
    valid_rows = df[has_client].copy()
    
    val_parsed = valid_rows[val_col].astype(str).apply(parse_currency)
    
    sheet_valid = len(valid_rows)
    sheet_with_value = val_parsed.notna().sum()
    sheet_zero = (val_parsed == 0).sum()
    
    total_valid += sheet_valid
    total_with_value += sheet_with_value
    total_zero_value += sheet_zero
    
    dropped = sheet_valid - sheet_with_value
    
    print(f"Aba: {sheet}")
    print(f"  - Registros válidos (com Nome/Cliente): {sheet_valid}")
    print(f"  - Registros com Valor Fixo (não-nulo): {sheet_with_value} (Dropados: {dropped})")
    print(f"  - Registros com Valor Fixo == 0: {sheet_zero}")

print("-" * 50)
print(f"TOTAL GERAL DE REGISTROS VÁLIDOS (Com Cliente): {total_valid}")
print(f"TOTAL CONSIDERADO PELO SCRIPT (Com Valor Fixo válido): {total_with_value}")
print(f"TOTAL QUE SERIA MOSTRADO NO DASHBOARD VIA EXCEL PARSER (> 0): {total_with_value - total_zero_value}")
print(f"DIFERENÇA (Válidos - Aceitos): {total_valid - total_with_value}")
