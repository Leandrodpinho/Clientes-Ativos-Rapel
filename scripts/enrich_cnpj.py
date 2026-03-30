import pandas as pd
import json
import time
import requests
import os

CSV_PATH = 'processed_csvs/CONTRATOS ATIVOS.csv'
CACHE_PATH = 'processed_csvs/cnpj_cache.json'

def load_cache():
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_cache(cache):
    with open(CACHE_PATH, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def clean_cnpj(val):
    if not val or pd.isna(val): return None
    s = str(val).replace('.', '').replace('-', '').replace('/', '').strip()
    return s if len(s) == 14 else None

def fetch_cnpj_info(cnpj):
    url = f"https://brasilapi.com.br/api/cnpj/v1/{cnpj}"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get('cnae_fiscal_descricao', 'Não Identificado')
        elif response.status_code == 404:
            return 'Não Encontrado'
        elif response.status_code == 429:
            print("Rate limit atingido. Aguardando 10 segundos...")
            time.sleep(10)
            return None
    except Exception as e:
        print(f"Erro ao consultar {cnpj}: {e}")
    return None

def main():
    if not os.path.exists(CSV_PATH):
        print(f"Arquivo {CSV_PATH} não encontrado.")
        return

    df = pd.read_csv(CSV_PATH)
    cnpjs = df['CNPJ'].apply(clean_cnpj).dropna().unique()
    
    cache = load_cache()
    to_fetch = [c for c in cnpjs if c not in cache]
    
    print(f"Total de CNPJs únicos: {len(cnpjs)}")
    print(f"Já em cache: {len(cnpjs) - len(to_fetch)}")
    print(f"Para buscar agora: {len(to_fetch)}")

    count = 0
    for cnpj in to_fetch:
        print(f"[{count+1}/{len(to_fetch)}] Consultando {cnpj}...")
        cnae = fetch_cnpj_info(cnpj)
        
        if cnae:
            cache[cnpj] = cnae
            count += 1
            # Salvar a cada 10 para não perder progresso
            if count % 10 == 0:
                save_cache(cache)
        
        # Pequeno delay para respeitar a API
        time.sleep(0.5)

    save_cache(cache)
    print(f"\nSucesso! {count} novos CNPJs processados.")

if __name__ == '__main__':
    main()
