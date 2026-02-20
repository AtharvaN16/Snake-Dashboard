import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import type { Snake, SnakeDatabase } from '../lib/types';

const dbPath = path.join(__dirname, '../data/snakes/index.json');

const rarelyFatalSnakeIds = [
  'massasauga',
  'japanese-mamushi',
  'red-bellied-black-snake',
  'white-lipped-viper',
  'nose-horned-viper',
  'common-adder',
  'cottonmouth',
  'night-adder',
  'asp-viper',
  'rock-rattlesnake',
  'eyelash-viper',
  'waglers-pit-viper',
  'stiletto-snake',
];

function main() {
  console.log('Starting to update rarely fatal snakes...');
  const db: SnakeDatabase = JSON.parse(readFileSync(dbPath, 'utf-8'));

  let updatedCount = 0;

  const migratedSnakes = db.snakes.map(snake => {
    if (rarelyFatalSnakeIds.includes(snake.id)) {
      console.log(`Updating ${snake.commonName} (${snake.id})...`);
      if (snake.clinicalData) {
        snake.clinicalData.fatalitySummary = "Rarely Fatal";
      } else {
        // This case shouldn't happen for these snakes, but as a fallback:
        snake.clinicalData = {
          untreatedFatalityRate: { low: 0, high: 5 },
          severity: 'Moderate',
          fatalitySummary: "Rarely Fatal",
        };
      }
      snake.causesOfDeath = ["Rarely Fatal"];
      updatedCount++;
    }
    return snake;
  });

  const newDb: SnakeDatabase = {
    ...db,
    snakes: migratedSnakes,
  };

  writeFileSync(dbPath, JSON.stringify(newDb, null, 2));
  console.log(`Update complete. Updated ${updatedCount} snakes.`);
  console.log(`Data written to ${dbPath}`);
}

main();
