# EventHub — Test Scenarios

Generated: 2026-05-22
Scope: Booking Management + Event Management

---

## Happy Path

### TC-001: View bookings list with existing bookings
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has at least one confirmed booking
**Steps**:
1. Navigate to `/bookings`
2. Observe the list of booking cards rendered
**Expected Results**: Each booking card displays booking reference, event name, quantity, total price, and "View Details" link
**Business Rule**: Flow 4 — Manage Bookings
**Suggested Layer**: E2E

---

### TC-002: View single booking detail page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has at least one confirmed booking
**Steps**:
1. Navigate to `/bookings`
2. Click "View Details" on any booking card
3. Observe the booking detail page at `/bookings/:id`
**Expected Results**: Page shows event details (title, date, venue, city, category), customer details (name, email, phone), payment summary (quantity, price per ticket, total paid), booking reference in breadcrumb and header, booking ID, and "Check eligibility for refund?" link
**Business Rule**: Booking model fields; Flow 4
**Suggested Layer**: E2E

---

### TC-003: Cancel a single booking from the detail page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has at least one confirmed booking
**Steps**:
1. Navigate to `/bookings/:id`
2. Click "Cancel Booking" button
3. Confirm in the dialog by clicking "Yes, cancel it"
4. Observe redirect and bookings list
**Expected Results**: Success toast "Booking cancelled successfully" appears; user is redirected to `/bookings`; cancelled booking no longer appears in the list
**Business Rule**: Booking cancellation deletes the record; seats released for dynamic events
**Suggested Layer**: E2E

---

### TC-004: Clear all bookings from the bookings list page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has at least one booking
**Steps**:
1. Navigate to `/bookings`
2. Click "Clear all bookings" link
3. Confirm the browser confirm dialog
4. Observe the page after clearing
**Expected Results**: All bookings are removed; page shows empty state "No bookings yet" with "Browse Events" button
**Business Rule**: `DELETE /api/bookings` clears all user bookings; `clearAllBookings` service method
**Suggested Layer**: E2E

---

### TC-005: Navigate back to bookings list from detail page
**Category**: Happy Path
**Priority**: P2
**Preconditions**: User is on a booking detail page
**Steps**:
1. Click "← Back to My Bookings" button at bottom of detail page
**Expected Results**: User is navigated to `/bookings`
**Business Rule**: UI navigation flow
**Suggested Layer**: E2E

---

### TC-006: Navigate to bookings via "View My Bookings" after completing a booking
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User just completed a booking (confirmation card shown)
**Steps**:
1. After booking confirmation, click "View My Bookings" link
2. Observe the bookings page
**Expected Results**: User lands on `/bookings` and the newly created booking appears in the list
**Business Rule**: Flow 3 → Flow 4 navigation
**Suggested Layer**: E2E

---

### TC-007: Lookup booking by reference via API
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User is authenticated; user has a booking with known `bookingRef`
**Steps**:
1. Send `GET /api/bookings/ref/:ref` with valid JWT and own booking ref
**Expected Results**: 200 response with full booking data including nested event
**Business Rule**: `GET /api/bookings/ref/:ref` endpoint
**Suggested Layer**: API

---

## Business Rules

### TC-100: FIFO pruning — 10th booking replaces oldest booking from a different event
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has exactly 9 bookings (all for different events); user has JWT token
**Steps**:
1. Note the oldest booking ID
2. Create a new booking (10th) for a different event via `POST /api/bookings`
3. Retrieve all user bookings
**Expected Results**: Total booking count remains 9; the oldest booking is deleted; the new booking is present
**Business Rule**: Max 9 bookings per user; FIFO pruning prefers deleting from a different event
**Suggested Layer**: API

---

### TC-101: FIFO pruning — same-event fallback permanently burns a seat
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User has exactly 9 bookings all for the SAME event; enough seats remain
**Steps**:
1. Create a 10th booking for the same event
2. Retrieve the event's available seats
**Expected Results**: Oldest booking is deleted; new booking is created; `availableSeats` decremented by the new booking's quantity (seat permanently burned via `decrementSeats`)
**Business Rule**: `sameEventFallback` path in `bookingService.createBooking`
**Suggested Layer**: API

---

### TC-102: Booking reference first character matches event title first character
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User is logged in; event with known title exists (e.g., "Tech Conference Bangalore")
**Steps**:
1. Book the event
2. Read the `bookingRef` from the confirmation card or API response
**Expected Results**: `bookingRef` starts with the uppercase first character of the event title (e.g., "T-XXXXXX" for "Tech Conference")
**Business Rule**: `randomRef` function: prefix = `eventTitle[0].toUpperCase()`; Rule 7
**Suggested Layer**: E2E / API

---

### TC-103: Refund eligibility — single ticket booking is eligible
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has a booking with quantity = 1
**Steps**:
1. Navigate to `/bookings/:id` for the single-ticket booking
2. Click "Check eligibility for refund?"
3. Wait for spinner to disappear (4 seconds)
4. Read the refund result
**Expected Results**: `#refund-result` shows green "Eligible for refund. Single-ticket bookings qualify for a full refund."
**Business Rule**: Rule 8 — quantity === 1 → eligible
**Suggested Layer**: E2E

---

### TC-104: Refund eligibility — multi-ticket booking is NOT eligible
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has a booking with quantity > 1 (e.g., 3 tickets)
**Steps**:
1. Navigate to `/bookings/:id` for the multi-ticket booking
2. Click "Check eligibility for refund?"
3. Wait for spinner to disappear (4 seconds)
4. Read the refund result
**Expected Results**: `#refund-result` shows red "Not eligible for refund. Group bookings (3 tickets) are non-refundable." with correct quantity displayed
**Business Rule**: Rule 8 — quantity > 1 → not eligible
**Suggested Layer**: E2E

