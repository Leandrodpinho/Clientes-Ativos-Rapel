# Painel de Gestão de Contratos Ativos

Instruções rápidas para executar o dashboard localmente.

Requisitos
- Python 3.8+ (recomendado 3.10+)

Instalação

1. Instale dependências (use o executável Python do seu sistema):

```powershell
C:/Users/Usuario/AppData/Local/Python/pythoncore-3.14-64/python.exe -m pip install -r requirements.txt
```

2. Verifique que a pasta `processed_csvs/` existe e contém os CSVs gerados pelo script `tratar_honorarios.py`.

Execução

```powershell
C:/Users/Usuario/AppData/Local/Python/pythoncore-3.14-64/python.exe app.py
```

Abra `http://127.0.0.1:8050` no navegador.

Observações
- Os dados originais em `PLANILHA DE CONTRATOS ATIVOS.xlsx` não são modificados — o script gera CSVs em `processed_csvs/`.
- Se quiser que eu gere um pacote Power BI ou um dashboard web mais avançado, posso continuar.
