const { ipcRenderer } = require('electron');

// Import i18n (loaded via script tag in HTML)
// i18n is now available globally

// State
let currentProgram = null;
let currentAct = null;
let programs = [];
let obsConnected = false;
let libreOfficeAvailable = false;
let displays = [];
let pendingImportFiles = null;

// DOM Elements
const elements = {
  connectOBS: document.getElementById('connectOBS'),
  obsStatus: document.getElementById('obsStatus'),
  importPPT: document.getElementById('importPPT'),
  programList: document.getElementById('programList'),
  currentSceneInfo: document.getElementById('currentSceneInfo'),
  actList: document.getElementById('actList'),
  previewArea: document.getElementById('previewArea'),
  actName: document.getElementById('actName'),
  actNotes: document.getElementById('actNotes'),
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  blackoutBtn: document.getElementById('blackoutBtn'),
  statusMessage: document.getElementById('statusMessage'),
  connectionDialog: document.getElementById('connectionDialog'),
  connectionForm: document.getElementById('connectionForm'),
  cancelConnect: document.getElementById('cancelConnect'),
  modeDialog: document.getElementById('modeDialog'),
  cancelMode: document.getElementById('cancelMode'),
  displaySelect: document.getElementById('displaySelect'),
  loStatus: document.getElementById('loStatus'),
  languageSelect: document.getElementById('languageSelect')
};

// Initialize
async function init() {
  // Set language selector to current language
  if (elements.languageSelect && window.i18n) {
    elements.languageSelect.value = i18n.getLanguage();
  }
  
  await loadPrograms();
  await loadDisplays();
  await checkLibreOfficeStatus();
  setupEventListeners();
  updateUI();
}

// Load available displays
async function loadDisplays() {
  const result = await ipcRenderer.invoke('display:list');
  if (result.success) {
    displays = result.displays;
    renderDisplays();
  }
}

function renderDisplays() {
  elements.displaySelect.innerHTML = displays.map((d, i) => 
    `<option value="${i}">${d.label}${d.primary ? ' (Primary)' : ''}</option>`
  ).join('');
}

// Check LibreOffice status
async function checkLibreOfficeStatus() {
  const result = await ipcRenderer.invoke('libreoffice:status');
  if (result.success) {
    libreOfficeAvailable = result.status.available;
    elements.loStatus.textContent = libreOfficeAvailable ? i18n.t('sidebar.available') : i18n.t('sidebar.notFound');
    elements.loStatus.style.color = libreOfficeAvailable ? '#4CAF50' : '#f44336';
  }
}

// Event Listeners
function setupEventListeners() {
  elements.connectOBS.addEventListener('click', showConnectionDialog);
  elements.cancelConnect.addEventListener('click', hideConnectionDialog);
  elements.connectionForm.addEventListener('submit', handleConnect);
  elements.importPPT.addEventListener('click', handleImportPPT);
  elements.startBtn.addEventListener('click', handleStart);
  elements.stopBtn.addEventListener('click', handleStop);
  elements.prevBtn.addEventListener('click', handlePrevScene);
  elements.nextBtn.addEventListener('click', handleNextScene);
  elements.blackoutBtn.addEventListener('click', handleBlackout);
  elements.cancelMode.addEventListener('click', hideModeDialog);
  elements.displaySelect.addEventListener('change', handleDisplayChange);
  
  // Language selector
  if (elements.languageSelect) {
    elements.languageSelect.addEventListener('change', async (e) => {
      await i18n.setLanguage(e.target.value);
      // Re-render dynamic content
      renderProgramList();
      updateUI();
      await checkLibreOfficeStatus();
    });
  }

  // Mode selection
  document.querySelectorAll('.mode-option').forEach(option => {
    option.addEventListener('click', () => handleModeSelection(option.dataset.mode));
  });

  // Listen for OBS events
  ipcRenderer.on('obs:connected', () => {
    obsConnected = true;
    updateConnectionStatus();
    setStatus(i18n.t('messages.connectedToOBS'), 'success');
  });

  ipcRenderer.on('obs:disconnected', () => {
    obsConnected = false;
    updateConnectionStatus();
    setStatus(i18n.t('messages.disconnectedFromOBS'), 'error');
  });

  ipcRenderer.on('obs:scene-changed', (event, sceneName) => {
    setStatus(i18n.t('messages.sceneChanged', { scene: sceneName }), 'info');
  });
  
  // Listen for LibreOffice events
  ipcRenderer.on('libreoffice:started', () => {
    setStatus(i18n.t('messages.presentationStarted'), 'success');
  });
  
  ipcRenderer.on('libreoffice:stopped', () => {
    setStatus(i18n.t('messages.presentationStopped'), 'info');
  });
  
  ipcRenderer.on('libreoffice:slide-changed', (event, direction) => {
    setStatus(`Slide: ${direction}`, 'info');
  });
}

