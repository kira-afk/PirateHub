// =================================================================================
// SCRIPT.JS - FINAL REFINED VERSION
// =================================================================================

// --- HELPER FUNCTIONS ---
function formatDuration(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 1) return "00:00";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    if (hours > 0) return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    return `${paddedMinutes}:${paddedSeconds}`;
}

const naturalSort = (a, b) => a.lecture.localeCompare(b.lecture, undefined, { numeric: true, sensitivity: 'base' });

// --- GLOBAL STATE & CONFIG ---
const subjectImages = { 'Maths': 'assets/maths-icon.png', 'Physics': 'assets/physics-icon.png' };
const ICONS = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>',
    seekBackward: '<svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7v2c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1.45 8.9-2.09-2.09L8.35 9v4.15h1.5V10.8l1.29 1.29 1.11-1.1z"></path></svg>', // Replay 10
    seekForward: '<svg viewBox="0 0 24 24"><path d="M18 12h-3l3.89-3.89.07-.14L23 12h-3c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9v2c-3.87 0-7 3.13-7 7s3.13 7 7 7 7-3.13 7-7zm-4.35-1.1-1.11 1.1 1.29 1.29V13.15h-1.5V9l1.11.91 2.09-2.09z"></path></svg>', // Forward 10
    volumeHigh: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>',
    volumeLow: '<svg viewBox="0 0 24 24"><path d="M5 9v6h4l5 5V4L9 9H5z"></path></svg>',
    volumeMute: '<svg viewBox="0 0 24 24"><path d="M7 9v6h4l5 5V4l-5 5H7z"></path></svg>',
    fullscreen: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path></svg>',
    fullscreenExit: '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"></path></svg>',
    settings: '<svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24-.42-.12-.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38 2.65c.61-.25 1.17-.59-1.69.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"></path></svg>',
    pip: '<svg viewBox="0 0 24 24"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 2.02V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"></path></svg>',
    pdfFile: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM9.5 14c.83 0 1.5-.67 1.5-1.5S10.33 11 9.5 11s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm3 2.5c0 .83-.67 1.5-1.5 1.5h-3c-.83 0-1.5-.67-1.5-1.5v-3c0-.83.67-1.5 1.5-1.5h3c.83 0 1.5.67 1.5 1.5v3zm-3-4H7v1h2.5v2H7v1h4v-4zM13 9V3.5L18.5 9H13z"></path></svg>',
    genericFile: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"></path></svg>'
};

let allFiles = [], groupedData = {}, currentSubject = '';
let currentPlayer = null, currentPlaylist = [];
const availableSpeeds = [0.75, 1, 1.5, 2];
let sessionStartTime = null;

const VIEWS = {};
const GRIDS = {};
const TITLES = {};

const Storage = { save: (key, data) => localStorage.setItem(key, JSON.stringify(data)), load: (key) => JSON.parse(localStorage.getItem(key)), getTodayDate: () => new Date().toISOString().split('T')[0] };
const AppState = { saveProgress: (id, currentTime, duration) => { if (!id || !duration) return; const progress = Storage.load('videoProgress') || {}; progress[id] = { currentTime, duration, timestamp: Date.now() }; Storage.save('videoProgress', progress); if (duration > 0 && (currentTime / duration) > 0.9) AppState.markGoalAsCompleted(id); }, getProgress: (id) => (Storage.load('videoProgress') || {})[id] || { currentTime: 0, duration: 0 }, getRecentlyWatched: () => { const progress = Storage.load('videoProgress') || {}; return Object.keys(progress).map(id => ({ id, ...progress[id] })).sort((a, b) => b.timestamp - a.timestamp).slice(0, 3).map(item => allFiles.find(f => f.id === item.id)).filter(Boolean); }, getCompletedGoalsForToday: () => { const completed = Storage.load('completedGoals') || {}; return completed.date === Storage.getTodayDate() ? completed : { date: Storage.getTodayDate(), videoIds: [] }; }, markGoalAsCompleted: (videoId) => { const completed = AppState.getCompletedGoalsForToday(); if (!completed.videoIds.includes(videoId)) { completed.videoIds.push(videoId); Storage.save('completedGoals', completed); renderDailyGoals(); } }, savePlaybackSpeed: (speed) => Storage.save('playbackSpeed', speed), loadPlaybackSpeed: () => Storage.load('playbackSpeed') || 1, loadTodos: () => Storage.load('todos') || [], saveTodos: (todos) => Storage.save('todos', todos), saveSession: (id, sessionData) => { if (!id) return; const progress = Storage.load('videoProgress') || {}; if (!progress[id]) progress[id] = {}; if (!progress[id].sessions) progress[id].sessions = []; sessionData.todosSnapshot = AppState.loadTodos(); progress[id].sessions.push(sessionData); progress[id].timestamp = Date.now(); Storage.save('videoProgress', progress); }, saveVolume: (volume, muted) => Storage.save('playerVolume', { volume, muted }), loadVolume: () => Storage.load('playerVolume') || { volume: 1, muted: false } };

