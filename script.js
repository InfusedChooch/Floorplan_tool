// script.js – Minecraft Floorplan Creator Logic (Multi-Floor Edition + Normalized Block Names)

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
const floorNumber = document.getElementById("floorNumber");
const addFloorBtn = document.getElementById("addFloor");
const prevFloorBtn = document.getElementById("prevFloor");
const nextFloorBtn = document.getElementById("nextFloor");

let tileSize = 32;
let currentBlock = "stone";
let blockImages = {};
let isMouseDown = false;
let isRightClick = false;

let floors = []; // Multi-floor grid storage
let currentFloor = 0;
let gridWidth = parseInt(widthInput.value);
let gridHeight = parseInt(heightInput.value);

// ─── Load Block Images ──────────────────────────────
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

// ─── Grid Logic ─────────────────────────────────────
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

// ─── Drawing Events ────────────────────────────────
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

// ─── UI Controls ───────────────────────────────────
updateGridBtn.addEventListener("click", () => {
  const newW = parseInt(widthInput.value);
  const newH = parseInt(heightInput.value);
  if (newW % 2 === 0 && newH % 2 === 0) {
    // Resize the current grid properly
const newGrid = createEmptyGrid(newW, newH);
for (let y = 0; y < Math.min(gridHeight, newH); y++) {
  for (let x = 0; x < Math.min(gridWidth, newW); x++) {
    newGrid[y][x] = floors[currentFloor][y][x];
  }
}
floors[currentFloor] = newGrid;
initGrid(newW, newH);
  } else {
    alert("Width and height must be even numbers.");
  }
});

resetGridBtn.addEventListener("click", () => {
  floors[currentFloor] = createEmptyGrid(gridWidth, gridHeight).map(row => row.map(() => currentBlock));
  drawGrid();
  updateBlockCounts();
});

const clearGridBtn = document.getElementById("clearGrid");
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

// ─── Init ───────────────────────────────────────────
window.onload = () => {
  setTimeout(() => {
    floors.push(createEmptyGrid(gridWidth, gridHeight));
    updateFloorLabel();
    initGrid(gridWidth, gridHeight);
    const firstTile = document.querySelector(".block-tile");
    if (firstTile) firstTile.classList.add("selected");
  }, 100);
};

exportBtn.addEventListener("click", () => {
  const studentName = document.getElementById("studentName")?.value || "Student";
  const projectTitle = document.getElementById("projectTitle")?.value || "Project";

  const labelHeight = 45;
  const canvasWidth = gridWidth * tileSize;
  const canvasHeight = floors.length * (gridHeight * tileSize + labelHeight);

  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");
  exportCanvas.width = canvasWidth;
  exportCanvas.height = canvasHeight;

  floors.forEach((grid, i) => {
    const yOffset = i * (gridHeight * tileSize + labelHeight);

    // Calculate block count for this floor
    const count = {};
    grid.forEach(row => {
      row.forEach(block => {
        if (block) count[block] = (count[block] || 0) + 1;
      });
    });

    // Format block counts
    const label = `Floor ${i + 1}`;
    const stats = Object.entries(count)
      .map(([b, n]) => `${b.replaceAll("_", " ").replace(/\b\w/g, l => l.toUpperCase())}: ${n}`)
      .join(" | ");

    // Draw label and stats
    exportCtx.fillStyle = "#000";
    exportCtx.font = "16px sans-serif";
    exportCtx.fillText(label, 10, yOffset + 18);
    exportCtx.font = "14px sans-serif";
    exportCtx.fillText(stats, 10, yOffset + 38);

    // Draw grid tiles
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const block = grid[y][x];
        if (block && blockImages[block]) {
          exportCtx.drawImage(
            blockImages[block],
            x * tileSize,
            yOffset + labelHeight + y * tileSize,
            tileSize,
            tileSize
          );
        }
        exportCtx.strokeStyle = "#ccc";
        exportCtx.strokeRect(
          x * tileSize,
          yOffset + labelHeight + y * tileSize,
          tileSize,
          tileSize
        );
      }
    }
  });

  const link = document.createElement("a");
  link.download = `${studentName}_${projectTitle}.png`.replaceAll(" ", "_");
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
});


  // Trigger download
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

