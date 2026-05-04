export const MATERIAL_PRESETS = {
    // Gemstones
    diamond: {
        name: 'Diamond',
        color: 0xFFFFFF,
        metalness: 0,
        roughness: 0.05,
        dispersion: 0.3
    },
    sapphire: {
        name: 'Sapphire (Blue)',
        color: 0x0F47AF,
        metalness: 0,
        roughness: 0.1,
        dispersion: 0.3
    },
    ruby: {
        name: 'Ruby (Red)',
        color: 0xE0115F,
        metalness: 0,
        roughness: 0.1,
        dispersion: 0.3
    },
    emerald: {
        name: 'Emerald (Green)',
        color: 0x50C878,
        metalness: 0,
        roughness: 0.1,
        dispersion: 0.3
    },

    // Precious Metals
    yellowGold: {
        name: 'Yellow Gold',
        color: 0xFFD700,
        metalness: 0.9,
        roughness: 0.25,
        dispersion: 0
    },
    roseGold: {
        name: 'Rose Gold',
        color: 0xB76E79,
        metalness: 0.9,
        roughness: 0.25,
        dispersion: 0
    },
    whiteGold: {
        name: 'White Gold',
        color: 0xEBE6E0,
        metalness: 0.85,
        roughness: 0.2,
        dispersion: 0
    },
    silver: {
        name: 'Silver',
        color: 0xC0C0C0,
        metalness: 0.95,
        roughness: 0.15,
        dispersion: 0
    },
    copper: {
        name: 'Copper',
        color: 0xB87333,
        metalness: 0.92,
        roughness: 0.3,
        dispersion: 0
    },

    // Common Materials
    glass: {
        name: 'Glass',
        color: 0xE8F4F8,
        metalness: 0,
        roughness: 0.02,
        dispersion: 0.15
    },
    plastic: {
        name: 'Plastic',
        color: 0x333333,
        metalness: 0,
        roughness: 0.4,
        dispersion: 0
    },
    rubber: {
        name: 'Rubber',
        color: 0x1a1a1a,
        metalness: 0,
        roughness: 0.9,
        dispersion: 0
    },
    matte: {
        name: 'Matte Paint',
        color: 0x4a4a4a,
        metalness: 0.1,
        roughness: 0.8,
        dispersion: 0
    },
    mirror: {
        name: 'Mirror',
        color: 0xFFFFFF,
        metalness: 1.0,
        roughness: 0.01,
        dispersion: 0
    },
    brushedMetal: {
        name: 'Brushed Metal',
        color: 0xA9A9A9,
        metalness: 0.85,
        roughness: 0.5,
        dispersion: 0
    }
};

export function applyMaterialPreset(material, presetKey) {
    const preset = MATERIAL_PRESETS[presetKey];
    if (!preset) return false;

    if (material.color) {
        material.color.setHex(preset.color);
    }
    if (material.metalness !== undefined) {
        material.metalness = preset.metalness;
    }
    if (material.roughness !== undefined) {
        material.roughness = preset.roughness;
    }
    if (material.dispersion !== undefined) {
        material.dispersion = preset.dispersion;
    }

    return true;
}

export function getPresetsList() {
    return Object.entries(MATERIAL_PRESETS).map(([key, preset]) => ({
        key,
        name: preset.name
    }));
}
