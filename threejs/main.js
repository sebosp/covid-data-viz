if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
} else {
    var current_day_index = 0;
    var prev_foculed_location = -1;
    var current_focused_location = 0;
    // By default focus the region with the top cummulative value
    var current_stat_index = 0;
    var prev_stat_index = -1;
    var RADIAN = 180 / Math.PI;
    var stats_config = [
        {
            "type": "top_cumulative",
            "series_stats_key": "cumulative_global",
            "legend": "Cases",
            "icon": "present_to_all",
            "min_value_fn": function () {
                return Math.min(...window.data["locations"][current_focused_location]["values"].map(d => d[0]))
            },
            "max_value_fn": function () {return window.data["series_stats"][current_day_index]["top_cumulative"]["value"]},
            "data_fn": function (d) {return d[0]},
            "color_fn": function (d) {return datasetColor(d)}
        },
        {
            "type": "top_day",
            "series_stats_key": "day_global",
            "legend": "Cases",
            "icon": "today",
            "min_value_fn": function () {
                return Math.min(...window.data["locations"][current_focused_location]["values"].map(d => d[1]))
            },
            "max_value_fn": function () {return window.data["series_stats"][current_day_index]["top_day"]["value"]},
            "data_fn": function (d) {return d[1]},
            "color_fn": function (d) {return datasetColor(d)}
        },
        {
            "type": "top_delta",
            "series_stats_key": "delta_global",
            "legend": "Cases",
            "icon": "change_history",
            // The trend can be negative, so we need to find the minimum value
            "min_value_fn": function () {
                return Math.min(...window.data["locations"][current_focused_location]["values"].map(d => d[2]))
            },
            "max_value_fn": function () {return window.data["series_stats"][current_day_index]["top_delta"]["value"]},
            "data_fn": function (d) {return d[2]},
            "color_fn": function (d) {return datasetColor(d)}
        }
    ]
    // Colors picked from https://materializecss.com/color.html
    var color_scheme = {
        'lime accent-3': 0xc6ff00,
        'teal lighten-4': 0xb2dfdb,
        'red darken-4': 0xb71c1c,
        'orange darken-4': 0xe65100,
    };
    var autofocus = true;
    var container = document.getElementById("globe-container");

    // D3 nhart Related variables
    var svg;
    var chartMargin = ({top: 0, right: 20, bottom: 25, left: 30})
    var chartColumns = Array()
    var d3_data = Array()

    var globe;

    document.addEventListener('DOMContentLoaded', function () {
        M.Datepicker.init(document.querySelectorAll('.datepicker'),
            {
                minDate: new Date("2020-01-22"),
                maxDate: new Date("2020-04-02"),
                onSelect: changeDataFromDatePicker,
                autoClose: true,
            })
        M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'), {autoTrigger: false});
    });
    var datasetType = "confirmed"
    changeDataSet();
}

function findClosestRegion(target_lat, target_lng, threshold = 5) {
    // Returns the closest registered region given an input lat, lng and
    // an optional threshold in degrees.
    // The threshold is used so that we do not show a region when the focus is,
    // for example, in the middle of the ocean
    console.log("findClosestRegion to lat: ", target_lat, "lng: ", target_lng);
    countrieInThreshold = Array();
    matchingLocations = window.data["locations"].map(function (_loc, idx) {
        lat_distance = Math.abs(target_lat - window.data["locations"][idx]["lat"])
        lng_distance = Math.abs(target_lng - window.data["locations"][idx]["lon"])
        if (lat_distance < threshold && lng_distance < threshold * 2) {
            // Here, let's imagine there is no curvature/height, because otherwise we need a real solution for lat/lng distance.
            target_idx_lat_rad = target_lat / RADIAN
            target_idx_lng_rad = target_lng / RADIAN
            current_idx_lat_rad = window.data["locations"][idx]["lat"] / RADIAN
            current_idx_lng_rad = window.data["locations"][idx]["lon"] / RADIAN
            delta_lat_rad = current_idx_lat_rad - target_idx_lat_rad
            delta_lng_rad = current_idx_lng_rad - target_idx_lng_rad
            // Haversine:
            rad_distance = 2 * Math.asin(Math.sqrt(Math.sin(delta_lat_rad / 2) ** 2 + Math.cos(target_idx_lat_rad) * Math.cos(current_idx_lat_rad) * Math.sin(delta_lng_rad / 2) ** 2))
            // This rad_distance could be translated to kilometers, mulitplied by 6371 (radios of earth), but this is unnecessary.
            return {"idx": idx, "matches": true, "rad_distance": rad_distance};
        } else {
            return {"idx": idx, "matches": false}
        }
    });
    matchingLocations = matchingLocations.filter(loc => loc.matches);
    console.log("Locations within threshold: ", matchingLocations);
    if (matchingLocations.length == 0) {
        return null
    }
    closest_idx = matchingLocations.reduce((acc, val) => acc["rad_distance"] > val["rad_distance"] ? val : acc);
    console.log("Closest idx: ", closest_idx["idx"]);
    return closest_idx["idx"]
}

