import { Viewer } from './viewer.js';
import { load3DMFile } from './loader3dm.js';
import { initSelection } from './selection.js';
import { initInspector } from './inspector.js';
import { initLayerManager } from './layerManager.js';
import { exportGLB } from './exporter.js';
import { fitCamera, resetCamera, initSceneTools } from './sceneTools.js';
import { MATERIAL_PRESETS, applyMaterialPreset, getPresetsList } from './materialPresets.js';
import { applyDiamondMaterial, restoreOriginalMaterial, isDiamondMaterial } from './diamondMaterial.js';

class App {
    constructor() {
        this.viewer = null;
        this.activeModelRoot = null;
        this.selectedObject = null;
        this.loadedFileName = 'model';
        this.layers = new Map();
        this.objects = [];

        this.init();
    }

    init() {
        this.setupViewer();
        this.setupDragAndDrop();
        this.setupFileInput();
        this.setupToolbar();
        this.setupExportModal();
        this.setupPanelTabs();
        this.setStatus('Ready. Drag a .3dm file here.');
    }

    setupViewer() {
        this.viewer = new Viewer('canvas');
        initSceneTools(this.viewer.scene);
    }

    setupDragAndDrop() {
        const dropOverlay = document.getElementById('dropOverlay');
        const container = document.getElementById('container');

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropOverlay.classList.remove('hidden');
        });

        container.addEventListener('dragleave', (e) => {
            if (e.target === container) {
                dropOverlay.classList.add('hidden');
            }
        });

        dropOverlay.addEventListener('drop', (e) => {
            e.preventDefault();
            dropOverlay.classList.add('hidden');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.loadFile(files[0]);
            }
        });

        dropOverlay.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }

    setupFileInput() {
        const fileInput = document.getElementById('fileInput');

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                if (file) {
                    this.loadFile(file);
                }
                // Reset after loading
                setTimeout(() => {
                    fileInput.value = '';
                }, 100);
            }
        }, false);

        // Handle click for logging (debug)
        fileInput.addEventListener('click', (e) => {
            console.log('File input clicked');
        }, false);
    }

    async loadFile(file) {
        if (!file.name.toLowerCase().endsWith('.3dm')) {
            this.setStatus('Error: Only .3dm files are supported.');
            return;
        }

        this.setStatus(`Loading ${file.name}...`);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const object = await load3DMFile(arrayBuffer);

            // Remove previous model
            if (this.activeModelRoot) {
                this.viewer.scene.remove(this.activeModelRoot);
            }

            // Add new model
            this.activeModelRoot = object;
            this.viewer.scene.add(this.activeModelRoot);

            // Store filename for export
            this.loadedFileName = file.name.replace(/\.3dm$/i, '');

            // Normalize metadata and collect objects
            this.normalizeMetadata();
            this.buildLayerList();
            this.buildObjectList();

            // Fit camera to model
            fitCamera(this.viewer.camera, this.viewer.controls, this.activeModelRoot, this.viewer.scene);

            // Initialize selection and inspector
            initSelection(this.viewer, this.activeModelRoot, (selected) => {
                this.selectObject(selected);
            });
            initInspector(this, this.viewer);
            initLayerManager(this, this.viewer);

            this.setStatus(`Loaded: ${file.name}`);
        } catch (error) {
            console.error('Error loading file:', error);
            this.setStatus(`Error: ${error.message}`);
        }
    }

    normalizeMetadata() {
        if (!this.activeModelRoot) return;

        const meshes = [];
        this.activeModelRoot.traverse((child) => {
            if (child === this.activeModelRoot) return;
            if (child.isMesh || child.isLine || child.isPoints) {
                meshes.push(child);
            }
        });

        meshes.forEach((mesh) => {
            if (!mesh.userData.designBuddy) {
                mesh.userData.designBuddy = {
                    partName: mesh.name || `Object_${mesh.id}`,
                    layerName: 'Default',
                    originalRhinoLayerIndex: null,
                    originalRhinoObjectId: null,
                    objectType: mesh.type,
                    isSelectable: true
                };
            }

            const metadata = mesh.userData.designBuddy;
            if (!metadata.partName) metadata.partName = `Object_${mesh.id}`;
            if (!metadata.layerName) metadata.layerName = 'Default';
            mesh.name = `${metadata.layerName}/${metadata.partName}`;
        });
    }

    buildLayerList() {
        this.layers.clear();

        if (!this.activeModelRoot) return;

        // Collect all layers
        const layerSet = new Set();
        this.activeModelRoot.traverse((child) => {
            if (child.userData.designBuddy && child.userData.designBuddy.layerName) {
                layerSet.add(child.userData.designBuddy.layerName);
            }
        });

        // Ensure 'Default' layer exists
        layerSet.add('Default');

        layerSet.forEach((layerName) => {
            this.layers.set(layerName, {
                name: layerName,
                visible: true
            });
        });
    }

    buildObjectList() {
        this.objects = [];

        if (!this.activeModelRoot) return;

        this.activeModelRoot.traverse((child) => {
            if (child === this.activeModelRoot) return;
            if (child.isMesh || child.isLine || child.isPoints) {
                this.objects.push(child);
            }
        });
    }

    selectObject(object) {
        this.selectedObject = object;
        this.updateInspector();
        this.updateObjectsList();
    }

    updateInspector() {
        if (!this.selectedObject) {
            document.getElementById('inspectorContent').innerHTML = '<div class="inspector-empty">No object selected</div>';
            return;
        }

        const metadata = this.selectedObject.userData.designBuddy || {};
        let html = `
            <div class="inspector-section">
                <label>Name</label>
                <input type="text" id="objNameInput" class="input-field" value="${metadata.partName || ''}">
            </div>
            <div class="inspector-section">
                <label>Layer</label>
                <select id="objLayerSelect" class="input-field">
        `;

        this.layers.forEach((layer) => {
            const selected = layer.name === metadata.layerName ? 'selected' : '';
            html += `<option value="${layer.name}" ${selected}>${layer.name}</option>`;
        });

        html += `
                </select>
            </div>
            <div class="inspector-section">
                <label>Type</label>
                <div class="info-text">${metadata.objectType || this.selectedObject.type}</div>
            </div>
        `;

        // Material properties
        if (this.selectedObject.material) {
            html += this.buildMaterialEditor();
        } else {
            html += '<div class="info-text">No editable material</div>';
        }

        html += `
            <div class="inspector-section">
                <button id="isolateBtn" class="btn btn-small">Isolate</button>
                <button id="hideBtn" class="btn btn-small">Hide</button>
                <button id="showAllBtn" class="btn btn-small">Show All</button>
            </div>
        `;

        document.getElementById('inspectorContent').innerHTML = html;

        // Attach event listeners
        document.getElementById('objNameInput')?.addEventListener('change', (e) => {
            this.renameObject(e.target.value);
        });

        document.getElementById('objLayerSelect')?.addEventListener('change', (e) => {
            this.assignLayer(e.target.value);
        });

        document.getElementById('isolateBtn')?.addEventListener('click', () => this.isolateObject());
        document.getElementById('hideBtn')?.addEventListener('click', () => this.hideObject());
        document.getElementById('showAllBtn')?.addEventListener('click', () => this.showAllObjects());
    }

    buildMaterialEditor() {
        const material = this.selectedObject.material;
        let html = '<div class="inspector-section"><label>Material</label>';

        // Material Presets
        const presets = getPresetsList();
        html += `
            <div class="material-prop">
                <label>Presets</label>
                <select id="matPresetSelect" class="input-field">
                    <option value="">-- Select Preset --</option>
        `;

        presets.forEach(({ key, name }) => {
            html += `<option value="${key}">${name}</option>`;
        });

        html += `
                </select>
            </div>
        `;

        // Color
        if (material.color) {
            const color = material.color.getHexString();
            html += `
                <div class="material-prop">
                    <label>Color</label>
                    <input type="color" id="matColorInput" class="color-input" value="#${color}">
                </div>
            `;
        }

        // Metalness
        if (material.metalness !== undefined) {
            html += `
                <div class="material-prop">
                    <label>Metalness <span id="metalSliderVal">${material.metalness.toFixed(2)}</span></label>
                    <input type="range" id="matMetalnessInput" class="slider" min="0" max="1" step="0.01" value="${material.metalness}">
                </div>
            `;
        }

        // Roughness
        if (material.roughness !== undefined) {
            html += `
                <div class="material-prop">
                    <label>Roughness <span id="roughSliderVal">${material.roughness.toFixed(2)}</span></label>
                    <input type="range" id="matRoughnessInput" class="slider" min="0" max="1" step="0.01" value="${material.roughness}">
                </div>
            `;
        }

        // Dispersion (chromatic aberration effect)
        if (material.dispersion !== undefined) {
            html += `
                <div class="material-prop">
                    <label>Dispersion <span id="dispersionSliderVal">${material.dispersion.toFixed(3)}</span></label>
                    <input type="range" id="matDispersionInput" class="slider" min="0" max="1" step="0.001" value="${material.dispersion}">
                </div>
            `;
        }

        // Opacity
        if (material.opacity !== undefined && material.transparent) {
            html += `
                <div class="material-prop">
                    <label>Opacity <span id="opacitySliderVal">${material.opacity.toFixed(2)}</span></label>
                    <input type="range" id="matOpacityInput" class="slider" min="0" max="1" step="0.01" value="${material.opacity}">
                </div>
            `;
        }

        html += '</div>';

        // Attach listeners after DOM update
        setTimeout(() => {
            document.getElementById('matPresetSelect')?.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.applyMaterialPreset(e.target.value);
                }
            });

            document.getElementById('matColorInput')?.addEventListener('change', (e) => {
                this.setMaterialColor(e.target.value);
            });

            document.getElementById('matMetalnessInput')?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.selectedObject.material.metalness = val;
                document.getElementById('metalSliderVal').textContent = val.toFixed(2);
                this.viewer.render();
            });

            document.getElementById('matRoughnessInput')?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.selectedObject.material.roughness = val;
                document.getElementById('roughSliderVal').textContent = val.toFixed(2);
                this.viewer.render();
            });

            document.getElementById('matDispersionInput')?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.selectedObject.material.dispersion = val;
                document.getElementById('dispersionSliderVal').textContent = val.toFixed(3);
                this.viewer.render();
            });

            document.getElementById('matOpacityInput')?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.selectedObject.material.opacity = val;
                document.getElementById('opacitySliderVal').textContent = val.toFixed(2);
                this.viewer.render();
            });
        }, 0);

        return html;
    }

    renameObject(newName) {
        if (!this.selectedObject) return;
        const metadata = this.selectedObject.userData.designBuddy;
        metadata.partName = newName;
        this.selectedObject.name = `${metadata.layerName}/${newName}`;
        this.updateObjectsList();
    }

    assignLayer(layerName) {
        if (!this.selectedObject) return;
        const metadata = this.selectedObject.userData.designBuddy;
        metadata.layerName = layerName;
        this.selectedObject.name = `${layerName}/${metadata.partName}`;
        this.updateObjectsList();
        this.updateLayersList();
    }

    setMaterialColor(hexColor) {
        if (!this.selectedObject?.material) return;
        this.selectedObject.material.color.setHex(parseInt(hexColor.substring(1), 16));
        this.viewer.render();
    }

    applyMaterialPreset(presetKey) {
        if (!this.selectedObject?.material) return;

        const mesh = this.selectedObject;
        const preset = MATERIAL_PRESETS[presetKey];

        if (presetKey === 'diamond' && mesh.isMesh && mesh.geometry) {
            applyDiamondMaterial(mesh, {
                color: preset.color,
                bounces: 3,
                ior: 2.4
            });
            this.updateInspector();
            this.viewer.render();
            return;
        }

        if (isDiamondMaterial(mesh.material)) {
            restoreOriginalMaterial(mesh);
        }

        applyMaterialPreset(mesh.material, presetKey);
        this.updateInspector();
        this.viewer.render();
    }

    isolateObject() {
        if (!this.selectedObject) return;
        this.activeModelRoot.traverse((child) => {
            if (child === this.activeModelRoot) return;
            if (child.isMesh || child.isLine || child.isPoints) {
                child.visible = child === this.selectedObject;
            }
        });
        this.viewer.render();
    }

    hideObject() {
        if (!this.selectedObject) return;
        this.selectedObject.visible = false;
        this.viewer.render();
    }

    showAllObjects() {
        if (!this.activeModelRoot) return;
        this.activeModelRoot.traverse((child) => {
            if (child === this.activeModelRoot) return;
            if (child.isMesh || child.isLine || child.isPoints) {
                child.visible = true;
            }
        });
        this.viewer.render();
    }

    updateObjectsList() {
        const list = document.getElementById('objectsList');
        if (!list) return;

        let html = '';
        this.objects.forEach((obj) => {
            const metadata = obj.userData.designBuddy || {};
            const selected = obj === this.selectedObject ? 'active' : '';
            html += `
                <div class="object-item ${selected}" data-id="${obj.id}">
                    <span>${metadata.partName || obj.name}</span>
                    <span class="object-layer">${metadata.layerName || 'Default'}</span>
                </div>
            `;
        });

        list.innerHTML = html;

        list.querySelectorAll('.object-item').forEach((item) => {
            item.addEventListener('click', () => {
                const obj = this.objects.find((o) => o.id === parseInt(item.dataset.id));
                if (obj) this.selectObject(obj);
            });
        });
    }

    updateLayersList() {
        const list = document.getElementById('layersList');
        if (!list) return;

        let html = '';
        this.layers.forEach((layer) => {
            html += `
                <div class="layer-item">
                    <input type="checkbox" class="layer-visibility" data-layer="${layer.name}" ${layer.visible ? 'checked' : ''}>
                    <span class="layer-name">${layer.name}</span>
                </div>
            `;
        });

        list.innerHTML = html;

        list.querySelectorAll('.layer-visibility').forEach((checkbox) => {
            checkbox.addEventListener('change', (e) => {
                this.toggleLayerVisibility(e.target.dataset.layer, e.target.checked);
            });
        });
    }

    toggleLayerVisibility(layerName, visible) {
        const layer = this.layers.get(layerName);
        if (layer) layer.visible = visible;

        this.activeModelRoot.traverse((child) => {
            if (child.userData.designBuddy && child.userData.designBuddy.layerName === layerName) {
                child.visible = visible;
            }
        });

        this.viewer.render();
    }

    addLayer(layerName) {
        if (!layerName.trim()) return;
        if (this.layers.has(layerName)) return;

        this.layers.set(layerName, {
            name: layerName,
            visible: true
        });

        this.updateLayersList();
    }

    setupToolbar() {
        const importBtn = document.getElementById('importBtn');
        const fileInput = document.getElementById('fileInput');

        const triggerFileInput = () => {
            this.setStatus('Opening file picker...');
            fileInput.value = '';
            fileInput.focus();
            setTimeout(() => {
                fileInput.click();
            }, 50);
        };

        importBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerFileInput();
        });

        // Support touch events explicitly (important for iOS)
        importBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerFileInput();
        });

        document.getElementById('fitBtn').addEventListener('click', () => {
            fitCamera(this.viewer.camera, this.viewer.controls, this.activeModelRoot, this.viewer.scene);
        });

        document.getElementById('resetCameraBtn').addEventListener('click', () => {
            resetCamera(this.viewer.camera, this.viewer.controls);
        });

        document.getElementById('toggleGridBtn').addEventListener('click', () => {
            const grid = this.viewer.scene.getObjectByName('grid');
            if (grid) grid.visible = !grid.visible;
            this.viewer.render();
        });

        document.getElementById('toggleAxesBtn').addEventListener('click', () => {
            const axes = this.viewer.scene.getObjectByName('axes');
            if (axes) axes.visible = !axes.visible;
            this.viewer.render();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.openExportModal();
        });
    }

    setupExportModal() {
        const modal = document.getElementById('exportModal');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = document.getElementById('exportCancelBtn');
        const confirmBtn = document.getElementById('exportConfirmBtn');

        closeBtn.addEventListener('click', () => this.closeExportModal());
        cancelBtn.addEventListener('click', () => this.closeExportModal());
        confirmBtn.addEventListener('click', () => this.performExport());

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeExportModal();
        });
    }

    openExportModal() {
        if (!this.activeModelRoot) {
            this.setStatus('Error: No model loaded.');
            return;
        }

        const modal = document.getElementById('exportModal');
        modal.classList.remove('hidden');

        // Calculate stats
        let objectCount = 0;
        let triangleCount = 0;

        this.activeModelRoot.traverse((child) => {
            if (child.isMesh && child !== this.activeModelRoot) {
                objectCount++;
                if (child.geometry) {
                    const index = child.geometry.index;
                    if (index) {
                        triangleCount += index.count / 3;
                    } else if (child.geometry.attributes.position) {
                        triangleCount += child.geometry.attributes.position.count / 3;
                    }
                }
            }
        });

        document.getElementById('exportObjectCount').textContent = `Objects: ${objectCount}`;
        document.getElementById('exportTriangleCount').textContent = `Triangles: ${Math.round(triangleCount)}`;
    }

    closeExportModal() {
        document.getElementById('exportModal').classList.add('hidden');
    }

    async performExport() {
        const visibleOnly = document.getElementById('exportVisibleOnly').checked;
        this.closeExportModal();
        this.setStatus('Exporting...');

        try {
            await exportGLB(this.activeModelRoot, this.loadedFileName, visibleOnly);
            this.setStatus(`Exported as ${this.loadedFileName}.glb`);
        } catch (error) {
            console.error('Export error:', error);
            this.setStatus(`Export error: ${error.message}`);
        }
    }

    setupPanelTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;

                // Remove active from all tabs
                tabBtns.forEach((b) => b.classList.remove('active'));
                tabContents.forEach((c) => c.classList.remove('active'));

                // Add active to clicked tab
                btn.classList.add('active');
                const activeTab = document.getElementById(`${tabName}Tab`);
                if (activeTab) activeTab.classList.add('active');

                // Update content if needed
                if (tabName === 'objects') {
                    this.updateObjectsList();
                } else if (tabName === 'layers') {
                    this.updateLayersList();
                }
            });
        });

        // Setup add layer button
        document.getElementById('addLayerBtn').addEventListener('click', () => {
            const input = document.getElementById('newLayerInput');
            this.addLayer(input.value);
            input.value = '';
        });

        document.getElementById('newLayerInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const input = e.target;
                this.addLayer(input.value);
                input.value = '';
            }
        });
    }

    setStatus(message) {
        document.getElementById('status').textContent = message;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
