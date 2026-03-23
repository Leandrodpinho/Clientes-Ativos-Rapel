export interface ContractData {
  __sheet: string;
  ESTADO: string;
  UNIDADE: string;
  CLIENTE: string;
  NOME_FANTASIA: string;
  CNPJ: string;
  CPF: string;
  CIDADE: string;
  INICIO: string;
  valor_fixo: number;
  limite_func: number;
  valor_por_func_acima: number;
  reajuste_percent: number;
  reajuste_text: string;
  [key: string]: any;
}