// Connection Dialog
function showConnectionDialog() {
  elements.connectionDialog.style.display = 'flex';
}

function hideConnectionDialog() {
  elements.connectionDialog.style.display = 'none';
}

async function handleConnect(e) {
  e.preventDefault();
  
  const address = document.getElementById('obsAddress').value;
  const password = document.getElementById('obsPassword').value;
  
  setStatus(i18n.t('messages.connectingToOBS'), 'info');
  
  const result = await ipcRenderer.invoke('obs:connect', { address, password });
  
  if (result.success) {
    hideConnectionDialog();
    obsConnected = true;
    updateConnectionStatus();
    setStatus(i18n.t('messages.connectedToOBS'), 'success');
  } else {
    setStatus(i18n.t('messages.connectionFailed', { error: result.error }), 'error');
    alert(i18n.t('messages.failedToConnect', { error: result.error }));
  }
}

function updateConnectionStatus() {
  if (obsConnected) {
    elements.obsStatus.classList.add('connected');
    elements.obsStatus.querySelector('.status-text').textContent = i18n.t('header.connected');
    elements.connectOBS.textContent = i18n.t('header.disconnect');
    elements.connectOBS.onclick = handleDisconnect;
  } else {
    elements.obsStatus.classList.remove('connected');
    elements.obsStatus.querySelector('.status-text').textContent = i18n.t('header.notConnected');
    elements.connectOBS.textContent = i18n.t('header.connectToOBS');
    elements.connectOBS.onclick = showConnectionDialog;
  }
  updateUI();
}

async function handleDisconnect() {
  const result = await ipcRenderer.invoke('obs:disconnect');
  if (result.success) {
    obsConnected = false;
    updateConnectionStatus();
    setStatus(i18n.t('messages.disconnectedFromOBS'), 'info');
  }
}

// Program Management
async function loadPrograms() {
  const result = await ipcRenderer.invoke('program:list');
  if (result.success) {
    programs = result.programs;
    renderProgramList();
  }
}

function renderProgramList() {
  if (programs.length === 0) {
    elements.programList.innerHTML = `<div class="empty-state" data-i18n="sidebar.noProgramsYet">${i18n.t('sidebar.noProgramsYet')}</div>`;
    return;
  }

  elements.programList.innerHTML = programs.map(program => {
    const modeIcon = program.mode === 'renderer' ? '🎭' : '🎬';
    const actCount = program.acts ? program.acts.length : program.slideCount || 0;
    const modeText = i18n.t(`modes.${program.mode}`);
    const slidesText = i18n.t('units.slides');
    return `
      <div class="program-item" data-id="${program.id}">
        <div class="program-item-name">${modeIcon} ${program.name}</div>
        <div class="program-item-meta">${actCount} ${slidesText} · ${modeText} mode</div>
      </div>
    `;
  }).join('');

  // Add click handlers
  elements.programList.querySelectorAll('.program-item').forEach(item => {
    item.addEventListener('click', () => loadProgram(item.dataset.id));
  });
}

