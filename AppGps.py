from flask import Flask, jsonify, render_template, request
import csv
import ast

app = Flask(__name__)

# Função para processar o arquivo CSV
def processar_empresas_csv():
    resultados = []
    with open('data/empresas.csv', 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            try:
                coordenadas = ast.literal_eval(row["coord"])  # Converte string para lista de coordenadas
                # Filtra coordenadas inválidas como None, "N/A", ou coordenadas não numéricas
                if (
                    isinstance(coordenadas, list) and len(coordenadas) == 2 and
                    coordenadas[0] not in [None, "N/A", "null", "None"] and
                    coordenadas[1] not in [None, "N/A", "null", "None"]
                ):
                    latitude, longitude = float(coordenadas[0]), float(coordenadas[1])
                    resultados.append({
                        "razao_social": row.get("razao_social", "Razão Social não disponível"),
                        "cnpj": row.get("cnpj", "CNPJ não disponível"),
                        "endereco": row.get("endereco", "Endereço não disponível"),
                        "latitude": latitude,
                        "longitude": longitude
                    })
            except (ValueError, SyntaxError, KeyError, TypeError):
                # Ignora empresas sem coordenadas válidas
                continue
    return resultados

@app.route('/')
def index():
    return render_template('indexGps.html')

@app.route('/api/empresas/lista')
def listar_empresas():
    empresas = processar_empresas_csv()
    return jsonify(empresas)

@app.route('/api/empresas')
def empresas():
    empresa1 = request.args.get('empresa1')
    empresa2 = request.args.get('empresa2')

    with open('data/empresas.csv', 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        empresas = list(reader)

    # Filtra as empresas com base no nome ou CNPJ
    selecionadas = [
        empresa for empresa in empresas
        if empresa1 in (empresa['razao_social'], empresa['cnpj']) or
           empresa2 in (empresa['razao_social'], empresa['cnpj'])
    ]

    # Converte coordenadas de string para float
    for empresa in selecionadas:
        coords = ast.literal_eval(empresa['coord'])
        empresa['latitude'] = coords[0]
        empresa['longitude'] = coords[1]

    return jsonify(selecionadas)

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5001)