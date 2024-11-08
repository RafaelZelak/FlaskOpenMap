const map = L.map('map').setView([-14.235, -51.9253], 4); // Brasil como visão inicial

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const markers = [];
const bounds = L.latLngBounds();
let currentCircle = null;
let firstPointLoaded = false;

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

                // Ajuste da visão do mapa para incluir todos os pontos
                bounds.extend(marker.getLatLng());
                map.fitBounds(bounds, { padding: [20, 20] });

                firstPointLoaded = true;

                // Adiciona evento ao botão de cálculo
                marker.on('popupopen', () => {
                    const button = document.getElementById(`calc-btn-${empresa.nome_fantasia}`);
                    button.addEventListener('click', () => calcularDistancia(empresa.latitude, empresa.longitude, empresa.nome_fantasia));
                });
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

    if (currentCircle) {
        currentCircle.remove();
    }

    currentCircle = L.circle([lat, lng], {
        radius: raioKm * 1000,
        color: 'blue',
        fillColor: '#3f83f8',
        fillOpacity: 0.3
    }).addTo(map);

    const resultList = document.getElementById('result-list');
    resultList.innerHTML = '';

    markers.forEach(({ marker, data }) => {
        const distancia = map.distance([lat, lng], [data.latitude, data.longitude]);
        if (distancia <= raioKm * 1000) {
            const listItem = document.createElement('li');
            listItem.textContent = `${data.nome_fantasia} - Distância: ${(distancia / 1000).toFixed(2)} km`;
            resultList.appendChild(listItem);
        }
    });
}

// Inicia o carregamento dos pontos
loadAllPoints();
