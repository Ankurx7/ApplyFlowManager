const STORAGE_KEY = 'smart_job_autofill_profiles';
const profileForm = document.getElementById('profile-form');
const formTitle = document.getElementById('form-title');
const addEducationBtn = document.getElementById('add-education');
const addExperienceBtn = document.getElementById('add-experience');
const educationContainer = document.getElementById('education-container');
const experienceContainer = document.getElementById('experience-container');
const cancelBtn = document.getElementById('cancel-btn');
const jobRoleInput = document.getElementById('jobRole');
const experienceLevelSelect = document.getElementById('experienceLevel');
const skillsInput = document.getElementById('skills');
const softSkillsInput = document.getElementById('softSkills');
let currentProfileId = null;
let educationCounter = 0;
let experienceCounter = 0;
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
function addEducationItem(data = null) {
  const template = document.getElementById('education-template').innerHTML;
  const itemHtml = template.replace(/{index}/g, educationCounter);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = itemHtml;
  const itemElement = tempDiv.firstElementChild;
  educationContainer.appendChild(itemElement);
  if (data) {
    document.getElementById(`education-school-${educationCounter}`).value = data.schoolName || '';
    document.getElementById(`education-degree-${educationCounter}`).value = data.degree || '';
    document.getElementById(`education-field-${educationCounter}`).value = data.fieldOfStudy || '';
    document.getElementById(`education-gpa-${educationCounter}`).value = data.gpa || '';
    document.getElementById(`education-location-${educationCounter}`).value = data.location || '';
    document.getElementById(`education-description-${educationCounter}`).value = data.description || '';
    document.getElementById(`education-start-${educationCounter}`).value = formatDateForInput(data.startDate);
    document.getElementById(`education-end-${educationCounter}`).value = formatDateForInput(data.endDate);
  }
  itemElement.querySelector('.remove-btn').addEventListener('click', function() {
    itemElement.remove();
  });
  educationCounter++;
}
function addExperienceItem(data = null) {
  const template = document.getElementById('experience-template').innerHTML;
  const itemHtml = template.replace(/{index}/g, experienceCounter);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = itemHtml;
  const itemElement = tempDiv.firstElementChild;
  experienceContainer.appendChild(itemElement);
  if (data) {
    document.getElementById(`experience-company-${experienceCounter}`).value = data.companyName || '';
    document.getElementById(`experience-role-${experienceCounter}`).value = data.role || '';
    document.getElementById(`experience-location-${experienceCounter}`).value = data.location || '';
    document.getElementById(`experience-start-${experienceCounter}`).value = formatDateForInput(data.startDate);
    document.getElementById(`experience-end-${experienceCounter}`).value = formatDateForInput(data.endDate);
    document.getElementById(`experience-description-${experienceCounter}`).value = data.description || '';
    document.getElementById(`experience-responsibilities-${experienceCounter}`).value = data.responsibilities || '';
    const currentSelect = document.getElementById(`experience-current-${experienceCounter}`);
    if (currentSelect) {
      const isCurrent = 
        data.current === true || 
        data.current === 'true' || 
        (data.endDate === '' && data.startDate) || 
        data.endDate === 'Present';
      currentSelect.value = isCurrent ? 'true' : 'false';
    }
  }
  itemElement.querySelector('.remove-btn').addEventListener('click', function() {
    itemElement.remove();
  });
  experienceCounter++;
}
function formatDateForInput(dateString) {
  if (!dateString) return '';
  if (dateString && typeof dateString === 'string' && dateString.toLowerCase() === 'present') {
    return '';
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
}
function formatDateForStorage(dateString) {
  if (!dateString) return '';
  return dateString;
}
function parseSkills(skillsStr) {
  if (!skillsStr) return [];
  return skillsStr.split(',')
    .map(skill => skill.trim())
    .filter(skill => skill.length > 0);
}
function formatSkills(skillsArray) {
  if (!skillsArray || !Array.isArray(skillsArray)) return '';
  return skillsArray.join(', ');
}
function determineExperienceLevel(workExperience) {
  if (!workExperience || !Array.isArray(workExperience) || workExperience.length === 0) {
    return 'fresher';
  }
  let totalYears = 0;
  workExperience.forEach(exp => {
    let endDate = exp.endDate === 'Present' ? new Date() : new Date(exp.endDate);
    let startDate = new Date(exp.startDate);
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
      totalYears += years;
    }
  });
  if (totalYears < 2) {
    return 'fresher';
  } else if (totalYears < 5) {
    return 'mid';
  } else {
    return 'senior';
  }
}
function getPrimaryRole(workExperience) {
  if (!workExperience || !Array.isArray(workExperience) || workExperience.length === 0) {
    return '';
  }
  const sortedExperience = [...workExperience].sort((a, b) => {
    const aDate = a.endDate === 'Present' ? new Date() : new Date(a.endDate);
    const bDate = b.endDate === 'Present' ? new Date() : new Date(b.endDate);
    return bDate - aDate;
  });
  return sortedExperience[0].role || '';
}
async function loadProfile(profileId) {
  const profiles = await getProfiles();
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) {
    alert('Profile not found');
    window.close();
    return;
  }
  formTitle.textContent = `Edit Profile: ${profile.name}`;
  document.getElementById('name').value = profile.name || '';
  document.getElementById('firstName').value = profile.firstName || '';
  document.getElementById('middleName').value = profile.middleName || '';
  document.getElementById('lastName').value = profile.lastName || '';
  document.getElementById('preferredName').value = profile.preferredName || '';
  document.getElementById('email').value = profile.email || '';
  document.getElementById('phone').value = profile.phone || '';
  document.getElementById('dateOfBirth').value = formatDateForInput(profile.dateOfBirth || '');
  const genderSelect = document.getElementById('gender');
  if (profile.gender && genderSelect) {
    const genderOptions = Array.from(genderSelect.options);
    const match = genderOptions.find(opt => 
      opt.value.toLowerCase() === profile.gender.toLowerCase() || 
      opt.textContent.toLowerCase() === profile.gender.toLowerCase()
    );
    if (match) {
      genderSelect.value = match.value;
    } else if (genderOptions.length > 0) {
      genderSelect.value = profile.gender;
    }
  }
  document.getElementById('addressStreet').value = profile.addressStreet || '';
  document.getElementById('addressCity').value = profile.addressCity || '';
  document.getElementById('addressState').value = profile.addressState || '';
  document.getElementById('addressPostalCode').value = profile.addressPostalCode || '';
  document.getElementById('addressCountry').value = profile.addressCountry || '';
  document.getElementById('portfolio').value = profile.portfolio || '';
  document.getElementById('linkedin').value = profile.linkedin || '';
  document.getElementById('github').value = profile.github || '';
  skillsInput.value = Array.isArray(profile.skills) ? formatSkills(profile.skills) : (profile.skills || '');
  if (softSkillsInput) {
    softSkillsInput.value = Array.isArray(profile.softSkills) 
      ? formatSkills(profile.softSkills) 
      : (profile.softSkills || '');
  }
  if (document.getElementById('aboutYou')) {
    document.getElementById('aboutYou').value = profile.aboutYou || '';
  }
  if (document.getElementById('coverLetter')) {
    document.getElementById('coverLetter').value = profile.coverLetter || '';
  }
  if (document.getElementById('availableStartDate')) {
    document.getElementById('availableStartDate').value = formatDateForInput(profile.availableStartDate || '');
  }
  if (profile.jobRole) {
    jobRoleInput.value = profile.jobRole;
  } else {
    jobRoleInput.value = getPrimaryRole(profile.workExperience);
  }
  if (profile.experienceLevel) {
    experienceLevelSelect.value = profile.experienceLevel;
  } else {
    experienceLevelSelect.value = determineExperienceLevel(profile.workExperience);
  }
  if (profile.education && Array.isArray(profile.education)) {
    profile.education.forEach(edu => {
      addEducationItem(edu);
    });
  }
  if (profile.workExperience && Array.isArray(profile.workExperience)) {
    profile.workExperience.forEach(exp => {
      addExperienceItem(exp);
    });
  }
}
async function saveForm() {
  const formData = new FormData(profileForm);
  const firstName = formData.get('firstName') || '';
  const middleName = formData.get('middleName') || '';
  const lastName = formData.get('lastName') || '';
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
  const profileData = {
    id: currentProfileId || generateId(),
    name: formData.get('name'),
    firstName: firstName,
    middleName: middleName,
    lastName: lastName,
    fullName: fullName, 
    preferredName: formData.get('preferredName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    dateOfBirth: formData.get('dateOfBirth'),
    gender: formData.get('gender'),
    addressStreet: formData.get('addressStreet'),
    addressCity: formData.get('addressCity'),
    addressState: formData.get('addressState'),
    addressPostalCode: formData.get('addressPostalCode'),
    addressCountry: formData.get('addressCountry'),
    portfolio: formData.get('portfolio'),
    linkedin: formData.get('linkedin'),
    github: formData.get('github'),
    jobRole: formData.get('jobRole'),
    experienceLevel: formData.get('experienceLevel'),
    skills: parseSkills(formData.get('skills')),
    softSkills: parseSkills(formData.get('softSkills')),
    aboutYou: formData.get('aboutYou'),
    coverLetter: formData.get('coverLetter'),
    availableStartDate: formData.get('availableStartDate'),
    education: [],
    workExperience: []
  };
  const educationItems = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('education[')) {
      const match = key.match(/education\[(\d+)\]\[(\w+)\]/);
      if (match) {
        const [_, index, field] = match;
        if (!educationItems[index]) {
          educationItems[index] = {};
        }
        educationItems[index][field] = value;
      }
    }
  }
  for (const index in educationItems) {
    const item = educationItems[index];
    if (item.schoolName && item.degree) {
      item.startDate = formatDateForStorage(item.startDate);
      item.endDate = formatDateForStorage(item.endDate);
      profileData.education.push({
        schoolName: item.schoolName || '',
        degree: item.degree || '',
        fieldOfStudy: item.fieldOfStudy || '',
        gpa: item.gpa || '',
        location: item.location || '',
        description: item.description || '',
        startDate: item.startDate || '',
        endDate: item.endDate || ''
      });
    }
  }
  const experienceItems = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('workExperience[')) {
      const match = key.match(/workExperience\[(\d+)\]\[(\w+)\]/);
      if (match) {
        const [_, index, field] = match;
        if (!experienceItems[index]) {
          experienceItems[index] = {};
        }
        experienceItems[index][field] = value;
      }
    }
  }
  for (const index in experienceItems) {
    const item = experienceItems[index];
    if (item.companyName && item.role) {
      const isCurrent = item.current === true || item.current === 'true';
      item.startDate = formatDateForStorage(item.startDate);
      item.endDate = isCurrent ? 'Present' : formatDateForStorage(item.endDate);
      profileData.workExperience.push({
        companyName: item.companyName || '',
        role: item.role || '',
        location: item.location || '',
        startDate: item.startDate || '',
        endDate: item.endDate || 'Present',
        current: isCurrent,
        description: item.description || '',
        responsibilities: item.responsibilities || ''
      });
    }
  }
  profileData.experience = profileData.workExperience.map(exp => ({
    company: exp.companyName,
    title: exp.role,
    startDate: exp.startDate,
    endDate: exp.endDate,
    current: exp.current,
    location: exp.location,
    description: exp.description,
    responsibilities: exp.responsibilities
  }));
  const profiles = await getProfiles();
  if (currentProfileId) {
    const index = profiles.findIndex(p => p.id === currentProfileId);
    if (index !== -1) {
      profiles[index] = profileData;
    } else {
      profiles.push(profileData);
    }
  } else {
    profiles.push(profileData);
  }
  await saveProfiles(profiles);
  await setSelectedProfileId(profileData.id);
  window.close();
}
function initialize() {
  const urlParams = new URLSearchParams(window.location.search);
  currentProfileId = urlParams.get('profileId');
  if (currentProfileId) {
    loadProfile(currentProfileId);
  } else {
    document.getElementById('addressCountry').value = 'India';
  }
  addEducationBtn.addEventListener('click', () => addEducationItem());
  addExperienceBtn.addEventListener('click', () => addExperienceItem());
  cancelBtn.addEventListener('click', () => {
    window.close();
  });
  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveForm();
  });
}
document.addEventListener('DOMContentLoaded', initialize); 