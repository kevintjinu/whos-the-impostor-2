import type { Category } from './settings'

export type WordCategory = Exclude<Category, 'mixed'>

const CHAOS_DECOY_POOLS = {
  space: ['Telescope', 'Rocket', 'Planet', 'Astronaut', 'Comet', 'Satellite', 'Spacesuit', 'Moon Rock'],
  music: ['Violin', 'Trumpet', 'Saxophone', 'Banjo', 'Tambourine', 'Harmonica', 'Microphone', 'Orchestra'],
  construction: ['Bulldozer', 'Tower Crane', 'Cement Mixer', 'Hard Hat', 'Brick Wall', 'Jackhammer', 'Wheelbarrow', 'Traffic Cone'],
  technology: ['Calculator', 'Printer', 'Keyboard', 'Computer Mouse', 'Projector', 'Photocopier', 'USB Cable', 'Webcam'],
  arctic: ['Glacier', 'Igloo', 'Snowmobile', 'Iceberg', 'Sled', 'Snowflake', 'Ski Lift', 'Polar Station'],
  farmyard: ['Tractor', 'Hay Bale', 'Scarecrow', 'Barn', 'Windmill', 'Pitchfork', 'Grain Silo', 'Farm Gate'],
  nautical: ['Anchor', 'Lifeboat', 'Lighthouse', 'Submarine', 'Sailboat', 'Diving Mask', 'Buoy', 'Shipwreck'],
  carnival: ['Ferris Wheel', 'Roller Coaster', 'Carousel', 'Clown', 'Ticket Booth', 'Bumper Car', 'Cotton Candy', 'Funhouse'],
  garden: ['Watering Can', 'Flowerpot', 'Garden Hose', 'Sunflower', 'Lawn Mower', 'Greenhouse', 'Birdbath', 'Garden Gnome'],
  royal: ['Castle', 'Crown', 'Throne', 'Knight', 'Dragon', 'Drawbridge', 'Royal Carriage', 'Treasure Chest'],
  science: ['Microscope', 'Test Tube', 'Laboratory Coat', 'Magnet', 'Beaker', 'Robot Arm', 'Safety Goggles', 'Chemistry Set'],
  travel: ['Passport', 'Boarding Pass', 'Map', 'Compass', 'Postcard', 'Luggage Tag', 'Travel Pillow', 'Souvenir'],
} as const

export type ChaosPoolId = keyof typeof CHAOS_DECOY_POOLS

type WordGroup = {
  id: string
  category: WordCategory
  words: readonly [string, string, string, string, string]
  chaosPool: ChaosPoolId
}

export type WordEntry = {
  id: string
  category: WordCategory
  semanticGroupId: string
  majority: string
  relatedDecoys: readonly string[]
  chaosDecoys: readonly string[]
}

