import os
import re
import pandas as pd

# ── Parsing helpers ──────────────────────────────────────────────────────────

def parse_currency(text):
    """Extrai o primeiro valor monetário (ex: '280,00') de uma string."""
    if not isinstance(text, str): return None
    m = re.search(r"\d[\d\.]*,\d{2}", text)
    if not m: return None
    s = m.group(0).replace('.', '').replace(',', '.')
    try: return float(s)
    except: return None

def parse_int(text):
    """Extrai o limite de funcionários (ex: 'ATÉ 07 FUNC')."""
    if not isinstance(text, str): return None
    m = re.search(r"ATÉ\s*(\d{1,4})", text.upper())
    if m:
        try: return int(m.group(1))
        except: pass
    m = re.search(r"(\d{1,4})\s*FUNC", text.upper())
    if m:
        try: return int(m.group(1))
        except: pass
    return None

def parse_valor_por_func(text):
    """Extrai o valor por funcionário acima do limite."""
    if not isinstance(text, str): return None
    m = re.search(r"ACIMA\s*(\d[\d\.]*,\d{2})", text.upper())
    if m:
        try: return float(m.group(1).replace('.', '').replace(',', '.'))
        except: pass
    m = re.search(r"(\d[\d\.]*,\d{2})\s*POR\s*FUNC", text.upper())
    if m:
        try: return float(m.group(1).replace('.', '').replace(',', '.'))
        except: pass
    return None

def parse_reajuste(text):
    """Extrai informação de reajuste e percentual."""
    if not isinstance(text, str): return (None, None)
    m = re.search(r"\(([^)]*REAJUST[^)]*)\)", text.upper())
    if m:
        content = m.group(1).strip()
        p = re.search(r"(\d{1,2}[.,]\d+%)", content)
        if p:
            try: return (content, float(p.group(1).replace(',', '.').replace('%', '')))
            except: return (content, None)
        p = re.search(r"(\d{1,3}%)", content)
        if p:
            try: return (content, float(p.group(1).replace('%', '')))
            except: return (content, None)
        return (content, None)
    if 'REAJUST' in str(text).upper():
        m2 = re.search(r"REAJUST[^\d%]*(\d[\d,\.]*%?)", text.upper())
        if m2:
            val = m2.group(1).replace(',', '.')
            try:
                if val.endswith('%'): return (val, float(val.replace('%', '')))
                return (val, float(val))
            except: return (val, None)
        return (text, None)
    return (None, None)

# ── Column finders ───────────────────────────────────────────────────────────

def find_column_by_keywords(df, keywords, exclude_cols=None):
    """Encontra uma coluna pelo nome usando palavras-chave."""
    exclude_cols = exclude_cols or []
    for col in df.columns:
        if col in exclude_cols: continue
        if isinstance(col, str):
            col_upper = col.upper()
            for kw in keywords:
                if kw in col_upper:
                    return col
    return None

def find_value_column(df):
    """Encontra a coluna de valores (com padrão monetário)."""
    col = find_column_by_keywords(df, ['VALOR'])
    if col: return col
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
    """Encontra a coluna de nome/razão social."""
    col = find_column_by_keywords(df, ['RAZAO', 'RAZÃO', 'NOME SOCIAL'], exclude_cols=[val_col])
    if col: return col
    col = find_column_by_keywords(df, ['NOME', 'CLIENTE', 'EMPRESA'], exclude_cols=[val_col])
    if col: return col
    best_col = None
    max_unique = -1
    for col in df.columns:
        if col == val_col: continue
        s = df[col].dropna().astype(str)
        if len(s) > 0 and s.str.len().max() > 10:
            if not s.str.match(r'^\d+$').all() and not s.str.match(r'^[\d\.\-/]+$').all():
                u = s.nunique()
                if u > max_unique:
                    max_unique = u
                    best_col = col
    return best_col if best_col else df.columns[0]

def find_fantasia_column(df):
    return find_column_by_keywords(df, ['FANTASIA'])

def find_cnpj_column(df):
    return find_column_by_keywords(df, ['CNPJ'])

def find_cpf_column(df):
    return find_column_by_keywords(df, ['CPF'])

def find_unidade_column(df):
    return find_column_by_keywords(df, ['UNIDADE'])

def find_estado_column(df):
    return find_column_by_keywords(df, ['ESTADO', 'UF'])

