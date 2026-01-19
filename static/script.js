/**
 * AI Tamagotchi - Ferrofluid Shadow Mascot
 * Frontend: Particle Physics Engine + WebSocket Integration
 */

// Configuration - More particles for finer ferrofluid detail
const PARTICLE_COUNT = 25;
const CENTER_X = 200; // Half of 400px container
const CENTER_Y = 200;
const BASE_RADIUS = 100;
const BASE_SPEED = 0.015;

// Global state
let particles = [];
let currentMood = 'neutral';
let touchPosition = { x: null, y: null };
let animationId = null;
let time = 0;

// Socket.IO connection
const socket = io();

// Initialize particles
function initParticles() {
    const container = document.getElementById('gooeyContainer');
    container.innerHTML = ''; // Clear existing particles
    
    particles = [];
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        container.appendChild(particle);
        
        // Initialize particle state - create clusters for ferrofluid effect
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const radius = BASE_RADIUS + Math.random() * 50 - 25;
        
        particles.push({
            element: particle,
            baseAngle: angle,
            radius: radius,
            phase: Math.random() * Math.PI * 2,
            speed: BASE_SPEED + (Math.random() - 0.5) * 0.008,
            spikePhase: Math.random() * Math.PI * 2, // For spiky tendrils
            spikeIntensity: 0.3 + Math.random() * 0.4 // Varies spike intensity
        });
    }
}

// Update particle positions based on mood
function updateParticles() {
    time += 0.016; // ~60fps
    
    // Calculate blob center (will be shifted by touch)
    let blobCenterX = CENTER_X;
    let blobCenterY = CENTER_Y;
    
    // Touch interaction - shift entire blob center toward touch point
    if (touchPosition.x !== null && touchPosition.y !== null) {
        const dx = touchPosition.x - CENTER_X;
        const dy = touchPosition.y - CENTER_Y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 300) {
            // Pull the blob center toward touch (creates unified blob deformation)
            const pullStrength = Math.pow((300 - distance) / 300, 1.2);
            blobCenterX = CENTER_X + dx * pullStrength * 0.4;
            blobCenterY = CENTER_Y + dy * pullStrength * 0.4;
        }
    }
    
    // Calculate center of mass for eyes
    let centerX = 0;
    let centerY = 0;
    
    particles.forEach((particle, index) => {
        // Base orbital motion relative to blob center
        let angle = particle.baseAngle + time * particle.speed + particle.phase;
        let radius = particle.radius;
        
        // Ferrofluid spiky tendril effect - creates spikes extending outward
        const spikeAngle = angle + particle.spikePhase;
        const spikeLength = Math.sin(time * 1.5 + particle.spikePhase) * particle.spikeIntensity * 20;
        radius += spikeLength;
        
        // Mood-based modifications
        switch(currentMood) {
            case 'happy':
                // Fast, energetic movement with more spikes
                angle += time * 0.04;
                radius += Math.sin(time * 2.5 + index) * 12;
                radius += Math.sin(time * 4 + particle.spikePhase) * 8 * particle.spikeIntensity;
                break;
                
            case 'tired':
                // Slow movement, sink to bottom, fewer spikes
                angle += time * 0.004;
                radius *= 0.75;
                radius += Math.sin(time * 0.8 + particle.spikePhase) * 5 * particle.spikeIntensity;
                break;
                
            case 'angry':
            case 'hangry':
                // Aggressive spikes and jitter
                angle += time * 0.025;
                radius += Math.sin(time * 12 + index) * 20;
                radius += Math.sin(time * 8 + particle.spikePhase) * 15 * particle.spikeIntensity;
                angle += Math.sin(time * 18 + index) * 0.25;
                break;
                
            case 'sad':
                // Slow, droopy movement, minimal spikes
                angle += time * 0.008;
                radius *= 0.85;
                radius += Math.sin(time * 0.6 + particle.spikePhase) * 4 * particle.spikeIntensity;
                break;
                
            case 'hungry':
                // Slight agitation with moderate spikes
                angle += time * 0.018;
                radius += Math.sin(time * 2.5 + index) * 8;
                radius += Math.sin(time * 3 + particle.spikePhase) * 10 * particle.spikeIntensity;
                break;
                
            default: // neutral
                angle += time * 0.012;
                radius += Math.sin(time * 1.2 + index) * 6;
                radius += Math.sin(time * 1.8 + particle.spikePhase) * 12 * particle.spikeIntensity;
        }
        
        // Touch interaction - create unified blob deformation
        if (touchPosition.x !== null && touchPosition.y !== null) {
            const dx = touchPosition.x - blobCenterX;
            const dy = touchPosition.y - blobCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 250) {
                const pullStrength = Math.pow((250 - distance) / 250, 1.5);
                const pullAngle = Math.atan2(dy, dx);
                
                // Calculate particle's angle relative to blob center
                const particleAngle = Math.atan2(
                    Math.sin(angle) * radius,
                    Math.cos(angle) * radius
                );
                
                // Calculate how aligned this particle is with touch direction
                const angleDiff = Math.abs(angle - pullAngle);
                const minAngleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
                
                // Particles in the direction of touch extend (stretch the blob)
                // Particles opposite direction compress (maintain blob cohesion)
                if (minAngleDiff < Math.PI / 2) {
                    // Stretch toward touch
                    const alignmentFactor = Math.cos(minAngleDiff);
                    radius += pullStrength * 35 * alignmentFactor;
                } else {
                    // Compress opposite side to maintain blob shape
                    const compressionFactor = Math.cos(minAngleDiff - Math.PI / 2);
                    radius -= pullStrength * 15 * compressionFactor;
                }
            }
        }
        
        // Calculate position relative to blob center (not fixed center)
        const x = blobCenterX + Math.cos(angle) * radius;
        const y = blobCenterY + Math.sin(angle) * radius;
        
        // Apply transform (particle is 35px, so offset by 17.5px)
        particle.element.style.transform = `translate(${x - 17.5}px, ${y - 17.5}px)`;
        
        // Accumulate for center of mass
        centerX += x;
        centerY += y;
    });
    
    // Update eyes position (center of mass)
    centerX /= particles.length;
    centerY /= particles.length;
    
    const eyesContainer = document.getElementById('eyesContainer');
    eyesContainer.style.transform = `translate(${centerX - 200}px, ${centerY - 200}px)`;
}

