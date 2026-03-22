import os
import glob
import pandas as pd
from textwrap import dedent

import dash
from dash import dcc, html, Input, Output
import plotly.express as px


DATA_DIR = os.path.join(os.path.dirname(__file__), 'processed_csvs')


def load_data():
    files = glob.glob(os.path.join(DATA_DIR, '*.csv'))
    if not files:
        return pd.DataFrame()
    dfs = []
    for f in files:
        try:
            df = pd.read_csv(f, encoding='utf-8-sig')
            df['__sheet'] = os.path.splitext(os.path.basename(f))[0]
            dfs.append(df)
        except Exception:
            continue
    if not dfs:
        return pd.DataFrame()
    return pd.concat(dfs, ignore_index=True)


df = load_data()

app = dash.Dash(__name__, title='Painel - Gestão Contratos Ativos')

app.layout = html.Div(
    className='page',
    children=[
        html.Div(className='header', children=[
            html.H1('Rapel Consultoria — Gestão Contratos Ativos'),
            html.Div('Painel analítico — cores Rapel (vermelho / branco)')
        ]),

        html.Div(className='controls', children=[
            html.Div([html.Label('Filtrar por aba'),
                      dcc.Dropdown(id='sheet-filter', options=[{'label': s, 'value': s} for s in sorted(df['__sheet'].unique())], multi=False, placeholder='Todas', value=None)]),
            html.Div([html.Label('Filtrar por estado'),
                      dcc.Dropdown(id='estado-filter', options=[{'label': s, 'value': s} for s in sorted(df['ESTADO'].dropna().unique())], multi=False, placeholder='Todos', value=None)]),
        ]),

        html.Div(className='kpis', children=[
            html.Div(id='kpi-contratos', className='kpi'),
            html.Div(id='kpi-valor', className='kpi'),
            html.Div(id='kpi-media', className='kpi'),
        ]),

        html.Div(className='charts', children=[
            dcc.Graph(id='bar-unidade'),
            dcc.Graph(id='pie-estado')
        ])
    ]
)


@app.callback(
    Output('kpi-contratos', 'children'),
    Output('kpi-valor', 'children'),
    Output('kpi-media', 'children'),
    Output('bar-unidade', 'figure'),
    Output('pie-estado', 'figure'),
    Input('sheet-filter', 'value'),
    Input('estado-filter', 'value')
)
def update(sheet, estado):
    d = df.copy()
    if sheet:
        d = d[d['__sheet'] == sheet]
    if estado:
        d = d[d['ESTADO'] == estado]

    total_contratos = len(d)
    soma_valor = d['valor_fixo'].sum(skipna=True) if 'valor_fixo' in d.columns else 0
    media_valor = d['valor_fixo'].mean(skipna=True) if 'valor_fixo' in d.columns else 0

    k1 = html.Div([html.H3('Contratos'), html.P(f'{total_contratos}')])
    k2 = html.Div([html.H3('Soma honorários (R$)'), html.P(f'{soma_valor:,.2f}')])
    k3 = html.Div([html.H3('Média honorários (R$)'), html.P(f'{(media_valor or 0):,.2f}')])

    if 'UNIDADE' in d.columns:
        bar = px.bar(d.groupby('UNIDADE', as_index=False)['valor_fixo'].sum().sort_values('valor_fixo', ascending=False), x='UNIDADE', y='valor_fixo', title='Valor por UNIDADE', labels={'valor_fixo': 'R$'})
    else:
        bar = px.bar(title='Valor por UNIDADE (dados ausentes)')

    if 'ESTADO' in d.columns:
        pie = px.pie(d, names='ESTADO', title='Distribuição por Estado')
    else:
        pie = px.pie(values=[1], names=['Sem dados'], title='Distribuição por Estado (dados ausentes)')

    # aplicar tema rápido (cores Rapel)
    bar.update_layout(plot_bgcolor='white', paper_bgcolor='white', font_color='#b30000')
    pie.update_layout(font_color='#b30000')

    return k1, k2, k3, bar, pie


if __name__ == '__main__':
    app.run(debug=True, port=8050)