def find_cidade_column(df):
    return find_column_by_keywords(df, ['CIDADE', 'MUNICÍPIO', 'MUNICIPIO'])

def find_inicio_column(df):
    return find_column_by_keywords(df, ['INICIO', 'INÍCIO'])

def find_reajuste_tipo_column(df):
    return find_column_by_keywords(df, ['REAJUSTE'])

def find_asos_rapel_column(df):
    return find_column_by_keywords(df, ['ASOS RAPEL'])

def find_asos_empresa_column(df):
    return find_column_by_keywords(df, ['ASOS EMPRESA'])

# ── Sheet processors ─────────────────────────────────────────────────────────

def process_standard_sheet(df):
    """Processa abas com cabeçalho padrão (cidades e CONTRATOS ATIVOS)."""
    df = df.dropna(axis=1, how='all')
    if df.empty: return pd.DataFrame()
    
    val_col = find_value_column(df)
    name_col = find_name_column(df, val_col)
    fantasia_col = find_fantasia_column(df)
    cnpj_col = find_cnpj_column(df)
    cpf_col = find_cpf_column(df)
    uni_col = find_unidade_column(df)
    est_col = find_estado_column(df)
    cid_col = find_cidade_column(df)
    ini_col = find_inicio_column(df)
    reaj_tipo_col = find_reajuste_tipo_column(df)
    asos_rapel_col = find_asos_rapel_column(df)
    asos_empresa_col = find_asos_empresa_column(df)
    
    s = df[val_col].astype('object')
    
    df_out = pd.DataFrame()
    df_out['CLIENTE'] = df[name_col].astype(str).str.strip() if name_col else 'N/A'
    df_out['NOME_FANTASIA'] = df[fantasia_col].astype(str).str.strip() if fantasia_col else ''
    df_out['CNPJ'] = df[cnpj_col].astype(str).str.strip() if cnpj_col else ''
    df_out['CPF'] = df[cpf_col].astype(str).str.strip() if cpf_col else ''
    df_out['UNIDADE'] = df[uni_col].astype(str).str.strip() if uni_col else ''
    df_out['ESTADO'] = df[est_col].astype(str).str.strip() if est_col else ''
    df_out['CIDADE'] = df[cid_col].astype(str).str.strip() if cid_col else ''
    df_out['INICIO'] = df[ini_col].astype(str).str.strip() if ini_col else ''
    df_out['REAJUSTE_TIPO'] = df[reaj_tipo_col].astype(str).str.strip() if reaj_tipo_col else ''
    df_out['ASOS_RAPEL'] = df[asos_rapel_col].astype(str).str.strip() if asos_rapel_col else ''
    df_out['ASOS_EMPRESA'] = df[asos_empresa_col].astype(str).str.strip() if asos_empresa_col else ''
    
    df_out['valor_fixo'] = s.apply(parse_currency)
    df_out['limite_func'] = s.apply(parse_int)
    df_out['valor_por_func_acima'] = s.apply(parse_valor_por_func)
    
    reajuste_texts = []
    reajuste_percents = []
    for val in s:
        t, p = parse_reajuste(val)
        reajuste_texts.append(t)
        reajuste_percents.append(p)
    df_out['reajuste_text'] = reajuste_texts
    df_out['reajuste_percent'] = reajuste_percents
    
    # Limpar NaN strings
    for col in ['CNPJ', 'CPF', 'NOME_FANTASIA', 'INICIO', 'REAJUSTE_TIPO', 'ASOS_RAPEL', 'ASOS_EMPRESA', 'CIDADE']:
        df_out[col] = df_out[col].replace({'nan': '', 'None': '', 'NaN': ''})
    
    df_out = df_out.dropna(subset=['valor_fixo'])
    df_out = df_out[df_out['CLIENTE'].astype(str).str.strip() != '']
    df_out = df_out[df_out['CLIENTE'] != 'nan']
    return df_out


