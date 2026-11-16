import { expect, test } from '@playwright/test';

test('liens internes avec BASE_PATH=/backlog (project page GitHub Pages)', async ({ page }) => {
  await page.goto('/backlog/');
  await expect(page.getByRole('heading', { name: 'Bibliothèque' })).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/backlog/favicon.svg');

  await page.getByRole('button', { name: '+ Ajouter' }).click();
  await page.getByPlaceholder('Nom du jeu').fill('Test BasePath');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByRole('link', { name: /Test BasePath/ }).click();
  await expect(page.getByRole('heading', { name: 'Test BasePath' })).toBeVisible();
  await expect(page).toHaveURL(/\/backlog\/game\/[^/]+$/);

  await page.getByRole('link', { name: 'Bibliothèque' }).click();
  await expect(page).toHaveURL(/\/backlog\/?$/);

  await page.getByRole('link', { name: 'Paramètres' }).click();
  await expect(page.getByRole('heading', { name: /Paramètres/ })).toBeVisible();
  await expect(page).toHaveURL(/\/backlog\/settings$/);

  await page.getByRole('link', { name: '📊 Stats' }).click();
  await expect(page.getByRole('heading', { name: 'Statistiques' })).toBeVisible();
  await expect(page).toHaveURL(/\/backlog\/stats$/);

  await page.goto('/backlog/picker');
  await expect(page.getByRole('heading', { name: /À quoi je joue ce soir/ })).toBeVisible();
  await expect(page).toHaveURL(/\/backlog\/picker$/);
});
