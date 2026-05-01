# Design Buddy 3DM to GLB Converter

A browser-based static web app for converting Rhino .3dm files to glTF 2.0 .glb format with real-time editing capabilities.

## Features

- **Drag-and-drop .3dm file loading** - Simply drag a Rhino file onto the page
- **3D preview with Three.js** - Render and inspect your models in real-time
- **Object selection and inspection** - Click objects to select, rename, and edit properties
- **Layer management** - View, create, and assign objects to layers
- **Material editing** - Adjust color, metalness, roughness, and opacity
- **Advanced visibility controls** - Toggle layer visibility, isolate objects, hide/show all
- **GLB export** - Export visible or all objects as binary .glb files
- **Scene tools** - Grid, axes, camera reset, fit to model
- **Clean dark UI** - Floating panels optimized for desktop and tablet

## Deployment to GitHub Pages

### 1. Create Repository

```bash
# Create a new repository on GitHub (e.g., 3dm-to-glb-converter)
# Clone it locally or initialize in your existing directory
```

### 2. Prepare Files

Ensure your repository has this structure:

```
your-repo/
├── index.html
├── src/
│   ├── main.js
│   ├── viewer.js
│   ├── loader3dm.js
│   ├── selection.js
│   ├── inspector.js
│   ├── layerManager.js
│   ├── exporter.js
│   └── sceneTools.js
├── styles/
│   └── app.css
└── README.md
```

### 3. Enable GitHub Pages

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit: 3DM to GLB converter"
   git push -u origin main
   ```

2. Go to your repository settings:
   - Navigate to **Settings** → **Pages**
   - Under "Build and deployment", select:
     - Source: **Deploy from a branch**
     - Branch: **main** (or your default branch)
     - Folder: **/ (root)**
   - Click **Save**

3. GitHub will build and deploy your site
   - Your app will be available at: `https://your-username.github.io/3dm-to-glb-converter`

### 4. Custom Domain (Optional)

If you have a custom domain:
1. In **Settings** → **Pages**, add your domain under "Custom domain"
2. Update your domain's DNS records to point to GitHub Pages
3. GitHub will automatically handle HTTPS

## Local Development

No build step required! The app uses vanilla JavaScript modules and CDN libraries.

To test locally:

```bash
# Python 3
python -m http.server 8000

# Or Node.js with http-server
npx http-server

# Then visit http://localhost:8000
```

## Usage

### Loading a Model

1. Drag and drop a `.3dm` file onto the page
2. Wait for the model to load and render
3. The camera will automatically fit to the model

### Selecting Objects

- **Click** on any object in the 3D view to select it
- Selected objects are highlighted with an orange glow
- Object details appear in the **Inspector** panel on the right

### Managing Objects

**Inspector Panel (Right):**
- **Name**: Rename the selected object
- **Layer**: Assign to a different layer
- **Type**: View object geometry type
- **Material**: Edit color, metalness, roughness, opacity
- **Buttons**: Isolate, Hide, Show All

**Objects Tab (Left):**
- View all objects in the scene
- Click an object to select it
- See which layer each object belongs to

### Managing Layers

**Layers Tab (Left):**
- **Add Layer**: Create new named layers
- **Visibility Checkboxes**: Toggle visibility for all objects in a layer
- Changes immediately reflect in the 3D view

### Viewing Tools

**Toolbar (Top):**
- **Fit**: Zoom camera to fit the entire model
- **Reset**: Reset camera to default position
- **Grid**: Toggle grid helper (for reference)
- **Axes**: Toggle XYZ axes indicator
- **Export**: Open export dialog

### Exporting

1. Click the **Export** button
2. Choose options:
   - **Export visible only**: Only export objects currently visible
   - **Export all**: Export all objects regardless of visibility
3. Click **Export** to download the `.glb` file
4. The export filename matches your original `.3dm` file

## Known Limitations

### Technical Constraints

1. **No Rhino Layer Preservation in GLB**
   - GLB (glTF 2.0) format doesn't have native layer support
   - Layer information is stored as metadata in `userData.designBuddy`
   - Layer names are embedded in object names as: `LayerName/ObjectName`
   - External viewers will see only the embedded name string

2. **Metadata Not Visible in External Viewers**
   - Most 3D viewers don't display custom `userData` properties
   - To fully preserve metadata, use a format that supports custom data

3. **Browser Security**
   - Files are loaded entirely in memory
   - Very large .3dm files may cause browser performance issues
   - No progress bar for very large models

4. **Rhino3dmLoader Compatibility**
   - Works with Rhino 7 and later `.3dm` files
   - Some advanced Rhino features may not translate to Three.js
   - Custom plug-in geometry may not import correctly

5. **Material Support**
   - Only basic PBR materials (color, metalness, roughness, opacity)
   - Advanced Rhino materials and textures are not supported

6. **No Undo/Redo**
   - Changes are immediate and cannot be undone

### Browser Support

- **Recommended**: Chrome, Edge (Chromium-based)
- **Good**: Firefox, Safari
- **Mobile**: iPad works well; phones may have UI issues

### File Size Limitations

- **Practical limit**: ~50-100 MB for smooth performance
- **Hard limit**: Browser memory constraints (~500 MB typical)

## Code Structure

### Modules

- **main.js** - App orchestration, state management, event handling
- **viewer.js** - Three.js scene setup, camera, renderer, controls
- **loader3dm.js** - Rhino3dmLoader integration
- **selection.js** - Raycaster-based object selection and highlighting
- **inspector.js** - Inspector UI initialization
- **layerManager.js** - Layer management initialization
- **exporter.js** - GLTFExporter wrapper for GLB export
- **sceneTools.js** - Grid, axes, camera utilities

### No Backend

- 100% static HTML, CSS, and JavaScript
- All processing happens in the browser
- No server upload needed
- Files are processed locally and never sent anywhere

## Troubleshooting

### Model Won't Load

- Check file format (only `.3dm` supported)
- Try opening the file in Rhino first to verify it's valid
- Check browser DevTools → Console for error messages
- Try a different browser (Chrome/Edge recommended)

### Performance Issues

- Reduce file size by simplifying the model in Rhino
- Close other applications to free system memory
- Very large models may cause slowdowns

### Export Issues

- Ensure at least one object is visible before exporting
- Check browser console for export errors
- Try a different browser if the issue persists

## License

This project is provided as-is for educational and commercial use.

## Credits

- **Three.js** - 3D graphics library
- **Rhino3dmLoader** - Rhino file loading
- **GLTFExporter** - glTF export functionality
- **OrbitControls** - Camera navigation

---

**Built for the Rhino/Grasshopper community with Three.js** 🎨
