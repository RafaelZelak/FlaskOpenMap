from flask import Flask, jsonify, render_template, request
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderUnavailable
import time
import csv  # Necessário para manipular CSV

app = Flask(__name__)
geolocator = Nominatim(user_agent="geoapi_exercises", timeout=10)

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

# Função para carregar dados do CSV
def carregar_empresas():
    empresas = []
    with open('./data/empresas.csv', newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            empresas.append({
                "razao_social": row.get("razao_social"),
                "cnpj": row.get("cnpj"),
                "nome_fantasia": row.get("razao_social"),  # Caso não tenha um campo específico de nome fantasia
                "logradouro": row.get("endereco")
            })
    return empresas

empresas = carregar_empresas()

# Contadores de sucesso e falha
total_processadas = 0
total_sucesso = 0
total_falha = 0

@app.route('/')
def index():
    return render_template('indexMaps.html')

@app.route('/api/empresas/total')
def total_empresas():
    return jsonify(total=len(empresas))

@app.route('/api/empresa')
def empresa():
    global total_processadas, total_sucesso, total_falha
    index = int(request.args.get('id', 0))
    total_processadas += 1

    if index < len(empresas):
        empresa = empresas[index]
        logradouro = empresa.get("logradouro")
        if logradouro:
            latitude, longitude = obter_coordenadas(logradouro)
            if latitude and longitude:
                total_sucesso += 1
            else:
                total_falha += 1
        else:
            total_falha += 1

        # Calcular porcentagens de sucesso e falha
        porcentagem_sucesso = (total_sucesso / total_processadas) * 100
        porcentagem_falha = (total_falha / total_processadas) * 100

        return jsonify({
            "nome_fantasia": empresa.get("nome_fantasia", "Nome não disponível"),
            "endereco": logradouro,
            "cnpj": empresa.get("cnpj", "CNPJ não disponível"),
            "latitude": latitude if latitude else "Não disponível",
            "longitude": longitude if longitude else "Não disponível",
            "percentual_sucesso": f"{porcentagem_sucesso:.2f}%",
            "percentual_falha": f"{porcentagem_falha:.2f}%"
        })

    return jsonify({
        "message": "Empresa não encontrada.",
        "percentual_sucesso": f"{(total_sucesso / total_processadas) * 100:.2f}%",
        "percentual_falha": f"{(total_falha / total_processadas) * 100:.2f}%"
    }), 404

if __name__ == '__main__':
    app.run(debug=True)
