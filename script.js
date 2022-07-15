'use strict';

//draw time
const ctx = canv.getContext('2d');
const Cam = {x: 0, y: 0, z: 4};


var settings = {
  logSize: parseFloat(logSizeSlider.value) / 2,
  minLogSize: parseFloat(minLogSizeSlider.value) / 2,
  scannerAmount: parseInt(scannerAmountSlider.value),
  scannerGap: parseInt(scannerGapSlider.value),
  scannerGapTop: parseInt(scannerGapTopSlider.value),
  showMinLog: false
};
canv.width = window.innerWidth;
canv.height = window.innerHeight;
//log setup
const logPos = {x: canv.width / 8, y: canv.height / 8, r: settings.logSize};


var mouseDown = false;

var logAreaCovered = [];

function combineAngles(first, second) {
  if (first.length > 2 || second.length > 2)
    return [[0,0,true]];
  var uno = first;
  var dos = second;
  if (uno[0] < uno[1]) uno[1] -= 360;
  if (dos[0] < dos[1]) dos[1] -= 360;
  if (uno[0] >= (uno[1] < -180 ? dos[0] - 360 : dos[0]) && uno[1] <= (uno[1] < -180 ? dos[0] - 360 : dos[0])) {
    if (uno[0] >= dos[1] && uno[1] <= dos[1])
      return [[0, 0, true]]; 
    else 
      return [[uno[0], Math.min(uno[1] < -180 ? uno[1]+360 : uno[1], dos[1])]];
  }
  if (dos[0] >= (dos[1] < -180 ? uno[0] - 360 : uno[0]) && dos[1] <= (dos[1] < -180 ? uno[0] - 360 : uno[0])) {
    if (dos[0] >= uno[1] && dos[1] <= uno[1])
      return [[0, 0, true]]; 
    else 
      return [[dos[0], Math.min(uno[1], dos[1] < -180 ? dos[1]+360 : dos[1])]];
  }
  return [uno, dos];
}

function combineAngles2(first, second) {
  var uno = first;
  var dos = second;
  if (uno[0] < 0) uno[0] = 360 + uno[0];
  if (uno[1] < 0) uno[1] = 360 + uno[1];
  if (dos[0] < 0) dos[0] = 360 + dos[0];
  if (dos[1] < 0) dos[1] = 360 + dos[1];


  function inside(area, point) {
    if (area[1] > area[0]) {
      if (area[0] >= point || area[1] <= point)
        return true;
      return false;
    }
    if (area[0] >= point && area[1] <= point)
      return true;
    return false;
  }
  
  function check(big, small) {
    if (inside(big, small[1])) {
      if (inside(small, big[0])) {
        return [[0, 0, true]];
      }
      return [[big[0], big[1]]];
    }
    return [[big[0], small[1]]];
  }
  
  if (uno[1] > uno[0]) {
    if (uno[0] >= dos[0] || uno[1] <= dos[0]) {
      return check(uno, dos);
    }
  } else {
    if (uno[0] >= dos[0] && uno[1] <= dos[0]) {
      return check(uno, dos);
    }
  }
  
  if (dos[1] > dos[0]) {
    if (dos[0] >= uno[0] || dos[1] <= uno[0]) {
      return check(dos, uno);
    }
  } else {
    if (dos[0] >= uno[0] && dos[1] <= uno[0]) {
      return check(dos, uno);
    }
  }
  return [uno, dos];
}

function screenToWorld(x, y) {
  return [(x / Cam.z) + Cam.x, (y / Cam.z) + Cam.y];
  
}
function worldToScreen(x, y) {
  return [(x - Cam.x) * Cam.z, (y - Cam.y) * Cam.z];
}



//contains points for scanner view
class ScanView {
  constructor({origin = {x: 50, y: 50}, dir = 90}) {
    this.origin = origin;
    this.dir = dir;
  }

  //returns 4 long array of [x, y] to draw
  getPoints() {
    const COS = Math.cos(this.dir * Math.PI / 180);
    const SIN = Math.sin(this.dir * Math.PI / 180);

    const tlate = [[-0.75, -1.5],[0.75,-1.5],[0.75,1.5],[-0.75,1.5]];

    let out = [];

    for (let i = 0; i < 4; i++) {
      out.push([
        this.origin.x + (tlate[i][0]) * COS - (tlate[i][1]) * SIN, 
        this.origin.y + (tlate[i][0]) * SIN + (tlate[i][1]) * COS
      ]);
    }
    
    return out;
  }
}

