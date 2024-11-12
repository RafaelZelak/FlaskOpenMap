import requests
import json

# URL base da API do Bitrix para o método crm.lead.list (substitua com a URL gerada no seu Bitrix)
BITRIX_CRM_API_URL = "https://setup.bitrix24.com.br/rest/301/qpxysdxpw2x9l9j5/crm.lead.list.json"

# Função para buscar a lista de leads com filtros, ordenação e seleção de campos específicos
def get_crm_lead_list():
    # Parâmetros da requisição para listar leads com filtro, ordenação e seleção de campos específicos
    params = {
        "order": {"STATUS_ID": "ASC"},                   # Ordenação por status em ordem crescente
        "select": ["ID", "TITLE", "UF_CRM_1729682242372", "UF_CRM_1729682188409", "UF_CRM_1729682208297"]  # Campos específicos para endereço, razão social e CNPJ
    }

    # Fazendo a requisição para a API do Bitrix24
    response = requests.post(BITRIX_CRM_API_URL, json=params)

    # Verificando se houve sucesso na requisição
    if response.status_code == 200:
        result = response.json()

        # Verifica se há um erro nos dados retornados
        if "error" in result:
            print(f"Erro: {result['error_description']}")
        else:
            leads = result.get("result", [])

            # Exibe os dados dos leads filtrados por "Via Automação"
            print("Lista de leads filtrados com 'Via Automação':")
            for lead in leads:
                lead_id = lead.get("ID")

                # Nome da empresa, usando 'TITLE' ou 'UF_CRM_1729682188409' se for customizado
                company_name = lead.get("TITLE") or lead.get("UF_CRM_1729682188409")

                # Filtra apenas leads que possuem "Via Automação" no nome da empresa
                if company_name and "Via Automação" in company_name:
                    # CNPJ e Endereço usando IDs personalizados
                    cnpj = lead.get("UF_CRM_1729682208297")         # CNPJ
                    endereco = lead.get("UF_CRM_1729682242372")     # Endereço
                    print(f"ID: {lead_id}, Nome da Empresa: {company_name}, CNPJ: {cnpj}, Endereço: {endereco}")

            # Paginação para obter mais resultados, se houver
            start = result.get("next", None)
            while start:
                params["start"] = start
                response = requests.post(BITRIX_CRM_API_URL, json=params)
                if response.status_code == 200:
                    result = response.json()
                    leads = result.get("result", [])

                    for lead in leads:
                        lead_id = lead.get("ID")
                        company_name = lead.get("TITLE") or lead.get("UF_CRM_1729682188409")

                        if company_name and "Via Automação" in company_name:
                            cnpj = lead.get("UF_CRM_1729682208297")
                            endereco = lead.get("UF_CRM_1729682242372")
                            print(f"ID: {lead_id}, Nome da Empresa: {company_name}, CNPJ: {cnpj}, Endereço: {endereco}")

                    start = result.get("next", None)
                else:
                    print(f"Falha na requisição de página adicional. Status code: {response.status_code}, Detalhes: {response.text}")
                    break
    else:
        print(f"Falha na requisição inicial. Status code: {response.status_code}, Detalhes: {response.text}")

# Executa a função para buscar leads com os parâmetros definidos
get_crm_lead_list()
