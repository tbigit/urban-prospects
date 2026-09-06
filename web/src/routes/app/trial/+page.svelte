<script>
  // @ts-nocheck
	import { onMount } from 'svelte';

  let is_ready = false;
  let trial_period = '7';
  let email = '';
  let trial_link = '';
  // /vipN/<email> magic links were WordPress membership URLs. They stop working when
  // the site leaves WordPress; trial creation moves to the new signup flow.
  const TRIAL_LINKS_PAUSED = true;
  const TRIAL_LINKS_NOTICE = 'Trial links are temporarily unavailable while membership moves to the new platform. Ask the team to create the trial from the admin instead.';

  onMount(async () => {
    is_ready = true;
  });

  function _handle_change_trial_period(event) {
    if (email && !TRIAL_LINKS_PAUSED) {
      trial_link = `https://www.urbanprospects.com.au/vip${trial_period}/${email}`;
    } 
    else {
      trial_link = '';
    }
  }

  function _handle_change_email(event) {
    if (email && !TRIAL_LINKS_PAUSED) {
      trial_link = `https://www.urbanprospects.com.au/vip${trial_period}/${email}`;
    } 
    else {
      trial_link = '';
    }
  }

  function _handle_window_keydown(event) {
	  // let keyCode = event.keyCode;
	  let key = event.key;

    if (key == 'Enter') {
      
    }
  }

  function copyTrialLink() {
    if (trial_link) {
      navigator.clipboard.writeText(trial_link)
        .then(() => {
          // Optional: Add feedback for success
          alert('Trial link copied to clipboard!');
        })
        .catch(err => {
          // Optional: Add feedback for error
          alert('Failed to copy link.');
        });
    }
  }
  


</script>


<style>
  

  .app {
    background-color: white;
  } 

  h1, h2, h3, h4, h5, h6 {
    color: var(--up-c-31144d);
    font-family: var(--font-sans);
  }

  h6 {
    color: var(--up-c-5c2587);
  }

  h1 {
    line-height: 0.8em;
  }

  @media all and (min-width: 60em) {  
    h1 {
      font-size: 6em;
      line-height: 0.8em;
    }
  }

  h2 {
    font-size: 5em;
    color: var(--up-c-31144d);
  }

  h3 {
    color: var(--up-c-31144d);
  }

  @media all and (min-width: 60em) {  
    h3 {
      font-size: 1.75rem;
    }
  }

  h3 {
    font-size: 1.5rem;
  }
  @media all and (min-width: 60em) {  
    h3 {
      font-size: 1.5rem;
    }
  }

  p, span, ul, ul li {
    color: var(--up-c-31144d) !important;
    font-size: 0.7125rem;
    font-family: var(--font-family);
  }

  label {
    font-size: 0.75rem;
    padding-right: 0.5em;
  }

  code {
    font-size: 0.6875rem;
    white-space: wrap;
  }

  hr {
    margin: 1em 0;
    height: 1px;
    border: none;
    border-top: 1px solid var(--up-c-f1e9f7);
  }

  .select-container {
    margin-top:0.5em;
  }

  .select-container label {
    padding-left: .4em;
  } 

  .select-container select::placeholder {
    color: var(--up-c-aaaaaa);
  }

  .select-container select {
    font-size: 0.625rem;
		border: 1px solid var(--up-c-f1e9f7);
		border-radius: 0.4em;
    font-weight: 400;
    font-family: var(--font-family);
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    line-height: 1.7em;
    width: 100%;
    display: inline-flex;
    height: 42px;
    margin: auto;
    border-color: var(--up-c-cccccc);
    color: var(--up-c-5c2587);
    padding-left: 0.4em;
    padding-right: 0.4em;
  }

  .listing-container .select-container select {
    height: 27.39px;
  }

  .listing-container input[type="text"] {
    height: 27.39px;
  }

  .select-container select:focus {
    outline: none;
    box-shadow: none;
  }

  .select-container select + .shift-up-more {
    -webkit-transform: translateY(-50%);
    -ms-transform: translateY(-50%);
    transform: translateY(-50%);
  }

  @media all and (min-width: 60em) {
    .select-container select + .shift-up-more {
        -webkit-transform: translateY(-44%);
        -ms-transform: translateY(-44%);
        transform: translateY(-44%);
    }
  }

  .select-container .select-arrow {
      width: 22px;
  }

  :global(.btn) {
    background-color: var(--up-c-ffffff);
    color: var(--up-c-5c2587);
    border: 1px solid var(--up-c-5c2587);
    border-radius: 4px;
    font-size: 0.7125rem;
    font-weight: 400;
    padding: calc(0.5 * var(--padding-unit)) calc(0.75 * var(--padding-unit));
    text-decoration: none;
    cursor: pointer;
    font-family: var(--font-family);
    width: auto;
    display: inline-block;
  }

  :global(.btn:hover) {
    background-color: var(--up-c-f1e9f7);
    filter: brightness(1.06); 
  }

  :global(.btn.active) {
    background-color: var(--up-c-f1e9f7);
  }

  input[type="email"],input[type="text"] {
    margin-top:0.5em;
    width:100%;
    padding: 1.25em 0.25em;
    border-radius:0.4em;
    border: 1px solid var(--up-c-5c2587);
    border-color:var(--up-c-cccccc);
    font-size: 0.625rem;
    font-weight: 400;
    font-family: var(--font-family);
    color: var(--up-c-5c2587);
  }

