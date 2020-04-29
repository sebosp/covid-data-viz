if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
} else {
    var current_day_index = 84;
    var current_focused_location = 0;
    // By default focus the region with the top cummulative value
    var current_stat_index = 0;
    var stats_config = [
        {
            "type": "top_cumulative",
            "legend": "Cumulative Cases",
            "icon": "present_to_all",
            "min_value_fn": function () {return 0},
            "max_value_fn": function () {return window.data["series_stats"][current_day_index]["top_cumulative"]["value"]},
            "data_fn": function (d) {return d[0]},
            "color_fn": function (d) {return datasetColor(d)}
        },
        {
            "type": "top_day",
            "legend": "Daily Cases",
            "icon": "today",
            "min_value_fn": function () {return 0},
            "max_value_fn": function () {return window.data["series_stats"][current_day_index]["top_day"]["value"]},
            "data_fn": function (d) {return d[1]},
            "color_fn": function (d) {return datasetColor(d)}
        },
        {
            "type": "top_delta",
            "legend": "Trend In Cases",
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
    var autofocus = true;
    var colors = [0xc62828];
    var container = document.getElementById("globe-container");

    var chartMargin = ({top: 20, right: 20, bottom: 25, left: 50})
    var globe;

    // Add a bit of offset so that we can see the magnitude (z) axis when we use the automatic globe positioning
    // otherwise we are straight on top of the magnitude bar and it's not possible to see the height
    var target_offset = 0.0

    document.addEventListener('DOMContentLoaded', function () {
        var elems = document.querySelectorAll('.datepicker');
        var instances = M.Datepicker.init(elems,
            {
                minDate: new Date("2020-01-22"),
                maxDate: new Date("2020-04-02"),
                onSelect: changeDataFromDatePicker,
                autoClose: true,
            })
    });
    var datasetType = "confirmed"
    changeDataSet();
}

function toggleAutoFocus() {
    autofocus = !autofocus;
    document.getElementById("autofocus").innerHTML = autofocus ? "center_focus_strong" : "center_focus_weak";
    if (autofocus) {
        updateDisplays()
    }
}

function toggleStatType() {
    current_stat_index = (current_stat_index + 1) % stats_config.length;
    document.getElementById("stat_type").innerHTML = stats_config[current_stat_index]["icon"];
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
    current_day_index = (current_day_index + offset + window.data["series_stats"].length) % window.data["series_stats"].length;
    updateDisplays();
}

function translateGlobeTargetToLatLng() {
    return {
        lat: ((globe.target.y + target_offset) * 90) / (Math.PI / 2),
        lng: ((globe.target.x - target_offset - ((Math.PI / 2) * 3)) * 180) / Math.PI,
    }
}

function translateLatLngToGlobeTarget(lat, lng) {
    // Translates from Latitude,Longitude to the coordinates of the globe camera
    return {
        x: (Math.PI / 2) * 3 + ((Math.PI * lng) / 180) + target_offset,
        y: (((Math.PI / 2) * lat) / 90) - target_offset,
    }
}

function updateCountryD3Graph() {
    console.log("Updating Coutry D3 Graph: ", current_focused_location);
    var myNode = document.getElementById("region-graph");
    while (myNode.firstChild) {
        myNode.removeChild(myNode.firstChild);
    }
    // In index.html, the size of the focus-container should match this
    var chartWidth = window.innerWidth * 0.25;
    // Reduce the size of the chart by 4%, give some space for the title
    var chartHeight = window.innerHeight * 0.28;
    d3_data = Array()
    columns = window.data["series_stats"].map(d => d.name);
    chartTitle = stats_config[current_stat_index]["legend"]
    d3_data = {
        y: chartTitle,
        series: [
            {
                name: window.data["locations"][current_focused_location]["location"],
                values: window.data["locations"][current_focused_location]["values"].map(
                    stats_config[current_stat_index]["data_fn"]
                ),
            }
        ],
        dates: columns.map(d3.utcParse("%y-%m-%d"))
    };
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
        .call(d3.axisLeft(yScale))
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
    console.log("Creating SVG");
    const svg = d3.select("#region-graph")
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
        .attr("stroke", "#" + datasetColor().getHexString())
        .attr("stroke-chartWidth", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .selectAll("path")
        .data(d3_data.series)
        .join("path")
        .style("mix-blend-mode", "multiply")
        .attr("d", d => line(d.values));

    dayInfo = window.data["series_stats"][current_day_index]
    cutoffDate = d3.utcParse("%y-%m-%d")(dayInfo["name"])
    svg.append("line")
        .style("stroke", "white")
        .style("stroke-dasharray", "2px")
        .style("stroke-opacity", "0.5")
        .attr("x1", xScale(cutoffDate))
        .attr("x2", xScale(cutoffDate))
        .attr("y1", yScale.range()[0])
        .attr("y2", yScale.range()[1] + yScale.range()[1] / 10);
    stat_type = stats_config[current_stat_index]["type"]
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
    // }]}
    dayStats = window.data["series_stats"][current_day_index]
    if (autofocus) {
        current_focused_location = dayStats[stats_config[current_stat_index]["type"]]["location_idx"]
    }
    lat = window.data["locations"][current_focused_location]["lat"]
    lon = window.data["locations"][current_focused_location]["lon"]
    location_name = window.data["locations"][current_focused_location]["location"]
    stat_value = stats_config[current_stat_index]["data_fn"](window.data["locations"][current_focused_location]["values"][current_day_index])
    stat_legend = stats_config[current_stat_index]["legend"]
    stat_type = stats_config[current_stat_index]["type"]
    if (stat_type == "top_delta") {
        if (stat_value > 0) {
            icon = 'trending_up'
            if (datasetType == "recovered") {
                // More recovered = green
                stat_value = '<i class="material-icons light-green accent-3">' + icon + '</i> ' + stat_value;
            } else {
                stat_value = '<i class="material-icons red accent-4">' + icon + '</i>' + stat_value;
            }
        } else if (stat_value == 0) {
            icon = 'trending_flat'
            stat_value = '<i class="material-icons grey">' + icon + '</i> ' + stat_value;
        } else {
            icon = 'trending_down'
            if (datasetType == "recovered") {
                // Less recovered = red
                stat_value = '<i class="material-icons red accent-4">' + icon + '</i>' + stat_value;
            } else {
                stat_value = '<i class="material-icons light-green accent-3">' + icon + '</i> ' + stat_value;
            }
        }
    }
    document.getElementById("focus-region").innerHTML = location_name + ' [' + stat_value + '] ' + stat_legend
    updateCountryD3Graph();
    globe_center_x_y = translateLatLngToGlobeTarget(lat, lon);
    globe.target.x = globe_center_x_y.x;
    globe.target.y = globe_center_x_y.y;

}

function datasetColor(value) {
    stat_type = stats_config[current_stat_index]["type"]
    switch (datasetType) {
        case "deaths": if (stat_type == "top_delta" && value < 1) {
            // Less daily deaths = green
            return new THREE.Color(0xc6ff00);
        } else {
            return new THREE.Color(0xb71c1c);
        }
        case "confirmed": if (stat_type == "top_delta" && value < 1) {
            // Less daily confirmed = green
            return new THREE.Color(0xc6ff00);
        } else {
            return new THREE.Color(0xe65100);
        }
        // Default would hit recovered, if we have no daily increase of recovered I'm not sure we should paint the line red...
        default: return new THREE.Color(0xc6ff00);
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
        magnitude = day_value / focus_stat_max_value;
        if (magnitude > 1) {
            console.log(focus_stat_max_value, dayStats, focus_stat_max_value, magnitude);
        }
        if (magnitude > 0) {
            magnitude = magnitude * 200;
            globe.addPoint(lat, lon, magnitude, color, subgeo);
        }
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
        document.getElementById("current-day").innerHTML = dayStats["name"]
        if (autofocus) {
            current_focused_location = dayStats[stats_config[current_stat_index]["type"]]["location_idx"]
        }
        stat_legend = stats_config[current_stat_index]["legend"]
        stat_value = stats_config[current_stat_index]["data_fn"](window.data["locations"][current_focused_location]["values"][current_day_index])
        document.getElementById("current-stats").innerHTML = stat_value + ' ' + stat_legend
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
    animate();
    TWEEN.start();
    xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function (e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                window.data = JSON.parse(xhr.responseText);
                document.body.style.backgroundImage = "none"; // remove loading
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
