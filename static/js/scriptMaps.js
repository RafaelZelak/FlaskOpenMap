// Inicialização do mapa com vista inicial para o Brasil
const map = L.map('map').setView([-14.235, -51.9253], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const markers = [];
const bounds = L.latLngBounds();
let currentCircle = null;
let firstPointLoaded = false;

// Variáveis para o raio atual e ponto central para atualizar a lista dinamicamente
let raioAtual = null;
let pontoCentral = null;

const MAX_CONCURRENT_REQUESTS = 5; // Limite de requisições simultâneas
const BATCH_DELAY = 2000; // Espera entre os lotes de requisições (em ms)
const RETRY_DELAY = 3000; // Atraso para novas tentativas (em ms)

// Função para carregar e exibir cada ponto
async function loadAndDisplayPoint(index, retry = 0, maxRetry = 3) {
    try {
        const response = await fetch(`/api/empresa?id=${index}`);
        if (response.ok) {
            const empresa = await response.json();
            if (empresa.latitude && empresa.longitude) {
                const marker = L.marker([empresa.latitude, empresa.longitude]).addTo(map);
                marker.bindPopup(`
                    <b>${empresa.nome_fantasia}</b><br>
                    ${empresa.endereco}<br>
                    ${empresa.telefone_1}<br>
                    <div class="popup-input">
                        <input type="number" placeholder="Raio (km)" id="raio-${empresa.nome_fantasia}">
                        <button id="calc-btn-${empresa.nome_fantasia}">Calcular</button>
                    </div>
                `);
                markers.push({ marker, data: empresa });

                // Ajusta a visão do mapa para incluir todos os pontos
                bounds.extend(marker.getLatLng());
                map.fitBounds(bounds, { padding: [10, 10] });

                firstPointLoaded = true;

                // Adiciona evento ao botão de cálculo
                marker.on('popupopen', () => {
                    const button = document.getElementById(`calc-btn-${empresa.nome_fantasia}`);
                    button.addEventListener('click', () => calcularDistancia(empresa.latitude, empresa.longitude, empresa.nome_fantasia));
                });

                // Verifica se o ponto está dentro do raio atual
                if (raioAtual && pontoCentral) {
                    verificarDistanciaParaNovoPonto(empresa);
                }
            }
        } else if (retry < maxRetry) {
            console.warn(`Ponto ${index} não encontrado. Tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retry + 1)));
            return loadAndDisplayPoint(index, retry + 1); // Nova tentativa com delay progressivo
        }
    } catch (error) {
        console.error(`Erro ao carregar ponto ${index}:`, error);
    }
}

// Função para carregar os pontos em lotes com limite de concorrência
async function loadAllPoints() {
    const response = await fetch('/api/empresas/total');
    const data = await response.json();
    const totalPoints = data.total;

    // Divide em lotes para limitar requisições simultâneas
    for (let i = 0; i < totalPoints; i += MAX_CONCURRENT_REQUESTS) {
        const batch = [];

        for (let j = 0; j < MAX_CONCURRENT_REQUESTS && i + j < totalPoints; j++) {
            batch.push(loadAndDisplayPoint(i + j));
        }

        // Aguarda as requisições do lote serem concluídas antes de passar para o próximo
        await Promise.all(batch);

        // Aguarda um pouco antes de iniciar o próximo lote para evitar o limite
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }

    // Se nenhum ponto carregar, manter o mapa com visão do Brasil
    setTimeout(() => {
        if (!firstPointLoaded) {
            map.setView([-14.235, -51.9253], 4);
        }
    }, totalPoints * 500);
}

// Função para calcular e exibir os pontos dentro do raio
function calcularDistancia(lat, lng, nomeFantasia) {
    const raioInput = document.getElementById(`raio-${nomeFantasia}`);
    const raioKm = parseFloat(raioInput.value);

    if (isNaN(raioKm) || raioKm <= 0) {
        alert("Por favor, insira um valor de raio válido.");
        return;
    }

    // Atualiza o raio e o ponto central atuais
    raioAtual = raioKm * 1000; // Armazena o raio em metros
    pontoCentral = [lat, lng]; // Armazena o ponto central

    if (currentCircle) {
        currentCircle.remove();
    }

    currentCircle = L.circle([lat, lng], {
        radius: raioAtual,
        color: '#3f83f8B3',
        fillColor: '#3f83f8',
        fillOpacity: 0.15
    }).addTo(map);

    // Atualiza a lista de resultados
    atualizarListaDeResultados();
}

// Função para atualizar a lista de pontos dentro do raio e organizar por categorias
function atualizarListaDeResultados() {
    const resultList = document.getElementById('result-list');
    resultList.innerHTML = '';

    // Filtra e organiza pontos com distância calculada
    const pontosDistancia = markers
        .map(({ marker, data }) => {
            const distancia = map.distance(pontoCentral, [data.latitude, data.longitude]);
            return { data, distancia, marker };
        })
        .filter(({ distancia }) => distancia <= raioAtual)
        .sort((a, b) => a.distancia - b.distancia);

    // Cria um conjunto para armazenar combinações únicas de nome e distância
    const uniqueResults = new Set();

    // Define categorias de distância
    const categorias = [
        { label: 'Até 1 km', limite: 1000 },
        { label: 'Até 5 km', limite: 5000 }
    ];

    for (let i = 1; i <= Math.ceil(raioAtual / 5000); i++) {
        categorias.push({ label: `Até ${i * 5} km`, limite: i * 5000 });
    }

    // Filtra e exibe os pontos em cada categoria, evitando duplicatas
    categorias.forEach(categoria => {
        const categoriaPontos = pontosDistancia.filter(({ distancia }) => distancia <= categoria.limite);
        if (categoriaPontos.length > 0) {
            const header = document.createElement('h4');
            header.textContent = categoria.label;
            resultList.appendChild(header);

            categoriaPontos.forEach(({ data, distancia, marker }) => {
                const uniqueKey = `${data.nome_fantasia}-${distancia.toFixed(2)}`;

                if (!uniqueResults.has(uniqueKey)) {
                    uniqueResults.add(uniqueKey);

                    const listItem = document.createElement('li');
                    listItem.textContent = `${data.nome_fantasia} - Distância: ${(distancia / 1000).toFixed(2)} km`;

                    // Destaca o ponto central
                    if (distancia === 0) {
                        listItem.style.fontWeight = 'bold';
                        listItem.style.color = 'red';
                    }

                    // Adiciona o evento de clique para focar no ponto no mapa
                    listItem.addEventListener('click', () => {
                        map.setView(marker.getLatLng(), 15);
                        marker.openPopup();
                    });

                    resultList.appendChild(listItem);
                }
            });

            // Remove os pontos exibidos da lista para evitar repetição em várias categorias
            pontosDistancia.splice(0, categoriaPontos.length);
        }
    });
}

// Função para verificar se um novo ponto está dentro do raio atual e atualizar a lista
function verificarDistanciaParaNovoPonto(data) {
    const distancia = map.distance(pontoCentral, [data.latitude, data.longitude]);
    if (distancia <= raioAtual) {
        atualizarListaDeResultados();
    }
}

// Inicia o carregamento dos pontos
loadAllPoints();