def process_special_sheet(df_raw, sheet_name):
    """Processa abas GRUPOS e ENTES PÚBLICOS (sem cabeçalho padrão).
    
    Mapeamento de colunas por posição:
        Col 0: UNIDADE
        Col 1: RAZÃO SOCIAL
        Col 2: NOME FANTASIA
        Col 3: CNPJ
        Col 4: CPF
        Col 5: VALORES
        Col 6: INICIO
        Col 7: (percentual numérico - ignorado)
        Col 8: (vazio geralmente)
        Col 9: ASOS EMPRESA
        Col 10: CIDADE
        Col 11: ESTADO
    """
    # Ler sem cabeçalho, pulando a primeira linha (que é o nome da aba)
    df = df_raw.iloc[1:].copy()
    df.columns = range(len(df.columns))
    
    if df.empty: return pd.DataFrame()
    
    # Garantir que temos colunas suficientes
    max_col = max(11, len(df.columns) - 1)
    
    def safe_col(idx):
        if idx < len(df.columns):
            return df[idx].astype(str).str.strip()
        return pd.Series([''] * len(df), index=df.index)
    
    s = safe_col(5)  # Coluna de VALORES
    
    df_out = pd.DataFrame()
    df_out['CLIENTE'] = safe_col(1)  # RAZÃO SOCIAL
    df_out['NOME_FANTASIA'] = safe_col(2)
    df_out['CNPJ'] = safe_col(3)
    df_out['CPF'] = safe_col(4)
    df_out['UNIDADE'] = safe_col(0)
    df_out['ESTADO'] = safe_col(11) if len(df.columns) > 11 else ''
    df_out['CIDADE'] = safe_col(10) if len(df.columns) > 10 else ''
    df_out['INICIO'] = safe_col(6)
    df_out['REAJUSTE_TIPO'] = ''
    df_out['ASOS_RAPEL'] = ''
    df_out['ASOS_EMPRESA'] = safe_col(9) if len(df.columns) > 9 else ''
    
    df_out['valor_fixo'] = s.apply(parse_currency)
    df_out['limite_func'] = s.apply(parse_int)
    df_out['valor_por_func_acima'] = s.apply(parse_valor_por_func)
    
    reajuste_texts = []
    reajuste_percents = []
    for val in s:
        t, p = parse_reajuste(val)
        reajuste_texts.append(t)
        reajuste_percents.append(p)
    df_out['reajuste_text'] = reajuste_texts
    df_out['reajuste_percent'] = reajuste_percents
    
    # Limpar NaN strings
    for col in ['CNPJ', 'CPF', 'NOME_FANTASIA', 'INICIO', 'REAJUSTE_TIPO', 'ASOS_RAPEL', 'ASOS_EMPRESA', 'CIDADE', 'UNIDADE', 'ESTADO', 'CLIENTE']:
        df_out[col] = df_out[col].replace({'nan': '', 'None': '', 'NaN': ''})
    
    df_out = df_out.dropna(subset=['valor_fixo'])
    df_out = df_out[df_out['CLIENTE'].astype(str).str.strip() != '']
    df_out = df_out[df_out['CLIENTE'] != '']
    return df_out


def is_special_sheet(df):
    """Detecta se a aba é GRUPOS ou ENTES PÚBLICOS (formato especial)."""
    if df.empty: return False
    first_cell = str(df.iloc[0, 0]).upper().strip() if len(df.columns) > 0 else ''
    return 'GRUPO' in first_cell or 'ENTE' in first_cell


def main():
    file_path = os.path.join(os.path.dirname(__file__), 'PLANILHA DE CONTRATOS ATIVOS.xlsx')
    excel = pd.ExcelFile(file_path)
    out_dir = os.path.join(os.path.dirname(file_path), 'processed_csvs')
    os.makedirs(out_dir, exist_ok=True)

    for sheet in excel.sheet_names:
        print(f'Processando aba: {sheet}')
        try:
            df = pd.read_excel(file_path, sheet_name=sheet, header=None)
            
            if is_special_sheet(df):
                print(f'  → Formato especial detectado para: {sheet}')
                df_proc = process_special_sheet(df, sheet)
            else:
                # Recarregar com cabeçalho
                df = pd.read_excel(file_path, sheet_name=sheet)
                df_proc = process_standard_sheet(df)
            
            if df_proc.empty:
                print(f'  → Sem dados processados para: {sheet}')
                continue
                
            safe_name = re.sub(r'[\\/*?:"<>|]', '_', sheet)
            out_path = os.path.join(out_dir, f"{safe_name}.csv")
            df_proc.to_csv(out_path, index=False, encoding='utf-8-sig')
            print(f'  → Salvo: {out_path} ({len(df_proc)} registros)')
            
        except Exception as e:
            print(f'  → Erro processando {sheet}: {e}')
            import traceback
            traceback.print_exc()
            continue

if __name__ == '__main__':
    main()
