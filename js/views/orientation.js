/**
 * View 04: Live Orientation (3D AHRS) - High-Fidelity Enterprise Survey Drone
 * Photorealistic Procedural Airframe, Gyro-Stabilized 3-Axis Gimbal, RTK Mast & Corrected MAVLink Aerospace Attitude
 */

let threeScene, threeCamera, threeRenderer, droneModelGroup, orbitControls;
let orientationAnimId;
let droneProps = [];
let navBeaconLight = null;
let groundHeadingArrowGroup = null;

// AHRS Visual Display Calibration Configuration (100% GCS-Side Only - Drone Hardware Untouched)
const DEFAULT_AHRS_CONFIG = {
  invertPitch: true,
  invertRoll: true,
  invertYaw: false,
  pitchOffset: 0.0,
  rollOffset: 0.0,
  yawOffset: 0.0,
  pitchTrim: 0.0,
  rollTrim: 0.0,
  swapPitchRoll: false,
  boardRotation: 0 // 0, 90, 180, 270 degrees
};

window.ahrsConfig = Object.assign({}, DEFAULT_AHRS_CONFIG);

function loadAhrsConfig() {
  try {
    const saved = localStorage.getItem('bhoomi_ahrs_calibration_v2');
    if (saved) {
      window.ahrsConfig = Object.assign({}, DEFAULT_AHRS_CONFIG, JSON.parse(saved));
      return;
    }
  } catch (e) {
    console.warn('Failed to parse AHRS config from localStorage', e);
  }
  window.ahrsConfig = Object.assign({}, DEFAULT_AHRS_CONFIG);
}

function saveAhrsConfig() {
  try {
    localStorage.setItem('bhoomi_ahrs_calibration_v2', JSON.stringify(window.ahrsConfig));
  } catch (e) {
    console.warn('Failed to save AHRS config to localStorage', e);
  }
}

// Initial load
loadAhrsConfig();

function makeTextSprite(message, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = opts.width || 256;
  canvas.height = opts.height || 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = opts.bgColor || 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = opts.borderColor || '#38bdf8';
  ctx.lineWidth = 4;

  const r = 16, x = 6, y = 6, w = canvas.width - 12, h = canvas.height - 12;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = opts.font || 'bold 40px monospace, sans-serif';
  ctx.fillStyle = opts.textColor || '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    fog: false
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.renderOrder = 999;
  sprite.scale.set(opts.scaleX || 1.8, opts.scaleY || 0.9, 1);
  return sprite;
}

