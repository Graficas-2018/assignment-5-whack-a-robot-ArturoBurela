/// Scene
var renderer = null,
scene = null,
camera = null,
root = null,
robot_idle = null,
robot_attack = null,
group = null,
orbitControls = null;
//Raycaster
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2(), INTERSECTED, CLICKED;
// Game
var game = false;
var gameTime = 60;
var score = 0;
var currentRobots = 0, maxRobots = 3;
var clock = new THREE.Clock();
var robotsAnimations = {};
var robotsDeadAnimators = [];
var robots = [];
var robotsMixers = [];
var robotCount = 0;
// Robots
var robot_mixer = {};
var deadAnimator;
var morphs = [];

var duration = 20000; // ms
var currentTime = Date.now();

var animation = "run";

function changeAnimation(animation_text){
  animation = animation_text;

  if(animation =="dead")
  {
    createDeadAnimation();
  }
  else
  {
    robot_idle.rotation.x = 0;
    robot_idle.position.y = -4;
  }
}

function loadFBX(){
  var loader = new THREE.FBXLoader();
  loader.load( '../models/Robot/robot_idle.fbx', function ( object )
  {
    robot_mixer["idle"] = new THREE.AnimationMixer( scene );
    object.scale.set(0.02, 0.02, 0.02);
    object.position.y -= 4;
    object.traverse( function ( child ) {
      if ( child.isMesh ) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    } );
    robot_idle = object;
    scene.add( robot_idle );

    robot_mixer["idle"].clipAction( object.animations[ 0 ], robot_idle ).play();
    // ADD Animation idle
    robotsAnimations.idle = object.animations[0];

    loader.load( '../models/Robot/robot_atk.fbx', function ( object )
    {
      robot_mixer["attack"] = new THREE.AnimationMixer( scene );
      robot_mixer["attack"].clipAction( object.animations[ 0 ], robot_idle ).play();
      // ADD Animation Attack
      robotsAnimations.attack = object.animations[0];
    } );

    loader.load( '../models/Robot/robot_run.fbx', function ( object )
    {
      robot_mixer["run"] = new THREE.AnimationMixer( scene );
      robot_mixer["run"].clipAction( object.animations[ 0 ], robot_idle ).play();
      // ADD Animation run
      robotsAnimations.run = object.animations[0];
    } );

    loader.load( '../models/Robot/robot_walk.fbx', function ( object )
    {
      robot_mixer["walk"] = new THREE.AnimationMixer( scene );
      robot_mixer["walk"].clipAction( object.animations[ 0 ], robot_idle ).play();
      // ADD Animation walk
      robotsAnimations.walk = object.animations[0];
    } );
  } );
}

function animate() {

  var now = Date.now();
  var deltat = now - currentTime;
  currentTime = now;

  var delta = clock.getDelta();

  //Update animations
  for (var robotMixer of robotsMixers) {
    //console.log(robotMixer);
    robotMixer.update(delta);
  }

  if(robot_idle && robot_mixer[animation])
  {
    robot_mixer[animation].update(deltat * 0.001);
  }

  if(animation =="dead")
  {
    KF.update();
  }

  if(robot_idle && robot_mixer["walk"] && currentRobots <= maxRobots){
    addRandomRobot();
  }
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
  // Turn to the center
  newRobot.lookAt(0,-4,0);
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
    //Change animation to robot
    console.log(CLICKED);
    robotsMixers[CLICKED.parent.idRobot].stopAllAction();
    robotsMixers[CLICKED.parent.idRobot].addEventListener( 'loop', function (e) {
      console.log(e);
      robotsMixers[CLICKED.parent.idRobot].enabled = false;
      //scene.remove(CLICKED);
    } );
    const kf = new THREE.NumberKeyframeTrack( '.parent.quaternion', [ 0, 1 ], [ 0, 0, 0, 1, 0, 0, 1, 0] );
    var kfarray = [];
    kfarray.push(kf);
    const clip =  new THREE.AnimationClip("dead", 2, kfarray);
    robotsMixers[CLICKED.parent.idRobot].clipAction(clip).play();
    /*if(!animator.running)
    {
    for(var i = 0; i<= animator.interps.length -1; i++)
    {
    animator.interps[i].target = CLICKED.rotation;
  }
  playAnimations();
}*/
}
else
{
  if ( CLICKED )
  CLICKED.material.emissive.setHex( CLICKED.currentHex );

  CLICKED = null;
}
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}