async function handleImportPPT() {
  setStatus(i18n.t('messages.selectPPTFiles'), 'info');
  
  const selectResult = await ipcRenderer.invoke('ppt:select');
  if (!selectResult.success) {
    return;
  }

  // Store files and show mode selection dialog
  pendingImportFiles = selectResult.filePaths;
  showModeDialog();
}

function showModeDialog() {
  elements.modeDialog.style.display = 'flex';
}

function hideModeDialog() {
  elements.modeDialog.style.display = 'none';
  pendingImportFiles = null;
}

async function handleModeSelection(mode) {
  if (!pendingImportFiles) return;
  
  hideModeDialog();
  setStatus(i18n.t('messages.importingPPTFiles'), 'info');
  
  const result = await ipcRenderer.invoke('ppt:import', pendingImportFiles, { mode });
  
  if (result.success) {
    const modeText = i18n.t(`modes.${mode}`);
    setStatus(i18n.t('messages.importedProgramsInMode', { count: result.programs.length, mode: modeText }), 'success');
    await loadPrograms();
  } else {
    setStatus(i18n.t('messages.importFailed', { error: result.error }), 'error');
    alert(i18n.t('messages.importFailed', { error: result.error }));
  }
  
  pendingImportFiles = null;
}

async function handleDisplayChange() {
  const displayIndex = parseInt(elements.displaySelect.value);
  await ipcRenderer.invoke('display:set', displayIndex);
  setStatus(i18n.t('messages.displaySet', { display: displays[displayIndex].label }), 'info');
}

async function loadProgram(programId) {
  setStatus(i18n.t('messages.loadingProgram'), 'info');
  
  const result = await ipcRenderer.invoke('program:load', programId);
  
  if (result.success) {
    currentProgram = result.program;
    currentAct = null;
    
    // Update active state in program list
    elements.programList.querySelectorAll('.program-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === programId);
    });
    
    renderActList();
    updateUI();
    
    const modeText = i18n.t(`modes.${currentProgram.mode}`);
    setStatus(i18n.t('messages.programLoaded', { mode: modeText }), 'success');
  } else {
    setStatus(i18n.t('messages.failedToLoadProgram', { error: result.error }), 'error');
  }
}

async function handleStart() {
  if (!currentProgram) return;
  
  const displayIndex = parseInt(elements.displaySelect.value);
  const result = await ipcRenderer.invoke('scene:start', { display: displayIndex });
  
  if (result.success) {
    setStatus(i18n.t('messages.presentationStarted'), 'success');
    updateUI();
  } else {
    setStatus(i18n.t('messages.startFailed', { error: result.error }), 'error');
  }
}

async function handleStop() {
  const result = await ipcRenderer.invoke('scene:stop');
  
  if (result.success) {
    setStatus(i18n.t('messages.presentationStopped'), 'info');
    updateUI();
  } else {
    setStatus(i18n.t('messages.stopFailed', { error: result.error }), 'error');
  }
}

function renderActList() {
  if (!currentProgram || !currentProgram.acts || currentProgram.acts.length === 0) {
    elements.actList.innerHTML = '<div class="empty-state">No acts in this program</div>';
    return;
  }

  elements.actList.innerHTML = currentProgram.acts.map((act, index) => `
    <div class="act-item" data-index="${index}">
      <span class="act-number">Act ${index + 1}</span>
      <span class="act-name">${act.name}</span>
    </div>
  `).join('');

  // Add click handlers
  elements.actList.querySelectorAll('.act-item').forEach(item => {
    item.addEventListener('click', () => jumpToAct(parseInt(item.dataset.index)));
  });
}

// Scene Control
async function handlePrevScene() {
  if (!currentProgram) return;
  
  const result = await ipcRenderer.invoke('scene:prev');
  if (result.success) {
    setStatus(i18n.t('messages.previousScene'), 'info');
  } else {
    setStatus(i18n.t('messages.error', { error: result.error }), 'error');
  }
}