function switchView(viewName) { Object.values(VIEWS).forEach(view => view.classList.remove('active')); VIEWS[viewName].classList.add('active'); window.scrollTo(0, 0); const navLinks = document.querySelectorAll('.navbar nav a'); navLinks.forEach(link => { const isDashboardRelated = ['dashboard', 'lectures', 'player'].includes(viewName); if (link.dataset.view === 'dashboard') link.classList.toggle('active', isDashboardRelated); else link.classList.toggle('active', link.dataset.view === viewName); }); }
function showSubjects() { switchView('dashboard'); renderSubjects(); }
function showAllLecturesForSubject(subjectName) { currentSubject = subjectName; renderAllLecturesView(subjectName); switchView('lectures'); }
function playLecture(fileId) { renderPlayerView(fileId); switchView('player'); }
function showResources() { renderResources(); switchView('resources'); }
function showTodo() { renderTodos(); switchView('todo'); }

document.addEventListener('DOMContentLoaded', async () => {
    Object.assign(VIEWS, { dashboard: document.getElementById('dashboard-view'), lectures: document.getElementById('lecture-view'), player: document.getElementById('player-view'), resources: document.getElementById('resources-view'), todo: document.getElementById('todo-view'), });
    Object.assign(GRIDS, { subjects: document.getElementById('subject-grid'), lectures: document.getElementById('lecture-grid'), goals: document.getElementById('daily-goals-grid'), resources: document.getElementById('resources-grid'), });
    TITLES.lectures = document.getElementById('lecture-title');
    document.getElementById('todo-form').addEventListener('submit', (e) => { e.preventDefault(); const todoInput = document.getElementById('todo-input'); const taskText = todoInput.value.trim(); if (taskText) { addTodo(taskText); todoInput.value = ''; } });
    document.getElementById('add-lecture-todo-btn').addEventListener('click', openPinLectureModal);
    document.getElementById('pin-modal-close-btn').addEventListener('click', closePinLectureModal);
    document.getElementById('pin-search-input').addEventListener('input', filterPinLectureList);
    setupKeyboardShortcuts();
    try {
        const response = await fetch('data.json');
        allFiles = await response.json();
        if (allFiles.length === 0) throw new Error("No files found in data.json");
        groupData(); renderSubjects(); renderDailyGoals(); renderTodos();
        checkEndOfDayPrompt(); setInterval(checkEndOfDayPrompt, 60 * 60 * 1000);
        switchView('dashboard');
    } catch (error) { document.getElementById('app-content').innerHTML = `<h1 style="text-align: center; padding: 4rem;">Error: ${error.message}</h1>`; }
});

