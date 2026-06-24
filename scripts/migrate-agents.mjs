import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

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
  const isDryRun = process.argv.includes('--dry-run');
  const sourcePathArgIndex = process.argv.indexOf('--source-path');
  
  let coinBffPath = 'C:/anti/coinbff-site-main/coinbff-site-main';
  if (sourcePathArgIndex !== -1 && process.argv[sourcePathArgIndex + 1]) {
    coinBffPath = process.argv[sourcePathArgIndex + 1];
  }

  console.log('Starting ANINO data migration...');
  console.log(`Dry-run mode: ${isDryRun ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Source path: ${coinBffPath}`);

  const sqliteDbPath = path.join(coinBffPath, 'prisma', 'dev.db');
  const agentsJsonPath = path.join(coinBffPath, 'data', 'agents.json');

  console.log(`SQLite DB path: ${sqliteDbPath}`);
  console.log(`Agents JSON path: ${agentsJsonPath}`);

  if (!fs.existsSync(sqliteDbPath)) {
    console.error(`Error: Source SQLite database not found at ${sqliteDbPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(agentsJsonPath)) {
    console.error(`Error: Source agents.json not found at ${agentsJsonPath}`);
    process.exit(1);
  }

  // Load and parse agents.json
  console.log('\nLoading agents from JSON...');
  const agentsData = JSON.parse(fs.readFileSync(agentsJsonPath, 'utf8'));
  console.log(`Found ${agentsData.length} agents to migrate.`);

  // Collect all unique user IDs that own agents
  const userIdsWithAgents = new Set();
  for (const agent of agentsData) {
    if (agent.userId) {
      userIdsWithAgents.add(agent.userId);
    }
  }

  // Load users from SQLite using better-sqlite3 reader
  let oldUsers = [];
  let dbConnection;
  try {
    console.log('\nLoading users from SQLite database...');
    dbConnection = new Database(sqliteDbPath, { readonly: true });
    
    // Query users table
    oldUsers = dbConnection.prepare('SELECT id, firstName, lastName, email, password, phone FROM User').all();
    console.log(`Found ${oldUsers.length} total users in SQLite.`);
  } catch (error) {
    console.error(`Error querying SQLite database: ${error.message}`);
    process.exit(1);
  } finally {
    if (dbConnection) {
      dbConnection.close();
    }
  }

  const oldUserIds = new Set(oldUsers.map(u => u.id));

  // Filter: Only migrate users that have at least one agent
  const usersToMigrate = oldUsers.filter(u => userIdsWithAgents.has(u.id));
  const skippedUsersCount = oldUsers.length - usersToMigrate.length;
  console.log(`Filtered: ${usersToMigrate.length} users own agents and will be migrated (skipped ${skippedUsersCount} users without agents).`);

  if (isDryRun) {
    console.log('\n==================================================');
    console.log('                DRY RUN PREVIEW                   ');
    console.log('==================================================');
    
    console.log(`\n[Users to Migrate] Total: ${usersToMigrate.length}`);
    for (const u of usersToMigrate) {
      console.log(`  - User: ${u.firstName} ${u.lastName} (${u.email}) [ID: ${u.id}]`);
    }

    console.log(`\n[Users Skipped (No Agent)] Total: ${skippedUsersCount}`);
    const skippedUsers = oldUsers.filter(u => !userIdsWithAgents.has(u.id));
    for (const u of skippedUsers) {
      console.log(`  - User: ${u.firstName} ${u.lastName} (${u.email}) [ID: ${u.id}]`);
    }

    console.log(`\n[Agents and Calls Simulation] Total Agents: ${agentsData.length}`);
    const usedSlugs = new Set();
    const warnings = [];

    for (const agent of agentsData) {
      // Validate user exists in SQLite
      const userExists = oldUserIds.has(agent.userId);
      if (!userExists) {
        warnings.push(`Warning: Agent "${agent.name}" (ID: ${agent.id}) has userId "${agent.userId}" which does not exist in the source SQLite database.`);
      }

      // Generate unique slug
      let baseSlug = slugify(agent.name) || 'agent';
      let slug = baseSlug;
      let counter = 1;

      const hadCollision = RESERVED_SLUGS.has(slug) || usedSlugs.has(slug);
      while (RESERVED_SLUGS.has(slug) || usedSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      usedSlugs.add(slug);

      if (hadCollision) {
        warnings.push(`Notice: Slug collision resolved for agent "${agent.name}": '${baseSlug}' -> '${slug}'`);
      }

      const callCount = (agent.calls && Array.isArray(agent.calls)) ? agent.calls.length : 0;
      console.log(`  - Agent: "${agent.name}"`);
      console.log(`    Slug: ${slug}`);
      console.log(`    Owner: ${userExists ? agent.userId : 'UNKNOWN (MISSING USER)'}`);
      console.log(`    Calls: ${callCount}`);
    }

    if (warnings.length > 0) {
      console.log('\n[Potential Issues / Notices]');
      for (const w of warnings) {
        console.log(`  [!] ${w}`);
      }
    } else {
      console.log('\n[Potential Issues / Notices]\n  None detected.');
    }

    console.log('\n==================================================');
    console.log('Dry run simulation completed successfully.');
    console.log('No database writes to PostgreSQL or source changes were executed.');
    console.log('==================================================');
    return;
  }

  // 3. Migrate Users (Normal mode) - Load Prisma Client dynamically to prevent importing it in dry run
  const { PrismaClient } = await import('@prisma/client');
  const postgresPrisma = new PrismaClient();

  try {
    console.log('\nMigrating users from SQLite to PostgreSQL...');
    for (const oldUser of usersToMigrate) {
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

    // 4. Migrate Agents & Calls (Normal mode)
    console.log('\nMigrating agents and calls from JSON to PostgreSQL...');
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
    if (postgresPrisma) {
      await postgresPrisma.$disconnect();
    }
  }
}

main();