async function handleNextScene() {
  if (!currentProgram) return;
  
  const result = await ipcRenderer.invoke('scene:next');
  if (result.success) {
    setStatus(i18n.t('messages.nextScene'), 'info');
  } else {
    setStatus(i18n.t('messages.error', { error: result.error }), 'error');
  }
}

async function handleBlackout() {
  if (!obsConnected) return;
  
  const result = await ipcRenderer.invoke('scene:blackout');
  if (result.success) {
    currentAct = null;
    updateUI();
    setStatus(i18n.t('messages.blackoutActivated'), 'info');
  } else {
    setStatus(i18n.t('messages.error', { error: result.error }), 'error');
  }
}

async function jumpToAct(actIndex) {
  if (!currentProgram) return;
  
  const result = await ipcRenderer.invoke('scene:jump', actIndex);
  if (result.success) {
    setStatus(i18n.t('messages.jumpedToAct', { act: actIndex + 1 }), 'info');
    if (currentProgram.acts && currentProgram.acts[actIndex]) {
      currentAct = currentProgram.acts[actIndex];
      updateUI();
    }
  } else {
    setStatus(i18n.t('messages.error', { error: result.error }), 'error');
  }
}

// UI Updates
function updateUI() {
  // Update scene info
  if (currentProgram) {
    const sceneDiv = elements.currentSceneInfo.querySelector('.scene-name');
    const numberDiv = elements.currentSceneInfo.querySelector('.scene-number');
    const modeIcon = currentProgram.mode === 'renderer' ? '🎭' : '🎬';
    const modeText = i18n.t(`modes.${currentProgram.mode}`);
    const slidesText = i18n.t('units.slides');
    sceneDiv.textContent = currentProgram.name;
    numberDiv.textContent = `${modeIcon} ${modeText} · ${currentProgram.slideCount || currentProgram.acts.length} ${slidesText}`;
  } else {
    const sceneDiv = elements.currentSceneInfo.querySelector('.scene-name');
    const numberDiv = elements.currentSceneInfo.querySelector('.scene-number');
    sceneDiv.textContent = i18n.t('controls.noProgramLoaded');
    numberDiv.textContent = '-';
  }

  // Update control buttons based on mode and connections
  const canControl = currentProgram !== null;
  const needsOBS = currentProgram && currentProgram.mode === 'scene';
  const needsLO = currentProgram && currentProgram.mode === 'renderer';
  
  elements.startBtn.disabled = !canControl || (needsOBS && !obsConnected) || (needsLO && !libreOfficeAvailable);
  elements.stopBtn.disabled = !canControl;
  elements.prevBtn.disabled = !canControl;
  elements.nextBtn.disabled = !canControl;
  elements.blackoutBtn.disabled = !obsConnected;

  // Update active act in list
  elements.actList.querySelectorAll('.act-item').forEach(item => {
    const index = parseInt(item.dataset.index);
    item.classList.toggle('active', currentAct && currentAct.index === index);
  });

  // Update preview
  if (currentAct && currentAct.imagePath) {
    elements.previewArea.innerHTML = `<img src="file://${currentAct.imagePath}" alt="Preview">`;
  } else {
    elements.previewArea.innerHTML = '<div class="empty-state">No preview available</div>';
  }

  // Update act details
  if (currentAct) {
    elements.actName.textContent = currentAct.name;
    elements.actNotes.textContent = currentAct.notes || '-';
  } else {
    elements.actName.textContent = '-';
    elements.actNotes.textContent = '-';
  }
}

function setStatus(message, type = 'info') {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = {
    'info': '#999',
    'success': '#4CAF50',
    'error': '#f44336',
    'warning': '#ff9800'
  }[type] || '#999';
}

// Start the app
init();