function createScannerHeads() {
  for (let i = 0; i < settings.scannerAmount; i++) {

    let angle;
    switch(settings.scannerAmount) {
      case 3:
        angle = (((360 - Math.max(settings.scannerGap, 120)) / 2) * (i - 1) - 90) * Math.PI/180;
        break;
      case 4:
        const s = i > 1 ? settings.scannerGapTop : settings.scannerGap;
        const sg = (i % 2 === 0 ? -s : s);
        angle = ((180 + sg) / 2) * Math.PI/180 * (i > 1 ? -1 : 1);
        break;    
      case 5:
        angle = (((360 - settings.scannerGap) / 4) * (i - 2) - 90) * Math.PI/180; // settings.scannerGap
        break;
      case 6:
        const s2 = i > 1 ? settings.scannerGapTop : settings.scannerGap;
        const sg2 = (i % 2 === 0 ? -s2 : s2);
        if (i > 3)
          angle = (i===4 ? 0 : 180) * Math.PI/180;
        else
        angle = ((180 + sg2) / 2) * Math.PI/180 * (i > 1 ? -1 : 1);
        break;
      default:
        angle = (360 / settings.scannerAmount) * i * Math.PI/180;
        break;
    }

    let distance = logPos.r + 32;
    if (settings.scannerAmount === 2 && logPos.r > 13) {
      distance = 45;
    }
    if (settings.scannerAmount === 2 && logPos.r >= 22) {
      distance = 2 + logPos.r * 2;
    }
    if (settings.scannerAmount === 3 && logPos.r > 22) {
      distance = logPos.r + 32 - (logPos.r - 22) / 2
    }
    if (settings.scannerAmount === 3 && logPos.r > 27) {
      distance = logPos.r + 30;
    }
    
    let x = Math.cos(angle) * distance + logPos.x;
    let y = Math.sin(angle) * distance + logPos.y;

    ScannerList.push(new ScanView({origin: {x: x, y: y}}));
  }
}
function resetView() {
  Cam.x = 0;
  Cam.y = 0;
  Cam.z = 4;
}

function settingsUpdated() {
  const minL = parseFloat(minLogSizeSlider.value) / 2;
  if (settings.minLogSize !== minL) {
    settings.minLogSize = minL;
  }

  if (settings.scannerAmount == 4 || settings.scannerAmount == 6) {
    topGapDiv.style.display = '';
  } else {
    topGapDiv.style.display = 'none';
  }
  
  logPos.r = settings.logSize;
  if (ScannerList.length !== settings.scannerAmount || true) {
    ScannerList = [];
    createScannerHeads();
  } else {
    return;
    for (const head of ScannerList) {
      head.origin.x = Math.cos((head.dir - 90) * Math.PI/180) * (logPos.r + 32) + logPos.x;
      head.origin.y = Math.sin((head.dir - 90) * Math.PI/180) * (logPos.r + 32) + logPos.y;
    }
  }
}


var ScannerList = [];

//here is joe the scanners
createScannerHeads();


