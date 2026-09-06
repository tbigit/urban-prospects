// alert('custom.js: '  + new Date());

// setTimeout(function(){
//   document.querySelector('.account-template-wrapper').classList.add('show');
// }, 10);


// console.log(window.user_info);


if (window.location.pathname.match(/\/pricing\/?$/)) {
  var user_id = window.user_info.id;
  var user_email = window.user_info.email;
  var user_plan = window.user_info.subscription;
  var user_regions = window.user_info.regions.split(/\s?\,\s?/);

  // if (user_id && user_plan && user_regions) {
  //   document.querySelector('.container-select-regions').classList.add('hide');
  //   document.getElementById('paymentButton').innerHTML = '<div class="notice-container"><p>You already have an active subscription. Please <a href="/contact">contact us</a> if you like to change your plan.</p></div>';
  // }

}
else if (window.location.pathname.match(/\/checkout\/order\-received\/?/)) {


  if (document.querySelectorAll('.woocommerce-order-downloads').length) {
    var heading = document.createElement('h5');
    heading.classList.add('padding-top-wider');
    heading.textContent = 'Thank you for your purchase! Your download will be sent to you via email shortly.';

    document.querySelector('.woocommerce-order').appendChild(heading);
  }
  else {
    var a = document.createElement('a');
    a.classList.add('btn-upgrade');
    a.textContent = 'START YOUR SEARCH';
    a.href = '/search';

    document.querySelector('.woocommerce-order').appendChild(a);
  }

}
else {

  var user_id = window.user_info.id;
  var user_email = window.user_info.email;
  var user_plan = window.user_info.subscription;
  var user_regions = window.user_info.regions.split(/\s?\,\s?/);

  var subscription_end_date = window.user_info.subscription_end_date;

  let user_fav = {};

  var user_fav_count = 0;

  async function _get_user_fav() {
    if (user_id) {
      var user_fav_response = await fetch('https://upapi.imtg.com.au/fav/' + user_id, {
        method: 'GET',
        cache: "no-cache",
        headers: { "Content-Type": "application/json" },
      }).then(user_fav_response => user_fav_response.json()).catch(function () { });
      if (user_fav_response) {

        // user_fav_response.forEach((fav) => {
        //   user_fav[fav.property_id] = 1;
        // });

        user_fav_count = user_fav_response.length;
      }

      var targetElement = document.querySelector('.woocommerce-MyAccount-navigation-link.woocommerce-MyAccount-navigation-link--dashboard');
      var newElement = document.createElement('li');
      var newLink = document.createElement('a');
      newLink.textContent = `My Fav`;
      newLink.href = '/search?search=1';
      newElement.appendChild(newLink);
      targetElement.parentNode.insertBefore(newElement, targetElement.nextSibling);

      var crmElement = document.createElement('li');
      var crmLink = document.createElement('a');
      crmLink.textContent = `My Pipeline`;
      crmLink.href = '/search?crm=1';
      crmElement.appendChild(crmLink);
      targetElement.parentNode.insertBefore(crmElement, targetElement.nextSibling);

    }
  }

  _get_user_fav();


  var newDiv = document.createElement('div');
  newDiv.classList.add('info-text');
  newDiv.textContent = `user: ${user_email}`;
  var targetElement = document.querySelector('.woocommerce-MyAccount-navigation');
  var ulElement = targetElement.querySelector('ul');
  targetElement.insertBefore(newDiv, ulElement);



  if (window.location.pathname.match(/\/my-account\/?$/) || window.location.pathname.match(/\/my-account\/orders\/?/) || window.location.pathname.match(/\/my-account\/view\-subscription\/?/)) {

    var targetElement = document.querySelector('.woocommerce-MyAccount-content');

    var newDiv = document.createElement('div');

    var upgrade_button_class = '';
    if (user_regions.length == 5) {
      // upgrade_button_class = 'unclickable';
    }

    newDiv.innerHTML = `<div class="sub-container padding-right-widest padding-desktop"><div class="container-widest border-roundest"><div class="row right"><a class="btn-upgrade ${upgrade_button_class}" href="/contact" target="_blank">UPGRADE</a></div><h1>${user_regions.length}</h1><h3>${user_plan}</h3><div class="flex wrap"><div class="five-sixth"><div class="regions-container"></div></div><div class="one-sixth exp-container">EXP ${subscription_end_date}
    
      
    
    </div></div>`;

    // Insert the new <div> after the target element
    targetElement.appendChild(newDiv);

    var divs = user_regions.map(function (region) {
      var div = document.createElement('div');
      div.textContent = region;
      return div;
    });

    divs.forEach(function (div) {
      document.querySelector('.regions-container').appendChild(div);
    });

  }

  // Inject CSS for the popup
  var style = document.createElement('style');
  style.innerHTML = `
    .btn-cancel, .btn-cancel:hover, .btn-cancel:visited {
      font-family: Montserrat, sans-serif;
      font-size: 0.6875rem;
      color: white;
      font-weight: 300;
      text-transformation: uppercase;
      text-decoration: none;
    }
    .image-search-container {
        margin-bottom: 1.5em;
        background-color: rgba(255, 255, 255, 1);
        border-radius: 8px;
        padding: 1em;
        position: relative; /* for positioning the triangle */
    }

    .image-search-container p {
      font-size: 0.875rem !important;
    }

    .title-search-disable-container {
        margin-top: 1em;
        background-color: rgba(255, 255, 255, 1);
        border-radius: 8px;
        box-shadow: 0 0 12px 4px rgba(1, 1, 1, 0.1);
        padding: 1em;
        position: relative; /* for positioning the triangle */
    }
    .popup-triangle {
        position: absolute;
        top: -8px;
        right: 30px;
        width: 0;
        height: 0;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-bottom: 12px solid #fff;
        visibility: hidden;
    }
    .cancellation-popup-container.visible .popup-triangle {
        visibility: visible;
    }
    .cancellation-popup-container {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.5s ease-in-out;
    }
    .cancellation-popup-container.visible {
        max-height: 500px; /* Adjust as needed */
    }

    .btn.btn-confirm {
      border-radius: 4px;
      font-family: Montserrat, sans-serif;
      color: white;
      text-transformation: uppercase;
      text-decoration: none;
      text-transform: uppercase;
      background-color: #31144D;
      border: 1px solid Cfff;
      font-weight: normal;
      font-size: 0.7rem;
      color: white;
      padding: calc(0.75 * var(--padding-unit)) calc(1.25 * var(--padding-unit));;
      margin-top: 1em;
      box-sizing: border-box;
    }

  `;
  document.head.appendChild(style);

  function _show_cancel_popup() {
    const popup = document.querySelector('.cancellation-popup-container');
    if (popup) {
      popup.classList.toggle('visible');
    }
  }

  function _cancel_subscription_confirm() {
    fetch(`/api/suspend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: window.user_info.email, 'dry_run': 1 }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Success:', data);
        const popup = document.querySelector('.cancellation-popup-container');
        if (popup) {
          popup.innerHTML = '<div class="image-search-container"><p>Your subscription has been successfully cancelled.</p></div>';
          setTimeout(function () {
            popup.classList.remove('visible');
          }, 3000);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('There was an error cancelling your subscription. Please try again.');
      });
  }

  var targetElement = document.querySelector('.woocommerce-MyAccount-content .sub-container div div');
  if (targetElement) {
    var buttonContainer = document.createElement('div');
    buttonContainer.style.textAlign = 'right';
    buttonContainer.style.marginTop = '0.25em';

    var cancelButton = document.createElement('a');
    cancelButton.href = 'javascript:void(0);';
    cancelButton.classList.add('btn', 'btn-cancel');
    cancelButton.innerText = 'Cancel Subscription';
    cancelButton.onclick = _show_cancel_popup;

    buttonContainer.appendChild(cancelButton);
    targetElement.parentNode.insertBefore(buttonContainer, targetElement.nextSibling);

    var popupDiv = document.createElement('div');
    popupDiv.classList.add('padding-top', 'row', 'cancellation-popup-container');
    popupDiv.innerHTML = `
    <div class="image-search-container">
      <div class="padding-top padding-bottom row left">
        <h6 class="padding-bottom"><strong>CANCEL YOUR URBAN PROSPECT SUBSCRIPTION</strong></h6>
        <p>
          You are about to cancel your Urban Prospects subscription. Click the <strong>CANCEL MY SUBSCRIPTION</strong> button below to confirm. You will continue to have access to your current subscription until it expires on ${subscription_end_date}.
        </p>
      </div>
      <div class="padding-top-thin row right">
        <a href="javascript:void(0);" class="btn btn-confirm" onclick="_cancel_subscription_confirm()">CANCEL MY SUBSCRIPTION</a>
      </div>
      <div class="popup-triangle"></div>
    </div>`;
    targetElement.parentNode.insertBefore(popupDiv, buttonContainer.nextSibling);
  }
}