function groupData() { groupedData = {}; allFiles.forEach(file => { if (!file.subject || !file.chapter) return; if (!groupedData[file.subject]) groupedData[file.subject] = {}; if (!groupedData[file.subject][file.chapter]) groupedData[file.subject][file.chapter] = []; groupedData[file.subject][file.chapter].push(file); }); }
function renderSubjects() { GRIDS.subjects.innerHTML = ''; const subjects = Object.keys(groupedData).sort(); subjects.forEach(subjectName => { const card = document.createElement('div'); card.className = 'glass-card subject-card'; card.onclick = () => showAllLecturesForSubject(subjectName); const lectureCount = allFiles.filter(f => f.subject === subjectName && f.path && f.path.endsWith('.mp4')).length; const chapterCount = Object.keys(groupedData[subjectName]).length; const imageUrl = subjectImages[subjectName] || 'assets/default-icon.png'; card.innerHTML = ` <div class="subject-icon-container"> <img src="${imageUrl}" alt="${subjectName} icon"> </div> <div> <h3>${subjectName}</h3> <p>${lectureCount} Lectures | ${chapterCount} Chapters</p> </div> `; GRIDS.subjects.appendChild(card); }); }
function renderAllLecturesView(subjectName) { TITLES.lectures.textContent = subjectName; GRIDS.lectures.innerHTML = ''; currentPlaylist = allFiles.filter(file => file.subject === subjectName && file.path && file.path.toLowerCase().endsWith('.mp4')).sort(naturalSort); currentPlaylist.forEach(videoFile => GRIDS.lectures.appendChild(createLectureCard(videoFile))); }
function getNextUnwatchedLecture(subjectName) { const lectures = allFiles.filter(file => file.subject === subjectName && file.path && file.path.toLowerCase().endsWith('.mp4')).sort(naturalSort); return lectures.find(lecture => { const { currentTime, duration } = AppState.getProgress(lecture.id); return !(duration > 0 && (currentTime / duration) > 0.9); }); }
function renderDailyGoals() { GRIDS.goals.innerHTML = ''; const completedToday = AppState.getCompletedGoalsForToday().videoIds; let goalsFound = 0; const subjects = Object.keys(groupedData).sort(); subjects.forEach(subjectName => { const nextLecture = getNextUnwatchedLecture(subjectName); if (nextLecture && !completedToday.includes(nextLecture.id)) { GRIDS.goals.appendChild(createScheduleCard(nextLecture, 'Up Next')); goalsFound++; } }); if (goalsFound === 0) GRIDS.goals.innerHTML = '<p style="text-align: center; color: var(--text-medium); font-size: 1.2rem;">You\'re all caught up for today! Great work.</p>'; }
function createLectureCard(videoFile) { const card = document.createElement('div'); card.className = 'glass-card lecture-item'; card.onclick = () => playLecture(videoFile.id); const { currentTime, duration } = AppState.getProgress(videoFile.id); const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0; const thumbnailUrl = videoFile.thumbnail || 'assets/default.png'; card.innerHTML = ` <div class="media-container"> <img src="${thumbnailUrl}" loading="lazy" onerror="this.onerror=null;this.src='assets/default.png';"> <span class="lecture-duration">${formatDuration(videoFile.duration)}</span> </div> <div class="lecture-item-content"> <h4>${videoFile.lecture}</h4> <p>${videoFile.chapter}</p> <div class="progress-bar"> <div class="progress" style="width: ${progressPercent}%"></div> </div> </div>`; return card; }
function createScheduleCard(videoFile, statusText) { const card = document.createElement('div'); card.className = 'schedule-card'; card.onclick = () => playLecture(videoFile.id); const totalDuration = formatDuration(videoFile.duration); const progressInfo = ` <div class="info-line"> <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M13 7h-2v6h6v-2h-4V7z"></path></svg> <span>${totalDuration}</span> </div>`; card.innerHTML = ` <div class="card-header"> <span class="subject-tag">${videoFile.subject}</span> <span class="status-badge">${statusText}</span> </div> <h4>${videoFile.lecture}</h4> ${progressInfo} <p class="chapter-info">Ch: ${videoFile.chapter}</p> `; return card; }

