const map = L.map('map').setView([-14.235, -51.9253], 4);
let routingControl;

// Configuração do mapa com OpenStreetMap
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/attributions">CartoDB</a>',
    maxZoom: 20
}).addTo(map);

let empresas = [];
let markerHover = null;
let fixedMarkers = [];  // Lista para manter os marcadores fixos selecionados

// Função para carregar empresas
function carregarEmpresas() {
    fetch('/api/empresas/lista')
        .then(response => response.json())
        .then(data => {
            empresas = data.filter(emp => emp.latitude && emp.longitude && !isNaN(emp.latitude) && !isNaN(emp.longitude));
        })
        .catch(error => console.error('Erro ao carregar lista de empresas:', error));
}

// Função para exibir sugestões flutuantes
function exibirSugestoes(valor, listaId) {
    const lista = document.getElementById(listaId);
    lista.innerHTML = ''; // Limpa a lista

    // Mostra todas as empresas se não houver valor digitado
    const resultados = valor
        ? empresas.filter(empresa =>
            empresa.razao_social.toLowerCase().includes(valor.toLowerCase()) ||
            empresa.cnpj.includes(valor))
        : empresas;

    if (resultados.length > 0) {
        lista.style.display = 'block';
        const ul = document.createElement('ul');
        resultados.forEach(empresa => {
            const li = document.createElement('li');
            li.textContent = empresa.razao_social;
            li.dataset.latitude = empresa.latitude;
            li.dataset.longitude = empresa.longitude;

            // Eventos de mouse para exibir o marcador temporário
            li.addEventListener('mouseover', () => mostrarMarcadorTemporario(empresa));
            li.addEventListener('mouseleave', removerMarcadorTemporario);

            // Clique para adicionar marcador fixo
            li.addEventListener('click', () => {
                adicionarMarcadorFixo(empresa, listaId === "empresas-list" ? 'empresa1' : 'empresa2');
                lista.style.display = 'none';
            });

            ul.appendChild(li);
        });
        lista.appendChild(ul);

        // Posiciona a lista de forma flutuante
        const input = document.getElementById(listaId === "empresas-list" ? 'empresa1' : 'empresa2');
        const rect = input.getBoundingClientRect();
        lista.style.top = `${rect.bottom + 5}px`;
        lista.style.left = `${rect.left}px`;
    } else {
        lista.style.display = 'none';
    }
}

// Função para adicionar um marcador fixo
function adicionarMarcadorFixo(empresa, inputId) {
    // Adiciona o nome da empresa ao campo de entrada
    document.getElementById(inputId).value = empresa.razao_social;

    // Adiciona o marcador fixo no mapa
    const marker = L.marker([empresa.latitude, empresa.longitude])
        .addTo(map)
        .bindPopup(`<b>${empresa.razao_social}</b><br>${empresa.endereco}`)
        .openPopup();

    fixedMarkers.push(marker);
}

// Função para mostrar um marcador temporário
function mostrarMarcadorTemporario(empresa) {
    if (markerHover) {
        map.removeLayer(markerHover);
    }
    markerHover = L.marker([empresa.latitude, empresa.longitude])
        .addTo(map)
        .bindPopup(`<b>${empresa.razao_social}</b>`)
        .openPopup();
}

// Função para remover o marcador temporário
function removerMarcadorTemporario() {
    if (markerHover) {
        map.removeLayer(markerHover);
        markerHover = null;
    }
}

// Eventos para exibir a lista completa ao clicar
document.getElementById('empresa1').addEventListener('focus', () => exibirSugestoes('', 'empresas-list'));
document.getElementById('empresa2').addEventListener('focus', () => exibirSugestoes('', 'empresas-list2'));

// Evento de entrada para filtrar empresas enquanto digita
document.getElementById('empresa1').addEventListener('input', () => exibirSugestoes(document.getElementById('empresa1').value, 'empresas-list'));
document.getElementById('empresa2').addEventListener('input', () => exibirSugestoes(document.getElementById('empresa2').value, 'empresas-list2'));

// Carregar empresas na inicialização
document.addEventListener('DOMContentLoaded', carregarEmpresas);

// Função para gerar rota entre duas empresas
function gerarRota() {
    // Limita a rota aos dois últimos marcadores adicionados na lista
    if (fixedMarkers.length < 2) {
        alert('Por favor, selecione pelo menos duas empresas antes de gerar a rota.');
        return;
    }

    // Remove todos os marcadores fixos anteriores do mapa
    fixedMarkers.forEach(marker => map.removeLayer(marker));
    fixedMarkers = fixedMarkers.slice(-2);  // Mantém apenas os dois últimos marcadores

    // Re-adiciona os dois últimos marcadores ao mapa
    fixedMarkers.forEach(marker => marker.addTo(map));

    const waypoints = [
        fixedMarkers[0].getLatLng(),
        fixedMarkers[1].getLatLng()
    ];

    updateRoute(waypoints);
}

// Atualiza a rota com base nos waypoints fornecidos
function updateRoute(waypoints) {
    // Remove a rota antiga, se existente
    if (routingControl) {
        routingControl.getPlan().setWaypoints([]); // Limpa os waypoints
        map.removeControl(routingControl); // Remove o controle de rota do mapa
    }

    // Adiciona nova rota se tivermos exatamente dois waypoints
    if (waypoints.length === 2) {
        routingControl = L.Routing.control({
            waypoints: waypoints,
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
            }),
            routeWhileDragging: false,
            createMarker: () => null,
            lineOptions: {
                styles: [{ color: 'blue', weight: 4 }]
            },
            fitSelectedRoutes: true,
            showAlternatives: false
        }).addTo(map);
    }
}

// Atualiza a rota com base nos waypoints fornecidos
function updateRoute(waypoints) {
    // Remove a rota antiga, se existente
    if (routingControl) {
        routingControl.getPlan().setWaypoints([]); // Limpa os waypoints
        map.removeControl(routingControl); // Remove o controle de rota do mapa
    }

    // Adiciona nova rota se tivermos exatamente dois waypoints
    if (waypoints.length === 2) {
        routingControl = L.Routing.control({
            waypoints: waypoints,
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
            }),
            routeWhileDragging: false,
            createMarker: () => null,
            lineOptions: {
                styles: [{ color: 'blue', weight: 4 }]
            },
            fitSelectedRoutes: true,
            showAlternatives: false
        }).addTo(map);

        // Foca apenas na primeira rota
        routingControl.on('routesfound', function(e) {
            const route = e.routes[0];
            console.log('Primeira rota encontrada:', route);
        });
    }
}

// Evento para gerar a rota
document.getElementById('gerar-rota').addEventListener('click', gerarRota);

// Permite interatividade no mapa
map.scrollWheelZoom.enable();
map.dragging.enable();
