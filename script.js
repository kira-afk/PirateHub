// =================================================================================
// PirateHive Z - Final, Stable & Complete Script
// =================================================================================
function renderDashboard() {
    renderSubjects();
    renderDailyLectures();
    renderContinueWatching();
    showView('dashboard-view');
}

document.addEventListener('DOMContentLoaded', initializeApp);

// --- App State ---
const appState = {
    subjects: [], resources: [], pinned: [],
    progress: {}, history: [], currentView: 'dashboard',
};
let player;
// --- Helper: Encode video paths safely for browser ---
function safeVideoPath(path) {
    return encodeURI(path); // converts spaces & special characters
}


// --- App Initialization ---
async function initializeApp() {
    loadState();
    addGlobalEventListeners();
    initializeExtraUI();
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const jsonData = await response.json();
        transformData(jsonData);
        render();
    } catch (error) {
        console.error("Fatal Error: Could not load data.json.", error);
        document.body.innerHTML = `<h2 style="text-align:center; margin-top:50px;">Error: Could not load data.json.</h2>`;
    }
}

// --- State Management ---
function loadState() {
    appState.progress = JSON.parse(localStorage.getItem('studyProgress')) || {};
    appState.pinned = JSON.parse(localStorage.getItem('pinnedItems')) || [];
    appState.history = JSON.parse(localStorage.getItem('studyHistory')) || [];
}

function saveState() {
    localStorage.setItem('studyProgress', JSON.stringify(appState.progress));
    localStorage.setItem('pinnedItems', JSON.stringify(appState.pinned));
    localStorage.setItem('studyHistory', JSON.stringify(appState.history));
}

// --- Data Transformation ---
function transformData(jsonData) {
    const lectures = jsonData.lectures || [];
    const subjectsMap = new Map();
    lectures.forEach(lec => {
        let subject = subjectsMap.get(lec.subject);
        if (!subject) {
            subject = { id: lec.subject.toLowerCase().replace(/\s/g, '-'), name: lec.subject, chapters: new Map() };
            subjectsMap.set(lec.subject, subject);
        }
        let chapter = subject.chapters.get(lec.chapter);
        if (!chapter) {
            chapter = { id: lec.chapter.toLowerCase().replace(/\s/g, '-'), name: lec.chapter, lectures: [] };
            subject.chapters.set(lec.chapter, chapter);
        }
        const progress = appState.progress[lec.id] || { time: 0, completed: false };
        chapter.lectures.push({ ...lec, ...progress, durationSec: parseDuration(lec.duration), subjectId: subject.id });
    });
    
    appState.subjects = Array.from(subjectsMap.values()).map(subject => {
        subject.chapters = Array.from(subject.chapters.values());
        subject.totalLectures = subject.chapters.reduce((sum, ch) => sum + ch.lectures.length, 0);
        subject.completed = subject.chapters.reduce((sum, ch) => sum + ch.lectures.filter(l => l.completed).length, 0);
        return subject;
    });
    appState.resources = jsonData.resources || [];
}


// --- Central Rendering Engine ---
function render() {
    const [view, ...params] = appState.currentView.split('-');
    renderPinnedItems();
    switch (view) {
        case 'dashboard': renderDashboard(); break;
        case 'chapters': renderChapters(params[0]); break;
        case 'lectures': renderLectures(params[0], params[1]); break;
        case 'resources': renderResources(); break;
        case 'history': renderHistory(); break;
        case 'player':
            const [subjectId, lectureId] = params;
            const subject = findSubjectById(subjectId);
            const lecture = findLectureById(lectureId);
            const chapter = subject?.chapters.find(c => c.lectures.some(l => l.id === lectureId));
            if (lecture && chapter && subject) updatePlayerUI(lecture, chapter, subject);
            break;
    }
}


function renderSubjects() {
    const grid = document.getElementById('subject-grid');
    if (!grid) return;
    const icons = { "maths": "fa-square-root-alt", "physics": "fa-bolt", "chemistry": "fa-flask", "default": "fa-book" };
    grid.innerHTML = appState.subjects.map(subject => {
        const key = Object.keys(icons).find(k => subject.name.toLowerCase().includes(k)) || 'default';
        return `
            <div class="subject-card glass-card" data-action="show-chapters" data-subject-id="${subject.id}">
                <i class="fas ${icons[key]} subject-icon"></i>
                <h3>${escapeHTML(subject.name)}</h3>
                <p>${subject.completed} / ${subject.totalLectures} lectures completed.</p>
            </div>`;
    }).join('');
}

