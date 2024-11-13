import requests
import time
import csv
import os
from geopy.geocoders import Nominatim
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BITRIX_URL = "https://setup.bitrix24.com.br/rest/301/gyer7nrqxonhk609/crm.company.list.json"
BRASILAPI_URL = "https://brasilapi.com.br/api/cnpj/v1/"
DELAY_INCREMENT = 0

geolocator = Nominatim(user_agent="MeuProjetoGeoAPI - Rafael Zelak", timeout=10)

def create_session_with_retry():
    session = requests.Session()
    retry = Retry(
        total=5,  # Número máximo de re-tentativas
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

def save_companies_to_csv(companies, filename="data/empresas.csv"):
    existing_cnpjs = set()
    if os.path.isfile(filename):
        with open(filename, mode='r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            existing_cnpjs = {row["cnpj"] for row in reader}

    new_companies = [company for company in companies if company.get("cnpj", "N/A") not in existing_cnpjs]
    if not new_companies:
        print("Nenhum novo registro para salvar.")
        return

    with open(filename, mode='a', newline='', encoding='utf-8') as csvfile:
        fieldnames = ["razao_social", "cnpj", "endereco", "coord"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not existing_cnpjs:
            writer.writeheader()

        for company in new_companies:
            endereco = company.get("endereco", "N/A")
            try:
                location = geolocator.geocode(endereco, timeout=10)
                coord = [location.latitude, location.longitude] if location else ["N/A", "N/A"]
            except Exception as e:
                coord = ["N/A", "N/A"]
                print(f"Erro ao obter coordenadas para {endereco}: {e}")

            writer.writerow({
                "razao_social": company.get("razao_social", "N/A"),
                "cnpj": company.get("cnpj", "N/A"),
                "endereco": endereco,
                "coord": coord
            })
    print(f"{len(new_companies)} novo(s) registro(s) salvo(s).")

def exponential_backoff_retry_request(url, session, max_attempts=5):
    attempt = 1
    while attempt <= max_attempts:
        try:
            response = session.get(url)
            if response.status_code == 200:
                return response
        except requests.exceptions.RequestException as e:
            print(f"Erro ao tentar conexão. Tentativa {attempt}: {str(e)}")

        delay = attempt ** 2
        print(f"Aguardando {delay} segundos para nova tentativa.")
        time.sleep(delay)
        attempt += 1
    print("Erro persistente após múltiplas tentativas. Verifique a conexão com a API.")
    return None

def get_companies_with_address():
    session = create_session_with_retry()
    start = 0
    all_companies = []
    companies_without_cnpj = []
    delay = 1

    while True:
        params = {
            "order": { "DATE_CREATE": "ASC" },
            "select": [ "ID", "TITLE", "UF_CRM_1701275490640" ],
            "start": start,
        }
        response = requests.post(BITRIX_URL, json=params)
        if response.status_code == 200:
            result = response.json()
            if "error" in result:
                print(f"Erro: {result['error_description']}")
                break
            else:
                companies = result.get("result", [])
                for company in companies:
                    cnpj = company.get("UF_CRM_1701275490640")
                    if cnpj:
                        cnpj = cnpj.replace('.', '').replace('/', '').replace('-', '')
                        brasilapi_url = f"{BRASILAPI_URL}{cnpj}"
                        brasilapi_response = exponential_backoff_retry_request(brasilapi_url, session)

                        if brasilapi_response and brasilapi_response.status_code == 200:
                            address_data = brasilapi_response.json()
                            endereco = f"{address_data['logradouro']} {address_data.get('numero', 'S/N')}, {address_data['municipio']}, Brasil"
                        else:
                            endereco = "Endereço não encontrado"

                        all_companies.append({
                            "razao_social": company.get("TITLE", "N/A"),
                            "cnpj": company.get("UF_CRM_1701275490640", "N/A"),
                            "endereco": endereco,
                        })
                        save_companies_to_csv(all_companies)
                        time.sleep(delay)
                        delay += DELAY_INCREMENT
                    else:
                        company_link = f"https://setup.bitrix24.com.br/crm/company/details/{company['ID']}/"
                        companies_without_cnpj.append({
                            "razao_social": company.get("TITLE", "N/A"),
                            "link": company_link,
                        })
                        print(f"CNPJ não encontrado para a empresa ID {company['ID']}. Link: {company_link}")

                if "next" in result:
                    start = result["next"]
                else:
                    break
        else:
            print(f"Falha na requisição. Status code: {response.status_code}, Detalhes: {response.text}")
            break

    return all_companies, companies_without_cnpj

all_companies_with_address, companies_without_cnpj = get_companies_with_address()
print(f"Total de empresas com endereço completo retornadas: {len(all_companies_with_address)}")
print(f"Empresas sem CNPJ e seus links:")
for company in companies_without_cnpj:
    print(f"Empresa: {company['razao_social']}, Link: {company['link']}")
