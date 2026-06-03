/**
 * Datos estáticos de contratos CGM y Representación por proyecto e inversionista.
 * Fuente: Data/contratosCGM.json — sección "Indexación".
 * Unidad de tarifas: $/kWh.
 */

const CONTRATOS_CGM = [
  // ── La Reserva ──────────────────────────────────────────────────────────────
  {
    proyecto: 'Minigranja 0012 - La Reserva',
    codigoSunFactory: 'COLSANT9P1',
    portafolio: 'Suno - Solenium - Sandra Estrada',
    inversionista: 'Strada Asociados S.A.S.',
    estado: 'Operación',
    tarifaAdmin: 0.038,
    fechaFirma: '2024-04-02',
    soporte: 'https://drive.google.com/file/d/1MJ-zyaEgVIKiqy4XbLjakmYoI3h2Mr0u/view?usp=drive_link',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
  },
  {
    proyecto: 'Minigranja 0012 - La Reserva',
    codigoSunFactory: 'COLSANT9P1',
    portafolio: 'Suno - Solenium - Sandra Estrada',
    inversionista: 'Inversiones Estrada Arbelaez y CIA S. en C.',
    estado: 'Operación',
    tarifaAdmin: 0.038,
    fechaFirma: '2024-04-02',
    soporte: 'https://drive.google.com/file/d/18Cx6N_dB1GghULWok9SzGu79XFw47V/view?usp=drive_link',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
  },

  // ── GD NAOS 1 ───────────────────────────────────────────────────────────────
  {
    proyecto: 'GD NAOS 1',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'GD EL REMOLINO 1 S.A.S. E.S.P',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2024-07-17',
    soporte: 'https://drive.google.com/file/d/1u0-xNyfdvhwZk3AokNyFsGjzn8PNfgtO/view?usp=sharing',
    cgm: {
      tarifaBase: 7,
      indexaciones: [
        { año: 2024, ipc: null, valor: 7,          esBase: true },
        { año: 2025, ipc: 5.2,  valor: 7.364 },
        { año: 2026, ipc: 5.1,  valor: 7.739564 },
      ],
    },
    representacion: {
      tarifaBase: 3,
      indexaciones: [
        { año: 2024, ipc: null, valor: 3,          esBase: true },
        { año: 2025, ipc: 5.2,  valor: 3.156 },
        { año: 2026, ipc: 5.1,  valor: 3.316956 },
      ],
    },
  },

  // ── El Son ──────────────────────────────────────────────────────────────────
  {
    proyecto: 'Minigranja 0015 - El Son',
    codigoSunFactory: 'COLCEST45P1',
    portafolio: 'Suno - Solenium',
    inversionista: 'Nacional de Transformadores S.A.S.',
    estado: 'Operación',
    tarifaAdmin: 0.038,
    fechaFirma: '2024-08-09',
    soporte: 'https://drive.google.com/file/d/1mNHMt12XnT8rvGnxhE3a7Ub9MEQsQWn1/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
  },
  {
    proyecto: 'Minigranja 0015 - El Son',
    codigoSunFactory: 'COLCEST45P1',
    portafolio: 'Suno - Solenium',
    inversionista: 'Unergy S.A.S',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: null,
    soporte: null,
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
  },

  // ── Baraya ──────────────────────────────────────────────────────────────────
  {
    proyecto: 'Minigranja 0002 - Baraya',
    codigoSunFactory: 'COLSUCT17P2',
    portafolio: 'Suno - Solenium',
    inversionista: 'Solenium S.A.S',
    estado: 'Operación',
    tarifaAdmin: 0.038,
    fechaFirma: '2024-01-19',
    soporte: 'https://drive.google.com/file/d/1kWhy9drgx7z81URpYJ3ZjfWnj5h6GeYA/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
  },
  {
    proyecto: 'Minigranja 0002 - Baraya',
    codigoSunFactory: 'COLSUCT17P2',
    portafolio: 'Suno - Solenium',
    inversionista: 'SOMOS BOGOTÁ USME SAS',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: null,
    soporte: null,
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
  },
  {
    proyecto: 'Minigranja 0002 - Baraya',
    codigoSunFactory: 'COLSUCT17P2',
    portafolio: 'Suno - Solenium',
    inversionista: 'Unergy S.A.S',
    estado: 'Operación',
    tarifaAdmin: 0.038,
    fechaFirma: null,
    soporte: null,
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
  },

  // ── La Cacica ───────────────────────────────────────────────────────────────
  {
    proyecto: 'Minigranja 0040 - La Cacica',
    codigoSunFactory: 'COLCEST55P1',
    portafolio: 'Serranía de Perijá',
    inversionista: 'Ayurá S.A.S.',
    estado: 'Operación',
    tarifaAdmin: 0.038,
    fechaFirma: null,
    soporte: null,
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
  },

  // ── Las Piloneras ───────────────────────────────────────────────────────────
  {
    proyecto: 'Minigranja 0041 - Las piloneras',
    codigoSunFactory: 'COLCEST55P2',
    portafolio: 'Serranía de Perijá',
    inversionista: 'Ayurá S.A.S.',
    estado: 'Operación',
    tarifaAdmin: 0.038,
    fechaFirma: null,
    soporte: null,
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
  },

  // ── Chimá Oriente ───────────────────────────────────────────────────────────
  {
    proyecto: 'Minigranja 0030 - Chimá Oriente',
    codigoSunFactory: 'COLCORT7P1',
    portafolio: 'Cox',
    inversionista: 'Solenium S.A.S',
    estado: 'Construcción',
    tarifaAdmin: 0.038,
    fechaFirma: null,
    soporte: null,
    cgm: {
      tarifaBase: 0,
      indexaciones: [],
    },
    representacion: {
      tarifaBase: 0,
      indexaciones: [],
    },
  },
  {
    proyecto: 'Minigranja 0030 - Chimá Oriente',
    codigoSunFactory: 'COLCORT7P1',
    portafolio: 'Cox',
    inversionista: 'Ayurá S.A.S.',
    estado: 'Construcción',
    tarifaAdmin: 0.038,
    fechaFirma: null,
    soporte: null,
    cgm: {
      tarifaBase: 0,
      indexaciones: [],
    },
    representacion: {
      tarifaBase: 0,
      indexaciones: [],
    },
  },

  // ── Ibirico ─────────────────────────────────────────────────────────────────
  {
    proyecto: 'Minigranja 0021 - Ibirico',
    codigoSunFactory: 'COLCEST49P2',
    portafolio: 'Kai',
    inversionista: 'FIDEICOMISOS BBVA ASSET MANAGEMENT S. A. SOCIEDAD FIDUCIARIA',
    estado: 'Operación',
    tarifaAdmin: 0.038,
    fechaFirma: null,
    soporte: null,
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
  },

  // ── El Mapalé ───────────────────────────────────────────────────────────────
  {
    proyecto: 'Minigranja 0020 - El Mapalé',
    codigoSunFactory: 'COLCEST45P6',
    portafolio: 'Kai',
    inversionista: 'FIDEICOMISOS BBVA ASSET MANAGEMENT S. A. SOCIEDAD FIDUCIARIA',
    estado: 'Construcción',
    tarifaAdmin: 0.038,
    fechaFirma: null,
    soporte: null,
    cgm: {
      tarifaBase: 0,
      indexaciones: [],
    },
    representacion: {
      tarifaBase: 0,
      indexaciones: [],
    },
  },

  // ── Chiriguaná Norte 2 ──────────────────────────────────────────────────────
  {
    proyecto: 'Minigranja 0075 - Chiriguaná Norte 2',
    codigoSunFactory: 'COLCEST60P4',
    portafolio: 'Skandia',
    inversionista: 'PATRIMONIOS AUTONOMOS SKANDIA SOCIEDAD FIDUCIARIA S.A.',
    estado: 'Operación',
    tarifaAdmin: 0.038,
    fechaFirma: null,
    soporte: null,
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
  },

  // ── Chiriguaná Norte 4 ──────────────────────────────────────────────────────
  {
    proyecto: 'Minigranja 0077 - Chiriguaná Norte 4',
    codigoSunFactory: 'COLCEST60P2',
    portafolio: 'Skandia',
    inversionista: 'PATRIMONIOS AUTONOMOS SKANDIA SOCIEDAD FIDUCIARIA S.A.',
    estado: 'Operación',
    tarifaAdmin: 0.038,
    fechaFirma: null,
    soporte: null,
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6,        esBase: true },
        { año: 2025, ipc: 5.2,  valor: 6.312 },
        { año: 2026, ipc: 5.1,  valor: 6.633912 },
      ],
    },
  },

  // ── GD Marimonda ────────────────────────────────────────────────────────────
  {
    proyecto: 'GD Marimonda',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'LA HORMIGA SOLAR S.A.S. E.S.P.',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-03-17',
    soporte: 'https://drive.google.com/file/d/1uUIroNjUcCJdNiqcSpu3LRV3a7n8yDgH/view?usp=drive_link',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── MGS Naos 2 ──────────────────────────────────────────────────────────────
  {
    proyecto: 'MGS Naos 2',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'GD EL REMOLINO 1 S.A.S. E.S.P',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-02-20',
    soporte: 'https://drive.google.com/file/d/1Rjy0dVYdqcHsVU6tDtM7JQdXGdY8wMzg/view?usp=sharing',
    cgm: {
      tarifaBase: 7,
      indexaciones: [
        { año: 2025, ipc: null, valor: 7,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 7.357 },
      ],
    },
    representacion: {
      tarifaBase: 3,
      indexaciones: [
        { año: 2025, ipc: null, valor: 3,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 3.153 },
      ],
    },
  },

  // ── MGS Naos 3 ──────────────────────────────────────────────────────────────
  {
    proyecto: 'MGS Naos 3',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'GD EL REMOLINO 1 S.A.S. E.S.P',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-04-04',
    soporte: 'https://drive.google.com/file/d/1E7BQ5LzLs0vKNXQKJ1QfxbEOV6R9Qsjl/view?usp=sharing',
    cgm: {
      tarifaBase: 7,
      indexaciones: [
        { año: 2025, ipc: null, valor: 7,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 7.357 },
      ],
    },
    representacion: {
      tarifaBase: 3,
      indexaciones: [
        { año: 2025, ipc: null, valor: 3,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 3.153 },
      ],
    },
  },

  // ── Bayunca ─────────────────────────────────────────────────────────────────
  {
    proyecto: 'Bayunca',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'PARQUE EOLICO DE GALERAZAMBA S.A.S.',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-04-07',
    soporte: 'https://drive.google.com/file/d/1BHe5yoiPT9t-tBIJCLnKbREvtscu7PHx/view?usp=sharing',
    cgm: {
      tarifaBase: 0,
      indexaciones: [
        { año: 2025, ipc: null, valor: 0, esBase: true },
        { año: 2026, ipc: 5.1,  valor: 0 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── GD Delta 1 ──────────────────────────────────────────────────────────────
  {
    proyecto: 'GD Delta 1',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'GRANJAS SOLARES DELTA S.A.S. E.S.P',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-06-11',
    soporte: 'https://drive.google.com/file/d/1JD8jRf8UUs9PwVDpStfcF2XuCerHQyVh/view?usp=sharing',
    cgm: {
      tarifaBase: 7,
      indexaciones: [
        { año: 2025, ipc: null, valor: 7,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 7.357 },
      ],
    },
    representacion: {
      tarifaBase: 3,
      indexaciones: [
        { año: 2025, ipc: null, valor: 3,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 3.153 },
      ],
    },
  },

  // ── GD Polaris 1 ────────────────────────────────────────────────────────────
  {
    proyecto: 'GD Polaris 1',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'GRANJA SOLAR POLARIS ENERGY S.A.S.',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-06-11',
    soporte: 'https://drive.google.com/file/d/1dbTdzyy0v5nepdtILhwcYIODp8a0eoZJ/view?usp=sharing',
    cgm: {
      tarifaBase: 7,
      indexaciones: [
        { año: 2025, ipc: null, valor: 7,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 7.357 },
      ],
    },
    representacion: {
      tarifaBase: 3,
      indexaciones: [
        { año: 2025, ipc: null, valor: 3,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 3.153 },
      ],
    },
  },

  // ── GD Sirius ───────────────────────────────────────────────────────────────
  {
    proyecto: 'GD Sirius',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'QUANTUM ENERGY INGENIERÍA S.A.S',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-06-09',
    soporte: 'https://drive.google.com/file/d/1KcgA0iKTJWkiWBp1h6EAg0CArVijcUL3/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── GD Biosolar ─────────────────────────────────────────────────────────────
  {
    proyecto: 'GD Biosolar',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'INVERSIONES BIOSOSTENIBLES S.A.S.',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-06-09',
    soporte: 'https://drive.google.com/file/d/10eR0HhJZu2SQn0h8UIhGtdUox3bXcZOU/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── GD Astrolumen La Garita ─────────────────────────────────────────────────
  {
    proyecto: 'GD Astrolumen La Garita',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'Energy Investment Group SAS',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-06-09',
    soporte: 'https://drive.google.com/file/d/1Wo6gmts3B1JXMlDtBVfOP88MgzDqrNP_/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── GD Agustin 1 ────────────────────────────────────────────────────────────
  {
    proyecto: 'GD Agustin 1',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'FONSAR S.A.S.',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-06-09',
    soporte: 'https://drive.google.com/file/d/1dRZdu-aiRFC9ghULWok9SzGu79XFw47V/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── GD 1MVA SAN ONOFRE ──────────────────────────────────────────────────────
  {
    proyecto: 'GD 1MVA SAN ONOFRE',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'NOVAVALOR ENERGY SAS',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-07-12',
    soporte: 'https://drive.google.com/file/d/1HgFGQzBVE51WtdQkt3KvQ9Sgav1dZQhH/view?usp=sharing',
    cgm: {
      tarifaBase: 0,
      indexaciones: [
        { año: 2025, ipc: null, valor: 0, esBase: true },
        { año: 2026, ipc: 5.1,  valor: 0 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── GD delta 2 ──────────────────────────────────────────────────────────────
  {
    proyecto: 'GD delta 2',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'GRANJAS SOLARES DELTA S.A.S. E.S.P',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-08-25',
    soporte: 'https://drive.google.com/file/d/1arn43qJMevk8nSCbHpdyDprO24ekseNQ/view?usp=sharing',
    cgm: {
      tarifaBase: 7,
      indexaciones: [
        { año: 2025, ipc: null, valor: 7,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 7.357 },
      ],
    },
    representacion: {
      tarifaBase: 3,
      indexaciones: [
        { año: 2025, ipc: null, valor: 3,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 3.153 },
      ],
    },
  },

  // ── GD Yuan Solar ───────────────────────────────────────────────────────────
  {
    proyecto: 'GD Yuan Solar',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'FEM ENERGÍA S.A.S.',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-08-09',
    soporte: 'https://drive.google.com/file/d/12SUYJsDy3K7WmNjN-l0CKYzPqLq9p9PO/view?usp=sharing',
    cgm: {
      tarifaBase: 5,
      indexaciones: [
        { año: 2025, ipc: null, valor: 5,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 5.255 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── La Catedral ─────────────────────────────────────────────────────────────
  {
    proyecto: 'La Catedral',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'PELLETCO S.A.S.',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-08-22',
    soporte: 'https://drive.google.com/file/d/1NOxvjvr8Zo6lISXvZj1Ap8KGUjcOfAFt/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── GD Polaris 2 ────────────────────────────────────────────────────────────
  {
    proyecto: 'GD Polaris 2',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'GRANJA SOLAR POLARIS 2 S.A.S.',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-09-02',
    soporte: 'https://drive.google.com/file/d/1Al9HvwvdGeC3tJGxc9S1UaJeU-0sr2Yo/view?usp=sharing',
    cgm: {
      tarifaBase: 7,
      indexaciones: [
        { año: 2025, ipc: null, valor: 7,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 7.357 },
      ],
    },
    representacion: {
      tarifaBase: 3,
      indexaciones: [
        { año: 2025, ipc: null, valor: 3,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 3.153 },
      ],
    },
  },

  // ── GD San Pelayo ───────────────────────────────────────────────────────────
  {
    proyecto: 'GD San Pelayo',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'SAMBA SOLAR S.A.S.',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-09-05',
    soporte: 'https://drive.google.com/file/d/1M9xdHMsjPan5unAiI01elbvWkB9oz4WN/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── Monterrey ───────────────────────────────────────────────────────────────
  {
    proyecto: 'Monterrey',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'EXTRACTORA MONTERREY S.A.S',
    estado: 'Construcción',
    tarifaAdmin: null,
    fechaFirma: '2025-10-17',
    soporte: 'https://drive.google.com/file/d/1XpkmrCBtXP1-G84VHI7VI8uk897WG1ts/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── PSF - Yurbaqua ──────────────────────────────────────────────────────────
  {
    proyecto: 'PSF - Yurbaqua',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'ENEXA ENERGY S.A.S.',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-08-20',
    soporte: 'https://drive.google.com/file/d/1D2F-_DM9UB5iLzL6wAeYA_03q6XHAzlu/view?usp=sharing',
    cgm: {
      tarifaBase: 5,
      indexaciones: [
        { año: 2025, ipc: null, valor: 5,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 5.255 },
      ],
    },
    representacion: {
      tarifaBase: 5,
      indexaciones: [
        { año: 2025, ipc: null, valor: 5,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 5.255 },
      ],
    },
  },

  // ── Sol Y Cielo 7 Los Bongos ────────────────────────────────────────────────
  {
    proyecto: 'Sol Y Cielo 7 Los Bongos',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'INENERGY S.A.S',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-11-19',
    soporte: 'https://drive.google.com/file/d/1Y4X_uqmtI6Xr9fizffVYHkIngnaiwyQa/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── GD La Hormiga ───────────────────────────────────────────────────────────
  {
    proyecto: 'GD La Hormiga',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'BALI ENERGY S.A.S.',
    estado: 'Construcción',
    tarifaAdmin: null,
    fechaFirma: '2025-11-19',
    soporte: 'https://drive.google.com/file/d/1VowW9ZZqlW96GQ7d8UxzsIZ8m7fpRMqq/view?usp=drive_link',
    cgm: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2025, ipc: null, valor: 5.5,    esBase: true },
        { año: 2026, ipc: 5.1,  valor: 5.7805 },
      ],
    },
    representacion: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2025, ipc: null, valor: 5.5,    esBase: true },
        { año: 2026, ipc: 5.1,  valor: 5.7805 },
      ],
    },
  },

  // ── Sol&Cielo 9 - Ciénaga ───────────────────────────────────────────────────
  {
    proyecto: 'Sol&Cielo 9 - Ciénaga',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'INENERGY S.A.S',
    estado: 'Operación',
    tarifaAdmin: null,
    fechaFirma: '2025-11-19',
    soporte: 'https://drive.google.com/file/d/1L0MbDmQF5VE53Z03o3yDSNeXLy1Qqzf0/view?usp=drive_link',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2025, ipc: null, valor: 6,     esBase: true },
        { año: 2026, ipc: 5.1,  valor: 6.306 },
      ],
    },
  },

  // ── Taurus VIII ─────────────────────────────────────────────────────────────
  {
    proyecto: 'Taurus VIII',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'CUMBIA SOLAR S.A.S.',
    estado: null,
    tarifaAdmin: null,
    fechaFirma: '2025-12-22',
    soporte: 'https://drive.google.com/file/d/1K1WyQqXsE1v2Vr_RIuJdt-6ZbvaI1Tfq/view?usp=sharing',
    cgm: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2025, ipc: null, valor: 5.5,    esBase: true },
        { año: 2026, ipc: 5.1,  valor: 5.7805 },
      ],
    },
    representacion: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2025, ipc: null, valor: 5.5,    esBase: true },
        { año: 2026, ipc: 5.1,  valor: 5.7805 },
      ],
    },
  },

  // ── Taurus IX ───────────────────────────────────────────────────────────────
  {
    proyecto: 'Taurus IX',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'FLAUTA SOLAR SAS',
    estado: null,
    tarifaAdmin: null,
    fechaFirma: '2025-12-22',
    soporte: 'https://drive.google.com/file/d/14u3Wf7fAP7EmtYInWP6N9UP1YDcH3XwK/view?usp=sharing',
    cgm: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2025, ipc: null, valor: 5.5,    esBase: true },
        { año: 2026, ipc: 5.1,  valor: 5.7805 },
      ],
    },
    representacion: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2025, ipc: null, valor: 5.5,    esBase: true },
        { año: 2026, ipc: 5.1,  valor: 5.7805 },
      ],
    },
  },

  // ── Taurus X ────────────────────────────────────────────────────────────────
  {
    proyecto: 'Taurus X',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'ACORDEON SOLAR S.A.S.',
    estado: null,
    tarifaAdmin: null,
    fechaFirma: '2025-12-22',
    soporte: 'https://drive.google.com/file/d/13JqZAxX_HI0G3WRCp5mL9FraSSdnPr52/view?usp=sharing',
    cgm: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2025, ipc: null, valor: 5.5,    esBase: true },
        { año: 2026, ipc: 5.1,  valor: 5.7805 },
      ],
    },
    representacion: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2025, ipc: null, valor: 5.5,    esBase: true },
        { año: 2026, ipc: 5.1,  valor: 5.7805 },
      ],
    },
  },

  // ── GD Garza ────────────────────────────────────────────────────────────────
  {
    proyecto: 'GD Garza',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'PULOI SOLAR S.A.S',
    estado: null,
    tarifaAdmin: null,
    fechaFirma: '2026-01-22',
    soporte: 'https://drive.google.com/file/d/1nXWG8ZiwUVZm9LcwydXU7IcDAyuLICU8/view?usp=sharing',
    cgm: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2026, ipc: null, valor: 5.5, esBase: true },
      ],
    },
    representacion: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2026, ipc: null, valor: 5.5, esBase: true },
      ],
    },
  },

  // ── La Perdiz ───────────────────────────────────────────────────────────────
  {
    proyecto: 'La Perdiz',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'MONOCUCO SOLAR S.A.S.',
    estado: null,
    tarifaAdmin: null,
    fechaFirma: '2026-01-22',
    soporte: 'https://drive.google.com/file/d/1vT2OAng0d5SgXMJXFsARBHVTTodf3uyE/view?usp=sharing',
    cgm: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2026, ipc: null, valor: 5.5, esBase: true },
      ],
    },
    representacion: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2026, ipc: null, valor: 5.5, esBase: true },
      ],
    },
  },

  // ── GD El Mandarino ─────────────────────────────────────────────────────────
  {
    proyecto: 'GD El Mandarino',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'LAS FAROTAS SOLAR S.A.S',
    estado: null,
    tarifaAdmin: null,
    fechaFirma: '2026-02-03',
    soporte: 'https://drive.google.com/file/d/1ogA7nVDa4muew6s1aeh3CuXJdZN8MRJE/view?usp=sharing',
    cgm: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2026, ipc: null, valor: 5.5, esBase: true },
      ],
    },
    representacion: {
      tarifaBase: 5.5,
      indexaciones: [
        { año: 2026, ipc: null, valor: 5.5, esBase: true },
      ],
    },
  },

  // ── GD Isabela ──────────────────────────────────────────────────────────────
  {
    proyecto: 'GD Isabela',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'JHON JAIME CASTRO CHAPARRO',
    estado: null,
    tarifaAdmin: null,
    fechaFirma: '2026-02-13',
    soporte: 'https://drive.google.com/file/d/1Bs870ApgaiXu8oX2c-7MiuH20Mx71ipk/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2026, ipc: null, valor: 6, esBase: true },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2026, ipc: null, valor: 6, esBase: true },
      ],
    },
  },

  // ── GD ELEKTRA ──────────────────────────────────────────────────────────────
  {
    proyecto: 'GD ELEKTRA',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'QUANTUM ENERGY INGENIERIA S.A.S',
    estado: null,
    tarifaAdmin: null,
    fechaFirma: '2026-03-12',
    soporte: 'https://drive.google.com/file/d/1ha7tiY1QEgU99SvgxWqxW75BAbI49Pz9/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2026, ipc: null, valor: 6, esBase: true },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2026, ipc: null, valor: 6, esBase: true },
      ],
    },
  },

  // ── Agustín 2 ───────────────────────────────────────────────────────────────
  {
    proyecto: 'Agustín 2',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'FONSAR S.A.S.',
    estado: null,
    tarifaAdmin: null,
    fechaFirma: '2026-03-12',
    soporte: 'https://drive.google.com/file/d/1OIO4dGe1Dqi-5fa4ZWaAE8lyUZSmiX9K/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2026, ipc: null, valor: 6, esBase: true },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2026, ipc: null, valor: 6, esBase: true },
      ],
    },
  },

  // ── Agustín 3 ───────────────────────────────────────────────────────────────
  {
    proyecto: 'Agustín 3',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'FONSAR S.A.S.',
    estado: null,
    tarifaAdmin: null,
    fechaFirma: '2026-03-12',
    soporte: 'https://drive.google.com/file/d/1tHc1YpqCgeKOfa77F18OxNRR0XfmWp1t/view?usp=sharing',
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2026, ipc: null, valor: 6, esBase: true },
      ],
    },
    representacion: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2026, ipc: null, valor: 6, esBase: true },
      ],
    },
  },

  // ── MGS 0011 El Roble ───────────────────────────────────────────────────────
  {
    proyecto: 'MGS 0011 El Roble',
    codigoSunFactory: null,
    portafolio: null,
    inversionista: 'PROMOTORA DE ENERGIA ELECTRICA DE CARTAGENA S.A.S E.S.P.',
    estado: null,
    tarifaAdmin: null,
    fechaFirma: null,
    soporte: null,
    cgm: {
      tarifaBase: 6,
      indexaciones: [
        { año: 2024, ipc: null, valor: 6, esBase: true },
      ],
    },
    representacion: {
      tarifaBase: null,
      indexaciones: [],
    },
  },
]

export default CONTRATOS_CGM
