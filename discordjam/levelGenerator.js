window.discordJam = {};

var sections = {
    'startPointAbove': [
        [1, 1, 1],
        [1, 2, 1],
        [1, 0, 1]
    ],
    'startPointBelow': [
        [1, 0, 1],
        [1, 2, 1],
        [1, 1, 1]
    ],
    'startPointLeft': [
        [1, 1, 1],
        [1, 2, 0],
        [1, 1, 1]
    ],
    'startPointRight': [
        [1, 1, 1],
        [0, 2, 1],
        [1, 1, 1]
    ],
    'endPointAbove': [
        [1, 1, 1],
        [1, 4, 1],
        [1, 0, 1]
    ],
    'endPointBelow': [
        [1, 0, 1],
        [1, 4, 1],
        [1, 1, 1]
    ],
    'endPointLeft': [
        [1, 1, 1],
        [1, 4, 0],
        [1, 1, 1]
    ],
    'endPointRight': [
        [1, 1, 1],
        [0, 4, 1],
        [1, 1, 1]
    ],
    'solid': [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
    ],
    'outside': [
        [3, 3, 3],
        [3, 3, 3],
        [3, 3, 3]
    ],
    'horizontal': [
        [1, 1, 1],
        [0, 0, 0],
        [1, 1, 1]
    ],
    'vertical': [
        [1, 0, 1],
        [1, 0, 1],
        [1, 0, 1]
    ],
    'L1': [
        [1, 0, 1],
        [0, 0, 5],
        [1, 5, 1]
    ],
    'L2': [
        [1, 5, 1],
        [0, 0, 5],
        [1, 0, 1]
    ],
    'L3': [
        [1, 5, 1],
        [5, 0, 0],
        [1, 0, 1]
    ],
    'L4': [
        [1, 0, 1],
        [5, 0, 0],
        [1, 5, 1]
    ],
}

// Map size = (map dimension * cell size) ** 2
const CELL_SIZE = 3;
const MAP_DIMENSIONS = 5;

function generateLayout() {
    let layout = initializeEmptyLayout(MAP_DIMENSIONS);
    [startPoint, endPoint] = pickStartAndEndPoints(layout);
    let currentPoint = startPoint;
    let counter = 0;
    while (currentPoint.toString() != endPoint.toString()) {
        layout[currentPoint[0]][currentPoint[1]] = counter;
        currentPoint = getNextStep(currentPoint, endPoint);
        counter++;
    }
    layout[currentPoint[0]][currentPoint[1]] = counter;
    return layout;
}

function initializeEmptyLayout(dimensions) {
    let emptyLayout = new Array(dimensions);
    for (let i = 0; i < dimensions; i++) {
        emptyLayout[i] = new Array(dimensions);
        for (let j = 0; j < dimensions; j++) {
            emptyLayout[i][j] = -1;
        }
    }
    return emptyLayout;
}

function pickStartAndEndPoints(layout) {
    let corners = [
        [0, 0],
        [0, layout[0].length - 1],
        [layout.length - 1, layout[0].length - 1],
        [layout.length - 1, 0]
    ];
    let startIndex = Math.floor(Math.random() * 4);
    let startPoint = corners[startIndex];
    // Get opposite corner
    let endIndex = (startIndex + 2) % 4;
    let endPoint = corners[endIndex];
    return [startPoint, endPoint];
}

function getNextStep(currentPoint, endPoint) {
    let distanceToGo = [endPoint[0] - currentPoint[0], endPoint[1] - currentPoint[1]];
    if (distanceToGo.toString() === [0, 0].toString()) {
        console.error('levelGenerator:getNextStep: Already at endpoint.');
        return currentPoint;
    }
    let step;
    if (distanceToGo[0] === 0) {
        // Must move horizontally
        step = getHorizontalStep(distanceToGo);
    } else if (distanceToGo[1] === 0) {
        // Must move vertically
        step = getVerticalStep(distanceToGo);
    // Randomly select horizontal or vertical
    } else if (Math.floor(Math.random() * 2) === 1) {
        step = getHorizontalStep(distanceToGo);
    } else {
        step = getVerticalStep(distanceToGo);
    }
    return [currentPoint[0] + step[0], currentPoint[1] + step[1]];
}

function getHorizontalStep(distanceToGo) {
    return [0, distanceToGo[1] / Math.abs(distanceToGo[1])];
}

