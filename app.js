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
                const checked = this.workoutData.exerciseCompletions[today][exKey] || false;
                exerciseEl.innerHTML = `
                    <div class="exercise-icon">${exercise.icon}</div>
                    <div class="exercise-main">
                        <div class="exercise-details">
                            <div class="exercise-name">${exercise.name}</div>
                            <div class="exercise-description">${exercise.description}</div>
                        </div>
                        <div class="exercise-bottom-row">
                            <div class="exercise-reps">${exercise.reps}</div>
                            <button class="exercise-complete-btn${checked ? ' completed' : ''}" data-exkey="${exKey}" aria-label="Mark exercise complete">
                                <span class="checkbox-icon">${checked ? '✅' : '&#x25A2;'}</span>
                            </button>
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
    
    setupEventListeners() {
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
    
    startTimer() {
        if (this.timerRunning) return;
        
        this.timerRunning = true;
        const display = document.getElementById('timerDisplay');
        
        this.timerInterval = setInterval(() => {
            this.currentTimerSeconds--;
            
            if (this.currentTimerSeconds <= 0) {
                this.pauseTimer();
                display.textContent = '00:00';
                // Optional: play sound or notification
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
    }
    
    scheduleNotification() {
        // In a real PWA, we'd use the Notification API and background sync
        // This is a simplified version
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return;
        }
        
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // For a real implementation, we'd use service worker background sync
        // and the Push API for actual scheduled notifications
        console.log('Reminder settings updated:', this.workoutData.settings);
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