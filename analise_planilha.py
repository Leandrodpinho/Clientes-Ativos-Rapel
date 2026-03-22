import pandas as pd

# Caminho da planilha
file_path = r'C:\VScode -Le\Gestão Contratos Ativos\PLANILHA DE CONTRATOS ATIVOS.xlsx'

# Carregar todas as abas
excel_file = pd.ExcelFile(file_path)
print('Abas encontradas:', excel_file.sheet_names)

# Exemplo: visualizar as primeiras linhas da aba principal
aba_principal = 'CONTRATOS ATIVOS'
df_principal = pd.read_excel(file_path, sheet_name=aba_principal)
print(df_principal.head())

# Exemplo: visualizar as primeiras linhas de uma filial
aba_filial = excel_file.sheet_names[1]  # Exemplo: primeira filial
print(f'Visualizando a aba: {aba_filial}')
df_filial = pd.read_excel(file_path, sheet_name=aba_filial)
print(df_filial.head())
