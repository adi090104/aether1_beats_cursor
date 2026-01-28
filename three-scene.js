// ═══════════════════════════════════════════════════════════════
// ÆTHER-1 THREE.JS SCENE
// Retro-Futuristic Metallic Background
// ═══════════════════════════════════════════════════════════════

class AetherScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.metalPlane = null;
        this.lights = [];
        this.time = 0;
        this.audioReactivity = 0;
        
        this.init();
    }
    
    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0a0a0c, 0.02);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 30);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('three-canvas'),
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x0a0a0c, 1);
        
        // Create scene elements
        this.createMetallicBackground();
        this.createParticles();
        this.createLights();
        this.createFloatingGeometry();
        
        // Event listeners
        window.addEventListener('resize', () => this.onResize());
        
        // Start animation
        this.animate();
    }
    
    createMetallicBackground() {
        // Create a large metallic plane with procedural texture
        const geometry = new THREE.PlaneGeometry(100, 100, 50, 50);
        
        // Displace vertices for organic feel
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 2;
            positions.setZ(i, z);
        }
        geometry.computeVertexNormals();
        
        // Custom shader material for brushed metal effect
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioLevel: { value: 0 },
                color1: { value: new THREE.Color(0x1a1a1f) },
                color2: { value: new THREE.Color(0x2d2d35) },
                color3: { value: new THREE.Color(0x00f5ff) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;
                uniform float time;
                uniform float audioLevel;
                
                void main() {
                    vUv = uv;
                    vNormal = normal;
                    vPosition = position;
                    
                    vec3 pos = position;
                    pos.z += sin(pos.x * 0.5 + time * 0.5) * cos(pos.y * 0.5 + time * 0.3) * (1.0 + audioLevel * 2.0);
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float audioLevel;
                uniform vec3 color1;
                uniform vec3 color2;
                uniform vec3 color3;
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                // Noise function for brushed metal texture
                float noise(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                float brushedMetal(vec2 uv) {
                    float lines = 0.0;
                    for (float i = 0.0; i < 5.0; i++) {
                        float offset = noise(vec2(i * 10.0, 0.0)) * 100.0;
                        lines += smoothstep(0.0, 0.1, abs(sin((uv.x + offset) * 200.0 + i * 50.0)));
                    }
                    return lines / 5.0;
                }
                
                void main() {
                    // Base brushed metal
                    float metal = brushedMetal(vUv);
                    
                    // Gradient based on position
                    float gradient = (vPosition.y + 50.0) / 100.0;
                    
                    // Mix colors
                    vec3 baseColor = mix(color1, color2, gradient);
                    baseColor = mix(baseColor, baseColor * 1.2, metal * 0.3);
                    
                    // Add subtle glow based on audio
                    float glow = sin(vPosition.x * 0.1 + time) * sin(vPosition.y * 0.1 + time * 0.7);
                    glow = glow * 0.5 + 0.5;
                    baseColor = mix(baseColor, color3, glow * audioLevel * 0.3);
                    
                    // Fresnel effect for metallic sheen
                    vec3 viewDir = normalize(cameraPosition - vPosition);
                    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
                    baseColor += fresnel * 0.1;
                    
                    gl_FragColor = vec4(baseColor, 1.0);
                }
            `,
            side: THREE.DoubleSide
        });
        
        this.metalPlane = new THREE.Mesh(geometry, material);
        this.metalPlane.rotation.x = -Math.PI / 2.5;
        this.metalPlane.position.z = -20;
        this.metalPlane.position.y = -15;
        this.scene.add(this.metalPlane);
    }
    
    createParticles() {
        const particleCount = 2000;
        const geometry = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        const colorPalette = [
            new THREE.Color(0x00f5ff), // Cyan
            new THREE.Color(0xff00ff), // Magenta
            new THREE.Color(0xffaa00), // Amber
            new THREE.Color(0x00ff88), // Green
        ];
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
            
            const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            sizes[i] = Math.random() * 2 + 0.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioLevel: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                uniform float audioLevel;
                
                void main() {
                    vColor = color;
                    
                    vec3 pos = position;
                    pos.y += sin(time * 0.5 + position.x * 0.1) * 2.0;
                    pos.x += cos(time * 0.3 + position.z * 0.1) * 2.0;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + audioLevel);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    
                    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                    gl_FragColor = vec4(vColor, alpha * 0.6);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }
    
    createLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x1a1a2e, 0.5);
        this.scene.add(ambient);
        
        // Cyan point light
        const cyanLight = new THREE.PointLight(0x00f5ff, 1, 50);
        cyanLight.position.set(-20, 10, 10);
        this.scene.add(cyanLight);
        this.lights.push(cyanLight);
        
        // Magenta point light
        const magentaLight = new THREE.PointLight(0xff00ff, 0.8, 50);
        magentaLight.position.set(20, -10, 15);
        this.scene.add(magentaLight);
        this.lights.push(magentaLight);
        
        // Amber accent light
        const amberLight = new THREE.PointLight(0xffaa00, 0.5, 40);
        amberLight.position.set(0, 20, 5);
        this.scene.add(amberLight);
        this.lights.push(amberLight);
    }
    
    createFloatingGeometry() {
        this.floatingObjects = [];
        
        // Create floating metallic shapes
        const shapes = [
            new THREE.IcosahedronGeometry(2, 0),
            new THREE.OctahedronGeometry(1.5, 0),
            new THREE.TetrahedronGeometry(1.8, 0),
            new THREE.TorusGeometry(1.5, 0.4, 8, 16),
            new THREE.BoxGeometry(2, 2, 2)
        ];
        
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d3d48,
            metalness: 0.9,
            roughness: 0.2,
            envMapIntensity: 1
        });
        
        for (let i = 0; i < 8; i++) {
            const geometry = shapes[Math.floor(Math.random() * shapes.length)];
            const mesh = new THREE.Mesh(geometry, metalMaterial.clone());
            
            mesh.position.set(
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 30 - 10
            );
            
            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            mesh.userData = {
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.02,
                    y: (Math.random() - 0.5) * 0.02,
                    z: (Math.random() - 0.5) * 0.02
                },
                floatSpeed: Math.random() * 0.5 + 0.5,
                floatOffset: Math.random() * Math.PI * 2,
                originalY: mesh.position.y
            };
            
            this.scene.add(mesh);
            this.floatingObjects.push(mesh);
        }
    }
    
    setAudioReactivity(level) {
        this.audioReactivity = level;
    }
    
    triggerPadEffect(padIndex) {
        // Create a burst effect when a pad is triggered
        const colors = [0x00f5ff, 0xff00ff, 0xffaa00, 0x00ff88, 0xff6b9d];
        const color = colors[padIndex % colors.length];
        
        // Pulse the corresponding light
        if (this.lights[padIndex % this.lights.length]) {
            const light = this.lights[padIndex % this.lights.length];
            const originalIntensity = light.intensity;
            light.intensity = 3;
            light.color.setHex(color);
            
            setTimeout(() => {
                light.intensity = originalIntensity;
            }, 200);
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.time += 0.016;
        
        // Update metal plane shader
        if (this.metalPlane && this.metalPlane.material.uniforms) {
            this.metalPlane.material.uniforms.time.value = this.time;
            this.metalPlane.material.uniforms.audioLevel.value = this.audioReactivity;
        }
        
        // Update particles
        if (this.particles && this.particles.material.uniforms) {
            this.particles.material.uniforms.time.value = this.time;
            this.particles.material.uniforms.audioLevel.value = this.audioReactivity;
            this.particles.rotation.y += 0.0005;
        }
        
        // Animate floating objects
        this.floatingObjects.forEach((obj, i) => {
            obj.rotation.x += obj.userData.rotationSpeed.x;
            obj.rotation.y += obj.userData.rotationSpeed.y;
            obj.rotation.z += obj.userData.rotationSpeed.z;
            
            obj.position.y = obj.userData.originalY + 
                Math.sin(this.time * obj.userData.floatSpeed + obj.userData.floatOffset) * 3;
            
            // Audio reactivity
            const scale = 1 + this.audioReactivity * 0.3;
            obj.scale.setScalar(scale);
        });
        
        // Animate lights
        this.lights.forEach((light, i) => {
            light.position.x += Math.sin(this.time * 0.5 + i * 2) * 0.1;
            light.position.y += Math.cos(this.time * 0.3 + i * 2) * 0.1;
        });
        
        // Subtle camera movement
        this.camera.position.x = Math.sin(this.time * 0.1) * 2;
        this.camera.position.y = Math.cos(this.time * 0.15) * 1;
        this.camera.lookAt(0, 0, 0);
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Export for use in main app
window.AetherScene = AetherScene;

