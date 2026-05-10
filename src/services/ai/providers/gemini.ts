import { GoogleGenerativeAI } from "@google/generative-ai";

import { logger } from "@/lib/logger";

import { AiSuggestionSchema } from "../../ai-schema";
import { tmdb } from "../../tmdb";
import type { AiProvider, AiSuggestionResult } from "./types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = import.meta.env.VITE_GEMINI_MODEL ?? "gemini-2.0-flash";

if (!API_KEY) {
  logger.error("VITE_GEMINI_API_KEY is missing");
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { attempts: number; delay: number },
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < options.attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < options.attempts - 1) {
        logger.warn(`Retrying after attempt ${i + 1}:`, error);
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      }
    }
  }
  throw lastError;
}

export const geminiProvider: AiProvider = {
  getSuggestions: async (prompt: string): Promise<AiSuggestionResult> => {
    const genres = await tmdb.getGenres();
    const genresList = genres.map((g) => `${g.id}:${g.name}`).join(", ");

    const model = genAI.getGenerativeModel({ model: MODEL });

    const systemPrompt = `
      You are a movie and TV show expert. Your goal is to translate a user's natural language request into a set of filters for the TMDB (The Movie Database) API.

      You have three strategies available:
      1. 'search' – for specific titles, franchises, or keywords.
      2. 'discover' – for genre, mood, time period, etc.
      3. 'person' – for queries involving a specific actor or director. Include the person's name and role (cast or crew).

      Available Genres (ID:Name): ${genresList}

      Return ONLY a JSON object with the following keys:
      - strategy: 'search' | 'discover' | 'person'
      - query: string (required if strategy is 'search')
      - person_name: string (required if strategy is 'person')
      - role: 'cast' | 'crew' (required if strategy is 'person')
      - media_type: 'movie' or 'tv' (default to 'movie')
      - with_genres: comma separated string of genre IDs (only for 'discover')
      - primary_release_date.gte: string (YYYY-MM-DD) (only for 'discover')
      - primary_release_date.lte: string (YYYY-MM-DD) (only for 'discover')
      - vote_average.gte: number (only for 'discover')
      - vote_count.gte: number (only for 'discover')
      - with_original_language: string (only for 'discover')
      - sort_by: string (Default to 'popularity.desc' unless the user specifically asks for 'best rated' or 'critically acclaimed'.) (only for 'discover')
      - with_keywords: comma separated string of keyword IDs (only for 'discover')
      - suggested_list_name: A short, creative title for this list in Portuguese.

      Example 1 (Search):
      User: "Filmes do Harry Potter"
      Output:
      {
        "strategy": "search",
        "query": "Harry Potter",
        "media_type": "movie",
        "suggested_list_name": "Saga Harry Potter"
      }

      Example 2 (Discover):
      User: "Filmes de terror dos anos 80"
      Output:
      {
        "strategy": "discover",
        "media_type": "movie",
        "with_genres": "27",
        "primary_release_date.gte": "1980-01-01",
        "primary_release_date.lte": "1989-12-31",
        "sort_by": "popularity.desc",
        "suggested_list_name": "Terror Anos 80"
      }

      Example 3 (Person):
      User: "Filmes com Tom Cruise"
      Output:
      {
        "strategy": "person",
        "person_name": "Tom Cruise",
        "role": "cast",
        "media_type": "movie",
        "sort_by": "popularity.desc",
        "suggested_list_name": "Filmes com Tom Cruise"
      }

      User Request: "${prompt}"
    `;

    const result = await withRetry(
      () =>
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      { attempts: 2, delay: 1000 },
    );

    const response = result.response;
    const text = response.text();

    const raw = JSON.parse(text);

    return AiSuggestionSchema.parse(raw) as AiSuggestionResult;
  },
};
