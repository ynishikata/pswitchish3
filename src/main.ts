import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// シーン、カメラ、レンダラーのセットアップ
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 0, 200);

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
const axesHelper = new THREE.AxesHelper(5); // 5ユニットの長さ
scene.add(axesHelper);

// 物理ワールドのセットアップ
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
});
world.broadphase = new CANNON.NaiveBroadphase();
const solver = new CANNON.GSSolver();
solver.iterations = 10;
solver.tolerance = 0.1;
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
const sunDistance = 40; // 太陽までの距離
const sunAngle = Math.PI / 4; // 45度（ラジアン）
// 斜め45度の位置: X方向とY方向に同じ距離で配置
const sunX = sunDistance * Math.cos(sunAngle);
const sunY = sunDistance * Math.sin(sunAngle);
const sunZ = 0; // Z方向は0

// 太陽の本体
const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
const sunMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xffeb3b,
  emissive: 0xffeb3b,
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
const glowGeometry = new THREE.SphereGeometry(2.5, 32, 32);
const glowMaterial = new THREE.MeshStandardMaterial({
  color: 0xffeb3b,
  emissive: 0xffeb3b,
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
const numRays = 16; // 光線の数
const rayLength = 4;
const rayThickness = 0.15;

for (let i = 0; i < numRays; i++) {
  const angle = (i / numRays) * Math.PI * 2;
  const rayGeometry = new THREE.BoxGeometry(rayThickness, rayLength, rayThickness);
  const rayMaterial = new THREE.MeshBasicMaterial({
    color: 0xffeb3b,
    transparent: true,
    opacity: 0.6
  });
  const ray = new THREE.Mesh(rayGeometry, rayMaterial);
  
  // 太陽の周りに放射状に配置
  const rayDistance = 3; // 太陽からの距離
  ray.position.set(
    sunX + Math.cos(angle) * rayDistance,
    sunY + Math.sin(angle) * rayDistance,
    sunZ
  );
  
  // 太陽の中心から外側に向かう方向に回転
  const rayDirection = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
  ray.lookAt(
    sunX + rayDirection.x * (rayDistance + rayLength / 2),
    sunY + rayDirection.y * (rayDistance + rayLength / 2),
    sunZ
  );
  
  sunRaysGroup.add(ray);
}
scene.add(sunRaysGroup);

// 太陽の光を追加（ポイントライトとして）
const sunLight = new THREE.PointLight(0xffeb3b, 2.0, 150);
sunLight.position.copy(sun.position);
sunLight.castShadow = false;
scene.add(sunLight);

// 太陽光の表現（方向性のあるライト）
const sunDirectionalLight = new THREE.DirectionalLight(0xffeb3b, 0.5);
sunDirectionalLight.position.set(sunX, sunY, sunZ);
sunDirectionalLight.target.position.set(0, 0, 0); // 原点方向に光を向ける
sunDirectionalLight.castShadow = false;
scene.add(sunDirectionalLight);
scene.add(sunDirectionalLight.target);

// 地面の作成（水平な土台）
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
// 地面を水平にする（傾きなし）
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(groundShape);
// 水平な地面（X軸周りに-90度回転のみ）
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
groundBody.material = new CANNON.Material({ friction: 0.3, restitution: 0.5 });
world.addBody(groundBody);

// オブジェクトの管理
interface GameObject {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  type: 'ball' | 'domino' | 'ramp' | 'box' | 'seesaw';
  pivotBody?: CANNON.Body; // シーソーの支点（オプション）
  constraint?: CANNON.Constraint; // シーソーのジョイント（オプション）
  pivotMesh?: THREE.Mesh; // シーソーの支点のメッシュ（オプション）
}

const gameObjects: GameObject[] = [];
let selectedObject: GameObject | null = null;
let isDragging = false;
let dragPlane: THREE.Plane | null = null;
let dragOffset = new THREE.Vector3();
let selectedObjectOriginalMaterial: THREE.Material | THREE.Material[] | null = null;
const highlightMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xffff00,
  emissive: 0xffff00,
  emissiveIntensity: 0.3
});

// ビー玉の作成
function createBall(position: { x: number; y: number; z: number }, initialVelocity?: { x: number; y: number; z: number }): GameObject {
  const radius = 0.2;
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x00ff00,
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
  const width = 0.1;
  const height = 0.8;
  const depth = 0.3;
  
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xff6b6b,
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
  body.position.set(position.x, position.y + height / 2, position.z);
  // 立った状態で初期化
  body.quaternion.set(0, 0, 0, 1);
  body.material = new CANNON.Material({ friction: 0.2, restitution: 0.6 }); // 摩擦を下げ、反発を上げて倒れやすくする
  body.linearDamping = 0.01; // 空気抵抗を低く
  body.angularDamping = 0.005; // 回転抵抗をさらに下げて、倒れやすくする
  world.addBody(body);

  return { mesh, body, type: 'domino' };
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
  type: 'domino' | 'ramp' | 'box' | 'seesaw',
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
  type: 'domino' | 'ramp' | 'box' | 'seesaw',
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

// オブジェクト選択とハイライト
function selectObject(obj: GameObject | null) {
  // 以前の選択を解除
  if (selectedObject && selectedObjectOriginalMaterial) {
    selectedObject.mesh.material = selectedObjectOriginalMaterial;
  }
  
  selectedObject = obj;
  
  // 新しい選択をハイライト
  if (selectedObject && selectedObject.type !== 'ball') {
    selectedObjectOriginalMaterial = selectedObject.mesh.material;
    selectedObject.mesh.material = highlightMaterial.clone();
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
  const intersects = raycaster.intersectObjects(
    gameObjects.map(obj => obj.mesh)
  );
  
  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object;
    const clickedObject = gameObjects.find(obj => obj.mesh === clickedMesh) || null;
    
    if (clickedObject && clickedObject.type !== 'ball') {
      event.preventDefault();
      selectObject(clickedObject);
      
      // ドラッグ開始
      isDragging = true;
      dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // 地面に平行な平面
      
      // オブジェクトの中心から交差点へのオフセットを計算
      const intersectionPoint = intersects[0].point;
      const objectPosition = new THREE.Vector3().copy(clickedObject.mesh.position);
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
      
      // メッシュと物理ボディの両方を更新
      selectedObject.mesh.position.copy(newPosition);
      selectedObject.body.position.set(
        newPosition.x,
        newPosition.y,
        newPosition.z
      );
      
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
  const intersects = raycaster.intersectObjects(
    gameObjects.map(obj => obj.mesh)
  );
  
  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object;
    const clickedObject = gameObjects.find(obj => obj.mesh === clickedMesh) || null;
    
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

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  
  // 物理シミュレーションの更新
  world.step(1/60);
  
  // Three.jsオブジェクトを物理ボディに同期（移動中はスキップ）
  gameObjects.forEach(obj => {
    // 移動中でない場合のみ同期
    if (!isDragging || obj !== selectedObject) {
      obj.mesh.position.copy(obj.body.position as any);
      obj.mesh.quaternion.copy(obj.body.quaternion as any);
    }
  });
  
  // 座標表示を更新
  updateCoordinates();
  
  controls.update();
  renderer.render(scene, camera);
}

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

