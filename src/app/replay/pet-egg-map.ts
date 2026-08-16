/**
 * Pet view id (the `view` the replay carries on the pet entity) -> egg id in item.json,
 * which is how the calculator models a pet.
 *
 * Source: the client's own table, `PetEggItemID_PetJobID` in
 * `data/luafiles514/lua files/datainfo/petinfo.lub` (there the key is the egg and the
 * value the view; here it is inverted). It only resolves after running `npcidentity.lub`
 * in the same environment, otherwise the `JT_*` constants are nil and the table comes out
 * empty:
 *
 *   const G = runChunk(npcidentityLub); runChunkInto(petinfoLub, G);
 *   G.get('PetEggItemID_PetJobID')
 *
 * Eggs not yet in item.json are kept here on purpose — the importer checks the item
 * before using it, so they start working on their own once they are added. The ones still
 * marked below are the pets the LATAM client does not name at all, plus the seven whose
 * description is typed "Ovo de Bichinho" rather than "Ovo de Mascote" (the Goblin line,
 * Goblin Natalino, Buzzy Brother, Coelho and Lebre da Neve).
 */
export const PET_EGG_BY_VIEW: Record<number, number> = {
  1002: 9001, // Ovo de Poring
  1005: 9138, // Ovo de Familiar
  1010: 9103, // Ovo de Salgueiro
  1011: 9006, // Ovo de Chonchon
  1014: 9012, // Ovo de Esporo
  1019: 9014, // Ovo de PecoPeco
  1023: 9017, // Ovo de Guerreiro Orc
  1026: 9018, // Ovo de Munak
  1029: 9021, // Ovo de Ísis
  1031: 9003, // Ovo de Poporing
  1035: 9008, // Ovo de Mosca Caçadora
  1040: 9053, // Ovo de Golem
  1041: 9102, // Ovo de Múmia
  1042: 9007, // Ovo de Chonchon de Aço
  1049: 9005, // Ovo de Picky
  1052: 9011, // Ovo de Rocker
  1056: 9015, // Ovo de Fumacento
  1057: 9016, // Ovo de Yoyo
  1058: 9106, // Ovo de Metaller
  1063: 9004, // Ovo de Lunático
  1077: 9013, // Ovo de Esporo Venenoso
  1090: 9069, // Ovo de Mastering
  1096: 9088, // Ovo de Angeling
  1101: 9024, // Ovo de Bafomé Jr.
  1106: 9129, // Ovo de Lobo do Deserto
  1107: 9010, // Ovo de Filhote de Lobo
  1109: 9023, // Ovo de Deviruchi
  1110: 9019, // Ovo de Dokebi
  1113: 9002, // Ovo de Drops
  1122: 9032, // Ovo de Goblin (Adaga) (not in item.json)
  1123: 9033, // Ovo de Goblin (Mangual) (not in item.json)
  1125: 9034, // Ovo de Goblin (Martelo) (not in item.json)
  1143: 9043, // Ovo de Marionete
  1148: 9050, // Ovo de Medusa
  1155: 9022, // Ovo de Petite
  1166: 9070, // Ovo de Selvagem
  1167: 9009, // Ovo de Bebê Selvagem
  1170: 9020, // Ovo de Sohee
  1179: 9045, // Ovo de Sussurro
  1180: 9095, // Ovo de Nove Caudas
  1188: 9025, // Ovo de Bongun
  1198: 9128, // Ovo de Sacerdote Maldito
  1200: 9026, // Ovo de Jirtas
  1208: 9037, // Ovo de Andarilho
  1213: 9087, // Ovo de Grand Orc
  1214: 9091, // Ovo de Choco
  1242: 9061, // (not named in the client, not in item.json)
  1245: 9029, // Ovo de Goblin Natalino (not in item.json)
  1275: 9027, // Ovo de Alice
  1297: 9107, // Ovo de Múmia Anciã
  1299: 9046, // Ovo de Líder Goblin
  1301: 9089, // Ovo de Am Mut
  1307: 9096, // Ovo de Gato de Nove Caudas
  1369: 9071, // Ovo de Grand Peco
  1370: 9055, // Ovo de Succubus
  1374: 9052, // Ovo de Incubus
  1379: 9054, // Ovo de Pesadelo Sombrio
  1382: 9036, // (not named in the client, not in item.json)
  1385: 9035, // (not named in the client, not in item.json)
  1401: 9044, // Ovo de Shinobi
  1404: 9048, // Ovo de Miyabi Ningyo
  1416: 9047, // Ovo de Ninfa Perversa
  1495: 9051, // Ovo do Atirador de Pedras
  1504: 9049, // Ovo de Dullahan
  1505: 9042, // Ovo de Loli Ruri
  1512: 9093, // Ovo de Yao Jun
  1513: 9040, // Ovo de Mao Guai
  1586: 9041, // Ovo de Gato de Folha
  1622: 9099, // Ovo de Ursinho
  1630: 9039, // (not named in the client, not in item.json)
  1631: 9030, // Ovo de Chung E
  1632: 9100, // Ovo de Gremlin
  1735: 9119, // Ovo de Alicel
  1736: 9118, // Ovo de Aliot
  1737: 9120, // Ovo de Aliza
  1754: 9187, // Ovo de Skeggiold
  1773: 9105, // Ovo de Hodremlin
  1782: 9104, // Ovo de Roween
  1815: 9028, // Ovo de Mascote Buzzy Brother (not in item.json)
  1837: 9056, // Ovo de Imp
  1879: 9031, // Ovo de Coelho (not in item.json)
  1894: 9114, // Ovo de Pouring
  1963: 9038, // (not named in the client, not in item.json)
  2200: 9057, // (not named in the client, not in item.json)
  2210: 9058, // Ovo de Lebre da Neve (not in item.json)
  2313: 9059, // Ovo de Tikbalang
  2398: 9062, // Ovo de Bebê Poring
  2963: 9063, // (not named in the client, not in item.json)
  2995: 9108, // Ovo de Ursinho Abominável
  3023: 9131, // Ovo de Golem de Fogo
  3162: 9064, // (not named in the client, not in item.json)
  3163: 9065, // (not named in the client, not in item.json)
  3164: 9066, // (not named in the client, not in item.json)
  3165: 9067, // (not named in the client, not in item.json)
  3261: 9068, // Ovo de Unicórnio
  3306: 9080, // (not named in the client, not in item.json)
  3317: 9074, // (not named in the client, not in item.json)
  3318: 9075, // (not named in the client, not in item.json)
  3319: 9076, // (not named in the client, not in item.json)
  3320: 9077, // (not named in the client, not in item.json)
  3321: 9078, // (not named in the client, not in item.json)
  3349: 9079, // (not named in the client, not in item.json)
  3350: 9081, // (not named in the client, not in item.json)
  3351: 9082, // (not named in the client, not in item.json)
  3352: 9083, // (not named in the client, not in item.json)
  3353: 9084, // (not named in the client, not in item.json)
  3354: 9085, // (not named in the client, not in item.json)
  3355: 9086, // (not named in the client, not in item.json)
  3495: 9092, // Ovo de Omeleting
  3496: 9094, // Ovo de Lunático Folhado
  3636: 9090, // Ovo de Bebê Ísis
  3669: 9097, // Ovo de Diabolik
  3670: 9098, // Ovo de Deletério
  3731: 9101, // Gaiola do Zumbichano
  3790: 9109, // Ovo de Quinding
  3904: 9110, // (not named in the client, not in item.json)
  3971: 9113, // Ovo de Esqueleão
  20373: 9116, // Ovo de Pesadelo Sinistro
  20420: 9117, // Ovo de Andarilho Poluto
  20423: 9115, // Ovo de Lady Branca
  20424: 9112, // Ovo de Flor do Luar
  20425: 9111, // Ovo de Freeoni
  20525: 9130, // Ovo de Bafinho Caótico
  20571: 9121, // Ovo de Orc Herói
  20619: 9122, // Ovo de Pesar Noturno
  20696: 9123, // Ovo de Mini Beta
  20697: 9124, // Ovo de Mini Alpha
  21089: 9125, // Ovo de Patinho
  21290: 9126, // Ovo de Kiel-D-01
  21502: 9137, // Ovo de Bafomé
  21630: 9141, // Ovo de Rosa Selvagem
  21631: 9140, // Ovo da Loli Ruri Azul
  21650: 9133, // Ovo de Cavaleiro Mutante
  21651: 9132, // O Ovo do Cavaleiro do Abismo
  21653: 9142, // Ovo de Eddga
  22185: 9148, // Ovo de Senhor das Trevas
  22299: 9156, // Ovo de Chao
  22405: 9193, // Ovo de Abelha-Rainha
  22504: 9169, // Ovo de Gerente
  22506: 9171, // Ovo de Vigia do Tempo
  23000: 9139, // Ovo de Ilusão das Trevas
};
