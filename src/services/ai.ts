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
        You are a movie and TV show expert. Your goal is to translate a user's natural language request into a set of filters for the TMDB (The Movie Database) API /discover endpoint.
        
        Available Genres (ID:Name): ${genresList}
        
        Return ONLY a JSON object with the following keys (do not include markdown formatting):
        - media_type: 'movie' or 'tv' (default to 'movie' if not specified)
        - with_genres: comma separated string of genre IDs
        - primary_release_date.gte: string (YYYY-MM-DD)
        - primary_release_date.lte: string (YYYY-MM-DD)
        - vote_average.gte: number
        - with_original_language: string (e.g. 'en', 'pt', 'ja')
        - sort_by: string (e.g. 'popularity.desc', 'vote_average.desc', 'primary_release_date.desc')
        - suggested_list_name: A short, creative title for this list in Portuguese.
        
        Example User Request: "Filmes de terror dos anos 80"
        Example Output:
        {
          "media_type": "movie",
          "with_genres": "27",
          "primary_release_date.gte": "1980-01-01",
          "primary_release_date.lte": "1989-12-31",
          "sort_by": "popularity.desc",
          "suggested_list_name": "Terror Anos 80"
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