window.initOrientation3D = function() {
  const container = document.getElementById('threejs-drone-viewport');
  if (!container) return;

  if (threeRenderer) {
    if (orientationAnimId) cancelAnimationFrame(orientationAnimId);
    const oldCanvases = container.querySelectorAll('canvas');
    oldCanvases.forEach(c => c.remove());
  }

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 460;

  // 1. Scene & Illuminated Aerospace Studio Atmosphere
  threeScene = new THREE.Scene();
  // Very light aerospace studio haze (replaces dark muddy fog)
  threeScene.fog = new THREE.FogExp2(0x0c1220, 0.008);

  // 2. Camera with Ideal Aerospace Perspective
  threeCamera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
  threeCamera.position.set(0, 4.2, 6.8);
  threeCamera.lookAt(0, -0.2, 0);

  // 3. Renderer with High Dynamic Range Styling
  threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  threeRenderer.setSize(width, height);
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  threeRenderer.shadowMap.enabled = true;
  threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  threeRenderer.toneMappingExposure = 1.60; // Ultra-bright, high-clarity exposure
  container.insertBefore(threeRenderer.domElement, container.firstChild);

  // 4. OrbitControls (Smooth mouse inspection)
  if (typeof THREE.OrbitControls !== 'undefined') {
    orbitControls = new THREE.OrbitControls(threeCamera, threeRenderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.08;
    orbitControls.maxPolarAngle = Math.PI * 0.88;
    orbitControls.minDistance = 2.0;
    orbitControls.maxDistance = 15.0;
    orbitControls.target.set(0, -0.2, 0);
  }

  // 5. Multi-Point Aerospace Studio Lighting Rig (Crystal Clear Illumination)
  // Pure White Ambient Base
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
  threeScene.add(ambientLight);

  // Overhead Sky/Ground Hemisphere Light (Highlights 3D contours and volume)
  const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.3);
  threeScene.add(hemiLight);

  // Primary Studio Key Sun (Top-Front Pure White)
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(4, 12, 7);
  keyLight.castShadow = true;
  threeScene.add(keyLight);

  // Port Side Soft Studio Fill Light
  const fillLight = new THREE.DirectionalLight(0xf1f5f9, 1.4);
  fillLight.position.set(-6, 8, 5);
  threeScene.add(fillLight);

  // Electric Cyan Rim Light (Sharp silhouette separation)
  const rimLightCyan = new THREE.DirectionalLight(0x38bdf8, 1.6);
  rimLightCyan.position.set(-8, 5, -7);
  threeScene.add(rimLightCyan);

  // Warm Gold Rim Light (Starboard rear edge highlight)
  const rimLightGold = new THREE.DirectionalLight(0xfacc15, 1.4);
  rimLightGold.position.set(8, 5, -7);
  threeScene.add(rimLightGold);

  // Underbelly Uplight (Illuminates gimbal, camera, belly, and legs from below)
  const bellyLight = new THREE.DirectionalLight(0x93c5fd, 1.2);
  bellyLight.position.set(0, -6, 2);
  threeScene.add(bellyLight);

  // Direct Overhead Zenith Spotlight (Guarantees drone top is brilliantly lit from any angle)
  const zenithLight = new THREE.DirectionalLight(0xffffff, 2.5);
  zenithLight.position.set(0, 12, 0);
  threeScene.add(zenithLight);

  // Center Beacon Light
  navBeaconLight = new THREE.PointLight(0x4edea3, 2.2, 10);
  navBeaconLight.position.set(0, 0.65, 0);
  threeScene.add(navBeaconLight);

  // 6. Build High-Fidelity Intellectual Enterprise Survey Drone (High-Contrast Materials)
  droneModelGroup = new THREE.Group();
  droneModelGroup.rotation.order = 'YXZ'; // Aerospace convention: Yaw -> Pitch -> Roll
  droneProps = [];

  // High-Visibility Enterprise Survey Drone Material Palette
  // A. Aerospace Surveyor Composite White Shell (Main fuselage body - brilliant matte survey white)
  const surveyorWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.38,
    metalness: 0.08
  });

  // B. Gleaming Pure White Top Canopy
  const canopyPlatinumMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.12
  });

  // C. Brushed Aircraft Titanium (for clamps, brackets, gimbal mount)
  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.35,
    metalness: 0.30
  });

  // D. High-Visibility Silver Aircraft Aluminum (for landing gear, skids, arms)
  const brightAlloyMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.30,
    metalness: 0.35
  });

  // E. CNC Gold Anodized Accents
  const goldAnodizedMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.95,
    roughness: 0.15
  });

  // F. Motor Rotor Bell Amber/Orange
  const motorBellMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.92,
    roughness: 0.18
  });

  // G. Carbon Propeller Blades with High Gloss
  const propMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.2,
    metalness: 0.7,
    transparent: true,
    opacity: 0.88
  });

  const glassLensMat = new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.9,
    transparent: true,
    opacity: 0.9
  });

  // A. CENTRAL FUSELAGE CHASSIS (Bright Aerospace Surveyor Aerodynamic Shell)
  const mainHullGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.28, 8);
  const mainHull = new THREE.Mesh(mainHullGeo, surveyorWhiteMat);
  mainHull.castShadow = true;
  droneModelGroup.add(mainHull);

  // Top Deck Shield (Gleaming Platinum Canopy)
  const topDeckGeo = new THREE.CylinderGeometry(0.68, 0.82, 0.12, 8);
  const topDeck = new THREE.Mesh(topDeckGeo, canopyPlatinumMat);
  topDeck.position.y = 0.18;
  droneModelGroup.add(topDeck);

  // SVAMITVA Scheme Gold Crest on Top Deck
  const crestGeo = new THREE.BoxGeometry(0.35, 0.02, 0.35);
  const crest = new THREE.Mesh(crestGeo, goldAnodizedMat);
  crest.position.set(0, 0.25, 0);
  droneModelGroup.add(crest);

  // B. TOP RTK GNSS HELICAL ANTENNA MAST
  const mastGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.38, 12);
  const mast = new THREE.Mesh(mastGeo, titaniumMat);
  mast.position.set(0, 0.38, -0.15);
  droneModelGroup.add(mast);

  const rtkPuckGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);
  const rtkPuck = new THREE.Mesh(rtkPuckGeo, canopyPlatinumMat);
  rtkPuck.position.set(0, 0.58, -0.15);
  droneModelGroup.add(rtkPuck);

  const rtkRingGeo = new THREE.TorusGeometry(0.19, 0.015, 8, 24);
  const rtkRingMat = new THREE.MeshBasicMaterial({ color: 0x4edea3 });
  const rtkRing = new THREE.Mesh(rtkRingGeo, rtkRingMat);
  rtkRing.rotation.x = Math.PI / 2;
  rtkRing.position.set(0, 0.58, -0.15);
  droneModelGroup.add(rtkRing);

  // C. FORWARD STEREOSCOPIC VISION & LIDAR POD (Nose @ -Z)
  const noseSensorPodGeo = new THREE.BoxGeometry(0.52, 0.14, 0.28);
  const noseSensorPod = new THREE.Mesh(noseSensorPodGeo, brightAlloyMat);
  noseSensorPod.position.set(0, 0.04, -0.95);
  droneModelGroup.add(noseSensorPod);

  // Left & Right Stereo Cameras
  [-0.18, 0.18].forEach(xOff => {
    const lensGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.06, 12);
    const lens = new THREE.Mesh(lensGeo, glassLensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(xOff, 0.04, -1.09);
    droneModelGroup.add(lens);
  });

  // Center Micro-LiDAR Sensor
  const lidarGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16);
  const lidarMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const lidar = new THREE.Mesh(lidarGeo, lidarMat);
  lidar.rotation.x = Math.PI / 2;
  lidar.position.set(0, 0.04, -1.08);
  droneModelGroup.add(lidar);

  // Forward Heading Arrow (Gold Flight Vector Arrow)
  const headingArrowGeo = new THREE.ConeGeometry(0.14, 0.38, 4);
  const headingArrow = new THREE.Mesh(headingArrowGeo, goldAnodizedMat);
  headingArrow.rotation.x = -Math.PI / 2;
  headingArrow.position.set(0, 0.26, -0.68);
  droneModelGroup.add(headingArrow);

  // D. REAR BATTERY BAY WITH CHARGE LED INDICATORS (@ +Z)
  const battGeo = new THREE.BoxGeometry(0.55, 0.2, 0.38);
  const batt = new THREE.Mesh(battGeo, titaniumMat);
  batt.position.set(0, 0.08, 0.85);
  droneModelGroup.add(batt);

  // 4 Battery LEDs
  [-0.15, -0.05, 0.05, 0.15].forEach(x => {
    const bLed = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0x4edea3 }));
    bLed.position.set(x, 0.12, 1.05);
    droneModelGroup.add(bLed);
  });

  // Tail Beacon Strobe
  const tailBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
  tailBeacon.position.set(0, 0.18, 1.05);
  droneModelGroup.add(tailBeacon);

  // E. 4 HIGH-STRENGTH CARBON MOTOR ARMS & BRUSHLESS POWERPLANTS
  // True geometric layout: horizontal arms at 45° X-Configuration
  const armRadius = 2.1;
  const armConfigs = [
    { angle: Math.PI * 0.25, name: 'M1_FR', isFront: true,  isRight: true,  cw: false },
    { angle: Math.PI * 0.75, name: 'M4_RR', isFront: false, isRight: true,  cw: true  },
    { angle: Math.PI * 1.25, name: 'M2_RL', isFront: false, isRight: false, cw: false },
    { angle: Math.PI * 1.75, name: 'M3_FL', isFront: true,  isRight: false, cw: true  }
  ];

  armConfigs.forEach(m => {
    // Coordinate calculation: -Z is Forward, +X is Right
    const xEnd = Math.sin(m.angle) * armRadius;
    const zEnd = -Math.cos(m.angle) * armRadius;

    // Horizontal Tubular Carbon Arm
    const armLen = armRadius - 0.75;
    const armGeo = new THREE.CylinderGeometry(0.065, 0.065, armLen, 12);
    // Tubular Aluminum-Titanium Arm (Bright silver metallic)
    const arm = new THREE.Mesh(armGeo, brightAlloyMat);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = -m.angle + Math.PI / 2;
    arm.position.set((xEnd * 0.6), 0, (zEnd * 0.6));
    droneModelGroup.add(arm);

    // Luminous Running Neon Strip underneath arm (high visibility)
    const neonGeo = new THREE.CylinderGeometry(0.02, 0.02, armLen * 0.85, 8);
    const neonColor = m.isFront ? (m.isRight ? 0x22c55e : 0xef4444) : 0xf59e0b;
    const neon = new THREE.Mesh(neonGeo, new THREE.MeshBasicMaterial({ color: neonColor }));
    neon.rotation.z = Math.PI / 2;
    neon.rotation.y = -m.angle + Math.PI / 2;
    neon.position.set((xEnd * 0.6), -0.07, (zEnd * 0.6));
    droneModelGroup.add(neon);

    // CNC Machined Motor Mount Clamp
    const mountGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 16);
    const mount = new THREE.Mesh(mountGeo, brightAlloyMat);
    mount.position.set(xEnd, 0.02, zEnd);
    droneModelGroup.add(mount);

    // Motor Stator Base
    const statorGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16);
    const stator = new THREE.Mesh(statorGeo, titaniumMat);
    stator.position.set(xEnd, 0.1, zEnd);
    droneModelGroup.add(stator);

    // Golden Anodized Brushless Rotor Bell
    const bellGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 20);
    const bell = new THREE.Mesh(bellGeo, motorBellMat);
    bell.position.set(xEnd, 0.2, zEnd);
    droneModelGroup.add(bell);

    // Central Prop Spinner Nut
    const nutGeo = new THREE.ConeGeometry(0.08, 0.12, 12);
    const nut = new THREE.Mesh(nutGeo, goldAnodizedMat);
    nut.position.set(xEnd, 0.35, zEnd);
    droneModelGroup.add(nut);

    // FAA/DGCA Navigation LED (Front-Right: Green, Front-Left: Red, Rear: Amber/White)
    let ledColor = 0xffffff;
    if (m.isFront && m.isRight) ledColor = 0x22c55e; // Green (Starboard)
    else if (m.isFront && !m.isRight) ledColor = 0xef4444; // Red (Port)
    else ledColor = 0xf59e0b; // Amber (Aft)

    const navLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color: ledColor })
    );
    navLed.position.set(xEnd, -0.06, zEnd);
    droneModelGroup.add(navLed);

    // High-Performance Carbon Propeller Group
    const propGroup = new THREE.Group();
    propGroup.position.set(xEnd, 0.31, zEnd);

    // Aerodynamic Twin Blade
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.012, 0.12), propMat);
    blade1.rotation.y = 0.05;
    propGroup.add(blade1);

    // Blade Tip Gold Edge
    [-0.78, 0.78].forEach(tipX => {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.12), goldAnodizedMat);
      tip.position.x = tipX;
      propGroup.add(tip);
    });

    droneModelGroup.add(propGroup);
    droneProps.push({ group: propGroup, cw: m.cw });
  });

  // F. 3-AXIS GIMBAL & 4K PHOTOGRAMMETRY CAMERA (Underneath)
  const gimbalGroup = new THREE.Group();
  gimbalGroup.position.set(0, -0.22, -0.15);

  // Silicone Vibration Isolator Plate
  const damperPlate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.48), titaniumMat);
  gimbalGroup.add(damperPlate);

  // 4 Rubber Damper Balls
  [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([dx, dz]) => {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    ball.position.set(dx, -0.04, dz);
    gimbalGroup.add(ball);
  });

  // Motorized Gimbal Yaw Yoke
  const gimbalYoke = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12), brightAlloyMat);
  gimbalYoke.position.set(0, -0.12, 0);
  gimbalGroup.add(gimbalYoke);

  // Camera Body (Sony a7R Full-Frame Survey Style)
  const camBodyGeo = new THREE.BoxGeometry(0.38, 0.26, 0.28);
  const camBody = new THREE.Mesh(camBodyGeo, brightAlloyMat);
  camBody.position.set(0, -0.25, 0);
  gimbalGroup.add(camBody);

  // 35mm Survey Lens Barrel
  const lensBarrelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.24, 20);
  const lensBarrel = new THREE.Mesh(lensBarrelGeo, titaniumMat);
  lensBarrel.rotation.x = Math.PI / 2;
  lensBarrel.position.set(0, -0.25, -0.2);
  gimbalGroup.add(lensBarrel);

  // Gold Filter Ring
  const lensRingGeo = new THREE.TorusGeometry(0.122, 0.012, 8, 24);
  const lensRing = new THREE.Mesh(lensRingGeo, goldAnodizedMat);
  lensRing.position.set(0, -0.25, -0.32);
  gimbalGroup.add(lensRing);

  // Front Optical Glass Element
  const frontGlassGeo = new THREE.CircleGeometry(0.11, 20);
  const frontGlass = new THREE.Mesh(frontGlassGeo, glassLensMat);
  frontGlass.position.set(0, -0.25, -0.325);
  gimbalGroup.add(frontGlass);

  droneModelGroup.add(gimbalGroup);

  // G. SWEPT AERODYNAMIC CARBON LANDING SKIDS (High-Visibility Silver Alloy)
  [-0.72, 0.72].forEach(xOff => {
    // Longitudinal runner skid
    const skidGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.3, 12);
    const skid = new THREE.Mesh(skidGeo, brightAlloyMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(xOff, -0.68, 0);
    droneModelGroup.add(skid);

    // Gold Skid End Caps
    [-1.15, 1.15].forEach(zCap => {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), goldAnodizedMat);
      cap.position.set(xOff, -0.68, zCap);
      droneModelGroup.add(cap);
    });

    // Angled Arch Legs
    [-0.65, 0.65].forEach(zLeg => {
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.62, 8);
      const leg = new THREE.Mesh(legGeo, brightAlloyMat);
      leg.position.set(xOff * 0.7, -0.42, zLeg);
      leg.rotation.z = xOff > 0 ? -0.35 : 0.35;
      droneModelGroup.add(leg);
    });
  });

  // I. PROMINENT 3D AIRFRAME FORWARD HEADING ARROW (Front Nose Vector)
  const forwardHeadingArrowGroup = new THREE.Group();
  forwardHeadingArrowGroup.position.set(0, -0.05, -1.05); // Originates at forward gimbal nose

  // Primary luminous cyan heading shaft
  const headingShaftGeo = new THREE.CylinderGeometry(0.035, 0.05, 1.6, 12);
  const headingShaftMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.95
  });
  const headingShaft = new THREE.Mesh(headingShaftGeo, headingShaftMat);
  headingShaft.rotation.x = Math.PI / 2;
  headingShaft.position.z = -0.8;
  forwardHeadingArrowGroup.add(headingShaft);

  // Large arrow head pointing forward along nose (-Z)
  const headingArrowHeadGeo = new THREE.ConeGeometry(0.22, 0.58, 16);
  const headingArrowHeadMat = new THREE.MeshBasicMaterial({ color: 0x4edea3 });
  const headingArrowHead = new THREE.Mesh(headingArrowHeadGeo, headingArrowHeadMat);
  headingArrowHead.rotation.x = -Math.PI / 2;
  headingArrowHead.position.z = -1.88;
  forwardHeadingArrowGroup.add(headingArrowHead);

  // Brilliant beacon at arrow tip
  const headingTipBeaconGeo = new THREE.SphereGeometry(0.065, 8, 8);
  const headingTipBeaconMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const headingTipBeacon = new THREE.Mesh(headingTipBeaconGeo, headingTipBeaconMat);
  headingTipBeacon.position.z = -2.18;
  forwardHeadingArrowGroup.add(headingTipBeacon);

  // Aerodynamic Chevrons along the heading ray
  [-0.45, -1.15].forEach((zPip, i) => {
    const chevronGeo = new THREE.TorusGeometry(0.13 - i * 0.02, 0.02, 8, 16, Math.PI);
    const chevronMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const chevron = new THREE.Mesh(chevronGeo, chevronMat);
    chevron.rotation.x = Math.PI / 2;
    chevron.rotation.z = Math.PI;
    chevron.position.z = zPip;
    forwardHeadingArrowGroup.add(chevron);
  });

  // Luminous 3D Badge attached directly to the Drone Nose Arrow
  const noseBadge = makeTextSprite("NOSE ▲", { borderColor: '#4edea3', textColor: '#4edea3', scaleX: 1.3, scaleY: 0.65 });
  noseBadge.position.set(0, 0.45, -1.8);
  forwardHeadingArrowGroup.add(noseBadge);

  droneModelGroup.add(forwardHeadingArrowGroup);

  threeScene.add(droneModelGroup);

  // H. GROUND COMPASS ROSE & CARDINAL AZIMUTH REFERENCE SYSTEM
  const groundGrid = new THREE.GridHelper(18, 18, 0xfacc15, 0x1e293b);
  groundGrid.position.y = -2.25;
  threeScene.add(groundGrid);

  // Luminous Helipad Contrast Halo (Illuminates area directly beneath drone for maximum silhouette clarity)
  const padHalo = new THREE.Mesh(
    new THREE.CircleGeometry(2.0, 32),
    new THREE.MeshBasicMaterial({ color: 0x0369a1, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
  );
  padHalo.rotation.x = Math.PI / 2;
  padHalo.position.y = -2.245;
  threeScene.add(padHalo);

  const padRing = new THREE.Mesh(
    new THREE.RingGeometry(1.92, 2.04, 48),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
  );
  padRing.rotation.x = Math.PI / 2;
  padRing.position.y = -2.24;
  threeScene.add(padRing);

  // Azimuth Ring at radius 3.35 (Framed perfectly within camera view)
  const ringRadius = 3.35;
  const azimuthRingGeo = new THREE.RingGeometry(ringRadius - 0.08, ringRadius + 0.08, 64);
  const azimuthRingMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.55
  });
  const azimuthRing = new THREE.Mesh(azimuthRingGeo, azimuthRingMat);
  azimuthRing.rotation.x = Math.PI / 2;
  azimuthRing.position.y = -2.23;
  threeScene.add(azimuthRing);

  // 12 Compass Degree Pips (every 30°)
  for (let deg = 0; deg < 360; deg += 30) {
    if (deg % 90 === 0) continue; // Major cardinals handled below
    const rad = (deg * Math.PI) / 180;
    const pipX = Math.sin(rad) * ringRadius;
    const pipZ = -Math.cos(rad) * ringRadius;
    const pipMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
    );
    pipMesh.position.set(pipX, -2.23, pipZ);
    threeScene.add(pipMesh);
  }

  // Compass 4 Cardinal Points: North (0°), East (90°), South (180°), West (270°)
  // 1. NORTH (0°) @ -Z
  const nMarker = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.52, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  nMarker.rotation.x = -Math.PI / 2;
  nMarker.position.set(0, -2.22, -ringRadius);
  threeScene.add(nMarker);
  const nSprite = makeTextSprite("NORTH 0°", { borderColor: '#ef4444', textColor: '#ef4444', scaleX: 1.7, scaleY: 0.85 });
  nSprite.position.set(0, -1.65, -(ringRadius + 0.65));
  threeScene.add(nSprite);

  // 2. EAST (90°) @ +X
  const eMarker = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.52, 8), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
  eMarker.rotation.z = -Math.PI / 2;
  eMarker.position.set(ringRadius, -2.22, 0);
  threeScene.add(eMarker);
  const eSprite = makeTextSprite("EAST 90°", { borderColor: '#facc15', textColor: '#facc15', scaleX: 1.7, scaleY: 0.85 });
  eSprite.position.set(ringRadius + 0.65, -1.65, 0);
  threeScene.add(eSprite);

  // 3. SOUTH (180°) @ +Z
  const sMarker = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.52, 8), new THREE.MeshBasicMaterial({ color: 0x94a3b8 }));
  sMarker.rotation.x = Math.PI / 2;
  sMarker.position.set(0, -2.22, ringRadius);
  threeScene.add(sMarker);
  const sSprite = makeTextSprite("SOUTH 180°", { borderColor: '#94a3b8', textColor: '#94a3b8', scaleX: 1.8, scaleY: 0.85 });
  sSprite.position.set(0, -1.65, ringRadius + 0.65);
  threeScene.add(sSprite);

  // 4. WEST (270°) @ -X
  const wMarker = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.52, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  wMarker.rotation.z = Math.PI / 2;
  wMarker.position.set(-ringRadius, -2.22, 0);
  threeScene.add(wMarker);
  const wSprite = makeTextSprite("WEST 270°", { borderColor: '#38bdf8', textColor: '#38bdf8', scaleX: 1.7, scaleY: 0.85 });
  wSprite.position.set(-(ringRadius + 0.65), -1.65, 0);
  threeScene.add(wSprite);

  // J. DYNAMIC GROUND-PROJECTED HEADING ARROW (Points to active compass azimuth)
  groundHeadingArrowGroup = new THREE.Group();
  groundHeadingArrowGroup.position.y = -2.22;

  // Ground ray shaft extending to azimuth circumference
  const groundRayLen = ringRadius - 0.45;
  const groundRayGeo = new THREE.CylinderGeometry(0.045, 0.08, groundRayLen, 8);
  const groundRayMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.88
  });
  const groundRay = new THREE.Mesh(groundRayGeo, groundRayMat);
  groundRay.rotation.x = Math.PI / 2;
  groundRay.position.z = -groundRayLen / 2;
  groundHeadingArrowGroup.add(groundRay);

  // Ground arrowhead cone at azimuth circumference
  const groundHeadGeo = new THREE.ConeGeometry(0.26, 0.65, 16);
  const groundHeadMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const groundHead = new THREE.Mesh(groundHeadGeo, groundHeadMat);
  groundHead.rotation.x = -Math.PI / 2;
  groundHead.position.z = -ringRadius;
  groundHeadingArrowGroup.add(groundHead);

  // Luminous Badge on the ground heading arrow
  const groundHeadBadge = makeTextSprite("HDG ▲", { borderColor: '#facc15', textColor: '#facc15', scaleX: 1.1, scaleY: 0.55 });
  groundHeadBadge.position.set(0, 0.38, -ringRadius);
  groundHeadingArrowGroup.add(groundHeadBadge);

  threeScene.add(groundHeadingArrowGroup);

  // 7. High-FPS Real-Time Animation Loop
  function animate() {
    orientationAnimId = requestAnimationFrame(animate);

    if (orbitControls) orbitControls.update();

    // Propeller High-RPM Spin
    const spinSpeed = (window.bhoomiState && window.bhoomiState.armed) ? 0.65 : 0.28;
    droneProps.forEach(p => {
      p.group.rotation.y += p.cw ? spinSpeed : -spinSpeed;
    });

    // Tail Strobe Beacon Blink
    if (navBeaconLight) {
      const nowMs = Date.now();
      navBeaconLight.intensity = (nowMs % 1000 < 120) ? 3.0 : 0.4;
    }

    // Apply Live MAVLink Attitude with Full Client-Side Visual Calibration
    if (droneModelGroup) {
      const rawPitch = (window.bhoomiState && typeof window.bhoomiState.pitch === 'number') ? window.bhoomiState.pitch : 0.0;
      const rawRoll  = (window.bhoomiState && typeof window.bhoomiState.roll === 'number')  ? window.bhoomiState.roll  : 0.0;
      const rawYaw   = (window.bhoomiState && typeof window.bhoomiState.yaw === 'number')   ? window.bhoomiState.yaw   : 0.0;

      // 1. Subtract Zero Reference Offset and Micro-Trim
      const totalPitchOffset = (window.ahrsConfig.pitchOffset || 0.0) + (window.ahrsConfig.pitchTrim || 0.0);
      const totalRollOffset  = (window.ahrsConfig.rollOffset  || 0.0) + (window.ahrsConfig.rollTrim  || 0.0);
      const totalYawOffset   = window.ahrsConfig.yawOffset || 0.0;


      const p0 = rawPitch - totalPitchOffset;
      const r0 = rawRoll  - totalRollOffset;
      const y0 = rawYaw   - totalYawOffset;

      // 2. Board Mounting Orientation Remapping (0, 90, 180, 270 deg)
      const rot = window.ahrsConfig.boardRotation || 0;
      let pr_p = p0;
      let pr_r = r0;
      if (rot === 90) {
        pr_p = -r0;
        pr_r = p0;
      } else if (rot === 180) {
        pr_p = -p0;
        pr_r = -r0;
      } else if (rot === 270) {
        pr_p = r0;
        pr_r = -p0;
      }

      // 3. Axis Swapping (Pitch <-> Roll)
      if (window.ahrsConfig.swapPitchRoll) {
        const tmp = pr_p;
        pr_p = pr_r;
        pr_r = tmp;
      }

      // 4. Axis Direction Inversions (Sign flip)
      const effPitch = window.ahrsConfig.invertPitch ? -pr_p : pr_p;
      const effRoll  = window.ahrsConfig.invertRoll  ? -pr_r : pr_r;
      const effYaw   = window.ahrsConfig.invertYaw   ? -y0   : y0;

      // Convert Degrees to Radians
      const pitchRad = (effPitch * Math.PI) / 180;
      const rollRad  = (effRoll * Math.PI) / 180;
      const yawRad   = (effYaw * Math.PI) / 180;

      // Aerospace order YXZ: Yaw (around Y), Pitch (around X), Roll (around Z)
      droneModelGroup.rotation.y = -yawRad;
      droneModelGroup.rotation.x = pitchRad;
      droneModelGroup.rotation.z = -rollRad;

      // Synchronize Dynamic Ground-Projected Azimuth Heading Arrow
      if (groundHeadingArrowGroup) {
        groundHeadingArrowGroup.rotation.y = -yawRad;
      }

      // Synchronize 2D PFD Artificial Horizon & Compass
      updateHorizon2D(effPitch, effRoll, effYaw);

      // Update Live Telemetry & Calibration Diagnostics in the Calibration Deck
      updateAhrsCalibDiagnostics(rawPitch, rawRoll, rawYaw, effPitch, effRoll, effYaw, totalPitchOffset, totalRollOffset, totalYawOffset);
    }

    threeRenderer.render(threeScene, threeCamera);
  }

  animate();

  // Sync initial calibration UI elements
  setTimeout(() => {
    updateAhrsCalibUI();
  }, 100);

  // Resize handler
  window.addEventListener('resize', () => {
    if (!container || !threeCamera || !threeRenderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    threeCamera.aspect = w / h;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(w, h);
  });
};

