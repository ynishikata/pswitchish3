import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================================
// 定数定義
// ============================================================================

// 色定義
const COLORS = {
  SKY: 0x87ceeb,
  GROUND: 0x8b7355,
  SUN: 0xffeb3b,
  CLOUD: 0xffffff,
  GRASS: 0x228b22,
  GRASS_BLADE: 0x32cd32,
  BALL: 0x00ff00,
  DOMINO: 0xff6b6b,
  RAMP: 0x4ecdc4,
  BOX: 0xffd93d,
  SEESAW: 0x9b59b6,
  MOUNTAIN: 0x6b5b52,
  SHRINE: 0xd4a574,
  SHRINE_ROOF: 0x8b4513,
  ROAD: 0x4a4a4a,
  PLANK: 0x8b6914,
  GUARDRAIL: 0xc0c0c0,
  HIGHLIGHT: 0xffff00,
  RAIL: 0x404040, // レール（濃いグレー）
  SLEEPER: 0x654321, // 枕木（茶色）
} as const;

// 物理パラメータ
const PHYSICS = {
  GRAVITY: -9.82,
  SOLVER_ITERATIONS: 10,
  SOLVER_TOLERANCE: 0.1,
  GROUND_FRICTION: 0.3,
  GROUND_RESTITUTION: 0.5,
} as const;

// オブジェクトサイズ
const SIZES = {
  BALL_RADIUS: 0.2,
  DOMINO: { width: 0.1, height: 0.8, depth: 0.3 },
  GROUND_RADIUS: 25, // 地面の半径（円形）
  GROUND_BOUNDARY: 25, // 境界（半径と同じ）
  AXES_HELPER: 5,
} as const;

// 太陽設定
const SUN = {
  DISTANCE: 40,
  ANGLE: Math.PI / 4, // 45度
  RADIUS: 2,
  GLOW_RADIUS: 2.5,
  NUM_RAYS: 16,
  RAY_LENGTH: 4,
  RAY_THICKNESS: 0.15,
  RAY_DISTANCE: 3,
} as const;

// 復帰処理パラメータ
const RETURN_CONFIG = {
  LERP_FACTOR: 0.02,
  POSITION_THRESHOLD: 0.1, // 10cm
  QUATERNION_THRESHOLD: 0.9,
  FINAL_POSITION_THRESHOLD: 0.05, // 5cm
  FINAL_QUATERNION_THRESHOLD: 0.98,
  VELOCITY_DAMPING: 0.9,
} as const;

// 動物パトロール設定
const ANIMAL_CONFIG = {
  PENGUIN_SPEED: 1.5,
  COW_SPEED: 1.0,
  PATROL_TIMER_MIN: 2,
  PATROL_TIMER_MAX: 5,
  BOUNDARY_MARGIN: 2,
} as const;

// 牧草ゾーン設定
const PASTURE = {
  CENTER_X: 10,
  CENTER_Z: 10,
  WIDTH: 10,
  DEPTH: 10,
  NUM_GRASS_BLADES: 50,
} as const;

// ============================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.SKY);
scene.fog = new THREE.Fog(COLORS.SKY, 0, 200);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(10, 10, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container')?.appendChild(renderer.domElement);

// カメラコントロール
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// XYZ軸を表示（座標軸ヘルパー）
const axesHelper = new THREE.AxesHelper(SIZES.AXES_HELPER);
scene.add(axesHelper);

// 物理ワールドのセットアップ
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, PHYSICS.GRAVITY, 0),
});
world.broadphase = new CANNON.NaiveBroadphase();
const solver = new CANNON.GSSolver();
solver.iterations = PHYSICS.SOLVER_ITERATIONS;
solver.tolerance = PHYSICS.SOLVER_TOLERANCE;
world.solver = solver;

// ライトの追加
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
scene.add(directionalLight);

// 太陽の作成（斜め45度の位置に配置）
const sunX = SUN.DISTANCE * Math.cos(SUN.ANGLE);
const sunY = SUN.DISTANCE * Math.sin(SUN.ANGLE);
const sunZ = 0;

// 太陽の本体
const sunGeometry = new THREE.SphereGeometry(SUN.RADIUS, 32, 32);
const sunMaterial = new THREE.MeshStandardMaterial({ 
  color: COLORS.SUN,
  emissive: COLORS.SUN,
  emissiveIntensity: 1.5,
  metalness: 0.1,
  roughness: 0.9
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.set(sunX, sunY, sunZ);
sun.castShadow = false;
sun.receiveShadow = false;
scene.add(sun);

// 太陽の周りの光の輪（グローエフェクト）
const glowGeometry = new THREE.SphereGeometry(SUN.GLOW_RADIUS, 32, 32);
const glowMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.SUN,
  emissive: COLORS.SUN,
  emissiveIntensity: 0.8,
  transparent: true,
  opacity: 0.6
});
const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
sunGlow.position.copy(sun.position);
sunGlow.castShadow = false;
sunGlow.receiveShadow = false;
scene.add(sunGlow);

// 太陽光線の表現（放射状の光線）
const sunRaysGroup = new THREE.Group();
for (let i = 0; i < SUN.NUM_RAYS; i++) {
  const angle = (i / SUN.NUM_RAYS) * Math.PI * 2;
  const rayGeometry = new THREE.BoxGeometry(SUN.RAY_THICKNESS, SUN.RAY_LENGTH, SUN.RAY_THICKNESS);
  const rayMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.SUN,
    transparent: true,
    opacity: 0.6
  });
  const ray = new THREE.Mesh(rayGeometry, rayMaterial);
  
  // 太陽の周りに放射状に配置
  ray.position.set(
    sunX + Math.cos(angle) * SUN.RAY_DISTANCE,
    sunY + Math.sin(angle) * SUN.RAY_DISTANCE,
    sunZ
  );
  
  // 太陽の中心から外側に向かう方向に回転
  const rayDirection = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
  ray.lookAt(
    sunX + rayDirection.x * (SUN.RAY_DISTANCE + SUN.RAY_LENGTH / 2),
    sunY + rayDirection.y * (SUN.RAY_DISTANCE + SUN.RAY_LENGTH / 2),
    sunZ
  );
  
  sunRaysGroup.add(ray);
}
scene.add(sunRaysGroup);

// 太陽の光を追加（ポイントライトとして）
const sunLight = new THREE.PointLight(COLORS.SUN, 2.0, 150);
sunLight.position.copy(sun.position);
sunLight.castShadow = false;
scene.add(sunLight);

// 太陽光の表現（方向性のあるライト）
const sunDirectionalLight = new THREE.DirectionalLight(COLORS.SUN, 0.5);
sunDirectionalLight.position.set(sunX, sunY, sunZ);
sunDirectionalLight.target.position.set(0, 0, 0); // 原点方向に光を向ける
sunDirectionalLight.castShadow = false;
scene.add(sunDirectionalLight);
scene.add(sunDirectionalLight.target);

// 雲の作成（太陽の近くに配置）
function createCloud(position: { x: number; y: number; z: number }, size: number = 1): THREE.Group {
  const cloudGroup = new THREE.Group();
  
  // 雲のマテリアル（白、少し透明）
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.CLOUD,
    transparent: true,
    opacity: 0.8,
    roughness: 0.9,
    metalness: 0.0
  });
  
  // 複数の球体を組み合わせて雲の形を作る
  const cloudParts = [
    { x: 0, y: 0, z: 0, radius: size * 0.6 },
    { x: size * 0.5, y: 0, z: 0, radius: size * 0.5 },
    { x: -size * 0.5, y: 0, z: 0, radius: size * 0.5 },
    { x: 0, y: size * 0.3, z: 0, radius: size * 0.4 },
    { x: size * 0.3, y: size * 0.2, z: size * 0.3, radius: size * 0.35 },
    { x: -size * 0.3, y: size * 0.2, z: -size * 0.3, radius: size * 0.35 }
  ];
  
  cloudParts.forEach(part => {
    const cloudGeometry = new THREE.SphereGeometry(part.radius, 16, 16);
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloudMesh.position.set(part.x, part.y, part.z);
    cloudMesh.castShadow = false;
    cloudMesh.receiveShadow = false;
    cloudGroup.add(cloudMesh);
  });
  
  cloudGroup.position.set(position.x, position.y, position.z);
  return cloudGroup;
}

// 太陽の近くに雲を配置（複数の雲を配置）
const cloudPositions = [
  { x: sunX + 3, y: sunY + 2, z: sunZ + 2 },  // 太陽の右上
  { x: sunX - 4, y: sunY + 1, z: sunZ - 3 },  // 太陽の左上
  { x: sunX + 2, y: sunY - 3, z: sunZ + 4 },  // 太陽の右下
  { x: sunX - 3, y: sunY - 2, z: sunZ - 2 }   // 太陽の左下
];

const clouds: THREE.Group[] = [];
cloudPositions.forEach((pos) => {
  const cloudSize = 1.5 + Math.random() * 0.5; // 1.5から2.0のサイズ
  const cloud = createCloud(pos, cloudSize);
  scene.add(cloud);
  clouds.push(cloud);
});

// 線路の作成（地面の周囲に配置）
function createRailway(radius: number, segmentCount: number = 120): void {
  const railGroup = new THREE.Group();
  
  // レールのサイズ
  const railWidth = 0.1; // レールの幅
  const railHeight = 0.15; // レールの高さ
  const sleeperWidth = 0.2; // 枕木の幅
  const sleeperHeight = 0.1; // 枕木の高さ
  const sleeperLength = 1.5; // 枕木の長さ
  
  // レールのマテリアル
  const railMaterial = new THREE.MeshStandardMaterial({ 
    color: COLORS.RAIL,
    metalness: 0.8,
    roughness: 0.2
  });
  
  // 枕木のマテリアル
  const sleeperMaterial = new THREE.MeshStandardMaterial({ 
    color: COLORS.SLEEPER,
    roughness: 0.9
  });
  
  // 円周上に枕木とレールを配置
  for (let i = 0; i < segmentCount; i++) {
    const angle = (i / segmentCount) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    // 枕木を作成
    const sleeperGeometry = new THREE.BoxGeometry(sleeperLength, sleeperHeight, sleeperWidth);
    const sleeper = new THREE.Mesh(sleeperGeometry, sleeperMaterial);
    sleeper.position.set(x, sleeperHeight / 2, z);
    // 枕木を円周の接線方向に回転
    sleeper.rotation.y = angle + Math.PI / 2;
    sleeper.castShadow = true;
    sleeper.receiveShadow = true;
    railGroup.add(sleeper);
    
    // 左側のレール（中心から見て内側）
    const railLeftGeometry = new THREE.BoxGeometry(railHeight, railWidth, railWidth);
    const railLeft = new THREE.Mesh(railLeftGeometry, railMaterial);
    const railOffset = sleeperLength / 2 - 0.3; // レールのオフセット
    const leftX = Math.cos(angle) * radius - Math.sin(angle) * railOffset;
    const leftZ = Math.sin(angle) * radius + Math.cos(angle) * railOffset;
    railLeft.position.set(leftX, railHeight / 2 + sleeperHeight, leftZ);
    railLeft.rotation.y = angle + Math.PI / 2;
    railLeft.castShadow = true;
    railLeft.receiveShadow = true;
    railGroup.add(railLeft);
    
    // 右側のレール（中心から見て外側）
    const railRightGeometry = new THREE.BoxGeometry(railHeight, railWidth, railWidth);
    const railRight = new THREE.Mesh(railRightGeometry, railMaterial);
    const rightX = Math.cos(angle) * radius + Math.sin(angle) * railOffset;
    const rightZ = Math.sin(angle) * radius - Math.cos(angle) * railOffset;
    railRight.position.set(rightX, railHeight / 2 + sleeperHeight, rightZ);
    railRight.rotation.y = angle + Math.PI / 2;
    railRight.castShadow = true;
    railRight.receiveShadow = true;
    railGroup.add(railRight);
  }
  
  // レールを連続させる（各セグメント間を接続）
  for (let i = 0; i < segmentCount; i++) {
    const angle1 = (i / segmentCount) * Math.PI * 2;
    const angle2 = ((i + 1) % segmentCount / segmentCount) * Math.PI * 2;
    
    // 左レールの接続部分
    const railLeftConnectorGeometry = new THREE.BoxGeometry(railHeight, railWidth, railWidth * 2);
    const railLeftConnector = new THREE.Mesh(railLeftConnectorGeometry, railMaterial);
    const midAngle = (angle1 + angle2) / 2;
    const leftMidX = Math.cos(midAngle) * radius - Math.sin(midAngle) * (sleeperLength / 2 - 0.3);
    const leftMidZ = Math.sin(midAngle) * radius + Math.cos(midAngle) * (sleeperLength / 2 - 0.3);
    railLeftConnector.position.set(leftMidX, railHeight / 2 + sleeperHeight, leftMidZ);
    railLeftConnector.rotation.y = midAngle + Math.PI / 2;
    railLeftConnector.castShadow = true;
    railLeftConnector.receiveShadow = true;
    railGroup.add(railLeftConnector);
    
    // 右レールの接続部分
    const railRightConnectorGeometry = new THREE.BoxGeometry(railHeight, railWidth, railWidth * 2);
    const railRightConnector = new THREE.Mesh(railRightConnectorGeometry, railMaterial);
    const rightMidX = Math.cos(midAngle) * radius + Math.sin(midAngle) * (sleeperLength / 2 - 0.3);
    const rightMidZ = Math.sin(midAngle) * radius - Math.cos(midAngle) * (sleeperLength / 2 - 0.3);
    railRightConnector.position.set(rightMidX, railHeight / 2 + sleeperHeight, rightMidZ);
    railRightConnector.rotation.y = midAngle + Math.PI / 2;
    railRightConnector.castShadow = true;
    railRightConnector.receiveShadow = true;
    railGroup.add(railRightConnector);
  }
  
  scene.add(railGroup);
}

// 地面の周囲に線路を配置（地面の半径より少し外側に配置）
createRailway(SIZES.GROUND_RADIUS + 0.5, 120);

// 地面の作成（円形の土台）
const groundGeometry = new THREE.CircleGeometry(SIZES.GROUND_RADIUS, 64); // 64セグメントで滑らかな円
const groundMaterial = new THREE.MeshStandardMaterial({ color: COLORS.GROUND });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// 物理ボディも円形に（平面として扱う）
// CANNON.PlaneはデフォルトでYZ平面にあり、法線が+X方向を向いている
// Y=0の水平面（XZ平面）にするには、X軸周りに-90度回転させる
// しかし、CANNON.jsでは、Planeを水平にするには、Y軸周りに回転させる必要がある
// 実際には、Planeを-90度回転させることで、法線が+Y方向（上向き）になる
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(groundShape);
groundBody.position.set(0, 0, 0); // 地面の位置を明示的に設定（Y=0の平面）
// X軸周りに-90度回転して水平にする（法線が+Y方向、つまり上向きになる）
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
groundBody.material = new CANNON.Material({ 
  friction: PHYSICS.GROUND_FRICTION, 
  restitution: PHYSICS.GROUND_RESTITUTION 
});
world.addBody(groundBody);

// オブジェクトの管理
interface GameObject {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  type: 'ball' | 'domino' | 'ramp' | 'box' | 'seesaw' | 'mountain' | 'shrine' | 'road' | 'plank' | 'guardrail' | 'penguin' | 'cow' | 'stairs' | 'train' | 'trampoline' | 'goal';
  orbitAngle?: number; // 新幹線の周回角度
  orbitSpeed?: number; // 新幹線の周回速度
  pivotBody?: CANNON.Body; // シーソーの支点（オプション）
  constraint?: CANNON.Constraint; // シーソーのジョイント（オプション）
  pivotMesh?: THREE.Mesh; // シーソーの支点のメッシュ（オプション）
  patrolDirection?: { x: number; z: number }; // ペンギン・牛の移動方向
  patrolTimer?: number; // 移動方向を変更するタイマー
  isEating?: boolean; // 牛が草を食べているか
  eatingTimer?: number; // 草を食べている時間
  headGroup?: THREE.Group; // 牛の頭のグループ（アニメーション用）
  initialPosition?: CANNON.Vec3; // ガードレールの初期位置
  initialQuaternion?: CANNON.Quaternion; // ガードレールの初期角度
  isReturning?: boolean; // ガードレールが元の位置に戻っているか
  stairsBodies?: CANNON.Body[]; // 階段の各ステップの物理ボディ（階段専用）
  stairsGroup?: THREE.Group; // 階段のグループ（階段専用）
  hasTriggered?: boolean; // ゴールが既にトリガーされたか（花火を一度だけ上げるため）
}

