// ═══════════════════════════════════════════════════════════════
// ÆTHER-1 MAIN APPLICATION
// Interactive Beat Maker Controller
// ═══════════════════════════════════════════════════════════════

class AetherApp {
    constructor() {
        // Core systems
        this.audioEngine = null;
        this.threeScene = null;
        
        // State
        this.isPlaying = false;
        this.isRecording = false;
        this.currentStep = 0;
        this.bpm = 80;
        this.sequencerInterval = null;
        
        // Sequencer data (8 rows x 16 steps)
        this.sequencerData = Array(8).fill(null).map(() => Array(16).fill(false));
        
        // Letter-key melodic pads removed (UI + bindings) to avoid stuck-note screeching.
        
        // Knob interaction state
        this.activeKnob = null;
        this.knobStartY = 0;
        this.knobStartValue = 0;
        
        // Guard against repeated keydown stacking (prevents runaway build-up)
        this.heldKeys = new Set();
        
        this.init();
    }
    
    async init() {
        // Skip the startup loading delay (open instantly)
        const loading = document.getElementById('loading-screen');
        if (loading) loading.classList.add('hidden');
        
        // Initialize audio engine
        this.audioEngine = new AetherAudioEngine();
        
        // Initialize Three.js scene
        this.threeScene = new AetherScene();
        
        // Build UI
        this.buildSequencer();
        this.buildFXPads();
        this.initializeKnobs();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start visualization loop
        this.startVisualizationLoop();
        
        this.updateDisplay('CLICK TO START');
    }
    
    async simulateLoading() {
        // Kept for compatibility; no artificial delay.
        return Promise.resolve();
    }
    