function updateHorizon2D(effPitch, effRoll, effYaw) {
  const pitchEl = document.getElementById('ahrs-pitch-val');
  const rollEl = document.getElementById('ahrs-roll-val');
  const yawEl = document.getElementById('ahrs-yaw-val');

  const normYaw = Math.round((effYaw % 360 + 360) % 360);

  if (pitchEl) pitchEl.textContent = `${effPitch >= 0 ? '+' : ''}${effPitch.toFixed(1)}°`;
  if (rollEl) rollEl.textContent = `${effRoll >= 0 ? '+' : ''}${effRoll.toFixed(1)}°`;
  if (yawEl) yawEl.textContent = `${normYaw}°`;

  // Update 3D Viewport HUD Heading Indicator with Arrow
  const hudHdgVal = document.getElementById('ahrs-hud-heading-val');
  if (hudHdgVal) {
    const cardDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const dirIdx = Math.round(normYaw / 45) % 8;
    hudHdgVal.textContent = `${normYaw}° ${cardDirs[dirIdx]}`;
  }
  const hudHdgIcon = document.getElementById('ahrs-hud-heading-icon');
  if (hudHdgIcon) {
    hudHdgIcon.style.transform = `rotate(${normYaw}deg)`;
  }

  // 2D SVG Artificial Horizon (PFD)
  const horizonSkyGround = document.getElementById('ahrs-horizon-svg-group');
  if (horizonSkyGround) {
    const translateY = effPitch * 2.2;
    horizonSkyGround.setAttribute('transform', `rotate(${-effRoll}, 100, 100) translate(0, ${translateY})`);
  }

  // 2D Heading Compass Needle (Rotates clockwise to target heading)
  const compassNeedle = document.getElementById('compass-rose-needle');
  if (compassNeedle) {
    compassNeedle.setAttribute('transform', `rotate(${normYaw}, 60, 60)`);
  }
}


