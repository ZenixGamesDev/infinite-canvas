"use strict";

(function () {
    const canvas = document.getElementById("infiniteCanvas");

    const coordinateX = document.getElementById("coordinateX");

    const coordinateY = document.getElementById("coordinateY");

    if (!canvas) {
        throw new Error(
            'Canvas element with ID "infiniteCanvas" was not found.'
        );
    }

    const ctx = canvas.getContext("2d", {
        alpha: false
    });

    if (!ctx) {
        throw new Error(
            "The browser does not support the Canvas 2D context."
        );
    }

    let width = window.innerWidth;

    let height = window.innerHeight;

    let devicePixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2
    );

    const GRID_SIZE = 50;

    const MIN_ZOOM = 0.15;

    const MAX_ZOOM = 5;

    const ZOOM_SMOOTHING = 0.16;

    const PAN_SMOOTHING = 0.18;

    const GRID_MINOR_COLOR = "rgba(255, 255, 255, 0.045)";

    const GRID_MAJOR_COLOR = "rgba(255, 255, 255, 0.09)";

    const AXIS_COLOR = "rgba(0, 229, 255, 0.18)";

    const BLOCK_COLORS = [
        "#00eaff",
        "#00d9ff",
        "#ff1744",
        "#ff3860"
    ];

    const blocks = new Map();

    let offsetX = 0;

    let offsetY = 0;

    let targetOffsetX = 0;

    let targetOffsetY = 0;

    let zoom = 1;

    let targetZoom = 1;

    let isDragging = false;

    let dragMoved = false;

    let pointerDownTime = 0;

    let pointerStartX = 0;

    let pointerStartY = 0;

    let dragStartOffsetX = 0;

    let dragStartOffsetY = 0;

    let lastPointerX = 0;

    let lastPointerY = 0;

    let animationFrameId = 0;

    function resizeCanvas() {
        width = window.innerWidth;

        height = window.innerHeight;

        devicePixelRatio = Math.min(
            window.devicePixelRatio || 1,
            2
        );

        canvas.style.width = width + "px";

        canvas.style.height = height + "px";

        canvas.width = Math.floor(
            width * devicePixelRatio
        );

        canvas.height = Math.floor(
            height * devicePixelRatio
        );

        ctx.setTransform(
            devicePixelRatio,
            0,
            0,
            devicePixelRatio,
            0,
            0
        );

        render();
    }

    function screenToWorld(screenX, screenY) {
        return {
            x:
                (screenX - width / 2) / zoom +
                offsetX,

            y:
                (screenY - height / 2) / zoom +
                offsetY
        };
    }

    function worldToScreen(worldX, worldY) {
        return {
            x:
                (worldX - offsetX) * zoom +
                width / 2,

            y:
                (worldY - offsetY) * zoom +
                height / 2
        };
    }

    function getPointerPosition(event) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,

            y: event.clientY - rect.top
        };
    }

    function getGridCoordinate(worldX, worldY) {
        return {
            x: Math.round(
                worldX / GRID_SIZE
            ),

            y: Math.round(
                worldY / GRID_SIZE
            )
        };
    }

    function getBlockKey(gridX, gridY) {
        return gridX + "," + gridY;
    }

    function createBlock(gridX, gridY) {
        const key = getBlockKey(
            gridX,
            gridY
        );

        if (blocks.has(key)) {
            return;
        }

        const color =
            BLOCK_COLORS[
                Math.floor(
                    Math.random() *
                    BLOCK_COLORS.length
                )
            ];

        blocks.set(
            key,
            {
                x: gridX,
                y: gridY,
                color: color
            }
        );
    }

    function drawBackground() {
        ctx.fillStyle = "#0d0e12";

        ctx.fillRect(
            0,
            0,
            width,
            height
        );
    }

    function drawGrid() {
        const worldLeft =
            offsetX -
            width / (2 * zoom);

        const worldRight =
            offsetX +
            width / (2 * zoom);

        const worldTop =
            offsetY -
            height / (2 * zoom);

        const worldBottom =
            offsetY +
            height / (2 * zoom);

        const firstVertical =
            Math.floor(
                worldLeft / GRID_SIZE
            ) - 1;

        const lastVertical =
            Math.ceil(
                worldRight / GRID_SIZE
            ) + 1;

        const firstHorizontal =
            Math.floor(
                worldTop / GRID_SIZE
            ) - 1;

        const lastHorizontal =
            Math.ceil(
                worldBottom / GRID_SIZE
            ) + 1;

        const centerX =
            width / 2 -
            offsetX * zoom;

        const centerY =
            height / 2 -
            offsetY * zoom;

        ctx.save();

        ctx.lineWidth = 1;

        ctx.beginPath();

        for (
            let gridX = firstVertical;
            gridX <= lastVertical;
            gridX++
        ) {
            const screenX =
                width / 2 +
                (gridX * GRID_SIZE - offsetX) *
                    zoom;

            ctx.moveTo(
                Math.round(screenX) + 0.5,
                0
            );

            ctx.lineTo(
                Math.round(screenX) + 0.5,
                height
            );
        }

        for (
            let gridY = firstHorizontal;
            gridY <= lastHorizontal;
            gridY++
        ) {
            const screenY =
                height / 2 +
                (gridY * GRID_SIZE - offsetY) *
                    zoom;

            ctx.moveTo(
                0,
                Math.round(screenY) + 0.5
            );

            ctx.lineTo(
                width,
                Math.round(screenY) + 0.5
            );
        }

        ctx.strokeStyle =
            GRID_MINOR_COLOR;

        ctx.stroke();

        ctx.beginPath();

        for (
            let gridX = firstVertical;
            gridX <= lastVertical;
            gridX++
        ) {
            if (gridX % 5 !== 0) {
                continue;
            }

            const screenX =
                width / 2 +
                (gridX * GRID_SIZE - offsetX) *
                    zoom;

            ctx.moveTo(
                Math.round(screenX) + 0.5,
                0
            );

            ctx.lineTo(
                Math.round(screenX) + 0.5,
                height
            );
        }

        for (
            let gridY = firstHorizontal;
            gridY <= lastHorizontal;
            gridY++
        ) {
            if (gridY % 5 !== 0) {
                continue;
            }

            const screenY =
                height / 2 +
                (gridY * GRID_SIZE - offsetY) *
                    zoom;

            ctx.moveTo(
                0,
                Math.round(screenY) + 0.5
            );

            ctx.lineTo(
                width,
                Math.round(screenY) + 0.5
            );
        }

        ctx.strokeStyle =
            GRID_MAJOR_COLOR;

        ctx.stroke();

        ctx.beginPath();

        if (
            centerX >= 0 &&
            centerX <= width
        ) {
            ctx.moveTo(
                Math.round(centerX) + 0.5,
                0
            );

            ctx.lineTo(
                Math.round(centerX) + 0.5,
                height
            );
        }

        if (
            centerY >= 0 &&
            centerY <= height
        ) {
            ctx.moveTo(
                0,
                Math.round(centerY) + 0.5
            );

            ctx.lineTo(
                width,
                Math.round(centerY) + 0.5
            );
        }

        ctx.strokeStyle =
            AXIS_COLOR;

        ctx.stroke();

        ctx.restore();
    }

    function drawBlock(block) {
        const worldX =
            block.x * GRID_SIZE;

        const worldY =
            block.y * GRID_SIZE;

        const screen =
            worldToScreen(
                worldX,
                worldY
            );

        const size =
            GRID_SIZE * zoom;

        const halfSize =
            size / 2;

        if (
            screen.x + halfSize < 0 ||
            screen.x - halfSize > width ||
            screen.y + halfSize < 0 ||
            screen.y - halfSize > height
        ) {
            return;
        }

        const glowSize =
            Math.max(
                8,
                size * 0.45
            );

        ctx.save();

        ctx.shadowColor =
            block.color;

        ctx.shadowBlur =
            glowSize;

        ctx.fillStyle =
            block.color;

        ctx.fillRect(
            screen.x - halfSize,
            screen.y - halfSize,
            size,
            size
        );

        ctx.shadowBlur = 0;

        ctx.strokeStyle =
            "rgba(255, 255, 255, 0.75)";

        ctx.lineWidth =
            Math.max(
                1,
                Math.min(
                    2,
                    zoom * 1.5
                )
            );

        ctx.strokeRect(
            screen.x - halfSize + 0.5,
            screen.y - halfSize + 0.5,
            Math.max(0, size - 1),
            Math.max(0, size - 1)
        );

        if (size > 16) {
            const innerPadding =
                Math.max(
                    2,
                    size * 0.16
                );

            ctx.strokeStyle =
                "rgba(255, 255, 255, 0.24)";

            ctx.lineWidth = 1;

            ctx.strokeRect(
                screen.x -
                    halfSize +
                    innerPadding,
                screen.y -
                    halfSize +
                    innerPadding,
                size -
                    innerPadding * 2,
                size -
                    innerPadding * 2
            );
        }

        ctx.restore();
    }

    function drawBlocks() {
        for (const block of blocks.values()) {
            drawBlock(block);
        }
    }

    function drawCenterMarker() {
        const markerSize = 4;

        const centerScreenX =
            width / 2;

        const centerScreenY =
            height / 2;

        ctx.save();

        ctx.fillStyle =
            "rgba(255, 255, 255, 0.6)";

        ctx.fillRect(
            centerScreenX -
                markerSize / 2,
            centerScreenY -
                markerSize / 2,
            markerSize,
            markerSize
        );

        ctx.restore();
    }

    function updateCameraSmoothly() {
        offsetX +=
            (targetOffsetX - offsetX) *
            PAN_SMOOTHING;

        offsetY +=
            (targetOffsetY - offsetY) *
            PAN_SMOOTHING;

        zoom +=
            (targetZoom - zoom) *
            ZOOM_SMOOTHING;

        if (
            Math.abs(
                targetOffsetX - offsetX
            ) < 0.001
        ) {
            offsetX = targetOffsetX;
        }

        if (
            Math.abs(
                targetOffsetY - offsetY
            ) < 0.001
        ) {
            offsetY = targetOffsetY;
        }

        if (
            Math.abs(
                targetZoom - zoom
            ) < 0.0001
        ) {
            zoom = targetZoom;
        }
    }

    function updateCoordinates() {
        if (coordinateX) {
            coordinateX.innerText =
                Math.round(
                    offsetX
                ).toString();
        }

        if (coordinateY) {
            coordinateY.innerText =
                Math.round(
                    offsetY
                ).toString();
        }
    }

    function render() {
        ctx.setTransform(
            devicePixelRatio,
            0,
            0,
            devicePixelRatio,
            0,
            0
        );

        drawBackground();

        drawGrid();

        drawBlocks();

        drawCenterMarker();

        updateCoordinates();
    }

    function animationLoop() {
        updateCameraSmoothly();

        updateCoordinates();

        render();

        animationFrameId =
            window.requestAnimationFrame(
                animationLoop
            );
    }

    function handlePointerDown(event) {
        if (event.button !== 0) {
            return;
        }

        const position =
            getPointerPosition(event);

        isDragging = true;

        dragMoved = false;

        pointerDownTime =
            performance.now();

        pointerStartX =
            position.x;

        pointerStartY =
            position.y;

        lastPointerX =
            position.x;

        lastPointerY =
            position.y;

        dragStartOffsetX =
            targetOffsetX;

        dragStartOffsetY =
            targetOffsetY;

        canvas.style.cursor =
            "grabbing";

        canvas.setPointerCapture(
            event.pointerId
        );
    }

    function handlePointerMove(event) {
        if (!isDragging) {
            return;
        }

        const position =
            getPointerPosition(event);

        const totalDeltaX =
            position.x -
            pointerStartX;

        const totalDeltaY =
            position.y -
            pointerStartY;

        const distance =
            Math.sqrt(
                totalDeltaX *
                    totalDeltaX +
                totalDeltaY *
                    totalDeltaY
            );

        if (distance > 5) {
            dragMoved = true;
        }

        const worldDeltaX =
            (position.x -
                lastPointerX) /
            zoom;

        const worldDeltaY =
            (position.y -
                lastPointerY) /
            zoom;

        targetOffsetX -=
            worldDeltaX;

        targetOffsetY -=
            worldDeltaY;

        dragStartOffsetX =
            targetOffsetX;

        dragStartOffsetY =
            targetOffsetY;

        lastPointerX =
            position.x;

        lastPointerY =
            position.y;
    }

    function handlePointerUp(event) {
        if (event.button !== 0) {
            return;
        }

        const position =
            getPointerPosition(event);

        const duration =
            performance.now() -
            pointerDownTime;

        const wasClick =
            !dragMoved &&
            duration < 350;

        isDragging = false;

        canvas.style.cursor =
            "crosshair";

        if (wasClick) {
            handleCanvasClick(
                position.x,
                position.y
            );
        }

        try {
            canvas.releasePointerCapture(
                event.pointerId
            );
        } catch (error) {
            void error;
        }
    }

    function handlePointerCancel(event) {
        isDragging = false;

        dragMoved = true;

        canvas.style.cursor =
            "crosshair";

        try {
            canvas.releasePointerCapture(
                event.pointerId
            );
        } catch (error) {
            void error;
        }
    }

    function handleCanvasClick(
        screenX,
        screenY
    ) {
        const world =
            screenToWorld(
                screenX,
                screenY
            );

        const grid =
            getGridCoordinate(
                world.x,
                world.y
            );

        createBlock(
            grid.x,
            grid.y
        );
    }

    function handleWheel(event) {
        event.preventDefault();

        const position =
            getPointerPosition(event);

        const worldBeforeZoom =
            screenToWorld(
                position.x,
                position.y
            );

        const zoomMultiplier =
            Math.exp(
                -event.deltaY * 0.001
            );

        targetZoom *=
            zoomMultiplier;

        targetZoom =
            Math.max(
                MIN_ZOOM,
                Math.min(
                    MAX_ZOOM,
                    targetZoom
                )
            );

        const worldAfterZoom =
            {
                x:
                    (position.x -
                        width / 2) /
                        targetZoom +
                    targetOffsetX,

                y:
                    (position.y -
                        height / 2) /
                        targetZoom +
                    targetOffsetY
            };

        targetOffsetX +=
            worldBeforeZoom.x -
            worldAfterZoom.x;

        targetOffsetY +=
            worldBeforeZoom.y -
            worldAfterZoom.y;
    }

    canvas.addEventListener(
        "pointerdown",
        handlePointerDown
    );

    canvas.addEventListener(
        "pointermove",
        handlePointerMove
    );

    canvas.addEventListener(
        "pointerup",
        handlePointerUp
    );

    canvas.addEventListener(
        "pointercancel",
        handlePointerCancel
    );

    canvas.addEventListener(
        "wheel",
        handleWheel,
        {
            passive: false
        }
    );

    window.addEventListener(
        "resize",
        resizeCanvas
    );

    window.addEventListener(
        "blur",
        function () {
            if (isDragging) {
                isDragging = false;

                dragMoved = true;

                canvas.style.cursor =
                    "crosshair";
            }
        }
    );

    window.addEventListener(
        "beforeunload",
        function () {
            if (animationFrameId) {
                window.cancelAnimationFrame(
                    animationFrameId
                );
            }
        }
    );

    resizeCanvas();

    render();

    animationLoop();
})();