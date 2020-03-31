if (!Detector.webgl) {
  Detector.addGetWebGLMessage();
} else {
  var current_index = 0;
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
  ];
  var container = document.getElementById("container");
  //Disabling old automatic colour choosing system
  //var globe = new DAT.Globe(container);
  //var globe = new DAT.Globe(container, function(x){
  //return new THREE.Color(0xc62828);
  //});

  var globe;

  //console.log(globe);

  loadData("data/confirmed.json");
}

function clearData() {
  var myNode = document.getElementById("container");
  while (myNode.firstChild) {
    myNode.removeChild(myNode.firstChild);
  }
}

function change(i) {
  console.log("Changing data for index:" + current_index);
  if (window.data) {
    if (i) {
      current_index = i;
    } else {
      current_index = (current_index + 1) % window.data.length;
    }
    document.getElementById("current-day").innerHTML =
      window.data[current_index][0];
    globe.resetData();
    globe.addData(window.data[current_index][1], { format: "magnitude" });
    globe.createPoints();
    globe.animate();
    //var y = document.getElementById(days[current_index]);
    //if (y.getAttribute('class') === 'day active') {
    //return;
    //}
    //var yy = document.getElementsByClassName('day');
    //for(var j=0; j<yy.length; j++) {
    //yy[j].setAttribute('class','day');
    //}
    //y.setAttribute('class', 'day active');
  }
}

function loadData(url) {
  document.body.style.backgroundImage = "url('images/loading.gif')";
  clearData();

  var xhr;
  xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = function (e) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        window.data = JSON.parse(xhr.responseText);

        globe = new DAT.Globe(container, function (x) {
          return new THREE.Color(0xc62828);
        });
        globe.addData(window.data[0][1], { format: "magnitude" });

        /*for(var i = 0; i<days.length; i++) {
        var y = document.getElementById(days[i]);
        y.addEventListener('click', function(){change(i)}, false);
    y.setAttribute('class','day');
    console.log("add click " +i);
      }*/

        //document.getElementById(days[0]).setAttribute('class', 'day active');

        /*
     TWEEN.start();
      
       
            for (i=0;i<data.length;i++) {
              globe.addData(data[i][1],{format: 'magnitude', name: data[i][0], animated: true});
            }
      */
        globe.createPoints();
        //settime(globe,0)();
        //globe.time= 0;
        globe.animate();
        document.body.style.backgroundImage = "none"; // remove loading
        window.setInterval(function () {
          change();
        }, 3000);
      }
    }
  };
  xhr.send(null);
}
