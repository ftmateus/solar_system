var canvas;
var gl;
var programPhong, programGouraud;
var currentProgram, nextProgram;
var aspect;
var hammertime;

var mProjectionLoc, mModelViewLoc, colorLoc, noTextureLoc, mNormalsLoc, mViewNormalsLoc, mViewLoc, sunLoc,
distanceLoc;

var matrixStack = [];
var modelView;

var global_time = 0;

var start_time;

var isFilled = true, cullFace = false, zBuffer = false;

const ZBUFFER_KEY = 'z', BACKFACE_CULLING_KEY = 'b';
const WIRED_FRAME_KEY = 'w', FILLED_KEY = 'f';

var plane_floor = false;
var stop = false;
var textures = true;


const PLANET_SCALE = 1;
const ORBIT_SCALE = 1;

var moons = {
    MOON: {diameter: 3474, orbit: 363396, year: 28, day: 0, color: vec4(1.0, 1.0, 1.0, 1.0), texture: null},
    PHOBOS: {diameter:  11.2667*6, orbit: 9376+ 100000, year: 0.3, day: 0, color: vec4(1.0, 1.0, 1.0, 1.0)},
    DEIMOS: {diameter:  12.4*6, orbit:  23455.5+ 150000, year: 1.3, day: 0, color: vec4(1.0, 1.0, 1.0, 1.0) },
    IO: {diameter: 3643, orbit: 421800 + 400000, year: 1.77, day: 0, color: vec4(1.0, 1.0, 1.0, 1.0)},
    EUROPA: {diameter: 3122, orbit: 671100+ 500000, year: 3.55, day: 0, color: vec4(1.0, 1.0, 1.0, 1.0)},
    GANIMEDES: {diameter: 5262, orbit: 1070400  + 650000, year: 7.16 , day: 0, color: vec4(1.0, 1.0, 1.0, 1.0)},
    CALISTO: {diameter: 4821, orbit: 1882700 + 750000, year: 16.69 , day: 0, color: vec4(1.0, 1.0, 1.0, 1.0)},
    TITAN: {diameter: 5150, orbit: 1221870 + 750000, year: 16 , day: 0, color: vec4(1.0, 1.0, 0.0, 1.0)},
    REIA: {diameter: 1527, orbit: 527108+ 500000, year: 4.5 , day: 0, color: vec4(1.0, 1.0, 0.0, 1.0)},
    JAPETO: {diameter: 1470, orbit: 3560820 + 1500000, year: 79 , day: 0, color: vec4(1.0, 1.0, 0.0, 1.0)}

}

var planets = {
    MERCURY: {diameter: 4866, orbit: 57950000, year: 87.97, day: 58.646, color: vec4(1.0, 1.0, 1.0, 1.0),
        texture: null},
    VENUS: {diameter: 12106, orbit: 108110000, year: 224.70, day: 243.018, color: vec4(1.0, 0.8, 0.0, 1.0)
    , texture: null},
    EARTH: {diameter: 12742, orbit: 149570000, year: 365.26, day: 0.99726968, color: vec4(0.0, 0.6, 1.0, 1.0), 
        moons: [moons.MOON], texture: null},
    MARS: {diameter: 6760, orbit: 227840000, year: 687, day: 1.01, color: vec4(1.0, 0.3, 0.0, 1.0),
        moons: [moons.PHOBOS, moons.DEIMOS], texture: null},
    JUPITER: {diameter: 142984, orbit: 778140000, year: 12*365.26, day: 0.4, color: vec4(1.0, 1.0, 0.0, 1.0),
        moons: [moons.IO, moons.EUROPA, moons.GANIMEDES, moons.CALISTO], texture: null},
    SATURN: {diameter: 120536/3, orbit: 1433449370, year: 29*365.26, day: 0.42, color: vec4(1.0, 1.0, 0.0, 1.0),
        moons: [moons.TITAN, moons.REIA, moons.JAPETO], texture: null},
    URANUS: {diameter: 51118, orbit: 2876679082, year: 84*365.26, day: 0.72, color: vec4(0.0, 1.0, 1.0, 1.0),
        texture: null},
    NEPTUNE: {diameter: 49528, orbit: 4503443661, year: 165*365.26, day: 0.65, color: vec4(0.0, 0.3, 1.0, 1.0), 
        texture: null},
}

var SUN = {diameter:  1391900*0.8, orbit: 0, year: 0, day: 24.47, texture: null};


const SUN_DIAMETER = 1391900;
const SUN_DAY = 24.47; // At the equator. The poles are slower as the sun is gaseous


