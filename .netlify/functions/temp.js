  function sendGa(event, selector, cat, action, label, value) {
    const el = document.querySelectorAll(selector);
    const addEl = (el) => {
      el.addEventListener(event, () => {
        gtag('event', `${action} | ${label}`, {
         event_category: cat,
         event_action: action,
         event_label: label,
         event_value: value
        })
      })
    }
    if (el && el[0] && el.length === 1) { // single element
      addEl(el[0]);
    } else if (el.length > 1) { // multiple elements
      el.forEach((el)=>{
        addEl(el);
      })
    }
  }
  
  setTimeout(function(){
    
  
  
  	window.initializeGtag();
    
  	if (!window.location.hostname.includes('webflow')) {
      // live site
      if (gtag) {
        // sendGa('event',           'selector',              'cat',    'action',       'label'   ); <-- example
        sendGa('click', "[data-ga='nav-signup']", "Click 'Sign Up Free' Button in Navbar", 'Button', "Sign Up Button Navbar", "$0.00");
        sendGa('click', "[data-ga='nav-login']", "Click 'Login' Button in Navbar", 'Button', "Login Button Navbar", "$0.00");
        sendGa('click', "[data-ga='home-hero-signup']", "Click 'Sign Up Free' Button in Hero", 'Button', "Sign Up Button Hero", "$0.00");
        sendGa('click', "[data-ga='security-hero-signup']", "Click 'Sign Up Free' Button in Hero", 'Button', "Security Sign Up Button Hero", "$0.00");
        sendGa('click', "[data-ga='about-hero-signup']", "Click 'Sign Up Free' Button in Hero", 'Button', "About Sign Up Button Hero", "$0.00");
      }
    }
    
  
  },600);