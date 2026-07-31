/**
 * Id de visual do mascote (o `view` que o replay traz na entidade do pet) -> id do ovo
 * no item.json, que é como a calculadora modela o mascote.
 *
 * Fonte: a própria tabela do cliente, `PetEggItemID_PetJobID` em
 * `data/luafiles514/lua files/datainfo/petinfo.lub` (a chave é o ovo, o valor é o view;
 * aqui está invertida). Ela só resolve depois de rodar `npcidentity.lub` no mesmo
 * ambiente, senão as constantes `JT_*` ficam nil e a tabela sai vazia:
 *
 *   const G = runChunk(npcidentityLub); runChunkInto(petinfoLub, G);
 *   G.get('PetEggItemID_PetJobID')
 *
 * Os ovos que ainda não estão no item.json ficam aqui de propósito — o importador
 * checa o item antes de usar, então eles passam a funcionar sozinhos quando forem
 * cadastrados.
 */
export const PET_EGG_BY_VIEW: Record<number, number> = {
  1002: 9001, // Ovo de Poring (fora do item.json)
  1005: 9138, // Ovo de Familiar
  1010: 9103, // Ovo de Salgueiro (fora do item.json)
  1011: 9006, // Ovo de Chonchon (fora do item.json)
  1014: 9012, // Ovo de Esporo (fora do item.json)
  1019: 9014, // Ovo de PecoPeco (fora do item.json)
  1023: 9017, // Ovo de Guerreiro Orc (fora do item.json)
  1026: 9018, // Ovo de Munak (fora do item.json)
  1029: 9021, // Ovo de Ísis (fora do item.json)
  1031: 9003, // Ovo de Poporing (fora do item.json)
  1035: 9008, // Ovo de Mosca Caçadora
  1040: 9053, // Ovo de Golem (fora do item.json)
  1041: 9102, // Ovo de Múmia (fora do item.json)
  1042: 9007, // Ovo de Chonchon de Aço (fora do item.json)
  1049: 9005, // Ovo de Picky (fora do item.json)
  1052: 9011, // Ovo de Rocker (fora do item.json)
  1056: 9015, // Ovo de Fumacento (fora do item.json)
  1057: 9016, // Ovo de Yoyo
  1058: 9106, // Ovo de Metaller (fora do item.json)
  1063: 9004, // Ovo de Lunático (fora do item.json)
  1077: 9013, // Ovo de Esporo Venenoso (fora do item.json)
  1090: 9069, // Ovo de Mastering (fora do item.json)
  1096: 9088, // Ovo de Angeling
  1101: 9024, // Ovo de Bafomé Jr. (fora do item.json)
  1106: 9129, // Ovo de Lobo do Deserto
  1107: 9010, // Ovo de Filhote de Lobo (fora do item.json)
  1109: 9023, // Ovo de Deviruchi (fora do item.json)
  1110: 9019, // Ovo de Dokebi (fora do item.json)
  1113: 9002, // Ovo de Drops (fora do item.json)
  1122: 9032, // Ovo de Goblin (Adaga) (fora do item.json)
  1123: 9033, // Ovo de Goblin (Mangual) (fora do item.json)
  1125: 9034, // Ovo de Goblin (Martelo) (fora do item.json)
  1143: 9043, // Ovo de Marionete (fora do item.json)
  1148: 9050, // Ovo de Medusa (fora do item.json)
  1155: 9022, // Ovo de Petite (fora do item.json)
  1166: 9070, // Ovo de Selvagem (fora do item.json)
  1167: 9009, // Ovo de Bebê Selvagem (fora do item.json)
  1170: 9020, // Ovo de Sohee (fora do item.json)
  1179: 9045, // Ovo de Sussurro (fora do item.json)
  1180: 9095, // Ovo de Nove Caudas
  1188: 9025, // Ovo de Bongun (fora do item.json)
  1198: 9128, // Ovo de Sacerdote Maldito
  1200: 9026, // Ovo de Jirtas (fora do item.json)
  1208: 9037, // Ovo de Andarilho (fora do item.json)
  1213: 9087, // Ovo de Grand Orc
  1214: 9091, // Ovo de Choco
  1242: 9061, // (sem nome no cliente)
  1245: 9029, // Ovo de Goblin Natalino (fora do item.json)
  1275: 9027, // Ovo de Alice (fora do item.json)
  1297: 9107, // Ovo de Múmia Anciã
  1299: 9046, // Ovo de Líder Goblin (fora do item.json)
  1301: 9089, // Ovo de Am Mut
  1307: 9096, // Ovo de Gato de Nove Caudas (fora do item.json)
  1369: 9071, // Ovo de Grand Peco (fora do item.json)
  1370: 9055, // Ovo de Succubus (fora do item.json)
  1374: 9052, // Ovo de Incubus (fora do item.json)
  1379: 9054, // Ovo de Pesadelo Sombrio (fora do item.json)
  1382: 9036, // (sem nome no cliente)
  1385: 9035, // (sem nome no cliente)
  1401: 9044, // Ovo de Shinobi (fora do item.json)
  1404: 9048, // Ovo de Miyabi Ningyo (fora do item.json)
  1416: 9047, // Ovo de Ninfa Perversa (fora do item.json)
  1495: 9051, // Ovo do Atirador de Pedras (fora do item.json)
  1504: 9049, // Ovo de Dullahan (fora do item.json)
  1505: 9042, // Ovo de Loli Ruri (fora do item.json)
  1512: 9093, // Ovo de Yao Jun
  1513: 9040, // Ovo de Mao Guai (fora do item.json)
  1586: 9041, // Ovo de Gato de Folha (fora do item.json)
  1622: 9099, // Ovo de Ursinho (fora do item.json)
  1630: 9039, // (sem nome no cliente)
  1631: 9030, // Ovo de Chung E (fora do item.json)
  1632: 9100, // Ovo de Gremlin (fora do item.json)
  1735: 9119, // Ovo de Alicel
  1736: 9118, // Ovo de Aliot
  1737: 9120, // Ovo de Aliza
  1754: 9187, // Ovo de Skeggiold (fora do item.json)
  1773: 9105, // Ovo de Hodremlin
  1782: 9104, // Ovo de Roween (fora do item.json)
  1815: 9028, // Ovo de Mascote Buzzy Brother (fora do item.json)
  1837: 9056, // Ovo de Imp (fora do item.json)
  1879: 9031, // Ovo de Coelho (fora do item.json)
  1894: 9114, // Ovo de Pouring (fora do item.json)
  1963: 9038, // (sem nome no cliente)
  2200: 9057, // (sem nome no cliente)
  2210: 9058, // Ovo de Lebre da Neve (fora do item.json)
  2313: 9059, // Ovo de Tikbalang (fora do item.json)
  2398: 9062, // Ovo de Bebê Poring (fora do item.json)
  2963: 9063, // (sem nome no cliente)
  2995: 9108, // Ovo de Ursinho Abominável (fora do item.json)
  3023: 9131, // Ovo de Golem de Fogo
  3162: 9064, // (sem nome no cliente)
  3163: 9065, // (sem nome no cliente)
  3164: 9066, // (sem nome no cliente)
  3165: 9067, // (sem nome no cliente)
  3261: 9068, // Ovo de Unicórnio
  3306: 9080, // (sem nome no cliente)
  3317: 9074, // (sem nome no cliente)
  3318: 9075, // (sem nome no cliente)
  3319: 9076, // (sem nome no cliente)
  3320: 9077, // (sem nome no cliente)
  3321: 9078, // (sem nome no cliente)
  3349: 9079, // (sem nome no cliente)
  3350: 9081, // (sem nome no cliente)
  3351: 9082, // (sem nome no cliente)
  3352: 9083, // (sem nome no cliente)
  3353: 9084, // (sem nome no cliente)
  3354: 9085, // (sem nome no cliente)
  3355: 9086, // (sem nome no cliente)
  3495: 9092, // Ovo de Omeleting
  3496: 9094, // Ovo de Lunático Folhado
  3636: 9090, // Ovo de Bebê Ísis (fora do item.json)
  3669: 9097, // Ovo de Diabolik
  3670: 9098, // Ovo de Deletério (fora do item.json)
  3731: 9101, // Gaiola do Zumbichano (fora do item.json)
  3790: 9109, // Ovo de Quinding (fora do item.json)
  3904: 9110, // (sem nome no cliente)
  3971: 9113, // Ovo de Esqueleão (fora do item.json)
  20373: 9116, // Ovo de Pesadelo Sinistro
  20420: 9117, // Ovo de Andarilho Poluto
  20423: 9115, // Ovo de Lady Branca
  20424: 9112, // Ovo de Flor do Luar
  20425: 9111, // Ovo de Freeoni
  20525: 9130, // Ovo de Bafinho Caótico (fora do item.json)
  20571: 9121, // Ovo de Orc Herói
  20619: 9122, // Ovo de Pesar Noturno
  20696: 9123, // Ovo de Mini Beta (fora do item.json)
  20697: 9124, // Ovo de Mini Alpha (fora do item.json)
  21089: 9125, // Ovo de Patinho
  21290: 9126, // Ovo de Kiel-D-01
  21502: 9137, // Ovo de Bafomé
  21630: 9141, // Ovo de Rosa Selvagem
  21631: 9140, // Ovo da Loli Ruri Azul
  21650: 9133, // Ovo de Cavaleiro Mutante (fora do item.json)
  21651: 9132, // O Ovo do Cavaleiro do Abismo
  21653: 9142, // Ovo de Eddga
  22185: 9148, // Ovo de Senhor das Trevas
  22299: 9156, // Ovo de Chao (fora do item.json)
  22405: 9193, // Ovo de Abelha-Rainha
  22504: 9169, // Ovo de Gerente (fora do item.json)
  22506: 9171, // Ovo de Vigia do Tempo (fora do item.json)
  23000: 9139, // Ovo de Ilusão das Trevas
};
