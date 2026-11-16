import { expect, test } from '@playwright/test';

test('parcours MVP : ajout de jeu, check-in, marque-page, brouillard de guerre', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bibliothèque' })).toBeVisible();

  await page.getByRole('button', { name: '+ Ajouter' }).click();
  await page.getByPlaceholder('Nom du jeu').fill('Test Game');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByText('Test Game').first().click();
  await expect(page.getByRole('heading', { name: 'Test Game' })).toBeVisible();

  await page.getByRole('button', { name: '+30 min' }).click();
  await expect(page.getByText('30 min')).toBeVisible();

  await page.getByPlaceholder(/Objectif immédiat/).fill('Récupérer l’objet X');
  await page.getByRole('button', { name: 'Enregistrer le marque-page' }).click();
  await expect(page.getByText('Marque-page enregistrée.')).toBeVisible();

  await page.getByPlaceholder('Étape 4').fill('Étape 1');
  await page.getByRole('button', { name: '+ Ajouter un jalon' }).click();
  await page.getByPlaceholder('Étape 4').fill('Étape 2');
  await page.getByRole('button', { name: '+ Ajouter un jalon' }).click();
  await expect(page.getByText('Étape 2 — ???')).toBeVisible();

  await page.getByRole('button', { name: '✓ Valider cette étape' }).click();
  await expect(page.getByText('Jalon validé ✔')).toBeVisible();

  await page.getByPlaceholder('Étape 4').fill('Étape 3');
  await page.getByRole('button', { name: '+ Ajouter un jalon' }).click();

  await expect(page.getByText('Étape 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Étape 3 — ???')).toBeVisible();
});

test('pages stats et picker se chargent', async ({ page }) => {
  await page.goto('/stats');
  await expect(page.getByRole('heading', { name: 'Statistiques' })).toBeVisible();
  await page.goto('/picker');
  await expect(page.getByRole('heading', { name: /À quoi je joue ce soir/ })).toBeVisible();
});