// Throttle diagnostics UI update to avoid excessive DOM churn
let lastDiagUpdateMs = 0;
function updateAhrsCalibDiagnostics(rawPitch, rawRoll, rawYaw, effPitch, effRoll, effYaw, offP, offR, offY) {
  const now = Date.now();
  if (now - lastDiagUpdateMs < 120) return;
  lastDiagUpdateMs = now;

  const rawEl = document.getElementById('ahrs-diag-raw');
  if (rawEl) {
    rawEl.textContent = `P: ${rawPitch >= 0 ? '+' : ''}${rawPitch.toFixed(1)}° | R: ${rawRoll >= 0 ? '+' : ''}${rawRoll.toFixed(1)}° | Y: ${Math.round((rawYaw % 360 + 360) % 360)}°`;
  }

  const offEl = document.getElementById('ahrs-diag-offset');
  if (offEl) {
    offEl.textContent = `P: ${offP >= 0 ? '+' : ''}${offP.toFixed(1)}° | R: ${offR >= 0 ? '+' : ''}${offR.toFixed(1)}° | Y: ${offY.toFixed(1)}°`;
  }

  const effEl = document.getElementById('ahrs-diag-eff');
  if (effEl) {
    effEl.textContent = `P: ${effPitch >= 0 ? '+' : ''}${effPitch.toFixed(1)}° | R: ${effRoll >= 0 ? '+' : ''}${effRoll.toFixed(1)}° | Y: ${Math.round((effYaw % 360 + 360) % 360)}°`;
  }
}

/**
 * UI Sync: updates all toggle states, badge texts, buttons, and steppers
 */