---

### TC-105: Refund eligibility spinner shows for approximately 4 seconds
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User is on a booking detail page
**Steps**:
1. Click "Check eligibility for refund?"
2. Immediately check for spinner
3. Observe when spinner disappears and result appears
**Expected Results**: `#refund-spinner` is visible immediately after clicking; spinner disappears and `#refund-result` appears after ~4 seconds
**Business Rule**: Rule 8 — `setTimeout(..., 4000)` in `RefundEligibility` component
**Suggested Layer**: E2E / Component

---

### TC-106: Total price is calculated as price × quantity
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User books an event with known price
**Steps**:
1. Book an event (e.g., price $1499, quantity 3)
2. View the booking detail page
**Expected Results**: "Total Paid" shows $4,497 (1499 × 3); `totalPrice` in API response equals `event.price × quantity`
**Business Rule**: Rule 9 — `totalPrice = event.price × quantity`
**Suggested Layer**: E2E / API

---

### TC-107: Bookings page shows max 10 bookings per page (pagination)
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User has more than 10 bookings visible in DB (unlikely with limit 9, but relevant for API pagination param)
**Steps**:
1. Send `GET /api/bookings?page=1&limit=10`
**Expected Results**: Response includes `pagination.limit = 10`, `pagination.totalPages`, and `data` array with at most 10 items
**Business Rule**: Rule 4 — max 9 bookings per user; API default limit = 10
**Suggested Layer**: API

---

### TC-108: Cancelling a booking releases seat count for dynamic events (computed)
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User has a dynamic (user-created) event with a booking
**Steps**:
1. Note the current available seats for the event (computed: totalSeats - booked quantities)
2. Cancel the booking for that event
3. Re-fetch the event detail
**Expected Results**: Available seats increase by the cancelled booking's quantity
**Business Rule**: Rule 6 — dynamic events compute seats as `totalSeats - sum(user's booking quantities)`; cancellation removes the booking record
**Suggested Layer**: API / E2E

---

### TC-109: Bookings list shows "Clear all bookings" button whenever bookings exist
**Category**: Business Rule
**Priority**: P2
**Preconditions**: User has at least one booking
**Steps**:
1. Navigate to `/bookings`
2. Look for "Clear all bookings" link
**Expected Results**: "Clear all bookings" link is visible in the top-right of the page header
**Business Rule**: Flow 4 — UI always shows clear option when bookings exist
**Suggested Layer**: E2E / Component

---

## Security

### TC-200: Cross-user booking access returns "Access Denied" (UI)
**Category**: Security
**Priority**: P0
**Preconditions**: Two test accounts exist (rahulshetty1@gmail.com and rahulshetty1@yahoo.com); User A has a booking
**Steps**:
1. Log in as User A, create a booking, note the booking ID
2. Log out (clear localStorage JWT)
3. Log in as User B
4. Navigate to `/bookings/:userA_booking_id`
**Expected Results**: Page shows "Access Denied" title and "You are not authorized to view this booking." description
**Business Rule**: Rule 2 — cross-user access returns 403; frontend renders "Access Denied" on 403 response
**Suggested Layer**: E2E

---

### TC-201: Cross-user booking access returns 403 via API
**Category**: Security
**Priority**: P0
**Preconditions**: User A has a booking; User B has a valid JWT
**Steps**:
1. Send `GET /api/bookings/:userA_booking_id` with User B's JWT
**Expected Results**: HTTP 403; response body contains "You are not authorized to view this booking"
**Business Rule**: `bookingService.getBookingById` — `booking.userId !== userId` → ForbiddenError
**Suggested Layer**: API

---

### TC-202: Cross-user booking cancellation returns 403 via API
**Category**: Security
**Priority**: P0
**Preconditions**: User A has a booking; User B has a valid JWT
**Steps**:
1. Send `DELETE /api/bookings/:userA_booking_id` with User B's JWT
**Expected Results**: HTTP 403; booking is NOT deleted from the database
**Business Rule**: `bookingService.cancelBooking` — `booking.userId !== userId` → ForbiddenError
**Suggested Layer**: API

---

### TC-203: Unauthenticated access to bookings list returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No valid JWT
**Steps**:
1. Send `GET /api/bookings` without Authorization header
**Expected Results**: HTTP 401; "Unauthorized" error message
**Business Rule**: Auth middleware on all `/api/bookings` routes
**Suggested Layer**: API

---

### TC-204: Unauthenticated access to booking detail returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No valid JWT
**Steps**:
1. Send `GET /api/bookings/:id` without Authorization header
**Expected Results**: HTTP 401; "Unauthorized" error message
**Business Rule**: Auth middleware
**Suggested Layer**: API

---

### TC-205: Unauthenticated DELETE /api/bookings returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No valid JWT
**Steps**:
1. Send `DELETE /api/bookings` without Authorization header
**Expected Results**: HTTP 401
**Business Rule**: Auth middleware; `clearAllBookings` requires authenticated user
**Suggested Layer**: API

---

### TC-206: Cross-user booking lookup by ref returns 403
**Category**: Security
**Priority**: P1
**Preconditions**: User A has a booking with known ref; User B has a valid JWT
**Steps**:
1. Send `GET /api/bookings/ref/:userA_ref` with User B's JWT
**Expected Results**: HTTP 403; "You do not own this booking"
**Business Rule**: `bookingService.getBookingByRef` — ownership check
**Suggested Layer**: API

---

## Negative / Error

