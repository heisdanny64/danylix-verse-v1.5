export interface Movie {
  id: number;
  title: string;
  year: number;
  rating: number;
  genres: string[];
  synopsis: string;
  poster: string;
  backdrop: string;
  category: string[];
}

const POSTER_BASE = "https://picsum.photos/seed";

export const movies: Movie[] = [
  { id: 1, title: "Neon Horizon", year: 2024, rating: 8.4, genres: ["Sci-Fi", "Action"], synopsis: "In a neon-drenched cityscape, a rogue hacker discovers a conspiracy that threatens to rewrite reality itself.", poster: `${POSTER_BASE}/neon1/300/450`, backdrop: `${POSTER_BASE}/neon1/800/450`, category: ["trending_movies", "action"] },
  { id: 2, title: "Whispers of the Void", year: 2023, rating: 7.9, genres: ["Horror", "Thriller"], synopsis: "A deep-space mining crew encounters an ancient signal that drives them to the edge of madness.", poster: `${POSTER_BASE}/void2/300/450`, backdrop: `${POSTER_BASE}/void2/800/450`, category: ["trending_movies"] },
  { id: 3, title: "Crimson Tide Rising", year: 2024, rating: 8.1, genres: ["Action", "Drama"], synopsis: "A retired naval officer is pulled back into service when a rogue submarine threatens global peace.", poster: `${POSTER_BASE}/crimson3/300/450`, backdrop: `${POSTER_BASE}/crimson3/800/450`, category: ["trending_movies", "action"] },
  { id: 4, title: "Echoes of Tomorrow", year: 2023, rating: 7.6, genres: ["Sci-Fi", "Romance"], synopsis: "Two strangers connected across parallel timelines must find each other before their worlds collapse.", poster: `${POSTER_BASE}/echo4/300/450`, backdrop: `${POSTER_BASE}/echo4/800/450`, category: ["trending_movies"] },
  { id: 5, title: "Shadow Protocol", year: 2024, rating: 8.3, genres: ["Action", "Thriller"], synopsis: "An elite agent goes rogue to expose a shadow organization pulling the strings of global politics.", poster: `${POSTER_BASE}/shadow5/300/450`, backdrop: `${POSTER_BASE}/shadow5/800/450`, category: ["trending_movies", "action"] },
  { id: 6, title: "Midnight Bloom", year: 2023, rating: 7.2, genres: ["Drama", "Fantasy"], synopsis: "A mysterious garden that blooms only at midnight holds the key to a grieving woman's past.", poster: `${POSTER_BASE}/bloom6/300/450`, backdrop: `${POSTER_BASE}/bloom6/800/450`, category: ["trending_series"] },
  { id: 7, title: "The Last Signal", year: 2024, rating: 8.0, genres: ["Sci-Fi", "Thriller"], synopsis: "Earth receives its final transmission from a colony ship that vanished 50 years ago.", poster: `${POSTER_BASE}/signal7/300/450`, backdrop: `${POSTER_BASE}/signal7/800/450`, category: ["trending_series"] },
  { id: 8, title: "Iron Veil", year: 2023, rating: 7.8, genres: ["Action", "Mystery"], synopsis: "Behind the iron curtain, a spy uncovers a weapon that could end the Cold War — or the world.", poster: `${POSTER_BASE}/iron8/300/450`, backdrop: `${POSTER_BASE}/iron8/800/450`, category: ["trending_series", "action"] },
  { id: 9, title: "Starfall Academy", year: 2024, rating: 8.6, genres: ["Anime", "Fantasy"], synopsis: "Young mages compete in a celestial tournament where losing means being erased from existence.", poster: `${POSTER_BASE}/star9/300/450`, backdrop: `${POSTER_BASE}/star9/800/450`, category: ["anime"] },
  { id: 10, title: "Blade of Eternity", year: 2023, rating: 8.2, genres: ["Anime", "Action"], synopsis: "An immortal samurai seeks the legendary blade that can finally grant him death.", poster: `${POSTER_BASE}/blade10/300/450`, backdrop: `${POSTER_BASE}/blade10/800/450`, category: ["anime", "action"] },
  { id: 11, title: "Spirit Realm Chronicles", year: 2024, rating: 7.9, genres: ["Anime", "Adventure"], synopsis: "A young girl discovers she can traverse between the human world and the spirit realm.", poster: `${POSTER_BASE}/spirit11/300/450`, backdrop: `${POSTER_BASE}/spirit11/800/450`, category: ["anime"] },
  { id: 12, title: "Cyber Ronin", year: 2023, rating: 8.5, genres: ["Anime", "Sci-Fi"], synopsis: "In a cyberpunk Tokyo, a disgraced samurai-turned-hacker fights corporate tyranny.", poster: `${POSTER_BASE}/cyber12/300/450`, backdrop: `${POSTER_BASE}/cyber12/800/450`, category: ["anime", "action"] },
  { id: 13, title: "Phoenix Protocol", year: 2024, rating: 7.7, genres: ["Anime", "Mecha"], synopsis: "Pilots of ancient mechas awaken to defend Earth from an interdimensional threat.", poster: `${POSTER_BASE}/phoenix13/300/450`, backdrop: `${POSTER_BASE}/phoenix13/800/450`, category: ["anime"] },
  { id: 14, title: "Rogue Thunder", year: 2024, rating: 7.4, genres: ["Action", "Adventure"], synopsis: "A storm chaser discovers that the superstorms are being manufactured by a weapons corporation.", poster: `${POSTER_BASE}/thunder14/300/450`, backdrop: `${POSTER_BASE}/thunder14/800/450`, category: ["action"] },
  { id: 15, title: "Frostbite", year: 2023, rating: 7.8, genres: ["Action", "Survival"], synopsis: "Stranded in the Arctic, a team of soldiers must survive both the cold and a hidden enemy.", poster: `${POSTER_BASE}/frost15/300/450`, backdrop: `${POSTER_BASE}/frost15/800/450`, category: ["action"] },
  { id: 16, title: "Velocity", year: 2024, rating: 8.0, genres: ["Action", "Racing"], synopsis: "Underground racers compete in a deadly cross-continental rally with no rules.", poster: `${POSTER_BASE}/velocity16/300/450`, backdrop: `${POSTER_BASE}/velocity16/800/450`, category: ["action", "trending_movies"] },
  { id: 17, title: "Dreamwalker", year: 2023, rating: 7.5, genres: ["Fantasy", "Mystery"], synopsis: "A detective who can enter people's dreams investigates a series of impossible murders.", poster: `${POSTER_BASE}/dream17/300/450`, backdrop: `${POSTER_BASE}/dream17/800/450`, category: ["trending_series"] },
  { id: 18, title: "The Obsidian Gate", year: 2024, rating: 8.1, genres: ["Fantasy", "Adventure"], synopsis: "An ancient gate opens every century, and this time something came through.", poster: `${POSTER_BASE}/obsidian18/300/450`, backdrop: `${POSTER_BASE}/obsidian18/800/450`, category: ["trending_series"] },
  { id: 19, title: "Pulse", year: 2023, rating: 7.3, genres: ["Sci-Fi", "Horror"], synopsis: "A mysterious electromagnetic pulse kills all electronics — and awakens something underground.", poster: `${POSTER_BASE}/pulse19/300/450`, backdrop: `${POSTER_BASE}/pulse19/800/450`, category: ["trending_movies"] },
  { id: 20, title: "Apex Predator", year: 2024, rating: 7.6, genres: ["Action", "Sci-Fi"], synopsis: "Genetically enhanced soldiers go hunting — but this time they become the prey.", poster: `${POSTER_BASE}/apex20/300/450`, backdrop: `${POSTER_BASE}/apex20/800/450`, category: ["action", "trending_movies"] },
];

export function getMoviesByCategory(cat: string): Movie[] {
  return movies.filter((m) => m.category.includes(cat));
}

export function getMovieById(id: number): Movie | undefined {
  return movies.find((m) => m.id === id);
}

export function searchMovies(query: string): Movie[] {
  const q = query.toLowerCase();
  return movies.filter(
    (m) => m.title.toLowerCase().includes(q) || m.genres.some((g) => g.toLowerCase().includes(q))
  );
}
