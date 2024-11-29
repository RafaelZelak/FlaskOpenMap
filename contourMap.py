from flask import Flask, jsonify, render_template, request
import pandas as pd
import math
import osmnx as ox
from shapely.geometry import Point, Polygon

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

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('indexContour.html')

@app.route('/api/empresas/total')
def total_empresas():
    return jsonify(total=len(empresas))

@app.route('/api/empresa')
def empresa():
    index = int(request.args.get('id', 0))

    if index < len(empresas):
        empresa = empresas[index]
        latitude = empresa.get("latitude")
        longitude = empresa.get("longitude")

        return jsonify({
            "nome_fantasia": empresa.get("nome_fantasia", "Nome não disponível"),
            "endereco": empresa.get("endereco"),
            "cnpj": empresa.get("cnpj", "CNPJ não disponível"),
            "latitude": latitude if latitude is not None else "Não disponível",
            "longitude": longitude if longitude is not None else "Não disponível"
        })

    return jsonify({
        "message": "Empresa não encontrada."
    }), 404

@app.route('/api/empresas/bairro', methods=['GET'])
def empresas_no_bairro():
    cidade = request.args.get('cidade')
    bairro = request.args.get('bairro')

    if not cidade or not bairro:
        return jsonify({"error": "Por favor, forneça 'cidade' e 'bairro' como parâmetros na URL."}), 400

    try:
        # Obter contorno do bairro
        localizacao = f"{bairro}, {cidade}"
        gdf = ox.geocode_to_gdf(localizacao)

        if gdf.empty:
            return jsonify({"error": f"Nenhum resultado encontrado para {localizacao}."}), 404

        geometry = gdf.iloc[0].geometry
        if geometry.geom_type not in ['Polygon', 'MultiPolygon']:
            return jsonify({"error": f"A geometria para {localizacao} não é um polígono válido."}), 400

        polygon = Polygon(geometry.exterior.coords)

        # Filtrar empresas dentro do polígono
        empresas_no_bairro = [
            empresa for empresa in empresas
            if empresa['latitude'] and empresa['longitude'] and polygon.contains(Point(empresa['longitude'], empresa['latitude']))
        ]

        return jsonify(empresas_no_bairro)
    except Exception as e:
        return jsonify({"error": f"Ocorreu um erro: {str(e)}"}), 500

@app.route('/api/empresas')
def listar_empresas():
    global empresas
    return jsonify(empresas)

@app.route('/get-contour', methods=['GET'])
def get_contour():
    cidade = request.args.get('cidade')
    bairro = request.args.get('bairro')

    if not cidade or not bairro:
        return jsonify({"error": "Por favor, forneça 'cidade' e 'bairro' como parâmetros na URL."}), 400

    try:
        localizacao = f"{bairro}, {cidade}"
        gdf = ox.geocode_to_gdf(localizacao)

        if gdf.empty:
            return jsonify({"error": f"Nenhum resultado encontrado para {localizacao}."}), 404

        geometry = gdf.iloc[0].geometry
        if geometry.geom_type not in ['Polygon', 'MultiPolygon']:
            return jsonify({"error": f"A geometria para {localizacao} não é um polígono válido."}), 400

        coordenadas = list(geometry.exterior.coords)

        return jsonify({"bairro": bairro, "cidade": cidade, "coordenadas": coordenadas})
    except Exception as e:
        return jsonify({"error": f"Ocorreu um erro: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)