// --- PLAYER VIEW ---
function renderPlayerView(fileId) {
    sessionStartTime = new Date();
    const file = allFiles.find(f => f.id === fileId);
    if (!file || !file.path) {
        VIEWS.player.innerHTML = `<p>Error: Could not find video file.</p>`;
        return;
    }

    VIEWS.player.innerHTML = `
        <header class="page-header">
            <div class="lecture-title-wrapper">
                <h2 class="player-lecture-title">${file.lecture}</h2>
                <p>${file.subject} | ${file.chapter}</p>
            </div>
            <button class="back-button" id="back-to-lectures-btn-player">← Back</button>
        </header>
        <div class="player-page-layout">
            <div class="video-main-content">
                <div class="player-wrapper">
                    <div id="shortcut-indicator"></div>
                    <video data-id="${file.id}" src="${file.path}" onerror="this.parentElement.innerHTML = '<div style=\\'padding: 2rem; text-align: center; color: #ef4444;\\'>Error: Video file not found. Check the path in data.json.</div>'"></video>
                    <div class="video-controls-overlay">
                        <button class="control-btn" data-action="seek-backward" aria-label="Replay 10s">${ICONS.seekBackward}</button>
                        <button class="control-btn" data-action="play-pause" aria-label="Play/Pause"></button>
                        <button class="control-btn" data-action="seek-forward" aria-label="Forward 10s">${ICONS.seekForward}</button>
                        <div class="volume-container">
                            <button class="control-btn" data-action="volume" aria-label="Volume"></button>
                            <div class="volume-slider-container"><input type="range" class="volume-slider" min="0" max="1" step="0.05" value="1"></div>
                        </div>
                        <div class="time-display"><span class="current-time">00:00</span> / <span class="total-time">00:00</span></div>
                        <div class="progress-bar-container"><div class="progress-bar-filled"></div></div>
                        <div class="controls-right">
                            <button class="control-btn" data-action="pip" aria-label="Picture-in-Picture">${ICONS.pip}</button>
                            <div class="settings-container">
                                <button class="control-btn" data-action="settings" aria-label="Settings">${ICONS.settings}</button>
                                <div class="settings-menu">
                                    <div class="settings-menu-item speed-control">
                                        <span>Speed</span> <span class="current-speed">Normal</span> <div class="speed-options"></div>
                                    </div>
                                </div>
                            </div>
                            <button class="control-btn" data-action="fullscreen" aria-label="Fullscreen"></button>
                        </div>
                    </div>
                    <button id="skip-intro-btn" style="display: none;">Skip Intro</button>
                </div>
            </div>
            <div class="video-sidebar">
                <h3>Related Files</h3>
                <div id="related-files-list"></div>
            </div>
        </div>`;

    currentPlayer = VIEWS.player.querySelector('video');
    setupPlayerControls(file);
    setupPlayerEvents(file);
}

