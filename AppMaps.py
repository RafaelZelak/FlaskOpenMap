from flask import Flask, jsonify, render_template, request
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderUnavailable
import time
import json
import re

app = Flask(__name__)
geolocator = Nominatim(user_agent="geoapi_exercises", timeout=10)

# Função para formatar o endereço
def formatar_endereco(endereco):
    match = re.match(r'([^,]+),.*- (.*) - (..),.*', endereco)
    if match:
        rua = match.group(1).strip()
        cidade = match.group(2).strip()
        estado = match.group(3).strip()
        return f"{rua}, {cidade}, {estado}, Brasil"
    return endereco

def obter_coordenadas(endereco, max_retry=3, delay=5):
    for attempt in range(max_retry):
        try:
            location = geolocator.geocode(endereco)
            if location:
                return location.latitude, location.longitude
            else:
                print(f"Endereço '{endereco}' não encontrado.")
                return None, None
        except GeocoderUnavailable:
            print(f"Tentativa {attempt + 1} falhou. Tentando novamente em {delay} segundos...")
            time.sleep(delay * (attempt + 1))  # Delay progressivo

    print("Não foi possível conectar ao geocodificador após várias tentativas.")
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
                    "endereco": logradouro,
                    "telefone_1": empresa.get("telefone_1", "Telefone não disponível"),
                    "latitude": latitude,
                    "longitude": longitude
                })
    return jsonify({}), 404

if __name__ == '__main__':
    app.run(debug=True)
