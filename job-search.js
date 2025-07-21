
const STORAGE_KEY = 'smart_job_autofill_profiles';
const SITE_USAGE_KEY = 'job_site_usage_stats';
const HIDDEN_SITES_KEY = 'hidden_job_sites';
const jobTitleInput = document.getElementById('job-title');
const locationInput = document.getElementById('location');
const experienceSelect = document.getElementById('experience');
const topSitesGrid = document.getElementById('top-sites-grid');
const profileNameElement = document.getElementById('profile-name');
const searchParamsElement = document.getElementById('search-params');
const backBtn = document.getElementById('back-btn');
const siteFilterOptions = document.querySelectorAll('.site-filter-option');
async function getSiteUsageStats() {
  return new Promise((resolve) => {
    chrome.storage.local.get(SITE_USAGE_KEY, (result) => {
      resolve(result[SITE_USAGE_KEY] || {});
    });
  });
}
async function saveSiteUsageStats(stats) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SITE_USAGE_KEY]: stats }, () => {
      resolve();
    });
  });
}
async function incrementSiteUsage(siteId) {
  const stats = await getSiteUsageStats();
  stats[siteId] = (stats[siteId] || 0) + 1;
  await saveSiteUsageStats(stats);
}
async function getHiddenSites() {
  return new Promise((resolve) => {
    chrome.storage.local.get(HIDDEN_SITES_KEY, (result) => {
      resolve(result[HIDDEN_SITES_KEY] || []);
    });
  });
}
async function saveHiddenSites(hiddenSites) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [HIDDEN_SITES_KEY]: hiddenSites }, () => {
      resolve();
    });
  });
}
async function hideSite(siteId) {
  const hiddenSites = await getHiddenSites();
  if (!hiddenSites.includes(siteId)) {
    hiddenSites.push(siteId);
    await saveHiddenSites(hiddenSites);
  }
}
const ALL_WEBSITES = [
  'linkedin', 'naukri', 'indeed', 'google', 'timesjobs', 
  'shine', 'instahyre', 'monster', 'glassdoor', 'dice', 
  'simplyhired', 'angellist',
  'hirist', 'cutshort', 'internshala', 'jobsforher', 'iimjobs',
  'linkedin-jobs', 'ziprecruiter', 'careerbuilder', 'flexjobs', 'remoteok',
  'upwork', 'fiverr', 'wellfound'
];
const websiteStats = {
  linkedin: { jobCount: '14M+', popularity: 'Very High', employers: '58K+' },
  indeed: { jobCount: '16M+', popularity: 'Very High', employers: '75K+' },
  naukri: { jobCount: '1.2M+', popularity: 'Very High', employers: '22K+' },
  monster: { jobCount: '5M+', popularity: 'High', employers: '30K+' },
  glassdoor: { jobCount: '8M+', popularity: 'High', employers: '40K+' },
  google: { jobCount: '20M+', popularity: 'Very High', employers: '100K+' },
  timesjobs: { jobCount: '250K+', popularity: 'High', employers: '15K+' },
  shine: { jobCount: '600K+', popularity: 'High', employers: '18K+' },
  instahyre: { jobCount: '120K+', popularity: 'High', employers: '5K+' },
  dice: { jobCount: '80K+', popularity: 'Medium', employers: '6K+' },
  simplyhired: { jobCount: '3M+', popularity: 'High', employers: '25K+' },
  angellist: { jobCount: '130K+', popularity: 'Medium', employers: '8K+' },
  hirist: { jobCount: '50K+', popularity: 'Medium', employers: '3K+' },
  cutshort: { jobCount: '70K+', popularity: 'Medium', employers: '4K+' },
  internshala: { jobCount: '80K+', popularity: 'High', employers: '12K+' },
  jobsforher: { jobCount: '25K+', popularity: 'Medium', employers: '2K+' },
  iimjobs: { jobCount: '90K+', popularity: 'High', employers: '7K+' },
  'linkedin-jobs': { jobCount: '7M+', popularity: 'Very High', employers: '40K+' },
  ziprecruiter: { jobCount: '9M+', popularity: 'High', employers: '35K+' },
  careerbuilder: { jobCount: '4M+', popularity: 'High', employers: '20K+' },
  flexjobs: { jobCount: '2M+', popularity: 'Medium', employers: '10K+' },
  remoteok: { jobCount: '50K+', popularity: 'Medium', employers: '3K+' },
  upwork: { jobCount: '3M+', popularity: 'High', employers: '15K+' },
  fiverr: { jobCount: '2M+', popularity: 'Medium', employers: '10K+' },
  wellfound: { jobCount: '100K+', popularity: 'Medium', employers: '5K+' }
};
const siteSuperPowers = {
  linkedin: { text: "#1 Professional Network", icon: "🥇" },
  indeed: { text: "Most Job Listings Globally", icon: "🌎" },
  naukri: { text: "India's #1 Job Site", icon: "🇮🇳" },
  monster: { text: "Best Resume Database", icon: "📄" },
  glassdoor: { text: "Best Company Reviews", icon: "⭐" },
  google: { text: "Largest Search Index", icon: "🔎" },
  timesjobs: { text: "Top IT Jobs in India", icon: "💻" },
  shine: { text: "Best Premium Services", icon: "✨" },
  instahyre: { text: "AI-Powered Matching", icon: "🤖" },
  dice: { text: "#1 for Tech Careers", icon: "👨‍💻" },
  simplyhired: { text: "Best Salary Insights", icon: "💰" },
  angellist: { text: "#1 for Startups", icon: "🚀" },
  hirist: { text: "Premium Tech Hiring", icon: "🌟" },
  cutshort: { text: "Fastest Growing Platform", icon: "📈" },
  internshala: { text: "#1 for Internships", icon: "🎓" },
  jobsforher: { text: "Women Workforce Leader", icon: "👩‍💼" },
  iimjobs: { text: "#1 for Management Roles", icon: "👔" },
  'linkedin-jobs': { text: "Best Network Integration", icon: "🔄" },
  ziprecruiter: { text: "Fastest Application Process", icon: "⚡" },
  careerbuilder: { text: "Most Career Resources", icon: "📚" },
  flexjobs: { text: "#1 for Remote Work", icon: "🏠" },
  remoteok: { text: "Digital Nomad Favorite", icon: "🌴" },
  upwork: { text: "Largest Freelance Platform", icon: "👨‍💻" },
  fiverr: { text: "Best for Quick Gigs", icon: "⏱️" },
  wellfound: { text: "Best for Funded Startups", icon: "💵" }
};
const siteBranding = {
  linkedin: {
    logo: '📊',
    color: '#0077B5',
    tagline: 'The world\'s largest professional network'
  },
  indeed: {
    logo: '🔍',
    color: '#003A9B',
    tagline: 'World\'s #1 job site with millions of listings'
  },
  naukri: {
    logo: '🇮🇳',
    color: '#FF7555',
    tagline: 'India\'s No.1 Job Site with top recruiters'
  },
  google: {
    logo: '🔎',
    color: '#4285F4',
    tagline: 'Search engine for job listings across the web'
  },
  timesjobs: {
    logo: '🕒',
    color: '#e71b64',
    tagline: 'Popular job portal in India with verified postings'
  },
  shine: {
    logo: '✨',
    color: '#1D976C',
    tagline: 'Leading job portal in India with premium services'
  },
  instahyre: {
    logo: '⚡',
    color: '#614385',
    tagline: 'AI-based recruitment platform for tech jobs'
  },
  monster: {
    logo: '👾',
    color: '#5614B0',
    tagline: 'Global employment platform connecting jobs'
  },
  glassdoor: {
    logo: '🚪',
    color: '#0CAA41',
    tagline: 'Jobs with company reviews and salaries'
  },
  dice: {
    logo: '🎲',
    color: '#396afc',
    tagline: 'Specialized in tech and IT jobs'
  },
  simplyhired: {
    logo: '💼',
    color: '#334d50',
    tagline: 'Search engine with salary estimates'
  },
  angellist: {
    logo: '😇',
    color: '#2c3e50',
    tagline: 'Startup jobs and recruiting platform'
  },
  hirist: {
    logo: '🌟',
    color: '#11998e',
    tagline: 'Premium tech jobs in India'
  },
  cutshort: {
    logo: '⚙️',
    color: '#0575E6',
    tagline: 'AI-powered tech recruitment platform'
  },
  internshala: {
    logo: '🎓',
    color: '#006BC6',
    tagline: 'Internships and entry-level jobs in India'
  },
  jobsforher: {
    logo: '👩‍💼',
    color: '#FF6B6B',
    tagline: 'Jobs for women returning to the workforce'
  },
  iimjobs: {
    logo: '💯',
    color: '#1A2980',
    tagline: 'Management and business jobs in India'
  },
  'linkedin-jobs': {
    logo: '🔵',
    color: '#00416A',
    tagline: 'LinkedIn\'s dedicated job search platform'
  },
  ziprecruiter: {
    logo: '🏃',
    color: '#5d31bf',
    tagline: 'Fast application process to many employers'
  },
  careerbuilder: {
    logo: '🏗️',
    color: '#00AED1',
    tagline: 'One of the largest job boards globally'
  },
  flexjobs: {
    logo: '🧘',
    color: '#1E88E5',
    tagline: 'Flexible and remote work opportunities'
  },
  remoteok: {
    logo: '🌐',
    color: '#0f2027',
    tagline: 'Remote jobs from around the world'
  },
  upwork: {
    logo: '👨‍💻',
    color: '#6FDA44',
    tagline: 'Freelance jobs and project opportunities'
  },
  fiverr: {
    logo: '5️⃣',
    color: '#1DBF73',
    tagline: 'Freelance services marketplace'
  },
  wellfound: {
    logo: '🚀',
    color: '#240b36',
    tagline: 'Formerly AngelList Talent - Startup jobs'
  }
};
const countrySpecificWebsites = {
  india: [
    'naukri', 'timesjobs', 'shine', 'instahyre', 'hirist', 
    'cutshort', 'internshala', 'jobsforher', 'iimjobs',
    'linkedin', 'google', 'indeed', 'monster'
  ],
  global: [
    'linkedin', 'indeed', 'monster', 'glassdoor', 'google', 'dice', 
    'simplyhired', 'angellist', 'linkedin-jobs', 'ziprecruiter',
    'careerbuilder', 'flexjobs', 'remoteok', 'upwork', 'fiverr', 'wellfound'
  ]
};
const jobWebsites = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    logo: '📊',
    description: 'Professional networking platform with millions of job listings',
    url: 'https://www.linkedin.com/jobs/search/?keywords={jobTitle}&location={location}&f_E={experience}',
    experienceMapping: {
      fresher: '1',
      mid: '2',
      senior: '3,4'
    },
    primaryCountries: ['all'],
    features: ['Company Reviews', 'Salary Insights', 'Easy Apply']
  },
  {
    id: 'indeed',
    name: 'Indeed',
    logo: '🔍',
    description: 'World\'s #1 job site with millions of listings',
    url: 'https://www.indeed.com/jobs?q={jobTitle}&l={location}&explvl={experience}',
    experienceMapping: {
      fresher: 'entry_level',
      mid: 'mid_level',
      senior: 'senior_level'
    },
    primaryCountries: ['all'],
    features: ['Company Reviews', 'Salary Data', 'Remote Jobs']
  },
  {
    id: 'naukri',
    name: 'Naukri',
    logo: '🇮🇳',
    description: 'India\'s leading job portal with top recruiters',
    url: 'https://www.naukri.com/jobs-in-{location}?jobTitle={jobTitle}&experience={experience}',
    experienceMapping: {
      fresher: '0-2',
      mid: '3-5',
      senior: '6-10'
    },
    primaryCountries: ['india'],
    features: ['Walk-in Jobs', 'Top Companies', 'Resume Services']
  },
  {
    id: 'monster',
    name: 'Monster',
    logo: '👾',
    description: 'Global employment platform connecting people and jobs',
    url: 'https://www.monster.com/jobs/search/?q={jobTitle}&where={location}&exp={experience}',
    experienceMapping: {
      fresher: '1',
      mid: '3',
      senior: '5'
    },
    primaryCountries: ['all'],
    features: ['Career Advice', 'Salary Tools', 'Resume Builder']
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor',
    logo: '🚪',
    description: 'Search millions of jobs with company reviews and salaries',
    url: 'https://www.glassdoor.com/Job/jobs.htm?sc.keyword={jobTitle}&locT=C&locId=0&locKeyword={location}&seniorityType={experience}',
    experienceMapping: {
      fresher: 'entrylevel',
      mid: 'midlevel',
      senior: 'seniorlevel'
    },
    primaryCountries: ['all'],
    features: ['Company Reviews', 'Interview Questions', 'Salary Data']
  },
  {
    id: 'google',
    name: 'Google Jobs',
    logo: '🔎',
    description: 'Search engine for job listings from across the web',
    url: 'https://www.google.com/search?q={jobTitle}+jobs+in+{location}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['all'],
    features: ['Aggregated Listings', 'Filters', 'Direct Apply']
  },
  {
    id: 'timesjobs',
    name: 'TimesJobs',
    logo: '🕒',
    description: 'Popular job portal in India with verified job postings',
    url: 'https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords={jobTitle}&txtLocation={location}&cboWorkExp1={experience}',
    experienceMapping: {
      fresher: '0-2',
      mid: '3-5',
      senior: '6-10'
    },
    primaryCountries: ['india'],
    features: ['Skills Matching', 'Company Reviews', 'Job Alerts']
  },
  {
    id: 'shine',
    name: 'Shine',
    logo: '✨',
    description: 'Leading job portal in India offering premium services',
    url: 'https://www.shine.com/job-search/{jobTitle}-jobs-in-{location}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['india'],
    features: ['Assessment Tests', 'Premium Jobs', 'Curated Matches']
  },
  {
    id: 'instahyre',
    name: 'Instahyre',
    logo: '⚡',
    description: 'AI-based recruitment platform focused on tech jobs',
    url: 'https://www.instahyre.com/search-jobs/{jobTitle}/',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['india'],
    features: ['AI Matching', 'Tech Jobs', 'Direct Recruiter Contact']
  },
  {
    id: 'dice',
    name: 'Dice',
    logo: '🎲',
    description: 'Specialized in tech and IT jobs in the United States',
    url: 'https://www.dice.com/jobs?q={jobTitle}&location={location}&level={experience}',
    experienceMapping: {
      fresher: 'entry',
      mid: 'mid',
      senior: 'senior'
    },
    primaryCountries: ['global'],
    features: ['Tech Skills Matching', 'Career Path', 'Salary Predictor']
  },
  {
    id: 'simplyhired',
    name: 'SimplyHired',
    logo: '💼',
    description: 'Search engine for jobs with salary estimates',
    url: 'https://www.simplyhired.com/search?q={jobTitle}&l={location}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['global'],
    features: ['Salary Estimates', 'Company Reviews', 'Mobile App']
  },
  {
    id: 'angellist',
    name: 'AngelList',
    logo: '😇',
    description: 'Startup jobs and recruiting platform',
    url: 'https://angel.co/jobs?role={jobTitle}&location={location}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['global'],
    features: ['Startup Focus', 'Equity Info', 'Direct to Founders']
  },
  {
    id: 'hirist',
    name: 'Hirist',
    logo: '🌟',
    description: 'Premium tech jobs in India',
    url: 'https://www.hirist.com/j/{jobTitle}-jobs.html?loc={location}',
    experienceMapping: {
      fresher: '0-2',
      mid: '3-6',
      senior: '7-10'
    },
    primaryCountries: ['india'],
    features: ['Tech Focus', 'Direct Hiring', 'Premium Jobs']
  },
  {
    id: 'cutshort',
    name: 'CutShort',
    logo: '⚙️',
    description: 'AI-powered tech recruitment platform',
    url: 'https://cutshort.io/jobs?q={jobTitle}&location={location}',
    experienceMapping: {
      fresher: 'fresher',
      mid: 'experienced',
      senior: 'senior'
    },
    primaryCountries: ['india'],
    features: ['AI Matching', 'Tech Focus', 'Startup Jobs']
  },
  {
    id: 'internshala',
    name: 'Internshala',
    logo: '🎓',
    description: 'Internships and entry-level jobs in India',
    url: 'https://internshala.com/internships/{jobTitle}-internships-in-{location}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['india'],
    features: ['Internships', 'Entry Level', 'Student Focus']
  },
  {
    id: 'jobsforher',
    name: 'JobsForHer',
    logo: '👩‍💼',
    description: 'Jobs for women returning to the workforce',
    url: 'https://www.jobsforher.com/jobs/{jobTitle}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['india'],
    features: ['Women-focused', 'Returnship', 'Flexible Jobs']
  },
  {
    id: 'iimjobs',
    name: 'IIMJobs',
    logo: '💯',
    description: 'Management and business jobs in India',
    url: 'https://www.iimjobs.com/search/{jobTitle}-jobs-in-{location}.html',
    experienceMapping: {
      fresher: '0-2',
      mid: '3-7',
      senior: '8+'
    },
    primaryCountries: ['india'],
    features: ['Management Jobs', 'Business Focus', 'Premium Employers']
  },
  {
    id: 'linkedin-jobs',
    name: 'LinkedIn Jobs',
    logo: '🔵',
    description: 'LinkedIn\'s dedicated job search platform',
    url: 'https://www.linkedin.com/jobs/search/?keywords={jobTitle}&location={location}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['global'],
    features: ['Professional Network', 'Easy Apply', 'Recommendations']
  },
  {
    id: 'ziprecruiter',
    name: 'ZipRecruiter',
    logo: '🏃',
    description: 'Fast application process to many employers',
    url: 'https://www.ziprecruiter.com/jobs/search?q={jobTitle}&l={location}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['global'],
    features: ['One-Click Apply', 'Job Alerts', 'Salary Data']
  },
  {
    id: 'careerbuilder',
    name: 'CareerBuilder',
    logo: '🏗️',
    description: 'One of the largest job boards globally',
    url: 'https://www.careerbuilder.com/jobs?keywords={jobTitle}&location={location}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['global'],
    features: ['Career Resources', 'Salary Tools', 'Company Reviews']
  },
  {
    id: 'flexjobs',
    name: 'FlexJobs',
    logo: '🧘',
    description: 'Flexible and remote work opportunities',
    url: 'https://www.flexjobs.com/search?search={jobTitle}&location={location}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['global'],
    features: ['Remote Jobs', 'Flexible Work', 'Screened Jobs']
  },
  {
    id: 'remoteok',
    name: 'RemoteOK',
    logo: '🌐',
    description: 'Remote jobs from around the world',
    url: 'https://remoteok.com/remote-{jobTitle}-jobs',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['global'],
    features: ['100% Remote', 'Tech Focus', 'Digital Nomad']
  },
  {
    id: 'upwork',
    name: 'Upwork',
    logo: '👨‍💻',
    description: 'Freelance jobs and project opportunities',
    url: 'https://www.upwork.com/search/jobs/?q={jobTitle}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['global'],
    features: ['Freelance', 'Project-Based', 'Global Clients']
  },
  {
    id: 'fiverr',
    name: 'Fiverr',
    logo: '5️⃣',
    description: 'Freelance services marketplace',
    url: 'https://www.fiverr.com/search/gigs?query={jobTitle}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['global'],
    features: ['Freelance', 'Service-Based', 'Gig Economy']
  },
  {
    id: 'wellfound',
    name: 'Wellfound',
    logo: '🚀',
    description: 'Formerly AngelList Talent - Startup jobs',
    url: 'https://wellfound.com/jobs?role={jobTitle}&location={location}',
    experienceMapping: {
      fresher: '',
      mid: '',
      senior: ''
    },
    primaryCountries: ['global'],
    features: ['Startup Jobs', 'Tech Focus', 'Equity Info']
  }
];
async function getProfiles() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      resolve(result[STORAGE_KEY] || []);
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
async function getProfileById(profileId) {
  const profiles = await getProfiles();
  return profiles.find(profile => profile.id === profileId) || null;
}
function getWebsiteById(websiteId) {
  return jobWebsites.find(site => site.id === websiteId);
}
function getUrlParameters() {
  const params = new URLSearchParams(window.location.search);
  return {
    experience: params.get('experience') || 'mid',
    country: params.get('country') || 'india' 
  };
}
function generateSearchUrl(website, jobTitle, location, experience) {
  let url = website.url;
  url = url.replace('{jobTitle}', encodeURIComponent(jobTitle));
  url = url.replace('{location}', encodeURIComponent(location));
  if (experience && website.experienceMapping[experience]) {
    url = url.replace('{experience}', website.experienceMapping[experience]);
  }
  return url;
}
function createJobSiteCard(website, jobTitle, location, experience, usageCount = 0) {
  const template = document.getElementById('top-site-card-template');
  const clone = document.importNode(template.content, true);
  const card = clone.querySelector('.job-site-card');
  const logo = clone.querySelector('.card-logo');
  const title = clone.querySelector('.card-title');
  const subtitle = clone.querySelector('.card-subtitle');
  const description = clone.querySelector('.card-description');
  const searchQuery = clone.querySelector('.search-query');
  const searchBtn = clone.querySelector('.search-btn');
  const stats = clone.querySelectorAll('.stat-value');
  const superpowerBadge = clone.querySelector('.superpower-badge');
  const superpowerIcon = superpowerBadge.querySelector('.superpower-icon');
  const superpowerText = superpowerBadge.querySelector('.superpower-text');
  card.classList.add(website.id);
  card.dataset.usage = usageCount;
  const branding = siteBranding[website.id] || { logo: website.logo, tagline: website.description };
  logo.textContent = branding.logo;
  title.textContent = website.name;
  subtitle.textContent = `${website.features[0]} • ${website.features[1]}`;
  description.textContent = branding.tagline || website.description;
  const websiteStat = websiteStats[website.id] || { jobCount: '1M+', popularity: 'Medium' };
  if (stats.length >= 2) {
    stats[0].textContent = websiteStat.jobCount;
    stats[1].textContent = websiteStat.popularity;
  }
  const superpower = siteSuperPowers[website.id] || { text: "Unique Job Search", icon: "⚡" };
  superpowerIcon.textContent = superpower.icon;
  superpowerText.textContent = superpower.text;
  const readableExperience = {
    'fresher': 'Entry Level',
    'mid': 'Mid Level',
    'senior': 'Senior Level'
  };
  const queryText = `${jobTitle} • ${location} • ${readableExperience[experience] || experience}`;
  searchQuery.textContent = queryText;
  searchBtn.textContent = `Search Jobs`;
  const badge = card.querySelector('.site-badge');
  if (countrySpecificWebsites.india.includes(website.id) && !countrySpecificWebsites.global.includes(website.id)) {
    badge.textContent = 'India';
  } else if (website.id === 'remoteok' || website.id === 'flexjobs' || website.id === 'upwork' || website.id === 'fiverr') {
    badge.textContent = 'Remote';
  } else {
    badge.textContent = 'Global';
  }
  searchBtn.addEventListener('click', async (e) => {
    e.stopPropagation(); 
    await incrementSiteUsage(website.id);
    const url = generateSearchUrl(website, jobTitle, location, experience);
    window.open(url, '_blank');
  });
  card.addEventListener('click', async (e) => {
    if (!e.target.closest('.search-btn')) {
      await incrementSiteUsage(website.id);
      const url = generateSearchUrl(website, jobTitle, location, experience);
      window.open(url, '_blank');
    }
  });
  return clone;
}
async function getWebsitesForFocus(focus) {
  const hiddenSites = await getHiddenSites();
  let sites = [];
  if (focus === 'all') {
    sites = ALL_WEBSITES;
  } else if (focus === 'global') {
    sites = countrySpecificWebsites.global;
  } else if (focus === 'india') {
    sites = countrySpecificWebsites.india;
  }
  return sites.filter(site => !hiddenSites.includes(site));
}
async function updateJobSites(jobTitle, location, experience, focus = 'india') {
  topSitesGrid.innerHTML = '';
  const websitesToShow = await getWebsitesForFocus(focus);
  const usageStats = await getSiteUsageStats();
  const cards = [];
  for (const websiteId of websitesToShow) {
    const website = getWebsiteById(websiteId);
    if (website) {
      const usageCount = usageStats[websiteId] || 0;
      const card = createJobSiteCard(website, jobTitle, location, experience, usageCount);
      cards.push({ element: card, usageCount });
    }
  }
  cards.sort((a, b) => b.usageCount - a.usageCount);
  cards.forEach(card => {
    topSitesGrid.appendChild(card.element);
  });
  setTimeout(animateCards, 100);
}
function animateCards() {
  const cards = document.querySelectorAll('.job-site-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 80);
  });
}
function initSiteFilterOptions(jobTitle, location, experience) {
  siteFilterOptions.forEach(option => {
    option.addEventListener('click', async () => {
      siteFilterOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      const focus = option.getAttribute('data-country');
      await updateJobSites(jobTitle, location, experience, focus);
    });
  });
}
async function initialize() {
  try {
    const selectedProfileId = await getSelectedProfileId();
    if (!selectedProfileId) {
      alert('No profile selected. Please select a profile first.');
      window.close();
      return;
    }
    const profile = await getProfileById(selectedProfileId);
    if (!profile) {
      alert('Selected profile not found.');
      window.close();
      return;
    }
    let jobTitle = '';
    let experience = 'fresher';
    if (profile.jobRole) {
      jobTitle = profile.jobRole;
    } else if (profile.workExperience && profile.workExperience.length > 0) {
      const mostRecent = [...profile.workExperience].sort((a, b) => {
        const aDate = a.endDate === 'Present' ? new Date() : new Date(a.endDate);
        const bDate = b.endDate === 'Present' ? new Date() : new Date(b.endDate);
        return bDate - aDate;
      })[0];
      jobTitle = mostRecent.role || '';
    }
    if (profile.experienceLevel) {
      experience = profile.experienceLevel;
    } else if (profile.workExperience && profile.workExperience.length > 0) {
      let totalYears = 0;
      profile.workExperience.forEach(exp => {
        let endDate = exp.endDate === 'Present' ? new Date() : new Date(exp.endDate);
        let startDate = new Date(exp.startDate);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
          totalYears += years;
        }
      });
      if (totalYears < 2) {
        experience = 'fresher';
      } else if (totalYears < 5) {
        experience = 'mid';
      } else {
        experience = 'senior';
      }
    }
    let location = 'India';
    profileNameElement.textContent = `Profile: ${profile.name}`;
    searchParamsElement.textContent = `${experience} level ${jobTitle} in ${location}`;
    jobTitleInput.value = jobTitle;
    locationInput.value = location;
    experienceSelect.value = experience;
    initSiteFilterOptions(jobTitle, location, experience);
    await updateJobSites(jobTitle, location, experience, 'india');
    backBtn.addEventListener('click', () => {
      window.close();
    });
    const updateSearch = async () => {
      const jobTitle = jobTitleInput.value.trim();
      const location = locationInput.value.trim();
      const experience = experienceSelect.value;
      if (jobTitle) {
        const activeOption = document.querySelector('.site-filter-option.active');
        if (activeOption) {
          const focus = activeOption.getAttribute('data-country');
          await updateJobSites(jobTitle, location, experience, focus);
        }
      }
    };
    jobTitleInput.addEventListener('input', debounce(updateSearch, 500));
    locationInput.addEventListener('input', debounce(updateSearch, 500));
    experienceSelect.addEventListener('change', updateSearch);
  } catch (error) {
    console.error('Error initializing job search:', error);
    alert('An error occurred while initializing the job search. Please try again.');
  }
}
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
document.addEventListener('DOMContentLoaded', initialize); 