function setupPlayerControls(file) {
    const playerWrapper = VIEWS.player.querySelector('.player-wrapper');
    const playPauseBtn = VIEWS.player.querySelector('[data-action="play-pause"]');
    const seekBackwardBtn = VIEWS.player.querySelector('[data-action="seek-backward"]');
    const seekForwardBtn = VIEWS.player.querySelector('[data-action="seek-forward"]');
    const volumeBtn = VIEWS.player.querySelector('[data-action="volume"]');
    const volumeSlider = VIEWS.player.querySelector('.volume-slider');
    const fullscreenBtn = VIEWS.player.querySelector('[data-action="fullscreen"]');
    const pipBtn = VIEWS.player.querySelector('[data-action="pip"]');
    const settingsBtn = VIEWS.player.querySelector('[data-action="settings"]');
    const settingsMenu = VIEWS.player.querySelector('.settings-menu');
    const speedOptionsContainer = VIEWS.player.querySelector('.speed-options');

    // Play/Pause
    const togglePlayPause = () => currentPlayer.paused ? currentPlayer.play() : currentPlayer.pause();
    playPauseBtn.onclick = togglePlayPause;
    playerWrapper.onclick = (e) => {
        if (e.target.closest('.control-btn, .settings-menu, .volume-slider-container, .progress-bar-container')) return;
        togglePlayPause();
    };
    
    // Seeking
    seekBackwardBtn.onclick = () => { currentPlayer.currentTime = Math.max(0, currentPlayer.currentTime - 10); };
    seekForwardBtn.onclick = () => { currentPlayer.currentTime = Math.min(currentPlayer.duration, currentPlayer.currentTime + 10); };

    // Volume and Mute (IMPROVED LOGIC)
    let lastNonMuteVolume = 1;
    const updateVolumeIcon = () => {
        if (currentPlayer.muted || currentPlayer.volume === 0) {
            volumeBtn.innerHTML = ICONS.volumeMute;
        } else if (currentPlayer.volume < 0.5) {
            volumeBtn.innerHTML = ICONS.volumeLow;
        } else {
            volumeBtn.innerHTML = ICONS.volumeHigh;
        }
    };
    
    volumeBtn.onclick = () => {
        if (currentPlayer.muted) {
            currentPlayer.muted = false;
            currentPlayer.volume = lastNonMuteVolume > 0 ? lastNonMuteVolume : 0.1; // Restore to last volume or a small default
        } else {
            lastNonMuteVolume = currentPlayer.volume;
            currentPlayer.muted = true;
        }
    };
    
    volumeSlider.oninput = (e) => {
        const newVolume = parseFloat(e.target.value);
        currentPlayer.volume = newVolume;
        currentPlayer.muted = newVolume === 0;
    };

    // Speed Controls
    const speedOptions = speedOptionsContainer;
    availableSpeeds.forEach(speed => {
        const option = document.createElement('div');
        option.classList.add('option');
        option.dataset.speed = speed;
        option.textContent = speed === 1 ? 'Normal' : `${speed}x`;
        speedOptions.appendChild(option);
    });
    speedOptions.onclick = (e) => {
        if (e.target.classList.contains('option')) {
            currentPlayer.playbackRate = parseFloat(e.target.dataset.speed);
            AppState.savePlaybackSpeed(currentPlayer.playbackRate);
            settingsMenu.classList.remove('visible');
        }
    };

    // Other Controls
    pipBtn.onclick = () => currentPlayer.requestPictureInPicture?.();
    fullscreenBtn.onclick = () => {
        if (!document.fullscreenElement) playerWrapper.requestFullscreen?.();
        else document.exitFullscreen?.();
    };
    settingsBtn.onclick = (e) => {
        e.stopPropagation();
        settingsMenu.classList.toggle('visible');
    };
    document.addEventListener('click', (e) => {
        if (!settingsBtn.contains(e.target) && !settingsMenu.contains(e.target)) {
            settingsMenu.classList.remove('visible');
        }
    });
    document.getElementById('back-to-lectures-btn-player').onclick = () => {
        if (currentPlayer && sessionStartTime) {
            const sessionEndTime = new Date();
            const durationWatched = (sessionEndTime - sessionStartTime) / 1000;
            AppState.saveSession(file.id, { startTime: sessionStartTime.toISOString(), endTime: sessionEndTime.toISOString(), durationWatched: Math.round(durationWatched), stoppedAt: currentPlayer.currentTime });
        }
        showSubjects();
    };
}

