var canvas;
var gl;
var program;
var aspect;

var mProjectionLoc, mModelViewLoc, colorLoc;

var matrixStack = [];
var modelView;

var global_time = 0;

var start_time;

var isFilled = false, cullFace = false, zBuffer = false;

const ZBUFFER_KEY = 'z', BACKFACE_CULLING_KEY = 'b';
const WIRED_FRAME_KEY = 'w', FILLED_KEY = 'f';

var plane_floor = false;
var stop = false;


const PLANET_SCALE = 10;
const ORBIT_SCALE = 1/80;

const moons = {
    MOON: {diameter: 3474*PLANET_SCALE, orbit: 363396*ORBIT_SCALE + 150000, year: 28, day: 0, color: vec4(1.0, 1.0, 1.0, 1.0)},
    PHOBOS: {diameter:  11.2667*PLANET_SCALE*6, orbit: 9376*ORBIT_SCALE + 100000, year: 0.3, day: 0, color: vec4(1.0, 1.0, 1.0, 1.0)},
    DEIMOS: {diameter:  12.4*PLANET_SCALE*6, orbit:  23455.5*ORBIT_SCALE + 150000, year: 1.3, day: 0, color: vec4(1.0, 1.0, 1.0, 1.0) },
    IO: {diameter: 3643*PLANET_SCALE, orbit: 421800*ORBIT_SCALE + 400000, year: 1.77, day: 0, color: vec4(1.0, 1.0, 1.0, 1.0)},
    EUROPA: {diameter: 3122*PLANET_SCALE, orbit: 671100*ORBIT_SCALE + 500000, year: 3.55, day: 0, color: vec4(1.0, 1.0, 1.0, 1.0)},
    GANIMEDES: {diameter: 5262*PLANET_SCALE, orbit: 1070400 *ORBIT_SCALE + 650000, year: 7.16 , day: 0, color: vec4(1.0, 1.0, 1.0, 1.0)},
    CALISTO: {diameter: 4821*PLANET_SCALE, orbit: 1882700*ORBIT_SCALE + 750000, year: 16.69 , day: 0, color: vec4(1.0, 1.0, 1.0, 1.0)}
}

const planets = {
    MERCURY: {diameter: 4866*PLANET_SCALE, orbit: 57950000*ORBIT_SCALE, year: 87.97, day: 58.646, color: vec4(1.0, 0.7, 0.0, 1.0)},
    VENUS: {diameter: 12106*PLANET_SCALE, orbit: 108110000*ORBIT_SCALE, year: 224.70, day: 243.018, color: vec4(1.0, 0.8, 0.0, 1.0)},
    EARTH: {diameter: 12742*PLANET_SCALE, orbit: 149570000*ORBIT_SCALE, year: 365.26, day: 0.99726968, color: vec4(0.0, 0.8, 1.0, 1.0), 
        moons: [moons.MOON]},
    MARS: {diameter: 6760*PLANET_SCALE, orbit: 227840000*ORBIT_SCALE, year: 687, day: 1.01, color: vec4(1.0, 0.3, 0.0, 1.0),
        moons: [moons.PHOBOS, moons.DEIMOS]},
    JUPITER: {diameter: 142984*PLANET_SCALE/3, orbit: 778140000*ORBIT_SCALE, year: 12*365.26, day: 0.4, color: vec4(1.0, 1.0, 0.0, 1.0),
        moons: [moons.IO, moons.EUROPA, moons.GANIMEDES, moons.CALISTO]},
    SATURN: {diameter: 120536*PLANET_SCALE/3, orbit: 1433449370*ORBIT_SCALE, year: 29*365.26, day: 0.42, color: vec4(1.0, 1.0, 0.0, 1.0)},
    URANUS: {diameter: 51118*PLANET_SCALE/2, orbit: 2876679082*ORBIT_SCALE, year: 84*365.26, day: 0.72, color: vec4(0.0, 1.0, 1.0, 1.0)},
    NEPTUNE: {diameter: 49528*PLANET_SCALE/2, orbit: 4503443661*ORBIT_SCALE, year: 165*365.26, day: 0.65, color: vec4(0.0, 0.3, 1.0, 1.0)},
}

const SUN = {diameter:  1391900*0.8, orbit: 0, year: 0, day: 24.47};


const SUN_DIAMETER = 1391900*0.8;
const SUN_DAY = 24.47; // At the equator. The poles are slower as the sun is gaseous


const EARTH_DIAMETER = 12742*PLANET_SCALE;
const EARTH_ORBIT = 149570000*ORBIT_SCALE;
const EARTH_YEAR = 365.26;
const EARTH_DAY = 0.99726968;

var center = SUN;

const VP_DISTANCE = planets.NEPTUNE.orbit;
var zoom = VP_DISTANCE/planets.EARTH.orbit;


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

}

window.onresize = function () {
    fit_canvas_to_window();
}

