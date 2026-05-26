/**
 * Datos estáticos de Facturas Solenium 2025.
 * Formato compacto: agrupado por proyecto → grupo de meses con la misma factura.
 * Los meses sin factura/monto/soporte quedan como "pendientes".
 */
const G = id => `https://drive.google.com/file/d/${id}/view?usp=sharing`
const L = id => `https://drive.google.com/file/d/${id}/view?usp=drive_link`

// { p: proyecto, r: [{ f: [meses], n?, m?, s? }] }
// Los meses son números 1-12; se normalizan a "01"-"12" en el export.
const _D = [
  { p: 'Iml Empaques Colombia Sas', r: [
    { f: [12,11,10,9,8,7,6,5,4,3,2,1] },
  ]},
  { p: 'Minigranja Solar Baraya', r: [
    { f: [12,11,10,9], n:'SOFV710', m:3682000, s:G('1SmI8SSnAd0nM1NCFGd1jv1Kw_xHm45j0') },
    { f: [8,7,6,5],   n:'SOFV693', m:3682000, s:L('1e6pegXffK-eihLcfAWspJiiWsidpjqpR') },
    { f: [4,3,2,1],   n:'SOFV657', m:3682000, s:G('1PPKHzSnO3fu4xZkZGlZ-C4KBSZKm3o18') },
  ]},
  { p: 'Minigranja Solar Cañahuate', r: [
    { f: [12,11,10,9], n:'SOFV712', m:4032666, s:G('1QYsDRrOiK5KjnQ2HIGLSCKm5x06Kfexf') },
    { f: [8,7,6,5],   n:'SOFV689', m:4032666, s:G('1H8sJKOCJKflZ5DkkDW7F4H_f8LHPpgdW') },
    { f: [4,3,2,1],   n:'SOFV649', m:4032666, s:G('1gm5_MMi7khD5-ye0mgvgffIDCC70F9A1') },
  ]},
  { p: 'Minigranja Solar El Molino', r: [
    { f: [12,11,10,9], n:'SOFV716', m:4032666, s:G('1ous-AT8AoECJEFBOWQm-YXuRYLNaEudq') },
    { f: [8,7,6,5],   n:'SOFV697', m:4032666, s:G('1hTuADGVKJOZ70D2cWkZ0hjB59cG6_NcS') },
    { f: [4,3,2,1],   n:'SOFV653', m:4032666, s:G('1thul8LEpsWLMvX9JI0e3CJUWQE5H33r2') },
  ]},
  { p: 'Minigranja Solar El Olimpo', r: [
    { f: [12,11,10,9], n:'SOFV723', m:4049424, s:G('18Vnv8z__pPAPXFgQxg5ewnjQEunAzU_c') },
    { f: [8,7],        n:'SOFV682', m:4049424, s:G('1E2nyuaj-_m0cpyv1q5efCfSTH5e8uj6k') },
    { f: [6,5,4,3,2,1] },
  ]},
  { p: 'Minigranja Solar El Son', r: [
    { f: [12,11,10],  n:'SOFV722', m:4049424, s:G('1ufd0SHeeq1KjfDxWQ5HyhPyGrNx3jIXp') },
    { f: [9,8,7,6],   n:'SOFV684', m:4049424, s:L('1TM5IBPDCLvaWpFCbjvocH7lrh-jkdKgF') },
    { f: [5,4,3,2,1] },
  ]},
  { p: 'Minigranja Solar Esmeralda', r: [
    { f: [12,11,10,9], n:'SOFV718', m:4032666, s:G('1v90w_o3NNQxC7p8j86z2xkMAb5Kv_iQj') },
    { f: [8,7,6,5],   n:'SOFV695', m:4032666, s:G('1VNIoibkHtYWu5XQUP69ejJ_lLmJM5i13') },
    { f: [4,3],       n:'SOFV655', m:4032666, s:G('1xeD9uRUmDgrF_VYV2lwCMKCqTHelwOLF') },
    { f: [2,1] },
  ]},
  { p: 'Minigranja Solar Gandalf', r: [
    { f: [12,11,10,9], n:'SOFV713', m:4032666, s:G('1fMBvIv06jaaPjtdMLlnz8lzX1T0hJvEc') },
    { f: [8,7,6,5],   n:'SOFV700', m:4032666, s:L('1_gGiyryWgsgqa6WUdfCMkaItQOM46Zo4') },
    { f: [4,3,2,1],   n:'SOFV650', m:4032666, s:G('1SCzwnoqP_aPwak3yirQbgXhYg04yA1hB') },
  ]},
  { p: 'Minigranja Solar Ibirico', r: [
    { f: [12,11,10,9], n:'SOFV711', m:4000000, s:G('1O2TKaKrLG-x8XHq73kfd-evxhP8h61TG') },
    { f: [8,7],        n:'SOFV683', m:4000000, s:L('11HxJebmaUjCqYgaXSb3slOWROQn09-vt') },
    { f: [6,5,4,3,2,1] },
  ]},
  { p: 'Minigranja Solar La Mesa', r: [
    { f: [12,11,10,9], n:'SOFV727', m:3543246, s:G('1FAcA79Z2aYtTVR7101ALT7I7uxGO3UbQ') },
    { f: [8,7,6,5,4,3,2,1] },
  ]},
  { p: 'Minigranja Solar La Paz Leyenda', r: [
    { f: [12,11,10,9] },
    { f: [8,7,6,5],   n:'SOFV687', m:4032666, s:G('17g4qDdBKV86byR_t7iZH5vMUHjTTyyF6') },
    { f: [4,3,2,1],   n:'SOFV659', m:4032666, s:G('1ZzIwV6H093ZfbN55y1-CIR3n8VL4ZqCB') },
  ]},
  { p: 'Minigranja Solar La Paz Vallenata', r: [
    { f: [12,11,10,9], n:'SOFV715', m:4032666, s:G('1EIA3Eosniu9mwEDqSCEZEw1K7Vvthqir') },
    { f: [8,7,6,5],   n:'SOFV698', m:4032666, s:G('10Rkg_4eIfHFVufK4AFzsLdbk4pN-d8od') },
    { f: [4,3,2,1],   n:'SOFV652', m:4032666, s:G('1Kv9u8lgBSMw2QRh8qaVHHqNzBBY-ja-M') },
  ]},
  { p: 'Minigranja Solar La Paz Verso', r: [
    { f: [12,11,10,9], n:'SOFV717', m:4032666, s:G('12gjNroHpuU1BqS4P3zTK_YU1z_8DehKO') },
    { f: [8,7,6,5],   n:'SOFV696', m:4032666, s:G('1saIeEg_dONt3ec2d_VBWo5VNOlIeBsFK') },
    { f: [4,3,2,1],   n:'SOFV654', m:4032666, s:G('1OC_UHAnZAGRqrX5Go59-TpifsCCA6k_H') },
  ]},
  { p: 'Minigranja Solar La Puya', r: [
    { f: [12,11,10,9], n:'SOFV721', m:4032666, s:G('1eXIY8jxmJEc12m8WgsjI4PmsJZ0BZJxK') },
    { f: [8,7,6,5],   n:'SOFV686', m:4032666, s:G('1G59ZdWy9YEDYHg4Bqq1dqYcvafikM19f') },
    { f: [4,3],       n:'SOFV660', m:4032666, s:G('1XVeZA2nb5PsBqoyflu-cpiBS7BhsxXFe') },
    { f: [2,1] },
  ]},
  { p: 'Minigranja Solar La Reserva', r: [
    { f: [12,11,10,9], n:'SOFV724', m:4112120, s:G('1iOa4g_PsW48pO7vKmor7rWnBvykzqfoE') },
    { f: [8,7,6,5],   n:'SOFV685', m:4112120, s:G('1uEqRvfrKHgT9ep7dfEWkzliwJ2zwRdf1') },
    { f: [4,3,2,1] },
  ]},
  { p: 'Minigranja Solar Merengue', r: [
    { f: [12,11,10,9], n:'SOFV720', m:4032666, s:G('1zP_f9y2t9QMK-2FE1BryPJI2HdF5bkm0') },
    { f: [8,7,6,5],   n:'SOFV699', m:4032666, s:G('1Ko4qXpkSiP2HNrcZwGsOq4GZh7KLSOSp') },
    { f: [4],         n:'SOFV658', m:4032666, s:L('1z0-YJzD4M5SZlYw6-U6wfdbqrFONrKvl') },
    { f: [3,2,1] },
  ]},
  { p: 'Minigranja Solar Perijá', r: [
    { f: [12,11,10,9], n:'SOFV714', m:4032666, s:G('1xJRCDl1Lli1jtcy-HT8wJxjTfdGjCDDJ') },
    { f: [8,7,6,5],   n:'SOFV691', m:4032666, s:G('1xjY8fHzj6pMNF6BJhj1J9ZwVHdOYIUIn') },
    { f: [4,3,2,1],   n:'SOFV651', m:4032666, s:G('1ujM-LJC6A4f05SD1dvP6pGdSrWoev5Es') },
  ]},
  { p: 'Minigranja Solar Uruaco', r: [
    { f: [12,11,10,9], n:'SOFV709', m:2479358, s:G('1qqxVmcHHqQbj0QQOtINzWonW4yS3L7Y9') },
    { f: [8,7,6,5],   n:'SOFV688', m:2479358, s:G('1yZQyOyIg-a8E6ty4_qXfkiPvAtiqAZIp') },
    { f: [4,3,2,1],   n:'SOFV648', m:2479358, s:G('1d1ypYOYiL6xCJZQhML_dvMC0tt0KxFEY') },
  ]},
  { p: 'Minigranja Solar Villanueva', r: [
    { f: [12,11,10,9], n:'SOFV719', m:4032666, s:G('1voprhGAnT9rSB6roK-eIdAYJG6CMHZLL') },
    { f: [8,7,6,5],   n:'SOFV694', m:4032666, s:G('1-lrl6xiC-7O5cdG553RsGVUcq1Iku9jV') },
    { f: [4],         n:'SOFV656', m:4032666, s:G('18JnJoNGcYKBkEtlG9V3ELliwQ56FOWhV') },
    { f: [3,2,1] },
  ]},
]

const _flat = _D.flatMap(({ p, r }) =>
  r.flatMap(({ f, n, m, s }) =>
    f.map(mo => ({
      proyecto:       p,
      fecha:          `2025-${String(mo).padStart(2, '0')}`,
      numero_factura: n ?? null,
      monto:          m ?? null,
      enlace_soporte: s ?? null,
    }))
  )
)

export default _flat.map((rec, i) => ({ id: `s${i}`, ...rec }))
