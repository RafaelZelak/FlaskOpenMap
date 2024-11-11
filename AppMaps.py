from flask import Flask, jsonify, render_template, request
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderUnavailable
import time
import json
import re
import requests  # Biblioteca necessária para realizar chamadas à API de CEP

app = Flask(__name__)
geolocator = Nominatim(user_agent="geoapi_exercises", timeout=10)

# Função para buscar o endereço completo a partir do CEP
def buscar_endereco_por_cep(cep):
    try:
        response = requests.get(f"https://viacep.com.br/ws/{cep}/json/")
        if response.status_code == 200:
            data = response.json()
            if "erro" not in data:
                return data['logradouro']
        print(f"Endereço não encontrado para o CEP {cep}")
    except Exception as e:
        print(f"Erro ao buscar o CEP {cep}: {e}")
    return None

# Função para extrair o CEP e formatar o endereço
def formatar_endereco(endereco):
    match = re.match(r'([^,]+),\s*(\d+)\s*-\s*([^,]+)\s*-\s*([^,]+)\s*-\s*([A-Z]{2}),\s*(\d{5}-\d{3})', endereco)
    if match:
        logradouro_inicial = match.group(1).strip()
        numero = match.group(2).strip()
        bairro = match.group(3).strip()
        cidade = match.group(4).strip()
        estado = match.group(5).strip()
        cep = match.group(6).replace("-", "").strip()

        # Busca o nome correto da rua pelo CEP
        rua_correta = buscar_endereco_por_cep(cep) or logradouro_inicial
        return f"{rua_correta} {numero}, {cidade}, Brasil"
    return endereco

def obter_coordenadas(endereco, tentativas=3, espera=5):
    for tentativa in range(tentativas):
        try:
            location = geolocator.geocode(endereco)
            if location:
                return location.latitude, location.longitude
            else:
                print(f"Endereço '{endereco}' não encontrado.")
                return None, None
        except GeocoderUnavailable:
            print(f"Nominatim indisponível, tentativa {tentativa + 1}/{tentativas}")
            time.sleep(espera)
    print("Falha ao obter coordenadas após várias tentativas.")
    return None, None

# Processa os dados do arquivo JSON
def carregar_empresas():
    with open('empresas.json', 'r', encoding='utf-8') as file:
        return json.load(file)

empresas = carregar_empresas()

@app.route('/')
def index():
    return render_template('indexMaps.html')

@app.route('/api/empresas/total')
def total_empresas():
    return jsonify(total=len(empresas))

@app.route('/api/empresa')
def empresa():
    index = int(request.args.get('id', 0))
    if index < len(empresas):
        empresa = empresas[index]
        logradouro = empresa.get("logradouro")
        if logradouro:
            endereco_formatado = formatar_endereco(logradouro)
            latitude, longitude = obter_coordenadas(endereco_formatado)
            if latitude and longitude:
                return jsonify({
                    "nome_fantasia": empresa.get("nome_fantasia", "Nome não disponível"),
                    "endereco": endereco_formatado,
                    "telefone_1": empresa.get("telefone_1", "Telefone não disponível"),
                    "latitude": latitude,
                    "longitude": longitude
                })
    return jsonify({}), 404

if __name__ == '__main__':
    app.run(debug=True)
