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

    handleFileUpload ( files ) {

        if ( files.length === 0 ) return;

        this.showLoading( true );
        this.showWelcomeMessage( false );

        // Clear previous files
        this.loadedFiles = [];
        this.currentFileIndex = -1;

        Array.from( files ).forEach( file => {

            const fileName = file.name.toLowerCase();

            if ( fileName.endsWith( '.stl' ) ) this.loadSTL( file );
            else if ( fileName.endsWith( '.obj' ) ) this.loadOBJ( file );
            else alert( `Unsupported file format: ${file.name}` );

        } );

        this.updateFileList( files );

    }

    loadSTL ( file ) {

        const reader = new FileReader();

        reader.onload = ( e ) => {

            try {

                const loader = new THREE.STLLoader();
                const geometry = loader.parse( e.target.result );

                this.createModelFromGeometry( geometry );
                this.loadedFiles.push( { file, geometry, type: 'stl' } );
                this.currentFileIndex = this.loadedFiles.length - 1;

            } catch ( err ) {

                console.error( 'Error loading STL:', err );
                alert( `Error loading STL file: ${file.name}` );

            }

        };

        reader.readAsArrayBuffer( file );

    }

    loadOBJ ( file ) {

        const reader = new FileReader();

        reader.onload = ( e ) => {

            try {

                const loader = new THREE.OBJLoader();
                const object = loader.parse( e.target.result );

                // Handle OBJ with multiple parts
                let geometry;

                if ( object.children.length > 0 ) {

                    const geometries = [];

                    object.traverse( ( child ) => { if ( child.isMesh ) {
                        child.geometry.computeBoundingBox();
                        geometries.push( child.geometry );
                    } } );

                    // Use first geometry for simplicity
                    if ( geometries.length > 0 ) geometry = geometries[ 0 ];

                } else geometry = object.geometry;

                if ( geometry ) {

                    this.createModelFromGeometry( geometry );
                    this.loadedFiles.push( { file, geometry, type: 'obj' } );
                    this.currentFileIndex = this.loadedFiles.length - 1;

                }

            } catch ( err ) {

                console.error( 'Error loading OBJ:', err );
                alert( `Error loading OBJ file: ${file.name}` );

            }

        };

        reader.readAsText( file );

    }

    createModelFromGeometry ( geometry ) {

        // Remove existing model
        if ( this.currentModel ) this.scene.remove( this.currentModel );

        // Center the geometry
        geometry.computeBoundingBox();
        const boundingBox = geometry.boundingBox;
        const center = new THREE.Vector3();
        boundingBox.getCenter( center );
        geometry.translate( -center.x, -center.y, -center.z );

        // Create material
        const material = new THREE.MeshPhongMaterial( {
            color: 0x4a9eff, specular: 0x111111, shininess: 100,
            side: THREE.DoubleSide
        } );

        // Create mesh
        this.currentModel = new THREE.Mesh( geometry, material );
        this.currentModel.castShadow = true;
        this.currentModel.receiveShadow = true;

        this.scene.add( this.currentModel );

        // Calculate and display statistics
        this.calculateModelStats( geometry );
        this.updateStatsDisplay();

        // Fit camera to model
        this.fitCameraToModel( geometry );

        // Hide loading indicator
        this.showLoading( false );

    }

    calculateModelStats ( geometry ) {

        const positions = geometry.attributes.position;
        const indices = geometry.index;

        this.modelStats.vertices = positions.count;
        this.modelStats.faces = indices ? indices.count / 3 : positions.count / 3;

        // Calculate bounding box
        geometry.computeBoundingBox();
        this.modelStats.boundingBox = geometry.boundingBox;

        // Calculate surface area and volume
        this.calculateSurfaceAreaAndVolume( geometry );

    }

    calculateSurfaceAreaAndVolume ( geometry ) {

        const positions = geometry.attributes.position;
        const indices = geometry.index;

        let surfaceArea = 0;
        let volume = 0;

        if ( indices ) {

            for ( let i = 0; i < indices.count; i += 3 ) {

                const a = indices.getX( i );
                const b = indices.getX( i + 1 );
                const c = indices.getX( i + 2 );

                const v1 = new THREE.Vector3(
                    positions.getX( a ),
                    positions.getY( a ),
                    positions.getZ( a )
                );

                const v2 = new THREE.Vector3(
                    positions.getX( b ),
                    positions.getY( b ),
                    positions.getZ( b )
                );

                const v3 = new THREE.Vector3(
                    positions.getX( c ),
                    positions.getY( c ),
                    positions.getZ( c )
                );

                const area = this.calculateTriangleArea( v1, v2, v3 );
                surfaceArea += area;
                volume += this.calculateSignedVolume( v1, v2, v3 );

            }

        } else {

            for ( let i = 0; i < positions.count; i += 9 ) {

                const v1 = new THREE.Vector3(
                    positions.getX( i ),
                    positions.getY( i ),
                    positions.getZ( i )
                );

                const v2 = new THREE.Vector3(
                    positions.getX( i + 3 ), 
                    positions.getY( i + 3 ),
                    positions.getZ( i + 3 )
                );

                const v3 = new THREE.Vector3(
                    positions.getX( i + 6 ),
                    positions.getY( i + 6 ),
                    positions.getZ( i + 6 )
                );

                const area = this.calculateTriangleArea( v1, v2, v3 );
                surfaceArea += area;
                volume += this.calculateSignedVolume( v1, v2, v3 );

            }

        }

        this.modelStats.surfaceArea = surfaceArea;
        this.modelStats.volume = Math.abs( volume );

    }

    calculateTriangleArea ( v1, v2, v3 ) {

        const edge1 = new THREE.Vector3().subVectors( v2, v1 );
        const edge2 = new THREE.Vector3().subVectors( v3, v1 );
        const cross = new THREE.Vector3().crossVectors( edge1, edge2 );

        return 0.5 * cross.length();

    }

    calculateSignedVolume ( v1, v2, v3 ) {

        return v1.dot( v2.cross( v3 ) ) / 6;

    }

    updateStatsDisplay () {

        document.getElementById( 'vertexCount' ).textContent = 
            this.modelStats.vertices.toLocaleString();
        document.getElementById( 'faceCount' ).textContent = 
            Math.floor( this.modelStats.faces ).toLocaleString();
        document.getElementById( 'volume' ).textContent = 
            this.modelStats.volume.toFixed( 2 ) + ' units³';
        document.getElementById( 'surfaceArea' ).textContent = 
            this.modelStats.surfaceArea.toFixed( 2 ) + ' units²';

        const bbox = this.modelStats.boundingBox;

        if ( bbox && bbox.min && bbox.max ) {

            const size = new THREE.Vector3();
            bbox.getSize( size );

            document.getElementById( 'boundingBox' ).textContent = 
                `${ size.x.toFixed( 2 ) } × ${ size.y.toFixed( 2 ) } × ${ size.z.toFixed( 2 ) }`;

        }

    }

    fitCameraToModel ( geometry ) {

        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox;
        const size = new THREE.Vector3();
        bbox.getSize( size );

        const maxDim = Math.max( size.x, size.y, size.z );
        const fov = this.camera.fov * ( Math.PI / 180 );
        let cameraZ = Math.abs( maxDim / 2 / Math.tan( fov / 2 ) );

        // Add some padding
        cameraZ *= 2.5;

        this.camera.position.set( cameraZ, cameraZ, cameraZ );
        this.camera.lookAt( 0, 0, 0 );

        this.controls.target.set( 0, 0, 0 );
        this.controls.update();

    }

    setCameraViewSmooth ( view ) {

        if ( ! this.currentModel || this.isTransitioning ) return;

        this.isTransitioning = true;

        const distance = this.camera.position.length();
        let targetPosition = new THREE.Vector3();

        switch ( view ) {

            case 'top': targetPosition.set( 0, distance, 0 ); break;
            case 'bottom': targetPosition.set( 0, -distance, 0 ); break;
            case 'front': targetPosition.set( 0, 0, distance ); break;
            case 'back': targetPosition.set( 0, 0, -distance ); break;
            case 'left': targetPosition.set( -distance, 0, 0 ); break;
            case 'right': targetPosition.set( distance, 0, 0 ); break;
            default: this.resetCameraView(); return;
        }

        this.animateCameraToPosition( targetPosition );

    }

    animateCameraToPosition ( targetPosition ) {

        const startPosition = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const duration = 1000;
        const startTime = Date.now();

        const animate = () => {

            const elapsed = Date.now() - startTime;
            const progress = Math.min( elapsed / duration, 1 );

            // Smooth easing function
            const easeProgress = 1 - Math.pow( 1 - progress, 3 );

            // Interpolate camera position
            this.camera.position.lerpVectors( startPosition, targetPosition, easeProgress );
            this.controls.target.lerpVectors( startTarget, new THREE.Vector3( 0, 0, 0 ), easeProgress );
            this.controls.update();

            if ( progress < 1 ) requestAnimationFrame( animate );
            else this.isTransitioning = false;

        };

        animate();

    }

    resetCameraView () {

        if ( ! this.currentModel ) return;

        this.fitCameraToModel( this.currentModel.geometry );

    }

    toggleWireframe () {

        this.wireframeMode = ! this.wireframeMode;

        if ( this.currentModel ) this.currentModel.material.wireframe = this.wireframeMode;

        // Update button state
        const btn = document.getElementById( 'toggleWireframe' );

        if ( this.wireframeMode ) btn.classList.add( 'active' );
        else btn.classList.remove( 'active' );

    }

    toggleGrid () {

        if ( this.gridHelper ) {

            this.gridHelper.visible = ! this.gridHelper.visible;

            // Update button state
            const btn = document.getElementById( 'toggleGrid' );

            if ( this.gridHelper.visible ) btn.classList.add( 'active' );
            else btn.classList.remove( 'active' );

        }

    }

    toggleAxes () {

        if ( this.axesHelper ) {

            this.axesHelper.visible = ! this.axesHelper.visible;

            // Update button state
            const btn = document.getElementById( 'toggleAxes' );

            if ( this.axesHelper.visible ) btn.classList.add( 'active' );
            else btn.classList.remove( 'active' );

        }

    }

    toggleAutoRotate () {

        this.autoRotate = ! this.autoRotate;
        this.controls.autoRotate = this.autoRotate;

        // Update button state and icon
        const btn = document.getElementById( 'toggleAutoRotate' );
        const icon = btn.querySelector( 'i' );

        if ( this.autoRotate ) {
            btn.classList.add( 'active' );
            icon.classList.add( 'rotating' );
            this.controls.autoRotateSpeed = 2.0;

        } else {

            btn.classList.remove( 'active' );
            icon.classList.remove( 'rotating' );
            this.controls.autoRotateSpeed = 0;

        }

    }

    exportImage ( format ) {

        if ( ! this.currentModel ) {

            alert( 'No model loaded to export' );
            return;

        }

        this.renderer.render( this.scene, this.camera );
        const canvas = this.renderer.domElement;
        const link = document.createElement( 'a' );
        link.download = `3d-model-${ Date.now() }.${format}`;

        if ( format === 'png' ) link.href = canvas.toDataURL( 'image/png' );
        else if ( format === 'jpeg' ) link.href = canvas.toDataURL( 'image/jpeg', 0.9 );

        document.body.appendChild( link );
        link.click();
        document.body.removeChild( link );

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
