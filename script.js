let player;
let studyData = { subjects: [], resources: [], todaysLectures: [] };
let todos = [];
let progressData = {};
let progressSaveInterval;
let currentPlaying = { subjectId: null, chapterId: null, lectureId: null }; // track current playing lecture

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    initializeTodos();
    initializeGlobalKeyboardShortcuts();
});

async function initializeApp() {
    progressData = JSON.parse(localStorage.getItem('studyProgress')) || {};
    todos = JSON.parse(localStorage.getItem('todos')) || [];
    renderTodos();

    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error(`HTTP error!`);
        const jsonData = await response.json();
        studyData = transformData(jsonData);
        generateTodaysLectures();
        renderAll();
    } catch (error) {
        console.error("Could not load lecture data:", error);
        document.body.innerHTML = `<h2 style="text-align: center; margin-top: 50px;">Error: Could not load data.json. Please check console.</h2>`;
    }
}

function renderAll() {
    renderSubjects();
    renderDailyLectures();
    showView('dashboard-view');
}

// --- HELPERS ---
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// Format seconds -> mm:ss or hh:mm:ss
function formatTime(seconds) {
    if (!isFinite(seconds) || seconds <= 0) return '00:00';
    seconds = Math.floor(seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// Parse duration string like "HH:MM:SS" or "MM:SS" -> seconds
function parseDuration(durationStr) {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
}

// Normalize a given duration string for UI (use parseDuration then formatTime)
function normalizeDurationText(durationStr) {
    const secs = parseDuration(durationStr);
    return secs > 0 ? formatTime(secs) : '00:00';
}

// --- DATA TRANSFORMATION ---
function transformData(jsonData) {
    const rawLectures = jsonData.lectures || [];
    const subjectsMap = new Map();

    rawLectures.forEach(lec => {
        if (!subjectsMap.has(lec.subject)) {
            subjectsMap.set(lec.subject, {
                id: lec.subject.toLowerCase().replace(/\s/g, '-'),
                name: lec.subject, chapters: new Map()
            });
        }
        const subject = subjectsMap.get(lec.subject);
        if (!subject.chapters.has(lec.chapter)) {
            subject.chapters.set(lec.chapter, {
                id: lec.chapter.toLowerCase().replace(/\s/g, '-'),
                name: lec.chapter, lectures: []
            });
        }
        const progress = progressData[lec.id] || { time: 0, completed: false };
        // Ensure lecture has duration normalized as both string and seconds
        const normalizedDuration = normalizeDurationText(lec.duration || '');
        const durationSec = parseDuration(lec.duration || '');
        subject.chapters.get(lec.chapter).lectures.push({ ...lec, ...progress, durationText: normalizedDuration, durationSec });
    });

    subjectsMap.forEach(subject => {
        let total = 0, completed = 0;
        subject.chapters.forEach(chapter => {
            total += chapter.lectures.length;
            completed += chapter.lectures.filter(l => l.completed).length;
        });
        subject.totalLectures = total; subject.completed = completed;
        subject.chapters = Array.from(subject.chapters.values());
    });

    return {
        subjects: Array.from(subjectsMap.values()),
        resources: jsonData.resources || [],
        todaysLectures: []
    };
}

// --- DYNAMIC LECTURE LOGIC ---
function generateTodaysLectures() {
    studyData.todaysLectures = [];
    studyData.subjects.forEach(subject => {
        let nextLecture = null;
        for (const chapter of subject.chapters) {
            nextLecture = chapter.lectures.find(l => !l.completed);
            if (nextLecture) break;
        }
        if (nextLecture) {
            studyData.todaysLectures.push(nextLecture);
        }
    });
}

function updateTodaysLectures(watchedLectureSubject) {
    studyData.todaysLectures = studyData.todaysLectures.filter(l => l.subject !== watchedLectureSubject);
    const subject = studyData.subjects.find(s => s.name === watchedLectureSubject);
    if (subject) {
        let nextLecture = null;
        for (const chapter of subject.chapters) {
            nextLecture = chapter.lectures.find(l => !l.completed);
            if (nextLecture) break;
        }
        if (nextLecture) {
            studyData.todaysLectures.push(nextLecture);
        }
    }
    renderDailyLectures();
}

// --- PROGRESS MANAGEMENT ---
function updateLectureProgress(lectureId, newProgress) {
    const currentProgress = progressData[lectureId] || { time: 0, completed: false };
    progressData[lectureId] = { ...currentProgress, ...newProgress };
    
    let watchedLectureSubject = null;
    studyData.subjects.forEach(s => s.chapters.forEach(c => {
        const lecture = c.lectures.find(l => l.id === lectureId);
        if (lecture) {
            // update in-place so subsequent renders read current values
            Object.assign(lecture, progressData[lectureId]);
            watchedLectureSubject = lecture.subject;
        }
    }));
    
    saveProgress();
    // Always refresh lists & UI to reflect progress/time
    renderSubjects();
    renderDailyLectures();

    if (newProgress.completed) {
        updateTodaysLectures(watchedLectureSubject);
    }
}

function saveProgress() { localStorage.setItem('studyProgress', JSON.stringify(progressData)); }

// --- TO-DO LIST WITH PINNING ---
function initializeTodos() {
    const todoForm = document.getElementById('todo-form'),
          todoInput = document.getElementById('todo-input'),
          todoList = document.getElementById('todo-list');
    if (!todoForm) return;

    todoForm.addEventListener('submit', e => {
        e.preventDefault();
        const text = todoInput.value.trim();
        if (text) {
            addTodo({ text: text, type: 'text' });
            todoInput.value = '';
        }
    });

    todoList.addEventListener('click', e => {
        const listItem = e.target.closest('li');
        if (!listItem) return;
        const id = Number(listItem.dataset.id);
        
        if (e.target.matches('input[type="checkbox"]')) {
            toggleTodo(id);
        } else if (e.target.closest('.delete-todo')) {
            deleteTodo(id);
        } else if (e.target.closest('.pinned-item')) {
            const todo = todos.find(t => t.id === id);
            if (!todo) return;
            if (todo.type === 'lecture') playVideo(todo.subjectId, todo.lectureId);
            if (todo.type === 'file') window.open(todo.path, '_blank');
        }
    });
}

function addTodo(todoData) {
    todos.unshift({ id: Date.now(), completed: false, ...todoData });
    saveTodos();
    renderTodos();
}

function toggleTodo(id) {
    todos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTodos();
    renderTodos();
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
}

function saveTodos() { localStorage.setItem('todos', JSON.stringify(todos)); }

function renderTodos() {
    const todoList = document.getElementById('todo-list');
    if (!todoList) return;
    todoList.innerHTML = todos.map(todo => {
        const isPinned = todo.type === 'lecture' || todo.type === 'file';
        const icon = todo.type === 'lecture' ? 'fa-play-circle' : 'fa-file-alt';
        const clickableClass = isPinned ? 'pinned-item' : '';
        // Security Improvement: Escape the text content to prevent XSS
        const escapedText = todo.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `
            <li data-id="${todo.id}" class="${todo.completed ? 'completed' : ''}">
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="${clickableClass}">
                    ${isPinned ? `<i class="fas ${icon}"></i> ` : ''}${escapedText}
                </span>
                <button class="delete-todo" title="Delete Task">&times;</button>
            </li>`;
    }).join('');
}

function pinItem(event, item) {
    event.stopPropagation();
    addTodo(item);
}

// --- VIEW MANAGEMENT & NAVIGATION ---
function showView(viewId) {
    // Important: only destroy player when leaving the player-view.
    // If viewId is 'player-view' we must not destroy the player (we're showing it).
    if (viewId !== 'player-view' && player) {
        try { player.destroy(); } catch (e) { /* ignore */ }
        player = null;
        clearInterval(progressSaveInterval);
    }
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId)?.classList.add('active');
    window.scrollTo(0, 0);
}

function showSubjects() { showView('dashboard-view'); }

function showResources() {
    const container = document.getElementById('resources-view');
    container.innerHTML = `
        <div class="view-container">
            <div class="page-header">
                <button class="back-button" onclick="showSubjects()">← Back to Home</button>
                <h2>Resources</h2>
            </div>
            <div class="search-container">
                <input type="search" id="resource-search" placeholder="Search resources...">
            </div>
            <div id="resources-grid" class="goals-grid"></div>
        </div>`;

    const searchInput = document.getElementById('resource-search');
    const resourcesGrid = document.getElementById('resources-grid');

    function renderFilteredResources(filter = '') {
        const filtered = studyData.resources.filter(res => res.title.toLowerCase().includes(filter.toLowerCase()));
        resourcesGrid.innerHTML = filtered.map(res => `
            <a href="${res.path}" target="_blank" class="resource-card glass-card">
                <h3>${res.title}</h3>
                <div class="resource-type">${res.type}</div>
            </a>`).join('');
    }
    searchInput.addEventListener('keyup', () => renderFilteredResources(searchInput.value));
    renderFilteredResources();
    showView('resources-view');
}

function showChapters(subjectId) {
    const subject = studyData.subjects.find(s => s.id === subjectId);
    if (!subject) return;
    const container = document.getElementById('chapter-view');
    const chapterGrid = subject.chapters.map(chapter => {
        const completed = chapter.lectures.filter(l => l.completed).length;
        const total = chapter.lectures.length;
        const progressPercent = total > 0 ? (completed / total) * 100 : 0;
        return `
            <div class="subject-card glass-card" onclick="showLectures('${subject.id}', '${chapter.id}')">
                <h3>${chapter.name}</h3>
                <p>${completed} / ${total} lectures completed.</p>
                <div class="progress-bar" style="margin-top: 1rem;"><div class="progress" style="width: ${progressPercent}%"></div></div>
            </div>`;
    }).join('');

    container.innerHTML = `
        <div class="view-container">
            <div class="page-header">
                <button class="back-button" onclick="showSubjects()">← Back to Subjects</button>
                <h2>${subject.name}</h2>
            </div>
            <div class="goals-grid">${chapterGrid}</div>
        </div>`;
    showView('chapter-view');
}

function showLectures(subjectId, chapterId) {
    const subject = studyData.subjects.find(s => s.id === subjectId);
    const chapter = subject?.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    const container = document.getElementById('lecture-view');
    const lectureGrid = chapter.lectures.map(lecture => createLectureCardHTML(lecture, subject)).join('');

    container.innerHTML = `
        <div class="view-container">
            <div class="page-header">
                <button class="back-button" onclick="showChapters('${subject.id}')">← Back to Chapters</button>
                <h2>${chapter.name}</h2>
            </div>
            <div class="lecture-grid">${lectureGrid}</div>
        </div>`;
    showView('lecture-view');
}

// --- RENDERING ---
function renderSubjects() {
    const subjectGrid = document.getElementById('subject-grid');
    if (!subjectGrid) return;
    subjectGrid.innerHTML = studyData.subjects.map(subject => {
        const progress = subject.totalLectures > 0 ? Math.round((subject.completed / subject.totalLectures) * 100) : 0;
        return `
            <div class="subject-card glass-card" onclick="showChapters('${subject.id}')">
                <div><h3>${subject.name}</h3><p>${subject.chapters.length} chapters.</p></div>
                <div>
                    <div class="progress-ring" style="--progress: ${progress};">
                        <div class="progress-ring-circle"></div><span class="progress-ring-percent">${progress}%</span>
                    </div>
                    <p>${subject.completed} / ${subject.totalLectures} lectures completed.</p>
                </div>
            </div>`;
    }).join('');
}

function renderDailyLectures() {
    const grid = document.getElementById('daily-goals-grid');
    if (!grid) return;
    grid.innerHTML = studyData.todaysLectures.map(lecture => {
        // find subject object for extra metadata
        const subject = studyData.subjects.find(s => s.name === lecture.subject);
        return subject ? createLectureCardHTML(lecture, subject) : '';
    }).join('');
}

// Updated lecture card to match new CSS (.lecture-card)
// =======================================================
// FINAL: Default Thumbnail for Missing Lecture Thumbnails
// =======================================================

function createLectureCardHTML(lecture, subject) {
    const totalDuration = lecture.durationSec || parseDuration(lecture.duration || '');
    const timeSoFar = (lecture.time || 0);
    const progressPercent = totalDuration > 0 ? Math.min(Math.round((timeSoFar / totalDuration) * 100), 100) : 0;
    const hasThumb = lecture.thumbnail && !lecture.thumbnail.includes('assets/default.png');
    const durationText = lecture.durationText || normalizeDurationText(lecture.duration || '');
    const escapedLectureTitle = (lecture.lecture || '').replace(/"/g, "&quot;");

    // --- subject-based fallback icons ---
    let subjectIcon = '<i class="fas fa-play"></i>';
    if (subject.name.toLowerCase().includes("physics")) subjectIcon = '<i class="fas fa-bolt"></i>';
    if (subject.name.toLowerCase().includes("chemistry")) subjectIcon = '<i class="fas fa-flask"></i>';
    if (subject.name.toLowerCase().includes("math")) subjectIcon = '<i class="fas fa-square-root-alt"></i>';

    const thumbHTML = hasThumb
        ? `<img src="${lecture.thumbnail}" alt="${escapedLectureTitle}">`
        : `<div class="default-thumb">${subjectIcon}</div>`;

    return `
    <div class="lecture-card glass-card ${lecture.completed ? 'completed' : ''}" 
         onclick="playVideo('${subject.id}', '${lecture.id}')">
        <div class="lecture-thumbnail">
            ${thumbHTML}
            <span class="lecture-duration">${durationText}</span>
        </div>
        <div class="lecture-info">
            <div class="lecture-title">${escapedLectureTitle}</div>
            <div class="lecture-meta">${subject.name} • ${lecture.chapter}</div>
            <div class="lecture-progress">
                <div class="lecture-progress-filled" style="width: ${progressPercent}%"></div>
            </div>
        </div>
    </div>`;
}


// --- PLAYER LOGIC ---
function playVideo(subjectId, lectureId) {
    let lecture, chapterFound, subjectFound;
    subjectFound = studyData.subjects.find(s => s.id === subjectId);
    if (!subjectFound) return;
    for (const chapter of subjectFound.chapters) {
        lecture = chapter.lectures.find(l => l.id === lectureId);
        if (lecture) { chapterFound = chapter; break; }
    }
    if (!lecture) { console.error("Lecture not found!"); return; }

    // Update current playing tracker (used by keyboard next/prev)
    currentPlaying.subjectId = subjectId;
    currentPlaying.chapterId = chapterFound?.id || null;
    currentPlaying.lectureId = lectureId;

    // If a player exists and we are still on the player view, update the source
    if (player && document.getElementById('player-view')?.classList.contains('active')) {
        try {
            player.source = {
                type: 'video',
                sources: [{ src: lecture.path, type: 'video/mp4' }]
            };
            updatePlayerUI(lecture, chapterFound, subjectFound);
            // attempt resume if saved
            const savedTime = lecture.time || 0;
            if (savedTime > 5 && !lecture.completed) {
                player.currentTime = savedTime;
            }
            player.play();
        } catch (e) {
            console.warn('Error updating existing player source, rebuilding player.', e);
            try { player.destroy(); } catch (_) {}
            player = null;
            clearInterval(progressSaveInterval);
        }
        return;
    }

    // Build player view and new Plyr instance
    const playerContainer = document.getElementById('player-view');
    playerContainer.innerHTML = `
        <div class="view-container">
            <div class="page-header">
                <button class="back-button" onclick="showLectures('${subjectFound.id}', '${chapterFound.id}')">← Back to Lectures</button>
                <h2 id="player-title">${lecture.lecture}</h2>
            </div>
            <div class="player-page-layout">
                <div class="video-main-content">
                    <video id="video-player" playsinline controls preload="auto"></video>
                </div>
                <aside class="video-sidebar">
                    <h3><i class="fas fa-folder-open"></i> Related Files</h3>
                    <div id="related-files-list" class="glass-card" style="padding: 1rem;"></div>
                    <h3><i class="fas fa-list-ul"></i> Chapter Playlist</h3>
                    <div id="chapter-playlist" class="glass-card"></div>
                </aside>
            </div>
        </div>`;

    const videoElement = document.getElementById('video-player');
    // set source directly - Plyr will pick it up on init
    videoElement.src = lecture.path;

    updatePlayerUI(lecture, chapterFound, subjectFound);

    // ensure view is visible BEFORE creating player (so showView won't destroy it)
    showView('player-view');

    player = new Plyr(videoElement, {
        tooltips: { controls: true, seek: true },
        keyboard: { focusedOnly: false, global: false }, // we'll handle global shortcuts
        seekTime: 10
    });

    player.on('ready', () => {
        const savedTime = lecture.time || 0;
        if (savedTime > 5 && !lecture.completed) { player.currentTime = savedTime; }
        // try/catch for autoplay promise rejection
        try { player.play().catch(()=>{}); } catch (_) {}
    });

    clearInterval(progressSaveInterval);
    progressSaveInterval = setInterval(() => {
        if (player && player.playing) {
            updateLectureProgress(lecture.id, { time: player.currentTime, lastWatched: Date.now() });
        }
    }, 5000);

    player.on('ended', () => {
        updateLectureProgress(lecture.id, { time: 0, completed: true, lastWatched: Date.now() });
        clearInterval(progressSaveInterval);
    });
}

// Helper function to update the player UI without rebuilding everything
function updatePlayerUI(lecture, chapter, subject) {
    const titleEl = document.getElementById('player-title');
    if (titleEl) titleEl.textContent = lecture.lecture;

    const relatedFilesList = document.getElementById('related-files-list');
    if (relatedFilesList) {
        relatedFilesList.innerHTML = lecture.relatedFiles?.length > 0 ? lecture.relatedFiles.map(file => {
            const escapedFileTitle = file.title.replace(/"/g, "&quot;");
            return `
            <div class="related-file-item glass-card">
                <a href="${file.path}" target="_blank" class="related-file-item-info">
                    <div class="icon"><i class="fas fa-file-alt fa-lg"></i></div>
                    <span>${file.title}</span>
                </a>
                <button class="pin-button" onclick='pinItem(event, {type: "file", text: "${escapedFileTitle}", path: "${file.path}"})' title="Pin to To-Do List"><i class="fas fa-thumbtack"></i></button>
            </div>`
        }).join('') : '<p>No files for this lecture.</p>';
    }

    const playlistContainer = document.getElementById('chapter-playlist');
    if (playlistContainer && chapter) {
        playlistContainer.innerHTML = chapter.lectures.map(lec => {
            const isDefaultThumb = (lec.thumbnail || '').includes('assets/default.png');
            return `
                <div class="playlist-item ${lec.id === lecture.id ? 'is-playing' : ''}" onclick="playVideo('${subject.id}', '${lec.id}')">
                    <div class="playlist-item-thumbnail ${isDefaultThumb ? 'no-thumbnail' : ''}">
                        <img src="${lec.thumbnail}" alt="">
                    </div>
                    <span class="playlist-item-title">${lec.lecture}</span>
                </div>
            `;
        }).join('');
    }
}

// --- GLOBAL KEYBOARD SHORTCUTS (fixes arrow skip / 10s desired behavior) ---
function initializeGlobalKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore when typing in inputs/textareas/contenteditable
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

        // Only when player exists and player-view is visible
        const playerViewActive = document.getElementById('player-view')?.classList.contains('active');
        if (!player || !playerViewActive) return;

        // Prevent default browser actions for these keys
        if ([' ', 'k', 'j', 'l', 'ArrowLeft', 'ArrowRight', 'n', 'p', 'm'].includes(e.key)) {
            e.preventDefault();
        }

        switch (e.key.toLowerCase()) {
            case ' ':
            case 'k':
                try { if (player.playing) player.pause(); else player.play(); } catch (_) {}
                break;
            case 'j':
                seekPlayer(-10); break;
            case 'l':
                seekPlayer(10); break;
            case 'arrowleft':
                seekPlayer(-10); break;
            case 'arrowright':
                seekPlayer(10); break;
            case 'n':
                playNextLecture(); break;
            case 'p':
                playPreviousLecture(); break;
            case 'm':
                try { player.muted = !player.muted; } catch (_) {}
                break;
        }
    });
}

