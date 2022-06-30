//draw time
const ctx = canv.getContext('2d');
const Cam = {x: 0, y: 0, z: 4};


var settings = {
  logSize: parseFloat(logSizeSlider.value) / 2,
  scannerAmount: parseInt(scannerAmountSlider.value)
};

//log setup
const logPos = {x: 150, y: 150, r: settings.logSize};


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

    const tlate = [[-7.5, 14],[7.5,14],[25,45],[-25,45]];

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
        angle = (((360 - (60 - logPos.r) / 2) / settings.scannerAmount) * (i - 1) - 90) * Math.PI/180;
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
    
    const x = Math.cos(angle) * (logPos.r + 32) + logPos.x;
    const y = Math.sin(angle) * (logPos.r + 32) + logPos.y;
    
    ScannerList.push(new ScanView({origin: {x: x, y: y}}));
  }
}


function settingsUpdated() {
  logPos.r = settings.logSize;
  if (ScannerList.length !== settings.scannerAmount) {
    ScannerList = [];
    createScannerHeads();
  } else {
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
  canv.width = window.innerWidth
  ctx.clearRect(0, 0, canv.width, canv.height);

  if (settings.logSize !== parseFloat(logSizeSlider.value) / 2) {
    settings.logSize = parseFloat(logSizeSlider.value) / 2;
    logSizeNumber.value = logSizeSlider.value;
    settingsUpdated();
  }
  if (settings.scannerAmount !== parseInt(scannerAmountSlider.value)) {
    settings.scannerAmount = parseInt(scannerAmountSlider.value);
    scannerAmountNumber.value = scannerAmountSlider.value
    settingsUpdated();
  }
  


  
  for (const scanner of ScannerList) {
    //point towards log
    scanner.dir = Math.atan2(scanner.origin.x - logPos.x, -scanner.origin.y + logPos.y) * 180 / Math.PI;

    
    
    //raycasting
    for (let i = -29; i < 29; i += 0.1) {
      let d = 0;

      //store cos/sin for optimization
      const COS = Math.cos((scanner.dir + i + 90) * Math.PI / 180);
      const SIN = Math.sin((scanner.dir + i + 90) * Math.PI / 180);
      const fancyEquation = 1 / Math.cos(i * Math.PI / 180);
      
      //d = ray distance. sends out ray until hits log or length > 45
      while (d < 45) {
        const dx = d * fancyEquation;
        if (((scanner.origin.x + dx * COS - logPos.x) ** 2 + (scanner.origin.y + dx * SIN - logPos.y) ** 2) < logPos.r ** 2) {
          //d -= 0.1;
          break;
        }
          
        d += 0.1;
      }


      //counter fisheye
      const dx = d * (1 / Math.cos(i * Math.PI / 180));
      const dy = 15 * (1 / Math.cos(i * Math.PI / 180));

      //draw ray
      ctx.strokeStyle = 'black';
      ctx.beginPath();
      ctx.moveTo(...worldToScreen(scanner.origin.x + dy * COS, scanner.origin.y + dy * SIN));
      ctx.lineTo(...worldToScreen(scanner.origin.x + dx * COS, scanner.origin.y + dx * SIN));
      ctx.stroke();
    }
    
  
  
    //center dot
    ctx.fillRect(...worldToScreen(scanner.origin.x - 1, scanner.origin.y - 1), 2 * Cam.z, 2 * Cam.z);
  }


  //draw log
  ctx.strokeStyle = 'brown';
  ctx.beginPath();
  ctx.arc((logPos.x - Cam.x) * Cam.z, (logPos.y - Cam.y) * Cam.z, logPos.r * Cam.z, 0, 2 * Math.PI);
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
      Math.abs(event.clientX - (scanner.origin.x - Cam.x) * Cam.z) < 5 &&
       Math.abs(event.clientY - (scanner.origin.y - Cam.y) * Cam.z) < 5
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