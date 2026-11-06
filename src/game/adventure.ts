import { creatureById } from "~/data";
import levels from "~/data/adventure-levels.json";
import type { Creature, Pt } from "~/engine";

export const CHAPTERS = [
  {
    name: "Quiet Pond",
    mission: "Rescue the first residents.",
    color: "#71d8c0",
    moments: [
      [
        "A place to land",
        "Pip clears a lily pad. For the first time, the pond has somewhere to rest.",
      ],
      [
        "Ripples answer",
        "A little chorus answers from the water. Your rescued friends are calling the others home.",
      ],
      [
        "The reed message",
        "Dot finds a ribbon caught in the reeds. Someone in the garden needs your help.",
      ],
      [
        "Home, for now",
        "The pond is alive again. Your friends gather at the reed path. The world is bigger than this water.",
      ],
    ],
  },
  {
    name: "Reed Garden",
    mission: "Find their missing friends.",
    color: "#b9d982",
    moments: [
      ["A trail of footprints", "Little prints cross the mud. Follow them between the bent reeds."],
      [
        "Room for everyone",
        "The reeds lift as their missing residents return. A sheltered nursery takes shape.",
      ],
      [
        "One quiet voice",
        "Shelby hears a tiny voice beyond the garden. It comes from a marsh without lights.",
      ],
      [
        "Friends reunited",
        "The last friend returns to the garden. Together, they point you toward the dark marsh.",
      ],
    ],
  },
  {
    name: "Firefly Marsh",
    mission: "Restore the lights.",
    color: "#f2d57d",
    moments: [
      ["The first spark", "One firefly wakes. Its reflection makes a second star in the water."],
      [
        "A lantern path",
        "More lights return. The marsh now has a glowing path for lost travellers.",
      ],
      [
        "Signals on the water",
        "The fireflies blink together. Their message follows a silver current toward the lake.",
      ],
      [
        "A sky below",
        "The whole marsh shines. In the reflected stars, you glimpse a knot beneath the moon.",
      ],
    ],
  },
  {
    name: "Moonlit Lake",
    mission: "Discover where the tangles come from.",
    color: "#a5b8ef",
    moments: [
      [
        "Silver threads",
        "The tangles drift along the lake's oldest current. They are all coming from the same place.",
      ],
      [
        "The forgotten channel",
        "Your friends uncover a channel buried beneath fallen branches. The water begins to move.",
      ],
      [
        "A spring in trouble",
        "The moon reveals the truth: the spring is blocked. Every trapped current becomes a tangle.",
      ],
      [
        "Follow the current",
        "The lake is clear enough to see a hidden passage. Your friends follow you toward the source.",
      ],
    ],
  },
  {
    name: "Hidden Spring",
    mission: "Restore the source of the pond.",
    color: "#f1ae85",
    moments: [
      [
        "The heart of the water",
        "Deep inside the spring, tiny currents pull against each other. There is still a way through.",
      ],
      [
        "A little room to breathe",
        "The first channels open. Fresh water reaches the lake, and the marsh lights brighten.",
      ],
      [
        "Everyone helps",
        "Friends from every place gather at the spring. The last tangle is a job for all of you.",
      ],
      [
        "Water finds its way",
        "The spring runs free. Pond, garden, marsh and lake are connected again. Beyond them, new expeditions are waiting.",
      ],
    ],
  },
] as const;

export const STORY_LEVELS = 100;
export function recipeId(level: number): number {
  if (level <= 100) return level;
  const offset = level - 101;
  return ((offset * 37 + Math.floor(offset / 100) * 13) % 100) + 1;
}

export function adventureLevel(level: number) {
  const id = Math.max(1, Math.floor(level));
  const recipe = levels[recipeId(id) - 1]!;
  const base = creatureById(recipe.creature)!;
  // Rigid transforms keep the registered crossing count exact in expeditions.
  const angle = id > 100 ? (((id * 137.508) % 360) * Math.PI) / 180 : 0;
  const scale = id > 100 ? 0.68 + (id % 5) * 0.035 : 1;
  const positions: Pt[] = recipe.positions.map(([x = 50, y = 50]) => {
    if (id <= 100) return [x, y];
    const dx = (x - 50) * scale;
    const dy = (y - 50) * scale;
    return [
      50 + dx * Math.cos(angle) - dy * Math.sin(angle),
      50 + dx * Math.sin(angle) + dy * Math.cos(angle),
    ];
  });
  const chapterIndex = Math.floor((recipe.id - 1) / 20);
  const creature: Creature = { ...base, scrambled: positions, par: recipe.par };
  return {
    ...recipe,
    id,
    chapterIndex,
    chapter: CHAPTERS[chapterIndex]!,
    creature,
    points: recipe.initialCrossings * 10,
    expedition: id > 100,
  };
}

export function storyMoment(completed: number) {
  if (completed < 1 || completed > 100 || completed % 5 !== 0) return null;
  const chapter = CHAPTERS[Math.floor((completed - 1) / 20)]!;
  const [title, text] = chapter.moments[Math.floor(((completed - 1) % 20) / 5)]!;
  return { title, text, chapter: chapter.name };
}

export function rescueStars(moves: number, par: number, assisted: boolean): number {
  return moves <= par && !assisted ? 3 : moves <= par * 2 ? 2 : 1;
}

export function expeditionProgress(level: number, results: Record<number, { stars: number }>) {
  const number = Math.floor((Math.max(101, level) - 101) / 20) + 1;
  const start = 101 + (number - 1) * 20;
  const friends = new Map<string, { name: string; found: boolean }>();
  let stars = 0;
  let rescued = 0;
  for (let stage = start; stage < start + 20; stage++) {
    const creature = adventureLevel(stage).creature;
    const result = results[stage];
    if (result) {
      stars += result.stars;
      rescued++;
    }
    friends.set(creature.id, {
      name: creature.name,
      found: Boolean(result || friends.get(creature.id)?.found),
    });
  }
  return {
    number,
    rescued,
    stars,
    starGoal: 40,
    friends: [...friends.values()],
    found: [...friends.values()].filter((friend) => friend.found).length,
  };
}
