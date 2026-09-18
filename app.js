"use strict";

(function () {
    if (typeof THREE === "undefined") {
        throw new Error("Three.js is not loaded.");
    }

    if (typeof THREE.OrbitControls !== "function") {
        throw new Error("THREE.OrbitControls is not loaded.");
    }

    const canvas = document.getElementById("infiniteCanvas");
    const coordinateX = document.getElementById("coordinateX");
    const coordinateY = document.getElementById("coordinateY");

    if (!canvas) {
        throw new Error('Canvas "#infiniteCanvas" was not found.');
    }

    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x0b0b0e);

    const camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        0.1,
        100000
    );

    camera.position.set(0, 35, 35);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 2)
    );

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setClearColor(0x0b0b0e, 1);

    const controls = new THREE.OrbitControls(
        camera,
        renderer.domElement
    );

    controls.enableRotate = false;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.screenSpacePanning = true;

    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;

    controls.zoomSpeed = 1.2;
    controls.panSpeed = 1.2;
    controls.minDistance = 3;
    controls.maxDistance = 5000;

    const ambientLight = new THREE.AmbientLight(
        0xffffff,
        1.5
    );

    scene.add(ambientLight);

    const gridSize = 1000;
    const gridDivisions = 100;

    const grid = new THREE.GridHelper(
        gridSize,
        gridDivisions,
        0x77777f,
        0x36363d
    );

    grid.position.set(0, 0, 0);

    scene.add(grid);

    const floorGeometry = new THREE.PlaneGeometry(
        200000,
        200000
    );

    const floorMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const floor = new THREE.Mesh(
        floorGeometry,
        floorMaterial
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;

    scene.add(floor);

    const objectsGroup = new THREE.Group();

    scene.add(objectsGroup);

    const cubeGeometry = new THREE.BoxGeometry(
        1,
        1,
        1
    );

    const cubes = [];

    const raycaster = new THREE.Raycaster();

    const mouse = new THREE.Vector2();

    const raycastPoint = new THREE.Vector3();

    let pointerDownX = 0;
    let pointerDownY = 0;
    let pointerDownTime = 0;
    let pointerMoved = false;

    const clickMovementThreshold = 6;
    const clickTimeThreshold = 350;

    function updateMouseCoordinates(event) {
        const rect = renderer.domElement.getBoundingClientRect();

        mouse.x =
            ((event.clientX - rect.left) / rect.width) * 2 - 1;

        mouse.y =
            -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function getFloorIntersection(event) {
        updateMouseCoordinates(event);

        raycaster.setFromCamera(
            mouse,
            camera
        );

        const intersections =
            raycaster.intersectObject(
                floor,
                false
            );

        if (intersections.length === 0) {
            return null;
        }

        raycastPoint.copy(
            intersections[0].point
        );

        return raycastPoint.clone();
    }

    function roundToGrid(value) {
        return Math.round(value);
    }

    function cubeExistsAt(x, z) {
        for (let i = 0; i < cubes.length; i++) {
            const cube = cubes[i];

            if (
                cube.userData.gridX === x &&
                cube.userData.gridZ === z
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

        const neonColors = [
            0xff1744,
            0x00eaff
        ];

        const color =
            neonColors[
                Math.floor(
                    Math.random() * neonColors.length
                )
            ];

        const material = new THREE.MeshBasicMaterial({
            color: color
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

        cube.userData.gridX = x;
        cube.userData.gridZ = z;
        cube.userData.targetScale = 1;
        cube.userData.spawnProgress = 0;

        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide,
            depthWrite: false
        });

        const glowGeometry = new THREE.BoxGeometry(
            1.18,
            1.18,
            1.18
        );

        const glow = new THREE.Mesh(
            glowGeometry,
            glowMaterial
        );

        glow.scale.set(
            0.001,
            0.001,
            0.001
        );

        cube.add(glow);

        cube.userData.glow = glow;

        objectsGroup.add(cube);

        cubes.push(cube);
    }

    function handleCanvasClick(event) {
        const point = getFloorIntersection(event);

        if (!point) {
            return;
        }

        const gridX = roundToGrid(point.x);
        const gridZ = roundToGrid(point.z);

        createNeonCube(
            gridX,
            gridZ
        );
    }

    window.addEventListener(
        "pointerdown",
        function (event) {
            if (
                event.target !== canvas &&
                event.target !== renderer.domElement
            ) {
                return;
            }

            if (event.button !== 0) {
                return;
            }

            pointerDownX = event.clientX;
            pointerDownY = event.clientY;
            pointerDownTime = performance.now();
            pointerMoved = false;
        }
    );

    window.addEventListener(
        "pointermove",
        function (event) {
            const deltaX =
                event.clientX - pointerDownX;

            const deltaY =
                event.clientY - pointerDownY;

            const distance =
                Math.sqrt(
                    deltaX * deltaX +
                    deltaY * deltaY
                );

            if (
                distance >
                clickMovementThreshold
            ) {
                pointerMoved = true;
            }
        }
    );

    window.addEventListener(
        "pointerup",
        function (event) {
            if (
                event.target !== canvas &&
                event.target !== renderer.domElement
            ) {
                return;
            }

            if (event.button !== 0) {
                return;
            }

            const duration =
                performance.now() -
                pointerDownTime;

            if (
                !pointerMoved &&
                duration <= clickTimeThreshold
            ) {
                handleCanvasClick(event);
            }
        }
    );

    window.addEventListener(
        "pointercancel",
        function () {
            pointerMoved = true;
        }
    );

    function updateInfiniteGrid() {
        const centerX = controls.target.x;
        const centerZ = controls.target.z;

        const halfGrid = gridSize / 2;

        const snappedX =
            Math.floor(
                centerX / gridSize
            ) * gridSize;

        const snappedZ =
            Math.floor(
                centerZ / gridSize
            ) * gridSize;

        grid.position.x =
            snappedX + halfGrid;

        grid.position.z =
            snappedZ + halfGrid;
    }

    function updateCoordinates() {
        if (coordinateX) {
            coordinateX.innerText =
                Math.round(camera.position.x).toString();
        }

        if (coordinateY) {
            coordinateY.innerText =
                Math.round(camera.position.z).toString();
        }
    }

    function updateCubes() {
        for (let i = 0; i < cubes.length; i++) {
            const cube = cubes[i];

            if (
                cube.userData.spawnProgress < 1
            ) {
                cube.userData.spawnProgress += 0.08;

                if (
                    cube.userData.spawnProgress > 1
                ) {
                    cube.userData.spawnProgress = 1;
                }

                const progress =
                    cube.userData.spawnProgress;

                const easedProgress =
                    1 -
                    Math.pow(
                        1 - progress,
                        3
                    );

                cube.scale.set(
                    easedProgress,
                    easedProgress,
                    easedProgress
                );

                if (cube.userData.glow) {
                    cube.userData.glow.scale.set(
                        easedProgress,
                        easedProgress,
                        easedProgress
                    );
                }
            }
        }
    }

    function handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.aspect =
            width / height;

        camera.updateProjectionMatrix();

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
                2
            )
        );

        renderer.setSize(
            width,
            height
        );
    }

    window.addEventListener(
        "resize",
        handleResize
    );

    function animate() {
        requestAnimationFrame(animate);

        controls.update();

        updateInfiniteGrid();

        updateCoordinates();

        updateCubes();

        renderer.render(
            scene,
            camera
        );
    }

    handleResize();

    controls.target.set(
        0,
        0,
        0
    );

    controls.update();

    updateInfiniteGrid();
    updateCoordinates();

    animate();
})();