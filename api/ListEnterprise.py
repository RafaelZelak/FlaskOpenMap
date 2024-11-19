import pandas as pd
import requests
import csv  # Importação do módulo csv para uso de QUOTE_MINIMAL
import time

# Caminho do arquivo CSV
csv_path = "data/empresas.csv"

# URL da API do Bitrix24
bitrix_url = "https://setup.bitrix24.com.br/rest/301/gyer7nrqxonhk609/crm.company.list.json"

# Dicionário com as opções do campo
opcoes_campo = {
    233: "Acessórias",
    235: "Acessórias + KOMUNIC",
    237: "Sittax",
    655: "Sittax / Acessórias",
    699: "Sittax / Acessórias + KOMUNIC",
    701: "Best Doctor"
}

# Lê o arquivo CSV completo
df = pd.read_csv(csv_path)

# Se a coluna "empresas" não existir, crie uma coluna vazia
if 'empresas' not in df.columns:
    df['empresas'] = ""

# Função para buscar o valor UF_CRM_1708446996746 no Bitrix com tentativas crescentes
def buscar_valor_bitrix(razao_social):
    payload = {
        "filter[TITLE]": razao_social,
        "select[]": ["UF_CRM_1708446996746"]
    }
    tentativas = 0

    while True:
        try:
            response = requests.get(bitrix_url, params=payload)

            # Checa o status da resposta
            if response.status_code == 200:
                data = response.json()

                # Verifica se a resposta contém dados
                if data.get("result"):
                    # Converte o valor retornado para inteiro antes de procurar no dicionário
                    try:
                        campo_valor = data["result"][0].get("UF_CRM_1708446996746")
                        if campo_valor is not None:
                            try:
                                codigo = int(campo_valor)
                                return opcoes_campo.get(codigo, "N/A")
                            except ValueError:
                                return "N/A"
                        else:
                            return "N/A"
                    except ValueError:
                        return "N/A"
                else:
                    return "Não encontrado"

            elif response.status_code == 503:  # Erro de serviço indisponível
                print(f"Erro 503: Serviço indisponível para {razao_social}. Tentando novamente em {2 ** tentativas} segundos...")
                time.sleep(2 ** tentativas)  # Tempo de espera crescente
                tentativas += 1
                if tentativas > 5:  # Limite de tentativas
                    return f"Erro: {response.status_code}"

            else:
                return f"Erro: {response.status_code}"

        except requests.RequestException as e:
            print(f"Erro de requisição para {razao_social}: {e}")
            return "Erro de conexão"

# Itera sobre as empresas, busca o valor no Bitrix e atualiza o CSV em tempo real
for index, row in df.iterrows():
    # Se o valor da coluna "empresas" já está preenchido e pertence às opções, ignora
    if row['empresas'] in opcoes_campo.values():
        print(f"Linha {index + 1} - Razão Social: {row['razao_social']} - Ignorado (já preenchido)")
        continue

    razao_social = row['razao_social'].strip()  # Remove espaços extras
    valor = buscar_valor_bitrix(razao_social)

    # Atualiza a coluna "empresas" no DataFrame sem aspas adicionais
    df.at[index, 'empresas'] = valor

    # Log da atualização
    print(f"Linha {index + 1} - Razão Social: {razao_social} - Empresas: {valor}")

    # Salva as alterações no CSV após cada atualização
    df.to_csv(csv_path, index=False, quotechar='"', quoting=csv.QUOTE_MINIMAL)

print("CSV atualizado em tempo real com sucesso!")
