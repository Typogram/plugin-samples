// code.ts
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

// Check if a node is a stamp (assuming stamps are instances with a specific name or property)
function isStamp(node: SceneNode): boolean {
  // Modify this condition based on how you identify stamps in your Figma file
  // For example, if stamps have a specific name pattern:
  return node.name.includes("Thumbs up");
  // Or if they're instances of a specific component:
  // return node.type === 'INSTANCE' && node.name.includes('Stamp');
}

// Main function to find frames overlapping with stamps
function findFramesOverlappingWithStamps(
  parentNode: FrameNode | SectionNode
): OverlapResult[] {
  const results: OverlapResult[] = [];

  // Get all child frames
  const childFrames = parentNode.children.filter(
    (child) => child.type === "FRAME"
  ) as FrameNode[];

  // Get all stamps within the parent
  const stamps = parentNode.findAll((node) => isStamp(node));
  console.log(stamps);

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

    if (selection.length !== 1) {
      figma.ui.postMessage({
        type: "error",
        message: "Please select exactly one parent frame or section",
      });
      return;
    }

    const selectedNode = selection[0];
    if (selectedNode.type !== "FRAME" && selectedNode.type !== "SECTION") {
      figma.ui.postMessage({
        type: "error",
        message: "Selected item must be a frame or section",
      });
      return;
    }

    const overlappingFrames = findFramesOverlappingWithStamps(selectedNode);
    figma.ui.postMessage({
      type: "results",
      results: overlappingFrames,
    });
  }
};
