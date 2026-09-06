<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'
  import { Editor } from '@tiptap/core'
  import StarterKit from '@tiptap/starter-kit'
  import { TextAlign } from '@tiptap/extension-text-align';

  let element
  let editor

  let is_saving;

  export let user_template;
  export let user_id;

  export let from_first_name;
  export let from_last_name;
  export let from_company_name;
  export let from_address_1;
  export let from_address_2;
  export let from_postcode;
  export let from_city;
  export let from_state;
  export let custom_logo_url;

  
  async function _handle_save_template(event) {
    is_saving = true;
    event.target.innerText = 'SAVING...';
    if (user_id && user_template) {
      const save_template_response = await fetch('https://upapi.imtg.com.au/template', {
        method: 'POST',
        cache: "no-cache",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"user_id": user_id, "template": user_template, "from_first_name": from_first_name, "from_last_name": from_last_name, "from_company_name": from_company_name, "from_address_1": from_address_1, "from_address_2": from_address_2, "from_postcode": from_postcode, "from_city": from_city, "from_state": from_state, "custom_logo_url": custom_logo_url})
      }).then(save_template_response => save_search_response.json()).catch(function(){});

      setTimeout(() => {
        is_saving = false;
        event.target.innerText = 'SAVE TEMPLATE';
      }, 1000);
    } 
  }

  onMount(() => {
    editor = new Editor({
      element: element,
      extensions: [
        StarterKit,
         TextAlign.configure({ types: ['heading', 'paragraph'] })
      ],
      content: user_template,
      onTransaction: () => {
        // force re-render so `editor.isActive` works as expected
        editor = editor
      },
      onUpdate: () => {
        user_template = editor.getHTML();
        // console.log(user_template);
      }
    })
  })

  onDestroy(() => {
    if (editor) {
      editor.destroy()
    }
  })
</script>

<div class="border border-thinnest">
  <h6>From Address</h6>
  <div class="flex wrap padding-top-thin">
    <div class="half padding-right-thin padding-bottom-thinner"><label for="from_first_name">First Name</label> <input type="text" id="from_first_name" bind:value={from_first_name} placeholder="First Name"/></div>
    <div class="half padding-right-thin padding-bottom-thinner"><label for="from_last_name">Last Name</label> <input type="text" id="from_last_name" bind:value={from_last_name} placeholder="Last Name"/></div>
  </div>
  <div class="flex wrap">
    <div class="full padding-right-thin padding-top-thinner padding-bottom-thinner"><label for="from_company_name">Company Name</label> <input type="text" id="from_company_name" bind:value={from_company_name} placeholder="Company Name"/></div>
  </div>
  <div class="flex wrap">
    <div class="half padding-right-thin padding-top-thinner padding-bottom-thinner"><label for="from_address_1">Address 1</label> <input type="text" id="from_address_1" bind:value={from_address_1} placeholder="Address 1"/></div>
    <div class="half padding-right-thin padding-top-thinner padding-bottom-thinner"><label for="from_address_2">Address 2</label> <input type="text" id="from_address_2" bind:value={from_address_2} placeholder="Address 2"/></div>
  </div>
  <div class="flex wrap">
    <div class="one-third padding-right-thin padding-top-thinner padding-bottom-thinner"><label for="from_city">City</label> <input type="text" id="from_city" bind:value={from_city} placeholder="City"/></div>
    <div class="one-third padding-right-thin padding-top-thinner padding-bottom-thinner"><label for="from_state">State</label> 
      
      <div class="select-container relative">
        <select bind:value={from_state}>
          <option value="ACT">ACT</option>
          <option value="NSW">NSW</option>
          <option value="NT">NT</option>
          <option value="QLD">QLD</option>
          <option value="SA">SA</option>
          <option value="TAS">TAS</option>
          <option value="VIC">VIC</option>
          <option value="WA">WA</option>
        </select>
        <div class="absolute center-right select-arrow shift-up-more padding-right-thin unclickable">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#5C2587" d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>
        </div>
      </div>

    </div>
    <div class="one-third padding-right-thin padding-top-thinner padding-bottom-thinner"><label for="from_postcode">Postcode</label> <input type="text" id="from_postcode" bind:value={from_postcode} placeholder="Postcode"/></div>

  </div>
  <!-- custom_logo_url <input type="text" bind:value={custom_logo_url} /> -->
</div>

<hr/>

<h6>Mail Template</h6>

