const STORAGE_KEY = 'smart_job_autofill_profiles';
let profilesDropdown;
let noProfilesElement;
let profilesContainerElement;
let newProfileButton;
let editProfileButton;
let deleteProfileButton;
let autofillButton;
let jobSearchButton;
let importSampleButton;
let statusIndicator;
const sampleProfiles = [
  {
    "id": "profile1",
    "name": "Jane Doe",
    "firstName": "Jane",
    "middleName": "A.",
    "lastName": "Doe",
    "email": "jane.doe@example.com",
    "phone": "+1234567890",
    "addressStreet": "123 Main St",
    "addressCity": "Springfield",
    "addressState": "IL",
    "addressPostalCode": "62704",
    "addressCountry": "USA",
    "portfolio": "https://janedoe.dev",
    "linkedin": "https://linkedin.com/in/janedoe",
    "github": "https://github.com/janedoe",
    "experienceLevel": "mid",
    "preferredCountry": "india",
    "education": [
      {
        "schoolName": "State University",
        "degree": "B.Sc.",
        "fieldOfStudy": "Computer Science",
        "startDate": "2012-08-01",
        "endDate": "2016-05-15"
      },
      {
        "schoolName": "Tech Institute",
        "degree": "M.Sc.",
        "fieldOfStudy": "Software Engineering",
        "startDate": "2017-09-01",
        "endDate": "2019-06-30"
      }
    ],
    "workExperience": [
      {
        "companyName": "Tech Corp",
        "role": "Frontend Developer",
        "startDate": "2019-07-01",
        "endDate": "2022-12-31",
        "noticePeriod": "1 month",
        "roleDescription": "Developed React applications with TailwindCSS."
      },
      {
        "companyName": "Innovatech",
        "role": "Senior Developer",
        "startDate": "2023-01-01",
        "endDate": "Present",
        "noticePeriod": "2 months",
        "roleDescription": "Leading frontend team and building scalable web apps."
      }
    ]
  }
];
async function getProfiles() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}
async function saveProfiles(profiles) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: profiles }, () => {
      resolve();
    });
  });
}
async function getSelectedProfileId() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('selectedProfileId', (result) => {
      resolve(result.selectedProfileId || null);
    });
  });
}
async function setSelectedProfileId(profileId) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ selectedProfileId: profileId }, () => {
      resolve();
    });
  });
}
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
function openProfileEditor(profileId = null) {
  let url = chrome.runtime.getURL('profile-editor.html');
  if (profileId) {
    url += `?profileId=${encodeURIComponent(profileId)}`;
  }
  chrome.tabs.create({ url });
}
async function deleteProfile(profileId) {
  if (!confirm("Are you sure you want to delete this profile?")) return;
  const profiles = await getProfiles();
  const filteredProfiles = profiles.filter(p => p.id !== profileId);
  await saveProfiles(filteredProfiles);
  const selectedProfileId = await getSelectedProfileId();
  if (selectedProfileId === profileId) {
    await setSelectedProfileId(filteredProfiles.length > 0 ? filteredProfiles[0].id : null);
  }
  refreshUI();
}
function importSampleProfiles() {
  chrome.runtime.sendMessage(
    {
      action: 'importSampleProfiles',
      profiles: sampleProfiles
    },
    (response) => {
      if (chrome.runtime.lastError) {
        alert(`Error: ${chrome.runtime.lastError.message}`);
        return;
      }
      if (response && response.success) {
        alert(`Successfully imported ${sampleProfiles.length} sample profiles`);
        refreshUI();
      } else {
        alert(response ? response.message : 'Failed to import sample profiles');
      }
    }
  );
}
async function populateProfilesDropdown() {
  const profiles = await getProfiles();
  const selectedProfileId = await getSelectedProfileId();
  profilesDropdown.innerHTML = '';
  profiles.forEach(profile => {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = profile.name;
    option.selected = profile.id === selectedProfileId;
    profilesDropdown.appendChild(option);
  });
  const hasProfiles = profiles.length > 0;
  editProfileButton.disabled = !hasProfiles;
  deleteProfileButton.disabled = !hasProfiles;
  autofillButton.disabled = !hasProfiles;
  jobSearchButton.disabled = !hasProfiles;
}
async function refreshUI() {
  const profiles = await getProfiles();
  if (profiles.length === 0) {
    noProfilesElement.style.display = 'block';
    profilesContainerElement.style.display = 'none';
  } else {
    noProfilesElement.style.display = 'none';
    profilesContainerElement.style.display = 'block';
    populateProfilesDropdown();
  }
}
function triggerAutofill() {
  updateStatus('Attempting to autofill form...', 'info');
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs.length === 0) {
      updateStatus('No active tab found', 'error');
      return;
    }
    const activeTab = tabs[0];
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content.js']
      }).catch(err => {
        console.log('Content script may already be loaded or cannot be injected on this page', err);
      });
      chrome.runtime.sendMessage({
        action: 'autofill',
        tabId: activeTab.id
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error during autofill:', chrome.runtime.lastError);
          updateStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
          return;
        }
        if (response && response.success) {
          let filledCount = 0;
          if (typeof response.filledCount === 'number') {
            filledCount = response.filledCount;
          } else if (response.filledCount !== undefined) {
            const parsed = parseInt(response.filledCount);
            if (!isNaN(parsed)) {
              filledCount = parsed;
            }
          }
          if (filledCount > 0) {
            updateStatus(`Successfully filled ${filledCount} fields`, 'success');
          } else {
            if (response.hasForm === false) {
              updateStatus('No form detected on this page. Try a job application page.', 'warning');
            } else if (response.fieldsFound === 0) {
              updateStatus('No visible form fields found on this page.', 'warning');
            } else {
              updateStatus('No matching fields found for your profile data.', 'warning');
            }
          }
        } else if (response) {
          updateStatus(response.message || 'Failed to autofill form', 'error');
        } else {
          updateStatus('No response from background script', 'error');
        }
      });
    } catch (error) {
      console.error('Error during autofill process:', error);
      updateStatus(`Error: ${error.message || 'Unknown error during autofill'}`, 'error');
    }
  });
}
function updateStatus(message, type = 'info') {
  if (!statusIndicator) return;
  statusIndicator.textContent = message;
  statusIndicator.className = 'status-indicator';
  statusIndicator.classList.add(`status-${type}`);
  statusIndicator.style.display = 'block';
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusIndicator.style.opacity = '0';
      setTimeout(() => {
        statusIndicator.style.display = 'none';
        statusIndicator.style.opacity = '1';
      }, 500);
    }, 3000);
  }
}
function openJobSearch() {
  getSelectedProfileId().then(selectedProfileId => {
    if (!selectedProfileId) {
      alert('Please select a profile first');
      return;
    }
    let url = chrome.runtime.getURL('job-search.html');
    url += `?country=india`;
    chrome.tabs.create({ url });
  });
}
function initialize() {
  noProfilesElement = document.getElementById('no-profiles');
  profilesContainerElement = document.getElementById('profiles-container');
  profilesDropdown = document.getElementById('profiles-dropdown');
  newProfileButton = document.getElementById('new-profile-btn');
  editProfileButton = document.getElementById('edit-profile-btn');
  deleteProfileButton = document.getElementById('delete-profile-btn');
  autofillButton = document.getElementById('autofill-btn');
  jobSearchButton = document.getElementById('job-search-btn');
  importSampleButton = document.createElement('button');
  importSampleButton.textContent = 'Import Sample Profile';
  importSampleButton.style.marginTop = '8px';
  noProfilesElement.appendChild(importSampleButton);
  statusIndicator = document.createElement('div');
  statusIndicator.className = 'status-indicator';
  statusIndicator.style.display = 'none';
  document.body.appendChild(statusIndicator);
  const style = document.createElement('style');
  style.textContent = `
    .status-indicator {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 8px 12px;
      font-size: 13px;
      text-align: center;
      transition: opacity 0.3s ease;
      z-index: 1000;
    }
    .status-info {
      background-color: #e8f1ff;
      color: #0051cc;
    }
    .status-success {
      background-color: #e6f6ed;
      color: #00703c;
    }
    .status-warning {
      background-color: #fff8e6;
      color: #925c00;
    }
    .status-error {
      background-color: #ffebe6;
      color: #c42b1c;
    }
  `;
  document.head.appendChild(style);
  document.getElementById('create-profile').addEventListener('click', () => {
    openProfileEditor();
  });
  newProfileButton.addEventListener('click', () => {
    openProfileEditor();
  });
  editProfileButton.addEventListener('click', async () => {
    const selectedProfileId = await getSelectedProfileId();
    if (selectedProfileId) {
      openProfileEditor(selectedProfileId);
    } else {
      updateStatus('Please select a profile first', 'warning');
    }
  });
  deleteProfileButton.addEventListener('click', async () => {
    const selectedProfileId = await getSelectedProfileId();
    if (selectedProfileId) {
      deleteProfile(selectedProfileId);
    } else {
      updateStatus('Please select a profile first', 'warning');
    }
  });
  importSampleButton.addEventListener('click', importSampleProfiles);
  profilesDropdown.addEventListener('change', async () => {
    await setSelectedProfileId(profilesDropdown.value);
    refreshUI();
  });
  autofillButton.addEventListener('click', triggerAutofill);
  jobSearchButton.addEventListener('click', openJobSearch);
  refreshUI();
}
document.addEventListener('DOMContentLoaded', initialize); 