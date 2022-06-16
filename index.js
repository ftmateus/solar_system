let canvas;
let gl;
let programPhong, programGouraud;
let currentProgram, nextProgram;
let aspect;
let hammertime;

var mProjectionLoc, mModelViewLoc, colorLoc, noTextureLoc, mNormalsLoc, mViewNormalsLoc, mViewLoc, sunLoc,
distanceLoc;

var matrixStack = [];
var modelView;

let time_increments = [0, 1, 2, 3, 9]

let execution_time = 0;
var solar_system_time = 0;

var start_time;

var isFilled = true, cullFace = false, zBuffer = true;

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

const EARTH_YEAR = 365.26;

let DEFAULT_SPHERE;

var center;

var VP_DISTANCE = 100000000000;
var zoom = 0;

var request;


const REFRESH_RATE = 60;
var time_increment = 0;

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
    animate(true);
}

function change_time_increment(inc)
{
      let wasAnimated = time_increment != 0;
    time_increment = Math.pow(parseInt(inc == " " ? 0 : inc) , 3);
    if (!wasAnimated) animate(false);
}

window.onload = function() {

    canvas = document.getElementById('gl-canvas');

    gl = WebGLUtils.setupWebGL(document.getElementById('gl-canvas'));
    fit_canvas_to_window();

    //gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    programPhong = initShaders(gl, './shaders/phong_v_shader.glsl', './shaders/phong_f_shader.glsl');
    programGouraud = initShaders(gl, './shaders/gouraud_v_shader.glsl', './shaders/gouraud_f_shader.glsl');
    nextProgram = programPhong;

    //sphereInit(gl, 250, 100);
    DEFAULT_SPHERE = new Sphere(gl, 250, 100);
    //torusInit(gl);

    loadSolarSystem()

    setupPlanets();

    this.start_time = new Date().getTime();
    addEventListener("keypress", keyPress);
    canvas.addEventListener("wheel", function(){zoomCanvas(event);});

    hammertime = new Hammer(document.getElementById('gl-canvas'));
    hammertime.get('pinch').set({ enable: true });
    hammertime.on('pinch', function(ev) {
        zoom *= ev.scale > 1 ? 1.01 : 0.99;
        animate(true);
    });

    //this.document.getElementById("sun").addEventListener("click", function() {center = SUN});


    addBodiesButtons();


    for(let inc of time_increments)
        $('#v' + inc).bind('click', () => change_time_increment(inc));

    $('#resetScale').bind('click', function() {
        planet_scale = document.getElementById("planetRange").value = 10;
        orbit_scale = document.getElementById("orbitRange").value = 0.025;
        orbit_scale_moons = 1*Math.exp(orbit_scale-1)*Math.exp((planet_scale-1)/100);
        animate(true);
    });
    $('#realScale').bind('click', function() {
        planet_scale = document.getElementById("planetRange").value = 1;
        orbit_scale = document.getElementById("orbitRange").value = 1;
        orbit_scale_moons = 1*Math.exp(orbit_scale-1)*Math.exp((planet_scale-1)/100);
       animate(true);
    });

    $('#toggles').bind('click', function() 
    {
        let timeCtr = $("#timeContainer")
        let scalesCtr = $("#scalesContainer")
        
        if(timeCtr.is(":hidden") && scalesCtr.is(":hidden"))
        {
            timeCtr.show("fast");
            scalesCtr.show("fast");
            $('#toggles').css("color", "rgb(42, 94, 172)")
        }
        else
        {
            console.assert(!timeCtr.is(":hidden") && !scalesCtr.is(":hidden"))
            timeCtr.hide("fast");
            scalesCtr.hide("fast");

            $('#toggles').css("color", "rgba(255,255,255,.55)")
        }
    })

    $("#backfaceculling_switch").bind("click", function()
    {
        switchBackFaceCulling()
    })

    $("#zbuffer_switch").bind("click", function()
    {
        switchZbuffer()
    })

    $("#overlay_switch").bind("click", function()
    {
        let overlayElem = $("#overlay")
        if(overlayElem.is(":hidden"))
        {
            overlayElem.show("fast")
            $("#overlay_switch").text("Hide overlay")
        }
        else
        {
            overlayElem.hide("fast")
            $("#overlay_switch").text("Show overlay")
        }
            
    })

    document.getElementById("scalesContainer").addEventListener("input", function(){
        planet_scale = document.getElementById("planetRange").value;
        orbit_scale = document.getElementById("orbitRange").value;
        orbit_scale_moons = 1*Math.exp(orbit_scale-1)*Math.exp((planet_scale-1)/100);
        animate(true);
    });

    // document.addEventListener("visibilitychange", function() {
    //     console.log(document.hidden, document.visibilityState);
    //   }, false);

    animate(false);
}