export const WORD_GROUPS: readonly WordGroup[] = [
  // Everyday Things
  { id: 'everyday-weather-gear', category: 'everyday-things', words: ['Umbrella', 'Raincoat', 'Rubber Boots', 'Poncho', 'Windbreaker'], chaosPool: 'science' },
  { id: 'everyday-writing-tools', category: 'everyday-things', words: ['Pencil', 'Pen', 'Marker', 'Crayon', 'Highlighter'], chaosPool: 'nautical' },
  { id: 'everyday-seating', category: 'everyday-things', words: ['Chair', 'Stool', 'Bench', 'Armchair', 'Beanbag'], chaosPool: 'space' },
  { id: 'everyday-bags', category: 'everyday-things', words: ['Backpack', 'Suitcase', 'Handbag', 'Briefcase', 'Duffle Bag'], chaosPool: 'garden' },
  { id: 'everyday-cleaning', category: 'everyday-things', words: ['Broom', 'Mop', 'Vacuum Cleaner', 'Duster', 'Sponge'], chaosPool: 'royal' },
  { id: 'everyday-kitchen-tools', category: 'everyday-things', words: ['Frying Pan', 'Saucepan', 'Baking Tray', 'Mixing Bowl', 'Cutting Board'], chaosPool: 'arctic' },
  { id: 'everyday-timepieces', category: 'everyday-things', words: ['Alarm Clock', 'Wristwatch', 'Stopwatch', 'Kitchen Timer', 'Wall Clock'], chaosPool: 'farmyard' },
  { id: 'everyday-lighting', category: 'everyday-things', words: ['Flashlight', 'Lantern', 'Desk Lamp', 'Candle', 'Night-light'], chaosPool: 'science' },
  { id: 'everyday-grooming', category: 'everyday-things', words: ['Toothbrush', 'Hairbrush', 'Comb', 'Razor', 'Nail Clippers'], chaosPool: 'carnival' },
  { id: 'everyday-paper-goods', category: 'everyday-things', words: ['Notebook', 'Sketchbook', 'Calendar', 'Envelope', 'Sticky Note'], chaosPool: 'music' },

  // Food & Drink
  { id: 'food-breads', category: 'food-and-drink', words: ['Baguette', 'Croissant', 'Bagel', 'Pretzel', 'Tortilla'], chaosPool: 'space' },
  { id: 'food-hot-drinks', category: 'food-and-drink', words: ['Coffee', 'Tea', 'Hot Chocolate', 'Espresso', 'Chai'], chaosPool: 'construction' },
  { id: 'food-breakfast', category: 'food-and-drink', words: ['Pancakes', 'Waffles', 'Cereal', 'Oatmeal', 'French Toast'], chaosPool: 'technology' },
  { id: 'food-frozen-desserts', category: 'food-and-drink', words: ['Ice Cream', 'Gelato', 'Sorbet', 'Frozen Yogurt', 'Ice Pop'], chaosPool: 'royal' },
  { id: 'food-handheld-meals', category: 'food-and-drink', words: ['Burger', 'Hot Dog', 'Taco', 'Burrito', 'Sandwich'], chaosPool: 'arctic' },
  { id: 'food-asian-dishes', category: 'food-and-drink', words: ['Sushi', 'Dumplings', 'Noodles', 'Fried Rice', 'Spring Roll'], chaosPool: 'royal' },
  { id: 'food-snacks', category: 'food-and-drink', words: ['Popcorn', 'Potato Chips', 'Crackers', 'Nachos', 'Trail Mix'], chaosPool: 'nautical' },
  { id: 'food-fruit', category: 'food-and-drink', words: ['Apple', 'Banana', 'Orange', 'Mango', 'Watermelon'], chaosPool: 'music' },
  { id: 'food-baked-desserts', category: 'food-and-drink', words: ['Cheesecake', 'Brownie', 'Cupcake', 'Doughnut', 'Cookie'], chaosPool: 'science' },
  { id: 'food-soups', category: 'food-and-drink', words: ['Tomato Soup', 'Chicken Soup', 'Pumpkin Soup', 'Miso Soup', 'Lentil Soup'], chaosPool: 'travel' },

  // Places
  { id: 'places-transport-hubs', category: 'places', words: ['Airport', 'Train Station', 'Bus Station', 'Ferry Terminal', 'Subway Station'], chaosPool: 'garden' },
  { id: 'places-learning', category: 'places', words: ['School', 'University', 'Library', 'Museum', 'Science Centre'], chaosPool: 'farmyard' },
  { id: 'places-health', category: 'places', words: ['Hospital', 'Medical Clinic', 'Pharmacy', 'Dentist', 'Veterinary Clinic'], chaosPool: 'music' },
  { id: 'places-lodging', category: 'places', words: ['Hotel', 'Hostel', 'Resort', 'Campsite', 'Holiday Cabin'], chaosPool: 'technology' },
  { id: 'places-shopping', category: 'places', words: ['Supermarket', 'Shopping Mall', 'Farmers Market', 'Department Store', 'Corner Shop'], chaosPool: 'arctic' },
  { id: 'places-food-venues', category: 'places', words: ['Restaurant', 'Cafe', 'Bakery', 'Food Court', 'Diner'], chaosPool: 'space' },
  { id: 'places-entertainment-venues', category: 'places', words: ['Cinema', 'Theatre', 'Concert Hall', 'Comedy Club', 'Arcade'], chaosPool: 'farmyard' },
  { id: 'places-sports-venues', category: 'places', words: ['Stadium', 'Arena', 'Swimming Pool', 'Gym', 'Tennis Court'], chaosPool: 'science' },
  { id: 'places-natural-landmarks', category: 'places', words: ['Beach', 'Forest', 'Desert', 'Waterfall', 'Volcano'], chaosPool: 'technology' },
  { id: 'places-civic', category: 'places', words: ['Police Station', 'Fire Station', 'Post Office', 'Town Hall', 'Courthouse'], chaosPool: 'nautical' },

  // Animals & Nature
  { id: 'nature-big-cats', category: 'animals-and-nature', words: ['Lion', 'Tiger', 'Leopard', 'Cheetah', 'Jaguar'], chaosPool: 'technology' },
  { id: 'nature-marine-mammals', category: 'animals-and-nature', words: ['Dolphin', 'Whale', 'Seal', 'Sea Lion', 'Manatee'], chaosPool: 'construction' },
  { id: 'nature-birds-of-prey', category: 'animals-and-nature', words: ['Eagle', 'Hawk', 'Falcon', 'Owl', 'Vulture'], chaosPool: 'carnival' },
  { id: 'nature-small-pets', category: 'animals-and-nature', words: ['Rabbit', 'Hamster', 'Guinea Pig', 'Gerbil', 'Mouse'], chaosPool: 'space' },
  { id: 'nature-farm-animals', category: 'animals-and-nature', words: ['Cow', 'Pig', 'Sheep', 'Goat', 'Horse'], chaosPool: 'music' },
  { id: 'nature-reptiles', category: 'animals-and-nature', words: ['Crocodile', 'Alligator', 'Lizard', 'Snake', 'Turtle'], chaosPool: 'travel' },
  { id: 'nature-insects', category: 'animals-and-nature', words: ['Bee', 'Wasp', 'Butterfly', 'Moth', 'Dragonfly'], chaosPool: 'nautical' },
  { id: 'nature-sea-creatures', category: 'animals-and-nature', words: ['Octopus', 'Squid', 'Jellyfish', 'Starfish', 'Seahorse'], chaosPool: 'garden' },
  { id: 'nature-trees', category: 'animals-and-nature', words: ['Oak Tree', 'Pine Tree', 'Palm Tree', 'Maple Tree', 'Willow Tree'], chaosPool: 'carnival' },
  { id: 'nature-weather', category: 'animals-and-nature', words: ['Thunderstorm', 'Tornado', 'Blizzard', 'Rainbow', 'Fog'], chaosPool: 'technology' },

  // Activities
  { id: 'activities-cardio', category: 'activities', words: ['Running', 'Jogging', 'Cycling', 'Swimming', 'Rowing'], chaosPool: 'royal' },
  { id: 'activities-outdoors', category: 'activities', words: ['Hiking', 'Camping', 'Fishing', 'Kayaking', 'Rock Climbing'], chaosPool: 'technology' },
  { id: 'activities-visual-arts', category: 'activities', words: ['Painting', 'Drawing', 'Photography', 'Sculpting', 'Pottery'], chaosPool: 'arctic' },
  { id: 'activities-music-making', category: 'activities', words: ['Singing', 'Playing Guitar', 'Playing Piano', 'Drumming', 'DJing'], chaosPool: 'garden' },
  { id: 'activities-dance', category: 'activities', words: ['Ballet', 'Salsa', 'Hip-hop Dancing', 'Ballroom Dancing', 'Tap Dancing'], chaosPool: 'nautical' },
  { id: 'activities-racket-sports', category: 'activities', words: ['Tennis', 'Badminton', 'Table Tennis', 'Squash', 'Pickleball'], chaosPool: 'farmyard' },
  { id: 'activities-team-sports', category: 'activities', words: ['Football', 'Basketball', 'Volleyball', 'Rugby', 'Hockey'], chaosPool: 'space' },
  { id: 'activities-quiet-hobbies', category: 'activities', words: ['Reading', 'Writing', 'Knitting', 'Crossword Puzzles', 'Jigsaw Puzzles'], chaosPool: 'construction' },
  { id: 'activities-kitchen', category: 'activities', words: ['Baking', 'Cooking', 'Barbecuing', 'Cake Decorating', 'Making Cocktails'], chaosPool: 'travel' },
  { id: 'activities-social', category: 'activities', words: ['Karaoke', 'Bowling', 'Mini Golf', 'Escape Room', 'Trivia Night'], chaosPool: 'arctic' },

  // Entertainment
  { id: 'entertainment-film-genres', category: 'entertainment', words: ['Comedy Film', 'Horror Film', 'Action Film', 'Romance Film', 'Animated Film'], chaosPool: 'farmyard' },
  { id: 'entertainment-tv-genres', category: 'entertainment', words: ['Sitcom', 'Reality Show', 'Quiz Show', 'Crime Drama', 'Nature Documentary'], chaosPool: 'garden' },
  { id: 'entertainment-books', category: 'entertainment', words: ['Fantasy Novel', 'Mystery Novel', 'Romance Novel', 'Comic Book', 'Biography'], chaosPool: 'nautical' },
  { id: 'entertainment-live-music', category: 'entertainment', words: ['Pop Concert', 'Rock Concert', 'Jazz Concert', 'Classical Concert', 'Music Festival'], chaosPool: 'construction' },
  { id: 'entertainment-tabletop-games', category: 'entertainment', words: ['Board Game', 'Card Game', 'Chess', 'Charades', 'Dominoes'], chaosPool: 'arctic' },
  { id: 'entertainment-video-games', category: 'entertainment', words: ['Racing Game', 'Puzzle Game', 'Adventure Game', 'Sports Game', 'Platform Game'], chaosPool: 'garden' },
  { id: 'entertainment-stage-shows', category: 'entertainment', words: ['Musical', 'Opera', 'Stand-up Comedy', 'Magic Show', 'Stage Play'], chaosPool: 'science' },
  { id: 'entertainment-audio', category: 'entertainment', words: ['Podcast', 'Radio Show', 'Audiobook', 'News Bulletin', 'Talk Show'], chaosPool: 'royal' },
  { id: 'entertainment-public-shows', category: 'entertainment', words: ['Puppet Show', 'Fireworks Display', 'Talent Show', 'Parade', 'Street Performance'], chaosPool: 'technology' },
  { id: 'entertainment-characters', category: 'entertainment', words: ['Superhero', 'Detective', 'Pirate', 'Wizard', 'Robot'], chaosPool: 'arctic' },
]

function slugify(value: string) {
  return value
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const WORD_BANK: readonly WordEntry[] = WORD_GROUPS.flatMap((group) =>
  group.words.map((majority) => ({
    id: `${group.id}-${slugify(majority)}`,
    category: group.category,
    semanticGroupId: group.id,
    majority,
    relatedDecoys: group.words.filter((word) => word !== majority),
    chaosDecoys: CHAOS_DECOY_POOLS[group.chaosPool],
  })),
)

export function normaliseWord(value: string) {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase('en')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function getWordPool(category: Category): readonly WordEntry[] {
  if (category === 'mixed') {
    return WORD_BANK
  }

  return WORD_BANK.filter((entry) => entry.category === category)
}
