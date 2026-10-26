export type CatM2SnapshotStore = {
  name: string;
  squareMeters: number;
  sales: number;
  salesPerM2: number;
  operatingResult: number;
  operatingResultPerM2: number;
  productMix: [number, number, number] | null;
};

export const catM2SnapshotTotals = {
  sales: 20333,
  operatingResult: 2489,
  squareMeters: 3460,
};

export const catM2SnapshotStores: CatM2SnapshotStore[] = [
  { name: "CAT Alto Las Condes", squareMeters: 92, sales: 387, salesPerM2: 4205, operatingResult: -81, operatingResultPerM2: -877, productMix: [59, 30, 10] },
  { name: "CAT Arauco Maipú", squareMeters: 66, sales: 495, salesPerM2: 7499, operatingResult: 52, operatingResultPerM2: 793, productMix: [62, 28, 10] },
  { name: "CAT Buenaventura", squareMeters: 89, sales: 627, salesPerM2: 7045, operatingResult: 37, operatingResultPerM2: 412, productMix: [53, 38, 9] },
  { name: "CAT Centro Concepción", squareMeters: 71, sales: 386, salesPerM2: 5433, operatingResult: 21, operatingResultPerM2: 289, productMix: [62, 26, 12] },
  { name: "CAT Costanera Center", squareMeters: 156, sales: 1272, salesPerM2: 8152, operatingResult: 208, operatingResultPerM2: 1333, productMix: [56, 32, 13] },
  { name: "CAT Curicó", squareMeters: 124, sales: 606, salesPerM2: 4884, operatingResult: 94, operatingResultPerM2: 760, productMix: [58, 33, 9] },
  { name: "CAT Florida Center", squareMeters: 86, sales: 354, salesPerM2: 4119, operatingResult: -17, operatingResultPerM2: -203, productMix: [63, 25, 11] },
  { name: "CAT Independencia", squareMeters: 81, sales: 285, salesPerM2: 3518, operatingResult: -26, operatingResultPerM2: -320, productMix: [60, 25, 16] },
  { name: "CAT La Fábrica", squareMeters: 205, sales: 460, salesPerM2: 2243, operatingResult: -25, operatingResultPerM2: -121, productMix: [48, 43, 9] },
  { name: "CAT Mall Talca", squareMeters: 114, sales: 510, salesPerM2: 4471, operatingResult: 61, operatingResultPerM2: 533, productMix: [71, 19, 10] },
  { name: "CAT Marina Arauco", squareMeters: 96, sales: 649, salesPerM2: 6765, operatingResult: 116, operatingResultPerM2: 1212, productMix: [65, 27, 8] },
  { name: "CAT Parque Arauco", squareMeters: 80, sales: 700, salesPerM2: 8720, operatingResult: 114, operatingResultPerM2: 1417, productMix: [62, 26, 11] },
  { name: "CAT Paseo Chiloé", squareMeters: 95, sales: 596, salesPerM2: 6246, operatingResult: 96, operatingResultPerM2: 1010, productMix: [59, 31, 11] },
  { name: "CAT Paseo Costanera", squareMeters: 94, sales: 717, salesPerM2: 7627, operatingResult: 173, operatingResultPerM2: 1837, productMix: [66, 25, 9] },
  { name: "CAT Paseo Valdivia", squareMeters: 66, sales: 0, salesPerM2: 0, operatingResult: 0, operatingResultPerM2: 0, productMix: null },
  { name: "CAT Plaza Antofagasta", squareMeters: 77, sales: 815, salesPerM2: 10582, operatingResult: 168, operatingResultPerM2: 2185, productMix: [57, 29, 15] },
  { name: "CAT Plaza Calama", squareMeters: 108, sales: 590, salesPerM2: 5465, operatingResult: 64, operatingResultPerM2: 591, productMix: [50, 33, 17] },
  { name: "CAT Plaza Copiapó", squareMeters: 129, sales: 620, salesPerM2: 4803, operatingResult: 120, operatingResultPerM2: 932, productMix: [58, 28, 15] },
  { name: "CAT Plaza El Roble", squareMeters: 87, sales: 851, salesPerM2: 9777, operatingResult: 174, operatingResultPerM2: 1996, productMix: [69, 21, 10] },
  { name: "CAT Plaza Iquique", squareMeters: 84, sales: 513, salesPerM2: 6103, operatingResult: 55, operatingResultPerM2: 656, productMix: [56, 30, 14] },
  { name: "CAT Plaza La Serena", squareMeters: 92, sales: 859, salesPerM2: 9311, operatingResult: 193, operatingResultPerM2: 2091, productMix: [59, 29, 12] },
  { name: "CAT Plaza Los Ángeles", squareMeters: 71, sales: 529, salesPerM2: 7458, operatingResult: 51, operatingResultPerM2: 721, productMix: [48, 38, 13] },
  { name: "CAT Plaza Norte", squareMeters: 90, sales: 396, salesPerM2: 4378, operatingResult: -25, operatingResultPerM2: -275, productMix: [61, 27, 11] },
  { name: "CAT Plaza Sur", squareMeters: 54, sales: 387, salesPerM2: 7161, operatingResult: 34, operatingResultPerM2: 633, productMix: [54, 34, 12] },
  { name: "CAT Plaza Tobalaba", squareMeters: 91, sales: 439, salesPerM2: 4827, operatingResult: 26, operatingResultPerM2: 287, productMix: [58, 29, 13] },
  { name: "CAT Plaza Vespucio", squareMeters: 190, sales: 676, salesPerM2: 3557, operatingResult: 52, operatingResultPerM2: 276, productMix: [68, 21, 10] },
  { name: "CAT Portal El Llano", squareMeters: 78, sales: 369, salesPerM2: 4736, operatingResult: -18, operatingResultPerM2: -236, productMix: [45, 40, 16] },
  { name: "CAT Portal Ñuñoa", squareMeters: 96, sales: 168, salesPerM2: 1762, operatingResult: -58, operatingResultPerM2: -602, productMix: [55, 32, 13] },
  { name: "CAT Portal Osorno", squareMeters: 62, sales: 608, salesPerM2: 9808, operatingResult: 109, operatingResultPerM2: 1756, productMix: [59, 30, 11] },
  { name: "CAT Portal Rancagua", squareMeters: 82, sales: 662, salesPerM2: 8076, operatingResult: 86, operatingResultPerM2: 1048, productMix: [57, 32, 11] },
  { name: "CAT Portal Temuco", squareMeters: 61, sales: 1110, salesPerM2: 18194, operatingResult: 292, operatingResultPerM2: 4790, productMix: [62, 29, 9] },
  { name: "CAT Pza. El Trébol", squareMeters: 100, sales: 1110, salesPerM2: 11114, operatingResult: 290, operatingResultPerM2: 2898, productMix: [61, 30, 9] },
  { name: "CAT Pza. Los Dominicos", squareMeters: 92, sales: 96, salesPerM2: 1043, operatingResult: -68, operatingResultPerM2: -737, productMix: [56, 32, 11] },
  { name: "CAT Pza. Egaña", squareMeters: 122, sales: 473, salesPerM2: 3868, operatingResult: 16, operatingResultPerM2: 130, productMix: [68, 21, 11] },
  { name: "CAT Pza. Oeste", squareMeters: 95, sales: 510, salesPerM2: 5371, operatingResult: 47, operatingResultPerM2: 497, productMix: [66, 26, 8] },
  { name: "CAT Valdivia", squareMeters: 83, sales: 509, salesPerM2: 6128, operatingResult: 57, operatingResultPerM2: 690, productMix: [57, 33, 10] },
];