window.updateAhrsCalibUI = function() {
  const cfg = window.ahrsConfig;

  // 1. Quick Bar & Card Axis Invert Buttons
  const setInvertBtn = (id, badgeId, isInv, label) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.className = isInv
        ? "px-2 py-0.5 rounded bg-primary text-on-primary font-label-caps text-[11px] font-bold cursor-pointer"
        : "px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-caps text-[11px] cursor-pointer";
    }
    const badge = document.getElementById(badgeId);
    if (badge) {
      badge.textContent = isInv ? "INVERTED" : "NORMAL";
      badge.className = isInv ? "text-primary font-bold" : "text-outline";
    }
  };

  setInvertBtn('btn-inv-pitch', 'badge-inv-pitch', cfg.invertPitch, 'Pitch');
  setInvertBtn('btn-inv-roll', 'badge-inv-roll', cfg.invertRoll, 'Roll');
  setInvertBtn('btn-inv-yaw', 'badge-inv-yaw', cfg.invertYaw, 'Yaw');

  const cardPitch = document.getElementById('btn-inv-pitch-card');
  if (cardPitch) {
    cardPitch.className = cfg.invertPitch
      ? "w-full py-1 rounded bg-primary/20 border border-primary/40 text-primary font-label-caps text-[10px] font-bold flex items-center justify-between px-2 cursor-pointer"
      : "w-full py-1 rounded bg-surface-container border border-surface-container-high text-on-surface-variant font-label-caps text-[10px] font-bold flex items-center justify-between px-2 cursor-pointer";
  }

  const cardRoll = document.getElementById('btn-inv-roll-card');
  if (cardRoll) {
    cardRoll.className = cfg.invertRoll
      ? "w-full py-1 rounded bg-primary/20 border border-primary/40 text-primary font-label-caps text-[10px] font-bold flex items-center justify-between px-2 cursor-pointer"
      : "w-full py-1 rounded bg-surface-container border border-surface-container-high text-on-surface-variant font-label-caps text-[10px] font-bold flex items-center justify-between px-2 cursor-pointer";
  }

  const cardYaw = document.getElementById('btn-inv-yaw-card');
  if (cardYaw) {
    cardYaw.className = cfg.invertYaw
      ? "w-full py-1 rounded bg-primary/20 border border-primary/40 text-primary font-label-caps text-[10px] font-bold flex items-center justify-between px-2 cursor-pointer"
      : "w-full py-1 rounded bg-surface-container border border-surface-container-high text-on-surface-variant font-label-caps text-[10px] font-bold flex items-center justify-between px-2 cursor-pointer";
  }

  // 2. Zero Reference Value Label
  const zeroOffsetEl = document.getElementById('ahrs-zero-offset-val');
  if (zeroOffsetEl) {
    zeroOffsetEl.textContent = `P: ${cfg.pitchOffset >= 0 ? '+' : ''}${cfg.pitchOffset.toFixed(1)}° | R: ${cfg.rollOffset >= 0 ? '+' : ''}${cfg.rollOffset.toFixed(1)}°`;
  }

  // 3. Micro Trim Values
  const pTrimEl = document.getElementById('ahrs-pitch-trim-val');
  if (pTrimEl) {
    pTrimEl.textContent = `${cfg.pitchTrim >= 0 ? '+' : ''}${cfg.pitchTrim.toFixed(1)}°`;
  }
  const rTrimEl = document.getElementById('ahrs-roll-trim-val');
  if (rTrimEl) {
    rTrimEl.textContent = `${cfg.rollTrim >= 0 ? '+' : ''}${cfg.rollTrim.toFixed(1)}°`;
  }

  // 4. Board Mounting Rotation Buttons
  [0, 90, 180, 270].forEach(deg => {
    const btn = document.getElementById(`btn-rot-${deg}`);
    if (btn) {
      if (cfg.boardRotation === deg) {
        btn.className = "py-1 rounded text-center text-[10px] font-label-caps font-bold bg-primary text-on-primary cursor-pointer shadow-sm";
      } else {
        btn.className = "py-1 rounded text-center text-[10px] font-label-caps bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer";
      }
    }
  });

  const rotBadge = document.getElementById('ahrs-board-rot-badge');
  if (rotBadge) {
    rotBadge.textContent = cfg.boardRotation === 0 ? "0° (STD)" : `${cfg.boardRotation}° MOUNT`;
  }

  // 5. Swap Pitch/Roll Axis Buttons
  const swapBtn = document.getElementById('btn-swap-axes');
  if (swapBtn) {
    swapBtn.className = cfg.swapPitchRoll
      ? "w-full py-1.5 rounded bg-tertiary/20 text-tertiary border border-tertiary/40 font-label-caps text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
      : "w-full py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-caps text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer border border-surface-container-high/50";
  }

  const quickSwapBtn = document.getElementById('btn-swap-axes-quick');
  if (quickSwapBtn) {
    quickSwapBtn.className = cfg.swapPitchRoll
      ? "px-2 py-0.5 rounded bg-tertiary text-on-tertiary font-label-caps text-[11px] font-bold cursor-pointer"
      : "px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-caps text-[11px] cursor-pointer";
  }

  // 6. Heading Yaw Offset
  const yawOffsetEl = document.getElementById('ahrs-yaw-offset-val');
  if (yawOffsetEl) {
    yawOffsetEl.textContent = `Offset: ${cfg.yawOffset.toFixed(1)}°`;
  }

  // 7. Overall Calibration Status Badge
  const statusBadge = document.getElementById('ahrs-calib-status-badge');
  if (statusBadge) {
    const isCustomized = (cfg.pitchOffset !== 0 || cfg.rollOffset !== 0 || cfg.pitchTrim !== 0 || cfg.rollTrim !== 0 || cfg.yawOffset !== 0 || cfg.boardRotation !== 0 || cfg.swapPitchRoll);
    if (isCustomized) {
      statusBadge.textContent = "CUSTOM CALIBRATION ACTIVE";
      statusBadge.className = "px-2 py-0.5 rounded text-[10px] font-label-caps font-bold bg-secondary/20 text-secondary border border-secondary/30";
    } else {
      statusBadge.textContent = "FACTORY DEFAULT (1:1)";
      statusBadge.className = "px-2 py-0.5 rounded text-[10px] font-label-caps font-bold bg-primary/20 text-primary border border-primary/30";
    }
  }
};

// -------------------------------------------------------------
// Interactive Calibration Actions (Client-Side Display Only)
// -------------------------------------------------------------

window.toggleAhrsInvert = function(axis) {
  if (axis === 'pitch') {
    window.ahrsConfig.invertPitch = !window.ahrsConfig.invertPitch;
  } else if (axis === 'roll') {
    window.ahrsConfig.invertRoll = !window.ahrsConfig.invertRoll;
  } else if (axis === 'yaw') {
    window.ahrsConfig.invertYaw = !window.ahrsConfig.invertYaw;
  }
  saveAhrsConfig();
  window.updateAhrsCalibUI();
  window.showNotification(`Visual Display: ${axis.toUpperCase()} inverted`);
};

window.calibrateAhrsZero = function() {
  if (!window.bhoomiState) {
    window.showNotification("Waiting for drone telemetry before setting zero level...");
    return;
  }
  window.ahrsConfig.pitchOffset = parseFloat((window.bhoomiState.pitch || 0.0).toFixed(2));
  window.ahrsConfig.rollOffset  = parseFloat((window.bhoomiState.roll || 0.0).toFixed(2));
  window.ahrsConfig.pitchTrim   = 0.0;
  window.ahrsConfig.rollTrim    = 0.0;
  saveAhrsConfig();
  window.updateAhrsCalibUI();
  window.showNotification(`Zero Calibrated: Drone rest position set as level (Pitch: ${window.ahrsConfig.pitchOffset.toFixed(1)}°, Roll: ${window.ahrsConfig.rollOffset.toFixed(1)}°). FC hardware calibration untouched.`);
};

window.adjustAhrsTrim = function(axis, delta) {
  if (axis === 'pitch') {
    window.ahrsConfig.pitchTrim = parseFloat(((window.ahrsConfig.pitchTrim || 0.0) + delta).toFixed(2));
  } else if (axis === 'roll') {
    window.ahrsConfig.rollTrim = parseFloat(((window.ahrsConfig.rollTrim || 0.0) + delta).toFixed(2));
  }
  saveAhrsConfig();
  window.updateAhrsCalibUI();
};

window.setAhrsBoardRotation = function(deg) {
  window.ahrsConfig.boardRotation = deg;
  saveAhrsConfig();
  window.updateAhrsCalibUI();
  window.showNotification(`Board Mounting Rotation set to ${deg}°`);
};

window.toggleAhrsSwapAxes = function() {
  window.ahrsConfig.swapPitchRoll = !window.ahrsConfig.swapPitchRoll;
  saveAhrsConfig();
  window.updateAhrsCalibUI();
  window.showNotification(`Visual Axis Swap (Pitch ⇄ Roll): ${window.ahrsConfig.swapPitchRoll ? 'ENABLED' : 'DISABLED'}`);
};

window.alignAhrsHeading = function(mode) {
  if (mode === 'zero') {
    window.ahrsConfig.yawOffset = parseFloat((window.bhoomiState ? (window.bhoomiState.yaw || 0.0) : 0.0).toFixed(2));
    window.showNotification(`Visual Heading Aligned to Forward (Yaw Offset: ${window.ahrsConfig.yawOffset.toFixed(1)}°)`);
  } else if (mode === 'reset') {
    window.ahrsConfig.yawOffset = 0.0;
    window.showNotification("Visual Heading Offset Reset to 0°");
  }
  saveAhrsConfig();
  window.updateAhrsCalibUI();
};

