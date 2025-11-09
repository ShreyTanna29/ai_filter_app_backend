import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const photoFeatures = [
  {
    endpoint: "with-dragon",
    prompt:
      "Transform the subject into a powerful dragon tamer, with a majestic dragon beside them in a fantasy landscape.",
  },
  {
    endpoint: "at-paris",
    prompt:
      "Place the subject in front of the Eiffel Tower in Paris during golden hour, with romantic warm lighting.",
  },
  {
    endpoint: "cyberpunk-style",
    prompt:
      "Convert the subject into a neon-lit cyberpunk world, with futuristic city lights and glowing reflections.",
  },
  {
    endpoint: "in-anime-style",
    prompt:
      "Recreate the subject as a vibrant anime character with expressive eyes and stylized backgrounds.",
  },
  {
    endpoint: "as-royalty",
    prompt:
      "Turn the subject into a royal portrait, wearing elegant medieval attire in a grand palace setting.",
  },
  {
    endpoint: "as-superhero",
    prompt:
      "Make the subject look like a cinematic superhero with dynamic lighting, detailed costume, and city skyline backdrop.",
  },
  {
    endpoint: "in-vintage-photo",
    prompt:
      "Render the image in 1950s black and white photography style with classic film grain and soft lighting.",
  },
  {
    endpoint: "as-pixar-character",
    prompt:
      "Transform the person into a Pixar-style 3D animated character with soft colors and expressive features.",
  },
  {
    endpoint: "in-watercolor",
    prompt:
      "Convert the photo into a beautiful watercolor painting with soft brush strokes and pastel tones.",
  },
  {
    endpoint: "in-space",
    prompt:
      "Place the subject floating in outer space with planets, stars, and cosmic lighting effects.",
  },
  {
    endpoint: "as-rockstar",
    prompt:
      "Turn the subject into a rockstar performing on stage under colorful lights, holding a guitar or mic.",
  },
  {
    endpoint: "at-beach",
    prompt:
      "Place the subject on a tropical beach at sunset, with waves and palm trees in the background.",
  },
  {
    endpoint: "as-vampire",
    prompt:
      "Transform the person into a gothic vampire with pale skin, glowing eyes, and a dark moody atmosphere.",
  },
  {
    endpoint: "in-steampunk-style",
    prompt:
      "Reimagine the subject in a detailed steampunk world with gears, goggles, and brass machinery.",
  },
  {
    endpoint: "as-knight",
    prompt:
      "Depict the subject as a medieval knight in shining armor, standing in front of a castle.",
  },
  {
    endpoint: "as-futuristic-robot",
    prompt:
      "Turn the person into a highly detailed humanoid robot with glowing elements and cyber design.",
  },
  {
    endpoint: "in-studio-portrait",
    prompt:
      "Enhance the photo into a high-end studio portrait with professional lighting and blurred background.",
  },
  {
    endpoint: "in-oil-painting",
    prompt:
      "Render the image as a classic Renaissance-style oil painting with realistic textures and warm tones.",
  },
  {
    endpoint: "as-greek-god",
    prompt:
      "Transform the person into a Greek god with flowing robes, glowing aura, and mythological scenery.",
  },
  {
    endpoint: "in-winter-wonderland",
    prompt:
      "Place the subject in a snowy forest scene with gentle snowfall and cozy winter attire.",
  },
  {
    endpoint: "at-japan-festival",
    prompt:
      "Recreate the subject at a Japanese lantern festival with glowing lights and traditional yukata.",
  },
  {
    endpoint: "as-astronaut",
    prompt:
      "Turn the person into an astronaut in a detailed space suit with reflections of Earth in the visor.",
  },
  {
    endpoint: "in-comic-book-style",
    prompt:
      "Convert the photo into a bold comic book illustration with halftone textures and action lines.",
  },
  {
    endpoint: "as-angel",
    prompt:
      "Depict the subject as a celestial angel with soft light, feathery wings, and a divine glow.",
  },
  {
    endpoint: "as-zombie",
    prompt:
      "Transform the person into a cinematic zombie apocalypse survivor with gritty atmosphere and moody lighting.",
  },
];

async function main() {
  console.log("Starting to add photo features...");

  let addedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const feature of photoFeatures) {
    try {
      // Try to create the feature, skip if it already exists
      const result = await prisma.photo_Features.upsert({
        where: { endpoint: feature.endpoint },
        update: {
          prompt: feature.prompt,
          isActive: true,
        },
        create: {
          endpoint: feature.endpoint,
          prompt: feature.prompt,
          isActive: true,
        },
      });

      if (result) {
        console.log(`✓ Added/Updated: ${feature.endpoint}`);
        addedCount++;
      }
    } catch (error) {
      console.error(`✗ Error adding ${feature.endpoint}:`, error);
      errorCount++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total features: ${photoFeatures.length}`);
  console.log(`Successfully added/updated: ${addedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log("===============\n");
}

main()
  .catch((e) => {
    console.error("Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
