const { ipcRenderer } = require('electron');

// State
let currentProgram = null;
let currentAct = null;
let programs = [];
let obsConnected = false;

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
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  blackoutBtn: document.getElementById('blackoutBtn'),
  statusMessage: document.getElementById('statusMessage'),
  connectionDialog: document.getElementById('connectionDialog'),
  connectionForm: document.getElementById('connectionForm'),
  cancelConnect: document.getElementById('cancelConnect')
};

// Initialize
async function init() {
  await loadPrograms();
  setupEventListeners();
  updateUI();
}

// Event Listeners
function setupEventListeners() {
  elements.connectOBS.addEventListener('click', showConnectionDialog);
  elements.cancelConnect.addEventListener('click', hideConnectionDialog);
  elements.connectionForm.addEventListener('submit', handleConnect);
  elements.importPPT.addEventListener('click', handleImportPPT);
  elements.prevBtn.addEventListener('click', handlePrevScene);
  elements.nextBtn.addEventListener('click', handleNextScene);
  elements.blackoutBtn.addEventListener('click', handleBlackout);

  // Listen for OBS events
  ipcRenderer.on('obs:connected', () => {
    obsConnected = true;
    updateConnectionStatus();
    setStatus('Connected to OBS', 'success');
  });

  ipcRenderer.on('obs:disconnected', () => {
    obsConnected = false;
    updateConnectionStatus();
    setStatus('Disconnected from OBS', 'error');
  });

  ipcRenderer.on('obs:scene-changed', (event, sceneName) => {
    setStatus(`Scene changed: ${sceneName}`, 'info');
    updateCurrentScene();
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
  
  setStatus('Connecting to OBS...', 'info');
  
  const result = await ipcRenderer.invoke('obs:connect', { address, password });
  
  if (result.success) {
    hideConnectionDialog();
    obsConnected = true;
    updateConnectionStatus();
    setStatus('Connected to OBS successfully', 'success');
  } else {
    setStatus(`Connection failed: ${result.error}`, 'error');
    alert(`Failed to connect: ${result.error}`);
  }
}

function updateConnectionStatus() {
  if (obsConnected) {
    elements.obsStatus.classList.add('connected');
    elements.obsStatus.querySelector('.status-text').textContent = 'Connected';
    elements.connectOBS.textContent = 'Disconnect';
    elements.connectOBS.onclick = handleDisconnect;
  } else {
    elements.obsStatus.classList.remove('connected');
    elements.obsStatus.querySelector('.status-text').textContent = 'Not Connected';
    elements.connectOBS.textContent = 'Connect to OBS';
    elements.connectOBS.onclick = showConnectionDialog;
  }
  updateUI();
}

async function handleDisconnect() {
  const result = await ipcRenderer.invoke('obs:disconnect');
  if (result.success) {
    obsConnected = false;
    updateConnectionStatus();
    setStatus('Disconnected from OBS', 'info');
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
    elements.programList.innerHTML = '<div class="empty-state">No programs imported yet</div>';
    return;
  }

  elements.programList.innerHTML = programs.map(program => `
    <div class="program-item" data-id="${program.id}">
      <div class="program-item-name">${program.name}</div>
      <div class="program-item-meta">${program.actCount} acts</div>
    </div>
  `).join('');

  // Add click handlers
  elements.programList.querySelectorAll('.program-item').forEach(item => {
    item.addEventListener('click', () => loadProgram(item.dataset.id));
  });
}

async function handleImportPPT() {
  setStatus('Select PPT files to import...', 'info');
  
  const selectResult = await ipcRenderer.invoke('ppt:select');
  if (!selectResult.success) {
    return;
  }

  setStatus('Importing PPT files...', 'info');
  const result = await ipcRenderer.invoke('ppt:import', selectResult.filePaths);
  
  if (result.success) {
    setStatus(`Imported ${result.programs.length} program(s)`, 'success');
    await loadPrograms();
  } else {
    setStatus(`Import failed: ${result.error}`, 'error');
    alert(`Import failed: ${result.error}`);
  }
}

async function loadProgram(programId) {
  setStatus('Loading program...', 'info');
  
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
    
    if (obsConnected) {
      setStatus('Program loaded and scenes created in OBS', 'success');
    } else {
      setStatus('Program loaded (Connect to OBS to create scenes)', 'warning');
    }
  } else {
    setStatus(`Failed to load program: ${result.error}`, 'error');
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
  if (!obsConnected || !currentProgram) return;
  
  const result = await ipcRenderer.invoke('scene:prev');
  if (result.success) {
    await updateCurrentScene();
    setStatus('Previous scene', 'info');
  } else {
    setStatus(`Error: ${result.error}`, 'error');
  }
}

async function handleNextScene() {
  if (!obsConnected || !currentProgram) return;
  
  const result = await ipcRenderer.invoke('scene:next');
  if (result.success) {
    await updateCurrentScene();
    setStatus('Next scene', 'info');
  } else {
    setStatus(`Error: ${result.error}`, 'error');
  }
}

async function handleBlackout() {
  if (!obsConnected) return;
  
  const result = await ipcRenderer.invoke('scene:blackout');
  if (result.success) {
    currentAct = null;
    updateUI();
    setStatus('Blackout activated', 'info');
  } else {
    setStatus(`Error: ${result.error}`, 'error');
  }
}

async function jumpToAct(actIndex) {
  if (!obsConnected || !currentProgram) return;
  
  const result = await ipcRenderer.invoke('scene:jump', actIndex);
  if (result.success) {
    await updateCurrentScene();
    setStatus(`Jumped to Act ${actIndex + 1}`, 'info');
  } else {
    setStatus(`Error: ${result.error}`, 'error');
  }
}

async function updateCurrentScene() {
  if (!obsConnected) return;
  
  const result = await ipcRenderer.invoke('scene:current');
  if (result.success && result.scene.index >= 0) {
    const actIndex = result.scene.index;
    if (currentProgram && currentProgram.acts[actIndex]) {
      currentAct = currentProgram.acts[actIndex];
      updateUI();
    }
  }
}

// UI Updates
function updateUI() {
  // Update scene info
  if (currentAct && currentProgram) {
    const sceneDiv = elements.currentSceneInfo.querySelector('.scene-name');
    const numberDiv = elements.currentSceneInfo.querySelector('.scene-number');
    sceneDiv.textContent = currentAct.name;
    numberDiv.textContent = `Act ${currentAct.index + 1} of ${currentProgram.acts.length}`;
  } else if (currentProgram) {
    const sceneDiv = elements.currentSceneInfo.querySelector('.scene-name');
    const numberDiv = elements.currentSceneInfo.querySelector('.scene-number');
    sceneDiv.textContent = 'Program Loaded';
    numberDiv.textContent = `${currentProgram.acts.length} acts`;
  } else {
    const sceneDiv = elements.currentSceneInfo.querySelector('.scene-name');
    const numberDiv = elements.currentSceneInfo.querySelector('.scene-number');
    sceneDiv.textContent = 'No program loaded';
    numberDiv.textContent = '-';
  }

  // Update control buttons
  const canControl = obsConnected && currentProgram;
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
