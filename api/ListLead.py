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

            # Exibe os dados dos leads que contêm "Via Automação" no nome
            print("Lista completa de leads com 'Via Automação' no nome da empresa:")
            for lead in leads:
                lead_id = lead.get("ID")
                company_name = lead.get("TITLE") or lead.get("UF_CRM_1729682188409")

                # Verifica se o nome da empresa contém "Via Automação"
                if company_name and "Via Automação" in company_name:
                    # Mostra todos os dados do lead para diagnóstico
                    print(f"\nLead ID: {lead_id}")
                    print(json.dumps(lead, indent=4, ensure_ascii=False))  # Mostra todo o conteúdo JSON do lead

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
                            print(f"\nLead ID: {lead_id}")
                            print(json.dumps(lead, indent=4, ensure_ascii=False))

                    start = result.get("next", None)
                else:
                    print(f"Falha na requisição de página adicional. Status code: {response.status_code}, Detalhes: {response.text}")
                    break
    else:
        print(f"Falha na requisição inicial. Status code: {response.status_code}, Detalhes: {response.text}")

# Executa a função para buscar leads com os parâmetros definidos
get_crm_lead_list()
