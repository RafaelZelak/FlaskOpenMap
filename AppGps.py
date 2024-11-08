from flask import Flask, jsonify, render_template
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut
import json
import re

app = Flask(__name__)

# Inicializa o geolocalizador
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

# Função para obter coordenadas
def obter_coordenadas(endereco):
    try:
        location = geolocator.geocode(endereco)
        if location:
            return location.latitude, location.longitude
    except GeocoderTimedOut:
        print(f"Geocodificação para '{endereco}' falhou.")
    return None, None

# Processa os dados do arquivo JSON
def processar_empresas():
    with open('empresas.json', 'r', encoding='utf-8') as file:
        empresas = json.load(file)

    resultados = []
    for empresa in empresas:
        logradouro = empresa.get("logradouro")
        if logradouro:
            endereco_formatado = formatar_endereco(logradouro)
            latitude, longitude = obter_coordenadas(endereco_formatado)
            if latitude and longitude:
                resultados.append({
                    "nome_fantasia": empresa.get("nome_fantasia", "Nome não disponível"),
                    "endereco": logradouro,
                    "telefone_1": empresa.get("telefone_1", "Telefone não disponível"),
                    "latitude": latitude,
                    "longitude": longitude
                })
    return resultados

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/empresas')
def empresas():
    return jsonify(processar_empresas())

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5001)
