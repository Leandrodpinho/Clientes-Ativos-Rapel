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

def find_segmento_column(df):
    return find_column_by_keywords(df, ['SEGMENTO', 'SETOR', 'CATEGORIA', 'RAMO'])

def clean_cnpj(val):
    if not val or pd.isna(val) or str(val).lower() == 'nan': return None
    s = str(val).replace('.', '').replace('-', '').replace('/', '').strip()
    return s if len(s) == 14 else None

def map_cnae_to_segment(cnae):
    """Mapeia descrições técnicas de CNAEs para categorias amigáveis."""
    cnae = str(cnae).upper()
    
    # Saúde (Prioridade 1)
    if any(k in cnae for k in ['SAÚDE', 'MÉDICA', 'HOSPITAL', 'CLÍNICA', 'ODONTO', 'PSICOLOGIA', 'ENFERMAGEM', 'LABORATÓRIO', 'FARMÁCIA', 'DROGARIA', 'CIRURGIA', 'FISIOTERAPIA', 'REABILITAÇÃO', 'RADIOLOGIA', 'ULTRA', 'IMAGEM', 'OFTALMO', 'DIAGNÓSTICO', 'TERAPIA', 'FARMACÊUTICOS', 'RESSONÂNCIA', 'IDOSA', 'IDOSO', 'HEMODIÁLISE', 'AMBULATORIAL', 'PSICOPEDAGOGIA']):
        return 'Saúde'
        
    # Agronegócio (Prioridade 2)
    if any(k in cnae for k in ['CULTIVO', 'AGRO', 'FAZENDA', 'PECUÁRIA', 'LAVOURA', 'CRIAÇÃO DE', 'EXTRATIVISMO', 'PRODUÇÃO DE', 'FLORESTAL', 'PESCA', 'AQUICULTURA', 'FRUTICULTURA', 'HORTICULTURA', 'CEREALISTA', 'CEREAIS', 'DEFENSIVOS', 'FERTILIZANTES', 'ADUBOS', 'APOIO À AGRICULTURA', 'MATÉRIAS-PRIMAS AGRÍCOLAS', 'ANIMAIS VIVOS', 'VET', 'VETERINÁRIO']):
        return 'Agronegócio'
        
    # Indústria (Prioridade 3)
    if any(k in cnae for k in ['FABRICAÇÃO', 'INDÚSTRIA', 'METAL', 'TÊXTIL', 'CERÂMICA', 'USINA', 'MARCENARIA', 'GRÁFICA', 'MÓVEIS', 'COSMÉTICOS', 'MINERAÇÃO', 'EMBALAGENS', 'PANIFICAÇÃO', 'AÇO', 'ESTOFADOS', 'FRIGORÍFICO', 'ABATE', 'BOVINOS', 'CONFECÇÃO', 'TECELAGEM', 'BENEFICIAMENTO', 'FUNDIÇÃO']):
        return 'Indústria'
        
    # Indústria / Alimentos e Gastronomia
    if any(k in cnae for k in ['ALIMENTOS', 'BEBIDAS', 'PANIFICAÇÃO', 'FRIGORÍFICO', 'ABATE', 'LATICÍNIOS', 'SORVETES', 'PADARIA', 'CONFEITARIA', 'PESCADOS', 'CARNES', 'CHURRASCARIA', 'RESTAURANTE', 'LANCHONETE', 'BUFFET', 'COZINHA', 'PRODUTOS ALIMENTÍCIOS', 'MINIMERCADO', 'MERCEARIA']):
        if any(k in cnae for k in ['RESTAURANTE', 'LANCHONETE', 'BUFFET', 'HOTEL', 'POUSADA', 'HOSPEDAGEM', 'BAR', 'RESTAURANTES']):
            return 'Hotelaria / Gastronomia'
        return 'Indústria / Alimentos'
        
    # Construção Civil
    if any(k in cnae for k in ['CONSTRUÇÃO', 'ENGENHARIA', 'OBRAS', 'REFORMA', 'EDIFICAÇÕES', 'INSTALAÇÕES', 'PINTURA', 'ELÉTRICA', 'HIDRÁULICA', 'SOLAR', 'PEDRAS', 'INCORPORAÇÃO', 'LOTEAMENTO', 'TERRAPLENAGEM', 'DEMOLIÇÃO']):
        return 'Construção Civil'
        
    # Varejo
    if any(k in cnae for k in ['SUPERMERCADO', 'LOJA', 'VAREJO', 'CONVENIÊNCIA', 'PAPELARIA', 'VESTUÁRIO', 'MODA', 'MÓVEIS', 'ELETRODOMÉSTICOS', 'PERFUMARIA', 'LOTÉRICA', 'ELETRÔNICOS', 'FERRAGENS', 'FERRAMENTAS', 'MATERIAIS DE CONSTRUÇÃO', 'ARMÁZÉM', 'VARIEDADES', 'CALÇADOS', 'OTICA', 'ÓTICA', 'MERCADORIAS EM GERAL']):
        return 'Varejo'
        
    # Setor Público
    if any(k in cnae for k in ['ADMINISTRAÇÃO PÚBLICA', 'DEFESA', 'JUSTIÇA', 'ÓRGÃO', 'MUNICIPAL', 'ESTADUAL', 'MUNICIPIO', 'MUNICÍPIO', 'PREFEITURA', 'CÂMARA', 'CONSORCIO', 'CONSELHO']):
        return 'Setor Público'
        
    # Educação
    if any(k in cnae for k in ['ENSINO', 'EDUCAÇÃO', 'ESCOLA', 'CURSO', 'TREINAMENTO', 'PALESTRAS', 'FACULDADE', 'UNIVERSIDADE', 'COLÉGIO', 'EDUCACIONAL', 'ESTUDOS']):
        return 'Educação'
        
    # Automotivo
    if any(k in cnae for k in ['AUTO', 'MOTOR', 'VEÍCULO', 'MECÂNICA', 'PEÇAS', 'CONCESSIONÁRIA', 'PNEUS', 'COMBUSTÍVEIS', 'POSTO', 'OFICINA', 'LUBRIFICANTE', 'SCOOTER', 'MOTOCICLETA', 'REPARAÇÃO DE VEÍCULOS']):
        return 'Automotivo'
        
    # Transporte / Logística
    if any(k in cnae for k in ['TRANSPORTE', 'MUDANÇA', 'LOGÍSTICA', 'FRETE', 'ARMAZÉM', 'CARGA', 'ENTREGA', 'TÁXI', 'ESTOCAGEM', 'COLETA DE RESÍDUOS', 'RESÍDUOS']):
        return 'Transporte / Logística'
        
    # Serviços Especializados
    if any(k in cnae for k in ['CONSULTORIA', 'CONTABILIDADE', 'ADVOGADO', 'LIMPEZA', 'CONSERVAÇÃO', 'VIGILÂNCIA', 'AUDITORIA', 'SEGURANÇA', 'IMOBILIÁRIA', 'SINDICATO', 'ASSOCIAÇÃO', 'ASSOCIATIVAS', 'ADMINISTRAÇÃO DE BENS', 'CONDOMÍNIO', 'CONDOMINIO', 'CONTADORA', 'ADVOCACIA', 'FUNERÁRIA', 'ESTÉTICA', 'BELEZA', 'ACADEMIA', 'ESCRITÓRIO', 'APOIO ADMINISTRATIVO', 'RELIGIOSAS', 'PATRONAIS', 'PARTNERS', 'BENS']):
        return 'Serviços'
        
    return 'Outros / Não Informado'