function renderDailyLectures() {
    const grid = document.getElementById('daily-goals-grid');
    if (!grid) return;
    const todaysLectures = appState.subjects.map(subject => {
        for (const chapter of subject.chapters) {
            const nextLecture = chapter.lectures.find(l => !l.completed);
            if (nextLecture) return { lecture: nextLecture, subject };
        }
        return null;
    }).filter(Boolean);
    grid.innerHTML = todaysLectures.length ? todaysLectures.slice(0, 4).map(item => createLectureCardHTML(item.lecture, item.subject)).join('') : `<p>All new lectures completed!</p>`;
}

function renderContinueWatching() {
    const grid = document.getElementById('continue-watching-grid');
    if (!grid) return;
    let inProgress = [];
    appState.subjects.forEach(s => s.chapters.forEach(c => c.lectures.forEach(l => {
        if (l.time > 0 && !l.completed) inProgress.push({ lecture: l, subject: s });
    })));
    inProgress.sort((a, b) => (b.lecture.lastWatched || 0) - (a.lecture.lastWatched || 0));
    grid.innerHTML = inProgress.length ? inProgress.slice(0, 4).map(item => createLectureCardHTML(item.lecture, item.subject)).join('') : `<p>No lectures in progress. Start a new one!</p>`;
}

function renderPinnedItems() {
    const list = document.getElementById('todo-list');
    if (!list) return;
    list.innerHTML = appState.pinned.length ? appState.pinned.map(item => {
        const lecture = findLectureById(item.id);
        const subject = findSubjectById(item.subjectId);
        if (!lecture || !subject) return '';
        const text = `${lecture.lecture} - ${subject.name}`;
        return `
            <li class="todo-item glass-card" data-action="play-video" data-subject-id="${item.subjectId}" data-lecture-id="${item.id}">
                <div class="todo-item-info"><i class="fas fa-play-circle"></i><span>${escapeHTML(text)}</span></div>
                <button class="delete-todo" data-action="toggle-pin" data-id="${item.id}" data-subject-id="${item.subjectId}">&times;</button>
            </li>`;
    }).join('') : `<li class="todo-item-empty">No items pinned.</li>`;
}

function createLectureCardHTML(lecture, subject) {
    const isPinned = appState.pinned.some(p => p.id === lecture.id);
    const hasThumb = lecture.thumbnail && !lecture.thumbnail.includes('assets/default.png');
    const icons = {"physics": "fa-bolt", "chemistry": "fa-flask", "maths": "fa-square-root-alt", "default": "fa-play"};
    const key = Object.keys(icons).find(k => subject.name.toLowerCase().includes(k)) || 'default';
    const subjectIcon = `<i class="fas ${icons[key]}"></i>`;
    const historyItem = appState.history.find(h => h.id === lecture.id);
    const metaText = historyItem ? `Watched: ${new Date(historyItem.watchedAt).toLocaleDateString()}` : `${subject.name} • ${lecture.chapter}`;

    return `
    <div class="lecture-card glass-card" data-action="play-video" data-subject-id="${subject.id}" data-lecture-id="${lecture.id}">
        <div class="lecture-thumbnail">${hasThumb ? `<img src="${escapeHTML(lecture.thumbnail)}">` : subjectIcon}
            <span class="lecture-duration">${escapeHTML(lecture.duration)}</span>
        </div>
        <div class="lecture-info">
            <h4 class="lecture-title">${escapeHTML(lecture.lecture)}</h4>
            <p class="lecture-meta">${escapeHTML(metaText)}</p>
        </div>
        <div class="lecture-progress">
  <div class="lecture-progress-filled" style="width:${Math.min((lecture.time / lecture.durationSec) * 100, 100)}%"></div>
</div>
<p class="lecture-progress-time">${formatTimeHHMMSS(lecture.time)} / ${lecture.duration}</p>

        <button class="pin-button ${isPinned ? 'active' : ''}" data-action="toggle-pin" data-id="${lecture.id}" data-subject-id="${subject.id}">
            <i class="fas fa-thumbtack"></i>
        </button>
    </div>`;
}