const EARTH_DIAMETER = 12742*PLANET_SCALE;
const EARTH_ORBIT = 149570000*ORBIT_SCALE;
const EARTH_YEAR = 365.26;
const EARTH_DAY = 0.99726968;

var center = SUN;

const VP_DISTANCE = planets.NEPTUNE.orbit*10;
var zoom = VP_DISTANCE/planets.EARTH.orbit;

var request;


const REFRESH_RATE = 60;
var time_increment = 6;

const PLANE_FLOOR = rotateX(90);



// Stack related operations
function pushMatrix() {
    var m =  mat4(modelView[0], modelView[1],
           modelView[2], modelView[3]);
    matrixStack.push(m);
}
function popMatrix() {
    modelView = matrixStack.pop();
}
// Append transformations to modelView
function multMatrix(m) {
    modelView = mult(modelView, m);
}
function multTranslation(t) {
    modelView = mult(modelView, translate(t));
}
function multScale(s) { 
    modelView = mult(modelView, scalem(s)); 
}
function multRotationX(angle) {
    modelView = mult(modelView, rotateX(angle));
}
function multRotationY(angle) {
    modelView = mult(modelView, rotateY(angle));
}
function multRotationZ(angle) {
    modelView = mult(modelView, rotateZ(angle));
}

function fit_canvas_to_window()
{
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    aspect = canvas.width / canvas.height;
    gl.viewport(0, 0,canvas.width, canvas.height);
    if (global_time > 0)
        if (time_increment == 0) animate();

}

window.onresize = function () {
    fit_canvas_to_window();
}

window.onload = function() {
    canvas = document.getElementById('gl-canvas');

    gl = WebGLUtils.setupWebGL(document.getElementById('gl-canvas'));
    fit_canvas_to_window();

    //gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    programPhong = initShaders(gl, 'phong-vertex', 'phong-fragment');
    programGouraud = initShaders(gl, 'gouraud-vertex', 'gouraud-fragment');
    nextProgram = programPhong;

    sphereInit(gl, 250, 100);
    torusInit(gl);

    setupPlanetsTextures();

    this.start_time = new Date().getTime();
    addEventListener("keypress", keyPress);
    canvas.addEventListener("wheel", function(){zoomCanvas(event);});

    hammertime = new Hammer(document.getElementById('gl-canvas'));
    hammertime.get('pinch').set({ enable: true });
    hammertime.on('pinch', function(ev) {
        zoom *= ev.scale > 1 ? 1.01 : 0.99;
        if (time_increment == 0) animate();
    });

    //this.document.getElementById("sun").addEventListener("click", function() {center = SUN});
    $('#sun').bind('click', function() {center = SUN; if (time_increment == 0); animate();});
    $('#mercury').bind('click', function() {center = planets.MERCURY; if (time_increment == 0) animate();});
    $('#venus').bind('click', function() {center = planets.VENUS; if (time_increment == 0) animate();});
    $('#earth').bind('click', function() {center = planets.EARTH; if (time_increment == 0) animate(); });
    $('#mars').bind('click', function() {center = planets.MARS; if (time_increment == 0) animate();});
    $('#jupiter').bind('click', function() {center = planets.JUPITER; if (time_increment == 0) animate();});
    $('#saturn').bind('click', function() {center = planets.SATURN; if (time_increment == 0) animate();});
    $('#uranus').bind('click', function() {center = planets.URANUS; if (time_increment == 0) animate();});
    $('#neptune').bind('click', function() {center = planets.NEPTUNE; if (time_increment == 0) animate();});
    canvas.addEventListener("mousedown",mouseDown);
    canvas.addEventListener("mouseup",mouseUp);
    canvas.addEventListener("mousemove",mouseMove);

    $('#v1').bind('click', function() {time_increment = 3*Math.pow(1, 3);});
    $('#v2').bind('click', function() {time_increment = 3*Math.pow(2, 3);});
    $('#v3').bind('click', function() {time_increment = 3*Math.pow(3, 3);});

    // document.addEventListener("visibilitychange", function() {
    //     console.log(document.hidden, document.visibilityState);
    //   }, false);

    render();
}

