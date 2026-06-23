import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Hebrew special-case mapping dictionary for perfect matching of common names/words
const HEBREW_SPECIAL_CASES = {
  'קדמה': 'kadma',
  'אנינו': 'anino',
  'שלום': 'shalom',
  'עברית': 'ivrit'
};

const RESERVED_SLUGS = new Set([
  'api',
  'login',
  'register',
  'dashboard',
  'admin',
  'settings'
]);

/**
 * Converts any text (including Hebrew names) into a clean, URL-safe slug.
 */
function slugify(text) {
  if (!text) return '';

  const trimmed = text.trim().toLowerCase();

  if (HEBREW_SPECIAL_CASES[trimmed]) {
    return HEBREW_SPECIAL_CASES[trimmed];
  }

  const hebrewMap = {
    'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't',
    'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's',
    'ע': 'a', 'פ': 'f', 'ף': 'f', 'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't'
  };

  let transliterated = '';
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (hebrewMap[char] !== undefined) {
      if (char === 'ה' && i === trimmed.length - 1) {
        transliterated += 'a';
      } else {
        transliterated += hebrewMap[char];
      }
    } else {
      transliterated += char;
    }
  }

  return transliterated
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function main() {
  console.log('Starting ANINO data migration...');

  // Paths to source CoinBFF data
  const coinBffPath = 'C:/anti/coinbff-site-main/coinbff-site-main';
  const sqliteDbPath = path.join(coinBffPath, 'prisma', 'dev.db');
  const agentsJsonPath = path.join(coinBffPath, 'data', 'agents.json');

  if (!fs.existsSync(sqliteDbPath)) {
    console.error(`Error: Source SQLite database not found at ${sqliteDbPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(agentsJsonPath)) {
    console.error(`Error: Source agents.json not found at ${agentsJsonPath}`);
    process.exit(1);
  }

  // 1. Initialize Prisma client for old SQLite
  const sqlitePrisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${sqliteDbPath}`
      }
    }
  });

  // 2. Initialize Prisma client for new PostgreSQL
  const postgresPrisma = new PrismaClient();

  try {
    // 3. Migrate Users
    console.log('Migrating users from SQLite...');
    const oldUsers = await sqlitePrisma.user.findMany();
    console.log(`Found ${oldUsers.length} users to migrate.`);

    for (const oldUser of oldUsers) {
      const newUser = await postgresPrisma.user.upsert({
        where: { email: oldUser.email },
        update: {
          firstName: oldUser.firstName,
          lastName: oldUser.lastName,
          password: oldUser.password,
          phone: oldUser.phone
        },
        create: {
          id: oldUser.id, // Preserves the same ID for relationship integrity
          firstName: oldUser.firstName,
          lastName: oldUser.lastName,
          email: oldUser.email,
          password: oldUser.password,
          phone: oldUser.phone
        }
      });
      console.log(`- Scoped user: ${newUser.email} (ID: ${newUser.id})`);
    }

    // 4. Migrate Agents & Calls
    console.log('\nMigrating agents and calls from JSON...');
    const agentsData = JSON.parse(fs.readFileSync(agentsJsonPath, 'utf8'));
    console.log(`Found ${agentsData.length} agents to migrate.`);

    const usedSlugs = new Set();

    for (const agent of agentsData) {
      // Verify user exists in new PostgreSQL
      const userExists = await postgresPrisma.user.findUnique({
        where: { id: agent.userId }
      });

      if (!userExists) {
        console.warn(`Warning: User ID ${agent.userId} for agent ${agent.name} does not exist in new database. Skipping.`);
        continue;
      }

      // Generate unique slug
      let baseSlug = slugify(agent.name) || 'agent';
      let slug = baseSlug;
      let counter = 1;

      while (RESERVED_SLUGS.has(slug) || usedSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      usedSlugs.add(slug);

      // Create/upsert agent in PostgreSQL
      const newAgent = await postgresPrisma.agent.upsert({
        where: { slug },
        update: {
          name: agent.name,
          phoneNumber: agent.phoneNumber || null,
          purpose: agent.purpose || '',
          status: agent.status || 'waiting',
          tone: agent.tone || [],
          startTime: agent.startTime || '',
          endTime: agent.endTime || '',
          scheduledAt: agent.scheduledAt ? new Date(agent.scheduledAt) : null
        },
        create: {
          id: agent.id, // Preserves original ID
          name: agent.name,
          slug,
          phoneNumber: agent.phoneNumber || null,
          purpose: agent.purpose || '',
          status: agent.status || 'waiting',
          tone: agent.tone || [],
          startTime: agent.startTime || '',
          endTime: agent.endTime || '',
          scheduledAt: agent.scheduledAt ? new Date(agent.scheduledAt) : null,
          userId: agent.userId
        }
      });
      console.log(`- Migrated agent: ${newAgent.name} (Slug: ${newAgent.slug})`);

      // Migrate calls associated with this agent
      if (agent.calls && Array.isArray(agent.calls)) {
        console.log(`  - Migrating ${agent.calls.length} calls for agent ${agent.name}...`);
        for (const call of agent.calls) {
          await postgresPrisma.call.upsert({
            where: { id: call.id },
            update: {
              number: call.number,
              purpose: call.purpose || '',
              status: call.status,
              scheduledAt: call.scheduledAt ? new Date(call.scheduledAt) : null,
              startedAt: call.startedAt ? new Date(call.startedAt) : new Date()
            },
            create: {
              id: call.id,
              agentId: newAgent.id,
              number: call.number,
              purpose: call.purpose || '',
              status: call.status,
              scheduledAt: call.scheduledAt ? new Date(call.scheduledAt) : null,
              startedAt: call.startedAt ? new Date(call.startedAt) : new Date()
            }
          });
        }
      }
    }

    console.log('\nANINO data migration completed successfully!');
  } catch (error) {
    console.error('Migration failed with error:', error);
  } finally {
    // Close Prisma connections
    await sqlitePrisma.$disconnect();
    await postgresPrisma.$disconnect();
  }
}

main();
