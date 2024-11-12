// Inicialização do mapa com vista inicial para o Brasil
const map = L.map('map').setView([-14.235, -51.9253], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let currentCircle = null;
const markers = [];

// Variáveis para controle do raio e ponto central
let raioAtual = null;
let pontoCentral = null;
let selectedEmpresa = null;

// Função para carregar a lista de empresas no dropdown
async function carregarListaEmpresas() {
    try {
        const response = await fetch('/api/empresas');
        if (response.ok) {
            listaEmpresas = await response.json();
            atualizarListaEmpresas();
        } else {
            console.error('Erro ao carregar empresas:', response.statusText);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
    }
}

// Função para atualizar o dropdown com as empresas filtradas
function atualizarListaEmpresas(filtro = '') {
    empresaList.innerHTML = ''; // Limpa as opções antigas
    const empresasFiltradas = listaEmpresas.filter(empresa =>
        empresa.razao_social && empresa.razao_social.toLowerCase().includes(filtro.toLowerCase())
    );

    empresasFiltradas.forEach(empresa => {
        const li = document.createElement('li');
        li.textContent = empresa.razao_social;
        li.dataset.id = empresa.id; // Adiciona o ID da empresa para referência futura
        li.addEventListener('click', () => {
            empresaInput.value = empresa.razao_social;
            selectedEmpresa = empresa;
            toggleEmpresaList(false); // Esconde o dropdown ao selecionar uma opção
            marcarEmpresaSelecionada();
        });
        empresaList.appendChild(li);
    });

    toggleEmpresaList(empresasFiltradas.length > 0);
}

// Função para exibir o ponto da empresa selecionada e permitir inserir o raio
function marcarEmpresaSelecionada() {
    if (selectedEmpresa.latitude && selectedEmpresa.longitude) {
        if (currentCircle) currentCircle.remove();
        const marker = L.marker([selectedEmpresa.latitude, selectedEmpresa.longitude], {
            icon: criarIconePersonalizado('red')
        }).addTo(map);
        marker.bindPopup(`
            <b>${selectedEmpresa.razao_social}</b><br>
            ${selectedEmpresa.endereco}<br>
            ${selectedEmpresa.cnpj}<br>
            <div class="popup-input">
                <input type="number" placeholder="Raio (km)" id="raioInput" class="border border-gray-300 rounded p-1 w-20">
                <button id="searchWithinRadius" class="bg-blue-500 text-white px-2 py-1 rounded ml-2">Procurar</button>
            </div>
        `).openPopup();
        map.setView([selectedEmpresa.latitude, selectedEmpresa.longitude], 12);

        document.getElementById('searchWithinRadius').addEventListener('click', () => {
            const raioInput = document.getElementById('raioInput');
            const raioKm = parseFloat(raioInput.value);
            if (isNaN(raioKm) || raioKm <= 0) {
                alert("Por favor, insira um valor de raio válido.");
                return;
            }
            raioAtual = raioKm * 1000;
            pontoCentral = [selectedEmpresa.latitude, selectedEmpresa.longitude];
            carregarPontosDentroDoRaio();
        });
    }
}

// Função para carregar e exibir os pontos dentro do raio especificado
async function carregarPontosDentroDoRaio() {
    if (currentCircle) currentCircle.remove();
    currentCircle = L.circle(pontoCentral, {
        radius: raioAtual,
        color: '#3f83f8',
        fillColor: '#3f83f8',
        fillOpacity: 0.15
    }).addTo(map);

    try {
        const response = await fetch('/api/empresas'); // Carrega todas as empresas (ou idealmente, uma API filtrada)
        if (response.ok) {
            const empresas = await response.json();
            markers.forEach(marker => marker.remove());
            markers.length = 0;

            empresas.forEach(empresa => {
                if (empresa.latitude && empresa.longitude) {
                    // Verifica se é o ponto central, para não adicionar um marcador adicional
                    const isPontoCentral =
                        empresa.latitude === pontoCentral[0] &&
                        empresa.longitude === pontoCentral[1];

                    if (!isPontoCentral) {
                        const distancia = map.distance(pontoCentral, [empresa.latitude, empresa.longitude]);
                        if (distancia <= raioAtual) {
                            const marker = L.marker([empresa.latitude, empresa.longitude]).addTo(map);
                            marker.bindPopup(`
                                <b>${empresa.nome_fantasia}</b><br>
                                ${empresa.endereco}<br>
                                ${empresa.cnpj}
                            `);
                            markers.push(marker);
                        }
                    }
                }
            });
        } else {
            console.error('Erro ao carregar empresas:', response.statusText);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
    }
}

// Função para criar ícone personalizado
function criarIconePersonalizado(cor) {
    const iconSize = cor === 'red' ? [40, 65] : [25, 41]; // Ícone maior para o ponto central
    const iconAnchor = cor === 'red' ? [20, 65] : [12, 41];

    return L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${cor}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: iconSize,
        iconAnchor: iconAnchor,
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

// Funções auxiliares para controle do dropdown
const empresaInput = document.getElementById('empresa-dropdown');
const empresaList = document.getElementById('empresa-list');
let listaEmpresas = [];

function toggleEmpresaList(show) {
    empresaList.classList.toggle('hidden', !show);
}

empresaInput.addEventListener('input', (event) => {
    const filtro = event.target.value;
    atualizarListaEmpresas(filtro);
});

document.addEventListener('click', (event) => {
    if (!empresaInput.contains(event.target) && !empresaList.contains(event.target)) {
        toggleEmpresaList(false);
    }
});

carregarListaEmpresas();
