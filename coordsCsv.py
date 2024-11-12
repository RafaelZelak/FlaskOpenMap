import csv
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderUnavailable

# Caminho do arquivo CSV
file_path = 'data/empresas.csv'

# Inicializa o geolocalizador
geolocator = Nominatim(user_agent="MeuProjetoGeoAPI - Rafael Zelak", timeout=10)

# Função para obter as coordenadas a partir do endereço
def get_coordinates_from_address(address):
    try:
        location = geolocator.geocode(address)
        if location:
            return f"{location.latitude},{location.longitude}"
        else:
            return None
    except GeocoderUnavailable:
        print("Erro: O serviço de geolocalização está indisponível.")
        return None

# Lê o arquivo CSV e modifica as coordenadas progressivamente
with open(file_path, mode='r', newline='', encoding='utf-8') as file:
    reader = list(csv.DictReader(file))
    fieldnames = reader[0].keys()

    # Cria uma lista para armazenar as linhas modificadas
    updated_rows = []

    # Processa todas as linhas
    for i, row in enumerate(reader):
        endereco = row['endereco']
        print(f"Processando linha {i+1}: {endereco}")  # Log de progresso

        coordenadas = get_coordinates_from_address(endereco)

        if coordenadas:
            row['coord'] = coordenadas
            print(f"Coordenadas encontradas para {endereco}: {coordenadas}")
        else:
            row['coord'] = 'Coordenadas não encontradas'
            print(f"Coordenadas não encontradas para {endereco}")

        updated_rows.append(row)

# Abre o arquivo para escrever as modificações, mantendo as linhas existentes
with open(file_path, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.DictWriter(file, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(updated_rows)

print("As coordenadas foram atualizadas nas linhas do arquivo.")
