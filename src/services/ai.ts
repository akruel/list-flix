import { GoogleGenerativeAI } from '@google/generative-ai';
import { tmdb } from './tmdb';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error('VITE_GEMINI_API_KEY is missing');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export const ai = {
  getSuggestions: async (prompt: string) => {
    try {
      // 1. Fetch genres to provide context
      const genres = await tmdb.getGenres();
      const genresList = genres.map(g => `${g.id}:${g.name}`).join(', ');

      // 2. Prepare the prompt
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
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
        - with_original_language: string (only for 'discover')
        - sort_by: string (Default to 'popularity.desc' unless the user specifically asks for 'best rated' or 'critically acclaimed'.) (only for 'discover')
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

      // 3. Call Gemini
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean up the response if it contains markdown code blocks
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(cleanText);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      throw error;
    }
  }
};
