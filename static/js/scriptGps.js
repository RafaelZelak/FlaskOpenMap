const map = L.map('map').setView([-23.5505, -46.6333], 12);
let routingControl;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

fetch('/api/empresas')
    .then(response => response.json())
    .then(empresas => {
        const bounds = L.latLngBounds();
        const markers = {}; // Guarda os marcadores por ID
        const selectedWaypoints = []; // Pontos selecionados

        empresas.forEach((empresa, index) => {
            const latLng = L.latLng(empresa.latitude, empresa.longitude);
            bounds.extend(latLng);

            // Adiciona marcador ao mapa
            const marker = L.marker(latLng).addTo(map)
                .bindPopup(`<b>${empresa.nome_fantasia}</b><br>${empresa.endereco}<br>${empresa.telefone_1}`);
            markers[empresa.nome_fantasia] = latLng;

            // Adiciona item à lista de GPS com checkbox
            const li = document.createElement('li');
            li.className = 'empresa-item';
            li.innerHTML = `
                <input type="checkbox" id="empresa-${index}" data-lat="${empresa.latitude}" data-lng="${empresa.longitude}">
                <label for="empresa-${index}">${empresa.nome_fantasia}<br>${empresa.endereco}<br>Telefone: ${empresa.telefone_1}</label>
            `;
            document.getElementById('gps-list').appendChild(li);

            // Atualiza rota ao selecionar/deselecionar
            li.querySelector('input').addEventListener('change', (event) => {
                if (event.target.checked) {
                    selectedWaypoints.push(latLng);
                } else {
                    const idx = selectedWaypoints.findIndex(
                        point => point.lat === latLng.lat && point.lng === latLng.lng
                    );
                    selectedWaypoints.splice(idx, 1);
                }
                updateRoute(selectedWaypoints);
            });
        });

        // Ajusta o mapa para mostrar todos os pontos
        map.fitBounds(bounds, { padding: [20, 20] });
    })
    .catch(error => {
        console.error('Erro ao carregar pontos:', error);
    });

// Atualiza a rota com base nos pontos selecionados
function updateRoute(waypoints) {
if (routingControl) {
map.removeControl(routingControl); // Remove a rota anterior
}
if (waypoints.length > 1) { // Só mostra rota se houver ao menos 2 pontos
routingControl = L.Routing.control({
waypoints: waypoints,
router: L.Routing.osrmv1({
serviceUrl: 'https://router.project-osrm.org/route/v1',
steps: false,  // Remove instruções passo a passo
overview: 'false' // Remove o resumo da rota
}),
routeWhileDragging: false,
show: false, // Oculta o painel de instruções de rota
addWaypoints: false,
createMarker: function() { return null; }, // Evita duplicar marcadores
lineOptions: {
styles: [{ color: 'red', weight: 3 }]
},
collapse: true // Oculta o painel de instruções, se ainda estiver ativo
}).addTo(map);
}
}


// Permite interatividade no mapa
map.scrollWheelZoom.enable();
map.dragging.enable();