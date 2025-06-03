// script.js – Minecraft Floorplan Creator Logic with Layer Manager
// Updated 6/3
const canvas = document.getElementById("floorCanvas");
const ctx = canvas.getContext("2d");
const hoverCoords = document.getElementById("hoverCoords");
const exportBtn = document.getElementById("exportBtn");
const blockPalette = document.getElementById("blockPalette");
const blockCountsDiv = document.getElementById("blockCounts");
const widthInput = document.getElementById("widthInput");
const heightInput = document.getElementById("heightInput");
const updateGridBtn = document.getElementById("updateGrid");
const resetGridBtn = document.getElementById("resetGrid");
const clearGridBtn = document.getElementById("clearGrid");
const floorNumber = document.getElementById("floorNumber");
const addFloorBtn = document.getElementById("addFloor");
const deleteFloorBtn = document.getElementById("deleteFloor");


let tileSize = 32;
let currentBlock = "stone";
let blockImages = {};
let isMouseDown = false;
let isRightClick = false;

let floors = [];            // Each element is a 2D array: floors[floorIndex][y][x]
let floorVisibility = [];   // Boolean array: visibility per floor
let floorNames = [];        // String array: name per floor
let currentFloor = 0;
let gridWidth = parseInt(widthInput.value);
let gridHeight = parseInt(heightInput.value);
let hoverX = -1;
let hoverY = -1;
let undoStack = [];
let redoStack = [];



const blockCategories = {
  "Core": ["stone", "cobblestone", "sandstone", "bricks", "glass", "wool", "dirt"],
  "Wool Variants": ["Orange_Wool", "Blue_Wool", "Pink_Wool", "Red_Wool", "Brown_Wool", "Black_Wool"],
  "Wood & Planks": ["oak_log", "oak_planks", "birch_log", "birch_plank", "spruce_log", "spruce_planks", "acacia_log", "acacia_planks"],
  "Valuable": ["block_of_iron", "block_of_gold", "block_of_emerald", "block_of_diamond"],
  "Functional": ["crafting_table", "enchanting_table", "jukebox", "chest", "off_furnace", "beacon", "bed"],
  "Ground Cover": ["farmland", "podzol", "sand", "red_sand", "mud_bricks", "mycelium", "moss_block"],
  "Decorative": ["mossy_cobblestone", "glowstone", "ice", "white_glazed_terracotta", "bookshelf"],
  "Misc": ["basal"] 
};

function normalize(name) {
  return name.replaceAll("_", " ").replace(/\b\w/g, l => l.toUpperCase());
}

// ----------------------------------------------------------
// Hi-DPI / Retina handling (draw crisp 1-px lines everywhere)
const DPR = window.devicePixelRatio || 1;

/**
 * Give the canvas a CSS size (visible size) and a larger
 * internal bitmap (CSS-size × DPR), then scale the context
 * so that drawing code can keep using normal "CSS pixels".
 */
function setupCanvasForHiDPI(cssWidth, cssHeight) {
  // set the visible size
  canvas.style.width  = cssWidth  + "px";
  canvas.style.height = cssHeight + "px";

  // set the bitmap size (what ctx actually draws into)
  canvas.width  = cssWidth  * DPR;
  canvas.height = cssHeight * DPR;

  // reset any prior transforms and scale once
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(DPR, DPR);
}

// 1. Populate the block‐palette and preload images
const blockFilter = document.getElementById("blockFilter");

Object.keys(blockCategories).forEach(category => {
  const opt = document.createElement("option");
  opt.value = category;
  opt.textContent = category;
  blockFilter.appendChild(opt);
});

function renderPalette(category = "All") {
  blockPalette.innerHTML = "";

  const blocks = (category === "All")
    ? Object.values(blockCategories).flat()
    : blockCategories[category];

  blocks.forEach(name => {
    const img = document.createElement("img");
    img.src = `assets/${name}.png`;
    img.alt = normalize(name);
    img.classList.add("block-tile");
    img.dataset.block = name;
    blockPalette.appendChild(img);

    const tileImg = new Image();
    tileImg.src = img.src;
    blockImages[name] = tileImg;

    img.addEventListener("click", () => {
      currentBlock = name;
      document.querySelectorAll(".block-tile").forEach(t => t.classList.remove("selected"));
      img.classList.add("selected");
      document.getElementById("currentBlock").textContent = normalize(currentBlock);
    });
  });
}

blockFilter.addEventListener("change", () => {
  renderPalette(blockFilter.value);
});


function createEmptyGrid(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(""));
}

