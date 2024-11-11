import requests
import time

BITRIX_URL = "https://setup.bitrix24.com.br/rest/301/gyer7nrqxonhk609/crm.company.list.json"
BRASILAPI_URL = "https://brasilapi.com.br/api/cnpj/v1/"
DELAY_INCREMENT = 1  # Incremento de delay em segundos

# Função para buscar empresas com paginação e buscar endereço na BrasilAPI
def get_companies_with_address():
    start = 0  # Início da paginação
    all_companies = []  # Lista para armazenar todas as empresas
    delay = 1  # Delay inicial em segundos

    while True:
        params = {
            "order": { "DATE_CREATE": "ASC" },
            "select": [ "ID", "TITLE", "UF_CRM_1701275490640" ],  # Campos necessários
            "start": start,
        }

        # Fazendo a requisição para a API do Bitrix24
        response = requests.post(BITRIX_URL, json=params)

        if response.status_code == 200:
            result = response.json()

            if "error" in result:
                print(f"Erro: {result['error_description']}")
                break
            else:
                companies = result.get("result", [])

                # Processa cada empresa para obter o endereço usando a BrasilAPI
                for company in companies:
                    cnpj = company.get("UF_CRM_1701275490640", "N/A").replace('.', '').replace('/', '').replace('-', '')
                    if cnpj != "N/A":
                        brasilapi_response = requests.get(f"{BRASILAPI_URL}{cnpj}")

                        if brasilapi_response.status_code == 200:
                            address_data = brasilapi_response.json()
                            endereco = f"{address_data['logradouro']} {address_data.get('numero', 'S/N')}, {address_data['municipio']}, Brasil"
                        else:
                            endereco = "Endereço não encontrado"

                        all_companies.append({
                            "razao_social": company.get("TITLE", "N/A"),
                            "cnpj": company.get("UF_CRM_1701275490640", "N/A"),
                            "endereco": endereco,
                        })
                        print(f"Empresa: {company['TITLE']}, CNPJ: {cnpj}, Endereço: {endereco}")

                        # Delay progressivo para evitar limite de requisições
                        time.sleep(delay)
                        delay += DELAY_INCREMENT
                    else:
                        print(f"CNPJ não encontrado para a empresa ID {company['ID']}")

                if "next" in result:
                    start = result["next"]
                else:
                    break
        else:
            print(f"Falha na requisição. Status code: {response.status_code}, Detalhes: {response.text}")
            break

    return all_companies

# Executa a função e busca todas as empresas com endereço completo
all_companies_with_address = get_companies_with_address()
print(f"Total de empresas com endereço completo retornadas: {len(all_companies_with_address)}")