function onMouseUp(_event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    container.removeEventListener('touchmove', onMouseMove, false);
    container.removeEventListener('touchend', onMouseUp, false);
    container.removeEventListener('touchcancel', onMouseOut, false);
    container.style.cursor = 'auto';
    current_coords = translateGlobeTargetToLatLng()
    closest_region = findClosestRegion(current_coords.lat, current_coords.lng);
    if (closest_region != null) {
        current_focused_location = closest_region
        if (autofocus) {
            autofocus = false;
            document.getElementById("autofocus").innerHTML = "center_focus_weak";
        }
        updateDisplays();
    }
}

function onMouseMove(event) {
    mouse_coords = {};
    if (event.type == "touchmove") {
        mouse_coords.x = - event.changedTouches[0].clientX;
        mouse_coords.y = event.changedTouches[0].clientY;
    } else {
        mouse_coords.x = - event.clientX;
        mouse_coords.y = event.clientY;
    }
    globe.onMouseMove(mouse_coords);
}

function onMouseOut(_event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    container.removeEventListener('touchmove', onMouseMove, false);
    container.removeEventListener('touchend', onMouseUp, false);
    container.removeEventListener('touchcancel', onMouseOut, false);
}

function onMouseDown(event) {
    event.preventDefault();

    container.addEventListener('mousemove', onMouseMove, false);
    container.addEventListener('mouseup', onMouseUp, false);
    container.addEventListener('mouseout', onMouseOut, false);
    container.addEventListener('touchmove', onMouseMove, false);
    container.addEventListener('touchend', onMouseUp, false);
    container.addEventListener('touchcancel', onMouseOut, false);

    mouse_coords = {};
    if (event.type == "touchstart") {
        mouse_coords.x = - event.changedTouches[0].clientX;
        mouse_coords.y = event.changedTouches[0].clientY;
    } else {
        mouse_coords.x = - event.clientX;
        mouse_coords.y = event.clientY;
    }
    globe.onMouseDown(mouse_coords);
    container.style.cursor = 'move';
}

// Debounce a function
function debounce(func, time) {
    var time = time || 100; // 100 by default if no param
    var timer;
    return function (event) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(func, time, event);
    };
}

function onWindowResize(_event) {
    globe.onWindowResize();
    // Force the update to take place on the Region chart
    // We are debouncing the event, waiting .5 seconds to redraw to avoid
    // performance costs or drawing every resize event
    debounce(updateCountryD3Graph(true), 500);
}

function addEventListeners() {
    container.addEventListener('touchstart', onMouseDown, false);
    container.addEventListener('mousedown', onMouseDown, false);
    container.addEventListener('wheel', globe.onMouseWheel, false);
    document.addEventListener('keydown', globe.onDocumentKeyDown, false);
    window.addEventListener('resize', onWindowResize, false);

    container.addEventListener('mouseover', function () {
        globe.overRenderer = true;
    }, false);

    container.addEventListener('mouseout', function () {
        globe.overRenderer = false;
    }, false);
}

function toggleAutoFocus() {
    autofocus = !autofocus;
    document.getElementById("autofocus").innerHTML = autofocus ? "center_focus_strong" : "center_focus_weak";
    if (autofocus) {
        updateDisplays()
    }
}

function changeAggregateType() {
    select = document.getElementById("aggregateSelection")
    current_stat_index = select.options[select.selectedIndex].value
    updateDisplays()
}

function changeDataFromDatePicker(newDate) {
    console.log("changeDataFromDatePicker")
    console.log(newDate)

}

function clearData() {
    var myNode = document.getElementById("globe-container");
    while (myNode.firstChild) {
        myNode.removeChild(myNode.firstChild);
    }
}

function incrementDayBy(offset) {
    document.getElementById("decrementDay").removeAttribute("onclick");
    document.getElementById("incrementDay").removeAttribute("onclick");
    current_day_index = (current_day_index + offset + window.data["series_stats"].length) % window.data["series_stats"].length;
    updateDisplays();
    document.getElementById("decrementDay").setAttribute("onclick", "incrementDayBy(-1)");
    document.getElementById("incrementDay").setAttribute("onclick", "incrementDayBy(1)");
}

