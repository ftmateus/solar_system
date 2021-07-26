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
const TIME_STOP_KEY = ' ';

const help_msg = "Keys:\n" +
                "0/1/2/3/9 - Time increase\n" +
                (TIME_STOP_KEY == " " ? "Space" : TIME_STOP_KEY) + " - stop time increase\n" +
                ZBUFFER_KEY + " - switch zbuffer\n" +
                BACKFACE_CULLING_KEY + " - switch backface culling\n" +
                WIRED_FRAME_KEY + " - wired frame\n" + 
                FILLED_KEY  + " - filled\n"
                ;

var plane_floor = false;
var stop = false;
var textures = true;


var planet_scale = 10;
var orbit_scale = 1/40;
var orbit_scale_moons = 1*Math.exp(orbit_scale-1)*Math.exp((planet_scale-1)/100);

var solar_system_data;

const SUN_DIAMETER = 1391900;
const SUN_DAY = 24.47; // At the equator. The poles are slower as the sun is gaseous


const EARTH_DIAMETER = 12742*planet_scale;
const EARTH_ORBIT = 149570000*orbit_scale;
const EARTH_YEAR = 365.26;
const EARTH_DAY = 0.99726968;

var center;

var VP_DISTANCE = 100000000000;
var zoom = 0;

var request;


const REFRESH_RATE = 60;
var time_increment = 1;

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

    loadSolarSystem()

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


    addBodiesButtons();

    $('#v0').bind('click', function() {time_increment = Math.pow(0, 3);});
    $('#v1').bind('click', function() {time_increment = Math.pow(1, 3);});
    $('#v2').bind('click', function() {time_increment = Math.pow(2, 3);});
    $('#v3').bind('click', function() {time_increment = Math.pow(3, 3);});
    $('#v9').bind('click', function() {time_increment = Math.pow(9, 3);});
    $('#resetScale').bind('click', function() {
        planet_scale = document.getElementById("planetRange").value = 10;
        orbit_scale = document.getElementById("orbitRange").value = 0.025;
        orbit_scale_moons = 1*Math.exp(orbit_scale-1)*Math.exp((planet_scale-1)/100);
    });
    $('#realScale').bind('click', function() {
        planet_scale = document.getElementById("planetRange").value = 1;
        orbit_scale = document.getElementById("orbitRange").value = 1;
        orbit_scale_moons = 1*Math.exp(orbit_scale-1)*Math.exp((planet_scale-1)/100);
    });
    $('#help').bind('click', function() {
        alert(help_msg);
    });


    document.getElementById("scalesContainer").addEventListener("input", function(){
        planet_scale = document.getElementById("planetRange").value;
        orbit_scale = document.getElementById("orbitRange").value;
        orbit_scale_moons = 1*Math.exp(orbit_scale-1)*Math.exp((planet_scale-1)/100);
    });

    // document.addEventListener("visibilitychange", function() {
    //     console.log(document.hidden, document.visibilityState);
    //   }, false);

    render();
}

function addBodiesButtons()
{
    
    for(const [_, body] of Object.entries(solar_system_data.bodies))
    {
        createCelestialBodyButton(body);
    }
}

function createCelestialBodyButton(body)
{
    const container = document.getElementById('planetsContainer');
    const button = document.createElement("button");
    button.innerText = body.name;
    //bootstrap
    button.className += "btn btn-primary"
    container.appendChild(button);   
    button.addEventListener("click", function() {center = body; if (time_increment == 0) animate();});
}


function loadSolarSystem()
{
    $.ajax({
        url: "solar_system/solar_system.json",
        dataType: "json",
        success: function(response) {
            solar_system_data = response;
        },
        async: false
    })
    console.log(solar_system_data);
    center = solar_system_data.bodies[solar_system_data.properties.center];
    VP_DISTANCE = solar_system_data.properties.vp_distance
    //zoom = VP_DISTANCE/solar_system_data.bodies.Earth.orbit;
    zoom = solar_system_data.properties.zoom
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
    for(const [_, body] of Object.entries(solar_system_data.bodies))
    {
        body.texture = setupTexture(body.texture_src);
        if(body.moons)
        {
            for (const [_, moon] of Object.entries(body.moons))
            {
                moon.texture = setupTexture(moon.texture_src);
            }
        }
    }
}


function setupTexture(imagesrc)
{
    if(!imagesrc) return;
        // Create a texture.
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([0, 255, 0, 128]));
    // Asynchronously load an image
    var image = new Image();
    image.src = "solar_system/" + imagesrc;
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
        case "1": case "0": case " ":
        let wasAnimated = time_increment != 0;
        time_increment = Math.pow(parseInt(ev.key == " " ? 0 : ev.key) , 3);
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
    
    var x = center.orbit*Math.cos(theta)*orbit_scale;
    var y = center.orbit*Math.sin(theta)*orbit_scale;
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

    for(const [_, body] of Object.entries(solar_system_data.bodies))
    {
        switch(body.type)
        {
            case "planet": addPlanet(body); break;
            case "star": addStar(body); break;
            default: alert("unknown body type")
        }
    }
    global_time += time_increment;

    renderOverlay();

    request = requestAnimationFrame(render);
}

function render() 
{
    if (time_increment > 0)
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
        multTranslation([planet.orbit*orbit_scale, 0, 0]);
        pushMatrix();
            multScale([ planet.diameter*planet_scale, planet.diameter*planet_scale, planet.diameter*planet_scale]);
            multRotationY(global_time/planet.day);
            drawPlanet(planet.color, textures && isFilled ? planet.texture : null, planet.distance);
        popMatrix();
        if (planet.rings)
        {
            pushMatrix();
                multRotationX(-30);
                multScale([planet.diameter*1.8*planet_scale, 0, planet.diameter*1.8*planet_scale]);
                drawRings();
            popMatrix();
        }
        if (planet.moons != null)
        {
            for (const [moonname, moon] of Object.entries(planet.moons))
            {
                pushMatrix();
                    multRotationX(-30);
                    multRotationY(global_time/moon.year);
                    multTranslation([moon.orbit*orbit_scale_moons + planet.diameter/2*planet_scale*Math.log(planet_scale), 0, 0]);
                    // if (planet == planets.SATURN)
                    // {
                    //     multTranslation([planet.diameter*PLANET_SCALE/2, 0, 0]);
                    // }
                    pushMatrix();
                        multScale([ moon.diameter*planet_scale, moon.diameter*planet_scale, moon.diameter*planet_scale]);
                        drawPlanet(moon.color, textures && isFilled  ? moon.texture : null, planet.distance);
                    popMatrix();
                popMatrix();
            }
        }
    popMatrix();
}

function addStar(star)
{
    gl.uniform1i(sunLoc, 1);
    pushMatrix();
        pushMatrix();
        multScale([ star.diameter, star.diameter, star.diameter]);
        multRotationY(global_time/star.day);
            drawPlanet(vec4(1.0, 1.0, 1.0, 1.0), textures && isFilled  ? star.texture : null, 0);
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
    gl.uniform4fv(colorLoc, solar_system_data.bodies.Saturn.color);
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