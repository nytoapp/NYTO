import { loadEnv } from "@atlas/config";
import type { PlaceWrite } from "@atlas/contracts";
import { PlacesAdminService } from "../../modules/admin/places.service";
import { Database } from "./database";

/**
 * Development catalog for Stockholm.
 *
 * Coordinates and street lines come from OpenStreetMap via Nominatim
 * (© OpenStreetMap contributors, ODbL 1.0). They are geographic facts, not
 * copied venue listings from Google.
 * Names and websites are the venues' own public sites. Each HTTPS URL below
 * returned 200, except Eataly, whose URL is the OpenStreetMap contact:website
 * (https://www.eataly.se/en/) and whose cuisine=italian tag is the category source.
 * That host answered 403 to an automated check, so no page content was copied.
 * Summaries are original one-sentence descriptions. No hours, prices, ratings,
 * or photos are stored. subject_media has no license or attribution field, so
 * Commons or venue photos are not stored.
 *
 * The script uses the existing place writer, which projects search_documents.
 * It does not grant an admin role. Re-running it skips keys that already exist.
 */

const STOCKHOLM_LOCATION_ID = "018f5c3a-7c3a-7000-8000-0000000002a0";
const SEED_ACTOR = "00000000-0000-4000-8000-000000000001";

const category = {
  restaurant: "018f5c3a-7c3a-7000-8000-0000000000d1",
  cafe: "018f5c3a-7c3a-7000-8000-0000000000d6",
  nightlife: "018f5c3a-7c3a-7000-8000-0000000000d7",
  culture: "018f5c3a-7c3a-7000-8000-0000000000d9",
  museum: "018f5c3a-7c3a-7000-8000-0000000000da",
  italian: "018f5c3a-7c3a-7000-8000-0000000000d2",
  attraction: "018f5c3a-7c3a-7000-8000-0000000000db",
  outdoors: "018f5c3a-7c3a-7000-8000-0000000000de",
  shopping: "018f5c3a-7c3a-7000-8000-0000000000df",
  wellness: "018f5c3a-7c3a-7000-8000-0000000000e0",
} as const;

type SeedPlace = {
  key: string;
  name: string;
  summary: string;
  categoryId: string;
  subcategoryId?: string;
  latitude: number;
  longitude: number;
  streetLine: string | null;
  postalCode: string | null;
  websiteUrl: string | null;
};