function DrawScreen() {
  logAreaCovered = [];
  ctx.clearRect(0, 0, canv.width, canv.height);
  var curLog = logPos;
  if (settings.showMinLog) {
    curLog = {x: logPos.x, y: (logPos.y + logPos.r) - settings.minLogSize, r: settings.minLogSize};
  }
  for (const scanner of ScannerList) {
    //point towards log
    scanner.dir = Math.atan2(scanner.origin.x - logPos.x, -scanner.origin.y + logPos.y) * 180 / Math.PI;
    const scanAngle = {start: undefined, end: undefined};
    let scannerPointList = [];

    var prevD;
    
    //raycasting
    for (let i = -29; i <= 29; i = Math.round((i+0.1) * 10) / 10) {
      let d = 0;

      //store cos/sin for optimization
      const COS = Math.cos((scanner.dir + i + 90) * Math.PI / 180);
      const SIN = Math.sin((scanner.dir + i + 90) * Math.PI / 180);
      const fancyEquation = 1 / Math.cos(i * Math.PI / 180);
      
      //d = ray distance. sends out ray until hits log or length > 45
      while (d < 45) {
        const dx = d * fancyEquation;
        if (((scanner.origin.x + dx * COS - curLog.x) ** 2 + (scanner.origin.y + dx * SIN - curLog.y) ** 2) < curLog.r ** 2) {
          //d -= 0.1;
          break;
        }
          
        d = Math.round((d + 0.1) * 10) / 10;
      }


      //counter fisheye
      const dx = d * (1 / Math.cos(i * Math.PI / 180));
      const dy = 15 * (1 / Math.cos(i * Math.PI / 180));

      if (d < 45 && !scanAngle.start) {
        scanAngle.start = Math.atan2(logPos.x - (scanner.origin.x + dx * COS), -logPos.y + (scanner.origin.y + dx * SIN)) * 180 / Math.PI;
      }
      if ((d >= 45 || i === 29) && scanAngle.start && !scanAngle.end) {
        scanAngle.end = Math.atan2(logPos.x - (scanner.origin.x + prevD * COS), -logPos.y + (scanner.origin.y + prevD * SIN)) * 180 / Math.PI;
      }
      prevD = dx;
      //add ray to drawQueue
      if (i === -29)
        scannerPointList.push(worldToScreen(scanner.origin.x + dy * COS, scanner.origin.y + dy * SIN));
      scannerPointList.push(worldToScreen(scanner.origin.x + dx * COS, scanner.origin.y + dx * SIN));
      if (i === 29) 
        scannerPointList.push(worldToScreen(scanner.origin.x + dy * COS, scanner.origin.y + dy * SIN));
      
    }

    logAreaCovered.push([scanAngle.start, scanAngle.end]);
    
    //draw the rays as a shape
    ctx.fillStyle = 'red';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(...scannerPointList[0]);
    for (const p of scannerPointList) {
      ctx.lineTo(...p);
    }
    ctx.closePath();
    ctx.fill();

    //dotted line
    ctx.beginPath();
    ctx.moveTo(...scannerPointList[0]);
    ctx.setLineDash([5, 5]);
    ctx.lineTo(...worldToScreen(scanner.origin.x, scanner.origin.y));
    ctx.lineTo(...scannerPointList.at(-1));
    ctx.stroke();
    ctx.setLineDash([]);
    
    //actual scanner
    ctx.fillStyle = 'black';
    ctx.globalAlpha = 1;
    const drawPoints = scanner.getPoints();
    
    ctx.fillStyle = "#FFD700";
    ctx.beginPath(); 
    ctx.moveTo(...worldToScreen(...drawPoints.shift()));
    for (const p of drawPoints) {
      ctx.lineTo(...worldToScreen(...p));
    }
    ctx.closePath();
    ctx.fill();
  }


  
  if (logAreaCovered.length > 1) {
    var oldLength = 0;
    var completed = false;
    
    while (oldLength !== logAreaCovered.length) {
      oldLength = logAreaCovered.length;
      var newLogArea = [];
      
      for (let st = 0; st < logAreaCovered.length - 1; st++) {
        for (let en = st+1; en < logAreaCovered.length; en++) {
          const ang = combineAngles2(logAreaCovered[st], logAreaCovered[en]);
          console.log(JSON.stringify(logAreaCovered));
          console.log('^^^ ' + st + ', ' + en);
          if (ang.length === 1) {
            logAreaCovered.splice(st, 1);
            logAreaCovered.splice(en, 1);
            console.log(`did a splice: ${logAreaCovered}`)
            en -= 2;
            en = Math.max(en, st + 1);
            newLogArea.push(...ang);
          }
          
          if (ang[0][2] === true) {
            newLogArea = [[0, 0, true]]
            completed = true;
            break;
          }
        }
        if (completed) break;
      }
      logAreaCovered = [...logAreaCovered, ...newLogArea];
      if (completed)
        break;
    }
  }

  //draw log
  ctx.strokeStyle = 'brown';
  ctx.lineWidth = Cam.z / 2;
  ctx.beginPath();
  ctx.arc((curLog.x - Cam.x) * Cam.z, (curLog.y - Cam.y) * Cam.z, curLog.r * Cam.z, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(...worldToScreen(logPos.x - 45, logPos.y + logPos.r));
  ctx.lineTo(...worldToScreen(logPos.x + 45, logPos.y + logPos.r));
  ctx.stroke();


  //measurements

  if (showMeasureCheck.checked) {
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'blue';
    ctx.fillStyle = 'blue';
    ctx.font = '16px Arial';
    /*
    ctx.beginPath();
    ctx.moveTo(...worldToScreen(logPos.x, logPos.y - logPos.r));
    ctx.lineTo(...worldToScreen(logPos.x, logPos.y + logPos.r));
    ctx.stroke();
    ctx.fillText((logPos.r * 2) + '"', ...worldToScreen(logPos.x, logPos.y));
    */
    for (const scanner of ScannerList) {
      ctx.fillStyle = 'blue';
      ctx.strokeStyle = 'blue';

      if (Math.abs(Math.round((logPos.x - scanner.origin.x) * 100) / 100) > 0) {
        ctx.beginPath();
        ctx.moveTo(...worldToScreen(scanner.origin.x, scanner.origin.y));
        ctx.lineTo(...worldToScreen(logPos.x, scanner.origin.y));
        ctx.stroke();
        ctx.fillText(Math.abs(Math.round((logPos.x - scanner.origin.x) * 100) / 100) + '"', ...worldToScreen(scanner.origin.x + (logPos.x - scanner.origin.x) / 2, scanner.origin.y));
      }
      ctx.strokeStyle = 'green';
      ctx.beginPath();
      ctx.moveTo(...worldToScreen(logPos.x, scanner.origin.y));
      ctx.lineTo(...worldToScreen(logPos.x, logPos.y + logPos.r));
      ctx.stroke();
      ctx.lineWidth = Cam.z / 2;
      if (Math.abs(Math.round((scanner.origin.y - (logPos.y + logPos.r)) * 100) / 100) > 0) {
        ctx.beginPath();
        ctx.moveTo(...worldToScreen(logPos.x - 1, logPos.y + logPos.r));
        ctx.lineTo(...worldToScreen(logPos.x + 1, logPos.y + logPos.r));
        ctx.stroke();
      }
      if (Math.abs(Math.round((logPos.x - scanner.origin.x) * 100) / 100) > 0) {
        ctx.strokeStyle = 'blue';
        ctx.beginPath();
        ctx.moveTo(...worldToScreen(logPos.x, scanner.origin.y - 1));
        ctx.lineTo(...worldToScreen(logPos.x, scanner.origin.y + 1));
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      if (Math.abs(Math.round((scanner.origin.y - (logPos.y + logPos.r)) * 100) / 100)) {
        ctx.fillStyle = 'green';
        ctx.fillText(Math.abs(Math.round((scanner.origin.y - (logPos.y + logPos.r)) * 100) / 100) + '"', ...worldToScreen(logPos.x + 1, scanner.origin.y + ((logPos.y + logPos.r) - scanner.origin.y) / 2));
      }
      ctx.beginPath();
      if (scanner.dir < 0) {
        ctx.arc(...worldToScreen(scanner.origin.x, scanner.origin.y), 2 * Cam.z, 0, (scanner.dir + 90) * Math.PI / 180, Math.abs(scanner.dir) > 90 ? true : false);
      } else {
        ctx.arc(...worldToScreen(scanner.origin.x, scanner.origin.y), 2 * Cam.z, 180 * Math.PI / 180, (scanner.dir + 90) * Math.PI / 180, Math.abs(scanner.dir) > 90 ? false : true);
      }
      ctx.stroke();
      ctx.fillText(Math.round(Math.abs(Math.abs(scanner.dir) - 90) * 100) / 100 + "°", ...worldToScreen(scanner.origin.x, scanner.origin.y));   
    }
  }
}

function tick() {
  canv.width = window.innerWidth;
  canv.height = window.innerHeight;
  

  
  {
    var minL = parseFloat(minLogSizeSlider.value) / 2;
    
    if (settings.logSize !== parseFloat(logSizeSlider.value) / 2) {
      settings.logSize = parseFloat(logSizeSlider.value) / 2;
      if (settings.logSize < minL) {
        minL = settings.logSize * 2;
        minLogSizeSlider.value = minL;
      }
      logSizeNumber.value = logSizeSlider.value;
      //settingsUpdated();
    }
    if (settings.scannerAmount !== parseInt(scannerAmountSlider.value)) {
      settings.scannerAmount = parseInt(scannerAmountSlider.value);
      scannerAmountNumber.value = scannerAmountSlider.value
      //settingsUpdated();
    }
    if (settings.scannerGap !== parseInt(scannerGapSlider.value)) {
      settings.scannerGap = parseInt(scannerGapSlider.value);
      scannerGapNumber.value = scannerGapSlider.value;
      //settingsUpdated();
    }
    if (settings.scannerGapTop !== parseInt(scannerGapTopSlider.value)) {
      settings.scannerGapTop = parseInt(scannerGapTopSlider.value);
      scannerGapTopNumber.value = scannerGapTopSlider.value;
      //settingsUpdated();
    }
    
    if (settings.logSize < minL) {
      minL = settings.logSize * 2;
      minLogSizeSlider.value = minL;
    }
    minLogSizeNumber.value = minLogSizeSlider.value;

    settings.showMinLog = showMinCheck.checked;

    

    if (genLoopCheck.checked)
      settingsUpdated();
  }
  
  
    DrawScreen();



  
}




// zoom & pan handlers
canv.addEventListener('wheel', zoom => {

  //cx = -(screenX / camZ) + worldX
  const mouseWorld = screenToWorld(zoom.clientX, zoom.clientY);
  
  Cam.z *= 1 + 0.1 * -Math.sign(zoom.deltaY)  //zoom.deltaY * 0.001;
  Cam.z = Math.max(0.1, Cam.z);
  Cam.x = -(zoom.clientX / Cam.z) + mouseWorld[0];
  Cam.y = -(zoom.clientY / Cam.z) + mouseWorld[1];
})
canv.addEventListener('mousedown', event => {
  let selObj = false;
  for (const s in ScannerList) {
    const scanner = ScannerList[s];
    if (
      Math.abs(event.clientX - (scanner.origin.x - Cam.x) * Cam.z) < 10 &&
       Math.abs(event.clientY - (scanner.origin.y - Cam.y) * Cam.z) < 10
    ) {
      selObj = s;
      break;
    }
  }
  mouseDown = {x: event.clientX, y: event.clientY, selObj: selObj};
});
addEventListener('mousemove', event => {
  if (mouseDown === false) return;
  if (mouseDown.selObj !== false) {
    ScannerList[mouseDown.selObj].origin.x += (event.clientX - mouseDown.x) / Cam.z;
    ScannerList[mouseDown.selObj].origin.y += (event.clientY - mouseDown.y) / Cam.z;
  } else {
    Cam.x -= (event.clientX - mouseDown.x) / Cam.z;
    Cam.y -= (event.clientY - mouseDown.y) / Cam.z;
  }
  mouseDown = {x: event.clientX, y: event.clientY, selObj: mouseDown.selObj};
});
addEventListener('mouseup', event => {
  mouseDown = false;
})
addEventListener('keydown', key => {
  switch(key.key) {
    case 'c':
      ScannerList.push(new ScanView({}));
      break;
    case 'b':
      tick();
      break;
  }
});

settingsUpdated();
setInterval(tick, 15);




/*
settings:

- scanner #
- log min/max size
- log offset
- 

*/

/*
 size: 200px
log at 100px
zoom in 50%
log at 150px
move camera 50px

size 200px
log at 50px
zoom to 200%
log at 100px
move camera 50px

size 200px
log at 150px
camX at 50px
zoom to 200%
log now viewed 200px
camX - 100

size 200px
mouse at 50px
log at 50px
zoom at 200%
log at 100px
zoom to 300%
log now at 150px

mouse at world:50 screen:150
point at world:25 screen:60
camX at 0
camZ at 3

change camZ by 1
mouse at world:50 screen: 200
point at world:25 screen: 80
camX = 27.5




s = (wx - cx) * cz

135 = (50 - cx) * 4
135 / 4 = 50 - cx
(135 / 4) - 50 = cx
cx = -(135 / 4) + 50

cx = -(screenX / camZ) + worldX


((camX + world) * change) / Cam.z

*/