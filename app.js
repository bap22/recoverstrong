// RecoverStrong Workout Tracker
class WorkoutTracker {
    constructor() {
        this.storageKey = 'recoverStrongData';
        this.workoutData = this.loadData();
        this.timerInterval = null;
        this.timerSeconds = 30 * 60; // 30 minutes
        this.currentTimerSeconds = this.timerSeconds;
        this.timerRunning = false;
        this.completionChart = null;
        this.weightChart = null;
        this.wakeLock = null;
        this.activeTimerCount = 0; // tracks running mini-timers + main timer
        
        this.workoutRoutine = [
            {
                category: 'Warm-up',
                exercises: [
                    { icon: '🔄', name: 'Neck Circles', description: 'Gentle rotation', reps: '30 sec each direction' },
                    { icon: '🤸', name: 'Arm Swings', description: 'Forward and backward', reps: '30 sec each' },
                    { icon: '🦵', name: 'Leg Swings', description: 'Front to back, side to side', reps: '10 each leg' },
                    { icon: '🚶', name: 'March in Place', description: 'Knees high', reps: '1 min' }
                ]
            },
            {
                category: 'Quad Building (Patellar Safe)',
                exercises: [
                    { icon: '🧱', name: 'Wall Sits', description: 'Back against wall, knees at 90°', reps: '3 sets of 30 sec' },
                    { icon: '🦵', name: 'Straight Leg Raises', description: 'Lying on back, keep knee straight', reps: '3 sets of 15 each leg' },
                    { icon: '🪑', name: 'Mini Squats', description: 'Shallow squats, no pain', reps: '3 sets of 12' },
                    { icon: '📈', name: 'Step-ups', description: 'Low step, controlled motion', reps: '3 sets of 10 each leg' }
                ]
            },
            {
                category: 'Upper Body & Cardio',
                exercises: [
                    { icon: '💪', name: 'Push-ups', description: 'Knee or wall version if needed', reps: '3 sets of max (aim 10)' },
                    { icon: '⚠️', name: 'Standing Jumps', description: 'CONSULT PT FIRST - May be high impact on healing tendon', reps: '3 sets of 10' }
                ]
            },
            {
                category: 'Core & Fat Loss',
                exercises: [
                    { icon: '🛡️', name: 'Planks', description: 'Forearm or high plank', reps: '3 sets of 30 sec' },
                    { icon: '🐦', name: 'Bird-Dogs', description: 'Alternate arm/leg extension', reps: '3 sets of 10 each side' },
                    { icon: '🚴', name: 'Bicycle Crunches', description: 'Slow and controlled', reps: '3 sets of 15 each side' }
                ]
            },
            {
                category: 'Cool-down',
                exercises: [
                    { icon: '🧘', name: 'Quad Stretch', description: 'Hold each leg', reps: '30 sec each' },
                    { icon: '🦵', name: 'Hamstring Stretch', description: 'Sitting reach', reps: '30 sec each' },
                    { icon: '😌', name: 'Deep Breathing', description: 'Calm recovery', reps: '1 min' }
                ]
            }
        ];
        
        this.init();
    }
    
