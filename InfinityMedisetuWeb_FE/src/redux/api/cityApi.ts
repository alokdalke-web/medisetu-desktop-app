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
      query: () =>
        "https://cdn.jsdelivr.net/gh/fayazara/Indian-Cities-API@master/cities.json",
      transformResponse: (response: any, _meta, search) => {
        const trimmed = search.trim().toLowerCase();
        if (!trimmed) return [];

        const tokens = trimmed.split(/\s+/).filter(Boolean);

        // The response is { "cities": [ { "City": "...", "State": "...", "District": "..." } ] }
        const citiesArray = response?.cities;
        if (!Array.isArray(citiesArray)) return [];

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

        return allCities
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
      },
    }),
  }),
});

export const { useGetCitiesBySearchQuery } = cityApi;
