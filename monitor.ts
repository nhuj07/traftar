import { firefox } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

// Configuration
const ACCOUNTS = [
    { url: 'https://replit.com/@thelady34/tor-traffic', profile: 'profile_thelady34_tor_traffic' },
    { url: 'https://replit.com/@butlerruby/traffictorbot', profile: 'profile_butlerruby' },
    { url: 'https://replit.com/@danis81/tor-traffic', profile: 'profile_danis81' },
    { url: 'https://replit.com/@daribha1211/trafficrob', profile: 'profile_daribha1211' },
    { url: 'https://replit.com/@kirta3/trafficjav', profile: 'profile_kirta3' },
    { url: 'https://replit.com/@lewisk7/javtorbot', profile: 'profile_lewisk7' },
    { url: 'https://replit.com/@njncs/tortraf', profile: 'profile_njncs' },
];

const PROFILES_DIR = path.join(__dirname, 'profiles');
const CHECK_INTERVAL_MS = 7 * 60 * 1000; // 7 minutes

async function monitorProject() {
    console.log(`Starting Replit monitor for ${ACCOUNTS.length} accounts.`);

    const statesDir = path.join(PROFILES_DIR, 'states');
    fs.mkdirSync(statesDir, { recursive: true });

    try {
        // Phase 1: Extract storage states from profiles
        console.log("Phase 1: Extracting storage states from profiles...");
        for (const account of ACCOUNTS) {
            const profilePath = path.join(PROFILES_DIR, account.profile);
            const stateFilePath = path.join(statesDir, `${account.profile}_state.json`);

            console.log(`Extracting state for ${account.profile}...`);

            // Prevent "Older version" warning by creating a dummy compatibility.ini
            fs.mkdirSync(profilePath, { recursive: true });
            fs.writeFileSync(path.join(profilePath, 'compatibility.ini'), `[Compatibility]\nLastVersion=148.0.2\n`);

            try {
                const context = await firefox.launchPersistentContext(profilePath, {
                    headless: true, // Run headlessly for extraction
                    args: []
                });

                const page = context.pages()[0] || await context.newPage();

                // Navigate to replit to ensure cookies are active/loaded
                try {
                    await page.goto('https://replit.com', { timeout: 120000 });
                    await page.waitForTimeout(2000);
                } catch (e) {
                    console.log(`[${account.profile}] Navigation to replit.com timed out, saving state anyway.`);
                }

                await context.storageState({ path: stateFilePath });
                console.log(`[${account.profile}] Saved state to ${stateFilePath}`);
                await context.close();
            } catch (error) {
                console.error(`Error extracting state for ${account.profile}:`, error);
            }
        }

        // Phase 2: Start parallel monitor with extracted states
        console.log("\nPhase 2: Starting parallel monitor with extracted states using a single browser...");
        const browser = await firefox.launch({ headless: true });

        const tasks = ACCOUNTS.map(async (account) => {
            const stateFilePath = path.join(statesDir, `${account.profile}_state.json`);

            try {
                // Check if state file exists
                if (!fs.existsSync(stateFilePath)) {
                    console.error(`State file missing for ${account.profile}, skipping.`);
                    return;
                }

                const context = await browser.newContext({ storageState: stateFilePath });
                const page = await context.newPage();
                await page.bringToFront();

                try {
                    await page.goto(account.url, { timeout: 180000 });
                    console.log(`[${account.profile}] Navigated to Replit project.`);

                    await page.waitForTimeout(10000); // Wait for load

                    const runButton = page.locator('button[data-cy="ws-run-btn"]');
                    const stopButton = page.getByRole('button', { name: 'Stop', exact: true });

                    const isRunVisible = await runButton.isVisible();
                    const isRunEnabled = isRunVisible ? await runButton.isEnabled() : false;
                    const isStopVisible = await stopButton.isVisible();

                    console.log(`[${account.profile}] Run button visible: ${isRunVisible}`);
                    console.log(`[${account.profile}] Stop button visible: ${isStopVisible}`);

                    if (isRunVisible && isRunEnabled && !isStopVisible) {
                        console.log(`[${account.profile}] Project appears to be stopped. Clicking "Run"...`);
                        await runButton.click();
                        console.log(`[${account.profile}] Clicked "Run".`);
                        await page.waitForTimeout(5000);
                    } else if (isRunVisible && !isRunEnabled) {
                        console.log(`[${account.profile}] Run button is disabled. Refreshing tab...`);
                        await page.reload();
                        await page.waitForTimeout(60000);
                    } else if (!isRunVisible && !isStopVisible) {
                        console.log(`[${account.profile}] Neither Run nor Stop button found.`);
                    } else {
                        console.log(`[${account.profile}] Project is running.`);
                    }

                    console.log(`[${account.profile}] Starting activity loop (scrolling)...`);

                    // Continuous activity loop
                    while (true) {
                        try {
                            console.log(`[${account.profile}] Activity loop tick...`);
                            // Check if project stopped midway
                            const runButton = page.locator('button[data-cy="ws-run-btn"]');
                            const stopButton = page.getByRole('button', { name: 'Stop', exact: true });

                            const isRunVisible = await runButton.isVisible();
                            const isRunEnabled = isRunVisible ? await runButton.isEnabled() : false;
                            const isStopVisible = await stopButton.isVisible();

                            if (isRunVisible && isRunEnabled && !isStopVisible) {
                                console.log(`[${account.profile}] Project stopped midway. Clicking "Run"...`);
                                await runButton.click();
                                console.log(`[${account.profile}] Clicked "Run".`);
                                await page.waitForTimeout(5000);
                            } else if (isRunVisible && !isRunEnabled) {
                                console.log(`[${account.profile}] Run button is disabled midway. Refreshing tab...`);
                                await page.reload();
                                await page.waitForTimeout(60000);
                            }

                            // Scroll down
                            console.log(`[${account.profile}] Scrolling down...`);
                            await page.evaluate(() => window.scrollBy(0, 300));
                            await page.waitForTimeout(2000);

                            // Scroll up
                            console.log(`[${account.profile}] Scrolling up...`);
                            await page.evaluate(() => window.scrollBy(0, -300));
                            await page.waitForTimeout(2000);

                        } catch (e) {
                            console.error(`[${account.profile}] Error in activity loop:`, e);
                            break;
                        }
                    }

                } catch (error) {
                    console.error(`Error in page interaction for ${account.url}:`, error);
                } finally {
                    console.log(`Closing context for ${account.profile}`);
                    await context.close();
                }
            } catch (error) {
                console.error(`Fatal error in task for ${account.url}:`, error);
            }
        });

        console.log("Waiting for all tasks to run...");
        await Promise.all(tasks);

    } catch (error) {
        console.error('Fatal error in monitor:', error);
    }
}

monitorProject();
