/**
 * dat.globe Javascript WebGL Globe Toolkit
 * http://dataarts.github.com/dat.globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Modified by Cathal Mc Daid /@mcdaidc
 */

var DAT = DAT || {};

DAT.Globe = function (container, colorFn) {

    colorFn = colorFn || function (x) {
        var c = new THREE.Color();
        c.setHSL((0.6 - (x * 0.5)), 1.0, 0.5);
        return c;
    };

    var Shaders = {
        'earth': {
            uniforms: {
                'texture': {type: 't', value: null}
            },
            vertexShader: [
                'varying vec3 vNormal;',
                'varying vec2 vUv;',
                'void main() {',
                'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
                'vNormal = normalize( normalMatrix * normal );',
                'vUv = uv;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform sampler2D texture;',
                'varying vec3 vNormal;',
                'varying vec2 vUv;',
                'void main() {',
                'vec3 diffuse = texture2D( texture, vUv ).xyz;',
                'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
                'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
                'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
                '}'
            ].join('\n')
        },
        'atmosphere': {
            uniforms: {},
            vertexShader: [
                'varying vec3 vNormal;',
                'void main() {',
                'vNormal = normalize( normalMatrix * normal );',
                'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vNormal;',
                'void main() {',
                'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
                'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
                '}'
            ].join('\n')
        }
    };

    var camera, scene, renderer, w, h;
    var mesh, atmosphere, point;

    var overRenderer;

    var imgDir = 'images/';

    var curZoomSpeed = 0;
    var zoomSpeed = 50;

    var mouse = {x: 0, y: 0}, mouseOnDown = {x: 0, y: 0};
    var rotation = {x: 0, y: 0},
        target = {x: 0.0, y: 0.0},
        targetOnDown = {x: 0, y: 0};

    var distance = 100000, distanceTarget = 100000;
    var padding = 40;
    var PI_HALF = Math.PI / 2;

    function init() {

        container.style.color = '#fff';
        container.style.font = '13px/20px Arial, sans-serif';

        var shader, uniforms, material;
        w = container.offsetWidth || window.innerWidth;
        h = container.offsetHeight || window.innerHeight;

        camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);
        camera.position.z = distance;

        scene = new THREE.Scene();

        var geometry = new THREE.SphereGeometry(200, 40, 30);

        shader = Shaders['earth'];
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);

        uniforms['texture'].value = THREE.ImageUtils.loadTexture(imgDir + 'world_green.jpg');


        material = new THREE.ShaderMaterial({

            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader

        });

        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = Math.PI;
        scene.add(mesh);

        shader = Shaders['atmosphere'];
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);

        material = new THREE.ShaderMaterial({

            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true

        });

        mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(1.1, 1.1, 1.1);
        scene.add(mesh);

        geometry = new THREE.CubeGeometry(0.75, 0.75, 1);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.5));

        point = new THREE.Mesh(geometry);


        //SPACE


        var urls = [imgDir + 'stars.jpg', imgDir + 'stars.jpg',
        imgDir + 'stars.jpg', imgDir + 'stars.jpg',
        imgDir + 'stars.jpg', imgDir + 'stars.jpg'];
        var textureCube = THREE.ImageUtils.loadTextureCube(urls);
        var shader = THREE.ShaderLib["cube"];
        //var shader = THREE.ShaderUtils.lib["cube"];
        var uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms['tCube'].texture = textureCube; // textureCube has been init before
        var material = new THREE.ShaderMaterial({
            fragmentShader: shader.fragmentShader,
            vertexShader: shader.vertexShader,
            uniforms: uniforms
        }); // build the skybox Mesh
        skyboxMesh = new THREE.Mesh(new THREE.CubeGeometry(10000, 10000, 10000, 1, 1, 1, null, true), material);
        // add it to the scene

        // scene.add( skyboxMesh ); 








        renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setSize(w, h);

        renderer.domElement.style.position = 'absolute';
        container.target = target;
        container.targetOnDown = targetOnDown;
    }
    this.addEventListeners = function () {

        container.appendChild(renderer.domElement);

        container.addEventListener('mousedown', this.onMouseDown, false);

        container.addEventListener('mousewheel', this.onMouseWheel, false);

        document.addEventListener('keydown', this.onDocumentKeyDown, false);

        window.addEventListener('resize', this.onWindowResize, false);

        container.addEventListener('mouseover', function () {
            overRenderer = true;
        }, false);

        container.addEventListener('mouseout', function () {
            overRenderer = false;
        }, false);
    }

    this.addData = function (data, opts) {
        var lat, lng, size, color, i, step, colorFnWrapper;

        opts.animated = opts.animated || false;
        this.is_animated = opts.animated;
        opts.format = opts.format || 'magnitude'; // other option is 'legend'
        if (opts.format === 'magnitude') {
            step = 3;
            colorFnWrapper = function (datasetType) {return colorFn(datasetType);}
        } else if (opts.format === 'legend') {
            step = 4;
            colorFnWrapper = function (data, i) {return colorFn(data[i + 3]);}
        } else {
            throw ('error: format not supported: ' + opts.format);
        }

        if (opts.animated) {
            if (this._baseGeometry === undefined) {
                this._baseGeometry = new THREE.Geometry();
                for (i = 0; i < data.length; i += step) {
                    lat = data[i];
                    lng = data[i + 1];
                    //        size = data[i + 2];
                    color = colorFnWrapper(opts.datasetType);
                    size = 0;
                    this.addPoint(lat, lng, size, color, this._baseGeometry);
                }
            }
            if (this._morphTargetId === undefined) {
                this._morphTargetId = 0;
            } else {
                this._morphTargetId += 1;
            }
            opts.name = opts.name || 'morphTarget' + this._morphTargetId;
        }
        var subgeo = new THREE.Geometry();
        for (i = 0; i < data.length; i += step) {
            lat = data[i];
            lng = data[i + 1];
            color = colorFnWrapper(opts.datasetType);
            size = data[i + 2];
            if (size > 0) {
                size = size * 200;
                this.addPoint(lat, lng, size, color, subgeo);
            }
        }
        if (opts.animated) {
            this._baseGeometry.morphTargets.push({'name': opts.name, vertices: subgeo.vertices});
        } else {
            this._baseGeometry = subgeo;
        }

    };

    this.createPoints = function () {
        if (this._baseGeometry !== undefined) {
            if (this.is_animated === false) {
                this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    vertexColors: THREE.FaceColors,
                    morphTargets: false
                }));
            } else {
                if (this._baseGeometry.morphTargets.length < 8) {
                    console.log('t l', this._baseGeometry.morphTargets.length);
                    var padding = 8 - this._baseGeometry.morphTargets.length;
                    console.log('padding', padding);
                    for (var i = 0; i <= padding; i++) {
                        console.log('padding', i);
                        this._baseGeometry.morphTargets.push({'name': 'morphPadding' + i, vertices: this._baseGeometry.vertices});
                    }
                }
                this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    vertexColors: THREE.FaceColors,
                    morphTargets: true
                }));
            }
            scene.add(this.points);
        }
    }

    this.translateLatLngToXYZ = function (lat, lng) {
        var phi = (90 - lat) * Math.PI / 180;
        var theta = (180 - lng) * Math.PI / 180;

        return {
            x: 200 * Math.sin(phi) * Math.cos(theta),
            y: 200 * Math.cos(phi),
            z: 200 * Math.sin(phi) * Math.sin(theta),
        }
    }
    this.addPoint = function (lat, lng, size, color, subgeo) {
        pointPosition = this.translateLatLngToXYZ(lat, lng);
        point.position.x = pointPosition.x;
        point.position.y = pointPosition.y;
        point.position.z = pointPosition.z;

        point.lookAt(mesh.position);

        point.scale.z = Math.max(size, 0.1); // avoid non-invertible matrix
        point.updateMatrix();

        for (var i = 0; i < point.geometry.faces.length; i++) {

            point.geometry.faces[i].color = color;

        }

        THREE.GeometryUtils.merge(subgeo, point);
    }

    this.onMouseDown = function (event) {
        event.preventDefault();

        container.addEventListener('mousemove', globe.onMouseMove, false);
        container.addEventListener('mouseup', globe.onMouseUp, false);
        container.addEventListener('mouseout', globe.onMouseOut, false);

        mouseOnDown.x = - event.clientX;
        mouseOnDown.y = event.clientY;

        this.targetOnDown.x = this.target.x;
        this.targetOnDown.y = this.target.y;

        container.style.cursor = 'move';
    }

    this.onMouseMove = function (event) {
        mouse.x = - event.clientX;
        mouse.y = event.clientY;

        var zoomDamp = distance / 1000;

        this.target.x = this.targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
        this.target.y = this.targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

        this.target.y = this.target.y > PI_HALF ? PI_HALF : this.target.y;
        this.target.y = this.target.y < - PI_HALF ? - PI_HALF : this.target.y;
    }

    this.onMouseUp = function (_event) {
        container.removeEventListener('mousemove', globe.onMouseMove, false);
        container.removeEventListener('mouseup', globe.onMouseUp, false);
        container.removeEventListener('mouseout', globe.onMouseOut, false);
        container.style.cursor = 'auto';
    }

    this.onMouseOut = function (_event) {
        container.removeEventListener('mousemove', globe.onMouseMove, false);
        container.removeEventListener('mouseup', globe.onMouseUp, false);
        container.removeEventListener('mouseout', globe.onMouseOut, false);
    }

    this.onMouseWheel = function (event) {
        event.preventDefault();
        if (overRenderer) {
            zoom(event.wheelDeltaY * 0.3);
        }
        return false;
    }

    this.onDocumentKeyDown = function (event) {
        switch (event.keyCode) {
            case 38:
                zoom(100);
                event.preventDefault();
                break;
            case 40:
                zoom(-100);
                event.preventDefault();
                break;
        }
    }

    this.onWindowResize = function (_event) {
        globe.camera.aspect = window.innerWidth / window.innerHeight;
        globe.camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    this.zoom = function (delta) {
        distanceTarget -= delta;
        distanceTarget = distanceTarget > 1000 ? 1000 : distanceTarget;
        distanceTarget = distanceTarget < 350 ? 350 : distanceTarget;
    }


    this.render = function () {
        this.zoom(curZoomSpeed);

        this.rotation.x += (this.target.x - this.rotation.x) * 0.1;
        this.rotation.y += (this.target.y - this.rotation.y) * 0.1;
        distance += (distanceTarget - distance) * 0.3;

        this.camera.position.x = distance * Math.sin(this.rotation.x) * Math.cos(this.rotation.y);
        this.camera.position.y = distance * Math.sin(this.rotation.y);
        this.camera.position.z = distance * Math.cos(this.rotation.x) * Math.cos(this.rotation.y);

        this.camera.lookAt(mesh.position);
        //console.log("render(): camera.position: ", camera.position);

        renderer.render(scene, this.camera);
    }

    init();
    this.target = target;
    this.camera = camera;
    this.rotation = rotation;
    this.addEventListeners();
    this.animate = animate;


    this.__defineGetter__('time', function () {
        return this._time || 0;
    });

    this.__defineSetter__('time', function (t) {
        var validMorphs = [];
        var morphDict = this.points.morphTargetDictionary;
        for (var k in morphDict) {
            if (k.indexOf('morphPadding') < 0) {
                validMorphs.push(morphDict[k]);
            }
        }
        validMorphs.sort();
        var l = validMorphs.length - 1;
        var scaledt = t * l + 1;
        var index = Math.floor(scaledt);
        for (i = 0; i < validMorphs.length; i++) {
            this.points.morphTargetInfluences[validMorphs[i]] = 0;
        }
        var lastIndex = index - 1;
        var leftover = scaledt - index;
        if (lastIndex >= 0) {
            this.points.morphTargetInfluences[lastIndex] = 1 - leftover;
        }
        this.points.morphTargetInfluences[index] = leftover;
        this._time = t;
    });

    //workaround for three.js bug
    function removeObject(scene, object) {
        var o, ol, zobject;
        if (object instanceof THREE.Mesh) {
            for (o = scene.__webglObjects.length - 1; o >= 0; o--) {
                zobject = scene.__webglObjects[o].object;
                if (object == zobject) {
                    scene.__webglObjects.splice(o, 1);
                    //zobject.deallocate();
                    return;
                }
            }
        }
    }
    this.resetData = function () {
        if (this.points !== undefined) {
            this.scene.remove(this.points);
            removeObject(this.scene, this.points);
            removeObject(this.scene, this.points);
            //obj.deallocate();
        }
    }

    this.renderer = renderer;
    this.scene = scene;

    return this;

};

