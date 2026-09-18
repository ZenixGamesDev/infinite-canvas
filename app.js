(function () {
"use strict";

```
const THREE_CDN =
    "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.min.js";

const canvas = document.getElementById("infiniteCanvas");
const coordinateX = document.getElementById("coordinateX");
const coordinateY = document.getElementById("coordinateY");

if (!canvas) {
    throw new Error("Element #infiniteCanvas was not found.");
}

function loadThreeJS() {
    return new Promise(function (resolve, reject) {
        if (window.THREE) {
            resolve();
            return;
        }

        const existingScript = document.querySelector(
            'script[src="' + THREE_CDN + '"]'
        );

        if (existingScript) {
            existingScript.addEventListener("load", resolve, {
                once: true
            });

            existingScript.addEventListener("error", reject, {
                once: true
            });

            return;
        }

        const script = document.createElement("script");

        script.src = THREE_CDN;
        script.async = true;

        script.onload = function () {
            if (window.THREE) {
                resolve();
            } else {
                reject(
                    new Error("Three.js loaded but window.THREE is unavailable.")
                );
            }
        };

        script.onerror = function () {
            reject(
                new Error("Failed to load Three.js from the CDN.")
            );
        };

        document.head.appendChild(script);
    });
}

loadThreeJS()
    .then(function () {
        initializeInfiniteCanvas();
    })
    .catch(function (error) {
        console.error(error);
    });

function initializeInfiniteCanvas() {
    const THREE = window.THREE;

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

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.setAnimationLoop(animate);

    const ambientLight = new THREE.AmbientLight(
        0xffffff,
        1.5
    );

    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
        0xffffff,
        2.5
    );

    directionalLight.position.set(
        30,
        50,
        20
    );

    scene.add(directionalLight);

    const planeSize = 100000;

    const planeGeometry = new THREE.PlaneGeometry(
        planeSize,
        planeSize
    );

    const planeMaterial = new THREE.MeshBasicMaterial({
        color: 0x0b0b0e,
        side: THREE.DoubleSide
    });

    const plane = new THREE.Mesh(
        planeGeometry,
        planeMaterial
    );

    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;

    scene.add(plane);

    const gridGroup = new THREE.Group();

    scene.add(gridGroup);

    const GRID_SIZE = 200;
    const GRID_DIVISIONS = 200;

    const grid = new THREE.GridHelper(
        GRID_SIZE,
        GRID_DIVISIONS,
        0x282830,
        0x15151b
    );

    grid.position.y = 0.01;

    gridGroup.add(grid);

    const xAxisGeometry =
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(
                -GRID_SIZE / 2,
                0.015,
                0
            ),
            new THREE.Vector3(
                GRID_SIZE / 2,
                0.015,
                0
            )
        ]);

    const zAxisGeometry =
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(
                0,
                0.015,
                -GRID_SIZE / 2
            ),
            new THREE.Vector3(
                0,
                0.015,
                GRID_SIZE / 2
            )
        ]);

    const xAxisMaterial = new THREE.LineBasicMaterial({
        color: 0x40404b,
        transparent: true,
        opacity: 0.7
    });

    const zAxisMaterial = new THREE.LineBasicMaterial({
        color: 0x40404b,
        transparent: true,
        opacity: 0.7
    });

    const xAxis = new THREE.Line(
        xAxisGeometry,
        xAxisMaterial
    );

    const zAxis = new THREE.Line(
        zAxisGeometry,
        zAxisMaterial
    );

    gridGroup.add(xAxis);
    gridGroup.add(zAxis);

    const objectsGroup = new THREE.Group();

    scene.add(objectsGroup);

    const cubes = [];

    const cubeGeometry = new THREE.BoxGeometry(
        0.9,
        0.9,
        0.9
    );

    const cubeEdgesGeometry =
        new THREE.EdgesGeometry(cubeGeometry);

    const raycaster = new THREE.Raycaster();

    const mouse = new THREE.Vector2();

    const intersectionPoint =
        new THREE.Vector3();

    const groundPlane = new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        0
    );

    const cameraTarget = new THREE.Vector3();

    let cameraX = 0;
    let cameraZ = 0;

    let targetCameraX = 0;
    let targetCameraZ = 0;

    let cameraDistance = 35;
    let targetCameraDistance = 35;

    let isDragging = false;
    let movedDuringDrag = false;

    let dragStartX = 0;
    let dragStartY = 0;

    let dragOriginX = 0;
    let dragOriginZ = 0;

    let pointerDownTime = 0;

    const GRID_SNAP = 1;

    function snapToGrid(value) {
        return Math.round(
            value / GRID_SNAP
        ) * GRID_SNAP;
    }

    function updateGrid() {
        const gridX =
            Math.floor(cameraX / GRID_SIZE) *
            GRID_SIZE;

        const gridZ =
            Math.floor(cameraZ / GRID_SIZE) *
            GRID_SIZE;

        gridGroup.position.x = gridX;
        gridGroup.position.z = gridZ;
    }

    function updateCamera() {
        cameraX = THREE.MathUtils.lerp(
            cameraX,
            targetCameraX,
            0.16
        );

        cameraZ = THREE.MathUtils.lerp(
            cameraZ,
            targetCameraZ,
            0.16
        );

        cameraDistance = THREE.MathUtils.lerp(
            cameraDistance,
            targetCameraDistance,
            0.14
        );

        const cameraHeight =
            cameraDistance * 0.86;

        camera.position.set(
            cameraX,
            cameraHeight,
            cameraZ + cameraDistance
        );

        cameraTarget.set(
            cameraX,
            0,
            cameraZ
        );

        camera.lookAt(cameraTarget);

        updateGrid();
    }

    function updateCoordinates() {
        if (coordinateX) {
            coordinateX.textContent =
                Math.round(cameraX).toString();
        }

        if (coordinateY) {
            coordinateY.textContent =
                Math.round(cameraZ).toString();
        }
    }

    function updateMouse(event) {
        const rect =
            canvas.getBoundingClientRect();

        mouse.x =
            ((event.clientX - rect.left) /
                rect.width) * 2 - 1;

        mouse.y =
            -((event.clientY - rect.top) /
                rect.height) * 2 + 1;
    }

    function getGridIntersection(event) {
        updateMouse(event);

        raycaster.setFromCamera(
            mouse,
            camera
        );

        const hit =
            raycaster.ray.intersectPlane(
                groundPlane,
                intersectionPoint
            );

        if (!hit) {
            return null;
        }

        return intersectionPoint.clone();
    }

    function cubeExistsAt(x, z) {
        for (let i = 0; i < cubes.length; i++) {
            const cube = cubes[i];

            if (
                Math.abs(cube.position.x - x) <
                    0.001 &&
                Math.abs(cube.position.z - z) <
                    0.001
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

        const material =
            new THREE.MeshStandardMaterial({
                color: 0x00eaff,
                emissive: 0x00d9ff,
                emissiveIntensity: 3,
                metalness: 0.35,
                roughness: 0.2
            });

        const cube = new THREE.Mesh(
            cubeGeometry,
            material
        );

        cube.position.set(
            x,
            0.45,
            z
        );

        cube.scale.setScalar(0.001);

        cube.userData.spawnStart =
            performance.now();

        cube.userData.spawnDuration =
            420;

        cube.userData.targetScale =
            1;

        const edgeMaterial =
            new THREE.LineBasicMaterial({
                color: 0x8cffff,
                transparent: true,
                opacity: 0.95
            });

        const edges = new THREE.LineSegments(
            cubeEdgesGeometry,
            edgeMaterial
        );

        edges.scale.copy(
            cube.scale
        );

        cube.add(edges);

        cube.userData.edges = edges;

        objectsGroup.add(cube);

        cubes.push(cube);
    }

    function createCubeFromClick(event) {
        const point =
            getGridIntersection(event);

        if (!point) {
            return;
        }

        const x = snapToGrid(point.x);
        const z = snapToGrid(point.z);

        createNeonCube(x, z);
    }

    function panFromDrag(event) {
        const deltaX =
            event.clientX - dragStartX;

        const deltaY =
            event.clientY - dragStartY;

        if (
            Math.abs(deltaX) > 4 ||
            Math.abs(deltaY) > 4
        ) {
            movedDuringDrag = true;
        }

        const panSpeed =
            cameraDistance * 0.0022;

        targetCameraX =
            dragOriginX -
            deltaX * panSpeed;

        targetCameraZ =
            dragOriginZ +
            deltaY * panSpeed;
    }

    canvas.addEventListener(
        "pointerdown",
        function (event) {
            if (event.button !== 0) {
                return;
            }

            isDragging = true;
            movedDuringDrag = false;

            pointerDownTime =
                performance.now();

            dragStartX =
                event.clientX;

            dragStartY =
                event.clientY;

            dragOriginX =
                targetCameraX;

            dragOriginZ =
                targetCameraZ;

            canvas.style.cursor =
                "grabbing";

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

            panFromDrag(event);
        }
    );

    canvas.addEventListener(
        "pointerup",
        function (event) {
            if (event.button !== 0) {
                return;
            }

            const duration =
                performance.now() -
                pointerDownTime;

            const isClick =
                !movedDuringDrag &&
                duration < 350;

            if (isClick) {
                createCubeFromClick(event);
            }

            isDragging = false;

            canvas.style.cursor =
                "crosshair";

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

            canvas.style.cursor =
                "crosshair";

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
                Math.exp(
                    event.deltaY * 0.0012
                );

            targetCameraDistance *=
                zoomFactor;

            targetCameraDistance =
                THREE.MathUtils.clamp(
                    targetCameraDistance,
                    5,
                    300
                );
        },
        {
            passive: false
        }
    );

    function updateCubes() {
        const now =
            performance.now();

        for (let i = 0; i < cubes.length; i++) {
            const cube = cubes[i];

            const elapsed =
                now -
                cube.userData.spawnStart;

            const progress =
                THREE.MathUtils.clamp(
                    elapsed /
                        cube.userData.spawnDuration,
                    0,
                    1
                );

            const eased =
                1 -
                Math.pow(
                    1 - progress,
                    3
                );

            const scale =
                Math.max(
                    0.001,
                    eased *
                        cube.userData.targetScale
                );

            cube.scale.setScalar(scale);

            if (cube.userData.edges) {
                cube.userData.edges.scale.setScalar(
                    1
                );
            }

            cube.rotation.y += 0.004;
        }
    }

    function animate() {
        updateCamera();

        updateCoordinates();

        updateCubes();

        renderer.render(
            scene,
            camera
        );
    }

    window.addEventListener(
        "resize",
        function () {
            camera.aspect =
                window.innerWidth /
                window.innerHeight;

            camera.updateProjectionMatrix();

            renderer.setPixelRatio(
                Math.min(
                    window.devicePixelRatio || 1,
                    2
                )
            );

            renderer.setSize(
                window.innerWidth,
                window.innerHeight
            );
        }
    );

    camera.position.set(
        0,
        cameraDistance * 0.86,
        cameraDistance
    );

    cameraTarget.set(
        0,
        0,
        0
    );

    camera.lookAt(cameraTarget);

    updateGrid();

    updateCoordinates();
}
```

})();
