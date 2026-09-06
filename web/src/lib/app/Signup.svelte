<script>
  // @ts-nocheck
  import { onMount, createEventDispatcher } from 'svelte';

  // API base for the Stripe endpoints (Express backend in /Users/dannyliang/Desktop/ims/api.js).
  export let api_domain;
  // Sent the user to the WordPress/WooCommerce login when they already have an account.
  export let website_domain_with_http = '';
  // Stripe PUBLISHABLE key (pk_...) — safe to expose in the browser. Replace the
  // placeholder, or pass it in as a prop.
  export let stripe_publishable_key = 'pk_live_LzoajfdvYbrMVq0O3UnOu66l';
  // Optional: app/WooCommerce user id, if one already exists. Logged-out signups have none.
  export let user_id = null;

  const dispatch = createEventDispatcher();

  let name = '';
  let email = '';
  let mobile = '';
  let password = '';
  let is_monthly = false;                                 // false = yearly (default)
  $: term = is_monthly ? 'monthly' : 'yearly';            // derived; rest of the code uses term

  // Region picker (same idea as #regions-filter-container in +page.svelte): the user
  // nominates which regions they want; we store the comma-delimited list.
  let available_regions = [];
  let selected_regions = [];

  // Pricing copied from /uptest/src/routes/pricing-2026 — keyed by number of regions.
  // (Signup is single-user, so the >1-user 10% discount doesn't apply here.)
  const pricings = {
    1: { yearly_pid: 3691, monthly_pid: 3686, yearly: 550, monthly_per_month: 50 },
    2: { yearly_pid: 2884, monthly_pid: 3550, yearly: 600, monthly_per_month: 60 },
    3: { yearly_pid: 3692, monthly_pid: 3687, yearly: 650, monthly_per_month: 70 },
    4: { yearly_pid: 2906, monthly_pid: 3549, yearly: 700, monthly_per_month: 80 },
    5: { yearly_pid: 2907, monthly_pid: 3548, yearly: 750, monthly_per_month: 90 }
  };

  // Number of selected regions drives the price tier (capped at the 5-region plan).
  $: region_count = Math.min(selected_regions.length, 5);
  $: plan = region_count >= 1 ? pricings[region_count] : null;
  $: monthly_price = plan ? plan.monthly_per_month : 0;
  $: yearly_price = plan ? plan.yearly : 0;
  // TEMP test mode: any @moble.com email is charged $1.00 + $0.10 per region,
  // regardless of monthly/yearly.
  $: is_test_email = (email || '').trim().toLowerCase().endsWith('@moble.com');
  // The price for the chosen billing cycle (what we charge / display).
  $: subscription_price = is_test_email
    ? Math.round((1 + 0.10 * region_count) * 100) / 100
    : (!plan ? 0 : (term === 'yearly' ? yearly_price : (term === 'monthly' ? monthly_price : 0)));
  // Show cents only in test mode (normal plans are whole dollars).
  $: price_display = is_test_email ? subscription_price.toFixed(2) : subscription_price;

  let submitting = false;
  let error_message = '';

  // Stripe.js state
  let stripe = null;
  let cardElement = null;
  let cardEl;                 // the <div> the Card Element mounts into
  let stripe_ready = false;
  let card_error = '';

  $: stripe_configured = stripe_publishable_key && !stripe_publishable_key.startsWith('pk_test_REPLACE');

  function loadStripeJs() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) return resolve(window.Stripe);
      let s = document.querySelector('script[src="https://js.stripe.com/v3/"]');
      if (s) {
        s.addEventListener('load', () => resolve(window.Stripe));
        s.addEventListener('error', reject);
        return;
      }
      s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.async = true;
      s.onload = () => resolve(window.Stripe);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  onMount(async () => {
    // Load the list of regions the user can nominate.
    try {
      const r = await fetch(`${api_domain}/region_name`, {
        method: 'GET',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' }
      });
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) {
          available_regions = data;
          selected_regions = [...data];   // all regions selected by default
        }
      }
    } catch (err) {
      // Non-fatal: the picker just renders empty if regions can't be loaded.
    }

    if (!stripe_configured) return;
    try {
      const Stripe = await loadStripeJs();
      stripe = Stripe(stripe_publishable_key);
      const elements = stripe.elements();
      // One secure Stripe-hosted field for number + expiry + CVC (raw card data never
      // touches our DOM or server).
      cardElement = elements.create('card', {
        hidePostalCode: true,
        style: {
          base: {
            fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", // Stripe's iframe cannot read our CSS variables
            // Use px (not rem): rem inside Stripe's iframe resolves against the
            // iframe root, not our page, so it rendered too small. 11px matches
            // the other inputs (0.6875rem).
            fontSize: '11px',
            fontWeight: '400',
            color: '#2a1b1b',
            // .ElementsApp .InputElement / placeholder — matched to the other inputs.
            '::placeholder': { color: '#aaa', fontSize: '11px', fontWeight: '400' }
          },
          invalid: { color: '#c0392b' }
        }
      });
      cardElement.mount(cardEl);
      cardElement.on('change', (e) => { card_error = e.error ? e.error.message : ''; });
      stripe_ready = true;
    } catch (err) {
      error_message = 'Could not load the secure payment form. Please refresh and try again.';
    }
  });

  function goToLogin(event) {
    event.preventDefault();
    if (website_domain_with_http) {
      window.parent.location.href = website_domain_with_http + '/login';
    }
  }

  // Toggle a region on/off, but never let the user deselect the last one.
  function toggleRegion(region) {
    if (selected_regions.includes(region)) {
      if (selected_regions.length > 1) {
        selected_regions = selected_regions.filter(r => r !== region);
      }
      // else: keep at least one region selected
    } else {
      selected_regions = [...selected_regions, region];
    }
  }

  async function handleSignup() {
    error_message = '';

    if (!name || !email || !mobile || !password || !selected_regions.length || !term) {
      error_message = 'Please fill in all fields and select at least one region.';
      return;
    }
    if (password.length < 8) {
      error_message = 'Password must be at least 8 characters.';
      return;
    }
    if (!stripe || !cardElement) {
      error_message = 'The payment form is not ready yet.';
      return;
    }

    submitting = true;
    try {
      // 1. Create (or reuse) the Stripe customer + a SetupIntent on the backend.
      //    This is where the customer id (cus_xxx) is created and saved to Postgres.
      const intentRes = await fetch(`${api_domain}/stripe/setup-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mobile, regions: selected_regions.join(','), term, price: subscription_price, user_id })
      });
      if (!intentRes.ok) {
        error_message = `Sign up failed: ${await intentRes.text()}`;
        submitting = false;
        return;
      }
      const { customer_id, client_secret } = await intentRes.json();

      // 2. Confirm the SetupIntent — card details go straight to Stripe (3DS/SCA handled here).
      const result = await stripe.confirmCardSetup(client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: { name, email, phone: mobile }
        }
      });
      if (result.error) {
        error_message = result.error.message;
        submitting = false;
        return;
      }

      const payment_method = result.setupIntent.payment_method;

      // 3. Create the Stripe subscription (7-day free trial) with the saved card
      //    as the default payment method. The backend picks the price from the
      //    billing cycle + region count stored at setup-intent time, and also
      //    creates/updates the WordPress account (email + password) so the user
      //    can log in to the main site once the trial is active.
      const subscribeRes = await fetch(`${api_domain}/stripe/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id, payment_method, email, term, regions: selected_regions.join(','), password })
      });
      if (!subscribeRes.ok) {
        error_message = `Your card was saved but the subscription could not be started: ${await subscribeRes.text()}`;
        submitting = false;
        return;
      }
      const subscription = await subscribeRes.json();

      dispatch('success', { customer_id, payment_method, subscription_id: subscription.subscription_id, wp_user_id: subscription.wp_user_id });
      name = email = mobile = password = '';
      is_monthly = false;
      selected_regions = [...available_regions];
      cardElement.clear();
      alert('Sign up successful! Your 7-day free trial has started — your card will be charged when the trial ends.');
    } catch (err) {
      error_message = `Error: ${err.message}`;
    } finally {
      submitting = false;
    }
  }
