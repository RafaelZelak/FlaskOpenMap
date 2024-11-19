from flask import Flask, jsonify, render_template, request
import pandas as pd
import math

app = Flask(__name__)

# Função para carregar dados do CSV usando Pandas
def carregar_empresas():
    def converter_coordenadas(coord):
        if coord == "['N/A', 'N/A']":
            return None, None
        try:
            coord = coord.strip("[]").split(",")
            return float(coord[0]), float(coord[1])
        except ValueError:
            return None, None

    df = pd.read_csv('./data/empresas.csv', encoding='utf-8')
    df[['latitude', 'longitude']] = df['coord'].apply(lambda x: pd.Series(converter_coordenadas(x)))
    empresas = df.drop(columns=['coord']).to_dict(orient='records')

    # Remover ou substituir valores inválidos (NaN, None) para evitar erros de JSON
    for empresa in empresas:
        for key, value in empresa.items():
            if isinstance(value, float) and (math.isnan(value) or value is None):
                empresa[key] = None  # Substituir NaN com None
    return empresas

empresas = carregar_empresas()

# Contadores de sucesso e falha
total_processadas = 0
total_sucesso = 0
total_falha = 0

@app.route('/')
def index():
    return render_template('indexMapsPoint.html')

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
        latitude = empresa.get("latitude")
        longitude = empresa.get("longitude")

        # Incrementa contadores de sucesso e falha
        if latitude is not None and longitude is not None:
            total_sucesso += 1
        else:
            total_falha += 1

        # Calcular porcentagens de sucesso e falha
        porcentagem_sucesso = (total_sucesso / total_processadas) * 100
        porcentagem_falha = (total_falha / total_processadas) * 100

        return jsonify({
            "nome_fantasia": empresa.get("nome_fantasia", "Nome não disponível"),
            "endereco": empresa.get("endereco"),
            "cnpj": empresa.get("cnpj", "CNPJ não disponível"),
            "latitude": latitude if latitude is not None else "Não disponível",
            "longitude": longitude if longitude is not None else "Não disponível",
            "percentual_sucesso": f"{porcentagem_sucesso:.2f}%",
            "percentual_falha": f"{porcentagem_falha:.2f}%"
        })

    return jsonify({
        "message": "Empresa não encontrada.",
        "percentual_sucesso": f"{(total_sucesso / total_processadas) * 100:.2f}%",
        "percentual_falha": f"{(total_falha / total_processadas) * 100:.2f}%"
    }), 404

@app.route('/api/empresas')
def listar_empresas():
    global empresas
    return jsonify(empresas)

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5001)
