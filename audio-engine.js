// ═══════════════════════════════════════════════════════════════
// ÆTHER-1 AUDIO ENGINE
// Ethereal Synthesizer & Effects + Kanye-Style Beats
// ═══════════════════════════════════════════════════════════════

class AetherAudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.analyser = null;
        this.compressor = null;
        this.limiter = null;
        
        // Effects
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        this.distortion = null;
        this.chorus = null;
        
        // Parameters
        this.params = {
            reverb: 0.5,
            delay: 0.3,
            filter: 0.7,
            shimmer: 0.6,
            warmth: 0.45,
            space: 0.75,
            attack: 0.3,
            decay: 0.4,
            sustain: 0.7,
            release: 0.8,
            master: 0.75,
            drive: 0.2
        };
        
        // Voice settings
        this.currentVoice = 'pad';
        this.currentMode = 'dream';
        
        // Scales for different modes
        this.scales = {
            dream: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36], // Pentatonic
            cosmic: [0, 2, 3, 5, 7, 8, 11, 12, 14, 15, 17, 19, 20, 23, 24, 26], // Harmonic minor
            rain: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26], // Major
            kanye: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27, 29, 31, 34, 36], // Minor pentatonic (soulful)
            gospel: [0, 2, 4, 5, 7, 9, 10, 12, 14, 16, 17, 19, 21, 22, 24, 26], // Mixolydian (gospel feel)
            dark: [0, 1, 3, 5, 6, 8, 10, 12, 13, 15, 17, 18, 20, 22, 24, 25] // Phrygian (dark/dramatic)
        };
        
        this.baseNote = 48; // C3
        
        // Active voices for polyphony
        this.activeVoices = new Map();
        
        // 808 state
        this.last808Time = 0;
        
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create master chain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.params.master;
        
        // Compressor for smooth dynamics (Kanye-style heavy compression)
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -20;
        this.compressor.knee.value = 20;
        this.compressor.ratio.value = 6;
        this.compressor.attack.value = 0.002;
        this.compressor.release.value = 0.15;

        // Hard limiter (safety against any runaway feedback / stacking)
        this.limiter = this.audioContext.createDynamicsCompressor();
        this.limiter.threshold.value = -6;
        this.limiter.knee.value = 0;
        this.limiter.ratio.value = 20;
        this.limiter.attack.value = 0.001;
        this.limiter.release.value = 0.05;
        
        // Analyser for visualizations
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        
        // Create effects
        await this.createReverb();
        this.createDelay();
        this.createFilter();
        this.createDistortion();
        this.createChorus();
        
        // Connect master chain
        this.filter.connect(this.chorus.input);
        this.chorus.output.connect(this.delay.input);
        this.delay.output.connect(this.reverb.input);
        this.reverb.output.connect(this.distortion.input);
        this.distortion.output.connect(this.compressor);
        this.compressor.connect(this.limiter);
        this.limiter.connect(this.analyser);
        this.analyser.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);
        
        this.isInitialized = true;
        console.log('ÆTHER Audio Engine initialized with Kanye mode 🔥');
    }
    
    async createReverb() {
        const convolver = this.audioContext.createConvolver();
        const wetGain = this.audioContext.createGain();
        const dryGain = this.audioContext.createGain();
        const inputGain = this.audioContext.createGain();
        const outputGain = this.audioContext.createGain();
        
        // Generate ethereal impulse response (longer, more lush)
        const duration = 5;
        const sampleRate = this.audioContext.sampleRate;
        const length = duration * sampleRate;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const t = i / sampleRate;
                // Exponential decay with shimmer
                const decay = Math.exp(-2.5 * t / duration);
                // Modulation for ethereal shimmer
                const mod = 1 + 0.15 * Math.sin(2 * Math.PI * 0.3 * t) * Math.sin(2 * Math.PI * 0.7 * t);
                channelData[i] = (Math.random() * 2 - 1) * decay * mod;
                
                // Early reflections
                if (i < sampleRate * 0.15) {
                    const earlyDecay = Math.exp(-15 * t);
                    channelData[i] += (Math.random() * 2 - 1) * earlyDecay * 0.6;
                }
            }
        }
        
        convolver.buffer = impulse;
        
        inputGain.connect(dryGain);
        inputGain.connect(convolver);
        convolver.connect(wetGain);
        dryGain.connect(outputGain);
        wetGain.connect(outputGain);
        
        wetGain.gain.value = this.params.reverb;
        dryGain.gain.value = 1 - this.params.reverb * 0.5;
        
        this.reverb = {
            input: inputGain,
            output: outputGain,
            wet: wetGain,
            dry: dryGain,
            convolver: convolver
        };
    }
    
    createDelay() {
        const inputGain = this.audioContext.createGain();
        const outputGain = this.audioContext.createGain();
        const delayNode = this.audioContext.createDelay(2);
        const delayNode2 = this.audioContext.createDelay(2); // Ping-pong
        const feedbackGain = this.audioContext.createGain();
        const wetGain = this.audioContext.createGain();
        const dryGain = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        const panLeft = this.audioContext.createStereoPanner();
        const panRight = this.audioContext.createStereoPanner();
        
        delayNode.delayTime.value = 0.375;
        delayNode2.delayTime.value = 0.25; // Offset for ping-pong
        feedbackGain.gain.value = 0.45;
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 2500;
        panLeft.pan.value = -0.7;
        panRight.pan.value = 0.7;
        
        // Ping-pong delay routing
        inputGain.connect(dryGain);
        inputGain.connect(delayNode);
        delayNode.connect(panLeft);
        delayNode.connect(delayNode2);
        delayNode2.connect(panRight);
        panLeft.connect(filterNode);
        panRight.connect(filterNode);
        filterNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        filterNode.connect(wetGain);
        dryGain.connect(outputGain);
        wetGain.connect(outputGain);
        
        wetGain.gain.value = this.params.delay;
        dryGain.gain.value = 1;
        
        this.delay = {
            input: inputGain,
            output: outputGain,
            delay: delayNode,
            delay2: delayNode2,
            feedback: feedbackGain,
            wet: wetGain,
            dry: dryGain,
            filter: filterNode
        };
    }
    
    createFilter() {
        this.filter = this.audioContext.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 2000 + this.params.filter * 18000;
        this.filter.Q.value = 1.5;
    }
    
    createDistortion() {
        // Warm saturation for that Kanye soul sample feel
        const inputGain = this.audioContext.createGain();
        const outputGain = this.audioContext.createGain();
        const waveshaper = this.audioContext.createWaveShaper();
        const preFilter = this.audioContext.createBiquadFilter();
        const postFilter = this.audioContext.createBiquadFilter();
        
        // Warm tube-style saturation curve
        const samples = 44100;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            // Soft clipping with warmth
            curve[i] = Math.tanh(x * 1.5) * 0.9 + x * 0.1;
        }
        waveshaper.curve = curve;
        waveshaper.oversample = '2x';
        
        preFilter.type = 'lowpass';
        preFilter.frequency.value = 8000;
        postFilter.type = 'highpass';
        postFilter.frequency.value = 60;
        
        inputGain.connect(preFilter);
        preFilter.connect(waveshaper);
        waveshaper.connect(postFilter);
        postFilter.connect(outputGain);
        
        this.distortion = {
            input: inputGain,
            output: outputGain,
            waveshaper: waveshaper
        };
    }
    
    createChorus() {
        // Ethereal chorus/ensemble effect
        const inputGain = this.audioContext.createGain();
        const outputGain = this.audioContext.createGain();
        const dryGain = this.audioContext.createGain();
        const wetGain = this.audioContext.createGain();
        
        const delays = [];
        const lfos = [];
        const lfoGains = [];
        
        // Create 4 chorus voices
        for (let i = 0; i < 4; i++) {
            const delay = this.audioContext.createDelay(0.1);
            delay.delayTime.value = 0.02 + i * 0.005;
            
            const lfo = this.audioContext.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.5 + i * 0.3;
            
            const lfoGain = this.audioContext.createGain();
            lfoGain.gain.value = 0.003;
            
            const pan = this.audioContext.createStereoPanner();
            pan.pan.value = (i - 1.5) / 2;
            
            lfo.connect(lfoGain);
            lfoGain.connect(delay.delayTime);
            inputGain.connect(delay);
            delay.connect(pan);
            pan.connect(wetGain);
            
            lfo.start();
            
            delays.push(delay);
            lfos.push(lfo);
            lfoGains.push(lfoGain);
        }
        
        inputGain.connect(dryGain);
        dryGain.connect(outputGain);
        wetGain.connect(outputGain);
        
        dryGain.gain.value = 0.7;
        wetGain.gain.value = 0.4;
        
        this.chorus = {
            input: inputGain,
            output: outputGain,
            delays: delays,
            lfos: lfos
        };
    }
    
    // ═══════════════════════════════════════════════════════════════
    // VOICE GENERATORS
    // ═══════════════════════════════════════════════════════════════
    
    createPadVoice(frequency) {
        const voices = [];
        const detuneAmounts = [-12, -5, 0, 5, 12];
        
        detuneAmounts.forEach(detune => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = frequency;
            osc.detune.value = detune + (Math.random() - 0.5) * 5;
            voices.push(osc);
        });
        
        // Sub oscillator
        const subOsc = this.audioContext.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.value = frequency / 2;
        voices.push(subOsc);
        
        return voices;
    }
    
    createBellVoice(frequency) {
        const voices = [];
        const partials = [1, 2, 2.4, 3, 4.2, 5.4, 6.8];
        
        partials.forEach((partial) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = frequency * partial;
            voices.push(osc);
        });
        
        return voices;
    }
    
    createStringVoice(frequency) {
        const voices = [];
        const waveforms = ['sawtooth', 'sawtooth', 'triangle'];
        const detuneAmounts = [-7, 0, 7];
        
        waveforms.forEach((type, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = type;
            osc.frequency.value = frequency;
            osc.detune.value = detuneAmounts[i];
            voices.push(osc);
        });
        
        return voices;
    }
    
    createChoirVoice(frequency) {
        const voices = [];
        
        for (let i = 0; i < 5; i++) {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = frequency * (1 + i * 0.008);
            osc.detune.value = (Math.random() - 0.5) * 25;
            voices.push(osc);
        }
        
        return voices;
    }
    
    // NEW VOICES - Kanye Style
    
    createSoulVoice(frequency) {
        // Warm, soulful keys like old Kanye samples
        const voices = [];
        
        // Rhodes-style electric piano
        const fundamental = this.audioContext.createOscillator();
        fundamental.type = 'sine';
        fundamental.frequency.value = frequency;
        voices.push(fundamental);
        
        // Add harmonics for warmth
        [2, 3, 4, 5].forEach(harmonic => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = frequency * harmonic;
            osc.detune.value = (Math.random() - 0.5) * 10;
            voices.push(osc);
        });
        
        // Slight detuned layer for vintage feel
        const detunedOsc = this.audioContext.createOscillator();
        detunedOsc.type = 'triangle';
        detunedOsc.frequency.value = frequency;
        detunedOsc.detune.value = 8;
        voices.push(detunedOsc);
        
        return voices;
    }
    
    createGospelVoice(frequency) {
        // Gospel organ style
        const voices = [];
        const drawbars = [1, 2, 3, 4, 5, 6, 8]; // Organ drawbar harmonics
        
        drawbars.forEach((harmonic, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = frequency * harmonic;
            voices.push(osc);
        });
        
        return voices;
    }
    
    createVoxVoice(frequency) {
        // Ethereal vocal-like synth
        const voices = [];
        
        // Formant frequencies for "ah" vowel
        const formants = [730, 1090, 2440];
        
        formants.forEach(formantFreq => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            // Modulate around the formant
            osc.frequency.value = frequency * (formantFreq / 440);
            voices.push(osc);
        });
        
        // Base tone
        const base = this.audioContext.createOscillator();
        base.type = 'sawtooth';
        base.frequency.value = frequency;
        voices.push(base);
        
        return voices;
    }
    
    createGlassVoice(frequency) {
        // Crystal/glass-like ethereal sound
        const voices = [];
        const partials = [1, 2.76, 5.4, 8.93, 13.34];
        
        partials.forEach((partial, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = frequency * partial;
            voices.push(osc);
        });
        
        return voices;
    }
    
    createDreamVoice(frequency) {
        // Super ethereal, floaty pad
        const voices = [];
        
        // Multiple detuned sine waves
        for (let i = 0; i < 8; i++) {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = frequency * (1 + (i - 4) * 0.002);
            osc.detune.value = (Math.random() - 0.5) * 30;
            voices.push(osc);
        }
        
        // Sub layer
        const sub = this.audioContext.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = frequency / 2;
        voices.push(sub);
        
        // Octave up shimmer
        const shimmer = this.audioContext.createOscillator();
        shimmer.type = 'sine';
        shimmer.frequency.value = frequency * 2;
        voices.push(shimmer);
        
        return voices;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 808 & DRUMS - KANYE STYLE
    // ═══════════════════════════════════════════════════════════════
    
    play808Kick(velocity = 0.9) {
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        
        // Prevent double triggers
        if (now - this.last808Time < 0.05) return;
        this.last808Time = now;
        
        // Main 808 oscillator
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
        
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 1;
        
        gain.gain.setValueAtTime(velocity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        // Click transient
        const click = this.audioContext.createOscillator();
        const clickGain = this.audioContext.createGain();
        click.type = 'square';
        click.frequency.value = 1000;
        clickGain.gain.setValueAtTime(velocity * 0.3, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);
        
        click.connect(clickGain);
        clickGain.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 1);
        click.start(now);
        click.stop(now + 0.03);
    }
    
    play808Snare(velocity = 0.7) {
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        
        // Body
        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.1);
        
        oscGain.gain.setValueAtTime(velocity * 0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        // Noise
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 3000;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(velocity * 0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(oscGain);
        oscGain.connect(this.compressor);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 0.3);
        noise.start(now);
    }
    
    play808HiHat(velocity = 0.5, open = false) {
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        const duration = open ? 0.3 : 0.08;
        
        // Metallic noise
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 10000;
        filter.Q.value = 1;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(velocity * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);
        
        noise.start(now);
    }
    
    playClap(velocity = 0.6) {
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        
        // Multiple noise bursts for clap texture
        for (let i = 0; i < 4; i++) {
            const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let j = 0; j < noiseData.length; j++) {
                noiseData[j] = Math.random() * 2 - 1;
            }
            
            const noise = this.audioContext.createBufferSource();
            noise.buffer = noiseBuffer;
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 2500;
            filter.Q.value = 2;
            
            const gain = this.audioContext.createGain();
            const startTime = now + i * 0.01;
            gain.gain.setValueAtTime(velocity * 0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.reverb.input);
            
            noise.start(startTime);
        }
    }
    
    playRim(velocity = 0.5) {
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.02);
        
        gain.gain.setValueAtTime(velocity * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        osc.connect(gain);
        gain.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }
    
    playPerc(velocity = 0.4) {
        // Ethereal percussion - metallic ping
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        const frequencies = [800, 1200, 1600, 2400];
        
        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq + Math.random() * 50;
            
            gain.gain.setValueAtTime(velocity * 0.15 / (i + 1), now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + i * 0.1);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            osc.start(now);
            osc.stop(now + 0.5);
        });
    }
    
    playShimmer(velocity = 0.3) {
        // High ethereal shimmer
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        
        for (let i = 0; i < 6; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = 2000 + i * 500 + Math.random() * 200;
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(velocity * 0.1, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            osc.start(now);
            osc.stop(now + 2);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // ETHEREAL SOUND EFFECTS
    // ═══════════════════════════════════════════════════════════════
    
    playRiser(velocity = 0.5) {
        // Cinematic riser/sweep up
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(2000, now + 2);
        osc2.frequency.setValueAtTime(82, now);
        osc2.frequency.exponentialRampToValueAtTime(2010, now + 2);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(8000, now + 2);
        filter.Q.value = 5;
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.4, now + 0.5);
        gain.gain.linearRampToValueAtTime(velocity * 0.6, now + 1.8);
        gain.gain.linearRampToValueAtTime(0, now + 2.2);
        
        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 2.5);
        osc2.stop(now + 2.5);
    }
    
    playDownlifter(velocity = 0.5) {
        // Cinematic downlifter/sweep down
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 2);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(8000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 2);
        
        gain.gain.setValueAtTime(velocity * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        osc.start(now);
        osc.stop(now + 3);
    }
    
    playAtmosphere(velocity = 0.4) {
        // Lush atmospheric pad swell
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const frequencies = [130.81, 164.81, 196, 261.63]; // C major chord
        
        frequencies.forEach((freq, i) => {
            for (let j = 0; j < 3; j++) {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq * (1 + (j - 1) * 0.003);
                osc.detune.value = (Math.random() - 0.5) * 20;
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(velocity * 0.15, now + 1);
                gain.gain.linearRampToValueAtTime(velocity * 0.1, now + 3);
                gain.gain.linearRampToValueAtTime(0, now + 5);
                
                osc.connect(gain);
                gain.connect(this.reverb.input);
                
                osc.start(now);
                osc.stop(now + 5.5);
            }
        });
    }
    
    playSparkle(velocity = 0.4) {
        // High frequency sparkle/twinkle
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        for (let i = 0; i < 12; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            const startTime = now + i * 0.05 + Math.random() * 0.03;
            osc.type = 'sine';
            osc.frequency.value = 3000 + Math.random() * 4000;
            
            gain.gain.setValueAtTime(velocity * 0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3 + Math.random() * 0.4);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            osc.start(startTime);
            osc.stop(startTime + 1);
        }
    }
    
    playGhostVoice(velocity = 0.4) {
        // Ghostly vocal-like effect
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const formants = [700, 1200, 2500]; // "ooh" vowel
        
        formants.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const vibrato = this.audioContext.createOscillator();
            const vibratoGain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            vibrato.type = 'sine';
            vibrato.frequency.value = 5 + Math.random() * 2;
            vibratoGain.gain.value = freq * 0.02;
            
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(velocity * 0.12 / (i + 1), now + 0.3);
            gain.gain.linearRampToValueAtTime(velocity * 0.08 / (i + 1), now + 1.5);
            gain.gain.linearRampToValueAtTime(0, now + 3);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            vibrato.start(now);
            osc.start(now);
            vibrato.stop(now + 3.5);
            osc.stop(now + 3.5);
        });
    }
    
    playWindChime(velocity = 0.4) {
        // Ethereal wind chime
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C pentatonic high
        
        notes.forEach((freq, i) => {
            const delay = Math.random() * 0.3;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(velocity * 0.2, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 2);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            osc.start(now + delay);
            osc.stop(now + delay + 2.5);
        });
    }
    
    playDrone(velocity = 0.3) {
        // Deep meditative drone
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const baseFreq = 55; // A1
        
        for (let i = 0; i < 5; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            
            osc.type = i === 0 ? 'sine' : 'triangle';
            osc.frequency.value = baseFreq * (i + 1);
            
            lfo.type = 'sine';
            lfo.frequency.value = 0.1 + Math.random() * 0.2;
            lfoGain.gain.value = baseFreq * 0.01;
            
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(velocity * 0.15 / (i + 1), now + 1);
            gain.gain.linearRampToValueAtTime(velocity * 0.1 / (i + 1), now + 4);
            gain.gain.linearRampToValueAtTime(0, now + 6);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            lfo.start(now);
            osc.start(now);
            lfo.stop(now + 6.5);
            osc.stop(now + 6.5);
        }
    }
    
    playReverse(velocity = 0.5) {
        // Reverse cymbal/swell effect
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                const t = i / bufferSize;
                // Reverse envelope (quiet to loud)
                const env = Math.pow(t, 3);
                data[i] = (Math.random() * 2 - 1) * env;
            }
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = velocity * 0.4;
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        source.start(now);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // KANYE-STYLE SOUND EFFECTS
    // ═══════════════════════════════════════════════════════════════
    
    play808Sub(velocity = 0.9) {
        // Deep 808 sub bass hit
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        
        gain.gain.setValueAtTime(velocity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        osc.connect(gain);
        gain.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 2);
    }
    
    play808Slide(velocity = 0.8) {
        // 808 with pitch slide (Travis Scott style)
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
        
        gain.gain.setValueAtTime(velocity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        
        osc.connect(gain);
        gain.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 1.5);
    }
    
    playSoulSample(velocity = 0.6) {
        // Chopped soul sample style stab
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Soul chord (Cmaj7)
        const frequencies = [261.63, 329.63, 392, 493.88];
        
        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'triangle';
            osc.frequency.value = freq;
            osc.detune.value = (Math.random() - 0.5) * 15;
            
            // Vinyl warmth - slight pitch wobble
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.type = 'sine';
            lfo.frequency.value = 0.5;
            lfoGain.gain.value = 3;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.detune);
            
            gain.gain.setValueAtTime(velocity * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            
            osc.connect(gain);
            gain.connect(this.distortion.input);
            
            lfo.start(now);
            osc.start(now);
            lfo.stop(now + 0.5);
            osc.stop(now + 0.5);
        });
    }
    
    playVinylCrackle(velocity = 0.3) {
        // Vinyl crackle/noise
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const bufferSize = this.audioContext.sampleRate * 3;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                // Sparse crackle
                if (Math.random() < 0.001) {
                    data[i] = (Math.random() * 2 - 1) * 0.5;
                } else if (Math.random() < 0.01) {
                    data[i] = (Math.random() * 2 - 1) * 0.1;
                } else {
                    data[i] = (Math.random() * 2 - 1) * 0.02;
                }
            }
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 0.5;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = velocity;
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        source.start(now);
    }
    
    playChop(velocity = 0.6) {
        // Vocal chop style effect
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const formants = [800, 1150, 2800]; // "ah" vowel
        
        formants.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.value = 220;
            
            const formantFilter = this.audioContext.createBiquadFilter();
            formantFilter.type = 'bandpass';
            formantFilter.frequency.value = freq;
            formantFilter.Q.value = 15;
            
            gain.gain.setValueAtTime(velocity * 0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            osc.connect(formantFilter);
            formantFilter.connect(gain);
            gain.connect(this.reverb.input);
            
            osc.start(now);
            osc.stop(now + 0.2);
        });
    }
    
    playBrass(velocity = 0.5) {
        // Brass stab (Kanye orchestral style)
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const notes = [146.83, 185, 220]; // D minor chord
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sawtooth';
            osc2.type = 'square';
            osc.frequency.value = freq;
            osc2.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(velocity * 0.25, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(this.filter);
            
            osc.start(now);
            osc2.start(now);
            osc.stop(now + 0.6);
            osc2.stop(now + 0.6);
        });
    }
    
    playOrchHit(velocity = 0.7) {
        // Orchestral hit
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Multiple frequencies for thick sound
        const freqs = [65.41, 130.81, 196, 261.63, 329.63];
        
        freqs.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = i < 2 ? 'sawtooth' : 'triangle';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(velocity * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            osc.start(now);
            osc.stop(now + 1);
        });
        
        // Add noise burst
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(velocity * 0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        noise.connect(noiseGain);
        noiseGain.connect(this.compressor);
        noise.start(now);
    }
    
    playPianoChop(velocity = 0.6) {
        // Chopped piano chord
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const chord = [261.63, 311.13, 392]; // Cm chord
        
        chord.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            // Bell-like harmonics
            const osc2 = this.audioContext.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.value = freq * 2;
            
            gain.gain.setValueAtTime(velocity * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(velocity * 0.05, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            
            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(this.reverb.input);
            
            osc.start(now);
            osc2.start(now);
            osc.stop(now + 1);
            osc2.stop(now + 1);
        });
    }
    
    // ═══════════════════════════════════════════════════════════════
    // AMBIENT SOUND EFFECTS
    // ═══════════════════════════════════════════════════════════════
    
    playRain(velocity = 0.3) {
        // Ambient rain texture
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const bufferSize = this.audioContext.sampleRate * 4;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                // Pink noise approximation
                let white = Math.random() * 2 - 1;
                data[i] = white * 0.5;
                
                // Add random droplets
                if (Math.random() < 0.0005) {
                    data[i] += (Math.random() - 0.5) * 0.8;
                }
            }
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        filter.Q.value = 0.3;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity, now + 0.5);
        gain.gain.linearRampToValueAtTime(velocity * 0.8, now + 3);
        gain.gain.linearRampToValueAtTime(0, now + 4);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        source.start(now);
    }
    
    playThunder(velocity = 0.6) {
        // Distant thunder rumble
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const bufferSize = this.audioContext.sampleRate * 3;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                const t = i / this.audioContext.sampleRate;
                const env = Math.exp(-t * 1.5) * Math.sin(t * 3);
                data[i] = (Math.random() * 2 - 1) * env;
            }
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = velocity;
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        source.start(now);
    }
    
    playWind(velocity = 0.25) {
        // Ethereal wind
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const bufferSize = this.audioContext.sampleRate * 5;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                const t = i / this.audioContext.sampleRate;
                const mod = Math.sin(t * 0.5) * 0.5 + 0.5;
                data[i] = (Math.random() * 2 - 1) * mod;
            }
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 0.5;
        
        // Modulate filter for wind movement
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.2;
        lfoGain.gain.value = 400;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity, now + 1);
        gain.gain.linearRampToValueAtTime(velocity * 0.7, now + 4);
        gain.gain.linearRampToValueAtTime(0, now + 5);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        lfo.start(now);
        source.start(now);
        lfo.stop(now + 5.5);
    }
    
    playBirds(velocity = 0.3) {
        // Ambient bird chirps
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        for (let i = 0; i < 5; i++) {
            const delay = Math.random() * 2;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            const baseFreq = 2000 + Math.random() * 2000;
            osc.frequency.setValueAtTime(baseFreq, now + delay);
            osc.frequency.linearRampToValueAtTime(baseFreq * 1.2, now + delay + 0.05);
            osc.frequency.linearRampToValueAtTime(baseFreq * 0.9, now + delay + 0.1);
            
            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime(velocity * 0.15, now + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            osc.start(now + delay);
            osc.stop(now + delay + 0.2);
        }
    }
    
    playOcean(velocity = 0.3) {
        // Ocean waves
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const bufferSize = this.audioContext.sampleRate * 6;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                const t = i / this.audioContext.sampleRate;
                // Wave-like envelope
                const wave = Math.sin(t * 0.3) * 0.5 + 0.5;
                const wave2 = Math.sin(t * 0.5 + 1) * 0.3 + 0.5;
                data[i] = (Math.random() * 2 - 1) * wave * wave2;
            }
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity, now + 1);
        gain.gain.linearRampToValueAtTime(velocity * 0.8, now + 5);
        gain.gain.linearRampToValueAtTime(0, now + 6);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        source.start(now);
    }
    
    playHeartbeat(velocity = 0.5) {
        // Slow heartbeat
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        for (let beat = 0; beat < 2; beat++) {
            const beatTime = now + beat * 0.25;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, beatTime);
            osc.frequency.exponentialRampToValueAtTime(30, beatTime + 0.15);
            
            gain.gain.setValueAtTime(velocity * (beat === 0 ? 0.6 : 0.4), beatTime);
            gain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.2);
            
            osc.connect(gain);
            gain.connect(this.compressor);
            
            osc.start(beatTime);
            osc.stop(beatTime + 0.3);
        }
    }
    
    playBreath(velocity = 0.3) {
        // Ethereal breath sound
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const bufferSize = this.audioContext.sampleRate * 3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 2;
        
        // Breath shape - filter sweep
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.linearRampToValueAtTime(1500, now + 1);
        filter.frequency.linearRampToValueAtTime(800, now + 2);
        filter.frequency.linearRampToValueAtTime(300, now + 3);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity, now + 0.5);
        gain.gain.linearRampToValueAtTime(velocity * 0.6, now + 1.5);
        gain.gain.linearRampToValueAtTime(0, now + 3);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        source.start(now);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 🕊 ETHEREAL VOCALS / CHOIRS (Donda + 808s vibe)
    // ═══════════════════════════════════════════════════════════════
    
    playHeavenlyChoir(velocity = 0.5) {
        // Angelic choir "aah" - Donda style
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Chord: C major with extensions
        const notes = [261.63, 329.63, 392, 523.25, 659.25];
        
        notes.forEach((freq, noteIdx) => {
            // Multiple voices per note for thickness
            for (let v = 0; v < 4; v++) {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                const vibrato = this.audioContext.createOscillator();
                const vibratoGain = this.audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq * (1 + (v - 1.5) * 0.002);
                osc.detune.value = (Math.random() - 0.5) * 15;
                
                // Human-like vibrato
                vibrato.type = 'sine';
                vibrato.frequency.value = 5 + Math.random();
                vibratoGain.gain.value = freq * 0.008;
                vibrato.connect(vibratoGain);
                vibratoGain.connect(osc.frequency);
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(velocity * 0.08, now + 0.4);
                gain.gain.linearRampToValueAtTime(velocity * 0.06, now + 2);
                gain.gain.linearRampToValueAtTime(0, now + 4);
                
                osc.connect(gain);
                gain.connect(this.reverb.input);
                
                vibrato.start(now);
                osc.start(now);
                vibrato.stop(now + 4.5);
                osc.stop(now + 4.5);
            }
        });
    }
    
    playGospelChoir(velocity = 0.5) {
        // Gospel choir swell
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Gospel chord progression feel
        const chordNotes = [196, 246.94, 293.66, 392, 493.88]; // G major 7
        
        chordNotes.forEach((freq, i) => {
            for (let v = 0; v < 3; v++) {
                const osc = this.audioContext.createOscillator();
                const osc2 = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'sine';
                osc2.type = 'triangle';
                osc.frequency.value = freq * (1 + v * 0.003);
                osc2.frequency.value = freq * 2 * (1 + v * 0.002);
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(velocity * 0.1, now + 0.3);
                gain.gain.setValueAtTime(velocity * 0.1, now + 0.5);
                gain.gain.linearRampToValueAtTime(velocity * 0.15, now + 1);
                gain.gain.linearRampToValueAtTime(0, now + 3);
                
                osc.connect(gain);
                osc2.connect(gain);
                gain.connect(this.reverb.input);
                
                osc.start(now);
                osc2.start(now);
                osc.stop(now + 3.5);
                osc2.stop(now + 3.5);
            }
        });
    }
    
    playAngelVoice(velocity = 0.4) {
        // Single ethereal voice
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const formants = [700, 1100, 2600]; // "ah" vowel
        const baseFreq = 440;
        
        // Carrier
        const carrier = this.audioContext.createOscillator();
        carrier.type = 'sawtooth';
        carrier.frequency.value = baseFreq;
        
        formants.forEach((formantFreq, i) => {
            const filter = this.audioContext.createBiquadFilter();
            const gain = this.audioContext.createGain();
            
            filter.type = 'bandpass';
            filter.frequency.value = formantFreq;
            filter.Q.value = 12;
            
            // Vibrato
            const vib = this.audioContext.createOscillator();
            const vibGain = this.audioContext.createGain();
            vib.frequency.value = 5.5;
            vibGain.gain.value = formantFreq * 0.02;
            vib.connect(vibGain);
            vibGain.connect(filter.frequency);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(velocity * 0.15 / (i + 1), now + 0.2);
            gain.gain.linearRampToValueAtTime(velocity * 0.1 / (i + 1), now + 2);
            gain.gain.linearRampToValueAtTime(0, now + 3.5);
            
            carrier.connect(filter);
            filter.connect(gain);
            gain.connect(this.reverb.input);
            
            vib.start(now);
            vib.stop(now + 4);
        });
        
        carrier.start(now);
        carrier.stop(now + 4);
    }
    
    playChoirSwell(velocity = 0.5) {
        // Building choir swell
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const notes = [130.81, 164.81, 196, 261.63, 329.63, 392];
        
        notes.forEach((freq, i) => {
            const delay = i * 0.15;
            
            for (let v = 0; v < 3; v++) {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq * (1 + (v - 1) * 0.004);
                osc.detune.value = Math.random() * 20 - 10;
                
                gain.gain.setValueAtTime(0, now + delay);
                gain.gain.linearRampToValueAtTime(velocity * 0.08, now + delay + 0.5);
                gain.gain.linearRampToValueAtTime(velocity * 0.12, now + delay + 2);
                gain.gain.linearRampToValueAtTime(0, now + delay + 4);
                
                osc.connect(gain);
                gain.connect(this.reverb.input);
                
                osc.start(now + delay);
                osc.stop(now + delay + 4.5);
            }
        });
    }
    
    playHallelujah(velocity = 0.5) {
        // "Hallelujah" style vocal sweep
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Rising then falling
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(440, now + 1);
        osc.frequency.linearRampToValueAtTime(330, now + 2);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.linearRampToValueAtTime(2000, now + 1);
        filter.frequency.linearRampToValueAtTime(800, now + 2);
        filter.Q.value = 2;
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.3, now + 0.5);
        gain.gain.linearRampToValueAtTime(velocity * 0.4, now + 1);
        gain.gain.linearRampToValueAtTime(0, now + 3);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        osc.start(now);
        osc.stop(now + 3.5);
    }
    
    playDondaVocal(velocity = 0.4) {
        // Donda-style processed vocal texture
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Multiple detuned voices
        for (let i = 0; i < 6; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.value = 220 * (1 + i * 0.5) * (1 + (Math.random() - 0.5) * 0.02);
            
            filter.type = 'bandpass';
            filter.frequency.value = 800 + i * 200;
            filter.Q.value = 5;
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(velocity * 0.08, now + 0.1);
            gain.gain.linearRampToValueAtTime(velocity * 0.05, now + 1.5);
            gain.gain.linearRampToValueAtTime(0, now + 2.5);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.reverb.input);
            
            osc.start(now);
            osc.stop(now + 3);
        }
    }
    
    playSpiritualHum(velocity = 0.35) {
        // Deep spiritual humming
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const baseFreq = 110; // A2
        
        for (let h = 1; h <= 6; h++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = baseFreq * h;
            
            // Slow wobble
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.frequency.value = 0.3;
            lfoGain.gain.value = baseFreq * h * 0.005;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            
            const level = velocity * 0.15 / h;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(level, now + 1);
            gain.gain.linearRampToValueAtTime(level * 0.8, now + 4);
            gain.gain.linearRampToValueAtTime(0, now + 6);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            lfo.start(now);
            osc.start(now);
            lfo.stop(now + 6.5);
            osc.stop(now + 6.5);
        }
    }
    
    playMonkChant(velocity = 0.4) {
        // Monk-style chanting
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const notes = [130.81, 146.83, 130.81]; // C-D-C pattern
        const durations = [1, 0.5, 1.5];
        let time = now;
        
        notes.forEach((freq, i) => {
            for (let v = 0; v < 4; v++) {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq * (1 + (v - 1.5) * 0.003);
                
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(velocity * 0.1, time + 0.1);
                gain.gain.setValueAtTime(velocity * 0.1, time + durations[i] - 0.1);
                gain.gain.linearRampToValueAtTime(0, time + durations[i]);
                
                osc.connect(gain);
                gain.connect(this.reverb.input);
                
                osc.start(time);
                osc.stop(time + durations[i] + 0.1);
            }
            time += durations[i];
        });
    }
    
    // ═══════════════════════════════════════════════════════════════
    // ⚡ ADRENALINE FX (Yeezus energy)
    // ═══════════════════════════════════════════════════════════════
    
    playYeezusScream(velocity = 0.6) {
        // Distorted scream/yell
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const distortion = this.audioContext.createWaveShaper();
        
        // Harsh distortion curve
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i / 128) - 1;
            curve[i] = Math.tanh(x * 5);
        }
        distortion.curve = curve;
        
        osc.type = 'sawtooth';
        osc2.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.1);
        osc.frequency.linearRampToValueAtTime(400, now + 0.5);
        osc2.frequency.value = 205;
        
        gain.gain.setValueAtTime(velocity * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc.connect(distortion);
        osc2.connect(distortion);
        distortion.connect(gain);
        gain.connect(this.compressor);
        
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 1);
        osc2.stop(now + 1);
    }
    
    playIndustrialHit(velocity = 0.7) {
        // Industrial metal hit
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Noise burst
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 5;
        
        const distortion = this.audioContext.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            curve[i] = Math.tanh(((i / 128) - 1) * 8);
        }
        distortion.curve = curve;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(velocity * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        noise.connect(filter);
        filter.connect(distortion);
        distortion.connect(gain);
        gain.connect(this.compressor);
        
        noise.start(now);
    }
    
    playGlitchBurst(velocity = 0.5) {
        // Digital glitch burst
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        for (let i = 0; i < 8; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            const startTime = now + i * 0.03;
            osc.type = 'square';
            osc.frequency.value = 100 + Math.random() * 2000;
            
            gain.gain.setValueAtTime(velocity * 0.3, startTime);
            gain.gain.setValueAtTime(0, startTime + 0.02);
            
            osc.connect(gain);
            gain.connect(this.compressor);
            
            osc.start(startTime);
            osc.stop(startTime + 0.03);
        }
    }
    
    playSiren(velocity = 0.5) {
        // Police siren sweep
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.5);
        osc.frequency.linearRampToValueAtTime(600, now + 1);
        osc.frequency.linearRampToValueAtTime(1200, now + 1.5);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.3, now + 0.1);
        gain.gain.setValueAtTime(velocity * 0.3, now + 1.4);
        gain.gain.linearRampToValueAtTime(0, now + 1.5);
        
        osc.connect(gain);
        gain.connect(this.filter);
        
        osc.start(now);
        osc.stop(now + 2);
    }
    
    playAlarm(velocity = 0.5) {
        // Harsh alarm
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        for (let i = 0; i < 4; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            const startTime = now + i * 0.2;
            osc.type = 'square';
            osc.frequency.value = 880;
            
            gain.gain.setValueAtTime(velocity * 0.3, startTime);
            gain.gain.setValueAtTime(0, startTime + 0.1);
            
            osc.connect(gain);
            gain.connect(this.compressor);
            
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        }
    }
    
    playLaser(velocity = 0.5) {
        // Sci-fi laser
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(3000, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        
        gain.gain.setValueAtTime(velocity * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(gain);
        gain.connect(this.reverb.input);
        
        osc.start(now);
        osc.stop(now + 0.5);
    }
    
    playPowerUp(velocity = 0.5) {
        // Power up sound
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(2000, now + 0.5);
        
        gain.gain.setValueAtTime(velocity * 0.4, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.5, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        osc.connect(gain);
        gain.connect(this.reverb.input);
        
        osc.start(now);
        osc.stop(now + 0.7);
    }
    
    playDistortedBass(velocity = 0.7) {
        // Heavy distorted bass
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const distortion = this.audioContext.createWaveShaper();
        const gain = this.audioContext.createGain();
        
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            curve[i] = Math.tanh(((i / 128) - 1) * 10);
        }
        distortion.curve = curve;
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55, now);
        
        gain.gain.setValueAtTime(velocity * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc.connect(distortion);
        distortion.connect(gain);
        gain.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 1);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 🌌 ATMOSPHERIC TEXTURES (Cinematic space)
    // ═══════════════════════════════════════════════════════════════
    
    playSpaceAmbience(velocity = 0.3) {
        // Deep space atmosphere
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Multiple layered drones
        const freqs = [55, 82.5, 110, 165];
        
        freqs.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            lfo.type = 'sine';
            lfo.frequency.value = 0.05 + i * 0.02;
            lfoGain.gain.value = freq * 0.02;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(velocity * 0.1, now + 2);
            gain.gain.linearRampToValueAtTime(velocity * 0.08, now + 5);
            gain.gain.linearRampToValueAtTime(0, now + 8);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            lfo.start(now);
            osc.start(now);
            lfo.stop(now + 8.5);
            osc.stop(now + 8.5);
        });
    }
    
    playNebula(velocity = 0.35) {
        // Swirling nebula texture
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const bufferSize = this.audioContext.sampleRate * 6;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                const t = i / this.audioContext.sampleRate;
                const swirl = Math.sin(t * 0.5) * Math.cos(t * 0.3);
                data[i] = (Math.random() * 2 - 1) * 0.3 * (swirl * 0.5 + 0.5);
            }
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 500;
        filter.Q.value = 0.5;
        
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.frequency.value = 0.1;
        lfoGain.gain.value = 300;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity, now + 1);
        gain.gain.linearRampToValueAtTime(velocity * 0.7, now + 5);
        gain.gain.linearRampToValueAtTime(0, now + 6);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        lfo.start(now);
        source.start(now);
        lfo.stop(now + 6.5);
    }
    
    playWormhole(velocity = 0.4) {
        // Wormhole whoosh
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, now);
        osc.frequency.exponentialRampToValueAtTime(2000, now + 1);
        osc.frequency.exponentialRampToValueAtTime(50, now + 2);
        osc2.frequency.setValueAtTime(52, now);
        osc2.frequency.exponentialRampToValueAtTime(2010, now + 1);
        osc2.frequency.exponentialRampToValueAtTime(52, now + 2);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, now);
        filter.frequency.exponentialRampToValueAtTime(8000, now + 1);
        filter.frequency.exponentialRampToValueAtTime(100, now + 2);
        filter.Q.value = 5;
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.5, now + 0.5);
        gain.gain.linearRampToValueAtTime(velocity * 0.6, now + 1);
        gain.gain.linearRampToValueAtTime(0, now + 2.2);
        
        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 2.5);
        osc2.stop(now + 2.5);
    }
    
    playCosmicPad(velocity = 0.35) {
        // Evolving cosmic pad
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const notes = [65.41, 98.00, 130.81, 196.00]; // C2, G2, C3, G3
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc2.type = 'triangle';
            osc.frequency.value = freq;
            osc2.frequency.value = freq * 1.002;
            
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.frequency.value = 0.1 + i * 0.05;
            lfoGain.gain.value = freq * 0.01;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(velocity * 0.12, now + 1);
            gain.gain.linearRampToValueAtTime(velocity * 0.08, now + 4);
            gain.gain.linearRampToValueAtTime(0, now + 6);
            
            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(this.reverb.input);
            
            lfo.start(now);
            osc.start(now);
            osc2.start(now);
            lfo.stop(now + 6.5);
            osc.stop(now + 6.5);
            osc2.stop(now + 6.5);
        });
    }
    
    playStarDust(velocity = 0.3) {
        // Twinkling star dust
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        for (let i = 0; i < 20; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            const startTime = now + Math.random() * 3;
            osc.type = 'sine';
            osc.frequency.value = 1000 + Math.random() * 4000;
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(velocity * 0.1, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5 + Math.random() * 0.5);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            osc.start(startTime);
            osc.stop(startTime + 1.5);
        }
    }
    
    playBlackHole(velocity = 0.4) {
        // Ominous black hole drone
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(30, now);
        osc.frequency.linearRampToValueAtTime(20, now + 4);
        
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 10;
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.5, now + 1);
        gain.gain.linearRampToValueAtTime(velocity * 0.6, now + 3);
        gain.gain.linearRampToValueAtTime(0, now + 5);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 5.5);
    }
    
    playAurora(velocity = 0.3) {
        // Northern lights shimmer
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const notes = [261.63, 329.63, 392, 493.88, 587.33];
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.frequency.value = 2 + Math.random() * 3;
            lfoGain.gain.value = 0.3;
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);
            
            gain.gain.setValueAtTime(velocity * 0.08, now + i * 0.3);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            lfo.start(now);
            osc.start(now + i * 0.3);
            
            setTimeout(() => {
                gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
                setTimeout(() => {
                    osc.stop();
                    lfo.stop();
                }, 1100);
            }, 3000 + i * 300);
        });
    }
    
    playTimeWarp(velocity = 0.4) {
        // Time warp effect
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        
        // Doppler-like frequency shift
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 1);
        osc.frequency.exponentialRampToValueAtTime(400, now + 1.5);
        
        gain.gain.setValueAtTime(velocity * 0.4, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.2, now + 0.75);
        gain.gain.linearRampToValueAtTime(velocity * 0.4, now + 1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        
        osc.connect(gain);
        gain.connect(this.reverb.input);
        
        osc.start(now);
        osc.stop(now + 2);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 🔥 IMPACTS & HITS (For drops)
    // ═══════════════════════════════════════════════════════════════
    
    playBigImpact(velocity = 0.8) {
        // Massive cinematic impact
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Sub boom
        const subOsc = this.audioContext.createOscillator();
        const subGain = this.audioContext.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(80, now);
        subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
        subGain.gain.setValueAtTime(velocity, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        subOsc.connect(subGain);
        subGain.connect(this.compressor);
        subOsc.start(now);
        subOsc.stop(now + 2);
        
        // Noise layer
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = buffer.getChannelData(ch);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
            }
        }
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.value = velocity * 0.5;
        noise.connect(noiseGain);
        noiseGain.connect(this.reverb.input);
        noise.start(now);
    }
    
    playDropHit(velocity = 0.7) {
        // EDM drop hit
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
        
        gain.gain.setValueAtTime(velocity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc.connect(gain);
        gain.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 1);
        
        // Click transient
        const click = this.audioContext.createOscillator();
        const clickGain = this.audioContext.createGain();
        click.type = 'square';
        click.frequency.value = 2000;
        clickGain.gain.setValueAtTime(velocity * 0.4, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
        click.connect(clickGain);
        clickGain.connect(this.compressor);
        click.start(now);
        click.stop(now + 0.02);
    }
    
    playCrash(velocity = 0.6) {
        // Cymbal crash
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const bufferSize = this.audioContext.sampleRate * 3;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let ch = 0; ch < 2; ch++) {
            const data = buffer.getChannelData(ch);
            for (let i = 0; i < bufferSize; i++) {
                const t = i / this.audioContext.sampleRate;
                data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2);
            }
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = velocity * 0.4;
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        source.start(now);
    }
    
    playGunshot(velocity = 0.7) {
        // Punchy gunshot/snap
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1500, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
        
        gain.gain.setValueAtTime(velocity * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.connect(gain);
        gain.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 0.15);
        
        // Noise tail
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(velocity * 0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        noise.connect(noiseGain);
        noiseGain.connect(this.compressor);
        noise.start(now);
    }
    
    playExplosion(velocity = 0.8) {
        // Explosion boom
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Low boom
        const boom = this.audioContext.createOscillator();
        const boomGain = this.audioContext.createGain();
        boom.type = 'sine';
        boom.frequency.setValueAtTime(100, now);
        boom.frequency.exponentialRampToValueAtTime(20, now + 0.3);
        boomGain.gain.setValueAtTime(velocity, now);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1);
        boom.connect(boomGain);
        boomGain.connect(this.compressor);
        boom.start(now);
        boom.stop(now + 1.2);
        
        // Noise
        const bufferSize = this.audioContext.sampleRate * 1;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = buffer.getChannelData(ch);
            for (let i = 0; i < bufferSize; i++) {
                const t = i / this.audioContext.sampleRate;
                data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 3);
            }
        }
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(8000, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.5);
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.value = velocity * 0.5;
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.reverb.input);
        noise.start(now);
    }
    
    playPunch(velocity = 0.6) {
        // Punchy hit
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
        
        gain.gain.setValueAtTime(velocity * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        osc.connect(gain);
        gain.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 0.3);
    }
    
    playWhoosh(velocity = 0.5) {
        // Whoosh transition
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const bufferSize = this.audioContext.sampleRate * 0.8;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        
        for (let ch = 0; ch < 2; ch++) {
            const data = buffer.getChannelData(ch);
            for (let i = 0; i < bufferSize; i++) {
                const t = i / bufferSize;
                const env = Math.sin(t * Math.PI);
                data[i] = (Math.random() * 2 - 1) * env;
            }
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(4000, now + 0.4);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.8);
        filter.Q.value = 2;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = velocity * 0.5;
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        source.start(now);
    }
    
    playRiserImpact(velocity = 0.7) {
        // Riser into impact
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Riser
        const riser = this.audioContext.createOscillator();
        const riserGain = this.audioContext.createGain();
        riser.type = 'sawtooth';
        riser.frequency.setValueAtTime(100, now);
        riser.frequency.exponentialRampToValueAtTime(2000, now + 1.5);
        riserGain.gain.setValueAtTime(0, now);
        riserGain.gain.linearRampToValueAtTime(velocity * 0.4, now + 1.4);
        riserGain.gain.setValueAtTime(0, now + 1.5);
        riser.connect(riserGain);
        riserGain.connect(this.filter);
        riser.start(now);
        riser.stop(now + 1.6);
        
        // Impact at end
        setTimeout(() => {
            this.playBigImpact(velocity);
        }, 1500);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 🧠 SYNTH SHOTS (Futuristic stabs)
    // ═══════════════════════════════════════════════════════════════
    
    playSynthStab(velocity = 0.6) {
        // Classic synth stab
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const notes = [261.63, 329.63, 392]; // C major
        
        notes.forEach(freq => {
            const osc = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sawtooth';
            osc2.type = 'square';
            osc.frequency.value = freq;
            osc2.frequency.value = freq * 1.005;
            
            gain.gain.setValueAtTime(velocity * 0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            
            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(this.filter);
            
            osc.start(now);
            osc2.start(now);
            osc.stop(now + 0.4);
            osc2.stop(now + 0.4);
        });
    }
    
    playFutureBass(velocity = 0.6) {
        // Future bass chord
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const notes = [130.81, 164.81, 196, 261.63];
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, now);
            filter.frequency.linearRampToValueAtTime(4000, now + 0.1);
            filter.frequency.linearRampToValueAtTime(1000, now + 0.3);
            filter.Q.value = 5;
            
            gain.gain.setValueAtTime(velocity * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.reverb.input);
            
            osc.start(now);
            osc.stop(now + 0.6);
        });
    }
    
    playPluck(velocity = 0.5) {
        // Pluck synth
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.value = 440;
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(8000, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.1);
        
        gain.gain.setValueAtTime(velocity * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverb.input);
        
        osc.start(now);
        osc.stop(now + 0.4);
    }
    
    playArp(velocity = 0.4) {
        // Quick arpeggio
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const notes = [261.63, 329.63, 392, 523.25, 392, 329.63];
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            const startTime = now + i * 0.08;
            osc.type = 'square';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(velocity * 0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
            
            osc.connect(gain);
            gain.connect(this.reverb.input);
            
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }
    
    playReese(velocity = 0.6) {
        // Reese bass
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.value = 55;
        osc2.frequency.value = 55.5;
        
        gain.gain.setValueAtTime(velocity * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.compressor);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1);
        osc2.stop(now + 1);
    }
    
    playLead(velocity = 0.5) {
        // Lead synth shot
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc2.type = 'square';
        osc.frequency.value = 523.25;
        osc2.frequency.value = 523.25 * 2;
        
        gain.gain.setValueAtTime(velocity * 0.3, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.2, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.filter);
        
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.5);
        osc2.stop(now + 0.5);
    }
    
    playHoover(velocity = 0.6) {
        // Hoover synth
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        for (let i = 0; i < 5; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.value = 130.81 * (1 + i * 0.01);
            osc.detune.value = (i - 2) * 20;
            
            // Pitch bend
            osc.frequency.setValueAtTime(130.81 * (1 + i * 0.01), now);
            osc.frequency.linearRampToValueAtTime(150 * (1 + i * 0.01), now + 0.1);
            osc.frequency.linearRampToValueAtTime(130.81 * (1 + i * 0.01), now + 0.3);
            
            gain.gain.setValueAtTime(velocity * 0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            osc.connect(gain);
            gain.connect(this.filter);
            
            osc.start(now);
            osc.stop(now + 0.6);
        }
    }
    
    playChipTune(velocity = 0.4) {
        // 8-bit chip tune
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        const notes = [523.25, 659.25, 783.99, 1046.5];
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            const startTime = now + i * 0.1;
            osc.type = 'square';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(velocity * 0.15, startTime);
            gain.gain.setValueAtTime(0, startTime + 0.08);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.1);
        });
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 🎹 KEYBOARD - Play specific notes
    // ═══════════════════════════════════════════════════════════════
    
    playKeyboardNote(midiNote, velocity = 0.7) {
        if (!this.isInitialized) return;
        
        const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
        
        // Use current voice setting
        let oscillators;
        switch (this.currentVoice) {
            case 'bell':
                oscillators = this.createBellVoice(frequency);
                break;
            case 'string':
                oscillators = this.createStringVoice(frequency);
                break;
            case 'soul':
                oscillators = this.createSoulVoice(frequency);
                break;
            case 'gospel':
                oscillators = this.createGospelVoice(frequency);
                break;
            case 'glass':
                oscillators = this.createGlassVoice(frequency);
                break;
            default:
                oscillators = this.createPadVoice(frequency);
        }
        
        const voiceGain = this.audioContext.createGain();
        voiceGain.gain.value = 0;
        
        const now = this.audioContext.currentTime;
        
        oscillators.forEach((osc, i) => {
            const oscGain = this.audioContext.createGain();
            oscGain.gain.value = velocity / oscillators.length;
            osc.connect(oscGain);
            oscGain.connect(voiceGain);
            osc.start(now);
        });
        
        voiceGain.connect(this.filter);
        
        // Quick attack for keyboard
        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(velocity, now + 0.02);
        
        const voiceId = Date.now() + Math.random();
        this.activeVoices.set(voiceId, {
            oscillators,
            gain: voiceGain,
            sustainLevel: velocity * 0.8,
            release: 0.5
        });
        
        return voiceId;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MAIN PLAY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════
    
    playNote(noteIndex, velocity = 0.8) {
        if (!this.isInitialized) return;
        
        const scale = this.scales[this.currentMode];
        const midiNote = this.baseNote + scale[noteIndex % scale.length];
        const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
        
        // Create voice based on current setting
        let oscillators;
        let customEnvelope = null;
        
        switch (this.currentVoice) {
            case 'bell':
                oscillators = this.createBellVoice(frequency);
                customEnvelope = { attack: 0.01, decay: 0.3, sustain: 0.2, release: 1.5 };
                break;
            case 'string':
                oscillators = this.createStringVoice(frequency);
                break;
            case 'choir':
                oscillators = this.createChoirVoice(frequency);
                break;
            case 'soul':
                oscillators = this.createSoulVoice(frequency);
                customEnvelope = { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.8 };
                break;
            case 'gospel':
                oscillators = this.createGospelVoice(frequency);
                customEnvelope = { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.3 };
                break;
            case 'vox':
                oscillators = this.createVoxVoice(frequency);
                customEnvelope = { attack: 0.15, decay: 0.3, sustain: 0.6, release: 1.2 };
                break;
            case 'glass':
                oscillators = this.createGlassVoice(frequency);
                customEnvelope = { attack: 0.01, decay: 0.5, sustain: 0.1, release: 2.0 };
                break;
            case 'dream':
                oscillators = this.createDreamVoice(frequency);
                customEnvelope = { attack: 0.3, decay: 0.5, sustain: 0.7, release: 2.5 };
                break;
            default:
                oscillators = this.createPadVoice(frequency);
        }
        
        const voiceGain = this.audioContext.createGain();
        voiceGain.gain.value = 0;
        
        const now = this.audioContext.currentTime;
        const env = customEnvelope || {
            attack: 0.01 + this.params.attack * 0.5,
            decay: 0.1 + this.params.decay * 0.5,
            sustain: this.params.sustain * 0.7,
            release: 0.2 + this.params.release * 2
        };
        
        // Connect oscillators
        oscillators.forEach((osc, i) => {
            const oscGain = this.audioContext.createGain();
            let gainValue = velocity / oscillators.length;
            
            // Different gain curves for different voices
            if (this.currentVoice === 'bell' || this.currentVoice === 'glass') {
                gainValue *= Math.pow(0.65, i);
            } else if (this.currentVoice === 'gospel') {
                const drawbarLevels = [1, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2];
                gainValue *= drawbarLevels[i] || 0.2;
            }
            
            oscGain.gain.value = gainValue;
            osc.connect(oscGain);
            oscGain.connect(voiceGain);
            osc.start(now);
        });
        
        voiceGain.connect(this.filter);
        
        // ADSR envelope
        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(velocity, now + env.attack);
        voiceGain.gain.linearRampToValueAtTime(env.sustain * velocity, now + env.attack + env.decay);
        
        const voiceId = Date.now() + Math.random();
        this.activeVoices.set(voiceId, {
            oscillators,
            gain: voiceGain,
            sustainLevel: env.sustain * velocity,
            release: env.release
        });
        
        // Auto-release after 3 seconds if user doesn't release (safety fallback)
        // But normally the sound sustains until key release
        setTimeout(() => {
            if (this.activeVoices.has(voiceId)) {
                this.releaseNote(voiceId);
            }
        }, 3000);
        
        return voiceId;
    }
    
    releaseNote(voiceId, forcedReleaseSeconds) {
        const voice = this.activeVoices.get(voiceId);
        if (!voice) return;
        
        const now = this.audioContext.currentTime;
        const releaseSeconds =
            typeof forcedReleaseSeconds === 'number'
                ? Math.max(0.005, forcedReleaseSeconds)
                : voice.release;
        
        // Use cancel-and-hold when available to prevent runaway/stuck envelopes
        if (typeof voice.gain.gain.cancelAndHoldAtTime === 'function') {
            voice.gain.gain.cancelAndHoldAtTime(now);
        } else {
            voice.gain.gain.cancelScheduledValues(now);
            // Fall back to a sane level to avoid jumps
            voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value || 0), now);
        }
        voice.gain.gain.linearRampToValueAtTime(0, now + releaseSeconds);
        
        setTimeout(() => {
            voice.oscillators.forEach(osc => {
                try {
                    osc.stop();
                    osc.disconnect();
                } catch (e) {}
            });
            voice.gain.disconnect();
            this.activeVoices.delete(voiceId);
        }, releaseSeconds * 1000 + 120);
    }

    panic() {
        // Immediately stop all currently playing melodic voices
        const ids = Array.from(this.activeVoices.keys());
        ids.forEach(id => this.releaseNote(id, 0.02));
    }
    
    // Sequencer sounds with more variety
    playSequencerStep(row, velocity = 0.6) {
        if (!this.isInitialized) return;
        
        // Different sound per row
        switch (row) {
            case 0:
                this.play808Kick(velocity);
                break;
            case 1:
                this.play808Snare(velocity * 0.8);
                break;
            case 2:
                this.play808HiHat(velocity * 0.6, false);
                break;
            case 3:
                this.play808HiHat(velocity * 0.5, true);
                break;
            case 4:
                this.playClap(velocity * 0.7);
                break;
            case 5:
                this.playRim(velocity * 0.6);
                break;
            case 6:
                this.playPerc(velocity * 0.5);
                break;
            case 7:
                this.playShimmer(velocity * 0.4);
                break;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // PARAMETER SETTERS
    // ═══════════════════════════════════════════════════════════════
    
    setReverb(value) {
        this.params.reverb = value;
        if (this.reverb) {
            this.reverb.wet.gain.value = value;
            this.reverb.dry.gain.value = 1 - value * 0.5;
        }
    }
    
    setDelay(value) {
        this.params.delay = value;
        if (this.delay) {
            this.delay.wet.gain.value = value;
        }
    }
    
    setFilter(value) {
        this.params.filter = value;
        if (this.filter) {
            this.filter.frequency.value = 200 + value * 18000;
        }
    }
    
    setMaster(value) {
        this.params.master = value;
        if (this.masterGain) {
            this.masterGain.gain.value = value;
        }
    }
    
    setVoice(voice) {
        this.currentVoice = voice;
    }
    
    setMode(mode) {
        this.currentMode = mode;
    }
    
    setTempo(bpm) {
        if (this.delay) {
            const beatDuration = 60 / bpm;
            this.delay.delay.delayTime.value = beatDuration * 0.75;
            this.delay.delay2.delayTime.value = beatDuration * 0.5;
        }
    }
    
    setEnvelope(param, value) {
        this.params[param] = value;
    }
    
    getAnalyserData() {
        if (!this.analyser) return null;
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        return dataArray;
    }
    
    getAudioLevel() {
        if (!this.analyser) return 0;
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        return sum / (dataArray.length * 255);
    }
    
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

window.AetherAudioEngine = AetherAudioEngine;