// --- Page Builders ---
function showView(viewId) {
    appState.currentView = viewId;

    // kill player if switching away
    if (!viewId.startsWith('player') && player) {
        try { player.destroy(); } catch (e) {}
        player = null;
    }

    // hide all
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // decide which view to show
    if (viewId.startsWith("chapters")) {
        document.getElementById("chapter-view")?.classList.add("active");
    } else if (viewId.startsWith("lectures")) {
        document.getElementById("lecture-view")?.classList.add("active");
    } else if (viewId.startsWith("player")) {
        document.getElementById("player-view")?.classList.add("active");
    } else if (viewId.startsWith("resources")) {
        document.getElementById("resources-view")?.classList.add("active");
    } else if (viewId.startsWith("history")) {
        document.getElementById("history-view")?.classList.add("active");
    } else {
        document.getElementById("dashboard-view")?.classList.add("active");
    }

    window.scrollTo(0, 0);
}


function renderChapters(subjectId) {
    const subject = findSubjectById(subjectId);
    if (!subject) return renderDashboard();
    const container = document.getElementById('chapter-view');
    container.innerHTML = `<div class="view-container"><div class="page-header"><button class="back-button" data-action="show-dashboard"><i class="fas fa-arrow-left"></i> Back</button><h2>${escapeHTML(subject.name)}</h2></div><div class="goals-grid">${subject.chapters.map(chapter => `<div class="subject-card glass-card" data-action="show-lectures" data-subject-id="${subject.id}" data-chapter-id="${chapter.id}"><h3>${escapeHTML(chapter.name)}</h3><p>${chapter.lectures.length} lectures</p></div>`).join('')}</div></div>`;
    showView(`chapters-${subjectId}`);
}

function renderLectures(subjectId, chapterId) {
    const subject = findSubjectById(subjectId);
    const chapter = subject?.chapters.find(c => c.id === chapterId);
    if (!chapter) return renderChapters(subjectId);
    const container = document.getElementById('lecture-view');
    container.innerHTML = `<div class="view-container"><div class="page-header"><button class="back-button" data-action="show-chapters" data-subject-id="${subject.id}"><i class="fas fa-arrow-left"></i> Back</button><h2>${escapeHTML(chapter.name)}</h2></div><div class="lecture-grid">${chapter.lectures.map(lec => createLectureCardHTML(lec, subject)).join('')}</div></div>`;
    showView(`lectures-${subjectId}-${chapterId}`);
}

function renderResources() {
    const container = document.getElementById('resources-view');
    if (!appState.resources || !appState.resources.length) {
        container.innerHTML = `
            <div class="view-container">
                <div class="page-header">
                    <button class="back-button" data-action="show-dashboard"><i class="fas fa-arrow-left"></i> Back</button>
                    <h2>Resources</h2>
                </div>
                <p style="text-align:center; padding:2rem;">No resources found.</p>
            </div>`;
        showView('resources-view');
        return;
    }

    let html = `<div class="view-container">
        <div class="page-header">
            <button class="back-button" data-action="show-dashboard"><i class="fas fa-arrow-left"></i> Back</button>
            <h2>Resources</h2>
        </div>
        <input type="text" id="resource-search" placeholder="Search files..." class="resource-search">`;

    appState.resources.forEach(subject => {
        html += `<div class="subject-section">
                    <h3 class="subject-title collapsible">${escapeHTML(subject.subject)}</h3>
                    <div class="chapters-container">`;

        if (subject.chapters) {
            subject.chapters.forEach(chapter => {
                html += `<div class="chapter-section">
                            <h4 class="chapter-title collapsible">${escapeHTML(chapter.chapter)}</h4>
                            <div class="resource-grid">`;
                (chapter.files || []).forEach(file => {
                    html += `<a href="${escapeHTML(file.path)}" target="_blank" class="resource-card glass-card">
                                <div class="resource-icon"><i class="fas fa-file-${file.type.toLowerCase() === 'pdf' ? 'pdf' : 'alt'}"></i></div>
                                <h5>${escapeHTML(file.title)}</h5>
                                <p>${escapeHTML(file.type)}</p>
                             </a>`;
                });
                html += `</div></div>`; // chapter-section
            });
        }
        html += `</div></div>`; // subject-section
    });

    html += `</div>`; // view-container
    container.innerHTML = html;

    // COLLAPSIBLE FUNCTIONALITY
    document.querySelectorAll('.collapsible').forEach(el => {
        el.addEventListener('click', () => {
            el.classList.toggle('active');
            const content = el.nextElementSibling;
            content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
        });
    });

    // SEARCH FILTER
    const searchInput = document.getElementById('resource-search');
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.toLowerCase();
        document.querySelectorAll('.resource-card').forEach(card => {
            const text = card.querySelector('h5').innerText.toLowerCase();
            card.style.display = text.includes(term) ? 'block' : 'none';
        });
    });

    showView('resources-view');
}


