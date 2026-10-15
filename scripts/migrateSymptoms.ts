import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import type { Snake, SnakeDatabase } from '../lib/types';

const inputPath = path.join(__dirname, '../data/snakes/index.json');
const outputPath = path.join(__dirname, '../data/snakes/index.json');

const symptomMap: { [keyword: string]: { category: keyof NonNullable<Snake['symptoms']>; tag: string } } = {
  'pain': { category: 'localEffects', tag: 'Pain' },
  'severe pain': { category: 'localEffects', tag: 'Extreme Pain' },
  'mild pain': { category: 'localEffects', tag: 'Mild Pain' },
  'swelling': { category: 'localEffects', tag: 'Swelling' },
  'bruising': { category: 'localEffects', tag: 'Bruising' },
  'bleeding': { category: 'blood', tag: 'Systemic Bleeding' },
  'blister': { category: 'localEffects', tag: 'Blistering' },
  'necrosis': { category: 'localEffects', tag: 'Tissue Necrosis' },
  'ptosis': { category: 'neurological', tag: 'Ptosis (Drooping Eyelids)' },
  'drooping eyelids': { category: 'neurological', tag: 'Ptosis (Drooping Eyelids)' },
  'blurred vision': { category: 'neurological', tag: 'Blurred Vision' },
  'difficulty speaking': { category: 'neurological', tag: 'Difficulty Speaking/Swallowing' },
  'difficulty swallowing': { category: 'neurological', tag: 'Difficulty Speaking/Swallowing' },
  'dizziness': { category: 'neurological', tag: 'Dizziness / Vertigo' },
  'vertigo': { category: 'neurological', tag: 'Dizziness / Vertigo' },
  'muscle weakness': { category: 'neurological', tag: 'Muscle Weakness' },
  'paralysis': { category: 'neurological', tag: 'Paralysis' },
  'respiratory failure': { category: 'neurological', tag: 'Respiratory Failure' },
  'difficulty breathing': { category: 'neurological', tag: 'Respiratory Failure' },
  'coagulopathy': { category: 'blood', tag: 'Clotting Disorder' },
  'clotting': { category: 'blood', tag: 'Clotting Disorder' },
  'hypotension': { category: 'blood', tag: 'Hypotension (Low Blood Pressure)' },
  'low blood pressure': { category: 'blood', tag: 'Hypotension (Low Blood Pressure)' },
  'shock': { category: 'blood', tag: 'Shock' },
  'muscle pain': { category: 'muscle', tag: 'Muscle Pain' },
  'dark urine': { category: 'muscle', tag: 'Dark Urine' },
  'renal failure': { category: 'muscle', tag: 'Kidney Damage' },
  'kidney failure': { category: 'muscle', tag: 'Kidney Damage' },
  'kidney damage': { category: 'muscle', tag: 'Kidney Damage' },
  'nausea': { category: 'gastrointestinal', tag: 'Nausea / Vomiting' },
  'vomiting': { category: 'gastrointestinal', tag: 'Nausea / Vomiting' },
  'abdominal pain': { category: 'gastrointestinal', tag: 'Abdominal Pain' },
};

const causeOfDeathMap: { [keyword: string]: string } = {
  'respiratory failure': 'Respiratory Failure',
  'paralysis': 'Paralysis',
  'bleeding': 'Systemic Bleeding',
  'hemorrhage': 'Systemic Bleeding',
  'shock': 'Shock',
  'cardiovascular collapse': 'Cardiovascular Collapse',
  'cardiac arrest': 'Cardiovascular Collapse',
  'renal failure': 'Kidney Damage',
  'kidney failure': 'Kidney Damage',
};

function migrateSnake(snake: any): Snake {
  if (snake.venomClassification === 'Non-venomous' || !snake.symptomsProgression) {
    delete snake.symptomsProgression;
    return snake;
  }

  const newSymptoms: NonNullable<Snake['symptoms']> = {};
  const newCausesOfDeath = new Set<string>();

  const allSymptomsText = [
    ...snake.symptomsProgression.shortTerm,
    ...snake.symptomsProgression.progressive,
    ...snake.symptomsProgression.critical,
  ].join(' ').toLowerCase();

  for (const keyword in symptomMap) {
    if (allSymptomsText.includes(keyword)) {
      const { category, tag } = symptomMap[keyword];
      if (!newSymptoms[category]) {
        newSymptoms[category] = [];
      }
      if (!newSymptoms[category]?.includes(tag)) {
        newSymptoms[category]?.push(tag);
      }
    }
  }

  const criticalText = snake.symptomsProgression.critical.join(' ').toLowerCase();
  for (const keyword in causeOfDeathMap) {
    if (criticalText.includes(keyword) || allSymptomsText.includes(keyword)) {
      newCausesOfDeath.add(causeOfDeathMap[keyword]);
    }
  }

  // Some reasonable defaults based on venom type
  if (snake.venomTypes?.includes('Neurotoxic')) {
    if (!newSymptoms.neurological) newSymptoms.neurological = [];
    if (!newSymptoms.neurological.includes('Paralysis')) newSymptoms.neurological.push('Paralysis');
    newCausesOfDeath.add('Respiratory Failure');
  }
  if (snake.venomTypes?.includes('Hemotoxic')) {
    if (!newSymptoms.blood) newSymptoms.blood = [];
    if (!newSymptoms.blood.includes('Clotting Disorder')) newSymptoms.blood.push('Clotting Disorder');
     newCausesOfDeath.add('Systemic Bleeding');
  }
   if (snake.venomTypes?.includes('Myotoxic')) {
    if (!newSymptoms.muscle) newSymptoms.muscle = [];
    if (!newSymptoms.muscle.includes('Kidney Damage')) newSymptoms.muscle.push('Kidney Damage');
    newCausesOfDeath.add('Kidney Damage');
  }


  // If no specific symptoms were found, add N/A to avoid empty sections
  const categories: (keyof typeof newSymptoms)[] = ['localEffects', 'neurological', 'blood', 'muscle', 'gastrointestinal'];
  for (const category of categories) {
    if (!newSymptoms[category] || newSymptoms[category]?.length === 0) {
      newSymptoms[category] = ['N/A'];
    }
  }


  delete snake.symptomsProgression;
  snake.symptoms = newSymptoms;
  snake.causesOfDeath = Array.from(newCausesOfDeath);

  return snake;
}

function main() {
  console.log('Starting snake data migration...');
  const db: SnakeDatabase = JSON.parse(readFileSync(inputPath, 'utf-8'));
  
  const migratedSnakes = db.snakes.map(migrateSnake);

  const newDb: SnakeDatabase = {
    ...db,
    snakes: migratedSnakes,
  };

  writeFileSync(outputPath, JSON.stringify(newDb, null, 2));
  console.log(`Migration complete. Updated ${migratedSnakes.length} snakes.`);
  console.log(`Data written to ${outputPath}`);
}

main();
