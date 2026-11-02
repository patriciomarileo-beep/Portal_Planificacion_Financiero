export type StoreM2Row = {
  code: string;
  name: string;
  squareMeters: number;
};

// Fuente: https://docs.google.com/spreadsheets/d/1CWYpxnTBJicUUj-lGB3I9We4iFOu4Zk-ev3hWc7UM5I/edit?gid=0
// Se conserva por CC el ultimo m2_total valido disponible en la historia mensual.
export const storeM2: StoreM2Row[] = [
  {
    "code": "210101",
    "name": "H.p. Arica",
    "squareMeters": 259
  },
  {
    "code": "210102",
    "name": "H.p. Iquique",
    "squareMeters": 68
  },
  {
    "code": "210104",
    "name": "H.p. Mall Calama",
    "squareMeters": 85.46
  },
  {
    "code": "210107",
    "name": "H.p. La Serena",
    "squareMeters": 88.77
  },
  {
    "code": "210108",
    "name": "H.p. Mall La Serena",
    "squareMeters": 74.23
  },
  {
    "code": "210109",
    "name": "H.p. Ovalle",
    "squareMeters": 91
  },
  {
    "code": "210110",
    "name": "H.p. Plaza Antofagasta",
    "squareMeters": 79088
  },
  {
    "code": "210111",
    "name": "H.p. Mall Plaza Copiapo",
    "squareMeters": 105
  },
  {
    "code": "210203",
    "name": "H.p. Marina Arauco",
    "squareMeters": 70.6
  },
  {
    "code": "210205",
    "name": "H.p. Los Andes",
    "squareMeters": 43.8
  },
  {
    "code": "210301",
    "name": "H.p. La Dehesa",
    "squareMeters": 98
  },
  {
    "code": "210302",
    "name": "H.p. Alto Las Condes",
    "squareMeters": 117
  },
  {
    "code": "210303",
    "name": "H.p. Parque Arauco",
    "squareMeters": 108.78
  },
  {
    "code": "210307",
    "name": "H.p. Costanera Center",
    "squareMeters": 98
  },
  {
    "code": "210308",
    "name": "H.p. Los Dominicos",
    "squareMeters": 115.4
  },
  {
    "code": "210501",
    "name": "H.p. Plaza Oeste",
    "squareMeters": 67.56
  },
  {
    "code": "210503",
    "name": "H.p. Plaza Vespucio",
    "squareMeters": 124.18
  },
  {
    "code": "210504",
    "name": "H.p. Florida Center",
    "squareMeters": 112.1
  },
  {
    "code": "210506",
    "name": "H.p. Melipilla",
    "squareMeters": 56032
  },
  {
    "code": "210509",
    "name": "H.p. Arauco Maipú",
    "squareMeters": 118
  },
  {
    "code": "210510",
    "name": "H.p. Portal Ñuñoa",
    "squareMeters": 89.6
  },
  {
    "code": "210514",
    "name": "H.p. Buenaventura",
    "squareMeters": 54
  },
  {
    "code": "210704",
    "name": "H.p. Chillan",
    "squareMeters": 98.49
  },
  {
    "code": "210707",
    "name": "H.p. Plaza El Trebol",
    "squareMeters": 132
  },
  {
    "code": "210709",
    "name": "H.p. Los Angeles",
    "squareMeters": 66
  },
  {
    "code": "210711",
    "name": "H.p. Plaza Los Angeles",
    "squareMeters": 94.03
  },
  {
    "code": "210712",
    "name": "H.p. Mall Center Curico",
    "squareMeters": 88.8
  },
  {
    "code": "210713",
    "name": "H.p. Rancagua",
    "squareMeters": 138
  },
  {
    "code": "210715",
    "name": "H.p. Santa Cruz",
    "squareMeters": 51.28
  },
  {
    "code": "210716",
    "name": "H.p. Plaza Bio Bio",
    "squareMeters": 101.5
  },
  {
    "code": "210717",
    "name": "H.p. Mall Del Centro Concepción",
    "squareMeters": 94
  },
  {
    "code": "210718",
    "name": "H.p. San Fernando 2",
    "squareMeters": 75
  },
  {
    "code": "210719",
    "name": "H.p. Portal Rancagua",
    "squareMeters": 90
  },
  {
    "code": "210720",
    "name": "H.p. Portal Centro Talca",
    "squareMeters": 94
  },
  {
    "code": "210801",
    "name": "H.p. Temuco",
    "squareMeters": 92
  },
  {
    "code": "210802",
    "name": "H.p. Villarrica",
    "squareMeters": 90
  },
  {
    "code": "210803",
    "name": "H.p. Valdivia",
    "squareMeters": 262
  },
  {
    "code": "210804",
    "name": "H.p. Osorno",
    "squareMeters": 185
  },
  {
    "code": "210806",
    "name": "H.p. Paseo Del Mar",
    "squareMeters": 123.97
  },
  {
    "code": "210807",
    "name": "H.p. Portal Temuco",
    "squareMeters": 68.8
  },
  {
    "code": "210809",
    "name": "H.p. Paseo Costanera",
    "squareMeters": 75.2
  },
  {
    "code": "210811",
    "name": "H.p. Mall Pionero",
    "squareMeters": 72.66
  },
  {
    "code": "210812",
    "name": "H.p. Coyhaique",
    "squareMeters": 48.2
  },
  {
    "code": "210813",
    "name": "H.p. Paseo Puerto Varas",
    "squareMeters": 82
  },
  {
    "code": "210814",
    "name": "H.p. Paseo Chiloe",
    "squareMeters": 102
  },
  {
    "code": "211101",
    "name": "D.h. La Serena",
    "squareMeters": 638
  },
  {
    "code": "211202",
    "name": "D.h. El Belloto",
    "squareMeters": 650
  },
  {
    "code": "211206",
    "name": "D.h. Factory Curauma",
    "squareMeters": 209.33
  },
  {
    "code": "211303",
    "name": "D.h. La Reina",
    "squareMeters": 434
  },
  {
    "code": "211523",
    "name": "Dhouse La Fabrica",
    "squareMeters": 395
  },
  {
    "code": "211524",
    "name": "Dhouse Vivo La Florida",
    "squareMeters": 300.63
  },
  {
    "code": "211702",
    "name": "D.h. Concepcion",
    "squareMeters": 423
  },
  {
    "code": "211803",
    "name": "D.h. Puerto Montt",
    "squareMeters": 360
  },
  {
    "code": "212101",
    "name": "Fs Iquique",
    "squareMeters": 79
  },
  {
    "code": "212102",
    "name": "Fs Calama",
    "squareMeters": 70
  },
  {
    "code": "212103",
    "name": "Fs Plaza Antofagasta",
    "squareMeters": 68
  },
  {
    "code": "212402",
    "name": "Fs Plaza Alameda",
    "squareMeters": 53.55
  },
  {
    "code": "212403",
    "name": "Fs Melipilla",
    "squareMeters": 85.1
  },
  {
    "code": "212502",
    "name": "Fs Plaza Oeste",
    "squareMeters": 67.56
  },
  {
    "code": "212512",
    "name": "Fs Mall Plaza Sur",
    "squareMeters": 98
  },
  {
    "code": "212707",
    "name": "Fs Mall Center Curico",
    "squareMeters": 63
  },
  {
    "code": "212709",
    "name": "Fs San Fernando",
    "squareMeters": 95.5
  },
  {
    "code": "212803",
    "name": "Fs Portal Temuco",
    "squareMeters": 76
  },
  {
    "code": "212805",
    "name": "Fs Osorno",
    "squareMeters": 74.88
  },
  {
    "code": "213101",
    "name": "Hpk Plaza Antofagasta",
    "squareMeters": 69
  },
  {
    "code": "213201",
    "name": "Hpk Marina Arauco",
    "squareMeters": 100
  },
  {
    "code": "213301",
    "name": "Hpk Alto Las Condes",
    "squareMeters": 93
  },
  {
    "code": "213302",
    "name": "Hpk Parque Arauco",
    "squareMeters": 49
  },
  {
    "code": "213504",
    "name": "Hpk Florida Center",
    "squareMeters": 118
  },
  {
    "code": "213506",
    "name": "Hpk Mall Plaza Egaña",
    "squareMeters": 82.3
  },
  {
    "code": "213507",
    "name": "Hpk Mall Arauco Maipu",
    "squareMeters": 76
  },
  {
    "code": "213701",
    "name": "Hpk Plaza El Trebol",
    "squareMeters": 86
  },
  {
    "code": "213702",
    "name": "Hpk Curicó",
    "squareMeters": 58.6
  },
  {
    "code": "213703",
    "name": "Hpk Plaza El Roble",
    "squareMeters": 64
  },
  {
    "code": "213801",
    "name": "Hpk Temuco",
    "squareMeters": 56
  },
  {
    "code": "213803",
    "name": "Hpk Puerto Montt",
    "squareMeters": 55
  },
  {
    "code": "213805",
    "name": "Hpk Portal Temuco",
    "squareMeters": 61
  },
  {
    "code": "213806",
    "name": "Hpk Paseo Costanera",
    "squareMeters": 60
  },
  {
    "code": "214101",
    "name": "Rkf Mall Calama",
    "squareMeters": 69
  },
  {
    "code": "214102",
    "name": "Rkf La Serena",
    "squareMeters": 175.2
  },
  {
    "code": "214103",
    "name": "Rkf Iquique",
    "squareMeters": 112.36
  },
  {
    "code": "214104",
    "name": "Rkf Plaza Antofagasta",
    "squareMeters": 143.5
  },
  {
    "code": "214105",
    "name": "Rkf San Pedro De Atacama",
    "squareMeters": 42.75
  },
  {
    "code": "214106",
    "name": "Rkf Mall Plaza Copiapo",
    "squareMeters": 120
  },
  {
    "code": "214201",
    "name": "Rkf Marina Arauco",
    "squareMeters": 168
  },
  {
    "code": "214301",
    "name": "RKF Valle Nevado",
    "squareMeters": 55
  },
  {
    "code": "214302",
    "name": "Rkf La Dehesa",
    "squareMeters": 97
  },
  {
    "code": "214303",
    "name": "Rkf Alto Las Condes",
    "squareMeters": 198
  },
  {
    "code": "214304",
    "name": "Rkf Parque Arauco",
    "squareMeters": 224.43
  },
  {
    "code": "214310",
    "name": "Rkf Costanera Center",
    "squareMeters": 192
  },
  {
    "code": "214501",
    "name": "Rkf Plaza Oeste",
    "squareMeters": 85
  },
  {
    "code": "214502",
    "name": "Rkf Plaza Norte",
    "squareMeters": 94
  },
  {
    "code": "214504",
    "name": "Rkf Plaza Vespucio",
    "squareMeters": 70
  },
  {
    "code": "214506",
    "name": "Rkf Florida Center",
    "squareMeters": 174.9
  },
  {
    "code": "214507",
    "name": "Rkf Arauco Maipú",
    "squareMeters": 182
  },
  {
    "code": "214509",
    "name": "Rkf Portal Ñuñoa",
    "squareMeters": 109.45
  },
  {
    "code": "214701",
    "name": "Rkf Plaza El Roble",
    "squareMeters": 116.77
  },
  {
    "code": "214702",
    "name": "Rkf Plaza Del Trebol",
    "squareMeters": 161
  },
  {
    "code": "214703",
    "name": "Rkf Plaza De Los Angeles",
    "squareMeters": 170
  },
  {
    "code": "214704",
    "name": "Rkf Mall Center Curico",
    "squareMeters": 72
  },
  {
    "code": "214709",
    "name": "Rkf Mall Del Centro Concepción",
    "squareMeters": 130
  },
  {
    "code": "214710",
    "name": "Rkf Talca",
    "squareMeters": 110
  },
  {
    "code": "214711",
    "name": "Rkf Portal Rancagua",
    "squareMeters": 82
  },
  {
    "code": "214712",
    "name": "RKF Plaza Maule",
    "squareMeters": 102.25
  },
  {
    "code": "214801",
    "name": "Rkf Temuco",
    "squareMeters": 94
  },
  {
    "code": "214802",
    "name": "Rkf Pucon",
    "squareMeters": 210
  },
  {
    "code": "214803",
    "name": "Rkf Valdivia",
    "squareMeters": 146
  },
  {
    "code": "214804",
    "name": "Rkf Puerto Montt",
    "squareMeters": 119.29
  },
  {
    "code": "214805",
    "name": "Rkf Puerto Varas",
    "squareMeters": 120
  },
  {
    "code": "214807",
    "name": "Rkf Puerto Natales",
    "squareMeters": 73
  },
  {
    "code": "214808",
    "name": "Rkf Portal Temuco",
    "squareMeters": 126
  },
  {
    "code": "214810",
    "name": "Rkf Punta Arenas Ii",
    "squareMeters": 108
  },
  {
    "code": "214811",
    "name": "Rkf Coyhaique",
    "squareMeters": 50
  },
  {
    "code": "214813",
    "name": "Rkf Paseo Chiloe",
    "squareMeters": 106
  },
  {
    "code": "214814",
    "name": "Rkf Osorno",
    "squareMeters": 90.4
  },
  {
    "code": "217406",
    "name": "Se San Pablo",
    "squareMeters": 120
  },
  {
    "code": "217408",
    "name": "Se Paseo Estacion",
    "squareMeters": 127
  },
  {
    "code": "217601",
    "name": "SE CASA MATRIZ",
    "squareMeters": 97.36
  },
  {
    "code": "217703",
    "name": "Se Chillan",
    "squareMeters": 40
  },
  {
    "code": "217704",
    "name": "Se Talcahuano",
    "squareMeters": 180
  },
  {
    "code": "217801",
    "name": "Se Temuco",
    "squareMeters": 69
  },
  {
    "code": "217802",
    "name": "Se Puerto Montt",
    "squareMeters": 96.62
  },
  {
    "code": "219101",
    "name": "Az Copiapo",
    "squareMeters": 84
  },
  {
    "code": "219103",
    "name": "Aza Pza. La Serena",
    "squareMeters": 54.3
  },
  {
    "code": "219202",
    "name": "Aza Marina Arauco",
    "squareMeters": 67
  },
  {
    "code": "219302",
    "name": "Aza Alto Las Condes",
    "squareMeters": 52.21
  },
  {
    "code": "219305",
    "name": "Aza La Dehesa",
    "squareMeters": 34
  },
  {
    "code": "219501",
    "name": "Aza Plaza Vespucio",
    "squareMeters": 56.56
  },
  {
    "code": "219502",
    "name": "Aza Florida Center",
    "squareMeters": 55.08
  },
  {
    "code": "219503",
    "name": "Aza Arauco Maipu",
    "squareMeters": 46.75
  },
  {
    "code": "219505",
    "name": "Aza Pza.oeste",
    "squareMeters": 52.2
  },
  {
    "code": "219508",
    "name": "Aza Melipilla",
    "squareMeters": 62
  },
  {
    "code": "219509",
    "name": "AZA Portal el Llano",
    "squareMeters": 57
  },
  {
    "code": "219703",
    "name": "Aza Rancagua",
    "squareMeters": 49
  },
  {
    "code": "219704",
    "name": "Aza Mall San Fernando",
    "squareMeters": 52.5
  },
  {
    "code": "219705",
    "name": "Aza Mall Talca",
    "squareMeters": 30
  },
  {
    "code": "219706",
    "name": "Aza Curico",
    "squareMeters": 49
  },
  {
    "code": "219801",
    "name": "Aza Temuco",
    "squareMeters": 39.52
  },
  {
    "code": "219802",
    "name": "Aza Portal Osorno",
    "squareMeters": 46
  },
  {
    "code": "219803",
    "name": "Azaleia Valdivia",
    "squareMeters": 70
  },
  {
    "code": "220501",
    "name": "Wls Plaza Oeste",
    "squareMeters": 69.31
  },
  {
    "code": "220702",
    "name": "Wls Plaza Los Angeles",
    "squareMeters": 70.86
  },
  {
    "code": "221101",
    "name": "Merrell Mall Plaza Copiapo",
    "squareMeters": 82
  },
  {
    "code": "221102",
    "name": "Merrell La Serena",
    "squareMeters": 74
  },
  {
    "code": "221103",
    "name": "Merrell Plaza Antofagasta",
    "squareMeters": 68
  },
  {
    "code": "221104",
    "name": "Merrell Plaza Calama",
    "squareMeters": 70
  },
  {
    "code": "221201",
    "name": "Merrell Marina Arauco",
    "squareMeters": 69
  },
  {
    "code": "221301",
    "name": "Merrell Parque Arauco",
    "squareMeters": 60.5
  },
  {
    "code": "221302",
    "name": "Merrell La Dehesa",
    "squareMeters": 68.75
  },
  {
    "code": "221303",
    "name": "Merrell Alto Las Condes",
    "squareMeters": 77
  },
  {
    "code": "221304",
    "name": "Merrell Costanera Center",
    "squareMeters": 106
  },
  {
    "code": "221501",
    "name": "Merrell Aires Vespucio",
    "squareMeters": 76
  },
  {
    "code": "221502",
    "name": "Merrell Aires Plaza Oeste",
    "squareMeters": 57
  },
  {
    "code": "221503",
    "name": "Merrell Mall Plaza Egana",
    "squareMeters": 99.77
  },
  {
    "code": "221504",
    "name": "Merrell Arauco Maipu",
    "squareMeters": 88
  },
  {
    "code": "221505",
    "name": "Merrell Florida Center",
    "squareMeters": 90
  },
  {
    "code": "221506",
    "name": "Merrell Buenaventura",
    "squareMeters": 78
  },
  {
    "code": "221701",
    "name": "Merrell Plaza El Trebol",
    "squareMeters": 98.8
  },
  {
    "code": "221702",
    "name": "Merrell Mall Plaza Los Angeles",
    "squareMeters": 70.66
  },
  {
    "code": "221703",
    "name": "Merrell Mall Center Curico",
    "squareMeters": 151
  },
  {
    "code": "221704",
    "name": "Merrell Plaza El Roble",
    "squareMeters": 90
  },
  {
    "code": "221705",
    "name": "Merrell Talca",
    "squareMeters": 70.5
  },
  {
    "code": "221706",
    "name": "MLL BIO BIO",
    "squareMeters": 124
  },
  {
    "code": "221801",
    "name": "Merrell Portal Temuco",
    "squareMeters": 55
  },
  {
    "code": "221802",
    "name": "Merrell Valdivia",
    "squareMeters": 73
  },
  {
    "code": "221803",
    "name": "Merrell Paseo Costanera",
    "squareMeters": 87
  },
  {
    "code": "221804",
    "name": "Merrell Pucon",
    "squareMeters": 40
  },
  {
    "code": "221805",
    "name": "Merrell Coyhaique",
    "squareMeters": 59
  },
  {
    "code": "221806",
    "name": "Merrell Puerto Varas",
    "squareMeters": 80
  },
  {
    "code": "221807",
    "name": "Merrell Paseo Chiloe",
    "squareMeters": 90.5
  },
  {
    "code": "222101",
    "name": "Columbia Plaza Antofagasta",
    "squareMeters": 64.01
  },
  {
    "code": "222102",
    "name": "Columbia Mall Plaza Copiapo",
    "squareMeters": 116.5
  },
  {
    "code": "222103",
    "name": "Columbia Mall Plaza Calama",
    "squareMeters": 97
  },
  {
    "code": "222201",
    "name": "Columbia Marina Arauco",
    "squareMeters": 111
  },
  {
    "code": "222301",
    "name": "Columbia Parque Arauco",
    "squareMeters": 96.13
  },
  {
    "code": "222302",
    "name": "Columbia La Dehesa",
    "squareMeters": 108
  },
  {
    "code": "222303",
    "name": "Columbia Alto Las Condes",
    "squareMeters": 84.8
  },
  {
    "code": "222304",
    "name": "Columbia Costanera Center",
    "squareMeters": 128.2
  },
  {
    "code": "222305",
    "name": "Columbia Mall Sport",
    "squareMeters": 83.7
  },
  {
    "code": "222306",
    "name": "Mountain Hardwear Mall Sport",
    "squareMeters": 75
  },
  {
    "code": "222307",
    "name": "Columbia Plaza Oeste",
    "squareMeters": 67.56
  },
  {
    "code": "222501",
    "name": "Columbia Florida Center",
    "squareMeters": 152
  },
  {
    "code": "222502",
    "name": "Columbia Aires Vespucio",
    "squareMeters": 110
  },
  {
    "code": "222503",
    "name": "Columbia Arauco Maipu",
    "squareMeters": 112.62
  },
  {
    "code": "222504",
    "name": "Columbia Mall Plaza Egaña",
    "squareMeters": 102.5
  },
  {
    "code": "222505",
    "name": "Columbia La Fabrica",
    "squareMeters": 196
  },
  {
    "code": "222506",
    "name": "Columbia Plaza Tobalaba",
    "squareMeters": 69
  },
  {
    "code": "222507",
    "name": "Columbia Mall Plaza Sur",
    "squareMeters": 68
  },
  {
    "code": "222701",
    "name": "Columbia Plaza El Trebol",
    "squareMeters": 83
  },
  {
    "code": "222702",
    "name": "Columbia Plaza Los Angeles",
    "squareMeters": 105
  },
  {
    "code": "222703",
    "name": "Columbia Portal Temuco",
    "squareMeters": 116.45
  },
  {
    "code": "222704",
    "name": "Columbia Plaza El Roble",
    "squareMeters": 76
  },
  {
    "code": "222705",
    "name": "Columbia Curicó",
    "squareMeters": 63
  },
  {
    "code": "222706",
    "name": "Columbia Plaza Maule",
    "squareMeters": 105.5
  },
  {
    "code": "222707",
    "name": "CLB BIO BIO",
    "squareMeters": 154.2
  },
  {
    "code": "222801",
    "name": "Columbia Puerto Montt",
    "squareMeters": 80.3
  },
  {
    "code": "222803",
    "name": "Columbia Paseo Puerto Varas",
    "squareMeters": 77.3
  },
  {
    "code": "222804",
    "name": "Columbia Osorno",
    "squareMeters": 77.93
  },
  {
    "code": "222805",
    "name": "Columbia Mall Pionero (punta Arenas)",
    "squareMeters": 87
  },
  {
    "code": "222806",
    "name": "Columbia Coyhaique",
    "squareMeters": 68
  },
  {
    "code": "222807",
    "name": "Columbia Valdivia",
    "squareMeters": 105
  },
  {
    "code": "222808",
    "name": "Columbia Pucón",
    "squareMeters": 85
  },
  {
    "code": "222809",
    "name": "PORTAL TEMUCO",
    "squareMeters": 116.45
  },
  {
    "code": "222810",
    "name": "COLUMBIA LOS ALERCES",
    "squareMeters": 110.8
  },
  {
    "code": "223101",
    "name": "Caterpillar Plaza Antofagasta",
    "squareMeters": 77
  },
  {
    "code": "223102",
    "name": "Caterpillar Plaza Calama",
    "squareMeters": 108
  },
  {
    "code": "223103",
    "name": "Caterpillar Plaza La Serena",
    "squareMeters": 92.3
  },
  {
    "code": "223104",
    "name": "Caterpillar Mall Plaza Copiapo",
    "squareMeters": 129
  },
  {
    "code": "223105",
    "name": "Caterpillar Iquique",
    "squareMeters": 84
  },
  {
    "code": "223201",
    "name": "Caterpillar Marina Arauco",
    "squareMeters": 96
  },
  {
    "code": "223301",
    "name": "Caterpillar Parque Arauco",
    "squareMeters": 80.3
  },
  {
    "code": "223302",
    "name": "Caterpillar Costanera Center",
    "squareMeters": 156
  },
  {
    "code": "223303",
    "name": "Caterpillar Alto Las Condes",
    "squareMeters": 92
  },
  {
    "code": "223304",
    "name": "Caterpillar Los Dominicos",
    "squareMeters": 92
  },
  {
    "code": "223501",
    "name": "Caterpillar Florida Center",
    "squareMeters": 86
  },
  {
    "code": "223502",
    "name": "Caterpillar Portal Ñuñoa",
    "squareMeters": 95.6
  },
  {
    "code": "223503",
    "name": "Caterpillar Plaza Norte",
    "squareMeters": 90.45
  },
  {
    "code": "223504",
    "name": "Caterpillar Plaza Tobalaba",
    "squareMeters": 91
  },
  {
    "code": "223505",
    "name": "Caterpillar Plaza Vespucio",
    "squareMeters": 190
  },
  {
    "code": "223506",
    "name": "Caterpillar Arauco Maipu",
    "squareMeters": 66
  },
  {
    "code": "223507",
    "name": "Caterpillar Mall Plaza Egaña",
    "squareMeters": 122.3
  },
  {
    "code": "223508",
    "name": "Caterpillar Aires Plaza Oeste",
    "squareMeters": 95
  },
  {
    "code": "223509",
    "name": "Caterpillar La Fabrica",
    "squareMeters": 205
  },
  {
    "code": "223510",
    "name": "Caterpillar Mall Plaza Sur",
    "squareMeters": 54
  },
  {
    "code": "223511",
    "name": "Caterpillar Independencia",
    "squareMeters": 81
  },
  {
    "code": "223512",
    "name": "Caterpillar Buenaventura",
    "squareMeters": 89
  },
  {
    "code": "223513",
    "name": "Caterpillar Portal el Llano",
    "squareMeters": 78
  },
  {
    "code": "223701",
    "name": "Cat Plaza El Trebol",
    "squareMeters": 99.9
  },
  {
    "code": "223702",
    "name": "Cat Mall Curico",
    "squareMeters": 124
  },
  {
    "code": "223703",
    "name": "Cat Mall Centro Talca",
    "squareMeters": 114.12
  },
  {
    "code": "223704",
    "name": "Cat Portal Temuco",
    "squareMeters": 61
  },
  {
    "code": "223705",
    "name": "Cat Mall Del Centro Concepcion",
    "squareMeters": 71
  },
  {
    "code": "223706",
    "name": "Cat Plaza El Roble",
    "squareMeters": 87
  },
  {
    "code": "223707",
    "name": "Cat Portal Rancagua",
    "squareMeters": 82
  },
  {
    "code": "223708",
    "name": "Cat Valdivia",
    "squareMeters": 83
  },
  {
    "code": "223709",
    "name": "Cat Plaza Los Angeles",
    "squareMeters": 70.86
  },
  {
    "code": "223802",
    "name": "Cat Paseo Costanera",
    "squareMeters": 94
  },
  {
    "code": "223803",
    "name": "Cat Osorno",
    "squareMeters": 62
  },
  {
    "code": "223804",
    "name": "Cat Paseo Chiloe",
    "squareMeters": 95.4
  },
  {
    "code": "223805",
    "name": "PORTAL TEMUCO",
    "squareMeters": 61
  },
  {
    "code": "223806",
    "name": "VALDIVIA",
    "squareMeters": 83
  },
  {
    "code": "223807",
    "name": "CAT PASEO VALDIVIA",
    "squareMeters": 66
  },
  {
    "code": "226301",
    "name": "7veinte Alto Las Condes",
    "squareMeters": 72
  },
  {
    "code": "226302",
    "name": "7veinte Mall Sport",
    "squareMeters": 121
  },
  {
    "code": "226304",
    "name": "7veinte Open Kennedy",
    "squareMeters": 73
  },
  {
    "code": "226305",
    "name": "7veinte Costanera Center",
    "squareMeters": 110
  },
  {
    "code": "226306",
    "name": "7Veinte Parque Arauco",
    "squareMeters": 110
  },
  {
    "code": "226506",
    "name": "7veinte Mall Plaza Egaña",
    "squareMeters": 119.8
  },
  {
    "code": "226508",
    "name": "7veinte Arauco Maipu",
    "squareMeters": 66
  },
  {
    "code": "226702",
    "name": "7veinte Plaza El Roble",
    "squareMeters": 113
  },
  {
    "code": "226703",
    "name": "7veinte Valdivia",
    "squareMeters": 82.5
  },
  {
    "code": "226704",
    "name": "7veinte Maule",
    "squareMeters": 105.5
  },
  {
    "code": "226801",
    "name": "7veinte Puerto Varas",
    "squareMeters": 44
  },
  {
    "code": "226802",
    "name": "7Veinte Paseo Valdivia",
    "squareMeters": 82.5
  },
  {
    "code": "227101",
    "name": "Bbg Plaza Antofagasta",
    "squareMeters": 124.94
  },
  {
    "code": "227102",
    "name": "Bbg Iquique",
    "squareMeters": 91.5
  },
  {
    "code": "227201",
    "name": "Bbg Marina Arauco",
    "squareMeters": 112.5
  },
  {
    "code": "227303",
    "name": "Bbg Alto Las Condes",
    "squareMeters": 95
  },
  {
    "code": "228101",
    "name": "Vans Antofagasta",
    "squareMeters": 121.5
  },
  {
    "code": "228201",
    "name": "Vans Marina Arauco",
    "squareMeters": 77
  },
  {
    "code": "228301",
    "name": "Vans Costanera Center",
    "squareMeters": 106.99
  },
  {
    "code": "228302",
    "name": "Vans Parque Arauco",
    "squareMeters": 133.11
  },
  {
    "code": "228303",
    "name": "Vans Alto Las Condes",
    "squareMeters": 72.4
  },
  {
    "code": "228501",
    "name": "Vans Buenaventura",
    "squareMeters": 108.2
  },
  {
    "code": "228502",
    "name": "Vans Plaza Vespucio",
    "squareMeters": 193.99
  },
  {
    "code": "228503",
    "name": "Vans Arauco Maipu",
    "squareMeters": 97.75
  },
  {
    "code": "228504",
    "name": "Vans Plaza Oeste",
    "squareMeters": 115.1
  },
  {
    "code": "228701",
    "name": "Vans Valdivia",
    "squareMeters": 77
  },
  {
    "code": "228702",
    "name": "Vans Chillan",
    "squareMeters": 117
  },
  {
    "code": "228703",
    "name": "Vans Portal Temuco",
    "squareMeters": 109
  },
  {
    "code": "228704",
    "name": "Vans Plaza Del Trebol",
    "squareMeters": 124.5
  },
  {
    "code": "228801",
    "name": "Vans Paseo Costanera",
    "squareMeters": 103.86
  },
  {
    "code": "228802",
    "name": "VALDIVIA",
    "squareMeters": 77
  },
  {
    "code": "228803",
    "name": "PORTAL TEMUCO",
    "squareMeters": 109
  },
  {
    "code": "229102",
    "name": "Ua Mall Plaza Antofagasta",
    "squareMeters": 433
  },
  {
    "code": "229103",
    "name": "Ua Coquimbo Outlet",
    "squareMeters": 264
  },
  {
    "code": "229201",
    "name": "Ua Marina Arauco",
    "squareMeters": 248
  },
  {
    "code": "229202",
    "name": "Ua Curauma Premium Outlet",
    "squareMeters": 414
  },
  {
    "code": "229301",
    "name": "Ua Parque Arauco",
    "squareMeters": 402
  },
  {
    "code": "229302",
    "name": "Ua Costanera Center",
    "squareMeters": 372
  },
  {
    "code": "229303",
    "name": "UA Plaza los Dominicos",
    "squareMeters": 327
  },
  {
    "code": "229304",
    "name": "UA Mall Sport",
    "squareMeters": 148.55
  },
  {
    "code": "229501",
    "name": "Ua Florida Center",
    "squareMeters": 204
  },
  {
    "code": "229502",
    "name": "Ua Plaza Vespucio",
    "squareMeters": 190
  },
  {
    "code": "229503",
    "name": "Ua Easton Premium Outlet",
    "squareMeters": 612
  },
  {
    "code": "229504",
    "name": "Ua Buenaventura",
    "squareMeters": 392
  },
  {
    "code": "229505",
    "name": "UA Plaza Oeste",
    "squareMeters": 241
  },
  {
    "code": "229701",
    "name": "Ua Mall Plaza El Trebol",
    "squareMeters": 159
  },
  {
    "code": "229702",
    "name": "Ua San Pedro Outlet",
    "squareMeters": 341
  },
  {
    "code": "229703",
    "name": "Ua Portal Temuco",
    "squareMeters": 304
  },
  {
    "code": "229801",
    "name": "UA Paseo Valdivia",
    "squareMeters": 160
  },
  {
    "code": "229802",
    "name": "UA Paseo Costanera",
    "squareMeters": 130
  },
  {
    "code": "229803",
    "name": "PORTAL TEMUCO",
    "squareMeters": 304
  },
  {
    "code": "229804",
    "name": "UA PASEO LOS ALERCES",
    "squareMeters": 154.2
  },
  {
    "code": "230201",
    "name": "BSoul Marina Arauco",
    "squareMeters": 80
  },
  {
    "code": "230301",
    "name": "BSoul Parque Arauco",
    "squareMeters": 35
  },
  {
    "code": "230302",
    "name": "Brooks Mall Sport",
    "squareMeters": 69
  },
  {
    "code": "230303",
    "name": "Brooks Alto Las Condes",
    "squareMeters": 61.98
  },
  {
    "code": "230304",
    "name": "Bsoul Casa Costanera",
    "squareMeters": 70.92
  },
  {
    "code": "231201",
    "name": "CROCS  MARINA ARAUCO",
    "squareMeters": 93.5
  },
  {
    "code": "231301",
    "name": "CROCS  ALTO LAS CONDES",
    "squareMeters": 80.6
  },
  {
    "code": "231302",
    "name": "Crocs Costanera Center",
    "squareMeters": 102.5
  },
  {
    "code": "231501",
    "name": "Crocs Plaza Vespucio",
    "squareMeters": 88
  },
  {
    "code": "231502",
    "name": "CROCS Outlet Buenaventura",
    "squareMeters": 88
  },
  {
    "code": "232201",
    "name": "LOP  MARINA ORIENTE",
    "squareMeters": 46122
  },
  {
    "code": "232301",
    "name": "LOP  LUIS PASTEUR",
    "squareMeters": 34.4
  },
  {
    "code": "232302",
    "name": "LOP  CASA COSTANERA",
    "squareMeters": 44.4
  },
  {
    "code": "232303",
    "name": "LOP  PORTAL LA DEHESA",
    "squareMeters": 37.9
  },
  {
    "code": "232304",
    "name": "LOP  PARQUE ARAUCO",
    "squareMeters": 33
  },
  {
    "code": "232305",
    "name": "LOP  ALTO LAS CONDES",
    "squareMeters": 33.4
  },
  {
    "code": "232306",
    "name": "LOP  COSTANERA CENTER",
    "squareMeters": 40
  },
  {
    "code": "232307",
    "name": "LOP LOS DOMINICOS",
    "squareMeters": 41.7
  },
  {
    "code": "233201",
    "name": "PARFOIS MARINA ORIENTE",
    "squareMeters": 140
  },
  {
    "code": "233301",
    "name": "PARFOIS Costanera Center",
    "squareMeters": 97.36
  },
  {
    "code": "233302",
    "name": "PARFOIS ALTO LAS CONDES",
    "squareMeters": 124.7
  }
];