const places: SeedPlace[] = [
  {
    key: "cityday:stockholm:vasamuseet",
    name: "Vasamuseet",
    summary: "The Vasa Museum in Stockholm exhibits the preserved 17th-century warship Vasa.",
    categoryId: category.culture,
    subcategoryId: category.museum,
    latitude: 59.3281453,
    longitude: 18.0913682,
    streetLine: "Galärvarvsvägen",
    postalCode: "115 21",
    websiteUrl: "https://www.vasamuseet.se/",
  },
  {
    key: "cityday:stockholm:fotografiska",
    name: "Fotografiska",
    summary: "Fotografiska is a photography museum in Stockholm, at Stadsgårdshamnen.",
    categoryId: category.culture,
    subcategoryId: category.museum,
    latitude: 59.3180039,
    longitude: 18.0847007,
    streetLine: "Stadsgårdshamnen 22",
    postalCode: "116 45",
    websiteUrl: "https://www.fotografiska.com/sto/",
  },
  {
    key: "cityday:stockholm:moderna-museet",
    name: "Moderna Museet",
    summary: "Moderna Museet is the museum of modern and contemporary art on Skeppsholmen in Stockholm.",
    categoryId: category.culture,
    subcategoryId: category.museum,
    latitude: 59.3263494,
    longitude: 18.0840004,
    streetLine: "Slupskjulsvägen",
    postalCode: "111 49",
    websiteUrl: "https://www.modernamuseet.se/stockholm/",
  },
  {
    key: "cityday:stockholm:nordiska-museet",
    name: "Nordiska museet",
    summary: "The Nordic Museum in Stockholm presents cultural history from Sweden and the Nordic region.",
    categoryId: category.culture,
    subcategoryId: category.museum,
    latitude: 59.3291464,
    longitude: 18.09389,
    streetLine: "Djurgårdsvägen",
    postalCode: "115 21",
    websiteUrl: "https://www.nordiskamuseet.se/",
  },
  {
    key: "cityday:stockholm:abba",
    name: "ABBA The Museum",
    summary: "ABBA The Museum is a museum on Djurgården in Stockholm.",
    categoryId: category.culture,
    subcategoryId: category.museum,
    latitude: 59.3249254,
    longitude: 18.0965825,
    streetLine: "Djurgårdsvägen 68",
    postalCode: "115 21",
    websiteUrl: "https://abbathemuseum.com/en/",
  },
  {
    key: "cityday:stockholm:kungliga-operan",
    name: "Kungliga Operan",
    summary: "The Royal Swedish Opera is the opera house at Gustav Adolfs torg in Stockholm.",
    categoryId: category.culture,
    latitude: 59.3296435,
    longitude: 18.0699588,
    streetLine: "Gustav Adolfs Torg",
    postalCode: "101 23",
    websiteUrl: "https://www.operan.se/",
  },
  {
    key: "cityday:stockholm:skansen",
    name: "Skansen",
    summary: "Skansen is an open-air museum and zoo on Djurgården in Stockholm.",
    categoryId: category.attraction,
    latitude: 59.3266228,
    longitude: 18.1052823,
    streetLine: "Djurgårdsslätten 49-51",
    postalCode: "115 21",
    websiteUrl: "https://www.skansen.se/en/",
  },
  {
    key: "cityday:stockholm:stadshuset",
    name: "Stockholms stadshus",
    summary: "Stockholm City Hall stands on Kungsholmen, at Hantverkargatan 1.",
    categoryId: category.attraction,
    latitude: 59.3274942,
    longitude: 18.0542148,
    streetLine: "Hantverkargatan 1",
    postalCode: "111 52",
    websiteUrl: "https://stadshuset.stockholm/",
  },
  {
    key: "cityday:stockholm:pascal",
    name: "Pascal",
    summary: "Pascal is a cafe on Skånegatan in Södermalm, Stockholm.",
    categoryId: category.cafe,
    latitude: 59.3120889,
    longitude: 18.0789422,
    streetLine: "Skånegatan",
    postalCode: "116 39",
    websiteUrl: "https://cafepascal.se/",
  },
  {
    key: "cityday:stockholm:pelikan",
    name: "Pelikan",
    summary: "Pelikan is a restaurant on Blekingegatan in Södermalm, Stockholm.",
    categoryId: category.restaurant,
    latitude: 59.3105695,
    longitude: 18.0761722,
    streetLine: "Blekingegatan",
    postalCode: "116 62",
    websiteUrl: "https://pelikan.se/",
  },
  {
    key: "cityday:stockholm:sturehof",
    name: "Sturehof",
    summary: "Sturehof is a restaurant at Stureplan in Stockholm.",
    categoryId: category.restaurant,
    latitude: 59.3358585,
    longitude: 18.073306,
    streetLine: "Stureplan",
    postalCode: "106 63",
    websiteUrl: "https://sturehof.com/",
  },
  {
    key: "cityday:stockholm:berns",
    name: "Berns",
    summary: "Berns is a historic hotel, restaurant, and nightclub on Näckströmsgatan in Stockholm.",
    categoryId: category.nightlife,
    latitude: 59.332277,
    longitude: 18.0733569,
    streetLine: "Näckströmsgatan",
    postalCode: "111 47",
    websiteUrl: "https://berns.se/",
  },
  {
    key: "cityday:stockholm:fasching",
    name: "Fasching",
    summary: "Fasching is a jazz club on Kungsgatan in Stockholm.",
    categoryId: category.nightlife,
    latitude: 59.3333991,
    longitude: 18.0557611,
    streetLine: "Kungsgatan",
    postalCode: "111 22",
    websiteUrl: "https://www.fasching.se/",
  },
  {
    key: "cityday:stockholm:nk",
    name: "Nordiska Kompaniet",
    summary: "Nordiska Kompaniet is a department store on Hamngatan in Stockholm.",
    categoryId: category.shopping,
    latitude: 59.3329999,
    longitude: 18.0690111,
    streetLine: "Hamngatan",
    postalCode: "111 47",
    websiteUrl: "https://www.nk.se/",
  },
  {
    key: "cityday:stockholm:centralbadet",
    name: "Centralbadet",
    summary: "Centralbadet is a public bath on Holländargatan in Stockholm.",
    categoryId: category.wellness,
    latitude: 59.3366595,
    longitude: 18.0600429,
    streetLine: "Holländargatan",
    postalCode: "111 36",
    websiteUrl: "https://centralbadet.se/",
  },
  {
    key: "cityday:stockholm:humlegarden",
    name: "Humlegården",
    summary: "Humlegården is a park in Östermalm, Stockholm.",
    categoryId: category.outdoors,
    latitude: 59.3388541,
    longitude: 18.0724843,
    streetLine: null,
    postalCode: null,
    websiteUrl: null,
  },
  {
    key: "cityday:stockholm:kungstradgarden",
    name: "Kungsträdgården",
    summary: "Kungsträdgården is a park in Norrmalm, Stockholm.",
    categoryId: category.outdoors,
    latitude: 59.3317431,
    longitude: 18.0712889,
    streetLine: null,
    postalCode: null,
    websiteUrl: null,
  },
  {
    key: "cityday:stockholm:kungliga-slottet",
    name: "Kungliga slottet",
    summary: "The Royal Palace of Stockholm, Stockholms slott, stands at Slottsbacken.",
    categoryId: category.attraction,
    latitude: 59.3269277,
    longitude: 18.0701645,
    streetLine: "Slottsbacken 1",
    postalCode: "111 31",
    websiteUrl: "https://www.kungligaslotten.se/",
  },
  {
    key: "cityday:stockholm:grona-lund",
    name: "Gröna Lund",
    summary: "Gröna Lund is an amusement park on Djurgården in Stockholm.",
    categoryId: category.attraction,
    latitude: 59.3233062,
    longitude: 18.0958344,
    streetLine: "Falkenbergsgatan",
    postalCode: "115 21",
    websiteUrl: "https://www.gronalund.com/",
  },
  {
    key: "cityday:stockholm:junibacken",
    name: "Junibacken",
    summary: "Junibacken is a children's cultural house on Galärvarvsvägen in Stockholm.",
    categoryId: category.attraction,
    latitude: 59.3294704,
    longitude: 18.0890937,
    streetLine: "Galärvarvsvägen",
    postalCode: "115 21",
    websiteUrl: "https://www.junibacken.se/",
  },
  {
    key: "cityday:stockholm:historiska-museet",
    name: "Historiska museet",
    summary: "The Swedish History Museum is on Linnégatan in Stockholm.",
    categoryId: category.culture,
    subcategoryId: category.museum,
    latitude: 59.3348166,
    longitude: 18.0894885,
    streetLine: "Linnégatan",
    postalCode: "114 60",
    websiteUrl: "https://historiska.se/",
  },
  {
    key: "cityday:stockholm:dramaten",
    name: "Dramaten",
    summary: "Dramaten is Sweden's national theatre, on Almlöfsgatan in Stockholm.",
    categoryId: category.culture,
    latitude: 59.3332901,
    longitude: 18.0770124,
    streetLine: "Almlöfsgatan",
    postalCode: "102 41",
    websiteUrl: "https://www.dramaten.se/",
  },
  {
    key: "cityday:stockholm:gyldene-freden",
    name: "Den Gyldene Freden",
    summary: "Den Gyldene Freden is a restaurant on Tullgränd in Stockholm.",
    categoryId: category.restaurant,
    latitude: 59.3231029,
    longitude: 18.0737929,
    streetLine: "Tullgränd",
    postalCode: "111 31",
    websiteUrl: "https://gyldenefreden.se/",
  },
  {
    key: "cityday:stockholm:ostermalms-saluhall",
    name: "Östermalms Saluhall",
    summary: "Östermalms Saluhall is a food hall at Östermalmstorg in Stockholm.",
    categoryId: category.shopping,
    latitude: 59.3359085,
    longitude: 18.0776901,
    streetLine: "Östermalmstorg",
    postalCode: "114 39",
    websiteUrl: "https://ostermalmshallen.se/",
  },
  {
    key: "cityday:stockholm:ahlens",
    name: "Åhléns",
    summary: "Åhléns is a department store on Klarabergsgatan in Stockholm.",
    categoryId: category.shopping,
    latitude: 59.3323103,
    longitude: 18.061389,
    streetLine: "Klarabergsgatan",
    postalCode: "111 21",
    websiteUrl: "https://www.ahlens.se/",
  },
  {
    key: "cityday:stockholm:spritmuseum",
    name: "Spritmuseum",
    summary: "Spritmuseum is a museum on Djurgårdsstrand in Stockholm.",
    categoryId: category.culture,
    subcategoryId: category.museum,
    latitude: 59.3270286,
    longitude: 18.0937996,
    streetLine: "Djurgårdsstrand",
    postalCode: "115 21",
    websiteUrl: "https://spritmuseum.se/",
  },
  {
    key: "cityday:stockholm:vete-katten",
    name: "Vete-Katten",
    summary: "Vete-Katten is a café on Kungsgatan in Stockholm.",
    categoryId: category.cafe,
    latitude: 59.334112,
    longitude: 18.058346,
    streetLine: "Kungsgatan 55",
    postalCode: "111 22",
    websiteUrl: "https://vetekatten.se/",
  },
  {
    key: "cityday:stockholm:drop-coffee",
    name: "Drop Coffee Roasters",
    summary: "Drop Coffee Roasters is a coffee roaster and café on Wollmar Yxkullsgatan in Stockholm.",
    categoryId: category.cafe,
    latitude: 59.3169067,
    longitude: 18.0628136,
    streetLine: "Wollmar Yxkullsgatan",
    postalCode: "118 55",
    websiteUrl: "https://www.dropcoffee.com/",
  },
  {
    key: "cityday:stockholm:eataly",
    name: "Eataly",
    summary: "Eataly is an Italian restaurant on Biblioteksgatan in Stockholm.",
    categoryId: category.restaurant,
    subcategoryId: category.italian,
    latitude: 59.3345688,
    longitude: 18.0726354,
    streetLine: "Biblioteksgatan",
    postalCode: "111 46",
    websiteUrl: "https://www.eataly.se/en/",
  },
  {
    key: "cityday:stockholm:liljevalchs",
    name: "Liljevalchs konsthall",
    summary: "Liljevalchs konsthall is an art gallery on Djurgårdsvägen in Stockholm.",
    categoryId: category.culture,
    latitude: 59.3254456,
    longitude: 18.0961581,
    streetLine: "Djurgårdsvägen",
    postalCode: "115 21",
    websiteUrl: "https://liljevalchs.se/",
  },
];