<div class="padding-top">
    {#if editor}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <a class="btn" href="?" on:click={() => editor.chain().focus().toggleHeading({ level: 5}).run()} class:active={editor.isActive('heading', { level: 5 })}><i class=" icon-heading"></i></a>
    <!-- <a class="btn" href="?" on:click={() => editor.chain().focus().toggleParagraph().run()} class:active={editor.isActive('paragrapgh')}><i class=" icon-pilcrow"></i></a> -->
    <a class="btn" href="?" on:click={() => editor.chain().focus().toggleBold().run()} class:active={editor.isActive('bold')}><i class=" icon-bold"></i></a>
    <a class="btn" href="?" on:click={() => editor.chain().focus().toggleItalic().run()} class:active={editor.isActive('italic')}><i class=" icon-italic"></i></a>
    <a class="btn" href="?" on:click={() => editor.chain().focus().toggleStrike().run()} class:active={editor.isActive('strike')}><i class=" icon-strikethrough"></i></a>
    <a class="btn" href="?" on:click={() => editor.chain().focus().toggleBulletList().run()} class:active={editor.isActive('bulletList')}><i class=" icon-list"></i></a>
    <a class="btn" href="?" on:click={() => editor.chain().focus().toggleOrderedList().run()} class:active={editor.isActive('orderedList')}><i class=" icon-list-ordered"></i></a>

    <a class="btn" href="?" on:click={() => editor.chain().focus().setTextAlign('left').run()} class:active={editor.isActive({ textAlign: 'left' })}><i class=" icon-align-left"></i></a>
    <a class="btn" href="?" on:click={() => editor.chain().focus().setTextAlign('center').run()} class:active={editor.isActive({ textAlign: 'center' })}><i class=" icon-align-center"></i></a>
    <a class="btn" href="?" on:click={() => editor.chain().focus().setTextAlign('right').run()} class:active={editor.isActive({ textAlign: 'right' })}><i class=" icon-align-left"></i></a>

    {/if}
</div>

<hr/>

<div bind:this={element} style="max-height:30vh;overflow-y:scroll;"/>

<hr/>

<div class=""><a class="btn btn-search" class:unclickable={is_saving} href="?" on:click={_handle_save_template}>SAVE TEMPLATE</a></div>

<style>

  h6 {
    font-size: 0.725rem;
    font-weight: 700;
  }

  label {
    color: var(--up-c-615d5d);
    font-size: 0.55rem;
    margin-bottom: 0.25rem;
    display: inline-block;
    font-weight: 700;
  }

  .select-container select::placeholder {
    color: var(--up-c-aaaaaa);
  }

  .select-container select {
    font-size: 0.6875rem;
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
    height: 27.39px;
    margin: auto;
    border-color: var(--up-c-cccccc);
    color: var(--up-c-000000);
    padding-left: 0.4em;
    padding-right: 0.4em;
  }

  input[type="text"] {
    font-size: 0.6875rem;
		border: 1px solid var(--up-c-cccccc);
		border-radius: 0.4em;
		placeholder-color: var(--up-c-2a1b1b);
    padding: 1em;
    height: 27.39px;
    width: 100%;
  }
  input[type="text"]:focus, input[type="text"]:active {
    box-shadow: none;
    outline: none;
  }


  .unclickable {
    opacity: 0.3;
  }

  .btn.btn-search {
    background-color: var(--up-c-5c2587);
    color: var(--up-c-ffffff);
    border: 0;
    border-radius: 4px;
    padding: calc(1 * var(--padding-unit)) calc(2 * var(--padding-unit));
    text-decoration: none;
    cursor: pointer;
    font-family: var(--font-family);
    width: 100%;
    text-align: center;
    display: block;
  }

  hr {
    margin: 1em 0;
    height: 1px;
    border: none;
    border-top: 1px solid var(--up-c-f1e9f7);
  }

  :global(.tiptap p, .tiptap ul, .tiptap ol) {
    font-size: 0.675rem;
  }

  :global(.tiptap ul, .tiptap ol) {
      padding-left: 16px;
      margin: 0;
  }

  :global(.tiptap ul li, .tiptap ol li) {
    margin-left: 16px;
    font-family: var(--font-family);
  }

  :global(.tiptap ul) {
    list-style-type: disc; /* Ensures default bullet style for unordered lists */
  }


  :global(.tiptap ul ul, .tiptap ol ul, .tiptap ul ol, .tiptap ol ol) {
      margin-left: 16px;
      padding-left: 16px;
  }
  
</style>