import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

interface City {
  id: string;
  city: string;
  state: string;
  district: string;
}

export const cityApi = createApi({
  reducerPath: "cityApi",
  baseQuery: fetchBaseQuery(),
  endpoints: (builder) => ({
    getCitiesBySearch: builder.query<City[], string>({
      queryFn: async (search) => {
        const trimmed = search.trim().toLowerCase();
        if (!trimmed) return { data: [] };

        const tokens = trimmed.split(/\s+/).filter(Boolean);

        // Try to fetch remote data first, fallback to local
        let citiesArray: any = null;
        try {
          const res = await fetch("https://cdn.jsdelivr.net/gh/fayazara/Indian-Cities-API@master/cities.json");
          if (res.ok) {
            const remoteData = await res.json();
            if (remoteData && Array.isArray(remoteData.cities)) {
              citiesArray = remoteData.cities;
            }
          }
        } catch (e) {
          // Network error, try local cities.json in public folder
        }

        if (!Array.isArray(citiesArray)) {
           try {
              const localRes = await fetch("/data/cities.json");
              if (localRes.ok) {
                 const localData = await localRes.json();
                 if (localData && Array.isArray(localData.cities)) {
                    citiesArray = localData.cities;
                 }
              }
           } catch (e) {}
        }

        if (!Array.isArray(citiesArray)) return { data: [] };

        const allCities: City[] = [];
        let cityIdCounter = 0;

        for (const item of citiesArray) {
          const cityName = String(item.City || "").trim();
          const stateName = String(item.State || "").trim();
          const districtName = String(item.District || "").trim();

          if (!cityName || !stateName) continue;

          allCities.push({
            id: `api-${cityIdCounter++}`,
            city: cityName,
            state: stateName,
            district: districtName,
          });
        }

        const filteredCities = allCities
          .map((item) => {
            const cityLower = item.city.toLowerCase();
            const stateLower = item.state.toLowerCase();
            const districtLower = (item.district || "").toLowerCase();
            const combined = `${cityLower} ${districtLower} ${stateLower}`;

            const matchesAllTokens = tokens.every(
              (token) =>
                cityLower.includes(token) ||
                stateLower.includes(token) ||
                districtLower.includes(token) ||
                combined.includes(token)
            );

            if (!matchesAllTokens) return null;

            let score = 0;
            // Primary match: City starts with search
            if (cityLower.startsWith(trimmed)) score += 500;
            // Exact match: Highest priority
            if (cityLower === trimmed) score += 1000;
            // District/State matches
            if (districtLower.startsWith(trimmed)) score += 200;
            if (stateLower.startsWith(trimmed)) score += 100;
            
            // Inclusion matches
            if (cityLower.includes(trimmed)) score += 50;
            
            // Penalty for length to prefer shorter names for same match
            score -= cityLower.length * 2;

            return { item, score };
          })
          .filter((entry): entry is { item: City; score: number } => !!entry)
          .sort((a, b) => b.score - a.score || a.item.city.localeCompare(b.item.city))
          .slice(0, 50)
          .map((entry) => entry.item);

        return { data: filteredCities };
      },
    }),
  }),
});

export const { useGetCitiesBySearchQuery } = cityApi;
