import { test, expect } from '@playwright/test';

const BASE_URL = 'https://eventhub.rahulshettyacademy.com';
const USER_EMAIL = 'rahulshetty1@gmail.com';
const USER_PASSWORD = 'Magiclife1!';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('you@email.com').fill(USER_EMAIL);
  await page.getByLabel('Password').fill(USER_PASSWORD);
  await page.locator('#login-btn').click();
  await expect(page.getByRole('link', { name: /Browse Events/i }).first()).toBeVisible();
}

/**
 * Creates an event via the admin form. Returns { title }.
 * Precondition: user must be logged in.
 */
async function createEvent(page, overrides = {}) {
  const title = overrides.title || `Test Event ${Date.now()}`;
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const dateStr = futureDate.toISOString().slice(0, 16);

  await page.goto(`${BASE_URL}/admin/events`);

  await page.locator('#event-title-input').fill(title);
  await page.getByRole('textbox', { name: 'City' }).fill(overrides.city || 'Bangalore');
  await page.getByRole('textbox', { name: 'Venue' }).fill(overrides.venue || 'Test Venue');
  await page.getByRole('textbox', { name: 'Event Date & Time' }).fill(dateStr);
  await page.getByRole('spinbutton', { name: 'Price ($)' }).fill(overrides.price || '100');
  await page.getByRole('spinbutton', { name: 'Total Seats' }).fill(overrides.seats || '50');

  await page.locator('#add-event-btn').click();
  await expect(page.getByText('Event created!')).toBeVisible();
  console.log(`Created event: "${title}"`);
  return { title };
}

/**
 * Deletes all user-created events from admin table.
 * Safe to call when none exist.
 */
async function clearUserEvents(page) {
  await page.goto(`${BASE_URL}/admin/events`);
  const rows = page.getByTestId('event-table-row');

  let deleteBtn = rows.filter({ has: page.getByTestId('delete-event-btn') })
    .first()
    .getByTestId('delete-event-btn');

  while (await deleteBtn.isVisible().catch(() => false)) {
    await deleteBtn.click();
    await expect(page.getByText('Delete this event?')).toBeVisible();
    await page.getByRole('button', { name: 'Delete event' }).click();
    await expect(page.getByText('Event deleted')).toBeVisible();
    // Re-query after DOM update
    deleteBtn = page.getByTestId('event-table-row')
      .filter({ has: page.getByTestId('delete-event-btn') })
      .first()
      .getByTestId('delete-event-btn');
  }
}

// ── Test Suite ─────────────────────────────────────────────────────────────────

