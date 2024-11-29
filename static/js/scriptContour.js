const map = L.map('map').setView([-14.235, -51.9253], 4);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/attributions">CartoDB</a>',
    maxZoom: 20
}).addTo(map);

async function buscarCoordenadas(cidade, bairro) {
    try {
        const response = await fetch(`/get-contour?cidade=${cidade}&bairro=${bairro}`);
        const data = await response.json();

        if (response.ok) {
            desenharContorno(data.coordenadas);
            buscarEmpresas(cidade, bairro); // Buscar empresas após desenhar o contorno
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert("Erro ao buscar dados do contorno: " + error.message);
    }
}

function desenharContorno(coordenadas) {
    const latlngs = coordenadas.map(coord => [coord[1], coord[0]]);
    const polygon = L.polygon(latlngs, { color: 'blue' }).addTo(map);
    map.fitBounds(polygon.getBounds());
}

async function buscarEmpresas(cidade, bairro) {
    try {
        const response = await fetch(`/api/empresas/bairro?cidade=${cidade}&bairro=${bairro}`);
        const empresas = await response.json();

        if (response.ok) {
            desenharPontos(empresas);
        } else {
            alert(empresas.error);
        }
    } catch (error) {
        alert("Erro ao buscar dados das empresas: " + error.message);
    }
}

function desenharPontos(empresas) {
    empresas.forEach(empresa => {
        const { latitude, longitude, empresas: nome_fantasia, endereco, cnpj, razao_social } = empresa;

        if (latitude && longitude) {
            const popupContent = `
                <strong>${razao_social}</strong><br>
                Endereço: ${endereco}<br>
                CNPJ: ${cnpj}<br>
                Empresa: ${nome_fantasia}
            `;

            L.marker([latitude, longitude])
                .addTo(map)
                .bindPopup(popupContent);
        }
    });
}

// Inicializar a busca com um bairro e cidade
buscarCoordenadas("Curitiba", "centro");