function initGrid(w, h) {
  gridWidth  = w;
  gridHeight = h;

  // 32 CSS px per tile → size on screen
  const cssW = w * tileSize;
  const cssH = h * tileSize;
  setupCanvasForHiDPI(cssW, cssH);   // <— NEW

  if (!floors[currentFloor]) {
    floors[currentFloor] = createEmptyGrid(w, h);
  }
  drawGrid();
  updateBlockCounts();
}

function pushUndo() {
  undoStack.push(structuredClone({
    floors,
    floorNames,
    floorVisibility,
    currentFloor
  }));
  if (undoStack.length > 20) undoStack.shift();
  redoStack = [];
}



function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  floors.forEach((grid, i) => {
    if (!floorVisibility[i]) return;

    // 1. Draw blocks (if any)
    ctx.globalAlpha = i === currentFloor ? 1 : 0.3;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const block = grid[y][x];
        if (block && blockImages[block]) {
          ctx.drawImage(
            blockImages[block],
            x * tileSize,
            y * tileSize,
            tileSize,
            tileSize
          );
        }
      }
    }

    // 2. Overlay crisp 1-px grid only for the ACTIVE floor
    if (i === currentFloor) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.beginPath();

      // vertical lines
      for (let x = 0; x <= gridWidth; x++) {
        const px = x * tileSize + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, gridHeight * tileSize);
      }

      // horizontal lines
      for (let y = 0; y <= gridHeight; y++) {
        const py = y * tileSize + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(gridWidth * tileSize, py);
      }

      ctx.stroke();
    }
  });

  ctx.globalAlpha = 1;

  // 🔴 Translucent hover highlight for active floor
  if (
    hoverX >= 0 &&
    hoverY >= 0 &&
    currentFloor >= 0 &&
    hoverX < gridWidth &&
    hoverY < gridHeight
  ) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
    ctx.fillRect(hoverX * tileSize, hoverY * tileSize, tileSize, tileSize);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(hoverX * tileSize, hoverY * tileSize, tileSize, tileSize);
  }
}


function placeBlock(e, isErase = false) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);
  if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
    floors[currentFloor][y][x] = isErase ? "" : currentBlock;
    drawGrid();
    updateBlockCounts();
  }
}

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);

  if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
    hoverX = x;
    hoverY = y;
    hoverCoords.textContent = `${x}, ${y}`;

    if (isMouseDown) {
      placeBlock(e, isRightClick);
    }

    drawGrid(); // ⬅️ Redraw the grid to show hover outline
  }
});


canvas.addEventListener("mousedown", (e) => {
  pushUndo();
  isMouseDown = true;
  isRightClick = (e.button === 2);
  placeBlock(e, isRightClick);
});
canvas.addEventListener("mouseup", () => { isMouseDown = false; });
canvas.addEventListener("mouseleave", () => { isMouseDown = false; });
canvas.addEventListener("contextmenu", e => e.preventDefault());

// 3. Resize the active floor (copying its previous contents)
updateGridBtn.addEventListener("click", () => {
  const newW = parseInt(widthInput.value);
  const newH = parseInt(heightInput.value);
  if (newW % 2 === 0 && newH % 2 === 0) {
    const newGrid = createEmptyGrid(newW, newH);
    for (let y = 0; y < Math.min(gridHeight, newH); y++) {
      for (let x = 0; x < Math.min(gridWidth, newW); x++) {
        newGrid[y][x] = floors[currentFloor][y][x];
      }
    }
    floors[currentFloor] = newGrid;
    initGrid(newW, newH);
  } else {
    alert("Please enter even values for width and height.");
  }
});

// 4. Fill the entire active floor with the selected block
resetGridBtn.addEventListener("click", () => {
  floors[currentFloor] = Array.from({ length: gridHeight }, () =>
    Array.from({ length: gridWidth }, () => currentBlock)
  );
  drawGrid();
  updateBlockCounts();
});

// 5. Clear the entire active floor to empty
clearGridBtn.addEventListener("click", () => {
  floors[currentFloor] = createEmptyGrid(gridWidth, gridHeight);
  drawGrid();
  updateBlockCounts();
});

function updateFloorLabel() {
  floorNumber.textContent = currentFloor + 1;
}

function addFloor() {
  currentFloor = floors.length;
  floors[currentFloor] = createEmptyGrid(gridWidth, gridHeight);
  floorVisibility[currentFloor] = true;
  floorNames[currentFloor] = `Floor ${currentFloor + 1}`;
  updateFloorLabel();
  setupCanvasForHiDPI(gridWidth * tileSize, gridHeight * tileSize);
  drawGrid();
  updateBlockCounts();
  updateLayerManager();
}
addFloorBtn.addEventListener("click", addFloor);

