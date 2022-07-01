//draw time
const ctx = canv.getContext('2d');
const Cam = {x: 0, y: 0, z: 4};


var settings = {
  logSize: parseFloat(logSizeSlider.value) / 2,
  minLogSize: parseFloat(minLogSizeSlider.value) / 2,
  scannerAmount: parseInt(scannerAmountSlider.value),
  showMinLog: false
};
canv.width = window.innerWidth;
canv.height = window.innerHeight;
//log setup
const logPos = {x: canv.width / 8, y: canv.height / 8, r: settings.logSize};


var mouseDown = false;



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
        angle = (((360 - (45 - logPos.r)) / settings.scannerAmount) * (i - 1) - 90) * Math.PI/180;
        break;
      case 4:
        angle = ((360 / settings.scannerAmount) * i + 45) * Math.PI/180;
        break;
      case 5:
        angle = ((360 / settings.scannerAmount) * i - 90) * Math.PI/180;
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

function tick() {
  canv.width = window.innerWidth;
  ctx.clearRect(0, 0, canv.width, canv.height);

  var curLog = logPos;
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
    
    if (settings.logSize < minL) {
      minL = settings.logSize * 2;
      minLogSizeSlider.value = minL;
    }
    minLogSizeNumber.value = minLogSizeSlider.value;

    settings.showMinLog = showMinCheck.checked;

    if (settings.showMinLog) {
      curLog = {x: logPos.x, y: (logPos.y + logPos.r) - settings.minLogSize, r: settings.minLogSize};
    }
  }
  
  
  
  for (const scanner of ScannerList) {
    //point towards log
    scanner.dir = Math.atan2(scanner.origin.x - logPos.x, -scanner.origin.y + logPos.y) * 180 / Math.PI;

    let scannerPointList = [];
    
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
          
        d += 0.1;
      }


      //counter fisheye
      const dx = d * (1 / Math.cos(i * Math.PI / 180));
      const dy = 15 * (1 / Math.cos(i * Math.PI / 180));

      //add ray to drawQueue
      if (i === -29)
        scannerPointList.push(worldToScreen(scanner.origin.x + dy * COS, scanner.origin.y + dy * SIN));
      scannerPointList.push(worldToScreen(scanner.origin.x + dx * COS, scanner.origin.y + dx * SIN));
      if (i === 29) 
        scannerPointList.push(worldToScreen(scanner.origin.x + dy * COS, scanner.origin.y + dy * SIN));
      
    }

    //draw the rays as a shape
    ctx.fillStyle = 'red';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(...scannerPointList.shift());
    for (p of scannerPointList) {
      ctx.lineTo(...p);
    }
    ctx.closePath();
    ctx.fill();
  
    //actual scanner
    ctx.fillStyle = 'black';
    ctx.globalAlpha = 1;
    //ctx.fillRect(...worldToScreen(scanner.origin.x - 20, scanner.origin.y - 3), 40 * Cam.z, 6 * Cam.z);

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
  }
});
setInterval(tick, 25);




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