const gameObjects: GameObject[] = [];
let selectedObject: GameObject | null = null;
// 花火のパーティクルを管理する配列
const fireworksParticles: THREE.Mesh[] = [];
// 打ち上げ中の花火（爆発前）を管理する配列
const launchingFireworks: Array<{
  particle: THREE.Mesh;
  targetHeight: number;
  explosionColor: number;
}> = [];
let isDragging = false;
let dragPlane: THREE.Plane | null = null;
let dragOffset = new THREE.Vector3();
let selectedObjectOriginalMaterial: THREE.Material | THREE.Material[] | null = null;
const highlightMaterial = new THREE.MeshStandardMaterial({ 
  color: COLORS.HIGHLIGHT,
  emissive: COLORS.HIGHLIGHT,
  emissiveIntensity: 0.3
});

// ビー玉の作成
function createBall(position: { x: number; y: number; z: number }, initialVelocity?: { x: number; y: number; z: number }): GameObject {
  const radius = SIZES.BALL_RADIUS;
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ 
    color: COLORS.BALL,
    metalness: 0.8,
    roughness: 0.2
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(position.x, position.y, position.z);
  scene.add(mesh);

  const shape = new CANNON.Sphere(radius);
  const body = new CANNON.Body({ mass: 1 });
  body.addShape(shape);
  body.position.set(position.x, position.y, position.z);
  
  // ビー玉の物理特性を転がりやすく設定
  body.material = new CANNON.Material({ friction: 0.05, restitution: 0.6 });
  body.linearDamping = 0.01; // 空気抵抗を低く（転がり続ける）
  body.angularDamping = 0.01; // 回転抵抗を低く
  
  // 初期速度を設定（横方向の速度で転がりやすく）
  if (initialVelocity) {
    body.velocity.set(initialVelocity.x, initialVelocity.y, initialVelocity.z);
    // 転がるために角速度も設定
    // 球の半径0.2、転がりの条件: 角速度 * 半径 = 速度
    // 速度を半径で割ると角速度が得られる
    const angularSpeedFactor = 1 / radius; // 約5（1/0.2）
    body.angularVelocity.set(
      -initialVelocity.z * angularSpeedFactor, // Z方向に転がる場合、X軸周りに回転（負の方向）
      0,
      initialVelocity.x * angularSpeedFactor  // X方向に転がる場合、Z軸周りに回転
    );
  }
  
  world.addBody(body);

  return { mesh, body, type: 'ball' };
}

// ドミノの作成
function createDomino(position: { x: number; y: number; z: number }): GameObject {
  const width = SIZES.DOMINO.width;
  const height = SIZES.DOMINO.height;
  const depth = SIZES.DOMINO.depth;
  
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ 
    color: COLORS.DOMINO,
    metalness: 0.3,
    roughness: 0.7
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(position.x, position.y + height / 2, position.z);
  scene.add(mesh);

  const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
  const body = new CANNON.Body({ mass: 0.3 }); // 質量を下げて倒れやすくする（軽い方が倒れやすい）
  body.addShape(shape);
  const initialY = position.y + height / 2;
  body.position.set(position.x, initialY, position.z);
  // 立った状態で初期化
  const initialQuaternion = new CANNON.Quaternion();
  initialQuaternion.set(0, 0, 0, 1); // 単位クォータニオン（立った状態）
  body.quaternion.copy(initialQuaternion);
  body.material = new CANNON.Material({ friction: 0.2, restitution: 0.6 }); // 摩擦を下げ、反発を上げて倒れやすくする
  body.linearDamping = 0.01; // 空気抵抗を低く
  body.angularDamping = 0.005; // 回転抵抗をさらに下げて、倒れやすくする
  world.addBody(body);

  // 初期位置と角度を保存
  const initialPosition = new CANNON.Vec3(position.x, initialY, position.z);

  return { 
    mesh, 
    body, 
    type: 'domino',
    initialPosition: initialPosition,
    initialQuaternion: initialQuaternion.clone(),
    isReturning: false
  };
}

// 坂の作成
function createRamp(position: { x: number; y: number; z: number }): GameObject {
  const width = 3;
  const height = 1;
  const depth = 2;
  
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x4ecdc4,
    metalness: 0.2,
    roughness: 0.8
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(position.x, position.y + height / 2, position.z);
  mesh.rotation.z = Math.PI / 6; // 30度傾ける
  scene.add(mesh);

  const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
  const body = new CANNON.Body({ mass: 0 });
  body.addShape(shape);
  body.position.set(position.x, position.y + height / 2, position.z);
  body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 6);
  body.material = new CANNON.Material({ friction: 0.1, restitution: 0.6 }); // より滑らかな坂
  world.addBody(body);

  return { mesh, body, type: 'ramp' };
}

// 箱の作成
function createBox(position: { x: number; y: number; z: number }): GameObject {
  const size = 0.5;
  
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xffd93d,
    metalness: 0.3,
    roughness: 0.7
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(position.x, position.y + size / 2, position.z);
  scene.add(mesh);

  const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
  const body = new CANNON.Body({ mass: 0.5 });
  body.addShape(shape);
  body.position.set(position.x, position.y + size / 2, position.z);
  body.material = new CANNON.Material({ friction: 0.6, restitution: 0.4 });
  world.addBody(body);

  return { mesh, body, type: 'box' };
}

// シーソーの作成
function createSeesaw(position: { x: number; y: number; z: number }): GameObject {
  const length = 4; // シーソーの長さ
  const width = 0.5; // シーソーの幅
  const thickness = 0.1; // シーソーの厚さ
  
  const geometry = new THREE.BoxGeometry(length, thickness, width);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x9b59b6,
    metalness: 0.4,
    roughness: 0.6
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(position.x, position.y + thickness / 2, position.z);
  scene.add(mesh);
  
  // シーソーの板の物理ボディ
  const shape = new CANNON.Box(new CANNON.Vec3(length / 2, thickness / 2, width / 2));
  const body = new CANNON.Body({ mass: 1 });
  body.addShape(shape);
  body.position.set(position.x, position.y + thickness / 2, position.z);
  body.material = new CANNON.Material({ friction: 0.6, restitution: 0.3 });
  world.addBody(body);
  
  // 中央の支点（固定）
  const pivotShape = new CANNON.Box(new CANNON.Vec3(0.1, 0.3, 0.1));
  const pivotBody = new CANNON.Body({ mass: 0 }); // 質量0で固定
  pivotBody.addShape(pivotShape);
  pivotBody.position.set(position.x, position.y, position.z); // 板の下に配置
  pivotBody.material = new CANNON.Material({ friction: 0.8, restitution: 0.1 });
  world.addBody(pivotBody);
  
  // 支点の視覚化（オプション）
  const pivotGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
  const pivotMaterial = new THREE.MeshStandardMaterial({ color: 0x34495e });
  const pivotMesh = new THREE.Mesh(pivotGeometry, pivotMaterial);
  pivotMesh.position.set(position.x, position.y, position.z);
  pivotMesh.castShadow = true;
  pivotMesh.receiveShadow = true;
  scene.add(pivotMesh);
  
  // ヒンジジョイントで板を支点に接続（中央を軸に回転可能）
  const constraint = new CANNON.PointToPointConstraint(
    body,
    new CANNON.Vec3(0, -thickness / 2, 0), // 板の底面中央
    pivotBody,
    new CANNON.Vec3(0, 0.3, 0) // 支点の上端
  );
  world.addConstraint(constraint);
  
  return { 
    mesh, 
    body, 
    type: 'seesaw',
    pivotBody: pivotBody,
    constraint: constraint,
    pivotMesh: pivotMesh
  };
}

// 山の作成
function createMountain(position: { x: number; y: number; z: number }, height: number = 5, radius: number = 3): GameObject {
  // 円錐形のジオメトリで山を作成
  const geometry = new THREE.ConeGeometry(radius, height, 16);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x6b5b52, // 茶色がかった山の色
    roughness: 0.9
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y + height / 2, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  
  // 物理ボディ（円錐形の代わりに円柱で近似）
  const shape = new CANNON.Cylinder(radius, radius, height, 16);
  const body = new CANNON.Body({ mass: 0 }); // 固定（動かない）
  body.addShape(shape);
  body.position.set(position.x, position.y + height / 2, position.z);
  body.material = new CANNON.Material({ friction: 0.8, restitution: 0.1 });
  world.addBody(body);
  
  return { mesh, body, type: 'mountain' };
}

// 神社の作成
function createShrine(position: { x: number; y: number; z: number }): GameObject {
  const width = 2;
  const height = 3;
  const depth = 1.5;
  
  // 神社の本体（大きめの箱）
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xd4a574, // 神社の色（薄茶色）
    roughness: 0.7,
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y + height / 2, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  // 神社の屋根（三角形の屋根を追加）
  const roofGeometry = new THREE.BoxGeometry(width * 1.2, 0.5, depth * 1.2);
  const roofMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8b4513, // 濃い茶色の屋根
    roughness: 0.8
  });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.set(0, height / 2 + 0.25, 0);
  mesh.add(roof);
  
  // 神社の鳥居（簡易版）
  const toriiGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.1);
  const toriiMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  
  // 左右の柱
  const leftPillar = new THREE.Mesh(toriiGeometry, toriiMaterial);
  leftPillar.position.set(-width * 0.6, 0, depth / 2 + 0.5);
  mesh.add(leftPillar);
  
  const rightPillar = new THREE.Mesh(toriiGeometry, toriiMaterial);
  rightPillar.position.set(width * 0.6, 0, depth / 2 + 0.5);
  mesh.add(rightPillar);
  
  // 上の横木
  const topBeam = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.4, 0.1, 0.3),
    toriiMaterial
  );
  topBeam.position.set(0, 0.75, depth / 2 + 0.5);
  mesh.add(topBeam);
  
  scene.add(mesh);
  
  // 物理ボディ
  const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
  const body = new CANNON.Body({ mass: 0 }); // 固定（動かない）
  body.addShape(shape);
  body.position.set(position.x, position.y + height / 2, position.z);
  body.material = new CANNON.Material({ friction: 0.6, restitution: 0.2 });
  world.addBody(body);
  
  return { mesh, body, type: 'shrine' };
}

// 階段の作成（一つのオブジェクトとして扱う）
function createStairs(
  startPos: { x: number; y: number; z: number },
  endPos: { x: number; y: number; z: number },
  stepWidth: number = 1.5,
  stepHeight: number = 0.3,
  stepDepth: number = 0.5
): GameObject {
  const group = new THREE.Group();
  const stairsBodies: CANNON.Body[] = [];
  
  // 階段の方向と距離を計算
  const dx = endPos.x - startPos.x;
  const dz = endPos.z - startPos.z;
  const dy = endPos.y - startPos.y;
  const angle = Math.atan2(dz, dx);
  
  // 必要なステップ数を計算
  const numSteps = Math.max(1, Math.ceil(Math.abs(dy) / stepHeight));
  const actualStepHeight = dy / numSteps;
  
  // グループの中心位置（開始位置と終了位置の中点）
  const centerX = (startPos.x + endPos.x) / 2;
  const centerY = (startPos.y + endPos.y) / 2;
  const centerZ = (startPos.z + endPos.z) / 2;
  group.position.set(centerX, centerY, centerZ);
  
  // 各ステップを作成（グループの中心を基準に相対位置で配置）
  for (let i = 0; i < numSteps; i++) {
    const stepY = startPos.y + actualStepHeight * (i + 0.5) - centerY;
    const stepX = startPos.x + (dx / numSteps) * (i + 0.5) - centerX;
    const stepZ = startPos.z + (dz / numSteps) * (i + 0.5) - centerZ;
    
    // ステップのジオメトリ
    const stepGeometry = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
    const stepMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xaa9a8a, // 階段の色（明るい石色で目立つように）
      roughness: 0.8,
      metalness: 0.1
    });
    const stepMesh = new THREE.Mesh(stepGeometry, stepMaterial);
    stepMesh.position.set(stepX, stepY, stepZ);
    stepMesh.rotation.y = angle;
    stepMesh.castShadow = true;
    stepMesh.receiveShadow = true;
    group.add(stepMesh);
    
    // ステップの物理ボディ（グループの中心を基準に相対位置で配置）
    const stepShape = new CANNON.Box(new CANNON.Vec3(stepWidth / 2, stepHeight / 2, stepDepth / 2));
    const stepBody = new CANNON.Body({ mass: 0 }); // 固定
    stepBody.addShape(stepShape);
    stepBody.position.set(centerX + stepX, centerY + stepY, centerZ + stepZ);
    stepBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
    stepBody.material = new CANNON.Material({ friction: 0.3, restitution: 0.1 });
    world.addBody(stepBody);
    stairsBodies.push(stepBody);
  }
  
  scene.add(group);
  
  // グループ全体を一つのメッシュとして扱うためのダミーメッシュ（レイキャスティング用）
  const boundingBox = new THREE.Box3().setFromObject(group);
  const size = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());
  const dummyGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const dummyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xaa9a8a,
    transparent: true,
    opacity: 0.01, // ほぼ透明（クリック検出用）
    visible: true // レイキャスティングで検出するために表示（ほぼ透明）
  });
  const dummyMesh = new THREE.Mesh(dummyGeometry, dummyMaterial);
  dummyMesh.position.copy(center);
  group.add(dummyMesh);
  
  // 一つのGameObjectとして返す（グループをメッシュとして扱う）
  return {
    mesh: group as any, // グループをメッシュとして扱う
    body: stairsBodies[0] || new CANNON.Body({ mass: 0 }), // 最初のステップのボディを基準に
    type: 'stairs',
    stairsBodies: stairsBodies,
    stairsGroup: group
  };
}

// 道路の作成
function createRoad(
  startPos: { x: number; y: number; z: number },
  endPos: { x: number; y: number; z: number },
  width: number = 1.5,
  height: number = 0.1
): GameObject {
  // 開始位置と終了位置の中点を計算
  const midX = (startPos.x + endPos.x) / 2;
  const midZ = (startPos.z + endPos.z) / 2;
  const midY = (startPos.y + endPos.y) / 2 + height / 2;
  
  // 距離を計算
  const distance = Math.sqrt(
    Math.pow(endPos.x - startPos.x, 2) + 
    Math.pow(endPos.z - startPos.z, 2)
  );
  
  // 角度を計算
  const angle = Math.atan2(endPos.z - startPos.z, endPos.x - startPos.x);
  
  // 道路のジオメトリ
  const geometry = new THREE.BoxGeometry(distance, height, width);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x4a4a4a, // 灰色の道路
    roughness: 0.9
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(midX, midY, midZ);
  mesh.rotation.y = angle; // 道路の方向を設定
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  scene.add(mesh);
  
  // 物理ボディ（道路も固定）
  const shape = new CANNON.Box(new CANNON.Vec3(distance / 2, height / 2, width / 2));
  const body = new CANNON.Body({ mass: 0 }); // 固定（動かない）
  body.addShape(shape);
  body.position.set(midX, midY, midZ);
  body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
  body.material = new CANNON.Material({ friction: 0.3, restitution: 0.1 });
  world.addBody(body);
  
  return { mesh, body, type: 'road' };
}

// 長い板状のオブジェクトの作成（橋や板）
function createPlank(
  position: { x: number; y: number; z: number },
  length: number = 4,
  width: number = 1.5,
  height: number = 0.2,
  rotationY: number = 0
): GameObject {
  // 板のジオメトリ
  const geometry = new THREE.BoxGeometry(length, height, width);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x8b6914, // 木の色（茶色がかった色）
    roughness: 0.8,
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y + height / 2, position.z);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  
  // 物理ボディ
  const shape = new CANNON.Box(new CANNON.Vec3(length / 2, height / 2, width / 2));
  const body = new CANNON.Body({ mass: 0 }); // 固定（動かない）
  body.addShape(shape);
  body.position.set(position.x, position.y + height / 2, position.z);
  body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);
  body.material = new CANNON.Material({ friction: 0.3, restitution: 0.1 });
  world.addBody(body);
  
  return { mesh, body, type: 'plank' };
}

