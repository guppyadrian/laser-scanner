console.log('test')

//draw time
const ctx = canv.getContext('2d');
const Cam = {x: 0, y: 0, z: 4};

const logPos = {x: 150, y: 150};

var mouseDown = false;

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




var ScannerList = [];

//here is joe the scanner
ScannerList.push(new ScanView({}));

var moveDir = 1;

function tick() {
  
  ctx.clearRect(0, 0, canv.width, canv.height);

  
  for (const scanner of ScannerList) {
    //point towards log
    scanner.dir = Math.atan2(scanner.origin.x - logPos.x, -scanner.origin.y + logPos.y) * 180 / Math.PI;

    
    
    //raycasting
    for (let i = -29; i < 29; i += 0.1) {
      let d = 0;

      //store cos/sin for optimization
      const COS = Math.cos((scanner.dir + i + 90) * Math.PI / 180);
      const SIN = Math.sin((scanner.dir + i + 90) * Math.PI / 180);

      //d = ray distance. sends out ray until hits log or length > 45
      while (d < 45) {
        if (Math.sqrt((scanner.origin.x + d * COS - logPos.x) ** 2 + (scanner.origin.y + d * SIN - logPos.y) ** 2) < 15) {
          d -= 0.1;
          break;
        }
          
        d += 0.1;
      }


      //counter fisheye
      const dx = d * (1 / Math.cos(i * Math.PI / 180));
      const dy = 15 * (1 / Math.cos(i * Math.PI / 180));

      //draw ray
      ctx.beginPath();
      ctx.moveTo((scanner.origin.x + dy * COS - Cam.x) * Cam.z, (scanner.origin.y + dy * SIN - Cam.y) * Cam.z);
      ctx.lineTo((scanner.origin.x + dx * COS - Cam.x) * Cam.z, (scanner.origin.y + dx * SIN - Cam.y) * Cam.z);
      ctx.stroke();
    }
    
  
  
    //center dot
    ctx.fillRect((scanner.origin.x - 1 - Cam.x) * Cam.z, (scanner.origin.y - 1 - Cam.y) * Cam.z, 2 * Cam.z, 2 * Cam.z);
  }


  //draw log
  ctx.beginPath();
  ctx.arc((logPos.x - Cam.x) * Cam.z, (logPos.y - Cam.y) * Cam.z, 15 * Cam.z, 0, 2 * Math.PI);
  ctx.stroke();
}

// zoom & pan handlers
addEventListener('wheel', zoom => {
  Cam.z -= zoom.deltaY * 0.001;
})
addEventListener('mousedown', event => {
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
log at 50px
zoom at 200%
log at 100px
zoom to 300%
log now at 150px

*/