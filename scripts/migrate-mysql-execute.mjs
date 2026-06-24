import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

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

/**
 * Validates if a slug is URL-safe and not reserved.
 */
function isValidSlug(slug) {
  if (!slug) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !RESERVED_SLUGS.has(slug);
}

/**
 * Maps legacy status and call status to new Call status
 */
function mapCallStatus(status, callStatus) {
  const s = (status || '').toLowerCase();
  const cs = (callStatus || '').toLowerCase();
  if (s === 'done') {
    if (cs === 'ended') return 'completed';
    if (cs === 'failed') return 'failed';
    if (cs === 'ringing') return 'in_progress';
  }
  if (s === 'not available') return 'unavailable';
  return 'unknown';
}

/**
 * Deep compare helper for idempotency checks
 */
function areFieldsEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  
  // Date comparisons
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof Date) {
    return a.toISOString() === new Date(b).toISOString();
  }
  if (b instanceof Date) {
    return new Date(a).toISOString() === b.toISOString();
  }
  
  return String(a) === String(b);
}

async function main() {
  const isConfirm = process.argv.includes('--confirm');
  const runIdArgIndex = process.argv.indexOf('--run-id');
  const rollbackArgIndex = process.argv.indexOf('--rollback');

  const runId = (runIdArgIndex !== -1 && process.argv[runIdArgIndex + 1]) ? process.argv[runIdArgIndex + 1] : null;
  const rollbackRunId = (rollbackArgIndex !== -1 && process.argv[rollbackArgIndex + 1]) ? process.argv[rollbackArgIndex + 1] : null;

  const isRollback = rollbackRunId !== null;
  const isDryRun = !isConfirm && !isRollback;

  console.log('==================================================');
  console.log('    ANINO DATA MIGRATION: LEGACY MYSQL EXECUTE    ');
  console.log('==================================================');
  console.log(`Execution Mode: ${isDryRun ? 'DRY-RUN (PREVIEW)' : isRollback ? 'ROLLBACK' : 'ACTIVE EXECUTE'}`);
  if (runId) console.log(`Run ID: ${runId}`);
  if (rollbackRunId) console.log(`Rollback Run ID: ${rollbackRunId}`);

  // Dynamic import of Prisma to prevent failure on environments without local PostgreSQL
  let prisma;
  let isPostgresAvailable = false;
  try {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
    // Simple test query to check DB availability
    await prisma.$queryRaw`SELECT 1`;
    isPostgresAvailable = true;
    console.log('PostgreSQL database connection: CONNECTED');
  } catch (err) {
    isPostgresAvailable = false;
    console.log('PostgreSQL database connection: OFFLINE / UNCONFIGURED');
    if (!isDryRun) {
      console.error('Error: Active execution and Rollback modes require a running PostgreSQL database.');
      console.error(err.message);
      process.exit(1);
    }
  }

  // --- ROLLBACK MODE ---
  if (isRollback) {
    if (!isConfirm) {
      console.error('Error: Rollback requires explicit --confirm flag.');
      console.error('Run: node scripts/migrate-mysql-execute.mjs --rollback <run-id> --confirm');
      process.exit(1);
    }

    console.log(`\nStarting rollback for Migration Run: "${rollbackRunId}"...`);

    // Find the migration run in PostgreSQL
    const migrationRun = await prisma.migrationRun.findUnique({
      where: { runId: rollbackRunId }
    });

    if (!migrationRun) {
      console.error(`Error: Migration run "${rollbackRunId}" not found in PostgreSQL.`);
      process.exit(1);
    }

    if (migrationRun.status !== 'completed') {
      console.error(`Error: Cannot roll back migration run "${rollbackRunId}". Current status is "${migrationRun.status}". Only "completed" runs can be rolled back.`);
      process.exit(1);
    }

    const rollbackReport = {
      deletedKnowledge: 0,
      deletedCalls: 0,
      deletedAgents: 0,
      deletedUsers: 0,
      skippedAgentsWithNewData: [],
      skippedUsersWithNewData: []
    };

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Delete AgentKnowledge
        const delKnowledge = await tx.agentKnowledge.deleteMany({
          where: { migrationRunId: migrationRun.id }
        });
        rollbackReport.deletedKnowledge = delKnowledge.count;

        // 2. Delete Calls
        const delCalls = await tx.call.deleteMany({
          where: { migrationRunId: migrationRun.id }
        });
        rollbackReport.deletedCalls = delCalls.count;

        // 3. Load Agents in the run with remaining calls and knowledge
        const agentsInRun = await tx.agent.findMany({
          where: { migrationRunId: migrationRun.id },
          include: {
            calls: true,
            knowledge: true
          }
        });

        let deletedAgentsCount = 0;
        for (const a of agentsInRun) {
          const hasNewData = a.calls.length > 0 || a.knowledge.length > 0;
          if (hasNewData) {
            rollbackReport.skippedAgentsWithNewData.push({ id: a.id, name: a.name });
          } else {
            await tx.agent.delete({ where: { id: a.id } });
            deletedAgentsCount++;
          }
        }
        rollbackReport.deletedAgents = deletedAgentsCount;

        // 4. Safely Delete Users (only if created in this run and have no new ANINO data)
        const usersInRun = await tx.user.findMany({
          where: { migrationRunId: migrationRun.id },
          include: {
            agents: true,
            whatsappSession: true,
            businessProfile: true,
            customers: true
          }
        });

        let deletedUsersCount = 0;
        for (const u of usersInRun) {
          const hasNewData = u.agents.length > 0 || 
                             u.whatsappSession !== null || 
                             u.businessProfile !== null || 
                             u.customers.length > 0;
          if (hasNewData) {
            rollbackReport.skippedUsersWithNewData.push({ id: u.id, email: u.email });
          } else {
            await tx.user.delete({ where: { id: u.id } });
            deletedUsersCount++;
          }
        }
        rollbackReport.deletedUsers = deletedUsersCount;

        // 5. Update MigrationRun status
        const isPartial = rollbackReport.skippedAgentsWithNewData.length > 0 || rollbackReport.skippedUsersWithNewData.length > 0;
        await tx.migrationRun.update({
          where: { id: migrationRun.id },
          data: {
            status: isPartial ? 'rolled_back_partial' : 'rolled_back',
            mode: 'rollback',
            rollbackOfRunId: rollbackRunId,
            finishedAt: new Date(),
            reportJson: JSON.stringify(rollbackReport)
          }
        });
      });

      const isPartial = rollbackReport.skippedAgentsWithNewData.length > 0 || rollbackReport.skippedUsersWithNewData.length > 0;
      console.log('\n==================================================');
      console.log(`       ROLLBACK COMPLETED: ${isPartial ? 'PARTIAL' : 'SUCCESSFUL'}     `);
      console.log('==================================================');
      console.log(`- Deleted AgentKnowledge records: ${rollbackReport.deletedKnowledge}`);
      console.log(`- Deleted Call records: ${rollbackReport.deletedCalls}`);
      console.log(`- Deleted Agent records (Clean): ${rollbackReport.deletedAgents}`);
      console.log(`- Skipped Agent records (With new ANINO data): ${rollbackReport.skippedAgentsWithNewData.length}`);
      if (rollbackReport.skippedAgentsWithNewData.length > 0) {
        for (const skipped of rollbackReport.skippedAgentsWithNewData) {
          console.log(`  * Skipped Agent: ${skipped.name} (ID: ${skipped.id})`);
        }
      }
      console.log(`- Deleted User records (Clean): ${rollbackReport.deletedUsers}`);
      console.log(`- Skipped User records (With new ANINO data): ${rollbackReport.skippedUsersWithNewData.length}`);
      if (rollbackReport.skippedUsersWithNewData.length > 0) {
        for (const skipped of rollbackReport.skippedUsersWithNewData) {
          console.log(`  * Skipped User: ${skipped.email} (ID: ${skipped.id})`);
        }
      }
      console.log('==================================================');

    } catch (error) {
      console.error('Rollback failed:', error.message);
      process.exit(1);
    } finally {
      if (prisma) await prisma.$disconnect();
    }
    return;
  }

  // --- DRY RUN & ACTIVE EXECUTE MODES ---
  if (!isDryRun && !runId) {
    console.error('Error: Active execution mode requires a unique --run-id <run-id>.');
    console.error('Run: node scripts/migrate-mysql-execute.mjs --confirm --run-id <unique-id>');
    process.exit(1);
  }

  // Load MySQL connection parameters from environment variables
  const dbHost = process.env.LEGACY_DB_HOST;
  const dbPort = process.env.LEGACY_DB_PORT || '3306';
  const dbUser = process.env.LEGACY_DB_USER;
  const dbPassword = process.env.LEGACY_DB_PASSWORD;
  const dbName = process.env.LEGACY_DB_NAME;

  if (!dbHost || !dbUser || !dbPassword || !dbName) {
    console.error('\nError: Missing MySQL database connection variables.');
    console.error('Please define: LEGACY_DB_HOST, LEGACY_DB_USER, LEGACY_DB_PASSWORD, LEGACY_DB_NAME');
    process.exit(1);
  }

  let connection;
  try {
    console.log('\nConnecting to legacy MySQL database (Read-Only session)...');
    connection = await mysql.createConnection({
      host: dbHost,
      port: parseInt(dbPort, 10),
      user: dbUser,
      password: dbPassword,
      database: dbName
    });

    // Enforce read-only session
    await connection.execute('SET SESSION TRANSACTION READ ONLY');
    console.log('MySQL session transaction set to READ ONLY.');

    // Fetch MySQL legacy data
    const [accountsRows] = await connection.execute('SELECT id, email, phone, first_name, last_name, password, balance FROM accounts');
    const [agentsRows] = await connection.execute('SELECT id, phone_number, name, account, purpose, tone, start_time, end_time, slug, image_url, greeting FROM ai_agents');
    const [callsRows] = await connection.execute('SELECT id, agent, number, status, tries, purpose, tone, transcript, recording, retell_call_id, call_status, started_at, ended_at, duration_seconds, error_message, transcription, scheduled_at, last_scheduler_attempt_at FROM calls_queue');
    const [knowledgeRows] = await connection.execute('SELECT id, agent, content, link, title FROM agent_data');

    // Retrieve existing records in PostgreSQL for relationship checks and idempotency
    const existingPgUsers = isPostgresAvailable ? await prisma.user.findMany() : [];
    const existingPgAgents = isPostgresAvailable ? await prisma.agent.findMany() : [];
    const existingPgCalls = isPostgresAvailable ? await prisma.call.findMany() : [];
    const existingPgKnowledge = isPostgresAvailable ? await prisma.agentKnowledge.findMany() : [];

    // Map existing PG elements by legacy IDs and fields for comparison
    const pgUsersByLegacyId = new Map(existingPgUsers.filter(u => u.legacyAccountId !== null).map(u => [u.legacyAccountId, u]));
    const pgUsersByEmail = new Map(existingPgUsers.map(u => [u.email.toLowerCase(), u]));
    const pgAgentsByLegacyId = new Map(existingPgAgents.filter(a => a.legacyAgentId !== null).map(a => [a.legacyAgentId, a]));
    const pgCallsByLegacyId = new Map(existingPgCalls.filter(c => c.legacyCallId !== null).map(c => [c.legacyCallId, c]));
    const pgKnowledgeByLegacyId = new Map(existingPgKnowledge.filter(k => k.legacyId !== null).map(k => [k.legacyId, k]));

    // Check unique run ID existence in Postgres
    if (!isDryRun && isPostgresAvailable) {
      const existingRun = await prisma.migrationRun.findUnique({
        where: { runId }
      });
      if (existingRun) {
        console.error(`Error: Migration Run ID "${runId}" already exists. Please choose a new unique run ID.`);
        process.exit(1);
      }
    }

    const report = {
      users: {
        inserted: 0,
        skipped: 0,
        noAgentSkipped: 0,
        idempotencySkipped: 0,
        conflicts: [],
        emailConflicts: []
      },
      agents: { inserted: 0, skipped: 0, conflicts: [], renamedSlugs: [] },
      calls: { inserted: 0, skipped: 0, conflicts: [] },
      knowledge: { inserted: 0, skipped: 0, conflicts: [] },
      warnings: []
    };

    // 1. FILTER AND VALIDATE USERS (ACCOUNTS)
    const activeAccountIds = new Set(agentsRows.map(a => a.account).filter(Boolean));
    const accountsToMigrate = [];
    const skippedAccountsCount = accountsRows.length - accountsRows.filter(a => activeAccountIds.has(a.id)).length;

    for (const acc of accountsRows) {
      // Rule: Only migrate users who own at least one agent
      if (!activeAccountIds.has(acc.id)) {
        report.users.noAgentSkipped++;
        report.users.skipped++;
        continue;
      }

      // Check legacyAccountId first (Idempotency skip/conflict)
      const existingPgUser = pgUsersByLegacyId.get(acc.id);
      if (existingPgUser) {
        const differs = !areFieldsEqual(acc.first_name, existingPgUser.firstName) ||
                        !areFieldsEqual(acc.last_name, existingPgUser.lastName) ||
                        !areFieldsEqual(acc.phone, existingPgUser.phone) ||
                        !areFieldsEqual(acc.password, existingPgUser.password);
        if (differs) {
          report.users.conflicts.push({ legacyAccountId: acc.id, email: acc.email });
          report.warnings.push(`User Conflict: Legacy Account ID ${acc.id} exists in ANINO but has differing data. Skipping write.`);
          activeAccountIds.delete(acc.id);
        } else {
          report.users.idempotencySkipped++;
          report.users.skipped++; // Matches exactly, skip
        }
        continue;
      }

      // Check if email already exists in ANINO (Email conflict)
      const emailLower = acc.email.toLowerCase();
      const existingUserWithEmail = pgUsersByEmail.get(emailLower);
      
      if (existingUserWithEmail) {
        // Rule: Skip the account and all associated agents if the email is a conflict
        report.users.emailConflicts.push({ legacyAccountId: acc.id, email: acc.email });
        report.warnings.push(`Email Conflict: Legacy Account ID ${acc.id} skipped. Email "${acc.email}" already exists in ANINO.`);
        activeAccountIds.delete(acc.id); // Disable migrating agents of this account
        continue;
      }

      accountsToMigrate.push(acc);
    }

    // 2. FILTER AND VALIDATE AGENTS
    const agentsToMigrate = [];
    const usedSlugs = new Set(existingPgAgents.map(a => a.slug));
    
    // Map of legacy agent ID to newly simulated slug
    const agentSlugMap = new Map();

    for (const agent of agentsRows) {
      // Check if owner was excluded (due to no agents or email conflict)
      if (!activeAccountIds.has(agent.account)) {
        report.agents.skipped++;
        continue;
      }

      // Idempotency check: legacy ID already exists?
      const existingPgAgent = pgAgentsByLegacyId.get(agent.id);
      if (existingPgAgent) {
        const differs = !areFieldsEqual(agent.name, existingPgAgent.name) ||
                        !areFieldsEqual(agent.phone_number, existingPgAgent.phoneNumber) ||
                        !areFieldsEqual(agent.purpose, existingPgAgent.purpose) ||
                        !areFieldsEqual(agent.greeting, existingPgAgent.greeting) ||
                        !areFieldsEqual(agent.image_url, existingPgAgent.imageUrl);
        if (differs) {
          report.agents.conflicts.push({ legacyAgentId: agent.id, name: agent.name });
          report.warnings.push(`Agent Conflict: Legacy Agent ID ${agent.id} exists but has differing data. Skipping write.`);
        } else {
          report.agents.skipped++;
        }
        agentSlugMap.set(agent.id, existingPgAgent.slug);
        continue;
      }

      // Slug selection prioritising legacy slug
      let finalSlug = agent.slug;
      let replaced = false;

      if (!finalSlug || !isValidSlug(finalSlug) || usedSlugs.has(finalSlug)) {
        const baseSlug = slugify(agent.name) || 'agent';
        finalSlug = baseSlug;
        let counter = 1;
        while (usedSlugs.has(finalSlug) || RESERVED_SLUGS.has(finalSlug)) {
          finalSlug = `${baseSlug}-${counter}`;
          counter++;
        }
        replaced = true;
      }
      usedSlugs.add(finalSlug);
      agentSlugMap.set(agent.id, finalSlug);

      if (replaced && agent.slug !== finalSlug) {
        report.agents.renamedSlugs.push({ legacyAgentId: agent.id, original: agent.slug, renamed: finalSlug });
      }

      agentsToMigrate.push({ ...agent, finalSlug });
    }

    // 3. FILTER AND VALIDATE CALLS
    const callsToMigrate = [];
    const legacyAgentIdsSet = new Set(agentsRows.map(a => a.id));

    for (const call of callsRows) {
      if (!call.agent || !legacyAgentIdsSet.has(call.agent)) {
        report.warnings.push(`Warning: Call ID ${call.id} skipped. Invalid/Missing Agent relation.`);
        continue;
      }
      // Check if associated agent belongs to an active/migrating owner
      const associatedAgent = agentsRows.find(a => a.id === call.agent);
      if (!associatedAgent || !activeAccountIds.has(associatedAgent.account)) {
        report.calls.skipped++;
        continue;
      }

      // Idempotency check: legacy ID already exists?
      const existingPgCall = pgCallsByLegacyId.get(call.id);
      if (existingPgCall) {
        const differs = !areFieldsEqual(call.number, existingPgCall.number) ||
                        !areFieldsEqual(call.purpose, existingPgCall.purpose) ||
                        !areFieldsEqual(mapCallStatus(call.status, call.call_status), existingPgCall.status) ||
                        !areFieldsEqual(call.tries, existingPgCall.tries) ||
                        !areFieldsEqual(call.recording, existingPgCall.recordingUrl) ||
                        !areFieldsEqual(call.retell_call_id, existingPgCall.retellCallId) ||
                        !areFieldsEqual(call.duration_seconds, existingPgCall.durationSeconds);
        if (differs) {
          report.calls.conflicts.push({ legacyCallId: call.id });
          report.warnings.push(`Call Conflict: Legacy Call ID ${call.id} exists but has differing data. Skipping write.`);
        } else {
          report.calls.skipped++;
        }
        continue;
      }

      callsToMigrate.push(call);
    }

    // 4. FILTER AND VALIDATE AGENT KNOWLEDGE
    const knowledgeToMigrate = [];
    for (const item of knowledgeRows) {
      if (!item.agent || !legacyAgentIdsSet.has(item.agent)) {
        report.warnings.push(`Warning: Knowledge ID ${item.id} skipped. Invalid/Missing Agent relation.`);
        continue;
      }
      const associatedAgent = agentsRows.find(a => a.id === item.agent);
      if (!associatedAgent || !activeAccountIds.has(associatedAgent.account)) {
        report.knowledge.skipped++;
        continue;
      }

      // Idempotency check: legacy ID already exists?
      const existingPgKnowledgeItem = pgKnowledgeByLegacyId.get(item.id);
      if (existingPgKnowledgeItem) {
        const differs = !areFieldsEqual(item.content, existingPgKnowledgeItem.content) ||
                        !areFieldsEqual(item.title, existingPgKnowledgeItem.title) ||
                        !areFieldsEqual(item.link, existingPgKnowledgeItem.link);
        if (differs) {
          report.knowledge.conflicts.push({ legacyId: item.id });
          report.warnings.push(`Knowledge Conflict: Legacy Knowledge ID ${item.id} exists but has differing data. Skipping.`);
        } else {
          report.knowledge.skipped++;
        }
        continue;
      }

      knowledgeToMigrate.push(item);
    }

    // --- DRY RUN OUTPUT ---
    if (isDryRun) {
      console.log('\n==================================================');
      console.log('                DRY RUN PREVIEW                   ');
      console.log('==================================================');
      
      console.log(`\n[Accounts Statistics]`);
      console.log(`- Total MySQL Accounts: ${accountsRows.length}`);
      console.log(`- Accounts to Migrate: ${accountsToMigrate.length}`);
      console.log(`- Accounts Skipped (No Agent): ${report.users.noAgentSkipped}`);
      console.log(`- Accounts Skipped (Idempotency skip): ${report.users.idempotencySkipped}`);
      console.log(`- Accounts in Conflict (legacy ID data differs): ${report.users.conflicts.length}`);
      console.log(`- Email Conflicts Skipped: ${report.users.emailConflicts.length}`);
      
      console.log(`\n[Agents Statistics]`);
      console.log(`- Agents to Migrate: ${agentsToMigrate.length}`);
      console.log(`- Agents Skipped (Idempotency / Owner skip): ${report.agents.skipped}`);
      console.log(`- Agents in Conflict: ${report.agents.conflicts.length}`);
      console.log(`- Renamed Slugs: ${report.agents.renamedSlugs.length}`);
      for (const ren of report.agents.renamedSlugs) {
        console.log(`  * Replaced Slug for Agent ID ${ren.legacyAgentId}: "${ren.original}" -> "${ren.renamed}"`);
      }

      console.log(`\n[Calls Statistics]`);
      console.log(`- Calls to Migrate: ${callsToMigrate.length}`);
      console.log(`- Calls Skipped (Idempotency / Owner skip): ${report.calls.skipped}`);
      console.log(`- Calls in Conflict: ${report.calls.conflicts.length}`);

      console.log(`\n[Knowledge Statistics]`);
      console.log(`- Knowledge Items to Migrate: ${knowledgeToMigrate.length}`);
      console.log(`- Knowledge Items Skipped (Idempotency / Owner skip): ${report.knowledge.skipped}`);
      console.log(`- Knowledge Items in Conflict: ${report.knowledge.conflicts.length}`);

      console.log(`\n[Warnings & Conflict Details]`);
      if (report.warnings.length > 0) {
        for (const w of report.warnings) {
          console.log(`  [!] ${w}`);
        }
      } else {
        console.log('  None. Data relations are clean.');
      }

      console.log('\n==================================================');
      console.log('Dry run simulation completed successfully.');
      console.log('No database writes were executed.');
      console.log('==================================================');
      return;
    }

    // --- ACTIVE EXECUTION MODE ---
    console.log(`\nInitializing active migration run: "${runId}"...`);

    // Step 1: Create MigrationRun record OUTSIDE the transaction
    const dbMigrationRun = await prisma.migrationRun.create({
      data: {
        runId,
        mode: 'execute',
        status: 'started',
        reportJson: JSON.stringify({
          scheduledToMigrate: {
            users: accountsToMigrate.length,
            agents: agentsToMigrate.length,
            calls: callsToMigrate.length,
            knowledge: knowledgeToMigrate.length
          }
        })
      }
    });

    console.log(`Created MigrationRun log in PostgreSQL (ID: ${dbMigrationRun.id}, Status: ${dbMigrationRun.status})`);

    // Maps of legacy IDs to new PG model CUIDs
    const userIdMap = new Map();
    const agentIdMap = new Map();

    // Populate maps with already migrated items (so we link them correctly)
    for (const [legacyId, userObj] of pgUsersByLegacyId.entries()) {
      userIdMap.set(legacyId, userObj.id);
    }
    for (const [legacyId, agentObj] of pgAgentsByLegacyId.entries()) {
      agentIdMap.set(legacyId, agentObj.id);
    }

    try {
      // Step 2: Perform the migration inside a single Postgres transaction
      await prisma.$transaction(async (tx) => {
        console.log('\nStarting database write transaction...');

        // 1. Insert Users
        for (const acc of accountsToMigrate) {
          const createdUser = await tx.user.create({
            data: {
              firstName: acc.first_name,
              lastName: acc.last_name,
              email: acc.email,
              password: acc.password, // Keep bcrypt hash directly
              phone: acc.phone || null,
              legacyAccountId: acc.id,
              legacyBalance: acc.balance ? parseFloat(acc.balance) : null,
              migrationRunId: dbMigrationRun.id
            }
          });
          userIdMap.set(acc.id, createdUser.id);
          report.users.inserted++;
        }
        console.log(`- Migrated ${report.users.inserted} users.`);

        // 2. Insert Agents
        for (const agent of agentsToMigrate) {
          const pgUserId = userIdMap.get(agent.account);
          if (!pgUserId) {
            throw new Error(`Inconsistent State: PostgreSQL user ID not found for legacy account ${agent.account}`);
          }

          const createdAgent = await tx.agent.create({
            data: {
              name: agent.name,
              slug: agent.finalSlug,
              phoneNumber: agent.phone_number || null,
              purpose: agent.purpose || '',
              status: 'waiting',
              tone: agent.tone ? agent.tone.split(',') : [],
              startTime: agent.start_time || null,
              endTime: agent.end_time || null,
              userId: pgUserId,
              legacyAgentId: agent.id,
              imageUrl: agent.image_url || null,
              greeting: agent.greeting || null,
              migrationRunId: dbMigrationRun.id
            }
          });
          agentIdMap.set(agent.id, createdAgent.id);
          report.agents.inserted++;
        }
        console.log(`- Migrated ${report.agents.inserted} agents.`);

        // 3. Insert Calls
        for (const call of callsToMigrate) {
          const pgAgentId = agentIdMap.get(call.agent);
          if (!pgAgentId) {
            throw new Error(`Inconsistent State: PostgreSQL agent ID not found for legacy agent ${call.agent}`);
          }

          await tx.call.create({
            data: {
              agentId: pgAgentId,
              number: call.number,
              purpose: call.purpose || '',
              status: mapCallStatus(call.status, call.call_status),
              scheduledAt: call.scheduled_at ? new Date(call.scheduled_at) : null,
              startedAt: call.started_at ? new Date(call.started_at) : null,
              legacyCallId: call.id,
              direction: 'unknown',
              tries: call.tries || 0,
              transcript: call.transcript || null,
              recordingUrl: call.recording || null,
              retellCallId: call.retell_call_id || null,
              durationSeconds: call.duration_seconds || null,
              errorMessage: call.error_message || null,
              lastSchedulerAttemptAt: call.last_scheduler_attempt_at ? new Date(call.last_scheduler_attempt_at) : null,
              endedAt: call.ended_at ? new Date(call.ended_at) : null,
              migrationRunId: dbMigrationRun.id
            }
          });
          report.calls.inserted++;
        }
        console.log(`- Migrated ${report.calls.inserted} calls.`);

        // 4. Insert Agent Knowledge
        for (const item of knowledgeToMigrate) {
          const pgAgentId = agentIdMap.get(item.agent);
          if (!pgAgentId) {
            throw new Error(`Inconsistent State: PostgreSQL agent ID not found for legacy agent ${item.agent}`);
          }

          await tx.agentKnowledge.create({
            data: {
              agentId: pgAgentId,
              content: item.content,
              link: item.link || null,
              title: item.title || null,
              legacyId: item.id,
              migrationRunId: dbMigrationRun.id
            }
          });
          report.knowledge.inserted++;
        }
        console.log(`- Migrated ${report.knowledge.inserted} knowledge items.`);

        // 5. Save final counts and mark MigrationRun as completed
        const finalReport = {
          inserted: {
            users: report.users.inserted,
            agents: report.agents.inserted,
            calls: report.calls.inserted,
            knowledge: report.knowledge.inserted
          },
          skipped: {
            users: report.users.skipped,
            agents: report.agents.skipped,
            calls: report.calls.skipped,
            knowledge: report.knowledge.skipped
          },
          conflicts: {
            users: report.users.conflicts.length,
            agents: report.agents.conflicts.length,
            calls: report.calls.conflicts.length,
            knowledge: report.knowledge.conflicts.length
          },
          renamedSlugs: report.agents.renamedSlugs
        };

        await tx.migrationRun.update({
          where: { id: dbMigrationRun.id },
          data: {
            status: 'completed',
            usersCreated: report.users.inserted,
            agentsCreated: report.agents.inserted,
            callsCreated: report.calls.inserted,
            knowledgeCreated: report.knowledge.inserted,
            conflictsCount: report.users.conflicts.length + report.agents.conflicts.length + report.calls.conflicts.length + report.knowledge.conflicts.length,
            finishedAt: new Date(),
            reportJson: JSON.stringify(finalReport)
          }
        });
      });

      console.log('\n==================================================');
      console.log('         MIGRATION EXECUTED SUCCESSFULLY          ');
      console.log('==================================================');
      console.log(`- Users inserted: ${report.users.inserted}`);
      console.log(`- Agents inserted: ${report.agents.inserted}`);
      console.log(`- Calls inserted: ${report.calls.inserted}`);
      console.log(`- Knowledge items inserted: ${report.knowledge.inserted}`);
      console.log('==================================================');

    } catch (transactionError) {
      console.error('\nDatabase write transaction failed! Rolling back Postgres changes...');
      
      // Step 3: Outside the transaction, update the MigrationRun record to failed
      try {
        await prisma.migrationRun.update({
          where: { id: dbMigrationRun.id },
          data: {
            status: 'failed',
            finishedAt: new Date(),
            errorMessage: 'Database write transaction failed: ' + transactionError.message
          }
        });
        console.log(`Updated MigrationRun log status to "failed".`);
      } catch (logError) {
        console.error('Failed to log transaction error in MigrationRun table:', logError.message);
      }
      
      process.exit(1);
    }

  } catch (error) {
    console.error('\nMigration execution failed with error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

main();
