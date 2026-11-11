export type ProductivitySnapshotSeptemberRow = {
  brand: string;
  cut: "MENSUAL" | "ACUMULADO";
  metric: "VENTA SSS" | "VENTA UF M2" | "MARGEN UF M2" | "RENTABILIDAD UF M2";
  actual: number;
  budget: number;
  prior: number;
};

export const productivitySnapshotSeptember2026 = {
  year: 2026,
  month: 9,
  source: "Same Store Sale_092026 + Informe UF m2_Septiembre 2026 (snapshot Google Drive)",
  rows: [
  {
    "brand": "7VEINTE",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 3.8,
    "budget": 5,
    "actual": 2.7
  },
  {
    "brand": "7VEINTE",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.6,
    "budget": 1.2,
    "actual": -1.1
  },
  {
    "brand": "7VEINTE",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 1974.541,
    "budget": 0,
    "actual": 1701.399
  },
  {
    "brand": "7VEINTE",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 7,
    "budget": 9,
    "actual": 0
  },
  {
    "brand": "7VEINTE",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 2.4,
    "budget": 3.8,
    "actual": 1.8
  },
  {
    "brand": "7VEINTE",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.84,
    "budget": 1.45,
    "actual": -1.62
  },
  {
    "brand": "7VEINTE",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 176.188,
    "budget": 0,
    "actual": 120.001
  },
  {
    "brand": "7VEINTE",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 4.6,
    "budget": 6.8,
    "actual": 3.3
  },
  {
    "brand": "AZALEIA",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 6.3,
    "budget": 7,
    "actual": 6.5
  },
  {
    "brand": "AZALEIA",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.3,
    "budget": 1.3,
    "actual": -0.7
  },
  {
    "brand": "AZALEIA",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 3225.58,
    "budget": 0,
    "actual": 3106.585
  },
  {
    "brand": "AZALEIA",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 10.3,
    "budget": 11.3,
    "actual": 10.4
  },
  {
    "brand": "AZALEIA",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 4.3,
    "budget": 5.3,
    "actual": 3.2
  },
  {
    "brand": "AZALEIA",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -1.33,
    "budget": 1.17,
    "actual": -2.76
  },
  {
    "brand": "AZALEIA",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 233.271,
    "budget": 0,
    "actual": 158.424
  },
  {
    "brand": "AZALEIA",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 7,
    "budget": 8.2,
    "actual": 5
  },
  {
    "brand": "BILLABONG",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 2.4,
    "budget": 0,
    "actual": 0
  },
  {
    "brand": "BILLABONG",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -1.3,
    "budget": 0,
    "actual": 0
  },
  {
    "brand": "BILLABONG",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 0,
    "budget": 0,
    "actual": 0
  },
  {
    "brand": "BILLABONG",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 4.9,
    "budget": 0,
    "actual": 0
  },
  {
    "brand": "BILLABONG",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 0.5,
    "budget": 0,
    "actual": 0
  },
  {
    "brand": "BILLABONG",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.83,
    "budget": 0,
    "actual": 0
  },
  {
    "brand": "BILLABONG",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 0,
    "budget": 0,
    "actual": 0
  },
  {
    "brand": "BILLABONG",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 1.5,
    "budget": 0,
    "actual": 0
  },
  {
    "brand": "BSOUL",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 10.4,
    "budget": 11.2,
    "actual": 8
  },
  {
    "brand": "BSOUL",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 1.8,
    "budget": 1.4,
    "actual": -0.6
  },
  {
    "brand": "BSOUL",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 1434.782,
    "budget": 0,
    "actual": 1406.662
  },
  {
    "brand": "BSOUL",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 16.7,
    "budget": 18.1,
    "actual": 12.7
  },
  {
    "brand": "BSOUL",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 8.1,
    "budget": 12.2,
    "actual": 6.3
  },
  {
    "brand": "BSOUL",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 1.99,
    "budget": 1.65,
    "actual": -2.97
  },
  {
    "brand": "BSOUL",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 114.422,
    "budget": 0,
    "actual": 101.662
  },
  {
    "brand": "BSOUL",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 12.8,
    "budget": 19.9,
    "actual": 9.6
  },
  {
    "brand": "CATERPILLAR",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 7.6,
    "budget": 8.5,
    "actual": 6.4
  },
  {
    "brand": "CATERPILLAR",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 1.3,
    "budget": 1.8,
    "actual": 0.4
  },
  {
    "brand": "CATERPILLAR",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 14957.828,
    "budget": 0,
    "actual": 13214.226
  },
  {
    "brand": "CATERPILLAR",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 12.9,
    "budget": 14.5,
    "actual": 11
  },
  {
    "brand": "CATERPILLAR",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 6,
    "budget": 7.4,
    "actual": 4.5
  },
  {
    "brand": "CATERPILLAR",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.35,
    "budget": 1.28,
    "actual": -0.72
  },
  {
    "brand": "CATERPILLAR",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1204.062,
    "budget": 0,
    "actual": 978.195
  },
  {
    "brand": "CATERPILLAR",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 9.9,
    "budget": 12.6,
    "actual": 7.3
  },
  {
    "brand": "COLUMBIA",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 10.4,
    "budget": 10,
    "actual": 8.7
  },
  {
    "brand": "COLUMBIA",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 3,
    "budget": 2.7,
    "actual": 1.9
  },
  {
    "brand": "COLUMBIA",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 15339.528,
    "budget": 0,
    "actual": 14320.592
  },
  {
    "brand": "COLUMBIA",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 15.9,
    "budget": 15.4,
    "actual": 13.6
  },
  {
    "brand": "COLUMBIA",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 6.4,
    "budget": 7,
    "actual": 4.8
  },
  {
    "brand": "COLUMBIA",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.75,
    "budget": 1.38,
    "actual": -0.39
  },
  {
    "brand": "COLUMBIA",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1120.716,
    "budget": 0,
    "actual": 884.871
  },
  {
    "brand": "COLUMBIA",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 9.8,
    "budget": 10.5,
    "actual": 7.3
  },
  {
    "brand": "CROCS",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 10.4,
    "budget": 10.5,
    "actual": 13.5
  },
  {
    "brand": "CROCS",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 2.2,
    "budget": 2,
    "actual": 1
  },
  {
    "brand": "CROCS",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 1021.99,
    "budget": 0,
    "actual": 790.848
  },
  {
    "brand": "CROCS",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 16.7,
    "budget": 17.3,
    "actual": 21.8
  },
  {
    "brand": "CROCS",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 7.1,
    "budget": 9.4,
    "actual": 10.8
  },
  {
    "brand": "CROCS",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.1,
    "budget": 1.2,
    "actual": -0.51
  },
  {
    "brand": "CROCS",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 78.142,
    "budget": 0,
    "actual": 62.968
  },
  {
    "brand": "CROCS",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 11.4,
    "budget": 15.6,
    "actual": 17.1
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 2.1,
    "budget": 2.8,
    "actual": 2
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.1,
    "budget": 0.5,
    "actual": -0.1
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 4886.187,
    "budget": 0,
    "actual": 4929.651
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 4.7,
    "budget": 4.9,
    "actual": 4.6
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 1.8,
    "budget": 2.5,
    "actual": 1.5
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.22,
    "budget": 0.41,
    "actual": -0.45
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 479.624,
    "budget": 0,
    "actual": 385.567
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 4.1,
    "budget": 4.4,
    "actual": 3.2
  },
  {
    "brand": "FUNSPORT",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 4.8,
    "budget": 5.8,
    "actual": 3.4
  },
  {
    "brand": "FUNSPORT",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0,
    "budget": 0.9,
    "actual": -0.3
  },
  {
    "brand": "FUNSPORT",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 1460.979,
    "budget": 0,
    "actual": 1209.523
  },
  {
    "brand": "FUNSPORT",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 8.2,
    "budget": 9.9,
    "actual": 5.9
  },
  {
    "brand": "FUNSPORT",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 3,
    "budget": 4.4,
    "actual": 2.1
  },
  {
    "brand": "FUNSPORT",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.81,
    "budget": 0.64,
    "actual": -0.96
  },
  {
    "brand": "FUNSPORT",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 100.071,
    "budget": 0,
    "actual": 76.743
  },
  {
    "brand": "FUNSPORT",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 5.1,
    "budget": 7.5,
    "actual": 3.3
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 5.9,
    "budget": 6.6,
    "actual": 5.3
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.2,
    "budget": 1,
    "actual": -0.4
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 14956.844,
    "budget": 0,
    "actual": 14225.01
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 11.2,
    "budget": 12.5,
    "actual": 10.2
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 4.5,
    "budget": 5.5,
    "actual": 3.3
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.56,
    "budget": 0.6,
    "actual": -1.43
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1221.795,
    "budget": 0,
    "actual": 986.339
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 8.5,
    "budget": 10.1,
    "actual": 6.2
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 3.8,
    "budget": 5.5,
    "actual": 3.4
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -1.6,
    "budget": 1.2,
    "actual": -1.6
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 2356.679,
    "budget": 0,
    "actual": 2307.81
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 8,
    "budget": 10.5,
    "actual": 7.1
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 2.4,
    "budget": 4.2,
    "actual": 1.7
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -2.3,
    "budget": 1.49,
    "actual": -2.23
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 151.304,
    "budget": 0,
    "actual": 120.648
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 4.9,
    "budget": 7.6,
    "actual": 3.3
  },
  {
    "brand": "LOP",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 17.4,
    "budget": 18.2,
    "actual": 14.5
  },
  {
    "brand": "LOP",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 3.3,
    "budget": 3.5,
    "actual": 1.4
  },
  {
    "brand": "LOP",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 1802.896,
    "budget": 0,
    "actual": 1783.838
  },
  {
    "brand": "LOP",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 23.9,
    "budget": 24.6,
    "actual": 20
  },
  {
    "brand": "LOP",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 17.2,
    "budget": 20,
    "actual": 11.5
  },
  {
    "brand": "LOP",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 3.67,
    "budget": 4.29,
    "actual": -0.99
  },
  {
    "brand": "LOP",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 168.6,
    "budget": 0,
    "actual": 155.931
  },
  {
    "brand": "LOP",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 23.3,
    "budget": 27.1,
    "actual": 15.7
  },
  {
    "brand": "MERRELL",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 9.7,
    "budget": 10.3,
    "actual": 8.6
  },
  {
    "brand": "MERRELL",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 1.9,
    "budget": 2.2,
    "actual": 0.9
  },
  {
    "brand": "MERRELL",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 11889.768,
    "budget": 0,
    "actual": 10360.978
  },
  {
    "brand": "MERRELL",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 17.5,
    "budget": 18.3,
    "actual": 14.5
  },
  {
    "brand": "MERRELL",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 7.4,
    "budget": 7.6,
    "actual": 5.7
  },
  {
    "brand": "MERRELL",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.64,
    "budget": 1.24,
    "actual": -0.66
  },
  {
    "brand": "MERRELL",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 986.435,
    "budget": 0,
    "actual": 768.468
  },
  {
    "brand": "MERRELL",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 12.8,
    "budget": 13.2,
    "actual": 9.2
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 2.6,
    "budget": 3.6,
    "actual": 2.6
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -1.1,
    "budget": 3.3,
    "actual": -1.1
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 131.214,
    "budget": 0,
    "actual": 128.519
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 5,
    "budget": 6.7,
    "actual": 4.7
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 1.8,
    "budget": 2.7,
    "actual": 1.7
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -1.65,
    "budget": 2.97,
    "actual": -1.79
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 8.233,
    "budget": 0,
    "actual": 9.321
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 2.8,
    "budget": 5.2,
    "actual": 3
  },
  {
    "brand": "PARFOIS",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 4.1,
    "budget": 5.2,
    "actual": 8.4
  },
  {
    "brand": "PARFOIS",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -2.1,
    "budget": 2.4,
    "actual": -0.6
  },
  {
    "brand": "PARFOIS",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 50.352,
    "budget": 0,
    "actual": 34.134
  },
  {
    "brand": "PARFOIS",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 6.8,
    "budget": 9.5,
    "actual": 14.4
  },
  {
    "brand": "PARFOIS",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 5.1,
    "budget": 6.1,
    "actual": 8.1
  },
  {
    "brand": "PARFOIS",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -4.72,
    "budget": 1.67,
    "actual": -2.38
  },
  {
    "brand": "PARFOIS",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 50.352,
    "budget": 0,
    "actual": 34.134
  },
  {
    "brand": "PARFOIS",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 8.6,
    "budget": 10.6,
    "actual": 13.2
  },
  {
    "brand": "ROCKFORD",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 6,
    "budget": 6.5,
    "actual": 5.7
  },
  {
    "brand": "ROCKFORD",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.5,
    "budget": 1.2,
    "actual": 0
  },
  {
    "brand": "ROCKFORD",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 15604.557,
    "budget": 0,
    "actual": 14756.953
  },
  {
    "brand": "ROCKFORD",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 10.3,
    "budget": 11.2,
    "actual": 9.8
  },
  {
    "brand": "ROCKFORD",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 4.7,
    "budget": 4.8,
    "actual": 4.2
  },
  {
    "brand": "ROCKFORD",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.33,
    "budget": 0.69,
    "actual": -0.92
  },
  {
    "brand": "ROCKFORD",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1390.343,
    "budget": 0,
    "actual": 1200.289
  },
  {
    "brand": "ROCKFORD",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 8.1,
    "budget": 8.1,
    "actual": 6.9
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 2.1,
    "budget": 4.3,
    "actual": 1
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.4,
    "budget": 0.5,
    "actual": -0.5
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 592.652,
    "budget": 0,
    "actual": 594.408
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 5.9,
    "budget": 8.1,
    "actual": 3.4
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 1.8,
    "budget": 3.7,
    "actual": 0.7
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.61,
    "budget": 0.31,
    "actual": -0.56
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 54.051,
    "budget": 0,
    "actual": 37.067
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 5.1,
    "budget": 6.9,
    "actual": 1.8
  },
  {
    "brand": "TODAS",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 6.5,
    "budget": 7.1,
    "actual": 5.6
  },
  {
    "brand": "TODAS",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.8,
    "budget": 1.4,
    "actual": 0.1
  },
  {
    "brand": "TODAS",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 119223.996,
    "budget": 0,
    "actual": 107025.672
  },
  {
    "brand": "TODAS",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 11.3,
    "budget": 12.1,
    "actual": 9.7
  },
  {
    "brand": "TODAS",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 4.9,
    "budget": 6.1,
    "actual": 3.9
  },
  {
    "brand": "TODAS",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.05,
    "budget": 1.05,
    "actual": -0.83
  },
  {
    "brand": "TODAS",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 10064.146,
    "budget": 0,
    "actual": 8130.442
  },
  {
    "brand": "TODAS",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 8.5,
    "budget": 10.3,
    "actual": 6.6
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 5.3,
    "budget": 4.9,
    "actual": 4.1
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.7,
    "budget": 0.6,
    "actual": 0
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 16662.548,
    "budget": 0,
    "actual": 13929.999
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 9.1,
    "budget": 8.5,
    "actual": 7.1
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 4,
    "budget": 5.5,
    "actual": 3.5
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.15,
    "budget": 0.72,
    "actual": -0.34
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1381.963,
    "budget": 0,
    "actual": 1214.694
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 6.8,
    "budget": 9.2,
    "actual": 5.8
  },
  {
    "brand": "VANS",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 11.7,
    "budget": 11.3,
    "actual": 8.6
  },
  {
    "brand": "VANS",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 2.3,
    "budget": 2.1,
    "actual": 0.3
  },
  {
    "brand": "VANS",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 10875.071,
    "budget": 0,
    "actual": 8224.537
  },
  {
    "brand": "VANS",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 20.5,
    "budget": 19.4,
    "actual": 15.1
  },
  {
    "brand": "VANS",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 10.9,
    "budget": 12.1,
    "actual": 7.9
  },
  {
    "brand": "VANS",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 2.14,
    "budget": 2.64,
    "actual": -0.08
  },
  {
    "brand": "VANS",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1144.574,
    "budget": 0,
    "actual": 835.12
  },
  {
    "brand": "VANS",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 18.6,
    "budget": 20.8,
    "actual": 13.1
  }
] as ProductivitySnapshotSeptemberRow[],
};

export const loadProductivitySnapshotSeptember2026 = (year: number, month: number, brand: string) => {
  if (year !== productivitySnapshotSeptember2026.year || month !== productivitySnapshotSeptember2026.month) return null;
  const normalized = brand.trim().toUpperCase();
  const selected = normalized === "CAT" ? "CATERPILLAR" : normalized === "SAFETY" ? "NORSEG" : normalized;
  const rows = productivitySnapshotSeptember2026.rows
    .filter((row) => row.brand === selected)
    .map((row) => ({
      cut: row.cut,
      metric: row.metric,
      actual: row.actual,
      budget: row.budget,
      prior: row.prior,
    }));
  return rows.length ? { rows, source: productivitySnapshotSeptember2026.source } : null;
};