function setupPlayerEvents(file) {
    const playerWrapper = VIEWS.player.querySelector('.player-wrapper');
    const playPauseBtn = VIEWS.player.querySelector('[data-action="play-pause"]');
    const volumeBtn = VIEWS.player.querySelector('[data-action="volume"]');
    const volumeSlider = VIEWS.player.querySelector('.volume-slider');
    const fullscreenBtn = VIEWS.player.querySelector('[data-action="fullscreen"]');
    const skipBtn = VIEWS.player.querySelector('#skip-intro-btn');
    const currentTimeEl = VIEWS.player.querySelector('.current-time');
    const totalTimeEl = VIEWS.player.querySelector('.total-time');
    const progressBar = VIEWS.player.querySelector('.progress-bar-filled');
    const progressBarContainer = VIEWS.player.querySelector('.progress-bar-container');
    const currentSpeedEl = VIEWS.player.querySelector('.current-speed');
    const speedOptionsContainer = VIEWS.player.querySelector('.speed-options');

    // Initial UI setup
    playPauseBtn.innerHTML = currentPlayer.paused ? ICONS.play : ICONS.pause;
    fullscreenBtn.innerHTML = document.fullscreenElement ? ICONS.fullscreenExit : ICONS.fullscreen;

    // Inactivity timer for controls
    let inactivityTimer;
    const showControlsAndFade = () => {
        clearTimeout(inactivityTimer);
        playerWrapper.classList.add('controls-visible');
        if (!currentPlayer.paused) {
            inactivityTimer = setTimeout(() => playerWrapper.classList.remove('controls-visible'), 3000);
        }
    };
    playerWrapper.addEventListener('mousemove', showControlsAndFade);
    playerWrapper.addEventListener('mouseleave', () => clearTimeout(inactivityTimer));

    // Player event listeners
    currentPlayer.onplay = () => {
        playPauseBtn.innerHTML = ICONS.pause;
        showControlsAndFade();
    };
    currentPlayer.onpause = () => {
        playPauseBtn.innerHTML = ICONS.play;
        clearTimeout(inactivityTimer);
        playerWrapper.classList.add('controls-visible');
    };
    currentPlayer.onloadedmetadata = () => {
        totalTimeEl.textContent = formatDuration(currentPlayer.duration);
        const progress = AppState.getProgress(file.id);
        if (progress) currentPlayer.currentTime = progress.currentTime;
        
        const savedSpeed = AppState.loadPlaybackSpeed();
        currentPlayer.playbackRate = savedSpeed;
        currentSpeedEl.textContent = savedSpeed === 1 ? 'Normal' : `${savedSpeed}x`;
        speedOptionsContainer.querySelectorAll('.option').forEach(opt => opt.classList.toggle('active', parseFloat(opt.dataset.speed) === savedSpeed));
        
        const lastVolume = AppState.loadVolume();
        currentPlayer.volume = lastVolume.volume;
        currentPlayer.muted = lastVolume.muted;

        currentPlayer.play().catch(e => console.error("Playback failed:", e));
    };
    
    let lastSaveTime = 0;
    currentPlayer.ontimeupdate = () => {
        if (!currentPlayer.duration) return;
        progressBar.style.width = `${(currentPlayer.currentTime / currentPlayer.duration) * 100}%`;
        currentTimeEl.textContent = formatDuration(currentPlayer.currentTime);
        skipBtn.style.display = (currentPlayer.currentTime > 1 && currentPlayer.currentTime < 30) ? 'block' : 'none';
        
        const now = Date.now();
        if (now - lastSaveTime > 5000) {
            AppState.saveProgress(file.id, currentPlayer.currentTime, currentPlayer.duration);
            lastSaveTime = now;
        }
    };
    
    currentPlayer.onvolumechange = () => {
        const newVolume = currentPlayer.muted ? 0 : currentPlayer.volume;
        if (!currentPlayer.muted && newVolume > 0) {
            lastNonMuteVolume = newVolume;
        }
        volumeSlider.value = newVolume;
        if (currentPlayer.muted || currentPlayer.volume === 0) {
            volumeBtn.innerHTML = ICONS.volumeMute;
        } else if (currentPlayer.volume < 0.5) {
            volumeBtn.innerHTML = ICONS.volumeLow;
        } else {
            volumeBtn.innerHTML = ICONS.volumeHigh;
        }
        AppState.saveVolume(currentPlayer.volume, currentPlayer.muted);
    };

    currentPlayer.onratechange = () => {
        const speed = currentPlayer.playbackRate;
        currentSpeedEl.textContent = speed === 1 ? 'Normal' : `${speed}x`;
        speedOptionsContainer.querySelectorAll('.option').forEach(opt => opt.classList.toggle('active', parseFloat(opt.dataset.speed) === speed));
    };

    // Controls event listeners
    progressBarContainer.addEventListener('click', (e) => {
        const rect = progressBarContainer.getBoundingClientRect();
        currentPlayer.currentTime = ((e.clientX - rect.left) / rect.width) * currentPlayer.duration;
    });

    skipBtn.onclick = () => {
        currentPlayer.currentTime = 30;
    };

    document.addEventListener('fullscreenchange', () => {
        fullscreenBtn.innerHTML = document.fullscreenElement ? ICONS.fullscreenExit : ICONS.fullscreen;
    });

    // Render related files
    const relatedList = VIEWS.player.querySelector('#related-files-list');
    relatedList.innerHTML = '';
    if (file.relatedFiles && file.relatedFiles.length > 0) {
        file.relatedFiles.forEach(rf => {
            const item = document.createElement('a');
            item.href = rf.path;
            item.target = '_blank';
            item.className = 'glass-card related-file-item';
            const icon = rf.path.toLowerCase().endsWith('.pdf') ? ICONS.pdfFile : ICONS.genericFile;
            item.innerHTML = `<span class="related-file-icon">${icon}</span><span>${rf.title}</span>`;
            relatedList.appendChild(item);
        });
    } else {
        relatedList.innerHTML = '<p style="text-align: center; color: var(--text-medium);">No related files.</p>';
    }
}

