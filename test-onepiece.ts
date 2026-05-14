import { Otakudesu, Animasu, AnimeIndo, Samehadaku, Anoboy, Oploverz, AnimeID } from './index.js';

async function test() {
  const slug = "one-piece-episode-1161-subtitle-indonesia";
  const providers = [
    { name: "Otakudesu", instance: new Otakudesu() },
    { name: "Animasu", instance: new Animasu() },
    { name: "AnimeIndo", instance: new AnimeIndo() },
    { name: "Samehadaku", instance: new Samehadaku() },
    { name: "Anoboy", instance: new Anoboy() },
    { name: "Oploverz", instance: new Oploverz() },
    { name: "AnimeID", instance: new AnimeID() },
  ];

  console.log("=== TEST STREAMING ONE PIECE EP 1161 ===\n");
  
  for (const { name, instance } of providers) {
    try {
      const result = await instance.streams(slug);
      const streams = Array.isArray(result) ? result : (result?.streams || []);
      if (streams.length > 0) {
        console.log(`✅ ${name}: ${streams.length} server`);
        streams.slice(0, 3).forEach((s: any) => {
          console.log(`   - ${s.name}: ${s.url?.substring(0, 80)}...`);
        });
      } else {
        console.log(`❌ ${name}: 0 server`);
      }
    } catch(e: any) {
      console.log(`⚠️ ${name}: ERROR - ${e.message}`);
    }
  }
}

test();
