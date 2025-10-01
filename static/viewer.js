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

}

document.addEventListener( 'DOMContentLoaded', () => new Model3DViewer () );