window.onload = function() {
    canvas = document.getElementById('gl-canvas');

    gl = WebGLUtils.setupWebGL(document.getElementById('gl-canvas'));
    fit_canvas_to_window();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, 'default-vertex', 'default-fragment');

    gl.useProgram(program);

    mModelViewLoc = gl.getUniformLocation(program, "mModelView");
    mProjectionLoc = gl.getUniformLocation(program, "mProjection");
    colorLoc = gl.getUniformLocation(program, "color");

    sphereInit(gl);

    this.start_time = new Date().getTime();
    addEventListener("keypress", keyPress);
    canvas.addEventListener("wheel", function(){zoomCanvas(event);});
    //this.document.getElementById("sun").addEventListener("click", function() {center = SUN});
    $('#sun').bind('click', function() {center = SUN});
    $('#mercury').bind('click', function() {center = planets.MERCURY});
    $('#venus').bind('click', function() {center = planets.VENUS});
    $('#earth').bind('click', function() {center = planets.EARTH});
    $('#mars').bind('click', function() {center = planets.MARS});
    $('#jupiter').bind('click', function() {center = planets.JUPITER});
    $('#saturn').bind('click', function() {center = planets.SATURN});
    $('#uranus').bind('click', function() {center = planets.URANUS});
    $('#neptune').bind('click', function() {center = planets.NEPTUNE});

    render();
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
        case "9": case "8": case "7":
        case "6": case "5": case "4":
        case "3": case "2": case "1":
        case "0": time_increment = 6*parseInt(ev.key);
        break;
        case "p": plane_floor = !plane_floor;
    }
}

function moveCamera()
{
    var projection =mult(ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-3*VP_DISTANCE,3*VP_DISTANCE),
    scalem(zoom, zoom, 1));
    
    var theta = center.year == 0 ? 0 : radians(global_time/center.year);
    
    var x = center.orbit*Math.cos(theta);
    var y = center.orbit*Math.sin(theta);
    modelView = plane_floor ? PLANE_FLOOR : lookAt([0,VP_DISTANCE,VP_DISTANCE], 
        [x,0,-y], [0,1,0]);

    gl.uniformMatrix4fv(mProjectionLoc, false, flatten(projection));
}

function render() 
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    moveCamera();

    addPlanet(planets.NEPTUNE);
    addPlanet(planets.URANUS);
    addPlanet(planets.SATURN);
    addPlanet(planets.JUPITER) ;
    addPlanet(planets.MARS);
    addPlanet(planets.EARTH);
    addPlanet(planets.VENUS);
    addPlanet(planets.MERCURY);
    sun();

    global_time += time_increment;

    renderOverlay();
    
    requestAnimationFrame(render);
}

function zoomCanvas(e)
{
    var e_delta = (e.deltaY || -e.wheelDelta || e.detail);
    var delta =  e_delta && ((e_delta >> 10) || 1) || 0;
    zoom *= (delta > 0 || event.detail > 0) ? 1.1 : 0.9;
}

function addPlanet(planet)
{
    pushMatrix();
        multRotationY(global_time/planet.year);
        multTranslation([(planet.orbit), 0, 0]);
        pushMatrix();
            multScale([ planet.diameter, planet.diameter, planet.diameter]);
            multRotationY(global_time/planet.day);
            drawPlanet(planet.color);
        popMatrix();
        if (planet.moons != null)
        {
            for (var moon of planet.moons)
            {
                pushMatrix();
                    multRotationY(global_time/moon.year);
                    multTranslation([(moon.orbit), 0, 0]);
                    pushMatrix();
                        multScale([ moon.diameter, moon.diameter, moon.diameter]);
                        drawPlanet(moon.color);
                    popMatrix();
                popMatrix();
            }
        }
    popMatrix();
}

function sun()
{
    pushMatrix();
        pushMatrix();
        multScale([ SUN_DIAMETER, SUN_DIAMETER, SUN_DIAMETER]);
        multRotationY(global_time/SUN_DAY);
            drawPlanet(vec4(1.0, 1.0, 1.0, 1.0));
        popMatrix();
    popMatrix();
}
function drawPlanet(color)
{
    gl.uniformMatrix4fv(mModelViewLoc, false, flatten(modelView));
    gl.uniform4fv(colorLoc, color);
    if (isFilled)
        sphereDrawFilled(gl, program);
    else 
        sphereDrawWireFrame(gl, program);
}

function renderOverlay()
{
    document.getElementById("days").textContent = parseInt((global_time/360));
    document.getElementById("months").textContent = parseInt((global_time/360)/(EARTH_YEAR/12));
    document.getElementById("years").textContent = parseInt((global_time/360)/EARTH_YEAR);
    if (time_increment != 0)
        document.getElementById("seconds_start").textContent = parseInt(((global_time/time_increment)/REFRESH_RATE));//(global_time/360)/EARTH_YEAR;

}