// 牧草ゾーンの作成
function createGrassZone(
  position: { x: number; y: number; z: number },
  width: number = 10,
  depth: number = 10
): void {
  // 牧草ゾーンの地面（緑色）
  const grassGeometry = new THREE.PlaneGeometry(width, depth);
  const grassMaterial = new THREE.MeshStandardMaterial({ 
    color: COLORS.GRASS,
    roughness: 0.9
  });
  const grassPlane = new THREE.Mesh(grassGeometry, grassMaterial);
  grassPlane.rotation.x = -Math.PI / 2;
  grassPlane.position.set(position.x, position.y + 0.01, position.z);
  grassPlane.receiveShadow = true;
  scene.add(grassPlane);
  
  // 草のメッシュを複数配置（ランダムに散りばめる）
  const numGrassBlades = PASTURE.NUM_GRASS_BLADES;
  const grassGroup = new THREE.Group();
  
  for (let i = 0; i < numGrassBlades; i++) {
    // ランダムな位置
    const x = position.x + (Math.random() - 0.5) * width;
    const z = position.z + (Math.random() - 0.5) * depth;
    
    // 草の葉（細長い箱）
    const bladeGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.05);
    const bladeMaterial = new THREE.MeshStandardMaterial({ 
      color: COLORS.GRASS_BLADE,
      roughness: 0.8
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(x, position.y + 0.15, z);
    blade.rotation.z = (Math.random() - 0.5) * 0.3; // 少し傾ける
    blade.rotation.y = Math.random() * Math.PI * 2; // ランダムな方向
    
    // 草の束（複数の葉を束ねる）
    const bundle = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const singleBlade = blade.clone();
      singleBlade.position.x += (Math.random() - 0.5) * 0.1;
      singleBlade.position.z += (Math.random() - 0.5) * 0.1;
      singleBlade.rotation.z += (Math.random() - 0.5) * 0.2;
      bundle.add(singleBlade);
    }
    
    grassGroup.add(bundle);
  }
  
  scene.add(grassGroup);
}

// ガードレールの作成
function createGuardRail(
  position: { x: number; y: number; z: number },
  length: number = 3,
  height: number = 0.5,
  rotationY: number = 0
): GameObject {
  const thickness = 0.1; // ガードレールの厚さ
  
  // ガードレールのメイン構造（細長い箱）
  const geometry = new THREE.BoxGeometry(length, height, thickness);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xc0c0c0, // シルバーグレー（金属のガードレール）
    metalness: 0.8,
    roughness: 0.3
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y + height / 2, position.z);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  // ガードレールの上端に横棒を追加（よりリアルに）
  const topBarGeometry = new THREE.BoxGeometry(length, 0.05, thickness * 1.5);
  const topBar = new THREE.Mesh(topBarGeometry, material);
  topBar.position.set(0, height / 2 - 0.025, 0);
  mesh.add(topBar);
  
  // ガードレールの支柱を追加（複数の支柱で構成）
  const postWidth = 0.08;
  const postHeight = height * 0.8;
  const postDepth = 0.08;
  const numPosts = Math.floor(length / 1.0) + 1; // 1メートルごとに支柱
  
  for (let i = 0; i < numPosts; i++) {
    const postGeometry = new THREE.BoxGeometry(postWidth, postHeight, postDepth);
    const post = new THREE.Mesh(postGeometry, material);
    const postX = -length / 2 + (i * length / (numPosts - 1));
    post.position.set(postX, -(height - postHeight) / 2, 0);
    mesh.add(post);
  }
  
  scene.add(mesh);
  
  // 物理ボディ（ガードレールは倒せるように質量を持つ）
  const shape = new CANNON.Box(new CANNON.Vec3(length / 2, height / 2, thickness / 2));
  // 質量を計算（体積 × 密度、金属なので密度は高い）
  const volume = length * height * thickness;
  const density = 2.0; // 金属の密度（kg/m³、簡略化）
  const mass = volume * density;
  const body = new CANNON.Body({ mass: mass }); // 質量を持つ（倒せる）
  body.addShape(shape);
  const initialY = position.y + height / 2;
  body.position.set(position.x, initialY, position.z);
  const initialQuaternion = new CANNON.Quaternion();
  initialQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);
  body.quaternion.copy(initialQuaternion);
  body.material = new CANNON.Material({ friction: 0.5, restitution: 0.4 });
  body.linearDamping = 0.3; // 空気抵抗
  body.angularDamping = 0.3; // 回転抵抗
  world.addBody(body);
  
  // 初期位置と角度を保存
  const initialPosition = new CANNON.Vec3(position.x, initialY, position.z);
  
  return { 
    mesh, 
    body, 
    type: 'guardrail',
    initialPosition: initialPosition,
    initialQuaternion: initialQuaternion.clone(),
    isReturning: false
  };
}

// トランポリンの作成
function createTrampoline(position: { x: number; y: number; z: number }): GameObject {
  const radius = 1.5;
  const thickness = 0.1;
  
  // トランポリンのマット（円形）
  const matGeometry = new THREE.CylinderGeometry(radius, radius, thickness, 32);
  const matMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff69b4, // ピンク
    metalness: 0.1,
    roughness: 0.7
  });
  const matMesh = new THREE.Mesh(matGeometry, matMaterial);
  matMesh.position.set(position.x, position.y + thickness / 2, position.z);
  matMesh.rotation.x = Math.PI / 2; // 横向きにする
  matMesh.castShadow = true;
  matMesh.receiveShadow = true;
  
  // トランポリンの枠（金属のリング）
  const frameGeometry = new THREE.TorusGeometry(radius + 0.1, 0.05, 8, 32);
  const frameMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x888888, // グレー
    metalness: 0.8,
    roughness: 0.2
  });
  const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
  frameMesh.position.set(position.x, position.y + 0.15, position.z);
  frameMesh.rotation.x = Math.PI / 2;
  frameMesh.castShadow = true;
  
  // グループにまとめる
  const group = new THREE.Group();
  group.add(matMesh);
  group.add(frameMesh);
  scene.add(group);
  
  // 物理ボディ（高反発のマテリアル）
  const shape = new CANNON.Cylinder(radius, radius, thickness, 32);
  const body = new CANNON.Body({ mass: 0 }); // 固定
  body.addShape(shape);
  body.position.set(position.x, position.y + thickness / 2, position.z);
  body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
  // 高反発のマテリアル
  const trampolineMaterial = new CANNON.Material({ 
    friction: 0.1, 
    restitution: 1.5 // 非常に高反発（1.5で上向きに加速）
  });
  body.material = trampolineMaterial;
  world.addBody(body);
  
  return { 
    mesh: group as any, 
    body, 
    type: 'trampoline'
  };
}

// ゴールの作成
function createGoal(position: { x: number; y: number; z: number }): GameObject {
  const width = 2;
  const height = 1;
  const depth = 2;
  const wallThickness = 0.1;
  
  // ゴールのマテリアル（金色）
  const goalMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffd700, // 金色
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0xffd700,
    emissiveIntensity: 0.3
  });
  
  const group = new THREE.Group();
  
  // 底面
  const bottom = new THREE.Mesh(
    new THREE.BoxGeometry(width, wallThickness, depth),
    goalMaterial
  );
  bottom.position.set(0, wallThickness / 2, 0);
  group.add(bottom);
  
  // 前面の壁
  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, wallThickness),
    goalMaterial
  );
  frontWall.position.set(0, height / 2, depth / 2);
  group.add(frontWall);
  
  // 後面の壁
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, wallThickness),
    goalMaterial
  );
  backWall.position.set(0, height / 2, -depth / 2);
  group.add(backWall);
  
  // 左側の壁
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, height, depth),
    goalMaterial
  );
  leftWall.position.set(-width / 2, height / 2, 0);
  group.add(leftWall);
  
  // 右側の壁
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, height, depth),
    goalMaterial
  );
  rightWall.position.set(width / 2, height / 2, 0);
  group.add(rightWall);
  
  // 旗のポール（細い円柱）
  const poleHeight = 2;
  const poleRadius = 0.03;
  const poleGeometry = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 16);
  const poleMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x888888, // グレー
    metalness: 0.5,
    roughness: 0.5
  });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.set(0, height + poleHeight / 2, 0);
  group.add(pole);
  
  // 旗の布（平面）
  const flagWidth = 0.8;
  const flagHeight = 0.6;
  const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight);
  const flagMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff0000, // 赤
    side: THREE.DoubleSide,
    emissive: 0xff0000,
    emissiveIntensity: 0.3
  });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  // 旗をポールの上に配置（少し風になびく感じで角度をつける）
  flag.position.set(flagWidth / 2 + 0.05, height + poleHeight - flagHeight / 2, 0);
  flag.rotation.y = -Math.PI / 6; // 少し角度をつける
  group.add(flag);
  
  group.position.set(position.x, position.y, position.z);
  group.castShadow = true;
  group.receiveShadow = true;
  scene.add(group);
  
  // 物理ボディ（検出用の透明な箱）
  const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
  const body = new CANNON.Body({ mass: 0 }); // 固定
  body.addShape(shape);
  body.position.set(position.x, position.y + height / 2, position.z);
  world.addBody(body);
  
  return { 
    mesh: group as any, 
    body, 
    type: 'goal',
    hasTriggered: false
  };
}

// 花火エフェクトの作成（打ち上げ花火風）
function createFireworks(position: { x: number; y: number; z: number }): void {
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
  const explosionColor = colors[Math.floor(Math.random() * colors.length)];
  
  // 打ち上げパーティクル（上に打ち上がる）
  const launchGeometry = new THREE.SphereGeometry(0.15, 8, 8);
  const launchMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, // 白い打ち上げ
    emissive: 0xffffff,
    emissiveIntensity: 2.0,
    transparent: true,
    opacity: 1.0
  });
  const launchParticle = new THREE.Mesh(launchGeometry, launchMaterial);
  
  // 打ち上げ速度（上方向に速く、でも見えるように）
  const launchSpeed = 8; // 速度を下げて見やすく
  launchParticle.position.set(position.x, position.y, position.z);
  launchParticle.userData.velocity = new THREE.Vector3(0, launchSpeed, 0);
  launchParticle.userData.gravity = -0.2;
  
  // 爆発する高さ（ランダムに8-15m、高めに）
  const targetHeight = position.y + Math.random() * 7 + 8;
  
  scene.add(launchParticle);
  launchingFireworks.push({
    particle: launchParticle,
    targetHeight: targetHeight,
    explosionColor: explosionColor
  });
}