window.resetAhrsCalibration = function() {
  window.ahrsConfig = Object.assign({}, DEFAULT_AHRS_CONFIG);
  saveAhrsConfig();
  window.updateAhrsCalibUI();
  window.showNotification("Visual Display Calibration reset to standard defaults. Drone hardware calibration untouched.");
};

window.toggleAhrsCalibPanel = function() {
  const panel = document.getElementById('ahrs-calib-panel');
  if (!panel) return;
  const isHidden = panel.classList.contains('hidden');
  if (isHidden) {
    panel.classList.remove('hidden');
  } else {
    panel.classList.add('hidden');
  }
  const btn = document.getElementById('btn-toggle-calib-panel');
  if (btn) {
    btn.className = !isHidden
      ? "px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-caps text-[11px] font-bold cursor-pointer flex items-center gap-1 border border-surface-container-high"
      : "px-2 py-0.5 rounded bg-secondary/20 text-secondary font-label-caps text-[11px] font-bold cursor-pointer flex items-center gap-1 border border-secondary/40";
  }
};

window.setAhrsCameraView = function(viewName) {
  if (!threeCamera) return;
  if (viewName === 'north' || viewName === 'reset' || viewName === 'chase') {
    threeCamera.position.set(0, 4.2, 6.8);
    threeCamera.lookAt(0, -0.2, 0);
  } else if (viewName === 'top') {
    threeCamera.position.set(0, 8.5, 0.001);
    threeCamera.lookAt(0, 0, 0);
  } else if (viewName === 'east') {
    threeCamera.position.set(6.8, 3.2, 0);
    threeCamera.lookAt(0, -0.2, 0);
  } else if (viewName === 'front') {
    threeCamera.position.set(0, 2.2, -6.8);
    threeCamera.lookAt(0, -0.2, 0);
  } else if (viewName === 'iso') {
    threeCamera.position.set(4.8, 4.2, 4.8);
    threeCamera.lookAt(0, -0.2, 0);
  }
  if (orbitControls) {
    orbitControls.target.set(0, -0.2, 0);
    orbitControls.update();
  }
  window.showNotification(`Camera View: ${viewName.toUpperCase()} (North is ${viewName === 'top' ? 'UP' : 'AHEAD'}, East is RIGHT)`);
};

window.ahrsLightingLevel = 0;
window.cycleAhrsLighting = function() {
  window.ahrsLightingLevel = (window.ahrsLightingLevel + 1) % 3;
  if (!threeRenderer) return;
  const modes = [
    { name: "ULTRA-BRIGHT STUDIO", exp: 1.45, btnText: "💡 STUDIO BRIGHT" },
    { name: "SUPER VIVID HIGH-CONTRAST", exp: 1.85, btnText: "⚡ VIVID CONTRAST" },
    { name: "DAYLIGHT AEROSPACE", exp: 1.25, btnText: "☀️ DAYLIGHT" }
  ];
  const cur = modes[window.ahrsLightingLevel];
  threeRenderer.toneMappingExposure = cur.exp;
  const btn = document.getElementById('btn-toggle-lighting');
  if (btn) {
    btn.innerHTML = `<span class="material-symbols-outlined text-[13px]">lightbulb</span> ${cur.btnText}`;
  }
  window.showNotification(`3D Airframe Lighting: ${cur.name} (Exposure: ${cur.exp.toFixed(2)})`);
};

// =========================================================================
// MISSION PLANNER STYLE 6-POSITION DIGITAL TWIN CALIBRATION WIZARD
// (100% Safe GCS-Side Only - Physical Drone Settings Untouched)
// =========================================================================

window.calibWizard = {
  active: false,
  stepIndex: 0,
  readings: {},
  steps: [
    {
      id: 'level',
      name: '1. LEVEL',
      title: 'Place Drone Flat & Level',
      instruction: 'Place your physical drone on a flat, level surface (table or floor) and let it rest still.',
      hint: 'The digital twin will use this resting position as 0° Level pitch and roll.',
      targetDeg: '0° Level',
      axisNote: 'Reference zero offset baseline',
      svgType: 'level',
      btnText: 'CONFIRM LEVEL POSITION [SPACE]'
    },
    {
      id: 'nose_up',
      name: '2. NOSE UP',
      title: 'Hold Drone Nose Straight Up',
      instruction: 'Lift the physical drone and point the FRONT NOSE straight up towards the ceiling/sky (~60° to 90°).',
      hint: 'Teaches the digital twin the forward tilt axis and verifies pitch motion direction.',
      targetDeg: '+75° to +90° Pitch Up',
      axisNote: 'Detects pitch direction & axis mapping',
      svgType: 'nose_up',
      btnText: 'CONFIRM NOSE UP POSITION [SPACE]'
    },
    {
      id: 'nose_down',
      name: '3. NOSE DOWN',
      title: 'Hold Drone Nose Straight Down',
      instruction: 'Point the FRONT NOSE straight down towards the ground (~60° to 90°).',
      hint: 'Validates negative pitch deflection symmetry.',
      targetDeg: '-75° to -90° Pitch Down',
      axisNote: 'Validates forward dive deflection',
      svgType: 'nose_down',
      btnText: 'CONFIRM NOSE DOWN POSITION [SPACE]'
    },
    {
      id: 'left_side',
      name: '4. LEFT SIDE',
      title: 'Tilt Drone on its Left Side',
      instruction: 'Tilt the physical drone so its LEFT arm/wing is facing the ground and RIGHT arm is up (~60° to 90°).',
      hint: 'Teaches the digital twin left bank motion.',
      targetDeg: '-75° to -90° Left Roll',
      axisNote: 'Detects left bank deflection',
      svgType: 'left_side',
      btnText: 'CONFIRM LEFT SIDE POSITION [SPACE]'
    },
    {
      id: 'right_side',
      name: '5. RIGHT SIDE',
      title: 'Tilt Drone on its Right Side',
      instruction: 'Tilt the physical drone so its RIGHT arm/wing is facing the ground and LEFT arm is up (~60° to 90°).',
      hint: 'Teaches the digital twin right bank motion and verifies roll axis inversion.',
      targetDeg: '+75° to +90° Right Roll',
      axisNote: 'Validates right bank deflection',
      svgType: 'right_side',
      btnText: 'CONFIRM RIGHT SIDE POSITION [SPACE]'
    },
    {
      id: 'back',
      name: '6. BACK / BOTTOM',
      title: 'Turn Drone Upside Down (On Its Back)',
      instruction: 'Turn the physical drone completely upside down (landing gear pointing skyward).',
      hint: 'Validates full inverted attitude and completes the calibration sequence.',
      targetDeg: '180° Inverted',
      axisNote: 'Verifies inverted attitude lock',
      svgType: 'back',
      btnText: 'CONFIRM BACK / BOTTOM POSITION [SPACE]'
    }
  ]
};

// Launch the Mission Planner Style Wizard
window.startAhrsWizard = function() {
  window.calibWizard.active = true;
  window.calibWizard.stepIndex = 0;
  window.calibWizard.readings = {};

  const modal = document.getElementById('mp-calib-wizard-modal');
  if (modal) {
    modal.classList.remove('hidden');
    renderAhrsWizardStep();
  }

  // Keyboard support: Space / Enter to confirm step, Esc to exit
  window.addEventListener('keydown', handleWizardKeydown);
  window.showNotification("Mission Planner 6-Point Wizard started. Place drone in position 1: LEVEL.");
};

window.closeAhrsWizard = function() {
  window.calibWizard.active = false;
  const modal = document.getElementById('mp-calib-wizard-modal');
  if (modal) modal.classList.add('hidden');
  window.removeEventListener('keydown', handleWizardKeydown);
};

function handleWizardKeydown(e) {
  if (!window.calibWizard.active) return;
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    const finishBtn = document.getElementById('wizard-btn-finish');
    if (finishBtn && !finishBtn.classList.contains('hidden')) {
      window.closeAhrsWizard();
    } else {
      window.confirmAhrsWizardStep();
    }
  } else if (e.code === 'Escape') {
    e.preventDefault();
    window.closeAhrsWizard();
  }
}

