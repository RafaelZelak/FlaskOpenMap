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

// Variáveis para controle do raio e ponto central
let raioAtual = null;
let pontoCentral = null;

const MAX_CONCURRENT_REQUESTS = 5; // Limite de requisições simultâneas
const BATCH_DELAY = 2000; // Atraso entre lotes de requisições (em ms)
const RETRY_DELAY = 3000; // Atraso para novas tentativas de requisição (em ms)

// Função para carregar e exibir um ponto específico
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
                        <input type="number" placeholder="Raio (km)" id="raio-${empresa.nome_fantasia}" class="border border-gray-300 rounded p-1 w-20">
                        <button id="calc-btn-${empresa.nome_fantasia}" class="bg-blue-500 text-white px-2 py-1 rounded ml-2">Calcular</button>
                    </div>
                `);
                markers.push({ marker, data: empresa });

                bounds.extend(marker.getLatLng());
                map.fitBounds(bounds, { padding: [10, 10] });
                firstPointLoaded = true;

                marker.on('popupopen', () => {
                    const button = document.getElementById(`calc-btn-${empresa.nome_fantasia}`);
                    button.addEventListener('click', () => calcularDistancia(empresa.latitude, empresa.longitude, empresa.nome_fantasia));
                });

                if (raioAtual && pontoCentral) {
                    verificarDistanciaParaNovoPonto(empresa);
                }
            }
        } else if (retry < maxRetry) {
            console.warn(`Ponto ${index} não encontrado. Tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retry + 1)));
            return loadAndDisplayPoint(index, retry + 1);
        }
    } catch (error) {
        console.error(`Erro ao carregar ponto ${index}:`, error);
    }
}

// Função para carregar todos os pontos
async function loadAllPoints() {
    const response = await fetch('/api/empresas/total');
    const data = await response.json();
    const totalPoints = data.total;

    for (let i = 0; i < totalPoints; i += MAX_CONCURRENT_REQUESTS) {
        const batch = [];
        for (let j = 0; j < MAX_CONCURRENT_REQUESTS && i + j < totalPoints; j++) {
            batch.push(loadAndDisplayPoint(i + j));
        }
        await Promise.all(batch);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }

    setTimeout(() => {
        if (!firstPointLoaded) {
            map.setView([-14.235, -51.9253], 4);
        }
    }, totalPoints * 500);
}

// Função para calcular a distância e exibir os pontos dentro do raio
function calcularDistancia(lat, lng, nomeFantasia) {
    const raioInput = document.getElementById(`raio-${nomeFantasia}`);
    const raioKm = parseFloat(raioInput.value);

    if (isNaN(raioKm) || raioKm <= 0) {
        alert("Por favor, insira um valor de raio válido.");
        return;
    }

    raioAtual = raioKm * 1000;
    pontoCentral = [lat, lng];

    if (currentCircle) {
        currentCircle.remove();
    }

    currentCircle = L.circle([lat, lng], {
        radius: raioAtual,
        color: '#3f83f8',
        fillColor: '#3f83f8',
        fillOpacity: 0.15
    }).addTo(map);

    atualizarListaDeResultados();
}

function criarIconePersonalizado(cor) {
    return L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${cor}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

// Atualiza a lista de resultados com categorias de distância
// Atualiza a lista de resultados com categorias de distância
function atualizarListaDeResultados() {
    const resultList = document.getElementById('result-list');
    const resultCount = document.getElementById('result-count');
    resultList.innerHTML = ''; // Limpa a lista antes de adicionar novos resultados

    // Filtra os pontos que estão dentro do raio
    const pontosDistancia = markers
        .map(({ marker, data }) => {
            const distancia = map.distance(pontoCentral, [data.latitude, data.longitude]);
            return { data, distancia, marker };
        })
        .filter(({ distancia }) => distancia <= raioAtual) // Mantém somente os pontos dentro do raio
        .sort((a, b) => a.distancia - b.distancia);

    // Atualiza o contador com o número de resultados
    resultCount.textContent = `${pontosDistancia.length} resultados`;

    // Se não houver nenhum ponto, exibe uma mensagem
    if (pontosDistancia.length === 0) {
        resultList.innerHTML = '<p class="text-gray-500">Nenhum ponto encontrado dentro do raio especificado.</p>';
        return;
    }

    // Restante do código de exibição dos pontos
    const uniqueResults = new Set();
    const maxDistance = pontosDistancia[pontosDistancia.length - 1].distancia;

    const categorias = [
        { label: 'Até 1 km', limite: 1000 },
        ...Array.from({ length: Math.ceil(maxDistance / 5000) }, (_, i) => ({
            label: `Até ${(i + 1) * 5} km`,
            limite: (i + 1) * 5000
        }))
    ];

    categorias.forEach(categoria => {
        const categoriaPontos = pontosDistancia.filter(({ distancia }) => distancia <= categoria.limite);

        if (categoriaPontos.length > 0) {
            const header = document.createElement('h4');
            header.textContent = categoria.label;
            header.className = 'text-lg font-medium mt-4';
            resultList.appendChild(header);

            categoriaPontos.forEach(({ data, distancia, marker }) => {
                const uniqueKey = `${data.nome_fantasia}-${distancia.toFixed(2)}`;
                if (!uniqueResults.has(uniqueKey)) {
                    uniqueResults.add(uniqueKey);

                    const listItem = document.createElement('li');
                    listItem.className = 'p-2 bg-blue-100 rounded shadow hover:bg-blue-200 cursor-pointer';
                    listItem.textContent = `${data.nome_fantasia} - ${(distancia / 1000).toFixed(2)} km`;

                    if (distancia === 0) {
                        marker.setIcon(criarIconePersonalizado('red'));
                        listItem.className += ' font-bold text-red-500';
                    } else {
                        marker.setIcon(criarIconePersonalizado('blue'));
                    }

                    listItem.addEventListener('mouseover', () => {
                        marker.setIcon(criarIconePersonalizado('orange'));
                    });

                    listItem.addEventListener('mouseout', () => {
                        marker.setIcon(criarIconePersonalizado(distancia === 0 ? 'red' : 'blue'));
                    });

                    listItem.addEventListener('click', () => {
                        map.setView(marker.getLatLng(), 15);
                        marker.openPopup();
                    });

                    resultList.appendChild(listItem);
                }
            });
        }
    });
}


// Verifica e atualiza a lista ao adicionar novos pontos
function verificarDistanciaParaNovoPonto(data) {
    const distancia = map.distance(pontoCentral, [data.latitude, data.longitude]);
    if (distancia <= raioAtual) {
        atualizarListaDeResultados();
    }
}

// Carrega todos os pontos
loadAllPoints();
