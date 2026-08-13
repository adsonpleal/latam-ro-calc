/**
 * Malangdo weapon enchants — the list Snow (malangdo 213, 167) accepts, from
 * https://browiki.org/wiki/Encantamentos_de_Malangdo
 *
 * The NPC enchants level 3 and 4 weapons and "aceita todas as versões de arma, com
 * ou sem slot", so every name below carries all of its ids. A weapon gets two
 * enchants, except one with 3 card slots, which gets a single one.
 *
 * Keyed by item ID, not by aegisName, because the EnchantTable's aegisName lookup
 * cannot reach most of these: item.json carries the client's Korean resource name
 * for ~1000 items (tools/sync-latam-db.mjs falls back to it when ragassets has no
 * item_db aegis name), which never matches an entry. That is why Faca de Combate
 * (1228, "컴뱃나이프") had no enchant dropdown at all.
 *
 * Names are the wiki's; where it spells one differently from the client, the id is
 * what settles it — Mysteltainn is the client's "Mysteltain" (1138) and Selada
 * Mágica/Maligna/Máxima are the "Espada do Selo …" swords (13460-13462).
 *
 * Wiki entries with no counterpart in the calculator's database are left out: the
 * whole Maças and Soqueiras sections, plus Adaga do Algoz, Weihna, Tiro Centelha,
 * Balista, Zweihander, Toque Profano, Rugido Sangrento and Infiltrador.
 */