function switchShading()
{
    currentProgram = nextProgram;
    nextProgram = null;
    gl.useProgram(currentProgram);

    mModelViewLoc = gl.getUniformLocation(currentProgram, "mModelView");
    mProjectionLoc = gl.getUniformLocation(currentProgram, "mProjection");
    colorLoc = gl.getUniformLocation(currentProgram, "color");
    noTextureLoc = gl.getUniformLocation(currentProgram, "noTexture");
    this.mNormalsLoc = gl.getUniformLocation(currentProgram, "mNormals");
    this.mViewNormalsLoc = gl.getUniformLocation(currentProgram, "mViewNormals");
    this.mViewLoc = gl.getUniformLocation(currentProgram, "mView");
    this.sunLoc = gl.getUniformLocation(currentProgram, "sun");
    this.distanceLoc = gl.getUniformLocation(currentProgram, "distance");
}

function setupPlanetsTextures()
{
    planets.MERCURY.texture = setupTexture("2k_mercury.jpg");
    planets.VENUS.texture = setupTexture("2k_venus_atmosphere.jpg");
    planets.EARTH.texture = setupTexture("2k_earth_daymap.jpg");
    planets.MARS.texture = setupTexture("2k_mars.jpg");
    planets.JUPITER.texture = setupTexture("2k_jupiter.jpg");
    planets.SATURN.texture = setupTexture("2k_saturn.jpg");
    planets.URANUS.texture = setupTexture("2k_uranus.jpg");
    planets.NEPTUNE.texture = setupTexture("2k_neptune.jpg");
    SUN.texture = setupTexture("2k_sun.jpg");
    moons.MOON.texture = setupTexture("2k_moon.jpg");
}


function setupTexture(imagesrc)
{
        // Create a texture.
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([0, 255, 0, 128]));
    // Asynchronously load an image
    var image = new Image();
    image.src = "textures/" + imagesrc;
    image.addEventListener('load', function() {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    });

    return texture;
}

/**
 * Handles key selection.
 * @param {*} ev 
 */
function keyPress(ev)
{
    switch (ev.key.toLowerCase())
    {
        case WIRED_FRAME_KEY: isFilled = false; break;
        case FILLED_KEY: isFilled = true; break;
        case BACKFACE_CULLING_KEY: 
            if (cullFace = !cullFace) 
            {
                gl.enable(gl.CULL_FACE);
                gl.cullFace(gl.BACK);
                gl.frontFace(gl.CCW);
            }
            else gl.disable(gl.CULL_FACE);
        break;
        case ZBUFFER_KEY: 
            if (zBuffer = !zBuffer) gl.enable(gl.DEPTH_TEST);
            else gl.disable(gl.DEPTH_TEST);
        break;
        case "9": case "3": case "2":
        case "1": case "0": 
        let wasAnimated = time_increment != 0;
        time_increment = Math.pow(parseInt(ev.key), 3);
        if (!wasAnimated) animate();
        break;
        case "p": plane_floor = !plane_floor; break;
        case "t": textures = !textures; break;
        case "n": nextProgram = programPhong; break;
        case "m": nextProgram = programGouraud; break;
    }
}
var isMoving;
var startPos = vec2(0,0);
var endPos = vec2(0,0);
var currentCameraDistance = vec3(0,VP_DISTANCE,VP_DISTANCE)

function getMousePos(canvas, ev) {
    var x = -1 + 2 * ev.offsetX/canvas.width; 
    var y = -1 + 2 * (canvas.height-ev.offsetY)/canvas.height;
    return vec2(x*100000000,y*100000000);    
}

function mouseDown(ev) {
    startPos = getMousePos(canvas, ev);
    endPos = startPos;
    isMoving = true;
    
}

function mouseMove(ev) {
    if (isMoving) endPos = getMousePos(canvas, ev);
    currentCameraDistance[0] += endPos[0] - startPos[0];
    currentCameraDistance[1] += endPos[1] - startPos[1];
}

function mouseUp(ev) {
    endPos = startPos = vec2(0,0);
    isMoving = false;
}

function moveCamera()
{
    var projection =mult(ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-100*VP_DISTANCE,100*VP_DISTANCE),
    scalem(zoom, zoom, 1));
    
    var theta = center.year == 0 ? 0 : radians(global_time/center.year);
    
    var x = center.orbit*Math.cos(theta)*ORBIT_SCALE;
    var y = center.orbit*Math.sin(theta)*ORBIT_SCALE;
    modelView = plane_floor ? PLANE_FLOOR : lookAt(currentCameraDistance, [x,0,-y], [0,1,0]);

    gl.uniformMatrix4fv(mViewLoc, false, flatten(modelView));
    gl.uniformMatrix4fv(mViewNormalsLoc, false, flatten(normalMatrix(modelView, false)));
    gl.uniformMatrix4fv(mProjectionLoc, false, flatten(projection));
}