function renderAhrsWizardStep() {
  const wiz = window.calibWizard;
  const step = wiz.steps[wiz.stepIndex];
  if (!step) return;

  // 1. Update Step Navigation Badges
  wiz.steps.forEach((s, idx) => {
    const badge = document.getElementById(`wiz-step-pill-${s.id}`);
    if (badge) {
      if (idx < wiz.stepIndex) {
        badge.className = "px-2 py-1 rounded text-[10px] font-label-caps font-bold bg-primary/20 text-primary border border-primary/40 flex items-center gap-1";
        badge.innerHTML = `<span class="material-symbols-outlined text-xs">check</span> ${s.name}`;
      } else if (idx === wiz.stepIndex) {
        badge.className = "px-2.5 py-1 rounded text-[11px] font-label-caps font-bold bg-primary text-on-primary shadow-md border border-primary flex items-center gap-1 animate-pulse";
        badge.innerHTML = `<span class="material-symbols-outlined text-xs">play_arrow</span> ${s.name}`;
      } else {
        badge.className = "px-2 py-1 rounded text-[10px] font-label-caps text-outline bg-surface-container border border-surface-container-high flex items-center gap-1";
        badge.innerHTML = s.name;
      }
    }
  });

  // 2. Step Title & Instructions
  const titleEl = document.getElementById('wiz-step-title');
  if (titleEl) titleEl.textContent = `STEP ${wiz.stepIndex + 1} OF 6: ${step.title.toUpperCase()}`;

  const descEl = document.getElementById('wiz-step-instruction');
  if (descEl) descEl.textContent = step.instruction;

  const hintEl = document.getElementById('wiz-step-hint');
  if (hintEl) hintEl.textContent = `💡 Purpose: ${step.hint} (${step.axisNote})`;

  const btnConfirm = document.getElementById('wizard-btn-confirm');
  if (btnConfirm) {
    btnConfirm.textContent = step.btnText;
    btnConfirm.classList.remove('hidden');
  }

  const resultContainer = document.getElementById('wizard-completion-container');
  if (resultContainer) resultContainer.classList.add('hidden');

  const mainStepContent = document.getElementById('wizard-active-step-content');
  if (mainStepContent) mainStepContent.classList.remove('hidden');

  const finishBtn = document.getElementById('wizard-btn-finish');
  if (finishBtn) finishBtn.classList.add('hidden');

  // 3. Render Visual Pose Diagram
  renderWizardSvgDiagram(step.svgType);
}

// Generate high-tech procedural vector diagrams for each target posture
function renderWizardSvgDiagram(svgType) {
  const container = document.getElementById('wizard-pose-diagram');
  if (!container) return;

  let svgContent = '';

  if (svgType === 'level') {
    svgContent = `
      <svg class="w-full h-full" viewBox="0 0 300 200">
        <!-- Grid table surface -->
        <line x1="20" y1="160" x2="280" y2="160" stroke="#4edea3" stroke-width="2" stroke-dasharray="4,4"/>
        <text x="150" y="180" text-anchor="middle" fill="#4edea3" class="font-label-caps text-[11px] font-bold">FLAT LEVEL REFERENCE BENCH (0°)</text>
        <!-- Horizontal Quadcopter -->
        <g transform="translate(150, 115)">
          <rect x="-35" y="-12" width="70" height="24" rx="6" fill="#1e2230" stroke="#4cd7f6" stroke-width="2"/>
          <circle cx="0" cy="0" r="8" fill="#4edea3"/>
          <line x1="-70" y1="0" x2="70" y2="0" stroke="#dfe2ef" stroke-width="4"/>
          <circle cx="-70" cy="-6" r="6" fill="#facc15"/>
          <circle cx="70" cy="-6" r="6" fill="#facc15"/>
          <!-- Props -->
          <ellipse cx="-70" cy="-12" rx="28" ry="4" fill="#38bdf8" opacity="0.6"/>
          <ellipse cx="70" cy="-12" rx="28" ry="4" fill="#38bdf8" opacity="0.6"/>
          <!-- Level arrows -->
          <line x1="-100" y1="20" x2="-80" y2="20" stroke="#4edea3" stroke-width="2"/>
          <line x1="80" y1="20" x2="100" y2="20" stroke="#4edea3" stroke-width="2"/>
        </g>
      </svg>
    `;
  } else if (svgType === 'nose_up') {
    svgContent = `
      <svg class="w-full h-full" viewBox="0 0 300 200">
        <text x="150" y="25" text-anchor="middle" fill="#38bdf8" class="font-label-caps text-[11px] font-bold">SKYWARD / CEILING ↑</text>
        <!-- Upward Tilt Arrow -->
        <path d="M 60 150 Q 80 40 130 30" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="4,4"/>
        <polygon points="135,24 135,36 122,30" fill="#38bdf8"/>
        <!-- Vertical Quadcopter Nose Up (Tilted -75 deg) -->
        <g transform="translate(160, 110) rotate(-75)">
          <rect x="-40" y="-12" width="80" height="24" rx="6" fill="#1e2230" stroke="#38bdf8" stroke-width="2"/>
          <circle cx="-25" cy="0" r="7" fill="#facc15"/>
          <text x="-25" y="4" text-anchor="middle" fill="#000" font-size="8" font-weight="bold">NOSE</text>
          <line x1="-70" y1="0" x2="70" y2="0" stroke="#dfe2ef" stroke-width="4"/>
          <ellipse cx="-70" cy="-12" rx="24" ry="4" fill="#38bdf8" opacity="0.6"/>
          <ellipse cx="70" cy="-12" rx="24" ry="4" fill="#38bdf8" opacity="0.6"/>
        </g>
        <text x="215" y="60" fill="#38bdf8" class="font-label-caps text-[10px] font-bold">NOSE UP (+75°..90°)</text>
      </svg>
    `;
  } else if (svgType === 'nose_down') {
    svgContent = `
      <svg class="w-full h-full" viewBox="0 0 300 200">
        <text x="150" y="185" text-anchor="middle" fill="#ffb4ab" class="font-label-caps text-[11px] font-bold">GROUND / FLOOR ↓</text>
        <!-- Downward Tilt Arrow -->
        <path d="M 60 40 Q 80 150 130 160" fill="none" stroke="#ffb4ab" stroke-width="3" stroke-dasharray="4,4"/>
        <polygon points="135,166 135,154 122,160" fill="#ffb4ab"/>
        <!-- Vertical Quadcopter Nose Down (Tilted +75 deg) -->
        <g transform="translate(160, 90) rotate(75)">
          <rect x="-40" y="-12" width="80" height="24" rx="6" fill="#1e2230" stroke="#ffb4ab" stroke-width="2"/>
          <circle cx="-25" cy="0" r="7" fill="#facc15"/>
          <text x="-25" y="4" text-anchor="middle" fill="#000" font-size="8" font-weight="bold">NOSE</text>
          <line x1="-70" y1="0" x2="70" y2="0" stroke="#dfe2ef" stroke-width="4"/>
          <ellipse cx="-70" cy="-12" rx="24" ry="4" fill="#ffb4ab" opacity="0.6"/>
          <ellipse cx="70" cy="-12" rx="24" ry="4" fill="#ffb4ab" opacity="0.6"/>
        </g>
        <text x="215" y="145" fill="#ffb4ab" class="font-label-caps text-[10px] font-bold">NOSE DOWN (-75°..90°)</text>
      </svg>
    `;
  } else if (svgType === 'left_side') {
    svgContent = `
      <svg class="w-full h-full" viewBox="0 0 300 200">
        <text x="150" y="25" text-anchor="middle" fill="#d0bcff" class="font-label-caps text-[11px] font-bold">LEFT SIDE FACING GROUND</text>
        <!-- Left Bank Arrow -->
        <path d="M 230 140 Q 150 40 80 70" fill="none" stroke="#d0bcff" stroke-width="3" stroke-dasharray="4,4"/>
        <polygon points="75,64 78,76 87,70" fill="#d0bcff"/>
        <!-- Banked Quadcopter (-80 deg roll) -->
        <g transform="translate(150, 105) rotate(-80)">
          <rect x="-40" y="-12" width="80" height="24" rx="6" fill="#1e2230" stroke="#d0bcff" stroke-width="2"/>
          <circle cx="0" cy="0" r="8" fill="#d0bcff"/>
          <line x1="-70" y1="0" x2="70" y2="0" stroke="#dfe2ef" stroke-width="4"/>
          <text x="-55" y="-16" fill="#d0bcff" font-size="9" font-weight="bold">LEFT</text>
          <text x="35" y="-16" fill="#dfe2ef" font-size="9" font-weight="bold">RIGHT</text>
          <ellipse cx="-70" cy="-10" rx="20" ry="4" fill="#d0bcff" opacity="0.6"/>
          <ellipse cx="70" cy="-10" rx="20" ry="4" fill="#d0bcff" opacity="0.6"/>
        </g>
      </svg>
    `;
  } else if (svgType === 'right_side') {
    svgContent = `
      <svg class="w-full h-full" viewBox="0 0 300 200">
        <text x="150" y="25" text-anchor="middle" fill="#d0bcff" class="font-label-caps text-[11px] font-bold">RIGHT SIDE FACING GROUND</text>
        <!-- Right Bank Arrow -->
        <path d="M 70 140 Q 150 40 220 70" fill="none" stroke="#d0bcff" stroke-width="3" stroke-dasharray="4,4"/>
        <polygon points="225,64 222,76 213,70" fill="#d0bcff"/>
        <!-- Banked Quadcopter (+80 deg roll) -->
        <g transform="translate(150, 105) rotate(80)">
          <rect x="-40" y="-12" width="80" height="24" rx="6" fill="#1e2230" stroke="#d0bcff" stroke-width="2"/>
          <circle cx="0" cy="0" r="8" fill="#d0bcff"/>
          <line x1="-70" y1="0" x2="70" y2="0" stroke="#dfe2ef" stroke-width="4"/>
          <text x="-55" y="-16" fill="#dfe2ef" font-size="9" font-weight="bold">LEFT</text>
          <text x="35" y="-16" fill="#d0bcff" font-size="9" font-weight="bold">RIGHT</text>
          <ellipse cx="-70" cy="-10" rx="20" ry="4" fill="#d0bcff" opacity="0.6"/>
          <ellipse cx="70" cy="-10" rx="20" ry="4" fill="#d0bcff" opacity="0.6"/>
        </g>
      </svg>
    `;
  } else if (svgType === 'back') {
    svgContent = `
      <svg class="w-full h-full" viewBox="0 0 300 200">
        <text x="150" y="25" text-anchor="middle" fill="#facc15" class="font-label-caps text-[11px] font-bold">UPSIDE DOWN / BACK (SKIDS UP) ↻</text>
        <!-- 180 loop arrow -->
        <path d="M 90 60 C 50 140, 250 140, 210 60" fill="none" stroke="#facc15" stroke-width="3" stroke-dasharray="4,4"/>
        <polygon points="206,53 218,61 213,70" fill="#facc15"/>
        <!-- Inverted Quadcopter (180 deg) -->
        <g transform="translate(150, 105) rotate(180)">
          <rect x="-35" y="-12" width="70" height="24" rx="6" fill="#1e2230" stroke="#facc15" stroke-width="2"/>
          <circle cx="0" cy="0" r="8" fill="#facc15"/>
          <line x1="-70" y1="0" x2="70" y2="0" stroke="#dfe2ef" stroke-width="4"/>
          <!-- Landing legs pointing skyward (downward before rotation) -->
          <line x1="-25" y1="12" x2="-25" y2="28" stroke="#facc15" stroke-width="3"/>
          <line x1="25" y1="12" x2="25" y2="28" stroke="#facc15" stroke-width="3"/>
          <ellipse cx="-70" cy="-12" rx="24" ry="4" fill="#facc15" opacity="0.6"/>
          <ellipse cx="70" cy="-12" rx="24" ry="4" fill="#facc15" opacity="0.6"/>
        </g>
      </svg>
    `;
  }

  container.innerHTML = svgContent;
}

