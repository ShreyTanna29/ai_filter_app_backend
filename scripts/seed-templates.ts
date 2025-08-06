import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const templates = [
  {
    name: 'Trending',
    description: 'Most popular AI video templates',
    steps: [
      { endpoint: 'ai-dance', prompt: 'AI Dance', order: 0 },
      { endpoint: 'ai-pregnant', prompt: 'AI Pregnant', order: 1 },
      { endpoint: 'ai-bikini', prompt: 'AI Bikini', order: 2 },
      { endpoint: 'ai-twerk', prompt: 'AI Twerk', order: 3 },
      { endpoint: 'ai-mermaid', prompt: 'AI Mermaid', order: 4 },
      { endpoint: 'ai-kiss', prompt: 'AI Kiss', order: 5 },
      { endpoint: 'ai-harley', prompt: 'AI Harley', order: 6 },
      { endpoint: 'ai-busty', prompt: 'AI Busty', order: 7 },
      { endpoint: 'ai-waka-waka', prompt: 'AI Waka Waka', order: 8 },
      { endpoint: 'ai-sexy-bride', prompt: 'AI Sexy Bride', order: 9 },
      { endpoint: 'ai-angel-bikini', prompt: 'AI Angel Bikini', order: 10 },
      { endpoint: 'ai-wonder', prompt: 'AI Wonder', order: 11 },
      { endpoint: 'ai-babydoll', prompt: 'AI Babydoll', order: 12 },
      { endpoint: 'ai-chocofall', prompt: 'AI Chocofall', order: 13 },
      { endpoint: 'ai-ice-cream', prompt: 'AI Ice Cream', order: 14 },
      { endpoint: 'ai-nurse', prompt: 'AI Nurse', order: 15 },
      { endpoint: 'ai-black-latex', prompt: 'AI Black Latex', order: 16 },
      { endpoint: 'ai-beach', prompt: 'AI Beach', order: 17 }
    ]
  },
  {
    name: 'Cosplay',
    description: 'Character cosplay AI video templates',
    steps: [
      { endpoint: 'ai-harley', prompt: 'AI Harley', order: 0 },
      { endpoint: 'ai-wonder', prompt: 'AI Wonder', order: 1 },
      { endpoint: 'ai-aeon-flux', prompt: 'AI Aeon Flux', order: 2 },
      { endpoint: 'ai-quinn', prompt: 'AI Quinn', order: 3 },
      { endpoint: 'ai-mystery', prompt: 'AI Mystery', order: 4 },
      { endpoint: 'ai-mermaid', prompt: 'AI Mermaid', order: 5 },
      { endpoint: 'ai-lara', prompt: 'AI Lara', order: 6 },
      { endpoint: 'ai-cyber', prompt: 'AI Cyber', order: 7 },
      { endpoint: 'ai-gold-bikini', prompt: 'AI Gold Bikini', order: 8 },
      { endpoint: 'ai-dragon-queen', prompt: 'AI Dragon Queen', order: 9 },
      { endpoint: 'ai-leia', prompt: 'AI Leia', order: 10 }
    ]
  },
  {
    name: 'Dance',
    description: 'Dance style AI video templates',
    steps: [
      { endpoint: 'ai-twerk', prompt: 'AI Twerk', order: 0 },
      { endpoint: 'ai-dance', prompt: 'AI Dance', order: 1 },
      { endpoint: 'ai-waka-waka', prompt: 'AI Waka Waka', order: 2 },
      { endpoint: 'ai-belly-dance', prompt: 'AI Belly Dance', order: 3 },
      { endpoint: 'ai-swing', prompt: 'AI Swing', order: 4 },
      { endpoint: 'ai-pole', prompt: 'AI Pole', order: 5 },
      { endpoint: 'ai-groove', prompt: 'AI Groove', order: 6 },
      { endpoint: 'ai-party', prompt: 'AI Party', order: 7 }
    ]
  },
  {
    name: 'Couple',
    description: 'Couple and relationship AI video templates',
    steps: [
      { endpoint: 'ai-kiss', prompt: 'AI Kiss', order: 0 },
      { endpoint: 'ai-beach', prompt: 'AI Beach', order: 1 },
      { endpoint: 'ai-bedtime', prompt: 'AI Bedtime', order: 2 },
      { endpoint: 'ai-she-tries', prompt: 'AI She Tries', order: 3 },
      { endpoint: 'ai-wedding', prompt: 'AI Wedding', order: 4 },
      { endpoint: 'ai-he-tries', prompt: 'AI He Tries', order: 5 },
      { endpoint: 'ai-hug', prompt: 'AI Hug', order: 6 },
      { endpoint: 'ai-rose', prompt: 'AI Rose', order: 7 },
      { endpoint: 'ai-proposal', prompt: 'AI Proposal', order: 8 },
      { endpoint: 'ai-cheers', prompt: 'AI Cheers', order: 9 },
      { endpoint: 'ai-dance-together', prompt: 'AI Dance Together', order: 10 },
      { endpoint: 'ai-fight', prompt: 'AI Fight', order: 11 }
    ]
  }
];

async function seedTemplates() {
  try {
    console.log('Starting to seed templates...');
    
    // Clear existing templates and their steps
    await prisma.templateStep.deleteMany({});
    await prisma.template.deleteMany({});
    
    // Create each template with its steps
    for (const templateData of templates) {
      console.log(`Creating template: ${templateData.name}`);
      
      await prisma.template.create({
        data: {
          name: templateData.name,
          description: templateData.description,
          steps: {
            create: templateData.steps.map(step => ({
              endpoint: step.endpoint,
              prompt: step.prompt,
              order: step.order
            }))
          }
        }
      });
    }
    
    console.log('Successfully seeded templates!');
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the seed function
seedTemplates()
  .then(() => console.log('Seeding completed!'))
  .catch((error) => {
    console.error('Error during seeding:', error);
    process.exit(1);
  });