function animate()
{
    if (nextProgram != null) switchShading();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    moveCamera();

    addPlanet(planets.NEPTUNE);
    addPlanet(planets.URANUS);
    addPlanet(planets.SATURN);
    addPlanet(planets.JUPITER);
    addPlanet(planets.MARS);
    addPlanet(planets.EARTH);
    addPlanet(planets.VENUS);
    addPlanet(planets.MERCURY);
    sun();

    global_time += time_increment;

    renderOverlay();

    request = requestAnimationFrame(render);
}

function render() 
{
    if (time_increment != 0)
        animate();
    else
        cancelAnimationFrame(request);
}

function zoomCanvas(e)
{
    var e_delta = (e.deltaY || -e.wheelDelta || e.detail);
    var delta =  e_delta && ((e_delta >> 10) || 1) || 0;
    zoom *= (delta > 0 || event.detail > 0) ? 1.1 : 0.9;
    if (time_increment == 0) animate();
}

function addPlanet(planet)
{
    gl.uniform1i(sunLoc, 0);
    pushMatrix();
        multRotationY(global_time/planet.year);
        multTranslation([(planet.orbit*ORBIT_SCALE), 0, 0]);
        pushMatrix();
            multScale([ planet.diameter*PLANET_SCALE, planet.diameter*PLANET_SCALE, planet.diameter*PLANET_SCALE]);
            multRotationY(global_time/planet.day);
            drawPlanet(planet.color, textures && isFilled ? planet.texture : null, planet.distance);
        popMatrix();
        if (planet == planets.SATURN)
        {
            pushMatrix();
                multRotationX(-30);
                multScale([planet.diameter*1.8*PLANET_SCALE, 0, planet.diameter*1.8*PLANET_SCALE]);
                drawRings();
            popMatrix();
        }
        if (planet.moons != null)
        {
            for (var moon of planet.moons)
            {
                pushMatrix();
                    multRotationX(-30);
                    multRotationY(global_time/moon.year);
                    multTranslation([(moon.orbit*ORBIT_SCALE*PLANET_SCALE), 0, 0]);
                    pushMatrix();
                        multScale([ moon.diameter*PLANET_SCALE, moon.diameter*PLANET_SCALE, moon.diameter*PLANET_SCALE]);
                        drawPlanet(moon.color, textures && isFilled  ? moon.texture : null, planet.distance);
                    popMatrix();
                popMatrix();
            }
        }
    popMatrix();
}

function sun()
{
    gl.uniform1i(sunLoc, 1);
    pushMatrix();
        pushMatrix();
        multScale([ SUN_DIAMETER, SUN_DIAMETER, SUN_DIAMETER]);
        multRotationY(global_time/SUN_DAY);
            drawPlanet(vec4(1.0, 1.0, 1.0, 1.0), textures && isFilled  ? SUN.texture : null, 0);
        popMatrix();
    popMatrix();
}
function drawPlanet(color, texture = null, distance)
{

    gl.uniformMatrix4fv(mNormalsLoc, false, flatten(normalMatrix(modelView, false)));
    gl.uniformMatrix4fv(mModelViewLoc, false, flatten(modelView));
    gl.uniform4fv(colorLoc, color);
    gl.uniform1f(distanceLoc, distance);
    gl.uniform1i(noTextureLoc, texture == null ? 1 : 0);
    if (isFilled)
        sphereDrawFilled(gl, currentProgram, texture);
    else 
        sphereDrawWireFrame(gl, currentProgram, texture);
}

function drawRings()
{
    gl.uniformMatrix4fv(mNormalsLoc, false, flatten(normalMatrix(modelView, false)));
    gl.uniform1i(noTextureLoc, 1);
    gl.uniformMatrix4fv(mModelViewLoc, false, flatten(modelView));
    gl.uniform4fv(colorLoc, planets.SATURN.color);
    if (isFilled)
        torusDrawFilled(gl, currentProgram);
    else 
        torusDrawWireFrame(gl, currentProgram);
}

function renderOverlay()
{
    document.getElementById("days").textContent = parseInt((global_time/360));
    document.getElementById("months").textContent = parseInt((global_time/360)/(EARTH_YEAR/12));
    document.getElementById("years").textContent = parseInt((global_time/360)/EARTH_YEAR);
    if (time_increment != 0)
        document.getElementById("seconds_start").textContent = parseInt(((global_time/time_increment)/REFRESH_RATE));//(global_time/360)/EARTH_YEAR;
    document.getElementById("shading_method").textContent = currentProgram == programPhong ? "Phong" : "Gouraud";
}