def load_cnpj_cache():
    cache_path = 'processed_csvs/cnpj_cache.json'
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def auto_segmentar(nome):
    """Lógica agressiva de auto-segmentação por palavras-chave no nome."""
    nome = str(nome).upper()
    
    # Setor Público
    if any(k in nome for k in ['MUNICIPIO', 'MUNICÍPIO', 'PREFEITURA', 'CÂMARA', 'CONSORCIO', 'CONVÊNIA', 'PÚBLICO', 'GABINETE', 'ÓRGÃO', 'SECRETARIA']):
        return 'Setor Público'
    # Saúde
    if any(k in nome for k in ['CLÍNICA', 'HOSPITAL', 'MÉDICO', 'ODONTO', 'SAÚDE', 'DROGARIA', 'FARMÁCIA', 'ULTRA', 'LABORATÓRIO', 'FISIO', 'CIRURGIA', 'CARDIOPULMONAR', 'BUCOMAXILO', 'CAPILAR', 'IMAGEM', 'OFTALMO', 'CHECK UP', 'VITALLE', 'DIAGNOSTIC', 'DIAGNÓSTIC', 'ECO SOM', 'EMEPSI']):
        return 'Saúde'
    # Alimentação / Bebidas
    if any(k in nome for k in ['SORVETES', 'CEREAIS', 'PESCADOS', 'LATICÍNIOS', 'PADARIA', 'LANCHONETE', 'RESTAURANTE', 'CONFEITARIA', 'BUFFET', 'AÇOUGUE', 'DISTRIBUIDORA DE BEBIDAS', 'FRUTAS', 'ALIMENTOS', 'PANIFICAÇÃO', 'PAES E CARNES']):
        return 'Hotelaria / Gastronomia' if 'RESTAURANTE' in nome or 'HOTEL' in nome else 'Indústria / Alimentos'
    # Construção / Energia
    if any(k in nome for k in ['CONSTRUTORA', 'ENGENHARIA', 'OBRAS', 'REFORMA', 'EMPREENDIMENTOS', 'PEDRAS', 'CERÂMICA', 'TIJOLOS', 'CONSTRUMINAS', 'SOLARES', 'INCORPORAÇÃO', 'SPE LTDA', 'CFCON', 'EDIFICACOES']):
        return 'Construção Civil'
    # Varejo
    if any(k in nome for k in ['SUPERMERCADO', 'COMÉRCIO', 'LOJA', 'VAREJO', 'MAGAZINE', 'CALÇADOS', 'VESTUÁRIO', 'MOVEIS', 'MÓVEIS', 'PAPELARIA', 'LOTÉRICA', 'PONTO DA SORTE', 'BOUTIQUE', 'MODA', 'COSMETICOS', 'PERFUMARIA', 'ELETRO', 'ZENITH', 'VENDAS']):
        return 'Varejo'
    # Automotivo
    if any(k in nome for k in ['AUTO', 'POSTO', 'PEÇAS', 'MECÂNICA', 'VEÍCULOS', 'MOTORS', 'TRANSPORTE', 'PNEUS', 'COMBUSTÍVEIS', 'SCOOTER', 'MOTOCICLETA']):
        return 'Automotivo'
    # Agronegócio
    if any(k in nome for k in ['AGRO', 'FAZENDA', 'RURAL', 'CAFÉ', 'GRANJA', 'PRODUTOR', 'IRRIG', 'GORUTUBA', 'AGRICULTORES', 'FRUTICULTORES', 'CULTIVO', 'CEREALISTA']):
        return 'Agronegócio'
    # Outros Setores (Indústria)
    if any(k in nome for k in ['FÁBRICA', 'INDÚSTRIA', 'GRÁFICA', 'MARCENARIA', 'MINERACAO', 'MINERAÇÃO', 'AÇO', 'ESTOFADOS', 'COLCHOES', 'EMBALAGENS', 'CONFECCOES', 'CERAMICA']):
        return 'Indústria'
    # Educação
    if any(k in nome for k in ['ESCOLA', 'EDUCAÇÃO', 'ENSINO', 'FACULDADE', 'COLEGIO', 'COLÉGIO', 'ARCO IRIS', 'EDUCACIONAL']):
        return 'Educação'
    # Serviços / Terceiro Setor
    if any(k in nome for k in ['SERVIÇOS', 'CONSULTORIA', 'SOLUÇÕES', 'ASSESSORIA', 'ASSOCIAÇÃO', 'ASILO', 'ABME', 'APAE', 'FILANTRÓPICA', 'ONG', 'SINDICATO', 'SANTÁRIO', 'FUNDAÇÃO', 'PAULA ELIZABETE', 'SOCIAL', 'CONDOMINIO', 'CONDOMÍNIO', 'CONTABIL', 'CONTADORA', 'ADVOCACIA', 'STAINLESS', 'FUNERARIA', 'RESGATE', 'CENTRAL DE GESTAO', 'PARTNERS']):
        return 'Serviços'
    if any(k in nome for k in ['LOGÍSTICA', 'FRETE', 'CARG', 'MUDANÇA']):
        return 'Transporte / Logística'
    if any(k in nome for k in ['HOTEL', 'POUSADA', 'PALACE']):
        return 'Hotelaria / Gastronomia'
        
    return 'Outros / Não Informado'

