import type { Category } from './settings'

export type WordCategory = Exclude<Category, 'mixed'>

export type WordEntry = {
  id: string
  category: WordCategory
  majority: string
  relatedDecoy: string
  unrelatedDecoy: string
}

export const WORD_BANK: readonly WordEntry[] = [
  { id: 'everyday-umbrella', category: 'everyday-things', majority: 'Umbrella', relatedDecoy: 'Raincoat', unrelatedDecoy: 'Telescope' },
  { id: 'everyday-toothbrush', category: 'everyday-things', majority: 'Toothbrush', relatedDecoy: 'Toothpaste', unrelatedDecoy: 'Compass' },
  { id: 'everyday-backpack', category: 'everyday-things', majority: 'Backpack', relatedDecoy: 'Suitcase', unrelatedDecoy: 'Frying Pan' },
  { id: 'everyday-alarm-clock', category: 'everyday-things', majority: 'Alarm Clock', relatedDecoy: 'Timer', unrelatedDecoy: 'Paintbrush' },
  { id: 'everyday-key', category: 'everyday-things', majority: 'Key', relatedDecoy: 'Lock', unrelatedDecoy: 'Pillow' },
  { id: 'everyday-notebook', category: 'everyday-things', majority: 'Notebook', relatedDecoy: 'Sketchbook', unrelatedDecoy: 'Kettle' },
  { id: 'everyday-mirror', category: 'everyday-things', majority: 'Mirror', relatedDecoy: 'Window', unrelatedDecoy: 'Sandwich' },
  { id: 'everyday-scissors', category: 'everyday-things', majority: 'Scissors', relatedDecoy: 'Craft Knife', unrelatedDecoy: 'Slippers' },
  { id: 'everyday-flashlight', category: 'everyday-things', majority: 'Flashlight', relatedDecoy: 'Lantern', unrelatedDecoy: 'Teacup' },
  { id: 'everyday-vacuum', category: 'everyday-things', majority: 'Vacuum Cleaner', relatedDecoy: 'Broom', unrelatedDecoy: 'Sunglasses' },

  { id: 'food-pizza', category: 'food-and-drink', majority: 'Pizza', relatedDecoy: 'Flatbread', unrelatedDecoy: 'Watermelon' },
  { id: 'food-coffee', category: 'food-and-drink', majority: 'Coffee', relatedDecoy: 'Espresso', unrelatedDecoy: 'Sushi' },
  { id: 'food-pancakes', category: 'food-and-drink', majority: 'Pancakes', relatedDecoy: 'Waffles', unrelatedDecoy: 'Broccoli' },
  { id: 'food-ice-cream', category: 'food-and-drink', majority: 'Ice Cream', relatedDecoy: 'Gelato', unrelatedDecoy: 'Garlic' },
  { id: 'food-burger', category: 'food-and-drink', majority: 'Burger', relatedDecoy: 'Sandwich', unrelatedDecoy: 'Pineapple' },
  { id: 'food-sushi', category: 'food-and-drink', majority: 'Sushi', relatedDecoy: 'Sashimi', unrelatedDecoy: 'Hot Chocolate' },
  { id: 'food-popcorn', category: 'food-and-drink', majority: 'Popcorn', relatedDecoy: 'Potato Chips', unrelatedDecoy: 'Tomato Soup' },
  { id: 'food-croissant', category: 'food-and-drink', majority: 'Croissant', relatedDecoy: 'Danish', unrelatedDecoy: 'Curry' },
  { id: 'food-lemonade', category: 'food-and-drink', majority: 'Lemonade', relatedDecoy: 'Iced Tea', unrelatedDecoy: 'Spaghetti' },
  { id: 'food-cheesecake', category: 'food-and-drink', majority: 'Cheesecake', relatedDecoy: 'Tiramisu', unrelatedDecoy: 'Pickles' },

  { id: 'places-airport', category: 'places', majority: 'Airport', relatedDecoy: 'Train Station', unrelatedDecoy: 'Aquarium' },
  { id: 'places-library', category: 'places', majority: 'Library', relatedDecoy: 'Bookshop', unrelatedDecoy: 'Volcano' },
  { id: 'places-hospital', category: 'places', majority: 'Hospital', relatedDecoy: 'Medical Clinic', unrelatedDecoy: 'Amusement Park' },
  { id: 'places-beach', category: 'places', majority: 'Beach', relatedDecoy: 'Swimming Pool', unrelatedDecoy: 'Museum' },
  { id: 'places-hotel', category: 'places', majority: 'Hotel', relatedDecoy: 'Hostel', unrelatedDecoy: 'Farm' },
  { id: 'places-cinema', category: 'places', majority: 'Cinema', relatedDecoy: 'Theatre', unrelatedDecoy: 'Desert' },
  { id: 'places-supermarket', category: 'places', majority: 'Supermarket', relatedDecoy: 'Farmers Market', unrelatedDecoy: 'Lighthouse' },
  { id: 'places-school', category: 'places', majority: 'School', relatedDecoy: 'University', unrelatedDecoy: 'Waterfall' },
  { id: 'places-restaurant', category: 'places', majority: 'Restaurant', relatedDecoy: 'Cafe', unrelatedDecoy: 'Observatory' },
  { id: 'places-stadium', category: 'places', majority: 'Stadium', relatedDecoy: 'Arena', unrelatedDecoy: 'Bakery' },

  { id: 'nature-dolphin', category: 'animals-and-nature', majority: 'Dolphin', relatedDecoy: 'Whale', unrelatedDecoy: 'Cactus' },
  { id: 'nature-lion', category: 'animals-and-nature', majority: 'Lion', relatedDecoy: 'Tiger', unrelatedDecoy: 'Mushroom' },
  { id: 'nature-penguin', category: 'animals-and-nature', majority: 'Penguin', relatedDecoy: 'Puffin', unrelatedDecoy: 'Rose' },
  { id: 'nature-butterfly', category: 'animals-and-nature', majority: 'Butterfly', relatedDecoy: 'Moth', unrelatedDecoy: 'Oak Tree' },
  { id: 'nature-frog', category: 'animals-and-nature', majority: 'Frog', relatedDecoy: 'Toad', unrelatedDecoy: 'Sunflower' },
  { id: 'nature-eagle', category: 'animals-and-nature', majority: 'Eagle', relatedDecoy: 'Hawk', unrelatedDecoy: 'Coral' },
  { id: 'nature-rabbit', category: 'animals-and-nature', majority: 'Rabbit', relatedDecoy: 'Hare', unrelatedDecoy: 'Thunderstorm' },
  { id: 'nature-octopus', category: 'animals-and-nature', majority: 'Octopus', relatedDecoy: 'Squid', unrelatedDecoy: 'Pine Tree' },
  { id: 'nature-bee', category: 'animals-and-nature', majority: 'Bee', relatedDecoy: 'Wasp', unrelatedDecoy: 'Glacier' },
  { id: 'nature-crocodile', category: 'animals-and-nature', majority: 'Crocodile', relatedDecoy: 'Alligator', unrelatedDecoy: 'Daisy' },

  { id: 'activities-cycling', category: 'activities', majority: 'Cycling', relatedDecoy: 'Skateboarding', unrelatedDecoy: 'Knitting' },
  { id: 'activities-baking', category: 'activities', majority: 'Baking', relatedDecoy: 'Cooking', unrelatedDecoy: 'Surfing' },
  { id: 'activities-hiking', category: 'activities', majority: 'Hiking', relatedDecoy: 'Camping', unrelatedDecoy: 'Karaoke' },
  { id: 'activities-painting', category: 'activities', majority: 'Painting', relatedDecoy: 'Drawing', unrelatedDecoy: 'Football' },
  { id: 'activities-swimming', category: 'activities', majority: 'Swimming', relatedDecoy: 'Diving', unrelatedDecoy: 'Chess' },
  { id: 'activities-dancing', category: 'activities', majority: 'Dancing', relatedDecoy: 'Gymnastics', unrelatedDecoy: 'Gardening' },
  { id: 'activities-reading', category: 'activities', majority: 'Reading', relatedDecoy: 'Writing', unrelatedDecoy: 'Rock Climbing' },
  { id: 'activities-fishing', category: 'activities', majority: 'Fishing', relatedDecoy: 'Boating', unrelatedDecoy: 'Yoga' },
  { id: 'activities-photography', category: 'activities', majority: 'Photography', relatedDecoy: 'Filmmaking', unrelatedDecoy: 'Jogging' },
  { id: 'activities-singing', category: 'activities', majority: 'Singing', relatedDecoy: 'Playing Guitar', unrelatedDecoy: 'Pottery' },

  { id: 'entertainment-detective-film', category: 'entertainment', majority: 'Detective Film', relatedDecoy: 'Crime Novel', unrelatedDecoy: 'Dance Competition' },
  { id: 'entertainment-superhero-movie', category: 'entertainment', majority: 'Superhero Movie', relatedDecoy: 'Comic Book', unrelatedDecoy: 'Cooking Show' },
  { id: 'entertainment-quiz-show', category: 'entertainment', majority: 'Quiz Show', relatedDecoy: 'Trivia Game', unrelatedDecoy: 'Jazz Concert' },
  { id: 'entertainment-board-game', category: 'entertainment', majority: 'Board Game', relatedDecoy: 'Card Game', unrelatedDecoy: 'Nature Documentary' },
  { id: 'entertainment-sitcom', category: 'entertainment', majority: 'Sitcom', relatedDecoy: 'Comedy Film', unrelatedDecoy: 'Puzzle Game' },
  { id: 'entertainment-musical', category: 'entertainment', majority: 'Musical', relatedDecoy: 'Opera', unrelatedDecoy: 'Racing Game' },
  { id: 'entertainment-podcast', category: 'entertainment', majority: 'Podcast', relatedDecoy: 'Radio Show', unrelatedDecoy: 'Animated Film' },
  { id: 'entertainment-fantasy-novel', category: 'entertainment', majority: 'Fantasy Novel', relatedDecoy: 'Adventure Film', unrelatedDecoy: 'Reality Dating Show' },
  { id: 'entertainment-video-game', category: 'entertainment', majority: 'Video Game', relatedDecoy: 'Arcade Game', unrelatedDecoy: 'Poetry Reading' },
  { id: 'entertainment-magic-show', category: 'entertainment', majority: 'Magic Show', relatedDecoy: 'Circus', unrelatedDecoy: 'Historical Drama' },
]

export function getWordPool(category: Category): readonly WordEntry[] {
  if (category === 'mixed') {
    return WORD_BANK
  }

  return WORD_BANK.filter((entry) => entry.category === category)
}