function renderHistory() {
    const container = document.getElementById('history-view');
    if (!appState.history.length) {
        container.innerHTML = `
          <div class="view-container">
            <div class="page-header">
              <button class="back-button" data-action="show-dashboard">
                <i class="fas fa-arrow-left"></i> Back
              </button>
              <h2>Watch History</h2>
            </div>
            <p style="padding:1rem;">No watch history.</p>
          </div>`;
        showView('history-view');
        return;
    }

    // Group sessions by lecture
    const grouped = {};
    for (const item of appState.history) {
        if (!grouped[item.id]) grouped[item.id] = [];
        grouped[item.id].push(item);
    }

    const html = `<div class="view-container">
      <div class="page-header">
        <button class="back-button" data-action="show-dashboard"><i class="fas fa-arrow-left"></i> Back</button>
        <h2>Watch History</h2>
      </div>

      <!-- search bar -->
      <div class="search-bar glass-card" style="margin-bottom:1rem;">
        <input type="text" id="history-search" placeholder="Search in history..." />
      </div>

      <div class="history-list">
        ${Object.entries(grouped).map(([id, sessions], index) => {
            const lecture = findLectureById(id);
            const subject = lecture ? findSubjectById(lecture.subjectId) : null;
            if (!lecture || !subject) return '';
            const openClass = index === 0 ? "open" : "";
            return `
              <div class="history-card glass-card ${openClass}" data-history-card data-title="${escapeHTML(lecture.lecture).toLowerCase()}">
                <div class="history-header" data-action="toggle-history" data-id="${id}">
                  <h3 class="history-lecture" data-action="open-lecture" data-subject-id="${subject.id}" data-lecture-id="${lecture.id}">
                    ${escapeHTML(lecture.lecture)} <small>(${escapeHTML(subject.name)})</small>
                  </h3>
                  <button class="toggle-btn"><i class="fas fa-chevron-${openClass ? "up" : "down"}"></i></button>
                </div>
                <ul class="history-sessions" style="display:${openClass ? "block" : "none"};">
                  ${sessions.map(s => {
                      const date = new Date(s.startedAt);
                      const endDate = s.endedAt ? new Date(s.endedAt) : null;

                      const dateStr = date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
                      const startStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                      const endStr = endDate ? endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "In progress";

                      // watched duration in human format
                      let watched = "00:00:00";
                      if (s.endedAt && s.startedAt) {
                          const secs = Math.floor((s.endedAt - s.startedAt) / 1000);
                          watched = humanDuration(secs);
                      }

                      return `
                        <li>
                          <span><strong>Date:</strong> ${dateStr}</span><br>
                          <span><strong>Started:</strong> ${startStr}</span><br>
                          <span><strong>Ended:</strong> ${endStr}</span><br>
                          <span><strong>Watched:</strong> ${watched}</span>
                        </li>`;
                  }).join('')}
                </ul>
              </div>`;
        }).join('')}
      </div>
    </div>`;

    container.innerHTML = html;
    showView('history-view');

    // attach search filter
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const val = searchInput.value.toLowerCase();
            document.querySelectorAll('[data-history-card]').forEach(card => {
                const title = card.getAttribute('data-title');
                card.style.display = title.includes(val) ? '' : 'none';
            });
        });
    }
}


