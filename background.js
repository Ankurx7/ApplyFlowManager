const STORAGE_KEY_PROFILES = 'smart_job_autofill_profiles';
const STORAGE_KEY_SELECTED_PROFILE_ID = 'selectedProfileId';
const STORAGE_KEY_JOB_SEARCH_HISTORY = 'jobSearchHistory';
const STORAGE_KEY_LAST_JOB_SEARCH = 'lastJobSearch';
const JOB_SEARCH_SITES = [
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs/search/?keywords={query}&location={location}',
    enabled: true
  },
  {
    name: 'Indeed',
    url: 'https://www.indeed.com/jobs?q={query}&l={location}',
    enabled: true
  },
  {
    name: 'Glassdoor',
    url: 'https://www.glassdoor.com/Job/jobs.htm?sc.keyword={query}&locT=C&locId=1147401&locKeyword={location}',
    enabled: true
  },
  {
    name: 'Monster',
    url: 'https://www.monster.com/jobs/search/?q={query}&where={location}',
    enabled: true
  },
  {
    name: 'ZipRecruiter',
    url: 'https://www.ziprecruiter.com/candidate/search?search={query}&location={location}',
    enabled: true
  },
  {
    name: 'SimplyHired',
    url: 'https://www.simplyhired.com/search?q={query}&l={location}',
    enabled: true
  }
];
const tabsWithContentScript = new Set();
const formDetectedTabs = new Map();
try {
  setTimeout(() => {
    if (typeof chrome !== 'undefined' && chrome.contextMenus) {
      initializeContextMenus();
    }
  }, 100);
} catch (error) {
  console.error('Error initializing context menu:', error);
}
async function getProfiles() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY_PROFILES);
    return result[STORAGE_KEY_PROFILES] || [];
  } catch (error) {
    console.error('Error getting profiles:', error);
    return [];
  }
}
async function saveProfiles(profiles) {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY_PROFILES]: profiles });
    return true;
  } catch (error) {
    console.error('Error saving profiles:', error);
    return false;
  }
}
async function getSelectedProfileId() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY_SELECTED_PROFILE_ID);
    return result[STORAGE_KEY_SELECTED_PROFILE_ID] || null;
  } catch (error) {
    console.error('Error getting selected profile ID:', error);
    return null;
  }
}
async function getProfileById(profileId) {
  const profiles = await getProfiles();
  return profiles.find(profile => profile.id === profileId) || null;
}
async function isContentScriptLoaded(tabId) {
  if (tabsWithContentScript.has(tabId)) {
    return true;
  }
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        if (response && response.success) {
          tabsWithContentScript.add(tabId);
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } catch (e) {
      resolve(false);
    }
    setTimeout(() => resolve(false), 300);
  });
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  if (message.action === 'autofill') {
    handleAutofill(message.tabId || (sender.tab && sender.tab.id), sendResponse);
    return true; 
  }
  if (message.action === 'formDetected') {
    if (sender.tab) {
      handleFormDetection(sender.tab.id, message.url);
    }
    sendResponse({ success: true });
    return false;
  }
  if (message.action === 'contentScriptLoaded') {
    if (sender.tab) {
      tabsWithContentScript.add(sender.tab.id);
    }
    console.log('Content script loaded on:', message.url);
    sendResponse({ success: true });
    return false;
  }
  if (message.action === 'searchJobs') {
    handleJobSearch(message.keywords, message.location, message.sites, sender.tab && sender.tab.id);
    sendResponse({ success: true });
    return false;
  }
  if (message.action === 'pingContentScript') {
    pingContentScript(message.tabId)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message || 'Unknown error' });
      });
    return true; 
  }
  sendResponse({ success: false, error: 'Unknown message action' });
  return false;
});
async function importSampleProfiles(sampleProfiles, sendResponse) {
  try {
    const existingProfiles = await getProfiles();
    const mergedProfiles = [...existingProfiles];
    for (const profile of sampleProfiles) {
      const existingIndex = mergedProfiles.findIndex(p => p.id === profile.id);
      if (existingIndex >= 0) {
        mergedProfiles[existingIndex] = profile;
      } else {
        mergedProfiles.push(profile);
      }
    }
    const success = await saveProfiles(mergedProfiles);
    const selectedProfileId = await getSelectedProfileId();
    if (!selectedProfileId && mergedProfiles.length > 0) {
      await chrome.storage.sync.set({ selectedProfileId: mergedProfiles[0].id });
    }
    if (sendResponse) {
      sendResponse({ 
        success, 
        profiles: mergedProfiles,
        message: success ? 'Sample profiles imported successfully' : 'Failed to import sample profiles',
        profileCount: mergedProfiles.length
      });
    }
    return mergedProfiles;
  } catch (error) {
    console.error('Error importing sample profiles:', error);
    if (sendResponse) {
      sendResponse({ 
        success: false, 
        error: error.message || 'Unknown error importing profiles' 
      });
    }
    return null;
  }
}
async function handleAutofill(tabId, sendResponse = null) {
  try {
    console.log('Starting autofill process for tab:', tabId);
    if (!tabId) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        tabId = tabs[0].id;
        console.log('Using active tab ID:', tabId);
      }
    }
    if (!tabId) {
      const response = { 
        success: false, 
        message: 'No tab specified for autofill',
        filledCount: 0
      };
      console.error('No tab ID for autofill');
      if (sendResponse) sendResponse(response);
      return;
    }
    const result = await chrome.storage.sync.get(STORAGE_KEY_SELECTED_PROFILE_ID);
    const selectedProfileId = result[STORAGE_KEY_SELECTED_PROFILE_ID];
    console.log('Selected profile ID:', selectedProfileId);
    if (!selectedProfileId) {
      const response = { 
        success: false, 
        message: 'No profile selected. Please select a profile first.',
        filledCount: 0
      };
      console.error('No profile selected for autofill');
      if (sendResponse) sendResponse(response);
      return;
    }
    const profilesResult = await chrome.storage.sync.get(STORAGE_KEY_PROFILES);
    const profiles = profilesResult[STORAGE_KEY_PROFILES] || [];
    console.log(`Found ${profiles.length} profiles`);
    const selectedProfile = profiles.find(profile => profile.id === selectedProfileId);
    console.log('Selected profile:', selectedProfile ? selectedProfile.name || 'Unnamed' : 'Not found');
    if (!selectedProfile) {
      const response = { 
        success: false, 
        message: 'Selected profile not found.',
        filledCount: 0
      };
      console.error('Selected profile not found');
      if (sendResponse) sendResponse(response);
      return;
    }
    try {
      let contentScriptReady = false;
      let attempts = 0;
      const maxAttempts = 3;

      console.log('Pinging content script in tab:', tabId);
      const pingResult = await pingContentScript(tabId);
      console.log('Ping result:', pingResult);
      
      if (pingResult.success) {
        console.log('Content script already loaded');
        contentScriptReady = true;
      } else {
        console.log('Content script not ready, trying to inject it');
        
        // Get the URL of the tab to check if it's a special URL
        const urlResult = await chrome.tabs.get(tabId);
        const url = urlResult.url || '';
        
        // Skip injection for special URLs
        if (url.startsWith('chrome://') || url.startsWith('edge://') || 
            url.startsWith('about:') || url.startsWith('chrome-extension://')) {
          console.log('Skipping injection for special URL:', url);
        } else {
          while (!contentScriptReady && attempts < maxAttempts) {
            attempts++;
            console.log(`Content script injection attempt ${attempts}/${maxAttempts}`);
            
            try {
              console.log('Injecting content script into:', url);
              await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
              });
              
              // Increase timeout for content script initialization
              const waitTime = 2000 + (attempts * 1000); // Progressively increase wait time
              console.log(`Waiting ${waitTime}ms for content script to initialize`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              
              // Try to ping the content script
              const pingAfterInject = await pingContentScript(tabId);
              contentScriptReady = pingAfterInject.success;
              
              if (contentScriptReady) {
                console.log('Content script successfully initialized on attempt', attempts);
                break;
              }
              
              // If this was the final regular attempt, try reloading the page as a last resort
              if (attempts === maxAttempts - 1 && !contentScriptReady) {
                console.log('Content script still not ready, attempting tab reload as last resort');
                await chrome.tabs.reload(tabId);
                // Wait longer for page to load and content script to initialize
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            } catch (injectionError) {
              console.error(`Error in injection attempt ${attempts}:`, injectionError);
            }
          }
        }
      }
      
      if (contentScriptReady) {
        console.log('Content script is ready, sending profile to tab');
        try {
          const response = await sendMessageWithTimeout(tabId, {
            action: 'autofill',
            profile: selectedProfile
          }, 8000); // Increase timeout from 5000 to 8000ms
          
          console.log('Autofill response from content script:', response);
          const validatedResponse = {
            success: response?.success === true,
            message: response?.message || 'Unknown response from content script',
            filledCount: typeof response?.filledCount === 'number' ? response.filledCount : 0,
            hasForm: response?.hasForm === true,
            fieldsFound: typeof response?.fieldsFound === 'number' ? response.fieldsFound : 0,
            possibleReason: response?.possibleReason || 'No fields were filled'
          };
          if (sendResponse) sendResponse(validatedResponse);
        } catch (error) {
          console.error('Error sending message to tab:', error);
          if (sendResponse) sendResponse({ 
            success: false, 
            message: 'Error sending profile to content script: ' + (error.message || 'Unknown error'),
            filledCount: 0,
            hasForm: false,
            fieldsFound: 0,
            possibleReason: 'Error communicating with page'
          });
        }
      } else {
        console.error('Content script could not be initialized after multiple attempts');
        
        // Show notification to user about the initialization failure
        try {
          const tab = await chrome.tabs.get(tabId);
          showInitializationFailureNotification(tabId, tab.url);
        } catch (error) {
          console.error('Error getting tab info for notification:', error);
        }
        
        if (sendResponse) sendResponse({
          success: false,
          message: 'Content script could not be initialized. Please try reloading the page manually and try again.',
          filledCount: 0,
          hasForm: false,
          fieldsFound: 0,
          possibleReason: 'Content script initialization failed after multiple attempts'
        });
      }
    } catch (error) {
      console.error('Error in content script handling:', error);
      if (sendResponse) sendResponse({ 
        success: false, 
        message: 'Error with content script: ' + (error.message || 'Unknown error'),
        filledCount: 0,
        hasForm: false,
        fieldsFound: 0,
        possibleReason: 'Content script error'
      });
    }
  } catch (error) {
    console.error('Error in handleAutofill:', error);
    if (sendResponse) sendResponse({ 
      success: false, 
      message: 'Error in autofill process: ' + (error.message || 'Unknown error'),
      filledCount: 0,
      hasForm: false,
      fieldsFound: 0,
      possibleReason: 'Internal extension error'
    });
  }
}
function sendMessageWithTimeout(tabId, message, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    let timeout;
    let hasResolved = false;
    timeout = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        reject(new Error(`Message to tab ${tabId} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
    try {
      chrome.tabs.sendMessage(tabId, message, response => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          if (!hasResolved) {
            hasResolved = true;
            reject(new Error(chrome.runtime.lastError.message || 'Unknown error'));
          }
          return;
        }
        if (!hasResolved) {
          hasResolved = true;
          resolve(response);
        }
      });
    } catch (error) {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(timeout);
        reject(error);
      }
    }
  });
}
function handleFormDetection(tabId, url) {
  if (!tabId) return;
  try {
    chrome.action.setBadgeText({
      text: 'FORM',
      tabId
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#4CAF50',
      tabId
    });
    chrome.action.setTitle({
      title: 'ApplyFlow Manager - Form Detected',
      tabId
    });
    formDetectedTabs.set(tabId, url);
  } catch (error) {
    console.error('Error setting badge:', error);
  }
}
async function pingContentScript(tabId) {
  if (!tabId) {
    return { success: false, error: 'No tab ID provided' };
  }
  try {
    return new Promise((resolve) => {
      const timeoutDuration = 3000; // Increase timeout from 1500 to 3000ms
      const timeoutId = setTimeout(() => {
        console.log(`Content script ping timed out after ${timeoutDuration}ms`);
        resolve({ success: false, error: 'Content script ping timed out' });
      }, timeoutDuration);
      
      try {
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
          clearTimeout(timeoutId); // Clear the timeout
          
          if (chrome.runtime.lastError) {
            console.log('Ping error:', chrome.runtime.lastError.message);
            resolve({ success: false, error: chrome.runtime.lastError.message });
            return;
          }
          
          if (response && response.success) {
            tabsWithContentScript.add(tabId);
            resolve({ success: true });
          } else {
            resolve({ 
              success: false, 
              error: 'Invalid response from content script',
              response: response
            });
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Exception in pingContentScript:', error);
        resolve({ 
          success: false, 
          error: error.message || 'Exception during ping'
        });
      }
    });
  } catch (error) {
    return { success: false, error: error.message || 'Unknown error in ping function' };
  }
}
function openProfileEditor(profileId = null) {
  const url = chrome.runtime.getURL('profile-editor.html') + (profileId ? `?profileId=${profileId}` : '');
  chrome.tabs.create({ url });
}
function openJobSearch() {
  const url = chrome.runtime.getURL('job-search.html');
  chrome.tabs.create({ url });
}
async function handleJobSearch(keywords, location, sites, sourceTabId) {
  try {
    const { [STORAGE_KEY_JOB_SEARCH_HISTORY]: history = [] } = await chrome.storage.sync.get(STORAGE_KEY_JOB_SEARCH_HISTORY);
    const searchData = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      keywords,
      location,
      sites: sites.map(s => s.name)
    };
    const updatedHistory = [searchData, ...history].slice(0, 10);
    await chrome.storage.sync.set({
      [STORAGE_KEY_JOB_SEARCH_HISTORY]: updatedHistory,
      [STORAGE_KEY_LAST_JOB_SEARCH]: searchData
    });
    sites.forEach(site => {
      if (site.enabled) {
        const searchUrl = site.url
          .replace('{query}', encodeURIComponent(keywords))
          .replace('{location}', encodeURIComponent(location));
        chrome.tabs.create({ url: searchUrl });
      }
    });
  } catch (error) {
    console.error('Error in handleJobSearch:', error);
  }
}
function initializeContextMenus() {
  if (typeof chrome === 'undefined' || !chrome.contextMenus) {
    console.error('contextMenus API is not available');
    return;
  }
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'applyflow_manager',
        title: 'ApplyFlow Manager',
        contexts: ['page']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error creating parent menu:', chrome.runtime.lastError);
          return;
        }
        const menuItems = [
          {
            id: 'autofill_current_page',
            title: 'Auto-fill Current Page',
            parentId: 'applyflow_manager'
          },
          {
            id: 'search_jobs',
            title: 'Search Jobs',
            parentId: 'applyflow_manager'
          },
          {
            id: 'edit_profile',
            title: 'Edit Profile',
            parentId: 'applyflow_manager'
          }
        ];
        menuItems.forEach(item => {
          chrome.contextMenus.create(
            {
              id: item.id,
              title: item.title,
              parentId: item.parentId,
              contexts: ['page']
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error(`Error creating menu item ${item.id}:`, chrome.runtime.lastError);
              }
            }
          );
        });
        if (chrome.contextMenus.onClicked) {
          chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
        }
      });
    });
  } catch (error) {
    console.error('Error setting up context menus:', error);
  }
}
function handleContextMenuClick(info, tab) {
  if (!tab || !tab.id) return;
  try {
    if (info.menuItemId === 'autofill_current_page') {
      handleAutofill(tab.id);
    } else if (info.menuItemId === 'search_jobs') {
      openJobSearch();
    } else if (info.menuItemId === 'edit_profile') {
      openProfileEditor();
    }
  } catch (error) {
    console.error('Error handling context menu click:', error);
  }
}
chrome.tabs.onRemoved.addListener((tabId) => {
  tabsWithContentScript.delete(tabId);
  formDetectedTabs.delete(tabId);
});
chrome.runtime.onInstalled.addListener((details) => {
  console.log('ApplyFlow Manager extension installed/updated');
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      jobSearchSites: JOB_SEARCH_SITES
    });
    if (chrome.notifications) {
      try {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/A_F_LOGO.png',
          title: 'ApplyFlow Manager Installed',
          message: 'Thank you for installing ApplyFlow Manager! Click on the extension icon to get started.'
        });
      } catch (error) {
        console.error('Error creating notification:', error);
      }
    }
  }
  initializeContextMenus();
});
function showInitializationFailureNotification(tabId, url) {
  try {
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/A_F_LOGO.png',
        title: 'ApplyFlow Manager: Initialization Issue',
        message: 'Content script could not be initialized on this page. Try refreshing the page or check if the site allows extensions.'
      });
    }
    
    // Also update the badge to show an error state
    chrome.action.setBadgeText({
      text: 'ERR',
      tabId
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#e74c3c',
      tabId
    });
    chrome.action.setTitle({
      title: 'ApplyFlow Manager - Initialization Failed',
      tabId
    });
    
    console.error(`Content script initialization failed for tab ${tabId} (${url})`);
  } catch (error) {
    console.error('Error showing initialization failure notification:', error);
  }
} 