def load_cnpj_cache():
    cache_path = 'processed_csvs/cnpj_cache.json'
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def auto_segmentar(nome):
    """Lógica agressiva de auto-segmentação por palavras-chave no nome."""
    nome = str(nome).upper()
    
    # Setor Público
    if any(k in nome for k in ['MUNICIPIO', 'MUNICÍPIO', 'PREFEITURA', 'CÂMARA', 'CONSORCIO', 'CONVÊNIA', 'PÚBLICO', 'GABINETE', 'ÓRGÃO', 'SECRETARIA']):
        return 'Setor Público'
    # Saúde
    if any(k in nome for k in ['CLÍNICA', 'HOSPITAL', 'MÉDICO', 'ODONTO', 'SAÚDE', 'DROGARIA', 'FARMÁCIA', 'ULTRA', 'LABORATÓRIO', 'FISIO', 'CIRURGIA', 'CARDIOPULMONAR', 'BUCOMAXILO', 'CAPILAR', 'IMAGEM', 'OFTALMO', 'CHECK UP', 'VITALLE', 'DIAGNOSTIC', 'DIAGNÓSTIC', 'ECO SOM', 'EMEPSI']):
        return 'Saúde'
    # Alimentação / Bebidas
    if any(k in nome for k in ['SORVETES', 'CEREAIS', 'PESCADOS', 'LATICÍNIOS', 'PADARIA', 'LANCHONETE', 'RESTAURANTE', 'CONFEITARIA', 'BUFFET', 'AÇOUGUE', 'DISTRIBUIDORA DE BEBIDAS', 'FRUTAS', 'ALIMENTOS', 'PANIFICAÇÃO', 'PAES E CARNES']):
        return 'Hotelaria / Gastronomia' if 'RESTAURANTE' in nome or 'HOTEL' in nome else 'Indústria / Alimentos'
    # Construção / Energia
    if any(k in nome for k in ['CONSTRUTORA', 'ENGENHARIA', 'OBRAS', 'REFORMA', 'EMPREENDIMENTOS', 'PEDRAS', 'CERÂMICA', 'TIJOLOS', 'CONSTRUMINAS', 'SOLARES', 'INCORPORAÇÃO', 'SPE LTDA', 'CFCON', 'EDIFICACOES']):
        return 'Construção Civil'
    # Varejo
    if any(k in nome for k in ['SUPERMERCADO', 'COMÉRCIO', 'LOJA', 'VAREJO', 'MAGAZINE', 'CALÇADOS', 'VESTUÁRIO', 'MOVEIS', 'MÓVEIS', 'PAPELARIA', 'LOTÉRICA', 'PONTO DA SORTE', 'BOUTIQUE', 'MODA', 'COSMETICOS', 'PERFUMARIA', 'ELETRO', 'ZENITH', 'VENDAS']):
        return 'Varejo'
    # Automotivo
    if any(k in nome for k in ['AUTO', 'POSTO', 'PEÇAS', 'MECÂNICA', 'VEÍCULOS', 'MOTORS', 'TRANSPORTE', 'PNEUS', 'COMBUSTÍVEIS', 'SCOOTER', 'MOTOCICLETA']):
        return 'Automotivo'
    # Agronegócio
    if any(k in nome for k in ['AGRO', 'FAZENDA', 'RURAL', 'CAFÉ', 'GRANJA', 'PRODUTOR', 'IRRIG', 'GORUTUBA', 'AGRICULTORES', 'FRUTICULTORES', 'CULTIVO', 'CEREALISTA']):
        return 'Agronegócio'
    # Outros Setores (Indústria)
    if any(k in nome for k in ['FÁBRICA', 'INDÚSTRIA', 'GRÁFICA', 'MARCENARIA', 'MINERACAO', 'MINERAÇÃO', 'AÇO', 'ESTOFADOS', 'COLCHOES', 'EMBALAGENS', 'CONFECCOES', 'CERAMICA']):
        return 'Indústria'
    # Educação
    if any(k in nome for k in ['ESCOLA', 'EDUCAÇÃO', 'ENSINO', 'FACULDADE', 'COLEGIO', 'COLÉGIO', 'ARCO IRIS', 'EDUCACIONAL']):
        return 'Educação'
    # Serviços / Terceiro Setor
    if any(k in nome for k in ['SERVIÇOS', 'CONSULTORIA', 'SOLUÇÕES', 'ASSESSORIA', 'ASSOCIAÇÃO', 'ASILO', 'ABME', 'APAE', 'FILANTRÓPICA', 'ONG', 'SINDICATO', 'SANTÁRIO', 'FUNDAÇÃO', 'PAULA ELIZABETE', 'SOCIAL', 'CONDOMINIO', 'CONDOMÍNIO', 'CONTABIL', 'CONTADORA', 'ADVOCACIA', 'STAINLESS', 'FUNERARIA', 'RESGATE', 'CENTRAL DE GESTAO', 'PARTNERS']):
        return 'Serviços'
    if any(k in nome for k in ['LOGÍSTICA', 'FRETE', 'CARG', 'MUDANÇA']):
        return 'Transporte / Logística'
    if any(k in nome for k in ['HOTEL', 'POUSADA', 'PALACE']):
        return 'Hotelaria / Gastronomia'
        
    return 'Outros / Não Informado'

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
    seg_col = find_segmento_column(df)
    
    # Carregar cache de CNPJs para segmentação precisa
    cnpj_cache = load_cnpj_cache()
    
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
    
    # Segmento com prioridade para Cache de CNPJ -> SEGMENTO oficial -> Auto-segmentação
    segments = []
    for idx, row in df.iterrows():
        # 1. Tentar por Cache de CNPJ (CNAE)
        cc = clean_cnpj(row[cnpj_col]) if cnpj_col else None
        if cc and cc in cnpj_cache:
            segments.append(map_cnae_to_segment(cnpj_cache[cc]))
            continue
            
        # 2. Tentar por coluna oficial se existir
        if seg_col and not pd.isna(row[seg_col]):
            segments.append(str(row[seg_col]).strip())
            continue
            
        # 3. Fallback: Auto-segmentar pelo nome
        segments.append(auto_segmentar(row[name_col]))
    
    df_out['SEGMENTO'] = segments
    
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
    
    df_out['valor_fixo'] = df_out['valor_fixo'].fillna(0)
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
    
    # No processamento especial, aplicar a mesma lógica de prioridade
    cnpj_cache = load_cnpj_cache()
    segments = []
    for _, row in df_out.iterrows():
        cc = clean_cnpj(row['CNPJ'])
        if cc and cc in cnpj_cache:
            segments.append(map_cnae_to_segment(cnpj_cache[cc]))
        else:
            segments.append(auto_segmentar(row['CLIENTE']))
    df_out['SEGMENTO'] = segments
    
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
    
    df_out['valor_fixo'] = df_out['valor_fixo'].fillna(0)
    df_out = df_out[df_out['CLIENTE'].astype(str).str.strip() != '']
    df_out = df_out[df_out['CLIENTE'] != '']
    return df_out


def is_special_sheet(df):
    """Detecta se a aba é GRUPOS ou ENTES PÚBLICOS (formato especial)."""
    if df.empty: return False
    first_cell = str(df.iloc[0, 0]).upper().strip() if len(df.columns) > 0 else ''
    return 'GRUPO' in first_cell or 'ENTE' in first_cell


def main():
    file_path = os.path.join(os.path.dirname(__file__), 'processed_csvs', 'PLANILHA DE CONTRATOS ATIVOS.xlsx')
    excel = pd.ExcelFile(file_path)
    out_dir = os.path.join(os.path.dirname(__file__), 'processed_csvs')
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