function switchBackFaceCulling()
{
    if (cullFace = !cullFace) 
    {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
    }
    else gl.disable(gl.CULL_FACE);
    $("#backfaceculling_switch").text((cullFace ? "Disable" : "Enable") + " backface culling (b)")
    animate(true)
}

function switchZbuffer()
{
    if (zBuffer = !zBuffer)
        gl.enable(gl.DEPTH_TEST);
    else gl.disable(gl.DEPTH_TEST);
    $("#zbuffer_switch").text((zBuffer ? "Disable" : "Enable") + " zbuffer (z)")
    animate(true)
}

function addBodiesButtons()
{
    
    for(const [_, body] of Object.entries(solar_system_data.bodies))
    {
        createCelestialBodyButtonNav(body);
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
    button.addEventListener("click", function() {center = body; animate(true);});
}

function createCelestialBodyButtonNav(body)
{
    const container = document.getElementById('planetsNavbarBtnsCont');
    const li = document.createElement("li");
    li.className += "nav-item"
    const a = document.createElement("a");
    a.setAttribute("id", body.name)
    a.className += "nav-link"
    a.href="#"
    a.innerText = body.name

    // if(body.moons)
    // {
    //     li.className += " dropdown"
    //     a.className += " dropdown-toggle"

    //     a.setAttribute("id", body.name)
    //     a.setAttribute("role", "button")
    //     a.setAttribute("data-toggle", "dropdown")
    //     a.setAttribute("aria-haspopup", "true")
    //     a.setAttribute("aria-expanded", "false")

    //     const dropdownDiv = document.createElement("div")
    //     dropdownDiv.setAttribute("class", "dropdown-menu")
    //     dropdownDiv.setAttribute("aria-labelledby", body.name)

    //     for (const [moonname, moon] of Object.entries(body.moons))
    //     {
    //         let moonAelem = document.createElement("a")
    //         moonAelem.setAttribute("class", "dropdown-item")
    //         moonAelem.setAttribute("href", "#")
    //         moonAelem.innerText = moonname

    //         moonAelem.addEventListener("click", function() 
    //         {
    //             $("#" + center.name).css("color", "rgba(255,255,255,.55)")
    //             center = moon; 
    //             animate(true);
    //         });

    //         dropdownDiv.appendChild(moonAelem)
    //     }

    //     li.appendChild(dropdownDiv)

    // }
    // else
    // {
        
        a.setAttribute("data-toggle", "collapse")
        a.setAttribute("data-target", "#planetsNavbar")
    // }

    li.appendChild(a);  
    container.appendChild(li)

    a.addEventListener("click", function() 
    {
        $("#" + center.name).css("color", "rgba(255,255,255,.55)")
        center = body; 
        $("#" + center.name).css("color", "rgb(42, 94, 172)")
        animate(true);
    });
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
    center = solar_system_data.bodies[solar_system_data.center];
    VP_DISTANCE = solar_system_data.vp_distance
    //zoom = VP_DISTANCE/solar_system_data.bodies.Earth.orbit;
    zoom = solar_system_data.zoom
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

function setupPlanets()
{
    let planetTranslation = function()
    {
        return [this.orbit*orbit_scale, 0, 0]
    }

    let moonTranslation = function()
    {
        return [this.orbit*orbit_scale_moons + this.orbiting.diameter/2*planet_scale*Math.log(planet_scale), 0, 0]
    }

    function setupSolarSystemBody(body)
    {
        body.glObj = DEFAULT_SPHERE
        body.texture = setupTexture(body.texture_src);
    
        if(body.moons)
            for (const [_, moon] of Object.entries(body.moons))
            {
                setupSolarSystemBody(moon)
                moon.orbiting = body
                moon.translation = moonTranslation
            }
                
        body.translation = planetTranslation

        if(body.rings)
            body.rings.glObj = new Torus(gl)
    }

    for(const [_, body] of Object.entries(solar_system_data.bodies))
        setupSolarSystemBody(body)
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
        animate(true);
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
            switchBackFaceCulling()
        break;
        case ZBUFFER_KEY: 
            switchZbuffer()
        break;
        case "9": case "3": case "2":
        case "1": case "0": case " ":
            change_time_increment(ev.key)
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

function getBodyCoordinates(body)
{
    let coords = {x: 0, y: 0}
    if(body.orbiting)
    {
        let orbCoords = getBodyCoordinates(body.orbiting)
        coords.x += orbCoords.x
        coords.y += orbCoords.y
    }
    let theta = body.year == 0 ? 0 : radians(solar_system_time/body.year);

    coords.x += body.translation()[0]*Math.cos(theta);
    
    coords.y += body.translation()[0]*Math.sin(theta);

    return coords
}

function moveCamera()
{
    let projection =mult(ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-100*VP_DISTANCE,100*VP_DISTANCE),
    scalem(zoom, zoom, 1));
    
    let coords = getBodyCoordinates(center)

    modelView = /*plane_floor ? PLANE_FLOOR : */lookAt(currentCameraDistance, [coords.x,0,-coords.y], [0,1,0]);

    gl.uniformMatrix4fv(mViewLoc, false, flatten(modelView));
    gl.uniformMatrix4fv(mViewNormalsLoc, false, flatten(normalMatrix(modelView, false)));
    gl.uniformMatrix4fv(mProjectionLoc, false, flatten(projection));
}

function animate(refreshOnly)
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
            default: console.assert(false, "Unknown body type!")
        }
    }
    
    renderOverlay();

    if(!refreshOnly)
    {
        solar_system_time += time_increment;

        if(time_increment)
            execution_time++;

        request = requestAnimationFrame(render);
    }
        
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
    animate(true);
}