</script>

<div class="property-container padding-left-widest padding-right-widest relative property-signup-container">
  <div class="row property-details-container padding-top-wide padding-left-wide padding-right-wide padding-bottom overflow-scroll">
    <div class="full">
      <h6><strong>SIGNUP TO VIEW PROPERTY</strong></h6>
    </div>

    <div class="full">

      <form class="signup-form" on:submit|preventDefault={handleSignup}>
        <div class="field">
          <div class="name-row">
            <div>
              <label for="signup-name">Full Name</label>
              <input type="text" id="signup-name" bind:value={name} placeholder="Full name" required />
            </div>
            <div>
              <label for="signup-mobile">Mobile Number</label>
              <input type="tel" id="signup-mobile" bind:value={mobile} placeholder="Mobile number" required />
            </div>
          </div>
        </div>

        <div class="field">
          <label for="signup-email">Email Address</label>
          <input type="email" id="signup-email" bind:value={email} placeholder="Enter your email" required />
        </div>

        <div class="field">
          <label for="signup-password">Password</label>
          <input type="password" id="signup-password" bind:value={password} placeholder="Create a password" minlength="8" autocomplete="new-password" required />
        </div>

        <div class="field">
          <label for="signup-card">Card Details</label>
          <!-- Stripe Card Element (number + expiry + CVC) mounts here. -->
          <div id="signup-card" class="stripe-card" bind:this={cardEl}></div>
          {#if card_error}
            <p class="signup-error">{card_error}</p>
          {:else if !stripe_configured}
            <p class="signup-note">Set your Stripe publishable key to enable secure card entry.</p>
          {:else if !stripe_ready}
            <p class="signup-note">Loading secure card field…</p>
          {/if}
        </div>

        <div class="field">
          <span class="field-label">Regions</span>
          <div class="flex wrap regions-filter">
            {#each available_regions as region}
              <button type="button" class="region-pill" class:active={selected_regions.includes(region)} on:click={() => toggleRegion(region)}>{region}</button>
            {/each}
          </div>
        </div>

        <div class="signup-footer">
          <div class="price-summary">
            <div class="price-info">
              {#if !plan}
                <span class="price-hint">Select at least one region to see your price.</span>
              {:else if term === 'monthly'}
                <div class="price-line">
                  <span class="price-amount">${price_display}</span>
                  <span class="price-period">/ month</span>
                </div>
                <span class="price-sub">{region_count} region{region_count > 1 ? 's' : ''} &middot; 7-day free trial</span>
              {:else}
                <div class="price-line">
                  <span class="price-amount">${price_display}</span>
                  <span class="price-period">/ year</span>
                </div>
                <span class="price-sub">{region_count} region{region_count > 1 ? 's' : ''} &middot; 7-day free trial</span>
              {/if}
            </div>
            <div class="price-toggle">
              <button type="button" on:click={() => is_monthly = !is_monthly} class="toggle-button">
                <span class:active={is_monthly}>Monthly</span>
                <i class={is_monthly ? " icon-toggle-left" : " icon-toggle-right"}></i>
                <span class:active={!is_monthly}>Yearly</span>
              </button>
            </div>
          </div>

          {#if error_message}
            <p class="signup-error">{error_message}</p>
          {/if}

          <button type="submit" class="btn btn-search" class:unclickable={submitting || !stripe_ready}>
            {submitting ? 'Processing…' : 'Sign Up & Start 7-Day Free Trial'}
          </button>

          <p class="login-prompt">Already have an account? <a href="?" class="link" on:click={goToLogin}>Login here</a></p>
        </div>
      </form>
    </div>
  </div>
</div>

<style>
  /* In map view the property panel is a fixed-height overlay, so the signup form
     must scroll inside it (mirrors how .property-other-container scrolls when
     viewing a property). The class is otherwise undefined globally. */
  .overflow-scroll {
    overflow-x: hidden;
  }

  :global(.app.mapview.viewing-property) .overflow-scroll {
    max-height: calc(100vh - 280px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Match the look of the inputs/selects in the +page.svelte search form. */
  .signup-form .field {
    padding-top: 0.6em;
  }

  /* Full Name + Mobile share a row, half each. */
  .name-row {
    display: flex;
    gap: 0.6rem;
  }

  .name-row > div {
    flex: 1;
    min-width: 0;
  }

  label,
  .field-label {
    display: block;
    font-size: 0.6875rem;
    padding-left: 0.4em;
    padding-bottom: 0.2em;
    color: var(--up-c-5c2587);
  }

  input[type="text"],
  input[type="email"],
  input[type="tel"],
  input[type="password"] {
    font-size: 0.6875rem;
    border: 1px solid var(--up-c-cccccc);
    border-radius: 0.4em;
    padding: 1em;
    height: 42px;
    width: 100%;
    box-sizing: border-box;
    background-color: var(--up-c-ffffff-a40);
    font-family: var(--font-family);
    color: var(--up-c-2a1b1b);
  }

  input::placeholder {
    color: var(--up-c-aaaaaa);
  }

  input[type="text"]:focus,
  input[type="email"]:focus,
  input[type="tel"]:focus,
  input[type="password"]:focus,
  input:active {
    box-shadow: none;
    outline: none;
  }

  /* The Stripe Card Element sits inside a box styled like the other inputs. */
  .stripe-card {
    border: 1px solid var(--up-c-cccccc);
    border-radius: 0.4em;
    height: 42px;
    width: 100%;
    box-sizing: border-box;
    background-color: var(--up-c-ffffff-a40);
    padding: 0 1em;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .stripe-card :global(.StripeElement) {
    width: 100%;
  }

  /* Monthly / Yearly toggle — same pattern as the pricing-2026 page. */
  .toggle-button {
    background: none;
    border: 0;
    cursor: pointer;
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    font-family: var(--font-family);
  }

  .toggle-button i {
    font-size: 1.6em;
    color: var(--up-c-5c2587);
  }

  .toggle-button span {
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--up-c-999999);
  }

  .toggle-button span.active {
    color: var(--up-c-5c2587);
  }

  /* Region picker pills — mirrors #regions-filter-container in +page.svelte. */
  .regions-filter {
    margin-top: 0.25em;
  }

  .regions-filter .region-pill {
    color: var(--up-c-5c2587);
    border: 1px solid var(--up-c-5c2587);
    background: none;
    border-radius: 4px;
    font-size: 0.7125rem;
    font-weight: 400;
    padding: calc(0.5 * var(--padding-unit)) calc(0.65 * var(--padding-unit));
    cursor: pointer;
    /* Buttons don't inherit the app's --font-family reliably, so set it explicitly. */
    font-family: var(--font-sans);
    margin-right: 0.25em;
    margin-top: 0.5em;
  }

  .regions-filter .region-pill:hover {
    background-color: var(--up-c-f1e9f7);
    filter: brightness(1.06);
  }

  .regions-filter .region-pill.active {
    color: var(--up-c-f1e9f7);
    background-color: var(--up-c-5c2587);
  }

  /* Live subscription price summary. */
  .price-summary {
    border: 1px solid var(--up-c-5c2587);
    border-radius: 0.4em;
    background-color: var(--color-light-overlay, var(--up-c-ffffff-a40));
    padding: 0.6em 0.8em;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5em;
    flex-wrap: wrap;
  }

  .price-info {
    min-width: 0;
  }

  .price-toggle {
    margin-left: auto;
  }

  .price-line {
    display: flex;
    align-items: baseline;
    gap: 0.35em;
  }

  .price-amount {
    color: var(--up-c-5c2587);
    font-weight: 700;
    font-size: 1.5rem;
    line-height: 1;
  }

  .price-period {
    color: var(--up-c-5c2587);
    font-size: 0.75rem;
  }

  .price-sub {
    display: block;
    color: var(--up-c-777777);
    font-size: 0.6875rem;
    padding-top: 0.25em;
  }

  .price-hint {
    color: var(--up-c-888888);
    font-size: 0.6875rem;
  }

  /* Price box + signup button pinned to the bottom of the scrollable panel,
     always visible while the fields above scroll. Transparent so it blends with
     the form (the price box and button carry their own backgrounds). */
  .signup-footer {
    position: sticky;
    bottom: 0;
    padding: 0.7em 0 0.5em;
    margin-top: 0.6em;
  }

  .signup-footer .price-summary {
    margin-bottom: 0.6em;
  }

  .signup-footer .login-prompt {
    text-align: center;
    padding-top: 0.5em;
    margin-bottom: 0;
  }

  .btn.btn-search {
    background-color: var(--up-c-5c2587);
    color: var(--up-c-f1e9f7);
    border: 0;
    border-radius: 4px;
    padding: calc(1 * var(--padding-unit)) calc(2 * var(--padding-unit));
    text-decoration: none;
    cursor: pointer;
    font-family: var(--font-family);
    font-size: 0.75rem;
    width: 100%;
    text-align: center;
    display: block;
  }

  .btn.btn-search:hover {
    filter: brightness(1.1);
  }

  .signup-error {
    color: var(--up-c-c0392b);
    font-size: 0.6875rem;
    padding: 0.4em 0.4em 0;
  }

  .signup-note {
    color: var(--up-c-888888);
    font-size: 0.6875rem;
    padding: 0.4em 0.4em 0;
  }

  .login-prompt {
    font-size: 0.75rem;
  }
</style>
