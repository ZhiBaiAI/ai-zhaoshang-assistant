#!/usr/bin/env -S npx tsx
import { launchBrowser, openCreatorCenter, ensureLoggedIn } from './browser';
import { listSessions, DOUYIN_CREATOR_URL } from './douyin';
import { extractChat } from './extractChat';
import fs from 'fs';

async function testSwitchSessions() {
    const session = await launchBrowser();
    const { page } = session;

    try {
        await openCreatorCenter(page, DOUYIN_CREATOR_URL);
        await ensureLoggedIn(page);

        console.log('Listing sessions...');
        const sessions = await listSessions(page);
        console.log(`Found ${sessions.length} sessions.`);

        for (let i = 0; i < Math.min(sessions.length, 3); i++) {
            const s = sessions[i];
            console.log(`\n--- Processing session ${i+1}: ${s.name} ---`);
            
            // Click to switch
            console.log(`Clicking session: ${s.name}`);
            await s.locator.click();
            
            // Wait for content to update
            console.log('Waiting for chat content to load...');
            await page.waitForTimeout(2000); // Simple wait for now
            
            // Extract
            const result = await extractChat(page);
            console.log(`Extracted ${result.messages.length} messages for ${s.name}`);
            
            // Log first message snippet
            if (result.messages.length > 0) {
                console.log(`Latest message: [${result.messages[0].direction}] ${result.messages[0].text.slice(0, 50)}`);
            }
        }
    } catch (error) {
        console.error('Error during session switching test:', error);
    } finally {
        await session.cleanup();
    }
}

testSwitchSessions();
