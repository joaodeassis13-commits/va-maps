//VERSION=3
// Camada auxiliar: NÃO é para visualização (fica com cores estranhas se
// você olhar no mapa). Codifica 3 reflectâncias do Sentinel-2 — 740nm
// (B06), 783nm (B07) e 865nm (B8A) — nos canais R, G e B (cada uma na
// faixa 0 a MAX_REFLECTANCE, mapeada para 0-255), e a máscara de dado
// válido no canal alfa.
//
// Usada só para a fórmula de produtividade de Cisneros Garcia et al.
// (2020) em Panicum, que precisa das 3 bandas separadas (o índice de
// Dall'Olmo), não dá pra resumir num único índice normalizado como o
// NDVI/NDRE/GNDVI.
//
// Nome da camada no Sentinel Hub: PANICUM_BANDS_RAW
// (precisa bater exatamente com esse nome — é o valor de
// SENTINEL_PANICUM_BANDS_RAW_LAYER no sistema)

function setup() {
  return {
    input: ["B06", "B07", "B8A", "dataMask"],
    output: { bands: 4, sampleType: "UINT8" }
  };
}

// Deve ser igual a PANICUM_BANDS_MAX_REFLECTANCE no sistema (0,6).
const MAX_REFLECTANCE = 0.6;

function evaluatePixel(sample) {
  let r740 = Math.min(sample.B06 / MAX_REFLECTANCE, 1);
  let r783 = Math.min(sample.B07 / MAX_REFLECTANCE, 1);
  let r865 = Math.min(sample.B8A / MAX_REFLECTANCE, 1);
  return [
    Math.round(r740 * 255),
    Math.round(r783 * 255),
    Math.round(r865 * 255),
    sample.dataMask * 255
  ];
}