function getVerticalStep(distanceToGo) {
    return [distanceToGo[0] / Math.abs(distanceToGo[0]), 0];
}

function generateMap() {
    let layout = generateLayout();
    let startPoint = findCoordsOfValue(layout, 0);
    if (startPoint === -1) {
        console.error('levelGenerator:generateMap:failed to find startPoint');
    }
    layout = insertSections(layout, startPoint);
    layout = concatInsertedSections(layout);
    layout = wrapHolesInWalls(layout);
    return layout;
}

function insertSections(layout, startPoint) {
    let goalValue = findMaxInArray(layout);
    let lastPoint = startPoint;
    let currentPoint = startPoint;
    let nextPoint;
    while (getValueAtCoords(layout, currentPoint) < goalValue) {
        nextPoint = getNextPoint(currentPoint, layout);
        layout[currentPoint[0]][currentPoint[1]] = getSection(lastPoint, currentPoint, nextPoint);
        // Advance to next number
        lastPoint = currentPoint;
        currentPoint = nextPoint;
    }
    // Insert last section
    layout[currentPoint[0]][currentPoint[1]] = getSection(lastPoint, currentPoint, nextPoint);
    layout = insertSolidSections(layout);
    return layout;
}

// TODO: rename
function insertSolidSections(layout) {
    for (let i = 0; i < layout.length; i++) {
        for (let j = 0; j < layout.length; j++) {
            if (layout[i][j] === -1) {
                layout[i][j] = sections.outside;
            }
        }
    }
    return layout;
}

function getSection(lastPoint, currentPoint, nextPoint) {
    if (lastPoint === currentPoint) {
        // Starting point
        if (isToTheLeftOf(currentPoint, nextPoint)) {
            return sections.startPointLeft;
        }
        if (isToTheLeftOf(nextPoint, currentPoint)) {
            return sections.startPointRight;
        }
        if (isAbove(currentPoint, nextPoint)) {
            return sections.startPointAbove;
        }
        if (isAbove(nextPoint, currentPoint)) {
            return sections.startPointBelow;
        }
    }
    if (nextPoint === currentPoint) {
        // Ending point
        if (isToTheLeftOf(currentPoint, lastPoint)) {
            return sections.endPointLeft;
        }
        if (isToTheLeftOf(lastPoint, currentPoint)) {
            return sections.endPointRight;
        }
        if (isAbove(currentPoint, lastPoint)) {
            return sections.endPointAbove;
        }
        if (isAbove(lastPoint, currentPoint)) {
            return sections.endPointBelow;
        }
    }
    if (lastPoint[0] === currentPoint[0] && currentPoint[0] === nextPoint[0]) {
        // Straight horizontal piece
        return sections.horizontal;
    }
    if (lastPoint[1] === currentPoint[1] && currentPoint[1] === nextPoint[1]) {
        // Straight vertical piece
        return sections.vertical;
    }
    if ((isToTheLeftOf(lastPoint, currentPoint) && isAbove(nextPoint, currentPoint))
            || (isToTheLeftOf(nextPoint, currentPoint) && isAbove(lastPoint, currentPoint))
            ) {
        //       NEXT      OR       LAST
        // LAST CURRENT       NEXT CURRENT
        return sections.L1;
    }
    if ((isToTheLeftOf(lastPoint, currentPoint) && isAbove(currentPoint, nextPoint))
            || (isToTheLeftOf(nextPoint, currentPoint) && isAbove(currentPoint, lastPoint))
            ) {
        // LAST CURRENT       NEXT CURRENT
        //       NEXT      OR       LAST
        return sections.L2;
    }
    if ((isToTheLeftOf(currentPoint, lastPoint) && isAbove(currentPoint, nextPoint))
            || (isToTheLeftOf(currentPoint, nextPoint) && isAbove(currentPoint, lastPoint))
            ) {
        // CURRENT LAST      CURRENT NEXT
        // NEXT          OR   LAST
        return sections.L3;
    }
    if ((isToTheLeftOf(currentPoint, lastPoint) && isAbove(nextPoint, currentPoint))
            || (isToTheLeftOf(currentPoint, nextPoint) && isAbove(lastPoint, currentPoint))
            ) {
        // NEXT          OR   LAST
        // CURRENT LAST      CURRENT NEXT
        return sections.L4;
    }
}

