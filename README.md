# Open Map

## Inicialmente vamos ver os dados que alimentam o mapa

Api em Flask que retorna Empresas e suas coordenadas
<br><br><br>
CSV:
````csv
razao_social,cnpj,endereco,coord,empresas
IN NEURO SERVICOS MEDICOS, 07.134.169/0001-83  ,"PROFESSOR JOAO DOETZER 700, CURITIBA, Brasil","[-25.4649245, -49.2226987]",Acessórias + KOMUNIC
CBA MEDICINA INFANTIL,47.114.769/0001-02,"SAUL BRANDALISE 440, VIDEIRA, Brasil","[-27.0062028, -51.1386478]",Acessórias + KOMUNIC
CENTER REPRESENTACOES CONTABEIS LTDA,00.085.278/0001-09,"GENERAL CARNEIRO 1064, CURITIBA, Brasil","[-25.4317301, -49.2590569]",Sittax
[...]
````

## Em relação a API

````tree
📂 FlaskOpenMap
└── 📂 api
    ├── 📄 ListEnterprise.py
    ├── 📄 ListLead.py
    └── 📄 runList.py
````

Temos apenas um construtor do Dataframe em CSV, usei dados pegos do Bitrix, mas qualquer dado colocado no seguinte padrão:<br><br>
(Todos os valores devem estar presentes, o "não obrigatório" só quer dizer que não precisa ser o dado indicado em si)
- razao_social <- Apenas o Nome da empresa (não necessáriamente a razão)
- cnpj <- CNPJ da empresa (não obrigatório)
- endereco <- Endereço da empresa (não obrigatório)
- coord <- Coordenada geográfica da empresa, lat e long (obrigatório)
- empresas < - Aqui fica qualquer "grupo" que você quiser separar, isso irá gerar separação por cor nos pontos do mapa (não obrigatório)

## Backend

O backend é feito em Flsak, usando `render_template` para carregar o front na mesma porta que o front<br>

Cada arquivo do backend tem um correspondente no frontend (Pois este projeto tem varios "sistemas" separados, que apenas se alimentam da mesma API)

## Módulos:
- `AppGps` - Gera uma rota entre duas ou mais empresas retornadas pela API <br><br>
- `AppMaps` - Versão antiga (Carregamento lento e ineficiente dos dados) <br><br>
- `AppMapsPoint` - Pega as empresas da API, ao selecionar um ponto central, você escolhe um raio e ele carrega os pontos ao redor do ponto central <br><br>
- `contourMap` - Faz o contorno de um bairro selecionado e mostra as empresas nesse bairro <br><br>