    loadData() {
        const defaultData = {
            streak: 0,
            lastWorkoutDate: null,
            completions: [], // array of dates
            weightLogs: [], // {date, weight}
            settings: {
                reminderEnabled: false,
                reminderTime: '08:00'
            }
        };
        
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse stored data', e);
            }
        }
        return defaultData;
    }
    
    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.workoutData));
    }
    
    init() {
        this.updateDateDisplay();
        this.renderExercises();
        this.updateStats();
        this.renderWeightHistory();
        this.renderCharts();
        this.setupEventListeners();
        this.checkTodaysCompletion();
        this.updateReminderUI();
        // Re-acquire wake lock if page visibility changes (iOS releases it on background)
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && this.activeTimerCount > 0 && !this.wakeLock) {
                await this.acquireWakeLock();
            }
        });
    }
    
    updateDateDisplay() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('dateDisplay').textContent = now.toLocaleDateString('en-US', options);
    }
    
    renderExercises() {
        const container = document.getElementById('exercisesContainer');
        container.innerHTML = '';
        const today = new Date().toDateString();
        if (!this.workoutData.exerciseCompletions) this.workoutData.exerciseCompletions = {};
        if (!this.workoutData.exerciseCompletions[today]) this.workoutData.exerciseCompletions[today] = {};


        this.workoutRoutine.forEach(category => {
            // Add category header
            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = category.category;
            categoryHeader.style.marginTop = '1.5rem';
            categoryHeader.style.marginBottom = '0.5rem';
            container.appendChild(categoryHeader);

            category.exercises.forEach((exercise, idx) => {
                const exerciseEl = document.createElement('div');
                exerciseEl.className = 'exercise-item';
                const exKey = `${category.category}-${exercise.name}`;
                // Timed exercise detection (e.g., '30 sec', '1 min')
                const isTimed = /\b(\d+\s*sec|\d+\s*min)\b/i.test(exercise.reps);
                // 3-set detection
                const isThreeSets = /3 sets?/i.test(exercise.reps);

                // For 3 sets, store completion state as array
                if (isThreeSets && !Array.isArray(this.workoutData.exerciseCompletions[today][exKey])) {
                    this.workoutData.exerciseCompletions[today][exKey] = [false, false, false];
                }

                let checkboxesHTML = '';
                if (isThreeSets) {
                    const checks = this.workoutData.exerciseCompletions[today][exKey] || [false, false, false];
                    checkboxesHTML = `<div class="set-checkboxes">` +
                        checks.map((val, i) => `<input type="checkbox" class="set-checkbox" data-exkey="${exKey}" data-set="${i}" ${val ? 'checked' : ''} aria-label="Set ${i+1}">`).join('') +
                        `</div>`;
                }

                let timerHTML = '';
                if (isTimed) {
                    // Extract seconds from reps string
                    let seconds = 0;
                    const secMatch = exercise.reps.match(/(\d+)\s*sec/i);
                    const minMatch = exercise.reps.match(/(\d+)\s*min/i);
                    if (secMatch) seconds = parseInt(secMatch[1]);
                    else if (minMatch) seconds = parseInt(minMatch[1]) * 60;
                    if (seconds > 0) {
                        timerHTML = `<div class="mini-timer" data-seconds="${seconds}">
                            <span class="mini-timer-display">${seconds}s</span>
                            <button class="mini-timer-start" aria-label="Start timer">▶️</button>
                        </div>`;
                    }
                }

                exerciseEl.innerHTML = `
                    <div class="exercise-icon">${exercise.icon}</div>
                    <div class="exercise-main">
                        <div class="exercise-details">
                            <div class="exercise-name">${exercise.name}</div>
                            <div class="exercise-description">${exercise.description}</div>
                        </div>
                        <div class="exercise-bottom-row">
                            <div class="exercise-reps">${exercise.reps}</div>
                            ${checkboxesHTML}
                            ${timerHTML}
                            ${!isThreeSets ? `<button class="exercise-complete-btn${this.workoutData.exerciseCompletions[today][exKey] ? ' completed' : ''}" data-exkey="${exKey}" aria-label="Mark exercise complete"><span class="checkbox-icon">${this.workoutData.exerciseCompletions[today][exKey] ? '✅' : '&#x25A2;'}</span></button>` : ''}
                        </div>
                    </div>
                `;
                container.appendChild(exerciseEl);
            });
        });

        // Add event listeners for exercise complete buttons
        container.querySelectorAll('.exercise-complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exKey = btn.getAttribute('data-exkey');
                this.markExerciseComplete(exKey, btn);
            });
        });
        // 3-set checkboxes
        container.querySelectorAll('.set-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const exKey = cb.getAttribute('data-exkey');
                const setIdx = parseInt(cb.getAttribute('data-set'));
                const today = new Date().toDateString();
                if (!this.workoutData.exerciseCompletions[today][exKey]) this.workoutData.exerciseCompletions[today][exKey] = [false, false, false];
                this.workoutData.exerciseCompletions[today][exKey][setIdx] = cb.checked;
                this.saveData();
            });
        });
        // Mini timers
        container.querySelectorAll('.mini-timer-start').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timerDiv = btn.closest('.mini-timer');
                const display = timerDiv.querySelector('.mini-timer-display');
                let seconds = parseInt(timerDiv.getAttribute('data-seconds'));
                btn.disabled = true;
                display.textContent = `${seconds}s`;
                this.onTimerStart();
                const interval = setInterval(() => {
                    seconds--;
                    display.textContent = `${seconds}s`;
                    if (seconds <= 0) {
                        clearInterval(interval);
                        display.textContent = 'Done!';
                        btn.disabled = false;
                        this.onTimerStop();
                    }
                }, 1000);
            });
        });
        this.saveData();
    }

    markExerciseComplete(exKey, btn) {
        const today = new Date().toDateString();
        if (!this.workoutData.exerciseCompletions) this.workoutData.exerciseCompletions = {};
        if (!this.workoutData.exerciseCompletions[today]) this.workoutData.exerciseCompletions[today] = {};
        if (!this.workoutData.exerciseCompletions[today][exKey]) {
            this.workoutData.exerciseCompletions[today][exKey] = true;
            this.saveData();
            btn.classList.add('completed');
            btn.textContent = '✅';
            this.launchConfetti();
        }
    }

    launchConfetti() {
        // Improved confetti effect using canvas, fixes sizing and overlay issues
        let canvas = document.getElementById('confettiCanvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'confettiCanvas';
            document.body.appendChild(canvas);
        }
        // Make sure canvas covers the viewport
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.display = 'block';
        canvas.style.position = 'fixed';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';
        const ctx = canvas.getContext('2d');
        const confettiCount = 180;
        const confetti = [];
        for (let i = 0; i < confettiCount; i++) {
            confetti.push({
                x: Math.random() * canvas.width,
                y: Math.random() * -canvas.height,
                r: 6 + Math.random() * 6,
                d: 2 + Math.random() * 2,
                color: `hsl(${Math.random()*360},80%,60%)`,
                tilt: Math.random() * 10 - 5
            });
        }
        let frame = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            confetti.forEach(c => {
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, c.r, c.r/2, c.tilt, 0, 2 * Math.PI);
                ctx.fillStyle = c.color;
                ctx.fill();
            });
        }
        function update() {
            confetti.forEach(c => {
                c.y += c.d;
                c.x += Math.sin(frame/10 + c.tilt) * 2;
                if (c.y > canvas.height) {
                    c.y = Math.random() * -20;
                    c.x = Math.random() * canvas.width;
                }
            });
        }
        function animate() {
            frame++;
            draw();
            update();
            if (frame < 160) {
                requestAnimationFrame(animate);
            } else {
                canvas.style.display = 'none';
            }
        }
        animate();
    }
    
    updateStats() {
        // Calculate streak
        const today = new Date().toDateString();
        const lastDate = this.workoutData.lastWorkoutDate ? new Date(this.workoutData.lastWorkoutDate).toDateString() : null;
        
        let streak = this.workoutData.streak || 0;
        if (lastDate === today) {
            // Already worked out today
        } else if (lastDate === new Date(Date.now() - 86400000).toDateString()) {
            streak += 1;
        } else {
            streak = this.workoutData.completions.includes(today) ? 1 : 0;
        }
        
        // Weekly completion
        const weekAgo = Date.now() - 7 * 86400000;
        const recentCompletions = this.workoutData.completions.filter(dateStr => {
            const date = new Date(dateStr).getTime();
            return date > weekAgo;
        });
        const weeklyRate = Math.round((recentCompletions.length / 7) * 100);
        
        document.getElementById('streakCount').textContent = streak;
        document.getElementById('completionRate').textContent = `${weeklyRate}%`;
        document.getElementById('totalWorkouts').textContent = this.workoutData.completions.length;
    }
    
    renderWeightHistory() {
        const container = document.getElementById('weightHistory');
        const logs = this.workoutData.weightLogs;
        
        if (logs.length === 0) {
            container.innerHTML = '<p>No weight data yet. Log your first entry!</p>';
            return;
        }
        
        container.innerHTML = logs.slice(-5).reverse().map(log => {
            const date = new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `
                <div class="weight-entry">
                    <span>${date}</span>
                    <strong>${log.weight} lbs</strong>
                </div>
            `;
        }).join('');
    }
    
    renderWeightAdminTable(container) {
        const logs = this.workoutData.weightLogs;
        const rows = logs.map((log, i) => {
            const dateVal = new Date(log.date).toISOString().split('T')[0];
            return `<tr>
                <td><input type="date" value="${dateVal}" data-wi="${i}" data-field="date"></td>
                <td><input type="number" step="0.1" value="${log.weight}" data-wi="${i}" data-field="weight" style="max-width:100px"></td>
                <td><button class="btn-danger" data-wi="${i}" data-action="delete-weight">✕</button></td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            <h4 style="margin-bottom:0.5rem">Edit Weight Log</h4>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Date</th><th>Weight (lbs)</th><th></th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="admin-actions">
                <button class="btn-small" id="addWeightRowBtn">+ Add Row</button>
                <button class="btn-primary btn-small" id="saveWeightTableBtn">Save</button>
                <button class="btn-secondary btn-small" id="cancelWeightTableBtn">Cancel</button>
            </div>`;

        container.querySelectorAll('[data-action="delete-weight"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.getAttribute('data-wi'));
                this.workoutData.weightLogs.splice(i, 1);
                this.renderWeightAdminTable(container);
            });
        });
        document.getElementById('addWeightRowBtn').onclick = () => {
            this.workoutData.weightLogs.push({ date: new Date().toISOString(), weight: 0 });
            this.renderWeightAdminTable(container);
        };
        document.getElementById('saveWeightTableBtn').onclick = () => {
            container.querySelectorAll('input[data-wi]').forEach(inp => {
                const i = parseInt(inp.getAttribute('data-wi'));
                const field = inp.getAttribute('data-field');
                if (field === 'date') {
                    this.workoutData.weightLogs[i].date = new Date(inp.value).toISOString();
                } else if (field === 'weight') {
                    this.workoutData.weightLogs[i].weight = parseFloat(inp.value) || 0;
                }
            });
            this.saveData();
            this.renderWeightHistory();
            this.renderCharts();
            container.style.display = 'none';
        };
        document.getElementById('cancelWeightTableBtn').onclick = () => { container.style.display = 'none'; };
    }

    renderProgressAdminTable(container) {
        const completions = [...this.workoutData.completions];
        const rows = completions.map((dateStr, i) => {
            const dateVal = new Date(dateStr).toISOString().split('T')[0];
            return `<tr>
                <td><input type="date" value="${dateVal}" data-pi="${i}"></td>
                <td><button class="btn-danger" data-pi="${i}" data-action="delete-progress">✕</button></td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            <h4 style="margin-bottom:0.5rem">Edit Workout Completions</h4>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Date Completed</th><th></th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="admin-actions">
                <button class="btn-small" id="addProgressRowBtn">+ Add Date</button>
                <button class="btn-primary btn-small" id="saveProgressTableBtn">Save</button>
                <button class="btn-secondary btn-small" id="cancelProgressTableBtn">Cancel</button>
            </div>`;

        container.querySelectorAll('[data-action="delete-progress"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.getAttribute('data-pi'));
                this.workoutData.completions.splice(i, 1);
                this.renderProgressAdminTable(container);
            });
        });
        document.getElementById('addProgressRowBtn').onclick = () => {
            this.workoutData.completions.push(new Date().toDateString());
            this.renderProgressAdminTable(container);
        };
        document.getElementById('saveProgressTableBtn').onclick = () => {
            const newCompletions = [];
            container.querySelectorAll('input[data-pi]').forEach(inp => {
                newCompletions.push(new Date(inp.value).toDateString());
            });
            this.workoutData.completions = newCompletions;
            this.saveData();
            this.updateStats();
            this.renderCharts();
            this.checkTodaysCompletion();
            container.style.display = 'none';
        };
        document.getElementById('cancelProgressTableBtn').onclick = () => { container.style.display = 'none'; };
    }

    exportData() {
        const json = JSON.stringify(this.workoutData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recoverstrong-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(adminEditArea) {
        adminEditArea.style.display = 'block';
        adminEditArea.innerHTML = `
            <h4 style="margin-bottom:0.75rem">📥 Import Data</h4>
            <p style="color:var(--text-light);font-size:0.9rem;margin-bottom:0.75rem">
                Paste your exported JSON below, or tap "Choose File" to load a backup file.<br>
                <strong style="color:var(--warning)">This will overwrite all current data.</strong>
            </p>
            <input type="file" id="importFileInput" accept=".json" style="margin-bottom:0.75rem;display:block;min-height:var(--touch-min)">
            <textarea id="importJsonArea" rows="8" style="width:100%;background:var(--background);color:var(--text);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.75rem;font-size:0.9rem;font-family:monospace" placeholder='Paste JSON here...'></textarea>
            <div class="admin-actions" style="margin-top:0.75rem">
                <button class="btn-primary btn-small" id="confirmImportBtn">Import & Overwrite</button>
                <button class="btn-secondary btn-small" id="cancelImportBtn">Cancel</button>
            </div>`;

        document.getElementById('importFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('importJsonArea').value = ev.target.result;
            };
            reader.readAsText(file);
        });

        document.getElementById('confirmImportBtn').onclick = () => {
            try {
                const parsed = JSON.parse(document.getElementById('importJsonArea').value);
                // Basic validation
                if (typeof parsed !== 'object' || !Array.isArray(parsed.completions)) {
                    throw new Error('Invalid data shape');
                }
                this.workoutData = parsed;
                this.saveData();
                this.updateDateDisplay();
                this.renderExercises();
                this.updateStats();
                this.renderWeightHistory();
                this.renderCharts();
                this.checkTodaysCompletion();
                this.updateReminderUI();
                adminEditArea.style.display = 'none';
                alert('✅ Data imported successfully!');
            } catch (e) {
                alert('❌ Invalid backup file. Make sure you\'re using a file exported from this app.');
            }
        };
        document.getElementById('cancelImportBtn').onclick = () => { adminEditArea.style.display = 'none'; };
    }

    setupEventListeners() {
                // Admin interface
                const editWeightBtn = document.getElementById('editWeightBtn');
                const editProgressBtn = document.getElementById('editProgressBtn');
                const adminEditArea = document.getElementById('adminEditArea');
                if (editWeightBtn) {
                    editWeightBtn.addEventListener('click', () => {
                        adminEditArea.style.display = 'block';
                        this.renderWeightAdminTable(adminEditArea);
                    });
                }
                if (editProgressBtn) {
                    editProgressBtn.addEventListener('click', () => {
                        adminEditArea.style.display = 'block';
                        this.renderProgressAdminTable(adminEditArea);
                    });
                }
                document.getElementById('exportDataBtn')?.addEventListener('click', () => this.exportData());
                document.getElementById('importDataBtn')?.addEventListener('click', () => this.importData(adminEditArea));
        // Mark complete buttons (top and bottom)
        const markCompleteBtn = document.getElementById('markCompleteBtn');
        const markCompleteBtnBottom = document.getElementById('markCompleteBtnBottom');
        if (markCompleteBtn) markCompleteBtn.addEventListener('click', () => this.markComplete());
        if (markCompleteBtnBottom) markCompleteBtnBottom.addEventListener('click', () => this.markComplete());
        
        // Skip button
        document.getElementById('skipBtn').addEventListener('click', () => this.skipDay());
        
        // Timer controls
        document.getElementById('startTimerBtn').addEventListener('click', () => this.startTimer());
        document.getElementById('pauseTimerBtn').addEventListener('click', () => this.pauseTimer());
        document.getElementById('resetTimerBtn').addEventListener('click', () => this.resetTimer());
        
        // Weight logging
        document.getElementById('logWeightBtn').addEventListener('click', () => this.logWeight());
        document.getElementById('weightInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.logWeight();
        });
        
        // Reminder toggle
        document.getElementById('reminderToggle').addEventListener('change', (e) => {
            this.workoutData.settings.reminderEnabled = e.target.checked;
            this.saveData();
            this.updateReminderUI();
            this.scheduleNotification();
        });
        
        // Reminder time
        document.getElementById('reminderTime').addEventListener('change', (e) => {
            this.workoutData.settings.reminderTime = e.target.value;
            this.saveData();
            this.scheduleNotification();
        });
    }
    
    checkTodaysCompletion() {
        const today = new Date().toDateString();
        const completed = this.workoutData.completions.includes(today);
        const btn = document.getElementById('markCompleteBtn');
        const btnBottom = document.getElementById('markCompleteBtnBottom');
        const statusCard = document.getElementById('statusCard');
        if (completed) {
            statusCard.innerHTML = '<p>✅ <strong>Workout completed today!</strong></p><p>Great job! Rest and recover.</p>';
            if (btn) {
                btn.textContent = 'Already Completed';
                btn.disabled = true;
            }
            if (btnBottom) {
                btnBottom.textContent = 'Already Completed';
                btnBottom.disabled = true;
            }
        } else {
            statusCard.innerHTML = '<p>📋 <strong>LET\'S GO!!!!</strong></p><p>30 min • Patellar-safe • No weights</p>';
            if (btn) {
                btn.textContent = 'Mark as Complete';
                btn.disabled = false;
            }
            if (btnBottom) {
                btnBottom.textContent = 'Mark as Complete';
                btnBottom.disabled = false;
            }
        }
    }
    
    markComplete() {
        const today = new Date().toDateString();
        
        if (!this.workoutData.completions.includes(today)) {
            this.workoutData.completions.push(today);
            this.workoutData.lastWorkoutDate = new Date().toISOString();
            
            // Update streak
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            const lastDate = this.workoutData.lastWorkoutDate ? new Date(this.workoutData.lastWorkoutDate).toDateString() : null;
            
            if (this.workoutData.completions.includes(yesterday)) {
                this.workoutData.streak += 1;
            } else {
                this.workoutData.streak = 1;
            }
            
            this.saveData();
            this.checkTodaysCompletion();
            this.updateStats();
            this.renderCharts();
            
            // Show confirmation
            const statusCard = document.getElementById('statusCard');
            statusCard.innerHTML = '<p>🎉 <strong>Workout logged!</strong></p><p>Consistency is key to recovery.</p>';
            
            // If timer was running, stop it
            this.pauseTimer();
        }
    }
    
    skipDay() {
        if (confirm("Skip today's workout? It's okay to rest, but consistency helps recovery.")) {
            const statusCard = document.getElementById('statusCard');
            statusCard.innerHTML = '<p>⏭️ <strong>Workout skipped</strong></p><p>Listen to your body. Try again tomorrow!</p>';
            
            // Reset streak if skipped
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            if (!this.workoutData.completions.includes(yesterday)) {
                this.workoutData.streak = 0;
                this.saveData();
                this.updateStats();
                this.renderCharts();
            }
        }
    }
    
    // ── Wake Lock ──────────────────────────────────────────
    async acquireWakeLock() {
        if (!('wakeLock' in navigator)) return;
        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            this.wakeLock.addEventListener('release', () => { this.wakeLock = null; });
        } catch (e) {
            console.log('Wake lock not acquired:', e.message);
        }
    }

    releaseWakeLock() {
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
    }

    onTimerStart() {
        this.activeTimerCount++;
        if (this.activeTimerCount === 1) this.acquireWakeLock();
    }

    onTimerStop() {
        this.activeTimerCount = Math.max(0, this.activeTimerCount - 1);
        if (this.activeTimerCount === 0) this.releaseWakeLock();
    }

    // ── Sticky main timer ──────────────────────────────────
    setTimerSticky(sticky) {
        const timerEl = document.querySelector('.timer');
        if (!timerEl) return;
        if (sticky) {
            timerEl.classList.add('timer-sticky');
            document.body.classList.add('timer-active');
        } else {
            timerEl.classList.remove('timer-sticky');
            document.body.classList.remove('timer-active');
        }
    }

    startTimer() {
        if (this.timerRunning) return;

        this.timerRunning = true;
        this.setTimerSticky(true);
        this.onTimerStart();
        const display = document.getElementById('timerDisplay');

        this.timerInterval = setInterval(() => {
            this.currentTimerSeconds--;

            if (this.currentTimerSeconds <= 0) {
                this.pauseTimer();
                display.textContent = '00:00';
                if (Notification.permission === 'granted') {
                    new Notification('RecoverStrong', {
                        body: 'Workout complete! Great job!'
                    });
                }
                return;
            }

            const minutes = Math.floor(this.currentTimerSeconds / 60);
            const seconds = this.currentTimerSeconds % 60;
            display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);

        document.getElementById('startTimerBtn').disabled = true;
        document.getElementById('pauseTimerBtn').disabled = false;
    }

    pauseTimer() {
        this.timerRunning = false;
        this.setTimerSticky(false);
        this.onTimerStop();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        document.getElementById('startTimerBtn').disabled = false;
        document.getElementById('pauseTimerBtn').disabled = true;
    }
    
    resetTimer() {
        this.pauseTimer();
        this.currentTimerSeconds = this.timerSeconds;
        const minutes = Math.floor(this.currentTimerSeconds / 60);
        const seconds = this.currentTimerSeconds % 60;
        document.getElementById('timerDisplay').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    logWeight() {
        const input = document.getElementById('weightInput');
        const weight = parseFloat(input.value);
        
        if (!weight || weight < 50 || weight > 500) {
            alert('Please enter a valid weight (50-500 lbs)');
            return;
        }
        
        this.workoutData.weightLogs.push({
            date: new Date().toISOString(),
            weight: weight
        });
        
        this.saveData();
        this.renderWeightHistory();
        this.renderCharts();
        input.value = '';
        
        // Show confirmation
        const statusCard = document.getElementById('statusCard');
        statusCard.innerHTML = `<p>📊 <strong>Weight logged: ${weight} lbs</strong></p><p>Tracking progress!</p>`;
        setTimeout(() => this.checkTodaysCompletion(), 3000);
    }
    
    updateReminderUI() {
        const toggle = document.getElementById('reminderToggle');
        const timeSelect = document.getElementById('reminderTime');

        toggle.checked = this.workoutData.settings.reminderEnabled || false;
        timeSelect.value = this.workoutData.settings.reminderTime || '08:00';

        if (this.workoutData.settings.reminderEnabled) {
            this.scheduleNotification();
        } else {
            this.updateReminderStatus('Reminder off');
        }
    }
    
    scheduleNotification() {
        if (!('Notification' in window)) {
            this.updateReminderStatus('⚠️ Notifications not supported on this browser');
            return;
        }

        if (!this.workoutData.settings.reminderEnabled) {
            this.updateReminderStatus('Reminder off');
            if (this._reminderInterval) clearInterval(this._reminderInterval);
            return;
        }

        if (Notification.permission === 'default') {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                    this.startReminderPolling();
                } else {
                    this.updateReminderStatus('⚠️ Permission denied — allow notifications in Safari settings');
                }
            });
        } else if (Notification.permission === 'granted') {
            this.startReminderPolling();
        } else {
            this.updateReminderStatus('⚠️ Notifications blocked — check Safari settings');
        }
    }

    startReminderPolling() {
        if (this._reminderInterval) clearInterval(this._reminderInterval);
        // Check immediately, then every 60 seconds
        this.checkAndFireReminder();
        this._reminderInterval = setInterval(() => this.checkAndFireReminder(), 60 * 1000);
        const time = this.workoutData.settings.reminderTime || '08:00';
        this.updateReminderStatus(`✅ Reminder set for ${this.formatTime12h(time)} — keep app open for it to fire`);
    }

    checkAndFireReminder() {
        if (!this.workoutData.settings.reminderEnabled) return;
        if (Notification.permission !== 'granted') return;

        const now = new Date();
        const [h, m] = (this.workoutData.settings.reminderTime || '08:00').split(':').map(Number);
        const todayKey = now.toDateString();

        // Fire if we're within the correct minute and haven't fired today
        if (now.getHours() === h && now.getMinutes() === m &&
            this.workoutData.lastReminderDate !== todayKey) {

            // Don't remind if already completed today
            if (!this.workoutData.completions.includes(todayKey)) {
                new Notification('💪 RecoverStrong', {
                    body: "Time for your workout! Keep the streak going.",
                    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💪</text></svg>'
                });
            }
            this.workoutData.lastReminderDate = todayKey;
            this.saveData();
        }
    }

    formatTime12h(time24) {
        const [h, m] = time24.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    }

    updateReminderStatus(msg) {
        let el = document.getElementById('reminderStatus');
        if (el) el.textContent = msg;
    }
    
    renderCharts() {
        // Destroy existing charts
        if (this.completionChart) {
            this.completionChart.destroy();
        }
        if (this.weightChart) {
            this.weightChart.destroy();
        }
        
        // Completion Chart - Last 7 days
        const completionCtx = document.getElementById('completionChart').getContext('2d');
        const last7Days = [];
        const completionData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
            completionData.push(this.workoutData.completions.includes(dateStr) ? 1 : 0);
        }
        
        this.completionChart = new Chart(completionCtx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Workout Completed',
                    data: completionData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#2563eb',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            callback: function(value) {
                                return value === 1 ? '✓' : '✗';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.raw === 1 ? 'Completed' : 'Missed';
                            }
                        }
                    }
                }
            }
        });
        
        // Weight Chart - Last 10 entries
        const weightCtx = document.getElementById('weightChart').getContext('2d');
        const weightEntries = this.workoutData.weightLogs.slice(-10); // Last 10 entries
        const weightDates = weightEntries.map(entry => {
            const date = new Date(entry.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const weightValues = weightEntries.map(entry => entry.weight);
        
        if (weightEntries.length > 0) {
            this.weightChart = new Chart(weightCtx, {
                type: 'line',
                data: {
                    labels: weightDates,
                    datasets: [{
                        label: 'Weight (lbs)',
                        data: weightValues,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#10b981',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: false,
                            grace: '5%'
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        } else {
            // Show placeholder text if no weight data
            weightCtx.font = '16px sans-serif';
            weightCtx.fillStyle = '#64748b';
            weightCtx.textAlign = 'center';
            weightCtx.fillText('Log your weight to see progress!', weightCtx.canvas.width / 2, weightCtx.canvas.height / 2);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.workoutTracker = new WorkoutTracker();
});