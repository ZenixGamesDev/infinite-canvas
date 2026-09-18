const canvas = document.getElementById('infiniteCanvas');
const ctx = canvas.getContext('2d');

const coordXEl = document.getElementById('coordinateX');
const coordYEl = document.getElementById('coordinateY');

// Настройки холста
let cameraX = 0;
let cameraY = 0;
let zoom = 1.0;
let isDragging = false;
let startX = 0;
let startY = 0;

// Хранилище блоков (ключ: "x,y", значение: цвет)
const blocks = new Map();

// Авто-размер под экран
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}
window.addEventListener('resize', resizeCanvas);

// Перетаскивание мышкой (Панорамирование)
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

window.addEventListener('mouseup', () => {
    isDragging = false;
});

// Клик — ставим или убираем блок
canvas.addEventListener('click', (e) => {
    if (Math.abs(e.clientX - startX) > 3 || Math.abs(e.clientY - startY) > 3) return;

    // Вычисляем координаты клика в мире с учетом зума и камеры
    const worldX = (e.clientX - canvas.width / 2) / zoom + cameraX;
    const worldY = (e.clientY - canvas.height / 2) / zoom + cameraY;

    // Привязка к сетке (размер блока 40 пикселей)
    const gridSize = 40;
    const blockX = Math.floor(worldX / gridSize);
    const blockY = Math.floor(worldY / gridSize);
    const key = `${blockX},${blockY}`;

    if (blocks.has(key)) {
        blocks.delete(key); // Если блок есть — удаляем
    } else {
        // Случайный неоновый цвет для блока
        const colors = ['#00ffcc', '#ff0055', '#00ff33', '#ffcc00', '#ff00ff'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        blocks.set(key, randomColor);
    }
    draw();
});

// Зум колесиком мыши
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
        zoom *= 1.1;
    } else {
        zoom /= 1.1;
    }
    // Ограничение зума
    zoom = Math.max(0.2, Math.min(zoom, 5));
    draw();
}, { passive: false });

// Функция отрисовки мира
function draw() {
    ctx.fillStyle = '#0d0e12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Сдвигаем рисование в центр экрана
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraX, -cameraY);

    const gridSize = 40;

    // Рисуем сетку (динамически вокруг камеры)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1 / zoom;
    
    const startGridX = Math.floor((cameraX - canvas.width / 2 / zoom) / gridSize) * gridSize;
    const endGridX = Math.ceil((cameraX + canvas.width / 2 / zoom) / gridSize) * gridSize;
    const startGridY = Math.floor((cameraY - canvas.height / 2 / zoom) / gridSize) * gridSize;
    const endGridY = Math.ceil((cameraY + canvas.height / 2 / zoom) / gridSize) * gridSize;

    for (let x = startGridX; x <= endGridX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startGridY);
        ctx.lineTo(x, endGridY);
        ctx.stroke();
    }
    for (let y = startGridY; y <= endGridY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startGridX, y);
        ctx.lineTo(endGridX, y);
        ctx.stroke();
    }

    // Рисуем все поставленные блоки
    blocks.forEach((color, key) => {
        const [bx, by] = key.split(',').map(Number);
        ctx.fillStyle = color;
        // Эффект свечения
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillRect(bx * gridSize + 1, by * gridSize + 1, gridSize - 2, gridSize - 2);
    });

    ctx.restore();
}

// Первый запуск
resizeCanvas();