function seekPlayer(deltaSeconds) {
    if (!player) return;
    try {
        const dur = player.duration || 0;
        const current = Number(player.currentTime) || 0;
        const next = clamp(current + deltaSeconds, 0, dur || 1e9);
        player.currentTime = next;
    } catch (e) {
        console.warn('Seek failed', e);
    }
}

function playNextLecture() {
    const { subjectId, chapterId, lectureId } = currentPlaying;
    if (!subjectId || !chapterId || !lectureId) return;
    const subject = studyData.subjects.find(s => s.id === subjectId);
    const chapter = subject?.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    const idx = chapter.lectures.findIndex(l => l.id === lectureId);
    if (idx >= 0 && idx < chapter.lectures.length - 1) {
        playVideo(subjectId, chapter.lectures[idx + 1].id);
    }
}

function playPreviousLecture() {
    const { subjectId, chapterId, lectureId } = currentPlaying;
    if (!subjectId || !chapterId || !lectureId) return;
    const subject = studyData.subjects.find(s => s.id === subjectId);
    const chapter = subject?.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    const idx = chapter.lectures.findIndex(l => l.id === lectureId);
    if (idx > 0) {
        playVideo(subjectId, chapter.lectures[idx - 1].id);
    }
}

// =======================================================
// ADDON: Default Thumbnail Fallback + Better To-Do Icons
// =======================================================