test.describe('Event Management — Create, Browse, Filter, Detail', () => {

  // TC-E01 ───────────────────────────────────────────────────────────────────
  test('TC-E01: creates a new event via admin form and verifies it in the table', async ({ page }) => {
    // -- Step 1: Login and clear user events --
    await login(page);
    await clearUserEvents(page);

    // -- Step 2: Create a new event --
    const { title } = await createEvent(page);

    // -- Step 3: Verify event appears in the admin events table --
    const row = page.getByTestId('event-table-row').filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Bangalore');
    await expect(row).toContainText('Conference');
  });

  // TC-E02 ───────────────────────────────────────────────────────────────────
  test('TC-E02: created event appears on browse events page with correct details', async ({ page }) => {
    // -- Step 1: Login and create an event --
    await login(page);
    await clearUserEvents(page);
    const { title } = await createEvent(page, { city: 'Mumbai', venue: 'Gateway Arena' });

    // -- Step 2: Navigate to events browse page --
    await page.goto(`${BASE_URL}/events`);

    // -- Step 3: Verify event card is visible with correct data --
    const card = page.getByTestId('event-card').filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Gateway Arena');
    await expect(card).toContainText('Mumbai');
    await expect(card.getByTestId('book-now-btn')).toBeVisible();
  });

  // TC-E03 ───────────────────────────────────────────────────────────────────
  test('TC-E03: event detail page shows all event information', async ({ page }) => {
    // -- Step 1: Login and create an event --
    await login(page);
    await clearUserEvents(page);
    const { title } = await createEvent(page, {
      city: 'Hyderabad',
      venue: 'HICC Convention Center',
      price: '250',
      seats: '100',
    });

    // -- Step 2: Navigate to events page and click event title --
    await page.goto(`${BASE_URL}/events`);
    const card = page.getByTestId('event-card').filter({ hasText: title });
    await card.locator('h3').click();
    await expect(page).toHaveURL(/\/events\/\d+/);

    // -- Step 3: Verify event details are displayed --
    await expect(page.locator('h1')).toContainText(title);
    await expect(page.getByText('Hyderabad')).toBeVisible();
    await expect(page.getByText('HICC Convention Center')).toBeVisible();
    await expect(page.getByText('$250').first()).toBeVisible();
    await expect(page.getByText('100 / 100 seats')).toBeVisible();

    // -- Step 4: Verify booking form is present --
    await expect(page.getByText('Book Tickets')).toBeVisible();
    await expect(page.locator('#ticket-count')).toHaveText('1');
  });

  // TC-E04 ───────────────────────────────────────────────────────────────────
  test('TC-E04: filters events by category', async ({ page }) => {
    // -- Step 1: Login and navigate to events page with category filter --
    await login(page);
    await page.goto(`${BASE_URL}/events?category=Festival`);

    // -- Step 2: Verify all visible cards show Festival category --
    const cards = page.getByTestId('event-card');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toContainText('Festival');
    }
  });

  // TC-E05 ───────────────────────────────────────────────────────────────────
  test('TC-E05: filters events by city', async ({ page }) => {
    // -- Step 1: Login and navigate to events page with city filter --
    await login(page);
    await page.goto(`${BASE_URL}/events?city=Delhi`);

    // -- Step 2: Verify all visible cards show Delhi --
    const cards = page.getByTestId('event-card');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toContainText('Delhi');
    }
  });

  // TC-E06 ───────────────────────────────────────────────────────────────────
  test('TC-E06: search filters events by title', async ({ page }) => {
    // -- Step 1: Login and navigate to events page with search param --
    await login(page);
    await page.goto(`${BASE_URL}/events?search=Dilli`);

    // -- Step 2: Verify filtered results contain search term --
    const cards = page.getByTestId('event-card');
    await expect(cards.first()).toBeVisible();
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Dilli');
  });

  // TC-E07 ───────────────────────────────────────────────────────────────────
  test('TC-E07: deletes a user-created event from admin page', async ({ page }) => {
    // -- Step 1: Login, clear, and create one event --
    await login(page);
    await clearUserEvents(page);
    const { title } = await createEvent(page);

    // -- Step 2: Verify event row exists --
    const row = page.getByTestId('event-table-row').filter({ hasText: title });
    await expect(row).toBeVisible();

    // -- Step 3: Click Delete button --
    await row.getByTestId('delete-event-btn').click();

    // -- Step 4: Confirm delete dialog --
    await expect(page.getByText('Delete this event?')).toBeVisible();
    await page.getByRole('button', { name: 'Delete event' }).click();

    // -- Step 5: Verify event is removed and toast shows --
    await expect(page.getByText('Event deleted')).toBeVisible();
    await expect(row).not.toBeVisible();
  });

  // TC-E08 ───────────────────────────────────────────────────────────────────
  test('TC-E08: edits an existing event title and verifies update', async ({ page }) => {
    // -- Step 1: Login, clear, and create one event --
    await login(page);
    await clearUserEvents(page);
    const { title } = await createEvent(page);

    // -- Step 2: Click Edit on the event row --
    const row = page.getByTestId('event-table-row').filter({ hasText: title });
    await row.getByTestId('edit-event-btn').click();

    // -- Step 3: Verify form switches to edit mode --
    await expect(page.getByText('Edit Event')).toBeVisible();

    // -- Step 4: Update the title --
    const updatedTitle = `Updated Event ${Date.now()}`;
    await page.locator('#event-title-input').fill(updatedTitle);
    await page.locator('#add-event-btn').click();

    // -- Step 5: Verify update toast and new title in table --
    await expect(page.getByText('Event updated!')).toBeVisible();
    const updatedRow = page.getByTestId('event-table-row').filter({ hasText: updatedTitle });
    await expect(updatedRow).toBeVisible();
  });

  // TC-E09 ───────────────────────────────────────────────────────────────────
  test('TC-E09: static events show as read-only in admin table', async ({ page }) => {
    // -- Step 1: Login and navigate to admin events --
    await login(page);
    await page.goto(`${BASE_URL}/admin/events`);

    // -- Step 2: Find a static event row (marked "Featured") --
    const staticRow = page.getByTestId('event-table-row').filter({ hasText: 'Featured' }).first();
    await expect(staticRow).toBeVisible();

    // -- Step 3: Verify it has "Read-only" text and no Edit/Delete buttons --
    await expect(staticRow).toContainText('Read-only');
    await expect(staticRow.getByTestId('edit-event-btn')).not.toBeVisible();
    await expect(staticRow.getByTestId('delete-event-btn')).not.toBeVisible();
  });

  // TC-E10 ───────────────────────────────────────────────────────────────────
  test('TC-E10: event form validates required fields', async ({ page }) => {
    // -- Step 1: Login and navigate to admin events --
    await login(page);
    await page.goto(`${BASE_URL}/admin/events`);

    // -- Step 2: Submit the empty form --
    await page.locator('#add-event-btn').click();

    // -- Step 3: Verify validation errors appear --
    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page.getByText('Venue is required')).toBeVisible();
    await expect(page.getByText('City is required')).toBeVisible();
    await expect(page.getByText('Event date is required')).toBeVisible();
  });

  // TC-E11 ───────────────────────────────────────────────────────────────────
  test('TC-E11: sandbox banner appears when more than 5 events on events page', async ({ page }) => {
    // -- Step 1: Login --
    await login(page);

    // -- Step 2: Navigate to events page (10 static events + any user events) --
    await page.goto(`${BASE_URL}/events`);

    // -- Step 3: Verify sandbox banner is visible (>5 events triggers it) --
    await expect(page.getByText(/sandbox holds up to/i)).toBeVisible();
  });

  // TC-E12 ───────────────────────────────────────────────────────────────────
  test('TC-E12: seat count reduces after booking a user-created event', async ({ page }) => {
    // -- Step 1: Login, clear, and create event with known seat count --
    await login(page);
    await clearUserEvents(page);
    const { title } = await createEvent(page, { seats: '20' });

    // -- Step 2: Navigate to event detail page --
    await page.goto(`${BASE_URL}/events`);
    const card = page.getByTestId('event-card').filter({ hasText: title });
    await card.getByTestId('book-now-btn').click();
    await expect(page).toHaveURL(/\/events\/\d+/);

    // -- Step 3: Verify initial seats --
    await expect(page.getByText('20 / 20 seats')).toBeVisible();

    // -- Step 4: Book 1 ticket --
    await page.getByLabel('Full Name').fill('Seat Tester');
    await page.locator('#customer-email').fill('seat@test.com');
    await page.getByPlaceholder('+91 98765 43210').fill('9876543210');
    await page.locator('.confirm-booking-btn').click();
    await expect(page.locator('.booking-ref').first()).toBeVisible();

    // -- Step 5: Go back to event detail and verify seat reduced --
    await page.goto(`${BASE_URL}/events`);
    const card2 = page.getByTestId('event-card').filter({ hasText: title });
    await card2.getByTestId('book-now-btn').click();
    await expect(page.getByText('19 / 20 seats')).toBeVisible();
  });
});