function addPlanet(planet)
{
    gl.uniform1i(sunLoc, 0);
    pushMatrix();
    {
        multRotationY(solar_system_time/planet.year);
        multTranslation(planet.translation());
        pushMatrix();
        {
            multScale([ planet.diameter*planet_scale, planet.diameter*planet_scale, planet.diameter*planet_scale]);

            multRotationZ((planet.tilt ? planet.tilt : 0)*Math.cos((solar_system_time/planet.year)*Math.PI/180))
            if(planet.retrogade)
                multRotationY(-solar_system_time/planet.day);
            else
                multRotationY(solar_system_time/planet.day);
            
            drawPlanet(planet);
        } 
        popMatrix();
        if (planet.moons != null)
        {
            for (const [_, moon] of Object.entries(planet.moons))
            {
                pushMatrix();
                    //multRotationX(-30);
                    multRotationY(solar_system_time/moon.year);
                    multTranslation(moon.translation());
                    // if (planet == planets.SATURN)
                    // {
                    //     multTranslation([planet.diameter*PLANET_SCALE/2, 0, 0]);
                    // }
                    multScale([ moon.diameter*planet_scale, moon.diameter*planet_scale, moon.diameter*planet_scale]);
                    drawPlanet(moon);
                popMatrix();
            }
        }
        if (planet.rings)
        {
            pushMatrix();
            {
                multRotationX(-30);
                multRotationZ((planet.tilt ? planet.tilt : 0)*Math.cos((solar_system_time/planet.year)*Math.PI/180))
                multScale([planet.rings.width*planet_scale, planet.rings.height, planet.rings.width*planet_scale]);
                drawRings(planet);
            }
            popMatrix();
        }
        
    }  
    popMatrix();
}

function addStar(star)
{
    gl.uniform1i(sunLoc, 1);
    pushMatrix();
        multScale([ star.diameter, star.diameter, star.diameter]);
        multRotationY(solar_system_time/star.day);
        drawPlanet(star);
    popMatrix();
}

// function drawPlanet(color, distance, texture = null)
function drawPlanet(planet)
{
    gl.uniformMatrix4fv(mNormalsLoc, false, flatten(normalMatrix(modelView, false)));
    gl.uniformMatrix4fv(mModelViewLoc, false, flatten(modelView));
    gl.uniform4fv(colorLoc, planet.color);
    gl.uniform1f(distanceLoc, planet.distance);
    gl.uniform1i(noTextureLoc, planet.texture == null ? 1 : 0);
    if (isFilled)
        planet.glObj.sphereDrawFilled(currentProgram, planet.texture);
    else 
        planet.glObj.sphereDrawWireFrame(currentProgram, planet.texture);
}

function drawRings(planet)
{
    planet.rings.glObj.gl.uniformMatrix4fv(mNormalsLoc, false, flatten(normalMatrix(modelView, false)));
    planet.rings.glObj.gl.uniform1i(noTextureLoc, 1);
    planet.rings.glObj.gl.uniformMatrix4fv(mModelViewLoc, false, flatten(modelView));
    planet.rings.glObj.gl.uniform4fv(colorLoc, solar_system_data.bodies.Saturn.color);
    if (isFilled)
        planet.rings.glObj.torusDrawFilled(currentProgram);
    else 
        planet.rings.glObj.torusDrawWireFrame(currentProgram);
}

function renderOverlay()
{
    document.getElementById("days").textContent = parseInt((solar_system_time/360));
    document.getElementById("months").textContent = parseInt((solar_system_time/360)/(EARTH_YEAR/12));
    document.getElementById("years").textContent = parseInt((solar_system_time/360)/EARTH_YEAR);
    
    document.getElementById("seconds_start").textContent = parseInt((execution_time/REFRESH_RATE));//(global_time/360)/EARTH_YEAR;
    document.getElementById("shading_method").textContent = currentProgram == programPhong ? "Phong" : "Gouraud";
}