function isToTheLeftOf(first, second) {
    // true iff first is immediately to the left of second
    return (first[0] === second[0] && first[1] === (second[1] - 1))
}

function isAbove(first, second){
    // true iff first is immediately above the second
    return (first[1] === second[1] && first[0] === (second[0] - 1))
}

function findCoordsOfValue(array, value) {
    for (let i = 0; i < array.length; i++) {
        for (let j = 0; j < array[0].length; j++) {
            if (array[i][j] === value) {
                // Found target value
                return [i, j];
            }
        }
    }
    return -1;
}

function findMaxInArray(array) {
    let maxVal = -1;
    for (let i = 0; i < array.length; i++) {
        for (let j = 0; j < array[0].length; j++) {
            if (array[i][j] > maxVal) {
                maxVal = array[i][j];
            }
        }
    }
    return maxVal;
}

function getValueAtCoords(array, coords) {
    return array[coords[0]][coords[1]];
}

function getNextPoint(currentPoint, layout) {
    let movementOptions = [
        [-1, 0], // up
        [1, 0], // down
        [0, -1], // left
        [0, 1], // right
    ]
    let nextPoint;
    let targetValue = getValueAtCoords(layout, currentPoint) + 1;
    for (option of movementOptions) {
        // Potential next point = currentPoint + movementOption
        nextPoint = [currentPoint[0] + option[0], currentPoint[1] + option[1]];
        // If this is out of bounds of the array, move to the next option
        if (isInBounds(layout, nextPoint)) {
            // Check if it's the next number
            if (getValueAtCoords(layout, nextPoint) === targetValue) {
                // If so, return currentPoint + movement
                return nextPoint;
            }

        }
    }
    console.error('levelGenerator: getNextPoint: failed to find next point');
    return -1; 
}

function isInBounds(array, point) {
    return (point[0] >= 0 && point[0] < array.length) && (point[1] >= 0 && point[1] < array[0].length);
}

function concatInsertedSections(layout) {
    let accumulator = []
    for (let i = 0; i < layout.length; i++) {
        for (let k = 0; k < CELL_SIZE; k++) {
            accumulator.push(getRowFromSections(layout[i], k));
        }
    }
    return accumulator;
}

function getRowFromSections(rowOfSections, rowIndex) {
    let accumulator = [];
    for (let i = 0; i < rowOfSections.length; i++) {
        accumulator = accumulator.concat(rowOfSections[i][rowIndex]);
    }
    return accumulator;
}

function wrapHolesInWalls(layout) {
    // Add row of empty around entire map
    let newRowLength = layout[0].length + 2;
    layout.unshift(new Array(newRowLength));
    layout.push(new Array(newRowLength));
    for (let j = 0; j < newRowLength; j++) {
        layout[0][j] = 3;
        layout[layout.length - 1][j] = 3;
    }
    for (let i = 1; i < layout.length - 1; i++) {
        layout[i].unshift(3);
        layout[i].push(3);
    }
    // Everywhere there's a vacuum, block behind it
    for (let i = 0; i < layout.length; i++) {
        for (let j = 0; j < newRowLength; j++) {
            if (layout[i][j] === 5) {
                layout = wrapHole(i, j, layout);
            }
        }
    }
    console.log(layout);
    return layout;
}

function wrapHole(i, j, layout) {
    let wrapLocations;
    if (layout[i-1][j] === 0) {
        // wrap below
        wrapLocations = [
            [i+1, j],
            [i+1, j-1],
            [i+1, j+1]
        ];
    } else if (layout[i+1][j] === 0) {
        // wrap above
        wrapLocations = [
            [i-1, j],
            [i-1, j-1],
            [i-1, j+1]
        ];
    } else if (layout[i][j+1] === 0) {
        // wrap to the left
        wrapLocations = [
            [i-1, j-1],
            [i, j-1],
            [i+1, j-1]
        ];
    } else if (layout[i][j-1] === 0) {
        // wrap to the right
        wrapLocations = [
            [i-1, j+1],
            [i, j+1],
            [i+1, j+1]
        ];
    }
    for (wrapLocation of wrapLocations) {
        layout[wrapLocation[0]][wrapLocation[1]] = 1;
    }
    return layout;
}

window.discordJam.levelGenerator = () => {
    return generateMap();
}