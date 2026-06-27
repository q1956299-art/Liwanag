import path from 'node:path';
import { type BrowserContext, chromium, expect, type Page, test } from '@playwright/test';
import {
  approveOnce,
  cleanup,
  FREIGHTER,
  getExtensionId,
  launchWithFreighter,
  onboardFreighter,
} from '../../../../../shared/freighter/freighter-fixture';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://liwanag-rho.vercel.app';
const SHOTS = path.resolve(process.cwd(), '..', 'screen-shot');
const shot = (name: string) => path.join(SHOTS, name);

test.describe.configure({ mode: 'serial' });

let context: BrowserContext;
let userDataDir: string;

test.beforeAll(async () => {
  const launched = await launchWithFreighter(chromium);
  context = launched.context;
  userDataDir = launched.userDataDir;
  await onboardFreighter(context);
});

test.afterAll(async () => {
  if (context) await cleanup(context, userDataDir);
});

const APPROVAL_ROUTES = ['grant-access', 'sign-transaction', 'sign-auth-entry', 'sign-message'];

function findApprovalPopup(): Page | null {
  const prefix = `chrome-extension://${getExtensionId(context)}`;
  for (const p of context.pages()) {
    if (p.isClosed() || !p.url().startsWith(prefix)) continue;
    if (APPROVAL_ROUTES.some((route) => p.url().includes(route))) return p;
  }
  return null;
}

async function captureApprovalPopup(file: string, ms: number): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const popup = findApprovalPopup();
    if (popup) {
      await popup.waitForTimeout(600);
      await popup.screenshot({ path: file, type: 'jpeg', quality: 85 }).catch(() => {});
      return;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
}

function walletChip(page: Page) {
  return page.getByTestId('wallet-chip');
}

async function approveUntilConnected(page: Page, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await walletChip(page).isVisible().catch(() => false)) return true;
    await approveOnce(context, { timeout: 6_000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
  return walletChip(page).isVisible().catch(() => false);
}

async function connectWallet(page: Page): Promise<void> {
  await page.getByTestId('connect-button').first().click();
  await captureApprovalPopup(shot('02-connect-popup.jpg'), 15_000);
  await approveOnce(context, { timeout: 60_000 }).catch(() => {});
  await captureApprovalPopup(shot('03-sign-challenge.jpg'), 15_000);
  await approveOnce(context, { timeout: 60_000 }).catch(() => {});
  if (await approveUntilConnected(page, 25_000)) return;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (await walletChip(page).isVisible().catch(() => false)) return;
    await page.getByTestId('connect-button').first().click().catch(() => {});
    if (await approveUntilConnected(page, 30_000)) return;
  }
  await expect(walletChip(page)).toBeVisible({ timeout: 15_000 });
}

async function firstActiveCampaignId(page: Page): Promise<string> {
  const res = await page.request.get(`${BASE_URL}/api/campaigns`);
  const campaigns = (await res.json()) as Array<{ id: string; status: string; asset: string }>;
  const active = campaigns.find((c) => c.status === 'active' && c.asset === 'XLM');
  if (!active) throw new Error('No active XLM campaign found on live deployment');
  return active.id;
}

test('real Freighter: connect (SEP-10) + on-chain donation -> real tx hash', async () => {
  test.setTimeout(360_000);
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /brought to the light/i })).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({ path: shot('01-landing.jpg'), type: 'jpeg', quality: 85, fullPage: true });

  await connectWallet(page);
  await expect(walletChip(page)).toBeVisible({ timeout: 15_000 });
  await expect(walletChip(page)).toContainText(FREIGHTER.deployerPublic.slice(0, 4));

  const campaignId = await firstActiveCampaignId(page);
  await page.goto(`${BASE_URL}/donate/${campaignId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Escrowed by the Liwanag campaign contract/i)).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('button', { name: '10', exact: true }).click();
  await page.screenshot({ path: shot('04-donate-form.jpg'), type: 'jpeg', quality: 85, fullPage: true });

  await page.getByRole('button', { name: /^Donate/i }).click();
  await captureApprovalPopup(shot('05-donate-sign.jpg'), 20_000);
  await approveOnce(context, { timeout: 120_000 });

  await expect(page.getByRole('heading', { name: /Donation confirmed/i })).toBeVisible({
    timeout: 120_000,
  });
  const txLink = page.locator('a[href*="stellar.expert/explorer/testnet/tx/"]').first();
  await expect(txLink).toBeVisible({ timeout: 20_000 });
  const href = await txLink.getAttribute('href');
  expect(href).toMatch(/stellar\.expert\/explorer\/testnet\/tx\/[0-9a-f]{64}/);
  await page.screenshot({ path: shot('06-success.jpg'), type: 'jpeg', quality: 85, fullPage: true });

  const txHash = (href ?? '').split('/tx/')[1];
  expect(txHash).toBeTruthy();
  // biome-ignore lint/suspicious/noConsole: surface the real tx hash for the run report
  console.log('CORE_FLOW_TX=' + txHash);

  await page.goto(`${BASE_URL}/stats`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Liwanag in numbers/i })).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: shot('07-stats.jpg'), type: 'jpeg', quality: 85, fullPage: true });
});

test('mobile landing renders', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /brought to the light/i })).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: shot('08-mobile.jpg'), type: 'jpeg', quality: 85, fullPage: true });
});