function playVideo(subjectId, lectureId) {
    const subject = findSubjectById(subjectId);
    const lecture = findLectureById(lectureId);
    const chapter = subject?.chapters.find(c => c.lectures.some(l => l.id === lectureId));
    if (!lecture || !chapter || !subject) return;

    // Track current lecture + start new history session
    appState.currentLectureId = lecture.id;
    addToHistory(lecture.id);

    // Build player UI
    const playerContainer = document.getElementById('player-view');
    playerContainer.innerHTML = `
        <div class="view-container">
            <div class="page-header">
                <button class="back-button" data-action="show-lectures" data-subject-id="${subject.id}" data-chapter-id="${chapter.id}">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
                <h2>${escapeHTML(lecture.lecture)}</h2>
            </div>
            <div class="player-page-layout" style="position: relative;">
                <div class="video-main" style="position: relative;">
                    <video id="video-player" playsinline controls src="${safeVideoPath(lecture.path)}"></video>
                </div>
                <aside class="video-sidebar">
                    <h3><i class="fas fa-folder"></i> Related Files</h3>
                    <div id="related-files-list"></div>
                    <h3><i class="fas fa-list-ol"></i> Chapter Playlist</h3>
                    <div id="chapter-playlist"></div>
                </aside>
            </div>
        </div>`;

    updatePlayerUI(lecture, chapter, subject);
    showView(`player-${subject.id}-${lectureId}`);

    // Initialize Plyr
    player = new Plyr('#video-player', {
        keyboard: { focusedOnly: true },
        controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen', 'settings'],
    });

    // --- Resume overlay logic ---
    player.on('ready', () => {
        const progress = appState.progress[lecture.id] || { time: 0 };
        if (progress.time > 5 && !progress.completed) {
            const overlay = document.createElement('div');
            overlay.className = 'resume-overlay';
            overlay.innerHTML = `⏯ Resume from ${formatTimeHHMMSS(progress.time)}`;
            Object.assign(overlay.style, {
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.8)',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                zIndex: '999',
                textAlign: 'center',
                opacity: '0',
                transition: 'opacity 0.5s ease',
            });
            document.querySelector('.video-main').appendChild(overlay);

            setTimeout(() => overlay.style.opacity = '1', 50);

            overlay.addEventListener('click', () => {
                player.currentTime = progress.time;
                player.play();
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 500);
            });

            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 500);
            }, 10000);
        }

        // autoplay (fails silently if blocked)
        player.play().catch(() => {});
    });

    // --- Speed overlay ---
    player.on('ratechange', () => {
        const speed = player.playbackRate;
        let overlay = document.getElementById('speed-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'speed-overlay';
            overlay.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.7);
                color: #fff;
                font-size: 20px;
                padding: 12px 18px;
                border-radius: 50%;
                z-index: 9999;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            player.elements.container.appendChild(overlay);
        }

        overlay.textContent = `${speed.toFixed(1)}x`;
        overlay.style.opacity = '1';
        clearTimeout(overlay.hideTimeout);
        overlay.hideTimeout = setTimeout(() => overlay.style.opacity = '0', 1000);
    });

    // --- Save progress every 5s ---
    let progressSaveInterval = setInterval(() => {
        if (player?.playing) {
            appState.progress[lecture.id] = {
                ...appState.progress[lecture.id],
                time: player.currentTime,
                lastWatched: Date.now()
            };

            let hist = appState.history.find(h => h.id === lecture.id && !h.endedAt);
            if (hist) {
                hist.watchedSeconds = Math.floor(player.currentTime);
                hist.duration = Math.floor(player.duration);
            }

            saveState();
        }
    }, 5000);

    // --- End session on pause/ended ---
    player.on('pause', () => endHistorySession(lecture.id, player));
    player.on('ended', () => {
        appState.progress[lecture.id] = {
            time: player.duration,
            completed: true,
            lastWatched: Date.now()
        };
        endHistorySession(lecture.id, player);
        saveState();
        clearInterval(progressSaveInterval);
    });
}


function formatTimeHHMMSS(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00:00";
    let hrs = Math.floor(seconds / 3600);
    let mins = Math.floor((seconds % 3600) / 60);
    let secs = Math.floor(seconds % 60);
    return [hrs, mins, secs].map(v => String(v).padStart(2, '0')).join(':');
}
function humanDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

function updatePlayerUI(lecture, chapter, subject) {
    const relatedFilesList = document.getElementById('related-files-list');
    relatedFilesList.innerHTML = lecture.relatedFiles?.length > 0 ? lecture.relatedFiles.map(file => `<a href="${file.path}" target="_blank" class="related-file-item glass-card"><div class="icon"><i class="fas fa-file-alt"></i></div><span>${escapeHTML(file.title)}</span></a>`).join('') : '<p style="padding:1rem;">No files.</p>';
    
    const playlistContainer = document.getElementById('chapter-playlist');
    playlistContainer.innerHTML = chapter.lectures.map(lec => `<div class="playlist-item glass-card ${lec.id === lecture.id ? 'is-playing' : ''}" data-action="play-video" data-subject-id="${subject.id}" data-lecture-id="${lec.id}"><div class="playlist-item-thumbnail">${lec.thumbnail && !lec.thumbnail.includes('default.png') ? `<img src="${lec.thumbnail}">` : '▶️'}</div><span class="playlist-item-title">${escapeHTML(lec.lecture)}</span></div>`).join('');
}

