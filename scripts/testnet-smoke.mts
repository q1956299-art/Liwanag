import { chromium } from '@playwright/test';
import {
  approveOnce,
  cleanup,
  launchWithFreighter,
  onboardFreighter,
  switchToTestnet,
} from '../../../shared/freighter/freighter-fixture';

const PROD = process.env.SMOKE_BASE_URL ?? 'https://liwanag-stellar.vercel.app';
const CAMPAIGN_ID = process.env.SMOKE_CAMPAIGN_ID ?? '';

if (!CAMPAIGN_ID) {
  console.error('SMOKE_CAMPAIGN_ID required (active XLM campaign id on prod testnet).');
  process.exit(2);
}

async function main() {
  if (!process.env.CI && !process.env.HEADED) {
    console.error('Run under xvfb: xvfb-run -a npx tsx scripts/testnet-smoke.mts');
    process.exit(2);
  }

  const launched = await launchWithFreighter(chromium);
  const { context, userDataDir } = launched;
  try {
    await onboardFreighter(context);
    await switchToTestnet(context);

    const page = await context.newPage();
    await page.goto(`${PROD}/campaigns/${CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    const donateBtn = page.getByRole('button', { name: /donate/i }).first();
    await donateBtn.waitFor({ timeout: 30_000 });
    await donateBtn.click();

    const amountInput = page.getByLabel(/amount/i).first();
    await amountInput.waitFor({ timeout: 10_000 });
    await amountInput.fill('1');

    const confirmBtn = page.getByRole('button', { name: /confirm/i }).first();
    await confirmBtn.click();

    const approved = await approveOnce(context, { timeout: 20_000 });
    if (!approved) {
      throw new Error('Freighter approval popup not detected');
    }

    const txLink = await page
      .locator('a[href*="stellar.expert/explorer/testnet"]')
      .first()
      .waitFor({ timeout: 60_000 })
      .then((el) => el.getAttribute('href'))
      .catch(() => null);
    if (!txLink) throw new Error('No stellar.expert tx link surfaced');

    console.log(JSON.stringify({ ok: true, txLink }));
  } finally {
    await cleanup(context, userDataDir);
  }
}

main().catch(async (err) => {
  console.error('SMOKE_FAIL:', err instanceof Error ? err.message : String(err));
  await new Promise((r) => setTimeout(r, 500));
  process.exit(1);
});