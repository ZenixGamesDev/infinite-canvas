const firebaseConfig = {
    apiKey: "AIzaSyBJD0fM3XErHKGDbvVsE-zlranRK7ABpXM",
    authDomain: "://firebaseapp.com",
    databaseURL: "https://firebaseio.com",
    projectId: "infinite-canvas-db",
    storageBucket: "infinite-canvas-db.firebasestorage.app",
    messagingSenderId: "641942476286",
    appId: "1:641942476286:web:dc5b465b6756a5805a9caf"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const blocksRef = database.ref('blocks');

const canvas = document.getElementById('infiniteCanvas');
const ctx = canvas.getContext('2d');
const coordXEl = document.getElementById('coordinateX');
const coordYEl = document.getElementById('coordinateY');

// Логика параметров ссылки (чтение стартовых координат x и y)
const urlParams = new URLSearchParams(window.location.search);
let cameraX = parseFloat(urlParams.get('x')) || 0;
let cameraY = parseFloat(urlParams.get('y')) || 0;

let zoom = 1.0;
let isDragging = false;
let startX = 0;
let startY = 0;

let currentMode = 'build'; // 'build' или 'erase'
let selectedColor = '#00ffcc';

const localBlocks = new Map();

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}
window.addEventListener('resize', resizeCanvas);

blocksRef.on('value', (snapshot) => {
    localBlocks.clear();
    const data = snapshot.val();
    if (data) {
        Object.keys(data).forEach(key => {
            localBlocks.set(key, data[key]);
        });
    }
    draw();
});

// Выбор цвета
document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        document.getElementById('eraserBtn').classList.remove('active');
        e.target.classList.add('active');
        selectedColor = e.target.getAttribute('data-color');
        currentMode = 'build';
    });
});

// Активация ластика
document.getElementById('eraserBtn').addEventListener('click', (e) => {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    e.target.classList.add('active');
    currentMode = 'erase';
});

// Кнопка "Поделиться"
document.getElementById('shareBtn').addEventListener('click', () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?x=${Math.round(cameraX)}&y=${Math.round(cameraY)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Ссылка на твои текущие координаты скопирована в буфер обмена!');
    });
});

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        cameraX -= dx / zoom;
        cameraY -= dy / zoom;
        startX = e.clientX;
        startY = e.clientY;
        
        coordXEl.innerText = Math.round(cameraX);
        coordYEl.innerText = Math.round(cameraY);
        draw();
    }
});

window.addEventListener('mouseup', () => { isDragging = false; });

canvas.addEventListener('click', (e) => {
    if (Math.abs(e.clientX - startX) > 3 || Math.abs(e.clientY - startY) > 3) return;

    const worldX = (e.clientX - canvas.width / 2) / zoom + cameraX;
    const worldY = (e.clientY - canvas.height / 2) / zoom + cameraY;

    const gridSize = 40;
    const blockX = Math.floor(worldX / gridSize);
    const blockY = Math.floor(worldY / gridSize);
    const key = `${blockX}_${blockY}`;

    if (currentMode === 'erase') {
        if (localBlocks.has(key)) {
            database.ref('blocks/' + key).remove();
        }
    } else {
        // Ставим блок выбранного цвета
        database.ref('blocks/' + key).set(selectedColor);
    }
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) zoom *= 1.1; else zoom /= 1.1;
    zoom = Math.max(0.2, Math.min(zoom, 5));
    draw();
}, { passive: false });

function draw() {
    ctx.fillStyle = '#0d0e12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraX, -cameraY);

    const gridSize = 40;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1 / zoom;
    
    const startGridX = Math.floor((cameraX - canvas.width / 2 / zoom) / gridSize) * gridSize;
    const endGridX = Math.ceil((cameraX + canvas.width / 2 / zoom) / gridSize) * gridSize;
    const startGridY = Math.floor((cameraY - canvas.height / 2 / zoom) / gridSize) * gridSize;
    const endGridY = Math.ceil((cameraY + canvas.height / 2 / zoom) / gridSize) * gridSize;

    for (let x = startGridX; x <= endGridX; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, startGridY); ctx.lineTo(x, endGridY); ctx.stroke();
    }
    for (let y = startGridY; y <= endGridY; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(startGridX, y); ctx.lineTo(endGridX, y); ctx.stroke();
    }

    localBlocks.forEach((color, key) => {
        const [bx, by] = key.split('_').map(Number);
        ctx.fillStyle = color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.fillRect(bx * gridSize + 1, by * gridSize + 1, gridSize - 2, gridSize - 2);
    });

    ctx.restore();
}

resizeCanvas();
