/// Scene
var renderer = null,
scene = null,
camera = null,
root = null,
robot_idle = null,
group = null,
orbitControls = null;
//Raycaster
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2(), CLICKED;
// Game
var game = false;
var gameTime = 60;
var score = 0;
var currentRobots = 0, maxRobots = 10;
var clock = new THREE.Clock();
var robotsAnimations = {};
var robotsDeadAnimators = [];
var robots = [];
var robotsMixers = [];
var robotCount = 0;

var clip;

function createDeadAnimation() {
  const kf = new THREE.NumberKeyframeTrack( '.parent.quaternion', [ 0, 1 ], [ 0, 0, 0, 1, 0, 0, 1, 0] );
  var kfarray = [];
  kfarray.push(kf);
  clip =  new THREE.AnimationClip("dead", 2, kfarray);
}

function loadFBX(){
  var loader = new THREE.FBXLoader();
  loader.load( '../models/Robot/robot_idle.fbx', function ( object )
  {
    object.scale.set(0.02, 0.02, 0.02);
    object.position.y -= 4;
    object.traverse( function ( child ) {
      if ( child.isMesh ) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    } );
    robot_idle = object;
    createDeadAnimation();
    // ADD Animation idle
    robotsAnimations.idle = object.animations[0];
    loader.load( '../models/Robot/robot_atk.fbx', function ( object )
    {
      // ADD Animation Attack
      robotsAnimations.attack = object.animations[0];
    } );

    loader.load( '../models/Robot/robot_run.fbx', function ( object )
    {
      // ADD Animation run
      robotsAnimations.run = object.animations[0];
    } );

    loader.load( '../models/Robot/robot_walk.fbx', function ( object )
    {
      // ADD Animation walk
      robotsAnimations.walk = object.animations[0];
    } );
  } );
}

function animate() {
  if(clock.elapsedTime > 60){
    return;
  }
  var delta = clock.getDelta();
  //Update animations
  for (var robotMixer of robotsMixers) {
    // Actualizar animaciones
    robotMixer.update(delta);
  }
  //Mover robots
  for (robot of robots) {
    if((robot.position.z > 100 || robot.position.z < -100 || robot.position.x > 100 || robot.position.x < -100) && !robot.escaped && !robot.destroyed){
      robot.escaped = true;
      scene.remove(robot);
      currentRobots--;
    } else {
      robot.translateZ(delta * 30);
    }
  }
  // Añadir robots
  if(robot_idle && robotsAnimations.run && currentRobots <= maxRobots){
    addRandomRobot();
  }
  // Update score and time
  document.getElementById("score").innerHTML = "Score: " + score + "<br> Time left: " + Math.round(60-clock.elapsedTime);
}

function run() {
  requestAnimationFrame(function() { run(); });
  // Render the scene
  renderer.render( scene, camera );
  // Spin the cube for next frame
  animate();
  // Update the camera controller
  orbitControls.update();
}

function setLightColor(light, r, g, b){
  r /= 255;
  g /= 255;
  b /= 255;

  light.color.setRGB(r, g, b);
}

var directionalLight = null;
var spotLight = null;
var ambientLight = null;
var mapUrl = "../images/checker_large.gif";

var SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 2048;

function createScene(canvas) {
  // Create the Three.js renderer and attach it to our canvas
  renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );
  // Set pixel ratio and size according to device
  renderer.setPixelRatio( window.devicePixelRatio);
  renderer.setSize( innerWidth, innerHeight );
  // Turn on shadows
  renderer.shadowMap.enabled = true;
  // Options are THREE.BasicShadowMap, THREE.PCFShadowMap, PCFSoftShadowMap
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Create a new Three.js scene
  scene = new THREE.Scene();
  // Add  a camera so we can view the scene
  camera = new THREE.PerspectiveCamera( 45, canvas.width / canvas.height, 1, 4000 );
  controls = new THREE.OrbitControls( camera );
  controls.screenSpacePanning = true;
  //controls.minDistance = 100;
  //controls.maxDistance = 100;
  //controls.maxPolarAngle = 0;
  camera.position.z = 10;
  controls.update();
  camera.position.set(0, 90, 0);
  scene.add(camera);
  orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  // Create a group to hold all the objects
  root = new THREE.Object3D;
  spotLight = new THREE.SpotLight (0xffffff);
  spotLight.position.set(-30, 8, -10);
  spotLight.target.position.set(-2, 0, -2);
  root.add(spotLight);
  spotLight.castShadow = true;
  spotLight.shadow.camera.near = 1;
  spotLight.shadow.camera.far = 200;
  spotLight.shadow.camera.fov = 45;
  spotLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
  spotLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;
  ambientLight = new THREE.AmbientLight ( 0x888888 );
  root.add(ambientLight);
  // Create the objects
  loadFBX();
  // Create a group to hold the objects
  group = new THREE.Object3D;
  root.add(group);
  // Create a texture map
  var map = new THREE.TextureLoader().load(mapUrl);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(8, 8);
  var color = 0xffffff;
  // Put in a ground plane to show off the lighting
  geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
  var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color:color, map:map, side:THREE.DoubleSide}));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -4.02;
  // Add the mesh to our group
  group.add( mesh );
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  // Now add the group to our scene
  scene.add( root );
  // Add listeners
  document.addEventListener('mousedown', onDocumentMouseDown);
  window.addEventListener( 'resize', onWindowResize);
}

function addRandomRobot() {
  // Clone robot fbx
  var newRobot = cloneFbx(robot_idle);
  currentRobots++;
  // Push to robots array
  newRobot.idRobot = robotCount;
  newRobot.destroyed = false;
  newRobot.escaped = false;
  robotCount++;
  robots.push(newRobot);
  // Add new animation mixer
  var newRobotMixer = new THREE.AnimationMixer(newRobot);
  // Idle animation as default
  newRobotMixer.clipAction(robotsAnimations.run).play();
  robotsMixers.push(newRobotMixer);
  // Set random position
  var p = randomPosition();
  newRobot.position.set(p.x,-4,p.z);
  // Turn randomly
  newRobot.lookAt((Math.random() * 200)-100, -4, (Math.random() * 200)-100);
  scene.add(newRobot);
}

function randomPosition() {
  var r = 100;
  var d = 3600;
  var x = {};
  x.x = r*Math.cos((Math.random() * d)*2*Math.PI/d);
  x.z = r*Math.sin((Math.random() * d)*2*Math.PI/d);
  return x;
}

// Listeners
function onDocumentMouseDown(event) {
  event.preventDefault();
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  // find intersections
  raycaster.setFromCamera( mouse, camera );
  var intersects = raycaster.intersectObjects( robots, true );
  if ( intersects.length > 0 )
  {
    CLICKED = intersects[ 0 ].object;
    if(CLICKED.parent.destroyed){
      return;
    }
    CLICKED.parent.destroyed = true;
    //Change animation to robot
    robotsMixers[CLICKED.parent.idRobot].stopAllAction();
    robotsMixers[CLICKED.parent.idRobot].addEventListener( 'finished', function (e) {
      // Eliminar objecto de la escena
      scene.remove(e.target._root);
      // Restar robot
      currentRobots--;
      // Añadir puntos
      score += 20;
    } );
    // Animacion muerte
    robotsMixers[CLICKED.parent.idRobot].clipAction(robotsAnimations.attack).play();
    var deadAction = robotsMixers[CLICKED.parent.idRobot].clipAction(clip);
    deadAction.setLoop(THREE.LoopOnce);
    deadAction.clampWhenFinished = true;
    deadAction.play();
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}
