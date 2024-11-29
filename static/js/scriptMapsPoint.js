// Inicialização do mapa com vista inicial para o Brasil
const map = L.map('map').setView([-14.235, -51.9253], 4);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/attributions">CartoDB</a>',
    maxZoom: 20
}).addTo(map);

let currentCircle = null;
let currentMarker = null;
const markers = [];

// Variáveis para controle do raio e ponto central
let raioAtual = null;
let pontoCentral = null;
let selectedEmpresa = null;

let gruposAtivos = new Set([
    'Acessórias',
    'Acessórias + KOMUNIC',
    'Sittax',
    'Sittax / Acessórias',
    'Sittax / Acessórias + KOMUNIC',
    'Best Doctor'
]);

document.getElementById('group-filters').addEventListener('change', (event) => {
    const checkbox = event.target;
    if (checkbox.checked) {
        gruposAtivos.add(checkbox.value);
    } else {
        gruposAtivos.delete(checkbox.value);
    }
    carregarPontosDentroDoRaio(); // Atualiza os pontos ao alterar filtros
});

// Função para carregar a lista de empresas no dropdown
async function carregarListaEmpresas() {
    try {
        const response = await fetch('/api/empresas');
        if (response.ok) {
            const empresas = await response.json();

            // Filtra empresas com latitude e longitude válidos
            listaEmpresas = empresas.filter(empresa => empresa.latitude !== null && empresa.longitude !== null);

            atualizarListaEmpresas();

            // Atualiza o contador total de empresas
            document.getElementById('result-count').textContent = `${listaEmpresas.length} resultados`;
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

function marcarEmpresaSelecionada() {
    if (selectedEmpresa.latitude && selectedEmpresa.longitude) {
        console.log("Selecionando nova empresa e redefinindo o mapa.");

        // Remove marcador e círculo anterior
        if (currentCircle) {
            currentCircle.remove();
            currentCircle = null;
            console.log("Círculo anterior removido.");
        }
        if (currentMarker) {
            currentMarker.remove();
            currentMarker = null;
            console.log("Marcador anterior removido.");
        }
        markers.forEach(marker => marker.remove());
        markers.length = 0;
        console.log("Todos os marcadores anteriores foram removidos.");

        // Cria um novo marcador no ponto central selecionado
        currentMarker = L.marker([selectedEmpresa.latitude, selectedEmpresa.longitude], {
            icon: criarIconePersonalizado('red')
        }).addTo(map);

        // Abre o popup e associa eventos ao popup e ao botão dentro dele
        currentMarker.bindPopup(`
            <b>${selectedEmpresa.razao_social}</b><br>
            ${selectedEmpresa.endereco}<br>
            ${selectedEmpresa.cnpj}<br>
            <div class="popup-input">
                <input type="number" placeholder="Raio (km)" id="raioInput" class="border border-gray-300 rounded p-1 w-20">
                <button id="searchWithinRadius" class="bg-blue-500 text-white px-2 py-1 rounded ml-2">Procurar</button>
            </div>
        `).openPopup();

        map.setView([selectedEmpresa.latitude, selectedEmpresa.longitude], 12);

        // Configura o evento de clique imediatamente após o primeiro carregamento do popup
        setTimeout(() => {
            configurarEventoDeClique();
        }, 500);

        // Reconfigura o evento de clique toda vez que o popup for aberto novamente
        currentMarker.on('popupopen', () => {
            console.log("Popup aberto novamente, reconfigurando o evento de clique.");
            configurarEventoDeClique();
        });

        // Limpa o evento de clique do botão quando o popup fecha
        currentMarker.on('popupclose', () => {
            console.log("Popup fechado, limpando o evento de clique do botão de busca.");
            const searchButton = document.getElementById('searchWithinRadius');
            if (searchButton) {
                searchButton.replaceWith(searchButton.cloneNode(true));
            }
        });
    } else {
        console.error("Dados de latitude e longitude não encontrados para a empresa selecionada.");
    }
}

// Função para configurar o evento de clique no botão
function configurarEventoDeClique() {
    const searchButton = document.getElementById('searchWithinRadius');
    if (searchButton) {
        searchButton.addEventListener('click', async () => {
            console.log("Botão de busca clicado, processando busca.");

            const raioInput = document.getElementById('raioInput');
            const raioKm = parseFloat(raioInput.value);
            if (isNaN(raioKm) || raioKm <= 0) {
                alert("Por favor, insira um valor de raio válido.");
                return;
            }

            raioAtual = raioKm * 1000;
            pontoCentral = [selectedEmpresa.latitude, selectedEmpresa.longitude];

            if (currentCircle) {
                currentCircle.remove();
                console.log("Círculo anterior removido.");
            }

            currentCircle = L.circle(pontoCentral, {
                radius: raioAtual,
                color: '#3f83f8',
                fillColor: '#3f83f8',
                fillOpacity: 0.15
            }).addTo(map);

            console.log("Novo círculo criado no ponto central.");
            await carregarPontosDentroDoRaio();
        });
        console.log("Evento de clique associado ao botão com sucesso.");
    } else {
        console.error("Botão de busca não encontrado no popup.");
    }
}

// Função para carregar e exibir os pontos dentro do raio especificado
function definirCorEGrupo(empresa) {
    const nomeNormalizado = normalizeString(empresa.empresas);

    if (nomeNormalizado === normalizeString('Best Doctor')) {
        return { cor: 'blue', grupo: 'Best Doctor' };
    } else if (
        nomeNormalizado === normalizeString('Acessórias') ||
        nomeNormalizado === normalizeString('Acessórias + KOMUNIC')
    ) {
        return { cor: 'yellow', grupo: 'Acessórias' };
    } else if (nomeNormalizado === normalizeString('Sittax')) {
        return { cor: 'orange', grupo: 'Sittax' };
    } else if (
        nomeNormalizado === normalizeString('Sittax / Acessórias') ||
        nomeNormalizado === normalizeString('Sittax / Acessórias + KOMUNIC')
    ) {
        return { cor: 'green', grupo: 'Sittax / Acessórias' };
    } else {
        return { cor: 'gray', grupo: 'Outros' }; // Cor padrão para grupos não especificados
    }
}

// Função para normalizar strings, removendo caracteres especiais
function normalizeString(str) {
    return str
        .normalize('NFD') // Remove acentos
        .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
        .replace(/[^a-zA-Z0-9 /+]/g, '') // Remove caracteres especiais
        .toLowerCase() // Normaliza para minúsculas
        .trim(); // Remove espaços extras
}

// Modifique a função `carregarPontosDentroDoRaio` para usar a nova lógica
async function carregarPontosDentroDoRaio() {
    if (currentCircle) currentCircle.remove();

    // Desenha o círculo no ponto central
    currentCircle = L.circle(pontoCentral, {
        radius: raioAtual,
        color: '#3f83f8',
        fillColor: '#3f83f8',
        fillOpacity: 0.15
    }).addTo(map);

    try {
        const response = await fetch('/api/empresas');
        if (response.ok) {
            const empresas = await response.json();
            markers.forEach(marker => marker.remove());
            markers.length = 0;

            let count = 0;
            const resultList = document.getElementById('result-list');
            resultList.innerHTML = ''; // Limpa a lista antes de adicionar novos itens

            // Filtra empresas dentro do raio e calcula a distância
            const empresasComDistancia = empresas
            .filter(empresa => {
                if (empresa.latitude && empresa.longitude) {
                    const isPontoCentral =
                        empresa.latitude === pontoCentral[0] &&
                        empresa.longitude === pontoCentral[1];
                    if (isPontoCentral) return false; // Ignora o ponto central

                    const { grupo } = definirCorEGrupo(empresa); // Define o grupo da empresa
                    if (!gruposAtivos.has(grupo)) return false; // Filtra pelos grupos ativos

                    const distancia = map.distance(pontoCentral, [empresa.latitude, empresa.longitude]);
                    empresa.distanciaKm = (distancia / 1000).toFixed(2); // Armazena distância em km
                    return distancia <= raioAtual;
                }
                return false;
            })
            .sort((a, b) => a.distanciaKm - b.distanciaKm);

            // Itera pelas empresas ordenadas e adiciona os marcadores e itens de lista
            empresasComDistancia.forEach(empresa => {
                const { cor, grupo } = definirCorEGrupo(empresa);

                // Cria e adiciona o marcador ao mapa
                const marker = L.marker([empresa.latitude, empresa.longitude], {
                    icon: criarIconePersonalizado(cor)
                }).addTo(map);

                marker.bindPopup(`
                    <b>${empresa.razao_social}</b><br>
                    ${empresa.endereco}<br>
                    ${empresa.cnpj}<br>
                    Distância: ${empresa.distanciaKm} km<br>
                    Empresa: ${grupo}
                `);
                markers.push(marker);
                count++;

                // Cria um item de lista para a empresa e define eventos de mouseover, mouseout e click
                const listItem = document.createElement('li');
                listItem.className = 'border p-2 rounded hover:bg-gray-200';
                listItem.textContent = `${empresa.razao_social} - ${empresa.distanciaKm} km`;

                // Salva o ícone original para restaurá-lo
                const originalIcon = marker.options.icon;

                // Evento de mouseover para alterar a cor do marcador
                listItem.addEventListener('mouseover', () => {
                    marker.setIcon(criarIconePersonalizado('grey')); // Cor ao passar o mouse: verde
                });

                // Evento de mouseout para retornar à cor original
                listItem.addEventListener('mouseout', () => {
                    marker.setIcon(originalIcon);
                });

                // Evento de clique para centralizar e abrir o popup da empresa
                listItem.addEventListener('click', () => {
                    map.setView([empresa.latitude, empresa.longitude], 14); // Zoom na localização da empresa
                    marker.openPopup(); // Abre o popup do marcador
                });

                resultList.appendChild(listItem);
            });

            // Atualiza o contador de resultados dentro do raio
            document.getElementById('result-count').textContent = `${count} resultados`;
        } else {
            console.error('Erro ao carregar empresas:', response.statusText);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
    }
}

// Função para criar ícone personalizado
function criarIconePersonalizado(cor) {
    const iconSize = cor === 'red' ? [35, 60] : [25, 41]; // Ícone maior para o ponto central
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
