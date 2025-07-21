(function() {
  // Set up ping listener immediately to handle background script pings
  // This ensures ping responses even if the rest of initialization fails
  if (!window.applyFlowManagerPingListener) {
    try {
      console.log('ApplyFlow Manager: Setting up ping listener immediately');
      window.applyFlowManagerPingListener = true;
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'ping') {
          console.log('Received ping, responding with success');
          sendResponse({ 
            success: true, 
            message: 'Content script is active',
            initialized: window.applyFlowManagerLoaded || false
          });
          return true;
        }
        return false;
      });
    } catch (pingError) {
      console.error('Failed to set up initial ping listener:', pingError);
    }
  }

  try {
    console.log('ApplyFlow Manager content script loading...');
    console.log('Page URL:', window.location.href);
    if (window.applyFlowManagerLoaded) {
      console.log('ApplyFlow Manager content script already loaded, skipping initialization');
      return;
    }
    window.applyFlowManagerLoaded = true;
    console.log('Smart Job Form Auto Filler content script loaded');
    try {
      chrome.runtime.sendMessage({
        action: 'contentScriptLoaded',
        url: window.location.href
      }, response => {
        if (chrome.runtime.lastError) {
          console.warn('Could not notify background script of load:', chrome.runtime.lastError);
        } else {
          console.log('Background script notified of content script load');
        }
      });
    } catch (e) {
      console.warn('Error notifying background script of content load:', e);
    }
    const fieldPatterns = {
      firstName: [/first[-_\s]*name/i, /fname/i, /first$/i, /given[-_\s]*name/i],
      middleName: [/middle[-_\s]*name/i, /mname/i, /middle$/i],
      lastName: [/\blast[-_\s]*name\b/i, /\bsurname\b/i, /\blname\b/i, /\blast\b$/i, /\bfamily[-_\s]*name\b/i, /\bfamily\b$/i],
      fullName: [/\bfull[-_\s]*name\b/i, /\bcomplete[-_\s]*name\b/i, /\bcandidate[-_\s]*name\b/i, /\bapplicant[-_\s]*name\b/i, /\byour[-_\s]*name\b/i, /^name$/i, /\bname\b(?!.*(first|last|middle|family|user|file|display|job|company))/i],
      preferredName: [/preferred[-_\s]*name/i, /nickname/i, /nick[-_\s]*name/i, /preferred$/i, /name[-_\s]*you[-_\s]*go[-_\s]*by/i],
      email: [/email/i, /e-mail/i, /e[-_\s]*mail/i],
      phone: [/phone/i, /telephone/i, /tel/i, /mobile/i, /cell/i, /contact[-_\s]*number/i, /primary[-_\s]*contact/i, /phone[-_\s]*number/i],
      addressStreet: [/\bstreet[-_\s]*address\b/i, /\bresidential[-_\s]*address\b/i, /\bhome[-_\s]*address\b/i, /\bprimary[-_\s]*address\b/i, /\bmailing[-_\s]*address\b/i, /\baddress[-_\s]*line[-_\s]*1\b/i, /\baddr1\b/i, /\baddress1\b/i, /\bstreet[-_\s]*name\b/i, /\bstreet[-_\s]*number\b/i, /\baddress(?!.*work|.*employer|.*company|.*school).*(street|line|1)\b/i, /\bstreet\b/i],
      addressLine2: [/address[-_\s]*line[-_\s]*2/i, /addr2/i, /address2/i, /apt/i, /apartment/i, /suite/i, /unit/i, /floor/i, /room/i, /building/i],
      addressCity: [/\bcity\b/i, /\btown\b/i, /\bmunicipality\b/i, /\bcity[-_\s]*name\b/i],
      addressState: [/\bstate\b/i, /\bprovince\b/i, /\bregion\b/i, /\bcounty\b/i],
      addressPostalCode: [/postal[-_\s]*code/i, /zip[-_\s]*code/i, /\bzip\b/i, /postcode/i],
      addressCountry: [/\bcountry\b/i, /\bnation\b/i],
      dateOfBirth: [/birth[-_\s]*date/i, /date[-_\s]*of[-_\s]*birth/i, /dob/i, /born/i, /birthday/i],
      gender: [/gender/i, /sex/i],
      portfolio: [/portfolio/i, /website/i, /site/i, /homepage/i, /web[-_\s]*page/i],
      linkedin: [/linkedin/i, /linked[-_\s]*in/i],
      github: [/github/i, /git[-_\s]*hub/i],
      skills: [/skills/i, /technical[-_\s]*skills/i, /tech[-_\s]*skills/i, /programming[-_\s]*skills/i, /competencies/i],
      softSkills: [/soft[-_\s]*skills/i, /interpersonal[-_\s]*skills/i, /communication[-_\s]*skills/i, /people[-_\s]*skills/i],
      coverLetter: [/cover[-_\s]*letter/i, /application[-_\s]*letter/i, /motivation[-_\s]*letter/i, /statement/i],
      aboutYou: [/about[-_\s]*you/i, /tell[-_\s]*us[-_\s]*about[-_\s]*yourself/i, /self[-_\s]*description/i, /bio/i, /biography/i, /introduction/i, /introduce[-_\s]*yourself/i],
      availableStartDate: [/available[-_\s]*start[-_\s]*date/i, /start[-_\s]*date/i, /availability/i, /available[-_\s]*from/i, /when[-_\s]*can[-_\s]*you[-_\s]*start/i],
      informationAccuracy: [/information[-_\s]*accuracy/i, /accurate[-_\s]*information/i, /certify[-_\s]*information/i, /confirm[-_\s]*accurate/i, /information[-_\s]*true/i, /declare[-_\s]*true/i],
      privacyPolicy: [/privacy[-_\s]*policy/i, /terms[-_\s]*condition/i, /consent/i, /accept[-_\s]*term/i, /agree[-_\s]*to[-_\s]*privacy/i, /data[-_\s]*policy/i],
      education: {
        institution: [/school/i, /college/i, /university/i, /institute/i, /institution/i, /education.*institution/i, /education.*school/i, /education\[\d+\].*school/i, /education\[\d+\].*institution/i, /education\[\d+\]\[institution\]/i, /eduInstitution/i, /edu.*school/i],
        degree: [/degree/i, /qualification/i, /certification/i, /diploma/i, /education.*degree/i, /education\[\d+\].*degree/i, /education\[\d+\]\[degree\]/i, /eduDegree/i],
        major: [/major/i, /field.*study/i, /study.*field/i, /concentration/i, /specialization/i, /education.*major/i, /education.*field/i, /education\[\d+\].*major/i, /education\[\d+\].*field/i, /education\[\d+\]\[major\]/i, /education\[\d+\]\[field\]/i, /eduMajor/i, /eduField/i],
        startDate: [/start.*date/i, /from.*date/i, /begin.*date/i, /education.*start/i, /education.*from/i, /education\[\d+\].*start/i, /education\[\d+\].*from/i, /education\[\d+\]\[startDate\]/i, /education\[\d+\]\[start\]/i, /eduStart/i, /edu.*from/i],
        endDate: [/end.*date/i, /to.*date/i, /completion/i, /graduation/i, /education.*end/i, /education.*to/i, /education.*grad/i, /education\[\d+\].*end/i, /education\[\d+\].*to/i, /education\[\d+\]\[endDate\]/i, /education\[\d+\]\[end\]/i, /eduEnd/i, /eduGrad/i],
        gpa: [/gpa/i, /grade.*point/i, /grade.*average/i, /cgpa/i, /percentage/i, /marks/i, /education.*gpa/i, /education\[\d+\].*gpa/i, /education\[\d+\]\[gpa\]/i, /education\[\d+\].*percentage/i, /eduGPA/i, /academic.*score/i],
        location: [/\blocation\b/i, /\bedu.*location\b/i, /\bedu.*city\b/i, /\bedu.*place\b/i, /education.*location/i, /education.*place/i, /education.*city/i, /education\[\d+\].*location/i, /education\[\d+\]\[location\]/i],
        description: [/description/i, /details/i, /achievements/i, /education.*desc/i, /education\[\d+\].*desc/i, /education\[\d+\]\[description\]/i, /eduDescription/i]
      },
      experience: {
        company: [/company/i, /employer/i, /organization/i, /workplace/i, /firm/i, /experience.*company/i, /experience.*employer/i, /experience\[\d+\].*company/i, /experience\[\d+\].*employer/i, /experience\[\d+\]\[company\]/i, /expCompany/i, /exp.*employer/i],
        title: [/title/i, /position/i, /role/i, /job.*title/i, /experience.*title/i, /experience.*position/i, /experience.*role/i, /experience\[\d+\].*title/i, /experience\[\d+\].*position/i, /experience\[\d+\]\[title\]/i, /experience\[\d+\]\[position\]/i, /expTitle/i, /expPosition/i, /exp.*role/i],
        startDate: [/start.*date/i, /from.*date/i, /begin.*date/i, /experience.*start/i, /experience.*from/i, /experience\[\d+\].*start/i, /experience\[\d+\].*from/i, /experience\[\d+\]\[startDate\]/i, /experience\[\d+\]\[start\]/i, /expStart/i, /exp.*from/i],
        endDate: [/end.*date/i, /to.*date/i, /finish/i, /completion/i, /experience.*end/i, /experience.*to/i, /experience\[\d+\].*end/i, /experience\[\d+\].*to/i, /experience\[\d+\]\[endDate\]/i, /experience\[\d+\]\[end\]/i, /expEnd/i, /exp.*to/i],
        current: [/current/i, /present/i, /now/i, /experience.*current/i, /experience.*present/i, /experience\[\d+\].*current/i, /experience\[\d+\]\[current\]/i, /experience\[\d+\]\[isCurrent\]/i, /expCurrent/i, /exp.*present/i],
        location: [/\bwork[-_\s]*location\b/i, /\bcompany[-_\s]*location\b/i, /\bemployer[-_\s]*location\b/i, /\bjob[-_\s]*location\b/i, /\bwork[-_\s]*city\b/i, /experience.*location/i, /experience.*place/i, /experience\[\d+\].*location/i, /experience\[\d+\]\[location\]/i, /\bexp.*location\b/i],
        description: [/description/i, /details/i, /summary/i, /experience.*desc/i, /experience\[\d+\].*desc/i, /experience\[\d+\]\[description\]/i, /expDescription/i],
        responsibilities: [/responsibilities/i, /duties/i, /tasks/i, /experience.*resp/i, /experience.*duties/i, /experience\[\d+\].*resp/i, /experience\[\d+\]\[responsibilities\]/i, /expResponsibilities/i, /exp.*duties/i]
      }
    };
    const sampleProfile = {
      firstName: "John",
      middleName: "David",
      lastName: "Smith",
      preferredName: "Johnny",
      email: "john.smith@example.com",
      phone: "+1 (555) 123-4567",
      addressStreet: "123 Main Street",
      addressCity: "San Francisco",
      addressState: "CA",
      addressPostalCode: "94105",
      addressCountry: "United States",
      dateOfBirth: "1990-05-15",
      gender: "Male",
      portfolio: "https://johnsmith.dev",
      linkedin: "https://linkedin.com/in/johnsmith",
      github: "https://github.com/johnsmith",
      skills: "JavaScript, React, Node.js, Python, SQL, AWS, Git, Docker, HTML, CSS",
      softSkills: "Communication, Leadership, Teamwork, Problem Solving, Time Management",
      coverLetter: "I am an experienced software developer with over 5 years of experience building web applications. I am passionate about creating clean, efficient code and solving complex problems.",
      aboutYou: "I am a detail-oriented software developer who loves tackling challenging problems. Outside of work, I enjoy hiking, photography, and contributing to open-source projects.",
      availableStartDate: "2023-12-01",
      education: [
        {
          institution: "Stanford University",
          degree: "Bachelor of Science",
          major: "Computer Science",
          startDate: "2014-09-01",
          endDate: "2018-05-30",
          gpa: "3.8",
          location: "Stanford, CA",
          description: "Graduated with honors. Specialized in artificial intelligence and machine learning."
        },
        {
          institution: "Massachusetts Institute of Technology",
          degree: "Master of Science",
          major: "Software Engineering",
          startDate: "2018-09-01",
          endDate: "2020-05-25",
          gpa: "3.9",
          location: "Cambridge, MA",
          description: "Research focus on distributed systems and cloud computing."
        }
      ],
      experience: [
        {
          company: "Google",
          title: "Software Engineer",
          startDate: "2020-06-15",
          endDate: "Present",
          current: true,
          location: "Mountain View, CA",
          description: "Working on developing and maintaining large-scale web applications.",
          responsibilities: "Designed and implemented new features, collaborated with cross-functional teams, improved application performance by 40%."
        },
        {
          company: "Amazon",
          title: "Junior Developer",
          startDate: "2018-07-01",
          endDate: "2020-05-30",
          current: false,
          location: "Seattle, WA",
          description: "Worked on e-commerce platform enhancements.",
          responsibilities: "Developed API integrations, fixed critical bugs, contributed to the migration of legacy systems."
        }
      ]
    };
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          if (window.derivedProfile) {
            console.log("Dynamic content detected, re-running autofill");
            autofillForm(window.derivedProfile);
          }
        }
      });
    });
    function handleDateOfBirthField(field, dateValue) {
      console.log(`Attempting to fill DOB field with value: ${dateValue}`);
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          console.log(`Formatted DOB: ${formattedDate}`);
          field.value = formattedDate;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
          field.dispatchEvent(new Event('blur', { bubbles: true }));
          return true;
        } else {
          console.warn(`Invalid date format for DOB: ${dateValue}`);
          return false;
        }
      } catch (error) {
        console.error(`Error handling DOB field:`, error);
        return false;
      }
    }
    function findFormFields() {
      console.log('Finding form fields on page');
      return [
        ...document.querySelectorAll('input, select, textarea')
      ].filter(el => {
        const type = el.getAttribute('type');
        return el.offsetParent !== null && 
               type !== 'hidden' &&
               type !== 'submit' &&
               type !== 'button' &&
               type !== 'reset' &&
               type !== 'file'; 
      });
    }
    function matchFieldName(fieldName, patterns) {
      if (!fieldName) return null;
      const normalizedName = fieldName.toLowerCase();
      for (const [field, regexList] of Object.entries(patterns)) {
        if (typeof regexList === 'object' && !Array.isArray(regexList)) {
          continue;
        }
        if (!Array.isArray(regexList)) {
          console.warn(`Field pattern for "${field}" is not an array:`, regexList);
          continue;
        }
        for (const pattern of regexList) {
          if (pattern.test(normalizedName)) {
            console.log(`Field match found: "${fieldName}" matches pattern for "${field}"`);
            return field;
          }
        }
      }
      return null;
    }
    function determineFieldType(inputElement) {
      const name = inputElement.name || '';
      const id = inputElement.id || '';
      const ariaLabel = inputElement.getAttribute('aria-label') || '';
      const placeholder = inputElement.getAttribute('placeholder') || '';
      let labelText = '';
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) {
          labelText = label.textContent || '';
        }
      }
      if (!labelText) {
        const parentLabel = inputElement.closest('label');
        if (parentLabel) {
          const clone = parentLabel.cloneNode(true);
          Array.from(clone.querySelectorAll('input, select, textarea, button')).forEach(el => el.remove());
          labelText = clone.textContent?.trim() || '';
        }
      }
      const identifiers = [name, id, labelText, ariaLabel, placeholder].filter(Boolean);
      console.log(`Checking field identifiers: ${identifiers.join(', ')}`);
      
      // Check if this is part of an address section/group
      const isInAddressSection = () => {
        const formSection = findFormSection(inputElement);
        if (!formSection) return false;
        
        const sectionId = formSection.id || '';
        const sectionClass = formSection.className || '';
        const nearbyLegend = formSection.querySelector('legend, h3, h4, h5');
        const legendText = nearbyLegend ? nearbyLegend.textContent : '';
        
        return /\b(address|contact|residence|home|mailing)\b/i.test(sectionId) || 
               /\b(address|contact|residence|home|mailing)\b/i.test(sectionClass) ||
               /\b(address|contact|residence|home|mailing)\b/i.test(legendText);
      };
      
      // Check if this is part of a work experience section
      const isInExperienceSection = () => {
        const formSection = findFormSection(inputElement);
        if (!formSection) return false;
        
        const sectionId = formSection.id || '';
        const sectionClass = formSection.className || '';
        const nearbyLegend = formSection.querySelector('legend, h3, h4, h5');
        const legendText = nearbyLegend ? nearbyLegend.textContent : '';
        
        return /\b(work|experience|job|employment|position|company|employer)\b/i.test(sectionId) || 
               /\b(work|experience|job|employment|position|company|employer)\b/i.test(sectionClass) ||
               /\b(work|experience|job|employment|position|company|employer)\b/i.test(legendText);
      };
      
      // First check for address line 2 fields
      for (const identifier of identifiers) {
        for (const pattern of fieldPatterns.addressLine2) {
          if (pattern.test(identifier)) {
            console.log(`Detected Address Line 2 field: "${identifier}" - will fill with residential address`);
            return "addressLine2";
          }
        }
      }
      
      // Check for address fields more carefully
      for (const identifier of identifiers) {
        // Check for residential address/street indicators
        if (/\b(street|address|home|residence|mailing)\b/i.test(identifier)) {
          // Avoid matching work experience address fields
          if (/\b(work|job|company|employer|employment|experience)\b.*\b(address|location)\b/i.test(identifier)) {
            continue;
          }
          
          const inAddressSection = isInAddressSection();
          const inExperienceSection = isInExperienceSection();
          
          // If field is in an address section but not in experience section
          if (inAddressSection && !inExperienceSection) {
            if (/\b(street|address.*line.*1|addr1|address1|residential|home|mailing)\b/i.test(identifier)) {
              console.log(`Found address street field in address section: "${identifier}"`);
              return "addressStreet";
            }
          }
          
          if (/\baddress\b/i.test(identifier) && !/\b(line|apt|unit|suite|floor|room|building)\b/i.test(identifier)) {
            if (!inExperienceSection) {
              console.log(`Found generic "address" field - assuming address line 1: "${identifier}"`);
              return "addressStreet";
            }
          }
        }
      }
      
      // Try to match other field types
      for (const identifier of identifiers) {
        if (inputElement.type === "checkbox") {
          if (/accuracy|certify|confirm|true|correct|accurate|declare/i.test(identifier)) {
            return "informationAccuracy";
          }
          if (/privacy|policy|terms|consent|agree|accept/i.test(identifier)) {
            return "privacyPolicy";
          }
        }
        
        // Special handling for name fields to avoid conflicts
        if (/\bname\b/i.test(identifier)) {
          // Check for last name specific indicators
          if (/\blast\b|\bfamily\b|\bsurname\b/i.test(identifier)) {
            console.log(`Detected explicit last name field: "${identifier}"`);
            return "lastName";
          }
          
          // Check for first name specific indicators
          if (/\bfirst\b|\bgiven\b/i.test(identifier)) {
            console.log(`Detected explicit first name field: "${identifier}"`);
            return "firstName";
          }
          
          // Check for full name indicators
          if (/\bfull\b|\bcomplete\b|\bwhole\b|\bentire\b/i.test(identifier)) {
            console.log(`Detected explicit full name field: "${identifier}"`);
            return "fullName";
          }
          
          // Check adjacent elements for other name parts to determine context
          const siblings = getSurroundingSiblings(inputElement, 5);
          const siblingIdentifiers = siblings.map(sibling => {
            if (!sibling) return '';
            return (sibling.name || '') + ' ' + (sibling.id || '') + ' ' + 
                  (sibling.placeholder || '') + ' ' +
                  (sibling.getAttribute('aria-label') || '');
          }).join(' ').toLowerCase();
          
          // If siblings contain first/last name references, this is likely a full name field
          if (/\bfirst\s*name\b/i.test(siblingIdentifiers) || /\blast\s*name\b/i.test(siblingIdentifiers)) {
            console.log(`"${identifier}" appears to be a full name field based on adjacent name fields`);
            return "fullName";
          }
        }
        
        const field = matchFieldName(identifier, fieldPatterns);
        if (field) {
          // If we detected a location field, make sure it's not actually an address field
          if (field === 'location' || field.endsWith('.location')) {
            // Check if it's likely a residential address field
            const isMaybeAddressField = /\b(street|address|residence|home|mailing)\b/i.test(identifier);
            const inAddressSection = isInAddressSection();
            
            if (isMaybeAddressField && inAddressSection) {
              console.log(`Determined field is actually a residential address: "${identifier}"`);
              return "addressStreet";
            }
          }
          
          return field;
        }
        
        if (/birth|dob|birthday|born/i.test(identifier)) {
          return "dateOfBirth";
        }
      }
      
      return null;
    }
    function findFormSection(element) {
      const formSection = element.closest('fieldset, .form-section, .address-section, .contact-section, .address-container, .address-fields');
      if (formSection) {
        return formSection;
      }
      const form = element.closest('form');
      if (form) {
        const siblings = getSurroundingSiblings(element, 3);
        if (siblings.some(sibling => isAddressField(sibling))) {
          return form;
        }
      }
      return null;
    }
    function getSurroundingSiblings(element, count) {
      const siblings = [];
      let current = element;
      for (let i = 0; i < count && current.previousElementSibling; i++) {
        siblings.push(current.previousElementSibling);
        current = current.previousElementSibling;
      }
      current = element;
      for (let i = 0; i < count && current.nextElementSibling; i++) {
        siblings.push(current.nextElementSibling);
        current = current.nextElementSibling;
      }
      return siblings;
    }
    function isAddressField(element) {
      if (!element || !element.tagName || 
          !['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName.toUpperCase())) {
        return false;
      }
      const name = element.name || '';
      const id = element.id || '';
      const placeholder = element.placeholder || '';
      const addressTerms = [
        /street/i, /address/i, /city/i, /state/i, /province/i, 
        /zip/i, /postal/i, /country/i, /apartment/i, /suite/i, /unit/i
      ];
      return addressTerms.some(term => 
        term.test(name) || 
        term.test(id) || 
        term.test(placeholder)
      );
    }
    function isAddressFormSection(section) {
      if (!section) return false;
      const id = section.id || '';
      const className = section.className || '';
      if (/address|contact|location/i.test(id) || /address|contact|location/i.test(className)) {
        return true;
      }
      const legend = section.querySelector('legend, h1, h2, h3, h4, h5, h6, label.section-label');
      if (legend && /address|contact|location/i.test(legend.textContent || '')) {
        return true;
      }
      const fields = section.querySelectorAll('input, select, textarea');
      let addressFieldCount = 0;
      fields.forEach(field => {
        if (isAddressField(field)) {
          addressFieldCount++;
        }
      });
      return addressFieldCount >= 2; 
    }
    function trySetValue(element, value) {
      try {
        element.value = value;
        return true;
      } catch (error) {
        console.error(`Error setting value on element:`, error);
        return false;
      }
    }
    function waitForElements(selector, timeout=5000) {
      return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
          const elements = document.querySelectorAll(selector);
          if (elements.length || Date.now() - start >= timeout) {
            resolve(elements);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    }
    function getFullName(profile) {
      if (!profile) return '';
      if (profile.fullName) return profile.fullName;
      let parts = [];
      if (profile.firstName) parts.push(profile.firstName);
      if (profile.middleName) parts.push(profile.middleName);
      if (profile.lastName) parts.push(profile.lastName);
      if (parts.length > 0) {
        return parts.join(' ');
      }
      return profile.preferredName || '';
    }
    function formatValue(value, type) {
      if (value === undefined || value === null) {
        return '';
      }
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          return value.join(', ');
        } else {
          try {
            if (value instanceof Date) {
              return formatDate(value, type);
            }
            if (value.value !== undefined) return value.value;
            if (value.name !== undefined) return value.name;
            if (value.text !== undefined) return value.text;
            if (value.label !== undefined) return value.label;
            if (value.display !== undefined) return value.display;
            console.warn('Object value being used in form field:', value);
            return JSON.stringify(value);
          } catch (error) {
            console.error('Error formatting object value:', error);
            return '';
          }
        }
      }
      let strValue = String(value);
      if (type === 'date' || type === 'month') {
        return formatDate(strValue, type);
      } else if (type === 'number' || type === 'range') {
        const num = parseFloat(strValue);
        if (!isNaN(num)) {
          return num.toString();
        }
      } else if (type === 'checkbox' || type === 'radio') {
        if (strValue === 'true' || strValue === 'false') {
          return strValue;
        }
      }
      return strValue;
    }
    function formatDate(dateValue, type) {
      let date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        if (/present|current/i.test(dateValue)) {
          if (type === 'month' || type === 'date') {
            date = new Date();
          } else {
            return dateValue; 
          }
        } else {
          try {
            const cleanedDate = dateValue.trim().replace(/\s+/g, ' ');
            if (/^[a-z]{3,}\s+\d{4}$/i.test(cleanedDate)) {
              const parts = cleanedDate.split(' ');
              const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
              const monthIndex = monthNames.findIndex(m => m.toLowerCase().startsWith(parts[0].toLowerCase().substring(0, 3)));
              if (monthIndex !== -1) {
                const year = parseInt(parts[1]);
                date = new Date(year, monthIndex, 1);
              }
            } 
            else {
              date = new Date(dateValue);
              if (isNaN(date.getTime())) {
                const parts = cleanedDate.split(/[-/.]/);
                if (parts.length === 2) {
                  if (parts[0].length === 4) {
                    date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                  } else {
                    date = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
                  }
                } else if (parts.length === 3) {
                  if (parts[0].length === 4) {
                    date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                  } else {
                    date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error parsing date:', e);
            return dateValue; 
          }
        }
      } else {
        return '';
      }
      if (!isNaN(date?.getTime())) {
        if (type === 'month') {
          return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        } else if (type === 'date') {
          return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        } else {
          return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
        }
      }
      return dateValue.toString();
    }
    function selectBestOption(selectElement, targetValue) {
      if (!targetValue || !selectElement) return false;
      const options = Array.from(selectElement.options);
      if (options.length === 0) return false;
      const targetValueLower = targetValue.toString().toLowerCase().trim();
      const genderMappings = {
        'm': ['male', 'm', 'man'],
        'f': ['female', 'f', 'woman'],
        'o': ['other', 'o', 'non-binary', 'prefer not to say', 'diverse', 'non binary']
      };
      const isGenderField = selectElement.name?.toLowerCase().includes('gender') || 
                            selectElement.id?.toLowerCase().includes('gender') ||
                            options.some(opt => 
                              ['male', 'female', 'm', 'f'].includes(opt.textContent.toLowerCase().trim())
                            );
      let selectedValue = null;
      for (const opt of options) {
        if (opt.value.toLowerCase() === targetValueLower || 
            opt.textContent.toLowerCase().trim() === targetValueLower) {
          selectElement.value = opt.value;
          return true;
        }
      }
      for (const opt of options) {
        if (opt.textContent.toLowerCase().includes(targetValueLower) ||
            targetValueLower.includes(opt.textContent.toLowerCase().trim())) {
          selectElement.value = opt.value;
          return true;
        }
      }
      if (isGenderField) {
        let genderCategory = null;
        for (const [key, values] of Object.entries(genderMappings)) {
          if (values.includes(targetValueLower) || values.some(v => targetValueLower.includes(v))) {
            genderCategory = key;
            break;
          }
        }
        if (genderCategory) {
          for (const opt of options) {
            const optTextLower = opt.textContent.toLowerCase().trim();
            if (genderMappings[genderCategory].some(v => optTextLower.includes(v) || v.includes(optTextLower))) {
              selectElement.value = opt.value;
              return true;
            }
          }
        }
      }
      if (targetValue.includes(',') && 
          (selectElement.multiple || document.querySelector(`input[name="${selectElement.name}"][type="checkbox"]`))) {
        const skills = targetValue.split(',').map(s => s.trim());
        let matchedAny = false;
        for (const skill of skills) {
          for (const opt of options) {
            if (opt.textContent.toLowerCase().trim() === skill.toLowerCase() ||
                opt.textContent.toLowerCase().trim().includes(skill.toLowerCase())) {
              if (selectElement.multiple) {
                opt.selected = true;
                matchedAny = true;
              } else {
                const checkbox = document.querySelector(`input[value="${opt.value}"][type="checkbox"]`);
                if (checkbox) {
                  checkbox.checked = true;
                  matchedAny = true;
                }
              }
            }
          }
        }
        return matchedAny;
      }
      if (selectElement.required && options.length > 0) {
        const firstOpt = options[0];
        if (firstOpt.value === '' || 
            /please|select|choose|pick/i.test(firstOpt.textContent.toLowerCase())) {
          if (options.length > 1) {
            selectElement.value = options[1].value;
            return true;
          }
        } else {
          selectElement.value = firstOpt.value;
          return true;
        }
      }
      return false;
    }
    function fillField(field, value) {
      if (!field || value === undefined || value === null) return false;
      try {
        const fieldName = field.name || field.id || '';
        console.log(`Filling field ${fieldName} with value: ${value}`);
        const tagName = field.tagName.toLowerCase();
        const fieldType = field.type ? field.type.toLowerCase() : '';
        if (fieldType === 'checkbox' && 
            (/accuracy|privacy|consent|terms|agree|accept|certify/i.test(fieldName))) {
          field.checked = true;
          field.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        const formattedValue = formatValue(value, fieldType);
        if (tagName === 'input') {
          if (fieldType === 'file') {
            console.log('Skipping file input field - cannot be set programmatically');
            return false;
          }
          if (fieldType === 'checkbox') {
            if (typeof value === 'boolean') {
              field.checked = value;
            } else if (value === 'true' || value === 'yes' || value === '1') {
              field.checked = true;
            } else if (value === 'false' || value === 'no' || value === '0') {
              field.checked = false;
            } else if (field.value === formattedValue) {
              field.checked = true;
            }
          } else if (fieldType === 'radio') {
            if (field.value === formattedValue) {
              field.checked = true;
            } else if (/gender|sex/i.test(fieldName)) {
              const genderValue = formattedValue.toLowerCase();
              if ((genderValue === 'male' || genderValue === 'm') && /male|m$/i.test(field.value)) {
                field.checked = true;
              } else if ((genderValue === 'female' || genderValue === 'f') && /female|f$/i.test(field.value)) {
                field.checked = true;
              } else if (genderValue === 'other' && /other|diverse|non-binary/i.test(field.value)) {
                field.checked = true;
              }
            }
          } else if (fieldType === 'month') {
            try {
              const [year, month] = formattedValue.split('-');
              field.value = `${year}-${month.padStart(2, '0')}`;
            } catch (e) {
              field.value = formattedValue;
            }
          } else if (fieldType === 'date') {
            field.value = formattedValue;
          } else {
            field.value = formattedValue;
          }
        } else if (tagName === 'textarea') {
          field.value = formattedValue;
        } else if (tagName === 'select') {
          if (/gender|sex/i.test(fieldName)) {
            selectBestOption(field, formattedValue);
          } else if (/skill|competenc/i.test(fieldName)) {
            selectBestOption(field, formattedValue);
          } else {
            selectOptionByValue(field, formattedValue);
          }
        }
        ['input', 'change', 'blur'].forEach(eventType => {
          field.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        return true;
      } catch (error) {
        console.error(`Error filling field ${field.name || field.id}:`, error);
        return false;
      }
    }
    function selectOptionByValue(selectElement, targetValue) {
      const options = Array.from(selectElement.options);
      let found = false;
      for (const option of options) {
        if (option.value === targetValue) {
          selectElement.value = option.value;
          found = true;
          break;
        }
      }
      if (!found) {
        for (const option of options) {
          if (option.textContent.trim() === targetValue) {
            selectElement.value = option.value;
            found = true;
            break;
          }
        }
      }
      if (!found && typeof targetValue === 'string') {
        const targetValueLower = targetValue.toLowerCase();
        for (const option of options) {
          if (option.textContent.toLowerCase().includes(targetValueLower)) {
            selectElement.value = option.value;
            found = true;
            break;
          }
        }
      }
      if (!found) {
        try {
          selectElement.value = targetValue;
        } catch (e) {
          console.error("Couldn't set select value:", e);
        }
      }
      return found;
    }
    function findFieldsByPattern(pattern, fields) {
      return fields.filter(field => {
        const name = field.name || '';
        const id = field.id || '';
        return pattern.test(name) || pattern.test(id);
      });
    }
    async function autofillForm(profile) {
      if (!profile) {
        console.error("No profile data provided");
        profile = sampleProfile;
        console.log("Using sample profile data");
      }
      window.derivedProfile = profile;
      console.log(`Autofilling form with profile: ${profile.name || profile.firstName || 'Unknown'}`);
      const fullName = getFullName(profile);
      profile.fullName = fullName; 
      await waitForElements('form, .dynamic-section, input, select, textarea');
      const formContainer = document.querySelector('#applicationForm') || 
                            document.querySelector('form') || 
                            document.body;
      if (formContainer) {
        observer.disconnect(); 
        observer.observe(formContainer, {
          childList: true,
          subtree: true
        });
      }
      const allFields = findFormFields();
      console.log(`Found ${allFields.length} form fields`);
      let filledCount = 0;
      let errors = [];

      // First, find all address-related fields and process them first
      const addressFields = allFields.filter(field => {
        const name = field.name || '';
        const id = field.id || '';
        const fieldType = determineFieldType(field);
        
        return fieldType && (
          fieldType === 'addressStreet' || 
          fieldType === 'addressLine2' || 
          fieldType === 'addressCity' || 
          fieldType === 'addressState' || 
          fieldType === 'addressPostalCode' || 
          fieldType === 'addressCountry'
        );
      });
      
      console.log(`Found ${addressFields.length} address fields to fill first`);
      
      // Fill address fields first
      addressFields.forEach(field => {
        try {
          const fieldType = determineFieldType(field);
          if (fieldType && profile[fieldType]) {
            console.log(`Filling address field ${fieldType} "${field.name || field.id}" with value: ${profile[fieldType]}`);
            if (fillField(field, profile[fieldType])) {
              filledCount++;
            }
          }
        } catch (error) {
          console.error(`Error filling address field ${field.name || field.id}:`, error);
        }
      });

      // Then process the rest of the fields
      // First, process name fields to establish context
      const nameFields = allFields.filter(field => {
        if (addressFields.includes(field)) return false;
        
        const fieldType = determineFieldType(field);
        return fieldType === 'firstName' || fieldType === 'lastName' || fieldType === 'middleName' || fieldType === 'fullName';
      });
      
      console.log(`Found ${nameFields.length} name-related fields to fill`);
      
      // Fill name fields first to establish context
      nameFields.forEach(field => {
        try {
          let fieldType = determineFieldType(field);
          const fieldName = field.name?.toLowerCase() || '';
          const fieldId = field.id?.toLowerCase() || '';
          
          // Extra validation to ensure last name fields are properly detected
          if ((fieldName.includes('last') || fieldName.includes('surname') || 
               fieldId.includes('last') || fieldId.includes('surname') ||
               /\blast[-_\s]*name\b|\bsurname\b/i.test(field.placeholder || '') ||
               /\blast[-_\s]*name\b|\bsurname\b/i.test(field.getAttribute('aria-label') || '')) &&
              fieldType !== 'lastName') {
            console.log(`Overriding field type for "${fieldName || fieldId}" from ${fieldType} to lastName`);
            fieldType = 'lastName';
          }
          
          if (fieldType === 'fullName' && fullName) {
            console.log(`Filling full name field with: ${fullName}`);
            if (fillField(field, fullName)) {
              filledCount++;
            }
          } else if (fieldType && profile[fieldType]) {
            console.log(`Filling ${fieldType} field with: ${profile[fieldType]}`);
            if (fillField(field, profile[fieldType])) {
              filledCount++;
            }
          }
        } catch (error) {
          console.error(`Error filling name field ${field.name || field.id}:`, error);
        }
      });

      // Then process the remaining fields
      allFields.forEach(field => {
        // Skip fields we've already processed
        if (addressFields.includes(field) || nameFields.includes(field)) {
          return;
        }
        
        try {
          const fieldType = determineFieldType(field);
          const fieldIdentifier = field.name?.toLowerCase() || field.id?.toLowerCase() || '';
          
          if (/\bcity\b|\btown\b|\bmunicipality\b/i.test(fieldIdentifier) && profile.addressCity) {
            console.log(`Filling city/town field "${fieldIdentifier}" with ${profile.addressCity}`);
            if (fillField(field, profile.addressCity)) {
              filledCount++;
              return;
            }
          }
          
          if (fieldType && profile[fieldType]) {
            // Skip address and name fields as they've already been handled
            if (fieldType.startsWith('address') || 
                fieldType === 'firstName' || 
                fieldType === 'lastName' || 
                fieldType === 'middleName' || 
                fieldType === 'fullName') {
              return;
            }
            
            if (fillField(field, profile[fieldType])) {
              filledCount++;
            }
          }
          
          const fieldName = field.name?.toLowerCase() || field.id?.toLowerCase() || '';
          if (/birth|dob|birthday/i.test(fieldName) && profile.dateOfBirth) {
            if (handleDateOfBirthField(field, profile.dateOfBirth)) {
              console.log(`Filled DOB field: ${fieldName} with ${profile.dateOfBirth}`);
              filledCount++;
            }
          }
          
          if (/gender|sex/i.test(fieldName) && profile.gender) {
            if (fillField(field, profile.gender)) {
              filledCount++;
            }
          }
        } catch (error) {
          console.error(`Error filling field ${field.name || field.id}:`, error);
          errors.push({
            fieldName: field.name || field.id,
            error: error.message
          });
        }
      });

      if (profile.education && Array.isArray(profile.education)) {
        profile.education.forEach((edu, index) => {
          console.log(`Processing education entry ${index}:`, edu);
          Object.entries(fieldPatterns.education).forEach(([fieldKey, patterns]) => {
            patterns.forEach(pattern => {
              const matchingFields = findFieldsByPattern(pattern, allFields);
              if (matchingFields.length > 0) {
                matchingFields.sort((a, b) => {
                  const aMatch = (a.name || a.id || '').match(/\d+/);
                  const bMatch = (b.name || b.id || '').match(/\d+/);
                  if (aMatch && bMatch) {
                    return parseInt(aMatch[0]) - parseInt(bMatch[0]);
                  }
                  return 0;
                });
                const targetField = matchingFields[index] || matchingFields[0];
                let valueToFill;
                switch (fieldKey) {
                  case 'institution':
                    valueToFill = edu.institution || edu.schoolName || edu.school || edu.university;
                    break;
                  case 'degree':
                    valueToFill = edu.degree || edu.qualification;
                    break;
                  case 'major':
                    valueToFill = edu.major || edu.field || edu.fieldOfStudy;
                    break;
                  case 'startDate':
                    valueToFill = edu.startDate || edu.from;
                    break;
                  case 'endDate':
                    valueToFill = edu.endDate || edu.graduationDate || edu.to;
                    break;
                  case 'gpa':
                    valueToFill = edu.gpa || edu.cgpa || edu.percentage;
                    break;
                  default:
                    valueToFill = edu[fieldKey];
                }
                if (valueToFill !== undefined && valueToFill !== null) {
                  if (fillField(targetField, valueToFill)) {
                    filledCount++;
                  }
                }
              }
            });
          });
        });
      }
      if (profile.experience && Array.isArray(profile.experience)) {
        profile.experience.forEach((exp, index) => {
          console.log(`Processing experience entry ${index}:`, exp);
          Object.entries(fieldPatterns.experience).forEach(([fieldKey, patterns]) => {
            patterns.forEach(pattern => {
              const matchingFields = findFieldsByPattern(pattern, allFields);
              if (matchingFields.length > 0) {
                matchingFields.sort((a, b) => {
                  const aMatch = (a.name || a.id || '').match(/\d+/);
                  const bMatch = (b.name || b.id || '').match(/\d+/);
                  if (aMatch && bMatch) {
                    return parseInt(aMatch[0]) - parseInt(bMatch[0]);
                  }
                  return 0;
                });
                const targetField = matchingFields[index] || matchingFields[0];
                let valueToFill;
                switch (fieldKey) {
                  case 'company':
                    valueToFill = exp.company || exp.employer || exp.organization || exp.companyName;
                    break;
                  case 'title':
                    valueToFill = exp.title || exp.position || exp.role || exp.jobTitle;
                    break;
                  case 'startDate':
                    valueToFill = exp.startDate || exp.from;
                    break;
                  case 'endDate':
                    valueToFill = exp.endDate || exp.to;
                    break;
                  case 'current':
                    valueToFill = exp.current || exp.isCurrent || exp.isPresent;
                    break;
                  default:
                    valueToFill = exp[fieldKey];
                }
                if (valueToFill !== undefined && valueToFill !== null) {
                  if (fillField(targetField, valueToFill)) {
                    filledCount++;
                  }
                }
              }
            });
          });
        });
      }
      const technicalSkillFields = allFields.filter(field => {
        const fieldName = field.name?.toLowerCase() || field.id?.toLowerCase() || '';
        return /technical|programming|hard[-_\s]*skill|technology|tools|expertise|tech[-_\s]*skill/i.test(fieldName);
      });
      const softSkillFields = allFields.filter(field => {
        const fieldName = field.name?.toLowerCase() || field.id?.toLowerCase() || '';
        return /soft[-_\s]*skill|interpersonal|communication[-_\s]*skill|people[-_\s]*skill/i.test(fieldName);
      });
      const genericSkillFields = allFields.filter(field => {
        const fieldName = field.name?.toLowerCase() || field.id?.toLowerCase() || '';
        const isTechnicalField = technicalSkillFields.some(techField => techField === field);
        const isSoftSkillField = softSkillFields.some(softField => softField === field);
        return /\bskill|competenc/i.test(fieldName) && 
               !isTechnicalField && 
               !isSoftSkillField;
      });
      if (profile.skills) {
        technicalSkillFields.forEach(field => {
          if (fillField(field, profile.skills)) {
            filledCount++;
          }
        });
      }
      if (profile.softSkills) {
        softSkillFields.forEach(field => {
          if (fillField(field, profile.softSkills)) {
            filledCount++;
          }
        });
      }
      genericSkillFields.forEach(field => {
        if (profile.skills && profile.softSkills) {
          const combinedSkills = `${profile.skills}, ${profile.softSkills}`;
          if (fillField(field, combinedSkills)) {
            filledCount++;
          }
        } else if (profile.skills) {
          if (fillField(field, profile.skills)) {
            filledCount++;
          }
        } else if (profile.softSkills) {
          if (fillField(field, profile.softSkills)) {
            filledCount++;
          }
        }
      });
      const dobFields = allFields.filter(field => {
        const id = field.id?.toLowerCase() || '';
        const name = field.name?.toLowerCase() || '';
        if (id === 'dateofbirth' || id === 'dob' || id === 'birthdate' || id === 'birthdate' ||
            name === 'dateofbirth' || name === 'dob' || name === 'birthdate' || name === 'birthdate') {
          return true;
        }
        if (field.id) {
          const label = document.querySelector(`label[for="${field.id}"]`);
          if (label && /birth|dob|birthday|born/i.test(label.textContent)) {
            return true;
          }
        }
        return /birth|dob|birthday|born/i.test(id) || /birth|dob|birthday|born/i.test(name);
      });
      if (profile.dateOfBirth && dobFields.length > 0) {
        console.log(`Found ${dobFields.length} DOB fields to fill with ${profile.dateOfBirth}`);
        dobFields.forEach(field => {
          if (field.type === 'date') {
            if (handleDateOfBirthField(field, profile.dateOfBirth)) {
              filledCount++;
              console.log(`Successfully filled DOB field: ${field.name || field.id}`);
            }
          } else {
            if (fillField(field, profile.dateOfBirth)) {
              filledCount++;
              console.log(`Filled non-date DOB field: ${field.name || field.id}`);
            }
          }
        });
      }
      allFields.forEach(field => {
        const fieldName = field.name?.toLowerCase() || field.id?.toLowerCase() || '';
        if (/available|start.*date|begin.*work/i.test(fieldName) && profile.availableStartDate) {
          fillField(field, profile.availableStartDate);
        }
        if (/cover|motivation|letter|statement/i.test(fieldName) && profile.coverLetter) {
          fillField(field, profile.coverLetter);
        }
        if (/about.*you|yourself|bio|introduction/i.test(fieldName) && profile.aboutYou) {
          fillField(field, profile.aboutYou);
        }
      });
      if (errors.length > 0) {
        const errorMessages = errors.map(err => `${err.fieldName || 'Unknown field'}: ${err.error || 'Unknown error'}`);
        console.warn(`Encountered ${errors.length} errors while filling fields:`, errorMessages);
      }
      console.log(`Filled ${filledCount} fields successfully`);
      return filledCount;
    }
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Content script received message:', message);
      try {
        if (message.action === 'autofill' && message.profile) {
          try {
            console.log('Starting autofill with profile:', message.profile.name);
            const filledCount = autofillForm(message.profile);
            const count = typeof filledCount === 'number' ? filledCount : 0;
            const hasForm = detectIfFormPage();
            const allFields = findFormFields();
            const response = {
              success: true,
              filledCount: count,
              message: count > 0 ? `Successfully filled ${count} fields` : 'No fields were filled',
              hasForm: hasForm,
              fieldsFound: allFields.length,
              possibleReason: !hasForm ? 'No form detected on page' : 
                              allFields.length === 0 ? 'No visible form fields found' : 
                              'No matching fields found that could be filled with your profile data'
            };
            console.log('Sending autofill response:', response);
            sendResponse(response);
          } catch (error) {
            console.error('Error during autofill:', error);
            sendResponse({
              success: false,
              filledCount: 0,
              message: `Error: ${error.message}`,
              hasForm: detectIfFormPage()
            });
          }
          return true;
        }
        if (message.action === 'ping') {
          sendResponse({ success: true, message: 'Content script is active' });
          return true;
        }
        if (message.action === 'checkForForm') {
          const hasForm = detectIfFormPage();
          const allFields = findFormFields();
          sendResponse({ 
            hasForm: hasForm,
            fieldsFound: allFields.length,
            message: hasForm ? `Form detected with ${allFields.length} fields` : 'No form detected on page'
          });
          return true;
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ 
          success: false, 
          message: `Error processing message: ${error.message}`,
          error: error.message
        });
        return true;
      }
      return false;
    });
    const detectIfFormPage = () => {
      const forms = document.querySelectorAll('form');
      const formsWithFields = Array.from(forms).filter(form => 
        form.querySelectorAll('input, select, textarea').length > 0
      );
      if (formsWithFields.length > 0) {
        console.log(`Form detection: Found ${formsWithFields.length} form elements with input fields`);
        return true;
      }
      const inputFields = document.querySelectorAll('input, select, textarea');
      const visibleInputFields = Array.from(inputFields).filter(field => {
        const style = window.getComputedStyle(field);
        return field.type !== 'hidden' && 
               style.display !== 'none' && 
               style.visibility !== 'hidden' &&
               field.offsetParent !== null;
      });
      const textInputs = Array.from(inputFields).filter(field => 
        field.type === 'text' || 
        field.type === 'email' || 
        field.type === 'tel' || 
        field.tagName.toLowerCase() === 'textarea'
      );
      const hasSubmitButton = document.querySelector('button[type="submit"], input[type="submit"]') !== null;
      const pageText = document.body.innerText.toLowerCase();
      const hasJobTerms = /job application|apply|submit application|application form|resume|cv|cover letter/i.test(pageText);
      console.log(`Form detection: Found ${visibleInputFields.length} visible input fields, ${textInputs.length} text inputs, submit button: ${hasSubmitButton}, job terms: ${hasJobTerms}`);
      if (visibleInputFields.length >= 4) return true;
      if (textInputs.length >= 2 && hasSubmitButton) return true;
      if (visibleInputFields.length >= 2 && hasSubmitButton && hasJobTerms) return true;
      return false;
    };
    if (detectIfFormPage()) {
      console.log('Form detected, sending formDetected message');
      chrome.runtime.sendMessage({
        action: 'formDetected',
        url: window.location.href
      }, response => {
        if (chrome.runtime.lastError) {
          console.error('Error sending formDetected message:', chrome.runtime.lastError);
        } else {
          console.log('Form detection response:', response);
        }
      });
    }
  } catch (e) {
    console.error('Error in content script initialization:', e);
    
    // Even if initialization fails, ensure we can respond to pings
    // This is a fallback in case the initial ping handler setup also failed
    if (!window.applyFlowManagerPingListener) {
      try {
        console.log('Setting up emergency ping listener after initialization failure');
        window.applyFlowManagerPingListener = true;
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (message.action === 'ping') {
            console.log('Emergency ping handler responding');
            sendResponse({ 
              success: true, 
              message: 'Content script is present but initialization failed',
              error: e.message,
              initialized: false
            });
            return true;
          }
          
          if (message.action === 'checkForForm') {
            sendResponse({ 
              hasForm: false,
              fieldsFound: 0,
              message: 'Content script failed to initialize properly',
              error: e.message
            });
            return true;
          }
          
          if (message.action === 'autofill') {
            sendResponse({
              success: false,
              filledCount: 0,
              message: 'Content script is not fully initialized',
              hasForm: false,
              fieldsFound: 0,
              possibleReason: 'Content script initialization failed: ' + e.message
            });
            return true;
          }
          
          return false;
        });
      } catch (pingError) {
        console.error('Fatal error: Could not set up ping listener after initialization error:', pingError);
      }
    }
  }
})(); 