### TC-300: Navigate to non-existent booking ID shows "Booking not found"
**Category**: Negative
**Priority**: P1
**Preconditions**: User is logged in
**Steps**:
1. Navigate to `/bookings/99999` (ID that does not exist)
**Expected Results**: Page shows "Booking not found" and "This booking doesn't exist or may have been cancelled." with "View My Bookings" button
**Business Rule**: `bookingService.getBookingById` throws NotFoundError → API returns 404; frontend renders not-found empty state
**Suggested Layer**: E2E

---

### TC-301: GET /api/bookings/:id with non-existent ID returns 404
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `GET /api/bookings/99999` with valid JWT
**Expected Results**: HTTP 404; error message "Booking with id 99999 not found"
**Business Rule**: `bookingService.getBookingById` — NotFoundError
**Suggested Layer**: API

---

### TC-302: Create booking with insufficient seats returns 400
**Category**: Negative
**Priority**: P0
**Preconditions**: User is authenticated; event has 0 personal available seats (all booked by this user)
**Steps**:
1. Send `POST /api/bookings` with `quantity: 1` for a fully-booked event
**Expected Results**: HTTP 400; "Only 0 seat(s) available, but 1 requested"
**Business Rule**: `bookingService.createBooking` — `InsufficientSeatsError` when `personalAvailable < quantity`
**Suggested Layer**: API

---

### TC-303: Create booking for non-existent event returns 404
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with `eventId: 99999`
**Expected Results**: HTTP 404; "Event with id 99999 not found"
**Business Rule**: `bookingService.createBooking` — event lookup fails → NotFoundError
**Suggested Layer**: API

---

### TC-304: Create booking with missing required fields returns 400
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with missing `customerName`, `customerEmail`, or `customerPhone`
**Expected Results**: HTTP 400; validation error message listing missing fields
**Business Rule**: Input validators on the bookings route
**Suggested Layer**: API

---

### TC-305: Create booking with quantity = 0 or negative returns 400
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with `quantity: 0`
2. Send `POST /api/bookings` with `quantity: -1`
**Expected Results**: HTTP 400; validation error for both cases
**Business Rule**: quantity must be 1–10 per booking model
**Suggested Layer**: API

---

### TC-306: Create booking with quantity > 10 returns 400
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with `quantity: 11`
**Expected Results**: HTTP 400; validation error
**Business Rule**: quantity must be 1–10
**Suggested Layer**: API

---

### TC-307: Cancel a booking that has already been cancelled returns 404
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated; a booking exists
**Steps**:
1. Delete the booking via `DELETE /api/bookings/:id`
2. Attempt to delete the same booking again
**Expected Results**: HTTP 404; "Booking with id X not found"
**Business Rule**: `cancelBooking` uses `bookingRepository.findById` — not found after deletion
**Suggested Layer**: API

---

### TC-308: Bookings page shows error state when server is unreachable
**Category**: Negative
**Priority**: P2
**Preconditions**: Backend server is down or returns 500
**Steps**:
1. Navigate to `/bookings` with backend unavailable
**Expected Results**: Error empty state renders: "Couldn't load bookings", "Failed to connect to the server. Please try again.", and a "Retry" button
**Business Rule**: `isError` branch in `BookingsContent` component
**Suggested Layer**: Component / E2E

---

## Edge Cases