deleteFloorBtn.addEventListener("click", () => {
  if (floors.length <= 1) {
    alert("You must have at least one floor.");
    return;
  }

  // Remove current floor
  floors.splice(currentFloor, 1);
  floorVisibility.splice(currentFloor, 1);
  floorNames.splice(currentFloor, 1);

  // Adjust current floor index
  currentFloor = Math.max(0, currentFloor - 1);
  updateFloorLabel();
  setupCanvasForHiDPI(gridWidth * tileSize, gridHeight * tileSize);
  drawGrid();
  updateBlockCounts();
  updateLayerManager();
});


function updateBlockCounts() {
  const count = {};

  floors.forEach((grid, i) => {
    if (!floorVisibility[i]) return;

    for (let row of grid) {
      for (let block of row) {
        if (!block) continue;
        count[block] = (count[block] || 0) + 1;
      }
    }
  });

  blockCountsDiv.innerHTML = Object.entries(count)
    .map(([b, n]) => `${normalize(b)}: ${n}`)
    .join("<br>");
}


function updateLayerManager() {
  const container = document.getElementById("layerManager");
  container.innerHTML = "";

  floors.forEach((_, i) => {
    const floorName = floorNames[i] || `Floor ${i + 1}`;

    // Visibility checkbox
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = floorVisibility[i];
    toggle.addEventListener("change", () => {
      floorVisibility[i] = toggle.checked;
      drawGrid();
    });

    // Editable name field
    const nameInput = document.createElement("div");
    nameInput.contentEditable = true;
    nameInput.textContent = floorName;
    nameInput.style.border = i === currentFloor ? "1px solid #000" : "1px solid transparent";
    nameInput.style.minWidth = "60px";
    nameInput.style.padding = "2px";
    nameInput.addEventListener("input", () => {
      floorNames[i] = nameInput.textContent;
    });

    // Activate button
    const activateBtn = document.createElement("button");
    activateBtn.textContent = "🎯";
    activateBtn.title = "Set Active";
    activateBtn.style.opacity = (i === currentFloor ? "1" : "0.5");
    activateBtn.addEventListener("click", () => {
      currentFloor = i;
      updateFloorLabel();
      drawGrid();
      updateLayerManager();
    });

    // Move Up button
    const upBtn = document.createElement("button");
    upBtn.textContent = "↑";
    upBtn.disabled = (i === 0);
    upBtn.addEventListener("click", () => {
      swapFloors(i, i - 1);
    });

    // Move Down button
    const downBtn = document.createElement("button");
    downBtn.textContent = "↓";
    downBtn.disabled = (i === floors.length - 1);
    downBtn.addEventListener("click", () => {
      swapFloors(i, i + 1);
    });

    // Assemble controls into a row
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "4px";
    wrap.append(toggle, nameInput, activateBtn, upBtn, downBtn);
    container.appendChild(wrap);
  });
}

function swapFloors(i, j) {
  [floors[i], floors[j]] = [floors[j], floors[i]];
  [floorVisibility[i], floorVisibility[j]] = [floorVisibility[j], floorVisibility[i]];
  [floorNames[i], floorNames[j]] = [floorNames[j], floorNames[i]];
  if (currentFloor === i) currentFloor = j;
  else if (currentFloor === j) currentFloor = i;
  drawGrid();
  updateLayerManager();
}

