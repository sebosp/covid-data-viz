if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
} else {
    var current_index = 0;
    // By default focus the region with the max totals
    var current_stat_type = "max_total"
    var colors = [0xc62828];
    // TODO: this is not sync'ed properly, i.e. if there are different dates in death/confirmed, then this runs ouf ot sync.
    var days = [
        "20-01-22",
        "20-01-23",
        "20-01-24",
        "20-01-25",
        "20-01-26",
        "20-01-27",
        "20-01-28",
        "20-01-29",
        "20-01-30",
        "20-01-31",
        "20-02-01",
        "20-02-02",
        "20-02-03",
        "20-02-04",
        "20-02-05",
        "20-02-06",
        "20-02-07",
        "20-02-08",
        "20-02-09",
        "20-02-10",
        "20-02-11",
        "20-02-12",
        "20-02-13",
        "20-02-14",
        "20-02-15",
        "20-02-16",
        "20-02-17",
        "20-02-18",
        "20-02-19",
        "20-02-20",
        "20-02-21",
        "20-02-22",
        "20-02-23",
        "20-02-24",
        "20-02-25",
        "20-02-26",
        "20-02-27",
        "20-02-28",
        "20-02-29",
        "20-03-01",
        "20-03-02",
        "20-03-03",
        "20-03-04",
        "20-03-05",
        "20-03-06",
        "20-03-07",
        "20-03-08",
        "20-03-09",
        "20-03-10",
        "20-03-11",
        "20-03-12",
        "20-03-13",
        "20-03-14",
        "20-03-15",
        "20-03-16",
        "20-03-17",
        "20-03-18",
        "20-03-19",
        "20-03-20",
        "20-03-21",
        "20-03-22",
        "20-03-23",
        "20-03-24",
        "20-03-25",
        "20-03-26",
        "20-03-27",
        "20-03-28",
        "20-03-29",
        "20-03-30",
        "20-03-31",
        "20-04-01",
        "20-04-02",
        "20-04-03",
        "20-04-04",
        "20-04-05",
        "20-04-06",
        "20-04-07",
        "20-04-08",
        "20-04-09",
        "20-04-10",
        "20-04-11",
    ];
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
    current_index = (current_index + offset + window.data.length) % window.data.length;
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
    dayInfo = data[current_index][0];
    lat = dayInfo["focus"]["max_total"]["lat"]
    lon = dayInfo["focus"]["max_total"]["lon"]
    // Add a bit of offset so that we can see the magnitude (z) axis
    // otherwise we are straight on top of the magnitude bar and it's not possible to see the height
    offset = 0.1
    globe.target.x = (Math.PI / 2) * 3 + ((Math.PI * lon) / 180) + offset;
    globe.target.y = (((Math.PI / 2) * lat) / 90) - offset;
}
function change(i) {
    console.log("Changing data for index:" + current_index);
    if (window.data) {
        if (i) {
            current_index = i % window.data.length;
        }
        dayInfo = window.data[current_index][0]
        document.getElementById("current-day").innerHTML = dayInfo["name"]
        document.getElementById("current-stats").innerHTML = dayInfo["focus"]["max_total"]["value"] + " Total"
        globe.resetData();
        globe.addData(window.data[current_index][1], {format: "magnitude", datasetType: datasetType});
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
    globe = new DAT.Globe(container, function (x) {
        barColor = 0x00ff00;
        if (x == "deaths") {
            barColor = 0xb71c1c;
        } else if (x == "confirmed") {
            barColor = 0xe65100;
        } else {
            barColor = 0xc6ff00;
        }
        return new THREE.Color(barColor);
    });
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