export const MALANGDO_WEAPON_IDS: Record<string, number[]> = {
  // Adagas
  'Destruidor de Espada': [1224, 13031],  // 3 slots: 13031 → 1 enchant
  'Destruidor de Malha': [1225, 13032],  // 3 slots: 13032 → 1 enchant
  'Faca de Capina': [1227],
  'Faca da Mamãe': [1229],
  'Adaga Exorcista': [1233],
  'Azoth': [1235],
  'Sucsamad': [1236, 13018],
  'Adaga Sinistra': [1237],
  'Adaga Real': [1240],
  'Adaga Profana': [1241],
  'Adaga Certeira': [1242],
  'Adaga Sagrada': [1244],
  'Krieg': [13046],  // 3 slots: 13046 → 1 enchant
  'Adaga Negra': [13061],
  'Adaga da Boa Ventura': [1223],
  'Faca de Combate': [1228],
  'Walgwanggum': [1234],
  'Rondel': [1230, 13017],
  'Bazerald': [1231],
  'Adaga Ritualística': [13062],
  // Armas de Fogo
  'Viúva-Negra': [13138],
  'Rosa Labareda': [28225],
  'Finalizadora': [28223],
  'Vingador': [28226],
  // Arcos
  'Arco Voraz': [1719],
  'Asa de Dragão': [1724],
  'Arco do Menestrel': [1725],
  'Asas de Ixion': [1737, 18129],  // 3 slots: 18129 → 1 enchant
  'Arco de Nepenthes': [1740],
  'Mentiroso Maldito': [1741],
  'Assalto do Falcão': [1745],
  'Arco Místico': [18103],
  'Arco de Rudra': [1720],
  // Cajados
  'Cajado do Vento': [1616],
  'Cajado do Cavalheiro': [1629],
  'Vara Sagrada': [1631],
  'Cajado da Árvore Morta': [1643],
  'Cajado Mental': [1654],
  'Cauda de Gato Bruta Dourada': [1697],
  'Cauda de Gato Arcana Dourada': [1693],
  'Cajado de Espinhos da Escuridão': [1636, 1664],
  'Apaga-Mentes': [1637],
  // Cajados de 2 Mãos
  'Cajado Esfíngico': [1473],
  'Kronos': [2004],
  'Cajado Dea': [2005],
  'Cruz Divina': [2001],
  'Bastão da Destruição': [2000],
  'Jovem Girassol': [2027],
  // Chicotes
  'Serpente': [1962],
  'Rosa Fustigante': [1963],
  'Chemeti': [1964],
  'Chicote Lâmina': [1969],
  'Chicote da Rainha': [1970, 1976],
  'Enguia Elétrica': [1972],
  'Botas da Bruxa do Mar': [1973],
  'Chicote de Cenoura': [1974],
  'Caule de Nepenthes': [1979],
  'Chicote de Raiz': [1984],
  'Chicote Caule de Rosa': [1985],
  // Espadas
  'Alfanje de Gelo': [1131],
  'Língua de Fogo': [1133],
  'Espada de Tesoura': [1134],
  'Cutelo': [1135, 13400],
  'Espada Solar': [1136],
  'Mysteltainn': [1138],
  'Talefing': [1139],
  'Byeollungum': [1140],
  'Espada Imaterial': [1141],
  'Lâmina de Poeira Estelar': [1148],
  'Roubel': [13421],
  'Lâmina Gêmea Azul': [13412],  // 3 slots: 13412 → 1 enchant
  'Lâmina Gêmea Vermelha': [13413],  // 3 slots: 13413 → 1 enchant
  'Espada Cromada': [13431],
  'Excalibur': [1137],
  'Nagan': [1130],
  'Lâmina Turca': [1132],
  'Selada Mágica': [13460],
  'Selada Maligna': [13461],
  'Selada Máxima': [13462],
  // Espadas de 2 Mãos
  'Muramasa': [1164, 21003],
  'Caçadora de Dragões': [1166],
  'Schweizersabel': [1167, 1178],
  'Katzbalger': [1170],
  'Dilaceradora': [1176],
  'Tae Goo Lyeon': [1181],
  'Comedor Sangrento': [1182],
  'Espada Veterana': [1188],
  'Krasnaya': [1189],  // 3 slots: 1189 → 1 enchant
  'Zanbatô': [1175],
  'Bastarda Cromada': [1196],
  'Masamune': [1165],
  'Executora': [1169, 1179],
  'Terror Violeta': [1185],
  'Guia da Morte': [1186],
  'Lindy Hop': [21018],
  // Instrumentos Musicais
  'Guitarra Elétrica': [1913],
  'Alaúde Oriental': [1918, 1922],
  'Guitarra Frenética': [1920],
  'Harpa de Nepenthes': [1926],
  'Flauta de Raiz': [1930],
  // Katares
  'Lágrimas Sangrentas': [1271, 1295],  // 3 slots: 1295 → 1 enchant
  'Katar Perfurante': [1270],
  'Krishna': [1284],
  'Chakram': [1285],
  'Garra da Fera Selvagem': [1268],
  'Escama Invertida': [1269, 1297],
  'Juliette De Rachel': [28010],
  // Lanças
  'Lança Longa': [1420],
  'Gungnir': [1413, 1418],
  'Gelerdria': [1414, 1449],  // 3 slots: 1449 → 1 enchant
  'Tjungkuletti': [1416],
  'Lança Imperial': [1433],
  'Broca': [1415],
  'Lança de Gancho': [1421],
  'Lança de Caça': [1422],
  'Lança Peçonhenta': [1447],  // 3 slots: 1447 → 1 enchant
  // Lanças de 2 Mãos
  'Foice': [1466, 1476],
  'Guisarme-Bico': [1467],
  'Zéfiro': [1468, 1481],  // 3 slots: 1481 → 1 enchant
  'Lança de Longuinho': [1469],
  'Brionac': [1470],
  'Fogo Infernal': [1471],
  'Gae Bolg': [1474, 1480],
  'Lança Espectral': [1477],
  'Ahlspiess': [1478],
  'Pilares': [1484],
  // Livros
  'Livro do Apocalipse': [1557],
  'Diário de Menina': [1558],
  'Herança do Dragão': [1559],
  'Livro Capa Dura': [1561],
  'Diário de Campo de Batalha': [1562],
  'Death Note': [1565],
  // Machados
  'Talhador': [1305],
  'Machado Vecer': [1311],
  'Machado Impetuoso': [1364],
  'Sabbath': [1365],
  'Martelo Quebra-Pedra de Bradium': [1385],
  'Carniceiro': [1367],
  'Tacape': [1368],
  'Machado Gigante': [1387],
  'Guilhotina': [1369],
  'Machado Sangrento': [1363],
  'Desolador': [1376],
  'Fúria do Furacão': [1377],
  'Cruz Impiedosa': [1366],
  'Machado do Apocalipse': [1370, 1371],
};