// Override updatePlayerUI to handle default thumbnail fallback in playlist
function updatePlayerUI(lecture, chapter, subject) {
    const titleEl = document.getElementById('player-title');
    if (titleEl) titleEl.textContent = lecture.lecture;

    // Related files list
    const relatedFilesList = document.getElementById('related-files-list');
    if (relatedFilesList) {
        relatedFilesList.innerHTML = lecture.relatedFiles?.length > 0 ? lecture.relatedFiles.map(file => {
            const escapedFileTitle = file.title.replace(/"/g, "&quot;");
            return `
            <div class="related-file-item glass-card">
                <a href="${file.path}" target="_blank" class="related-file-item-info">
                    <div class="icon"><i class="fas fa-file-alt fa-lg"></i></div>
                    <span>${file.title}</span>
                </a>
                <button class="pin-button" onclick='pinItem(event, {type: "file", text: "${escapedFileTitle}", path: "${file.path}"})' title="Pin to To-Do List"><i class="fas fa-thumbtack"></i></button>
            </div>`
        }).join('') : '<p>No files for this lecture.</p>';
    }

    // Playlist with thumbnail fallback
    const playlistContainer = document.getElementById('chapter-playlist');
    if (playlistContainer && chapter) {
        playlistContainer.innerHTML = chapter.lectures.map(lec => {
            const hasThumb = lec.thumbnail && !lec.thumbnail.includes('assets/default.png');
            const thumbHTML = hasThumb
                ? `<img src="${lec.thumbnail}" alt="">`
                : `<div class="playlist-default"><i class="fas fa-video"></i></div>`;

            return `
                <div class="playlist-item ${lec.id === lecture.id ? 'is-playing' : ''}" onclick="playVideo('${subject.id}', '${lec.id}')">
                    <div class="playlist-item-thumbnail">${thumbHTML}</div>
                    <span class="playlist-item-title">${lec.lecture}</span>
                </div>
            `;
        }).join('');
    }
}

// Override renderTodos for smarter icons
function renderTodos() {
    const todoList = document.getElementById('todo-list');
    if (!todoList) return;

    todoList.innerHTML = todos.map(todo => {
        let icon = "fa-check"; // default for normal tasks
        if (todo.type === "lecture") {
            icon = "fa-play-circle";
        } else if (todo.type === "file") {
            if (todo.path && todo.path.endsWith('.pdf')) icon = "fa-file-pdf";
            else if (todo.path && todo.path.endsWith('.docx')) icon = "fa-file-word";
            else if (todo.path && todo.path.endsWith('.xlsx')) icon = "fa-file-excel";
            else icon = "fa-file-alt";
        }

        const isPinned = todo.type === 'lecture' || todo.type === 'file';
        const clickableClass = isPinned ? 'pinned-item' : '';
        const escapedText = todo.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        return `
            <li data-id="${todo.id}" class="${todo.completed ? 'completed' : ''}">
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="${clickableClass}">
                    <i class="fas ${icon}"></i> ${escapedText}
                </span>
                <button class="delete-todo" title="Delete Task">&times;</button>
            </li>`;
    }).join('');
}