// 花火の爆発エフェクト（放射状に広がる）
function explodeFireworks(position: { x: number; y: number; z: number }, color: number): void {
  const numParticles = 300; // 爆発時のパーティクル数を増やす
  
  for (let i = 0; i < numParticles; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.15, 8, 8); // サイズを大きく
    const particleMaterial = new THREE.MeshStandardMaterial({ 
      color: color,
      emissive: color,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 1.0
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    
    // 放射状に広がる方向を計算
    const angle = Math.random() * Math.PI * 2; // 水平方向の角度
    const elevation = (Math.random() - 0.5) * Math.PI; // 上下方向の角度（-90度から90度）
    const speed = Math.random() * 12 + 8; // 爆発速度（少し調整）
    
    particle.position.set(position.x, position.y, position.z);
    particle.userData.velocity = new THREE.Vector3(
      Math.cos(angle) * Math.cos(elevation) * speed,
      Math.sin(elevation) * speed,
      Math.sin(angle) * Math.cos(elevation) * speed
    );
    particle.userData.life = 400; // 約6.7秒間（400フレーム）
    particle.userData.maxLife = 400;
    particle.userData.gravity = -0.2; // 重力を少し弱く
    
    scene.add(particle);
    fireworksParticles.push(particle);
  }
}

// ゴールメッセージの表示
function showGoalMessage(): void {
  // 既存のメッセージがあれば削除
  const existingMessage = document.getElementById('goal-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // メッセージ要素を作成
  const message = document.createElement('div');
  message.id = 'goal-message';
  message.textContent = 'ゴール！おめでとう！';
  message.style.position = 'fixed';
  message.style.top = '50%';
  message.style.left = '50%';
  message.style.transform = 'translate(-50%, -50%)';
  message.style.fontSize = '72px';
  message.style.fontWeight = 'bold';
  message.style.color = '#ffd700';
  message.style.textShadow = '0 0 20px #ff0000, 0 0 40px #ff0000, 0 0 60px #ff0000';
  message.style.zIndex = '10000';
  message.style.pointerEvents = 'none';
  message.style.fontFamily = 'Arial, sans-serif';
  message.style.animation = 'goalMessagePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  message.style.opacity = '0';
  
  // アニメーションスタイルを追加
  if (!document.getElementById('goal-message-style')) {
    const style = document.createElement('style');
    style.id = 'goal-message-style';
    style.textContent = `
      @keyframes goalMessagePop {
        0% { 
          transform: translate(-50%, -50%) scale(0) rotate(-180deg); 
          opacity: 0; 
        }
        50% {
          transform: translate(-50%, -50%) scale(1.2) rotate(0deg);
          opacity: 1;
        }
        100% { 
          transform: translate(-50%, -50%) scale(1) rotate(0deg); 
          opacity: 1; 
        }
      }
      @keyframes goalMessageFade {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(message);
  
  // アニメーション開始
  setTimeout(() => {
    message.style.opacity = '1';
  }, 10);
  
  // 3秒後にフェードアウト
  setTimeout(() => {
    message.style.animation = 'goalMessageFade 1s ease-out';
    message.style.opacity = '0';
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 1000);
  }, 3000);
}

// ペンギンの作成
function createPenguin(position: { x: number; y: number; z: number }): GameObject {
  const group = new THREE.Group();
  
  // ペンギンの体（白）
  const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 16);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    roughness: 0.7
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.4;
  group.add(body);
  
  // ペンギンの頭（白）
  const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
  const headMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    roughness: 0.7
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.set(0, 0.85, 0);
  group.add(head);
  
  // ペンギンのくちばし（黄色）
  const beakGeometry = new THREE.ConeGeometry(0.05, 0.15, 8);
  const beakMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffa500,
    roughness: 0.5
  });
  const beak = new THREE.Mesh(beakGeometry, beakMaterial);
  beak.position.set(0, 0.95, 0.2);
  group.add(beak);
  
  // ペンギンの目（黒）
  const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.1, 0.9, 0.2);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.1, 0.9, 0.2);
  group.add(rightEye);
  
  // ペンギンの羽（黒）
  const wingGeometry = new THREE.BoxGeometry(0.3, 0.15, 0.6);
  const wingMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a,
    roughness: 0.8
  });
  const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
  leftWing.position.set(-0.35, 0.4, 0);
  leftWing.rotation.z = Math.PI / 6;
  group.add(leftWing);
  const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
  rightWing.position.set(0.35, 0.4, 0);
  rightWing.rotation.z = -Math.PI / 6;
  group.add(rightWing);
  
  // ペンギンの足（黄色）
  const footGeometry = new THREE.BoxGeometry(0.15, 0.05, 0.2);
  const footMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffa500,
    roughness: 0.5
  });
  const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
  leftFoot.position.set(-0.1, 0, 0);
  group.add(leftFoot);
  const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
  rightFoot.position.set(0.1, 0, 0);
  group.add(rightFoot);
  
  group.position.set(position.x, position.y, position.z);
  group.castShadow = true;
  group.receiveShadow = true;
  scene.add(group);
  
  // 物理ボディ（カプセル形状で近似）
  const shape = new CANNON.Cylinder(0.3, 0.35, 0.8, 16);
  const bodyPhy = new CANNON.Body({ mass: 1 });
  bodyPhy.addShape(shape);
  bodyPhy.position.set(position.x, position.y + 0.4, position.z);
  bodyPhy.material = new CANNON.Material({ friction: 0.5, restitution: 0.3 });
  bodyPhy.linearDamping = 0.5; // 移動抵抗
  bodyPhy.angularDamping = 0.5; // 回転抵抗
  world.addBody(bodyPhy);
  
  // ランダムな初期移動方向
  const angle = Math.random() * Math.PI * 2;
  const patrolDirection = {
    x: Math.cos(angle),
    z: Math.sin(angle)
  };
  
  return { 
    mesh: group as any, 
    body: bodyPhy, 
    type: 'penguin',
    patrolDirection: patrolDirection,
    patrolTimer: Math.random() * 3 + 2 // 2-5秒後に方向変更
  };
}

// 牛の作成
function createCow(position: { x: number; y: number; z: number }): GameObject {
  const group = new THREE.Group();
  
  // 牛の体（白をベースに、黒いまだら模様）
  const bodyGeometry = new THREE.BoxGeometry(0.8, 0.6, 1.2);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, // 白をベース
    roughness: 0.8
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.5;
  group.add(body);
  
  // 体の黒いまだら模様
  const blackSpotGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const blackSpotMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x000000,
    roughness: 0.8
  });
  
  // 体の黒い斑点を複数配置
  const bodySpots = [
    { x: 0.15, y: 0.55, z: 0.1 },
    { x: -0.15, y: 0.55, z: -0.1 },
    { x: 0.2, y: 0.5, z: 0.3 },
    { x: -0.2, y: 0.6, z: 0.2 },
    { x: 0.1, y: 0.5, z: -0.3 },
    { x: -0.15, y: 0.55, z: -0.4 }
  ];
  
  bodySpots.forEach(spotPos => {
    const spot = new THREE.Mesh(blackSpotGeometry, blackSpotMaterial);
    spot.position.set(spotPos.x, spotPos.y, spotPos.z);
    spot.scale.set(1, 1.2, 1); // 少し縦長に
    group.add(spot);
  });
  
  // 牛の頭（白をベースに、黒いまだら模様）
  // 頭をグループ化して、草を食べる時にアニメーションできるようにする
  const headGroup = new THREE.Group();
  const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.6);
  const headMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, // 白をベース
    roughness: 0.8
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.set(0, 0.6, 0.7);
  headGroup.add(head);
  headGroup.position.set(0, 0, 0); // グループの位置は0
  group.add(headGroup);
  
  // 頭の黒い模様（目の周り、頭の横に配置、画像に合わせて）（頭グループに追加）
  // 左目の周りの黒いパッチ
  const headSpot1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.2, 0.1),
    blackSpotMaterial
  );
  headSpot1.position.set(-0.15, 0.65, 0.88);
  headSpot1.rotation.y = -0.2; // 少し角度をつける
  headGroup.add(headSpot1);
  
  // 右目の周りの黒いパッチ
  const headSpot2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.2, 0.1),
    blackSpotMaterial
  );
  headSpot2.position.set(0.15, 0.65, 0.88);
  headSpot2.rotation.y = 0.2; // 少し角度をつける
  headGroup.add(headSpot2);
  
  // 頭の横の黒いパッチ（左側）
  const headSpot3 = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.15, 0.08),
    blackSpotMaterial
  );
  headSpot3.position.set(-0.22, 0.6, 0.75);
  headGroup.add(headSpot3);
  
  // 頭の横の黒いパッチ（右側）
  const headSpot4 = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.15, 0.08),
    blackSpotMaterial
  );
  headSpot4.position.set(0.22, 0.6, 0.75);
  headGroup.add(headSpot4);
  
  // 牛の耳（茶色のフェルト、画像に合わせて丸みを帯びた形状）（頭グループに追加）
  const earGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.25, 8);
  const earMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xd2b48c, // 茶色（フェルト色）
    roughness: 0.9,
    metalness: 0.0
  });
  const leftEar = new THREE.Mesh(earGeometry, earMaterial);
  leftEar.position.set(-0.25, 0.75, 0.85);
  leftEar.rotation.z = Math.PI / 6;
  leftEar.rotation.x = Math.PI / 12; // 少し前に傾ける
  headGroup.add(leftEar);
  
  const rightEar = new THREE.Mesh(earGeometry, earMaterial);
  rightEar.position.set(0.25, 0.75, 0.85);
  rightEar.rotation.z = -Math.PI / 6;
  rightEar.rotation.x = Math.PI / 12; // 少し前に傾ける
  headGroup.add(rightEar);
  
  // 牛の角（黒）（頭グループに追加）
  const hornGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
  const hornMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x000000, // 黒
    roughness: 0.9
  });
  const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
  leftHorn.position.set(-0.15, 0.9, 0.85);
  leftHorn.rotation.x = -Math.PI / 6;
  headGroup.add(leftHorn);
  const rightHorn = new THREE.Mesh(hornGeometry, hornMaterial);
  rightHorn.position.set(0.15, 0.9, 0.85);
  rightHorn.rotation.x = -Math.PI / 6;
  headGroup.add(rightHorn);
  
  // 牛の目（小さな丸い黒いプラスチックの目、画像に合わせて）（頭グループに追加）
  const eyeGeometry = new THREE.SphereGeometry(0.06, 12, 12);
  const eyeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x000000,
    roughness: 0.1, // 光沢のあるプラスチック感
    metalness: 0.3
  });
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.15, 0.65, 0.96);
  headGroup.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.15, 0.65, 0.96);
  headGroup.add(rightEye);
  
  // 牛の鼻（白で少し突出、画像に合わせて）（頭グループに追加）
  const noseGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.1);
  const noseMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    roughness: 0.8
  });
  const nose = new THREE.Mesh(noseGeometry, noseMaterial);
  nose.position.set(0, 0.55, 1.0); // 少し前に突出
  headGroup.add(nose);
  
  // 牛の足（4本、白と黒のまだら）
  const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
  const legMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, // 白をベース
    roughness: 0.8
  });
  const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
  frontLeftLeg.position.set(-0.25, 0.25, 0.4);
  group.add(frontLeftLeg);
  // 足の黒い模様
  const frontLeftLegSpot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8),
    blackSpotMaterial
  );
  frontLeftLegSpot.position.set(-0.25, 0.35, 0.4);
  group.add(frontLeftLegSpot);
  
  const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
  frontRightLeg.position.set(0.25, 0.25, 0.4);
  group.add(frontRightLeg);
  const frontRightLegSpot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8),
    blackSpotMaterial
  );
  frontRightLegSpot.position.set(0.25, 0.35, 0.4);
  group.add(frontRightLegSpot);
  
  const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
  backLeftLeg.position.set(-0.25, 0.25, -0.4);
  group.add(backLeftLeg);
  const backLeftLegSpot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8),
    blackSpotMaterial
  );
  backLeftLegSpot.position.set(-0.25, 0.35, -0.4);
  group.add(backLeftLegSpot);
  
  const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
  backRightLeg.position.set(0.25, 0.25, -0.4);
  group.add(backRightLeg);
  const backRightLegSpot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8),
    blackSpotMaterial
  );
  backRightLegSpot.position.set(0.25, 0.35, -0.4);
  group.add(backRightLegSpot);
  
  // 首の周りの緑のリボン（画像に合わせて）（頭グループに追加）
  const ribbonMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x32cd32, // 明るい緑
    roughness: 0.3, // サテン感
    metalness: 0.1
  });
  
  // リボンの本体（首の周り）
  const ribbonBodyGeometry = new THREE.TorusGeometry(0.35, 0.03, 8, 16);
  const ribbonBody = new THREE.Mesh(ribbonBodyGeometry, ribbonMaterial);
  ribbonBody.position.set(0, 0.5, 0.65);
  ribbonBody.rotation.x = Math.PI / 2;
  headGroup.add(ribbonBody);
  
  // リボンの弓結び（左側のループ）
  const bowLoop1Geometry = new THREE.TorusGeometry(0.05, 0.025, 8, 16);
  const bowLoop1 = new THREE.Mesh(bowLoop1Geometry, ribbonMaterial);
  bowLoop1.position.set(-0.08, 0.53, 0.65);
  bowLoop1.rotation.z = Math.PI / 4;
  headGroup.add(bowLoop1);
  
  // リボンの弓結び（右側のループ）
  const bowLoop2Geometry = new THREE.TorusGeometry(0.05, 0.025, 8, 16);
  const bowLoop2 = new THREE.Mesh(bowLoop2Geometry, ribbonMaterial);
  bowLoop2.position.set(0.08, 0.53, 0.65);
  bowLoop2.rotation.z = -Math.PI / 4;
  headGroup.add(bowLoop2);
  
  // リボンの中心部分（結び目）
  const bowCenterGeometry = new THREE.BoxGeometry(0.06, 0.04, 0.03);
  const bowCenter = new THREE.Mesh(bowCenterGeometry, ribbonMaterial);
  bowCenter.position.set(0, 0.52, 0.68);
  headGroup.add(bowCenter);
  
  group.position.set(position.x, position.y, position.z);
  group.castShadow = true;
  group.receiveShadow = true;
  scene.add(group);
  
  // 物理ボディ
  const shape = new CANNON.Box(new CANNON.Vec3(0.4, 0.5, 0.6));
  const bodyPhy = new CANNON.Body({ mass: 5 }); // 牛は重い
  bodyPhy.addShape(shape);
  // 牛の物理ボディの中心位置：牛の高さが1.0（0.5 * 2）なので、底部がposition.yになるように設定
  bodyPhy.position.set(position.x, position.y + 0.5, position.z);
  bodyPhy.material = new CANNON.Material({ friction: 0.7, restitution: 0.2 });
  bodyPhy.linearDamping = 0.6; // 移動抵抗
  bodyPhy.angularDamping = 0.6; // 回転抵抗
  world.addBody(bodyPhy);
  
  // ランダムな初期移動方向
  const angle = Math.random() * Math.PI * 2;
  const patrolDirection = {
    x: Math.cos(angle),
    z: Math.sin(angle)
  };
  
  return { 
    mesh: group as any, 
    body: bodyPhy, 
    type: 'cow',
    patrolDirection: patrolDirection,
    patrolTimer: Math.random() * 3 + 2, // 2-5秒後に方向変更
    isEating: false,
    eatingTimer: 0,
    headGroup: headGroup // 頭のグループを保存（アニメーション用）
  };
}

// 新幹線の1両を作成する関数
function createTrainCar(isFirstCar: boolean = false): THREE.Group {
  const carGroup = new THREE.Group();
  
  // 新幹線の本体（長い箱、大きめに）
  const bodyLength = 3.0; // 1両の長さ
  const bodyWidth = 1.0;
  const bodyHeight = 1.2;
  const bodyGeometry = new THREE.BoxGeometry(bodyLength, bodyHeight, bodyWidth);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, // 白をベース
    metalness: 0.8,
    roughness: 0.2
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.set(0, bodyHeight / 2, 0);
  carGroup.add(body);
  
  // 先頭車両のみ先頭を追加
  if (isFirstCar) {
    const noseGeometry = new THREE.ConeGeometry(0.6, 1.5, 8);
    const noseMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      metalness: 0.8,
      roughness: 0.2
    });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(bodyLength / 2 + 0.75, bodyHeight / 2, 0);
    // 円錐の尖っている側が前（X方向）を向くように回転
    nose.rotation.z = -Math.PI / 2; // Z軸周りに-90度回転（X方向を向く）
    carGroup.add(nose);
  }
  
  // 新幹線のライン（特徴的な青いライン）
  const lineGeometry = new THREE.BoxGeometry(bodyLength, 0.15, bodyWidth + 0.1);
  const lineMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x0066cc, // 青いライン
    metalness: 0.5,
    roughness: 0.3
  });
  const line1 = new THREE.Mesh(lineGeometry, lineMaterial);
  line1.position.set(0, bodyHeight / 2 - 0.15, 0);
  carGroup.add(line1);
  
  const line2 = new THREE.Mesh(lineGeometry, lineMaterial);
  line2.position.set(0, bodyHeight / 2 - 0.5, 0);
  carGroup.add(line2);
  
  // 新幹線の窓（複数の窓を表現）
  const windowMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a, // 暗い色（ガラスのように）
    metalness: 0.3,
    roughness: 0.1,
    transparent: true,
    opacity: 0.3
  });
  const numWindows = 4; // 1両あたりの窓の数
  for (let i = 0; i < numWindows; i++) {
    const windowGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.02);
    const window = new THREE.Mesh(windowGeometry, windowMaterial);
    const x = -bodyLength / 2 + 0.5 + i * 0.7;
    window.position.set(x, bodyHeight / 2 + 0.15, bodyWidth / 2 + 0.01);
    carGroup.add(window);
  }
  
  // 新幹線の車輪（複数の車輪）
  const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x333333, // 黒い車輪
    metalness: 0.5,
    roughness: 0.5
  });
  const numWheels = 2; // 1両あたりの車輪の数
  for (let i = 0; i < numWheels; i++) {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    const x = -bodyLength / 2 + 0.7 + i * 1.6;
    wheel.position.set(x, 0.2, bodyWidth / 2 + 0.15);
    wheel.rotation.z = Math.PI / 2;
    carGroup.add(wheel);
    
    // 反対側の車輪
    const wheel2 = wheel.clone();
    wheel2.position.z = -bodyWidth / 2 - 0.15;
    carGroup.add(wheel2);
  }
  
  return carGroup;
}

// 新幹線の作成（16両編成）
function createTrain(position: { x: number; y: number; z: number }, initialAngle: number = 0): GameObject {
  const group = new THREE.Group();
  const numCars = 1; // 1両編成
  const carLength = 3.0; // 1両の長さ
  const totalLength = numCars * carLength; // 全長
  
  // 1両の車両を作成（先頭車両として作成）
  const car = createTrainCar(true);
  car.position.set(0, 0, 0);
  group.add(car);
  
  group.position.set(position.x, position.y, position.z);
  group.rotation.y = initialAngle;
  group.castShadow = true;
  group.receiveShadow = true;
  scene.add(group);
  
  // 物理ボディ（固定、周回アニメーション用、1両分の長さ）
  const bodyHeight = 1.2;
  const bodyWidth = 1.0;
  const shape = new CANNON.Box(new CANNON.Vec3(totalLength / 2, bodyHeight / 2, bodyWidth / 2));
  const bodyPhy = new CANNON.Body({ mass: 0 }); // 固定（物理シミュレーションには参加しない）
  bodyPhy.addShape(shape);
  bodyPhy.position.set(position.x, position.y + bodyHeight / 2, position.z);
  bodyPhy.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), initialAngle);
  world.addBody(bodyPhy);
  
  return {
    mesh: group as any,
    body: bodyPhy,
    type: 'train',
    orbitAngle: initialAngle,
    orbitSpeed: 0.02 // 周回速度（ラジアン/フレーム）
  };
}

// ============================================================================
// 共通処理関数
// ============================================================================

/**
 * オブジェクトが倒れた場合、自動的に元の位置に戻す処理
 */
function handleObjectReturn(obj: GameObject): void {
  if (!obj.initialPosition || !obj.initialQuaternion) return;
  
  const pos = obj.body.position;
  const quat = obj.body.quaternion;
  const initialPos = obj.initialPosition;
  const initialQuat = obj.initialQuaternion;
  
  // オブジェクトが倒れているかチェック
  const positionDiff = pos.distanceTo(initialPos);
  const quatDiff = quat.x * initialQuat.x + quat.y * initialQuat.y + 
                   quat.z * initialQuat.z + quat.w * initialQuat.w;
  const isFallen = positionDiff > RETURN_CONFIG.POSITION_THRESHOLD || 
                   quatDiff < RETURN_CONFIG.QUATERNION_THRESHOLD;
  
  if (isFallen && !obj.isReturning) {
    obj.isReturning = true;
  }
  
  if (obj.isReturning) {
    // 位置を補間
    pos.x = pos.x + (initialPos.x - pos.x) * RETURN_CONFIG.LERP_FACTOR;
    pos.y = pos.y + (initialPos.y - pos.y) * RETURN_CONFIG.LERP_FACTOR;
    pos.z = pos.z + (initialPos.z - pos.z) * RETURN_CONFIG.LERP_FACTOR;
    
    // 角度を補間（スレルップ補間）
    const targetQuat = initialQuat.clone();
    const dot = quat.x * targetQuat.x + quat.y * targetQuat.y + 
                quat.z * targetQuat.z + quat.w * targetQuat.w;
    
    if (dot < 0) {
      targetQuat.x = -targetQuat.x;
      targetQuat.y = -targetQuat.y;
      targetQuat.z = -targetQuat.z;
      targetQuat.w = -targetQuat.w;
    }
    
    quat.x = quat.x + (targetQuat.x - quat.x) * RETURN_CONFIG.LERP_FACTOR;
    quat.y = quat.y + (targetQuat.y - quat.y) * RETURN_CONFIG.LERP_FACTOR;
    quat.z = quat.z + (targetQuat.z - quat.z) * RETURN_CONFIG.LERP_FACTOR;
    quat.w = quat.w + (targetQuat.w - quat.w) * RETURN_CONFIG.LERP_FACTOR;
    quat.normalize();
    
    // 物理ボディの位置と角度を更新
    obj.body.position.copy(pos);
    obj.body.quaternion.copy(quat);
    
    // 速度を減らす
    obj.body.velocity.scale(RETURN_CONFIG.VELOCITY_DAMPING);
    obj.body.angularVelocity.scale(RETURN_CONFIG.VELOCITY_DAMPING);
    
    // 元の位置と角度に十分近づいたら復帰完了
    const finalPositionDiff = pos.distanceTo(initialPos);
    const finalQuatDiff = quat.x * initialQuat.x + quat.y * initialQuat.y + 
                          quat.z * initialQuat.z + quat.w * initialQuat.w;
    if (finalPositionDiff < RETURN_CONFIG.FINAL_POSITION_THRESHOLD && 
        finalQuatDiff > RETURN_CONFIG.FINAL_QUATERNION_THRESHOLD) {
      obj.body.position.copy(initialPos);
      obj.body.quaternion.copy(initialQuat);
      obj.body.velocity.set(0, 0, 0);
      obj.body.angularVelocity.set(0, 0, 0);
      obj.isReturning = false;
    }
  }
}

// ============================================================================
// オブジェクト作成関数
// ============================================================================

// オブジェクトの削除
function removeObject(obj: GameObject) {
  scene.remove(obj.mesh);
  world.removeBody(obj.body);
  
  // シーソーの場合は支点とジョイント、支点のメッシュも削除
  if (obj.type === 'seesaw') {
    if (obj.constraint) {
      world.removeConstraint(obj.constraint);
    }
    if (obj.pivotBody) {
      world.removeBody(obj.pivotBody);
    }
    if (obj.pivotMesh) {
      scene.remove(obj.pivotMesh);
      if (obj.pivotMesh.geometry) obj.pivotMesh.geometry.dispose();
      if (obj.pivotMesh.material instanceof THREE.Material) {
        if (Array.isArray(obj.pivotMesh.material)) {
          obj.pivotMesh.material.forEach(m => m.dispose());
        } else {
          obj.pivotMesh.material.dispose();
        }
      }
    }
  }
  if (obj.mesh.geometry) obj.mesh.geometry.dispose();
  if (obj.mesh.material instanceof THREE.Material) {
    if (Array.isArray(obj.mesh.material)) {
      obj.mesh.material.forEach(m => m.dispose());
    } else {
      obj.mesh.material.dispose();
    }
  }
}

// オブジェクト間の衝突判定（重なりチェック）
function checkCollision(
  type: 'domino' | 'ramp' | 'box' | 'seesaw' | 'mountain' | 'shrine' | 'road' | 'plank' | 'guardrail' | 'stairs' | 'trampoline' | 'goal',
  position: { x: number; y: number; z: number },
  excludeObject?: GameObject
): boolean {
  // 各オブジェクトタイプのサイズを取得
  let bounds = { width: 0, height: 0, depth: 0 };
  
  switch (type) {
    case 'domino':
      bounds = { width: 0.1, height: 0.8, depth: 0.3 };
      break;
    case 'ramp':
      bounds = { width: 3, height: 1, depth: 2 };
      break;
    case 'box':
      bounds = { width: 0.5, height: 0.5, depth: 0.5 };
      break;
    case 'seesaw':
      bounds = { width: 4, height: 0.1, depth: 0.5 }; // シーソーの長さ、厚さ、幅
      break;
    case 'mountain':
      bounds = { width: 6, height: 5, depth: 6 }; // 半径3なので直径6
      break;
    case 'shrine':
      bounds = { width: 2, height: 3, depth: 1.5 };
      break;
    case 'road':
      bounds = { width: 1.5, height: 0.1, depth: 1.5 }; // 道路は動的な長さがあるが、最小サイズでチェック
      break;
    case 'plank':
      bounds = { width: 4, height: 0.2, depth: 1.5 }; // 板の長さ、厚さ、幅
      break;
    case 'guardrail':
      bounds = { width: 3, height: 0.5, depth: 0.1 }; // ガードレールの長さ、高さ、厚さ
      break;
    case 'stairs':
      bounds = { width: 1.5, height: 0.3, depth: 0.5 }; // 階段のステップのサイズ
      break;
    case 'trampoline':
      bounds = { width: 3, height: 0.1, depth: 3 }; // トランポリンの半径1.5なので直径3
      break;
    case 'goal':
      bounds = { width: 2, height: 1, depth: 2 }; // ゴールのサイズ
      break;
  }
  
  // バッファ（余裕を持たせる）
  const buffer = 0.2;
  const halfWidth = bounds.width / 2 + buffer;
  const halfDepth = bounds.depth / 2 + buffer;
  
  // 既存のオブジェクトと衝突チェック
  for (const obj of gameObjects) {
    if (obj === excludeObject || obj.type === 'ball') continue;
    
    // 既存オブジェクトのサイズを取得
    let existingBounds = { width: 0, depth: 0 };
    
    switch (obj.type) {
      case 'domino':
        existingBounds = { width: 0.1, depth: 0.3 };
        break;
      case 'ramp':
        existingBounds = { width: 3, depth: 2 };
        break;
      case 'box':
        existingBounds = { width: 0.5, depth: 0.5 };
        break;
      case 'seesaw':
        existingBounds = { width: 4, depth: 0.5 }; // シーソーの長さと幅
        break;
      case 'mountain':
        existingBounds = { width: 6, depth: 6 }; // 半径3なので直径6
        break;
      case 'shrine':
        existingBounds = { width: 2, depth: 1.5 };
        break;
      case 'road':
        existingBounds = { width: 1.5, depth: 1.5 }; // 道路は動的な長さがあるが、最小サイズでチェック
        break;
      case 'plank':
        existingBounds = { width: 4, depth: 1.5 }; // 板の長さと幅
        break;
      case 'stairs':
        existingBounds = { width: 1.5, depth: 0.5 }; // 階段のステップのサイズ
        break;
      case 'guardrail':
        existingBounds = { width: 3, depth: 0.1 }; // ガードレールの長さと厚さ
        break;
      case 'trampoline':
        existingBounds = { width: 3, depth: 3 }; // トランポリンの半径1.5なので直径3
        break;
      case 'goal':
        existingBounds = { width: 2, depth: 2 }; // ゴールのサイズ
        break;
    }
    
    const existingHalfWidth = existingBounds.width / 2 + buffer;
    const existingHalfDepth = existingBounds.depth / 2 + buffer;
    
    // 既存オブジェクトの位置（Y座標は考慮しない）
    const existingPos = obj.mesh.position;
    
    // AABB（軸平行境界ボックス）衝突判定
    const overlapX = Math.abs(position.x - existingPos.x) < (halfWidth + existingHalfWidth);
    const overlapZ = Math.abs(position.z - existingPos.z) < (halfDepth + existingHalfDepth);
    
    if (overlapX && overlapZ) {
      return true; // 衝突している
    }
  }
  
  return false; // 衝突していない
}

// 空いている位置を探す
function findFreePosition(
  type: 'domino' | 'ramp' | 'box' | 'seesaw' | 'plank' | 'guardrail' | 'stairs' | 'shrine' | 'mountain' | 'trampoline' | 'goal',
  centerX: number = 0,
  centerZ: number = 0,
  maxAttempts: number = 50,
  searchRadius: number = 10
): { x: number; z: number } | null {
  // ランダムに位置を探す
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * searchRadius;
    const x = centerX + Math.cos(angle) * radius;
    const z = centerZ + Math.sin(angle) * radius;
    
    if (!checkCollision(type, { x, y: 0, z })) {
      return { x, z };
    }
  }
  
  // グリッド検索（ランダムで見つからない場合）
  const step = 1.0;
  for (let dx = -searchRadius; dx <= searchRadius; dx += step) {
    for (let dz = -searchRadius; dz <= searchRadius; dz += step) {
      const x = centerX + dx;
      const z = centerZ + dz;
      if (!checkCollision(type, { x, y: 0, z })) {
        return { x, z };
      }
    }
  }
  
  return null; // 空いている位置が見つからない
}

// ドミノ10個を一列に配置できる位置を探す（横方向に並べる）
function findFreeDominoRow(
  count: number = 10,
  spacing: number = 0.3,
  centerX: number = 0,
  centerZ: number = 0,
  maxAttempts: number = 100,
  searchRadius: number = 15
): { startX: number; z: number } | null {
  const dominoWidth = 0.1;
  const totalWidth = dominoWidth + (count - 1) * spacing;
  
  // ランダムに位置を探す
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * searchRadius;
    const rowCenterX = centerX + Math.cos(angle) * radius;
    const rowZ = centerZ + Math.sin(angle) * radius;
    
    // 一列の開始位置を計算（中心から開始位置に）
    const startX = rowCenterX - totalWidth / 2 + dominoWidth / 2;
    
    // この一列に10個配置できるかチェック
    let canPlace = true;
    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing;
      if (checkCollision('domino', { x, y: 0, z: rowZ })) {
        canPlace = false;
        break;
      }
    }
    
    if (canPlace) {
      return { startX, z: rowZ };
    }
  }
  
  // グリッド検索（ランダムで見つからない場合）
  const step = 0.5;
  for (let dx = -searchRadius; dx <= searchRadius; dx += step) {
    for (let dz = -searchRadius; dz <= searchRadius; dz += step) {
      const rowCenterX = centerX + dx;
      const rowZ = centerZ + dz;
      const startX = rowCenterX - totalWidth / 2 + dominoWidth / 2;
      
      // この一列に10個配置できるかチェック
      let canPlace = true;
      for (let i = 0; i < count; i++) {
        const x = startX + i * spacing;
        if (checkCollision('domino', { x, y: 0, z: rowZ })) {
          canPlace = false;
          break;
        }
      }
      
      if (canPlace) {
        return { startX, z: rowZ };
      }
    }
  }
  
  return null; // 空いている一列が見つからない
}

// ビー玉の初期位置
let ball: GameObject | null = null;

// ビー玉の初速設定（X、Y、Z方向それぞれ）
let ballInitialSpeed = {
  x: 10, // X方向の初速
  y: 0,  // Y方向の初速
  z: 0   // Z方向の初速
};

// UIイベント
document.getElementById('drop-ball')?.addEventListener('click', () => {
  // ビー玉の数を取得
  const countInput = document.getElementById('ball-count') as HTMLInputElement;
  const count = parseInt(countInput?.value || '1', 10);
  const numBalls = Math.max(1, Math.min(50, count)); // 1から50の範囲に制限
  
  // 既存のビー玉をすべて削除
  if (ball) {
    const ballIndex = gameObjects.indexOf(ball);
    if (ballIndex > -1) {
      gameObjects.splice(ballIndex, 1);
    }
    removeObject(ball);
    ball = null;
  }
  
  // 指定された数のビー玉を作成
  const ballRadius = 0.2;
  const startY = ballRadius; // 地面の上、ビー玉の半径分だけ上（地面に接する位置）
  
  for (let i = 0; i < numBalls; i++) {
    // X座標とZ座標をランダムに設定（-5から5の範囲）
    const startX = (Math.random() - 0.5) * 10; // -5から5の範囲でランダム
    const startZ = (Math.random() - 0.5) * 10; // -5から5の範囲でランダム
    
    // X、Y、Z方向それぞれの初速を持たせる
    const initialVelocity = {
      x: ballInitialSpeed.x, // X方向の初速（スライダーで設定）
      y: ballInitialSpeed.y, // Y方向の初速（スライダーで設定）
      z: ballInitialSpeed.z  // Z方向の初速（スライダーで設定）
    };
    
    const newBall = createBall({ x: startX, y: startY, z: startZ }, initialVelocity);
    gameObjects.push(newBall);
    
    // 最初のビー玉をball変数に保存（リセット機能用）
    if (i === 0) {
      ball = newBall;
    }
  }
});

document.getElementById('add-domino')?.addEventListener('click', () => {
  // 重複しない位置を探す
  const position = findFreePosition('domino', 0, 0, 50, 10);
  if (position) {
    const domino = createDomino({ x: position.x, y: 0, z: position.z });
    gameObjects.push(domino);
  }
});

// ドミノを10個同時に配置（重複しないように）
document.getElementById('add-domino-10')?.addEventListener('click', () => {
  const spacing = 0.3; // ドミノ間の間隔
  const count = 10;
  
  // 既存のドミノと重ならない位置を見つける
  // まず、ビー玉の落下地点（Z=-0.5）付近を優先して探す
  let rowPosition = findFreeDominoRow(count, spacing, -0.5, -0.5, 50, 10);
  
  // 見つからない場合は、より広い範囲で探す
  if (!rowPosition) {
    rowPosition = findFreeDominoRow(count, spacing, 0, 0, 100, 20);
  }
  
  if (rowPosition) {
    // 見つかった位置に10個配置（横方向に並べる）
    for (let i = 0; i < count; i++) {
      const x = rowPosition.startX + i * spacing;
      const domino = createDomino({ x, y: 0, z: rowPosition.z });
      gameObjects.push(domino);
    }
  }
});

// ドミノを100個同時に配置（重複しないように）
document.getElementById('add-domino-100')?.addEventListener('click', () => {
  const spacing = 0.3; // ドミノ間の間隔
  const count = 100;
  
  // 既存のドミノと重ならない位置を見つける
  // まず、ビー玉の落下地点（Z=-0.5）付近を優先して探す
  let rowPosition = findFreeDominoRow(count, spacing, -0.5, -0.5, 100, 30);
  
  // 見つからない場合は、より広い範囲で探す
  if (!rowPosition) {
    rowPosition = findFreeDominoRow(count, spacing, 0, 0, 200, 50);
  }
  
  if (rowPosition) {
    // 見つかった位置に100個配置（横方向に並べる）
    for (let i = 0; i < count; i++) {
      const x = rowPosition.startX + i * spacing;
      const domino = createDomino({ x, y: 0, z: rowPosition.z });
      gameObjects.push(domino);
    }
  }
});

document.getElementById('add-ramp')?.addEventListener('click', () => {
  // 重複しない位置を探す（坂は大きいので検索範囲を広げる）
  const position = findFreePosition('ramp', 0, 0, 100, 15);
  if (position) {
    const ramp = createRamp({ x: position.x, y: 0, z: position.z });
    gameObjects.push(ramp);
  }
});

document.getElementById('add-box')?.addEventListener('click', () => {
  // 重複しない位置を探す
  const position = findFreePosition('box', 0, 0, 50, 10);
  if (position) {
    const box = createBox({ x: position.x, y: 0, z: position.z });
    gameObjects.push(box);
  }
});

document.getElementById('add-seesaw')?.addEventListener('click', () => {
  // 重複しない位置を探す（シーソーは大きいので検索範囲を広げる）
  const position = findFreePosition('seesaw', 0, 0, 100, 15);
  if (position) {
    const seesaw = createSeesaw({ x: position.x, y: 0, z: position.z });
    gameObjects.push(seesaw);
  }
});

document.getElementById('add-plank')?.addEventListener('click', () => {
  // 重複しない位置を探す（板は大きいので検索範囲を広げる）
  const position = findFreePosition('plank', 0, 0, 100, 15);
  if (position) {
    // 板を地面の高さに配置（長さ4、幅1.5、厚さ0.2、回転0度）
    const plank = createPlank({ x: position.x, y: 0, z: position.z }, 4, 1.5, 0.2, 0);
    gameObjects.push(plank);
  }
});

document.getElementById('add-guardrail')?.addEventListener('click', () => {
  // 重複しない位置を探す
  const position = findFreePosition('guardrail', 0, 0, 100, 15);
  if (position) {
    // ガードレールを地面の高さに配置（長さ3、高さ0.5、回転0度）
    const guardrail = createGuardRail({ x: position.x, y: 0, z: position.z }, 3, 0.5, 0);
    gameObjects.push(guardrail);
  }
});

// 神社を追加するボタン
document.getElementById('add-shrine')?.addEventListener('click', () => {
  // 重複しない位置を探す（神社は大きいので検索範囲を広げる）
  const position = findFreePosition('shrine', 0, 0, 100, 15);
  if (position) {
    // 神社を地面の高さに配置
    const shrine = createShrine({ x: position.x, y: 0, z: position.z });
    gameObjects.push(shrine);
  }
});

// 階段を追加するボタン
document.getElementById('add-stairs')?.addEventListener('click', () => {
  // 階段の開始位置（地面の高さ、ランダムな位置）
  const startX = (Math.random() - 0.5) * 20;
  const startY = 0.2; // 地面の少し上
  const startZ = (Math.random() - 0.5) * 20;
  
  // 階段の終了位置（開始位置から少し離れた位置、上方向に）
  const endX = startX + (Math.random() - 0.5) * 4 + 2; // 2-4ユニット離れた位置
  const endY = startY + Math.random() * 2 + 1; // 1-3ユニット高い位置
  const endZ = startZ + (Math.random() - 0.5) * 4 + 2;
  
  // 階段を作成
  const stairs = createStairs(
    { x: startX, y: startY, z: startZ },
    { x: endX, y: endY, z: endZ },
    2.5, // ステップの幅
    0.5, // ステップの高さ
    0.8  // ステップの奥行き
  );
  gameObjects.push(stairs);
});

document.getElementById('add-trampoline')?.addEventListener('click', () => {
  const pos = findFreePosition('trampoline', 0, 0, 50, 10);
  if (pos) {
    const trampoline = createTrampoline({ x: pos.x, y: 0, z: pos.z });
    gameObjects.push(trampoline);
  }
});

document.getElementById('add-goal')?.addEventListener('click', () => {
  const pos = findFreePosition('goal', 0, 0, 50, 10);
  if (pos) {
    const goal = createGoal({ x: pos.x, y: 0, z: pos.z });
    gameObjects.push(goal);
  }
});

// ビー玉の数の変数
let ballCount = 1;
const ballCountInput = document.getElementById('ball-count') as HTMLInputElement;
ballCountInput?.addEventListener('change', (event) => {
  const value = parseInt((event.target as HTMLInputElement).value, 10);
  ballCount = Math.max(1, Math.min(50, value || 1));
});

// 初速スライダーのイベント（X、Y、Z方向それぞれ）
const speedXSlider = document.getElementById('speed-x-slider') as HTMLInputElement;
const speedXValueDisplay = document.getElementById('speed-x-value');
const speedYSlider = document.getElementById('speed-y-slider') as HTMLInputElement;
const speedYValueDisplay = document.getElementById('speed-y-value');
const speedZSlider = document.getElementById('speed-z-slider') as HTMLInputElement;
const speedZValueDisplay = document.getElementById('speed-z-value');

// X方向のスライダー
speedXSlider?.addEventListener('input', (event) => {
  const value = parseFloat((event.target as HTMLInputElement).value);
  ballInitialSpeed.x = value;
  if (speedXValueDisplay) {
    speedXValueDisplay.textContent = value.toFixed(1);
  }
});

// Y方向のスライダー
speedYSlider?.addEventListener('input', (event) => {
  const value = parseFloat((event.target as HTMLInputElement).value);
  ballInitialSpeed.y = value;
  if (speedYValueDisplay) {
    speedYValueDisplay.textContent = value.toFixed(1);
  }
});

// Z方向のスライダー
speedZSlider?.addEventListener('input', (event) => {
  const value = parseFloat((event.target as HTMLInputElement).value);
  ballInitialSpeed.z = value;
  if (speedZValueDisplay) {
    speedZValueDisplay.textContent = value.toFixed(1);
  }
});

// 初期値を表示
if (speedXValueDisplay) {
  speedXValueDisplay.textContent = ballInitialSpeed.x.toFixed(1);
}
if (speedYValueDisplay) {
  speedYValueDisplay.textContent = ballInitialSpeed.y.toFixed(1);
}
if (speedZValueDisplay) {
  speedZValueDisplay.textContent = ballInitialSpeed.z.toFixed(1);
}

document.getElementById('clear-all')?.addEventListener('click', () => {
  // すべてのオブジェクトを削除（ビー玉も含む）
  gameObjects.forEach(obj => removeObject(obj));
  gameObjects.length = 0;
  ball = null;
  selectedObject = null;
});

document.getElementById('reset-ball')?.addEventListener('click', () => {
  // すべてのビー玉をリセット
  const ballRadius = 0.2;
  const startY = ballRadius; // 地面の上、ビー玉の半径分だけ上（地面に接する位置）
  
  gameObjects.forEach(obj => {
    if (obj.type === 'ball') {
      // X座標とZ座標をランダムに設定（-5から5の範囲）
      const startX = (Math.random() - 0.5) * 10; // -5から5の範囲でランダム
      const startZ = (Math.random() - 0.5) * 10; // -5から5の範囲でランダム
      obj.body.position.set(startX, startY, startZ);
      
      // X、Y、Z方向それぞれの初速を持たせる
      const velocityX = ballInitialSpeed.x; // X方向の初速（スライダーで設定）
      const velocityY = ballInitialSpeed.y; // Y方向の初速（スライダーで設定）
      const velocityZ = ballInitialSpeed.z; // Z方向の初速（スライダーで設定）
      obj.body.velocity.set(velocityX, velocityY, velocityZ);
      
      // 転がるために角速度も設定
      // 球の半径0.2、転がりの条件: 角速度 * 半径 = 速度
      const angularSpeedFactor = 1 / ballRadius; // 約5（1/0.2）
      obj.body.angularVelocity.set(
        -velocityZ * angularSpeedFactor, // Z方向に転がる場合、X軸周りに回転（負の方向）
        0,
        velocityX * angularSpeedFactor  // X方向に転がる場合、Z軸周りに回転
      );
    }
  });
});

document.getElementById('remove-ball')?.addEventListener('click', () => {
  // すべてのビー玉を削除
  const ballsToRemove: GameObject[] = [];
  gameObjects.forEach(obj => {
    if (obj.type === 'ball') {
      ballsToRemove.push(obj);
    }
  });
  
  ballsToRemove.forEach(ball => {
    const ballIndex = gameObjects.indexOf(ball);
    if (ballIndex > -1) {
      gameObjects.splice(ballIndex, 1);
    }
    removeObject(ball);
  });
  
  // 古いball変数もクリア（互換性のため）
  if (ball) {
    ball = null;
  }
  
  // 選択中のオブジェクトがビー玉の場合は選択を解除
  if (selectedObject && selectedObject.type === 'ball') {
    selectObject(null);
  }
});

// オブジェクト選択とハイライト
function selectObject(obj: GameObject | null) {
  // 以前の選択を解除
  if (selectedObject && selectedObjectOriginalMaterial) {
    if (selectedObject.type === 'stairs' && selectedObject.stairsGroup && (selectedObject as any).originalMaterials) {
      // 階段の場合はグループ内の全てのメッシュのマテリアルを復元
      const originalMaterials = (selectedObject as any).originalMaterials as THREE.Material[];
      let index = 0;
      selectedObject.stairsGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (originalMaterials[index]) {
            child.material = originalMaterials[index];
            index++;
          }
        }
      });
    } else {
      selectedObject.mesh.material = selectedObjectOriginalMaterial;
    }
  }
  
  selectedObject = obj;
  
  // 新しい選択をハイライト
  if (selectedObject && selectedObject.type !== 'ball') {
    if (selectedObject.type === 'stairs' && selectedObject.stairsGroup) {
      // 階段の場合はグループ内の全てのメッシュをハイライト
      const originalMaterials: THREE.Material[] = [];
      selectedObject.stairsGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          originalMaterials.push(child.material as THREE.Material);
          child.material = highlightMaterial.clone();
        }
      });
      (selectedObject as any).originalMaterials = originalMaterials;
      selectedObjectOriginalMaterial = null; // 階段の場合は個別に管理
    } else {
      selectedObjectOriginalMaterial = selectedObject.mesh.material;
      selectedObject.mesh.material = highlightMaterial.clone();
    }
  } else {
    selectedObjectOriginalMaterial = null;
  }
}

// レイキャスティング（オブジェクト選択用）
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// マウスダウン（選択開始）
renderer.domElement.addEventListener('mousedown', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  // 階段の場合はグループ内のすべてのメッシュも対象にする
  const objectsToIntersect: THREE.Object3D[] = [];
  gameObjects.forEach(obj => {
    if (obj.type === 'stairs' && obj.stairsGroup) {
      // 階段の場合はグループ内のすべてのメッシュを追加
      obj.stairsGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          objectsToIntersect.push(child);
        }
      });
    } else {
      objectsToIntersect.push(obj.mesh);
    }
  });
  const intersects = raycaster.intersectObjects(objectsToIntersect, true);
  
  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object;
    // 階段の場合は、クリックされたメッシュがグループ内の子要素かどうかを確認
    let clickedObject: GameObject | null = null;
    if (clickedMesh instanceof THREE.Mesh) {
      // 階段のグループ内のメッシュがクリックされた場合
      clickedObject = gameObjects.find(obj => {
        if (obj.type === 'stairs' && obj.stairsGroup) {
          let found = false;
          obj.stairsGroup.traverse((child) => {
            if (child === clickedMesh) {
              found = true;
            }
          });
          return found;
        }
        return obj.mesh === clickedMesh;
      }) || null;
    } else {
      clickedObject = gameObjects.find(obj => obj.mesh === clickedMesh) || null;
    }
    
    if (clickedObject && clickedObject.type !== 'ball') {
      event.preventDefault();
      selectObject(clickedObject);
      
      // ドラッグ開始
      isDragging = true;
      dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // 地面に平行な平面
      
      // オブジェクトの中心から交差点へのオフセットを計算
      const intersectionPoint = intersects[0].point;
      // 階段の場合はグループの位置を使用
      const objectPosition = clickedObject.type === 'stairs' && clickedObject.stairsGroup
        ? new THREE.Vector3().copy(clickedObject.stairsGroup.position)
        : new THREE.Vector3().copy(clickedObject.mesh.position);
      dragOffset = new THREE.Vector3().subVectors(objectPosition, intersectionPoint);
      
      // 移動中は物理シミュレーションを一時的に無効化（質量を0に設定して固定）
      const originalMass = clickedObject.body.mass;
      clickedObject.body.mass = 0;
      clickedObject.body.updateMassProperties();
      (clickedObject as any).originalMass = originalMass;
      
      // ドミノの場合は立った状態（垂直）にリセット、それ以外は現在の角度を保存
      if (clickedObject.type === 'domino') {
        // ドミノを立った状態にリセット（単位クォータニオン = 回転なし）
        const uprightQuaternion = new CANNON.Quaternion();
        uprightQuaternion.set(0, 0, 0, 1); // 単位クォータニオン（回転なし）
        (clickedObject as any).originalQuaternion = uprightQuaternion.clone();
        clickedObject.body.quaternion.copy(uprightQuaternion);
        clickedObject.mesh.quaternion.set(0, 0, 0, 1); // 単位クォータニオン
      } else {
        // ドミノ以外は現在の角度を保存
        (clickedObject as any).originalQuaternion = clickedObject.body.quaternion.clone();
      }
      
      // 速度を完全にリセット
      clickedObject.body.velocity.set(0, 0, 0);
      clickedObject.body.angularVelocity.set(0, 0, 0);
      
      controls.enabled = false; // カメラコントロールを無効化
    }
  } else {
    // 何も選択されていない場合は選択解除
    selectObject(null);
  }
});

// マウスムーブ（ドラッグ移動）
renderer.domElement.addEventListener('mousemove', (event) => {
  if (isDragging && selectedObject && dragPlane) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, intersection);
    
    if (intersection) {
      // オフセットを考慮してオブジェクトを移動
      const newPosition = new THREE.Vector3().addVectors(intersection, dragOffset);
      
      // 階段の場合は全てのステップの物理ボディを移動
      if (selectedObject.type === 'stairs' && selectedObject.stairsBodies && selectedObject.stairsGroup) {
        const oldPosition = selectedObject.stairsGroup.position.clone();
        const deltaX = newPosition.x - oldPosition.x;
        const deltaY = newPosition.y - oldPosition.y;
        const deltaZ = newPosition.z - oldPosition.z;
        
        // グループの位置を更新
        selectedObject.stairsGroup.position.copy(newPosition);
        
        // 全てのステップの物理ボディを移動
        selectedObject.stairsBodies.forEach(body => {
          body.position.x += deltaX;
          body.position.y += deltaY;
          body.position.z += deltaZ;
        });
        
        // 基準となる物理ボディも更新
        selectedObject.body.position.set(
          newPosition.x,
          newPosition.y,
          newPosition.z
        );
      } else {
        // 通常のオブジェクトの移動
        selectedObject.mesh.position.copy(newPosition);
        selectedObject.body.position.set(
          newPosition.x,
          newPosition.y,
          newPosition.z
        );
      }
      
      // 角度を設定（ドミノの場合は立った状態を維持）
      const originalQuaternion = (selectedObject as any).originalQuaternion;
      if (originalQuaternion) {
        if (selectedObject.type === 'domino') {
          // ドミノは常に立った状態（垂直）を維持
          const uprightQuaternion = new THREE.Quaternion();
          uprightQuaternion.set(0, 0, 0, 1); // 単位クォータニオン
          selectedObject.mesh.quaternion.copy(uprightQuaternion);
          selectedObject.body.quaternion.set(0, 0, 0, 1);
        } else {
          // ドミノ以外は保存した角度を保持
          selectedObject.mesh.quaternion.copy(originalQuaternion);
          selectedObject.body.quaternion.copy(originalQuaternion);
        }
      }
      
      // 速度を完全にリセット
      selectedObject.body.velocity.set(0, 0, 0);
      selectedObject.body.angularVelocity.set(0, 0, 0);
    }
  }
});

// マウスアップ（ドラッグ終了）
renderer.domElement.addEventListener('mouseup', () => {
  if (isDragging && selectedObject) {
    isDragging = false;
    
    // メッシュと物理ボディの位置を完全に同期
    selectedObject.body.position.set(
      selectedObject.mesh.position.x,
      selectedObject.mesh.position.y,
      selectedObject.mesh.position.z
    );
    
    // 角度も同期（ドミノの場合は立った状態を維持）
    if (selectedObject.type === 'domino') {
      // ドミノは立った状態（垂直）を維持
      const uprightQuaternion = new CANNON.Quaternion();
      uprightQuaternion.set(0, 0, 0, 1); // 単位クォータニオン
      selectedObject.body.quaternion.copy(uprightQuaternion);
      selectedObject.mesh.quaternion.set(0, 0, 0, 1);
    } else {
      // ドミノ以外はメッシュの角度を物理ボディに同期
      selectedObject.body.quaternion.set(
        selectedObject.mesh.quaternion.x,
        selectedObject.mesh.quaternion.y,
        selectedObject.mesh.quaternion.z,
        selectedObject.mesh.quaternion.w
      );
    }
    
    // 速度を完全にリセット（重要）
    selectedObject.body.velocity.set(0, 0, 0);
    selectedObject.body.angularVelocity.set(0, 0, 0);
    
    // 物理シミュレーションを再有効化（質量を元に戻す）
    const originalMass = (selectedObject as any).originalMass;
    if (originalMass !== undefined) {
      selectedObject.body.mass = originalMass;
      selectedObject.body.updateMassProperties();
      delete (selectedObject as any).originalMass;
    }
    
    // 保存した角度を削除
    delete (selectedObject as any).originalQuaternion;
    
    controls.enabled = true; // カメラコントロールを再有効化
  }
});

// Deleteキーで削除
window.addEventListener('keydown', (event) => {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectedObject && selectedObject.type !== 'ball') {
      const index = gameObjects.indexOf(selectedObject);
      if (index > -1) {
        gameObjects.splice(index, 1);
        if (selectedObject === ball) {
          ball = null;
        }
        removeObject(selectedObject);
        selectObject(null);
      }
    }
  }
});

// 右クリックで削除
renderer.domElement.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  // 階段の場合はグループ内のすべてのメッシュも対象にする
  const objectsToIntersect: THREE.Object3D[] = [];
  gameObjects.forEach(obj => {
    if (obj.type === 'stairs' && obj.stairsGroup) {
      // 階段の場合はグループ内のすべてのメッシュを追加
      obj.stairsGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          objectsToIntersect.push(child);
        }
      });
    } else {
      objectsToIntersect.push(obj.mesh);
    }
  });
  const intersects = raycaster.intersectObjects(objectsToIntersect, true);
  
  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object;
    // 階段の場合は、クリックされたメッシュがグループ内の子要素かどうかを確認
    let clickedObject: GameObject | null = null;
    if (clickedMesh instanceof THREE.Mesh) {
      // 階段のグループ内のメッシュがクリックされた場合
      clickedObject = gameObjects.find(obj => {
        if (obj.type === 'stairs' && obj.stairsGroup) {
          let found = false;
          obj.stairsGroup.traverse((child) => {
            if (child === clickedMesh) {
              found = true;
            }
          });
          return found;
        }
        return obj.mesh === clickedMesh;
      }) || null;
    } else {
      clickedObject = gameObjects.find(obj => obj.mesh === clickedMesh) || null;
    }
    
    if (clickedObject && clickedObject.type !== 'ball') {
      const index = gameObjects.indexOf(clickedObject);
      if (index > -1) {
        gameObjects.splice(index, 1);
        if (clickedObject === ball) {
          ball = null;
        }
        if (clickedObject === selectedObject) {
          selectObject(null);
        }
        removeObject(clickedObject);
      }
    }
  }
});

// ゲーム状態の保存形式
interface SavedGameState {
  version: string;
  objects: SavedObject[];
  ballInitialSpeed: { x: number; y: number; z: number };
  ballCount: number;
  timestamp: number;
}

interface SavedObject {
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number }; // quaternion
  // オブジェクトタイプ固有のパラメータ
  params?: {
    length?: number;
    width?: number;
    height?: number;
    rotationY?: number;
    // 道路の場合
    startPos?: { x: number; y: number; z: number };
    endPos?: { x: number; y: number; z: number };
    // 山の場合
    mountainHeight?: number;
    mountainRadius?: number;
    // 新幹線の場合
    orbitAngle?: number;
  };
}

// ゲーム状態をシリアライズ（保存用に変換）
function serializeGameState(): SavedGameState {
  const savedObjects: SavedObject[] = gameObjects.map(obj => {
    const pos = obj.body.position;
    const quat = obj.body.quaternion;
    
    const savedObj: SavedObject = {
      type: obj.type,
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotation: { x: quat.x, y: quat.y, z: quat.z, w: quat.w },
      params: {}
    };
    
    // オブジェクトタイプ固有のパラメータを保存
    if (obj.type === 'plank') {
      // 板のパラメータを取得（メッシュから推測）
      const geometry = obj.mesh.geometry as THREE.BoxGeometry;
      if (geometry) {
        const params = geometry.parameters;
        savedObj.params = {
          length: params.width || 4,
          width: params.depth || 1.5,
          height: params.height || 0.2,
          rotationY: obj.mesh.rotation.y
        };
      }
    } else if (obj.type === 'guardrail') {
      // ガードレールのパラメータを取得（メッシュから推測）
      const geometry = obj.mesh.geometry as THREE.BoxGeometry;
      if (geometry) {
        const params = geometry.parameters;
        savedObj.params = {
          length: params.width || 3,
          height: params.height || 0.5,
          rotationY: obj.mesh.rotation.y
        };
      }
    } else if (obj.type === 'road') {
      // 道路の場合、開始位置と終了位置を計算（簡略版）
      // 実際の実装では、道路の元のパラメータを保存しておく必要がある
      savedObj.params = {
        startPos: { x: pos.x - 2, y: pos.y, z: pos.z - 2 },
        endPos: { x: pos.x + 2, y: pos.y, z: pos.z + 2 }
      };
    } else if (obj.type === 'mountain') {
      // 山のパラメータを取得（メッシュから推測）
      const geometry = obj.mesh.geometry as THREE.ConeGeometry;
      if (geometry) {
        const params = geometry.parameters;
        savedObj.params = {
          mountainHeight: params.height || 5,
          mountainRadius: params.radius || 3
        };
      }
    } else if (obj.type === 'train') {
      // 新幹線のorbitAngleを保存
      savedObj.params = {
        orbitAngle: obj.orbitAngle || 0
      };
    }
    
    return savedObj;
  });
  
  return {
    version: '1.0.0',
    objects: savedObjects,
    ballInitialSpeed: { ...ballInitialSpeed },
    ballCount: ballCount,
    timestamp: Date.now()
  };
}

// ゲーム状態をデシリアライズ（読み込み用に復元）
function deserializeGameState(savedState: SavedGameState) {
  // 既存のオブジェクトをすべて削除（ビー玉以外）
  const objectsToRemove = gameObjects.filter(obj => obj.type !== 'ball');
  objectsToRemove.forEach(obj => {
    const index = gameObjects.indexOf(obj);
    if (index > -1) {
      gameObjects.splice(index, 1);
      removeObject(obj);
    }
  });
  
  // 保存されたオブジェクトを再作成
  savedState.objects.forEach(savedObj => {
    if (savedObj.type === 'ball') return; // ビー玉は除外
    
    const pos = savedObj.position;
    
    let obj: GameObject | null = null;
    
    switch (savedObj.type) {
      case 'domino':
        obj = createDomino({ x: pos.x, y: pos.y, z: pos.z });
        break;
      case 'ramp':
        obj = createRamp({ x: pos.x, y: pos.y, z: pos.z });
        break;
      case 'box':
        obj = createBox({ x: pos.x, y: pos.y, z: pos.z });
        break;
      case 'seesaw':
        obj = createSeesaw({ x: pos.x, y: pos.y, z: pos.z });
        break;
      case 'plank':
        const plankParams = savedObj.params || {};
        obj = createPlank(
          { x: pos.x, y: pos.y, z: pos.z },
          plankParams.length || 4,
          plankParams.width || 1.5,
          plankParams.height || 0.2,
          plankParams.rotationY || 0
        );
        break;
      case 'guardrail':
        const guardrailParams = savedObj.params || {};
        obj = createGuardRail(
          { x: pos.x, y: pos.y, z: pos.z },
          guardrailParams.length || 3,
          guardrailParams.height || 0.5,
          guardrailParams.rotationY || 0
        );
        break;
      case 'mountain':
        const mountainParams = savedObj.params || {};
        obj = createMountain(
          { x: pos.x, y: pos.y, z: pos.z },
          mountainParams.mountainHeight || 5,
          mountainParams.mountainRadius || 3
        );
        break;
      case 'shrine':
        obj = createShrine({ x: pos.x, y: pos.y, z: pos.z });
        break;
      case 'road':
        const roadParams = savedObj.params || {};
        if (roadParams.startPos && roadParams.endPos) {
          obj = createRoad(roadParams.startPos, roadParams.endPos);
        }
        break;
      case 'penguin':
        obj = createPenguin({ x: pos.x, y: pos.y, z: pos.z });
        break;
      case 'cow':
        obj = createCow({ x: pos.x, y: pos.y, z: pos.z });
        break;
      case 'trampoline':
        obj = createTrampoline({ x: pos.x, y: pos.y, z: pos.z });
        break;
      case 'goal':
        obj = createGoal({ x: pos.x, y: pos.y, z: pos.z });
        break;
      case 'train':
        // 新幹線の場合は初期角度も必要（保存されたorbitAngleまたは回転から計算）
        const trainAngle = savedObj.params?.orbitAngle !== undefined 
          ? savedObj.params.orbitAngle 
          : Math.atan2(2 * (savedObj.rotation.w * savedObj.rotation.y + savedObj.rotation.x * savedObj.rotation.z), 
                       1 - 2 * (savedObj.rotation.y * savedObj.rotation.y + savedObj.rotation.z * savedObj.rotation.z));
        obj = createTrain({ x: pos.x, y: pos.y, z: pos.z }, trainAngle);
        break;
    }
    
    if (obj) {
      // 位置と回転を復元
      obj.body.position.set(pos.x, pos.y, pos.z);
      obj.body.quaternion.set(
        savedObj.rotation.x,
        savedObj.rotation.y,
        savedObj.rotation.z,
        savedObj.rotation.w
      );
      obj.mesh.position.set(pos.x, pos.y, pos.z);
      obj.mesh.quaternion.set(
        savedObj.rotation.x,
        savedObj.rotation.y,
        savedObj.rotation.z,
        savedObj.rotation.w
      );
      
      // 新幹線の場合はorbitAngleも復元
      if (obj.type === 'train' && savedObj.params?.orbitAngle !== undefined) {
        obj.orbitAngle = savedObj.params.orbitAngle;
      }
      
      gameObjects.push(obj);
    }
  });
  
  // ビー玉の設定を復元
  if (savedState.ballInitialSpeed) {
    ballInitialSpeed.x = savedState.ballInitialSpeed.x;
    ballInitialSpeed.y = savedState.ballInitialSpeed.y;
    ballInitialSpeed.z = savedState.ballInitialSpeed.z;
    
    // スライダーも更新
    if (speedXSlider) speedXSlider.value = ballInitialSpeed.x.toString();
    if (speedYSlider) speedYSlider.value = ballInitialSpeed.y.toString();
    if (speedZSlider) speedZSlider.value = ballInitialSpeed.z.toString();
    if (speedXValueDisplay) speedXValueDisplay.textContent = ballInitialSpeed.x.toFixed(1);
    if (speedYValueDisplay) speedYValueDisplay.textContent = ballInitialSpeed.y.toFixed(1);
    if (speedZValueDisplay) speedZValueDisplay.textContent = ballInitialSpeed.z.toFixed(1);
  }
  
  if (savedState.ballCount !== undefined) {
    ballCount = savedState.ballCount;
    const ballCountInput = document.getElementById('ball-count') as HTMLInputElement;
    if (ballCountInput) ballCountInput.value = ballCount.toString();
  }
  
  // 新幹線がない場合は追加
  const hasTrain = gameObjects.some(obj => obj.type === 'train');
  if (!hasTrain) {
    const trainY = 0.8;
    const railwayRadius = SIZES.GROUND_RADIUS + 0.5;
    const initialAngle = Math.PI / 4;
    const initialTrainX = railwayRadius * Math.cos(initialAngle - Math.PI / 2);
    const initialTrainZ = railwayRadius * Math.sin(initialAngle - Math.PI / 2);
    const train = createTrain({ x: initialTrainX, y: trainY, z: initialTrainZ }, initialAngle);
    gameObjects.push(train);
  }
}

// localStorageに保存
function saveToLocalStorage() {
  try {
    const gameState = serializeGameState();
    localStorage.setItem('pythagorasSwitch_gameState', JSON.stringify(gameState));
    alert('ゲーム状態を保存しました！');
  } catch (error) {
    console.error('保存エラー:', error);
    alert('保存に失敗しました: ' + (error as Error).message);
  }
}

// localStorageから読み込み
function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem('pythagorasSwitch_gameState');
    if (!savedData) {
      alert('保存されたデータが見つかりません。');
      return;
    }
    
    const gameState: SavedGameState = JSON.parse(savedData);
    deserializeGameState(gameState);
    alert('ゲーム状態を読み込みました！');
  } catch (error) {
    console.error('読み込みエラー:', error);
    alert('読み込みに失敗しました: ' + (error as Error).message);
  }
}

// JSONファイルとしてエクスポート
function exportToJSON() {
  try {
    const gameState = serializeGameState();
    const jsonString = JSON.stringify(gameState, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pythagorasSwitch_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('JSONファイルをエクスポートしました！');
  } catch (error) {
    console.error('エクスポートエラー:', error);
    alert('エクスポートに失敗しました: ' + (error as Error).message);
  }
}

// JSONファイルからインポート
function importFromJSON(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const jsonString = e.target?.result as string;
      const gameState: SavedGameState = JSON.parse(jsonString);
      deserializeGameState(gameState);
      alert('JSONファイルをインポートしました！');
    } catch (error) {
      console.error('インポートエラー:', error);
      alert('インポートに失敗しました: ' + (error as Error).message);
    }
  };
  reader.readAsText(file);
}

// 初期の障害物（山、神社、道路）を配置
function initializeInitialObstacles() {
  // 山の位置（地面の上、少し離れた場所）
  const mountainX = -8;
  const mountainZ = -8;
  const mountainHeight = 5;
  const mountainRadius = 3;
  const mountainY = 0; // 地面の高さ
  
  // 山を作成
  const mountain = createMountain(
    { x: mountainX, y: mountainY, z: mountainZ },
    mountainHeight,
    mountainRadius
  );
  gameObjects.push(mountain);
  
  // 神社の位置（山の上）
  const shrineX = mountainX;
  const shrineY = mountainY + mountainHeight; // 山の頂上
  const shrineZ = mountainZ;
  
  // 神社を作成
  const shrine = createShrine({ x: shrineX, y: shrineY, z: shrineZ });
  gameObjects.push(shrine);
  
  // 道路を作成（神社と地面を繋ぐ）
  // 神社の位置から地面に向かって道路を引く
  const roadStartY = shrineY + 1.5; // 神社の底部付近
  const roadEndY = mountainY + 0.1; // 地面の高さ
  const roadEndX = mountainX + mountainRadius * 1.5; // 山の外側
  const roadEndZ = mountainZ + mountainRadius * 1.5; // 山の外側
  
  const road = createRoad(
    { x: shrineX, y: roadStartY, z: shrineZ },
    { x: roadEndX, y: roadEndY, z: roadEndZ }
  );
  gameObjects.push(road);
  
  // 階段を作成（神社から地面まで）
  // 階段の開始位置（神社の前、道路の始点付近）
  const stairsStartX = shrineX; // 神社の前
  const stairsStartY = shrineY - 0.3; // 神社の底部付近
  const stairsStartZ = shrineZ + 1.0; // 神社の前に出る
  
  // 階段の終了位置（地面、道路の終点付近）
  const stairsEndX = roadEndX; // 道路の終点
  const stairsEndY = mountainY + 0.2; // 地面の少し上
  const stairsEndZ = roadEndZ; // 道路の終点
  
  console.log('階段作成:', {
    start: { x: stairsStartX, y: stairsStartY, z: stairsStartZ },
    end: { x: stairsEndX, y: stairsEndY, z: stairsEndZ },
    shrine: { x: shrineX, y: shrineY, z: shrineZ },
    roadEnd: { x: roadEndX, y: roadEndY, z: roadEndZ }
  });
  
  const stairs = createStairs(
    { x: stairsStartX, y: stairsStartY, z: stairsStartZ },
    { x: stairsEndX, y: stairsEndY, z: stairsEndZ },
    2.5, // ステップの幅（広く）
    0.5, // ステップの高さ（高く）
    0.8  // ステップの奥行き（深く）
  );
  gameObjects.push(stairs);
  
  // 牧草ゾーンを作成（牛が草を食べるエリア）
  createGrassZone(
    { x: PASTURE.CENTER_X, y: 0, z: PASTURE.CENTER_Z }, 
    PASTURE.WIDTH, 
    PASTURE.DEPTH
  );
  
  // ペンギンを3匹配置
  for (let i = 0; i < 3; i++) {
    const penguinX = (Math.random() - 0.5) * 20; // -10から10の範囲
    const penguinZ = (Math.random() - 0.5) * 20; // -10から10の範囲
    const penguin = createPenguin({ x: penguinX, y: 0.5, z: penguinZ });
    gameObjects.push(penguin);
  }
  
  // 牛を10頭配置（牧草ゾーン付近に配置）
  for (let i = 0; i < 10; i++) {
    // 牧草ゾーン付近に配置（少しランダムに）
    const cowX = 10 + (Math.random() - 0.5) * 8; // 6から14の範囲
    const cowZ = 10 + (Math.random() - 0.5) * 8; // 6から14の範囲
    // 牛の底部が地面（Y=0）に接するように、Y=0.5に配置（物理ボディの中心はY=1.0になる）
    const cow = createCow({ x: cowX, y: 0.5, z: cowZ });
    gameObjects.push(cow);
  }
  
  // 新幹線を配置（地面の周囲を周回）
  const trainY = 0.8; // 新幹線の高さ（線路上）
  // 線路の半径（地面の半径より0.5単位外側）
  const railwayRadius = SIZES.GROUND_RADIUS + 0.5; // 25.5
  // 線路上の初期位置を設定（右下から開始）
  const initialAngle = Math.PI / 4; // 45度
  const initialTrainX = railwayRadius * Math.cos(initialAngle - Math.PI / 2);
  const initialTrainZ = railwayRadius * Math.sin(initialAngle - Math.PI / 2);
  const train = createTrain({ x: initialTrainX, y: trainY, z: initialTrainZ }, initialAngle);
  gameObjects.push(train);
}

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  
  // 物理シミュレーションの更新
  world.step(1/60);
  
  const deltaTime = 1/60; // 1フレームあたりの時間
  
  // 牧草ゾーンの定義（牛が草を食べるエリア）
  const grassZone = {
    minX: PASTURE.CENTER_X - PASTURE.WIDTH / 2,
    maxX: PASTURE.CENTER_X + PASTURE.WIDTH / 2,
    minZ: PASTURE.CENTER_Z - PASTURE.DEPTH / 2,
    maxZ: PASTURE.CENTER_Z + PASTURE.DEPTH / 2
  };
  
  // ペンギンと牛のパトロール処理
  gameObjects.forEach(obj => {
    if (obj.type === 'penguin' || obj.type === 'cow') {
      if (!obj.patrolDirection || obj.patrolTimer === undefined) return;
      
      const pos = obj.body.position;
      
      // 牛の場合、牧草ゾーン内にいるかチェック
      if (obj.type === 'cow') {
        const isInGrassZone = pos.x >= grassZone.minX && pos.x <= grassZone.maxX &&
                             pos.z >= grassZone.minZ && pos.z <= grassZone.maxZ;
        
        if (isInGrassZone && !obj.isEating) {
          // 牧草ゾーンに入ったので草を食べ始める
          obj.isEating = true;
          obj.eatingTimer = Math.random() * 5 + 3; // 3-8秒間草を食べる
          
          // 移動を停止
          obj.body.velocity.x = 0;
          obj.body.velocity.z = 0;
        } else if (obj.isEating) {
          // 草を食べている状態
          if (obj.eatingTimer === undefined) {
            obj.eatingTimer = 0;
          }
          obj.eatingTimer -= deltaTime;
          
          // 頭を下げるアニメーション（草を食べる動作）
          if (obj.headGroup) {
            // 頭を少し下げる（最大30度）
            const eatAngle = Math.sin(Date.now() * 0.005) * 0.3; // ゆっくりと上下に動かす
            obj.headGroup.rotation.x = -0.3 + eatAngle * 0.1; // 下を向く
          }
          
          // 食べ終わったら再び移動を開始
          if (obj.eatingTimer <= 0) {
            obj.isEating = false;
            obj.eatingTimer = 0;
            
            // 頭を元の位置に戻す
            if (obj.headGroup) {
              obj.headGroup.rotation.x = 0;
            }
            
            // 新しい移動方向を設定
            const angle = Math.random() * Math.PI * 2;
            obj.patrolDirection = {
              x: Math.cos(angle),
              z: Math.sin(angle)
            };
            obj.patrolTimer = Math.random() * (ANIMAL_CONFIG.PATROL_TIMER_MAX - ANIMAL_CONFIG.PATROL_TIMER_MIN) + ANIMAL_CONFIG.PATROL_TIMER_MIN;
          }
          
          // 草を食べている間は移動しない
          return;
        } else {
          // 牧草ゾーン外では頭を元の位置に戻す
          if (obj.headGroup) {
            obj.headGroup.rotation.x = 0;
          }
        }
      }
      
      // タイマーを更新
      obj.patrolTimer -= deltaTime;
      
      // タイマーが0になったら方向を変更
      if (obj.patrolTimer <= 0) {
        const angle = Math.random() * Math.PI * 2;
        obj.patrolDirection = {
          x: Math.cos(angle),
          z: Math.sin(angle)
        };
        obj.patrolTimer = Math.random() * 3 + 2; // 2-5秒後に再度変更
      }
      
      // 移動速度を設定
      const speed = obj.type === 'penguin' ? ANIMAL_CONFIG.PENGUIN_SPEED : ANIMAL_CONFIG.COW_SPEED;
      const velocityX = obj.patrolDirection.x * speed;
      const velocityZ = obj.patrolDirection.z * speed;
      
      // 地面の範囲内かチェック
      const groundBoundary = SIZES.GROUND_BOUNDARY;
      
      // 境界に近づいたら方向を反転
      if (Math.abs(pos.x) > groundBoundary - ANIMAL_CONFIG.BOUNDARY_MARGIN || 
          Math.abs(pos.z) > groundBoundary - ANIMAL_CONFIG.BOUNDARY_MARGIN) {
        // 中心に向かう方向に変更
        const angleToCenter = Math.atan2(-pos.z, -pos.x);
        obj.patrolDirection = {
          x: Math.cos(angleToCenter),
          z: Math.sin(angleToCenter)
        };
        obj.patrolTimer = 3; // 3秒後に再度変更
      }
      
      // 速度を設定
      obj.body.velocity.x = velocityX;
      obj.body.velocity.z = velocityZ;
      
      // 移動方向に向かって回転
      if (velocityX !== 0 || velocityZ !== 0) {
        const angle = Math.atan2(velocityZ, velocityX);
        obj.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
      }
    }
  });
  
  // ゴール判定（ビー玉がゴールに入ったら花火を上げる）
  gameObjects.forEach(goal => {
    if (goal.type === 'goal' && !goal.hasTriggered) {
      gameObjects.forEach(ball => {
        if (ball.type === 'ball') {
          const ballPos = ball.body.position;
          const goalPos = goal.body.position;
          
          // ゴールの範囲内かチェック（幅2、高さ1、奥行き2）
          const goalWidth = 2;
          const goalHeight = 1;
          const goalDepth = 2;
          
          const inX = Math.abs(ballPos.x - goalPos.x) < goalWidth / 2;
          const inY = ballPos.y > goalPos.y && ballPos.y < goalPos.y + goalHeight;
          const inZ = Math.abs(ballPos.z - goalPos.z) < goalDepth / 2;
          
          if (inX && inY && inZ) {
            // ゴールに入った！
            goal.hasTriggered = true;
            createFireworks({ x: goalPos.x, y: goalPos.y + goalHeight / 2, z: goalPos.z });
            showGoalMessage();
          }
        }
      });
    }
  });
  
  // 打ち上げ中の花火を更新（爆発前）
  for (let i = launchingFireworks.length - 1; i >= 0; i--) {
    const launching = launchingFireworks[i];
    const particle = launching.particle;
    
    // 位置を更新
    const vel = particle.userData.velocity as THREE.Vector3;
    particle.position.add(vel);
    vel.y += particle.userData.gravity;
    
    // 目標高度に達したら爆発
    if (particle.position.y >= launching.targetHeight) {
      // 爆発エフェクトを生成
      explodeFireworks(
        { x: particle.position.x, y: particle.position.y, z: particle.position.z },
        launching.explosionColor
      );
      
      // 打ち上げパーティクルを削除
      scene.remove(particle);
      particle.geometry.dispose();
      (particle.material as THREE.MeshStandardMaterial).dispose();
      launchingFireworks.splice(i, 1);
    }
  }
  
  // 花火のパーティクルを更新（爆発後のパーティクル）
  for (let i = fireworksParticles.length - 1; i >= 0; i--) {
    const particle = fireworksParticles[i];
    if (particle.userData.life > 0) {
      // 位置を更新
      const vel = particle.userData.velocity as THREE.Vector3;
      particle.position.add(vel);
      vel.y += particle.userData.gravity;
      particle.userData.life--;
      
      // フェードアウト（最後の30%の期間でフェードアウト開始）
      const lifeRatio = particle.userData.life / particle.userData.maxLife;
      let opacity = 1.0;
      if (lifeRatio < 0.3) {
        // 最後の30%の期間でフェードアウト
        opacity = lifeRatio / 0.3;
      }
      (particle.material as THREE.MeshStandardMaterial).opacity = opacity;
      
      // サイズも少し小さくする（フェードアウトと同時に）
      const scale = 0.3 + opacity * 0.7;
      particle.scale.set(scale, scale, scale);
    } else {
      // パーティクルを削除
      scene.remove(particle);
      particle.geometry.dispose();
      (particle.material as THREE.MeshStandardMaterial).dispose();
      fireworksParticles.splice(i, 1);
    }
  }
  
  // ガードレールとドミノの自動復帰処理
  gameObjects.forEach(obj => {
    if ((obj.type === 'guardrail' || obj.type === 'domino') && obj.initialPosition && obj.initialQuaternion) {
      handleObjectReturn(obj);
    }
  });
  
  // 新幹線の周回アニメーション（円形の地面の周囲を周回、各車両が独立して曲がる）
  gameObjects.forEach(obj => {
    if (obj.type === 'train' && obj.orbitAngle !== undefined && obj.orbitSpeed !== undefined) {
      const trainY = 0.8; // 新幹線の高さ（線路上）
      // 線路の半径（地面の半径より0.5単位外側）
      const orbitRadius = SIZES.GROUND_RADIUS + 0.5; // 25.5
      const totalLength = 2 * Math.PI * orbitRadius; // 円周の長さ
      
      // 角度を更新
      obj.orbitAngle += obj.orbitSpeed;
      
      // 角度を0から2πの範囲に正規化
      if (obj.orbitAngle >= Math.PI * 2) {
        obj.orbitAngle -= Math.PI * 2;
      }
      
      // 先頭車両の周回距離を計算
      const headDistance = (obj.orbitAngle / (Math.PI * 2)) * totalLength;
      
      // パス上の位置と角度を計算する関数（円形のパス）
      const getPositionOnPath = (distance: number): { x: number; z: number; angle: number } => {
        // 距離を全周の長さで正規化
        let normalizedDistance = distance % totalLength;
        if (normalizedDistance < 0) normalizedDistance += totalLength;
        
        // 円周上の角度を計算（0から2πまで）
        const angle = (normalizedDistance / totalLength) * Math.PI * 2;
        
        // 円周上の位置を計算
        const x = orbitRadius * Math.cos(angle - Math.PI / 2); // -Math.PI/2を加えて上から開始
        const z = orbitRadius * Math.sin(angle - Math.PI / 2);
        
        // 進行方向の角度（円の接線方向）
        const directionAngle = angle + Math.PI / 2; // 接線方向
        
        return { x, z, angle: directionAngle };
      };
      
      // 先頭車両の位置を計算
      const headPos = getPositionOnPath(headDistance);
      
      // 車両の位置と角度を更新（1両のみ）
      if (obj.mesh instanceof THREE.Group) {
        const group = obj.mesh;
        // グループ全体の位置と角度を更新
        group.position.set(headPos.x, trainY, headPos.z);
        group.rotation.set(0, headPos.angle, 0); // X, Z軸の回転は0に固定
        
        // グループ内の車両の回転もリセット（自転を防ぐ）
        group.children.forEach(child => {
          if (child instanceof THREE.Group) {
            child.rotation.set(0, 0, 0); // 車両自体の回転を0に
          }
        });
      }
      
      // 物理ボディの位置と角度を更新
      obj.body.position.set(headPos.x, trainY, headPos.z);
      obj.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), headPos.angle);
    }
  });
  
  // Three.jsオブジェクトを物理ボディに同期（移動中はスキップ）
  gameObjects.forEach(obj => {
    // 移動中でない場合のみ同期
    if (!isDragging || obj !== selectedObject) {
      // 新幹線の場合は位置のみ同期（回転はアニメーション処理で設定済み）
      if (obj.type === 'train') {
        obj.mesh.position.copy(obj.body.position as any);
        // 回転は同期しない（アニメーション処理で既に設定済み）
      } else {
        obj.mesh.position.copy(obj.body.position as any);
        obj.mesh.quaternion.copy(obj.body.quaternion as any);
      }
    }
  });
  
  // 座標表示を更新
  updateCoordinates();
  
  controls.update();
  renderer.render(scene, camera);
}

// 初期化時に障害物を配置
// localStorageから読み込まれたデータに神社と山が含まれているか確認
const savedData = localStorage.getItem('pythagorasSwitch_gameState');
if (savedData) {
  try {
    const gameState: SavedGameState = JSON.parse(savedData);
    // 保存されたデータに神社と山が含まれているか確認
    const hasMountain = gameState.objects.some(obj => obj.type === 'mountain');
    const hasShrine = gameState.objects.some(obj => obj.type === 'shrine');
    
    // 保存されたデータにペンギンと牛が含まれているか確認
    const hasPenguin = gameState.objects.some(obj => obj.type === 'penguin');
    const hasCow = gameState.objects.some(obj => obj.type === 'cow');
    const hasTrain = gameState.objects.some(obj => obj.type === 'train');
    
    // 保存されたデータを読み込む
    deserializeGameState(gameState);
    
    // 神社と山がない場合は追加
    if (!hasMountain || !hasShrine) {
      // 山と神社を追加（既存のオブジェクトは保持）
      const mountainX = -8;
      const mountainZ = -8;
      const mountainHeight = 5;
      const mountainRadius = 3;
      const mountainY = 0;
      
      if (!hasMountain) {
        const mountain = createMountain(
          { x: mountainX, y: mountainY, z: mountainZ },
          mountainHeight,
          mountainRadius
        );
        gameObjects.push(mountain);
      }
      
      if (!hasShrine) {
        const shrineX = mountainX;
        const shrineY = mountainY + mountainHeight;
        const shrineZ = mountainZ;
        const shrine = createShrine({ x: shrineX, y: shrineY, z: shrineZ });
        gameObjects.push(shrine);
      }
    }
    
    // ペンギンと牛がない場合は追加
    if (!hasPenguin) {
      // ペンギンを3匹配置
      for (let i = 0; i < 3; i++) {
        const penguinX = (Math.random() - 0.5) * 20; // -10から10の範囲
        const penguinZ = (Math.random() - 0.5) * 20; // -10から10の範囲
        const penguin = createPenguin({ x: penguinX, y: 0.5, z: penguinZ });
        gameObjects.push(penguin);
      }
    }
    
    if (!hasCow) {
      // 牛を10頭配置（牧草ゾーン付近に配置）
      for (let i = 0; i < 10; i++) {
        const cowX = PASTURE.CENTER_X + (Math.random() - 0.5) * 8; // 6から14の範囲
        const cowZ = PASTURE.CENTER_Z + (Math.random() - 0.5) * 8; // 6から14の範囲
        const cow = createCow({ x: cowX, y: 0.5, z: cowZ });
        gameObjects.push(cow);
      }
    }
    
    // 新幹線がない場合は追加
    if (!hasTrain) {
      const trainY = 0.8;
      const railwayRadius = SIZES.GROUND_RADIUS + 0.5;
      const initialAngle = Math.PI / 4;
      const initialTrainX = railwayRadius * Math.cos(initialAngle - Math.PI / 2);
      const initialTrainZ = railwayRadius * Math.sin(initialAngle - Math.PI / 2);
      const train = createTrain({ x: initialTrainX, y: trainY, z: initialTrainZ }, initialAngle);
      gameObjects.push(train);
    }
  } catch (error) {
    console.error('保存データの読み込みエラー:', error);
    // エラーが発生した場合は初期障害物を配置
    initializeInitialObstacles();
  }
} else {
  // 保存データがない場合は初期障害物を配置
  initializeInitialObstacles();
}

// 保存・読み込みイベントリスナー
document.getElementById('save-state')?.addEventListener('click', () => {
  saveToLocalStorage();
});

document.getElementById('load-state')?.addEventListener('click', () => {
  if (confirm('現在の配置を削除して保存された状態を読み込みますか？')) {
    loadFromLocalStorage();
  }
});

document.getElementById('export-json')?.addEventListener('click', () => {
  exportToJSON();
});

document.getElementById('import-json')?.addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    if (confirm('現在の配置を削除してJSONファイルから読み込みますか？')) {
      importFromJSON(file);
    }
  }
});

document.getElementById('import-json-btn')?.addEventListener('click', () => {
  document.getElementById('import-json')?.click();
});

// 座標表示を更新
function updateCoordinates() {
  const coordX = document.getElementById('coord-x');
  const coordY = document.getElementById('coord-y');
  const coordZ = document.getElementById('coord-z');
  
  if (!coordX || !coordY || !coordZ) return;
  
  // 選択中のオブジェクトがある場合はその座標を表示
  if (selectedObject) {
    const pos = selectedObject.body.position;
    coordX.textContent = pos.x.toFixed(2);
    coordY.textContent = pos.y.toFixed(2);
    coordZ.textContent = pos.z.toFixed(2);
  } else if (ball) {
    // ビー玉がある場合はビー玉の座標を表示
    const pos = ball.body.position;
    coordX.textContent = pos.x.toFixed(2);
    coordY.textContent = pos.y.toFixed(2);
    coordZ.textContent = pos.z.toFixed(2);
  } else {
    // 何も選択されていない場合は0を表示
    coordX.textContent = '0.00';
    coordY.textContent = '0.00';
    coordZ.textContent = '0.00';
  }
}

// ウィンドウリサイズ処理
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 初期ドミノの配置（10個）- ビー玉の落下地点に配置（さらに90度回転：横方向に戻す）
const initialDominoStartX = -1.35; // 10個のドミノ列の開始位置（横方向）
const initialDominoZ = -0.5; // ドミノ列のZ位置（固定）
const initialDominoSpacing = 0.3; // ドミノ間の間隔

for (let i = 0; i < 10; i++) {
  const x = initialDominoStartX + i * initialDominoSpacing;
  const domino = createDomino({ x, y: 0, z: initialDominoZ });
  gameObjects.push(domino);
}

animate();