// --- Event Handling ---
function addGlobalEventListeners() {
    document.body.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const { action, ...data } = target.dataset;
        switch (action) {
            case 'show-dashboard': renderDashboard(); break;
            case 'show-chapters': renderChapters(data.subjectId); break;
            case 'show-lectures': renderLectures(data.subjectId, data.chapterId); break;
            case 'show-resources': renderResources(); break;
            case 'show-history': renderHistory(); break;
            case 'play-video': playVideo(data.subjectId, data.lectureId); break;
            case 'toggle-pin':
                event.stopPropagation();
                togglePin(data.id, data.subjectId);
                break;
            case 'toggle-history': event.stopPropagation();
                     const card = target.closest('[data-history-card]');
                    const sessions = card.querySelector('.history-sessions');
                 const btnIcon = card.querySelector('.toggle-btn i');

                 // collapse all first
                 document.querySelectorAll('.history-card').forEach(c => {
                  c.classList.remove('open');
                 c.querySelector('.history-sessions').style.display = 'none';
                 c.querySelector('.toggle-btn i').className = 'fas fa-chevron-down';
                });

                  // expand this one
                 card.classList.add('open');
                 sessions.style.display = 'block';
                 btnIcon.className = 'fas fa-chevron-up';
                 break;
                 case 'open-lecture':
                 const subjId = target.getAttribute('data-subject-id');
                  const lecId = target.getAttribute('data-lecture-id');
                 playVideo(subjId, lecId);
                 break;
}
              });

    const searchInput = document.getElementById('site-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => siteSearch(searchInput.value));
        searchInput.addEventListener('blur', () => { setTimeout(() => { document.getElementById('site-search-results').style.display = 'none'; }, 200); });
    }
}

function siteSearch(query) {
    const resultsContainer = document.getElementById('site-search-results');
    if (!query) { resultsContainer.style.display = 'none'; return; }
    const lowerQuery = query.toLowerCase();
    let results = [];
    appState.subjects.forEach(s => s.chapters.forEach(c => c.lectures.forEach(l => {
        if (l.lecture.toLowerCase().includes(lowerQuery)) results.push({ type: 'Lecture', lecture: l, subject: s });
    })));
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = results.length ? results.map(r => `
        <div class="search-result-item glass-card" data-action="play-video" data-subject-id="${r.subject.id}" data-lecture-id="${r.lecture.id}">
            <p><strong>${escapeHTML(r.lecture.lecture)}</strong></p><p><small>${escapeHTML(r.subject.name)} / ${escapeHTML(r.lecture.chapter)}</small></p>
        </div>`).join('') : `<p style="padding: 1rem;">No results.</p>`;
}

// --- Business Logic ---
function togglePin(lectureId, subjectId) {
    const existingIndex = appState.pinned.findIndex(p => p.id === lectureId);
    if (existingIndex > -1) { appState.pinned.splice(existingIndex, 1); } 
    else { appState.pinned.unshift({ id: lectureId, subjectId: subjectId }); }
    saveState();
    render();
}
function addToHistory(lectureId) {
    appState.history = appState.history.filter(item => item.id !== lectureId);
    appState.history.unshift({ id: lectureId, watchedAt: Date.now() });
    if (appState.history.length > 50) appState.history.pop();
    saveState();
}

