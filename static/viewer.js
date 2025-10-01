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
        this.gridHelper = null;
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

        this.init();
        this.setupTheme();
        this.setupEventListeners();

        this.showWelcomeMessage( true );

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

        this.setupLighting();
        this.setupGridAndAxes();
        this.animate();
        this.handleResize();

    }

    setupLighting () {

        // Ambient light
        const ambientLight = new THREE.AmbientLight( 0x404040, 0.6 );
        this.scene.add( ambientLight );

        // Directional light
        const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
        directionalLight.position.set( 10, 10, 5 );
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add( directionalLight );

        // Point light
        const pointLight = new THREE.PointLight( 0xffffff, 0.5 );
        pointLight.position.set( -10, -10, -5 );
        this.scene.add( pointLight );

    }

    setupGridAndAxes () {

        // Grid helper
        this.gridHelper = new THREE.GridHelper( 20, 20, 0x888888, 0xcccccc );
        this.scene.add( this.gridHelper );

        // Axes helper
        this.axesHelper = new THREE.AxesHelper( 5 );
        this.axesHelper.visible = false;
        this.scene.add( this.axesHelper );

    }

    setupTheme () {

        const savedTheme = localStorage.getItem( 'theme' ) || 'light';
        this.isDarkTheme = savedTheme === 'dark';

        this.applyTheme();

    }

    toggleTheme () {

        this.isDarkTheme = ! this.isDarkTheme;
        localStorage.setItem( 'theme', this.isDarkTheme ? 'dark' : 'light' );

        this.applyTheme();

    }

    applyTheme () {

        const icon = document.getElementById( 'themeToggle' ).querySelector( 'i' );

        if ( this.isDarkTheme ) {

            document.documentElement.setAttribute( 'data-theme', 'dark' );
            this.scene.background = new THREE.Color( 0x1a1a1a );
            icon.className = 'fas fa-sun';

        } else {

            document.documentElement.removeAttribute( 'data-theme' );
            this.scene.background = new THREE.Color( 0xf8f9fa );
            icon.className = 'fas fa-moon';

        }

    }

    setupEventListeners () {

        // File upload
        document.getElementById( 'fileInput' ).addEventListener( 'change', ( e ) => {
            this.handleFileUpload( e.target.files );
        } );

        // View selection with smooth transitions
        document.getElementById( 'viewSelect' ).addEventListener( 'change', ( e ) => {
            this.setCameraViewSmooth( e.target.value );
        } );

        // Export buttons
        document.getElementById( 'exportPNG' ).addEventListener( 'click', () => {
            this.exportImage( 'png' );
        } );
        document.getElementById('exportJPEG').addEventListener( 'click', () => {
            this.exportImage( 'jpeg' );
        } );

        // Control buttons
        document.getElementById( 'resetView' ).addEventListener( 'click', () => {
            this.resetCameraView();
        } );
        document.getElementById( 'toggleGrid' ).addEventListener( 'click', () => {
            this.toggleGrid();
        } );
        document.getElementById( 'toggleWireframe' ).addEventListener( 'click', () => {
            this.toggleWireframe();
        } );
        document.getElementById( 'toggleAxes' ).addEventListener( 'click', () => {
            this.toggleAxes();
        } );
        document.getElementById( 'toggleAutoRotate' ).addEventListener( 'click', () => {
            this.toggleAutoRotate();
        } );

        // Theme toggle
        document.getElementById( 'themeToggle' ).addEventListener( 'click', () => {
            this.toggleTheme();
        } );

        // Window resize
        window.addEventListener( 'resize', () => this.handleResize() );

    }

    handleResize () {

        const canvas = document.getElementById( 'canvas' );
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( width, height );

    }

    animate () {

        requestAnimationFrame( () => this.animate() );

        if ( this.controls ) this.controls.update();
        this.renderer.render( this.scene, this.camera );

    }

    showLoading ( show ) {

        const loading = document.getElementById( 'loadingIndicator' );
        const welcome = document.getElementById( 'welcomeMessage' );

        if ( show ) {

            loading.classList.remove( 'hidden' );
            welcome.classList.add( 'hidden' );

        } else {

            loading.classList.add( 'hidden' );
            welcome.classList.add( 'hidden' );

        }

    }

    showWelcomeMessage ( show ) {

        const welcome = document.getElementById( 'welcomeMessage' );
        const ctrlBtns = document.getElementById( 'controlButtons' );
        const canvas = document.getElementById( 'canvas' );

        if ( show ) {

            welcome.classList.remove( 'hidden' );
            ctrlBtns.classList.add( 'hidden' );
            canvas.style.visibility = 'hidden';

        } else {

            welcome.classList.add( 'hidden' );
            ctrlBtns.classList.remove( 'hidden' );
            canvas.style.visibility = 'visible';

        }

    }

}

document.addEventListener( 'DOMContentLoaded', () => new Model3DViewer () );