// --- TODO & OTHER VIEWS ---
async function renderResources() { GRIDS.resources.innerHTML = ''; try { const response = await fetch('resources.json'); if (!response.ok) throw new Error('Network response was not ok'); const resources = await response.json(); if (resources.length === 0) { GRIDS.resources.innerHTML = '<p>No resources found.</p>'; return; } resources.forEach(res => { const card = document.createElement('div'); card.className = 'glass-card'; card.style.cursor = 'default'; const tagsHTML = res.tags.map(tag => `<span style="background-color: #374151; color: #E5E7EB; padding: 5px 12px; border-radius: 15px; font-size: 0.8rem; margin-right: 5px;">${tag}</span>`).join(''); card.innerHTML = `<div style="padding: 0;"><h4 style="font-size: 1.3rem;">${res.title}</h4><p>${res.description}</p><div style="margin-bottom: 1.5rem;">${tagsHTML}</div><a href="${res.url}" target="_blank" class="cta-button" style="width: 100%; text-align:center;">Open Resource</a></div>`; GRIDS.resources.appendChild(card); }); } catch (error) { console.error('Failed to load resources:', error); GRIDS.resources.innerHTML = '<p style="color: #ef4444;">Could not load resources. Please check resources.json and the console for errors.</p>'; } }
function addTodo(task) { const todos = AppState.loadTodos(); let newTodo; if (typeof task === 'string') newTodo = { id: Date.now(), type: 'custom', text: task, completed: false }; else newTodo = { id: Date.now(), type: 'lecture', lectureId: task.id, text: `${task.subject} - ${task.lecture}`, completed: false }; const isDuplicate = todos.some(todo => todo.lectureId && todo.lectureId === newTodo.lectureId); if (newTodo.type === 'lecture' && isDuplicate) { alert('This lecture is already on your to-do list.'); return; } todos.push(newTodo); AppState.saveTodos(todos); renderTodos(); }
function toggleTodo(id) { const todos = AppState.loadTodos(); const todo = todos.find(t => t.id === id); if (todo) todo.completed = !todo.completed; AppState.saveTodos(todos); renderTodos(); }
function deleteTodo(id) { let todos = AppState.loadTodos(); todos = todos.filter(t => t.id !== id); AppState.saveTodos(todos); renderTodos(); }
function renderTodos() { const todos = AppState.loadTodos(); const todoListContainer = document.getElementById('todo-list-container'); if (!todoListContainer) return; todoListContainer.innerHTML = ''; if (todos.length === 0) { todoListContainer.innerHTML = '<p style="text-align:center; color: var(--text-medium);">Your to-do list is empty. Pin a lecture to get started!</p>'; return; } todos.forEach(todo => { const li = document.createElement('li'); li.className = `todo-item ${todo.completed ? 'completed' : ''}`; const taskHTML = todo.type === 'lecture' ? `<a href="#" onclick="playLecture('${todo.lectureId}'); return false;">${todo.text}</a>` : `<span>${todo.text}</span>`; li.innerHTML = `<input type="checkbox" ${todo.completed ? 'checked' : ''}>${taskHTML}<button class="delete-btn">&times;</button>`; li.querySelector('input[type="checkbox"]').addEventListener('change', () => toggleTodo(todo.id)); li.querySelector('.delete-btn').addEventListener('click', () => deleteTodo(todo.id)); todoListContainer.appendChild(li); }); }
function openPinLectureModal() { populatePinLectureList(); document.getElementById('pin-lecture-modal').style.display = 'flex'; }
function closePinLectureModal() { document.getElementById('pin-lecture-modal').style.display = 'none'; document.getElementById('pin-search-input').value = ''; }
function populatePinLectureList(filter = '') { const listContainer = document.getElementById('pin-lecture-list'); listContainer.innerHTML = ''; const lectures = allFiles.filter(f => f.path && f.path.toLowerCase().endsWith('.mp4')); const lowerCaseFilter = filter.toLowerCase(); const filteredLectures = lectures.filter(l => l.subject.toLowerCase().includes(lowerCaseFilter) || l.chapter.toLowerCase().includes(lowerCaseFilter) || l.lecture.toLowerCase().includes(lowerCaseFilter)); if (filteredLectures.length === 0) { listContainer.innerHTML = '<p style="text-align:center; color: var(--text-medium);">No lectures found.</p>'; } filteredLectures.sort(naturalSort).forEach(lecture => { const item = document.createElement('div'); item.className = 'pin-item'; item.innerHTML = `<h4>${lecture.lecture}</h4><p>${lecture.subject} | ${lecture.chapter}</p>`; item.onclick = () => { addTodo(lecture); closePinLectureModal(); }; listContainer.appendChild(item); }); }
function filterPinLectureList(event) { populatePinLectureList(event.target.value); }
function checkEndOfDayPrompt() { const lastPromptDate = Storage.load('lastPromptDate'); const today = Storage.getTodayDate(); const currentHour = new Date().getHours(); if (currentHour >= 20 && lastPromptDate !== today) { const todos = AppState.loadTodos(); if (todos.length === 0) return; const incompleteTasks = todos.filter(t => !t.completed).length; const modal = document.getElementById('end-of-day-modal'); const title = document.getElementById('modal-title'); const message = document.getElementById('modal-message'); if (incompleteTasks === 0) { title.textContent = 'Awesome Work! ✨'; message.textContent = 'You\'ve completed all your tasks for the day. Great job!'; } else { title.textContent = 'End of Day Check-in'; message.textContent = `You still have ${incompleteTasks} task(s) remaining. Try to wrap them up!`; } modal.style.display = 'flex'; document.getElementById('modal-close-btn').onclick = () => { modal.style.display = 'none'; Storage.save('lastPromptDate', today); }; } }

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'INPUT' || !VIEWS.player.classList.contains('active') || !currentPlayer) return;
        const playerWrapper = VIEWS.player.querySelector('.player-wrapper');
        const handleSpeedChange = (direction) => { const currentIndex = availableSpeeds.indexOf(currentPlayer.playbackRate); let newIndex = currentIndex + direction; if (newIndex < 0) newIndex = 0; if (newIndex >= availableSpeeds.length) newIndex = availableSpeeds.length - 1; const newSpeed = availableSpeeds[newIndex]; currentPlayer.playbackRate = newSpeed; };
        if (e.code.startsWith('Digit')) { const digit = parseInt(e.code.replace('Digit', ''), 10); if (!isNaN(digit)) { e.preventDefault(); currentPlayer.currentTime = currentPlayer.duration * (digit / 10); } return; }
        if (e.shiftKey) { switch (e.code) { case 'Comma': e.preventDefault(); handleSpeedChange(-1); break; case 'Period': e.preventDefault(); handleSpeedChange(1); break; } return; }
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (currentPlayer.paused) currentPlayer.play();
                else currentPlayer.pause();
                break;
            case 'ArrowRight':
                e.preventDefault();
                currentPlayer.currentTime = Math.min(currentPlayer.duration, currentPlayer.currentTime + 10);
                showShortcutIndicator('forward');
                break;
            case 'ArrowLeft':
                e.preventDefault();
                currentPlayer.currentTime = Math.max(0, currentPlayer.currentTime - 10);
                showShortcutIndicator('backward');
                break;
            case 'KeyB':
                showSubjects();
                break;
            case 'KeyF':
                e.preventDefault();
                if (!document.fullscreenElement) playerWrapper.requestFullscreen?.();
                else document.exitFullscreen?.();
                break;
            case 'KeyM':
                e.preventDefault();
                // A better mute toggle using the button's click logic
                const volumeBtn = VIEWS.player.querySelector('[data-action="volume"]');
                if(volumeBtn) volumeBtn.click();
                break;
            case 'KeyN':
                const currentIndex = currentPlaylist.findIndex(v => v.id === currentPlayer.dataset.id);
                if (currentIndex !== -1 && currentIndex < currentPlaylist.length - 1) {
                    playLecture(currentPlaylist[currentIndex + 1].id);
                }
                break;
        }
    });
}

function showShortcutIndicator(type) { const indicator = document.getElementById('shortcut-indicator'); if (!indicator) return; const icons = { forward: '<svg viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"></path></svg>', backward: '<svg viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm-2-6l6 4.5V7.5L9 12z"></path></svg>' }; indicator.innerHTML = icons[type] || ''; indicator.classList.add('show'); setTimeout(() => indicator.classList.remove('show'), 600); }