// User confirms current held position
window.confirmAhrsWizardStep = function() {
  const wiz = window.calibWizard;
  const currentStep = wiz.steps[wiz.stepIndex];
  if (!currentStep) return;

  // Capture live telemetry from Bhoomi state
  const rawP = (window.bhoomiState && typeof window.bhoomiState.pitch === 'number') ? window.bhoomiState.pitch : 0.0;
  const rawR = (window.bhoomiState && typeof window.bhoomiState.roll === 'number')  ? window.bhoomiState.roll  : 0.0;
  const rawY = (window.bhoomiState && typeof window.bhoomiState.yaw === 'number')   ? window.bhoomiState.yaw   : 0.0;

  wiz.readings[currentStep.id] = { pitch: rawP, roll: rawR, yaw: rawY };

  window.showNotification(`Step ${wiz.stepIndex + 1} (${currentStep.name}) Recorded: P=${rawP.toFixed(1)}°, R=${rawR.toFixed(1)}°`);

  wiz.stepIndex++;

  if (wiz.stepIndex < wiz.steps.length) {
    renderAhrsWizardStep();
  } else {
    finishAhrsWizard();
  }
};

// Automatic mathematical resolution of drone orientation axes & inversions
function finishAhrsWizard() {
  const r = window.calibWizard.readings;
  const pLevel = (r.level && r.level.pitch) || 0.0;
  const rLevel = (r.level && r.level.roll)  || 0.0;

  // Calculate deflections relative to resting level
  const dpNoseUp = ((r.nose_up ? r.nose_up.pitch : 70) - pLevel);
  const drNoseUp = ((r.nose_up ? r.nose_up.roll  : 0)  - rLevel);

  const dpRight = ((r.right_side ? r.right_side.pitch : 0)  - pLevel);
  const drRight = ((r.right_side ? r.right_side.roll  : 70) - rLevel);

  // 1. Check if pitch and roll axes are swapped
  // If tilting nose up created greater movement on the roll channel than pitch channel:
  const isSwapped = Math.abs(drNoseUp) > Math.abs(dpNoseUp);

  // 2. Check Pitch Inversion:
  // In Three.js coordinate system with nose pointing along -Z:
  // Positive pitch rotation tilts nose up.
  // If the sensor reported negative pitch on nose-up, invert pitch.
  let isInvPitch = false;
  if (!isSwapped) {
    isInvPitch = dpNoseUp < 0;
  } else {
    isInvPitch = drNoseUp < 0;
  }

  // 3. Check Roll Inversion:
  // Right wing down in aerospace is positive roll.
  // If sensor reported negative roll when tilted right-side down, invert roll.
  let isInvRoll = false;
  if (!isSwapped) {
    isInvRoll = drRight < 0;
  } else {
    isInvRoll = dpRight < 0;
  }

  // Update AHRS display configuration
  window.ahrsConfig.pitchOffset = parseFloat(pLevel.toFixed(2));
  window.ahrsConfig.rollOffset  = parseFloat(rLevel.toFixed(2));
  window.ahrsConfig.pitchTrim   = 0.0;
  window.ahrsConfig.rollTrim    = 0.0;
  window.ahrsConfig.swapPitchRoll = isSwapped;
  window.ahrsConfig.invertPitch   = isInvPitch;
  window.ahrsConfig.invertRoll    = isInvRoll;
  window.ahrsConfig.boardRotation = 0;

  // Persist to local storage
  saveAhrsConfig();
  window.updateAhrsCalibUI();

  // Show Wizard Completion Screen
  const mainStepContent = document.getElementById('wizard-active-step-content');
  if (mainStepContent) mainStepContent.classList.add('hidden');

  const btnConfirm = document.getElementById('wizard-btn-confirm');
  if (btnConfirm) btnConfirm.classList.add('hidden');

  const resultContainer = document.getElementById('wizard-completion-container');
  if (resultContainer) {
    resultContainer.classList.remove('hidden');

    const sumLevel = document.getElementById('wiz-res-level');
    if (sumLevel) sumLevel.textContent = `P: ${pLevel >= 0 ? '+' : ''}${pLevel.toFixed(1)}° | R: ${rLevel >= 0 ? '+' : ''}${rLevel.toFixed(1)}° (Level Set)`;

    const sumPitch = document.getElementById('wiz-res-pitch');
    if (sumPitch) sumPitch.textContent = isInvPitch ? 'INVERTED (Reversed Sign)' : 'NORMAL (Positive Up)';

    const sumRoll = document.getElementById('wiz-res-roll');
    if (sumRoll) sumRoll.textContent = isInvRoll ? 'INVERTED (Reversed Sign)' : 'NORMAL (Positive Right Bank)';

    const sumSwap = document.getElementById('wiz-res-swap');
    if (sumSwap) sumSwap.textContent = isSwapped ? 'SWAPPED (Pitch ⇄ Roll Re-mapped)' : 'STANDARD (Independent Axes)';
  }

  const finishBtn = document.getElementById('wizard-btn-finish');
  if (finishBtn) finishBtn.classList.remove('hidden');

  window.showNotification("🎉 Mission Planner 6-Point Alignment complete! Digital twin synchronized with your physical drone.");
}

// Live telemetry monitor for wizard dialog
setInterval(() => {
  if (!window.calibWizard || !window.calibWizard.active) return;
  const p = (window.bhoomiState && typeof window.bhoomiState.pitch === 'number') ? window.bhoomiState.pitch : 0.0;
  const r = (window.bhoomiState && typeof window.bhoomiState.roll === 'number')  ? window.bhoomiState.roll  : 0.0;
  const y = (window.bhoomiState && typeof window.bhoomiState.yaw === 'number')   ? window.bhoomiState.yaw   : 0.0;

  const liveEl = document.getElementById('wiz-live-telemetry');
  if (liveEl) {
    liveEl.textContent = `Live Telemetry: Pitch: ${p >= 0 ? '+' : ''}${p.toFixed(1)}° | Roll: ${r >= 0 ? '+' : ''}${r.toFixed(1)}° | Yaw: ${Math.round((y % 360 + 360) % 360)}°`;
  }
}, 100);


