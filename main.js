import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 8;
controls.maxDistance = 50;

// Texture Loader
const textureLoader = new THREE.TextureLoader();

// Earth Group
const earthGroup = new THREE.Group();
scene.add(earthGroup);

// Earth
const earthGeometry = new THREE.SphereGeometry(5, 64, 64);

// Custom shader material for day/night cycle
const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
        dayTexture: { value: textureLoader.load('earth_day.jpg') },
        nightTexture: { value: textureLoader.load('earth_night.jpg') },
        normalMap: { value: textureLoader.load('earth_normal.jpg') },
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        normalScale: { value: 0.05 },
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;

        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
            vec3 normalizedSunDir = normalize(sunDirection);
            float intensity = dot(vNormal, normalizedSunDir);
            
            // Smooth transition between day and night
            float mixValue = smoothstep(-0.2, 0.2, intensity);

            vec4 dayColor = texture2D(dayTexture, vUv);
            vec4 nightColor = texture2D(nightTexture, vUv);

            // Mix between day and night textures
            gl_FragColor = mix(nightColor, dayColor, mixValue);

            // Add atmosphere glow on edges
            float atmosphereIntensity = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
            vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);
            gl_FragColor.rgb += atmosphereColor * pow(atmosphereIntensity, 2.0) * 0.3;
        }
    `
});

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earthGroup.add(earth);

// Clouds
const cloudsMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('earth_clouds.png'),
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const cloudsGeometry = new THREE.SphereGeometry(5.05, 64, 64);
const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
earthGroup.add(clouds);

// Atmosphere glow
const atmosphereGeometry = new THREE.SphereGeometry(5.3, 64, 64);
const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
        color: { value: new THREE.Color(0x0077ff) }
    },
    vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        varying vec3 vNormal;
        void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(color, intensity);
        }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true
});

const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
earthGroup.add(atmosphere);

// Enhanced city data with population-based sizing
const cities = [
    { lat: 40.7128, lng: -74.0060, name: "New York", size: 0.08 },
    { lat: 51.5074, lng: -0.1278, name: "London", size: 0.08 },
    { lat: 35.6762, lng: 139.6503, name: "Tokyo", size: 0.1 },
    { lat: -33.8688, lng: 151.2093, name: "Sydney", size: 0.06 },
    { lat: 31.2304, lng: 121.4737, name: "Shanghai", size: 0.09 },
    { lat: 19.4326, lng: -99.1332, name: "Mexico City", size: 0.08 },
    { lat: -22.9068, lng: -43.1729, name: "Rio de Janeiro", size: 0.07 },
    { lat: 55.7558, lng: 37.6173, name: "Moscow", size: 0.08 },
    { lat: 28.6139, lng: 77.2090, name: "New Delhi", size: 0.09 },
    { lat: 1.3521, lng: 103.8198, name: "Singapore", size: 0.06 }
];

// Convert lat/lng to 3D coordinates
function latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return new THREE.Vector3(x, y, z);
}

// City lights group
const cityLightsGroup = new THREE.Group();
earth.add(cityLightsGroup);

// Add enhanced city markers with glow effect
cities.forEach(city => {
    // City point light
    const light = new THREE.PointLight(0xffa500, 0.5, 0.5);
    const position = latLngToVector3(city.lat, city.lng, 5.01);
    light.position.copy(position);
    cityLightsGroup.add(light);

    // City marker with glow
    const cityGeometry = new THREE.SphereGeometry(city.size, 16, 16);
    const cityMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffa500) }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(color, 0.8 * intensity);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    
    const cityMesh = new THREE.Mesh(cityGeometry, cityMaterial);
    cityMesh.position.copy(position);
    cityLightsGroup.add(cityMesh);
});

// Sun light
const sunLight = new THREE.DirectionalLight(0xffffff, 2);
sunLight.position.set(10, 0, 0);
scene.add(sunLight);

// Ambient light
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

// Camera position
camera.position.z = 15;

// Animation variables
let time = Math.PI; // Start at noon

// Time slider control
const timeSlider = document.getElementById('timeSlider');
timeSlider.addEventListener('input', (e) => {
    // Convert 24-hour time to radians (add PI to start at midnight)
    time = (e.target.value / 24) * Math.PI * 2 + Math.PI;
    updateSunPosition();
});

function updateSunPosition() {
    const sunPosition = new THREE.Vector3(
        Math.cos(time) * 10,
        0,
        Math.sin(time) * 10
    );
    sunLight.position.copy(sunPosition);
    earthMaterial.uniforms.sunDirection.value.copy(sunPosition).normalize();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Rotate clouds slightly
    clouds.rotation.y += 0.0002;
    
    // Update sun position
    updateSunPosition();
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize animation
animate();
