if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
} else {
    var current_index = 84;
    // By default focus the region with the max totals
    var current_stat_type = "max_total"
    var colors = [0xc62828];
    var container = document.getElementById("globe-container");

    var globe;

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
    current_index = (current_index + offset + window.data["series_stats"].length) % window.data["series_stats"].length;
    change(current_index);
}

function centerLatLongWithMax() {
    // Data contains an array with:
    // [ {
    //   total: x,
    //   name: "series_name",
    //   focus: {
    //     max_total: {
    //       value: y,
    //       lat: lat,
    //       lon: lon,
    //       location: "Country, Location"
    //     }
    //   }
    // }, [<actual Values>]
    dayStats = window.data["series_stats"][current_index]
    focus_stat = "max_total"
    location_idx = dayStats[focus_stat]["location_idx"]
    lat = window.data["locations"][location_idx]["lat"]
    lon = window.data["locations"][location_idx]["lon"]
    // Add a bit of offset so that we can see the magnitude (z) axis
    // otherwise we are straight on top of the magnitude bar and it's not possible to see the height
    offset = 0.0
    globe.target.x = (Math.PI / 2) * 3 + ((Math.PI * lon) / 180) + offset;
    globe.target.y = (((Math.PI / 2) * lat) / 90) - offset;
}
function datasetColor(datasetType) {
    barColor = 0x00ff00;
    if (datasetType == "deaths") {
        barColor = 0xb71c1c;
    } else if (datasetType == "confirmed") {
        barColor = 0xe65100;
    } else {
        barColor = 0xc6ff00;
    }
    return new THREE.Color(barColor);
}
function loadDataForDay(day_index) {
    var subgeo = new THREE.Geometry();
    color = datasetColor(datasetType)
    for (i = 0; i < window.data["locations"].length; i++) {
        lat = window.data["locations"][i]["lat"];
        lon = window.data["locations"][i]["lon"];
        magnitude = window.data["locations"][i]["values"][day_index];
        if (magnitude > 0) {
            magnitude = magnitude * 200;
            globe.addPoint(lat, lon, magnitude, color, subgeo);
        }
    }
    globe.setBaseGeometry(subgeo)
}
function change(i) {
    console.log("Changing data for index:" + current_index);
    if (window.data) {
        if (i) {
            current_index = i % window.data["series_stats"].length;
        }
        dayInfo = window.data["series_stats"][current_index]
        document.getElementById("current-day").innerHTML = dayInfo["name"]
        document.getElementById("current-stats").innerHTML = dayInfo["max_total"]["value"] + " Total"
        globe.resetData();
        loadDataForDay(current_index)
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
                change();
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
