//Aliases
const Application = PIXI.Application,
  loader = PIXI.Loader.shared,
  resources = PIXI.Loader.shared.resources,
  Graphics = PIXI.Graphics,
  Container = PIXI.Container,
  Sprite = PIXI.Sprite,
  Text = PIXI.Text,
  TextStyle = PIXI.TextStyle;

const app = new Application({
  width: 960,
  height: 512,
  antialias: false,
  transparent: false,
  resolution: 1
}
);
app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";
app.renderer.autoDensity = true;
app.resizeTo = window;

document.body.appendChild(app.view);

// Main game state.
const state = {
  currentMode: play,
  tink: null,
  grid: [],
  gridWidth: 16,
  gridHeight: 16,
  tileWidth: 64,
  tileHeight: 64,
  borderSize: 1,
  colors: [0x96ceb4, 0xffeead, 0xff6f69, 0xffcc5c],
  clicks: 0,
}

// ***************Utility functions******************
function outOfBounds(x, y) {
  return (x < 0 || x >= state.gridWidth || y < 0 || y >= state.gridHeight);
}

function centerPivot(obj) {
  obj.pivot.set(obj.width / 2, obj.height / 2);
}

function centerOnScreen(obj) {
  obj.position.set((state.gridWidth*(state.tileWidth+state.borderSize)) / 2, (state.gridWidth*(state.tileWidth+state.borderSize)) / 2);
}

// ***************Graphics functions******************
function drawRectangle(x, y, width, height, color) {
  const rect = new Graphics();
  rect.beginFill(color);
  rect.drawRect(0, 0, width, height);
  rect.endFill();
  rect.x = x;
  rect.y = y;
  return rect;
}

function drawText(x, y, content) {
  txt = new Text(content, new TextStyle({ fill: "#ffffff" }));
  txt.position.set(x, y);
  return txt;
}

function drawTile(gridX, gridY, colorIndex) {
  const tile = drawRectangle(gridX*(state.tileWidth + state.borderSize), gridY*(state.tileHeight + state.borderSize), state.tileWidth, state.tileHeight, state.colors[colorIndex]);
  tile.colorIndex = colorIndex;
  tile.gridX = gridX;
  tile.gridY = gridY;
  return tile;
}

function setupGrid() {
  for (let i = 0; i < state.gridWidth; ++i) {
    state.grid.push([]);
    for (let j = 0; j < state.gridHeight; ++j){
      const colorIndex = Math.floor(Math.random() * state.colors.length),
        tile = drawTile(i, j, colorIndex);
      state.grid[i].push(tile);
      app.stage.addChild(tile);
    }
  }
}

function highlightSelection() {
  for (row of state.grid) {
    for (tile of row) {
      tile.alpha = 0.5;
    }
  }
  const x = state.pointer.x, y = state.pointer.y,
    gridX = Math.floor(x / (state.tileWidth + state.borderSize)),
    gridY = Math.floor(y / (state.tileHeight + state.borderSize));
  if(outOfBounds(gridX, gridY)){
    return;
  }
  const blob = getTileBlob(gridX, gridY);
  for (tile of blob) {
    tile.alpha = 1.0;
  }
}


// ***************Game logic functions******************
function setColor(gridX, gridY, colorIndex) {
  const oldTile = state.grid[gridX][gridY];
  const newTile = drawTile(oldTile.gridX, oldTile.gridY, colorIndex);
  oldTile.destroy();
  state.grid[gridX][gridY] = newTile;
  app.stage.addChild(newTile);
}

function getTileBlob(startX, startY) {
  const currentColorIndex = state.grid[startX][startY].colorIndex;

  for (const row of state.grid){
    for (const tile of row) {
      tile.visited = false;
    }
  }

  toVisit = [{ gridX: startX, gridY: startY }];
  blob = [];
  while (toVisit.length > 0) {
    const pos = toVisit.shift();
    if (outOfBounds(pos.gridX, pos.gridY) || state.grid[pos.gridX][pos.gridY].visited) {
      continue;
    }
    const thisTile = state.grid[pos.gridX][pos.gridY];
    thisTile.visited = true;
    if (thisTile.colorIndex === currentColorIndex) {
      blob.push(thisTile);
      toVisit.push({ gridX: thisTile.gridX - 1, gridY: thisTile.gridY });
      toVisit.push({ gridX: thisTile.gridX + 1, gridY: thisTile.gridY });
      toVisit.push({ gridX: thisTile.gridX, gridY: thisTile.gridY - 1});
      toVisit.push({ gridX: thisTile.gridX, gridY: thisTile.gridY + 1});
    }
  }
  return blob;
}

function flood(startX, startY) {
  const newColorIndex = (state.grid[startX][startY].colorIndex + 1) % state.colors.length;
  const blob = getTileBlob(startX, startY);
  for (const tile of blob) {
    setColor(tile.gridX, tile.gridY, newColorIndex);
  }
}

function checkForWin() {
  const colorIndex = state.grid[0][0].colorIndex;
  for (const row of state.grid) {
    for (const tile of row) {
      if(tile.colorIndex != colorIndex) {
        return;
      }
    }
  }
  const winText = drawText(0, 0, `You WIN! Score: ${state.clicks}\nRefresh the page to play again.`);
  centerPivot(winText);
  centerOnScreen(winText);
  winText.style.align = "center";
  app.stage.addChild(winText);
  state.currentMode = win;
  highlightSelection();
}

function handleClick() {
  if (state.currentMode != play) {
    return;
  }
  const x = state.pointer.x, y = state.pointer.y,
    gridX = Math.floor(x / (state.tileWidth + state.borderSize)),
    gridY = Math.floor(y / (state.tileHeight + state.borderSize));

  if(outOfBounds(gridX, gridY)) {
    return;
  }
  flood(gridX, gridY);
  state.clicks += 1;
  checkForWin();
}

// ***************Game Loop functions******************
function win(delta) {
  //nothing
}

function play(delta) {
  highlightSelection();
}

function gameLoop(delta) {
  // Execute a step for whatever mode we're in.
  state.currentMode(delta);
  state.tink.update();
}

function pointerSetup() {
  state.tink = new Tink(PIXI, app.renderer.view);
  state.pointer = state.tink.makePointer();
  state.pointer.press = handleClick;
}

function setup() {
  pointerSetup();
  setupGrid();
  app.ticker.add((delta) => gameLoop(delta));
}

//load an image and run the `setup` function when it's done
loader
  .load(setup);