</style>

<svelte:head>
	<title>Urban Prospects Property Trial</title>
  <script src="https://kit.fontawesome.com/19fda93b05.js" crossorigin="anonymous"></script>
</svelte:head>

<svelte:window on:keydown={_handle_window_keydown}/>

<div class:is-ready={is_ready} class="container app search-app relative mapview" style="--font-family: var(--font-sans);--color-dark-overlay-lightest: var(--up-c-f1e9f7); --thumb-bg: var(--up-c-5c2587); --track-bg: var(--up-c-f1e9f7); --progress-bg: var(--up-c-f1e9f7); --multi-item-bg: var(--up-c-5c2587); --multi-item-color: var(--up-c-ffffff); --clear-icon-color: var(--up-c-ffffff); --multi-select-padding: 0 0 0 0.5em; --item-hover-bg: var(--up-c-f1e9f7); --color-dark: var(--up-c-5c2587); ">

  <div class="container-widest max-grid">
    <div class="container-widest shadow-most border-roundest">
        <div class="padding-bottom-wide">
         <h3>GENERATE TRIAL LINK</h3>
        </div>
        <div class="padding-top-thin padding-bottom-thin border border-thinnest border-bottom border-light">
            <label for="email">Email:</label>
            <input type="email" id="email" required placeholder="Enter Email" bind:value={email} on:input={_handle_change_email}>
        </div>

        <div class="padding-top-thin padding-bottom-thin border border-thinnest border-bottom border-light">
          <label for="period">Trial Period:</label>
          <div class="row select-container relative">
            <select id="period" bind:value={trial_period}  on:change={_handle_change_trial_period}>
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
              <option value="180">180 Days (6 Months)</option>
            </select>
            <div class="absolute center-right select-arrow shift-up-more padding-right-thin unclickable">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#5C2587" d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>
            </div>
          </div>
        </div>

        <div class="padding-top-thin padding-bottom-thin border border-thinnest border-bottom border-light">
          <label for="trial_link">Trial Link:</label>
          <input type="text" id="trial_link" placeholder="https://www.urbanprospects.com.au/vip{trial_period}/{email || 'customer@email.com'}" bind:value={trial_link}>
          {#if TRIAL_LINKS_PAUSED}<p style="margin-top:.6rem;padding:.6rem .8rem;border-radius:.4rem;background:var(--up-c-fff4d6);color:var(--up-c-5a4300);font-size:14px;">{TRIAL_LINKS_NOTICE}</p>{/if}
        </div>

        <div class="padding-top-thin padding-bottom-thin border border-thinnest border-bottom border-light row right">
          <button class="btn" on:click={copyTrialLink}>COPY TRIAL LINK</button>
        </div>
      </div>
    </div>

</div>