function translateGlobeTargetToLatLng(target_offset = 0.0) {
    // The offset allows to appreciate a bit the magnitude (z axis) , otherwise the globe is centered on
    // a point on top of the z axis (magnitude) and so the value is not appreciable.
    return {
        lat: ((globe.target.y + target_offset) * 90) / (Math.PI / 2),
        lng: ((globe.target.x - target_offset - ((Math.PI / 2) * 3)) * 180) / Math.PI,
    }
}

function translateLatLngToGlobeTarget(lat, lng, target_offset = 0.0) {
    // Translates from Latitude,Longitude to the coordinates of the globe camera
    // The offset allows to appreciate a bit the magnitude (z axis) , otherwise the globe is centered on
    // a point on top of the z axis (magnitude) and so the value is not appreciable.
    return {
        x: (Math.PI / 2) * 3 + ((Math.PI * lng) / 180) + target_offset,
        y: (((Math.PI / 2) * lat) / 90) - target_offset,
    }
}

function updateCountryD3Graph(force = false) {
    if (prev_foculed_location != current_focused_location || current_stat_index != prev_stat_index || force) {
        var myNode = document.getElementById("region-graph");
        while (myNode.firstChild) {
            myNode.removeChild(myNode.firstChild);
        }
        d3_data = {
            y: stats_config[current_stat_index]["legend"],
            series: [
                {
                    name: window.data["locations"][current_focused_location]["location"],
                    values: window.data["locations"][current_focused_location]["values"].map(
                        stats_config[current_stat_index]["data_fn"]
                    ),
                }
            ],
            dates: chartColumns.map(d3.utcParse("%y-%m-%d"))
        };
        // In index.html, the size of the focus-container should match this
        var chartWidth = window.innerWidth * 0.25;
        // Reduce the size of the chart by 4%, give some space for the title
        var chartHeight = window.innerHeight * 0.28;
        xScale = d3.scaleUtc()
            .domain(d3.extent(d3_data.dates))
            .range([chartMargin.left, chartWidth - chartMargin.right])
        yScale = d3.scaleLinear()
            .domain([
                stats_config[current_stat_index]["min_value_fn"](),
                d3.max(d3_data.series, d => d3.max(d.values)) // Maybe use max_value_fn
            ]).nice()
            .range([chartHeight - chartMargin.bottom, chartMargin.top])
        xAxis = g => g
            .attr("transform", `translate(0,${chartHeight - chartMargin.bottom})`)
            .call(d3.axisBottom(xScale).ticks(chartWidth / 80).tickSizeOuter(0))
        yAxis = g => g
            .attr("transform", `translate(${chartMargin.left},0)`)
            .call(d3.axisLeft(yScale).tickFormat(d3.format(".2s")))
            .call(g => g.select(".domain").remove())
            .call(g => g.select(".tick:last-of-type text").clone()
                .attr("x", 3)
                .attr("text-anchor", "start")
                .attr("font-weight", "bold")
                .text(d3_data.y))
        line = d3.line()
            .defined(d => !isNaN(d))
            .x((_d, i) => xScale(d3_data.dates[i]))
            .y(d => yScale(d));
        svg = d3.select("#region-graph")
            .append("div")
            // Container class to make it responsive.
            .classed("svg-container", true)
            .append("svg")
            // Responsive SVG needs these 2 attributes and no width and height attr.
            //.attr("viewBox", "0 0 600 400")
            // Class to make it responsive.
            .classed("svg-content-responsive", true)
            // Fill with a rectangle for visualization.
            .attr("viewBox", [0, 0, chartWidth, chartHeight])
            .attr("preserveAspectRatio", "xMinYMin meet")
            .style("overflow", "visible");

        svg.append("g")
            .call(xAxis);

        svg.append("g")
            .call(yAxis);

        svg.append("g")
            .attr("fill", "none")
            .attr("stroke", "#" + datasetColor(1).getHexString())
            .attr("stroke-chartWidth", 1.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .selectAll("path")
            .data(d3_data.series)
            .join("path")
            .style("mix-blend-mode", "multiply")
            .attr("d", d => line(d.values));

        if (stat_type == "top_delta") {
            svg.append("line")
                .style("stroke", "white")
                .style("stroke-dasharray", "2px")
                .style("stroke-opacity", "0.5")
                .attr("x1", xScale.range()[0])
                .attr("x2", xScale.range()[1])
                .attr("y1", yScale(0))
                .attr("y2", yScale(0))
        }
    }
    if (document.getElementById("cutoffDate") != null) {
        document.getElementById("cutoffDate").remove();
    }
    dayInfo = window.data["series_stats"][current_day_index]
    cutoffDate = d3.utcParse("%y-%m-%d")(dayInfo["name"])
    svg.append("line")
        .style("stroke", "white")
        .style("stroke-dasharray", "2px")
        .style("stroke-opacity", "0.5")
        .attr("x1", xScale(cutoffDate))
        .attr("x2", xScale(cutoffDate))
        .attr("y1", yScale.range()[0])
        .attr("y2", yScale.range()[1] + yScale.range()[1] / 10)
        .attr("id", "cutoffDate");
    stat_type = stats_config[current_stat_index]["type"]
    prev_foculed_location = current_focused_location
    prev_stat_index = current_stat_index

}

function centerGlobeToLocation(current_focused_location) {
    if (window.data["locations"][current_focused_location]["x"] == null) {
        // Cache the globe coordinates for the coordinates, no point in
        // calculating this over and over
        lat = window.data["locations"][current_focused_location]["lat"]
        lng = window.data["locations"][current_focused_location]["lon"]
        globe_center_x_y = translateLatLngToGlobeTarget(lat, lng);
        window.data["locations"][current_focused_location]["x"] = globe_center_x_y.x;
        window.data["locations"][current_focused_location]["y"] = globe_center_x_y.y;
    }
    globe.target.x = window.data["locations"][current_focused_location]["x"];
    globe.target.y = window.data["locations"][current_focused_location]["y"];
}

function centerLatLongWithMax() {
    // {"locations": [{
    //     "lat": 10,
    //     "lon": 4.9,
    //     "location": "China - Hubei",
    //     "values": [
    //         [ 0,  0,  0], <cumulative>, <day_increment>, <day_increment_delta>
    //         [ 25, 25, 25],
    //         [ 30, 5,  -20],
    //     ]
    //     }]
    // },
    // "series_stats": [{
    //     "name": "20-01-22",
    //     "top_cumulative": {
    //         "location_idx": 0,
    //         "value": 444
    //     },
    //     "top_day": {
    //         "location_idx": 0,
    //         "value": 444
    //     },
    //     "delta": {
    //         "top": {
    //             "location_idx": 0,
    //             "value": 444
    //         },
    //         "min": {
    //             "location_idx": 0,
    //             "value": 444
    //         },
    //     },
    //     "total": 555
    // }]
    dayStats = window.data["series_stats"][current_day_index]
    if (autofocus) {
        current_focused_location = dayStats[stats_config[current_stat_index]["type"]]["location_idx"]
    }
    location_name = window.data["locations"][current_focused_location]["location"]
    stat_value = stats_config[current_stat_index]["data_fn"](window.data["locations"][current_focused_location]["values"][current_day_index])
    // Let's format the number to look like X,YYY
    stat_type = stats_config[current_stat_index]["type"]
    formatted_stat_value = d3.format(",")(stat_value)
    if (stat_type == "top_delta") {
        if (stat_value > 0) {
            icon = 'trending_up'
            if (datasetType == "recovered") {
                // More recovered = green
                stat_value = '<i class="material-icons light-green accent-3">' + icon + '</i> ' + formatted_stat_value;
            } else {
                stat_value = '<i class="material-icons red accent-4">' + icon + '</i>' + formatted_stat_value;
            }
        } else if (stat_value == 0) {
            icon = 'trending_flat'
            stat_value = '<i class="material-icons grey">' + icon + '</i> ' + formatted_stat_value;
        } else {
            icon = 'trending_down'
            if (datasetType == "recovered") {
                // Less recovered = red
                stat_value = '<i class="material-icons red accent-4">' + icon + '</i>' + formatted_stat_value;
            } else {
                stat_value = '<i class="material-icons light-green accent-3">' + icon + '</i> ' + formatted_stat_value;
            }
        }
    }
    document.getElementById("focus-region").innerHTML = location_name + ' [' + formatted_stat_value + '] '
    updateCountryD3Graph();
    centerGlobeToLocation(current_focused_location);
}

function datasetColor(value) {
    stat_type = stats_config[current_stat_index]["type"]
    // Let's set a default in case we just want to know the "default" color
    switch (datasetType) {
        case "deaths":
            if (stat_type == "top_delta" || stat_type == "top_day") {
                if (value < 0) {
                    // Less daily deaths
                    return new THREE.Color(color_scheme["lime accent-3"]);
                } else if (value == 0) {
                    // Zero daily deaths
                    return new THREE.Color(color_scheme["teal lighten-4"]);
                } else {
                    // Increase of deaths
                    return new THREE.Color(color_scheme["red darken-4"]);
                }
            } else {
                // Cumulative deaths
                return new THREE.Color(color_scheme["red darken-4"]);
            }
        case "confirmed":
            if (stat_type == "top_delta" || stat_type == "top_day") {
                if (value < 0) {
                    // Less daily confirmed
                    return new THREE.Color(color_scheme["lime accent-3"]);
                } else if (value == 0) {
                    // Zero daily confirmed
                    return new THREE.Color(color_scheme["teal lighten-4"]);
                } else {
                    // Daily increase of infection
                    return new THREE.Color(color_scheme["orange darken-4"]);
                }
            } else {
                if (value > 0) {
                    return new THREE.Color(color_scheme["orange darken-4"]);
                } else {
                    // Zero or negative confirmed cummulative
                    return null;
                }
            }
        // Default would hit recovered, if we have no daily increase of recovered I'm not sure we should paint the line red...
        default: return new THREE.Color(color_scheme["lime accent-3"]);
    }
}

function loadGlobeDataForDay() {
    console.log("loadGlobeDataForDay" + current_day_index);
    var subgeo = new THREE.Geometry();
    // By default, let's show the color based on the dataset type
    focus_stat_max_value = stats_config[current_stat_index]["max_value_fn"]();
    for (location_idx = 0; location_idx < window.data["locations"].length; location_idx++) {
        // A 4th item in the values array could be for hiding a value (not drawing), to avoid counting several times
        if (window.data["locations"][location_idx]["values"][current_day_index].length > 3) {
            continue;
        }
        lat = window.data["locations"][location_idx]["lat"];
        lon = window.data["locations"][location_idx]["lon"];
        dayStats = window.data["series_stats"][current_day_index];
        day_value = stats_config[current_stat_index]["data_fn"](window.data["locations"][location_idx]["values"][current_day_index])
        color = stats_config[current_stat_index]["color_fn"](day_value)
        if (color == null) {
            continue;
        }
        magnitude = day_value / focus_stat_max_value;
        if (magnitude == 0) {
            // Let's create a fake magnitude.
            // The color_fn will show a different color so we can see 0 entries that day
            // for a location
            magnitude = 0.001; // Let's create a fake magnitude
        }
        if (magnitude < 0) {
            magnitude *= -1;
        }
        magnitude = magnitude * 200;
        globe.addPoint(lat, lon, magnitude, color, subgeo);
    }
    globe.setBaseGeometry(subgeo)
}

function updateDisplays(day_index) {
    console.log("updateDisplays for index:" + current_day_index);
    if (window.data) {
        if (day_index) {
            current_day_index = day_index % window.data["series_stats"].length;
        }
        dayStats = window.data["series_stats"][current_day_index];
        formattedDayName = dayStats["name"].replace(/[0-9]*-([0-9]*)-([0-9]*)/, "$2/$1")
        document.getElementById("current-day").innerHTML = formattedDayName
        if (autofocus) {
            current_focused_location = dayStats[stats_config[current_stat_index]["type"]]["location_idx"]
        }
        global_stat_legend = stats_config[current_stat_index]["legend"]
        global_stat_value = d3.format(".2s")(dayStats[stats_config[current_stat_index]["series_stats_key"]])
        document.getElementById("current-stats").innerHTML = global_stat_value + ' ' + global_stat_legend
        globe.resetData();
        loadGlobeDataForDay()
        globe.createPoints();
        centerLatLongWithMax();
    }
}

function animate() {
    requestAnimationFrame(animate);
    globe.render();
}
function loadData(url) {
    document.body.style.backgroundImage = "url('images/loading.gif')";
    clearData();
    var xhr;
    globe = new DAT.Globe(container, datasetColor);
    addEventListeners();
    animate();
    TWEEN.start();
    xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function (_e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                window.data = JSON.parse(xhr.responseText);
                chartColumns = window.data["series_stats"].map(d => d.name);
                document.body.style.backgroundImage = "none"; // remove loading
                // Focus the last day statistics
                current_day_index = window.data["series_stats"].length - 1;
                updateDisplays();
            }
        }
    };
    xhr.send(null);
}
function changeDataSet() {
    select = document.getElementById("datasetSelection")
    datasetType = select.options[select.selectedIndex].value
    loadData('data/' + datasetType + '.json');
}
