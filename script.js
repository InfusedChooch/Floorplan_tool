// script.js – Minecraft Floorplan Creator Logic (Enhanced Export Labels)

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
const prevFloorBtn = document.getElementById("prevFloor");
const nextFloorBtn = document.getElementById("nextFloor");

let tileSize = 32;
let currentBlock = "stone";
let blockImages = {};
let isMouseDown = false;
let isRightClick = false;

let floors = [];
let currentFloor = 0;
let gridWidth = parseInt(widthInput.value);
let gridHeight = parseInt(heightInput.value);

const blockList = [
  "acacia_log", "acacia_planks", "basal", "beacon", "birch_log", "birch_plank",
  "block_of_diamond", "block_of_emerald", "block_of_gold", "block_of_iron", "bookshelf", "bricks",
  "chest", "cobblestone", "crafting_table", "enchanting_table", "farmland", "glass", "glowstone",
  "ice", "jukebox", "moss_block", "mossy_cobblestone", "mud_bricks", "mycelium", "oak_log",
  "oak_planks", "off_furnace", "podzol", "red_sand", "sand", "sandstone", "spruce_log",
  "spruce_planks", "stone", "white_glazed_terracotta", "wool"
];

function normalize(name) {
  return name.replaceAll("_", " ").replace(/\b\w/g, l => l.toUpperCase());
}

blockList.forEach(name => {
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

function createEmptyGrid(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(""));
}

function initGrid(w, h) {
  gridWidth = w;
  gridHeight = h;
  canvas.width = w * tileSize;
  canvas.height = h * tileSize;

  if (!floors[currentFloor]) {
    floors[currentFloor] = createEmptyGrid(w, h);
  }
  drawGrid();
  updateBlockCounts();
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const grid = floors[currentFloor];
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const block = grid[y][x];
      if (block && blockImages[block]) {
        ctx.drawImage(blockImages[block], x * tileSize, y * tileSize, tileSize, tileSize);
      }
      ctx.strokeStyle = "#000";
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
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
    hoverCoords.textContent = `${x}, ${y}`;
    if (isMouseDown) {
      placeBlock(e, isRightClick);
    }
  }
});

canvas.addEventListener("mousedown", (e) => {
  isMouseDown = true;
  isRightClick = e.button === 2;
  placeBlock(e, isRightClick);
});
canvas.addEventListener("mouseup", () => isMouseDown = false);
canvas.addEventListener("mouseleave", () => isMouseDown = false);
canvas.addEventListener("contextmenu", e => e.preventDefault());

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

resetGridBtn.addEventListener("click", () => {
  floors[currentFloor] = createEmptyGrid(gridWidth, gridHeight).map(row => row.map(() => currentBlock));
  drawGrid();
  updateBlockCounts();
});

clearGridBtn.addEventListener("click", () => {
  floors[currentFloor] = createEmptyGrid(gridWidth, gridHeight);
  drawGrid();
  updateBlockCounts();
});

function updateFloorLabel() {
  floorNumber.textContent = currentFloor + 1;
}

addFloorBtn.addEventListener("click", () => {
  currentFloor = floors.length;
  floors[currentFloor] = createEmptyGrid(gridWidth, gridHeight);
  updateFloorLabel();
  initGrid(gridWidth, gridHeight);
});

prevFloorBtn.addEventListener("click", () => {
  if (currentFloor > 0) {
    currentFloor--;
    updateFloorLabel();
    initGrid(gridWidth, gridHeight);
  }
});

nextFloorBtn.addEventListener("click", () => {
  if (currentFloor < floors.length - 1) {
    currentFloor++;
    updateFloorLabel();
    initGrid(gridWidth, gridHeight);
  }
});

function updateBlockCounts() {
  const count = {};
  const grid = floors[currentFloor];
  for (let row of grid) {
    for (let block of row) {
      if (!block) continue;
      count[block] = (count[block] || 0) + 1;
    }
  }
  blockCountsDiv.innerHTML = Object.entries(count)
    .map(([b, n]) => `${normalize(b)}: ${n}`)
    .join("<br>");
}

exportBtn.addEventListener("click", () => {
  const studentName = document.getElementById("studentName")?.value || "Student";
  const projectTitle = document.getElementById("projectTitle")?.value || "Project";

  const labelHeight = 60;
  const headerHeight = 70;
  const paddingBetweenFloors = 20;
  const canvasWidth = gridWidth * tileSize;
  const canvasHeight = headerHeight + floors.length * (gridHeight * tileSize + labelHeight + paddingBetweenFloors);

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvasWidth;
  exportCanvas.height = canvasHeight;
  const exportCtx = exportCanvas.getContext("2d");

  // White background
  exportCtx.fillStyle = "#ffffff";
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  // Header block
  exportCtx.fillStyle = "#000000";
  exportCtx.font = "20px sans-serif";
  exportCtx.fillText(`Student: ${studentName}`, 10, 30);
  exportCtx.fillText(`Project: ${projectTitle}`, 10, 55);

  floors.forEach((grid, i) => {
    const baseY = headerHeight + i * (gridHeight * tileSize + labelHeight + paddingBetweenFloors);

    // Count blocks
    const count = {};
    grid.forEach(row => row.forEach(block => {
      if (block) count[block] = (count[block] || 0) + 1;
    }));

    const label = `Floor ${i + 1}`;
    const stats = Object.entries(count)
      .map(([b, n]) => `${normalize(b)}: ${n}`)
      .join(" | ");

    // Background box per floor
    exportCtx.fillStyle = "#f7f7f7";
    exportCtx.fillRect(0, baseY - 10, canvasWidth, labelHeight + gridHeight * tileSize + 10);

    // Floor label and stats
    exportCtx.fillStyle = "#000";
    exportCtx.font = "bold 16px sans-serif";
    exportCtx.fillText(label, 10, baseY + 18);
    exportCtx.font = "14px sans-serif";
    exportCtx.fillText(stats, 10, baseY + 40);

    // Grid content
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const block = grid[y][x];
        if (block && blockImages[block]) {
          exportCtx.drawImage(
            blockImages[block],
            x * tileSize,
            baseY + labelHeight + y * tileSize,
            tileSize,
            tileSize
          );
        }
        exportCtx.strokeStyle = "#ccc";
        exportCtx.strokeRect(
          x * tileSize,
          baseY + labelHeight + y * tileSize,
          tileSize,
          tileSize
        );
      }
    }

    // Border
    exportCtx.strokeStyle = "#bbb";
    exportCtx.strokeRect(0, baseY - 10, canvasWidth, labelHeight + gridHeight * tileSize + 10);
  });

  // Download
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
  setTimeout(() => {
    floors.push(createEmptyGrid(gridWidth, gridHeight));
    updateFloorLabel();
    initGrid(gridWidth, gridHeight);
    const firstTile = document.querySelector(".block-tile");
    if (firstTile) firstTile.classList.add("selected");
  }, 100);
};
