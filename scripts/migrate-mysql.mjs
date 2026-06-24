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

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  if (!isDryRun) {
    console.error('Error: This script currently only supports preview mode.');
    console.error('Please run with: node scripts/migrate-mysql.mjs --dry-run');
    process.exit(1);
  }

  // Load MySQL connection parameters from environment variables
  const dbHost = process.env.LEGACY_DB_HOST;
  const dbPort = process.env.LEGACY_DB_PORT || '3306';
  const dbUser = process.env.LEGACY_DB_USER;
  const dbPassword = process.env.LEGACY_DB_PASSWORD;
  const dbName = process.env.LEGACY_DB_NAME;

  console.log('==================================================');
  console.log('    ANINO DATA MIGRATION: LEGACY MYSQL PREVIEW    ');
  console.log('==================================================');
  console.log('Connection Parameters:');
  console.log(`- Host: ${dbHost || '(Not defined)'}`);
  console.log(`- Port: ${dbPort}`);
  console.log(`- User: ${dbUser || '(Not defined)'}`);
  console.log(`- Database: ${dbName || '(Not defined)'}`);

  if (!dbHost || !dbUser || !dbPassword || !dbName) {
    console.error('\nError: Missing database connection variables.');
    console.error('Please define: LEGACY_DB_HOST, LEGACY_DB_USER, LEGACY_DB_PASSWORD, LEGACY_DB_NAME');
    process.exit(1);
  }

  let connection;
  try {
    console.log('\nConnecting to legacy MySQL database (Read-Only mode)...');
    connection = await mysql.createConnection({
      host: dbHost,
      port: parseInt(dbPort, 10),
      user: dbUser,
      password: dbPassword,
      database: dbName
    });

    console.log('Connection established successfully.');
    await connection.execute('SET SESSION TRANSACTION READ ONLY');
    console.log('Session transaction set to READ ONLY.');

    // 1. Fetch legacy accounts
    console.log('\nQuerying legacy accounts...');
    const [accountsRows] = await connection.execute('SELECT id, email, phone, first_name, last_name, balance FROM accounts');
    console.log(`Fetched ${accountsRows.length} accounts.`);

    // 2. Fetch legacy agents
    console.log('Querying legacy agents...');
    const [agentsRows] = await connection.execute('SELECT id, phone_number, name, account, purpose, tone, start_time, end_time, slug, image_url, greeting FROM ai_agents');
    console.log(`Fetched ${agentsRows.length} agents.`);

    // 3. Fetch legacy calls queue
    console.log('Querying legacy calls...');
    const [callsRows] = await connection.execute('SELECT id, agent, number, status, tries, purpose, tone, transcript, recording, retell_call_id, call_status, started_at, ended_at, duration_seconds, error_message, transcription, scheduled_at, last_scheduler_attempt_at FROM calls_queue');
    console.log(`Fetched ${callsRows.length} calls.`);

    // 4. Fetch legacy agent data (knowledge)
    console.log('Querying legacy agent knowledge data...');
    const [knowledgeRows] = await connection.execute('SELECT id, agent, content, link, title FROM agent_data');
    console.log(`Fetched ${knowledgeRows.length} knowledge items.`);

    // --- Start Preview Analysis ---
    console.log('\n==================================================');
    console.log('             MIGRATION FEASIBILITY REPORT          ');
    console.log('==================================================');

    // Filter accounts: Only migrate accounts that have at least one agent
    const legacyAccountIdsWithAgents = new Set(agentsRows.map(a => a.account).filter(Boolean));
    const accountsToMigrate = accountsRows.filter(acc => legacyAccountIdsWithAgents.has(acc.id));
    const skippedAccounts = accountsRows.filter(acc => !legacyAccountIdsWithAgents.has(acc.id));

    console.log(`\n[Accounts Statistics]`);
    console.log(`- Total Accounts: ${accountsRows.length}`);
    console.log(`- Accounts with Agents (Will Migrate): ${accountsToMigrate.length}`);
    console.log(`- Accounts without Agents (Skipped): ${skippedAccounts.length}`);

    // Map account IDs for relationship verification
    const accountIdsSet = new Set(accountsRows.map(acc => acc.id));
    const agentIdsSet = new Set(agentsRows.map(a => a.id));

    const warnings = [];
    const usedSlugs = new Set();
    const agentCallsCount = {};
    const agentKnowledgeCount = {};

    // Initialize counters
    for (const agent of agentsRows) {
      agentCallsCount[agent.id] = 0;
      agentKnowledgeCount[agent.id] = 0;
    }

    // Process calls relationships & stats
    for (const call of callsRows) {
      if (!call.agent) {
        warnings.push(`Warning: Call ID ${call.id} has no agent assigned.`);
        continue;
      }
      if (!agentIdsSet.has(call.agent)) {
        warnings.push(`Warning: Call ID ${call.id} points to non-existent Agent ID ${call.agent}.`);
        continue;
      }
      agentCallsCount[call.agent]++;
    }

    // Process knowledge relationships & stats
    for (const item of knowledgeRows) {
      if (!item.agent) {
        warnings.push(`Warning: Knowledge ID ${item.id} has no agent assigned.`);
        continue;
      }
      if (!agentIdsSet.has(item.agent)) {
        warnings.push(`Warning: Knowledge ID ${item.id} points to non-existent Agent ID ${item.agent}.`);
        continue;
      }
      agentKnowledgeCount[item.agent]++;
    }

    console.log(`\n[Agents and Sub-records Mapping Preview]`);
    for (const agent of agentsRows) {
      const hasAccount = accountIdsSet.has(agent.account);
      if (!hasAccount) {
        warnings.push(`Warning: Agent "${agent.name}" (ID: ${agent.id}) points to non-existent Account ID ${agent.account}.`);
      }

      // Slug generation and collision resolution simulation
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

      console.log(`- Agent: "${agent.name}" (Legacy ID: ${agent.id})`);
      console.log(`  Target Slug: ${slug}`);
      console.log(`  Owner Account ID: ${agent.account || 'NONE'}`);
      console.log(`  Phone Number: ${agent.phone_number || 'NONE'}`);
      console.log(`  Purpose: ${agent.purpose ? agent.purpose.substring(0, 50) + '...' : 'NONE'}`);
      console.log(`  Calls associated: ${agentCallsCount[agent.id]}`);
      console.log(`  Knowledge items: ${agentKnowledgeCount[agent.id]}`);
    }

    // Status Mapping Analysis
    console.log(`\n[Status Mapping Analysis]`);
    const uniqueStatuses = [...new Set(callsRows.map(c => c.status).filter(Boolean))];
    const uniqueCallStatuses = [...new Set(callsRows.map(c => c.call_status).filter(Boolean))];
    
    console.log(`- Unique values in calls_queue.status: [${uniqueStatuses.join(', ')}]`);
    console.log(`- Unique values in calls_queue.call_status: [${uniqueCallStatuses.join(', ')}]`);
    console.log(`- Mapping logic to new ANINO status schema:`);
    for (const s of uniqueStatuses) {
      let mapped = 'unknown';
      if (s === 'completed' || s === 'success') mapped = 'completed';
      else if (s === 'failed' || s === 'error') mapped = 'failed';
      else if (s === 'queued' || s === 'pending') mapped = 'scheduled';
      console.log(`  * Legacy status "${s}" => Maps to ANINO status: "${mapped}"`);
    }

    // Direction analysis
    console.log(`\n[Call Direction Analysis]`);
    console.log(`- Note: The legacy database table 'calls_queue' does not contain a direction field.`);
    console.log(`- All migrated calls direction parameter will be mapped as: "unknown"`);

    // Field Gap Analysis (Unmapped/Missing fields in current Postgres schema)
    console.log(`\n[Schema Gap Analysis (Unmapped Legacy Fields)]`);
    console.log('The following legacy fields have no direct equivalent in the current ANINO Postgres schema:');
    console.log('- Table `accounts`:');
    console.log('  * `balance` (Account balance - Proposed mapping: legacyBalance Decimal?)');
    console.log('- Table `ai_agents`:');
    console.log('  * `image_url` (Avatar image - Proposed mapping: imageUrl String?)');
    console.log('  * `greeting` (Custom greeting - Proposed mapping: greeting String?)');
    console.log('- Table `calls_queue`:');
    console.log('  * `tries` (Retry counts - Proposed mapping: tries Int?)');
    console.log('  * `transcript` (Call transcript - Proposed mapping: transcript String?)');
    console.log('  * `recording` (Audio URL - Proposed mapping: recordingUrl String?)');
    console.log('  * `retell_call_id` (Retell provider ID - Proposed mapping: retellCallId String?)');
    console.log('  * `call_status` (Sub-provider status - Proposed mapping: None, use status mapping)');
    console.log('  * `duration_seconds` (Call duration - Proposed mapping: durationSeconds Int?)');
    console.log('  * `error_message` (Call error log - Proposed mapping: errorMessage String?)');
    console.log('  * `transcription` (Alternate transcript - Proposed mapping: None, merge with transcript)');
    console.log('  * `last_scheduler_attempt_at` (Scheduler log - Proposed mapping: lastSchedulerAttemptAt DateTime?)');
    console.log('- Table `agent_data`:');
    console.log('  * Entire table is unmapped (Proposed mapping: Create new model AgentKnowledge)');

    // Log Warnings / Notices
    console.log(`\n[Warnings & Relationship Issues]`);
    if (warnings.length > 0) {
      for (const warning of warnings) {
        console.log(`  [!] ${warning}`);
      }
    } else {
      console.log('  None detected. Data relations are clean.');
    }

    console.log('\n==================================================');
    console.log('Dry run simulation completed successfully.');
    console.log('No database writes were executed.');
    console.log('==================================================');

  } catch (error) {
    console.error('\nMigration preview failed with error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