// Animation loop
function animate() {
    updateParticles();
    animationId = requestAnimationFrame(animate);
}

// Touch event handlers
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0] || e;
    const rect = document.getElementById('gooeyContainer').getBoundingClientRect();
    touchPosition.x = touch.clientX - rect.left;
    touchPosition.y = touch.clientY - rect.top;
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0] || e;
    const rect = document.getElementById('gooeyContainer').getBoundingClientRect();
    touchPosition.x = touch.clientX - rect.left;
    touchPosition.y = touch.clientY - rect.top;
}

function handleTouchEnd(e) {
    e.preventDefault();
    // Gradually release touch influence
    setTimeout(() => {
        touchPosition.x = null;
        touchPosition.y = null;
    }, 500);
}

// Mouse event handlers (for desktop testing)
function handleMouseDown(e) {
    const rect = document.getElementById('gooeyContainer').getBoundingClientRect();
    touchPosition.x = e.clientX - rect.left;
    touchPosition.y = e.clientY - rect.top;
}

function handleMouseMove(e) {
    if (touchPosition.x !== null) {
        const rect = document.getElementById('gooeyContainer').getBoundingClientRect();
        touchPosition.x = e.clientX - rect.left;
        touchPosition.y = e.clientY - rect.top;
    }
}

function handleMouseUp(e) {
    setTimeout(() => {
        touchPosition.x = null;
        touchPosition.y = null;
    }, 500);
}

// Socket.IO event handlers
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('update_status', (data) => {
    currentMood = data.mood;
    
    // Update mood class on container
    const container = document.getElementById('gooeyContainer');
    container.className = 'gooey-container mood-' + currentMood;
    
    // Update status display
    document.getElementById('moodDisplay').textContent = currentMood;
    document.getElementById('hungerDisplay').textContent = data.vitals.hunger.toFixed(1);
    document.getElementById('happinessDisplay').textContent = data.vitals.happiness.toFixed(1);
    document.getElementById('energyDisplay').textContent = data.vitals.energy.toFixed(1);
});

// Control button handlers
document.getElementById('feedBtn').addEventListener('click', () => {
    socket.emit('feed');
});

document.getElementById('playBtn').addEventListener('click', () => {
    socket.emit('play');
});

document.getElementById('restBtn').addEventListener('click', () => {
    socket.emit('rest');
});

// Touch event listeners
const container = document.getElementById('gooeyContainer');
container.addEventListener('touchstart', handleTouchStart, { passive: false });
container.addEventListener('touchmove', handleTouchMove, { passive: false });
container.addEventListener('touchend', handleTouchEnd, { passive: false });
container.addEventListener('touchcancel', handleTouchEnd, { passive: false });

// Mouse event listeners (for desktop)
container.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);

// Initialize and start
initParticles();
animate();