exportBtn.addEventListener("click", () => {
  const studentName = document.getElementById("studentName")?.value || "Student";
  const projectTitle = document.getElementById("projectTitle")?.value || "Project";

  const labelHeight = 60;
  const headerHeight = 60;
  const padding = 20;

  const visibleFloors = floors.map((_, i) => i); // include all floors
  const maxPerRow = 2; // 💡 Controls how many across
  const floorsPerRow = Math.min(maxPerRow, visibleFloors.length);
  const rows = Math.ceil(visibleFloors.length / floorsPerRow);

  const floorWidth = gridWidth * tileSize;
  const floorHeight = gridHeight * tileSize + labelHeight;

  const canvasWidth = floorsPerRow * (floorWidth + padding);
  const canvasHeight = headerHeight + rows * (floorHeight + padding);

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvasWidth;
  exportCanvas.height = canvasHeight;
  const exportCtx = exportCanvas.getContext("2d");

  // Background
  exportCtx.fillStyle = "#fff";
  exportCtx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Header
  exportCtx.fillStyle = "#000";
  exportCtx.font = "20px sans-serif";
  exportCtx.fillText(`Student: ${studentName}`, 10, 30);
  exportCtx.fillText(`Project: ${projectTitle}`, 10, 55);

  visibleFloors.forEach((i, idx) => {
    const grid = floors[i];
    const col = idx % floorsPerRow;
    const row = Math.floor(idx / floorsPerRow);
    const xOffset = col * (floorWidth + padding);
    const yOffset = headerHeight + row * (floorHeight + padding);

    // Floor background
    exportCtx.fillStyle = "#f7f7f7";
    exportCtx.fillRect(xOffset, yOffset, floorWidth, floorHeight);

    // Title
    const label = floorNames[i] || `Floor ${i + 1}`;
    exportCtx.fillStyle = "#000";
    exportCtx.font = "bold 16px sans-serif";
    exportCtx.fillText(label, xOffset + 10, yOffset + 20);

    // Count
    const count = {};
    grid.forEach(row => row.forEach(block => {
      if (block) count[block] = (count[block] || 0) + 1;
    }));

exportCtx.font = "12px sans-serif";
const maxLineWidth = floorWidth - 20; // Leave some padding
const statItems = Object.entries(count).map(([b, n]) => `${normalize(b)}: ${n}`);

let statLines = [];
let currentLine = "";

statItems.forEach(item => {
  const testLine = currentLine ? currentLine + " | " + item : item;
  const testWidth = exportCtx.measureText(testLine).width;
  if (testWidth > maxLineWidth) {
    statLines.push(currentLine);
    currentLine = item;
  } else {
    currentLine = testLine;
  }
});
if (currentLine) statLines.push(currentLine);

// Draw lines
statLines.forEach((line, i) => {
  exportCtx.fillText(line, xOffset + 10, yOffset + 40 + i * 14);
});



    // Blocks
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const block = grid[y][x];
        if (block && blockImages[block]) {
          exportCtx.drawImage(
            blockImages[block],
            xOffset + x * tileSize,
            yOffset + labelHeight + y * tileSize,
            tileSize,
            tileSize
          );
        }
      }
    }

    // Grid lines
    exportCtx.strokeStyle = "#000";
    exportCtx.lineWidth = 1;
    exportCtx.beginPath();
    for (let x = 0; x <= gridWidth; x++) {
      const px = xOffset + x * tileSize + 0.5;
      exportCtx.moveTo(px, yOffset + labelHeight);
      exportCtx.lineTo(px, yOffset + labelHeight + gridHeight * tileSize);
    }
    for (let y = 0; y <= gridHeight; y++) {
      const py = yOffset + labelHeight + y * tileSize + 0.5;
      exportCtx.moveTo(xOffset + 0.5, py);
      exportCtx.lineTo(xOffset + floorWidth - 0.5, py);
    }
    exportCtx.stroke();
  });

  try {
    const link = document.createElement("a");
    link.download = `${studentName}_${projectTitle}.png`.replaceAll(" ", "_");
    link.href = exportCanvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log("✅ Export complete");
  } catch (err) {
    console.error("❌ Export failed:", err);
  }
});


window.onload = () => {
  // Immediately create Floor 1 and mark it visible
  floors.push(createEmptyGrid(gridWidth, gridHeight));
  floorVisibility.push(true);
  floorNames.push("Floor 1");

  updateFloorLabel();
  setupCanvasForHiDPI(gridWidth * tileSize, gridHeight * tileSize);
  drawGrid();
  updateBlockCounts();
  updateLayerManager();
  renderPalette();
  // Select the first block icon by default
  const firstTile = document.querySelector(".block-tile");
  if (firstTile) firstTile.classList.add("selected");
  
};

document.getElementById("undoBtn").addEventListener("click", () => {
  if (undoStack.length === 0) return;

  redoStack.push(structuredClone({
    floors,
    floorNames,
    floorVisibility,
    currentFloor
  }));

  const prevState = undoStack.pop();
  floors = prevState.floors;
  floorNames = prevState.floorNames;
  floorVisibility = prevState.floorVisibility;
  currentFloor = prevState.currentFloor;

  updateFloorLabel();
  setupCanvasForHiDPI(gridWidth * tileSize, gridHeight * tileSize);
  drawGrid();
  updateBlockCounts();
  updateLayerManager();
});


document.getElementById("redoBtn").addEventListener("click", () => {
  if (redoStack.length === 0) return;

  undoStack.push(structuredClone({
    floors,
    floorNames,
    floorVisibility,
    currentFloor
  }));

  const nextState = redoStack.pop();
  floors = nextState.floors;
  floorNames = nextState.floorNames;
  floorVisibility = nextState.floorVisibility;
  currentFloor = nextState.currentFloor;

  updateFloorLabel();
  setupCanvasForHiDPI(gridWidth * tileSize, gridHeight * tileSize);
  drawGrid();
  updateBlockCounts();
  updateLayerManager();
});

