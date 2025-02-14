interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OverlapResult {
  artboardName: string;
  overlappingWith: string[];
}

figma.showUI(__html__, { width: 300, height: 400 });

// Check if two rectangles overlap
function checkOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
  return !(
    rect1.x >= rect2.x + rect2.width ||
    rect1.x + rect1.width <= rect2.x ||
    rect1.y >= rect2.y + rect2.height ||
    rect1.y + rect1.height <= rect2.y
  );
}

// Get rectangle bounds from a node
function getNodeBounds(node: SceneNode): Rectangle {
  return {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };
}

// Check if a node is a stamp with specific name
function isStamp(node: SceneNode, stampName: string): boolean {
  return node.name.toLowerCase() === stampName.toLowerCase();
}

// Find all matching layers and bring them to front
function bringMatchingLayersToFront(stampName: string) {
  // Get all nodes in the current page
  const allNodes = figma.currentPage.findAll();

  // Filter nodes that match the stamp name
  const matchingNodes = allNodes.filter((node) => isStamp(node, stampName));

  const logs = [];
  // Process each matching node
  for (const node of matchingNodes) {
    // Check if node has a parent that is a FRAME
    if (node.parent && node.parent.type === "FRAME") {
      logs.push(`Layer "${node.name}" has parent frame: "${node.parent.name}"`);
      continue; // Skip nodes with frame parents
    }

    // Bring the node to front by making it the last child of its parent
    if (node.parent) {
      node.parent.appendChild(node);
    }
  }

  // Send feedback to UI
  figma.ui.postMessage({
    type: "results",
    results: [
      {
        artboardName: `Processed ${matchingNodes.length} layers. ${logs.join(
          ", "
        )}`,
        overlappingWith: [],
      },
    ],
  });
}

// Main function to find frames overlapping with stamps
function findFramesOverlappingWithStamps(
  parentNode: FrameNode | SectionNode,
  stampName: string
): OverlapResult[] {
  const results: OverlapResult[] = [];

  // Get all child frames
  const childFrames = parentNode.children.filter(
    (child) => child.type === "FRAME"
  ) as FrameNode[];

  // Get all stamps within the parent
  const stamps = parentNode.findAll((node) => isStamp(node, stampName));

  // Check each frame against all stamps
  for (const frame of childFrames) {
    const overlappingStamps: string[] = [];
    const frameBounds = getNodeBounds(frame);

    for (const stamp of stamps) {
      const stampBounds = getNodeBounds(stamp);
      if (checkOverlap(frameBounds, stampBounds)) {
        overlappingStamps.push(stamp.name);
      }
    }

    if (overlappingStamps.length > 0) {
      results.push({
        artboardName: frame.name,
        overlappingWith: overlappingStamps,
      });
    }
  }

  return results;
}

// Handle messages from UI
figma.ui.onmessage = (msg) => {
  if (msg.type === "check-overlaps") {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.ui.postMessage({
        type: "error",
        message: "Please select at least one frame or section",
      });
      return;
    }

    // Filter out invalid selections
    const validNodes = selection.filter(
      (node) => node.type === "FRAME" || node.type === "SECTION"
    );

    if (validNodes.length === 0) {
      figma.ui.postMessage({
        type: "error",
        message: "Selected items must be frames or sections",
      });
      return;
    }

    const stampName = msg.stampName;
    if (!stampName) {
      figma.ui.postMessage({
        type: "error",
        message: "Please enter a stamp name",
      });
      return;
    }

    // Process each node individually and combine results at the end
    let allResults = [];
    for (const node of validNodes) {
      const results = findFramesOverlappingWithStamps(node, stampName);
      allResults = allResults.concat(results);
    }

    // Send combined results in one message
    figma.ui.postMessage({
      type: "results",
      results: allResults,
    });
  } else if (msg.type === "bring-to-front") {
    const stampName = msg.stampName;
    if (!stampName) {
      figma.ui.postMessage({
        type: "error",
        message: "Please enter a stamp name",
      });
      return;
    }
    bringMatchingLayersToFront(stampName);
  }
};
