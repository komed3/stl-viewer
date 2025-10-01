/**
 * 3D Model Viewer - STL & OBJ Renderer
 * Build with Three.js
 */

class Model3DViewer {

    constructor () {

        this.loadedFiles = [];
        this.currentFileIndex = -1;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentModel = null;
        this.axesHelper = null;
        this.wireframeMode = false;
        this.isDarkTheme = false;
        this.autoRotate = false;

        this.targetCameraPosition = new THREE.Vector3();
        this.currentCameraPosition = new THREE.Vector3();
        this.isTransitioning = false;

        this.modelStats = {
            vertices: 0, faces: 0, volume: 0, surfaceArea: 0,
            boundingBox: { min: null, max: null }
        };

    }

    init () {

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0xf8f9fa );

        // Create camera
        const canvas = document.getElementById( 'canvas' );
        const aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera( 75, aspect, 0.1, 1000 );
        this.camera.position.set( 5, 5, 5 );

        // Create renderer
        this.renderer = new THREE.WebGLRenderer( { 
            canvas: canvas, antialias: true,
            preserveDrawingBuffer: true
        } );

        this.renderer.setSize( canvas.clientWidth, canvas.clientHeight );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Create controls
        this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;

    }

}

document.addEventListener( 'DOMContentLoaded', () => new Model3DViewer () );