// --- Utilities ---
function findSubjectById(id) { return appState.subjects.find(s => s.id === id); }
function findLectureById(id) {
    for (const subject of appState.subjects) {
        for (const chapter of subject.chapters) {
            const lecture = chapter.lectures.find(l => l.id === id);
            if (lecture) return { ...lecture, subjectId: subject.id, chapterId: chapter.id };
        }
    }
    return null;
}
function parseDuration(str) {
    if (!str) return 0;
    const parts = str.split(':').map(Number).filter(n => !isNaN(n));
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
}
function escapeHTML(str) {
    if (!str) return '';
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function initializeExtraUI() {
    const heroH1 = document.querySelector('.hero-content h1');
    if (heroH1) {
        const hours = new Date().getHours();
        heroH1.textContent = hours < 12 ? "☀️ Good Morning!" : hours < 18 ? "🌤️ Good Afternoon!" : "🌙 Good Evening!";
    }
}
// --- Helper: Snap to Plyr's available speeds ---
function getNearestPlyrSpeed(targetSpeed) {
    const speeds = player.options.speed || [0.5,0.75,1,1.25,1.5,1.75,2,3,4];
    return speeds.reduce((prev, curr) => Math.abs(curr - targetSpeed) < Math.abs(prev - targetSpeed) ? curr : prev);
}

// --- Video Feedback Overlay ---
function initVideoFeedback() {
    if (!player || !player.elements.container) return null;

    let feedback = player.elements.container.querySelector('#video-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'video-feedback';
        Object.assign(feedback.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '28px',
            fontWeight: '600',
            textAlign: 'center',
            display: 'none',
            pointerEvents: 'none',
            transition: 'opacity 0.25s ease',
            zIndex: '9999',
        });
        player.elements.container.appendChild(feedback);
    }
    return feedback;
}

let feedbackTimeout;
function showVideoFeedback(html) {
    const feedback = initVideoFeedback();
    if (!feedback) return;
    feedback.innerHTML = html;
    feedback.style.display = 'block';
    feedback.style.opacity = '1';
    clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => feedback.style.display = 'none', 250);
    }, 700);
}
function endHistorySession(lectureId, player) {
    let hist = appState.history.find(h => h.id === lectureId && !h.endedAt);
    if (hist) hist.endedAt = Date.now();
    saveState();
}

// --- Keyboard Controls (with larger icons) ---
// --- Keyboard Controls & Overlay ---
document.addEventListener('keydown', (e) => {
    if (!player) return;
    const key = e.key.toLowerCase();

    const speedStep = 0.25; 
    const maxSpeed = 4;
    const minSpeed = 0.25;

    const showFeedback = (iconHTML, text = '') => {
        let overlay = player.elements.container.querySelector('#speed-feedback');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'speed-feedback';
            Object.assign(overlay.style, {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '9999',
                pointerEvents: 'none',
                opacity: '0',
                transition: 'opacity 0.25s ease',
            });
            player.elements.container.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div style="
                width: 70px;
                height: 70px;
                background: rgba(0,0,0,0.7);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
                color: #fff;
                margin-bottom: 8px;
            ">${iconHTML}</div>
            ${text ? `<div style="
                min-width: 50px;
                padding: 4px 8px;
                background: rgba(0,0,0,0.7);
                color: #fff;
                text-align: center;
                font-size: 16px;
                border-radius: 6px;
            ">${text}</div>` : ''}
        `;

        overlay.style.opacity = '1';
        clearTimeout(overlay.hideTimeout);
        overlay.hideTimeout = setTimeout(() => overlay.style.opacity = '0', 1000);
    };

    const adjustSpeed = (increase = true) => {
        let currentSpeed = player.speed || 1;
        currentSpeed = increase ? currentSpeed + speedStep : currentSpeed - speedStep;
        currentSpeed = Math.min(Math.max(currentSpeed, minSpeed), maxSpeed);
        player.speed = Math.round(currentSpeed * 100) / 100;
        showFeedback('<i class="fas fa-tachometer-alt"></i>', `${player.speed.toFixed(2)}x`);
    };

    switch(key) {
        case '.':
            e.preventDefault();
            adjustSpeed(true);
            break;
        case ',':
            e.preventDefault();
            adjustSpeed(false);
            break;
        case ' ':
        case 'k':
            e.preventDefault();
            if (player.playing) {
                player.pause();
                showFeedback('<i class="fas fa-pause"></i>');
            } else {
                player.play();
                showFeedback('<i class="fas fa-play"></i>');
            }
            break;
        case 'arrowright':
            e.preventDefault();
            player.forward(10);
            showFeedback('<i class="fas fa-forward"></i>', '10s');
            break;
        case 'arrowleft':
            e.preventDefault();
            player.rewind(10);
            showFeedback('<i class="fas fa-backward"></i>', '10s');
            break;
        case 'm':
            e.preventDefault();
            player.muted = !player.muted;
            showFeedback(player.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>');
            break;
        case 'f':
            e.preventDefault();
            if (player.fullscreen.active) {
                player.fullscreen.exit();
                showFeedback('<i class="fas fa-compress"></i>');
            } else {
                player.fullscreen.enter();
                showFeedback('<i class="fas fa-expand"></i>');
            }
            break;
    }
});
