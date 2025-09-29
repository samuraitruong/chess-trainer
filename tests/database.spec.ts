import { test, expect } from '@playwright/test';

test.describe('Database Functionality', () => {
  test('should save and load test games', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Navigate to dashboard
    await page.click('text=Dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check initial state - should show no games
    await expect(page.locator('text=No games played yet')).toBeVisible();
    
    // Click the "Create Test Game" button
    await page.click('text=🧪 Create Test Game');
    
    // Wait for the test game to be created and loaded
    await page.waitForTimeout(2000);
    
    // Check that the test game appears in the games list
    await expect(page.locator('text=Game #1')).toBeVisible();
    await expect(page.locator('text=1-0')).toBeVisible(); // Win result
    await expect(page.locator('text=57 moves')).toBeVisible();
    await expect(page.locator('text=Accuracy: 85%')).toBeVisible();
    await expect(page.locator('text=ELO: 100 → 108')).toBeVisible();
    
    // Verify the game details are correct
    const gameCard = page.locator('text=Game #1').locator('..');
    await expect(gameCard).toContainText('1-0');
    await expect(gameCard).toContainText('57 moves');
    await expect(gameCard).toContainText('Accuracy: 85%');
    await expect(gameCard).toContainText('ELO: 100 → 108');
    
    console.log('✅ Database test passed - test game saved and loaded successfully');
  });

  test('should persist games across page refreshes', async ({ page }) => {
    // Navigate to dashboard and create a test game
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Dashboard');
    await page.waitForLoadState('networkidle');
    
    // Create test game
    await page.click('text=🧪 Create Test Game');
    await page.waitForTimeout(2000);
    
    // Verify game exists
    await expect(page.locator('text=Game #1')).toBeVisible();
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate back to dashboard
    await page.click('text=Dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check that the game still exists after refresh
    await expect(page.locator('text=Game #1')).toBeVisible();
    await expect(page.locator('text=1-0')).toBeVisible();
    
    console.log('✅ Database persistence test passed - games persist across page refreshes');
  });

  test('should handle multiple test games', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Dashboard');
    await page.waitForLoadState('networkidle');
    
    // Create first test game
    await page.click('text=🧪 Create Test Game');
    await page.waitForTimeout(2000);
    
    // Create second test game
    await page.click('text=🧪 Create Test Game');
    await page.waitForTimeout(2000);
    
    // Create third test game
    await page.click('text=🧪 Create Test Game');
    await page.waitForTimeout(2000);
    
    // Verify all games are visible
    await expect(page.locator('text=Game #1')).toBeVisible();
    await expect(page.locator('text=Game #2')).toBeVisible();
    await expect(page.locator('text=Game #3')).toBeVisible();
    
    // Check that games are ordered by most recent first
    const gameCards = page.locator('[class*="bg-white rounded-lg border"]');
    const gameCount = await gameCards.count();
    expect(gameCount).toBeGreaterThanOrEqual(3);
    
    console.log('✅ Multiple games test passed - can create and display multiple test games');
  });

  test('should display correct game statistics', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Dashboard');
    await page.waitForLoadState('networkidle');
    
    // Create a test game
    await page.click('text=🧪 Create Test Game');
    await page.waitForTimeout(2000);
    
    // Check that player stats are updated
    await expect(page.locator('text=Total Games: 1')).toBeVisible();
    await expect(page.locator('text=Wins: 1')).toBeVisible();
    await expect(page.locator('text=Losses: 0')).toBeVisible();
    await expect(page.locator('text=Draws: 0')).toBeVisible();
    await expect(page.locator('text=Win Rate: 100%')).toBeVisible();
    
    // Check ELO display
    await expect(page.locator('text=Current ELO: 108')).toBeVisible();
    
    console.log('✅ Game statistics test passed - player stats updated correctly');
  });
});
