export type ProductivitySnapshotRow = {
  brand: string;
  cut: "MENSUAL" | "ACUMULADO";
  metric: "VENTA SSS" | "VENTA UF M2" | "MARGEN UF M2" | "RENTABILIDAD UF M2";
  actual: number;
  budget: number;
  prior: number;
};

export const productivitySnapshotAugust2026 = {
  year: 2026,
  month: 8,
  source: "Same Store Sale_082026 + Informe UF m2_Agosto 2026 (snapshot Google Drive)",
  rows: [
  {
    "brand": "7VEINTE",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 4.00730218182901,
    "budget": 5.195715038711665,
    "actual": 2.7648541621468357
  },
  {
    "brand": "7VEINTE",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.5494148416380611,
    "budget": 1.1819390336215274,
    "actual": -1.0557584099588904
  },
  {
    "brand": "7VEINTE",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 1798.353,
    "budget": 0,
    "actual": 1581.398
  },
  {
    "brand": "7VEINTE",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 7.2717274397103395,
    "budget": 9.223811837263085,
    "actual": 5.346441785317776
  },
  {
    "brand": "7VEINTE",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 8.087778485812262,
    "budget": 7.876096873864752,
    "actual": 2.477103426365136
  },
  {
    "brand": "7VEINTE",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 1.2716161685587484,
    "budget": 1.4305322752504679,
    "actual": -1.3503381322368326
  },
  {
    "brand": "7VEINTE",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 272.178,
    "budget": 0,
    "actual": 309.768
  },
  {
    "brand": "7VEINTE",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 14.160515060118518,
    "budget": 13.550725058633844,
    "actual": 4.655562318554817
  },
  {
    "brand": "AZALEIA",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 6.5665067653350055,
    "budget": 7.169730016283322,
    "actual": 6.936095349450207
  },
  {
    "brand": "AZALEIA",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.14406234321224592,
    "budget": 1.3718444305902806,
    "actual": -0.4707911595690524
  },
  {
    "brand": "AZALEIA",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 2992.309,
    "budget": 0,
    "actual": 2948.161
  },
  {
    "brand": "AZALEIA",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 10.683922986636276,
    "budget": 11.718414908218048,
    "actual": 11.088814032061686
  },
  {
    "brand": "AZALEIA",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 6.856251663366437,
    "budget": 7.159369953853779,
    "actual": 6.441714888101434
  },
  {
    "brand": "AZALEIA",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.8857757376555235,
    "budget": 0.8151830691130401,
    "actual": -0.8732806623725805
  },
  {
    "brand": "AZALEIA",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 292.104,
    "budget": 0,
    "actual": 252.142
  },
  {
    "brand": "AZALEIA",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 10.922006816573596,
    "budget": 11.5719690477486,
    "actual": 10.40147980714998
  },
  {
    "brand": "BILLABONG",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 2.596908691239518,
    "budget": 0,
    "actual": 0
  },
  {
    "brand": "BILLABONG",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -1.3592377609000297,
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
    "prior": 5.345059303438314,
    "budget": 0,
    "actual": 0
  },
  {
    "brand": "BILLABONG",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 2.537288534252919,
    "budget": 0,
    "actual": 0
  },
  {
    "brand": "BILLABONG",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -2.4975567669212224,
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
    "prior": 6.544982155283772,
    "budget": 0,
    "actual": 0
  },
  {
    "brand": "BSOUL",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 10.709820678755612,
    "budget": 11.104248021794701,
    "actual": 8.224770849112414
  },
  {
    "brand": "BSOUL",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 1.724888647524765,
    "budget": 1.3684032477690329,
    "actual": -0.26753276676742893
  },
  {
    "brand": "BSOUL",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 1320.36,
    "budget": 0,
    "actual": 1305
  },
  {
    "brand": "BSOUL",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 17.190969948236763,
    "budget": 17.88374726554222,
    "actual": 13.040300341035449
  },
  {
    "brand": "BSOUL",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 7.974054219917487,
    "budget": 9.877635370231378,
    "actual": 7.49633449992797
  },
  {
    "brand": "BSOUL",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.25981856081370885,
    "budget": 0.6585609998493699,
    "actual": -0.11560917661131716
  },
  {
    "brand": "BSOUL",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 216.869,
    "budget": 0,
    "actual": 201.321
  },
  {
    "brand": "BSOUL",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 13.184513435937406,
    "budget": 15.70215082440451,
    "actual": 11.839334749481473
  },
  {
    "brand": "CATERPILLAR",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 7.7604908070322765,
    "budget": 8.600169970637333,
    "actual": 6.6105722784104675
  },
  {
    "brand": "CATERPILLAR",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 1.3683297599531592,
    "budget": 1.841232395591231,
    "actual": 0.5077359722792953
  },
  {
    "brand": "CATERPILLAR",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 13753.766,
    "budget": 0,
    "actual": 12236.031
  },
  {
    "brand": "CATERPILLAR",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 13.316771734158932,
    "budget": 14.69900460533214,
    "actual": 11.533201556387235
  },
  {
    "brand": "CATERPILLAR",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 8.402459684624393,
    "budget": 10.604948281792481,
    "actual": 7.1076932145281075
  },
  {
    "brand": "CATERPILLAR",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 1.620226945781199,
    "budget": 2.532547268073926,
    "actual": 0.6162704062695914
  },
  {
    "brand": "CATERPILLAR",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1551.823,
    "budget": 0,
    "actual": 1413.713
  },
  {
    "brand": "CATERPILLAR",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 14.49295436254953,
    "budget": 17.92795208137899,
    "actual": 12.899696515769143
  },
  {
    "brand": "COLUMBIA",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 10.878390154949988,
    "budget": 10.446596224739853,
    "actual": 9.219659259757218
  },
  {
    "brand": "COLUMBIA",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 3.3104269542801656,
    "budget": 2.891065395109213,
    "actual": 2.1692580195999995
  },
  {
    "brand": "COLUMBIA",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 14218.812,
    "budget": 0,
    "actual": 13435.721
  },
  {
    "brand": "COLUMBIA",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 16.683117300493937,
    "budget": 16.07959994793606,
    "actual": 14.418043639212513
  },
  {
    "brand": "COLUMBIA",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 13.177352567373836,
    "budget": 12.519658811780245,
    "actual": 9.890124235976783
  },
  {
    "brand": "COLUMBIA",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 4.664426873613095,
    "budget": 3.9196878484707645,
    "actual": 2.533413022497587
  },
  {
    "brand": "COLUMBIA",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1404.16,
    "budget": 0,
    "actual": 1526.491
  },
  {
    "brand": "COLUMBIA",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 20.04680421814095,
    "budget": 19.084211878378373,
    "actual": 15.448470075441614
  },
  {
    "brand": "CROCS",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 10.786621204276901,
    "budget": 10.6841617831177,
    "actual": 13.81753407979712
  },
  {
    "brand": "CROCS",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 2.5151214050711856,
    "budget": 2.1216810068128122,
    "actual": 1.1656567979037227
  },
  {
    "brand": "CROCS",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 943.848,
    "budget": 0,
    "actual": 727.88
  },
  {
    "brand": "CROCS",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 17.37474640833349,
    "budget": 17.499693494833064,
    "actual": 22.415668758657215
  },
  {
    "brand": "CROCS",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 7.38384176730199,
    "budget": 7.837764085213808,
    "actual": 8.964060201055055
  },
  {
    "brand": "CROCS",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.7580170884133781,
    "budget": 1.0034404695692465,
    "actual": -1.1551262566106633
  },
  {
    "brand": "CROCS",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 78.301,
    "budget": 0,
    "actual": 59.544
  },
  {
    "brand": "CROCS",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 11.98610785612764,
    "budget": 12.620577201468986,
    "actual": 14.95494499096499
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 2.1828213752144277,
    "budget": 2.7918256307933995,
    "actual": 2.090634332014583
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.03526751775888384,
    "budget": 0.46320160203653116,
    "actual": -0.033905809053276205
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 4406.563,
    "budget": 0,
    "actual": 4544.084
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 4.745599255172324,
    "budget": 4.969370740455992,
    "actual": 4.733059961617269
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 2.33057866521865,
    "budget": 2.7849017607863695,
    "actual": 2.2278774174697897
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.2481227365245762,
    "budget": 0.443823529469618,
    "actual": -0.02567274754539677
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 490.364,
    "budget": 0,
    "actual": 550.681
  },
  {
    "brand": "DISCOUNT HOUSE",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 4.968248212385505,
    "budget": 4.952335826664021,
    "actual": 5.112820283663848
  },
  {
    "brand": "FUNSPORT",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 5.0337283667389165,
    "budget": 5.999354280444464,
    "actual": 3.589154141444805
  },
  {
    "brand": "FUNSPORT",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.1342568813256652,
    "budget": 0.9107742819835974,
    "actual": -0.23079584327975824
  },
  {
    "brand": "FUNSPORT",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 1360.908,
    "budget": 0,
    "actual": 1132.78
  },
  {
    "brand": "FUNSPORT",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 8.626849920004123,
    "budget": 10.242126594524333,
    "actual": 6.247737051287089
  },
  {
    "brand": "FUNSPORT",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 5.277806216256466,
    "budget": 5.436360310343515,
    "actual": 3.738956145431639
  },
  {
    "brand": "FUNSPORT",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.24899841478255924,
    "budget": 0.8111631926869647,
    "actual": -0.02653433811862057
  },
  {
    "brand": "FUNSPORT",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 128.095,
    "budget": 0,
    "actual": 110.266
  },
  {
    "brand": "FUNSPORT",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 9.004521444706224,
    "budget": 9.512049738148903,
    "actual": 6.246707556212654
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 6.034924016394179,
    "budget": 6.737387104464753,
    "actual": 5.503402989953593
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.31259826983795114,
    "budget": 0.9948706224575518,
    "actual": -0.31706249102606976
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 13735.049,
    "budget": 0,
    "actual": 13238.671
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 11.51939036166758,
    "budget": 12.76110928152674,
    "actual": 10.689150875734484
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 6.437620849007627,
    "budget": 7.197161727322216,
    "actual": 5.613709063187799
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.3444045310371372,
    "budget": 0.9552189401873058,
    "actual": -0.26212181240306875
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1258.518,
    "budget": 0,
    "actual": 1241.794
  },
  {
    "brand": "HUSH PUPPIES",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 12.482274649783722,
    "budget": 13.541433981015732,
    "actual": 10.923844680881226
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 3.970701852317519,
    "budget": 5.653042174246024,
    "actual": 3.6307386722891164
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -1.5253283342761252,
    "budget": 1.1676810395465809,
    "actual": -1.5574281311995755
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 2205.375,
    "budget": 0,
    "actual": 2187.162
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 8.340969950560973,
    "budget": 10.834218027063987,
    "actual": 7.612246808828876
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 3.791244344416852,
    "budget": 5.062004272985301,
    "actual": 3.1801477656806467
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -1.824178640116233,
    "budget": 1.2646779397104644,
    "actual": -1.9590405042194916
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 170.836,
    "budget": 0,
    "actual": 167.442
  },
  {
    "brand": "HUSH PUPPIES KIDS",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 8.126618814960265,
    "budget": 10.049673418519093,
    "actual": 7.129560513209579
  },
  {
    "brand": "LOP",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 17.472886280923433,
    "budget": 18.000802708545443,
    "actual": 14.946347210703669
  },
  {
    "brand": "LOP",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 3.2216922614008396,
    "budget": 3.4058513349797757,
    "actual": 1.6853849146096354
  },
  {
    "brand": "LOP",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 1634.296,
    "budget": 0,
    "actual": 1627.907
  },
  {
    "brand": "LOP",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 23.93974024142418,
    "budget": 24.308416875005044,
    "actual": 20.508979843189174
  },
  {
    "brand": "LOP",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 15.683197271293833,
    "budget": 17.054087483391086,
    "actual": 11.63463447454227
  },
  {
    "brand": "LOP",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.6865511678556127,
    "budget": 1.8318714707997443,
    "actual": -1.4851819590992799
  },
  {
    "brand": "LOP",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 226.979,
    "budget": 0,
    "actual": 221.9
  },
  {
    "brand": "LOP",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 21.518913781156815,
    "budget": 23.051372881291083,
    "actual": 16.01383344166175
  },
  {
    "brand": "MERRELL",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 10.0171414857768,
    "budget": 10.666452099743207,
    "actual": 8.92869691773938
  },
  {
    "brand": "MERRELL",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 2.0087906555292108,
    "budget": 2.3450061579782777,
    "actual": 1.1376177187101408
  },
  {
    "brand": "MERRELL",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 10903.333,
    "budget": 0,
    "actual": 9592.51
  },
  {
    "brand": "MERRELL",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 18.05188163920826,
    "budget": 18.94821143398122,
    "actual": 15.19015178182165
  },
  {
    "brand": "MERRELL",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 11.808125464510102,
    "budget": 12.284539838689545,
    "actual": 10.14459066282085
  },
  {
    "brand": "MERRELL",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 2.7781715396382407,
    "budget": 2.8919612740357716,
    "actual": 1.8464611719972506
  },
  {
    "brand": "MERRELL",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1132.72,
    "budget": 0,
    "actual": 1028.35
  },
  {
    "brand": "MERRELL",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 21.010398780601403,
    "budget": 22.659726675992218,
    "actual": 17.59126387197748
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 2.741827785880548,
    "budget": 3.7457691605874235,
    "actual": 2.69152907783972
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -1.039509986772109,
    "budget": 3.3762694086340157,
    "actual": -1.0716794733179362
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 122.981,
    "budget": 0,
    "actual": 119.198
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 5.255222697420473,
    "budget": 6.890488188813184,
    "actual": 4.92659277236785
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 3.4791444701182406,
    "budget": 4.674785029224712,
    "actual": 2.7473573720587403
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -1.5618451010269734,
    "budget": 4.898323127089289,
    "actual": -1.36890466431481
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 25.209,
    "budget": 0,
    "actual": 24.737
  },
  {
    "brand": "MOUNTAIN HARDWEAR",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 6.016368145308044,
    "budget": 8.108028668167547,
    "actual": 5.185318604082766
  },
  {
    "brand": "PARFOIS",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 3.564489675624622,
    "budget": 5.013674104155046,
    "actual": 8.426523756302512
  },
  {
    "brand": "PARFOIS",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.7789496054599181,
    "budget": 2.4692341930407125,
    "actual": -0.32180713076402134
  },
  {
    "brand": "PARFOIS",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 5.908597954494131,
    "budget": 9.349414611144445,
    "actual": 14.598432831611907
  },
  {
    "brand": "PARFOIS",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 0,
    "budget": 5.210074430589314,
    "actual": 7.646884919394767
  },
  {
    "brand": "PARFOIS",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0,
    "budget": 2.1103069460403896,
    "actual": -0.8467944971423419
  },
  {
    "brand": "PARFOIS",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 0,
    "budget": 9.018311529096522,
    "actual": 13.36128546332333
  },
  {
    "brand": "ROCKFORD",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 6.131993629574321,
    "budget": 6.710434862031047,
    "actual": 5.900458237776981
  },
  {
    "brand": "ROCKFORD",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.6591994584805249,
    "budget": 1.2484512362026619,
    "actual": 0.1686869034088805
  },
  {
    "brand": "ROCKFORD",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 14214.214,
    "budget": 0,
    "actual": 13556.664
  },
  {
    "brand": "ROCKFORD",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 10.623858290744135,
    "budget": 11.57089514042022,
    "actual": 10.184085452880419
  },
  {
    "brand": "ROCKFORD",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 6.9674684190237155,
    "budget": 7.3224259326414485,
    "actual": 6.544283677087973
  },
  {
    "brand": "ROCKFORD",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 1.0077703913355907,
    "budget": 1.525560994185902,
    "actual": 0.42763362246371145
  },
  {
    "brand": "ROCKFORD",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1476.628,
    "budget": 0,
    "actual": 1490.128
  },
  {
    "brand": "ROCKFORD",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 12.19386082261074,
    "budget": 12.451370112498779,
    "actual": 11.414690704324226
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 2.1223380090114574,
    "budget": 4.347238289077608,
    "actual": 1.0420682802457648
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.4300050797606619,
    "budget": 0.5201884345491504,
    "actual": -0.439082940066835
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 538.601,
    "budget": 0,
    "actual": 557.341
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 5.968457834826371,
    "budget": 8.21886286067277,
    "actual": 3.638848219175033
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 2.125710477762518,
    "budget": 4.043745779391106,
    "actual": 1.0397661544574497
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": -0.4858968222129157,
    "budget": 0.4957888689852195,
    "actual": -0.24317941786473313
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 51.997,
    "budget": 0,
    "actual": 59.232
  },
  {
    "brand": "SHOE EXPRESS",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 5.441819714574078,
    "budget": 7.510043955583594,
    "actual": 2.9774968312744314
  },
  {
    "brand": "TODAS",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 6.675659147315203,
    "budget": 7.166540193717944,
    "actual": 5.781445958881743
  },
  {
    "brand": "TODAS",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.9236624144105884,
    "budget": 1.403949517833163,
    "actual": 0.24716369604448316
  },
  {
    "brand": "TODAS",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 109159.85,
    "budget": 0,
    "actual": 98895.23
  },
  {
    "brand": "TODAS",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 11.624186474558114,
    "budget": 12.322241015068812,
    "actual": 10.115854550311141
  },
  {
    "brand": "TODAS",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 6.946749259799954,
    "budget": 7.484051442277745,
    "actual": 5.774356122277839
  },
  {
    "brand": "TODAS",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.9375789546501389,
    "budget": 1.502344478819034,
    "actual": 0.2147565033194823
  },
  {
    "brand": "TODAS",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 11510.518,
    "budget": 0,
    "actual": 10939.305
  },
  {
    "brand": "TODAS",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 12.093225291250558,
    "budget": 12.908090365981108,
    "actual": 10.229228548566999
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 5.511523917052513,
    "budget": 4.801924120434473,
    "actual": 4.192094515897043
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.8257294538168917,
    "budget": 0.5654859012839102,
    "actual": 0.006541854179759988
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 15280.585,
    "budget": 0,
    "actual": 12715.305
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 9.39704480707824,
    "budget": 8.425933493402484,
    "actual": 7.325938146100042
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 4.269329671866935,
    "budget": 3.8150451328156763,
    "actual": 3.54006202129847
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.2568292212451712,
    "budget": 0.3433983279872301,
    "actual": -0.3254452347925156
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1558.072,
    "budget": 0,
    "actual": 1402.48
  },
  {
    "brand": "UNDER ARMOUR",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 7.250847244946078,
    "budget": 7.177247459524801,
    "actual": 6.3400161278549065
  },
  {
    "brand": "VANS",
    "cut": "ACUMULADO",
    "metric": "MARGEN UF M2",
    "prior": 11.779118417351201,
    "budget": 11.143507740740299,
    "actual": 8.63584759063013
  },
  {
    "brand": "VANS",
    "cut": "ACUMULADO",
    "metric": "RENTABILIDAD UF M2",
    "prior": 2.3830738656022894,
    "budget": 2.035835821052799,
    "actual": 0.314811903275974
  },
  {
    "brand": "VANS",
    "cut": "ACUMULADO",
    "metric": "VENTA SSS",
    "prior": 9730.497,
    "budget": 0,
    "actual": 7389.417
  },
  {
    "brand": "VANS",
    "cut": "ACUMULADO",
    "metric": "VENTA UF M2",
    "prior": 20.79244646146223,
    "budget": 19.20016657314615,
    "actual": 15.350592417911201
  },
  {
    "brand": "VANS",
    "cut": "MENSUAL",
    "metric": "MARGEN UF M2",
    "prior": 8.129186557797208,
    "budget": 7.739129103871442,
    "actual": 6.3813999451371
  },
  {
    "brand": "VANS",
    "cut": "MENSUAL",
    "metric": "RENTABILIDAD UF M2",
    "prior": 0.48079011538906263,
    "budget": 0.6333178152539476,
    "actual": -0.5628067179952821
  },
  {
    "brand": "VANS",
    "cut": "MENSUAL",
    "metric": "VENTA SSS",
    "prior": 1175.665,
    "budget": 0,
    "actual": 879.316
  },
  {
    "brand": "VANS",
    "cut": "MENSUAL",
    "metric": "VENTA UF M2",
    "prior": 14.47288100405021,
    "budget": 13.616358032999278,
    "actual": 11.485294439261832
  }
] as ProductivitySnapshotRow[],
};

export const loadProductivitySnapshotAugust2026 = (year: number, month: number, brand: string) => {
  if (year !== productivitySnapshotAugust2026.year || month !== productivitySnapshotAugust2026.month) return null;
  const normalized = brand.trim().toUpperCase();
  const selected = normalized === "CAT" ? "CATERPILLAR" : normalized === "SAFETY" ? "NORSEG" : normalized;
  const rows = productivitySnapshotAugust2026.rows
    .filter((row) => row.brand === selected)
    .map((row) => ({
      cut: row.cut,
      metric: row.metric,
      actual: row.actual,
      budget: row.budget,
      prior: row.prior,
    }));
  return rows.length ? { rows, source: productivitySnapshotAugust2026.source } : null;
};


