(function () {
    "use strict";

    if (typeof THREE === "undefined") {
        throw new Error("Three.js r128 is not loaded.");
    }

    const canvas = document.getElementById("infiniteCanvas");
    const coordinateX = document.getElementById("coordinateX");
    const coordinateY = document.getElementById("coordinateY");

    if (!canvas) {
        throw new Error('Canvas element with ID "infiniteCanvas" was not found.');
    }

    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x0b0b0e);

    const camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        0.1,
        10000
    );

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        powerPreference: "high-performance"
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const ambientLight = new THREE.AmbientLight(
        0xffffff,
        1.5
    );

    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
        0xffffff,
        2
    );

    directionalLight.position.set(20, 50, 20);
    scene.add(directionalLight);

    const groundGeometry = new THREE.PlaneGeometry(
        100000,
        100000
    );

    const groundMaterial = new THREE.MeshBasicMaterial({
        color: 0x0b0b0e,
        side: THREE.DoubleSide
    });

    const ground = new THREE.Mesh(
        groundGeometry,
        groundMaterial
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;

    scene.add(ground);

    const gridSize = 500;
    const gridDivisions = 500;

    const grid = new THREE.GridHelper(
        gridSize,
        gridDivisions,
        0x303038,
        0x18181e
    );

    grid.position.y = 0;

    scene.add(grid);

    const cubeGeometry = new THREE.BoxGeometry(
        1,
        1,
        1
    );

    const cubes = [];

    const objectsGroup = new THREE.Group();

    scene.add(objectsGroup);

    const raycaster = new THREE.Raycaster();

    const mouse = new THREE.Vector2();

    const horizontalPlane = new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        0
    );

    const intersection = new THREE.Vector3();

    let cameraX = 0;
    let cameraZ = 0;

    let targetCameraX = 0;
    let targetCameraZ = 0;

    let cameraDistance = 35;
    let targetCameraDistance = 35;

    let isDragging = false;
    let dragMoved = false;

    let dragStartX = 0;
    let dragStartY = 0;

    let dragCameraStartX = 0;
    let dragCameraStartZ = 0;

    let pointerDownTime = 0;

    const gridSnap = 1;

    function snapToGrid(value) {
        return Math.round(value / gridSnap) * gridSnap;
    }

    function updateMousePosition(event) {
        const rect = canvas.getBoundingClientRect();

        mouse.x =
            ((event.clientX - rect.left) / rect.width) * 2 - 1;

        mouse.y =
            -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function getPlaneIntersection(event) {
        updateMousePosition(event);

        raycaster.setFromCamera(mouse, camera);

        const hit = raycaster.ray.intersectPlane(
            horizontalPlane,
            intersection
        );

        if (!hit) {
            return null;
        }

        return intersection.clone();
    }

    function cubeExistsAt(x, z) {
        for (let i = 0; i < cubes.length; i++) {
            const cube = cubes[i];

            if (
                Math.abs(cube.position.x - x) < 0.001 &&
                Math.abs(cube.position.z - z) < 0.001
            ) {
                return true;
            }
        }

        return false;
    }

    function createNeonCube(x, z) {
        if (cubeExistsAt(x, z)) {
            return;
        }

        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff
        });

        const cube = new THREE.Mesh(
            cubeGeometry,
            material
        );

        cube.position.set(
            x,
            0.5,
            z
        );

        cube.scale.set(
            0.001,
            0.001,
            0.001
        );

        cube.userData.spawnProgress = 0;

        objectsGroup.add(cube);
        cubes.push(cube);
    }

    function handleCanvasClick(event) {
        const point = getPlaneIntersection(event);

        if (!point) {
            return;
        }

        const x = snapToGrid(point.x);
        const z = snapToGrid(point.z);

        createNeonCube(x, z);
    }

    function updateCamera() {
        cameraX = THREE.MathUtils.lerp(
            cameraX,
            targetCameraX,
            0.12
        );

        cameraZ = THREE.MathUtils.lerp(
            cameraZ,
            targetCameraZ,
            0.12
        );

        cameraDistance = THREE.MathUtils.lerp(
            cameraDistance,
            targetCameraDistance,
            0.12
        );

        const cameraHeight =
            cameraDistance * 0.8;

        camera.position.set(
            cameraX,
            cameraHeight,
            cameraZ + cameraDistance
        );

        camera.lookAt(
            cameraX,
            0,
            cameraZ
        );
    }

    function updateCoordinates() {
        if (coordinateX) {
            coordinateX.innerText =
                Math.round(cameraX).toString();
        }

        if (coordinateY) {
            coordinateY.innerText =
                Math.round(cameraZ).toString();
        }
    }

    function updateInfiniteGrid() {
        const gridOffsetX =
            Math.floor(cameraX / gridSize) * gridSize;

        const gridOffsetZ =
            Math.floor(cameraZ / gridSize) * gridSize;

        grid.position.x = gridOffsetX;
        grid.position.z = gridOffsetZ;
    }

    function updateCubes() {
        for (let i = 0; i < cubes.length; i++) {
            const cube = cubes[i];

            if (cube.userData.spawnProgress < 1) {
                cube.userData.spawnProgress += 0.08;

                if (cube.userData.spawnProgress > 1) {
                    cube.userData.spawnProgress = 1;
                }

                const progress =
                    cube.userData.spawnProgress;

                const eased =
                    1 - Math.pow(1 - progress, 3);

                cube.scale.set(
                    eased,
                    eased,
                    eased
                );
            }
        }
    }

    canvas.addEventListener(
        "pointerdown",
        function (event) {
            if (event.button !== 0) {
                return;
            }

            isDragging = true;
            dragMoved = false;

            pointerDownTime =
                performance.now();

            dragStartX = event.clientX;
            dragStartY = event.clientY;

            dragCameraStartX = targetCameraX;
            dragCameraStartZ = targetCameraZ;

            canvas.style.cursor = "grabbing";

            canvas.setPointerCapture(
                event.pointerId
            );
        }
    );

    canvas.addEventListener(
        "pointermove",
        function (event) {
            if (!isDragging) {
                return;
            }

            const deltaX =
                event.clientX - dragStartX;

            const deltaY =
                event.clientY - dragStartY;

            if (
                Math.abs(deltaX) > 4 ||
                Math.abs(deltaY) > 4
            ) {
                dragMoved = true;
            }

            const panSpeed =
                cameraDistance * 0.0025;

            targetCameraX =
                dragCameraStartX -
                deltaX * panSpeed;

            targetCameraZ =
                dragCameraStartZ +
                deltaY * panSpeed;
        }
    );

    canvas.addEventListener(
        "pointerup",
        function (event) {
            if (event.button !== 0) {
                return;
            }

            const clickDuration =
                performance.now() -
                pointerDownTime;

            const wasClick =
                !dragMoved &&
                clickDuration < 350;

            if (wasClick) {
                handleCanvasClick(event);
            }

            isDragging = false;

            canvas.style.cursor = "crosshair";

            try {
                canvas.releasePointerCapture(
                    event.pointerId
                );
            } catch (error) {
                console.debug(
                    "Pointer capture was already released."
                );
            }
        }
    );

    canvas.addEventListener(
        "pointercancel",
        function (event) {
            isDragging = false;

            canvas.style.cursor = "crosshair";

            try {
                canvas.releasePointerCapture(
                    event.pointerId
                );
            } catch (error) {
                console.debug(
                    "Pointer capture was already released."
                );
            }
        }
    );

    canvas.addEventListener(
        "wheel",
        function (event) {
            event.preventDefault();

            const zoomFactor =
                Math.exp(event.deltaY * 0.0015);

            targetCameraDistance *= zoomFactor;

            targetCameraDistance =
                THREE.MathUtils.clamp(
                    targetCameraDistance,
                    5,
                    250
                );
        },
        {
            passive: false
        }
    );

    window.addEventListener(
        "resize",
        function () {
            camera.aspect =
                window.innerWidth /
                window.innerHeight;

            camera.updateProjectionMatrix();

            renderer.setPixelRatio(
                Math.min(window.devicePixelRatio, 2)
            );

            renderer.setSize(
                window.innerWidth,
                window.innerHeight
            );
        }
    );

    camera.position.set(
        0,
        28,
        35
    );

    camera.lookAt(
        0,
        0,
        0
    );

    updateCoordinates();
    updateInfiniteGrid();

    function animate() {
        requestAnimationFrame(animate);

        updateCamera();
        updateCoordinates();
        updateInfiniteGrid();
        updateCubes();

        renderer.render(
            scene,
            camera
        );
    }

    animate();
})();