    buildSequencer() {
        const sequencer = document.getElementById('sequencer');
        const stepIndicators = document.getElementById('step-indicators');
        
        // Build 8 rows x 16 columns
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 16; col++) {
                const step = document.createElement('div');
                step.className = 'seq-step';
                step.dataset.row = row;
                step.dataset.col = col;
                
                step.addEventListener('click', () => this.toggleSequencerStep(row, col));
                
                sequencer.appendChild(step);
            }
        }
        
        // Build step indicators
        for (let i = 0; i < 16; i++) {
            const indicator = document.createElement('div');
            indicator.className = 'step-indicator';
            indicator.dataset.step = i;
            stepIndicators.appendChild(indicator);
        }
    }
    
    buildPads() {
        const padsContainer = document.getElementById('pads');
        const notes = ['C', 'D', 'E', 'G', 'A', 'C\'', 'D\'', 'E\''];
        const keys = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'];
        const colors = ['cyan', 'magenta', 'amber', 'green', 'pink', 'cyan', 'magenta', 'amber'];
        
        for (let i = 0; i < 16; i++) {
            const pad = document.createElement('div');
            pad.className = 'pad';
            pad.dataset.index = i;
            pad.dataset.color = colors[i % colors.length];
            
            const noteLabel = document.createElement('span');
            noteLabel.className = 'pad-note';
            noteLabel.textContent = notes[i % notes.length];
            
            const keyLabel = document.createElement('span');
            keyLabel.className = 'pad-key';
            keyLabel.textContent = keys[i];
            
            pad.appendChild(noteLabel);
            pad.appendChild(keyLabel);
            
            // Mouse events
            pad.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.triggerPad(i);
            });
            
            pad.addEventListener('mouseup', () => {
                this.releasePad(i);
            });
            
            pad.addEventListener('mouseleave', () => {
                this.releasePad(i);
            });
            
            // Touch events
            pad.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.triggerPad(i);
            });
            
            pad.addEventListener('touchend', () => {
                this.releasePad(i);
            });
            
            padsContainer.appendChild(pad);
        }
    }
    
    buildFXPads() {
        const fxContainer = document.getElementById('fx-pads');
        
        // Define all FX sounds organized by category
        this.fxSounds = {
            choirs: [
                { name: 'HEAVEN', method: 'playHeavenlyChoir', key: '1' },
                { name: 'GOSPEL', method: 'playGospelChoir', key: '2' },
                { name: 'ANGEL', method: 'playAngelVoice', key: '3' },
                { name: 'SWELL', method: 'playChoirSwell', key: '4' },
                { name: 'HALLELU', method: 'playHallelujah', key: '5' },
                { name: 'DONDA', method: 'playDondaVocal', key: '6' },
                { name: 'SPIRIT', method: 'playSpiritualHum', key: '7' },
                { name: 'MONK', method: 'playMonkChant', key: '8' }
            ],
            adrenaline: [
                { name: 'SCREAM', method: 'playYeezusScream', key: '1' },
                { name: 'INDUST', method: 'playIndustrialHit', key: '2' },
                { name: 'GLITCH', method: 'playGlitchBurst', key: '3' },
                { name: 'SIREN', method: 'playSiren', key: '4' },
                { name: 'ALARM', method: 'playAlarm', key: '5' },
                { name: 'LASER', method: 'playLaser', key: '6' },
                { name: 'POWER', method: 'playPowerUp', key: '7' },
                { name: 'DIST', method: 'playDistortedBass', key: '8' }
            ],
            atmosphere: [
                { name: 'SPACE', method: 'playSpaceAmbience', key: '1' },
                { name: 'NEBULA', method: 'playNebula', key: '2' },
                { name: 'WORM', method: 'playWormhole', key: '3' },
                { name: 'COSMIC', method: 'playCosmicPad', key: '4' },
                { name: 'STARS', method: 'playStarDust', key: '5' },
                { name: 'BLACK', method: 'playBlackHole', key: '6' },
                { name: 'AURORA', method: 'playAurora', key: '7' },
                { name: 'TIME', method: 'playTimeWarp', key: '8' }
            ],
            impacts: [
                { name: 'BIG', method: 'playBigImpact', key: '1' },
                { name: 'DROP', method: 'playDropHit', key: '2' },
                { name: 'CRASH', method: 'playCrash', key: '3' },
                { name: 'SHOT', method: 'playGunshot', key: '4' },
                { name: 'BOOM', method: 'playExplosion', key: '5' },
                { name: 'PUNCH', method: 'playPunch', key: '6' },
                { name: 'WHOOSH', method: 'playWhoosh', key: '7' },
                { name: 'RISE+', method: 'playRiserImpact', key: '8' }
            ],
            synths: [
                { name: 'STAB', method: 'playSynthStab', key: '1' },
                { name: 'FUTURE', method: 'playFutureBass', key: '2' },
                { name: 'PLUCK', method: 'playPluck', key: '3' },
                { name: 'ARP', method: 'playArp', key: '4' },
                { name: 'REESE', method: 'playReese', key: '5' },
                { name: 'LEAD', method: 'playLead', key: '6' },
                { name: 'HOOVER', method: 'playHoover', key: '7' },
                { name: '8BIT', method: 'playChipTune', key: '8' }
            ]
        };
        
        this.currentFXCategory = 'choirs';
        this.renderFXPads();
        
        // FX category buttons
        document.querySelectorAll('.fx-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.fx-cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFXCategory = btn.dataset.category;
                this.renderFXPads();
                this.updateDisplay(`FX: ${this.currentFXCategory.toUpperCase()}`);
            });
        });
    }
    
    renderFXPads() {
        const fxContainer = document.getElementById('fx-pads');
        fxContainer.innerHTML = '';
        
        const sounds = this.fxSounds[this.currentFXCategory];
        
        sounds.forEach((fx, i) => {
            const pad = document.createElement('div');
            pad.className = 'fx-pad';
            pad.dataset.index = i;
            pad.dataset.method = fx.method;
            pad.dataset.category = this.currentFXCategory;
            
            const nameLabel = document.createElement('span');
            nameLabel.className = 'fx-pad-name';
            nameLabel.textContent = fx.name;
            
            const keyLabel = document.createElement('span');
            keyLabel.className = 'fx-pad-key';
            keyLabel.textContent = fx.key;
            
            pad.appendChild(nameLabel);
            pad.appendChild(keyLabel);
            
            // Mouse events
            pad.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.triggerFX(i);
            });
            
            pad.addEventListener('mouseup', () => {
                pad.classList.remove('playing');
            });
            
            pad.addEventListener('mouseleave', () => {
                pad.classList.remove('playing');
            });
            
            // Touch events
            pad.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.triggerFX(i);
            });
            
            pad.addEventListener('touchend', () => {
                pad.classList.remove('playing');
            });
            
            fxContainer.appendChild(pad);
        });
    }
    
    triggerFX(index) {
        if (!this.audioEngine || !this.audioEngine.isInitialized) return;
        
        const sounds = this.fxSounds[this.currentFXCategory];
        const fx = sounds[index];
        
        if (fx && this.audioEngine[fx.method]) {
            const pad = document.querySelector(`.fx-pad[data-index="${index}"]`);
            if (pad) {
                pad.classList.add('playing');
                setTimeout(() => pad.classList.remove('playing'), 300);
            }
            
            this.audioEngine[fx.method](0.7);
            
            // Trigger 3D effect
            if (this.threeScene) {
                this.threeScene.triggerPadEffect(index);
            }
            
            this.updateDisplay(`FX: ${fx.name}`);
        }
    }
    
    buildKeyboard() {
        const keyboard = document.getElementById('piano-keyboard');
        this.keyboardOctave = 4; // Starting octave (C4 = middle C)
        this.activeKeyboardNotes = new Map();
        
        // Piano key layout: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
        const keyLayout = [
            { note: 'C', type: 'white', keyboardKey: 'z' },
            { note: 'C#', type: 'black', keyboardKey: 's' },
            { note: 'D', type: 'white', keyboardKey: 'x' },
            { note: 'D#', type: 'black', keyboardKey: 'd' },
            { note: 'E', type: 'white', keyboardKey: 'c' },
            { note: 'F', type: 'white', keyboardKey: 'v' },
            { note: 'F#', type: 'black', keyboardKey: 'g' },
            { note: 'G', type: 'white', keyboardKey: 'b' },
            { note: 'G#', type: 'black', keyboardKey: 'h' },
            { note: 'A', type: 'white', keyboardKey: 'n' },
            { note: 'A#', type: 'black', keyboardKey: 'j' },
            { note: 'B', type: 'white', keyboardKey: 'm' },
            { note: 'C+', type: 'white', keyboardKey: ',' }
        ];
        
        this.pianoKeyMap = {};
        
        keyLayout.forEach((key, i) => {
            const keyEl = document.createElement('div');
            keyEl.className = `piano-key ${key.type}`;
            keyEl.dataset.note = i;
            keyEl.dataset.keyboardKey = key.keyboardKey;
            
            const label = document.createElement('span');
            label.className = 'key-label';
            label.textContent = key.keyboardKey.toUpperCase();
            keyEl.appendChild(label);
            
            // Mouse events
            keyEl.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.playKeyboardNote(i);
            });
            
            keyEl.addEventListener('mouseup', () => {
                this.releaseKeyboardNote(i);
            });
            
            keyEl.addEventListener('mouseleave', () => {
                this.releaseKeyboardNote(i);
            });
            
            // Touch events
            keyEl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.playKeyboardNote(i);
            });
            
            keyEl.addEventListener('touchend', () => {
                this.releaseKeyboardNote(i);
            });
            
            keyboard.appendChild(keyEl);
            this.pianoKeyMap[key.keyboardKey] = i;
        });
        
        // Octave controls
        document.getElementById('oct-down').addEventListener('click', () => {
            if (this.keyboardOctave > 1) {
                this.keyboardOctave--;
                this.updateOctaveDisplay();
            }
        });
        
        document.getElementById('oct-up').addEventListener('click', () => {
            if (this.keyboardOctave < 7) {
                this.keyboardOctave++;
                this.updateOctaveDisplay();
            }
        });
    }
    
    updateOctaveDisplay() {
        document.getElementById('oct-display').textContent = `C${this.keyboardOctave}`;
    }
    
    playKeyboardNote(noteIndex) {
        if (!this.audioEngine || !this.audioEngine.isInitialized) return;
        
        // Calculate MIDI note: C4 = 60
        const midiNote = (this.keyboardOctave * 12) + noteIndex + 12;
        
        const keyEl = document.querySelector(`.piano-key[data-note="${noteIndex}"]`);
        if (keyEl) {
            keyEl.classList.add('playing');
        }
        
        const voiceId = this.audioEngine.playKeyboardNote(midiNote, 0.7);
        this.activeKeyboardNotes.set(noteIndex, voiceId);
        
        // Trigger 3D effect
        if (this.threeScene) {
            this.threeScene.triggerPadEffect(noteIndex);
        }
        
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C'];
        this.updateDisplay(`🎹 ${noteNames[noteIndex % 12]}${this.keyboardOctave + Math.floor(noteIndex / 12)}`);
    }
    
    releaseKeyboardNote(noteIndex) {
        const keyEl = document.querySelector(`.piano-key[data-note="${noteIndex}"]`);
        if (keyEl) {
            keyEl.classList.remove('playing');
        }
        
        const voiceId = this.activeKeyboardNotes.get(noteIndex);
        if (voiceId && this.audioEngine) {
            this.audioEngine.releaseNote(voiceId, 0.08);
            this.activeKeyboardNotes.delete(noteIndex);
        }
    }

    panicAllSounds() {
        if (this.audioEngine && this.audioEngine.panic) this.audioEngine.panic();

        // Clear UI highlights
        document.querySelectorAll('.pad.playing').forEach((el) => el.classList.remove('playing'));
        document.querySelectorAll('.piano-key.playing').forEach((el) => el.classList.remove('playing'));
        this.heldKeys.clear();

        if (this.keyAutoReleaseTimers) {
            this.keyAutoReleaseTimers.forEach((t) => clearTimeout(t));
            this.keyAutoReleaseTimers.clear();
        }
    }
    
    initializeKnobs() {
        const knobs = document.querySelectorAll('.knob, .mini-knob');
        
        knobs.forEach(knob => {
            const value = parseInt(knob.dataset.value) || 50;
            this.updateKnobVisual(knob, value);
            
            // Mouse events
            knob.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.startKnobInteraction(knob, e.clientY);
            });
        });
        
        // Global mouse events for knob dragging
        document.addEventListener('mousemove', (e) => {
            if (this.activeKnob) {
                this.updateKnobValue(e.clientY);
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.activeKnob = null;
        });
    }
    
    startKnobInteraction(knob, startY) {
        this.activeKnob = knob;
        this.knobStartY = startY;
        this.knobStartValue = parseInt(knob.dataset.value) || 50;
    }
    
    updateKnobValue(currentY) {
        if (!this.activeKnob) return;
        
        const delta = (this.knobStartY - currentY) * 0.5;
        let newValue = Math.max(0, Math.min(100, this.knobStartValue + delta));
        
        this.activeKnob.dataset.value = Math.round(newValue);
        this.updateKnobVisual(this.activeKnob, newValue);
        
        // Apply parameter change
        const param = this.activeKnob.dataset.param;
        this.applyKnobParameter(param, newValue / 100);
    }
    
    updateKnobVisual(knob, value) {
        const indicator = knob.querySelector('.knob-indicator');
        if (indicator) {
            // Map 0-100 to -135 to 135 degrees
            const angle = (value / 100) * 270 - 135;
            indicator.style.transform = `translateX(-50%) rotate(${angle}deg)`;
        }
    }
    
    applyKnobParameter(param, value) {
        if (!this.audioEngine) return;
        
        switch (param) {
            case 'reverb':
                this.audioEngine.setReverb(value);
                break;
            case 'delay':
                this.audioEngine.setDelay(value);
                break;
            case 'filter':
                this.audioEngine.setFilter(value);
                break;
            case 'master':
                this.audioEngine.setMaster(value);
                break;
            case 'attack':
            case 'decay':
            case 'sustain':
            case 'release':
                this.audioEngine.setEnvelope(param, value);
                break;
        }
    }
    
    setupEventListeners() {
        // First click to initialize audio
        document.addEventListener('click', async () => {
            if (!this.audioEngine.isInitialized) {
                await this.audioEngine.init();
                this.updateDisplay('READY');
            }
            this.audioEngine.resume();
        }, { once: true });
        
        // Transport controls
        document.getElementById('play-btn').addEventListener('click', () => this.togglePlay());
        document.getElementById('stop-btn').addEventListener('click', () => this.stop());
        document.getElementById('record-btn').addEventListener('click', () => this.toggleRecord());
        
        // Sequencer controls
        document.getElementById('clear-seq').addEventListener('click', () => this.clearSequencer());
        document.getElementById('random-seq').addEventListener('click', () => this.randomizeSequencer());
        
        // Tempo controls
        document.getElementById('tempo-up').addEventListener('click', () => this.changeTempo(5));
        document.getElementById('tempo-down').addEventListener('click', () => this.changeTempo(-5));
        document.getElementById('tempo-input').addEventListener('change', (e) => {
            this.bpm = Math.max(40, Math.min(200, parseInt(e.target.value) || 80));
            e.target.value = this.bpm;
            this.updateBpmDisplay();
            if (this.isPlaying) {
                this.restartSequencer();
            }
        });
        
        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const mode = btn.dataset.mode;
                if (this.audioEngine) {
                    this.audioEngine.setMode(mode);
                }
                document.getElementById('mode-display').textContent = mode.toUpperCase();
                this.updateDisplay(`MODE: ${mode.toUpperCase()}`);
            });
        });
        
        // Voice buttons
        document.querySelectorAll('.voice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.voice-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const voice = btn.dataset.voice;
                if (this.audioEngine) {
                    this.audioEngine.setVoice(voice);
                }
                this.updateDisplay(`VOICE: ${voice.toUpperCase()}`);
            });
        });
        
        // Sliders
        document.querySelectorAll('.slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const value = e.target.value / 100;
                const id = e.target.id;
                
                // These could control additional parameters
                console.log(`${id}: ${value}`);
            });
        });
        
        // FX keyboard mapping (number keys 1-8)
        this.fxKeyboardMap = {
            '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7
        };

        // Safety: if keyup is missed, auto-release after a short time
        // (used for any key we choose to make "holdable")
        this.keyAutoReleaseTimers = new Map();
        
        // Keyboard events
        // Use a held-key guard (and capture) so keys don't stack into runaway audio.
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();

            if (this.heldKeys.has(key)) return;
            this.heldKeys.add(key);
            
            // Number keys (1-8) for FX
            if (this.fxKeyboardMap.hasOwnProperty(e.key)) {
                e.preventDefault();
                this.triggerFX(this.fxKeyboardMap[e.key]);
            }
            
            // Space for play/pause
            if (key === ' ') {
                e.preventDefault();
                this.togglePlay();
            }
            
            // Octave controls removed (keyboard UI removed)

            // Panic (stop all sounds)
            if (e.key === 'Escape') {
                e.preventDefault();
                this.panicAllSounds();
                this.updateDisplay('PANIC STOP');
            }
        }, true);
        
        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.heldKeys.delete(key);

            const t = this.keyAutoReleaseTimers.get(key);
            if (t) {
                clearTimeout(t);
                this.keyAutoReleaseTimers.delete(key);
            }
        }, true);

        // If the tab/window loses focus, stop anything that could get stuck
        window.addEventListener('blur', () => this.panicAllSounds());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.panicAllSounds();
        });
    }
    
    triggerPad(index) {
        if (!this.audioEngine || !this.audioEngine.isInitialized) return;
        
        // Release any existing voice for this pad first
        if (this.activePadVoices.has(index)) {
            const oldVoiceId = this.activePadVoices.get(index);
            this.audioEngine.releaseNote(oldVoiceId, 0.08);
        }
        
        const pad = document.querySelector(`.pad[data-index="${index}"]`);
        if (pad) {
            pad.classList.add('playing');
        }
        
        // Play sound and store the voice ID
        const voiceId = this.audioEngine.playNote(index, 0.8);
        if (voiceId) {
            this.activePadVoices.set(index, voiceId);
        }
        
        // Trigger 3D effect
        if (this.threeScene) {
            this.threeScene.triggerPadEffect(index);
        }
        
        // Record to sequencer if recording
        if (this.isRecording && this.isPlaying) {
            const row = index % 8;
            this.sequencerData[row][this.currentStep] = true;
            this.updateSequencerVisual(row, this.currentStep, true);
        }
        
        // Update display
        const notes = ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
        this.updateDisplay(`♪ ${notes[index % notes.length]}`);
    }
    
    releasePad(index) {
        const pad = document.querySelector(`.pad[data-index="${index}"]`);
        if (pad) {
            pad.classList.remove('playing');
        }
        
        // Release the sound
        const voiceId = this.activePadVoices.get(index);
        if (voiceId && this.audioEngine) {
            // Fast release so taps don't stack into a deafening wall
            this.audioEngine.releaseNote(voiceId, 0.08);
            this.activePadVoices.delete(index);
        }
    }
    
    toggleSequencerStep(row, col) {
        this.sequencerData[row][col] = !this.sequencerData[row][col];
        this.updateSequencerVisual(row, col, this.sequencerData[row][col]);
    }
    
    updateSequencerVisual(row, col, active) {
        const step = document.querySelector(`.seq-step[data-row="${row}"][data-col="${col}"]`);
        if (step) {
            step.classList.toggle('active', active);
        }
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    async play() {
        if (!this.audioEngine.isInitialized) {
            await this.audioEngine.init();
        }
        
        this.isPlaying = true;
        document.getElementById('play-btn').classList.add('active');
        document.getElementById('play-btn').querySelector('.btn-icon').textContent = '❚❚';
        
        this.updateDisplay('▶ PLAYING');
        this.startSequencer();
    }
    
    pause() {
        this.isPlaying = false;
        document.getElementById('play-btn').classList.remove('active');
        document.getElementById('play-btn').querySelector('.btn-icon').textContent = '▶';
        
        this.updateDisplay('❚❚ PAUSED');
        this.stopSequencer();
    }
    
    stop() {
        this.isPlaying = false;
        this.isRecording = false;
        this.currentStep = 0;
        
        document.getElementById('play-btn').classList.remove('active');
        document.getElementById('play-btn').querySelector('.btn-icon').textContent = '▶';
        document.getElementById('record-btn').classList.remove('active');
        
        this.updateDisplay('■ STOPPED');
        this.stopSequencer();
        this.updateStepIndicator(-1);
    }
    
    toggleRecord() {
        this.isRecording = !this.isRecording;
        document.getElementById('record-btn').classList.toggle('active', this.isRecording);
        
        if (this.isRecording) {
            this.updateDisplay('● RECORDING');
        } else {
            this.updateDisplay('RECORD OFF');
        }
    }
    
    startSequencer() {
        const stepDuration = (60 / this.bpm) * 1000 / 4; // 16th notes
        
        this.sequencerInterval = setInterval(() => {
            this.playCurrentStep();
            this.currentStep = (this.currentStep + 1) % 16;
        }, stepDuration);
    }
    
    stopSequencer() {
        if (this.sequencerInterval) {
            clearInterval(this.sequencerInterval);
            this.sequencerInterval = null;
        }
    }
    
    restartSequencer() {
        this.stopSequencer();
        if (this.isPlaying) {
            this.startSequencer();
        }
        if (this.audioEngine) {
            this.audioEngine.setTempo(this.bpm);
        }
    }
    
    playCurrentStep() {
        // Update visual indicator
        this.updateStepIndicator(this.currentStep);
        
        // Play active steps
        for (let row = 0; row < 8; row++) {
            if (this.sequencerData[row][this.currentStep]) {
                this.audioEngine.playSequencerStep(row, 0.5);
                
                // Visual feedback
                const step = document.querySelector(`.seq-step[data-row="${row}"][data-col="${this.currentStep}"]`);
                if (step) {
                    step.classList.add('playing');
                    setTimeout(() => step.classList.remove('playing'), 100);
                }
            }
        }
    }
    
    updateStepIndicator(step) {
        document.querySelectorAll('.step-indicator').forEach((ind, i) => {
            ind.classList.toggle('current', i === step);
        });
    }
    
    clearSequencer() {
        this.sequencerData = Array(8).fill(null).map(() => Array(16).fill(false));
        document.querySelectorAll('.seq-step').forEach(step => {
            step.classList.remove('active');
        });
        this.updateDisplay('SEQUENCE CLEARED');
    }
    
    randomizeSequencer() {
        this.sequencerData = Array(8).fill(null).map(() => 
            Array(16).fill(false).map(() => Math.random() < 0.2)
        );
        
        document.querySelectorAll('.seq-step').forEach(step => {
            const row = parseInt(step.dataset.row);
            const col = parseInt(step.dataset.col);
            step.classList.toggle('active', this.sequencerData[row][col]);
        });
        
        this.updateDisplay('RANDOM PATTERN');
    }
    
    changeTempo(delta) {
        this.bpm = Math.max(40, Math.min(200, this.bpm + delta));
        document.getElementById('tempo-input').value = this.bpm;
        this.updateBpmDisplay();
        
        if (this.isPlaying) {
            this.restartSequencer();
        }
        
        this.updateDisplay(`BPM: ${this.bpm}`);
    }
    
    updateBpmDisplay() {
        document.getElementById('bpm-display').textContent = this.bpm;
    }
    
    updateDisplay(text) {
        document.getElementById('display-text').textContent = text;
    }
    
    startVisualizationLoop() {
        const visualizer = document.getElementById('visualizer');
        const ctx = visualizer.getContext('2d');
        const meterLeft = document.getElementById('meter-left');
        const meterRight = document.getElementById('meter-right');
        
        const draw = () => {
            requestAnimationFrame(draw);
            
            if (!this.audioEngine || !this.audioEngine.isInitialized) {
                // Draw idle state
                ctx.fillStyle = '#1a1a1f';
                ctx.fillRect(0, 0, visualizer.width, visualizer.height);
                
                ctx.strokeStyle = '#2d2d35';
                ctx.beginPath();
                ctx.moveTo(0, visualizer.height / 2);
                ctx.lineTo(visualizer.width, visualizer.height / 2);
                ctx.stroke();
                return;
            }
            
            const dataArray = this.audioEngine.getAnalyserData();
            if (!dataArray) return;
            
            const audioLevel = this.audioEngine.getAudioLevel();
            
            // Update Three.js scene reactivity
            if (this.threeScene) {
                this.threeScene.setAudioReactivity(audioLevel);
            }
            
            // Update meters
            const leftLevel = audioLevel * 100;
            const rightLevel = audioLevel * 100 * (0.9 + Math.random() * 0.2);
            meterLeft.style.height = `${Math.min(100, leftLevel * 1.5)}%`;
            meterRight.style.height = `${Math.min(100, rightLevel * 1.5)}%`;
            
            // Draw waveform
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(0, 0, visualizer.width, visualizer.height);
            
            const barWidth = visualizer.width / dataArray.length * 2.5;
            let x = 0;
            
            for (let i = 0; i < dataArray.length; i++) {
                const barHeight = (dataArray[i] / 255) * visualizer.height;
                
                // Gradient colors based on frequency
                const hue = 180 + (i / dataArray.length) * 60; // Cyan to magenta
                ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
                
                ctx.fillRect(x, visualizer.height - barHeight, barWidth - 1, barHeight);
                
                // Mirror effect
                ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.3)`;
                ctx.fillRect(x, 0, barWidth - 1, barHeight * 0.3);
                
                x += barWidth;
            }
            
            // Add glow effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f5ff';
        };
        
        draw();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.aetherApp = new AetherApp();
});