function write(place: SeedPlace): PlaceWrite {
  return {
    name: place.name,
    summary: place.summary,
    status: "active",
    locale: "en",
    categoryId: place.categoryId,
    subcategoryId: place.subcategoryId ?? null,
    tagIds: [],
    countryCode: "SE",
    timezone: "Europe/Stockholm",
    latitude: place.latitude,
    longitude: place.longitude,
    streetLine: place.streetLine,
    locality: "Stockholm",
    adminArea: "Stockholm",
    postalCode: place.postalCode,
    websiteUrl: place.websiteUrl,
    hours: [],
    media: [],
    attributes: {},
    providerReference: { providerCode: "catalog", externalId: place.key },
  };
}

async function main(): Promise<void> {
  const env = loadEnv();
  if (env.NODE_ENV === "production") {
    throw new Error("Stockholm catalog seed is refused in production.");
  }
  const database = new Database(env.DATABASE_URL);
  const writer = new PlacesAdminService(database);
  const created: string[] = [];
  const skipped: string[] = [];
  try {
    await database.pool.query(
      `insert into resolved_locations (id, kind, label, country_code, timezone, geog, external_place_id)
       values ($1, 'locality', 'Stockholm', 'SE', 'Europe/Stockholm', ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)
       on conflict (id) do nothing`,
      [STOCKHOLM_LOCATION_ID, 18.0710935, 59.3251172, "osm:node:25929985"],
    );
    for (const place of places) {
      const existing = await database.pool.query(
        `select er.subject_id
         from external_references er
         join providers p on p.id = er.provider_id
         where p.code = 'catalog' and er.external_id = $1`,
        [place.key],
      );
      if (existing.rowCount) {
        skipped.push(place.name);
        continue;
      }
      await writer.create(write(place), SEED_ACTOR, "stockholm-seed");
      created.push(place.name);
    }
    const counts = await database.pool.query(
      `select
         (select count(*)::int from external_references er join providers p on p.id = er.provider_id where p.code = 'catalog' and er.external_id like 'cityday:stockholm:%') as places,
         (select count(*)::int from resolved_locations where id = $1) as locations`,
      [STOCKHOLM_LOCATION_ID],
    );
    console.log(JSON.stringify({ created, skipped, totals: counts.rows[0] }));
  } finally {
    await database.close();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Stockholm seed failed");
    process.exit(1);
  });
}