### TC-400: Exactly 9 bookings — adding a 10th prunes oldest from a DIFFERENT event (preferred)
**Category**: Edge Case
**Priority**: P0
**Preconditions**: User has exactly 9 bookings across multiple events
**Steps**:
1. Note the ID of the oldest booking (different event from the new booking's event)
2. Create a new (10th) booking for Event X
3. Check the bookings list
**Expected Results**: Count stays at 9; oldest booking (different event) is gone; new booking is present
**Business Rule**: `findOldestUserBookingExcludingEvent` preferential pruning in `bookingService.createBooking`
**Suggested Layer**: API

---

### TC-401: Exactly 9 bookings all from same event — 10th triggers same-event fallback and burns seat
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User has 9 bookings all for Event X
**Steps**:
1. Create a new booking for Event X (10th)
2. Re-fetch Event X's available seats
**Expected Results**: Oldest booking removed; new booking created; `availableSeats` is permanently decremented by the new quantity (seat burned via `eventRepository.decrementSeats`)
**Business Rule**: `sameEventFallback = true` → `decrementSeats` called in `bookingService.createBooking`
**Suggested Layer**: API

---

### TC-402: Booking with quantity = 1 (minimum) — full happy path
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User is logged in; event has available seats
**Steps**:
1. Navigate to event detail page
2. Leave quantity at 1 (default minimum)
3. Fill customer form and confirm booking
**Expected Results**: Booking created with `quantity: 1`; `totalPrice = price × 1`; booking ref generated
**Business Rule**: quantity boundary: 1 is minimum
**Suggested Layer**: E2E

---

### TC-403: Booking with quantity = 10 (maximum)
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User is logged in; event has >= 10 available seats
**Steps**:
1. Navigate to event detail; click "+" 9 times to reach quantity 10
2. Fill form and confirm booking
**Expected Results**: Booking created with `quantity: 10`; `totalPrice = price × 10`; increment button disabled at 10
**Business Rule**: quantity boundary: 10 is maximum; UI should prevent going above 10
**Suggested Layer**: E2E

---

### TC-404: Refund eligibility boundary — quantity = 2 is NOT eligible (just above threshold)
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User has a booking with quantity = 2
**Steps**:
1. Navigate to booking detail
2. Click "Check eligibility for refund?"
3. Wait 4 seconds
**Expected Results**: Result shows "Not eligible for refund. Group bookings (2 tickets) are non-refundable."
**Business Rule**: Rule 8 — threshold is quantity === 1; quantity = 2 is the first ineligible value
**Suggested Layer**: E2E

---

### TC-405: Booking reference uniqueness — collision retry mechanism
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Many bookings exist with the same event title prefix (stress scenario)
**Steps**:
1. Create many bookings for events starting with the same letter
2. Verify each `bookingRef` is unique in DB
**Expected Results**: All booking references are unique; no duplicates; fallback timestamp-based ref used after 10 failed attempts
**Business Rule**: `generateUniqueRef` — up to 10 retries, then timestamp fallback
**Suggested Layer**: Unit

---

### TC-406: Clear all bookings when only one booking exists
**Category**: Edge Case
**Priority**: P2
**Preconditions**: User has exactly 1 booking
**Steps**:
1. Navigate to `/bookings`
2. Click "Clear all bookings" and confirm
**Expected Results**: Booking is deleted; page shows empty state; `DELETE /api/bookings` returns `{ deleted: 1 }`
**Business Rule**: `clearAllBookings` — `deleteAllForUser` returns count of deleted records
**Suggested Layer**: E2E / API

---

### TC-407: Pagination on bookings list (API) — page 2 with partial results
**Category**: Edge Case
**Priority**: P2
**Preconditions**: User has more than the default page limit of bookings visible in API
**Steps**:
1. Send `GET /api/bookings?page=2&limit=5`
**Expected Results**: Returns page 2 results; `pagination.page = 2`; `data` array contains at most 5 items
**Business Rule**: Pagination behavior in `bookingService.getBookings`
**Suggested Layer**: API

---

### TC-408: Event title starting with a number — booking ref prefix is uppercase of that character
**Category**: Edge Case
**Priority**: P2
**Preconditions**: An event exists whose title starts with a digit (e.g., "100 Days Festival")
**Steps**:
1. Book the event
2. Check the `bookingRef`
**Expected Results**: `bookingRef` starts with "1-XXXXXX" (digit is used as-is, `toUpperCase()` has no effect on digits)
**Business Rule**: `randomRef` — `prefix = (eventTitle?.[0] ?? 'E').toUpperCase()`
**Suggested Layer**: API / Unit

---

## UI State

### TC-500: Bookings list shows skeleton loading state while fetching
**Category**: UI State
**Priority**: P1
**Preconditions**: User navigates to `/bookings` (slow network or first load)
**Steps**:
1. Navigate to `/bookings` with throttled network
2. Observe the page before data loads
**Expected Results**: 5 `BookingCardSkeleton` placeholders are shown while `isLoading = true`; no real booking data yet
**Business Rule**: `isLoading` branch in `BookingsContent`
**Suggested Layer**: Component / E2E

---

### TC-501: Bookings list shows empty state when user has no bookings
**Category**: UI State
**Priority**: P1
**Preconditions**: User is logged in with zero bookings
**Steps**:
1. Navigate to `/bookings`
**Expected Results**: Empty state renders with "No bookings yet", "You haven't booked any events yet..." description, and "Browse Events" button linking to `/events`
**Business Rule**: `bookings.length === 0` branch in `BookingsContent`
**Suggested Layer**: E2E / Component

---

### TC-502: Booking detail page shows loading spinner while fetching
**Category**: UI State
**Priority**: P2
**Preconditions**: User navigates to `/bookings/:id` on slow network
**Steps**:
1. Navigate to `/bookings/:id` with throttled network
2. Observe the page before data loads
**Expected Results**: Full-screen spinner (`Spinner size="lg"`) is visible while `isLoading = true`
**Business Rule**: `isLoading` branch in `BookingDetailPage`
**Suggested Layer**: Component

---

### TC-503: Cancel booking confirmation dialog appears before deletion
**Category**: UI State
**Priority**: P0
**Preconditions**: User is on a booking detail page
**Steps**:
1. Click "Cancel Booking" button
2. Observe dialog
**Expected Results**: `ConfirmDialog` appears with title "Cancel this booking?", description mentioning the booking ref and seat count, "Yes, cancel it" and close buttons
**Business Rule**: Two-step confirmation prevents accidental cancellations
**Suggested Layer**: E2E / Component

---

### TC-504: Cancel booking dialog close without confirming does NOT cancel
**Category**: UI State
**Priority**: P1
**Preconditions**: User is on a booking detail page
**Steps**:
1. Click "Cancel Booking"
2. Click the close/dismiss button on the dialog (not "Yes, cancel it")
3. Observe booking status
**Expected Results**: Dialog closes; booking remains in the list; no API call made
**Business Rule**: `onClose` sets `confirm = false`; `handleCancel` only runs on confirm
**Suggested Layer**: E2E

---

### TC-505: Booking detail breadcrumb displays the booking reference
**Category**: UI State
**Priority**: P2
**Preconditions**: User navigates to a valid booking detail page
**Steps**:
1. Navigate to `/bookings/:id`
2. Observe the breadcrumb nav at the top
**Expected Results**: Breadcrumb shows "My Bookings / {bookingRef}" where bookingRef is in monospace font
**Business Rule**: Breadcrumb uses `booking.bookingRef`
**Suggested Layer**: E2E

---

### TC-506: Cancel booking success — toast and redirect
**Category**: UI State
**Priority**: P0
**Preconditions**: User confirms booking cancellation
**Steps**:
1. Confirm cancellation in the dialog
2. Observe page transition and notifications
**Expected Results**: Success toast "Booking cancelled successfully" appears; user is redirected to `/bookings`
**Business Rule**: `onSuccess` callback in `handleCancel`
**Suggested Layer**: E2E

---

### TC-507: "Clear all bookings" button shows "Clearing..." while in progress
**Category**: UI State
**Priority**: P2
**Preconditions**: User has bookings; network is slow
**Steps**:
1. Click "Clear all bookings" and confirm dialog
2. Observe the button state while request is in flight
**Expected Results**: Button text changes to "Clearing…" and is disabled (`disabled:opacity-50`) during the API call
**Business Rule**: `clearing` state variable in `BookingsContent`
**Suggested Layer**: Component / E2E

---

### TC-508: Refund eligibility — "Check eligibility" button hidden after result shown
**Category**: UI State
**Priority**: P2
**Preconditions**: User is on a booking detail page in idle refund state
**Steps**:
1. Click "Check eligibility for refund?"
2. Wait for result to appear
**Expected Results**: After status transitions from "idle" → "checking" → "eligible/ineligible", the initial button is no longer visible; spinner replaces it during check; result card replaces spinner after 4 seconds
**Business Rule**: `RefundEligibility` component status state machine: idle → checking → eligible/ineligible
**Suggested Layer**: E2E / Component

---

### TC-509: Booking detail shows "Access Denied" state for 403 errors
**Category**: UI State
**Priority**: P0
**Preconditions**: Another user's booking ID is known
**Steps**:
1. Log in as User B
2. Navigate to `/bookings/:userA_booking_id`
3. Observe the rendered state
**Expected Results**: `EmptyState` with title "Access Denied" and description "You are not authorized to view this booking." renders (not "Booking not found")
**Business Rule**: Frontend checks `error.status === 403` to differentiate Access Denied vs Not Found
**Suggested Layer**: E2E

---

### TC-510: Bookings page pagination UI renders when total exceeds page size
**Category**: UI State
**Priority**: P2
**Preconditions**: API returns `pagination.totalPages > 1`
**Steps**:
1. Navigate to `/bookings` with enough bookings to trigger multi-page response
2. Observe pagination controls
**Expected Results**: `Pagination` component renders with correct `currentPage` and `totalPages`; clicking next page updates URL `?page=N` and loads next page of bookings
**Business Rule**: Pagination in `BookingsContent` driven by `pagination` from API response
**Suggested Layer**: E2E / Component

---
---

# Event Management Test Scenarios

Scope: Event Management (Flow 2 — Browse/Filter, Flow 5 — Admin CRUD, Seat Management)

---

## Happy Path

### TC-E01: Create a new event via admin form
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has fewer than 6 dynamic events
**Steps**:
1. Navigate to `/admin/events`
2. Fill title, category, city, venue, date (future), price, total seats
3. Click "+ Add Event"
**Expected Results**: Success toast "Event created!" appears; event row appears in the admin table with correct title, category, city, date, price, and seats
**Business Rule**: Flow 5 — Admin Manage Events; `POST /api/events`
**Suggested Layer**: E2E

---

### TC-E02: Created event appears on browse events page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User just created a new event
**Steps**:
1. Navigate to `/events`
2. Locate the event card by title
**Expected Results**: Event card shows title, venue, city, price, available seats, and "Book Now" button
**Business Rule**: Flow 2 — Browse Events; `GET /api/events` returns user's dynamic events
**Suggested Layer**: E2E

---

### TC-E03: Event detail page shows all event information
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; a user-created event exists
**Steps**:
1. Navigate to `/events`
2. Click on event title to go to detail page
3. Observe all sections
**Expected Results**: Page shows title (h1), category badge, date, time, venue, city, available seats/total seats, price per ticket, booking form with quantity selector (default 1), customer fields, and "Confirm Booking" button
**Business Rule**: Flow 3 — event detail structure; `GET /api/events/:id`
**Suggested Layer**: E2E

---

### TC-E04: Filter events by category
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User is logged in; events of various categories exist
**Steps**:
1. Navigate to `/events`
2. Select a category (e.g., "Festival") from the category dropdown
3. Observe filtered results
**Expected Results**: Only events matching the selected category are displayed; URL updates with `?category=Festival`
**Business Rule**: Flow 2 — filter by category; `GET /api/events?category=Festival`
**Suggested Layer**: E2E

---

### TC-E05: Filter events by city
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User is logged in; events in various cities exist
**Steps**:
1. Navigate to `/events`
2. Select a city from the city dropdown
3. Observe filtered results
**Expected Results**: Only events in the selected city are displayed; URL updates with `?city=CityName`
**Business Rule**: Flow 2 — filter by city; `GET /api/events?city=CityName`
**Suggested Layer**: E2E

---

### TC-E06: Search events by title/venue keyword
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User is logged in; known event title exists
**Steps**:
1. Navigate to `/events`
2. Type a keyword in the search box
3. Wait for debounced results (300ms)
**Expected Results**: Filtered results contain only events matching the keyword in title, description, or venue; URL updates with `?search=keyword`
**Business Rule**: Flow 2 — search; backend searches title, description, venue fields
**Suggested Layer**: E2E

---

### TC-E07: Delete a user-created event from admin page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User has at least one dynamic event
**Steps**:
1. Navigate to `/admin/events`
2. Click "Delete" on a user event row
3. Confirm in the "Delete this event?" dialog
**Expected Results**: Toast "Event deleted" appears; event row disappears from table; `DELETE /api/events/:id` succeeds
**Business Rule**: Flow 5 — delete event; cascade deletes associated bookings
**Suggested Layer**: E2E

---

### TC-E08: Edit an existing event title
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User has at least one dynamic event
**Steps**:
1. Navigate to `/admin/events`
2. Click "Edit" on a user event row
3. Form switches to edit mode (heading shows "Edit Event")
4. Update the title and click submit
**Expected Results**: Toast "Event updated!" appears; updated title is reflected in the events table
**Business Rule**: Flow 5 — edit event; `PUT /api/events/:id`
**Suggested Layer**: E2E

---

### TC-E09: Browse events with pagination
**Category**: Happy Path
**Priority**: P2
**Preconditions**: More than 12 events exist (static + user-created)
**Steps**:
1. Navigate to `/events`
2. Observe pagination controls at bottom
3. Click next page
**Expected Results**: URL updates with `?page=2`; next page of events loads; pagination shows current page
**Business Rule**: Flow 2 — paginate (12 events per page); `GET /api/events?page=2&limit=12`
**Suggested Layer**: E2E

---

## Business Rules

### TC-E100: FIFO pruning — 7th event replaces oldest dynamic event
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has exactly 6 dynamic events
**Steps**:
1. Note the oldest event title
2. Create a new (7th) event via admin form or API
3. Retrieve user events
**Expected Results**: Total user dynamic event count remains 6; oldest event is deleted; new event is present
**Business Rule**: Rule 3 — Max 6 user-created events; FIFO replacement; `MAX_USER_DYNAMIC_EVENTS = 6`
**Suggested Layer**: API / E2E

---

### TC-E101: Static events are not counted toward the 6-event limit
**Category**: Business Rule
**Priority**: P1
**Preconditions**: Multiple static events exist; user has < 6 dynamic events
**Steps**:
1. Verify total event count (static + dynamic) via API
2. Create events until dynamic count reaches 6
3. Verify static events are untouched
**Expected Results**: Static events remain regardless of dynamic event count; `countUserDynamic` only counts `isStatic: false` events
**Business Rule**: Rule 3 — static events excluded from limit
**Suggested Layer**: API

---

### TC-E102: Static events cannot be edited
**Category**: Business Rule
**Priority**: P0
**Preconditions**: A static event exists (isStatic = true)
**Steps**:
1. Send `PUT /api/events/:staticEventId` with updated data
**Expected Results**: HTTP 403; "Cannot modify a static event"
**Business Rule**: Rule 3 — `eventService.updateEvent` checks `event.isStatic`; UI shows "Read-only"
**Suggested Layer**: API

---

### TC-E103: Static events cannot be deleted
**Category**: Business Rule
**Priority**: P0
**Preconditions**: A static event exists
**Steps**:
1. Send `DELETE /api/events/:staticEventId`
**Expected Results**: HTTP 403; "Cannot delete a static event"
**Business Rule**: Rule 3 — `eventService.deleteEvent` checks `event.isStatic`
**Suggested Layer**: API

---

### TC-E104: Per-user seat availability — computed dynamically for user events
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has booked tickets for their own dynamic event
**Steps**:
1. Create event with 20 total seats
2. Book 3 tickets
3. Fetch event detail
**Expected Results**: `availableSeats = 20 - 3 = 17`; different users see full 20 seats for the same event
**Business Rule**: Rule 6 — `withPersonalSeats`: `totalSeats - sum(user's booking quantities)`
**Suggested Layer**: API / E2E

---

### TC-E105: Seat count reduces immediately after booking
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has an event with known available seats
**Steps**:
1. Note available seats on event detail page
2. Book N tickets
3. Return to event detail page
**Expected Results**: Available seats decreased by N immediately
**Business Rule**: Rule 6 — seat computed from active bookings
**Suggested Layer**: E2E

---

### TC-E106: Seat count restores after booking cancellation
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User has a booking for their own dynamic event
**Steps**:
1. Note available seats
2. Cancel the booking
3. Re-fetch event detail
**Expected Results**: Available seats increase by cancelled booking's quantity
**Business Rule**: Rule 6 — cancellation removes booking record, computation returns seats
**Suggested Layer**: E2E / API

---

### TC-E107: Cannot edit another user's event
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User A has a dynamic event; User B has a valid JWT
**Steps**:
1. Send `PUT /api/events/:userA_event_id` with User B's JWT
**Expected Results**: HTTP 403; "You do not own this event"
**Business Rule**: `eventService.updateEvent` — `event.userId !== userId`
**Suggested Layer**: API

---

### TC-E108: Cannot delete another user's event
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User A has a dynamic event; User B has a valid JWT
**Steps**:
1. Send `DELETE /api/events/:userA_event_id` with User B's JWT
**Expected Results**: HTTP 403; "You do not own this event"
**Business Rule**: `eventService.deleteEvent` — `event.userId !== userId`
**Suggested Layer**: API

---

### TC-E109: Deleting an event cascades to its bookings
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User has an event with bookings
**Steps**:
1. Create event, book it, note booking ID
2. Delete the event
3. Attempt to fetch the booking
**Expected Results**: Booking is also deleted (cascade); `GET /api/bookings/:id` returns 404
**Business Rule**: Prisma schema — `onDelete: Cascade` on Booking.event relation
**Suggested Layer**: API

---

## Security

### TC-E200: Unauthenticated access to create event returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No valid JWT
**Steps**:
1. Send `POST /api/events` without Authorization header
**Expected Results**: HTTP 401; "Unauthorized"
**Business Rule**: Auth middleware on all `/api/events` routes
**Suggested Layer**: API

---

### TC-E201: Unauthenticated access to event list returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No valid JWT
**Steps**:
1. Send `GET /api/events` without Authorization header
**Expected Results**: HTTP 401; "Unauthorized"
**Business Rule**: Auth middleware
**Suggested Layer**: API

---

### TC-E202: Unauthenticated delete event returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No valid JWT
**Steps**:
1. Send `DELETE /api/events/:id` without Authorization header
**Expected Results**: HTTP 401; "Unauthorized"
**Business Rule**: Auth middleware
**Suggested Layer**: API

---

### TC-E203: Cross-user event deletion returns 403
**Category**: Security
**Priority**: P0
**Preconditions**: User A owns a dynamic event; User B is authenticated
**Steps**:
1. Send `DELETE /api/events/:userA_event_id` with User B's JWT
**Expected Results**: HTTP 403; "You do not own this event"; event is NOT deleted
**Business Rule**: Ownership check in `eventService.deleteEvent`
**Suggested Layer**: API

---

## Negative / Error

### TC-E300: Create event with missing required fields returns validation error
**Category**: Negative
**Priority**: P1
**Preconditions**: User is logged in
**Steps**:
1. Submit the admin event form with all fields empty
**Expected Results**: Client-side validation errors appear for Title, Venue, City, Event Date, Price, Total Seats
**Business Rule**: `EventForm.validate()` — required field checks
**Suggested Layer**: E2E

---

### TC-E301: Create event with past date shows validation error
**Category**: Negative
**Priority**: P1
**Preconditions**: User is logged in
**Steps**:
1. Fill event form with a date in the past
2. Click "+ Add Event"
**Expected Results**: Validation error "Must be a future date" appears; event is NOT created
**Business Rule**: Client-side: `new Date(eventDate) <= new Date()` → error; Server-side: 400 "Event date must be in the future"
**Suggested Layer**: E2E / API

---

### TC-E302: Create event with price < 0 shows validation error
**Category**: Negative
**Priority**: P2
**Preconditions**: User is logged in
**Steps**:
1. Fill event form with price = -5
2. Click "+ Add Event"
**Expected Results**: Validation error "Enter a valid price (≥ 0)" appears
**Business Rule**: Client-side: `Number(form.price) < 0` → error
**Suggested Layer**: E2E

---

### TC-E303: Create event with total seats < 1 shows validation error
**Category**: Negative
**Priority**: P2
**Preconditions**: User is logged in
**Steps**:
1. Fill event form with total seats = 0
2. Click "+ Add Event"
**Expected Results**: Validation error "Must have at least 1 seat" appears
**Business Rule**: Client-side: `Number(form.totalSeats) < 1` → error
**Suggested Layer**: E2E

---

### TC-E304: Update non-existent event returns 404
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `PUT /api/events/99999` with valid data
**Expected Results**: HTTP 404; "Event with id 99999 not found"
**Business Rule**: `eventService.updateEvent` — `findById` returns null → NotFoundError
**Suggested Layer**: API

---

### TC-E305: Delete non-existent event returns 404
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `DELETE /api/events/99999`
**Expected Results**: HTTP 404; "Event with id 99999 not found"
**Business Rule**: `eventService.deleteEvent` — `findById` returns null → NotFoundError
**Suggested Layer**: API

---

### TC-E306: Search with no matching results shows empty state
**Category**: Negative
**Priority**: P2
**Preconditions**: User is logged in
**Steps**:
1. Navigate to `/events`
2. Type "xyznonexistent123" in search
**Expected Results**: Empty state shows "No events found" with "Try adjusting your filters or search terms" message
**Business Rule**: `events.length === 0` branch in `EventsContent`
**Suggested Layer**: E2E

---

### TC-E307: Filter with no matching results shows empty state
**Category**: Negative
**Priority**: P2
**Preconditions**: User is logged in; no events exist for a particular category+city combo
**Steps**:
1. Navigate to `/events?category=Sports&city=Chennai`
**Expected Results**: Empty state renders with "No events found"
**Business Rule**: Combined filters return empty result set
**Suggested Layer**: E2E

---

## Edge Cases

### TC-E400: Create event with exactly 1 seat (minimum)
**Category**: Edge Case
**Priority**: P2
**Preconditions**: User is logged in
**Steps**:
1. Create event with totalSeats = 1
2. Book 1 ticket
3. Attempt to book again
**Expected Results**: First booking succeeds; event shows "SOLD OUT" on card; booking form shows "Sold Out" disabled button
**Business Rule**: `availableSeats === 0` → sold out state in `EventCard` and `BookingForm`
**Suggested Layer**: E2E

---

### TC-E401: FIFO pruning deletes oldest event's associated bookings
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User has 6 dynamic events; one has bookings
**Steps**:
1. Ensure oldest event has a booking
2. Create a 7th event (triggers FIFO)
3. Verify oldest event and its bookings are deleted
**Expected Results**: Cascade delete removes the event and all its bookings
**Business Rule**: FIFO + Prisma cascade
**Suggested Layer**: API

---

### TC-E402: Event price = 0 (free event)
**Category**: Edge Case
**Priority**: P2
**Preconditions**: User is logged in
**Steps**:
1. Create event with price = 0
2. Book the free event
**Expected Results**: Event card shows "$0" price; booking totalPrice = 0; booking succeeds
**Business Rule**: Price >= 0 is valid; `totalPrice = 0 × quantity = 0`
**Suggested Layer**: E2E / API

---

### TC-E403: Event title with special characters
**Category**: Edge Case
**Priority**: P2
**Preconditions**: User is logged in
**Steps**:
1. Create event with title containing special chars (e.g., "AI & ML: 2026's Top Conference!")
2. View event card and detail page
**Expected Results**: Title displays correctly with all special characters preserved
**Business Rule**: No title sanitization restrictions beyond non-empty
**Suggested Layer**: E2E

---

### TC-E404: Maximum quantity (10) booking on event with exactly 10 seats
**Category**: Edge Case
**Priority**: P1
**Preconditions**: Event has exactly 10 available seats
**Steps**:
1. Navigate to event detail
2. Increment quantity to 10
3. Confirm booking
**Expected Results**: Booking succeeds; event becomes sold out (0 seats remaining); "+" button was disabled at 10
**Business Rule**: `maxQty = Math.min(10, event.availableSeats)`; quantity capped at 10
**Suggested Layer**: E2E

---

### TC-E405: Quantity increment button disabled when max reached
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Event has 5 available seats
**Steps**:
1. Navigate to event detail
2. Click "+" until quantity = 5
3. Observe "+" button state
**Expected Results**: "+" button becomes disabled at 5 (min of 10 and 5); cannot exceed available seats
**Business Rule**: `maxQty = Math.min(10, event.availableSeats)`; button `disabled={form.quantity >= maxQty}`
**Suggested Layer**: E2E

---

### TC-E406: Clear filters button resets all filters
**Category**: Edge Case
**Priority**: P2
**Preconditions**: User has active filters (category, city, or search)
**Steps**:
1. Navigate to `/events?category=Festival&city=Delhi`
2. Click "Clear filters" button
**Expected Results**: URL resets to `/events` (no query params); all events are shown again; dropdowns reset to "All"
**Business Rule**: `clearAll()` in `EventFilters` component
**Suggested Layer**: E2E

---

## UI State

### TC-E500: Events page shows skeleton loading state
**Category**: UI State
**Priority**: P1
**Preconditions**: User navigates to `/events` with slow network
**Steps**:
1. Navigate to `/events` with throttled network
**Expected Results**: 12 `EventCardSkeleton` placeholders render while `isLoading = true`
**Business Rule**: `isLoading` branch in `EventsContent`
**Suggested Layer**: Component

---

### TC-E501: Sandbox warning banner appears when > 5 events are displayed
**Category**: UI State
**Priority**: P1
**Preconditions**: User has more than 5 events visible on events page (10 static events trigger this)
**Steps**:
1. Navigate to `/events`
**Expected Results**: Amber banner appears: "Your sandbox holds up to 9 bookings and you can create up to 6 custom events. When either limit is reached, the oldest entry is automatically replaced."
**Business Rule**: Rule 5 — `events.length > 5` triggers the banner
**Suggested Layer**: E2E

---

### TC-E502: Static events show "Featured" badge and "Read-only" in admin table
**Category**: UI State
**Priority**: P1
**Preconditions**: Static events exist
**Steps**:
1. Navigate to `/admin/events`
2. Observe static event rows
**Expected Results**: Static rows show "Featured" badge in title cell; Actions column shows "Read-only" text; no Edit/Delete buttons
**Business Rule**: `event.isStatic` → conditional rendering
**Suggested Layer**: E2E

---

### TC-E503: Admin form switches to edit mode when Edit button clicked
**Category**: UI State
**Priority**: P1
**Preconditions**: User has a dynamic event in the admin table
**Steps**:
1. Click "Edit" on an event row
2. Observe the form heading and field values
**Expected Results**: Form heading changes to "Edit Event"; fields pre-fill with event data; submit button shows "Update Event"; "Cancel edit" button appears
**Business Rule**: `selectedEvent` state drives edit mode in `AdminEventsPage`
**Suggested Layer**: E2E

---

### TC-E504: Admin form "Cancel edit" returns to create mode
**Category**: UI State
**Priority**: P2
**Preconditions**: User is in edit mode on admin form
**Steps**:
1. Click "Cancel edit" button
**Expected Results**: Form heading returns to "+ New Event"; fields clear; submit button shows "+ Add Event"
**Business Rule**: `clearEdit()` sets `selectedEvent = null`
**Suggested Layer**: E2E

---

### TC-E505: Event detail shows "SOLD OUT" overlay when availableSeats = 0
**Category**: UI State
**Priority**: P1
**Preconditions**: Event has 0 available seats for current user
**Steps**:
1. Navigate to the sold-out event's card on `/events`
**Expected Results**: Card shows dark overlay with "SOLD OUT" badge; "Book Now" button shows "Sold Out" text with disabled styling
**Business Rule**: `soldOut = event.availableSeats === 0`; EventCard conditional rendering
**Suggested Layer**: E2E

---

### TC-E506: Event detail "Confirm Booking" button disabled when sold out
**Category**: UI State
**Priority**: P1
**Preconditions**: User navigates to a sold-out event detail page
**Steps**:
1. Navigate to `/events/:id` where event has 0 available seats
**Expected Results**: Submit button shows "Sold Out" text; button is disabled; form is still visible but non-functional
**Business Rule**: `BookingForm`: `soldOut = event.availableSeats === 0`; button `disabled={soldOut}`
**Suggested Layer**: E2E

---

### TC-E507: Admin events table shows empty state when no events exist
**Category**: UI State
**Priority**: P2
**Preconditions**: User is logged in; user has no dynamic events; API returns only static events or no events
**Steps**:
1. Navigate to `/admin/events`
2. Observe the table area when `events.length === 0`
**Expected Results**: EmptyState renders: "No events yet" with "Create your first event using the form above."
**Business Rule**: `events.length === 0` branch in admin page
**Suggested Layer**: E2E

---

### TC-E508: Event form "6 events" limit warning banner always visible on admin page
**Category**: UI State
**Priority**: P2
**Preconditions**: User navigates to `/admin/events`
**Steps**:
1. Observe the amber warning above the form
**Expected Results**: Banner always shows: "You can add up to 6 events. Once the limit is reached, your oldest event is automatically replaced when you add a new one."
**Business Rule**: Informational banner in `AdminEventsPage` — always rendered
**Suggested Layer**: E2E

---

### TC-E509: Events page error state with retry button
**Category**: UI State
**Priority**: P2
**Preconditions**: Backend is unreachable or returns 500
**Steps**:
1. Navigate to `/events` with backend down
**Expected Results**: EmptyState shows "Couldn't load events" with "There was a problem connecting to the server. Please try again." and "Retry" button
**Business Rule**: `isError` branch in `EventsContent`
**Suggested Layer**: Component / E2E
